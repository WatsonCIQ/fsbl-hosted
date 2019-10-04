const WORKSPACE_CACHE_TOPIC = "finsemble.workspace.cache";
import * as Utils from "../../common/util";
import StorageClient from "../../clients/storageClient";
import { System } from "../../common/system";

var externalWindow = function (uuid) {
	/** Daniel Hines 12/21/2018
	 * I've left this dynamic require here because I"m not sure
	 * how importing at the top of the module would affect conditions
	 * at runtime, considering I don't know where/when `externalWindow`
	 * is instantiated.
	 *
	 * @TODO - determine if this is really necessary, or if we can just
	 * import it like normal.
	*/
	var RouterClient = require("../../clients/routerClientInstance").default;
	var self = this;
	this.startBounds = null;
	this.windowId = null;
	this.uuid = uuid;
	this.key = uuid;
	this.processId = null;
	this.executablePath = null;
	this.resizeType = null;
	this.edge = null;
	this.mouseLocation = null;
	this.isMoving = false;
	this.uuid = null;
	this.changeType = 0;
	this.spawned = false;
	this.registered = false;
	this.state = null;
	this.name = null;
	this.groups = null;
	this.lastMinimized = 0;
	this.lastRestored = Date.now();

	this.mouseOffset = {
		x: null,
		y: null
	};
	this.location = null;

	this.shutdown = function () {
		if (self.spawned) {
			RouterClient.unsubscribe("Finsemble.WorkspaceService.groupUpdate", onDockingGroupUdpate);
			RouterClient.transmit("LauncherService.shutdownResponse", {
				name: self.spawned.params.name
			});
		}
	};
	var onDockingGroupUdpate = function (err, response) {
		if (response.data.groupName == "Docking") {
			self.groups = getMyDockingGroups(response.data.groupData);
		}
	};
	function getMyDockingGroups(groupData) {
		let myGroups = [];
		let windowName = self.uuid;
		if (groupData) {
			for (var groupName in groupData) {
				if (groupData[groupName].windowNames.includes(windowName)) {
					myGroups.push(groupData[groupName]);
				}
			}
		}
		return myGroups;
	}
	RouterClient.subscribe("Finsemble.WorkspaceService.groupUpdate", onDockingGroupUdpate);

	this.setStartBounds = function (params) {

		self.startBounds = {
			"left": params.left,
			"top": params.top,
			"bottom": params.bottom,
			"right": params.right,
			x: params.x,
			y: params.y,
			width: params.width || params.right - params.left,
			height: params.height || params.bottom - params.top
		};
	};
	this.setUUID = function (uuid) {
		self.uuid = uuid;
	};
	this.saveState = function () {

	};
	this.getMyDockingGroups = function (err, group) {
		var groupData = group.data.groupData;
		let windowName = self.spawned ? self.spawned.params.name : self.uuid;
		if (groupData) {
			for (var groupName in groupData) {
				if (!groupData[groupName].isMovable) continue;
				groupData[groupName].groupName = groupName;
				if (groupData[groupName].windowNames.includes(windowName)) {
					self.grouped = true;
					return;
				} else if (self.wrappedWindow.parentWindow && groupData[groupName].windowNames.includes(self.wrappedWindow.parentWindow.windowName)) {
					self.grouped = true;
					return;
				}
			}
		}
		self.grouped = false;
	};
	this.setResizeType = function (resizeType) {
		self.resizeType = resizeType;
	};
	this.setMouseLocation = function (params) {
		self.mouseLocation = {
			x: Number(params.x),
			y: Number(params.y)
		};
	};
	this.setMouseOffset = function (params) {
		self.mouseOffset = {
			left: params.x - params.left,
			top: params.y - params.top,
		};
	};
	this.setLocation = function (location) {
		self.location = location;
	};
	this.calculateWindowLocation = function (newMouseLocation) {

		newMouseLocation.x = Math.round(Number(newMouseLocation.x));
		newMouseLocation.y = Math.round(Number(newMouseLocation.y));

		if (!self.edge) { self.edge = self.GetResizeEdge(self.startBounds, newMouseLocation, self.resizeType); }
		var windowBounds = {
			"left": self.location.left,
			"top": self.location.top,
			"bottom": self.location.bottom,
			"right": self.location.right,
			"width": self.location.right - self.location.left,
			"height": self.location.bottom - self.location.top,
			changeType: 0
		};
		var mouseLocation = {
			x: newMouseLocation.x,
			y: newMouseLocation.y
		};

		var change = {
			top: mouseLocation.y - self.mouseLocation.y,
			left: mouseLocation.x - self.mouseLocation.x
		};

		var left = self.location.left;
		var right = self.location.right;
		var top = self.location.top;
		var bottom = self.location.bottom;
		var height;
		var width;
		var changeType = 0;
		if (!self.edge) {
			left = Number(mouseLocation.x) - Number(self.mouseOffset.left);
			top = Number(mouseLocation.y) - Number(self.mouseOffset.top);
			bottom = Number(bottom) - Number(change.top);
			right = Number(right) - Number(change.left);
			height = Number(self.location.height);
			width = Number(self.location.width);
		} else {
			changeType = 1;
			switch (self.edge) {
				case "left":
					left = Number(newMouseLocation.x);
					break;
				case "right":
					right = Number(newMouseLocation.x);
					break;
				case "top":
					top = Number(newMouseLocation.y);
					break;
				case "bottom":
					bottom = Number(newMouseLocation.y);
					break;
				case "top-left":
					left = Number(newMouseLocation.x);
					top = Number(newMouseLocation.y);
					break;
				case "top-right":
					right = Number(newMouseLocation.x);
					top = Number(newMouseLocation.y);
					break;
				case "bottom-left":
					left = Number(newMouseLocation.x);
					bottom = Number(newMouseLocation.y);
					break;
				case "bottom-right":
					right = Number(newMouseLocation.x);
					bottom = Number(newMouseLocation.y);

			}
			width = right - left;
			height = bottom - top;
		}

		windowBounds.left = Number(left);
		windowBounds.top = Number(top);
		windowBounds.bottom = Number(bottom);
		windowBounds.right = Number(right);
		windowBounds.height = Number(height);
		windowBounds.width = Number(width);
		windowBounds.changeType = changeType;

		self.mouseLocation = mouseLocation;
		self.location = windowBounds;
		return windowBounds;
	};
	this.GetResizeEdge = function (bounds, mouse, direction) {
		if (direction === "None") { return null; }
		var edge = null;
		switch (direction) {
			case "WE":
				if (Math.abs(mouse.x - bounds.left) < Math.abs(mouse.x - bounds.right)) {
					edge = "left";
				} else {
					edge = "right";
				}
				break;
			case "NS":
				if (Math.abs(mouse.y - bounds.bottom) < Math.abs(mouse.y - bounds.top)) {
					edge = "bottom";

				} else {
					edge = "top";
				}
				break;
			case "NESW":
				if (Math.abs(mouse.y - bounds.top) < Math.abs(mouse.y - bounds.bottom)) {
					edge = "top-right";

				} else {
					edge = "bottom-left";
				}
				break;
			case "NWSE":
				if (Math.abs(mouse.y - bounds.top) < Math.abs(mouse.y - bounds.bottom)) {

					edge = "top-left";

				} else {
					edge = "bottom-right";
				}
		}
		return edge;
	};
	this.saveWindowState = function () {
		if (this.spawned) {//update workspace info here
			this.spawned.params.defaultLeft = this.location.left;
			this.spawned.params.defaultTop = this.location.top;
			this.spawned.params.defaultWidth = this.location.width;
			this.spawned.params.defaultHeight = this.location.height;
			let windowHash = Utils.camelCase("activeWorkspace", this.spawned.params.name);
			StorageClient.save({
				topic: WORKSPACE_CACHE_TOPIC,
				key: windowHash,
				value: this.spawned.params
			});
		}
	};
	this.closeWindow = function (cb = Function.prototype) {
		if (!self.spawned.finUUID && self.spawned.params && self.spawned.params.finUUID) {
			self.spawned.finUUID = self.spawned.params.finUUID;
		}

		System.terminateExternalProcess(self.spawned.finUUID, 0, true, function (info) {
			cb(null, info.result);
		}, function (reason) {
			cb(reason);
		});
	};

	this.setupListeners = function () {
		RouterClient.subscribe("Finsemble.WorkspaceService.groupUpdate", self.getMyDockingGroups);

		RouterClient.addResponder("Assimilation.closeWindow." + self.spawned.params.name, function (err, queryMessage) {
			if (!queryMessage) return;
			if (queryMessage.data.removeFromWorkSpace === false) {
				self.doNotRemoveFromWorkSpace = true;
			}
			self.closeWindow(function (err, response) {
				RouterClient.removeResponder("Assimilation.closeWindow." + self.spawned.params.name);
				RouterClient.query("Launcher.removeComponent", { name: self.spawned.params.name }, function () {
					queryMessage.sendQueryResponse(err, response);
				});
			});
		});
	};

};

export default externalWindow;
