/** Represents the FSBL properties stored on the global Window object,
 * giving access to them in type-safe manner.
 *
 * Usage:
 * var x = (window as IFSBLizedGlobalWindow).FSBL;
*/
export interface IGlobals {
	/**
	 * The Chromium window's name.
	 */
	name: string;
	/**
	 * @TODO - Full Documentation
	 */
	StackedWindowManager?: any;
	/** A singleton instance of the DistributedStoreClient.
	 * @see DistributedStoreClient
	 */
	distributedStoreClient?: any;
	/**
	 * @TODO - Full Documentation
	 */
	_FSBLCache?: any;
	/**
	 * @TODO - Full Documentation
	 */
	FSBL?: any;
	/**
	 * @TODO - Full Documentation
	 */
	FSBLData?: {
		clientIDCounter?: number,
		RouterClients?: object,
	};
	/** A v1 UUID stored on a Finsemble process's global Window object,
	 * and is shared via the ServiceManager with the rest of the system.
	 * */
	FinsembleUUID?: string;
	/**
	 * @TODO - Full Documentation
	 */
	finsembleWindow?: any;
	/**
	 * @TODO - Full Documentation
	 */
	FSBLIsSetOnline?: boolean;
	/**
	 * @TODO - Full Documentation
	 */
	FSBLAlreadyPreloaded?: boolean;
	/**
	 * @TODO - Full Documentation
	 */
	Keystroke?: any;
	/**
	 * A singleton instance of the ServiceManager.
	 * @see ServiceManager
	 */
	ServiceManager?: any;
	/**
	 * A pointer to Chromium's performance API.
	 */
	performance: any;
}
