export default function LauncherDefaults() {
	// We must provide a clean slate of properties otherwise new windows will spawn with the same
	// properties as the main window (from the openfin manifest). Here we set reasonable defaults
	// for every window. We allow some properties to carry through from the manifest (such as cornerRounding).
	//
	// A developer can then override any of *these* values by specifying an "options" entry in the component
	// config, or by passing an "options" argument to spawn().
	this.windowDescriptor = {
		alias: "",
		path: "",
		arguments: "",
		autoShow: true,
		backgroundColor: "#151f28",
		alwaysOnTop: false,
		fixedPosition: false,
		frame: false,
		frameConnect: "",
		hoverFocus: false,
		defaultCentered: false,
		maxHeight: -1,
		maximizable: true,
		maxWidth: -1,
		minHeight: 0,
		minimizable: true,
		minWidth: 0,
		opacity: 1,
		resizable: true,
		contextMenu: false,
		resizeRegion: {
			size: 5,
			bottomCorner: 10
		},
		saveWindowState: false,
		showTaskbarIcon: true,
		state: "normal",
		waitForPageLoad: false,
		accelerator: {
			devtools: true,
			reload: true,
			zoom: false,
			reloadIgnoringCache: true
		},
		//so that child-apps inherit taskbar icon from the main application. This prevents apps (eg, symphony) from showing up as the taskbar icon.
		icon: null,
		customData: {
			component: {
				type: "",
				canMinimize: true,
				canMaximize: true
			},
			foreign: {
				services: {
					dockingService: {
						isArrangable: false
					},

					launcherService: {
						inject: false
					}
				},
				components: {
					"App Launcher": {
						launchableByUser: true
					},
					"Window Manager": {
						persistWindowState: true,
						FSBLHeader: true,
						showLinker: false
					}
				}
			}
		}
	};
	// A default manifest
	this.componentDescriptor = {
		"window": {
			"url": "about:blank",
			"frame": false,
			"resizable": true,
			"autoShow": true,
			"top": "center",
			"left": "center",
			"width": 400,
			"height": 432,
			"addToWorkspace": true
		},
		"component": {
			"inject": false,
			"spawnOnStartup": false,
		},
		"foreign": {
			"services": {
				"dockingService": {
					"canGroup": true,
					"isArrangable": true
				}
			},
			"components": {
				"App Launcher": {
					"launchableByUser": true
				},
				"Window Manager": {
					"showLinker": true,
					"FSBLHeader": true,
					"persistWindowState": true,
					"title": "Welcome"
				},
				"Toolbar": {
					"iconClass": "ff-component"
				}
			}
		}
	};
}

export const UNKNOWN_DEFAULT_CONFIG = {
	window: {
		url: "about:blank",
		frame: false,
		resizable: true,
		autoShow: true,
		top: "center",
		left: "center",
		width: 400,
		height: 432,
		addToWorkspace: false,
	},
	component: {
		inject: false,
		spawnOnStartup: false,
	},
	foreign: {
		services: {
			dockingService: {
				canGroup: true,
				isArrangable: true
			}
		},
		components: {
			"App Launcher": {
				launchableByUser: true
			},
			"Window Manager": {
				showLinker: true,
				FSBLHeader: true,
				persistWindowState: true,
				title: "Welcome"
			},
			Toolbar: {
				iconClass: "ff-component"
			}
		}
	}
}