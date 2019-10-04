import RouterClient from "../../clients/routerClientInstance";
import Logger from "../../clients/logger";
import { EventEmitter } from "events";
import DistributedStoreClient from "../../clients/distributedStoreClient";
import StorageClient from "../../clients/storageClient";
import * as util from "../util";
import { WindowEventManager } from "./WindowEventManager";
import * as constants from "../constants"
import { FinsembleEvent } from "./FinsembleEvent";

import { System } from "../../common/system";
/** This import syntax helps the compiler infer the types. */
import clone = require('lodash.cloneDeep');

declare global {
	interface Window {
		_FSBLCache: any;
	}
}

DistributedStoreClient.initialize();
StorageClient.initialize();
const BOUNDS_SET = "bounds-set";
const BOUNDS_CHANGING = "bounds-change-request";
const BOUNDS_CHANGED = "bounds-changed";
if (!window._FSBLCache) window._FSBLCache = {
	storeClientReady: false,
	windowStore: null,
	windows: {},
	gettingWindow: [],
	windowAttempts: {}
};

function retrieveManifestPromise() {
	return new Promise((resolve, reject) => {
		System.Application.getCurrent().getManifest(resolve, reject);
	});
}
export class FinsembleWindow {
	addListener: Function;
	Group: any;
	componentState: any;
	wrapState: WrapState;
	name: string;
	windowOptions: any;
	bounds: object;
	wrapStateChangeSubscription: any;
	WINDOWSTATE: any;
	parentWindow: any;
	windowKey: string;
	componentKey: string;
	TITLE_CHANGED_CHANNEL: string;
	TITLE_CHANGED_SUBSCRIPTION: any;
	windowState: number;
	identifier: WindowIdentifier;
	windowName: string;
	type: string;
	windowType: string;
	setWindowType: string;
	types: any;
	removeListener: Function;
	removeListeners?: Function;
	parentSubscribeID: any;
	eventManager: WindowEventManager;
	eventlistenerHandlerMap: Partial<{ [key in WindowEventName]: {
		handler: (...args) => void,
		internalHandler: (...args) => void,
		interceptor: FinsembleEvent,
		guid: string,
	}[] }> = {};
	guid: string;
	private settingParent: boolean;

	constructor(params) {
		this.types = {};
		//todo settle on a proper name for this property.
		this.wrapState = "initializing";
		this.componentState = {};
		this.windowState = FinsembleWindow.WINDOWSTATE.NORMAL;
		this.type = null;
		this.windowType = null;
		this.bounds = {};
		this.name;
		this.guid = Date.now() + "_" + Math.random();
		this.addListener = this.addEventListener;
		this.removeListener = this.removeEventListener;
		this.WINDOWSTATE = constants.WINDOWSTATE;
		this.windowOptions = {};
		//because we were doing this[i]=params[i] in the constructor jscrambler was creating a reference to "this" above _super_, causing everything to break and it made me cry.
		this.doConstruction(params);
		this.eventManager = new WindowEventManager({ name: this.name });
		this.TITLE_CHANGED_CHANNEL = "Finsemble." + this.name + ".titleChanged";
		this.componentKey = util.camelCase("activeWorkspace", this.name, this.name);
		this.windowKey = util.camelCase("activeWorkspace", this.name);

		FinsembleWindow.bindFunctions(this);
		this.setupListeners(this.name);
		this.listenForEvents();
	}

	//allows backwards compatibility.
	standardizeEventName(event) {
		switch (event) {
			//all of these should be deprecated in 3.5ish.
			case "bounds-set":
			case "stoppedMoving":
				return "bounds-change-end";
			case "startedMoving":
				return "bounds-change-start";
			case "bringToFront":
				return "broughtToFront";
			case "setParent":
				return "parent-set";
			case "clearParent":
				return "parent-unset";
		}
		return event;
	}

	_eventHandled(interceptor, guid, canceled: boolean = false) {
		Logger.system.debug("FinsembleWindow._eventHandled public", interceptor.event, this.identifier.windowName, guid, canceled);
		if (interceptor.delayable) RouterClient.publish(constants.EVENT_INTERRUPT_CHANNEL + "." + guid, { canceled: canceled });
	}

	addEventListener(eventName: WindowEventName, handler) {
		Logger.system.info("EVENT TAG. Event listener added", eventName, "on ", this.name);
		eventName = this.standardizeEventName(eventName);
		// We send this guid so that Window service can keep track of individual listeners for event interruption.
		let guid = Date.now() + "_" + Math.random();
		this.queryWindowService("addEventListener", { eventName: eventName, guid: guid });
		this.eventManager.listenForRemoteEvent(eventName, handler);
		let delayable = constants.INTERRUPTIBLE_EVENTS.includes(eventName);
		let cancelable = constants.INTERRUPTIBLE_EVENTS.includes(eventName);

		let interceptor = new FinsembleEvent({
			source: this,
			event: eventName,
			delayable: delayable,
			cancelable: cancelable
		});

		var internalHandler = (data) => {
			Logger.system.info("EVENT TAG. Internal event handler", eventName, "on ", this.name);
			// TODO: need to create event list with properties:
			interceptor.setData(data);
			handler(interceptor); // this is where a handler can delay the event
			if (delayable && interceptor.delayed) { // if delayed, wait for done
				RouterClient.publish(constants.EVENT_INTERRUPT_CHANNEL + "." + guid, { delayed: true });
				interceptor.addListener("done", (response) => {
					this._eventHandled(interceptor, guid, response.canceled)
				});
			} else { // if not delayed, it is done.
				this._eventHandled(interceptor, guid);
			}
		};

		//We want the final handler that's invoked is
		this.eventManager.addListener(eventName, internalHandler);

		if (!this.eventlistenerHandlerMap[eventName]) {
			this.eventlistenerHandlerMap[eventName] = [];
		}

		this.eventlistenerHandlerMap[eventName].push({
			handler: handler,
			internalHandler: internalHandler,
			interceptor: interceptor,
			guid: guid
		});
	}

	removeEventListener(eventName: WindowEventName, handler) {
		eventName = this.standardizeEventName(eventName);
		const promiseResolver = async (resolve) => {
			if (!this.eventlistenerHandlerMap[eventName]) { // trying to remove non-existent handler.
				Logger.system.debug("trying to remove non-existent handler", eventName);
				return resolve();
			}
			for (var i = this.eventlistenerHandlerMap[eventName].length - 1; i >= 0; i--) {
				let handlerStoredData = this.eventlistenerHandlerMap[eventName][i];
				if (handlerStoredData.handler === handler) {
					this.eventManager.removeListener(eventName, handlerStoredData.internalHandler);
					handlerStoredData.interceptor.removeAllListeners();
					RouterClient.publish(constants.EVENT_INTERRUPT_CHANNEL + "." + handlerStoredData.guid, { delayed: false, canceled: false });
					await this.queryWindowService("removeEventListener", { eventName: eventName, guid: handlerStoredData.guid });
					this.eventlistenerHandlerMap[eventName].splice(i, 1);
					resolve();
				}
			}
			resolve();
		}

		return new Promise(promiseResolver);
	}

	listenForEvents() {
		this.wrapStateChangeSubscription = RouterClient.subscribe("Finsemble.Component.State." + this.name, this.handleWrapStateChange);
	}

	public static WINDOWSTATE: any = {
		NORMAL: 0,
		MINIMIZED: 1,
		MAXIMIZED: 2,
		HIDDEN: 3
	};

	windowServiceChannelName(channelTopic) { let name = this.name || this.windowName; return `WindowService-Request-${channelTopic}`; }
	eventChannelName(channelTopic) { let name = this.name || this.windowName; return `WindowService-Event-${name}-${channelTopic}`; }

	listenForBoundsSet() {
		this.eventManager.listenForRemoteEvents(["bounds-change-start", "bounds-changing", "bounds-change-end"]);
	}
	animate(params = {}, callback = Function.prototype) {
		this.queryWindowService("animate", params, callback);
	}

	getWindowStore(cb) {
		if (window._FSBLCache.windowStore) {
			return cb(window._FSBLCache.windowStore);
		}
		DistributedStoreClient.createStore({ store: "Finsemble-Windows", global: true }, (err, store) => {
			window._FSBLCache.windowStore = store;
			cb(store);
		});
	}

	doConstruction(params) {
		//TODO this is the same as wrap (eventually this should spawn)
		if (!params.setWindowType && !params.windowType) { //Default WindowType
			params.windowType = "OpenFinWindow";
		}
		if (params.windowType) { //We need to make a specific kind of Window
			params.setWindowType = params.windowType;
			delete params.windowType; //Prevent infinite loop
			let BW = FinsembleWindow as any; //have to do this because we're mutating the class using static functions and all kinds of bad stuff. This tells the typescript compiler that the FinsembleWindow here is of type any -- basically don't worry about its type.

			var childClassObject = new BW(params);
			//childClassObject.windowType = windowType;
			return childClassObject;
		}  //We are a specific kind of window
		if (params) {
			for (var i in params) {
				this[i] = params[i];
			}
		}
		if (!this.name) this.name = params.windowName;
		this.windowType = this.setWindowType;

	}

	static registerType(name, type) {
		let BW = FinsembleWindow as any; //have to do this because we're mutating the class using static functions and all kinds of bad stuff. This tells the typescript compiler that the FinsembleWindow here is of type any -- basically don't worry about its type.

		if (!BW.types) {
			BW.types = {};
		}
		BW.types[name] = type;
	}

	/**
	 * This is used to bind all functions only in FinsembleWindow and not in the child wrappers to the wrappers. Without this binding, the value of "this" in the functions is wrong.
	 * @param {} obj
	 */
	static bindFunctions(obj) {
		obj.setParent = obj.setParent.bind(obj);
		obj.getParent = obj.getParent.bind(obj);
		obj.eventChannelName = obj.eventChannelName.bind(obj);
		obj.windowServiceChannelName = obj.windowServiceChannelName.bind(obj);
		obj.setupListeners = obj.setupListeners.bind(obj);
		obj.onTitleChanged = obj.onTitleChanged.bind(obj);
		obj.handleWrapRemoveRequest = obj.handleWrapRemoveRequest.bind(obj);
		obj.listenForBoundsSet = obj.listenForBoundsSet.bind(obj);
		obj._eventHandled = obj._eventHandled.bind(obj);
	}

	// set up this window's listeners
	setupListeners(name) {
		Logger.system.debug("FinsembleWindow parent change notification setup", name);

		this.TITLE_CHANGED_SUBSCRIPTION = RouterClient.subscribe(this.TITLE_CHANGED_CHANNEL, this.onTitleChanged);
	}

	onTitleChanged(err, response) {
		if (!response || !response.data || typeof response.data !== "string") return;
		//this.windowOptions.title = response.data;
		this.eventManager.trigger("title-changed", {
			title: response.data
		});
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// The window wrappers
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Async wrap. Given a name/windowName, it will query the launcher for information required to wrap the window. Then it will return an object that can be operated on. Also this creates a cache of all wrapped windows for performance. Our clients wrap the same window often and this was causing excessive messaging to the store and degrading performance.
	 * @param {*} params Need only name in most cases. For service and other cases where the window is not part of what the launcher considers active windows, name and uuid are required
	 * @param {boolean} params.waitForReady If true, will async await for Finsemble to return ready before continuing to build the instance to return
	 * @param {*} cb
	 */
	static wrap = FinsembleWindow.getInstance;
	static getInstance(params, cb = Function.prototype): Promise<{ wrap: FinsembleWindow }> { // new async wrap
		let myName = System.Window.getCurrent().name;
		if (params && params.windowName) {
			params.name = params.windowName;
		}
		params = clone(params); // this function modifies params so clone to be safe

		if (!params || !params.name) return cb("name is required");
		params.windowName = params.name;

		async function promiseResolver(resolve, reject) {
			//Return early if we already have the wrap cached.
			if (window._FSBLCache.windows[params.name]) {
				Logger.system.debug("WRAP LIFECYCLE:", params.name, "Window found in the cache, returning without going to the Launcher");
				let wrap = window._FSBLCache.windows[params.name];
				//@exit
				resolve({ wrap })
				return cb(null, wrap);
			}

			//If we already have all of the information, just call createWrap.
			if (params.uuid && params.name) {
				if (!params.windowIdentifier) {
					params.windowIdentifier = {
						uuid: params.uuid,
						name: params.name,
						windowName: params.name,
						windowType: params.windowType
					}
				}

				if (params.waitForReady !== false) {
					try {
						await FinsembleWindow._windowReady(params.windowName); // wait to ensure the window is fully ready in the window service
					} catch (err) {
						reject(err);
						return cb(err, null);
					}
				}

				Logger.system.debug("WRAP LIFECYCLE:", params.name, "All information for wrap passed in, creating wrap locally");
				//Multiple requests for the same window could've come in at once. Right before we create this wrap, we should check that it hasn't been cached while we were waiting for _windowReady to resolve.
				if (window._FSBLCache.windows[params.name]) {
					Logger.system.debug("WRAP LIFECYCLE:", params.name, "Window found in the cache, returning without going to the Launcher");
					let wrap = window._FSBLCache.windows[params.name];
					//@exit
					resolve({ wrap })
					return cb(null, wrap);
				}

				let { wrap } = await FinsembleWindow._createWrap(params);

				//@exit
				resolve({ wrap });
				return cb(null, wrap);
			}

			if (params.waitForReady !== false) {
				try {
					await FinsembleWindow._windowReady(params.windowName); // wait to ensure the window is fully ready in the window service
				} catch (err) {
					reject(err);
					return cb(err, null);
				}
			}

			//All we have is a windowName. we send a request to the launcher for more information so that we can construct the proper object. This also the place where
			RouterClient.query("WindowService-Request-getWindowIdentifier", { windowName: params.name, requester: myName }, onWrapInformationReceived);

			async function onWrapInformationReceived(err, response) {
				if (err) {
					Logger.system.error(err);
					//@exit
					reject(err);
					return cb(err, null);
				}

				if (window._FSBLCache.windows[params.name]) {
					let wrap = window._FSBLCache.windows[params.name];
					Logger.system.debug("WRAP LIFECYCLE:", params.name, "Information received from launcher, but wrap exists in cache. Returning cached wrap.");
					//@exit
					resolve({ wrap })
					return cb(null, wrap);
				}

				let { identifier } = response.data;
				if (identifier.windowName) {
					identifier.name = identifier.windowName;
				}
				Logger.system.debug("WRAP LIFECYCLE:", params.name, "Information received from launcher. Creating wrap.");

				params.retrievedIdentifier = identifier;
				let { wrap } = await FinsembleWindow._createWrap(params);

				if (response.data.descriptor) {
					wrap.descriptor = response.data.descriptor;
				}

				//@exit
				resolve({ wrap });
				cb(null, wrap);
			}
		}

		return new Promise(promiseResolver);
	}

	/**
	 * Method for determining whether the window being wrapped is the startup app's main window (the service manager).
	 *
	 * @static
	 * @memberof FinsembleWindow
	 */
	static isStartupApplication = async function (windowName): Promise<boolean> {
		let isStartupApplication;
		// Here, we get the application 'manifest'. This will only be returned _if the application was created via the manifest_. In other words, this will only work if we're in the startup app.

		const manifest: any = await retrieveManifestPromise()
			.catch((e) => {
				// If the application executing FinsembleWindow was created via the API getManifest will
				// reject with an error. If that happens, we know we're not in the service manager, so we can just assign it to false and move on.
				isStartupApplication = false;
			});
		// If the window that I'm in is the same window as the startup app, I am the service manager.
		// We cannot wrap the service manager.

		// No need to do these checks if we're in a window that lives in the startup app.
		if (manifest) {
			switch (fin.container) {
				case "Electron":
					isStartupApplication = manifest && manifest.startup_app && manifest.startup_app.name === windowName;
					break;
				default:
					// openfin takes the uuid of the startup app as defined in the manifest and assigns it to the name of the main window for the startup app.
					isStartupApplication = manifest && manifest.startup_app && manifest.startup_app.uuid === windowName;
			}
		}
		return isStartupApplication;
	}


	static _windowReady = function (windowName) {
		Logger.system.debug(`windowServiceReady: ${windowName} starting`);
		let subscribeId;
		const COMPONENT_STATE_CHANGE_CHANNEL = "Finsemble.Component.State." + windowName;
		const promiseResolver = async (resolve, reject) => {
			// Subscribe handler for component state. Once new state is retrieved, resolve out of _windowReady
			// This is a closure so it easily has access to the promise resolve method.
			function onComponentStateChanged(err, response) {
				let state: WrapState = response.data.state;
				Logger.system.debug(`windowServiceReady: ${windowName} state change: ${state}`);
				console.log(`windowServiceReady: ${windowName} state change: ${state}`);
				switch (state) {
					// if ready state or any state beyond
					case "ready":
					case "reloading":
					case "closing":
						Logger.system.debug(`windowServiceReady: ${windowName} ${state}`);
						RouterClient.unsubscribe(subscribeId);
						resolve();
						break;
				}
			}

			let isStartupApplication = await FinsembleWindow.isStartupApplication(windowName);

			if (isStartupApplication || windowName.toLowerCase().endsWith("service")) {
				reject("Cannot Wrap Service Manager or Services");
			} else {
				// wait only for components managed by the window service
				Logger.system.debug(`windowServiceReady: ${windowName} waiting`);
				subscribeId = RouterClient.subscribe(COMPONENT_STATE_CHANGE_CHANNEL, onComponentStateChanged);
			}
		}

		return new Promise(promiseResolver);
	};

	/**
	 * Creates a Finsemble WindowWrap
	 * @param {*} params
	 * @param {string} params.name The name of the window
	 * @param {*} [params.retrievedIdentifier] Retrieved window identifier
	 * @param {*} [params.windowIdentifier] The window identifier
	 * @param {boolean} [param.setWindowType] If true, will set the window type
	 */
	static _createWrap(params): any {
		function promiseResolver(resolve, reject) {
			let identifier = params.retrievedIdentifier || params.windowIdentifier;
			let wrap: any = null;
			if (typeof window._FSBLCache.windowAttempts[params.name] === "undefined") window._FSBLCache.windowAttempts[params.name] = 0;

			//OpenfinApplication is essentially just an openfinWindow in its own process. We can wrap it just like a window.
			if (!params.setWindowType && !identifier.windowType || identifier.windowType === "OpenFinApplication") { //Default WindowType
				identifier.windowType = "OpenFinWindow";
			}

			//Top level keeps important info (e.g., uuid, name, windowType).
			let paramsForWindow = Object.assign({}, identifier);
			//Also pull in anything that was passed into the constructor (e.g., windowDescriptor, etc);
			paramsForWindow = Object.assign(paramsForWindow, params);
			paramsForWindow.setWindowType = paramsForWindow.windowType;
			delete paramsForWindow.windowType; //Prevent infinite loop

			Logger.system.debug("WRAP LIFECYCLE: Placing wrap into the local cache.", identifier.windowName);

			let BW = FinsembleWindow as any; //have to do this because we're mutating the class using static functions and all kinds of bad stuff. This tells the typescript compiler that the FinsembleWindow here is of type any -- basically don't worry about its type.
			window._FSBLCache.windows[identifier.windowName] = new BW(paramsForWindow);
			wrap = window._FSBLCache.windows[identifier.windowName]
			wrap.windowType = identifier.windowType;
			wrap.identifier = identifier;
			wrap.addEventListener("closed", wrap.handleWrapRemoveRequest);
			wrap.addEventListener("maximized", () => {
				wrap.windowState = FinsembleWindow.WINDOWSTATE.MAXIMIZED;
			});
			wrap.addEventListener("minimized", () => {
				wrap.windowState = FinsembleWindow.WINDOWSTATE.MINIMIZED;
			});
			wrap.addEventListener("restored", () => {
				wrap.windowState = FinsembleWindow.WINDOWSTATE.NORMAL;
			});

			//Subscribe to parent inside the wrap so if getInstance is called after window creation the parent window will be available.
			wrap.parentSubscribeID = RouterClient.subscribe(`Finsemble.parentChange.${identifier.windowName}`, (err, message) => {
				if (err) {
					Logger.system.error("FinsembleWindow parent change notification error", err);
					resolve({ wrap });
				} else {
					var parentState = message.data || {};

					if (parentState.type === "Added") {
						Logger.system.debug("FinsembleWindow Parent Notification: window.addedToStack listener", parentState);
						wrap.setParent(parentState.stackedWindowIdentifier, () => { resolve({ wrap }); });
					} else if (parentState.type === "Exists") {
						Logger.system.debug("FinsembleWindow Parent Notification: Parent already exists, checking if added to wrap", parentState);
						wrap.setParentOnWrap(parentState.stackedWindowIdentifier, () => { resolve({ wrap }); });
					} else if (parentState.type === "Removed") {
						Logger.system.debug("FinsembleWindow Parent Notification: window.removedFromStack listener", parentState);
						wrap.clearParent();
						resolve({ wrap });
					} else if (parentState.type) { // if defined but unknown type
						Logger.system.error("FinsembleWindow Parent Notification: unknown type", parentState);
						resolve({ wrap });
					}
					else {
						resolve({ wrap });
					}
				}
			});
		}
		return new Promise(promiseResolver);
	}

	static _getRemoveWrapChannel(name) {
		return `${System.Window.getCurrent().name}.removeWrap.${name}`;
	}

	// this routine handles the close event, but also called without event from FSBL
	async handleWrapRemoveRequest(event) {
		if (event) event.wait();
		Logger.system.debug("WRAP Destructor. Removing cached window", this.name, "in ", window.name);
		//wrap is the openfin or stacked window. if the removeListeners function exists, we remove all listeners we added during the lifecycle of that window wrapper.
		if (this.removeListeners) {
			this.removeListeners();
		}

		// do not move this line of code. The order of execution is important.
		this.cleanupRouter();

		//Remove all event listeners.
		for (let eventName in this.eventlistenerHandlerMap) {
			console.log("Event name in for loop", eventName);
			let events = this.eventlistenerHandlerMap[eventName];
			for (let i = 0; i < events.length; i++) {
				Logger.system.log("WRAP Destructor. removeEventListener", eventName, this.name, "in", window.name);
				await this.removeEventListener(eventName as WindowEventName, events[i].handler);
				console.log("Event name listener removed", eventName);
			}
		}
		Logger.system.log("WRAP Destructor. removeEventListener DONE");
		console.log("handleWrapRemoveRequest name Done!");

		if (event) event.done();

		this.eventManager.cleanup();

		if (this.name !== window.name) {
			delete window._FSBLCache.windows[this.name];
			delete window._FSBLCache.windowAttempts[this.name];
		}
	}

	cleanupRouter() {
		const REMOVE_WRAP_CHANNEL = FinsembleWindow._getRemoveWrapChannel(this.name);
		RouterClient.removeResponder(REMOVE_WRAP_CHANNEL);

		if (this.TITLE_CHANGED_SUBSCRIPTION) {
			RouterClient.unsubscribe(this.TITLE_CHANGED_SUBSCRIPTION);
		}
		RouterClient.unsubscribe(this.parentSubscribeID);
		RouterClient.unsubscribe(this.wrapStateChangeSubscription);
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Handlers to generate wrapper events from incoming transmits
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	handleWrapStateChange = (err, response) => {
		let state: WrapState = response.data.state;
		if (state !== this.wrapState) {
			this.wrapState = state;
			// 5/1/19: JoeC. Eventmanager wasn't throwing ready event, so all ready listeners would never fire
			if (this.wrapState === "ready") {
				this.eventManager.trigger('ready');
			}
			this.eventManager.trigger("wrap-state-changed", {
				state
			});
		}
	}

	onReady(callback) {
		if (this.wrapState === "ready") {
			return callback();
		}
		this.eventManager.on("ready", callback);
	}
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Common template for window-function requests to window service -- see public functions
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * @param {string} methodName method name (e.g. "minimize", "maximize")
	 * @param {object} params
	 * @param {function=} callback
	 * @memberof FinsembleWindow
	 * @private
	 */
	queryWindowService(methodName, params, callback = Function.prototype) {

		const promiseResolver = async (resolve) => {

			if (typeof params === "function") {
				callback = params;
				params = {};
			}
			params = params || {};
			params.windowIdentifier = this.identifier; // add this window's identifier

			// if Logger debug is enable, then add call stack to query parameters for debugging -- shows where public window requests originated
			if (Logger.setting().system.Debug) {
				params.callstack = Logger.callStack(); // add callstack to query for debugging -- shows where public window requests originated
			}

			Logger.system.debug("FinsembleWindow.queryWindowService", this.windowServiceChannelName(methodName), params);

			var responseData = null;

			RouterClient.query(this.windowServiceChannelName(methodName), params, (err, queryResponseMessage) => {
				if (err) {
					Logger.system.warn(`WindowService.${methodName}: failed`, err);
					console.debug(`WindowService.${methodName}: failed`, err);
				} else {
					responseData = queryResponseMessage.data;
					Logger.system.debug(`${this.windowServiceChannelName(methodName)} successful`, responseData);
					console.debug(`${this.windowServiceChannelName(methodName)} successful`, responseData);
				}
				resolve();
				callback(err, responseData);
			});
		}

		return new Promise(promiseResolver);
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Core Window Functions: can be invoked by any service or component.  Most are sent to the WindowService to be executed.
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Core Public Window Functions: can be invoked by any service or component.  These are sent to the WindowService to be executed.
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	minimize(params, callback) {
		this.queryWindowService("minimize", params, callback);
	}

	maximize(params, callback) {
		this.queryWindowService("maximize", params, callback);
	}

	restore(params, callback) {
		this.queryWindowService("restore", params, callback);
	}

	blur(params = {}, callback = Function.prototype) {
		this.queryWindowService("blur", params, callback);
	}

	focus(params = {}, callback = Function.prototype) {
		this.queryWindowService("focus", params, callback);
	}

	bringToFront(params?, callback?) {
		this.queryWindowService("bringToFront", params, callback);
	}

	isShowing(params, callback) {
		this.queryWindowService("isShowing", params, callback);
	}

	setBounds(params, callback) {
		if (typeof params !== "function" && !params.bounds) {
			let oldParams = params;
			params = {};
			params.bounds = oldParams;
		}
		this.queryWindowService("setBounds", params, callback);
	}

	getBounds(params, callback = Function.prototype) {
		const promiseResolver = (resolve) => {
			this.queryWindowService("getBounds", params, (err, bounds) => {
				resolve({ err, data: bounds });
				callback(err, bounds);
			});
		};

		return new Promise(promiseResolver);
	}

	updateOptions(params, callback) {
		this.queryWindowService("updateOptions", params, callback);
	}

	hide(params?, callback?) {
		this.queryWindowService("hide", params, callback);
	}

	show(params, callback?) {
		this.queryWindowService("show", params, callback);
	}

	showAt(params, callback) {
		this.queryWindowService("showAt", params, callback);
	}

	close(params = {}, callback = Function.prototype) {
		Logger.system.debug("WRAP CLOSE. Public close initiated for", this.name, params);
		this.queryWindowService("close", params, () => {
			Logger.system.debug("WRAP CLOSE. Public close initiated for", this.name);
			callback();
		});
	}


	/**
	 *Register a window with docking. Use this if you don't want to use the full initialization function
	 *
	 * @param {Object} params - can be anything that is passed to docking for window registration. @todo This should be removed soon
	 * @param {Function} cb
	 * @memberof FSBLWindow
	 */
	registerWithDocking(params, cb) {
		RouterClient.query("DockingService.registerWindow", {
			type: this.type,
			windowType: this.windowType,
			windowMsg: params,
			name: this.windowName
		}, cb);
	}
	/**
	 *Unregister a window with docking
	 *
	 * @memberof FSBLWindow
	 */
	unRegisterWithDocking() {
		RouterClient.transmit("DockingService.deregisterWindow", { name: this.windowName });
	}
	/**
	 *This is if we want to handle the full register/ready state inside of the window
	 register with docking
	 send the message to launcher saying that component is ready
	 *
	 * @memberof FSBLWindow
	 */
	initializeWindow(params, cb) {
		this.registerWithDocking(params, () => {
			RouterClient.publish("Finsemble." + this.windowName + ".componentReady", { // signal workspace and launcher service that component is ready
				name: this.windowName
			});
		});
	}
	wrapReady() {
		RouterClient.publish("Finsemble." + this.windowName + ".wrapReady", { name: this.windowName, state: "open" });
	}

	setOpacity(params, callback) {
		this.queryWindowService("setOpacity", params, callback);
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Other BaseClass Function: These are common functions shared across derived classes
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Invoked to indicate an operation (e.g. dragging out of tab region) has started. This signals the Docking service to start tracking the mouse location and invoking tiling behavior as needed. Typically inherited (base function only).
	 * @param {object} params for future use
	 *
	 * @example
	 *	// dragging tab example using tracking and group
	 * 	FinsembleWindow.startTabTileMonitoring();
	 *	// if dragging tab is in a group, then remove it given tracking results will decide what to do with the window
	 * 	FinsembleWindow.Group.getGroupID(this.identifier, function (err, tileGroupId) {
	 * 		if (!err) { // if no error then must be in a tile group
	 *			self.Group.removeWindow(this.identifier);
	 *		}
	 *	});
	 */
	startTabTileMonitoring(params) {
		Logger.system.debug("FinsembleWindow.startTabTileMonitoring", params);
		RouterClient.transmit("TabTile.startTabTile", { params });
	}

	/**
	 * Invoked by client originating a dragStart that it has has ended. Typically inherited (base function only).
	 * @param {object} params for future use
		 * @param {function=} callback option callback that support overriding default behavior
	 *
	 * 	FinsembleWindow.stopTabTileMonitoring(params, function(err, results, defaultTabTileAction) {
	 * 		// . . . custom code goes here . . .
	 *		defaultTabTileAction(results); // now take default action or call your own function instead
	 * 	});
	 *
	 */
	stopTabTileMonitoring(params, callback) {
		Logger.system.debug("FinsembleWindow.stopTabTileMonitoring", params);
		RouterClient.query("TabTile.stopTabTile", { params }, function (err, queryResponseMessage) {
			if (err) {
				Logger.system.warn("TabTile.stopTabTile: query failed", err);
			} else {
				Logger.system.debug("TabTile.stopTabTile results", queryResponseMessage.data);
			}
			var stopTabTileResults = queryResponseMessage.data;
			if (callback) {
				callback(err, stopTabTileResults, this.defaultStopTrackingAction);
			} else {
				this.defaultTabTileAction(stopTabTileResults);
			}
		});
	}

	/**
	 * Defines default TabTile action for stopTabTileMonitoring.  May be overridden by client -- see example in stopTabTileMonitoring. Typically inherited (base function only).
	 *
	 * @param {any} stopTabTileResults
	 * @memberof FinsembleWindow
	 *
	 * @private
	 */
	defaultTabTileAction(stopTabTileResults) {
		let self = this;
		Logger.system.debug("FinsembleWindow.defaultTabTileAction", stopTabTileResults);
		switch (stopTabTileResults.stoppedLocation) {
			case "OutsideWindow":
				// move window to drop location (since for now assuming only single-tabbed windows)
				break;
			case "TabSection":
				// WindowStack.addWindowToStack(callback) // for when we get to tabbing
				break;
			case "InsideWindow":
				if (stopTabTileResults.tileGroupId) { // if dropped in an existing tile group (which might be the same it was dragging from)
					self.Group.addWindow(this.identifier, stopTabTileResults.tileGroupId, stopTabTileResults.dropCoordinates);
				} else { // if dropped in a separate window outside a tile group
					self.Group.createGroup(function (newGroupId) {
						// add dragging window to new tile group, but specify the dropped on window as the starting window in the tile group
						self.Group.addWindow(this.identifier, newGroupId, stopTabTileResults.dropCoordinates, { startingWindowIdentifier: stopTabTileResults.droppedOnWindowIdentifier });
					});
				}
				break;
			default:
				Logger.system.error("stopTracking returned an unknown stoppedLocation result", stopTabTileResults);
		}
	}

	mergeBounds(bounds) {
		bounds.right = bounds.left + bounds.width;
		let newBounds = { left: bounds.left, right: bounds.right, width: bounds.width, top: bounds.top, bottom: bounds.top + bounds.height, height: bounds.height };
		let defaultBounds = { defaultLeft: bounds.left, defaultWidth: bounds.width, defaultTop: bounds.top, defaultHeight: bounds.height };
		Object.assign(this.windowOptions, newBounds);
		Object.assign(this.windowOptions, defaultBounds);
		this.windowOptions.bounds = newBounds;
	}

	startMove(params) {
		Logger.system.debug("FinsembleWindow.startMove", params);
		params = params || {};
		params.windowIdentifier = this.identifier; // add this window's identifier
		RouterClient.transmit(this.eventChannelName("startedMoving"), {});
	}

	stopMove(params) {
		Logger.system.debug("FinsembleWindow.stopMove", params);
		params = params || {};
		params.windowIdentifier = this.identifier; // add this window's identifier
		RouterClient.transmit(this.eventChannelName("stoppedMoving"), {});
	}

	/**
	 * Get Monitor for this window
	 *
	 * @param {function} cb Callback
	 */
	getMonitor(cb) {

		RouterClient.query("DockingService.getMonitorForWindow",
			{ windowIdentifier: this.identifier }
			, (err, message) => message ? cb(message.data) : cb());
	}

	/**
	 * Given params, will return the component state. Either the params to search for, or the entire state.
	 *
	 * @param {object} params
	 * @param {string} params.field field
	 *  @param {array} params.fields fields
	 * @param {function} cb Callback
	 */
	getComponentState(params, cb) {
		this.queryWindowService("getComponentState", params, cb);
	}

	/**
	 * Given params, will return the window state. Either the params to search for, or the entire state.
	 *
	 * @param {object} params
	 * @param {string} params.field field
	 *  @param {array} params.fields fields
	 * @param {function} cb Callback
	 */
	getWindowState(params, cb) {
		this.queryWindowService("getWindowState", params, cb);
	}

	/**
	 * Given params, will set the component state. Any fields included will be added to the state
	 *
	 * @param {object} params
	 * @param {string} params.field field
	 *  @param {array} params.fields fields
	 * @param {function} cb Callback
	 */
	setComponentState(params, cb) {
		this.queryWindowService("setComponentState", params, cb);
	}


	/**
	 * Removes one or more specified attributes from either component or window state in storage
	 * for this window.
	 *
	 * In addition to the name of the window, params should include either a `field`
	 * property as a string or a `fields` property as an array of strings.
	 *
	 * @param {object} params
	 * @param {string} [params.field] field
	 * @param {array} [params.fields] fields
	 * @param {function} cb Callback
	 */
	removeComponentState(params: {
		field?: string,
		fields?: { field: string }[],
		windowName?: string
	}, cb: StandardCallback = (e, r) => { }) {
		this.queryWindowService("removeComponentState", params, cb);
	}

	/**
	 * Given params, will set the window state. Any fields included will be added to the state
	 *
	 * @param {object} params
	 * @param {string} params.field field
	 *  @param {array} params.fields fields
	 * @param {function} cb Callback
	 */
	setWindowState(params, cb) {
		this.queryWindowService("setWindowState", params, cb);
	}

	saveCompleteWindowState(params, cb) {
		this.queryWindowService("saveCompleteWindowState", params, cb);
	}


	/**
	 *Cancels startTabTileMonitoring. Example use is a user "escapes" out of a drag operation.
	 *
	 * @param {object} params for future use
	 * @memberof FinsembleWindow
	 */
	cancelTabTileMonitoring(params) {
		Logger.system.debug("FinsembleWindow.cancelTabTileMonitoring", params);
		RouterClient.transmit("TabTile.cancelTabTile", { params });
	}

	/**
	 * Return the parent window's wrapper (e.g. StackedWindow).
	 *
	 */
	getParent(cb) {
		if (this.settingParent) {
			FinsembleWindow.getInstance(this.settingParent, (err, stackWrap) => {
				cb(null, stackWrap);
			});
		} else if (this.parentWindow) {
			cb(null, this.parentWindow);
		} else {
			cb(null, null);
		}

	}

	/**
	 * Sets the parent window (e.g. stackedWindow) and emits "setParent" event to window listeners.
	 *
	 * @param {object} stackedWindowIdentifier identifer of window to set as parent (e.g. stackedWindowIdentifier).
	 *
	 */
	setParent(stackedWindowIdentifier, cb = Function.prototype) {
		if (this.settingParent) return this.getParent(cb); //TODO check if the parent is different
		this.settingParent = stackedWindowIdentifier;

		if (this.parentWindow && (this.parentWindow.name === stackedWindowIdentifier.windowName)) {
			Logger.system.debug("FinsembleWindow.setParent already set", stackedWindowIdentifier);
			this.settingParent = false;
			cb(null, this.parentWindow);
		} else {
			this.queryWindowService("setParent", stackedWindowIdentifier, (err, message) => {
				Logger.system.debug("FinsembleWindow.setParent", stackedWindowIdentifier);
				FinsembleWindow.getInstance(stackedWindowIdentifier, (err, wrappedStackedWindow) => {
					if (!err) {
						Logger.system.debug("FinsembleWindow.setParent wrap success", stackedWindowIdentifier);
						this.parentWindow = wrappedStackedWindow;
						if (!this.parentWindow.windowType.includes("StackedWindow")) {
							Logger.system.error("FinsembleWindow.setParent error", this.parentWindow.name, stackedWindowIdentifier.windowName);
						}
					} else {
						Logger.system.error("FinsembleWindow.setParent error", err);
					}
					this.settingParent = false;
					this.eventManager.trigger("parent-set", { parentName: this.parentWindow.name });
					cb(err, wrappedStackedWindow);
				});
			});

		}
	}

	/**
	 * Sets the parent window (e.g. stackedWindow) on a window wrap.
	 * This is for the case where a window already has a parent but it's wrap doesn't know about it.
	 *
	 * @param {object} stackedWindowIdentifier identifer of window to set as parent (e.g. stackedWindowIdentifier).
	 *
	 */
	setParentOnWrap(stackedWindowIdentifier, cb = Function.prototype) {
		if (this.parentWindow && (this.parentWindow.name === stackedWindowIdentifier.windowName)) {
			Logger.system.debug("FinsembleWindow.setParentOnWrap already set", stackedWindowIdentifier);
			cb(null, this.parentWindow);
		} else {
			this.queryWindowService("setParent", stackedWindowIdentifier, (err, message) => {
				Logger.system.debug("FinsembleWindow.setParentOnWrap", stackedWindowIdentifier);
				FinsembleWindow.getInstance(stackedWindowIdentifier, (err, wrappedStackedWindow) => {
					if (!err) {
						Logger.system.debug("FinsembleWindow.setParentOnWrap success getting wrap", stackedWindowIdentifier);
						console.debug("FinsembleWindow.setParentOnWrap success getting wrap", this, wrappedStackedWindow);
						this.parentWindow = wrappedStackedWindow;
						if (this.parentWindow.windowType.includes("StackedWindow") === false) {
							Logger.system.error("FinsembleWindow.setParentOnWrap error", this.parentWindow.name, stackedWindowIdentifier.windowName);
						}
					} else {
						Logger.system.error("FinsembleWindow.setParentOnWrap error", err);
					}
					cb(err, wrappedStackedWindow);
				});
			});

		}
	}

	/**
	 * Clears the parent reference and emits "clearParent" event to window listeners. Used only internally.
	 *
	 * @private
	 *
	 */
	clearParent() {
		Logger.system.debug("FinsembleWindow.clearParent", this.parentWindow);
		this.eventManager.trigger("parent-unset", {
			parentName: this.parentWindow.name
		});
		this.parentWindow = null;
	}

	setTitle(title) {
		Logger.system.debug("Title change", title);
		RouterClient.publish(this.TITLE_CHANGED_CHANNEL, title);
	}

	//todo needs to be a windowService query..
	getOptions(cb = Function.prototype) {
		this.queryWindowService("getOptions", {}, cb);
	}

	//CANDIDATES FOR REMOVAL

	//window client adds a callback here. This way, whenever close is called _anywhere_ in the system, it's passed down to the window client and cleanup can happen in the component.
	listenForClose(cb) {
		// let listener = (err, response) => {
		let listener = () => {
			delete window._FSBLCache.windows[this.name];
			delete window._FSBLCache.windowAttempts[this.name];
			//If the window that the wrap belongs to is the one calling close, just call the openfin method. Otherwise, some other window is trying to close it - so we send a message to that window, which will eventually close itself.
			for (let event in this.eventlistenerHandlerMap) {
				for (let i = 0; i < this.eventlistenerHandlerMap[event].length; i++) {
					this.eventlistenerHandlerMap[event][i].interceptor.removeAllListeners();
				}
			}
			this.eventManager.cleanup();
			RouterClient.removeListener(`${this.identifier.windowName}.close`, listener);
			// cb(response.data);
			cb();
		};
		this.eventManager.listenForRemoteEvent("closed", listener);

	}

	//TO BE REMOVED WHEN TABBING API IS PUT IN PLACe

	/**
	 * Handles common housekeeping checks and modifications on params at the beginning of each private window-management function
	 *
	 * @param {string} methodName method name (e.g. "minimize", "maximize")
	 * @param {object} params
	 * @memberof StackedWindow
	 * @private
	 */
	_privateManagementPreface(methodName, params, callback?: Function) {
		if (typeof params === "function") {
			Logger.system.error("StackedWindowWrapper.wrapPreface bad params", params);
		}
		params = params || {};
		params.stackedWindowIdentifier = { windowName: this.identifier.windowName, windowType: this.identifier.windowType }; // add this window's identifier
		Logger.system.debug(`StackedWindow.${methodName}  _privateManagementPreface`, params);

		return params;
	}
	/**
	 * Returns store for stacked window.  Example usage below.
	 *
	 * @memberof StackedWindow
	 *
	 * @example
	 * 		// get the state for one stacked window from the store
	 * 		getStore().getValue({ field: stackedWindowIdentifier.name, function (err, stackedWindowState) {}
	 *			where stackedWindowState is an object with the following properties
	 *				{
	 *					stackedWindowIdentifier: the stacked window identifier
	 *					childWindowIdentifiers: the window identifiers for all children in the stacked window
	 *					visibleWindowIdentifier: the window identifier for the currently visible window
	 *					bounds: the current window bounds/coordinates for the stacked window (i.e. the current bounds of the visible window)
	 *				}
	 */
	getStore(callback = Function.prototype) {
		return this.getWindowStore(callback);
	}
	/**
	 * Adds window as a child to a stacked window.  Adds to the top of the stack, or if specified to a specific location in the stack;
	 *
	 * @param {object=} params
		 * @param {object} params.stackedWindowIdentifier stacked window to operate on stacked window to operate on
		 * @param {object} params.windowIdentifier window to add
		 * @param {number=} params.position the location in the stack to push the window.  Location 0 is the bottom of the stack. Defaults to the top of stack.
		 * @param {boolean=} params.noSave if true then don't save the store after updating it (will be saved by caller)
	 * @param {function=} callback function(err)
	 * @memberof StackedWindow
	 */
	addWindow(params, callback = Function.prototype) {
		params = this._privateManagementPreface("addWindow", params);

		const promiseResolver = (resolve) => {
			RouterClient.query("StackedWindow.addWindow", params, (err, queryResponseMessage) => {
				Logger.system.debug("StackedWindow.addWindow callback", err, queryResponseMessage);
				callback(err, queryResponseMessage.data);
				resolve({ err, data: queryResponseMessage.data });
			});
		};
		return new Promise(promiseResolver);
	}

	/**
	 * Removes a child window from a stacked window.  If removed window was visible, then the bottom child window (position 0) in stack will be made visible.
	 *
		 * @param {object} params
	.	 * @param {object} params.stackedWindowIdentifier stacked window to operate on
	 * @param {object} params.windowIdentifier window to remove
	 * @param {boolean=} params.noDocking if true then do not register removed window with docking (the workspace is unaffected)
	 * @param {function=} callback function(err)
	 * @memberof StackedWindow
	 */
	removeWindow(params, callback = Function.prototype) {
		params = this._privateManagementPreface("removeWindow", params);

		const promiseResolver = (resolve) => {
			RouterClient.query("StackedWindow.removeWindow", params, (err, queryResponseMessage) => {
				Logger.system.debug("StackedWindow.removeWindow callback", err, queryResponseMessage);
				callback(err, queryResponseMessage.data);
				resolve({ err, data: queryResponseMessage.data });
			});
		};
		return new Promise(promiseResolver);
	}

	/**
	 * Removes a window from the stack then closes it.  If removed window was visible, then the bottom child window (position 0) in stack will be made visible.
	 *
		 * @param {object} params
	.	 * @param {object} params.stackedWindowIdentifier stacked window to operate on
	 * @param {object} params.windowIdentifier window to delete
	 * @param {function=} callback function(err)
	 * @memberof StackedWindow
	 */
	deleteWindow(params, callback = Function.prototype) {
		params = this._privateManagementPreface("deleteWindow", params);

		const promiseResolver = (resolve) => {
			RouterClient.query("StackedWindow.deleteWindow", params, (err, queryResponseMessage) => {
				Logger.system.debug("StackedWindow.deleteWindow callback", err, queryResponseMessage);
				callback(err, queryResponseMessage.data);
				resolve({ err, data: queryResponseMessage.data });
			});
		};
		return new Promise(promiseResolver);
	}

	/**
	 * Sets the visible window within the stack.  The previously visible window in stack will be automatically hidden.
	 *
		 * @param {object} params
	.	 * @param {object} params.stackedWindowIdentifier stacked window to operate on
	 * @param {object} params.windowIdentifier
	 * @param {function=} callback function(err)
	 * @memberof StackedWindow
	 */
	setVisibleWindow(params, callback = Function.prototype) {
		params = this._privateManagementPreface("setVisibleWindow", params);

		const promiseResolver = (resolve) => {
			RouterClient.query("StackedWindow.setVisibleWindow", params, (err, queryResponseMessage) => {
				Logger.system.debug("StackedWindow.setVisibleWindow callback", err, queryResponseMessage);
				callback(err, queryResponseMessage.data);
				resolve({ err, data: queryResponseMessage.data });
			});
		};
		return new Promise(promiseResolver);
	}

	/**
	 * Reorders the stack, but odes not affect visibility
	 *
		 * @param {object} params
	.	 * @param {object} params.stackedWindowIdentifier stacked window to operate on
	 * @param {array} params.windowIdentifiers array of windowIdentifiers which provides the new order
	 * @param {function=} callback function(err)
	 * @memberof StackedWindow
	 */
	reorder(params, callback = Function.prototype) {
		params = this._privateManagementPreface("reorder", params);

		const promiseResolver = (resolve) => {
			RouterClient.query("StackedWindow.reorder", params, (err, queryResponseMessage) => {
				Logger.system.debug("StackedWindow.reorder callback", err, queryResponseMessage);
				callback(err, queryResponseMessage.data);
				resolve({ err, data: queryResponseMessage.data });
			});
		};
		return new Promise(promiseResolver);
	}
}
