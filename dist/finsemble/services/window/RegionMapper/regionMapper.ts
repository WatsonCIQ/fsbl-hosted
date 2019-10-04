
// Placeholder file showing the interfaces hooks for implementing the Region Mapper

// NOTE: the code in tabbingRegionHandler is currently active -- it is initialized in WindowService.js

import {
	BasePrivateWindowInterface,
	WindowCreationParams,
	WindowParams
} from "../ServiceEntryPoints/Interface_BasePrivateWindow";

import {
	Params,
	Interface_Window,
	TabbingParams,
	TrackingStopReason,
} from "../ServiceEntryPoints/Interface_Window";

import {
	RegionHandler
} from "./InterfaceRegionMapper";
import { resolve } from "dns";

function stub() {
	return new Promise((resolve) => {
		let result = { err: null, data: null };
		resolve(result)
	});
}

class BaseRegionHandler implements RegionHandler {
	enableRegion(params: Params) { return stub(); }
	triggerAt(coordinates: Coordinates) { return true; }
	stop(reason: TrackingStopReason) { }
	exit() { }
}

class RegionMouseTracker implements Interface_Window.RegionTracking {
	enableRegion(params: Params) { return stub(); }
	startTracking(params: Params) { return stub(); }
	stopTracking(params: Params) { return stub(); }
}

class TabbingRegionHandler extends BaseRegionHandler implements Interface_Window.Tabbing, RegionHandler {
	enableRegion(params: Params) { return stub(); }
	disableRegion(params: TabbingParams) { return stub(); }
	setActiveTab(params: TabbingParams) { return stub(); }
	reorderTabs(params: TabbingParams) { return stub(); }
	getDataStore(params: TabbingParams) { return stub(); }
	triggerAt(coordinates: Coordinates) { return true; }
	stop(reason: TrackingStopReason) { }
	exit() { }
}

class DesktopRegionHandler extends BaseRegionHandler implements RegionHandler {
	enableRegion(params: Params) { return stub(); }
	triggerAt(coordinates: Coordinates) { return true; }
	stop(reason: TrackingStopReason) { }
	exit() { }
}

class TilingRegionHandler extends BaseRegionHandler implements RegionHandler {
	enableRegion(params: Params) { return stub(); }
	triggerAt(coordinates: Coordinates) { return true; }
	stop(reason: TrackingStopReason) { }
	exit() { }
}

class RegionMapper implements Interface_Window.RegionMapper {
	regionMouseTracker: RegionMouseTracker = new RegionMouseTracker();
	desktopRegionHandler: DesktopRegionHandler = new DesktopRegionHandler();
	tilingRegionHandler: TilingRegionHandler = new TilingRegionHandler();
	tabbingRegionHandler: TabbingRegionHandler = new TabbingRegionHandler();
}

var regionMapper = new RegionMapper();

export { regionMapper }