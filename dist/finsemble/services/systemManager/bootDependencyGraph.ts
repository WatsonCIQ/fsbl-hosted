/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Overview in Real Time Board
// https://realtimeboard.com/welcomeonboard/dqbvK59KjETgD8Yc2VmW4BSpCieLXc4jfwmFMkgFTVRqLba0sCDFO2H3PHlGCpqi
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


import { BootDependencyState, BootConfigElement, BootReadyItem } from "./_types";
import Logger from "../../clients/logger";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Exported Supporting Classes /////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The status of the dependeny graph -- return by getCurrentStatus()
 */
export class DGGraphStatus {
	graphState: DGGraphState; // current graph state
	graph: DGGraph; // the internal dependency graph
	readyToStartList: BootReadyItem[]; // current list of what's ready to start
	errorDiag: DGDiagnostics; // only valid when graphState is "error"
	bootConfig: BootConfigElement[]; // the original boot-config elements used to guild the graph
	constructor(graphState, bootConfig, readyToStartList, errorDiag) {
		this.graphState = graphState;
		this.bootConfig = bootConfig;
		this.readyToStartList = readyToStartList;
		this.graphState = graphState;
		this.errorDiag = errorDiag;
	}
}

/**
 * Diagnotic value set when an error occurres in the dependency tree.
 */
export class DGDiagnostics {
	description: string;
	errorData: string[] = [];
	constructor(description = "", path = []) {
		this.description = description;
		this.errorData = path;
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Internal Supporting Types and Classes ///////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

type DGGraphState = "notFinished" | "finished" | "error";

/**
 * Defines one node in the graph.
 */
class DGNode {
	name: string;
	currentState: BootDependencyState;
	dependencies: string[] = [];
	stopOnFailure: boolean;
	customFailureMessage: string;
	constructor(name:string, dependencies, autoStart:boolean, stopOnFailure:boolean, customFailureMessage: string) {
		this.name = name;
		this.dependencies = dependencies;
		this.stopOnFailure = stopOnFailure;
		this.customFailureMessage = customFailureMessage;
		if (autoStart) {
			 // default setting before moving through normal startup states of starting
			this.currentState = "uninitialized";
		} else {
			// special setting from config to disable moving throught normal startup states -- the dependency will never start
			this.currentState = "disabled";
		}
	}
}
/**
 * Defines a set of nodes that as a whole make up the graph.
 */
class DGGraph {
	nodes: { [property in string]: DGNode } = {};
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main Class: DependenyClass //////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const MoreProcessingToDoStates:BootDependencyState[] = ["uninitialized", "waitingOnDependencies", "readyToStart" ]; // any of these dependency states means there is more to do
const ErrorStates:BootDependencyState[] = [ "blockedByDisabled", "failed", "blockedByFailure" ]; // any of these dependency states means there is an error (and no more to do)

/**
 *  An instance of a dependency graph drives both the BootEngine and BootCheckpointEngine instances, determinating which dependencies are ready to start.
 */
export class BootDependencyGraph {
	context: string; // identifies the context this dependency graph is being used in (used for diagnostics)
	graph: DGGraph; // the underlying graph
	graphState: DGGraphState; // the overall state of the graph
	bootConfig: BootConfigElement[]; // the original config used to build the graph
	allPreviousBootConfig: BootConfigElement[]; // the config for all the previous stages
	readyToStartList: BootReadyItem[]; // list of what's ready to start in the graph
	errorDiag: DGDiagnostics = new DGDiagnostics(); // if graphState is error, this contains diagnostic data

	/**
	 * Creates an instance of dependency graph. Validates the graph is valid up front.
	 * @param stage the current stage
	 * @param bootConfig the boot config for this stage
	 * @param allPreviousBootConfig the boot config for all previous stages
	 */
	constructor(context: string, bootConfig: BootConfigElement[], allPreviousBootConfig: BootConfigElement[] = []) {
		Logger.system.debug("BootDependencyGraph.constructor -- start", context, bootConfig)

		try {
			this.context = context;
			this.bootConfig = bootConfig;
			this.allPreviousBootConfig = allPreviousBootConfig;
			this.graph = this.buildGraph(this.bootConfig);
			this.checkNodesForValidDependencies(this.bootConfig, this.allPreviousBootConfig, this.graph);
			this.checkNodesForCircularDependencies(this.graph)
			this.iterativelySetAllGraphStates(this.graph);

		} catch (err) {
			// if graphState doesn't have error already set, then must be an unexpected javascript error
			if (this.graphState != "error") {
				this.graphState = "error";
				this.errorDiag.description = err;
			}
			Logger.system.error("BootDependencyGraph constructor caught error", this.errorDiag);
		}
	}

	/**
	 * Used by the boot engine to update the state of one node in the dependency tree (this potentially affects what becomes ready)
	 * @param dependencyName
	 * @param state
	 */
	public setBootDependencyState(dependencyName: string, state: BootDependencyState) {
		Logger.system.debug(`BootDependencyGraph.setBootDependencyState`, dependencyName, state);
		let node:DGNode = this.graph.nodes[dependencyName];
		if (node) {
			node.currentState = state;
		} else {
			Logger.system.error(`BootDependencyGraph.setBootDependencyState called with unknown dependency name ${dependencyName} for this stage (may be a late message).  Operation ignored.`, this.graph);
		}
	}

	/**
	 * Gets the current status of the dependeny tree
	 * @returns status
	 */
	public getCurrentStatus(): DGGraphStatus {

		// update state before returning status -- required since setBootDependencyState may have made node changes
		this.iterativelySetAllGraphStates(this.graph);

		let status = new DGGraphStatus(this.graphState, this.bootConfig, this.readyToStartList, this.errorDiag);

		return (status);
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// The remaining methods are private
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Builds the graph from config (i.e. a set of boot-config elements)
	 * @param bootConfig
	 * @returns graph
	 */
	private buildGraph(bootConfig: BootConfigElement[]): DGGraph {
		var graph = new DGGraph();

		for (let index = 0; index < bootConfig.length; index++) {
			let element = bootConfig[index];
			let newNode = new DGNode(element.name, element.dependencies, element.autoStart, element.stopOnFailure, element.customFailureMessage);
			graph.nodes[element.name] = newNode;
		}
		Logger.system.debug ("BootDependencyGraph.buildGraph -- graph built", this.graph)
		return graph;
	}

	/**
	 * Depth-first recursive function starting with a single node and following dependencies to see if circular.  Keeps track of the previous path both to identify cicular dependencies and
	 * to provide diagnostics of exactly where the problem is.
	 * @param dependencyPathTaken the dependency-tree path so far taken -- this array is modified for each recursive "loop"
	 * @param nodeName the current node (which will be added to the path)
	 * @returns true if circular path
	 */
	private testOneNodeForCircularPath(dependencyPathTaken:string[], nodeName: string): boolean {
		Logger.system.debug(`BootDependencyGraph.testOneNodeForCircularPath -- nodeName=${nodeName}`, dependencyPathTaken);

		var circular:boolean = false;
		// if node is already in the path previously walked, then must be circular
		if (dependencyPathTaken.includes(nodeName)) {
			dependencyPathTaken.push(nodeName);
			circular = true;

		// else everything okay so far....no circular dependencies yet
		} else {
			dependencyPathTaken.push(nodeName);
			let node: DGNode = this.graph.nodes[nodeName];
			for (const index in node.dependencies) {
				circular = this.testOneNodeForCircularPath(dependencyPathTaken, node.dependencies[index]);
				if (circular) {
					break;
				}
			}
		}

		if (!circular) { // unwind path when not a circular path; otherwise side branches can be in circular dependencyPathTaken (which is used for diagnostics)
			dependencyPathTaken.pop();
		}

		Logger.system.debug(`BootDependencyGraph.testOneNodeForCircularPath done for nodeName=${nodeName} with circular=${circular}`);
		return circular;
	}

	/**
	 * Checks all nodes for circular dependencies. Note an error is thrown if a circular dependency is found.
	 *
	 * NOTE: throws an error when cicular dependency
	 *
	 * @param graph the graph of all nodes
	 */
	private checkNodesForCircularDependencies(graph: DGGraph):void {

		// for each node in the dependency graph, check for circular dependencies
		for (let nodeName in this.graph.nodes) {
			let dependencyPathTaken: string[] = []; // record of path when looking for cicular dependency; reset each time

			Logger.system.debug (`BootDependencyGraph.checkNodesForCircularDependencies -- nodeName=${nodeName}`)

			let isCircular = this.testOneNodeForCircularPath(dependencyPathTaken, nodeName);

			if (isCircular) {
				this.errorDiag =new DGDiagnostics(`${this.context} circular dependency`, dependencyPathTaken);
				this.graphState = "error";
				throw this.errorDiag.description;
			}
		}
	}

	/**
	 * Checks if dependency is within a list of boot config elements
	 * @param bootConfig
	 * @returns true if dependeny is in list
	 */
	private checkForKnownDependency(dependencyName:string, bootConfig:BootConfigElement[]) {
		let configIndex = bootConfig.findIndex(configElement => configElement.name == dependencyName);
		return configIndex >= 0;
	}

	/**
	 * Checks all nodes for valid dependencies. Note an error is thrown if an invalid/unknown dependency is found.
	 *
	 * NOTE: throws an error when invalid dependency
	 *
	 * @param bootConfig
	 * @param graph
	 */
	private checkNodesForValidDependencies(bootConfig: BootConfigElement[], allPreviousBootConfig: BootConfigElement[], graph: DGGraph):void {
		var isValidationError: boolean;
		var knownInThisStage: boolean;
		var knownInPreviousStages: boolean;
		var dependencyErrors: string[] = []; // record of path when looking for cicular dependency; reset each time

		for (let nodeName in this.graph.nodes) {
			let node = this.graph.nodes[nodeName];
			let index = node.dependencies.length;

			// walk backwards though the dependency array so can delete dependenies as needed
			while (index--) {
				let dependencyName = node.dependencies[index];
				knownInThisStage = this.checkForKnownDependency(dependencyName, bootConfig);
				if (!knownInThisStage) {
					knownInPreviousStages = this.checkForKnownDependency(dependencyName, allPreviousBootConfig);
				}

				// if only known in previous stages then can remove dependency from this stage
				if (!knownInThisStage && knownInPreviousStages) {
					Logger.system.debug(`dependencyGraphy.checkNodesForValidDependencies removing dependency ${node.dependencies[index]} in node ${nodeName}`);
					// remove previous stage dependency
					node.dependencies.splice(index, 1);

				// else if not known anywhere, then error
				} else 	if (!knownInThisStage && !knownInPreviousStages) {
					isValidationError = true;
					dependencyErrors.push(`${nodeName} dependency "${dependencyName}" is unknown in this stage or previous stages`);
				}
			}
		}

		if (isValidationError) {
			this.errorDiag =new DGDiagnostics(`${this.context} illegal boot configuration`, dependencyErrors);
			this.graphState = "error";
			throw this.errorDiag.description;
		}
	}

	/**
	 * Internally sets a node's state, based on the state of all its direct dependencies
	 * @param node the node whose state is set
	 * @returns returns true if the value of the node's state changed
	 */
	private setNewNodeState(node: DGNode): boolean {
		Logger.system.debug(`BootDependencyGraph.setNewNodeState for node=${node.name}`, node);
		var newState:BootDependencyState = node.currentState;

		// if state has already been set to a terminal state (e.g. started, error) then don't need to recalculated
		if (MoreProcessingToDoStates.includes(newState)) {

			newState = "readyToStart"; // start with ready to start, then override if found otherwise

			// if no dependencies then stay with default: readyToStart
			for (let dependency of node.dependencies) {
				if (this.graph.nodes[dependency].currentState === "completed") {
					// here the dependency is in "completed" state so stay with default value of "readyToStart (i.e. do nothing here)

				} else if (this.graph.nodes[dependency].currentState === "disabled" || this.graph.nodes[dependency].currentState === "blockedByDisabled") {
					newState = "blockedByDisabled";
					// break out of loop since this state overrides others
					break;

				} else if (this.graph.nodes[dependency].currentState === "failed" || this.graph.nodes[dependency].currentState === "blockedByFailure") {
					newState = "blockedByFailure";
					// break out of loop since this state overrides others
					break;

				} else if (MoreProcessingToDoStates.includes(this.graph.nodes[dependency].currentState) || this.graph.nodes[dependency].currentState === "starting") {
					// do not break out of loop because variants of failure or disabled might override
					newState = "waitingOnDependencies";
				}
			}
		}

		let isStateChanged: boolean = (newState !== node.currentState);
		node.currentState = newState;
		Logger.system.debug(`BootDependencyGraph.setNewNodeState done for node=${node.name}`, isStateChanged, newState);

		return isStateChanged;
	}

	/**
	 * Scans all of the nodes in the graph to get an updated ready-to-start list
	 * @param graph
	 * @returns updated ready-to-start list
	 */
	private getNewReadyList(graph: DGGraph): BootReadyItem[] {
		let newReadyToStartList: BootReadyItem[] = [];
		for (let nodeName in this.graph.nodes) {
			let node = this.graph.nodes[nodeName];
			if (node.currentState === "readyToStart") {
				let configIndex = this.bootConfig.findIndex(configElement => configElement.name == nodeName);
				let config = this.bootConfig[configIndex];
				newReadyToStartList.push(new BootReadyItem(nodeName, config.type, config));
			}
		}
		return newReadyToStartList;
	}

	/**
	 * Gets the overall state of the graph, by examining the states of all the nodes in the graph.
	 * @param graph the graph
	 * @returns the graph state
	 */
	private getNewGraphState(graph: DGGraph): DGGraphState {
		let graphState: DGGraphState;
		let moreToDoCounter = 0;
		let fatalErrorCounter = 0;
		let startingCounter = 0;

		for (let nodeName in graph.nodes) {
			let node:DGNode = graph.nodes[nodeName];
			if (ErrorStates.includes(node.currentState) && node.stopOnFailure) {
				fatalErrorCounter++;
			} else if (MoreProcessingToDoStates.includes(node.currentState)) {
				moreToDoCounter++;
			} else if (node.currentState === "starting") {
				// still waiting on final "completed" state
				startingCounter++;
			}
		}

		// set overall state of graph
		if (fatalErrorCounter > 0) {
			graphState = "error";
		} else if (moreToDoCounter > 0 || startingCounter > 0)  {
			graphState = "notFinished";
		} else {
			graphState = "finished";
		}

		Logger.system.debug(`BootDependencyGraph.getNewGraphState`, graphState, fatalErrorCounter, moreToDoCounter);
		return graphState;
	}

	/**
	 * Iteratively walks the graph, updating node states (from their latest dependeny states). Continues until the graph is in a steady-state (i.e. no changes occurred in the last complete iteration).
	 * If graph is already in an error state don't process it (don't want error noise, given can assume the root error has already been identified).
	 *
	 * This function update the following:
	 * 		1) node states throughout the graph;
	 * 		2) the this.graphState value;
	 *		3) the contents of this.readytoStartList
	 * @param graph
	 */
	private iterativelySetAllGraphStates(graph: DGGraph):void {
		const MaximumIterations:number = 200;
		let keepIterating:boolean;
		let iterationCount:number = 0;

		// Keep iterating until a steady state is reached; the graphs are small so don't need a smarter/faster algorithm
		while (this.graphState != "error" && (keepIterating || iterationCount === 0)) {
			Logger.system.debug (`BootDependencyGraph.iterativelySetAllGraphStates pass ${iterationCount}`, graph)
			keepIterating = false;

			// do one node in the graph at a time, considering only its immediate dependencies
			for (let nodeName in this.graph.nodes) {
				Logger.system.debug (`BootDependencyGraph.iterativelySetAllGraphStates for nodeName ${nodeName}`)

				let node: DGNode = this.graph.nodes[nodeName];
				let isChangedState:boolean = this.setNewNodeState(node);

				if (isChangedState) {
					Logger.system.debug(`BootDependencyGraph.iterativelySetAllGraphStates BootDependencyState updated for nodeName ${nodeName} so continue iterating`);
					// anytime there is a change then keep iterating to insure change trickle thoughout the entire graph
					keepIterating = true;
				}
			}

			// this should never happen, but provides a fail-safe against infinite loops
			if (++iterationCount > MaximumIterations) {
				Logger.system.error ("iterativelySetAllGraphStates was stuck in loop -- breaking out")
				break;
			}
		}

		if (this.graphState != "error") {
			this.graphState = this.getNewGraphState(this.graph); // now in steady state, so get overall state of graph
			this.readyToStartList = this.getNewReadyList(graph);
		}

		Logger.system.debug(`BootDependencyGraph.iterativelySetAllGraphStates done`, this.graphState, this.readyToStartList);
	}
}

