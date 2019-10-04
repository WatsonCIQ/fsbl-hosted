/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

"use strict";
type valueParam = {
	field: string,
	value?: any
};
type valueParams = valueParam[] | string[];
type listenerParam = {
	/**
	 * The data field to listen for.
	*/
	field?: string,
	/**
	 * the function to call when a listener is triggered. If this is empty, fn is used.
	 */
	listener?: Function
}
type removeListenersType = listenerParam | listenerParam[];

import Validate from "../common/validate"; // Finsemble args validator
import { _BaseClient as BaseClient } from "./baseClient";
import { map as asyncMap } from "async";

import Logger from "./logger";

/**
 * @introduction
 * <h2>Config Client</h2>
 *
 * This client provides run-time access to Finsemble's configuration. See the [Configuration tutorial](tutorial-Configuration.html) for a configuration overview.
 * The Config Client functions similar to a global store created with the DistributedStoreClient and offers many of the same methods.
 * Values modified at runtime are not persisted.
 *
 * @hideconstructor
 * @constructor
 */
class ConfigClient extends BaseClient {
	listeners = [];
	subs;
	constructor(params) {
		super(params);
		//Methods were formally an arrow function. If we want our documentation build to read nested parameters, we need to use this instead of an arrow.
		this.processAndSet = this.processAndSet.bind(this);
		this.getValue = this.getValue.bind(this);
		this.getValues = this.getValues.bind(this);
		this.setValue = this.setValue.bind(this);
		this.setValues = this.setValues.bind(this);
		this.removeValue = this.removeValue.bind(this);
		this.removeValues = this.removeValues.bind(this);
		this.addListener = this.addListener.bind(this);
		this.addListeners = this.addListeners.bind(this);
		this.removeListener = this.removeListener.bind(this);
		this.removeListeners = this.removeListeners.bind(this);
		this.setPreference = this.setPreference.bind(this);
		this.getPreferences = this.getPreferences.bind(this);
	}
	/**
	 * Get a value from the config.
	 * @param {valueParam | String} params - Params object. This can also be a string
	 * @param {String} params.field - The field where the value is stored.
	 * @param {Function} cb -  Will return the value if found.
	 * @returns {any} - The value of the field. If no callback is given and the value is local, this will run synchronous
	 * @example
	 * FSBL.Clients.ConfigClient.getValue({field:'field1'},function(err,value){});
	 * FSBL.Clients.ConfigClient.getValue('field1',function(err,value){});
	 */
	getValue(params: string | valueParam, cb = Function.prototype): Promise<any> {
		if (typeof params === "string") { params = { field: params }; }

		const promiseResolver = (resolve, reject) => {
			if (!(params as valueParam).field) {
				const err = "no field provided";
				reject(err);
				return cb(err);
			}

			this.routerClient.query("configService.getValue", { field: (params as valueParam).field },
				function (err, response) {
					if (err) { reject(err); return cb(err); }
					resolve({ err, data: response.data });
					return cb(err, response.data);
				});
		};

		return new Promise(promiseResolver);
	};

	/**
	 * Get multiple values from the config.
	* @param {Object[] | String[]} fields - An array of field objects. If there are no fields provided, the complete configuration manifest are returned.
	 * @param {String} fields[].field - The name of the field
	 * @param {Function} cb -  Will return the value if found.
	 * @returns {Object} - returns an object of with the fields as keys.If no callback is given and the value is local, this will run synchronous
	 * @example
	 * FSBL.Clients.ConfigClient.getValues([{field:'field1'},{field2:'field2'}],function(err,values){});
	 * FSBL.Clients.ConfigClient.getValues(['field1','field2'],function(err,values){});
	 * FSBL.Clients.ConfigClient.get(null, callback); // returns the complete manifest containing the finsemble property
	*/
	getValues(fields: valueParams, cb = Function.prototype) {
		if (typeof fields === "function") {
			cb = fields;
			fields = null;
		}
		if (fields && !Array.isArray(fields)) {
			return this.getValue(fields, cb);
		}
		const promiseResolver = (resolve) => {
			this.routerClient.query("configService.getValues",
				{
					fields: fields
				}
				, function (err, response) {
					if (err) { return cb(err); }
					resolve({ err, data: response.data });
					return cb(err, response.data);
				});
		};
		return new Promise(promiseResolver);
	};

	/**
	 * Set a value in the config. Setting a value will trigger events that you can listen to using addListener
	 * @param {Object} params - Params object
	 * @param {String} params.field - The name of the field where data will be stored
	 * @param {any} params.value - Value to be stored
	 * @param {function} cb optional callback
	 * @returns {null}
	 *
	 * @example
	 * FSBL.Clients.ConfigClient.setValue({field:'field1',value:"new value"});
	 */
	setValue(params: valueParam, cb) {
		var data = {
			field: params.field,
			value: params.value
		};
		return this.routerClient.query("configService.setValue", data, function (err) {
			return cb ? cb(err) : null;
		});
	};

	/**
	 * This will set multiple values in the config.
	 * @param {Object} fields - An Array of field objects
	 * @param {String} fields.field - The name of the field
	 * @param {any} fields.value - Field value
	 * @param {function} cb optional callback
	 * @returns {null}
	 *
	 * @example
	 * FSBL.Clients.ConfigClient.setValues([{field:'field1',value:"new value"}]);
	 */
	setValues(fields: valueParams, cb?) {
		if (!fields) {
			return Logger.system.error("ConfigClient.SetValues. No params given");
		}
		if (!Array.isArray(fields)) {
			return Logger.system.error("ConfigClient.SetValues. Params must be an array");
		}
		return this.routerClient.query("configService.setValues", fields, function (err) {
			return cb ? cb(err) : null;
		});
	};

	/**
	 * Remove a value from the config.
	 * @param {Object | String} params - Either an object or string
	 * @param {String} param.field - The name of the field
	 * @param {Function} cb -  returns an error if there is one
	 * @example
	 * FSBL.Clients.ConfigClient.removeValue({field:'field1'},function(err,bool){});
	 */
	removeValue(params: valueParam, cb = Function.prototype) {

		if (params !== undefined) {
			if (!params.field && typeof params === "string") {
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
	 * Removes multiple values from the config.
	 * @param {Array.<Object>} params - An Array of field objects
	 * @param {Function} cb -  returns an error if there is one.
	 * @example
	 * FSBL.Clients.ConfigClient.removeValue({field:'field1'},function(err,bool){});
	 */
	removeValues(params: valueParams, cb = Function.prototype) {
		if (!Array.isArray(params)) { return cb("The passed in parameter needs to be an array"); }
		//casting needed here because params doesn't have an index method?? My guess is that their type defs aren't great.
		asyncMap((params as any), this.removeValue, function (err, data) {
			return cb(err, data);
		});
	};

	/**
	 * make sure we dont have duplicate router subscribers
	 * @private
	 */
	changeSub = (change) => {
		if (!this.subs) this.subs = {};
		if (!this.subs[change]) {
			this.routerClient.query("configService.addListener", change, (err, queryResponse) => {
				this.routerClient.subscribe(change, this.handleChanges);
			});
			this.subs[change] = true;
		}
	};

	/**
	* Add a listener to the config at either the root config level or field level. If no field is given, the root config level is used. You can also listen for changes to config fields any number of levels deep -- finsemble.configitem.deeperconfigitem.evendeeperconfigitem
	* @param {Object} params - Params object
	* @param {String} params.field - The data field to listen for. If this is empty it listen to all changes of the store.
	* @param {Function} fn -  the function to call when a listener is triggered
	* @param {Function} cb - callback
	* @example
	* var myFunction = function(err,data){};
	* FSBL.Clients.ConfigClient.addListener({field:'field1'},myFunction,cb);
	*/
	addListener(params: listenerParam, fn, cb?) {
		var field = null;
		if (typeof params === "function") {
			fn = params;
			params = {};
		}
		if (params.field) { field = params.field; }

		var combined = "configService" + (field ? "." + field : "");
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
	 *
	* Add an array of listeners as objects or strings. If using strings, you must provide a function callback.
	* @param {Object | Array.<Object>} params - Params object
	* @param {String} params[].field - The data field to listen for.
	* @param {String} params[].listener - the function to call when a listener is triggered. If this is empty, fn is used.
	* @param {function} fn -  the function to call when a listener is triggered
	* @param {function} cb
   	* @todo make the typing proper.
	* @example
	* var myFunction = function(err,data){}
  * FSBL.Clients.ConfigClient.addListeners(
	* 	[
	* 		{ field: "field1", listener: myFunction },
	* 		{ field: "field2", listener: myFunction }
	* 	],
	* 	null,
	* 	cb
	* );
	*
	* FSBL.Clients.ConfigClient.addListeners(
	* [{ field: "field1" }, { field: "field2", listener: myFunction }],
	* myFunction,
	* cb
	* );
	*
	* FSBL.Clients.ConfigClient.addListeners(["field1", "field2"], myFunction, cb);
	*/
	addListeners(params: listenerParam | listenerParam[], fn?: Function, cb?: Function) {
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

			var combined = "configService" + (field ? "." + field : "");
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
	 * Remove a listener from config. If no field is given, we look for a config root listener
	 * @param {Object} params - Params object
	 * @param {String} [params.field] - The data field
	 * @param {function} [fn] -  the function to remove from the listeners
	 * @param {function} [cb] -  returns true if it was successful in removing the listener.
	 *
	 * @example
	 * var myFunction = function(err,data){}
	 * FSBL.Clients.ConfigClient.removeListener({field:'field1'},MyFunction,function(bool){});
	 * FSBL.Clients.ConfigClient.removeListener(MyFunction,function(bool){});
	 */
	removeListener(params: listenerParam, fn, cb?) {
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
	 * Remove an array of listeners from the config
	 * @param {Object | Array.<Object>} params - Params object
	 * @param {String} params.field - The data field to listen for. If this is empty it listen to all changes of the store.
	 * @param {function} params.listener - The listener function
	 * @param {function} [fn] -  the function to remove from the listeners
	 * @param {function} [cb] -  returns true if it was successful in removing the listener.
	 *
	 * @example
	 * var myFunction = function(err,data){ }
	 * FSBL.Clients.ConfigClient.removeListeners({field:'field1'},MyFunction,function(bool){});
	 * FSBL.Clients.ConfigClient.removeListeners([{field:'field1',listener:MyFunction}],function(bool){});
	 * FSBL.Clients.ConfigClient.removeListeners(['field1'],MyFunction,function(bool){});
	 */
	removeListeners(params: removeListenersType, fn?: Function, cb?: Function) {
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

			var combined = "configService" + (field ? "." + field : "");
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
	 * @private
	 * @memberof ConfigClient
	 */
	handleChanges = (err, response) => {// we use this to format our responses
		if (err) { Logger.system.error(err); }
		if (!response.data.field) { response.data.field = null; }
		//var combined = "configService" + (response.data.field ? "." + response.data.field : "");
		var val = response.data.storeData ? response.data.storeData : response.data.value;
		this.triggerListeners(response.data.field ? response.data.field : "configService", val);
	}
	// Trigger any function that is listening for changes
	/**
	 * @private
	 * @memberof ConfigClient
	 */
	triggerListeners = (listenerKey, data) => {
		if (this.listeners[listenerKey]) {
			for (var i = 0; i < this.listeners[listenerKey].length; i++) {
				if (typeof this.listeners[listenerKey][i] === "function") {
					this.listeners[listenerKey][i](null, { field: listenerKey, value: data });
				} else {
					Logger.system.warn("ConfigClient:triggerListeners: listener is not a function", listenerKey);
				}
			}
		}
	}


	/**
	 * Get all or a portion of the configuration from the Config Service. Typically this function is used to return Finsemble configuration
	 * (e.g. "finesemble.components"); however, if can also return all or part of the manifest which contains the Finsemble config property.
	 * If no configReference parameter is passed in (i.e. only the callback parameter is specified), then the complete manifest object is returned
	 * (including manifest.finsemble).
	 *
	 * @param {object=} params field property identifies specific config to return
	 * @param {function} callback callback function(error, data) to get the configuration data
	 * @private
	 * @example
	 *
	 * FSBL.Clients.ConfigClient.get({ field: "finsemble" },function(err, finsemble) {
	 *		if (!err) {
	 *			finsembleConfig = finsemble;
	 *		} else {
	 *			console.error("failed to get finsemble configuration");
	 *		}
	 * });
	 *
	 * FSBL.Clients.ConfigClient.get({ field: "finsemble.isAuthEnabled" }, function(err, isAuthEnabled) {
	 *		var authorizationOn = isAuthEnabled;
	 * });
	 *
	 * FSBL.Clients.ConfigClient.get(callback); // returns the complete manifest containing the finsemble property
	 * FSBL.Clients.ConfigClient.get(null, callback); // alternate form; returns the complete manifest containing the finsemble property
	 * FSBL.Clients.ConfigClient.get({}, callback); // alternate form; returns the complete manifest containing the finsemble property
	 * FSBL.Clients.ConfigClient.get({ field: "finsemble.components" }, callback);
	 * FSBL.Clients.ConfigClient.get({ field: "finsemble.services" }, callback);
	 * FSBL.Clients.ConfigClient.get({ field: "finsemble.components" },callback);
	 * FSBL.Clients.ConfigClient.get({ field: "finsemble.assimilation.whitelist" }, callback);
	 * FSBL.Clients.ConfigClient.get({ field: "runtime.version",callback) }; // returns the manifest's runtime.version property
	 */
	get(params: valueParam | {}, callback) {
		Logger.system.debug("ConfigClient.Get", params);
		Logger.system.warn("This functionality has been deprecated. It will be removed in Finsemble version 3.0. Use getValue instead.", params);

		// if only one argument then assume no filtering parameters -- the complete manifest will be returned
		if (arguments.length === 1) {
			callback = params; // since only one arg, it must be the callback
			Validate.args(callback, "function");
			params = {};
		} else {
			Validate.args(params, "object", callback, "function");
		}
		this.routerClient.query("config.get", params, function (queryErr, queryResponse) {
			callback(queryErr, queryResponse ? queryResponse.data : null);
		});
	};

	/**
	 * This is designed to mirror the get. Private because security TBD.
	 * @private
	 *
	 * @param {object} params
	 * @param {function} callback
	 */

	set = (params: valueParam | {}, callback) => {
		Logger.system.debug("ConfigClient.Set", params);
		// if only one argument then assume no filtering parameters -- the complete manifest will be returned
		if (arguments.length === 1) {
			callback = params; // since only one arg, it must be the callback
			Validate.args(callback, "function");
			params = {};
		} else {
			Validate.args(params, "object", callback, "function");
		}
		this.routerClient.query("config.set", params, function (queryErr, queryResponse) {
			callback(queryErr, queryResponse ? queryResponse.data : null);
		});
	}

	/**
	 * Dynamically set config values within the Finsemble configuration.  New config properties may be set or existing ones modified. Note that configuration changes will not necessarily dynamically modify the components or services that use the corresponding configuration -- it depends if the component or service handles the corresponding change notifications (either though PubSub or the Config's DataStore). Also, these changes do not persist in any config files.)
	 *
	 * Special Note: Anytime config is set using this API, the newConfig along with the updated manifest will by published to the PubSub topic "Config.changeNotification".  To get these notifications any component or service can subscribe to the topic. An example is shown below.
	 *
	 * Special Note: Anytime config is set using this API, the dataStore underlying configuration 'Finsemble-Configuration-Store' will also be updated. To get these dataStore events a listener can be set as shown in the example below. However, any config modifications made directly though the DataStore will not result in corresponding PubSub notifications.
	 *
	 * @param {object} params
	 * @param {object} params.newConfig provides the configuration properties to add into the existing configuration under manifest.finsemble. This config must match the Finsemble config requirements as described in [Understanding Finsemble's Configuration]{@tutorial Configuration}. It can include importConfig references to dynamically fetch additional configuration files.
	 * @param {boolean} params.overwrite if true then overwrite any preexisting config with new config (can only set to true when running from same origin, not cross-domain); if false then newConfig must not match properties of existing config, including service and component configuration.
	 * @param {boolean} params.replace true specifies any component or service definitions in the new config will place all existing non-system component and service configuration
	 * @param {function} cb callback to be invoked upon task completion.
	 * @example
	 * // Examples using processAndSet()
	 * FSBL.Clients.ConfigClient.processAndSet({ newConfig: { myNewConfigField: 12345 }, overwrite: false});
	 * FSBL.Clients.ConfigClient.processAndSet(
	 * {
	 *	newConfig: {
	 *		"myNewConfigField": 12345,
	 *		"myNewConfigObject": {
	 *			A: "this is a test",
	 *			B: "more test"
	 *		},
	 *		"importConfig": [
	 *			"$applicationRoot/configs/application/test.json",
	 *		]
	 *	},
	 *	overwrite: true,
	 *  replace: false,
	 * },
	 *	function (err, finsemble) {
	 *		if (err) {
	 *			console.error("ConfigClient.set", err);
	 *		} else {
	 *			console.log("new finsemble config", finsemble);
	 *		}
	 *	}
	 * );
	 *
	 *  // example subscribing to PubSub to get notifications of dynamic updates
	 * RouterClient.subscribe("Config.changeNotification", function (err, notify) {
	 *		console.log("set notification", notify.data.newConfig, notify.data.finsemble);
	 *	});
	 *
	 *  // example using DataStore to get notifications of dynamic updates
	 * DistributedStoreClient.getStore({ store: 'Finsemble-Configuration-Store', global: true }, function (err, configStore) {
	 *		configStore.addListener({ field: "finsemble" }, function (err, newFinsembleConfig) {
	 *			console.log("new manifest.finsemble configuration", newFinsembleConfig);
	 *		});
	 * });
	 *
	 */
	processAndSet(params: {
		newConfig: any,
		overwrite: boolean,
		replace: boolean
	}, callback?: StandardCallback) {
		Logger.system.debug("ConfigClient.processAndSet", params);

		Validate.args(params, "object", callback, "function=") &&
			(Validate as any).args2("params.newConfig", params.newConfig, "object", "params.overwrite", params.overwrite, "boolean=", "params.replace", params.replace, "boolean=");

		if (!params.overwrite && params.replace) {
			var errMsg = "cannot use replace option unless overwrite is also true";
			Logger.system.warn("ConfigClient.processAndSet:", errMsg);
			if (callback) {
				callback(errMsg, null);
			}
		} else {
			this.routerClient.query("config.processAndSet", params, function (queryErr, queryResponse) {
				if (callback) {
					callback(queryErr, queryResponse ? queryResponse.data : null);
				}
			});
		}
	};

	/**
	 * Sets a value on the configStore and persists that value to storage. On application restart, this value will overwrite any application defaults.
	 * @param {Object} params - Params object
	 * @param {String} params.field - The name of the field where data will be stored
	 * @param {any} params.value - Value to be stored
	 * @param {function} callback - callback to be invoked when preferences have been retrieved from the service.
	 * @example
	 * FSBL.Clients.ConfigClient.setPreference({field: "finsemble.initialWorkspace", value: "Workspace 2" }, (err, response) => {
	 * 		//preference has been set
	 * });
	 */
	setPreference(params: valueParam, callback?: StandardCallback) {
		this.routerClient.query("PreferencesService.setPreference", params, function (queryErr, queryResponse) {
			if (callback) {
				callback(queryErr, queryResponse ? queryResponse.data : null);
			}
		});
	};

	/**
	 * Retrieves all of the preferences set for the application.
	 * @param {Object} params - parameters to pass to getPreferences. Optional. Defaults to null and currently ignored.
	 * @param {function} callback - callback to be invoked when preferences have been retrieved from the service.
	 * @example
	 * FSBL.Clients.ConfigClient.getPreferences((err, preferences)=>{
	 * 		//use preferences.
	 * });
	 */
	getPreferences(params: any, callback?: StandardCallback) {
		if (typeof params === "function") {
			callback = params;
			params = null;
		}
		this.routerClient.query("PreferencesService.getPreferences", params, function (queryErr, queryResponse) {
			if (callback) {
				callback(queryErr, queryResponse ? queryResponse.data : null);
			}
		});
	};
};

var configClient = new ConfigClient({
	startupDependencies: {
		services: ["configService"]
	},
	onReady: function (cb) {
		if (cb) {
			cb();
		}
	},
	name: "configClient"
});

export default configClient;
