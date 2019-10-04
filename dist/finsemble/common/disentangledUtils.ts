import { v1 as uuidv1 } from "uuid";
import * as get from "lodash.get";
import * as pick from "lodash.pick";

//Class without deep openfin/system dependencies.
export function guuid() {
	return uuidv1(); // return global uuid
}

export function clone(obj, logFn) {
	//This has been tested a good amount. Previous to this commit we were using a mix of deepmerge and JSON.parse(JSON.stringify()).
	//Trying lodash.deepclone made my tests take 2-3s.
	//JSON.parse everywhere made them take ~ 1s.
	//Using JSON.parse on arrays and deep merge on objects makes them take 7-900ms.
	if (Array.isArray(obj)) {
		return obj.slice();
	}
	try {
		return JSON.parse(JSON.stringify(obj));
	} catch (e) {
		logFn("clone error", e);
		return e;
	}
};

export function capitalizeFirst(s: string) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

class MockLogger {
	system;
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

/** Converts a flat array into an array of arrays of length n.
 *
 * If the length of the array is not divisble by n, the last
 * element of the new array will contain the remainder items.
*/
export function chunkArray(n: number, arr: any[]) {
	if (n <= 0) {
		throw new Error("Can't chunk array by number less than 0");
	}

	return arr.reduce((prev, curr, index) => {
		if (index % n === 0) {
			const chunk = []
			for (let i = index; i < index + n; i++) {
				if (i < arr.length) {
					chunk.push(arr[i]);
				}
			}
			prev.push(chunk);
		}
		return prev;
	}, []);
}

/**
 * Confirms wether a variable passed to it exists and is a number.
 * If true, returns the parsed Number, otherwise returns false
 * @param {string} [num] A string potentially containing a number
 * @returns False or Number(input)
 */
export function isNumber(num: string) {
	if (!num || Number.isNaN(Number(num))) {
		return false;
	}

 	return Number(num);
};

/** Returns exactly what's passed to it. Useful for higher-order functions. */
export function identity<T>(arg: T): T {
	return arg;
}

/*
typed-promisify, https://github.com/notenoughneon/typed-promisify

MIT License

Copyright (c) 2016 Emma Kuo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
// DH 3/11/2019 - I've removed the type-inferring overloads, as they aren't
// working correctly.

/**
 * Wraps a callback accepting function in a promise. The callback must have the type
 * specified in StandardCallback, and the wrapped function *MUST* call the callback
 * on all possible code paths.
 */
export function promisify<T = any>(f: any, thisContext?: any): (...args) => Promise<T> {
	return function () {
		let args = Array.prototype.slice.call(arguments);
		return new Promise((resolve, reject) => {
			args.push((err: any, result: any) => err ? reject(err) : resolve(result));
			f.apply(thisContext, args);
		});
	}
}

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

/**
 * Composes an array of functions together, producing
 * a new function that is the result of applying each
 * function from right to left on its arguments.
 *
 * @example
 * const add1 = x => x + 1;
 * const multiply3 = x => x * 3
 * const mulityply3Add1 = composeRL(add1, multiply3);
 * mulityply3Add1(4); // => 13
*/
export const composeRL = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)));

/**
 * getProp utility - an alternative to lodash.get
 * @author @harish2704, @muffypl, @pi0, @imnnquy
 * @param {Object} object
 * @param {String|Array} path
 * @param {*} defaultVal
 */
export function getProp<T = any>(object, path, defaultVal?): T {
	const _path = Array.isArray(path)
		? path
		: path.split('.').filter(i => i.length)

	if (!_path.length) {
		return object === undefined ? defaultVal : object
	}

	return getProp(object[_path.shift()], _path, defaultVal)
}

export function getUniqueName(baseName = "RouterClient") {
	return `${baseName}-${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 10000)}`;
}

export function getRandomWindowName(s: string, uuid: string) {
	return `${getUniqueName(s)}-${uuid}`;
}

/**
 * Creates a promise that rejcts after the specified time with
 * the given message.
 */
export function timeoutPromise(ms, message: string) {
	return new Promise((resolve, reject) => {
		let id = setTimeout(() => {
			clearTimeout(id);
			reject(message)
		}, ms)
	});
}

/**
 * Wraps a promise in another promise that either rejects after the specified number of miliseconds
 * or resolves with the result of the promise.
 */
export function wrapWithTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
	return Promise.race([
		promise,
		timeoutPromise(ms, message),
	]) as Promise<T>
}

/**
 * Will determine if a given window is a StackedWindow. Returns true if the window is a
 * StackedWindow, false otherwise
 * @param {FinsembleWindow} win The window to check for StackedWindow
 */
export function isStackedWindow(win) {
	return win &&
		((get(win, "windowIdentifier.windowType")
			|| win.windowType) === "StackedWindow");
};

/**
 * Converts an array into a record where the keys are the result of applying the key function
 * to each item in the array, and the values are the items.
 *
 * @param key Either the key whose value you want to become the new index, or a function
 * that returns the new index when given the current value.
 * @param arr An array of values.
 *
 * @example
 * const arr = [{foo: "bar"}, {foo: "bam"}];
 * toRecord("foo", arr) // => {bar: {foo: "bar"}, {bam: {foo: "bam"}}}
 *
 * @example
 * const arr = [{foo: "bar"}, {foo: "bam"}];
 * toRecord(x => x.foo.toUpperCase(), arr) // => {BAR: {foo: "bar"}, {BAM: {foo: "bam"}}}
 */
export function toRecord<T>(key: string | ((x: T) => string), arr: T[]): Record<string, T> {
	const keyFn = typeof key === "string"
		? x => x[key]
		: key;
	return arr.reduce((prev, curr) => {
		prev[keyFn(curr)] = curr;
		return prev;
	}, {});
}

/**
 * Given an object and array of keys as strings,
 * returns a new object copied from the first but
 * with those keys removed.
 */
export function removeKeys(obj, keys: string[]) {
	if (!obj) return obj;
	const allKeys = Object.keys(obj);
	const keepKeys = allKeys.filter(x => !keys.includes(x));
	return pick(obj, keepKeys);
}
