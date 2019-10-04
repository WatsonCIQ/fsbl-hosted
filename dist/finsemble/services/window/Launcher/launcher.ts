/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
import * as util from "../../../common/util";
import { isNumber } from '../../../common/disentangledUtils';
import { System } from "../../../common/system";
import Logger from "../../../clients/logger";

import ConfigClient from "../../../clients/configClient";
import { ConfigUtilInstance as ConfigUtil } from "../../../common/configUtil";
import WorkspaceClient from "../../../clients/workspaceClient";
import RouterClient from "../../../clients/routerClientInstance";
import DistributedStoreClient from "../../../clients/distributedStoreClient";
import { LauncherGroup as LauncherWindowGroup } from "./launcherGroup";
import { FinsembleWindowInternal } from "../WindowAbstractions/FinsembleWindowInternal";
import { CreateSplinterAndInject } from "./createSplinterAndInject";
import LauncherDefaults, { UNKNOWN_DEFAULT_CONFIG } from "./LauncherDefaults";
import {
	forEach as asyncForEach,
	parallel as asyncParallel,
	series as asyncSeries,
	doUntil as asyncDoUntil,
	some as asyncSome,
} from "async";
import _difference from "lodash.difference";
import { get, set } from "lodash";
import merge = require("deepmerge");
import { FinsembleWindow } from "../../../common/window/FinsembleWindow";
import { WindowDescriptor } from "../Common/types";
// For regression testing
import "./_test";
import { BaseWindow } from "../WindowAbstractions/BaseWindow";
import { IRouterClient } from "../../../clients/IRouterClient";
import { HEARTBEAT_TIMEOUT_CHANNEL, LAUNCHER_SERVICE, DELIVERY_MECHANISM } from "../../../common/constants";
import { getRandomWindowName } from "../../../common/disentangledUtils";
import { FinsembleWindowData } from "../../../common/FinsembleWindowData";
import SpawnUtils from "../Common/spawnUtils";
const clone = require("lodash.cloneDeep");
const lodashGet = require("lodash.get");

/**
 * The internal representation of a Finsemble-controlled window.
 *
 * Daniel H. - 1/16/2019
 * I've done the bare minimum required to provide tight type safety
 * for this file. We really need to figure out which of these interfaces
 * is appropriate and pick that one, rather than this disjointed union.
 *
 * @TODO - Lift into separate interface file and refactor correctly.
 */
type FSBLWindow = BaseWindow & FinsembleWindow & {
	windowDescriptor: WindowDescriptor;
	/**
	 * The name of the component in this window. E.g "Welcome Component", "StackedWindow", etc.
	 *
	 * Daniel H. - 1/16/2019
	 * This appears to duplicated on the windowDescriptor itself.
 	 * @TODO - Pick one and stick with it.
	*/
	componentType: string;
	lastHeartbeat: number;
	errorSent: boolean;
	warningSent: boolean;
	notRespondingSent: boolean;
	uuid: string;
};

/** Daniel H. - 1/16/2019
 * This is a stand-in for the real type.
 * @TODO - Refactor LauncherGroup to Typescript.
*/
interface ILauncherGroup {
	getWindows(): { [name: string]: FSBLWindow };
	getWindow(name: string): FSBLWindow;
	findAllByComponentType(componentType: string): FSBLWindow[];
	getWindowNames(): string[];
	addWindow(window: FSBLWindow): void;
	removeWindows(windowNames: string[], cb: () => void);
	windows: FSBLWindow[];
};

var activeWindows: ILauncherGroup = new LauncherWindowGroup({
	name: "LauncherService.allWindows",
}) as any;

declare var window: any;
/**
 * Daniel H. 1/2/19
 * Our use of `this` here causes every instance of Launcher
 * overwrite all the others.
 * @TODO Either not use this closure over `self`, or make Launcher an explicit singleton.
*/
declare var self: Launcher;

const NAME_STORAGE_KEY = "finsemble.NameCountData";

/** All the possible window types, including their aliases used in config. */
type WindowTypes =
	"OpenFinWindow" | "openfin"
	| "NativeWindow" | "assimilation" | "assimilated"
	| "native" | "FinsembleNativeWindow"
	| "application" | "OpenFinApplication";

/** The parameters passed to Launcher.Spawn.
 *
 * For properties duplicated between the top-level
 * and `options`, `options` takes precedence.
 */
export type SpawnParams = {
	/**
 * Defaults to false. Whether to add the new component to the workspace.
 * Even when true, the window will still not be added to the workspace if addToWorkspace==false in components.json config for the component type.
 */
	addToWorkspace?: boolean;
	/**
	 * Used when windowType is "native" or "assimilation". Specifies the alias of a bundled asset.
	 */
	alias?: string;
	/**
	 * Set a process affinity flag. This allows windows to grouped together under a single process (a.k.a. Application). This flag is only available when running on Electron via e2o.
	 */
	affinity?: string;

	/**
	 * Used when windowType is "native" or "assimilation". Specifies the arguments to be sent to the application. This is used in conjunction with path.
	 * Arguments should be separated by spaces: `--arg1 foo --arg2 bar` _except_ when `params.argumentsAsQueryString` is true, in which case set this parameter to be single string in URI format: `arg=1&arg=2`"
	 */
	arguments?: any;
	/**
	 * For native applications launched by URI: 1) the string is passed as the "arguments" parameter if appended as a query string; and 2) the automatically generated arguments described in "path" above are appended to the query string
	 */
	argumentsAsQueryString?: boolean;
	/**
	 * Whether the component can group with other windows.
	 */
	canGroup?: boolean;
	/**
	 *  For use with permanent toolbars.
	 * The available space for other components will be reduced by the amount of space covered by the newly spawned component.
	 * This will be reflected in the `unclaimedRect` member from API calls that return monitorInfo. Users will be prevented
	 * from moving windows to a position that covers the claimed space. See `position: 'unclaimed'`.
	 */
	claimMonitorSpace?: boolean;
	/**
	 * Type of component to spawn.
	 */
	component?: any;
	/**
	 * If true, will automatically dock the window with the "relative" window (dock to the parent window unless specified in params.relativeWindow).
	 * Note that you must also position the window in a valid position for docking, for example, by setting the "left" or "top" parameters to "adjacent".
	 */
	dockOnSpawn?: boolean;
	/**
	 * An array of parts of the monitor that the component can dock to. Valid values are `top` and `bottom`.
	 */
	dockable?: ["top", "bottom"] | ["bottom", "top"] | ["top"] | ["bottom"]
	/**
	 * Which part of the monitor that the component will dock to on spawn. Valid options are `top` and `bottom`. Only valid if combined with the `dockable` property.
	 */
	docked?: "top" | "bottom";
	/**
	 * Currently, components can only dock to the full width of the monitor. This parameter determines what height the component will be when docked to a monitor.
	 */
	dockedHeight?: number;
	/**
	 * Indicates that this window is ephemeral.
	 * An ephemeral window is a dialog, menu or other window that is temporarily displayed but usually hidden.
	 * Ephemeral windows automatically have the following settings assigned: resizable: false, showTaskbarIcon: false, alwaysOnTop: true.
	 * *Note, use `options:{autoShow: false}` to prevent an ephemeral widow from showing automatically.*
	 *
	 */
	ephemeral?: boolean;

	/**
	 * If true will attempt to make the window no have parts outside the monitor boundary.
	 */
	forceOntoMonitor?: boolean;
	/**
	 * Optional group name. Adds windows to a group (unrelated to docking or linking) that is used for window management functions. If the group does not exist it will be created.
	 */
	groupName?: string;
	groupOnSpawn?: boolean;
	/**
	 * Which monitor to place the new window.
	 * **"mine"** - Place the window on the same monitor as the calling window.
	 * A numeric value of monitor (where primary is zero).
	 * **"primary"**,**"next"** and **"previous"** indicate a specific monitor.
	 * **"all"** - Put a copy of the component on all monitors
	 *
	 */
	monitor?: number | "mine" | "primary" | "next" | "previous" | "all";
	/**
	 * Name to give the component. If not provided, a random one will be generated. Name will be made unique (if not already).
	 */
	name?: string;
	/**
	 * @deprecated Please use windowType instead. Optional native application to launch with Assimilation service. Overrides what is passed in "component".
	 */
	native?: boolean;
	/**
	 * Properties to merge with the default windowDescriptor.
	 * Any value set here will be sent directly to the `OpenFin` window, and will override the effect of relevant parameters to spawn(). By default, all Finsemble windows are frameless.
	 */
	options?: any;
	/**
	 * Used when windowType is "native" or "assimilation". Specifies the path to the application. The path can be:
	 * The name of an exe that is on the system path (i.e. notepad.exe).
	 * The full path to an executable on the user's machine (i.e. C:\Program Files\app.exe)
	 * A system installed uri (i.e. myuri://myapp).
	 *
	 * When windowType is "native" then additional arguments will be automatically appended to the path or the uri. These arguments can be captured by the native application
	 * in order to tie it to Finsemble's window tracking. When building an application with finsemble.dll, this is handled automatically. Those arguments are:
	 *
	 * **uuid** - A generated UUID that uniquely identifies this window.
	 *
	 * **left** - The x coordinate of the new window
	 *
	 * **top** - The y coordinate of the new window
	 *
	 * **width** - The width of the new window
	 *
	 * **height** - The height of the new window
	 *
	 * **openfinVersion** - The OpenFin version that Finsemble runs (necessary for native windows to connection on the OpenFin IAB)
	 *
	 * **openfinSocketPort** - The OpenFin socket used for the Inter-application Bus (IAB) (necessary for Java windows that wish to use the OpenFin IAB)
	 *
	 * **finsembleWindowName** - The name of the window in the Finsemble config
	 *
	 * **componentType** - The component type in the Finsemble config
	 *
	 * A common troublesome problem is when a native application needs to be launched from an intermediary application (such as a launcher or batch script). That intermediary
	 * application can pass these parameters which will allow the final application to connect back to Finsemble.
	 */
	path?: string;
	/**
	 * Defines a "viewport" for the spawn, with one of the following values:
	 *
	 * **"unclaimed"** (the default) Positioned based on the monitor space excluding space "claimed" by other components (such as toolbars).
	 * For instance, `top:0` will place the new component directly below the toolbar.
	 *
	 * **"available"** Positioned according to the coordinates available on the monitor itself, less space claimed by the operating system (such as the windows toolbar).
	 * For instance, `bottom:0` will place the new component with its bottom flush against the windows toolbar.
	 *
	 * **"monitor"** Positioned according to the absolute size of the monitor.
	 * For instance, `top:0` will place the component overlapping the toolbar.
	 *
	 * **"relative"** Positioned relative to the relativeWindow.
	 * For instance, `left:0;top:0` will join the top left corner of the new component with the top left corner of the relative window.
	 *
	 * **"virtual"** Positioned against coordinates on the virtual screen.
	 * The virtual screen is the full viewing area of all monitors combined into a single theoretical monitor.
	 */
	position?: string;
	/**
	 * Sets environment variables for a spawned native application. Create a map (JSON) object of names to values. This is only available when running assimilation and with the config assimilation.useOpenFinSpawn=false.
	 */
	env?: any;
	/**
	 * The window to use when calculating any relative launches.
	 * If not set then the window from which spawn() was called.
	 */
	relativeWindow?: WindowIdentifier;
	/**
	 * Optional url to launch. Overrides what is passed in "component".
	 */
	url?: string;
	/**
	 * Optional. Describes which type of component to spawn.
	 *
	 * **openfin** - A normal HTML window.
	 *
	 * **assimilation** - A window that is managed by the Finsemble assimilation process (usually a native window without source code access). Requires "path" to be specified, which may be the name of an executable on the system path, a system file path or system installed URI.
	 *
	 * **native** - A native window that has implemented finsemble.dll. Requires "path" to be specified. For more information(tutorial-RPCService.html).
	 *
	 * **application** - A standalone application. This launch a component in its own browser process (splintered, giving it dedicated CPU and memory).
	 * This can also point to a standalone web application (such as from a third party).
	 */
	windowType?: WindowTypes;
	/**
	 * Built and passed internally. This is not a public api parameter, and cannot be
	 * supplied by a user
	 * @private
	 */
	windowIdentifier?: WindowIdentifier;
	/**
	 * If true then the new window will act as a slave to the relativeWindow (or the launching window if relativeWindow is not specified).
	 * Slave windows will automatically close when their parent windows close.
	 */
	slave?: boolean;
	/***
	 * @private
	 */
	spawnedByWorkspaceService?: boolean;
	/**
	 * Number of pixels to stagger (default when neither left, right, top or bottom are set).
	 */
	staggerPixels?: number;

	/**
	 * Where the spawn request is coming from.
	 * @private
	 */
	launchingWindow?: any;
	/**
	 * Optional data to pass to the opening window.
	 * If set, then the spawned window can use {@link WindowClient#getSpawnData} to retrieve the data.
	 */
	data?: any,
	/**
	 * A pixel value representing the distance from the left edge of the viewport as defined by "position".
	 * A percentage value may also be used, representing the percentage distance from the left edge of the viewport relative to the viewport's width.
	 *
	 * **"adjacent"** will snap to the right edge of the spawning or relative window.
	 *
	 * **"center"** will center the window
	 *
	 * If neither left nor right are provided, then the default will be to stagger the window based on the last spawned window.
	 * *Note - the staggering algorithm has a timing element that is optimized based on user testing.*
	 *
	 */
	left?: number | string;
	/**
	* Same as left except related to the right of the viewport.
  */
	right?: number | string;
	/**
	 * Same as left except related to the top of the viewport.
	 */
	top?: number | string;
	/**
	 * Same as left except related to the bottom of the viewport.
	 */
	bottom?: number | string;
	/**
	 *  A pixel or percentage value.
	 */
	width?: number | string;
	/**
	 *  A pixel or percentage value.
	 */
	height?: number | string;
	/**
	 * Minimum width window can be resized to.
	 */
	minWidth?: number;
	/**
	 * Minimum height window can be resized to.
	 */
	minHeight?: number;
	/**
	 * Maximum height window can be resized to.
	 */
	maxHeight?: number;
	/**
	 * Maximum width window can be resized to.
	 */
	maxWidth?: number;
};


var Components = {};
var componentArray = [];

DistributedStoreClient.initialize();

/**
 * The Launcher Service receives calls from the launcherClient, and spawns windows.
 * @TODO, finish spawn (makeRoom, findEmptySpace, position=virtual, add abstraction for 0,0 by monitor, available, claimed)
 * @TODO, clean out old monitor routines from utils
 * @TODO, retrofit all code that appends customData to use "data/spawnData" instead
 * @constructor
 */
export class Launcher {
	/** @alias Launcher# */
	createSplinterAndInject: CreateSplinterAndInject;
	windowGroups: object;
	cssOverride: string;
	lastOpenedMap: object;
	lastAdjustedMap: object;
	persistURL: boolean;
	shuttingDown: boolean;
	monitors: any;
	shutdownList: any;
	RouterClient: IRouterClient;
	groupStore: object;
	windowStore: object;
	finsembleConfig: any;
	appConfig: any;
	pendingWindows: object;
	rawManifest: object;

	constructor(manifest, stackedWindowManager) {
		Logger.system.log("Starting Launcher");

		this.createSplinterAndInject = new CreateSplinterAndInject(manifest, stackedWindowManager);
		this.finsembleConfig = manifest.finsemble;
		this.appConfig = {};
		this.pendingWindows = {}; // Note that pending windows only contains properties that are used, does not contain actual windows.

		self = this;
		//Window groups that are created via the launcher client.
		this.windowGroups = {};
		//todo possibly remove this. We used to inject an overwrites file before we gave people the finsemble.css.
		this.cssOverride = "";
		//Map of info about the last window that was opened.
		this.lastOpenedMap = {};
		this.lastAdjustedMap = {};

		//Whether to persist URL changes on the component.
		this.persistURL = false;
		//When we're shutting down, we ignore spawn requests. This gets set to true.
		this.shuttingDown = false;
		//Local copy of monitors, this will prevent us from having to fetch them every time
		this.monitors = null;

		/**
		 * Namespace to prevent collisions.
		 */
		this.shutdownList = {};
		/**
		 * This will be populated with the number of components that have told the Launcher whether they will require time to cleanup.
		 */
		this.shutdownList.componentsResponded = [];
		/**
		 * This will be populated with the components who are doing some cleanup.
		 */
		this.shutdownList.waitFor = [];

		this.shutdownList.componentsOpenAtShutdown = 0;

		//@todo remove globals
		window.doingMonitorAdjustments = false;
		window.activeWindows = activeWindows; // make it available for access to rawWindow
		window.pendingWindows = this.pendingWindows;
		window.windowGroups = this.windowGroups;
		window.Launcher = this;

		this.bringWindowsToFront = this.bringWindowsToFront.bind(this);
		this.hyperFocus = this.hyperFocus.bind(this);
		this.minimizeWindows = this.minimizeWindows.bind(this);

		//Removes sequential names queued up last time the app was open. We use local storage to remember how many toolbars we've spawned.
		//todo, why are we using local storage??
		this.clearSequentialNames(); // invoke on startup
	}

	/**
	 * Main function that starts everything up.
	 * @param {*} callback
	 */
	async initialize(callback) {
		Logger.system.debug("Launcher.initialize");

		this.heartbeat();
		// When we wake from sleep, our heartbeats might be stale. Reset them.
		System.addEventListener("session-changed", this.resetHeartbeats);
		util.Monitors.on("monitors-changed", this.doMonitorAdjustments.bind(this));

		await this.createSplinterAndInject.initialize();

		asyncSeries([
			this.getConfig.bind(this),
			this.loadComponents.bind(this),//req config
			this.getRawManifest,
		],
			() => {
				Logger.system.debug("Launcher ready");
				callback(); // essentially ready now
				this.getMonitorInfoAll(function getMonitorInfoCallback(err, monitors) {
					Logger.system.debug("Launcher monitors", monitors);
					RouterClient.addPubSubResponder("monitorInfo", monitors); //@TODO, this should be prefixed Launcher.monitorInfo
				});
			});
	}

	/**
	 * This method handles the shutdownList sequence for the Launcher.
	 */
	shutdown(allDone) {
		//bool to prevent new components from being spawned.
		self.shuttingDown = true;
		const smallTimeout = (callback) => {
			//I think I put this timeout in to allow the openfin IPC to catch up. It may not be necessary. Leaving it in until we have time to try pulling it out.
			setTimeout(callback, 1);
		};

		const promiseResolver = (resolve) => {

			asyncSeries([
				self.shutdownComponents.bind(this),
				smallTimeout,
			], (err) => {
				if (err) {
					Logger.system.error("shutdown error", err);
				}
				allDone();
				//'resolve' will resolve the shutdownList, which then calls shutdownComplete in the baseService.
				resolve();
			});
		};
		return new Promise(promiseResolver);
	}

	// returns list of known components
	getComponents() {
		return Components;
	}

	//Adds windows to several groups.
	addWindowsToGroups(params) {
		let err = null;
		let { groupName, windowList } = params;
		if (self.windowGroups[groupName]) {
			let actualWindowList = self.getWindowsFromNamesOrIdentifiers(windowList);
			self.windowGroups[groupName].addWindows(actualWindowList);
			self.sendUpdatesToWindows(actualWindowList);
		} else {
			err = "Group Does Not Exist";
		}
		return err;
	}

	// return list of window names for a give group name
	getWindowsInGroup(groupName) {
		let group = self.windowGroups[groupName];
		let windowList = self.windowGroups[groupName];
		return windowList;
	}

	removeWindowsFromGroup(params) {
		let err = null;
		let { groupName, windowList } = params;
		if (self.windowGroups[groupName]) {
			self.windowGroups[groupName].removeWindows(windowList);
			let actualWindowList = self.getWindowsFromNamesOrIdentifiers(windowList);
			self.sendUpdatesToWindows(actualWindowList);
		} else {
			err = "Group Does Not Exist";
		}
		return err;
	}

	//Adds a window to several groups.
	addWindowToGroups(data) {
		Logger.system.debug("Add Window To Groups", data.groupNames, data.windowIdentifier);
		var win = activeWindows.getWindow(data.windowIdentifier);
		if (win) {
			for (let g in data.groupNames) {
				let groupName = data.groupNames[g];
				let group = self.windowGroups[groupName];
				if (!group) {
					self.windowGroups[groupName] = new LauncherWindowGroup({
						name: groupName,
					});
					group = self.windowGroups[groupName];
				}
				group.addWindow(win);
			}
			self.sendUpdatesToWindows([win]);
		}
	}

	/**
	 * "StackedWindow" is a special built-in component that the launcher uses internally. We need
	 * to make sure that the StackedWindow is *always* in the component list.
	 * @private
	 * @param {Function} cb
	 */
	addPredefinedComponents() {
		Logger.system.info("Launcher.AddPredefinedComponents");
		Components["StackedWindow"] = {
			window: {
				windowType: "StackedWindow",
				addToWorkspace: true
			},
			foreign: {
				services: {
					dockingService: {
						isArrangeable: true
					}
				},
				components: {
					"App Launcher": {
						launchableByUser: false
					},
					"Window Manager": {
						persistWindowState: true
					}
				}
			},
			component: {
				type: "StackedWindow"
			}
		};
		this.update();
	}

	addUnclaimedRectToMonitor(monitor) {
		if (!monitor) { return; }
		// Get the claims on space
		var claimsOffset = self.getClaimsOffset(monitor);
		// Now we'll assemble an unclaimedRect in the same format as OpenFin's availableRect
		let availableRect = monitor.availableRect;
		let unclaimedRect = {
			top: availableRect.top + claimsOffset.top,
			bottom: availableRect.bottom - claimsOffset.bottom,
			left: availableRect.left + claimsOffset.left,
			right: availableRect.right - claimsOffset.right,
			width: null,
			height: null
		};
		unclaimedRect.width = unclaimedRect.right - unclaimedRect.left;
		unclaimedRect.height = unclaimedRect.bottom - unclaimedRect.top;

		// Return the complete set of all three monitorRect, availableRect, unclaimedRect back to the client
		monitor.unclaimedRect = unclaimedRect;
	}

	/**
	 * This allows us to add a component that isn't in our list. We use the default manifest config so that our configs are the same across the board.
	 * We also allow these components to be included in workspaces.
	 * @param {*} message
	 * @param {*} cb
	 */
	addUserDefinedComponent(message, cb = Function.prototype) {
		var name = message.data.name;
		let config = new LauncherDefaults().componentDescriptor;
		//Add in our configs to the default config
		config.window.url = message.data.url;
		config.window.windowType = message.data.windowType;
		// This allows us to have an icon in our menus and pins
		config.foreign.components.Toolbar.iconURl = "https://plus.google.com/_/favicon?domain_url=" + message.data.url;
		// Sets the titlebar name to the user defined app name
		config.foreign.components["Window Manager"].title = name;
		// Allows us to know how this component was created. Eventually, this should change when we add a source to our components
		config.component.isUserDefined = true;
		config.component.type = name;

		var err = null;
		if (Components[name]) {
			err = "Component of type " + name + " already exists.";
		} else {
			Components[name] = config;
		}
		this.update();
		cb(err, null);
	}

	/**
	 * Brings a list, group, componentType or all windows to front
	 * @param {*} response.data.windowList list of window names or window identifiers.
	 * @param {*} response.data.groupName group name
	 * @param {*} response.data.componentType component type.
	 */
	bringWindowsToFront(err, response, cb = Function.prototype) {
		if (!response) response = {};
		response.functionName = "bringToFront";
		this.executeWindowGroupFunctionByListGroupOrType(response, cb);
	}

	calculateBounds(foundMonitor, windowDescriptor: WindowDescriptor, launcherParams) {
		var position = launcherParams.position;

		var monitors = launcherParams.monitors;
		var previousMonitor = launcherParams.previousMonitor;

		var monitor = previousMonitor;

		// Client can optionally override by picking a monitor
		var commandMonitor = launcherParams.monitor;

		if ((commandMonitor && commandMonitor !== "mine") || commandMonitor === 0) {
			monitor = foundMonitor;
		}

		if (!monitor) monitor = foundMonitor;

		//If this is an ephemeral component don't update the lastOpenedMap
		let shouldUpdateLastOpened = !launcherParams.ephemeral

		// Set monitorDimensions since other services reference this.
		// @TODO, get rid of this [Terry] Probably not a good idea, since monitor dimensions can change dynamically
		// better for any services to use the util functions on the fly when they need monitorDimensions
		if (!windowDescriptor.customData) { windowDescriptor.customData = {}; } // just in case we don't send an actual windowDescriptor in
		windowDescriptor.customData.monitorDimensions = monitor.availableRect;

		self.addUnclaimedRectToMonitor(monitor);

		/* Now that we know which monitor, set some variables to use in calculations
		var monitorWidth = monitor.unclaimedRect.width, monitorHeight = monitor.unclaimedRect.height;
		var monitorX = monitor.availableRect.left, monitorY = monitor.availableRect.top;*/


		// Set variables for calculations based on the dimensions of the opening window
		var previousWindowBounds = launcherParams.previousWindowBounds;
		var previousX = previousWindowBounds ? launcherParams.previousWindowBounds.left : monitor.availableRect.left;
		var previousY = previousWindowBounds ? launcherParams.previousWindowBounds.top : monitor.availableRect.top;
		var previousWidth = previousWindowBounds ? previousWindowBounds.width : launcherParams.width;
		var previousHeight = previousWindowBounds ? previousWindowBounds.height : launcherParams.height;
		var staggerPixels; //In order we will check the local launcherParams.staggerPixels. If that is undefined, we will
		//check the this.finsembleConfig, if _that_ is undefined, we default to 40. (This magic number was here previously.)
		if (launcherParams.hasOwnProperty("staggerPixels") && Number(launcherParams.staggerPixels) !== NaN) { //eslint-disable-line
			staggerPixels = launcherParams.staggerPixels;
		} else if (this.finsembleConfig.servicesConfig && this.finsembleConfig.servicesConfig.hasOwnProperty("launcher") &&
			this.finsembleConfig.servicesConfig.launcher.hasOwnProperty("staggerPixels")) {
			staggerPixels = this.finsembleConfig.servicesConfig.launcher.staggerPixels;
		} else {
			staggerPixels = 40;
		}

		// The viewport is a box that is identified by coordinates in the virtual space (all monitors)
		// left, right, top, bottom calculations are done in that space
		var viewport;
		if (position === "available") {
			viewport = monitor.availableRect;
		} else if (position === "monitor") {
			viewport = monitor.monitorRect;
		} else if (position === "relative") {
			viewport = {
				left: previousX,
				top: previousY,
				right: previousX + previousWidth,
				bottom: previousY + previousHeight,
				width: previousWidth,
				height: previousHeight
			};
		} else if (position === "virtual") {
			let virtualLeft = 0, virtualTop = 0, virtualWidth = 0, virtualHeight = 0;
			monitors.forEach((monitor) => {
				let dims = monitor.availableRect;
				virtualWidth += Math.abs(dims.right - dims.left);
				virtualHeight += Math.abs(dims.bottom - dims.top);
				if (dims.left < virtualLeft) {
					virtualLeft = dims.left;
				}
				if (dims.top < virtualTop) {
					virtualTop = dims.top;
				}
			});

			viewport = {
				left: virtualLeft,
				top: virtualTop,
				width: virtualWidth,
				height: virtualHeight
			};
		} else {
			viewport = monitor.unclaimedRect;
		}

		// Width & height default to the component defaults, which is set earlier in the stack
		var width = 800, height = 600;

		if (launcherParams.width || launcherParams.width === 0) {
			if (util.isPercentage(launcherParams.width)) {
				width = viewport.width * parseFloat(launcherParams.width) / 100;
			} else {
				width = parseFloat(launcherParams.width);
			}
		}

		if (launcherParams.height || launcherParams.height === 0) {
			if (util.isPercentage(launcherParams.height)) {
				height = viewport.height * parseFloat(launcherParams.height) / 100;
			} else {
				height = parseFloat(launcherParams.height);
			}
		}


		// Various x,y placement commands are possible.
		var leftCommand = launcherParams.left, topCommand = launcherParams.top;
		var rightCommand = launcherParams.right, bottomCommand = launcherParams.bottom;

		// Initialize the lastOpenedMap if not already. First window will open in top left corner of screen. This
		// only gets updated when a window is opened without any specific location. The entire thing resets if the user
		// hasn't opened a window in over a minute.
		let resetStaggerTimer = 1000 * 60;
		let lastOpened = self.lastOpenedMap[monitor.position];
		if (!lastOpened || (Date.now() - lastOpened.then) > resetStaggerTimer) {
			self.resetSpawnStagger({ monitorPosition: monitor.position });
			lastOpened = self.lastOpenedMap[monitor.position];
		}

		// For "adjacent" we want to automatically align the new component (unless specified otherwise by the developer)
		if (leftCommand === "adjacent" || rightCommand === "adjacent") {
			if (!topCommand && topCommand !== 0) {
				topCommand = "aligned";
			}
		} else if (topCommand === "adjacent" || bottomCommand === "adjacent") {
			if (!leftCommand && leftCommand !== 0) {
				leftCommand = "aligned";
			}
		}

		var left, right, top, bottom, updateX, updateY, lastY = lastOpened.y, lastX = lastOpened.x;
		if (leftCommand === "center") {
			let center = viewport.left + (viewport.width / 2);
			left = center - (width / 2);
		} else if (leftCommand === "adjacent") {
			left = previousX + previousWidth;
		} else if (leftCommand === "aligned") {
			left = previousX;
		} else if (leftCommand || leftCommand === 0) {
			if (util.isPercentage(leftCommand)) {
				left = viewport.left + viewport.width * parseFloat(leftCommand) / 100;
			} else {
				left = viewport.left + parseFloat(leftCommand);
			}
		} else if (!rightCommand && rightCommand !== 0) {

			//Make sure last opened window was on our viewport.
			if (!(lastX >= monitor.unclaimedRect.left && lastX <= monitor.unclaimedRect.right)) {
				lastX = monitor.unclaimedRect.left;
				lastY = monitor.unclaimedRect.top;
			}
			if (isNaN(lastX)) { lastX = null; }
			// stagger if neither left nor right commands
			if (launcherParams.relativeWindow) {
				lastOpened.x = previousX;
			} else if (lastX === null) { // start at 0
				lastX = monitor.unclaimedRect.left - staggerPixels;
			}
			left = lastX + staggerPixels;
			// Make sure we don't go off right edge of monitor
			if (left + width > monitor.unclaimedRect.right) {
				left = monitor.unclaimedRect.right - width;
			}
			updateX = true;
		}

		if (rightCommand === "adjacent") {
			left = previousX - width;
		} else if (rightCommand === "aligned") {
			left = previousX + previousWidth - width;
		} else if (rightCommand || rightCommand === 0) {
			if (util.isPercentage(rightCommand)) {
				right = viewport.right - (viewport.width * parseFloat(rightCommand) / 100);
			} else {
				right = viewport.right - parseFloat(rightCommand);
			}
			if (left || left === 0) {
				// If we have a left command and right command, then set the width
				width = right - left;
			} else {
				// If we only have a right command and a width, then we back into the left
				left = right - width;
			}
		}

		if (topCommand === "center") {
			let center = viewport.top + (viewport.height / 2);
			top = center - (height / 2);
		} else if (topCommand === "adjacent") {
			top = previousY + previousHeight;
		} else if (topCommand === "aligned") {
			top = previousY;
		} else if (topCommand || topCommand === 0) {
			if (util.isPercentage(topCommand)) {
				top = viewport.top + viewport.height * parseFloat(topCommand) / 100;
			} else {
				top = viewport.top + parseFloat(topCommand);
			}
		} else if (!bottomCommand && bottomCommand !== 0) {
			//Make sure last opened window was on our viewport.
			if (!(lastY <= monitor.unclaimedRect.bottom && lastY >= monitor.unclaimedRect.top)) {
				lastY = monitor.unclaimedRect.top;
				lastX = monitor.unclaimedRect.left;
			}
			if (isNaN(lastY)) { lastY = null; }
			// stagger
			if (launcherParams.relativeWindow) {
				lastOpened.y = previousY;
			} else if (lastY === null) { // start at 0
				lastY = monitor.unclaimedRect.top - staggerPixels;
			}
			top = lastY + staggerPixels;
			// Make sure we don't go off right edge of monitor
			if (top + height > monitor.unclaimedRect.bottom) {
				top = monitor.unclaimedRect.bottom - height;
			}
			updateY = true;
		}

		if (bottomCommand === "adjacent") {
			top = previousY - height;
		} else if (bottomCommand === "aligned") {
			top = previousY + previousHeight - height;
		} else if (bottomCommand || bottomCommand === 0) {
			if (util.isPercentage(bottomCommand)) {
				bottom = viewport.bottom - (viewport.height * parseFloat(bottomCommand) / 100);
			} else {
				bottom = viewport.bottom - parseFloat(bottomCommand);
			}
			if (top || top === 0) {
				height = bottom - top;
			} else {
				top = bottom - height;
			}
		}

		// Make sure we have a right and a bottom
		if (!right && Number.isFinite(left)) { right = left + width; }
		if (!bottom && Number.isFinite(top)) { bottom = top + height; }

		const shouldWindowBeForcedIntoView = launcherParams.hasOwnProperty('forceOntoMonitor') ? Boolean(launcherParams.forceOntoMonitor) : true;

		// Force to be on monitor
		if (shouldWindowBeForcedIntoView) {
			if (right > monitor.unclaimedRect.right) {
				left = left - (right - monitor.unclaimedRect.right);
				right = monitor.unclaimedRect.right;
			}

			if (bottom > monitor.unclaimedRect.bottom) {
				//Before, the bottom of the window being shown would line up with the bottom of the monitor. If this was a menu, this was problematic because the menu would overlap the toolbar. Instead, we line up the bottom of the window with the top of the relative window.
				if (topCommand === "adjacent") {
					bottom = previousY;
				} else {
					top = top - (bottom - monitor.unclaimedRect.bottom);
				}
				top = bottom - height;


			}

			//left after right in case window bigger than viewport
			if (left < monitor.unclaimedRect.left) {
				left = monitor.unclaimedRect.left;
				right = left + width;
			}

			if (top < monitor.unclaimedRect.top) {
				top = monitor.unclaimedRect.top;
				bottom = top + height;
			}
		}

		// Only if both x and y were unassigned do we save the information so that we can stagger again later
		if (updateX && updateY) {
			if (launcherParams.options && typeof launcherParams.options.defaultLeft === "undefined") { // defaultLeft is set when being restored from workspace. We don't want those to affect the stagger algorithm.
				Logger.system.debug("lastOpened.x", left, launcherParams);
				lastOpened.x = left;
				lastOpened.y = top;
			}
			lastOpened.then = Date.now();
		}

		if (left || left === 0) { windowDescriptor.defaultLeft = Math.round(left); }
		if (top || top === 0) { windowDescriptor.defaultTop = Math.round(top); }
		if (width || width === 0) { windowDescriptor.defaultWidth = Math.round(width); }
		if (height || height === 0) { windowDescriptor.defaultHeight = Math.round(height); }
		windowDescriptor.monitorInfo = monitor.position; //only this position is used elsewhere so stop putting the entire object in the windowDescriptor so as not to overload the store

		if (typeof (launcherParams.claimMonitorSpace) !== "undefined") {
			windowDescriptor.claimMonitorSpace = launcherParams.claimMonitorSpace;
		}

		if (shouldWindowBeForcedIntoView) {
			windowDescriptor = this.adjustWindowDescriptorBoundsToBeOnMonitor(windowDescriptor);
		}

		// If a leftCommand/rightCommand/topCommand/bottomCommand
		// or position other than 'virtual' is supplied then don't update the lastOpenedMap.
		// This can also be skipped if shouldUpdateLastOpened is already false
		// (like when the opening window is a menu)
		// NOTE: position virtual is an acceptable value to update the lastOpenedMap since its just the entire virtual usable space
		if (shouldUpdateLastOpened && (topCommand || bottomCommand || leftCommand || rightCommand) && (!position || position !== "virtual")) {
			shouldUpdateLastOpened = false;
		}

		//If the launching window is a menu we don't want to update this map, otherwise the next window will stagger will just open on top of the last window (since the menu's location won't change in most cases)
		if (shouldUpdateLastOpened) {
			this.lastOpenedMap[monitor.position] = {
				x: windowDescriptor.defaultLeft,
				y: windowDescriptor.defaultTop,
				then: lastOpened.then ? lastOpened.then : undefined
			}; //NOTE: 4/5/19 lastOpened.then was not being added to the lastOpenedMap, so the stagger timer was likely broken
		}

		return Promise.resolve(windowDescriptor);
	}


	/**
	 * Takes the window descriptor's bounds and makes sure it's on a monitor. If the window isn't on a monitor, we determine the closest monitor
	 * based on the distance from the top-left corner of the window to the center of the monitor, and then pull the monitor along that line
	 * until the window is on the edge of the monitor
	 * @param {*} windowDescriptor Window descriptor, e.g. from a saved workspace
	 * @param {*} previousWindowBounds not used, unfortunately
	 * @returns windowDescriptor updated window descriptor
	 */
	adjustWindowDescriptorBoundsToBeOnMonitor(windowDescriptor: WindowDescriptor): WindowDescriptor {
		if (windowDescriptor && windowDescriptor.customData && windowDescriptor.customData.window) {
			if (windowDescriptor.customData.window.allowToSpawnOffScreen) {
				return windowDescriptor;
			}
		}

		let bounds;
		/** Currently our bounds data (top, left, height, width, etc.) is duplicated in up to three places
		 * in the WindowDescriptor object: as top level props (windowDescriptor.left), as top level
		 * props with a "default" prefix (windowDescriptor.defaultLeft), and, in the case of StackedWindows
		 * (and in this case only), within the "bounds" prop (windowDescriptor.bounds.left).
		 *
		 * @TODO Pick a place and stick with it. Refactor all the code touching WindowDescriptors to use
		 * that new place. Either everyone should check "bounds", or no one should.
		 */
		if (windowDescriptor.componentType === "StackedWindow") {
			bounds = {
				left: windowDescriptor.left,
				top: windowDescriptor.top,
				height: windowDescriptor.height,
				width: windowDescriptor.width,
				right: null,
				bottom: null
			}
		} else {
			bounds = {
				left: windowDescriptor.defaultLeft,
				top: windowDescriptor.defaultTop,
				height: windowDescriptor.defaultHeight,
				width: windowDescriptor.defaultWidth,
				right: null,
				bottom: null
			}
		};

		bounds.right = bounds.left + bounds.width;
		bounds.bottom = bounds.top + bounds.height;

		if (windowDescriptor.customData && windowDescriptor.customData.monitorDimensions) {
			let newBounds = util.adjustBoundsToBeOnMonitor(bounds);

			// update windowDescriptor
			windowDescriptor.defaultLeft = newBounds.left;
			windowDescriptor.defaultTop = newBounds.top;
			windowDescriptor.left = newBounds.left;
			windowDescriptor.top = newBounds.top;
			windowDescriptor.height = newBounds.height;
			windowDescriptor.width = newBounds.width;
			windowDescriptor.right = newBounds.left + newBounds.width;
			windowDescriptor.bottom = newBounds.top + newBounds.height;

			/**
			 * Daniel H. - 1/16/19
			 * Needed in the case that  the windowDescriptor belongs to a StackedWindow.
			 * See comments above.
			 *
			 * @TODO - Refactor this away.
			*/
			if (windowDescriptor.bounds) {
				windowDescriptor.bounds.left = newBounds.left;
				windowDescriptor.bounds.top = newBounds.top;
				windowDescriptor.bounds.height = newBounds.height;
				windowDescriptor.bounds.width = newBounds.width;
				windowDescriptor.bounds.right = newBounds.left + newBounds.width;
				windowDescriptor.bounds.bottom = newBounds.top + newBounds.height;
			}
		}

		return windowDescriptor;

	}

	// clears counters from local storage -- counters will restart at 1 for new names
	clearSequentialNames() {
		localStorage.removeItem(NAME_STORAGE_KEY);
	}

	/**
	 * @private
	 */
	compileWindowDescriptor(config, params, baseDescriptor: WindowDescriptor, resultFromDeriveBounds): WindowDescriptor {
		var windowDescriptor = baseDescriptor;

		// Pushes affinity option further down callstack for eventual consumption by E2O.
		if (params.affinity) {
			windowDescriptor.affinity = params.affinity;
		}

		// Ephemeral windows, such as dialogs, menus, linker, etc
		if (params.ephemeral) {
			windowDescriptor.resizable = false;
			windowDescriptor.showTaskbarIcon = false;
			windowDescriptor.alwaysOnTop = true;
			// ephemeral objects shouldn't be added to the workspace, unless explicitly set in their config
			// @TODO, this should really look at foreign:services:workspaceService
			if (typeof config.window.addToWorkspace === "undefined") {
				config.window.addToWorkspace = false;
			}
		}

		// Make sure affinity gets passed down to the container
		windowDescriptor.affinity = params.affinity ? params.affinity : config.window.affinity;

		// Override all settings with any "options" from the config
		if (config.window.options) {
			windowDescriptor = merge(windowDescriptor, config.window.options);
		}

		//Merging first so that any params that the dev passes in overwrite what we calculate.
		windowDescriptor = merge(windowDescriptor, resultFromDeriveBounds);

		// Add the config entries into customData so that it's available to the new window
		windowDescriptor.customData = merge(windowDescriptor.customData, config);
		// Any data passed by argument is added to spawnData so that it's available to the new window
		if (params.data) {
			windowDescriptor.customData.spawnData = params.data;
		}

		// Final override of any "options" that were passed in as an argument
		if (params.options) {
			windowDescriptor = merge(windowDescriptor, params.options);
			// If the component is unknown, we must make sure it has the proper URL for the
			// unknown component. If the component is native, the url is removed by the merge from
			// params.options (params.options.window does not have a url...).
			// We delete the windowType on both objects so that WPF/Native applications
			// are spawned as unknown HTML5 applications. Otherwise, the spawn requests
			// go off into the ether and prevent workspaces from loading properly.
			if (config.component && config.component.isUnknownComponent) {
				windowDescriptor.url = config.window.url;
				delete windowDescriptor.windowType;
				delete windowDescriptor.customData.window.windowType;
				// Assimilated windows set this boolean. If this is true, all the work above (deleting windowType)
				// does not matter, and we will try to spawn something that isn't
				// the unknown component.
				delete windowDescriptor.customData.window.native;
			}
		}
		// Bounds correction in case of OS display re-arrangements
		const allowToSpawnOffScreen = lodashGet(
			windowDescriptor,
			'customData.window.allowToSpawnOffScreen')
		if (!allowToSpawnOffScreen && params.forceOntoMonitor !== false) {
			windowDescriptor = this.adjustWindowDescriptorBoundsToBeOnMonitor(windowDescriptor)
		}
		// the execJSWhitelist will be an array of windows allowed to call executeJavascript on the resultant window.
		// It will eventually include the windowService, and the Application or SplinterAgent that actually creates
		// the window, and the window that initiated the request to spawn the window. The caller of `spawn` is not in the list.
		if (!windowDescriptor.execJSWhitelist) windowDescriptor.execJSWhitelist = [];
		windowDescriptor.execJSWhitelist.push(System.Window.getCurrent().name);

		windowDescriptor.customData.manifest = this.rawManifest; // pass in custom data so router can use
		Logger.system.debug("Launcher.compileWindowDescriptor", windowDescriptor);

		windowDescriptor.securityPolicy = SpawnUtils.getSecurityPolicy(windowDescriptor, this.finsembleConfig);
		windowDescriptor.permissions = SpawnUtils.getPermissions(windowDescriptor, this.finsembleConfig);
		return windowDescriptor;
	}

	/**
	 * Locates a window based on a componentType
	 * @param {object} windowIdentifier The parameters
	 * @param  {string}   windowIdentifier.componentType	 The type of component
	 * @return {finWindow} Returns a finWindow for the component, or null if not found
	 */
	componentFinder(windowIdentifier) {
		var windowsOfComponentType = activeWindows.findAllByComponentType(windowIdentifier.componentType);
		if (windowsOfComponentType.length) {
			return windowsOfComponentType[0];
		}
		return null;
	}

	/**
	 * Create Window Group
	 */
	createWindowGroup(err, message) {
		Logger.system.debug("Creating Group", message);
		if (!message.data.groupName) {
			return message.sendQueryResponse("No Group name Specified");
		}
		// Build Window List from window names/identifiers
		var actualWindowList = self.getWindowsFromNamesOrIdentifiers(message.data.windowList, true);
		self.windowGroups[message.data.groupName] = new LauncherWindowGroup({
			name: message.data.groupName,
			windows: actualWindowList
		});

		self.sendUpdatesToWindows(self.getWindowsFromNamesOrIdentifiers(message.data.windowList));

		if (message.sendQueryResponse) message.sendQueryResponse(null, "Success");
	}

	deleteWindowGroup(err, message) {
		Logger.system.debug("Deleting Group", message.data.groupName);
		if (!message.data.groupName) {
			return message.sendQueryResponse("No Group name Specified");
		}
		let groupName = message.data.groupName;
		if (self.windowGroups[groupName]) {
			let group = self.windowGroups[groupName];
			let windowList = group.getWindows();
			group.destroy();
			delete self.windowGroups[message.data.groupName];
			self.sendUpdatesToWindows(windowList);
		}
		message.sendQueryResponse(null, "Success");
	}

	/**
	 * Sets the dimensions and placement of the window by translating the launcherParams
	 * to the requires settings for an OpenFin windowDescriptor.
	 *
	 * @params	object	launcherParams Params from spawn()
	 * @returns {Promise} A promise that resolves to a new windowDescriptor that describes the new window.
	 * with defaultLeft, defaultTop, defaultWidth, defaultHeight, and claimMonitorSpace set.
	 */
	deriveBounds(launcherParams: SpawnParams): Promise<WindowDescriptor> {
		let windowDescriptor: WindowDescriptor = {};
		// Default to same monitor of the relativeWindow passed in (usually the window that launched us)

		// Get windowDescriptor for the previous window (the caller or relativeWindow)
		function addPreviousWindow(params) {
			async function promiseResolver(resolve) {
				var whichWindow = params.relativeWindow || params.launchingWindow;
				if (whichWindow) {
					params.previousWindow = activeWindows.getWindow(whichWindow.windowName);
					// TBD Cleanup: this was wrapping windows before they were created -- not clear needed
					// if (!params.previousWindow) {
					// 	Logger.system.debug(":wrap: deriveBounds addPreviousWindow", whichWindow);
					// 	let { wrap } = await FinsembleWindow.getInstance(whichWindow);
					// 	params.previousWindow = wrap;
					// }
				}
				resolve(params);
			}
			return new Promise(promiseResolver);
		}

		// Get all monitors
		function addAllMonitors(params) {
			return new Promise(function (resolve) {
				util.getAllMonitors(function (monitors) {
					params.monitors = monitors;
					resolve(params);
				});
			});
		}

		// Get the monitor descriptor for that previous window
		function addPreviousMonitor(params) {
			return new Promise(function (resolve) {
				if (params.previousWindow) {
					// as is this code on startup tried to get bounds of Workspace Service (i.e. the previousWindow).  This is a flawed way to determine
					// which monitor to start up....for one the Workspace service doesn't have a bounds after wrapper cleanup.  Short-term solution is
					// on error then set monitor[0] as the previousMonitor.
					params.previousWindow._getBounds((err, bounds) => {
						// bounds are undefined for Windowless WPF Components 
						if (!err && bounds !== undefined) {
							params.previousWindowBounds = bounds;
							util.Monitors.getMonitorFromScaledXY(bounds.left, bounds.top, (monitor) => {
								params.previousMonitor = monitor;
								resolve(params);
							});
						} else {
							params.previousMonitor = params.monitors[0];
							resolve(params);
						}
					});
				} else {
					resolve(params);
				}
			});
		}
		//Gets the monitor for the window that we're about to spawn.
		function getWhichMonitor(params) {
			return new Promise(function (resolve/*, reject*/) {
				var getWhichMonitorParams = {
					commandMonitor: params.monitor,
					monitors: params.monitors,
					launchingMonitorPosition: params.position,
					windowIdentifier: params.relativeWindow || params.launchingWindow,
					windowDescriptor: windowDescriptor
				};
				util.getWhichMonitor(getWhichMonitorParams, function (monitor) {
					resolve(monitor);
				});
			});
		}

		//Add information to launcherParams (previous window, monitors, etc).
		//when all is collected, call calculateBounds() to finish the job.
		const promiseResolver = async (resolve) => {
			launcherParams = await addPreviousWindow(launcherParams);
			launcherParams = await addAllMonitors(launcherParams);
			launcherParams = await addPreviousMonitor(launcherParams);
			let monitor = await getWhichMonitor(launcherParams);

			// If launcherParams supplied ephemeral no need to check, otherwise this request
			// may have come from 'showWindow' and need to get the components properties
			// from launcher. An 'ephemeral' window is most likely a menu and should
			// not update the lastOpenedMap
			if (!launcherParams.hasOwnProperty('ephemeral') && launcherParams.windowIdentifier && launcherParams.windowIdentifier.componentType) {
				launcherParams.ephemeral = Components[launcherParams.windowIdentifier.componentType].window.ephemeral;
			}

			let bounds = await this.calculateBounds(monitor, windowDescriptor, launcherParams);
			resolve(bounds);
		};

		return new Promise(promiseResolver);
	}

	/**
	 * The basic algorithm for handling monitor adjustments is:
	 * 1) Remove any orphaned components. These would be any spawnOnAllMonitor components that are now located
	 * on a different monitor than they started. We simply compare their existing monitor with the one they were
	 * spawned upon, and remove them if they aren't where they belong.
	 *
	 * 2) Add any motherless components. These would be any spawnOnAllMonitor components that are missing from a
	 * particular monitor, presumably because the monitor just got added.
	 *
	 * 3) Adjust component dimensions. Since the monitor size may have changed we need to adjust any components
	 * that had previously made assumptions about monitor size (such as a toolbar that is supposed to stretch across
	 * the top of the screen). We cycle through any components that have made a "claim" on monitor space and then
	 * simply call showWindow() with their original params in order to give them a chance to resettle.
	 */

	doMonitorAdjustments(changeData) {
		const monitors = changeData.monitors;
		// Event fires multiple times for monitor changes - so stop things from happening too many times.
		if (window.doingMonitorAdjustments) return;
		window.doingMonitorAdjustments = true;
		var components = {};
		asyncSeries([
			(done) => {
				this.monitorRemoveOrphans(monitors, components, done);
			},
			(done) => {
				this.monitorAddMotherless(monitors, components, done);
			},
			this.monitorAdjustDimensions
		], function () {
			window.doingMonitorAdjustments = false;
		});
	}

	/**
	 * Convenient way to execute stuff on a group or all windows
	 */
	executeWindowGroupFunctionByListGroupOrType(response, cb = Function.prototype) {
		let windowGroup;
		if (!response.data) response.data = {};
		let { groupName, windowList } = response.data;

		// If we have a groupName, use that otherwise use activeWindows
		if (groupName) {
			windowGroup = self.windowGroups[groupName];
		} else {
			windowGroup = activeWindows;
		}

		let functionToCall = windowGroup[response.functionName].bind(windowGroup);

		// If we've been passed a list or a componentType, filter the group by the list or componentType
		if (windowList) {
			delete response.data.componentType;
		}

		functionToCall(response.data, cb);

	}
	/**
	 * Returns a list of window descriptors that includes each window that the launcher has spawned.
	 */
	getActiveDescriptors() {
		var descriptors: { [k: string]: WindowDescriptor } = {};
		var allActiveWindows = activeWindows.getWindows();
		for (var name in allActiveWindows) {
			descriptors[name] = allActiveWindows[name].windowDescriptor;
		}
		return descriptors;
	}
	/**
		 * Gets offsets to monitor dimensions based on any space permanently
		 * claimed by other components such as toolbars.
		 * @param  {object} myMonitor The monitor
		 * @return {object}         An object containing offsets for top, bottom, left & right
		 */
	getClaimsOffset(myMonitor) {
		var claimAdjusted = clone(myMonitor); // error when using util.clone
		var availableRect = claimAdjusted.availableRect;
		var monitorRect = myMonitor.monitorRect || myMonitor.availableRect; // TODO: Sidd - a customer on Win 7 had monitorRect undefined causing showWindow to fail on the non-floating toolbar. Fix that by falling back to availableRect.
		var allActiveWindows = activeWindows.getWindows();
		for (var name in allActiveWindows) {
			var activeWindow = allActiveWindows[name];
			var windowDescriptor = activeWindow.windowDescriptor;
			if (!windowDescriptor || !windowDescriptor.claimMonitorSpace) { continue; }

			// Got a window with claim. Is it on my monitor?
			// @TODO, technically defaultLeft and defaultTop might have changed since when we first
			// created the toolbar, say for instance if we designed toolbars that you could drag to
			// different edges of the monitor, so we should change this code to retrieve these values
			// asynchronously using getWindowDescriptor()
			var x = windowDescriptor.defaultLeft, y = windowDescriptor.defaultTop;
			if (x < monitorRect.left || x >= monitorRect.right || y < monitorRect.top || y >= monitorRect.bottom) { continue; }

			// Yes, then let's adjust our available monitor dimensions
			var h = windowDescriptor.defaultHeight, w = windowDescriptor.defaultWidth;

			// horizontal toolbars
			if (w > h) {
				var bottom = y + h, top = y;
				if (top <= availableRect.top) {
					availableRect.top = bottom;
				} else {
					availableRect.bottom = top;
				}
			} else {
				var left = x, right = x + w;
				if (left <= availableRect.left) {
					availableRect.left = right;
				} else {
					availableRect.right = left;
				}
			}
		}

		var returnObj = {
			top: availableRect.top - myMonitor.availableRect.top,
			bottom: myMonitor.availableRect.bottom - availableRect.bottom,
			left: availableRect.left - myMonitor.availableRect.left,
			right: myMonitor.availableRect.right - availableRect.right
		};
		return returnObj;
	}

	/**
	 * Returns an map of components that can receive specific data types based on "advertiseReceivers" in the component config
	 *
	 * @param {array} dataTypes A list of dataTypes (string)
	 */
	getComponentsThatCanReceiveDataTypes(dataTypes) {
		var componentsThatCanReceiveDataTypes = {};
		for (var c in Components) {
			var component = Components[c];
			var receivers = component.component.advertiseReceivers;
			if (!receivers) { continue; }
			if (!Array.isArray(receivers)) {
				receivers = [receivers];
			}
			var commonDataTypes = receivers.filter(o => dataTypes.includes(o));
			for (var i = 0; i < commonDataTypes.length; i++) {
				var commonType = commonDataTypes[i];
				if (!componentsThatCanReceiveDataTypes[commonType]) {
					componentsThatCanReceiveDataTypes[commonType] = {
						componentTypes: [c],
						activeComponents: []
					};
				} else {
					componentsThatCanReceiveDataTypes[commonType].componentTypes.push(c);
				}
				var allActiveWindows = activeWindows.getWindows();
				var activeComponentNames = Object.keys(allActiveWindows).filter(name => {
					return allActiveWindows[name].componentType === c;
				});
				for (var j of activeComponentNames) { componentsThatCanReceiveDataTypes[commonType].activeComponents.push(j); }
				//componentsThatCanReceiveDataTypes[commonType].activeComponents = [...componentsThatCanReceiveDataTypes[commonType].activeComponents, ...activeComponents];
			}
		}
		for (var dataType of dataTypes) {
			if (!componentsThatCanReceiveDataTypes[dataType]) {
				componentsThatCanReceiveDataTypes[dataType] = {
					componentTypes: [],
					activeComponents: []
				};
			}
		}
		return componentsThatCanReceiveDataTypes;
	}

	/*
	A helper for pulling out the default config for url persistence
	*/
	getGlobalURLPersistence() {
		return this.appConfig.finsemble.servicesConfig && this.appConfig.finsemble.servicesConfig.launcher &&
			this.appConfig.finsemble.servicesConfig.launcher.hasOwnProperty("persistURL") ?
			this.appConfig.finsemble.servicesConfig.launcher.persistURL :
			false;
	}

	getDefaultConfig(componentType) {
		let defaultConfig = Components[componentType];
		return defaultConfig || null;
	}

	getComponentConfig(cb = Function.prototype) {
		const promiseResolver = (resolve) => {
			ConfigClient.getValue({ field: "finsemble.components" }, (err, componentConfig) => {
				//adding the value property to make the input on onComponentListChanged consistent with the listener functionality on the configClient.
				this.onComponentListChanged(null, { value: componentConfig });
				if (cb) cb();
				resolve();
			});
		};
		return new Promise(promiseResolver);
	}

	onComponentListChanged(err, componentConfig) {
		Logger.system.debug("Launcher getConfig finsemble.components", componentConfig);
		this.finsembleConfig.components = componentConfig.value;
		Components = componentConfig.value;

		//Make sure our stackedWindow gets into the Components object!
		this.addPredefinedComponents();
		componentArray = [];
		Object.keys(Components).map(function (component) {
			if (!Components[component].component) Components[component].component = {};
			Components[component].component.type = component;
			componentArray.push(Components[component]);
		});
		RouterClient.transmit("Launcher.update", {
			componentList: Components
		});
	}

	/**
	 * Gets the list of components, listens for changes on the components.
	 * @param {*} cb
	 */
	async getConfig(cb = Function.prototype) {
		Logger.system.debug("LauncherStartup: getConfig");

		//todo, investigate -- see if this is used anymore.
		const onCSSOverridePathChanged = function (err, cssConfig) {
			this.finsembleConfig.cssOverridePath = cssConfig.value;
		};

		ConfigClient.addListener({ field: "finsemble.components" }, this.onComponentListChanged.bind(this));
		ConfigClient.addListener({ field: "finsemble.cssOverridePath" }, onCSSOverridePathChanged);
		let { data: config } = await ConfigClient.getValues(null) as { data: { finsemble: any } };
		this.appConfig = config;
		this.finsembleConfig = config.finsemble; // replace manifest version of finsemble with processed version
		this.persistURL = ConfigUtil.getDefault(config.finsemble, "finsemble.servicesConfig.workspace.persistURL", false);
		cb();
	}

	/**
	 *
	 * @param {*} params
	 * @param {string} params.windowIdentifier
	 *
	 */
	getGroupsForWindow(params) {
		Logger.system.debug("Get Groups Window is in", params.windowIdentifier);
		var groups = [];
		for (let g of Object.keys(self.windowGroups)) {
			if (self.windowGroups[g].getWindow(params.windowIdentifier)) {
				groups.push(g);
			}
		}
		return groups;
	}

	/**
	 * Gets the proper monitor for a config.
	 * @param {string|number} params.monitor Monitor description, eg, "0" or "primary" or "mine".
	 * @param {*} cb
	 */
	async getMonitorInfo(params, cb) {
		// default to the monitor of the window that called getMonitorInfo.
		// Somehow this was not needed in openfin
		params.monitor = params.monitor || "mine";
		// Collect some asynchronous information we need to make our calculations. First all monitors.
		function addMonitors() {
			return new Promise(function (resolve) {
				util.getAllMonitors(function (monitors) {
					params.monitors = monitors;
					resolve();
				});
			});
		}
		// Next figure out which monitor is associated with the windowIdentifier that was passed in
		function addWIMonitorInfo() {
			return new Promise(function (resolve) {
				util.getMonitor(params.windowIdentifier, null).then(function (monitorInfo) {
					Logger.system.debug("add monitor info", params.windowIdentifier.windowName, monitorInfo);
					params.wiMonitorInfo = monitorInfo;
					resolve();
				});
			});
		}

		await addMonitors();
		await addWIMonitorInfo();

		// based on params.monitor and our wiMonitor, figure out which monitor we really want
		let getWhichMonitorParams = {
			commandMonitor: params.monitor,
			monitors: params.monitors,
			launchingMonitorPosition: params.wiMonitorInfo.position,
			windowIdentifier: params.windowIdentifier
		};
		util.getWhichMonitor(getWhichMonitorParams, function (myMonitor) {
			self.addUnclaimedRectToMonitor(myMonitor);
			cb(null, myMonitor);
		});
	}

	/**
	 * Gets all monitors.
	 * @param {*} cb
	 */
	getMonitorInfoAll(cb = Function.prototype) {
		var self = this;
		RouterClient.query("DockingService.getMonitorsFromDocking", {}, function (err, message) {
			if (err) return cb(err);
			let { monitors } = message.data;
			self.monitors = monitors;
			cb(null, self.monitors);
		});
	}

	/**
	 * Gets the manifest that's stashed on the window's customData.
	 * @param {*} cb
	 */
	getRawManifest(cb = Function.prototype) {
		const getOptionsSuccess = (opts) => {
			if (opts.customData && opts.customData.manifest) {
				self.rawManifest = opts.customData.manifest;
			} else {
				Logger.system.error("getRawManifest cannot find manifest in custom data");
			}
			cb(null);
		};
		const getOptionsError = function (err) {
			Logger.system.error("getRawManifest getOptions Error", err);
			cb(err);
		};
		System.Window.getCurrent()
			.getOptions(getOptionsSuccess, getOptionsError);
	}

	// get a new name based on sequential counter for base name (repeatable on restart)
	getSequentialName(name) {
		var keyData = localStorage.getItem(NAME_STORAGE_KEY);
		var storageData = {};
		if (keyData) {
			storageData = JSON.parse(keyData);
		}
		if (storageData[name] !== undefined) {
			storageData[name]++;
		} else {
			storageData[name] = 1;
		}
		localStorage.setItem(NAME_STORAGE_KEY, JSON.stringify(storageData));

		var newName = name + "-" + storageData[name] + "-" + this.appConfig.startup_app.uuid;;
		Logger.system.debug("getSequentialName", name, newName);
		return newName;
	}

	/**
	 * convert a list of window names or identifiers to a list of window objects
	 */
	getWindowsFromNamesOrIdentifiers(windowList, outputAsObject = false) {
		if (!Array.isArray(windowList)) windowList = [windowList];
		let actualWindowList;
		if (outputAsObject) {
			actualWindowList = {};
		} else {
			actualWindowList = [];
		}
		for (let i = 0; i < windowList.length; i++) {
			let w = activeWindows.getWindow(windowList[i]);
			if (w) {
				if (outputAsObject) {
					actualWindowList[w.name] = w;
				} else {
					actualWindowList.push(w);
				}
			}
		}
		return actualWindowList;
	}

	/**
	 * When each component finishes shutting down, it reports back to the Launcher via this channel.
	 */
	handleShutdownCompleted(err, response) {
		if (this.shutdownList.waitFor.includes(response.data.name)) {
			this.shutdownList.waitFor.splice(this.shutdownList.waitFor.indexOf(response.data.name), 1);
		}

		let STATUS_MESSAGE = "Component shutdownList completed, waiting on the following components to respond to the launcher:" +
			_difference(this.shutdownList.componentsOpenAtShutdown, this.shutdownList.componentsResponded).join(",") +
			". Waiting for the following components to complete shutdownActions" + this.shutdownList.waitFor;
		Logger.system.debug(STATUS_MESSAGE);
		console.debug(STATUS_MESSAGE);
	}

	/**
	 * After being notified that it needs to shutdown, the component will respond to the launcher. This message will tell the Launcher whether it should wait for the component to do some cleanup methods.
	 */
	handleShutdownResponse(err, response) {
		Logger.system.debug("handleShutdownResponse", response.data.name);
		this.shutdownList.componentsResponded.push(response.data.name);
		if (response.data.waitForMe) {
			Logger.system.debug("handleShutdownResponse push to wait", response.data.name);
			this.shutdownList.waitFor.push(response.data.name);
			return;
		}
	}
	/**
	 * Sends a heartbeat to all open windows to see if anything died.
	 */
	heartbeat() {
		const internalHeartbeatConfig =
			this.finsembleConfig.services.windowService.config.heartbeatResponseTimeoutDefaults
		const config = ConfigUtil.getDefault(
			this.finsembleConfig,
			"serviceConfig.window.heartbeatResponseTimeoutDefaults",
			{}
		);

		RouterClient.addListener("Finsemble.heartbeat", self.heartbeatListener);

		const fitInRange = (x, min = internalHeartbeatConfig.min, max = internalHeartbeatConfig.max) => {
			if (x < min) {
				console.warn(`Heartbeat timeout interval must be above the minimum value ${min}. Using ${min}.`);
				return min;
			}
			if (x > max) {
				console.warn(`Heartbeat timeout interval must be below the maximum value ${min}. Using ${min}.`);
				return max;
			}
			return x;
		}

		const crashed = fitInRange(config.crashed || internalHeartbeatConfig.crashed);
		const possiblyCrashed = fitInRange(config.possiblyCrashed || internalHeartbeatConfig.possiblyCrashed);
		const notResponding = fitInRange(config.notResponding || internalHeartbeatConfig.notResponding);

		const handleTransmit = (name: string, type: string) => RouterClient.transmit(HEARTBEAT_TIMEOUT_CHANNEL, { type, window: name });
		setInterval(() => {
			var date = Date.now();
			for (let name of activeWindows.getWindowNames()) {
				var activeWindow = activeWindows.getWindow(name);
				// Stacked windows do not send heartbeats.
				if (activeWindow && activeWindow.windowType !== "StackedWindow") {
					if (!activeWindow.lastHeartbeat) {
						activeWindow.lastHeartbeat = Date.now();
						continue;
					}
					/**
					 * None of this should be hard coded. Clients should be able to set what
					 * ever intervals they want.
					 *
					 * @TODO Refactor this to read the props from config and just iterate
					 * through them.. */

					const crashedState = (date - activeWindow.lastHeartbeat) > crashed && !activeWindow.errorSent;
					const possiblyCrashedState = (date - activeWindow.lastHeartbeat) > possiblyCrashed && !activeWindow.warningSent;
					const notRespondingState = date - activeWindow.lastHeartbeat > notResponding && !activeWindow.notRespondingSent;
					const nowRespondingState = date - activeWindow.lastHeartbeat <= notResponding && (activeWindow.errorSent || activeWindow.warningSent || activeWindow.notRespondingSent);

					/**
					 * Windows will appear crashed upon wake from sleep. If we get a signal that a window has crashed,
					 * we wait 50ms for any wake events to fire and check the status again.
					 */
					if (crashedState === true) {
						setTimeout(() => {
							if ((Date.now() - activeWindow.lastHeartbeat) > crashed && !activeWindow.errorSent) {
								activeWindow.errorSent = true;
								handleTransmit(name, "crashed");
								Logger.system.error("Heartbeat Status: Crashed Window", name);
							}
						}, 50);
					} else if (possiblyCrashedState === true) {
						activeWindow.warningSent = true;
						handleTransmit(name, "possiblyCrashed");
						Logger.system.warn("Heartbeat Status: Possibly Crashed Window", name);
					} else if (notRespondingState === true) {
						activeWindow.notRespondingSent = true;
						handleTransmit(name, "notResponding");
						Logger.system.warn("Heartbeat Status: Unresponsive Window", name);
					} else if (nowRespondingState === true) {
						Logger.system.info("Heartbeat Status: Window has returned to a responsive state", name);
						handleTransmit(name, "nowResponding");

						//set all state variables to false now that the window is responding
						activeWindow.warningSent = false;
						activeWindow.errorSent = false;
						activeWindow.notRespondingSent = false;
					}
				}
			}
		}, 1000)
	}

	heartbeatListener(err, response) {
		if (response.data.type == "component") {
			var activeWindow = activeWindows.getWindow(response.data.windowName);
			if (activeWindow) {
				activeWindow.lastHeartbeat = Date.now();
			}
		}
	}

	// Reset all window heartbeats
	resetHeartbeats() {
		for (let name of activeWindows.getWindowNames()) {
			let activeWindow = activeWindows.getWindow(name);
			activeWindow.lastHeartbeat = Date.now();
		}
	}

	/**
	 * Hyperfocuses a list, group, componentType or all windows
	 * @param {*} response.data.windowList list of window names or window identifiers
	 * @param {*} response.data.groupName group name
	 * @param {*} response.data.componentType component type
	 */
	hyperFocus(err, response) {
		let windowGroup;
		if (response.data && response.data.groupName) {
			windowGroup = self.windowGroups[response.data.groupName];
			delete response.data.groupName;
		} else {
			windowGroup = activeWindows;
		}

		if (response.data && response.data.componentType) {
			response.data.windowList = windowGroup.findAllByComponentType(response.data.componentType);
			delete response.data.componentType;
		} else if (!response.data.windowList) {
			response.data.windowList = windowGroup.getWindowNames();
		}
		response.functionName = "hyperFocus";
		this.executeWindowGroupFunctionByListGroupOrType(response);
	}

	// returns turn if window name is already in use by either active or pending-active window
	isWindowNameAlreadyUsed(windowName) {
		var result1 = activeWindows.getWindow(windowName) ? true : false;
		var result2 = this.pendingWindows.hasOwnProperty(windowName);
		Logger.system.debug("isWindowNameAlreadyUsed", windowName, "Result1", result1, "Result2", result2, "Pending", this.pendingWindows);
		return result1 || result2; // if active window or pending window
	}

	/**
	 * Retrieves a list of components from the configService.
	 * @param {function} cb callback.
	 * @private
	 */
	loadComponents(cb = Function.prototype) {
		Logger.system.log("LauncherStartup: loadComponents finsemble config", self.finsembleConfig);
		Components = {};
		// Mode allows us to optionally include a set of components. Normally, any component with component.mode set
		// in its config will be skipped. If the generalConfig.mode matches however then we allow it through.
		var mode = self.finsembleConfig.mode;
		if (!Array.isArray(mode)) {
			mode = [mode];
		}

		Object.keys(self.finsembleConfig.components).forEach((componentType) => {
			var config = self.finsembleConfig.components[componentType];
			//var componentMode = config.component ? config.component.mode : "";

			// If the component doesn't have a mode then it's safe, always allow in our list
			/*if (componentMode && componentMode !== "") {
				// component.mode can either be a string or an array of strings. So rationalize it to an array.
				if (componentMode.constructor !== Array) {
					componentMode = [componentMode];
				}

				commonModes = componentMode.filter(function (n) {
					return mode.indexOf(n) !== -1;
				});


				// If the current mode isn't in the list of modes for the component then don't include it in our list
				if (!commonModes.length) {
					return;
				}
			}*/
			var validUrl;
			Logger.system.debug("config.window.url", config);
			try {
				validUrl = new URL(config.window.url);
				config.window.url = validUrl.href;
			} catch (e) {
				if (config.window.url) {
					try {
						validUrl = new URL(self.finsembleConfig.moduleRoot + "/" + config.window.url);
						config.window.url = validUrl.href;
					} catch (e) {
						Logger.system.error("Invalid URL", config.window.url);
					}
				}
			}
			if (!config.foreign) {
				config.foreign = {};
			}
			if (!config.component) {
				config.component = {};
			}
			config.component.type = componentType;
			componentArray.push(config);
			Components[componentType] = config;
		});
		this.addPredefinedComponents();
		cb(null, Components);
		return Components;
	}

	/**
	 *
	 * @param {*} response  - query responder response
	 * @param {String} response.data.componentType - The component name
	 * @param {Object} response.data.manifest - ""
	 */
	registerComponent(err, message) {
		if (!message.data) {
			return message.sendQueryResponse("no data passed in");
		}
		let params = message.data;
		if (params.manifest && typeof params.manifest !== "object") {
			params.manifest = new LauncherDefaults().componentDescriptor;
		} else {
			//fill in any information that we don't have on the manifest with our defaults.
			//If the user failed to provide a URL, they get an unknown component.
			let defaultConfig = this.getDefaultConfig(this.getUnknownComponentName());
			if (defaultConfig) {
				defaultConfig = JSON.parse(JSON.stringify(defaultConfig));
				params.manifest = merge(defaultConfig, params.manifest);
			}
		}
		if (!params.componentType || !params.manifest) {
			//return error
			return message.sendQueryResponse("missing required fields");
		}
		//validate manifest....@todo we need a way to do this
		if (Components[params.componentType]) {
			Logger.error("Launcher Servers:", params.componentType, "Already registered");
			return message.sendQueryResponse(null, "Component already registered");
		}
		Components[params.componentType] = params.manifest;
		this.update();
		message.sendQueryResponse(null, "success");
	}


	/**
	 *
	 * @param {*} response
	 * @param {String} response.data.componentType - The component name
	 */
	unRegisterComponent(err, message) {
		if (!message.data) {
			return message.sendQueryResponse("no data passed in");
		}
		let params = message.data;
		if (!params.componentType) {
			//return error
			return message.sendQueryResponse("missing required fields");
		}
		if (Components[params.componentType]) {
			delete Components[params.componentType];
		}
		this.update();
		message.sendQueryResponse(null, "success");

	}

	/**
	 *
	 * @private
	 */
	async finishSpawn(defaultComponentConfig, windowDescriptor, params, objectReceivedOnSpawn) {
		let component = defaultComponentConfig.component.type;
		if (params.slave) {
			util.getFinWindow(windowDescriptor, (finWindow) => {
				self.makeSlave(finWindow, {
					windowName: params.previousWindow.name,
					uuid: params.previousWindow.uuid
				});
			});
		}

		windowDescriptor.uuid = windowDescriptor.uuid || util.guuid(); // Temp fix for stackedWindow (whole section needs rework)

		let result = {
			windowIdentifier: {
				windowName: windowDescriptor.name,
				uuid: windowDescriptor.uuid,
				componentType: component,
				monitor: windowDescriptor.monitorInfo,
				windowType: windowDescriptor.windowType
			},
			windowDescriptor: windowDescriptor
		};



		//Deprecated value: this.windowOptions.customData.component.canMinimize. New value: this.windowOptions.customData.foreign.services.windowService.allowMinimize
		let service = windowDescriptor.customData.foreign.services && windowDescriptor.customData.foreign.services.windowService !== undefined ? "windowService" : "dockingService";

		//Look first in the new location.
		let canMinimize = windowDescriptor.customData.foreign.services[service].allowMinimize;
		let canMaximize = windowDescriptor.customData.foreign.services[service].allowMinimize;

		//If the new location isn't found, fall back to deprecated version
		if (canMinimize === undefined) {
			canMinimize = windowDescriptor.customData.component.canMinimize;
		}
		if (canMaximize === undefined) {
			canMaximize = windowDescriptor.customData.component.canMaximize;
		}

		// Store references to the actual window we've created. Clients can use LauncherClient.getRawWindow()
		// to get direct references for (god forbid) direct DOM manipulation
		var activeWindowParams = {
			name: windowDescriptor.name,
			uuid: windowDescriptor.uuid,
			// If they left canMinimize un-configured, coerce undefined to be true, which is the default
			canMinimize: canMinimize !== false,
			canMaximize: canMaximize !== false,
			windowIdentifier: result.windowIdentifier,
			windowDescriptor: windowDescriptor,
			params: params,
			windowType: windowDescriptor.windowType
		};

		if (windowDescriptor.windowType === "FinsembleNativeWindow" || windowDescriptor.windowType === "StackedWindow") { // Since objectReceivedOnSpawn is the only thing that doSpawn gets to send to finishSpawn, this is where everything that the wrap needs resides
			//@note objectReceivedOnSpawn used to be 'finWindow
			//@todo figure out why the hell we need this information to wrap the thing...should just need the name??
			activeWindowParams = merge(objectReceivedOnSpawn, activeWindowParams);
		}

		Logger.system.debug(":wrap: finishSpawn", activeWindowParams);
		let { wrap: activeWindow } = await FinsembleWindowInternal.getInstance(activeWindowParams);
		activeWindow.wrapReady();
		activeWindow.addEventListener("closed", self.remove);
		activeWindow.windowDescriptor = windowDescriptor; // background note: the windowDescriptor was on the public instance, but not the private, so adding it here.  Required elsewhere (e.g. getActiveDescriptors)
		activeWindows.addWindow(activeWindow);

		delete this.pendingWindows[windowDescriptor.name]; // active now so no long pending...can remove

		// Add window to a group if needed
		if (params.groupName) {
			if (!this.windowGroups[params.groupName]) {
				this.createWindowGroup(null, {
					data: {
						groupName: params.groupName,
						windowList: [result.windowIdentifier]
					}
				});
			} else {
				let actualWindow = this.getWindowsFromNamesOrIdentifiers([result.windowIdentifier]);
				this.windowGroups[params.groupName].addWindows(actualWindow);
				this.sendUpdatesToWindows(actualWindow);
			}
		}

		Logger.perf.debug("Spawn", "stop", component, "from finishSpawn");

		return Promise.resolve({ err: null, data: result });
	}

	/**
	 * Makes a slave window which will automatically close when the master closes.
	 * @param  {finWindow} slave  An OpenFin window
	 * @param  {LauncherClient~windowIdentifier} master The window identifier of the master
	 */
	makeSlave(slave, master) {
		util.getFinWindow(master, function (masterWindow) {
			if (masterWindow) {
				masterWindow.addEventListener("closed", function () {
					Logger.system.debug("makeSlave close", slave.name);
					slave.close();
				});
				//@TODO, add more. Linker blurs when you do anything
				//but other windows might want to reposition themselves
				//on move, maximize, minimize, etc
			}
		});
	}

	/**
	 * Minimizes a list, group or all windows
	 * @param {*} response.data.windowList list of window names or window identifiers
	 * @param {*} response.data.groupName group name
	 * @param {*} response.data.componentType component type
	 */
	minimizeWindows(err, response) {
		if (!response) response = {};
		response.functionName = "minimize";
		this.executeWindowGroupFunctionByListGroupOrType(response);
	}

	/**
	 * See doMonitorAdjustments()
	 * Adds any motherless components. These would be any spawnOnAllMonitor components that are missing from a
	 * particular monitor, presumably because the monitor just got added.
	 */
	monitorAddMotherless(monitors, components, done) {
		let howMany = 0;
		for (let i = 0; i < monitors.length; i++) {
			for (let c in components) {
				let component = components[c];
				howMany++;
				if (!component[i]) {
					self.spawn({ component: c, monitor: i }, function (err, result) {
						result.windowDescriptor.spawnOnAllMonitors = true; // WHY WHY WHY DO WE NOT DO THIS BEFORE HAND
						howMany--;
						if (!howMany) {
							done();
						}
					});
				} else {
					setTimeout(function () { //prevent multiple events and showWindow stuff is handled by adjustMonitorDimensions
						howMany--;
						if (!howMany) {
							done();
						}
					}, 50);
				}
			}
		}
		if (!howMany) {
			done();
		}
	}

	/**
	 * See doMonitorAdjustments()
	 * Adjust component dimensions. Since the monitor size may have changed we need to adjust any components
	 * that had previously made assumptions about monitor size (such as a toolbar that is supposed to stretch across
	 * the top of the screen). We cycle through any components that have made a "claim" on monitor space and then
	 * simply call showWindow() with their original params in order to give them a chance to resettle.
	 */
	monitorAdjustDimensions(done) {
		Logger.system.debug("monitorAdjustDimensions");
		var claims = {};
		var allActiveWindows = activeWindows.getWindows();
		for (let windowName in allActiveWindows) {
			let entry = allActiveWindows[windowName];
			var w = entry.windowDescriptor;
			if (!w) continue;
			// Create a stash of all claims, and then unclaim them to set our
			// algorithm back to square
			if (w.claimMonitorSpace) {
				claims[windowName] = entry;
				delete w.claimMonitorSpace;
			}
		}

		// Now we simply call showWindow for each item in our stash with the original
		// params. This will reset it back, and should cause it to adjust accordingly
		// to the monitor it is now sitting on.
		for (let claimedName in claims) {
			let entry = claims[claimedName];
			self.showWindow(entry.windowIdentifier, entry.params, function () {
				entry.windowDescriptor.claimMonitorSpace = true;
			});
		}

		done();
	}

	/**
	 * see doMonitorAdjustments()
	 * Removes any orphaned components. These would be any spawnOnAllMonitor components that are now located
	 * on a different monitor than they started. We simply compare their existing monitor with the one they were
	 * spawned upon, and remove them if they aren't where they belong.
	 */
	monitorRemoveOrphans(monitors, components, done) { // All this stuff only works for OF Windows
		let allActiveWindows = activeWindows.getWindows();
		let howMany = 0;
		for (let w in allActiveWindows) {
			let win = allActiveWindows[w];
			let windowDescriptor = win.windowDescriptor;
			if (windowDescriptor.customData.component.spawnOnAllMonitors) {
				let componentType = windowDescriptor.customData.component.type;
				if (!components[componentType]) {
					components[componentType] = [];
				}
				let componentMonitor = windowDescriptor.monitorInfo;
				if (!monitors[componentMonitor]) { // remove window if no monitor - do we want to remove the window? might be better for performance if we let it stick around.
					howMany++;
					win.close(null, function () {
						howMany--;
						if (!howMany) {
							done();
						}
					});
				}
				else components[componentType][windowDescriptor.monitorInfo] = win;
			}
		}
		if (!howMany) {
			done();
		}
	}

	/**
	 * Removes a component. This is called when a window receives a closed event.
	 * If the window is still open then it is closed.
	 *
	 * @param  {string}   windowName Name of window that was closed
	 */
	remove(event) {
		let windowName;
		if (event.data) { // The stack close triggers a wrapper event. However, Openfin Close does not. Need to investigate.
			windowName = event.data.name;
		} else {
			windowName = event;
		}

		if (!windowName) return;
		Logger.system.info("remove windowName", windowName);
		//this block is for legacy support. all calls to remove in the Launcher pass in the windowDescriptor. The old functionality was to pass in a window name.
		if (typeof windowName !== "string") {
			let descriptor = JSON.parse(JSON.stringify(windowName));
			windowName = descriptor.name;
		}
		var activeWindow = activeWindows.getWindow(windowName);

		if (!activeWindow) {
			Logger.system.warn("Active Window not found", windowName);
			return;
		}
		//This is the only place in the application where we remove close listeners. In versions of 8.X, Openfin had a bug where if you remove one closed listener, all closed listeners would be removed.
		activeWindow.removeEventListener("closed", self.remove);
		Logger.system.debug("this.remove", activeWindow);

		if (activeWindow.windowDescriptor && activeWindow.windowDescriptor.claimMonitorSpace) { // stacked windows will have these properties
			self.getMonitorInfoAll(function (monitors) {
				RouterClient.publish("monitorInfo", monitors);
			});
		}

		//remove the window from all groups
		if (self.windowGroups) {
			for (let g of Object.keys(self.windowGroups)) {
				let group = self.windowGroups[g];
				group.removeWindows([windowName]);
				//if group is empty delete it
				if (!Object.keys(group.getWindows()).length) {
					group.destroy();
					delete self.windowGroups[g];
				}
			}
		}
		activeWindows.removeWindows([windowName], () => {
			Logger.system.debug("launcher.remove wrappers for window", windowName);
			//MyWrapManager.remove({ identifier: { windowName: windowName } }, () => {
			//This is to prevent workspaces/stackManager from catching this event and removing the window. Might be better for the launcher to send out a note to everyone who cares "Hey guys, I'm shutting down, go ahead and remove any listeners that you don't want to accidentally fire when these windows start closing". This is the expedient fix. That would probably be better, but require more architectural changes and testing.
			if (self.shuttingDown) {
				Logger.system.log("Component removed.", windowName, "Not transmitting the windowClosed event because the application is shutting down");
				return;
			}
			//Given the context above, we use the router to transmit out an event instead of relying on openfin window events. The WorkspaceService is currently the only thing listening for this message, so it can know when to load the next workspace.
			// DH 2/27/2019 - This could easily be swapped out for a call to WorkspaceClient.removeWindow().
			// We should ensure no paying clients are listening for this transmission and just remove it.
			RouterClient.transmit(LAUNCHER_SERVICE.WINDOW_CLOSED, { uuid: activeWindow.uuid, name: windowName });
			//});
		});
	}

	removeUserDefinedComponent(message, cb) {
		var err = null;
		if (Components[message.data.name]) {
			delete Components[message.data.name];
		} else {
			err = "Could not find component of type " + message.data.name;
		}
		this.update();
		cb(err, null);
	}

	/**
	 * Will reset the spawn stagger.
	 * @param {object} [params]
	 * @param {number} [params.monitorPosition] position of monitor to reset the stagger for
	 * @callback {function} [cb] optional callback.
	 */
	resetSpawnStagger(params, cb = Function.prototype) {
		const EMPTY_STAGGER = { x: null, y: null };
		if (typeof params === "function") {
			cb = merge({}, params);
			params = null;
		}

		if (params && typeof params.monitorPosition !== "undefined") {
			this.lastOpenedMap[params.monitorPosition] = EMPTY_STAGGER;
			this.lastAdjustedMap[params.monitorPosition] = EMPTY_STAGGER;

		} else {
			for (var monitorPosition in this.lastOpenedMap) {
				this.lastOpenedMap[monitorPosition] = EMPTY_STAGGER;
				this.lastAdjustedMap[monitorPosition] = EMPTY_STAGGER;

			}
		}

		cb();

	}

	/**
	 * Whenever windows are added/removed from groups, send updates to existing windows with their group memberships.
	 * @param {} windowList
	 */
	sendUpdatesToWindows(windowList) {
		Logger.system.debug("List of Updated Windows", windowList);
		if (!windowList) return;
		if (!Array.isArray(windowList)) {
			windowList = [windowList];
		}
		for (let w in windowList) {
			let win = windowList[w];
			let groups = self.getGroupsForWindow({ windowIdentifier: win.windowIdentifier });
			if (!Array.isArray(groups)) groups = [];
			if (win) RouterClient.publish("Finsemble.LauncherService.updateGroups." + win.name, groups);
		}
	}

	/**
	 * Given some bounds, returns the monitor that the window is on.
	 * @param {} bounds
	 */
	getMonitorByBounds(bounds) {
		return util.Monitors.getMonitorFromScaledXY(bounds.left, bounds.top);
	}

	/**
	 * Shows and/or relocates a native window. Not implemented yet!
	 * @param  {LauncherClient~windowIdentifier} windowIdentifier The window to show/move
	 * @param	object params	Parameters, see spawn()
	 * @param function cb Callback
	 */

	showNativeWindow(windowIdentifier, params, cb) {
		self.deriveBounds(params).then(function (newWindowDescriptor) {
			// send newWindowDescriptor to assimilation service
			let result = {
				windowIdentifier: {
					windowName: newWindowDescriptor.name,
					uuid: newWindowDescriptor.uuid,
					componentType: windowIdentifier.componentType,
					monitor: newWindowDescriptor.monitorInfo
				},
				windowDescriptor: newWindowDescriptor
			};
			cb(null, result);
		});
	}

	/**
	 * Shows and/or relocates a component window
	 * @param  {LauncherClient~windowIdentifier} windowIdentifier The window to show/move
	 * @param	object params	Parameters, see spawn()
	 * @param function cb Callback
	 */
	async showWindow(windowIdentifier, params, cb) {
		Logger.system.info("Launcher.ShowWindow.showAt Start", windowIdentifier, params);
		// do we have a windowName?
		let activeWindow;
		if (windowIdentifier.windowName) {
			activeWindow = activeWindows.getWindow(windowIdentifier.windowName);
		} else if (windowIdentifier.componentType) {
			activeWindow = self.componentFinder(windowIdentifier);
		}

		if (activeWindow) { //window was found
			let { data: bounds } = await activeWindow._getBounds();
			windowIdentifier = activeWindow.windowIdentifier;
			// The next 3 lines are needed because the windowIdentifier coming in from the client API is not guaranteed to have all of the information that we need in order to identify the window.
			// All that's needed to retrieve a window is a name. We need to know the componentType to derive default configs for this component.
			windowIdentifier = activeWindow.windowIdentifier;
			windowIdentifier.componentType = activeWindow.componentType;
			params.windowIdentifier = windowIdentifier;
			//By default, return the first monitor. This method will be overwritten if the call requires a specific monitor.
			let monitorFinder = () => {
				const promiseResolver = (resolve) => {
					util.getAllMonitors(function (monitors) {
						return resolve(monitors[0]);
					});
				};
				return new Promise(promiseResolver);
			};
			var specificMonitorFinder = function () {
				const promiseResolver = (resolve) => {
					util.getAllMonitors(function (monitors) {
						for (var i = 0; i < monitors.length; i++) {
							if (monitors[i].position === params.monitor) {
								return resolve(monitors[i]);
							}
						}
						resolve(null);
					});
				};
				return new Promise(promiseResolver);
			};

			var relativeMonitorFinder = function () {
				let relativeWindow = activeWindows.getWindow(params.relativeWindow.windowName);
				const promiseResolver = (resolve) => {
					relativeWindow._getBounds({}, async (err, relativeBounds) => {
						if (!err) {
							util.Monitors.getMonitorFromScaledXY(relativeBounds.left, relativeBounds.top, (monitor) => {
								//let monitor = window.DockingMain.getMonitorForWindow(window.DockingMain.getWindow(relativeWindow.name));
								// Once we get the monitor, overwrite 'mine' with its position to avoid further calls
								util.getAllMonitors(function (monitors) {
									for (var i = 0; i < monitors.length; i++) {
										if (monitors[i].name === monitor.name) {
											params.monitor = monitors[i].position;
											break;
										}
									}
									resolve(monitor);
								});
							});
						} else {
							util.getAllMonitors(function (monitors) {
								return resolve(monitors[0]);
							});
						}
					});
				};
				return new Promise(promiseResolver);
			};

			// When asking for relative positioning, we're implicitly wanting to use the same monitor as the relativeWindow
			if (!params.monitor && params.position === "relative") {
				monitorFinder = relativeMonitorFinder;
			}
			// If params.monitor is specified, try to get and use that monitor.
			if (typeof params.monitor !== "undefined") {
				if (params.monitor.unclaimedRect) { //have whichMonitor and not a monitor object
					monitorFinder = function () {
						return Promise.resolve(params.monitor);
					};
				} else if (params.monitor === "primary" || Number.isInteger(params.monitor)) { // asked to spawn on specific monitor
					monitorFinder = specificMonitorFinder;
				} else if (params.monitor === "mine") { // asked to spawn on same monitor as parent
					monitorFinder = relativeMonitorFinder;
				}
			}

			let monitor: any = await monitorFinder();
			// Adjust parameters to what deriveBounds expects
			// default to the monitor that the window already lives on

			var viewport = monitor ? monitor.unclaimedRect : null;

			// self.addUnclaimedRectToMonitor(monitor);
			if (!params.monitor && params.monitor !== 0) {
				params.monitor = monitor.position;
			} else {
				if (params.monitor.unclaimedRect) {
					viewport = params.monitor.unclaimedRect;
				}
			}

			if (params.position === "monitor") {
				viewport = monitor ? monitor.monitorRect : null;
			} else if (params.position === "available") {
				viewport = monitor ? monitor.availableRect : null;
			}
			// A developer can call showWindow with a combination of left, right or width (top, bottom or height).
			// This essentially means that a developer can be setting both position and dimension, just position, or just dimension.
			// Furthermore, they might set one or other position (left or right, top or bottom). The following logic is meant
			// to maintain the dimension or position where not overridden by the developer. This is done by rationalizing
			// the window location to just top,left,width,height.
			var leftAndRight = (params.left || params.left === 0) && (params.right || params.right === 0);
			var calculateWidth = params.width || params.width === 0;
			calculateWidth = calculateWidth || leftAndRight;
			if (!calculateWidth) {
				params.width = bounds.width;
			} else if (calculateWidth === true) {
				if (viewport) params.width = (viewport.right - params.right) - (params.left - viewport.left);
			}

			var topAndBottom = (params.top || params.top === 0) && (params.bottom || params.bottom === 0);
			var calculateHeight = params.height || params.height === 0;
			calculateHeight = calculateHeight || topAndBottom;
			if (!calculateHeight) {
				params.height = bounds.height;
			} else if (calculateHeight === true) {
				// TODO fix this in case people have a vertical toolbar or something. this has issues as is.
				if (viewport) params.height = (viewport.bottom - params.bottom) - (params.top - viewport.top);
			}

			// If right but no left, calculate the left position of the window relative to the viewport.
			if (params.position !== "relative" && (params.right || params.right === 0) && !params.left && params.left !== 0 && viewport) {
				params.left = (viewport.right - params.right) - params.width - viewport.left;
			}

			// If bottom but no top
			if (params.position !== "relative" && (params.bottom || params.bottom === 0) && !params.top && params.top !== 0 && viewport) {
				params.top = (viewport.bottom - params.bottom) - params.height - viewport.top;
			}

			// If neither left nor right are set then maintain it's left position
			if (!params.left && params.left !== 0 && !params.right && params.right !== 0 && params.top !== "adjacent" && params.bottom !== "adjacent") {
				params.left = bounds.left;
			}

			// If neither top nor right are set then maintain it's top position
			if (!params.top && params.top !== 0 && !params.bottom && params.bottom !== 0 && params.left !== "adjacent" && params.right !== "adjacent") {
				params.top = bounds.top;
			}

			// Since we've already calculated the absolute position, we need to make sure deriveBounds respects those coordinates
			if (!["relative", "unclaimed"].includes(params.position)) params.position = "monitor";
			//params.bottom = null;
			//params.right = null;
			function showIt() {
				let result = {
					windowIdentifier: {
						windowName: activeWindow.name,
						uuid: activeWindow.uuid,
						componentType: windowIdentifier.componentType,
						monitor: newWindowDescriptor.monitorInfo
					},
					windowDescriptor: newWindowDescriptor
				};
				activeWindow._show({},
					function () {
						Logger.system.info("Launcher.ShowWindow.showAt finished", activeWindow.name);
						/*
						 * 7/8/19 Joe - Previously this was assigning newWindowDescriptor defaults.
						 * With all of the logic above to ensure params has every type of bounds,
						 * it seems params should be checked first and only fall back to defaults
						 * if any are missing (which doesn't seem like it would ever be the case)
						 */
						let dockingDescriptor = {
							left: params.left || newWindowDescriptor.defaultLeft,
							top: params.top || newWindowDescriptor.defaultTop,
							right: params.right || (newWindowDescriptor.defaultLeft + newWindowDescriptor.defaultWidth),
							bottom: params.bottom || (newWindowDescriptor.defaultTop + newWindowDescriptor.defaultHeight),
							width: params.width || newWindowDescriptor.defaultWidth,
							height: params.height || newWindowDescriptor.defaultHeight,
							name: activeWindow.name,
							changeType: 1
						};

						//If the show call doesn't prohibit autofocus, focus it. Search does this when showing search results.
						if (params.autoFocus !== false) {
							//This is so that any click elsewhere will hide the window.
							activeWindow.focus();
						}

						//@todo, when docking is rewritten and the window wraps get more love, put this functionality into a the wrappers. Right now they don't have the router and I'm unsure how things are working with multiple routers in the same window.
						RouterClient.transmit("DockingService.updateWindowLocation", { windowName: windowIdentifier.windowName, location: dockingDescriptor });
						if (cb) {
							cb(null, result);
						}
					});
			}

			//Evaluates a given params property. Returns true if the window to show is ephemeral/the given parameter is a string, or the value is missing, otherwise returns false
			const paramMissingOrString = (prop) => {
				const param = params[prop];
				if (params.ephemeral || isNumber(param) === false || typeof param === "string") {
					return true;
				}
				return false;
			}

			let newWindowDescriptor = await self.deriveBounds(params);
			//If the window is not ephemeral or the bounds contained in params aren't strings, use the passed values. Otherwise use the values calculated from 'deriveBounds'
			let newBounds = {
				left: paramMissingOrString("left") ? newWindowDescriptor.defaultLeft : params.left,
				top: paramMissingOrString("top") ? newWindowDescriptor.defaultTop : params.top,
				right: paramMissingOrString("right") ? (newWindowDescriptor.defaultLeft + newWindowDescriptor.defaultWidth) : params.right,
				bottom: paramMissingOrString("bottom") ? (newWindowDescriptor.defaultTop + newWindowDescriptor.defaultHeight) : params.bottom,
				width: paramMissingOrString("width") ? newWindowDescriptor.defaultWidth : params.width,
				height: paramMissingOrString("height") ? newWindowDescriptor.defaultHeight : params.height
			};
			activeWindow._setBounds({ bounds: newBounds }, showIt);

		} else { //window not found
			if (params.spawnIfNotFound && windowIdentifier.componentType) {
				if (windowIdentifier.windowName) {
					params.name = windowIdentifier.windowName;
				}
				params.component = windowIdentifier.componentType;
				Logger.system.debug("Launcher.ShowWindow.show spawn", windowIdentifier);
				self.spawn(params, (err, data) => {
					Logger.system.debug("Launcher.ShowWindow.show spawn complete", windowIdentifier);
					cb(err, data);
				});
			} else {
				cb("RouterService:showWindow. Requested window not found.");
			}
		}
	}

	/**
	 * Rewrite of shutdownComponents to call close on components.
	 * @param {function} done
	 */
	shutdownComponents(done) {
		// assume done if everybody doesn't close within alloted time so dependencies can close and shutdownList can continue.
		var myTimeout = setTimeout(() => {
			done();
		}, (this.finsembleConfig.shutdownTimeout || 10000) - 2000);

		asyncForEach(activeWindows.windows, (win, callback) => {
			(win as BaseWindow)._close({ removeFromWorkspace: false, ignoreParent: true }, callback);
		}, () => {
			// make sure done doesn't get called back twice
			clearTimeout(myTimeout);
			done();
		});
	}

	/**
	 * Removes disallowed parameters before we pass data into compileWindowDescriptor.
	 * @param params SpawnParams
	 */
	_removeDisallowedSpawnParams(params: SpawnParams) {
		// Delete securityPolicy and permissions properties
		// User may try to pass them to override our security settings
		if (params.options) {
			delete params.options.securityPolicy;
			delete params.options.permissions;
		}

		// params is of type spawnParams. SecurityPolicy is not a supported parameter, so we don't want to put it into the type definition and have it documented.
		// the (as any) cast is here so that typescript can build.
		delete (params as any).securityPolicy;
		delete (params as any).permissions;
		return params;
	}
	/**
	* Launches a component.
	* @param {object} params See LauncherClient
	* @param {function} cb Callback
	*/
	async spawn(params: SpawnParams, cb: StandardCallback) {
		let errorString: any = null;
		let descriptor: any = null;

		let component = params.component;
		// This fixes a bug in our workspace save. We save everything and preload scripts in here overwrites what we actually want to use.
		//Loop through any preload scripts and remove FSBL
		if (params.options && params.options.preloadScripts) {
			if (Array.isArray(params.options.preloadScripts)) {
				for (let i = 0; i < params.options.preloadScripts.length; i++) {
					let preloadItem = params.options.preloadScripts[i];
					if (preloadItem && preloadItem.url) {
						if (preloadItem.url.indexOf(".FSBL.js")) {
							delete params.options.preloadScripts[i];
						}
					}
				}
			}
		}

		Logger.system.debug("Launcher.spawn", component, params);
		//If the Launcher is shutting down, don't allow new components to come online. If the dev wants components to come up, they should spawn them prior to transmitting the shutdownList request.
		if (this.shuttingDown) {
			Logger.system.log("Dropping spawn request. Application is shutting down", component, params);
			return;
		}
		Logger.perf.debug("Spawn", "start", component, params);

		// if component is not a string then we are trying to spawn multiple components (this is still experimental and not yet used - it is planned so that group launches get easier via pins etc.)
		if (component && !(typeof component === "string" || component instanceof String)) {
			this.spawnGroup(component, params, cb);
			return;
		}
		// @todo Terry, cleanup, the following code is not robust. It should be rewritten to ensure that config is set by
		// default, and then overridden by params.options.customData. I think that when this is restructured
		// to the point that we no longer need the isAd-hoc flag then we'll know it's robust.
		var config = this.getDefaultConfig(component);



		//@todo ad-hoc components should use preferences to save themselves, and then this block of code would be unnecessary.
		Logger.system.debug("Launcher.spawn 2", component, params);
		if (!config) {
			if (get(params, "options.customData.component.isUserDefined")) {
				config = params.options.customData;
			} else if (params.url) {
				// No config, but has as URL. Treat as an ad-hoc component. This path is hit when using using window.open
				// from nativeOverrides.js

				//System will bomb if a component name has periods, the distributed store does
				//some string splitting on periods because of internal identifiers. (e.g. [...].Finsemble.[...])
				component = params.name ? params.name.replace(/\./g, "-") : params.url.replace(/\./g, "-");
				config = {
					window: {},
					component: {}
				};
			} else {
				// Use a config to drive what component is shown if we can't find one in our list
				const unknownComponentName = this.getUnknownComponentName() || "404";
				const unknownConfig = this.getDefaultConfig(unknownComponentName) || UNKNOWN_DEFAULT_CONFIG;
				config = {
					window: unknownConfig.window,
					component: {
						type: component,
						isUnknownComponent: true,
					},
				}
				component = params.name;
				set(params, "options, url", get(config.window, "url"));
				Logger.system.warn(`No config found for component "${component}". The URL for this component will be set to the unknown component URL. When the config is restored, the URL will be reset.`)
			}
		}

		// singleton windows - TODO - test this
		Logger.system.debug("Launcher.spawn 3", component, params);
		if (component && config.component.singleton) {
			var existingWindows = activeWindows.findAllByComponentType(component);
			if (existingWindows.length) {
				// Bring existing window(s) to front
				existingWindows.forEach(window => window.bringToFront());
				return cb(`A window for this singleton component already exists: ${existingWindows[0].name}`);
			}
			for (let p in this.pendingWindows) {
				let pendingWindow = this.pendingWindows[p];
				if (pendingWindow.componentType === component) {
					return cb("A window for this singleton component is in the process of being spawned: " + p);
				}
			}
		}

		var requestedPositioning = {
			left: params.left,
			right: params.right,
			top: params.top,
			bottom: params.bottom
		};


		params = this._removeDisallowedSpawnParams(params);
		// window config from json is the default. params argument overrides.
		params = merge(config.window, params);

		//System will bomb if a component name has periods, the distributed store does
		//some string splitting on periods because of internal identifiers. (e.g. [...].Finsemble.[...])
		if (params.options && params.options.name) params.name = params.options.name.replace(/\./g, "-");
		let descriptorName;

		if (params.addToWorkspace) {
			descriptorName = params.name ? params.name : getRandomWindowName(component, this.appConfig.startup_app.uuid);
		} else {
			descriptorName = params.name ? params.name : this.getSequentialName(component);
		}

		// Add to the workspace *if* the caller wants it added (for instance from the app launcher)
		// but *also* if the defaultComponentConfig for the component allows it to be added to workspaces (defaults to true)
		if (params.addToWorkspace && config.window.addToWorkspace !== false) {
			WorkspaceClient.addWindow({ ...params, name: descriptorName } as FinsembleWindowData);
		}

		if (requestedPositioning.left || requestedPositioning.right || requestedPositioning.top || requestedPositioning.bottom) {
			params.left = requestedPositioning.left;
			params.right = requestedPositioning.right;
			params.top = requestedPositioning.top;
			params.bottom = requestedPositioning.bottom;
		}

		// If we're set to spawnOnAllMonitors then we're going to call spawn() recursively, but
		// setting the monitor for each one. Note that since this is re-entrant, we need to make
		// sure we don't create an infinite loop! If params.monitor is set to anything other than "all"
		// then we bypass this.
		if (params.monitor === "all" || (config.component.spawnOnAllMonitors && (typeof (params.monitor) === "undefined"))) {
			this.spawnOnAllMonitors(component, params, cb);
			return;
		}

		//get default OpenFin config.
		var baseDescriptor = new LauncherDefaults().windowDescriptor;
		if (params.options) {
			baseDescriptor = merge(baseDescriptor, params.options);
		}

		baseDescriptor.name = descriptorName;
		//Logger.system.debug("ComponentName", baseDescriptor.name);
		baseDescriptor.componentType = component; //@TODO, remove?
		baseDescriptor.customData.component.type = component;
		baseDescriptor.customData.cssOverride = self.cssOverride;

		let retryAttempt = 0;
		Logger.system.debug("Launcher.spawn 4", component, params);

		let interval = setInterval(function () {
			retryAttempt++;
			//if not in pending and not in active then the window was closed.
			if (this.pendingWindows[baseDescriptor.name] && !activeWindows.getWindow(baseDescriptor.name)) {
				//console.warn("Failed To Launch " + baseDescriptor.name + " " + retryAttempt);
				if (retryAttempt > 2) {
					// This is where failed windows used to be force closed and a respawn attempted but on some systems windows take a long time to load and force closing them or retrying spawning was causing problems. For now, just warn if things are taking too long.
					// Attempting to wrap the window while loading here was also taking a really long time. Just letting things take their course seems to eventually work.
					console.warn("Window Taking Really Long to Load:", baseDescriptor.name);
					clearInterval(interval);
				}
			} else {
				clearInterval(interval);
			}
		}, 5000);

		if (this.finsembleConfig.system.finsembleLibraryPath) {
			baseDescriptor.preloadScripts = [{ url: this.finsembleConfig.system.finsembleLibraryPath }];
		} else {
			baseDescriptor.preloadScripts = [];
		}

		const preload = config.component.preload;
		if (preload) {
			const inject = (Array.isArray(preload) ? preload : [preload])
				.map(x => ({ url: this._generateURL(x) }));
			baseDescriptor.preloadScripts = Array.from(new Set([...inject, ...baseDescriptor.preloadScripts]));
		}

		baseDescriptor.preload = baseDescriptor.preloadScripts;// For backwards  compatibility. preload hasn't been used since OF 7
		// url overrides the default component url (and can also be used to simply spawn a url). Ignore if spawned by workspace otherwise it will overwrite the url from workspace. This is dealt with at a later point with a check for the persistURL config item.
		if (params.url && !params.spawnedByWorkspaceService) {
			baseDescriptor.url = params.url;
		}

		if (params.windowType === "openfin") params.windowType = "OpenFinWindow"; // Config friendly naming
		if (params.windowType === "assimilation") params.windowType = "NativeWindow"; // Config friendly naming
		if (params.windowType === "assimilated") params.windowType = "NativeWindow"; // Config friendly naming
		if (params.windowType === "native") params.windowType = "FinsembleNativeWindow"; // Config friendly naming
		if (params.windowType === "application") params.windowType = "OpenFinApplication"; // Config friendly naming
		if (params.native) params.windowType = "NativeWindow"; //Backward Compatibility
		if (baseDescriptor.type === "openfinApplication") params.windowType = "OpenFinApplication"; //Backward Compatibility
		if (!params.windowType) params.windowType = "OpenFinWindow";
		baseDescriptor.windowType = params.windowType;

		Logger.system.debug("Launcher.spawn 5", component, params);

		if (["NativeWindow", "FinsembleNativeWindow"].includes(params.windowType)) {
			//baseDescriptor.native = params.native;
			baseDescriptor.alias = params.alias;
			baseDescriptor.path = params.path;
			baseDescriptor.env = params.env;
			baseDescriptor.arguments = params.arguments;
		}
		let newWindowDescriptor = await this.deriveBounds(params);
		let windowDescriptor = self.compileWindowDescriptor(config, params, baseDescriptor, newWindowDescriptor);

		// Preload the titlebar if component supports FSBLHeader and
		// deliveryMechanism is set to "preload" under -
		// Window Manager entry in configs/config.json
		// Check for customData.window.compound
		const isCompoundWindow = lodashGet(windowDescriptor, 'customData.window.compound', false);
		// Check for customData.Window Manager.FSBLHeader
		const componentSupportsHeader = !isCompoundWindow && lodashGet(
			windowDescriptor, ['customData', 'foreign',
				'components', 'Window Manager', 'FSBLHeader'], false);
		// Get the delivery mechanism value from config
		const deliveryMechanism = this.finsembleConfig['Window Manager'].deliveryMechanism;
		// Make sure that component supports header and the delivery mechanism is set to "preload"
		if (componentSupportsHeader && deliveryMechanism === DELIVERY_MECHANISM.PRELOAD) {
			let url = this._generateURL(Components['windowTitleBar'].window.url);
			// push into the preloadScripts array
			if (windowDescriptor.preloadScripts.findIndex(obj => obj.url === url) === -1) {
				windowDescriptor.preloadScripts.push({ url: url });
			}

			// preload is a shallow copy of preloadScripts but when loaded from another workspace they can point to different addresses in memory
			if (windowDescriptor.preload.findIndex(obj => obj.url === url) === -1) {
				windowDescriptor.preload.push({ url: url });
			}
		}
		// TODO, [Terry] persistURL logic should be in the workspace-service, not in launcher service.
		//[Ryan] the logic should sit in the workspace client( although I think we actually do it in the window client right now)
		if (params.spawnedByWorkspaceService) {
			let persistURL = ConfigUtil.getDefault(config.foreign, "foreign.services.workspace.persistURL", this.persistURL);
			/** DH 3/11/2019
			 * We store the fact that a component had its URL swapped with the unknown component URL
			 * on the windowDescriptor itself. Therefore, if that prop is true, we need to swap the
			 * current URL with the one found in config. This logic will likely need to remain here
			 * (where we have access to the component's config), regardless of where the persistURL
			 * logic lands.*/
			const isUnknownComponent = get(params, "options.customData.component.isUnknownComponent");
			if ((isUnknownComponent || !persistURL) && config.window) {//revert the url to what is passed in from components.
				windowDescriptor.url = config.window.url;
			}
		}
		if (self.isWindowNameAlreadyUsed(windowDescriptor.name)) {
			errorString = `Cannot spawn new window: windowDescriptor.name ${windowDescriptor.name} already used`;
		} else {
			// save window properties of pending windows that are used later (e.g. to check dupes or for singleton windows) (will be removed in finishSpawn)
			this.pendingWindows[windowDescriptor.name] = {
				uuid: windowDescriptor.uuid || System.Application.getCurrent().uuid,
				componentType: baseDescriptor.componentType,
			};
			let spawnResult = await self.doSpawn(windowDescriptor);
			let { err, data: objectReceivedOnSpawn } = spawnResult;
			Logger.system.info(windowDescriptor.name, "Inside LauncherService.spawn(), before ");
			if (err) {
				errorString = err;
			} else {
				let { err, data } = await self.finishSpawn(config, windowDescriptor, params, objectReceivedOnSpawn);
				if (err) {
					errorString = err;
				} else {
					descriptor = data;
				}
				Logger.system.info(windowDescriptor.name, "Inside LauncherService.spawn(), after ");
			}
		}

		if (errorString) {
			Logger.system.error(errorString);
		}

		cb(errorString, descriptor);
	}

	/**
	 * Takes a file path and converts it into preload URL, second argument makes it possible
	 * to write test for this method in the future.
	 * @param path The file path
	 * @param applicationRoot Application root from finsemble config or specified one
	 */
	_generateURL(path: string, applicationRoot?: string): string {
		const appRoot = applicationRoot || this.finsembleConfig.applicationRoot
		let url;
		try {
			url = (new URL(path)).href;
		} catch (e) {
			url = `${appRoot}/components/mindcontrol/${path}`
		}
		return url;
	}

	getUnknownComponentName() {
		return this.appConfig.finsemble.servicesConfig && this.appConfig.finsemble.servicesConfig.launcher &&
			this.appConfig.finsemble.servicesConfig.launcher.hasOwnProperty("unknownComponent") ?
			this.appConfig.finsemble.servicesConfig.launcher.unknownComponent :
			null;
	}
	/**
	* Launches a copy of the requested component on each of a user's monitors.
	* @param {string} component The type of the component to launch
	* @param {object} params See spawn.
	* @param {function} cb Callback
	* @todo use asyncLib for spawning here. Get rid of the `remaining` var.
	*/
	async spawnOnAllMonitors(component, params, cb) {
		//Gets all monitors and pushes a spawn call for each monitor to an array of async functions.
		this.getMonitorInfoAll((err, monitors) => {
			let tasks = [];
			monitors.forEach((monitor) => {
				tasks.push((done) => {
					var paramCopy = JSON.parse(JSON.stringify(params));
					paramCopy.monitor = monitor.position;
					paramCopy.component = component;
					self.spawn(paramCopy, function (err, result) {
						if (!err) {
							result.windowDescriptor.spawnOnAllMonitors = true;
						}
					});
				});
			});
			asyncParallel(tasks, (err) => {
				cb(err);
			});
		});
	}

	/**
	 * Spawns an OF window, or sends a request to the native service to spawn a native window.
	 * Callback returns a handle to the new window
	* @param {LauncherClient~windowDescriptor} windowDescriptor The descriptor to launch
	* @param {function} cb Callback
	*/
	doSpawn(windowDescriptor: WindowDescriptor, cb = Function.prototype): Promise<{ err: any, data: any }> {
		const promiseResolver = (resolve) => {
			this.createSplinterAndInject.createWindow({ windowDescriptor }, (err, windowIdentifier) => {
				Logger.system.debug("doSpawn createWindow", err, windowIdentifier, windowDescriptor);
				cb({ err, data: windowIdentifier });
				resolve({ err, data: windowIdentifier });
			});
		};
		return new Promise(promiseResolver);
	}


	/**
	 * Given an object where the keys are component names and the values are component configs, it spawns the list of components.
	 * @private */
	spawnGroup(components, params, cb) {
		let errors, responses = [];
		let componentList = Object.keys(components);
		const spawnComponent = (componentType, done) => {
			let cloneParams = Object.assign({}, params);
			if (components[componentType].params) {
				cloneParams = Object.assign(params, components[componentType].params);
			}
			cloneParams.component = componentType;
			self.spawn(cloneParams, function (err, response) {
				if (err) {
					errors.push(err);
				} else {
					responses.push(response);
				}
				done(err);
			});
		};
		asyncForEach(componentList, spawnComponent, function () {
			cb(errors, responses);
		});
	}

	/**
	 * Splintering.
	 */
	update() {
		// @TODO, this should probably be pubsub (see startPubSubs below)
		RouterClient.transmit("Launcher.update", {
			componentList: Components,
		});
	}
}
Logger.start();
