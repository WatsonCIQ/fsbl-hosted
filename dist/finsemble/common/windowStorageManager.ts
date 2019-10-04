import StorageClient from "../clients/storageClient";
import { identity } from "./disentangledUtils";
import { camelCase } from "./util";
import { WORKSPACE } from "./constants";
import { FinsembleWindowData } from "./FinsembleWindowData";
import { Logger } from "../clients/logger";

const { ACTIVE_WORKSPACE, CACHE_STORAGE_TOPIC, STORAGE_TOPIC } = WORKSPACE;

export const GET_WINDOW_STATE_ERROR = (win: string, ws: string = ACTIVE_WORKSPACE) =>
	`No Window State found for window "${win}" in workspace "${ws}"`;

export type StateType = "windowData" | "componentState";

/**
 * Represents both `windowData` (the window's size, position, url, etc.),
 * and `componentState` (logical data representing linking, custom
 * integerations, etc.)
 */
export type CompleteWindowState = {
	windowData: FinsembleWindowData;
	componentState: Record<string, any>;
}

/**
 * Static, ORM-like layer into the storage of all `windowData`
 * and `componentState` data, mediating interface with storage
 * while enforcing consistency and business rules.
 */
export class WindowStorageManager {
	/**
	 * This static member is necessary for testing purposes
	 * only. Ideally, we would just use the StorageClient
	 * instance directly; however, this causes inconsistencies
	 * with our mocks that failed our testing efforts.
	 */
	static _SC = StorageClient;

	static getWindowID = (win: FinsembleWindowData) => camelCase(win.name);

	/**
	 * Given a type, window, and workspace name, returns the correct storage topic and key
	 * for the `windowData` or `componentState`.
	 * Omit the workspace name to target the active workspace.
	 */
	static getTopicAndKey(type: StateType, windowName: string, workspaceName: string = ACTIVE_WORKSPACE) {
		/** The `windowData` is stored under the key with the format "workspacenameWindowname",
		 * while the `componentState` is stored under "workspacenameWindownameWindowname" */
		const keyArgs = type === "windowData"
			? [workspaceName, windowName]
			: [workspaceName, windowName, windowName]

		return {
			topic: workspaceName === ACTIVE_WORKSPACE ? CACHE_STORAGE_TOPIC : STORAGE_TOPIC,
			key: camelCase.apply(null, keyArgs),
		};
	}

	/**
	 * Retrieves a window or component state belonging to the given workspace from storage.
	 * Omit the workspace name to target the active workspace.
	 * 
	 * @param type Either `componentState` or `windowData`.
	 */
	static async getState(type: StateType, windowName: string, workspaceName?: string): Promise<FinsembleWindowData | Record<string, any>> {
		const topicAndKey = WindowStorageManager.getTopicAndKey(type, windowName, workspaceName)
		return (await WindowStorageManager._SC.get1(topicAndKey) as FinsembleWindowData)
			|| null;
	}

	/**
	 * Same as `getState` but retrieves both `componentState` and `windowData`.
	 * NOTE: either or both of windowData may be null or emtpy objects (i.e, when
	 * the requested data doesn't exist).
	 */
	static async getCompleteState(windowName: string, workspaceName?: string): Promise<CompleteWindowState> {
		return {
			componentState: (await WindowStorageManager
				.getState("componentState", windowName, workspaceName)
				// Windows may not necessarily have component state, so we must catch that occurance here.
				.catch(() => ({}))) as Record<string, any>,
			windowData: (await WindowStorageManager
				.getState("windowData", windowName, workspaceName)) as FinsembleWindowData,
		};
	}

	/**
	 * Retrieves multiple states (`componentState` or `windowData`) belonging to the given workspace from storage.
	 * Omit the workspace name to target the active workspace.
	 * 
	 * It's possible to request a window state before it's been saved to storage particularly.
	 * if the window was added to a workspace by name (not by data). Therefore, unlike `getState`,
	 * this method doesn't throw errors if unable to fulfill the request; rather, it logs a warning instead.
	 * 
	 * @param type Either `componentState` or `windowData`.
	 */
	static async getManyStates(type: StateType, windowNames: string[], workspaceName?: string): Promise<FinsembleWindowData[]> {
		return Promise.all(windowNames.map(x => WindowStorageManager.getState(type, x, workspaceName)
			.catch(err => Logger.system.warn(err)))).then(x => x.filter(identity));
	}

	/**
	 * Same as `getManyStates` but retrieves both `componentState` and `windowData`.
	 */
	static async getManyCompleteStates(windowNames: string[], workspaceName?: string): Promise<CompleteWindowState[]> {
		return Promise.all(windowNames.map(x => WindowStorageManager.getCompleteState(x, workspaceName)
			.catch(err => Logger.system.warn(err)))).then(x => x.filter(identity));
	}

	/**
	 * Persists a state to storage under the given workspace name.
	 * Omit the workspace name to target the active workspace.
	 * 
	 * @param type Either `componentState` or `windowData`.
	 */
	static async setState(type: StateType, windowName: string, data: FinsembleWindowData | Record<string, any>, workspaceName?: string): Promise<void> {
		await WindowStorageManager._SC.save1({
			...WindowStorageManager.getTopicAndKey(type, windowName, workspaceName),
			value: data,
		});
	}

	/**
	 * Same as `setState`, but sets both `componentState` and `windowData`.
	 */
	static async setCompleteState(state: CompleteWindowState, workspaceName?: string): Promise<void> {
		await WindowStorageManager.setState("windowData", state.windowData.name, state.windowData, workspaceName);
		await WindowStorageManager.setState("componentState", state.windowData.name, state.componentState, workspaceName);
	}

	/**
	 * Given an array of states, persists their states to storage.
	 * Omit the workspace name to target the active workspace.
	 * 
	 * @param type Either `componentState` or `windowData`.
	 */
	static async setManyStates(type: StateType, windows: FinsembleWindowData[], workspaceName?: string): Promise<void[]> {
		return Promise.all(windows.map(x => WindowStorageManager.setState(type, x.name, x, workspaceName)));
	}

	/**
	 * Same as `setManyStates`, but sets both `componentState` and `windowData`.
	 */
	static async setManyCompleteStates(windows: CompleteWindowState[], workspaceName?: string): Promise<void[]> {
		return Promise.all(windows.map(x => WindowStorageManager.setCompleteState(x, workspaceName)));
	}

	/**
	 * Given a window name and an update function, retrieves the state
	 * under that name from storage, applies the update function to it, then sets
	 * the storage with the result.
	 * Omit the workspace name to target the active workspace.
	 * 
	 * @param type Either `componentState` or `windowData`.
	 */
	static async updateState(type: StateType, updateFn: (window: FinsembleWindowData) => FinsembleWindowData, windowName: string, workspaceName?): Promise<void> {
		await WindowStorageManager._SC.updateStorage1({
			...WindowStorageManager.getTopicAndKey(type, windowName, workspaceName),
			updateFn,
		});
	}

	/**
	 * Removes a window's state (both `componentState` and `windowData`) from storage under the
	 * given workspace name. Omit the workspace name to target the active workspace.
	 * 
	 * Logs a warning if unable to fulfill the request (doesn't throw).
	 */
	static async removeCompleteState(windowName: string, workspaceName?: string): Promise<void> {
		try {
			await WindowStorageManager._SC.remove1(WindowStorageManager.getTopicAndKey("windowData", windowName, workspaceName));
			await WindowStorageManager._SC.remove1(WindowStorageManager.getTopicAndKey("componentState", windowName, workspaceName));
		} catch (error) {
			Logger.system.warn(error);
		}
	}

	/**
	 * Removes multiple states (both `componentState` and `windowData`) belonging to the given workspace from storage.
	 * Omit the workspace name to target the active workspace.
	 */
	static async removeManyCompleteStates(windowNames: string[], workspaceName?: string): Promise<void[]> {
		return Promise.all(windowNames.map(x => WindowStorageManager.removeCompleteState(x, workspaceName)));
	}
}
