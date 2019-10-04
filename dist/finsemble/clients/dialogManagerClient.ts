/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
"use strict";
import { series as asyncSeries } from "async";
import LauncherClient from "./launcherClient";
import WindowClient from "./windowClient";
import StoreClient from "./distributedStoreClient";
import * as Utils from "../common/util";
import Validate from "../common/validate";
import { _BaseClient } from "./baseClient";
import { FinsembleWindow } from "../common/window/FinsembleWindow";
import Logger from "./logger";
import { System } from "../common/system";
import { SpawnParams } from "../services/window/Launcher/launcher";
import { getUniqueName } from "../common/disentangledUtils";
WindowClient.initialize();
LauncherClient.initialize();
StoreClient.initialize();

/**
 *
 * @introduction
 * <h2>Dialog Manager Client</h2>
 *
 * The Dialog Manager Client simplifies interacting with dialog windows by spawning them and getting data back from them.
 * In this context, a dialog window is simply a child window spawned to interact with the user, such as a confirmation dialog.
 * Functions are provided here for both the parent-window side and the dialog/child-window side.
 *
 *`FSBL.Clients.DialogManager` is always pre-initialized with one instance of the Dialog Manager in the Finsemble Library (making it essentially, a singleton when referenced in the same window). This means component developers directly access the Dialog Manager without using the constructor (e.g., `FSBL.Clients.DialogManager.spawnDialog(...);`). **The constructor is not exposed to components.**
 *
 * @param {object=} params optional parameters
 * @param {function=} params.onReady callback function indicating when client is ready
 * @param {string=} params.name client name for diagnostics/logging
 * @constructor
 * @hideconstructor
 */
class DialogManagerClient extends _BaseClient {
	/** Deprecated var.
	 * @TODO - Remove this.
	 */
	userInputTimeout;
	constructor(params) {
		super(params);
		//Methods were formally an arrow function. If we want our documentation build to read nested parameters, we need to use this instead of an arrow.
		this.spawnDialog = this.spawnDialog.bind(this);
	}
	/////////////////////////////////////////////
	// Public Functions -- Dialog Parent Side
	/////////////////////////////////////////////

	/**
	 * Spawns a Dialog window.
	 *
	 * parameters pass here in `inputParams` can be retrieved in the dialog window by calling [getParametersFromInDialog]{@link DialogManagerClient#getParametersFromInDialog}.
	 *
	 * @param {object} params Parameters. Same as {@link LauncherClient#spawn} with the following exceptions.
	 * @param {string} params.url URL of dialog to launch
	 * @param {string} [params.name] - The name of the dialog
	 * @param {number|string} params.x - Same as {@link LauncherClient#spawn} except defaults to "center".
	 * @param {number | string} [params.y="center"] - Same as {@link LauncherClient#spawn} except defaults to "center".
	 * @param {object} inputParams Object or any data type needed by your dialog.
	 * @param {function} dialogResponseCallback called when response received back from dialog window (typically on dialog completion). `responseParameters` is defined by the dialog.
	 * @param {function} cb Returns response from {@link LauncherClient#spawn}
	 *
	 * @example
	 * FSBL.Clients.DialogManager.spawnDialog(
	 * 	{
	 * 		name: "dialogTemplate",
	 * 		height:300,
	 * 		width:400,
	 * 		url:"http://localhost/components/system/dialogs/dialog1.html"
	 * 	},
	 * 	{
	 * 		someData: 12345
	 * 	},
	 * 		(error, responseParameters) => {
	 *			if (!error) {
	 * 				console.log(">>>> spawnDialog response: " + JSON.stringify(responseParameters));
	 *			}
	 * 	});
	 * @todo allow dialogs to be permanent components instead of ad-hoc.
	 * @todo support paramter to make the dialog modal
	 */

	spawnDialog(params: SpawnParams, inputParams, dialogResponseCallback, cb?: StandardCallback) {
		Validate.args(params, "object", inputParams, "object", dialogResponseCallback, "function");
		let responseChannel = getUniqueName("DialogChannel");

		params.data = { inputParams, responseChannel: responseChannel };

		// Dialogs default to center
		if (!params.left && params.left !== 0 && !params.right && params.right !== 0) {
			params.left = "center";
		}
		if (!params.top && params.top !== 0 && !params.bottom && params.bottom !== 0) {
			params.top = "center";
		}
		this.routerClient.addListener(responseChannel, (err, response) => {
			dialogResponseCallback(err, response.data);
			this.routerClient.removeListener(responseChannel, cb);
		});
		LauncherClient.spawn("dialogTemplate", params, (err, response) => {
			if (err) {
				Logger.system.error("ERROR", err);
				dialogResponseCallback(err, response);
			}
			if (cb) { cb(err, response); }
		});
	};

	/////////////////////////////////////////////
	// Public Functions -- Dialog Client Side
	/////////////////////////////////////////////

	/**
	 * Called within dialog window to get the parameters passed in spawnDialog's "inputParams"
	 *
	 * @return {object} inputParams parameters pass to dialog
	 * @example
	 * var dialogData = FSBL.Clients.DialogManager.getParametersFromInDialog();
	 */
	getParametersFromInDialog = () => {
		var inputParams = WindowClient.getSpawnData().inputParams;
		Logger.system.debug("DialogManagerClient:getParametersFromInDialog: " + JSON.stringify(inputParams));
		return inputParams;
	};

	/**
	 * Called within dialog window to pass back dialog response and terminal window. This results in the [spawnDialog]{@link DialogManagerClient#spawnDialog} callback function (i.e. `dialogResponseCallback`) being invoked with `responseParameters` passed in.
	 *
	 * @param {object} responseParameters parameters returned to parent (i.e. window that spawned the dialog)
	 *
	 * @example
	 * FSBL.Clients.DialogManager.respondAndExitFromInDialog({ choice: response });
	 */
	respondAndExitFromInDialog = (responseParameters: any) => {
		Validate.args(responseParameters, "any");
		Logger.system.debug("DialogManagerClient:respondAndExitFromInDialog: " + JSON.stringify(responseParameters));
		var responseChannel = WindowClient.getSpawnData().responseChannel;
		this.routerClient.transmit(responseChannel, responseParameters);
		// FSBL.Clients.WindowClient.close();
	};
	/**
	 * @private
	 * @param {string} type
	 * @param {function} cb
	 */
	getAvailableDialog = (type, cb) => {
		this.DialogStore.getValue("dialogs.available", (err, availableDialogs) => {
			for (let dialogName in availableDialogs) {
				let dialog = availableDialogs[dialogName];
				if (dialog.componentType === type) {
					return cb(dialog);
				}
			}
			cb(null);
		});
	};

	/**
	 * Generates a string for the "onReady" for a given channel.
	 * @private
	 * @param {object} identifier
	 */
	generateDialogReadyChannel = (identifier) => {
		let concat = identifier.windowName + identifier.uuid;
		return `Dialog.${concat}.ready`;
	};
	/**
	 * Broadcasts a message to the window that opened the dialog saying "I'm ready, please show me."
	 */
	showDialog = () => {
		let listenerChannel = this.generateDialogReadyChannel(LauncherClient.myWindowIdentifier);
		//tells the dialog manager in the opening window that the dialog is ready to be shown.
		this.routerClient.transmit(listenerChannel, {
			userInputTimeout: typeof this.userInputTimeout === "undefined" ? 10000 : this.userInputTimeout
		});
	};
	/**
	 * Function to initialize and open a dialog.
	 * @param {object} identifier window identifier of the dialog.
	 * @param {object} options Any data to send to the dialog for its initialization
	 * @param {function} onUserInput callback to be invoked after the user interacts with the dialog.
	 */
	sendQueryToDialog = (identifier: WindowIdentifier, options: any, onUserInput) => {
		function warn(timeout) {
			console.warn(`No response from dialog ${identifier.windowName} after ${timeout / 1000} seconds. Check to make sure your dialog is sending back data.`);
		}

		this.moveDialogFromAvailableToOpened(identifier);
		let concat = identifier.windowName + identifier.uuid;
		let queryChannel = `Dialog.${concat}.Show`;
		let listenerChannel = this.generateDialogReadyChannel(identifier);
		let warning;
		const onDialogReady = (err, response) => {
			warning = setTimeout(warn.bind(null, response.data.userInputTimeout), response.data.userInputTimeout);
			Logger.perf.info("DialogManagerClient:sendQueryToDialog:Dialog: ShowWindow Start");
			LauncherClient.showWindow(identifier, {
				monitor: options.monitor || "mine",
				left: "center",
				top: "center"
			}, (err, response) => {
				FinsembleWindow.getInstance({ name: response.finWindow.name }, (err, wrap) => {
					wrap.bringToFront();
					wrap.focus();
				});
				Logger.perf.info("DialogManagerClient:sendQueryToDialog:ShowWindow finish");
			});
			this.routerClient.removeListener(listenerChannel, onDialogReady);
		}
		this.routerClient.addListener(listenerChannel, onDialogReady);
		Logger.perf.info("DialogManagerClient:sendQueryToDialog ShowWindow Query begin.");
		this.routerClient.query(queryChannel, options, (err, response) => {
			clearTimeout(warning);
			this.moveDialogFromOpenedToAvailable(identifier);
			onUserInput(err, response.data);
		});
	};
	/**
	 * State management - just moves an opened dialog back to the "available" pool.
	 * @private
	 * @param {object} identifier window identifier of the dialog.
	 */
	moveDialogFromOpenedToAvailable = (identifier: WindowIdentifier) => {
		this.DialogStore.getValue("dialogs", (err, dialogs) => {
			let openedDialogs = dialogs.opened;
			let availableDialogs = dialogs.available;

			delete openedDialogs[identifier.windowName];
			availableDialogs[identifier.windowName] = identifier;

			this.DialogStore.setValue({ field: "dialogs.opened", value: openedDialogs });
			this.DialogStore.setValue({ field: "dialogs.available", value: availableDialogs });
		});
	};
	/**
	 * State management - just moves an available dialog out of the "available" pool.
	 * @private
	 * @param {object} identifier window identifier of the dialog.
	 */
	moveDialogFromAvailableToOpened = (identifier: WindowIdentifier) => {
		this.DialogStore.getValue("dialogs", (err, dialogs) => {
			let availableDialogs = dialogs.available;
			let openedDialogs = dialogs.opened;

			//@todo, what about when the dialog isn't available...
			delete availableDialogs[identifier.windowName];
			openedDialogs[identifier.windowName] = identifier;

			this.DialogStore.setValue({ field: "dialogs.available", value: availableDialogs });
			this.DialogStore.setValue({ field: "dialogs.opened", value: openedDialogs });
		});
	};

	/**
	 * Registers a window as a modal with the global dialog management store.
	 */
	registerModal = () => {
		System.getMonitorInfo((info) => {
			let bounds = info.virtualScreen;
			//let { top, left, right, bottom } = info.virtualScreen;
			bounds.width = bounds.right - bounds.left;
			bounds.height = bounds.bottom - bounds.top;
			this.finsembleWindow.setBounds({ bounds });
		});
		this.DialogStore.setValue({ field: "modalIdentifier", value: LauncherClient.myWindowIdentifier });
	};


	/**
	 * Shows a semi-transparent black modal behind the dialog.
	 * @param {function} cb
	 */
	showModal = (cb?: Function) => {
		this.DialogStore.getValue("modalIdentifier", async (err, identifier) => {
			// If null is passed back, this likely means the window is not ready yet.
			// We only need to proceed if the window exists and identifier is not null
			if (identifier === undefined || identifier === null) {
				return;
			}

			let { wrap: modal } = await FinsembleWindow.getInstance({ uuid: identifier.uuid, name: identifier.windowName });
			modal.updateOptions({
				options: {
					opacity: 0.4
				}
			}, () => {
				modal.show(() => {
					modal.bringToFront(() => {
						this.finsembleWindow.focus(() => {
							this.finsembleWindow.bringToFront();
							if (cb && typeof cb === "function") {
								cb();
							}
						});
					});
				});
			});
		});
	};

	/**
	 * Retrieves an available dialog. If none are found, one will be created with the options passed.
	 * @param {string} type component type
	 * @param {object} options options to pass into the opened window.
	 * @param {function} onUserInput Callback to be invoked when the user interacts with the dialog.
	 */
	open = (type: string, options: any, onUserInput: Function) => {
		//show, spawn if there are no available dialogs of that type..
		this.getAvailableDialog(type, (dialogIdentifier) => {
			if (dialogIdentifier) {
				//send open message
				this.sendQueryToDialog(dialogIdentifier, options, onUserInput);
			} else {
				//spawn, then send open message.
				LauncherClient.spawn(type, {
					options: {
						customData: {
							"foreign": {
								"clients": {
									"dialogManager": {
										"isDialog": true
									}
								}
							}
						}
					}
				}, (err, response) => {
					this.open(type, options, onUserInput);
				});
			}
		});
	};

	DialogStore = null;
	isDialog = false;
	isModal = false;
	//used by dialogs, set in `registerWithStore`.
	RESPONDER_CHANNEL = null;
	openerMessage = null;
	/**
	 * Used by the window that is opening a dialog. This method sets up a query/responder that the opened dialog will invoke when the user has interacted with the dialog.
	 * @param {function} callback
	 */
	registerDialogCallback = (callback) => {
		this.routerClient.addResponder(this.RESPONDER_CHANNEL, (err, message) => {
			this.openerMessage = message;
			callback(err, message);
		});
	};

	/**
	 * Hides the modal.
	 */
	hideModal = () => {
		this.DialogStore.getValue("modalIdentifier", async (err, identifier) => {
			// If null is passed back, this likely means the window is not ready yet.
			// We only need to proceed if the window exists and identifier is not null
			if (identifier === undefined || identifier === null) {
				return;
			}
			let { wrap: modal } = await FinsembleWindow.getInstance({ uuid: identifier.uuid, name: identifier.windowName });
			modal.hide();
		});
	};

	/**
	 * Sends data back to the window that opened the dialog.
	 * @param {any} data
	 */
	respondToOpener = (data: any) => {
		Logger.system.info("DialogManagerClient:RespondToOpener:", data);
		this.openerMessage.sendQueryResponse(null, data);
		if (data.hideModalOnClose !== false) {
			this.hideModal();
		}
		this.finsembleWindow.hide();
		this.openerMessage = null;
	};

	/**
	 * Registers the window as a dialog with the global store. If the component is incapable of being used as a dialog (this is set in the component's config), the callback is immediately invoked.
	 * @param {function} callback
	 */
	registerWithStore = (callback: Function) => {
		if (this.isDialog) {
			let identifier = LauncherClient.myWindowIdentifier;
			this.RESPONDER_CHANNEL = `Dialog.${identifier.windowName + identifier.uuid}.Show`;
			this.DialogStore.setValue({ field: `dialogs.available.${identifier.windowName}`, value: identifier }, callback);
		} else {
			callback();
		}
	};

	/**
	 * Checks to see whether the window is a dialog.
	 * @param {cb} cb
	 */
	checkIfWindowIsDialog = (cb?: Function) => {
		let err = null;
		try {
			this.isDialog = WindowClient.options.customData.foreign.clients.dialogManager.isDialog;
		} catch (e) {
			err = e;
		}
		if (cb) {
			cb(err);
		}
	};

	/**
	 * Creates the global store if it doesn't exist.
	 * @private
	 * @param {function} callback
	 */
	createStore = (callback: Function) => {
		let defaults = {
			dialogs: {
				opened: {},
				available: {}
			}
		};
		StoreClient.createStore({ store: "DialogStore", values: defaults, global: true }, (err, store) => {
			this.DialogStore = store;
			callback();
		});
	};

	/**
	 * @private
	 * @memberof DialogManagerClient
	 */
	getFinsembleWindow = (cb: Function) => {
		FinsembleWindow.getInstance({ name: this.finWindow.name, uuid: this.finWindow.uuid }, (err, response) => {
			this.finsembleWindow = response;
			cb();
		});
	};
};

// instance of dialogManagerClient that is exported by this module
var dialogManagerClient = new DialogManagerClient({
	startupDependencies: {
		services: ["startupLauncherService"],
		clients: ["distributedStoreClient", "windowClient"]
	},
	onReady: function (cb) {
		dialogManagerClient.checkIfWindowIsDialog(),
			asyncSeries([
				dialogManagerClient.createStore.bind(dialogManagerClient),
				dialogManagerClient.registerWithStore.bind(dialogManagerClient),
				dialogManagerClient.getFinsembleWindow.bind(dialogManagerClient),
				(done) => { LauncherClient.onReady(done); },
				(done) => { WindowClient.onReady(done); },
			], cb);
	},
	//This name doesn't have Client in it because it isn't referenced as dialogmanagerClient....
	name: "dialogManager"
});

export default dialogManagerClient;
