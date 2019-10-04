// contains common functions -- used in multiple places in the system manager

import { System } from "../../common/system";
import { STATUS_CHANNEL_BASE, CHECKPOINT_CHANNEL_BASE } from "../../services/systemManager/_constants"

/**
 * Kills old applications -- used at the beginning of start
 * @param finUUID
 * @returns
 */
export function killOldApplications(finUUID) {
	const promiseResolver = async (resolve) => {
		System.getAllApplications(async (applications) => {
			if (applications) {
				for (let i = 0; i < applications.length; i++) {
					let a = applications[i];
					if (a.uuid.endsWith("-" + finUUID)) {
						let application = System.Application.wrap(a.uuid);
						await System.closeApplication(application);
					}
				}
			}
			console.log("killOldApplications: finished closing old apps");
			resolve();
		});
	}
	return new Promise(promiseResolver);
}

/**
 * Function to return the name of a startup status channel, given the window name
 * @param name
 * @returns
 */
export function statusChannel(name) {
	return `${STATUS_CHANNEL_BASE}.${name}`
}


/**
 * Function to return the name of a checkpoint status channel, given the parent name (e.g. service name, component name) and the checkpoint name
 * @param parentName
 * @param checkpointName
 * @returns
 */
export function checkpointChannel(parentName, checkpointName) {
	return `${CHECKPOINT_CHANNEL_BASE}.${parentName}.${checkpointName}`
}
