import * as Utils from "./util";

/**
 * Simple object to handle the loading and registration of storage adapters.
 *
 * @export
 * @class AdapterReceiver
 */
export default class AdapterReceiver {
	constructor() {
		this.callbacks = {};
		this.adapters = {};

		this.storageAdapters = {};
		this.loadModel = this.loadModel.bind(this);
		this.loaded = this.loaded.bind(this);
		return this;
	}
	/**
	 * Loads the model into the page and caches the callback.
	 *
	 * @param {string} name
	 * @param {url} path
	 * @param {function} cb
	 * @memberof AdapterReceiver
	 */
	loadModel(name, path, cb) {
		//2nd param is a callback that fires onLoad. We found that this event was unreliable, so we created the AdapterReceiver.
		this.callbacks[name] = cb;
		Utils.injectJS(path, Function.prototype);
	}

	/**
	 * When the baseStorageModel is loaded, it will call `loaded` on `global.adapterReceiver`. This method will let async know that the file has been successfully loaded.
	 *
	 * @param {any} name
	 * @param {any} adapter
	 * @memberof AdapterReceiver
	 */
	loaded(name, adapter) {
		this.adapters[name] = adapter;
		//old variable. leaving for backwards compatibility.
		this.storageAdapters[name] = adapter;
		if (this.callbacks[name]) {
			this.callbacks[name]();
			delete this.callbacks[name];
		} else {
			console.info("`.loaded` invoked on Adapter Receiver by a storage adapter not loaded dynamically", name);
		}

	}
}
