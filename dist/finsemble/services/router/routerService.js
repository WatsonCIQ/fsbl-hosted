/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "http://localhost:3375/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 185);
/******/ })
/************************************************************************/
/******/ ({

/***/ 0:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const LOCAL_ONLY_DEFAULT = false; // if true all logging will default to local console; will be overwritten by LoggerService's registration response
const ALWAY_ADD_STACKTRACE = false; // if true always add stacktrace data to all log messages (e.g. debug and verbose, not just errors, warning)
// capture everything at startup; will be filtered later as needed when LoggerService's registration response provides settings; overhead here is not too high
var DEFAULT_LOG_SETTING = { Error: true, Warn: true, Info: true, Log: true, Debug: true, Verbose: true, LocalOnly: LOCAL_ONLY_DEFAULT }; // if true captured for logger
var CONSOLE_DEFAULT_LOG_SETTING = { Error: true, Warn: true, Info: true, Log: true, Debug: true }; // if true then goes to console and captured for logger
const MAX_LOG_MESSAGE_SIZE = 50000;
const OVER_LOG_SIZE_LIMIT_MESSAGE = `Log argument greater than ${MAX_LOG_MESSAGE_SIZE / 1000}KB. Check local Console to see output of the object.`;
const MAX_QUEUE_SIZE = 5 * 1000; // maximum logger queue size; plenty of space although shouldn't need much since continuously sending to logger if working correctly;
const throttle = __webpack_require__(22);
const system_1 = __webpack_require__(3);
const localLogger_1 = __webpack_require__(16);
/**
 * @introduction
 *
 * <h2>Logger Client</h2>
 *
 * The Logger Client supports very efficient and configurable run-time logging to the <a href=tutorial-CentralLogger.html>Central Logger</a>.
 * Logging has a small performance overhead, so developers can liberally instrument their code with log messages for debugging and diagnostics.
 * By default, only error and warning messages are captured by the Logger, with the other message types (e.g., log, info, debug) disabled.
 * Which message types are enabled or disabled is fully controlled from the <a href=tutorial-CentralLogger.html>Central Logger</a> - this means developers can fully instrument their code once and dynamically enable and disable logging later, as needed, for debugging or field support.
 *
 * The Finsemble team uses the Central Logger to <a href=tutorial-Troubleshooting.html>capture log message for field support</a>.
 * Finsemble customers, building their own Finsemble applications, have the option to do the same.
 *
 * **Note:** The Logger Client **wraps** all console logging (e.g., `console.error`, `console.log`) so these message can also be captured and viewed in the Central Logger, but console logging is never disabled locally. For better performance, we recommend most of your code's instrumentation be based on the Logger Client (e.g., `FSBL.Clients.Logger.debug(...)` instead of the `console.debug(...)`).
 *
 * Using the Logger is similar to using the browser's console for logging (e.g., `console.error` or `console.log`), although the Logger Client is accessed through the FSBL object as shown in the examples below.
 *
 *```javascript
 * 			FSBL.Clients.Logger.error("an error message", anErrorObject);
 * 			FSBL.Clients.Logger.warn("a warning message", object1, object2, object3);
 * 			FSBL.Clients.Logger.log("logging message");
 * 			FSBL.Clients.Logger.info("logging message");
 * 			FSBL.Clients.Logger.log("log message");
 * 			FSBL.Clients.Logger.debug("debug message");
 *```
 * The Logger Client also supports system logging (e.g., `Logger.system.log`) for Finsemble's internal logging. All Finsemble client APIs are in the process of being instrumented to log their entry-point calls and parameters, as shown below.
 *
 *```javascript
 * 			Logger.system.info("RouterClient.transmit", "TO CHANNEL", toChannel, "EVENT", event);
 *```
 * Developers can view all system logging in the Central Logger, although only `Logger.system.info` messages (recording API interactions) are intended for use outside the Finsemble development team.
 *
 *<strong>Note:</strong> Any service can also use the Logger by directing requiring the client. The Logger can immediately be used, but log message will not be transmitted to the Central Logger until `Logger.start()` is invoked (as shown below).
 *```javascript
 *
 * 			var Logger = require("../../clients/logger").default;
 * 			Logger.log("Service Ready");
 * 			Logger.start();
 *```
 * @hideConstructor
 * @shouldBePublished true
 * @class Logger
 * @constructor
 */
exports.LoggerConstructor = function (dependencies) {
    var self = this;
    self.RouterClient = dependencies && dependencies.RouterClient;
    var isRegistering = false; // if registering start
    var isRegistered = false; // if registering complete
    var loggerConsole = self;
    var updatedLogState;
    var calibratedTimeStampOffset = 0;
    var newCalibratedTimeStampOffset;
    var filteredMessagesCounter = 0;
    this.startupTime = 0;
    var loggerQueue = [];
    var warningIssued = false; // used to limit warning messages
    if (typeof window === "undefined")
        return;
    var loggerClientName = system_1.System.Window.getCurrent().name.replace(/\./, "-");
    if (window.top !== window) { // amend name if iFrame
        loggerClientName += ".Frame";
    }
    var clientChannel = "finsemble.logger.client." + loggerClientName;
    //const CATEGORIES = ["console", "dev", "system", "perf"];
    // Will be updated on registration with Central Logger, but capture everything until then.
    var initialLogState = {
        console: CONSOLE_DEFAULT_LOG_SETTING,
        dev: DEFAULT_LOG_SETTING,
        system: DEFAULT_LOG_SETTING,
        perf: DEFAULT_LOG_SETTING,
    };
    var currentLogState = initialLogState;
    function LoggerMessage(category, type, data) {
        this.category = category;
        this.logClientName = loggerClientName;
        this.logType = type;
        this.logData = data;
        this.logTimestamp = window.performance.timing.navigationStart + window.performance.now() + calibratedTimeStampOffset;
    }
    function addToQueue(message) {
        if (loggerQueue.length < MAX_QUEUE_SIZE) {
            loggerQueue.push(message);
        }
        else {
            if (!warningIssued) {
                console.warn("Logging Queue Overflowed!", loggerQueue.length);
                warningIssued = true;
                let logState = { Error: false, Warn: false, Info: false, Log: false, Debug: false, Verbose: false, LocalOnly: false };
                let newState = {
                    console: logState,
                    dev: logState,
                    system: logState,
                    perf: logState,
                };
                setLogState(newState, false);
            }
        }
    }
    // if log state changes then update queue based on that data (e.g. if no longer logging debug messages, then remove them from the queue)
    function updateQueueBasedOnState(calibrateTimeFlag) {
        loggerConsole.system.debug("Logger updateQueueBasedOnState", calibrateTimeFlag, calibratedTimeStampOffset, "QUEUE LENGTH", loggerQueue.length, currentLogState);
        var newQueue = [];
        for (var i = 0, length = loggerQueue.length; i < length; i++) {
            if (currentLogState[loggerQueue[i].category][loggerQueue[i].logType] && !currentLogState[loggerQueue[i].category].LocalOnly) {
                if (calibrateTimeFlag) {
                    loggerQueue[i].logTimestamp += calibratedTimeStampOffset; // if flag set then timestamp hasn't been adjusted yet by calibrated offset time
                }
                newQueue.push(loggerQueue[i]);
            }
            else { // only now know LocalOnly for messages, so print those queued out otherwise they will be lost
                if (currentLogState[loggerQueue[i].category][loggerQueue[i].logType] && currentLogState[loggerQueue[i].category].LocalOnly) {
                    let msg = loggerQueue[i];
                    console.log(msg.category, msg.logType, msg.logTimestamp - window.performance.timing.navigationStart, msg.logData, "(Previously queued!)");
                }
            }
        }
        loggerQueue = newQueue;
    }
    this.setClientName = function (name) {
        loggerClientName = name;
    };
    this.getClientName = function (name) {
        return loggerClientName;
    };
    this.clearMessageList = function () {
        loggerQueue = [];
    };
    function setLogState(state, calibrateTimeFlag) {
        if (state && state.dev)
            currentLogState = state;
        updateQueueBasedOnState(calibrateTimeFlag);
    }
    // logger entry point to return call stack that can be included in a log message
    this.callStack = function () {
        return traceString();
    };
    this.setting = function () {
        return currentLogState;
    };
    function traceString() {
        function getPosition(string, subString, index) {
            return string.split(subString, index).join(subString).length;
        }
        function getErrorObject() {
            try {
                throw Error("");
            }
            catch (err) {
                return err;
            }
        }
        var stack = getErrorObject().stack;
        var position = getPosition(stack, "\n", 4);
        var tString = stack.substring(position); // strip off irrelevant part of stack
        var final = "Log Stack: \n" + tString.substr(1); // insert description
        return final;
    }
    // save original console functions since going to wrap/redefine each
    var originalConsoleError = console.error;
    var originalConsoleWarn = console.warn;
    var originalConsoleInfo = console.info;
    var originalConsoleLog = console.log;
    var originalConsoleDebug = console.debug;
    function getRoughSizeOfObject(object) {
        var objectList = [];
        var stack = [object];
        var bytes = 0;
        //prevent infinite recursion
        var attempts = 0;
        while (stack.length && attempts < 1000) {
            attempts++;
            var value = stack.pop();
            if (typeof value === "boolean") {
                bytes += 4;
            }
            else if (typeof value === "string") {
                bytes += value.length * 2;
            }
            else if (typeof value === "number") {
                bytes += 8;
            }
            else if (typeof value === "object"
                && objectList.indexOf(value) === -1) {
                objectList.push(value);
                for (var i in value) {
                    stack.push(value[i]);
                }
            }
        }
        return bytes;
    }
    // filter out message containing certain substrings;
    function filterMessage(message) {
        var result = (message.logData.includes("Finsemble.heartbeat") === true);
        return result;
    }
    function formatAndQueueMessage(category, type, args) {
        var message;
        var noFilter = false;
        let CHECK_OBJECT_SIZE = true;
        if (args[0] === "forceObjectsToLogger") {
            noFilter = true;
            CHECK_OBJECT_SIZE = false;
            args.splice(0, 1);
        }
        //Kicks out overly-large objects to prevent the loggerService from jamming up.
        args = args.map((object) => {
            if (CHECK_OBJECT_SIZE) {
                let bytes = getRoughSizeOfObject(object);
                if (bytes > MAX_LOG_MESSAGE_SIZE) {
                    // @todo, Terry, instead of *not* sending the message at all, we should send the first X bytes of the message.
                    outputToConsole(originalConsoleInfo, ["Message too large to send to the logger.", args]);
                    return OVER_LOG_SIZE_LIMIT_MESSAGE;
                }
            }
            return object;
        });
        try {
            for (let i = 0; i < args.length; i++) {
                // Convert arg into a string if it doesn't stringify properly. JavaScript Error class (such as thrown by an unhandled exception) doesn't stringify properly so you must coerce it to a string.
                if (args[i] instanceof Error) {
                    args[i] = args[i].toString();
                }
            }
            message = new LoggerMessage(category, type, JSON.stringify(args));
        }
        catch (err) {
            args.splice(0, args.length); // clear but don't redefine since must return updated value
            args.push(traceString());
            message = new LoggerMessage(category, type, "*** Logging Error: " + JSON.stringify(args));
        }
        if (noFilter || !filterMessage(message)) {
            addToQueue(message);
        }
        else {
            if (++filteredMessagesCounter <= 5) {
                let filterMsg = `"Filtered Logger Message (${filteredMessagesCounter} of first 5 shown)`;
                outputToConsole(originalConsoleInfo, [filterMsg, message]); // put out a few filtered messages then stop so won't clutter console
            }
        }
        if (isRegistered) {
            transmitAndClearQueue();
        }
    }
    let transmitAndClearQueue = function () {
        if (loggerQueue.length > 0) {
            self.RouterClient.transmit("logger.service.logMessages", loggerQueue);
            loggerConsole.clearMessageList();
        }
    };
    if (loggerClientName === "routerService") {
        transmitAndClearQueue = throttle(transmitAndClearQueue, 100, { leading: false }); // HERE is the interval for transmitting queued messages to the logger service
    }
    else {
        transmitAndClearQueue = throttle(transmitAndClearQueue, 250, { leading: false }); // HERE is the interval for transmitting queued messages to the logger service
    }
    //Helper to flatten the array of arguments passed in, so we can log the full message locally.
    function flatten(arr) {
        return arr.reduce(function (flat, toFlatten) {
            return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
        }, []);
    }
    function outputToConsole(consoleType, args) {
        try {
            consoleType.apply(console, flatten(args));
        }
        catch (err) {
            args = [];
            args.push(traceString());
            // [Terry] This has invalid syntax, "category" and "type" don't exist. I don't think this ever gets called.
            // message = new LoggerMessage(category, type, "*** Logging Error: " + JSON.stringify(args));
        }
    }
    /**
     * Log a dev error message.
     *
     * @param {any} message parameter of any type that can be stringified (e.g. string, object)
     *
     * @example
     *
     * FSBL.Clients.Logger.error("some message", parm1, parm2);
     */
    this.error = function () {
        var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
        args.push(traceString());
        if (currentLogState.dev.Error && !currentLogState.dev.LocalOnly) {
            formatAndQueueMessage("dev", "Error", args);
        }
        args.unshift("dev error (" + window.performance.now() + "):");
        outputToConsole(originalConsoleError, args);
    };
    /**
     * Log a dev warning message.
     *
     * @param {any} message parameter of any type that can be stringified (e.g. string, object)
     *
     * @example
     *
     * FSBL.Clients.Logger.warn("some message", parm1, parm2);
     */
    this.warn = function () {
        if (currentLogState.dev.Warn) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            args.push(traceString());
            if (currentLogState.dev.Warn && !currentLogState.dev.LocalOnly) {
                formatAndQueueMessage("dev", "Warn", args);
            }
            if (currentLogState.dev.Warn && currentLogState.dev.LocalOnly) {
                args.unshift("dev warn (" + window.performance.now() + "):");
                outputToConsole(originalConsoleWarn, args);
            }
        }
    };
    /**
     * Log a dev info message.
     *
     * @param {any} message parameter of any type that can be stringified (e.g. string, object)
     *
     * @example
     *
     * FSBL.Clients.Logger.info("some message", parm1, parm2);
     */
    this.info = function () {
        if (currentLogState.dev.Info) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.dev.Info && !currentLogState.dev.LocalOnly) {
                formatAndQueueMessage("dev", "Info", args);
            }
            if (currentLogState.dev.Info && currentLogState.dev.LocalOnly) {
                args.unshift("dev info (" + window.performance.now() + "):");
                outputToConsole(originalConsoleInfo, args);
            }
        }
    };
    /**
     * Log a dev log message.
     *
     * @param {any} message parameter of any type that can be stringified (e.g. string, object)
     *
     * @example
     *
     * FSBL.Clients.Logger.log("some message", parm1, parm2);
     */
    this.log = function () {
        if (currentLogState.dev.Log) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.dev.Log && !currentLogState.dev.LocalOnly) {
                formatAndQueueMessage("dev", "Log", args);
            }
            if (currentLogState.dev.Log && currentLogState.dev.LocalOnly) {
                args.unshift("dev log (" + window.performance.now() + "):");
                outputToConsole(originalConsoleLog, args);
            }
        }
    };
    /**
     * Log a dev debug message.
     *
     * @param {any} message parameter of any type that can be stringified (e.g. string, object)
     *
     * @example
     *
     * FSBL.Clients.Logger.debug("some message", parm1, parm2);
     */
    this.debug = function () {
        if (currentLogState.dev.Debug) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.dev.Debug && !currentLogState.dev.LocalOnly) {
                formatAndQueueMessage("dev", "Debug", args);
            }
            if (currentLogState.dev.Debug && currentLogState.dev.LocalOnly) {
                args.unshift("dev debug (" + window.performance.now() + "):");
                outputToConsole(originalConsoleDebug, args);
            }
        }
    };
    /**
     * Log a dev verbose message (an extra level of verbose-debug output)
     *
     * @param {Array.<any>} messageParm message parameter of any type that can be stringified (e.g. string, object)
     *
     * @example
     *
     * FSBL.Clients.Logger.verbose("some message", parm1, parm2);
     */
    this.verbose = function () {
        if (currentLogState.dev.Verbose) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.dev.Verbose && !currentLogState.dev.LocalOnly) {
                formatAndQueueMessage("dev", "Verbose", args);
            }
            if (currentLogState.dev.Verbose && currentLogState.dev.LocalOnly) {
                args.unshift("dev verbose (" + window.performance.now() + "):");
                outputToConsole(originalConsoleDebug, args);
            }
        }
    };
    // system mode functions
    this.system = {};
    /**
     * @param {Array.<any>} arguments
    */
    this.system.error = function () {
        var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
        args.push(traceString());
        if (currentLogState.system.Error && !currentLogState.system.LocalOnly) {
            formatAndQueueMessage("system", "Error", args);
        }
        args.unshift("system error (" + window.performance.now() + "):");
        outputToConsole(originalConsoleError, args);
    };
    this.system.warn = function () {
        if (currentLogState.system.Warn) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            args.push(traceString());
            if (currentLogState.system.Warn && !currentLogState.system.LocalOnly) {
                formatAndQueueMessage("system", "Warn", args);
            }
            if (currentLogState.system.Warn && currentLogState.system.LocalOnly) {
                args.unshift("system warn (" + window.performance.now() + "):");
                outputToConsole(originalConsoleWarn, args);
            }
        }
    };
    this.system.info = function () {
        if (currentLogState.system.Info) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.system.Info && !currentLogState.system.LocalOnly) {
                formatAndQueueMessage("system", "Info", args);
            }
            if (currentLogState.system.Info && currentLogState.system.LocalOnly) {
                args.unshift("system info (" + window.performance.now() + "):");
                outputToConsole(originalConsoleInfo, args);
            }
        }
    };
    this.system.log = function () {
        if (currentLogState.system.Log) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.system.Log && !currentLogState.system.LocalOnly) {
                formatAndQueueMessage("system", "Log", args);
            }
            if (currentLogState.system.Log && currentLogState.system.LocalOnly) {
                args.unshift("system log (" + window.performance.now() + "):");
                outputToConsole(originalConsoleLog, args);
            }
        }
    };
    this.system.debug = function () {
        if (currentLogState.system.Debug) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.system.Debug && !currentLogState.system.LocalOnly) {
                formatAndQueueMessage("system", "Debug", args);
            }
            if (currentLogState.system.Debug && currentLogState.system.LocalOnly) {
                args.unshift("system debug (" + window.performance.now() + "):");
                outputToConsole(originalConsoleDebug, args);
            }
        }
    };
    this.system.verbose = function () {
        if (currentLogState.system.Verbose) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.system.Verbose && !currentLogState.system.LocalOnly) {
                formatAndQueueMessage("system", "Verbose", args);
            }
            if (currentLogState.system.Verbose && currentLogState.system.LocalOnly) {
                var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
                args.unshift("system log (" + window.performance.now() + "):");
                outputToConsole(originalConsoleDebug, args);
            }
        }
    };
    // performance mode functions
    this.perf = {};
    this.perf.error = function () {
        var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
        args.push(traceString());
        if (currentLogState.perf.Error && !currentLogState.perf.LocalOnly) {
            formatAndQueueMessage("perf", "Error", args);
        }
        args.unshift("perf error (" + window.performance.now() + "):");
        outputToConsole(originalConsoleError, args);
    };
    this.perf.warn = function () {
        if (currentLogState.perf.Warn) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            args.push(traceString());
            if (currentLogState.perf.Warn && !currentLogState.perf.LocalOnly) {
                formatAndQueueMessage("perf", "Warn", args);
            }
            if (currentLogState.perf.Warn && currentLogState.perf.LocalOnly) {
                args.unshift("perf warn (" + window.performance.now() + "):");
                outputToConsole(originalConsoleWarn, args);
            }
        }
    };
    this.perf.info = function () {
        if (currentLogState.perf.Info) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.perf.Info && !currentLogState.perf.LocalOnly) {
                formatAndQueueMessage("perf", "Info", args);
            }
            if (currentLogState.perf.Info && currentLogState.perf.LocalOnly) {
                args.unshift("perf info (" + window.performance.now() + "):");
                outputToConsole(originalConsoleInfo, args);
            }
        }
    };
    this.perf.log = function () {
        if (currentLogState.perf.Log) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.perf.Log && !currentLogState.perf.LocalOnly) {
                formatAndQueueMessage("perf", "Log", args);
            }
            if (currentLogState.perf.Log && currentLogState.perf.LocalOnly) {
                args.unshift("perf log (" + window.performance.now() + "):");
                outputToConsole(originalConsoleLog, args);
            }
        }
    };
    this.perf.debug = function () {
        if (currentLogState.perf.Debug) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.perf.Debug && !currentLogState.perf.LocalOnly) {
                formatAndQueueMessage("perf", "Debug", args);
            }
            if (currentLogState.perf.Debug && currentLogState.perf.LocalOnly) {
                args.unshift("perf debug (" + window.performance.now() + "):");
                outputToConsole(originalConsoleDebug, args);
            }
        }
    };
    this.perf.verbose = function () {
        if (currentLogState.perf.Verbose) {
            var args = Array.prototype.slice.call(arguments); // make a real array so can manipulate
            if (ALWAY_ADD_STACKTRACE) {
                args.push(traceString());
            }
            if (currentLogState.perf.Verbose && !currentLogState.perf.LocalOnly) {
                formatAndQueueMessage("perf", "Verbose", args);
            }
            if (currentLogState.perf.Verbose && currentLogState.perf.LocalOnly) {
                args.unshift("perf verbose (" + window.performance.now() + "):");
                outputToConsole(originalConsoleDebug, args);
            }
        }
    };
    this.onClose = function () {
        this.unregisterClient();
    };
    function registerClient() {
        loggerConsole.system.debug("logger.service.registering", loggerClientName);
        if (!LOCAL_ONLY_DEFAULT) {
            self.RouterClient.query("logger.service.register", {
                clientName: loggerClientName,
                clientChannel,
                uuid: system_1.System.Window.getCurrent().uuid,
                windowName: system_1.System.Window.getCurrent().name
            }, function (error, queryMessage) {
                if (error) { // for some very early clients the logger may not be ready yet, so retry after a small wait
                    setTimeout(registerClient, 750);
                }
                else {
                    isRegistered = true;
                    loggerConsole.system.debug("logger.service.registered");
                    updatedLogState = queryMessage.data;
                    if (loggerClientName !== "routerService") {
                        calibratedTimeStampOffset = newCalibratedTimeStampOffset; // from now the real offset time will be used for all timestamps
                        setLogState(updatedLogState, true); // true indicates must adjust already queued timestamps by the new offset time
                    }
                    else { // router services doesn't need to calibrate time since it is the reference time
                        setLogState(updatedLogState, false);
                    }
                    formatAndQueueMessage("system", "Debug", ["Logger Registered"]);
                    transmitAndClearQueue();
                }
            });
        }
        self.RouterClient.addListener(clientChannel, function (error, message) {
            loggerConsole.system.debug("logger.client.setLogState", message.data);
            updatedLogState = message.data;
            setLogState(updatedLogState, false);
        });
    }
    function unregisterClient(params = {}, cb = Function.prototype) {
        loggerConsole.system.debug("logger.service.unregister", loggerClientName);
        transmitAndClearQueue(); // send any message currently in the log queue
        self.RouterClient.query("logger.service.unregister", loggerClientName, cb);
    }
    function registerOnceWhenStarted() {
        if (!isRegistering) {
            self.startupTime = performance.now() - self.startupTime;
            registerClient();
            isRegistering = true;
        }
    }
    this.unregisterClient = unregisterClient;
    this.isLogMessage = function (channel) {
        return (channel === "logger.service.logMessages");
    };
    this.status = "offline";
    /** Sets the router client for this instance of the Logger client.
     *
     * This is necessary to do after instantiation because the RouterClient
     * and the Logger have a mutual dependency on each other.
    */
    this.setRouterClient = (routerClient) => {
        this.RouterClient = routerClient;
    };
    this.start = function (routerClient) {
        this.startupTime = performance.now();
        var self = this;
        if (!self.RouterClient) {
            console.log("No instance of the RouterClient found for this instance of the Logger. Dynamically requiring it.");
            self.RouterClient = __webpack_require__(5).default;
        }
        let onlineSubscription, allActiveSubscription;
        //Wait for the service before coming online. can't use the dependency manager, because it uses the router, which uses the logger.
        function comeOnline() {
            self.status = "online";
            loggerConsole.system.debug("Logger onReady", loggerClientName);
            // timer calibration must be done so the messages will be correctly sorted in the central logger;
            // this is necessary because there is timer drift between windows --- this appears to be a Chromium
            // bug we have to work around it.  The timeOffset value adjusts the time using the routerService's
            // time as a central reference point.
            self.RouterClient.calibrateTimeWithRouterService(function (timeOffset) {
                newCalibratedTimeStampOffset = timeOffset;
                registerOnceWhenStarted();
            });
        }
        let onRouterReady = () => {
            allActiveSubscription = self.RouterClient.subscribe("Finsemble.Service.State.loggerService", function (err, event) {
                if (event.data.state === "ready") {
                    comeOnline();
                    self.RouterClient.unsubscribe(allActiveSubscription);
                }
            });
        };
        if (window.name === "routerService") {
            self.RouterClient.query("logger.service.register", {}, function (error, queryMessage) {
                if (error) { // for some very early clients the logger may not be ready yet, so retry after a small wait
                    setTimeout(onRouterReady, 750);
                }
                else {
                    onRouterReady();
                }
            });
        }
        else {
            self.RouterClient.onReady(onRouterReady);
        }
    };
};
/** When running unit tests, we don't want to use the real Logger.
 * `window` is an easy indicator of our environment.
 * @TODO - refactor to some sort of global like FSBL.environment. */
exports.Logger = typeof window !== "undefined" ?
    new exports.LoggerConstructor()
    : new localLogger_1.LocalLogger();
exports.default = exports.Logger;


/***/ }),

/***/ 1:
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),

/***/ 10:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__util__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__clients_logger__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__clients_logger___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__clients_logger__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__system__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__system___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__system__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/






var ConfigUtil = function () {

	var self = this;

	/**
  * @introduction
  * <h2>Finsemble Configuration Utility Functions</h2>
  * @private
  * @class ConfigUtil
  */
	// run through the configuration object and resolve any variables definitions (i.e. $applicationRoot)
	this.resolveConfigVariables = function (finsembleConfig, startingConfigObject) {
		var pass = 0;
		var needsAnotherPass = true;

		/**
   * Called by resolveObject().
   * This function parses a string to find variables.
   * It looks up the value of any identified variables, replacing them in the string.
   * The completed string is then returned.
   * @TODO convert this function to use an actual tokenizer?
   **/
		function resolveString(configString) {
			var delimiters = /[/\\:?=&\s]/; // delimiters in regex form
			var tokens = configString.split(delimiters);
			for (var i = 0; i < tokens.length; i++) {
				if (tokens[i][0] === "$") {
					// special variable character $ has to first char in string
					var variableReference = tokens[i].substring(1); // string off the leading $
					var variableResolution = finsembleConfig[variableReference]; // the variable value is another config property, which already must be set
					var newValue = configString.replace(tokens[i], variableResolution); // replace the variable reference with new value
					__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.info("forceObjectsToLogger", "ConfigUtil.resolveConfigVariables:resolveString configString", tokens[i], variableReference, variableResolution, "old value=", configString, "value=", newValue);
					needsAnotherPass = true; // <<-- here is the only place needsAnotherPass is set, since still resolving variables
					configString = newValue;
				}
			}
			return configString;
		}

		// process an array of config items looking for variables to resolve (a recursive routine)
		function resolveArray(configArray, pass, recursionLevel) {
			__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.info("forceObjectsToLogger", "resolveArray", "pass", pass, "recursionLevel", recursionLevel, "configArray:", configArray);
			for (var i = 0; i < configArray.length; i++) {
				var value = configArray[i];
				if (typeof value === "string" && value.indexOf("$") > -1) {
					configArray[i] = resolveString(value);
				} else if (value instanceof Array) {
					resolveArray(value, pass, recursionLevel + 1); // array reference passed so don't need return value
				} else if (typeof value === "object") {
					resolveObject(value, pass, recursionLevel + 1); // object reference passed so don't need return value
				}
			}
		}

		/**
   * Expand "variables" within a config object. Variables are strings that begin with "$".
   * For instance, `finsemble.bar:"help", foo:$bar` would be expanded into `finsemble.bar:"help",foo:"help"`
   * This is a recursive routine
   */
		function resolveObject(configObject, pass, recursionLevel) {
			configObject = configObject || {}; // don't error on bad config
			__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.info("forceObjectsToLogger", "ConfigUtil.resolveConfigVariables:resolveObject", "pass", pass, "recursionLevel", recursionLevel, "configObject:", configObject);
			Object.keys(configObject).forEach(function (key) {
				var value = configObject[key];
				if (typeof value === "string" && value.indexOf("$") > -1) {
					configObject[key] = resolveString(value);
				} else if (value instanceof Array) {
					resolveArray(value, pass, recursionLevel + 1); // array reference passed so don't need return value
				} else if (typeof value === "object") {
					resolveObject(value, pass, recursionLevel + 1); // object reference passed so don't need return value
				}
			});
		}

		// since variables may be nested, keep resolving till no more left
		while (needsAnotherPass) {
			needsAnotherPass = false; // don't need another pass afterwards unless a variable is resolved somewhere in finsembleConfig
			resolveObject(startingConfigObject, ++pass, 1);
		}
	};

	// This does minimal processing of the manifest, just enough to support getting the router up, which is only expanding variables (e.g. moduleRoot) in the raw manifest
	this.getExpandedRawManifest = function (callback, errorCB) {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("ConfigUtil.getExpandedRawManifest starting");

		function getRawManifest(callback, application, level) {
			__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("forceObjectsToLogger", "ConfigUtil.getExpandedRawManifest:getRawManifest", application, level);

			application.getManifest(function (manifest) {
				// get raw openfin manifest
				__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("forceObjectsToLogger", "ConfigUtil.getExpandedRawManifest:getExpandedRawManifest: manifest retrieved. Pre-variable resolution", manifest);
				self.resolveConfigVariables(manifest.finsemble, manifest.finsemble); // resolve variables first time so can find config location
				__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("forceObjectsToLogger", "ConfigUtil.getExpandedRawManifest:getExpandedRawManifest:Complete. post-variable resolution", manifest);
				callback(manifest);
			}, function (err) {
				if (err) {
					__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error("ConfigUtil.getExpandedRawManifest:application.getManifest:err", err);
					if (errorCb) errorCB();
				}
				// no manifest so try parent
				application.getParentUuid(function (parentUuid) {
					var parentApplication = __WEBPACK_IMPORTED_MODULE_2__system__["System"].Application.wrap(parentUuid);
					__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("forceObjectsToLogger", "uuid", parentUuid, "parentApplication", parentApplication);
					if (level < 10) {
						getRawManifest(callback, parentApplication, ++level);
					} else {
						// still could find so must be a problem (i.e. avoid infinite loop)
						callback("could not find manifest in parent applications");
					}
				});
			});
		}

		__WEBPACK_IMPORTED_MODULE_2__system__["System"].ready(function () {
			// make sure openfin is ready
			var application = __WEBPACK_IMPORTED_MODULE_2__system__["System"].Application.getCurrent();
			getRawManifest(callback, application, 1);
		});
	};

	// async read of JSON config file
	this.readConfigFile = function (coreConfigFile, importCallback) {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("fetching " + coreConfigFile);
		fetch(coreConfigFile, {
			credentials: "include"
		}).then(function (response) {
			return response.json();
		}).catch(function (err) {
			importCallback("failure importing: " + err, null);
		}).then(function (importObject) {
			importCallback(null, importObject);
		});
	};

	// This does a "first stage" processing of the manifest, providing enough config to start finsemble.
	// Pull in the initial manifest, which includes getting the "hidden" core config file along with its import definitions, and expand all variables.
	// However, the full config processing, including actually doing the imports, is only done in the Config Service.
	this.getInitialManifest = function (callback) {

		__WEBPACK_IMPORTED_MODULE_2__system__["System"].ready(function () {
			// make sure openfin is ready
			var application = __WEBPACK_IMPORTED_MODULE_2__system__["System"].Application.getCurrent();
			application.getManifest(function (manifest) {
				// get raw openfin manifest
				manifest.finsemble = manifest.finsemble || {}; // don't error on bad config
				self.resolveConfigVariables(manifest.finsemble, manifest.finsemble); // resolve variables first time so can find config config location
				let CORE_CONFIG = manifest.finsemble.moduleRoot + "/configs/core/config.json"; // <<<--- here is the "hidden" core config file
				self.readConfigFile(CORE_CONFIG, function (error, newFinsembleConfigObject) {
					// fetch the core config file
					if (!error) {
						Object.keys(newFinsembleConfigObject).forEach(function (key) {
							if (key === "importConfig") {
								// add any importConfig items from the core to the existing importConfig
								manifest.finsemble.importConfig = manifest.finsemble.importConfig || [];
								for (let i = 0; i < newFinsembleConfigObject.importConfig.length; i++) {
									manifest.finsemble.importConfig.unshift(newFinsembleConfigObject.importConfig[i]);
								}
							} else if (key === "importThirdPartyConfig") {
								// add any importThirdPartyConfig items from the core to the existing importConfig
								manifest.finsemble.importThirdPartyConfig = manifest.finsemble.importThirdPartyConfig || [];
								for (let i = 0; i < newFinsembleConfigObject.importThirdPartyConfig.length; i++) {
									manifest.finsemble.importThirdPartyConfig.unshift(newFinsembleConfigObject.importThirdPartyConfig[i]);
								}
							} else {
								manifest.finsemble[key] = newFinsembleConfigObject[key];
							}
						});
						self.resolveConfigVariables(manifest.finsemble, manifest.finsemble); // resolve variables with finsemble config
						__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("forceObjectsToLogger", "ConfigUtil.getInitialManifest:getCoreConfig:Initial Manifest after variables Resolved", manifest);
					} else {
						__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error("ConfigUtil.getInitialManifest:getCoreConfig:failed importing into finsemble config", error);
					}
					callback(manifest);
				});
			});
		});
	};

	// output JSON object to file
	this.promptAndSaveJSONToLocalFile = function (filename, jsonObject) {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("saveJSONToLocalFile", filename, jsonObject);

		let dataStr = JSON.stringify(jsonObject, null, "\t");
		let dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

		let exportFileDefaultName = filename + ".json";

		let linkElement = document.createElement("a");
		linkElement.setAttribute("href", dataUri);
		linkElement.setAttribute("download", exportFileDefaultName);
		linkElement.click();
	};

	// utility function for future use
	this.configFormatForExport = function (typeOfConfig, configObject) {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("configFormatForExport starting", typeOfConfig, configObject);
		var exportConfig = __WEBPACK_IMPORTED_MODULE_0__util__["default"].clone(configObject);

		if (typeOfConfig === "raw") {
			// do nothing since config is ready to export as is
		} else if (typeOfConfig === "all") {
			delete exportConfig.importConfig;
			delete exportConfig.comment;
		} else if (typeOfConfig === "application") {
			delete exportConfig.importConfig;
			delete exportConfig.comment;
			delete exportConfig.system;
			delete exportConfig.services;
		} else if (typeOfConfig === "workspace") {
			exportConfig = { workspace: exportConfig };
		} else if (typeOfConfig === "workspaceTemplate") {
			let workspaceDefinition = {};
			workspaceDefinition[exportConfig.name] = exportConfig;
			exportConfig = { workspaceTemplates: workspaceDefinition };
		} else if (typeOfConfig === "services") {
			exportConfig = exportConfig.services;
		} else if (typeOfConfig === "components") {
			exportConfig = exportConfig.components;
		}

		return exportConfig;
	};

	/////////////////////////////////////////////////////////////////////////
	/////////////// Remaining code is for config verification ///////////////
	/////////////////////////////////////////////////////////////////////////

	// convenience constructor to return record used in configVerifyObject.
	this.VerifyConfigRecord = function (propertyType, propertyCondition) {
		this._verify = {
			type: propertyType,
			condition: propertyCondition
		};
	};

	// convenience constants for defining verification object. See example usage in ServiceManager or ConfigService.
	// Required means startup will break without it, so error.
	// Optional means startup will not break without it; however, it is documented and expected as part of the config that should always be there.  So warning message only.
	// Deprecated mean startup will no break but old config format is used and should be updated.
	this.REQUIRED_STRING = new this.VerifyConfigRecord("string", "required");
	this.REQUIRED_OBJECT = new this.VerifyConfigRecord("object", "required");
	this.REQUIRED_BOOLEAN = new this.VerifyConfigRecord("boolean", "required");
	this.REQUIRED_ARRAY = new this.VerifyConfigRecord("array", "required");
	this.OPTIONAL_EXPECTED_STRING = new this.VerifyConfigRecord("string", "optional");
	this.OPTIONAL_EXPECTED_OBJECT = new this.VerifyConfigRecord("object", "optional");
	this.OPTIONAL_EXPECTED_BOOLEAN = new this.VerifyConfigRecord("boolean", "optional");
	this.OPTIONAL_EXPECTED_ARRAY = new this.VerifyConfigRecord("array", "optional");
	this.DEPRECATED_STRING = new this.VerifyConfigRecord("string", "DEPRECATED");
	this.DEPRECATED_OBJECT = new this.VerifyConfigRecord("object", "DEPRECATED");
	this.DEPRECATED_BOOLEAN = new this.VerifyConfigRecord("boolean", "DEPRECATED");
	this.DEPRECATED_ARRAY = new this.VerifyConfigRecord("array", "DEPRECATED");

	// check type of one config property. Return true if ok; otherwise false. Must handle null configProperty (returning false).
	function checkType(configProperty, type) {
		var typeOk = true;
		if (configProperty) {
			if (type == "array") {
				if (!Array.isArray(configProperty)) {
					typeOk = false;
				}
			} else {
				// note "array" type is being distinguished from "object" type, so configProperty type shouldn't be an array
				if (Array.isArray(configProperty) || typeof configProperty !== type) {
					typeOk = false;
				}
			}
		} else {
			typeOk = false;
		}
		return typeOk;
	}

	// Verifies one config property given it's corresponding verifyRecord and returns appropriate result.
	function verifyConfigProperty(fullPathName, configProperty, verifyRecord) {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose(`verifyConfigProperty for ${fullPathName}`, configProperty, verifyRecord);
		var resultOk = true;
		switch (verifyRecord._verify.condition) {
			case "required":
				resultOk = checkType(configProperty, verifyRecord._verify.type);
				if (!resultOk) {
					// required must exist and have correct type
					__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error(`Illegally formatted configuration.  Type of ${fullPathName} is not an expected ${verifyRecord._verify.type}`, configProperty, verifyRecord);
				}
				break;
			case "optional":
				if (!configProperty) {
					// missing optional only generates warning
					__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.warn(`CONFIGURATION WARNING: Expected configuration missing for ${fullPathName}.`, configProperty, verifyRecord);
				} else {
					resultOk = checkType(configProperty, verifyRecord._verify.type);
					if (!resultOk) {
						// optional only errors with wrong type
						__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error(`Illegally formatted configuration. Type of ${fullPathName} is not an expected ${verifyRecord._verify.type}`, configProperty, verifyRecord);
					}
				}
				break;
			case "DEPRECATED":
				if (configProperty) {
					// DEPRECATED generates warning
					__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.warn(`CONFIGURATION WARNING: DEPRECATED configuration ${fullPathName}.`, configProperty, verifyRecord);
					resultOk = checkType(configProperty, verifyRecord._verify.type);
					if (!resultOk) {
						// DEPRECATED only errors with wrong type
						__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error(`Config ${fullPathName} is DEPRECATED and illegally formatted.  Expected type is ${verifyRecord._verify.type}.`, configProperty, verifyRecord);
					}
				}
				break;
			default:
				__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error(`Illegally formatted config record.  Condition ${verifyRecord._verify.condition} unknown`, configProperty, verifyRecord);
		}
		return resultOk;
	}

	/**
  * Verifies config is correct and logs messages as needed. Recursively walks configObject and configVerifyObject.
  *
  * @param {object} fullPathName path name of config being verified (e.g. "manifest", "manifest.finsemble"); used for error messages
  * @param {object} configObject the configuration object to verify (typically the manifest object or manifest.finsemble object)
  * @param {object} configVerifyObject object to drive the verification; data driven.
  *
  * Example configVerifyObject below.
  * 		Note verification records (e.g. REQUIRED_STRING) only go at the leaf level, but code must handle corresponding undefined config at all levels.
  *
  * 		var configVerifyObject = {
  *		finsemble: {
  *			applicationRoot: REQUIRED_STRING,
  *			moduleRoot: REQUIRED_STRING,
  *			system: {
  *				FSBLVersion: REQUIRED_STRING,
  *				requiredServicesConfig: REQUIRED_OBJECT,
  *			},
  *			splinteringConfig: {
  *				splinterAgents: OPTIONAL_EXPECTED_ARRAY
  *			},
  *			storage: {
  *				LocalStorageAdapter: DEPRECATED_STRING
  *			},
  *		}
  *	};
 	 *
  *
  * @returns If correct, return true (with no log messages generated); return false otherwise. For optional or DEPRECATED generate warning if not defined, but no error unless if wrong type.
  *
  * @example See ConfigService for example usage.
  *
  * @private
  */
	this.verifyConfigObject = function (fullPathName, configObject, configVerifyObject) {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose(`verifyConfigObject for ${fullPathName}`, configObject, configVerifyObject);
		var verifyConfigObjectOk = true;

		if (configVerifyObject._verify) {
			// currently config records only defined at leaf level (could enhance by allowing at any level)
			verifyConfigObjectOk = verifyConfigProperty(fullPathName, configObject, configVerifyObject);
		} else {
			if (!configVerifyObject) {
				// shouldn't happen unless by api input
				__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error(`configUtil.verify: configVerifyObject not defined for ${fullPathName}`, configObject, configVerifyObject);
			} else {
				var propertyList = Object.keys(configVerifyObject);
				if (!propertyList) {
					// shouldn't happen unless by api input
					__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error(`configUtil.verify: illegally formatted verification record for ${fullPathName}`, configObject, configVerifyObject);
				} else {
					// not at leaf level so recursively iterate though all the properties
					for (let i = 0; i < propertyList.length; i++) {
						let property = propertyList[i];
						let thisPropertyPath = fullPathName + "." + property;
						let thisConfigProperty = null;
						if (configObject && property in configObject) {
							thisConfigProperty = configObject[property];
						}
						// the order of the conditional (i.e. "&&") insures verification will continue after error(s)
						verifyConfigObjectOk = this.verifyConfigObject(thisPropertyPath, thisConfigProperty, configVerifyObject[property]) && verifyConfigObjectOk;
					}
				}
			}
		}
		return verifyConfigObjectOk;
	};

	/**
  * Convenience function to get a default value from config.
  *
  * @param {object} base base path of config object
  * @param {string} path path string of config property
  * @param {any} defaultValue if path value not defined or null, then use default value
  *
  * @returns {object} return config value or default value
  *
  * @example
  *
  *		defaultAdaptor = ConfigUtil.getDefault(manifest, "manifest.finsemble.defaultStorage", "LocalStorageAdapter");
  *		sameDomainTransport = ConfigUtil.getDefault(finConfig, "finConfig.router.sameDomainTransport", "SharedWorker");
  *		var serverAddress = getDefault(params, "params.transportSettings.FinsembleTransport.serverAddress", "ws://127.0.0.1:3376");
  *
  */
	this.getDefault = function (base, path, defaultValue) {
		var result = defaultValue;
		if (base) {
			try {
				let properties = path.split(".");
				let currentValue = base;
				for (let i = 1; i < properties.length; i++) {
					currentValue = currentValue[properties[i]];
				}
				result = currentValue;
			} catch (err) {
				result = defaultValue;
			}

			if (typeof result === "undefined") result = defaultValue;
		}
		return result;
	};
};

const ConfigUtilInstance = new ConfigUtil();
/* harmony export (immutable) */ __webpack_exports__["ConfigUtilInstance"] = ConfigUtilInstance;


 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\common\\configUtil.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\common\\configUtil.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),

/***/ 11:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.WRAPPERS = {
    /*
        TODO: For the time being these are just events our windows fire but not OpenFin (this is used in the OF wrapper. Long term we might have to reverse this)
        TODO: Event naming is inconsistent. Our events should not be camel case to maintain consistency.
    */
    EVENTS: ["title-changed", "bringToFront", "setBounds", "alwaysOnTop", "setOpacity"]
};
exports.APPLICATION_STATE_CHANNEL = "Finsemble.Application.State";
//These next four channels are used in service => service manager communication. The SM receives these messages and then pushes out state updates to the rest of the system.
exports.SERVICE_INITIALIZING_CHANNEL = "Finsemble.ServiceManager.serviceInitializing";
exports.SERVICE_READY_CHANNEL = "Finsemble.ServiceManager.serviceReady";
exports.SERVICE_CLOSING_CHANNEL = "Finsemble.ServiceManager.serviceClosing";
exports.SERVICE_CLOSED_CHANNEL = "Finsemble.ServiceManager.serviceClosed";
//This channel is where the aggregated state of all services is sent out on.
exports.SERVICES_STATE_CHANNEL = "Finsemble.State.Services";
exports.WINDOWSTATE = {
    NORMAL: 0,
    MINIMIZED: 1,
    MAXIMIZED: 2,
    HIDDEN: 3
};
//These channels are to start and stop services dynamically.
exports.SERVICE_START_CHANNEL = "Finsemble.Service.Start";
exports.SERVICE_STOP_CHANNEL = "Finsemble.Service.Stop";
exports.DOCKING = {
    GROUP_UPDATE: "DockingService.groupUpdate",
    // For legacy reasons, this is named Workspace, even though it's generated by docking.
    WORKSPACE_GROUP_UPDATE: "Finsemble.WorkspaceService.groupUpdate",
};
// These channels are for interrupting events
exports.EVENT_INTERRUPT_CHANNEL = "Finsemble.Event.Interrupt";
exports.INTERRUPTIBLE_EVENTS = ["close-requested", "closed", "close-complete", "_container-close-handlers"];
exports.REMOTE_FOCUS = "WindowService.remoteFocus";
exports.WORKSPACE = {
    CLEAN_SHUTDOWN: "Finsemble.Workspace.cleanShutdown",
    UPDATE_PUBSUB: "Finsemble.WorkspaceService.update",
    STORAGE_TOPIC: "finsemble.workspace",
    CACHE_STORAGE_TOPIC: "finsemble.workspace.cache",
    ALL_WORKSPACES: "finsemble.allWorkspaces",
    ACTIVE_WORKSPACE: "activeWorkspace",
    // When we have the liberty of breaking API's, we should consolidate this topic.
    LAST_USED_WORKSPACE_TOPIC: "finsemble",
    LAST_USED_WORKSPACE: "finsemble.lastUsedWorkspace",
    INITIAL_WORKSPACE_PREFERENCE: "finsemble.initialWorkspace",
    PUBLISH_REASONS: {
        INIT: "workspace:initialization",
        LOAD_DATA_RETRIEVED: "workspace:load:dataRetrieved",
        LOAD_FINISHED: "workspace:load:finished",
        WINDOW_REMOVED: "window:remove",
        WINDOW_ADDED: "window:add",
        LOAD_STARTED: "workspace:load:start",
        WORKSPACE_REMOVED: "Workspace:remove",
        WORKSPACE_RENAMED: "rename",
        SWITCHTO_TERMINATED: "workspace:switchTo:terminated",
        NEW_WORKSPACE: "new workspace",
        SAVE_AS: "APPLICATION LIFECYCLE:WORKSPACE LIFECYCLE:SaveAs:Workspace:Save As",
    },
    API_CHANNELS: {
        NEW_WORKSPACE: "Finsemble.Workspace.NewWorkspace",
        SAVE: "Finsemble.Workspace.Save",
        RENAME: "Finsemble.Workspace.Rename",
        SAVE_AS: "Finsemble.Workspace.SaveAs",
        SWITCH_TO: "Finsemble.Workspace.SwitchTo",
        IMPORT: "Finsemble.Workspace.Import",
        EXPORT: "Finsemble.Workspace.Export",
        REMOVE: "Finsemble.Workspace.Remove",
        SAVE_GLOBAL_DATA: "Finsemble.Workspace.SaveGlobalData",
        SAVE_VIEW_DATA: "Finsemble.Workspace.SaveViewData",
        GET_GLOBAL_DATA: "Finsemble.Workspace.GetGlobalData",
        GET_VIEW_DATA: "Finsemble.Workspace.GetViewData",
        GET_WORKSPACES: "Finsemble.Workspace.GetWorkspaces",
        GET_WORKSPACE_NAMES: "Finsemble.Workspace.GetWorkspaceNames",
        SET_WORKSPACE_ORDER: "Finsemble.Workspace.SetWorkspaceOrder",
        GET_ACTIVE_WORKSPACE: "Finsemble.Workspace.GetActiveWorkspace",
        SET_ACTIVEWORKSPACE_DIRTY: "Finsemble.Workspace.SetActiveWorkspaceDirty",
        GET_TEMPLATES: "Finsemble.Workspace.GetTemplates",
        IMPORT_TEMPLATE: "Finsemble.Workspace.ImportTemplate",
        EXPORT_TEMPLATE: "Finsemble.Workspace.ExportTemplate",
        REMOVE_TEMPLATE: "Finsemble.Workspace.RemoveTemplate",
        SET_WINDOW_STATE: "Finsemble.Workspace.SetWindowData",
        GET_WINDOW_STATE: "Finsemble.Workspace.GetWindowData",
        ADD_WINDOW: "WorkspaceService.addWindow",
        REMOVE_WINDOW: "WorkspaceService.removeWindow",
    }
};
exports.COMPONENT_STATE_STORAGE_TOPIC = "finsemble.componentStateStorage";
exports.HEARTBEAT_TIMEOUT_CHANNEL = "Finsemble.WindowService.HeartbeatTimeout";
exports.LAUNCHER_SERVICE = {
    WINDOW_CLOSED: "LauncherService.WindowClosed"
};
exports.DELIVERY_MECHANISM = {
    PRELOAD: 'preload',
    INJECTION: 'injection',
};


/***/ }),

/***/ 12:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = $getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  var args = [];
  for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    ReflectApply(this.listener, this.target, args);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
      }
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function') {
        throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
      }

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}


/***/ }),

/***/ 13:
/***/ (function(module, exports) {

module.exports = function(module) {
	if(!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.paths = [];
		// module.parent = undefined by default
		if(!module.children) module.children = [];
		Object.defineProperty(module, "loaded", {
			enumerable: true,
			get: function() {
				return module.l;
			}
		});
		Object.defineProperty(module, "id", {
			enumerable: true,
			get: function() {
				return module.i;
			}
		});
		module.webpackPolyfill = 1;
	}
	return module;
};


/***/ }),

/***/ 14:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __webpack_require__(12);
const routerClientInstance_1 = __webpack_require__(5);
const STARTUP_TIMEOUT_DURATION = 10000;
const constants_1 = __webpack_require__(11);
/**
 * Small class to hold on to dependencies and callbacks. Also emits a timeout event that the startupManager is listening for. When it times out, the startupManager catches the event and generates a message that includes all of the offline clients and services. It then causes this class to emit an  err event that the baseService is listening for. This arrangement is set up for a couple of reasons.
 * 1. I can't use the logger in here because the logger uses the startupManager, and there'd be a circular dependency.
 * 2. FSBLDependencyManager is a singleton, and there can be multiple services living in a single window. I didn't want them all to log that they were offline if they weren't (e.g., if I'd put the emitter on the StartupManager instead of this class).
 */
class StartupDependency extends events_1.EventEmitter {
    constructor(params) {
        super();
        this.callback = params.callback;
        this.dependencies = params.dependencies;
        this.startupTimer = null;
        this.setStartupTimer = this.setStartupTimer.bind(this);
        this.clearStartupTimer = this.clearStartupTimer.bind(this);
        this.setStartupTimer();
    }
    /**
     * Removes the startup timer (because the dependency was resolved within the allotted time);
     */
    clearStartupTimer() {
        clearTimeout(this.startupTimer);
        delete this.startupTimer;
    }
    /**
     * If the dependency hasn't resolved within STARTUP_TIMEOUT_DURATION, emit a timeout event that the StartupManager can catch.
     */
    setStartupTimer() {
        let self = this;
        //+ coerces the result to a number, making typescript happy.
        this.startupTimer = +setTimeout(() => {
            self.emit("timeout");
        }, STARTUP_TIMEOUT_DURATION);
    }
}
/**
 * Used to generate a unique ID for the list of dependencies.
 */
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/**
 * @private
 */
class StartupManager {
    /**
     * @private
     */
    constructor() {
        this.servicesAreAllOnline = {};
        this.clientsAreAllOnline = {};
        this.onlineClients = [];
        this.onlineServices = [];
        this.dependencies = {};
        this.AuthorizationCompleted = false;
        this.startupTimers = {};
        this.startupTimerFired = false;
        this.bindCorrectContext();
    }
    /**
     * This function and `checkDependencies` are the most important parts of this class. This function accepts a FinsembleDependency object and a callback to be invoked when all required dependencies are ready.
     *
     * @param {FinsembleDependency} dependencies
     * @param {any} callback
     * @memberof StartupManager
     */
    waitFor(dependencies, callback) {
        let id = uuidv4();
        //Set defaults to an empty array if they aren't passed in.
        if (!dependencies.services)
            dependencies.services = [];
        if (!dependencies.clients)
            dependencies.clients = [];
        //The dependency manager can pass in a name to the dependency. If it does, we'll use it. If not, we won't.
        if (dependencies.clients.length) {
            if (this.AuthorizationCompleted === false && dependencies.clients.includes("authenticationClient")) {
                dependencies.clients.splice(dependencies.clients.indexOf("authenticationClient"), 1);
            }
            //Lowercase the first letter of the client.
            dependencies.clients = dependencies.clients.map(clientName => {
                return clientName.charAt(0).toLowerCase() + clientName.slice(1);
            });
        }
        let dependency = new StartupDependency({ dependencies, callback });
        //If the dependency times out, throw an error that the baseService can catch. It will then log out why it's not online.
        dependency.on("timeout", () => {
            this.onDependencyTimeout(dependency);
        });
        this.dependencies[id] = dependency;
        this.checkDependencies();
        return dependency;
    }
    /**
     * This method generates a helpful error message giving possible reasons for why the service is offline. After the message is generated, it emits an event on the dependency that's passed in as a parameter. The BaseService is listening for this event, and logs the error message to the central logger.
     * @param {Dependency} dependency
     */
    onDependencyTimeout(dependency) {
        const NEW_LINE = "\n", TAB = "\u0009", BULLET = "\u2022", BULLET_POINT = NEW_LINE + TAB + BULLET, STORAGE_ADAPTER_ERROR = "The default storage adapter failed to fully initialize, or has a syntax error. Ensure that the default storage adapter is up, connected, and sending/receiving data properly.";
        const HELPFUL_MESSAGES = {
            preferencesService: [
                `PreferencesService failed to start.${BULLET_POINT}Typically this is caused by a failure to retrieve data from your default storage adapter. ${STORAGE_ADAPTER_ERROR}`
            ],
            storageService: [
                `StorageService failed to start. Here are some common reasons for failure:${BULLET_POINT}${STORAGE_ADAPTER_ERROR}${BULLET_POINT}The data coming back from your adapter is improperly formatted or otherwise corrupted. Try clearing your storage and restarting. If the problem persists, the issue may not be in your adapter.`
            ],
            routerService: [
                "RouterService failed to start. This is a fatal error. Contact finsemble support."
            ],
            workspaceService: [
                `WorkspaceService failed to start. Here are some common reasons for failure:${BULLET_POINT}${STORAGE_ADAPTER_ERROR}.${BULLET_POINT}Your active workspace is corrupted.`
            ],
            assimilationService: [
                "AssimilationService failed to start. Check to see that the 'FinsembleAssimilation' is active in your taskManager. If it is, please contact finsemble support."
            ]
        };
        let offlineClients = this.getOfflineClients();
        let offlineServices = this.getOfflineServices();
        let errorMessage = `APPLICATION LIFECYCLE:STARTUP:Dependency not online after ${STARTUP_TIMEOUT_DURATION / 1000} seconds.`;
        if (offlineClients.length) {
            errorMessage += ` Waiting for these clients: ${offlineClients.join(", ")}.`;
        }
        if (offlineServices.length) {
            errorMessage += ` Waiting for these services: ${offlineServices.join(", ")}.`;
        }
        //For every service that's offline, check to see if we have any helpful messages for it. If so, iterate through the array and append to the error message.
        offlineServices.forEach((service) => {
            if (HELPFUL_MESSAGES[service]) {
                HELPFUL_MESSAGES[service].forEach((msg) => {
                    errorMessage += NEW_LINE + NEW_LINE + msg + NEW_LINE;
                });
                //puts a line between our helpful messages and the log stack.
                errorMessage += NEW_LINE;
            }
        });
        //The BaseService is listening for this event, and will log the errorMessage to the central logger.
        dependency.emit("err", errorMessage);
    }
    /**
     * This function loops through all of the registered dependencies and checks to see if the conditions have been met. If so, it invokes the callback and removes the reference to the dependency.
     *
     * @memberof StartupManager
     */
    checkDependencies() {
        for (let id in this.dependencies) {
            let dependency = this.dependencies[id];
            let { dependencies, callback } = dependency;
            if (dependencies.services.length && !this.servicesAreAllOnline[id]) {
                this.servicesAreAllOnline[id] = this.checkServices(dependencies.services);
                if (!this.servicesAreAllOnline[id]) {
                    continue;
                }
            }
            if (dependencies.clients.length && !this.clientsAreAllOnline[id]) {
                this.clientsAreAllOnline[id] = this.checkClients(dependencies.clients);
                if (!this.clientsAreAllOnline[id]) {
                    continue;
                }
            }
            delete this.dependencies[id];
            dependency.clearStartupTimer();
            if (callback) {
                callback();
            }
        }
    }
    getOfflineClients() {
        let offlineClients = [];
        for (let id in this.dependencies) {
            let { dependencies } = this.dependencies[id];
            offlineClients = offlineClients.concat(dependencies.clients.filter((dep) => !this.onlineClients.includes(dep)));
        }
        //return deduped list.
        return offlineClients.filter((client, i) => offlineClients.indexOf(client) === i);
    }
    getOfflineServices() {
        let offlineServices = [];
        for (let id in this.dependencies) {
            let { dependencies } = this.dependencies[id];
            offlineServices = offlineServices.concat(dependencies.services.filter((dep) => !this.onlineServices.includes(dep)));
        }
        return offlineServices.filter((client, i) => offlineServices.indexOf(client) === i);
    }
    /**
     * Iterates through required service list, returns false if any required service is offline.
     *
     * @param {any} serviceList
     * @memberof StartupManager
     */
    checkServices(serviceList) {
        return serviceList.every(service => this.onlineServices.includes(service));
    }
    /**
     * Iterates through required client list, returns false if any required client is offline.
     *
     * @param {any} clientList

     * @memberof StartupManager
     */
    checkClients(clientList) {
        return clientList.every(client => this.onlineClients.includes(client));
    }
    /**
     * When a service comes online, we push it onto our array of online services, and run through all of the registered dependencies.
     *
     * @param {any} serviceName
     * @memberof StartupManager
     */
    setServiceOnline(serviceName) {
        this.onlineServices.push(serviceName);
        this.checkDependencies();
    }
    /**
     * Sets an array of services online. Only happens once at startup.
     *
     * @param {any} serviceList
     * @memberof StartupManager
     */
    setServicesOnline(serviceList) {
        this.onlineServices = this.onlineServices.concat(serviceList);
        this.checkDependencies();
    }
    /**
     *
     *
     * @param {any} clientName

     * @memberof StartupManager
     */
    setClientOnline(clientName) {
        //This check is done because multiple clients of the same type can be on a page.
        if (this.onlineClients.includes(clientName)) {
            return;
        }
        this.onlineClients.push(clientName);
        this.checkDependencies();
    }
    /**
     * Returns the array of online clients.
     *

     * @memberof StartupManager
     */
    getOnlineClients() {
        return this.onlineClients;
    }
    /**
     * Returns the array of online services.
     *

     * @memberof StartupManager
     */
    getOnlineServices() {
        return this.onlineServices;
    }
    /**
     * Method to make sure that `this` is correct when the callbacks are invoked.
     *
     * @memberof StartupManager
     */
    bindCorrectContext() {
        this.checkDependencies = this.checkDependencies.bind(this);
        this.checkServices = this.checkServices.bind(this);
        this.checkClients = this.checkClients.bind(this);
        this.getOfflineClients = this.getOfflineClients.bind(this);
        this.getOfflineServices = this.getOfflineServices.bind(this);
        this.onDependencyTimeout = this.onDependencyTimeout.bind(this);
        this.waitFor = this.waitFor.bind(this);
    }
}
/**
 * @private
 */
class ShutdownManager {
    /**
     * @private
     */
    constructor() {
        this.offlineServices = [];
        this.dependencies = {};
        this.checkDependencies = this.checkDependencies.bind(this);
    }
    /**
     * This function and `checkDependencies` are the most important parts of this class. This function accepts a FinsembleDependency object and a callback to be invoked when all required dependencies are ready.
     *
     * @param {FinsembleDependency} dependencies
     * @param {any} callback
     * @memberof StartupManager
     */
    waitFor(dependencies, callback) {
        //Set defaults to an empty array if they aren't passed in.
        if (!dependencies.services) {
            dependencies.services = [];
        }
        let id = uuidv4();
        this.dependencies[id] = { dependencies, callback };
    }
    /**
     * This function loops through all of the registered dependencies and checks to see if the conditions have been met. If so, it invokes the callback and removes the reference to the dependency.
     *
     * @memberof ShutdownDependencies
     */
    checkDependencies() {
        console.debug("checkDependencies", this.dependencies);
        if (Object.keys(this.dependencies)) {
            for (let id in this.dependencies) {
                let { dependencies, callback } = this.dependencies[id];
                console.debug("checkDependency", dependencies.services, this.offlineServices);
                if (dependencies.services.length) {
                    let servicesAreAllOffline = this.checkServices(dependencies.services);
                    if (!servicesAreAllOffline) {
                        continue;
                    }
                }
                console.debug("checkDependencies callback");
                delete this.dependencies[id];
                if (callback) {
                    callback();
                }
            }
        }
    }
    /**
     * Iterates through required service list, returns false if any required service is offline.
     *
     * @param {any} serviceList

     * @memberof StartupManager
     */
    checkServices(serviceList) {
        return serviceList.every(service => this.offlineServices.includes(service));
    }
    setServiceOffline(service) {
        console.debug("setServiceOffline", service);
        this.offlineServices.push(service);
        this.checkDependencies();
    }
}
/**
 * This is a class that handles FSBL client/service dependency management. Given a list of services and/or clients, it will invoke a callback when all dependencies are ready. This is a singleton.
 * @shouldBePublished false
 * @private
 * @class FSBLDependencyManager
 */
class FSBLDependencyManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.startup = new StartupManager();
        this.shutdown = new ShutdownManager();
        this.RouterClient = routerClientInstance_1.default;
        this.AuthorizationCompleted = false;
        this.bindCorrectContext();
        this.onAuthorizationCompleted(this.startup.checkDependencies);
        routerClientInstance_1.default.onReady(this.listenForServices);
    }
    /**
 * Method to make sure that `this` is correct when the callbacks are invoked.
 *
 * @memberof StartupManager
 */
    bindCorrectContext() {
        this.listenForServices = this.listenForServices.bind(this);
        this.onAuthorizationCompleted = this.onAuthorizationCompleted.bind(this);
    }
    setClientOnline(client) {
        this.startup.setClientOnline(client);
    }
    /*
    * handler for when a service changes its state. If a service comes online or goes offline, dependencies are checked and callbacks invoked.
    */
    onServiceStateChange(data) {
        let ServiceNames = Object.keys(data);
        //Iterate through all services. If it was online but isn't anymore, set it offline. If it was offline but now is, set it online.
        ServiceNames.forEach((serviceName) => {
            let state = data[serviceName].state;
            let wasOnline = this.startup.onlineServices.includes(serviceName);
            let isOnline = state === "ready";
            if (!wasOnline && isOnline) {
                this.startup.setServiceOnline(serviceName);
            }
            if (wasOnline && !isOnline && state === "closed") {
                this.shutdown.setServiceOffline(serviceName);
            }
        });
    }
    /**
     * Listens on the router for services to come online. The first subscriber gets the activeServices as of object instantiation. The 2nd subscriber listens for services to come online after the object is created. We should consider make this all one subscriber, though I see the advantage of having this setup.
     *
     */
    listenForServices() {
        console.debug("dependency manager: listenForServices in " + this.name);
        this.RouterClient.subscribe(constants_1.SERVICES_STATE_CHANNEL, (err, event) => {
            this.onServiceStateChange(event.data);
        });
        // TODO: The pubsub responder doesn't seem to work here. IT works for the above when not closing.
        this.RouterClient.addListener(constants_1.SERVICE_CLOSED_CHANNEL, (err, event) => {
            let services = {};
            services[event.data.name] = {
                state: "closed"
            };
            this.onServiceStateChange(services);
        });
        this.RouterClient.subscribe(constants_1.APPLICATION_STATE_CHANNEL, (err, response) => {
            switch (response.data.state) {
                //authenticated will only be caught by components/services that are up before auth does its thing. Otherwise, a component/service coming up will have the 'ready' application state. In either case, we need to do the things below. But only once.
                case "authenticated":
                case "ready":
                    //No need to send this message out twice.
                    if (this.AuthorizationCompleted)
                        break;
                    console.debug("Authorization Completed");
                    this.AuthorizationCompleted = true;
                    this.startup.AuthorizationCompleted = true;
                    this.emit("AuthorizationCompleted");
                    break;
                case "closing":
                    this.shutdown.checkDependencies();
                    break;
            }
        });
    }
    onAuthorizationCompleted(callback) {
        if (this.AuthorizationCompleted) {
            callback();
        }
        else {
            this.addListener("AuthorizationCompleted", callback);
        }
    }
}
/**
 * This is a class that handles FSBL client/service dependency management. Given a list of services and/or clients, it will invoke a callback when all dependencies are ready. This is a singleton.
 * @shouldBePublished false
 * @private
 * @class FSBLDependencyManager
 */
exports.FSBLDependencyManagerSingleton = new FSBLDependencyManager();
exports.default = exports.FSBLDependencyManagerSingleton;


/***/ }),

/***/ 15:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

Object.defineProperty(exports, "__esModule", { value: true });
const validate_1 = __webpack_require__(6); // Finsemble args validator
const baseClient_1 = __webpack_require__(7);
const async_1 = __webpack_require__(9);
const logger_1 = __webpack_require__(0);
/**
 * @introduction
 * <h2>Config Client</h2>
 *
 * This client provides run-time access to Finsemble's configuration. See the [Configuration tutorial](tutorial-Configuration.html) for a configuration overview.
 * The Config Client functions similar to a global store created with the DistributedStoreClient and offers many of the same methods.
 * Values modified at runtime are not persisted.
 *
 * @hideconstructor
 * @constructor
 */
class ConfigClient extends baseClient_1._BaseClient {
    constructor(params) {
        super(params);
        this.listeners = [];
        /**
         * make sure we dont have duplicate router subscribers
         * @private
         */
        this.changeSub = (change) => {
            if (!this.subs)
                this.subs = {};
            if (!this.subs[change]) {
                this.routerClient.query("configService.addListener", change, (err, queryResponse) => {
                    this.routerClient.subscribe(change, this.handleChanges);
                });
                this.subs[change] = true;
            }
        };
        /**
         * @private
         * @memberof ConfigClient
         */
        this.handleChanges = (err, response) => {
            if (err) {
                logger_1.default.system.error(err);
            }
            if (!response.data.field) {
                response.data.field = null;
            }
            //var combined = "configService" + (response.data.field ? "." + response.data.field : "");
            var val = response.data.storeData ? response.data.storeData : response.data.value;
            this.triggerListeners(response.data.field ? response.data.field : "configService", val);
        };
        // Trigger any function that is listening for changes
        /**
         * @private
         * @memberof ConfigClient
         */
        this.triggerListeners = (listenerKey, data) => {
            if (this.listeners[listenerKey]) {
                for (var i = 0; i < this.listeners[listenerKey].length; i++) {
                    if (typeof this.listeners[listenerKey][i] === "function") {
                        this.listeners[listenerKey][i](null, { field: listenerKey, value: data });
                    }
                    else {
                        logger_1.default.system.warn("ConfigClient:triggerListeners: listener is not a function", listenerKey);
                    }
                }
            }
        };
        /**
         * This is designed to mirror the get. Private because security TBD.
         * @private
         *
         * @param {object} params
         * @param {function} callback
         */
        this.set = (params, callback) => {
            logger_1.default.system.debug("ConfigClient.Set", params);
            // if only one argument then assume no filtering parameters -- the complete manifest will be returned
            if (arguments.length === 1) {
                callback = params; // since only one arg, it must be the callback
                validate_1.default.args(callback, "function");
                params = {};
            }
            else {
                validate_1.default.args(params, "object", callback, "function");
            }
            this.routerClient.query("config.set", params, function (queryErr, queryResponse) {
                callback(queryErr, queryResponse ? queryResponse.data : null);
            });
        };
        //Methods were formally an arrow function. If we want our documentation build to read nested parameters, we need to use this instead of an arrow.
        this.processAndSet = this.processAndSet.bind(this);
        this.getValue = this.getValue.bind(this);
        this.getValues = this.getValues.bind(this);
        this.setValue = this.setValue.bind(this);
        this.setValues = this.setValues.bind(this);
        this.removeValue = this.removeValue.bind(this);
        this.removeValues = this.removeValues.bind(this);
        this.addListener = this.addListener.bind(this);
        this.addListeners = this.addListeners.bind(this);
        this.removeListener = this.removeListener.bind(this);
        this.removeListeners = this.removeListeners.bind(this);
        this.setPreference = this.setPreference.bind(this);
        this.getPreferences = this.getPreferences.bind(this);
    }
    /**
     * Get a value from the config.
     * @param {valueParam | String} params - Params object. This can also be a string
     * @param {String} params.field - The field where the value is stored.
     * @param {Function} cb -  Will return the value if found.
     * @returns {any} - The value of the field. If no callback is given and the value is local, this will run synchronous
     * @example
     * FSBL.Clients.ConfigClient.getValue({field:'field1'},function(err,value){});
     * FSBL.Clients.ConfigClient.getValue('field1',function(err,value){});
     */
    getValue(params, cb = Function.prototype) {
        if (typeof params === "string") {
            params = { field: params };
        }
        const promiseResolver = (resolve, reject) => {
            if (!params.field) {
                const err = "no field provided";
                reject(err);
                return cb(err);
            }
            this.routerClient.query("configService.getValue", { field: params.field }, function (err, response) {
                if (err) {
                    reject(err);
                    return cb(err);
                }
                resolve({ err, data: response.data });
                return cb(err, response.data);
            });
        };
        return new Promise(promiseResolver);
    }
    ;
    /**
     * Get multiple values from the config.
    * @param {Object[] | String[]} fields - An array of field objects. If there are no fields provided, the complete configuration manifest are returned.
     * @param {String} fields[].field - The name of the field
     * @param {Function} cb -  Will return the value if found.
     * @returns {Object} - returns an object of with the fields as keys.If no callback is given and the value is local, this will run synchronous
     * @example
     * FSBL.Clients.ConfigClient.getValues([{field:'field1'},{field2:'field2'}],function(err,values){});
     * FSBL.Clients.ConfigClient.getValues(['field1','field2'],function(err,values){});
     * FSBL.Clients.ConfigClient.get(null, callback); // returns the complete manifest containing the finsemble property
    */
    getValues(fields, cb = Function.prototype) {
        if (typeof fields === "function") {
            cb = fields;
            fields = null;
        }
        if (fields && !Array.isArray(fields)) {
            return this.getValue(fields, cb);
        }
        const promiseResolver = (resolve) => {
            this.routerClient.query("configService.getValues", {
                fields: fields
            }, function (err, response) {
                if (err) {
                    return cb(err);
                }
                resolve({ err, data: response.data });
                return cb(err, response.data);
            });
        };
        return new Promise(promiseResolver);
    }
    ;
    /**
     * Set a value in the config. Setting a value will trigger events that you can listen to using addListener
     * @param {Object} params - Params object
     * @param {String} params.field - The name of the field where data will be stored
     * @param {any} params.value - Value to be stored
     * @param {function} cb optional callback
     * @returns {null}
     *
     * @example
     * FSBL.Clients.ConfigClient.setValue({field:'field1',value:"new value"});
     */
    setValue(params, cb) {
        var data = {
            field: params.field,
            value: params.value
        };
        return this.routerClient.query("configService.setValue", data, function (err) {
            return cb ? cb(err) : null;
        });
    }
    ;
    /**
     * This will set multiple values in the config.
     * @param {Object} fields - An Array of field objects
     * @param {String} fields.field - The name of the field
     * @param {any} fields.value - Field value
     * @param {function} cb optional callback
     * @returns {null}
     *
     * @example
     * FSBL.Clients.ConfigClient.setValues([{field:'field1',value:"new value"}]);
     */
    setValues(fields, cb) {
        if (!fields) {
            return logger_1.default.system.error("ConfigClient.SetValues. No params given");
        }
        if (!Array.isArray(fields)) {
            return logger_1.default.system.error("ConfigClient.SetValues. Params must be an array");
        }
        return this.routerClient.query("configService.setValues", fields, function (err) {
            return cb ? cb(err) : null;
        });
    }
    ;
    /**
     * Remove a value from the config.
     * @param {Object | String} params - Either an object or string
     * @param {String} param.field - The name of the field
     * @param {Function} cb -  returns an error if there is one
     * @example
     * FSBL.Clients.ConfigClient.removeValue({field:'field1'},function(err,bool){});
     */
    removeValue(params, cb = Function.prototype) {
        if (params !== undefined) {
            if (!params.field && typeof params === "string") {
                params = { field: params };
            }
            else {
                return cb("no field provided");
            }
        }
        params.value = null;
        return this.setValue(params, cb);
    }
    ;
    /**
     * Removes multiple values from the config.
     * @param {Array.<Object>} params - An Array of field objects
     * @param {Function} cb -  returns an error if there is one.
     * @example
     * FSBL.Clients.ConfigClient.removeValue({field:'field1'},function(err,bool){});
     */
    removeValues(params, cb = Function.prototype) {
        if (!Array.isArray(params)) {
            return cb("The passed in parameter needs to be an array");
        }
        //casting needed here because params doesn't have an index method?? My guess is that their type defs aren't great.
        async_1.map(params, this.removeValue, function (err, data) {
            return cb(err, data);
        });
    }
    ;
    /**
    * Add a listener to the config at either the root config level or field level. If no field is given, the root config level is used. You can also listen for changes to config fields any number of levels deep -- finsemble.configitem.deeperconfigitem.evendeeperconfigitem
    * @param {Object} params - Params object
    * @param {String} params.field - The data field to listen for. If this is empty it listen to all changes of the store.
    * @param {Function} fn -  the function to call when a listener is triggered
    * @param {Function} cb - callback
    * @example
    * var myFunction = function(err,data){};
    * FSBL.Clients.ConfigClient.addListener({field:'field1'},myFunction,cb);
    */
    addListener(params, fn, cb) {
        var field = null;
        if (typeof params === "function") {
            fn = params;
            params = {};
        }
        if (params.field) {
            field = params.field;
        }
        var combined = "configService" + (field ? "." + field : "");
        if (this.listeners[combined]) {
            this.listeners[combined].push(fn);
        }
        else {
            this.listeners[combined] = [fn];
        }
        this.changeSub(combined);
        return cb ? cb() : null;
    }
    ;
    /**
     *
    * Add an array of listeners as objects or strings. If using strings, you must provide a function callback.
    * @param {Object | Array.<Object>} params - Params object
    * @param {String} params[].field - The data field to listen for.
    * @param {String} params[].listener - the function to call when a listener is triggered. If this is empty, fn is used.
    * @param {function} fn -  the function to call when a listener is triggered
    * @param {function} cb
    * @todo make the typing proper.
    * @example
    * var myFunction = function(err,data){}
  * FSBL.Clients.ConfigClient.addListeners(
    * 	[
    * 		{ field: "field1", listener: myFunction },
    * 		{ field: "field2", listener: myFunction }
    * 	],
    * 	null,
    * 	cb
    * );
    *
    * FSBL.Clients.ConfigClient.addListeners(
    * [{ field: "field1" }, { field: "field2", listener: myFunction }],
    * myFunction,
    * cb
    * );
    *
    * FSBL.Clients.ConfigClient.addListeners(["field1", "field2"], myFunction, cb);
    */
    addListeners(params, fn, cb) {
        if (!Array.isArray(params)) {
            return this.addListener(params, fn, cb);
        }
        for (var i = 0; i < params.length; i++) {
            var field = null;
            var item = params[i];
            var ls;
            if (typeof item === "string") {
                field = item;
            }
            else if (item.field) {
                field = item.field;
                ls = params[i].listener;
            }
            var combined = "configService" + (field ? "." + field : "");
            if (!ls) {
                if (fn && typeof fn === "function") {
                    ls = fn;
                }
            }
            if (this.listeners[combined]) {
                this.listeners[combined].push(ls);
            }
            else {
                this.listeners[combined] = [ls];
            }
            this.changeSub(combined);
        }
        return cb ? cb() : null;
    }
    ;
    /**
     * Remove a listener from config. If no field is given, we look for a config root listener
     * @param {Object} params - Params object
     * @param {String} [params.field] - The data field
     * @param {function} [fn] -  the function to remove from the listeners
     * @param {function} [cb] -  returns true if it was successful in removing the listener.
     *
     * @example
     * var myFunction = function(err,data){}
     * FSBL.Clients.ConfigClient.removeListener({field:'field1'},MyFunction,function(bool){});
     * FSBL.Clients.ConfigClient.removeListener(MyFunction,function(bool){});
     */
    removeListener(params, fn, cb) {
        var field = null;
        if (typeof params === "function") {
            cb = fn;
            fn = params;
            params = {};
        }
        if (params.field) {
            field = params.field;
        }
        var combined = this.name + (field ? "." + field : "");
        if (this.listeners[combined]) {
            for (var i = 0; i < this.listeners[combined].length; i++) {
                if (this.listeners[combined][i] === fn) {
                    this.listeners[combined].pop(i);
                    return cb ? cb(null, true) : null;
                }
            }
        }
        return cb ? cb(null, false) : null;
    }
    ;
    /**
     * Remove an array of listeners from the config
     * @param {Object | Array.<Object>} params - Params object
     * @param {String} params.field - The data field to listen for. If this is empty it listen to all changes of the store.
     * @param {function} params.listener - The listener function
     * @param {function} [fn] -  the function to remove from the listeners
     * @param {function} [cb] -  returns true if it was successful in removing the listener.
     *
     * @example
     * var myFunction = function(err,data){ }
     * FSBL.Clients.ConfigClient.removeListeners({field:'field1'},MyFunction,function(bool){});
     * FSBL.Clients.ConfigClient.removeListeners([{field:'field1',listener:MyFunction}],function(bool){});
     * FSBL.Clients.ConfigClient.removeListeners(['field1'],MyFunction,function(bool){});
     */
    removeListeners(params, fn, cb) {
        if (!Array.isArray(params)) {
            if (typeof params === "function") {
                this.removeListener({}, params, cb);
            }
            else if (params.field) {
                this.removeListener(params, fn, cb);
            }
            return cb("missing fields");
        }
        var removeCount = 0;
        for (var i = 0; i < params.length; i++) {
            var field = null;
            var item = params[i];
            var ls;
            if (typeof item === "string") {
                field = item;
            }
            else if (item.field) {
                field = item.field;
                ls = params[i].listener;
            }
            var combined = "configService" + (field ? "." + field : "");
            if (!ls) {
                if (fn && typeof fn === "function") {
                    ls = fn;
                }
                else {
                    continue;
                }
            }
            for (var j = 0; j < this.listeners[combined].length; j++) {
                if (this.listeners[combined][j] === ls) {
                    this.listeners[combined].pop(i);
                    removeCount++;
                }
            }
        }
        if (removeCount < params.length) {
            return cb("All listeners could not be found", false);
        }
        return cb ? cb(null, true) : null;
    }
    ;
    /**
     * Get all or a portion of the configuration from the Config Service. Typically this function is used to return Finsemble configuration
     * (e.g. "finesemble.components"); however, if can also return all or part of the manifest which contains the Finsemble config property.
     * If no configReference parameter is passed in (i.e. only the callback parameter is specified), then the complete manifest object is returned
     * (including manifest.finsemble).
     *
     * @param {object=} params field property identifies specific config to return
     * @param {function} callback callback function(error, data) to get the configuration data
     * @private
     * @example
     *
     * FSBL.Clients.ConfigClient.get({ field: "finsemble" },function(err, finsemble) {
     *		if (!err) {
     *			finsembleConfig = finsemble;
     *		} else {
     *			console.error("failed to get finsemble configuration");
     *		}
     * });
     *
     * FSBL.Clients.ConfigClient.get({ field: "finsemble.isAuthEnabled" }, function(err, isAuthEnabled) {
     *		var authorizationOn = isAuthEnabled;
     * });
     *
     * FSBL.Clients.ConfigClient.get(callback); // returns the complete manifest containing the finsemble property
     * FSBL.Clients.ConfigClient.get(null, callback); // alternate form; returns the complete manifest containing the finsemble property
     * FSBL.Clients.ConfigClient.get({}, callback); // alternate form; returns the complete manifest containing the finsemble property
     * FSBL.Clients.ConfigClient.get({ field: "finsemble.components" }, callback);
     * FSBL.Clients.ConfigClient.get({ field: "finsemble.services" }, callback);
     * FSBL.Clients.ConfigClient.get({ field: "finsemble.components" },callback);
     * FSBL.Clients.ConfigClient.get({ field: "finsemble.assimilation.whitelist" }, callback);
     * FSBL.Clients.ConfigClient.get({ field: "runtime.version",callback) }; // returns the manifest's runtime.version property
     */
    get(params, callback) {
        logger_1.default.system.debug("ConfigClient.Get", params);
        logger_1.default.system.warn("This functionality has been deprecated. It will be removed in Finsemble version 3.0. Use getValue instead.", params);
        // if only one argument then assume no filtering parameters -- the complete manifest will be returned
        if (arguments.length === 1) {
            callback = params; // since only one arg, it must be the callback
            validate_1.default.args(callback, "function");
            params = {};
        }
        else {
            validate_1.default.args(params, "object", callback, "function");
        }
        this.routerClient.query("config.get", params, function (queryErr, queryResponse) {
            callback(queryErr, queryResponse ? queryResponse.data : null);
        });
    }
    ;
    /**
     * Dynamically set config values within the Finsemble configuration.  New config properties may be set or existing ones modified. Note that configuration changes will not necessarily dynamically modify the components or services that use the corresponding configuration -- it depends if the component or service handles the corresponding change notifications (either though PubSub or the Config's DataStore). Also, these changes do not persist in any config files.)
     *
     * Special Note: Anytime config is set using this API, the newConfig along with the updated manifest will by published to the PubSub topic "Config.changeNotification".  To get these notifications any component or service can subscribe to the topic. An example is shown below.
     *
     * Special Note: Anytime config is set using this API, the dataStore underlying configuration 'Finsemble-Configuration-Store' will also be updated. To get these dataStore events a listener can be set as shown in the example below. However, any config modifications made directly though the DataStore will not result in corresponding PubSub notifications.
     *
     * @param {object} params
     * @param {object} params.newConfig provides the configuration properties to add into the existing configuration under manifest.finsemble. This config must match the Finsemble config requirements as described in [Understanding Finsemble's Configuration]{@tutorial Configuration}. It can include importConfig references to dynamically fetch additional configuration files.
     * @param {boolean} params.overwrite if true then overwrite any preexisting config with new config (can only set to true when running from same origin, not cross-domain); if false then newConfig must not match properties of existing config, including service and component configuration.
     * @param {boolean} params.replace true specifies any component or service definitions in the new config will place all existing non-system component and service configuration
     * @param {function} cb callback to be invoked upon task completion.
     * @example
     * // Examples using processAndSet()
     * FSBL.Clients.ConfigClient.processAndSet({ newConfig: { myNewConfigField: 12345 }, overwrite: false});
     * FSBL.Clients.ConfigClient.processAndSet(
     * {
     *	newConfig: {
     *		"myNewConfigField": 12345,
     *		"myNewConfigObject": {
     *			A: "this is a test",
     *			B: "more test"
     *		},
     *		"importConfig": [
     *			"$applicationRoot/configs/application/test.json",
     *		]
     *	},
     *	overwrite: true,
     *  replace: false,
     * },
     *	function (err, finsemble) {
     *		if (err) {
     *			console.error("ConfigClient.set", err);
     *		} else {
     *			console.log("new finsemble config", finsemble);
     *		}
     *	}
     * );
     *
     *  // example subscribing to PubSub to get notifications of dynamic updates
     * RouterClient.subscribe("Config.changeNotification", function (err, notify) {
     *		console.log("set notification", notify.data.newConfig, notify.data.finsemble);
     *	});
     *
     *  // example using DataStore to get notifications of dynamic updates
     * DistributedStoreClient.getStore({ store: 'Finsemble-Configuration-Store', global: true }, function (err, configStore) {
     *		configStore.addListener({ field: "finsemble" }, function (err, newFinsembleConfig) {
     *			console.log("new manifest.finsemble configuration", newFinsembleConfig);
     *		});
     * });
     *
     */
    processAndSet(params, callback) {
        logger_1.default.system.debug("ConfigClient.processAndSet", params);
        validate_1.default.args(params, "object", callback, "function=") &&
            validate_1.default.args2("params.newConfig", params.newConfig, "object", "params.overwrite", params.overwrite, "boolean=", "params.replace", params.replace, "boolean=");
        if (!params.overwrite && params.replace) {
            var errMsg = "cannot use replace option unless overwrite is also true";
            logger_1.default.system.warn("ConfigClient.processAndSet:", errMsg);
            if (callback) {
                callback(errMsg, null);
            }
        }
        else {
            this.routerClient.query("config.processAndSet", params, function (queryErr, queryResponse) {
                if (callback) {
                    callback(queryErr, queryResponse ? queryResponse.data : null);
                }
            });
        }
    }
    ;
    /**
     * Sets a value on the configStore and persists that value to storage. On application restart, this value will overwrite any application defaults.
     * @param {Object} params - Params object
     * @param {String} params.field - The name of the field where data will be stored
     * @param {any} params.value - Value to be stored
     * @param {function} callback - callback to be invoked when preferences have been retrieved from the service.
     * @example
     * FSBL.Clients.ConfigClient.setPreference({field: "finsemble.initialWorkspace", value: "Workspace 2" }, (err, response) => {
     * 		//preference has been set
     * });
     */
    setPreference(params, callback) {
        this.routerClient.query("PreferencesService.setPreference", params, function (queryErr, queryResponse) {
            if (callback) {
                callback(queryErr, queryResponse ? queryResponse.data : null);
            }
        });
    }
    ;
    /**
     * Retrieves all of the preferences set for the application.
     * @param {Object} params - parameters to pass to getPreferences. Optional. Defaults to null and currently ignored.
     * @param {function} callback - callback to be invoked when preferences have been retrieved from the service.
     * @example
     * FSBL.Clients.ConfigClient.getPreferences((err, preferences)=>{
     * 		//use preferences.
     * });
     */
    getPreferences(params, callback) {
        if (typeof params === "function") {
            callback = params;
            params = null;
        }
        this.routerClient.query("PreferencesService.getPreferences", params, function (queryErr, queryResponse) {
            if (callback) {
                callback(queryErr, queryResponse ? queryResponse.data : null);
            }
        });
    }
    ;
}
;
var configClient = new ConfigClient({
    startupDependencies: {
        services: ["configService"]
    },
    onReady: function (cb) {
        if (cb) {
            cb();
        }
    },
    name: "configClient"
});
exports.default = configClient;


/***/ }),

/***/ 16:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*!
* Copyright 2018 by ChartIQ, Inc.
* All rights reserved.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const { debug, warn, log, /*info,*/ error } = console;
const info = () => { };
const verbose = info;
const logger = {
    warn, info, log, debug,
    error, verbose
};
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
}
;
function traceString() {
    function getPosition(string, subString, index) {
        return string.split(subString, index).join(subString).length;
    }
    function getErrorObject() {
        try {
            throw Error("");
        }
        catch (err) {
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
class LocalLogger {
    constructor() {
        // Log things.
        // @TODO - Make consumers agnostic of these and remove from interface.
        this.start = () => { };
        this.isLogMessage = IsLogMessage;
        this.setting = () => initialLogState;
        this.callStack = () => traceString();
        this.unregisterClient = (_) => { };
        this.setRouterClient = () => { };
        // Top level logging methods
        this.warn = warn;
        this.info = info;
        this.log = log;
        this.debug = debug;
        this.error = error;
        this.verbose = verbose;
        // "Namespaced" methods - they still point to console.
        this.system = logger;
        this.perf = logger;
    }
}
exports.LocalLogger = LocalLogger;


/***/ }),

/***/ 17:
/***/ (function(module, exports) {

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;


/***/ }),

/***/ 18:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ }),

/***/ 185:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(95);


/***/ }),

/***/ 19:
/***/ (function(module, exports, __webpack_require__) {

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var rng = __webpack_require__(18);
var bytesToUuid = __webpack_require__(17);

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;


/***/ }),

/***/ 2:
/***/ (function(module, exports) {

module.exports = function(originalModule) {
	if(!originalModule.webpackPolyfill) {
		var module = Object.create(originalModule);
		// module.parent = undefined by default
		if(!module.children) module.children = [];
		Object.defineProperty(module, "loaded", {
			enumerable: true,
			get: function() {
				return module.l;
			}
		});
		Object.defineProperty(module, "id", {
			enumerable: true,
			get: function() {
				return module.i;
			}
		});
		Object.defineProperty(module, "exports", {
			enumerable: true,
		});
		module.webpackPolyfill = 1;
	}
	return module;
};


/***/ }),

/***/ 20:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__clients_logger__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__clients_logger___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__clients_logger__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__configUtil__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__common_system__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__common_system___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__common_system__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/





var ConfigClient = null;

"use strict";

/**
 * @hideConstructor true
 * @constructor
 */
var UserNotification = function () {
	var alertOnceSinceStartUp = {};
	var alertCurrentCount = {};
	var defaultTemplateURL = null;

	/**
  * Gets the default template URL from the manifest at finsemble->notificationURL. If that doesn't exist then it falls back to the system template location.
  * @private
  */
	this.getDefaultTemplateURL = function (cb) {
		if (defaultTemplateURL) {
			setTimeout(function () {
				// Ensure async, just like else clause
				cb(defaultTemplateURL);
			}, 0);
		} else {
			// Require configClient here instead of at top of page to avoid a dependency error (Router uses UserNotification before config service is ready).
			if (!ConfigClient) ConfigClient = __webpack_require__(15).default;
			ConfigClient.get({ field: "finsemble" }, function (err, finConfig) {
				defaultTemplateURL = __WEBPACK_IMPORTED_MODULE_1__configUtil__["ConfigUtilInstance"].getDefault(finConfig, "finsemble.notificationURL", finConfig.moduleRoot + "/components/system/notification/notification.html");
				cb(defaultTemplateURL);
			});
		}
	};

	/**
  * Conditionally alerts the end user using a desktop notification.
  *
  * @param {string} topic specifies a category for the notification. Topic is currently unused, but in the future it will be used to filter notifications (e.g. applying regEx's defined in config to determine which notifications are displayed). Any topic string can be specified; however "system" is the recommended topic for system notifications applicable both to end uses and to developers. "dev" is the recommended topic for notifications applicable only during development (e.g. a notification that config.json has an illegal value).
  * @param {string} frequency Either "ALWAYS", "ONCE-SINCE-STARTUP", or "MAX-COUNT" to determine if alert should be displayed. Note, the frequencies are based on the number of notifications emitted from a window (as opposed to system wide.)
  * @param {string} identifier uniquely identifies this specific notification message. Used when "frequency" is set to "ONCE-SINCE-STARTUP" or "MAX-COUNT"
  * @param {any} message message to display in the notification. Typically a string. Finsemble's built in templating accepts and object. See src-built-in/components/notification/notification.html.
  * @param {object=} params
  * @param {number} params.maxCount specifies the max number of notifications to display for specified identifier when frequency="MAX-COUNT" (default is 1)
  * @param {number} params.duration time in milliseconds before auto-dismissing the notification (defaults to 24 hours)
  * @param {number} params.url the URL for for notification HTML. If not provided then the system default will be used. Defaults to Finsemble's built-in version at "/finsemble/components/system/notification/notification.html".
  *
  * @example
  *		FSBL.UserNotification.alert("system", "ONCE-SINCE-STARTUP", "MANIFEST-Error", message);
 *		FSBL.UserNotification.alert("dev", "ALWAYS", "Config-Error", message, { url: notificationURL, duration: 1000 * 5 });
 *		FSBL.UserNotification.alert("dev", "MAX-COUNT", "Transport-Failure", message, { url: notificationURL, maxCount: 2 });
 */

	this.alert = function (topic, frequency, identifier, message, params) {
		var self = this;
		// If the url for the template is passed in then don't bother fetching the config
		if (params && params.url) {
			this.alertInternal(topic, frequency, identifier, message, params, params.url);
		} else {
			// If no url, then we need to get the template from config
			this.getDefaultTemplateURL(function (url) {
				self.alertInternal(topic, frequency, identifier, message, params, url);
			});
		}
	};

	/**
  * @private
  */
	this.alertInternal = function (topic, frequency, identifier, message, params, url) {
		params = params || {};
		var alertUser = false;
		var key = "UserNotification.alert." + identifier;
		var duration = params.duration || 1000 * 60 * 60 * 24;

		switch (frequency) {
			case "ONCE-SINCE-STARTUP":
				if (key in alertOnceSinceStartUp) {
					alertUser = false;
				} else {
					// if no key then must be first time
					alertUser = true;
					alertOnceSinceStartUp[key] = true;
				}
				break;
			case "MAX-COUNT":
				let currentCount = 0;
				let maxCount = params.maxCount || 1;
				if (key in alertCurrentCount) {
					currentCount = alertCurrentCount[key];
				}
				alertCurrentCount[key] = ++currentCount; // increment and store
				if (currentCount <= maxCount) {
					alertUser = true;
				}
				break;
			default:
				// default to "ALWAYS"
				alertUser = true;
		}

		__WEBPACK_IMPORTED_MODULE_0__clients_logger___default.a.log("UserNotification.alert", topic, alertUser, frequency, identifier, message, params);
		if (alertUser) {
			var notifyObject = {
				url: url,
				message: message,
				timeout: duration
			};
			new __WEBPACK_IMPORTED_MODULE_2__common_system__["System"].Notification(notifyObject);
		}
	};
};

/* harmony default export */ __webpack_exports__["default"] = (new UserNotification());

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\common\\userNotification.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\common\\userNotification.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),

/***/ 22:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed `func` invocations and a `flush` method to
 * immediately invoke them. Provide `options` to indicate whether `func`
 * should be invoked on the leading and/or trailing edge of the `wait`
 * timeout. The `func` is invoked with the last arguments provided to the
 * throttled function. Subsequent calls to the throttled function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the throttled function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=true]
 *  Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // Avoid excessively updating the position while scrolling.
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
 * jQuery(element).on('click', throttled);
 *
 * // Cancel the trailing throttled invocation.
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    'leading': leading,
    'maxWait': wait,
    'trailing': trailing
  });
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = throttle;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ }),

/***/ 24:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, module) {/**
 * Lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    asyncTag = '[object AsyncFunction]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    nullTag = '[object Null]',
    objectTag = '[object Object]',
    promiseTag = '[object Promise]',
    proxyTag = '[object Proxy]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]',
    undefinedTag = '[object Undefined]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/**
 * A specialized version of `_.some` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/**
 * Checks if a `cache` value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Converts `map` to its key-value pairs.
 *
 * @private
 * @param {Object} map The map to convert.
 * @returns {Array} Returns the key-value pairs.
 */
function mapToArray(map) {
  var index = -1,
      result = Array(map.size);

  map.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/**
 * Converts `set` to an array of its values.
 *
 * @private
 * @param {Object} set The set to convert.
 * @returns {Array} Returns the values.
 */
function setToArray(set) {
  var index = -1,
      result = Array(set.size);

  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined,
    Symbol = root.Symbol,
    Uint8Array = root.Uint8Array,
    propertyIsEnumerable = objectProto.propertyIsEnumerable,
    splice = arrayProto.splice,
    symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols,
    nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined,
    nativeKeys = overArg(Object.keys, Object);

/* Built-in method references that are verified to be native. */
var DataView = getNative(root, 'DataView'),
    Map = getNative(root, 'Map'),
    Promise = getNative(root, 'Promise'),
    Set = getNative(root, 'Set'),
    WeakMap = getNative(root, 'WeakMap'),
    nativeCreate = getNative(Object, 'create');

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = toSource(DataView),
    mapCtorString = toSource(Map),
    promiseCtorString = toSource(Promise),
    setCtorString = toSource(Set),
    weakMapCtorString = toSource(WeakMap);

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;

  this.__data__ = new MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}

/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new ListCache;
  this.size = 0;
}

/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache) {
    var pairs = data.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @param {Function} symbolsFunc The function to get the symbols of `object`.
 * @returns {Array} Returns the array of property names and symbols.
 */
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
}

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

/**
 * The base implementation of `_.isEqual` which supports partial comparisons
 * and tracks traversed objects.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Unordered comparison
 *  2 - Partial comparison
 * @param {Function} [customizer] The function to customize comparisons.
 * @param {Object} [stack] Tracks traversed `value` and `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, bitmask, customizer, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!isObjectLike(value) && !isObjectLike(other))) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
}

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} [stack] Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = objIsArr ? arrayTag : getTag(object),
      othTag = othIsArr ? arrayTag : getTag(other);

  objTag = objTag == argsTag ? objectTag : objTag;
  othTag = othTag == argsTag ? objectTag : othTag;

  var objIsObj = objTag == objectTag,
      othIsObj = othTag == objectTag,
      isSameTag = objTag == othTag;

  if (isSameTag && isBuffer(object)) {
    if (!isBuffer(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack || (stack = new Stack);
    return (objIsArr || isTypedArray(object))
      ? equalArrays(object, other, bitmask, customizer, equalFunc, stack)
      : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
  }
  if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object,
          othUnwrapped = othIsWrapped ? other.value() : other;

      stack || (stack = new Stack);
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new Stack);
  return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `array` and `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(array);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var index = -1,
      result = true,
      seen = (bitmask & COMPARE_UNORDERED_FLAG) ? new SetCache : undefined;

  stack.set(array, other);
  stack.set(other, array);

  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, arrValue, index, other, array, stack)
        : customizer(arrValue, othValue, index, array, other, stack);
    }
    if (compared !== undefined) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (seen) {
      if (!arraySome(other, function(othValue, othIndex) {
            if (!cacheHas(seen, othIndex) &&
                (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
        result = false;
        break;
      }
    } else if (!(
          arrValue === othValue ||
            equalFunc(arrValue, othValue, bitmask, customizer, stack)
        )) {
      result = false;
      break;
    }
  }
  stack['delete'](array);
  stack['delete'](other);
  return result;
}

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag:
      if ((object.byteLength != other.byteLength) ||
          (object.byteOffset != other.byteOffset)) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;

    case arrayBufferTag:
      if ((object.byteLength != other.byteLength) ||
          !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
        return false;
      }
      return true;

    case boolTag:
    case dateTag:
    case numberTag:
      // Coerce booleans to `1` or `0` and dates to milliseconds.
      // Invalid dates are coerced to `NaN`.
      return eq(+object, +other);

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case regexpTag:
    case stringTag:
      // Coerce regexes to strings and treat strings, primitives and objects,
      // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
      // for more details.
      return object == (other + '');

    case mapTag:
      var convert = mapToArray;

    case setTag:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
      convert || (convert = setToArray);

      if (object.size != other.size && !isPartial) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= COMPARE_UNORDERED_FLAG;

      // Recursively compare objects (susceptible to call stack limits).
      stack.set(object, other);
      var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
      stack['delete'](object);
      return result;

    case symbolTag:
      if (symbolValueOf) {
        return symbolValueOf.call(object) == symbolValueOf.call(other);
      }
  }
  return false;
}

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      objProps = getAllKeys(object),
      objLength = objProps.length,
      othProps = getAllKeys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
      return false;
    }
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(object);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var result = true;
  stack.set(object, other);
  stack.set(other, object);

  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, objValue, key, other, object, stack)
        : customizer(objValue, othValue, key, object, other, stack);
    }
    // Recursively compare objects (susceptible to call stack limits).
    if (!(compared === undefined
          ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
          : compared
        )) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack['delete'](object);
  stack['delete'](other);
  return result;
}

/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return baseGetAllKeys(object, keys, getSymbols);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

/**
 * Creates an array of the own enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return arrayFilter(nativeGetSymbols(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
    (Map && getTag(new Map) != mapTag) ||
    (Promise && getTag(Promise.resolve()) != promiseTag) ||
    (Set && getTag(new Set) != setTag) ||
    (WeakMap && getTag(new WeakMap) != weakMapTag)) {
  getTag = function(value) {
    var result = baseGetTag(value),
        Ctor = result == objectTag ? value.constructor : undefined,
        ctorString = Ctor ? toSource(Ctor) : '';

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return dataViewTag;
        case mapCtorString: return mapTag;
        case promiseCtorString: return promiseTag;
        case setCtorString: return setTag;
        case weakMapCtorString: return weakMapTag;
      }
    }
    return result;
  };
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  length = length == null ? MAX_SAFE_INTEGER : length;
  return !!length &&
    (typeof value == 'number' || reIsUint.test(value)) &&
    (value > -1 && value % 1 == 0 && value < length);
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

/**
 * Performs a deep comparison between two values to determine if they are
 * equivalent.
 *
 * **Note:** This method supports comparing arrays, array buffers, booleans,
 * date objects, error objects, maps, numbers, `Object` objects, regexes,
 * sets, strings, symbols, and typed arrays. `Object` objects are compared
 * by their own, not inherited, enumerable properties. Functions and DOM
 * nodes are compared by strict equality, i.e. `===`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.isEqual(object, other);
 * // => true
 *
 * object === other;
 * // => false
 */
function isEqual(value, other) {
  return baseIsEqual(value, other);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

/**
 * This method returns a new empty array.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {Array} Returns the new empty array.
 * @example
 *
 * var arrays = _.times(2, _.stubArray);
 *
 * console.log(arrays);
 * // => [[], []]
 *
 * console.log(arrays[0] === arrays[1]);
 * // => false
 */
function stubArray() {
  return [];
}

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

module.exports = isEqual;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4), __webpack_require__(13)(module)))

/***/ }),

/***/ 25:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_events___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_events__);
function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }


const deepEqual = __webpack_require__(24);
/** Singleton of the System class shared among all instances of Monitors
 * @TODO Refactor to instance member of class.
 */
let System;
class Monitors extends __WEBPACK_IMPORTED_MODULE_0_events__["EventEmitter"] {
	/**
  *
  * @param {function} readyCB Function to be invoked when monitors are retrieved from the system for the first time.
  * @param {function} changeCB Function to be invoked when monitor information changes
  * @param {Object} dependencies Dependency object that provides a system object capable of retrieving monitors.
  */
	constructor(readyCB, changeCB, dependencies) {
		super();
		if (dependencies && dependencies.System) {
			System = dependencies.System;
		} else {
			throw new Error("Monitors class requires dependency injection. Ensure that System is being passed in.");
		}

		this.cachedMonitorInfo = null;

		this.bindAllFunctions();
		this.refreshMonitors(readyCB);

		System.addEventListener("monitor-info-changed", () => {
			this.refreshMonitors(changeCB);
		});

		//This is to handle 'wake events'. This is technically only going to handle unlock events (user locks screen or logs out then logs back in)
		//Technically, if the user has disabled 'lock on sleep', then this will not fire, but openfin does not have an event for waking/sleeping
		System.addEventListener("session-changed", params => {
			// FEA returns undefined, openfin returns reason
			if (!params || typeof params === "object" && params.hasOwnProperty("reason") && (params.reason === "unlock" || params.reason === "remote-connect" || params.reason === "unknown")) {
				this.refreshMonitors(changeCB);
			}
		});
	}

	bindAllFunctions() {
		let self = this;
		for (let name of Object.getOwnPropertyNames(Object.getPrototypeOf(self))) {
			let method = self[name];
			// skip constructor
			if (!(method instanceof Function) || method === Monitors) continue;
			self[name] = self[name].bind(self);
		}
	}

	asyncIt(data, cb) {
		cb(data);
		return data;
	}

	rationalizeMonitor(monitor) {
		monitor.monitorRect.width = monitor.monitorRect.right - monitor.monitorRect.left;
		monitor.monitorRect.height = monitor.monitorRect.bottom - monitor.monitorRect.top;
		monitor.availableRect.width = monitor.availableRect.right - monitor.availableRect.left;
		monitor.availableRect.height = monitor.availableRect.bottom - monitor.availableRect.top;
	}

	calculateMonitorScale(dipRect, scaledRect) {
		return (scaledRect.right - scaledRect.left) / (dipRect.right - dipRect.left);
	}

	/**
  * Determines if two monitor configurations are different by performing a deep equal
  * @param {object} monitorInfo1 Object containing information about a set of monitors
  * @param {object} monitorInfo2 Object containing information about a set of monitors
  * @return {boolean} True if the monitors are different, false if they are the same
  */
	monitorInfoIsChanged(monitorInfo1, monitorInfo2) {
		if (monitorInfo1 === null || monitorInfo2 === null || !deepEqual(monitorInfo1, monitorInfo2)) {
			return true;
		}

		return false;
	}

	/**
  * Retrieves monitor info from the system and sends an event that docking responds to.
  * If the number of monitors or id of all monitors hasn't changed, its assumed this
  * is a scaling/resolution change. The internal state will still be updated and the
  * returned result will include a 'monitorsChanged' boolean to indicate wether it
  * has changed or not
  *
  * @param {Function} cb
  */
	refreshMonitors(cb = Function.prototype) {
		let monitorsChanged = true;

		System.getMonitorInfo(monitorInfo => {
			if (!this.monitorInfoIsChanged(this.cachedMonitorInfo, monitorInfo)) {
				console.info("Skipped refreshMonitors because monitors do not change.");
				monitorsChanged = false;
			}
			//console.log("getAllMonitors");
			this.allMonitors = [];
			var primaryMonitor = monitorInfo.primaryMonitor;
			this.primaryMonitor = primaryMonitor;
			primaryMonitor.whichMonitor = "primary";

			if (fin.container !== "Electron") {
				primaryMonitor.deviceScaleFactor = this.calculateMonitorScale(primaryMonitor.monitor.dipRect, primaryMonitor.monitor.scaledRect);
			}
			primaryMonitor.position = 0;
			this.allMonitors.push(primaryMonitor);
			for (let i = 0; i < monitorInfo.nonPrimaryMonitors.length; i++) {
				let monitor = monitorInfo.nonPrimaryMonitors[i];
				if (fin.container !== "Electron") {
					monitor.deviceScaleFactor = this.calculateMonitorScale(monitor.monitor.dipRect, monitor.monitor.scaledRect);
				}
				monitor.whichMonitor = i;
				monitor.position = i + 1;
				this.allMonitors.push(monitor);
			}
			for (let i = 0; i < this.allMonitors.length; i++) {
				let monitor = this.allMonitors[i];
				this.rationalizeMonitor(monitor);
			}
			this.cachedMonitorInfo = monitorInfo;
			cb(this.allMonitors);
			this.ready = true;
			this.emit("monitors-changed", {
				monitors: this.allMonitors,
				monitorsChanged
			});
		});
	}

	/**
  * Gets All Monitors.
  * @param {*} cb
  */
	getAllMonitors(cb = Function.prototype) {
		if (!this.ready) {
			if (cb) this.refreshMonitors(cb);else return "not ready";
		} else {
			return this.asyncIt(this.allMonitors, cb);
		}
	}

	/**
  * Gets the monitor on which the point is or null if not on any monitor. This assumes scaled dimensions for the monitor (For example from Openfin or WPF directly).
  * @param {*} x
  * @param {*} y
  * @param {*} cb
  */
	getMonitorFromScaledXY(x, y, cb = Function.prototype) {
		let promiseResolver = resolve => {
			if (!this.ready) {
				this.refreshMonitors(() => {
					this.getMonitorFromScaledXY(x, y, cb);
				});
				//This will recursively call until we have monitors.
				return "not ready";
			}
			let theMonitor = null;
			var monitors = this.allMonitors;
			for (var i = 0; i < monitors.length; i++) {
				var monitor = monitors[i];
				var monitorRect = monitor.monitorRect;
				// Are our coordinates inside the monitor? Note that
				// left and top are inclusive. right and bottom are exclusive
				// In OpenFin, two adjacent monitors will share a right and left pixel value!
				if (x >= monitorRect.left && x < monitorRect.right && y >= monitorRect.top && y < monitorRect.bottom) {
					theMonitor = monitor;
					break;
				}
			}
			resolve(theMonitor);
			cb(theMonitor);
		};
		return new Promise(promiseResolver);
	}

	/**
  * Gets the monitor on which the point is or null if not on any monitor. This assumes unscaled positions of x,y (for example from windows API).
  *
  * @param {any} x
  * @param {any} y
  * @param {any} [cb=function () { }]
  * @returns monitor if found or null
  * @memberof Monitors
  */
	getMonitorFromUnscaledXY(x, y, cb = Function.prototype) {
		if (!this.ready) {
			this.refreshMonitors(() => {
				this.getMonitorFromUnscaledXY(x, y, cb);
			});
			return "not ready";
		}
		var monitors = this.allMonitors;
		for (var i = 0; i < monitors.length; i++) {
			var monitor = monitors[i];
			var monitorRect = monitor.monitor.scaledRect;
			if (x >= monitorRect.left && x < monitorRect.right && y >= monitorRect.top && y < monitorRect.bottom) {
				return this.asyncIt(monitor, cb);
			}
		}
		return this.asyncIt(null, cb);
	}

	/**
  * Converts Point from scaled (e.g. from OpenFin/WPF) to unscaled (e.g. to give Windows API) position
  *
  * @param {any} point
  * @param {any} [cb=function () { }]
  * @returns monitor if found or null
  * @memberof Monitors
  */
	translatePointFromScaled(params, cb = Function.prototype) {
		var _this = this;

		return _asyncToGenerator(function* () {
			if (!_this.ready) {
				_this.refreshMonitors(function () {
					_this.translatePointFromScaled(params, cb);
				});
				return "not ready";
			}
			var point;
			if (params.point) point = params.point;else point = params;
			var monitor = params.monitor;
			if (!monitor) {
				let result = yield _this.getMonitorFromScaledXY(point.x, point.y);
				monitor = result.data;
			}

			let unscaledPoint = null;
			if (monitor) {
				var relativeX = point.x - monitor.monitorRect.left;
				var relativeY = point.y - monitor.monitorRect.top;
				var unscaledRelativeX = relativeX * monitor.deviceScaleFactor;
				var unscaledRelativeY = relativeY * monitor.deviceScaleFactor;
				unscaledPoint = {
					x: unscaledRelativeX + monitor.monitor.scaledRect.left,
					y: unscaledRelativeY + monitor.monitor.scaledRect.top
				};
			}

			cb(unscaledPoint);
			return Promise.resolve(unscaledPoint);
		})();
	}

	/**
  * Converts Point to scaled (e.g. from OpenFin/WPF) from unscaled (e.g. to give Windows API) position
  *
  * @param {any} point
  * @param {any} [cb=function () { }]
  * @returns point if on monitor or null
  * @memberof Monitors
  */
	translatePointToScaled(params, cb = Function.prototype) {
		if (!this.ready) {
			this.refreshMonitors(() => {
				this.translatePointToScaled(params, cb);
			});
			return "not ready";
		}
		var point;
		if (params.point) point = params.point;else point = params;
		var monitor = params.monitor || this.getMonitorFromUnscaledXY(point.x, point.y);
		if (!monitor) return this.asyncIt(null, cb);
		var relativeX = point.x - monitor.monitor.scaledRect.left;
		var relativeY = point.y - monitor.monitor.scaledRect.top;
		var scaledRelativeX = relativeX / monitor.deviceScaleFactor;
		var scaledRelativeY = relativeY / monitor.deviceScaleFactor;
		var scaledPoint = {
			x: scaledRelativeX + monitor.monitorRect.left,
			y: scaledRelativeY + monitor.monitorRect.top
		};
		return this.asyncIt(scaledPoint, cb);
	}

	/**
  * Converts Rectangle (top, left, bottom, right) from unscaled to scaled. Mainly for use to translate window locations to/from Windows API.
  *
  * @param {any} rect
  * @param {any} [cb=function () { }]
  * @returns rect
  * @memberof Monitors
  */
	translateRectToScaled(rect, cb = Function.prototype) {
		var _this2 = this;

		return _asyncToGenerator(function* () {
			if (!_this2.ready) {
				_this2.refreshMonitors(function () {
					_this2.translateRectToScaled(rect, cb);
				});
				return "not ready";
			}
			var topLeft = _this2.translatePointToScaled({ x: rect.left, y: rect.top });
			var bottomRight = _this2.translatePointToScaled({ x: rect.right, y: rect.bottom });
			if (!topLeft && bottomRight) {
				monitor = yield _this2.getMonitorFromScaledXY(bottomRight);
				topLeft = _this2.translatePointToScaled({
					monitor,
					point: { x: rect.left, y: rect.top }
				});
			}
			if (!bottomRight && topLeft) {
				monitor = yield _this2.getMonitorFromScaledXY(bottomRight);
				bottomRight = _this2.translatePointToScaled({
					monitor,
					point: { x: rect.right, y: rect.bottom }
				});
			}
			return _this2.asyncIt({
				top: topLeft ? topLeft.y : null,
				left: topLeft ? topLeft.x : null,
				bottom: bottomRight ? bottomRight.y : null,
				right: bottomRight ? bottomRight.x : null,
				height: topLeft && bottomRight ? bottomRight.y - topLeft.y : null,
				width: topLeft && bottomRight ? bottomRight.x - topLeft.x : null
			}, cb);
		})();
	}

	/**
  * Converts Rectangle (top, left, bottom, right) to unscaled from scaled. Mainly for use to translate window locations to/from Windows API.
  *
  * @param {any} rect
  * @param {any} [cb=function () { }]
  * @returns rect
  * @memberof Monitors
  */
	translateRectFromScaled(rect, cb = Function.prototype) {
		if (!this.ready) {
			this.refreshMonitors(() => {
				this.translateRectFromScaled(rect, cb);
			});
			return "not ready";
		}
		var topLeft = this.translatePointFromScaled({ x: rect.left, y: rect.top });
		var bottomRight = this.translatePointFromScaled({ x: rect.right, y: rect.bottom });
		if (!topLeft && bottomRight) {
			topLeft = this.translatePointFromScaled({
				monitor: this.getMonitorFromUnscaledXY(bottomRight),
				point: { x: rect.left, y: rect.top }
			});
		}
		if (!bottomRight && topLeft) {
			bottomRight = this.translatePointFromScaled({
				monitor: this.getMonitorFromUnscaledXY(topLeft),
				point: { x: rect.right, y: rect.bottom }
			});
		}
		return this.asyncIt({
			top: topLeft ? topLeft.y : null,
			left: topLeft ? topLeft.x : null,
			bottom: bottomRight ? bottomRight.y : null,
			right: bottomRight ? bottomRight.x : null,
			height: topLeft && bottomRight ? bottomRight.y - topLeft.y : null,
			width: topLeft && bottomRight ? bottomRight.x - topLeft.x : null
		}, cb);
	}
}
/* harmony default export */ __webpack_exports__["a"] = (Monitors);

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\common\\monitorsAndScaling.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\common\\monitorsAndScaling.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),

/***/ 26:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__configUtil__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__clients_logger__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__clients_logger___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__clients_logger__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__common_system__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__common_system___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__common_system__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

// This routerTransport module is shared between router clients and the router service.  It supports
// the addition of new transports without any change to the router code. Each transport is
// point-to-point between a router client and the router service (i.e. hub and spoke).  Each router
// client can use a different transport (i.e. the router service connects to them all).







/**
 * @introduction
 * <h2>Router Transport</h2>
 * **Service-Level Module**.  Manages and contains the point-to-point transports (i.e., Layer 2) supported by Finsemble.
 * Each transport communicates between a Finsemble services or component (i.e. a router client on one end) and the Finsemble router service (another router client on the other end).
 *
 * Integration into routerService.js is automatic on startup.
 *
 * Developer Notes on Adding New Transport:
 * 1) Create new transport constructor.
 * 2) Call RouterTransport.addTransport() to make the transport constructor (see the bottom of this file)
 *
 * Each transport constructor must be implemented with the following interface:
 *
 *	ExampleTransportConstructor(params, parentMessageHandler, source, destination) where
 *
 * 			params is a passed in object including data that may (or may not) be needed for implementing the transport
 * 					params.FinsembleUUID: globally unique identifier for Finsemble (one per host machine)
 *					params.applicationRoot:  value of manifest.finsemble.applicationRoot,
 *					params.routerDomainRoot: value of manifest.finsemble.moduleRoot,
 *					params.sameDomainTransport: transport to use for same domain clients
 *					params.crossDomainTransport: transport to use for cross domain clients
 *					params.transportSettings: transport settings from finsemble.router.transportSettings if defined, otherwise an empty object
 *
 * 			parentMessageHandler(incomingTransportInfo, routerMessage) where
 * 					incomingTransportInfo is a transport-specific object containing essential information to route back to the same client.
 * 						The same object will be returned on a send() so the transport can use to send the message to that client.
 * 						It's up to the developer to decide what to put in the incomingTransportInfo object. The RouterService never
 * 						directly uses the object, except to do a property-based comparison for equality (so equality must be based on the top-level properties within the object.)
 * 					routerMessage is an object containing a single router message. The transport generally does not need to know the contents --
 * 						it only sends and receives these messages. However, the router's header (routerMessage.header) is available to the transport if needed.
 *
 * 			source is either the source's client name or "RouterService" (when the RouterService is the source)
 *
 * 			destination is either the destination's client name or "RouterService" (when the RouterService is the designation)
 *
 * 			callback(this) returns the constructor.  Normally a constructor is not asynchronous, but support in case the constructed transport requires async initialization.
 *
 * The transport constructor must implement two functions.
 * 		1) send(transport, routerMessage) -- transport object contains destination transport info; routerMessage is the message to send
 * 		2) identifier() -- returns transport's name
 *
 * These functions along with the parentMessageHandler callback all that's needed to interface with the higher-level router (either a client or router service):
 *
 * The three transports implemented at the bottom of this file can serve as examples.
 *
 * @namespace RouterTransport
 */
var RouterTransport = {

	activeTransports: {},

	/**
  * Adds a new type of router transport to pass message between RouterClient and RouterService.
  *
  * @param {string} transportName identifies the new transport
  * @param {object} transportConstructor returns an instance of the new transport
  */
	addTransport: function (transportName, transportConstructor) {
		this.activeTransports[transportName] = transportConstructor;
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.log(`RouterTransport ${transportName} added to activeTransports`);
	},

	/**
  * Gets array of active transports.  What is active depends both on config and what is supported by the environment. Typically, if OF IAB is defined then the IAB transport is added to active list.  Likewise, if SharedWorker defined, then SharedWork transport added to the active list.  Special transports that don't have backwards compatibility (e.g. FinsembleTransport) are only added if specified in the config.
  *
  * @param {string} params transport parameters
  *
  * @returns array of active transport names
  */
	getActiveTransports: function (params) {
		var transportNames = [];

		// convenience function to add transport to active list only if it's not already in the list
		function addToActive(transportName) {
			if (transportNames.indexOf(transportName) === -1) {
				// if not already in the list, then add it
				transportNames.push(transportName);
			}
		}

		// if OpenFin IAB available, then add IAB to active list
		if (fin && fin.desktop && fin.desktop.InterApplicationBus) addToActive("OpenFinBus");

		// If electron, always have FinsembleTransport active
		if (fin && fin.container === "Electron") addToActive("FinsembleTransport");

		// if shared worker available, then add shared-worker transport to active list
		if (SharedWorker) addToActive("SharedWorker");

		// add whatever the sameDomainTransport is to the active list
		addToActive(params.sameDomainTransport);

		// add whatever the crossDomainTransport is to the active list
		addToActive(params.crossDomainTransport);

		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.log("getActiveTransports", transportNames);
		return transportNames;
	},

	/**
  * Get default transport for event router - this is the most reliable transport across all contexts.
  *
 	 * @param {object} params parameters for transport
  * @param {any} incomingMessageHandler
  * @param {any} source
  * @param {any} destination
  * @returns the transport object
  */
	getDefaultTransport: function (params, incomingMessageHandler, source, destination) {
		return RouterTransport.getTransport(params, "OpenFinBus", incomingMessageHandler, source, destination);
	},

	/**
  * Get best client transport based on the run-time context. Will only return cross-domain transport if current context is inter-domain.
  *
 	 * @param {object} params parameters for transport
  * @param {any} incomingMessageHandler
  * @param {any} source
  * @param {any} destination
  * @returns the transport object
  */
	getRecommendedTransport: function (params, incomingMessageHandler, source, destination) {

		// returns true if this window's location is in another domain
		function crossDomain() {
			var parser = document.createElement("a");
			parser.href = params.routerDomainRoot;

			var isSameHost = window.location.hostname === parser.hostname;

			var isSameProtocol = window.location.protocol === parser.protocol;

			var wport = window.location.port !== undefined ? window.location.port : 80;
			var pport = parser.port !== undefined ? parser.port : 80;
			var isSamePort = wport === pport;

			var isCrossDomain = !(isSameHost && isSamePort && isSameProtocol);
			__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("Transport crossDomain=" + isCrossDomain + " (" + isSameHost + ":" + isSameProtocol + ":" + isSamePort + ")");
			return isCrossDomain;
		}

		// returns name of the best transport for communicating with router service
		function recommendedTransportName() {
			var sameDomainTransport = params.sameDomainTransport;
			var crossDomainTransport = params.crossDomainTransport;

			var selectedTransport = sameDomainTransport;
			if (crossDomain()) {
				selectedTransport = crossDomainTransport;
			}

			__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.log(`Transport Info: Selected=${selectedTransport} SameDomainDefault=${sameDomainTransport} CrossDomainDefault=${crossDomainTransport}`);
			console.log(`Transport Info: Selected=${selectedTransport} SameDomainDefault=${sameDomainTransport} CrossDomainDefault=${crossDomainTransport}`);

			return selectedTransport;
		}

		var transportName = recommendedTransportName();
		return RouterTransport.getTransport(params, transportName, incomingMessageHandler, source, destination);
	},

	/**
  * Get a specific transport by name. The transport must be in list of the active transports (i.e. previously added).
  *
 	 * @param {object} params parameters for transport
  * @param {any} transportName
  * @param {any} incomingMessageHandler
  * @param {any} source
  * @param {any} destination
  * @returns the transport object
  */
	getTransport: function (params, transportName, incomingMessageHandler, source, destination) {
		var self = this;
		return new Promise(function (resolve, reject) {
			var transportConstructor = self.activeTransports[transportName];
			if (transportConstructor) {
				new transportConstructor(params, incomingMessageHandler, source, destination, function (newTransport) {
					resolve(newTransport);
				});
			} else {
				reject("unknown router transport name: " + transportName);
			}
		});
	}
};

//////////////////////////////////////////////////////////////
// Below all transports are defined then added to active list
//////////////////////////////////////////////////////////////

var RouterTransportImplementation = {}; // a convenience namespace for router-transport implementations

/*
 * Implements the SharedWorker Transport.
 *
 * Required Functions (used by transport clients):
 * 		send(routerMessage) -- transports the event
 * 		identifier() -- returns transport name/identifier
 *
 * @param {object} params various params to support transports
 * @param {any} parentMessageHandler callback for incoming event
 * @param {any} source either the client name or "RouterService"
 * @param {any} destination either the client name or "RouterService" (unused in SharedWorker)
 */
RouterTransportImplementation.SharedWorkerTransport = function (params, parentMessageHandler, source, destination, callback) {
	var routerThread;
	var self = this;

	// receives incoming shared-worker messages then passes on to parent with correct "wrapper"
	function sharedWorkerMessageHandler(swMessage) {
		var port = swMessage.data[0];
		var routerMessage = swMessage.data[1];
		var incomingTransportInfo = { "transportID": self.identifier(), "port": port };
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose("SharedWorkerTransport Incoming Transport", incomingTransportInfo, "Message", routerMessage);
		parentMessageHandler(incomingTransportInfo, routerMessage);
	}

	//required function for parent (i.e. routeClient or routeService)
	this.send = function (transport, routerMessage) {
		// handle optional transport parm
		if (arguments.length === 1) {
			// clients use just one parm -- routerMessage
			routerMessage = arguments[0];
			transport = null;
		} else {
			// router services uses both parameters
			transport = arguments[0];
			routerMessage = arguments[1];
		}
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose("SharedWorkerTransport Outgoing Transport", routerMessage);

		try {
			routerThread.port.postMessage([transport, routerMessage]);
		} catch (e) {
			__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error("SharedWorkerTransport: post message failed: " + JSON.stringify(e), "Probable cause is sending illegal data type (e.g. function).");
		}
	};

	//required function for parent (i.e. routeClient or routeService)
	this.identifier = function () {
		return "SharedWorker";
	};

	var workerPath = params.transportSettings.SharedWorker && params.transportSettings.SharedWorker.workerPath ? params.transportSettings.SharedWorker.workerPath : params.routerDomainRoot + "/common/routerSharedWorker.js";

	__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.log(`SharedWorker Transport Initializing for ${source} using ${workerPath}`);
	console.log(`SharedWorker Transport Initializing for ${source} using ${workerPath}`);

	routerThread = new SharedWorker(workerPath, { name: "Finsemble", credentials: "included" });
	routerThread.port.onmessage = sharedWorkerMessageHandler;
	routerThread.onerror = function (e) {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error("SharedWorkerTransport Transport Error" + JSON.stringify(e));
	};
	routerThread.port.start();

	if (source === "RouterService") {
		// send first message though shared worker to identify router service
		routerThread.port.postMessage({ data: "connect", source: "RouterService" });
	}

	callback(this);
};

/*
 * Implements the OpenFin Bus Transport.
 *
 * Required Functions (used by transport clients):
 * 		send(transport, routerMessage) -- transport object contains destination transport info; routerMessage is the message to send
 * 		identifier() -- returns transport's name
 *
 * @param {object} params unused in OpenFin transport
 * @param {any} parentMessageHandler callback for incoming event
 * @param {any} source either the client name or "RouterService"
 * @param {any} destination either the client name or "RouterService"
 */
RouterTransportImplementation.OpenFinTransport = function (params, parentMessageHandler, source, destination, callback) {
	var uuid = __WEBPACK_IMPORTED_MODULE_2__common_system__["System"].Application.getCurrent().uuid;
	var self = this;

	// receives incoming OpenFin bus messages then passes on to parent with correct "wrapper"
	function openFinMessageHandler(routerMessage, senderUuid) {
		var incomingTransportInfo = { "transportID": self.identifier(), "senderUuid": senderUuid, "name": routerMessage.header.origin };
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose("OpenFinTransport Incoming Transport", incomingTransportInfo, "Message", routerMessage);
		parentMessageHandler(incomingTransportInfo, routerMessage);
	}

	function subscribeFailure(reason) {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error("OpenFinBus Subscribe Failure: " + reason);
	}

	//required function for the parent (i.e. routeClient or routeService)
	this.send = function (transport, routerMessage) {
		var destTopic;

		// handle optional transport parm
		if (arguments.length === 1) {
			// client use just one parameter - routerMessage
			destTopic = destination;
			routerMessage = arguments[0];
		} else {
			// router service uses both parameters
			destTopic = transport.name;
			routerMessage = arguments[1];
		}

		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose("OpenFinTransport Outgoing Transport", uuid, destTopic, "Message", routerMessage);
		fin.desktop.InterApplicationBus.publish(destTopic, routerMessage, function () {}, function (err) {});
	};

	//required function for the parent (i.e. routeClient or routeService)
	this.identifier = function () {
		return "OpenFinBus";
	};

	__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.log(`OpenFinBus Transport Initializing for ${source}`);
	console.log(`OpenFinBus Transport Initializing for ${source}`);
	fin.desktop.InterApplicationBus.subscribe("*", source, openFinMessageHandler, null, subscribeFailure);

	callback(this);
};

/*
 * Implements the FinsembleTransport (alternative to IAB without iFrame problems with supporting server commonly running on local server).
 *
 * Required Functions (used by transport clients):
 * 		send(event) -- transports the event
 * 		identifier() -- returns transport name/identifier
 *
 * @param {object} params various params to support transports
 * @param {any} parentMessageHandler callback for incoming event
 * @param {any} source either the client name or "RouterService"
 * @param {any} destination either the client name or "RouterService" (unused in FinsembleTransport)
 */
RouterTransportImplementation.FinsembleTransport = function (params, parentMessageHandler, source, destination, callback) {
	/** @TODO - split into two separate vars for clarity. */
	var serverAddress = __WEBPACK_IMPORTED_MODULE_0__configUtil__["ConfigUtilInstance"].getDefault(params, "params.transportSettings.FinsembleTransport.serverAddress", __WEBPACK_IMPORTED_MODULE_0__configUtil__["ConfigUtilInstance"].getDefault(params, "params.IAC.serverAddress", "ws://127.0.0.1:3376"));
	const SOCKET_SERVER_ADDRESS = serverAddress + "/router"; // "router" is the socket namespace used on server

	var self = this;

	// receives incoming messages then passes on to parent (what's passed to parent should be same routerMessage received in send()
	function finsembleMessageHandler(routerMessage) {
		var incomingTransportInfo = { "transportID": self.identifier(), "client": routerMessage.clientMessage.header.origin };
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose("FinsembleTransport Incoming Transport", incomingTransportInfo, "Message", routerMessage);
		parentMessageHandler(incomingTransportInfo, routerMessage.clientMessage);
	}

	// Both sending and receiving is based on the following routing functionality located in a local node server (the below is a copy of the node server code)
	// 		// destination is RouterClient (message.client)
	//  	client.on('ROUTER_CLIENT', function(message) {
	// 			routerServer.emit(message.client, message);
	// 		});
	// 		// destination is RouterService
	// 		client.on('ROUTER_SERVICE', function(message) {
	// 			routerServer.emit('ROUTER_SERVICE_IN', message);
	// 		});

	//required function for the parent (i.e. routeClient or routeService)
	this.send = function (transport, routerMessage) {
		let dest;
		let message;

		// decide how to route the message based on whether client or routerService is sending
		if (arguments.length === 1) {
			// clients use just one parameter, so send client message to RouterService
			dest = "ROUTER_SERVICE";
			routerMessage = arguments[0];
			message = { clientMessage: routerMessage }; // no client property needed to route on server since always going to router service
		} else {
			// router service uses both parameters, so send router-service message to a client
			dest = "ROUTER_CLIENT";
			routerMessage = arguments[1];
			message = { client: transport.client, clientMessage: routerMessage }; // client property used to router on server
		}

		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose("FinsembleTransport Outgoing Transport", dest, "NewMessage", message);
		routerServerSocket.send(JSON.stringify({ dest, message }));
	};

	//required function for the parent (i.e. routeClient or routeService)
	this.identifier = function () {
		return "FinsembleTransport";
	};

	__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.log(`FinsembleTransport Transport Initializing for ${source} using ${SOCKET_SERVER_ADDRESS}`);
	console.log(`FinsembleTransport Transport Initializing for ${source} using ${SOCKET_SERVER_ADDRESS}`);

	function connectTimeoutHandler() {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error(`FinsembleTransport Connection Timeout for ${source}`);
		callback(self);
	}

	// set up for receiving incoming messages
	var routerServerSocket;
	if (SOCKET_SERVER_ADDRESS.startsWith("ws:") || SOCKET_SERVER_ADDRESS.startsWith("wss:")) {
		routerServerSocket = new WebSocket(SOCKET_SERVER_ADDRESS);
	} else {
		console.error("wss not found as SOCKET_SERVER_ADDRESS.  Use wss!", SOCKET_SERVER_ADDRESS);
		routerServerSocket = new WebSocket(SOCKET_SERVER_ADDRESS);
	}
	var connectTimer = setTimeout(connectTimeoutHandler, 3000); // cleared in setServiceOnline

	routerServerSocket.addEventListener("open", () => {
		clearTimeout(connectTimer);
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.log("FinsembleTransport Connected to Server");
		console.log("FinsembleTransport Connected to Server");
		// TODO: Currently all messages are broadcast to everyone and filtering happens here. Need to implement a system similar to socket.io to prevent this or only send messages to proper destinations.
		routerServerSocket.addEventListener("message", event => {
			let data = JSON.parse(event.data);
			if (source === "RouterService" && data.dest == "ROUTER_SERVICE") {
				finsembleMessageHandler(data.message);
			} else if (source === data.message.client) {
				finsembleMessageHandler(data.message);
			}
		});
		callback(self);
	});
};

/*
 * Implements the FinsembleCloudTransport (a version of FinsembleTransport with server commonly running on remote server).
 *
 * Required Functions (used by transport clients):
 * 		send(event) -- transports the event
 * 		identifier() -- returns transport name/identifier
 *
 * @param {object} params various params to support transports
 * @param {any} parentMessageHandler callback for incoming event
 * @param {any} source either the client name or "RouterService"
 * @param {any} destination either the client name or "RouterService" (unused in FinsembleCloudTransport)
 */
RouterTransportImplementation.FinsembleCloudTransport = function (params, parentMessageHandler, source, destination, callback) {
	var serverAddress;
	var defaultAddress = __WEBPACK_IMPORTED_MODULE_0__configUtil__["ConfigUtilInstance"].getDefault(params, "params.transportSettings.FinsembleCloudTransport.serverAddress", params.applicationRoot);
	var FinsembleUUID = params.FinsembleUUID;

	if (defaultAddress.substr(defaultAddress.length - 1) === "/") {
		serverAddress = defaultAddress.substring(0, defaultAddress.length - 1); // truncate and trailing slash because it causes problem with socket.io namespace
	} else {
		serverAddress = defaultAddress;
	}

	const SOCKET_SERVER_ADDRESS = serverAddress + "/router"; // "router" is the socket namespace used on server

	var self = this;

	// receives incoming messages then passes on to parent (what's passed to parent should be same routerMessage received in send()
	function finsembleMessageHandler(routerMessage) {
		var incomingTransportInfo = { "transportID": self.identifier(), "client": routerMessage.clientMessage.header.origin };
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose("FinsembleCloudTransport Incoming Transport", incomingTransportInfo, "Message", routerMessage);
		parentMessageHandler(incomingTransportInfo, routerMessage.clientMessage);
	}

	//required function for the parent (i.e. routeClient or routeService)
	this.send = function (transport, routerMessage) {
		var dest;
		var newMessage;

		// decide how to route the message based on whether client or routerService is sending
		if (arguments.length === 1) {
			// clients use just one parameter, so send client message to RouterService
			dest = "ROUTER_SERVICE";
			routerMessage = arguments[0];
			newMessage = { FinsembleUUID, clientMessage: routerMessage }; // no client property needed to route on server since always going to router service
		} else {
			// router service uses both parameters, so send router-service message to a client
			dest = "ROUTER_CLIENT";
			routerMessage = arguments[1];
			newMessage = { FinsembleUUID, client: transport.client, clientMessage: routerMessage }; // client property used to router on server
		}

		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.verbose("FinsembleCloudTransport Outgoing Transport", dest, "NewMessage", newMessage);
		routerServerSocket.emit(dest, newMessage);
	};

	//required function for the parent (i.e. routeClient or routeService)
	this.identifier = function () {
		return "FinsembleCloudTransport";
	};

	__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.log(`FinsembleCloudTransport Transport Initializing for ${source} using ${SOCKET_SERVER_ADDRESS}`);
	console.log(`FinsembleCloudTransport Transport Initializing for ${source} using ${SOCKET_SERVER_ADDRESS}`);

	function connectTimeoutHandler() {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.error(`FinsembleCloudTransport Connection Timeout for ${source}`);
		callback(self);
	}

	// set up for receiving incoming messages
	var routerServerSocket;
	if (SOCKET_SERVER_ADDRESS.indexOf("ws:") !== -1) {
		routerServerSocket = new ws(SOCKET_SERVER_ADDRESS);
	} else {
		console.error("SOCKET_SERVER_ADDRESS not wss!", SOCKET_SERVER_ADDRESS);
		routerServerSocket = new ws(SOCKET_SERVER_ADDRESS); // if not ws then http
	}
	var connectTimer = setTimeout(connectTimeoutHandler, 3000); // cleared in setServiceOnline

	routerServerSocket.on("connect", function () {
		clearTimeout(connectTimer);
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.log("FinsembleCloudTransport Connected to Server", FinsembleUUID);
		console.log("FinsembleCloudTransport Connected to Server");
		if (source === "RouterService") {
			// if this transport is for router service, use hard coded socket address ("ROUTER_SERVICE_IN") along with FinsembleUUID
			__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("Setting Up Socket Connection", "ROUTER_SERVICE_IN" + FinsembleUUID);
			console.log("Setting Up Socket Connection", "ROUTER_SERVICE_IN" + FinsembleUUID);
			routerServerSocket.on("ROUTER_SERVICE_IN" + FinsembleUUID, function (data) {
				finsembleMessageHandler(data);
			});
		} else {
			// for all other clients, the source == client name, so each socket address is based on client name along with FinsembleUUID
			__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("Setting Up Socket Connection", source + FinsembleUUID);
			console.log("SETTING UP Socket CONNECTION", source + FinsembleUUID);
			routerServerSocket.on(source + FinsembleUUID, function (data) {
				finsembleMessageHandler(data);
			});
		}
		callback(self);
	});
};

// add the transports to the available/active list
RouterTransport.addTransport("SharedWorker", RouterTransportImplementation.SharedWorkerTransport);
RouterTransport.addTransport("OpenFinBus", RouterTransportImplementation.OpenFinTransport);
RouterTransport.addTransport("FinsembleTransport", RouterTransportImplementation.FinsembleTransport);

/* harmony default export */ __webpack_exports__["default"] = (RouterTransport);

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\common\\routerTransport.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\common\\routerTransport.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),

/***/ 27:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

Object.defineProperty(exports, "__esModule", { value: true });
const routerTransport_1 = __webpack_require__(26);
const Utils = __webpack_require__(8);
const configUtil_1 = __webpack_require__(10);
const validate_1 = __webpack_require__(6); // Finsemble args validator
const userNotification_1 = __webpack_require__(20);
const system_1 = __webpack_require__(3);
const logger_1 = __webpack_require__(0);
var queue = []; // should never be used, but message sent before router ready will be queue
const Globals = typeof window !== "undefined"
    ? window
    : process;
const localLogger_1 = __webpack_require__(16);
let Logger = logger_1.Logger;
//@todo proper types for router messages would be great.
// Use global data for these objects in case multiple clients running in same window (a side effect of injection and perhaps other edge conditions).
Globals.FSBLData = Globals.FSBLData || {};
Globals.FSBLData.clientIDCounter = Globals.FSBLData.clientIDCounter || 1000;
Globals.FSBLData.RouterClients = Globals.FSBLData.RouterClients || {};
/**
 * @introduction
 *
 * <h2>Router Client</h2>
 *
 * The Router Client sends and receives event messages between Finsemble components and services. See the <a href=tutorial-TheRouter.html>Router tutorial</a> for an overview of the Router's functionality.
 *
 * Router callbacks for incoming messages are **always** in the form `callback(error, event)`. If `error` is null, then the incoming data is always in `event.data`. If `error` is set, it contains a diagnostic object and message. On error, the `event` parameter is not undefined.
 *
 *
 * @constructor
 * @hideconstructor
 * @publishedName RouterClient
 * @param {string} clientName router base client name for human readable messages (window name is concatenated to baseClientName)
 * @param {string=} transportName router transport name, currently either "SharedWorker" or "OpenFinBus" (usually this is auto-configured internally but can be selected for testing or special configurations)
 */
// un-comment for optimization.
// console.time("FinMainStartup");
exports.RouterClientConstructor = function (params) {
    validate_1.default.args(params, "object") && validate_1.default.args2("params.clientName", params.clientName, "string", "params.transportName", params.transportName, "string=");
    // console.timeStamp("Router");
    // console.profile("Router");
    ///////////////////////////
    // Private Data
    ///////////////////////////
    var baseClientName = params.clientName;
    var transportName = params.transportName;
    var handshakeHandler;
    var timeCalibrationHandler;
    var mapListeners = {};
    var mapResponders = {};
    var mapPubSubResponders = {};
    var mapPubSubResponderState = {};
    var mapPubSubResponderRegEx = {};
    var pubsubListOfSubscribers = {};
    var mapSubscribersID = {};
    var mapSubscribersTopic = {};
    var mapQueryResponses = {};
    var mapQueryResponseTimeOut = {};
    var clientName;
    var transport = null;
    var isRouterReady = false;
    var parentReadyCallbackQueue = []; // must be queue because may be multiple waiters
    var self = this;
    this.startupTime = 0;
    /////////////////////////////////////////////////////////////////////
    // Private Message Constructors for Communicating with RouterService
    /////////////////////////////////////////////////////////////////////
    function InitialHandshakeMessage() {
        this.header = {
            "origin": clientName,
            "type": "initialHandshake",
        };
    }
    function TimeCalibrationHandshakeMessage(clientBaseTime, serviceBaseTime) {
        this.header = {
            "origin": clientName,
            "type": "timeCalibration",
        };
        this.clientBaseTime = clientBaseTime;
        this.serviceBaseTime = serviceBaseTime;
    }
    function AddListenerMessage(channel) {
        this.header = {
            "origin": clientName,
            "type": "addListener",
            "channel": channel
        };
    }
    function TransmitMessage(toChannel, data, options) {
        this.header = {
            "origin": clientName,
            "type": "transmit",
            "channel": toChannel
        };
        this.data = data;
        this.options = options;
    }
    function RemoveListenerMessage(channel) {
        this.header = {
            "origin": clientName,
            "type": "removeListener",
            "channel": channel
        };
    }
    function addResponderMessage(channel) {
        this.header = {
            "origin": clientName,
            "type": "addResponder",
            "channel": channel
        };
    }
    function QueryMessage(queryID, channel, data) {
        this.header = {
            "origin": clientName,
            "type": "query",
            "queryID": queryID,
            "channel": channel
        };
        this.data = data;
    }
    function QueryResponseMessage(queryID, error, data) {
        this.header = {
            "origin": clientName,
            "type": "queryResponse",
            "queryID": queryID,
            "error": error
        };
        this.data = data;
    }
    function RemoveResponderMessage(channel) {
        this.header = {
            "origin": clientName,
            "type": "removeResponder",
            "channel": channel
        };
    }
    function SubscribeMessage(subscribeID, topic) {
        this.header = {
            "origin": clientName,
            "type": "subscribe",
            "subscribeID": subscribeID,
            "topic": topic
        };
    }
    function UnsubscribeMessage(subscribeID, topic) {
        this.header = {
            "origin": clientName,
            "type": "unsubscribe",
            "subscribeID": subscribeID,
            "topic": topic
        };
    }
    function PublishMessage(topic, data) {
        this.header = {
            "origin": clientName,
            "type": "publish",
            "topic": topic
        };
        this.data = data;
    }
    function NotifyMessage(subscribeID, topic, error, data) {
        this.header = {
            "origin": clientName,
            "type": "notify",
            "subscribeID": subscribeID,
            "topic": topic,
            "error": error
        };
        this.data = data;
    }
    function AddPubSubResponderMessage(topic) {
        this.header = {
            "origin": clientName,
            "type": "addPubSubResponder",
            "topic": topic
        };
    }
    function RemovePubSubResponderMessage(topic) {
        this.header = {
            "origin": clientName,
            "type": "removePubSubResponder",
            "topic": topic
        };
    }
    function JoinGroupMessage(group) {
        this.header = {
            "origin": clientName,
            "type": "joinGroup",
            "group": group
        };
    }
    function LeaveGroupMessage(group) {
        this.header = {
            "origin": clientName,
            "type": "leaveGroup",
            "group": group
        };
    }
    function GroupTransmitMessage(group, toChannel, message, data) {
        this.header = {
            "origin": clientName,
            "type": "groupTransmit",
            "group": group,
            "channel": toChannel
        };
        this.data = data;
    }
    //////////////////////
    // Private Functions
    //////////////////////
    // router client is being terminated so cleanup
    function destructor(event) {
        Logger.system.info("WINDOW LIFECYCLE:Shutdown:RouterClient:Shutting down.");
        self.disconnectAll(); // this will let the router know the client is terminating
    }
    // invoked when router init is complete
    function onReadyCallBack() {
        self.startupTime = performance.now() - self.startupTime;
        Logger.system.debug("WINDOW LIFECYCLE:STARTUP:RouterClient Ready");
        isRouterReady = true;
        // console.profileEnd("Router");
        // invoke all the parent callbacks waiting for router to be ready
        while (parentReadyCallbackQueue.length > 0) {
            Logger.system.debug("WINDOW LIFECYCLE:STARTUP:RouterClient parentReady invoked");
            var nextParentCallback = parentReadyCallbackQueue.shift();
            nextParentCallback();
        }
    }
    // called once on router-client creation
    function constructor(clientName, transportName) {
        Logger.system.debug("WINDOW LIFECYCLE:STARTUP:RouterClient Constructor:Name:", clientName);
        var callbackCounter = 0;
        function processManifest(manifest) {
            Logger.system.info("WINDOW LIFECYCLE:STARTUP:RouterClient:processManifest");
            //If manifest is a string, then there was an error getting the manifest because in a separate application
            if (!manifest || typeof (manifest) === "string") {
                Logger.system.error("WINDOW LIFECYCLE:STARTUP:RouterClient:processManifest failed -- fatal error", manifest);
            }
            else {
                asyncConnectToEventRouter(manifest, clientName, transportName, onReadyCallBack); /**** establish connection to router service ****/
            }
        }
        //This is the only place we need to wait for desktop.main
        system_1.System.ready(function () {
            var finWindow = system_1.System.Window.getCurrent();
            Logger.system.debug(`WINDOW LIFECYCLE:STARTUP: fin.main invoked in ${finWindow.name}`);
            console.debug(`WINDOW LIFECYCLE:STARTUP: fin.main invoked in ${finWindow.name}`);
            self.startupTime = performance.now();
            // un-comment for optimization.
            // console.timeEnd("FinMainStartup");
            if (callbackCounter++ === 0) { // this check should  not be needed; patch for OpenFin bug which invokes callback twice
                // catch "window closing" event so can cleanup
                //got rid of onClose destructors because it's handled inside of the baseService and inside of FSBL. if we disconnect all before other close handlers complete, we could end up with a hanging window.
                finWindow.getOptions((opts) => {
                    // now the manifest data is available in custom data for all windows except the service manager window (i.e. the first window)
                    if (opts.customData && opts.customData.manifest) {
                        Logger.system.debug("Router Init using custom data");
                        processManifest(opts.customData.manifest);
                    }
                    else {
                        configUtil_1.ConfigUtilInstance.getExpandedRawManifest(function (manifest) {
                            Logger.system.debug("Router Init using getExpandedRawManifest");
                            if (Globals.FinsembleUUID) {
                                manifest.finsemble.FinsembleUUID = Globals.FinsembleUUID; // every window except serviceManager has FinsembleUUID -- this case covers the service manager,
                            }
                            processManifest(manifest);
                        }, function (err) {
                            Logger.system.error("WINDOW LIFECYCLE:STARTUP:RouterClient:manifest error", err);
                        });
                    }
                }, function (err) {
                    Logger.system.error("WINDOW LIFECYCLE:STARTUP:finWindow.getOptions error", err);
                });
            }
        });
    }
    // connects to event-router service. will retry various ways if needed
    function asyncConnectToEventRouter(manifest, clientName, transportName, onReadyCallBack) {
        var transportNotSpecified = (typeof (transportName) === "undefined");
        var myTimer;
        var myRetryCounter;
        var isFinished = false;
        var handshakeFailedCount = 0;
        var finConfig = manifest.finsemble;
        var isElectron = fin && fin.container == "Electron";
        var routerParams = {
            FinsembleUUID: finConfig.FinsembleUUID,
            applicationRoot: finConfig.applicationRoot,
            routerDomainRoot: finConfig.moduleRoot,
            forceWindowTransport: configUtil_1.ConfigUtilInstance.getDefault(finConfig, "finConfig.router.forceWindowTransport", {}),
            sameDomainTransport: configUtil_1.ConfigUtilInstance.getDefault(finConfig, "finConfig.router.sameDomainTransport", "SharedWorker"),
            crossDomainTransport: configUtil_1.ConfigUtilInstance.getDefault(finConfig, "finConfig.router.crossDomainTransport", "OpenFinBus"),
            transportSettings: configUtil_1.ConfigUtilInstance.getDefault(finConfig, "finConfig.router.transportSettings", {}),
            IAC: configUtil_1.ConfigUtilInstance.getDefault(finConfig, "finConfig.IAC", {})
        };
        function getClientTransport() {
            Logger.system.debug("WINDOW LIFECYCLE:STARTUP:RouterClient:getClientTransport", "ROUTER PARAMS:", routerParams);
            if (transportNotSpecified) {
                transport = routerTransport_1.default.getRecommendedTransport(routerParams, incomingMessageHandler, clientName, "RouterService")
                    .then(transportReady)
                    .catch(errHandler);
            }
            else { // transport specified...typically only for regression testing
                transport = routerTransport_1.default.getTransport(routerParams, transportName, incomingMessageHandler, clientName, "RouterService")
                    .then(transportReady)
                    .catch(errHandler);
            }
        }
        function transportReady(transportObj) {
            myRetryCounter = 0;
            Logger.system.debug("WINDOW LIFECYCLE:STARTUP:RouterClient:transport ready", "TRANSPORT OBJECT", transportObj);
            transport = transportObj;
            handshakeHandler = finished; // set function to receive handshake response
            sendHandshake();
            myTimer = setInterval(sendHandshake, 200); // start time to retry if response not received back from router service
        }
        function handshakeFailedHandler() {
            clearInterval(myTimer);
            handshakeFailedCount++;
            if (handshakeFailedCount <= 3) {
                Logger.system.error("WINDOW LIFECYCLE:STARTUP:RouterClient: failure to connect to router service. Retrying...", handshakeFailedCount, routerParams);
                getClientTransport();
            }
            else {
                let failureMessage = `A cross domain transport has failed to connect. Cross domain components may not work. Please contact your administrator.`;
                Logger.system.error(failureMessage, routerParams);
                let notificationURL = configUtil_1.ConfigUtilInstance.getDefault(finConfig, "finConfig.notificationURL", finConfig.moduleRoot + "/components/system/notification/notification.html");
                userNotification_1.default.alert("dev", "ONCE-SINCE-STARTUP", "FSBL-Internal-Transport-Failure", failureMessage, { url: notificationURL });
            }
        }
        function sendHandshake() {
            Logger.system.debug("WINDOW LIFECYCLE:STARTUP:RouterClient: sendHandshake", myRetryCounter);
            sendToRouterService(new InitialHandshakeMessage());
            if (myRetryCounter++ > 50) {
                handshakeFailedHandler();
            }
        }
        function finished() {
            if (!isFinished) { // ensure only invoked once
                Logger.system.debug("WINDOW LIFECYCLE:STARTUP:RouterClient connected: Starting " + clientName + " with transport " + transport.identifier());
                isFinished = true;
                clearInterval(myTimer);
                if (queue) { // this should not happen with proper startup order, which waits on routerClient to be ready
                    for (var i = 0; i < queue.length; i++) {
                        Logger.system.debug("RouterClient: firing queued msg");
                        var msg = queue[i];
                        transport.send(msg);
                    }
                }
                // notify initialization is complete
                if (onReadyCallBack) {
                    onReadyCallBack();
                }
            }
        }
        function errHandler(errorMessage) {
            Logger.system.error("RouterClientError", errorMessage);
        }
        // main code for this asyncConnectToEventRouter function -- only executed once
        getClientTransport();
    }
    // provides unique id within one router client for queries
    function clientID() {
        return clientName + "." + (++Globals.FSBLData.clientIDCounter);
    }
    // returns true if this routerClient originated the message
    function originatedHere() {
        return this.header.origin === this.header.lastClient;
    }
    // invoke client callbacks in the input array (that are attached to a specific channel and listener type)
    function invokeListenerCallbacks(map, message) {
        var originalClientCallbackArray = map[message.header.channel] || [];
        var clientCallbackArray = [];
        if (!Array.isArray(originalClientCallbackArray) ||
            (originalClientCallbackArray.length === 0)) {
            Logger.system.warn("RouterClient: no listener for incoming transmit on channel " + message.header.channel + " from " + message.header.origin, message);
        }
        else {
            message.originatedHere = originatedHere; // add local function to test origin
            //@note, have to operate off of a copy because a callback may call removeListener, which will modify map[message.header.channel].
            originalClientCallbackArray.forEach(cb => {
                clientCallbackArray.push(cb);
            });
            for (var i = 0; i < clientCallbackArray.length; i++) { // for each callback defined for the channel
                if (!Logger.isLogMessage(message.header.channel)) { // logger messages
                    Logger.system.info("RouterClient: incoming transmit", "CHANNEL", message.header.channel, "FROM", message.header.origin, "MESSAGE", message);
                }
                clientCallbackArray[i](null, message); // invoke the callback; the error parameter is always null for this case
            }
        }
    }
    function sendQueryResponse(err, responseData) {
        //@todo consider removing this log. Why log it? Why not log it _only_ if the dev wants a particular message logged. This can cause problems.
        Logger.system.info("RouterClient: outgoing query response", "CHANNEL", this.header.channel, "RESPONSE DATA", responseData, "QUERY ID", this.header.queryID);
        sendToRouterService(new QueryResponseMessage(this.header.queryID, err, responseData));
    }
    // invoke responder-listener callback (attached to a specific channel)
    function invokeResponderCallback(map, queryMessage) {
        var responderCallback = map[queryMessage.header.channel];
        if (responderCallback === undefined) {
            Logger.system.warn("RouterClient: no query responder define on channel " + queryMessage.header.channel + " incoming from " + queryMessage.header.origin, queryMessage);
            responderCallback(null, queryMessage); // invoke the callback (no error), queryMessage);
        }
        else {
            if (!queryMessage.header.error) {
                queryMessage.originatedHere = originatedHere; // add local function to test origin
                queryMessage.sendQueryResponse = sendQueryResponse.bind(queryMessage); // add callback function to message so responder can respond to query
                Logger.system.info("RouterClient: incoming query", "CHANNEL", queryMessage.header.channel, "FROM", queryMessage.header.origin, "QUERY MESSAGE", queryMessage);
                responderCallback(null, queryMessage); // invoke the callback (no error)
            }
            else { // invoke the callback with error since  flag in message (from router service)
                Logger.system.warn("RouterClient: queryResponder error", queryMessage);
                responderCallback(queryMessage.header.error, null);
                delete map[queryMessage.header.channel]; // this is a bad responder (e.g. duplicate) so remove it
            }
        }
    }
    // add a callbackHandler into the query-response map for the given queryID
    function addQueryResponseCallBack(map, queryID, responseCallback) {
        map[queryID] = responseCallback;
    }
    // add timer to wait for query response
    function addQueryResponseTimeout(mapQueryResponseTimeOut, newQueryID, channel, timeout) {
        if (timeout > 0) {
            mapQueryResponseTimeOut[newQueryID] = setTimeout(function () {
                Logger.system.warn("RouterClient: timeout waiting on query response on channel " + channel + " for queryID " + newQueryID +
                    " on timer " + mapQueryResponseTimeOut[newQueryID] + " timeout=" + timeout);
            }, timeout);
        }
    }
    // delete timer waiting on query response (if it exists)
    function deleteQueryResponseTimeout(mapQueryResponseTimeOut, newQueryID) {
        var theTimer = mapQueryResponseTimeOut[newQueryID];
        if (theTimer !== undefined) {
            clearTimeout(theTimer);
        }
    }
    // invoke query-response callback (that is attached to a specific channel and listener type)
    function invokeQueryResponseCallback(map, responseMessage) {
        var clientCallback = map[responseMessage.header.queryID];
        if (clientCallback === undefined) {
            Logger.system.warn("RouterClient: no handler for incoming query response", "QUERY ID", responseMessage.header.queryID);
        }
        else {
            // delete any existing timer waiting on the response
            deleteQueryResponseTimeout(mapQueryResponseTimeOut, responseMessage.header.queryID);
            if (!responseMessage.header.error) {
                //@todo consider removing this log. Why log it? Why not log it _only_ if the dev wants a particular message logged. This can cause problems.
                Logger.system.info("RouterClient: incoming query response", "RESPONSE MESSAGE", responseMessage, "QUERY ID", responseMessage.header.queryID);
                clientCallback(null, responseMessage); // invoke the callback passing the response message
            }
            else {
                Logger.system.warn("RouterClient: incoming queryResponse error", responseMessage.header, "QUERY ID", responseMessage.header.queryID);
                clientCallback(responseMessage.header.error, responseMessage); // error from router service so pass it back instead of a message
            }
            delete map[responseMessage.header.queryID];
        }
    }
    // add responder callbackHandler for the given channel
    function addResponderCallBack(map, channel, callback) {
        var status = false;
        var clientCallback = map[channel];
        if (clientCallback === undefined) {
            map[channel] = callback;
            status = true;
        }
        return status;
    }
    // support function for sendNotifyToSubscriber -- maintains local list of subscribers for pubsub responder
    function addToPubSubListOfSubscribers(pubsubListOfSubscribers, topic, subscribeID) {
        if (!(topic in pubsubListOfSubscribers)) {
            pubsubListOfSubscribers[topic] = [subscribeID];
        }
        else {
            pubsubListOfSubscribers[topic].push(subscribeID);
        }
    }
    // support function for addPubSubResponder -- add pubsub responder callbackHandler for the given channel
    function addPubSubResponderCallBack(topic, subscribeCallback, publishCallback, unsubscribeCallback) {
        var status = false;
        var callbacks = mapPubSubResponders[topic.toString()];
        if (callbacks === undefined) {
            if (topic instanceof RegExp) {
                mapPubSubResponderRegEx[topic.toString()] = topic;
                Logger.system.info("RouterClient: PubSub RegEx added for topic " + topic.toString()); // Note: topic may be a RegEx, so use toString() where applicable
            }
            mapPubSubResponders[topic.toString()] = { "subscribeCallback": subscribeCallback, "publishCallback": publishCallback, "unsubscribeCallback": unsubscribeCallback };
            status = true;
        }
        return status;
    }
    // callback function for invokeSubscribePubSubCallback to notify new subscriber
    function sendNotifyToSubscriber(err, notifyData) {
        //@todo consider removing this log. Why log it? Why not log it _only_ if the dev wants a particular message logged. This can cause problems.
        sendToRouterService(new NotifyMessage(this.header.subscribeID, this.header.topic, err, notifyData));
        if (!err) {
            // add new subscriber to list
            addToPubSubListOfSubscribers(pubsubListOfSubscribers, this.header.topic, this.header.subscribeID);
            Logger.system.info("RouterClient: incoming subscription added", "TOPIC", this.header.topic, "MESSAGE", this);
        }
        else {
            Logger.system.warn("RouterClient: incoming subscription rejected by pubsub responder", "TOPIC", this.header.topic, "MESSAGE", this);
        }
    }
    // for incoming subscribe: invoke notify callback for pubsub responder
    function invokeSubscribePubSubCallback(subscribeMessage) {
        var callbacks = mapPubSubResponders[subscribeMessage.header.topic];
        //@todo consider removing this log. Why log it? Why not log it _onlY_ if the dev wants a particular message logged. This can cause problems.
        if (callbacks === undefined) { // if undefined then may be a matching RegEx topic
            for (var key in mapPubSubResponderRegEx) {
                if (mapPubSubResponderRegEx[key].test(subscribeMessage.header.topic)) {
                    callbacks = mapPubSubResponders[key];
                    var initialState = mapPubSubResponderState[subscribeMessage.header.topic]; // may already be initial state defined from publish
                    if (initialState === undefined) { // if there isn't already state defined then use default from regEx
                        initialState = mapPubSubResponderState[key]; // initialize the state from RegEx topic
                    }
                    mapPubSubResponderState[subscribeMessage.header.topic] = initialState;
                    break;
                }
            }
        }
        if (callbacks === undefined) { // if still undefined
            Logger.system.warn("RouterClient: no pubsub responder defined for incoming subscribe", subscribeMessage);
        }
        else {
            if (subscribeMessage.header.error) { // the router service uses the subscribe message in this case to return a pubsub error (ToDO: consider a generic error message)
                Logger.system.warn("RouterClient: pubsub error received from router service: " + JSON.stringify(subscribeMessage.header.error));
            }
            else {
                subscribeMessage.sendNotifyToSubscriber = sendNotifyToSubscriber; // add callback function to message so pubsub responder can respond with Notify message
                if (callbacks.subscribeCallback) {
                    subscribeMessage.data = mapPubSubResponderState[subscribeMessage.header.topic];
                    callbacks.subscribeCallback(null, subscribeMessage); // invoke the callback (no error)
                }
                else { // since no subscribe callback defined, use default functionality
                    subscribeMessage.sendNotifyToSubscriber(null, mapPubSubResponderState[subscribeMessage.header.topic]); // must invoke from message to set this properly
                }
            }
        }
    }
    // support function for removeSubscriber callback --  remove one subscribeID from array for the given subscription topic
    function removeFromPubSubListOfSubscribers(pubsubListOfSubscribers, topic, subscribeID) {
        var removed = false;
        if (topic in pubsubListOfSubscribers) {
            var list = pubsubListOfSubscribers[topic];
            for (var i = 0; i < list.length; i++) {
                if (subscribeID === list[i]) {
                    list.splice(i, 1);
                    if (list.length === 0) {
                        delete pubsubListOfSubscribers[topic];
                    }
                    removed = true;
                    Logger.system.info("RouterClient: PubSub removeListener", "TOPIC", topic, "FROM", subscribeID);
                    break;
                }
            }
        }
        if (!removed) {
            Logger.system.warn("RouterClient: tried to remove non-existent listener on " + topic + " from " + JSON.stringify(subscribeID));
        }
    }
    // callback function for invokeUnsubscribePubSubCallback to remove the subscriber from the subscription
    function removeSubscriber() {
        removeFromPubSubListOfSubscribers(pubsubListOfSubscribers, this.header.topic, this.header.subscribeID);
    }
    // for incoming unsubscribe: invoke unsubscribe callback for pubsub server
    function invokeUnsubscribePubSubCallback(unsubscribeMessage) {
        var callbacks = mapPubSubResponders[unsubscribeMessage.header.topic];
        if (callbacks === undefined) { // if undefined then may be a matching RegEx topic
            for (var key in mapPubSubResponderRegEx) {
                if (mapPubSubResponderRegEx[key].test(unsubscribeMessage.header.topic)) {
                    callbacks = mapPubSubResponders[key];
                    break;
                }
            }
        }
        if (callbacks === undefined) { // if still undefined
            Logger.system.warn("RouterClient: no pubsub responder defined for incoming unsubscribe", "TOPIC", unsubscribeMessage.header.topic, "UNSUBSCRIBE MESSAGE", unsubscribeMessage);
        }
        else {
            unsubscribeMessage.removeSubscriber = removeSubscriber; // add callback function to message for pubsub responder (but must always remove)
            if (callbacks.unsubscribeCallback) {
                Logger.system.info("RouterClient: incoming unsubscribe callback", "TOPIC", unsubscribeMessage.header.topic, "UNSUBSCRIBE MESSAGE", unsubscribeMessage);
                callbacks.unsubscribeCallback(null, unsubscribeMessage); // invoke the callback (no error)
            }
            else { // since no unsubscribe callback defined, use default functionality
                Logger.system.info("RouterClient: incoming unsubscribe", "TOPIC", unsubscribeMessage.header.topic, "UNSUBSCRIBE MESSAGE", unsubscribeMessage);
                unsubscribeMessage.removeSubscriber();
            }
        }
    }
    // callback function for invokePublishPubSubCallback to send Notify
    function sendNotifyToAllSubscribers(err, notifyData) {
        if (!err) {
            mapPubSubResponderState[this.header.topic] = notifyData; // store new state
            var listOfSubscribers = pubsubListOfSubscribers[this.header.topic];
            if (typeof (listOfSubscribers) !== "undefined") { // confirm subscribers to send to, if none then nothing to do
                for (var i = 0; i < listOfSubscribers.length; i++) {
                    Logger.system.info("RouterClient: sending pubsub notify", "TOPIC", this.header.topic, "NOTIFY DATA", notifyData);
                    sendToRouterService(new NotifyMessage(listOfSubscribers[i], this.header.topic, err, notifyData));
                }
            }
        }
        else {
            Logger.system.warn("RouterClient: income publish rejected by pubsub responder", err, notifyData);
        }
    }
    // for incoming Publish: invoke publish callback for pubsub server
    function invokePublishPubSubCallback(publishMessage) {
        var callbacks = mapPubSubResponders[publishMessage.header.topic];
        if (callbacks === undefined) { // if undefined then may be a matching RegEx topic
            for (var key in mapPubSubResponderRegEx) {
                if (mapPubSubResponderRegEx[key].test(publishMessage.header.topic)) {
                    callbacks = mapPubSubResponders[key];
                    break;
                }
            }
        }
        if (callbacks === undefined) { // if still undefined
            Logger.system.warn("RouterClient: no pubsub responder defined for incoming publish", "TOPIC", publishMessage.header.topic, "PUBLISH MESSAGE", publishMessage);
        }
        else {
            publishMessage.sendNotifyToAllSubscribers = sendNotifyToAllSubscribers; // add callback function to message so pubsub responder can respond to publish
            if (callbacks.publishCallback) {
                Logger.system.info("RouterClient: incoming PubSub publish callback invoked", "TOPIC", publishMessage.header.topic, "PUBLISH MESSAGE", publishMessage);
                callbacks.publishCallback(null, publishMessage); // invoke the callback (no error)
            }
            else { // since no publish callback defined, use default functionality
                Logger.system.info("RouterClient: incoming PubSub publish", "TOPIC", publishMessage.header.topic, "PUBLISH MESSAGE", publishMessage);
                publishMessage.sendNotifyToAllSubscribers(null, publishMessage.data); // must call from publish message (like a callback) so 'this' is properly set
            }
        }
    }
    // for incoming Notify: invoke notify callback (that are attached to a specific channel and listener type)
    function invokeNotifyCallback(mapSubscribersID, notifyMessage) {
        var notifyCallback = mapSubscribersID[notifyMessage.header.subscribeID];
        if (notifyCallback === undefined) {
            Logger.system.warn("RouterClient: no subscription handler defined for incoming notify for subscriberID", notifyMessage.header.subscribeID, notifyMessage);
        }
        else {
            if (!notifyMessage.header.error) {
                notifyMessage.originatedHere = originatedHere; // add local function to test origin
                Logger.system.info("RouterClient: incoming PubSub notify", "SUBSCRIBER ID", notifyMessage.header.subscribeID, "NOTIFY MESSAGE", notifyMessage);
                notifyCallback(null, notifyMessage); // invoke the callback passing the response message
            }
            else {
                Logger.system.info("RouterClient: incoming PubSub notify error for subscriberID", "SUBSCRIBER ID", notifyMessage.header.subscribeID, "NOTIFY MESSAGE", notifyMessage);
                notifyCallback(notifyMessage.header.error, notifyMessage); // error from router service so pass it back instead of a message
            }
        }
    }
    // outgoing Unsubscribe: remove subscriber callbackHandler for the given channel
    function removeSubscriberCallBack(mapSubscribersID, subscribeID) {
        var status = false;
        var notifyCallback = mapSubscribersID[subscribeID];
        if (notifyCallback !== undefined) {
            delete mapSubscribersID[subscribeID];
            status = true;
        }
        return status;
    }
    // for outgoing addSubscriber -- add a callback Handler for the subscribe
    function addSubscriberCallBack(mapSubscribersID, subscribeID, notifyCallback, topic) {
        mapSubscribersID[subscribeID] = notifyCallback;
        mapSubscribersTopic[subscribeID] = topic;
    }
    // for removePubSubResponder: remove responder callbackHandler for the given channel
    function removeResponderCallBack(map, channel) {
        var status = false;
        var clientCallback = map[channel];
        if (clientCallback !== undefined) {
            delete map[channel];
            status = true;
        }
        return status;
    }
    // for addListener: add a callbackHandler into the specified map (which depends on listener type) for the given channel
    function addListenerCallBack(map, channel, callback) {
        var firstChannelClient = false;
        var clientCallbackArray = map[channel];
        if (clientCallbackArray === undefined || clientCallbackArray.length === 0) {
            map[channel] = [callback];
            firstChannelClient = true;
        }
        else {
            clientCallbackArray.push(callback);
        }
        return firstChannelClient;
    }
    // for removeListener: remove a callbackHandler from the specified map (which depends on listener type) for the given channel
    function removeListenerCallBack(map, channel, callback) {
        var lastChannelClient = false;
        var clientCallbackArray = map[channel];
        if (clientCallbackArray !== undefined) {
            var index = clientCallbackArray.indexOf(callback);
            if (index > -1) {
                clientCallbackArray.splice(index, 1);
                if (clientCallbackArray.length === 0) {
                    lastChannelClient = true;
                }
            }
            else {
                Logger.system.warn("no listener defined for channel: " + channel);
            }
        }
        return lastChannelClient;
    }
    // route incoming message to appropriate callback, which depends on the message type and channel
    function routeIncomingMessage(incomingMessage) {
        Logger.system.verbose("Incoming Message Type", incomingMessage.header.type, incomingMessage);
        switch (incomingMessage.header.type) {
            case "transmit":
                invokeListenerCallbacks(mapListeners, incomingMessage);
                break;
            case "query":
                invokeResponderCallback(mapResponders, incomingMessage);
                break;
            case "queryResponse":
                invokeQueryResponseCallback(mapQueryResponses, incomingMessage);
                break;
            case "notify":
                invokeNotifyCallback(mapSubscribersID, incomingMessage);
                break;
            case "publish":
                invokePublishPubSubCallback(incomingMessage);
                break;
            case "subscribe":
                invokeSubscribePubSubCallback(incomingMessage);
                break;
            case "unsubscribe":
                invokeUnsubscribePubSubCallback(incomingMessage);
                break;
            case "timeCalibration":
                timeCalibrationHandler(incomingMessage);
                break;
            case "initialHandshakeResponse":
                handshakeHandler();
                break;
            default:
        }
    }
    // *** all incoming messages from underlying transport arrive here ***
    // although incoming transport information is available, it is not passed on because not needed
    function incomingMessageHandler(incomingTransportInfo, message) {
        // ToDo: good place to put a function to validate incoming message/data
        message.header.lastClient = clientName; // add last client for diagnostics
        message.header.incomingTransportInfo = incomingTransportInfo;
        routeIncomingMessage(message);
    }
    // *** all outbound messages exit here though the appropriate transport ***
    function sendToRouterService(message) {
        if (!transport || (transport instanceof Promise)) {
            Logger.system.warn("RouterClient: Queuing message since router initialization not complete", message);
            queue.push(message);
        }
        else {
            transport.send(message);
        }
    }
    /**
     * Estimates offset to align the reference time with Router Service.  Does this by exchanging messages with RouterService, getting the service's time, and estimating communication delay.
     *
     * @private
     */
    this.calibrateTimeWithRouterService = function (callback) {
        const TARGET_HANDSHAKE_COUNT = 5;
        var handshakeCounter = 0;
        var timeOffset;
        var offsetForFastest;
        var fastestRRT = Infinity;
        function calibrationCalculation(finalHandshakeMessage) {
            var timeOffset = 0;
            for (var i = 1; i < TARGET_HANDSHAKE_COUNT; i++) {
                var startClientTime = finalHandshakeMessage.clientBaseTime[i - 1];
                var stopClientTime = finalHandshakeMessage.clientBaseTime[i];
                var rtt = stopClientTime - startClientTime; // round-trip time
                var serviceTime = finalHandshakeMessage.serviceBaseTime[i - 1];
                var offset = serviceTime - (startClientTime + (rtt / 2));
                if (rtt < fastestRRT) {
                    fastestRRT = rtt;
                    offsetForFastest = offset;
                }
                timeOffset += offset;
                Logger.system.debug("calibrationCalculation Intermediate Values", "lastRRT", rtt, "lastOffset", offset, "fastestOffset", offsetForFastest, "fastestRRT", fastestRRT);
            }
            timeOffset /= (TARGET_HANDSHAKE_COUNT - 1);
            Logger.system.debug("RouterClient calibrationCalculation", "Average Offset", timeOffset, "Chosen FastestOffset", offsetForFastest, finalHandshakeMessage);
            callback(offsetForFastest); // use the offset with the shortest RTT since it is often the most accurate
        }
        function timeCalibrationHandlerFunction(message) {
            handshakeCounter++;
            if (handshakeCounter > TARGET_HANDSHAKE_COUNT) {
                calibrationCalculation(message); // enough handshake data gather, so do the calibration
            }
            else {
                message.clientBaseTime.push(Globals.performance.timing.navigationStart + Globals.performance.now());
                sendToRouterService(new TimeCalibrationHandshakeMessage(message.clientBaseTime, message.serviceBaseTime));
            }
        }
        timeCalibrationHandler = timeCalibrationHandlerFunction; // used in routeIncomingMessage to route handshake response back to handler
        timeCalibrationHandler(new TimeCalibrationHandshakeMessage([], [])); // invoke first time to start exchanging handshakes; will be invoked each time handshake message received back from RouterService
    };
    /**
     * Backward compatibility?
     * @private
     */
    this.ready = (cb) => this.onReady(cb);
    /**
 * Get router client name.
 *
 * @param {string} newClientName string identify the client
 * FSBL.Clients.RouterClient.setClientName("MyComponent");
 * @private
 */
    this.getClientName = function () {
        Logger.system.debug("RouterClient.getClientName", clientName);
        return clientName;
    };
    /////////////////////////////////////////////
    // Public Functions -- The Router Client API
    /////////////////////////////////////////////
    /**
     * Checks if router is ready. May be invoked multiple times. Invokes cb when ready, which may be immediately.  Router is not ready until underlying transport to router service is ready.
     *
     * @param {function} cb callback function to invoke when router is ready
     */
    this.onReady = function (cb) {
        validate_1.default.args(cb, "function");
        if (isRouterReady) {
            cb();
        }
        else {
            parentReadyCallbackQueue.push(cb);
        }
    };
    /**
     * Add listener for incoming transmit events on specified channel. Each of the incoming events will trigger the specified event handler. The number of listeners is not limited (either local to this Finsemble window or in a separate Finsemble window).
     *
     * See [transmit]{@link RouterClientConstructor#transmit} for sending a corresponding event message to listener. See [removeListener]{@link RouterClientConstructor#removeListener} to remove the listener.
     *
     * @param {string} channel any unique string to identify the channel (must match correspond transmit channel name)
     * @param {function} eventHandler function (see example below)
     * @example
     *
     * FSBL.Clients.RouterClient.addListener("SomeChannelName", function (error, response) {
     * 	if (error) {
     *			Logger.system.log("ChannelA Error: " + JSON.stringify(error));
     *		} else {
     *			var data = response.data;
     *			Logger.system.log("ChannelA Response: " + JSON.stringify(response));
     *		}
     * });
     *
     */
    this.addListener = function (channel, eventHandler) {
        Logger.system.info("RouterClient.addListener", "CHANNEL", channel);
        validate_1.default.args(channel, "string", eventHandler, "function");
        var firstChannelClient = addListenerCallBack(mapListeners, channel, eventHandler);
        if (firstChannelClient) {
            sendToRouterService(new AddListenerMessage(channel));
        }
    };
    /**
     * Transmit event to all listeners on the specified channel. If no listeners the event is discarded without error. All listeners to the channel in this Finsemble window and other Finsemble windows will receive the transmit.
     *
     * See [addListener]{@link RouterClientConstructor#addListener} to add a listener to receive the transmit.
     *
     * @param {string} toChannel any unique string to identify the channel (must match correspond listener channel name)
     * @param {any} event any object or primitive type to be transmitted
     * @param {object} [options] Options object for your transmit
     * @param {boolean} [options.suppressWarnings=false] By default, the Router will log warnings if you transmit to a channel with no listeners. Set this to true to eliminate those warnings.
     * @example
     *
     * FSBL.Clients.RouterClient.transmit("SomeChannelName", event);
     *
     */
    this.transmit = function (toChannel, event, options = { suppressWarnings: false }) {
        if (!Logger.isLogMessage(toChannel)) { // logger messages
            Logger.system.info("RouterClient.transmit", "TO CHANNEL", toChannel, "EVENT", event);
        }
        validate_1.default.args(toChannel, "string", event, "any");
        sendToRouterService(new TransmitMessage(toChannel, event, options));
    };
    /* @TODO - This works via object reference - it relies on the physical pointer to the function object originally passed in.
    This is very confusing, and not idiomatic. Moreover, it entirely prevents a user from using anonymous functions, which will fall
    quite unexpected if the user isn't prepared. A better API would be to pass in some unique ID, or have a unique ID automatically generated,
    that could then be passed to this function, e.g:

    RouterClient.addListener('some-channel', 'my-unique-listener-id', () => { });
    RouterClient.removeListener('some-channel', 'my-unique-listener-id');*/
    /**
     * Remove event listener from specified channel for the specific event handler (only listeners created locally can be removed).
     *
     * See [addListener]{@link RouterClientConstructor#addListener} for corresponding add of a listener.
     *
     * @param {string} channel unique channel name to remove listener from
     * @param {function} eventHandler function used for the event handler when the listener was added
     */
    this.removeListener = function (channel, eventHandler) {
        Logger.system.info("RouterClient.removeListener", "CHANNEL", channel, "EVENT HANDLER", eventHandler);
        validate_1.default.args(channel, "string", eventHandler, "function");
        var lastChannelListener = removeListenerCallBack(mapListeners, channel, eventHandler);
        if (lastChannelListener) {
            sendToRouterService(new RemoveListenerMessage(channel));
        }
    };
    /**
     * Add a query responder to the specified channel. The responder's queryEventHander function will receive all incoming queries for the specified channel (whether from this Finsemble window or remote Finsemble windows).
     *
     * *Note:* Only one responder is allowed per channel within the Finsemble application.
     *
     * See [query]{@link RouterClientConstructor#query} for sending a corresponding query-event message to this responder.
     *
     * @param {string} channel any unique string to identify the channel (must match correspond query channel name); only one responder allowed per channel
     * @param {function} queryEventHandler function to handle the incoming query (see example below); note incoming queryMessage contains function to send response
     * @example
     *
     * FSBL.Clients.RouterClient.addResponder("ResponderChannelName", function (error, queryMessage) {
     *	if (error) {
     *		Logger.system.log('addResponder failed: ' + JSON.stringify(error));
     *	} else {
     *	console.log("incoming data=" + queryMessage.data);
     * 	var response="Back at ya"; // Responses can be objects or strings
     *	queryMessage.sendQueryResponse(null, response); // A QUERY RESPONSE MUST BE SENT OR THE REMOTE SIDE WILL HANG
     *	}
     * });
     *
     */
    this.addResponder = function (channel, queryEventHandler) {
        Logger.system.info("RouterClient.addResponder", "CHANNEL", channel);
        validate_1.default.args(channel, "string", queryEventHandler, "function");
        var status = addResponderCallBack(mapResponders, channel, queryEventHandler);
        if (status) {
            sendToRouterService(new addResponderMessage(channel));
        }
        else {
            Logger.system.warn("RouterClient.addResponder: Responder already locally defined for channel " + channel);
            queryEventHandler({
                "RouteClient QueryError": "Responder already locally defined for channel" + channel
            }, null); // immediately invoke callback passing error
        }
    };
    /**
     * Send a query to responder listening on specified channel. The responder may be in this Finsemble window or another Finsemble window.
     *
     * See [addResponder]{@link RouterClientConstructor#addResponder} to add a responder to receive the query.
     *
     * @param {string} responderChannel a unique string that identifies the channel (must match the channel name on which a responder is listening)
     * @param {object} queryEvent event message sent to responder
     * @param {any} params optional params
     * @param {number} [params.timeout=20000]  timeout value for a query-response timer.  Timer defaults to 5000 milliseconds if no params value is passed in. Set timeout to zero to wait indefinitely. If the timer expires, this function call will return with an error.
     * @param {function} responseEventHandler event handler to receive the query response (sent from a responder that is listening on this channel)
     *
     * @example
     *
     * FSBL.Clients.RouterClient.query("someChannelName", {}, function (error, queryResponseMessage) {
     *	if (error) {
     *		Logger.system.log('query failed: ' + JSON.stringify(error));
     *	} else {
     *		// process income query response message
     *		var responseData = queryResponseMessage.data;
     *		Logger.system.log('query response: ' + JSON.stringify(queryResponseMessage));
     *	}
     * });
     *
     * FSBL.Clients.RouterClient.query("someChannelName", { queryKey: "abc123"}, { timeout: 1000 }, function (error, queryResponseMessage) {
     *	if (!error) {
     *		// process income query response message
     *		var responseData = queryResponseMessage.data;
     *	}
     * }); */
    this.query = function (responderChannel, queryEvent, params, responseEventHandler = Function.prototype) {
        var newQueryID = `${clientID()}.${responderChannel}`;
        var timestamp = window.performance.timing.navigationStart + window.performance.now();
        var navstart = window.performance.timing.navigationStart;
        var timenow = window.performance.now(); // these timer values used for logging diagnostics
        Logger.system.info("RouterClient.query", "RESPONDER CHANNEL", responderChannel, "QUERY EVENT", queryEvent, "PARAMS", params, "QUERY ID", newQueryID, { timestamp, navstart, timenow });
        if (arguments.length === 3) {
            responseEventHandler = params;
            params = { timeout: 20000 };
        }
        validate_1.default.args(responderChannel, "string", queryEvent, "any=", params, "object=", responseEventHandler, "function");
        params = params || {};
        validate_1.default.args2("params.timeout", params.timeout, "number");
        function promiseResolver(resolve) {
            //Allows us to await on queries, cleaning up code quite a bit.
            const modifiedHandler = (err, response) => {
                resolve({ err, response });
                if (typeof responseEventHandler === "function") {
                    responseEventHandler(err, response);
                }
                else {
                    Logger.system.warn("No response event handler passed to RouterClient.query", "RESPONDER CHANNEL", responderChannel, "QUERY EVENT", queryEvent, "PARAMS", params, "QUERY ID", newQueryID, { timestamp, navstart, timenow });
                }
            };
            addQueryResponseCallBack(mapQueryResponses, newQueryID, modifiedHandler);
            addQueryResponseTimeout(mapQueryResponseTimeOut, newQueryID, responderChannel, params.timeout);
            sendToRouterService(new QueryMessage(newQueryID, responderChannel, queryEvent));
        }
        return new Promise(promiseResolver);
    };
    /**
     * Remove query responder from specified channel. Only a locally added responder can be removed (i.e. a responder defined in the same component or service).
     *
     * See [addResponder]{@link RouterClientConstructor#addResponder} for corresponding add of a query responder.
     *
     * @param {string} responderChannel string identifying the channel to remove responder from
     *
     * @example
     *
     * FSBL.Clients.RouterClient.removeResponder("someChannelName");
     *
     */
    this.removeResponder = function (responderChannel) {
        Logger.system.info("RouterClient.removeResponder", "RESPONDER CHANNEL", responderChannel);
        validate_1.default.args(responderChannel, "string");
        var status = removeResponderCallBack(mapResponders, responderChannel);
        if (status) {
            sendToRouterService(new RemoveResponderMessage(responderChannel));
        }
    };
    /**
     * Add a PubSub responder for specified topic. All subscribes and publishes to the topic will comes to responder (whether from local window or another window). Only one PubSub responder allowed per topic value in Finsemble application; however, the topic value may be a regular-expression representing a set of related topics, in which case the PubSub responder will responder to all matching topics. When a regEx topic is used, the same default functionality is provides for each matching topic -- the difference is only one PubSub responder is needed to cover a set of related topics, plus the same callback handlers can be used (if provided).
     *
     * All the callback function are optional because each PubSub responder comes with build-in default functionality (described below).
     *
     * Note an exact topic match will take precedence over a regEx match, but otherwise results are unpredictable for overlapping RegEx topics.
     *
     * See [subscribe]{@link RouterClientConstructor#subscribe} and [publish]{@link RouterClientConstructor#publish} for corresponding functions sending to the PubSub responder.
     *
     * @param {string} topic unique topic for this responder, or a topic RegEx (e.g. '/abc.+/') to handle a set of topics
     * @param {object} [initialState] initial state for the topic (defaults to empty struct); can be any object
     * @param {object} [params] optional parameters
     * @param {function} [params.subscribeCallback] allows responder know of incoming subscription and accept or reject it (default is to accept)
     * @param {function} [params.publishCallback] allows responder to use the publish data to form a new state (default is the publish data becomes the new state)
     * @param {function} [params.unsubscribeCallback] allows responder to know of the unsubscribe, but it must be accepted (the default accepts)
     * @param {function} [callback] optional callback(err,res) function. If addPubSubResponder failed then err set; otherwise, res set to "success"
     *
     * @example
     *
     * function subscribeCallback(error, subscribe) {
     * 	if (subscribe) {
     * 		// must make this callback to accept or reject the subscribe (default is to accept). First parm is err and second is the initial state
     * 		subscribe.sendNotifyToSubscriber(null, { "NOTIFICATION-STATE": "One" });
     * 	}
     * }
     * function publishCallback(error, publish) {
     * 	if (publish) {
     * 		// must make this callback to send notify to all subscribers (if error parameter set then notify will not be sent)
     * 		publish.sendNotifyToAllSubscribers(null, publish.data);
     * 	}
     * }
     * function unsubscribeCallback(error, unsubscribe) {
     * 	if (unsubscribe) {
     * 		// must make this callback to acknowledge the unsubscribe
     * 		unsubscribe.removeSubscriber();
     * 	}
     * }
     * FSBL.Clients.RouterClient.addPubSubResponder("topicABC", { "State": "start" },
     * 	{
     * 		subscribeCallback:subscribeCallback,
     * 		publishCallback:publishCallback,
     * 		unsubscribeCallback:unsubscribeCallback
     * 	});
     *
     *   or
     *
     * FSBL.Clients.RouterClient.addPubSubResponder("topicABC", { "State": "start" });
     *
     *   or
     *
     * FSBL.Clients.RouterClient.addPubSubResponder(\/topicA*\/, { "State": "start" });
     *
     */
    this.addPubSubResponder = function (topic, initialState, params, callback) {
        var error;
        var response;
        Logger.system.info("RouterClient.addPubSubResponder", "TOPIC", topic, "INITIAL STATE", initialState, "PARAMS", params);
        validate_1.default.args(topic, "any", initialState, "object=", params, "object=");
        params = params || {};
        validate_1.default.args2("params.subscribeCallback", params.subscribeCallback, "function=", "params.publishCallback", params.publishCallback, "function=") &&
            validate_1.default.args2("params.unsubscribeCallback", params.unsubscribeCallback, "function=");
        var status = addPubSubResponderCallBack(topic, params.subscribeCallback, params.publishCallback, params.unsubscribeCallback);
        if (status) {
            initialState = initialState || {};
            mapPubSubResponderState[topic.toString()] = Utils.clone(initialState);
            sendToRouterService(new AddPubSubResponderMessage(topic.toString()));
            response = "success";
        }
        else {
            error = "RouterClient.addPubSubResponder: Responder already locally defined for topic " + topic;
            Logger.system.warn(error);
        }
        if (callback) {
            callback(error, response);
        }
    };
    /**
     * Remove pubsub responder from specified topic. Only locally created responders (i.e. created in local window) can be removed.
     *
     * See [addPubSubResponder]{@link RouterClientConstructor#addPubSubResponder} for corresponding add of a SubPub responder.
     *
     * @param {string} topic unique topic for responder being removed (may be RegEx, but if so much be exact regEx used previously with addPubSubResponder)
     *
     * @example
     *
     * FSBL.Clients.RouterClient.removePubSubResponder("topicABC");
     *
     */
    this.removePubSubResponder = function (topic) {
        Logger.system.info("RouterClient.removePubSubResponder", "TOPIC", topic);
        validate_1.default.args(topic, "any");
        var status = removeResponderCallBack(mapPubSubResponders, topic);
        if (status) {
            delete mapPubSubResponderState[topic.toString()]; // remove corresponding state
            delete mapPubSubResponderRegEx[topic.toString()]; // may be a RegEx
            sendToRouterService(new RemovePubSubResponderMessage(topic));
        }
        else {
            Logger.system.warn("RouterClient.removePubSubResponder failed: Could not find responder for topic " + topic);
        }
    };
    /**
     * Subscribe to a PubSub Responder. Each responder topic can have many subscribers (local in this window or remote in other windows). Each subscriber immediately (but asynchronously) receives back current state in a notify; new notifications are receive for each publish sent to the same topic.
     *
     * See [addPubSubResponder]{@link RouterClientConstructor#addPubSubResponder} for corresponding add of a SubPub responder to handle the subscribe. See [publish]{@link RouterClientConstructor#publish} for corresponding publish to notify the subscriber.
     *
     * @param {string} topic topic being subscribed to
     * @param {function} notifyCallback invoked for each income notify for the given topic (i.e. initial notify plus for each publish)
     * @returns {object} subscribe-id optionally used for unsubscribing later
     *
     * @example
     *
     * var subscribeId = RouterClient.subscribe("topicABC", function(err,notify) {
     *		if (!err) {
     *			var notificationStateData = notify.data;
     *			// do something with notify data
     *  	}
     * });
     *
     */
    this.subscribe = function (topic, notifyCallback) {
        Logger.system.info("RouterClient.subscribe", "TOPIC", topic);
        validate_1.default.args(topic, "string", notifyCallback, "function");
        var subscribeID = clientID();
        addSubscriberCallBack(mapSubscribersID, subscribeID, notifyCallback, topic);
        sendToRouterService(new SubscribeMessage(subscribeID, topic));
        return { "subscribeID": subscribeID, "topic": topic };
    };
    /**
     * Publish to a PubSub Responder, which will trigger a corresponding Notify to be sent to all subscribers (local in this window or remote in other windows). There can be multiple publishers for a topic (again, in same window or remote windows)
     *
     * See [addPubSubResponder]{@link RouterClientConstructor#addPubSubResponder} for corresponding add of a SubPub responder to handle the publish (i.e. sending notifications to all subscriber). See [Subscribe]{@link RouterClientConstructor#addPubSubResponder} for corresponding subscription to receive publish results (in the form of a notify event)
     *
     * @param {string} topic topic being published to
     * @param {object} event topic state to be published to all subscriber (unless the SubPub responder optionally modifies in between)
     *
     * @example
     *
     * FSBL.Clients.RouterClient.publish("topicABC", topicState);
     *
     */
    this.publish = function (topic, event) {
        Logger.system.info("RouterClient.publish", "TOPIC", topic, "EVENT", event);
        validate_1.default.args(topic, "string", event, "any");
        sendToRouterService(new PublishMessage(topic, event));
    };
    /**
     * Unsubscribe from PubSub responder so no more notifications received (but doesn't affect other subscriptions). Only works from the window the PubSub responder was created in.
     *
     * See [subscribe]{@link RouterClientConstructor#subscribe} for corresponding subscription being removed.
     *
     * @param {object} subscribeID the id return from the corresponding subscribe for the topic
     *
     * @example
     *
     * FSBL.Clients.RouterClient.unsubscribe(subscribeId);
     *
     */
    this.unsubscribe = function (subscribeIDStruct) {
        Logger.system.info("RouterClient.unsubscribe", "SUBSCRIBE ID", subscribeIDStruct);
        validate_1.default.args(subscribeIDStruct, "object") && validate_1.default.args2("subscribeIDStruct.subscribeID", subscribeIDStruct.subscribeID, "string");
        var deletedSubscriber = removeSubscriberCallBack(mapSubscribersID, subscribeIDStruct.subscribeID);
        if (deletedSubscriber) {
            sendToRouterService(new UnsubscribeMessage(subscribeIDStruct.subscribeID, subscribeIDStruct.topic));
        }
        else {
            Logger.system.warn("RouterClient.unsubscribe: Could not find subscribeID for topic " + subscribeIDStruct.topic);
        }
    };
    /**
     * Test an incoming router message to see if it originated from the same origin (e.g. a trusted source...not cross-domain). Currently same origin is known only because a sharedWorker transport is used (by definition SharedWorkers do not work cross-domain).  This means any message coming in over the Inter-application Bus will not be trusted; however, by default all same-origin components and services connect to the router using a SharedWorker transport.
     * @param {object} incomingMessage an incoming router message (e.g. transmit, query, notification) to test to see if trusted.
     *
     * @example
     * FSBL.Clients.RouterClient.trustedMessage(incomingRouterMessage);
     */
    this.trustedMessage = function (incomingMessage) {
        var isTrusted = true; // temporarily make all trusted so no problems if changing router transport
        Logger.system.debug("RouterClient.trustedMessage header", incomingMessage.header);
        if (incomingMessage.header.originIncomingTransportInfo.transportID === "SharedWorker") {
            isTrusted = true;
        }
        return isTrusted;
    };
    /*
     * @TODO: consider adding disconnectAllListeners(), disconnectAllResponders(), disconnectAllSubscribers()
    */
    /**
     * Removes all listeners, responders, and subscribers for this router client -- automatically called when client is shutting down. Can be called multiple times.
     */
    this.disconnectAll = function () {
        Logger.system.info("RouterClient.disconnectAll");
        for (var channel in mapListeners) {
            Logger.system.debug("RouterClient.disconnectAll is removing listener on " + channel);
            sendToRouterService(new RemoveListenerMessage(channel));
            delete mapListeners[channel];
        }
        for (var responderChannel in mapResponders) {
            Logger.system.debug("RouterClient.disconnectAll is removing responder on " + responderChannel);
            sendToRouterService(new RemoveResponderMessage(responderChannel));
            delete mapResponders[responderChannel];
        }
        for (var topic in mapPubSubResponders) {
            Logger.system.debug("RouterClient.disconnectAll is removing pubsub responder on " + topic);
            sendToRouterService(new RemovePubSubResponderMessage(topic));
            delete mapPubSubResponders[topic.toString()]; // could be a RegEx
            delete mapPubSubResponderState[topic.toString()]; // remove corresponding state
            delete mapPubSubResponderRegEx[topic.toString()]; // may be a RegEx
        }
        for (var subscribeID in mapSubscribersID) {
            var stopic = mapSubscribersTopic[subscribeID];
            Logger.system.debug("RouterClient.disconnectAll is removing subscriber on " + stopic);
            sendToRouterService(new UnsubscribeMessage(subscribeID, stopic));
            delete mapSubscribersID[subscribeID];
            delete mapSubscribersTopic[subscribeID];
        }
    };
    //Prevent the loggerService window's routerClient from logging to itself. Instead, log locally for it. It's unlikely that we need to get the loggerService's router messages. If we do, just un-comment this.
    if (system_1.System.Window.getCurrent().name === "loggerService") {
        Logger = new localLogger_1.LocalLogger();
    }
    clientName = baseClientName + "." + Globals.name;
    /** @TODO - Move this to factory function, something like getRouterClient. */
    if (clientName in Globals.FSBLData.RouterClients) { // if previously constructed then return that existing client
        Logger.system.debug(`"RouterClient Check: reusing existing client for ${clientName}`);
        console.debug(`"RouterClient Check: reusing existing client for ${clientName}`, Globals);
    }
    else {
        Logger.system.debug(`"RouterClient Check: constructing new client for ${clientName}`);
        console.debug(`"RouterClient Check: constructing new client for ${clientName}`, Globals);
        Globals.FSBLData.RouterClients[clientName] = this;
        constructor(clientName, transportName); // constructor new router client
    }
    return Globals.FSBLData.RouterClients[clientName];
};

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ }),

/***/ 29:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, module) {/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

/**
 * @introduction
 * <h2>Finsemble system wide settings for use by all components and services</h2>
 *
 */

/**
 * Constructor for Finsemble SystemSettings
 * @private
 * @constructor
 */
var SystemSettings = function () {
	var currentDiagLevel = 3;

	/**
  * Returns diagnostic level
  *
  *@returns current diagnostic level
  */
	this.diagLevel = function () {
		return currentDiagLevel;
	};

	/**
  * Returns diagnostic level
  *
  *@returns current diagnostic level
  */
	this.setDiagLevel = function (level) {
		currentDiagLevel = level;
	};

	/**
  * Returns true if parameter validation is enabled
  *
  *@returns true if enable
  */
	this.validationEnabled = function () {
		return currentDiagLevel >= 4;
	};
};

/* harmony default export */ __webpack_exports__["a"] = (new SystemSettings());

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\common\\systemSettings.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\common\\systemSettings.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),

/***/ 3:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {
Object.defineProperty(exports, "__esModule", { value: true });
/** The global `window` object. We cast it to a specific interface here to be
 * explicit about what Finsemble-related properties it may have.*/
const Globals = 
/** In our testing environments (i.e, mocha running in node.js),
 * `window` is not defined. Therefore, we have to check that `window`
 * exists; otherwise, in node, `process` is the global context.
 */
typeof window !== "undefined" ?
    window
    : process;
class SystemWindow {
    constructor(params, cb, errCb) {
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
    constructor(params, cb, errCb) {
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
class System {
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
            if (mousePosition.left || mousePosition.left === 0)
                mousePosition.x = mousePosition.left;
            if (mousePosition.top || mousePosition.top === 0)
                mousePosition.y = mousePosition.top;
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
                if (timeoutCleared)
                    return;
                console.log("Attempting to terminate", app.uuid);
                app.terminate(() => {
                    cb();
                    resolve();
                }, () => {
                    if (timeoutCleared)
                        return;
                    timeoutCleared = true;
                    clearInterval(t);
                    // If closing fails, force close
                    console.log("force closing ", app.uuid);
                    app.terminate();
                });
            };
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
        };
        return new Promise(promiseResolver);
    }
}
exports.System = System;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ }),

/***/ 30:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, process) {(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4), __webpack_require__(1)))

/***/ }),

/***/ 31:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {var scope = (typeof global !== "undefined" && global) ||
            (typeof self !== "undefined" && self) ||
            window;
var apply = Function.prototype.apply;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, scope, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, scope, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) {
  if (timeout) {
    timeout.close();
  }
};

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(scope, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// setimmediate attaches itself to the global object
__webpack_require__(30);
// On some exotic environments, it's not clear which object `setimmediate` was
// able to install onto.  Search each possibility in the same order as the
// `setimmediate` library.
exports.setImmediate = (typeof self !== "undefined" && self.setImmediate) ||
                       (typeof global !== "undefined" && global.setImmediate) ||
                       (this && this.setImmediate);
exports.clearImmediate = (typeof self !== "undefined" && self.clearImmediate) ||
                         (typeof global !== "undefined" && global.clearImmediate) ||
                         (this && this.clearImmediate);

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ }),

/***/ 32:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
const dependencyManager_1 = __webpack_require__(14);
const routerClientInstance_1 = __webpack_require__(5);
const logger_1 = __webpack_require__(0);
const async_1 = __webpack_require__(9);
const system_1 = __webpack_require__(3);
const Constants = __webpack_require__(11);
const { SERVICE_INITIALIZING_CHANNEL, SERVICE_READY_CHANNEL, SERVICE_CLOSING_CHANNEL, SERVICE_CLOSED_CHANNEL, SERVICE_STOP_CHANNEL } = Constants;
const defaultBaseServiceParams = {
    startupDependencies: {
        services: [],
        clients: []
    },
    shutdownDependencies: {
        services: []
    },
    addOFWrapper: false,
    name: window.name
};
/*
 * @introduction
 * <h2>Base Service</h2>
 * Creates an instance of the Base Service which all service must inherit. Services are spawned from your *service.json* file and managed by a helper thread - the **Service Manager**.
 * Services communicate their status and receive status of other service through the Service Manager.
 * Services have an initial handshake with the Service Manager on load, and then either go online or wait for dependant services to come online.
 * Service initialization is completely asynchronous, which allows all services to load at the same time, as long as their dependencies have been met.
 * @constructor
*/
class BaseService {
    constructor(params = defaultBaseServiceParams) {
        fixParams(params);
        this.name = params.name ? params.name : window.name;
        this.startupDependencies = params.startupDependencies;
        this.shutdownDependencies = params.shutdownDependencies;
        this.Logger = logger_1.default;
        this.RouterClient = routerClientInstance_1.default;
        //This will be set to true after the debugServiceDelay is met. Defaults to 0, but developers can up it if they need to jump in and add breakpoints and are on a bad computer.
        this.waitedLongEnough = false;
        //this.parentUuid = System.Application.getCurrent().uuid;
        this.onBaseServiceReadyCB = null;
        this.setOnConnectionCompleteCB = null;
        this.listeners = {};
        this.start = this.waitForDependencies;
        this.started = false;
        /**
         * Service status
         * @type {ServiceState}
         */
        this.status = "initializing";
        this.setOnline = this.setOnline.bind(this);
        this.onBaseServiceReady = this.onBaseServiceReady.bind(this);
        this.handleShutdown = this.handleShutdown.bind(this);
        this.waitForDependencies();
    }
    /**
    * Waits for the dependencies. At the end of this function, it will trigger the child service's initialize function (or onBaseServiceReady).
    * @note This used to be BaseService.start
    * @private
    */
    waitForDependencies() {
        //For backwards compat. note Start used to be invoked after the constructor.
        //note do this later
        if (this.started)
            return;
        this.started = true;
        var service = this;
        logger_1.default.system.debug(`${this.name} starting`);
        function cacheCustomData(done) {
            logger_1.default.system.debug("BaseService.start.setParentUUID");
            system_1.System.Window.getCurrent().getOptions((opts) => {
                service.customData = opts.customData;
                service.parentUuid = opts.customData.parentUuid;
                done();
            });
        }
        function onRouterReady(done) {
            routerClientInstance_1.default.onReady(function () {
                routerClientInstance_1.default.transmit(SERVICE_INITIALIZING_CHANNEL, { name: service.name });
                window.addEventListener("beforeunload", service.RouterClient.disconnectAll);
                logger_1.default.system.debug("APPLICATION LIFECYCLE:STARTUP:SERVICE:BaseService.start.onRouterReady");
                done();
            });
        }
        function readyToGo(done) {
            logger_1.default.system.debug("APPLICATION LIFECYCLE:STARTUP:SERVICE:BaseService.start.readyToGo");
            console.log(performance.now(), "ReadyToGo called");
            console.log("Startup Dependencies for", service.name, service.startupDependencies);
            console.log("Shutdown Dependencies for", service.name, service.shutdownDependencies);
            service.waitedLongEnough = true;
            dependencyManager_1.FSBLDependencyManagerSingleton.shutdown.waitFor(service.shutdownDependencies, service.handleShutdown);
            routerClientInstance_1.default.transmit(`${system_1.System.Window.getCurrent().name}.onSpawned`, {});
            //`done` invoked when all dependencies are up
            let dependency = dependencyManager_1.FSBLDependencyManagerSingleton.startup.waitFor(service.startupDependencies, done);
            dependency.on("err", (err) => {
                logger_1.default.system.error(err);
            });
        }
        function showDeveloperTools(done) {
            const myWindow = system_1.System.Window.getCurrent();
            myWindow.isShowing((isShowing) => {
                if (isShowing && service.customData.showDevConsoleOnVisible !== false) {
                    system_1.System.showDeveloperTools(myWindow.uuid, myWindow.name, done);
                }
                else {
                    logger_1.default.system.debug("APPLICATION LIFECYCLE:STARTUP:SERVICE:BaseService.start.delayStartup done");
                    done();
                }
            });
        }
        return new Promise((resolve, reject) => {
            async_1.series([
                onRouterReady,
                cacheCustomData,
                showDeveloperTools,
                readyToGo
            ], () => {
                resolve();
                this.onDependenciesReady();
            });
        });
    }
    /**
     * Transmits the serviceOnline message that the rest of the dependency manager objects system are listening for.
     */
    setOnline() {
        if (this.status !== "ready") {
            console.log("Setting service online", this.name);
            logger_1.default.system.log("APPLICATION LIFECYCLE:STARTUP:SERVICE ONLINE", this.name);
            routerClientInstance_1.default.transmit(SERVICE_READY_CHANNEL, { serviceName: this.name }); // notify service manager
            this.RouterClient.addListener(SERVICE_STOP_CHANNEL + "." + this.name, (err, response) => {
                this;
                dependencyManager_1.FSBLDependencyManagerSingleton.shutdown.checkDependencies();
            });
            this.status = "ready";
        }
    }
    /**
     * Invokes a method passed in (or on) the object that inherits from the BaseService. In other words, the service instance will have its initialize function called, unless it's using old code, in which case we will have cached the callback earlier.
     */
    onDependenciesReady() {
        logger_1.default.system.debug("APPLICATION LIFECYCLE:STARTUP:BaseService onDependenciesReady", this.name);
        this.status = "initializing"; // must change from offline here; otherwise race condition waiting to call this.setOnline
        routerClientInstance_1.default.onReady(() => {
            //These first two blocks are for backward compatibility. The 3rd (initialize) is how it should be done.
            if (this.onBaseServiceReadyCB) {
                // if inheriting service provided a "connection complete" callback, then invoke before sending online
                this.onBaseServiceReadyCB(this.setOnline);
            }
            else if (this.initialize) {
                this.initialize(this.setOnline);
            }
            else {
                //otherwise setOnline need sto be called manually.
                setTimeout(() => {
                    if (this.status !== "ready" && this.name !== "routerService") {
                        console.error("No onBaseServiceReadyCB on initialize function defined on your service. Ensure that service.setOnline is called");
                        logger_1.default.system.error("No onBaseServiceReadyCB on initialize function defined on your service. Ensure that service.setOnline is called");
                    }
                }, 3000);
            }
        });
    }
    onBaseServiceReady(func) {
        if (this.status === "initializing") {
            //onBaseServiceReady is backwards-compatibility stuff.
            this.onBaseServiceReadyCB = () => {
                func(this.setOnline);
            };
        }
        else {
            func(this.setOnline);
        }
    }
    /**
     * Really only for shutdown right now. Simple array that gets looped through on shutdown.
     * @param {string} listenerType
     * @param {function} callback
     */
    addEventListener(listenerType, callback) {
        if (!this.listeners[listenerType]) {
            this.listeners[listenerType] = [];
        }
        this.listeners[listenerType].push(callback);
    }
    /**
     * When the application sends out a shutdown message, this function is invoked. It iterates through any registered cleanup methods. When all of them have finished (or 10 seconds elapses), it sends a response to the application saying that it's completed cleanup (`shutdownComplete`, below).
     * @private
    */
    onShutdown(cb) {
        this.addEventListener("onShutdown", cb);
    }
    /**
     * When the application sends out a shutdown message, this function is invoked. It iterates through any registered cleanup methods. When all of them have finished (or 10 seconds elapses), it sends a response to the application saying that it's completed cleanup (`shutdownComplete`, below).
     * @private
    */
    handleShutdown(err, message) {
        var self = this;
        function handleShutdownAction(handler, done) {
            let cleanup = async_1.asyncify(handler);
            cleanup = async_1.timeout(cleanup, 10000); // services may need some time to cleanup (depends on service)
            cleanup(null, done);
        }
        function shutdownComplete(err, data) {
            if (err) {
                logger_1.default.system.error(err);
            }
            self.shutdownComplete();
        }
        if (this.listeners.onShutdown) {
            routerClientInstance_1.default.transmit(SERVICE_CLOSING_CHANNEL, {
                waitForMe: true,
                name: this.name
            });
            async_1.each(this.listeners.onShutdown, handleShutdownAction, shutdownComplete);
        }
        else {
            routerClientInstance_1.default.transmit(SERVICE_CLOSING_CHANNEL, {
                waitForMe: false,
                name: this.name
            });
            self.shutdownComplete();
        }
    }
    /**
     * Fired when all cleanup methods have been finished.
     * @private
    */
    shutdownComplete() {
        logger_1.default.system.info(`"APPLICATION LIFECYCLE:SHUTDOWN:SERVICE SHUTDOWN: ${this.name}`);
        routerClientInstance_1.default.transmit(SERVICE_CLOSED_CHANNEL, {
            name: this.name,
            uuid: system_1.System.Application.getCurrent().uuid
        });
    }
}
exports.BaseService = BaseService;
// ensures all service errors will be caught
window.addEventListener("error", function (errorObject) {
    var stack = errorObject.error ? errorObject.error.stack.substring(errorObject.error.stack.search("at ")) : ""; // strip off irrelevant part of stack
    logger_1.default.error(errorObject.message, "File: " + errorObject.filename, "Line: " + errorObject.lineno, "Column: " + errorObject.colno, "Error Stack: \n    " + stack);
    return false;
});
//catch promise errors
window.addEventListener("unhandledrejection", function (event) {
    if (event.reason == "Cannot Wrap Service Manager or Services") {
        logger_1.default.warn("A service tried To wrap itself. This is a side effect of using Clients in services.");
    }
    else {
        logger_1.default.error("Unhandled rejection", "reason", event.reason);
    }
});
/**
 *
 * @private
 */
function fixParams(params) {
    if (params.startupDependencies) {
        if (!params.startupDependencies.services)
            params.startupDependencies.services = defaultBaseServiceParams.startupDependencies.services;
        if (!params.startupDependencies.clients)
            params.startupDependencies.clients = defaultBaseServiceParams.startupDependencies.clients;
    }
    else {
        params.startupDependencies = defaultBaseServiceParams.startupDependencies;
    }
    if (params.shutdownDependencies) {
        if (!params.shutdownDependencies.services)
            params.shutdownDependencies.services = defaultBaseServiceParams.shutdownDependencies.services;
    }
    else {
        params.shutdownDependencies = defaultBaseServiceParams.shutdownDependencies;
    }
}


/***/ }),

/***/ 4:
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ 5:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const routerClientConstructor_1 = __webpack_require__(27);
const logger_1 = __webpack_require__(0);
let RCConstructor = routerClientConstructor_1.RouterClientConstructor;
/** The logger needs a router client, and the router client needs a logger.
 * To get around this fundamental circular dependency, we pass a reference
 * of the RouterClient to the Logger. Only after this is called will the
 * RouterClient and Logger be ready. If RouterClient is NOT required before
 * the Logger, then this file will be dynamically required at Logger.start().
 */
/** An instance of the IRouterClient interface, (that is, the Router Client).
 * All other clients are built on top of the RouterClient; its API is the
 * primary form of communication between the various components of Finsemble.
 */
let RouterClientInstance = new RCConstructor({ clientName: "RouterClient" });
logger_1.Logger.setRouterClient(RouterClientInstance);
exports.default = RouterClientInstance;


/***/ }),

/***/ 6:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__systemSettings__ = __webpack_require__(29);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


/**
 * @introduction
 * <h2>Finsemble Validate Functions</h2>
 *
 */

/**
 * Constructor for Finsemble argument validator.
 *
 * Validation logic is ONLY RAN when SystemSettings diagnostics level is set to debug (i.e. 4 or above)
 * A failed validation will generate a warning message, but nothing more; however application logic can check the validation results.
 *
 * @param {string} console Finsemble console object used to display messages and check diagnostic level
 * @constructor
 * @shouldBePublished false
 */
var Validate = function () {

	function warningMsg(paramDescript, thisArg, thisArgType) {

		function getErrorObject() {
			try {
				throw Error("");
			} catch (err) {
				return err;
			}
		}

		var err = getErrorObject();

		var caller_line1 = err.stack.split("\n")[5];
		var index1 = caller_line1.indexOf("at ");
		var msgPart1 = caller_line1.slice(index1 + 2, caller_line1.length);

		var caller_line2 = err.stack.split("\n")[6];
		var index2 = caller_line2.indexOf("at ");
		var msgPart2 = caller_line2.slice(index2 + 2, caller_line2.length);

		console.warn("parameter validation failed: parameter " + paramDescript + " is of type '" + typeof thisArg + "' but should be of type '" + thisArgType + "' in" + msgPart1 + " called by" + msgPart2);
	}

	/**
  * Confirm parameters are valid. A variable number of parameter pairs are supported.
  * @param {any} param1 is arg to validate
  * @param {string} paramType1 is required type for parameter (if '=' suffix then parameter is optional). "any" represents any type (but not "undefined").
  * @param {any=} param2 is next arg to validate
  * @param {string=} paramType2 os required type for next arg
  * @return {boolean} returns turn if parameter list is valid; otherwise, false.
  *
  * @example
  *
  * var validate = new Validate(console);
  * validate.args(name, "string", age, "number")
  *
  * validate.args(topic, "string", initialState, "object="); // with optional paramter (represented by "=")
  *
  * validate.args(topic, "string", initialState, "any"); // with "any" type
  *
  * validate.args(subscribeIDStruct, "object") && validate.args(subscribeIDStruct.subscribeID, "string"); // only do second validate if first test successful
  *
  * validate.args(subscribeIDStruct, "object", subscribeIDStruct.subscribeID, "string"); // only check second parm if first validated successful
  *
  * validate.args(topic, "any", initialState, "object=", params, "object="); // depending on logic, can break into separate validations
  * params = params || {};
  * validate.args(params.subscribeCallback, "function=", params.publishCallback, "function=", params.unsubscribeCallback, "function=");
  */
	this.args = function (param1, paramType1, param2, paramType2 /*.....optional more paramter pairs....*/) {
		var returnCode = true;
		if (__WEBPACK_IMPORTED_MODULE_0__systemSettings__["a" /* default */].validationEnabled()) {
			var parmCount = arguments.length;
			if ((parmCount + 1) % 2 !== 0) {
				// parameters must come in pairs (i.e. even number)
				for (var i = 0; i < parmCount; i = i + 2) {
					var optionalArg = false;
					var thisArg = arguments[i];
					var thisArgType = arguments[i + 1];
					if (thisArgType.slice(-1) === "=") {
						// if last char is "=" then optional argument
						thisArgType = thisArgType.slice(0, -1);
						optionalArg = true;
					}
					if (typeof thisArg !== thisArgType) {
						// confirms basic case -- the required type
						if (!optionalArg || typeof thisArg !== "undefined") {
							// but optional params can be undefined
							if (typeof thisArg === "undefined" || thisArgType !== "any") {
								// but "any" type doesn't have to match but can't be undefined
								var parameterPosition = i / 2 + 1;
								warningMsg(parameterPosition, thisArg, thisArgType);
								returnCode = false;
								break;
							}
						}
					}
				}
			} else {
				console.warn("validate.args requires even number of parameters: " + JSON.stringify(arguments));
			}
		}
		return returnCode; // always return turn when validation is disable due debug label turned off
	};

	/**
  * Confirm parameters are valid. args2() has the same functionality as args() except a third "parameter description" is passed in for each argument verified
  * Typically this for passing in a properties name for better diagnostic messages when verifying object properties.
  * A variable number of parameter "triples"" are supported.
  *
  * @param {string} paramName1 is descriptive name of param1 (for diagnostic message)
  * @param {any} param1 is arg to validate
  * @param {string} paramType1 is required type for parameter (if '=' suffix then parameter is optional). "any" represents any type (but not "undefined").
  * @param {string} paramName2 is descriptive name of param1 (for diagnostic message)
  * @param {any} param2 is arg to validate
  * @param {string} paramType2 is required type for parameter (if '=' suffix then parameter is optional). "any" represents any type (but not "undefined").
  * @return {boolean} returns turn if parameter list is valid; otherwise, false.
  *
  * @example
  *
  * var validate = new Utils.Validate(console);
  * validate.args2("record.name", record.name, "string", "record.age", age, "number")
  *
  * // common case using args() and args2() together
  * validate.args(topic, "any", initialState, "object=", params, "object=") &&
  *   validate.args2("params.subscribeCallback", params.subscribeCallback, "function=", "params.publishCallback", params.publishCallback, "function=") &&
  *   validate.args2("params.unsubscribeCallback", params.unsubscribeCallback, "function=");
  */
	this.args2 = function (paramName1, param1, paramType1, paramName2, param2, paramType2 /*.....optional, more paramter sets of three....*/) {

		var returnCode = true;
		if (__WEBPACK_IMPORTED_MODULE_0__systemSettings__["a" /* default */].validationEnabled()) {
			var parmCount = arguments.length;
			if ((parmCount + 1) % 3 !== 0) {
				// parameters must come in sets of three
				for (var i = 0; i < parmCount; i = i + 3) {
					var optionalArg = false;
					var thisArgName = arguments[i];
					var thisArg = arguments[i + 1];
					var thisArgType = arguments[i + 2];
					if (thisArgType.slice(-1) === "=") {
						// if last char is "=" then optional argument
						thisArgType = thisArgType.slice(0, -1);
						optionalArg = true;
					}
					if (typeof thisArg !== thisArgType) {
						// confirms basic case -- the required type
						if (!optionalArg || typeof thisArg !== "undefined") {
							// but optional params can be undefined
							if (typeof thisArg === "undefined" || thisArgType !== "any") {
								// but "any" type doesn't have to match but can't be undefined
								warningMsg(thisArgName, thisArg, thisArgType);
								returnCode = false;
								break;
							}
						}
					}
				}
			} else {
				console.warn("validate.args requires even number of parameters: " + JSON.stringify(arguments));
			}
		}
		return returnCode; // always return turn when validation is disable due debug label turned off
	};
};

/* harmony default export */ __webpack_exports__["default"] = (new Validate());

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\common\\validate.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\common\\validate.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),

/***/ 7:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
const routerClientInstance_1 = __webpack_require__(5);
const validate_1 = __webpack_require__(6); // Finsemble args validator
const logger_1 = __webpack_require__(0);
const system_1 = __webpack_require__(3);
const dependencyManager_1 = __webpack_require__(14);
/**
 * @introduction
 * <h2>Base Client</h2>
 * The Base Client is inherited by every client to provide common functionality to the clients. Clients communicate their status to each other through the Router and receive service status from the service manager. Once all dependencies are met, either client or service, the client's `onReady` method is fired.
 *
 * We're currently halfway through migrating our clients from extending a normal function prototype to an ES6 class.
 * "_BaseClient" represents the new class, while "BaseClient" is the original function. When the migration is complete,
 * we will remove the old function and rename "_BaseClient" to "BaseClient".
 * @constructor
 * @param {Object} params
 * @param {Function} params.onReady - A function to be called after the client has initialized.
 * @param {String} params.name - The name of the client
 * @shouldBePublished false
    @example
    import { _BaseClient as BaseClient } from "./baseClient";
    var NewClient = function (params) {
        BaseClient.call(this, params);
        var self = this;

        return this;
    };

    var clientInstance = new NewClient({
        onReady: function (cb) {
            Logger.system.log("NewClient Online");
            cb();
        },
        name:"NewClient"
    });
    clientInstance.requiredServices = [REPLACE_THIS_ARRAY_WITH_DEPENENCIES];
    clientInstance.initialize();
    module.exports = clientInstance;
    @private
 */
class _BaseClient {
    constructor(params) {
        /** The current status of this service. */
        this.status = "offline";
        this.startupTime = 0;
        this.initialized = false;
        this.startupDependencies = { services: [], clients: [] };
        /** Gets the current window. */
        this.finsembleWindow = null;
        /** Gets the current window name. */
        this.windowName = "";
        /** Queue of functions to process once the client goes online. */
        this.clientReadyQueue = [];
        /**
         * @private
         *
         */
        this.processClientReadyQueue = () => {
            for (let cb of this.clientReadyQueue) {
                cb();
            }
            this.clientReadyQueue = [];
        };
        /**
         * @private
         *
         */
        this.onReady = (cb) => {
            this.clientReadyQueue.push(cb);
            if (this.status === "online") {
                this.processClientReadyQueue();
            }
        };
        /** Check to see if the client can come online. We check this against the required services and clients */
        /**
     * @private
     *
     */
        this.setClientOnline = () => {
            this.status = "online";
            const onReadyMessage = `STARTUP:CLIENT ONLINE:${this.finWindow.name}:${this.name}`;
            this.startupTime = window.performance.now() - this.startupTime;
            const readyCB = () => {
                this.logger.system.debug(onReadyMessage);
                this.processClientReadyQueue();
                dependencyManager_1.FSBLDependencyManagerSingleton.setClientOnline(this.name);
            };
            if (this._onReady) {
                this._onReady(readyCB);
            }
            else {
                readyCB();
            }
        };
        /**
         * @private
         *
         */
        this.initialize = (cb = Function.prototype) => {
            if (this.initialized)
                return;
            this.initialized = true;
            this.startupTime = performance.now();
            this.routerClient.onReady(() => {
                // TODO, [terry] allow the finsembleWindow to be passed in, so we can support proxying windowClient in RPC
                this.finWindow = system_1.System.Window.getCurrent();
                this.windowName = this.finWindow.name;
                this.logger.system.debug("Baseclient Init Router Ready", this.name);
                dependencyManager_1.FSBLDependencyManagerSingleton.startup.waitFor(this.startupDependencies, () => {
                    cb();
                    this.setClientOnline();
                });
            });
        };
        /**
         * @private
         *
         */
        this.onClose = (cb) => {
            if (cb)
                cb();
        };
        this.name = params.name;
        this._onReady = params.onReady;
        this.startupDependencies = params.startupDependencies || {
            services: [],
            clients: []
        };
        // @TODO - Refactor this to use DI.
        this.logger = logger_1.default;
        /**
         * Reference to the RouterClient
         */
        this.routerClient = routerClientInstance_1.default;
    }
}
exports._BaseClient = _BaseClient;
/**
 * @introduction
 * <h2>Base Client</h2>
 * The Base Client is inherited by every client to provide common functionality to the clients. Clients communicate their status to each other through the Router and receive service status from the service manager. Once all dependencies are met, either client or service, the client's `onReady` method is fired.
 * @constructor
 * @param {Object} params
 * @param {Function} params.onReady - A function to be called after the client has initialized.
 * @param {String} params.name - The name of the client
 * @shouldBePublished false
    @example
    import { _BaseClient as BaseClient } from "./baseClient";
    var NewClient = function (params) {
        BaseClient.call(this, params);
        var self = this;

        return this;
    };

    var clientInstance = new NewClient({
        onReady: function (cb) {
            Logger.system.log("NewClient Online");
            cb();
        },
        name:"NewClient"
    });
    clientInstance.requiredServices = [REPLACE_THIS_ARRAY_WITH_DEPENENCIES];
    clientInstance.initialize();
    module.exports = clientInstance;
    @private
 */
var BaseClient = function (params) {
    validate_1.default.args(params, "object=");
    var self = this;
    var status = "offline";
    var onReady;
    this.startupTime = 0;
    if (params) {
        if (params.onReady) {
            onReady = params.onReady;
        }
        this.name = params.name;
    }
    this.initialized = false;
    this.startupDependencies = params.startupDependencies || {
        services: [],
        clients: []
    };
    /**
     * Reference to the RouterClient
     *  @type {Object}
     */
    this.routerClient = routerClientInstance_1.default;
    /**
     * Gets the current openfin window - stays here for backward compatibility
     * @type {object}
     */
    this.finWindow = null;
    /**
     * Gets the current window
     * @type {object}
     */
    this.finsembleWindow = null;
    /**
     * Gets the current window name
     *  @type {string}
     */
    this.windowName = ""; //The current window
    /**
     * Services the are required to be online before the service can come online
     *  @type {Array.<Object>}
     */
    this.requiredServices = [];
    /**
     * Clients the are required to be online before the service can come online
     *  @type {Array.<Object>}
     */
    this.requiredClients = [];
    /**
     * Queue of functions to process once the client goes online.
     * @private
     */
    this.clientReadyQueue = [];
    /**
     * Iterates through the clientReadyQueue, invoking each call to `.ready`.
     */
    this.processClientReadyQueue = function () {
        for (var i = 0; i < this.clientReadyQueue.length; i++) {
            let callback = this.clientReadyQueue[i];
            if (typeof callback === "function") {
                callback();
            }
        }
        this.clientReadyQueue = [];
    };
    /**
     * Method for adding callbacks to each client.
     */
    this.onReady = function (cb) {
        this.clientReadyQueue.push(cb);
        if (status === "online") {
            this.processClientReadyQueue();
        }
    };
    //Check to see if the client can come online. We check this against the required services and clients
    this.setClientOnline = function () {
        var self = this;
        status = "online";
        let onReadyMessage = `STARTUP:CLIENT ONLINE:${self.finWindow.name}:${self.name}`;
        self.startupTime = performance.now() - self.startupTime;
        if (onReady) {
            onReady(function () {
                logger_1.default.system.debug(onReadyMessage);
                self.processClientReadyQueue();
                dependencyManager_1.FSBLDependencyManagerSingleton.setClientOnline(self.name);
            });
        }
        else {
            logger_1.default.system.debug(onReadyMessage);
            self.processClientReadyQueue();
            dependencyManager_1.FSBLDependencyManagerSingleton.setClientOnline(self.name);
        }
    };
    /**
    * Starts the process of checking services and any other function required before the client can come online
    */
    this.initialize = function (cb = Function.prototype) {
        if (self.initialized) {
            return;
        }
        self.initialized = true;
        self.setClientOnline = self.setClientOnline.bind(self);
        self.startupTime = performance.now();
        self.routerClient.onReady(function () {
            // TODO, [terry] allow the finsembleWindow to be passed in, so we can support proxying windowClient in RPC
            self.finWindow = system_1.System.Window.getCurrent();
            self.windowName = self.finWindow.name;
            logger_1.default.system.debug("Baseclient Init Router Ready", self.name);
            dependencyManager_1.FSBLDependencyManagerSingleton.startup.waitFor({
                services: self.startupDependencies.services || [],
                clients: self.startupDependencies.clients || []
            }, () => {
                cb();
                self.setClientOnline();
            });
        });
    };
    this.onClose = function () { };
};
exports.default = BaseClient;


/***/ }),

/***/ 8:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony export (immutable) */ __webpack_exports__["getOpenfinVersion"] = getOpenfinVersion;
/* harmony export (immutable) */ __webpack_exports__["castToPromise"] = castToPromise;
/* harmony export (immutable) */ __webpack_exports__["isPercentage"] = isPercentage;
/* harmony export (immutable) */ __webpack_exports__["crossDomain"] = crossDomain;
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getAllMonitors", function() { return getAllMonitors; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getMonitorFromOpenFinXY", function() { return getMonitorFromOpenFinXY; });
/* harmony export (immutable) */ __webpack_exports__["getMonitorFromWindow"] = getMonitorFromWindow;
/* harmony export (immutable) */ __webpack_exports__["getFinWindow"] = getFinWindow;
/* harmony export (immutable) */ __webpack_exports__["getWindowDescriptor"] = getWindowDescriptor;
/* harmony export (immutable) */ __webpack_exports__["findMonitor"] = findMonitor;
/* harmony export (immutable) */ __webpack_exports__["getWhichMonitor"] = getWhichMonitor;
/* harmony export (immutable) */ __webpack_exports__["getMonitorFromCommand"] = getMonitorFromCommand;
/* harmony export (immutable) */ __webpack_exports__["windowOnMonitor"] = windowOnMonitor;
/* harmony export (immutable) */ __webpack_exports__["getMonitorByDescriptor"] = getMonitorByDescriptor;
/* harmony export (immutable) */ __webpack_exports__["getMonitor"] = getMonitor;
/* harmony export (immutable) */ __webpack_exports__["getMyWindowIdentifier"] = getMyWindowIdentifier;
/* harmony export (immutable) */ __webpack_exports__["camelCase"] = camelCase;
/* harmony export (immutable) */ __webpack_exports__["clone"] = clone;
/* harmony export (immutable) */ __webpack_exports__["guuid"] = guuid;
/* harmony export (immutable) */ __webpack_exports__["injectJS"] = injectJS;
/* harmony export (immutable) */ __webpack_exports__["openSharedData"] = openSharedData;
/* harmony export (immutable) */ __webpack_exports__["getNewBoundsWhenMovedToMonitor"] = getNewBoundsWhenMovedToMonitor;
/* harmony export (immutable) */ __webpack_exports__["adjustBoundsToBeOnMonitor"] = adjustBoundsToBeOnMonitor;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__system__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__system___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__system__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__monitorsAndScaling__ = __webpack_require__(25);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__clients_logger__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__clients_logger___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__clients_logger__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_uuid_v1__ = __webpack_require__(19);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_uuid_v1___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_uuid_v1__);
/*!
 * Copyright 2017 by ChartIQ, Inc.
 * All rights reserved.
 */


const Monitors = new __WEBPACK_IMPORTED_MODULE_1__monitorsAndScaling__["a" /* default */](Function.prototype, Function.prototype, { System: __WEBPACK_IMPORTED_MODULE_0__system__["System"] });
/* harmony export (immutable) */ __webpack_exports__["Monitors"] = Monitors;




/*if (typeof fin !== "undefined") { //For Docking Tests -> removing this because Monitors are now handled bu the Monitors object. Docking tests will fail.
	System.ready(() => {
		System.addEventListener("monitor-info-changed", function () {
			allMonitors = [];
			getAllMonitors();
		});
	});
}*/

/**
 * Gets the openfin version in object form.
 */
function getOpenfinVersion(cb = Function.prototype) {
	return new Promise(function (resolve /*, reject*/) {
		__WEBPACK_IMPORTED_MODULE_0__system__["System"].getVersion(ver => {
			let verArr = ver.split(".").map(Number);
			let versionObject = {
				major: verArr[0],
				chromium: verArr[1],
				minor: verArr[2],
				patch: verArr[3]
			};
			cb(versionObject);
			resolve({ versionObject });
		});
	});
};
/**
	 * Given a function _that returns a value_, this method will return a thenable object.
	 * **NOTE** This will not work if your function doesn't return something.
	 *  <example>
	 *		function myFunc(){
				console.log('I promise that this is not a promise.');
			 }
		let myPromise = util.castToPromise(myFunc);
		myPromise().then(doSomethingElse);
		</example>

	 */
function castToPromise(f) {
	return function () {
		return new Promise((resolve, reject) => {
			//Calls f, checks to see if the returned object has a `then` method. if not, it will resolve the result from the initial function.
			const result = f.apply(null, Array.from(arguments));
			try {
				return result.then(resolve, reject);
			} catch (e) {
				if (e instanceof TypeError) {
					resolve(result);
				} else {
					reject(e);
				}
			}
		});
	};
};

/**
 * @introduction
 * <h2>Finsemble Utility Functions</h2>
 */

function isPercentage(val) {
	if (typeof val !== "string") {
		return false;
	}
	return val.indexOf("%") !== -1;
};

function crossDomain(url) {
	var parser = document.createElement("a");
	parser.href = url;

	var isSameHost = window.location.hostname === parser.hostname;

	var isSameProtocol = window.location.protocol === parser.protocol;

	var wport = window.location.port !== undefined ? window.location.port : 80;
	var pport = parser.port !== undefined ? parser.port : 80;
	var isSamePort = wport === pport;

	var isCrossDomain = !(isSameHost && isSamePort && isSameProtocol);
	__WEBPACK_IMPORTED_MODULE_2__clients_logger___default.a.system.debug("Launcher crossDomain=" + isCrossDomain + " (" + isSameHost + ":" + isSameProtocol + ":" + isSamePort + ")");
	return isCrossDomain;
};

/**
 * Gets an array of monitor descriptors. Essentially rationalizing the results of OpenFin getMonitorInfo.
 * into a single array with additional information added.
 *
 * whichMonitor is set to the secondary monitor number, or "primary" if the primary monitor.
 * position is set to a zero index, where primary is the zero position, and each non-primary increments thereafter.
 *
 * Additionally, width and height are calculated and filled in for availableRect and monitorRect.
 *
 * @param {callback-array} cb Returns a list of monitor descriptors (optional or use promise)
 */
var getAllMonitors = Monitors.getAllMonitors;

/**
 * Retrieves a monitor descriptor given an absolute X Y on the OpenFin virtual screen
 * @param  {number} x The x position
 * @param  {number} y The y position
 * @param {callback-object}  cb Returns the monitor information from OpenFin.
 * "isPrimary" is set to true if it's the primary monitor.
 * null is returned if the x,y coordinates are beyond the bounds of the virtual screen.
 */
var getMonitorFromOpenFinXY = Monitors.getMonitorFromScaledXY;

/**
 * Retrieves a monitor descriptor for a window. If the window straddles two monitors
 * then the monitor from the top left is provided and "straddling" flag is set to true.
 *
 * @param  {WindowDescriptor}   windowDescriptor A windowDescriptor
 * @param  {Function} cb               Returns a monitor descriptor (optional or use promise)
 * @returns {Promise} A promise that resolves to a monitor descriptor
 */
function getMonitorFromWindow(windowDescriptor, cb) {
	var x = Number.isFinite(windowDescriptor.x) ? windowDescriptor.x : windowDescriptor.defaultLeft;
	var y = Number.isFinite(windowDescriptor.y) ? windowDescriptor.y : windowDescriptor.defaultTop;
	var x2 = x + windowDescriptor.defaultWidth;
	var y2 = y + windowDescriptor.defaultHeight;
	return new Promise(function (resolve, reject) {

		// get monitor of top-left
		Monitors.getMonitorFromScaledXY(x, y, function (monitor) {
			if (!monitor) {
				__WEBPACK_IMPORTED_MODULE_2__clients_logger___default.a.system.debug("getMonitorFromWindow - top-left is off screen, trying bottom right");
				// get monitor of bottom-right
				Monitors.getMonitorFromScaledXY(x2, y2, function (monitor) {
					if (!monitor) {
						__WEBPACK_IMPORTED_MODULE_2__clients_logger___default.a.system.debug("getMonitorFromWindow - bottom-right is off screen, getting primary");
						// get primary monitor - add message to the monitor saying that this window isn't really on a monitor
						Monitors.getAllMonitors(function (monitors) {
							if (monitors[0]) {
								if (cb) {
									cb(monitors[0]);
								}
								resolve(monitors[0]);
							} else {
								reject(new Error("Cannot find monitor for window."));
								if (cb) {
									cb(null);
								}
							}
						});
						return;
					}
					monitor = clone(monitor);
					var monitorRect = monitor.monitorRect;
					if (monitorRect.left < x || monitorRect.right < y) {
						monitor.straddling = true;
					}
					if (cb) {
						cb(monitor);
					}
					resolve(monitor);
				});
				return;
			}
			monitor = clone(monitor);
			var monitorRect = monitor.monitorRect;
			if (monitorRect.right > x2 || monitorRect.bottom > y2) {
				monitor.straddling = true;
			}
			if (cb) {
				cb(monitor);
			}
			resolve(monitor);
		});
	});
};

/**
 * Returns a finWindow or null if not found
 * @param  {WindowIdentifier}   windowIdentifier A window identifier
 * @param  {Function} cb               Optional callback containing finWindow or null if not found (or use Promise)
 * @return {Promise}                    Promise that resolves to a finWindow or rejects if not found
 */
function getFinWindow(windowIdentifier, cb) {
	return new Promise(function (resolve, reject) {
		// Default to current window
		var myWindow = __WEBPACK_IMPORTED_MODULE_0__system__["System"].Window.getCurrent();

		// Get OpenFin options (windowDescriptor) for current window
		// we need this info even if we're going to reference a different window
		myWindow.getOptions(function (options) {
			// If windowName is provided, then find that window
			if (windowIdentifier && windowIdentifier.windowName) {
				// If we didn't get a uuid from the caller, then assume
				// it's the same window as current window
				if (!windowIdentifier.uuid) {
					windowIdentifier.uuid = options.uuid;
				}
				/**
     * Try to wrap the window; if it exists, getInfo will get in
     *  to the success function. If not, it'll go into the error callback.
     */
				let remoteWindow = __WEBPACK_IMPORTED_MODULE_0__system__["System"].Window.wrap(windowIdentifier.uuid, windowIdentifier.windowName);
				remoteWindow.getInfo(() => {
					if (cb) {
						cb(remoteWindow);
					}

					resolve(remoteWindow);
				}, function () {
					if (cb) {
						cb(null);
					}
					reject(`Window ${windowIdentifier.windowName} not found. UUID: ${windowIdentifier.uuid}`);
					console.debug("util.getFinWindow: Window " + windowIdentifier.windowName + " not found");
					return;
				});
			} else if (windowIdentifier && windowIdentifier.componentType) {
				if (typeof LauncherService !== "undefined") {
					let remoteWindow = LauncherService.componentFinder(windowIdentifier);
					if (remoteWindow) {
						resolve(remoteWindow);
						if (cb) {
							cb(remoteWindow);
						}
					} else {
						reject("util.getFinWindow: Component " + windowIdentifier.componentType + " not found.");
						if (cb) {
							cb(null);
						}
					}
				} else {
					//@TODO, get this through a remote call to Launcher service
					reject("getFinWindow by componentType is currently only operable within LaunchService");
					if (cb) {
						cb(null);
					}
				}
			} else {
				// return windowDescriptor for current window
				if (cb) {
					cb(myWindow);
				}
				resolve(myWindow);
			}
		});
	});
};

/**
 * Retrieves a windowDescriptor given a windowIdentifier
 * @param {WindowIdentifier} [windowIdentifier] The window to locate. If empty then the current window is returned.
 * @param {function} cb Function to retrieve result (optional or use Promise)
 * @return {Promise} A promise that resolves to a WindowDescriptor
 */
function getWindowDescriptor(windowIdentifier, cb) {
	return new Promise(function (resolve, reject) {
		getFinWindow(windowIdentifier).then(function (finWindow) {
			finWindow.getOptions(function (options) {
				if (cb) {
					cb(options);
				}
				resolve(options);
			});
		}).catch(function (errorMessage) {
			console.warn(errorMessage);
			if (cb) {
				cb(null);
			}
			reject(errorMessage);
		});
	});
};

function findMonitor(monitors, field, value) {
	for (var i = 0; i < monitors.length; i++) {
		var monitor = monitors[i];
		if (monitor[field] === value) {
			return monitor;
		}
	}
	return null;
};
/**
 * @param {number} commandMonitor
 * @param {Array.<Object>} monitors
 * @param {number} launchingMonitorPosition
 * commandMonitor, monitors, launchingMonitorPosition
 */
function getWhichMonitor(params, cb) {
	//First release of this method took 3 params.
	if (arguments.length > 2) {
		params = {
			commandMonitor: arguments[0],
			monitors: arguments[1],
			launchingMonitorPosition: arguments[2]
		};
		cb = null;
	}
	var monitor;
	var { commandMonitor, monitors, launchingMonitorPosition } = params;
	var isANumber = commandMonitor && commandMonitor !== "" || commandMonitor === 0;
	if (commandMonitor === "primary") {
		monitor = findMonitor(monitors, "whichMonitor", "primary");
	} else if (commandMonitor === "next") {
		let position = launchingMonitorPosition + 1;
		if (position >= monitors.length) {
			position = 0;
		}
		monitor = monitors[position];
	} else if (commandMonitor === "previous") {
		let position = launchingMonitorPosition - 1;
		if (position < 0) {
			position = monitors.length - 1;
		}
		monitor = monitors[position];
	} else if (commandMonitor === "mine") {
		var waiting = true;
		//assuming this is always used in the launcher
		var w = activeWindows.getWindow(params.windowIdentifier.windowName);
		w._getBounds((err, bounds) => {
			if (!err) {
				Monitors.getMonitorFromScaledXY(bounds.left, bounds.top, monitor => {
					cb(monitor);
				});
			} else {
				monitor = monitors[0];
				cb(monitor);
			}
		});
	} else if (isANumber) {
		if (commandMonitor >= monitors.length) {
			commandMonitor = monitors.length - 1;
		}
		monitor = monitors.filter(monitor => monitor.position === commandMonitor)[0];
	} else if (launchingMonitorPosition) {
		monitor = monitors[launchingMonitorPosition];
	}

	if (!monitor) {
		// primary if no monitor found
		monitor = monitors[0];
	}

	if (!waiting) {
		if (cb) {
			cb(monitor);
		} else {
			//maintaining backwards compatibility
			return monitor;
		}
	}
};

/**
 * Gets a monitorInfo based on a command. A command is the typical "monitor" param
 * @param  {string} commandMonitor   Monitor command. See {@link LauncherClient#spawn}
 * @param  {object} windowIdentifier The windowIdentifier of the calling function. Necessary to support "next","previous" an default.
 * @param {function} [cb] Optional callback
 * @returns {Promise} A promise that resolves to a monitorInfo
 */
function getMonitorFromCommand(commandMonitor, windowIdentifier, cb) {
	return new Promise(function (resolve /*, reject*/) {
		getMonitor(windowIdentifier, function (monitorInfo) {
			Monitors.getAllMonitors(function (monitors) {
				let params = {
					commandMonitor: commandMonitor,
					monitors: monitors,
					launchingMonitorPosition: monitorInfo.position
				};
				getWhichMonitor(params, function (finalMonitorInfo) {
					if (cb) {
						cb(finalMonitorInfo);
					}
					resolve(finalMonitorInfo);
				});
			});
		});
	});
};

/**
 * @private
 * @param {WindowDescriptor} windowDescriptor
 * @param {monitorDimensions} monitorDimensions
 * @returns {boolean} Whether window is on the current monitor.
 */
function windowOnMonitor(windowDescriptor, monitorDimensions) {
	//if right or left edge is within the window's bounds.
	if (windowDescriptor.left >= monitorDimensions.left && windowDescriptor.left < monitorDimensions.right || windowDescriptor.right <= monitorDimensions.right && windowDescriptor.right > monitorDimensions.left) {
		return true;
	}
	return false;
};
/**
 * Convenience function to get the monitor for the current window
 * @param {WindowDescriptor} [windowIdentifier] The window to find the monitor for. Current window if empty.
 * @param  {Function} cb Returns a monitor descriptor (optional or use Promise)
 * @returns {Promise} A promise that resolves to a monitor descriptor
 */
function getMonitorByDescriptor(windowDescriptor, cb) {
	return new Promise(function (resolve /*, reject*/) {
		getMonitorFromWindow(windowDescriptor, function (monitor) {
			if (cb) {
				cb(monitor);
			}
			resolve(monitor);
		});
	});
};
/**
 * Convenience function to get the monitor for the current window
 * @param {WindowIdentifier} [windowIdentifier] The window to find the monitor for. Current window if empty.
 * @param  {Function} cb Returns a monitor descriptor (optional or use Promise)
 * @returns {Promise} A promise that resolves to a monitor descriptor
 */
function getMonitor(windowIdentifier, cb) {
	return new Promise(function (resolve, reject) {
		getWindowDescriptor(windowIdentifier, function (windowDescriptor) {
			if (!windowDescriptor) {
				reject("util.getMonitor: Can't locate windowDescriptor.");
			} else {
				getMonitorFromWindow(windowDescriptor, function (monitor) {
					if (cb) {
						cb(monitor);
					}
					resolve(monitor);
				});
			}
		});
	});
};
/**
 * Returns a windowIdentifier for the current window
 * @param {Function} cb Callback function returns windowIdentifier for this window (optional or use Promise)
 * @returns {Promise} A promise that resolves to a windowIdentifier
 */
// @TODO, [Terry] this should be eliminated in favor of calls to windowClient.getWindowIdentifier()
function getMyWindowIdentifier(cb) {
	var finWindow = __WEBPACK_IMPORTED_MODULE_0__system__["System"].Window.getCurrent();
	return new Promise(function (resolve) {
		finWindow.getOptions(windowDescriptor => {
			var componentType = null;

			// Figure out the component type from what was originally stored when we launched the window
			// options.customData is where our stuff is found
			var customData = windowDescriptor.customData;
			if (customData && customData.component) {
				componentType = customData.component.type;
			}
			var windowIdentifier = {
				windowName: finWindow.name,
				uuid: finWindow.uuid,
				componentType: componentType
			};

			if (cb) {
				cb(windowIdentifier);
			}
			resolve(windowIdentifier);
		});
	});
};
/**
 *	@returns {string} Transforms an array of strings into a camel cased string.
 * @memberof Utils
 */
function camelCase() {
	var str = "";
	for (var i = 0; i < arguments.length; i++) {
		str += " " + arguments[i];
	}
	return str.replace(/\s(.)/g, function ($1) {
		return $1.toUpperCase();
	}).replace(/\s/g, "").replace(/^(.)/, function ($1) {
		return $1.toLowerCase();
	});
};

/**
 * Convenience method for cloning an object.
 * @param  {any} from The thing you want to copy
 * @param {any=} to Where you want your copy to end up.
 * @return {any} to Where you want your copy gwe end up.
 */
function clone(from, to) {
	if (from === null || typeof from !== "object") {
		return from;
	}
	// if (from.constructor != Object && from.constructor != Array) return from;
	if (from.constructor == Date || from.constructor == RegExp || from.constructor == Function || from.constructor == String || from.constructor == Number || from.constructor == Boolean) {
		return new from.constructor(from);
	}

	to = to || new from.constructor();

	for (var n in from) {
		to[n] = typeof to[n] === "undefined" ? clone(from[n], null) : to[n];
	}

	return to;
}

function guuid() {
	return __WEBPACK_IMPORTED_MODULE_3_uuid_v1___default()(); // return global uuid
};

function injectJS(path, cb) {
	//Inject a script tag with the path given. Once the script is loaded, it executes the callback.
	var script = document.createElement("script");
	script.onload = cb;
	script.type = "text/javascript";
	script.async = true;
	script.src = path;
	var head = document.getElementsByTagName("head")[0];
	var firstScript = head.getElementsByTagName("script")[0];
	head.insertBefore(script, firstScript);
};

/** Daniel H. 1/14/2019
 * @TODO - This method is only used in the DragAndDrop client, and it introduces a sneaky circular dependency between
 * this module and the launcherClient. It should be refactored out of this module. This can't be done until v4.0.0, as
 * it would be a breaking change to our API.
 */
/**
 * This will either open a component with the shared data or publish the shared data using the linker client if the window is linked.
 * @experimental
 *
 * @param {object} params
 * @param {object} [params.data]
 * @param {boolean} [params.publishOnly] if the component is linked, this will only publish the data, not force open a window if it does not exist. If the component is not linked, this is ignored.
 * @param {function} [params.multipleOpenerHandler] Optional. This function is called with on object that contains a map of componentTypes to the data types they can open. It must return a list of components to be opened. If no handler is provided, the first found component will be chosen. It is possible that the component opened may not handle all the data provided.
 * @param {function} cb callback invoked with action taken.
 *
 * @since 1.5: multipleOpenerHandler and callback added
 *
 */
function openSharedData(params, cb) {
	var launcherClient = FSBL.Clients.LauncherClient;
	var linkerClient = FSBL.Clients.LinkerClient;
	//If no handler is specified to deal with multiple components, use the first found
	if (!params.multipleOpenerHandler) params.multipleOpenerHandler = function (componentsMappedToData) {
		// find the component that can open the most amount of data
		var maxDataTypesOpened = 0;
		var componentToOpen;
		for (var componentType of Object.keys(componentsMappedToData)) {
			if (componentsMappedToData[componentType].length > maxDataTypesOpened) {
				componentToOpen = componentType;
				maxDataTypesOpened = componentsMappedToData[componentType].length;
			}
		}
		return [componentToOpen];
	};

	var errors = [];
	var componentsMappedToData = {};

	// Loop through the data
	launcherClient.getComponentsThatCanReceiveDataTypes({ dataTypes: Object.keys(params.data) }, function (err, dataTypeComponentMap) {
		for (var dataType of Object.keys(dataTypeComponentMap)) {
			if (!dataTypeComponentMap[dataType].componentTypes.length) {
				var error = "No Components Available to Handle the type: " + dataType;
				errors.push(error);
				__WEBPACK_IMPORTED_MODULE_2__clients_logger___default.a.system.error(error);
			} else {
				for (var component of dataTypeComponentMap[dataType].componentTypes) {
					if (!componentsMappedToData[component]) {
						componentsMappedToData[component] = [dataType];
					} else componentsMappedToData[component].push(dataType);
				}
			}
		}

		// What if multiple components need to be opened?
		var componentsToOpen = Object.keys(componentsMappedToData);
		if (componentsToOpen.length) {
			if (componentsToOpen.length > 1) {
				componentsToOpen = params.multipleOpenerHandler(componentsMappedToData);
			}
			var linkerChannels = Object.keys(linkerClient.channels);
			if (linkerChannels.length) {
				//if linked
				var linkedWindows = linkerClient.getLinkedComponents({ componentTypes: componentsToOpen, windowIdentifier: linkerClient.windowIdentifier() });
				// TODO: deal with the case if not all componentTypes that need to be opened are linked
				if (linkedWindows.length || params.publishOnly) {
					// If publishOnly is true then just publish, not spawn
					linkerClient.publish({
						dataType: "Finsemble.DragAndDropClient",
						data: params.data
					});
					if (cb) cb(errors.length ? errors : null, "Data published");
				} else {
					// spawn
					for (let component of componentsToOpen) {
						launcherClient.spawn(component, {
							data: {
								sharedData: params.data,
								linker: {
									channels: linkerChannels
								}
							},
							addToWorkspace: true
						});
					}
					if (cb) cb(errors.length ? errors : null, "Linked Window(s) spawned with data");
				}
			} else {
				if (!params.publishOnly) {
					for (let component of componentsToOpen) {
						launcherClient.spawn(component, {
							data: {
								sharedData: params.data
							},
							addToWorkspace: true
						});
					}
					if (cb) cb(errors.length ? errors : null, "New Window(s) spawned with data");
				}
			}
		} else {
			if (cb) cb(errors.length ? errors : null, null);
		}
	});
};

/**
 * Calculate the new bounds of a window if moved onto the monitor by pulling the monitor along the line
 * between the top-left of the window and the center of the monitor
 * @param {*} monitor a monitor
 * @param {*} bounds current window bounds
 */
function getNewBoundsWhenMovedToMonitor(monitor, bounds) {

	// Depending if the monitor has claimed space, determine rectangle
	let monitorRect = monitor.unclaimedRect || monitor.availableRect || monitor.monitorRect;

	// Placeholder for new bounds
	let newBounds = Object.create(bounds);

	// adjust vertical offset from monitor by moving top down or bottom up
	if (bounds.top < monitorRect.top) {
		newBounds.top = monitorRect.top;
	} else if (bounds.top > monitorRect.bottom - bounds.height) {
		newBounds.top = monitorRect.bottom - bounds.height;
	}

	// Adjust horizontal offset from monitor by moving left-edge rightward or right-edge leftward
	if (bounds.left < monitorRect.left) {
		newBounds.left = monitorRect.left;
	} else if (bounds.left > monitorRect.right - bounds.width) {
		newBounds.left = monitorRect.right - bounds.width;
	}

	// Recalculate bottom / right, based on movement of top / left, maintaining width / height
	newBounds.bottom = newBounds.top + newBounds.height;
	newBounds.right = newBounds.left + newBounds.width;

	// Truncate portions off monitor in case we are downsizing from a maximized window
	if (newBounds.right > monitorRect.right) newBounds.right = monitorRect.right;
	if (newBounds.top < monitorRect.top) newBounds.top = monitorRect.top;
	if (newBounds.left < monitorRect.left) newBounds.left = monitorRect.left;
	if (newBounds.bottom > monitorRect.bottom) newBounds.bottom = monitorRect.bottom;

	// Recalculate width, height in case of truncation to ensure the window fits on the new monitor
	newBounds.height = newBounds.bottom - newBounds.top;
	newBounds.width = newBounds.right - newBounds.left;

	// Calculate distance the window moved
	let distanceMoved = Math.sqrt(Math.pow(bounds.left - newBounds.left, 2) + Math.pow(bounds.top - newBounds.top, 2));

	return {
		newBounds: newBounds,
		distanceMoved: distanceMoved,
		monitor: monitor
	};
};

/**
 * Takes a window's bounds and makes sure it's on a monitor. If the window isn't on a monitor, we determine the closest monitor
 * based on the distance from the top-left corner of the window to the center of the monitor, and then pull the monitor along that line
 * until the window is on the edge of the monitor
 * @param {*} currentBounds
 * @returns the new bounds for the window. which are different from currentBounds only if the window needs to be relocated
 */
function adjustBoundsToBeOnMonitor(bounds) {
	let newBounds = Object.create(bounds);

	// Determine if on a monitor, and if not, pull top-left corner directly toward center of monitor until it completely onscreen
	let isOnAMonitor = this.Monitors.allMonitors.some(monitor => {

		/*
   * 8/26/19 Joe: This used to only use the monitorRect (the entirety of monitor's dimensions)
   * Switched it to use the unclaimedRect. If window is inside of claimed space, then its
   * in unusable space anyway.
   * Included whole rect as a fallback
   */
		let monitorRect = monitor.unclaimedRect || monitor.monitorRect;

		// Check to see tf it's to the right of the left side of the monitor,
		// to the left of the right side, etc.basically is it within the monitor's bounds.
		let isOnMonitor = bounds.left >= monitorRect.left && bounds.left <= monitorRect.right && bounds.right >= monitorRect.left && bounds.right <= monitorRect.right && bounds.top >= monitorRect.top && bounds.top <= monitorRect.bottom && bounds.bottom >= monitorRect.top && bounds.bottom <= monitorRect.bottom;

		return isOnMonitor;
	});

	if (!isOnAMonitor) {

		// calculate if the window is on any monitor, and the distance between the top left and the center of the window
		let monitorAdjustments = this.Monitors.allMonitors.map(monitor => this.getNewBoundsWhenMovedToMonitor(monitor, bounds));

		// Get the closest monitor, the one with minimum distanceMoved
		let monitorAdjustmentClosest = monitorAdjustments.sort((md1, md2) => md1.distanceMoved - md2.distanceMoved)[0];

		// notify the movement
		__WEBPACK_IMPORTED_MODULE_2__clients_logger___default.a.system.info("Launcher.adjustWindowDescriptorBoundsToBeOnMonitor: not on monitor.  bounds", bounds, "monitor name", monitorAdjustmentClosest.monitor.name, "newBounds", monitorAdjustmentClosest.newBounds);

		// assign bounds
		newBounds = monitorAdjustmentClosest.newBounds;
	} else {
		__WEBPACK_IMPORTED_MODULE_2__clients_logger___default.a.system.info("Launcher.adjustWindowDescriptorBoundsToBeOnMonitor: on monitor.");
		newBounds = bounds;
	}

	return newBounds;
};

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\common\\util.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\common\\util.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),

/***/ 9:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, module, setImmediate, process) {(function (global, factory) {
     true ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.async = global.async || {})));
}(this, (function (exports) { 'use strict';

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest$1(func, start, transform) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

// Lodash rest function without function.toString()
// remappings
function rest(func, start) {
    return overRest$1(func, start, identity);
}

var initialParams = function (fn) {
    return rest(function (args /*..., callback*/) {
        var callback = args.pop();
        fn.call(this, args, callback);
    });
};

function applyEach$1(eachfn) {
    return rest(function (fns, args) {
        var go = initialParams(function (args, callback) {
            var that = this;
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat(cb));
            }, callback);
        });
        if (args.length) {
            return go.apply(this, args);
        } else {
            return go;
        }
    });
}

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Built-in value references. */
var Symbol$1 = root.Symbol;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$1.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString$1.call(value);
}

/** `Object#toString` result references. */
var nullTag = '[object Null]';
var undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]';
var funcTag = '[object Function]';
var genTag = '[object GeneratorFunction]';
var proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

// A temporary value used to identify if the loop should be broken.
// See #1064, #1293
var breakLoop = {};

/**
 * This method returns `undefined`.
 *
 * @static
 * @memberOf _
 * @since 2.3.0
 * @category Util
 * @example
 *
 * _.times(2, _.noop);
 * // => [undefined, undefined]
 */
function noop() {
  // No operation performed.
}

function once(fn) {
    return function () {
        if (fn === null) return;
        var callFn = fn;
        fn = null;
        callFn.apply(this, arguments);
    };
}

var iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator;

var getIterator = function (coll) {
    return iteratorSymbol && coll[iteratorSymbol] && coll[iteratorSymbol]();
};

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

/** Used for built-in method references. */
var objectProto$3 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$2 = objectProto$3.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty$2.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER$1 = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  length = length == null ? MAX_SAFE_INTEGER$1 : length;
  return !!length &&
    (typeof value == 'number' || reIsUint.test(value)) &&
    (value > -1 && value % 1 == 0 && value < length);
}

/** `Object#toString` result references. */
var argsTag$1 = '[object Arguments]';
var arrayTag = '[object Array]';
var boolTag = '[object Boolean]';
var dateTag = '[object Date]';
var errorTag = '[object Error]';
var funcTag$1 = '[object Function]';
var mapTag = '[object Map]';
var numberTag = '[object Number]';
var objectTag = '[object Object]';
var regexpTag = '[object RegExp]';
var setTag = '[object Set]';
var stringTag = '[object String]';
var weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]';
var dataViewTag = '[object DataView]';
var float32Tag = '[object Float32Array]';
var float64Tag = '[object Float64Array]';
var int8Tag = '[object Int8Array]';
var int16Tag = '[object Int16Array]';
var int32Tag = '[object Int32Array]';
var uint8Tag = '[object Uint8Array]';
var uint8ClampedTag = '[object Uint8ClampedArray]';
var uint16Tag = '[object Uint16Array]';
var uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag$1] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag$1] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/** Detect free variable `exports`. */
var freeExports$1 = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule$1 = freeExports$1 && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports$1 = freeModule$1 && freeModule$1.exports === freeExports$1;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports$1 && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

/** Used for built-in method references. */
var objectProto$2 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$2.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty$1.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$5 = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$5;

  return value === proto;
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

/** Used for built-in method references. */
var objectProto$4 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty$3.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

function createArrayIterator(coll) {
    var i = -1;
    var len = coll.length;
    return function next() {
        return ++i < len ? { value: coll[i], key: i } : null;
    };
}

function createES2015Iterator(iterator) {
    var i = -1;
    return function next() {
        var item = iterator.next();
        if (item.done) return null;
        i++;
        return { value: item.value, key: i };
    };
}

function createObjectIterator(obj) {
    var okeys = keys(obj);
    var i = -1;
    var len = okeys.length;
    return function next() {
        var key = okeys[++i];
        return i < len ? { value: obj[key], key: key } : null;
    };
}

function iterator(coll) {
    if (isArrayLike(coll)) {
        return createArrayIterator(coll);
    }

    var iterator = getIterator(coll);
    return iterator ? createES2015Iterator(iterator) : createObjectIterator(coll);
}

function onlyOnce(fn) {
    return function () {
        if (fn === null) throw new Error("Callback was already called.");
        var callFn = fn;
        fn = null;
        callFn.apply(this, arguments);
    };
}

function _eachOfLimit(limit) {
    return function (obj, iteratee, callback) {
        callback = once(callback || noop);
        if (limit <= 0 || !obj) {
            return callback(null);
        }
        var nextElem = iterator(obj);
        var done = false;
        var running = 0;

        function iterateeCallback(err, value) {
            running -= 1;
            if (err) {
                done = true;
                callback(err);
            } else if (value === breakLoop || done && running <= 0) {
                done = true;
                return callback(null);
            } else {
                replenish();
            }
        }

        function replenish() {
            while (running < limit && !done) {
                var elem = nextElem();
                if (elem === null) {
                    done = true;
                    if (running <= 0) {
                        callback(null);
                    }
                    return;
                }
                running += 1;
                iteratee(elem.value, elem.key, onlyOnce(iterateeCallback));
            }
        }

        replenish();
    };
}

/**
 * The same as [`eachOf`]{@link module:Collections.eachOf} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name eachOfLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.eachOf]{@link module:Collections.eachOf}
 * @alias forEachOfLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A function to apply to each
 * item in `coll`. The `key` is the item's key, or index in the case of an
 * array. The iteratee is passed a `callback(err)` which must be called once it
 * has completed. If no error has occurred, the callback should be run without
 * arguments or with an explicit `null` argument. Invoked with
 * (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
function eachOfLimit(coll, limit, iteratee, callback) {
  _eachOfLimit(limit)(coll, iteratee, callback);
}

function doLimit(fn, limit) {
    return function (iterable, iteratee, callback) {
        return fn(iterable, limit, iteratee, callback);
    };
}

// eachOf implementation optimized for array-likes
function eachOfArrayLike(coll, iteratee, callback) {
    callback = once(callback || noop);
    var index = 0,
        completed = 0,
        length = coll.length;
    if (length === 0) {
        callback(null);
    }

    function iteratorCallback(err, value) {
        if (err) {
            callback(err);
        } else if (++completed === length || value === breakLoop) {
            callback(null);
        }
    }

    for (; index < length; index++) {
        iteratee(coll[index], index, onlyOnce(iteratorCallback));
    }
}

// a generic version of eachOf which can handle array, object, and iterator cases.
var eachOfGeneric = doLimit(eachOfLimit, Infinity);

/**
 * Like [`each`]{@link module:Collections.each}, except that it passes the key (or index) as the second argument
 * to the iteratee.
 *
 * @name eachOf
 * @static
 * @memberOf module:Collections
 * @method
 * @alias forEachOf
 * @category Collection
 * @see [async.each]{@link module:Collections.each}
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each
 * item in `coll`. The `key` is the item's key, or index in the case of an
 * array. The iteratee is passed a `callback(err)` which must be called once it
 * has completed. If no error has occurred, the callback should be run without
 * arguments or with an explicit `null` argument. Invoked with
 * (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 * @example
 *
 * var obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
 * var configs = {};
 *
 * async.forEachOf(obj, function (value, key, callback) {
 *     fs.readFile(__dirname + value, "utf8", function (err, data) {
 *         if (err) return callback(err);
 *         try {
 *             configs[key] = JSON.parse(data);
 *         } catch (e) {
 *             return callback(e);
 *         }
 *         callback();
 *     });
 * }, function (err) {
 *     if (err) console.error(err.message);
 *     // configs is now a map of JSON data
 *     doSomethingWith(configs);
 * });
 */
var eachOf = function (coll, iteratee, callback) {
    var eachOfImplementation = isArrayLike(coll) ? eachOfArrayLike : eachOfGeneric;
    eachOfImplementation(coll, iteratee, callback);
};

function doParallel(fn) {
    return function (obj, iteratee, callback) {
        return fn(eachOf, obj, iteratee, callback);
    };
}

function _asyncMap(eachfn, arr, iteratee, callback) {
    callback = callback || noop;
    arr = arr || [];
    var results = [];
    var counter = 0;

    eachfn(arr, function (value, _, callback) {
        var index = counter++;
        iteratee(value, function (err, v) {
            results[index] = v;
            callback(err);
        });
    }, function (err) {
        callback(err, results);
    });
}

/**
 * Produces a new collection of values by mapping each value in `coll` through
 * the `iteratee` function. The `iteratee` is called with an item from `coll`
 * and a callback for when it has finished processing. Each of these callback
 * takes 2 arguments: an `error`, and the transformed item from `coll`. If
 * `iteratee` passes an error to its callback, the main `callback` (for the
 * `map` function) is immediately called with the error.
 *
 * Note, that since this function applies the `iteratee` to each item in
 * parallel, there is no guarantee that the `iteratee` functions will complete
 * in order. However, the results array will be in the same order as the
 * original `coll`.
 *
 * If `map` is passed an Object, the results will be an Array.  The results
 * will roughly be in the order of the original Objects' keys (but this can
 * vary across JavaScript engines)
 *
 * @name map
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a
 * transformed item. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an Array of the
 * transformed items from the `coll`. Invoked with (err, results).
 * @example
 *
 * async.map(['file1','file2','file3'], fs.stat, function(err, results) {
 *     // results is now an array of stats for each file
 * });
 */
var map = doParallel(_asyncMap);

/**
 * Applies the provided arguments to each function in the array, calling
 * `callback` after all functions have completed. If you only provide the first
 * argument, `fns`, then it will return a function which lets you pass in the
 * arguments as if it were a single function call. If more arguments are
 * provided, `callback` is required while `args` is still optional.
 *
 * @name applyEach
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} fns - A collection of asynchronous functions
 * to all call with the same arguments
 * @param {...*} [args] - any number of separate arguments to pass to the
 * function.
 * @param {Function} [callback] - the final argument should be the callback,
 * called when all functions have completed processing.
 * @returns {Function} - If only the first argument, `fns`, is provided, it will
 * return a function which lets you pass in the arguments as if it were a single
 * function call. The signature is `(..args, callback)`. If invoked with any
 * arguments, `callback` is required.
 * @example
 *
 * async.applyEach([enableSearch, updateSchema], 'bucket', callback);
 *
 * // partial application example:
 * async.each(
 *     buckets,
 *     async.applyEach([enableSearch, updateSchema]),
 *     callback
 * );
 */
var applyEach = applyEach$1(map);

function doParallelLimit(fn) {
    return function (obj, limit, iteratee, callback) {
        return fn(_eachOfLimit(limit), obj, iteratee, callback);
    };
}

/**
 * The same as [`map`]{@link module:Collections.map} but runs a maximum of `limit` async operations at a time.
 *
 * @name mapLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a transformed
 * item. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an array of the
 * transformed items from the `coll`. Invoked with (err, results).
 */
var mapLimit = doParallelLimit(_asyncMap);

/**
 * The same as [`map`]{@link module:Collections.map} but runs only a single async operation at a time.
 *
 * @name mapSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a
 * transformed item. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an array of the
 * transformed items from the `coll`. Invoked with (err, results).
 */
var mapSeries = doLimit(mapLimit, 1);

/**
 * The same as [`applyEach`]{@link module:ControlFlow.applyEach} but runs only a single async operation at a time.
 *
 * @name applyEachSeries
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.applyEach]{@link module:ControlFlow.applyEach}
 * @category Control Flow
 * @param {Array|Iterable|Object} fns - A collection of asynchronous functions to all
 * call with the same arguments
 * @param {...*} [args] - any number of separate arguments to pass to the
 * function.
 * @param {Function} [callback] - the final argument should be the callback,
 * called when all functions have completed processing.
 * @returns {Function} - If only the first argument is provided, it will return
 * a function which lets you pass in the arguments as if it were a single
 * function call.
 */
var applyEachSeries = applyEach$1(mapSeries);

/**
 * Creates a continuation function with some arguments already applied.
 *
 * Useful as a shorthand when combined with other control flow functions. Any
 * arguments passed to the returned function are added to the arguments
 * originally passed to apply.
 *
 * @name apply
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} function - The function you want to eventually apply all
 * arguments to. Invokes with (arguments...).
 * @param {...*} arguments... - Any number of arguments to automatically apply
 * when the continuation is called.
 * @example
 *
 * // using apply
 * async.parallel([
 *     async.apply(fs.writeFile, 'testfile1', 'test1'),
 *     async.apply(fs.writeFile, 'testfile2', 'test2')
 * ]);
 *
 *
 * // the same process without using apply
 * async.parallel([
 *     function(callback) {
 *         fs.writeFile('testfile1', 'test1', callback);
 *     },
 *     function(callback) {
 *         fs.writeFile('testfile2', 'test2', callback);
 *     }
 * ]);
 *
 * // It's possible to pass any number of additional arguments when calling the
 * // continuation:
 *
 * node> var fn = async.apply(sys.puts, 'one');
 * node> fn('two', 'three');
 * one
 * two
 * three
 */
var apply$2 = rest(function (fn, args) {
    return rest(function (callArgs) {
        return fn.apply(null, args.concat(callArgs));
    });
});

/**
 * Take a sync function and make it async, passing its return value to a
 * callback. This is useful for plugging sync functions into a waterfall,
 * series, or other async functions. Any arguments passed to the generated
 * function will be passed to the wrapped function (except for the final
 * callback argument). Errors thrown will be passed to the callback.
 *
 * If the function passed to `asyncify` returns a Promise, that promises's
 * resolved/rejected state will be used to call the callback, rather than simply
 * the synchronous return value.
 *
 * This also means you can asyncify ES2016 `async` functions.
 *
 * @name asyncify
 * @static
 * @memberOf module:Utils
 * @method
 * @alias wrapSync
 * @category Util
 * @param {Function} func - The synchronous function to convert to an
 * asynchronous function.
 * @returns {Function} An asynchronous wrapper of the `func`. To be invoked with
 * (callback).
 * @example
 *
 * // passing a regular synchronous function
 * async.waterfall([
 *     async.apply(fs.readFile, filename, "utf8"),
 *     async.asyncify(JSON.parse),
 *     function (data, next) {
 *         // data is the result of parsing the text.
 *         // If there was a parsing error, it would have been caught.
 *     }
 * ], callback);
 *
 * // passing a function returning a promise
 * async.waterfall([
 *     async.apply(fs.readFile, filename, "utf8"),
 *     async.asyncify(function (contents) {
 *         return db.model.create(contents);
 *     }),
 *     function (model, next) {
 *         // `model` is the instantiated model object.
 *         // If there was an error, this function would be skipped.
 *     }
 * ], callback);
 *
 * // es6 example
 * var q = async.queue(async.asyncify(async function(file) {
 *     var intermediateStep = await processFile(file);
 *     return await somePromise(intermediateStep)
 * }));
 *
 * q.push(files);
 */
function asyncify(func) {
    return initialParams(function (args, callback) {
        var result;
        try {
            result = func.apply(this, args);
        } catch (e) {
            return callback(e);
        }
        // if result is Promise object
        if (isObject(result) && typeof result.then === 'function') {
            result.then(function (value) {
                callback(null, value);
            }, function (err) {
                callback(err.message ? err : new Error(err));
            });
        } else {
            callback(null, result);
        }
    });
}

/**
 * A specialized version of `_.forEach` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * The base implementation of `_.forOwn` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys);
}

/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function baseIsNaN(value) {
  return value !== value;
}

/**
 * A specialized version of `_.indexOf` which performs strict equality
 * comparisons of values, i.e. `===`.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function strictIndexOf(array, value, fromIndex) {
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  return value === value
    ? strictIndexOf(array, value, fromIndex)
    : baseFindIndex(array, baseIsNaN, fromIndex);
}

/**
 * Determines the best order for running the functions in `tasks`, based on
 * their requirements. Each function can optionally depend on other functions
 * being completed first, and each function is run as soon as its requirements
 * are satisfied.
 *
 * If any of the functions pass an error to their callback, the `auto` sequence
 * will stop. Further tasks will not execute (so any other functions depending
 * on it will not run), and the main `callback` is immediately called with the
 * error.
 *
 * Functions also receive an object containing the results of functions which
 * have completed so far as the first argument, if they have dependencies. If a
 * task function has no dependencies, it will only be passed a callback.
 *
 * @name auto
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Object} tasks - An object. Each of its properties is either a
 * function or an array of requirements, with the function itself the last item
 * in the array. The object's key of a property serves as the name of the task
 * defined by that property, i.e. can be used when specifying requirements for
 * other tasks. The function receives one or two arguments:
 * * a `results` object, containing the results of the previously executed
 *   functions, only passed if the task has any dependencies,
 * * a `callback(err, result)` function, which must be called when finished,
 *   passing an `error` (which can be `null`) and the result of the function's
 *   execution.
 * @param {number} [concurrency=Infinity] - An optional `integer` for
 * determining the maximum number of tasks that can be run in parallel. By
 * default, as many as possible.
 * @param {Function} [callback] - An optional callback which is called when all
 * the tasks have been completed. It receives the `err` argument if any `tasks`
 * pass an error to their callback. Results are always returned; however, if an
 * error occurs, no further `tasks` will be performed, and the results object
 * will only contain partial results. Invoked with (err, results).
 * @returns undefined
 * @example
 *
 * async.auto({
 *     // this function will just be passed a callback
 *     readData: async.apply(fs.readFile, 'data.txt', 'utf-8'),
 *     showData: ['readData', function(results, cb) {
 *         // results.readData is the file's contents
 *         // ...
 *     }]
 * }, callback);
 *
 * async.auto({
 *     get_data: function(callback) {
 *         console.log('in get_data');
 *         // async code to get some data
 *         callback(null, 'data', 'converted to array');
 *     },
 *     make_folder: function(callback) {
 *         console.log('in make_folder');
 *         // async code to create a directory to store a file in
 *         // this is run at the same time as getting the data
 *         callback(null, 'folder');
 *     },
 *     write_file: ['get_data', 'make_folder', function(results, callback) {
 *         console.log('in write_file', JSON.stringify(results));
 *         // once there is some data and the directory exists,
 *         // write the data to a file in the directory
 *         callback(null, 'filename');
 *     }],
 *     email_link: ['write_file', function(results, callback) {
 *         console.log('in email_link', JSON.stringify(results));
 *         // once the file is written let's email a link to it...
 *         // results.write_file contains the filename returned by write_file.
 *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
 *     }]
 * }, function(err, results) {
 *     console.log('err = ', err);
 *     console.log('results = ', results);
 * });
 */
var auto = function (tasks, concurrency, callback) {
    if (typeof concurrency === 'function') {
        // concurrency is optional, shift the args.
        callback = concurrency;
        concurrency = null;
    }
    callback = once(callback || noop);
    var keys$$1 = keys(tasks);
    var numTasks = keys$$1.length;
    if (!numTasks) {
        return callback(null);
    }
    if (!concurrency) {
        concurrency = numTasks;
    }

    var results = {};
    var runningTasks = 0;
    var hasError = false;

    var listeners = Object.create(null);

    var readyTasks = [];

    // for cycle detection:
    var readyToCheck = []; // tasks that have been identified as reachable
    // without the possibility of returning to an ancestor task
    var uncheckedDependencies = {};

    baseForOwn(tasks, function (task, key) {
        if (!isArray(task)) {
            // no dependencies
            enqueueTask(key, [task]);
            readyToCheck.push(key);
            return;
        }

        var dependencies = task.slice(0, task.length - 1);
        var remainingDependencies = dependencies.length;
        if (remainingDependencies === 0) {
            enqueueTask(key, task);
            readyToCheck.push(key);
            return;
        }
        uncheckedDependencies[key] = remainingDependencies;

        arrayEach(dependencies, function (dependencyName) {
            if (!tasks[dependencyName]) {
                throw new Error('async.auto task `' + key + '` has a non-existent dependency `' + dependencyName + '` in ' + dependencies.join(', '));
            }
            addListener(dependencyName, function () {
                remainingDependencies--;
                if (remainingDependencies === 0) {
                    enqueueTask(key, task);
                }
            });
        });
    });

    checkForDeadlocks();
    processQueue();

    function enqueueTask(key, task) {
        readyTasks.push(function () {
            runTask(key, task);
        });
    }

    function processQueue() {
        if (readyTasks.length === 0 && runningTasks === 0) {
            return callback(null, results);
        }
        while (readyTasks.length && runningTasks < concurrency) {
            var run = readyTasks.shift();
            run();
        }
    }

    function addListener(taskName, fn) {
        var taskListeners = listeners[taskName];
        if (!taskListeners) {
            taskListeners = listeners[taskName] = [];
        }

        taskListeners.push(fn);
    }

    function taskComplete(taskName) {
        var taskListeners = listeners[taskName] || [];
        arrayEach(taskListeners, function (fn) {
            fn();
        });
        processQueue();
    }

    function runTask(key, task) {
        if (hasError) return;

        var taskCallback = onlyOnce(rest(function (err, args) {
            runningTasks--;
            if (args.length <= 1) {
                args = args[0];
            }
            if (err) {
                var safeResults = {};
                baseForOwn(results, function (val, rkey) {
                    safeResults[rkey] = val;
                });
                safeResults[key] = args;
                hasError = true;
                listeners = Object.create(null);

                callback(err, safeResults);
            } else {
                results[key] = args;
                taskComplete(key);
            }
        }));

        runningTasks++;
        var taskFn = task[task.length - 1];
        if (task.length > 1) {
            taskFn(results, taskCallback);
        } else {
            taskFn(taskCallback);
        }
    }

    function checkForDeadlocks() {
        // Kahn's algorithm
        // https://en.wikipedia.org/wiki/Topological_sorting#Kahn.27s_algorithm
        // http://connalle.blogspot.com/2013/10/topological-sortingkahn-algorithm.html
        var currentTask;
        var counter = 0;
        while (readyToCheck.length) {
            currentTask = readyToCheck.pop();
            counter++;
            arrayEach(getDependents(currentTask), function (dependent) {
                if (--uncheckedDependencies[dependent] === 0) {
                    readyToCheck.push(dependent);
                }
            });
        }

        if (counter !== numTasks) {
            throw new Error('async.auto cannot execute tasks due to a recursive dependency');
        }
    }

    function getDependents(taskName) {
        var result = [];
        baseForOwn(tasks, function (task, key) {
            if (isArray(task) && baseIndexOf(task, taskName, 0) >= 0) {
                result.push(key);
            }
        });
        return result;
    }
};

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined;
var symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

/**
 * Casts `array` to a slice if it's needed.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {number} start The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the cast slice.
 */
function castSlice(array, start, end) {
  var length = array.length;
  end = end === undefined ? length : end;
  return (!start && end >= length) ? array : baseSlice(array, start, end);
}

/**
 * Used by `_.trim` and `_.trimEnd` to get the index of the last string symbol
 * that is not found in the character symbols.
 *
 * @private
 * @param {Array} strSymbols The string symbols to inspect.
 * @param {Array} chrSymbols The character symbols to find.
 * @returns {number} Returns the index of the last unmatched string symbol.
 */
function charsEndIndex(strSymbols, chrSymbols) {
  var index = strSymbols.length;

  while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
  return index;
}

/**
 * Used by `_.trim` and `_.trimStart` to get the index of the first string symbol
 * that is not found in the character symbols.
 *
 * @private
 * @param {Array} strSymbols The string symbols to inspect.
 * @param {Array} chrSymbols The character symbols to find.
 * @returns {number} Returns the index of the first unmatched string symbol.
 */
function charsStartIndex(strSymbols, chrSymbols) {
  var index = -1,
      length = strSymbols.length;

  while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
  return index;
}

/**
 * Converts an ASCII `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function asciiToArray(string) {
  return string.split('');
}

/** Used to compose unicode character classes. */
var rsAstralRange = '\\ud800-\\udfff';
var rsComboMarksRange = '\\u0300-\\u036f';
var reComboHalfMarksRange = '\\ufe20-\\ufe2f';
var rsComboSymbolsRange = '\\u20d0-\\u20ff';
var rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange;
var rsVarRange = '\\ufe0e\\ufe0f';

/** Used to compose unicode capture groups. */
var rsZWJ = '\\u200d';

/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboRange + rsVarRange + ']');

/**
 * Checks if `string` contains Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a symbol is found, else `false`.
 */
function hasUnicode(string) {
  return reHasUnicode.test(string);
}

/** Used to compose unicode character classes. */
var rsAstralRange$1 = '\\ud800-\\udfff';
var rsComboMarksRange$1 = '\\u0300-\\u036f';
var reComboHalfMarksRange$1 = '\\ufe20-\\ufe2f';
var rsComboSymbolsRange$1 = '\\u20d0-\\u20ff';
var rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1;
var rsVarRange$1 = '\\ufe0e\\ufe0f';

/** Used to compose unicode capture groups. */
var rsAstral = '[' + rsAstralRange$1 + ']';
var rsCombo = '[' + rsComboRange$1 + ']';
var rsFitz = '\\ud83c[\\udffb-\\udfff]';
var rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')';
var rsNonAstral = '[^' + rsAstralRange$1 + ']';
var rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}';
var rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]';
var rsZWJ$1 = '\\u200d';

/** Used to compose unicode regexes. */
var reOptMod = rsModifier + '?';
var rsOptVar = '[' + rsVarRange$1 + ']?';
var rsOptJoin = '(?:' + rsZWJ$1 + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*';
var rsSeq = rsOptVar + reOptMod + rsOptJoin;
var rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

/**
 * Converts a Unicode `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function unicodeToArray(string) {
  return string.match(reUnicode) || [];
}

/**
 * Converts `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function stringToArray(string) {
  return hasUnicode(string)
    ? unicodeToArray(string)
    : asciiToArray(string);
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/**
 * Removes leading and trailing whitespace or specified characters from `string`.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to trim.
 * @param {string} [chars=whitespace] The characters to trim.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {string} Returns the trimmed string.
 * @example
 *
 * _.trim('  abc  ');
 * // => 'abc'
 *
 * _.trim('-_-abc-_-', '_-');
 * // => 'abc'
 *
 * _.map(['  foo  ', '  bar  '], _.trim);
 * // => ['foo', 'bar']
 */
function trim(string, chars, guard) {
  string = toString(string);
  if (string && (guard || chars === undefined)) {
    return string.replace(reTrim, '');
  }
  if (!string || !(chars = baseToString(chars))) {
    return string;
  }
  var strSymbols = stringToArray(string),
      chrSymbols = stringToArray(chars),
      start = charsStartIndex(strSymbols, chrSymbols),
      end = charsEndIndex(strSymbols, chrSymbols) + 1;

  return castSlice(strSymbols, start, end).join('');
}

var FN_ARGS = /^(function)?\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG_SPLIT = /,/;
var FN_ARG = /(=.+)?(\s*)$/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

function parseParams(func) {
    func = func.toString().replace(STRIP_COMMENTS, '');
    func = func.match(FN_ARGS)[2].replace(' ', '');
    func = func ? func.split(FN_ARG_SPLIT) : [];
    func = func.map(function (arg) {
        return trim(arg.replace(FN_ARG, ''));
    });
    return func;
}

/**
 * A dependency-injected version of the [async.auto]{@link module:ControlFlow.auto} function. Dependent
 * tasks are specified as parameters to the function, after the usual callback
 * parameter, with the parameter names matching the names of the tasks it
 * depends on. This can provide even more readable task graphs which can be
 * easier to maintain.
 *
 * If a final callback is specified, the task results are similarly injected,
 * specified as named parameters after the initial error parameter.
 *
 * The autoInject function is purely syntactic sugar and its semantics are
 * otherwise equivalent to [async.auto]{@link module:ControlFlow.auto}.
 *
 * @name autoInject
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.auto]{@link module:ControlFlow.auto}
 * @category Control Flow
 * @param {Object} tasks - An object, each of whose properties is a function of
 * the form 'func([dependencies...], callback). The object's key of a property
 * serves as the name of the task defined by that property, i.e. can be used
 * when specifying requirements for other tasks.
 * * The `callback` parameter is a `callback(err, result)` which must be called
 *   when finished, passing an `error` (which can be `null`) and the result of
 *   the function's execution. The remaining parameters name other tasks on
 *   which the task is dependent, and the results from those tasks are the
 *   arguments of those parameters.
 * @param {Function} [callback] - An optional callback which is called when all
 * the tasks have been completed. It receives the `err` argument if any `tasks`
 * pass an error to their callback, and a `results` object with any completed
 * task results, similar to `auto`.
 * @example
 *
 * //  The example from `auto` can be rewritten as follows:
 * async.autoInject({
 *     get_data: function(callback) {
 *         // async code to get some data
 *         callback(null, 'data', 'converted to array');
 *     },
 *     make_folder: function(callback) {
 *         // async code to create a directory to store a file in
 *         // this is run at the same time as getting the data
 *         callback(null, 'folder');
 *     },
 *     write_file: function(get_data, make_folder, callback) {
 *         // once there is some data and the directory exists,
 *         // write the data to a file in the directory
 *         callback(null, 'filename');
 *     },
 *     email_link: function(write_file, callback) {
 *         // once the file is written let's email a link to it...
 *         // write_file contains the filename returned by write_file.
 *         callback(null, {'file':write_file, 'email':'user@example.com'});
 *     }
 * }, function(err, results) {
 *     console.log('err = ', err);
 *     console.log('email_link = ', results.email_link);
 * });
 *
 * // If you are using a JS minifier that mangles parameter names, `autoInject`
 * // will not work with plain functions, since the parameter names will be
 * // collapsed to a single letter identifier.  To work around this, you can
 * // explicitly specify the names of the parameters your task function needs
 * // in an array, similar to Angular.js dependency injection.
 *
 * // This still has an advantage over plain `auto`, since the results a task
 * // depends on are still spread into arguments.
 * async.autoInject({
 *     //...
 *     write_file: ['get_data', 'make_folder', function(get_data, make_folder, callback) {
 *         callback(null, 'filename');
 *     }],
 *     email_link: ['write_file', function(write_file, callback) {
 *         callback(null, {'file':write_file, 'email':'user@example.com'});
 *     }]
 *     //...
 * }, function(err, results) {
 *     console.log('err = ', err);
 *     console.log('email_link = ', results.email_link);
 * });
 */
function autoInject(tasks, callback) {
    var newTasks = {};

    baseForOwn(tasks, function (taskFn, key) {
        var params;

        if (isArray(taskFn)) {
            params = taskFn.slice(0, -1);
            taskFn = taskFn[taskFn.length - 1];

            newTasks[key] = params.concat(params.length > 0 ? newTask : taskFn);
        } else if (taskFn.length === 1) {
            // no dependencies, use the function as-is
            newTasks[key] = taskFn;
        } else {
            params = parseParams(taskFn);
            if (taskFn.length === 0 && params.length === 0) {
                throw new Error("autoInject task functions require explicit parameters.");
            }

            params.pop();

            newTasks[key] = params.concat(newTask);
        }

        function newTask(results, taskCb) {
            var newArgs = arrayMap(params, function (name) {
                return results[name];
            });
            newArgs.push(taskCb);
            taskFn.apply(null, newArgs);
        }
    });

    auto(newTasks, callback);
}

var hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
var hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';

function fallback(fn) {
    setTimeout(fn, 0);
}

function wrap(defer) {
    return rest(function (fn, args) {
        defer(function () {
            fn.apply(null, args);
        });
    });
}

var _defer;

if (hasSetImmediate) {
    _defer = setImmediate;
} else if (hasNextTick) {
    _defer = process.nextTick;
} else {
    _defer = fallback;
}

var setImmediate$1 = wrap(_defer);

// Simple doubly linked list (https://en.wikipedia.org/wiki/Doubly_linked_list) implementation
// used for queues. This implementation assumes that the node provided by the user can be modified
// to adjust the next and last properties. We implement only the minimal functionality
// for queue support.
function DLL() {
    this.head = this.tail = null;
    this.length = 0;
}

function setInitial(dll, node) {
    dll.length = 1;
    dll.head = dll.tail = node;
}

DLL.prototype.removeLink = function (node) {
    if (node.prev) node.prev.next = node.next;else this.head = node.next;
    if (node.next) node.next.prev = node.prev;else this.tail = node.prev;

    node.prev = node.next = null;
    this.length -= 1;
    return node;
};

DLL.prototype.empty = DLL;

DLL.prototype.insertAfter = function (node, newNode) {
    newNode.prev = node;
    newNode.next = node.next;
    if (node.next) node.next.prev = newNode;else this.tail = newNode;
    node.next = newNode;
    this.length += 1;
};

DLL.prototype.insertBefore = function (node, newNode) {
    newNode.prev = node.prev;
    newNode.next = node;
    if (node.prev) node.prev.next = newNode;else this.head = newNode;
    node.prev = newNode;
    this.length += 1;
};

DLL.prototype.unshift = function (node) {
    if (this.head) this.insertBefore(this.head, node);else setInitial(this, node);
};

DLL.prototype.push = function (node) {
    if (this.tail) this.insertAfter(this.tail, node);else setInitial(this, node);
};

DLL.prototype.shift = function () {
    return this.head && this.removeLink(this.head);
};

DLL.prototype.pop = function () {
    return this.tail && this.removeLink(this.tail);
};

function queue(worker, concurrency, payload) {
    if (concurrency == null) {
        concurrency = 1;
    } else if (concurrency === 0) {
        throw new Error('Concurrency must not be zero');
    }

    function _insert(data, insertAtFront, callback) {
        if (callback != null && typeof callback !== 'function') {
            throw new Error('task callback must be a function');
        }
        q.started = true;
        if (!isArray(data)) {
            data = [data];
        }
        if (data.length === 0 && q.idle()) {
            // call drain immediately if there are no tasks
            return setImmediate$1(function () {
                q.drain();
            });
        }

        for (var i = 0, l = data.length; i < l; i++) {
            var item = {
                data: data[i],
                callback: callback || noop
            };

            if (insertAtFront) {
                q._tasks.unshift(item);
            } else {
                q._tasks.push(item);
            }
        }
        setImmediate$1(q.process);
    }

    function _next(tasks) {
        return rest(function (args) {
            workers -= 1;

            for (var i = 0, l = tasks.length; i < l; i++) {
                var task = tasks[i];
                var index = baseIndexOf(workersList, task, 0);
                if (index >= 0) {
                    workersList.splice(index);
                }

                task.callback.apply(task, args);

                if (args[0] != null) {
                    q.error(args[0], task.data);
                }
            }

            if (workers <= q.concurrency - q.buffer) {
                q.unsaturated();
            }

            if (q.idle()) {
                q.drain();
            }
            q.process();
        });
    }

    var workers = 0;
    var workersList = [];
    var isProcessing = false;
    var q = {
        _tasks: new DLL(),
        concurrency: concurrency,
        payload: payload,
        saturated: noop,
        unsaturated: noop,
        buffer: concurrency / 4,
        empty: noop,
        drain: noop,
        error: noop,
        started: false,
        paused: false,
        push: function (data, callback) {
            _insert(data, false, callback);
        },
        kill: function () {
            q.drain = noop;
            q._tasks.empty();
        },
        unshift: function (data, callback) {
            _insert(data, true, callback);
        },
        process: function () {
            // Avoid trying to start too many processing operations. This can occur
            // when callbacks resolve synchronously (#1267).
            if (isProcessing) {
                return;
            }
            isProcessing = true;
            while (!q.paused && workers < q.concurrency && q._tasks.length) {
                var tasks = [],
                    data = [];
                var l = q._tasks.length;
                if (q.payload) l = Math.min(l, q.payload);
                for (var i = 0; i < l; i++) {
                    var node = q._tasks.shift();
                    tasks.push(node);
                    data.push(node.data);
                }

                if (q._tasks.length === 0) {
                    q.empty();
                }
                workers += 1;
                workersList.push(tasks[0]);

                if (workers === q.concurrency) {
                    q.saturated();
                }

                var cb = onlyOnce(_next(tasks));
                worker(data, cb);
            }
            isProcessing = false;
        },
        length: function () {
            return q._tasks.length;
        },
        running: function () {
            return workers;
        },
        workersList: function () {
            return workersList;
        },
        idle: function () {
            return q._tasks.length + workers === 0;
        },
        pause: function () {
            q.paused = true;
        },
        resume: function () {
            if (q.paused === false) {
                return;
            }
            q.paused = false;
            setImmediate$1(q.process);
        }
    };
    return q;
}

/**
 * A cargo of tasks for the worker function to complete. Cargo inherits all of
 * the same methods and event callbacks as [`queue`]{@link module:ControlFlow.queue}.
 * @typedef {Object} CargoObject
 * @memberOf module:ControlFlow
 * @property {Function} length - A function returning the number of items
 * waiting to be processed. Invoke like `cargo.length()`.
 * @property {number} payload - An `integer` for determining how many tasks
 * should be process per round. This property can be changed after a `cargo` is
 * created to alter the payload on-the-fly.
 * @property {Function} push - Adds `task` to the `queue`. The callback is
 * called once the `worker` has finished processing the task. Instead of a
 * single task, an array of `tasks` can be submitted. The respective callback is
 * used for every task in the list. Invoke like `cargo.push(task, [callback])`.
 * @property {Function} saturated - A callback that is called when the
 * `queue.length()` hits the concurrency and further tasks will be queued.
 * @property {Function} empty - A callback that is called when the last item
 * from the `queue` is given to a `worker`.
 * @property {Function} drain - A callback that is called when the last item
 * from the `queue` has returned from the `worker`.
 * @property {Function} idle - a function returning false if there are items
 * waiting or being processed, or true if not. Invoke like `cargo.idle()`.
 * @property {Function} pause - a function that pauses the processing of tasks
 * until `resume()` is called. Invoke like `cargo.pause()`.
 * @property {Function} resume - a function that resumes the processing of
 * queued tasks when the queue is paused. Invoke like `cargo.resume()`.
 * @property {Function} kill - a function that removes the `drain` callback and
 * empties remaining tasks from the queue forcing it to go idle. Invoke like `cargo.kill()`.
 */

/**
 * Creates a `cargo` object with the specified payload. Tasks added to the
 * cargo will be processed altogether (up to the `payload` limit). If the
 * `worker` is in progress, the task is queued until it becomes available. Once
 * the `worker` has completed some tasks, each callback of those tasks is
 * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
 * for how `cargo` and `queue` work.
 *
 * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
 * at a time, cargo passes an array of tasks to a single worker, repeating
 * when the worker is finished.
 *
 * @name cargo
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.queue]{@link module:ControlFlow.queue}
 * @category Control Flow
 * @param {Function} worker - An asynchronous function for processing an array
 * of queued tasks, which must call its `callback(err)` argument when finished,
 * with an optional `err` argument. Invoked with `(tasks, callback)`.
 * @param {number} [payload=Infinity] - An optional `integer` for determining
 * how many tasks should be processed per round; if omitted, the default is
 * unlimited.
 * @returns {module:ControlFlow.CargoObject} A cargo object to manage the tasks. Callbacks can
 * attached as certain properties to listen for specific events during the
 * lifecycle of the cargo and inner queue.
 * @example
 *
 * // create a cargo object with payload 2
 * var cargo = async.cargo(function(tasks, callback) {
 *     for (var i=0; i<tasks.length; i++) {
 *         console.log('hello ' + tasks[i].name);
 *     }
 *     callback();
 * }, 2);
 *
 * // add some items
 * cargo.push({name: 'foo'}, function(err) {
 *     console.log('finished processing foo');
 * });
 * cargo.push({name: 'bar'}, function(err) {
 *     console.log('finished processing bar');
 * });
 * cargo.push({name: 'baz'}, function(err) {
 *     console.log('finished processing baz');
 * });
 */
function cargo(worker, payload) {
  return queue(worker, 1, payload);
}

/**
 * The same as [`eachOf`]{@link module:Collections.eachOf} but runs only a single async operation at a time.
 *
 * @name eachOfSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.eachOf]{@link module:Collections.eachOf}
 * @alias forEachOfSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`. The
 * `key` is the item's key, or index in the case of an array. The iteratee is
 * passed a `callback(err)` which must be called once it has completed. If no
 * error has occurred, the callback should be run without arguments or with an
 * explicit `null` argument. Invoked with (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Invoked with (err).
 */
var eachOfSeries = doLimit(eachOfLimit, 1);

/**
 * Reduces `coll` into a single value using an async `iteratee` to return each
 * successive step. `memo` is the initial state of the reduction. This function
 * only operates in series.
 *
 * For performance reasons, it may make sense to split a call to this function
 * into a parallel map, and then use the normal `Array.prototype.reduce` on the
 * results. This function is for situations where each step in the reduction
 * needs to be async; if you can get the data before reducing it, then it's
 * probably a good idea to do so.
 *
 * @name reduce
 * @static
 * @memberOf module:Collections
 * @method
 * @alias inject
 * @alias foldl
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {*} memo - The initial state of the reduction.
 * @param {Function} iteratee - A function applied to each item in the
 * array to produce the next step in the reduction. The `iteratee` is passed a
 * `callback(err, reduction)` which accepts an optional error as its first
 * argument, and the state of the reduction as the second. If an error is
 * passed to the callback, the reduction is stopped and the main `callback` is
 * immediately called with the error. Invoked with (memo, item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the reduced value. Invoked with
 * (err, result).
 * @example
 *
 * async.reduce([1,2,3], 0, function(memo, item, callback) {
 *     // pointless async:
 *     process.nextTick(function() {
 *         callback(null, memo + item)
 *     });
 * }, function(err, result) {
 *     // result is now equal to the last value of memo, which is 6
 * });
 */
function reduce(coll, memo, iteratee, callback) {
    callback = once(callback || noop);
    eachOfSeries(coll, function (x, i, callback) {
        iteratee(memo, x, function (err, v) {
            memo = v;
            callback(err);
        });
    }, function (err) {
        callback(err, memo);
    });
}

/**
 * Version of the compose function that is more natural to read. Each function
 * consumes the return value of the previous function. It is the equivalent of
 * [compose]{@link module:ControlFlow.compose} with the arguments reversed.
 *
 * Each function is executed with the `this` binding of the composed function.
 *
 * @name seq
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.compose]{@link module:ControlFlow.compose}
 * @category Control Flow
 * @param {...Function} functions - the asynchronous functions to compose
 * @returns {Function} a function that composes the `functions` in order
 * @example
 *
 * // Requires lodash (or underscore), express3 and dresende's orm2.
 * // Part of an app, that fetches cats of the logged user.
 * // This example uses `seq` function to avoid overnesting and error
 * // handling clutter.
 * app.get('/cats', function(request, response) {
 *     var User = request.models.User;
 *     async.seq(
 *         _.bind(User.get, User),  // 'User.get' has signature (id, callback(err, data))
 *         function(user, fn) {
 *             user.getCats(fn);      // 'getCats' has signature (callback(err, data))
 *         }
 *     )(req.session.user_id, function (err, cats) {
 *         if (err) {
 *             console.error(err);
 *             response.json({ status: 'error', message: err.message });
 *         } else {
 *             response.json({ status: 'ok', message: 'Cats found', data: cats });
 *         }
 *     });
 * });
 */
var seq$1 = rest(function seq(functions) {
    return rest(function (args) {
        var that = this;

        var cb = args[args.length - 1];
        if (typeof cb == 'function') {
            args.pop();
        } else {
            cb = noop;
        }

        reduce(functions, args, function (newargs, fn, cb) {
            fn.apply(that, newargs.concat(rest(function (err, nextargs) {
                cb(err, nextargs);
            })));
        }, function (err, results) {
            cb.apply(that, [err].concat(results));
        });
    });
});

/**
 * Creates a function which is a composition of the passed asynchronous
 * functions. Each function consumes the return value of the function that
 * follows. Composing functions `f()`, `g()`, and `h()` would produce the result
 * of `f(g(h()))`, only this version uses callbacks to obtain the return values.
 *
 * Each function is executed with the `this` binding of the composed function.
 *
 * @name compose
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {...Function} functions - the asynchronous functions to compose
 * @returns {Function} an asynchronous function that is the composed
 * asynchronous `functions`
 * @example
 *
 * function add1(n, callback) {
 *     setTimeout(function () {
 *         callback(null, n + 1);
 *     }, 10);
 * }
 *
 * function mul3(n, callback) {
 *     setTimeout(function () {
 *         callback(null, n * 3);
 *     }, 10);
 * }
 *
 * var add1mul3 = async.compose(mul3, add1);
 * add1mul3(4, function (err, result) {
 *     // result now equals 15
 * });
 */
var compose = rest(function (args) {
  return seq$1.apply(null, args.reverse());
});

function concat$1(eachfn, arr, fn, callback) {
    var result = [];
    eachfn(arr, function (x, index, cb) {
        fn(x, function (err, y) {
            result = result.concat(y || []);
            cb(err);
        });
    }, function (err) {
        callback(err, result);
    });
}

/**
 * Applies `iteratee` to each item in `coll`, concatenating the results. Returns
 * the concatenated list. The `iteratee`s are called in parallel, and the
 * results are concatenated as they return. There is no guarantee that the
 * results array will be returned in the original order of `coll` passed to the
 * `iteratee` function.
 *
 * @name concat
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, results)` which must be called once
 * it has completed with an error (which can be `null`) and an array of results.
 * Invoked with (item, callback).
 * @param {Function} [callback(err)] - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is an array
 * containing the concatenated results of the `iteratee` function. Invoked with
 * (err, results).
 * @example
 *
 * async.concat(['dir1','dir2','dir3'], fs.readdir, function(err, files) {
 *     // files is now a list of filenames that exist in the 3 directories
 * });
 */
var concat = doParallel(concat$1);

function doSeries(fn) {
    return function (obj, iteratee, callback) {
        return fn(eachOfSeries, obj, iteratee, callback);
    };
}

/**
 * The same as [`concat`]{@link module:Collections.concat} but runs only a single async operation at a time.
 *
 * @name concatSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.concat]{@link module:Collections.concat}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, results)` which must be called once
 * it has completed with an error (which can be `null`) and an array of results.
 * Invoked with (item, callback).
 * @param {Function} [callback(err)] - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is an array
 * containing the concatenated results of the `iteratee` function. Invoked with
 * (err, results).
 */
var concatSeries = doSeries(concat$1);

/**
 * Returns a function that when called, calls-back with the values provided.
 * Useful as the first function in a [`waterfall`]{@link module:ControlFlow.waterfall}, or for plugging values in to
 * [`auto`]{@link module:ControlFlow.auto}.
 *
 * @name constant
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {...*} arguments... - Any number of arguments to automatically invoke
 * callback with.
 * @returns {Function} Returns a function that when invoked, automatically
 * invokes the callback with the previous given arguments.
 * @example
 *
 * async.waterfall([
 *     async.constant(42),
 *     function (value, next) {
 *         // value === 42
 *     },
 *     //...
 * ], callback);
 *
 * async.waterfall([
 *     async.constant(filename, "utf8"),
 *     fs.readFile,
 *     function (fileData, next) {
 *         //...
 *     }
 *     //...
 * ], callback);
 *
 * async.auto({
 *     hostname: async.constant("https://server.net/"),
 *     port: findFreePort,
 *     launchServer: ["hostname", "port", function (options, cb) {
 *         startServer(options, cb);
 *     }],
 *     //...
 * }, callback);
 */
var constant = rest(function (values) {
    var args = [null].concat(values);
    return initialParams(function (ignoredArgs, callback) {
        return callback.apply(this, args);
    });
});

function _createTester(check, getResult) {
    return function (eachfn, arr, iteratee, cb) {
        cb = cb || noop;
        var testPassed = false;
        var testResult;
        eachfn(arr, function (value, _, callback) {
            iteratee(value, function (err, result) {
                if (err) {
                    callback(err);
                } else if (check(result) && !testResult) {
                    testPassed = true;
                    testResult = getResult(true, value);
                    callback(null, breakLoop);
                } else {
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                cb(err);
            } else {
                cb(null, testPassed ? testResult : getResult(false));
            }
        });
    };
}

function _findGetResult(v, x) {
    return x;
}

/**
 * Returns the first value in `coll` that passes an async truth test. The
 * `iteratee` is applied in parallel, meaning the first iteratee to return
 * `true` will fire the detect `callback` with that result. That means the
 * result might not be the first item in the original `coll` (in terms of order)
 * that passes the test.

 * If order within the original `coll` is important, then look at
 * [`detectSeries`]{@link module:Collections.detectSeries}.
 *
 * @name detect
 * @static
 * @memberOf module:Collections
 * @method
 * @alias find
 * @category Collections
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, truthValue)` which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 * @example
 *
 * async.detect(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, result) {
 *     // result now equals the first file in the list that exists
 * });
 */
var detect = doParallel(_createTester(identity, _findGetResult));

/**
 * The same as [`detect`]{@link module:Collections.detect} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name detectLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.detect]{@link module:Collections.detect}
 * @alias findLimit
 * @category Collections
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, truthValue)` which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 */
var detectLimit = doParallelLimit(_createTester(identity, _findGetResult));

/**
 * The same as [`detect`]{@link module:Collections.detect} but runs only a single async operation at a time.
 *
 * @name detectSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.detect]{@link module:Collections.detect}
 * @alias findSeries
 * @category Collections
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, truthValue)` which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 */
var detectSeries = doLimit(detectLimit, 1);

function consoleFunc(name) {
    return rest(function (fn, args) {
        fn.apply(null, args.concat(rest(function (err, args) {
            if (typeof console === 'object') {
                if (err) {
                    if (console.error) {
                        console.error(err);
                    }
                } else if (console[name]) {
                    arrayEach(args, function (x) {
                        console[name](x);
                    });
                }
            }
        })));
    });
}

/**
 * Logs the result of an `async` function to the `console` using `console.dir`
 * to display the properties of the resulting object. Only works in Node.js or
 * in browsers that support `console.dir` and `console.error` (such as FF and
 * Chrome). If multiple arguments are returned from the async function,
 * `console.dir` is called on each argument in order.
 *
 * @name dir
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} function - The function you want to eventually apply all
 * arguments to.
 * @param {...*} arguments... - Any number of arguments to apply to the function.
 * @example
 *
 * // in a module
 * var hello = function(name, callback) {
 *     setTimeout(function() {
 *         callback(null, {hello: name});
 *     }, 1000);
 * };
 *
 * // in the node repl
 * node> async.dir(hello, 'world');
 * {hello: 'world'}
 */
var dir = consoleFunc('dir');

/**
 * The post-check version of [`during`]{@link module:ControlFlow.during}. To reflect the difference in
 * the order of operations, the arguments `test` and `fn` are switched.
 *
 * Also a version of [`doWhilst`]{@link module:ControlFlow.doWhilst} with asynchronous `test` function.
 * @name doDuring
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.during]{@link module:ControlFlow.during}
 * @category Control Flow
 * @param {Function} fn - A function which is called each time `test` passes.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} test - asynchronous truth test to perform before each
 * execution of `fn`. Invoked with (...args, callback), where `...args` are the
 * non-error args from the previous callback of `fn`.
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error if one occured, otherwise `null`.
 */
function doDuring(fn, test, callback) {
    callback = onlyOnce(callback || noop);

    var next = rest(function (err, args) {
        if (err) return callback(err);
        args.push(check);
        test.apply(this, args);
    });

    function check(err, truth) {
        if (err) return callback(err);
        if (!truth) return callback(null);
        fn(next);
    }

    check(null, true);
}

/**
 * The post-check version of [`whilst`]{@link module:ControlFlow.whilst}. To reflect the difference in
 * the order of operations, the arguments `test` and `iteratee` are switched.
 *
 * `doWhilst` is to `whilst` as `do while` is to `while` in plain JavaScript.
 *
 * @name doWhilst
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.whilst]{@link module:ControlFlow.whilst}
 * @category Control Flow
 * @param {Function} iteratee - A function which is called each time `test`
 * passes. The function is passed a `callback(err)`, which must be called once
 * it has completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} test - synchronous truth test to perform after each
 * execution of `iteratee`. Invoked with the non-error callback results of 
 * `iteratee`.
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `iteratee` has stopped.
 * `callback` will be passed an error and any arguments passed to the final
 * `iteratee`'s callback. Invoked with (err, [results]);
 */
function doWhilst(iteratee, test, callback) {
    callback = onlyOnce(callback || noop);
    var next = rest(function (err, args) {
        if (err) return callback(err);
        if (test.apply(this, args)) return iteratee(next);
        callback.apply(null, [null].concat(args));
    });
    iteratee(next);
}

/**
 * Like ['doWhilst']{@link module:ControlFlow.doWhilst}, except the `test` is inverted. Note the
 * argument ordering differs from `until`.
 *
 * @name doUntil
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.doWhilst]{@link module:ControlFlow.doWhilst}
 * @category Control Flow
 * @param {Function} fn - A function which is called each time `test` fails.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} test - synchronous truth test to perform after each
 * execution of `fn`. Invoked with the non-error callback results of `fn`.
 * @param {Function} [callback] - A callback which is called after the test
 * function has passed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error and any arguments passed to the final `fn`'s
 * callback. Invoked with (err, [results]);
 */
function doUntil(fn, test, callback) {
    doWhilst(fn, function () {
        return !test.apply(this, arguments);
    }, callback);
}

/**
 * Like [`whilst`]{@link module:ControlFlow.whilst}, except the `test` is an asynchronous function that
 * is passed a callback in the form of `function (err, truth)`. If error is
 * passed to `test` or `fn`, the main callback is immediately called with the
 * value of the error.
 *
 * @name during
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.whilst]{@link module:ControlFlow.whilst}
 * @category Control Flow
 * @param {Function} test - asynchronous truth test to perform before each
 * execution of `fn`. Invoked with (callback).
 * @param {Function} fn - A function which is called each time `test` passes.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error, if one occured, otherwise `null`.
 * @example
 *
 * var count = 0;
 *
 * async.during(
 *     function (callback) {
 *         return callback(null, count < 5);
 *     },
 *     function (callback) {
 *         count++;
 *         setTimeout(callback, 1000);
 *     },
 *     function (err) {
 *         // 5 seconds have passed
 *     }
 * );
 */
function during(test, fn, callback) {
    callback = onlyOnce(callback || noop);

    function next(err) {
        if (err) return callback(err);
        test(check);
    }

    function check(err, truth) {
        if (err) return callback(err);
        if (!truth) return callback(null);
        fn(next);
    }

    test(check);
}

function _withoutIndex(iteratee) {
    return function (value, index, callback) {
        return iteratee(value, callback);
    };
}

/**
 * Applies the function `iteratee` to each item in `coll`, in parallel.
 * The `iteratee` is called with an item from the list, and a callback for when
 * it has finished. If the `iteratee` passes an error to its `callback`, the
 * main `callback` (for the `each` function) is immediately called with the
 * error.
 *
 * Note, that since this function applies `iteratee` to each item in parallel,
 * there is no guarantee that the iteratee functions will complete in order.
 *
 * @name each
 * @static
 * @memberOf module:Collections
 * @method
 * @alias forEach
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item
 * in `coll`. The iteratee is passed a `callback(err)` which must be called once
 * it has completed. If no error has occurred, the `callback` should be run
 * without arguments or with an explicit `null` argument. The array index is not
 * passed to the iteratee. Invoked with (item, callback). If you need the index,
 * use `eachOf`.
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 * @example
 *
 * // assuming openFiles is an array of file names and saveFile is a function
 * // to save the modified contents of that file:
 *
 * async.each(openFiles, saveFile, function(err){
 *   // if any of the saves produced an error, err would equal that error
 * });
 *
 * // assuming openFiles is an array of file names
 * async.each(openFiles, function(file, callback) {
 *
 *     // Perform operation on file here.
 *     console.log('Processing file ' + file);
 *
 *     if( file.length > 32 ) {
 *       console.log('This file name is too long');
 *       callback('File name too long');
 *     } else {
 *       // Do work to process file here
 *       console.log('File processed');
 *       callback();
 *     }
 * }, function(err) {
 *     // if any of the file processing produced an error, err would equal that error
 *     if( err ) {
 *       // One of the iterations produced an error.
 *       // All processing will now stop.
 *       console.log('A file failed to process');
 *     } else {
 *       console.log('All files have been processed successfully');
 *     }
 * });
 */
function eachLimit(coll, iteratee, callback) {
  eachOf(coll, _withoutIndex(iteratee), callback);
}

/**
 * The same as [`each`]{@link module:Collections.each} but runs a maximum of `limit` async operations at a time.
 *
 * @name eachLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.each]{@link module:Collections.each}
 * @alias forEachLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A function to apply to each item in `coll`. The
 * iteratee is passed a `callback(err)` which must be called once it has
 * completed. If no error has occurred, the `callback` should be run without
 * arguments or with an explicit `null` argument. The array index is not passed
 * to the iteratee. Invoked with (item, callback). If you need the index, use
 * `eachOfLimit`.
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
function eachLimit$1(coll, limit, iteratee, callback) {
  _eachOfLimit(limit)(coll, _withoutIndex(iteratee), callback);
}

/**
 * The same as [`each`]{@link module:Collections.each} but runs only a single async operation at a time.
 *
 * @name eachSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.each]{@link module:Collections.each}
 * @alias forEachSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each
 * item in `coll`. The iteratee is passed a `callback(err)` which must be called
 * once it has completed. If no error has occurred, the `callback` should be run
 * without arguments or with an explicit `null` argument. The array index is
 * not passed to the iteratee. Invoked with (item, callback). If you need the
 * index, use `eachOfSeries`.
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
var eachSeries = doLimit(eachLimit$1, 1);

/**
 * Wrap an async function and ensure it calls its callback on a later tick of
 * the event loop.  If the function already calls its callback on a next tick,
 * no extra deferral is added. This is useful for preventing stack overflows
 * (`RangeError: Maximum call stack size exceeded`) and generally keeping
 * [Zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony)
 * contained.
 *
 * @name ensureAsync
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} fn - an async function, one that expects a node-style
 * callback as its last argument.
 * @returns {Function} Returns a wrapped function with the exact same call
 * signature as the function passed in.
 * @example
 *
 * function sometimesAsync(arg, callback) {
 *     if (cache[arg]) {
 *         return callback(null, cache[arg]); // this would be synchronous!!
 *     } else {
 *         doSomeIO(arg, callback); // this IO would be asynchronous
 *     }
 * }
 *
 * // this has a risk of stack overflows if many results are cached in a row
 * async.mapSeries(args, sometimesAsync, done);
 *
 * // this will defer sometimesAsync's callback if necessary,
 * // preventing stack overflows
 * async.mapSeries(args, async.ensureAsync(sometimesAsync), done);
 */
function ensureAsync(fn) {
    return initialParams(function (args, callback) {
        var sync = true;
        args.push(function () {
            var innerArgs = arguments;
            if (sync) {
                setImmediate$1(function () {
                    callback.apply(null, innerArgs);
                });
            } else {
                callback.apply(null, innerArgs);
            }
        });
        fn.apply(this, args);
        sync = false;
    });
}

function notId(v) {
    return !v;
}

/**
 * Returns `true` if every element in `coll` satisfies an async test. If any
 * iteratee call returns `false`, the main `callback` is immediately called.
 *
 * @name every
 * @static
 * @memberOf module:Collections
 * @method
 * @alias all
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in the
 * collection in parallel. The iteratee is passed a `callback(err, truthValue)`
 * which must be called with a  boolean argument once it has completed. Invoked
 * with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 * @example
 *
 * async.every(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, result) {
 *     // if result is true then every file exists
 * });
 */
var every = doParallel(_createTester(notId, notId));

/**
 * The same as [`every`]{@link module:Collections.every} but runs a maximum of `limit` async operations at a time.
 *
 * @name everyLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.every]{@link module:Collections.every}
 * @alias allLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in the
 * collection in parallel. The iteratee is passed a `callback(err, truthValue)`
 * which must be called with a  boolean argument once it has completed. Invoked
 * with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 */
var everyLimit = doParallelLimit(_createTester(notId, notId));

/**
 * The same as [`every`]{@link module:Collections.every} but runs only a single async operation at a time.
 *
 * @name everySeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.every]{@link module:Collections.every}
 * @alias allSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in the
 * collection in parallel. The iteratee is passed a `callback(err, truthValue)`
 * which must be called with a  boolean argument once it has completed. Invoked
 * with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 */
var everySeries = doLimit(everyLimit, 1);

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

function filterArray(eachfn, arr, iteratee, callback) {
    var truthValues = new Array(arr.length);
    eachfn(arr, function (x, index, callback) {
        iteratee(x, function (err, v) {
            truthValues[index] = !!v;
            callback(err);
        });
    }, function (err) {
        if (err) return callback(err);
        var results = [];
        for (var i = 0; i < arr.length; i++) {
            if (truthValues[i]) results.push(arr[i]);
        }
        callback(null, results);
    });
}

function filterGeneric(eachfn, coll, iteratee, callback) {
    var results = [];
    eachfn(coll, function (x, index, callback) {
        iteratee(x, function (err, v) {
            if (err) {
                callback(err);
            } else {
                if (v) {
                    results.push({ index: index, value: x });
                }
                callback();
            }
        });
    }, function (err) {
        if (err) {
            callback(err);
        } else {
            callback(null, arrayMap(results.sort(function (a, b) {
                return a.index - b.index;
            }), baseProperty('value')));
        }
    });
}

function _filter(eachfn, coll, iteratee, callback) {
    var filter = isArrayLike(coll) ? filterArray : filterGeneric;
    filter(eachfn, coll, iteratee, callback || noop);
}

/**
 * Returns a new array of all the values in `coll` which pass an async truth
 * test. This operation is performed in parallel, but the results array will be
 * in the same order as the original.
 *
 * @name filter
 * @static
 * @memberOf module:Collections
 * @method
 * @alias select
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 * @example
 *
 * async.filter(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, results) {
 *     // results now equals an array of the existing files
 * });
 */
var filter = doParallel(_filter);

/**
 * The same as [`filter`]{@link module:Collections.filter} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name filterLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @alias selectLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 */
var filterLimit = doParallelLimit(_filter);

/**
 * The same as [`filter`]{@link module:Collections.filter} but runs only a single async operation at a time.
 *
 * @name filterSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @alias selectSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results)
 */
var filterSeries = doLimit(filterLimit, 1);

/**
 * Calls the asynchronous function `fn` with a callback parameter that allows it
 * to call itself again, in series, indefinitely.

 * If an error is passed to the
 * callback then `errback` is called with the error, and execution stops,
 * otherwise it will never be called.
 *
 * @name forever
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Function} fn - a function to call repeatedly. Invoked with (next).
 * @param {Function} [errback] - when `fn` passes an error to it's callback,
 * this function will be called, and execution stops. Invoked with (err).
 * @example
 *
 * async.forever(
 *     function(next) {
 *         // next is suitable for passing to things that need a callback(err [, whatever]);
 *         // it will result in this function being called again.
 *     },
 *     function(err) {
 *         // if next is called with a value in its first parameter, it will appear
 *         // in here as 'err', and execution will stop.
 *     }
 * );
 */
function forever(fn, errback) {
    var done = onlyOnce(errback || noop);
    var task = ensureAsync(fn);

    function next(err) {
        if (err) return done(err);
        task(next);
    }
    next();
}

/**
 * Logs the result of an `async` function to the `console`. Only works in
 * Node.js or in browsers that support `console.log` and `console.error` (such
 * as FF and Chrome). If multiple arguments are returned from the async
 * function, `console.log` is called on each argument in order.
 *
 * @name log
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} function - The function you want to eventually apply all
 * arguments to.
 * @param {...*} arguments... - Any number of arguments to apply to the function.
 * @example
 *
 * // in a module
 * var hello = function(name, callback) {
 *     setTimeout(function() {
 *         callback(null, 'hello ' + name);
 *     }, 1000);
 * };
 *
 * // in the node repl
 * node> async.log(hello, 'world');
 * 'hello world'
 */
var log = consoleFunc('log');

/**
 * The same as [`mapValues`]{@link module:Collections.mapValues} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name mapValuesLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.mapValues]{@link module:Collections.mapValues}
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A function to apply to each value in `obj`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a
 * transformed value. Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 */
function mapValuesLimit(obj, limit, iteratee, callback) {
    callback = once(callback || noop);
    var newObj = {};
    eachOfLimit(obj, limit, function (val, key, next) {
        iteratee(val, key, function (err, result) {
            if (err) return next(err);
            newObj[key] = result;
            next();
        });
    }, function (err) {
        callback(err, newObj);
    });
}

/**
 * A relative of [`map`]{@link module:Collections.map}, designed for use with objects.
 *
 * Produces a new Object by mapping each value of `obj` through the `iteratee`
 * function. The `iteratee` is called each `value` and `key` from `obj` and a
 * callback for when it has finished processing. Each of these callbacks takes
 * two arguments: an `error`, and the transformed item from `obj`. If `iteratee`
 * passes an error to its callback, the main `callback` (for the `mapValues`
 * function) is immediately called with the error.
 *
 * Note, the order of the keys in the result is not guaranteed.  The keys will
 * be roughly in the order they complete, (but this is very engine-specific)
 *
 * @name mapValues
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each value and key in
 * `coll`. The iteratee is passed a `callback(err, transformed)` which must be
 * called once it has completed with an error (which can be `null`) and a
 * transformed value. Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 * @example
 *
 * async.mapValues({
 *     f1: 'file1',
 *     f2: 'file2',
 *     f3: 'file3'
 * }, function (file, key, callback) {
 *   fs.stat(file, callback);
 * }, function(err, result) {
 *     // result is now a map of stats for each file, e.g.
 *     // {
 *     //     f1: [stats for file1],
 *     //     f2: [stats for file2],
 *     //     f3: [stats for file3]
 *     // }
 * });
 */

var mapValues = doLimit(mapValuesLimit, Infinity);

/**
 * The same as [`mapValues`]{@link module:Collections.mapValues} but runs only a single async operation at a time.
 *
 * @name mapValuesSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.mapValues]{@link module:Collections.mapValues}
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each value in `obj`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a
 * transformed value. Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 */
var mapValuesSeries = doLimit(mapValuesLimit, 1);

function has(obj, key) {
    return key in obj;
}

/**
 * Caches the results of an `async` function. When creating a hash to store
 * function results against, the callback is omitted from the hash and an
 * optional hash function can be used.
 *
 * If no hash function is specified, the first argument is used as a hash key,
 * which may work reasonably if it is a string or a data type that converts to a
 * distinct string. Note that objects and arrays will not behave reasonably.
 * Neither will cases where the other arguments are significant. In such cases,
 * specify your own hash function.
 *
 * The cache of results is exposed as the `memo` property of the function
 * returned by `memoize`.
 *
 * @name memoize
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} fn - The function to proxy and cache results from.
 * @param {Function} hasher - An optional function for generating a custom hash
 * for storing results. It has all the arguments applied to it apart from the
 * callback, and must be synchronous.
 * @returns {Function} a memoized version of `fn`
 * @example
 *
 * var slow_fn = function(name, callback) {
 *     // do something
 *     callback(null, result);
 * };
 * var fn = async.memoize(slow_fn);
 *
 * // fn can now be used as if it were slow_fn
 * fn('some name', function() {
 *     // callback
 * });
 */
function memoize(fn, hasher) {
    var memo = Object.create(null);
    var queues = Object.create(null);
    hasher = hasher || identity;
    var memoized = initialParams(function memoized(args, callback) {
        var key = hasher.apply(null, args);
        if (has(memo, key)) {
            setImmediate$1(function () {
                callback.apply(null, memo[key]);
            });
        } else if (has(queues, key)) {
            queues[key].push(callback);
        } else {
            queues[key] = [callback];
            fn.apply(null, args.concat(rest(function (args) {
                memo[key] = args;
                var q = queues[key];
                delete queues[key];
                for (var i = 0, l = q.length; i < l; i++) {
                    q[i].apply(null, args);
                }
            })));
        }
    });
    memoized.memo = memo;
    memoized.unmemoized = fn;
    return memoized;
}

/**
 * Calls `callback` on a later loop around the event loop. In Node.js this just
 * calls `setImmediate`.  In the browser it will use `setImmediate` if
 * available, otherwise `setTimeout(callback, 0)`, which means other higher
 * priority events may precede the execution of `callback`.
 *
 * This is used internally for browser-compatibility purposes.
 *
 * @name nextTick
 * @static
 * @memberOf module:Utils
 * @method
 * @alias setImmediate
 * @category Util
 * @param {Function} callback - The function to call on a later loop around
 * the event loop. Invoked with (args...).
 * @param {...*} args... - any number of additional arguments to pass to the
 * callback on the next tick.
 * @example
 *
 * var call_order = [];
 * async.nextTick(function() {
 *     call_order.push('two');
 *     // call_order now equals ['one','two']
 * });
 * call_order.push('one');
 *
 * async.setImmediate(function (a, b, c) {
 *     // a, b, and c equal 1, 2, and 3
 * }, 1, 2, 3);
 */
var _defer$1;

if (hasNextTick) {
    _defer$1 = process.nextTick;
} else if (hasSetImmediate) {
    _defer$1 = setImmediate;
} else {
    _defer$1 = fallback;
}

var nextTick = wrap(_defer$1);

function _parallel(eachfn, tasks, callback) {
    callback = callback || noop;
    var results = isArrayLike(tasks) ? [] : {};

    eachfn(tasks, function (task, key, callback) {
        task(rest(function (err, args) {
            if (args.length <= 1) {
                args = args[0];
            }
            results[key] = args;
            callback(err);
        }));
    }, function (err) {
        callback(err, results);
    });
}

/**
 * Run the `tasks` collection of functions in parallel, without waiting until
 * the previous function has completed. If any of the functions pass an error to
 * its callback, the main `callback` is immediately called with the value of the
 * error. Once the `tasks` have completed, the results are passed to the final
 * `callback` as an array.
 *
 * **Note:** `parallel` is about kicking-off I/O tasks in parallel, not about
 * parallel execution of code.  If your tasks do not use any timers or perform
 * any I/O, they will actually be executed in series.  Any synchronous setup
 * sections for each task will happen one after the other.  JavaScript remains
 * single-threaded.
 *
 * It is also possible to use an object instead of an array. Each property will
 * be run as a function and the results will be passed to the final `callback`
 * as an object instead of an array. This can be a more readable way of handling
 * results from {@link async.parallel}.
 *
 * @name parallel
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} tasks - A collection containing functions to run.
 * Each function is passed a `callback(err, result)` which it must call on
 * completion with an error `err` (which can be `null`) and an optional `result`
 * value.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed successfully. This function gets a results array
 * (or object) containing all the result arguments passed to the task callbacks.
 * Invoked with (err, results).
 * @example
 * async.parallel([
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ],
 * // optional callback
 * function(err, results) {
 *     // the results array will equal ['one','two'] even though
 *     // the second function had a shorter timeout.
 * });
 *
 * // an example using an object instead of an array
 * async.parallel({
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 1);
 *         }, 200);
 *     },
 *     two: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 2);
 *         }, 100);
 *     }
 * }, function(err, results) {
 *     // results is now equals to: {one: 1, two: 2}
 * });
 */
function parallelLimit(tasks, callback) {
  _parallel(eachOf, tasks, callback);
}

/**
 * The same as [`parallel`]{@link module:ControlFlow.parallel} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name parallelLimit
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.parallel]{@link module:ControlFlow.parallel}
 * @category Control Flow
 * @param {Array|Collection} tasks - A collection containing functions to run.
 * Each function is passed a `callback(err, result)` which it must call on
 * completion with an error `err` (which can be `null`) and an optional `result`
 * value.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed successfully. This function gets a results array
 * (or object) containing all the result arguments passed to the task callbacks.
 * Invoked with (err, results).
 */
function parallelLimit$1(tasks, limit, callback) {
  _parallel(_eachOfLimit(limit), tasks, callback);
}

/**
 * A queue of tasks for the worker function to complete.
 * @typedef {Object} QueueObject
 * @memberOf module:ControlFlow
 * @property {Function} length - a function returning the number of items
 * waiting to be processed. Invoke with `queue.length()`.
 * @property {boolean} started - a boolean indicating whether or not any
 * items have been pushed and processed by the queue.
 * @property {Function} running - a function returning the number of items
 * currently being processed. Invoke with `queue.running()`.
 * @property {Function} workersList - a function returning the array of items
 * currently being processed. Invoke with `queue.workersList()`.
 * @property {Function} idle - a function returning false if there are items
 * waiting or being processed, or true if not. Invoke with `queue.idle()`.
 * @property {number} concurrency - an integer for determining how many `worker`
 * functions should be run in parallel. This property can be changed after a
 * `queue` is created to alter the concurrency on-the-fly.
 * @property {Function} push - add a new task to the `queue`. Calls `callback`
 * once the `worker` has finished processing the task. Instead of a single task,
 * a `tasks` array can be submitted. The respective callback is used for every
 * task in the list. Invoke with `queue.push(task, [callback])`,
 * @property {Function} unshift - add a new task to the front of the `queue`.
 * Invoke with `queue.unshift(task, [callback])`.
 * @property {Function} saturated - a callback that is called when the number of
 * running workers hits the `concurrency` limit, and further tasks will be
 * queued.
 * @property {Function} unsaturated - a callback that is called when the number
 * of running workers is less than the `concurrency` & `buffer` limits, and
 * further tasks will not be queued.
 * @property {number} buffer - A minimum threshold buffer in order to say that
 * the `queue` is `unsaturated`.
 * @property {Function} empty - a callback that is called when the last item
 * from the `queue` is given to a `worker`.
 * @property {Function} drain - a callback that is called when the last item
 * from the `queue` has returned from the `worker`.
 * @property {Function} error - a callback that is called when a task errors.
 * Has the signature `function(error, task)`.
 * @property {boolean} paused - a boolean for determining whether the queue is
 * in a paused state.
 * @property {Function} pause - a function that pauses the processing of tasks
 * until `resume()` is called. Invoke with `queue.pause()`.
 * @property {Function} resume - a function that resumes the processing of
 * queued tasks when the queue is paused. Invoke with `queue.resume()`.
 * @property {Function} kill - a function that removes the `drain` callback and
 * empties remaining tasks from the queue forcing it to go idle. Invoke with `queue.kill()`.
 */

/**
 * Creates a `queue` object with the specified `concurrency`. Tasks added to the
 * `queue` are processed in parallel (up to the `concurrency` limit). If all
 * `worker`s are in progress, the task is queued until one becomes available.
 * Once a `worker` completes a `task`, that `task`'s callback is called.
 *
 * @name queue
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Function} worker - An asynchronous function for processing a queued
 * task, which must call its `callback(err)` argument when finished, with an
 * optional `error` as an argument.  If you want to handle errors from an
 * individual task, pass a callback to `q.push()`. Invoked with
 * (task, callback).
 * @param {number} [concurrency=1] - An `integer` for determining how many
 * `worker` functions should be run in parallel.  If omitted, the concurrency
 * defaults to `1`.  If the concurrency is `0`, an error is thrown.
 * @returns {module:ControlFlow.QueueObject} A queue object to manage the tasks. Callbacks can
 * attached as certain properties to listen for specific events during the
 * lifecycle of the queue.
 * @example
 *
 * // create a queue object with concurrency 2
 * var q = async.queue(function(task, callback) {
 *     console.log('hello ' + task.name);
 *     callback();
 * }, 2);
 *
 * // assign a callback
 * q.drain = function() {
 *     console.log('all items have been processed');
 * };
 *
 * // add some items to the queue
 * q.push({name: 'foo'}, function(err) {
 *     console.log('finished processing foo');
 * });
 * q.push({name: 'bar'}, function (err) {
 *     console.log('finished processing bar');
 * });
 *
 * // add some items to the queue (batch-wise)
 * q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
 *     console.log('finished processing item');
 * });
 *
 * // add some items to the front of the queue
 * q.unshift({name: 'bar'}, function (err) {
 *     console.log('finished processing bar');
 * });
 */
var queue$1 = function (worker, concurrency) {
  return queue(function (items, cb) {
    worker(items[0], cb);
  }, concurrency, 1);
};

/**
 * The same as [async.queue]{@link module:ControlFlow.queue} only tasks are assigned a priority and
 * completed in ascending priority order.
 *
 * @name priorityQueue
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.queue]{@link module:ControlFlow.queue}
 * @category Control Flow
 * @param {Function} worker - An asynchronous function for processing a queued
 * task, which must call its `callback(err)` argument when finished, with an
 * optional `error` as an argument.  If you want to handle errors from an
 * individual task, pass a callback to `q.push()`. Invoked with
 * (task, callback).
 * @param {number} concurrency - An `integer` for determining how many `worker`
 * functions should be run in parallel.  If omitted, the concurrency defaults to
 * `1`.  If the concurrency is `0`, an error is thrown.
 * @returns {module:ControlFlow.QueueObject} A priorityQueue object to manage the tasks. There are two
 * differences between `queue` and `priorityQueue` objects:
 * * `push(task, priority, [callback])` - `priority` should be a number. If an
 *   array of `tasks` is given, all tasks will be assigned the same priority.
 * * The `unshift` method was removed.
 */
var priorityQueue = function (worker, concurrency) {
    // Start with a normal queue
    var q = queue$1(worker, concurrency);

    // Override push to accept second parameter representing priority
    q.push = function (data, priority, callback) {
        if (callback == null) callback = noop;
        if (typeof callback !== 'function') {
            throw new Error('task callback must be a function');
        }
        q.started = true;
        if (!isArray(data)) {
            data = [data];
        }
        if (data.length === 0) {
            // call drain immediately if there are no tasks
            return setImmediate$1(function () {
                q.drain();
            });
        }

        priority = priority || 0;
        var nextNode = q._tasks.head;
        while (nextNode && priority >= nextNode.priority) {
            nextNode = nextNode.next;
        }

        for (var i = 0, l = data.length; i < l; i++) {
            var item = {
                data: data[i],
                priority: priority,
                callback: callback
            };

            if (nextNode) {
                q._tasks.insertBefore(nextNode, item);
            } else {
                q._tasks.push(item);
            }
        }
        setImmediate$1(q.process);
    };

    // Remove unshift function
    delete q.unshift;

    return q;
};

/**
 * Runs the `tasks` array of functions in parallel, without waiting until the
 * previous function has completed. Once any of the `tasks` complete or pass an
 * error to its callback, the main `callback` is immediately called. It's
 * equivalent to `Promise.race()`.
 *
 * @name race
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array} tasks - An array containing functions to run. Each function
 * is passed a `callback(err, result)` which it must call on completion with an
 * error `err` (which can be `null`) and an optional `result` value.
 * @param {Function} callback - A callback to run once any of the functions have
 * completed. This function gets an error or result from the first function that
 * completed. Invoked with (err, result).
 * @returns undefined
 * @example
 *
 * async.race([
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ],
 * // main callback
 * function(err, result) {
 *     // the result will be equal to 'two' as it finishes earlier
 * });
 */
function race(tasks, callback) {
    callback = once(callback || noop);
    if (!isArray(tasks)) return callback(new TypeError('First argument to race must be an array of functions'));
    if (!tasks.length) return callback();
    for (var i = 0, l = tasks.length; i < l; i++) {
        tasks[i](callback);
    }
}

var slice = Array.prototype.slice;

/**
 * Same as [`reduce`]{@link module:Collections.reduce}, only operates on `array` in reverse order.
 *
 * @name reduceRight
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reduce]{@link module:Collections.reduce}
 * @alias foldr
 * @category Collection
 * @param {Array} array - A collection to iterate over.
 * @param {*} memo - The initial state of the reduction.
 * @param {Function} iteratee - A function applied to each item in the
 * array to produce the next step in the reduction. The `iteratee` is passed a
 * `callback(err, reduction)` which accepts an optional error as its first
 * argument, and the state of the reduction as the second. If an error is
 * passed to the callback, the reduction is stopped and the main `callback` is
 * immediately called with the error. Invoked with (memo, item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the reduced value. Invoked with
 * (err, result).
 */
function reduceRight(array, memo, iteratee, callback) {
  var reversed = slice.call(array).reverse();
  reduce(reversed, memo, iteratee, callback);
}

/**
 * Wraps the function in another function that always returns data even when it
 * errors.
 *
 * The object returned has either the property `error` or `value`.
 *
 * @name reflect
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} fn - The function you want to wrap
 * @returns {Function} - A function that always passes null to it's callback as
 * the error. The second argument to the callback will be an `object` with
 * either an `error` or a `value` property.
 * @example
 *
 * async.parallel([
 *     async.reflect(function(callback) {
 *         // do some stuff ...
 *         callback(null, 'one');
 *     }),
 *     async.reflect(function(callback) {
 *         // do some more stuff but error ...
 *         callback('bad stuff happened');
 *     }),
 *     async.reflect(function(callback) {
 *         // do some more stuff ...
 *         callback(null, 'two');
 *     })
 * ],
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results[0].value = 'one'
 *     // results[1].error = 'bad stuff happened'
 *     // results[2].value = 'two'
 * });
 */
function reflect(fn) {
    return initialParams(function reflectOn(args, reflectCallback) {
        args.push(rest(function callback(err, cbArgs) {
            if (err) {
                reflectCallback(null, {
                    error: err
                });
            } else {
                var value = null;
                if (cbArgs.length === 1) {
                    value = cbArgs[0];
                } else if (cbArgs.length > 1) {
                    value = cbArgs;
                }
                reflectCallback(null, {
                    value: value
                });
            }
        }));

        return fn.apply(this, args);
    });
}

function reject$1(eachfn, arr, iteratee, callback) {
    _filter(eachfn, arr, function (value, cb) {
        iteratee(value, function (err, v) {
            cb(err, !v);
        });
    }, callback);
}

/**
 * The opposite of [`filter`]{@link module:Collections.filter}. Removes values that pass an `async` truth test.
 *
 * @name reject
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 * @example
 *
 * async.reject(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, results) {
 *     // results now equals an array of missing files
 *     createFiles(results);
 * });
 */
var reject = doParallel(reject$1);

/**
 * A helper function that wraps an array or an object of functions with reflect.
 *
 * @name reflectAll
 * @static
 * @memberOf module:Utils
 * @method
 * @see [async.reflect]{@link module:Utils.reflect}
 * @category Util
 * @param {Array} tasks - The array of functions to wrap in `async.reflect`.
 * @returns {Array} Returns an array of functions, each function wrapped in
 * `async.reflect`
 * @example
 *
 * let tasks = [
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         // do some more stuff but error ...
 *         callback(new Error('bad stuff happened'));
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ];
 *
 * async.parallel(async.reflectAll(tasks),
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results[0].value = 'one'
 *     // results[1].error = Error('bad stuff happened')
 *     // results[2].value = 'two'
 * });
 *
 * // an example using an object instead of an array
 * let tasks = {
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     two: function(callback) {
 *         callback('two');
 *     },
 *     three: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'three');
 *         }, 100);
 *     }
 * };
 *
 * async.parallel(async.reflectAll(tasks),
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results.one.value = 'one'
 *     // results.two.error = 'two'
 *     // results.three.value = 'three'
 * });
 */
function reflectAll(tasks) {
    var results;
    if (isArray(tasks)) {
        results = arrayMap(tasks, reflect);
    } else {
        results = {};
        baseForOwn(tasks, function (task, key) {
            results[key] = reflect.call(this, task);
        });
    }
    return results;
}

/**
 * The same as [`reject`]{@link module:Collections.reject} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name rejectLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reject]{@link module:Collections.reject}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 */
var rejectLimit = doParallelLimit(reject$1);

/**
 * The same as [`reject`]{@link module:Collections.reject} but runs only a single async operation at a time.
 *
 * @name rejectSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reject]{@link module:Collections.reject}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 */
var rejectSeries = doLimit(rejectLimit, 1);

/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant$1(value) {
  return function() {
    return value;
  };
}

/**
 * Attempts to get a successful response from `task` no more than `times` times
 * before returning an error. If the task is successful, the `callback` will be
 * passed the result of the successful task. If all attempts fail, the callback
 * will be passed the error and result (if any) of the final attempt.
 *
 * @name retry
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - Can be either an
 * object with `times` and `interval` or a number.
 * * `times` - The number of attempts to make before giving up.  The default
 *   is `5`.
 * * `interval` - The time to wait between retries, in milliseconds.  The
 *   default is `0`. The interval may also be specified as a function of the
 *   retry count (see example).
 * * `errorFilter` - An optional synchronous function that is invoked on
 *   erroneous result. If it returns `true` the retry attempts will continue;
 *   if the function returns `false` the retry flow is aborted with the current
 *   attempt's error and result being returned to the final callback.
 *   Invoked with (err).
 * * If `opts` is a number, the number specifies the number of times to retry,
 *   with the default interval of `0`.
 * @param {Function} task - A function which receives two arguments: (1) a
 * `callback(err, result)` which must be called when finished, passing `err`
 * (which can be `null`) and the `result` of the function's execution, and (2)
 * a `results` object, containing the results of the previously executed
 * functions (if nested inside another control flow). Invoked with
 * (callback, results).
 * @param {Function} [callback] - An optional callback which is called when the
 * task has succeeded, or after the final failed attempt. It receives the `err`
 * and `result` arguments of the last attempt at completing the `task`. Invoked
 * with (err, results).
 * @example
 *
 * // The `retry` function can be used as a stand-alone control flow by passing
 * // a callback, as shown below:
 *
 * // try calling apiMethod 3 times
 * async.retry(3, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod 3 times, waiting 200 ms between each retry
 * async.retry({times: 3, interval: 200}, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod 10 times with exponential backoff
 * // (i.e. intervals of 100, 200, 400, 800, 1600, ... milliseconds)
 * async.retry({
 *   times: 10,
 *   interval: function(retryCount) {
 *     return 50 * Math.pow(2, retryCount);
 *   }
 * }, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod the default 5 times no delay between each retry
 * async.retry(apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod only when error condition satisfies, all other
 * // errors will abort the retry control flow and return to final callback
 * async.retry({
 *   errorFilter: function(err) {
 *     return err.message === 'Temporary error'; // only retry on a specific error
 *   }
 * }, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // It can also be embedded within other control flow functions to retry
 * // individual methods that are not as reliable, like this:
 * async.auto({
 *     users: api.getUsers.bind(api),
 *     payments: async.retry(3, api.getPayments.bind(api))
 * }, function(err, results) {
 *     // do something with the results
 * });
 *
 */
function retry(opts, task, callback) {
    var DEFAULT_TIMES = 5;
    var DEFAULT_INTERVAL = 0;

    var options = {
        times: DEFAULT_TIMES,
        intervalFunc: constant$1(DEFAULT_INTERVAL)
    };

    function parseTimes(acc, t) {
        if (typeof t === 'object') {
            acc.times = +t.times || DEFAULT_TIMES;

            acc.intervalFunc = typeof t.interval === 'function' ? t.interval : constant$1(+t.interval || DEFAULT_INTERVAL);

            acc.errorFilter = t.errorFilter;
        } else if (typeof t === 'number' || typeof t === 'string') {
            acc.times = +t || DEFAULT_TIMES;
        } else {
            throw new Error("Invalid arguments for async.retry");
        }
    }

    if (arguments.length < 3 && typeof opts === 'function') {
        callback = task || noop;
        task = opts;
    } else {
        parseTimes(options, opts);
        callback = callback || noop;
    }

    if (typeof task !== 'function') {
        throw new Error("Invalid arguments for async.retry");
    }

    var attempt = 1;
    function retryAttempt() {
        task(function (err) {
            if (err && attempt++ < options.times && (typeof options.errorFilter != 'function' || options.errorFilter(err))) {
                setTimeout(retryAttempt, options.intervalFunc(attempt));
            } else {
                callback.apply(null, arguments);
            }
        });
    }

    retryAttempt();
}

/**
 * A close relative of [`retry`]{@link module:ControlFlow.retry}.  This method wraps a task and makes it
 * retryable, rather than immediately calling it with retries.
 *
 * @name retryable
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.retry]{@link module:ControlFlow.retry}
 * @category Control Flow
 * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - optional
 * options, exactly the same as from `retry`
 * @param {Function} task - the asynchronous function to wrap
 * @returns {Functions} The wrapped function, which when invoked, will retry on
 * an error, based on the parameters specified in `opts`.
 * @example
 *
 * async.auto({
 *     dep1: async.retryable(3, getFromFlakyService),
 *     process: ["dep1", async.retryable(3, function (results, cb) {
 *         maybeProcessData(results.dep1, cb);
 *     })]
 * }, callback);
 */
var retryable = function (opts, task) {
    if (!task) {
        task = opts;
        opts = null;
    }
    return initialParams(function (args, callback) {
        function taskFn(cb) {
            task.apply(null, args.concat(cb));
        }

        if (opts) retry(opts, taskFn, callback);else retry(taskFn, callback);
    });
};

/**
 * Run the functions in the `tasks` collection in series, each one running once
 * the previous function has completed. If any functions in the series pass an
 * error to its callback, no more functions are run, and `callback` is
 * immediately called with the value of the error. Otherwise, `callback`
 * receives an array of results when `tasks` have completed.
 *
 * It is also possible to use an object instead of an array. Each property will
 * be run as a function, and the results will be passed to the final `callback`
 * as an object instead of an array. This can be a more readable way of handling
 *  results from {@link async.series}.
 *
 * **Note** that while many implementations preserve the order of object
 * properties, the [ECMAScript Language Specification](http://www.ecma-international.org/ecma-262/5.1/#sec-8.6)
 * explicitly states that
 *
 * > The mechanics and order of enumerating the properties is not specified.
 *
 * So if you rely on the order in which your series of functions are executed,
 * and want this to work on all platforms, consider using an array.
 *
 * @name series
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} tasks - A collection containing functions to run, each
 * function is passed a `callback(err, result)` it must call on completion with
 * an error `err` (which can be `null`) and an optional `result` value.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed. This function gets a results array (or object)
 * containing all the result arguments passed to the `task` callbacks. Invoked
 * with (err, result).
 * @example
 * async.series([
 *     function(callback) {
 *         // do some stuff ...
 *         callback(null, 'one');
 *     },
 *     function(callback) {
 *         // do some more stuff ...
 *         callback(null, 'two');
 *     }
 * ],
 * // optional callback
 * function(err, results) {
 *     // results is now equal to ['one', 'two']
 * });
 *
 * async.series({
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 1);
 *         }, 200);
 *     },
 *     two: function(callback){
 *         setTimeout(function() {
 *             callback(null, 2);
 *         }, 100);
 *     }
 * }, function(err, results) {
 *     // results is now equal to: {one: 1, two: 2}
 * });
 */
function series(tasks, callback) {
  _parallel(eachOfSeries, tasks, callback);
}

/**
 * Returns `true` if at least one element in the `coll` satisfies an async test.
 * If any iteratee call returns `true`, the main `callback` is immediately
 * called.
 *
 * @name some
 * @static
 * @memberOf module:Collections
 * @method
 * @alias any
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in the array
 * in parallel. The iteratee is passed a `callback(err, truthValue)` which must
 * be called with a boolean argument once it has completed. Invoked with
 * (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the iteratee functions have finished.
 * Result will be either `true` or `false` depending on the values of the async
 * tests. Invoked with (err, result).
 * @example
 *
 * async.some(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, result) {
 *     // if result is true then at least one of the files exists
 * });
 */
var some = doParallel(_createTester(Boolean, identity));

/**
 * The same as [`some`]{@link module:Collections.some} but runs a maximum of `limit` async operations at a time.
 *
 * @name someLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.some]{@link module:Collections.some}
 * @alias anyLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in the array
 * in parallel. The iteratee is passed a `callback(err, truthValue)` which must
 * be called with a boolean argument once it has completed. Invoked with
 * (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the iteratee functions have finished.
 * Result will be either `true` or `false` depending on the values of the async
 * tests. Invoked with (err, result).
 */
var someLimit = doParallelLimit(_createTester(Boolean, identity));

/**
 * The same as [`some`]{@link module:Collections.some} but runs only a single async operation at a time.
 *
 * @name someSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.some]{@link module:Collections.some}
 * @alias anySeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in the array
 * in parallel. The iteratee is passed a `callback(err, truthValue)` which must
 * be called with a boolean argument once it has completed. Invoked with
 * (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the iteratee functions have finished.
 * Result will be either `true` or `false` depending on the values of the async
 * tests. Invoked with (err, result).
 */
var someSeries = doLimit(someLimit, 1);

/**
 * Sorts a list by the results of running each `coll` value through an async
 * `iteratee`.
 *
 * @name sortBy
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, sortValue)` which must be called once
 * it has completed with an error (which can be `null`) and a value to use as
 * the sort criteria. Invoked with (item, callback).
 * @param {Function} callback - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is the items
 * from the original `coll` sorted by the values returned by the `iteratee`
 * calls. Invoked with (err, results).
 * @example
 *
 * async.sortBy(['file1','file2','file3'], function(file, callback) {
 *     fs.stat(file, function(err, stats) {
 *         callback(err, stats.mtime);
 *     });
 * }, function(err, results) {
 *     // results is now the original array of files sorted by
 *     // modified date
 * });
 *
 * // By modifying the callback parameter the
 * // sorting order can be influenced:
 *
 * // ascending order
 * async.sortBy([1,9,3,5], function(x, callback) {
 *     callback(null, x);
 * }, function(err,result) {
 *     // result callback
 * });
 *
 * // descending order
 * async.sortBy([1,9,3,5], function(x, callback) {
 *     callback(null, x*-1);    //<- x*-1 instead of x, turns the order around
 * }, function(err,result) {
 *     // result callback
 * });
 */
function sortBy(coll, iteratee, callback) {
    map(coll, function (x, callback) {
        iteratee(x, function (err, criteria) {
            if (err) return callback(err);
            callback(null, { value: x, criteria: criteria });
        });
    }, function (err, results) {
        if (err) return callback(err);
        callback(null, arrayMap(results.sort(comparator), baseProperty('value')));
    });

    function comparator(left, right) {
        var a = left.criteria,
            b = right.criteria;
        return a < b ? -1 : a > b ? 1 : 0;
    }
}

/**
 * Sets a time limit on an asynchronous function. If the function does not call
 * its callback within the specified milliseconds, it will be called with a
 * timeout error. The code property for the error object will be `'ETIMEDOUT'`.
 *
 * @name timeout
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} asyncFn - The asynchronous function you want to set the
 * time limit.
 * @param {number} milliseconds - The specified time limit.
 * @param {*} [info] - Any variable you want attached (`string`, `object`, etc)
 * to timeout Error for more information..
 * @returns {Function} Returns a wrapped function that can be used with any of
 * the control flow functions. Invoke this function with the same
 * parameters as you would `asyncFunc`.
 * @example
 *
 * function myFunction(foo, callback) {
 *     doAsyncTask(foo, function(err, data) {
 *         // handle errors
 *         if (err) return callback(err);
 *
 *         // do some stuff ...
 *
 *         // return processed data
 *         return callback(null, data);
 *     });
 * }
 *
 * var wrapped = async.timeout(myFunction, 1000);
 *
 * // call `wrapped` as you would `myFunction`
 * wrapped({ bar: 'bar' }, function(err, data) {
 *     // if `myFunction` takes < 1000 ms to execute, `err`
 *     // and `data` will have their expected values
 *
 *     // else `err` will be an Error with the code 'ETIMEDOUT'
 * });
 */
function timeout(asyncFn, milliseconds, info) {
    var originalCallback, timer;
    var timedOut = false;

    function injectedCallback() {
        if (!timedOut) {
            originalCallback.apply(null, arguments);
            clearTimeout(timer);
        }
    }

    function timeoutCallback() {
        var name = asyncFn.name || 'anonymous';
        var error = new Error('Callback function "' + name + '" timed out.');
        error.code = 'ETIMEDOUT';
        if (info) {
            error.info = info;
        }
        timedOut = true;
        originalCallback(error);
    }

    return initialParams(function (args, origCallback) {
        originalCallback = origCallback;
        // setup timer and call original function
        timer = setTimeout(timeoutCallback, milliseconds);
        asyncFn.apply(null, args.concat(injectedCallback));
    });
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeCeil = Math.ceil;
var nativeMax$1 = Math.max;

/**
 * The base implementation of `_.range` and `_.rangeRight` which doesn't
 * coerce arguments.
 *
 * @private
 * @param {number} start The start of the range.
 * @param {number} end The end of the range.
 * @param {number} step The value to increment or decrement by.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Array} Returns the range of numbers.
 */
function baseRange(start, end, step, fromRight) {
  var index = -1,
      length = nativeMax$1(nativeCeil((end - start) / (step || 1)), 0),
      result = Array(length);

  while (length--) {
    result[fromRight ? length : ++index] = start;
    start += step;
  }
  return result;
}

/**
 * The same as [times]{@link module:ControlFlow.times} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name timesLimit
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.times]{@link module:ControlFlow.times}
 * @category Control Flow
 * @param {number} count - The number of times to run the function.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - The function to call `n` times. Invoked with the
 * iteration index and a callback (n, next).
 * @param {Function} callback - see [async.map]{@link module:Collections.map}.
 */
function timeLimit(count, limit, iteratee, callback) {
  mapLimit(baseRange(0, count, 1), limit, iteratee, callback);
}

/**
 * Calls the `iteratee` function `n` times, and accumulates results in the same
 * manner you would use with [map]{@link module:Collections.map}.
 *
 * @name times
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Control Flow
 * @param {number} n - The number of times to run the function.
 * @param {Function} iteratee - The function to call `n` times. Invoked with the
 * iteration index and a callback (n, next).
 * @param {Function} callback - see {@link module:Collections.map}.
 * @example
 *
 * // Pretend this is some complicated async factory
 * var createUser = function(id, callback) {
 *     callback(null, {
 *         id: 'user' + id
 *     });
 * };
 *
 * // generate 5 users
 * async.times(5, function(n, next) {
 *     createUser(n, function(err, user) {
 *         next(err, user);
 *     });
 * }, function(err, users) {
 *     // we should now have 5 users
 * });
 */
var times = doLimit(timeLimit, Infinity);

/**
 * The same as [times]{@link module:ControlFlow.times} but runs only a single async operation at a time.
 *
 * @name timesSeries
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.times]{@link module:ControlFlow.times}
 * @category Control Flow
 * @param {number} n - The number of times to run the function.
 * @param {Function} iteratee - The function to call `n` times. Invoked with the
 * iteration index and a callback (n, next).
 * @param {Function} callback - see {@link module:Collections.map}.
 */
var timesSeries = doLimit(timeLimit, 1);

/**
 * A relative of `reduce`.  Takes an Object or Array, and iterates over each
 * element in series, each step potentially mutating an `accumulator` value.
 * The type of the accumulator defaults to the type of collection passed in.
 *
 * @name transform
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {*} [accumulator] - The initial state of the transform.  If omitted,
 * it will default to an empty Object or Array, depending on the type of `coll`
 * @param {Function} iteratee - A function applied to each item in the
 * collection that potentially modifies the accumulator. The `iteratee` is
 * passed a `callback(err)` which accepts an optional error as its first
 * argument. If an error is passed to the callback, the transform is stopped
 * and the main `callback` is immediately called with the error.
 * Invoked with (accumulator, item, key, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the transformed accumulator.
 * Invoked with (err, result).
 * @example
 *
 * async.transform([1,2,3], function(acc, item, index, callback) {
 *     // pointless async:
 *     process.nextTick(function() {
 *         acc.push(item * 2)
 *         callback(null)
 *     });
 * }, function(err, result) {
 *     // result is now equal to [2, 4, 6]
 * });
 *
 * @example
 *
 * async.transform({a: 1, b: 2, c: 3}, function (obj, val, key, callback) {
 *     setImmediate(function () {
 *         obj[key] = val * 2;
 *         callback();
 *     })
 * }, function (err, result) {
 *     // result is equal to {a: 2, b: 4, c: 6}
 * })
 */
function transform(coll, accumulator, iteratee, callback) {
    if (arguments.length === 3) {
        callback = iteratee;
        iteratee = accumulator;
        accumulator = isArray(coll) ? [] : {};
    }
    callback = once(callback || noop);

    eachOf(coll, function (v, k, cb) {
        iteratee(accumulator, v, k, cb);
    }, function (err) {
        callback(err, accumulator);
    });
}

/**
 * Undoes a [memoize]{@link module:Utils.memoize}d function, reverting it to the original,
 * unmemoized form. Handy for testing.
 *
 * @name unmemoize
 * @static
 * @memberOf module:Utils
 * @method
 * @see [async.memoize]{@link module:Utils.memoize}
 * @category Util
 * @param {Function} fn - the memoized function
 * @returns {Function} a function that calls the original unmemoized function
 */
function unmemoize(fn) {
    return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
    };
}

/**
 * Repeatedly call `iteratee`, while `test` returns `true`. Calls `callback` when
 * stopped, or an error occurs.
 *
 * @name whilst
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Function} test - synchronous truth test to perform before each
 * execution of `iteratee`. Invoked with ().
 * @param {Function} iteratee - A function which is called each time `test` passes.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `iteratee` has stopped. `callback`
 * will be passed an error and any arguments passed to the final `iteratee`'s
 * callback. Invoked with (err, [results]);
 * @returns undefined
 * @example
 *
 * var count = 0;
 * async.whilst(
 *     function() { return count < 5; },
 *     function(callback) {
 *         count++;
 *         setTimeout(function() {
 *             callback(null, count);
 *         }, 1000);
 *     },
 *     function (err, n) {
 *         // 5 seconds have passed, n = 5
 *     }
 * );
 */
function whilst(test, iteratee, callback) {
    callback = onlyOnce(callback || noop);
    if (!test()) return callback(null);
    var next = rest(function (err, args) {
        if (err) return callback(err);
        if (test()) return iteratee(next);
        callback.apply(null, [null].concat(args));
    });
    iteratee(next);
}

/**
 * Repeatedly call `fn` until `test` returns `true`. Calls `callback` when
 * stopped, or an error occurs. `callback` will be passed an error and any
 * arguments passed to the final `fn`'s callback.
 *
 * The inverse of [whilst]{@link module:ControlFlow.whilst}.
 *
 * @name until
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.whilst]{@link module:ControlFlow.whilst}
 * @category Control Flow
 * @param {Function} test - synchronous truth test to perform before each
 * execution of `fn`. Invoked with ().
 * @param {Function} fn - A function which is called each time `test` fails.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} [callback] - A callback which is called after the test
 * function has passed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error and any arguments passed to the final `fn`'s
 * callback. Invoked with (err, [results]);
 */
function until(test, fn, callback) {
    whilst(function () {
        return !test.apply(this, arguments);
    }, fn, callback);
}

/**
 * Runs the `tasks` array of functions in series, each passing their results to
 * the next in the array. However, if any of the `tasks` pass an error to their
 * own callback, the next function is not executed, and the main `callback` is
 * immediately called with the error.
 *
 * @name waterfall
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array} tasks - An array of functions to run, each function is passed
 * a `callback(err, result1, result2, ...)` it must call on completion. The
 * first argument is an error (which can be `null`) and any further arguments
 * will be passed as arguments in order to the next task.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed. This will be passed the results of the last task's
 * callback. Invoked with (err, [results]).
 * @returns undefined
 * @example
 *
 * async.waterfall([
 *     function(callback) {
 *         callback(null, 'one', 'two');
 *     },
 *     function(arg1, arg2, callback) {
 *         // arg1 now equals 'one' and arg2 now equals 'two'
 *         callback(null, 'three');
 *     },
 *     function(arg1, callback) {
 *         // arg1 now equals 'three'
 *         callback(null, 'done');
 *     }
 * ], function (err, result) {
 *     // result now equals 'done'
 * });
 *
 * // Or, with named functions:
 * async.waterfall([
 *     myFirstFunction,
 *     mySecondFunction,
 *     myLastFunction,
 * ], function (err, result) {
 *     // result now equals 'done'
 * });
 * function myFirstFunction(callback) {
 *     callback(null, 'one', 'two');
 * }
 * function mySecondFunction(arg1, arg2, callback) {
 *     // arg1 now equals 'one' and arg2 now equals 'two'
 *     callback(null, 'three');
 * }
 * function myLastFunction(arg1, callback) {
 *     // arg1 now equals 'three'
 *     callback(null, 'done');
 * }
 */
var waterfall = function (tasks, callback) {
    callback = once(callback || noop);
    if (!isArray(tasks)) return callback(new Error('First argument to waterfall must be an array of functions'));
    if (!tasks.length) return callback();
    var taskIndex = 0;

    function nextTask(args) {
        if (taskIndex === tasks.length) {
            return callback.apply(null, [null].concat(args));
        }

        var taskCallback = onlyOnce(rest(function (err, args) {
            if (err) {
                return callback.apply(null, [err].concat(args));
            }
            nextTask(args);
        }));

        args.push(taskCallback);

        var task = tasks[taskIndex++];
        task.apply(null, args);
    }

    nextTask([]);
};

/**
 * Async is a utility module which provides straight-forward, powerful functions
 * for working with asynchronous JavaScript. Although originally designed for
 * use with [Node.js](http://nodejs.org) and installable via
 * `npm install --save async`, it can also be used directly in the browser.
 * @module async
 */

/**
 * A collection of `async` functions for manipulating collections, such as
 * arrays and objects.
 * @module Collections
 */

/**
 * A collection of `async` functions for controlling the flow through a script.
 * @module ControlFlow
 */

/**
 * A collection of `async` utility functions.
 * @module Utils
 */
var index = {
  applyEach: applyEach,
  applyEachSeries: applyEachSeries,
  apply: apply$2,
  asyncify: asyncify,
  auto: auto,
  autoInject: autoInject,
  cargo: cargo,
  compose: compose,
  concat: concat,
  concatSeries: concatSeries,
  constant: constant,
  detect: detect,
  detectLimit: detectLimit,
  detectSeries: detectSeries,
  dir: dir,
  doDuring: doDuring,
  doUntil: doUntil,
  doWhilst: doWhilst,
  during: during,
  each: eachLimit,
  eachLimit: eachLimit$1,
  eachOf: eachOf,
  eachOfLimit: eachOfLimit,
  eachOfSeries: eachOfSeries,
  eachSeries: eachSeries,
  ensureAsync: ensureAsync,
  every: every,
  everyLimit: everyLimit,
  everySeries: everySeries,
  filter: filter,
  filterLimit: filterLimit,
  filterSeries: filterSeries,
  forever: forever,
  log: log,
  map: map,
  mapLimit: mapLimit,
  mapSeries: mapSeries,
  mapValues: mapValues,
  mapValuesLimit: mapValuesLimit,
  mapValuesSeries: mapValuesSeries,
  memoize: memoize,
  nextTick: nextTick,
  parallel: parallelLimit,
  parallelLimit: parallelLimit$1,
  priorityQueue: priorityQueue,
  queue: queue$1,
  race: race,
  reduce: reduce,
  reduceRight: reduceRight,
  reflect: reflect,
  reflectAll: reflectAll,
  reject: reject,
  rejectLimit: rejectLimit,
  rejectSeries: rejectSeries,
  retry: retry,
  retryable: retryable,
  seq: seq$1,
  series: series,
  setImmediate: setImmediate$1,
  some: some,
  someLimit: someLimit,
  someSeries: someSeries,
  sortBy: sortBy,
  timeout: timeout,
  times: times,
  timesLimit: timeLimit,
  timesSeries: timesSeries,
  transform: transform,
  unmemoize: unmemoize,
  until: until,
  waterfall: waterfall,
  whilst: whilst,

  // aliases
  all: every,
  any: some,
  forEach: eachLimit,
  forEachSeries: eachSeries,
  forEachLimit: eachLimit$1,
  forEachOf: eachOf,
  forEachOfSeries: eachOfSeries,
  forEachOfLimit: eachOfLimit,
  inject: reduce,
  foldl: reduce,
  foldr: reduceRight,
  select: filter,
  selectLimit: filterLimit,
  selectSeries: filterSeries,
  wrapSync: asyncify
};

exports['default'] = index;
exports.applyEach = applyEach;
exports.applyEachSeries = applyEachSeries;
exports.apply = apply$2;
exports.asyncify = asyncify;
exports.auto = auto;
exports.autoInject = autoInject;
exports.cargo = cargo;
exports.compose = compose;
exports.concat = concat;
exports.concatSeries = concatSeries;
exports.constant = constant;
exports.detect = detect;
exports.detectLimit = detectLimit;
exports.detectSeries = detectSeries;
exports.dir = dir;
exports.doDuring = doDuring;
exports.doUntil = doUntil;
exports.doWhilst = doWhilst;
exports.during = during;
exports.each = eachLimit;
exports.eachLimit = eachLimit$1;
exports.eachOf = eachOf;
exports.eachOfLimit = eachOfLimit;
exports.eachOfSeries = eachOfSeries;
exports.eachSeries = eachSeries;
exports.ensureAsync = ensureAsync;
exports.every = every;
exports.everyLimit = everyLimit;
exports.everySeries = everySeries;
exports.filter = filter;
exports.filterLimit = filterLimit;
exports.filterSeries = filterSeries;
exports.forever = forever;
exports.log = log;
exports.map = map;
exports.mapLimit = mapLimit;
exports.mapSeries = mapSeries;
exports.mapValues = mapValues;
exports.mapValuesLimit = mapValuesLimit;
exports.mapValuesSeries = mapValuesSeries;
exports.memoize = memoize;
exports.nextTick = nextTick;
exports.parallel = parallelLimit;
exports.parallelLimit = parallelLimit$1;
exports.priorityQueue = priorityQueue;
exports.queue = queue$1;
exports.race = race;
exports.reduce = reduce;
exports.reduceRight = reduceRight;
exports.reflect = reflect;
exports.reflectAll = reflectAll;
exports.reject = reject;
exports.rejectLimit = rejectLimit;
exports.rejectSeries = rejectSeries;
exports.retry = retry;
exports.retryable = retryable;
exports.seq = seq$1;
exports.series = series;
exports.setImmediate = setImmediate$1;
exports.some = some;
exports.someLimit = someLimit;
exports.someSeries = someSeries;
exports.sortBy = sortBy;
exports.timeout = timeout;
exports.times = times;
exports.timesLimit = timeLimit;
exports.timesSeries = timesSeries;
exports.transform = transform;
exports.unmemoize = unmemoize;
exports.until = until;
exports.waterfall = waterfall;
exports.whilst = whilst;
exports.all = every;
exports.allLimit = everyLimit;
exports.allSeries = everySeries;
exports.any = some;
exports.anyLimit = someLimit;
exports.anySeries = someSeries;
exports.find = detect;
exports.findLimit = detectLimit;
exports.findSeries = detectSeries;
exports.forEach = eachLimit;
exports.forEachSeries = eachSeries;
exports.forEachLimit = eachLimit$1;
exports.forEachOf = eachOf;
exports.forEachOfSeries = eachOfSeries;
exports.forEachOfLimit = eachOfLimit;
exports.inject = reduce;
exports.foldl = reduce;
exports.foldr = reduceRight;
exports.select = filter;
exports.selectLimit = filterLimit;
exports.selectSeries = filterSeries;
exports.wrapSync = asyncify;

Object.defineProperty(exports, '__esModule', { value: true });

})));

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4), __webpack_require__(13)(module), __webpack_require__(31).setImmediate, __webpack_require__(1)))

/***/ }),

/***/ 95:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__common_dependencyManager__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__common_dependencyManager___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__common_dependencyManager__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__common_constants__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__common_constants___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__common_constants__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__baseService__ = __webpack_require__(32);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__baseService___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__baseService__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__common_routerTransport__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__common_configUtil__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__common_util__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__clients_logger__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__clients_logger___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6__clients_logger__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__common_system__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__common_system___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7__common_system__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
// This file contains the Finsemble router service, which routes event messages between
// all other services and all components.  All event messages flow though here (never peer to peer).












__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.log("Starting Router Service");

// onerror is defined in baseService, but it's not loaded till later here
window.onerror = function (message, url, lineNumber) {
	__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.error("Caught Error: " + message, "URL: " + url, "Line number: " + lineNumber);
	if (message.error) {
		console.error(message.error.stack);
	}
	return false;
};

function RouterServiceConstructor() {

	///////////////////////////
	// Private Data
	///////////////////////////

	var transportLayer = {}; // map of active transports (for messaging into and out of Router Service)
	var listenersMap = {}; // map of client listener arrays indexed by channel (i.e. supports multiple listeners per channel)
	var respondersMap = {}; // map of client responders indexed by channel (only one responder per channel)
	var queryIDMap = {}; // map of client queries indexed by unique queryID
	var subPubRespondersMap = {}; // map of PubSub responders (only one per responder)
	var subPubRespondersRegExMap = {}; // if a PubSub responder definition is for a group of topics defined by a regEx, then the regEx is in this map
	var subscribersIDMap = {}; // map of all PubSub subscribers (every subscriber has a unique subscriber ID)
	var errorWarnAlreadyDone = {};
	var testingIgnoreHandshakeCounter = {};
	var measureTrafficInterval;
	var measureTraffic;
	var trafficSnapMinCountSize;
	var trafficDataTemplate = { inputMessageCount: 0, outputMessageCount: 0, input: {}, output: {} };
	var trafficData = {};

	trafficData = __WEBPACK_IMPORTED_MODULE_5__common_util__["clone"](trafficDataTemplate);

	///////////////////////////
	// Private Functions
	///////////////////////////

	// output the snapshot data (typically on a time interval)
	//
	// REQUISITE CONFIG: the follow config in the manifest enables periodic output of router traffic by channel or topic
	// "router": {
	// 	"trafficSnapshotMilliseconds": 10000,  <-----how often to take the snapshot
	// 	"trafficSnapMinCountSize": 10 <------ filter from output if not this many messages for the channel/topic
	// }
	function trafficSnapshot() {
		var shortList = __WEBPACK_IMPORTED_MODULE_5__common_util__["clone"](trafficDataTemplate);
		shortList.inputMessageCount = trafficData.inputMessageCount;
		shortList.outputMessageCount = trafficData.outputMessageCount;
		shortList.totalMessageCount = trafficData.inputMessageCount + trafficData.outputMessageCount;
		Object.keys(trafficData.input).forEach(function (property) {
			if (trafficData.input[property] >= trafficSnapMinCountSize) {
				shortList.input[property] = trafficData.input[property];
			}
		});
		Object.keys(trafficData.output).forEach(function (property) {
			if (trafficData.output[property] >= trafficSnapMinCountSize) {
				shortList.output[property] = trafficData.output[property];
			}
		});
		__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.log("forceObjectsToLogger", "Router Traffic Data", shortList);
		console.debug("Router Traffic Data", "FilteredList", shortList, "Full List", trafficData);
		trafficData = __WEBPACK_IMPORTED_MODULE_5__common_util__["clone"](trafficDataTemplate);
	}

	// called for each input message and output message to count router traffic
	function gatherTrafficData(source, message) {

		// message may have a topic or a channel to count by
		function countData(dataObject, header) {
			if (header.channel) {
				if (dataObject[header.channel]) {
					dataObject[header.channel]++;
				} else {
					dataObject[header.channel] = 1;
				}
			}
			if (header.topic) {
				if (dataObject[header.topic]) {
					dataObject[header.topic]++;
				} else {
					dataObject[header.topic] = 1;
				}
			}
		}

		if (source === "input") {
			trafficData.inputMessageCount++;
			countData(trafficData.input, message.header);
		} else {
			trafficData.outputMessageCount++;
			countData(trafficData.output, message.header);
		}
	}

	// message constructor to send handshake response back to client
	function InitialHandshakeResponseMessage() {
		this.header = {
			"origin": "RouterService",
			"type": "initialHandshakeResponse"
		};
	}

	// message constructor to send time calibration response back to client
	function TimeCalibrationMessage(clientBaseTime, serviceBaseTime) {
		this.header = {
			"origin": "RouterService",
			"type": "timeCalibration"
		};
		this.clientBaseTime = clientBaseTime;
		this.serviceBaseTime = serviceBaseTime;
	}

	// message constructor to send error back to client when addResponder failed (query message is used since it is routed to responder)
	function QueryMessage(channel, error) {
		this.header = {
			"origin": "RouterService",
			"type": "query",
			"channel": channel,
			"error": error
		};
	}

	// message constructor to send error back to query client
	function QueryResponseMessage(queryID, channel, error) {
		this.header = {
			"origin": "RouterService",
			"type": "queryResponse",
			"queryID": queryID,
			"channel": channel,
			"error": error
		};
	}

	// message constructor to send error back to pubsub service client
	function SubscribeMessage(topic, error) {
		this.header = {
			"origin": "RouterService",
			"type": "subscribe",
			"topic": topic,
			"error": error
		};
	}

	// message constructor to send error back to subscriber client
	function NotifyMessage(topic, error) {
		this.header = {
			"origin": "RouterService",
			"type": "notify",
			"topic": topic,
			"error": error
		};
	}

	// returns true if two objects of transport info have same data
	function isTransportInfoEqual(transportInfo1, transportInfo2) {
		var equal = true;
		var propertyList = Object.keys(transportInfo1); // different transport may have different object properties
		for (var i = 0; i < propertyList.length; i++) {
			if (!(transportInfo1[propertyList[i]] === transportInfo2[propertyList[i]])) {
				equal = false;
				break;
			}
		}
		return equal;
	}

	// add client (i.e. transport info) to map of listeners per channel (i.e. multiple listeners per channel are maintained)
	// Context: this service function invoked when client side invokes addListener()
	function addListenerHandler(incomingTransportInfo, channel, origin) {
		if (!(channel in listenersMap)) {
			listenersMap[channel] = [incomingTransportInfo];
		} else {
			listenersMap[channel].push(incomingTransportInfo);
		}
		__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("addListener for " + channel + " ListenerCount=" + listenersMap[channel].length + " -- request from " + origin);
	}

	// routes incoming transmit (to a specific channel) to all clients listening on that channel
	// Context: this service function invoked when client side invokes transmit()
	function transmitHandler(incomingTransportInfo, channel, message) {

		if (!(channel in listenersMap)) {
			var errorWarnId = "transmitHandler" + channel;
			//Users can suppress logger warnings about having no listeners. The default is to allow warnings.
			let shouldWarn = message.options && message.options.suppressWarnings === false;
			if (shouldWarn) {
				if (errorWarnAlreadyDone[errorWarnId]) {
					__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.verbose("no listeners for transmit to " + channel + " from " + message.header.origin);
				} else {
					__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("no listeners for transmit to " + channel + " from " + message.header.origin);
					errorWarnAlreadyDone[errorWarnId] = true;
				}
			}
		} else {
			var destinations = listenersMap[channel];
			for (var i = 0; i < destinations.length; i++) {
				var transportInfo = destinations[i];
				if (!__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.isLogMessage(channel)) {
					__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("transmit routed to listener", channel, message);
				}
				sendToTransport(transportInfo, message);
			}
		}
	}

	// removes client listener from channel
	// Context: this service function invoked when client side invokes removeListener()
	function removeListenerHandler(incomingTransportInfo, channel, origin) {
		var removed = false;
		if (channel in listenersMap) {
			var list = listenersMap[channel];
			for (var i = 0; i < list.length; i++) {
				if (isTransportInfoEqual(incomingTransportInfo, list[i])) {
					list.splice(i, 1);
					if (list.length === 0) {
						delete listenersMap[channel];
					}
					removed = true;
					__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("removeListener to " + channel + " from " + origin);
					break;
				}
			}
		}
		if (!removed) {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("failed to remove non-existent listener on " + channel + " -- request from " + origin);
		}
	}

	// add client (i.e. transport info) to responder-listener map for a specific channel -- only one responder allowed per channel
	// Context: this service function invoked when client side invokes addResponder()
	function addResponderHandler(incomingTransportInfo, channel, origin) {
		if (!(channel in respondersMap)) {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("addResponder to " + channel + " -- request from " + origin);
			respondersMap[channel] = incomingTransportInfo;
		} else {
			// error since can only be one responder per channel
			// send back error message to the originator as a query (since it will be routed to the responder)
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("addResponder failed because responder already added to " + channel + " -- request from " + origin);
			sendToTransport(incomingTransportInfo, new QueryMessage(channel, "Responder already defined for " + channel + " by another client"));
		}
	}

	// routes incoming query (to a specific channel) to responder listening on that channel
	// Context: this service function invoked when client side invokes query()
	function queryHandler(incomingTransportInfo, channel, queryID, message) {
		var timestamp = window.performance.timing.navigationStart + window.performance.now();
		var navstart = window.performance.timing.navigationStart;
		var timenow = window.performance.now(); // timer values added for logging diagnostics

		if (channel in respondersMap) {
			queryIDMap[queryID] = incomingTransportInfo; // save to route queryResponse
			var outgoingTransportInfo = respondersMap[channel];
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("query routed to responder", queryID, channel, message, { timestamp, navstart, timenow });
			sendToTransport(outgoingTransportInfo, message);
		} else {
			// error no responder defined to get the query
			// send back error message to the originator as a query (since it will be routed to the responder)
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("query failed since no responder on " + channel + " -- request from " + message.header.origin);
			sendToTransport(incomingTransportInfo, new QueryResponseMessage(queryID, channel, "No responder for " + channel));
		}
	}

	// routes incoming queryResponse back to the query originator
	// Context: this service function invoked when client-side responder callback invokes queryResponse callback()
	function queryResponseHandler(incomingTransportInfo, queryID, message) {
		if (queryID in queryIDMap) {
			var outgoingTransportInfo = queryIDMap[queryID];
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("queryResponse routed to queryID", queryID, message);
			sendToTransport(outgoingTransportInfo, message);
			delete queryIDMap[queryID];
		} else {
			// error no responder defined to get the query
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("queryResponse could not find queryID " + queryID + " -- response from " + message.header.origin);
		}
	}

	// removes responder listening on channel
	// Context: this service function invoked when client side invokes removeResponder()
	function removeResponderHandler(incomingTransportInfo, channel, origin) {
		if (channel in respondersMap) {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("removeResponder to " + channel + " -- request from " + origin);
			delete respondersMap[channel];
		} else {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("failed to remove non-existent responder on " + channel + " -- request from " + origin);
		}
	}

	// add PubSub responder for a specific topic -- only one responder allowed per topic
	// Context: this service function invoked when client side invokes addPubSubResponder()
	function addPubSubResponderHandler(incomingTransportInfo, topic, origin) {
		if (!(topic in subPubRespondersMap)) {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("addPubSubResponder to " + topic + " -- request from " + origin);
			subPubRespondersMap[topic] = incomingTransportInfo;
			if (topic.length >= 2 && topic[0] === "/" && topic[topic.length - 1] === "/") {
				// then topic is a RegEx
				__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("addPubSubResponder for " + topic + " is RegExp");
				subPubRespondersRegExMap[topic] = new RegExp(topic.substring(1, topic.length - 1));
			}
		} else {
			// error since can only be one responder per topic
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("addPubSubResponder failure since PubSub responder already added to " + topic + " -- request from " + origin);
			// send back error message to the originator as a query (since it will be routed to the responder)
			sendToTransport(incomingTransportInfo, new SubscribeMessage(topic, "PubSub Responder already defined for " + topic + "by another client"));
		}
	}

	// add subscriber to map of subscribers per topic (i.e. multiple subscribers per topic are maintained)
	// Context: this service function invoked when client side invokes subscribe()
	function addSubscriberHandler(incomingTransportInfo, topic, subscribeID, message) {
		var outgoingTransportInfo = null;

		if (topic in subPubRespondersMap) {
			subscribersIDMap[subscribeID] = incomingTransportInfo; // save to route queryResponse
			outgoingTransportInfo = subPubRespondersMap[topic];
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("addSubscriber for subscribeID/topic", subscribeID, topic, message);
			sendToTransport(outgoingTransportInfo, message);
		} else {
			for (var key in subPubRespondersRegExMap) {
				if (subPubRespondersRegExMap[key].test(topic)) {
					subscribersIDMap[subscribeID] = incomingTransportInfo; // save to route queryResponse
					outgoingTransportInfo = subPubRespondersMap[key];
					__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("addSubscriber for subscribeID/topic/key", subscribeID, topic, key, message);
					sendToTransport(outgoingTransportInfo, message);
					break;
				}
			}
		}

		if (outgoingTransportInfo === null) {
			// error no pubsub responder defined to get the subscribe
			// send back error message to the originator as a notify (since it will be routed to the responder)
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("addSubscriber for subscribeID " + subscribeID + " failed since no PubSub responder for " + topic + " -- request from " + message.header.origin, message);
			sendToTransport(incomingTransportInfo, new NotifyMessage(subscribeID, topic, "No pubsub responder for " + topic));
		}
	}

	// removes subscriber from topic
	// Context: this service function invoked when client side invokes unsubscribe()
	function unSubscribeHandler(incomingTransportInfo, topic, subscribeID, message) {
		var outgoingTransportInfo;
		if (topic in subPubRespondersMap) {
			outgoingTransportInfo = subPubRespondersMap[topic];
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("unSubscribe for subscribedID " + subscribeID + " routed to PubSub responder for " + topic + " -- request from " + message.header.origin);
			sendToTransport(outgoingTransportInfo, message);
			if (subscribeID in subscribersIDMap) {
				delete subscribersIDMap[subscribeID];
			}
		} else {
			for (var key in subPubRespondersRegExMap) {
				if (subPubRespondersRegExMap[key].test(topic)) {
					outgoingTransportInfo = subPubRespondersMap[key];
					__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("unSubscribe for subscribeID " + subscribeID + " routed to PubSub Responder for " + topic + " for RegEx " + key + " -- request from " + message.header.origin);
					sendToTransport(outgoingTransportInfo, message);
					if (subscribeID in subscribersIDMap) {
						delete subscribersIDMap[subscribeID];
					}
					break;
				}
			}
		}
		if (outgoingTransportInfo === null) {
			// error no pubsub responder defined to unsubscribe to
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("unSubscribe for subscribeID " + subscribeID + " failed since no PubSub responder for " + topic + " -- request from " + message.header.origin, message);
		}
	}

	// routes incoming publish (to a specific topic) to PubSub responder listening on that topic
	// Context: this service function invoked when client side invokes publish()
	function publishHandler(incomingTransportInfo, topic, message) {
		var outgoingTransportInfo;
		if (topic in subPubRespondersMap) {
			outgoingTransportInfo = subPubRespondersMap[topic];
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("publish routed to pubsub responder/topic", topic, message);
			sendToTransport(outgoingTransportInfo, message);
		} else {
			for (var key in subPubRespondersRegExMap) {
				if (subPubRespondersRegExMap[key].test(topic)) {
					outgoingTransportInfo = subPubRespondersMap[key];
					__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("publish routed to pubsub responder/topic/key", topic, key, message);
					sendToTransport(outgoingTransportInfo, message);
					break;
				}
			}
		}
		if (outgoingTransportInfo === null) {
			// error no responder defined to get the query
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("failed to publish to non-existent pubsub responder for " + topic + " -- request from " + message.header.origin);
		}
	}

	// routes incoming Notify back to the subscriber
	// Context: this service function invoked when client side PubSub responder invokes sendNotifyToAllSubscribers in response to incoming publish.
	function notifyHandler(incomingTransportInfo, subscribeID, message) {
		if (subscribeID in subscribersIDMap) {
			var outgoingTransportInfo = subscribersIDMap[subscribeID];
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("Notify routed to subscriberID", subscribeID, message);
			sendToTransport(outgoingTransportInfo, message);
		} else {
			// error no responder defined
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("Notify failed since could not find subscriberID", subscribeID, message);
		}
	}

	// removes pubsub responder for topic
	// Context: this service function invoked when client side invokes removePubSubResponder()
	function removePubSubResponderHandler(incomingTransportInfo, topic, origin) {
		if (topic in subPubRespondersMap) {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("removePubSubResponder from " + topic + " -- request from " + origin);
			delete subPubRespondersMap[topic];
			delete subPubRespondersRegExMap[topic];
		} else {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.warn("failed to remove non-existent PubSubResponder for " + topic + " -- request from " + origin);
		}
	}

	// used by logger to calibrate time across all windows
	function returnTimeCalibrationHandshake(incomingTransportInfo, message) {
		// return handshake back to client with RouterService time as reference
		message.header.origin = "RouterService";
		message.serviceBaseTime.push(window.performance.timing.navigationStart + window.performance.now());
		__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.verbose("TimeCalibration Handshake from " + message.header.origin, message);
		sendToTransport(incomingTransportInfo, new TimeCalibrationMessage(message.clientBaseTime, message.serviceBaseTime));
	}

	// used by RouterClient to verify initial communication -- disabled code included for testing failures by dropping handshake messages
	const FAILURE_TESTING = false; // always false, except for low-level testing
	const TESTCOUNT = 50; // specified how many handshake messages to drop for client; above 80 will cause router client to give up
	function returnInitialHandshake(incomingTransportInfo, message) {
		if (FAILURE_TESTING) {
			let testCounter = testingIgnoreHandshakeCounter[message.header.origin];
			if (typeof testCounter === "undefined") {
				testCounter = TESTCOUNT;
				console.log("Ignoring Handshake for testing", message.header.origin, testCounter);
			} else if (testCounter > 0) {
				console.log("Ignoring Handshake for testing", message.header.origin, testCounter);
			} else {
				__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.log("Initial Testing Handshake from ", message.header.origin, testCounter, incomingTransportInfo);
				sendToTransport(incomingTransportInfo, new InitialHandshakeResponseMessage());
			}
			testingIgnoreHandshakeCounter[message.header.origin] = --testCounter;
		} else {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.verbose("Initial Handshake from ", message.header.origin, incomingTransportInfo);
			// initial handshake with client to confirm communication with router service
			sendToTransport(incomingTransportInfo, new InitialHandshakeResponseMessage());
		}
	}

	// routes each income message from underlying transport to the correct handler
	function invokeHandler(incomingTransportInfo, message) {
		// cases ordered by frequency; otherwise a hash "might" be worthwhile
		switch (message.header.type) {
			case "transmit":
				transmitHandler(incomingTransportInfo, message.header.channel, message);
				break;
			case "query":
				queryHandler(incomingTransportInfo, message.header.channel, message.header.queryID, message);
				break;
			case "queryResponse":
				queryResponseHandler(incomingTransportInfo, message.header.queryID, message);
				break;
			case "notify":
				notifyHandler(incomingTransportInfo, message.header.subscribeID, message);
				break;
			case "publish":
				publishHandler(incomingTransportInfo, message.header.topic, message);
				break;
			case "addListener":
				addListenerHandler(incomingTransportInfo, message.header.channel, message.header.origin);
				break;
			case "addResponder":
				addResponderHandler(incomingTransportInfo, message.header.channel, message.header.origin);
				break;
			case "subscribe":
				addSubscriberHandler(incomingTransportInfo, message.header.topic, message.header.subscribeID, message);
				break;
			case "timeCalibration":
				returnTimeCalibrationHandshake(incomingTransportInfo, message);
				break;
			case "addPubSubResponder":
				addPubSubResponderHandler(incomingTransportInfo, message.header.topic, message.header.origin);
				break;
			case "removeListener":
				removeListenerHandler(incomingTransportInfo, message.header.channel, message.header.origin);
				break;
			case "removeResponder":
				removeResponderHandler(incomingTransportInfo, message.header.channel, message.header.origin);
				break;
			case "unsubscribe":
				unSubscribeHandler(incomingTransportInfo, message.header.topic, message.header.subscribeID, message);
				break;
			case "removePubSubResponder":
				removePubSubResponderHandler(incomingTransportInfo, message.header.topic, message.header.origin);
				break;
			case "initialHandshake":
				returnInitialHandshake(incomingTransportInfo, message);
				break;
			default:
				__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.error("unknown message: " + JSON.stringify(message));
		}
		if (measureTraffic) {
			gatherTrafficData("input", message);
		}
	}

	// ***** all inbound messages from all transports enter the service here *****
	function incomingMessageHandler(incomingTransportInfo, message) {
		message.header.originIncomingTransportInfo = incomingTransportInfo; // save the origin transport for testing if trusted message
		if (!__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.isLogMessage(message.header.channel)) {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.verbose("Incoming Message", message, "from transport", incomingTransportInfo);
		}
		invokeHandler(incomingTransportInfo, message);
	}

	// all transports connecting to the Router Service are initialized here;
	// multiple transports are supported; some clients can only connect with a specific transport due to run-time context (e.g. cross domain)
	function initializeTransports(params, readyCallback) {
		// get list of active transport names supported by Finsemble
		var transportNames = __WEBPACK_IMPORTED_MODULE_3__common_routerTransport__["default"].getActiveTransports(params);
		var retrieved = 0;

		// "install" each transport
		for (var i = 0; i < transportNames.length; i++) {
			// for each transport name
			__WEBPACK_IMPORTED_MODULE_3__common_routerTransport__["default"].getTransport(params, transportNames[i], incomingMessageHandler, "RouterService", "RouterClient").then(oneTransport => {
				transportLayer[oneTransport.identifier()] = oneTransport; // if transport init failed just keep going (no other good alternative)
				retrieved++;
				checkCompletion();
			});
		}

		function checkCompletion() {
			if (retrieved === transportNames.length) {
				__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.start();
				readyCallback(); // all the transport have been initialized so invoke callback
			}
		}
	}

	// ***** all outbound messages exit here though the appropriate transport *****
	function sendToTransport(outgoingTransportInfo, message) {
		if (!__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.isLogMessage(message.header.channel)) {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.verbose("Outgoing Message", message, "on transport", outgoingTransportInfo);
		}
		gatherTrafficData("output", message);
		transportLayer[outgoingTransportInfo.transportID].send(outgoingTransportInfo, message);
	}

	///////////////////////////
	// Public Function
	///////////////////////////

	/**
  * Initializes Router Service
  */
	this.initialize = function (readyCallBack) {

		function continueInitWithManifest(manifest) {
			var finConfig = manifest.finsemble;
			var isElectron = fin && fin.container == "Electron";
			var routerParams = {
				FinsembleUUID: finConfig.FinsembleUUID,
				applicationRoot: finConfig.applicationRoot,
				routerDomainRoot: finConfig.moduleRoot,
				forceWindowTransport: __WEBPACK_IMPORTED_MODULE_4__common_configUtil__["ConfigUtilInstance"].getDefault(finConfig, "finConfig.router.forceWindowTransport", {}),
				sameDomainTransport: __WEBPACK_IMPORTED_MODULE_4__common_configUtil__["ConfigUtilInstance"].getDefault(finConfig, "finConfig.router.sameDomainTransport", "SharedWorker"),
				crossDomainTransport: __WEBPACK_IMPORTED_MODULE_4__common_configUtil__["ConfigUtilInstance"].getDefault(finConfig, "finConfig.router.crossDomainTransport", isElectron ? "FinsembleTransport" : "OpenFinBus"),
				transportSettings: __WEBPACK_IMPORTED_MODULE_4__common_configUtil__["ConfigUtilInstance"].getDefault(finConfig, "finConfig.router.transportSettings", {}),
				IAC: __WEBPACK_IMPORTED_MODULE_4__common_configUtil__["ConfigUtilInstance"].getDefault(finConfig, "finConfig.IAC", {})
			};
			initializeTransports(routerParams, readyCallBack);

			trafficData = __WEBPACK_IMPORTED_MODULE_5__common_util__["clone"](trafficDataTemplate);
			measureTrafficInterval = __WEBPACK_IMPORTED_MODULE_4__common_configUtil__["ConfigUtilInstance"].getDefault(finConfig, "finConfig.router.trafficSnapshotMilliseconds", 0); // snapshot interval to measure traffic
			trafficSnapMinCountSize = __WEBPACK_IMPORTED_MODULE_4__common_configUtil__["ConfigUtilInstance"].getDefault(finConfig, "finConfig.router.trafficSnapMinCountSize", 5); // snapshot interval to measure traffic
			measureTraffic = measureTrafficInterval > 0; // true if should measure traffic
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.log("Traffic Measurement Settings: ", { measureTraffic, measureTrafficInterval });
			if (measureTraffic) {
				setInterval(trafficSnapshot, measureTrafficInterval);
			}
		}

		__WEBPACK_IMPORTED_MODULE_7__common_system__["System"].Window.getCurrent().getOptions(opts => {
			if (opts.customData && opts.customData.manifest) {
				__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("Router Init using custom data");
				continueInitWithManifest(opts.customData.manifest);
			} else {
				__WEBPACK_IMPORTED_MODULE_4__common_configUtil__["ConfigUtilInstance"].getExpandedRawManifest(function (manifest) {
					__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.debug("Router Init using getExpandedRawManifest");
					continueInitWithManifest(manifest);
				}, function (err) {
					__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.error("WINDOW LIFECYCLE:STARTUP:RouterClient:manifest error", err);
				});
			}
		}, function (err) {
			__WEBPACK_IMPORTED_MODULE_6__clients_logger___default.a.system.error("WINDOW LIFECYCLE:STARTUP:finWindow.getOptions error", err);
		});
	};
}

/////////////////////////////////////////
// The below is executed once on load
/////////////////////////////////////////

// create instance of the service

var serviceInstance = new RouterServiceConstructor("routerService");
var baseService;
serviceInstance.initialize(function () {
	//todo why do we use the baseService here?
	baseService = new __WEBPACK_IMPORTED_MODULE_2__baseService__["BaseService"]();
	//This is just to squash an error in the base service. it prints out a helpful error if you never register a ready callback. Not necessary for the router, since it doesn't use the baseService.
	baseService.onBaseServiceReadyCB = cb => cb();

	/***
  * @NOTE: DO NOT ATTEMPT TO EXECUTE CODE ON SHUTDOWN FOR THE ROUTERSERVICE.
  * THE SERVICE MANAGER IS HARD CODED TO IGNORE THE ROUTERSERVICE ON SHUTDOWN.
  */
	__WEBPACK_IMPORTED_MODULE_0__common_dependencyManager___default.a.shutdown.waitFor({
		services: ["loggerService"]
	}, () => {
		//Sends a message out saying that it is offline. The serviceManager is listening for this message; when it's received, the app will shutdown.
		baseService.RouterClient.transmit("Finsemble.serviceOffline", {
			name: "routerService",
			uuid: __WEBPACK_IMPORTED_MODULE_7__common_system__["System"].Application.getCurrent().uuid
		});
	});

	//This is how we used to get active services. It's now deprecated.
	baseService.RouterClient.addPubSubResponder("Finsemble.ServiceManager.getActiveServices", {}, {
		subscribeCallback: function subscribeCallback(error, subscribe) {
			if (subscribe) {
				subscribe.sendNotifyToSubscriber("getActiveServices has been deprecated. Please use 'Finsemble.State.Services' for all service state, or 'Finsemble.Service.State.[ServiceName]' for individual service state.", {});
			}
		}
	});

	baseService.setOnline();
});

window.RouterService = serviceInstance; // make accessible for convenience (private window)

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\router\\routerService.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\router\\routerService.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ })

/******/ });
//# sourceMappingURL=routerService.js.map