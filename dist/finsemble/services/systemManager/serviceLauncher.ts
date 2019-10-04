// this code was pulled out of old service manager

import Logger from "../../clients/logger";
import { System } from "../../common/system";
import merge = require("deepmerge");
import SplinterAgentPool from "../window/Splintering/SplinterAgentPool";
import SpawnUtils from "../../services/window/Common/spawnUtils";
import { guuid } from "../../common/util";

const _get = require("lodash.get");
const merge = require("deepmerge");

/**
 * Launcher services in various config-driven forms
 */
export class ServiceLauncher {
	runningServices: object = {};
	finUUID: object;
	manifest: any;
	workerTop:number = 100;
	workerLeft:number = 100;
	webWorkers: object = {};
	FinsembleUUID: object;
	shutdownManager: any;
	finsembleConfig: any;

	constructor(params) {
		this.finUUID = params.finUUID;
		this.manifest = params.manifest;
		this.finsembleConfig = params.manifest.finsemble;
		this.shutdownManager = params.shutdownManager;

		this.FinsembleUUID = guuid();
	}

	public updateManifest(manifest) {
		this.manifest = manifest;
	}

	/**
	 * Returns the config for the given service. This is used only for *core* services: router, config, dataStore, logger.
	 * Core services are those that come up before the config system is initialized.
	 *
	 * This function will combine configs from requiredServices, services, and servicesConfig entries.
	 * @param {string} serviceName The name of the service
	 * @returns {any} The config entry for the service or an empty object if the configuration isn't found.
	 */
	public getServiceConfig(serviceName): any {
		let rawServiceName = serviceName;
		// Normalize the rawServiceName by removing "Service", for instance from "routerService"
		let suffixPosition = rawServiceName.indexOf("Service");
		if (suffixPosition !== -1) rawServiceName = rawServiceName.substring(0, suffixPosition);

		let fullServiceName = rawServiceName + "Service";

		// Service configs can be found in four separate config files across finsemble and finsemble-seed
		// They are loaded in two stages: boot and core. At the boot stage, only the built in configs and the manifest are available

		// Get the default config for this service, from finsemble.requiredServicesConfig
		// This can be found in finsemble/configs/config.json
		//
		// Next, if we're at the stage where "services" configuration is loaded, use those values to override anything from requiredServices.
		// This can be found in finsemble/configs/services.json
		//
		// Finally, if there is a finsemble.servicesConfig entry then copy the values over our default.
		// These would be developer overrides of the finsemble defaults, from finsemble-seed configs
		// For core services (router, config, logging, dataStore) these entries can be added in finsemble-seed/configs/openfin/manifest-local.json
		// For other services these entries can be added to finsemble-seed/configs/config.json
		let config = this.mergeConfig([
			{ path: "system.requiredServicesConfig", entry: fullServiceName },
			{ path: "system.requiredServicesConfig", entry: rawServiceName },
			{ path: "services", entry: fullServiceName },
			{ path: "services", entry: rawServiceName },
			{ path: "servicesConfig", entry: fullServiceName },
			{ path: "servicesConfig", entry: rawServiceName }
		]);

		return config;
	}

	/**
	 * Creates a service, either as a script, window or process.
	 */
	/**
	 * Creates service
	 * @param worker
	 * @param {SplinterAgentPool=} splinterAgentPool is optional for when the service should be splintered (after config is available)
	 * @returns
	 */
	public createService(worker, splinterAgentPool?: SplinterAgentPool) {
		// Makes certain that a service isn't started more than once. This can happen because of the multiple entry points for services (requiredServicesConfig, services and servicesConfig).
		if (this.runningServices[worker.name]) return;
		this.runningServices[worker.name] = true;

		Logger.system.debug("createService", worker);
		worker.parentUuid = this.finUUID;
		let workerConfig = this.composeWorkerConfig(worker);

		let spawnAs = workerConfig.spawnAs;
		if (!spawnAs && workerConfig.isolate) spawnAs = "process"; // Deprecated `"isolate":true` is the same as `"spawnAs":"process"`
		if (!spawnAs) spawnAs = "window"; // Default is to spawn as a window

		switch (spawnAs) {
			case "window":
				this.launchServiceAsWindow(worker, workerConfig, splinterAgentPool);
				break;
			case "process":
				this.launchServiceAsProcess(worker, workerConfig);
				break;
			case "script":
				this.launchServiceAsScript(worker, workerConfig);
				break;
			case "thread":
				this.launchServiceAsThread(worker, workerConfig);
			break;
		}

		//So that windows are staggered when visible.
		this.workerTop += 25;
		this.workerLeft += 25;
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// The remaining methods are private
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Helper function to search through the config for a list of path,entry tuples and merge them all together.
	 * Use this when you need a series of configs to override one another but with the results merged together.
	 *
	 * @param {array} arr Array of path,entry tuples
	 * @returns {any} Returns a config object, or an empty object if no config is found.
	 */
	private mergeConfig(arr : {path:string,entry:string}[]) : any{
		let config = {};

		arr.forEach((element) => {
			// Use lodash to get an object by path, or return empty string if no such object
			// Then use deepmerge to merge into the container object
			config = merge(config, _get(this.finsembleConfig, element.path + "." + element.entry, {}));
		});
		return config;
	}

	// Launches a service as a <script> tag that is injected into serviceManager.html
	private launchServiceAsScript(worker, workerConfig) {
		let url = worker.file;
		let script = document.createElement("script");
		script.setAttribute("src", url);
		document.head.appendChild(script);
	}

	// Launches a service as a web worker, giving it a dedicated thread.
	// This currently does not work because Electron cannot preload the fin object into web workers.
	// Implement this when Electron fixes this issue
	// https://github.com/electron/electron/issues/12505
	private launchServiceAsThread(worker, workerConfig) {
		let url = worker.file;

		// The webWorker references is stored in this.webWorkers so that we can terminate it later
		this.webWorkers[workerConfig.name] = new Worker(url);
	}

	// Launches a service as a window. This will make it a child window off of serviceManager.html (following "affinity" or splintering rules like any other window)
	private launchServiceAsWindow(worker, workerConfig, splinterAgentPool) {
		if (splinterAgentPool) {
			workerConfig.uuid = (worker.uuid || workerConfig.name);
			workerConfig.componentType = workerConfig.name;
			splinterAgentPool.routeSpawnRequest(workerConfig, this.onServiceCreated);
		} else {
			let finWindow = new System.Window(workerConfig, () => {
				let winWrap = System.Window.wrap(workerConfig.name, workerConfig.uuid);
				this.onServiceCreated(winWrap);
			}, this.onServiceCreationError);
		}
	}

	// Launches a service as a window with a dedicated process. This is of type "Application" in openfin or e2o land.
	private launchServiceAsProcess(worker, workerConfig) {
		// Note that OF Applications have no concept of name. So the window.name of an application is the same as the uuid. This causes problems when the uuid/name here dont match. This is why all services must pass in a name to the base service constructor.
		workerConfig.uuid = workerConfig.name + "-" + this.finUUID;
		workerConfig.parentUUID = this.finUUID;
		console.info(workerConfig.name, workerConfig);
		const app = new System.Application(workerConfig, () => {
			/** Because we mess with the `this` of System.Application, the compiler loses
				 * track of `app`'s type, so we have to cast here.
				 */
			(app as fin.OpenFinApplication).run();
			const winWrap = System.Window.wrap(workerConfig.uuid, workerConfig.uuid);
			this.onServiceCreated(winWrap);
			this.shutdownManager.addAppToShutdownList(app)
		});
	}

	private composeWorkerConfig(worker) {
		this.manifest.finsemble.FinsembleUUID = this.FinsembleUUID; // pass FinsembleUUID on to new windows though manifest

		let customData = merge(worker, { manifest: this.manifest });

		let defaultWD = {
			url: worker.external ? worker.html : worker.html || "base.html",
			name: worker.name,
			defaultTop: this.workerTop,
			defaultLeft: this.workerLeft,
			autoShow: worker.visible,
			frame: worker.frame,
			customData: customData,
			alwaysOnTop: false,
			fixedPosition: false,
			saveWindowState: false,
			cornerRounding: true,
			waitForPageLoad: true,
			isolate: worker.isolate,
			spawnAs: worker.spawnAs,
			affinity: worker.affinity,
			securityPolicy: worker.securityPolicy || null,
			permissions: worker.permissions || {},
			icon: this.manifest.startup_app ? this.manifest.startup_app.applicationIcon : null
		};

		let descriptor = merge(defaultWD, worker.window || {});
		// If the required services aren't up, we can't actually look up security policies. The required services should all have unfettered permissions.
		if (this.finsembleConfig.securityPolicies) {
			descriptor.securityPolicy = SpawnUtils.getSecurityPolicy(descriptor, this.finsembleConfig);
			descriptor.permissions = SpawnUtils.getPermissions(descriptor, this.finsembleConfig);
		}

		return descriptor;
	}


	/**
	 * When the worker is created, this function is invoked. From here, we establish communication with the service, and set up event handlers.
	 * @param {*} finWindow
	 */
	private onServiceCreated(finWindow) {
		Logger.system.debug("OnworkerCreated", finWindow.name);

		finWindow.addEventListener("reloaded", function (e) {
			Logger.system.debug("Service Reloaded", finWindow.name);
		});
	}

	private onServiceCreationError (err) {
		Logger.system.error("error", err);
	}
}