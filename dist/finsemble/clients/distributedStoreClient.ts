/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
import { Dispatcher } from "flux";
import * as Utils from "../common/util";
import Validate from "../common/validate";
import BaseClient, { _BaseClient } from "./baseClient";
import StoreModel from "./StoreModel";
/** I'm not sure why we previously deferred requiring StoreModel, but we did.
  * I've tried to stay as true to the original implementation as possible. -- Daniel 12/19/18 */
let _StoreModel: any;

import { IGlobals } from "../common/Globals";
/** The global `window` object. We cast it to a specific interface here to be
 * explicit about what Finsemble-related properties it may have. */
const Globals = window as IGlobals;
var self;
var localStore = {};
function getGlobalStore(params, cb) {
	function returnStore(err, response) {
		if (err) { return cb(err); }
		return cb(err, new _StoreModel(response.data, self.routerClient));
	}

	return self.routerClient.query("storeService.getStore", params, returnStore);
}
function removeGlobalStore(params, cb) {
	self.routerClient.query("storeService.removeStore", params, function (err, response) {
		if (err) { return cb(err, false); }
		return cb(err, response.data);
	});
}

/**
 *
 * @introduction
 * <h2>Distributed Store Client</h2>
 * The Distributed Store Client handles creating, retrieving, and destroying stores. Stores are used to save and retrieve data either locally or globally.
 * This data is not persisted. You can add listeners at multiple levels (store or field), and get the updated data as it's updated in the store.
 * Fields are stored within the store as key/value pair.
 *
 * For more information, see the [Distributed Store tutorial](tutorial-DistributedStore.html).

 * @hideconstructor
 * @constructor
 */
class DistributedStoreClient extends _BaseClient {
	ls: any;
	constructor(params) {
		super(params)
		self = this;
		this.ls = localStore;
	}


	/**
	 * Get a store. If no store is set then we'll get the global Finsemble store. If global is not set we'll check local first then we'll check global.
	 * @param {Object} params - Params object
	 * @param {String} params.store -  The namespace of the value
	 * @param {boolean} params.global - If true, indicates the store is global.
	 * @param {function} cb -  Will return the value if found.
	 * @returns {StoreModel} - returns the store
	 * @example
	 * DistributedStoreClient.getStore({store:'store1'},function(storeObject){});
	 */
	getStore(params: {
		store?: string,
		global?: boolean
	}, cb) {
		if (params.global) {
			return getGlobalStore(params, cb);

		}
		if (localStore[params.store]) {
			return cb(null, localStore[params.store]);
		}

		return getGlobalStore(params, cb);

	};



	/**
	 *Creates a store.
	 * @param params Params object
	 * @param {string} params.store The namespace of to use
	 * @param {any} [params.values] -  Starting values for the store
	 * @param {boolean} params.global If true, indicates the store is global.
	 * @param {boolean} [params.persist] - Should this store persists? THe store must be global to use this flag.
	 * @param {function} cb -  Will return the store on success.
	 * @returns {function} - Callback will receive the store
	 * @example
	 * DistributedStoreClient.createStore({store:"store1",global:false,values:{}},function(storeObject){});
	 */
	createStore(params: {
		store: string,
		global?: boolean,
		values?: any
	}, cb: Function = Function.prototype): Promise<{ err: any, data: any }> {
		const promiseResolver = (resolve, reject) => {
			if (params.global) {
				return this.routerClient.query("storeService.createStore", params, function (err, response) {
					if (err) {
						reject(err);
						return cb(err);
					}
					const data = new _StoreModel(response.data, self.routerClient);
					resolve({ err, data });
					return cb(err, data);
				});
			}

			if (localStore[params.store]) {
				resolve({ err: null, data: localStore[params.store] });
				return cb(null, localStore[params.store]);
			}

			var ls = new _StoreModel(params, self.routerClient);
			localStore[ls.name] = ls;
			resolve({ err: null, data: ls });
			return cb(null, ls);
		};
		return new Promise(promiseResolver);

	};

	/**
	 * Remove a store . If global is not set and a local store isn't found we'll try to remove the global store
	 * @param {Object} params - Params object
	 * @param {String} params.store -  The namespace of to use
	 * @param {boolean} [params.global] - Is this a global store?
	 * @param {function} cb
	 * @example
	 * DistributedStoreClient.removeStore({store:"store1",global:true},function(){});
	 */
	removeStore(params: {
		store: string,
		global?: boolean,
	}, cb) {
		if (params.global) {
			return removeGlobalStore(params, cb);
		}
		if (localStore[params.store]) {
			delete localStore[params.store];
			return cb(null, true);
		}
		removeGlobalStore(params, cb);// If global flag is not set but we don't find it local, try global////Should we have this?

	};


	/**
	 * @private
	 */
	load = function (cb) {
		cb();
	};
};

var storeClient = new DistributedStoreClient({
	startupDependencies: {
		services: ["dataStoreService"]
	},
	onReady: function (cb) {
		_StoreModel = StoreModel;
		storeClient.load(cb);
	},
	name: "distributedStoreClient"
});


Globals.distributedStoreClient = storeClient;
export default storeClient;
