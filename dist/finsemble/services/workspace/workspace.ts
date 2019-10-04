import { WORKSPACE } from "../../common/constants";
import * as util from "../../common/util";
import StorageClient from "../../clients/storageClient";
import Logger from "../../clients/logger";
Logger.start();
StorageClient.initialize();

// This is an initial attempt to isolate some workspace functionality and simplify it so that it can be used better in the workspace service
// Note that this is not yet in the state it should be in because it inherits the defects of the existing functionality but at the minimum it will provide a starting point for the restructuring.
// Also note that so far the assumption in all the functions below is that success is guaranteed. This needs error checking, promise rejection on error etc. However for the time being this is equivalent to the existing.
type WorkspaceParams = {
	name?: string;
	windows?: any[];
	groups?: object;
}
export class Workspace {
	name: string;
	windows: Array<any>;
	initializedWindows?: Array<any>;
	isDirty: boolean;
	groups: any;
	isActive?: boolean = false;

	constructor(params: string | WorkspaceParams) {
		if (typeof params === "string") {
			this.name = params;
			this.windows = [];
			this.groups = {};
		} else {
			this.name = params.name || "";
			this.windows = params.windows || [];
			this.groups = params.groups || {};
		}
		
		this.initializedWindows = [];
		this.isDirty = false;
	}

	getWindowHash(windowName) {
		return util.camelCase(this.name, windowName);
	}

	getComponentHash(windowName) {
		return util.camelCase(this.name, windowName, windowName);
	}

	/**
	 * This will import and save a Workspace definition to storage.
	 * @param definition Workspace JSON definition
	 */
	import(definition) {
		const importPromiseResolver = async (resolve) => {
			Logger.system.debug("Workspace.import", definition.name, definition.windows);
			if (definition.name) this.name = definition.name;
			if (definition.windows) this.windows = definition.windows;
			// filterWorkspaceDefinition(workspaceObject); // This was removed at one point and replaced with some other logic to deal with components not available to the user.
			if (definition.groups) this.groups = definition.groups;
			// save workspace
			await this.saveWorkspace();

			// save workspace window data
			if (definition.windowData) {
				await this.saveWindowData(definition.windowData);
			}

			// save workspace component state
			// this is not saved on the workspace object itself to avoid using memory. Probably the same thing needs to be done for windowData.
			if (definition.componentStates) {
				await this.saveComponentStates(definition.componentStates);
			}
			resolve();
		}

		return new Promise(importPromiseResolver);
	}

	/**
	 * Get Workspace JSON for exporting
	 */
	export() {
		const exportPromiseResolver = async (resolve) => {
			Logger.system.debug("Workspace.export", this.name);
			let workspaceJSONObject = {
				name: this.name,
				groups: this.groups,
				windows: this.windows,
				windowData: await this.getWindowData(),
				componentStates: await this.getComponentStates(),
				workspaceDefinitionFlag: true // Note this is a bad idea. It means creating new flags for different types. Would have been much better to have definitionType: "workspace" and have multiple definition types.
			}
			resolve(workspaceJSONObject);
		}

		return new Promise(exportPromiseResolver);
	}

	/**
	 * Only Saves the workspace, not windowData or ComponentState
	 */
	saveWorkspace() {
		const saveWorkspacePromiseResolver = async (resolve) => {
			Logger.system.debug("Workspace.saveWorkspace", this.name);
			await StorageClient.save({
				topic: WORKSPACE.STORAGE_TOPIC, key: util.camelCase(this.name), value: {
					name: this.name,
					groups: this.groups,
					windows: this.windows
				}
			});
			resolve();
		}

		return new Promise(saveWorkspacePromiseResolver);
	}

	/**
	 * This saves the window descriptors for all the windows into storage
	 */
	saveWindowData(windowData) {
		const saveWindowDataPromiseResolver = async (resolve) => {
			Logger.system.debug("Workspace.saveWindowData", this.name, windowData);
			for (let i = 0; i < this.windows.length; i++) {
				let windowName = this.windows[i];
				let descriptor = windowData[i];
				// Remove the manifest before saving. It's big and we don't need it.
				if (windowData[i].customData) {
					delete windowData[i].customData.manifest;
				}
				let windowHash = this.getWindowHash(windowName);
				await StorageClient.save({ topic: WORKSPACE.STORAGE_TOPIC, key: windowHash, value: descriptor });
			}
			resolve();
		}

		return new Promise(saveWindowDataPromiseResolver);
	}

	/**
	 * This gets window data for all windows in the workspace
	 */
	getWindowData() {
		const getWindowDataPromiseResolver = async (resolve) => {
			Logger.system.debug("Workspace.getWindowData", this.name);
			let windowData = [];
			for (let i = 0; i < this.windows.length; i++) {
				let windowName = this.windows[i];
				let windowHash = this.getWindowHash(windowName);
				let descriptor = await StorageClient.get({ topic: WORKSPACE.STORAGE_TOPIC, key: windowHash });
				windowData.push(descriptor);
			}
			resolve(windowData);
		}

		return new Promise(getWindowDataPromiseResolver);
	}

	/**
	 * This saves the component state of all the components to storage
	 * @param componentStates an object containing all the component states for windows in the workspace
	 */
	saveComponentStates(componentStates) {
		const saveComponentStatesPromiseResolver = async (resolve) => {
			Logger.system.debug("Workspace.saveComponentStates", this.name, componentStates);
			for (let windowName in componentStates) {
				let componentHash = this.getComponentHash(windowName);
				await StorageClient.save({ topic: WORKSPACE.STORAGE_TOPIC, key: componentHash, value: componentStates[windowName] });
			}
			resolve();
		}

		return new Promise(saveComponentStatesPromiseResolver);
	}

	/**
	 * This gets ComponentState of all the components of this workspace from storage
	 */
	getComponentStates() {
		const getComponentStatesPromiseResolver = async (resolve) => {
			Logger.system.debug("Workspace.getComponentStates", this.name);
			let componentStates = {};
			for (let windowName of this.windows) {
				let componentHash = this.getComponentHash(windowName);
				let state = await StorageClient.get({ topic: WORKSPACE.STORAGE_TOPIC, key: componentHash });
				if (state) {
					componentStates[windowName] = state;
				}
			}
			resolve(componentStates);
		}

		return new Promise(getComponentStatesPromiseResolver);
	}
}
