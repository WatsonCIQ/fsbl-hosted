import { v1 as uuidv1 } from "uuid";
//Class without deep openfin/system dependencies.
export function guuid() {
	return uuidv1(); // return global uuid
}


/**
 * Home baked clone method that was the most performant one that was tried back in 2017.
 * This has been tested a good amount. Previous to this commit we were using a mix of deepmerge and JSON.parse(JSON.stringify()).
 * Trying lodash.deepclone made my tests take 2-3s.
 * JSON.parse everywhere made them take ~ 1s.
 * Using JSON.parse on arrays and deep merge on objects makes them take 7-900ms.
 *
 * @export
 * @param {*} obj Thing to clone
 * @param {*} [errorCb = console.error] Callback to handle any errors.
 */
export function clone(obj, errorCb = console.error) {
	if (Array.isArray(obj)) {
		return obj.slice();
	}
	try {
		return JSON.parse(JSON.stringify(obj));
	} catch (e) {
		errorCb(e);
		return e;
	}
};


class MockLogger {
	constructor({ debug } = { debug: true }) {
		if (debug) {
			this.system = console;
			this.system.debug = console.log;
		} else {
			//Suppress everything but errors for tests
			this.system = {
				warn: Function.prototype,
				debug: Function.prototype,
				log: Function.prototype,
				info: Function.prototype,
				error: console.error
			};
		}

	}
	isLogMessage() { return true; };

	start() { }
};

export const mockLogger = new MockLogger();

/**
 * Wraps a promsie in logs that fire immediately before and after the execution of the promise. Returns a new promise.
 *
 * @param {*} logger A logging function that will log the message. E.g. `Logger.system.debug` or `console.log`.
 * @param {string} message A message to be logged. Suffixed with "start" and "end", before and after the promise, respectively.
 * @param {Promise} promise The promise to be wrapped.
 */
export const instrumentPromise = async (logger, message, promise) => {
	const start = message + " start";
	const end = message + " end";
	logger(start);
	return promise.then(() => logger(end));
};
