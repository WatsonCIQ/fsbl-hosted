export type Bounds = {
	top: number;
	left: number;
	width: number;
	height: number;
	/**
	 * Daniel H. 2/22/2019
	 * Can we just remove these and derive when necessary?
	 */
	bottom?: number;
	right?: number;
}

/**
 * Contains all the optional keys on the FinsembleWindowData
 * type. See FinsembleWindowData for more info.
 *
*/
export type OptionalFinsembleWindowData = {
	/** DH 5/8/2019
	 * Confusingly, this is not the "official" component state.
	 * That's stored under an entirely different key. I'm not
	 * sure why or how this is here, but I definitely saw it
	 * at runtime.
	 */
	componentState: Record<string, any>;
	accelerator: {
		devtools: boolean;
		reload: boolean;
		reloadIgnoringCache: boolean;
		zoom: boolean;
	};
	alphaMask: {
		blue: number;
		green: number;
		red: number;
	};
	alwaysOnBottom: boolean;
	alwaysOnTop: boolean;
	applicationIcon: string;
	autoShow: boolean;
	backgroundColor: string;
	backgroundThrottling: boolean;
	bottom: number | string;
	bounds: Bounds;
	cachedHeight: number;
	cachedLeft: number;
	cachedTop: number;
	cachedWidth: number;
	callstack: string;
	center: boolean;
	childWindowIdentifiers: [any],
	contextMenu: boolean;
	cornerRounding: {
		height: number;
		width: number;
	};
	customData: any;
	defaultCentered: boolean;
	defaultHeight: number;
	defaultLeft: number;
	defaultTop: number;
	defaultWidth: number;
	delay_connection: boolean;
	disableIabSecureLogging: boolean;
	draggable: boolean;
	"enable-plugins": boolean;
	enableLargerThanScreen: boolean;
	exitOnClose: boolean;
	experimental: {
		disableInitialReload: boolean;
		v2Api: boolean;
	};
	/** DH 6/14/2019
	 * We added this property because
	 * Electron/OF maintain their own
	 * record of which window has focus,
	 * creating the possibility for the
	 * OS and Electron/OF to think different
	 * windows have focus. Currently, we
	 * only keep this state on OpenFinWindows.
	 * If we can figure out a different way
	 * to synchronize the OS and container,
	 * we may not need this state.
	 */
	focused: boolean;
	frame: boolean;
	frameConnect: string;
	hasLoaded: boolean;
	height: number | string;
	hideOnBlur: boolean;
	hideOnClose: boolean;
	hideWhileChildrenVisible: boolean;
	icon: string;
	launchExternal: "";
	left: number | string;
	loadErrorMessage: "";
	maxHeight: number;
	maxWidth: number;
	maximizable: boolean;
	minHeight: number;
	minWidth: number;
	minimizable: boolean;
	monitorDimensions: {
		top: number;
		bottom: number;
		left: number;
		right: number;
		height: number;
		width: number;
	};
	opacity: number;
	options: any;
	plugin: Record<string, any>[];
	plugins: boolean;
	preloadScripts: {
		state?: "succeeded";
		url: string;
	}[];
	resizable: boolean;
	resize: boolean;
	resizeRegion: {
		bottomRightCorner: number;
		sides: {
			top: number;
			bottom: number;
			left: number;
			right: number;
		};
		size: number;
	};
	right: number | string;
	saveWindowState: boolean;
	shadow: boolean;
	show: boolean;
	showTaskbarIcon: boolean;
	skipTaskbar: boolean;
	smallWindow: boolean;
	state: string;
	spawnedByWorkspaceService: boolean;
	taskbarIcon: "";
	taskbarIconGroup: string;
	title: string;
	top: number | string;
	transparent: boolean;
	type: string;
	url: string;
	uuid: string;
	waitForPageLoad: boolean;
	webPreferences: {
		disableInitialReload: boolean;
		nodeIntegration: boolean;
		plugins: boolean;
	};
	webSecurity: boolean;
	width: number | string;
	windowIdentifier: {
		name: string;
		uuid: string;
		windowName: string;
		windowType: "StackedWindow" | "OpenFinWindow" | "NativeWindow" | "FinsembleNativeWindow";
	};
	windowType: "StackedWindow" | "OpenFinWindow" | "NativeWindow" | "FinsembleNativeWindow";
	x: number;
	y: number;
}

// DH 3/18/2019 - This data has significant overlap with the `WindowDescriptor`
// and `SpawnParams` types. We need to pick one and stick with it.
/**
 * Represents all the state needed to recreate a Finsemble window.
 *
 * Pass to `Launcher.spawn` to spawn a new window with the given state.
 *
 * Once launched, the window saves its own state to storage, indexed by
 * the workspace it belongs to. This state is also partially managed by
 * the Workspace service.
 */
export type FinsembleWindowData = Partial<OptionalFinsembleWindowData> & {
	componentType: string;
	name: string;
};
