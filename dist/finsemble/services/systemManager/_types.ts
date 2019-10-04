
export type BootDependencyType = "bootTasks" | "services" | "components" | "checkpoints";
export type BootStage = "microkernel" | "kernel" | "authentication" | "preuser" | "earlyuser" | "user";
export type BootDependencyState = "uninitialized" | "disabled" | "blockedByDisabled" | "failed" | "blockedByFailure" | "waitingOnDependencies" | "readyToStart" | "starting" | "completed";

export const ALL_BOOT_STAGES:BootStage[] = [ "microkernel" , "kernel" , "authentication" , "preuser" , "earlyuser" , "user"];

/**
 * Boot config element used to build a node in a dependency tree
 */
export class BootConfigElement {
	name: string; // the name of this element (e.g. task name, service name)
	type: BootDependencyType; // the type (e.g. "tasks", "services")
	stage: BootStage; // the state this element should be started in
	dependencies: string[]; // the child dependencies for this element
	stopOnFailure: boolean; // if true then stop the boot stage if this element has a start error
	autoStart: boolean; // only start this element if true; otherwise ignore this element
	customFailureMessage: string; // customer error message to log if error
	timeout: number; // timeout value in millisecond to wait on starting
	originalConfig: any; // the orignal config data used to build this element
	checkpointsIncluded: boolean; // if true then checkpoints are enabled
	checkpointConfig: any; // checkpoint config for when checkpoints are enabled
	postStartupCompletion: boolean; // only used for checkpoints -- if true then checkpoint exists after parent is "completed"
}

/**
 * Represents a ready node (i.e. all that's need to start the corresponding task/service/component)
 */
export class BootReadyItem {
	name: string; // the name of the item to start (i.e. task name, service name, component name)
	type: BootDependencyType;  // the type of the item (e.g. "tasks", "services")
	config: BootConfigElement; // the orignal boot-config element
	constructor(name, type, config) {
		this.name = name;
		this.type = type;
		this.config = config;
	}
}

/**
 * Boot task callback interface
 */
export interface BootTaskCallbackInterface {
	(taskName: string, type:BootDependencyType, state:BootDependencyState): void;
}
