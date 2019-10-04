import { ObjectPool } from "./ObjectPool";
import { WindowPool } from "./WindowPool";

import Logger from "../../../../clients/logger";

const dependencies = {
	Logger
}
const GroupPoolSingleton = new ObjectPool("GroupPoolSingleton", dependencies);
const MonitorPoolSingleton = new ObjectPool("MonitorPoolSingleton", dependencies);
//Generic list of all windows that the windowService knows about. Contains finsemble windows
const WindowPoolSingleton = new ObjectPool("WindowPoolSingleton", dependencies);

//Specific pool of dockable windows.
const DockingPoolSingleton = new WindowPool("DockingPoolSingleton", dependencies);
export {
	GroupPoolSingleton,
	WindowPoolSingleton,
	MonitorPoolSingleton,
	DockingPoolSingleton
}