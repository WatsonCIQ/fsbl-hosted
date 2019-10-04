
import {
	WindowCreationParams,
} from "./Interface_BasePrivateWindow";

import {
	Interface_Window,
} from "./Interface_Window";

import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";
import { FinsembleWindowInternal } from "../WindowAbstractions/FinsembleWindowInternal";
import * as Constants from "../../../common/constants";
import { MockDockableWindow } from "../Common/MockDockableWindow";
import { WindowPoolSingleton } from "../Common/Pools/PoolSingletons";
import WorkspaceClient from "../../../clients/workspaceClient";
import { REMOTE_FOCUS } from "../../../common/constants";
import { BaseWindow } from "../WindowAbstractions/BaseWindow";

export class WindowPrimitives {
	dockingMain: any;
	eventInterruptors: any;

	constructor(dockingMain) {
		this.dockingMain = dockingMain;
		this.bindAllFunctions();
		this.eventInterruptors = {};
	}

	initialize(done) {
		this.definePubicInterface_Window();
		done();
	}

	windowServiceChannelName(channelTopic) { return `WindowService-Request-${channelTopic}`; }

	bindAllFunctions() {
		for (let name of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
			if (this[name] instanceof Function) {
				this[name] = this[name].bind(this); // only bind function properties
			}
		}
	}

	// invoked by serviceEntryPoint shutdown
	shutdown(done) {
		done();
	}


	definePubicInterface_Window() {
		Logger.system.debug("definePubicInterface_Window");

		// entry points for public window functions
		RouterClient.addResponder(this.windowServiceChannelName("addEventListener"), this.addEventListenerHandler);
		RouterClient.addResponder(this.windowServiceChannelName("removeEventListener"), this.removeEventListenerHandler);
		RouterClient.addResponder(this.windowServiceChannelName("registerInterruptibleEvent"), this.registerInterruptibleEventHandler);
		RouterClient.addResponder(this.windowServiceChannelName("minimize"), this.minimizeHandler);
		RouterClient.addResponder(this.windowServiceChannelName("maximize"), this.maximizeHandler);
		RouterClient.addResponder(this.windowServiceChannelName("restore"), this.restoreHandler);
		RouterClient.addResponder(this.windowServiceChannelName("focus"), this.focusHandler);
		RouterClient.addResponder(this.windowServiceChannelName("blur"), this.blurHandler);
		RouterClient.addResponder(this.windowServiceChannelName("bringToFront"), this.bringToFrontHandler);
		RouterClient.addResponder(this.windowServiceChannelName("saveWindowOptions"), this.saveWindowOptionsHandler);
		RouterClient.addResponder(this.windowServiceChannelName("setBounds"), this.setBoundsHandler);
		RouterClient.addResponder(this.windowServiceChannelName("getBounds"), this.getBoundsHandler);
		RouterClient.addResponder(this.windowServiceChannelName("getOptions"), this.getOptionsHandler);
		RouterClient.addResponder(this.windowServiceChannelName("updateOptions"), this.updateOptionsHandler);
		RouterClient.addResponder(this.windowServiceChannelName("hide"), this.hideHandler);
		RouterClient.addResponder(this.windowServiceChannelName("show"), this.showHandler);
		RouterClient.addResponder(this.windowServiceChannelName("showAt"), this.showAtHandler);
		RouterClient.addResponder(this.windowServiceChannelName("alwaysOnTop"), this.alwaysOnTopHandler);
		RouterClient.addResponder(this.windowServiceChannelName("setOpacity"), this.setOpacityHandler);
		RouterClient.addResponder(this.windowServiceChannelName("close"), this.closeHandler);
		RouterClient.addResponder(this.windowServiceChannelName("isShowing"), this.isShowingHandler);
		RouterClient.addResponder(this.windowServiceChannelName("animate"), this.animateHandler);
		RouterClient.addResponder(this.windowServiceChannelName("setComponentState"), this.setComponentStateHandler);
		RouterClient.addResponder(this.windowServiceChannelName("removeComponentState"), this.removeComponentStateHandler);
		RouterClient.addResponder(this.windowServiceChannelName("setWindowState"), this.setWindowStateHandler);
		RouterClient.addResponder(this.windowServiceChannelName("saveCompleteWindowState"), this.saveCompleteWindowStateHandler);
		RouterClient.addResponder(this.windowServiceChannelName("getWindowState"), this.getWindowStateHandler);
		RouterClient.addResponder(this.windowServiceChannelName("getComponentState"), this.getComponentStateHandler);
		RouterClient.addResponder(this.windowServiceChannelName("setParent"), this.setParentHandler);
		RouterClient.addResponder("DockingService.getMonitorForWindow", this.getMonitorForWindowHandler);
		RouterClient.addListener(REMOTE_FOCUS, this.handleRemoteFocus);
	}

	// housekeeping function used in each of the public window-wrapper handlers below
	publicWindowHandlerPreface(method, queryError, queryMessage) {
		var okay = true;
		let params = queryMessage.data;
		let { windowIdentifier, eventName, guid } = queryMessage.data;

		if (!windowIdentifier) {
			Logger.system.error(`no windowIdentifer for ${this.windowServiceChannelName(method)} handler`);
		}

		if (queryError) {
			Logger.system.error(`${this.windowServiceChannelName(method)} addResponder failed: ${queryError}`);
			okay = false;
		} else {
			windowIdentifier.windowName = windowIdentifier.windowName || windowIdentifier.name || "unknown-name";
			windowIdentifier.name = windowIdentifier.windowName;
		}

		Logger.system.debug(`WindowService-Request.${method} for ${windowIdentifier.windowName}`, queryMessage);
		return ({ okay, windowIdentifier, eventName, guid });
	}

	async registerInterruptibleEventHandler(queryError, queryMessage) {
		let { windowIdentifier, eventName, guid } = this.publicWindowHandlerPreface("registerInterruptibleEventHandler", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			if (wrap.wrapState === "closing" || wrap.wrapState === "closed") {
				return callback("Window is being shut down. Failed to add listener.");
			}
			if (Constants.INTERRUPTIBLE_EVENTS.includes(eventName)) {
				// keep track of all listeners
				if (!this.eventInterruptors[windowIdentifier.name]) {
					this.eventInterruptors[windowIdentifier.name] = {};
				}

				if (!this.eventInterruptors[windowIdentifier.name][eventName]) {
					this.eventInterruptors[windowIdentifier.name][eventName] = {};
				}

				this.eventInterruptors[windowIdentifier.name][eventName][guid] = {
					origin: queryMessage.header.origin,
					status: "created"
				};
				Logger.system.debug("Add Interruptor", windowIdentifier.name, queryMessage.header.origin, guid, this.eventInterruptors[windowIdentifier.name][eventName][guid]);
			}
			callback();
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	/** DH 6/15/2019
	 * Because the OS and container keep their own
	 * seperate records of which window has focus,
	 * it's possible for the two to get out of sync.
	 * To prevent that, we send messages from Assimilation
	 * and Finsemble-DLL on every OS focus event and handle
	 * them here. For every focus event coming from a window not
	 * managed by Finsemble's container, we manually blur
	 * whatever window had focus previously.
	 * 
	 * If we can figure out a different way to synchronize
	 * focus between container and OS, we can remove this ad hoc
	 * and manual handling here.
	 */
	handleRemoteFocus(queryError, queryMessage) {
		const name = queryMessage.data.name;

		// DH 6/15/2019 - These types aren't right, but the best way to
		// fix would be to type the ObjectPools, which would require significant
		// refactoring. 
		const windows: any[] = Object.values(WindowPoolSingleton.getAll());
	
			const focused: BaseWindow = windows
				.find((x: { focused: boolean }) => x.focused) as BaseWindow;
			if (focused && focused.name !== name) {
				focused.eventManager.trigger("blurred");
			}
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////////
	// The following functions handler the public "wrapper" requests
	/////////////////////////////////////////////////////////////////////////////////////////////////////////
	async removeEventListenerHandler(queryError, queryMessage) {
		let { windowIdentifier, eventName, guid } = this.publicWindowHandlerPreface("removeEventListener", queryError, queryMessage);

		let callback = queryMessage.sendQueryResponse;

		if (Constants.INTERRUPTIBLE_EVENTS.includes(eventName)) {
			// keep track of all listeners
			if (!this.eventInterruptors[windowIdentifier.name]) {
				this.eventInterruptors[windowIdentifier.name] = {};
			}

			if (!this.eventInterruptors[windowIdentifier.name][eventName]) {
				this.eventInterruptors[windowIdentifier.name][eventName] = {};
			}
			if (this.eventInterruptors[windowIdentifier.name] && this.eventInterruptors[windowIdentifier.name][eventName] && this.eventInterruptors[windowIdentifier.name][eventName][guid]) {
				Logger.system.debug("Remove Interruptor", windowIdentifier.name, this.eventInterruptors[windowIdentifier.name][eventName][guid], guid);
				delete this.eventInterruptors[windowIdentifier.name][eventName][guid];
			}
		}

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			// @todo callback is not the handler here, it's sendQueryResponse
			// when we add an event listener, there are two parameters: event name, and handler to be invoked when the event is thrown.
			// When we're removing listeners here, we're saying 'remove the listener for this event, the handler was 'callback'.
			// That's not true. In this case, callback is queryMessage.sendResponse.
			// The function below will never invoke the callback, it will simply search amongst the event handlers for 
			// event 'whatever event' for a handler that === callback. It will never find that, 
			// because we never added a listener with that handler.
			// - Brad
			// @todo make remove eventListener actually do something
			wrap._removeEventListener(queryMessage.data, callback);
			callback(null);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async addEventListenerHandler(queryError, queryMessage) {
		let { windowIdentifier, eventName, guid } = this.publicWindowHandlerPreface("addEventListener", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;


		let wrap = WindowPoolSingleton.get(windowIdentifier.name);
		//close-complete will never fire inside of that window.

		if (wrap) {
			if (wrap.wrapState === "closing" || wrap.wrapState === "closed") {
				return callback("Window is being shut down. Failed to add listener.");
			}

			if (Constants.INTERRUPTIBLE_EVENTS.includes(eventName)) {
				// keep track of all listeners
				if (!this.eventInterruptors[windowIdentifier.name]) {
					this.eventInterruptors[windowIdentifier.name] = {};
				}

				if (!this.eventInterruptors[windowIdentifier.name][eventName]) {
					this.eventInterruptors[windowIdentifier.name][eventName] = {};
				}

				Logger.system.debug("Add Interruptor", windowIdentifier.name, guid);
				this.eventInterruptors[windowIdentifier.name][eventName][guid] = {
					origin: queryMessage.header.origin,
					status: "created"
				};
			}

			// no hander is set up here, but the event manager is notified there is a remote listener
			wrap._addEventListener(queryMessage.data);
			callback();

		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	/**
	 * Given a windowIdentifier, this function will find the dockableWindow or window instance, figure out which monitor the window is on, and return
	 * it back to the caller (public FinsembleWindow).
	 *
	 * @param {*} queryError callback on error
	 * @param {*} queryMessage message data and success callback
	 * @returns Promise
	 * @memberof WindowPrimitives
	 */
	async getMonitorForWindowHandler(queryError, queryMessage) {
		let { windowIdentifier } = queryMessage.data;
		let callback = queryMessage.sendQueryResponse;
		let dockableWindow = this.dockingMain.getWindow(windowIdentifier.windowName, false);
		let monitor;
		if (dockableWindow) {
			monitor = this.dockingMain.getMonitorForWindow(dockableWindow);
		} else {
			let wrap = WindowPoolSingleton.get(windowIdentifier.windowName);
			if (wrap) {
				let { data: bounds } = await wrap._getBounds();
				//See documentation in MockDockableWindow for why this is necessary.
				let mock = new MockDockableWindow({ name: wrap.name, ...bounds });
				monitor = this.dockingMain.getMonitorForWindow(mock);
			} else {
				return callback(`Could not find window for ${windowIdentifier.windowName}`, null);
			}
		}

		queryMessage.sendQueryResponse(null, monitor.toJSON());
	}

	async minimizeHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("minimize", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._minimize(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async maximizeHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("maximize", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._maximize(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async restoreHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("restore", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._restore(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async focusHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("focus", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._focus(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async blurHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("blur", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._blur(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async bringToFrontHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("bringToFront", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._bringToFront(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async isShowingHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("isShowing", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._isShowing(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async saveWindowOptionsHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("saveWindowOptions", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._saveWindowOptions(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async setBoundsHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("setBound", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;


		//Generally getWindow is used inside of docking. We want errors if we can't find a window. Here, it's being used all throughout the system, including by windows whose movement isn't managed by docking. By passing false, we will eliminate unnecessary and confusing errors for the dev-user.
		let dockableWindow = this.dockingMain.getWindow(windowIdentifier.name, false);
		if (dockableWindow) {
			dockableWindow.setBounds(queryMessage.data.bounds, callback);
		} else {
			let wrap = WindowPoolSingleton.get(windowIdentifier.name);
			if (wrap) {
				wrap._setBounds(queryMessage.data, callback);
			} else {
				callback("no dockable window", null);
			}
		}
	}
	async animateHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("animate", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;
		//Generally getWindow is used inside of docking. We want errors if we can't find a window. Here, it's being used all throughout the system, including by windows whose movement isn't managed by docking. By passing false, we will eliminate unnecessary and confusing errors for the dev-user.
		let dockableWindow = this.dockingMain.getWindow(windowIdentifier.name, false);
		if (dockableWindow) {
			dockableWindow.animate(queryMessage.data, callback);
		} else {
			let wrap = WindowPoolSingleton.get(windowIdentifier.name);
			if (wrap) {
				wrap._animate(queryMessage.data, callback);
			} else {
				callback("no dockable window", null);
			}
		}
	}
	async getBoundsHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("getBounds", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let dockableWindow = this.dockingMain.getWindow(windowIdentifier.name, false);
		if (dockableWindow) {
			let bounds = dockableWindow.getBounds();
			callback(null, bounds);
		} else {
			let wrap = WindowPoolSingleton.get(windowIdentifier.name);
			if (wrap) {
				wrap._getBounds(queryMessage.data, (err, data) => {
					Logger.system.debug(`WindowService-Request.getBounds response`, queryMessage.data, data);
					callback(err, data)
				});
			} else {
				callback(`unidentified window name: ${windowIdentifier.name}`, null);
			}
		}
	}

	async getOptionsHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("getOptions", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._getOptions(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async updateOptionsHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("updateOptions", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._updateOptions(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async hideHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("hide", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._hide(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async showHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("show", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._show(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}
	async showAtHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("showAt", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._showAt(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async alwaysOnTopHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("alwaysOnTop", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._alwaysOnTop(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async setOpacityHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("setOpacity", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap._setOpacity(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async setComponentStateHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("setComponentState", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap.setComponentState(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async removeComponentStateHandler(queryError, queryMessage) {
		const { windowIdentifier } = this.publicWindowHandlerPreface("removeComponentState", queryError, queryMessage);
		const callback = queryMessage.sendQueryResponse;

		const wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap.removeComponentState(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async setWindowStateHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("setWindowState", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap.setWindowState(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async saveCompleteWindowStateHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("saveCompleteWindowState", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap.saveCompleteWindowState(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async getWindowStateHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("getWindowState", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap.getWindowState(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async getComponentStateHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("getComponentState", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap.getComponentState(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async setParentHandler(queryError, queryMessage) {
		let { windowIdentifier } = this.publicWindowHandlerPreface("setParent", queryError, queryMessage);
		let callback = queryMessage.sendQueryResponse;

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {
			wrap.setParent(queryMessage.data, callback);
		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}

	async closeHandler(queryError, queryMessage) {
		var wrapState: WrapState;

		let { windowIdentifier, eventName } = this.publicWindowHandlerPreface("close", queryError, queryMessage)
		let callback = queryMessage.sendQueryResponse;

		let delayInterrupters = (eventName, afterSetup) => {
			let delayers = {};
			let listenerCount = 0;
			let resolvePromise;
			let promiseResolved = false;

			let gotResponses = setTimeout(() => { // deal with dead windows and bad actors who do not act upon requested delays.
				for (let guid in this.eventInterruptors[windowIdentifier.name][eventName]) {
					if (!delayers[guid]) {
						Logger.system.warn(windowIdentifier.name, " had a bad wrap somewhere that did not publish or remove ", guid, " listener for ", eventName, ". Details:", this.eventInterruptors[windowIdentifier.name][eventName][guid]);
						delete this.eventInterruptors[windowIdentifier.name][eventName][guid];
					}
				}
				if (!this.eventInterruptors[windowIdentifier.name][eventName] || Object.keys(this.eventInterruptors[windowIdentifier.name][eventName]).length == 0) {
					promiseResolved = true;
					resolvePromise();
				} else {
					Logger.system.debug("closeHandler: Waiting on ", delayers);
				}
			}, 1000);
			let listener = (sid, eventGuid, response) => {
				if (promiseResolved) return;
				let data = response.data;
				if (Object.keys(data).length > 0 && this.eventInterruptors[windowIdentifier.name][eventName][eventGuid]) { // if initial pubsub "empty" state without any key then ignore
					Logger.system.debug("Got Publish from intteruptor", windowIdentifier.name, eventName, eventGuid, response);
					if (!data.delayed && !data.canceled) {
						RouterClient.unsubscribe(sid);
						listenerCount--;
						Logger.system.debug("Listener fired for ", eventName, windowIdentifier.name, response.header.origin, data, "Listeners remaining: ", JSON.stringify(listenerCount));
						Logger.system.debug("Remove interruptor", windowIdentifier.name, eventGuid);
						delete this.eventInterruptors[windowIdentifier.name][eventName][eventGuid];
						if (Object.keys(this.eventInterruptors[windowIdentifier.name][eventName]).length == 0) {
							Logger.system.debug("All listeners completed for ", eventName, windowIdentifier.name);
							promiseResolved = true;
							resolvePromise();
							clearTimeout(gotResponses);
						}
					} else {
						delayers[eventGuid] = true;
					}
				} else if (Object.keys(this.eventInterruptors[windowIdentifier.name][eventName]).length == 0) {
					promiseResolved = true;
					resolvePromise();
					clearTimeout(gotResponses);
				}
			};

			let p = new Promise(function (resolve, reject) {
				resolvePromise = resolve;
			});

			let eventInterruptors = this.eventInterruptors[windowIdentifier.name];
			if (eventInterruptors && eventInterruptors[eventName]) {
				for (let eventGuid in eventInterruptors[eventName]) {
					listenerCount++;
					Logger.system.debug("Adding Subscriber for intteruptor", windowIdentifier.name, eventName, eventGuid, " for origin ", eventInterruptors[eventName][eventGuid]);
					let sid = RouterClient.subscribe(Constants.EVENT_INTERRUPT_CHANNEL + "." + eventGuid, (err, response) => {
						listener(sid, eventGuid, response);
					});
				}
			} else {
				resolvePromise();
			}
			afterSetup();
			Logger.system.debug("WRAP CLOSE. Waiting on", listenerCount.toString(), "listeners for ", eventName, windowIdentifier.name);
			return p;
		}

		let wrap = WindowPoolSingleton.get(windowIdentifier.name);

		if (wrap) {

			Logger.system.debug("WRAP CLOSE. starting in wrap", windowIdentifier.name);

			let wrapState = "closing";
			// we update wrapState over the router, but it's not always happening fast enough to prevent new listeners from being set up
			wrap.wrapState = wrapState;

			Logger.system.debug("COMPONENT LIFECYCLE: STATE CHANGE: ", windowIdentifier.name, wrapState);
			RouterClient.publish("Finsemble.Component.State." + windowIdentifier.name, { state: wrapState });

			//After all listeners are set up, we trigger the event <- allow other windows to prevent closing
			await delayInterrupters("close-requested", () => {
				wrap.eventManager.trigger("close-requested");
			});

			// Since we don't even call close on the window until all close-requested handlers are done, this allows for things inside the window itself to prevent closing.
			// private wraps can listen for this event, trigger a close in the window and put a kibash on the close if needed.
			// Currently only used by .NET components.
			await delayInterrupters("_container-close-handlers", () => {
				wrap.eventManager.trigger("_container-close-handlers");
			});

			// This is an event for the wraps to delete themselves
			Logger.system.debug("WRAP CLOSE. Triggered close for", windowIdentifier.name);
			await delayInterrupters("closed", () => {
				wrap.eventManager.trigger("closed", queryMessage.data);
			});
			Logger.system.debug("WRAP CLOSE. All closed events fired", windowIdentifier.name);

			// Actually close the window
			if (queryMessage.data.removeFromWorkspace) {
				await WorkspaceClient.removeWindow({ name: wrap.name });
			}

			wrap._close(queryMessage.data, async () => {
				Logger.system.debug("WRAP CLOSE. Removing wrap.", windowIdentifier.name);
				wrap.handleWrapRemoveRequest();
				Logger.system.debug("WRAP CLOSED. Invoking callback.", windowIdentifier.name);
				//Public wraps wait for this to clean themselves up. Can't wait on closed because our cleanup removes the wrap entirely. Other listeners might fail if our cleanup handler fires first.
				await delayInterrupters("close-complete", () => {
					Logger.system.debug("WRAP CLOSE. All close-complete events fired", windowIdentifier.name);
					wrap.eventManager.trigger("close-complete");
				});

				wrapState = "closed";
				Logger.system.debug("COMPONENT LIFECYCLE: STATE CHANGE: ", wrapState, windowIdentifier.name);
				RouterClient.publish("Finsemble.Component.State." + windowIdentifier.name, { state: wrapState });

				WindowPoolSingleton.remove(windowIdentifier.name);
				callback();
			});

		} else {
			callback(`unidentified window name: ${windowIdentifier.name}`, null);
		}
	}
}
