
// placeholder file showing the interfaces hooks for implementing features

import {
	Interface_Window,
	FeatureParams,
} from "../ServiceEntryPoints/Interface_Window";

function stub() {
	return new Promise((resolve) => {
		let result = { err: null, data: null };
		resolve(result)
	});
}
class WindowFeatures implements Interface_Window.WindowFeatures {
	constructor() {
	}
	closeWindows(params: FeatureParams) { return stub(); }
	autoArrange(params: FeatureParams) { return stub(); }
	bringToFrontWindows(params: FeatureParams) { return stub(); }
	minimizeWindows(params: FeatureParams) { return stub(); }
	hyperFocusWindows(params: FeatureParams) { return stub(); }

	/**
	 * @typedef SpawnArgs
	 * @type {Object}
	 * @property {component} component
	 * @property {WindowOptions} windowOptions
	*/

	/**
	 * @typedef SpawnResults
	 * @type {Object}
	 * @property {windowIdentifier} component
	 * @property {windowDescriptor} windowDescriptor
	*/

	/**
	 * spawnList callback
	 *
	 * @callback SpawnListCallback
	 * @param {string} err null if no error; otherwise contains error description
	 * @param {SpawnResults[]} [spawnResults] contains list of successfully spawned components (i.e. components reaching the ready state); return even if err
	 */

	/**
	 * Spawns a set of components.
	 *
	 * @param {object} params
	 * @param {SpawnArgs[]} params.componentList list of components to spawn
	 * @param {SpawnListCallback} [callback] callback invoked when all components are spawned and ready. If err then the operation was successful; otherwise, err carries diagnostics
	 */
	spawnList(params, callback) { }

	/**
	 * closeList callback
	 *
	 * @callback CloseListCallback
	 * @param {string} err null if no error; otherwise contains error description
	 * @param {string[]} [closeResults] contains list of successfully closed windows (i.e. components reaching the ready state); return even if err
	 */

	/**
	 * Closes a set of component
	 *
	 * @param {object} params
	 * @param {WindowIdentifier[]} params.windowIdentifiers window identifiers of components to close
	 * @param {CloseListCallback} [callback] callback invoked when all components are spawned and ready. If err then the operation was successful; otherwise, err carries diagnostics
	 */
	closeList(params, callback) { }
}
