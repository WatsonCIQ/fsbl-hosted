import { each as asyncEach, map as asyncMap } from "async";
import * as storeUtils from "../common/storeUtils";
import Logger from "./logger";
import { IGlobals } from "../common/Globals";
import { _BaseClient } from "./baseClient";
/** The global `window` object. We cast it to a specific interface here to be
 * explicit about what Finsemble-related properties it may have. */
const Globals = window as IGlobals;
/**
 *
 * @introduction
 * <h2>Store Model</h2>
 * The Store Model consists of store instances. It handles getters/setters of data.
 * @hideConstructor
 * @class
 */

class StoreModel extends _BaseClient {
	routerClient;
	isGlobal: boolean;
	values = {};
	listeners = [];
	lst;
	registeredDispatchListeners = [];
	mapping = {};
	subs;
	constructor(params, routerClient) {
		super(params);
		this.routerClient = routerClient;
		this.isGlobal = params.global;
		this.name = params.store ? params.store : "finsemble";
		if (params.values) this.values = params.values;
		this.lst = this.listeners;

		storeUtils.initObject(this.values, null, this.mapping);

		// Add listeners for global stores. Not needed for local stores as everything happens internally.
		if (this.isGlobal) {
			this.routerClient.addListener("storeService.dispatch." + this.name, this.handleDispatchedMessages.bind(this));
		}
	}

	/** This is the Flux dispatcher. It can be used dispatch actions across stores. These action are not caught inside of the global store service. For more information, you can read the [Flux documentation](https://facebook.github.io/flux/docs/overview.html).
	 *
	 * Example:
	 * ```
	 * store.Dispatcher.register(function(action){
	 * 	if(action.actionType === "ACTION1") {
	 * 		// Do something with the action here.
	 * 	}
	 * })
	 * ```
	 */
	Dispatcher = {
		register: (fn) => {
			this.registeredDispatchListeners.push(fn);
		},
		dispatch: (data) => {
			if (this.isGlobal) {
				this.routerClient.transmit("storeService.dispatch." + this.name, data);
			} else {
				this.handleDispatchedMessages(null, {
					data: data
				});
			}
		}
	};

	/**
	 * @param {*} err
	 * @param {*} message
	 * @private
	 */
	handleDispatchedMessages(err, message: { data: any }) {
		for (var i = 0; i < this.registeredDispatchListeners.length; i++) {
			this.registeredDispatchListeners[i](message.data);
		}
	};

	/**
	 * Set a value in the store. Two events will be triggered with topics of: store and field.
	 * @param {Object} params - Params object
	 * @param {String} params.field - The name of the field where data will be stored
	 * @param {String} params.value - Value to be stored
	 * @param {function} cb callback
	 * @returns {null}
	 *
	 * @example
	 * store.setValue({field:'field1',value:"new value"});
	 */
	setValue(params: { field: string, value: any }, cb: StandardCallback) {
		if (!params.field) { Logger.system.error("DistributedStore.setValue:no field provided", params); }
		if (!params.hasOwnProperty("value")) { Logger.system.error("DistributedStore.setValue:no value provided", params); }
		if (this.isGlobal) {
			var data = {
				store: this.name,
				field: params.field,
				value: params.value
			};
			return Globals.distributedStoreClient.routerClient.query("storeService.setValue", data, function (err) {
				return cb ? cb(err) : null;
			});
		}

		const removals = storeUtils.checkForObjectChange(this.values, params.field, this.mapping);

		storeUtils.setPath(this.values, params.field, params.value);

		storeUtils.mapField(this.values, params.field, this.mapping);

		if (removals) { this.sendRemovals(removals); }

		this.triggerListeners(this.name, this);
		this.publishObjectUpdates(params.field, this.mapping);
		return cb ? cb(null) : null;
	};

	/**
	 * Handles changes to the store. Will publish from the field that was changed and back.
	 */
	private publishObjectUpdates(startField, mappings) {
		const currentMapping = mappings;
		while (startField) {
			this.triggerListeners(this.name + "." + startField, storeUtils.byString(this.values, startField));
			startField = currentMapping[startField];
		}
	}

	/**
	 * Send items that are no longer mapped or had their map change. If a value is remapped we'll send out the new value.
	*/
	private sendRemovals(removals) {
		for (var i = 0; i < removals.length; i++) {
			this.triggerListeners(this.name + "." + removals[i], storeUtils.byString(this.values, removals[i]));
		}
	}

	/**
	 * This will set multiple values in the store.
	 * @param {Object[]} fields - An Array of field objects
	 * @param {String} fields.field - The name of the field
	 * @param {any} fields.value - Field value
	 * @param {function} cb callback
	 * @example
	 * store.setValues([{field:'field1',value:"new value"}]);
	 */
	setValues(
		fields: { field: string, value: any }[],
		cb?: StandardCallback,
	) {
		if (!fields) {
			return Logger.system.error("DistributedStore.setValues:no params given");
		}

		if (!Array.isArray(fields)) { return Logger.system.error("DistributedStore.setValues:params must be an array"); }

		asyncEach(fields, (field, done) => {
			this.setValue(field, done);
		}, (err) => {
			return cb ? cb(err) : null;
		});
	};

	/**
	 * Get a value from the store. If global is not set, we'll check local first then we'll check global.
	 * @param {string|object} params - Params object. This can also be a string
	 * @param {String} params.field - The field where the value is stored.
	 * @param {Function} cb -  Will return the value if found.
	 * @returns {any} - The value of the field. If no callback is given and the value is local, this will run synchronous
	 * @example
	store.getValue({field:'field1'},function(err,value){});
	store.getValue('field1',function(err,value){});
	 */
	getValue(params: { field: string } | string, cb: StandardCallback) {
		if (typeof params === "string") { params = { field: params }; }
		if (!params.field) {
			if (!cb) { return "no field provided"; }
			return cb("no field provided");
		}

		if (this.isGlobal) { return this.getGlobalValue(params, cb); }
		var fieldValue = storeUtils.byString(this.values, params.field);
		if (fieldValue !== undefined) {
			if (!cb) { return fieldValue; }
			return cb(null, fieldValue);
		}
		if (!cb) { return null; }
		return cb("couldn't find a value");
	};

	/**
	 * Get multiple values from the store.
	 * @param {Array.<object>|Array.<String>} fields - An Array of field objects. If there are no fields provided, all values in the store are returned.
	 * @param {Function} [cb] -  Will return the value if found.
	 * @returns {Object} - returns an object of with the fields as keys.If no callback is given and the value is local, this will run synchronous
	 * @example
	 * store.getValues([{field:'field1'},{field:'field2'}],function(err,values){});
	 * store.getValues(['field1','field2'],function(err,values){});
	 */
	getValues(fields: { field: string }[] | string[], cb): { [k: string]: any } | void {
		if (typeof fields === "function") {
			cb = fields;
			if (this.isGlobal) { return this.getGlobalValues(null, cb); }

			if (!cb) { return this.values; }
			return cb(null, this.values);
		}
		if (!Array.isArray(fields)) {
			return this.getValue(fields, cb);
		}

		if (this.isGlobal) { return this.getGlobalValues(fields, cb); }
		var values = {};

		for (var i = 0; i < fields.length; i++) {
			var item = fields[i];
			var field = typeof item === "string" ? item : item.field;
			var combined = this.name + (field ? "." + field : "");
			var fieldValue = storeUtils.byString(this.values, field);
			values[field] = fieldValue;
		}
		if (!cb) { return values; }
		return cb(null, values);
	};

	/**
	 * Get a single value from the global store.
	 */
	private getGlobalValue(params, cb) {
		Globals.distributedStoreClient.routerClient.query("storeService.getValue",
			{
				store: this.name,
				field: params.field
			}
			, (err, response) => {
				if (err) { return cb(err); }
				return cb(err, response.data);
			});
	}
	/**
	 * Get values from the global store.
	 */
	private getGlobalValues(params, cb) {
		Globals.distributedStoreClient.routerClient.query("storeService.getValues",
			{
				store: this.name,
				fields: params
			}
			, (err, response) => {
				if (err) { return cb(err); }
				return cb(err, response.data);
			});
	}

	/**
	 * Remove a value from the store.
	* @param {Object | String} params - Either an object or string
	 * @param {String} param.field - The name of the field
	 * @param {Function} cb -  returns an error if there is one
	 * @example
	 * store.removeValue({field:'field1'},function(err,bool){});
	 */
	removeValue(params, cb) {
		if (!params.field) {
			if (params !== undefined) {
				params = { field: params };
			}
			else {
				return cb("no field provided");
			}
		}
		params.value = null;
		return this.setValue(params, cb);
	};

	/**
	 * Removes multiple values from the store.
	 * @param {Object[] | String[]} params - An Array of field objects
	 * @param {String} param[].field - The name of the field
	 * @param {Function} cb -  returns an error if there is one.
	 * @example
	 * store.removeValue({field:'field1'},function(err,bool){});
	 */
	removeValues(params, cb) {
		if (!Array.isArray(params)) { return cb("The passed in parameter needs to be an array"); }
		asyncMap(params, this.removeValue, (err, data) => {
			return cb(err, data);
		});
	};

	/**
	 * Destroys the store.
	 * @param {Function} cb -  Will return the value if found.
	 * @example
	 * store.destroy();
	 */
	destroy(cb) {
		var params = {
			store: this.name,
			global: this.isGlobal,
		};

		Globals.distributedStoreClient.removeStore(params, (err, response) => {
			if (err) { return cb(err); }
			return cb(null, true);
		});
	};

	/**
	 * NOTE: make sure we dont have duplicate router subscribers
	 * @private
	 */
	changeSub(change) {
		if (!this.subs) this.subs = [];
		if (!this.subs[change]) {
			if (this.isGlobal) { Globals.distributedStoreClient.routerClient.subscribe("storeService" + change, this.handleChanges); }
			this.subs[change] = true;
		}
	};

	/**
	* Add a listener to the store at either the store or field level. If no field is given, the store level is used. You can also listen to nested object -- field1.nestedField
	* @param {Object} params - Params object
	* @param {String} params.field - The data field to listen for. If this is empty it listen to all changes of the store.
	* @param {Function} fn -  the function to call when a listener is triggered
	* @param {Function} cb - callback
	* @example
	*var myFunction = function(err,data){
	}
	* store.addListener({field:'field1'},myFunction,cb);

	*/
	addListener(params, fn, cb) {
		var field = null;
		if (typeof params === "function") {
			fn = params;
			params = {};
		}
		if (params.field) { field = params.field; }

		var combined = this.name + (field ? "." + field : "");
		if (this.listeners[combined]) {
			this.listeners[combined].push(fn);
		}
		else {
			this.listeners[combined] = [fn];
		}

		this.changeSub(combined);
		return cb ? cb() : null;
	};

	/**
	* Add an array of listeners as  objects or strings. If using strings, you must provide a function callback.
	* @param {Object[] | String[]} params - Params object
	* @param {String} params.field - The data field to listen for.
	* @param {String} [params.listener] - the function to call when a listener is triggered. If this is empty, fn is used.
	* @param {function} [fn] -  the function to call when a listener is triggered
	* @param {function} cb callback
	* @example
	*var myFunction = function(err,data){

	}
	store.addListeners([{field:'field1',listener:myFunction},{field:'field2',listener:myFunction}],null,cb);

	store.addListeners([{field:'field1'},{field:'field2',listener:myFunction}],myFunction,cb);

	store.addListeners(['field1','field2'],myFunction,cb);
	*/
	addListeners(params, fn, cb) {
		if (!Array.isArray(params)) {
			return this.addListener(params, fn, cb);
		}

		for (var i = 0; i < params.length; i++) {
			var field = null;
			var item = params[i];
			var ls;
			if (typeof item === "string") {
				field = item;
			} else if (item.field) {
				field = item.field;
				ls = params[i].listener;
			}

			var combined = this.name + (field ? "." + field : "");
			if (!ls) {
				if (fn && typeof fn === "function") {
					ls = fn;
				}
			}
			if (this.listeners[combined]) {
				this.listeners[combined].push(ls);
			}
			else {
				this.listeners[combined] = [ls];
			}
			this.changeSub(combined);
		}
		return cb ? cb() : null;

	};

	/**
	 * Remove a listener from  store. If no field is given, we look for a store listener
	 * @param {Object} params - Params object
	 * @param {String} params.field - The data field
	 * @param {function} [fn] -  the function to remove from the listeners
	 * @param {function} [cb] -  returns true if it was successful in removing the listener.
	 *
	 * @example
	 * var myFunction = function(err,data){
			}
	 * store.removeListener({field:'field1'},MyFunction,function(bool){});
	StoreCstorelient.removeListener(MyFunction,function(bool){});
	 */
	removeListener(params, fn, cb) {
		var field = null;

		if (typeof params === "function") {
			cb = fn;
			fn = params;
			params = {};
		}

		if (params.field) { field = params.field; }
		var combined = this.name + (field ? "." + field : "");
		if (this.listeners[combined]) {
			for (var i = 0; i < this.listeners[combined].length; i++) {
				if (this.listeners[combined][i] === fn) {
					this.listeners[combined].pop(i);
					return cb ? cb(null, true) : null;
				}
			}
		}
		return cb ? cb(null, false) : null;
	};

	/**
	 * Remove an array of listeners from the store
	 * @param {Object[] | String[]} params - Params object
	 * @param {String} params.field - The data field to listen for. If this is empty it listen to all changes of the store.
	 * @param {String} params.listener - The listener function
	 * @param {function} [fn] -  the function to remove from the listeners
	 * @param {function} [cb] -  returns true if it was successful in removing the listener.
	 *
	 * @example
	 * var myFunction = function(err,data){
			}
	 * store.removeListeners({field:'field1'},MyFunction,function(bool){});
	store.removeListeners([{field:'field1',listener:MyFunction}],function(bool){});
	store.removeListeners(['field1'],MyFunction,function(bool){});
	 */
	removeListeners(params, fn, cb) {
		if (!Array.isArray(params)) {
			if (typeof params === "function") {
				this.removeListener({}, params, cb);
			} else if (params.field) {
				this.removeListener(params, fn, cb);
			}
			return cb("missing fields");
		}
		var removeCount = 0;
		for (var i = 0; i < params.length; i++) {
			var field = null;
			var item = params[i];
			var ls;
			if (typeof item === "string") {
				field = item;
			} else if (item.field) {
				field = item.field;
				ls = params[i].listener;
			}

			var combined = this.name + (field ? "." + field : "");
			if (!ls) {
				if (fn && typeof fn === "function") {
					ls = fn;
				} else {
					continue;
				}
			}

			for (var j = 0; j < this.listeners[combined].length; j++) {
				if (this.listeners[combined][j] === ls) {
					this.listeners[combined].pop(i);
					removeCount++;
				}
			}
		}

		if (removeCount < params.length) {
			return cb("All listeners could not be found", false);
		}
		return cb ? cb(null, true) : null;
	};

	/**
	 * Handles all changes coming in from the service.
	 */
	private handleChanges = (err, response) => {// we use this to format our responses
		if (err) { Logger.system.error("DistributedStoreClient", err); }
		if (!response.data.store) { return; }
		if (!response.data.field) { response.data.field = null; }
		var combined = this.name + (response.data.field ? "." + response.data.field : "");
		var val = response.data.storeData ? response.data.storeData : response.data.value;
		this.triggerListeners(combined, val);
	}

	// Trigger any function that is listening for changes
	private triggerListeners(listenerKey, data) {
		if (this.listeners[listenerKey]) {
			for (var i = 0; i < this.listeners[listenerKey].length; i++) {
				if (typeof this.listeners[listenerKey][i] === "function") {
					Logger.system.debug("DistributedStore.triggerListeners", listenerKey, data);
					this.listeners[listenerKey][i](null, { field: listenerKey, value: data });
				} else {
					Logger.system.warn("DistributedStoreClient:triggerListeners: listener is not a function", listenerKey, i, this.listeners[listenerKey][i]);
				}
			}
		}
	}
};

export default StoreModel;
