/**
 * DH 3/11/2019
 * 
 * This is a local implementation of the RouterClient suitable
 * for testing purposes. It is automatically substitued for the real
 * RouterClient if no global window object is detected
 * (see routerClientInstance.ts).
 * 
 * The implementation isn't finished; namely, it's missing
 * pub/sub, and has only been tested in limited cases.
 *
 */
import { spy } from "sinon";
import { ResponderMessage } from "../clients/IRouterClient";

class FakeRouter {
	queryResponders: { responderChannel: string, cb: StandardCallback<ResponderMessage> }[] = [];
	transmitListeners: { channel: string, eventHandler: StandardCallback }[] = [];
	onReady(cb) { }
	unsubscribe(topic: string) { }
	publish(topic: string, data: any) { }
	subscribe(topic, cb): string { throw "Not Implemented yet" }
	addPubSubResponder(topic: string, something: any) { }
	reset() {
		this.queryResponders = [];
		this.transmitListeners = [];
	}
	addListener(channel: string, eventHandler: StandardCallback): void {
		this.transmitListeners.push({ channel, eventHandler });
	}
	removeListener(channel: string, eventHandler: StandardCallback) {
		this.transmitListeners = this.transmitListeners
			.filter(x => !(x.eventHandler === eventHandler, x.channel === channel));
	}

	transmit(toChannel: string, event: { err: string | Error, data: any } | any, options?: { suppressWarnings: boolean }) {
		const { err, data } = event;
		let called = false;
		for (const listener of this.transmitListeners) {
			if (listener.channel === toChannel) {
				listener.eventHandler(err, data);
				called = true;
			}
		}
		if (!called) {
			throw new Error(`Router message was transmitted, but no one was listening! Channel: ${toChannel}`);
		}
	}

	addResponder(channel: string, queryEventHander: StandardCallback<ResponderMessage>) {
		this.queryResponders.push({ responderChannel: channel, cb: queryEventHander });
	}

	removeResponder(responderChannel: string) {
		this.queryResponders = this.queryResponders
			.filter(x => x.responderChannel !== responderChannel);
	};

	query(responderChannel: string, queryEvent: Record<string, any>, responderEventHandler: StandardCallback) {
		const p = new Promise((resolve, reject) => {
			const qr = this.queryResponders.find(x => responderChannel === x.responderChannel)
			const result = qr && qr.cb({
				data: queryEvent,
				sendQueryResponse: resolve,
				header: {
					origin: "same-origin",
					channel: responderChannel,
					incomingTransportInfo: {
						transportID: "SharedWorker",
						lastClient: null,
						port: 1,
						origin: "same-origin",
					},
					type: "SharedWorker",
				},
				options: { supressWarnings: false },
				originatedHere: () => false,
			});
		});
		return responderEventHandler ? p.then(responderEventHandler)
			: p;
	}
}

export const fakeRouterClient = new FakeRouter();
export const addListenerSpy = spy(fakeRouterClient, "addListener");
export const removeListenerSpy = spy(fakeRouterClient, "removeListener");
export const transmitSpy = spy(fakeRouterClient, "transmit");
export const addResponderSpy = spy(fakeRouterClient, "addResponder");
export const removeResponderSpy = spy(fakeRouterClient, "removeResponder");
export const querySpy = spy(fakeRouterClient, "query");
