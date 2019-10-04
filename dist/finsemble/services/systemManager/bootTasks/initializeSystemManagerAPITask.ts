/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import * as Constants from "../../../common/constants";
import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";
import { BootTaskCallbackInterface } from "../_types";
import { BootEngine } from "../bootEngine";
import { SystemLog } from "../systemLog";
import { SYSLOG_CHANNEL } from "../_constants"

/**
 * Boot task that intializes the handlers for System Manaager API (see common/systemManagerClient)
 * @private
 */
export class InitializeSystemManagerAPITask {
	systemLog: SystemLog;
	bootEngine: BootEngine;

	constructor(params) {
		this.systemLog = params.systemLog;
		this.bootEngine = params.bootEngine;
	}

	public start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("initializeSystemManagerAPITask start");

		// API hook to output to the system log
		RouterClient.addListener(SYSLOG_CHANNEL, (err, message) => {
			if (message.data.params.error) {
				this.systemLog.error(message.data.params, message.data.logMessage);
			} else if (message.data.params.notification) {
				this.systemLog.notification(message.data.params, message.data.logMessage);
			} else {
				this.systemLog.log(message.data.params, message.data.logMessage);
			}
		});

		// API hook to programatically start a service.
		// Need to verify this is used. If so then add client interface to SystemManagerClient
		RouterClient.addListener(Constants.SERVICE_START_CHANNEL, (err, message) => {
			this.bootEngine.startService(<string>message.data.name);
		});

		doneCallback("initializeSystemManagerAPITask", "bootTasks", "completed")
	}

}
