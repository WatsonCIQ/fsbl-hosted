// GENERAL NOTES RELATED TO WRAPPER CLEANUP
// 	TODO: only send events when there are listeners
// 	ToDO: fix name versus windowName
// 	TODO: should not be any checks for window methods: e.g. if (this.win._updateOptions) -- should have everything in base class
//	TODO: LauncherService should not be looking at workspace service bounds to determine monitor to use (need an architecture solution here)
// 	TODO: discuss BaseWindow.bindFunctions(this) (side note: I removed the extra bindings from the wrap)

import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";
import { EventEmitter } from "events";
import * as util from "../../../common/util";
import { isEqual as deepEqual } from "lodash";
import * as merge from "deepmerge";
import { WindowEventManager } from "../../../common/window/WindowEventManager";
import * as constants from "../../../common/constants"
import { FinsembleEvent } from "../../../common/window/FinsembleEvent";
import { System } from "../../../common/system";
import { WORKSPACE } from "../../../common/constants";
import { clone } from "../../../common/disentangledUtils";
declare global {
	interface Window {
		_FSBLCache: any;
	}
}

//This is bad. I don't like it. But without this, the typescript compiler complains. Our clients are just functions that 'inherit' via BaseClient.call. Typescript isn't smart enough to infer the BaseClient's methods, so if you call StorageClient.initialize, it complains.
//This will go away as we move those things into proper classes.
import DistributedStoreClient from "../../../clients/distributedStoreClient";
import StorageClient from "../../../clients/storageClient";
import WorkspaceClient from "../../../clients/workspaceClient";
DistributedStoreClient.initialize();
StorageClient.initialize();
const BOUNDS_SET = "bounds-set";
const BOUNDS_CHANGING = "bounds-change-request";
const BOUNDS_CHANGED = "disabled-frame-bounds-changed";
if (!window._FSBLCache) window._FSBLCache = {
	storeClientReady: false,
	windowStore: null,
	windows: {},
	gettingWindow: [],
	windowAttempts: {}
};
export type componentMutateParams = {
	field?: string,
	fields?: { field: string }[],
	key?: string,
	stateVar?: "componentState" | "windowState",
	topic?: string,
	value?: any
};
export class BaseWindow extends EventEmitter {
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
	removeListeners?: Function;
	parentSubscribeID: any;
	eventManager: WindowEventManager;
	eventlistenerHandlerMap: object = {}
	guid: "string";
	dockedPosition: number;
	enableWindowsAeroSnap: boolean;
	finishedMove: boolean;
	isMaximizing: boolean;

	constructor(params) {
		super();
		this.types = {};
		this.guid = util.guuid();
		//todo settle on a proper name for this property.
		this.wrapState = "initializing";
		this.componentState = {};
		this.windowState = BaseWindow.WINDOWSTATE.NORMAL;
		this.type = null;
		this.windowType = null;
		this.windowOptions = {};
		this.bounds = {};
		this.name;
		this.windowOptions = {};
		this.enableWindowsAeroSnap = false;
		//because we were doing this[i]=params[i] in the constructor jscrambler was creating a reference to "this" above _super_, causing everything to break and it made me cry.
		this.doConstruction(params);
		this.TITLE_CHANGED_CHANNEL = "Finsemble." + this.name + ".titleChanged";
		this.componentKey = util.camelCase("activeWorkspace", this.name, this.name);
		this.windowKey = util.camelCase("activeWorkspace", this.name);

		BaseWindow.bindFunctions(this);
		this.wrapStateChangeSubscription = RouterClient.subscribe("Finsemble.Component.State." + this.name, this.handleWrapStateChange);
		this.eventManager = new WindowEventManager({ name: this.name });
		this.finishedMove = true;
		// Prevents duplicate calls to maximize from corrupting the window state for OpenfinWindow and stackedWindow implementations
		this.isMaximizing = false;
	}

	public static WINDOWSTATE = constants.WINDOWSTATE;
	windowServiceChannelName(channelTopic) { let name = this.name || this.windowName; return `WindowService-Request-${channelTopic}`; }
	eventChannelName(channelTopic) { let name = this.name || this.windowName; return `WindowService-Event-${name}-${channelTopic}`; }

	listenForBoundsSet() {
		this.eventManager.addListener("bounds-change-start", this.handleBoundsSet);
		this.eventManager.addListener("bounds-changing", this.handleBoundsSet);
		this.eventManager.addListener("bounds-change-end", this.handleBoundsSet);
	}

	listenForBoundsChanging() {
		//todo, need to switch from bounds-change-request into bounds-changing.
		RouterClient.addListener(this.eventChannelName(BOUNDS_CHANGING), this.handleBoundsChanging);
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

	_startMove() {
		window["aeroMode"] = false;
		this.finishedMove = false;
	}

	_stopMove(markDirty = true) {
		this.finishedMove = true;
	}

	doConstruction(params) {
		//TODO this is the same as wrap (eventually this should spawn)
		if (!params.setWindowType && !params.windowType) { //Default WindowType
			params.windowType = "OpenFinWindow";
		}
		if (params.windowType) { //We need to make a specific kind of Window
			params.setWindowType = params.windowType;
			delete params.windowType; //Prevent infinite loop
			let BW = BaseWindow as any; //have to do this because we're mutating the class using static functions and all kinds of bad stuff. This tells the typescript compiler that the BaseWindow here is of type any -- basically don't worry about its type.

			const childClassObject = new BW.types[params.setWindowType](params);
			//childClassObject.windowType = windowType;
			return childClassObject;
		}  //We are a specific kind of window
		if (params) {
			for (let i in params) {
				this[i] = params[i];
			}
		}
		if (!this.name) this.name = params.windowName;
		this.windowType = this.setWindowType;

	}

	static registerType(name, type) {
		let BW = BaseWindow as any; //have to do this because we're mutating the class using static functions and all kinds of bad stuff. This tells the typescript compiler that the BaseWindow here is of type any -- basically don't worry about its type.

		if (!BW.types) {
			BW.types = {};
		}
		BW.types[name] = type;
	}

	/**
	 * This is used to bind all functions only in BaseWindow and not in the child wrappers to the wrappers. Without this binding, the value of "this" in the functions is wrong.
	 * @param {} obj
	 */
	static bindFunctions(obj) {
		obj.setParent = obj.setParent.bind(obj);
		obj.getParent = obj.getParent.bind(obj);
		obj.eventChannelName = obj.eventChannelName.bind(obj);
		obj.windowServiceChannelName = obj.windowServiceChannelName.bind(obj);
		obj.handleBoundsSet = obj.handleBoundsSet.bind(obj);
		obj.handleBoundsChanging = obj.handleBoundsChanging.bind(obj);
		obj.handleWindowHidden = obj.handleWindowHidden.bind(obj);
		obj.handleWindowShown = obj.handleWindowShown.bind(obj);
		obj.handleWindowMax = obj.handleWindowMax.bind(obj);
		obj.handleWindowMin = obj.handleWindowMin.bind(obj);
		obj.handleWindowRestore = obj.handleWindowRestore.bind(obj);
		obj.setupListeners = obj.setupListeners.bind(obj);
		obj.handleWindowBTF = obj.handleWindowBTF.bind(obj);
		obj.handleWindowStartMove = obj.handleWindowStartMove.bind(obj);
		obj.handleWindowStopMove = obj.handleWindowStopMove.bind(obj);
		obj.handleWindowDisabledFrameBoundsChanged = obj.handleWindowDisabledFrameBoundsChanged.bind(obj);
		obj.handleWindowStateChange = obj.handleWindowStateChange.bind(obj);
		obj.onTitleChanged = obj.onTitleChanged.bind(obj);
		obj.handleWrapRemoveRequest = obj.handleWrapRemoveRequest.bind(obj);
		obj.listenForBoundsChanging = obj.listenForBoundsChanging.bind(obj);
		obj._eventHandled = obj._eventHandled.bind(obj);
	}

	// set up this window's listeners
	setupListeners(name) {
		Logger.system.debug("BaseWindow parent change notification setup", name);

		this.parentSubscribeID = RouterClient.subscribe(`Finsemble.parentChange.${name}`, (err, message) => {
			if (err) {
				Logger.system.error("BaseWindow parent change notification error", err);
			} else {
				const parentState = message.data || {};

				if (parentState.type == "Added") {
					Logger.system.debug("BaseWindow Parent Notification: window.addedToStack listener", parentState);
					this.setParent(parentState.stackedWindowIdentifier);
				} else if (parentState.type == "Removed") {
					Logger.system.debug("BaseWindow Parent Notification: window.removedFromStack listener", parentState);
					this.clearParent();
				} else if (parentState.type === "Exists") { // Do nothing
				} else if (parentState.type) { // if defined but unknown type
					Logger.system.error("BaseWindow Parent Notification: unknown type", parentState);
				}
			}
		});

		this.TITLE_CHANGED_SUBSCRIPTION = RouterClient.subscribe(this.TITLE_CHANGED_CHANNEL, this.onTitleChanged);
	}

	onTitleChanged(err, response) {
		if (!response || !response.data || typeof response.data !== "string") return;
		this.windowOptions.title = response.data;
		this.emit("title-changed", {
			name: this.name,
			title: response.data
		});
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// The window wrappers
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	 * Async wrap. Given a name/windowName, it will query the launcher for information required to wrap the window. Then it will return an object that can be operated on. Also this creates a cache of all wrapped windows for performance. Our clients wrap the same window often and this was causing excessive messaging to the store and degrading performance.
	 * @param {*} params Need only name in most cases. For service and other cases where the window is not part of what the launcher considers active windows, name and uuid are required
	 * @param {*} cb
	 */
	static wrap = BaseWindow.getInstance;
	static getInstance(params, cb = Function.prototype) { // new async wrap
		let myName = System.Window.getCurrent().name;

		if (params && params.windowName) {
			params.name = params.windowName;
		}

		if (!params || !params.name) {
			return cb("name is required");
		}

		params.windowName = params.name;

		async function promiseResolver(resolve, reject) {
			if (params.waitForReady !== false) {
				Logger.system.debug("WRAP LIFECYCLE:WAIT FOR READY", params.name);
				await BaseWindow._windowReady(params.windowName); // wait to insure the window is fully ready in the window service
				Logger.system.debug("WRAP LIFECYCLE:WAIT DONE -- READY", params.name);
			}

			//Return early if we already have the wrap cached.
			if (window._FSBLCache.windows[params.name]) {
				Logger.system.debug("WRAP LIFECYCLE:", params.name, "Window found in the cache, returning without going to the Launcher");
				let wrap = window._FSBLCache.windows[params.name];
				resolve({ wrap })
				return cb(null, wrap);
			}

			//If we already have all of the information, just call createWrap. (Temporary code to cover services including FSBL.windowClient.)
			if ((params.name.toLowerCase().includes("finsemble") || params.name.toLowerCase().includes("service")) && params.uuid && params.name) {
				if (!params.windowIdentifier) {
					params.windowIdentifier = {
						uuid: params.uuid,
						name: params.name,
						windowName: params.name,
						windowType: params.windowType
					}
				}
				Logger.system.debug("WRAP LIFECYCLE:", params.name, "All information for wrap passed in, creating wrap locally");
				let { wrap } = await BaseWindow._createWrap(params);

				//@exit
				resolve({ wrap });
				return cb(null, wrap);
			}


			//All we have is a windowName. we send a request to the launcher for more information so that we can construct the proper object. This also the place where
			RouterClient.query(`WindowService-Request-getWindowIdentifier`, { windowName: params.name, requester: myName }, onWrapInformationReceived);

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
				let { wrap } = await BaseWindow._createWrap(params);

				//@exit
				resolve({ wrap });
				cb(null, wrap);
			}
		}

		return new Promise(promiseResolver);
	}

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
			paramsForWindow = Object.assign(paramsForWindow, identifier);
			paramsForWindow.setWindowType = paramsForWindow.windowType;
			delete paramsForWindow.windowType; //Prevent infinite loop

			Logger.system.debug("WRAP LIFECYCLE: Placing wrap into the local cache.", identifier.windowName);
			let BW = BaseWindow as any; //have to do this because we're mutating the class using static functions and all kinds of bad stuff. This tells the typescript compiler that the BaseWindow here is of type any -- basically don't worry about its type.
			if (window._FSBLCache.windows.hasOwnProperty(identifier.windowName)) {
				Logger.system.error("DUPLICATE WRAPPER for", identifier.windowName);
			} else {
				window._FSBLCache.windows[identifier.windowName] = new BW.types[paramsForWindow.setWindowType](paramsForWindow);
			}
			wrap = window._FSBLCache.windows[identifier.windowName]
			wrap.windowType = identifier.windowType;
			wrap.identifier = identifier;
			//BaseWindow.bindFunctions(win); // not needed -- handled in constructor
			wrap.setupListeners(identifier.windowName);
			resolve({ wrap });
		}
		return new Promise(promiseResolver);
	}

	static _windowReady = function (windowName) {
		const promiseResolver = async (resolve) => {
			if (windowName.toLowerCase().includes("finsemble") || windowName.toLowerCase().includes("service")) {
				resolve();
			} else { // wait only for components managed by the window service
				Logger.system.debug(`windowServiceReady: ${windowName} waiting`);
				let subscribeId = RouterClient.subscribe("Finsemble.Component.State." + windowName, (err, response) => {
					let state: WrapState = response.data.state;
					Logger.system.debug(`windowServiceReady: ${windowName} state change: ${state}`);
					switch (state) {
						case "ready": case "reloading": case "closing": // if ready state or any state beyond
							Logger.system.debug(`windowServiceReady: ${windowName} ${state}`);
							RouterClient.unsubscribe(subscribeId);
							resolve();
							break;
						default:
							Logger.system.debug(`windowServiceReady default: ${windowName} ${state}`);
					}
				});
			}
		};
		return new Promise(promiseResolver);
	};

	static _getRemoveWrapChannel(name) {
		return `${System.Window.getCurrent().name}.removeWrap.${name}`;
	}

	handleWrapRemoveRequest() {
		//wrap is the openfin or stacked window. if the removeListeners function exists, we remove all listeners we added during the lifecycle of that window wrapper.
		if (this.removeListeners) {
			this.removeListeners();
		}
		if (this.removeAllListeners) { //removeAllListeners is built into event emitter.
			this.removeAllListeners();
		}

		for (let event in this.eventlistenerHandlerMap) {
			for (let i = 0; i < this.eventlistenerHandlerMap[event].length; i++) {
				this.eventlistenerHandlerMap[event][i].interceptor.removeAllListeners();
			}
		}
		this.eventManager.cleanup();
		Logger.system.debug("WRAP CLOSE. Deleting cached wrap.");
		delete window._FSBLCache.windows[this.name];
		delete window._FSBLCache.windowAttempts[this.name];
		this.cleanupRouter();
	}

	cleanupRouter() {
		const REMOVE_WRAP_CHANNEL = BaseWindow._getRemoveWrapChannel(this.name);
		RouterClient.removeResponder(REMOVE_WRAP_CHANNEL);

		if (this.TITLE_CHANGED_SUBSCRIPTION) {
			RouterClient.unsubscribe(this.TITLE_CHANGED_SUBSCRIPTION);
		}
		RouterClient.unsubscribe(this.wrapStateChangeSubscription);
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Handlers to generate wrapper events from incoming transmits
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	handleWrapStateChange = (err, response) => {
		let state: WrapState = response.data.state;
		//closed gets emitted from the window. we don't want to emit a window closed event because the wrap state changed to closed.
		if (state && state !== this.wrapState && state !== "closed") {
			this.wrapState = state;
			this.eventManager.trigger(state as WindowEventName);
		}
	}

	onReady(callback) {
		if (this.wrapState === "ready") {
			return callback();
		}
		this.eventManager.on("ready", callback);
	}

	handleBoundsSet(err, response) {
		if (response.data && response.data.bounds) {
			this.mergeBounds(response.data.bounds);
		}
		Logger.system.debug(`BaseWindow emitting bounds set for ${this.name}`, response.data);
		this.emit(BOUNDS_SET, response.data);
	}

	handleBoundsChanging(err, response) {
		Logger.system.debug(`BaseWindow emitting bounds changing for ${this.name}`, response.data);
		this.emit(BOUNDS_CHANGING, response.data);
	}

	handleWindowHidden(err, response) {
		Logger.system.debug(`BaseWindow emitting hidden for ${this.name}`, response.data);
		this.emit("hidden", this.windowName);
	}

	handleWindowShown(err, response) {
		Logger.system.debug(`BaseWindow emitting shown for ${this.name}`, response.data);
		this.emit("shown", this.windowName);
	}

	handleWindowBTF(err, response) {
		Logger.system.debug(`BaseWindow emitting BTF for ${this.name}`, response.data);
		this.emit("bringToFront", { name: this.name });
	}

	handleWindowMax(err, response) {
		Logger.system.debug(`BaseWindow emitting maximize for ${this.name}`, response.data);
		this.windowState = this.WINDOWSTATE.MAXIMIZED;
		this.emit("maximized", { name: this.name });
	}

	handleWindowMin(err, response) {
		Logger.system.debug(`BaseWindow emitting min for ${this.name}`, response.data);
		this.windowState = this.WINDOWSTATE.MINIMIZED;
		this.emit("minimized", { name: this.name });
	}

	handleWindowRestore(err, response) {
		Logger.system.debug(`BaseWindow emitting restore for ${this.name}`, response.data);
		this.windowState = this.WINDOWSTATE.NORMAL;
		this.emit("restored", { name: this.name });
	}

	handleWindowStartMove(err, response) {
		Logger.system.debug(`BaseWindow emitting startmove for ${this.name}`, response.data);
		this.emit("startedMoving", { name: this.name });
	}

	handleWindowStopMove(err, response) {
		Logger.system.debug(`BaseWindow emitting stop move for ${this.name}`, response.data);
		this.emit("stoppedMoving", { name: this.name });
	}

	handleWindowDisabledFrameBoundsChanged(err, response) {
		Logger.system.debug(`BaseWindow emitting disabled-frame-bounds-changed for ${this.name}`, response.data);
		this.emit("disabled-frame-bounds-changed", { name: this.name });
	}

	handleWindowStateChange(err, response) {
		Logger.system.debug(`BaseWindow emitting window state change for ${this.name}`, response.data);
		this.windowState = response.data;
		switch (response.data) {
			case this.WINDOWSTATE.MAXIMIZED:
				this.emit("maximized", { name: this.name });
				break;
			case this.WINDOWSTATE.NORMAL:
				this.emit("restored", { name: this.name });
				break;
			case this.WINDOWSTATE.MINIMIZED:
				this.emit("minimized", { name: this.name });
				break;
			default:
		}
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
		if (typeof params === "function") {
			callback = params;
			params = {};
		}
		params = params || {};
		params.windowIdentifier = this.identifier; // add this window's identifier

		Logger.system.debug("FinsembleWindow.queryWindowService", this.windowServiceChannelName(methodName), params);
		console.debug("FinsembleWindow.queryWindowService", this, this.windowServiceChannelName(methodName), params);

		let responseData = null;
		RouterClient.query(this.windowServiceChannelName(methodName), params, (err, queryResponseMessage) => {
			if (err) {
				Logger.system.warn(`WindowService.${methodName}: failed`, err);
				console.debug(`WindowService.${methodName}: failed`, err);
			} else {
				responseData = queryResponseMessage.data;
				Logger.system.debug(`${this.windowServiceChannelName(methodName)} successful`, responseData);
				console.debug(`${this.windowServiceChannelName(methodName)} successful`, responseData);
			}
			if (callback) callback(err, responseData);
		});
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Core Window Functions: can be invoked by any service or component.  Most are sent to the WindowService to be executed.
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	_eventHandled(interceptor, guid, canceled: boolean = false) {
		Logger.system.debug("FinsembleWindow._eventHandled private", interceptor.event, this.identifier.windowName, guid, canceled);
		if (interceptor.delayable) RouterClient.publish(constants.EVENT_INTERRUPT_CHANNEL + "." + guid, { canceled: canceled });
	}

	addEventListener(eventName, handler) {
		// We send this guid so that Window service can keep track of individual listeners for event interruption.
		let guid = Date.now() + "_" + Math.random();
		// Please do not comment this code out: This is how we create Interruptible events in the private wrappers.
		if (constants.INTERRUPTIBLE_EVENTS.includes(eventName)) {
			this.queryWindowService("registerInterruptibleEvent", { eventName: eventName, guid: guid });
		}
		let delayable = constants.INTERRUPTIBLE_EVENTS.includes(eventName);
		let cancelable = constants.INTERRUPTIBLE_EVENTS.includes(eventName);
		let interceptor = new FinsembleEvent({
			source: this,
			event: eventName,
			delayable: delayable,
			cancelable: cancelable
		});

		const internalHandler = (data) => {
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
		this.eventManager.listenForRemoteEvent(eventName, handler);
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

	removeEventListener(eventName, handler) {
		if (!this.eventlistenerHandlerMap[eventName]) { // trying to remove non-existent handler.
			Logger.system.error("trying to remove non-existent handler", eventName);
			return;
		}
		for (let i = this.eventlistenerHandlerMap[eventName].length - 1; i >= 0; i--) {
			let handlerStoredData = this.eventlistenerHandlerMap[eventName][i];
			if (handlerStoredData.handler === handler) {
				this.eventManager.removeListener(eventName, handlerStoredData.internalHandler);
				handlerStoredData.interceptor.removeAllListeners();
				RouterClient.publish(constants.EVENT_INTERRUPT_CHANNEL + "." + this.name, { eventName: eventName, guid: handlerStoredData.guid, delayed: false, canceled: false });
				this.eventlistenerHandlerMap[eventName].splice(i, 1);
			}
		}
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

	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Core Private Window Functions: generally should only be directly invoked by the WindowService (an exception is _close)
	// Note: These private window functions can also optionally be invoked from the derived class definition.  See openfinWindowWrapper _minimize for example.
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow).  All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_minimize(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._minimize", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._minimize(params, (err, result) => {
				Logger.system.debug("BaseWindow._minimize parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_maximize(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._maximize", params);
		params = params || {};

		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._maximize(params, function (err, result) {
				Logger.system.debug("BaseWindow._maximize parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_restore(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._restore", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._restore(params, function (err, result) {
				Logger.system.debug("BaseWindow._restore parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	_blur(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._blur", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._blur(params, function (err, result) {
				Logger.system.debug("BaseWindow._blur parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_focus(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._focus", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._focus(params, function (err, result) {
				Logger.system.debug("BaseWindow._focus parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_bringToFront(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._bringToFront", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._bringToFront(params, function (err, result) {
				Logger.system.debug("BaseWindow._bringToFront parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_isShowing(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._isShowing", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._isShowing(params, function (err, result) {
				Logger.system.debug("BaseWindow._isShowing parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_setBounds(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._setBounds", params);
		params = params || {};
		let bounds = params.bounds;
		//Get the bounds that we have stored locally. If we have them, we compare later. If the bounds have changed, we emit the bounds-set method. Otherwise, we don't emit that event.
		let cachedBounds = {};
		if (this.windowOptions && this.windowOptions.bounds) {
			cachedBounds = this.windowOptions.bounds;
		}

		this.mergeBounds(bounds);//This happens twice...remove this
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._setBounds(params, function (err, result) {
				Logger.system.debug("BaseWindow._setBounds parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_getBounds(params, cb) {
		Logger.system.debug("BaseWindow._getBounds", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._getBounds(params, function (err, bounds) {
				Logger.system.debug("BaseWindow._getBounds parent", bounds);
				cb(err, bounds);  // shouldContinue not defined in return value, but implicitly false
			});
		} else {
			cb(null, { shouldContinue: true }); // if should continue, bounds will be calculated by derived class
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_updateOptions(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._updateOptions", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._updateOptions(params, function (err, result) {
				Logger.system.debug("BaseWindow._updateOptions parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_hide(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._hide", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._hide(params, function (err, result) {
				Logger.system.debug("BaseWindow._hide parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_show(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._show", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._show(params, function (err, result) {
				Logger.system.debug("BaseWindow._show parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	//@todo fully document this function
	/**
	 * Close
	 * @param params
	 * @param params.fromSystem Bool. If true, event bubbled up because of an alt+f4, task manager, etc. Something closed the window that wasn't Finsemble.
	 * @param cb
	 */
	_close(params, cb = Function.prototype) {
		Logger.system.debug("WRAP CLOSE. BaseWindow._close", this.name, params);
		params = params || {};
		const parentWindow = this.parentWindow;
		if (params.fromSystem) {
			// If the close is initiated from a system close (i.e. close from the taskbar or using the hotkey) and we're closing a stacked window, close the entire stacked window.
			// Except for when a native window is part of that stack and the system close is initiated on the native window, in which case we only close the native window instead of the whole stack.
			// fromSystem is only set by the openfinWindowWrapper in _systemClosed. It is not set by other kinds of windows.
			if (parentWindow && parentWindow.componentType.toLowerCase() === "stackedwindow") {
				params = {};
				params.removeFromWorkspace = true;
				params.fromSystem = true;
				params.stackedWindowIdentifier = parentWindow.identifier;
				parentWindow.close(params, function (err, result) {
					Logger.system.debug("BaseWindow.close stacked window", result);
					cb(err, { shouldContinue: false });
				});
			}
			else {
				cb(null, { shouldContinue: true });
			}
		}
		else if (!params.invokedByParent && !params.ignoreParent && parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			params.noDocking = true; // when removing from stacked window don't register child with docking
			parentWindow._removeWindow(params, function (err, result) {
				Logger.system.debug("BaseWindow._close parent", result);
				cb(err, { shouldContinue: true });
			});
		}
		else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_alwaysOnTop(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._alwaysOnTop", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._alwaysOnTop(params, function (err, result) {
				Logger.system.debug("BaseWindow._alwaysOnTop parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_setOpacity(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._setOpacity", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._setOpacity(params, function (err, result) {
				Logger.system.debug("BaseWindow._setOpacity parent", result);
				cb(err, { shouldContinue: false });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}

	// Private base window function optionally invoked by derived class (e.g. openFinWindowWrapper, FinsembleNativeWindow). All base function follow same template.
	// If parent defined then let parent decide appropriate functionality, including passing result back to caller specifying what to do next.
	_saveWindowOptions(params, cb = Function.prototype) {
		Logger.system.debug("BaseWindow._saveWindowOptions", params);
		params = params || {};
		if (!params.invokedByParent && this.parentWindow) {
			// if parent defined and not circular loop, invoke parent functionality.  Parent result passed back to caller
			params.windowIdentifier = this.identifier; // add this window's identifier for parent invocation
			this.parentWindow._saveWindowOptions(params, function (err, result) {
				Logger.system.debug("BaseWindow._saveWindowOptions parent", result);
				cb(err, { shouldContinue: true });
			});
		} else {
			cb(null, { shouldContinue: true });
		}
	}
	_getOptions(params = null, cb = Function.prototype) {
		//todo get config or something.
		return cb(null, {});
	}
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Other Baseclass Function: These are common functions shared across derived classes
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Invoked to indicate an operation (e.g. dragging out of tab region) has started. This signals the Docking service to start tracking the mouse location and invoking tiling behavior as needed. Typically inherited (base function only).
	 * @param {object} params for future use
	 *
	 * @example
	 *	// dragging tab example using tracking and group
	 * 	BaseWindow.startTabTileMonitoring();
	 *	// if dragging tab is in a group, then remove it given tracking results will decide what to do with the window
	 * 	BaseWindow.Group.getGroupID(this.identifier, function (err, tileGroupId) {
	 * 		if (!err) { // if no error then must be in a tile group
	 *			self.Group.removeWindow(this.identifier);
	 *		}
	 *	});
	 */
	startTabTileMonitoring(params) {
		Logger.system.debug("BaseWindow.startTabTileMonitoring", params);
		RouterClient.transmit("TabTile.startTabTile", { params });
	}

	/**
	 * Invoked by client originating a dragStart that it has has ended. Typically inherited (base function only).
	 * @param {object} params for future use
		 * @param {function=} callback option callback that support overriding default behavior
	 *
	 * 	BaseWindow.stopTabTileMonitoring(params, function(err, results, defaultTabTileAction) {
	 * 		// . . . custom code goes here . . .
	 *		defaultTabTileAction(results); // now take default action or call your own function instead
	 * 	});
	 *
	 */
	stopTabTileMonitoring(params, callback) {
		Logger.system.debug("BaseWindow.stopTabTileMonitoring", params);
		RouterClient.query("TabTile.stopTabTile", { params }, function (err, queryResponseMessage) {
			if (err) {
				Logger.system.warn("TabTile.stopTabTile: query failed", err);
			} else {
				Logger.system.debug("TabTile.stopTabTile results", queryResponseMessage.data);
			}
			const stopTabTileResults = queryResponseMessage.data;
			if (callback) {
				callback(err, stopTabTileResults, this.defaultStopTrackingAction);
			} else {
				this.defaultTabTileAction(stopTabTileResults);
			}
		});
	}

	/**
	 * Defines default TabTile action for stopTabTileMonitoring.  May be overwritten by client -- see example in stopTabTileMonitoring. Typically inherited (base function only).
	 *
	 * @param {any} stopTabTileResults
	 * @memberof BaseWindow
	 *
	 * @private
	 */
	defaultTabTileAction(stopTabTileResults) {
		let self = this;
		Logger.system.debug("BaseWindow.defaultTabTileAction", stopTabTileResults);
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
		if (!bounds || !Number.isInteger(bounds.top)) {
			console.error("Invalid bounds", bounds);
			Logger.system.warn("BaseWindow.mergeBounds Invalid bounds", "bounds=", bounds);
			return; //TODO: figure out how this is even possible
		}

		//Without rounding, openfin becomes sad at fractional pixels (caused issues with autoarrange).
		let newBounds: WindowBounds = {
			top: Math.round(bounds.top),
			left: Math.round(bounds.left),
			width: Math.round(bounds.width),
			height: Math.round(bounds.height)
		};

		newBounds.bottom = newBounds.top + newBounds.height;
		newBounds.right = newBounds.left + newBounds.width;

		//Old problem. Openfin uses these, we use the others. SAD!
		let defaultBounds = {
			defaultLeft: newBounds.left,
			defaultWidth: newBounds.width,
			defaultTop: newBounds.top,
			defaultHeight: newBounds.height
		};

		Object.assign(this.windowOptions, newBounds);
		Object.assign(this.windowOptions, defaultBounds);
		this.windowOptions.bounds = newBounds;
	}

	startMove(params) {
		Logger.system.debug("BaseWindow.startMove", params);
		params = params || {};
		params.windowIdentifier = this.identifier; // add this window's identifier
		this.eventManager.trigger("bounds-change-start", {
			...this.windowOptions.bounds
		});
	}

	stopMove(params) {
		Logger.system.debug("BaseWindow.stopMove", params);
		params = params || {};
		params.windowIdentifier = this.identifier; // add this window's identifier
		this.eventManager.trigger("bounds-change-end", {
			name: this.name,
			eventName: "bounds-change-end",
			dockedPosition: this.dockedPosition,
			...this.windowOptions.bounds
		});
	}

	/**
	 * Given a field, this function retrieves component or window state. If no params are given you get the full state
	 * @param {object} params
	 * @param {string} params.stateVar A string containing "componentState" or "windowState"
	 * @param {string} params.field field
	 * @param {array} params.fields fields
	 * @param {string} params.key The storage key for the window.
	 * @param {function} cb Callback
	 * @private
	 **/
	async getFSBLState(params: {
		stateVar: "componentState" | "windowState",
		field?: string,
		fields?: string[],
		key: string,
	}, cb: StandardCallback) {
		Logger.system.debug("BaseWindow.getState", params);

		StorageClient.get({ topic: WORKSPACE.CACHE_STORAGE_TOPIC, key: params.key }, (err, response) => {
			if (params.stateVar === "componentState") {
				this.componentState = response;
			} else if (params.stateVar === "windowState") {
				this.windowState = response;
			}

			const { field, fields } = params;

			if (response) {
				if (field) {
					cb(err, response[field]);
				} else if (fields) {
					const respObject = {};
					for (let i = 0; i < fields.length; i++) {
						if (response[fields[i]]) {
							respObject[fields[i]] = response[fields[i]];
						}
					}
					return cb(null, respObject);

				} else {
					return cb(null, response);
				}
			} else {
				Logger.system.info("WindowClient:getComponentState:error, response, params", err, response, params);
				cb("Not found", response);
			}
		});
	}

	/**
	 * Given params, will return the component state. Either the params to search for, or the entire state.
	 *
	 * @param {object} params
	 * @param {string} params.field field
	 * @param {array} params.fields fields
	 * @param {function} cb Callback
	 */
	getComponentState(params, cb) {
		if (!params) params = {};
		if (params.fields && !Array.isArray(params.fields)) { params.fields = [params.fields]; }

		return this.getFSBLState({ ...params, key: this.componentKey, stateVar: "componentState" }, cb);
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
		if (!params) params = {};
		if (params.fields && !Array.isArray(params.fields)) { params.fields = [params.fields]; }

		params.key = this.windowKey;
		params.stateVar = "windowState";

		return this.getFSBLState(params, cb);
	}

	/**
	 * Given params, will set the component state. Any fields included will be added to the state
	 *
	 * @param {object} params
	 * @param {string} params.field field
	 *  @param {array} params.fields fields
	 * @param {function} cb Callback
	 */
	setComponentState(params, cb = Function.prototype) {
		if (!params) params = {};
		if (params.fields && !Array.isArray(params.fields)) { params.fields = [params.fields]; }

		return this.setFSBLState({ ...params, key: this.componentKey, stateVar: "componentState" }, cb);
	}

	/**
	 * Removes one or more specified attributes from a component state in storage
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
	removeComponentState(params?: componentMutateParams, cb: StandardCallback = (e, r) => { }) {
		if (!params) params = {};
		if (params.fields && !Array.isArray(params.fields)) { params.fields = [params.fields]; }

		return this.removeFSBLState({ ...params, key: this.componentKey, stateVar: "componentState" }, cb);
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
		if (!params) params = {};
		if (params.fields && !Array.isArray(params.fields)) { params.fields = [params.fields]; }

		return this.setFSBLState({ ...params, key: this.windowKey, stateVar: "windowState" }, cb);
	}

	saveWindowState(state) {
		this.windowState = state;
	}

	saveCompleteWindowState(state, cb?) {
		Logger.system.debug("COMPONENT LIFECYCLE:SAVING STATE:", state.name);
		if (!state) return cb("No State Provided");
		if (state.customData && state.customData.manifest) {
			delete state.customData.manifest;
		}

		delete state.callstack;
		delete state.x;
		delete state.y;
		delete state.blurred;
		delete state.permissions;
		delete state.invokedByParent;
		delete state.monitorDimensions;
		if (state.windowIdentifier) delete state.windowIdentifier.title;


		WorkspaceClient._setWindowState({
			windowName: this.windowName,
			state: { windowData: state }
		}).then(() => {
			if (cb) cb();
		});
	}

	deleteCompleteWindowState(cb) {
		Logger.system.debug("COMPONENT LIFECYCLE:REMOVING STATE:", this.windowKey);
		let params = {
			topic: WORKSPACE.CACHE_STORAGE_TOPIC,
			key: this.windowKey
		};
		StorageClient.delete(params, cb);
	}

	/**
	 * Given a field, this function sets and persists app state.
	 * @param {object} params
	 * @param {string} [params.field] field
	 * @param {array} [params.fields] fields
	 * @param {function=} cb Callback
	 **/
	setFSBLState(params, cb) {
		const getParams = {
			key: params.key,
			stateVar: params.stateVar
		};
		if (!getParams.key) {
			if (getParams.stateVar === "componentState") {
				getParams.key = this.componentKey;
			} else if (getParams.stateVar === "windowState") {
				getParams.key = this.windowKey;
			}
		}

		this.getFSBLState(getParams, () => {
			/* Sidd Notes: We are always comparing the entire saved state to see if things have changed instead of just the new fields - that is expensive. */
			Logger.system.debug("BaseWindow.getState", params);
			params.topic = WORKSPACE.CACHE_STORAGE_TOPIC;
			let localComponentState = merge(this[params.stateVar], {});
			let fields = params.fields;

			if (params.field) {
				fields = [{
					field: params.field,
					value: params.value
				}];
			}

			for (let i = 0; i < fields.length; i++) {
				let field = fields[i];
				if (!field.field || typeof field.value == "undefined") { continue; }
				localComponentState[field.field] = field.value;
			}

			params.value = localComponentState;
			Logger.system.debug("COMPONENT LIFECYCLE: SAVING " + params.stateVar + ":", localComponentState);

			WorkspaceClient._setWindowState({
				windowName: this.windowName,
				state: { [params.stateVar]: localComponentState }
			}).then(() => {
				this[params.stateVar] = localComponentState;
				if (cb) cb();
			});
		});
	}

	/**
	 * Removes one or more specified attributes from either component or window state in storage.
	 *
	 * In addition to the name of the window, params should include either a `field`
	 * property as a string or a `fields` property as an array of strings.
	 *
	 * @param {object} params
	 * @param {string} [params.field] field
	 * @param {array} [params.fields] fields
	 * @param {function=} cb Callback
	 **/
	removeFSBLState(params: componentMutateParams, cb: StandardCallback = (e, r) => { }) {
		const getParams = {
			key: params.key,
			stateVar: params.stateVar
		};
		if (!getParams.key) {
			if (getParams.stateVar === "componentState") {
				getParams.key = this.componentKey;
			} else if (getParams.stateVar === "windowState") {
				getParams.key = this.windowKey;
			}
		}

		this.getFSBLState(getParams, () => {
			/* Sidd Notes: We are always comparing the entire saved state to see if things have changed instead of just the new fields - that is expensive. */
			Logger.system.debug("BaseWindow.getState", params);
			params.topic = WORKSPACE.CACHE_STORAGE_TOPIC;
			// deepmerge treats undefined as empty object
			let localComponentState = merge(this[params.stateVar], {});
			let fields = params.fields;

			if (params.field) {
				fields = [{
					field: params.field
				}];
			}

			for (let i = 0; i < fields.length; i++) {
				let field = fields[i];
				if (!field.field) { continue; }
				delete localComponentState[field.field];
			}

			params.value = localComponentState;
			Logger.system.debug("COMPONENT LIFECYCLE: SAVING " + params.stateVar + ":", localComponentState);

			StorageClient.save(params, (err, response) => {
				if (err) return cb(err);
				this[params.stateVar] = localComponentState;
				if (cb) { cb(err, response); }
			});
		});
	}

	/**
	 *Cancels startTabTileMonitoring. Example use is a user "excapes" out of a drag operation.
	 *
	 * @param {object} params for future use
	 * @memberof BaseWindow
	 */
	cancelTabTileMonitoring(params) {
		Logger.system.debug("BaseWindow.cancelTabTileMonitoring", params);
		RouterClient.transmit("TabTile.cancelTabTile", { params });
	}

	/**
	 * Return the parent window's wrapper (e.g. StackedWindow).
	 *
	 */
	getParent() {
		return this.parentWindow;
	}

	/**
	 * Sets the parent window (e.g. stackedWindow) and emits "setParent" event to window listeners.
	 *
	 * @param {object} stackedWindowIdentifier identifer of window to set as parent (e.g. stackedWindowIdentifier).
	 *
	 */
	setParent(windowIdentifier, cb = Function.prototype) {
		if (this.parentWindow && (this.parentWindow.name === windowIdentifier.windowName)) {
			Logger.system.debug("BaseWindow.setParent already set", windowIdentifier);
			cb(null, windowIdentifier);
		} else {
			Logger.system.debug("BaseWindow.setParent", windowIdentifier);
			// set up store listener to change if
			BaseWindow.getInstance(windowIdentifier, (err, wrappedStackedWindow) => {
				if (!err) {
					Logger.system.debug("BaseWindow.setParent wrap success", windowIdentifier);
					console.debug("BaseWindow.setParent wrap success", this, wrappedStackedWindow);
					this.parentWindow = wrappedStackedWindow;
					this.eventManager.trigger("parent-set", { parentName: this.parentWindow.name });
				} else {
					Logger.system.error("BaseWindow.setParent error", err);
				}
				cb(err, windowIdentifier);
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
		Logger.system.debug("BaseWindow.clearParent");
		this.parentWindow = null;
		this.emit("clearParent", this.parentWindow);
	}

	setTitle(title) {
		Logger.system.debug("Title change", title);
		RouterClient.publish(this.TITLE_CHANGED_CHANNEL, title);
	}

	//public Window functions - needed to handle events properly e.g. for close.
	close(params = {}, callback) {
		this.queryWindowService("close", params, callback);
	}

	_animate(params, cb) {
		if (typeof params === "function") {
			cb = params;
			params = null;
		}
		cb("Method not implemented for window", { shouldContinue: true });
	}
}
