import RouterClient from "../../clients/routerClientInstance";
import Logger from "../../clients/logger";
import * as constants from "../constants"

declare global {
	interface Window {
		_FSBLCache: any;
	}
}

class FinsembleWindowManagement {
	constructor() {
		this.bindFunctions();
	}

	windowServiceChannelName(channelTopic) { return `WindowService-Request-${channelTopic}`; }


	bindFunctions() {
		this.createWindow = this.createWindow.bind(this);
	}

	createWindow(params, callback = Function.prototype) {
		if (typeof params === "function") {
			callback = params;
			params = {};
		}
		params = params || {};

		Logger.system.debug("FinsembleWindowManagement.createWindow", this.windowServiceChannelName("createWindow"), params);
		console.debug("FinsembleWindowManagement.createWindow", this, this.windowServiceChannelName("createWindow"), params);

		const promiseResolver = (resolve) => {
			RouterClient.query(this.windowServiceChannelName("createWindow"), params, (err, queryResponseMessage) => {
				if (err) {
					Logger.system.error(`CreateWindow: failed`, err);
					resolve({ err });
					callback(err);
				} else {
					let windowIdentifier = queryResponseMessage.data;
					Logger.system.debug(`${this.windowServiceChannelName("createWindow")} successful`, windowIdentifier);
					resolve({ err, windowIdentifier });
					callback(err, windowIdentifier);
					}
			});
		};

		return new Promise(promiseResolver);
	}
}

export default new FinsembleWindowManagement();
