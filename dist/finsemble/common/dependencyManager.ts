import { EventEmitter } from "events";
import RouterClient from "../clients/routerClientInstance";
const STARTUP_TIMEOUT_DURATION = 10000;
import { APPLICATION_STATE_CHANNEL, SERVICES_STATE_CHANNEL, SERVICE_CLOSED_CHANNEL } from "./constants";

type StartupDependencyParams = {
	callback: Function;
	dependencies: string[];
}
/**
 * Small class to hold on to dependencies and callbacks. Also emits a timeout event that the startupManager is listening for. When it times out, the startupManager catches the event and generates a message that includes all of the offline clients and services. It then causes this class to emit an  err event that the baseService is listening for. This arrangement is set up for a couple of reasons.
 * 1. I can't use the logger in here because the logger uses the startupManager, and there'd be a circular dependency.
 * 2. FSBLDependencyManager is a singleton, and there can be multiple services living in a single window. I didn't want them all to log that they were offline if they weren't (e.g., if I'd put the emitter on the StartupManager instead of this class).
 */
class StartupDependency extends EventEmitter {
	startupTimer: number | null;
	callback: Function;
	dependencies: string[];
	constructor(params: StartupDependencyParams) {
		super();
		this.callback = params.callback;
		this.dependencies = params.dependencies;
		this.startupTimer = null;
		this.setStartupTimer = this.setStartupTimer.bind(this);
		this.clearStartupTimer = this.clearStartupTimer.bind(this);
		this.setStartupTimer();
	}

	/**
	 * Removes the startup timer (because the dependency was resolved within the allotted time);
	 */
	clearStartupTimer() {
		clearTimeout(this.startupTimer);
		delete this.startupTimer;
	}
	/**
	 * If the dependency hasn't resolved within STARTUP_TIMEOUT_DURATION, emit a timeout event that the StartupManager can catch.
	 */
	setStartupTimer() {
		let self = this;
		//+ coerces the result to a number, making typescript happy.
		this.startupTimer = +setTimeout(() => {
			self.emit("timeout");
		}, STARTUP_TIMEOUT_DURATION);
	}
}

/**
 * Used to generate a unique ID for the list of dependencies.
 */
function uuidv4() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}
/**
 * @private
 */
class StartupManager {
	onlineClients: string[];
	onlineServices: string[];
	dependencies: object;
	AuthorizationCompleted: boolean;
	startupTimers: object;
	startupTimerFired: boolean;
	servicesAreAllOnline: object = {};
	clientsAreAllOnline: object = {};

	/**
	 * @private
	 */
	constructor() {
		this.onlineClients = [];
		this.onlineServices = [];
		this.dependencies = {};
		this.AuthorizationCompleted = false;
		this.startupTimers = {};
		this.startupTimerFired = false;
		this.bindCorrectContext();
	}
	/**
	 * This function and `checkDependencies` are the most important parts of this class. This function accepts a FinsembleDependency object and a callback to be invoked when all required dependencies are ready.
	 *
	 * @param {FinsembleDependency} dependencies
	 * @param {any} callback
	 * @memberof StartupManager
	 */
	waitFor(dependencies, callback) {
		let id = uuidv4();

		//Set defaults to an empty array if they aren't passed in.
		if (!dependencies.services) dependencies.services = [];
		if (!dependencies.clients) dependencies.clients = [];
		//The dependency manager can pass in a name to the dependency. If it does, we'll use it. If not, we won't.

		if (dependencies.clients.length) {
			if (this.AuthorizationCompleted === false && dependencies.clients.includes("authenticationClient")) {
				dependencies.clients.splice(dependencies.clients.indexOf("authenticationClient"), 1);
			}
			//Lowercase the first letter of the client.
			dependencies.clients = dependencies.clients.map(clientName => {
				return clientName.charAt(0).toLowerCase() + clientName.slice(1);
			});
		}

		let dependency = new StartupDependency({ dependencies, callback });

		//If the dependency times out, throw an error that the baseService can catch. It will then log out why it's not online.
		dependency.on("timeout", () => {
			this.onDependencyTimeout(dependency);
		});

		this.dependencies[id] = dependency;
		this.checkDependencies();
		return dependency;
	}

	/**
	 * This method generates a helpful error message giving possible reasons for why the service is offline. After the message is generated, it emits an event on the dependency that's passed in as a parameter. The BaseService is listening for this event, and logs the error message to the central logger.
	 * @param {Dependency} dependency
	 */
	onDependencyTimeout(dependency) {
		const NEW_LINE = "\n",
			TAB = "\u0009",
			BULLET = "\u2022",
			BULLET_POINT = NEW_LINE + TAB + BULLET,
			STORAGE_ADAPTER_ERROR = "The default storage adapter failed to fully initialize, or has a syntax error. Ensure that the default storage adapter is up, connected, and sending/receiving data properly.";

		const HELPFUL_MESSAGES = {
			preferencesService: [
				`PreferencesService failed to start.${BULLET_POINT}Typically this is caused by a failure to retrieve data from your default storage adapter. ${STORAGE_ADAPTER_ERROR}`],
			storageService: [
				`StorageService failed to start. Here are some common reasons for failure:${BULLET_POINT}${STORAGE_ADAPTER_ERROR}${BULLET_POINT}The data coming back from your adapter is improperly formatted or otherwise corrupted. Try clearing your storage and restarting. If the problem persists, the issue may not be in your adapter.`
			],
			routerService: [
				"RouterService failed to start. This is a fatal error. Contact finsemble support."
			],
			workspaceService: [
				`WorkspaceService failed to start. Here are some common reasons for failure:${BULLET_POINT}${STORAGE_ADAPTER_ERROR}.${BULLET_POINT}Your active workspace is corrupted.`
			],
			assimilationService: [
				"AssimilationService failed to start. Check to see that the 'FinsembleAssimilation' is active in your taskManager. If it is, please contact finsemble support."
			]
		};

		let offlineClients = this.getOfflineClients();
		let offlineServices = this.getOfflineServices();
		let errorMessage = `APPLICATION LIFECYCLE:STARTUP:Dependency not online after ${STARTUP_TIMEOUT_DURATION / 1000} seconds.`;

		if (offlineClients.length) {
			errorMessage += ` Waiting for these clients: ${offlineClients.join(", ")}.`;
		}
		if (offlineServices.length) {
			errorMessage += ` Waiting for these services: ${offlineServices.join(", ")}.`;
		}

		//For every service that's offline, check to see if we have any helpful messages for it. If so, iterate through the array and append to the error message.
		offlineServices.forEach((service) => {
			if (HELPFUL_MESSAGES[service]) {
				HELPFUL_MESSAGES[service].forEach((msg) => {
					errorMessage += NEW_LINE + NEW_LINE + msg + NEW_LINE;
				});
				//puts a line between our helpful messages and the log stack.
				errorMessage += NEW_LINE;
			}
		});

		//The BaseService is listening for this event, and will log the errorMessage to the central logger.
		dependency.emit("err", errorMessage);
	}
	/**
	 * This function loops through all of the registered dependencies and checks to see if the conditions have been met. If so, it invokes the callback and removes the reference to the dependency.
	 *
	 * @memberof StartupManager
	 */
	checkDependencies() {
		for (let id in this.dependencies) {
			let dependency = this.dependencies[id];
			let { dependencies, callback } = dependency;
			if (dependencies.services.length && !this.servicesAreAllOnline[id]) {
				this.servicesAreAllOnline[id] = this.checkServices(dependencies.services);
				if (!this.servicesAreAllOnline[id]) {
					continue;
				}
			}

			if (dependencies.clients.length && !this.clientsAreAllOnline[id]) {
				this.clientsAreAllOnline[id] = this.checkClients(dependencies.clients);
				if (!this.clientsAreAllOnline[id]) {
					continue;
				}
			}
			delete this.dependencies[id];
			dependency.clearStartupTimer();
			if (callback) {
				callback();
			}
		}
	}

	getOfflineClients() {
		let offlineClients = [];
		for (let id in this.dependencies) {
			let { dependencies } = this.dependencies[id];
			offlineClients = offlineClients.concat(dependencies.clients.filter((dep) => !this.onlineClients.includes(dep)));
		}
		//return deduped list.
		return offlineClients.filter((client, i) => offlineClients.indexOf(client) === i);
	}

	getOfflineServices() {
		let offlineServices = [];
		for (let id in this.dependencies) {
			let { dependencies } = this.dependencies[id];
			offlineServices = offlineServices.concat(dependencies.services.filter((dep) => !this.onlineServices.includes(dep)));
		}
		return offlineServices.filter((client, i) => offlineServices.indexOf(client) === i);
	}
	/**
	 * Iterates through required service list, returns false if any required service is offline.
	 *
	 * @param {any} serviceList
	 * @memberof StartupManager
	 */
	checkServices(serviceList) {
		return serviceList.every(service => this.onlineServices.includes(service));
	}
	/**
	 * Iterates through required client list, returns false if any required client is offline.
	 *
	 * @param {any} clientList

	 * @memberof StartupManager
	 */
	checkClients(clientList) {
		return clientList.every(client => this.onlineClients.includes(client));
	}

	/**
	 * When a service comes online, we push it onto our array of online services, and run through all of the registered dependencies.
	 *
	 * @param {any} serviceName
	 * @memberof StartupManager
	 */
	setServiceOnline(serviceName) {
		this.onlineServices.push(serviceName);
		this.checkDependencies();
	}
	/**
	 * Sets an array of services online. Only happens once at startup.
	 *
	 * @param {any} serviceList
	 * @memberof StartupManager
	 */
	setServicesOnline(serviceList) {
		this.onlineServices = this.onlineServices.concat(serviceList);
		this.checkDependencies();
	}
	/**
	 *
	 *
	 * @param {any} clientName

	 * @memberof StartupManager
	 */
	setClientOnline(clientName) {
		//This check is done because multiple clients of the same type can be on a page.
		if (this.onlineClients.includes(clientName)) {
			return;
		}
		this.onlineClients.push(clientName);
		this.checkDependencies();
	}
	/**
	 * Returns the array of online clients.
	 *

	 * @memberof StartupManager
	 */
	getOnlineClients() {
		return this.onlineClients;
	}
	/**
	 * Returns the array of online services.
	 *

	 * @memberof StartupManager
	 */
	getOnlineServices() {
		return this.onlineServices;
	}
	/**
	 * Method to make sure that `this` is correct when the callbacks are invoked.
	 *
	 * @memberof StartupManager
	 */
	bindCorrectContext() {
		this.checkDependencies = this.checkDependencies.bind(this);
		this.checkServices = this.checkServices.bind(this);
		this.checkClients = this.checkClients.bind(this);
		this.getOfflineClients = this.getOfflineClients.bind(this);
		this.getOfflineServices = this.getOfflineServices.bind(this);
		this.onDependencyTimeout = this.onDependencyTimeout.bind(this);
		this.waitFor = this.waitFor.bind(this);
	}
}
/**
 * @private
 */
class ShutdownManager {
	offlineServices: string[];
	dependencies: object;
	/**
	 * @private
	 */
	constructor() {
		this.offlineServices = [];
		this.dependencies = {};
		this.checkDependencies = this.checkDependencies.bind(this);
	}

	/**
	 * This function and `checkDependencies` are the most important parts of this class. This function accepts a FinsembleDependency object and a callback to be invoked when all required dependencies are ready.
	 *
	 * @param {FinsembleDependency} dependencies
	 * @param {any} callback
	 * @memberof StartupManager
	 */
	waitFor(dependencies, callback) {
		//Set defaults to an empty array if they aren't passed in.
		if (!dependencies.services) {
			dependencies.services = [];
		}

		let id = uuidv4();

		this.dependencies[id] = { dependencies, callback };
	}
	/**
	 * This function loops through all of the registered dependencies and checks to see if the conditions have been met. If so, it invokes the callback and removes the reference to the dependency.
	 *
	 * @memberof ShutdownDependencies
	 */
	checkDependencies() {
		console.debug("checkDependencies", this.dependencies);
		if (Object.keys(this.dependencies)) {
			for (let id in this.dependencies) {
				let { dependencies, callback } = this.dependencies[id];
				console.debug("checkDependency", dependencies.services, this.offlineServices);
				if (dependencies.services.length) {
					let servicesAreAllOffline = this.checkServices(dependencies.services);
					if (!servicesAreAllOffline) {
						continue;
					}
				}
				console.debug("checkDependencies callback");
				delete this.dependencies[id];
				if (callback) {
					callback();
				}
			}
		}

	}
	/**
	 * Iterates through required service list, returns false if any required service is offline.
	 *
	 * @param {any} serviceList

	 * @memberof StartupManager
	 */
	checkServices(serviceList) {
		return serviceList.every(service => this.offlineServices.includes(service));
	}

	setServiceOffline(service) {
		console.debug("setServiceOffline", service);
		this.offlineServices.push(service);
		this.checkDependencies();
	}

}
/**
 * This is a class that handles FSBL client/service dependency management. Given a list of services and/or clients, it will invoke a callback when all dependencies are ready. This is a singleton.
 * @shouldBePublished false
 * @private
 * @class FSBLDependencyManager
 */
class FSBLDependencyManager extends EventEmitter {
	/**
	 * Binds context, and listens for services to come online.
	 * Creates an instance of FSBLDependencyManager.
	 * @private
	 * @memberof FSBLDependencyManager
	 */
	startup: StartupManager;
	shutdown: ShutdownManager;
	AuthorizationCompleted;
	RouterClient;
	name;
	constructor() {
		super();
		this.startup = new StartupManager();
		this.shutdown = new ShutdownManager();
		this.RouterClient = RouterClient;
		this.AuthorizationCompleted = false;
		this.bindCorrectContext();
		this.onAuthorizationCompleted(this.startup.checkDependencies);
		RouterClient.onReady(this.listenForServices);
	}
	/**
 * Method to make sure that `this` is correct when the callbacks are invoked.
 *
 * @memberof StartupManager
 */
	bindCorrectContext() {
		this.listenForServices = this.listenForServices.bind(this);
		this.onAuthorizationCompleted = this.onAuthorizationCompleted.bind(this);
	}

	setClientOnline(client) {
		this.startup.setClientOnline(client);
	}
	/*
	* handler for when a service changes its state. If a service comes online or goes offline, dependencies are checked and callbacks invoked.
	*/
	onServiceStateChange(data) {
		let ServiceNames = Object.keys(data);
		//Iterate through all services. If it was online but isn't anymore, set it offline. If it was offline but now is, set it online.
		ServiceNames.forEach((serviceName: string) => {
			let state: ServiceState = data[serviceName].state;
			let wasOnline: boolean = this.startup.onlineServices.includes(serviceName);
			let isOnline: boolean = state === "ready";

			if (!wasOnline && isOnline) {
				this.startup.setServiceOnline(serviceName);
			}
			if (wasOnline && !isOnline && state === "closed") {
				this.shutdown.setServiceOffline(serviceName);
			}
		});
	}
	/**
	 * Listens on the router for services to come online. The first subscriber gets the activeServices as of object instantiation. The 2nd subscriber listens for services to come online after the object is created. We should consider make this all one subscriber, though I see the advantage of having this setup.
	 *
	 */
	listenForServices() {
		console.debug("dependency manager: listenForServices in " + this.name);

		this.RouterClient.subscribe(SERVICES_STATE_CHANNEL, (err, event) => {
			this.onServiceStateChange(event.data);
		});

		// TODO: The pubsub responder doesn't seem to work here. IT works for the above when not closing.
		this.RouterClient.addListener(SERVICE_CLOSED_CHANNEL, (err, event) => {
			let services = {};
			services[event.data.name] = {
				state: "closed"
			}
			this.onServiceStateChange(services);
		});

		this.RouterClient.subscribe(APPLICATION_STATE_CHANNEL, (err, response: ApplicationStateChange) => {
			switch (response.data.state) {
				//authenticated will only be caught by components/services that are up before auth does its thing. Otherwise, a component/service coming up will have the 'ready' application state. In either case, we need to do the things below. But only once.
				case "authenticated":
				case "ready":
					//No need to send this message out twice.
					if (this.AuthorizationCompleted) break;
					console.debug("Authorization Completed");
					this.AuthorizationCompleted = true;
					this.startup.AuthorizationCompleted = true;
					this.emit("AuthorizationCompleted");
					break;
				case "closing":
					this.shutdown.checkDependencies();
					break;
			}
		});
	}

	onAuthorizationCompleted(callback) {
		if (this.AuthorizationCompleted) {
			callback();
		} else {
			this.addListener("AuthorizationCompleted", callback);
		}
	}

}
/**
 * This is a class that handles FSBL client/service dependency management. Given a list of services and/or clients, it will invoke a callback when all dependencies are ready. This is a singleton.
 * @shouldBePublished false
 * @private
 * @class FSBLDependencyManager
 */
export let FSBLDependencyManagerSingleton: FSBLDependencyManager = new FSBLDependencyManager();
export default FSBLDependencyManagerSingleton;
