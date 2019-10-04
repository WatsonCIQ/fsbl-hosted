import { global } from "./tester";

let FSBL: globalThis.Window.FSBL;

const FSBLReady = () => {
	try {
		// Do things with FSBL in here.
	} catch (e) {
		FSBL.Clients.Logger.error(e);
	}
};

if (window.FSBL && FSBL.addEventListener) {
	FSBL.addEventListener("onReady", FSBLReady);
} else {
	window.addEventListener("FSBLReady", FSBLReady);
}
