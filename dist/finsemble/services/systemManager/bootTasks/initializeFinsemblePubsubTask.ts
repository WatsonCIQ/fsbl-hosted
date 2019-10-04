/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import Logger from "../../../clients/logger";
import { BootTaskCallbackInterface } from "../_types";
import RouterClient from "../../../clients/routerClientInstance";

/**
 * Boot task that sets up the "Finsemble" wildcard pubsub for use throughout Finsemble.
 * @private
 */
export class InitializeFinsemblePubsubTask {
	public start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("initializeFinsemblePubsubTask start");
		RouterClient.addPubSubResponder(/.*Finsemble.*/, {});
		doneCallback("initializeFinsemblePubsubTask", "bootTasks", "completed")
	}
}
