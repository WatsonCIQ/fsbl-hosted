/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Overview in Real Time Board
// https://realtimeboard.com/welcomeonboard/dqbvK59KjETgD8Yc2VmW4BSpCieLXc4jfwmFMkgFTVRqLba0sCDFO2H3PHlGCpqi
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


import Logger from "../../clients/logger";
import RouterClient from "../../clients/routerClientInstance";
import { BootStage, BootDependencyType, BootConfigElement, BootReadyItem, BootDependencyState } from "./_types";
import { BootDependencyGraph, DGGraphStatus, DGDiagnostics } from "./bootDependencyGraph";
import SystemLog from "./systemLog";
import * as Util from "../../common/util";
import { checkpointChannel } from "./common";

const PROCESS_STATUS_COUNTER_MAX = 500;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Exported Supporting Classes /////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The data returned by BootCheckpointEngine.getResults().
 */
export class BootCheckpointResults {
	okay: boolean; // true if no error
	errorDiag: DGDiagnostics; // if error, then contains diagnostic data
	constructor(okay, errorDiag = new DGDiagnostics()) {
		this.okay = okay;
		this.errorDiag = errorDiag;
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main Class: BootCheckpointEngine ////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The checkpoint engine manages checkpoints for one startup dependency (a boot task, service, or component).
 * Checkspoints are "informational only" -- their purpose is to help diagnose startup problems.
 *
 * When a startup dependency is completed in the bootEngine, the bootengine invokes getResults() for the corresponding checkpointEngine --
 * these checkpoint results are used to report the ovrtsll checkpoint status, with any errors written to the SystemLog. Note, a dependency will only be assigned
 * a checkpoint engine if there are checkpoints defined for it in the boot config.
 *
 * Checkpoints provide more accurate diagnostic data if there's a startup failure.  For example, if startup fails before independent checkpoints A, B, and C
 * are reached, then all three checkpoints will report failures.  However by using checkpoint dependencies, if B depends on A, and C depends on B,
 * then only checkpoint A will be active and report any failure, helping to more precisely pinpoint where the problem occurred without having
 * detailed knownledge of the code.
 *
 * Note the structure of the BootCheckpointEngine is roughly the same as the structure of the BootEngine.
 *
 */
export class BootCheckpointEngine {
	parentName: string; // name of the dependency on which checkpoints are being processed (e.g. service name)
	currentStage: BootStage; // current boot stage -- the one being activitely "processed"
	dependencyGraph: BootDependencyGraph; // each stage's dependency graph saved here by stage -- see Note above
	checkpointTimers: { [property in string]?: any } = {}; // each time a checkpiont is started, it's "timeout" timer is saved here by checkpoint name
	originalConfig: any; // contains original checkpoint config
	checkpointConfig: any; // contains processed checkpoint config
	processStatusCounter: number = 0; // counter to insure never in an infinite loop processing a dependency graph
	activeServices: string[] = []; // list of all active/started services
	currentStatus: DGGraphStatus; // most recent status returned from dependency graph
	defaultTimeoutInterval: number; // default value for how long to wait on checkpoints

	/**
	 * Creates an instance of boot checkpoint engine.
	 * @param parentName parent's name for diagnostics (e.g. service name for which the checkpoints are defined)
	 * @param stage current boot stage for diagnostics
	 * @param defaultTimeoutInterval the default timeout value for the checkpoint if timeout value not defined in checkpoints config
	 * @param originalConfig the checkpoint config from the parent's bootConfig.checkpoints
	 */
	constructor(parentName: string, stage: BootStage, defaultTimeoutInterval: number, originalConfig: any) { //TBD DEFINE CHECKPOINT CONFIG ----------
		this.parentName = parentName;
		this.currentStage = stage;
		this.defaultTimeoutInterval = defaultTimeoutInterval;
		this.originalConfig = originalConfig;
		this.genericHandlerForStateChange = this.genericHandlerForStateChange.bind(this);
		this.run();
	}

	/**
	 * Gets results of this checkpoint engine.  Called when the parent dependency is finished, either because it successfully started or had an error
	 * @param parentState the current state of the parent so will know whether to log certain checkpoint errors
	 * @returns overall checkpoint results -- note if a checkpoint has postStartupCompletion option set, then it might report to SystemLog after getResults is called
	 */
	public getResults(parentState: BootDependencyState): BootCheckpointResults {
		Logger.system.debug("bootCheckpointEngine.getResults", this.currentStatus, this.checkpointTimers, this.checkpointConfig);
		let results: BootCheckpointResults =  new BootCheckpointResults(true); // default to no errors
		let incompleteCheckpoints: string[] = [];

		// if the dependency graph is in an error state, then return the correspond diagnostic data
		if (this.currentStatus.graphState === "error") {
			results = new BootCheckpointResults(false, this.currentStatus.errorDiag);
		}

		// handle outstanding checkpoints
		for (let checkpointName in this.checkpointTimers) {
			// checkpoints are only "incomplete" when getResults is called if they aren't configured to finish after the dependency is started;
			// below findConfigElement will always return a value, so no error check
			if (!this.findConfigElement(checkpointName).postStartupCompletion) {
				incompleteCheckpoints.push(`checkpoint ${checkpointName} for ${this.parentName} did not complete`);
				// since reporting status aready on incomplete checkpoint, clear its corresponding time since no longer needed
				clearTimeout(this.checkpointTimers[checkpointName]);
			// if already a failure at parent level, go ahead and clear postStartupCompletion checkpoints too so won't clutter up log later
			} else if (parentState === "failed") {
				clearTimeout(this.checkpointTimers[checkpointName]);
			}
		}

		if (incompleteCheckpoints.length > 0) {
			// if already have errors, then add to them
			if (!results.okay) {
				results.errorDiag.errorData.push(...incompleteCheckpoints);
			} else {
				let checkpointDiag = new DGDiagnostics(null, incompleteCheckpoints);
				results = new BootCheckpointResults(false, checkpointDiag);
			}
		}

		return results;
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// The remaining methods are private
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Finds config element and returns its value (or null if not found)
	 * @param name of checkpoint
	 * @returns
	 */
	private findConfigElement(name) {
		let index = this.checkpointConfig.findIndex((element) => {
			return element.name === name;
		});
		return this.checkpointConfig[index];
	}

	/**
	 * Runs checkpoint engine.  Status and diagnotics will go to the System Log.
	 *
	 * Starting a checkpoint when its ready simply means making the checkpoint active, which primarily means waiting for a dependency to
	 * signal that the checkpoint was reached (i.e. successful), or timing out if not reached.
	 *
	 * Here's the general flow:
	 * 1) a new dependeny graph (for checkpoints) is created and any initial errors and ready-to-start checkpoints are handled
	 * 2) as checkpoints/dependencies communicate back, genericHandlerForStateChange is triggered
	 * 3) setBootDependencyState is then called for the checkpoint to update its state in the dependency graph
	 * 4) as checkpoint states in the dependeny tree's are changed to completed, other checkpoints become ready to start (see readyToStartList),
	 * 	  then those checkpoints are started (which then triggers other state changes and so on)
	 * 5) when the dependency graph is finished (either because all checkpoints are successful/started or an error occurred), then the graph's stage is marked "finished"
	 *
	 */
	private run() {
		try {
			this.checkpointConfig = this.getCheckpointConfig(this.originalConfig);

			this.dependencyGraph = new BootDependencyGraph(this.parentName, this.checkpointConfig);
			Logger.system.log("forceObjectsToLogger", "checkpoint BootDependencyGraph.run", this.currentStage, this.checkpointConfig, this.dependencyGraph);
			console.log("checkpoint BootDependencyGraph.run", this.currentStage, this.checkpointConfig, this.dependencyGraph);

			// kicks off processing the dependency graph -- will continue until done (i.e. graph state is "finished" or "error")
			this.processWhatIsReady(this.dependencyGraph);
		} catch (error) {
			// even though terminating, remove outstanding timers so they won't throw errors and clutter system log
			this.cleanupStagesOutStandingTimers();
			SystemLog.error({}, `"checkpointEngine: ${error}`);
		}
	}


	/**
	 * Cleanup outstanding checkpoint timers -- outstanding timers are only left if premature error is thrown
	 */
	private cleanupStagesOutStandingTimers() {
		Object.keys(this.checkpointTimers).forEach(checkpointName => {
			clearTimeout(this.checkpointTimers[checkpointName]);
			delete this.checkpointTimers[checkpointName]
		});
	}

	/**
	 * Returns an initialized boot config element for a checkpoint (the returned values are based on config data and documented defaults).
	 * Data validation is also done here.
	 *
	 * Note the format of config elements are the same for both bootEngine dependencies and checkpoint dependencies -- both pass in config elements to corresponding dependeny graph
	 *
	 * @param name the checkpoint name
	 * @param originalCheckpointConfig the config data for one checkpoint (e.g. finsemble.services.workspaceService.bootParams.checkpoints.getEssentialConfig)
	 * @returns initialized boot-config element for one checkpoint
	 */
	private getCheckpoingConfigElement(name: string, originalCheckpointConfig): BootConfigElement {
		let	configClone = Util.clone(originalCheckpointConfig); // clone so won't modify the original config

		let newConfigElement: BootConfigElement = new BootConfigElement();
		newConfigElement.name = name;
		newConfigElement.type = "checkpoints";
		newConfigElement.stage = this.currentStage;

		// assign the rest of the values -- use defaults if config doesn't have specific value
		newConfigElement.dependencies = configClone.dependencies || [];
		newConfigElement.postStartupCompletion = configClone.postStartupCompletion || false;
		newConfigElement.stopOnFailure = true;
		newConfigElement.autoStart = true;
		newConfigElement.customFailureMessage = configClone.customFailureMessage || "";;
		newConfigElement.originalConfig = configClone;
		newConfigElement.timeout = configClone.timeout || this.defaultTimeoutInterval;

		if (!Array.isArray(newConfigElement.dependencies)) {
			SystemLog.error({ leadingBlankLine: false }, `Checkpoint CONFIG: dependencies for ${name} must be an array`);
			newConfigElement.dependencies = [ "" ];
		}

		return newConfigElement;
	}

	/**
	 * Returns an array checkpoint config elements -- one for each checkpoint
	 * @param checkpointConfig the config data for all the checkpoints (e.g. finsemble.services.workspaceService.bootParams.checkpoints)
	 * @returns array of checkpoint conig elements
	 */
	private getCheckpointConfig(checkpointConfig: object):BootConfigElement[] {
		let cumulativeBootConfig:BootConfigElement[] = []; // for each stage start with a clear array of boot-config elements

		for (var property in checkpointConfig) {
			let newConfigElement: BootConfigElement = this.getCheckpoingConfigElement(property, checkpointConfig[property]);
			cumulativeBootConfig.push(newConfigElement);
		}
		return cumulativeBootConfig;
	}

	/**
	 * Subscribes to checkpoint status
	 * @param parentName parent name (e.g. service name)
	 * @param checkpointName checkpoint name
	 */
	private subscribeToCheckpointStatus(parentName, checkpointName): void {
		Logger.system.debug("checkpointEngine subscribe", parentName, checkpointName, checkpointChannel(parentName, checkpointName));
		// receives startup state from services -- see SystemManagerClient.publishBootStatus.  Router is known to be ready before this is called.
		RouterClient.subscribe(checkpointChannel(parentName, checkpointName), (err, notify) => {
			if (err) {
					Logger.system.error("checkpointEngine subscribe error", err);
			} else {
				Logger.system.debug("checkpointEngine.notification", this.parentName, notify.data.checkpointName, notify.data.state, notify.data.params);
				this.genericHandlerForStateChange(notify.data.checkpointName, notify.data.state, notify.data.params)
			}
		});
	}

	/**
	 * Generic handler for state changes of dependencies
	 * @param checkpointName a checkpoint name
	 * @param state state of the checkpoint (e.g. "completed", "failed")
	 * @param [params] optional control parameters
	 * @param params.timedOut if true the state value is due to a timeout (used for more accurate logging)
	 */
	private genericHandlerForStateChange(checkpointName: string, state: BootDependencyState, params: any = {}): void {
		Logger.system.debug("checkpointEngine.genericHandlerForStateChange", this.parentName, checkpointName, state, params);
		if (this.checkpointTimers[checkpointName]) { // if timeout never fired, then stop timer and cleanup
			clearTimeout(this.checkpointTimers[checkpointName]);
			delete this.checkpointTimers[checkpointName];
		}

		// if changing to a final state, log as needed, then update dependency graph with the new state and continue processing
		if (state === "completed") {
			// Might not log for now.  Can decide later when real system log is available whether or not to log successful checkpoints.
			// SystemLog.log({ doubleIndent: true }, `checkpoint ${checkpointName} for ${this.parentName} completed.`);
			this.dependencyGraph.setBootDependencyState(checkpointName, state);
			this.processWhatIsReady(this.dependencyGraph);

		} else if (state === "failed") {
			if (params.timedOut) {
				SystemLog.warn({ indent: true }, `checkpoint ${checkpointName} for ${this.parentName} timed out.  ${this.findConfigElement(checkpointName).customFailureMessage}`);
			} else {
				SystemLog.warn({ indent: true }, `checkpoint ${checkpointName} for ${this.parentName} failed.  ${this.findConfigElement(checkpointName).customFailureMessage}`);
			}
			this.dependencyGraph.setBootDependencyState(checkpointName, state);
			this.processWhatIsReady(this.dependencyGraph);
		}
    }

	/**
	 * Handles error timeout for a started checkpoint (i.e. no response was received)
	 * @param checkpointName the checkpoint that timed out
	 */
	private handleStartTimeout(checkpointName): void {
		// first remove from active list of timers
		delete this.checkpointTimers[checkpointName];
		this.genericHandlerForStateChange(checkpointName, "failed", { timedOut: true });
	}

	/**
	 * Starts a checkpoint handler
	 * @param listItem contains info on checkpoint to start
	 */
	private startReadyCheckpoint(readyItem: BootReadyItem) {
		this.checkpointTimers[readyItem.name] = setTimeout(() => {
			this.handleStartTimeout(readyItem.name);
		}, readyItem.config.timeout);
		this.subscribeToCheckpointStatus(this.parentName, readyItem.name);
		Logger.system.debug(`checkpointEngine.processReadyList starting checkpoint ${readyItem.name} in ${this.currentStage}`, readyItem);
	}

	/**
	 * Sets state in dependency tree for a list of dependencies.  Note changing these states affects the status of the dependency tree
	 * @param readyList list of checkpoints
	 * @param newState new state to set the checkpoint to
	 */
	private setStateForList(readyList: BootReadyItem[], newState: BootDependencyState) {
		for (let i = 0; i < readyList.length; i++) {
			let listItem:BootReadyItem = readyList[i];
			this.dependencyGraph.setBootDependencyState(listItem.name, newState);
		}
	}

	/**
	 * Process the ready list (i.e. what's ready to start) -- the ready list is always returned in the status of the dependeny tree
	 * @param readyList a ready list of checkpoints to start
	 */
	private processReadyList(readyList: BootReadyItem[]) {
		Logger.system.debug("checkpointEngine.processReadyList", readyList);

		// change state in readyList from "readyToStart" to "starting"; have to do this upfront to avoid potential asynchronous issues with genericHandlerForStateChange
		this.setStateForList(readyList, "starting");

		for (let i = 0; i < readyList.length; i++) {
			let listItem:BootReadyItem = readyList[i];
			this.startReadyCheckpoint(listItem);
		}
    }

	/**
	 * Process the dependency tree, which typically means getting its latest status then starting all the depenencies that are ready.
	 * However, if the status indicates the graph is finished (typically meaning everything has started) then accept this stage's promise -- the stage is complete.
	 * Or if the status indicates an error occurred, then reject this stages promise (ending this stage)
	 * @param graph the current stages dependency graph
	 */
	private processWhatIsReady(graph: BootDependencyGraph): void {
		this.currentStatus = graph.getCurrentStatus();
		Logger.system.debug("checkpointEngine processWhatIsReady", status, graph);
		console.log("processWhatIsReady", status);
		// this should never happen, but prevents bad checkpointEngine handlers from getting in an infinite loop
		if (++this.processStatusCounter > PROCESS_STATUS_COUNTER_MAX) {
			Logger.system.error("checkpointEngine.processWhatIsReady is in infinite loop -- breaking out", this.processStatusCounter);
		} else {
			switch (this.currentStatus.graphState) {
				case "error":
					// don't error out here (like in bootEngine); leave the errors in place until they are reported/processed in getResults.
					break;
				case "notFinished":
					this.processReadyList(this.currentStatus.readyToStartList);
					break;
				case "finished":
					break;
			}
		}
	}

}