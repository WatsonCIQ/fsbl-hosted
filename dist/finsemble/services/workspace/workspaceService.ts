import { FSBLDependencyManagerSingleton as FSBLDependencyManager } from "../../common/dependencyManager";
import { WorkspaceManager as WSM, WorkspaceManager } from "./workspaceManager";
import { WindowStorageManager as WinStore } from "../../common/windowStorageManager";
import { ResponderMessage } from "../../clients/IRouterClient";
import { Workspace, ActiveWorkspace, WorkspaceImport, GroupData } from "../../common/workspace";
import { FinsembleWindow } from "../../common/window/FinsembleWindow";
import { promisify, wrapWithTimeout, isStackedWindow } from "../../common/disentangledUtils";
import RouterClient from "../../clients/routerClientInstance";
import UserNotification from "../../common/userNotification";
import { FinsembleWindowData } from "../../common/FinsembleWindowData";
import { BaseService } from "../baseService";
import { WORKSPACE, DOCKING } from "../../common/constants";
import { isEqual as deepEqual, set, get, negate } from "lodash";
import pLimit from "p-limit";
const limit = pLimit(1);
import LauncherClient from "../../clients/launcherClient";
LauncherClient.initialize();
import StorageClient from "../../clients/storageClient";
StorageClient.initialize();
import ConfigClient from "../../clients/configClient";
ConfigClient.initialize();
import SearchClient from "../../clients/searchClient";
SearchClient.initialize();
import Logger from "../../clients/logger";
Logger.start();

const LIFECYCLE = "APPLICATION LIFECYCLE: "

const isNotStackedWindow = negate(isStackedWindow);

const { SET_ACTIVEWORKSPACE_DIRTY,
	GET_WORKSPACES, EXPORT, SAVE_AS,
	SAVE, SWITCH_TO, IMPORT, REMOVE,
	RENAME, SET_WORKSPACE_ORDER,
	GET_ACTIVE_WORKSPACE, GET_WORKSPACE_NAMES,
	NEW_WORKSPACE, SET_WINDOW_STATE, GET_WINDOW_STATE,
	ADD_WINDOW, REMOVE_WINDOW
} = WORKSPACE.API_CHANNELS;

const { UPDATE_PUBSUB, CLEAN_SHUTDOWN,
	STORAGE_TOPIC,
	INITIAL_WORKSPACE_PREFERENCE,
	PUBLISH_REASONS,
} = WORKSPACE;

const DROP_ON_CLOSE = true;

export type WorkspaceStateUpdate = {
	activeWorkspace: ActiveWorkspace,
	workspaces: Workspace[],
	groups: Record<string, GroupData>,
	reason: string,
}


const channelToOldReason = {
	NEW_WORKSPACE: PUBLISH_REASONS.NEW_WORKSPACE,
	ADD_WINDOW: PUBLISH_REASONS.WINDOW_ADDED,
	REMOVE_WINDOW: PUBLISH_REASONS.WINDOW_REMOVED,
	REMOVE: PUBLISH_REASONS.WORKSPACE_REMOVED,
	RENAME: PUBLISH_REASONS.WORKSPACE_RENAMED,
	SAVE_AS: PUBLISH_REASONS.SAVE_AS,
};

/** If, for whatever reason, there are no configured workspaces
 * use this instead. Also used when workspace times out.
 */
const emptyWS: WorkspaceImport = {
	name: "Empty Workspace",
	componentStates: {},
	groups: {},
	type: "workspace",
	version: "1.0.0",
	windowData: [],
	windows: []
};

/**
 * Setting *what* happened in the workspace service is very
 * easy; just look at the many local logs. Seeing *why* something
 * happened is quite difficult, as everything is based on chained
 * async calls. This tracing mechanism helps with that by adding
 * the reason for each request as well as an incremented counter.
 */
let traceCounter = -1;
/**
 * This should never be directly accessed. Instead, use the value
 * returned by `setGlobalTrace`.
 */
let _globalTrace: {
	counter: number,
	reason: string,
};
/**
 * Sets the global trace. Note, if this is called out of band,
 *
 * NOTE - Should only be called from within `WorkspaceService.init()`
 * or `WorkspaceService.createRouterEndpoints()`.
 */
function setGlobalTrace(reason: string) {
	traceCounter++;
	_globalTrace = {
		reason,
		counter: traceCounter,
	};
	return _globalTrace;
}

/**
 * WorkspaceService is an event handler that acts as the
 * public interface into workspaces for the rest of the system
 * (mostly by way of the WorkspaceClient).
 *
 * Most of its functionality is merely to pass messages received from
 * the router service to the WorkspaceManager, which does the heavy
 * lifting. This keeps the WorkspaceManager lean, agnostic of the rest
 * of the system, and easier to test.
 *
 * The rest of the functionality of the WorkspaceService is to handle
 * the loading and closing of the windows in a workspace. This requires
 * a bit of a song and dance (there's an order of operations that must
 * be obeyed). However, the WorkspaceService eagerly awaits the coming
 * of the Multi-Window Client, which will allow operations on sets of
 * windows, and obviate much of the complex load/close behavior here.
 *
 * Once there is a MultiWindow Client handling load/close, and once
 * workspace and window states are stored in a reactive store like the
 * persistent store, all the Workspace Service's function will have been
 * outsourced; at that point, it could probably be absorbed by the the
 * Window service, which would eliminate certain timing issues (see the
 * odd state-machine formed by WorkspaceService.loading/closingWorkspace)
 */
class WorkspaceService extends BaseService {
	private static cachedWorkspaceState: WorkspaceStateUpdate;
	private static lifecycle: "loading" | "closing" | "stable" | "shuttingDown" = "loading";
	private static loadWorkspaceTimeout: number;
	private static loadWorkspaceTimeoutMessage: string;
	private static closeWorkspaceTimeout: number;
	private static closeWorkspaceTimeoutMessage: string;

	constructor(params) {
		super(params);
	}

	initialize = async () => {
		const trace = setGlobalTrace(PUBLISH_REASONS.INIT);

		/**
		 * Previous versions used a slightly different storage scheme.
		 * Therefore we need to import any workspaces from the legacy location
		 * on startup.
		 */
		await WSM.importLegacyWorkspaces(trace);

		let { data: finsemble } = await ConfigClient.getValue({ field: "finsemble" });

		// Grab the workspaceService defaults from config
		WorkspaceService.loadWorkspaceTimeout = get(finsemble, "servicesConfig.workspace.loadWorkspaceTimeout")
			|| get(finsemble, "services.workspaceService.loadWorkspaceTimeout") || 30000;

		WorkspaceService.loadWorkspaceTimeoutMessage = get(finsemble, "finsemble.servicesConfig.workspace.loadFailureNotificationMessage",
			"Some workspace components haven't loaded. If you save your workspace, those components will be permanently removed.");

		WorkspaceService.closeWorkspaceTimeout = get(finsemble, "servicesConfig.workspace.closeWorkspaceTimeout")
			|| get(finsemble, "services.workspaceService.closeWorkspaceTimeout") || 30000;

		WorkspaceService.closeWorkspaceTimeoutMessage = get(finsemble, "finsemble.servicesConfig.workspace.closeFailureNotificationMessage",
			"Problem closing current workspace. Please close any windows remaining on your screen and then select another workspace to open.");

		const promptOnDirty = await ConfigClient.getValue({ field: "finsemble.preferences.workspaceService.promptUserOnDirtyWorkspace" });
		WorkspaceManager.autosave = promptOnDirty === false;


		const workspaceNames = await WSM.getWorkspaceNames(trace);
		const configWorkspacesExist = Boolean(finsemble.workspaces && finsemble.workspaces.length);

		const defaultIfNoConfig = !workspaceNames.length ? [emptyWS] : [];
		const workspaces: WorkspaceImport[] = configWorkspacesExist ?
			finsemble.workspaces : defaultIfNoConfig;

		// We don't want to import any workspaces already in storage, so we filter them out.
		for (const ws of workspaces.filter(x => !workspaceNames.includes(x.name))) {
			await WSM.importWorkspace(trace, ws);
		}

		// DH 3/6/2019 - If registration fails, this will hang the entire WS launch
		await WorkspaceService.registerSearch();

		const initPref = await new Promise((resolve) =>
			ConfigClient.getPreferences(INITIAL_WORKSPACE_PREFERENCE,
				(err, res) => resolve(res)));

		const startupWS = initPref[INITIAL_WORKSPACE_PREFERENCE];

		if (startupWS) {
			Logger.log(LIFECYCLE, `Loading user-defined initial workspace "${startupWS}"`);
			await WSM.setActiveWorkspace(trace, startupWS);
		} else {
			// The first time Finsemble starts, if there's no initial workspace in config,
			// we'll take the first workspace in the list as the default.
			const awsExists = await WSM.doesActiveWorkspaceExist(trace);
			const awsToBe = awsExists ?
				await WSM.getActiveWorkspace(trace)
				// On some code paths, this `workspaces` is undefined. However, on those paths,
				// there should ALWAYS be an active workspace, so you should never hit here.
				: workspaces[0];
			Logger.log(LIFECYCLE, `Will load ${awsToBe.name} as active workspace.`)
			const cleanShutdown = !awsExists
				|| (await StorageClient.get({ topic: STORAGE_TOPIC, key: CLEAN_SHUTDOWN }));

			if (!cleanShutdown) {
				Logger.warn(LIFECYCLE, "Unclean shutdown detected. Reloading active workspace in dirty state.");
			} else {
				await WSM.setActiveWorkspace(trace, awsToBe.name);
			}

			Logger.log(LIFECYCLE, `Loading last used workspace "${awsToBe.name}"`);
		}



		// By intentionally not awaiting this promise, the service will come online
		// without waiting for all the windows to launch (which could take a long time).
		WorkspaceService.load(trace, (await WSM.getActiveWorkspace(trace)).name);

		await WorkspaceService.createRouterEndpoints();

		/**
		 * After startup is finished, we set the CLEAN_SHUTDOWN flag to false, so that it acts like
		 * a sort of dead-man switch; if Finsemble shutsdown without setting it to true (i.e, because
		 * of a crash, etc.), the active workspace will be loaded in its dirty state.
		 */
		await StorageClient.save({ topic: STORAGE_TOPIC, key: CLEAN_SHUTDOWN, value: false });
		await WorkspaceService.publishUpdate(trace, PUBLISH_REASONS.LOAD_DATA_RETRIEVED);
		Logger.log(LIFECYCLE, "Finished initializing");
	}

	/**
	 * Registers the service as a Search Provider.
	 * See https://documentation.chartiq.com/finsemble/tutorial-Search.html
	 */
	static async registerSearch() {
		// Because this isn't in the global queue, we can't set the global trace,
		// as doing so could throw off the count.
		const trace = { counter: undefined, reason: "Out of Band-Search Provider" };

		function handleSearch(params, callback) {
			if (!params.action || !params.item) return;
			if (params.action.name === "Switch") {
				WorkspaceService.handleSwitchTo(trace, params.item.name)
					.then(() => callback(null, "success"))
					.catch(err => callback(err));
			}
		}

		// DH 3/6/2019 - If registration fails, this will hang the entire WS launch
		const registerSearchPromiseResolver = (resolve, reject) => {
			SearchClient.register({
				name: "Installed Workspaces",
				searchCallback: ({ text }, cb) =>
					WSM.searchWorkspaces(trace, text)
						.then(results => cb(null, results)),
				itemActionCallback: handleSearch,
				providerActionCallback: () => { }
			}, resolve);
		};
		return new Promise(registerSearchPromiseResolver);
	};

	/**
	 * Creates the public API for the window service
	 * as router endpoints.
	 *
	 * Divided into 3 sections: query responders, listeners,
	 * and pub/sub responders. Ideally, the listeners and pub/sub
	 * responders would be gotten rid of by just making calls
	 * to the WorkspaceClient at the appropriate time.
	 *
	 * DH 3/11/2019 - We should confirm our clients don't listen
	 * to those transmission channels/pub-sub topics and just remove
	 * them if they don't.
	 */
	static async createRouterEndpoints() {
		/////////// Query Responders /////////////
		/**
		 * An array of 3-tuples:
		 *
		 * First element is the channel to respond two.
		 *
		 * Second element is a function whose first argument
		 * is the current trace, and whose second argument is
		 * data received along with the query message. If the
		 * function returns a promise, the promise will be awaited.
		 *
		 * Third element is an optional boolean that indicates
		 * whether the request should be dropped when the active
		 * workspace is switching (i.e loading or closing). Default
		 * is not to drop (`false`).
		 */
		const responders = [
			//////// Special behavior implemented in this class////////
			///////////////////////////////////////////////////////////
			// From Sidd
			// Terry, we shouldn't really have such methods. The way a
			// developer ought to build batch window actions would be:
			//
			// windowSet = await WorkspaceClient.getWindowSet();
			// await WindowClient.minimize(windowSet);
			["WorkspaceService.bringWindowsToFront", (trace) => WorkspaceService.handleBringWindowsToFront(trace)],
			["WorkspaceService.minimizeAll", (trace) => WorkspaceService.handleMinimizeAll(trace)],

			////////////////// Pass-throughs to WSM ////////////////////////
			////////////////////////////////////////////////////////////////
			[GET_ACTIVE_WORKSPACE, WSM.getActiveWorkspace],
			[NEW_WORKSPACE, (trace, { workspaceName }) => WSM.newWorkspace(trace, workspaceName)],
			// DH 3/16/2019 A bug in the UI code lets you hit export before you've selected a WS
			// so we need a guard.
			[EXPORT, (trace, { workspaceName }) => workspaceName && WSM.exportWorkspace(trace, workspaceName)],
			/**
			 * If force is false, importing may result in a new name.
			 * To inform the caller of the new names, IMPORT returns
			 * an object which maps the original names to the new names.
			 * (if force is false, these will be identical)
			 */
			[IMPORT, (trace, { workspaceJSONDefinition, force }) =>
				Promise.all(Object.values(workspaceJSONDefinition as Record<string, string | WorkspaceImport>)
					.map(x => WSM.importWorkspace(trace, x, force))
				).then(results => Object.keys(workspaceJSONDefinition)
					.reduce((prev, curr, i) => set(prev, curr, results[i]), {}))],
			[SAVE, WSM.saveActiveWorkspace, DROP_ON_CLOSE],
			[SAVE_AS, (trace, { name, force }) => WSM.saveActiveWorkspaceAs(trace, name, force), DROP_ON_CLOSE],
			[REMOVE, (trace, { name }) => WSM.removeWorkspace(trace, name), DROP_ON_CLOSE],
			[SWITCH_TO, async (trace, data) => {
				// All SwitchTo requests should be dropped if we're already
				// in the middle of a switch
				if (WorkspaceService.lifecycle !== "stable") {
					const name = typeof data === "string" ? data : data.name;
					Logger.system.error(`Received a SwitchTo request for workspace ${name} while transitioning `
						+ `workspaces, likely indicating a timing issue or error. Dropping request.`);
				} else {
					await WorkspaceService.handleSwitchTo(trace, data);
				}
			}],
			[SET_WORKSPACE_ORDER, (trace, data) => WSM.setWorkspaceOrder(trace, data.map(x => x.name))],
			[GET_WORKSPACES, WSM.getWorkspaces],
			[SET_WINDOW_STATE, (trace, { windowName, state }) => WSM.setWindowState(trace, windowName, state),
				DROP_ON_CLOSE],
			[GET_WINDOW_STATE, (trace, { windowName, stateVars }) => WinStore.getState(stateVars, windowName)],
			[GET_WORKSPACE_NAMES, WSM.getWorkspaceNames],
			[ADD_WINDOW, WSM.addWindowToWorkspace, DROP_ON_CLOSE],
			[REMOVE_WINDOW, (trace, { name }) => WSM.removeWindowFromWorkspace(trace, name)],
			[RENAME, (trace, { oldName, newName }) => WSM.renameWorkspace(trace, newName, oldName)],
		];

		for (const [channel, handler, dropOnClose] of responders as [string, Function, boolean][]) {
			RouterClient.addResponder(channel, async (err, message: ResponderMessage) => {
				const trace = setGlobalTrace(channel);
				if (err) {
					// DH 3/11/2019 - I'm not sure how best to handle WorkspaceService. Under what circumstances
					// Would a message *already* have an error?
					Logger.system.error(err);
					message.sendQueryResponse(err, null);
					return;
				}
				const sendError = error => {
					const errToSend = error instanceof Error ? error.toString() : error;
					message.sendQueryResponse(errToSend, null)
				};
				try {
					Logger.info(`TRACE-${traceCounter}-Handling response for ${channel}. Lifecycle status: ${WorkspaceService.lifecycle}`);
					Logger.debug(`TRACE-${traceCounter}-Message data`, message)
					if (dropOnClose && WorkspaceService.lifecycle === "closing") {
						const msg = `Workspace is currently closing. Dropping request.`;
						Logger.log(msg);
						sendError(msg)
						return;
					};
					message.sendQueryResponse(null, await limit(() => handler(trace, message.data)));
					await WorkspaceService.publishUpdate(trace, channel);
				} catch (error) {
					Logger.system.error(error);
					sendError(error);
				}
			});
		}

		/////////////////// Listeners /////////////////////////
		RouterClient.addListener(SET_ACTIVEWORKSPACE_DIRTY,
			(_, message) => limit(() => (async () => {
				const trace = setGlobalTrace(SET_ACTIVEWORKSPACE_DIRTY);
				const { windowName } = message.data;
				const aws = await WSM.getActiveWorkspace(trace)
				if (// DH 5/24/2019
					// We may not need this lifecycle check, but it won't hurt
					WorkspaceService.lifecycle !== "closing"
					&& !aws.isDirty
					&& aws.windows.includes(windowName)) {
					Logger.info(`TRACE-${traceCounter}-Handling transmission "${message.header.channel}"`);
					Logger.debug(`TRACE-${traceCounter}-Message data`, message)
					await WSM.setActiveWorkspaceDirty(trace);
					await WorkspaceService.publishUpdate(trace, SET_ACTIVEWORKSPACE_DIRTY);
				}
			})()));

		const handleShutdown = async () => {
			WorkspaceService.lifecycle = "shuttingDown";
			Logger.log(LIFECYCLE, "Shutdown detected.");
			await StorageClient.save({ topic: STORAGE_TOPIC, key: CLEAN_SHUTDOWN, value: true });
			Logger.log("Clean shutdown recorded in storage.");
		}

		RouterClient.addListener("Application.shutdown", handleShutdown);
		RouterClient.addListener("Application.restart", handleShutdown);

		////////////////// Pub/Sub Listeners //////////////////
		RouterClient.subscribe(DOCKING.GROUP_UPDATE,
			async (err, { data: { groupData, guid } }) => {
				const trace = setGlobalTrace(DOCKING.GROUP_UPDATE);
				if (WorkspaceService.lifecycle === "closing") {
					Logger.warn(`TRACE-${traceCounter}-Received publish from docking while closing the workspace. Dropping request.`)
					return;
				}
				/** DH 3/11/2019
				 * The behavior for topics prefixed with "Finsemble" is
				 * strange: when it first starts up, it publishes `undefined`;
				 * hence, this guard is necessary.
				 */
				if (groupData) {
					Logger.info(`TRACE-${traceCounter}-Received publish from docking, updating groups`);
					await limit(() => WSM.setGroupData(trace, guid, groupData));
					await WorkspaceService.publishUpdate(trace, DOCKING.GROUP_UPDATE);
				}
			});
	}

	/**
	 * Publishes an update of the entire state of all workspaces.
	 * No-ops if the old state is the same as the new state.
	 *
	 * DH 3/11/2019 - This is a *lot* of data to be passing around
	 * to a very small audience. A reactive store like the Persistent
	 * store would obviate the need for an update like this: just
	 * query what you need, and receive updates as they happen.
	 */
	private static async publishUpdate(trace, reason) {
		const mappedReason = channelToOldReason[reason] || reason;
		const aws = await WSM.getActiveWorkspace(trace);
		const state = {
			activeWorkspace: aws,
			workspaces: await WSM.getWorkspaces(trace),
			/** DH 3/5/2019
			 * This is redundant since the data is already
			 * on the active workspace. However, to minimize
			 * changes to the consumers, I'm leaving it as-is.
			 */
			groups: aws.groups,
			reason: mappedReason,
		} as WorkspaceStateUpdate;

		if (deepEqual(state, WorkspaceService.cachedWorkspaceState)) {
			Logger.debug(LIFECYCLE, "No changes detected, skipping publish.");
			return;
		}
		Logger.debug(`TRACE-${trace.counter}-Publishing workspace update"`, { ...state, cached: WorkspaceService.cachedWorkspaceState });
		WorkspaceService.cachedWorkspaceState = state;
		RouterClient.publish(UPDATE_PUBSUB, state);
	}

	/**
	 * Closes the active workspace and loads the workspace
	 * with the given name as the new active workspace.
	 *
	 * Returns the active workspace.
	 */
	static async handleSwitchTo(trace, data: string | { name: string }) {
		const name = typeof data !== "string"
			? (data as { name: string }).name
			: data as string;
		Logger.log(LIFECYCLE, `Switching to workspace "${name}"`);
		const closeSucceeded = await WorkspaceService.close(trace);
		// If the close failed, we create a new emtpy workspace
		const finalName = closeSucceeded ? name : await WSM.addWorkspace(trace, emptyWS);

		await WorkspaceService.publishUpdate(trace, PUBLISH_REASONS.LOAD_STARTED);
		const aws = await WSM.setActiveWorkspace(trace, finalName);
		await WorkspaceService.publishUpdate(trace, PUBLISH_REASONS.LOAD_DATA_RETRIEVED);
		await WorkspaceService.load(trace, finalName);

		return {
			data: aws,
		}
	}

	/**
	 * Closes all the windows belonging to the active workspace.
	 * Returns a boolean representing successful close.
	 *
	 * As noted above, this should eventually be replaced with a call
	 * to the coming Multi-Window Client.
	 */
	private static async close(trace): Promise<boolean> {
		WorkspaceService.lifecycle = "closing";
		Logger.log(LIFECYCLE, "Closing active workspace.");
		const windowList = (await WSM.getActiveWorkspace(trace)).windows;
		const windows = await WinStore.getManyStates("windowData", windowList);

		// If there are no windows, there's nothing to do.
		if (!windows.length) {
			WorkspaceService.lifecycle = "stable";
			// This counts as success
			return true;
		};

		const TIMEOUT = WorkspaceService.closeWorkspaceTimeout;
		let windowsRemaining = [...windows];
		let closeSucceeded = false;
		try {
			await wrapWithTimeout(
				new Promise(async (outerResolve, reject) => {
					const closeFn = async (win: FinsembleWindowData) => {
						return new Promise(async (closeResolve, closeReject) => {
							Logger.log(LIFECYCLE, `Closing window ${win.name}`);
							try {
								/** DH 3/5/2019
									 * getInstance doesn't resolve on all code paths.
									 * Wrapping it like this ensures the code continues.
								 */
								const wrap =
									await promisify<FinsembleWindow>(FinsembleWindow.getInstance)({ windowName: win.name });

								wrap.close({
									removeFromWorkspace: false,
									ignoreParent: true
								}, (error, response) => {
									if (error) Logger.system.error(error);
									Logger.log(LIFECYCLE, `Finished closing window ${win.name}`);
									windowsRemaining = windowsRemaining.filter(x => x !== win);
									closeResolve();
								});
							} catch (error) {
								Logger.system.error(error);
								closeResolve();
							}
						})
					}
					await Promise.all(windows.map(win => closeFn(win)));

					//Resolve outer promise once all windows have closed
					outerResolve();

				}), TIMEOUT, `Attempt to close workspace windows timed out after ${TIMEOUT} ms., Remaining windows:`);
			closeSucceeded = true;
		} catch (error) {
			Logger.system.error(error, windowsRemaining);
			UserNotification.alert("user", "ALWAYS", "FSBL-WorkspaceSwitch-Failure",
				WorkspaceService.closeWorkspaceTimeoutMessage, {});
		}

		await WorkspaceService.publishUpdate(trace, PUBLISH_REASONS.LOAD_FINISHED);
		Logger.log(LIFECYCLE, "Finished closing active workspace.");
		WorkspaceService.lifecycle = "stable";
		return closeSucceeded;
	}

	/**
	 * Launches all windows in the active workspace.
	 */
	private static async load(trace, name: string) {
		WorkspaceService.lifecycle = "loading";

		Logger.log(LIFECYCLE, `Loading workspace "${name}"`);
		const target = await WSM.getWorkspace(trace, name);

		// Tell the launcher service to reset the stagger algorithm
		RouterClient.transmit("Launcher.resetSpawnStagger", {});

		// If the workspace is empty, we're done.
		if (!target.windows.length) {
			WorkspaceService.lifecycle = "stable";
			return;
		}

		const instanceList = await WinStore.getManyStates("windowData", target.windows, name);

		// ******************************************************************************************************************************
		// TABBING: here need to add code to spawn in two groups: 1) first all the not stacked windows 2) then the stackedWindows
		//
		// Ideally the workspace manager would only spawn the stacked window, letting the stacked window spawn its children -- this
		// approach would provide for a orderly startup, but it also impacts too much code on first pass. The simple approach used
		// does introduces some startup timing holes, but hopefully won't matter because tabbing related activity should
		// be minimal.  Still, some tweaks for startup might be required.
		// ******************************************************************************************************************************
		const stacks = instanceList.filter(isStackedWindow);
		const notStacks = instanceList.filter(isNotStackedWindow);
		//Create a list of all window names which are children of a stack
		const windowsWhichAreChildrenOfAStack = [];
		const stackChildNames = stacks.map((stack) => {
			return stack.childWindowIdentifiers.map((child) => {
				return child.windowName
			});
		});
		notStacks.forEach((instance) => {
			const name = instance.name;
			stackChildNames.forEach((names) => {
				if (names.includes(name) === true) {
					windowsWhichAreChildrenOfAStack.push(name);
				}
			});
		});
		const spawnList = (list: FinsembleWindowData[]): Promise<void>[] => {
			return list.map(async win => {
				/** DH 3/5/2019
				 * Component state is stored in several places right now.
				 * @TODO pick a place stick with it across the system.
				 */
				const component = get(win, "customData.component.type", win.componentType);
				Logger.debug(LIFECYCLE, "Launching component", win.name);

				// autoShow will be undefined if there is no reason to use it, this way
				// Finsemble will pull its value from the component config
				let autoShow = undefined;
				//If the current window is a stack child, we want to hide it when it spawns until the stack is ready/calls it to be visible
				if (windowsWhichAreChildrenOfAStack.includes(win.name)) {
					autoShow = false;
					win.autoShow = false;
				}
				let componentSpawnParams: {
					spawnedByWorkspaceService: boolean,
					addToWorkspace: boolean,
					options: any,
					autoShow?: boolean | undefined
				} = {
					spawnedByWorkspaceService: true,
					addToWorkspace: false,
					options: win,
					autoShow: autoShow
				};
				try {
					await promisify(LauncherClient.spawn.bind(LauncherClient))(component, componentSpawnParams);
				} catch (error) {
					Logger.system.error(error);
				}
			});
		}

		const TIMEOUT = WorkspaceService.loadWorkspaceTimeout;

		try {
			await wrapWithTimeout(new Promise(async (resolve) => {
				await Promise.all(spawnList(notStacks));
				await Promise.all(spawnList(stacks));
				resolve();
			}), TIMEOUT, `Attempt to load workspace windows timed out after ${TIMEOUT} ms.`);
		} catch (error) {
			Logger.system.error(error);
			UserNotification.alert("user", "ALWAYS", "FSBL-WorkspaceSwitch-Failure",
				WorkspaceService.loadWorkspaceTimeoutMessage, {});
		}

		WorkspaceService.lifecycle = "stable";

		Logger.log(LIFECYCLE, "Finished loading workspace");
	}

	/**
	 * Brings all windows in the active workspace to front.
	 * (Just a pass-through to the LauncherClient).
	 */
	static async handleBringWindowsToFront(trace) {
		const windowList = (await WSM.getActiveWorkspace(trace)).windows;
		return new Promise((resolve) => {
			LauncherClient.bringWindowsToFront({ windowList }, resolve);
		});
	}
	/**
		* Minimizes all windows in the active workspace.
		* (Just a pass-through to the LauncherClient).
		*/
	static async handleMinimizeAll(trace) {
		const windowList = (await WSM.getActiveWorkspace(trace)).windows;
		return new Promise((resolve) => {
			LauncherClient.minimizeWindows({ windowList }, resolve);
		});
	}
}

const serviceInstance = new WorkspaceService({
	name: "workspaceService",
	startupDependencies: {
		services: ["preferencesService", "dataStoreService"],
		clients: ["configClient", "storageClient", "searchClient", "launcherClient"]
	},
	shutdownDependencies: {
		services: ["startupLauncherService"]
	}
});

serviceInstance.onBaseServiceReady(cb => {
	FSBLDependencyManager.onAuthorizationCompleted(() => {
		FSBLDependencyManager.startup.waitFor({
			services: ["assimilationService", "windowService"]
		}, (cb2) => {
			serviceInstance.initialize().then(cb2).then(cb);
		});
	});
});

serviceInstance.start();
window["WorkspaceService"] = serviceInstance;
