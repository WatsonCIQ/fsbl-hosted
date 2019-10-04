import RouterClient from "../../clients/routerClientInstance";
import { EventEmitter } from "events";

/**
 * Notes:
 * Client calls finsembleWindow.addEventListener("event", handler)
 *
 * hander gets called with handler(FinsembleEvent)
 *
 * in the handler:
 function handler(e) {
	if (e.delayable) {
		e.wait();
		function myStuff() {
			//my stuff here
			if (cancel && e.cancelable) {
				e.cancel();
			} else {
				e.done();
			}
		}
	}
}
 *
 *
 *
 */

 /**
  * This object is passed to event handlers so they can interrupt events. This is used in conjunction with the implementation of add/remove event listeners in BaseWindow and FinsembleWindow
  */
class FinsembleEvent extends EventEmitter {
	cancelable: boolean = false
	delayable: boolean = false
	delayed: boolean = false
	event: WindowEvent
	source: any
	data: any

	constructor(params) {
		super();
		if (params.event) this.event = params.event;
		if (params.cancelable) this.cancelable = true;
		if (params.data) this.data = params.data;
		if (params.delayable) this.delayable = true;

	}

	wait() {
		if (this.delayable) this.delayed = true;
	}

	cancel() {
		if (this.cancelable) {
			this.emit("done", {
				canceled: true
			})
		}
	}

	done() {
		this.emit("done", {
			canceled: false
		})
	}

	setData(data) {
		this.data = data;
	}
}

export { FinsembleEvent };
