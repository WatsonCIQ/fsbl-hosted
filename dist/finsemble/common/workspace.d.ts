
import { StorageClient } from "../clients/storageClient";
import { IRouterClient, ResponderMessage } from "../clients/IRouterClient";
import { FinsembleWindowData } from "./FinsembleWindowData";

export type GroupData = {
	windowNames: string[];
	isMovable: boolean;
	isAlwaysOnTop: boolean;
	topRightWindow: string;
	isARectangle: boolean;
};

/**
 * This interface represents base data that all
 * workspace-type objects have in common and extend.
 */
export type WorkspaceBase = {
	/**
	 * The version of the API schema. Used to maintain
	 * backward compatibility.
	 */
	version: "1.0.0";
	/** A string uniquely identifying the workspace from other workspaces.
	 * 
	 * NOTE: Does not differentiate between instances of the same workspace.
	 * For that, see the `guid` property of the `ActiveWorkspace` type.
	 */
	name: string;
	/**
	 * Distinguishes normal workspaces from templates. Templates are workspaces
	 * that are distributed by Finsemble administrators to users and are not
	 * modified, much like a template document in Microsoft Office.
	 * 
	 * The different behavior between workspaces and templates isn't yet implemented,
	 * but will be soon.
	 */
	type: "workspace" | "template";
	groups: Record<string, GroupData>;
}

/** The complete data representation of a Workspace.
 * @TODO also create interfaces for the several legacy
 * data types that we must still support.
*/
export type Workspace = WorkspaceBase & {
	/**
	 * An array of unique string identifiers for the windows that belong
	 * to this workspace.
	 */
	windows: string[];
}

export type WorkspaceImport = WorkspaceBase & {
	windows: string[];
	windowData?: FinsembleWindowData[];
	componentStates?: Record<string, any>;
}

/**
 * The data representation of the active workspace.
 * Identical to the Workspace type, with the addition
 * of the `isDirty` and `guid` properties.
 */
export type ActiveWorkspace = Workspace & {
	/** A string uniquely identifying this active workspace instance from
	 * all others.
	 */
	guid: string;
	/**
		* Should be set to true if any part of the workspace has been modified without
		* the corresponding state being updated in storage.
		*/
	isDirty: boolean;
}
