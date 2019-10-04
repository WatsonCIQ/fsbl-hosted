/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
import { FSBLDependencyManagerSingleton as FSBLDependencyManager } from "../common/dependencyManager";
import RouterClient from "../clients/routerClientInstance";
import Logger from "../clients/logger";

import {
	series as asyncSeries,
	asyncify as asyncAsyncify,
	each as asyncEach,
	timeout as asyncTimeout
} from "async";
import { System } from "../common/system";
import * as Constants from "../common/constants";
import { IRouterClient } from "../clients/IRouterClient";
const { SERVICE_INITIALIZING_CHANNEL, SERVICE_READY_CHANNEL, SERVICE_CLOSING_CHANNEL, SERVICE_CLOSED_CHANNEL, SERVICE_STOP_CHANNEL } = Constants;
const defaultBaseServiceParams: ServiceConstructorParams = {
	startupDependencies: {
		services: [],
		clients: []
	},
	shutdownDependencies: {
		services: []
	},
	addOFWrapper: false,
	name: window.name
};
/*
 * @introduction
 * <h2>Base Service</h2>
 * Creates an instance of the Base Service which all service must inherit. Services are spawned from your *service.json* file and managed by a helper thread - the **Service Manager**.
 * Services communicate their status and receive status of other service through the Service Manager.
 * Services have an initial handshake with the Service Manager on load, and then either go online or wait for dependant services to come online.
 * Service initialization is completely asynchronous, which allows all services to load at the same time, as long as their dependencies have been met.
 * @constructor
*/
export class BaseService {
	customData: any;
	initialize: Function;
	listeners: {
		onShutdown?: Function[];
	};
	Logger: any;
	onBaseServiceReadyCB: null | Function;
	name: string;
	parentUuid: string;
	RouterClient: IRouterClient;
	setOnConnectionCompleteCB: null | Function;
	shutdownDependencies: FinsembleDependencyObject;
	start: Function;
	started: boolean;
	startupDependencies: FinsembleDependencyObject
	status: ServiceState;
	waitedLongEnough: boolean;

	constructor(params = defaultBaseServiceParams) {
		fixParams(params);
		this.name = params.name ? params.name : window.name;
		this.startupDependencies = params.startupDependencies;
		this.shutdownDependencies = params.shutdownDependencies;
		this.Logger = Logger;
		this.RouterClient = RouterClient;
		//This will be set to true after the debugServiceDelay is met. Defaults to 0, but developers can up it if they need to jump in and add breakpoints and are on a bad computer.
		this.waitedLongEnough = false;
		//this.parentUuid = System.Application.getCurrent().uuid;
		this.onBaseServiceReadyCB = null;
		this.setOnConnectionCompleteCB = null;
		this.listeners = {};
		this.start = this.waitForDependencies;
		this.started = false;
		/**
		 * Service status
		 * @type {ServiceState}
		 */
		this.status = "initializing";
		this.setOnline = this.setOnline.bind(this);
		this.onBaseServiceReady = this.onBaseServiceReady.bind(this);
		this.handleShutdown = this.handleShutdown.bind(this);
		this.waitForDependencies();
	}

	/**
	* Waits for the dependencies. At the end of this function, it will trigger the child service's initialize function (or onBaseServiceReady).
	* @note This used to be BaseService.start
	* @private
	*/
	waitForDependencies() {
		//For backwards compat. note Start used to be invoked after the constructor.
		//note do this later

		if (this.started) return;

		this.started = true;
		var service = this;
		Logger.system.debug(`${this.name} starting`);
		function cacheCustomData(done) {
			Logger.system.debug("BaseService.start.setParentUUID");
			System.Window.getCurrent().getOptions((opts) => {
				service.customData = opts.customData;
				service.parentUuid = opts.customData.parentUuid;
				done();
			});
		}

		function onRouterReady(done) {
			RouterClient.onReady(function () {
				RouterClient.transmit(SERVICE_INITIALIZING_CHANNEL, { name: service.name });
				window.addEventListener("beforeunload", service.RouterClient.disconnectAll);
				Logger.system.debug("APPLICATION LIFECYCLE:STARTUP:SERVICE:BaseService.start.onRouterReady");
				done();
			});
		}

		function readyToGo(done) {
			Logger.system.debug("APPLICATION LIFECYCLE:STARTUP:SERVICE:BaseService.start.readyToGo");
			console.log(performance.now(), "ReadyToGo called");
			console.log("Startup Dependencies for", service.name, service.startupDependencies);
			console.log("Shutdown Dependencies for", service.name, service.shutdownDependencies);
			service.waitedLongEnough = true;
			FSBLDependencyManager.shutdown.waitFor(service.shutdownDependencies, service.handleShutdown);
			RouterClient.transmit(`${System.Window.getCurrent().name}.onSpawned`, {});

			//`done` invoked when all dependencies are up
			let dependency = FSBLDependencyManager.startup.waitFor(service.startupDependencies, done);
			dependency.on("err", (err) => {
				Logger.system.error(err);
			});
		}
		function showDeveloperTools(done) {
			const myWindow = System.Window.getCurrent();
			myWindow.isShowing((isShowing) => {
				if (isShowing && service.customData.showDevConsoleOnVisible!==false) {
					System.showDeveloperTools(
						myWindow.uuid,
						myWindow.name,
						done
					);
				} else {
					Logger.system.debug("APPLICATION LIFECYCLE:STARTUP:SERVICE:BaseService.start.delayStartup done");
					done();
				}
			})
		}
		return new Promise((resolve, reject) => {
			asyncSeries([
				onRouterReady,
				cacheCustomData,
				showDeveloperTools,
				readyToGo
			], () => {
				resolve();
				this.onDependenciesReady();
			});
		});
	}
	/**
	 * Transmits the serviceOnline message that the rest of the dependency manager objects system are listening for.
	 */
	setOnline() {
		if (this.status !== "ready") {
			console.log("Setting service online", this.name);
			Logger.system.log("APPLICATION LIFECYCLE:STARTUP:SERVICE ONLINE", this.name);
			RouterClient.transmit(SERVICE_READY_CHANNEL, { serviceName: this.name }); // notify service manager
			this.RouterClient.addListener(SERVICE_STOP_CHANNEL + "." + this.name, (err, response) => {
				this;
				FSBLDependencyManager.shutdown.checkDependencies();
			});
			this.status = "ready";
		}
	}
	/**
	 * Invokes a method passed in (or on) the object that inherits from the BaseService. In other words, the service instance will have its initialize function called, unless it's using old code, in which case we will have cached the callback earlier.
	 */
	onDependenciesReady() {
		Logger.system.debug("APPLICATION LIFECYCLE:STARTUP:BaseService onDependenciesReady", this.name);
		this.status = "initializing"; // must change from offline here; otherwise race condition waiting to call this.setOnline
		RouterClient.onReady(() => {
			//These first two blocks are for backward compatibility. The 3rd (initialize) is how it should be done.
			if (this.onBaseServiceReadyCB) {
				// if inheriting service provided a "connection complete" callback, then invoke before sending online
				this.onBaseServiceReadyCB(this.setOnline);
			} else if (this.initialize) {
				this.initialize(this.setOnline);
			} else {
				//otherwise setOnline need sto be called manually.
				setTimeout(() => {
					if (this.status !== "ready" && this.name !== "routerService") {
						console.error("No onBaseServiceReadyCB on initialize function defined on your service. Ensure that service.setOnline is called");
						Logger.system.error("No onBaseServiceReadyCB on initialize function defined on your service. Ensure that service.setOnline is called");
					}
				}, 3000);
			}
		});
	}

	onBaseServiceReady(func) { // used by the inheriting service to know where baseService init is complete
		if (this.status === "initializing") {
			//onBaseServiceReady is backwards-compatibility stuff.
			this.onBaseServiceReadyCB = () => {
				func(this.setOnline);
			};
		} else {
			func(this.setOnline);
		}
	}
	/**
	 * Really only for shutdown right now. Simple array that gets looped through on shutdown.
	 * @param {string} listenerType
	 * @param {function} callback
	 */
	addEventListener(listenerType, callback) {
		if (!this.listeners[listenerType]) {
			this.listeners[listenerType] = [];
		}
		this.listeners[listenerType].push(callback);
	}

	/**
	 * When the application sends out a shutdown message, this function is invoked. It iterates through any registered cleanup methods. When all of them have finished (or 10 seconds elapses), it sends a response to the application saying that it's completed cleanup (`shutdownComplete`, below).
	 * @private
	*/
	onShutdown(cb) {
		this.addEventListener("onShutdown", cb);

	}

	/**
	 * When the application sends out a shutdown message, this function is invoked. It iterates through any registered cleanup methods. When all of them have finished (or 10 seconds elapses), it sends a response to the application saying that it's completed cleanup (`shutdownComplete`, below).
	 * @private
	*/
	handleShutdown(err, message) {
		var self = this;
		function handleShutdownAction(handler, done) {
			let cleanup = asyncAsyncify(handler);
			cleanup = asyncTimeout(cleanup, 10000); // services may need some time to cleanup (depends on service)
			cleanup(null, done);
		}
		function shutdownComplete(err?, data?) {
			if (err) {
				Logger.system.error(err);
			}
			self.shutdownComplete();
		}
		if (this.listeners.onShutdown) {
			RouterClient.transmit(SERVICE_CLOSING_CHANNEL, {
				waitForMe: true,
				name: this.name
			});
			asyncEach(this.listeners.onShutdown, handleShutdownAction, shutdownComplete);
		} else {
			RouterClient.transmit(SERVICE_CLOSING_CHANNEL, {
				waitForMe: false,
				name: this.name
			});
			self.shutdownComplete();
		}
	}
	/**
	 * Fired when all cleanup methods have been finished.
	 * @private
	*/
	shutdownComplete() {
		Logger.system.info(`"APPLICATION LIFECYCLE:SHUTDOWN:SERVICE SHUTDOWN: ${this.name}`);
		RouterClient.transmit(SERVICE_CLOSED_CHANNEL, {
			name: this.name,
			uuid: System.Application.getCurrent().uuid
		});
	}
}

// ensures all service errors will be caught
window.addEventListener("error", function (errorObject) {
	var stack = errorObject.error ? errorObject.error.stack.substring(errorObject.error.stack.search("at ")) : ""; // strip off irrelevant part of stack
	Logger.error(errorObject.message,
		"File: " + errorObject.filename,
		"Line: " + errorObject.lineno,
		"Column: " + errorObject.colno,
		"Error Stack: \n    " + stack
	);
	return false;
});
//catch promise errors
window.addEventListener("unhandledrejection", function (event: any) {
	if (event.reason == "Cannot Wrap Service Manager or Services") {
		Logger.warn("A service tried To wrap itself. This is a side effect of using Clients in services.")
	} else {
		Logger.error("Unhandled rejection", "reason", event.reason)
	}
});
/**
 *
 * @private
 */
function fixParams(params) {
	if (params.startupDependencies) {
		if (!params.startupDependencies.services) params.startupDependencies.services = defaultBaseServiceParams.startupDependencies.services;
		if (!params.startupDependencies.clients) params.startupDependencies.clients = defaultBaseServiceParams.startupDependencies.clients;
	} else {
		params.startupDependencies = defaultBaseServiceParams.startupDependencies;
	}
	if (params.shutdownDependencies) {
		if (!params.shutdownDependencies.services) params.shutdownDependencies.services = defaultBaseServiceParams.shutdownDependencies.services;
	} else {
		params.shutdownDependencies = defaultBaseServiceParams.shutdownDependencies;
	}
}
