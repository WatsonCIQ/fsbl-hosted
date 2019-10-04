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
/******/ 	return __webpack_require__(__webpack_require__.s = 189);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
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
/* 1 */
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
/* 2 */
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
/* 3 */
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
/* 4 */
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
/* 5 */
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
/* 6 */
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
/* 7 */
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
/* 8 */
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
/* 9 */
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
/* 10 */
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
/* 11 */
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
/* 12 */
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
/* 13 */
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
/* 14 */
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
/* 15 */
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
/* 16 */
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
/* 17 */
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
/* 18 */
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
/* 19 */
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
/* 20 */
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
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const validate_1 = __webpack_require__(6);
const logger_1 = __webpack_require__(0);
const baseClient_1 = __webpack_require__(7);
const p_limit_1 = __webpack_require__(36);
const disentangledUtils_1 = __webpack_require__(23);
const limit = p_limit_1.default(1);
/**
 *
 * @introduction
 * <h2>Storage Client</h2>
 * The Storage client handles saving and retrieving data for your application.
 * @hideconstructor
 *  @todo add clear method
 * @constructor
 */
class StorageClient extends baseClient_1._BaseClient {
    constructor() {
        super(...arguments);
        //Did this because "delete" is a reserved keyword; for autocomplete the client is exported as a namespace with a bunch of functions and wouldn't work with a function called delete.
        this.delete = this.remove;
    }
    /**
     * Define the username for storage (i.e., each user has unique storage)
     * @param {Object} params - Params object
     * @param {String} params.user -  user name
     * @param {function} cb -  callback to be called on success
     *
     * @example
     * StorageClient.setUser({ user: "JohnDeere"});
     */
    setUser(params, cb) {
        validate_1.default.args(params.user, "string", cb, "function=");
        this.routerClient.query("Storage.setUser", { user: params.user }, function (err, response) {
            const logMethod = err ? logger_1.default.system.error : logger_1.default.system.info;
            logMethod("APPLICATION LIFECYCLE:StorageClient.setUser", params, err, response);
            if (cb) {
                cb(err, response.data);
            }
        });
    }
    ;
    /**
     * Specifies the data store.  For normal operation this function doesn't have to be invoked -- the default data store is set in configuration.
     * @param {Object} params - Params object
     * @param {String} params.topic -  if specified then data store is set only for topic
     * @param {string} params.dataStore -  identifies the data store (e.g. "localStorage", "redis")
     * @param {function} cb -  callback to be called on success
     *
     * @example
     * StorageClient.setStore({topic:"finsemble", dataStore:"redis"})
     */
    setStore(params, cb) {
        validate_1.default.args(params.topic, "string", params.dataStore, "string=", cb, "function=");
        logger_1.default.system.log("APPLICATION LIFECYCLE:StorageClient.setStore", params, cb);
        this.routerClient.query("Storage.setStore", params, (err, response) => {
            const logMethod = err ? logger_1.default.system.error : logger_1.default.system.info;
            logMethod("Storage.setStore", err, response);
            if (cb) {
                cb(err, response.data);
            }
        });
    }
    ;
    /**
     * Save a key value pair into storage.
     * @param {Object} params - Params object
     * @param {String} params.topic -  storage topic for key being stored
     * @param {String} params.key -  The key to be stored
     * @param {any} params.value -  The value to be stored
     * @param {function} cb -  callback to be called on success
     *
     * @example
     * StorageClient.save({topic:"finsemble", key:"testKey", value:"testValue"})
     */
    save(params, cb) {
        if (typeof params.key !== "string" || typeof params.topic !== "string") {
            throw new Error("Values for key and topic must be strings.");
        }
        const promiseResolver = (resolve, reject) => {
            validate_1.default.args(params.topic, "string", params.key, "string", params.value, "any", cb, "function=");
            this.routerClient.query("Storage.save", params, (err, response) => {
                const logMethod = err ? logger_1.default.system.error : logger_1.default.system.info;
                logMethod("Storage.save", err, response);
                if (cb) {
                    cb(err, response.data);
                }
                if (err) {
                    reject({ err: err, data: null });
                }
                else {
                    resolve({ err: err, data: response.data });
                }
            });
        };
        return new Promise(promiseResolver);
    }
    ;
    /**
     *
     * @param params
     * @private
     */
    save1(params) {
        return limit(() => this.save(params));
    }
    /**
     * Get a value from storage.
     * @param {Object} params - Params object
     * @param {String} params.key -  The key to get from storage
     * @param {function} cb -  callback to be called on success
     *
     * @example
     * StorageClient.get({topic:"finsemble", key:"testKey"}, function(err, data){
     *	var myData = data;
     * });
     */
    get(params, cb) {
        if (typeof params.key !== "string" || typeof params.topic !== "string") {
            throw new Error("Values for key and topic must be strings.");
        }
        const promiseResolver = (resolve, reject) => {
            validate_1.default.args(params.topic, "string", params.key, "string", cb, "function=");
            this.routerClient.query("Storage.get", params, (err, response) => {
                if (err) {
                    logger_1.default.system.error("Storage.get", err, response);
                    cb(err, response ? response.data : null);
                    return reject(err, response ? response.data : null);
                }
                logger_1.default.system.info("Storage.get", err, response);
                if (cb)
                    cb(err, response.data);
                resolve(response.data);
            });
        };
        return new Promise(promiseResolver);
    }
    ;
    /**
     *
     * @param params
     * @param cb
     * @private
     */
    get1(params, cb) {
        return limit(() => this.get(params));
    }
    /**
     * Asynchronously updates provided key in storage by first retrieving the key
     * then running a provided function on the result and re-saving its value.
     * There’s no guarantees of consistency or atomicity
     *
     * @param params {any} Update storage params
     * @param params.topic {string} The storage topic
     * @param params.key {string} The storage key
     * @param params.updateFn {Function} Function to run to determine the value to store
     * @private
     */
    async updateStorage(params) {
        const { topic, key, updateFn } = params;
        const result = await this.get({ topic, key });
        return this.save({ topic, key, value: updateFn(result) });
    }
    /**
     *
     * @param params
     * @private
     */
    updateStorage1(params) {
        return limit(() => this.updateStorage(params));
    }
    /**
     * Get all keys for the topic.
     * @param {Object} params - Params object
     * @param {String} params.topic -  topic for the keys to return
     * @param {String=} params.keyPrefix -  filter all keys that don't start with this prefix
     * @param {function} cb -  callback to be called on success
     *
     * @example
     * StorageClient.keys({topic:"finsemble", keyPrefix:"test"}, function(err, data){
     *	var myKeys = data;
     * });
     */
    keys(params, cb) {
        validate_1.default.args(params.topic, "string", cb, "function=");
        logger_1.default.system.debug("StorageClient.keys", params, cb);
        this.routerClient.query("Storage.keys", params, function (err, response) {
            const logMethod = err ? logger_1.default.system.error : logger_1.default.system.info;
            logMethod("Storage.keys", err, response);
            if (cb) {
                cb(err, response.data);
            }
        });
    }
    ;
    /**
     *
     * @param params
     * @private
     */
    keys1(params) {
        return limit(() => disentangledUtils_1.promisify(this.keys.bind(this))(params));
    }
    /**
     * Get a multiple values from storage based on regex.(coming soon)
     * @param {Object} params - Params object
     * @param {function} cb -  callback to be called on success
     * @private
     * @todo make this work.
     * @example
     * StorageClient.get({key:"testKey"});
     */
    getMultiple(params, cb) {
        logger_1.default.system.info("StorageClient.getMultiple", params, cb);
        this.routerClient.query("Storage.getMultiple", params, function (err, response) {
            const logMethod = err ? logger_1.default.system.error : logger_1.default.system.info;
            logMethod("StorageClient.getMultiple:", params, response);
            if (cb) {
                cb(err, response);
            }
        });
    }
    ;
    /**
     * Delete a value from storage.
     * @param {Object} params - Params object
     * @param {String} params.key -  The key to get from storage
     * @example
     * StorageClient.remove({key:"testKey"})
     */
    remove(params, cb) {
        const promiseResolver = (resolve, reject) => {
            validate_1.default.args(params.topic, "string", params.key, "string", cb, "function=");
            this.routerClient.query("Storage.delete", params, function (err, response) {
                const logMethod = err ? logger_1.default.system.error : logger_1.default.system.info;
                logMethod("StorageClient.delete", err, response);
                if (cb) {
                    cb(err, response.data);
                }
                if (err) {
                    reject({ err: err, data: null });
                }
                else {
                    resolve({ err: err, data: response.data });
                }
            });
        };
        return new Promise(promiseResolver);
    }
    ;
    /**
     *
     * @param params
     * @private
     */
    remove1(params) {
        return limit(() => this.remove(params));
    }
    clearCache(cb) {
        logger_1.default.system.log("StorageClient.clearCache", cb);
        this.routerClient.query("Storage.clearCache", null, function (err, response) {
            const logMethod = err ? logger_1.default.system.error : logger_1.default.system.info;
            logMethod("StorageClient.clearCache", err, response);
            if (cb) {
                cb(err, response.data);
            }
        });
    }
    ;
}
exports.StorageClient = StorageClient;
;
var storageClient = new StorageClient({
    startupDependencies: {
        services: ["storageService"]
    },
    onReady: function (cb) {
        if (cb) {
            cb();
        }
    },
    name: "storageClient"
});
exports.default = storageClient;


/***/ }),
/* 22 */
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
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = __webpack_require__(39);
const get = __webpack_require__(28);
const pick = __webpack_require__(37);
//Class without deep openfin/system dependencies.
function guuid() {
    return uuid_1.v1(); // return global uuid
}
exports.guuid = guuid;
function clone(obj, logFn) {
    //This has been tested a good amount. Previous to this commit we were using a mix of deepmerge and JSON.parse(JSON.stringify()).
    //Trying lodash.deepclone made my tests take 2-3s.
    //JSON.parse everywhere made them take ~ 1s.
    //Using JSON.parse on arrays and deep merge on objects makes them take 7-900ms.
    if (Array.isArray(obj)) {
        return obj.slice();
    }
    try {
        return JSON.parse(JSON.stringify(obj));
    }
    catch (e) {
        logFn("clone error", e);
        return e;
    }
}
exports.clone = clone;
;
function capitalizeFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
exports.capitalizeFirst = capitalizeFirst;
class MockLogger {
    constructor({ debug } = { debug: true }) {
        if (debug) {
            this.system = console;
            this.system.debug = console.log;
        }
        else {
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
    isLogMessage() { return true; }
    ;
    start() { }
}
;
exports.mockLogger = new MockLogger();
/** Converts a flat array into an array of arrays of length n.
 *
 * If the length of the array is not divisble by n, the last
 * element of the new array will contain the remainder items.
*/
function chunkArray(n, arr) {
    if (n <= 0) {
        throw new Error("Can't chunk array by number less than 0");
    }
    return arr.reduce((prev, curr, index) => {
        if (index % n === 0) {
            const chunk = [];
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
exports.chunkArray = chunkArray;
/**
 * Confirms wether a variable passed to it exists and is a number.
 * If true, returns the parsed Number, otherwise returns false
 * @param {string} [num] A string potentially containing a number
 * @returns False or Number(input)
 */
function isNumber(num) {
    if (!num || Number.isNaN(Number(num))) {
        return false;
    }
    return Number(num);
}
exports.isNumber = isNumber;
;
/** Returns exactly what's passed to it. Useful for higher-order functions. */
function identity(arg) {
    return arg;
}
exports.identity = identity;
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
function promisify(f, thisContext) {
    return function () {
        let args = Array.prototype.slice.call(arguments);
        return new Promise((resolve, reject) => {
            args.push((err, result) => err ? reject(err) : resolve(result));
            f.apply(thisContext, args);
        });
    };
}
exports.promisify = promisify;
/**
 * Wraps a promsie in logs that fire immediately before and after the execution of the promise. Returns a new promise.
 *
 * @param {*} logger A logging function that will log the message. E.g. `Logger.system.debug` or `console.log`.
 * @param {string} message A message to be logged. Suffixed with "start" and "end", before and after the promise, respectively.
 * @param {Promise} promise The promise to be wrapped.
 */
exports.instrumentPromise = async (logger, message, promise) => {
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
exports.composeRL = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)));
/**
 * getProp utility - an alternative to lodash.get
 * @author @harish2704, @muffypl, @pi0, @imnnquy
 * @param {Object} object
 * @param {String|Array} path
 * @param {*} defaultVal
 */
function getProp(object, path, defaultVal) {
    const _path = Array.isArray(path)
        ? path
        : path.split('.').filter(i => i.length);
    if (!_path.length) {
        return object === undefined ? defaultVal : object;
    }
    return getProp(object[_path.shift()], _path, defaultVal);
}
exports.getProp = getProp;
function getUniqueName(baseName = "RouterClient") {
    return `${baseName}-${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 10000)}`;
}
exports.getUniqueName = getUniqueName;
function getRandomWindowName(s, uuid) {
    return `${getUniqueName(s)}-${uuid}`;
}
exports.getRandomWindowName = getRandomWindowName;
/**
 * Creates a promise that rejcts after the specified time with
 * the given message.
 */
function timeoutPromise(ms, message) {
    return new Promise((resolve, reject) => {
        let id = setTimeout(() => {
            clearTimeout(id);
            reject(message);
        }, ms);
    });
}
exports.timeoutPromise = timeoutPromise;
/**
 * Wraps a promise in another promise that either rejects after the specified number of miliseconds
 * or resolves with the result of the promise.
 */
function wrapWithTimeout(promise, ms, message) {
    return Promise.race([
        promise,
        timeoutPromise(ms, message),
    ]);
}
exports.wrapWithTimeout = wrapWithTimeout;
/**
 * Will determine if a given window is a StackedWindow. Returns true if the window is a
 * StackedWindow, false otherwise
 * @param {FinsembleWindow} win The window to check for StackedWindow
 */
function isStackedWindow(win) {
    return win &&
        ((get(win, "windowIdentifier.windowType")
            || win.windowType) === "StackedWindow");
}
exports.isStackedWindow = isStackedWindow;
;
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
function toRecord(key, arr) {
    const keyFn = typeof key === "string"
        ? x => x[key]
        : key;
    return arr.reduce((prev, curr) => {
        prev[keyFn(curr)] = curr;
        return prev;
    }, {});
}
exports.toRecord = toRecord;
/**
 * Given an object and array of keys as strings,
 * returns a new object copied from the first but
 * with those keys removed.
 */
function removeKeys(obj, keys) {
    if (!obj)
        return obj;
    const allKeys = Object.keys(obj);
    const keepKeys = allKeys.filter(x => !keys.includes(x));
    return pick(obj, keepKeys);
}
exports.removeKeys = removeKeys;


/***/ }),
/* 24 */
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
/* 25 */
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
/* 26 */
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
/* 27 */
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
/* 28 */
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

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    symbolTag = '[object Symbol]';

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/,
    reLeadingDot = /^\./,
    rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

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
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Symbol = root.Symbol,
    splice = arrayProto.splice;

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map'),
    nativeCreate = getNative(Object, 'create');

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

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
  return this.has(key) && delete this.__data__[key];
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
  return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
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
      length = entries ? entries.length : 0;

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
      length = entries ? entries.length : 0;

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
  return getMapData(this, key)['delete'](key);
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
  getMapData(this, key).set(key, value);
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

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
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = isKey(path, object) ? [path] : castPath(path);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
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
  var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

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
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value) {
  return isArray(value) ? value : stringToPath(value);
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
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
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
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoize(function(string) {
  string = toString(string);

  var result = [];
  if (reLeadingDot.test(string)) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to process.
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
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result);
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Assign cache to `_.memoize`.
memoize.Cache = MapCache;

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
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
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
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
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

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

module.exports = get;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ }),
/* 29 */
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
/* 30 */
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
/* 31 */
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
/* 32 */,
/* 33 */,
/* 34 */,
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

var rng = __webpack_require__(18);
var bytesToUuid = __webpack_require__(17);

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;


/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const pTry = __webpack_require__(38);

const pLimit = concurrency => {
	if (concurrency < 1) {
		throw new TypeError('Expected `concurrency` to be a number from 1 and up');
	}

	const queue = [];
	let activeCount = 0;

	const next = () => {
		activeCount--;

		if (queue.length > 0) {
			queue.shift()();
		}
	};

	const run = (fn, resolve, ...args) => {
		activeCount++;

		const result = pTry(fn, ...args);

		resolve(result);

		result.then(next, next);
	};

	const enqueue = (fn, resolve, ...args) => {
		if (activeCount < concurrency) {
			run(fn, resolve, ...args);
		} else {
			queue.push(run.bind(null, fn, resolve, ...args));
		}
	};

	const generator = (fn, ...args) => new Promise(resolve => enqueue(fn, resolve, ...args));
	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount
		},
		pendingCount: {
			get: () => queue.length
		}
	});

	return generator;
};

module.exports = pLimit;
module.exports.default = pLimit;


/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    symbolTag = '[object Symbol]';

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

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
      length = array ? array.length : 0,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
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

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol = root.Symbol,
    propertyIsEnumerable = objectProto.propertyIsEnumerable,
    spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * The base implementation of `_.flatten` with support for restricting flattening.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {number} depth The maximum recursion depth.
 * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
 * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, depth, predicate, isStrict, result) {
  var index = -1,
      length = array.length;

  predicate || (predicate = isFlattenable);
  result || (result = []);

  while (++index < length) {
    var value = array[index];
    if (depth > 0 && predicate(value)) {
      if (depth > 1) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, depth - 1, predicate, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

/**
 * The base implementation of `_.pick` without support for individual
 * property identifiers.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} props The property identifiers to pick.
 * @returns {Object} Returns the new object.
 */
function basePick(object, props) {
  object = Object(object);
  return basePickBy(object, props, function(value, key) {
    return key in object;
  });
}

/**
 * The base implementation of  `_.pickBy` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} props The property identifiers to pick from.
 * @param {Function} predicate The function invoked per property.
 * @returns {Object} Returns the new object.
 */
function basePickBy(object, props, predicate) {
  var index = -1,
      length = props.length,
      result = {};

  while (++index < length) {
    var key = props[index],
        value = object[key];

    if (predicate(value, key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
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
    otherArgs[start] = array;
    return apply(func, this, otherArgs);
  };
}

/**
 * Checks if `value` is a flattenable `arguments` object or array.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
 */
function isFlattenable(value) {
  return isArray(value) || isArguments(value) ||
    !!(spreadableSymbol && value && value[spreadableSymbol]);
}

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
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
function isArguments(value) {
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

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
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
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
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
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
 * Creates an object composed of the picked `object` properties.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The source object.
 * @param {...(string|string[])} [props] The property identifiers to pick.
 * @returns {Object} Returns the new object.
 * @example
 *
 * var object = { 'a': 1, 'b': '2', 'c': 3 };
 *
 * _.pick(object, ['a', 'c']);
 * // => { 'a': 1, 'c': 3 }
 */
var pick = baseRest(function(object, props) {
  return object == null ? {} : basePick(object, arrayMap(baseFlatten(props, 1), toKey));
});

module.exports = pick;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const pTry = (fn, ...arguments_) => new Promise(resolve => {
	resolve(fn(...arguments_));
});

module.exports = pTry;
// TODO: remove this in the next major version
module.exports.default = pTry;


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

var v1 = __webpack_require__(19);
var v4 = __webpack_require__(35);

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;


/***/ }),
/* 40 */,
/* 41 */,
/* 42 */,
/* 43 */,
/* 44 */,
/* 45 */,
/* 46 */,
/* 47 */,
/* 48 */,
/* 49 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__clients_logger__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__clients_logger___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__clients_logger__);


class BoxMath {
	static isPointOnSegment(point, segment) {
		//y = mx + b;
		//Equation above transforms into this:
		//(y - y1)	 x - x1
		//-------- = --------
		//y2 - y1 	 x2 - x1

		//which is this:
		//(y - y1) * (x2 - x1) = (x - x1) * ( y2 - y1)
		var x = point.x,
		    y = point.y,
		    x1 = segment.min.x,
		    x2 = segment.max.x,
		    y1 = segment.min.y,
		    y2 = segment.max.y;

		var isInBounds = x >= x1 && x <= x2 && y >= y1 && y <= y2;
		//The equation above will tell us whether the point is on the line, assuming it has no start and end. This checks to see if the point is within the beginning and end of the segment. If not, it can't be on our segment.
		if (!isInBounds) {
			return false;
		}
		var isOnLine = (y - y1) * (x1 - x2) === (x - x1) * (y1 - y2);
		return isOnLine;
	}

	/**
 * @function {function name}
 * @param  {type} req {description}
 * @return {type} {description}
 */
	static getVertices(req) {
		return [
		//top left
		{
			x: req.left,
			y: req.top,
			label: "topLeft"
		},
		//top right
		{
			x: req.right,
			y: req.top,
			label: "topRight"
		}, {
			x: req.right,
			y: req.bottom,
			label: "bottomRight"
		}, {
			x: req.left,
			y: req.bottom,
			label: "bottomLeft"
		}];
	}

	/**
 * @function {function name}
 * @param  {type} segment {description}
 * @return {type} {description}
 */
	static getVertexOnSegment(segment) {
		for (let vertex in this.vertices) {
			if (BoxMath.isPointOnSegment(this.vertices[vertex], segment)) {
				return vertex;
			}
		}
		return false;
	}

	/**
 * @function {function name}
 * @param  {type} bounds     {description}
 * @param  {type} bufferSize {description}
 * @return {type} {description}
 */
	static getSnappingRegions(bounds, bufferSize = 0) {
		let { left, top, right, bottom } = bounds;
		let leftMinusBuffer = left - bufferSize,
		    leftPlusBuffer = left + bufferSize,
		    topMinusBuffer = top - bufferSize,
		    topPlusBuffer = top + bufferSize,
		    rightMinusBuffer = right - bufferSize,
		    rightPlusBuffer = right + bufferSize,
		    bottomPlusBuffer = bottom + bufferSize,
		    bottomMinusBuffer = bottom - bufferSize;
		return {
			topLeft: {
				min: {
					x: leftMinusBuffer,
					y: topMinusBuffer
				},
				max: {
					x: leftPlusBuffer,
					y: top
				}
			},
			topRight: {
				min: {
					x: rightMinusBuffer,
					y: topMinusBuffer
				},
				max: {
					x: rightPlusBuffer,
					y: top
				}
			},
			rightTop: {
				min: {
					x: right,
					y: top
				},
				max: {
					x: rightPlusBuffer,
					y: topPlusBuffer
				}
			},
			rightBottom: {
				min: {
					x: right,
					y: bottomMinusBuffer
				},
				max: {
					x: rightPlusBuffer,
					y: bottom
				}
			},

			bottomLeft: {
				min: {
					x: leftMinusBuffer,
					y: bottom
				},
				max: {
					x: leftPlusBuffer,
					y: bottomPlusBuffer
				}
			},
			bottomRight: {
				min: {
					x: rightMinusBuffer,
					y: bottom
				},
				max: {
					x: rightPlusBuffer,
					y: bottomPlusBuffer
				}
			},
			leftTop: {
				min: {
					x: leftMinusBuffer,
					y: top
				},
				max: {
					x: left,
					y: topPlusBuffer
				}
			},
			leftBottom: {
				min: {
					x: leftMinusBuffer,
					y: bottomMinusBuffer
				},
				max: {
					x: left,
					y: bottom
				}
			},
			left: {
				min: {
					x: leftMinusBuffer,
					y: topMinusBuffer
				},
				max: {
					x: leftPlusBuffer,
					y: bottomPlusBuffer
				}
			},
			bottom: {
				min: {
					x: leftMinusBuffer,
					y: bottom
				},
				max: {
					x: rightPlusBuffer,
					y: bottomPlusBuffer
				}
			},
			right: {
				min: {
					x: rightMinusBuffer,
					y: topPlusBuffer
				},
				max: {
					x: rightPlusBuffer,
					y: bottomPlusBuffer
				}
			},
			top: {
				min: {
					x: left,
					y: topMinusBuffer
				},
				max: {
					x: right,
					y: top
				}
			},
			inner: {
				min: {
					x: left,
					y: top
				},
				max: {
					x: right,
					y: bottom
				}
			}
		};
	}

	/**
 * @function {function name}
 * @param  {type} bounds {description}
 * @return {type} {description}
 */
	static getWindowBoundingBox(bounds) {
		return {
			min: {
				x: bounds.left,
				y: bounds.top
			},
			max: {
				x: bounds.right,
				y: bounds.bottom
			}
		};
	}

	static between(params) {
		var min = params.min,
		    max = params.max,
		    num = params.num,
		    inclusive = params.inclusive;
		if (inclusive) {
			return num >= min && num <= max;
		}
		return num > min && num < max;
	}

	/**
 * @function {function name}
 * @param  {type} window1 {description}
 * @param  {type} window2 {description}
 * @return {type} {description}
 */
	static intersectBoundingBoxes(window1, window2) {
		if (window1.max.x < window2.min.x) {
			return false;
		} // 1 is left of 2
		if (window1.min.x > window2.max.x) {
			return false;
		} // 1 is right of 2
		if (window1.max.y < window2.min.y) {
			return false;
		} // 1 is above 2
		if (window1.min.y > window2.max.y) {
			return false;
		} // 1 is below 2
		return true; // boxes overlap
	}

	/**
 * @function {function name}
 * @param  {type} num {description}
 * @param  {type} pct {description}
 * @return {type} {description}
 */
	static getPct(num, pct) {
		return pct * num;
	}

	/**
 * @function {function name}
 * @param  {type} num {description}
 * @param  {type} pct {description}
 * @return {type} {description}
 */
	static scaleProportionately(num, pct) {
		return Math.floor(num + this.getPct(num, pct));
	}

	/**
 * @function {function name}
 * @param  {type} num1 {description}
 * @param  {type} num2 {description}
 * @return {type} {description}
 */
	static getPercentChange(num1, num2) {
		var pctChange = Math.abs((num1 - num2) / num1);
		if (num2 < num1) {
			pctChange = -pctChange;
		}
		return pctChange;
	}

	/**
  * Gets the area of the overlap between two rectangles.
  * @param {*} rect1
  * @param {*} rect2
  */
	static getOverlap(rect1, rect2) {
		let x_overlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
		let y_overlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
		return x_overlap * y_overlap;
	}

	/**
  * Checks if point is in box (inclusive)
  * @param {*} point
  * @param {*} box
  */
	static isPointInBox(point, box) {
		if (point.left) point.x = point.left;
		if (point.top) point.y = point.top;
		if (!box.right) box.right = box.left + box.width;
		if (!box.bottom) box.bottom = box.top + box.height;
		if (point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom) {
			return true;
		}
		return false;
	}
	/**
  * Clip A with B. return where the boxes don't intersect.
  * @param {DockableBox} rectA
  * @param {DockableBox} rectB
  *
  * @memberof BoxMath
  */
	static clipRect(rectA, rectB, edge) {
		let clip = rectA;
		let corners = this.getVertices(rectB);
		//This array will hold the corners of the clipping rectangle that are within the clipped rectangle's boundaries.
		let cornersInBox = [];
		for (let i = 0; i < corners.length; i++) {
			let corner = corners[i];
			corner.label = corner.label.toLowerCase();
			//The goal here is to detect which edges of the clipping box exists within the clipped box's boundaries - EXCLUDING the edges of the clipped box.

			/**
    * The A = B + C. In other words, it's our hole. B is the window that we're using to fill the hole.
    *
   		In this case, A and B share their top right and top left corners. ALl we care about here is the bottom left and bottom right of B.
   		The result of this function is C.
    		+-------------------+
   		|                   |
   		|                   |
   		|                   |
   		|                   |
   		|         B         |
   		|                   |
   		|                   |
   		|                   |
   		+-------------------+
   		|                   |
   		|                   |
   		|                   |
   		|                   |
   		|         C         |
   		|                   |
   		|                   |
   		|                   |
   		|                   |
   		|                   |
   		+-------------------+
    * */

			//The block of code below kicks out any points on B that are corners on A.
			if (this.isPointInBox(corner, rectA)) {
				if (corner.label === "bottomright" && corner.y === rectA.bottom && corner.x === rectA.right) {
					continue;
				}

				if (corner.label === "bottomleft" && corner.y === rectA.bottom && corner.x === rectA.left) {
					continue;
				}

				if (corner.label === "topleft" && corner.x === rectA.left && corner.y === rectA.top) {
					continue;
				}

				if (corner.label === "topright" && corner.x === rectA.right && corner.y === rectA.top) {
					continue;
				}
				cornersInBox.push(corner.label);
			}
		}

		/**
   * Going back to our example earlier. Remember, A is the larger box that encompasses B and C. In this case, only two corners are within A. (bottom left, bottom right).
  		+-------------------+
  		|                   |
  		|                   |
  		|                   |
  		|                   |
  		|         B         |
  		|                   |
  		|                   |
  		|                   |
  		+-------------------+
  		|                   |
  		|                   |
  		|                   |
  		|                   |
  		|         C         |
  		|                   |
  		|                   |
  		|                   |
  		|                   |
  		|                   |
  		+-------------------+
  	* */
		if (cornersInBox.length === 2) {
			//left edge is in box.
			if (cornersInBox.includes("topleft") && cornersInBox.includes("bottomleft")) {
				clip.right = rectB.left;
			} else if (cornersInBox.includes("topright") && cornersInBox.includes("bottomright")) {
				clip.left = rectB.right;
			} else {
				if (cornersInBox.includes("topleft") && cornersInBox.includes("topright")) {
					clip.bottom = rectB.top;
				} else if (cornersInBox.includes("bottomleft") && cornersInBox.includes("bottomright")) {
					clip.top = rectB.bottom;
				}
			}
		} else {
			/****
   * In this case, A is the wide horizontal box. B is the tall vertical box. Their bottom left corners align at point X.
   *  In this case, only one corner (bottom left of B) is within the bounds of A.
   					    B
           +------------------+
   		|                  |
   		|                  |
   		|                  |
   		|                  |
   		|                  |
   		|                  |
   		|                  |
   		|                  |
   		|                  |
   		|                  |
   		|                  |
   		+---------------------------------------------------------------------+
   		|                  |                                                  |
   		|                  |                                                  |
   		|                  |                                                  |
   		|                  |                  CLIP                            |  A
   		|                  |                                                  |
   		|                  |                                                  |
   		+------------------+--------------------------------------------------+
   	   X
    */

			const ISLEFTORRIGHT = edge === "left" || edge === "right";
			const ISTOPORBOTTOM = edge === "top" || edge === "bottom";
			if (cornersInBox.includes("topleft")) {

				if (ISTOPORBOTTOM) {
					clip.right = rectB.left;
					if (rectB.top > rectA.bottom) {
						clip.bottom = rectB.top;
					}
				} else {
					clip.left = rectB.left;
					if (rectB.top < rectA.bottom) {
						clip.bottom = rectB.top;
					}
				}
			} else if (cornersInBox.includes("topright")) {
				if (ISTOPORBOTTOM) {
					clip.left = rectB.right;
					if (rectB.top > rectA.bottom) {
						clip.bottom = rectB.top;
					}
				} else {
					clip.right = rectB.right;
					if (rectB.top < rectA.bottom) {
						clip.bottom = rectB.top;
					}
				}
			} else if (cornersInBox.includes("bottomleft")) {

				if (ISLEFTORRIGHT) {
					if (rectB.bottom > rectA.top) {
						clip.top = rectB.bottom;
					}
				} else {
					clip.right = rectB.left;
					if (rectB.bottom < rectA.top) {
						clip.top = rectB.bottom;
					}
				}
			} else {

				if (ISLEFTORRIGHT) {
					if (rectB.bottom > rectA.top) {
						clip.top = rectB.bottom;
					}
				} else {
					clip.left = rectB.right;
					if (rectB.bottom < rectA.top) {
						clip.top = rectB.bottom;
					}
				}
			}
		}

		clip.width = clip.right - clip.left;
		clip.height = clip.bottom - clip.top;
		return clip;
	}

}
/* harmony default export */ __webpack_exports__["a"] = (BoxMath);

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\boxMath.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\boxMath.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 50 */,
/* 51 */,
/* 52 */,
/* 53 */,
/* 54 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__boxMath__ = __webpack_require__(49);

class DockableBox {
	constructor(bounds) {
		if (bounds) {
			this.left = bounds.left;
			this.top = bounds.top;
			this.right = bounds.right;
			this.bottom = bounds.bottom;
			this.width = bounds.right - bounds.left;
			this.height = bounds.bottom - bounds.top;
			this.windowBoundingBox = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].getWindowBoundingBox(this.getBounds());
			this.setSnappingRegions();
		}
		this.getVertices = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].getVertices;
		return this;
	}
	/**
 * @function {function name}
 * @param  {type} format         {description}
 * @param  {type} includeCorners {description}
 * @return {type} {description}
 */
	getEdges(format, includeCorners) {
		if (includeCorners === undefined || includeCorners === true) {
			includeCorners = 0;
		} else {
			includeCorners = 1;
		}

		var top = {
			min: {
				x: this.left + includeCorners,
				y: this.top
			},
			max: {
				x: this.right - includeCorners,
				y: this.top
			}
		};
		var left = {
			min: {
				x: this.left,
				y: this.top + includeCorners
			},
			max: {
				x: this.left,
				y: this.bottom - includeCorners
			}
		};
		var right = {
			min: {
				x: this.right,
				y: this.top + includeCorners
			},
			max: {
				x: this.right,
				y: this.bottom - includeCorners
			}
		};
		var bottom = {
			min: {
				x: this.left + includeCorners,
				y: this.bottom
			},
			max: {
				x: this.right - includeCorners,
				y: this.bottom
			}
		};

		if (format === "obj") {
			return {
				top: top,
				right: right,
				bottom: bottom,
				left: left
			};
		}
		return [top, right, bottom, left];
	}

	getCorners() {
		return this.getCornerObject(this.getBounds());
	}

	/**
 * @function {function name}
 * @param  {type} point          {description}
 * @param  {type} includeCorners {description}
 * @return {type} {description}
 */
	pointIsOnBoundingBox(point, includeCorners) {
		//If it's on the top or bottom edge.
		var edges = this.getEdges("arr", includeCorners);

		for (var i = 0; i < edges.length; i++) {
			var segment = edges[i];
			if (__WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].isPointOnSegment(point, segment)) {
				return true;
			}
		}
		return false;
	}

	/**
 * @function {function name}
 * @param  {type} corner {description}
 * @return {type} {description}
 */
	getPointByVertex(corner) {

		corner = corner.toLowerCase();
		var point = {
			x: this.left,
			y: this.top
		};
		if (corner.includes("bottom")) {
			point.y = this.bottom;
		}
		if (corner.includes("right")) {
			point.x = this.right;
		}
		return point;
	}

	/**
 * @function {function name}
 * @param  {type} point     {description}
 * @param  {type} tolerance {description}
 * @return {type} {description}
 */
	getEdgeByPoint(point, tolerance) {
		var edges = this.getEdges("obj");

		for (var edge in edges) {
			if (__WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].isPointOnSegment(point, edges[edge])) {
				return edge;
			}
		}
		return false;
	}

	/**
 * @function {function name}
 * @param  {type} point     {description}
 * @param  {type} tolerance {description}
 * @return {type} {description}
 */
	getVertexByPoint(point, tolerance) {
		if (tolerance === undefined) {
			tolerance = 0;
		}
		var corner = null,
		    justAnEdge = true;
		if (point.y <= this.windowBoundingBox.max.y + tolerance && point.y >= this.windowBoundingBox.max.y - tolerance) {
			corner = "bottom";
		}
		if (point.y <= this.windowBoundingBox.min.y + tolerance && point.y >= this.windowBoundingBox.min.y - tolerance) {
			corner = "top";
		}

		if (!corner) {
			return corner;
		}

		if (point.x <= this.windowBoundingBox.min.x + tolerance && point.x >= this.windowBoundingBox.min.x - tolerance) {
			justAnEdge = false;
			corner += "Left";
		}

		if (point.x <= this.windowBoundingBox.max.x + tolerance && point.x >= this.windowBoundingBox.max.x - tolerance) {
			justAnEdge = false;
			corner += "Right";
		}
		if (justAnEdge) {
			return null;
		}
		return corner;
	}

	/**
 * @function getSharedEdges Determines if another window has edges to which our window may snap/dock
 * @param  {type} win2 {description}		* @param  {Window} win2 Window proxy (movement object) of other window to which our window may snap/dock
 * @return {type} {description}		* @param  {number} tolerance Buffer region around edges to determine region for snap / dock
 * @return {object} Object describing shared edges, with boolean top, bottom, left, and right properties
 */
	getSharedEdges(win2, tolerance) {
		if (!tolerance) {
			tolerance = 0;
		}
		//from perspective of stationary window;
		var sharedEdges = {
			top: false,
			left: false,
			right: false,
			bottom: false
		};
		// +--------------------------------+
		// |    Monitor2                    |
		// |                                |
		// |           +---------+          |
		// |           |         |          |
		// |           |  Win2   |          |
		// |           |         |          |
		// +--------------------------------+
		// |           |         |          |
		// |           | MyWindow|          |
		// |           |         |          |
		// |           +---------+          |
		// |    Monitor1                    |
		// |                                |
		// +--------------------------------+
		// Return all false if we aren't intersecting at all or snapping exactly across the monitor boundary,
		// e.g. (see above) if top of my window is snapped to bottom of the other window and the top of my other window is the top
		// of the monitor, return shared edges.
		const intersection = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].intersectBoundingBoxes(this.buffer, win2.windowBoundingBox);
		if (!intersection || this.monitor && (this.top === win2.bottom && this.top === this.monitor.top || this.left === win2.right && this.left === this.monitor.left || this.bottom === win2.top && this.bottom === this.monitor.bottom || this.right === win2.left && this.right === this.monitor.right)) {
			return sharedEdges;
		}
		var inRightTolerance = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].between({
			num: win2.right,
			min: this.left - tolerance,
			max: this.left + tolerance,
			inclusive: true
		});
		var inLeftTolerance = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].between({
			num: win2.left,
			min: this.right - tolerance,
			max: this.right + tolerance,
			inclusive: true
		});
		var inTopTolerance = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].between({
			num: win2.top,
			min: this.bottom - tolerance,
			max: this.bottom + tolerance,
			inclusive: true
		});
		var inBottomTolerance = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].between({
			num: win2.bottom,
			min: this.top - tolerance,
			max: this.top + tolerance,
			inclusive: true
		});

		if (inRightTolerance) {
			if (win2.bottom > this.top - tolerance && win2.top < this.bottom + tolerance) {
				sharedEdges.left = true;
			}
		}
		if (inLeftTolerance) {
			//if(600 > 0 && 300 < 300)
			if (win2.bottom > this.top - tolerance && win2.top < this.bottom + tolerance) {
				sharedEdges.right = true;
			}
		}

		if (inBottomTolerance) {
			if (win2.left < this.right + tolerance && win2.right > this.left - tolerance) {
				sharedEdges.top = true;
			}
		}

		if (inTopTolerance) {
			if (win2.left < this.right + tolerance && win2.right > this.left - tolerance) {
				sharedEdges.bottom = true;
			}
		}

		return sharedEdges;
	}

	/**
 * @function getSharedCorners Determines if another window has corners to which our window may snap/dock
 * @param  {type} win2 {description}		* @param  {Window} win2 Window proxy (movement object) of other window to which our window may snap/dock
 * @return {type} {description}		* @return {object} Object describing shared corners, including original vertices (topLeft, topRight, bottomRight, bottomLeft),
 *					and amended vertices (rightTop, rightBottom, leftTop, leftBottom) to indicate shared tops or bottoms on
 *					on the left or right.
 */
	getSharedCorners(win2) {
		var sharedCorners = {
			topLeft: false,
			topRight: false,
			bottomLeft: false,
			bottomRight: false,

			//distinction is in the placement. a window placed to the side and top aligned would share the rightTop corner, but not the topRight
			rightTop: false,
			rightBottom: false,
			leftTop: false,
			leftBottom: false
		};

		// +--------------------------------+
		// |    Monitor2                    |
		// |                                |
		// |           +---------+          |
		// |           |         |          |
		// |           |  Win2   |          |
		// |           |         |          |
		// +--------------------------------+
		// |           |         |          |
		// |           | MyWindow|          |
		// |           |         |          |
		// |           +---------+          |
		// |    Monitor1                    |
		// |                                |
		// +--------------------------------+
		// Return all false if we aren't intersecting at all or snapping exactly across the monitor boundary,
		// e.g. (see above) if top of my window is snapped to bottom of the other window and the top of my other window is the top
		// of the monitor, return shared edges.
		const intersection = !__WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].intersectBoundingBoxes(this.innerBuffer, win2.windowBoundingBox) && __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].intersectBoundingBoxes(this.buffer, win2.windowBoundingBox);
		if (!intersection || this.monitor && (this.top === win2.bottom && this.top === this.monitor.top || this.left === win2.right && this.left === this.monitor.left || this.bottom === win2.top && this.bottom === this.monitor.bottom || this.right === win2.left && this.right === this.monitor.right)) {
			return sharedCorners;
		}
		let myCorners = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].getVertices(this.getBounds());
		let theirCorners = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].getVertices(win2);
		myCorners.forEach(corner => {
			for (var i = 0; i < theirCorners.length; i++) {
				var theirCorner = theirCorners[i];
				if (corner.x === theirCorner.x && corner.y === theirCorner.y) {
					sharedCorners[corner.label] = true;
				}
			}
		});
		var sharedEdges = {
			bottom: this.bottom === win2.bottom || this.bottom === win2.top,
			top: this.top === win2.top || this.top === win2.bottom,
			right: this.right === win2.left || this.right === win2.right,
			left: this.left === win2.right || this.left === win2.left
		};
		var sideTop = false,
		    sideBottom = false;
		if (this.top === win2.top) {
			sideTop = true;
		}
		if (this.bottom === win2.bottom) {
			sideBottom = true;
		}
		if (sharedEdges.right) {
			if (sideTop) {
				sharedCorners.rightTop = true;
			}
			if (sideBottom) {
				sharedCorners.rightBottom = true;
			}
		}

		if (sharedEdges.left) {
			if (sideBottom) {
				sharedCorners.leftBottom = true;
			}
			if (sideTop) {
				sharedCorners.leftTop = true;
			}
		}

		return sharedCorners;
	}

	/**
 * @function {function name}
 * @return {type} {description}
 */
	getBounds() {
		return {
			left: this.left,
			right: this.right,
			top: this.top,
			bottom: this.bottom,
			width: this.width,
			height: this.height
		};
	}

	/**
 * @function {function name}
 * @param  {type} req {description}
 * @return {type} {description}
 */
	getCornerObject(req) {
		let corners = {};
		let vertices = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].getVertices(req);
		for (let i = 0; i < vertices.length; i++) {
			let corner = vertices[i];
			corners[corner.label] = corner;
		}
		return corners;
	}

	/**
 * @function {function name}
 * @param  {type} mouse {description}
 * @return {type} {description}
 */
	getGrabbedEdge(mouse) {
		//window.methodCalls["getGrabbedEdge"]++;
		var tolerance = 15;
		var mouseBox = {
			min: {
				x: mouse.x - tolerance,
				y: mouse.y - tolerance
			},
			max: {
				x: mouse.x + tolerance,
				y: mouse.y + tolerance
			}
		};
		var edges = ["top", "bottom", "left", "right"];
		for (var i = 0; i < edges.length; i++) {
			var edge = edges[i];
			if (__WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].intersectBoundingBoxes(mouseBox, this.snappingRegions[edge])) {
				return edge;
			}
		}
		return false;
	}

	/**
 * @function {function name}
 * @param  {type} request {description}
 * @return {type} {description}
 */
	getResizeHandle(request) {
		if (this.resizeHandle) {
			return this.resizeHandle;
		}
		var resizeHandle;
		if (request.mousePosition) {
			resizeHandle = this.getVertexByPoint(request.mousePosition, 15);
			if (!resizeHandle) {
				resizeHandle = this.getGrabbedEdge(request.mousePosition);
			}
		}

		if (!resizeHandle) {
			if (request.top !== this.top) {
				resizeHandle = "top";
				if (request.right !== this.right) {
					resizeHandle = "topRight";
				} else if (request.left !== this.left) {
					resizeHandle = "topLeft";
				}
			} else if (request.right !== this.right) {
				resizeHandle = "right";
				if (request.bottom !== this.bottom) {
					resizeHandle = "bottomRight";
				} else if (request.top !== this.top) {
					resizeHandle = "topRight";
				}
			} else if (request.bottom !== this.bottom) {
				resizeHandle = "bottom";

				if (request.left !== this.left) {
					resizeHandle = "bottomLeft";
				} else if (request.right !== this.right) {
					resizeHandle = "bottomRight";
				}
			} else if (request.left !== this.left) {
				resizeHandle = "left";
				if (request.top !== this.top) {
					resizeHandle = "topLeft";
				} else if (request.bottom !== this.bottom) {
					resizeHandle = "bottomLeft";
				}
			}
		}

		if (resizeHandle && request.changeType !== 0) {
			//if we didn't find a resizeHandle, then no edges moved. Send last handle.
			this.resizeHandle = resizeHandle;
		} else if (!resizeHandle && request.changeType === 0) {
			resizeHandle = "top";
		}
		return resizeHandle;
	}

	/**
 * @function {function name}
 * @param  {type} bufferSize {description}
 * @return {type} {description}
 */
	setBuffer(bufferSize) {
		if (bufferSize === undefined && this.bufferSize === null) {
			return;
		} else if (bufferSize !== undefined) {
			this.bufferSize = bufferSize;
		} else {
			bufferSize = this.bufferSize;
		}
		this.buffer = {
			min: {
				x: this.left - bufferSize,
				y: this.top - bufferSize
			},
			max: {
				x: this.right + bufferSize,
				y: this.bottom + bufferSize
			}
		};
	}

	/**
 * @function {function name}
 * @return {type} {description}
 */
	setSnappingRegions() {
		this.snappingRegions = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].getSnappingRegions(this, this.bufferSize);
	}

	sharesACornerWith(win) {
		var sharedCorners = this.getSharedCorners(win);
		var corners = ["topLeft", "topRight", "rightTop", "leftTop", "bottomRight", "bottomLeft", "rightBottom", "leftBottom"];
		for (var i = 0; i < corners.length; i++) {
			var corner = corners[i];
			if (sharedCorners[corner]) {
				return true;
			}
		}
		return false;
	}

	/**
 * @function {function name}
 * @param  {type} win {description}
 * @return {type} {description}
 */
	sharesAnEdgeWith(win) {
		var sharedEdges = this.getSharedEdges(win);

		var edges = ["top", "right", "left", "bottom"];
		for (var i = 0; i < edges.length; i++) {
			var edge = edges[i];
			if (sharedEdges[edge]) {
				return true;
			}
		}
		return false;
	}

	/**
 * @function {function name}
 * @param  {type} request {description}
 * @return {type} {description}
 */
	canSnapToWindow(request) {
		if (this.sharesAnEdgeWith(request)) {
			return true;
		}
		return __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].intersectBoundingBoxes(this.buffer, request.windowBoundingBox) && !__WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].intersectBoundingBoxes(this.innerBuffer, request.windowBoundingBox);
	}
}
/* harmony default export */ __webpack_exports__["a"] = (DockableBox);

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockableBox.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockableBox.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ObjectPool_1 = __webpack_require__(58);
const WindowPool_1 = __webpack_require__(66);
const logger_1 = __webpack_require__(0);
const dependencies = {
    Logger: logger_1.default
};
const GroupPoolSingleton = new ObjectPool_1.ObjectPool("GroupPoolSingleton", dependencies);
exports.GroupPoolSingleton = GroupPoolSingleton;
const MonitorPoolSingleton = new ObjectPool_1.ObjectPool("MonitorPoolSingleton", dependencies);
exports.MonitorPoolSingleton = MonitorPoolSingleton;
//Generic list of all windows that the windowService knows about. Contains finsemble windows
const WindowPoolSingleton = new ObjectPool_1.ObjectPool("WindowPoolSingleton", dependencies);
exports.WindowPoolSingleton = WindowPoolSingleton;
//Specific pool of dockable windows.
const DockingPoolSingleton = new WindowPool_1.WindowPool("DockingPoolSingleton", dependencies);
exports.DockingPoolSingleton = DockingPoolSingleton;


/***/ }),
/* 56 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(process, module) {

const EDGES = ["top", "left", "bottom", "right"];
/* harmony export (immutable) */ __webpack_exports__["EDGES"] = EDGES;

const CORNERS = ["topLeft", "topRight", "bottomLeft", "bottomRight"];
/* harmony export (immutable) */ __webpack_exports__["CORNERS"] = CORNERS;

const MINIMUM_HEIGHT = 32;
/* harmony export (immutable) */ __webpack_exports__["MINIMUM_HEIGHT"] = MINIMUM_HEIGHT;

const MINIMUM_WIDTH = 98;
/* harmony export (immutable) */ __webpack_exports__["MINIMUM_WIDTH"] = MINIMUM_WIDTH;

const OPPOSITE_EDGE_MAP = {
	left: "right",
	right: "left",
	top: "bottom",
	bottom: "top",
	topLeft: "bottomRight",
	topRight: "bottomLeft",
	bottomLeft: "topRight",
	bottomRight: "topLeft"
};
/* harmony export (immutable) */ __webpack_exports__["OPPOSITE_EDGE_MAP"] = OPPOSITE_EDGE_MAP;

const SPLIT_HANDLE_MAP = {
	bottomLeft: ["bottom", "left"],
	bottomRight: ["bottom", "right"],
	leftBottom: ["left", "bottom"],
	rightBottom: ["right", "bottom"],
	topRight: ["top", "right"],
	topLeft: ["top", "left"],
	rightTop: ["right", "top"],
	leftTop: ["left", "top"],
	left: ["left"],
	right: ["right"],
	top: ["top"],
	bottom: ["bottom"]
};
/* harmony export (immutable) */ __webpack_exports__["SPLIT_HANDLE_MAP"] = SPLIT_HANDLE_MAP;


 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\constants.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\constants.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 57 */,
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/** Singleton of the Logger class shared among all instances of ObjectPool
 * @TODO Refactor to instance member of class.
 */
let Logger;
class ObjectPool {
    constructor(name, dependencies) {
        if (dependencies) {
            Logger = dependencies.Logger;
        }
        else {
            throw new Error("ObjectPool class requires dependency injection. Ensure that dependencies are being passed in as the 2nd parameter.");
        }
        this.objects = {};
        this.poolName = name;
    }
    get(name, throwError = true) {
        var result;
        if (!this.objects.hasOwnProperty(name)) {
            if (throwError && name && !(name.toLowerCase().includes("finsemble") || name.toLowerCase().includes("service"))) {
                Logger.system.warn(`${this.poolName} pool.get failed for ${name}`);
            }
        }
        else {
            result = this.objects[name];
        }
        return result;
    }
    remove(name) {
        Logger.system.debug(`${this.poolName} pool.remove for ${name}`);
        if (!this.objects.hasOwnProperty(name)) {
            Logger.system.warn(`${this.poolName} pool.remove operating on non-existent value for ${name}`);
        }
        delete this.objects[name];
    }
    add(name, obj) {
        Logger.system.debug(`${this.poolName} pool.add for ${name}`);
        if (this.objects.hasOwnProperty(name)) {
            Logger.system.warn(`${this.poolName} pool.add overwriting existing value for ${name}`);
        }
        this.objects[name] = obj;
    }
    *iterator() {
        for (let name in this.objects) {
            let obj = this.get(name);
            yield obj;
        }
    }
    getAll() {
        return this.objects;
    }
}
exports.ObjectPool = ObjectPool;


/***/ }),
/* 59 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_async__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_async___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_async__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__constants__);


/** Singleton of the Logger class shared among all instances of ObjectPool
 * @TODO Refactor to instance member of class.
 */
let Logger;
const groupStates = {
	NORMAL: 0,
	MINIMIZING: 1,
	MINIMIZED: 2,
	RESTORING: 3
};
class WindowGroup {
	/**
  *
  * @param {object} params Params
  * @param {string} params.name name of the group
  * @param {object} params.windows array of windows in the group
  * @param {object} dependencies Dependency object that provides a Logger.
  * @param {Logger} dependencies.Logger
  */
	constructor(params, dependencies) {
		Logger = dependencies.Logger;
		this.name = params.name;
		this.groupState = groupStates.NORMAL;
		this.GROUPSTATES = groupStates;
		this.isAlwaysOnTop = false;
		if (params.windows) {
			this.windows = params.windows;
		} else {
			this.windows = {};
		}
	}

	destroy() {
		delete this.windows;
		delete this.name;
	}

	setWindows(windows) {
		this.windows = windows;
	}

	getWindows() {
		return this.windows;
	}

	addWindow(win) {
		Logger.system.debug("windowGroup.addWindow", win.name);
		this.windows[win.name] = win;
		if (this.isMovable) win.alwaysOnTop(this.isAlwaysOnTop);
	}

	/**
  *
  * @param {*} arr either a window name or window identifier or a list of window names or identifiers
  */
	removeWindows(arr, cb = Function.prototype) {
		var windowName;
		if (!Array.isArray(arr)) {
			arr = [arr];
		}
		var self = this;
		arr.forEach(function (win) {
			if (typeof win === "string" || win instanceof String) {
				windowName = win;
			} else {
				windowName = win.windowName || win.name;
			}
			Logger.system.debug("windowGroup.removeWindows", windowName);

			if (this.windows[windowName]) {
				delete self.windows[windowName];
			} else {
				return;
			}
		}, this);
		cb();
	}

	/**
  *
  * @param {*} win either a window name or window identifier
  */
	getWindow(win) {
		if (typeof win === "string" || win instanceof String) {
			//we have a window name
			return this.windows[win];
		} // we have an identifier
		if (win && (win.windowName || win.name)) {
			return this.windows[win.windowName || win.name];
		}
		return null;
	}

	getWindowNames() {
		let names = [];
		for (let name in this.windows) {
			names.push(name);
		}
		return names;
	}

	addWindows(arr) {
		if (!Array.isArray(arr)) {
			arr = [arr];
		}
		var self = this;
		arr.forEach(function (win) {
			Logger.system.debug("windowGroup.addWindows", win.name);

			self.windows[win.name] = win;
			if (this.isMovable) win.alwaysOnTop(this.isAlwaysOnTop);
		}, this);
	}

	getWindowArray() {
		let arr = [];
		for (let windowName in this.windows) {
			arr.push(this.windows[windowName]);
		}
		return arr;
	}

	minimizeAll() {
		if (this.groupState == groupStates.RESTORING) {
			this.interruptRestore = true;
			this.groupState = groupStates.NORMAL;
		}
		if (this.groupState !== groupStates.NORMAL) return;
		this.groupState = groupStates.MINIMIZING;
		for (let windowName in this.windows) {
			let win = this.windows[windowName];
			if (win.windowState != __WEBPACK_IMPORTED_MODULE_1__constants__["WINDOWSTATE"].MINIMIZED) win.minimize();
		}
		this.groupState = groupStates.MINIMIZED;
		this.interruptRestore = false;
	}

	minimize(params) {
		if (!params) {
			return this.minimizeAll();
		}
		let { windowList, componentType } = params;
		if (componentType) windowList = this.findAllByComponentType(componentType);

		for (let w of windowList) {
			let win;
			if (!(typeof w === "string" || w instanceof String)) {
				win = this.getWindow(w.windowName || w.name);
			} else {
				win = this.getWindow(w);
			}
			if (win && win.windowState != __WEBPACK_IMPORTED_MODULE_1__constants__["WINDOWSTATE"].MINIMIZED) {
				win.minimize();
			}
		}
	}

	restoreAll(cb = Function.prototype) {
		if (this.groupState !== groupStates.MINIMIZED) return cb();
		var self = this;
		this.groupState = groupStates.RESTORING;
		function restoreWindow(windowName, done) {
			if (self.interruptRestore) return done("restore interrupted");
			let win = self.windows[windowName];
			if (win.restore) {
				// if win.win exists, we're in a dockableGroup of dockalbeWindows
				let windowState = win.win ? win.win.windowState : win.windowState;
				if (windowState != __WEBPACK_IMPORTED_MODULE_1__constants__["WINDOWSTATE"].NORMAL) {
					// The dockableWindow only takes a single parameter...a callback.
					if (win.win) {
						win.restore(done);
					} else {
						// All other window wraps accept 2 params for restore.
						win.restore({}, done);
					}
				} else {
					done();
				}
			} else {
				Logger.system.error(windowName + " does not implement restore");
				done();
			}
		}
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_async__["forEach"])(Object.keys(this.windows), restoreWindow, function (err, data) {
			self.interruptRestore = false;
			if (!err) {
				self.groupState = groupStates.NORMAL;
			}
			cb(err, data);
		});
	}
	//takes an array of window names.
	restore(params, cb) {
		let { windowList } = params;
		var self = this;
		function restoreWindow(windowName, done) {
			let win = self.windows[windowName];
			if (win.restore) {
				self.windows[windowName].restore({}, done);
			} else {
				Logger.system.error(windowName + " does not implement restore");
				done();
			}
		}
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_async__["forEach"])(windowList, restoreWindow, cb);
	}

	// Bring all windows to top. Also sets the state of the group to always on top and new windows added to the group inherit the state of thw window
	allAlwaysOnTop(alwaysOnTop) {
		this.isAlwaysOnTop = alwaysOnTop;
		this.alwaysOnTop({ windowList: Object.keys(this.windows), restoreWindows: true, alwaysOnTop: alwaysOnTop });
	}

	// Set specific windows to top. Generally should call allAlwaysOnTop
	alwaysOnTop(params) {
		if (!params || params && Object.keys(params).length === 0) {
			params = { windowList: Object.keys(this.windows), restoreWindows: true };
		}
		let { windowList, componentType } = params;
		if (windowList && typeof windowList[0] !== "string") {
			windowList = windowList.map(win => win.windowName);
		}
		if (componentType) windowList = this.findAllByComponentType(componentType);
		var self = this;
		if (!windowList) windowList = Object.keys(this.windows);
		for (let w in windowList) {
			let win;
			if (Array.isArray(windowList)) w = windowList[w];

			if (!(typeof w === "string" || w instanceof String)) {
				win = self.getWindow(w.windowName || w.name);
			} else {
				win = self.getWindow(w);
			}
			if (win) {
				win.alwaysOnTop(params.alwaysOnTop);
			}
		}
	}

	/**
  * Brings a group of windows to the front (BTF). In other words, puts those windows on top of any other windows so that they can be seen
  * @param {object} params
  * @param {bool=true} params.restoreWindows If true then windows will attempt to be restored (un-minimized) before being brought to front
  * @param {array} params.windowList The list of windows to BTF. Defaults to the windows that are in this window group. This can be a list of window names, or a list of actual window instances.
  * @param {string} params.componentType Optionally provide a componentType to BTF only those windows of that type in the list of windows.
  */
	bringToFront(params, cb = Function.prototype) {
		var self = this;
		if (!params) params = {};
		if (typeof params.restoreWindows == "undefined") params.restoreWindows = true;

		// TODO, [terry] this "windowList" logic is copy and pasted many times in windowGroup.js. It should be in a helper function.
		let { windowList, componentType } = params;
		// Determine if the windowList is a list of window names, or a list of actual windows (in which case we extract the name)
		if (windowList && typeof windowList[0] !== "string") {
			windowList = windowList.map(win => win.windowName);
		}

		// Get all windows *in this group* of this component type, then convert them into an array of strings to be passed into the other group functions.
		if (componentType) {
			windowList = [];
			let windows = this.findAllByComponentType(componentType);
			windows.forEach(win => {
				if (win && win.name) {
					windowList.push(win.name);
				}
			});
		}

		// Default to the windows in this group, actually the most common case
		if (!windowList) windowList = Object.keys(this.windows);

		function doBTF() {
			// TODO, [terry] this chunk of code is repeated three times in windowGroup.js. It should be abstracted away
			// TODO, [Sidd] this code now uses async, previously was not using using the callback properly. Make all group functions do this

			__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_async__["each"])(windowList, (w, callback) => {
				let win;
				//if (Array.isArray(windowList)) w = windowList[w];

				if (!(typeof w === "string" || w instanceof String)) {
					win = self.getWindow(w.windowName || w.name);
				} else {
					win = self.getWindow(w);
				}
				if (win) {
					win.bringToFront(callback);
				} else {
					callback();
				}
			}, () => {
				cb();
			});
		}

		if (params.restoreWindows) {
			if (typeof windowList[0] !== "string") {
				windowList = Object.keys(windowList);
			}
			this.restore({ windowList }, doBTF);
		} else {
			doBTF();
		}
	}

	hyperFocus(params) {
		let windowList = params.windowList;
		// If we got a list of identifiers, convert to names
		for (let w in windowList) {
			let win = windowList[w];
			if (!(typeof win === "string" || win instanceof String)) {
				windowList[w] = win.windowName || win.name;
			}
		}

		// If we are trying to hyper focus a stack make sure to also include the children
		for (let windowName in this.windows) {
			let win = this.getWindow(windowName);
			let parent = win.getParent();
			// If window is in a stack and the stack is in the windowList but this window is not, add it.
			if (parent && windowList.includes(parent.name) && !windowList.includes(windowName)) {
				windowList.push(windowName);
			}
		}

		for (let windowName in this.windows) {
			if (!windowList.includes(windowName)) {
				this.windows[windowName].minimize();
			} else {
				this.windows[windowName].restore(() => {
					this.windows[windowName].bringToFront();
				});
			}
		}
	}

	findAllByComponentType(componentType) {
		var windowList = [];
		for (let windowName in this.windows) {
			let theWindow = this.windows[windowName];
			let descriptor = theWindow.windowDescriptor;
			if (componentType === (descriptor.component ? descriptor.component.type : descriptor.customData.component.type)) {
				//TODO - figure out why this is different in some cases
				windowList.push(this.windows[windowName]);
			}
		}
		return windowList;
	}

}
/* harmony export (immutable) */ __webpack_exports__["a"] = WindowGroup;


 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\common\\window\\windowGroup.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\common\\window\\windowGroup.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 60 */,
/* 61 */,
/* 62 */,
/* 63 */,
/* 64 */,
/* 65 */,
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ObjectPool_1 = __webpack_require__(58);
class WindowPool extends ObjectPool_1.ObjectPool {
    *iterator() {
        for (let windowName in this.objects) {
            let win = this.get(windowName);
            if (!win.isMinimized && !win.isHidden) {
                yield win;
            }
        }
    }
}
exports.WindowPool = WindowPool;


/***/ }),
/* 67 */,
/* 68 */,
/* 69 */,
/* 70 */,
/* 71 */,
/* 72 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__common_window_windowGroup__ = __webpack_require__(59);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__dockableBox__ = __webpack_require__(54);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__constants__ = __webpack_require__(56);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__boxMath__ = __webpack_require__(49);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };





/** Singleton of the Logger class shared among all instances of DockableGroup
 * @TODO Refactor to instance member of class.
 */
let Logger;
const clone = function (obj) {
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
		Logger.system.error("clone error", e);
		return e;
	}
};

class DockableGroup extends __WEBPACK_IMPORTED_MODULE_0__common_window_windowGroup__["a" /* WindowGroup */] {
	/**
  *
  * @param {*} config Config for the group. See WindowGroup for more.
  * @param {*} dependencies Dependency object that provides a Logger.
  */
	constructor(config, dependencies) {
		super(config, dependencies);
		if (dependencies) {
			Logger = dependencies.Logger;
		} else {
			throw new Error("DockableGroup class requires dependency injection. Ensure that dependencies are being passed in as the 2nd parameter.");
		}
		this.setMinimums(config);
		this.name = config.name;
		this.isMovable = typeof config.isMovable !== "undefined" ? config.isMovable : false;
		this.windowBoundingBox = {
			min: {
				x: 0,
				y: 0
			},
			max: {
				x: 0,
				y: 0
			}
		};

		//Number of time's we've tried to fill a particular time. It's limited to 20 attempts to prevent infinite loops. Logs are emitted if we get into that state. Better to throw a warning than an infinite loop.
		this.fillAttempts = 0;
		// Add all dockableBox methods to this
		this.dockableBox = new __WEBPACK_IMPORTED_MODULE_1__dockableBox__["a" /* default */]();
		this.inheritDockableBox();
		this.removeWindow = this.removeWindow.bind(this);
	}

	inheritDockableBox() {
		var self = this;
		var dockableBoxMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.dockableBox)).filter(function (p) {
			if (p != "constructor") {
				return typeof self.dockableBox[p] === "function";
			}
			return false;
		});
		for (let i = 0; i < dockableBoxMethods.length; i++) {
			let methodName = dockableBoxMethods[i];
			if (!this[methodName]) {
				this[methodName] = function () {
					return self.dockableBox[methodName].call(self, ...arguments);
				};
			}
		}
	}
	addWindow(win) {
		if (Object.keys(this.windows).length === 0) {
			this.windowBoundingBox = clone(win.windowBoundingBox);
		}
		if (this.isMovable) win.win._updateOptions({
			options: {
				"taskbarIconGroup": this.name
			}
		});
		super.addWindows(win);
		this.updateBounds();
		if (this.isMovable) this.bringToFront({ restoreWindows: false });
	}

	updateBounds() {
		let groupBounds = this.calculateOuterBounds();
		if (!groupBounds) {
			return;
		}
		this.windowBoundingBox = groupBounds;
		this.setBuffer();
		this.setBounds({
			left: groupBounds.min.x,
			top: groupBounds.min.y,
			right: groupBounds.max.x,
			bottom: groupBounds.max.y
		});
	}

	saveIndividualWindowStates() {
		let windowList = this.getWindows();
		for (let windowName in windowList) {
			let win = this.getWindow(windowName);
			win.win.saveCompleteWindowState();
		}
	}

	startMove() {
		let windowList = this.getWindows();
		for (let windowName in windowList) {
			let win = this.getWindow(windowName);
			win.win.startMove();
		}
	}
	stopMove() {
		let windowList = this.getWindows();
		for (let windowName in windowList) {
			let win = this.getWindow(windowName);
			win.win.stopMove();
		}
	}
	getWindowsOnEdges() {
		let windowsOnSegment = {};
		let windowList = this.getWindows();
		for (let windowName in windowList) {
			let win = this.getWindow(windowName);
			for (let i = 0; i < __WEBPACK_IMPORTED_MODULE_2__constants__["EDGES"].length; i++) {
				let edge = __WEBPACK_IMPORTED_MODULE_2__constants__["EDGES"][i];
				if (win[edge] === this[edge]) {
					windowsOnSegment[win.name] = win;
				}
			}
		}
		return windowsOnSegment;
	}

	isARectangle() {
		this.updateBounds();
		let windows = this.getWindows();
		let groupArea = this.width * this.height;
		let windowArea = 0;
		for (let windowName in windows) {
			let win = this.getWindow(windowName);
			windowArea += win.width * win.height;
		}
		return groupArea === windowArea;
	}

	/**
  * When you move a group of windows left to right, the anchor algorithm finds the left-most window, and then sorts all of the windows on how close they are to that window. This function just finds the appropriate anchor for that move.
  * @param {*} movingDirection
  */
	getMoveAnchor(movingDirection) {

		const DIMENSIONAL_MAP = {
			LeftTop: {
				primaryDimension: "bottom",
				secondaryDimension: "right"
			},
			LeftBottom: {
				primaryDimension: "top",
				secondaryDimension: "right"
			},
			TopLeft: {
				primaryDimension: "right",
				secondaryDimension: "bottom"
			},
			BottomLeft: {
				primaryDimension: "right",
				secondaryDimension: "top"
			},
			RightTop: {
				primaryDimension: "bottom",
				secondaryDimension: "left"
			},
			RightBottom: {
				primaryDimension: "top",
				secondaryDimension: "left"
			},
			TopRight: {
				primaryDimension: "left",
				secondaryDimension: "bottom"
			},
			BottomRight: {
				primaryDimension: "left",
				secondaryDimension: "top"
			},
			Right: {
				primaryDimension: "left",
				secondaryDimension: "top"
			},
			Left: {
				primaryDimension: "right",
				secondaryDimension: "top"
			},
			Top: {
				primaryDimension: "top",
				secondaryDimension: "left"
			},
			Bottom: {
				primaryDimension: "bottom",
				secondaryDimension: "left"
			}
		};
		//Had this happen but not reliably. Possible that it fires when the window isn't moving at all and the direction isn't set. Stopgap.
		if (!DIMENSIONAL_MAP[movingDirection]) {
			console.debug(`"${movingDirection}" is not a valid argument. Valid options are ${Object.keys(DIMENSIONAL_MAP).join(", ")}.`);
			return "NotMoving";
		}

		let { primaryDimension, secondaryDimension } = DIMENSIONAL_MAP[movingDirection];
		let windowArray = this.getWindowArray();
		//Sorts on the primary dimension; if they're tied, it sorts on the secondary dimension.
		return windowArray.sort((a, b) => {
			let aDim = a[primaryDimension],
			    bDim = b[primaryDimension],
			    comparingDimension = primaryDimension;
			if (aDim === bDim) {
				aDim = a[secondaryDimension];
				bDim = b[secondaryDimension];
				comparingDimension = secondaryDimension;
			}

			if (comparingDimension === "top" || comparingDimension === "left") {
				//Will order the array in ascending order.
				//In OpenFin's virtual screen, the top-left is the 0,0 point (though it could be (-2000, 2000), or whatever). The higher the top or left, the further to the right the window is. The higher the top number, the closer to the bottom of the screen the window is.
				return aDim - bDim;
			}
			//sort the array in descending order.
			//The higher the right value, the closer the window is to the right of the screen. The higher the bottom number, the closer it is to the toolbar/top of the monitor.
			return bDim - aDim;
		})[0];
	}

	/**
  * Used for resize. Grabs the windows on the opposite side of the resize handle.
 * @function {function name}
 * @param  {type} handle {description}
 * @return {type} {description}
 */
	getAnchors(handle) {
		let edges = {
			top: "bottom",
			right: "left",
			bottom: "top",
			left: "right"
		};

		let edgeArray = handle.split(/(?=[A-Z])/).map(function (s) {
			return s.toLowerCase();
		});

		let anchorNames = [];
		let self = this;

		for (let windowName in this.windows) {
			if (anchorNames.includes(windowName)) {
				continue;
			}
			let win = this.windows[windowName];
			let isAnchor = true;
			edgeArray.forEach(requestedEdge => {
				let edge = edges[requestedEdge];
				if (win[edge] !== self[edge]) {
					isAnchor = false;
				}
			});
			if (isAnchor) {
				anchorNames.push(windowName);
			}
		}

		return anchorNames;
	}

	/**
 * @function {function name}
 * @return {type} {description}
 */
	calculateOuterBounds() {
		let groupBounds = null;

		for (let windowName in this.windows) {
			let win = this.windows[windowName];
			// sometimes we get into a state where right and bottom are not set so groups break regtangularity.
			if (!win.right) win.right = win.left + win.width;
			if (!win.bottom) win.bottom = win.top + win.height;
			if (!groupBounds) {
				groupBounds = {
					min: {
						x: win.left,
						y: win.top
					},
					max: {
						x: win.right,
						y: win.bottom
					}
				};
				continue;
			}

			//Did some testing and this is much faster than ternary operators.
			if (win.left < groupBounds.min.x) {
				groupBounds.min.x = win.left;
			}

			if (win.top < groupBounds.min.y) {
				groupBounds.min.y = win.top;
			}

			if (win.bottom > groupBounds.max.y) {
				groupBounds.max.y = win.bottom;
			}

			if (win.right > groupBounds.max.x) {
				groupBounds.max.x = win.right;
			}
		}
		return groupBounds;
	}

	/**
 * @function {function name}
 * @param  {type} name {description}
 * @return {type} {description}
 */
	removeWindow(name) {
		let win = this.getWindow(name);
		if (this.isMovable) win.win._updateOptions({
			options: {
				"taskbarIconGroup": win.win.uuid
			}
		});
		super.removeWindows(name);
		this.updateBounds();
	}

	/**
 * @function {function name}
 * @param  {type} bounds {description}
 * @return {type} {description}
 */
	getDelta(bounds) {
		return {
			left: bounds.left - this.left,
			right: bounds.right - this.right,
			height: bounds.height - this.height,
			width: bounds.width - this.width
		};
	}

	/**
 * @function {function name}
 * @param  {type} bounds {description}
 * @return {type} {description}
 */
	setBounds(bounds) {
		this.left = bounds.left;
		this.right = bounds.right;
		this.bottom = bounds.bottom;
		this.top = bounds.top;
		this.width = bounds.right - bounds.left;
		this.height = bounds.bottom - bounds.top;
		this.vertices = this.getCornerObject(bounds);
	}
	//Leaving here in case we discover bugs in the new scale.
	deprecatedScale(newBounds, anchor, calculator, cb) {
		if (typeof newBounds.right === "undefined") {
			newBounds.right = newBounds.left + newBounds.width;
			newBounds.bottom = newBounds.top + newBounds.height;
		}
		var splitHandle = anchor.split(/(?=[A-Z])/).map(function (s) {
			return s.toLowerCase();
		});

		let groupIter = calculator.groupWindowIterator(this, splitHandle[0]);
		var movements = {};
		for (let win of groupIter) {
			win.onGroupEdge = {};
			win.resizeHandle = splitHandle[0];
			["top", "right", "left", "bottom"].forEach(handle => {
				if (win[handle] === this[handle]) {
					win.onGroupEdge[handle] = true;
				}
			});
			var newHeight = Math.round(newBounds.height * (win.height / this.height));
			var newWidth = Math.round(newBounds.width * (win.width / this.width));
			var request = win.getBounds();
			request.width = newWidth;
			request.height = newHeight;
			request.right = request.left + request.width;
			request.bottom = request.top + request.height;
			request.name = win.name;

			movements[request.name] = calculator.checkShortCircuits(request);
		}
		splitHandle.forEach(handle => {
			groupIter = calculator.groupWindowIterator(this);
			//cleans up the edges of the group in case rounding error messed us up.
			var oppEdge = __WEBPACK_IMPORTED_MODULE_2__constants__["OPPOSITE_EDGE_MAP"][handle];
			for (var win of groupIter) {
				var moveRequest = movements[win.name];
				if (win.onGroupEdge && win.onGroupEdge[oppEdge] && moveRequest[oppEdge] !== newBounds[oppEdge]) {
					moveRequest.name = win.name;
					moveRequest[oppEdge] = newBounds[oppEdge];
					if (oppEdge === "bottom") {
						moveRequest.top = moveRequest.bottom - moveRequest.height;
					}
					if (oppEdge === "top") {
						moveRequest.bottom = moveRequest.top + moveRequest.height;
					}
					if (oppEdge === "left") {
						moveRequest.right = moveRequest.left + moveRequest.width;
					}
					if (oppEdge === "right") {
						moveRequest.left = moveRequest.right - moveRequest.width;
					}
					moveRequest.width = moveRequest.right - moveRequest.left;
					moveRequest.height = moveRequest.bottom - moveRequest.top;
					movements[win.name] = calculator.checkShortCircuits(moveRequest, win);
				}
			}
		});

		for (var windowName in movements) {
			//TODO: make the actual move only happen once. Looks like it happens here and in group.UpdateBounds
			calculator.moveWindow(movements[windowName]);
		}

		var alreadyDanced = [];
		splitHandle.forEach(handle => {
			var groupIter = calculator.groupWindowIterator(this);
			alreadyDanced = [];
			for (let anchor of groupIter) {
				if (!alreadyDanced.includes(anchor.name)) {
					var b = doTheConga(anchor, handle);b;
				}
			}
			// group.updateBounds();
			groupIter = calculator.groupWindowIterator(this);
			//cleans up the edges of the group in case rounding error messed us up.
			for (var win of groupIter) {
				if (win.onGroupEdge && win.onGroupEdge[handle] && win[handle] !== newBounds[handle]) {
					var moveRequest = win.getBounds();
					moveRequest.name = win.name;
					moveRequest[handle] = newBounds[handle];

					moveRequest.width = moveRequest.right - moveRequest.left;
					moveRequest.height = moveRequest.bottom - moveRequest.top;

					calculator.moveWindow(calculator.checkShortCircuits(moveRequest, win));
					var b = doTheConga(win, handle);b;
				}
			}
			this.updateBounds();
		});

		if (cb) cb();

		function doTheConga(win, handle) {
			if (!win) {
				Logger.system.warn("INVESTIGATE: No win passed to doTheConga");
				return;
			}
			var oppEdge = __WEBPACK_IMPORTED_MODULE_2__constants__["OPPOSITE_EDGE_MAP"][handle];

			for (var i = 0, len = win.snappedWindows.length; i < len; i++) {
				var snappedWindowObj = win.snappedWindows[i];
				var snappedWin = calculator.getWindow(snappedWindowObj.name);
				if (!snappedWin) {
					Logger.system.warn(`INVESTIGATE: No Dockable Window found for ${snappedWindowObj.name}`);
					continue;
				}
				let groupIntersection = snappedWin.groupNames.some(name => win.groupNames.includes(name));
				if (!snappedWindowObj.edges[handle] || !groupIntersection) {
					continue;
				}

				var req = snappedWin.getBounds();
				req.name = snappedWin.name;

				snappedWin[oppEdge] = win[handle];
				var top = snappedWin.top,
				    left = snappedWin.left;
				if (handle === "top") {
					top = win.top - snappedWin.height;
				}

				if (handle === "bottom") {
					top = win.bottom;
				}

				if (handle === "right") {
					left = win.right;
				}

				if (handle === "left") {
					left = win.left - snappedWin.width;
				}

				snappedWin.moveTo(left, top);
				var b = doTheConga(snappedWin, handle);b;
				alreadyDanced.push(snappedWin.name);
			}
		}
	}

	/**
  *
  * @param {bounds} newBounds Bounds to scale the group to
  * @param {string} anchor
  * @param {DockingCalculator} calculator
  * @param {function} cb
  */
	scale(newBounds, anchor, calculator, cb) {
		//If you go bananas and try to make the group have negative height or width, many problems arise. Check to make sure the bounds aren't negative or too tiny.
		newBounds = calculator.checkShortCircuits(newBounds, this);
		let windowList = this.getWindowArray().map(win => {
			return _extends({}, win.getBounds(), {
				name: win.name
			});
		});
		let scaleDescriptor = DockableGroup.getScaleDescriptor(this.getBounds(), newBounds);
		///eventually Fix this. Right now it'll just go to the top left.
		let corners = JSON.parse(JSON.stringify(this.vertices));
		for (let corner in corners) {
			corners[corner.toLowerCase()] = corners[corner];
		}

		let anchorPoint = {};
		//The "Anchor" Is where the group is offset by. It's a point. Top/left is a misnomer. After scaling, each window will be shifted by deltaX and deltaY, where the delta is the distance between that window's top left and the anchor's point.
		if (__WEBPACK_IMPORTED_MODULE_2__constants__["EDGES"].includes(anchor)) {
			anchorPoint.top = newBounds.top;
			anchorPoint.left = newBounds.left;
			switch (anchor) {
				case "left":
					//When resizing from the left, we want to make sure the right edge of the group doesn't move.
					anchorPoint.left = newBounds.right;
					break;
				case "top":
					//When resizing from the top, we want to make sure the bottom edge of the group doesn't move.
					anchorPoint.top = newBounds.bottom;
					break;
			}
		} else if (__WEBPACK_IMPORTED_MODULE_2__constants__["CORNERS"].includes(anchor)) {
			//Get the opposite corner; that's the anchor.
			//e.g., when resizing from the top right, the bottom left shouldn't move at all.
			let corner = corners[__WEBPACK_IMPORTED_MODULE_2__constants__["OPPOSITE_EDGE_MAP"][anchor]];
			anchorPoint = {
				top: corner.y,
				left: corner.x
			};
		}
		//Pass in the list of windows and how we much we want to scale it. This returns a list of mutated window bounds objects.
		let scaledWindowList = DockableGroup.getScaledWindowList({
			windowList,
			scaleDescriptor,
			anchor: anchorPoint,
			MINIMUM_HEIGHT: this.MINIMUM_WINDOW_HEIGHT,
			MINIMUM_WIDTH: this.MINIMUM_WINDOW_WIDTH
		});

		//Actually move the windows.
		scaledWindowList.forEach(scaledBounds => {
			calculator.moveWindow(scaledBounds);
		});
		var windowBounds = {};

		this.getWindowArray().forEach(win => windowBounds[win.name] = win.getBounds());

		/**
   * 8/13/19 JC: Added true to the end to set 'triggerByAutoArrange', this will tell the calculator to move the group and to save the bounds
   */
		calculator.cleanupSharedEdges(this, windowBounds, true);

		this.updateBounds();
	}

	/**
  * Sets the minimum height and width for windows. This is used when scaling windows. It prevents us from creating very tiny windows when scaling an entire group.
  * @param {object} cfg
  * @param {number} cfg.MINIMUM_HEIGHT Minimum height a window can scale to.
  * @param {number} cfg.MINIMUM_WIDTH Minimum width a window can scale to.
  */
	setMinimums(cfg) {
		if (cfg) {
			this.MINIMUM_WINDOW_HEIGHT = cfg.MINIMUM_HEIGHT;
			this.MINIMUM_WINDOW_WIDTH = cfg.MINIMUM_WIDTH;
		}
	}

	/**
  * Returns an array of windows that have an edge on a given line segment.
  * @param {object} segment
  * @param {object} segment.min minimum point for the line segment.
  * @param {number} segment.min.x X coordinate for the minimum point for the line segment.
  * @param {number} segment.min.y y coordinate for the minimum point for the line segment.
  * @param {object} segment.min maximum point for the line segment.
  * @param {number} segment.max.x X coordinate for the maximum point for the line segment.
  * @param {number} segment.max.y y coordinate for the maximum point for the line segment.
  * @returns {array} windowsOnSegment Array of dockable windows that have an edge on the line segment.
  */
	getWindowsOnSegment(segment) {
		var windowsOnSegment = [];
		var winPool = this.getWindowNames();
		var points = [segment.min, segment.max];

		for (var i = 0; i < winPool.length; i++) {
			let win = this.getWindow(winPool[i]);
			for (var p = 0, len = points.length; p < len; p++) {
				var point = points[p];
				if (win.pointIsOnBoundingBox(point)) {
					let snapObj = {
						name: win.name,
						edge: win.getEdgeByPoint(point)
					};
					snapObj.segment = win.getEdges("obj")[snapObj.edge];
					windowsOnSegment.push(snapObj);
					break;
				}
			}
		}
		return windowsOnSegment;
	}

	/**
 * Not sure why this function doesn't use the one above. Similar functionality, but you can pass in a string instead of a line segment.
 * @todo, make it use the function above.
 * @param  {dockableWindow} win
 * @param  {string} edge E.g., 'left', 'right', etc.
 * @return {array}
 */
	getWindowsOnEdge(win, edge, includeCorners) {
		if (includeCorners === undefined) {
			includeCorners = false;
		}
		var windowsOnEdge = [];
		if (!edge) {

			//@todo, what went wrong to cause this.................
			return [];
		}

		var oppEdge = __WEBPACK_IMPORTED_MODULE_2__constants__["OPPOSITE_EDGE_MAP"][edge];
		var windowSegment = win.getEdges("obj", includeCorners)[edge];

		for (let windowName in this.windows) {
			let possibleSnapper = this.windows[windowName];
			if (possibleSnapper.name === win.name) {
				continue;
			}
			let segment = possibleSnapper.getEdges("obj", includeCorners)[oppEdge];
			var shouldPush = false;
			let points = [{
				name: possibleSnapper.name,
				val: segment.min
			}, {
				name: possibleSnapper.name,
				val: segment.max
			}, {
				name: win.name,
				val: windowSegment.min
			}, {
				name: win.name,
				val: windowSegment.max
			}];
			if (["top", "bottom"].includes(edge)) {
				if (segment.min.y !== windowSegment.min.y) {
					continue;
				}
				points = points.sort((a, b) => {
					return a.val.x > b.val.x;
				});
			}

			if (["left", "right"].includes(edge)) {
				if (segment.min.x !== windowSegment.min.x) {
					continue;
				}
				points = points.sort((a, b) => {
					return a.val.y > b.val.y;
				});
			}
			if (points[0].name !== points[1].name) {
				shouldPush = true;
			}
			if (shouldPush) {
				let snapObj = {
					name: possibleSnapper.name,
					edge: oppEdge
				};
				windowsOnEdge.push(snapObj);
			}
		}

		return windowsOnEdge;
	}

	/**
  * Given a hole, this function recursively fills the hole, expanding 1 window at a time - until the hole is filled.
  * @param {object} hole
  * @param {*} cb
  */
	fillHole(hole, cb = Function.prototype) {
		this.fillAttempts++;

		let myHole = new __WEBPACK_IMPORTED_MODULE_1__dockableBox__["a" /* default */](hole);

		//First, we need to see which windows in this group border our hole.

		//Get the edges in array format, don't include corners in the calculations.
		let edges = myHole.getEdges("arr", false);
		let candidates = edges.map(edge => this.getWindowsOnSegment(edge));

		//flatten the array.
		candidates = [].concat.apply([], candidates);
		//If we have no windows bordering the hole, there's nothing we can do.
		if (!candidates.length) return;

		//We need some of the methods on the docking calculator. This isn't an ideal way to do things. Would be nice if there was some kind of bridge that could allow move requests without needing the calculator.
		//Chalk that up to a @todo
		const calculator = this.getWindow(candidates[0].name).calculator;

		//Bounding box is needed for `sharesAnEdgeWith`.
		myHole.windowBoundingBox = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getWindowBoundingBox(myHole);

		//If the hole takes up the whole width or whole height of the group, we should scale the remaining windows to fill the hole.
		if ((myHole.width === this.width || myHole.height === this.height) && this.sharesAnEdgeWith(myHole)) {
			let bounds = {};
			//calculates the bounds of the group prior to the hole being created.
			bounds.left = Math.min(myHole.left, this.left);
			bounds.right = Math.max(myHole.right, this.right);
			bounds.top = Math.min(myHole.top, this.top);
			bounds.bottom = Math.max(myHole.bottom, this.bottom);
			bounds.height = bounds.bottom - bounds.top;
			bounds.width = bounds.right - bounds.left;
			let edge = null;

			//These are opposite. When the window leaves the group, the bounds are updated. So here, we compare the edge of the window that left to the group. If it was on the left side of the group - the right side of that window will be butted up against the left side of the group after it leaves.
			if (myHole.width === this.width) {
				if (myHole.top === this.bottom) edge = "bottom";
				if (myHole.bottom === this.top) edge = "top";
			}
			if (myHole.height === this.height) {
				if (myHole.left === this.right) edge = "right";
				if (myHole.right === this.left) edge = "left";
			}
			if (!edge) {
				return new Error("No edge found in fillHoles");
			}
			return this.scale(bounds, edge, calculator);
		}

		//Once we know that we aren't going to have to scale all of the windows, we get here.
		//The goal is to do the least amount of damage possible. So if there are 4 windows that border the hole, we will choose the one that will cascade into the fewest windows. If they all impact no other windows, we just choose the first.
		let potentialImpact = [];
		for (let i = 0; i < candidates.length; i++) {
			let candidate = candidates[i];
			let win = this.getWindow(candidate.name);
			let edge = candidate.edge;

			//These are the windows that would be affected if we resized the candidate window.
			let impactedWindows = this.getWindowsOnEdge(win, edge, false);
			candidate.impactedWindows = impactedWindows.length;
			candidate.win = win;
			potentialImpact.push(candidate);
		}

		//Goes through and gets the window whose resize would trigger a resize on the fewest windows possible.
		let leastImpactfulChange = potentialImpact.reduce(function (p, v) {
			return p.impactedWindows < v.impactedWindows ? p : v;
		});

		//Which edge we're resizing.
		let impactedEdge = leastImpactfulChange.edge;
		//Clone so we don't impact the original windows. Calculate the bounds for our window. We'll use this window if none of the other candidates are better matches.
		let newBounds = JSON.parse(JSON.stringify(leastImpactfulChange.win.getBounds()));
		newBounds[impactedEdge] = myHole[impactedEdge];
		newBounds.height = newBounds.bottom - newBounds.top;
		newBounds.width = newBounds.right - newBounds.left;

		//We'll use this later.
		let holeArea = hole.width * hole.height;
		let leastImpactfulArea = newBounds.width * newBounds.height;
		for (let i = 0; i < candidates.length; i++) {
			let candidate = candidates[i];
			let proposedBounds = JSON.parse(JSON.stringify(candidate.win.getBounds()));
			let proposedImpactedEdge = candidate.edge;
			proposedBounds[proposedImpactedEdge] = myHole[proposedImpactedEdge];
			proposedBounds.height = proposedBounds.bottom - proposedBounds.top;
			proposedBounds.width = proposedBounds.right - proposedBounds.left;
			let candidateArea = proposedBounds.height * proposedBounds.width;

			//If the candidateArea is less than the holeArea, if the candidateArea is larger than the currently chosen window, and resizing it would cause no more damage than the currently chosen window, it becomes the window to resize.
			if (candidateArea - holeArea > 0 && candidateArea > leastImpactfulArea && candidate.impactedWindows <= leastImpactfulChange.impactedWindows) {
				leastImpactfulChange = candidate;
				leastImpactfulArea = candidateArea;
				impactedEdge = proposedImpactedEdge;
				newBounds = proposedBounds;
			}
		}
		//Once we have the window that will cause the least amount of damage, we create a moveRequest to pass to docking. This will be a resize, and it will cascade onto other affected windows.
		newBounds.changeType = 1;
		newBounds.name = leastImpactfulChange.win.name;
		newBounds.resizeHandle = impactedEdge;
		newBounds.forceResizeHandle = true;
		calculator.requestMove(newBounds, () => {
			this.updateBounds();

			//If we only partially filled the hole, calculate the remaining hole, and call recursively.
			if (!this.isARectangle()) {
				if (this.fillAttempts === 20) {
					let windowBounds = JSON.stringify(this.getWindowArray().map(win => win.getBounds()));
					Logger.system.warn("forceObjectsToLogger", "FillHoles failed after 20 attempts. Use first string for test case. Second string is hole", windowBounds, JSON.stringify(myHole.getBounds()));
					this.fillAttempts = 0;
					return;
				}
				let leftovers = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].clipRect(myHole, new __WEBPACK_IMPORTED_MODULE_1__dockableBox__["a" /* default */](newBounds), impactedEdge);
				this.fillHole(leftovers);
			} else {
				calculator.onMouseUp();
				this.fillAttempts = 0;
				return;
			}
		});
	}

	moveTo(bounds, cb = Function.prototype) {
		bounds.anchor = this.getMoveAnchor("BottomRight");
		const calculator = bounds.anchor.calculator;
		bounds.name = bounds.anchor.name;
		bounds.changeType = 0;
		calculator.requestMove(bounds, () => {
			this.updateBounds();
			//Tell the calculator's mouse up function that this action was triggered
			//by auto arrange and we don't want to delete the cached windows positions
			calculator.onMouseUp(bounds.triggeredByAutoArrange);
			cb();
		});
	}
	/**
  * In certain configurations, whether a group is a rectangle is _NOT_ the deciding factor in scaling it. Instead, that decision is made based on whether the user is dragging a corner or an edge. If it's a corner, it must not be on another window's edge. If those conditions are met, we scale the group. This function returns the list of x,y points that will trigger this behavior.
  */
	getCornersThatCauseScaling() {
		let { corners, edges } = this.getCornersAndEdgesOfAllWindows();
		let uniqueCorners = corners.filter((value, index, self) => {
			let firstOccurence = self.findIndex(val => {
				return val.x === value.x && val.y === value.y;
			});
			return firstOccurence === index;
		});
		let cornersNotOnEdges = uniqueCorners.filter(corner => {
			let otherEdges = edges.filter(edge => edge.window !== corner.window);
			return !otherEdges.some(edge => __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].isPointOnSegment(corner, edge));
		});
		return cornersNotOnEdges;
	}

	/**
  * @typedef cornerLabel
  * @param {"topLeft"|"topRight"|"bottomLeft"|"bottomRight"} Label for the corner.
  */

	/**
  * @typedef cornerObject
  * @param {string?} window Name of the window the corner belongs to
  * @param {number} x X coordinate of the corner
  * @param {number} y Y coordinate of the corner
  * @param {cornerLabel} label for the corner.
  */
	/**
  * @typedef edgeObject
  * @param {string?} window Name of the window the edge belongs to
  * @param {object} min Minimum point for line segment
  * @param {number} min.x X coordinate of the minimum point for the edge's line segment.
  * @param {number} min.y Y coordinate of the minimum point for the edge's line segment.
  * @param {object} max maximum point for line segment
  * @param {number} max.x X coordinate of the maximum point for the edge's line segment
  * @param {number} max.y Y coordinate of the maximum point for the edge's line segment
  */
	/**
  * @typedef {object} cornersAndEdges
  * @param {Array<cornerObject>} corners
  * @param {Array<edgeObject>} edges
  */
	/**
  * Helper function that will return all corners and all edges for each window in the group.
  * @returns {cornersAndEdges} cornersAndEdges Corners and edges.
 
  */
	getCornersAndEdgesOfAllWindows() {
		let edges = [];

		let corners = this.getWindowArray().map(win => {
			let crn = win.getVertices(win.getBounds());
			crn = crn.map(c => {
				c.window = win.name;
				return c;
			});
			return crn;
		});

		corners = corners.reduce((acc, val) => acc.concat(val));

		edges = this.getWindowArray().map(win => {
			let edg = win.getEdges("arr", true);
			edg = edg.map(e => {
				e.window = win.name;
				return e;
			});
			return edg;
		});
		edges = edges.reduce((acc, val) => acc.concat(val));
		return { corners, edges };
	}
	/**
  * Returns the scale of bounds 1 relative to bounds 2.
  * If bounds1 is 1, and bounds2 is 2, the scale will come out as 2.
  * If bounds1 is 10 and bounds2 is 5, the scale will come out as 0.5. This is done for both x and y
  * @param {bounds} bounds1
  * @param {bounds} bounds2
  */
	static getScaleDescriptor(bounds1, bounds2) {
		const xScale = bounds2.width / bounds1.width;
		const yScale = bounds2.height / bounds1.height;
		return {
			x: xScale,
			y: yScale
		};
	}

	/**
  * Essentially moves the window's top-left to the x/y coordinates passed in.
  * @param {object} params
  * @param {num} params.x x coordinate of a cartesian coordinate pair.
  * @param {num} params.y y coordinate of a cartesian coordinate pair.
  * @param {bounds} params.bounds bounds object that is being offset
  */
	static getCoordinatesByOffset(params) {
		const { x, y, bounds } = params;
		let offsetX = bounds.left - x;
		let offsetY = bounds.top - y;
		let newBounds = {
			top: bounds.top - offsetY,
			left: bounds.left - offsetX
		};
		newBounds.height = bounds.height;
		newBounds.width = bounds.width;
		newBounds.right = newBounds.left + bounds.width;
		newBounds.bottom = newBounds.top + bounds.height;
		return newBounds;
	}
	/**
  * Given bounds and a scaleDescriptor, returns a scaled bounds object.
  * @param {*} params
  * @param {object} params.bounds Bounds.
  * @param {object} params.scaleDescriptor Tells us how much to scale in the X and Y directions.
  * @param {num} params.scaleDescriptor.x 0-Infinity; how much to scale the window in the x direction
  * @param {num} params.scaleDescriptor.y 0-Infinity; how much to scale the window in the y direction
  * @returns {object} bounds
  */
	static scaleWindow(params) {
		let { bounds, scaleDescriptor } = params;

		//"move" the window to 0,0 -- makes scaling calculations correct.
		const scaledBounds = {
			left: Math.round(bounds.left * scaleDescriptor.x),
			top: Math.round(bounds.top * scaleDescriptor.y),
			height: Math.round(bounds.height * scaleDescriptor.y),
			width: Math.round(bounds.width * scaleDescriptor.x)
		};
		scaledBounds.right = scaledBounds.left + scaledBounds.width;
		scaledBounds.bottom = scaledBounds.top + scaledBounds.height;

		return scaledBounds;
	}

	/**
  * Called after performing scale operations on the group. Depending on where the user scaled the group from, we re-anchor the group so that the move makes sense. Internally, resizes are calculated as if the group was at 0,0. After we do those calculations, we need to re-anchor the group so that the move makes intuitive sense.
  * @param {object} params
  * @param {array} params.windowList Array of bounds objects. Or windows. Haven't decided.ANGLE_instanced_arrays
  * @param {object} params.offset object describing by how much the top and left of a window's bounds should be offset.
  * @param {num} params.offset.left how much to offset the left edge of each window in the group.
  * @param {num} params.offset.top how much to offset the left edge of each window in the group.
  */
	static offsetGroup(params) {
		let { windowList, offset } = params;
		return windowList.map(bounds => {
			bounds.left -= offset.left;
			bounds.top -= offset.top;
			bounds.right = bounds.left + bounds.width;
			bounds.bottom = bounds.top + bounds.height;
			return bounds;
		});
	}

	/**
  * The workhorse of scaling operations. Given a list of windows, how we want to scale them, where to put them after scaling, and a minimum height and width, it will do everything.
  * 1. Moves the group to 0,0.
  * 2. Calculates the size of each window in the array.
  * 3. Actually scales each window.
  * 4. Makes sure no windows got too narrow or too short (check minimum height/width).
  * 5. Fixes any windows that were too small/too narrow.
  * 6. Re-anchors the group so that the move "feels" right. See DockableGroup.'offsetGroup' for a better explanation of what "feels right" means.
  * @param {params} params
  * @param {Array<bounds>} params.windowList
  * @param {scaleDescriptor} params.scaleDescriptor how much to scale in the x and y dimensions.
  * @param {num} param.scaleDescriptor.x How much to scale in the x direction
  * @param {num} param.scaleDescriptor.y How much to scale in the y direction
  * @param {object} param.anchor top/left coordinates of the 'anchor' for the list of windows. After scaling the windows, we need to make sure every window is reset to this anchor. If one resizes from the bottom right of a group, the top left of the group shouldn't change. If you resize from the top left, the bottom right shouldn't move after scaling.
  */
	static getScaledWindowList(params) {
		let { windowList, scaleDescriptor, anchor, MINIMUM_HEIGHT, MINIMUM_WIDTH } = params;
		///MOVE IT TO 0,0
		windowList = this.offsetGroup({
			windowList,
			offset: {
				left: anchor.left,
				top: anchor.top
			}
		});

		///SCALE EVERY WINDOW
		windowList = windowList.map(bounds => {
			let scaledBounds = this.scaleWindow({
				bounds,
				scaleDescriptor
			});

			scaledBounds.name = bounds.name;
			return scaledBounds;
		});

		//find smallest window. If it's beneath the minimum width/height, scale back out.
		let narrowestWindow = windowList.reduce((previousWindow, currentWindow, currentIndex) => {
			return previousWindow.width < currentWindow.width ? previousWindow : currentWindow;
		});

		let shortestWindow = windowList.reduce((previousWindow, currentWindow, currentIndex) => {
			return previousWindow.height < currentWindow.height ? previousWindow : currentWindow;
		});

		const scaleWidthOut = narrowestWindow.width < MINIMUM_WIDTH;
		const scaleHeightOut = shortestWindow.height < MINIMUM_HEIGHT;

		//Our narrowest window is _too_ narrow. We need to scale the group back out to make sure windows aren't too narrow.
		if (scaleWidthOut) {
			let correctedBounds = JSON.parse(JSON.stringify(narrowestWindow));
			correctedBounds.width = MINIMUM_WIDTH;
			correctedBounds.right = correctedBounds.left + MINIMUM_WIDTH;

			let newScaleDescriptor = this.getScaleDescriptor(narrowestWindow, correctedBounds);
			windowList = windowList.map(bounds => {
				let scaledBounds = this.scaleWindow({
					bounds,
					scaleDescriptor: newScaleDescriptor
				});

				scaledBounds.name = bounds.name;
				return scaledBounds;
			});
		}

		if (scaleHeightOut) {
			let correctedBounds = JSON.parse(JSON.stringify(shortestWindow));
			correctedBounds.height = MINIMUM_HEIGHT;
			correctedBounds.bottom = correctedBounds.top + MINIMUM_HEIGHT;

			let newScaleDescriptor = this.getScaleDescriptor(shortestWindow, correctedBounds);
			windowList = windowList.map(bounds => {
				let scaledBounds = this.scaleWindow({
					bounds,
					scaleDescriptor: newScaleDescriptor
				});
				scaledBounds.name = bounds.name;
				return scaledBounds;
			});
		}
		///MOVE IT BACK TO WHERE THE ANCHOR IS
		windowList = this.offsetGroup({
			windowList,
			offset: {
				left: -anchor.left,
				top: -anchor.top
			}
		});
		return windowList;
	}
}

//DockableGroup.prototype = DockableBox;
/* harmony default export */ __webpack_exports__["a"] = (DockableGroup);

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockableGroup.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockableGroup.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 73 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__boxMath__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__clients_logger__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__clients_logger___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__clients_logger__);



function DockableMonitor(params) {
	let bounds;

	//Pre-dockable components this function only took bounds. For backwards compatibility if the incoming params do now have a 'bounds' prop, we assume params = bounds
	if (!params.hasOwnProperty("bounds")) {
		bounds = params;
	} else {
		bounds = params.bounds;
	}

	this.left = bounds.left;
	this.top = bounds.top;
	this.right = bounds.right;
	this.bottom = bounds.bottom;
	this.rawMonitor = params.monitor instanceof DockableMonitor ? params.monitor.rawMonitor : params.monitor; //Need this later in order to do docking related tasks

	//When docking makes a change to monitor space (claim or unclaim) docking's monitor representation is updated. The rawMonitor (which comes from launcher and is a dumbed-down functionless representation) is not updated at all. We should remove the DockableMonitor reference to rawMonitor, and instead write a function that gets called when a DockableMonitor is updated to update the rawMonitor for launcher's use.
	this.unclaimedRect = params.monitor.unclaimedRect;
	this.availableRect = params.monitor.availableRect;

	this.bufferSize = 15;
	/**
 * @function {function name}
 * @param  {type} bufferSize {description}
 * @return {type} {description}
 */
	this.setBufferSize = function (bufferSize) {
		this.bufferSize = bufferSize;
		this.bounds = this.getWindowBoundingBox();
		this.calculateSnappingRegions();
	};

	/**
 * @function {function name}
 * @return {type} {description}
 */
	this.getWindowBoundingBox = function () {
		return {
			min: {
				x: this.left,
				y: this.top
			},
			max: {
				x: this.right,
				y: this.bottom
			}
		};
	};
	/**
 * @function {function name}
 * @param  {type} bounds {description}
 * @param  {type} edge   {description}
 * @return {type} {description}
 */
	this.getSnappingRegion = function (bounds, edge) {
		let map = {
			left: {
				min: {
					x: bounds.left - this.bufferSize,
					y: bounds.top
				},
				max: {
					x: bounds.left + this.bufferSize,
					y: bounds.bottom
				}
			},
			right: {
				min: {
					x: bounds.right - this.bufferSize,
					y: bounds.top
				},
				max: {
					x: bounds.right + this.bufferSize,
					y: bounds.bottom
				}
			},
			bottom: {
				min: {
					x: bounds.left,
					y: bounds.bottom - this.bufferSize
				},
				max: {
					x: bounds.right,
					y: bounds.bottom + this.bufferSize
				}
			},
			top: {
				min: {
					x: bounds.left,
					y: bounds.top - this.bufferSize
				},
				max: {
					x: bounds.right,
					y: bounds.top + this.bufferSize
				}
			}
		};
		return map[edge];
	};
	/**
 * @function {function name}
 * @return {type} {description}
 */
	this.calculateSnappingRegions = function () {
		this.snappingRegions = {
			top: this.getSnappingRegion(bounds, "top"),
			right: this.getSnappingRegion(bounds, "right"),
			bottom: this.getSnappingRegion(bounds, "bottom"),
			left: this.getSnappingRegion(bounds, "left")
		};
	};
	/**
 * @function {function name}
 * @param  {type} region  {description}
 * @param  {type} request {description}
 * @return {type} {description}
 */
	this.canSnapToRegion = function (region, request) {
		var innerAdjustment = 0 - this.bufferSize;
		return __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].intersectBoundingBoxes(this.snappingRegions[region], {
			min: {
				x: request.snappingRegions[region].min.x - innerAdjustment,
				y: request.snappingRegions[region].min.y - innerAdjustment
			},
			max: {
				x: request.snappingRegions[region].max.x + innerAdjustment,
				y: request.snappingRegions[region].max.y + innerAdjustment
			}
		});
	};
	/**
 * @function {function name}
 * @param  {type} request {description}
 * @return {type} {description}
 */
	this.canSnapToWindow = function (request) {
		for (var region in this.snappingRegions) {
			if (this.canSnapToRegion(region, request)) {
				return true;
			}
		}
		return false;
	};
	/**
  * Determines if supplied window (or request) is near a given edge of the monitor
  *
  * @param {object} request The move request
  * @return {string} A string containing any edges of the monitor the given request is near
  */
	this.getSnappedEdge = function (request) {
		let snappedEdge = "";
		if (request.top === this.bounds.min.y) {
			snappedEdge += "top";
		} else if (request.bottom === this.bounds.max.y) {
			snappedEdge += "bottom";
		}
		return snappedEdge;
	};
	/**
 * @function {function name}
 * @param  {type} request {description}
 * @return {type} {description}
 */
	this.snapWindow = function (request) {
		var regionsToSnap = [];
		for (var region in this.snappingRegions) {
			if (this.canSnapToRegion(region, request)) {
				regionsToSnap.push(region);
			}
		}
		//let originalRequest = Object.assign({}, request);
		regionsToSnap = regionsToSnap.join("");
		if (regionsToSnap) {
			if (regionsToSnap.includes("left")) {
				//if req is to the right of the monitor's left edge.
				if (request.left >= this.snappingRegions.left.min.x) {
					request.left = this.bounds.min.x;
				}
			}
			if (regionsToSnap.includes("top")) {
				//Top edge of request must be below the top edge of the monitor..
				if (request.top >= this.snappingRegions.top.min.y) {
					request.top = this.bounds.min.y;
				}
			}

			if (regionsToSnap.includes("right")) {
				//right edge of request must be to the left of the right edge of the monitor.
				if (request.right <= this.snappingRegions.right.max.x) {
					//move
					if (request.changeType === 0) {
						request.left = this.bounds.max.x - request.width;
					} else {
						request.right = this.bounds.max.x;
					}
				}
			}

			if (regionsToSnap.includes("bottom")) {
				if (request.bottom <= this.snappingRegions.bottom.max.y) {
					if (request.changeType === 0) {
						request.top = this.bounds.max.y - request.height;
					} else {
						request.bottom = this.bounds.max.y;
					}
				}
			}

			if (request.changeType === 0) {
				request.right = request.left + request.width;
				request.bottom = request.top + request.height;
			} else {
				request.width = request.right - request.left;
				request.height = request.bottom - request.top;
			}
			return request;
		}

		return false;
	};
	/**
  * Takes any snapped edges and a given request (window) and sets the appropriate bounds of the window (when docking, the windows width is expanded to take full screen)
  * @param {string} edge A string containing any edges the window could snap to
  * @param {object} request The window to dock
  * @return {object} The modified request object
  */
	this.getDockedPosition = function (edge, request) {
		if (edge === "") return false;
		if (edge.includes("top")) {
			//Top edge of request must be below the top edge of the monitor..
			if (request.top >= this.snappingRegions.top.min.y) {
				request.top = this.bounds.min.y;
				request.width = this.bounds.max.x - this.bounds.min.x;
				request.left = this.bounds.min.x;
				request.right = this.bounds.max.x;
				request.bottom = request.top + request.height;
			}
		}

		if (edge.includes("bottom")) {
			if (request.bottom <= this.snappingRegions.bottom.max.y) {
				request.top = this.bounds.max.y - request.height;
				request.width = this.bounds.max.x - this.bounds.min.x;
				request.left = this.bounds.min.x;
				request.right = this.bounds.max.x;
				request.bottom = this.bounds.max.y;
			}
		}
		return request;
	};
	/**
  * Docks a window to an edge if it needs to be. Calls to update dockableMonitor/dockableWindow properties
  * @param {object} request The move request
  */
	this.dockWindowToMonitor = function (request, width, height) {
		let oldBounds = {
			width: width ? width : request.width,
			height: height ? height : request.height
		};

		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("dockable.monitor.dockWindowToMonitor", request, width, height);
		request.height = request.dockedHeight;
		delete request.dockedHeight;

		let snappedEdge = request.hasOwnProperty("snappedEdge") ? request.snappedEdge.toLowerCase() : this.getSnappedEdge(request);
		delete request.snappedEdge;
		let dockedPos = this.getDockedPosition(snappedEdge, request);

		if (snappedEdge) {
			this.onClaimedSpaceChanged({ win: dockedPos, oldBounds: oldBounds, location: snappedEdge });
			return request;
		}
		return false;
	};

	/**
  * JSON override method
  */
	this.toJSON = function () {
		return {
			bounds: this.bounds,
			availableRect: this.availableRect,
			monitorRect: this.monitorRect,
			unclaimedRect: this.unclaimedRect,
			name: this.name,
			top: this.top,
			right: this.right,
			bottom: this.bottom,
			left: this.left
		};
	};

	/**
  * Undocks a window
  * @param {object} request The move request
  */
	this.undockWindowFromMonitor = function (request) {
		__WEBPACK_IMPORTED_MODULE_1__clients_logger___default.a.system.debug("dockable.monitor.undockWindowFromMonitor", request);

		//Old bounds is used by DockableWindow to determine its width and height when its undocked. In this scenario, since we're undocking and will use the oldBounds already stored in DockableWindow, we want to pass in an empty object since oldBounds will be empty when the component is undocked
		this.onClaimedSpaceChanged({ win: request, oldBounds: {}, location: "NONE" });
		return request;
	};
	this.bounds = this.getWindowBoundingBox();
	this.calculateSnappingRegions();
	this.name = bounds.name;

	return this;
}

/* harmony default export */ __webpack_exports__["a"] = (DockableMonitor);

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockableMonitor.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockableMonitor.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 74 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__boxMath__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__dockableBox__ = __webpack_require__(54);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__common_disentangledUtils__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__common_disentangledUtils___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__common_disentangledUtils__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_lodash_get__ = __webpack_require__(28);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_lodash_get___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_lodash_get__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__clients_storageClient__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__clients_storageClient___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__clients_storageClient__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__common_util__ = __webpack_require__(8);
function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/* global RouterClient */








/** Singleton of the Logger class shared among all instances of DockableWindow
 * @TODO Refactor to instance member of class.
 */
let Logger;
/** Singleton of the System class shared among all instances of DockableWindow
 * @TODO Refactor to instance member of class.
 */
let System;
/** Singleton of the Calculator class shared among all instances of DockableWindow
 * @TODO Refactor to instance member of class.
 */
let calculator;
//Need config service in order to see if a particular window is dockable presentationalComponents -> components.Toolbar.component.dockable = true?
const _throttle = __webpack_require__(22);

//defaults for the openfin version.
/*var OF_VERSION = {
	major: 7,
	patch: 0
};*/
var OF_BUGFIX_REPLACE_WIDTH_AND_HEIGHT = true;
const BOUNDS_CHANGING = "bounds-change-request";
const BOUNDS_CHANGED = "bounds-changed";
const SYSTEM_BOUNDS_CHANGED = "system-bounds-changed";

var warningsSent = {
	disableFrame: false,
	setOpacity: false,
	addEventListener: false,
	removeEventListener: false
};

class DockableWindow extends __WEBPACK_IMPORTED_MODULE_1__dockableBox__["a" /* default */] {
	/**
  *
  * @param {*} win Window object; OpenfinWindow, ExternalWindow, etc.
  * @param {bounds} bounds initial bounds for the window.
  * @param {object} dependencies Dependency object that provides the calculator, System, and Logger.
  * @param {DockingCalculator} dependencies.calculator
  * @param {System} dependencies.System
  * @param {Logger} dependencies.Logger
  */
	constructor(win, bounds, dependencies) {
		var _this;

		_this = super(bounds);
		if (dependencies) {
			calculator = dependencies.calculator;
			System = dependencies.System;
			Logger = dependencies.Logger;
		} else {
			throw new Error("DockableWindow class requires dependency injection. Ensure that dependencies are being passed in as the 2nd parameter.");
		}

		/**@todo Document these vars */
		this.win = win;
		this.bufferSize = 15;

		// The default is to allow grouping. But if it is disabled using any of the various methods, disable it.
		// @todo this is unsustainable. Needs some kind of cleanup. Should we differentiate docking/snapping?
		if (typeof win.canGroup === "boolean") {
			this.canGroup = win.canGroup;
		} else {
			const canGroup1 = __WEBPACK_IMPORTED_MODULE_3_lodash_get___default()(win, "windowDescriptor.customData.window.canGroup", true);
			const canGroup2 = __WEBPACK_IMPORTED_MODULE_3_lodash_get___default()(win, "windowDescriptor.customData.foreign.services.dockingService.canGroup", true);
			const canGroup3 = __WEBPACK_IMPORTED_MODULE_3_lodash_get___default()(win, "windowDescriptor.customData.foreign.services.windowService.allowGrouping", true);
			this.canGroup = canGroup1 && canGroup2 && canGroup3;
		}

		this.name = this.win.name;
		this.uuid = this.win.uuid;
		this.guid = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__common_disentangledUtils__["guuid"])();
		this.disableFrame();
		this.top = bounds.top;
		this.left = bounds.left;
		this.right = bounds.right;
		this.bottom = bounds.bottom;
		this.width = bounds.width;
		this.height = bounds.height;
		this.opacity = 1;
		this.events = {};
		this.groupNames = [];
		this.snappedWindows = [];
		this.type = win.type;
		this.calculator = calculator;
		this.logger = Logger;
		this.retrievedDockedWindowState = this.retrievedDockedWindowState.bind(this);
		this.finishInitialize = this.finishInitialize.bind(this);
		this.buildDefaultDockingOptions = this.buildDefaultDockingOptions.bind(this);
		this.onBoundsChanged = this.onBoundsChanged.bind(this);
		this.onBoundsChanging = this.onBoundsChanging.bind(this);
		this.addEventListener = this.addEventListener.bind(this);
		this.removeEventListener = this.removeEventListener.bind(this);
		this.requestBoundsChange = this.requestBoundsChange.bind(this);
		this.getDockedStringFromLocation = this.getDockedStringFromLocation.bind(this);
		this.hiddenUnclaimSpace = this.hiddenUnclaimSpace.bind(this);
		this.unhiddenClaimSpace = this.unhiddenClaimSpace.bind(this);
		this.nativeWindowBoundsChanged = this.nativeWindowBoundsChanged.bind(this);
		this.dock = this.dock.bind(this);
		this.undock = this.undock.bind(this);
		this.resizeThrottlePeriod = 5;

		Logger.system.debug("dockableWindow constructing", this.name);

		//This is triggered on a window move which is done by the user dragging a held down mouse over a window. In other words, this is only !finishedMove when a user is moving the window
		// DH 3/6/2019 Setting the "markDirty" param to false ensures instantiating
		// the DockableWindow doesn't mistakenly mark the workspace dirty.
		this.win._stopMove(false);
		const startTime = Date.now();
		this.lastBoundsAdjustment = startTime;
		this.resizeHandle = null;
		this.animate = this.animatePositionAndHeight;

		//Needed for dockable components that don't have a static grabber on the side of the component (mostly for when there are dockable windows). When a user undocks the component, they can undock it from anywhere in the components header bar, this will center the window on the undock, so that when the window shrinks back to its old size, the mouse will be in the center
		this.shouldOffsetByMouse = false;

		//A DockableWindow can refuse tabbing or tiling requests with the right config props
		this.allowTiling = typeof win.tiling == "boolean" ? win.tiling : true;
		this.allowTabbing = win.tabbing;
		this.ignoreTilingAndTabbingRequests = !this.allowTiling && !this.allowTabbing;
		this.canMinimize = win.minimize;

		// If the windowOptions say to show the taskbar icon, respect that. Default to true.
		// This value is checked inside of showTaskbarIcon()
		this.shouldShowTaskbarIcon = win.windowOptions && typeof win.windowOptions.showTaskbarIcon !== "undefined" ? win.windowOptions.showTaskbarIcon : true;
		this.setBoundingBoxes();
		this.addListeners();
		//Disable the frame so that users cannot move the window. Only we move the window after we verify that their intended movement shouldn't result in a snap.
		this.setOpacity = _throttle(this.setOpacity, 100, { trailing: true });

		let options = win.hasOwnProperty("dockingOptions") ? win.dockingOptions : null;
		let dockingDefaults = options !== null ? this.buildDefaultDockingOptions(options) : { isDockable: false };

		// flag indicating if this a monitor-docked window (e.g. a toolbar)
		this.isDockableComponent = dockingDefaults.isDockable;

		this.monitorDockablePositions = {};
		if (dockingDefaults.isDockable) {
			if (Array.isArray(options.dockable)) {
				options.dockable.map((option, i) => {
					//make upper case
					option = option.toUpperCase();

					if (option === "TOP") this.monitorDockablePositions.TOP = 0;
					if (option === "LEFT") this.monitorDockablePositions.LEFT = 1;
					if (option === "RIGHT") this.monitorDockablePositions.RIGHT = 2;
					if (option === "BOTTOM") this.monitorDockablePositions.BOTTOM = 3;
				});
				this.monitorDockablePositions.NONE = 4;
			} else {
				//If options.dockable is not supplied, or it is just 'true' that means this window can dock everywhere
				this.monitorDockablePositions = {
					TOP: 0,
					LEFT: 1,
					RIGHT: 2,
					BOTTOM: 3,
					NONE: 4
				};
			}
		}
		//pass through from the windowWrap. This property is added during the registration. Options include, min/max height/width, whether the window is dockable, whether it starts docked, etc.
		this.dockingOptions = win.dockingOptions;
		this.dockedPosition = this.monitorDockablePositions.NONE;
		this.ignoreSnappingRequests = options && options.ignoreSnappingRequests || options && options.ephemeral; // OR if isEphemeral is true
		this.dockedDimensions = {
			width: dockingDefaults.dockedWidth,
			height: dockingDefaults.dockedHeight
		};

		//If overwriteDockedOptions is true we should expect there to be some information regarding this component in memory. That saved information will provide bounds for where the window should spawn
		let startsDocked = options !== null && typeof options.startsDocked === "string" ? options.startsDocked : "none";

		if (this.isDockableComponent) {
			__WEBPACK_IMPORTED_MODULE_5__common_util__["Monitors"].on("monitors-changed", () => {
				Logger.system.debug("MONITOR: monitors-changed so saveDockableData");
				// keep the dockable window's monitor information up to date so can recognize on restart if monitor has changed
				this.saveDockableData();
				this.makeSureMonitorDockableIsVisible();
			});
		}

		if (this.isDockableComponent && options && options.overwriteDockedOptions) {

			// first look in component state for cached toolbar location -- this is only for backwards compatability with vertions before 3.9
			this.win.getComponentState({}, (() => {
				var _ref = _asyncToGenerator(function* (err, result) {
					Logger.system.debug("MONITOR: getComponentState", err, result);
					let monitorChanged, isToolbarVisible;

					// for backwards compatability check if bounds data in component state, if not then check in storage
					if (!result || !result.hasOwnProperty("window-bounds") || result["window-bounds"] == null) {
						Logger.system.debug("MONITOR: read monitor-docked data from storage", err, result);

						// get data from storage -- this is the normal path
						result = yield __WEBPACK_IMPORTED_MODULE_4__clients_storageClient___default.a.get({ topic: win.name, key: win.name });
					} else {
						Logger.system.debug("MONITOR: using monitor-docked data from component state", err, result);
						// since the bounds data is in component state only for backwords compatability, use it this time then remove it so that going forward the lastest values will be picked up from storage.
						_this.win.setComponentState({
							field: "window-bounds",
							value: null
						});
					}
					Logger.system.debug("MONITOR: DockableWindow get results", err, result);

					let visible = result && result.hasOwnProperty("visible") && typeof result.visible === "boolean" ? result.visible : true;
					let windowBounds = result && result.hasOwnProperty("window-bounds") && result["window-bounds"] !== null ? result["window-bounds"] : null;
					let savedMonitorData = result ? result.monitorData : null;

					// if all the saved data is available, then check if monitor changed since last restart;
					// Note: currently monitorChanged is only used for diagnostics, but later will be used to affect window placement
					if (windowBounds && savedMonitorData) {
						monitorChanged = yield _this.monitorChanged(savedMonitorData);

						// else since all the data isn't available, assume the monitors did not change since last restart;
					} else {
						monitorChanged = false;
					}

					// if could not find bounds data either in window state or in storage, then use default settings.
					if (!windowBounds) {
						Logger.system.debug("MONITOR: DockableWindow using defaults.", err);

						_this.dockedPosition = _this.monitorDockablePositions[startsDocked.toUpperCase()];
						_this.undockedPosition = {
							width: dockingDefaults.undockedWidth,
							height: dockingDefaults.undockedHeight
						};

						win._show();
					} else {
						// since have window Bounds, check if in visible space.  If not in visible space then will adjust bounds to be visible
						let boundsToCheck = __WEBPACK_IMPORTED_MODULE_5__common_util__["clone"](windowBounds);
						windowBounds = __WEBPACK_IMPORTED_MODULE_5__common_util__["adjustBoundsToBeOnMonitor"](boundsToCheck);
						Logger.system.debug("MONITOR: DockableWindow status", result, monitorChanged, isToolbarVisible, boundsToCheck, windowBounds);

						_this.top = windowBounds.top;
						_this.bottom = windowBounds.bottom;
						_this.left = windowBounds.left;
						_this.right = windowBounds.right;
						_this.width = windowBounds.width;
						_this.height = windowBounds.height;
						_this.dockedPosition = windowBounds.dockedPosition;

						// move undocked toolbar to its previously saved location
						_this.setBounds(windowBounds, function (err) {
							// NOTE: there is a bug related to the "hidden" event that prevents visible state from being saved, so initial visiblity will alway be true until bug fixed
							if (visible) {
								win._show();
								// observed problem with toolbar not being on top, so bring to front to
								win._bringToFront();
							}
						});
					}

					_this.undockedPosition = {
						width: dockingDefaults.undockedWidth,
						height: dockingDefaults.undockedHeight
					};

					_this.dockedParams = {
						width: dockingDefaults.dockedWidth,
						height: dockingDefaults.dockedHeight
					};

					//@todo here we should check to see if the window's bounds match monitor bounds. If so, dock it. For now, we have a hack to not save the toolbar's location on dock.
					_this.finishInitialize(options);
				});

				return function (_x, _x2) {
					return _ref.apply(this, arguments);
				};
			})());
		} else if (dockingDefaults.isDocked && this.monitorDockablePositions.hasOwnProperty(startsDocked.toUpperCase())) {
			this.dockedPosition = this.monitorDockablePositions[startsDocked.toUpperCase()];
			this.undockedPosition = {
				width: dockingDefaults.undockedWidth,
				height: dockingDefaults.undockedHeight
			};
			this.finishInitialize(options);
		}
	}
	// For diagnostics.
	// 	this.wipeMethodCalls = this.wipeMethodCalls.bind(this);
	// 	this.wipeMethodCalls();
	// 	window.wipeMethodCalls = this.wipeMethodCalls;
	// }
	// wipeMethodCalls() {
	// 	for (let m in this) {
	// 		if (typeof this[m] === "function") {
	// 			console.log("FUNCTION", m);
	// 			//window.methodCalls[m] = 0;
	// 		} else {
	// 			console.log("NON FUNCTION", m);
	// 		}
	// 	}
	// 	//window.methodCalls['setBounds'] = 0;
	// }

	/**
  * Returns turn if the current monitor dimensions are different from the previous monitor dimensions
  * @param {array} previousMonitorData the previous monitor info (an array of monitors)
  */
	monitorChanged(previousMonitorData) {
		const monitorChangedPromiseResolver = resolve => {
			System.getMonitorInfo(monitorInfo => {
				let monitorData = [monitorInfo.primaryMonitor, ...monitorInfo.nonPrimaryMonitors];
				let changed = false;
				if (monitorData && previousMonitorData && monitorData.length == previousMonitorData.length) {
					for (let i = 0; i < monitorData.length; i++) {
						// since claimed space may change monitor dimensions, must compare against availableRect (which is independent of claimed space)
						if (monitorData[i].availableRect.top != previousMonitorData[i].availableRect.top) changed = true;
						if (monitorData[i].availableRect.bottom != previousMonitorData[i].availableRect.bottom) changed = true;
						if (monitorData[i].availableRect.left != previousMonitorData[i].availableRect.left) changed = true;
						if (monitorData[i].availableRect.right != previousMonitorData[i].availableRect.right) changed = true;
						if (changed) break;
					}
				} else {
					changed = true;
				}
				this.logger.system.debug("MONITOR: DockableWindow.monitorChanged", "monitorData", monitorData, "previousMonitorData", previousMonitorData, changed ? "changed" : "not changed");
				resolve(changed);
			});
		};
		return new Promise(monitorChangedPromiseResolver);
	}

	/**
  * Returns turn if the toolber handle (i.e. what the user can grab to move toolbar) is visible on one of the current monitors (based on the toolbars current bounds
  * @param {array} currentBounds the toolbars current bounds
  */
	isToolbarVisible(currentBounds) {
		const isToolbarVisiblePromiseResolver = resolve => {
			System.getMonitorInfo(monitorInfo => {
				let monitorData = [monitorInfo.primaryMonitor, ...monitorInfo.nonPrimaryMonitors];
				let isVisible = false;

				// calculate the approximate bounds of the toolbar "handle", based on the current toolbar bounds;
				// if these four points are within a single monitor then visible;
				// this function is not exact since toolbar might span monitors but close enough until we rearchitect -- at worst will just move toolbar to default position;
				// note the rightReference is calculated in relation to the left bounds
				let topReference = currentBounds.top + 5;
				let bottomReference = currentBounds.bottom - 5;
				let leftReference = currentBounds.left + 5;
				let rightReference = currentBounds.left + 20;

				for (let i = 0; i < monitorData.length; i++) {
					let topOK = false;
					let bottomOK = false;
					let leftOK = false;
					let rightOK = false;

					// since claimed space may change monitor dimensions, must compare against availableRect (which is independent of claimed space)
					if (topReference >= monitorData[i].monitor.scaledRect.top) topOK = true;
					if (bottomReference <= monitorData[i].monitor.scaledRect.bottom) bottomOK = true;
					if (leftReference >= monitorData[i].monitor.scaledRect.left) leftOK = true;
					if (rightReference <= monitorData[i].monitor.scaledRect.right) rightOK = true;

					isVisible = topOK && bottomOK && leftOK && rightOK;

					if (isVisible) break;
				}
				this.logger.system.debug("MONITOR: DockableWindow.isToolbarVisible", "monitorData", monitorData, "currentBounds", currentBounds, isVisible ? "isVisible" : "not visible");
				this.logger.system.debug("MONITOR: DockableWindow.isToolbarVisible T-B-L-R=", topReference.toString(), bottomReference.toString(), leftReference.toString(), rightReference.toString());
				resolve(isVisible);
			});
		};
		return new Promise(isToolbarVisiblePromiseResolver);
	}

	/**
  * Returns a string representation of the docked location
  * @param {number} dockedPosition The integer value of the docked position
  */
	getDockedStringFromLocation(dockedPosition) {
		let locValue = null;
		for (let i = 0; i < Object.keys(this.monitorDockablePositions).length; i++) {
			let key = Object.keys(this.monitorDockablePositions)[i];
			if (this.monitorDockablePositions[key] === this.dockedPosition) {
				locValue = key.toUpperCase();
				break;
			}
		}
		return locValue;
	}

	/**
  * Uses the state retrieved from storage and config to determine where to dock and dockable windows
  * @param {object} params
  * @param {Error} err The error, if any, returned from retrieving storage data
  * @param {object} result The resulting data from storage
  * @param {object} dockingDefaults The defaults to apply to dockable components
  * @param {object} options The options retrieved from the config
  * @param {boolean} startsDocked If true, the toolbar should dock
  */
	retrievedDockedWindowState(params) {

		const { err, result, dockingDefaults, options, startsDocked } = params;

		if (err && err !== "Not found") {
			Logger.system.error("Error retrieving component state. Using defaults.");
			this.dockedPosition = this.monitorDockablePositions[startsDocked.toUpperCase()];
			this.undockedPosition = {
				width: dockingDefaults.undockedWidth,
				height: dockingDefaults.undockedHeight
			};
			this.finishInitialize(options);
			return;
		}

		let windowBounds = result && result.hasOwnProperty("window-bounds") && result["window-bounds"] !== null ? result["window-bounds"] : null;

		if (!windowBounds) {
			this.dockedPosition = this.monitorDockablePositions[startsDocked.toUpperCase()];
		} else {
			this.top = windowBounds.top;
			this.bottom = windowBounds.bottom;
			this.left = windowBounds.left;
			this.right = windowBounds.right;
			this.width = windowBounds.width;
			this.height = windowBounds.height;
			this.dockedPosition = windowBounds.dockedPosition;
		}

		this.undockedPosition = {
			width: dockingDefaults.undockedWidth,
			height: dockingDefaults.undockedHeight
		};

		this.dockedParams = {
			width: dockingDefaults.dockedWidth,
			height: dockingDefaults.dockedHeight
		};
		//@todo here we should check to see if the window's bounds match monitor bounds. If so, dock it. For now, we have a hack to not save the toolbar's location on dock.
		this.finishInitialize(options);
	}

	/**
  * Finishes the initialization of this dockable window
  * @param {object} dockingDefaults Defaults that have been determined by incoming config
  * @param {object} options
  */
	finishInitialize(options) {
		var _this2 = this;

		return _asyncToGenerator(function* () {
			//This allows the config to specify whether a dockable component should show on the taskbar
			_this2.shouldShowTaskbarIcon = options !== null && options.hasOwnProperty("showTaskbarIcon") ? options.showTaskbarIcon : true;
			_this2.isDocked = _this2.dockedPosition !== _this2.monitorDockablePositions.NONE ? true : false;

			//If the registering window is dockable, and wants to 'start docked' we need to determine which of the dockable positions it requests to start docked in. If the position is found, we call to dock it which will set the appropriate variables and move any launched windows out of its space.
			if (_this2.isDocked) {
				//We only dock the window if it's visible. If it's hidden, we don't want to claim space.
				let locValue = _this2.getDockedStringFromLocation(_this2.dockedPosition);
				if (locValue !== null) {
					let monitor = _this2.calculator.getMonitorForWindow(_this2);
					let windowBounds = {
						top: _this2.top,
						bottom: _this2.bottom,
						left: _this2.left,
						right: _this2.right,
						width: _this2.width,
						height: _this2.height
					};

					//Handles dimensions that need window specific calculations
					switch (locValue) {
						case "TOP":
							windowBounds.height = _this2.dockedParams.height;
							windowBounds.top = monitor.top;
							windowBounds.bottom = monitor.top + windowBounds.height;
							break;
						case "BOTTOM":
							windowBounds.height = _this2.dockedParams.height;
							windowBounds.top = monitor.bottom - windowBounds.height;
							windowBounds.bottom = monitor.bottom;
							break;
						default:
							break;
					}

					//Handles dimensions that need monitor specific calculations
					switch (locValue) {
						case "TOP":
						case "BOTTOM":
							windowBounds.left = monitor.left;
							windowBounds.right = monitor.right;
							windowBounds.width = monitor.unclaimedRect.width;
							break;
						case "LEFT":
						case "RIGHT":
							windowBounds.top = monitor.top;
							windowBounds.bottom = monitor.bottom;
							windowBounds.height = monitor.unclaimedRect.height;
							break;
						default:
							break;
					}

					_this2.setBounds(windowBounds, function (err) {
						if (err) {
							Logger.system.error("Error moving dockable component to default docked position");
						}
						_this2.dockedHeight = _this2.dockedParams.height;
						monitor.dockWindowToMonitor(_this2, _this2.undockedPosition.width, _this2.undockedPosition.height);
					});
				}
			}

			// now that window is up, make sure the monitor data is save (also saved when bounds change or monitors change)
			_this2.saveDockableData();
		})();
	}

	/**
  * Function to respond to finWindow bounds change events. This allows us to respond to windows events (like using aero shortcuts)
  * @param {object} e The event
  */
	nativeWindowBoundsChanged(e) {
		//If the user is moving the window (and not the OS) these movements will be handled elsewhere
		if (!this.win.finishedMove) return;

		//If aero snap is enabled, we will use the new bounds which were passed in by the system (at this point the OS has moved the window and is sending an event which got here). If it is disabled, we will get the old bounds stored by finsemble (the bounds of the window before the OS tried to move it)
		let bounds;
		if (this.calculator.enableWindowsAeroSnap) {
			bounds = e.data;
		} else {
			bounds = this.getBounds();
		}

		// Docking listens for a restoreFromMaximized message on the router.
		// That doesn't happen when aero-snap triggers a restore after the window is maximized.
		// Here we manually reset the isMaximized flag.
		this.isMaximized = false;

		this.setBounds(bounds, () => {
			this.calculator.removeWindowFromAllGroups(this, true);
			this.calculator.buildSnapRelationships(this);
			this.calculator.updateGroupData();
			//Move out of claimed space was happening too soon. The method was firing before the OS had moved the windows, so at that point the window wasn't in claimed space. The timeout fixes that even with zero delay, cause there is still the delay of going through the timeout
			setTimeout(() => this.calculator.moveOutOfClaimedSpace(this.name), 0);
		});
	}

	/**
  * Builds default docking options for dockable windows
  * @param {object} options Taken from the incoming config
  * @return {object} The docking defaults
  */
	buildDefaultDockingOptions(options) {
		//Building a default options object based on the incoming config props. Since windows can have different dockable areas and different starting docked positions, we must build starting props based on those options.
		let hasUndockedParams = this.win.hasOwnProperty("dockingOptions") && this.win.dockingOptions.hasOwnProperty("undockedParams");
		let hasDockedParams = this.win.hasOwnProperty("dockingOptions") && this.win.dockingOptions.hasOwnProperty("dockedParams");
		let dockingDefaults = {
			isDockable: options !== null && (options.dockable === true || Array.isArray(options.dockable)) ? true : false,
			undockedWidth: hasUndockedParams ? this.win.dockingOptions.undockedParams.width : 300,
			undockedHeight: hasUndockedParams ? this.win.dockingOptions.undockedParams.height : 30,
			isDocked: options !== null && options.hasOwnProperty("startsDocked") ? true : false,
			dockedWidth: hasDockedParams ? this.win.dockingOptions.dockedParams.width : 300,
			dockedHeight: hasDockedParams ? this.win.dockingOptions.dockedParams.height : 39
		};
		return dockingDefaults;
	}

	/**
  * Function to handle chain of events when a dockable component type is docked
  *
  * @param {object} monitor Information about the monitor the component was docked to
  * @param {string} location A string containing the location to dock to: "TOP", "LEFT", "BOTTOM", and "RIGHT" are the acceptable values
  */
	dock(monitor, oldBounds, location) {
		if (this.isDockableComponent) {
			let dockPos = -1;
			this.undockedPosition = {
				width: oldBounds.width,
				height: oldBounds.height
			};
			this.logger.system.debug("MONITOR: DockableWindow.dock", "undockedPosition", this.undockedPosition);

			//Assuming the re-assignment of positions/size doesn't need to take place
			//we don't need a switch here
			switch (location) {
				case this.monitorDockablePositions.TOP:
					dockPos = this.monitorDockablePositions.TOP;
					break;
				case this.monitorDockablePositions.LEFT:
					dockPos = this.monitorDockablePositions.LEFT;
					break;
				case this.monitorDockablePositions.RIGHT:
					dockPos = this.monitorDockablePositions.RIGHT;
					break;
				case this.monitorDockablePositions.BOTTOM:
					dockPos = this.monitorDockablePositions.BOTTOM;
					break;
				default:
					break;
			}

			this.dockedPosition = dockPos;
			this.isDocked = true;
		}
	}

	/**
  * Function to handle chain of events when a dockable component type is undocked
  */
	undock() {
		if (this.isDockableComponent) {
			this.isDocked = false;
			this.dockedPosition = this.monitorDockablePositions.NONE;
		}
	}

	hiddenUnclaimSpace() {
		if (this.isDocked) {
			let locValue = this.getDockedStringFromLocation(this.dockedPosition);
			this.monitor.onClaimedSpaceChanged({
				win: this,
				oldBounds: this.undockedPosition,
				location: locValue,
				unchangedDockState: true,
				action: "undock"
			});
		}
	}

	unhiddenClaimSpace() {
		if (this.isDocked) {
			let locValue = this.getDockedStringFromLocation(this.dockedPosition);
			this.monitor.onClaimedSpaceChanged({
				win: this,
				oldBounds: {},
				location: locValue,
				unchangedDockState: true,
				action: "dock"
			});
		}
	}

	saveDockableData() {
		let thisWindow = this;
		let bounds = {
			top: thisWindow.top,
			bottom: thisWindow.bottom,
			left: thisWindow.left,
			right: thisWindow.right,
			width: thisWindow.width,
			height: thisWindow.height,
			isDockable: this.isDocked,
			dockedPosition: thisWindow.dockedPosition
		};

		// must save the monitor date since if monitors changed since last restart then toolbar will use default settings (otherwise might have problems with visibility)
		System.getMonitorInfo(monitorInfo => {
			let monitorData = [monitorInfo.primaryMonitor, ...monitorInfo.nonPrimaryMonitors];
			this.logger.system.debug("MONITOR: DockableWindow saveDockableData", monitorData, !this.isHidden, bounds);
			__WEBPACK_IMPORTED_MODULE_4__clients_storageClient___default.a.save({
				topic: this.name, key: this.name, value: {
					visible: !this.isHidden,
					"window-bounds": bounds,
					monitorData
				}
			});
		});
	}

	/**
  * If toolbar is not visible then move it to a visible position
  */
	makeSureMonitorDockableIsVisible() {
		var _this3 = this;

		return _asyncToGenerator(function* () {
			_this3.logger.system.debug("DockableWindow.makeSureMonitorDockableIsVisible");
			let currentBounds = {
				top: _this3.top,
				bottom: _this3.bottom,
				left: _this3.left,
				right: _this3.right,
				width: _this3.width,
				height: _this3.height
			};

			// Could optionally put in user notication here.  I tested but commented out since not specified and it might be overkill.
			// UserNotification.alert("system", "ALWAYS", "toolbar", "Toolbar moved out of visible space. Adjusted to a visible position.", { duration: 1000 * 3});

			let newBounds = __WEBPACK_IMPORTED_MODULE_5__common_util__["adjustBoundsToBeOnMonitor"](currentBounds);
			_this3.logger.system.debug("DockableWindow.makeSureMonitorDockableIsVisible requestMove", "currentBounds", currentBounds, "newBounds", newBounds);

			// have to clone since the call below to calculator.requestMove modifies the bounds that were passed in (causing setBounds to be incorrect)
			let newCopy = __WEBPACK_IMPORTED_MODULE_5__common_util__["clone"](newBounds);

			// since the toolbar is not visible, set to new adjusted position;
			// before moving, call request move to insure internal docking state is correctly maintained.
			_this3.calculator.requestMove(newBounds, function (bounds) {
				_this3.logger.system.debug("DockableWindow.makeSureMonitorDockableIsVisible setBounds", "newBounds", newBounds);
				_this3.setBounds(newCopy, function (err) {
					if (!_this3.hidden) {
						_this3.win._show();
						// when remote connection is made using RDP, the monitor changes will redisplay window and potentially leave toolbar on bottom;
						// using a timer is dirty, but until we implement multi-monitor architecture there is not a signal to key on to indicate all monitor changes are done
						// (i.e. the time to invoke bringToFront since all the other windows have already been moved); note this bringToFront fixes an observed problen when RDP
						// caused the monitor change and the toolbar was left on the bottom of many other windows
						setTimeout(function () {
							_this3.logger.system.debug("DockableWindow.makeSureMonitorDockableIsVisible bringToFront");
							_this3.win._bringToFront();
						}, 3000);
					}
				});
			});
		})();
	}

	/**
 * @function {function name}
 * @return {type} {description}
 */
	onBoundsChanged() {
		this.logger.system.debug("MONITOR: onBoundsChanged", this.isDockableComponent);
		//window.methodCalls["onBoundsChanged"]++;
		//this represents the dockableWindow's context
		this.setOpacity({ opacity: 1 });
		this.resizeHandle = null;
		let timestamp = Date.now();
		//This would be true if the window was maximized when the move request that triggered mouseDown was requested.
		//It should only be changed if, on mouse down the window is maximized.
		this.shouldOffsetByMouse = false;
		this.onboundschanged = timestamp;
		this.lastBoundsAdjustment = timestamp;
		this.monitor = this.calculator.getMonitorForWindow(this);
		this.calculator.onMouseUp();
		this.win._stopMove();

		if (this.isDockableComponent) {
			this.logger.system.debug("MONITOR: onBoundsChanged saveDockableData");
			this.saveDockableData();
			this.makeSureMonitorDockableIsVisible();
		}
	}

	/**
 * @function {function name}
 * @param  {type} request  {description}
 * @param  {type} callback {description}
 * @return {type} {description}
 */
	onBoundsChanging(event, callback) {
		//this makes me cri
		let request = event.data || event;
		//window.methodCalls["onBoundsChanging"]++;
		this.win._startMove();
		try {
			request.timestamp = Date.now();
		} catch (e) {
			return;
		}
		var self = this;
		System.getMousePosition(function (err, position) {
			function finishMove() {
				if (callback) {
					callback();
				}
				self.lastBoundsAdjustment = Date.now();
				self.win.eventManager.addListener(BOUNDS_CHANGING, self.onBoundsChanging);
			}
			var invalidateRequest = false;
			var shouldThrottle = request.timestamp < self.lastBoundsAdjustment + self.resizeThrottlePeriod;

			//@note this conditional here is for testing. Node is faster than JS or something. In openfin, we need to also exclude requests that came in at the same time as the request we last processed. I think they sometimes send multiple events and in my testing, that never happens. Truthfully though I don't know why this bit has to be different in the different environments. But I do remember losing a day when I ported this stuff from test-world to openfin. Don't delete it. --Brad
			if (typeof fin === "undefined") {
				invalidateRequest = shouldThrottle || request.timestamp < self.lastBoundsAdjustment;
			} else {
				invalidateRequest = shouldThrottle || request.timestamp <= self.lastBoundsAdjustment;
			}

			if (invalidateRequest) {
				Logger.system.debug("DOCKING: Invalid request", "TIMESTAMPS:", JSON.stringify(request.timestamp), JSON.stringify(self.lastBoundsAdjustment));
				if (callback) {
					callback();
				}
				return;
			}
			if (self.isMaximized) {
				/**
     * This is a way to lock out any processing until we finish processing the first move request
     * that comes in when a window is maximized.
     *
     * Events more or less get 'queued' by the underlying container. As quickly as they can, our container (openfin or electron)
     * will consume OS-level events and bubble them up to this layer. We have code in this file
     * here that says "Hey, this request came in prior to the last time I made a change. I'm going to drop
     * this request . You're invalid. Goodbye." The thing we trigger off of is `lastBoundsAdjustment`.
     * This value is set _after_ we process the current move request.
     *
     * Maximize is special though. As soon as our first request comes in, we want to ensure that no additional requests are even considered.
     * To do that, we just say "The last time we changed this window was super far into the future." Now,
     * every incoming request will be dropped until we have time to restore the window, do any group adjustments, and recalibrate.
     *
     * It sounds clunky, and it is somewhat. But I can't think of a better way to do this.
     */
				self.lastBoundsAdjustment = Date.now() + 1000000000;

				/**
     * This tells the `setMoveRequest` function to offset the incoming request in such a way
     * that the window is centered on the mouse pointer. If you call setBounds on a window that is maximized, subsequent move
     * requests will come in as though the window's left edge never moved, until mouseUp happens. This boolean helps us get
     * around this openfin bug.
     */
				self.shouldOffsetByMouse = true;
			}
			//For some reason their bounds are wrong for `move` changeTypes. How can a changeType be 0 and the width and height change? c'mon openfin. Gimme that logical consistency.
			if (OF_BUGFIX_REPLACE_WIDTH_AND_HEIGHT) {
				request.width = self.width && request.changeType === 0 ? self.width : request.width;
				request.height = self.height && request.changeType === 0 ? self.height : request.height;
			}

			//This comparison used to check right and bottom...props that don't exist on the request.
			//If all of the bounds haven't changed, don't waste time processing it.
			//On monitor resolution change, bounds will not change, but we still need to move
			//If the changeSource is "system", we might need to move even if the bounds haven't changed.
			if (request.changeSource !== "system") {
				if (request.left === self.left && request.top === self.top && request.width === self.width && request.height === self.height) {
					console.debug("No change being requested. Dropping.");
					if (callback) callback();
					return;
				}
			}
			self.win.eventManager.removeListener(BOUNDS_CHANGING, self.onBoundsChanging);

			request.right = request.left + request.width;
			request.bottom = request.top + request.height;
			request.groupNames = self.groupNames;
			request.mousePosition = request.mousePosition || position;

			self.calculator.requestMove(request, function (bounds) {

				if (!bounds) {
					finishMove();
					return;
				}

				self.setBounds(bounds, function () {
					finishMove();
				}, function (err) {
					Logger.system.error("ERROR IN SET BOUNDS", err);
				});
			});
		});
	}

	setResizeThrottlePeriod(throttlePeriod) {
		//window.methodCalls["setResizeThrottlePeriod"]++;
		this.resizeThrottlePeriod = throttlePeriod;
	}

	/**
  * This removes event listeners. I can't be entirely certain, but from my testing, it _appears_ that openfin isn't actually deleting these objects. if you close the window, then load the window with the same name, old listeners are still registered with your new window. So if you reload a workspace, and then try to move a window, you get weird scenarios where onBoundsChanging is called twice with different values (presumably for old eventlisteners). Removing the eventListeners on close seems to handle this.
  */
	removeEventListeners() {
		//window.methodCalls["removeEventListeners"]++;
		this.removeEventListener(BOUNDS_CHANGING, this.onBoundsChanging);
		this.removeEventListener(BOUNDS_CHANGED, this.onBoundsChanged);
		//This reason this is necessary is hard to explain.
		//When the dockableWindow is created we call win.addEventListener(BOUNDS_CHANGING, blah blah).
		//This forces the openfin window to bubble bounds events up to us. This function also goes out to the router and is pretty heavy for rapid addition/removal. Inside of onBoundsChanging, we add and remove handlers _on the event manager_. So when removeEventListeners is called, the two handlers above are removed. However, there's still that lingering listener that we added to the event manager inside of finishMove. If we don't remove that listener, we could get events thrown from other older incarnations of the same dockable window.
		this.win.eventManager.removeListener(BOUNDS_CHANGING, this.onBoundsChanging);
		this.win.removeEventListener(SYSTEM_BOUNDS_CHANGED, this.nativeWindowBoundsChanged);
	}

	/********************************************
  *											*
  *			Window Moving Methods			*
  *											*
  ********************************************/

	/**
  * Hides taskbar icon for openfin windows. This prevents them from being clobbered by aeroshake.
  */
	hideTaskbarIcon() {
		//window.methodCalls["hideTaskbarIcon"]++;
		//Check to see if the method exists. It wouldn't on an external window wrapper.
		if (this.win._updateOptions) {
			this.win._updateOptions({ showTaskbarIcon: false });
		}
	}

	/**
  * This shows the taskbar icon for a given window.
  */
	showTaskbarIcon() {
		//window.methodCalls["showTaskbarIcon"]++;

		if (this.win._updateOptions && this.shouldShowTaskbarIcon) {
			this.win._updateOptions({ showTaskbarIcon: true });
		}
	}

	/**
 * @function {function name}
 * @param  {type} event {description}
 * @param  {type} cb    {description}
 * @return {type} {description}
 */
	addEventListener(event, cb) {
		//window.methodCalls["addEventListener"]++;
		var self = this;
		if (self.win.addEventListener) {
			self.win.addEventListener(event, cb);
			if (!this.events[event]) {
				this.events[event] = [];
			}
			this.events[event].push(cb);
		} else if (!warningsSent.addEventListener) {
			warningsSent.addEventListener = true;
			Logger.system.warn("Window wrapper does not have an addEventListener Method.");
		}
	}

	/**
 * @function {function name}
 * @param  {type} event {description}
 * @param  {type} cb    {description}
 * @return {type} {description}
 */
	removeEventListener(event, cb) {
		//window.methodCalls["removeEventListener"]++;
		var self = this;
		if (self.win.removeEventListener) {
			self.win.removeEventListener(event, cb);
			this.events[event].splice(this.events[event].indexOf(cb), 1);
		} else if (!warningsSent.removeEventListener) {
			warningsSent.removeEventListener = true;
			Logger.system.warn("Window wrapper does not have an removeEventListener Method.");
		}
	}

	/**
 * @function {function name}
 * @return {type} {description}
 */
	disableFrame() {
		//window.methodCalls["disableFrame"]++;
		if (this.win.disableFrame) {
			this.win.disableFrame();
		} else if (!warningsSent.disableFrame) {
			warningsSent.disableFrame = true;
			Logger.system.warn("Window wrapper does not have a disableFrame Method");
		}
	}

	setOpacity(params = { opacity: 1, persist: false }) {
		//window.methodCalls["setOpacity"]++;
		// if (opacity === this.opacity) return;
		this.opacity = params.opacity;
		if (this.win._setOpacity) {
			this.win._setOpacity(params);
		} else if (!warningsSent.setOpacity) {
			warningsSent.setOpacity = true;
			Logger.system.warn("Window wrapper does not have a setOpacity Method");
		}
	}

	/**
  * Sets bounds for internal calculations.
  */
	setInternalBounds(bounds) {
		//window.methodCalls["setInternalBounds"]++;
		//Bunch of if statements was quicker than ternary operators when inside of loops.
		this.left = typeof bounds.left === "undefined" ? this.left : bounds.left;
		this.top = typeof bounds.top === "undefined" ? this.top : bounds.top;
		this.width = typeof bounds.width === "undefined" ? this.width : bounds.width;
		this.height = typeof bounds.height === "undefined" ? this.height : bounds.height;
		this.right = typeof bounds.right === "undefined" ? this.left + this.width : bounds.right;
		this.bottom = typeof bounds.bottom === "undefined" ? this.top + this.height : bounds.bottom;
		this.setBoundingBoxes();
	}

	/**
 * @function {function name}
 * @param  {type} bounds    {description}
 * @param  {type} successCB {description}
 * @param  {type} errCB     {description}
 * @return {type} {description}
 */
	setBounds(bounds, successCB, errCB) {
		this.setInternalBounds(bounds);
		bounds = {
			left: bounds.left,
			width: bounds.width,
			height: bounds.height,
			top: bounds.top,
			right: bounds.right,
			bottom: bounds.bottom,
			persistBounds: bounds.persistBounds
		};
		//Old way was to update the monitor on the window when onMouseUp occurred, but now the OS (as well as user) can move a window and the monitor for that window should be updated every time
		this.monitor = this.calculator.getMonitorForWindow(this);
		//window.methodCalls["setBounds"]++;
		this.win._setBounds({ bounds }, () => {
			if (successCB) {
				successCB();
			}
		}, errCB);
	}

	/**
 * @function {function name}
 * @param  {type} left {description}
 * @param  {type} top  {description}
 * @return {type} {description}
 */
	moveTo(left, top) {
		//window.methodCalls["moveTo"]++;
		this.setBounds({
			left: left,
			top: top,
			right: left + this.width,
			bottom: top + this.height,
			width: this.width,
			height: this.height
		});
	}

	/**
 * @function {function name}
 * @return {type} {description}
 */
	getGroupNames() {
		return this.groupNames;
	}

	/**
 * @function {function name}
 * @param  {type} request  {description}
 * @param  {type} callback {description}
 * @return {type} {description}
 */
	requestBoundsChange(request, callback) {
		//window.methodCalls["requestBoundsChange"]++;
		//for testing purposes only - TODO: this is probably broken
		var self = this;
		if (!callback) {
			callback = self.onBoundsChanged;
		}
		System.getMousePosition((err, position) => {
			self.onBoundsChanging({
				data: {
					corners: this.getCornerObject(request),
					left: request.left,
					top: request.top,
					width: request.width,
					height: request.height,
					changeType: request.changeType,
					name: this.name,
					uuid: this.uuid,
					mousePosition: request.mousePosition || position
				}
			}, () => {
				if (callback) {
					callback();
				}
			});
		});
	}

	/********************************************
  *											*
  *			Helper Functions				*
  *											*
  ********************************************/

	/**
 * @function {function name}
 * @return {type} {description}
 */
	calculateInnerBoundingBox() {
		//window.methodCalls["calculateInnerBoundingBox"]++;
		var adjustment = this.bufferSize * 2;
		return {
			min: {
				x: this.left + adjustment,
				y: this.top + adjustment
			},
			max: {
				x: this.right - adjustment,
				y: this.bottom - adjustment
			}
		};
	}

	getInnerBoundingBox() {
		return this.innerBuffer;
	}

	/**
 * @function {function name}
 * @param  {type} bufferSize {description}
 * @return {type} {description}
 */
	setBufferSize(bufferSize) {
		this.bufferSize = bufferSize;
		this.setBoundingBoxes();
	}

	/**
 * @function {function name}
 * @return {type} {description}
 */
	setBoundingBoxes() {
		let myBounds = this.getBounds();
		this.setBuffer();
		this.innerBuffer = this.calculateInnerBoundingBox();
		this.windowBoundingBox = __WEBPACK_IMPORTED_MODULE_0__boxMath__["a" /* default */].getWindowBoundingBox(myBounds);
		this.setSnappingRegions();
		this.vertices = this.getCornerObject(myBounds);
	}

	getSnappingRegions() {
		return this.snappingRegions;
	}

	updateState() {
		this.win._getBounds(null, (err, bounds) => {
			this.setBounds(bounds);
		});
	}

	/**
 * @function setHidden
 * @param  {function=} callback when done
 *
  * Sets the internal state to hidden.  Only needed if window is hidden outside of this class.
 */
	setHidden(cb = Function.prototype) {
		this.logger.system.debug("MONITOR: DockableWindow hide state");
		this.isHidden = true;
	}

	/**
 * @function setHidden
 * @param  {function=} callback when done
 *
  * Sets the internal state to shown (i.e. not hidden). Only needed if window is hidden outside of this class.
 */
	setShown(cb = Function.prototype) {
		this.logger.system.debug("MONITOR: DockableWindow.show state");
		this.isHidden = false;
	}

	hide(cb = Function.prototype) {
		this.win._hide(cb);
		this.isHidden = true;
	}

	show(cb = Function.prototype) {
		this.win._show(cb);
		this.isHidden = false;
	}

	minimize(cb = Function.prototype) {
		this.isMinimized = true;
		this.win._minimize(cb);
	}

	restore(cb) {
		this.isMinimized = false;
		this.win._restore(cb);
	}

	alwaysOnTop(isAlwaysOnTop) {
		try {
			this.win._alwaysOnTop({ alwaysOnTop: isAlwaysOnTop });
		} catch (e) {
			Logger.system.debug("Implement alwaysOnTop");
		}
	}

	bringToFront() {
		//window.methodCalls["bringToFront"]++;
		try {
			this.win._bringToFront();
		} catch (e) {
			Logger.system.error("Implement bringToFront");
		}
	}

	notifyWindowTitleBarOfGroupMembership() {
		if (typeof RouterClient !== "undefined") {
			RouterClient.transmit(this.name + ".groupMembershipChange", {
				type: "joined"
			});
		}
	}

	notifyWindowTitleBarOfGroupEjection() {
		if (typeof RouterClient !== "undefined") {
			RouterClient.transmit(this.name + ".groupMembershipChange", {
				type: "ejected"
			});
		}
	}

	addSnappedWindow(snapObj) {
		if (!this.snappedWindows) {
			this.snappedWindows = [];
		}
		var shouldAdd = true;
		for (var i = 0; i < this.snappedWindows.length; i++) {
			var snappedWin = this.snappedWindows[i];
			if (snappedWin.name === snapObj.name) {
				shouldAdd = false;
				break;
			}
		}

		if (shouldAdd) {
			this.snappedWindows.push(snapObj);
		}
	}

	removeSnappedWindow(name) {
		if (this.snappedWindows) {
			for (var i = 0; i < this.snappedWindows.length; i++) {
				var snappedWin = this.snappedWindows[i];
				if (name === snappedWin.name) {
					// Logger.system.log("Removing", name, "from", this.name);
					this.snappedWindows.splice(i, 1);
					return;
				}
			}
		}
	}

	animatePositionAndHeight(params, cb) {
		this.setInternalBounds(params);
		if (false) {
			//temporarily disable animations - look for this function in autoarrange.js
			this.win.animate({
				transitions: {
					position: {
						top: params.top || 0,
						left: params.left || 0,
						duration: params.duration || 175
					},
					size: {
						height: params.height || 100,
						width: params.width || 100,
						duration: params.duration || 175
					}
				}, options: null
			}, {
				persistBounds: true
			}, cb);
		} else if (this.win._setBounds) {
			params.persistBounds = true;
			this.win._setBounds({ bounds: params }, cb);
		}
	}

	isGrouped() {
		return this.groups.length;
	}

	/**
  * Adds eventListeners so that when the finWIndow moves, we can do things with that data.
  */
	addListeners() {
		this.addEventListener(BOUNDS_CHANGED, this.onBoundsChanged);
		this.addEventListener(BOUNDS_CHANGING, this.onBoundsChanging);
		this.win.addEventListener(BOUNDS_CHANGED, this.onBoundsChanged);
		this.win.addEventListener("hidden", this.hiddenUnclaimSpace);
		this.win.addEventListener("shown", this.unhiddenClaimSpace);
		this.win.addEventListener(SYSTEM_BOUNDS_CHANGED, this.nativeWindowBoundsChanged);
	}
}
/* harmony default export */ __webpack_exports__["a"] = (DockableWindow);

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockableWindow.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockableWindow.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 75 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global, process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__dockableMonitor__ = __webpack_require__(73);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__dockableGroup__ = __webpack_require__(72);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__dockableBox__ = __webpack_require__(54);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__boxMath__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__maskBoundsCalculator__ = __webpack_require__(76);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__maskBoundsCalculator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__maskBoundsCalculator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_async__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_async___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_async__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__Common_Pools_PoolSingletons__ = __webpack_require__(55);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__Common_Pools_PoolSingletons___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6__Common_Pools_PoolSingletons__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__constants__ = __webpack_require__(56);








/** Singleton of the Logger class shared among all instances of DockingCalculator
 * @TODO Refactor to instance member of class.
 */
let Logger;
/** Singleton of the System class shared among all instances of DockingCalculator
 * @TODO Refactor to instance member of class.
 */
let System;
var RouterClient = null;
if (typeof window !== "undefined") {
	if (window.RouterClient) {
		//docking service
		RouterClient = window.RouterClient;
	}
}
if (typeof FSBL !== "undefined") {
	if (FSBL && FSBL.Clients.RouterClient) {
		//test runner
		RouterClient = FSBL.Clients.RouterClient;
	}
}

var MINIMUM_HEIGHT, MINIMUM_WIDTH, ALLOW_GROUPS_TO_SNAP;

var SNAPPING_OPACITY = 0.8;
var debug = false;
var restrictedAreas = [];

function uuidv4() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0,
		    v = c === "x" ? r : r & 0x3 | 0x8;
		return v.toString(16);
	});
}

/**
 * The pools are just the collection of windows that the DockingCalculator is concerned with
 */

var groupPool = __WEBPACK_IMPORTED_MODULE_6__Common_Pools_PoolSingletons__["GroupPoolSingleton"],

//@todo, investigate why I made this a global.
snappableWindows,

//Amount of wiggle room to give when trying to figure out whether the user was clicking a corner or not. Since windows can have different resize regions, there's no guarantee that the user will click directly on the corner of a window.
cornerTolerance = 15,

//Stationary and moving window are cached onMouseDown and cleared onMouseUp.
stationaryWindow = null,

//Windows to ignore for grouping functions (e.g., toolbar - it can snap, but shouldn't group)
groupBlacklist = [],

//@todo, investigate why I made this global. I suspect it was a mistake, or an early pass. This is used when resizing interior windows of a group.
joinedWindowNames = [],
    joinedWindows = [],

//This allows us to defer adding windows/removing windows from a group until onMouseDown. It's modified onMouseMove. @todo, just calculate it onMouseDown, ya dummy.
groupAction = {
	name: null,
	windows: []
},
    shortCircuit = false,
    monitorPool = __WEBPACK_IMPORTED_MODULE_6__Common_Pools_PoolSingletons__["MonitorPoolSingleton"];

function setBoundsErrorCB(err) {
	Logger.system.error(err);
}

/**
 *
 *
 * @returns
 */
class DockingCalculator {
	/**
  * @param {object} params Config for the Calculator
  * @param {object} dependencies Dependency object that provides the System, and Logger.
  * @param {System} dependencies.System
  * @param {Logger} dependencies.Logger
  */
	constructor(params, dependencies) {
		if (dependencies) {
			Logger = dependencies.Logger;
			System = dependencies.System;
		} else {
			throw new Error("DockingCalculator class requires dependency injection. Ensure that dependencies are being passed in as the 2nd parameter.");
		}

		//object that's created onMouseDown. Used to cache potentially expensive operations and common information needed across functions.
		this.resizeObject = {};
		this.groupMode = {
			enabled: true
		};
		this.groupMask = null;
		//Placeholder for the moveRequest. @todo, see if this is necessary. Pretty sure I just pass the reference around everywhere.
		this.moveRequest = null;
		this.dockingPool = __WEBPACK_IMPORTED_MODULE_6__Common_Pools_PoolSingletons__["DockingPoolSingleton"];
		//See comment above.
		this.stationaryWindow = null;
		this.movingWindow = null;
		//Default bufferSize. Can be overwritten by `setBufferSize`.
		this.bufferSize = 15;
		this.resizeEventThrottlePeriod = 0;
		this.moveCount = 0;
		this.intersection = null;
		//The group mask operations are asynchronous and take a variable amount of time. Generally speaking, show takes longer to complete than hide. So if you call show, and 4ms later call hide, you can finish hiding the group mask before the show has completed. This boolean tells the calculator whether the mask should be hidden or shown. Before calling .show or .hide, we check to see if the last function called matches. So if we expect the mask to be hidden, but we're about to call .show, we exit early.
		this.groupMaskExpectedState = "hidden";
		this.groupMaskQueue = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_async__["queue"])(function (task, callback) {
			task(callback);
		});
	}

	/****************************************
 * Core Loop
 * Docking works like this:
 * A dockableWindow receives a `bounds-change-request` event from the window object that it wraps (e.g., an openfin window). Then the docking calculator gets to work.
 * 1. `this.requestMove`.
 * 2. `this.onMouseDown`.
 * 3. `this.onMouseMove`.
 *
 * As the user moves her mouse around, steps 1 and 3 are executed.When she releases her mouse, the dockableWindow throws a `bounds-changed` event, which in turn calls `this.onMouseUp`.
 * The general idea is that the user says "Hey, I'd like to move my window 10px to the right of this window. The calculator spins through, notices that the window that the user is moving is within a snapping buffer around the other window. So it responds, "You're too close to that window, sorry, but we're snapping you.". If the movingWindow isn't within the stationaryWindow's buffer, we give the window the all clear to proceed.
 ****************************************/
	/**
 * This is the core controller of the program. It routes the window's moveRequest to the appropriate place, and it receives the modified bounds afterwards. It communicates the modified bounds to the window via the CB.
 * @param  {moveRequest} Request from the `dockableWindow`.
 * @param  {function} cb What to do after the window's new bounds have been calculated.
 */
	requestMove(userRequest, cb) {
		// console.log("REQUEST MOVE", userRequest.changeType);
		if (!userRequest) {
			Logger.system.warn("INVESTIGATE: userRequest null or undefined in requestMove.");
			cb(null);
			return;
		}
		let win = this.getWindow(userRequest.name);

		if (!win) {
			cb(null);
			return Logger.system.warn("Got Move Request From Window Not Registered With Docking", userRequest.name);
		}

		//Occasionally openfin bubbles up an incorrect change type. A resize from the top right would start with a changeType of 0. The next move will have the proper change type. If we detect that scenario, we need to reset the resizeObject.
		if (this.moveRequest && this.moveRequest === 0 && userRequest.changeType !== 0) {
			this.resizeObject = this.constructResizeObject(moveRequest);
		}
		// Force minimum height and width even if not in group.
		if (userRequest.changeType !== 0) userRequest = this.checkShortCircuits(userRequest);

		if (this.shiftKey && userRequest.changeType === 0 && userRequest.groupNames.length) {
			//Remove from group and move
			let groupNames = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__["clone"])(userRequest.groupNames, Logger.system.error);
			groupNames.forEach(groupName => {
				this.removeWindowFromGroup(userRequest.name, groupName);
				this.wipeSnapRelationships(userRequest.name);
			});

			if (this.updateGroupData) {
				this.updateGroupData();
			}
			userRequest.groupName = null;
		}
		function afterMove(bounds) {
			self.onMouseMove(bounds, cb);
		}
		groupAction = {
			name: null,
			windows: []
		};

		/***
   * The check below is to see whether we should call onMouseDown, which resets a lot of cached information for docking. There are a couple of cases where we want to call onMouseDown.
  	1. We don't have a cached movingWindow reference. This can mean that onMouseDown hasn't been called, _or_ the moving window was removed from docking before onMouseUp was called. This can be triggered by tiling operations.
  	2. We don't have a cached moveRequest.
  	3. We have a moverequest, but the incoming request has a different change type. The only time we've seen that is in the case of aero-snap. if you aero-snap a window to the side or top of a monitor, then move it, it sends in a changeType of 2 - change in position in size. In any normal world, this is a resize. But it comes in as though a user moved the window. That confuses docking.
   */
		if (!this.movingWindow || !this.moveRequest || this.moveRequest && this.moveRequest.changeType !== userRequest.changeType) {
			this.onMouseDown(userRequest);
		}

		var moveRequest = this.setMoveRequest(userRequest),
		    self = this;

		if (moveRequest.changeType === undefined) {
			moveRequest.changeType = 0;
		}

		moveRequest.groupNames = this.movingWindow.groupNames;
		moveRequest.movingRegion = this.resizeObject.correctedHandle;
		moveRequest.resizeHandle = moveRequest.forceResizeHandle ? moveRequest.resizeHandle : this.resizeObject.correctedHandle;

		/**
   * 5/20/19 Joe: Previously handleMoveRequestForMaximizedWindow was being called
   * without setting movingGroup. In the event that the maximize request comes
   * into a window that is a group, this will throw an error.
   */
		this.movingGroup = this.getMovingGroup(moveRequest);

		/**
   * 6/5/19 Joe: If the moving window is in a group (movingGroup is defined)
   * and any windows in the group that aren't the moving window are maximized
   * then restore them
   */
		if (this.movingGroup) {
			Object.keys(this.movingGroup.windows).map(windowName => {
				const win = this.movingGroup.windows[windowName];
				if (win.isMaximized && win.name !== this.movingWindow.name) {
					win.restore();
				}
			});
		}

		if (this.movingWindow.isMaximized) {
			return this.handleMoveRequestForMaximizedWindow(userRequest, cb);
		}

		if (this.groupMode.enabled && moveRequest.groupNames.length) {
			///Do something if in a group.
			this.handleGroup(moveRequest, afterMove);
			return;
		}

		this.checkBuffers(moveRequest, afterMove);
	}

	/**
  * Move requests from windows that were maximized were previously ignored because solving the problem is hard.
  *
  * There are a couple of difficult things we have to contend with.
  * 1. Let's ay the window is maximized, and its left edge is 100. So we go ahead and restore the window, and
  * continue processing moves. Sadly, openfin (maybe electron too??) bubbles up events as though the left
  * edge never changed. To combat this we add a `shouldOffsetByMousePosition` property on the dockableWindow.
  * This forces the window to center itself on the user's mouse.
  *
  * That solves the single window scenario perfectly. Now what if the window is in a group? :scream_emoji:.
  *
  * Now we need to offset _every window in the group_ by the mouse offset. This is bananas, but it's what we have to do so that the user gets
  * the experience that she deserves.
  *
  * @param req moveRequest.
  * @param cb function to call when finished.
  */
	handleMoveRequestForMaximizedWindow(req, cb) {
		if (!req.mousePosition) {
			Logger.system.error("Assertion Failed! A move request was received for a maximized window, but the request" + "is missing a mouse position. If moving the window programmatically, did you forget to add a mouse position ? ");
			return cb(null);
		}

		let win = this.getWindow(req.name);

		let newBounds = req;
		//If we have cached bounds, its the size that the window was before it was maximized. Otherwise...well...we shouldn't be getting in here.
		//This is just for safety's sake.
		newBounds = Object.assign(newBounds, win.cachedBounds || {
			left: win.left,
			top: win.top,
			width: win.width,
			height: win.height
		});

		//The difference between where the window _is_ and where the window _will be_.
		//This value will be used to offset other windows in the group, if the window is part of the group.
		const offsetTop = newBounds.top - win.top;
		const offsetLeft = newBounds.left - win.left;

		//Center the window on the user's pointer.
		newBounds.left = req.mousePosition.x + Math.round(newBounds.width / 2);
		newBounds.top = req.mousePosition.y;
		newBounds.right = newBounds.left + newBounds.width;
		newBounds.bottom = newBounds.top + newBounds.height;

		//Restore our window to where it was before it was maximized. Afterwards, move it.
		//If it's part of a group, drag everyone along for the ride.
		win.restore(() => {
			if (this.groupMode.enabled && win.groupNames.length) {
				///Do something if in a group.
				const windowsInGroup = this.groupWindowIterator(this.movingGroup);

				//Next, we'll move each window by the offset that the mouse position will create. Essentially we are teleporting every window in the group so that they're relative to the window that's moving.
				const moveWindowByOffset = (win, done) => {
					const newSpot = win.getBounds();
					newSpot.left = win.left + offsetLeft;
					newSpot.top = win.top + offsetTop;
					newSpot.name = win.name;
					this.moveWindow(newSpot, done);
				};

				const updateGroupAndExit = () => {
					//This ensures that the group knows where its boundaries are.
					this.movingGroup.updateBounds();
					cb(null);
				};

				__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_async__["forEach"])(windowsInGroup, moveWindowByOffset, updateGroupAndExit);
			} else {
				this.moveWindow(newBounds, () => {
					cb(null);
				});
			}

			// If the window has been restored, we want to reset this.movingWindow.isMaximized
			// otherwise every subsequent move of this window will enter this function
			this.movingWindow.isMaximized = false;
		});
	}
	/**
  * Makes sure that the requested move is occurring in space that is unclaimed by toolbars or other components. This should prevent a window from resizing/moving on top of a toolbar until it passes a threshold.
  * @param {object} moveRequest moverequest.
  */
	makeSureMoveIsInUnclaimedSpace(moveRequest) {
		var unclaimedSpaceOverlaps = this.getUnclaimedSpaceOverlaps(moveRequest);
		var win = this.getWindow(moveRequest.name);
		for (var i = 0, len = unclaimedSpaceOverlaps.length; i < len; i++) {
			var overlap = unclaimedSpaceOverlaps[i];
			for (var e = 0, edgeLen = __WEBPACK_IMPORTED_MODULE_8__constants__["EDGES"].length; e < edgeLen; e++) {
				var edge = __WEBPACK_IMPORTED_MODULE_8__constants__["EDGES"][e];
				if (__WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].intersectBoundingBoxes(moveRequest.snappingRegions[edge], overlap)) {
					if (overlap.position === "top") {
						moveRequest.top = overlap.max.y;
						if (moveRequest.changeType === 0 && moveRequest.top === win.top) {
							moveRequest.bottom = moveRequest.top + win.height;
							moveRequest.height = win.height;
						} //do stuff;
					}
					if (overlap.position === "bottom") {
						moveRequest.bottom = overlap.min.y;
						if (moveRequest.changeType === 0 && moveRequest.bottom === win.bottom) {
							moveRequest.top = moveRequest.bottom - win.height;
							moveRequest.height = win.height;
						} //do stuff;
					}
					if (overlap.position === "right") {
						moveRequest.right = overlap.min.x;
						if (moveRequest.changeType === 0 && moveRequest.left === win.left) {
							moveRequest.left = moveRequest.right - win.width;
							moveRequest.width = win.width;
						}
					}
					if (overlap.position === "left") {
						moveRequest.left = overlap.max.x;
						if (moveRequest.changeType === 0 && moveRequest.right === win.right) {
							moveRequest.right = moveRequest.left + win.width;
							moveRequest.width = win.width;
						}
					}
				}
			}
		}
		if (moveRequest.changeType !== 0) {
			moveRequest.height = moveRequest.bottom - moveRequest.top;
			moveRequest.width = moveRequest.right - moveRequest.left;
		}

		return moveRequest;
	}

	/**
  * This function goes through the restricted areas, or claimedSpaces as they're called in the launcherService. If the moveRequest would cause the window to overlap with the claimed space, we return True - this is an invalid request. requestMove then just drops the request on the floor.
  */
	getUnclaimedSpaceOverlaps(moveRequest) {
		var innerBoundary = {
			min: {
				x: moveRequest.left + moveRequest.width * .25,
				y: moveRequest.top + moveRequest.height * .25
			},
			max: {
				x: moveRequest.right - moveRequest.width * .25,
				y: moveRequest.bottom - moveRequest.bottom * .25
			}
		};
		if (restrictedAreas.length) {
			var overlaps = [];
			for (var i = 0, len = restrictedAreas.length; i < len; i++) {
				var boundingBox = restrictedAreas[i];
				if (__WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].intersectBoundingBoxes(innerBoundary, boundingBox)) {
					return false;
				}
				if (__WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].intersectBoundingBoxes(__WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getWindowBoundingBox(moveRequest), boundingBox)) {
					overlaps.push(boundingBox);
				}
			}
			return overlaps;
		}
		return false;
	}

	/**
  * Windows can be part of two groups - one that can move, and one that allows shared border resizing/group resizing. When N windows are snapped together but not explicitly grouped together, they form an "immobileGroup". A movable group is one that the user has explicitly formed. This function returns the appropriate group, given a moveRequest.
  * @param {object} moveRequest moverequest.
  */
	getMovingGroup(moveRequest) {
		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "getMovingGroup", moveRequest.name);
		}

		//If snapped windows can't resize, we always want to return the movable group first.
		if (this.groupMode.allowSnappedWindowsToResize && moveRequest.changeType !== 0) {
			return this.getImmobileGroup(moveRequest.name) || this.getMovableGroup(moveRequest.name);
		}

		return this.getMovableGroup(moveRequest.name) || this.getImmobileGroup(moveRequest.name);
	}

	/**
  * Loops through all DockableGroups and reconstitutes gaps. This is to clean up an issue where
  * grouped windows containing a single pixel gap would break on mouse down as the system would
  * no longer consider them snapped, and therefore would break and remove the group
  */
	fixAllGroupGaps() {
		Object.values(this.getGroups()).forEach(group => {
			this.cleanupGroupGaps(group);
		});
	}

	/**
  * Given a group, will clean up the gaps and reconstitute the groups
  * @param {object} group An object containing groups, with groupName as key
  */
	cleanupGroupGaps(group) {
		let windowBounds = this.getBoundsOfGroupWindows(group);
		//windowBounds = this.cleanupSharedEdges(group, windowBounds, 0);
		windowBounds = this.cleanupGaps(group, windowBounds);
		this.setBoundsOfGroupWindows(group, windowBounds);
	}

	/**
  * This function caches information in the resizeObject so that it doesn't need to be calculated onMouseMove.
  */
	onMouseDown(moveRequest) {
		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "onMouseDown", moveRequest.name);
		}
		if (RouterClient) RouterClient.transmit("Assimilation.taskbar", { visible: false });

		if (this.moveCount === 0) {
			/*
    * JC 7/26/19 - Cleanup group gaps on first move to solve an issue where grouped
    * windows with a single pixel gap would break when the group was moved
    */
			this.fixAllGroupGaps();
			this.recalculateSnaps();
		}
		this.moveCount++;
		this.movingWindow = this.getWindow(moveRequest.name);
		this.movingWindow.resizeHandle = null;
		if (!this.movingWindow) {
			throw new Error("Window not found");
		}

		//When we mouse down on a dockable component, we need to store the monitor its on immediately. Sometimes, in a multi-monitor configuration, when the window undocks it will momentarily jump to another monitor (since the grabber when docked is always near a monitor edge). To prevent the moveAllWindowsOutOfClaimedSpace calculation from using the wrong monitor, we store it on the window to remove it later.
		if (this.movingWindow.isDockableComponent && this.movingWindow.isDocked) {
			this.movingWindow.dockedMonitor = this.getMonitorForWindow(this.movingWindow); // Not sure why this.movingWindow.monitor is wrong on restart (is always display1)
		}
		this.movingGroup = this.getMovingGroup(moveRequest);
		if (this.movingGroup) {
			this.movingGroup.startMove();
		} else {
			this.movingWindow.win.startMove();
		}
		if (this.groupMode.behavior === "explicit") {
			//If there's no moving group, then we're moving an individual window. if it's part of a resizableGroup, it needs to be removed from that group.
			if (moveRequest.changeType === 0 && this.movingGroup && !this.movingGroup.isMovable) {
				this.removeWindowFromGroup(moveRequest.name, this.movingGroup.name);
				this.wipeSnapRelationships(moveRequest.name);
			}
		}
		this.resizeObject = this.constructResizeObject(moveRequest);

		let dockingPoolIterator = this.dockingPool.iterator();
		for (let win of dockingPoolIterator) {
			if (win.name !== moveRequest.name) {
				win.hideTaskbarIcon();
			}
		}

		if (this.resizeObject.scalingGroup) {
			let groupIter = this.groupWindowIterator(this.movingGroup);
			for (let win of groupIter) {
				win.hide();
			}
			__WEBPACK_IMPORTED_MODULE_4__maskBoundsCalculator___default.a.mouseDown(this.movingGroup.getBounds(), moveRequest.mousePosition, this.resizeObject);
			this.showGroupMask({ bounds: this.movingGroup.getBounds(), opacity: 0.5 }, () => {});
		}
	}

	hideGroupMask(cb = Function.prototype) {
		this.groupMaskExpectedState = "hidden";
		this.groupMaskQueue.push(done => {
			if (this.groupMaskExpectedState === "shown") {
				cb();
				return done();
			}
			this.groupMask.win._hide({}, () => {
				this.groupMaskIsVisible = false;
				cb();
				done();
			});
		});
	}

	/**
  * Transparency breaks often with group mask. So use this to show it.
  *
  * @param {any} bounds
  * @param {number} [opacity=0.5]
  * @param {any} [cb=Function.prototype]
  * @memberof DockingCalculator
  */
	showGroupMask(params, cb = Function.prototype) {
		this.groupMaskExpectedState = "shown";
		//console.log("in show group mask", this.groupMaskIsVisible);
		let bounds = params.bounds;
		let groupMaskBounds = this.groupMask.getBounds();
		if (this.groupMaskIsVisible && groupMaskBounds.top == bounds.top && groupMaskBounds.left == bounds.left && groupMaskBounds.height == bounds.height && groupMaskBounds.width == bounds.width) {
			return cb();
		}

		this.groupMask.setBounds(params.bounds, () => {
			this.groupMask.win._updateOptions({ opacity: params.opacity }, () => {
				this.groupMaskQueue.push(done => {
					if (this.groupMaskExpectedState === "hidden") {
						cb();
						return done();
					}
					this.groupMask.win._show({}, () => {
						this.groupMask.win._bringToFront({}, () => {
							this.groupMaskIsVisible = true;
							cb();
							done();
						});
					});
				});
			});
		});
	}

	/**
  * Show the modal scrim
  *
  * @memberof DockingCalculator
  */
	showModalScrim(params, cb = Function.prototype) {
		System.getMonitorInfo(info => {
			let bounds = info.virtualScreen;
			bounds.width = bounds.right - bounds.left;
			bounds.height = bounds.bottom - bounds.top;
			this.modalScrim.setBounds(bounds, () => {
				this.modalScrim.win._updateOptions({ opacity: 0.01 }, () => {
					this.modalScrim.show(() => {
						this.modalScrim._bringToFront(() => {
							cb();
						});
					});
				});
			});
		});
	}

	hideModalScrim() {
		this.modalScrim.win._updateOptions({ opacity: 0 }, () => {
			this.modalScrim.setBounds({ top: -40, left: -40, height: 40, width: 40 }, () => {
				this.modalScrim.hide();
			}, () => {
				this.modalScrim.hide();
			});
		});
	}

	/**
  * This function happens _after_ the calculations have been made. The request comes in, `this.requestMove` routes the request to the appropriate place, and modified bounds are passed into this function. It's a choke point for all docking-sanctioned window movement.
  */
	onMouseMove(bounds, cb) {
		this.fixWindowOpacity({
			checkForSnappability: true
		});
		if (this.resizeObject.scalingGroup) {
			this.moveGroupMask();
		}
		if (bounds.finished) {
			if (typeof bounds.top !== "undefined") {
				this.moveWindow(bounds);
			}
			cb(null);
		}
	}

	/**
 * When the user lifts her mouse, this is fired. It cleans up opacity, shows windows if we were moving a group, and cleans up global variables.
 *
 * @param {boolean} triggeredByAutoArrange [false] Tells the mouse up routine if this was fired by auto arrange, if it was we don't want to delete cached window positions
 */
	onMouseUp(triggeredByAutoArrange = false) {
		if (!this.movingWindow) return;
		if (this.movingWindow && this.movingWindow.isMaximized) {
			return;
		}
		if (RouterClient) RouterClient.transmit("Assimilation.taskbar", { visible: true });
		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "onMouseUp", "movingAGroupOfWindows", this.movingAGroupOfWindows, "groupMode", this.groupMode, "resizeObject", this.resizeObject);
		}

		if (this.movingAGroupOfWindows) {
			//@todo refactor. correct sounds dumb.
			this.resizeObject = this.correctResizeObject(this.movingWindow, this.resizeObject);
			this.movingGroup.scale(this.groupMask.getBounds(), this.resizeObject.handle, this);
			this.hideGroupMask();
			var groupIter = this.groupWindowIterator(this.movingGroup);
			for (let win of groupIter) {
				win.show();
			}
			this.movingAGroupOfWindows = false;
		}

		let dockingPoolIterator = this.dockingPool.iterator();
		for (let win of dockingPoolIterator) {
			this.buildSnapRelationships(win);
			if (win.snappedWindows.length === 0 && win.groupNames.length) {
				this.removeWindowFromAllGroups(win);
			}

			// If this window is in a movable group, get the window in the
			// top right and show only its taskbar icon.
			const movableGroup = this.getMovableGroup(win.name);
			if (movableGroup) {
				let groupAnchor = movableGroup.getMoveAnchor("BottomLeft");
				if (groupAnchor.name === win.name) {
					win.showTaskbarIcon();
				}
			} else {
				win.showTaskbarIcon();
			}
		}

		let movedWin = {
			name: this.movingWindow.name,
			monitor: this.getMonitorForWindow(this.movingWindow)
		};

		stationaryWindow = null;
		dockingPoolIterator = this.dockingPool.iterator();
		for (let win of dockingPoolIterator) {
			win.resizeHandle = null;
			if (win.groupNames.length) {
				win.groupNames.forEach(groupName => {
					let group = this.getGroup(groupName);
					group.updateBounds();
				});
			}
		}

		joinedWindows = [];
		joinedWindowNames = [];
		//If we did a group operation, call stopMove, which triggers a bounds save.
		if (this.movingGroup) {
			// When we have finished acting on the group, update each individual window's 'finished' property. Then call the function to complete the move.
			for (let windowName in this.movingGroup.windows) {
				let win = this.getWindow(windowName);
				win.finished = true;
			}
			this.movingGroup.stopMove();
			// When we have finished acting on the group, update each individual window's 'finishedMove' property. Then call the function to complete the move.
			for (let windowName in this.movingGroup.windows) {
				let win = this.getWindow(windowName);
				win.win._stopMove();
			}
		} else {
			this.movingWindow.win.stopMove();
		}

		//If we mouse up on a dockable component we need to check if it should be docked. If it should, we have to call to move the window since we also want to expand one side or another. Since a docked window expands to take the width (or height) of the monitor.
		let monitor = movedWin.monitor;
		let modifiedRequest = this.moveRequest;
		if (modifiedRequest) {
			if (this.movingWindow.isDockableComponent && !this.movingWindow.isDocked && this.movingWindow.snappedMonitor) {
				modifiedRequest.dockedHeight = this.movingWindow.dockedParams.height; //TODO: This will only work when docking top/bottom (which is all that's allowed for now)
				modifiedRequest = monitor.dockWindowToMonitor(this.moveRequest);
				if (modifiedRequest) {
					this.moveWindow(modifiedRequest, Function.prototype);
				}
			}
		}
		this.hideGroupMask();

		this.movingGroup = null;
		this.movingWindow = null;
		this.resizeObject = {};
		//moveRequest is null on group mask resizes..sometimes.
		//@todo, investigate.
		if (this.moveRequest && this.groupMode.enabled && groupAction.name) {
			// let group = this.getGroup(groupAction.name);
			// for (let windowName in groupAction.windows) {
			// 	if (groupBlacklist.includes(windowName)) {
			// 		delete groupAction.windows[windowName];
			// 	}
			// }

			// if (group || (Object.keys(groupAction.windows).length > 1)) {
			// 	for (let windowName in groupAction.windows) {
			// 		Logger.system.verbose(windowName);
			// 		this.addWindowToGroup({
			// 			groupName: groupAction.name,
			// 			win: this.getWindow(windowName)
			// 		});
			// 	}
			// }
			this.formGroup(this.moveRequest.name, { isMovable: false });
		}
		this.moveRequest = null;
		this.fixWindowOpacity({
			checkForSnappability: false,
			persist: true
		});

		shortCircuit = false;

		//function below defined by the service. Tell it which monitor the window was on when it moved.
		if (this.onMoveComplete) {
			this.onMoveComplete(movedWin, triggeredByAutoArrange);
		}
	}

	/**
 * Moves one window into claimed space, if outside of said space.
 *
 * @param {object} dockedWin The window that has been docked. Its height/width will be used to determine where to move other windows to
 * @param {array} monitors An array of monitors. Will be used to determine what windows are where, and what needs to move
 * @param {object} windowName the window to move
 * @param {function} done callback on completion
 */
	moveWindowOutOfClaimedSpace(dockedWin, monitors, windowName, done = Function.prototype) {
		var self = this;

		let win = self.getWindow(windowName);
		if (!win || win.name === dockedWin.name) return done();
		//gets set once we find the monitor for the window.
		let isDone = false;
		for (let i = 0; i < monitors.length; i++) {
			let mon = monitors[i];
			//Only need to move windows if the current monitor is the one we docked to and if the current window is on said monitor
			if (dockedWin.monitor.name === mon.name && win.monitor.name === mon.name) {
				// Use DockableMonitor's representation since that gets updated when dockableWindows
				// are docked/undocked. Using unclaimedRect instead of availableRect, availableRect
				// comes from the container, where unclaimedRect is maintained by DockingService
				let { unclaimedRect } = mon;
				let newBounds = {
					left: win.left,
					right: win.right,
					top: win.top,
					bottom: win.bottom,
					height: win.height,
					width: win.width,
					changeType: 1,
					name: win.name,
					hasChanged: false,
					processSnaps: false
				};

				//If we're docking a window to the top of the monitor, and the top another window is in claimed space, resize it so that the window shrinks by the height of the newly docked window. This basically squishes the window out of space it shouldn't be in.
				if (dockedWin.monitorDockablePositions.TOP === dockedWin.dockedPosition) {
					if (win.top < unclaimedRect.top) {
						// Set the top of the window to the bottom of the toolbar docked to the top of the monitor
						newBounds.top = dockedWin.bottom;
						/* To calculate another dimension we need to assume one bound is fixed. Height shouldn't change so it's safer to calculate bottom from the new top and height.
      Previously, we used the new top and old bottom of the window to calculate the new bottom. Depending on how the monitor dimensions changed this could cause the height to be set very small or even negative */
						newBounds.bottom = newBounds.top + newBounds.height;
						newBounds.hasChanged = true;
						newBounds.mousePosition = {
							x: win.left + win.width / 2,
							y: newBounds.top
						};
					}
				}

				if (dockedWin.monitorDockablePositions.BOTTOM === dockedWin.dockedPosition) {
					if (win.bottom > unclaimedRect.bottom) {
						// Set the bottom of the window to the top of the toolbar docked to the bottom of the monitor
						newBounds.bottom = dockedWin.top;
						/* To calculate another dimension we need to assume one bound is fixed. Height shouldn't change so it's safer to calculate the top from the new bottom and height.
      Previously, we used the new bottom and old top of the window to calculate the new bottom. Depending on how the monitor dimensions changed this could cause the height to be set very small or even negative */
						newBounds.top = newBounds.bottom - newBounds.height;
						newBounds.hasChanged = true;
						newBounds.mousePosition = {
							x: win.left + win.width / 2,
							y: newBounds.bottom
						};
					}
				}

				if (newBounds.hasChanged) {
					delete newBounds.hasChanged;
					isDone = true;
					self.requestMove(newBounds, res => {
						self.onMouseUp(false);
						//Update the monitor attached to the window on each bounds change (as it may have moved monitors)
						//If the operation causes any windows to move monitors we need to be sure the monitor attached to that window is updated
						win.monitor = this.getMonitorForWindow(win);
						done();
					});
				}
			}
		}

		if (!isDone) {
			done();
		}
	}

	/**
  * Loops through monitors/windows and moves any windows that are in claimed space outside of said space.
  *
  * @param {object} dockedWin The window that has been docked. Its height/width will be used to determine where to move other windows to
  * @param {array} monitors An array of monitors. Will be used to determine what windows are where, and what needs to move
  */
	moveAllWindowsOutOfClaimedSpace(dockedWin, monitors) {
		this.movingWindow = null;
		let windowNames = this.getWindowNames();

		var moveOne = (windowName, done) => {
			this.moveWindowOutOfClaimedSpace(dockedWin, monitors, windowName, done);
		};

		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_async__["eachSeries"])(windowNames, moveOne, Function.prototype);
	}

	/**
  * Adjusts the claimed/available space of a monitor based on the docked window supplied to it
  *
  * @param {object} params
  * @param {string} params.action "dock" or "undock". The action determines whether space is claimed or released.
  * @param {object} params.win The window being docked
  * @param {object} params.monitor The monitor the window is docking to
  * @param {integer} params.location An enum from DockableWindow. A number that ties back to a docking location
  */
	adjustClaimedSpace(params) {
		if (params.action === undefined || params.dockableWin === undefined || params.dockableMonitor === undefined || params.location === undefined) {
			return;
		}
		let { action, dockableWin: win, dockableMonitor: monitor, location } = params;
		Logger.system.warn("Adjust claimed space", action, location);

		let adjustedMonitor = monitor;
		switch (action) {
			case "dock":
				// ToDo: this manipulation here of claimed space state within a window is lacking abstraction; ideally encapsulate the functionality within the DockableWindow;
				// or minimally provide functions (win.enableClaimedSpace() and win.disableClaimedSpace())
				if (!win.isClaimingSpace) {
					adjustedMonitor = this.claimSpace(win, monitor, location);
					win.isClaimingSpace = true;
				}
				break;
			case "undock":
				if (win.isClaimingSpace) {
					adjustedMonitor = this.releaseClaimedSpace(win, monitor);
					win.isClaimingSpace = false;
				}
				break;
			default:
				break;
		}

		return adjustedMonitor;
	}

	/**
  * Releases claimed space for an undocked window.
  *
  * @param {object} win The window being undocked
  * @param {object} monitor The monitor the window is undocking from
  * @return {object} The modified monitor with new unclaimedRect (released space)
  */
	releaseClaimedSpace(win, monitor) {
		let availableRect = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__["clone"])(monitor.availableRect, Logger.system.error);

		Logger.debug("RELEASING CLAIMED SPACE, unclaimedRect is being set to availableRect");
		monitor.unclaimedRect = availableRect;
		["left", "top", "right", "bottom", "height", "width"].forEach(dimension => {
			monitor[dimension] = availableRect[dimension];
		});
		monitor.calculateSnappingRegions();
		return monitor;
	}

	/**
  * Called when a window is docked in order to claim that space and not allow other windows inside of it
  *
  * @param {object} win The window being docked
  * @param {object} monitor The monitor the window is being docked to
  * @param {integer} location An enum from DockableWindow. A number that ties back to a docking location
  * @return {object} The modified monitor with new unclaimedRect (claimed space)
  */
	claimSpace(win, monitor, location) {
		let unclaimedRect = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__["clone"])(monitor.unclaimedRect, Logger.system.error);

		//TODO: Handle LEFT and RIGHT cases.
		switch (location) {
			case win.monitorDockablePositions.TOP:
				unclaimedRect.top = unclaimedRect.top + win.dockedParams.height;
				Logger.debug("CLAIMING SPACE, unclaimed.top now: ", unclaimedRect.top);
				break;
			case win.monitorDockablePositions.BOTTOM:
				unclaimedRect.bottom = unclaimedRect.bottom - win.dockedParams.height;
				Logger.debug("CLAIMING SPACE, unclaimed.bottom now: ", unclaimedRect.bottom);
				break;
			default:
				break;
		}
		//!NOTE: This may need to be moved inside of the TOP and BOTTOM blocks as it won't be applicable when docking left or right
		unclaimedRect.height = unclaimedRect.bottom - unclaimedRect.top;
		["left", "top", "right", "bottom", "height", "width"].forEach(dimension => {
			monitor[dimension] = unclaimedRect[dimension];
		});
		monitor.unclaimedRect = unclaimedRect;
		return monitor;
	}

	/**
  * Updates local references of monitor information. Happens when a user removes/adds a monitor.
  */
	updateMonitorInfo(monitorUpdate) {
		Logger.system.debug("MONITOR: dockingCalculator.updateMonitorInfo", monitorUpdate);

		restrictedAreas = [];
		//@todo, pick up zones that are off limits from terry's update.
		monitorUpdate.forEach(monitor => {
			//Push updated bounds to the pool.
			if (monitor.availableRect.top !== monitor.unclaimedRect.top) {
				restrictedAreas.push({
					min: {
						x: monitor.unclaimedRect.left,
						y: monitor.availableRect.top
					},
					max: {
						x: monitor.unclaimedRect.right,
						y: monitor.unclaimedRect.top
					},
					position: "top"
				});
			}
			if (monitor.availableRect.left !== monitor.unclaimedRect.left) {
				restrictedAreas.push({
					min: {
						x: monitor.availableRect.left,
						y: monitor.unclaimedRect.top
					},
					max: {
						x: monitor.unclaimedRect.right,
						y: monitor.unclaimedRect.bottom
					},
					position: "left"

				});
			}

			if (monitor.availableRect.right !== monitor.unclaimedRect.right) {
				restrictedAreas.push({
					min: {
						x: monitor.unclaimedRect.right,
						y: monitor.unclaimedRect.top
					},
					max: {
						x: monitor.availableRect.right,
						y: monitor.unclaimedRect.bottom
					},
					position: "right"

				});
			}
			if (monitor.availableRect.bottom !== monitor.unclaimedRect.bottom) {
				restrictedAreas.push({
					min: {
						x: monitor.unclaimedRect.left,
						y: monitor.unclaimedRect.bottom
					},
					max: {
						x: monitor.unclaimedRect.right,
						y: monitor.availableRect.bottom
					},
					position: "bottom"

				});
			}
		});
	}

	/****************************************
  *	  Calculators - Window Collections 	*
  ****************************************/
	formGroup(name, params) {
		let { isMovable, whitelist, isAlwaysOnTop } = params;
		var self = this;
		if (!whitelist) {
			whitelist = this.getWindowNames();
		}
		let win = this.getWindow(name);
		let windows = win.snappedWindows.map(snapObj => snapObj.name).filter(name => {
			return whitelist.includes(name);
		});

		let processed = [win.name];
		function getSnappedWindows(windo) {
			processed.push(windo.name);
			let snappedWindows = windo.snappedWindows.map(snapObj => snapObj.name).filter(name => {
				return whitelist.includes(name);
			});
			windo.snappedWindows.forEach(snapObj => {
				if (!processed.includes(snapObj.name) && whitelist.includes(snapObj.name)) {
					let snapWin = self.getWindow(snapObj.name);
					let grandSnaps = getSnappedWindows(snapWin);
					snappedWindows = snappedWindows.concat(grandSnaps);
				}
			});
			return snappedWindows;
		}

		win.snappedWindows.forEach(snapObj => {
			if (whitelist.includes(snapObj.name)) {
				let snapWin = self.getWindow(snapObj.name);
				let snappedWindows = getSnappedWindows(snapWin);
				windows = windows.concat(snappedWindows);
			}
		});
		//dedupe.
		windows = windows.filter(function (el, i, arr) {
			return arr.indexOf(el) === i;
		});
		if (windows.length) {
			this.groupWindows({ windows, isMovable: isMovable, isAlwaysOnTop: isAlwaysOnTop });
		}
		return windows;
	}

	/**
 * Spins through all of the windows that can group and creates groups based on window position.
 */
	constituteGroups() {
		for (var groupName in this.getGroups()) {
			this.removeGroup(groupName);
		}
		this.eliminateGaps();
		var dockingPoolIterator = this.dockingPool.iterator();
		for (var win of dockingPoolIterator) {
			if (groupBlacklist.includes(win.name)) {
				continue;
			}

			var groupList = this.getGroupNames();
			if (!Object.keys(groupList).length) {
				this.addWindowToGroup({
					groupName: uuidv4(),
					win: win
				});
				continue;
			}
			this.buildSnapRelationships(win);
			var snappedWindows = win.snappedWindows;
			for (var i = 0, len = snappedWindows.length; i < len; i++) {
				var snapObj = snappedWindows[i];
				var snappedWindow = this.getWindow(snapObj.name);
				if (win.groupNames.length) {
					win.groupNames.forEach(groupName => {
						this.addWindowToGroup({
							groupName: groupName,
							win: snappedWindow
						});
					});
				} else if (snappedWindow && snappedWindow.groupNames.length) {
					snappedWindow.groupNames.forEach(groupName => {
						this.addWindowToGroup({
							groupName: groupName,
							win: win
						});
					});
				} else {
					let groupParams = {
						name: uuidv4(),
						MINIMUM_HEIGHT: this.MINIMUM_HEIGHT,
						MINIMUM_WIDTH: this.MINIMUM_WIDTH
					};
					var newGroup = new __WEBPACK_IMPORTED_MODULE_1__dockableGroup__["a" /* default */](groupParams, {
						Logger
					});
					this.addGroup(newGroup);
					this.addWindowToGroup({
						groupName: newGroup.name,
						win: win
					});
					this.addWindowToGroup({
						groupName: newGroup.name,
						win: snappedWindow
					});
				}
			}
		}
	}

	/**
 * Given a moveRequest, it returns an array of windowNames. The check essentially boils down to "is this window within my snapping buffer?"
 * @param  {moveRequest} moveRequest
 */
	getSnappableWindows(moveRequest) {
		var snappableWindows = [];
		var windowIter = this.dockingPool.iterator();
		for (let win of windowIter) {
			//if moveRequest puts the window inside of the stationary window's buffer, snap.
			if (moveRequest.name === win.name) {
				continue;
			}
			if (!win.ignoreSnappingRequests && win.canSnapToWindow(moveRequest) && !moveRequest.ignoreSnappingRequests) {
				snappableWindows.push(win.name);
			}
		}

		return snappableWindows;
	}

	/**
 * Checks to see if the window is within the snapping region of any monitor.
 * @todo, make setBufferSize trickles down to monitors.
 */
	getSnappableMonitors(moveRequest) {
		var monitorNames = Object.keys(monitorPool.getAll()),
		    snappableMonitors = [];
		for (var i = 0, len = monitorNames.length; i < len; i++) {
			var monitorName = monitorNames[i];
			var monitor = monitorPool.get(monitorName);

			if (monitor.canSnapToWindow(moveRequest)) {
				snappableMonitors.push(monitorName);
			}
		}

		return snappableMonitors;
	}

	/**
  * Returns an object that describes the edges and corners that are shared between two windows.
  */
	getSnapObj(win1, win2) {
		return {
			canGroup: !groupBlacklist.includes(win2.name),
			name: win2.name,
			edges: win1.getSharedEdges(win2),
			corners: win1.getSharedCorners(win2)
		};
	}

	/**
  * Snaps two windows..
  */
	snapTwoWindows(win1, win2) {
		if (groupBlacklist.includes(win1.name) || groupBlacklist.includes(win2.name)) {
			return;
		}
		win1.addSnappedWindow(this.getSnapObj(win1, win2));
		win2.addSnappedWindow(this.getSnapObj(win2, win1));
	}

	/**
  * Wipes all relationships between windows and recalculates them.
  */
	recalculateSnaps() {
		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "RECALCULATING SNAP RELATIONSHIPS");
		}
		var windowIter = this.dockingPool.iterator();
		for (let win of windowIter) {
			this.buildSnapRelationships(win);
			if (win.groupNames.length) {
				win.groupNames.forEach(groupName => {
					let group = this.getGroup(groupName);
					group.updateBounds();
				});
			}
		}
	}

	/**
 * Returns an array of `snapObject`s. Just name, shared edges, shared corners, and whether the window canGroup.
 * @param  {dockableWindow} win
 */
	buildSnapRelationships(win) {
		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "ws buildSnapRelationships", win.name);
		}
		if (win.snappedWindows.length) {
			this.wipeSnapRelationships(win.name);
		}
		var snappedWindows = [];
		var dockingPoolIterator = this.dockingPool.iterator();

		for (var snappedWindow of dockingPoolIterator) {
			if (debug) {
				Logger.system.debug("forceObjectsToLogger", "ws dockingPoolIterator", snappedWindow.name);
				Logger.system.debug("forceObjectsToLogger", "ws win.sharesAnEdgeWith(snappedWindow)", win.sharesAnEdgeWith(snappedWindow));
			}
			if (snappedWindow.name === win.name) {
				continue;
			}
			if (win.sharesAnEdgeWith(snappedWindow) || win.sharesACornerWith(snappedWindow)) {
				this.snapTwoWindows(win, snappedWindow);
			}
		}
		return snappedWindows;
	}

	/**
 * Returns any window with a vertex on a segment.
 * @param  {segment} segment A line segment. An array with 2 points in it (start and end).
 * @return {type}
 */
	getWindowsOnSegment(segment) {
		var windowsOnSegment = [];
		var dockingPoolIterator = this.dockingPool.iterator();
		var points = [segment.min, segment.max];
		for (var win of dockingPoolIterator) {
			for (var p = 0, len = points.length; p < len; p++) {
				var point = points[p];
				if (win.pointIsOnBoundingBox(point)) {
					let snapObj = {
						name: win.name,
						edge: win.getEdgeByPoint(point)
					};
					snapObj.segment = win.getEdges("obj")[snapObj.edge];
					windowsOnSegment.push(snapObj);
					break;
				}
			}
		}
		return windowsOnSegment;
	}

	/**
 * Not sure why this function doesn't use the one above. Similar functionality, but you can pass in a string instead of a line segment.
 * @todo, make it use the function above.
 * @param  {dockableWindow} win
 * @param  {string} edge E.g., 'left', 'right', etc.
 * @return {array}
 */
	getWindowsOnEdge(win, edge, includeCorners) {
		if (includeCorners === undefined) {
			includeCorners = false;
		}
		var windowsOnEdge = [];
		if (!edge) {

			//@todo, what went wrong to cause this.................
			return [];
		}
		var splitEdge = edge.split(/(?=[A-Z])/).map(function (s) {
			return s.toLowerCase();
		});
		if (splitEdge.length > 1) {
			let cornerPoint = win.getPointByVertex(edge);
			var windowsAtCorner = this.getWindowsAtPoint(cornerPoint);

			for (let i = 0, len = windowsAtCorner.length; i < len; i++) {
				let possibleSnapper = this.getWindow(windowsAtCorner[i]);

				windowsOnEdge.push({
					name: possibleSnapper.name,
					edge: possibleSnapper.getVertexByPoint(cornerPoint)
				});
			}
		} else {
			var oppEdge = __WEBPACK_IMPORTED_MODULE_8__constants__["OPPOSITE_EDGE_MAP"][edge];
			var dockingPoolIterator = this.dockingPool.iterator();
			var windowSegment = win.getEdges("obj", includeCorners)[edge];

			for (let possibleSnapper of dockingPoolIterator) {
				if (possibleSnapper.name === win.name) {
					continue;
				}
				let segment = possibleSnapper.getEdges("obj", includeCorners)[oppEdge];
				var shouldPush = false;
				let points = [{
					name: possibleSnapper.name,
					val: segment.min
				}, {
					name: possibleSnapper.name,
					val: segment.max
				}, {
					name: win.name,
					val: windowSegment.min
				}, {
					name: win.name,
					val: windowSegment.max
				}];
				if (["top", "bottom"].includes(edge)) {
					if (segment.min.y !== windowSegment.min.y) {
						continue;
					}
					points = points.sort((a, b) => {
						return a.val.x > b.val.x;
					});
				}

				if (["left", "right"].includes(edge)) {
					if (segment.min.x !== windowSegment.min.x) {
						continue;
					}
					points = points.sort((a, b) => {
						return a.val.y > b.val.y;
					});
				}
				if (points[0].name !== points[1].name) {
					shouldPush = true;
				}
				if (shouldPush) {
					if (debug) {
						Logger.system.debug("forceObjectsToLogger", windowSegment, segment, win.name, possibleSnapper.name, edge);
					}
					let snapObj = {
						name: possibleSnapper.name,
						edge: oppEdge
					};
					windowsOnEdge.push(snapObj);
				}
			}
		}

		return windowsOnEdge;
	}

	/**
 * Returns a list of windows that straddle a given edge.
 *	+-----------+------------+
 *	|           |            |
 *	|           |            |
 *	|    A      |     B      |
 *	|           |            |
 *	+-----------+--+---------+
 *	|              |         |
 *	|    C         |   D     |
 *	|              |         |
 *	+--------------+---------+
 *
 * In the drawing above, B straddles the left edge of D and the right Edge of C.
 * @param  {dockableWindow} win
 * @param  {string} edge E.g., 'left', 'right', etc.
 */
	getStraddlers(win, edge) {
		var straddlers = [];
		var dockingPoolIterator = this.dockingPool.iterator();
		for (var straddler of dockingPoolIterator) {

			if (straddler.name === win.name) {
				continue;
			}

			var corners = straddler.vertices;
			for (var corner in corners) {
				if (win.pointIsOnBoundingBox(corners[corner], false)) {
					straddlers.push({
						name: straddler.name,
						edge: win.getEdgeByPoint(corners[corner])
					});
				}
			}
		}
		return straddlers;
	}

	/**
 * Given an X, Y point, it returns a list of windows with that point on their boundingBox.
 * @param  {object} point
 * @return {array}
 */
	getWindowsAtPoint(point) {
		var windows = [];

		var dockingPoolIterator = this.dockingPool.iterator();
		for (var win of dockingPoolIterator) {
			if (groupBlacklist.includes(win.name)) {
				continue;
			}
			if (win.pointIsOnBoundingBox(point)) {
				windows.push(win.name);
			}
		}
		return windows;
	}

	/**
 * Just a helper to say whether a window has an edge on the edge of the group.
 * @todo refactor to just compare win[edge] to group[edge].
 * @param  {dockableWindow} win
 * @param  {dockableGroup} group
 */
	windowIsOnExteriorEdgeOfGroup(win, group) {
		var winBounds = win.windowBoundingBox;
		var groupBounds = group.bounds;
		//left
		if (winBounds.min.x === groupBounds.min.x) {
			return true;
		}
		//bottom
		if (winBounds.max.y === groupBounds.max.y) {
			return true;
		}
		//right
		if (winBounds.max.x === groupBounds.max.x) {
			return true;
		}
		//top
		if (winBounds.min.y === groupBounds.min.y) {
			return true;
		}

		return false;
	}

	/**
  * Lets the program know that shift is being held down. This is used when moving a window that's explicitly grouped (if assimilation is turned on). In that case, the window moves out of the group.
  */
	setShift(bool) {
		this.shiftKey = bool;
	}

	/**
 * Returns an ordered Object. Sorts by Top, then Left.
 * @return {Object} Object where the keys are names of the window.
 */
	orderWindows(windowList, anchor) {
		//TODO: move this into group (see groupWindowIterator, scaleGroup, group.scale)
		//sort windows by top so that when we constitute groups it won't randomly compare windows in the bottom to ones in the top of the monitor.
		var sortableArray = [];
		if (windowList === undefined) {
			windowList = this.dockingPool.getAll();
		}
		for (var windowName in windowList) {
			var win = this.getWindow(windowName);
			sortableArray.push(win);
		}
		sortableArray.sort(function (a, b) {
			var aTop = a.top;
			var aLeft = a.left;

			var bTop = b.top;
			var bLeft = b.left;
			//if the window's top is above the anchor's top, compare its bottom to the anchor's top. In a 3x3 grid, this will ensure that windows in row 2 end up after windows in row 3. Looking at the grid below, if we just compared the window's top to the anchor's top, window D would appear in the array before D, even though D is closer to G. By comparing the bottoms of windows above the anchor, we force the algorithm to look at the left instead of the top. That all may be a crock of shit, too. I Basically, if I resize from the top-right of this group I want it to go: G, H, I, D, E, F, A, B, C. The algorithm below does that.
			/**
    * +-----------+--------------+-------------+
    * |           |              |             |
    * |           |              |             |
    * |    A      |      B       |     C       |
    * |           |              |             |
    * |           |              |             |
    * +-----------+              +-------------+
    * |           +--------------+             |
    * |           |              |             |
    * |    D      |      E       |      F      |
    * |           |              |             |
    * +----------------------------------------+
    * |           |              |             |
    * |           |              |             |
    * |   G       |       H      |      I      |
    * |           |              |             |
    * |           |              |             |
    * +-----------+--------------+-------------+
    */
			if (anchor) {
				let aDelta = {
					left: Math.abs(anchor.left - a.left),
					top: a.bottom === anchor.top ? Math.abs(anchor.top - a.bottom) : Math.abs(anchor.top - a.top)
				};
				let bDelta = {
					left: Math.abs(anchor.left - b.left),
					top: b.bottom === anchor.top ? Math.abs(anchor.top - b.bottom) : Math.abs(anchor.top - b.top)
				};

				if (aDelta.left === bDelta.left) {
					return aDelta.top > bDelta.top;
				}
				return aDelta.left > bDelta.left;
			}
			//orders windows ascending by their Top values.
			if (aTop === bTop) {
				return aLeft - bLeft;
			}
			return aTop - bTop;
		});

		return sortableArray;
	}

	/****************************************
  *			Getters/Setters				*
  ****************************************/
	/**
 * Registers the window with the calculator
 * @param  {string} name
 * @param  {dockableWindow} val
 */
	addWindow(name, val) {
		val.setBufferSize(this.bufferSize);
		val.setResizeThrottlePeriod(this.resizeEventThrottlePeriod);
		this.dockingPool.add(name, val);
		val.limits = {
			minHeight: val.dockingOptions.minHeight,
			minWidth: val.dockingOptions.minWidth,
			maxHeight: val.dockingOptions.maxHeight,
			maxWidth: val.dockingOptions.maxWidth
		};
		val.monitor = this.getMonitorForWindow(val);
		if (val.groupName) {
			let group = this.getGroup(val.groupName);
			group.addWindow(val);
		}
		this.buildSnapRelationships(val);
	}

	/**
  * Virtually unsnaps a window from all other windows. This doesn't affect physical positioning. Only the relationships that Docking is a aware of.
  */
	wipeSnapRelationships(name) {
		let win = this.getWindow(name);
		if (win && win.snappedWindows) {
			let snappedWindows = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__["clone"])(win.snappedWindows, Logger.system.error);
			for (var i = 0, len = snappedWindows.length; i < len; i++) {
				var snapObj = snappedWindows[i];
				var snappedWindow = this.getWindow(snapObj.name);
				win.removeSnappedWindow(snappedWindow.name);
				if (snappedWindow) {
					snappedWindow.removeSnappedWindow(win.name);
				}
			}
		}
	}

	/**
  * Removes a window from all groups.
  */
	removeWindowFromAllGroups(win, deleteGroupsWithOneWindow = true) {
		if (!win) {
			Logger.system.warn("INVESTIGATE: No win passed to removeWindowFromAllGroups.");
			return;
		}
		let groupNames = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__["clone"])(win.groupNames, Logger.system.error);
		for (var i = 0, len = groupNames.length; i < len; i++) {
			var groupName = groupNames[i];
			this.removeWindowFromGroup(win.name, groupName, deleteGroupsWithOneWindow);
		}
	}

	/**
 * Unregisters the window.
 * @param  {string} name
 */
	removeWindow(name, removeListeners = true) {

		let win = this.getWindow(name);
		if (!win) {
			Logger.system.warn("window was not found:", name);
			return;
		}
		//Removes event listeners from the window.
		if (removeListeners) {
			win.removeEventListeners();
		}
		if (!win) {
			Logger.system.warn(`INVESTIGATE: No win found for ${name} in removeWindow.`);
		}
		if (win && win.groupNames.length) {
			//If we aren't removing listeners, we're removing the window for tiling purposes (so it doesn't mess up other windows resizing). In that case, we don't want to remove groups with a single window, which is what the 2nd param here does.
			this.removeWindowFromAllGroups(win, !removeListeners);
		}
		//If we're removing the window that was last cached on mouseDown, wipe the reference. This way, onMouseUp, the window's bounds-changed event will not trigger, and it will not break everything.
		if (this.movingWindow && this.movingWindow.name === win.name) {
			this.movingWindow = null;
		}
		this.wipeSnapRelationships(win.name);
		this.dockingPool.remove(name);
	}

	/**
  * Returns an array of window names.
  */
	getWindowNames() {
		return Object.keys(this.dockingPool.getAll());
	}

	/**
 * @return {dockingPool}
 */
	getWindows() {
		return this.dockingPool.getAll();
	}
	getUnignoredWindows() {
		let windowIter = this.dockingPool.iterator();
		let ret = [];
		for (let win of windowIter) {
			ret.push(win);
		}
		return ret;
	}
	/**
  * Gets a window object by name.
 * @param  {type} name
 * @param  {type} throwError Usually we want to throw the error, but sometimes we use this function to filter (e.g., autoarrange).
 * @return {type}
 */
	getWindow(name, throwError) {
		let win = this.dockingPool.get(name, throwError);
		if (!win && (typeof throwError === "undefined" || throwError)) {
			Logger.system.debug(`No win found for ${name}.`);
		}
		return win;
	}

	/**
  * Given a list of monitors, returns the one that overlaps the most with the window.
  * @param {string} win
  * @param {array} monitors
  */
	getMonitorByMajority(win, monitors) {
		let overlaps = [];
		//Sometimes bad objects get passed into this function. They shouldn't, but they do. if we can't retrieve bounds, it's not a window. Try to get a window. If there's no window, return the first monitor.
		if (!win.getBounds && win.name) win = this.getWindow(win.name);
		if (!win.getBounds) return monitors[0];
		let boundingBox = win.getBounds();
		monitors.forEach(monitor => {
			overlaps.push({
				monitor: monitor,
				overlap: __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getOverlap(boundingBox, monitor.availableRect || monitor.monitorRect)
			});
		});
		//Gets the monitor with the greatest overlap. The reduce function pulls the proper object with the greats overlap value. We return the monitor property of that object.
		return overlaps.reduce((prev, current) => prev.overlap > current.overlap ? prev : current).monitor;
	}

	/**
  * returns the monitor that the window is on. If the left edge of the window is on two or more monitors, we calculate the monitor that houses the majority of the window.
  * @param {string} windowName
  */
	getMonitorForWindow(win) {
		//monitors is an array of monitors that the window's top-left edge is on. This can be 1, 2 (e.g., snapped to the edge of two monitors), or none(top-left is off in virtual space). If it's none or more than 1, we call getMonitorByMajority.
		let monitors = [],
		    allMonitors = [];
		let iterator = monitorPool.iterator();
		for (let monitor of iterator) {
			let rect = monitor.availableRect || monitor.monitorRect;
			if (win.left >= rect.left && win.left <= rect.right && win.top <= rect.bottom && win.top >= rect.top) {
				monitors.push(monitor);
			}
			allMonitors.push(monitor);
		}
		if (monitors.length === 1) {
			return monitors[0];
		}
		return this.getMonitorByMajority(win, allMonitors);
	}
	/**
  * Returns a monitor object.
  * @param {string} name name of monitor.
  */
	getMonitor(name) {
		return monitorPool.get(name);
	}
	/**
  * Registers a monitor with the calculator.
 * @param  {type} bounds
 */
	addMonitor(bounds, onChange) {
		var monitor = new __WEBPACK_IMPORTED_MODULE_0__dockableMonitor__["a" /* default */]({ bounds: bounds, monitor: bounds._monitor });
		monitor.onClaimedSpaceChanged = onChange;
		monitor.setBufferSize(this.bufferSize);
		monitorPool.add(monitor.name, monitor);
	}
	/**
 * Unregisters a monitor with the calculator.
 * @param  {type} name
 * @return {type}
 */
	removeMonitor(name) {
		monitorPool.remove(name);
	}

	/**
 * @return {monitorPool}
 */
	getMonitors() {
		return monitorPool.getAll();
	}

	/**
  * Returns a list of 'rawMonitors' from openfin. These are only available when they are actually passed into the DockableMonitor when its instantiated.
  */
	getRawMonitors() {
		let rawMonitors = [];
		let iterator = monitorPool.iterator();
		for (var monitor of iterator) {
			rawMonitors.push(monitor.rawMonitor);
		}
		return rawMonitors;
	}

	/**
  * Returns the monitors in an array
  */
	getMonitorArray() {
		let monitors = [];
		let iterator = monitorPool.iterator();
		for (var monitor of iterator) {
			monitors.push(monitor);
		}
		return monitors;
	}

	/**
  *
  */
	removeAllMonitors() {
		let iterator = monitorPool.iterator();
		for (var monitor of iterator) {
			this.removeMonitor(monitor.name);
		}
	}

	/**
  * Sets the resize throttle period. This allows the system to drop events that occur too quickly.
  */
	setResizeThrottlePeriod(throttlePeriod) {
		Logger.system.log("DockingService.SetThrottle", JSON.stringify(throttlePeriod));
		this.resizeEventThrottlePeriod = throttlePeriod;
		let windowIter = this.dockingPool.iterator();
		for (let win of windowIter) {
			win.setResizeThrottlePeriod(throttlePeriod);
		}
	}

	/**
  * Sets the opacity that windows take when entering another window's snapping region.
  */
	setSnappingOpacity(opacity) {
		SNAPPING_OPACITY = opacity;
	}

	/**
  * At one point we weren't sure if we were going to allow groups to snap because of bugs. This is vestigial and should be removed at some point.
  */
	setAllowGroupsToSnap(bool) {
		ALLOW_GROUPS_TO_SNAP = bool;
	}

	/**
  * whether to push debug to the logger.
  * @param {boolean} bool
  */
	setDebug(bool) {
		debug = bool;
	}

	/**
  * Sets the size of the region around windows that will trigger a snap.
  */
	setBufferSize(buffer) {
		Logger.system.info("Setting buffer size", `${buffer}`);
		this.bufferSize = buffer;
		var dockingPoolIterator = this.dockingPool.iterator();
		for (var win of dockingPoolIterator) {
			win.setBufferSize(buffer);
		}
		let monitorIterator = monitorPool.iterator();
		for (const monitor in monitorIterator) {
			monitor.setBufferSize(buffer);
		}
	}

	/**
  * Will prevent a window from being added to groups.
  */
	addToGroupBlacklist(windowName) {
		groupBlacklist.push(windowName);
	}

	/**
  * Will allow a window previously blacklisted to be included in group operations.
  */
	removeFromGroupBlacklist(windowName) {
		if (groupBlacklist.includes(windowName)) {
			groupBlacklist.splice(groupBlacklist.indexOf(windowName), 1);
		}
	}

	/**
  * Adds a group to the calculator.
 * @param  {type} group
 */
	addGroup(group) {
		groupPool.add(group.name, group);
	}
	/**
 * Removes a group from the calculator.
 * @param  {type} groupName
 */
	removeGroup(groupName) {
		let group = this.getGroup(groupName);
		let groupIter = this.groupWindowIterator(group);
		if (group) {
			if (group.getWindowNames().length) {
				for (var win of groupIter) {
					if (debug) {
						Logger.system.debug("forceObjectsToLogger", "removing group", win.name);
					}
					this.removeWindowFromGroup(win.name, groupName);
				}
			}
			groupPool.remove(groupName);
		} else {
			console.warn(`Tried removing a group that was already removed. ${groupName}.`);
		}
	}

	/**
  * Returns a list of groups that are capable of moving together.
  */
	getMovableGroups() {
		let groupNames = this.getGroupNames();
		let groups = {};

		for (let i = 0, len = groupNames.length; i < len; i++) {
			let groupName = groupNames[i];
			let group = this.getGroup(groupName);
			if (group.isMovable) {
				groups[groupName] = group;
			}
		}
		return groups;
	}

	/**
 * Returns the group Pool
 * @return {type}
 */
	getGroups() {
		return groupPool.getAll();
	}

	/**
 * Gets a group by name.
 * @param  {type} name
 * @return {type}
 */
	getGroup(name) {
		return groupPool.get(name, false);
	}

	/**
 * Gets an array of group names.
 * @return {type}
 */
	getGroupNames() {
		var names = [];
		let iter = groupPool.iterator();
		for (let group of iter) {
			names.push(group.name);
		}
		return names;
	}

	/**
  * Imagine 3 windows snapped horizontally. All are grouped ([A][B][C]). You ungroup B. This function will remove A and C. It iterates through all of the windows in the group and makes sure it's still attached to the group.
  */
	checkGroupMembership(win) {
		if (!win) {
			Logger.system.warn("INVESTIGATE: No win passed in to checkGroupMembership.");
			return;
		}

		let groupNames = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__["clone"])(win.groupNames, Logger.system.error);
		let snappedWindowGroupNames = win.snappedWindows.map(snapObj => {
			let snapWin = this.getWindow(snapObj.name);
			if (snapWin) {
				return snapWin.groupNames;
			}
			Logger.system.warn(`INVESTIGATE: SnapWin does not exist. ${JSON.stringify(snapObj)}.`);
			return [];
		});
		groupNames.forEach(groupName => {
			let hasSnappedWindowAttachedToGroup = snappedWindowGroupNames.some(arr => {
				return arr.includes(groupName);
			});
			if (!hasSnappedWindowAttachedToGroup) {
				this.removeWindowFromGroup(win.name, groupName);
			}
		});
	}

	/**
  * Removes a window from a group. When tiling, we do not delete groups with only one window. We could be doing an operation on a group with two windows, and we want to retain group membership so that hole-filling works appropriately.
  */
	removeWindowFromGroup(windowName, groupName, deleteGroupsWithOneWindow = true) {
		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "removing window from group", windowName, groupName);
		}
		let win = this.getWindow(windowName);
		if (!win || !groupName || !win.groupNames.includes(groupName)) {
			return;
		}
		win.groupNames.splice(win.groupNames.indexOf(groupName), 1);
		let group = this.getGroup(groupName);
		if (!group) {
			return;
		}

		group.removeWindow(win.name);
		if (deleteGroupsWithOneWindow && group.getWindowNames().length === 1) {
			this.removeWindowFromGroup(group.getWindowNames()[0], group.name);
			this.removeGroup(group.name);
		}
	}

	/**
  * Groups n-Windows.
  *
  * @param {any} params
  * @param {any} cb
  */
	groupWindows(params, cb) {
		var groupName = params.groupName || uuidv4();
		for (var i = 0, len = params.windows.length; i < len; i++) {
			var windowName = params.windows[i];
			let win = this.getWindow(windowName);

			// Only group windows if they are allowed to. e.g. prevent docking of toolbar.
			if (win.canGroup) {
				this.addWindowToGroup({
					win: win,
					groupName: groupName,
					isMovable: typeof params.isMovable !== "undefined" ? params.isMovable : false
				});
			}
		}
		if (cb) {
			cb(null);
		}
	}

	/**
 * @param  {type} groupName
 * @param  {dockableWindow} win
 */
	addWindowToGroup(params, cb) {
		let { groupName, win } = params;
		if (!win) {
			Logger.system.warn("INVESTIGATE: No win passed in to addWindowToGroup.");
			return;
		}
		//in the explicit paradigm, groups default to not being immobile, but resizable.
		let isMovable = typeof params.isMovable !== "undefined" ? params.isMovable : false;
		let isAlwaysOnTop = typeof params.isAlwaysOnTop !== "undefined" ? params.isAlwaysOnTop : false;

		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "add to group", win.name, isMovable, groupName);
		}
		if (groupBlacklist.includes(win.name)) {
			return;
		}
		if (win.groupNames.includes(groupName)) {
			return;
		}

		let groupParams = {
			name: groupName,
			isMovable: isMovable,
			isAlwaysOnTop: isAlwaysOnTop
		};

		var group = this.getGroup(groupName);

		if (!group) {
			if (!groupName) {
				groupName = uuidv4();
			}
			groupParams.name = groupName;
			groupParams.MINIMUM_HEIGHT = this.MINIMUM_HEIGHT;
			groupParams.MINIMUM_WIDTH = this.MINIMUM_WIDTH;
			group = new __WEBPACK_IMPORTED_MODULE_1__dockableGroup__["a" /* default */](groupParams, {
				Logger
			});
			this.addGroup(group);
		}
		//You can only be in two groups at a time. a movable one, and a resizable one.
		if (group.isMovable) {
			let movableGroup = this.getMovableGroup(win.name);
			if (movableGroup) {
				this.removeWindowFromGroup(win.name, movableGroup.name);
			}
		} else {
			let immobileGroup = this.getImmobileGroup(win.name);
			if (immobileGroup) {
				this.removeWindowFromGroup(win.name, immobileGroup.name);
			}
		}

		win.groupNames.push(groupName);
		group.addWindow(win);
		if (group.isMovable) {
			group.bringToFront();
		}
		if (cb) {
			cb(group);
		}
		return group;
	}

	/**
  * Vestigial function; used to pop a window out of a group. Can likely be removed in the future.
  */
	ejectWindow(name) {
		var win = this.getWindow(name);
		var newBounds = win;
		newBounds.left += 40;
		newBounds.top -= 40;
		newBounds.name = win.name;
		this.moveWindow(newBounds);
	}

	/**
 * @return {boolean}
 */
	getGroupMode() {
		return this.groupMode;
	}

	/**
 * @todo refactor the way config is set. This is so bad.
 * @param  {object} groupMade
 * @param  {boolean} groupMade.enabled Whether group mode is enabled.
 * @param  {number} groupMode.headerHeight How large the header is in windows. This shouldn't be in this config. So bad.
 * @param  {number} groupMode.groupTileBuffer How large the buffer is on the edge of a group to trigger a group-tile operation.
 * @param  {boolean} groupMode.allowSnappedWindowsToResize Whether snapped windows will resize as a group.
 * @param  {boolean} groupMode.fillHolesOnUndock Whether leaving a group triggers a hole-filling operation
 * @param  {boolean} groupMode.undockDisbandsEntireGroup Whether clicking the undock button on one window will disband the entire group.
 * @param  {boolean} groupMode.requireRectangularityForGroupResize Whether a group must be a rectangle to scale the individual windows as a unit.
 */
	setGroupMode(groupMode) {
		let bool = groupMode.enabled;
		if (!bool) {
			shortCircuit = false;
			this.getGroupNames().forEach(groupName => {
				this.removeGroup(groupName);
			});
		} else if (bool) {
			this.constituteGroups();
			this.groupTileBuffer = groupMode.groupTileBuffer;
			this.headerHeight = groupMode.headerHeight;
		}

		if (typeof groupMode.allowSnappedWindowsToResize === "undefined") groupMode.allowSnappedWindowsToResize = true;
		if (typeof groupMode.fillHolesOnUndock === "undefined") groupMode.fillHolesOnUndock = true;
		if (typeof groupMode.undockDisbandsEntireGroup === "undefined") groupMode.undockDisbandsEntireGroup = false;
		if (typeof groupMode.requireRectangularityForGroupResize === "undefined") groupMode.requireRectangularityForGroupResize = true;

		this.groupMode = groupMode;
	}

	/**
 * Adds useful properties to a raw request.
 * @param  {moveRequest} req
 * @return {moveRequest}
 */
	setMoveRequest(req, win) {
		if (!win) {
			win = this.getWindow(req.name);
		}
		/**
   * If you call setBounds on a window that is maximized, subsequent move requests will come in as though the window's
   * left edge never moved, until mouseUp happens. This boolean helps us get around this openfin bug.
   */
		if (win.shouldOffsetByMouse) {
			req.left = req.mousePosition.left - req.width / 2;
			req.right = req.left + req.width;
		}

		req.windowBoundingBox = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getWindowBoundingBox(req);
		req.innerBuffer = this.getInnerBoundingBox(req);
		req.snappingRegions = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getSnappingRegions(req, this.bufferSize);
		req = this.makeSureMoveIsInUnclaimedSpace(req);

		this.moveRequest = req;
		return req;
	}

	/**
 * @param  {dockableWindow} win
 */
	setStationaryWindow(win) {
		stationaryWindow = win;
	}

	/**
 * @param  {dockableWindow} win
 */
	setMovingWindow(win) {
		this.movingWindow = win;
	}

	/**
 * Convenience function I used for like 2 minutes.
 * @todo, remove this function.
 * @param  {dockableWindow} stationary
 * @param  {dockableWindow} moving
 */
	setWindows(stationary, moving) {
		stationaryWindow = stationary;
		this.movingWindow = moving;
	}

	/****************************************************
  *													*
  *		Calculators - Multiple Positions/Sizes		*
  *													*
  ****************************************************/

	/**
  * when a non-docking movement is made, we don't grab the bounds changing events.
  * So this updates everything. Example: auto-arrange.
  */
	updateWindowPositions() {
		var dockingPoolIterator = this.dockingPool.iterator();
		for (var win of dockingPoolIterator) {
			win.updateState();
		}
	}

	/**
  * Returns the movableGroup for a window.
  */
	getMovableGroup(windowName) {
		let win = this.getWindow(windowName);
		if (!win) {
			Logger.system.debug(`INVESTIGATE: getMovableGroup failure. No win found for ${windowName}`);
			return null;
		}
		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "Getting movable group", windowName, win.groupNames);
		}
		for (var i = 0, len = win.groupNames.length; i < len; i++) {
			var groupName = win.groupNames[i];
			let group = this.getGroup(groupName);
			if (group.isMovable) {
				if (debug) {
					Logger.system.debug("forceObjectsToLogger", "Found movableGroup", groupName);
				}
				return group;
			}
		}
		return null;
	}

	/**
  * Returns the immobile group for a window. This is one where it is snapped to other windows, but not explicitly grouped by the user.
  */
	getImmobileGroup(windowName) {
		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "Getting immobileGroup", windowName);
		}
		let win = this.getWindow(windowName);
		if (!win) {
			Logger.system.warn("INVESTIGATE: getImmobileGroup failure. No win found for ${windowName}");
			return null;
		}
		for (var i = 0, len = win.groupNames.length; i < len; i++) {
			var groupName = win.groupNames[i];
			let group = this.getGroup(groupName);
			if (group.isMovable) {
				continue;
			}
			return group;
		}
		return null;
	}

	/**
 * Basically just code flow controller. Figures out whether the move will affect just a couple, a single window, or all windows in the group.
 * @param  {moveRequest} moveRequest
 * @param  {function} cb
 */
	handleGroup(moveRequest, cb) {
		this.setMoveRequest(moveRequest);
		moveRequest = this.moveRequest;
		//Before beginning a group's move function set each individual window's 'finishedMove' property
		//This is necessary because the logic which determines whether to set a window's internal bounds after a window aero movement will check to make sure the _user_ is not physically moving the window. As long as the mouse is not causing the movement, and instead the system, we mark all the windows as finished = true. This is just the opposite of that, the group is beginning a movement, so we set finishedMove = false.
		for (let windowName in this.movingGroup.windows) {
			let win = this.getWindow(windowName);
			win.win._startMove();
		}
		if (this.movingGroup.isMovable && moveRequest.changeType === 0) {
			//Before beginning a group's move function set each individual window's 'finished' property
			//This is necessary because the logic which determines whether to set a window's internal bounds after a window aero movement will check to make sure the _user_ is not physically moving the window. As long as the mouse is not causing the movement, and instead the system, we mark all the windows as finished = true. This is just the opposite of that, the group is beginning a movement, so we set finished = false.
			for (let windowName in this.movingGroup.windows) {
				let win = this.getWindow(windowName);
				win.finished = false;
			}
			this.handleGroupMove(moveRequest, cb); //Move a group
		} else {
			if (this.resizeObject.scalingGroup) {
				this.movingAGroupOfWindows = true;
			} else {
				this.resizeInteriorWindow(moveRequest);
			}
			cb({ finished: true });
		}
	}

	/**
  * I wrote this to kill any gap that may have happened after scaling a group proportionately. It seems to work.
  * @todo, make sure this is necessary. Consider a better way to do it.
  */
	eliminateGaps() {
		var self = this;
		var dimensionsToChange = {
			left: "width",
			right: "width",
			bottom: "height",
			top: "height"
		};
		var dockingPoolIterator = this.dockingPool.iterator();
		for (var win of dockingPoolIterator) {
			var snappableWindows = this.getSnappableWindows(win);
			var bounds = win.getBounds();
			snappableWindows.forEach(windowName => {
				var snappedWin = self.getWindow(windowName);
				var sharedEdges = win.getSharedEdges(snappedWin, self.bufferSize);
				for (var edge in sharedEdges) {
					var oppEdge = __WEBPACK_IMPORTED_MODULE_8__constants__["OPPOSITE_EDGE_MAP"][edge];
					if (sharedEdges[edge] && win[edge] !== snappedWin[oppEdge]) {
						bounds[edge] = snappedWin[oppEdge];
						if (edge === "left") {
							bounds.right = bounds.left + bounds.width;
						}

						if (edge === "right") {
							bounds.left = bounds.right - bounds.width;
						}

						if (edge === "top") {
							bounds.bottom = bounds.top + bounds.height;
						}
						if (edge === "bottom") {
							bounds.top = bounds.bottom - bounds.height;
						}
					}
				}
				bounds.name = win.name;
				self.moveWindow(bounds);
			});
		}
	}

	/****************************************************
  *													*
  *	Calculators - Individual Window Position/Size	*
  *													*
  ****************************************************/
	/**
 * Returns a modified moveRequest. If the code gets here, its' because the moving window was inside of the stationary window's buffer, and a snap needed to occur.
 * @param  {moveRequest} request
 * @return {moveRequest}
 */
	snapWindow(request) {
		var intersection = null;
		//order matters here. corners should take precedence, as they'll also handle the vanilla bottom/top/left/right order. The algorithm stops with the first intersection.
		var regions = ["bottomLeft", "bottomRight", "topLeft", "topRight", "leftTop", "leftBottom", "rightTop", "rightBottom", "top", "left", "right", "bottom"];

		var stationaryBoundingBoxes = stationaryWindow.snappingRegions;
		var movingBoundingBoxes = request.snappingRegions;
		var intersectionFound = false;
		for (var i = 0, len = regions.length; i < len; i++) {
			var region = regions[i];
			if (intersectionFound && request.changeType !== 0) {
				break;
			}
			intersection = null;
			//Two checks:
			//1) Is it inside of the stationary window? If so, exit.
			//2) Is it within one of the region bounding boxes.

			if (__WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].intersectBoundingBoxes(stationaryBoundingBoxes[region], request.windowBoundingBox)) {
				if (request.changeType === 0) {
					request.movingRegion = this.getIntersections(request, stationaryWindow, region)[0];
				}
				var movingRegion = request.movingRegion;

				if (movingRegion && __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].intersectBoundingBoxes(stationaryBoundingBoxes[region], movingBoundingBoxes[movingRegion])) {
					intersection = {
						stationaryRegion: region,
						movingRegion: movingRegion
					};
					intersectionFound = true;
				}
			}
			if (intersection) {
				this.intersection = intersection;
				request = this.getNewCoordinates({
					eventType: request.changeType === 0 ? "move" : "resize",
					intersection: intersection,
					stationaryWindow: stationaryWindow,
					request: request
				});
				this.movingWindow.removedBoundsChanging = true;

				//if moving window isn't in a group, see if stationary window is. if so, add moving to the stationary group. if not, create a new group with them.
				//GroupAction is just a placeholder. We only modify groups on mouseDown defers this
				let sharedEdges = stationaryWindow.getSharedEdges(request);
				let sharedEdgesArr = Object.keys(sharedEdges).map(edge => {
					return { edge: sharedEdges[edge] };
				});
				if (!sharedEdgesArr.some(obj => obj.edge)) {
					let sharedCorners = stationaryWindow.getSharedCorners(request);
					let sharedCornersArr = Object.keys(sharedCorners).map(corner => {
						return { corner: sharedCorners[corner] };
					});
					if (!sharedCornersArr.some(obj => obj.corner)) {
						return request;
					}
				}

				if (!groupBlacklist.includes(stationaryWindow.name)) {
					groupAction = this.getDeferredGroupAction(stationaryWindow, this.movingWindow);
				}
			} else {
				this.intersection = {
					stationaryRegion: null,
					movingRegion: null
				};
			}
		}

		this.requestMade = request;
		return request;
	}

	/**
  * When moving a window, we don't want to add it to a group until all the calculations are complete. If two windows snap, this function is called. It figures out which group that the windows should form. Note: It always forms an immobile group (one that allows shared-border resizing). This is because a snap is not an explicit group.
  */
	getDeferredGroupAction(stationaryWin, movingWin) {
		let action = groupAction;
		let stationaryGroup = this.getImmobileGroup(stationaryWin.name);
		let movingWindowGroup = this.getImmobileGroup(movingWin.name);
		if (stationaryGroup && !movingWindowGroup) {
			action.name = stationaryGroup.name;
			action.windows[movingWin.name] = true;
		} else if (movingWindowGroup && !stationaryGroup) {
			action.name = movingWindowGroup.name;
			action.windows[stationaryWin.name] = true;
		} else if (!movingWindowGroup && !stationaryGroup) {
			action.name = uuidv4();
			action.windows[stationaryWin.name] = true;
			action.windows[movingWin.name] = true;
		} else {
			action.name = stationaryGroup.name;
			action.windows[stationaryWin.name] = true;
			action.windows[movingWin.name] = true;
		}
		return action;
	}

	/**
 * Calculates resize bounds.
 * @param  {object} params
 * @return {moveRequest}
 */
	adjustSize(params) {
		var request = params.request,
		    stationaryWindow = params.stationaryWindow,
		    stationaryRegion = params.intersection.stationaryRegion;
		var intersections = this.getIntersections(request, stationaryWindow, stationaryRegion).toString().toLowerCase();
		if (!intersections) {
			return request;
		}

		switch (stationaryRegion) {
			case "leftBottom":
			case "bottomLeft":
				if (intersections.includes("top") || intersections.includes("topleft") || intersections.includes("topright")) {
					request.top = stationaryWindow.bottom;
				}
				if (intersections.includes("topright") || intersections.includes("right")) {
					request.right = stationaryWindow.left;
				}
				if (intersections.includes("topleft") || intersections.includes("left")) {
					request.left = stationaryWindow.left;
				}
				if (intersections.includes("bottom")) {
					request.bottom = stationaryWindow.bottom;
				}
				break;
			case "rightBottom":
			case "bottomRight":
				if (intersections.includes("top") || intersections.includes("topleft") || intersections.includes("topright")) {
					request.top = stationaryWindow.bottom;
				}
				if (intersections.includes("topleft") || intersections.includes("left")) {
					request.left = stationaryWindow.right;
				}

				if (intersections.includes("topright") || intersections.includes("right")) {
					request.right = stationaryWindow.right;
				}
				if (intersections.includes("bottom")) {
					request.bottom = stationaryWindow.bottom;
				}

				break;
			case "topLeft":
			case "leftTop":
				if (intersections.includes("bottom") || intersections.includes("bottomleft") || intersections.includes("bottomright")) {
					request.bottom = stationaryWindow.top;
				}
				if (intersections.includes("bottomleft") || intersections.includes("left")) {
					request.bottom = stationaryWindow.top;
					request.left = stationaryWindow.left;
				}
				if (intersections.includes("bottomright") || intersections.includes("right")) {
					request.right = stationaryWindow.left;
				}
				if (intersections.includes("top")) {
					request.top = stationaryWindow.top;
				}

				break;
			case "rightTop":
			case "topRight":
				if (intersections.includes("bottom") || intersections.includes("bottomleft") || intersections.includes("bottomright")) {
					request.bottom = stationaryWindow.top;
				}
				if (intersections.includes("bottomleft") || intersections.includes("left")) {
					request.left = stationaryWindow.right;
				}
				if (intersections.includes("bottomright") || intersections.includes("right")) {
					request.right = stationaryWindow.right;
				}
				if (intersections.includes("top")) {
					request.top = stationaryWindow.top;
				}
				break;
			case "top":
				if (intersections.includes("bottom")) {
					request.bottom = stationaryWindow.top;
				}
				break;
			case "right":
				if (intersections.includes("left")) {
					request.left = stationaryWindow.right;
				}
				break;
			case "bottom":
				if (intersections.includes("top")) {
					request.top = stationaryWindow.bottom;
				}
				break;
			case "left":
				if (intersections.includes("right")) {
					request.right = stationaryWindow.left;
				}
				break;
		}

		request.width = request.right - request.left;
		request.height = request.bottom - request.top;

		request = this.checkShortCircuits(request);
		return request;
	}

	/**
  * Checks to see if a window has gotten too narrow, or too short.
  */
	checkShortCircuitsWithEdge(request, edge) {
		let win = this.getWindow(request.name);
		//The code for resizing groups goes through here. It just passes bounds, not a window. Here, use the global minimums and no maximums (until a global max is allowed...).
		if (!win) {
			win = {
				limits: {
					minHeight: MINIMUM_HEIGHT,
					minWidth: MINIMUM_WIDTH,
					maxHeight: Infinity,
					maxWidth: Infinity
				}
			};
		}

		//Checks to see if the height/widths are below the window's minimum height/width. If so, it sets them to the minimum values.
		switch (edge) {
			case "top":
				if (request.height <= win.limits.minHeight) {
					request.height = win.limits.minHeight;
					request.bottom = request.top + win.limits.minHeight;
				} else if (request.height >= win.limits.maxHeight) {
					request.height = win.limits.maxHeight;
					request.bottom = request.top + win.limits.maxHeight;
				}
				break;
			case "bottom":
				if (request.height <= win.limits.minHeight) {
					request.height = win.limits.minHeight;
					request.top = request.bottom - win.limits.minHeight;
				} else if (request.height >= win.limits.maxHeight) {
					request.height = win.limits.maxHeight;
					request.top = request.bottom - win.limits.maxHeight;
				}
				break;
			case "left":
				if (request.width < win.limits.minWidth) {
					request.width = win.limits.minWidth;
					request.right = request.left + win.limits.minWidth;
				} else if (request.width > win.limits.maxWidth) {
					request.width = win.limits.maxWidth;
					request.right = request.left + win.limits.maxWidth;
				}
				break;
			case "right":
				if (request.width < win.limits.minWidth) {
					request.width = win.limits.minWidth;
					request.left = request.right - win.limits.minWidth;
				} else if (request.width > win.limits.maxWidth) {
					request.width = win.limits.maxWidth;
					request.left = request.right - win.limits.maxWidth;
				}
				break;
		}
		return request;
	}

	/**
  * Checks to see if a request is allowed. Are you trying to make my window -20px? or 10px? Get out of here.
  * @todo, rename. 'shortcircuitRequest' or something.
  */
	checkShortCircuits(request, win) {
		var currentBounds;

		const defaultLimits = {
			minHeight: MINIMUM_HEIGHT,
			minWidth: MINIMUM_WIDTH,
			maxHeight: Infinity,
			maxWidth: Infinity
		};

		if (typeof win === "undefined") {
			win = this.getWindow(request.name);
		}
		//@note from Daniel, PR Review on 12/4. Address this at some point.
		//Looking at the code isolated from it's calling context, it's not obvious to me that this won't throw a null reference error. You're checking to see if request.name is truthy, which to me implies it's optional, but you're accessing it before this check, which looks really dangerous.We should switch the order, and only access request.name when we've confirmed it's really there.
		if (request.name) {
			currentBounds = win.getBounds();
		} else {
			currentBounds = request;
			//The code for resizing groups goes through here. It just passes bounds, not a window. Here, use the global minimums and no maximums (until a global max is allowed...).
			win = {};
		}

		win.limits = Object.assign(defaultLimits, win.limits || {});

		//@todo consider consolidation. The code for adjusting the bounds are the same. The only difference is the inputs (e.g, we change the height or width, and the anchor);

		//CASE: WINDOW IS TOO NARROW
		//handles shortCircuits for the moving window.
		if (request.width <= win.limits.minWidth) {
			request.width = win.limits.minWidth;

			//If we're dragging the left edge around, anchor the right edge.
			if (request.left !== currentBounds.left) {
				request.right = currentBounds.right;
				request.left = request.right - request.width;
			} else if (request.right !== currentBounds.right) {
				//If we're dragging the right edge around, anchor the left edge.
				request.left = currentBounds.left;
				request.right = request.left + request.width;
			}
		} else if (request.width >= win.limits.maxWidth) {
			//CASE: WINDOW IS TOO WIDE
			request.width = win.limits.maxWidth;

			//If we're dragging the left edge around, anchor the right edge.
			if (request.left !== currentBounds.left) {
				request.right = currentBounds.right;
				request.left = request.right - request.width;
			} else if (request.right !== currentBounds.right) {
				//If we're dragging the right edge around, anchor the left edge.
				request.left = currentBounds.left;
				request.right = request.left + request.width;
			}
		}
		//CASE: WINDOW IS TOO SHORT
		if (request.height <= win.limits.minHeight) {
			request.height = win.limits.minHeight;

			//If we're dragging the top edge around, anchor on the bottom.
			if (request.top !== currentBounds.top) {
				request.bottom = currentBounds.bottom;
				request.top = request.bottom - request.height;
			} else if (request.bottom !== currentBounds.bottom) {
				//If we're dragging the bottom edge around, anchor on the top.
				request.top = currentBounds.top;
				request.bottom = request.top + request.height;
			}
		} else if (request.height >= win.limits.maxHeight) {
			//CASE: WINDOW IS TOO TALL
			request.height = win.limits.maxHeight;

			//If we're dragging the top edge around, anchor on the bottom.
			if (request.top !== currentBounds.top) {
				request.bottom = currentBounds.bottom;
				request.top = request.bottom - request.height;
			} else if (request.bottom !== currentBounds.bottom) {
				//If we're dragging the bottom edge around, anchor on the top.
				request.top = currentBounds.top;
				request.bottom = request.top + request.height;
			}
		}
		return request;
	}

	/**
 * Use when a window is moving and needs to be snapped. Width/Height aren't modified like in `this.adjustSize`.
 * @param  {type} params
 * @return {type}
 */
	getNewCoordinates(params) {
		var request = params.request,
		    stationaryWindow = params.stationaryWindow,
		    movingRegion = params.intersection.movingRegion,
		    stationaryRegion = params.intersection.stationaryRegion;

		if (params.eventType === "resize") {
			return this.adjustSize(params);
		}

		switch (stationaryRegion) {
			case "bottomLeft":
				if (movingRegion.toLowerCase().includes("top")) {
					request.top = stationaryWindow.bottom;
				}
				if (movingRegion.toLowerCase().includes("right")) {
					request.left = stationaryWindow.left - request.width;
				}
				if (movingRegion.toLowerCase().includes("left")) {
					request.left = stationaryWindow.left;
				}
				if (movingRegion.toLowerCase().includes("bottom")) {
					request.top = stationaryWindow.bottom - request.height;
				}
				break;
			case "bottomRight":
				if (movingRegion.toLowerCase().includes("top")) {
					request.top = stationaryWindow.bottom;
				}
				if (movingRegion.toLowerCase().includes("left")) {
					request.left = stationaryWindow.right;
				}
				if (movingRegion.toLowerCase().includes("right")) {
					request.left = stationaryWindow.right - request.width;
				}
				if (movingRegion.toLowerCase().includes("bottom")) {
					request.top = stationaryWindow.bottom - request.height;
				}
				break;
			case "topLeft":
				if (movingRegion.toLowerCase().includes("bottom")) {
					request.top = stationaryWindow.top - request.height;
				}
				if (movingRegion.toLowerCase().includes("left")) {
					request.left = stationaryWindow.left;
				}

				if (movingRegion.toLowerCase().includes("right")) {
					request.left = stationaryWindow.left - request.width;
				}
				if (movingRegion.toLowerCase().includes("top")) {
					request.top = stationaryWindow.top;
				}
				break;
			case "topRight":
				if (movingRegion.toLowerCase().includes("bottom")) {
					request.top = stationaryWindow.top - request.height;
				}
				if (movingRegion.toLowerCase().includes("left")) {
					request.left = stationaryWindow.right;
				}
				if (movingRegion.toLowerCase().includes("right")) {
					request.left = stationaryWindow.right - request.width;
				}
				if (movingRegion.toLowerCase().includes("top")) {
					request.top = stationaryWindow.top;
				}
				break;
			case "leftTop":
				if (movingRegion.toLowerCase().includes("right")) {
					request.left = stationaryWindow.left - request.width;
				}
				if (movingRegion.toLowerCase().includes("top")) {
					request.top = stationaryWindow.top;
				}
				if (movingRegion.toLowerCase().includes("bottom")) {
					request.top = stationaryWindow.top - request.height;
				}
				break;
			case "leftBottom":
				if (movingRegion.toLowerCase().includes("right")) {
					request.left = stationaryWindow.left - request.width;
				}
				if (movingRegion.toLowerCase().includes("bottom")) {
					request.top = stationaryWindow.bottom - request.height;
				}
				if (movingRegion.toLowerCase().includes("top")) {
					request.top = stationaryWindow.bottom;
				}
				break;
			case "rightTop":
				if (movingRegion.toLowerCase().includes("left")) {
					request.left = stationaryWindow.right;
				}
				if (movingRegion.toLowerCase().includes("top")) {
					request.top = stationaryWindow.top;
				}
				if (movingRegion.toLowerCase().includes("bottom")) {
					request.top = stationaryWindow.top - request.height;
				}
				break;
			case "rightBottom":
				if (movingRegion.toLowerCase().includes("left")) {
					request.left = stationaryWindow.right;
				}
				if (movingRegion.toLowerCase().includes("bottom")) {
					request.top = stationaryWindow.bottom - request.height;
				}
				if (movingRegion.toLowerCase().includes("top")) {
					request.top = stationaryWindow.bottom;
				}
				break;
			case "top":
				if (movingRegion.toLowerCase().includes("bottom")) {
					request.top = stationaryWindow.top - request.height;
				}
				break;
			case "right":
				if (movingRegion.toLowerCase().includes("left")) {
					request.left = stationaryWindow.right;
				}
				break;
			case "bottom":
				if (movingRegion.toLowerCase().includes("top")) {
					request.top = stationaryWindow.bottom;
				}
				break;
			case "left":
				if (movingRegion.toLowerCase().includes("right")) {
					request.left = stationaryWindow.left - request.width;
				}
				break;
		}
		request.right = request.left + request.width;
		request.bottom = request.top + request.height;
		return request;
	}

	/**
 * Helper function for figuring out why snapping isn't working.
 * @todo, consider deleting.
 * @return {type}
 */
	getDiagnostics() {
		return {
			requestMade: this.moveRequest,
			stationaryWindow: stationaryWindow,
			movingWindow: this.movingWindow,
			stationaryBoundingBoxes: stationaryWindow.snappingRegions,
			movingBoundingBoxes: this.moveRequest.snappingRegions,
			intersection: this.intersection
		};
	}

	/**
  * Helper to return an object that says which edges are moving.
  * @todo, why not just use splitHandle and a regex? This seems unnecessary.
 * @function this.getMovingEdgesFromResizeHandle
 * @param  {type} handle
 * @return {type}
 */
	getMovingEdgesFromResizeHandle(handle) {
		var edges = {
			top: false,
			right: false,
			left: false,
			bottom: false
		};
		if (!handle) {
			return edges;
		}
		handle = handle.toLowerCase();
		for (var edge in edges) {
			if (handle.includes(edge)) {
				edges[edge] = true;
			}
		}
		return edges;
	}

	/**
  * NOT CALLED RIGHT NOW.
  * Will basically be like `this.onMouseUp`, but for groups...once I can get that stuff working.
  */
	onGroupMaskMoved(cb) {

		var initialWindowBounds = this.movingWindow.initialBounds || this.movingWindow.getBounds();
		var groupName = this.movingGroup.name;
		var boundsDelta = this.getBoundsDelta(this.movingWindow, initialWindowBounds);
		if (debug) {
			Logger.system.debug("forceObjectsToLogger", "ongroupmaskmoved", boundsDelta);
		}
		if (boundsDelta.height === 0 && boundsDelta.width === 0) {
			//move group.
			this.handleGroupMove(groupName, boundsDelta.left, boundsDelta.top);
		} else {
			this.handleGroupResize(boundsDelta);
		}

		var groupIter = this.groupWindowIterator(this.movingGroup);
		for (var win of groupIter) {
			win.show();
		}
		// this.resizeObject = {};
		this.movingWindow.initialBounds = null;
		this.fixWindowOpacity({
			checkForSnappability: false
		});
	}

	/**
  * This is being used
  * bounds are calculated in maskBoundsCalculator.js
  */
	moveGroupMask() {
		this.groupMask.setBounds(__WEBPACK_IMPORTED_MODULE_4__maskBoundsCalculator___default.a.mousePosToBounds(this.moveRequest.mousePosition));
	}
	/**
  * NOT CURRENTLY USED.
  * Will be like `onMouseMove`, but for groups. Goal is to only move all grouped windows `onMouseUp`. In the interim, just move the mask around. Right now I move every window on every resizeEvent
  */
	_moveGroupMaskOld() {
		let moveRequest = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__["clone"])(this.moveRequest, Logger.system.error);
		let bounds = this.groupMask.getBounds();
		if (moveRequest.changeType !== 0) {
			let resizeHandle = this.resizeObject.correctedHandle;
			//@todo figure out why the handle wouldn't be set. sometimes, under strange circumstances (e.g., resizing a group of windows), this is undefined.
			if (resizeHandle) {
				let splitHandle = resizeHandle.split(/(?=[A-Z])/).map(function (s) {
					return s.toLowerCase();
				});

				splitHandle.forEach(handle => {
					if (handle === "top" || handle === "bottom") {
						bounds[handle] = moveRequest.mousePosition.y || moveRequest.mousePosition.top;
					}
					if (handle === "right" || handle === "left") {
						bounds[handle] = moveRequest.mousePosition.x || moveRequest.mousePosition.left;
					}
				});
			}
		}
		bounds.width = bounds.right - bounds.left;
		bounds.height = bounds.bottom - bounds.top;
		bounds.name = "groupMask";
		this.groupMask.setBounds(bounds);
	}
	/**
  * Scales a group of windows proportionately.
  * @param {moveRequest} moveRequest
  */
	scaleGroup(moveRequest) {
		//TODO: see group.scale and convert this to use that
		var self = this;
		var group = this.getMovingGroup(moveRequest);
		var groupIter;
		var resizeHandle = this.resizeObject.correctedHandle;
		var newGroupDimensions = {
			height: self.groupMask.height,
			width: self.groupMask.width
		};
		var splitHandle = resizeHandle.split(/(?=[A-Z])/).map(function (s) {
			return s.toLowerCase();
		});

		var anchors = group.getAnchors(resizeHandle);

		groupIter = this.groupWindowIterator(group, anchors[0]);
		var movements = {};
		for (let win of groupIter) {
			win.onGroupEdge = {};
			win.resizeHandle = this.resizeObject.correctedHandle;
			["top", "right", "left", "bottom"].forEach(handle => {
				if (win[handle] === group[handle]) {
					win.onGroupEdge[handle] = true;
				}
			});
			var newHeight = Math.round(newGroupDimensions.height * (win.height / group.height));
			var newWidth = Math.round(newGroupDimensions.width * (win.width / group.width));
			var request = win.getBounds();
			request.width = newWidth;
			request.height = newHeight;
			request.right = request.left + request.width;
			request.bottom = request.top + request.height;
			request.name = win.name;

			movements[request.name] = this.checkShortCircuits(request);
		}
		splitHandle.forEach(handle => {
			groupIter = this.groupWindowIterator(group);
			//cleans up the edges of the group in case rounding error messed us up.
			var oppEdge = __WEBPACK_IMPORTED_MODULE_8__constants__["OPPOSITE_EDGE_MAP"][handle];
			for (var win of groupIter) {
				var moveRequest = movements[win.name];
				if (win.onGroupEdge && win.onGroupEdge[oppEdge] && moveRequest[oppEdge] !== self.groupMask[oppEdge]) {
					moveRequest.name = win.name;
					moveRequest[oppEdge] = self.groupMask[oppEdge];
					if (oppEdge === "bottom") {
						moveRequest.top = moveRequest.bottom - moveRequest.height;
					}
					if (oppEdge === "top") {
						moveRequest.bottom = moveRequest.top + moveRequest.height;
					}
					if (oppEdge === "left") {
						moveRequest.right = moveRequest.left + moveRequest.width;
					}
					if (oppEdge === "right") {
						moveRequest.left = moveRequest.right - moveRequest.width;
					}
					moveRequest.width = moveRequest.right - moveRequest.left;
					moveRequest.height = moveRequest.bottom - moveRequest.top;
					movements[win.name] = self.checkShortCircuits(moveRequest, win);
				}
			}
		});
		for (var windowName in movements) {
			self.moveWindow(movements[windowName]);
		}
	}

	/**
 * This basically will re-snap all windows after the movingWindow moves.
 * @todo, document inline.
 * @param  {type} group
 * @param  {function} cb
 */
	cleanupGroupResize(group, cb) {
		// TODO: see group.scale (replace scaleGroup and this with group.scale)
		var resizeHandle = group.resizeHandle || this.resizeObject.correctedHandle;
		var splitHandle = resizeHandle.split(/(?=[A-Z])/).map(function (s) {
			return s.toLowerCase();
		});

		var self = this;
		var alreadyDanced = [];
		splitHandle.forEach(handle => {
			var groupIter = this.groupWindowIterator(group);
			alreadyDanced = [];
			for (var anchor of groupIter) {
				if (!alreadyDanced.includes(anchor.name)) {
					var b = doTheConga(anchor, handle);b;
				}
			}
			// group.updateBounds();
			groupIter = this.groupWindowIterator(group);
			//cleans up the edges of the group in case rounding error messed us up.
			for (var win of groupIter) {
				if (win.onGroupEdge && win.onGroupEdge[handle] && win[handle] !== self.groupMask[handle]) {
					var moveRequest = win.getBounds();
					moveRequest.name = win.name;
					moveRequest[handle] = self.groupMask[handle];

					moveRequest.width = moveRequest.right - moveRequest.left;
					moveRequest.height = moveRequest.bottom - moveRequest.top;

					self.moveWindow(self.checkShortCircuits(moveRequest, win));
					var b = doTheConga(win, handle);b;
				}
			}
			group.updateBounds();
		});

		function doTheConga(win, handle) {
			if (!win) {
				Logger.system.warn("INVESTIGATE: No win passed to doTheConga");
				return;
			}
			var oppEdge = __WEBPACK_IMPORTED_MODULE_8__constants__["OPPOSITE_EDGE_MAP"][handle];

			for (var i = 0, len = win.snappedWindows.length; i < len; i++) {
				var snappedWindowObj = win.snappedWindows[i];
				var snappedWin = self.getWindow(snappedWindowObj.name);
				if (!snappedWin) {
					Logger.system.warn(`INVESTIGATE: No Dockable Window found for ${snappedWindowObj.name}`);
					continue;
				}
				let groupIntersection = snappedWin.groupNames.some(name => win.groupNames.includes(name));
				if (!snappedWindowObj.edges[handle] || !groupIntersection) {
					continue;
				}

				var req = snappedWin.getBounds();
				req.name = snappedWin.name;

				snappedWin[oppEdge] = win[handle];
				var top = snappedWin.top,
				    left = snappedWin.left;
				if (handle === "top") {
					top = win.top - snappedWin.height;
				}

				if (handle === "bottom") {
					top = win.bottom;
				}

				if (handle === "right") {
					left = win.right;
				}

				if (handle === "left") {
					left = win.left - snappedWin.width;
				}

				snappedWin.moveTo(left, top);
				var b = doTheConga(snappedWin, handle);b;
				alreadyDanced.push(snappedWin.name);
			}
		}
	}

	/**
  * This returns an object with all of the bounds of all of the windows in a given group. This should be moved in to the dockableGroup.
  */
	getBoundsOfGroupWindows(group) {
		var groupIter = this.groupWindowIterator(group);
		var bounds = {};
		for (var win of groupIter) {
			bounds[win.name] = win.getBounds();
			//bounds[win.name].name = win.name;
		}
		return bounds;
	}

	/**
  * For a group, it will iterate through its windows and set bounds on each of them.
  */
	setBoundsOfGroupWindows(group, windowBounds, stopMove = false) {
		var groupIter = this.groupWindowIterator(group);
		for (var win of groupIter) {
			windowBounds[win.name].name = win.name;
			this.moveWindow(windowBounds[win.name]);
			if (stopMove) {
				win.win.stopMove();

				//TODO: Calling stop move should take care of saving the window options, but didn't seem to work in for certain windows in groups
				win.win._saveWindowOptions();
			}
		}
	}
	/**
  * Exports an array of bounds for the windows that are currently being managed by docking. This makes it easy to generate oddball test cases.
  */
	export() {
		let windowList = this.getWindowNames().map((name, i) => {
			let win = this.getWindow(name);
			let bounds = win.getBounds();
			bounds.name = `window${i}`;
			return bounds;
		});
		if (windowList) {
			return JSON.stringify(windowList);
		}
		return "";
	}

	/**
  * Cleans up shared edges of windows in a group
  * @param {*} group The group to operate on
  * @param {*} windowBounds An object containing bounds key'ed by window name
  * @param {*} triggeredByAutoArrange Wether or not this cleanup was trigger by auto arrange (if true will fire stopMove())
  */
	cleanupSharedEdges(group, windowBounds, triggeredByAutoArrange = false) {
		let groupIter = this.groupWindowIterator(group);
		for (let win of groupIter) {
			let edges = {
				"right": 0,
				"left": 0,
				"top": 0,
				"bottom": 0
			};
			// How many things is this window snapped to on each edge??
			for (let sWin of win.snappedWindows) {
				for (let i in sWin.edges) {
					if (sWin.edges[i]) edges[i]++;
				}
			}

			// If we are only snapped to one thing and are disconnected, reconnect:
			for (let sWin of win.snappedWindows) {
				for (let edge in sWin.edges) {
					if (sWin.edges[edge] && edges[edge] === 1) {
						let snappedWin = windowBounds[sWin.name];
						;

						//if a window is snapped to a window (but not grouped with it), that window won't be in the movable group's window bounds. So make sure it exists first.
						if (snappedWin) {
							if (win[edge] !== snappedWin[__WEBPACK_IMPORTED_MODULE_8__constants__["OPPOSITE_EDGE_MAP"][edge]]) {
								windowBounds[win.name][edge] = snappedWin[__WEBPACK_IMPORTED_MODULE_8__constants__["OPPOSITE_EDGE_MAP"][edge]];
								if (["right", "left"].includes(edge)) {
									windowBounds[win.name].width = windowBounds[win.name].right - windowBounds[win.name].left;
								} else {
									windowBounds[win.name].height = windowBounds[win.name].bottom - windowBounds[win.name].top;
								}
							}
						}
					}
				}
			}
		}
		this.setBoundsOfGroupWindows(group, windowBounds, triggeredByAutoArrange);
		return windowBounds;
	}

	/**
  * A resize-helper that needs better documentation. I'm pretty sure this re-snaps windows during group resizes.
  *
  * @todo @deprecate at 4.0
  */
	cleanupSharedEdges_old(group, windowBounds) {
		var groupIter = this.groupWindowIterator(group);

		// find everything attached to right and bottom of group mask
		let alignRight = [],
		    alignBottom = [];

		for (var win of groupIter) {
			var bounds = windowBounds[win.name];
			if (bounds.right == this.groupMask.right) {
				alignRight.push(win);
			}
			if (bounds.bottom == this.groupMask.bottom) {
				alignBottom.push(win);
			}
			bounds = this.checkShortCircuitsWithEdge(bounds, "left");
			bounds = this.checkShortCircuitsWithEdge(bounds, "top");
		}

		this.setBoundsOfGroupWindows(group, windowBounds);
		let anchor = this.movingWindow;
		if (this.resizeObject) {
			anchor = group.getMoveAnchor(this.resizeObject.handle);
		}
		groupIter = this.groupWindowIterator(group, anchor);
		// move stuff right / down
		for (let win of groupIter) {
			win.snappedWindows.forEach(val => {
				let sWin = this.getWindow(val.name);
				var bounds = windowBounds[win.name];
				var snappedWindowBounds = windowBounds[sWin.name];
				//windows can be snapped but in different groups.
				if (snappedWindowBounds) {
					var sharedEdges = val.edges;
					if (sharedEdges.right) {
						if (bounds.right !== snappedWindowBounds.left) {
							snappedWindowBounds.left = bounds.right;
							snappedWindowBounds.width = snappedWindowBounds.right - snappedWindowBounds.left;
						}
					}

					if (sharedEdges.bottom) {
						if (bounds.bottom !== snappedWindowBounds.top) {
							snappedWindowBounds.top = bounds.bottom;
							snappedWindowBounds.bottom = snappedWindowBounds.height + snappedWindowBounds.top;
						}
					}
					if (sharedEdges.left) {
						if (bounds.left !== snappedWindowBounds.right) {
							snappedWindowBounds.right = bounds.left;
							snappedWindowBounds.width = snappedWindowBounds.right - snappedWindowBounds.left;
						}
					}
				}
			});
		}

		this.setBoundsOfGroupWindows(group, windowBounds);

		groupIter = this.groupWindowIterator(group, anchor);
		// resize to fit
		for (let win of groupIter) {
			win.snappedWindows.forEach(val => {
				let sWin = this.getWindow(val.name);
				var bounds = windowBounds[win.name];
				var snappedWindowBounds = windowBounds[sWin.name];
				if (snappedWindowBounds) {
					var sharedEdges = val.edges;
					if (sharedEdges.right) {
						if (snappedWindowBounds.left > bounds.right) {
							bounds.right = snappedWindowBounds.left;
							bounds.width = bounds.right - bounds.left;
						}
					}
					if (sharedEdges.bottom) {
						if (snappedWindowBounds.top > bounds.bottom) {
							bounds.bottom = snappedWindowBounds.top;
							bounds.height = bounds.bottom - bounds.top;
						}
					}

					if (sharedEdges.left) {
						if (bounds.left !== snappedWindowBounds.right) {
							snappedWindowBounds.right = bounds.left;
							snappedWindowBounds.width = snappedWindowBounds.right - snappedWindowBounds.left;
						}
					}
				}
			});
		}

		groupIter = this.groupWindowIterator(group);

		var maxRight = false;
		var maxBottom = false;
		var minLeft = false;
		var minTop = false;

		for (let win of groupIter) {
			let bounds = windowBounds[win.name];
			if (maxRight === false || bounds.right > maxRight) {
				maxRight = bounds.right;
			}
			if (maxBottom === false || bounds.bottom > maxBottom) {
				maxBottom = bounds.bottom;
			}
			if (minLeft === false || bounds.left < minLeft) {
				minLeft = bounds.left;
			}
			if (minTop === false || bounds.top < minTop) {
				minTop = bounds.top;
			}
		}

		groupIter = this.groupWindowIterator(group);

		for (let win of groupIter) {
			let bounds = windowBounds[win.name];
			if (win.onGroupEdge && win.onGroupEdge.right && maxRight > bounds.right) {
				bounds.right = maxRight;
				bounds.width = bounds.right - bounds.left;
			}

			if (win.onGroupEdge && win.onGroupEdge.bottom && maxBottom > bounds.bottom) {
				bounds.bottom = maxBottom;
				bounds.height = bounds.bottom - bounds.top;
			}

			if (win.onGroupEdge && win.onGroupEdge.left && minLeft < bounds.left) {
				bounds.left = minLeft;
				bounds.width = bounds.right - bounds.left;
			}

			if (win.onGroupEdge && win.onGroupEdge.top && minTop < bounds.top) {
				bounds.top = minTop;
				bounds.height = bounds.bottom - bounds.top;
			}
		}
		return windowBounds;
	}

	/**
  * Run after everything, it removes any gaps that might have occurred (e.g., from fractional pixels, rounding, etc). It needs better inline documentation.
  */
	cleanupGaps(group, windowBounds) {
		var groupIter = this.groupWindowIterator(group);

		var xs = [];
		var ys = [];
		for (var win of groupIter) {
			var bounds = windowBounds[win.name];
			//if (!xs.length) xs.push(bounds.left);
			let found = false;
			for (let i = 0, len = xs.length; i < len; i++) {
				var x = xs[i];
				if (Math.abs(bounds.left - x) < 5) {
					bounds.left = x;
					found = true;
					break;
				}
			}
			if (!found) {
				xs.push(bounds.left);
			}

			found = false;
			for (let i = 0, len = xs.length; i < len; i++) {
				var x = xs[i];
				if (Math.abs(bounds.right - x) < 5) {
					bounds.right = x;
					found = true;
					break;
				}
			}
			if (!found) {
				xs.push(bounds.right);
			}

			bounds.width = bounds.right - bounds.left;

			//if (!ys.length) ys.push(bounds.top);
			found = false;
			for (let i = 0, len = ys.length; i < len; i++) {
				var y = ys[i];
				if (Math.abs(bounds.top - y) < 5) {
					bounds.top = y;
					found = true;
					break;
				}
			}
			if (!found) {
				ys.push(bounds.top);
			}

			found = false;
			for (let i = 0, len = ys.length; i < len; i++) {
				var y = ys[i];
				if (Math.abs(bounds.bottom - y) < 5) {
					bounds.bottom = y;
					found = true;
					break;
				}
			}
			if (!found) {
				ys.push(bounds.bottom);
			}

			bounds.height = bounds.bottom - bounds.top;
			//win.setBounds(bounds)
		}

		return windowBounds;
	}

	shouldShortCircuit(request) {
		let shouldShortCircuit = {
			width: false,
			height: false
		};
		let win = this.getWindow(request.name);
		if (win) {
			if (request.width <= win.limits.minWidth || request.width >= win.limits.maxWidth) {
				shouldShortCircuit.width = true;
			}
			if (request.height <= win.limits.minHeight || request.height >= win.limits.maxHeight) {
				shouldShortCircuit.height = true;
				if (debug) {
					Logger.system.debug("forceObjectsToLogger", "short circuiting height because of", request.name, request.height);
				}
			}
		}

		return shouldShortCircuit;
	}
	/**
  * Resizes a window or group of windows on the interior of a group
  * @param {moveRequest} moveRequest
  */
	resizeInteriorWindow(moveRequest) {
		var shortCircuits = this.shouldShortCircuit(moveRequest);
		var resizeHandle = this.resizeObject.correctedHandle;
		//Hole filling algorithm for tiling calls this method. It passes in the resize handle. It'll never be a corner. No need for the resizeObject here.
		if (moveRequest.forceResizeHandle) {
			resizeHandle = moveRequest.resizeHandle;
		}

		var self = this;
		if (!resizeHandle) {
			return;
		}

		var movements = {};
		var snappableWindows = this.getSnappableWindows(moveRequest);
		var modifiedRequest = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__["clone"])(moveRequest, Logger.system.error);
		var splitHandle = resizeHandle.split(/(?=[A-Z])/).map(function (s) {
			return s.toLowerCase();
		});

		var snappedWindowNames = [];
		for (let i = 0, len = this.movingWindow.snappedWindows.length; i < len; i++) {
			let snapObj = this.movingWindow.snappedWindows[i];
			for (var h = 0, handleLen = splitHandle.length; h < handleLen; h++) {
				let handle = splitHandle[h];
				if (snapObj.edges[handle] || snapObj.corners[resizeHandle]) {
					snappedWindowNames.push(snapObj.name);
					break;
				}
			}
		}
		//will snap the window to other windows before going and modifying the rest of it
		for (let i = 0, len = snappableWindows.length; i < len; i++) {

			if (snappedWindowNames.includes(snappableWindows[i]) || snappableWindows[i] === this.movingWindow.name) {
				continue;
			}
			if (groupBlacklist.includes(snappableWindows[i])) {
				continue;
			}
			let win = this.getWindow(snappableWindows[i]);

			this.setStationaryWindow(win);
			modifiedRequest.movingRegion = resizeHandle;
			var shouldContinue = false;
			for (let h = 0, handleLen = splitHandle.length; h < handleLen; h++) {
				var handle = splitHandle[h];
				if (modifiedRequest[handle] === moveRequest[handle]) {
					shouldContinue = true;
					break;
				}
			}
			modifiedRequest = this.snapWindow(modifiedRequest);

			if (shouldContinue) {
				continue;
			}

			modifiedRequest.snappingRegions = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getSnappingRegions(modifiedRequest, this.bufferSize);

			modifiedRequest.windowBoundingBox = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getWindowBoundingBox(modifiedRequest);
			break;
		}
		moveRequest = modifiedRequest;
		movements[moveRequest.name] = moveRequest;

		var movingWindowSnappedWindows = [];
		var terds = [];

		function recurse(snappedWindows, handle, originalHandle) {
			var oppEdge = __WEBPACK_IMPORTED_MODULE_8__constants__["OPPOSITE_EDGE_MAP"][handle];
			for (let i = 0, len = snappedWindows.length; i < len; i++) {
				let snapObj = snappedWindows[i];

				let snappedWindow = self.getWindow(snapObj.name);
				if (!terds.includes(snapObj.name + oppEdge)) {
					terds.push(snapObj.name + oppEdge);
					movingWindowSnappedWindows.push({
						name: snapObj.name,
						edge: oppEdge,
						handle: originalHandle
					});
					var a = recurse(self.getWindowsOnEdge(snappedWindow, oppEdge), oppEdge, originalHandle);
				}
			}
			return;
		}
		function recurseCorner(cornerWindows, handle, originalHandle) {

			for (let i = 0, len = cornerWindows.length; i < len; i++) {

				let snapObj = cornerWindows[i];

				let snappedWindow = self.getWindow(snapObj.name);
				if (snapObj.corner && !terds.includes(snapObj.name + snapObj.corner)) {
					var splitHandle = snapObj.corner.split(/(?=[A-Z])/).map(function (s) {
						return s.toLowerCase();
					});
					splitHandle.forEach(handle => {
						//if splitHandle == bottomLeft and the originalHandle is bottom, we don't want to do anything with the Left edge. The algorithm will run through this function twice.
						var doStuff = handle === originalHandle || handle === __WEBPACK_IMPORTED_MODULE_8__constants__["OPPOSITE_EDGE_MAP"][originalHandle];
						if (doStuff && !terds.includes(snapObj.name + handle)) {
							movingWindowSnappedWindows.push({
								name: snapObj.name,
								edge: handle,
								handle: originalHandle
							});
							var a = recurse(self.getWindowsOnEdge(snappedWindow, handle), handle, originalHandle);
							terds.push(snapObj.name + handle);
						}
					});
				}

				// recurseCorner(snappedWindow, snapObj.corner);
			}
			return;
		}

		var movingCorner = __WEBPACK_IMPORTED_MODULE_8__constants__["CORNERS"].includes(resizeHandle);
		if (movingCorner) {
			var cornerPoint = self.movingWindow.getPointByVertex(resizeHandle);
			var cornerWindows = self.getWindowsAtPoint(cornerPoint).map((val, i) => {
				return {
					name: val,
					corner: self.getWindow(val).getVertexByPoint(cornerPoint),
					edge: self.getWindow(val).getEdgeByPoint(cornerPoint)
				};
			});

			splitHandle.forEach(handle => {
				var b = recurseCorner(cornerWindows, resizeHandle, handle);
			});
		} else {
			var clonedSnaps = self.getWindowsOnEdge(self.movingWindow, resizeHandle);
			var b = recurse(clonedSnaps, resizeHandle, resizeHandle);
		}

		for (let i = 0, len = movingWindowSnappedWindows.length; i < len; i++) {
			let snapObj = movingWindowSnappedWindows[i];

			var snappedWindow = self.getWindow(snapObj.name);
			let newBounds = movements[snapObj.name] ? movements[snapObj.name] : snappedWindow.getBounds();
			newBounds.name = snapObj.name;
			newBounds[snapObj.edge] = moveRequest[snapObj.handle];

			newBounds.width = newBounds.right - newBounds.left;
			newBounds.height = newBounds.bottom - newBounds.top;

			if (newBounds.width <= snappedWindow.limits.minWidth || newBounds.width >= snappedWindow.limits.maxWidth) {
				shortCircuits.width = true;
			}

			if (newBounds.height <= snappedWindow.limits.minHeight || newBounds.width >= snappedWindow.limits.maxHeight) {
				shortCircuits.height = true;
				if (debug) {
					Logger.system.debug("forceObjectsToLogger", "short circuiting height because of", newBounds.name, newBounds.height);
				}
			}

			newBounds = self.checkShortCircuits(newBounds, snappedWindow);
			movements[newBounds.name] = newBounds;
		}
		for (var windowName in movements) {
			if (groupBlacklist.includes(windowName)) {
				continue;
			}
			var movement = movements[windowName];
			let win = this.getWindow(windowName);
			if (shortCircuits.width) {
				movement.width = win.width;
				movement.left = win.left;
				movement.right = win.right;
			}
			if (shortCircuits.height) {

				movement.height = win.height;
				movement.top = win.top;
				movement.bottom = win.bottom;
			}

			this.moveWindow(movement);
		}
	}

	/**
  * function for debugging a 3x3 grid.
 */
	logger() {
		var boundingBoxes = {};
		var dockingPoolIterator = this.dockingPool.iterator();
		for (var win of dockingPoolIterator) {
			boundingBoxes[windowName] = JSON.stringify(win.windowBoundingBox);
		}
		var box = "";
		box += "+----------------------------------------+\n";
		box += "|             |             |            |\n";
		box += "|   " + boundingBoxes["A"] + "          |    " + boundingBoxes["B"] + "         |   " + boundingBoxes["C"] + "         |\n";
		box += "|             |             |            |\n";
		box += "|             |             |            |\n";
		box += "+----------------------------------------+\n";
		box += "|             |             |            |\n";
		box += "|   " + boundingBoxes["D"] + "          |    " + boundingBoxes["E"] + "         |   " + boundingBoxes["F"] + "         |\n";
		box += "|             |             |            |\n";
		box += "|             |             |            |\n";
		box += "+----------------------------------------+\n";
		box += "|             |             |            |\n";
		box += "|   " + boundingBoxes["G"] + "          |    " + boundingBoxes["H"] + "         |   " + boundingBoxes["I"] + "         |\n";
		box += "|             |             |            |\n";
		box += "|             |             |            |\n";
		box += "+----------------------------------------+\n";
		global.Logger.system.verbose(box);
	}

	/**
 	* Helper to determine whether a moveRequest will affect a window, the group, or just a local collection of windows that are snapped to the movingWindow.
 	*/
	shouldScaleGroup(moveRequest) {
		if (this.groupMode.requireRectangularityForGroupResize) {
			return this.shouldMoveAffectGroup(moveRequest);
		}

		if (!this.groupMode.enabled) {
			return false;
		}
		var win = this.getWindow(moveRequest.name);

		if (!win || !win.groupNames.length) {
			return false;
		}

		var group = this.getMovingGroup(moveRequest);
		let req = new __WEBPACK_IMPORTED_MODULE_2__dockableBox__["a" /* default */](moveRequest);

		//if the handle that's being dragged is on an exterior edge of a group resizing all.
		//This used to be derived from the window because it was only calculated on mouseDown. Now that it can be calculated at any time, we need to derive the handle from the request that's coming in. On group resizes, window bounds are only modified on mouse up.
		let resizeHandle = req.getResizeHandle(moveRequest);

		if (moveRequest.changeType !== 0 && __WEBPACK_IMPORTED_MODULE_8__constants__["CORNERS"].includes(resizeHandle)) {
			var cornerPoint = win.getPointByVertex(resizeHandle);
			let cornersThatCauseScaling = group.getCornersThatCauseScaling();
			let shouldScale = cornersThatCauseScaling.some(corner => {
				return corner.x === cornerPoint.x && corner.y === cornerPoint.y;
			});
			return shouldScale;
		}
		return false;
	}
	/**
  * Helper to determine whether a moveRequest will affect a window, the group, or just a local collection of windows that are snapped to the movingWindow.
  */
	shouldMoveAffectGroup(moveRequest) {
		if (!this.groupMode.enabled) {
			return false;
		}
		var win = this.getWindow(moveRequest.name);

		if (!win || !win.groupNames.length) {
			return false;
		}

		var group = this.getMovingGroup(moveRequest);
		if (!group.isARectangle()) {
			return false;
		}

		//if the handle that's being dragged is on an exterior edge of a group resizing all.
		var resizeHandle = this.resizeObject.correctedHandle || win.getResizeHandle(moveRequest);

		var edges = ["top", "left", "right", "bottom"];
		if (moveRequest.changeType !== 0 && __WEBPACK_IMPORTED_MODULE_8__constants__["CORNERS"].includes(resizeHandle)) {
			var cornerPoint = win.getPointByVertex(resizeHandle);
			return group.pointIsOnBoundingBox(cornerPoint);
		}

		if (moveRequest.changeType !== 0) {
			return win[resizeHandle] === group[resizeHandle];
		}
		//never used, but could be used if you wanted to only allow exterior windows the ability to move the group.
		for (var i = 0, len = edges.length; i < len; i++) {
			var edge = edges[i];
			if (win[edge] === group[edge]) {
				return true;
			}
		}

		return false;
	}

	/**
  * Should use this. Computes the difference between two boundsObjects.
  * @param {moveRequest} newBounds
  * @param {moveRequest} old
  */
	getBoundsDelta(newBounds, old) {
		var boundsDelta = {};
		var widthDelta = newBounds.width - old.width;

		var heightDelta = newBounds.height - old.height;

		boundsDelta.width = widthDelta;
		boundsDelta.height = heightDelta;
		boundsDelta.top = Math.abs(newBounds.top - old.top);
		boundsDelta.left = Math.abs(newBounds.left - old.left);
		if (newBounds.top < old.top) {
			boundsDelta.top = -boundsDelta.top;
		}
		if (newBounds.left < old.left) {
			boundsDelta.left = -boundsDelta.left;
		}

		return boundsDelta;
	}

	/**
 * Will move a group of windows.
 * @param  {moveRequest} moveRequest
 * @param  {function} cb
 */
	handleGroupMove(moveRequest, cb) {
		const invokeCallback = function () {
			cb({ finished: true });
		};

		let self = this;
		let group = this.getMovableGroup(moveRequest.name);
		if (typeof moveRequest.anchor === "undefined") {
			let movingDirection = this.getMovingDirection(moveRequest, this.movingWindow);
			moveRequest.anchor = group.getMoveAnchor(movingDirection);
			if (moveRequest.anchor === "NotMoving") {
				return invokeCallback();
			}
		}
		let updateGroupWindowsByDelta = function (delta, moveWindows, cb) {
			// console.log("updateGroupWindowsByDelta", delta);
			var groupIter = self.groupWindowIterator(group, moveRequest.anchor);
			//don't need to add anything if the delta is 0.
			var modifyBounds = delta.x || delta.y;
			for (let win of groupIter) {
				let bounds = win.getBounds();
				if (modifyBounds) {
					var newLeft = win.left + delta.x;
					var newTop = win.top + delta.y;
					bounds.left = newLeft;
					bounds.top = newTop;
					bounds.bottom = newTop + bounds.height;
					bounds.right = newLeft + bounds.width;
					bounds.name = win.name;
				}
				//don't want wrappers saving here..
				bounds.persistBounds = false;
				if (moveWindows) {
					//I'm breaking my own rule by calling setBounds directly. Sadly, isJiggling was being triggered (I think...didn't really investigate), and the window wasn't moving with small adjustments. Set bounds fixes that.
					if (debug) {
						Logger.system.verbose("Docking: setBounds", win.name);
					}
					win.setBounds(bounds);
				} else {
					win.setInternalBounds(bounds);
				}
			}
			group.updateBounds();
			if (cb) {
				cb();
			}
		};

		let delta = self.getMoveDelta(moveRequest);
		//processSnaps was added for moving groups out of claimed space. When you snapped a window to a movable group, the movable group would snap to the top of the other window rather than being dumped below the claimed space. Basically the first request would shift it down 40px, but then it'd snap to the top of the other window. When we move windows out of claimed space, processSnaps is false.
		if (ALLOW_GROUPS_TO_SNAP) {
			//make the group get its new bounds, but don't move the windows until the snap calculation is finished.
			updateGroupWindowsByDelta(delta, false);
			let preSnapBounds = group.getBounds();
			let mr = group.getBounds();
			mr.name = moveRequest.name;
			mr.mousePosition = moveRequest.mousePosition;
			let groupMoveRequest = this.setMoveRequest(mr);
			groupMoveRequest.changeType = 0;
			this.checkBuffers(groupMoveRequest, function (modifiedRequest) {
				if (modifiedRequest.finished) {
					var delta = self.getMoveDelta(modifiedRequest, preSnapBounds);
					updateGroupWindowsByDelta(delta, true, invokeCallback);
				}
			});
		} else {
			updateGroupWindowsByDelta(delta, true, invokeCallback);
		}
	}

	/**
 * Calculates the % change that a moveRequest inflicts on a group of windows.
 * @param  {moveRequest} moveRequest
 * @return {type}
 */
	getGroupDelta(groupName, moveRequest) {
		var group = this.getGroup(groupName);
		var win = this.getWindow(moveRequest.name);
		var widthDelta = moveRequest.width - win.width;
		var heightDelta = moveRequest.height - win.height;

		var delta = {
			height: __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getPercentChange(group.height, group.height + heightDelta),
			width: __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getPercentChange(group.width, group.width + widthDelta)
		};
		return delta;
	}

	/**
  * Creates the resizeObject. Put anything here that should be cached onMouseDown. Will be cleared onMouseUp.
  * @param {moveRequest} moveRequest
  * @return {resizeObject}
  */
	constructResizeObject(moveRequest) {
		var win = this.getWindow(moveRequest.name);
		let req = new __WEBPACK_IMPORTED_MODULE_2__dockableBox__["a" /* default */](moveRequest);

		//if the handle that's being dragged is on an exterior edge of a group resizing all.
		var resizeObject = {
			//This used to be derived from the window because it was only calculated on mouseDown. Now that it can be calculated at any time, we need to derive the handle from the request that's coming in. On group resizes, window bounds are only modified on mouse up.
			handle: req.getResizeHandle(moveRequest),
			type: "edge",
			scalingGroup: moveRequest.changeType !== 0 ? this.shouldScaleGroup(moveRequest) : false
		};

		resizeObject.correctedHandle = resizeObject.handle;
		if (__WEBPACK_IMPORTED_MODULE_8__constants__["CORNERS"].includes(resizeObject.handle)) {
			resizeObject.type = "corner";
			if (resizeObject.scalingGroup) {
				resizeObject = this.correctResizeObject(win, resizeObject);
			}
		}

		resizeObject.movingEdges = this.getMovingEdgesFromResizeHandle(resizeObject.correctedHandle);
		win.resizeHandle = resizeObject.correctedHandle;

		return resizeObject;
	}

	/**
  * If a corner of a window is on the edge of the group, but it's not an actual corner, we need to treat that as an edge resize. See inline documentation for more. This is basically correcting errant resize-handles.
  * @note this behavior is locked behind `requireRectangularityForGroupResize`. Without that flag turned on, there's no need to change the resize handle.
  */
	correctResizeObject(win, resizeObject, force) {
		//If we don't require rectangularity, we don't need to  change the resize handle.
		if (this.groupMode.requireRectangularityForGroupResize && __WEBPACK_IMPORTED_MODULE_8__constants__["CORNERS"].includes(resizeObject.handle)) {
			let group = this.movingGroup;
			let cornerPoint = win.getPointByVertex(resizeObject.handle);
			let groupEdge = group.getEdgeByPoint(cornerPoint);
			if (group.pointIsOnBoundingBox(cornerPoint, false)) {
				let splitHandle = resizeObject.handle.split(/(?=[A-Z])/).map(function (s) {
					return s.toLowerCase();
				});

				if (this.moveRequest) {
					//E.g., 'bottomRight'. Takes and resets the bottom to whatever it was before the user started moving. So even if I grab the bottom right corner and drag it down, the window's bottom edge will not shift.
					this.moveRequest[splitHandle[0]] = this.movingWindow[splitHandle[0]];
					this.moveRequest.height = this.moveRequest.bottom - this.moveRequest.top;
					this.moveRequest.width = this.moveRequest.right - this.moveRequest.left;
				}
				resizeObject.type = "edge";
				//e.g., bottomRight; this will just choose 'right'. This happens when you grab the corner of a window that's also on the edge of the window...but isn't the corner of the group.

				resizeObject.correctedHandle = groupEdge;
			}
		}

		return resizeObject;
	}

	/**
 * Resizes a window based on some delta.
 * @param  {dockableWindow} win
 * @param  {Object} delta Object with a width/height change.
 * @return {type}
 */
	resizeByDelta(win, delta) {
		var bounds = win.getBounds();
		bounds.width = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].scaleProportionately(win.width, delta.width);
		bounds.height = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].scaleProportionately(win.height, delta.height);
		if (win.resizeHandle.toLowerCase().includes("right")) {
			bounds.right = bounds.left + bounds.width;
		}
		if (win.resizeHandle.toLowerCase().includes("bottom")) {

			bounds.bottom = bounds.top + bounds.height;
		}

		if (win.resizeHandle.toLowerCase().includes("top")) {

			bounds.top = bounds.bottom - bounds.height;
		}

		if (win.resizeHandle.toLowerCase().includes("left")) {

			bounds.left = bounds.right - bounds.width;
		}
		return bounds;
	}

	getMovingDirection(bounds, win) {
		if (!win) {
			win = this.getWindow(bounds.name);
		}
		let direction = "";
		if (win.left > bounds.left) {
			direction = "Left";
		}
		if (win.left < bounds.left) {
			direction += "Right";
		}
		if (win.top > bounds.top) {
			direction += "Top";
		}
		if (win.top < bounds.top) {
			direction += "Bottom";
		}
		return direction;
	}

	/**
 * Does the dirty work of actually moving windows.
 * @todo, shortCircuit moves that try to squash windows beyond a minimum width/height.
 * @param  {moveRequest} bounds
 * @param  {function} callback
 */
	moveWindow(bounds, callback) {
		//if window resize causes ANY window to be smaller than the minimum_width, quit that shit.
		if (!bounds) {
			if (callback) {
				callback();
			}
			return;
		}

		if (!callback) {
			callback = function noop() {};
		}
		var win = this.getWindow(bounds.name);
		if (win) {
			bounds.persistBounds = false;
			win.setBounds(bounds, callback, setBoundsErrorCB);
		}
	}

	/**
 * Checks to see whether a window can be snapped to other windows/monitors.
 * @param  {moveRequest} bounds
 * @param  {function} callback
  */
	checkBuffers(moveRequest, cb) {
		if (this.movingWindow && this.movingWindow.ignoreSnappingRequests) {
			moveRequest.ignoreSnappingRequests = true;
		}
		var snappableWindows = this.getSnappableWindows(moveRequest);
		var snappableMonitors = this.getSnappableMonitors(moveRequest);

		//When a window is moved (ends up inside checkBuffers) and it is docked, we can safely assume the window is being undocked (why else would you move a window that takes up the width of the window (or height)?). Here, we set the new bounds of the move request and call to undock the window, which will propagate to all the necessary items changing (the window will shrink, undock, etc).
		let dockableWin = this.movingWindow;
		if (dockableWin.isDocked) {
			//if the user tries to resize a docked component, ignore it.
			if (moveRequest.changeType !== 0) {
				let req = this.movingWindow.getBounds();
				req.name = this.movingWindow.name;
				req.finished = true;
				this.hideGroupMask();
				return cb(req);
			}

			if (dockableWin.dockedPosition === dockableWin.monitorDockablePositions.TOP) {
				moveRequest.top = dockableWin.top + this.bufferSize * 2;
				moveRequest.bottom = moveRequest.top + dockableWin.height;
			} else if (dockableWin.dockedPosition === dockableWin.monitorDockablePositions.BOTTOM) {
				moveRequest.bottom = dockableWin.bottom - this.bufferSize * 2;
				moveRequest.top = moveRequest.bottom - dockableWin.height;
			}
			moveRequest.height = dockableWin.undockedPosition.height;
			moveRequest.width = dockableWin.undockedPosition.width;

			let monitor = dockableWin.monitor;
			if (dockableWin.dockedMonitor) {
				moveRequest.dockedMonitor = dockableWin.dockedMonitor;
				this.movingWindow.dockedMonitor = null;
			}
			monitor.undockWindowFromMonitor(moveRequest);
			this.hideGroupMask();

			//Force exit
			dockableWin.snappedMonitor = null;
			snappableWindows = [];
			snappableMonitors = [];
		}

		//processSnaps was added for moving groups out of claimed space. When you snapped a window to a movable group, the movable group would snap to the top of the other window rather than being dumped below the claimed space. Basically the first request would shift it down 40px, but then it'd snap to the top of the other window. When we move windows out of claimed space, processSnaps is false.
		if (moveRequest.processSnaps === false || !snappableWindows.length && !snappableMonitors.length && cb) {
			moveRequest.finished = true;
			this.hideGroupMask();
			cb(moveRequest);
			return;
		}

		var modifiedRequest;

		for (let i = 0, len = snappableMonitors.length; i < len; i++) {
			var monitor = monitorPool.get(snappableMonitors[i]);
			let snapRequest = monitor.snapWindow(moveRequest);

			if (dockableWin.isDockableComponent) {
				//If we've made it this far we're moving a dockable component and it isn't already docked (which means we're constantly checking for whether we need to dock). Here we do calculations to determine if a 'dockable mask' should be shown.
				dockableWin.snappedMonitor = monitor;
				let clonedRequest = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__common_disentangledUtils__["clone"])(snapRequest, Logger.system.error);
				snapRequest.dockedMonitor = monitor.name;
				let maskBounds = monitor.getSnappedEdge(clonedRequest);
				let newBounds = monitor.getDockedPosition(maskBounds, clonedRequest);
				if (newBounds) {
					this.showGroupMask({ bounds: newBounds });
				}
				snappableWindows = []; //Force exit if window docks to monitor
			}
			if (snapRequest) {
				moveRequest = snapRequest;
			}

			if (i === snappableMonitors.length - 1 && snappableWindows.length === 0) {
				moveRequest.finished = true;
				cb(moveRequest);
				break;
			}
		}

		for (var i = 0, len = snappableWindows.length; i < len; i++) {
			var win = this.getWindow(snappableWindows[i]);
			this.setStationaryWindow(win);
			win.setOpacity({ opacity: SNAPPING_OPACITY });
			modifiedRequest = this.snapWindow(moveRequest);
			//The original request has been changed because of a snap to a straddler window. replace the reference so new comparisons are made against the newly snapped window.
			moveRequest = modifiedRequest;

			moveRequest.windowBoundingBox = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getWindowBoundingBox(moveRequest);
			if (i === snappableWindows.length - 1) {
				modifiedRequest.finished = true;
			}

			cb(modifiedRequest);
		}
	}

	/**
 * Spins through windows and fixes opacity. For onMouseMove, we skip any windows that could be snapped to the movingWindow. onMouseUp, everything gets hit.
 * @todo, see if I can keep a list of windows that are set to 0.5. I don't need to loop through all windows here. Only the ones that aren't set to 1.
 * @param  {object} params
 * @param  {object} params.checkForSnappability
 */
	fixWindowOpacity(params) {
		var dockingPoolIterator = this.dockingPool.iterator();
		for (var win of dockingPoolIterator) {
			if (params.checkForSnappability) {
				if (win.canSnapToWindow(this.moveRequest)) {
					continue;
				}
			}
			params.opacity = 1;
			win.setOpacity(params);
		}
	}

	/**
  * Happens when config is loaded from the configClient.
  */
	setGlobalMinimums(serviceConfig) {
		MINIMUM_HEIGHT = serviceConfig.MINIMUM_HEIGHT;
		MINIMUM_WIDTH = serviceConfig.MINIMUM_WIDTH;
		//@todo, set minimums on all windows.
		this.MINIMUM_HEIGHT = serviceConfig.MINIMUM_HEIGHT;
		this.MINIMUM_WIDTH = serviceConfig.MINIMUM_WIDTH;
		let groups = this.getGroupNames();

		groups.forEach(name => {
			let group = this.getGroup(name);
			group.setMinimums(serviceConfig);
		});
	}

	/****************************************
  *			Calculators - general		*
 ****************************************/
	/**
 * Given an object, will set boundingboxes on it. If it's a dockableWindow, it'll let the window set itself up.
 * @param  {dockableWindow} win
 * @return {type}
 */
	setBoundingBoxes(win) {

		if (win.setBoundingBoxes) {
			win.setBoundingBoxes();
		} else {
			win.buffer = this.getBuffer(win);
			win.snappingRegions = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getSnappingRegions(win, this.bufferSize);
			win.windowBoundingBox = __WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].getWindowBoundingBox(win);
			win.innerBuffer = this.getInnerBoundingBox(win);
		}
		return win;
	}

	/**
  * Returns the difference between the movingWindow's location and the requested movement.
 * @param  {moveRequest} moveRequest
 * @return {type}
 */
	getMoveDelta(moveRequest, oldBounds) {
		var movingWin = oldBounds || this.getWindow(moveRequest.name);
		var delta = {
			x: moveRequest.left - movingWin.left,
			y: moveRequest.top - movingWin.top
		};
		return delta;
	}

	/**
 * Returns the inner bounds. We use this to give the windows some internal stickiness.
 * @param  {type} bounds
 * @return {object}
 */
	getInnerBoundingBox(bounds) {
		return {
			min: {
				x: bounds.left + this.bufferSize,
				y: bounds.top + this.bufferSize
			},
			max: {
				x: bounds.right - this.bufferSize,
				y: bounds.bottom - this.bufferSize
			}
		};
	}

	/**
 * Gets the snapping buffer of a request.
 * @param  {type} request
 * @return {type}
 */
	getBuffer(request) {
		return {
			min: {
				x: request.left - this.bufferSize,
				y: request.top - this.bufferSize
			},
			max: {
				x: request.right + this.bufferSize,
				y: request.bottom + this.bufferSize
			}
		};
	}

	/**
 * Given a request, a window, and a region, it'll tell you whether they intersect. We use this to figure out which corner/edge to snap to.
 * @param  {moveRequest} moveRequest
 * @param  {dockableWindow} stationaryWindow
 * @param  {string} stationaryRegion
 * @return {object}
 */
	getIntersections(moveRequest, stationaryWindow, stationaryRegion) {

		var movingBoundingBoxes = moveRequest.snappingRegions;
		var stationaryBoundingBoxes = stationaryWindow.snappingRegions;
		var intersections = [];
		for (var movingRegion in movingBoundingBoxes) {

			if (movingRegion === "inner") {
				continue;
			}
			if (__WEBPACK_IMPORTED_MODULE_3__boxMath__["a" /* default */].intersectBoundingBoxes(stationaryBoundingBoxes[stationaryRegion], movingBoundingBoxes[movingRegion])) {
				intersections.push(movingRegion);
			}
		}
		return intersections;
	}

	/****************************************
  *				Iterators				*
 ****************************************/
	*groupWindowIterator(group, orderAnchor = this.movingWindow) {
		//TODO: move this into group so you can do group.windowIterator (also will help cleanup group.scale)
		let windows = this.orderWindows(group.windows, orderAnchor);
		//preserves order..for .. in does not.
		for (let i = 0; i < windows.length; i++) {
			yield windows[i];
		}
	}

	setRouterClient(client) {
		this.routerClient = client;
	}
}
/* harmony default export */ __webpack_exports__["a"] = (DockingCalculator);

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockingCalculator.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\dockingCalculator.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(4), __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {// Wanted to do ES6 export but that didn't work in current WP configurations, not sure why
module.exports = {
	mouseDown,
	mousePosToBounds
};
// The following variables refers to last known state of
// group mask, mouse down position and the resize object.
let oldBounds = null;
let resizeObject = null;
let mouseDownPosition = null;

/**
 * Caches the passed 3 arguments which are the old and last known group mask bounds
 * the mouse down position and the resize object.
 * @param {object} initialBounds The current group mask bounds (width, height, top, left)
 * @param {object} mousePosition The onMouseDown mouse's position (top, left)
 * @param {object} resizeObj The resize object, we need from this object the movingEdges property
 * @returns {object}
 */
function mouseDown(initialBounds, mousePosition, resizeObj) {
	oldBounds = initialBounds;
	mouseDownPosition = mousePosition;
	resizeObject = resizeObj;
	return {
		oldBounds,
		mouseDownPosition,
		resizeObj
	};
}
/**
 * Takes the latest mouse position top and left and calculates where and how many pixels
 * should we shift the mask and return the newly calculated bounds as an object
 * @param {object} mousePosition The moveRequest's mousePosition (top and left)
 */
function mousePosToBounds(mousePosition) {
	// We will use the next 2 variables to decide whether we are modifying the width
	// or height or both
	const noHorResize = !resizeObject.movingEdges.left && !resizeObject.movingEdges.right;
	const noVertResize = !resizeObject.movingEdges.top && !resizeObject.movingEdges.bottom;
	const topPixels = mousePosition.y - mouseDownPosition.y;
	const leftPixels = mousePosition.x - mouseDownPosition.x;
	const bounds = {
		width: oldBounds.width + (noHorResize ? 0 : leftPixels),
		height: oldBounds.height + (noVertResize ? 0 : topPixels),
		top: oldBounds.top,
		left: oldBounds.left,
		name: "groupMask"
	};
	// If we are changing the top position if the mask
	// we know this when movingEdges.top is true
	if (resizeObject.movingEdges.top) {
		bounds.top = bounds.top + topPixels;
		if (mousePosition.y > mouseDownPosition.y) {
			// If wondering why *2, its because we initially added those
			// pixels above, see const bounds = {}
			bounds.height = bounds.height - Math.abs(topPixels * 2);
		} else {
			bounds.height = bounds.height + Math.abs(topPixels * 2);
		}
	}
	// If we are changing the left position of the mask
	// we know this when movingEdges.left is true
	if (resizeObject.movingEdges.left) {
		bounds.left = bounds.left + leftPixels;
		if (mousePosition.x > mouseDownPosition.x) {
			bounds.width = bounds.width - Math.abs(leftPixels * 2);
		} else {
			bounds.width = bounds.width + Math.abs(leftPixels * 2);
		}
	}
	// Return newly calculated bounds
	return bounds;
}

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\maskBoundsCalculator.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\maskBoundsCalculator.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ }),
/* 77 */,
/* 78 */,
/* 79 */,
/* 80 */,
/* 81 */,
/* 82 */,
/* 83 */,
/* 84 */,
/* 85 */,
/* 86 */,
/* 87 */,
/* 88 */,
/* 89 */,
/* 90 */,
/* 91 */,
/* 92 */,
/* 93 */,
/* 94 */,
/* 95 */,
/* 96 */,
/* 97 */,
/* 98 */,
/* 99 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(module, process) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__dockableWindow__ = __webpack_require__(74);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__mockMonitor__ = __webpack_require__(160);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__dockingCalculator__ = __webpack_require__(75);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__common_disentangledUtils__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__common_disentangledUtils___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3__common_disentangledUtils__);


var dockableWindows = {};


var DockingCalculator = new __WEBPACK_IMPORTED_MODULE_2__dockingCalculator__["a" /* default */]({}, {
	Logger: __WEBPACK_IMPORTED_MODULE_3__common_disentangledUtils__["mockLogger"]
});
var CONSTANTS = __webpack_require__(56);
const MockSystem = __webpack_require__(161);
// var AutoArrange = require("../../../MultiWindowFeatures/autoArrange");

DockingCalculator.sendAutoArrangeStatusUpdate = Function.prototype;
function DockingMath() {
	var self = this;
	self.bufferSize = 15;
	this.recalculateSnaps = () => {
		DockingCalculator.recalculateSnaps();
	};
	this.shouldMoveAffectGroup = function (req) {
		return DockingCalculator.shouldMoveAffectGroup(req);
	};
	this.setGroupMask = function (win) {
		win._getBounds(bounds => {
			var mask = new __WEBPACK_IMPORTED_MODULE_0__dockableWindow__["a" /* default */](win, bounds, {
				calculator: DockingCalculator,
				Logger
			});
			DockingCalculator.groupMask = mask;
		});
	};
	// this.AutoArrange = new AutoArrange({
	// 	DockingCalculator: DockingCalculator
	// });

	this.eliminateGaps = function () {
		DockingCalculator.eliminateGaps();
	};
	this.getGroupMask = function () {
		return DockingCalculator.getGroupMask();
	};
	this.addGroup = params => {
		DockingCalculator.addGroup(params);
	};

	this.addWindow = function (win) {
		return new Promise(function (resolve, reject) {
			win._getBounds(bounds => {
				if (win.name.includes("toolbar")) {
					win.canGroup = false;
				} else {
					win.canGroup = true;
				}
				var dockableWindow = new __WEBPACK_IMPORTED_MODULE_0__dockableWindow__["a" /* default */](win, bounds, {
					calculator: DockingCalculator,
					System: MockSystem,
					Logger: __WEBPACK_IMPORTED_MODULE_3__common_disentangledUtils__["mockLogger"]
				});
				DockingCalculator.addWindow(win.name, dockableWindow);
				resolve(dockableWindow);
			});
		});
	};

	this.removeWindow = function (windowName) {
		DockingCalculator.removeWindow(windowName);
	};
	this.setAllowGroupsToSnap = function (bool) {
		DockingCalculator.setAllowGroupsToSnap(bool);
	};
	this.removeWindowFromAllGroups = function (windowName) {
		let win = DockingCalculator.getWindow(windowName);
		DockingCalculator.removeWindowFromAllGroups(win);
	};
	this.requestMove = function (request) {
		DockingCalculator.requestMove(request);
	};
	this.getDiagnostics = function () {
		return DockingCalculator.getDiagnostics();
	};
	this.setBufferSize = function (bufferSize) {
		DockingCalculator.setBufferSize(bufferSize);
	};

	this.addMonitor = function (monitor) {
		monitor = new __WEBPACK_IMPORTED_MODULE_1__mockMonitor__["a" /* default */](monitor);
		DockingCalculator.addMonitor(monitor);
	};

	this.removeMonitor = function (monitor) {
		DockingCalculator.removeMonitor(monitor);
	};

	this.getMonitors = function () {
		return DockingCalculator.getMonitors();
	};

	this.getMonitor = function (name) {
		return DockingCalculator.getMonitor(name);
	};
	this.getGroups = function () {
		return DockingCalculator.getGroups();
	};
	this.getGroup = function (name) {
		return DockingCalculator.getGroup(name);
	};
	this.removeGroup = function (name) {
		return DockingCalculator.removeGroup(name);
	};
	this.constituteGroups = function () {
		return DockingCalculator.constituteGroups();
	};
	this.groupWindows = function (params) {
		DockingCalculator.groupWindows(params);
	};
	this.addWindowToGroup = function (params, cb) {
		DockingCalculator.addWindowToGroup(params);
	};
	this.getGroupNames = function () {
		return DockingCalculator.getGroupNames();
	};
	this.setGroupMode = function (groupMode) {
		DockingCalculator.setGroupMode(groupMode);
	};
	this.getWindow = function (name) {
		return DockingCalculator.getWindow(name);
	};
	this.getWindows = function () {
		return DockingCalculator.getWindows();
	};
	this.getWindowNames = function () {
		var winList = DockingCalculator.getWindows();
		var names = [];
		for (var windowName in winList) {
			names.push(windowName);
		}
		return names;
	};
	this.windowIsOnExteriorEdgeOfGroup = function (win, group) {
		return DockingCalculator.windowIsOnExteriorEdgeOfGroup(win, group);
	};
	this.scaleProportionately = function (num, pct) {
		return DockingCalculator.scaleProportionately(num, pct);
	};
	this.getPercentChange = function (num1, num2) {
		return DockingCalculator.getPercentChange(num1, num2);
	};

	this.setBoundingBoxes = function (req) {
		return DockingCalculator.setBoundingBoxes(req);
	};

	this.buildSnapRelationships = function (win) {
		DockingCalculator.buildSnapRelationships(win);
	};
	this.setMovingGroup = function (grp) {
		DockingCalculator.movingGroup = grp;
	};
	this.setMovingWindow = function (win) {
		DockingCalculator.setMovingWindow(win);
	};
	this.getImmobileGroup = function (windowName) {
		return DockingCalculator.getImmobileGroup(windowName);
	};
	this.getMovableGroup = function (windowName) {
		return DockingCalculator.getMovableGroup(windowName);
	};
	DockingCalculator.setGlobalMinimums(CONSTANTS);
	return this;
}
DockingMath.prototype = DockingCalculator;
module.exports = new DockingMath();

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\tests\\mocks\\mockDockingService.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\tests\\mocks\\mockDockingService.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(2)(module), __webpack_require__(1)))

/***/ }),
/* 100 */,
/* 101 */,
/* 102 */,
/* 103 */,
/* 104 */,
/* 105 */,
/* 106 */,
/* 107 */,
/* 108 */,
/* 109 */,
/* 110 */,
/* 111 */,
/* 112 */,
/* 113 */,
/* 114 */,
/* 115 */,
/* 116 */,
/* 117 */,
/* 118 */,
/* 119 */,
/* 120 */,
/* 121 */,
/* 122 */,
/* 123 */,
/* 124 */,
/* 125 */,
/* 126 */,
/* 127 */,
/* 128 */,
/* 129 */,
/* 130 */,
/* 131 */,
/* 132 */,
/* 133 */,
/* 134 */,
/* 135 */,
/* 136 */,
/* 137 */,
/* 138 */,
/* 139 */,
/* 140 */,
/* 141 */,
/* 142 */,
/* 143 */,
/* 144 */,
/* 145 */,
/* 146 */,
/* 147 */,
/* 148 */,
/* 149 */,
/* 150 */,
/* 151 */,
/* 152 */,
/* 153 */,
/* 154 */,
/* 155 */,
/* 156 */,
/* 157 */,
/* 158 */,
/* 159 */,
/* 160 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, module) {class MockMonitor {
	constructor(bounds) {
		this.name = bounds.name;
		this.left = bounds.left;
		this.top = bounds.top;
		this.right = bounds.right;
		this.bottom = bounds.bottom;
		this._monitor = {
			availableRect: bounds,
			unclaimedRect: bounds
		};
	}
}
/* harmony export (immutable) */ __webpack_exports__["a"] = MockMonitor;


 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\tests\\mocks\\mockMonitor.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\tests\\mocks\\mockMonitor.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 161 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {// passthrough to openfin. In the future we can make this the passthrough to any container.

const fin = {
	desktop: {
		Window: {},
		Application: {},
		Notification: {},
		System: {
			getMousePosition: cb => cb({})
		}
	}
};
class SystemWindow {
	constructor(params, cb) {
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
	constructor(params, cb) {
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
		fin.desktop.System.getMousePosition(mousePosition => {
			if (mousePosition.left || mousePosition.left === 0) mousePosition.x = mousePosition.left;
			if (mousePosition.top || mousePosition.top === 0) mousePosition.y = mousePosition.top;
			cb(null, mousePosition);
		}, err => {
			cb(err, null);
		});
	}

	static getMonitorInfo(cb) {
		fin.desktop.System.getMonitorInfo(info => {
			cb(info);
		});
	}

	// static get makes this behave like a static variable. so calling system.ready is eqivalent to fin.desktop.main.
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
		if (FSBL && FSBL.addEventListener) {
			return FSBL.addEventListener("onready", cb);
		}
		return window.addEventListener("FSBLready", cb);
	}

	// This is not overriding or pointing to Openfin. This is the pattern used to close applications.
	static closeApplication(app, cb = Function.prototype) {
		const promiseResolver = resolve => {
			let t;
			let timeoutCleared = false;

			// Need to terminate after closing because otherwise applications sit around in OpenFin with isRunning: false.
			let terminateAndResolve = () => {
				if (timeoutCleared) return;
				timeoutCleared = true;
				console.log("terminating ", app.uuid);
				clearTimeout(t);
				app.terminate(() => {
					cb();
					resolve();
				}, () => {
					app.terminate();
				});
			};

			// Sometimes app.close() never calls back (only happens with logger). So after 2 seconds terminate.
			t = setTimeout(terminateAndResolve, 2000);

			console.log("closing ", app.uuid);
			// Try to close normally
			app.close(false, terminateAndResolve, () => {
				if (timeoutCleared) return;
				clearTimeout(t);
				// If closing fails, force close
				console.log("force closing ", app.uuid);
				app.close(true, terminateAndResolve, terminateAndResolve);
			});
		};
		return new Promise(promiseResolver);
	}

}

module.exports = System;

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\tests\\mocks\\mockSystem.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\window\\Docking\\tests\\mocks\\mockSystem.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ }),
/* 162 */,
/* 163 */,
/* 164 */,
/* 165 */,
/* 166 */,
/* 167 */,
/* 168 */,
/* 169 */,
/* 170 */,
/* 171 */,
/* 172 */,
/* 173 */,
/* 174 */,
/* 175 */,
/* 176 */,
/* 177 */,
/* 178 */,
/* 179 */,
/* 180 */,
/* 181 */,
/* 182 */,
/* 183 */,
/* 184 */,
/* 185 */,
/* 186 */,
/* 187 */,
/* 188 */,
/* 189 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(99);


/***/ })
/******/ ]);
//# sourceMappingURL=mockDockingService.js.map