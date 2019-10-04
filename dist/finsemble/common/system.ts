// pass through to openfin. In the future we can make this the pass through to any container.
declare var fin;
declare var chrome;

import { IGlobals } from "../common/Globals";
/** The global `window` object. We cast it to a specific interface here to be
 * explicit about what Finsemble-related properties it may have.*/
const Globals =
	/** In our testing environments (i.e, mocha running in node.js),
	 * `window` is not defined. Therefore, we have to check that `window`
	 * exists; otherwise, in node, `process` is the global context.
	 */
	typeof window !== "undefined" ?
		window as IGlobals
		: process as any as IGlobals;

class SystemWindow {
	constructor(params, cb, errCb?) {
		return new fin.desktop.Window(params, cb);
	}

	static get getCurrent() {
		return fin.desktop.Window.getCurrent;
	}

	static get wrap() {
		return fin.desktop.Window.wrap;
	}
}

class Application {
	constructor(params, cb, errCb?) {
		return new fin.desktop.Application(params, cb);
	}

	static get getCurrent() {
		return fin.desktop.Application.getCurrent;
	}

	static get wrap() {
		return fin.desktop.Application.wrap;
	}
}

class SystemNotification {
	constructor(params) {
		new fin.desktop.Notification(params);
	}
}

export class System {
	static get Application() {
		return Application;
	}
	static get Window() {
		return SystemWindow;
	}
	static get Notification() {
		return SystemNotification;
	}

	static getMousePosition(cb) {
		fin.desktop.System.getMousePosition((mousePosition) => {
			if (mousePosition.left || mousePosition.left === 0) mousePosition.x = mousePosition.left;
			if (mousePosition.top || mousePosition.top === 0) mousePosition.y = mousePosition.top;
			cb(null, mousePosition);
		}, (err) => { cb(err, null); });
	}

	static getMonitorInfo(cb) {
		fin.desktop.System.getMonitorInfo((info) => {
			cb(info);
		});
	}

	// static get makes this behave like a static variable. so calling system.ready is equivalent to fin.desktop.main.
	static get ready() {
		return fin.desktop.main;
	}

	static get getHostSpecs() {
		return fin.desktop.System.getHostSpecs;
	}

	static get launchExternalProcess() {
		return fin.desktop.System.launchExternalProcess;
	}

	static get terminateExternalProcess() {
		return fin.desktop.System.terminateExternalProcess;
	}

	static get getAllApplications() {
		return fin.desktop.System.getAllApplications;
	}

	static get exit() {
		return fin.desktop.System.exit;
	}

	static get clearCache() {
		return fin.desktop.System.clearCache;
	}

	static get showDeveloperTools() {
		return fin.desktop.System.showDeveloperTools;
	}

	static get getRuntimeInfo() {
		return fin.desktop.System.getRuntimeInfo || chrome.desktop.getDetails;
	}

	static get addEventListener() {
		/* events we use so far in Finsemble: monitor-info-changed, session-changed */
		return fin.desktop.System.addEventListener;
	}

	static get getVersion() {
		return fin.desktop.System.getVersion;
	}

	static get openUrlWithBrowser() {
		return fin.desktop.System.openUrlWithBrowser;
	}

	static get getAllWindows() {
		return fin.desktop.System.getAllWindows;
	}

	static FinsembleReady(cb) {
		if (Globals.FSBL && Globals.FSBL.addEventListener) {
			return Globals.FSBL.addEventListener("onready", cb);
		}
		return window.addEventListener("FSBLready", cb);
	}

	// This is not overriding or pointing to Openfin. This is the pattern used to close applications.
	static closeApplication(app, cb = Function.prototype) {
		const promiseResolver = (resolve) => {
			let t;
			let timeoutCleared = false;
			let terminateAndResolve = () => {
				if (timeoutCleared) return;
				console.log("Attempting to terminate", app.uuid);
				app.terminate(() => {
					cb();
					resolve();
				}, () => {
					if (timeoutCleared) return;
					timeoutCleared = true;
					clearInterval(t);
					// If closing fails, force close
					console.log("force closing ", app.uuid);
					app.terminate();
				});
			}

			//Hanging apps can be unresponsive to close and terminate calls for a period of time, keep trying until they're closed
			t = setInterval(terminateAndResolve, 2000);

			console.log("closing ", app.uuid);
			//OpenFin windows will wait to callback until close is successful, so no need to keep trying to close on a success callback.
			app.close(false, () => {
				console.log("app.close: successfully closed", app.uuid);
				timeoutCleared = true;
				clearInterval(t);
				cb();
				resolve();
			}, terminateAndResolve);
		}
		return new Promise(promiseResolver);
	}

}
