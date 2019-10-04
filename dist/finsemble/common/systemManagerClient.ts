/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

// NOTE: SystemManagerClient is currently located in common but accessible on FSBL.  We have not decided yet whether or not to expose it like the other clients.

import RouterClient from "../clients/routerClientInstance";
import Logger from "../clients/logger";
import { BootDependencyType, BootStage } from "../services/systemManager/_types";
import { ALL_BOOT_STAGES } from "../services/systemManager/_types"
import { SYSLOG_CHANNEL, STAGE_CHANNEL, SHOW_SYSLOG_CHANNEL } from "../services/systemManager/_constants"
import { statusChannel, checkpointChannel} from "../services/systemManager/common";

export type StageWaitType = "stageEntered" | "stageCompleted" ;

/**
 * Singleton API to Finsemble System Manager
 */
class SystemManagerClient {

	/**
	 * Publishes boot status for the service or component (or boot task) being started.  This method is used internally in FSBL and baseService and not directly called.
	 * @param name the name of the service or component or module
	 * @param type the type category ("services" or "components")
	 * @param state the state ("completed" or "failed")
	 *
	 * @private
	 */
	public publishBootStatus(name: string, type: BootDependencyType, state: BootState) {
		console.log("publishStartingStatus", name, state);
		Logger.system.debug("publishBootStatus", name, type, state);
		RouterClient.publish(statusChannel(name), { name, type, state });
	};

	/**
	 * Waits for a specific boot stage
	 * @param stage the name of the service (e.g. "storageService")
	 * @param when wait until either "stageEntered" or "stageCompleted"
	 * @param= [callback]
	 * @returns a promise
	 *
	 * @example
	 *
	 * 	await SystemManagerClient.waitForBootStage("authentication", "stageCompleted");
	 *
	 * 	SystemManagerClient.waitForBootStage("authentication", "stageCompleted", () => {
	 *		RouterClient.publish(Constants.APPLICATION_STATE_CHANNEL, { state: "authenticated" });
	 * 	});
	 *
	 */
	public waitForBootStage(stage: BootStage, when:StageWaitType, callback = Function.prototype) {

		const waitForBootStageCompletionPromiseResolver = (resolve, reject) => {
			Logger.system.debug(`SystemManagerClient.waitForBootStage entry`, stage, when);
			let stageIndex = ALL_BOOT_STAGES.indexOf(stage);

			if (stage === "microkernel" && when === "stageEntered") {
				Logger.system.error("Cannot wait on `stageEntered` for microkernel because router isn't up yet. So will instead wait for microkernal stage complete.");
			}

			// receives startup state from services -- see SystemManagerClient.publishBootStatus
			let subscribeId = RouterClient.subscribe(STAGE_CHANNEL, (err, notify) => {
				Logger.system.debug("SystemManagerClient.waitForBootStage new stage", notify.data.stage, subscribeId);
				if (err) {
					Logger.system.error("SystemManagerClient.waitForBootStage subscribe error", err);
					callback(err);
					reject(err);
				} else if (stageIndex === -1) { // if illegal stage was input
					err = "illegal stage argument"
					callback(err);
					reject(err);
				} else {
					// note the following section handles cases where waitForBootStage might be invoked after the stage has been enter or passed
					let currentStageIndex = ALL_BOOT_STAGES.indexOf(notify.data.stage);

					// when the stage before completes (or anytime after) then done for "stageEntered"
					if (when === "stageEntered" && (currentStageIndex + 1) >= stageIndex) {
						Logger.system.debug("SystemManagerClient.waitForBootStage stageEntered", stage, subscribeId);
						callback();
						resolve();
						RouterClient.unsubscribe(subscribeId);
					// when current stage matches (or comes after) given stage, then done for "stageCompleted"
					} else if (when === "stageCompleted" && currentStageIndex >= stageIndex) {
							Logger.system.debug("SystemManagerClient.waitForBootStage completed", stage, subscribeId);
							callback();
							resolve();
							RouterClient.unsubscribe(subscribeId);
					}
				}
			});
		};

		return new Promise(waitForBootStageCompletionPromiseResolver);
	}

	/**
	 * Waits for a specific service (or component) to be started
	 * @param name the name of the service (e.g. "storageService")
	 * @param= [callback]
	 * @returns a promise
	 *
	 * @example
	 *
	 * 	await SystemManagerClient.waitForStartup("configService");
	 *
	 *	SystemManagerClient.waitForStartup("dataStoreService", () => {
	 *		RouterClient.publish(Constants.APPLICATION_STATE_CHANNEL, { state: "configuring" });
	 *	});
	 *
	 */
	public waitForStartup(name: String, callback = Function.prototype) {

		const waitForStartupStatePromiseResolver = (resolve, reject) => {
			Logger.system.debug(`SystemManagerClient.waitForStartup.${name}`, name);
			// receives startup state from services -- see SystemManagerClient.publishBootStatus
			let subscribeId = RouterClient.subscribe(statusChannel(name), (err, notify) => {
				Logger.system.debug("SystemManagerClient.waitForStartup subscribe", name, err, notify);
				if (err) {
					Logger.system.error("SystemManagerClient.waitForStartup subscribe error", err);
					callback(err);
					reject();
				} else {
					if (notify.data.name === name && notify.data.state === "completed") {
						Logger.system.debug("SystemManagerClient.waitForStartup completed", name);
						callback();
						resolve();
						RouterClient.unsubscribe(subscribeId);
					}
				}
			});

		};

		return new Promise(waitForStartupStatePromiseResolver);
	}

	/**
	 * Publishes a checkpoints status. This must be done for any checkpoint so the SystemManager will know if the checkpoint succeeded or not
	 * @param parent the name of the service or component containing the checkpoint (as defined in config)
	 * @param checkpointName tthe name of the checkpoint (as defined in config)
	 * @param state the state for the checkpoint, either "completed" or "failed"
	 *
	 * @example
	 *
	 * 	SystemManagerClient.publishCheckpointState("workspaceService", "importedLegacyWorkspaces", "completed");
	 *
	 */
	public publishCheckpointState(windowName: string, checkpointName:string, state: BootState) {
		console.log("publishCheckpoint", windowName, checkpointName, state, checkpointChannel(windowName, checkpointName));
		Logger.system.debug("publishCheckpoint", windowName, checkpointName, state, checkpointChannel(windowName, checkpointName));
		RouterClient.publish(checkpointChannel(windowName, checkpointName), { windowName, checkpointName, state });
	};


	/**
	 * Shows System Log window and bring its to front.
	 */
	public showSystemLog() {
		Logger.system.debug("SystemManagerClient.showSystemLog");
		RouterClient.transmit(SHOW_SYSLOG_CHANNEL, true);
	}

	/**
	 * Displays message on the system log
	 * @param params gnenerally this is TBD until real system log is written
	 * @param params.error if true then the log message is an error
	 * @param params.notification if true then the log message is a notification
	 * @param message the message string to log
	 *
	 * @example
	 *
	 * 	SystemManagerClient.systemLog({ error: true}, errorMsg);
	 *  SystemManagerClient.systemLog({ notification: true }, "Notification: " + message);
	 *
	 */
	public systemLog(params, logMessage) {
		Logger.system.debug("SystemManagerClient.systemLog", params, logMessage);
		RouterClient.transmit(SYSLOG_CHANNEL, { params, logMessage });
	}
}

var systemManagerClient = new SystemManagerClient();

export default systemManagerClient;