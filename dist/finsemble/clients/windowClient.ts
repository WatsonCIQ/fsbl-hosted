/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
import StorageClient from "./storageClient";
import WorkspaceClient from "./workspaceClient";
import HotkeyClient from "./hotkeysClient";
import * as util from "../common/util";
import { System } from "../common/system";
import { _BaseClient as BaseClient } from "./baseClient";
import Logger from "./logger";
import Validate from "../common/validate"; // Finsemble args validator
import { FinsembleWindow } from "../common/window/FinsembleWindow";
import { ConfigUtilInstance as configUtil } from "../common/configUtil";
import deepEqual = require("lodash.isequal");
import { parallel as asyncParallel } from "async";
import RouterClient from "./routerClientInstance";

const lodashGet = require('lodash.get');

// DH 3/6/2019 - @TODO - All uses of this should be replaced with calls to the WindowStorageManager
import { WORKSPACE, DELIVERY_MECHANISM } from "../common/constants";
import configClient from "./configClient";

type InjectHeaderParams = {
	component?: string,
	bumpElements?: {
		fixed?: boolean | "all" | "0Positioned",
		absolute?: boolean | "all" | "0Positioned",
		bumpBy?: string
	},
	bodyMarginTop?: string,
	forceHeaderHeight: boolean
};
type getStackedWindowParams = {
	create?: boolean,
	windowIdentifiers?: WindowIdentifier[]
};

type GroupData = {
	windowNames: string[];
	isMovable: boolean;
	isAlwaysOnTop: boolean;
	topRightWindow: string;
	isARectangle: boolean;
};

type GroupUpdate = {
	data: {
		groupData: { [k: string]: GroupData }
	}
};

var finsembleWindow;
/**
 *
 * Helper to see if element has a class.
 * @param {HTMLElement} el
 * @param {String} className
 * @private
 * @return {HTMLElement}
 */
function hasClass(el, className) {
	if (el.classList) {
		return el.classList.contains(className);
	}
	return !!el.className.match(new RegExp("(\\s|^)" + className + "(\\s|$)"));

}

/**
 * Adds a class to an HTML element
 * @param {HTMLElement} el
 * @param {String} className
 * @private
 */
function addClass(el, className) {
	if (el.classList) {
		el.classList.add(className);
	} else if (!hasClass(el, className)) {
		el.className += " " + className;
	}
}

/**
 *
 * Removes class from HTML element
 * @param {HTMLElement} el
 * @param {String} className
 * @private
 */
function removeClass(el, className) {
	if (el.classList) {
		el.classList.remove(className);
	} else if (hasClass(el, className)) {
		var reg = new RegExp("(\\s|^)" + className + "(\\s|$)");
		el.className = el.className.replace(reg, " ");
	}
}

/**
 *
 *@introduction
  <h2>Window Client</h2>
  ----------
 * The Window Client is primarily responsible for managing the `windowState` (the window's bounds) and `componentState` (data inside of your component).
 * It also injects the **window title bar** control, which contains controls for minimizing, maximizing, closing, and restoring your window.
 * The reference below is provided in case you'd like to manually trigger events.
 *
 * This is the Window Client API reference.
 * If you're looking for information about the window title bar, please see the [Presentation Component tutorial](tutorial-PresentationComponents.html#window-title-bar) for more information.
 *
 * @hideconstructor
 * @param {object} params
 * @constructor
 * @returns {WindowClient}
 */
class WindowClient extends BaseClient {
	options: { customData?: any; defaultTop?: any; defaultLeft?: any; width?: any; };
	windowHash: string;
	title: any;
	windowGroups: GroupData[];
	toolbarBottom: number;
	containers: any[];
	componentState: { [x: string]: any; };
	windowState: string;
	hasHeader: boolean;
	enableWindowsAeroSnap: boolean;
	minimizeWithDockedWindows: (cb: any) => void;
	isInAService: boolean;
	startedRegistrationWithDocking: boolean;
	deregisterPlease: boolean;
	commandChannel: (arg0: any, arg1: any) => void;



	constructor(params) {
		/** @alias WindowClient# */
		super(params);

		Validate.args(params, "object=") && params && (Validate as any).args2("params.onReady", params.onReady, "function=");

		//We store the options that the window is created with in this property.
		/**
		* A copy of the `finWindow`'s options value. This is where we store information like monitorDimensions, initialization information, and any other data that needs to be passed from the parent application into the created window.
		* @type object
		*/
		this.options = {};
		//The hash we use to save data with.
		this.windowHash = "";
		//Window's title.
		this.title = null;
		//This is the bottom edge of the toolbar. The window's position will be offset by this much.
		//@todo move this value to a config.
		this.toolbarBottom = 40;
		//default value. The window assigns the containers it cares about before starting.
		this.containers = [];
		//window state for restoration purposes.
		this.componentState = {};
		//This can be either normal, minimized, or maximized.
		this.windowState = "normal";
		// This gets set to true if the window has a header
		this.hasHeader = false;
		//If true, will send router messages to have docking respond to windows aero snap. Otherwise, will restore from those events when they happen
		this.enableWindowsAeroSnap = false;

		this.bindFunctions();

		/**
		 * Minimizes window along with all windows docked to it.
		 * @param {function} cb Optional callback
		 * @example
		 * FSBL.Clients.WindowClient.minimizeWithDockedWindows();
		 * @private
		 */
		this.minimizeWithDockedWindows = this.minimize;
	}

	/**
	 * @private
	 */
	bindFunctions() {
		this.onWindowRestored = this.onWindowRestored.bind(this);
		this.onWindowMaximized = this.onWindowMaximized.bind(this);
		this.onWindowBlurred = this.onWindowBlurred.bind(this);
		this.onWindowFocused = this.onWindowFocused.bind(this);
		this.onParentSet = this.onParentSet.bind(this);
		this.onMinimizedRestored = this.onMinimizedRestored.bind(this);
		this.onWindowMinimized = this.onWindowMinimized.bind(this);
		this.close = this.close.bind(this);
		this.getInitialOptions = this.getInitialOptions.bind(this);
		this.cacheInitialBounds = this.cacheInitialBounds.bind(this);
	}

	/**
	 * This function is fired every time the window's bounds change. It saves the window's position.
	 * @param {object} bounds
	 * @private
	 */
	onWindowRestored() {
		this.updateHeaderState("Maximize", { hide: false });
	}

	/**
	 * @private
	 */
	onWindowMaximized() {
		this.updateHeaderState("Maximize", { hide: true });
	}

	/**
	 * @private
	 */
	onWindowBlurred() {
		if (this.hasHeader) {
			this.setActive(false);
		}
	}

	/**
	 * @private
	 */
	onWindowFocused() {
		if (this.hasHeader) {
			this.setActive(true);
		}
	}

	/**
	 * @private
	 */
	onMinimizedRestored() {
		this.routerClient.transmit("DockingService.windowRestored", finsembleWindow.name);
		finsembleWindow.removeEventListener("restored", this.onMinimizedRestored);
	}

	/**
	 * @private
	 */
	onWindowMinimized() {
		this.routerClient.query("DockingService.windowMinimized", { windowName: finsembleWindow.name });
		finsembleWindow.addEventListener("restored", this.onMinimizedRestored);
	}

	/**
	 * Handles the event that fires when the finsemble window's parent is set.
	 * @private
	 * @param evt the event itself, which is ignored.  Any time a parent is set, force a group data update.
	 */
	private onParentSet(evt) {
		this.requestGroupDataPublish();
	}

	/**
	 * Returns a list of the groups this window is in, if any.
	 */
	getWindowGroups() {
		return this.windowGroups;
	}

	/**
	 * Handler for group updates from the window service.  Stores the groups that this window is in,
	 * if any.
	 * @private
	 * @param err the error, if any
	 * @param res the received updated group data
	 */
	private groupUpdateHandler(err, res: GroupUpdate) {
		if (err) {
			FSBL.Clients.Logger.error(err);
			return;
		}
		this.windowGroups = Object.values(res.data.groupData).
			filter(group => group.windowNames.includes(this.getWindowNameForDocking()));
	};

	/**
	 * Requests an updated group data message.
	 * @private
	 */
	private requestGroupDataPublish() {
		this.routerClient.transmit("DockingService.requestGroupDataPublish");
	}

	/**
	 * Closes Window.
	 * @param {object} params
	 * @param {boolean} params.removeFromWorkspace Whether to remove the window from the workspace.
	 * @param {boolean} params.closeWindow Whether to close the window. On shutdown this method is closed, but we let the launcher close the window.
	 * Defaults are to remove the window from the workspace if the user presses the X button, but not if the window is closed via an app-level request (e.g., we need to switch workspaces, so all windows need to close).
	 * @param {function} cb callback
	 * @example
	 * //Close window and remove from workspace (e.g., user closes the window).
	 * FSBL.Clients.WindowClient.close(true);
	 * //Close window and keep in workspace (e.g., application requests that all windows close themselves).
	 * FSBL.Clients.WindowClient.close(false);
	 */
	close(params, cb: StandardCallback = () => { }) {
		if (!params) { params = { removeFromWorkspace: true, closeWindow: true }; }
		let parentWindow = finsembleWindow.parentWindow;
		if (params.userInitiated && parentWindow) {
			return parentWindow.close(params, cb);
		} else {
			finsembleWindow.close(params, cb);
		}
	}

	/**
	 * @private
	 * @returns {windowHash}
	 */
	getWindowHash() {
		return this.windowHash;
	}

	/**
	 * Retrieves the window's title.
	 * @returns {String} title
	 * @example
	 * var windowTitle = FSBL.Clients.WindowClient.getWindowTitle();
	 */
	getWindowTitle() {
		return this.title;
	}

	/**
	 * This function retrieves the dimensions of the monitor that the window is on. It's currently used in the {@link launcherClient}.
	 * @param {function} callback
	 * @private
	 * @todo  this is bad. The monitor can change if the window is moved. Use util monitor functions instead. Instead, use the util style getMyMonitor, and keep monitor dimensions up to date statically at FSBL level with a listener on launcher (unclaimedRect).
	 */
	retrieveMonitorDimensions(callback = Function.prototype) {
		util.getMonitor(null, function (monitorInfo) {
			finsembleWindow.updateOptions({ options: { monitorDimensions: monitorInfo.monitorRect } });
			if (callback) { callback(monitorInfo.monitorRect); }
		});
	}

	/**
	 * Listens for changes in the hash and persists the change to the url property, and then saves it.
	 * @private
	 */
	listenForHashChanges() {
		//get url on page load.
		finsembleWindow.updateOptions({ url: window.top.location.href }, () => {
		});

		var self = this;

		//There's no pushState event in the browser. This is a monkey patched solution that allows us to catch hash changes. onhashchange doesn't fire when a site is loaded with a hash (e.g., salesforce).
		(function (history: any) {
			var pushState = history.pushState;
			history.pushState = function (state) {
				if (typeof history.onpushstate === "function") {
					history.onpushstate({ state: state });
				}
				pushState.apply(history, arguments);
				finsembleWindow.updateOptions({ url: window.top.location.href }, () => {
				});
				return;
			};

			var replaceState = history.replaceState;
			history.replaceState = function (state) {
				if (typeof history.onreplacestate === "function") {
					history.onreplacestate({ state: state });
				}
				replaceState.apply(history, arguments);
				finsembleWindow.updateOptions({ url: window.top.location.toString() });

				StorageClient.save({ topic: WORKSPACE.CACHE_STORAGE_TOPIC, key: self.windowHash, value: finsembleWindow.windowOptions });
				return;
			};
		})(window.history);

		window.addEventListener("hashchange", () => {
			finsembleWindow.updateOptions({ url: window.top.location.toString() }, () => {
			});
		});

	};

	/**
	 * Gets the options from the window on startup and caches them on the object.
	 * @private
	 * @param {function} callback
	 */
	getInitialOptions(callback) {
		if (!this.isInAService) {
			finsembleWindow.getOptions((err, options) => {
				//err happens if the window doesn't exist in the windowService (e.g., it's a service that's included the windowClient). This will be revisited in the future, but for now we need to make sure that the system doesn't have errors.
				if (err) options = {};
				finsembleWindow.windowOptions = options;
				this.options = options;
				Logger.system.verbose("WindowClient:getting options", options);
				callback();
			});
		} else {
			this.options = {};
			callback();
		}
	}

	/**
	 * Gets the bounds for the window on startup and saves them to the workspace.
	 * @private
	 * @param {function} callback
	 */
	cacheInitialBounds(callback) {
		this.cacheBounds((bounds) => {
			try {
				// TODO: saveCompleteWindowState is related to addToWorkspace, not persistWindowState. This causes workspaces to fail for windows where persistWindowState is not set but addToWorkspace is.
				if (!finsembleWindow.windowOptions.customData.foreign.components["Window Manager"].persistWindowState) {
					return callback();
				}
				finsembleWindow.updateOptions({ options: { url: window.top.location.toString() } });
				//finsembleWindow.saveCompleteWindowState();
				//this.saveWindowBounds(bounds, false);
			} catch (e) {
				Logger.system.warn("customData.foreign.components[\"Window Manager\" is undefined");
			}
			callback();
		});
	}

	/**
	 * Sets initial state for the window. This data is modified on subsequent saves.
	 * @param {function} callback
	 * @private
	 */
	setInitialWindowBounds(callback) {
		Logger.system.warn("`FSBL.Clients.WindowClient.setInitialWindowBounds is deprecated and will be removed in a future version of finsemble. Use 'getInitialOptions' and 'cacheInitialBounds' instead.");
		asyncParallel([
			this.getInitialOptions,
			this.cacheInitialBounds
		], callback);
	}

	/**
	 * Returns windowBounds as of the last save.
	 * @returns {object}
	 * @private
	 */
	getWindowBounds() {
		return {
			top: finsembleWindow.windowOptions.defaultTop,
			left: finsembleWindow.windowOptions.defaultLeft,
			width: finsembleWindow.windowOptions.defaultWidth,
			height: finsembleWindow.windowOptions.defaultHeight
		};
	}

	/**
	 *
	 * Saves the window's state. Rarely called manually, as it's called every time your window moves.
	 * @param {Object} bounds optional param.
	 * @example <caption>The code below is the bulk of our listener for the <code>bounds-changed</code> event from the window. Every time the <code>bounds-changed</code> event is fired (when the window is resized or moved), we save the window's state. The first few lines just prevent the window from being dropped behind the toolbar.</caption>
	 *finWindow.addEventListener('disabled-frame-bounds-changed', function (bounds) {
	 * 	if (bounds.top < 45) {
	 *		finWindow.moveTo(bounds.left, 45);
	 *		return;
	 *	}
	 *	self.saveWindowBounds(bounds);
	 * @private
	 *});
	 */
	saveWindowBounds(bounds: WindowBounds, setActiveWorkspaceDirty: boolean) {
		Logger.system.debug("WINDOW LIFECYCLE:SavingBounds:", bounds, "setActiveWorkspaceDirty", setActiveWorkspaceDirty);
		if (typeof setActiveWorkspaceDirty === "undefined") {
			setActiveWorkspaceDirty = false;
		}
		Validate.args(bounds, "object") && (Validate as any).args2("bounds.top", bounds.top, "number");
		if (!bounds) {
			return;
		}
		// openfin looks at defaultTop, terry looks at top. for some reason, when the app started fresh, the window's position was being overwritten. We also were saving the position on `defaultTop`/`defaultLeft`, and the launcherService wasn't looking for that. We may be able to get rid of the first assignment on the left, but I want terry to fully look at this.
		finsembleWindow.updateOptions({
			options: {
				top: Math.round(bounds.top),
				defaultTop: Math.round(bounds.top),
				left: Math.round(bounds.left),
				defaultLeft: Math.round(bounds.left),
				width: Math.round(bounds.width),
				defaultWidth: Math.round(bounds.width),
				height: Math.round(bounds.height),
				defaultHeight: Math.round(bounds.height)
			}
		});
		try {
			if (!finsembleWindow.windowOptions.customData.foreign.components["Window Manager"].persistWindowState) {
				return;
			}
		} catch (e) {
			//prop doesn't exist.
			return;
		}
	};

	/**
	 * Minimizes window.
	 * @param {function} [cb] Optional callback
	 * @example
	 * FSBL.Clients.WindowClient.minimize();
	 */
	minimize(cb: StandardCallback) {
		this.cacheBounds(function () {
			finsembleWindow.minimize(null, function (err) {
				if (!err) {
					//self.windowState = "minimized";
				} else {
					Logger.system.error("WindowClient:minimize", err);
				}
				if (cb) {
					cb(err);
				}

			});
		});
	};

	/**
	 * Sets whether window is always on top.
	 * @param {function} cb Optional callback
	 * @example
	 * FSBL.Clients.WindowClient.setAlwaysOnTop(true);
	 */
	setAlwaysOnTop(alwaysOnTop: boolean, cb?: Function) {
		finsembleWindow.updateOptions({ options: { alwaysOnTop: alwaysOnTop } }, () => {
			if (cb) cb();
		});
	}



	/**
	 * Restores window from a maximized or minimized state.
	 * @param {function} cb Optional callback
	 * @example
	 * FSBL.Clients.WindowClient.restore();
	 */
	restore(cb: StandardCallback = (e, r) => { }) {
		//finsembleWindow.getState((err, windowState) => {
		finsembleWindow.restore(null, function (err) {
			if (!err) {
				//self.windowState = "normal";
			} else {
				Logger.system.error("WindowClient:restore", err);
			}
			cb(err);
		});
	};

	/**
	 * @private
	 */
	cacheBounds(cb: Function) {
		this.getBounds((err, bounds) => {
			if (err) {
				cb();
				return console.warn("Get bounds error.", err, "Window may not be registered with the window service");
			}
			finsembleWindow.updateOptions({
				options: {
					cachedLeft: bounds.left,
					defaultLeft: bounds.left,
					cachedTop: bounds.top,
					defaultTop: bounds.top,
					cachedWidth: bounds.width,
					defaultWidth: bounds.width,
					cachedHeight: bounds.height,
					defaultHeight: bounds.height
				}
			});
			if (cb) {
				cb(bounds);
			}
		});
	}

	/**
	 * Maximizes the window. Also takes into account the application toolbar.
	 * @param {function} cb Optional callback
	 * @todo, when fixed components are a thing, make sure that maximize doesn't sit on top of them either.
	 * @example
	 * FSBL.Clients.WindowClient.maximize();
	 */
	maximize(cb: Function) {
		this.cacheBounds(function () {
			finsembleWindow.maximize();
			//finsembleWindow.windowState = "maximized";
			return cb();
		});
	}

	/**
	 * FinWindow destructor (more or less). Removes all of the listeners that we added when the window was created.
	 * @private
	 */
	removeFinWindowEventListeners() {
		finsembleWindow.removeEventListener("maximized", this.onWindowMaximized);
		finsembleWindow.removeEventListener("restored", this.onWindowRestored);
		finsembleWindow.removeEventListener("blurred", this.onWindowBlurred);
		finsembleWindow.removeEventListener("focused", this.onWindowFocused);
		finsembleWindow.removeEventListener("close-requested", this.close);
		finsembleWindow.removeEventListener("minimized", this.onWindowMinimized);
		finsembleWindow.removeEventListener("parent-set", this.onParentSet);
	};


	/**
	 * This function injects the header bar into all frameless windows that request it. This should only be used if you've decided not to use the provided <code>WindowClient.start()</code> method.
	 *
	 * **NOTE:** If you are using the finsemble windowTitleBar component, you do not need to call this function.
	 * @private
	 */
	injectDOM(headerHeight) {
		//for the aesthetics.

		if (document.getElementById("FSBLHeader")) { return; }
		// On slow loading components, the end user might have the opportunity to scroll the page before the window title bar is injected.
		// This triggers a chromium bug related to elements with position:fixed. Chromium loses track of where that element actually is on
		// the browser page. Chromium *thinks* the title bar is lower than it actually is, by the amount of pixels scrolled by the user.
		// The fix is to force the scroll position back to zero before we inject this fixed element.
		window.scrollTo(0, 0);

		// Now inject the window title bar
		var template = document.createElement("div");
		template.innerHTML = "<div id=\"FSBLHeader\"" + (headerHeight ? " style=height:" + headerHeight : "") + "></div>";
		document.body.insertBefore(template.firstChild, document.body.firstChild);
	};

	/**
	 * Injects the windowTitleBar into the window.
	 * @param {function} cb Callback function
	 * @return {object} Reference to a RouterClient.query
	 * @private
	 */
	injectFSBL(params: InjectHeaderParams, cb: StandardCallback) {
		//This flag is set by the launcher service. It tells us if FSBL was injected
		this.routerClient.query(`WindowService-Request-injectTitleBar`, { config: finsembleWindow.windowOptions, titleComponent: params.component },
			(err, response) => {
				if (params.bodyMarginTop == "auto") {
					let setHeaderHeight = () => {
						let header = document.getElementsByClassName("fsbl-header")[0];
						if (!header) { //wait for header to be rendered
							return setTimeout(setHeaderHeight, 100);
						}
						let headerHeight = window.getComputedStyle(header, null).getPropertyValue("height");
						document.body.style.marginTop = headerHeight;
						if (params.bumpElements && params.bumpElements.bumpBy === "auto") {
							params.bumpElements.bumpBy = headerHeight;
							this.bumpFixedElements(params.bumpElements);
						}
					};
					setHeaderHeight();

				}
				if (cb) {
					cb(err, response);
				}
			});
	};

	/**
	 * Given a field, this function retrieves app state. If no params are given you get the full state
	 * @param {object} params
	 * @param {string} [params.field] field
	 * @param {Array.<string>} [params.fields] fields
	 * @param {function} cb Callback
	 * @example <caption>The example below shows how we retrieve data to restore the layout in our charts.</caption>
	 * FSBL.Clients.WindowClient.getComponentState({
	 *	 field: 'myChartLayout',
	 * }, function (err, state) {
	 * 	importLayout(state);
	 * });
	 *
	 * FSBL.Clients.WindowClient.getComponentState({
	 * 		fields: ['myChartLayout', 'chartType'],
	 * }, function (err, state) {
	 * 	var chartType = state['chartType'];
	 * 	var myChartLayout = state['myChartLayout'];
	 * });
	 **/
	getComponentState(params: {
		field?: string,
		fields?: string[],
		windowName?: string
	}, cb: StandardCallback) {

		if (!params) { params = {}; }
		if (params.fields && !Array.isArray(params.fields)) { params.fields = [params.fields]; }
		Validate.args(params, "object", cb, "function");
		if (finsembleWindow) {
			return finsembleWindow.getComponentState(params, cb);
		}
		Logger.system.warn("Attempt to use getComponentState before component is ready or in a service");
		//if (!finWindow) { finWindow = System.Window.getCurrent(); } //TODO: why are we checking here??
		if (!params.windowName) params.windowName = window.name; // using FSBL in services causes errors because finsembleWindow does not exist

		var hash = this.getContainerHash(params.windowName);

		StorageClient.get({ topic: WORKSPACE.CACHE_STORAGE_TOPIC, key: hash }, (err, response) => {
			if (err) {
				Logger.system.error("Error retrieving window client's component state.");
				cb(err);
				return;
			}
			var data = response;
			if (response && params.field) {
				this.componentState = data || {};
				cb(err, data[params.field]);
			} else if (params.fields) {
				var respObject = {};
				for (var i = 0; i < params.fields.length; i++) {
					if (data[params.fields[i]]) {
						respObject[params.fields[i]] = data[params.fields[i]];
					}
				}
				return cb(null, respObject);

			} else if (response) {
				return cb(null, data);
			} else {
				Logger.system.info("WindowClient:getComponentState:error, response, params", err, response, params);
				cb("Not found", response);
			}
		});
	};

	/**
	 * Given a field, this function sets and persists app state.
	 * @param {object} params
	 * @param {string} [params.field] field
	 * @param {Array.<string>} [params.fields] fields
	 * @param {function} cb Callback
	 * @example <caption>The example below shows how we save our chart layout when it changes.</caption>
	 * var s = stx.exportLayout(true);
	 * //saving layout'
	 * FSBL.Clients.WindowClient.setComponentState({ field: 'myChartLayout', value: s });
	 * FSBL.Clients.WindowClient.setComponentState({ fields: [{field:'myChartLayout', value: s }, {field:'chartType', value: 'mountain'}]);
	 **/
	setComponentState(params: {
		field?: string,
		fields?: { field: string, value: any }[],
		value?: any,
		windowName?: string
	}, cb: StandardCallback = (e, r) => { }) {
		Validate.args(params, "object", cb, "function=") && (Validate as any).args2("params.field", params.field, "string");
		if (finsembleWindow) {
			return finsembleWindow.setComponentState(params, cb);
		}
		// using FSBL in services causes errors because finsembleWindow does not exist
		if (!params.windowName) params.windowName = window.name;
		var hash = this.getContainerHash(params.windowName);
		let fields = params.fields;

		if (typeof params.field === "undefined") {
			// If the user hasn't provided field or fields, exit.
			if (!fields) {
				return cb({
					message: "setComponentState requires a field parameter or a fields parameter. Neither were provided.",
					code: "invalid_arguments"
				});
			}
		} else {
			fields = [{
				field: params.field,
				value: params.value
			}];
		}

		for (let i = 0; i < fields.length; i++) {
			let field = fields[i];
			if (!field.field || !field.value) { continue; }
			this.componentState[field.field] = field.value;
		}

		let _params = {
			field: params.field || "",
			value: params.value,
			windowName: params.windowName
		}

		StorageClient.save({ topic: WORKSPACE.CACHE_STORAGE_TOPIC, key: hash, value: this.componentState }, function (err, response) {
			if (cb) { cb(err, response); }
		});

	}

	/**
	 * Given a field, this function removes it from app state.
	 * @param {object} params
	 * @param {string} [params.field] field
	 * @param {Array.<string>} [params.fields] fields
	 * @param {string} [params.windowName] The name of the window to remove component state from
	 * @param {function} [cb] Callback
	 * @example <caption>The example below shows how we remove our chart layout when it no longer needed.</caption>
	 * // remove unused state value
	 * FSBL.Clients.WindowClient.removeComponentState({ field: 'myChartLayout'});
	 * FSBL.Clients.WindowClient.removeComponentState({ fields: [{field:'myChartLayout'}, {field:'chartType'}]);
	 **/
	async removeComponentState(params: {
		field?: string,
		fields?: { field: string }[],
		windowName?: string
	}, cb: StandardCallback = (e, r) => { }) {
		Validate.args(params, "object", cb, "function=") &&
			(Validate as any).args2("params.field", params.field, "string");

		const wrap = finsembleWindow || (await FinsembleWindow.getInstance({ name: params.windowName || window.name }));
		return wrap.removeComponentState(params, cb);
	}

	/**
	 * Gets the window name of current window or the parent, if tabbed.
	 */
	getWindowNameForDocking() {
		let parent = finsembleWindow.parentWindow;
		return parent ? parent.name : finsembleWindow.name;
	}

	/**
	 * Gets containerHash given a containerId.
	 * @param {string} windowName The name of the window
	 * @returns {string} Hash for the window
	 * @private
	 */
	getContainerHash(windowName: string) {
		return util.camelCase(this.windowHash, windowName);
	}

	/**
	 * Forms a group with any window that is touching the border of this window.
	 * @private
	 */
	formGroup() {
		let windowName = this.getWindowNameForDocking()
		this.routerClient.transmit("DockingService.formGroup", { windowName });
	}

	/**
	 * This function is critical if you want docking and snapping to work. It transmits a message to the LauncherService, which registers it as a dockable window.
	 *
	 * **NOTE:** If you are using the finsemble windowTitleBar component, you do not need to call this function.
	 * @param {object} params Parameters
	 * @param {function} cb callback
	 *
	 * @example
	 * FSBL.Clients.WindowClient.registerWithDockingManager();
	 * @private
	 */
	registerWithDockingManager(params, cb) {
		if (finsembleWindow.parentWindow) {
			// TABBING TBD: need more orderly startup with state managed from just one place (StackWindowManagerService also controls register/deregister)
			Logger.system.debug("registerWithDockingManager ignore registration request if has a parent");
			if (cb) cb(); // return without error because still want component to come up
		}
		var windowName = finsembleWindow.name;
		var uuid = finsembleWindow.uuid;
		this.startedRegistrationWithDocking = true;
		this.routerClient.query("DockingService.registerWindow", {
			name: windowName,
			uuid: uuid,
			options: params || {},
			windowType: "OpenFinWindow"
		}, () => {
			this.startedRegistrationWithDocking = false;
			if (this.deregisterPlease) {
				this.deregisterWithDockingManager();
				this.deregisterPlease = false;
			}
			Logger.system.debug("WINDOW LIFECYCLE: Docking Registration complete.");
			if (cb) {
				cb();
			}
		});
	}

	/**
	 * This function is critical if you don't want to keep references of windows in the LauncherService after they close. It simply notifies the LauncherService that the window is no longer dockable. It's invoked when the window is closed.
	 * **NOTE:** If you are using the finsemble windowTitleBar component, you do not need to call this function.
	 * @param {boolean} removeFromWorkspace true to remove from workspace
	 * @example
	 * FSBL.Clients.WindowClient.deregisterWithDockingManager();
	 * @private
	 */
	deregisterWithDockingManager(removeFromWorkspace?: boolean) {
		if (this.startedRegistrationWithDocking) {
			this.deregisterPlease = true;
		}
		var windowName = finsembleWindow.name;
		this.routerClient.transmit("DockingService.deregisterWindow", {
			name: windowName,
			userInitiated: removeFromWorkspace
		});
	};

	/**
	 * @private
	 */
	enableHotkeys() {
		this.enableDevToolsHotkey();
		this.enableReloadHotkey();
	}

	/**
	 * Helper function to display dev-tools if you disable context-menus on your chromium windows. You must call this function if you want the hotkey to work.
	 * @private
	 */
	enableReloadHotkey() {
		window.addEventListener("keydown", function (e) {
			if (e.keyCode === 82 && e.altKey && e.ctrlKey) {
				System.clearCache({
					cache: true,
					cookies: false,
					localStorage: false,
					appcache: true,
					userData: false
				});
				window.location.reload();
			}
		});
	}

	/**
	 * Helper function to display dev-tools if you disable context-menus on your chromium windows. You must call this function if you want the hotkey to work.
	 * @private
	 */
	enableDevToolsHotkey() {
		window.addEventListener("keydown", function (e) {
			if (e.keyCode === 68 && e.altKey && e.ctrlKey) {
				var application = System.Application.getCurrent();
				application.getManifest(function (manifest) {
					var uuid = manifest.startup_app.uuid;
					var windowName = finsembleWindow.name;
					System.showDeveloperTools(uuid, windowName);
				}, function (err) {
					Logger.system.error("dev-tools", err);
				});
			}
		});
	}

	/**
	 * Bumps top-level containers down below the windowTitleBar.
	 * @private
	 */
	bumpFixedElements(params) {
		if (!params || !(params.absolute || params.fixed)) {
			return;
		}
		var elems: any = document.body.getElementsByTagName("*");
		var len = elems.length;

		for (var i = 0; i < len; i++) {
			if (elems[i].id === "FSBLHeader" || elems[i].classList.contains("fsbl-header")) { continue; }
			var style = window.getComputedStyle(elems[i], null),
				possibleZeros = ["0", "0px", 0];

			var topStyle = style.getPropertyValue("top");

			//only target top-level fixed/absolutely positioned containers.
			if (params.absolute && elems[i].parentNode === document.body && style.getPropertyValue("position") == "absolute") {
				if (params.absolute == "all") {
					elems[i].style.top = "calc(" + topStyle + " + " + params.bumpBy + ")";
				} else if (params.absolute == "0Positioned" && possibleZeros.includes(topStyle)) {
					elems[i].style.top = params.bumpBy;
				}
			} else if (params.fixed && style.getPropertyValue("position") == "fixed") {
				if (params.fixed == "all") {
					elems[i].style.top = "calc(" + topStyle + " + " + params.bumpBy + ")";
				} else if (params.fixed == "0Positioned" && possibleZeros.includes(topStyle)) {
					elems[i].style.top = params.bumpBy;
				}
			}
		}
	}

	/**
	 * Forces window to sit on top of other windows.
	 * @example
	 * FSBL.Clients.WindowClient.bringWindowToFront();
	 */
	bringWindowToFront() {
		finsembleWindow.isShowing(function (err, isShowing) {
			if (isShowing) {
				finsembleWindow.bringToFront({ forceFocus: true },
					function (err) {
						if (err) {
							Logger.system.error("WindowClient.bringWindowToFront: failure:" + err);
						} else {
							Logger.system.info("WindowClient.bringWindowToFront: success");
						}
					});
			}
		});
	}

	/**
	 * The Finsemble Window Title Bar is injected if FSBLHeader: true or FSBLHeader is an object with the same items as the properties of params below as this function is in the component's config. If you want to inject the Finsemble header later, you can do so by calling this function
	 * @param {object} 	[params]
	 * @param {string} [params.component] Component to inject. Default is "windowTitleBar"
	 * @param {object} [params.bumpElements]
	 * @param {boolean|string} [params.bumpElements.fixed] Either false, "all" or "0Positioned". If all, all fixed elements are moved. 0Positioned only moves elements that have top 0. Default is all.
	 * @param {boolean|string} [params.bumpElements.absolute] Either false, "all" or "0Positioned". If all, all fixed elements are moved. 0Positioned only moves elements that have top 0. Only applies to children of the body. Default is all.
	 * @param {string} [params.bumpElements.bumpBy] Sets the amount to bump elements by (e.g. "25px"). Default is "auto" which will measure the height of the injected component when rendered.
	 * @param {string} [params.bodyMarginTop] Sets the body margin (e.g. "25px"). Default is "auto" which will measure the height of the injected component when rendered.
	 * @param {string} [params.forceHeaderHeight] Sets a height on the main FSBLHeader div. Either false or a specified height (e.g. "25px").
	 */
	injectHeader(params?: InjectHeaderParams | boolean, cb: StandardCallback = () => { }) {
		//FIXME(Terry) windowService should inject directly from a config:
		// components."*".component.inject|preload="windowTitleBar.js" <-- set the windowTitleBar
		// components."welcome".component.inject|preload="windowTitleBar.js" <-- override the windowTitleBar
		// Everything from here down then goes into windowTitleBar.jsx inside FSBLReady()

		let self = this;
		if (this.hasHeader) return;
		this.hasHeader = true;

		var defaultParams: InjectHeaderParams = {
			component: "windowTitleBar",
			bumpElements: {
				fixed: "all",
				absolute: "all",
				bumpBy: "auto"
			},
			bodyMarginTop: "auto",
			forceHeaderHeight: false
		};

		//this will catch true, false, or undefined.
		if (typeof params !== "object") {
			params = defaultParams;
		} else {
			params = Object.assign(defaultParams, params);
		}


		this.injectDOM(params.forceHeaderHeight);
		if (params.bumpElements && params.bumpElements.bumpBy !== "auto") {
			this.bumpFixedElements(params.bumpElements);
		}
		if (params.bodyMarginTop && params.bodyMarginTop !== "auto") {
			document.body.style.marginTop = params.bodyMarginTop;
		}

		// initialize but if child of a stacked window then don't register with docking
		//finsembleWindow.getParent();
		self.injectFSBL(params, cb);
	}

	/**
	 * @private
	 */
	injectStylesheetOverride() {
		var node = document.createElement("style");
		node.type = "text/css";
		node.appendChild(document.createTextNode(finsembleWindow.windowOptions.customData.cssOverride));
		document.body.appendChild(node);
	}

	/**
	 * If we spawned this openfin app from our parent application, we listen on that application for certain events that might fire _if_ our parent goes down. If the parent goes down, we want to kill its children as well.
	 * @private
	 */
	checkIfChildApp() {
		if (finsembleWindow.windowOptions &&
			finsembleWindow.windowOptions.customData &&
			finsembleWindow.windowOptions.customData.parentUUID &&
			finsembleWindow.windowOptions.customData.parentUUID !== System.Application.getCurrent().uuid) {
			let parent = System.Application.wrap(finsembleWindow.windowOptions.customData.parentUUID);
			parent.addEventListener("crashed", this.close.bind(null, false));
			parent.addEventListener("initialized", this.close.bind(null, false));
			parent.addEventListener("out-of-memory", this.close.bind(null, false));
		}
	}
	/**
	 * Prevents the browser's default behavior of loading files/images if they're dropped anywhere in the window.
	 * If a component has a drop area that _doesn't_ preventDefault, the image/file will still be loaded.
	 * This only prevents bad behavior from happening when the user drops an image/file on part of the window that _isn't_ listening for drag/drop events (usually by accident).
	 * @private
	 */
	preventUnintendedDropEvents() {
		function preventDefault(e) { e.preventDefault(); }
		window.addEventListener("dragover", preventDefault, false);
		window.addEventListener("drop", preventDefault, false);
	}
	/**
	* If the user presses windows key + left or right it causes all kinds of abhorrent behavior. This function captures the hotkeys and essentially prevents the behavior.
	* @private
	 */
	rejectWindowsKeyResizes() {
		let keysDown = {};
		//Responds to key events here in order to send router messages and determine whether a system-bounds-changed event should occur. Essentially, this is catching actions to allow Finsemble to respond to windows aero snap functionality.

		const onKeyUp = async (e) => {
			//If windows aero snap is disabled we check the list of captured keys and what was released to determine if an event needs to
			//be responded to. Basically, if this is disabled, we see if a Windows Key + Left/Right was released, if so, restore from the windows new bounds
			//which were set by the OS
			if (this.enableWindowsAeroSnap) {
				//If the key being released is the windows key, send a router message to docking
				if (e.key === "Meta") {
					RouterClient.transmit("Finsemble.WindowService.WindowsKey", "up");
				}
			} else {
				let keys = Object.keys(keysDown);
				//which key was just pressed.
				let ArrowPressed = e.key === "ArrowLeft" || e.key === "ArrowRight";
				let WindowsKeyPressed = e.key === "Meta";

				//Which key was pressed previously.
				let ArrowIsDown = keys.includes("ArrowLeft") || keys.includes("ArrowRight");
				let WindowsKeyDown = keys.includes("Meta");

				//Either we pressed the arrow first or the windows key first. Doesn't matter. Code should still work.
				if ((ArrowIsDown && WindowsKeyPressed) || (WindowsKeyDown && ArrowPressed)) {
					let { data: bounds } = await finsembleWindow.getBounds();
					finsembleWindow.setBounds(bounds);
				}

				//Key isn't down any more. Delete it if it was down.
				//Added a timeout to better handle when someone is playing Beethoven's 5th Symphony on key chords.
				setTimeout(() => delete keysDown[e.key], 50);
			}
		};
		//Store the key on our object.
		const onKeyDown = (e) => {
			//If windows aero snap is disabled, add this new key to the list of 'tracked' (held down) keys.
			if (this.enableWindowsAeroSnap) {
				//If the key being pressed is the windows key, send a message to docking
				if (e.key === "Meta") {
					RouterClient.transmit("Finsemble.WindowService.WindowsKey", "down");
				}
			} else {
				keysDown[e.key] = true;
			}
		};
		if (FSBL) {
			HotkeyClient.onReady(() => {
				//The browser's keyDown isn't capable of capturing keyChords if the first key pressed is the window's key. So we'll have to create a makeshift keystroke handler.
				//On keydown, we grab that key. Keyup can fire for different keys, so that's where the work happens.
				window.addEventListener("keyup", onKeyUp);
				window.addEventListener("keydown", onKeyDown);
			});
		}
	}
	/**
	 * Adds listeners to handle hash changes and finWindow listeners.
	 * @private
	 * @param {function} cb
	 */
	addListeners(cb: Function = Function.prototype) {
		var self = this;
		this.listenForHashChanges();
		this.preventUnintendedDropEvents();
		this.rejectWindowsKeyResizes();
		//FinsembleWindow listeners
		//@todo, make the openfin window trigger an event on the finsemble window, which will emit up. we then use addListener instead of addEventListener
		finsembleWindow.addListener("setParent", () => {
			Logger.system.info("WindowClient.setParent deregisterWithDockingManager");
			this.deregisterWithDockingManager(); // stack takes care of this too but doesn't work at startup or workspace switch so do again here
		});
		finsembleWindow.addEventListener("maximized", this.onWindowMaximized);
		finsembleWindow.addEventListener("minimized", this.onWindowMinimized);
		finsembleWindow.addEventListener("restored", this.onWindowRestored);
		// On Blur remove the border from window
		finsembleWindow.addEventListener("blurred", this.onWindowBlurred);
		// On focus add a border to the window
		finsembleWindow.addEventListener("focused", this.onWindowFocused);
		finsembleWindow.addEventListener("parent-set", this.onParentSet);

		if (typeof FSBL !== "undefined") {
			FSBL.onShutdown(() => {
				Logger.system.info("WINDOW LIFECYCLE:SHUTDOWN: FSBL.onShutdown start");
				return new Promise((resolve) => {
					Logger.system.debug("FSBL.onShutdown");
					FSBL.shutdownComplete();
					this.close({
						removeFromWorkspace: false,
						ignoreParent: true, // must set otherwise might be removed from stacked window
						closeWindow: false
					}, resolve);
				});
			});
		}

		cb();
	};

	/**
	 * Sends a command to the header. Commands affect the header state,
	 * so that the UI reflects what is going on in the component window.
	 * @param {string} command The state object to set
	 * @param {object} state The new state (merged with existing)
	 * @private
	 */
	updateHeaderState(command: string, state: any) {
		if (!this.commandChannel) {
			return;
		}
		this.commandChannel(command, state);
	}

	/**
	 * Establishes a command channel with a header. The WindowClient can
	 * update header state via this channel.
	 * @param {function} commandChannel A function callback that receives commands
	 */
	headerCommandChannel(commandChannel: (arg0: any, arg1: any) => void) {
		this.commandChannel = commandChannel;
	}

	/**
	 * Ejects the window from the docking group
	 * @private
	 */
	ejectFromGroup() {
		let windowName = this.getWindowNameForDocking();
		RouterClient.query("DockingService.leaveGroup", {
			name: windowName
		}, () => { });
	}

	/**
	 * This function does two things:
	 *
	 * 1. It sets the window's title in the windowTitleBar component, and
	 * 2. It sets the title in the DOM.
	 *
	 * This is useful if you like to keep the window's title in sync with a piece of data (e.g., a Symbol);
	 * @param {String} title Window title.
	 * @todo Allow HTML or classes to be injected into the title.
	 * @example <caption>The code shows how you would change your window title.</caption>
	 *  FSBL.Clients.WindowClient.setWindowTitle("My Component's New Title");
	 */
	setWindowTitle(title) {
		Validate.args(title, "string");
		this.title = title;
		//document.title = title;  // causes flickering in chromium 53
		this.updateHeaderState("Main", { windowTitle: title });
		finsembleWindow.setTitle(title);
	}

	/**
	 * Retrieves data that was set with {@link LauncherClient#spawn}.
	 * @return {object} The data or empty object if no data was set. *Note, this will never return null or undefined.*
	 */
	getSpawnData() {
		if (!this.options.customData) { return {}; }
		var spawnData = this.options.customData.spawnData;
		if (typeof spawnData === "undefined") { return {}; }
		return spawnData;
	};

	/**
	 * Returns a reference to the current window for the *component*. For most
	 * components this will just return the finWindow, but for a compound component
	 * it will return a CompoundWindow.
	 * @returns {finWindow}
	 */
	getCurrentWindow() { //TODO - return finsembleWindow
		return System.Window.getCurrent();
	};

	/**
	 * For the DOM element that has been passed in, this function returns a bounding box that is relative
	 * to the OpenFin virtual monitor space. That is, it returns the position of the DOM element on the desktop.
	 * @param {HTMLElement|string} element A selector or HTMLElement
	 * @private
	 * @todo convert to use monitor util function and make sure current bounds are correct. For some windows (e.g., toolbars/menus that don't track their own bounds because they don't have drag regions), options.default will represent the data _on spawn_, not the bounds when the function is called.
	 */
	getDesktopBoundingBox(element: string | Element) {
		var el = element;
		if (typeof (element) === "string") {
			el = document.querySelector(element);
		}
		let box = (el as Element).getBoundingClientRect();
		let boundingBox = {
			top: this.options.defaultTop - box.top,
			left: this.options.defaultLeft + box.left,
			width: box.width,
			height: box.height,
			right: 0,
			bottom: 0
		};

		boundingBox.right = boundingBox.left + boundingBox.width;
		boundingBox.bottom = boundingBox.top + boundingBox.height;

		return boundingBox;
	}

	/**
	 * @private
	 */
	isPointInBox(point: {
		x: number,
		y: number
	}, box: {
		top: number,
		left: number,
		bottom?: number,
		right?: number,
		width: number,
		height: number
	}) {
		if (!box.bottom) box.bottom = box.top + box.height;
		if (!box.right) box.right = box.left + box.width;
		return (point.x > box.left && point.x < box.right && point.y < box.bottom && point.y > box.top);
	};

	/**
	 * Returns (via callback) true if the mouse is currently located (hovering) over the requested element.
	 * @param {HTMLElement|string} element The element, or a selector, to check
	 * @param {function} cb A function that returns a boolean
	 * @private
	 */
	isMouseOverDOMElement(element: Element, cb: Function) {
		var boundingBox = this.getDesktopBoundingBox(element);
		System.getMousePosition((err, position) => {
			cb(this.isPointInBox(position, boundingBox));
		});
	};

	/**
	 * Returns the window identifier for the current component.
	 * @returns {windowIdentifier}
	 */
	getWindowIdentifier() {
		var componentType = null;
		if (this.options && this.options.customData && this.options.customData.component)
			componentType = this.options.customData.component.type;
		return {
			windowName: finsembleWindow ? finsembleWindow.name : window.name,
			uuid: finsembleWindow ? finsembleWindow.uuid : null,
			componentType: componentType
		};
	};

	/**
	 * Highlights the window as active by creating a border around the window.
	 *
	 * @param {boolean} active  Set to false to turn off activity
	 * @private
	 */
	setActive(active: boolean) {
		if (active) {
			addClass(document.documentElement, "desktop-active");
		} else {
			removeClass(document.documentElement, "desktop-active");
		}
	};

	/**
	 * Returns the bounds for the current window.
	 * @param {function} cb
	 */
	getBounds(cb: StandardCallback) {
		finsembleWindow.getBounds(function (err, bounds) {
			cb(err, bounds);
		});
	};

	/**
	 * This is used by the Finsemble Window Title Bar when a tab is dragged for tiling or tabbing.
	 * @param {*} params - params.windowIdentifier is required.
	 * @param {*} cb
	 */
	startTilingOrTabbing(params: {
		windowIdentifier: WindowIdentifier
	}, cb: Function = Function.prototype) {
		FSBL.Clients.RouterClient.transmit("DockingService.startTilingOrTabbing", params);
		cb();
	};

	/**
	 * This is used to cancel a tabbing or tiling operation.
	 * @param {*} params - put windowIdentifier in params.windowIdentifier. If not provided, must set params.waitForIdentifier true
	 * @param {*} cb
	 */
	cancelTilingOrTabbing(params: {
		windowIdentifier: WindowIdentifier
	}, cb: Function = Function.prototype) {
		console.debug("CancelTilingOrTabbing");
		RouterClient.transmit("DockingService.cancelTilingOrTabbing", params);
		cb();
	};

	/**
	 * This is used to let Finsemble know which window is being dragged. params.windowIdentifier must be the identifier of the tab being dragged. This is only used if the identifier is unknown when startTilingOrTabbing is called.
	 * @param {*} params - windowIdentifier is required
	 * @param {*} cb
	 */
	sendIdentifierForTilingOrTabbing(params: {
		windowIdentifier: WindowIdentifier
	}, cb: Function = Function.prototype) {
		FSBL.Clients.RouterClient.transmit("DockingService.identifierForTilingOrTabbing", params);
		cb();
	};

	/**
	 * This function is used by the Finsemble Window Title Bar to end tiling or tabbing.
	 * @param {*} params
	 * @param {object} params.mousePosition Where the pointer is on the screen
	 * @param {number} params.mousePosition.x X position of the pointer
	 * @param {number} params.mousePosition.y Y position of the pointer
	 * @param {boolean} allowDropOnSelf Determines whether a tab can be dropped on the window where the drag originated.
	 * @param {*} cb
	 */
	stopTilingOrTabbing(params: {
		mousePosition?: {
			x: number,
			y: number
		},
		allowDropOnSelf?: boolean
	}, cb: Function = Function.prototype) {
		// We both transmit and query because no stack operation should happen until this is done and there are a lot of listeners around.
		const transmitAndQueryStop = () => {
			RouterClient.query("DockingService.stopTilingOrTabbing", params, () => {
				cb();
			});
			RouterClient.transmit("DockingService.stopTilingOrTabbing", params);
		};
		// Get the mouse position if not passed through for transmit to the router,
		// If allowDropOnSelf is true, it came from a tab/window drop event. Run the callback.
		if (!params.mousePosition) {
			return System.getMousePosition((err, position) => {
				params.mousePosition = position;
				transmitAndQueryStop();
				if (!params.allowDropOnSelf) return cb();
			});
		} else {
			transmitAndQueryStop();
			if (!params.allowDropOnSelf) return cb();
		}
	};


	/**
	 * Gets the stackedWindow (if this window is a child of a stacked window).
	 *
	 * If no stacked window then returns null.  But if null and params.create is set, then the stacked window will be automatically created and this window added as the first child.
	 *
	 * (Typically used by Tabbing Presentation component to manage tabs.)
	 *
	 * @param {object=} params
	 * @param {array=} params.create if true and StackedWindow isn't defined, then it will be created
	 * @param {array=} params.windowIdentifiers if creating, then can optionally specify an array of other windowIdentifiers to add to stack on creation (in addition to this window).
	 * @param {function} cb cb(err, stackedWindowIdentifier)
	 *
	 * Typically used by Tabbing Presentation component.
	 *
	 */
	getStackedWindow(params?: getStackedWindowParams | StandardCallback, cb?: StandardCallback) {
		Logger.system.debug("WindowClient.getStackedWindow", params);
		cb = cb || (params as StandardCallback);
		params = (params as getStackedWindowParams) || {};
		params.windowIdentifiers = params.windowIdentifiers || [];

		if (!finsembleWindow.parentWindow && params.create) {
			let onParentSet = (evt) => {
				let parentName = evt.data.parentName;
				finsembleWindow.setParent({ windowName: parentName }, (err2, windowWrapper) => {
					cb(err2, windowWrapper);
				});
				finsembleWindow.removeListener("parent-set", onParentSet);
			};
			finsembleWindow.addListener("parent-set", onParentSet);
			FSBL.Clients.LauncherClient.spawn("StackedWindow", {
				windowType: "StackedWindow", data: { windowIdentifiers: params.windowIdentifiers }, options: { newStack: true }
			}, function (err, windowInfo) {
				Logger.system.debug("WindowClient.getStackedWindow-success", err, windowInfo);
				if (!err) {
					return;
				}
				cb(err, null);
			});

		} else {
			finsembleWindow.getParent(cb);
		}
	}

	/**
	 * Private copy of getMonitorInfo from LauncherClient. We have to include it here to avoid a circular reference between LauncherClient and WindowClient.
	 * @private
	 */
	getMonitorInfo(params, cb) {
		util.getMyWindowIdentifier((myWindowIdentifier) => {
			if (!params.windowIdentifier) {
				params.windowIdentifier = myWindowIdentifier;
			}
			this.routerClient.query("Launcher.getMonitorInfo", params, function (err, response) {
				if (cb) {
					cb(err, response.data);
				}
			});
		});
	};
	/**
	 * Moves the window so that it's centered above the user's mouse.
	 */
	showAtMousePosition = function () {
		this.routerClient.transmit("DockingService.showAtMousePosition", this.getWindowIdentifier());
	};

	/**
	 * Automatically resizes the height of the window to fit the full DOM of the current window..
	 * @param {object} [params]
	 * @param {object} [params.padding]
	 * @param {number} [params.padding.height] How much padding around the DOM to add to the height of the window
	 * @param {number} [params.padding.width] How much padding around the DOM to add to the width of the window
	 * @param {number} [params.maxHeight] Maximum height to make the window
	 * @param {number} [params.maxWidth] Maximum width to make the window
	 * @param {function} cb Optional callback when complete
	 */
	fitToDOM(params?: {
		padding?: {
			height: number,
			width: number
		},
		maxHeight?: number,
		maxWidth?: number
	}, cb?: Function) {
		var children = document.body.children;
		var element = document.getElementsByTagName("body")[0],
			style = window.getComputedStyle(element),
			marginTop = style.getPropertyValue("margin-top"),
			marginBottom = style.getPropertyValue("margin-bottom");
		var margin = parseInt(marginTop, 10) + parseInt(marginBottom, 10);
		if (isNaN(margin)) margin = 0;
		var newHeight = margin;
		var newWidth = this.options.width;
		for (var i = 0; i < children.length; i++) {
			var child = children[i] as any;

			newHeight += child.offsetHeight + margin;
			//elmMargin = parseInt(child.style.marginTop, 10) + parseInt(child.style.marginBottom, 10);
		}

		if (typeof (params) === "function") {
			cb = params;
			params = null;
		}
		if (params && params.padding) {
			if (params.padding.height) {
				newHeight += params.padding.height;
			}
			if (params.padding.width) {
				newWidth += params.padding.width;
			}
		}

		if (params && params.maxHeight && newHeight > params.maxHeight) {
			newHeight = params.maxHeight;
		}
		Logger.system.debug("WindowClient.FitToDOM:newHeight", newHeight, params);

		//@todo, do this statically
		this.getMonitorInfo({}, (err, monitorInfo) => {
			//Logger.system.log("updates111 in here");
			let fixBounds = true;
			if (newHeight >= monitorInfo.unclaimedRect.height) {
				newHeight = monitorInfo.unclaimedRect.height;
				fixBounds = true;
			}
			if (newWidth >= monitorInfo.unclaimedRect.width) {
				newWidth = monitorInfo.unclaimedRect.width;
				fixBounds = true;
			}

			if (fixBounds) {
				//bounds.x and bounds.y are null on mac. Not sure if they're set on windows, but this manifested itself with an error on macs that didn't resize.
				Logger.system.debug("WindowClient.FitToDOM:fixBounds", newHeight, newWidth);
				finsembleWindow.getBounds((err, bounds) => {
					bounds.width = newWidth;
					bounds.height = newHeight;
					finsembleWindow.setBounds({ bounds }, cb);
				});
			} else if (cb) {
				setTimeout(cb, 0);
			}
		});
	}

	/**
	 * Kicks off all of the necessary methods for the app. It
	 * 1. Injects the header bar into the window.
	 * 2. Sets up listeners to handle close and move requests from the application.
	 * 3. Adds a listener that saves the window's state every time it's moved or resized.
	 * @param {function} callback
	 * See the [windowTitleBar tutorial](tutorial-UIComponents.html#window-title-bar) for more information.
	 * @private
	 */
	async start(callback = Function.prototype) {
		Validate.args(callback, "function");
		const self = this;
		const finsembleConfig = await configClient.getValue("finsemble")
		const deliveryMechanism = finsembleConfig.data["Window Manager"].deliveryMechanism ||
			DELIVERY_MECHANISM.PRELOAD;
		let customData = null,
			isCompoundWindow = false,
			shouldInjectCSS = false,
			componentSupportsHeader = false;
		//where we store componentState for the window.
		this.componentState = {};
		let getFinsembleWindow = (done) => {
			FinsembleWindow.getInstance({ name: this.finWindow.name, uuid: this.finWindow.uuid }, (err, response) => {
				Logger.system.debug(`FinsembleWindow.getInstance ${this.finWindow.name}`);

				if (err == "Cannot Wrap Service Manager or Services") {
					this.isInAService = true;
					this.windowHash = util.camelCase("activeWorkspace", window.name);
					return done();
				}
				if (err || !response) {
					Logger.system.error("wrap failure", err);
				}
				this.finsembleWindow = response;
				finsembleWindow = this.finsembleWindow;
				this.windowHash = util.camelCase("activeWorkspace", finsembleWindow.name);
				this.addListeners();
				this.routerClient.subscribe("Finsemble.WorkspaceService.groupUpdate",
					(err, res) => this.groupUpdateHandler(err, res));
				done();
			});
		};

		/**
		 * @private
		 */
		getFinsembleWindow(() => {
			this.retrieveMonitorDimensions();
			this.getInitialOptions(() => {
				//The functions above are necessary to finish initializing the windowClient. The functions below are independent of one another.

				// Note the extra test on the names is to ignore services that are including the windowClient, which needs to be removed
				if (!finsembleWindow || !finsembleWindow.windowOptions) {
					if (!this.isInAService) {
						Logger.system.error("Something went wrong attempting to get the current window.");
					}
					return callback();
				}

				customData = finsembleWindow.windowOptions.customData;

				if (customData) {
					isCompoundWindow = lodashGet(customData, 'window.compound', false);
					if (customData.cssOverride) {
						Logger.system.debug("Window has cssOverride. See local window to inspect object");
						shouldInjectCSS = true;
					}
					componentSupportsHeader = !isCompoundWindow && lodashGet(customData,
						['foreign', 'components', 'Window Manager', 'FSBLHeader'], false);
				}

				asyncParallel([
					function injectCSS(done) {
						if (shouldInjectCSS) {
							self.injectStylesheetOverride();
						}
						done();
					},
					function injectHeader(done) {
						Logger.system.debug('Will attempt to inject header.');
						if (componentSupportsHeader && deliveryMechanism === DELIVERY_MECHANISM.INJECTION) {
							self.injectHeader(customData.foreign.components["Window Manager"].FSBLHeader, done);
						} else {
							done();
						}
					},

					function setupAeroSnap(done) {
						//Get the 'enableWindowsAeroSnap' variable from the docking config and set this windows instance
						configClient.getValue('finsemble', (err, config) => {
							if (err) {
								Logger.system.error("Error reading windowService config from finsemble");
							}
							let aeroSnap = config.services.windowService.config.enableWindowsAeroSnap;

							self.enableWindowsAeroSnap = configUtil.getDefault(config, "config.servicesConfig.docking.enableWindowsAeroSnap", aeroSnap);
							done();
						});
					},
					function registerWithDocking(done) {

						/**
						 * Checks the config for a deprecated value or new value under windowService, or dockingService if windowService doesn't exist.
						 * @param {array || string} deprecatedValues The deprecated value, if its an array, its multiple values to check for
						 * @param {string} newValue The new value to check for if the deprecated value doesn't exist
						 * @param {boolean} defaultVal The default value if the prop is not found under both windowService and dockingService
						 */
						const checkDeprecatedAndCompare = (params) => {
							//Ex. params.baseString = "customData.foreign.services";
							//Ex. params.newPath = "windowService"
							//Ex. searchString = "customData.foreign.services.windowService"
							let searchString = params.baseString + "." + params.newPath;

							//Checks for new path - new properties
							let value = configUtil.getDefault(customData, searchString + "." + params.newValue, null);
							// console.log('checked for ', searchString, '.', params.newValue, ' and result is: ', value);
							if (value === null) {
								searchString = params.baseString + "." + params.oldPath;
								//Checks for old path - new properties
								value = configUtil.getDefault(customData, searchString + "." + params.newValue, null);
								// console.log('checked for ', searchString, '.', params.newValue, ' and result is: ', value);

								if (value === null) {
									if (Array.isArray(params.oldValue)) {
										for (let i = 0; i < params.oldValue.length; i++) {
											let depVal = params.oldValue[i];

											searchString = params.baseString + "." + params.oldPath;
											value = configUtil.getDefault(customData, searchString + "." + depVal, null);
											// console.log('checked for ', searchString + "." + depVal, ' and result is: ', value);
											if (value !== null) break;
										}
									} else {
										searchString = params.baseString + "." + params.oldPath;
										//Checks for old path - old properties
										value = configUtil.getDefault(customData, searchString + "." + params.oldValue, params.default);
										// console.log('checked for ', searchString, '.', params.oldValue, ' and result is: ', value);
									}
								}
							}

							// console.log('returning: ', value)

							return value;
						}

						// Additional function to register any dockable components with docking.
						// This will make docking aware of those dockable windows
						// and allow control over docking to window edges/moving windows out of claimed space
						if (customData && customData.component && customData.component.type !== "service") {

							let manageMovement = configUtil.getDefault(customData, "customData.foreign.services.windowService.manageWindowMovement", false);
							if (!manageMovement) {
								manageMovement = configUtil.getDefault(customData, "customData.foreign.services.dockingService.manageWindowMovement", false);
							}

							let FSBLHeader = configUtil.getDefault(customData, "customData.foreign.components.Window Manager.FSBLHeader", false);

							let isDockable = configUtil.getDefault(customData, "customData.window.dockable", false);

							//If 'manageWindowMovement' wasn't found, we still want to register with docking (and manage window movement) if the component isDockable or has an FSBLHeader
							manageMovement = manageMovement || FSBLHeader || isDockable;

							//Checks the config for deprecated props 'isArrangable' and 'isArrangeable'. If neither of these is found, will search 'allowAutoArrange'
							let autoArrange = checkDeprecatedAndCompare({
								baseString: "customData.foreign.services",
								newPath: "windowService",
								oldPath: "dockingService",
								oldValue: ["isArrangable", "isArrangeable"],
								newValue: "allowAutoArrange",
								default: manageMovement
							});

							//If the component wants its movement managed (or to be auto-arrangeable) it should register with docking
							let shouldRegister = manageMovement || autoArrange;

							if (!shouldRegister) return done();

							//Checks the config for deprecated prop 'ignoreSnappingRequests'. If not found, will search 'allowSnapping'.
							customData.window.snapping = checkDeprecatedAndCompare({
								baseString: "customData.foreign.services",
								newPath: "windowService",
								oldPath: "dockingService",
								oldValue: "ignoreSnappingRequests",
								newValue: "allowSnapping",
								default: manageMovement
							});

							//Since 'allowSnapping' is essentially 'if true enable' and 'ignoreSnappingRequests' is essentially 'if true disable' we need to toggle this value depending on what prop was found. The core code still uses 'ignoreSnappingRequests'.
							if (customData && customData.foreign && customData.foreign.services) {
								let service = customData.foreign.services.windowService !== undefined ? "windowService" : "dockingService";

								if (customData.foreign.services[service].ignoreSnappingRequests !== undefined) {
									customData.window.snapping = !customData.foreign.services[service].ignoreSnappingRequests;
								}
							}

							//Checks for an ephemeral component. Ephemeral components don't snap
							const ephemeral = configUtil.getDefault(customData, "customData.window.ephemeral", false);
							if (ephemeral && !customData.window.snapping) {
								customData.window.snapping = false;
							}

							//Checks the config for the deprecated prop 'ignoreTilingAndTabbingRequests'. If not found, will search 'allowTiling'.
							customData.window.tiling = checkDeprecatedAndCompare({
								baseString: "customData.foreign.services",
								newPath: "windowService",
								oldPath: "dockingService",
								oldValue: "ignoreTilingAndTabbingRequests",
								newValue: "allowTiling",
								default: manageMovement
							});

							//Checks the config for deprecated prop 'ignoreTilingAndTabbingRequests'. If not found, will search 'allowTabbing'.
							customData.window.tabbing = checkDeprecatedAndCompare({
								baseString: "customData.foreign.services",
								newPath: "windowService",
								oldPath: "dockingService",
								oldValue: "ignoreTilingAndTabbingRequests",
								newValue: "allowTabbing",
								default: manageMovement
							});

							//Since 'allowTiling'/'allowTabbing' is essentially 'if true enable' and 'ignoreTilingAndTabbingRequests' is essentially 'if true disable' we need to toggle this value depending on what prop was found.
							if (customData && customData.foreign && customData.foreign.services) {
								let service = customData.foreign.services.windowService !== undefined ? "windowService" : "dockingService";

								if (customData.foreign.services[service].ignoreTilingAndTabbingRequests !== undefined) {
									customData.window.tiling = !customData.window.tiling;
									customData.window.tabbing = !customData.window.tabbing;
								}
							}

							//Checks the deprecated config prop 'canGroup'. If not found, will search 'allowGrouping'.
							customData.window.canGroup = checkDeprecatedAndCompare({
								baseString: "customData.foreign.services",
								newPath: "windowService",
								oldPath: "dockingService",
								oldValue: "canGroup",
								newValue: "allowGrouping",
								default: manageMovement
							});

							//Checks the config for deprecated prop 'canMinimize'. If not found, will search 'allowMinimize'
							customData.window.canMinimize = checkDeprecatedAndCompare({
								baseString: "customData.foreign.services",
								newPath: "windowService",
								oldPath: "dockingService",
								oldValue: "canMinimize",
								newValue: "allowMinimize",
								default: undefined
							});

							/** The canMinimize and canMaximize config could be one
							 * of two locations. In a future (4.0) version, we should
							 * consolidate this to one location.
							 */
							if (customData.window.canMinimize === undefined) {
								customData.window.canMinimize = customData.component.canMinimize;
								if (customData.window.canMinimize === undefined) {
									customData.window.canMinimize = manageMovement;
								}
							}

							if (customData.window.canMaximize === undefined) {
								customData.window.canMaximize = customData.component.canMaximize;
								if (customData.window.canMaximize === undefined) {
									customData.window.canMaximize = manageMovement;
								}
							}

							//Determines whether a dockable component should retrieve its state from memory, or start with default (config defined) options every time
							customData.window.overwriteStartDocked = configUtil.getDefault(customData, "customData.foreign.services.workspaceService.global", false);

							self.registerWithDockingManager(customData.window, () => {
								self.cacheInitialBounds(done);
							});
						} else {
							return done();
						}
					}
				], (err, results) => callback(err, results));
			});
		});
	};
}

var windowClient = new WindowClient({
	startupDependencies: {
		services: ["storageService", "windowService"]
	},
	onReady: function (cb) {
		windowClient.start(cb);
	},
	name: "windowClient"
});

export default windowClient;
