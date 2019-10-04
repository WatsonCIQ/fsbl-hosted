/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import { _BaseClient } from "./baseClient";
import * as Util from "../common/util";
import Validate from "../common/validate";
import Logger from "./logger";
import { WORKSPACE } from "../common/constants";
import { Workspace } from "../common/workspace";
import { ActiveWorkspace } from "../common/workspace";
import { FinsembleWindowData } from "../common/FinsembleWindowData";
import { RouterResponse } from "./IRouterClient";
import { StateType, CompleteWindowState } from "../common/windowStorageManager";

/**
 * @introduction
 * <h2>Workspace Client</h2>
 * ----------
 * The Workspace Client manages all calls to load, save, rename, and delete workspaces. For an overview, please read the [Workspace tutorial](tutorial-Workspaces.html).
 *
 * @hideConstructor true
 * @constructor
 * @summary You don't need to ever invoke the constructor. This is done for you when WindowClient is added to the FSBL object.
 */
class WorkspaceClient extends _BaseClient {
	/**
		* List of all workspaces within the application.
		* @type {Array.<Object>}
		*/
	workspaces: Workspace[] = [];
	/**
		* Reference to the activeWorkspace object
		* @type {object}
		*/
	activeWorkspace: ActiveWorkspace;
	workspaceIsDirty: boolean;

	constructor(params) {
		super(params);
		Validate.args(params, "object=") && params && (Validate.args2 as any)("params.onReady", params.onReady, "function=");
	}

	// Helper function to handle response from service
	private _serviceResponseHandler(err, response, resolve, reject, cb = Function.prototype) {
		if (err) {
			reject(new Error(err));
			return cb(err);
		}
		if (!response) response = { data: null };
		resolve(response.data);
		cb(null, response.data);
	}

	/// CORE SAVE API - Currently Private. Eventually these will handle all saves. Workspace will just be a data provider.
	/**
	 * Saves Data Globally to the Active Workspace (e.g. ComponentState, WindowList etc.)
	 * @param {object} params
	 * @param {string} params.field
	 * @param {object} params.value
	 * @param {FinsembleCallbackFunction} cb
	 */
	private saveGlobalData(params, cb) {
		Logger.system.debug("WorkspaceClient.saveGlobalData", params);
		const saveGlobalDataPromiseResolver = (resolve, reject) => {
			this.routerClient.query(WORKSPACE.API_CHANNELS.SAVE_GLOBAL_DATA, params, (err, response) => {
				this._serviceResponseHandler(err, response, resolve, reject, cb);
			});
		}
		return new Promise(saveGlobalDataPromiseResolver);
	}

	/**
	 * Saves View Specific Data (e.g. ComponentState, WindowList etc.) to the Currently Active Workspace View or all Views
	 * When a window state changes, on
	 * @param {object} params
	 * @param {string} params.field
	 * @param {object} params.value
	 * @param {boolean} params.saveToAllViews
	 * @param {FinsembleCallbackFunction} cb
	 */
	private saveViewData(params, cb) {
		Logger.system.debug("WorkspaceClient.saveViewData", params);
		const saveViewDataPromiseResolver = (resolve, reject) => {
			this.routerClient.query(WORKSPACE.API_CHANNELS.SAVE_VIEW_DATA, params, (err, response) => {
				this._serviceResponseHandler(err, response, resolve, reject, cb);
			});
		}
		return new Promise(saveViewDataPromiseResolver);
	}

	// This is unnecessary. Window Service should call SaveGlobalData, saveViewData
	/**
	 * Adds window to active workspace.
	 * @private
	 * @param {object} params
	 * @param {string} params.name Window name
	 * @param {function} cb Callback
	 */
	addWindow(params: FinsembleWindowData, cb = Function.prototype) {
		Validate.args(params, "object", cb, "function=") && params && (Validate.args2 as any)("params.name", params.name, "string");
		this.routerClient.query("WorkspaceService.addWindow", params, (err, response) => {
			Logger.system.log(`WORKSPACE LIFECYCLE: Window added:WorkspaceClient.addWindow: Name (${params.name})`);
			cb(err, response);
		});
	}

	/**
	 * Removes window from active workspace.
	 * @private
	 * @param {object} params
	 * @param {string} params.name Window name
	 * @param {function} cb Callback
	 * @example <caption>This method removes a window from a workspace. It is rarely called by the developer. It is called when a window that is using the window manager is closed. That way, the next time the app is loaded, that window is not spawned.</caption>
	 * FSBL.Clients.WorkspaceClient.removeWindow({name:windowName}, function(err, response){
	 * 	//do something after removing the window.
	 * });
	 */
	removeWindow(params: {
		name: string
	}, cb = Function.prototype) {
		Validate.args(params, "object", cb, "function=") && (Validate.args2 as any)("params.name", params.name, "string");
		this.routerClient.query("WorkspaceService.removeWindow", params,
			(err, response) => {
				if (err) {
					return Logger.system.error(err);
				}
				Logger.system.log(`WORKSPACE LIFECYCLE:WorkspaceClient.removeWindow:Window removed: Name (${params.name})`);
				if (response) {
					cb(err, response.data);
				} else {
					cb(err, null);
				}
			});
	}

	// Window Related Workspace Functions. Eventually these need to move to the Window Service
	/**
	 * AutoArranges windows.
	 * @param {object} params Parameters
	 * @param {string} params.monitor Same options as {@link LauncherClient#showWindow}. Default is monitor of calling window.
	 * @param {function} cb Callback
	 * @example
	 * FSBL.Clients.WorkspaceClient.autoArrange(function(err, response){
	 * 		//do something after the auto-arrange, maybe make all of the windows flash or notify the user that their monitor is now tidy.
	 * });
	 */
	autoArrange(params: {
		monitor?: string,
		monitorDimensions?: any
	}, cb = Function.prototype) {
		Validate.args(params, "object", cb, "function=");
		params = params ? params : {};
		Util.getMyWindowIdentifier((myWindowIdentifier) => {
			FSBL.Clients.LauncherClient.getMonitorInfo({
				windowIdentifier: myWindowIdentifier
			}, (err, dimensions) => {
				params.monitorDimensions = dimensions.unclaimedRect;
				params.monitorDimensions.name = dimensions.name;
				this.routerClient.query("DockingService.autoArrange", params, cb);
			});
		});
	}

	/**
	 * Minimizes all windows.
	 * @param {object} params
	 * @param {string} 	[params.monitor="all"] Same options as {@link LauncherClient#showWindow} except that "all" will work for all monitors. Defaults to all.
	 * @param {function} cb Callback.
	 * @example
	 * FSBL.Clients.WorkspaceClient.bringWindowsToFront();
	 */
	minimizeAll(params?: {
		monitor: string,
		windowIdentifier?: any
	}, cb = Function.prototype) {
		Validate.args(params, "object", cb, "function=");
		params = params ? params : { monitor: "all" };
		Util.getMyWindowIdentifier((myWindowIdentifier) => {
			if (!params.windowIdentifier) {
				params.windowIdentifier = myWindowIdentifier;
			}
			this.routerClient.query("WorkspaceService.minimizeAll", params, cb);
		});
	}

	/**
	 * Brings all windows to the front.
	 * @param {object} params
	 * @param {string} 	params.monitor Same options as {@link LauncherClient#showWindow} except that "all" will work for all monitors. Defaults to the monitor for the current window.
	 * @param {function} cb Callback.
	 * @example
	 * FSBL.Clients.WorkspaceClient.bringWindowsToFront();
	 */
	bringWindowsToFront(params?: {
		monitor: string,
		windowIdentifier?: any
	}, cb = Function.prototype) {
		Validate.args(params, "object", cb, "function=");
		params = params ? params : { monitor: "all" };
		Util.getMyWindowIdentifier((myWindowIdentifier) => {
			if (!params.windowIdentifier) {
				params.windowIdentifier = myWindowIdentifier;
			}
			this.routerClient.query("WorkspaceService.bringWindowsToFront", params, cb);
		});
	}

	/**
	 * Gets the currently active workspace.
	 * @param {function} cb Callback
	 * @example <caption>This function is useful for setting the initial state of a menu or dialog. It is used in the toolbar component to set the initial state.</caption>
	 *
	 * FSBL.Clients.WorkspaceClient.getActiveWorkspace((err, response) => {
	 * 	//setState is a React component method.
	 * 	self.setState({
	 * 		workspaces: response
	 * 	});
	 * });
	 */
	async getActiveWorkspace(cb?: StandardCallback): Promise<{ data: Workspace }> {
		Logger.system.debug("WorkspaceClient.getActiveWorkspace");
		const result = (await this.routerClient.query(WORKSPACE.API_CHANNELS.GET_ACTIVE_WORKSPACE, {})).response;
		this.activeWorkspace = result.data;
		if (result.data.err) {
			if (cb) cb(result.data.err);
			throw new Error(result.data.err);
		}

		if (cb) cb(null, result);
		return result;
	}

	/**
	 * Returns the list of saved workspaces.
	 * @param {function} cb Callback
	 * @example <caption>This function is useful for setting the initial state of a menu or dialog.</caption>
	 *
	 * FSBL.Clients.WorkspaceClient.getActiveWorkspace((err, response) => {
	 * 	//setState is a React component method.
	 * 	self.setState({
	 * 		workspaces: response
	 * 	});
	 * });
	 */
	getWorkspaces(cb?) {
		Validate.args(cb, "function=");
		Logger.system.debug("WorkspaceClient.getWorkspaces");
		const getWorkspacesPromiseResolver = (resolve, reject) => {
			this.routerClient.query(WORKSPACE.API_CHANNELS.GET_WORKSPACES, {}, (err, response) => {
				this._serviceResponseHandler(err, response, resolve, reject, cb);
			});
		}
		return new Promise(getWorkspacesPromiseResolver);
	}

	/**
	 * @private
	 *
	 * @param {*} params
	 * @param {*} cb
	 * @returns
	 * @memberof WorkspaceClient
	 */
	setWorkspaceOrder(params, cb) {
		let { workspaces } = params;
		Validate.args(cb, "function");
		Logger.system.debug("WorkspaceClient.setWorkspaceOrder", params);
		const setWorkspaceOrderPromiseResolver = (resolve, reject) => {
			this.routerClient.query(WORKSPACE.API_CHANNELS.SET_WORKSPACE_ORDER, params.workspaces || params, (err, response) => {
				this._serviceResponseHandler(err, response, resolve, reject, cb);
			});
		}
		return new Promise(setWorkspaceOrderPromiseResolver);
	}
	//Backward Compatibility
	setWorkspaces = this.setWorkspaceOrder;

	/**
	 * Removes a workspace. Either the workspace object or its name must be provided.
	 * @param {object} params
	 * @param {Object} 	params.workspace Workspace
	 * @param {string} 	params.name Workspace Name
	 * @param {function} cb Callback to fire after 'Finsemble.WorkspaceService.update' is transmitted.
	 * @example <caption>This function removes 'My Workspace' from the main menu and the default storage tied to the application.</caption>
	 * FSBL.Clients.WorkspaceClient.remove({
	 * 	name: 'My Workspace'
	 * }, function(err, response) {
	 * 	//You typically won't do anything here. If you'd like to do something when a workspace change happens, we suggest listening on the `Finsemble.WorkspaceService.update` channel.
	 * });
	 */
	remove(params: {
		workspace?: { name: string },
		name?: string
	}, cb = Function.prototype) {
		Validate.args(params, "object", cb, "function=") && !(params.name || params.workspace) && (Validate.args2 as any)("params.name", params.name, "string");
		Logger.system.debug("WorkspaceClient.remove", params);
		const removePromiseResolver = (resolve, reject) => {
			if (!params.name) {
				params.name = params.workspace.name;
				// we dont need to send workspace objects over the router if not needed.
				delete params.workspace;
			}
			// Cannot remove active workspace.
			if (params.name === this.activeWorkspace.name) {
				Logger.system.error("APPLICATION LIFECYCLE:  Cannot remove active workspace: WorkspaceClient.remove:attempt to remove active workspace name:" + this.activeWorkspace.name);
				let err = "Cannot remove active workspace";
				return this._serviceResponseHandler(err, null, resolve, reject, cb);
			}
			this.routerClient.query(WORKSPACE.API_CHANNELS.REMOVE, params, (err, response) => {
				this._serviceResponseHandler(err, response, resolve, reject, cb);
			});
		}
		return new Promise(removePromiseResolver);
	}

	/**
	 * Renames the workspace with the provided name. Also removes all references in storage to the old workspace's name.
	 * @param {object} params
	 * @param {string} params.oldName Name of workspace to rename.
	 * @param {string} params.newName What to rename the workspace to.
	 * @param {boolean} params.removeOldWorkspace Whether to remove references to old workspace after renaming.
	 * @param {boolean} params.overwriteExisting Whether to overwrite an existing workspace.
	 * @param {function} cb Callback
	 * @example <caption>This method is used to rename workspaces. It is used in the main Menu component.</caption>
	 * FSBL.Clients.WorkspaceClient.rename({
	 * 	oldName: 'My Workspace',
	 * 	newName: 'The best workspace',
	 * 	removeOldWorkspace: true,
	 * }, function(err, response){
	 * 	//Do something.
	 * });
	 */
	rename(params: {
		oldName: string,
		newName: string,
		removeOldWorkspace?: boolean,
		overwriteExisting?: boolean
	}, cb = Function.prototype) {
		Validate.args(params, "object", cb, "function=") && (Validate.args2 as any)("params.oldName", params.oldName, "string", "params.newName", params.newName, "string");
		Logger.system.debug("WorkspaceClient.rename", params);
		const renamePromiseResolver = (resolve, reject) => {
			if (!params.overwriteExisting && this.workspaceExists(params.newName)) {
				let err = "Workspace Already Exists";
				return this._serviceResponseHandler(err, null, resolve, reject, cb);
			}

			this.routerClient.query(WORKSPACE.API_CHANNELS.RENAME, params, (err, response) => {
				this._serviceResponseHandler(err, response, resolve, reject, cb);
			});
		}
		return new Promise(renamePromiseResolver);
	}

	/**
	 * Makes a clone (i.e. copy) of the workspace.  The active workspace is not affected.
	 * @private
	 * @param {object} params
	 * @param {string} params.name Name of workspace to clone.
	 * @param {string} params.newName Name of workspace to clone.
	 * @param {function} cb cb(err,response) with response set to the name of the cloned workspace if no error
	 * @example <caption>This method is used to clone workspaces. </caption>
	 * FSBL.Clients.WorkspaceClient.clone({
	 * 	name: 'The best workspace'
	 * }, function(err, response){
	 * 	//Do something.
	 * });
	 */
	// Keeping for backward compatibility
	clone(params: {
		name: string,
		newName: string,
		removeOldWorkspace?: boolean
	}, cb: Function = Function.prototype) {
		Validate.args(params, "object", cb, "function=") && (Validate.args2 as any)("params.name", params.name, "string");
		delete params.name;
		if (!params.newName) { params.newName = params.name + "_clone"; }
		params.removeOldWorkspace = false;
		return this.rename({
			removeOldWorkspace: false,
			newName: params.newName,
			oldName: params.name
		}, cb);
	};

	/**
	 * Saves the currently saved workspace. Changes to the <code>activeWorkspace</code> are made on every change automatically.
	 * @param {function} cb Callback
	 * @example <caption>This function persists the currently active workspace.</caption>
	 * FSBL.Clients.WorkspaceClient.save(function(err, response){
	 * 	//Do something.
	 * });
	 */
	save(cb = Function.prototype) {
		Logger.system.debug("WorkspaceClient.save");
		const savePromiseResolver = (resolve, reject) => {
			this.routerClient.query(WORKSPACE.API_CHANNELS.SAVE, {}, (err, response) => {
				this._serviceResponseHandler(err, response, resolve, reject, cb);
			});
		}
		return new Promise(savePromiseResolver);
	}

	/**
	 * Helper that tells us whether a workspace with this name exists.
	 * @private
	 */
	workspaceExists(workspaceName) {
		Validate.args(workspaceName, "string");
		for (var i = 0; i < this.workspaces.length; i++) {
			if (workspaceName === this.workspaces[i].name) {
				return true;
			}
		}
		return false;
	}

	/**
	 *
	 * Saves the currently active workspace with the provided name.
	 * @param {object} params
	 * @param {string} params.name new name to save workspace under.
	 * @param {string} params.force Whether to overwrite a workspace already saved with the provided name.
	 * @param {function} cb Callback
	 * @example <caption>This function persists the currently active workspace with the provided name.</caption>
	 * FSBL.Clients.WorkspaceClient.saveAs({
	 * 	name: 'My Workspace',
	 * }, function(err, response){
	 * 	//Do something.
	 * });
	 */
	saveAs(params: {
		name?: string,
		force: boolean
	}, cb = Function.prototype) {
		Validate.args(params, "object", cb, "function=") && (Validate.args2 as any)("params.name", params.name, "string");
		Logger.system.debug("WorkspaceClient.saveAs", params);
		const saveAsPromiseResolver = (resolve, reject) => {
			if (!params.force && this.workspaceExists(params.name)) {
				return this._serviceResponseHandler("Workspace Already Exists", null, resolve, reject, cb);
			}
			this.routerClient.query(WORKSPACE.API_CHANNELS.SAVE_AS, params, (err, response) => {
				this._serviceResponseHandler(err, response, resolve, reject, cb);
			});
		}
		return new Promise(saveAsPromiseResolver);
	}

	/**
	 * Switches to a workspace.
	 * @param {object} params
	 * @param {string} 	params.name Workspace Name
	 * @param {function} cb Callback
	 * @example <caption>This function loads the workspace 'My Workspace' from the storage tied to the application.</caption>
	 * FSBL.Clients.WorkspaceClient.switchTo({
	 * 	name: 'My Workspace',
	 * }, function(err, response){
	 * 	//Do something.
	 * });
	 */
	async switchTo(params: {
		name: string,
	}, cb = Function.prototype): Promise<{ data: Workspace }> {
		Validate.args(params, "object", cb, "function") && (Validate.args2 as any)("params.name", params.name, "string");
		Logger.system.debug("WorkspaceClient.switchTo", params);
		const result = await this.routerClient.query(WORKSPACE.API_CHANNELS.SWITCH_TO, params);
		if (result.err) {
			cb(result.err, null);
			throw new Error(result.err);
		}
		cb(result);
		return result;
	}

	/**
	 * @private
	 * ALPHA - Subject to breaking change in coming minor releases.
	 * Sets the stored state of a given window in the active workspace. `state` may include
	 * keys for `windowData`, `componentState`, or both; the state of each key will be completely
	 * overwritten by the provided state. If the update results in dirtying change, the active
	 * workspace will be marked dirty (or, if autosave is on, persisted directly to storage).
	 */
	async _setWindowState(params: { windowName: string, state: Partial<CompleteWindowState> }): Promise<RouterResponse<boolean>> {
		Logger.system.debug("WorkspaceClient.setWindowData", params);
		return this.routerClient.query(WORKSPACE.API_CHANNELS.SET_WINDOW_STATE, params);
	}

	/**
	 * @private
	 * ALPHA - Subject to breaking change in coming minor releases.
	 * Retrieves the given window from storage, retrieving the requested state variables
	 * (`"componentState"` and/or `"windowData"`).
	 */
	async _getWindowState(params: { windowName: string, stateVars: StateType[] }): Promise<RouterResponse<Partial<CompleteWindowState>>> {
		Logger.system.debug("WorkspaceClient.getWindowData", params);
		return this.routerClient.query(WORKSPACE.API_CHANNELS.GET_WINDOW_STATE, params);
	}

	/**
	 * Checks to see if the workspace is dirty. If it's already dirty, the window doesn't need to compare its state to the saved state.
	 * @param {Function} Callback cb(err,response) with response set to true if dirty and false otherwise (when no error)
	 * @example <caption>This function will let you know if the activeWorkspace is dirty.</caption>
	 * FSBL.Clients.WorkspaceClient.isWorkspaceDirty(function(err, response){
	 * 		//Do something like prompt the user if they'd like to save the currently loaded workspace before switching.
	 * });
	 */
	isWorkspaceDirty(cb) {
		Validate.args(cb, "function");
		Logger.system.debug("WorkspaceClient.isWorkspaceDirty");
		const isWorkspaceDirtyPromiseResolver = (resolve, reject) => {
			this._serviceResponseHandler(null, { data: this.activeWorkspace.isDirty }, resolve, reject, cb);
		}
		return new Promise(isWorkspaceDirtyPromiseResolver);
	}

	/**
	 * Creates a new workspace, returning a promise for the final name of
	 * the new workspace as a string. After creation, if "switchAfterCreation" is true,
	 * the new workspace becomes the active workspace.
	 *
	 * If the requested name already exists, a new workspace will be created
	 * with the form "[name] (1)" (or "[name] (2)", etc.)
	 *
	 * @param {String} workspaceName Name for new workspace.
	 * @param {Object} params Optional params
	 * @param {boolean} params.switchAfterCreation Whether to switch to the new workspace after creating it.
	 * @param {Function} cb cb(err,response) With response, set to new workspace object if no error.
	 * @example <caption>This function creates the workspace 'My Workspace'.</caption>
	 * FSBL.Clients.WorkspaceClient.createWorkspace(function(err, response){
	 *		if (!err) {}
	 *			//Do something like notify the user that the workspace has been created.
	 *		}
	 * });
	 */
	async createWorkspace(workspaceName, params: {
		switchAfterCreation?: boolean
	}, cb = (err, result: { workspaceName: string }) => { }): Promise<{ workspaceName: string }> {
		Logger.system.log(`WorkspaceClient: Creating Workspace Request for name "${workspaceName}"`)
		const finalName: string = (await this.routerClient.query(
			WORKSPACE.API_CHANNELS.NEW_WORKSPACE,
			{ workspaceName })).response.data;

		if (params.switchAfterCreation !== false) {
			await this.switchTo({ name: finalName });
		}
		const result = { workspaceName: finalName }
		cb(null, result);
		return result;
	}
	/**
	 * @private
	 */
	createNewWorkspace = this.createWorkspace; //Backward Compatibility

	/**
	 * Gets a workspace definition in JSON form.
	 *
	 * @param {object} params
	 * @param {string} params.workspaceName the workspace name
	 * @param {function} cb callback(error,workspaceDefinition)
	 */
	export(params: {
		workspaceName: string
	}, cb) {
		Validate.args(params, "object", cb, "function") && (Validate.args2 as any)("params.workspaceName", params.workspaceName, "string");
		Logger.system.debug("WorkspaceClient.export", params);
		const exportPromiseResolver = (resolve, reject) => {
			this.routerClient.query(WORKSPACE.API_CHANNELS.EXPORT, params, (err, response) => {
				let workspaceExport = {};
				workspaceExport[params.workspaceName] = response.data;
				this._serviceResponseHandler(err, { data: workspaceExport }, resolve, reject, cb);
			});
		}
		return new Promise(exportPromiseResolver);
	}
	getWorkspaceDefinition = this.export; //Backward Compatibility

	/**
	 * Adds a workspace definition to the list of available workspaces.
	 *
	 * @param {object} params
	 * @param {object} params.workspaceJSONDefinition JSON for workspace definition
	 * @param {function=} cb cb(err) where the operation was successful if !err; otherwise, err carries diagnostics
	 *
	 */
	async import(params: {
		workspaceJSONDefinition: Record<string, Workspace | string>,
		force: boolean,
	}, cb?): Promise<Record<string, string>> {
		Validate.args(params, "object", cb, "function=") && (Validate.args2 as any)("params.workspaceJSONDefinition", params.workspaceJSONDefinition, "object");
		Logger.system.debug("WorkspaceClient.import", params);
		const result: Record<string, string> = (await this.routerClient.query(WORKSPACE.API_CHANNELS.IMPORT, params)).response.data;
		if (result.err) {
			cb(result.err);
			throw new Error(result.err)
		}
		if (cb) cb(null, result)
		return result;
	}
	addWorkspaceDefinition = this.import; //Backward Compatibility

	/**
	 * Saves one mor more template defintions in a selected file. Note the
	 * end user is prompted to identify file location during this save
	 * operation. The file can optionally be imported during config
	 * initialization (see importConfig) although this requires administration
	 * support on the configuration/server side. The file can also be read
	 * using readWorkspaceTemplateFromConfigFile();
	 *
	 * @param {object} params
	 * @param {object} params.workspaceTemplateDefinition legal template definition returned by either
	 * getWorkspaceTemplateDefinition() or convertWorkspaceDefinitionToTemplate()
	 * @private
	 */
	exportToFile(params: {
		workspaceTemplateDefinition: any
	}) {
		// TODO: Make it possible to export both workspaces and templates.
		Logger.system.info("workspaceClient.saveWorkspaceTemplateToConfigFile", params);
		Validate.args(params, "object") && (Validate.args2 as any)("params.workspaceTemplateDefinition", params.workspaceTemplateDefinition, "object");
		var workspaceTemplateDefinition = params.workspaceTemplateDefinition;
		if (typeof workspaceTemplateDefinition === "object") {
			var templateName = Object.keys(workspaceTemplateDefinition)[0];
			if (templateName && workspaceTemplateDefinition[templateName].templateDefinitionFlag) { // confirm the object is a template definition
				var exportConfig = { workspaceTemplates: workspaceTemplateDefinition };
				FSBL.ConfigUtils.promptAndSaveJSONToLocalFile("workspaceConfig-" + templateName, exportConfig);
			} else {
				Logger.system.error("workspaceClient.saveWorkspaceTemplateToConfigFile. Input is not a legal template");
			}
		} else {
			Logger.system.error("workspaceClient.saveWorkspaceTemplateToConfigFile: Input is not a legal object");
		}
	}
	saveWorkspaceTemplateToConfigFile = this.exportToFile;

	/**
	 * Initializes listeners and sets default data on the WorkspaceClient object.
	 * @private
	 */
	async start(cb) {
		/**
		 * Initializes the workspace's state.
		 */

		this.routerClient.subscribe("Finsemble.WorkspaceService.update", (err, response) => {
			Logger.system.debug("workspaceClient init subscribe response", err, response);
			if (err) {
				Logger.system.error(err);
				return;
			}
			this.activeWorkspace = response.data.activeWorkspace;
			this.workspaces = response.data.workspaces;
			if (cb) {
				cb();
			}
		});
	}
}

var workspaceClient = new WorkspaceClient({
	startupDependencies: {
		services: ["workspaceService"],
		clients: []
	},
	onReady: (cb) => {
		workspaceClient.start(cb);
	},
	name: "workspaceClient"
});

export default workspaceClient;
