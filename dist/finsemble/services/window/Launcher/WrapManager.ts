import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";

class WrapManagerSingleton {
	wraps: object;

	constructor() {
		this.wraps = {};
	}
	add(params: { windowIdentifier: WindowIdentifier, windowDescriptor: any }) {
		let { windowIdentifier, windowDescriptor } = params;
		if (!windowIdentifier.uuid && windowDescriptor.uuid) {
			windowIdentifier.uuid = windowDescriptor.uuid;
		}
		this.wraps[windowIdentifier.windowName] = {
			identifier: windowIdentifier,
			descriptor: windowDescriptor,
			owners: []
		};
		Logger.system.debug("WRAP. adding window", windowIdentifier.windowName);
		RouterClient.publish("Finsemble." + windowIdentifier.windowName + ".wrapReady", { name: windowIdentifier.windowName, state: "open" });
	}

	get(params: { windowName: string, requester: string }, cb: Function = Function.prototype) {
		let { windowName, requester } = params;
		let wrap = this.wraps[windowName];
		let err = null;
		Logger.system.debug("WRAP. wrap requested from", requester, "for", windowName);
		if (wrap) {
			if (!wrap.owners.includes(requester)) wrap.owners.push(requester);
		} else {
			err = `No wrap found for ${windowName}`;
			Logger.system.error("WRAPMANAGER.get Error", err, requester, "for", windowName);
		}
		cb(err, wrap);
		return Promise.resolve({ err, data: wrap });
	}

	remove(params: { identifier: WindowIdentifier }, cb) {
		let { identifier } = params;
		let requestCleanup = (owner, done) => {
			Logger.system.debug("WRAP. requesting cleanup from", owner, "for", identifier.windowName);
			//shortcut. when a window closes we should remove it from any list where it's an owner.
			//can ignore all that aren't services once this work.
			RouterClient.publish("Finsemble." + identifier.windowName + ".wrapReady", { name: identifier.windowName, state: "closed" });

			return RouterClient.query(`${owner}.removeWrap.${identifier.windowName}`, { identifier }, () => {
				Logger.system.debug("WRAP. cleanup confirmed from", owner, "for", identifier.windowName);
				done();
			});
		};
	}
	setUuid(name:string, uuid:string) {
		if (this.wraps[name]) {
			this.wraps[name].identifier.uuid = uuid;
			this.wraps[name].descriptor.uuid = uuid;
		} else {
			Logger.system.error("WrapManager.setUuid. Wrap not found for", name);
		}

	}
}

export let WrapManager: WrapManagerSingleton = new WrapManagerSingleton();
