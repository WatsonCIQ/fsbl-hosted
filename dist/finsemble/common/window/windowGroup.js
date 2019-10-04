import { each as asyncEach, forEach as asyncForEach } from "async";
import * as CONSTANTS from "../constants";
/** Singleton of the Logger class shared among all instances of ObjectPool
 * @TODO Refactor to instance member of class.
 */
let Logger;
const groupStates = {
	NORMAL: 0,
	MINIMIZING: 1,
	MINIMIZED: 2,
	RESTORING: 3
};
export class WindowGroup {
	/**
	 *
	 * @param {object} params Params
	 * @param {string} params.name name of the group
	 * @param {object} params.windows array of windows in the group
	 * @param {object} dependencies Dependency object that provides a Logger.
	 * @param {Logger} dependencies.Logger
	 */
	constructor(params, dependencies) {
		Logger = dependencies.Logger;
		this.name = params.name;
		this.groupState = groupStates.NORMAL;
		this.GROUPSTATES = groupStates;
		this.isAlwaysOnTop = false;
		if (params.windows) {
			this.windows = params.windows;
		} else {
			this.windows = {};
		}
	}

	destroy() {
		delete this.windows;
		delete this.name;
	}

	setWindows(windows) {
		this.windows = windows;
	}

	getWindows() {
		return this.windows;
	}

	addWindow(win) {
		Logger.system.debug("windowGroup.addWindow", win.name);
		this.windows[win.name] = win;
		if (this.isMovable) win.alwaysOnTop(this.isAlwaysOnTop);
	}

	/**
	 *
	 * @param {*} arr either a window name or window identifier or a list of window names or identifiers
	 */
	removeWindows(arr, cb = Function.prototype) {
		var windowName;
		if (!Array.isArray(arr)) {
			arr = [arr];
		}
		var self = this;
		arr.forEach(function (win) {
			if (typeof win === "string" || win instanceof String) {
				windowName = win;
			} else {
				windowName = win.windowName || win.name;
			}
			Logger.system.debug("windowGroup.removeWindows", windowName);

			if (this.windows[windowName]) {
				delete self.windows[windowName];
			} else {
				return;
			}
		}, this);
		cb();
	}

	/**
	 *
	 * @param {*} win either a window name or window identifier
	 */
	getWindow(win) {
		if (typeof win === "string" || win instanceof String) { //we have a window name
			return this.windows[win];
		}  // we have an identifier
		if (win && (win.windowName || win.name)) {
			return this.windows[win.windowName || win.name];
		}
		return null;


	}

	getWindowNames() {
		let names = [];
		for (let name in this.windows) {
			names.push(name);
		}
		return names;
	}

	addWindows(arr) {
		if (!Array.isArray(arr)) {
			arr = [arr];
		}
		var self = this;
		arr.forEach(function (win) {
			Logger.system.debug("windowGroup.addWindows", win.name);

			self.windows[win.name] = win;
			if (this.isMovable) win.alwaysOnTop(this.isAlwaysOnTop);

		}, this);
	}

	getWindowArray() {
		let arr = [];
		for (let windowName in this.windows) {
			arr.push(this.windows[windowName]);
		}
		return arr;
	}

	minimizeAll() {
		if (this.groupState == groupStates.RESTORING) {
			this.interruptRestore = true;
			this.groupState = groupStates.NORMAL;
		}
		if (this.groupState !== groupStates.NORMAL) return;
		this.groupState = groupStates.MINIMIZING;
		for (let windowName in this.windows) {
			let win = this.windows[windowName];
			if (win.windowState != CONSTANTS.WINDOWSTATE.MINIMIZED) win.minimize();
		}
		this.groupState = groupStates.MINIMIZED;
		this.interruptRestore = false;
	}

	minimize(params) {
		if (!params) { return this.minimizeAll(); }
		let { windowList, componentType } = params;
		if (componentType) windowList = this.findAllByComponentType(componentType);

		for (let w of windowList) {
			let win;
			if (!(typeof w === "string" || w instanceof String)) {
				win = this.getWindow(w.windowName || w.name);
			} else {
				win = this.getWindow(w);
			}
			if (win && win.windowState != CONSTANTS.WINDOWSTATE.MINIMIZED) {
				win.minimize();
			}
		}
	}

	restoreAll(cb = Function.prototype) {
		if (this.groupState !== groupStates.MINIMIZED) return cb();
		var self = this;
		this.groupState = groupStates.RESTORING;
		function restoreWindow(windowName, done) {
			if (self.interruptRestore) return done("restore interrupted");
			let win = self.windows[windowName];
			if (win.restore) {
				// if win.win exists, we're in a dockableGroup of dockalbeWindows
				let windowState = win.win ? win.win.windowState : win.windowState;
				if (windowState != CONSTANTS.WINDOWSTATE.NORMAL) {
					// The dockableWindow only takes a single parameter...a callback.
					if (win.win) {
						win.restore(done);
					} else {
						// All other window wraps accept 2 params for restore.
						win.restore({}, done);
					}
				} else {
					done();
				}
			} else {
				Logger.system.error(windowName + " does not implement restore");
				done();
			}
		}
		asyncForEach(Object.keys(this.windows), restoreWindow, function (err, data) {
			self.interruptRestore = false;
			if (!err) {
				self.groupState = groupStates.NORMAL;
			}
			cb(err, data);
		});
	}
	//takes an array of window names.
	restore(params, cb) {
		let { windowList } = params;
		var self = this;
		function restoreWindow(windowName, done) {
			let win = self.windows[windowName];
			if (win.restore) {
				self.windows[windowName].restore({}, done);
			} else {
				Logger.system.error(windowName + " does not implement restore");
				done();
			}
		}
		asyncForEach(windowList, restoreWindow, cb);
	}

	// Bring all windows to top. Also sets the state of the group to always on top and new windows added to the group inherit the state of thw window
	allAlwaysOnTop(alwaysOnTop) {
		this.isAlwaysOnTop = alwaysOnTop;
		this.alwaysOnTop({ windowList: Object.keys(this.windows), restoreWindows: true, alwaysOnTop: alwaysOnTop });
	}

	// Set specific windows to top. Generally should call allAlwaysOnTop
	alwaysOnTop(params) {
		if (!params || (params && Object.keys(params).length === 0)) {
			params = { windowList: Object.keys(this.windows), restoreWindows: true };
		}
		let { windowList, componentType } = params;
		if (windowList && typeof windowList[0] !== "string") {
			windowList = windowList.map(win => win.windowName);
		}
		if (componentType) windowList = this.findAllByComponentType(componentType);
		var self = this;
		if (!windowList) windowList = Object.keys(this.windows);
		for (let w in windowList) {
			let win;
			if (Array.isArray(windowList)) w = windowList[w];

			if (!(typeof w === "string" || w instanceof String)) {
				win = self.getWindow(w.windowName || w.name);
			} else {
				win = self.getWindow(w);
			}
			if (win) {
				win.alwaysOnTop(params.alwaysOnTop);
			}
		}
	}

	/**
	 * Brings a group of windows to the front (BTF). In other words, puts those windows on top of any other windows so that they can be seen
	 * @param {object} params
	 * @param {bool=true} params.restoreWindows If true then windows will attempt to be restored (un-minimized) before being brought to front
	 * @param {array} params.windowList The list of windows to BTF. Defaults to the windows that are in this window group. This can be a list of window names, or a list of actual window instances.
	 * @param {string} params.componentType Optionally provide a componentType to BTF only those windows of that type in the list of windows.
	 */
	bringToFront(params, cb = Function.prototype) {
		var self = this;
		if (!params) params = {};
		if (typeof (params.restoreWindows) == "undefined") params.restoreWindows = true;

		// TODO, [terry] this "windowList" logic is copy and pasted many times in windowGroup.js. It should be in a helper function.
		let { windowList, componentType } = params;
		// Determine if the windowList is a list of window names, or a list of actual windows (in which case we extract the name)
		if (windowList && typeof windowList[0] !== "string") {
			windowList = windowList.map(win => win.windowName);
		}

		// Get all windows *in this group* of this component type, then convert them into an array of strings to be passed into the other group functions.
		if (componentType) {
			windowList = [];
			let windows = this.findAllByComponentType(componentType);
			windows.forEach(win => {
				if (win && win.name) {
					windowList.push(win.name);
				}
			});
		}

		// Default to the windows in this group, actually the most common case
		if (!windowList) windowList = Object.keys(this.windows);

		function doBTF() {
			// TODO, [terry] this chunk of code is repeated three times in windowGroup.js. It should be abstracted away
			// TODO, [Sidd] this code now uses async, previously was not using using the callback properly. Make all group functions do this

			asyncEach(windowList, (w, callback) => {
				let win;
				//if (Array.isArray(windowList)) w = windowList[w];

				if (!(typeof w === "string" || w instanceof String)) {
					win = self.getWindow(w.windowName || w.name);
				} else {
					win = self.getWindow(w);
				}
				if (win) {
					win.bringToFront(callback);
				} else {
					callback();
				}
			}, () => { cb(); });
		}

		if (params.restoreWindows) {
			if (typeof windowList[0] !== "string") {
				windowList = Object.keys(windowList);
			}
			this.restore({ windowList }, doBTF);
		} else {
			doBTF();
		}


	}

	hyperFocus(params) {
		let windowList = params.windowList;
		// If we got a list of identifiers, convert to names
		for (let w in windowList) {
			let win = windowList[w];
			if (!(typeof win === "string" || win instanceof String)) {
				windowList[w] = win.windowName || win.name;
			}
		}

		// If we are trying to hyper focus a stack make sure to also include the children
		for (let windowName in this.windows) {
			let win = this.getWindow(windowName);
			let parent = win.getParent();
			// If window is in a stack and the stack is in the windowList but this window is not, add it.
			if (parent && windowList.includes(parent.name) && !windowList.includes(windowName)) {
				windowList.push(windowName);
			}
		}

		for (let windowName in this.windows) {
			if (!windowList.includes(windowName)) {
				this.windows[windowName].minimize();
			} else {
				this.windows[windowName].restore(() => {
					this.windows[windowName].bringToFront();
				});
			}
		}
	}

	findAllByComponentType(componentType) {
		var windowList = [];
		for (let windowName in this.windows) {
			let theWindow = this.windows[windowName];
			let descriptor = theWindow.windowDescriptor;
			if (componentType === (descriptor.component ? descriptor.component.type : descriptor.customData.component.type)) { //TODO - figure out why this is different in some cases
				windowList.push(this.windows[windowName]);
			}
		}
		return windowList;
	}


}
