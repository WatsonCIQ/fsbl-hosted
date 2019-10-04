/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";
import { BootTaskCallbackInterface } from "../_types";
import { APPLICATION_STATE_CHANNEL } from "../../../common/constants";

/**
 * Boot task that waits until system is authenticated
 * @private
 */
export class WaitForAuthenticatedTask {
	public start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("waitForAuthenticatedTask start");

		RouterClient.addPubSubResponder("Authorization", {});

		let authorizationSubscriber =RouterClient.subscribe("Authorization", function (err) {
			if (!err) {
				RouterClient.unsubscribe(authorizationSubscriber);
				doneCallback("waitForAuthenticatedTask", "bootTasks", "completed")
			}
		});
	}
}