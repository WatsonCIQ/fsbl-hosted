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
import ConfigClient from "../../clients/configClient";
import LauncherClient from "../../clients/launcherClient";
import { ConfigUtilInstance as ConfigUtil } from "../../common/configUtil";
import { BootStage, BootDependencyType, BootConfigElement, BootReadyItem, BootDependencyState, BootTaskCallbackInterface } from "./_types";
import { BootCheckpointEngine, BootCheckpointResults } from "./bootCheckpointEngine";
import { BootDependencyGraph, DGGraphStatus, DGDiagnostics } from "./bootDependencyGraph";
import { ServiceLauncher } from "./serviceLauncher";
import SplinterAgentPool from "../window/Splintering/SplinterAgentPool";
import { ShutdownManager } from "./shutDownManager";
import SystemLog from "./systemLog";
import * as Util from "../../common/util";
import { ALL_BOOT_STAGES, CRITICAL_BOOT_STAGES, STATUS_CHANNEL_BASE, STAGE_CHANNEL, CHECKPOINT_CHANNEL_BASE } from "./_constants"
import { statusChannel } from "./common";

const ALL_BOOT_DEPENDENCY_TYPES:BootDependencyType[] = [ "bootTasks", "services", "components" ];
const PROCESS_STATUS_COUNTER_MAX = 500;
const DEFAULT_STARTUP_TIMEOUT = 15000;
const UNITIALIZED_BOOT_STATE = { name: "", state: "uninitialized" };
const WAIT_FOR_LAST_CHECKPOINT_DELAY = 50;


/**
 * The boot engine brings up Finsemble in an orderly way considering dependencies, all based on the "bootConfig" defined in tasks, services, and components.
 *
 * Side Note: For explanation of TypeScript's mapped types in index signatures, seach for "mapped types" in https://basarat.gitbooks.io/typescript/docs/types/index-signatures.html.
 */
export class BootEngine {
	startServiceTimeout: number; // millisecond timeout value for starting a service
	startComponentTimeout: number; // millisecond timeout value for starting a comp0nent
	startTaskTimeout: number; // millisecond timeout value for starting a task
	currentStage: BootStage; // current boot stage -- the one being activitely "processed"
	dependencyGraphs: { [property in BootStage]?: BootDependencyGraph } = {}; // each stage's dependency graph saved here by stage -- see Note above
	bootConfigs: { [property in BootStage]?: BootConfigElement[] } = {}; // contains each stages complete boot config
	cumulativePreviousBootConfig: BootConfigElement[] = []; // boot config for all previous stages
	stageResolver: Function; // for saving Promise.resolve
	stageRejecter: Function; // for saving Promise.reject
	startTimers: { [property in string]?: any } = {}; // each time a dependency is started, it's "timeout" timer is saved here by dependency name
	registeredTasks: { [property in string]?: Function } = {}; // contains all known registered tasks
	manifest: any; // contains orignal system manifest
	finsembleConfig: any; // contains finsemble config (will be updated with latest as needed)
	serviceLauncher: ServiceLauncher; // instance of service launcher
	processStatusCounter: number = 0; // counter to insure never in an infinite loop processing a dependency graph
	splinterAgentPool: SplinterAgentPool; // hold an instance of splinter agent to use when creating new services
	shutdownManager: ShutdownManager; // holds shutdown manager passed in on constructor
	processingTerminiated: Boolean = false; // indicates bootEngine has terminated -- used to stop system log output for late responses after terminating on error...to avoid clutter
	activeServices: string[] = []; // list of all active/started services
	checkpointEngines: { [property in string]: BootCheckpointEngine } = {}; // each dependency with checkpoints will have its own checkpoint engine

	/**
	 * Creates an instance of boot engine.
	 * @param finsembleConfig
	 */
	constructor(manifest, serviceLauncher: ServiceLauncher, shutdownManager: ShutdownManager) {
		this.manifest = manifest;
		this.finsembleConfig = manifest.finsemble;
		this.serviceLauncher = serviceLauncher;
		this.shutdownManager = shutdownManager
		this.handleTaskResponse = this.handleTaskResponse.bind(this);
		this.genericHandlerForStateChange = this.genericHandlerForStateChange.bind(this);
		this.startServiceTimeout = ConfigUtil.getDefault(this.finsembleConfig, "finsembleConfig.bootConfig.defaults.startServiceTimeout", DEFAULT_STARTUP_TIMEOUT);
		this.startComponentTimeout = ConfigUtil.getDefault(this.finsembleConfig, "finsembleConfig.bootConfig.defaults.startComponentTimeout", DEFAULT_STARTUP_TIMEOUT);
		this.startTaskTimeout = ConfigUtil.getDefault(this.finsembleConfig, "finsembleConfig.bootConfig.defaults.startTaskTimeout", DEFAULT_STARTUP_TIMEOUT);
		this.setupDependencyBootStatusPubSubs();
	}

	/**
	 * Displays bootEngine's diagnostic data
	 */
	public helpData() {
		console.log("2) finsemble.bootConfig timeout values");
		console.log("\tstartServiceTimeout value", this.startServiceTimeout);
		console.log("\tstartComponentTimeout value", this.startComponentTimeout);
		console.log("\tstartTaskTimeout value", this.startTaskTimeout);
		console.log("");
		console.log("3) Current boot stage:", this.currentStage);
		console.log("");
		console.log(`4) Lastest/current status of dependencyGraph for ${this.currentStage} stage`, this.dependencyGraphs[this.currentStage].getCurrentStatus());
		console.log("");
		console.log("5) Dependency graphs by stage", this.dependencyGraphs);
		console.log("");
		console.log("6) Boot config data by stage", this.bootConfigs);
		console.log("");
		console.log("7) Active Checkpoint Engines",this.checkpointEngines)
		console.log("");
		console.log("8) Registered tasks", this.registeredTasks);
		console.log("");
		console.log("9) List of outstanding start timers", this.startTimers);
		console.log("");
		console.log("10) Dependency graphs display by stage");
		this.outputDependencyGraphs(this.dependencyGraphs);
		console.log("");
	}

	/**
	 * Registers one boot task with the bootEngine. All tasks dependencies must have corresponding task registrations. In other words, the only way
	 * the bootEngine knows about a startup task is if it's been registered.
	 * @param taskName
	 * @param taskFunction
	 */
	public registerBootTask(taskName: string, taskFunction: Function) {
		if (typeof taskName === 'string' && typeof taskFunction === "function" ) {
			this.registeredTasks[taskName] = taskFunction; // save the task function to be invoked when its becomes "readyToStart"
		} else {
			SystemLog.error({}, `BootEngine: registerBootTask failed because of illegal input.  Task Name = ${taskName}. Task Function Type = ${typeof taskFunction}`);
		}
	}

	/**
	 * Initializes splinter agent pool task used to create services. Typically bootTasks are independent and defined in bootTasks,
	 * but this one is coupled to bootEngine so defined locally so can make use of object variables.
	 *
	 * @param doneCallback
	 */
	public initializeSplinterAgentPoolTask(doneCallback: BootTaskCallbackInterface) {
		Logger.system.log("FINSEMBLE CONFIG", this.finsembleConfig);
		let splinterAgents = [];
		if (this.finsembleConfig.splinteringConfig && this.finsembleConfig.splinteringConfig.splinterAgents) {
			splinterAgents = this.finsembleConfig.splinteringConfig.splinterAgents.filter(agent => {
				return agent.services && agent.services.length > 0;
			});
		}

		// If any services are configured to run in a splinter agent then create the pool
		// If not, then we skip creating the pool in order to save resources (the pool creates an extra electron process which uses 50mb+)
		if (splinterAgents.length) {
			let poolConfig = {
				manifest: this.manifest,
				finsembleConfig: this.finsembleConfig,
				agentList: splinterAgents,
				defaultAgentLabel: "defaultServiceAgent"
			};

			// save splintering agent for use in creating new services; also needed for clean shutdown so pass into shutdown manager
			this.splinterAgentPool = new SplinterAgentPool(poolConfig);
			this.shutdownManager.setSplinterAgentPool(this.splinterAgentPool);
		}

		doneCallback("testTask_initializeSplinterAgentPool", "bootTasks", "completed")
	}

	/**
	 * Runs boot engine serially though each of the boot stages.  Status and diagnotics will go to the System Log.
	 */
	public async run() {
		try {
			// Sequentially walk through each boot stage
			for (let i = 0; i < ALL_BOOT_STAGES.length; i++) {

				let runBootStageCatch: Function;
				this.currentStage = ALL_BOOT_STAGES[i];
				Logger.system.log("BootEngine.run stage entered", this.currentStage);

				// runs one boot stage
				await this.runBootStage(this.currentStage)
					.catch(runBootStageCatch = (err: DGDiagnostics) => {
						this.logDiagnostics(err);

						// terminate going though boot stages if error in critical stages; otherwise will clutter syslog with errors
						if (CRITICAL_BOOT_STAGES.includes(this.currentStage)) {
							throw "*** Terminating Boot ***";
						}
					});

				// after each stage is ran, update config since might have underlying changes (e.g. once config service is available then full config can be queried; also config can dynamically
				// change after authentication); also, since the config service is started in the first microkernal stage, it will be available after the first stage is complete.
				const { err, data:finsembleConfig } = await ConfigClient.getValue({ field: "finsemble" });
				this.finsembleConfig = finsembleConfig;

				// pubish the completion of each stage
				Logger.system.log("BootEngine.run stage complete", this.currentStage);
				RouterClient.publish(STAGE_CHANNEL, { stage: this.currentStage });
			}

			// now that all started stages are complete, pass in the list of activeServices to shutdown manager -- this defines what services to wait for during shutdown
			this.shutdownManager.setupShutdownListeners(this.activeServices);

		} catch (error) {
			// even though terminating, remove outstanding timers so they won't generate errors and clutter system log
			this.cleanupStagesOutStandingTimers();

			// processingTerminiated will be used to stop processing of any incoming notifications
			this.processingTerminiated = true;

			SystemLog.error({}, `"BootEngine: ${error}`);
		}
	}

	/**
	 * Programatically start a service
	 * @param serviceName name of service to start (must have corresponding config in finsemble.services)
	 */
	public startService(serviceName: string) {
		let serviceConfigElement = this.manifest.finsembleConfig.services[serviceName]
		if (serviceConfigElement) {
			SystemLog.log({ indent: true },`Starting service ${serviceName}`)
			Logger.system.debug(`bootEngine.startService starting service ${serviceName} in ${this.currentStage}`);
			this.serviceLauncher.createService(serviceConfigElement, this.splinterAgentPool);
		} else {
			SystemLog.error({}, `"BootEngine.startService failed for ${serviceName} because config not found in "finsemble.services"`);
		}
	}


	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// The remaining methods are private
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Outputs diagnotics to SystemLog. Contains very specific formatting that will change when real SystemLog is available.
	 * @param err
	 */
	private logDiagnostics(err: DGDiagnostics) {
		SystemLog.error({ leadingBlankLine : true, indent: true }, `Error in stage "${this.currentStage}": ${err.description}`);

		for (let i = 0; i < err.errorData.length; i++) {
			SystemLog.error({ doubleIndent: true }, `"${i}: ${err.errorData[i]}`);
		}

		SystemLog.error({ leadingBlankLine: true, indent: true }, `"${this.currentStage}" stage failed. See SystemManager console for additional information.`);
	}

	/**
	 * Outputs checkpoint diagnotics to SystemLog.  Contains very specific formatting that will change when real SystemLog is available.
	 * @param err
	 */
	private checkpointLogDiagnostics(err: DGDiagnostics) {
		if (err.description) {
			SystemLog.warn({ indent: true }, `checkpoint issue in stage "${this.currentStage}": ${err.description}`);
			for (let i = 0; i < err.errorData.length; i++) {
				SystemLog.warn({ doubleIndent: true }, `${i}: ${err.errorData[i]}`);
			}
		} else {
			for (let i = 0; i < err.errorData.length; i++) {
				SystemLog.warn({ indent: true }, `${err.errorData[i]}`);
			}
		}
	}

	/**
	 * Finds config element and returns its value (or null if not found)
	 * @param name
	 * @returns
	 */
	private findConfigElement(name:string):BootConfigElement {
		let index = this.bootConfigs[this.currentStage].findIndex((element) => {
			return element.name === name;
		});
		let configElement = this.bootConfigs[this.currentStage][index];

		// the assumption is a config element will always be available for the give name
		if (!configElement) {
			Logger.system.error("bootEngine.findConfigElement could not find expected config element", name, this.bootConfigs[this.currentStage]);
		}
		return configElement;
	}

	/**
	 * Outputs all dependency graphs to console -- this is purely for diagnostics
	 * @param dependencyGraphs map of graphs by stage
	 */
	private outputDependencyGraphs(	dependencyGraphs: { [property in BootStage]?: BootDependencyGraph }) {
		for (let i = 0; i < ALL_BOOT_STAGES.length; i++) {
			let stage = ALL_BOOT_STAGES[i];
			let oneGraph = dependencyGraphs[stage];
			if (oneGraph) {
				console.log("\tStage:", stage)
				for (let nodeName in oneGraph.graph.nodes) {
					console.log("\t\tName:", nodeName)
					for (let j = 0; j < oneGraph.graph.nodes[nodeName].dependencies.length; j++) {
						console.log("\t\t\tDependency:", oneGraph.graph.nodes[nodeName].dependencies[j]);
					}
				}
			}
		}
	}


	/**
	 * Cleanup this stage's outstanding timers -- outstanding timers are only left if premature exit of stage on error
	 */
	private cleanupStagesOutStandingTimers() {
		Object.keys(this.startTimers).forEach(dependencyName => {
			clearTimeout(this.startTimers[dependencyName]);
			delete this.startTimers[dependencyName]
		});
	}

	/**
	 * Returns an initialized boot config element, based on config data and documented defaults.
	 *
	 * Data validation is also done here, with errors sent to system log. This function ensures boot config elements used elsewhere always contain valid values (unless error generated here).
	 *
	 * @param name the dependency name (e.g. service name)
	 * @param type the dependency type (e.g. "services") -- only needed to set default values
	 * @param config the corrsponding bootParms config data (e.g. finsemble.services.workspaceService.bootParams)
	 * @returns initialized boot-config element for one dependency
	 */
	private getBootConfigElement(currentStage: BootStage, name: string, type: BootDependencyType, originalConfig): BootConfigElement {
		// Note: this function does the final determination of the current stage of a config element, but then shouldn't output error messages if not current stage (so errors don't clutter SystemLog)

		// clone so won't modify the original config
		let	configClone = Util.clone(originalConfig);

		// create new config item that will be filled out then returned
		let newConfigElement: BootConfigElement = new BootConfigElement();
		newConfigElement.name = name;
		newConfigElement.type = type;

		// when bootParms are defined do some extra checking
		if (configClone.bootParams) {
			if (!ALL_BOOT_STAGES.includes(configClone.bootParams.stage)) {
				// put out an error message unless stage is null and autoStart is false (which would be a reasonable config)
				if (configClone.bootParams.stage || !(configClone.bootParams.autoStart === false)) {
					SystemLog.error({ leadingBlankLine: false }, `BOOT CONFIG: unknown boot stage "${configClone.bootParams.stage}" for ${name} in ${type} -- assigning default value`);
				}
				// set stage to null so will assign default value below
				configClone.bootParams.stage = null;
			}
		} else {
			configClone.bootParams = {};
		}

		// in this section the functionality dependends on the type
		if (type === "services") {
			newConfigElement.stage = configClone.bootParams.stage || "earlyuser";
			newConfigElement.timeout = configClone.bootParams.timeout || this.startServiceTimeout;
		} else if (type === "bootTasks") {
			newConfigElement.stage = configClone.bootParams.stage || "earlyuser";
			newConfigElement.timeout = configClone.bootParams.timeout || this.startTaskTimeout;
		} else if (type === "components") {
			configClone.component = configClone.component || {};
			newConfigElement.stage = configClone.bootParams.stage || "user";
			if (configClone.bootParams.autoStart === false && configClone.component.spawnOnStartup && (newConfigElement.stage === currentStage)) {
				SystemLog.error({ leadingBlankLine: false }, `BOOT CONFIG: autostart conflicts with spawnOnStartup value for ${name} in ${type} -- using spawnOnStartup value`);
			}

			if (originalConfig.bootParams) { // for components with original bootParms, the default autoStart value is spawnOnStartup, so explicited set it here so won't be modified below;
				configClone.bootParams.autoStart = configClone.component.spawnOnStartup || false;
			} else { // otherwise, for components without original bootParm, autoStart is forced to same value as configClone.component.spawnOnStartup
				configClone.bootParams.autoStart = configClone.component.spawnOnStartup || false;
			}
			newConfigElement.timeout = configClone.bootParams.timeout || this.startComponentTimeout;
		}

		// if there are checkpoints, carry then over for later processing by checkpoint engine
		if (configClone.bootParams.checkpoints && Object.keys(configClone.bootParams.checkpoints).length > 0) {
			newConfigElement.checkpointsIncluded = true;
			newConfigElement.checkpointConfig = configClone.bootParams.checkpoints;
		}

		// assign the rest of the values -- use defaults if config doesn't have specific value
		newConfigElement.dependencies = configClone.bootParams.dependencies || [];
		newConfigElement.stopOnFailure = ("stopOnFailure" in configClone.bootParams) ? configClone.bootParams.stopOnFailure : true;
		newConfigElement.autoStart = ("autoStart" in configClone.bootParams) ? configClone.bootParams.autoStart : true;
		newConfigElement.customFailureMessage = configClone.bootParams.customFailureMessage || "";;
		newConfigElement.originalConfig = originalConfig;

		// insure dependencies is an array, given simple mistake to put in a string for a single dependency
		if (!Array.isArray(newConfigElement.dependencies) && newConfigElement.stage === currentStage) {
			SystemLog.error({ leadingBlankLine: false }, `BOOT CONFIG: bootparams.dependencies for ${name} in ${type} must be an array`);
			newConfigElement.dependencies = [ "" ];
		}

		return newConfigElement;
	}

	/**
	 * Adds to the cumulativeBootConfig array the boot-config elements for a given type within the specified stage (e.g. services within the kernal stage).
	 * @param currentStage current stage of booting
	 * @param type the dependency type (e.g. services) -- this is only need to set default values
	 * @param dependencyConfigs all the config data for given type (e.g. finsemble.tasks, finsemble.services)
	 * @param bootConfig the array to push the boot-config elements to for given stage and type
	 */
	private getBootConfigByType(currentStage:BootStage, type: BootDependencyType, dependencyConfigs: object, cumulativeBootConfig: BootConfigElement[]) {
		for (var property in dependencyConfigs) {
			let newConfigElement: BootConfigElement = this.getBootConfigElement(currentStage, property, type, dependencyConfigs[property]);
			// have to process boot config first before checking if right stage, because stage might not be set yet when default is used
			if (newConfigElement.stage == currentStage) {
				cumulativeBootConfig.push(newConfigElement);
			}
		}
	}

	/**
	 * Pulls together all the boot-config elements for one stage, including boot-config elements for tasks, services, and components
	 * @param stage the boot stage
	 * @param finsembleConfig current finsembleConfig (may be updated between stages)
	 * @returns the cumulative array of all the boot-config elements for the specified stage
	 */
	private getBootConfig(stage: BootStage, finsembleConfig: object): BootConfigElement[] {
		let cumulativeBootConfig:BootConfigElement[] = []; // for each stage start with a clear array of boot-config elements

		for (let i = 0; i < ALL_BOOT_DEPENDENCY_TYPES.length; i++) {
			let dependencyType: BootDependencyType = ALL_BOOT_DEPENDENCY_TYPES[i];

			this.getBootConfigByType(stage, dependencyType, finsembleConfig[dependencyType], cumulativeBootConfig);

			// for service type, also do required services (which are in a different config location)
			if (dependencyType == "services") {
				this.getBootConfigByType(stage, dependencyType, finsembleConfig["system"].requiredServicesConfig, cumulativeBootConfig);
			}
		}

		return cumulativeBootConfig;
	}

    /**
	 * Based on the depenency graph, asynchronously run through the boot sequence for one stage.  Will not stop until graphStage is "finished".
	 * The state of started dependencies will trigger new dependencies to be ready and started until finished.
	 *
	 * Here's the general flow:
	 * 1) a new dependeny graph is created and any initial errors and ready-to-start dependencies are handled
	 * 2) as starting dependencies (e.g. service or boot task) communicate back, genericHandlerForStateChange is triggered
	 * 3) setBootDependencyState is then called to update the dependeny state in the dependency graph
	 * 4) as states in the dependeny tree's are changed to "completed", other dependencies become ready to start (see readyToStartList),
	 * 	  then those dependencies are started (which then triggers other state changes and so on)
	 * 5) when the stage's dependency tree is finished (either because everything is started or an error occurred), then the stage is complete
	 *
	 * @param stage the boot stage to run
	 * @returns Promise, which will be resolved or rejected in processWhatIsReady
	 */
	private runBootStage(stage: BootStage):Promise<any> {
		const runBootStagePromiseResolver = async (resolve, reject) => {
			try {
				SystemLog.log({ leadingBlankLine: false }, `BOOT STAGE: ${stage}`);
				this.stageResolver = resolve;
				this.stageRejecter = reject;

				this.bootConfigs[stage] = this.getBootConfig(stage, this.finsembleConfig);

				this.dependencyGraphs[stage] = new BootDependencyGraph(stage, this.bootConfigs[stage], this.cumulativePreviousBootConfig);
				Logger.system.log("forceObjectsToLogger", "BootDependencyGraph.runBootStage", stage, this.bootConfigs[stage], this.cumulativePreviousBootConfig, this.dependencyGraphs[stage]);
				console.log("BootDependencyGraph.runBootStage", stage, this.bootConfigs[stage], this.cumulativePreviousBootConfig, this.dependencyGraphs[stage]);

				// kicks off processing the dependency graph for this stage -- will continue until done
				this.processWhatIsReady(this.dependencyGraphs[stage]);

				// keep list of all to check for dependency located in a previous state
				this.cumulativePreviousBootConfig = [...this.cumulativePreviousBootConfig, ...this.bootConfigs[stage]];
			} catch (err) {
				reject(new DGDiagnostics("BootEngine:runBootStage.reject" + err))
			}

		}
		return new Promise(runBootStagePromiseResolver);
	}

	/**
	 * Housekeeping function to setup boot pub sub for each router-based dependency
	 */
	private setupDependencyBootStatusPubSubs(): void {
		// this is called from initialize() so routerInitial tasks hasn't ran yet, so wait here until router ready.
		RouterClient.onReady(() => {
			// define wildcard responder for all dependency pubsubs and checkpoint pubsubs
			RouterClient.addPubSubResponder(new RegExp(`${STATUS_CHANNEL_BASE}.*`), UNITIALIZED_BOOT_STATE);
			RouterClient.addPubSubResponder(new RegExp(`${CHECKPOINT_CHANNEL_BASE}.*`), UNITIALIZED_BOOT_STATE);

			RouterClient.addPubSubResponder(STAGE_CHANNEL, { stage: "uninitialized"});
		});
	}

	/**
	 * Housekeeping function to setup boot pub sub for each router-based dependency
	 */
	private subscribeToDependencyBootStatus(dependencyName:string): void {
		// receives startup state from services -- see SystemManagerClient.publishBootStatus.  Router is known to be ready before this is called.
		RouterClient.subscribe(statusChannel(dependencyName), (err, notify) => {
				if (err) {
					Logger.system.error("BootEngine subscribe error", err);
				} else {
					this.genericHandlerForStateChange(notify.data.name, notify.data.type, notify.data.state)
				}
		});
	}

	/**
	 * Handles one dependency state change
	 * @param dependencyName
	 * @param type
	 * @param state
	 */
	private handleOneDependencyStateChange(dependencyName: string, type: BootDependencyType, state: BootDependencyState): void {
		if (state === "completed" && type === "services") {
			// keep a list of all started/actived services to use for shutdown
			this.activeServices.push(dependencyName);
		}

		// if changing to a final state then update dependency graph with the new state and continue processing
		if (state === "completed" || state === "failed") {
			let graph = this.dependencyGraphs[this.currentStage];

			// if checkpoint engine running for this dependeny, then get the checkpoint status and display any errors
			if (this.checkpointEngines[dependencyName]) {

				// The service is now done, so time to get checkpoint status.
				// MM Note: This delay is to handle a rare race condition where the pubsub for the service-complete beats back the pubsub for the last checkpoint.
				// This can happens because checkpoint the subscribe doesn't occur until the checkpoint dependency is fullfilled, which might happen a bit after the actual
				// checkpoint fires in another window.  When this happens the subscribe's initial pubsub state (which is decoupled from the earlier publish) can be
				// received after the service complete and look like the checkpoint failed. I know how to eliminate this problem without using a delay,
				// but doing so may be more work than the problem merits -- so keeping this small delay as the fix. However, might revisit and eliminate delay when opportunity arises.
				setTimeout(() => {
					let checkpointResults: BootCheckpointResults = this.checkpointEngines[dependencyName].getResults(state);
					if (!checkpointResults.okay) {
						this.checkpointLogDiagnostics(checkpointResults.errorDiag);
					}

					// clean up, plus prevent multiple results from two state changes (i.e. first a timeout failure then later "completed" arrives)
					delete this.checkpointEngines[dependencyName];

					Logger.system.debug("bootEngine.genericHandlerForStateChange checkpointEngine results", dependencyName, checkpointResults);
				}, WAIT_FOR_LAST_CHECKPOINT_DELAY);
			}

			if (state === "failed") {
				SystemLog.error({ doubleIndent: true }, `BootState=${state} for ${dependencyName}.  ${this.findConfigElement(dependencyName).customFailureMessage}`);
			}

			graph.setBootDependencyState(dependencyName, state);
			this.processWhatIsReady(graph);
		}
	}

	/**
	 * Generic handler for state changes of dependencies
	 * @param dependencyName
	 * @param state
	 */
	private genericHandlerForStateChange(dependencyName: string, type: BootDependencyType, state: BootDependencyState): void {
		Logger.system.debug("bootEngine.genericHandlerForStateChange", dependencyName, type, state);
		console.debug("bootEngine.genericHandlerForStateChange", dependencyName, type, state);

		// if timeout never fired, then stop timer and cleanup
		if (this.startTimers[dependencyName]) {
			clearTimeout(this.startTimers[dependencyName]);
			delete this.startTimers[dependencyName];
		}

		// if engine is still processing (didn't prematurely terminate on error) then process the state change
		if (!this.processingTerminiated) {
			this.handleOneDependencyStateChange(dependencyName, type, state);
		}
    }

	/**
	 * Handles task callback response
	 * @param taskName
	 * @param state
	 */
	private handleTaskResponse(taskName: string, type: BootDependencyType, state: BootDependencyState): void {
		// Force a processor break before invoking state change handler; this is done only for directly-invoked
		// tasks which might directly invoke their callback.  The purpose if so processing the ready list is
		// alway done breath-first (never depth first). Note this forced break is not required, but it makes the
		// startup order more intuitive for user
		setTimeout(() => {
			this.genericHandlerForStateChange(taskName, type, state)
		}, 0);
	}

	/**
	 * Handles error timeout for a started dependency (i.e. no response was received)
	 * @param dependencyName
	 */
	private handleStartTimeout(dependencyName:string, type: BootDependencyType): void {
		delete this.startTimers[dependencyName]; // remove from active list of timers
		SystemLog.error({ indent: false }, `${dependencyName} startup failed due to a time out`);
		this.genericHandlerForStateChange(dependencyName, type, "failed")
	}

	/**
	 * Starts dependency that's a boot task
	 * @param readyItem info for boot task to start
	 */
	private startBootTaskDependency(readyItem: BootReadyItem) {
		SystemLog.log({ indent: true }, `starting boot task: ${readyItem.name}`)
		Logger.system.debug(`bootEngine.processReadyList starting boot task ${readyItem.name} in ${this.currentStage}`, readyItem);
		if (this.registeredTasks[readyItem.name]) {
			// invoke the registered boot task
			this.registeredTasks[readyItem.name](this.handleTaskResponse);
		} else {
			Logger.system.error(`bootEngine.processReadyList: unknown task ${readyItem.name}`, readyItem);
			SystemLog.error({}, `bootEngine.processReadyList: unknown task ${readyItem.name}`)
		}
	}

	/**
	 * Starts dependency that's a service
	 * @param readyItem info for service to start
	 */
	private startServiceDependeny(readyItem: BootReadyItem) {
		SystemLog.log({ indent: true }, `starting service: ${readyItem.name}`)
		this.subscribeToDependencyBootStatus(readyItem.name);
		Logger.system.debug(`bootEngine.processReadyList starting service ${readyItem.name} in ${this.currentStage}`, readyItem);
		this.serviceLauncher.createService(readyItem.config.originalConfig, this.splinterAgentPool);
	}

	/**
	 * Starts dependency that's a component
	 * @param readyItem info for component to start
	 */
	private startComponentDependeny(readyItem: BootReadyItem) {
		// components cannot be auto started in first two stages because the essential services are not up
		if (this.currentStage === "microkernel" || this.currentStage === "kernel") {
			SystemLog.error({ indent: true }, `cannot config in bootParams for component ${readyItem.name} to start until after "kernal" stage`)
		} else {
			SystemLog.log({ indent: true }, `starting component: ${readyItem.name}`)
			this.subscribeToDependencyBootStatus(readyItem.name);
			Logger.system.debug(`bootEngine.processReadyList starting component ${readyItem.name} in ${this.currentStage}`, readyItem, readyItem.config.originalConfig);
			LauncherClient.spawn(readyItem.name, {});
		}
	}

	/**
	 * Starts a ready dependency -- one that moved to the "readyToStart" state in the dependency tree when all of its dependencies became ready.
	 * If ready dependency has checkpoints, then also startup corresponding checkpoint engine for those checkpoints
	 * @param listItem list of ready dependencies to start
	 */
	private startReadyItem(readyItem: BootReadyItem) {

		// if the dependency being started doesn't respond then this handles the timeout error
		this.startTimers[readyItem.name] = setTimeout(() => {
			this.handleStartTimeout(readyItem.name, readyItem.type);
		}, readyItem.config.timeout);

		switch (readyItem.type) {
			case "bootTasks": {
				this.startBootTaskDependency(readyItem);
				break;
			}
			case "services": {
				this.startServiceDependeny(readyItem);
				break;
			}
			case "components": {
				this.startComponentDependeny(readyItem);
				break;
			}
			default:
				Logger.system.error("bootEngine.processReadyList: unknown boot type", readyItem); // this should never happen
		}

		// if the dependency being started has checkpoint, then create an instance of checkpointEngine to process those checkpoints;
		// then save the checkpointEngine so it can be queryed for results when the dependeny is finished (i.e. "completed" or "failed");
		// note the checkpoints do not affect functionality -- they are only to improve diagostics when startup errors occur
		if (readyItem.config.checkpointsIncluded) {
			Logger.system.debug("startReadyItem new BootCheckpointEngine", readyItem.config.name, readyItem);
			this.checkpointEngines[readyItem.config.name] = new BootCheckpointEngine(readyItem.config.name, this.currentStage, readyItem.config.timeout, readyItem.config.checkpointConfig);
		}

	}

	/**
	 * Sets state in dependency tree for a list of dependencies.  Note changing these states affects the status of the dependency tree
	 * @param readyList
	 * @param newState
	 */
	private setStateForList(readyList: BootReadyItem[], newState: BootDependencyState) {
		for (let i = 0; i < readyList.length; i++) {
			let listItem:BootReadyItem = readyList[i];
			this.dependencyGraphs[this.currentStage].setBootDependencyState(listItem.name, newState);
		}
	}

	/**
	 * Process the ready list (i.e. what's ready to start) -- the ready list is always returned in the status of the dependeny tree
	 * @param readyList the ready list of what to start
	 */
	private processReadyList(readyList: BootReadyItem[]) {
		Logger.system.debug("bootEngine.processReadyList", readyList);

		// change state in readyList from "readyToStart" to "starting"; have to do it upfront to avoid potential asynchronous issues with genericHandlerForStateChange
		this.setStateForList(readyList, "starting");

		for (let i = 0; i < readyList.length; i++) {
			let listItem: BootReadyItem = readyList[i];
			this.startReadyItem(listItem);
		}
    }

	/**
	 * Process the dependency tree, which typically means getting its latest status then starting all the depenencies that are ready.
	 * However, if the status indicates the graph is finished (typically meaning everything has started) then accept this stage's promise -- the stage is complete.
	 * Or if the status indicates an error occurred, then reject this stages promise (ending this stage)
	 * @param graph the current stages dependency graph
	 */
	private processWhatIsReady(graph: BootDependencyGraph): void {
		let status: DGGraphStatus = graph.getCurrentStatus();
		Logger.system.debug("bootEngine processWhatIsReady", status, graph);
		console.log("processWhatIsReady", status);

		// this condition should never happen, but would prevent bad bootEngine handlers from getting in an infinite loop
		if (++this.processStatusCounter > PROCESS_STATUS_COUNTER_MAX) {
			Logger.system.error("bootEngine.processWhatIsReady is in infinite loop -- breaking out", this.processStatusCounter);
		} else {
			switch (status.graphState) {
				case "error": {
					this.stageRejecter(status.errorDiag);
					break;
				}
				case "notFinished": {
					this.processReadyList(status.readyToStartList);
					break;
				}
				case "finished": {
					this.stageResolver();
					break;
				}
			}
		}
	}

}