/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
import RouterClient from "./routerClientInstance";
import Validate from "../common/validate"; // Finsemble args validator
import Logger from "./logger";
import { ICentralLogger } from "./ICentralLogger";
import { System } from "../common/system";

import { FSBLDependencyManagerSingleton as FSBLDependencyManager } from "../common/dependencyManager";
export type BaseClientParams = {
	/** A function to be called after the client has initialized. */
	onReady?: (cb) => void,
	/** The name of the client. Must be unique. */
	name: string,
	/** @TODO - add enumerations for all clients and services. */
	/** The clients that must be online before this client comes online. */
	requiredClients?: any[],
	/** The services that must be online before this client comes online. */
	requiredServices?: any[],
	startupDependencies?: { services?: string[], clients?: string[] }
};

/**
 * @introduction
 * <h2>Base Client</h2>
 * The Base Client is inherited by every client to provide common functionality to the clients. Clients communicate their status to each other through the Router and receive service status from the service manager. Once all dependencies are met, either client or service, the client's `onReady` method is fired.
 *
 * We're currently halfway through migrating our clients from extending a normal function prototype to an ES6 class.
 * "_BaseClient" represents the new class, while "BaseClient" is the original function. When the migration is complete,
 * we will remove the old function and rename "_BaseClient" to "BaseClient".
 * @constructor
 * @param {Object} params
 * @param {Function} params.onReady - A function to be called after the client has initialized.
 * @param {String} params.name - The name of the client
 * @shouldBePublished false
	@example
	import { _BaseClient as BaseClient } from "./baseClient";
	var NewClient = function (params) {
		BaseClient.call(this, params);
		var self = this;

		return this;
	};

	var clientInstance = new NewClient({
		onReady: function (cb) {
			Logger.system.log("NewClient Online");
			cb();
		},
		name:"NewClient"
	});
	clientInstance.requiredServices = [REPLACE_THIS_ARRAY_WITH_DEPENENCIES];
	clientInstance.initialize();
	module.exports = clientInstance;
	@private
 */
export class _BaseClient {
	/** The current status of this service. */
	status: "offline" | "online" = "offline";
	/** The callback called when this service is ready. */
	private _onReady: any;
	startupTime = 0;
	initialized = false;
	startupDependencies: { services?: any[], clients?: any[] } = { services: [], clients: [] };
	/** Reference to the RouterClient. */
	routerClient;
	/** Gets the current openfin window - stays here for backward compatibility. */
	finWindow: {
		name: string,
		uuid: string,
	};
	/** Gets the current window. */
	finsembleWindow = null;
	/** Gets the current window name. */
	windowName = "";
	/** Services that must be online before the client can come online. */
	requiredServices: any[];
	/** Clients that must be online before the client may come online.*/
	requiredClients: any[];
	/** Queue of functions to process once the client goes online. */
	clientReadyQueue: (() => void)[] = [];
	/** A unique name for the client.*/
	name: string;
	logger: ICentralLogger;

	constructor(params: BaseClientParams) {
		this.name = params.name;
		this._onReady = params.onReady;
		this.startupDependencies = params.startupDependencies || {
			services: [],
			clients: []
		};
		// @TODO - Refactor this to use DI.
		this.logger = Logger;
		/**
		 * Reference to the RouterClient
		 */
		this.routerClient = RouterClient;
	}
	/**
	 * @private
	 *
	 */
	processClientReadyQueue = () => {
		for (let cb of this.clientReadyQueue) {
			cb();
		}
		this.clientReadyQueue = [];
	};
	/**
	 * @private
	 *
	 */
	onReady = (cb) => {
		this.clientReadyQueue.push(cb);
		if (this.status === "online") {
			this.processClientReadyQueue();
		}
	}

	/** Check to see if the client can come online. We check this against the required services and clients */
	/**
 * @private
 *
 */
	setClientOnline = () => {
		this.status = "online";
		const onReadyMessage = `STARTUP:CLIENT ONLINE:${this.finWindow.name}:${this.name}`;
		this.startupTime = window.performance.now() - this.startupTime;
		const readyCB = () => {
			this.logger.system.debug(onReadyMessage);
			this.processClientReadyQueue();
			FSBLDependencyManager.setClientOnline(this.name);
		}
		if (this._onReady) {
			this._onReady(readyCB);
		} else {
			readyCB();
		}
	}
	/**
	 * @private
	 *
	 */
	initialize = (cb = Function.prototype) => {
		if (this.initialized) return;

		this.initialized = true;
		this.startupTime = performance.now();
		this.routerClient.onReady(() => {
			// TODO, [terry] allow the finsembleWindow to be passed in, so we can support proxying windowClient in RPC
			this.finWindow = System.Window.getCurrent();
			this.windowName = this.finWindow.name;
			this.logger.system.debug("Baseclient Init Router Ready", this.name);
			FSBLDependencyManager.startup.waitFor(
				this.startupDependencies,
				() => {
					cb();
					this.setClientOnline();
				});
		});
	}
	/**
	 * @private
	 *
	 */
	onClose = (cb?) => {
		if (cb) cb();
	};
}

/**
 * @introduction
 * <h2>Base Client</h2>
 * The Base Client is inherited by every client to provide common functionality to the clients. Clients communicate their status to each other through the Router and receive service status from the service manager. Once all dependencies are met, either client or service, the client's `onReady` method is fired.
 * @constructor
 * @param {Object} params
 * @param {Function} params.onReady - A function to be called after the client has initialized.
 * @param {String} params.name - The name of the client
 * @shouldBePublished false
	@example
	import { _BaseClient as BaseClient } from "./baseClient";
	var NewClient = function (params) {
		BaseClient.call(this, params);
		var self = this;

		return this;
	};

	var clientInstance = new NewClient({
		onReady: function (cb) {
			Logger.system.log("NewClient Online");
			cb();
		},
		name:"NewClient"
	});
	clientInstance.requiredServices = [REPLACE_THIS_ARRAY_WITH_DEPENENCIES];
	clientInstance.initialize();
	module.exports = clientInstance;
	@private
 */
var BaseClient = function (params) {
	Validate.args(params, "object=");
	var self = this;
	var status = "offline";
	var onReady;
	this.startupTime = 0;
	if (params) {
		if (params.onReady) {
			onReady = params.onReady;
		}
		this.name = params.name;
	}
	this.initialized = false;
	this.startupDependencies = params.startupDependencies || {
		services: [],
		clients: []
	};
	/**
	 * Reference to the RouterClient
	 *  @type {Object}
	 */
	this.routerClient = RouterClient;

	/**
	 * Gets the current openfin window - stays here for backward compatibility
	 * @type {object}
	 */
	this.finWindow = null;

	/**
	 * Gets the current window
	 * @type {object}
	 */
	this.finsembleWindow = null;

	/**
	 * Gets the current window name
	 *  @type {string}
	 */
	this.windowName = "";//The current window

	/**
	 * Services the are required to be online before the service can come online
	 *  @type {Array.<Object>}
	 */
	this.requiredServices = [];
	/**
	 * Clients the are required to be online before the service can come online
	 *  @type {Array.<Object>}
	 */
	this.requiredClients = [];

	/**
	 * Queue of functions to process once the client goes online.
	 * @private
	 */
	this.clientReadyQueue = [];

	/**
	 * Iterates through the clientReadyQueue, invoking each call to `.ready`.
	 */
	this.processClientReadyQueue = function () {
		for (var i = 0; i < this.clientReadyQueue.length; i++) {
			let callback = this.clientReadyQueue[i];
			if (typeof callback === "function") {
				callback();
			}
		}
		this.clientReadyQueue = [];
	};

	/**
	 * Method for adding callbacks to each client.
	 */
	this.onReady = function (cb) {
		this.clientReadyQueue.push(cb);
		if (status === "online") {
			this.processClientReadyQueue();
		}
	};
	//Check to see if the client can come online. We check this against the required services and clients
	this.setClientOnline = function () {
		var self = this;
		status = "online";
		let onReadyMessage = `STARTUP:CLIENT ONLINE:${self.finWindow.name}:${self.name}`;
		self.startupTime = performance.now() - self.startupTime;
		if (onReady) {
			onReady(function () {
				Logger.system.debug(onReadyMessage);
				self.processClientReadyQueue();
				FSBLDependencyManager.setClientOnline(self.name);
			});
		} else {
			Logger.system.debug(onReadyMessage);
			self.processClientReadyQueue();
			FSBLDependencyManager.setClientOnline(self.name);
		}
	};


	/**
	* Starts the process of checking services and any other function required before the client can come online
	*/
	this.initialize = function (cb = Function.prototype) {
		if (self.initialized) { return; }
		self.initialized = true;
		self.setClientOnline = self.setClientOnline.bind(self);
		self.startupTime = performance.now();
		self.routerClient.onReady(function () {
			// TODO, [terry] allow the finsembleWindow to be passed in, so we can support proxying windowClient in RPC
			self.finWindow = System.Window.getCurrent();
			self.windowName = self.finWindow.name;
			Logger.system.debug("Baseclient Init Router Ready", self.name);
			FSBLDependencyManager.startup.waitFor({
				services: self.startupDependencies.services || [],
				clients: self.startupDependencies.clients || []
			}, () => {
				cb();
				self.setClientOnline();
			});
		});
	};

	this.onClose = function () { };

};

export default BaseClient;
