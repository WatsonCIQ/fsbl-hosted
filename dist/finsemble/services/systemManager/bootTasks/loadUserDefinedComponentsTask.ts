/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import Logger from "../../../clients/logger";
import LauncherClient from "../../../clients/launcherClient";
import StorageClient from "../../../clients/storageClient";
import { BootTaskCallbackInterface } from "../_types";
import { BootEngine } from "../bootEngine";
import { SystemLog } from "../systemLog";
import { forEach as asyncForEach } from "async";

/**
 * Boot task that initializes any user-defined components using config settings
 * @private
 */
export class LoadUserDefinedComponentsTask {

	public start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("loadUserDefinedComponentsTask start");
		StorageClient.onReady(() => {
			StorageClient.get({ topic: "finsemble", key: "userDefinedComponents" }, (err, response) => {
				var data = response || {};
				if (err) {
					Logger.system.debug("loadUserDefinedComponentsTask error", err);
					doneCallback("loadUserDefinedComponentsTask", "bootTasks", "failed")
				} else {
					let udComponents = Object.keys(data);
					asyncForEach(udComponents, (key, done) => {
						let component = data[key];
						LauncherClient.addUserDefinedComponent({
							name: component.component.type,
							url: component.window.url
						}, done);
					}, () => {
						doneCallback("loadUserDefinedComponentsTask", "bootTasks", "completed")
					});
				}
			});
		});
	};
}
