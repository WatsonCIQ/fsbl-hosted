/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

import Logger from "../../../clients/logger";
import LauncherClient from "../../../clients/launcherClient";
import { BootTaskCallbackInterface } from "../_types";
import { System } from "../../../common/system";
import * as Util from "../../../common/util";
import configClient from "../../../clients/configClient";
import FSBLDependencyManager from "../../../common/dependencyManager";

/**
 * Boot task that loads system tray icon.  Can assume LauncherClient is ready when this task runs.  That task also handles shutdown, removing system tray icon.
 * @private
 */
export class LoadSystemTrayIconTask {
	finsembleConfig: any;

	public async start(doneCallback: BootTaskCallbackInterface) {
		Logger.system.debug("loadSystemTrayIconTask start");
		FSBLDependencyManager.shutdown.waitFor({}, this.handleShutdown.bind(this));

		let { data: systemTrayIcon } = await configClient.getValue({ field: "finsemble.systemTrayIcon" });
		let { data: systemTrayComponent } = await configClient.getValue({ field: "finsemble.systemTrayComponent" });

		if (systemTrayIcon) {
			var application = System.Application.getCurrent();
			var listeners = {
				clickListener: function (e1) {
					Logger.system.debug("System Tray Icon Clicked");
					System.getMousePosition(function (err, e) {
						switch (e1.button) {
							case 0: //left - bring everything to front
								LauncherClient.getActiveDescriptors((err, response) => {
									if (!err) {
										let windowList = Object.keys(response);
										LauncherClient.bringWindowsToFront({ windowList });
									}
								});
								break;
							case 2: //right - show file menu
								//@TODO what if system tray icon is on non-primary monitor?
								application.getTrayIconInfo(function (iconInfo) {
									Util.Monitors.getMonitorFromScaledXY(e.left, e.top, function (monitor) {
										var spawnParams = {
											spawnIfNotFound: true,
											monitor: monitor.whichMonitor,
											position: "monitor",
											left: null,
											right: null,
											top: null,
											bottom:null
										};

										let md = monitor.monitorRect;
										let taskbar = iconInfo.monitorInfo ? iconInfo.monitorInfo.taskbar : monitor.taskbar;

										// Am I closer to the left?
										if ((e.left - md.left) <= (md.right - e.left)) {
											spawnParams.left = e.left;
											if (taskbar.edge == "left" && spawnParams.left < taskbar.right) {
												spawnParams.left = taskbar.right + 1;
											}
										} else {
											if (taskbar.edge == "right" && e.left < taskbar.right) {
												e.left = taskbar.right - 1;
											}
											spawnParams.right = md.right - e.left; // right behaves like css

										}
										// Am I closer to the top?
										if ((e.top - md.top) <= (md.bottom - e.top)) {
											spawnParams.top = e.top;
											if (taskbar.edge == "top" && spawnParams.top < taskbar.top) {
												spawnParams.top = taskbar.top + 1;
											}
										} else {
											if (taskbar.edge == "bottom" && e.top > taskbar.top) {
												e.top = taskbar.top - 1;
											}
											spawnParams.bottom = md.bottom - e.top; // bottom behaves like css
										}
										systemTrayComponent = systemTrayComponent || "File Menu";
										LauncherClient.showWindow(<WindowIdentifier>{ componentType: systemTrayComponent }, spawnParams, function () { });
									});
								});
								break;
						}
					});
				}
			};
			Logger.system.log("Setting system tray icon");
			application.setTrayIcon(systemTrayIcon, listeners);
		}

		doneCallback("loadSystemTrayIconTask", "bootTasks", "completed")
	}

		/**
	 * Remove System Tray Icon
	 */
	private removeSystemTrayIcon() {
		System.Application.getCurrent().removeTrayIcon(function () {
			Logger.system.debug("System Tray Icon removed");
		}, function () {
			Logger.system.error("Unable to remove System Tray Icon");
		});
	}

	private handleShutdown() {
		this.removeSystemTrayIcon();
	}
}
