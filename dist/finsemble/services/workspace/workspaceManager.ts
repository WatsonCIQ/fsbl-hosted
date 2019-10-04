import StorageClient from "../../clients/storageClient";
import { Workspace, ActiveWorkspace, WorkspaceImport, GroupData } from '../../common/workspace';
import { composeRL, getRandomWindowName, guuid, removeKeys } from "../../common/disentangledUtils";
import { camelCase } from "../../common/util";
import { WORKSPACE } from "../../common/constants";
import * as Fuse from "fuse.js";
import { isEqual as deepEqual, difference } from "lodash";
import { WindowStorageManager, CompleteWindowState, StateType } from "../../common/windowStorageManager";
import { FinsembleWindowData } from "../../common/FinsembleWindowData";
import ConfigClient from "../../clients/configClient";
import { get } from 'lodash';
import * as merge from 'deepmerge';
import { Logger } from "../../clients/logger";

const IGNORE_PROPS = ["show", "callstack", "x", "y", "blurred",
	"window-bounds", "title", "windowIdentifier", "bounds",
	"cachedLeft", "cachedTop", "cachedWidth", "cachedHeight",
	"monitorDimensions", "taskbarIconGroup", "uuid", "top",
	"left", "height", "width", "bottom", "right", "key",
	"execJSWhitelist", "permissions", "customData",
	"stackedWindowIdentifier", "showTaskbarIcon", "skipTaskbar",
	"focused", "autoShow",
];

const { STORAGE_TOPIC, CACHE_STORAGE_TOPIC,
	ACTIVE_WORKSPACE, ALL_WORKSPACES,
} = WORKSPACE;

/**
 * A trace object passed through the call chain
 * to better debug events as they proceed through
 * the layers of the service.
 *
 * See notes in WorkspaceService as to why this is necessary.
 *
 * NOTE: DO NOT JUST MAKE UP A TRACE. The WorkspaceService
 *
 * This should probably be moved to ./src/common at some point.
 */
type Trace = {
	/** A unique counter incremented on each API request. */
	counter: number,
	/** The reason for the API (typically the name API channel). */
	reason: string
};

/**
 * Convenience function, given a trace and other arguments,
 * auto-formats a log message appropriately.
 */
function log({ counter, reason }: Trace, ...args) {
	Logger.debug(`TRACE-${counter}-${reason}`, ...args);
}

/**
 * Given either a workspace name or a workspace object,
 * returns the storage key for that workspace.
 * @param worksapce A workspace object or the name of a workspace.
 */
export const getWorkspaceStorageKey = (worksapce: Workspace | string): string => {
	return typeof worksapce === "string" ? camelCase(worksapce) : camelCase(worksapce.name);
};

/**
 * Given a requested workspace name and the list of existing workspace
 * names, returns the name with "(n)" appended to it, where n is the
 * number of prior names with the same pattern.
 *
 * NOTE - this function assumes the requested name already exists in the
 * list of workspace names.
 *
 * See tests for more examples.
 *
 * @example
 * getNextWorkspaceName("foo", ["foo"]) // => "foo (1)"
 * getNextWorkspaceName("bar", ["bar", "bar (1)"]) // => "bar (2)"
 */
export function getNextWorkspaceName(name: string, workspaceNames: string[]): string {
	const endsInDigit = /\(\d+\)$/;
	const nameMinusDigit = name.replace(endsInDigit, "").trim();
	const digits = [...workspaceNames, name]
		.filter(x => x.includes(nameMinusDigit))
		.map(n => {
			const digit = n.match(endsInDigit);
			return digit === null ? 0
				// Slice off the parens
				: Number(digit[0].slice(1, -1));
		});
	const nextDigitInSeries = Math.max(...digits) + 1;
	return `${nameMinusDigit} (${nextDigitInSeries})`;
}

export const NOT_INITIALIZED = "You must wait for the Workspace Manager to initialize before taking this action.";
export const REMOVE_ACTIVE_WORKSPACE = "You cannot remove the active workspace";
export const SET_ORDER_ERROR = (oldOrder) => `A new workspace order must include an entry for every workspace. Old order: ${oldOrder}`;
export const WORKSPACE_NOT_FOUND = ws => `Workspace "${ws}" not found in storage.`;
export const NOT_VALID_WIN_NAME = win => `"${win}" is not a valid window name`;

export const NO_ACTIVE_WORKSPACE = "Attempt to interact with the active workspace before an active workspace was set.";
/**
 * Static class for interacting with workspace storage.
 *
 * WorkspaceManager is an ORM-like interface into the storage
 * service as it pertains to workspaces. It enforces consistency
 * and our business logic around workspaces; as such, all
 * interactions with storage pertaining to workspace should
 * be run through this class.
 *
 * WorkspaceManager provides three kinds of functions:
 * a) functions for dealing with individual workspaces (such as adding windows,
 * setting the group data, etc.)
 * b) functions for working on the set of workspaces (adding workspaces,
 * removing, renaming, etc.)
 * c) functions for dealing with a special workspace called the active workspace,
 * which gets its own location and storage, and has a special isDirty property
 * that is handled by the WorkspaceManager.
 *
 * All three of these are similar and coupled enough to warrant handling in
 * the same class; but the WorkspaceManager should never grow beyond this scope.
 *
 * DH 3/11/2019
 * Because the class is static, it could technically be safely
 * imported and used from anywhere; however, at present, only
 * the workspace service uses the manager, and it will likely
 * stay this way until Workspaces are stored in a reactive store
 * like the upcoming Persistent Store.
 *
 * A Note on Performance:
 * WorkspaceManager doesn't cache anything, which necessitates many
 * round trips to the StorageService despite no changes in data. In
 * my own testing, I haven't seen this to be an issue; however, if
 * client's storage implementation is very slow, it could feasably
 * create some drag (though I doubt it would  be the bottleneck). At
 * the cost of added complexity, a caching mechanism could be added
 * overtop the functions without changing their API. However, I think
 * a reactive store like the Persistent store is a better answer to
 * this problem - it's simpler (no extra caching logic specific to
 * workspaces), more flexible (provides new ways for clients to
 * interact with the data), and more performant (entirely push based,
 * instead of pull).
 */
export class WorkspaceManager {
	/**
	 * If true, the active workspace is saved to
	 * the store on every update.
	 */
	static autosave = false;

	/**
	 * Daniel H. - 2/26/2019
	 * There is some bizarre effect whereby the fake store
	 * doesn't get reset correctly unless you manually set the
	 * reference before each test. For this reason alone, I had
	 * to make StorageClient and WindowStorageManager public
	 * members; I would much rather just reference them directly
	 * since they're singletons.
	 *
	 * Note, the WindowStorageManger suffers this same problem
	 * under test.
	 */
	static _SC = StorageClient;
	static _WS = WindowStorageManager;
	private static fsblUuid: string;

	/**
	 * Given window data, gets a new name for a window.
	 *
	 * Windows coming from workspace configuration may not have a name; we
	 * must therefore add one with the same naming scheme used by Launcher.
	 */
	private static async getNewWindowName(win: FinsembleWindowData): Promise<string> {
		if (!WorkspaceManager.fsblUuid) {
			WorkspaceManager.fsblUuid = (await ConfigClient.getValues(null)).data.startup_app.uuid;
		}
		return getRandomWindowName(win.componentType, WorkspaceManager.fsblUuid);
	}

	/**
	 * Adds a workspace to the system, persisting it to storage. If the requested
	 * name is already in use, a new one will generated.
	 *
	 * Returns the final name of the workspace in storage as a string.
	 */
	static async addWorkspace(trace: Trace, ws: Workspace, force = false): Promise<string> {
		log(trace, "Adding workspace", ws, "force:", force);
		const workspaceNames = await WorkspaceManager.getWorkspaceNames(trace);
		const nameAlreadyExists = workspaceNames.includes(ws.name);

		if (nameAlreadyExists && force) {
			await WorkspaceManager.removeWorkspace(trace, ws.name);
		}

		const name = nameAlreadyExists && !force
			? getNextWorkspaceName(ws.name, workspaceNames)
			: ws.name;

		await WorkspaceManager._SC.updateStorage1({
			topic: STORAGE_TOPIC,
			key: ALL_WORKSPACES,
			updateFn: (workspaces) =>
				workspaces ? [...workspaces, name]
					// If the set is empty, make a new one
					: [name],
		});

		const finalWs = {
			...ws,
			// Use the new name
			name,
		};

		await WorkspaceManager._SC.save1({
			topic: STORAGE_TOPIC,
			key: getWorkspaceStorageKey(finalWs),
			value: finalWs,
		});

		log(trace, "Workspace added");
		return name;
	}

	/**
	 * NOTE! This bypasses the set-dirty logic. For most operations, just use
	 * the public updateWorkspace method (you can even omit the workspace name
	 * to automatically target the active workspace).
	 */
	private static async updateActiveWorkspace(trace: Trace, updateFn: (ws: ActiveWorkspace) => ActiveWorkspace): Promise<void> {
		log(trace, "Updating active workspace.")
		await WorkspaceManager._SC.updateStorage1({
			topic: CACHE_STORAGE_TOPIC,
			key: ACTIVE_WORKSPACE,
			updateFn,
		})
		log(trace, "Active workspace updated");
	}

	static async setActiveWorkspaceDirty(trace: Trace): Promise<void> {
		log(trace, "Setting active workspace dirty");
		await WorkspaceManager.updateActiveWorkspace(trace, ws => ({ ...ws, isDirty: true }))
		log(trace, "Active workspace set dirty");
	}

	static async setActiveWorkspaceClean(trace: Trace): Promise<void> {
		log(trace, "Setting active workspace clean");
		await WorkspaceManager.updateActiveWorkspace(trace, ws => ({ ...ws, isDirty: false }))
		log(trace, "Active workspace set clean");
	}

	/**
	 * Converts window data from the previous versions of Finsemble
	 * to the current version. Should only be used by importWorkspace.
	 *
	 * @param windowData An object that will be formatted to a `FinsembleWindowDatas` object
	 * NOTE! This this object should be compatible!
	 */
	private static async formatWindow(windowData: any): Promise<FinsembleWindowData> {
		const correctedData = {
			...windowData
		} as FinsembleWindowData;
		const formatOptions = function (options: any): any {
			const propertyConversionMap = new Map([
				['defaultTop', 'top'],
				['defaultBottom', 'bottom'],
				['defaultLeft', 'left'],
				['defaultRight', 'right'],
				['defaultWidth', 'width'],
				['defaultHeight', 'height'],
			]);
			const updatePropertyOnNewOptions = function (oldKey, currentKey) {
				correctedData[currentKey] = options[currentKey] || options[oldKey];

				if (correctedData[currentKey] === undefined) {
					delete correctedData[currentKey];
				}

				delete correctedData[oldKey];
			};

			propertyConversionMap.forEach(updatePropertyOnNewOptions);
			delete correctedData.options;
		};

		correctedData.componentType = windowData.componentType ||
			get(windowData, 'customData.component.type', undefined) ||
			windowData.type;

		if (correctedData.componentType === undefined) {
			delete correctedData.componentType;
		}

		delete correctedData.type;
		correctedData.name = correctedData.name ||
			await WorkspaceManager.getNewWindowName(correctedData);

		if (windowData.options !== undefined) {
			formatOptions(windowData.options);
		}

		return correctedData;
	}

	/**
	 * Imports workspace data into storage.
	 *
	 * This data can be in any of the supported data format versions, and the necessary
	 * transformations will be applied automatically (see the `formatWindow`).
	 *
	 * @param workspace A workspace import object, a string representing a workspace import
	 * object as JSON.
	 */
	static async importWorkspace(trace: Trace, workspace: string | WorkspaceImport, force = false): Promise<string> {
		const { components, windowData, componentStates, ...ws } = typeof workspace === "string" ? JSON.parse(workspace) : workspace;
		let wsWindows;

		if (windowData !== undefined) {
			wsWindows = windowData;
		} else {
			wsWindows = [
				...ws.windows || [],
				...components || [],
			];
		}

		const windowPromises: Promise<FinsembleWindowData>[] = wsWindows.map(WorkspaceManager.formatWindow);
		const windows = await Promise.all(windowPromises);


		for (const winData of windows) {
			await WorkspaceManager._WS.setCompleteState(
				{
					windowData: winData as FinsembleWindowData,
					componentState: get(componentStates, [winData.name], {}),
				}
				, ws.name);
		}

		const createdWorkspace = {
			...ws,
			windows: windows.map((x: FinsembleWindowData) => x.name)
		};
		return WorkspaceManager.addWorkspace(trace, createdWorkspace, force);
	}

	/**
	 * Retrieves the given workspace from storage.
	 * @param workspaceName The name of the workspace to retrieve.
	 */
	static async getWorkspace(trace: Trace, workspaceName: string): Promise<Workspace> {
		log(trace, "Getting workspace", workspaceName);
		const key = getWorkspaceStorageKey(workspaceName);
		const data = await WorkspaceManager._SC.get1({ key, topic: STORAGE_TOPIC });
		if (!data) {
			throw new Error(WORKSPACE_NOT_FOUND(workspaceName));
		}
		log(trace, "Workspace retrieved", data);
		return data as Workspace;
	}

	/**
	 * Exports a workspace from storage in `WorkspaceImport` foramt.
	 * @param workspaceName The name of the workspace to retrieve from storage.
	 */
	static async exportWorkspace(trace: Trace, workspaceName: string): Promise<WorkspaceImport> {
		const ws = await WorkspaceManager.getWorkspace(trace, workspaceName);
		const [windows, windowData, componentStates] = (await WorkspaceManager._WS.getManyCompleteStates(ws.windows, ws.name))
			// TS 2.9.2 can't correctly infer the types from .reduce
			.reduce((prev: [string[], FinsembleWindowData[], Record<string, any>], { componentState, windowData }) => {
				const [names, wStates, cStates] = prev;
				return [
					[...names, windowData.name],
					[...wStates, windowData],
					{ ...cStates, [windowData.name]: componentState }
				];
			}, [[], [], {}]);
		// Dito above comment about TS 2.9.2
		return { ...ws, windows, windowData, componentStates } as WorkspaceImport;
	}

	/**
	 * Retrieves all workspaces from storage.
	 */
	static async getWorkspaces(trace: Trace): Promise<Workspace[]> {
		const workspaces = await WorkspaceManager.getWorkspaceNames(trace) || [];
		return await Promise.all(
			workspaces.map(x => WorkspaceManager.getWorkspace(trace, x))
		);
	}

	/**
	 * Retrieves the names of all workspaces in storage.
	 */
	static async getWorkspaceNames(trace: Trace): Promise<string[]> {
		const params = { topic: STORAGE_TOPIC, key: ALL_WORKSPACES };
		return (await WorkspaceManager._SC.get1(params)) as any || [];
	}

	/**
	 * Retrieves the state of active workspace from storage.
	 */
	static async getActiveWorkspace(trace: Trace): Promise<ActiveWorkspace> {
		log(trace, "Getting active workspace");
		const aws = await WorkspaceManager._SC
			.get({ topic: CACHE_STORAGE_TOPIC, key: ACTIVE_WORKSPACE }) as ActiveWorkspace;
		if (!aws) throw new Error(NO_ACTIVE_WORKSPACE);
		log(trace, "Active workspace retrieved", aws);
		return aws;
	}

	/**
	 * Returns a boolean indicating whether an active workspace has been set.
	 */
	static async doesActiveWorkspaceExist(trace: Trace): Promise<boolean> {
		/**
		 * Garbee 3/11/2019
		 * It may seem odd that we are returning the result of a promise chain into a new promise.
		 * The reason for this is to avoid the calling coder from being confused.
		 * If we don't await this and return the chain, then this is all inserted in their chain.
		 * Since we catch, this could lead to confusing results for them if their code errors as well.
		 */
		return await WorkspaceManager.getActiveWorkspace(trace)
			.then(() => true)
			.catch(() => false);
	}

	/**
	 * Returns a boolean indicating whether the active workspace is
	 * currently dirty.
	 */
	static async isActiveWorkspaceDirty(trace: Trace): Promise<boolean> {
		return (await WorkspaceManager.getActiveWorkspace(trace)).isDirty;
	}

	/**
	 * Sets the active workspace to the workspace with the given name.
	 * Returns the value of that workspace as a promise.
	 *
	 * @param workspaceName The name of the workspace in storage to
	 * make the active workspace.
	 */
	static async setActiveWorkspace(trace: Trace, workspaceName: string): Promise<ActiveWorkspace> {
		log(trace, "Setting active workspace", workspaceName);

		if (await WorkspaceManager.doesActiveWorkspaceExist(trace)) {
			// So as not to leave behind orphans, we remove all the states in
			// the active workspace before saving.
			const aws = await WorkspaceManager.getActiveWorkspace(trace);
			await WorkspaceManager._WS.removeManyCompleteStates(aws.windows);
		}

		const newActive = await WorkspaceManager.getWorkspace(trace, workspaceName);
		const states = await WorkspaceManager._WS.getManyCompleteStates(newActive.windows, workspaceName);

		const value = { ...newActive, isDirty: false, guid: guuid() };
		await WorkspaceManager._SC.save1({
			value,
			topic: CACHE_STORAGE_TOPIC,
			key: ACTIVE_WORKSPACE,
		});
		log(trace, "Active workspace set.");

		for (const s of states) {
			await WorkspaceManager._WS.setCompleteState(s);
		}

		return value;
	}

	/**
	 * Saves the state of active workspace into storage, overwriting
	 * what state was there under the workspace with the same as the
	 * active workspace.
	 *
	 * No-ops if the active workspace isn't dirty.
	 */
	static async saveActiveWorkspace(trace: Trace): Promise<void> {
		log(trace, "Saving active workspace");
		// Destructuring pulls out the isDirty and guid props
		const { isDirty, guid, ...aws } = await WorkspaceManager.getActiveWorkspace(trace);

		if (!isDirty) {
			log(trace, "Active workspace is clean, skipping save.");
			return;
		}

		// Clear out all the window states to prevent orphans
		const oldWindows = (await WorkspaceManager.getWorkspace(trace, aws.name)).windows;
		await WorkspaceManager._WS.removeManyCompleteStates(
			difference(oldWindows, aws.windows), aws.name);

		// Replaces all the state of the workspace in storage
		// with all the state of the active workspace
		await WorkspaceManager.updateWorkspace(trace, () => aws, aws.name);

		const windows = await WorkspaceManager._WS.getManyCompleteStates(aws.windows);
		await WorkspaceManager._WS.setManyCompleteStates(windows, aws.name);

		await WorkspaceManager.setActiveWorkspaceClean(trace);
		log(trace, "Active workspace saved");
	}

	/**
	 * Saves the current state of the active workspace as a new workspace
	 * with the given name.
	 *
	 * @param name The new name of the workspace. If the same as the
	 * active workspace, the active workspace will merely be saved
	 * If force is false, a new name will be generated from the given
	 * name and used instead.
	 *
	 * @param force Forces an overwrite of a workspace with the same name.
	 */
	static async saveActiveWorkspaceAs(trace: Trace, name: string, force: boolean): Promise<string> {
		log(trace, `Saving active workspace workspace as "${name}". Force param is ${force}.`);
		// Destructuring pulls out the unnecessary "isDirty" and "guid" props.
		const { isDirty, guid, ...aws } = await WorkspaceManager.getActiveWorkspace(trace);

		if (aws.name === name) {
			log(trace, "New name is same as the current name. Saving the active workspace.");
			await WorkspaceManager.saveActiveWorkspace(trace);
			return;
		}

		const finalName = await WorkspaceManager.addWorkspace(trace, { ...aws, name }, force);
		const winStates = await WorkspaceManager._WS.getManyCompleteStates(aws.windows);
		await WorkspaceManager._WS.setManyCompleteStates(winStates, finalName);

		await WorkspaceManager.setActiveWorkspace(trace, finalName);
		return finalName;
	}

	/**
	 * Adds a new, empty workspace to storage with the given name
	 * and returns the final name used (if the name already exists,
	 * a new name will generated using the standard nameing scheme
	 * (see `getNextWorkspaceName`).
	 */
	static async newWorkspace(trace: Trace, workspaceName: string): Promise<string> {
		log(trace, "Creating new workspace", workspaceName);
		const name = await WorkspaceManager.addWorkspace(trace,
			{
				version: "1.0.0",
				name: workspaceName,
				windows: [],
				type: "workspace",
				groups: {},
			});
		log(trace, "New workspace created");
		return name;
	}

	/**
	 * Changes the name of the workspace with `oldName` to `newName`.
	 * If `newName` already exists, a new name will be generated using
	 * the standard naming scheme (see `getNextWorkspaceName`).
	 *
	 * If the names are the same, the method is a no-op.
	 */
	static async renameWorkspace(trace: Trace, newName: string, oldName: string): Promise<string> {
		log(trace, `Renaming workspace "${oldName}" to "${newName}"`)
		// Renaming to the same name should be a noop.
		if (newName === oldName) return Promise.resolve(newName);

		const aws = await WorkspaceManager.getActiveWorkspace(trace);
		const targetingActiveWorkspace = oldName === aws.name;

		const ws = await WorkspaceManager.getWorkspace(trace, oldName);

		const finalName = await WorkspaceManager.addWorkspace(trace, { ...ws, name: newName });
		log(trace, `Final name of rename: ${finalName}`)
		const states = await WorkspaceManager._WS.getManyCompleteStates(ws.windows, oldName);
		log(trace, "Window states", states);
		await WorkspaceManager._WS.setManyCompleteStates(states, finalName);

		if (targetingActiveWorkspace) {
			const aStates = await WorkspaceManager._WS.getManyCompleteStates(aws.windows);
			await WorkspaceManager.setActiveWorkspace(trace, finalName);
			await WorkspaceManager._WS.setManyCompleteStates(aStates);

			await WorkspaceManager.updateActiveWorkspace(trace, aws => {
				return { ...aws, name: finalName };
			})
		}

		await WorkspaceManager.removeWorkspace(trace, oldName);

		return finalName;
	}

	/**
	 * Removes the workspace from storage.
	 *
	 * NOTE: you cannot remove the active workspace.
	 * @param workspaceName The name of the workspace to remove.
	 */
	static async removeWorkspace(trace: Trace, workspaceName: string): Promise<void> {
		log(trace, "Removing workspace", workspaceName);
		const aws = await WorkspaceManager.getActiveWorkspace(trace);
		const targetOnlySelectedWorkspace = (workspaces: string[]): string[] => {
			return workspaces.filter((workspace) => workspace !== workspaceName);
		};

		if (aws && workspaceName === aws.name) {
			throw new Error("You cannot remove the active workspace");
		}

		const ws = await WorkspaceManager.getWorkspace(trace, workspaceName);

		// Clear out the window states.
		await WorkspaceManager._WS.removeManyCompleteStates(ws.windows, ws.name);

		await WorkspaceManager._SC.remove1({
			topic: STORAGE_TOPIC,
			key: getWorkspaceStorageKey(workspaceName),
		});

		await WorkspaceManager._SC.updateStorage1({
			topic: STORAGE_TOPIC,
			key: ALL_WORKSPACES,
			updateFn: targetOnlySelectedWorkspace
		});
		log(trace, "Workspace removed");
	}


	/**
	 * Searches for a workspce that fuzzy-matches the given string.
	 * Returns results according to
	 * https://documentation.chartiq.com/finsemble/tutorial-Search.html
	 *
	 * @param s The string to fuzzy match against the workspace names.
	 */
	static async searchWorkspaces(trace: Trace, s: string) {
		/**
		 * Fuse's type definitions aren't up-to-date,
		 * so we have to do some casting here.
		 */
		type FuseResults = {
			item: number;
			matches: { indices: any, value: string }[],
			score: number;
		}

		const options = await WorkspaceManager.getWorkspaceSearchConfig(trace);
		if (!options.enabled) { return [] as FuseResults[]; }

		const workspaces = await WorkspaceManager.getWorkspaceNames(trace);
		const aws = await WorkspaceManager.getActiveWorkspace(trace);
		return (<FuseResults[]>(<any>new Fuse(workspaces, options)
			.search(s)))
			.filter(x => !x.matches.some(y => y.value === aws.name))
			.map(({ matches, score, item }) => {
				return {
					score,
					matches,
					name: workspaces[item],
					type: "Workspace",
					description: "",
					actions: [{ name: "Switch" }],
					tags: [],
				};
			});
	}
	/**
	 * Gets the "finsemble.workspaceSearch" configuration, merges it with the default and returns the combined object.
	 *
	 * @param {Trace} trace Unused for now - Debug trace
	 * @returns {Promise<any>} Returns a workspace config object
	 */
	static async getWorkspaceSearchConfig(trace: Trace): Promise<any> {
		let options = {
			enabled: true,
			shouldSort: true,
			includeScore: true,
			includeMatches: true,
			threshold: 0.4,
			location: 0,
			distance: 100,
			maxPatternLength: 32,
			minMatchCharLength: 1,
		};
		const { data: configWorkspaceSearch } = await ConfigClient.getValue({ field: "finsemble.servicesConfig.workspace.search" });
		if (configWorkspaceSearch != null) {
			if (configWorkspaceSearch.hasOwnProperty("enabled")) {
				options.enabled = configWorkspaceSearch.enabled;
			}
			if (configWorkspaceSearch.hasOwnProperty("options")) {
				options = merge(options, configWorkspaceSearch.options);
			}
		}
		return options;
	}

	/**
	 * Updates the state of a workspace in storage by retrieving the current state,
	 * applying the given transformation function, and setting the state to the result.
	 * Omit `workspaceName` to target the active workspace.
	 *
	 * If autosave is on and you are targeting the active workspace, the new state of the
	 * active workspace will automatically be persisted to permanent storage.
	 *
	 * @param updateFn A function that accepts a workspace and returns a transformed workspace.
	 * @param workspaceName The name of the workspace to update.
	 *
	 * DH 3/11/2019
	 * It would be nice if this function no-oped if there were no difference between the
	 * current state and the resulting state. This would eliminate some of the code in methods
	 * that use this function.
	 */
	private static async updateWorkspace(trace: Trace, updateFn: (ws: Workspace) => Workspace, workspaceName: string = ACTIVE_WORKSPACE) {
		log(trace, "Updating workspace", workspaceName);
		const targetingActiveWorkspace = workspaceName === ACTIVE_WORKSPACE;
		const awsExists = await WorkspaceManager.doesActiveWorkspaceExist(trace);

		if (targetingActiveWorkspace && !awsExists) {
			throw new Error(NO_ACTIVE_WORKSPACE);
		}

		const aws = awsExists ? (await WorkspaceManager.getActiveWorkspace(trace)) : null;
		if (targetingActiveWorkspace) {
			const update = updateFn(aws);
			log(trace, "Updated workspace", update);
			// Exit early if the update wouldn't produce any changes.
			if (deepEqual(update, aws)) {
				log(trace, "Update and current state are equal. Dropping request");
				return;
			}
			log(trace, "Update workspace is targeting active workspace");
			await WorkspaceManager._SC.save1({
				topic: CACHE_STORAGE_TOPIC,
				key: ACTIVE_WORKSPACE,
				value: { ...update, isDirty: true }
			});
			log(trace, "Active workspace updated");
		}

		const turnOffDirtyFlagIfActive = ws => { return targetingActiveWorkspace ? { ...ws, isDirty: false } : ws };
		if (!targetingActiveWorkspace || WorkspaceManager.autosave) {
			log(trace, "Persisting workspace data to storage");
			await WorkspaceManager._SC.updateStorage1({
				topic: STORAGE_TOPIC,
				key: getWorkspaceStorageKey(targetingActiveWorkspace ? aws.name : workspaceName),
				updateFn: composeRL(
					turnOffDirtyFlagIfActive,
					updateFn),
			});
			log(trace, "Workspace data persisted to storage");
		}
		log(trace, "Workspace updated");
	}

	/**
	 * Updates the state of a window in storage by retrieving the current state,
	 * applying the given transformation function, and setting the state to the result.
	 * 
	 * If this results in a change, the active workspace will be dirtied (or the change
	 * will be persisted to permanant storage if autosave is on).
	 * 
	 * DH 5/21/2019 @TODO This is a complex function, with an exception type 
	 * (if called before an active workspace is set), and 3 possible
	 * exits: if the states are totally equal, if the states are equal after
	 * removing cruft keys, and if the states are genuinely different. This
	 * is a code smell for sure, but will require larger refactorings in 
	 * stacks/assimilated windows (or some other architectural change) before
	 * we can safely remove these checks.
	 */
	static async updateWindowState(trace: Trace, stateVar: StateType, updateFn, windowName: string): Promise<void> {
		log(trace, "updating window state");

		if (!(await WorkspaceManager.doesActiveWorkspaceExist(trace))) {
			throw new Error(NO_ACTIVE_WORKSPACE);
		}

		const oldState = await WorkspaceManager._WS.getState(stateVar, windowName);
		const update = updateFn(oldState);
		if (deepEqual(oldState, update)) {
			// If there is no difference at all, we don't need to do anything.
			return;
		}

		await WorkspaceManager._WS.setState(stateVar, windowName, update);

		const aws = await WorkspaceManager.getActiveWorkspace(trace);

		const removeBadKeys = x => removeKeys(x, IGNORE_PROPS);

		if (// We don't want windows not in the workspace to dirty it.
			!aws.windows.includes(windowName)
			// We also need to strip off random keys that are constantly changing without reason
			// DH 5/21/2019 @TODO We need to better define what should and shouldn't be saved,
			// so this isn't necessary.
			|| deepEqual(removeBadKeys(update), removeBadKeys(oldState))) {
			return;
		}

		// If Autosave is on, we need to save the update to the permananet storage.
		if (WorkspaceManager.autosave) {
			await WorkspaceManager._WS.setState(stateVar, windowName, update, aws.name);
		} else {
			// Otherwise, the workspace is now dirty.
			await WorkspaceManager.setActiveWorkspaceDirty(trace);
		}
	}

	/**
	 * Given a window state, persists that window state to the active workspace storage.
	 * NOTE: This completely clobbers any existing state for that window.
	 * 
	 * If this results in a change, the active workspace will be dirtied (or the change
	 * will be persisted to permanant storage if autosave is on).
	 */
	static async setWindowState(trace, windowName, state: Partial<CompleteWindowState>) {
		for (const key of Object.keys(state)) {
			await WorkspaceManager.updateWindowState(trace, key as StateType, () => state[key], windowName);
		}
	}

	/**
	 * Adds a window to a given workspace.
	 * Omit `workspaceName` to target the active workspace.
	 */
	static async addWindowToWorkspace(trace: Trace, win: FinsembleWindowData | string, workspaceName?: string): Promise<void> {
		if (!win) throw new Error(NOT_VALID_WIN_NAME(win));
		if (typeof win === "object" && !win.name) throw new Error(NOT_VALID_WIN_NAME(win.name));

		log(trace, "Adding window", win, "to workspace", workspaceName || ACTIVE_WORKSPACE);
		const isString = typeof win === "string";
		const name = isString ? win as string : (win as FinsembleWindowData).name;

		const state: CompleteWindowState = {
			windowData: win as FinsembleWindowData,
			componentState: {}
		};

		if (!isString) await WorkspaceManager._WS.setCompleteState(state, workspaceName);

		await WorkspaceManager.updateWorkspace(trace, ws => {
			// DH 3/18/2019 - May not be necessary to filter since `updateWorkspace` compares the results...
			const windowsMinusTarget = ws.windows.filter(win => win !== name);
			return {
				...ws,
				windows: [...windowsMinusTarget, name]
			};
		}, workspaceName);
		log(trace, `Window ${name} added to ${workspaceName || ACTIVE_WORKSPACE}`);
	}

	/**
		* Removes a window from a given workspace.
		* Omit `workspaceName` to target the active workspace.
		*/
	static async removeWindowFromWorkspace(trace: Trace, windowName: string, workspaceName?: string): Promise<void> {
		if (!windowName) throw new Error(NOT_VALID_WIN_NAME(windowName));
		log(trace, `Removing window ${windowName} from workspace ${workspaceName || ACTIVE_WORKSPACE}`)

		try {
			await WorkspaceManager._WS.removeCompleteState(windowName, workspaceName);
		} catch (error) {
			Logger.system.warn(`Failed to remove window state ${windowName} from workspace ${workspaceName}.`)
		}

		await WorkspaceManager.updateWorkspace(trace, ws => {
			const filtered = ws.windows.filter(x => x !== windowName)
			log(trace, "Filtered windows,", filtered);
			return { ...ws, windows: filtered };
		}, workspaceName);
		log(trace, `Window ${windowName} removed from workspace ${workspaceName || ACTIVE_WORKSPACE}`)
	}

	/**
	 * Sets the group data of a given workspace.
	 * Omit the `workpaceName` to target the active worksapce.
	 *
	 * DH 3/11/2019
	 * Note the lack of fine-grained control here compared to
	 * the other workspace functions (i.e Windows, which you can
	 * add and remove individually). I think this is an indication
	 * this method doesn't belong here.
	 *
	 * @param groups An object where the keys are the group guids and the
	 * values are the group data objects.
	 */
	static async setGroupData(trace: Trace, guid: string, groups: Record<string, GroupData>, workspaceName?) {
		const ws = workspaceName ? await (WorkspaceManager.getWorkspace(trace, workspaceName))
			: await WorkspaceManager.getActiveWorkspace(trace);
		/** DH 7/8/2019
		 * For some reaoson, when switching workspaces, docking publishes group updates before
		 * the switch, as well as after (neither should be necessary, since the workspace
		 * is the source of group data on load). There is a race condition in workspaceService.ts
		 * such that certain `setGroupData` commands are processed at the wrong time in relation
		 * to the `setActiveWorkspace` command during `handleSwitchTo`, causing the group update
		 * from the previous active workspace to wrongly be applied to the current active workspace
		 * (and then immediately undone by the the next message, which contains the correct groups)
		 * Correcting the race condition is as simple as using:
		 * `await limit(() => WSM.setActiveWorkspace(trace, name);`
		 * However, there is a circular depenedency between the window service and workspace
		 * service (workspace can't switch till docking finishes, docking can't finish to new
		 * active workspace is set), resulting in deadlock.
		 * Therefore, for the time being, we'll for now resort to optimistic concurrency: to
		 * update group data, you must provide the guid of the workspace you wish to update. If the
		 * guid doesn't match the guid of the current active workspace, the update is discarded.
		 */
		if (guid && (ws as ActiveWorkspace).guid !== guid) return;
		await WorkspaceManager.updateWorkspace(trace, ws => ({ ...ws, groups }),
			workspaceName);
	}

	/**
	 * Sets the order of workspaces in storage to the given order.
	 * Used to control the order of the names as they appear in Finsemble's UI.
	 */
	static async setWorkspaceOrder(trace: Trace, newOrder: string[]): Promise<void> {
		// Users should include an entry for every workspace in the new order.
		const oldEntries = await WorkspaceManager.getWorkspaceNames(trace);

		// Make a copy here, otherwise you'll mutate the array.
		if (!deepEqual([...newOrder].sort(), [...oldEntries].sort())) {
			throw new Error(SET_ORDER_ERROR(oldEntries));
		}

		await WorkspaceManager._SC.save1({
			topic: STORAGE_TOPIC,
			key: ALL_WORKSPACES,
			value: newOrder,
		});
	}

	/**
	 * Transitions pre-3.9 workspace storage schemes to the new scheme,
	 * by pulling in workspaces from the old storage key, "fsblWorkspaces",
	 * and also adding a guid to the active workspace.
	 */
	static async importLegacyWorkspaces(trace) {
		const location = { topic: WORKSPACE.STORAGE_TOPIC, key: "fsblWorkspaces" }
		const workspaces = (await StorageClient.get(location)) || [];
		for (const { name, groups, windows } of workspaces) {
			const ws: Workspace = {
				name,
				groups,
				windows,
				type: "workspace",
				version: "1.0.0",
			};
			await WorkspaceManager.addWorkspace(trace, ws);
		}
		await StorageClient.remove(location);

		if (await WorkspaceManager.doesActiveWorkspaceExist(trace)) {
			// updateActiveWorkspace is used here as opposed to updateWorkspace
			// so as not to inadvertantly dirty it.
			await WorkspaceManager.updateActiveWorkspace(trace, ws => {
				return { ...ws, guid: ws.guid || guuid() };
			});
		}
	}
}
