/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";
import { BootTaskCallbackInterface } from "../_types";
import * as Constants from "../../../common/constants";
import SystemManagerClient from "../../../common/systemManagerClient";

/**
 * Boot task that intializes the system state handlers (formerly in service manager).
 * @private
 */
export class InitializeSystemStateHandersTask {
	ServiceStates: object = {};

	public start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("initializeSystemStateHandersTask start");

		var self = this;
		//@note 7-16-18, default wildcard pubsubresponder moved to routerService.
		RouterClient.addPubSubResponder("AuthorizationState", { "state": "undefined" });
		RouterClient.addPubSubResponder(/WorkspaceService.*/, { "state": "start" });

		RouterClient.addPubSubResponder(Constants.APPLICATION_STATE_CHANNEL,  { state: "initializing" }, {
			publishCallback: (err, publish) => {
				Logger.system.log("APPLICATION LIFECYCLE: STATE CHANGE", publish.data.state);
				publish.sendNotifyToAllSubscribers(null, publish.data);
			}
		});

		//Any service that is initializing will send us a message here. We push the message out to the rest of the system inside of the handler.
		RouterClient.addListener(Constants.SERVICE_INITIALIZING_CHANNEL, (err, message) => {
			let serviceState: ServiceState = "initializing";
			this.handleServiceStateChange({ name: message.data.name, state: serviceState })
		});

		//Any service that comes online will send us a message here. We push the message out to the rest of the system inside of the handler.
		RouterClient.addListener(Constants.SERVICE_READY_CHANNEL, (err, message) => {
			let serviceState: ServiceState = "ready";
			this.handleServiceStateChange({ name: message.data.serviceName, state: serviceState })
		});

		//Any service that is closing will send us a message here. We push the message out to the rest of the system inside of the handler.
		RouterClient.addListener(Constants.SERVICE_CLOSING_CHANNEL, (err, message) => {
			let serviceState: ServiceState = "closing";
			this.handleServiceStateChange({ name: message.data.name, state: serviceState })
		});

		//Any service that is closed will send us a message here. We push the message out to the rest of the system inside of the handler.
		RouterClient.addListener(Constants.SERVICE_CLOSED_CHANNEL, (err, message) => {
			let serviceState: ServiceState = "closed";
			this.handleServiceStateChange({ name: message.data.name, state: serviceState })
		});

		/////////////////////////////////////////////////////////////////////////////////////////////
		// The following is to maintain backwards compatability with APPLICATION_STATE_CHANNEL pubsub
		// Only other place this state is published is in the shutDownManager for "closing"
		/////////////////////////////////////////////////////////////////////////////////////////////

		// ** NOTE **: the correct sequence must be "configuring" , "initializing", "authenticating", "authenticated",  "ready"
		// If "configuring isn't done first then the system will not come up.

		SystemManagerClient.waitForStartup("dataStoreService", () => {
			RouterClient.publish(Constants.APPLICATION_STATE_CHANNEL, { state: "configuring" });
		});

		SystemManagerClient.waitForBootStage("kernel", "stageEntered", () => {
			RouterClient.publish(Constants.APPLICATION_STATE_CHANNEL, { state: "initializing" });
		});

		SystemManagerClient.waitForBootStage("authentication", "stageEntered", () => {
			RouterClient.publish(Constants.APPLICATION_STATE_CHANNEL, { state: "authenticating" });
		});

		SystemManagerClient.waitForBootStage("authentication", "stageCompleted", () => {
			RouterClient.publish(Constants.APPLICATION_STATE_CHANNEL, { state: "authenticated" });
		});

		// have to decide when the application state is ready -- change it to ready here when preuser stage is done (before starting earlyuser stage)
		SystemManagerClient.waitForBootStage("user", "stageEntered", () => {
			RouterClient.publish(Constants.APPLICATION_STATE_CHANNEL, { state: "ready" });
		});

		doneCallback("initializeSystemStateHandersTask", "bootTasks", "completed")
	}

	/**
	 * Handler for messages coming in from individual services. It receives the message and pushes out the data to the rest of the system. Used by dependencymanager.
	 */
	private handleServiceStateChange(params) {
		let serviceName: string = params.name;
		let serviceState: ServiceState = params.state;
		this.ServiceStates[serviceName] = {
			state: serviceState
		}
		let firstLogArg = `SERVICE LIFECYCLE: STATE CHANGE: Service ${serviceState}`;
		Logger.system.log(firstLogArg, serviceName);

		//Two messages go out.
		//1. Individual service state. "Hey, logger is ready".
		RouterClient.publish(`Finsemble.Service.State.${serviceName}`, { state: serviceState });
		//2. Aggregate service state, keyed by service name. "Hey here's the state of all services.".
		RouterClient.publish(Constants.SERVICES_STATE_CHANNEL, this.ServiceStates);
	}

}
