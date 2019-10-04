import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";
import { FinsembleWindowInternal } from "../WindowAbstractions/FinsembleWindowInternal";

import DistributedStoreClient from "../../../clients/distributedStoreClient";
import SplinterAgentPool from "../Splintering/SplinterAgentPool";
import { WrapManager as MyWrapManager } from "./WrapManager";
import { WindowPoolSingleton } from "../Common/Pools/PoolSingletons";
import { onSpawnRequest as SplinterAgentDoSpawnRequest } from "../Splintering/SplinterAgentSlave";

import { series as asyncSeries } from "async"
import * as util from "../../../common/util";
import { System } from "../../../common/system";

export class CreateSplinterAndInject {
	finsembleConfig: any;
	eventInterruptors: any;
	ALLOW_SPLINTERING: boolean;
	manifest: any;
	SplinterAgentPool: any;
	windowStore: any;
	stackedWindowManager: any;

	constructor(manifest, stackedWindowManager) {
		this.manifest = manifest;
		this.stackedWindowManager = stackedWindowManager;
		this.finsembleConfig = manifest.finsemble;
		this.bindAllFunctions();
		this.eventInterruptors = {};
	}

	initialize(callback = Function.prototype) {
		const initializePromiseResolver = async (resolve) => {
			await this.processConfig();
			await this.createStores();
			await this.createSplinterAgentPool();
			resolve();
			callback();
		}
		return new Promise(initializePromiseResolver);
	}

	windowServiceChannelName(channelTopic) { return `WindowService-Request-${channelTopic}`; }

	bindAllFunctions() {
		let self = this;
		for (let name of Object.getOwnPropertyNames(Object.getPrototypeOf(self))) {
			if (self[name] instanceof Function) {
				self[name] = self[name].bind(self); // only bind function properties
			}
		}
	}

	// invoked by serviceEntryPoint shutdown
	shutdown(done) {
		this.shutdownSplinterAgentPool(done);
	}

	async createWindow(params, callback = Function.prototype) {
		var realWindowIdentifier;
		var wrapState: WrapState;

		Logger.system.debug(`CreateSplinterAndInject.createWindow for ${params.windowDescriptor.name}`, params);

		let { windowDescriptor } = params;
		if (!windowDescriptor) {
			Logger.system.error(`no windowDescriptor for WindowService-Request.createWindow`);
		}

		let { err, windowIdentifier } = await this.doSpawn(windowDescriptor);

		if (err) {
			Logger.system.error("COMPONENT LIFECYCLE: createWindow error: ", err);
			callback(err);
		} else {
			realWindowIdentifier = {
				name: windowIdentifier.name,
				windowName: windowIdentifier.windowName,
				uuid: windowIdentifier.uuid,
			}

			wrapState = "created";
			Logger.system.log("COMPONENT LIFECYCLE: STATE CHANGE: ", wrapState, windowIdentifier.windowName);
			RouterClient.publish("Finsemble.Component.State." + windowIdentifier.windowName, { state: wrapState });

			let { wrap } = await FinsembleWindowInternal.getInstance({ waitForReady: false, name: realWindowIdentifier.name || realWindowIdentifier.windowName });
			WindowPoolSingleton.add(windowIdentifier.name, wrap);

			wrapState = "ready";
			Logger.system.log("COMPONENT LIFECYCLE: STATE CHANGE: ", wrapState, windowIdentifier.name);
			RouterClient.publish("Finsemble.Component.State." + windowIdentifier.name, { state: wrapState });
		}
		callback(err, realWindowIdentifier);
	}

	// probably only a temporary routine -- currently supports public wrapper
	async getWindowIdentifier(params, callback) {
		Logger.system.debug(`"CreateSplinterAndInject.getWindowIdentifier for  ${params.windowName}`, params);
		let { err, data } = await MyWrapManager.get(params);
		callback(err, data);
	}

	// may replace with preload
	async injectTitleBar(params, callback) {
		Logger.system.debug(`"CreateSplinterAndInject.injectTitleBar ${params.config.name}`, params);
		this.doTitleBarInjection(params, function (err, data) {
			callback(err, data);
		});
	}

	doTitleBarInjection(data, cb) {
		var config = data.config.customData; //why?
		var component = data.titleComponent;
		var win: any = System.Window.wrap(data.config.uuid || data.config.windowIdentifier.uuid, data.config.name || data.config.windowIdentifier.name); //TODO: need to figure out why this differs
		//var baseURL = finsembleConfig.moduleRoot;
		var request = new XMLHttpRequest();
		const onReadyStateChange = function () {
			if (request.readyState === 4) {
				const execJsSuccess = function () {
					Logger.system.debug("inject header successful", component);
					cb();
				};
				const execJsError = function (err) {
					var errMsg = `inject header failed: ${err}  for ${component}`;
					Logger.system.error(errMsg);
					cb(errMsg);
				};

				win.executeJavaScript(request.responseText, execJsSuccess, execJsError);
			}
		};

		if (!config.window || !config.window.compound) { // why are we relying on the data for the config? we should already have the config here.
			// Inject the titlebar URL contents directly into the finWindow
			//request.open("GET", Components[component].window.url, false);
			var urlToInject = this.manifest.finsemble.components[component].window.url;
			Logger.system.debug("getting header to inject", component, urlToInject);
			request.open("GET", urlToInject, false);
			request.onreadystatechange = onReadyStateChange;
			return request.send();
		}
	}

	async processConfig() {
		Logger.system.debug("CreateSplinterAndInject.processConfig");

		const promiseResolver = async (resolve) => {
			var splinteringConfig = this.finsembleConfig.splinteringConfig;
			let { versionObject } = await util.getOpenfinVersion();
			//Due to a bug in chromium 53, we can't splinter _and_ spawn child windows (quickly) without crashing render processes. This was fixed somewhere between chromium 53 and 56, and the bug does not present in OF version 8.
			this.ALLOW_SPLINTERING = versionObject.major > 7 && fin.container !== "Electron" && splinteringConfig.enabled;
			resolve();
		};
		return new Promise(promiseResolver);
	}

	createStores() { // TBD: is this store creation really needed?
		Logger.system.debug("CreateSplinterAndInject.createStores");
		const promiseResolver = async (resolve) => {
			Logger.system.debug("CreateSplinterAndInject: createGroupStore");
			let onStoreClientReady = async () => {
				const { err: e2, data: windowStore } = await DistributedStoreClient.createStore({ store: "Finsemble-Windows", global: true });
				if (e2) return Logger.system.error(e2);

				this.windowStore = windowStore;
				resolve();
			};

			DistributedStoreClient.onReady(onStoreClientReady);
		}
		return new Promise(promiseResolver);
	}

	doSpawn(windowDescriptor: any): Promise<{ err: any, windowIdentifier: any }> {
		const promiseResolver = async (resolve) => {
			let windowType = windowDescriptor.customData.window.windowType;
			if (windowType == "openfin") windowType = "OpenFinWindow"; // Config friendly naming
			if (windowType == "assimilation") windowType = "NativeWindow"; // Config friendly naming
			if (windowType == "assimilated") windowType = "NativeWindow"; // Config friendly naming
			if (windowType == "native") windowType = "FinsembleNativeWindow"; // Config friendly naming
			if (windowType == "application") windowType = "OpenFinApplication"; // Config friendly naming
			if (windowDescriptor.customData.window.native) windowType = "NativeWindow"; //Backward Compatibility
			if (windowDescriptor.type === "openfinApplication") windowType = "OpenFinApplication"; //Backward Compatibility
			if (windowDescriptor.customData.window.compound) windowType = "CompoundWindow";
			if (!windowType) windowType = "OpenFinWindow";

			if (windowType == "FinsembleNativeWindow") {
				windowType = "NativeWindow";
				windowDescriptor.isWPF = true;

				// If running on Electron, Finsemble aware applications will need the IAC server address.
				const iacConfig = this.finsembleConfig.IAC;
				if (iacConfig) {
					// If IAC config exists, pass it on to the window descriptor
					windowDescriptor.IAC = iacConfig;
				}
			}

			windowDescriptor.uuid = windowDescriptor.uuid || util.guuid(); // Temp fix for stackedWindow (whole section needs rework)

			// By default, any OpenFin windows that are opened cross-domain are opened as an "application" rather than a "window".
			// This forces OpenFin to recognize them as applications, and thus they will show up in process monitor.
			// If we don't do this, then chromium creates them as new applications under the sheets but they don't show up in process monitor.
			// A developer can set isolateCrossDomainComponents=false to override this behavior if for some reason they need to.
			var dontIsolateCrossDomain = (this.finsembleConfig.isolateCrossDomainComponents === false);
			if (windowType === "OpenFinWindow" && !dontIsolateCrossDomain) {
				//Push cross domain windows into their own process.
				if (util.crossDomain(windowDescriptor.url)) {
					windowType = "OpenFinApplication";
				}
			}

			windowDescriptor.windowType = windowType;
			Logger.system.debug("WindowService.doSpawn", windowDescriptor, windowType);
			// Hack to get the wrap before it's ready. Added by ryan, commit d781a.
			let result = {
				windowIdentifier: {
					windowName: windowDescriptor.name,
					uuid: windowDescriptor.uuid,
					componentType: windowDescriptor.componentType,
					monitor: windowDescriptor.monitorInfo,
					windowType: windowDescriptor.windowType
				},
				windowDescriptor: windowDescriptor
			};

			MyWrapManager.add(result);
			Logger.system.debug("WindowService.doSpawn-time before", windowType, windowDescriptor.name);

			switch (windowType) {
				case "NativeWindow":
					var { data } = await this.spawnExternalWindow(windowDescriptor);
					MyWrapManager.setUuid(result.windowIdentifier.windowName, data.uuid);
					break;
				case "OpenFinWindow":
					if (this.ALLOW_SPLINTERING) {
						Logger.system.debug("WindowService.doSpawn-time splinter", windowType, windowDescriptor.name);
						var { data } = await this.splinter(windowDescriptor);
					} else {
						var { data } = await this.spawnOpenFinWindow(windowDescriptor);
					}
					MyWrapManager.setUuid(result.windowIdentifier.windowName, data.uuid);
					break;
				case "OpenFinApplication":
					var { data } = await this.spawnOpenfinApplication(windowDescriptor);
					MyWrapManager.setUuid(result.windowIdentifier.windowName, data.uuid);

					break;
				case "StackedWindow":
					var { data } = await this.spawnStackedWindow(windowDescriptor);
					break;
			}
			// makes sure both types of names are set -- will delete later after naming cleanup
			data.name = data.name || data.windowName;
			data.windowName = data.name;

			Logger.system.debug("WindowService.doSpawn-time end", windowType, windowDescriptor.name, data);

			resolve({ err: null, windowIdentifier: data });
		}

		return new Promise(promiseResolver);
	}

	spawnExternalWindow(windowDescriptor): Promise<{ err: any, data: any }> {
		const promiseResolver = (resolve) => {
			function spawnedListener(err, response) {
				RouterClient.removeListener(windowDescriptor.name + ".onSpawned", spawnedListener);
				windowDescriptor.uuid = response.data.uuid;
				let fw = windowDescriptor;
				// @TODO, capture close event and remove from our activeWindows
				resolve({ err: null, data: fw });
			}
			RouterClient.addListener(windowDescriptor.name + ".onSpawned", spawnedListener);
			RouterClient.query("Assimilation.spawnNative", windowDescriptor, function() { });
		}
		return new Promise(promiseResolver);
	}

	// Spawns a java app.
	spawnNativeWindow(windowDescriptor): Promise<{ err: any, data: any }> {
		const promiseResolver = (resolve) => {

			function spawnedListener(err, response) {
				windowDescriptor = Object.assign(windowDescriptor, response.data);
				RouterClient.removeListener(windowDescriptor.name + ".onSpawned", spawnedListener);
				// @TODO, capture close event and remove from our activeWindows
				resolve({ err: null, data: windowDescriptor });
			}

			RouterClient.addListener(windowDescriptor.name + ".onSpawned", spawnedListener);
			RouterClient.query("FinsembleNative.spawn", windowDescriptor, (err, cb) => { });
		};
		return new Promise(promiseResolver);

	}

	// Spawns an OpenFin window
	spawnOpenFinWindow(windowDescriptor): Promise<{ err: any, data: any }> {
		// This will ensure that the window is actually opened before returning. Seemingly an OpenFin bug means we
		// can't rely on new System.Window callback. We believe this exhibits for cross-domain windows.
		const promiseResolver = (resolve) => {
			windowDescriptor.taskbarIconGroup = windowDescriptor.external ? null : this.manifest.startup_app.uuid;
			windowDescriptor.icon = windowDescriptor.external ? null : this.manifest.startup_app.applicationIcon;
			windowDescriptor.uuid = windowDescriptor.uuid || System.Application.getCurrent().uuid;
			let fw;
			let spawnedListener = (err, response) => {
				if (!fw) {
					fw = System.Window.wrap(windowDescriptor.uuid, windowDescriptor.name);
					fw.addEventListener("closed", () => {
						RouterClient.removeListener(windowDescriptor.name + ".onSpawned", spawnedListener);
					});
				}
				this.injectMindControl(windowDescriptor, fw);
				resolve({ err: null, data: fw });
			}

			RouterClient.addListener(windowDescriptor.name + ".onSpawned", spawnedListener);
			new System.Window(windowDescriptor, function () { });
		};

		return new Promise(promiseResolver);
	}

	// Spawns a new openfin application.
	spawnOpenfinApplication(componentConfig): Promise<{ err: any, data: any }> {
		let descriptor = this.compileOpenfinApplicationDescriptor(componentConfig);
		const self = this;

		const promiseResolver = (resolve) => {
			let fw;
			const onAppSpawned = () => {
				if (!fw) {
					fw = System.Window.wrap(descriptor.uuid, descriptor.name);
					fw.addEventListener("closed", () => {
						RouterClient.removeListener(descriptor.name + ".onSpawned", onAppSpawned);
					});
				}
				self.injectMindControl(descriptor, fw);
				resolve({ err: null, data: fw });
			};

			let finApp = new System.Application(descriptor,
				function onAppCreated() {
					RouterClient.addListener(descriptor.name + ".onSpawned", onAppSpawned);
					/** Because we mess with the `this` of System.Application,
					 * the compiler gets confused, so we have to cast to the right thing.
					 */
					(finApp as fin.OpenFinApplication).run();
				}, function createAppError(err) {
					Logger.system.error("Failed to create openfin Application", err);
				});
		};
		return new Promise(promiseResolver);
	}

	compileOpenfinApplicationDescriptor(componentConfig) {
		componentConfig.uuid = componentConfig.name;
		// If a window is specified to have windowType 'application' or 'OpenfinApplication', it should be in an isolated
		// process. This means that it cannot have an affinity. If this line is removed, FEA thinks that the window is both
		// an application _and_ grouped with other windows in the same affinity. This causes all manner of strange bugs.
		// For example, if three components that are both windowType 'application', and in an affinity are spawned, and
		// one is closed, all 3 will be closed. Because each one _is_ the application...even though they're technically
		// _part_ of the application.
		// FEA has the same check in case someone circumvents the launcher API. But here, we delete affinity if it
		// exists to prevent these bugs from manifesting.
		if (componentConfig.affinity) {
			Logger.system.warn("Configuration Warning: Affinity will be ignored. Component was created with type 'application'.")
			delete componentConfig.affinity
		}

		let descriptor = componentConfig;
		let parentUUID = System.Application.getCurrent().uuid;
		if (!descriptor.customData) descriptor.customData = {};
		descriptor.customData.parentUUID = parentUUID;

		descriptor.parentUUID = parentUUID;
		if (descriptor.external) {
			delete descriptor.preload;
		} else {
			descriptor.taskbarIconGroup = this.manifest.startup_app.uuid;
			// descriptor.mainWindowOptions.preload = typeof descriptor.preload === 'undefined' ? finsembleConfig.finsembleLibraryPath : descriptor.preload;
			descriptor.icon = this.manifest.startup_app.applicationIcon;
		}
		return descriptor;
	}

	// Spawns a new StackedWindow (a virtual window holding "tabbed" windows)
	spawnStackedWindow(componentConfig, cb = Function.prototype): Promise<{ err: any, data: any }> {
		const promiseResolver = (resolve) => {
			//var stackedWindowIdentifer = { windowName: componentConfig.name, windowType: componentConfig.windowType, windowIdentifiers: componentConfig.windowIdentifiers || componentConfig.customData.spawnData.windowIdentifiers };
			Logger.system.debug("CreateSplinterAndInject.spawnStackedWindow", componentConfig);

			this.stackedWindowManager.createStackedWindow(componentConfig, (err, windowIdentifer) => {
				if (err) {
					Logger.system.warn("StackedWindowManagerAPI.createStackedWindow: failed", err);
					resolve({ err, data: null });
					return cb(err, null);
				}
				Logger.system.debug("StackedWindowManagerAPI.createStackedWindow successful", windowIdentifer);
				cb(err, windowIdentifer);
				resolve({ err, data: windowIdentifer });

			});
		};
		return new Promise(promiseResolver);
	}

	/**
	 * The actual splinter method.
	 * If a process is available and has room left for additional children, we request that the process fulfill the spawn request.
	 * If there is no process available, we queue our spawn request. When the pool has created a new render process, we process the queue.
	 */
	splinter(windowDescriptor): Promise<{ err: any, data: any }> {
		const promiseResolver = async (resolve) => {
			windowDescriptor.taskbarIconGroup = windowDescriptor.external ? null : this.manifest.startup_app.uuid;
			windowDescriptor.icon = windowDescriptor.external ? null : this.manifest.startup_app.applicationIcon;

			windowDescriptor.uuid = windowDescriptor.uuid || System.Application.getCurrent().uuid;
			let fw;

			// The onSpawned listener fires when the component is spawned and every time it navigates to a new page or reloads.
			let spawnedListener = (err, response) => {
				if (!fw) {
					fw = System.Window.wrap(windowDescriptor.uuid, windowDescriptor.name);
					fw.addEventListener("closed", () => {
						RouterClient.removeListener(windowDescriptor.name + ".onSpawned", spawnedListener);
					});
				}
				this.injectMindControl(windowDescriptor, fw);
				resolve({ err: null, data: fw });
			}

			RouterClient.addListener(windowDescriptor.name + ".onSpawned", spawnedListener);

			// In Electron environments, pool won't be defined.
			if (this.SplinterAgentPool) {
				this.SplinterAgentPool.routeSpawnRequest(windowDescriptor); // sometimes fails here!!!!!!!!!!!!!!!
			} else {
				// Reassign manifest.finsemble to just a subset of its keys.
				const { FinsembleUUID, applicationRoot, moduleRoot, router } = windowDescriptor.customData.manifest.finsemble;
				windowDescriptor.customData.manifest.finsemble = { FinsembleUUID, applicationRoot, moduleRoot, router };

				/** This method is borrowed from SplinterAgentSlave. It does some checks then calls new System.Window,
				 * which calls through to the underlying container (OpenFin or Electron) to spawn the new window. */
				SplinterAgentDoSpawnRequest(null, { data: { windowDescriptor } }, this.manifest)
			}

			//this.injectMindControl(windowDescriptor, fw);
			//resolve({ err: null, data: fw });
		};

		return new Promise(promiseResolver);
	}

	// This function is called when the LauncherService starts up. It pre-populates a single render process for each pool that's defined in the splinteringConfig.
	createSplinterAgentPool() {
		const promiseResolver = async (resolve) => {
			/** If we're running in Electron, splintering is not efficient, and is replaced instead with affinities, so
			 * we short circuit splintering here.
			 */
			if (fin.container === "Electron") {
				Logger.system.debug("CreateSplinterAndInject: Detected Electron environment. Short-circuiting splintering.")
				resolve();
				return;
			}
			var finsembleConfig = this.finsembleConfig;
			Logger.system.debug("CreateSplinterAndInject: createSplinterAgentPool", finsembleConfig, this.ALLOW_SPLINTERING);
			if (this.ALLOW_SPLINTERING) {
				let initialAgentList = finsembleConfig.splinteringConfig.splinterAgents.filter(agent => {
					return agent.components && agent.components.length > 0;
				});

				let poolConfig = {
					finsembleConfig,
					agentList: initialAgentList,
					manifest: this.manifest,
					windowStore: this.windowStore,
					maxWindowsForDefaultAgent: finsembleConfig.splinteringConfig.maxWindowsForDefaultAgent,
				};

				this.SplinterAgentPool = new SplinterAgentPool(poolConfig, resolve);

				// let onWindowRemoved = (descriptor) => {
				// 	self.remove(descriptor.name); //TBD
				// };
				// let onAddAgent = (agentName) => {
				// 	if (!self.agents) self.agents = {};
				// 	self.agents[agentName] = { lastHeartbeat: Date.now() };
				// };

				// let onAgentRemoved = (agentName) => {
				// 	delete self.agents[agentName];
				// };

				//heartbeat listeners
				//this.SplinterAgentPool.on("windowRemoved", onWindowRemoved);
				// this.SplinterAgentPool.on("addAgent", onAddAgent);
				//this.SplinterAgentPool.on("processRemoved", onAgentRemoved);
			} else {
				resolve();
			}
		}
		return new Promise(promiseResolver);
	}

	doShutdown() {
		const promiseResolver = (resolve) => {
			asyncSeries([
				(finish) => { this.shutdownSplinterAgentPool(finish); },
				resolve,
			]);
		};
		return new Promise(promiseResolver);
	}

	shutdownSplinterAgentPool(done) {
		if (this.SplinterAgentPool) {
			Logger.system.debug("shutdownSplinterAgentPoolFinished start SplinterAgentPool.shutdown");
			this.SplinterAgentPool.shutdown(() => {
				Logger.system.debug("shutdownSplinterAgentPoolFinished SplinterAgentPool.shutdown");
				done();
			});
		} else {
			done();
		}

	}

	// Injects mind control scripts.
	injectMindControl(data, win) {
		var config = data.customData;

		if (config.component.inject) {
			var inject = data.customData.component.inject;
			if (!Array.isArray(inject)) {
				inject = [inject];
			}
			//To allow for code splitting, we must also inject our vendor bundle.
			inject = [this.finsembleConfig.applicationRoot + "/vendor.bundle.js"].concat(inject);
			for (let i = 0; i < inject.length; i++) {
				let req = new XMLHttpRequest();
				const onReadyStateChange = function () {
					if (req.readyState === 4) {
						win.executeJavaScript(req.responseText, function () {
							Logger.system.debug(inject + " injected");
						}, function () {
							Logger.system.error(data.customData.component.inject + " injection failed");
						});
					}
				};

				try {
					var injectURL = new URL(inject[i]);
					inject[i] = injectURL.href;
				} catch (e) {
					inject[i] = this.finsembleConfig.applicationRoot + "/components/mindcontrol/" + inject[i];
				}
				req.open("GET", inject[i], false);
				req.onreadystatechange = onReadyStateChange;
				try {
					req.send();// we were failing here which caused everything to fail.
				} catch (err) {
					Logger.system.error("Injecting mind control script failed:", inject[i])
				}

			}
		}
	}
}
