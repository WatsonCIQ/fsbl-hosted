
declare type ActiveWorkspaceState = "loading" | "ready" | "closing";
declare type ActiveWorkspaceDescriptorPublishReason = "currentValue" | "nameChange" | "dirtyChange" | "groupChange" | "windowChange";
declare type WorkspaceListPublishReason = "initialValue" | "subscriptionValue" | "descriptorRemoved" | "descriptorChanged";
import { _BaseClient } from "./baseClient";
import Logger from "./logger";
import Validate from "../common/validate";

/*
	SUMMMARY OF WORKSPACE API CHANGES

	Much of the old API is kept in place with tweaks.  The biggest changes are outlined below.

	** need to make sure presentation works
	1) Workspace PubSub capabilities are refactored
		Old PubSubs:
			Finsemble.WorkspaceService.groupUpdate"
			Finsemble.WorkspaceService.update" replaced with
		New PubSubs:
			Finsemble.Workspace.ActiveWorkspaceState
			Finsemble.Workspace.ActiveWorkspaceDescriptor
			Finsemble.Workspace.WorkspaceList
			workspaceClient.ListenOnWorkspaceList ---- reference

	3) multi-window functions are removed from workspace service; similar multi-window feature are relocated into window service
		a) autoArrange
		b) minimizeAll
		c) bringWindowsToFront

	4) remove the following workspace-client functions (either not used or another way to accomplish the same)
		e) clone
		f) workspaceIsAlreadySaved
		g) isWorkspaceDirty
		h) getGroupData
		i) saveGroupData
		j) getWorkspaceName

	*/

function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

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
	workspaces: any;
	activeWorkspace: any


	constructor(params) {
		super(params);
		this.workspaces = [];
	}

	/////////////////////////////////////////////////////////////////////////////
	// Workspace Client: General Member functions
	/////////////////////////////////////////////////////////////////////////////

	/**
	 * Gets the currently active workspace.
	 * @param {function} cb Callback
	 * @example <caption>This function is useful for setting the initial state of a menu or dialog. It is used in the toolbar component to set the initial state.</caption>
	 *
	FSBL.Clients.WorkspaceClient.getActiveWorkspace(function (err, response) {
		//setState is a React component method.
		self.setState({
			workspaces: response
		});
	});
	 */
	getActiveWorkspace(cb = Function.prototype) {
		Validate.args(cb, "function");
		Logger.system.debug("workspaceClient getActiveWorkspace", this.activeWorkspace);
		const getActiveWorkspacePromiseResolver = (resolve, reject) => {
			if (this.activeWorkspace) {
				resolve(this.activeWorkspace);
				return cb(null, this.activeWorkspace);
			}
			const err = "Active Workspace Not Found";
			reject(new Error(err));
			cb(err)
		}
		return new Promise(getActiveWorkspacePromiseResolver);
	}

	/**
	 * Returns the list of saved workspaces.
	 * @param {function} cb Callback
	 * @example <caption>This function is useful for setting the initial state of a menu or dialog.</caption>
	 *
	FSBL.Clients.WorkspaceClient.getWorkspaces(function (err, response) {
		//setState is a React component method.
		self.setState({
			workspaces: response
		});
	});
	 */
	getWorkspaces(cb = Function.prototype) {
		Validate.args(cb, "function");
		const getWorkspacesPromiseResolver = (resolve, reject) => {
			this.routerClient.query("WorkspaceService.getWorkspaces", null,
				(err, response) => {
					if (err) {
						reject(new Error(err));
						return Logger.system.error("WorkspaceClient.getWorkspaces:", err);
					}
					resolve(response.data);
					cb(err, response.data);
				}
			);
		}
		return new Promise(getWorkspacesPromiseResolver);
	}

	/**
	 * Sets the order of workspaces. This is used for displaying Workspaces in the UI in a specific order.
	 * @param params list of workspace names
	 * @param cb
	 */
	setWorkspaceOrder(params, cb = Function.prototype) {
		const { workspaces } = params;
		Validate.args(cb, "function");
		const setWorkspaceOrderPromiseResolver = (resolve, reject) => {
			this.routerClient.query("WorkspaceService.setWorkspaces", workspaces,
				(err, response) => {
					if (err) {
						reject(new Error(err));
						return Logger.system.error("set worspaces", err);
					}
					resolve(response.data);
					cb(err, response.data);
				});
		};
		return new Promise(setWorkspaceOrderPromiseResolver);

	}
	setWorkspaces = this.setWorkspaceOrder; // Backward compatibility

	/**
	 * Removes a workspace.
	 * @NOTE: if special behavior, clarify what happens if the active workspace
	 * @param {object} params
	 * @param {string} 	[params.name] Workspace Name
	 * @param {finsembleCallbackWithError} cb Callback after workspace has been removed and 'Finsemble.WorkspaceService.update' is transmitted.
	 */
	remove(params, cb) {
		const removePromiseResolver = (resolve, reject) => {
			this.routerClient.query("WorkspaceService.remove", params,
				(err, response) => {
					if (err) {
						reject(new Error(err));
						return Logger.system.error(err);
					}
					Logger.system.log(`APPLICATION LIFECYCLE: Workspace Removed:WorkspaceClient.remove:successfully removed ${params.name}`);
					resolve("success");
					cb(err, "success");
				}
			);
		}
		return new Promise(removePromiseResolver);
	}

	/**
	 * Renames a workspace.
	 * @param {object} params
	 * @param {string} params.oldName Name of workspace to rename.
	 * @param {string} params.newName What to rename the workspace to.
	 * @param {boolean} [params.overwriteExisting=false] Whether to overwrite an existing workspace.
	 * @param {finsembleCallbackWithError} cb Callback after the workspace has been renamed
	 */
	rename(params, cb = Function.prototype) {
		const renamePromiseResolver = (resolve, reject) => {
			this.routerClient.query("WorkspaceService.rename", params,
				(err, response) => {
					if (err) {
						reject(new Error(err));
						return Logger.system.error(err);
					}
					Logger.system.log(`APPLICATION LIFECYCLE: Workspace Removed:WorkspaceClient.remove:successfully removed ${params.name}`);
					resolve("success");
					cb(err, "success");
				}
			);
		}
		return new Promise(renamePromiseResolver);
	}

	/**
	 * Saves the currently active workspace. It does not overwrite the saved instance of the workspace. It simply overwrites the <code>activeWorkspace</code> key in storage.
	 * @param {finsembleCallbackWithError} cb Callback after the workspace has been saved
	 */
	save(cb = Function.prototype) {
		const savePromiseResolver = (resolve, reject) => {
			this.routerClient.query("WorkspaceService.save", null,
				(err, response) => {
					if (err) {
						reject(new Error(err));
						return Logger.system.error(err);
					}
					resolve("success");
					cb(null, "success");
				}
			);
		}
		return new Promise(savePromiseResolver);
	}

	/**
	 *
	 * Saves the currently active workspace with the provided name.
	 * @param {object} params
	 * @param {string} params.name new name to save workspace under.
	 * @param {string} [params.force=false] Whether to overwrite a workspace already saved with the provided name.
	 * @param {string} [params.renameDuplicate=false] Whether to automatically chose a modified workspace name if given name exists (e.g "myWorkpace" would become "myWorkspace(1)")

	 * @param {finsembleCallbackWithError} cb Callback after the workspace has been saved
	 */
	saveAs(params, cb = Function.prototype) {
		Validate.args(params, "object", cb, "function=") && (Validate.args2 as any)("params.name", params.name, "string");
		const saveAsPromiseResolver = (resolve, reject) => {

			// Commented out to make compiler happy, must be uncommented to work.
			// if (!params.force && this.workspaceExists(params.name)) {
			// 	reject(new Error("WorkspaceAlreadySaved"));
			// 	return cb(new Error("WorkspaceAlreadySaved"), null);

			// }
			this.routerClient.query("WorkspaceService.saveAs", params,
				(err, response) => {
					if (err) {
						Logger.system.error("APPLICATION LIFECYCLE:Workspace Save As:WorkspaceClient.saveAs", err);
						reject(new Error(err));
						return cb(new Error(err), null);
					}
					Logger.system.log(`APPLICATION LIFECYCLE:Workspace Saved As:WorkspaceClient.saveAs: Name:${params.name}`);
					resolve(response.data);
					cb(null, response.data);
				}
			);
		}
		return new Promise(saveAsPromiseResolver);
	}

	/**
	 * Switches to a workspace.
	 * @param {object} params
	 * @param {string} 	params.name Workspace Name
	 * @param {finsembleCallbackWithError} cb Callback after the switch is complete
	 */
	switchTo(params, cb = Function.prototype) {
		const switchToPromiseResolver = (resolve, reject) => {
			Logger.system.log("APPLICATION LIFECYLE:Loading Workspace:WorkspaceClient.switchTo:" + params.name);
			Validate.args(params, "object", cb, "function") && (Validate.args2 as any)("params.name", params.name, "string");
			// not the workspace will be undated in this client before the below query response is received (see 'Finsemble.orkspaceService.update' listener)
			this.routerClient.query("WorkspaceService.switchTo", params, (err, response) => {
				var res = null;
				if (err) {
					Logger.system.error("APPLICATION LIFECYLE:Loading Workspace:WorkspaceClient.switchTo:", err);
					reject(new Error(err));
					return cb(err);
				}
				Logger.system.log("APPLICATION LIFECYLE:Loading Workspace:WorkspaceClient.switchTo:success" + params.name);
				this.activeWorkspace = response.data;
				res = this.activeWorkspace;
				resolve(res);
				cb(null, res);
			});
		}

		return new Promise(switchToPromiseResolver);
	}

	_getWorkspaceName = function (workspaceName) {
		let workspaces = this.workspaces;
		let workspaceNames = workspaces.map((workspace) => workspace.name);
		let escapedName = escapeRegExp(workspaceName);
		//match "name" or "name (143)" or "name (2)"

		//Number of modifiers already on the name.
		let existingModifiers = workspaceName.match(/\(\d+\)/g);
		let numModifiers = existingModifiers === null ? "{1}" : `{${existingModifiers.length++}}`;
		let matchString = `\\b(${escapedName})(\\s\\(\\d+\\)${numModifiers})?\\,`;
		let regex = new RegExp(matchString, "g");
		let matches = workspaceNames.sort().join(",").match(regex);

		if (matches && matches.length) {
			let lastMatch = matches.pop();
			//Find the last modifier at the end (NUMBER), and get rid of parens.
			let highestModifier = lastMatch.match(/\(\d+\)\,/g);
			// console.log(existingModifiers ? existingModifiers.length : 0, modifier ? modifier.length : 0);
			//If we're trying to create something stupid like "workspace (1) (1)", and workspace (1) (1) already exists, they'll spit out workspace (1) (1) (2).
			if (existingModifiers && existingModifiers.length != highestModifier.length) {
				workspaceName = lastMatch.replace(",", "") + " (1)";
			} else {
				if (highestModifier && highestModifier.length) {
					highestModifier = highestModifier[highestModifier.length - 1];
					highestModifier = highestModifier.replace(/\D/g, "");
					highestModifier = parseInt(highestModifier);
					highestModifier++;
					workspaceName = lastMatch.replace(/\(\d+\)\,/g, `(${highestModifier})`);
				} else {
					highestModifier = 1;
					workspaceName += " (" + highestModifier + ")";
				}
			}
		}
		return workspaceName;
	}

	/**
	 * Creates a new workspace. After creation the new workspace becomes the active workspace.
	 * @param {String} workspaceName name for new workspace
	 * @param {Object} [params] optional params
	 * @param {string} [params.templateName] name of template to use when creating workspace; if no template then empty workspace will be created
	 * @param {boolean} [params.switchAfterCreation = true] Whether to switch to the new workspace after creating it.
	 * @param {finsembleCallbackWithError} cb Callback after the operation is complete
	 */
	createNewWorkspace = function (workspaceName, params, cb = Function.prototype) {
		const createNewWorkspacePromiseResolver = async (resolve, reject) => {
			if (arguments.length === 2) { // if no params then second argument must be the cb
				cb = params;
				params = {};
			}

			var templateName = null;
			if (params && params.templateName) {
				templateName = params.templateName;
			}
			Validate.args(workspaceName, "string", params, "object=", cb, "function=");

			Logger.system.log(`APPLICATION LIFECYCLE:Create New Workspace:Workspacelient.createNewWorkspace: Name (${workspaceName})`);

			//makse sure we don't duplicate an existing workspace.
			workspaceName = this._getWorkspaceName(workspaceName);

			//Default behavior is to switch after creating workspace.
			if (params.switchAfterCreation !== false) {
				Logger.system.log(`APPLICATION LIFECYCLE:Create New Workspace:Workspacelient.createNewWorkspace: Name (${workspaceName})`);
				await this.switchTo({ name: workspaceName, templateName });
			} else {
				this.routerClient.query("WorkspaceService.createNewWorkspace", params, (err, response) => {
					var res = null;
					if (err) {
						Logger.system.error("APPLICATION LIFECYLE:Loading Workspace:WorkspaceClient.createNewWorkspace:", err);
						reject(new Error(err));
						return cb(err);
					}
					Logger.system.log("APPLICATION LIFECYLE:Loading Workspace:WorkspaceClient.createNewWorkspace:success" + params.name);
					this.activeWorkspace = response.data;
					res = this.activeWorkspace;
					resolve(res);
					cb(null, res);
				});
			}
		}

		return new Promise(createNewWorkspacePromiseResolver);
	}

	/////////////////////////////////////////////////////////////////////////////
	// Workspace Client: Internal Member functions
	/////////////////////////////////////////////////////////////////////////////
	/**
	 * Adds window to active workspace.
	 * @private
	 * @param {object} params
	 * @param {string} params.windowIdentifier window identifier of window being added
	 * @param {WindowDescriptor} params.options the window descriptor for later spawning corresponding component (when workspace is reloaded)
	 * @param {string} params.componentState the coomponent state for spawning corresponding component when workspace is reloaded
	 * @param {finsembleCallbackWithError} cb Callback after window has been added
	 */
	addWindow(params, cb = Function.prototype) {
	}


	/**
	 * Removes window from active workspace.
	 * @NOTE: need to clarify usage and/or make more consistent.  Currently only invoked for non-OF windows, but ideally will handle same way for all windows.
	 * @param {object} params
	 * @param {string} params.name Window name
	 * @param {finsembleCallbackWithError} cb Callback after the window has been removed from the active workspace
	 */
	removeWindow(params, cb = Function.prototype) {
	}

	/////////////////////////////////////////////////////////////////////////////
	// Workspace Client: Window and Component Save-State Member functions
	/////////////////////////////////////////////////////////////////////////////

	/**
	 * Save window options
	 *
	 * @NOTE: Ideally the type of windowState would match the type of spawn's "params" argument.
	 *
	 * @param {object} params
	 * @param {string} params.windowIdentifier the associated window for the component data
 	 * @param {WindowDescriptor} params.options the window descriptor to save in workspace for later spawning corresponding component (when workspace is reloaded)
	 * @param {boolean} params.merge if true then merge the specified options as opposed to overwriting previous
	 * @param {finsembleCallbackWithError} cb Callback after data saved
	 */
	saveWindowOptions(params, callback) {
	};

	/**
	 * Save compponent state
	 *
	 * @param {object} params
	 * @param {string} params.windowIdentifier the associated window for the component data
 	 * @param {string} params.componentState the coomponent state to store in workspace for spawning corresponding component when workspace is reloaded
	 * @param {boolean} params.merge if true then merge the specified options as opposed to overwriting previous
	 * @param {finsembleCallbackWithError} cb Callback after data saved
	 */
	saveComponentState(params, callback) {
	};

	/////////////////////////////////////////////////////////////////////////////
	// Workspace Client: Importing and Exporting
	/////////////////////////////////////////////////////////////////////////////

	/**
	 * Gets a workspace definition in JSON form.
	 *
	 * @param {object} params
	 * @param {string} params.workspaceName the workspace name
	 * @param {function} callback callback(error,workspaceDefinition)
	 */
	export(params, callback = Function.prototype) {
		const exportPromiseResolver = (resolve, reject) => {

		}
		return new Promise(exportPromiseResolver);
	}
	getWorkspaceDefinition = this.export; //Backward compatibility

	/**
	 * Adds a workspace definition to the list of available workspaces.
	 *
	 * @param {object} params
	 * @param {object} params.workspaceJSONDefinition JSON for workspace definition
	 * @param {function=} callback callback(err) where the operation was successful if !err; otherwise, err carries diagnostics
	 *
	 */
	import(params, callback) {
		const exportPromiseResolver = (resolve, reject) => {

		}
		return new Promise(exportPromiseResolver);
	}
	addWorkspaceDefinition = this.import;

	/////////////////////////////////////////////////////////////////////////////
	// Workspace Client: Template-Related Member functions
	//
	// NOTE: we tetatively decided to pull out template functionality, but parts are used in presentation components.
	//		So can leave in or investigate what it takes to strip out.
	//
	/////////////////////////////////////////////////////////////////////////////

	/**
	 * Convert a workspace JSON definition to a template JSON definition
	 * @param {object} params
 	 * @param {string} params.newTemplateName template name for the new converted definition
	 * @param {object} params.workspaceDefinition a workspace JSON definition return from getWorkspaceDefinition()
	 * @returns the new template definition. If null then an error occurred because workspaceDefinition wasn't a legal JSON definition for a workspace
	 */
	// Keep for backward compatibility
	convertWorkspaceDefinitionToTemplate = function (params) {
		const exportPromiseResolver = (resolve, reject) => {

		}
		return new Promise(exportPromiseResolver);
	}

	/**
	 * Get a template definition in JSON format.
	 *
	 * @param {object} params
	 * @param {string} params.templateName name of template
	 * @param {function} callback
	 * @private
	 */
	exportTemplate(params, callback) {
		const exportPromiseResolver = (resolve, reject) => {

		}
		return new Promise(exportPromiseResolver);
	}

	/**
	 * Adds a template definition.  This adds to the template choices available when creating a new workspace.  The definition will persistent until removed with removeWorkspaceTemplateDefinition().
	 *
	 * @param {object} params
	 * @param {object} params.workspaceTemplateDefinition JSON template definition typically from getWorkspaceTemplateDefinition() or convertWorkspaceDefinitionToTemplate()
	 * @param {boolean} params.force if true an existing template with the same name will be overwritten
	 * @param {function} callback
	 * @private
	 */
	importTemplate = function (params, callback) {
		const exportPromiseResolver = (resolve, reject) => {

		}
		return new Promise(exportPromiseResolver);
	}
	addWorkspaceTemplateDefinition = this.importTemplate //backward compatibility

	/**
	 * Removes template definition (keep in mind if the template is defined in config then it will automatically be recreated on each startup)
	 *
	 * @param {object} params
	 * @param {string} params.workspaceTemplateName
	 * @param {function} [callback] callback(err) is invoked on completion. If !err then the operation was successful; otherwise, err carries diagnostics
	 * @private
	 */
	deleteTemplate(params, callback) {
		const exportPromiseResolver = (resolve, reject) => {

		}
		return new Promise(exportPromiseResolver);
	}

	/**
	 * Saves one mor more template defintions in a selected file. Note the end user is prompted to identify file location during this save operation.  The file can optionally be imported during config initialization (see importConfig) although this requires administration support on the configuration/server side. The file can also be read using readWorkspaceTemplateFromConfigFile();
	 *
	 * @param {object} params
	 * @param {object} params.workspaceTemplateDefinition legal template definition returned by either getWorkspaceTemplateDefinition() or convertWorkspaceDefinitionToTemplate()
	 * @private
	 */
	// Keep for backward compatibility. Otherwise no need for this function.
	saveWorkspaceTemplateToConfigFile(params) {
		const exportPromiseResolver = (resolve, reject) => {

		}
		return new Promise(exportPromiseResolver);
	}

	/**
	 * Gets all workspace template definitions from workspace service.
	 *
	 * @param {function} callback callback(templateDefinitions) where templateDefinitions is an object containing all known template definitions; each property in templateDefinitions is a template
     * @private
 	 */
	getTemplates = function (callback) {
		const exportPromiseResolver = (resolve, reject) => {

		}
		return new Promise(exportPromiseResolver);
	}

	start(cb = Function.prototype) {
		/**
		 * Initializes the workspace's state.
		 */
		const startPromiseResolver = (resolve, reject) => {
			this.routerClient.subscribe("Finsemble.WorkspaceService.update", async (err, response) => {
				Logger.system.debug("workspaceClient init subscribe response", err, response);
				if (response.data && response.data.activeWorkspace) {
					// Commented out to make compiler happy, must be uncommented to work.
					// this.workspaceIsDirty = response.data.activeWorkspace.isDirty;
					this.workspaces = response.data.workspaces;
					this.activeWorkspace = response.data.activeWorkspace;
				} else {
					this.activeWorkspace = await this.getActiveWorkspace();
					this.workspaces = await this.getWorkspaces();
				}
				resolve();
				cb();
			});
		}

		return new Promise(startPromiseResolver);
	}

}

const workspaceClient = new WorkspaceClient({
	name: "workspaceClient",
	onReady: (cb) => { workspaceClient.start(cb); },
	startupDependencies: {
		services: ["workspaceService"],
		clients: []
	}
});

module.exports = workspaceClient;

// Type Definitions

/**
 * @typedef WorkspaceDescriptor
 * @type {Object}
 * @property {string} name
 * @property {boolean} isDirty
 * @property {object} groups
 * @property {array} windows list of window names contained within the workspace
*/

/**
 * @typedef WindowDescriptor
 * @type {Object}
*/

/**
 * Callback with error string.
 *
 * @callback finsembleCallbackWithError
 * @param {string} err null if no error; otherwise contains error description
 */

/**
 * Callback with error or data.
 *
 * @callback finsembleCallbackWithErrorOrData
 * @param {string} err null if no error; otherwise contains error description
 * @param {object} [data] contains requested data (if no error)
 */

/**
* Definition of ActiveWorkspaceState notifications with example pubsub subscription.
* Published each time the active workspace state changes (e.g. on initial load or while switching workspaces)
*
* @typedef ActiveWorkspaceStateNotification
* @type {Object}
* @property {ActiveWorkspaceState} currentState
* @property {WorkspaceDescriptor} activeWorkspaceDescriptor
* @example <caption>Sample subscription to receive ActiveWorkspaceState notifications.</caption>
*
* FSBL.Clients.WorkspaceClient.RouterClient.subscribe("Finsemble.Workspace.ActiveWorkspaceState", (err, activeWorkspaceStateNotification) => {});
*/

/**
 * Definition of ActiveWorkspaceDescriptor notifications with example pubsub subscription.
 * Published each time the contents of the active workspace descriptor changes while the active workspace is ready.
 *
 * @typedef ActiveWorkspaceDescriptorNotification
 * @property {ActiveWorkspaceDescriptorPublishReason} reason
 * @property {WorkspaceDescriptor} activeWorkspaceDescriptor
 * @example <caption>Sample subscription to receive ActiveWorkspaceDescriptorChange notifications.</caption>
 *
 * FSBL.Clients.WorkspaceClient.RouterClient.subscribe("Finsemble.Workspace.ActiveWorkspaceDescriptor", (err, activeWorkspaceDescriptorChangeNotification) => {});
 */

/**
 * Definition of WorkspaceList notifications with example pubsub subscription.
 * Published each time the list of workspace descriptors changes (e.g. new workspace descriptor is added or removed)
 *
 * @typedef WorkspaceListNotification
 * @property {WorkspaceListPublishReason} reason
 * @property {WorkspaceDescriptor} changedDescriptor
 * @property {WorkspaceDescriptor[]} windowList
 * @example <caption>Sample subscription to receive WorkspaceList notifications.</caption>
 *
 * FSBL.Clients.WorkspaceClient.RouterClient.subscribe("Finsemble.Workspace.WorkspaceList", (err, workspaceListChangeNotification) => {});
 */