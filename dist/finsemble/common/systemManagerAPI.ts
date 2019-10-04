/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

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
class SystemManagerAPI {

	/**
	 * Publishes boot status for service or component being completed
	 * @param name the name of the service or component or module
	 * @param type the type category ("services" or "components")
	 * @param state the state ("completed" or "failed")
	 */
	public publishBootStatus(name: string, type: BootDependencyType, state: BootState) {
		console.log("publishStartingStatus", name, state);
		Logger.system.debug("publishBootStatus", name, type, state);
		RouterClient.publish(statusChannel(name), { name, type, state });
	};

	/**
	 * Waits for a specific boot stage
	 * @param stage the name of the service (e.g. "storageService")
	 * @param= [callback]
	 * @returns a promise
	 */
	public waitForBootStage(stage: BootStage, when:StageWaitType, callback = Function.prototype) {

		const waitForBootStageCompletionPromiseResolver = (resolve, reject) => {
			Logger.system.debug(`SystemManagerAPI.waitForBootStage entry`, stage, when);
			let stageIndex = ALL_BOOT_STAGES.indexOf(stage);

			if (stage === "microkernel" && when === "stageEntered") {
				Logger.system.error("Cannot wait on `stageEntered` for microkernel because router isn't up yet. So will instead wait for microkernal stage complete.");
			}

			// receives startup state from services -- see SystemManagerAPI.publishBootStatus
			let subscribeId = RouterClient.subscribe(STAGE_CHANNEL, (err, notify) => {
				Logger.system.debug("SystemManagerAPI.waitForBootStage new stage", notify.data.stage, subscribeId);
				if (err) {
					Logger.system.error("SystemManagerAPI.waitForBootStage subscribe error", err);
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
						Logger.system.debug("SystemManagerAPI.waitForBootStage stageEntered", stage, subscribeId);
						callback();
						resolve();
						RouterClient.unsubscribe(subscribeId);
					// when current stage matches (or comes after) given stage, then done for "stageCompleted"
					} else if (when === "stageCompleted" && currentStageIndex >= stageIndex) {
							Logger.system.debug("SystemManagerAPI.waitForBootStage completed", stage, subscribeId);
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
	 */
	public waitForStartup(name: String, callback = Function.prototype) {

		const waitForStartupStatePromiseResolver = (resolve, reject) => {
			Logger.system.debug(`SystemManagerAPI.waitForStartup.${name}`, name);
			// receives startup state from services -- see SystemManagerAPI.publishBootStatus
			let subscribeId = RouterClient.subscribe(statusChannel(name), (err, notify) => {
				Logger.system.debug("SystemManagerAPI.waitForStartup subscribe", name, err, notify);
				if (err) {
					Logger.system.error("SystemManagerAPI.waitForStartup subscribe error", err);
					callback(err);
					reject();
				} else {
					if (notify.data.name === name && notify.data.state === "completed") {
						Logger.system.debug("SystemManagerAPI.waitForStartup completed", name);
						callback();
						resolve();
						RouterClient.unsubscribe(subscribeId);
					}
				}
			});

		};

		return new Promise(waitForStartupStatePromiseResolver);
	}

	public publishCheckpointState(windowName: string, checkpointName:string, state: BootState) {
		console.log("publishCheckpoint", windowName, checkpointName, state, checkpointChannel(windowName, checkpointName));
		Logger.system.debug("publishCheckpoint", windowName, checkpointName, state, checkpointChannel(windowName, checkpointName));
		RouterClient.publish(checkpointChannel(windowName, checkpointName), { windowName, checkpointName, state });
	};


	/**
	 * Shows System Log and bring its window to front.
	 */
	public showSystemLog() {
		Logger.system.debug("SystemManagerAPI.showSystemLog");
		RouterClient.transmit(SHOW_SYSLOG_CHANNEL, true);
	}

	/**
	 * Displays message on the system log
	 * @param params gnenerally this is TBD until real system log is written
	 * @param params.error if true then log message is an error
	 * @param message the message to log
	 */
	public systemLog(params, logMessage) {
		Logger.system.debug("SystemManagerAPI.systemLog", params, logMessage);
		RouterClient.transmit(SYSLOG_CHANNEL, { params, logMessage });
	}
}

var systemManagerAPI = new SystemManagerAPI();

export default systemManagerAPI;