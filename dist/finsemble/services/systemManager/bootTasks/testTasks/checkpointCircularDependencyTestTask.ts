// for testing only -- forces a task error

import { BootTaskCallbackInterface } from "../../_types";
import SystemManagerClient from "../../../../common/systemManagerClient";

const TASK_NAME = "checkpointCircularDependencyTestTask";
/**
 * Boot task for testing checkpoint errors.  Disabled in bootTasks config by default.
 *
 * This test should be ran after stage "microkernel" since publishCheckpointState depends on router.
 *
 * See bootTasks config, which has a circular dependency on these checkpoints.
 *
 * @private
 */
export class CheckpointCircularDependencyTestTask {
	public start(doneCallback: BootTaskCallbackInterface) {
		SystemManagerClient.publishCheckpointState(TASK_NAME, "checkpoint1", "completed");
		SystemManagerClient.publishCheckpointState(TASK_NAME, "checkpoint2", "completed");
		SystemManagerClient.publishCheckpointState(TASK_NAME, "checkpoint3", "completed");
		SystemManagerClient.publishCheckpointState(TASK_NAME, "checkpoint4", "completed");
		SystemManagerClient.publishCheckpointState(TASK_NAME, "checkpoint5", "completed");
		SystemManagerClient.publishCheckpointState(TASK_NAME, "checkpoint6", "completed");
		SystemManagerClient.publishCheckpointState(TASK_NAME, "checkpoint7", "completed");
		SystemManagerClient.publishCheckpointState(TASK_NAME, "checkpoint8", "completed");

		// Typically, boot tasks would not contain checkpoints, but added here for testing convenience.
		// However, since tasks directly return to SystemManager, need to delay doneCallback so publishCheckpointState can make there way through the router
		setTimeout(() => {
			doneCallback(TASK_NAME, "bootTasks", "completed")
		}, 2000);
	}
}
