/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import Logger from "../../../clients/logger";
import { BootTaskCallbackInterface } from "../_types";
import SearchClient from "../../../clients/searchClient";
import LauncherClient from "../../../clients/launcherClient";
import * as Fuse from "fuse.js";
import RouterClient from "../../../clients/routerClientInstance";
import ConfigClient from "../../../clients/configClient";
import * as merge from "deepmerge";

/**
 * Boot task that registers a component launcher as search provider with the search client. This way, people can search and we can return a list of components that they can spawn.
 * Can assume LauncherClient is ready when this task runs.
 * @param {*} cb
 * @private
 */
export class SetupSearchLauncherTask {
	componentArray: any = [];

	constructor() {

		SearchClient.initialize();

		// can assume all clients but SearchClient are initialized and ready
		RouterClient.addListener("Launcher.update", (err, response) => {
			Logger.debug("SetupSearchLauncherTask component list updated", err, response);
			if (!err) {
				this.componentArray = this.getRefinedComponentData(response.data.componentList); // update component list (needed for dynamic config)
			}
		});

	}

	/**
	 * Retrieves a list of components and put it in the correct format for searching.
	 * @param {function} cb callback.
	 * @returns array of refined components config
	 * @private
	 */
	private getRefinedComponentData(components): object[] {
		let refinedComponents = [];

		for (let componentType in components) {
			let oneConfig = components[componentType];

			if (!oneConfig.foreign) {
				oneConfig.foreign = {};
			}
			if (!oneConfig.component) {
				oneConfig.component = {};
			}
			oneConfig.component.type = componentType;

			refinedComponents.push(oneConfig);
			Logger.system.debug("setupSearchLauncherTask oneConfig", componentType, oneConfig);
		}
		Logger.system.debug("setupSearchLauncherTask refinedComponents", refinedComponents);
		return refinedComponents;
	}

	/**
	 * Starts boot task for setting up search launcher
	 * @param doneCallback
	 */
	public async start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("setupSearchLauncherTask start");

		let { data: servicesConfig } = await ConfigClient.getValue({ field: "finsemble.servicesConfig" });
		let { data: components } = await ConfigClient.getValue({ field: "finsemble.components" });

		this.componentArray = this.getRefinedComponentData(components);

		Logger.system.debug("setupSearchLauncherTask config", servicesConfig, this.componentArray);

		/**
		 * Register Search here
		 * We'll look into the config for the provider callback component and it's title
		 */
		let providerAction = {
			title: null,
			providerActionComponent: null
		};
		if (servicesConfig && servicesConfig.launcher && servicesConfig.launcher.searchProviderAction) {
			providerAction.title = servicesConfig.launcher.searchProviderAction.title;
			providerAction.providerActionComponent = servicesConfig.launcher.searchProviderAction.component;
		}

		SearchClient.onReady(() => {
			SearchClient.register({
				name: "Installed Components",
				searchCallback: this.searchComponents.bind(this),
				itemActionCallback: this.searchActions.bind(this),
				providerActionTitle: providerAction.title,
				providerActionCallback: function (calledWindow) {
					Logger.system.debug("setupSearchLauncherTask providerActionCallback", calledWindow);
					calledWindow = calledWindow.replace("RouterClient.", "");
					LauncherClient.spawn(providerAction.providerActionComponent, {
						addToWorkspace: true,
						monitor: "mine",
						relativeWindow: { windowName: calledWindow }
					}, Function.prototype);
				}
			}, () => {
				doneCallback("setupSearchLauncherTask", "bootTasks", "completed")
			});
		});
	}


	/**
	 *Returns a list of installed components based off of a search string.
	 *@param {object} params
	 *@param {string} params.text The search text
	 *
	 */
	private searchComponents(params, cb) {
		var results = [];
		var fuseResults;
		var options:Fuse.FuseOptions<any> = {
			shouldSort: true,
			includeScore: true,
			includeMatches: true,
			threshold: 0.4,
			location: 0,
			distance: 100,
			maxPatternLength: 32,
			minMatchCharLength: 1,
			keys: [
				"component.displayName",
				"component.type"
			]
		};

		ConfigClient.getValue({ field: "finsemble.servicesConfig.launcher.search" }, (err, configComponentSearch) => {
			/*
			* Check if this search provider is enabled, and merge configuration with defaults
			*/
			if (configComponentSearch != null) {
				if (configComponentSearch.hasOwnProperty("enabled") && !configComponentSearch.enabled) {
					cb(null, []);
					return;
				}
				if (configComponentSearch.hasOwnProperty("options")) {
					options = merge(options, configComponentSearch.options);
				}
			}

			//Fuse is a 3rd party search library. We pass in the search string and look on component type, then return an object needed to display the results.
			var fuse = new Fuse(this.componentArray, options);
			if (!params.text.length) {
				fuseResults = JSON.parse(JSON.stringify(this.componentArray)); // hack since fuse won't allow wildcard/no character
			} else {
				fuseResults = fuse.search(params.text);
			}

			for (var i = 0; i < fuseResults.length; i++) {
				var result = fuseResults[i];
				if (!result.item && !params.text.length) { // another hack senice we don't use fuse when there isn't search text
					result.item = result;
				}
				if (result.item.foreign &&
					result.item.foreign.components &&
					result.item.foreign.components["App Launcher"] &&
					result.item.foreign.components["App Launcher"].launchableByUser) {
					var icon = null;
					if (result.item.window.icon) {
						icon = { type: "url", path: result.item.window.icon };
					}
					if (!icon && result.item.foreign &&
						result.item.foreign.components &&
						result.item.foreign.components.Toolbar) {
						if (result.item.foreign.components.Toolbar.iconClass) {
							icon = {
								type: "fonticon",
								path: result.item.foreign.components.Toolbar.iconClass
							};
						} else if (result.item.foreign.components.Toolbar.iconURL)
							icon = {
								type: "url",
								path: result.item.foreign.components.Toolbar.iconURL
							};
					}

					results.push({
						name: result.item.component.type,
						displayName: result.item.component.displayName || result.item.component.type,
						score: result.score,
						matches: result.matches,
						icon: icon,
						type: "Application",
						description: "",
						actions: [{ name: "Spawn" }],
						tags: []
					});
				}

			}
			cb(null, results);
		});
	}

	/**
	 * This is the callback when a component is clicked in the search results. They click, we spawn.
	 * @param {*} params
	 * @param {*} calledWindow
	 */
	private searchActions(params, calledWindow) {
		calledWindow = calledWindow.replace("RouterClient.", "");
		if (!params.action) return;
		if (!params.item) return;
		if (params.action.name === "Spawn") {
			LauncherClient.spawn(params.item.name, {
				addToWorkspace: true,
				monitor: "mine",
				relativeWindow: { windowName: calledWindow }
			}, Function.prototype);
		}
	}

}
