/*!
* Copyright 2018 by ChartIQ, Inc.
* All rights reserved.
*/

import { ILogger } from "./ILogger"
import { ICentralLogger } from "./ICentrallogger"

const { debug, warn, log, /*info,*/ error } = console;
const info = () => { };
const verbose = info;

const logger: ILogger = {
	warn, info, log, debug,
	error, verbose
}

// This is all stolen from the logger.
// @TODO - make consumers agnostic of this stuff and remove from the interface.
const LOCAL_ONLY_DEFAULT = false;
var DEFAULT_LOG_SETTING = { Error: true, Warn: true, Info: true, Log: true, Debug: true, Verbose: true, LocalOnly: LOCAL_ONLY_DEFAULT }; // if true captured for logger
var CONSOLE_DEFAULT_LOG_SETTING = { Error: true, Warn: true, Info: true, Log: true, Debug: true }; // if true then goes to console and captured for logger

var initialLogState = {
	console: CONSOLE_DEFAULT_LOG_SETTING,
	dev: DEFAULT_LOG_SETTING,
	system: DEFAULT_LOG_SETTING,
	perf: DEFAULT_LOG_SETTING,
}; // will be updated on registration with Central Logger, but capture everything until then


function IsLogMessage(channel) {
	return (channel === "logger.service.logMessages");
};

function traceString() {
	function getPosition(string, subString, index) {
		return string.split(subString, index).join(subString).length;
	}

	function getErrorObject() {
		try {
			throw Error("");
		} catch (err) {
			return err;
		}
	}
	var stack = getErrorObject().stack;
	var position = getPosition(stack, "\n", 4);
	var tString = stack.substring(position); // strip off irrelevant part of stack
	var final = "Log Stack: \n" + tString.substr(1); // insert description
	return final;
}

/** An implementation of the ICentralLogger interface that
 * merely logs straight to the console rather than going over to
 * Central Logging service. Used in situations where use of the
 * Central Logging service is not possible (such as in test
 * environments, or in the Central Logging service itself).
 */
export class LocalLogger implements ICentralLogger {
	// Log things.
	// @TODO - Make consumers agnostic of these and remove from interface.
	start = () => { }
	isLogMessage = IsLogMessage;
	setting = () => initialLogState;
	callStack = () => traceString();
	unregisterClient = (_) => {}
	setRouterClient = () => { };
	// Top level logging methods
	warn = warn;
	info = info;
	log = log;
	debug = debug;
	error = error;
	verbose = verbose;

	// "Namespaced" methods - they still point to console.
	system = logger;
	perf = logger;
}
