// this code was pulled out of old service manager

import Logger from "../../clients/logger";
import { System } from "../../common/system";
import ConfigClient from "../../clients/configClient";
import RouterClient from "../../clients/routerClientInstance";
import { series as asyncSeries} from "async";
import * as Constants from "../../common/constants";
import { killOldApplications } from "./common"
import DialogManager from "../../clients/dialogManagerClient";
import FSBLDependencyManager from "../../common/dependencyManager";



let SCHEDULED_RESTART_TIMEOUT = 60000;

/**
 * Manages an orderly shutdown of Finsemble
 */
class Shutdown {
	finUUID: object;
	//Will be set to 'restart' in the restart fork.
	quitType: string = "quit";

	/**
	 * Number of services loaded on startup.
	 */
	servicesLoaded = [];

	/**
	 * Number of services that have responded to the shutdownRequest.
	 */
	servicesResponded = [];

	/**
	 * Which services will need to compelete some kind of cleanup.
	 */
	waitFor = [];

	createdApps = [];
	splinterAgentPool = null;

	finsembleConfig;

	constructor(params) {
		this.finsembleConfig = params.manifest.finsemble;
		this.finUUID = params.finUUID;
		this.forceRestart = this.forceRestart.bind(this);
	}

	/**
	 * Dynamically sets splinter agent pool during boot
	 * @param splinterAgentPool
	 */
	setSplinterAgentPool(splinterAgentPool) {
		this.splinterAgentPool = splinterAgentPool;
	}

	/**
	 * Will check to see if all services have:
	 * 1. responded to the shutdownRequest, and
	 * 2. If they needed to cleanup, whether they've finished.
	 *
	 * If everyone is nice and tidy, the app quits or restarts.
	 */
	attemptQuit() {
		if (this.quitType === "quit") {
			this.shutdownFinsemble();
		} else if (this.quitType === "restart") {
			this.forceRestart();
		}
	}

	forceRestart() {
		function restartApp() {
			System.Application.getCurrent().restart();
		}

		//Check for Electron or OpenFin. We only need to call to closeAllApplications when OpenFin. At this point (for Electron) the windows have already been killed.
		if (fin.container !== "Electron") {
			this.closeAllApplications(restartApp);
		} else {
			restartApp();
		}
	}

	closeAllApplications(cb) {
		//no logger messages sent because it'll be down at this point.
		console.info("APPLICATION LIFECYCLE:SHUTDOWN:Closing all applications:start");
		let myUuid = this.finUUID;

		asyncSeries([
			(callback) => {
				if (this.splinterAgentPool) this.splinterAgentPool.shutdown(callback);
				//callback(); //uncomment this line and comment above line to test restart issues
			},
			async (callback) => {
				for (let app of this.createdApps) {
					await System.closeApplication(app);
				}
				callback();
			}
		], cb);

	}

	shutdownFinsemble() {
		this.closeAllApplications(() => {
			System.closeApplication(System.Application.getCurrent());
		});
	}

	/**
	 * When FSBL transmits on the `Application.shutdown` channel, we receive it here. From here, we ask all services to go ahead and compelte any cleanup that they need to take care of.
	 */
	transmitShutdownRequest() {
		let logMessage = "APPLICATION LIFECYCLE:SHUTDOWN:transmitShutdownRequest:Sending out message to shut down.";
		console.info(logMessage);
		Logger.system.log(logMessage);

		const ApplicationState: ApplicationState = {
			state: "closing"
		}
		RouterClient.publish(Constants.APPLICATION_STATE_CHANNEL, ApplicationState);
		let timeout = this.finsembleConfig.shutdownTimeout || 10000;
		setTimeout(async () => {
			if (fin.container !== "Electron") await killOldApplications(this.finUUID);
			System.closeApplication(System.Application.getCurrent());
		}, timeout);

		//TODO: Original code had a check for Openfin 8.26 and it called forceKill instead of system.exit
	}

	/**
	 * When FSBL transmits on the `Application.shutdown` channel, we receive it here. From here, we ask all services to go ahead and compelte any cleanup that they need to take care of.
	 */
	transmitRestartRequest(err, response) {
		/*if (response.data && response.data.forceRestart) { // Force restart without proper close breaks because we dont kill everything anymore
			return this.forceRestart();
		}*/
		let logMessage = "APPLICATION LIFECYCLE:SHUTDOWN:transmitShutdownRequest:Sending out message to shut down.";
		console.info(logMessage);
		Logger.system.log(logMessage);
		Logger.system.debug("shutdownManager.transmitRestartRequest");
		this.quitType = "restart";
		const ApplicationState: ApplicationState = {
			state: "closing"
		}
		RouterClient.publish(Constants.APPLICATION_STATE_CHANNEL, ApplicationState);

		let timeout = this.finsembleConfig.shutdownTimeout || 10000;
		setTimeout(this.forceRestart, timeout);
	}
}


export class ShutdownManager {
	shutdown: Shutdown;
	manifest: object;
	finsembleConfig: any;
	restartg: object;
	shutdownList: object[];
	dialogManager: any;

	constructor(params) {
		Logger.system.log("shutdownManager", params);
		this.manifest = params.manifest;
		this.finsembleConfig = params.manifest.finsemble; // enough to get started -- later will replace will complete processed config;
		this.shutdown = new Shutdown({ finUUID: params.finUUID, manifest: params.manifest });
		this.shutdownList = [];
		this.restart = this.restart.bind(this);
		this.dialogManager = DialogManager;
	}

	/**
	 * Dynamically sets splinter agent pool during boot
	 * @param splinterAgentPool
	 */
	public setSplinterAgentPool(splinterAgentPool) {
		this.shutdown.setSplinterAgentPool(splinterAgentPool);
	}

	public addAppToShutdownList(app) {
		this.shutdownList.push(app);
	}

	public setupShutdownListeners(activeServices:string[]) {
		// have to wait for router to become available before add listeners
		RouterClient.onReady(() => {
			/**
			 * Adds listeners for an application quit, and for two other messages:
			 * 1. Listens for a response to the shutdownRequest, and
			 * 2. Listens for a "Hey I'm finished" on `Finsemble.serviceOffline`.
			 */
			Logger.system.debug("shutdownManager.setupShutdownListeners", activeServices);

			//When all services are down, the service manager will call attemptQuit, which either restarts or quits the application.
			FSBLDependencyManager.shutdown.waitFor({ services: activeServices }, this.shutdown.attemptQuit.bind(this.shutdown));
			RouterClient.addListener("Application.shutdown", this.shutdown.transmitShutdownRequest.bind(this.shutdown));
			RouterClient.addListener("Application.restart", this.shutdown.transmitRestartRequest.bind(this.shutdown));
		});
	}

	restart(err, response) {
		this.shutdown.transmitRestartRequest(err, response);
	}

	/**
	 * Checks config for a scheduledRestart property. If it isn't falsy, it will be an object of format:
	 * {
	 * hour: 16,
	 * minute:30,
	 * dialogTimeout:10000
	 * }
	 * If it exists, we set a timeout that will fire at that time.
	 */
	checkForScheduledRestart() {
		let scheduledRestart = null;
		//Handles
		let scheduleRestart = (err, cfg) => {
			console.log("Scheduling restart.", cfg);

			//If we already had a restart scheduled, clear it. There's a new sheriff in town.
			if (scheduledRestart) {
				clearTimeout(scheduledRestart);
			}
			//They may just disable the restart. If so, don't do anything.
			if (!cfg.value) return;
			let time = cfg.value;
			let timestamp: Date = new Date();
			timestamp.setHours(time.hour);
			timestamp.setMinutes(time.minute);

			//Difference between when the timer will fire and what the time is right now.
			//+timestamp converts the date object into a number, making typescript happy.
			let diff = +timestamp - Date.now();
			//If we start at noon but we're scheduled to restart at 6AM, set the timer to fire in 18 hours.
			let isTomorrow = false;

			//If the diff is negative or 0, the time has passed for today, so we set it for tomorrow and recalculate the diff.
			if (diff <= 0) {
				isTomorrow = true;
				timestamp.setDate(timestamp.getDate() + 1);
				diff = +timestamp - Date.now();
			}


			Logger.system.log(`APPLICATION LIFECYCLE:SCHEDULED RESTART FOR ${isTomorrow ? "TOMORROW" : "TODAY"}:`, cfg.value);
			scheduledRestart = setTimeout(() => {
				this.dialogManager.initialize(); // typically just used once so can initialize here
				DialogManager.onReady(() => {
					DialogManager.open("yesNo",
						{
							monitor: "primary",
							title: "Automatic Restart",
							question: "The application will restart in one minute. Your workspace will be saved.",
							showTimer: true,
							timerDuration: SCHEDULED_RESTART_TIMEOUT,
							showNegativeButton: false,
							affirmativeResponseLabel: "Restart Now"
						}, (err, response) => {
							if (response.choice === "cancel") {
								//This code will set the scheduled restart to what it's currently set in.
								//When the scheduled restart is set to a time that's in the past, the application will schedule the restart for the next day.
								ConfigClient.getValue({ field: "finsemble.scheduledRestart" }, (err, val) => {
									ConfigClient.setPreference({ field: "finsemble.scheduledRestart", value: val });
								});
							} else {
								//If we get here, they clicked "Restart Now", so we obey the user.
								this.restart(err, response);
							}
						});
				});
			}, diff);
		}

		//Once the preferences and storage service are up, we will see if the user has set a pref for a scheduled restart. Or the dev. The dev could set it too.
		// FSBLDependencyManager.startup.waitFor({
		// 	services: [
		// 		"preferencesService", "storageService"
		// 	]
		// }, () => {
		() => {
			ConfigClient.getValue({ field: "finsemble.scheduledRestart" }, (err, config) => {
				//Allow the timeout for the restart dialog to be driven by config. See checkForScheduledRestart comments for format.

				//If the dialogTimeout property exists and is a number, override our default.
				if (config && !isNaN(config.dialogTimeout)) {
					SCHEDULED_RESTART_TIMEOUT = config.dialogTimeout;
				}
				//create an object for the 2nd arg so that the scheduleRestart function doesn't have to change.
				scheduleRestart(err, { value: config });
			});

			//If the user changes it via the preferences API, we catch the change here, log it out, and schedule the restart.
			ConfigClient.addListener({ field: "finsemble.scheduledRestart" }, (err, config) => {
				if (config.value) {
					Logger.system.log("APPLICATION LIFECYCLE:SCHEDULED RESTART TIME CHANGED. NEW TIME:", config.value);
				} else {
					Logger.system.log("APPLICATION LIFECYCLE:SCHEDULED RESTART DISABLED.");
				}

				scheduleRestart(err, config);
			});
		};
	}
}