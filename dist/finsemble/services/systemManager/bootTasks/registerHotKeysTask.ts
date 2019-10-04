/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import Logger from "../../../clients/logger";
import LauncherClient from "../../../clients/launcherClient";
import HotkeyClient from "../../../clients/hotkeysClient";
import ConfigClient from "../../../clients/configClient";
import { BootTaskCallbackInterface } from "../_types";

/**
 * Boot task that registers hotkeys based on config settings
 * @private
 */
export class RegisterHotkeysTask {

	public async start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("registerHotkeysTask start");

		let { data: components } = await ConfigClient.getValue({ field: "finsemble.components" });

		let componentNames = Object.keys(components);
		const processComponent = (componentName) => {
			let cmp = components[componentName];
			if (cmp.component && cmp.component.spawnOnHotkey) {
				const spawnComponentOnHotkey = () => {
					LauncherClient.spawn(componentName, {
						addToWorkspace: true,
						monitor: "primary"
					}, Function.prototype);
				};
				//When the key combo is pressed, spawn the component.
				HotkeyClient.addGlobalHotkey(cmp.component.spawnOnHotkey, spawnComponentOnHotkey);
			}
		};

		componentNames.forEach(processComponent);
		doneCallback("registerHotkeysTask", "bootTasks", "completed")

	}
}
