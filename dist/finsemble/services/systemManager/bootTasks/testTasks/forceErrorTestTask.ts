// for testing only -- forces a task error

import { BootTaskCallbackInterface } from "../../_types";

/**
 * Boot task for testing "failed" callback.  Disabled in bootTasks config by default.
 *
 * Here the boot task callback returns a "failed" response.
 *
 * @private
 */
export class ForceErrorTestTask {
	public start(doneCallback: BootTaskCallbackInterface) {
		doneCallback("forceErrorTestTask", "bootTasks", "failed"); // publishes failure
	}
}
