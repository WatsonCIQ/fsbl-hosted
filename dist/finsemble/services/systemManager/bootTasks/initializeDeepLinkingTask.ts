/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";
import { BootTaskCallbackInterface } from "../_types";
import { System } from "../../../common/system";

/**
 * Boot task that intializes the handlers for System Manaager API (see common/systemManagerClient)
 * @private
 */
export class InitializeDeepLinkingTask {

	public start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("initializeDeepLinkingTask start");


		/**
		 *  Parses parameters appended to the url in the startup section of Finsemble's configuration json file (manifest-local.json by default) and
		 *  appended to the json field in server-environment-startup.json (also manifest-local.json by default).		 *
		 *  Sends these parameters to new topic that can be used to handle custom launching behavior.
		 *  Required format examples:
		 *  Appended to url in json configuration file: http://startup-url.html?parameter1=value1&parameter2=value2
		 *  Appended to config json file: http://mydomain.com/configs/openfin/manifest-local.json?$$parameter1=value1&$$paramater2=value2
		 *
		 * Both locations are not required to have parameters, but if both are used all parameters will be published.
		 *
		*/
		if (window.location.search) {
			var search = window.location.search.substring(1);
			try {
				search = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
				RouterClient.onReady(() => {
					RouterClient.publish('Finsemble.openfin-url', search);
				});
			} catch {
				Logger.system.error('Received Invalid Properties from Protocol Handler', search);
			}
		}

		/**
		 *  Catches run-requested event to launch openfin app inside finsemble when a url is hit from fin://.
		 *  This event is only fired for Finsemble if the same json config file is used in the url (manifest-local.json).
		 *  Additional parameters can be passed in at the end of the url that can be used to handle app launching.
		 *  These parameters are published in a topic created for this case.
		 *  Required format: fins://mydomain.com/configs/openfin/manifest-local.json?$$parameter1=value1&$$paramater2=value2
		*/
		System.Application.getCurrent().addEventListener('run-requested', (event) => {
			let args = event.userAppConfigArgs;
			if (args) {
				//event.userAppConfigArgs is a string in OpenFin 8 and an object in OpenFin 9. Convert it to an object if it's a string and can be converted.
				if (typeof args === "string") {
					try {
						const argsObject = JSON.parse('{"' + decodeURI(args).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
						args = argsObject
					} catch {
						Logger.system.error('Received Invalid Properties from Protocol Handler. Defaulting to the original string.', args);
					}
				}
				RouterClient.onReady(() => {
					RouterClient.publish('Finsemble.openfin-url', search);
				});
			}
		});

		doneCallback("initializeDeepLinkingTask", "bootTasks", "completed")
	}

}
