
/**
 * Used to define the parameters for creating a Window.
 *
 * Daniel H. 1/2/19
 * I've done the bare minimum to get this to compile, but much
 * is missing from this.
 * @TODO Move to a separate file and complete. */
export type WindowDescriptor = {
	name?: string,
	uuid?: string,
	monitorInfo?: any,
	defaultLeft?: number,
	defaultTop?: number,
	defaultWidth?: number,
	defaultHeight?: number;
	/** The name of the component in this window. E.g "Welcome Component", "StackedWindow", etc. */
	componentType?: string;
	customData?: {
		monitorDimensions?: {};
		window?: {
			allowToSpawnOffScreen: boolean;
			windowType?: string;
			native?: boolean;
		};
		// Daniel H. 1/16/19 - This appears to be a duplicate of the top level manifest.
		// @TODO - Pick one and remove the other.
		manifest?: {};
		spawnData?: {};
		component?: {
			type: string;
			spawnOnAllMonitors: boolean;
		};
	};
	claimMonitorSpace?: boolean;
	url?: string;
	// Daniel H. 1/16/19 - This appears to be a duplicate of the .customData.manifest.
	// @TODO - Pick one and remove the other.
	manifest?: {};
	resizable?: boolean;
	/** A unique string that sets a process affinity flag. This allows windows to grouped together under a single process (a.k.a. Application). This flag is only available when running on Electron via e2o. */
	affinity?: string;
	alwaysOnTop?: boolean;
	showTaskbarIcon?: boolean;
	// Daniel H. - 1/16/19 - This appears to be duplicate data with defaultLeft, etc.
	// Same story for .bounds.left, etc.
	// @TODO - Refactor to single source of truth. See other comments from same date in file.
	left?: number;
	top?: number;
	right?: number;
	bottom?: number;
	width?: number;
	height?: number;
	bounds?: {
		left: number;
		top: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	},
	securityPolicy?: string,
	permissions?: {
		System?: {},
		Window?: {},
		Application?: {}
	},
	// Array of window names saying who can call execJS on the window. Will eventually be window service, the splinter agent that creates the window, and the window that requested that the window be spawned.
	execJSWhitelist?: Array<string>,
	preload?: Array<any>,
	preloadScripts?: Array<any>,
	windowType?: string
}
