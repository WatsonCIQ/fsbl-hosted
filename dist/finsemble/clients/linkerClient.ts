/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
import Validate from "../common/validate"; // Finsemble args validator
import BaseClient, { _BaseClient } from "./baseClient";
import WindowClient from "./windowClient";
import LauncherClient from "./launcherClient";
import DistributedStoreClient from "./distributedStoreClient";
import Logger from "./logger";

Logger.system.debug("Starting LinkerClient");
var sysinfo = Logger.system.info;
var sysdebug = Logger.system.debug;
import { parallel as asyncParallel } from "async";

import deepEqual = require("lodash.isequal");

function makeKey(windowIdentifier) {
	return (windowIdentifier.windowName + "::" + windowIdentifier.uuid).replace(".", "_");
};

/**
	* A convenience function to send data to a callback and also return it
	* @private
	* @example
	* return asyncIt(cb, data)
*/
function asyncIt(data, cb?) {
	if (cb) cb(null, data);
	return data;
};

declare type linkerGroup = {
	/**
	 * name of the channel
	 */
	name: string,
	/**
	 * color. Required to use Finsemble's built-in Linker component.
	 */
	color?: string,
	/**
 * border color. Required to use Finsemble's built-in Linker component.
 */
	border?: string
}

/**
 *
 * @introduction
 * <h2>Linker Client</h2>
 * <h3>Public API for the Linker Service</h3>
 * <p>
 * The Linker API provides a mechanism for synchronizing components on a piece of data. For instance, a user might want to link multiple components by stock symbol.
 * Using the Linker API, a developer could enable their component to participate in this synchronization.
 * The developer would use {@link LinkerClient#subscribe} to receive synchronization events, and they would use {@link LinkerClient#publish} to send them.
 * The Linker API is inherently similar to the [Router Client's](IRouterClient.html) pub/sub mechanism. The primary difference is that the Linker API is designed for end-user interaction.
 * By exposing the Linker API, developers allow **end users** to create and destroy linkages at run-time.
 * </p>
 *
 * <p>
 * In order for components to be linked, they must understand the data format that will be passed between them (the "context"), and agree on a label that identifies that format (the "dataType").
 * For instance, components might choose to publish and subscribe to a dataType called `"symbol"`.
 * They would then also need to agree what a `"symbol"` looks like, for instance, `{symbol:"IBM"}`.
 * The Linker API doesn't proscribe any specific format for context or set of labels (some would call this a "taxonomy").
 * See [the FDC3 project](https://fdc3.org/) for an emerging industry standard taxonomy.
 * </p>
 *
 * <p>
 * End users create linkages by assigning components to "channels." Our default implementation represents channels by color.
 * When a component is assigned to the purple channel, publish and subscribe messages are only received by other components assigned to that channel.
 * If you're using Finsemble's built-in Linker component, you won't have to code this. The Linker component does the work of assigning and un-assigning its associated component to the selected channel.
 * However, the Linker API exposes functionality so that you can manage channels programmatically if you choose.
 * You could use these functions to build your own Linker component using a different paradigm, or intelligently link components based on your own business logic.
 * **Note:** it is not necessary to stick to a color convention. Channels are simple strings and so can be anything.
 * </p>
 *
 * <p>
 * Behind the scenes, the Linker Service coordinates Linker activity between components. It keeps track of the available channels and channel assignments.
 * It uses a dedicated store ({@link DistributedStoreClient}) to maintain this information and also persists the information to workspaces ({@link WorkspaceClient}).
 * </p>
 *
 * <p>
 * See more on using the Linker API at our <a href="tutorial-Linking.html">Linking tutorial</a>.
 * </p>
 * @hideconstructor
 *
 * @constructor
 */

// @todo, take a documentation pass. Update Linker tutorial. Point to Linker Component docs. Default config.
// @todo, move linker config from finsemble to finsemble-seed and finsemble-sales-demo

class LinkerClient extends _BaseClient {
	constructInstance: () => LinkerClient;
	linkerStore;
	launcherClient;
	windowClient;
	distributedStoreClient;
	dontPersistYet: boolean;

	constructor(params) {
		super(params);
		Validate.args(params, "object=") && params && (Validate as any).args2("params.onReady", params.onReady, "function=");
		this.launcherClient = params.clients.launcherClient;
		this.windowClient = params.clients.windowClient;
		this.distributedStoreClient = params.clients.distributedStoreClient;
	}

	stateChangeListeners = [];

	// Linker Data
	allChannels = [];
	channels = {};
	clients = {};

	channelListenerList = []; // Used to keep track of each router listener that is enabled
	dataListenerList = {};

	/**
	 * 1/24/19 this is Brad guessing. This function has never existed. This is the first commit where 'getChannel' is referenced...but not defined.
	 *
	 * https://github.com/ChartIQ/finsemble/blob/ad25aa219c5fac60c277bccf35dea43568da2a07/src/clients/linkerClient.js
	 *
	 * No idea how it ever worked.
	 * @private
	 *
	 */
	getChannel(name: string) {
		return this.allChannels.filter(channel => channel.name === name).length > 0;
	}


	/**
	 * Create a new Linker channel. This channel will be available *globally*.
	 * @param {object} params
	 * @param cb - Optional. Callback to retrieve returned results asynchronously
	 * @return {Array.<string>} Returns an array of all available channels
	 * @private
	 * @since TBD deprecated createGroup
	 * @example
	 * LinkerClient.createChannel({name: "red", color: "#ff0000", border: "#ffffff"}, callback)
	 */
	createChannel(params: linkerGroup, cb: Function) {
		sysinfo("LinkerClient.createChannel", "PARAMS", params);
		Validate.args(params, "object");

		if (!params.name) {
			sysdebug("LinkerClient.createChannel: Name is required");
			return asyncIt(this.allChannels, cb);
		}

		if (this.getChannel(params.name)) {
			sysdebug("LinkerClient.createChannel: Channel " + params.name + " Already Exists");
			return asyncIt(this.allChannels, cb);
		}

		this.allChannels.push(params);
		this.allGroups = this.allChannels; // backward compatibility
		this.linkerStore.setValue({ field: "params", value: this.allChannels });

		return asyncIt(this.allChannels, cb);
	};

	/**
	 * Remove a Linker channel. It will be removed globally. Any component that is currently assigned to this channel will be unassigned.
	 *
	 * @param {string} name - The name of the channel to remove
	 * @param cb - Optional. Callback to retrieve returned results asynchronously
	 * @returns {Array.<string>} Returns an array of available channels
	 * @since TBD deprecated deleteGroup
	 * @private
	 *
	 * @example
	 * LinkerClient.removeChannel("purple")
	 *
	 */
	removeChannel(name: string, cb: Function) {
		sysinfo("LinkerClient.removeChannel", "NAME", name);
		Validate.args(name, "string");
		if (!this.getChannel(name)) {
			sysdebug("Channel " + name + "does not exist", null);
			return asyncIt(this.allChannels, cb);
		}

		let channels = this.allChannels;
		for (var i = 0; i < channels.length; i++) {
			if (name === channels[i].name) {
				channels.splice(i, 1);
				break;
			}
		}

		this.linkerStore.setValue({ field: "channels", value: this.allChannels });

		// TODO: Verify that this even works
		let clients = this.clients;
		for (var c in clients) {
			var client = clients[c];
			for (var channel in client.channels) {
				if (name === channel) {
					delete client[channel];
					break;
				}
			}
		}

		this.linkerStore.setValue({ field: "clients", value: this.clients });

		return asyncIt(this.allChannels, cb);
	};

	/**
	 * Convenience function to update the client information in the store.
	 * @private
	 */
	updateClientInStore(key) {
		this.linkerStore.setValue({ field: "clients." + key, value: this.clients[key] });
	};
	/**
	 * Add a component to a Linker channel programmatically. Components will begin receiving any new contexts published to this channel but will *not* receive the currently established context.
	 *
	 * @param {string} channel - The name of the channel to link our component to, or an array of names.
	 * @param windowIdentifier -  Optional. Window Identifier for the component. If null, it defaults to the current window.
	 * @param cb - Optional. Callback to retrieve returned results asynchronously.
	 * @return {LinkerState} The new state: linked channels, all channels
	 * @since 2.3 deprecated addToGroup
	 * @example
	 *
	 * LinkerClient.linkToChannel("purple", null); // Link current window to channel "purple".
	 * LinkerClient.linkToChannel("purple", windowIdentifier); // Link the requested window to channel "purple".
	 *
	 */
	linkToChannel(channel: string | string[], windowIdentifier: WindowIdentifier, cb?: Function) {
		sysinfo("LinkerClient.linkToChannel", "CHANNEL", channel, "COMPONENT", windowIdentifier);
		Validate.args(channel, "string", windowIdentifier);
		if (!windowIdentifier) windowIdentifier = this.windowClient.getWindowIdentifier();

		var key = makeKey(windowIdentifier);

		if (!this.clients[key]) {
			this.clients[key] = {
				client: windowIdentifier,
				channels: {}
			};
		}

		if (Array.isArray(channel)) {
			for (let i = 0; i < channel.length; i++) {
				this.clients[key].channels[channel[i]] = true;
			}
		} else {
			this.clients[key].channels[channel] = true;
		}

		this.updateClientInStore(key);

		return asyncIt(this.getState(windowIdentifier), cb);
	};

	/**
	 * Unlinks a component from a Linker channel.
	 *
	 * @param {string} channel - Channel to remove, or an array of channels. If null, then all channels will be removed.
	 * @param windowIdentifier -  Window Identifier for the client (optional). Current window if left null.
	 * @param cb - Optional. Callback to retrieve returned results asynchronously
	 * @return {LinkerState} Returns the new state: linked channels, all channels
	 * @since 2.3 deprecated removeFromGroup
	 * @example
	 *
	 * LinkerClient.unlinkFromChannel("purple", null); // Unlink the current window from channel "purple"
	 * LinkerClient.unlinkFromChannel("purple", windowIdentifier) // Unlink the requested window form channel "purple"
	 *
	 */
	unlinkFromChannel(channel: string | string[], windowIdentifier: WindowIdentifier, cb?: Function) {
		sysinfo("LinkerClient.unlinkFromChannel", "CHANNEL", channel, "WINDOW IDENTIFIER", windowIdentifier);
		Validate.args(channel, "string", windowIdentifier);
		if (!windowIdentifier) windowIdentifier = this.windowClient.getWindowIdentifier();

		var key = makeKey(windowIdentifier);
		var componentEntry = this.clients[key];

		if (Array.isArray(channel)) {
			// Delete an array of channels
			for (let i = 0; i < channel.length; i++) {
				delete componentEntry.channels[channel[i]];
			}
		} else if (!channel) {
			// Delete all channels
			for (let name in componentEntry.channels) {
				delete componentEntry.channels[name];
			}
		} else {
			//Cannot access componentEntry.channels[channel] if channel is an array.
			if (!componentEntry || !componentEntry.channels[channel]) {
				let component = this.clients[key];
				sysdebug("Component was not in specified channel " + channel, component, component.channels[channel]);
				return asyncIt(this.getState(windowIdentifier), cb);
			}
			// Delete a specific channel
			delete componentEntry.channels[channel];
		}
		this.updateClientInStore(key);

		return asyncIt(this.getState(windowIdentifier), cb);
	};

	/**
	 * Returns all available Linker channels
	 * @param cb - Optional. Callback to retrieve returned results asynchronously
	 * @return {array} An array of all channels. Each array item is {name:channelName} plus any other optional fields such as color.
	 * @since 2.3 deprecated getAllGroups
	 * @example
	 * LinkerClient.getAllChannels()
	 */
	getAllChannels(cb?: Function) {
		sysinfo("LinkerClient.getAllChannels");
		return asyncIt(this.allChannels, cb);
	};

	/**
	 * Retrieve all channels linked to the requested component. Also returns all available channels.
	 * @param windowIdentifier Which component, or null for the current window.
	 * @param cb - Optional. Callback to retrieve returned results asynchronously
	 * @return {LinkerState} The current state: linked channels, all channels
	 * @since 2.3 deprecated getGroups, no longer supports a callback
	 * @example
	 * var state=LinkerClient.getState(windowIdentifier)
	 */
	getState(windowIdentifier?: WindowIdentifier, cb?: StandardCallback) {
		sysinfo("LinkerClient.getState", "WINDOW IDENTIFIER", windowIdentifier);
		var state = {
			channels: {},
			allChannels: this.allChannels
		};
		if (!windowIdentifier) windowIdentifier = this.windowClient.getWindowIdentifier();
		if (!Object.keys(this.clients).length) {
			return asyncIt(state, cb);
		}
		var key = makeKey(windowIdentifier);
		var componentEntry = this.clients[key];
		if (!componentEntry) {
			return asyncIt(state, cb);
		}

		// Create an array of channel descriptors, one for each linked channel
		// Convert {"purple": true, "green":true} to [{"name":"purple"},{"name":"green"}]
		state.channels = this.allChannels.filter(function (value) {
			return componentEntry.channels && componentEntry.channels[value.name] === true;
		});

		// Cleanup code in case of an oops. If we're accessing this component, it must be alive. Make sure the store reflects this.
		if (!componentEntry.active) {
			componentEntry.active = true;
			this.linkerStore.setValue({ field: "clients." + key, value: componentEntry });
		}

		return asyncIt(state, cb);
	};

	/**
	* Remove all listeners for the specified dataType.
	* @param {String}  dataType - The data type be subscribed to
	* @param {function} cb - Optional. Callback to retrieve returned results asynchronously (empty object)
	*
	* @example
	* LinkerClient.unsubscribe("symbol");
	*/
	unsubscribe(dataType: string, cb?: StandardCallback) {
		sysinfo("LinkerClient.unsubscribe", "DATA TYPE", dataType);
		Validate.args(dataType, "string");
		delete this.dataListenerList[dataType];
		return asyncIt({}, cb);
	};

	/**
	* Publish a piece of data. The data will be published to *all channels* that the component is linked to. Foreign components that are linked to those channels will receive the data if they have subscribed to this dataType. They can then use that data to synchronize their internal state. See {@link LinkerClient#subscribe}.
	* @param {Object}  params
	* @param {String}  params.dataType - The data type being sent.
	* @param {any}  params.data - The data ("context") being transmitted.
    * @params.channels - Optional. Specifies which channels publish this piece of data. This overrides the default which is to publish to all linked channels.
	* @param cb - Optional. Callback to retrieve returned results asynchronously
	* @example
	* LinkerClient.publish({dataType:"symbol",data:"AAPL"})
	*/
	publish(params: {
		dataType: string,
		data: any,
		channels?: string[]
	}, cb: StandardCallback) {
		sysinfo("LinkerClient.publish", "PARAMS", params);
		Validate.args(params.dataType, "string", params.data, "any");
		let channels = Object.keys(this.channels);
		if (params.channels) channels = params.channels;
		for (var i = 0; i < channels.length; i++) {
			var channel = channels[i];
			//@todo [Terry] why are we transmitting two messages here?
			this.routerClient.transmit(channel + "." + params.dataType, { type: params.dataType, data: params.data });
			this.routerClient.transmit(channel, { type: params.dataType, data: params.data });
		}
		return asyncIt({}, cb);
	};

	/**
	* Registers a client for a specific data type that is sent to a channel. Calling `subscribe` multiple times adds additional handlers.
	* @param {String} dataType A string representing the data type to subscribe to.
	* @param {function} cb -  A function to be called once the linker receives the specific data.
	* @example
	* LinkerClient.subscribe("symbol", function(data){
		console.log("New symbol received from a remote component " + data);
	  });
	*/
	subscribe(dataType: string, cb: StandardCallback) {
		sysinfo("LinkerClient.subscribe", "DATA TYPE", dataType);
		Validate.args(dataType, "string", cb, "function");
		if (this.dataListenerList[dataType]) {
			return this.dataListenerList[dataType].push(cb);
		}
		this.dataListenerList[dataType] = [cb];
	};

	/**
	 * Retrieves an array of all components with links that match the given parameters. If no parameters are specified, all windows with established links will be returned.
	 *
	 * @param {object} params Optional
	 * @param {Array.<string>} params.channels Restrict to these channels.
	 * @param {Array.<string>} params.componentTypes Restrict to these componentTypes.
	 * @param {windowIdentifier} params.windowIdentifier Restrict to this component.
	 * @param cb - Optional. Callback to retrieve returned results asynchronously.
	 * @returns {array} An array of linked components, their windows, and their linked channels.
	 *
	 * @since 1.5
	 * @since 2.3 deprecated getLinkedWindows
	 * @example <caption>Get all components linked to a given component</caption>
	 * LinkerClient.getLinkedComponents({windowIdentifier: wi});
	 *
	 * @example <caption>Get all components linked to channel "purple"</caption>
	 * LinkerClient.getLinkedComponents({channels: ['purple']});
	 * // Response format: [{windowName: 'Window Name', componentType: 'Component Type', uuid: 'uuid', channels: ['purple'] }, ..]
	 *
	 */
	getLinkedComponents(params: {
		channels?: string[],
		componentTypes?: string[],
		windowIdentifier?: WindowIdentifier
	}, cb?: StandardCallback) {
		sysinfo("LinkerClient.getLinkedComponents", "PARAMS", params);
		var linkedWindows = [];

		// Fix params
		if (!params) { params = {}; }
		if (params.channels && !Array.isArray(params.channels)) {
			Validate.args(params.channels, "string");
			params.channels = [params.channels];
		}
		if (params.componentTypes && !Array.isArray(params.componentTypes)) {
			Validate.args(params.componentTypes, "string");
			params.componentTypes = [params.componentTypes];
		}
		if (params.componentTypes) { Validate.args(params.componentTypes, "array"); }

		// If we have a client
		if (params.windowIdentifier) {
			var key = makeKey(params.windowIdentifier);
			var myChannels = Object.keys(this.clients[key].channels);

			if (!params.channels) {
				// If no channels are specified, use the window identifier channels
				params.channels = myChannels;
			} else {
				// Otherwise use an intersection of params.channels and the component's channels
				params.channels = params.channels.filter(o => myChannels.includes(o));
			}
		}

		// if no channels, assume all channels
		if (!params.channels) params.channels = this.getAllChannels().map(o => o.name);

		// Get all active
		for (let c in this.clients) {
			var component = this.clients[c];
			if (!component.channels) { // frame fix
				component = component[Object.keys(component)[0]];
			}
			var clientMatchesChannels = Object.keys(component.channels).filter(o => params.channels.includes(o)).length;
			var clientMatchesComponentTypes = true;
			if (params.componentTypes) clientMatchesComponentTypes = params.componentTypes.includes(component.client.componentType);

			if (component.active && clientMatchesChannels && clientMatchesComponentTypes) {
				linkedWindows.push({
					windowName: component.client.windowName,
					componentType: component.client.componentType,
					uuid: component.client.uuid,
					channels: Object.keys(component.channels)
				});
			}
		}

		return asyncIt(linkedWindows, cb);
	};

	/**
	 * Handles listeners (looks to see if there is a listener for a specific data type)
	 * @private
	 */
	handleListeners = (err, data) => {
		//Need to do this better. Get newest items so we don't create it every time
		var listeners = this.dataListenerList[data.data.type];
		if (listeners && listeners.length > 0) {
			for (var i = 0; i < listeners.length; i++) {
				listeners[i](data.data.data, { data: data.data.data, header: data.header, originatedHere: data.originatedHere });
			}
		}
	}

	/**
	 * Adds new listeners for channels when channels are updated
	 * @private
	 */
	updateListeners() {
		// Remove listeners
		for (let i = this.channelListenerList.length - 1; i >= 0; i--) {
			let channel = this.channelListenerList[i];
			let channels = Object.keys(this.channels);
			if (!channels.filter((g) => { return g == channel; }).length) {
				this.routerClient.removeListener(channel, this.handleListeners);
				this.channelListenerList.splice(i, 1);
			}
		}

		// Setup new listeners if needed
		var channels = Object.keys(this.channels);
		for (let i = 0; i < channels.length; i++) {
			let channel = channels[i];
			if (!this.channelListenerList.includes(channel)) {
				this.routerClient.addListener(channel, this.handleListeners);
				this.channelListenerList.push(channel);
			}
		}

		// Send state update to any registered external listeners
		var state = this.getState();
		for (let i = 0; i < this.stateChangeListeners.length; i++) {
			this.stateChangeListeners[i](null, state);
		}
	}

	/**
	 * Use this method to register a callback which will be called whenever the state of the Linker changes. This will be called whenever a user links or unlinks your component to a channel.
	 * @param {function} cb {null, LinkerClient~state}
	 * @example
	 * FSBL.Clients.LinkerClient.onStateChange(function(err, response){
	 *    if(response.channels){
	 * 		console.log("Printout of channel status ", response.channels);
	 * 	}
	 * });
	 */
	onStateChange(cb: StandardCallback) {
		this.stateChangeListeners.push(cb);
	};

	/**
	 * Persists the current linker state. When the window is restored, that state will be available and restored (in initialize).
	 * @private
	 * @param {object} state The state enabled for this Linker instance
	 */
	persistState(state) {
		console.info("saving state", state);
		this.windowClient.setComponentState({
			field: "Finsemble_Linker",
			value: state
		});
	};

	// load all linkages and register listeners for updated data.
	/**
	 * @private
	 */
	start(cb) {
		this.dontPersistYet = true;
		sysdebug("LinkerClient Loading Channels");
		var wi = this.windowClient.getWindowIdentifier();
		var key = makeKey(wi);
		// Connect to the global linker store. This is shared by all instances.
		this.distributedStoreClient.getStore({ store: "Finsemble_Linker", global: true }, (err, linkerStore) => {
			this.linkerStore = linkerStore;
			// Get all the available channels for Linkers
			linkerStore.getValues(["channels"], (err, values) => {
				if (values && values["channels"]) {
					this.allChannels = values["channels"];
					this.allGroups = this.allChannels; // backward compatibility
				}
				// Now get the linker state (which channels are enabled) for this instance. The windowClient will have retrieved this from Storage.
				// Use this to initialize our channel state.
				this.windowClient.getComponentState({ field: "Finsemble_Linker" }, (err, linkerData) => {
					this.channels = {};
					this.clients[key] = {
						client: wi,
						active: true,
						channels: {},
					};
					if (linkerData) {
						this.channels = linkerData;
						this.clients[key].channels = linkerData;
					}
					// Feed back to the distributed store the state that we got out of storage.
					this.updateClientInStore(key);

					// If we've just been spawned, then check to see if we were passed any overrides
					var spawnData = this.windowClient.getSpawnData();
					if (spawnData && spawnData.linker) {
						let existingLinks = spawnData.linker.channels;
						if (spawnData.linker.groups) existingLinks = spawnData.linker.groups; // backward compatibility
						this.linkToChannel(existingLinks, wi);
					} else {
						this.updateListeners();
					}
					cb();
				});
			});

			linkerStore.addListener({ field: "clients." + key }, (err, response) => {
				sysdebug("My Channels Updated");
				if (!response.value) return;
				let responseChannels = response.value.channels || response.value.groups;
				let areChannelsEqual = deepEqual(responseChannels, this.channels);
				// If channels change, save, this prevents initial empty channels from saving.
				if (responseChannels && !areChannelsEqual) {
					this.persistState(responseChannels);
					this.channels = responseChannels;
					this.updateListeners();
				}
			});

			linkerStore.addListener({}, (err, response) => {
				var values = response.value.values;
				this.allChannels = values.channels;
				if (values.groups) this.allChannels = values.groups; // backward compatibility
				this.allGroups = this.allChannels; // backward compatibility
				this.clients = values.clients;
			});
		});
	};

	/**
	 * @private
	 */
	onClose = () => {
		var wi = this.windowClient.getWindowIdentifier();
		var key = makeKey(wi);
		if (this.clients[key]) {
			this.clients[key].active = false;
			this.updateClientInStore(key);
		}
	};

	/**
	 * Minimize all windows except those on specified channel
	 * @param {string} channel
	 * @private
	 */
	hyperFocus(channel) {
		//var windowNames = this.getLinkedComponents({ channels: channel }).map(c => c.windowName);
		this.launcherClient.hyperFocus({ windowList: this.getLinkedComponents({ channels: channel }) });
	};

	/**
	 * Bring all windows in specified channel to the front
	 * @param {params} object
	 * @param {params.channel} channel to btf.
	 * @param {params.restoreWindows} whether to restore windows that are minimized prior to calling bring to front.
	 * @private
	 */
	bringAllToFront(params) {
		let { channel, restoreWindows } = params;
		//var windowNames = this.getLinkedComponents({ channels: channel }).map(c => c.windowName);
		this.launcherClient.bringWindowsToFront({ restoreWindows: restoreWindows, windowList: this.getLinkedComponents({ channels: channel }) });
	};

	/*
	 * Start backward compatibility
	 * @private
	 */
	groups = this.channels;
	allGroups = this.allChannels;

	/**
	 * Creates a linker channel
	 * @param {linkerGroup} group The linker channel to create
	 * @param {Function} cb The callback
	 * @private
	 */
	createGroup(group: linkerGroup, cb) {
		return this.createChannel(group, cb);
	};

	/**
	 * Removes a linker channel from the list of available channels
	 * @param {string} groupName The name of the channel to delete
	 * @param {Function} cb The callback
	 * @private
	 */
	deleteGroup(groupName: string, cb) {
		return this.removeChannel(groupName, cb);
	};

	/**
	 * Adds a given window to given channel
	 * @param {string} groupName The channel name
	 * @param {WindowIdentifier} client The window to add to the given channel
	 * @param {Function} cb The callback (optional)
	 * @private
	 */
	addToGroup(groupName: string, client: WindowIdentifier, cb?: StandardCallback) {
		var state = this.linkToChannel(groupName, client);
		if (cb) cb(null, state);
		return state;
	};

	/**
	 * Remove a given window from a linker channel
	 * @param {string} groupName The name of the linker channel to disconnect from
	 * @param {WindowIdentifier} client The window to remove from the given channel
	 * @param {Function} cb The callback (optional)
	 * @returns The response from removing the window from the given channel
	 * @private
	 */
	removeFromGroup(groupName: string, client: WindowIdentifier, cb?: StandardCallback) {
		var state = this.unlinkFromChannel(groupName, client);
		if (cb) cb(null, state);
		return state;
	};

	/**
	 * Gets a list of all linker channels
	 * @param {Function} cb The callback
	 * @returns An array of linker channel names
	 * @private
	 */
	getAllGroups(cb: Function) {
		var channels = this.getAllChannels();
		if (cb) cb(channels);
		return channels;
	};

	/**
	 * Asynchronously returns the list of all linked channels of a given window
	 * @param {WindowIdentifier} [client] The window to find linked groups of
	 * @param {Function} cb The callback (optional)
	 * @returns Asynchronously returns list of channels
	 * @private
	 */
	getGroups(client?: WindowIdentifier, cb?: Function) {
		var state = this.getState(client);
		state.groups = state.channels;
		return asyncIt(state, cb);
	};

	/**
	* Remove all listeners for the specified dataType.
	* @param {String}  dataType - The data type be subscribed to
	* @example
	* LinkerClient.unsubscribe("symbol");
	* @deprecated since version 4.0
	*/
	unSubscribe(dataType: string) {
		this.unsubscribe(dataType);
	};
	/**
	 * Retrieves an array of all components with links that match the given parameters. If no parameters are specified, all windows with established links will be returned.
	 *
	 * @param {object} params Optional
	 * @param {Array.<string>} params.channels Restrict to these channels.
	 * @param {Array.<string>} params.componentTypes Restrict to these componentTypes
	 * @param {windowIdentifier} params.windowIdentifier Restrict to this component
	 * @param cb - Optional. Callback to retrieve returned results asynchronously
	 * @returns {array} An array of linked components, their windows, and their linked channels
	 *
	 * @example <caption>Get all components linked to a given component</caption>
	 * LinkerClient.getLinkedWindows({windowIdentifier: wi});
	 *
	 * @example <caption>Get all Windows linked to channel "purple"</caption>
	 * LinkerClient.getLinkedComponents({channels: ['purple']});
	 * // Response format: [{windowName: 'Window Name', componentType: 'Component Type', uuid: 'uuid', channels: ['purple'] }, ..]
	 *
	 */
	getLinkedWindows(params?: {
		channels?: string[],
		componentTypes?: string[],
		windowIdentifier?: WindowIdentifier,
		groups?: string[],
		client?: any
	}, cb?: StandardCallback) {
		if (!params) {
			params = {};
		}
		params.groups = params.channels;
		params.windowIdentifier = params.client;
		return this.getLinkedComponents(params, cb);
	};

	/**
	 * Asynchronously retrieves a window's windowIdentifier
	 * @param {any} [params] Parameters
	 * @param {Function} cb The callback
	 * @private
	 */
	windowIdentifier(params, cb) {
		return asyncIt(this.windowClient.getWindowIdentifier(), cb);
	};

	onLinksUpdate = {
		push: (cb) => {
			this.stateChangeListeners.push(function (err, response) {
				if (response) {
					response.groups = response.channels;
				}
				cb(err, { groups: response });
			});
		},
	};
	linkerWindow = null;
	loading = false;

	/**
	 * Opens the linker window
	 * @param {Function} cb The callback
	 */
	openLinkerWindow(cb) {
		Validate.args(cb, "function");
		if (this.loading) { return; } // If in process of loading then return. This prevents double clicks on the icon.

		const showLinkerWindowInner = () => {
			this.routerClient.query("Finsemble.LinkerWindow.Show", {
				groups: this.getGroups().groups,
				windowIdentifier: this.windowClient.getWindowIdentifier(),
				windowBounds: this.windowClient.getWindowBounds(),
			}, function () { });
		}
		if (this.linkerWindow) {
			this.linkerWindow.isShowing((showing) => {
				if (showing) {
					this.linkerWindow.hide();
				} else {
					showLinkerWindowInner();
				}
			});
			return;
		}
		showLinkerWindowInner();
	};


	/**
	 * End backward compatibility
	 */
};

/**
 * Constructs an instance of a LinkerClient. Normally there is only one instance per window, so
 * you need only require it in. But from that instance you can create more instances by
 * calling the constructInstance member function `newLinker=linkerClient.constructInstance()`.
 *
 * @param {object} params client instances for this client to depend on.
 * If client instances are not passed in, then the default is to use the instance
 * that is attached to this component window (the global instance)
 */
function constructInstance(params?) {
	params = params ? params : {};
	// If a client isn't passed in then use the global
	if (!params.windowClient) params.windowClient = WindowClient;
	if (!params.launcherClient) params.launcherClient = LauncherClient;
	if (!params.distributedStoreClient) params.distributedStoreClient = DistributedStoreClient;

	return new LinkerClient({
		clients: params,
		startupDependencies: {
			services: ["linkerService"],
			clients: ["windowClient", "distributedStoreClient"],
		},
		onReady: function (cb) {
			sysdebug("Linker onReady");
			// Can't access a global (linkerClient) from the constructor for that global!
			// So wrap it in a timeout to ensure that it exists
			setTimeout(function () {
				asyncParallel([
					(done) => { linkerClient.start(done); },
					(done) => { params.launcherClient.onReady(done); },
				], cb);
			}, 0);
		},
		name: 'linkerClient',
	});
}

// Construct the global instance, and then create a member `constructInstance` that can be used to clone more instances.
const linkerClient = constructInstance();
linkerClient.constructInstance = constructInstance;

export default linkerClient;

/**
 * Callback that returns a list of channels in the responseMessage
* @callback LinkerChannelsCB
* @param {Object} err Error message, or null if no error
* @param {Array.<string>} channels List of channels
*/

/**
 * Callback that returns a new {@link LinkerState}
* @callback LinkerStateCB
* @param {Object} err Error message, or null if no error
* @param {Array.<string>} channels List of all channels linked to the requested component
* @param {Array.<string>} allChannels List of all available channels
*/

/**
 * A list of enabled channels and a list of all channels
* @callback LinkerState
* @param {Array.<string>} channels List of all channels linked to the requested component
* @param {Array.<string>} allChannels List of all available channels
*/
