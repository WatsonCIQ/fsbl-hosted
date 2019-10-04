/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import Logger from "../../../clients/logger";
import { BootTaskCallbackInterface } from "../_types";

/**
 * Boot task that starts the logger sending to the central console.
 * Although loggerClient will automatically wait for LoggerService, this task runs after loggerService is ready to prevent warning messages is SystemManager during startup.
 * @private
 */
export class StartLoggerTask {
	public start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("startLoggerTask start");
		Logger.start();
		doneCallback("startLoggerTask", "bootTasks", "completed")
	}
}
