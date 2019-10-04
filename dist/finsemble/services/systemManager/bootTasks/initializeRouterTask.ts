/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";
import { BootTaskCallbackInterface } from "../_types";
import { ConfigUtilInstance as ConfigUtil } from "../../../common/configUtil";
import { System } from "../../../common/system";
import { ServiceLauncher } from "../serviceLauncher";

/**
 * Boot task that intializes the router service.  Waits for RouterClient to be ready.
 * @private
 */
export class InitializeRouterTask {
	finsembleConfig: object;
	serviceLauncher: ServiceLauncher;

	constructor(params) {
		this.finsembleConfig = params.manifest.finsemble;
		this.serviceLauncher = params.serviceLauncher;
	}

	public start(doneCallback: BootTaskCallbackInterface) {
		var finConfig = this.finsembleConfig;
		let routerServiceConfig = this.serviceLauncher.getServiceConfig("router");

		var isElectron = fin && fin.container == "Electron";
		var sameDomainTransport = ConfigUtil.getDefault(finConfig, "finConfig.router.sameDomainTransport", "SharedWorker");
		var crossDomainTransport = ConfigUtil.getDefault(finConfig, "finConfig.router.crossDomainTransport", isElectron ? "FinsembleTransport" : "OpenFinBus");
		var shouldLaunchRouterServer = (sameDomainTransport === "FinsembleTransport") || (crossDomainTransport === "FinsembleTransport");
		shouldLaunchRouterServer = !isElectron && shouldLaunchRouterServer;
		Logger.system.log("initializeRouterService", routerServiceConfig, sameDomainTransport, crossDomainTransport, shouldLaunchRouterServer);

		if (shouldLaunchRouterServer) {
			/** @TODO - split into two separate vars for clarity. */
			let ftServerAddress = ConfigUtil.getDefault(finConfig, "finConfig.router.transportSettings.FinsembleTransport.serverAddress",
				ConfigUtil.getDefault(finConfig, "finConfig.IAC.serverAddress","ws://127.0.0.1:3376")
			)
			let ftServerPort = ftServerAddress.substring(ftServerAddress.lastIndexOf(":") + 1); // extract port from address
			if (ftServerPort > 0 && ftServerPort < 65535) { // if legal port
				//<any> is a hack until openfin fixes their type definition. 'lifetime' isn't a valid prop.
				System.launchExternalProcess(<any>{
					"alias": "FinsembleRouter",
					arguments: "PORT " + ftServerPort,
					lifetype: "window", //@ts-ignore
					listener: function (event) {
						if (event.topic === "exited") {
							Logger.system.warn("APPLICATION LIFECYCLE: FinsembleTransport Server Exited", ftServerPort, event);
						}
					}
				}, (payload) => {
					Logger.system.log("FinsembleTransport Server Launched", payload, ftServerAddress);
					this.serviceLauncher.createService(routerServiceConfig);
				}, (err) => {
					Logger.system.error("FinsembleTransport launchExternalProcess error.", err);
					this.serviceLauncher.createService(routerServiceConfig); // go ahead and create anyway -- router may not use FinsembleTransport
				});
			} else {
				Logger.system.error("FinsembleTransport illegal port", ftServerPort);
				this.serviceLauncher.createService(routerServiceConfig); // go ahead and create anyway -- router may not use FinsembleTransport
			}
		} else {
			this.serviceLauncher.createService(routerServiceConfig);
		}

		// wait until client is ready before signaling done
		RouterClient.onReady(() => {
			doneCallback("initializeRouterTask", "bootTasks", "completed")
		});
	}

}
