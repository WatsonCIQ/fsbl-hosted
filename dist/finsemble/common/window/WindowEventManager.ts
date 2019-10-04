import RouterClient from "../../clients/routerClientInstance";
import Logger from "../../clients/logger";
import { EventEmitter } from "events";

/**
 * DIAGRAM: https://realtimeboard.com/app/board/o9J_kzFZvJ0=/?moveToWidget=3074457346159922380
 * The reason I want this to exist is so that the windows don't have to worry about subscribing to and unsubscribing from events. This object will handle all event subscription/emission for the pubic and private window implementations.
 *
 * It will be capable of listening for remote events and triggering local events to match. It will handle router cleanup, and should narrow down the places that we have to look when an event isn't firing properly.
 *
 * Outside of the windowService, events can be listened for by simply calling:
 * finsembleWindow.addListener(event, handler);
 *
 * finsembleWindow.addListener will call finsembleWindow.WindowEventManager.listenForRemoteEvent();
 *
 * The private window implementations will use the proxyEventsForWindow method in order to distribute events to remote wraps.
 *
 * @interface WindowEventManager
 * @extends {EventEmitter}
 */

export declare interface WindowEventManager extends EventEmitter {
	//event list for the event emitter.
	listeningFor: any[];
	/**
	 * Array of events that we're subscribed to remotely. When receiving a remote event, the event manager will emit a local event.
	 * @type {any}
	 * @memberof WindowEventManager
	 */
	remoteEventSubscriptions: any;
	//Window whose events are being managed
	windowName: string;

	/**
	 * Disconnects all router listeners. Removes all listeners added to the event emitter.
	 * @memberof WindowEventManager
	 */
	cleanup(): void;
	/**

	* Returns router channel name for a given window event + window name combination.
	 *
	 * @param {WindowEventName} eventName
	 * @returns {string}
	 * @memberof WindowEventManager
	 */
	getChannelName(eventName: WindowEventName): string;

	/**
	 * Single point of entry to the eventEmitter's `emit` method. This will be called when the router listener is fired in response to an event happening somewhere else in the system. Could also be triggered by an event fired from the underlying wrapper.
	 *
	 * @private
	 * @param {WindowEventName} eventName
	 * @param {WindowEvent | BoundsChangeEvent} data
	 * @memberof WindowEventManager
	 */
	emitLocalEvent(eventName: WindowEventName, data: WindowEvent | BoundsChangeEvent): void;

	/**
	 * Adds a router listener for remote events if we are not already listening for that event. If the optional handler is passed in, will add a local event listener to be triggered the next time the event fires.
	 *
	 * @param {WindowEventName} eventName
	 * @param {Function} [handler]
	 * @memberof WindowEventManager
	 */
	listenForRemoteEvent(eventName: WindowEventName, handler?: Function): void;

	/**
	 * Convenience function to allow wrap to receive multiple remote events. Dev would then need to add a handler for each event that they care about. May not be useful.
	 *
	 * @param {WindowEventName[]} eventList
	 * @memberof WindowEventManager
	 */
	listenForRemoteEvents(eventList: WindowEventName[]): void;

	/**
	 * Currently we cannot have a special routerClient for every object. So this method will keep track of channel/listener combinations so we can cleanup when the wrap calls cleanup.
	 *
	 * @param {*} eventName
	 * @param {*} handler
	 * @memberof WindowEventManager
	 */
	rememberRouterChannelForLaterRemoval(eventName: WindowEventName, handler?: Function): void;

	/**
	 * Broadcasts an event to any event manager listening for this event.
	 *
	 * @param {WindowEventName} eventName
	 * @param {WindowEvent | BoundsChangeEvent} data
	 * @memberof WindowEventManager
	 */
	transmitRemoteEvent(eventName: WindowEventName, data: WindowEvent | BoundsChangeEvent): void;

	/**
	 * Used by the window implementations in the window service. This method will emit an event up to the local process, and transmit an event out to the rest of the system.
	 * @private
	 * @param {WindowEventName[]} eventName
	 * @param {WindowEvent | BoundsChangeEvent} data
	 * @memberof WindowEventManager
	 */
	trigger(eventName: WindowEventName, data?: WindowEvent | BoundsChangeEvent): void;
}

declare type EventManagerConstructorParams = {
	//window name
	name: string;
}

export class WindowEventManager extends EventEmitter implements WindowEventManager {
	/**
	* Array of events that we're subscribed to remotely. When receiving a remote event, the event manager will emit a local event.
	* @type {WindowEventName[]}
	* @memberof WindowEventManager
	*/
	constructor(params: EventManagerConstructorParams) {
		super();
		this.windowName = params.name;
		this.remoteEventSubscriptions = {};
		//array of events we're listening for. to prevent multiple router listeners for the same event.
		this.listeningFor = [];
		this.setMaxListeners(25);
	}
	_addListener(event: string | symbol, listener: (...args: any[]) => void) {
		super.addListener(event, listener);
	}
	/**
	 * Disconnects all router listeners. Removes all listeners added to the event emitter.
	 * @memberof WindowEventManager
	 */
	cleanup(): void {
		Logger.system.info("WindowEventManager.cleanup", this.windowName);
		//removes listeners added to the event emitter.
		this.removeAllListeners();

		//removes listeners added to the RouterClient.
		let eventSubscriptions: Array<string> = Object.keys(this.remoteEventSubscriptions);

		Logger.system.info("WRAP CLOSE. WindowEventManager.cleanup. Removing router subscriptions", this.windowName, eventSubscriptions);

		eventSubscriptions.forEach(channelName => {
			let handlers: Array<StandardCallback> = this.remoteEventSubscriptions[channelName];
			handlers.forEach(handler => {
				RouterClient.removeListener(channelName, handler);
			});
		});
	}

	/**
	 * Single point of entry to the eventEmitter's `emit` method. This will be called when the router listener is fired in response to an event happening somewhere else in the system. Could also be triggered by an event fired from the underlying wrapper.
	 *
	 * @private
	 * @param {WindowEventName} eventName
	 * @param {WindowEvent | BoundsChangeEvent} data
	 * @memberof WindowEventManager
	 */
	emitLocalEvent(eventName: WindowEventName, data: WindowEvent | BoundsChangeEvent): void {
		Logger.system.info("WindowEventManager.emitLocalEvent. Emitting Event", this.windowName, eventName, data);
		this.emit(eventName, data);
	}

	/**
	 * Returns router channel name for a given window event + window name combination.
	 *
	 * @param {WindowEventName} eventName
	 * @returns {string}
	 * @memberof WindowEventManager
	 */
	getChannelName(eventName: WindowEventName) {
		return `WindowService-Event-${this.windowName}-${eventName}`;
	}

	/**
	 * Adds a router listener for remote events if we are not already listening for that event. If the optional handler is passed in, will add a local event listener to be triggered the next time the event fires.
	 *
	 * @param {WindowEventName} eventName
	 * @param {Function} [handler]
	 * @memberof WindowEventManager
	 */
	listenForRemoteEvent(eventName: WindowEventName, handler?: Function): void {
		Logger.system.debug("WindowEventManager.listenForRemoteEvent", this.windowName, eventName);

		let channelName: string = this.getChannelName(eventName);
		const remoteEventHandler = (err, response): void => {
			Logger.system.debug("WindowEventManager. Received remote event", this.windowName, eventName);
			if (err) {
				throw new Error(err);
			}

			//todo need to accommodate wrap-state-changed events in here...maybe?
			let data: WindowEvent | BoundsChangeEvent = { eventName, name: this.windowName };

			if (eventName.includes("bounds") || eventName.includes("parent")) {
				//bounds events need to push out more data than just name/eventName. ...response.data will destructure the object and copy them into this new object.
				data = {
					eventName,
					...response.data
				}
			}
			if (!response.originatedHere()) {
				Logger.system.debug("WindowEventManager. Received remote event emitted", this.windowName, eventName, data);
				this.emitLocalEvent(eventName, data)
			}
		}

		//We only want one router listener per event. Otherwise, we'll emit the same event multiple times.
		if (!this.listeningFor.includes(eventName)) {
			this.listeningFor.push(eventName);
			Logger.system.debug("WindowEventManager.listenForRemoteEvent. Adding listener to the router", this.windowName, eventName);
			//When the remote event is triggered, emit an event locally.
			RouterClient.addListener(channelName, remoteEventHandler);
			//If a handler is passed in, listen locally for the event to be thrown.
			Logger.system.debug("WindowEventManager.listenForRemoteEvent. Handler included, adding listener to local event emitter", this.windowName, eventName);
			this.rememberRouterChannelForLaterRemoval(channelName, remoteEventHandler);
		}
	}

	/**
	 * Convenience function to allow wrap to receive multiple remote events. Dev would then need to add a handler for each event that they care about. May not be useful.
	 *
	 * @param {WindowEventName[]} eventList
	 * @memberof WindowEventManager
	 */
	listenForRemoteEvents(eventList: WindowEventName[]): void {
		//verbose because each event will be logged in listenForRemoteEvent.
		Logger.system.verbose("WindowEventManager.listenForRemoteEvents. Listen for remote events", this.windowName, eventList);
		eventList.forEach(eventName => {
			this.listenForRemoteEvent(eventName);
		});
	}

	/**
	 * Broadcasts an event to any event manager listening for this event.
	 *
	 * @param {WindowEventName} eventName
	 * @param {WindowEvent | BoundsChangeEvent} data
	 * @memberof WindowEventManager
	 */
	transmitRemoteEvent(eventName: WindowEventName, data: WindowEvent | BoundsChangeEvent): void {
		Logger.system.debug("WindowEventManager.transmitRemoteEvent. Transmitting event to public wrappers", eventName, data);
		let channelName: string = this.getChannelName(eventName);
		RouterClient.transmit(channelName, data, { suppressWarnings: true });
	}

	/**
 * Used by the window implementations in the window service. This method will emit an event up to the local process, and transmit an event out to the rest of the system.
 * @private
 * @param {WindowEventName[]} eventName
 * @param {WindowEvent | BoundsChangeEvent} data
 * @memberof WindowEventManager
 */
	trigger(eventName: WindowEventName, data?: any): void {
		Logger.system.info("WindowEventManager.trigger. Event triggered. Event will be emitted locally and transmitted to public wrappers. Window Name", this.windowName, "Event name", eventName, "Event data", data);
		//If we have data, annotate it. Otherwise, create a generic window event.
		if (data) {
			data.name = this.windowName;
			data.eventName = eventName;
		} else {
			data = {
				name: this.windowName,
				eventName: eventName
			}
		}

		this.emitLocalEvent(eventName, data);
		this.transmitRemoteEvent(eventName, data);
	};

	/**
 * Currently we cannot have a special routerClient for every object. So this method will keep track of channel/listener combinations so we can cleanup when the wrap calls cleanup.
 *
 * @param {*} eventName
 * @param {*} handler
 * @memberof WindowEventManager
 */
	rememberRouterChannelForLaterRemoval(channelName: string, handler: Function): void {
		Logger.system.debug("WindowEventManager.rememberRouterChannelForLaterRemoval.", channelName)
		if (!this.remoteEventSubscriptions[channelName]) {
			this.remoteEventSubscriptions[channelName] = [];
		}
		this.remoteEventSubscriptions[channelName].push(handler);
	};

}
