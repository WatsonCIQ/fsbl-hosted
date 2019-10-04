
// Contains the public interfaces exposed/implemented by the window service and used by the various window clients.

/**
 * DIAGRAM: https://realtimeboard.com/app/board/o9J_kzFZvJ0=/?moveToWidget=3074457346145087095
 *
 */

import {
	BasePrivateWindowInterface,
	WindowCreationParams
} from "./Interface_BasePrivateWindow";

interface BoxBounds {
	top: number;
	left: number;
	height: number;
	width: number;
	right?: number;
	bottom?: number;
}

//future proofing. May want to add specific info to different 'boxes' (e.g., group, windows);
export interface WindowBounds extends BoxBounds { }
export interface GroupBounds extends BoxBounds { }

export type TabbingParams = {
	componentWindow: WindowIdentifier;
}

export type RegionTrackingParams = Object;
export type TrackingStartContext = {}
export type TrackingStopReason = {}

export type Params = {}
export type DockingParams = {}
export type FeatureParams = {}
export type WindowRegion = {}
export type WindowsGroupParams = {}
export type WindowServiceParams = { name: string; }

// The Interface_Window namespace is purely a logical organization of the public APIs supported by the Window Service.
// Each of these interfaces in Interface_Window will have a client-side implementation and a service-side implementation.
export namespace Interface_Window {

	export interface BasePrivateWindow extends BasePrivateWindowInterface { }

	export interface RegionMapper {
		regionMouseTracker: RegionTracking; // exposes the region-tracking singleton within the Region Mapping module
		tabbingRegionHandler: Tabbing; // exposes the tabbing singleton within the Region Mapping module
	}

	export interface Tabbing {
		/**
		 * Enable tabbing region within a components window. This enables the RegionMapper for the component, which in affect allows tabbing on the component.
		  *
	 	 * @param {TabbingParams} params parameter object
		 * @param {WindowIdentifier} params.componentWindow specifics the component window on which the tabbing region will be enabled
		 * @memberof Tabbing
		 */
		enableRegion(params: TabbingParams): Promise<any>;

		/**
	 * Disable tabbing region within a components window. This disables the RegionMapper for the component, which in affect turns off tabbing on the component.
		*
		 * @param {TabbingParams} params parameter object
	 * @param {WindowIdentifier} params.componentWindow specifics the component window on which the tabbing region will be disabled
	 * @memberof Tabbing
	 */
		disableRegion(params: TabbingParams): Promise<any>;

		/**
		 * Sets the active tab.  Only the act tab's window is displayed, with the other tabbed windows hidden
	 *
	 	 * @param {TabbingParams} params parameter object
		 * @param {WindowIdentifier} params.componentWindow specifics the component window on which the active tab will be set
		 * @param {number} params.position position within tabList (see getDataStore) of tabbing being set to active
		 * @memberof Tabbing
		 */
		setActiveTab(params: TabbingParams): Promise<any>;

		/**
		 * Reorders the internal list of tabs -- the internal list is used by setActiveTab and should match the tabbing UI
	 	 *
	 	 * @param {TabbingParams} params parameter object
		 * @param {WindowIdentifier} params.componentWindow specifics the component window for which the corresponding tab list will be reorder
		 * @param {Array} params.tabList an order list/array of window names (one for each tab specifying the new order)
		 * @memberof Tabbing
		 */
		reorderTabs(params: TabbingParams): Promise<any>;

		/**
	 	 * Returns in the callback the store for tabbing store for the component.
	 	 *
		 * where the tabbing store contains one object with the following properties
		 *				{
		 *					tab list: an order list/array of window names (one for each tab)
		 *					visibleTab: index into tabs list of the currently visible tab
		 *					_private (internal data for diagnostic purposes)
		 *				}
		 *
	 	 * @param {TabbingParams} params parameter object
		 * @param {WindowIdentifier} params.componentWindow specifics the component window for with the corresponding tabbing store will be returned in the callback
		 * @returns the data store for the tabbing object
		 * @memberof Tabbing
		 */
		getDataStore(params: TabbingParams): Promise<any>;
	}

	export interface RegionTracking {

		/**
		 * Starts mouse tracking within the RegionMapper, in affect activating Tabbing and Tiling. Depending on the mouse location, either the DesktopRegionHandler, TilingRegionHandler, or TabbingRegionHandler will be called once time interval (e.g. 1 millisecond) until stopTracking is invoked.
		 *
	 	 * @param {Params} params - Optional parameter object
		 * @param {any} params.type - identifiers a region type (e.g. tabbing, tiling, desktop)
		 * @param {any} params.identifier - identifiers a region (e.g. window name, group name, monitor name)
		 * @memberof RegionTracking
		 */
		enableRegion(params: Params): Promise<any>;

		/**
		 * Starts mouse tracking within the RegionMapper, in affect activating Tabbing and Tiling. Depending on the mouse location, either the DesktopRegionHandler, TilingRegionHandler, or TabbingRegionHandler will be called once time interval (e.g. 1 millisecond) until stopTracking is invoked.
		 *
	 	 * @param {Params=} params - Optional parameter object
		 * @param {TrackingStartContext=} params.context - optionally specifies the context from with tracking was started
		 * @memberof RegionTracking
		 */
		startTracking(params: Params): Promise<any>;

		/**
		 * Stop mouse tracking within the RegionMapper, in affect deactivating Tabbing and Tiling.
		 *
	 	 * @param {Params=} params - Optional parameter object
		 * @param {TrackingStopReason=} params.reason - optionally specifies the reason tracking was stopped
		 */
		stopTracking(params: Params): Promise<any>;
	}

	export interface Group {
		// these functions correspond to the existing Window-Group API (e.g. createWindowGroup, deleteWindowGroup, addWindowsToGroup)
		create(params: WindowsGroupParams): Promise<any>;
		delete(params: WindowsGroupParams): Promise<any>;
		addWindows(params: WindowsGroupParams): Promise<any>;
		removeWindows(params: WindowsGroupParams): Promise<any>;
		getGroups(params: WindowsGroupParams): Promise<any>;
		getWindows(params: WindowsGroupParams): Promise<any>;
	}

	export interface Docking {
		// these function correspond to the existing DockingService.registerWindow and DockingService.deregisterWindow interfaces
		register(params: DockingParams): Promise<any>;
		unregister(params: DockingParams): Promise<any>;
	}

	export interface WindowFeatures {
		closeWindows(params: FeatureParams): Promise<any>; // new function supporting orderly close
		bringToFrontWindows(params: FeatureParams): Promise<any>; // corresponds to old LauncherClient.bringWindowsToFront
		minimizeWindows(params: FeatureParams): Promise<any>; // corresponds to old LauncherClient.minimizeWindows
		hyperFocusWindows(params: FeatureParams): Promise<any>; // corresponds to old LauncherClient.hyperFocus
	}

	export interface PublicWindowInterface {
		create(params: WindowCreationParams): Promise<any>; // new to FinsembleWindow -- static
		close(params: Object);
		minimize(params: Object);
		maximize(params: Object);
		restore(params: Object);
		focus(params: Object);
		bringToFront(params: Object);
		setBounds(params: Object);
		getBounds(params: Object);
		startMove(params: Object);
		stopMove(params: Object);
		hide(params: Object);
		show(params: Object);
		alwaysOnTop(params: Object);
		setOpacity(params: Object);
		getCurrentState(params: Object); // new to FinsembleWindow
		getOptions(params: Object); // new to FinsembleWindow
		addListener(params: Object);
		removeListener(params: Object);
	}
}

