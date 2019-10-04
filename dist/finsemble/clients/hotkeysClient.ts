/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

/*
Overview of how this works:
-hotkeys are added/removed via methods, passing an array of strings representing keys pressed, a handler method, and (optionally) a callback

-When adding a hotkey, a node js event emitter is created on the client side to trigger the hotkey handler, and a router message is sent to the service to register the key combination with the window name on the client side. Multiple hotkeys may be created for the same key combination, so long as they have different handler functions.

-When the service detects that all of the keys in the hotkey combination are pressed, it sends a message on the "HotkeyTriggered" channel (the method for this is "ListenForHotkeys") which contains the list of all windows registered with that hotkey combination. The client then reads the list of windows, and checks if it's one of those windows. If it is, it fires off the node js event emitter that was registered for that hotkey.

-Removing a hotkey clears the corresponding event emitter, and also sends a router message to the service to remove its window id from the array of windows registered for the hotkey combination - if the window is registered with that hotkey combination multiple times, it will only remove one, allowing other hotkeys on the same window with the same key combination to still be registered.

*/
import { _BaseClient as BaseClient } from "./baseClient";
import RouterClient from "./routerClientInstance";
import Logger from "./logger";

const keyMap = require("../common/keyMaps.json").dictionary;

import { IGlobals } from "../common/Globals";
/** The global `window` object. We cast it to a specific interface here to be
 * explicit about what Finsemble-related properties it may have. */
const Globals = window as IGlobals

import { EventEmitter } from "events";
var eventEmitter = new EventEmitter();
/**
 * Translates an array representing a key combination, each element of which represents a key, using keyDict, an object containing key-value pairs where the untranslated key representations are the keys, and the translated versions ready to be used by the service are the values.
 *
 * If you'd like to create a keymap for translation, look at the values of the keymaps included in the common folder.
 * @private
 * @param {object} params
 * @param {object} params.keys array representing untranslated key representations
 * @param {object} keyDict
 */
function translateKeys(params, keyDict = keyMap) {
	var translatedKeys = [];
	params.keys.forEach((key) => {
		if (!(typeof key === "string")) {
			return Logger.system.error("FSBL.Clients.HotkeyClient - one of the keys passed into a function was not a string: ", key);
		}
		key = key.toLowerCase();
		let mappedKey = keyDict[key];
		if (mappedKey) {
			translatedKeys.push(mappedKey);
		} else {
			return Logger.system.error(`FSBL.Clients.HotkeyClient - At least one of the key codes does not map to a supported key - registering hotkey unsuccessful. Unsupported keys: ${key}`);
		}
	});
	return translatedKeys;
}

// Keystroke capture class taken from ChartIQ charting library

const Keystroke = function (cb) {
	this.cb = cb;
	this.shift = false;
	this.ctrl = false;
	this.cmd = false;
	this.capsLock = false;
	this.initialize();
};

Keystroke.prototype.keyup = function (e) {

	switch (e.key) {
		case "Shift":
			this.shift = false;
			this.cb({ key: e.key, e: e, keystroke: this });
			return;
		case "Control":
		case "Alt":
			this.ctrl = false;
			this.cb({ key: e.key, e: e, keystroke: this });
			return;
		case "Meta":
		case "Win":
			this.cmd = false;
			this.cb({ key: e.key, e: e, keystroke: this });
			return;
		default:
			break;
	}
	// This is where we handle the keystroke, regardless of whether we captured the key with a down or press event
	// The exception to this is the arrow keys, which are processed in keydown
	if (this.key) this.cb({ key: this.key, e: e, keystroke: this });
};

Keystroke.prototype.keydown = function (e) {
	if (this.noKeyCapture) return;

	this.key = e.key;
	switch (e.key) {
		case "Meta":
		case "Win":
			this.cmd = true;
			break;
		case "Shift":
			this.shift = true;
			break;
		case "Control":
		case "Alt":
			this.ctrl = true;
			break;
		case "CapsLock":
			this.capsLock = !this.capsLock;
			break;
		case "ArrowUp":
		case "ArrowDown":
		case "ArrowLeft":
		case "ArrowRight":
		case "Up":
		case "Down":
		case "Left":
		case "Right":
			// If you hold a key down, then keydown will repeat. These are the keys
			// that we want to capture repeat action.
			this.key = null;
			this.cb({ key: e.key, e: e, keystroke: this });
			break;
	}
};

Keystroke.prototype.keypress = function (e) {
	if (this.noKeyCapture) return;
	var keyCode = e.which;
	if (keyCode < 32 || keyCode > 222) return; // handled by keydown
	this.key = e.key;
};

/**
 * initializes member functions
 * @memberof CIQ.UI.Keystroke
 */
Keystroke.prototype.initialize = function () {
	var self = this;
	document.addEventListener("keyup", function (e) {
		self.keyup(e);
	});
	document.addEventListener("keydown", function (e) {
		self.downValue = e.key;
		self.keydown(e);
	});
	document.addEventListener("keypress", function (e) {
		self.keypress(e);
	});
	window.addEventListener("blur", function (e) { // otherwise ctrl-t to switch tabs causes ctrl to get stuck
		self.ctrl = false;
		self.cb({ key: "Control", e: e, keystroke: self });
	});
};

// Used to keep track of which browser key combinations are registered locally
var registeredBrowserKeys = [];

class HotkeyClient extends BaseClient {
	/**
	 * @introduction
	 *
	 * <h2> Hotkey Client</h2>
	 *
	 * This module contains the Hotkey Client, used for registering hotkey combinations and their respective handler functions with Finsemble.
	 *
	 * The client can handle two types of hotkeys: **local hotkeys**, for which the handlers will only fire when the window which defined the hotkey is in focus, and **global hotkeys**, which will fire regardless of what window is in focus.
	 *
	 * For more information, see the [Hotkey tutorial](tutorial-Hotkeys.html).
	 *
	 *
	 *
	 * @constructor
	 * @hideconstructor
	 * @publishedName HotkeyClient
	 * @param {*} params
	 */
	keyMap;
	localListeners;
	KeyStroke;
	constructor(params) {
		super(params);
		this.keyMap = keyMap;

		this.listenForHotkeys = this.listenForHotkeys.bind(this);
		this.routerClient = RouterClient;
		this.routerClient.onReady(this.listenForHotkeys);
		//Local hotkeys need to only fire if the window is focused. The object below is a map of handlers passed in by the user.
		//The keys are the handler, and the value is the wrapped method that checks for focus.
		this.localListeners = {};
	}

	/**
	 *Adds a local hotkey, firing only when the window calling the method is in focus. If you execute this function more than once for the same key combination, both hotkeys will coexist, and would need to be remove separately.
	 * @param {Array.<string>} keyArr Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
	 * @param {function} handler Function to be executed when the hotkey combination is pressed. It is recommended that you define a variable to represent the handler function, as the same function must be passed in order to remove the hotkey.
	 * @param {function} cb Callback to be called after local hotkey is added.
	 * @example
	 * var myFunction = function () {...}
	 * FSBL.Clients.HotkeyClient.addLocalHotkey(["ctrl","shift","s"],myFunction,cb)
	 */
	addLocalHotkey(keyArr: string[], handler: Function | any, cb: StandardCallback = (err, response): void => { }) {
		Logger.system.info("HotkeyClient.addLocalHotkey");
		Logger.system.debug("HotkeyClient.addLocalHotkey, keyArr: ", keyArr);
		let keyString = translateKeys({ keys: keyArr }).sort().toString();
		//We create a new function that checks focus before invoking the method.
		//If assimilation wasn't on, we'd want to use window.addEventListener('keydown');
		let wrap = () => {
			if (document.hasFocus()) {
				handler();
			}
		};
		//Keep a reference to the handler so when the dev wants to remove it, we can.
		if (!this.localListeners[keyString]) {
			this.localListeners[keyString] = {};
		}
		this.localListeners[keyString][handler] = wrap;
		eventEmitter.addListener(keyString, wrap);
		this.routerClient.query("hotkeysService.registerGlobalHotkey", { "keys": keyString, windowName: this.windowName }, cb);
	}

	/**
	 *Adds a local hotkey, firing only when the window calling the method is in focus. If you execute this function more than once for the same key combination, both hotkeys will coexist, and would need to be remove separately.
	 * This function uses browser key capture, so it will work when assimilation is not running
	 * @param {Array} [keyArr] Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
	 * @param {function} [handler] Function to be executed when the hotkey combination is pressed. It is recommended that you define a variable to represent the handler function, as the same function must be passed in order to remove the hotkey.
	 * @param {function} cb Callback to be called after local hotkey is added.
	 * @todo Have addLocalHotkey automatically use this when assimilation is not running. Will eventually replace addLocalHotkey.
	 * @private
	 * @example
	 * var myFunction = function () {...}
	 * FSBL.Clients.HotkeyClient.addBrowserHotkey(["ctrl","shift","s"],myFunction,cb)
	 */
	addBrowserHotkey(keyArr: string[], handler: Function) {
		// Lazily create a keystroke handler for this web page if one doesn't already exist
		if (!this.KeyStroke) {
			this.KeyStroke = new Keystroke(function (params) {
				let { key, keystroke } = params;
				var myKeyArray = [key];
				if (keystroke.ctrl) myKeyArray.push("control");
				if (keystroke.shift) myKeyArray.push("shift");
				if (keystroke.alt) myKeyArray.push("alt");
				let myKeyString = myKeyArray.sort().toString();

				registeredBrowserKeys.forEach(function (obj) {
					if (obj.keyString === myKeyString) obj.handler();
				});
			});
		}
		let keyString = translateKeys({ keys: keyArr }).sort().toString();
		registeredBrowserKeys.push({ keyString: keyString, handler: handler });
	}

	/**
	 *Removes a local hotkey.
	 * @param {Array.<string>} keyArr Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
	 * @param {function} handler Handler registered for the hotkey to be removed.
	 * @param {function} cb Callback to be called after local hotkey is removed.
	 * @example
	 *
	 * FSBL.Clients.HotkeyClient.removeLocalHotkey(["ctrl","shift","s"],myFunction,cb)
	 */
	removeLocalHotkey(keyArr: string[], handler: Function | any, cb: StandardCallback = (err, response): void => { }) {
		Logger.system.info("HotkeyClient.removeLocalHotkey");
		Logger.system.debug("HotkeyClient.removeLocalHotkey, keyArr: ", keyArr);
		let keyString = translateKeys({ keys: keyArr }).sort().toString();
		let wrap = this.localListeners[keyString][handler];
		eventEmitter.removeListener(keyString, wrap);
		this.routerClient.query("hotkeysService.unregisterGlobalHotkey", { "keys": keyString, windowName: this.windowName }, cb); //TODO: query
	}

	/**
	 *Adds a global hotkey, firing regardless of what window is in focus. If you execute this function more than once for the same key combination, both hotkeys will coexist, and would need to be remove separately.
	 * @param {Array.<string>} keyArr Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
	 * @param {function} handler Function to be executed when the hotkey combination is pressed. It is recommended that you define a variable to represent the handler function, as the same function must be passed in order to remove the hotkey.
	 * @param {function} cb Callback to be called after local hotkey is added.
	 * @example
	 * var myFunction = function () {...}
	 * FSBL.Clients.HotkeyClient.addGlobalHotkey(["ctrl","shift","s"],myFunction,cb)
	 */
	addGlobalHotkey(keyArr: string[], handler: Function | any, cb: StandardCallback = (err, response): void => { }) {
		Logger.system.info("HotkeyClient.addGlobalHotkey");
		Logger.system.debug("HotkeyClient.addGlobalHotkey, keyArr: ", keyArr);
		let keyString = translateKeys({ keys: keyArr }).sort().toString();
		eventEmitter.addListener(keyString, handler);
		this.routerClient.query("hotkeysService.registerGlobalHotkey", { "keys": keyString, windowName: this.windowName }, cb);
	}

	/**
	 *Removes a global hotkey.
	 * @param {Array.<string>} keyArr Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
	 * @param {function} handler Handler registered for the hotkey to be removed.
	 * @param {function} cb Callback to be called after local hotkey is removed.
	 * @example
	 *
	 * FSBL.Clients.HotkeyClient.removeGlobalHotkey(["ctrl","shift","s"],myFunction,cb)
	 */
	removeGlobalHotkey(keyArr: string[], handler: Function | any, cb: StandardCallback = (err, response): void => { }) {
		Logger.system.info("HotkeyClient.removeGlobalHotkey");
		Logger.system.debug("HotkeyClient.removeGlobalHotkey, keyArr: ", keyArr);
		let keyString = translateKeys({ keys: keyArr }).sort().toString();
		eventEmitter.removeListener(keyString, handler);
		this.routerClient.query("hotkeysService.unregisterGlobalHotkey", { "keys": keyString, windowName: this.windowName }, cb); //TODO: query
	}

	/**
	 * Not yet implemented - will return an object that contains all registered Hotkeys
	 */
	/* getHotkeys() { //TODO: MAKE WORK
		Logger.system.info("HotkeyClient.getHotkeys");
		this.routerClient.transmit("hotkeysService.getRegisteredHotkeys", { request: true });
	} */

	/**
	 * Handler for "hotkey triggered" messages from the service, called upon client initialization.
	 * @private
	 */
	listenForHotkeys() { //TODO: make private
		var self = this;
		this.routerClient.addListener("HotkeyTriggered", function (error, response) {
			if (error) {
				console.error("Hotkey Channel Error: " + JSON.stringify(error));
			} else {
				if (response.data.windows.includes(self.windowName)) { //if this is one of the windows that the service means to trigger here
					eventEmitter.emit(response.data.keys);
				}
			}
		});
	}

	/**
	 * Unregister all hotkeys, both locally and service-side.
	 * @param {function} cb Optional callback function
	 *
	 */
	removeAllHotkeys(cb: StandardCallback) {
		eventEmitter.removeAllListeners();
		this.routerClient.query("hotkeysService.removeAllHotkeysForWindow", { windowName: this.windowName }, cb);
	}

	/**
	 * Automatically unregister all hotkeys when the window containing the client closes
	 * @param {function} cb
	 * @private
	 */
	onClose = (cb) => {
		this.removeAllHotkeys(cb);
	}
}

var hotkeyClient = new HotkeyClient({
	startupDependencies: {
		services: ["hotkeysService"]
	},
	onReady: function (cb) {
		if (cb) {
			cb();
		}
	},
	name: "hotkeyClient"
});

// @TODO - use proper exports instead of global scope.
Globals.Keystroke = Keystroke;

export default hotkeyClient;
