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
/******/ 	return __webpack_require__(__webpack_require__.s = 178);
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
/* 32 */
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
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const baseClient_1 = __webpack_require__(7);
const StoreModel_1 = __webpack_require__(42);
/** I'm not sure why we previously deferred requiring StoreModel, but we did.
  * I've tried to stay as true to the original implementation as possible. -- Daniel 12/19/18 */
let _StoreModel;
/** The global `window` object. We cast it to a specific interface here to be
 * explicit about what Finsemble-related properties it may have. */
const Globals = window;
var self;
var localStore = {};
function getGlobalStore(params, cb) {
    function returnStore(err, response) {
        if (err) {
            return cb(err);
        }
        return cb(err, new _StoreModel(response.data, self.routerClient));
    }
    return self.routerClient.query("storeService.getStore", params, returnStore);
}
function removeGlobalStore(params, cb) {
    self.routerClient.query("storeService.removeStore", params, function (err, response) {
        if (err) {
            return cb(err, false);
        }
        return cb(err, response.data);
    });
}
/**
 *
 * @introduction
 * <h2>Distributed Store Client</h2>
 * The Distributed Store Client handles creating, retrieving, and destroying stores. Stores are used to save and retrieve data either locally or globally.
 * This data is not persisted. You can add listeners at multiple levels (store or field), and get the updated data as it's updated in the store.
 * Fields are stored within the store as key/value pair.
 *
 * For more information, see the [Distributed Store tutorial](tutorial-DistributedStore.html).

 * @hideconstructor
 * @constructor
 */
class DistributedStoreClient extends baseClient_1._BaseClient {
    constructor(params) {
        super(params);
        /**
         * @private
         */
        this.load = function (cb) {
            cb();
        };
        self = this;
        this.ls = localStore;
    }
    /**
     * Get a store. If no store is set then we'll get the global Finsemble store. If global is not set we'll check local first then we'll check global.
     * @param {Object} params - Params object
     * @param {String} params.store -  The namespace of the value
     * @param {boolean} params.global - If true, indicates the store is global.
     * @param {function} cb -  Will return the value if found.
     * @returns {StoreModel} - returns the store
     * @example
     * DistributedStoreClient.getStore({store:'store1'},function(storeObject){});
     */
    getStore(params, cb) {
        if (params.global) {
            return getGlobalStore(params, cb);
        }
        if (localStore[params.store]) {
            return cb(null, localStore[params.store]);
        }
        return getGlobalStore(params, cb);
    }
    ;
    /**
     *Creates a store.
     * @param params Params object
     * @param {string} params.store The namespace of to use
     * @param {any} [params.values] -  Starting values for the store
     * @param {boolean} params.global If true, indicates the store is global.
     * @param {boolean} [params.persist] - Should this store persists? THe store must be global to use this flag.
     * @param {function} cb -  Will return the store on success.
     * @returns {function} - Callback will receive the store
     * @example
     * DistributedStoreClient.createStore({store:"store1",global:false,values:{}},function(storeObject){});
     */
    createStore(params, cb = Function.prototype) {
        const promiseResolver = (resolve, reject) => {
            if (params.global) {
                return this.routerClient.query("storeService.createStore", params, function (err, response) {
                    if (err) {
                        reject(err);
                        return cb(err);
                    }
                    const data = new _StoreModel(response.data, self.routerClient);
                    resolve({ err, data });
                    return cb(err, data);
                });
            }
            if (localStore[params.store]) {
                resolve({ err: null, data: localStore[params.store] });
                return cb(null, localStore[params.store]);
            }
            var ls = new _StoreModel(params, self.routerClient);
            localStore[ls.name] = ls;
            resolve({ err: null, data: ls });
            return cb(null, ls);
        };
        return new Promise(promiseResolver);
    }
    ;
    /**
     * Remove a store . If global is not set and a local store isn't found we'll try to remove the global store
     * @param {Object} params - Params object
     * @param {String} params.store -  The namespace of to use
     * @param {boolean} [params.global] - Is this a global store?
     * @param {function} cb
     * @example
     * DistributedStoreClient.removeStore({store:"store1",global:true},function(){});
     */
    removeStore(params, cb) {
        if (params.global) {
            return removeGlobalStore(params, cb);
        }
        if (localStore[params.store]) {
            delete localStore[params.store];
            return cb(null, true);
        }
        removeGlobalStore(params, cb); // If global flag is not set but we don't find it local, try global////Should we have this?
    }
    ;
}
;
var storeClient = new DistributedStoreClient({
    startupDependencies: {
        services: ["dataStoreService"]
    },
    onReady: function (cb) {
        _StoreModel = StoreModel_1.default;
        storeClient.load(cb);
    },
    name: "distributedStoreClient"
});
Globals.distributedStoreClient = storeClient;
exports.default = storeClient;


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const routerClientInstance_1 = __webpack_require__(5);
const logger_1 = __webpack_require__(0);
const distributedStoreClient_1 = __webpack_require__(33);
const storageClient_1 = __webpack_require__(21);
const util = __webpack_require__(8);
const WindowEventManager_1 = __webpack_require__(47);
const constants = __webpack_require__(11);
const FinsembleEvent_1 = __webpack_require__(46);
const system_1 = __webpack_require__(3);
/** This import syntax helps the compiler infer the types. */
const clone = __webpack_require__(48);
distributedStoreClient_1.default.initialize();
storageClient_1.default.initialize();
const BOUNDS_SET = "bounds-set";
const BOUNDS_CHANGING = "bounds-change-request";
const BOUNDS_CHANGED = "bounds-changed";
if (!window._FSBLCache)
    window._FSBLCache = {
        storeClientReady: false,
        windowStore: null,
        windows: {},
        gettingWindow: [],
        windowAttempts: {}
    };
function retrieveManifestPromise() {
    return new Promise((resolve, reject) => {
        system_1.System.Application.getCurrent().getManifest(resolve, reject);
    });
}
class FinsembleWindow {
    constructor(params) {
        this.eventlistenerHandlerMap = {};
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Handlers to generate wrapper events from incoming transmits
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        this.handleWrapStateChange = (err, response) => {
            let state = response.data.state;
            if (state !== this.wrapState) {
                this.wrapState = state;
                // 5/1/19: JoeC. Eventmanager wasn't throwing ready event, so all ready listeners would never fire
                if (this.wrapState === "ready") {
                    this.eventManager.trigger('ready');
                }
                this.eventManager.trigger("wrap-state-changed", {
                    state
                });
            }
        };
        this.types = {};
        //todo settle on a proper name for this property.
        this.wrapState = "initializing";
        this.componentState = {};
        this.windowState = FinsembleWindow.WINDOWSTATE.NORMAL;
        this.type = null;
        this.windowType = null;
        this.bounds = {};
        this.name;
        this.guid = Date.now() + "_" + Math.random();
        this.addListener = this.addEventListener;
        this.removeListener = this.removeEventListener;
        this.WINDOWSTATE = constants.WINDOWSTATE;
        this.windowOptions = {};
        //because we were doing this[i]=params[i] in the constructor jscrambler was creating a reference to "this" above _super_, causing everything to break and it made me cry.
        this.doConstruction(params);
        this.eventManager = new WindowEventManager_1.WindowEventManager({ name: this.name });
        this.TITLE_CHANGED_CHANNEL = "Finsemble." + this.name + ".titleChanged";
        this.componentKey = util.camelCase("activeWorkspace", this.name, this.name);
        this.windowKey = util.camelCase("activeWorkspace", this.name);
        FinsembleWindow.bindFunctions(this);
        this.setupListeners(this.name);
        this.listenForEvents();
    }
    //allows backwards compatibility.
    standardizeEventName(event) {
        switch (event) {
            //all of these should be deprecated in 3.5ish.
            case "bounds-set":
            case "stoppedMoving":
                return "bounds-change-end";
            case "startedMoving":
                return "bounds-change-start";
            case "bringToFront":
                return "broughtToFront";
            case "setParent":
                return "parent-set";
            case "clearParent":
                return "parent-unset";
        }
        return event;
    }
    _eventHandled(interceptor, guid, canceled = false) {
        logger_1.default.system.debug("FinsembleWindow._eventHandled public", interceptor.event, this.identifier.windowName, guid, canceled);
        if (interceptor.delayable)
            routerClientInstance_1.default.publish(constants.EVENT_INTERRUPT_CHANNEL + "." + guid, { canceled: canceled });
    }
    addEventListener(eventName, handler) {
        logger_1.default.system.info("EVENT TAG. Event listener added", eventName, "on ", this.name);
        eventName = this.standardizeEventName(eventName);
        // We send this guid so that Window service can keep track of individual listeners for event interruption.
        let guid = Date.now() + "_" + Math.random();
        this.queryWindowService("addEventListener", { eventName: eventName, guid: guid });
        this.eventManager.listenForRemoteEvent(eventName, handler);
        let delayable = constants.INTERRUPTIBLE_EVENTS.includes(eventName);
        let cancelable = constants.INTERRUPTIBLE_EVENTS.includes(eventName);
        let interceptor = new FinsembleEvent_1.FinsembleEvent({
            source: this,
            event: eventName,
            delayable: delayable,
            cancelable: cancelable
        });
        var internalHandler = (data) => {
            logger_1.default.system.info("EVENT TAG. Internal event handler", eventName, "on ", this.name);
            // TODO: need to create event list with properties:
            interceptor.setData(data);
            handler(interceptor); // this is where a handler can delay the event
            if (delayable && interceptor.delayed) { // if delayed, wait for done
                routerClientInstance_1.default.publish(constants.EVENT_INTERRUPT_CHANNEL + "." + guid, { delayed: true });
                interceptor.addListener("done", (response) => {
                    this._eventHandled(interceptor, guid, response.canceled);
                });
            }
            else { // if not delayed, it is done.
                this._eventHandled(interceptor, guid);
            }
        };
        //We want the final handler that's invoked is
        this.eventManager.addListener(eventName, internalHandler);
        if (!this.eventlistenerHandlerMap[eventName]) {
            this.eventlistenerHandlerMap[eventName] = [];
        }
        this.eventlistenerHandlerMap[eventName].push({
            handler: handler,
            internalHandler: internalHandler,
            interceptor: interceptor,
            guid: guid
        });
    }
    removeEventListener(eventName, handler) {
        eventName = this.standardizeEventName(eventName);
        const promiseResolver = async (resolve) => {
            if (!this.eventlistenerHandlerMap[eventName]) { // trying to remove non-existent handler.
                logger_1.default.system.debug("trying to remove non-existent handler", eventName);
                return resolve();
            }
            for (var i = this.eventlistenerHandlerMap[eventName].length - 1; i >= 0; i--) {
                let handlerStoredData = this.eventlistenerHandlerMap[eventName][i];
                if (handlerStoredData.handler === handler) {
                    this.eventManager.removeListener(eventName, handlerStoredData.internalHandler);
                    handlerStoredData.interceptor.removeAllListeners();
                    routerClientInstance_1.default.publish(constants.EVENT_INTERRUPT_CHANNEL + "." + handlerStoredData.guid, { delayed: false, canceled: false });
                    await this.queryWindowService("removeEventListener", { eventName: eventName, guid: handlerStoredData.guid });
                    this.eventlistenerHandlerMap[eventName].splice(i, 1);
                    resolve();
                }
            }
            resolve();
        };
        return new Promise(promiseResolver);
    }
    listenForEvents() {
        this.wrapStateChangeSubscription = routerClientInstance_1.default.subscribe("Finsemble.Component.State." + this.name, this.handleWrapStateChange);
    }
    windowServiceChannelName(channelTopic) { let name = this.name || this.windowName; return `WindowService-Request-${channelTopic}`; }
    eventChannelName(channelTopic) { let name = this.name || this.windowName; return `WindowService-Event-${name}-${channelTopic}`; }
    listenForBoundsSet() {
        this.eventManager.listenForRemoteEvents(["bounds-change-start", "bounds-changing", "bounds-change-end"]);
    }
    animate(params = {}, callback = Function.prototype) {
        this.queryWindowService("animate", params, callback);
    }
    getWindowStore(cb) {
        if (window._FSBLCache.windowStore) {
            return cb(window._FSBLCache.windowStore);
        }
        distributedStoreClient_1.default.createStore({ store: "Finsemble-Windows", global: true }, (err, store) => {
            window._FSBLCache.windowStore = store;
            cb(store);
        });
    }
    doConstruction(params) {
        //TODO this is the same as wrap (eventually this should spawn)
        if (!params.setWindowType && !params.windowType) { //Default WindowType
            params.windowType = "OpenFinWindow";
        }
        if (params.windowType) { //We need to make a specific kind of Window
            params.setWindowType = params.windowType;
            delete params.windowType; //Prevent infinite loop
            let BW = FinsembleWindow; //have to do this because we're mutating the class using static functions and all kinds of bad stuff. This tells the typescript compiler that the FinsembleWindow here is of type any -- basically don't worry about its type.
            var childClassObject = new BW(params);
            //childClassObject.windowType = windowType;
            return childClassObject;
        } //We are a specific kind of window
        if (params) {
            for (var i in params) {
                this[i] = params[i];
            }
        }
        if (!this.name)
            this.name = params.windowName;
        this.windowType = this.setWindowType;
    }
    static registerType(name, type) {
        let BW = FinsembleWindow; //have to do this because we're mutating the class using static functions and all kinds of bad stuff. This tells the typescript compiler that the FinsembleWindow here is of type any -- basically don't worry about its type.
        if (!BW.types) {
            BW.types = {};
        }
        BW.types[name] = type;
    }
    /**
     * This is used to bind all functions only in FinsembleWindow and not in the child wrappers to the wrappers. Without this binding, the value of "this" in the functions is wrong.
     * @param {} obj
     */
    static bindFunctions(obj) {
        obj.setParent = obj.setParent.bind(obj);
        obj.getParent = obj.getParent.bind(obj);
        obj.eventChannelName = obj.eventChannelName.bind(obj);
        obj.windowServiceChannelName = obj.windowServiceChannelName.bind(obj);
        obj.setupListeners = obj.setupListeners.bind(obj);
        obj.onTitleChanged = obj.onTitleChanged.bind(obj);
        obj.handleWrapRemoveRequest = obj.handleWrapRemoveRequest.bind(obj);
        obj.listenForBoundsSet = obj.listenForBoundsSet.bind(obj);
        obj._eventHandled = obj._eventHandled.bind(obj);
    }
    // set up this window's listeners
    setupListeners(name) {
        logger_1.default.system.debug("FinsembleWindow parent change notification setup", name);
        this.TITLE_CHANGED_SUBSCRIPTION = routerClientInstance_1.default.subscribe(this.TITLE_CHANGED_CHANNEL, this.onTitleChanged);
    }
    onTitleChanged(err, response) {
        if (!response || !response.data || typeof response.data !== "string")
            return;
        //this.windowOptions.title = response.data;
        this.eventManager.trigger("title-changed", {
            title: response.data
        });
    }
    static getInstance(params, cb = Function.prototype) {
        let myName = system_1.System.Window.getCurrent().name;
        if (params && params.windowName) {
            params.name = params.windowName;
        }
        params = clone(params); // this function modifies params so clone to be safe
        if (!params || !params.name)
            return cb("name is required");
        params.windowName = params.name;
        async function promiseResolver(resolve, reject) {
            //Return early if we already have the wrap cached.
            if (window._FSBLCache.windows[params.name]) {
                logger_1.default.system.debug("WRAP LIFECYCLE:", params.name, "Window found in the cache, returning without going to the Launcher");
                let wrap = window._FSBLCache.windows[params.name];
                //@exit
                resolve({ wrap });
                return cb(null, wrap);
            }
            //If we already have all of the information, just call createWrap.
            if (params.uuid && params.name) {
                if (!params.windowIdentifier) {
                    params.windowIdentifier = {
                        uuid: params.uuid,
                        name: params.name,
                        windowName: params.name,
                        windowType: params.windowType
                    };
                }
                if (params.waitForReady !== false) {
                    try {
                        await FinsembleWindow._windowReady(params.windowName); // wait to ensure the window is fully ready in the window service
                    }
                    catch (err) {
                        reject(err);
                        return cb(err, null);
                    }
                }
                logger_1.default.system.debug("WRAP LIFECYCLE:", params.name, "All information for wrap passed in, creating wrap locally");
                //Multiple requests for the same window could've come in at once. Right before we create this wrap, we should check that it hasn't been cached while we were waiting for _windowReady to resolve.
                if (window._FSBLCache.windows[params.name]) {
                    logger_1.default.system.debug("WRAP LIFECYCLE:", params.name, "Window found in the cache, returning without going to the Launcher");
                    let wrap = window._FSBLCache.windows[params.name];
                    //@exit
                    resolve({ wrap });
                    return cb(null, wrap);
                }
                let { wrap } = await FinsembleWindow._createWrap(params);
                //@exit
                resolve({ wrap });
                return cb(null, wrap);
            }
            if (params.waitForReady !== false) {
                try {
                    await FinsembleWindow._windowReady(params.windowName); // wait to ensure the window is fully ready in the window service
                }
                catch (err) {
                    reject(err);
                    return cb(err, null);
                }
            }
            //All we have is a windowName. we send a request to the launcher for more information so that we can construct the proper object. This also the place where
            routerClientInstance_1.default.query("WindowService-Request-getWindowIdentifier", { windowName: params.name, requester: myName }, onWrapInformationReceived);
            async function onWrapInformationReceived(err, response) {
                if (err) {
                    logger_1.default.system.error(err);
                    //@exit
                    reject(err);
                    return cb(err, null);
                }
                if (window._FSBLCache.windows[params.name]) {
                    let wrap = window._FSBLCache.windows[params.name];
                    logger_1.default.system.debug("WRAP LIFECYCLE:", params.name, "Information received from launcher, but wrap exists in cache. Returning cached wrap.");
                    //@exit
                    resolve({ wrap });
                    return cb(null, wrap);
                }
                let { identifier } = response.data;
                if (identifier.windowName) {
                    identifier.name = identifier.windowName;
                }
                logger_1.default.system.debug("WRAP LIFECYCLE:", params.name, "Information received from launcher. Creating wrap.");
                params.retrievedIdentifier = identifier;
                let { wrap } = await FinsembleWindow._createWrap(params);
                if (response.data.descriptor) {
                    wrap.descriptor = response.data.descriptor;
                }
                //@exit
                resolve({ wrap });
                cb(null, wrap);
            }
        }
        return new Promise(promiseResolver);
    }
    /**
     * Creates a Finsemble WindowWrap
     * @param {*} params
     * @param {string} params.name The name of the window
     * @param {*} [params.retrievedIdentifier] Retrieved window identifier
     * @param {*} [params.windowIdentifier] The window identifier
     * @param {boolean} [param.setWindowType] If true, will set the window type
     */
    static _createWrap(params) {
        function promiseResolver(resolve, reject) {
            let identifier = params.retrievedIdentifier || params.windowIdentifier;
            let wrap = null;
            if (typeof window._FSBLCache.windowAttempts[params.name] === "undefined")
                window._FSBLCache.windowAttempts[params.name] = 0;
            //OpenfinApplication is essentially just an openfinWindow in its own process. We can wrap it just like a window.
            if (!params.setWindowType && !identifier.windowType || identifier.windowType === "OpenFinApplication") { //Default WindowType
                identifier.windowType = "OpenFinWindow";
            }
            //Top level keeps important info (e.g., uuid, name, windowType).
            let paramsForWindow = Object.assign({}, identifier);
            //Also pull in anything that was passed into the constructor (e.g., windowDescriptor, etc);
            paramsForWindow = Object.assign(paramsForWindow, params);
            paramsForWindow.setWindowType = paramsForWindow.windowType;
            delete paramsForWindow.windowType; //Prevent infinite loop
            logger_1.default.system.debug("WRAP LIFECYCLE: Placing wrap into the local cache.", identifier.windowName);
            let BW = FinsembleWindow; //have to do this because we're mutating the class using static functions and all kinds of bad stuff. This tells the typescript compiler that the FinsembleWindow here is of type any -- basically don't worry about its type.
            window._FSBLCache.windows[identifier.windowName] = new BW(paramsForWindow);
            wrap = window._FSBLCache.windows[identifier.windowName];
            wrap.windowType = identifier.windowType;
            wrap.identifier = identifier;
            wrap.addEventListener("closed", wrap.handleWrapRemoveRequest);
            wrap.addEventListener("maximized", () => {
                wrap.windowState = FinsembleWindow.WINDOWSTATE.MAXIMIZED;
            });
            wrap.addEventListener("minimized", () => {
                wrap.windowState = FinsembleWindow.WINDOWSTATE.MINIMIZED;
            });
            wrap.addEventListener("restored", () => {
                wrap.windowState = FinsembleWindow.WINDOWSTATE.NORMAL;
            });
            //Subscribe to parent inside the wrap so if getInstance is called after window creation the parent window will be available.
            wrap.parentSubscribeID = routerClientInstance_1.default.subscribe(`Finsemble.parentChange.${identifier.windowName}`, (err, message) => {
                if (err) {
                    logger_1.default.system.error("FinsembleWindow parent change notification error", err);
                    resolve({ wrap });
                }
                else {
                    var parentState = message.data || {};
                    if (parentState.type === "Added") {
                        logger_1.default.system.debug("FinsembleWindow Parent Notification: window.addedToStack listener", parentState);
                        wrap.setParent(parentState.stackedWindowIdentifier, () => { resolve({ wrap }); });
                    }
                    else if (parentState.type === "Exists") {
                        logger_1.default.system.debug("FinsembleWindow Parent Notification: Parent already exists, checking if added to wrap", parentState);
                        wrap.setParentOnWrap(parentState.stackedWindowIdentifier, () => { resolve({ wrap }); });
                    }
                    else if (parentState.type === "Removed") {
                        logger_1.default.system.debug("FinsembleWindow Parent Notification: window.removedFromStack listener", parentState);
                        wrap.clearParent();
                        resolve({ wrap });
                    }
                    else if (parentState.type) { // if defined but unknown type
                        logger_1.default.system.error("FinsembleWindow Parent Notification: unknown type", parentState);
                        resolve({ wrap });
                    }
                    else {
                        resolve({ wrap });
                    }
                }
            });
        }
        return new Promise(promiseResolver);
    }
    static _getRemoveWrapChannel(name) {
        return `${system_1.System.Window.getCurrent().name}.removeWrap.${name}`;
    }
    // this routine handles the close event, but also called without event from FSBL
    async handleWrapRemoveRequest(event) {
        if (event)
            event.wait();
        logger_1.default.system.debug("WRAP Destructor. Removing cached window", this.name, "in ", window.name);
        //wrap is the openfin or stacked window. if the removeListeners function exists, we remove all listeners we added during the lifecycle of that window wrapper.
        if (this.removeListeners) {
            this.removeListeners();
        }
        // do not move this line of code. The order of execution is important.
        this.cleanupRouter();
        //Remove all event listeners.
        for (let eventName in this.eventlistenerHandlerMap) {
            console.log("Event name in for loop", eventName);
            let events = this.eventlistenerHandlerMap[eventName];
            for (let i = 0; i < events.length; i++) {
                logger_1.default.system.log("WRAP Destructor. removeEventListener", eventName, this.name, "in", window.name);
                await this.removeEventListener(eventName, events[i].handler);
                console.log("Event name listener removed", eventName);
            }
        }
        logger_1.default.system.log("WRAP Destructor. removeEventListener DONE");
        console.log("handleWrapRemoveRequest name Done!");
        if (event)
            event.done();
        this.eventManager.cleanup();
        if (this.name !== window.name) {
            delete window._FSBLCache.windows[this.name];
            delete window._FSBLCache.windowAttempts[this.name];
        }
    }
    cleanupRouter() {
        const REMOVE_WRAP_CHANNEL = FinsembleWindow._getRemoveWrapChannel(this.name);
        routerClientInstance_1.default.removeResponder(REMOVE_WRAP_CHANNEL);
        if (this.TITLE_CHANGED_SUBSCRIPTION) {
            routerClientInstance_1.default.unsubscribe(this.TITLE_CHANGED_SUBSCRIPTION);
        }
        routerClientInstance_1.default.unsubscribe(this.parentSubscribeID);
        routerClientInstance_1.default.unsubscribe(this.wrapStateChangeSubscription);
    }
    onReady(callback) {
        if (this.wrapState === "ready") {
            return callback();
        }
        this.eventManager.on("ready", callback);
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Common template for window-function requests to window service -- see public functions
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * @param {string} methodName method name (e.g. "minimize", "maximize")
     * @param {object} params
     * @param {function=} callback
     * @memberof FinsembleWindow
     * @private
     */
    queryWindowService(methodName, params, callback = Function.prototype) {
        const promiseResolver = async (resolve) => {
            if (typeof params === "function") {
                callback = params;
                params = {};
            }
            params = params || {};
            params.windowIdentifier = this.identifier; // add this window's identifier
            // if Logger debug is enable, then add call stack to query parameters for debugging -- shows where public window requests originated
            if (logger_1.default.setting().system.Debug) {
                params.callstack = logger_1.default.callStack(); // add callstack to query for debugging -- shows where public window requests originated
            }
            logger_1.default.system.debug("FinsembleWindow.queryWindowService", this.windowServiceChannelName(methodName), params);
            var responseData = null;
            routerClientInstance_1.default.query(this.windowServiceChannelName(methodName), params, (err, queryResponseMessage) => {
                if (err) {
                    logger_1.default.system.warn(`WindowService.${methodName}: failed`, err);
                    console.debug(`WindowService.${methodName}: failed`, err);
                }
                else {
                    responseData = queryResponseMessage.data;
                    logger_1.default.system.debug(`${this.windowServiceChannelName(methodName)} successful`, responseData);
                    console.debug(`${this.windowServiceChannelName(methodName)} successful`, responseData);
                }
                resolve();
                callback(err, responseData);
            });
        };
        return new Promise(promiseResolver);
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Core Window Functions: can be invoked by any service or component.  Most are sent to the WindowService to be executed.
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Core Public Window Functions: can be invoked by any service or component.  These are sent to the WindowService to be executed.
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    minimize(params, callback) {
        this.queryWindowService("minimize", params, callback);
    }
    maximize(params, callback) {
        this.queryWindowService("maximize", params, callback);
    }
    restore(params, callback) {
        this.queryWindowService("restore", params, callback);
    }
    blur(params = {}, callback = Function.prototype) {
        this.queryWindowService("blur", params, callback);
    }
    focus(params = {}, callback = Function.prototype) {
        this.queryWindowService("focus", params, callback);
    }
    bringToFront(params, callback) {
        this.queryWindowService("bringToFront", params, callback);
    }
    isShowing(params, callback) {
        this.queryWindowService("isShowing", params, callback);
    }
    setBounds(params, callback) {
        if (typeof params !== "function" && !params.bounds) {
            let oldParams = params;
            params = {};
            params.bounds = oldParams;
        }
        this.queryWindowService("setBounds", params, callback);
    }
    getBounds(params, callback = Function.prototype) {
        const promiseResolver = (resolve) => {
            this.queryWindowService("getBounds", params, (err, bounds) => {
                resolve({ err, data: bounds });
                callback(err, bounds);
            });
        };
        return new Promise(promiseResolver);
    }
    updateOptions(params, callback) {
        this.queryWindowService("updateOptions", params, callback);
    }
    hide(params, callback) {
        this.queryWindowService("hide", params, callback);
    }
    show(params, callback) {
        this.queryWindowService("show", params, callback);
    }
    showAt(params, callback) {
        this.queryWindowService("showAt", params, callback);
    }
    close(params = {}, callback = Function.prototype) {
        logger_1.default.system.debug("WRAP CLOSE. Public close initiated for", this.name, params);
        this.queryWindowService("close", params, () => {
            logger_1.default.system.debug("WRAP CLOSE. Public close initiated for", this.name);
            callback();
        });
    }
    /**
     *Register a window with docking. Use this if you don't want to use the full initialization function
     *
     * @param {Object} params - can be anything that is passed to docking for window registration. @todo This should be removed soon
     * @param {Function} cb
     * @memberof FSBLWindow
     */
    registerWithDocking(params, cb) {
        routerClientInstance_1.default.query("DockingService.registerWindow", {
            type: this.type,
            windowType: this.windowType,
            windowMsg: params,
            name: this.windowName
        }, cb);
    }
    /**
     *Unregister a window with docking
     *
     * @memberof FSBLWindow
     */
    unRegisterWithDocking() {
        routerClientInstance_1.default.transmit("DockingService.deregisterWindow", { name: this.windowName });
    }
    /**
     *This is if we want to handle the full register/ready state inside of the window
     register with docking
     send the message to launcher saying that component is ready
     *
     * @memberof FSBLWindow
     */
    initializeWindow(params, cb) {
        this.registerWithDocking(params, () => {
            routerClientInstance_1.default.publish("Finsemble." + this.windowName + ".componentReady", {
                name: this.windowName
            });
        });
    }
    wrapReady() {
        routerClientInstance_1.default.publish("Finsemble." + this.windowName + ".wrapReady", { name: this.windowName, state: "open" });
    }
    setOpacity(params, callback) {
        this.queryWindowService("setOpacity", params, callback);
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Other BaseClass Function: These are common functions shared across derived classes
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Invoked to indicate an operation (e.g. dragging out of tab region) has started. This signals the Docking service to start tracking the mouse location and invoking tiling behavior as needed. Typically inherited (base function only).
     * @param {object} params for future use
     *
     * @example
     *	// dragging tab example using tracking and group
     * 	FinsembleWindow.startTabTileMonitoring();
     *	// if dragging tab is in a group, then remove it given tracking results will decide what to do with the window
     * 	FinsembleWindow.Group.getGroupID(this.identifier, function (err, tileGroupId) {
     * 		if (!err) { // if no error then must be in a tile group
     *			self.Group.removeWindow(this.identifier);
     *		}
     *	});
     */
    startTabTileMonitoring(params) {
        logger_1.default.system.debug("FinsembleWindow.startTabTileMonitoring", params);
        routerClientInstance_1.default.transmit("TabTile.startTabTile", { params });
    }
    /**
     * Invoked by client originating a dragStart that it has has ended. Typically inherited (base function only).
     * @param {object} params for future use
         * @param {function=} callback option callback that support overriding default behavior
     *
     * 	FinsembleWindow.stopTabTileMonitoring(params, function(err, results, defaultTabTileAction) {
     * 		// . . . custom code goes here . . .
     *		defaultTabTileAction(results); // now take default action or call your own function instead
     * 	});
     *
     */
    stopTabTileMonitoring(params, callback) {
        logger_1.default.system.debug("FinsembleWindow.stopTabTileMonitoring", params);
        routerClientInstance_1.default.query("TabTile.stopTabTile", { params }, function (err, queryResponseMessage) {
            if (err) {
                logger_1.default.system.warn("TabTile.stopTabTile: query failed", err);
            }
            else {
                logger_1.default.system.debug("TabTile.stopTabTile results", queryResponseMessage.data);
            }
            var stopTabTileResults = queryResponseMessage.data;
            if (callback) {
                callback(err, stopTabTileResults, this.defaultStopTrackingAction);
            }
            else {
                this.defaultTabTileAction(stopTabTileResults);
            }
        });
    }
    /**
     * Defines default TabTile action for stopTabTileMonitoring.  May be overridden by client -- see example in stopTabTileMonitoring. Typically inherited (base function only).
     *
     * @param {any} stopTabTileResults
     * @memberof FinsembleWindow
     *
     * @private
     */
    defaultTabTileAction(stopTabTileResults) {
        let self = this;
        logger_1.default.system.debug("FinsembleWindow.defaultTabTileAction", stopTabTileResults);
        switch (stopTabTileResults.stoppedLocation) {
            case "OutsideWindow":
                // move window to drop location (since for now assuming only single-tabbed windows)
                break;
            case "TabSection":
                // WindowStack.addWindowToStack(callback) // for when we get to tabbing
                break;
            case "InsideWindow":
                if (stopTabTileResults.tileGroupId) { // if dropped in an existing tile group (which might be the same it was dragging from)
                    self.Group.addWindow(this.identifier, stopTabTileResults.tileGroupId, stopTabTileResults.dropCoordinates);
                }
                else { // if dropped in a separate window outside a tile group
                    self.Group.createGroup(function (newGroupId) {
                        // add dragging window to new tile group, but specify the dropped on window as the starting window in the tile group
                        self.Group.addWindow(this.identifier, newGroupId, stopTabTileResults.dropCoordinates, { startingWindowIdentifier: stopTabTileResults.droppedOnWindowIdentifier });
                    });
                }
                break;
            default:
                logger_1.default.system.error("stopTracking returned an unknown stoppedLocation result", stopTabTileResults);
        }
    }
    mergeBounds(bounds) {
        bounds.right = bounds.left + bounds.width;
        let newBounds = { left: bounds.left, right: bounds.right, width: bounds.width, top: bounds.top, bottom: bounds.top + bounds.height, height: bounds.height };
        let defaultBounds = { defaultLeft: bounds.left, defaultWidth: bounds.width, defaultTop: bounds.top, defaultHeight: bounds.height };
        Object.assign(this.windowOptions, newBounds);
        Object.assign(this.windowOptions, defaultBounds);
        this.windowOptions.bounds = newBounds;
    }
    startMove(params) {
        logger_1.default.system.debug("FinsembleWindow.startMove", params);
        params = params || {};
        params.windowIdentifier = this.identifier; // add this window's identifier
        routerClientInstance_1.default.transmit(this.eventChannelName("startedMoving"), {});
    }
    stopMove(params) {
        logger_1.default.system.debug("FinsembleWindow.stopMove", params);
        params = params || {};
        params.windowIdentifier = this.identifier; // add this window's identifier
        routerClientInstance_1.default.transmit(this.eventChannelName("stoppedMoving"), {});
    }
    /**
     * Get Monitor for this window
     *
     * @param {function} cb Callback
     */
    getMonitor(cb) {
        routerClientInstance_1.default.query("DockingService.getMonitorForWindow", { windowIdentifier: this.identifier }, (err, message) => message ? cb(message.data) : cb());
    }
    /**
     * Given params, will return the component state. Either the params to search for, or the entire state.
     *
     * @param {object} params
     * @param {string} params.field field
     *  @param {array} params.fields fields
     * @param {function} cb Callback
     */
    getComponentState(params, cb) {
        this.queryWindowService("getComponentState", params, cb);
    }
    /**
     * Given params, will return the window state. Either the params to search for, or the entire state.
     *
     * @param {object} params
     * @param {string} params.field field
     *  @param {array} params.fields fields
     * @param {function} cb Callback
     */
    getWindowState(params, cb) {
        this.queryWindowService("getWindowState", params, cb);
    }
    /**
     * Given params, will set the component state. Any fields included will be added to the state
     *
     * @param {object} params
     * @param {string} params.field field
     *  @param {array} params.fields fields
     * @param {function} cb Callback
     */
    setComponentState(params, cb) {
        this.queryWindowService("setComponentState", params, cb);
    }
    /**
     * Removes one or more specified attributes from either component or window state in storage
     * for this window.
     *
     * In addition to the name of the window, params should include either a `field`
     * property as a string or a `fields` property as an array of strings.
     *
     * @param {object} params
     * @param {string} [params.field] field
     * @param {array} [params.fields] fields
     * @param {function} cb Callback
     */
    removeComponentState(params, cb = (e, r) => { }) {
        this.queryWindowService("removeComponentState", params, cb);
    }
    /**
     * Given params, will set the window state. Any fields included will be added to the state
     *
     * @param {object} params
     * @param {string} params.field field
     *  @param {array} params.fields fields
     * @param {function} cb Callback
     */
    setWindowState(params, cb) {
        this.queryWindowService("setWindowState", params, cb);
    }
    saveCompleteWindowState(params, cb) {
        this.queryWindowService("saveCompleteWindowState", params, cb);
    }
    /**
     *Cancels startTabTileMonitoring. Example use is a user "escapes" out of a drag operation.
     *
     * @param {object} params for future use
     * @memberof FinsembleWindow
     */
    cancelTabTileMonitoring(params) {
        logger_1.default.system.debug("FinsembleWindow.cancelTabTileMonitoring", params);
        routerClientInstance_1.default.transmit("TabTile.cancelTabTile", { params });
    }
    /**
     * Return the parent window's wrapper (e.g. StackedWindow).
     *
     */
    getParent(cb) {
        if (this.settingParent) {
            FinsembleWindow.getInstance(this.settingParent, (err, stackWrap) => {
                cb(null, stackWrap);
            });
        }
        else if (this.parentWindow) {
            cb(null, this.parentWindow);
        }
        else {
            cb(null, null);
        }
    }
    /**
     * Sets the parent window (e.g. stackedWindow) and emits "setParent" event to window listeners.
     *
     * @param {object} stackedWindowIdentifier identifer of window to set as parent (e.g. stackedWindowIdentifier).
     *
     */
    setParent(stackedWindowIdentifier, cb = Function.prototype) {
        if (this.settingParent)
            return this.getParent(cb); //TODO check if the parent is different
        this.settingParent = stackedWindowIdentifier;
        if (this.parentWindow && (this.parentWindow.name === stackedWindowIdentifier.windowName)) {
            logger_1.default.system.debug("FinsembleWindow.setParent already set", stackedWindowIdentifier);
            this.settingParent = false;
            cb(null, this.parentWindow);
        }
        else {
            this.queryWindowService("setParent", stackedWindowIdentifier, (err, message) => {
                logger_1.default.system.debug("FinsembleWindow.setParent", stackedWindowIdentifier);
                FinsembleWindow.getInstance(stackedWindowIdentifier, (err, wrappedStackedWindow) => {
                    if (!err) {
                        logger_1.default.system.debug("FinsembleWindow.setParent wrap success", stackedWindowIdentifier);
                        this.parentWindow = wrappedStackedWindow;
                        if (!this.parentWindow.windowType.includes("StackedWindow")) {
                            logger_1.default.system.error("FinsembleWindow.setParent error", this.parentWindow.name, stackedWindowIdentifier.windowName);
                        }
                    }
                    else {
                        logger_1.default.system.error("FinsembleWindow.setParent error", err);
                    }
                    this.settingParent = false;
                    this.eventManager.trigger("parent-set", { parentName: this.parentWindow.name });
                    cb(err, wrappedStackedWindow);
                });
            });
        }
    }
    /**
     * Sets the parent window (e.g. stackedWindow) on a window wrap.
     * This is for the case where a window already has a parent but it's wrap doesn't know about it.
     *
     * @param {object} stackedWindowIdentifier identifer of window to set as parent (e.g. stackedWindowIdentifier).
     *
     */
    setParentOnWrap(stackedWindowIdentifier, cb = Function.prototype) {
        if (this.parentWindow && (this.parentWindow.name === stackedWindowIdentifier.windowName)) {
            logger_1.default.system.debug("FinsembleWindow.setParentOnWrap already set", stackedWindowIdentifier);
            cb(null, this.parentWindow);
        }
        else {
            this.queryWindowService("setParent", stackedWindowIdentifier, (err, message) => {
                logger_1.default.system.debug("FinsembleWindow.setParentOnWrap", stackedWindowIdentifier);
                FinsembleWindow.getInstance(stackedWindowIdentifier, (err, wrappedStackedWindow) => {
                    if (!err) {
                        logger_1.default.system.debug("FinsembleWindow.setParentOnWrap success getting wrap", stackedWindowIdentifier);
                        console.debug("FinsembleWindow.setParentOnWrap success getting wrap", this, wrappedStackedWindow);
                        this.parentWindow = wrappedStackedWindow;
                        if (this.parentWindow.windowType.includes("StackedWindow") === false) {
                            logger_1.default.system.error("FinsembleWindow.setParentOnWrap error", this.parentWindow.name, stackedWindowIdentifier.windowName);
                        }
                    }
                    else {
                        logger_1.default.system.error("FinsembleWindow.setParentOnWrap error", err);
                    }
                    cb(err, wrappedStackedWindow);
                });
            });
        }
    }
    /**
     * Clears the parent reference and emits "clearParent" event to window listeners. Used only internally.
     *
     * @private
     *
     */
    clearParent() {
        logger_1.default.system.debug("FinsembleWindow.clearParent", this.parentWindow);
        this.eventManager.trigger("parent-unset", {
            parentName: this.parentWindow.name
        });
        this.parentWindow = null;
    }
    setTitle(title) {
        logger_1.default.system.debug("Title change", title);
        routerClientInstance_1.default.publish(this.TITLE_CHANGED_CHANNEL, title);
    }
    //todo needs to be a windowService query..
    getOptions(cb = Function.prototype) {
        this.queryWindowService("getOptions", {}, cb);
    }
    //CANDIDATES FOR REMOVAL
    //window client adds a callback here. This way, whenever close is called _anywhere_ in the system, it's passed down to the window client and cleanup can happen in the component.
    listenForClose(cb) {
        // let listener = (err, response) => {
        let listener = () => {
            delete window._FSBLCache.windows[this.name];
            delete window._FSBLCache.windowAttempts[this.name];
            //If the window that the wrap belongs to is the one calling close, just call the openfin method. Otherwise, some other window is trying to close it - so we send a message to that window, which will eventually close itself.
            for (let event in this.eventlistenerHandlerMap) {
                for (let i = 0; i < this.eventlistenerHandlerMap[event].length; i++) {
                    this.eventlistenerHandlerMap[event][i].interceptor.removeAllListeners();
                }
            }
            this.eventManager.cleanup();
            routerClientInstance_1.default.removeListener(`${this.identifier.windowName}.close`, listener);
            // cb(response.data);
            cb();
        };
        this.eventManager.listenForRemoteEvent("closed", listener);
    }
    //TO BE REMOVED WHEN TABBING API IS PUT IN PLACe
    /**
     * Handles common housekeeping checks and modifications on params at the beginning of each private window-management function
     *
     * @param {string} methodName method name (e.g. "minimize", "maximize")
     * @param {object} params
     * @memberof StackedWindow
     * @private
     */
    _privateManagementPreface(methodName, params, callback) {
        if (typeof params === "function") {
            logger_1.default.system.error("StackedWindowWrapper.wrapPreface bad params", params);
        }
        params = params || {};
        params.stackedWindowIdentifier = { windowName: this.identifier.windowName, windowType: this.identifier.windowType }; // add this window's identifier
        logger_1.default.system.debug(`StackedWindow.${methodName}  _privateManagementPreface`, params);
        return params;
    }
    /**
     * Returns store for stacked window.  Example usage below.
     *
     * @memberof StackedWindow
     *
     * @example
     * 		// get the state for one stacked window from the store
     * 		getStore().getValue({ field: stackedWindowIdentifier.name, function (err, stackedWindowState) {}
     *			where stackedWindowState is an object with the following properties
     *				{
     *					stackedWindowIdentifier: the stacked window identifier
     *					childWindowIdentifiers: the window identifiers for all children in the stacked window
     *					visibleWindowIdentifier: the window identifier for the currently visible window
     *					bounds: the current window bounds/coordinates for the stacked window (i.e. the current bounds of the visible window)
     *				}
     */
    getStore(callback = Function.prototype) {
        return this.getWindowStore(callback);
    }
    /**
     * Adds window as a child to a stacked window.  Adds to the top of the stack, or if specified to a specific location in the stack;
     *
     * @param {object=} params
         * @param {object} params.stackedWindowIdentifier stacked window to operate on stacked window to operate on
         * @param {object} params.windowIdentifier window to add
         * @param {number=} params.position the location in the stack to push the window.  Location 0 is the bottom of the stack. Defaults to the top of stack.
         * @param {boolean=} params.noSave if true then don't save the store after updating it (will be saved by caller)
     * @param {function=} callback function(err)
     * @memberof StackedWindow
     */
    addWindow(params, callback = Function.prototype) {
        params = this._privateManagementPreface("addWindow", params);
        const promiseResolver = (resolve) => {
            routerClientInstance_1.default.query("StackedWindow.addWindow", params, (err, queryResponseMessage) => {
                logger_1.default.system.debug("StackedWindow.addWindow callback", err, queryResponseMessage);
                callback(err, queryResponseMessage.data);
                resolve({ err, data: queryResponseMessage.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Removes a child window from a stacked window.  If removed window was visible, then the bottom child window (position 0) in stack will be made visible.
     *
         * @param {object} params
    .	 * @param {object} params.stackedWindowIdentifier stacked window to operate on
     * @param {object} params.windowIdentifier window to remove
     * @param {boolean=} params.noDocking if true then do not register removed window with docking (the workspace is unaffected)
     * @param {function=} callback function(err)
     * @memberof StackedWindow
     */
    removeWindow(params, callback = Function.prototype) {
        params = this._privateManagementPreface("removeWindow", params);
        const promiseResolver = (resolve) => {
            routerClientInstance_1.default.query("StackedWindow.removeWindow", params, (err, queryResponseMessage) => {
                logger_1.default.system.debug("StackedWindow.removeWindow callback", err, queryResponseMessage);
                callback(err, queryResponseMessage.data);
                resolve({ err, data: queryResponseMessage.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Removes a window from the stack then closes it.  If removed window was visible, then the bottom child window (position 0) in stack will be made visible.
     *
         * @param {object} params
    .	 * @param {object} params.stackedWindowIdentifier stacked window to operate on
     * @param {object} params.windowIdentifier window to delete
     * @param {function=} callback function(err)
     * @memberof StackedWindow
     */
    deleteWindow(params, callback = Function.prototype) {
        params = this._privateManagementPreface("deleteWindow", params);
        const promiseResolver = (resolve) => {
            routerClientInstance_1.default.query("StackedWindow.deleteWindow", params, (err, queryResponseMessage) => {
                logger_1.default.system.debug("StackedWindow.deleteWindow callback", err, queryResponseMessage);
                callback(err, queryResponseMessage.data);
                resolve({ err, data: queryResponseMessage.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Sets the visible window within the stack.  The previously visible window in stack will be automatically hidden.
     *
         * @param {object} params
    .	 * @param {object} params.stackedWindowIdentifier stacked window to operate on
     * @param {object} params.windowIdentifier
     * @param {function=} callback function(err)
     * @memberof StackedWindow
     */
    setVisibleWindow(params, callback = Function.prototype) {
        params = this._privateManagementPreface("setVisibleWindow", params);
        const promiseResolver = (resolve) => {
            routerClientInstance_1.default.query("StackedWindow.setVisibleWindow", params, (err, queryResponseMessage) => {
                logger_1.default.system.debug("StackedWindow.setVisibleWindow callback", err, queryResponseMessage);
                callback(err, queryResponseMessage.data);
                resolve({ err, data: queryResponseMessage.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Reorders the stack, but odes not affect visibility
     *
         * @param {object} params
    .	 * @param {object} params.stackedWindowIdentifier stacked window to operate on
     * @param {array} params.windowIdentifiers array of windowIdentifiers which provides the new order
     * @param {function=} callback function(err)
     * @memberof StackedWindow
     */
    reorder(params, callback = Function.prototype) {
        params = this._privateManagementPreface("reorder", params);
        const promiseResolver = (resolve) => {
            routerClientInstance_1.default.query("StackedWindow.reorder", params, (err, queryResponseMessage) => {
                logger_1.default.system.debug("StackedWindow.reorder callback", err, queryResponseMessage);
                callback(err, queryResponseMessage.data);
                resolve({ err, data: queryResponseMessage.data });
            });
        };
        return new Promise(promiseResolver);
    }
}
FinsembleWindow.WINDOWSTATE = {
    NORMAL: 0,
    MINIMIZED: 1,
    MAXIMIZED: 2,
    HIDDEN: 3
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// The window wrappers
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Async wrap. Given a name/windowName, it will query the launcher for information required to wrap the window. Then it will return an object that can be operated on. Also this creates a cache of all wrapped windows for performance. Our clients wrap the same window often and this was causing excessive messaging to the store and degrading performance.
 * @param {*} params Need only name in most cases. For service and other cases where the window is not part of what the launcher considers active windows, name and uuid are required
 * @param {boolean} params.waitForReady If true, will async await for Finsemble to return ready before continuing to build the instance to return
 * @param {*} cb
 */
FinsembleWindow.wrap = FinsembleWindow.getInstance;
/**
 * Method for determining whether the window being wrapped is the startup app's main window (the service manager).
 *
 * @static
 * @memberof FinsembleWindow
 */
FinsembleWindow.isStartupApplication = async function (windowName) {
    let isStartupApplication;
    // Here, we get the application 'manifest'. This will only be returned _if the application was created via the manifest_. In other words, this will only work if we're in the startup app.
    const manifest = await retrieveManifestPromise()
        .catch((e) => {
        // If the application executing FinsembleWindow was created via the API getManifest will
        // reject with an error. If that happens, we know we're not in the service manager, so we can just assign it to false and move on.
        isStartupApplication = false;
    });
    // If the window that I'm in is the same window as the startup app, I am the service manager.
    // We cannot wrap the service manager.
    // No need to do these checks if we're in a window that lives in the startup app.
    if (manifest) {
        switch (fin.container) {
            case "Electron":
                isStartupApplication = manifest && manifest.startup_app && manifest.startup_app.name === windowName;
                break;
            default:
                // openfin takes the uuid of the startup app as defined in the manifest and assigns it to the name of the main window for the startup app.
                isStartupApplication = manifest && manifest.startup_app && manifest.startup_app.uuid === windowName;
        }
    }
    return isStartupApplication;
};
FinsembleWindow._windowReady = function (windowName) {
    logger_1.default.system.debug(`windowServiceReady: ${windowName} starting`);
    let subscribeId;
    const COMPONENT_STATE_CHANGE_CHANNEL = "Finsemble.Component.State." + windowName;
    const promiseResolver = async (resolve, reject) => {
        // Subscribe handler for component state. Once new state is retrieved, resolve out of _windowReady
        // This is a closure so it easily has access to the promise resolve method.
        function onComponentStateChanged(err, response) {
            let state = response.data.state;
            logger_1.default.system.debug(`windowServiceReady: ${windowName} state change: ${state}`);
            console.log(`windowServiceReady: ${windowName} state change: ${state}`);
            switch (state) {
                // if ready state or any state beyond
                case "ready":
                case "reloading":
                case "closing":
                    logger_1.default.system.debug(`windowServiceReady: ${windowName} ${state}`);
                    routerClientInstance_1.default.unsubscribe(subscribeId);
                    resolve();
                    break;
            }
        }
        let isStartupApplication = await FinsembleWindow.isStartupApplication(windowName);
        if (isStartupApplication || windowName.toLowerCase().endsWith("service")) {
            reject("Cannot Wrap Service Manager or Services");
        }
        else {
            // wait only for components managed by the window service
            logger_1.default.system.debug(`windowServiceReady: ${windowName} waiting`);
            subscribeId = routerClientInstance_1.default.subscribe(COMPONENT_STATE_CHANGE_CHANNEL, onComponentStateChanged);
        }
    };
    return new Promise(promiseResolver);
};
exports.FinsembleWindow = FinsembleWindow;


/***/ }),
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
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
const baseClient_1 = __webpack_require__(7);
const windowClient_1 = __webpack_require__(43);
const util = __webpack_require__(8);
const validate_1 = __webpack_require__(6); // Finsemble args validator
const system_1 = __webpack_require__(3);
const logger_1 = __webpack_require__(0);
const FinsembleWindow_1 = __webpack_require__(34);
/** The global `window` object. We cast it to a specific interface here to be
 * explicit about what Finsemble-related properties it may have. */
const Globals = window;
/**
 * An object that includes all the potential identifications for a window.
 * For instance, one can try and obtain a reference for a window if some of these values are known.
 *
 * @typedef WindowIdentifier
 * @property {string} [windowName] The name of the physical HTML window, or a reference to a native window that was launched with Assimilation service
 * @property {string} [uuid] Optional uuid of a particular OpenFin application process
 * @property {string} [componentType] The type of component
 * @property {number|string} [monitor] The number of the monitor. Potentially used to disambiguate multiple components with the same name (for searches only)
 */
/**
 * Finsemble windowDescriptor.
 * The windowDescriptor includes the following values.
 *
 * @typedef WindowDescriptor
 * @property {string} [url] url to load (if HTML5 component).
 * @property {string} [native] The name of the native app (if a native component launched by Assimilation service).
 * @property {string} name The name of the window (sometimes randomly assigned).
 * @property {string} componentType The type of component (from components.json).
 */
/**
 *
 * A convenient assembly of native JavaScript window, `OpenFin` window and windowDescriptor.
 *
 * @typedef RawWindowResult
 * @property {WindowDescriptor} windowDescriptor The window descriptor.
 * @property {fin.desktop.Window} finWindow The `OpenFin` window.
 * @property {Window} browserWindow The native JavaScript window.
 *
 */
// A map of related menus that is kept by handleToggle.
var okayToOpenMenu = {};
/**
 *
 * @introduction
 * <h2>Launcher Client</h2>
 * The Launcher Client handles spawning windows. It also maintains the list of components which can be spawned.
 *
 *
 *
 * @hideconstructor
 *
 * @constructor
 */
class LauncherClient extends baseClient_1._BaseClient {
    constructor(params) {
        super(params);
        validate_1.default.args(params, "object=") && params && validate_1.default.args2("params.onReady", params.onReady, "function=");
        this.windowClient = params.clients.windowClient;
    }
    /** @alias LauncherClient# */
    //var self = this;
    //BaseClient.call(this, params);
    /**
     * Get a list of registered components (those that were entered into *components.json*).
     *
     * @param {Function} cb Callback returns an object map of components. Each component object
     * contains the default config for that component.
     */
    getComponentList(cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve) => {
            this.routerClient.query("Launcher.componentList", {}, function (err, response) {
                cb(err, response.data);
                resolve({ err, data: response.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Get the component config (i.e. from components.json) for a specific component.
     *
     * @param {String} componentType The type of the component.
     * @param {Function} cb Callback returns the default config (windowDescriptor) for the requested componentType.
     *
     */
    getComponentDefaultConfig(componentType, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve) => {
            this.routerClient.query("Launcher.componentList", {}, function (err, response) {
                const data = response.data[componentType];
                cb(err, data);
                resolve({ err, data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Gets monitorInfo (dimensions and position) for a given windowIdentifier or for a specific monitor.
     * If neither the identifier or monitor are provided then the monitorInfo for the current window is returned.
     *
     *
     * The information returned contains:
     *
     * **monitorRect** - The full dimensions for the monitor.
     *
     * **availableRect** - The dimensions for the available space on the monitor (less windows toolbars).
     *
     * **unclaimedRect** - The dimensions for available monitor space less any space claimed by components (such as the application Toolbar).
     *
     * Each of these is supplemented with the following additional members:
     *
     * **width** - The width as calculated (right - left).
     *
     * **height** - The height as calculated (bottom - top).
     *
     * **position** - The position of the monitor, numerically from zero to X. Primary monitor is zero.
     *
     * **whichMonitor** - Contains the string "primary" if it is the primary monitor.
     *
     * @param  {object} [params]               Parameters
     * @param  {WindowIdentifier} [params.windowIdentifier] The windowIdentifier to get the monitorInfo. If undefined, then the current window.
     * @param  {number|string} [params.monitor] If passed then a specific monitor is identified. Valid values are the same as for {@link LauncherClient#spawn}.
     * @param  {Function} cb Returns a monitorInfo object containing the monitorRect, availableRect and unclaimedRect.
     */
    getMonitorInfo(params, cb = Function.prototype) {
        var self = this;
        validate_1.default.args(cb, "function=");
        logger_1.default.system.debug(`MONITOR: launcherClient.getMonitorInfo`);
        const promiseResolver = (resolve) => {
            util.getMyWindowIdentifier(function (myWindowIdentifier) {
                if (!params.windowIdentifier) {
                    params.windowIdentifier = myWindowIdentifier;
                }
                self.routerClient.query("Launcher.getMonitorInfo", params, function (err, response) {
                    if (cb) {
                        cb(err, response.data);
                    }
                    logger_1.default.system.log(`MONITOR: launcherClient.getMonitorInfo query response data`, response.data);
                    resolve({ err, data: response.data });
                });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Gets monitorInfo (dimensions and position) for all monitors. Returns an array of monitorInfo objects. See {@link LauncherClient#getMonitorInfo} for the format of a monitorInfo object.
     *
     *
     *
     * @param  {Function} cb Returns an array of monitorInfo objects.
     */
    getMonitorInfoAll(cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve, reject) => {
            this.routerClient.query("Launcher.getMonitorInfoAll", {}, function (err, response) {
                if (err) {
                    reject({ err });
                    cb(err);
                }
                resolve({ err, data: response.data });
                cb(err, response.data);
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Registers a component with the launcher service
     *
     * @param {object} params -
     * @param {String} params.componentType - componentType
     * @param {object} params.manifest - this should be a component manifest
     * @param  {Function} cb
     */
    registerComponent(params, cb = Function.prototype) {
        const promiseResolver = (resolve) => {
            this.routerClient.query("LauncherService.registerComponent", params, function (err, response) {
                if (cb) {
                    cb(err, response.data);
                }
                resolve({ err, data: response.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Registers a component with the launcher service
     *
     * @param {object} params -
     * @param {String} params.componentType - componentType
     * @param  {Function} cb
     */
    unRegisterComponent(params, cb = Function.prototype) {
        if (!params.componentType)
            return cb("No componentType provided");
        const promiseResolver = (resolve) => {
            this.routerClient.query("LauncherService.unRegisterComponent", params, function (err, response) {
                if (cb) {
                    cb(err, response.data);
                }
                resolve({ err, data: response.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * A convenience method for dealing with a common use-case, which is toggling the appearance and disappearance of a child window when a button is pressed, aka drop down menus. Simply call this method from the click handler for your element. Your child window will need to close itself on blur events.
     * @param {HTMLElement|selector} element The DOM element, or selector, clicked by the end user
     * @param {windowIdentifier} windowIdentifier Identifies the child window
     * @param {object} params Parameters to be passed to {@link LauncherClient#showWindow} if the child window is allowed to open
     */
    toggleWindowOnClick(element, windowIdentifier, params) {
        var self = this;
        var key = windowIdentifier.windowName + ":" + windowIdentifier.uuid;
        if (!windowIdentifier.windowName)
            key = windowIdentifier.componentType;
        //If the element was clicked while the menu was open then return right away. The menu window will receive a blur event and close. This method is dependent on the fact that blur events are processed before click events. If this turns out to be a problem then put this call inside of a setTimeout().
        if (okayToOpenMenu[key] === false) {
            okayToOpenMenu[key] = true;
            return;
        }
        var onDisplayed = function (showError, showResponse) {
            if (!showResponse)
                return;
            let finWindow = showResponse.finWindow;
            var onBlur = function (blurResponse) {
                okayToOpenMenu[key] = true;
                self.windowClient.isMouseOverDOMElement(element, function (mouseIsOverElement) {
                    okayToOpenMenu[key] = !mouseIsOverElement;
                });
                finWindow.removeEventListener("blurred", onBlur);
            };
            finWindow.addEventListener("blurred", onBlur);
        };
        this.showWindow(windowIdentifier, params, onDisplayed);
    }
    /**
     * Displays a window and relocates/resizes it according to the values contained in params.
     *
     * @param {WindowIdentifier} windowIdentifier A windowIdentifier. This is an object containing windowName and componentType. If windowName is not given, Finsemble will try to find it by componentType.
     * @param {object} params Parameters. These are the same as {@link LauncherClient#spawn} with the following exceptions:
     * @param {any} [params.monitor] Same as spawn() except that null or undefined means the window should not be moved to a different monitor.
     * @param {number | string} [params.left] Same as spawn() except that null or undefined means the window should not be moved from current horizontal location.
     * @param {number | string} [params.top] Same as spawn() except that null or undefined means the window should not be moved from current vertical location.
     * @param {boolean} [params.spawnIfNotFound=false] If true, then spawns a new window if the requested one cannot be found.
     * *Note, only works if the windowIdentifier contains a componentType.*
     * @param {boolean} [params.autoFocus] If true, window will focus when first shown.
     * @param {boolean} [params.slave] Cannot be set for an existing window. Will only go into effect if the window is spawned.
     * (In other words, only use this in conjunction with spawnIfNotFound).
     * @param {Function} cb Callback to be invoked after function is completed. Callback contains an object with the following information:
     * **windowIdentifier** - The {@link WindowIdentifier} for the new window.
     * **windowDescriptor** - The {@link WindowDescriptor} of the new window.
     * **finWindow** - An `OpenFin` window referencing the new window.
     * @example
     * LauncherClient.showWindow({windowName: "Welcome Component-86-3416-Finsemble", componentType: "Welcome Component"}, {spawnIfNotFound: true});
     */
    showWindow(windowIdentifier, params, cb = Function.prototype) {
        validate_1.default.args(windowIdentifier, "object", params, "object=", cb, "function=");
        var self = this;
        if (!params) {
            params = {};
        }
        params = util.clone(params);
        if (!params.staggerPixels && params.staggerPixels !== 0) {
            params.staggerPixels = 100;
        }
        params.windowIdentifier = windowIdentifier;
        const promiseResolver = (resolve) => {
            util.getMyWindowIdentifier(function (myWindowIdentifier) {
                if (!params.relativeWindow) {
                    params.relativeWindow = myWindowIdentifier;
                }
                self.routerClient.query("Launcher.showWindow", params, async function (err, response) {
                    if (err) {
                        resolve({ err });
                        return cb(err);
                    }
                    var newWindowIdentifier = response.data.windowIdentifier;
                    response.data.windowIdentifier.name = response.data.windowIdentifier.windowName;
                    let { wrap } = await FinsembleWindow_1.FinsembleWindow.getInstance({ name: newWindowIdentifier.windowName });
                    response.data.finWindow = wrap;
                    resolve({ err, data: response.data });
                    cb(err, response.data);
                });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Asks the Launcher service to spawn a new component. Any parameter below can also be specified in config/components.json, which will
     * then operate as the default for that value.
     *
     * The launcher parameters mimic CSS window positioning.
     * For instance, to set a full size window use `left=0`,`top=0`,`right=0`,`bottom=0`.
     * This is functionally equivalent to: left=0,top=0,width="100%",height="100%"
     *
     * @since 2.4.1 Added params.windowType (deprecated params.native), params.path, params.alias, params.argumentsAsQueryString - These are all for launching native apps.
     * @since 3.7.0 Added "affinity" parameter
     * @param {function} cb Function invoked after the window is created
     */
    spawn(component, params, cb = Function.prototype) {
        var self = this;
        validate_1.default.args(component, "string", params, "object=", cb, "function=");
        if (!params) {
            params = {};
        }
        params = util.clone(params);
        params.component = component;
        if (!params.options) {
            params.options = {};
        }
        if (!params.options.customData) {
            params.options.customData = {};
        }
        if (!params.staggerPixels && params.staggerPixels !== 0) {
            params.staggerPixels = 50;
        }
        logger_1.default.system.debug(`Calling Spawn for componentType:${component}`);
        const promiseResolver = (resolve) => {
            util.getMyWindowIdentifier(function (windowIdentifier) {
                params.launchingWindow = windowIdentifier;
                self.callSpawn(params, (err, response) => {
                    resolve({ err, response });
                    cb(err, response);
                });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Returns an object that provides raw access to a remote window.
     * It returns an object that contains references to the Finsemble windowDescriptor, to
     * the `OpenFin` window, and to the native JavaScript (browser) window.
     *
     * *This will only work for windows that are launched using the Finsemble Launcher API.*
     *
     * As in any browser, you will not be able to manipulate a window that has been launched
     * cross domain or in a separate physical application (separate process). Caution
     * should be taken to prevent a window from being closed by the user if you plan on
     * referencing it directly. Due to these inherent limitations we strongly advise against a
     * paradigm of directly manipulating remote windows through JavaScript. Instead leverage the
     * RouterClient to communicate between windows and to use an event based paradigm!
     *
     * @param  {object} params Parameters
     * @param {string} params.windowName The name of the window to access.
     * @return {RawWindowResult} An object containing windowDescriptor, finWindow, and browserWindow. Or null if window isn't found.
     * @deprecated Finsemble now uses a splintering agent which disconnects windows from the main launcher.
     * It becomes impossible to access raw windows. See LauncherClient.getActiveDescriptors() and Util.getFinWindow()
     * @private
     */
    getRawWindow(params) {
        var launcher = window.opener;
        if (launcher.name !== "launcherService") {
            logger_1.default.system.warn("LauncherClient.getNativeWindow: window not opened by Launcher Service");
        }
        return launcher.activeWindows.getWindow(params.windowName);
    }
    /**
     * @private
     */
    callSpawn(params, cb = Function.prototype) {
        var self = this;
        validate_1.default.args(cb, "function=");
        logger_1.default.perf.debug("CallSpawn", "start", "from spawn to callback", params);
        const promiseResolver = (resolve) => {
            function invokeSpawnCallback(error, data) {
                cb(error, data);
                resolve({ err: error, data });
            }
            self.routerClient.query("Launcher.spawn", params, async function (err, response) {
                logger_1.default.system.debug("CallSpawn", "Initial launcher callback params", err, response);
                logger_1.default.perf.debug("CallSpawn", "Initial launcher callback", response);
                if (err) {
                    invokeSpawnCallback(err, result);
                    return logger_1.default.system.error("LauncherClient.callSpawn", err);
                }
                response.data.windowIdentifier.name = response.data.windowIdentifier.windowName;
                var result = response.data;
                // Add a wrapped finWindow to the response (this can only be done client side)
                if (result.windowDescriptor.native)
                    return invokeSpawnCallback(err, result); /// This is way too slow for native windows so we just let this pass through and assume the window is ready.
                var newWindowIdentifier = result.windowIdentifier;
                let { wrap } = await FinsembleWindow_1.FinsembleWindow.getInstance({ name: newWindowIdentifier.windowName }); //TODO - replace with FinsembleWindow
                result.finWindow = wrap;
                let componentOnlineChannel = "Finsemble." + result.windowIdentifier.windowName + ".componentReady";
                let subscriberID = self.routerClient.subscribe(componentOnlineChannel, componentOnlineCallback);
                function componentOnlineCallback(err, response) {
                    if (err)
                        return logger_1.default.system.error(err);
                    //Ignore the initial "uninitialized" state message delivered by subscribe (a second message will contain the actual data)
                    if (response && Object.keys(response.data).length === 0)
                        return;
                    if (params.position === "relative" && (params.groupOnSpawn || params.dockOnSpawn)) {
                        //If 'params.relativeWindow' is supplied we need to dock to it, otherwise get the parent window (System.Window.getCurrent())
                        const windowToGroup = params.relativeWindow ? params.relativeWindow.windowName : system_1.System.Window.getCurrent().name;
                        const windows = [result.windowIdentifier.windowName, windowToGroup]; //TODO - replace with FinsembleWindow
                        self.routerClient.query("DockingService.groupWindows", {
                            windows: windows,
                            isMovable: true,
                        }, function (error, response) {
                            logger_1.default.perf.debug("CallSpawn", "stop");
                            invokeSpawnCallback(err, result);
                        });
                    }
                    else {
                        logger_1.default.perf.debug("CallSpawn", "stop");
                        invokeSpawnCallback(err, result);
                    }
                    self.routerClient.unsubscribe(subscriberID);
                }
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Convenience function to get a monitor descriptor for a given windowIdentifier, or for the
     * current window.
     *
     * @param {WindowIdentifier} [windowIdentifier] The window to find the monitor for. Current window if undefined.
     * @param  {Function} cb Returns a monitor descriptor (optional or use returned Promise)
     * @returns {Promise} A promise that resolves to a monitor descriptor
     * @TODO this probably is unnecessary since a client can include util and a developer should be using this.getMonitorInfo which has full support for searching by component. Did Ryan need this?
     * @private
     */
    getMonitor(windowIdentifier, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve) => {
            util.getMonitor(windowIdentifier, (monitor) => {
                cb(monitor);
                resolve(monitor);
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Returns a {@link WindowIdentifier} for the current window
     *
     * @param {WindowIdentifier} cb Callback function returns windowIdentifier for this window (optional or use the returned Promise)
     * @returns {Promise} A promise that resolves to a windowIdentifier
     */
    // @TODO, [Terry] calls to launcherClient.myWindowIdentifier or launcherClient.getMyWindowIdentifier()
    // should be replaced with windowClient.getWindowIdentifier()
    getMyWindowIdentifier(cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve) => {
            util.getMyWindowIdentifier((wi) => {
                cb(wi);
                resolve(wi);
            });
        };
        return new Promise(promiseResolver);
    }
    /**
    * Gets the {@link WindowDescriptor} for all open windows.
    *
    * *Note: This returns descriptors even if the window is not part of the workspace*.
    *
    * @param {function} cb Callback returns an array of windowDescriptors
    *
    */
    getActiveDescriptors(cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve) => {
            this.routerClient.query("Launcher.getActiveDescriptors", {}, function (err, response) {
                if (err) {
                    return logger_1.default.system.error(err);
                }
                if (response) {
                    cb(err, response.data);
                    resolve({ err, data: response.data });
                }
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Adds a custom component. Private for now.
     * @private
     */
    addUserDefinedComponent(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve) => {
            this.routerClient.query("Launcher.userDefinedComponentUpdate", {
                type: "add",
                name: params.name,
                url: params.url,
            }, function (err, response) {
                cb(err, response.data);
                resolve({ err, data: response.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Adds a custom component. Private for now.
     * @private
     */
    removeUserDefinedComponent(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve) => {
            this.routerClient.query("Launcher.userDefinedComponentUpdate", {
                type: "remove",
                name: params.name,
                url: params.url,
            }, function (err, response) {
                cb(err, response.data);
                resolve({ err, data: response.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Gets components that can receive specific data types. Returns an object containing a of ComponentTypes mapped to a list of dataTypes they can receive. This is based on the "advertiseReceivers" property in a component's config.
     * @param params
     * @param {Array.<string>} [params.dataTypes] An array of data types. Looks for components that can receive those data types
     *
     * @since 2.0
     *
     * @example
     * LauncherClient.getComponentsThatCanReceiveDataTypes({ dataTypes: ['chartiq.chart', 'salesforce.contact']}, function(err, response) {
     * 	//Response contains: {'chartiq.chart': ['Advanced Chart'], 'salesforce.contact': ['Salesforce Contact']}
     * })
     *
     */
    getComponentsThatCanReceiveDataTypes(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        if (params.dataTypes && !Array.isArray(params.dataTypes)) {
            params.dataTypes = [params.dataTypes];
        }
        validate_1.default.args(params.dataTypes, "array");
        const promiseResolver = (resolve) => {
            this.routerClient.query("LauncherService.getComponentsThatCanReceiveDataTypes", params, function (err, response) {
                cb(err, response.data);
                resolve({ err, data: response.data });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Brings a windows to front. If no windowList, groupName or componentType is specified, brings all windows to front.
     * @param params
     * @param {Array.<string | Object>} [params.windowList] Optional. An array of window names or window identifiers. Not to be used with componentType.
     * @param {string} [params.groupName] Optional. The name of a window group to bring to front.
     * @param {string} [params.componentType] Optional. The componentType to bring to front. Not to be used with windowList.
     *
     * @since TBD
     *
     * @example
     * LauncherClient.bringWindowsToFront({ windowList: ['AdvancedChart-123-123', 'Symphony-Chat-234-234']}, function(err, response) {
     *
     * })
     *
     * @private
     */
    bringWindowsToFront(params = {}, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        if (params.windowList && !Array.isArray(params.windowList)) {
            params.windowList = [params.windowList];
        }
        if (params.groupName) {
            validate_1.default.args(params.groupName, "string");
        }
        if (params.componentType) {
            validate_1.default.args(params.componentType, "string");
        }
        //Changed to query to allow for async bring to front and to do something when all windows have been brought to front
        this.routerClient.query("LauncherService.bringWindowsToFront", params, (err, response) => {
            cb(err, response);
        });
        return Promise.resolve();
    }
    /**
     * Minimizes all but a specific list or group of windows. Either groupName or windowList must be specified.
     * @param params
     * @param {Array.<string | Object>} [params.windowList] Optional. An array of window names or window identifiers. Not to be used with componentType.
     * @param {string} [params.groupName] Optional. The name of a window group to hyperFocus.
     * @param {string} [params.componentType] Optional. The Component Type to hyperFocus. Not to be used with windowList.
     *
     * @since TBD
     * @example
     * LauncherClient.hyperFocus({ windowList: ['AdvancedChart-123-123', 'Symphony-Chat-234-234']}, function(err, response) {
     *
     * })
     *
     * @private
     */
    hyperFocus(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        if (params.windowList && !Array.isArray(params.windowList)) {
            params.windowList = [params.windowList];
        }
        if (!params.windowList && !params.groupName && !params.componentType) {
            params.windowList = [this.myWindowIdentifier];
        }
        if (params.groupName) {
            validate_1.default.args(params.groupName, "string");
        }
        if (params.componentType) {
            validate_1.default.args(params.componentType, "string");
        }
        this.routerClient.transmit("LauncherService.hyperFocus", params);
        cb();
        return Promise.resolve();
    }
    /**
     * Minimize windows. If no windowList or groupName is specified, all windows will be minimized.
     * @param {*} params
     * @param {Array.<string | Object>} [params.windowList] Optional. An array of window names or window identifiers. Not to be used with componentType.
     * @param {string} [params.groupName] Optional. The name of a window group to minimize.
     * @param {string} [params.componentType] Optional. The component type of windows to Minimize. Not to be used with windowList.
     *
     * @since TBD
     * @private
     */
    minimizeWindows(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        if (params.windowList && !Array.isArray(params.windowList)) {
            params.windowList = [params.windowList];
        }
        if (params.groupName) {
            validate_1.default.args(params.groupName, "string");
        }
        if (params.componentType) {
            validate_1.default.args(params.componentType, "string");
        }
        this.routerClient.transmit("LauncherService.minimizeWindows", params);
        cb();
        return Promise.resolve();
    }
    /**
     * Create Window group
     * @param {*} params
     * @param {string} [params.groupName] The name of the window group to create
     * @param {Array.<string | Object>} [params.windowList] An array of window names or window identifiers to add to the group. Optional.
     * @param {function} cb callback to be called upon group creation
     *
     * @since TBD
     * @private
     */
    createWindowGroup(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        if (params.windowList && !Array.isArray(params.windowList)) {
            params.windowList = [params.windowList];
            delete params.groupName;
        }
        validate_1.default.args(params.groupName, "string");
        const promiseResolver = (resolve) => {
            if (!params.groupName) {
                let err = "Invalid Parameters";
                resolve({ err });
                cb(err);
                return;
            }
            this.routerClient.query("LauncherService.createWindowGroup", params, function (err, response) {
                cb(err, response);
                resolve({ err, data: response });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Add Windows to group
     * @param {*} params
     * @param {string} [params.groupName] The name of the window group
     * @param {Array.<string | Object>} [params.windowList] An array of window names or window identifiers to add to the group.
     * @param {function} cb callback to be called upon group creation
     *
     * @since TBD
     * @private
     */
    addWindowsToGroup(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve) => {
            if (!params.groupName || !params.windowList) {
                let err = "Invalid Parameters";
                resolve({ err });
                cb(err);
                return;
            }
            if (params.windowList && !Array.isArray(params.windowList)) {
                params.windowList = [params.windowList];
            }
            validate_1.default.args(params.groupName, "string");
            this.routerClient.query("LauncherService.addWindowsToGroup", params, function (err, response) {
                cb(err, response);
                resolve({ err, data: response });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Remove Windows from group
     * @param {*} params
     * @param {string} [params.groupName] The name of the window group
     * @param {Array.<string | Object>} [params.windowList] An array of window names or window identifiers to remove from the group.
     * @param {function} cb callback to be called upon group creation
     *
     * @since TBD
     * @private
     */
    removeWindowsFromGroup(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        const promiseResolver = (resolve) => {
            if (!params.groupName || !params.windowList) {
                let err = "Invalid Parameters";
                resolve({ err });
                cb(err);
                return;
            }
            if (params.windowList && !Array.isArray(params.windowList)) {
                params.windowList = [params.windowList];
            }
            this.routerClient.query("LauncherService.removeWindowsFromGroup", params, function (err, response) {
                cb(err, response);
                resolve({ err, data: response });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * Get Window Groups that a window belongs to. If no windowIdentifier is specified, gets  the groups of the current window.
     * @param {*} params
     * @param {WindowIdentifier} [params.windowIdentifier] Optional. If not specified uses current window
     * @param {*} cb callback with a list of groups
     *
     * @since TBD
     * @private
     */
    getGroupsForWindow(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        if (typeof params === "function") {
            cb = params;
            params = null;
        }
        const promiseResolver = (resolve) => {
            if (!params || !params.windowIdentifier) {
                this.windowClient.getComponentState({ field: "finsemble:windowGroups" }, function (err, groups) {
                    resolve({ err, data: groups });
                    cb(err, groups);
                });
                return;
            }
            this.routerClient.query("LauncherService.getGroupsForWindow", params, function (err, response) {
                resolve({ err, data: response.data });
                cb(err, response.data);
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * @private
     * @param {*} params
     * @param {WindowIdentifier} [params.windowIdentifier] Optional. Current window is assumed if not specified.
     * @param {Array.<string>} [params.groupNames] List of group names to add window to. Groups will be created if they do not exist.
     * @param {*} cb
     */
    addToGroups(params, cb = Function.prototype) {
        validate_1.default.args(cb, "function=");
        validate_1.default.args(params.groupNames, "array");
        if (!params.windowIdentifier) {
            params.windowIdentifier = this.myWindowIdentifier;
        }
        const promiseResolver = (resolve) => {
            this.routerClient.query("LauncherService.addWindowToGroups", params, (err, response) => {
                cb(err, response);
                resolve({ err, data: response });
            });
        };
        return new Promise(promiseResolver);
    }
    /**
     * _createWrap allows us to create a wrap without spawning a window
     *
     * @param {Object} params
     * @param {String} params.name
     * @param {Function} cb
     * @memberof LauncherClient
     * @private
     */
    _createWrap(params, cb) {
        this.routerClient.query("LauncherService.createWrap", params, cb);
    }
    /**
     * @private
     *
     * @param {*} cb
     * @memberof LauncherClient
     */
    start(cb) {
        var self = this;
        // Get Group Updates (only if we are not in a service)
        if (typeof Globals.FSBL !== "undefined") {
            // Get Groups from Component State on Load
            function subscribeToGroupUpdates() {
                self.routerClient.subscribe("Finsemble.LauncherService.updateGroups." + self.windowName, function (err, response) {
                    if (!Array.isArray(response.data))
                        return; //dont attempt to save the initial responder state.
                    self.windowClient.setComponentState({ field: "finsemble:windowGroups", value: response.data });
                });
            }
            // cannot add a windowClient dependency here so explicitly wait for windowClient ready (ideally dependency manage could fully handle but maybe later)
            Globals.FSBL.addEventListener("onReady", function () {
                self.windowClient.onReady(() => {
                    self.windowClient.getComponentState({ field: "finsemble:windowGroups" }, function (err, groups) {
                        if (!err && groups) {
                            return self.addToGroups({
                                groupNames: groups,
                            }, subscribeToGroupUpdates);
                        }
                        subscribeToGroupUpdates();
                    });
                });
            });
        }
        setInterval(function () {
            self.routerClient.transmit("Finsemble.heartbeat", { type: "component", windowName: self.windowName, componentType: "finsemble" });
        }, 1000);
        // @TODO, [Terry] remove in favor of calls to windowClient.getMyIdentifier()
        this.getMyWindowIdentifier((identifier) => {
            self.myWindowIdentifier = identifier;
            if (cb) {
                cb();
            }
        });
    }
}
function constructInstance(params) {
    params = params ? params : {};
    if (!params.windowClient)
        params.windowClient = windowClient_1.default;
    return new LauncherClient({
        clients: params,
        startupDependencies: {
            services: ["windowService"],
        },
        onReady: function (cb) {
            logger_1.default.system.debug("launcherClient ready", window.name);
            logger_1.default.perf.debug("LauncherClientReadyTime", "stop");
            launcherClient.start(cb);
        },
        name: "launcherClient",
    });
}
var launcherClient = constructInstance();
launcherClient.constructInstance = constructInstance;
exports.default = launcherClient;


/***/ }),
/* 41 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony export (immutable) */ __webpack_exports__["byString"] = byString;
/* harmony export (immutable) */ __webpack_exports__["initObject"] = initObject;
/* harmony export (immutable) */ __webpack_exports__["mapField"] = mapField;
/* harmony export (immutable) */ __webpack_exports__["checkForObjectChange"] = checkForObjectChange;
/**
 *
 * This file handles common functionality needed in both the client and service.
 *
 */
// Get a value from an object using a string. {abc:{123:"value"}} you would do byString(object,"abc.123")
function byString(o, s) {
	//Object,String
	s = s.replace(/\[(\w+)\]/g, ".$1"); // convert indexes to properties
	s = s.replace(/^\./, ""); // strip a leading dot
	var a = s.split(".");
	for (var i = 0, n = a.length; i < a.length; ++i) {
		// Loop through and find the attribute that matches the string passed in
		var k = a[i];
		if (!o) {
			return null;
		}
		if (typeof o === "string") return null; // Reached the end of the chain

		if (k in o) {
			o = o[k];
		} else {
			return null;
		}
	}
	return o;
}
//can add values to an object from a string. Must be in `.` form abc.123
const setPath = (object, path, value) => path.split(".").reduce((o, p) => o[p] = path.split(".").pop() === p ? value : o[p] || {}, object);
/* harmony export (immutable) */ __webpack_exports__["setPath"] = setPath;


// This handles the initial mapping for us. It will crawl through all child objects and map those too. Parent is the current location within the object(`parent.child`). Null is top level. The mapping is all flattened
function initObject(object, parent, mapping) {
	var mapLocation;

	if (!parent) {
		parent = null;
	}

	if (typeof object !== "object") {
		mapLocation = parent ? parent + "." + n : n;
		mapping[mapLocation] = parent;
		return;
	}

	for (let n in object) {
		if (typeof object[n] === "object" && object[n] !== "undefined") {
			mapLocation = parent ? parent + "." + n : n;
			mapping[mapLocation] = parent;
			initObject(object[n], mapLocation, mapping); // If we have another object, map it
		} else {
			mapLocation = parent ? parent + "." + n : n;
			mapping[mapLocation] = parent;
		}
	}
}
// Will map out a field in an object. So we don't have to loop through the whole thing every time we have a change.
function mapField(object, s, mapping) {
	if (mapping[s]) {
		return;
	} // If we're already mapped move on.
	s = s.replace(/\[(\w+)\]/g, ".$1"); // convert indexes to properties
	s = s.replace(/^\./, ""); // strip a leading dot
	var a = s.split(".");
	var currentLocation = s;

	if (!mapping.hasOwnProperty(currentLocation)) {
		var newString = null;
		if (a.length > 1) {
			a.pop();
			newString = a.join(".");
		}

		mapping[currentLocation] = newString;
	}

	var newObject = byString(object, currentLocation);
	if (newObject === "undefined") {
		return;
	} // If the location doesn't exist exit.
	if (typeof newObject === "object") {
		for (var key in newObject) {
			mapField(object, currentLocation + "." + key, mapping); // If we need to ke
		}
	}
}
// To see if we're replacing an existing field/object with an object/field that would make some of the mapping obsolete.
function checkForObjectChange(object, field, mapping) {
	var objectReplacing = byString(object, field);
	if (objectReplacing === null) {
		return false;
	}
	if (typeof objectReplacing === "object") {
		// we're replacing an object which requires use to remap at this level.
		return removeChildMapping(mapping, field);
	}
	if (typeof objectReplacing !== "object" && typeof field === "object") {
		//we're replacing a non object with an object. Need to map out this new object
		return removeChildMapping(mapping, field);
	}
	return null;
}
//This will remove an item from mapping and pass back an array so that we can send out notifications
function removeChildMapping(mapping, field) {
	var removals = [];
	for (var map in mapping) {
		var lookField = field + ".";
		if (map.includes(lookField)) {
			removals.push(map);
			delete mapping[map];
		}
	}
	return removals;
}

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\common\\storeUtils.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\common\\storeUtils.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const async_1 = __webpack_require__(9);
const storeUtils = __webpack_require__(41);
const logger_1 = __webpack_require__(0);
const baseClient_1 = __webpack_require__(7);
/** The global `window` object. We cast it to a specific interface here to be
 * explicit about what Finsemble-related properties it may have. */
const Globals = window;
/**
 *
 * @introduction
 * <h2>Store Model</h2>
 * The Store Model consists of store instances. It handles getters/setters of data.
 * @hideConstructor
 * @class
 */
class StoreModel extends baseClient_1._BaseClient {
    constructor(params, routerClient) {
        super(params);
        this.values = {};
        this.listeners = [];
        this.registeredDispatchListeners = [];
        this.mapping = {};
        /** This is the Flux dispatcher. It can be used dispatch actions across stores. These action are not caught inside of the global store service. For more information, you can read the [Flux documentation](https://facebook.github.io/flux/docs/overview.html).
         *
         * Example:
         * ```
         * store.Dispatcher.register(function(action){
         * 	if(action.actionType === "ACTION1") {
         * 		// Do something with the action here.
         * 	}
         * })
         * ```
         */
        this.Dispatcher = {
            register: (fn) => {
                this.registeredDispatchListeners.push(fn);
            },
            dispatch: (data) => {
                if (this.isGlobal) {
                    this.routerClient.transmit("storeService.dispatch." + this.name, data);
                }
                else {
                    this.handleDispatchedMessages(null, {
                        data: data
                    });
                }
            }
        };
        /**
         * Handles all changes coming in from the service.
         */
        this.handleChanges = (err, response) => {
            if (err) {
                logger_1.default.system.error("DistributedStoreClient", err);
            }
            if (!response.data.store) {
                return;
            }
            if (!response.data.field) {
                response.data.field = null;
            }
            var combined = this.name + (response.data.field ? "." + response.data.field : "");
            var val = response.data.storeData ? response.data.storeData : response.data.value;
            this.triggerListeners(combined, val);
        };
        this.routerClient = routerClient;
        this.isGlobal = params.global;
        this.name = params.store ? params.store : "finsemble";
        if (params.values)
            this.values = params.values;
        this.lst = this.listeners;
        storeUtils.initObject(this.values, null, this.mapping);
        // Add listeners for global stores. Not needed for local stores as everything happens internally.
        if (this.isGlobal) {
            this.routerClient.addListener("storeService.dispatch." + this.name, this.handleDispatchedMessages.bind(this));
        }
    }
    /**
     * @param {*} err
     * @param {*} message
     * @private
     */
    handleDispatchedMessages(err, message) {
        for (var i = 0; i < this.registeredDispatchListeners.length; i++) {
            this.registeredDispatchListeners[i](message.data);
        }
    }
    ;
    /**
     * Set a value in the store. Two events will be triggered with topics of: store and field.
     * @param {Object} params - Params object
     * @param {String} params.field - The name of the field where data will be stored
     * @param {String} params.value - Value to be stored
     * @param {function} cb callback
     * @returns {null}
     *
     * @example
     * store.setValue({field:'field1',value:"new value"});
     */
    setValue(params, cb) {
        if (!params.field) {
            logger_1.default.system.error("DistributedStore.setValue:no field provided", params);
        }
        if (!params.hasOwnProperty("value")) {
            logger_1.default.system.error("DistributedStore.setValue:no value provided", params);
        }
        if (this.isGlobal) {
            var data = {
                store: this.name,
                field: params.field,
                value: params.value
            };
            return Globals.distributedStoreClient.routerClient.query("storeService.setValue", data, function (err) {
                return cb ? cb(err) : null;
            });
        }
        const removals = storeUtils.checkForObjectChange(this.values, params.field, this.mapping);
        storeUtils.setPath(this.values, params.field, params.value);
        storeUtils.mapField(this.values, params.field, this.mapping);
        if (removals) {
            this.sendRemovals(removals);
        }
        this.triggerListeners(this.name, this);
        this.publishObjectUpdates(params.field, this.mapping);
        return cb ? cb(null) : null;
    }
    ;
    /**
     * Handles changes to the store. Will publish from the field that was changed and back.
     */
    publishObjectUpdates(startField, mappings) {
        const currentMapping = mappings;
        while (startField) {
            this.triggerListeners(this.name + "." + startField, storeUtils.byString(this.values, startField));
            startField = currentMapping[startField];
        }
    }
    /**
     * Send items that are no longer mapped or had their map change. If a value is remapped we'll send out the new value.
    */
    sendRemovals(removals) {
        for (var i = 0; i < removals.length; i++) {
            this.triggerListeners(this.name + "." + removals[i], storeUtils.byString(this.values, removals[i]));
        }
    }
    /**
     * This will set multiple values in the store.
     * @param {Object[]} fields - An Array of field objects
     * @param {String} fields.field - The name of the field
     * @param {any} fields.value - Field value
     * @param {function} cb callback
     * @example
     * store.setValues([{field:'field1',value:"new value"}]);
     */
    setValues(fields, cb) {
        if (!fields) {
            return logger_1.default.system.error("DistributedStore.setValues:no params given");
        }
        if (!Array.isArray(fields)) {
            return logger_1.default.system.error("DistributedStore.setValues:params must be an array");
        }
        async_1.each(fields, (field, done) => {
            this.setValue(field, done);
        }, (err) => {
            return cb ? cb(err) : null;
        });
    }
    ;
    /**
     * Get a value from the store. If global is not set, we'll check local first then we'll check global.
     * @param {string|object} params - Params object. This can also be a string
     * @param {String} params.field - The field where the value is stored.
     * @param {Function} cb -  Will return the value if found.
     * @returns {any} - The value of the field. If no callback is given and the value is local, this will run synchronous
     * @example
    store.getValue({field:'field1'},function(err,value){});
    store.getValue('field1',function(err,value){});
     */
    getValue(params, cb) {
        if (typeof params === "string") {
            params = { field: params };
        }
        if (!params.field) {
            if (!cb) {
                return "no field provided";
            }
            return cb("no field provided");
        }
        if (this.isGlobal) {
            return this.getGlobalValue(params, cb);
        }
        var fieldValue = storeUtils.byString(this.values, params.field);
        if (fieldValue !== undefined) {
            if (!cb) {
                return fieldValue;
            }
            return cb(null, fieldValue);
        }
        if (!cb) {
            return null;
        }
        return cb("couldn't find a value");
    }
    ;
    /**
     * Get multiple values from the store.
     * @param {Array.<object>|Array.<String>} fields - An Array of field objects. If there are no fields provided, all values in the store are returned.
     * @param {Function} [cb] -  Will return the value if found.
     * @returns {Object} - returns an object of with the fields as keys.If no callback is given and the value is local, this will run synchronous
     * @example
     * store.getValues([{field:'field1'},{field:'field2'}],function(err,values){});
     * store.getValues(['field1','field2'],function(err,values){});
     */
    getValues(fields, cb) {
        if (typeof fields === "function") {
            cb = fields;
            if (this.isGlobal) {
                return this.getGlobalValues(null, cb);
            }
            if (!cb) {
                return this.values;
            }
            return cb(null, this.values);
        }
        if (!Array.isArray(fields)) {
            return this.getValue(fields, cb);
        }
        if (this.isGlobal) {
            return this.getGlobalValues(fields, cb);
        }
        var values = {};
        for (var i = 0; i < fields.length; i++) {
            var item = fields[i];
            var field = typeof item === "string" ? item : item.field;
            var combined = this.name + (field ? "." + field : "");
            var fieldValue = storeUtils.byString(this.values, field);
            values[field] = fieldValue;
        }
        if (!cb) {
            return values;
        }
        return cb(null, values);
    }
    ;
    /**
     * Get a single value from the global store.
     */
    getGlobalValue(params, cb) {
        Globals.distributedStoreClient.routerClient.query("storeService.getValue", {
            store: this.name,
            field: params.field
        }, (err, response) => {
            if (err) {
                return cb(err);
            }
            return cb(err, response.data);
        });
    }
    /**
     * Get values from the global store.
     */
    getGlobalValues(params, cb) {
        Globals.distributedStoreClient.routerClient.query("storeService.getValues", {
            store: this.name,
            fields: params
        }, (err, response) => {
            if (err) {
                return cb(err);
            }
            return cb(err, response.data);
        });
    }
    /**
     * Remove a value from the store.
    * @param {Object | String} params - Either an object or string
     * @param {String} param.field - The name of the field
     * @param {Function} cb -  returns an error if there is one
     * @example
     * store.removeValue({field:'field1'},function(err,bool){});
     */
    removeValue(params, cb) {
        if (!params.field) {
            if (params !== undefined) {
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
     * Removes multiple values from the store.
     * @param {Object[] | String[]} params - An Array of field objects
     * @param {String} param[].field - The name of the field
     * @param {Function} cb -  returns an error if there is one.
     * @example
     * store.removeValue({field:'field1'},function(err,bool){});
     */
    removeValues(params, cb) {
        if (!Array.isArray(params)) {
            return cb("The passed in parameter needs to be an array");
        }
        async_1.map(params, this.removeValue, (err, data) => {
            return cb(err, data);
        });
    }
    ;
    /**
     * Destroys the store.
     * @param {Function} cb -  Will return the value if found.
     * @example
     * store.destroy();
     */
    destroy(cb) {
        var params = {
            store: this.name,
            global: this.isGlobal,
        };
        Globals.distributedStoreClient.removeStore(params, (err, response) => {
            if (err) {
                return cb(err);
            }
            return cb(null, true);
        });
    }
    ;
    /**
     * NOTE: make sure we dont have duplicate router subscribers
     * @private
     */
    changeSub(change) {
        if (!this.subs)
            this.subs = [];
        if (!this.subs[change]) {
            if (this.isGlobal) {
                Globals.distributedStoreClient.routerClient.subscribe("storeService" + change, this.handleChanges);
            }
            this.subs[change] = true;
        }
    }
    ;
    /**
    * Add a listener to the store at either the store or field level. If no field is given, the store level is used. You can also listen to nested object -- field1.nestedField
    * @param {Object} params - Params object
    * @param {String} params.field - The data field to listen for. If this is empty it listen to all changes of the store.
    * @param {Function} fn -  the function to call when a listener is triggered
    * @param {Function} cb - callback
    * @example
    *var myFunction = function(err,data){
    }
    * store.addListener({field:'field1'},myFunction,cb);

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
        var combined = this.name + (field ? "." + field : "");
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
    * Add an array of listeners as  objects or strings. If using strings, you must provide a function callback.
    * @param {Object[] | String[]} params - Params object
    * @param {String} params.field - The data field to listen for.
    * @param {String} [params.listener] - the function to call when a listener is triggered. If this is empty, fn is used.
    * @param {function} [fn] -  the function to call when a listener is triggered
    * @param {function} cb callback
    * @example
    *var myFunction = function(err,data){

    }
    store.addListeners([{field:'field1',listener:myFunction},{field:'field2',listener:myFunction}],null,cb);

    store.addListeners([{field:'field1'},{field:'field2',listener:myFunction}],myFunction,cb);

    store.addListeners(['field1','field2'],myFunction,cb);
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
            var combined = this.name + (field ? "." + field : "");
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
     * Remove a listener from  store. If no field is given, we look for a store listener
     * @param {Object} params - Params object
     * @param {String} params.field - The data field
     * @param {function} [fn] -  the function to remove from the listeners
     * @param {function} [cb] -  returns true if it was successful in removing the listener.
     *
     * @example
     * var myFunction = function(err,data){
            }
     * store.removeListener({field:'field1'},MyFunction,function(bool){});
    StoreCstorelient.removeListener(MyFunction,function(bool){});
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
     * Remove an array of listeners from the store
     * @param {Object[] | String[]} params - Params object
     * @param {String} params.field - The data field to listen for. If this is empty it listen to all changes of the store.
     * @param {String} params.listener - The listener function
     * @param {function} [fn] -  the function to remove from the listeners
     * @param {function} [cb] -  returns true if it was successful in removing the listener.
     *
     * @example
     * var myFunction = function(err,data){
            }
     * store.removeListeners({field:'field1'},MyFunction,function(bool){});
    store.removeListeners([{field:'field1',listener:MyFunction}],function(bool){});
    store.removeListeners(['field1'],MyFunction,function(bool){});
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
            var combined = this.name + (field ? "." + field : "");
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
    // Trigger any function that is listening for changes
    triggerListeners(listenerKey, data) {
        if (this.listeners[listenerKey]) {
            for (var i = 0; i < this.listeners[listenerKey].length; i++) {
                if (typeof this.listeners[listenerKey][i] === "function") {
                    logger_1.default.system.debug("DistributedStore.triggerListeners", listenerKey, data);
                    this.listeners[listenerKey][i](null, { field: listenerKey, value: data });
                }
                else {
                    logger_1.default.system.warn("DistributedStoreClient:triggerListeners: listener is not a function", listenerKey, i, this.listeners[listenerKey][i]);
                }
            }
        }
    }
}
;
exports.default = StoreModel;


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
const storageClient_1 = __webpack_require__(21);
const hotkeysClient_1 = __webpack_require__(44);
const util = __webpack_require__(8);
const system_1 = __webpack_require__(3);
const baseClient_1 = __webpack_require__(7);
const logger_1 = __webpack_require__(0);
const validate_1 = __webpack_require__(6); // Finsemble args validator
const FinsembleWindow_1 = __webpack_require__(34);
const configUtil_1 = __webpack_require__(10);
const async_1 = __webpack_require__(9);
const routerClientInstance_1 = __webpack_require__(5);
const lodashGet = __webpack_require__(28);
// DH 3/6/2019 - @TODO - All uses of this should be replaced with calls to the WindowStorageManager
const constants_1 = __webpack_require__(11);
const configClient_1 = __webpack_require__(15);
var finsembleWindow;
/**
 *
 * Helper to see if element has a class.
 * @param {HTMLElement} el
 * @param {String} className
 * @private
 * @return {HTMLElement}
 */
function hasClass(el, className) {
    if (el.classList) {
        return el.classList.contains(className);
    }
    return !!el.className.match(new RegExp("(\\s|^)" + className + "(\\s|$)"));
}
/**
 * Adds a class to an HTML element
 * @param {HTMLElement} el
 * @param {String} className
 * @private
 */
function addClass(el, className) {
    if (el.classList) {
        el.classList.add(className);
    }
    else if (!hasClass(el, className)) {
        el.className += " " + className;
    }
}
/**
 *
 * Removes class from HTML element
 * @param {HTMLElement} el
 * @param {String} className
 * @private
 */
function removeClass(el, className) {
    if (el.classList) {
        el.classList.remove(className);
    }
    else if (hasClass(el, className)) {
        var reg = new RegExp("(\\s|^)" + className + "(\\s|$)");
        el.className = el.className.replace(reg, " ");
    }
}
/**
 *
 *@introduction
  <h2>Window Client</h2>
  ----------
 * The Window Client is primarily responsible for managing the `windowState` (the window's bounds) and `componentState` (data inside of your component).
 * It also injects the **window title bar** control, which contains controls for minimizing, maximizing, closing, and restoring your window.
 * The reference below is provided in case you'd like to manually trigger events.
 *
 * This is the Window Client API reference.
 * If you're looking for information about the window title bar, please see the [Presentation Component tutorial](tutorial-PresentationComponents.html#window-title-bar) for more information.
 *
 * @hideconstructor
 * @param {object} params
 * @constructor
 * @returns {WindowClient}
 */
class WindowClient extends baseClient_1._BaseClient {
    constructor(params) {
        /** @alias WindowClient# */
        super(params);
        /**
         * Moves the window so that it's centered above the user's mouse.
         */
        this.showAtMousePosition = function () {
            this.routerClient.transmit("DockingService.showAtMousePosition", this.getWindowIdentifier());
        };
        validate_1.default.args(params, "object=") && params && validate_1.default.args2("params.onReady", params.onReady, "function=");
        //We store the options that the window is created with in this property.
        /**
        * A copy of the `finWindow`'s options value. This is where we store information like monitorDimensions, initialization information, and any other data that needs to be passed from the parent application into the created window.
        * @type object
        */
        this.options = {};
        //The hash we use to save data with.
        this.windowHash = "";
        //Window's title.
        this.title = null;
        //This is the bottom edge of the toolbar. The window's position will be offset by this much.
        //@todo move this value to a config.
        this.toolbarBottom = 40;
        //default value. The window assigns the containers it cares about before starting.
        this.containers = [];
        //window state for restoration purposes.
        this.componentState = {};
        //This can be either normal, minimized, or maximized.
        this.windowState = "normal";
        // This gets set to true if the window has a header
        this.hasHeader = false;
        //If true, will send router messages to have docking respond to windows aero snap. Otherwise, will restore from those events when they happen
        this.enableWindowsAeroSnap = false;
        this.bindFunctions();
        /**
         * Minimizes window along with all windows docked to it.
         * @param {function} cb Optional callback
         * @example
         * FSBL.Clients.WindowClient.minimizeWithDockedWindows();
         * @private
         */
        this.minimizeWithDockedWindows = this.minimize;
    }
    /**
     * @private
     */
    bindFunctions() {
        this.onWindowRestored = this.onWindowRestored.bind(this);
        this.onWindowMaximized = this.onWindowMaximized.bind(this);
        this.onWindowBlurred = this.onWindowBlurred.bind(this);
        this.onWindowFocused = this.onWindowFocused.bind(this);
        this.onParentSet = this.onParentSet.bind(this);
        this.onMinimizedRestored = this.onMinimizedRestored.bind(this);
        this.onWindowMinimized = this.onWindowMinimized.bind(this);
        this.close = this.close.bind(this);
        this.getInitialOptions = this.getInitialOptions.bind(this);
        this.cacheInitialBounds = this.cacheInitialBounds.bind(this);
    }
    /**
     * This function is fired every time the window's bounds change. It saves the window's position.
     * @param {object} bounds
     * @private
     */
    onWindowRestored() {
        this.updateHeaderState("Maximize", { hide: false });
    }
    /**
     * @private
     */
    onWindowMaximized() {
        this.updateHeaderState("Maximize", { hide: true });
    }
    /**
     * @private
     */
    onWindowBlurred() {
        if (this.hasHeader) {
            this.setActive(false);
        }
    }
    /**
     * @private
     */
    onWindowFocused() {
        if (this.hasHeader) {
            this.setActive(true);
        }
    }
    /**
     * @private
     */
    onMinimizedRestored() {
        this.routerClient.transmit("DockingService.windowRestored", finsembleWindow.name);
        finsembleWindow.removeEventListener("restored", this.onMinimizedRestored);
    }
    /**
     * @private
     */
    onWindowMinimized() {
        this.routerClient.query("DockingService.windowMinimized", { windowName: finsembleWindow.name });
        finsembleWindow.addEventListener("restored", this.onMinimizedRestored);
    }
    /**
     * Handles the event that fires when the finsemble window's parent is set.
     * @private
     * @param evt the event itself, which is ignored.  Any time a parent is set, force a group data update.
     */
    onParentSet(evt) {
        this.requestGroupDataPublish();
    }
    /**
     * Returns a list of the groups this window is in, if any.
     */
    getWindowGroups() {
        return this.windowGroups;
    }
    /**
     * Handler for group updates from the window service.  Stores the groups that this window is in,
     * if any.
     * @private
     * @param err the error, if any
     * @param res the received updated group data
     */
    groupUpdateHandler(err, res) {
        if (err) {
            FSBL.Clients.Logger.error(err);
            return;
        }
        this.windowGroups = Object.values(res.data.groupData).
            filter(group => group.windowNames.includes(this.getWindowNameForDocking()));
    }
    ;
    /**
     * Requests an updated group data message.
     * @private
     */
    requestGroupDataPublish() {
        this.routerClient.transmit("DockingService.requestGroupDataPublish");
    }
    /**
     * Closes Window.
     * @param {object} params
     * @param {boolean} params.removeFromWorkspace Whether to remove the window from the workspace.
     * @param {boolean} params.closeWindow Whether to close the window. On shutdown this method is closed, but we let the launcher close the window.
     * Defaults are to remove the window from the workspace if the user presses the X button, but not if the window is closed via an app-level request (e.g., we need to switch workspaces, so all windows need to close).
     * @param {function} cb callback
     * @example
     * //Close window and remove from workspace (e.g., user closes the window).
     * FSBL.Clients.WindowClient.close(true);
     * //Close window and keep in workspace (e.g., application requests that all windows close themselves).
     * FSBL.Clients.WindowClient.close(false);
     */
    close(params, cb = () => { }) {
        if (!params) {
            params = { removeFromWorkspace: true, closeWindow: true };
        }
        let parentWindow = finsembleWindow.parentWindow;
        if (params.userInitiated && parentWindow) {
            return parentWindow.close(params, cb);
        }
        else {
            finsembleWindow.close(params, cb);
        }
    }
    /**
     * @private
     * @returns {windowHash}
     */
    getWindowHash() {
        return this.windowHash;
    }
    /**
     * Retrieves the window's title.
     * @returns {String} title
     * @example
     * var windowTitle = FSBL.Clients.WindowClient.getWindowTitle();
     */
    getWindowTitle() {
        return this.title;
    }
    /**
     * This function retrieves the dimensions of the monitor that the window is on. It's currently used in the {@link launcherClient}.
     * @param {function} callback
     * @private
     * @todo  this is bad. The monitor can change if the window is moved. Use util monitor functions instead. Instead, use the util style getMyMonitor, and keep monitor dimensions up to date statically at FSBL level with a listener on launcher (unclaimedRect).
     */
    retrieveMonitorDimensions(callback = Function.prototype) {
        util.getMonitor(null, function (monitorInfo) {
            finsembleWindow.updateOptions({ options: { monitorDimensions: monitorInfo.monitorRect } });
            if (callback) {
                callback(monitorInfo.monitorRect);
            }
        });
    }
    /**
     * Listens for changes in the hash and persists the change to the url property, and then saves it.
     * @private
     */
    listenForHashChanges() {
        //get url on page load.
        finsembleWindow.updateOptions({ url: window.top.location.href }, () => {
        });
        var self = this;
        //There's no pushState event in the browser. This is a monkey patched solution that allows us to catch hash changes. onhashchange doesn't fire when a site is loaded with a hash (e.g., salesforce).
        (function (history) {
            var pushState = history.pushState;
            history.pushState = function (state) {
                if (typeof history.onpushstate === "function") {
                    history.onpushstate({ state: state });
                }
                pushState.apply(history, arguments);
                finsembleWindow.updateOptions({ url: window.top.location.href }, () => {
                });
                return;
            };
            var replaceState = history.replaceState;
            history.replaceState = function (state) {
                if (typeof history.onreplacestate === "function") {
                    history.onreplacestate({ state: state });
                }
                replaceState.apply(history, arguments);
                finsembleWindow.updateOptions({ url: window.top.location.toString() });
                storageClient_1.default.save({ topic: constants_1.WORKSPACE.CACHE_STORAGE_TOPIC, key: self.windowHash, value: finsembleWindow.windowOptions });
                return;
            };
        })(window.history);
        window.addEventListener("hashchange", () => {
            finsembleWindow.updateOptions({ url: window.top.location.toString() }, () => {
            });
        });
    }
    ;
    /**
     * Gets the options from the window on startup and caches them on the object.
     * @private
     * @param {function} callback
     */
    getInitialOptions(callback) {
        if (!this.isInAService) {
            finsembleWindow.getOptions((err, options) => {
                //err happens if the window doesn't exist in the windowService (e.g., it's a service that's included the windowClient). This will be revisited in the future, but for now we need to make sure that the system doesn't have errors.
                if (err)
                    options = {};
                finsembleWindow.windowOptions = options;
                this.options = options;
                logger_1.default.system.verbose("WindowClient:getting options", options);
                callback();
            });
        }
        else {
            this.options = {};
            callback();
        }
    }
    /**
     * Gets the bounds for the window on startup and saves them to the workspace.
     * @private
     * @param {function} callback
     */
    cacheInitialBounds(callback) {
        this.cacheBounds((bounds) => {
            try {
                // TODO: saveCompleteWindowState is related to addToWorkspace, not persistWindowState. This causes workspaces to fail for windows where persistWindowState is not set but addToWorkspace is.
                if (!finsembleWindow.windowOptions.customData.foreign.components["Window Manager"].persistWindowState) {
                    return callback();
                }
                finsembleWindow.updateOptions({ options: { url: window.top.location.toString() } });
                //finsembleWindow.saveCompleteWindowState();
                //this.saveWindowBounds(bounds, false);
            }
            catch (e) {
                logger_1.default.system.warn("customData.foreign.components[\"Window Manager\" is undefined");
            }
            callback();
        });
    }
    /**
     * Sets initial state for the window. This data is modified on subsequent saves.
     * @param {function} callback
     * @private
     */
    setInitialWindowBounds(callback) {
        logger_1.default.system.warn("`FSBL.Clients.WindowClient.setInitialWindowBounds is deprecated and will be removed in a future version of finsemble. Use 'getInitialOptions' and 'cacheInitialBounds' instead.");
        async_1.parallel([
            this.getInitialOptions,
            this.cacheInitialBounds
        ], callback);
    }
    /**
     * Returns windowBounds as of the last save.
     * @returns {object}
     * @private
     */
    getWindowBounds() {
        return {
            top: finsembleWindow.windowOptions.defaultTop,
            left: finsembleWindow.windowOptions.defaultLeft,
            width: finsembleWindow.windowOptions.defaultWidth,
            height: finsembleWindow.windowOptions.defaultHeight
        };
    }
    /**
     *
     * Saves the window's state. Rarely called manually, as it's called every time your window moves.
     * @param {Object} bounds optional param.
     * @example <caption>The code below is the bulk of our listener for the <code>bounds-changed</code> event from the window. Every time the <code>bounds-changed</code> event is fired (when the window is resized or moved), we save the window's state. The first few lines just prevent the window from being dropped behind the toolbar.</caption>
     *finWindow.addEventListener('disabled-frame-bounds-changed', function (bounds) {
     * 	if (bounds.top < 45) {
     *		finWindow.moveTo(bounds.left, 45);
     *		return;
     *	}
     *	self.saveWindowBounds(bounds);
     * @private
     *});
     */
    saveWindowBounds(bounds, setActiveWorkspaceDirty) {
        logger_1.default.system.debug("WINDOW LIFECYCLE:SavingBounds:", bounds, "setActiveWorkspaceDirty", setActiveWorkspaceDirty);
        if (typeof setActiveWorkspaceDirty === "undefined") {
            setActiveWorkspaceDirty = false;
        }
        validate_1.default.args(bounds, "object") && validate_1.default.args2("bounds.top", bounds.top, "number");
        if (!bounds) {
            return;
        }
        // openfin looks at defaultTop, terry looks at top. for some reason, when the app started fresh, the window's position was being overwritten. We also were saving the position on `defaultTop`/`defaultLeft`, and the launcherService wasn't looking for that. We may be able to get rid of the first assignment on the left, but I want terry to fully look at this.
        finsembleWindow.updateOptions({
            options: {
                top: Math.round(bounds.top),
                defaultTop: Math.round(bounds.top),
                left: Math.round(bounds.left),
                defaultLeft: Math.round(bounds.left),
                width: Math.round(bounds.width),
                defaultWidth: Math.round(bounds.width),
                height: Math.round(bounds.height),
                defaultHeight: Math.round(bounds.height)
            }
        });
        try {
            if (!finsembleWindow.windowOptions.customData.foreign.components["Window Manager"].persistWindowState) {
                return;
            }
        }
        catch (e) {
            //prop doesn't exist.
            return;
        }
    }
    ;
    /**
     * Minimizes window.
     * @param {function} [cb] Optional callback
     * @example
     * FSBL.Clients.WindowClient.minimize();
     */
    minimize(cb) {
        this.cacheBounds(function () {
            finsembleWindow.minimize(null, function (err) {
                if (!err) {
                    //self.windowState = "minimized";
                }
                else {
                    logger_1.default.system.error("WindowClient:minimize", err);
                }
                if (cb) {
                    cb(err);
                }
            });
        });
    }
    ;
    /**
     * Sets whether window is always on top.
     * @param {function} cb Optional callback
     * @example
     * FSBL.Clients.WindowClient.setAlwaysOnTop(true);
     */
    setAlwaysOnTop(alwaysOnTop, cb) {
        finsembleWindow.updateOptions({ options: { alwaysOnTop: alwaysOnTop } }, () => {
            if (cb)
                cb();
        });
    }
    /**
     * Restores window from a maximized or minimized state.
     * @param {function} cb Optional callback
     * @example
     * FSBL.Clients.WindowClient.restore();
     */
    restore(cb = (e, r) => { }) {
        //finsembleWindow.getState((err, windowState) => {
        finsembleWindow.restore(null, function (err) {
            if (!err) {
                //self.windowState = "normal";
            }
            else {
                logger_1.default.system.error("WindowClient:restore", err);
            }
            cb(err);
        });
    }
    ;
    /**
     * @private
     */
    cacheBounds(cb) {
        this.getBounds((err, bounds) => {
            if (err) {
                cb();
                return console.warn("Get bounds error.", err, "Window may not be registered with the window service");
            }
            finsembleWindow.updateOptions({
                options: {
                    cachedLeft: bounds.left,
                    defaultLeft: bounds.left,
                    cachedTop: bounds.top,
                    defaultTop: bounds.top,
                    cachedWidth: bounds.width,
                    defaultWidth: bounds.width,
                    cachedHeight: bounds.height,
                    defaultHeight: bounds.height
                }
            });
            if (cb) {
                cb(bounds);
            }
        });
    }
    /**
     * Maximizes the window. Also takes into account the application toolbar.
     * @param {function} cb Optional callback
     * @todo, when fixed components are a thing, make sure that maximize doesn't sit on top of them either.
     * @example
     * FSBL.Clients.WindowClient.maximize();
     */
    maximize(cb) {
        this.cacheBounds(function () {
            finsembleWindow.maximize();
            //finsembleWindow.windowState = "maximized";
            return cb();
        });
    }
    /**
     * FinWindow destructor (more or less). Removes all of the listeners that we added when the window was created.
     * @private
     */
    removeFinWindowEventListeners() {
        finsembleWindow.removeEventListener("maximized", this.onWindowMaximized);
        finsembleWindow.removeEventListener("restored", this.onWindowRestored);
        finsembleWindow.removeEventListener("blurred", this.onWindowBlurred);
        finsembleWindow.removeEventListener("focused", this.onWindowFocused);
        finsembleWindow.removeEventListener("close-requested", this.close);
        finsembleWindow.removeEventListener("minimized", this.onWindowMinimized);
        finsembleWindow.removeEventListener("parent-set", this.onParentSet);
    }
    ;
    /**
     * This function injects the header bar into all frameless windows that request it. This should only be used if you've decided not to use the provided <code>WindowClient.start()</code> method.
     *
     * **NOTE:** If you are using the finsemble windowTitleBar component, you do not need to call this function.
     * @private
     */
    injectDOM(headerHeight) {
        //for the aesthetics.
        if (document.getElementById("FSBLHeader")) {
            return;
        }
        // On slow loading components, the end user might have the opportunity to scroll the page before the window title bar is injected.
        // This triggers a chromium bug related to elements with position:fixed. Chromium loses track of where that element actually is on
        // the browser page. Chromium *thinks* the title bar is lower than it actually is, by the amount of pixels scrolled by the user.
        // The fix is to force the scroll position back to zero before we inject this fixed element.
        window.scrollTo(0, 0);
        // Now inject the window title bar
        var template = document.createElement("div");
        template.innerHTML = "<div id=\"FSBLHeader\"" + (headerHeight ? " style=height:" + headerHeight : "") + "></div>";
        document.body.insertBefore(template.firstChild, document.body.firstChild);
    }
    ;
    /**
     * Injects the windowTitleBar into the window.
     * @param {function} cb Callback function
     * @return {object} Reference to a RouterClient.query
     * @private
     */
    injectFSBL(params, cb) {
        //This flag is set by the launcher service. It tells us if FSBL was injected
        this.routerClient.query(`WindowService-Request-injectTitleBar`, { config: finsembleWindow.windowOptions, titleComponent: params.component }, (err, response) => {
            if (params.bodyMarginTop == "auto") {
                let setHeaderHeight = () => {
                    let header = document.getElementsByClassName("fsbl-header")[0];
                    if (!header) { //wait for header to be rendered
                        return setTimeout(setHeaderHeight, 100);
                    }
                    let headerHeight = window.getComputedStyle(header, null).getPropertyValue("height");
                    document.body.style.marginTop = headerHeight;
                    if (params.bumpElements && params.bumpElements.bumpBy === "auto") {
                        params.bumpElements.bumpBy = headerHeight;
                        this.bumpFixedElements(params.bumpElements);
                    }
                };
                setHeaderHeight();
            }
            if (cb) {
                cb(err, response);
            }
        });
    }
    ;
    /**
     * Given a field, this function retrieves app state. If no params are given you get the full state
     * @param {object} params
     * @param {string} [params.field] field
     * @param {Array.<string>} [params.fields] fields
     * @param {function} cb Callback
     * @example <caption>The example below shows how we retrieve data to restore the layout in our charts.</caption>
     * FSBL.Clients.WindowClient.getComponentState({
     *	 field: 'myChartLayout',
     * }, function (err, state) {
     * 	importLayout(state);
     * });
     *
     * FSBL.Clients.WindowClient.getComponentState({
     * 		fields: ['myChartLayout', 'chartType'],
     * }, function (err, state) {
     * 	var chartType = state['chartType'];
     * 	var myChartLayout = state['myChartLayout'];
     * });
     **/
    getComponentState(params, cb) {
        if (!params) {
            params = {};
        }
        if (params.fields && !Array.isArray(params.fields)) {
            params.fields = [params.fields];
        }
        validate_1.default.args(params, "object", cb, "function");
        if (finsembleWindow) {
            return finsembleWindow.getComponentState(params, cb);
        }
        logger_1.default.system.warn("Attempt to use getComponentState before component is ready or in a service");
        //if (!finWindow) { finWindow = System.Window.getCurrent(); } //TODO: why are we checking here??
        if (!params.windowName)
            params.windowName = window.name; // using FSBL in services causes errors because finsembleWindow does not exist
        var hash = this.getContainerHash(params.windowName);
        storageClient_1.default.get({ topic: constants_1.WORKSPACE.CACHE_STORAGE_TOPIC, key: hash }, (err, response) => {
            if (err) {
                logger_1.default.system.error("Error retrieving window client's component state.");
                cb(err);
                return;
            }
            var data = response;
            if (response && params.field) {
                this.componentState = data || {};
                cb(err, data[params.field]);
            }
            else if (params.fields) {
                var respObject = {};
                for (var i = 0; i < params.fields.length; i++) {
                    if (data[params.fields[i]]) {
                        respObject[params.fields[i]] = data[params.fields[i]];
                    }
                }
                return cb(null, respObject);
            }
            else if (response) {
                return cb(null, data);
            }
            else {
                logger_1.default.system.info("WindowClient:getComponentState:error, response, params", err, response, params);
                cb("Not found", response);
            }
        });
    }
    ;
    /**
     * Given a field, this function sets and persists app state.
     * @param {object} params
     * @param {string} [params.field] field
     * @param {Array.<string>} [params.fields] fields
     * @param {function} cb Callback
     * @example <caption>The example below shows how we save our chart layout when it changes.</caption>
     * var s = stx.exportLayout(true);
     * //saving layout'
     * FSBL.Clients.WindowClient.setComponentState({ field: 'myChartLayout', value: s });
     * FSBL.Clients.WindowClient.setComponentState({ fields: [{field:'myChartLayout', value: s }, {field:'chartType', value: 'mountain'}]);
     **/
    setComponentState(params, cb = (e, r) => { }) {
        validate_1.default.args(params, "object", cb, "function=") && validate_1.default.args2("params.field", params.field, "string");
        if (finsembleWindow) {
            return finsembleWindow.setComponentState(params, cb);
        }
        // using FSBL in services causes errors because finsembleWindow does not exist
        if (!params.windowName)
            params.windowName = window.name;
        var hash = this.getContainerHash(params.windowName);
        let fields = params.fields;
        if (typeof params.field === "undefined") {
            // If the user hasn't provided field or fields, exit.
            if (!fields) {
                return cb({
                    message: "setComponentState requires a field parameter or a fields parameter. Neither were provided.",
                    code: "invalid_arguments"
                });
            }
        }
        else {
            fields = [{
                    field: params.field,
                    value: params.value
                }];
        }
        for (let i = 0; i < fields.length; i++) {
            let field = fields[i];
            if (!field.field || !field.value) {
                continue;
            }
            this.componentState[field.field] = field.value;
        }
        let _params = {
            field: params.field || "",
            value: params.value,
            windowName: params.windowName
        };
        storageClient_1.default.save({ topic: constants_1.WORKSPACE.CACHE_STORAGE_TOPIC, key: hash, value: this.componentState }, function (err, response) {
            if (cb) {
                cb(err, response);
            }
        });
    }
    /**
     * Given a field, this function removes it from app state.
     * @param {object} params
     * @param {string} [params.field] field
     * @param {Array.<string>} [params.fields] fields
     * @param {string} [params.windowName] The name of the window to remove component state from
     * @param {function} [cb] Callback
     * @example <caption>The example below shows how we remove our chart layout when it no longer needed.</caption>
     * // remove unused state value
     * FSBL.Clients.WindowClient.removeComponentState({ field: 'myChartLayout'});
     * FSBL.Clients.WindowClient.removeComponentState({ fields: [{field:'myChartLayout'}, {field:'chartType'}]);
     **/
    async removeComponentState(params, cb = (e, r) => { }) {
        validate_1.default.args(params, "object", cb, "function=") &&
            validate_1.default.args2("params.field", params.field, "string");
        const wrap = finsembleWindow || (await FinsembleWindow_1.FinsembleWindow.getInstance({ name: params.windowName || window.name }));
        return wrap.removeComponentState(params, cb);
    }
    /**
     * Gets the window name of current window or the parent, if tabbed.
     */
    getWindowNameForDocking() {
        let parent = finsembleWindow.parentWindow;
        return parent ? parent.name : finsembleWindow.name;
    }
    /**
     * Gets containerHash given a containerId.
     * @param {string} windowName The name of the window
     * @returns {string} Hash for the window
     * @private
     */
    getContainerHash(windowName) {
        return util.camelCase(this.windowHash, windowName);
    }
    /**
     * Forms a group with any window that is touching the border of this window.
     * @private
     */
    formGroup() {
        let windowName = this.getWindowNameForDocking();
        this.routerClient.transmit("DockingService.formGroup", { windowName });
    }
    /**
     * This function is critical if you want docking and snapping to work. It transmits a message to the LauncherService, which registers it as a dockable window.
     *
     * **NOTE:** If you are using the finsemble windowTitleBar component, you do not need to call this function.
     * @param {object} params Parameters
     * @param {function} cb callback
     *
     * @example
     * FSBL.Clients.WindowClient.registerWithDockingManager();
     * @private
     */
    registerWithDockingManager(params, cb) {
        if (finsembleWindow.parentWindow) {
            // TABBING TBD: need more orderly startup with state managed from just one place (StackWindowManagerService also controls register/deregister)
            logger_1.default.system.debug("registerWithDockingManager ignore registration request if has a parent");
            if (cb)
                cb(); // return without error because still want component to come up
        }
        var windowName = finsembleWindow.name;
        var uuid = finsembleWindow.uuid;
        this.startedRegistrationWithDocking = true;
        this.routerClient.query("DockingService.registerWindow", {
            name: windowName,
            uuid: uuid,
            options: params || {},
            windowType: "OpenFinWindow"
        }, () => {
            this.startedRegistrationWithDocking = false;
            if (this.deregisterPlease) {
                this.deregisterWithDockingManager();
                this.deregisterPlease = false;
            }
            logger_1.default.system.debug("WINDOW LIFECYCLE: Docking Registration complete.");
            if (cb) {
                cb();
            }
        });
    }
    /**
     * This function is critical if you don't want to keep references of windows in the LauncherService after they close. It simply notifies the LauncherService that the window is no longer dockable. It's invoked when the window is closed.
     * **NOTE:** If you are using the finsemble windowTitleBar component, you do not need to call this function.
     * @param {boolean} removeFromWorkspace true to remove from workspace
     * @example
     * FSBL.Clients.WindowClient.deregisterWithDockingManager();
     * @private
     */
    deregisterWithDockingManager(removeFromWorkspace) {
        if (this.startedRegistrationWithDocking) {
            this.deregisterPlease = true;
        }
        var windowName = finsembleWindow.name;
        this.routerClient.transmit("DockingService.deregisterWindow", {
            name: windowName,
            userInitiated: removeFromWorkspace
        });
    }
    ;
    /**
     * @private
     */
    enableHotkeys() {
        this.enableDevToolsHotkey();
        this.enableReloadHotkey();
    }
    /**
     * Helper function to display dev-tools if you disable context-menus on your chromium windows. You must call this function if you want the hotkey to work.
     * @private
     */
    enableReloadHotkey() {
        window.addEventListener("keydown", function (e) {
            if (e.keyCode === 82 && e.altKey && e.ctrlKey) {
                system_1.System.clearCache({
                    cache: true,
                    cookies: false,
                    localStorage: false,
                    appcache: true,
                    userData: false
                });
                window.location.reload();
            }
        });
    }
    /**
     * Helper function to display dev-tools if you disable context-menus on your chromium windows. You must call this function if you want the hotkey to work.
     * @private
     */
    enableDevToolsHotkey() {
        window.addEventListener("keydown", function (e) {
            if (e.keyCode === 68 && e.altKey && e.ctrlKey) {
                var application = system_1.System.Application.getCurrent();
                application.getManifest(function (manifest) {
                    var uuid = manifest.startup_app.uuid;
                    var windowName = finsembleWindow.name;
                    system_1.System.showDeveloperTools(uuid, windowName);
                }, function (err) {
                    logger_1.default.system.error("dev-tools", err);
                });
            }
        });
    }
    /**
     * Bumps top-level containers down below the windowTitleBar.
     * @private
     */
    bumpFixedElements(params) {
        if (!params || !(params.absolute || params.fixed)) {
            return;
        }
        var elems = document.body.getElementsByTagName("*");
        var len = elems.length;
        for (var i = 0; i < len; i++) {
            if (elems[i].id === "FSBLHeader" || elems[i].classList.contains("fsbl-header")) {
                continue;
            }
            var style = window.getComputedStyle(elems[i], null), possibleZeros = ["0", "0px", 0];
            var topStyle = style.getPropertyValue("top");
            //only target top-level fixed/absolutely positioned containers.
            if (params.absolute && elems[i].parentNode === document.body && style.getPropertyValue("position") == "absolute") {
                if (params.absolute == "all") {
                    elems[i].style.top = "calc(" + topStyle + " + " + params.bumpBy + ")";
                }
                else if (params.absolute == "0Positioned" && possibleZeros.includes(topStyle)) {
                    elems[i].style.top = params.bumpBy;
                }
            }
            else if (params.fixed && style.getPropertyValue("position") == "fixed") {
                if (params.fixed == "all") {
                    elems[i].style.top = "calc(" + topStyle + " + " + params.bumpBy + ")";
                }
                else if (params.fixed == "0Positioned" && possibleZeros.includes(topStyle)) {
                    elems[i].style.top = params.bumpBy;
                }
            }
        }
    }
    /**
     * Forces window to sit on top of other windows.
     * @example
     * FSBL.Clients.WindowClient.bringWindowToFront();
     */
    bringWindowToFront() {
        finsembleWindow.isShowing(function (err, isShowing) {
            if (isShowing) {
                finsembleWindow.bringToFront({ forceFocus: true }, function (err) {
                    if (err) {
                        logger_1.default.system.error("WindowClient.bringWindowToFront: failure:" + err);
                    }
                    else {
                        logger_1.default.system.info("WindowClient.bringWindowToFront: success");
                    }
                });
            }
        });
    }
    /**
     * The Finsemble Window Title Bar is injected if FSBLHeader: true or FSBLHeader is an object with the same items as the properties of params below as this function is in the component's config. If you want to inject the Finsemble header later, you can do so by calling this function
     * @param {object} 	[params]
     * @param {string} [params.component] Component to inject. Default is "windowTitleBar"
     * @param {object} [params.bumpElements]
     * @param {boolean|string} [params.bumpElements.fixed] Either false, "all" or "0Positioned". If all, all fixed elements are moved. 0Positioned only moves elements that have top 0. Default is all.
     * @param {boolean|string} [params.bumpElements.absolute] Either false, "all" or "0Positioned". If all, all fixed elements are moved. 0Positioned only moves elements that have top 0. Only applies to children of the body. Default is all.
     * @param {string} [params.bumpElements.bumpBy] Sets the amount to bump elements by (e.g. "25px"). Default is "auto" which will measure the height of the injected component when rendered.
     * @param {string} [params.bodyMarginTop] Sets the body margin (e.g. "25px"). Default is "auto" which will measure the height of the injected component when rendered.
     * @param {string} [params.forceHeaderHeight] Sets a height on the main FSBLHeader div. Either false or a specified height (e.g. "25px").
     */
    injectHeader(params, cb = () => { }) {
        //FIXME(Terry) windowService should inject directly from a config:
        // components."*".component.inject|preload="windowTitleBar.js" <-- set the windowTitleBar
        // components."welcome".component.inject|preload="windowTitleBar.js" <-- override the windowTitleBar
        // Everything from here down then goes into windowTitleBar.jsx inside FSBLReady()
        let self = this;
        if (this.hasHeader)
            return;
        this.hasHeader = true;
        var defaultParams = {
            component: "windowTitleBar",
            bumpElements: {
                fixed: "all",
                absolute: "all",
                bumpBy: "auto"
            },
            bodyMarginTop: "auto",
            forceHeaderHeight: false
        };
        //this will catch true, false, or undefined.
        if (typeof params !== "object") {
            params = defaultParams;
        }
        else {
            params = Object.assign(defaultParams, params);
        }
        this.injectDOM(params.forceHeaderHeight);
        if (params.bumpElements && params.bumpElements.bumpBy !== "auto") {
            this.bumpFixedElements(params.bumpElements);
        }
        if (params.bodyMarginTop && params.bodyMarginTop !== "auto") {
            document.body.style.marginTop = params.bodyMarginTop;
        }
        // initialize but if child of a stacked window then don't register with docking
        //finsembleWindow.getParent();
        self.injectFSBL(params, cb);
    }
    /**
     * @private
     */
    injectStylesheetOverride() {
        var node = document.createElement("style");
        node.type = "text/css";
        node.appendChild(document.createTextNode(finsembleWindow.windowOptions.customData.cssOverride));
        document.body.appendChild(node);
    }
    /**
     * If we spawned this openfin app from our parent application, we listen on that application for certain events that might fire _if_ our parent goes down. If the parent goes down, we want to kill its children as well.
     * @private
     */
    checkIfChildApp() {
        if (finsembleWindow.windowOptions &&
            finsembleWindow.windowOptions.customData &&
            finsembleWindow.windowOptions.customData.parentUUID &&
            finsembleWindow.windowOptions.customData.parentUUID !== system_1.System.Application.getCurrent().uuid) {
            let parent = system_1.System.Application.wrap(finsembleWindow.windowOptions.customData.parentUUID);
            parent.addEventListener("crashed", this.close.bind(null, false));
            parent.addEventListener("initialized", this.close.bind(null, false));
            parent.addEventListener("out-of-memory", this.close.bind(null, false));
        }
    }
    /**
     * Prevents the browser's default behavior of loading files/images if they're dropped anywhere in the window.
     * If a component has a drop area that _doesn't_ preventDefault, the image/file will still be loaded.
     * This only prevents bad behavior from happening when the user drops an image/file on part of the window that _isn't_ listening for drag/drop events (usually by accident).
     * @private
     */
    preventUnintendedDropEvents() {
        function preventDefault(e) { e.preventDefault(); }
        window.addEventListener("dragover", preventDefault, false);
        window.addEventListener("drop", preventDefault, false);
    }
    /**
    * If the user presses windows key + left or right it causes all kinds of abhorrent behavior. This function captures the hotkeys and essentially prevents the behavior.
    * @private
     */
    rejectWindowsKeyResizes() {
        let keysDown = {};
        //Responds to key events here in order to send router messages and determine whether a system-bounds-changed event should occur. Essentially, this is catching actions to allow Finsemble to respond to windows aero snap functionality.
        const onKeyUp = async (e) => {
            //If windows aero snap is disabled we check the list of captured keys and what was released to determine if an event needs to
            //be responded to. Basically, if this is disabled, we see if a Windows Key + Left/Right was released, if so, restore from the windows new bounds
            //which were set by the OS
            if (this.enableWindowsAeroSnap) {
                //If the key being released is the windows key, send a router message to docking
                if (e.key === "Meta") {
                    routerClientInstance_1.default.transmit("Finsemble.WindowService.WindowsKey", "up");
                }
            }
            else {
                let keys = Object.keys(keysDown);
                //which key was just pressed.
                let ArrowPressed = e.key === "ArrowLeft" || e.key === "ArrowRight";
                let WindowsKeyPressed = e.key === "Meta";
                //Which key was pressed previously.
                let ArrowIsDown = keys.includes("ArrowLeft") || keys.includes("ArrowRight");
                let WindowsKeyDown = keys.includes("Meta");
                //Either we pressed the arrow first or the windows key first. Doesn't matter. Code should still work.
                if ((ArrowIsDown && WindowsKeyPressed) || (WindowsKeyDown && ArrowPressed)) {
                    let { data: bounds } = await finsembleWindow.getBounds();
                    finsembleWindow.setBounds(bounds);
                }
                //Key isn't down any more. Delete it if it was down.
                //Added a timeout to better handle when someone is playing Beethoven's 5th Symphony on key chords.
                setTimeout(() => delete keysDown[e.key], 50);
            }
        };
        //Store the key on our object.
        const onKeyDown = (e) => {
            //If windows aero snap is disabled, add this new key to the list of 'tracked' (held down) keys.
            if (this.enableWindowsAeroSnap) {
                //If the key being pressed is the windows key, send a message to docking
                if (e.key === "Meta") {
                    routerClientInstance_1.default.transmit("Finsemble.WindowService.WindowsKey", "down");
                }
            }
            else {
                keysDown[e.key] = true;
            }
        };
        if (FSBL) {
            hotkeysClient_1.default.onReady(() => {
                //The browser's keyDown isn't capable of capturing keyChords if the first key pressed is the window's key. So we'll have to create a makeshift keystroke handler.
                //On keydown, we grab that key. Keyup can fire for different keys, so that's where the work happens.
                window.addEventListener("keyup", onKeyUp);
                window.addEventListener("keydown", onKeyDown);
            });
        }
    }
    /**
     * Adds listeners to handle hash changes and finWindow listeners.
     * @private
     * @param {function} cb
     */
    addListeners(cb = Function.prototype) {
        var self = this;
        this.listenForHashChanges();
        this.preventUnintendedDropEvents();
        this.rejectWindowsKeyResizes();
        //FinsembleWindow listeners
        //@todo, make the openfin window trigger an event on the finsemble window, which will emit up. we then use addListener instead of addEventListener
        finsembleWindow.addListener("setParent", () => {
            logger_1.default.system.info("WindowClient.setParent deregisterWithDockingManager");
            this.deregisterWithDockingManager(); // stack takes care of this too but doesn't work at startup or workspace switch so do again here
        });
        finsembleWindow.addEventListener("maximized", this.onWindowMaximized);
        finsembleWindow.addEventListener("minimized", this.onWindowMinimized);
        finsembleWindow.addEventListener("restored", this.onWindowRestored);
        // On Blur remove the border from window
        finsembleWindow.addEventListener("blurred", this.onWindowBlurred);
        // On focus add a border to the window
        finsembleWindow.addEventListener("focused", this.onWindowFocused);
        finsembleWindow.addEventListener("parent-set", this.onParentSet);
        if (typeof FSBL !== "undefined") {
            FSBL.onShutdown(() => {
                logger_1.default.system.info("WINDOW LIFECYCLE:SHUTDOWN: FSBL.onShutdown start");
                return new Promise((resolve) => {
                    logger_1.default.system.debug("FSBL.onShutdown");
                    FSBL.shutdownComplete();
                    this.close({
                        removeFromWorkspace: false,
                        ignoreParent: true,
                        closeWindow: false
                    }, resolve);
                });
            });
        }
        cb();
    }
    ;
    /**
     * Sends a command to the header. Commands affect the header state,
     * so that the UI reflects what is going on in the component window.
     * @param {string} command The state object to set
     * @param {object} state The new state (merged with existing)
     * @private
     */
    updateHeaderState(command, state) {
        if (!this.commandChannel) {
            return;
        }
        this.commandChannel(command, state);
    }
    /**
     * Establishes a command channel with a header. The WindowClient can
     * update header state via this channel.
     * @param {function} commandChannel A function callback that receives commands
     */
    headerCommandChannel(commandChannel) {
        this.commandChannel = commandChannel;
    }
    /**
     * Ejects the window from the docking group
     * @private
     */
    ejectFromGroup() {
        let windowName = this.getWindowNameForDocking();
        routerClientInstance_1.default.query("DockingService.leaveGroup", {
            name: windowName
        }, () => { });
    }
    /**
     * This function does two things:
     *
     * 1. It sets the window's title in the windowTitleBar component, and
     * 2. It sets the title in the DOM.
     *
     * This is useful if you like to keep the window's title in sync with a piece of data (e.g., a Symbol);
     * @param {String} title Window title.
     * @todo Allow HTML or classes to be injected into the title.
     * @example <caption>The code shows how you would change your window title.</caption>
     *  FSBL.Clients.WindowClient.setWindowTitle("My Component's New Title");
     */
    setWindowTitle(title) {
        validate_1.default.args(title, "string");
        this.title = title;
        //document.title = title;  // causes flickering in chromium 53
        this.updateHeaderState("Main", { windowTitle: title });
        finsembleWindow.setTitle(title);
    }
    /**
     * Retrieves data that was set with {@link LauncherClient#spawn}.
     * @return {object} The data or empty object if no data was set. *Note, this will never return null or undefined.*
     */
    getSpawnData() {
        if (!this.options.customData) {
            return {};
        }
        var spawnData = this.options.customData.spawnData;
        if (typeof spawnData === "undefined") {
            return {};
        }
        return spawnData;
    }
    ;
    /**
     * Returns a reference to the current window for the *component*. For most
     * components this will just return the finWindow, but for a compound component
     * it will return a CompoundWindow.
     * @returns {finWindow}
     */
    getCurrentWindow() {
        return system_1.System.Window.getCurrent();
    }
    ;
    /**
     * For the DOM element that has been passed in, this function returns a bounding box that is relative
     * to the OpenFin virtual monitor space. That is, it returns the position of the DOM element on the desktop.
     * @param {HTMLElement|string} element A selector or HTMLElement
     * @private
     * @todo convert to use monitor util function and make sure current bounds are correct. For some windows (e.g., toolbars/menus that don't track their own bounds because they don't have drag regions), options.default will represent the data _on spawn_, not the bounds when the function is called.
     */
    getDesktopBoundingBox(element) {
        var el = element;
        if (typeof (element) === "string") {
            el = document.querySelector(element);
        }
        let box = el.getBoundingClientRect();
        let boundingBox = {
            top: this.options.defaultTop - box.top,
            left: this.options.defaultLeft + box.left,
            width: box.width,
            height: box.height,
            right: 0,
            bottom: 0
        };
        boundingBox.right = boundingBox.left + boundingBox.width;
        boundingBox.bottom = boundingBox.top + boundingBox.height;
        return boundingBox;
    }
    /**
     * @private
     */
    isPointInBox(point, box) {
        if (!box.bottom)
            box.bottom = box.top + box.height;
        if (!box.right)
            box.right = box.left + box.width;
        return (point.x > box.left && point.x < box.right && point.y < box.bottom && point.y > box.top);
    }
    ;
    /**
     * Returns (via callback) true if the mouse is currently located (hovering) over the requested element.
     * @param {HTMLElement|string} element The element, or a selector, to check
     * @param {function} cb A function that returns a boolean
     * @private
     */
    isMouseOverDOMElement(element, cb) {
        var boundingBox = this.getDesktopBoundingBox(element);
        system_1.System.getMousePosition((err, position) => {
            cb(this.isPointInBox(position, boundingBox));
        });
    }
    ;
    /**
     * Returns the window identifier for the current component.
     * @returns {windowIdentifier}
     */
    getWindowIdentifier() {
        var componentType = null;
        if (this.options && this.options.customData && this.options.customData.component)
            componentType = this.options.customData.component.type;
        return {
            windowName: finsembleWindow ? finsembleWindow.name : window.name,
            uuid: finsembleWindow ? finsembleWindow.uuid : null,
            componentType: componentType
        };
    }
    ;
    /**
     * Highlights the window as active by creating a border around the window.
     *
     * @param {boolean} active  Set to false to turn off activity
     * @private
     */
    setActive(active) {
        if (active) {
            addClass(document.documentElement, "desktop-active");
        }
        else {
            removeClass(document.documentElement, "desktop-active");
        }
    }
    ;
    /**
     * Returns the bounds for the current window.
     * @param {function} cb
     */
    getBounds(cb) {
        finsembleWindow.getBounds(function (err, bounds) {
            cb(err, bounds);
        });
    }
    ;
    /**
     * This is used by the Finsemble Window Title Bar when a tab is dragged for tiling or tabbing.
     * @param {*} params - params.windowIdentifier is required.
     * @param {*} cb
     */
    startTilingOrTabbing(params, cb = Function.prototype) {
        FSBL.Clients.RouterClient.transmit("DockingService.startTilingOrTabbing", params);
        cb();
    }
    ;
    /**
     * This is used to cancel a tabbing or tiling operation.
     * @param {*} params - put windowIdentifier in params.windowIdentifier. If not provided, must set params.waitForIdentifier true
     * @param {*} cb
     */
    cancelTilingOrTabbing(params, cb = Function.prototype) {
        console.debug("CancelTilingOrTabbing");
        routerClientInstance_1.default.transmit("DockingService.cancelTilingOrTabbing", params);
        cb();
    }
    ;
    /**
     * This is used to let Finsemble know which window is being dragged. params.windowIdentifier must be the identifier of the tab being dragged. This is only used if the identifier is unknown when startTilingOrTabbing is called.
     * @param {*} params - windowIdentifier is required
     * @param {*} cb
     */
    sendIdentifierForTilingOrTabbing(params, cb = Function.prototype) {
        FSBL.Clients.RouterClient.transmit("DockingService.identifierForTilingOrTabbing", params);
        cb();
    }
    ;
    /**
     * This function is used by the Finsemble Window Title Bar to end tiling or tabbing.
     * @param {*} params
     * @param {object} params.mousePosition Where the pointer is on the screen
     * @param {number} params.mousePosition.x X position of the pointer
     * @param {number} params.mousePosition.y Y position of the pointer
     * @param {boolean} allowDropOnSelf Determines whether a tab can be dropped on the window where the drag originated.
     * @param {*} cb
     */
    stopTilingOrTabbing(params, cb = Function.prototype) {
        // We both transmit and query because no stack operation should happen until this is done and there are a lot of listeners around.
        const transmitAndQueryStop = () => {
            routerClientInstance_1.default.query("DockingService.stopTilingOrTabbing", params, () => {
                cb();
            });
            routerClientInstance_1.default.transmit("DockingService.stopTilingOrTabbing", params);
        };
        // Get the mouse position if not passed through for transmit to the router,
        // If allowDropOnSelf is true, it came from a tab/window drop event. Run the callback.
        if (!params.mousePosition) {
            return system_1.System.getMousePosition((err, position) => {
                params.mousePosition = position;
                transmitAndQueryStop();
                if (!params.allowDropOnSelf)
                    return cb();
            });
        }
        else {
            transmitAndQueryStop();
            if (!params.allowDropOnSelf)
                return cb();
        }
    }
    ;
    /**
     * Gets the stackedWindow (if this window is a child of a stacked window).
     *
     * If no stacked window then returns null.  But if null and params.create is set, then the stacked window will be automatically created and this window added as the first child.
     *
     * (Typically used by Tabbing Presentation component to manage tabs.)
     *
     * @param {object=} params
     * @param {array=} params.create if true and StackedWindow isn't defined, then it will be created
     * @param {array=} params.windowIdentifiers if creating, then can optionally specify an array of other windowIdentifiers to add to stack on creation (in addition to this window).
     * @param {function} cb cb(err, stackedWindowIdentifier)
     *
     * Typically used by Tabbing Presentation component.
     *
     */
    getStackedWindow(params, cb) {
        logger_1.default.system.debug("WindowClient.getStackedWindow", params);
        cb = cb || params;
        params = params || {};
        params.windowIdentifiers = params.windowIdentifiers || [];
        if (!finsembleWindow.parentWindow && params.create) {
            let onParentSet = (evt) => {
                let parentName = evt.data.parentName;
                finsembleWindow.setParent({ windowName: parentName }, (err2, windowWrapper) => {
                    cb(err2, windowWrapper);
                });
                finsembleWindow.removeListener("parent-set", onParentSet);
            };
            finsembleWindow.addListener("parent-set", onParentSet);
            FSBL.Clients.LauncherClient.spawn("StackedWindow", {
                windowType: "StackedWindow", data: { windowIdentifiers: params.windowIdentifiers }, options: { newStack: true }
            }, function (err, windowInfo) {
                logger_1.default.system.debug("WindowClient.getStackedWindow-success", err, windowInfo);
                if (!err) {
                    return;
                }
                cb(err, null);
            });
        }
        else {
            finsembleWindow.getParent(cb);
        }
    }
    /**
     * Private copy of getMonitorInfo from LauncherClient. We have to include it here to avoid a circular reference between LauncherClient and WindowClient.
     * @private
     */
    getMonitorInfo(params, cb) {
        util.getMyWindowIdentifier((myWindowIdentifier) => {
            if (!params.windowIdentifier) {
                params.windowIdentifier = myWindowIdentifier;
            }
            this.routerClient.query("Launcher.getMonitorInfo", params, function (err, response) {
                if (cb) {
                    cb(err, response.data);
                }
            });
        });
    }
    ;
    /**
     * Automatically resizes the height of the window to fit the full DOM of the current window..
     * @param {object} [params]
     * @param {object} [params.padding]
     * @param {number} [params.padding.height] How much padding around the DOM to add to the height of the window
     * @param {number} [params.padding.width] How much padding around the DOM to add to the width of the window
     * @param {number} [params.maxHeight] Maximum height to make the window
     * @param {number} [params.maxWidth] Maximum width to make the window
     * @param {function} cb Optional callback when complete
     */
    fitToDOM(params, cb) {
        var children = document.body.children;
        var element = document.getElementsByTagName("body")[0], style = window.getComputedStyle(element), marginTop = style.getPropertyValue("margin-top"), marginBottom = style.getPropertyValue("margin-bottom");
        var margin = parseInt(marginTop, 10) + parseInt(marginBottom, 10);
        if (isNaN(margin))
            margin = 0;
        var newHeight = margin;
        var newWidth = this.options.width;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            newHeight += child.offsetHeight + margin;
            //elmMargin = parseInt(child.style.marginTop, 10) + parseInt(child.style.marginBottom, 10);
        }
        if (typeof (params) === "function") {
            cb = params;
            params = null;
        }
        if (params && params.padding) {
            if (params.padding.height) {
                newHeight += params.padding.height;
            }
            if (params.padding.width) {
                newWidth += params.padding.width;
            }
        }
        if (params && params.maxHeight && newHeight > params.maxHeight) {
            newHeight = params.maxHeight;
        }
        logger_1.default.system.debug("WindowClient.FitToDOM:newHeight", newHeight, params);
        //@todo, do this statically
        this.getMonitorInfo({}, (err, monitorInfo) => {
            //Logger.system.log("updates111 in here");
            let fixBounds = true;
            if (newHeight >= monitorInfo.unclaimedRect.height) {
                newHeight = monitorInfo.unclaimedRect.height;
                fixBounds = true;
            }
            if (newWidth >= monitorInfo.unclaimedRect.width) {
                newWidth = monitorInfo.unclaimedRect.width;
                fixBounds = true;
            }
            if (fixBounds) {
                //bounds.x and bounds.y are null on mac. Not sure if they're set on windows, but this manifested itself with an error on macs that didn't resize.
                logger_1.default.system.debug("WindowClient.FitToDOM:fixBounds", newHeight, newWidth);
                finsembleWindow.getBounds((err, bounds) => {
                    bounds.width = newWidth;
                    bounds.height = newHeight;
                    finsembleWindow.setBounds({ bounds }, cb);
                });
            }
            else if (cb) {
                setTimeout(cb, 0);
            }
        });
    }
    /**
     * Kicks off all of the necessary methods for the app. It
     * 1. Injects the header bar into the window.
     * 2. Sets up listeners to handle close and move requests from the application.
     * 3. Adds a listener that saves the window's state every time it's moved or resized.
     * @param {function} callback
     * See the [windowTitleBar tutorial](tutorial-UIComponents.html#window-title-bar) for more information.
     * @private
     */
    async start(callback = Function.prototype) {
        validate_1.default.args(callback, "function");
        const self = this;
        const finsembleConfig = await configClient_1.default.getValue("finsemble");
        const deliveryMechanism = finsembleConfig.data["Window Manager"].deliveryMechanism ||
            constants_1.DELIVERY_MECHANISM.PRELOAD;
        let customData = null, isCompoundWindow = false, shouldInjectCSS = false, componentSupportsHeader = false;
        //where we store componentState for the window.
        this.componentState = {};
        let getFinsembleWindow = (done) => {
            FinsembleWindow_1.FinsembleWindow.getInstance({ name: this.finWindow.name, uuid: this.finWindow.uuid }, (err, response) => {
                logger_1.default.system.debug(`FinsembleWindow.getInstance ${this.finWindow.name}`);
                if (err == "Cannot Wrap Service Manager or Services") {
                    this.isInAService = true;
                    this.windowHash = util.camelCase("activeWorkspace", window.name);
                    return done();
                }
                if (err || !response) {
                    logger_1.default.system.error("wrap failure", err);
                }
                this.finsembleWindow = response;
                finsembleWindow = this.finsembleWindow;
                this.windowHash = util.camelCase("activeWorkspace", finsembleWindow.name);
                this.addListeners();
                this.routerClient.subscribe("Finsemble.WorkspaceService.groupUpdate", (err, res) => this.groupUpdateHandler(err, res));
                done();
            });
        };
        /**
         * @private
         */
        getFinsembleWindow(() => {
            this.retrieveMonitorDimensions();
            this.getInitialOptions(() => {
                //The functions above are necessary to finish initializing the windowClient. The functions below are independent of one another.
                // Note the extra test on the names is to ignore services that are including the windowClient, which needs to be removed
                if (!finsembleWindow || !finsembleWindow.windowOptions) {
                    if (!this.isInAService) {
                        logger_1.default.system.error("Something went wrong attempting to get the current window.");
                    }
                    return callback();
                }
                customData = finsembleWindow.windowOptions.customData;
                if (customData) {
                    isCompoundWindow = lodashGet(customData, 'window.compound', false);
                    if (customData.cssOverride) {
                        logger_1.default.system.debug("Window has cssOverride. See local window to inspect object");
                        shouldInjectCSS = true;
                    }
                    componentSupportsHeader = !isCompoundWindow && lodashGet(customData, ['foreign', 'components', 'Window Manager', 'FSBLHeader'], false);
                }
                async_1.parallel([
                    function injectCSS(done) {
                        if (shouldInjectCSS) {
                            self.injectStylesheetOverride();
                        }
                        done();
                    },
                    function injectHeader(done) {
                        logger_1.default.system.debug('Will attempt to inject header.');
                        if (componentSupportsHeader && deliveryMechanism === constants_1.DELIVERY_MECHANISM.INJECTION) {
                            self.injectHeader(customData.foreign.components["Window Manager"].FSBLHeader, done);
                        }
                        else {
                            done();
                        }
                    },
                    function setupAeroSnap(done) {
                        //Get the 'enableWindowsAeroSnap' variable from the docking config and set this windows instance
                        configClient_1.default.getValue('finsemble', (err, config) => {
                            if (err) {
                                logger_1.default.system.error("Error reading windowService config from finsemble");
                            }
                            let aeroSnap = config.services.windowService.config.enableWindowsAeroSnap;
                            self.enableWindowsAeroSnap = configUtil_1.ConfigUtilInstance.getDefault(config, "config.servicesConfig.docking.enableWindowsAeroSnap", aeroSnap);
                            done();
                        });
                    },
                    function registerWithDocking(done) {
                        /**
                         * Checks the config for a deprecated value or new value under windowService, or dockingService if windowService doesn't exist.
                         * @param {array || string} deprecatedValues The deprecated value, if its an array, its multiple values to check for
                         * @param {string} newValue The new value to check for if the deprecated value doesn't exist
                         * @param {boolean} defaultVal The default value if the prop is not found under both windowService and dockingService
                         */
                        const checkDeprecatedAndCompare = (params) => {
                            //Ex. params.baseString = "customData.foreign.services";
                            //Ex. params.newPath = "windowService"
                            //Ex. searchString = "customData.foreign.services.windowService"
                            let searchString = params.baseString + "." + params.newPath;
                            //Checks for new path - new properties
                            let value = configUtil_1.ConfigUtilInstance.getDefault(customData, searchString + "." + params.newValue, null);
                            // console.log('checked for ', searchString, '.', params.newValue, ' and result is: ', value);
                            if (value === null) {
                                searchString = params.baseString + "." + params.oldPath;
                                //Checks for old path - new properties
                                value = configUtil_1.ConfigUtilInstance.getDefault(customData, searchString + "." + params.newValue, null);
                                // console.log('checked for ', searchString, '.', params.newValue, ' and result is: ', value);
                                if (value === null) {
                                    if (Array.isArray(params.oldValue)) {
                                        for (let i = 0; i < params.oldValue.length; i++) {
                                            let depVal = params.oldValue[i];
                                            searchString = params.baseString + "." + params.oldPath;
                                            value = configUtil_1.ConfigUtilInstance.getDefault(customData, searchString + "." + depVal, null);
                                            // console.log('checked for ', searchString + "." + depVal, ' and result is: ', value);
                                            if (value !== null)
                                                break;
                                        }
                                    }
                                    else {
                                        searchString = params.baseString + "." + params.oldPath;
                                        //Checks for old path - old properties
                                        value = configUtil_1.ConfigUtilInstance.getDefault(customData, searchString + "." + params.oldValue, params.default);
                                        // console.log('checked for ', searchString, '.', params.oldValue, ' and result is: ', value);
                                    }
                                }
                            }
                            // console.log('returning: ', value)
                            return value;
                        };
                        // Additional function to register any dockable components with docking.
                        // This will make docking aware of those dockable windows
                        // and allow control over docking to window edges/moving windows out of claimed space
                        if (customData && customData.component && customData.component.type !== "service") {
                            let manageMovement = configUtil_1.ConfigUtilInstance.getDefault(customData, "customData.foreign.services.windowService.manageWindowMovement", false);
                            if (!manageMovement) {
                                manageMovement = configUtil_1.ConfigUtilInstance.getDefault(customData, "customData.foreign.services.dockingService.manageWindowMovement", false);
                            }
                            let FSBLHeader = configUtil_1.ConfigUtilInstance.getDefault(customData, "customData.foreign.components.Window Manager.FSBLHeader", false);
                            let isDockable = configUtil_1.ConfigUtilInstance.getDefault(customData, "customData.window.dockable", false);
                            //If 'manageWindowMovement' wasn't found, we still want to register with docking (and manage window movement) if the component isDockable or has an FSBLHeader
                            manageMovement = manageMovement || FSBLHeader || isDockable;
                            //Checks the config for deprecated props 'isArrangable' and 'isArrangeable'. If neither of these is found, will search 'allowAutoArrange'
                            let autoArrange = checkDeprecatedAndCompare({
                                baseString: "customData.foreign.services",
                                newPath: "windowService",
                                oldPath: "dockingService",
                                oldValue: ["isArrangable", "isArrangeable"],
                                newValue: "allowAutoArrange",
                                default: manageMovement
                            });
                            //If the component wants its movement managed (or to be auto-arrangeable) it should register with docking
                            let shouldRegister = manageMovement || autoArrange;
                            if (!shouldRegister)
                                return done();
                            //Checks the config for deprecated prop 'ignoreSnappingRequests'. If not found, will search 'allowSnapping'.
                            customData.window.snapping = checkDeprecatedAndCompare({
                                baseString: "customData.foreign.services",
                                newPath: "windowService",
                                oldPath: "dockingService",
                                oldValue: "ignoreSnappingRequests",
                                newValue: "allowSnapping",
                                default: manageMovement
                            });
                            //Since 'allowSnapping' is essentially 'if true enable' and 'ignoreSnappingRequests' is essentially 'if true disable' we need to toggle this value depending on what prop was found. The core code still uses 'ignoreSnappingRequests'.
                            if (customData && customData.foreign && customData.foreign.services) {
                                let service = customData.foreign.services.windowService !== undefined ? "windowService" : "dockingService";
                                if (customData.foreign.services[service].ignoreSnappingRequests !== undefined) {
                                    customData.window.snapping = !customData.foreign.services[service].ignoreSnappingRequests;
                                }
                            }
                            //Checks for an ephemeral component. Ephemeral components don't snap
                            const ephemeral = configUtil_1.ConfigUtilInstance.getDefault(customData, "customData.window.ephemeral", false);
                            if (ephemeral && !customData.window.snapping) {
                                customData.window.snapping = false;
                            }
                            //Checks the config for the deprecated prop 'ignoreTilingAndTabbingRequests'. If not found, will search 'allowTiling'.
                            customData.window.tiling = checkDeprecatedAndCompare({
                                baseString: "customData.foreign.services",
                                newPath: "windowService",
                                oldPath: "dockingService",
                                oldValue: "ignoreTilingAndTabbingRequests",
                                newValue: "allowTiling",
                                default: manageMovement
                            });
                            //Checks the config for deprecated prop 'ignoreTilingAndTabbingRequests'. If not found, will search 'allowTabbing'.
                            customData.window.tabbing = checkDeprecatedAndCompare({
                                baseString: "customData.foreign.services",
                                newPath: "windowService",
                                oldPath: "dockingService",
                                oldValue: "ignoreTilingAndTabbingRequests",
                                newValue: "allowTabbing",
                                default: manageMovement
                            });
                            //Since 'allowTiling'/'allowTabbing' is essentially 'if true enable' and 'ignoreTilingAndTabbingRequests' is essentially 'if true disable' we need to toggle this value depending on what prop was found.
                            if (customData && customData.foreign && customData.foreign.services) {
                                let service = customData.foreign.services.windowService !== undefined ? "windowService" : "dockingService";
                                if (customData.foreign.services[service].ignoreTilingAndTabbingRequests !== undefined) {
                                    customData.window.tiling = !customData.window.tiling;
                                    customData.window.tabbing = !customData.window.tabbing;
                                }
                            }
                            //Checks the deprecated config prop 'canGroup'. If not found, will search 'allowGrouping'.
                            customData.window.canGroup = checkDeprecatedAndCompare({
                                baseString: "customData.foreign.services",
                                newPath: "windowService",
                                oldPath: "dockingService",
                                oldValue: "canGroup",
                                newValue: "allowGrouping",
                                default: manageMovement
                            });
                            //Checks the config for deprecated prop 'canMinimize'. If not found, will search 'allowMinimize'
                            customData.window.canMinimize = checkDeprecatedAndCompare({
                                baseString: "customData.foreign.services",
                                newPath: "windowService",
                                oldPath: "dockingService",
                                oldValue: "canMinimize",
                                newValue: "allowMinimize",
                                default: undefined
                            });
                            /** The canMinimize and canMaximize config could be one
                             * of two locations. In a future (4.0) version, we should
                             * consolidate this to one location.
                             */
                            if (customData.window.canMinimize === undefined) {
                                customData.window.canMinimize = customData.component.canMinimize;
                                if (customData.window.canMinimize === undefined) {
                                    customData.window.canMinimize = manageMovement;
                                }
                            }
                            if (customData.window.canMaximize === undefined) {
                                customData.window.canMaximize = customData.component.canMaximize;
                                if (customData.window.canMaximize === undefined) {
                                    customData.window.canMaximize = manageMovement;
                                }
                            }
                            //Determines whether a dockable component should retrieve its state from memory, or start with default (config defined) options every time
                            customData.window.overwriteStartDocked = configUtil_1.ConfigUtilInstance.getDefault(customData, "customData.foreign.services.workspaceService.global", false);
                            self.registerWithDockingManager(customData.window, () => {
                                self.cacheInitialBounds(done);
                            });
                        }
                        else {
                            return done();
                        }
                    }
                ], (err, results) => callback(err, results));
            });
        });
    }
    ;
}
var windowClient = new WindowClient({
    startupDependencies: {
        services: ["storageService", "windowService"]
    },
    onReady: function (cb) {
        windowClient.start(cb);
    },
    name: "windowClient"
});
exports.default = windowClient;


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
Object.defineProperty(exports, "__esModule", { value: true });
/*
Overview of how this works:
-hotkeys are added/removed via methods, passing an array of strings representing keys pressed, a handler method, and (optionally) a callback

-When adding a hotkey, a node js event emitter is created on the client side to trigger the hotkey handler, and a router message is sent to the service to register the key combination with the window name on the client side. Multiple hotkeys may be created for the same key combination, so long as they have different handler functions.

-When the service detects that all of the keys in the hotkey combination are pressed, it sends a message on the "HotkeyTriggered" channel (the method for this is "ListenForHotkeys") which contains the list of all windows registered with that hotkey combination. The client then reads the list of windows, and checks if it's one of those windows. If it is, it fires off the node js event emitter that was registered for that hotkey.

-Removing a hotkey clears the corresponding event emitter, and also sends a router message to the service to remove its window id from the array of windows registered for the hotkey combination - if the window is registered with that hotkey combination multiple times, it will only remove one, allowing other hotkeys on the same window with the same key combination to still be registered.

*/
const baseClient_1 = __webpack_require__(7);
const routerClientInstance_1 = __webpack_require__(5);
const logger_1 = __webpack_require__(0);
const keyMap = __webpack_require__(45).dictionary;
/** The global `window` object. We cast it to a specific interface here to be
 * explicit about what Finsemble-related properties it may have. */
const Globals = window;
const events_1 = __webpack_require__(12);
var eventEmitter = new events_1.EventEmitter();
/**
 * Translates an array representing a key combination, each element of which represents a key, using keyDict, an object containing key-value pairs where the untranslated key representations are the keys, and the translated versions ready to be used by the service are the values.
 *
 * If you'd like to create a keymap for translation, look at the values of the keymaps included in the common folder.
 * @private
 * @param {object} params
 * @param {object} params.keys array representing untranslated key representations
 * @param {object} keyDict
 */
function translateKeys(params, keyDict = keyMap) {
    var translatedKeys = [];
    params.keys.forEach((key) => {
        if (!(typeof key === "string")) {
            return logger_1.default.system.error("FSBL.Clients.HotkeyClient - one of the keys passed into a function was not a string: ", key);
        }
        key = key.toLowerCase();
        let mappedKey = keyDict[key];
        if (mappedKey) {
            translatedKeys.push(mappedKey);
        }
        else {
            return logger_1.default.system.error(`FSBL.Clients.HotkeyClient - At least one of the key codes does not map to a supported key - registering hotkey unsuccessful. Unsupported keys: ${key}`);
        }
    });
    return translatedKeys;
}
// Keystroke capture class taken from ChartIQ charting library
const Keystroke = function (cb) {
    this.cb = cb;
    this.shift = false;
    this.ctrl = false;
    this.cmd = false;
    this.capsLock = false;
    this.initialize();
};
Keystroke.prototype.keyup = function (e) {
    switch (e.key) {
        case "Shift":
            this.shift = false;
            this.cb({ key: e.key, e: e, keystroke: this });
            return;
        case "Control":
        case "Alt":
            this.ctrl = false;
            this.cb({ key: e.key, e: e, keystroke: this });
            return;
        case "Meta":
        case "Win":
            this.cmd = false;
            this.cb({ key: e.key, e: e, keystroke: this });
            return;
        default:
            break;
    }
    // This is where we handle the keystroke, regardless of whether we captured the key with a down or press event
    // The exception to this is the arrow keys, which are processed in keydown
    if (this.key)
        this.cb({ key: this.key, e: e, keystroke: this });
};
Keystroke.prototype.keydown = function (e) {
    if (this.noKeyCapture)
        return;
    this.key = e.key;
    switch (e.key) {
        case "Meta":
        case "Win":
            this.cmd = true;
            break;
        case "Shift":
            this.shift = true;
            break;
        case "Control":
        case "Alt":
            this.ctrl = true;
            break;
        case "CapsLock":
            this.capsLock = !this.capsLock;
            break;
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight":
        case "Up":
        case "Down":
        case "Left":
        case "Right":
            // If you hold a key down, then keydown will repeat. These are the keys
            // that we want to capture repeat action.
            this.key = null;
            this.cb({ key: e.key, e: e, keystroke: this });
            break;
    }
};
Keystroke.prototype.keypress = function (e) {
    if (this.noKeyCapture)
        return;
    var keyCode = e.which;
    if (keyCode < 32 || keyCode > 222)
        return; // handled by keydown
    this.key = e.key;
};
/**
 * initializes member functions
 * @memberof CIQ.UI.Keystroke
 */
Keystroke.prototype.initialize = function () {
    var self = this;
    document.addEventListener("keyup", function (e) {
        self.keyup(e);
    });
    document.addEventListener("keydown", function (e) {
        self.downValue = e.key;
        self.keydown(e);
    });
    document.addEventListener("keypress", function (e) {
        self.keypress(e);
    });
    window.addEventListener("blur", function (e) {
        self.ctrl = false;
        self.cb({ key: "Control", e: e, keystroke: self });
    });
};
// Used to keep track of which browser key combinations are registered locally
var registeredBrowserKeys = [];
class HotkeyClient extends baseClient_1._BaseClient {
    constructor(params) {
        super(params);
        /**
         * Automatically unregister all hotkeys when the window containing the client closes
         * @param {function} cb
         * @private
         */
        this.onClose = (cb) => {
            this.removeAllHotkeys(cb);
        };
        this.keyMap = keyMap;
        this.listenForHotkeys = this.listenForHotkeys.bind(this);
        this.routerClient = routerClientInstance_1.default;
        this.routerClient.onReady(this.listenForHotkeys);
        //Local hotkeys need to only fire if the window is focused. The object below is a map of handlers passed in by the user.
        //The keys are the handler, and the value is the wrapped method that checks for focus.
        this.localListeners = {};
    }
    /**
     *Adds a local hotkey, firing only when the window calling the method is in focus. If you execute this function more than once for the same key combination, both hotkeys will coexist, and would need to be remove separately.
     * @param {Array.<string>} keyArr Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
     * @param {function} handler Function to be executed when the hotkey combination is pressed. It is recommended that you define a variable to represent the handler function, as the same function must be passed in order to remove the hotkey.
     * @param {function} cb Callback to be called after local hotkey is added.
     * @example
     * var myFunction = function () {...}
     * FSBL.Clients.HotkeyClient.addLocalHotkey(["ctrl","shift","s"],myFunction,cb)
     */
    addLocalHotkey(keyArr, handler, cb = (err, response) => { }) {
        logger_1.default.system.info("HotkeyClient.addLocalHotkey");
        logger_1.default.system.debug("HotkeyClient.addLocalHotkey, keyArr: ", keyArr);
        let keyString = translateKeys({ keys: keyArr }).sort().toString();
        //We create a new function that checks focus before invoking the method.
        //If assimilation wasn't on, we'd want to use window.addEventListener('keydown');
        let wrap = () => {
            if (document.hasFocus()) {
                handler();
            }
        };
        //Keep a reference to the handler so when the dev wants to remove it, we can.
        if (!this.localListeners[keyString]) {
            this.localListeners[keyString] = {};
        }
        this.localListeners[keyString][handler] = wrap;
        eventEmitter.addListener(keyString, wrap);
        this.routerClient.query("hotkeysService.registerGlobalHotkey", { "keys": keyString, windowName: this.windowName }, cb);
    }
    /**
     *Adds a local hotkey, firing only when the window calling the method is in focus. If you execute this function more than once for the same key combination, both hotkeys will coexist, and would need to be remove separately.
     * This function uses browser key capture, so it will work when assimilation is not running
     * @param {Array} [keyArr] Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
     * @param {function} [handler] Function to be executed when the hotkey combination is pressed. It is recommended that you define a variable to represent the handler function, as the same function must be passed in order to remove the hotkey.
     * @param {function} cb Callback to be called after local hotkey is added.
     * @todo Have addLocalHotkey automatically use this when assimilation is not running. Will eventually replace addLocalHotkey.
     * @private
     * @example
     * var myFunction = function () {...}
     * FSBL.Clients.HotkeyClient.addBrowserHotkey(["ctrl","shift","s"],myFunction,cb)
     */
    addBrowserHotkey(keyArr, handler) {
        // Lazily create a keystroke handler for this web page if one doesn't already exist
        if (!this.KeyStroke) {
            this.KeyStroke = new Keystroke(function (params) {
                let { key, keystroke } = params;
                var myKeyArray = [key];
                if (keystroke.ctrl)
                    myKeyArray.push("control");
                if (keystroke.shift)
                    myKeyArray.push("shift");
                if (keystroke.alt)
                    myKeyArray.push("alt");
                let myKeyString = myKeyArray.sort().toString();
                registeredBrowserKeys.forEach(function (obj) {
                    if (obj.keyString === myKeyString)
                        obj.handler();
                });
            });
        }
        let keyString = translateKeys({ keys: keyArr }).sort().toString();
        registeredBrowserKeys.push({ keyString: keyString, handler: handler });
    }
    /**
     *Removes a local hotkey.
     * @param {Array.<string>} keyArr Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
     * @param {function} handler Handler registered for the hotkey to be removed.
     * @param {function} cb Callback to be called after local hotkey is removed.
     * @example
     *
     * FSBL.Clients.HotkeyClient.removeLocalHotkey(["ctrl","shift","s"],myFunction,cb)
     */
    removeLocalHotkey(keyArr, handler, cb = (err, response) => { }) {
        logger_1.default.system.info("HotkeyClient.removeLocalHotkey");
        logger_1.default.system.debug("HotkeyClient.removeLocalHotkey, keyArr: ", keyArr);
        let keyString = translateKeys({ keys: keyArr }).sort().toString();
        let wrap = this.localListeners[keyString][handler];
        eventEmitter.removeListener(keyString, wrap);
        this.routerClient.query("hotkeysService.unregisterGlobalHotkey", { "keys": keyString, windowName: this.windowName }, cb); //TODO: query
    }
    /**
     *Adds a global hotkey, firing regardless of what window is in focus. If you execute this function more than once for the same key combination, both hotkeys will coexist, and would need to be remove separately.
     * @param {Array.<string>} keyArr Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
     * @param {function} handler Function to be executed when the hotkey combination is pressed. It is recommended that you define a variable to represent the handler function, as the same function must be passed in order to remove the hotkey.
     * @param {function} cb Callback to be called after local hotkey is added.
     * @example
     * var myFunction = function () {...}
     * FSBL.Clients.HotkeyClient.addGlobalHotkey(["ctrl","shift","s"],myFunction,cb)
     */
    addGlobalHotkey(keyArr, handler, cb = (err, response) => { }) {
        logger_1.default.system.info("HotkeyClient.addGlobalHotkey");
        logger_1.default.system.debug("HotkeyClient.addGlobalHotkey, keyArr: ", keyArr);
        let keyString = translateKeys({ keys: keyArr }).sort().toString();
        eventEmitter.addListener(keyString, handler);
        this.routerClient.query("hotkeysService.registerGlobalHotkey", { "keys": keyString, windowName: this.windowName }, cb);
    }
    /**
     *Removes a global hotkey.
     * @param {Array.<string>} keyArr Array of strings representing hotkey key combination. We're not very picky about exactly what strings you use - for example "control", "ctrl" and "CTRL" all work for the control key.
     * @param {function} handler Handler registered for the hotkey to be removed.
     * @param {function} cb Callback to be called after local hotkey is removed.
     * @example
     *
     * FSBL.Clients.HotkeyClient.removeGlobalHotkey(["ctrl","shift","s"],myFunction,cb)
     */
    removeGlobalHotkey(keyArr, handler, cb = (err, response) => { }) {
        logger_1.default.system.info("HotkeyClient.removeGlobalHotkey");
        logger_1.default.system.debug("HotkeyClient.removeGlobalHotkey, keyArr: ", keyArr);
        let keyString = translateKeys({ keys: keyArr }).sort().toString();
        eventEmitter.removeListener(keyString, handler);
        this.routerClient.query("hotkeysService.unregisterGlobalHotkey", { "keys": keyString, windowName: this.windowName }, cb); //TODO: query
    }
    /**
     * Not yet implemented - will return an object that contains all registered Hotkeys
     */
    /* getHotkeys() { //TODO: MAKE WORK
        Logger.system.info("HotkeyClient.getHotkeys");
        this.routerClient.transmit("hotkeysService.getRegisteredHotkeys", { request: true });
    } */
    /**
     * Handler for "hotkey triggered" messages from the service, called upon client initialization.
     * @private
     */
    listenForHotkeys() {
        var self = this;
        this.routerClient.addListener("HotkeyTriggered", function (error, response) {
            if (error) {
                console.error("Hotkey Channel Error: " + JSON.stringify(error));
            }
            else {
                if (response.data.windows.includes(self.windowName)) { //if this is one of the windows that the service means to trigger here
                    eventEmitter.emit(response.data.keys);
                }
            }
        });
    }
    /**
     * Unregister all hotkeys, both locally and service-side.
     * @param {function} cb Optional callback function
     *
     */
    removeAllHotkeys(cb) {
        eventEmitter.removeAllListeners();
        this.routerClient.query("hotkeysService.removeAllHotkeysForWindow", { windowName: this.windowName }, cb);
    }
}
var hotkeyClient = new HotkeyClient({
    startupDependencies: {
        services: ["hotkeysService"]
    },
    onReady: function (cb) {
        if (cb) {
            cb();
        }
    },
    name: "hotkeyClient"
});
// @TODO - use proper exports instead of global scope.
Globals.Keystroke = Keystroke;
exports.default = hotkeyClient;


/***/ }),
/* 45 */
/***/ (function(module, exports) {

module.exports = {"dictionary":{"0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","backspace":"backspace","bs":"backspace","bksp":"backspace","tab":"tab","escape":"escape","esc":"escape","clear":"clear","enter":"enter","return":"enter","shift":"shift","shft":"shift","lshift":"shift","lshft":"shift","left shift":"shift","leftshift":"shift","rshift":"shift","rshft":"shift","right shift":"shift","rightshift":"shift","control":"control","ctrl":"control","alt":"alt","alternate":"alt","pause":"pause","caps lock":"caps lock","capslock":"caps lock","spacebar":"spacebar","space":"spacebar","space bar":"space","page up":"page up","pgup":"page up","pg up":"page up","page down":"page down","pgdn":"page down","pg dn":"page down","end":"end","home":"home","left arrow":"left arrow","left":"left arrow","up arrow":"up arrow","up":"up arrow","right arrow":"right arrow","right":"right arrow","down arrow":"down arrow","down":"down arrow","select":"select","slct":"select","print":"print","prnt":"print","execute":"execute","print screen":"print screen","printscreen":"print screen","print scrn":"print screen","printscrn":"print screen","prnt scrn":"print screen","prntscrn":"print screen","prt scrn":"print screen","prtscrn":"print screen","prt scn":"print screen","prtscn":"print screen","prt scr":"print screen","prtscr":"print screen","prt sc":"print screen","prtsc":"print screen","pr sc":"print screen","prsc":"print screen","insert":"insert","ins":"insert","delete":"delete","del":"delete","help":"help","a":"a","b":"b","c":"c","d":"d","e":"e","f":"f","g":"g","h":"h","i":"i","j":"j","k":"k","l":"l","m":"m","n":"n","o":"o","p":"p","q":"q","r":"r","s":"s","t":"t","u":"u","v":"v","w":"w","x":"x","y":"y","z":"z","windows":"windows","left windows":"windows","right windows":"windows","applications":"applications","computer sleep":"computer sleep","sleep":"computer sleep","numpad 0":"0","numpad 1":"1","numpad 2":"2","numpad 3":"3","numpad 4":"4","numpad 5":"5","numpad 6":"6","numpad 7":"7","numpad 8":"8","numpad 9":"9","f1":"f1","fn1":"f1","function 1":"f1","f2":"f2","fn2":"f2","function 2":"f2","f3":"f3","fn3":"f3","function 3":"f3","f4":"f4","fn4":"f4","function 4":"f4","f5":"f5","fn5":"f5","function 5":"f5","f6":"f6","fn6":"f6","function 6":"f6","f7":"f7","fn7":"f7","function 7":"f7","f8":"f8","fn8":"f8","function 8":"f8","f9":"f9","fn9":"f9","function 9":"f9","f10":"f10","fn10":"f10","function 10":"f10","f11":"f11","fn11":"f11","function 11":"f11","f12":"f12","fn12":"f12","function 12":"f12","f13":"f13","fn":"f13","function 13":"f13","f14":"f14","fn14":"f14","function 14":"f14","f15":"f15","fn15":"f15","function 15":"f15","f16":"f16","fn16":"f16","function 16":"f16","num lock":"num lock","numlock":"num lock","number lock":"num lock","numeric lock":"num lock","scroll lock":"scroll lock","sclk":"scroll lock","scrlk":"scroll lock","slk":"scroll lock","menu":"menu","*":"*","+":"+","-":"-","/":"/",";":";","=":"=",",":",","_":"-",".":".","`":"`","[":"[","]":"]","'":"'"},"assimilationMap":{"1":"lmb","2":"rmb","4":"mmb","8":"backspace","9":"tab","13":"enter","16":"shift","17":"control","18":"alt","19":"pause","20":"caps lock","27":"escape","32":"spacebar","33":"page up","34":"page down","35":"end","36":"home","37":"left arrow","38":"up arrow","39":"right arrow","40":"down arrow","41":"select","42":"print","43":"execute","44":"print screen","45":"insert","46":"delete","47":"help","48":"0","49":"1","50":"2","51":"3","52":"4","53":"5","54":"6","55":"7","56":"8","57":"9","65":"a","66":"b","67":"c","68":"d","69":"e","70":"f","71":"g","72":"h","73":"i","74":"j","75":"k","76":"l","77":"m","78":"n","79":"o","80":"p","81":"q","82":"r","83":"s","84":"t","85":"u","86":"v","87":"w","88":"x","89":"y","90":"z","91":"windows","92":"windows","93":"applications","95":"computer sleep","96":"0","97":"1","98":"2","99":"3","100":"4","101":"5","102":"6","103":"7","104":"8","105":"9","106":"*","107":"+","109":"-","111":"/","112":"f1","113":"f2","114":"f3","115":"f4","116":"f5","117":"f6","118":"f7","119":"f8","120":"f9","121":"f10","122":"f11","123":"f12","124":"f13","125":"f14","126":"f15","127":"f16","144":"num lock","145":"scroll lock","160":"shift","161":"shift","162":"control","163":"control","164":"alt","165":"alt","186":";","187":"=","188":",","189":"-","190":".","191":"/","192":"`","219":"[","220":"\\","221":"]","222":"\\","223":"'","//note, backtick and apostrophe":"are reversed on uk and us keyboards"}}

/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __webpack_require__(12);
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
class FinsembleEvent extends events_1.EventEmitter {
    constructor(params) {
        super();
        this.cancelable = false;
        this.delayable = false;
        this.delayed = false;
        if (params.event)
            this.event = params.event;
        if (params.cancelable)
            this.cancelable = true;
        if (params.data)
            this.data = params.data;
        if (params.delayable)
            this.delayable = true;
    }
    wait() {
        if (this.delayable)
            this.delayed = true;
    }
    cancel() {
        if (this.cancelable) {
            this.emit("done", {
                canceled: true
            });
        }
    }
    done() {
        this.emit("done", {
            canceled: false
        });
    }
    setData(data) {
        this.data = data;
    }
}
exports.FinsembleEvent = FinsembleEvent;


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const routerClientInstance_1 = __webpack_require__(5);
const logger_1 = __webpack_require__(0);
const events_1 = __webpack_require__(12);
class WindowEventManager extends events_1.EventEmitter {
    /**
    * Array of events that we're subscribed to remotely. When receiving a remote event, the event manager will emit a local event.
    * @type {WindowEventName[]}
    * @memberof WindowEventManager
    */
    constructor(params) {
        super();
        this.windowName = params.name;
        this.remoteEventSubscriptions = {};
        //array of events we're listening for. to prevent multiple router listeners for the same event.
        this.listeningFor = [];
        this.setMaxListeners(25);
    }
    _addListener(event, listener) {
        super.addListener(event, listener);
    }
    /**
     * Disconnects all router listeners. Removes all listeners added to the event emitter.
     * @memberof WindowEventManager
     */
    cleanup() {
        logger_1.default.system.info("WindowEventManager.cleanup", this.windowName);
        //removes listeners added to the event emitter.
        this.removeAllListeners();
        //removes listeners added to the RouterClient.
        let eventSubscriptions = Object.keys(this.remoteEventSubscriptions);
        logger_1.default.system.info("WRAP CLOSE. WindowEventManager.cleanup. Removing router subscriptions", this.windowName, eventSubscriptions);
        eventSubscriptions.forEach(channelName => {
            let handlers = this.remoteEventSubscriptions[channelName];
            handlers.forEach(handler => {
                routerClientInstance_1.default.removeListener(channelName, handler);
            });
        });
    }
    /**
     * Single point of entry to the eventEmitter's `emit` method. This will be called when the router listener is fired in response to an event happening somewhere else in the system. Could also be triggered by an event fired from the underlying wrapper.
     *
     * @private
     * @param {WindowEventName} eventName
     * @param {WindowEvent | BoundsChangeEvent} data
     * @memberof WindowEventManager
     */
    emitLocalEvent(eventName, data) {
        logger_1.default.system.info("WindowEventManager.emitLocalEvent. Emitting Event", this.windowName, eventName, data);
        this.emit(eventName, data);
    }
    /**
     * Returns router channel name for a given window event + window name combination.
     *
     * @param {WindowEventName} eventName
     * @returns {string}
     * @memberof WindowEventManager
     */
    getChannelName(eventName) {
        return `WindowService-Event-${this.windowName}-${eventName}`;
    }
    /**
     * Adds a router listener for remote events if we are not already listening for that event. If the optional handler is passed in, will add a local event listener to be triggered the next time the event fires.
     *
     * @param {WindowEventName} eventName
     * @param {Function} [handler]
     * @memberof WindowEventManager
     */
    listenForRemoteEvent(eventName, handler) {
        logger_1.default.system.debug("WindowEventManager.listenForRemoteEvent", this.windowName, eventName);
        let channelName = this.getChannelName(eventName);
        const remoteEventHandler = (err, response) => {
            logger_1.default.system.debug("WindowEventManager. Received remote event", this.windowName, eventName);
            if (err) {
                throw new Error(err);
            }
            //todo need to accommodate wrap-state-changed events in here...maybe?
            let data = { eventName, name: this.windowName };
            if (eventName.includes("bounds") || eventName.includes("parent")) {
                //bounds events need to push out more data than just name/eventName. ...response.data will destructure the object and copy them into this new object.
                data = Object.assign({ eventName }, response.data);
            }
            if (!response.originatedHere()) {
                logger_1.default.system.debug("WindowEventManager. Received remote event emitted", this.windowName, eventName, data);
                this.emitLocalEvent(eventName, data);
            }
        };
        //We only want one router listener per event. Otherwise, we'll emit the same event multiple times.
        if (!this.listeningFor.includes(eventName)) {
            this.listeningFor.push(eventName);
            logger_1.default.system.debug("WindowEventManager.listenForRemoteEvent. Adding listener to the router", this.windowName, eventName);
            //When the remote event is triggered, emit an event locally.
            routerClientInstance_1.default.addListener(channelName, remoteEventHandler);
            //If a handler is passed in, listen locally for the event to be thrown.
            logger_1.default.system.debug("WindowEventManager.listenForRemoteEvent. Handler included, adding listener to local event emitter", this.windowName, eventName);
            this.rememberRouterChannelForLaterRemoval(channelName, remoteEventHandler);
        }
    }
    /**
     * Convenience function to allow wrap to receive multiple remote events. Dev would then need to add a handler for each event that they care about. May not be useful.
     *
     * @param {WindowEventName[]} eventList
     * @memberof WindowEventManager
     */
    listenForRemoteEvents(eventList) {
        //verbose because each event will be logged in listenForRemoteEvent.
        logger_1.default.system.verbose("WindowEventManager.listenForRemoteEvents. Listen for remote events", this.windowName, eventList);
        eventList.forEach(eventName => {
            this.listenForRemoteEvent(eventName);
        });
    }
    /**
     * Broadcasts an event to any event manager listening for this event.
     *
     * @param {WindowEventName} eventName
     * @param {WindowEvent | BoundsChangeEvent} data
     * @memberof WindowEventManager
     */
    transmitRemoteEvent(eventName, data) {
        logger_1.default.system.debug("WindowEventManager.transmitRemoteEvent. Transmitting event to public wrappers", eventName, data);
        let channelName = this.getChannelName(eventName);
        routerClientInstance_1.default.transmit(channelName, data, { suppressWarnings: true });
    }
    /**
 * Used by the window implementations in the window service. This method will emit an event up to the local process, and transmit an event out to the rest of the system.
 * @private
 * @param {WindowEventName[]} eventName
 * @param {WindowEvent | BoundsChangeEvent} data
 * @memberof WindowEventManager
 */
    trigger(eventName, data) {
        logger_1.default.system.info("WindowEventManager.trigger. Event triggered. Event will be emitted locally and transmitted to public wrappers. Window Name", this.windowName, "Event name", eventName, "Event data", data);
        //If we have data, annotate it. Otherwise, create a generic window event.
        if (data) {
            data.name = this.windowName;
            data.eventName = eventName;
        }
        else {
            data = {
                name: this.windowName,
                eventName: eventName
            };
        }
        this.emitLocalEvent(eventName, data);
        this.transmitRemoteEvent(eventName, data);
    }
    ;
    /**
 * Currently we cannot have a special routerClient for every object. So this method will keep track of channel/listener combinations so we can cleanup when the wrap calls cleanup.
 *
 * @param {*} eventName
 * @param {*} handler
 * @memberof WindowEventManager
 */
    rememberRouterChannelForLaterRemoval(channelName, handler) {
        logger_1.default.system.debug("WindowEventManager.rememberRouterChannelForLaterRemoval.", channelName);
        if (!this.remoteEventSubscriptions[channelName]) {
            this.remoteEventSubscriptions[channelName] = [];
        }
        this.remoteEventSubscriptions[channelName].push(handler);
    }
    ;
}
exports.WindowEventManager = WindowEventManager;


/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, module) {/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    promiseTag = '[object Promise]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]',
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

/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/** Used to identify `toStringTag` values supported by `_.clone`. */
var cloneableTags = {};
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
cloneableTags[boolTag] = cloneableTags[dateTag] =
cloneableTags[float32Tag] = cloneableTags[float64Tag] =
cloneableTags[int8Tag] = cloneableTags[int16Tag] =
cloneableTags[int32Tag] = cloneableTags[mapTag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag] = cloneableTags[setTag] =
cloneableTags[stringTag] = cloneableTags[symbolTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag] = cloneableTags[funcTag] =
cloneableTags[weakMapTag] = false;

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

/**
 * Adds the key-value `pair` to `map`.
 *
 * @private
 * @param {Object} map The map to modify.
 * @param {Array} pair The key-value pair to add.
 * @returns {Object} Returns `map`.
 */
function addMapEntry(map, pair) {
  // Don't return `map.set` because it's not chainable in IE 11.
  map.set(pair[0], pair[1]);
  return map;
}

/**
 * Adds `value` to `set`.
 *
 * @private
 * @param {Object} set The set to modify.
 * @param {*} value The value to add.
 * @returns {Object} Returns `set`.
 */
function addSetEntry(set, value) {
  // Don't return `set.add` because it's not chainable in IE 11.
  set.add(value);
  return set;
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
      length = array ? array.length : 0;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
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
 * A specialized version of `_.reduce` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {*} [accumulator] The initial value.
 * @param {boolean} [initAccum] Specify using the first element of `array` as
 *  the initial value.
 * @returns {*} Returns the accumulated value.
 */
function arrayReduce(array, iteratee, accumulator, initAccum) {
  var index = -1,
      length = array ? array.length : 0;

  if (initAccum && length) {
    accumulator = array[++index];
  }
  while (++index < length) {
    accumulator = iteratee(accumulator, array[index], index, array);
  }
  return accumulator;
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
var Buffer = moduleExports ? root.Buffer : undefined,
    Symbol = root.Symbol,
    Uint8Array = root.Uint8Array,
    getPrototype = overArg(Object.getPrototypeOf, Object),
    objectCreate = Object.create,
    propertyIsEnumerable = objectProto.propertyIsEnumerable,
    splice = arrayProto.splice;

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
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  this.__data__ = new ListCache(entries);
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
  return this.__data__['delete'](key);
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
  var cache = this.__data__;
  if (cache instanceof ListCache) {
    var pairs = cache.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      return this;
    }
    cache = this.__data__ = new MapCache(pairs);
  }
  cache.set(key, value);
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
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  // Safari 9 makes `arguments.length` enumerable in strict mode.
  var result = (isArray(value) || isArguments(value))
    ? baseTimes(value.length, String)
    : [];

  var length = result.length,
      skipIndexes = !!length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (key == 'length' || isIndex(key, length)))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
      (value === undefined && !(key in object))) {
    object[key] = value;
  }
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
 * The base implementation of `_.assign` without support for multiple sources
 * or `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return object && copyObject(source, keys(source), object);
}

/**
 * The base implementation of `_.clone` and `_.cloneDeep` which tracks
 * traversed objects.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @param {boolean} [isFull] Specify a clone including symbols.
 * @param {Function} [customizer] The function to customize cloning.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The parent object of `value`.
 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, isDeep, isFull, customizer, key, object, stack) {
  var result;
  if (customizer) {
    result = object ? customizer(value, key, object, stack) : customizer(value);
  }
  if (result !== undefined) {
    return result;
  }
  if (!isObject(value)) {
    return value;
  }
  var isArr = isArray(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) {
      return copyArray(value, result);
    }
  } else {
    var tag = getTag(value),
        isFunc = tag == funcTag || tag == genTag;

    if (isBuffer(value)) {
      return cloneBuffer(value, isDeep);
    }
    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      if (isHostObject(value)) {
        return object ? value : {};
      }
      result = initCloneObject(isFunc ? {} : value);
      if (!isDeep) {
        return copySymbols(value, baseAssign(result, value));
      }
    } else {
      if (!cloneableTags[tag]) {
        return object ? value : {};
      }
      result = initCloneByTag(value, tag, baseClone, isDeep);
    }
  }
  // Check for circular references and return its corresponding clone.
  stack || (stack = new Stack);
  var stacked = stack.get(value);
  if (stacked) {
    return stacked;
  }
  stack.set(value, result);

  if (!isArr) {
    var props = isFull ? getAllKeys(value) : keys(value);
  }
  arrayEach(props || value, function(subValue, key) {
    if (props) {
      key = subValue;
      subValue = value[key];
    }
    // Recursively populate clone (susceptible to call stack limits).
    assignValue(result, key, baseClone(subValue, isDeep, isFull, customizer, key, value, stack));
  });
  return result;
}

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} prototype The object to inherit from.
 * @returns {Object} Returns the new object.
 */
function baseCreate(proto) {
  return isObject(proto) ? objectCreate(proto) : {};
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
 * The base implementation of `getTag`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  return objectToString.call(value);
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
 * Creates a clone of  `buffer`.
 *
 * @private
 * @param {Buffer} buffer The buffer to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Buffer} Returns the cloned buffer.
 */
function cloneBuffer(buffer, isDeep) {
  if (isDeep) {
    return buffer.slice();
  }
  var result = new buffer.constructor(buffer.length);
  buffer.copy(result);
  return result;
}

/**
 * Creates a clone of `arrayBuffer`.
 *
 * @private
 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function cloneArrayBuffer(arrayBuffer) {
  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
  return result;
}

/**
 * Creates a clone of `dataView`.
 *
 * @private
 * @param {Object} dataView The data view to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned data view.
 */
function cloneDataView(dataView, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
  return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
}

/**
 * Creates a clone of `map`.
 *
 * @private
 * @param {Object} map The map to clone.
 * @param {Function} cloneFunc The function to clone values.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned map.
 */
function cloneMap(map, isDeep, cloneFunc) {
  var array = isDeep ? cloneFunc(mapToArray(map), true) : mapToArray(map);
  return arrayReduce(array, addMapEntry, new map.constructor);
}

/**
 * Creates a clone of `regexp`.
 *
 * @private
 * @param {Object} regexp The regexp to clone.
 * @returns {Object} Returns the cloned regexp.
 */
function cloneRegExp(regexp) {
  var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
  result.lastIndex = regexp.lastIndex;
  return result;
}

/**
 * Creates a clone of `set`.
 *
 * @private
 * @param {Object} set The set to clone.
 * @param {Function} cloneFunc The function to clone values.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned set.
 */
function cloneSet(set, isDeep, cloneFunc) {
  var array = isDeep ? cloneFunc(setToArray(set), true) : setToArray(set);
  return arrayReduce(array, addSetEntry, new set.constructor);
}

/**
 * Creates a clone of the `symbol` object.
 *
 * @private
 * @param {Object} symbol The symbol object to clone.
 * @returns {Object} Returns the cloned symbol object.
 */
function cloneSymbol(symbol) {
  return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
}

/**
 * Creates a clone of `typedArray`.
 *
 * @private
 * @param {Object} typedArray The typed array to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned typed array.
 */
function cloneTypedArray(typedArray, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
}

/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function copyArray(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property identifiers to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Function} [customizer] The function to customize copied values.
 * @returns {Object} Returns `object`.
 */
function copyObject(source, props, object, customizer) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];

    var newValue = customizer
      ? customizer(object[key], source[key], key, object, source)
      : undefined;

    assignValue(object, key, newValue === undefined ? source[key] : newValue);
  }
  return object;
}

/**
 * Copies own symbol properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy symbols from.
 * @param {Object} [object={}] The object to copy symbols to.
 * @returns {Object} Returns `object`.
 */
function copySymbols(source, object) {
  return copyObject(source, getSymbols(source), object);
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
 * Creates an array of the own enumerable symbol properties of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = nativeGetSymbols ? overArg(nativeGetSymbols, Object) : stubArray;

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11,
// for data views in Edge < 14, and promises in Node.js.
if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
    (Map && getTag(new Map) != mapTag) ||
    (Promise && getTag(Promise.resolve()) != promiseTag) ||
    (Set && getTag(new Set) != setTag) ||
    (WeakMap && getTag(new WeakMap) != weakMapTag)) {
  getTag = function(value) {
    var result = objectToString.call(value),
        Ctor = result == objectTag ? value.constructor : undefined,
        ctorString = Ctor ? toSource(Ctor) : undefined;

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
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  var length = array.length,
      result = array.constructor(length);

  // Add properties assigned by `RegExp#exec`.
  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  return (typeof object.constructor == 'function' && !isPrototype(object))
    ? baseCreate(getPrototype(object))
    : {};
}

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {Function} cloneFunc The function to clone values.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, cloneFunc, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag:
      return cloneArrayBuffer(object);

    case boolTag:
    case dateTag:
      return new Ctor(+object);

    case dataViewTag:
      return cloneDataView(object, isDeep);

    case float32Tag: case float64Tag:
    case int8Tag: case int16Tag: case int32Tag:
    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
      return cloneTypedArray(object, isDeep);

    case mapTag:
      return cloneMap(object, isDeep, cloneFunc);

    case numberTag:
    case stringTag:
      return new Ctor(object);

    case regexpTag:
      return cloneRegExp(object);

    case setTag:
      return cloneSet(object, isDeep, cloneFunc);

    case symbolTag:
      return cloneSymbol(object);
  }
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
 * This method is like `_.clone` except that it recursively clones `value`.
 *
 * @static
 * @memberOf _
 * @since 1.0.0
 * @category Lang
 * @param {*} value The value to recursively clone.
 * @returns {*} Returns the deep cloned value.
 * @see _.clone
 * @example
 *
 * var objects = [{ 'a': 1 }, { 'b': 2 }];
 *
 * var deep = _.cloneDeep(objects);
 * console.log(deep[0] === objects[0]);
 * // => false
 */
function cloneDeep(value) {
  return baseClone(value, true, true);
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

module.exports = cloneDeep;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4), __webpack_require__(13)(module)))

/***/ }),
/* 49 */,
/* 50 */,
/* 51 */,
/* 52 */,
/* 53 */,
/* 54 */,
/* 55 */,
/* 56 */,
/* 57 */,
/* 58 */,
/* 59 */,
/* 60 */,
/* 61 */,
/* 62 */,
/* 63 */,
/* 64 */,
/* 65 */,
/* 66 */,
/* 67 */,
/* 68 */,
/* 69 */,
/* 70 */,
/* 71 */,
/* 72 */,
/* 73 */,
/* 74 */,
/* 75 */,
/* 76 */,
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
/* 89 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* WEBPACK VAR INJECTION */(function(process, module) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__baseService__ = __webpack_require__(32);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__baseService___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__baseService__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__clients_launcherClient__ = __webpack_require__(40);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__clients_launcherClient___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__clients_launcherClient__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__clients_storageClient__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__clients_storageClient__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__clients_configClient__ = __webpack_require__(15);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__clients_configClient___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3__clients_configClient__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__clients_logger__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__clients_logger___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__clients_logger__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_async__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_async___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_async__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

//replace with import when ready


__WEBPACK_IMPORTED_MODULE_1__clients_launcherClient___default.a.initialize();

__WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default.a.initialize();



let FINSEMBLE_CONFIG;
var RouterClient; // for linting
__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.log("Starting Authentication Service");

function PASSWORD(RouterClient) {
	this.RouterClient = RouterClient;
}

/**
 * Begins a PASSWORD authentication. This very simply launches the authentication component which is responsible for
 * checking credentials and calling authenticationClient.publishAuthorization()
 * @param {object} config - The authenticate profile associated with this instance. This is set in the config finsemble->authentication. Example is "startup".
 * @param {object} [spawnParams] - Parameters to pass to {@link LauncherClient#spawn}.
 * @param {function} cb
 */
PASSWORD.prototype.authenticate = function (config, spawnParams, cb) {
	__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:PASSWORD:authenticate");
	__WEBPACK_IMPORTED_MODULE_1__clients_launcherClient___default.a.spawn(config.component, spawnParams, function (err, msg) {
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:Authentication spawned");
		if (err) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error("Failed To Spawn Authentication Component: " + JSON.stringify(err));
		}
	});
};

function OAUTH2(RouterClient) {
	var self = this;
	this.RouterClient = RouterClient;
	this.tokens = {}; // Keeps track of CSRF tokens during authentication phase
	RouterClient.addResponder("authentication.completeOAUTH", function (err, queryEvent) {
		self.responseFromAuthorizationEndpoint(queryEvent);
	});
}

/**
 * Parses a JWT token and returns an object containing those name values
 * @param {object} token a JWT token
 * @private
 */
OAUTH2.prototype.parseJwt = function (token) {
	var base64Url = token.split(".")[1];
	var base64 = base64Url.replace("-", "+").replace("_", "/");
	return JSON.parse(window.atob(base64));
};

/**
 * Creates a default redirect_uri if one doesn't exist
 * @private
 */
OAUTH2.prototype.defaultRedirectURI = function (config, cb) {
	__WEBPACK_IMPORTED_MODULE_3__clients_configClient___default.a.getValue({ field: "finsemble.applicationRoot" }, function (err, applicationRoot) {
		config.redirect_uri = applicationRoot + "/components/authentication/oauthResponse.html";
		cb(true);
	});
};

/**
 * Validates that the required config items exist
 * @private
 */
OAUTH2.prototype.validate = function (config, cb) {
	var requiredFields = {
		authorization_endpoint: true,
		backchannel_endpoint: true,
		client_id: true
	};
	var error = "";
	for (var field in requiredFields) {
		if (!config[field]) {
			if (error != "") error += ",";
			error += field;
		}
	}
	if (error) {
		error = "OAUTH2 requires the following config items which are missing: " + error;
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error(error);
		cb(false);
		return;
	}
	if (!config.scope) config.scope = "openid email";
	if (!config.grant_type) config.grant_type = "authorization_code";
	if (!config.redirect_uri) {
		this.defaultRedirectURI(config, cb);
		return;
	}
	cb(true);
};

/**
 * Generates a CSRF token
 * @private
 */
OAUTH2.prototype.csrf = function () {
	var epoch = new Date();
	var id = epoch.getTime().toString(36);
	id += Math.floor(Math.random() * Math.pow(36, 2)).toString(36);
	return id.toUpperCase();
};
function DefaultSpawnParams(state, spawnParams) {
	if (!spawnParams) spawnParams = {};
	if (!spawnParams.options) spawnParams.options = {};
	if (!spawnParams.options.customData) spawnParams.options.customData = {};
	spawnParams.options.customData.OAuthState = state;
	return spawnParams;
}
/**
 * Begins an OAUTH2 authentication transaction. This requires an authentication profile in finsemble->authentication that contains
 * the following members: authorization_endpoint, backchannel_endpoint, client_id and redirect_uri
 * @param {object} config - The authenticate profile associated with this instance. This is set in the config finsemble->authentication. Example is "startup".
 * @param {object} [spawnParams] - Parameters to pass to {@link LauncherClient#spawn}.
 * @param {function} cb
 */
OAUTH2.prototype.authenticate = function (config, spawnParams, cb) {
	var self = this;
	this.validate(config, function (passed) {
		if (!passed) return;
		var response_type = "code";
		var state = self.csrf();
		self.tokens[state] = { config: config, cb: cb };
		try {
			var url = new URL(config.authorization_endpoint);
			var searchParams = url.searchParams;
			searchParams.set("client_id", config.client_id);
			searchParams.set("response_type", response_type);
			searchParams.set("scope", config.scope);
			searchParams.set("redirect_uri", config.redirect_uri);
			searchParams.set("state", state);
			url.search = searchParams.toString();
			// We override the url with the one we've just created, which contains the appropriate query string parameters
			// TODO, do we need a way to launch a component but with an appended query string?
			spawnParams = new DefaultSpawnParams(state, spawnParams); //@TODO, in charting we have CIQ.ensureDefaults for doing this sort of thing although it only goes one level deep. We should have such a util.
			spawnParams.url = url.toString();
			//This is to allow the login component to go back to the initial authorization url if needed.
			spawnParams.options.customData.authroizationUrl = url.toString();
			__WEBPACK_IMPORTED_MODULE_1__clients_launcherClient___default.a.spawn(config.component, spawnParams, function (err, msg) {
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.info("Authentication spawned");
				if (err) {
					__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error("Failed To Spawn Authentication Component: " + JSON.stringify(err));
				}
			});
		} catch (e) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error("Authentication: OAUTH2 failed: " + e.message);
		}
	});
};

/**
 * This function handles the response from the backchannel endpoint. This is the final step before returning back to the client.
 * @param {object} response The response from the backchannel endpoint
 * @param {string} state The token state
 * @param {object} queryEvent The query event to respond on
 * @private
 */
OAUTH2.prototype.responseFromBackchannelEndpoint = function (response, state, queryEvent) {
	try {
		// Credentials should contain access_token, id_token, expires_in, token_type
		var transaction = this.tokens[state];
		var config = transaction.config;
		var cb = transaction.cb;
		var credentials = JSON.parse(response);
		// If we got an id_token back, then parse it and add those items to the credentials
		var moreCredentials = {};
		if (credentials.id_token) moreCredentials = this.parseJwt(credentials.id_token);
		for (var field in moreCredentials) {
			credentials[field] = moreCredentials[field];
		}
		// This can be helpful to the receiver
		credentials.config = {
			name: config.name
		};
		queryEvent.sendQueryResponse(null, credentials);
		if (cb) cb(null, credentials);
	} catch (e) {
		queryEvent.sendQueryResponse(e.message);
		if (cb) cb(e.message);
	}
	delete this.tokens[state];
};

/**
 * This completes the OAUTH2 process. queryEvent.data.params should contain the query string parameters
 * received by oauthResponse.html
 * @param {object} queryEvent
 * @private
 */
OAUTH2.prototype.responseFromAuthorizationEndpoint = function (queryEvent) {
	var self = this;
	let err = queryEvent.data.err;
	var params = queryEvent.data.params;
	var state = params.state;
	var transaction = this.tokens[state];
	if (!state) {
		err = "No state returned from endpoint";
	}
	if (!err && !transaction) {
		err = "Cannot find OAUTH state " + state;
	}

	if (err) {
		if (transaction) {
			var cb = transaction.cb;
			cb(err, null);
			delete this.tokens[state];
		}
		queryEvent.sendQueryResponse(err, null);
		return;
	}

	var config = transaction.config;

	var payload = "code=" + params.code + "&client_id=" + config.client_id + "&redirect_uri=" + config.redirect_uri + "&grant_type=" + config.grant_type;
	if (config.client_secret) {
		payload = payload + "&client_secret=" + config.client_secret;
	}

	var xhr = new XMLHttpRequest();
	xhr.open("POST", config.backchannel_endpoint);
	xhr.onreadystatechange = function () {
		if (xhr.readyState > 3) {
			if (xhr.status == 200) {
				self.responseFromBackchannelEndpoint(xhr.responseText, state, queryEvent);
			} else {
				queryEvent.sendQueryResponse("OAUTH error: OP response=" + xhr.status + ":" + xhr.responseText);
				delete this.tokens[state];
			}
		}
	};
	xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.send(payload);
};

/**
 * The Authentication Service authenticates the Finsemble user.
 * @constructor
 */
function AuthenticationService() {
	var self = this;
	var firstAuthorization = true;
	this.currentCredentials = null; // Contains the current credentials
	this.adapters = {};
	this.adapters["PASSWORD"] = new PASSWORD(this.RouterClient);
	this.adapters["OAUTH2"] = new OAUTH2(this.RouterClient);

	// these functions support the initial integration handshake
	function startAuthentication(startCallBack) {
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("starting Authentication");
		RouterClient.publish("Authorization", { "state": "waiting" });

		RouterClient.subscribe("Authorization", function (err, response) {
			if (err) {
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error("Failed Authorization Notification: " + JSON.stringify(err));
			} else {
				// spawn successful so wait for response
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.info("Authorization Notification: " + JSON.stringify(response.data));
			}
		});

		function waitForAuthorization() {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.log("APPLICATION LIFECYCLE:STARTUP:Waiting for Authorization");
			RouterClient.addListener("AuthenticationService.authorization", function (error, response) {
				RouterClient.publish("AuthorizationState", { state: "done" }); // signal service manager that auth is done (so can adjust timeout timer)
				if (error) {
					__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error("APPLICATION LIFECYCLE:STARTUP:Error on incoming authorization: " + JSON.stringify(err));
				} else {
					__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.log("APPLICATION LIFECYCLE:STARTUP:Authorization received: " + JSON.stringify(response.data));
					if (firstAuthorization) {
						firstAuthorization = false;
						startCallBack();
					}

					var authorization = self.currentCredentials = response.data;
					__WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default.a.setUser({ user: authorization.user }, () => {
						RouterClient.publish("Authorization", authorization);
					});
				}
			});
		}

		// This is where we check for initial authentication at boot time. If authentication is required then
		// the auth process will kick off, waiting for completion in waitForAuthorization.
		let isAuthEnabled = FINSEMBLE_CONFIG["isAuthEnabled"];
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.log("finsemble.isAuthEnabled", isAuthEnabled);
		let config = FINSEMBLE_CONFIG["authentication"];
		// If either isAuthEnabled (legacy username/password) or config["startup"] then we will
		// ask the user for credentials before starting up finsemble
		RouterClient.publish("AuthorizationState", { state: "starting" }); // signal service manager that auth is starting (so can adjust timeout timer)
		if (isAuthEnabled || config && config["startup"]) {
			var params = {
				profile: "startup",
				isAuthEnabled: isAuthEnabled
			};
			self.beginAuthentication(params, function (err, response) {});
			// Wait out-of-band for authorization to complete
			waitForAuthorization();
		} else {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.info("Authentication Disabled");
			var defaultUser = "defaultUser";
			__WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default.a.setUser({ user: defaultUser });
			RouterClient.publish("Authorization", { user: defaultUser, credentials: { token: "defaultAuthorization" } });
			RouterClient.publish("AuthorizationState", { state: "done" }); // signal service manager that auth is starting (so can adjust timeout timer)
			startCallBack();
		}
	}

	// Kicks off an authentication process through an adapter.
	this.beginAuthentication = function (params, cb) {
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:beginAuthentication");

		let config = FINSEMBLE_CONFIG["authentication"];
		var authenticationProfile;
		if (config && config[params.profile]) {
			// Create a safe clone of the authenticationProfile
			authenticationProfile = Object.assign({}, config[params.profile]);
		} else {
			// Make a blank authenticationProfile, to support legacy isAuthEnabled
			authenticationProfile = {};
		}

		// Defaults
		authenticationProfile.name = params.profile;
		if (!authenticationProfile.component) authenticationProfile.component = "defaultAuthentication";
		if (!authenticationProfile.adapter) authenticationProfile.adapter = "PASSWORD";
		// We'll examine the config type and farm out the work to the appropriate handler
		var adapter = authenticationProfile.adapter;
		if (self.adapters[adapter]) {
			self.adapters[adapter].authenticate(authenticationProfile, params.spawnParams, cb);
		} else {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error("Cannot find authentication adapter: " + adapter);
		}
	};

	// these functions support single sign on capability
	function startServingSignOn(startSignOnCallback) {
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:startServingSignOn");
		var activeSignOns = {};
		var nowSignedOn = {};
		var acceptTimers = {};
		var myCrypto; // for instance of crypto object
		var keyPart1 = "mySimpleTest";
		var keyPart2 = "Key2";
		var autoSignOnConfig;

		// if component doesn't send an expected response (e.g. accept or reject), this timeout fires to automatically reject the sign on data
		function setUpResponseTimeout(signOnKey) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:setupResponseTimeout:acceptTimeout started", signOnKey);
			const acceptTimeoutDuration = 60 * 1000;
			var timerSignOnKey = signOnKey; // closure key used for this specific timer
			function acceptTimeout() {
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:acceptTimeout fired", timerSignOnKey);
				RouterClient.transmit("authentication.appRejectSignOn", { signOnKey: timerSignOnKey }); // force a rejection since timed out
			}
			acceptTimers[signOnKey] = setTimeout(acceptTimeout, acceptTimeoutDuration);
		}
		function clearResponseTimeout(signOnKey) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:acceptTimeout cleared", signOnKey);
			clearTimeout(acceptTimers[signOnKey]);
		}

		// used in different context to complete a sign on request
		function continueSignOn(queryEvent, signOnKey, params, signOnData, retry) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:continueSignOn", queryEvent, signOnKey, params, signOnData, retry);
			var activeSignOnObject = activeSignOns[signOnKey]; // lookup sign on object for give key (if it exists)
			var isSignedOn = nowSignedOn[signOnKey]; // find out if sign on has already accepted for this key
			if (activeSignOnObject === undefined || retry) {
				// if not in the middle of a sign on handshake
				activeSignOnObject = activeSignOnObject || { params, queuedQuerys: [] };
				activeSignOnObject.mainQueryEvent = queryEvent;
				if (signOnData) {
					// if sign on data has already been retrieved from storage earlier
					__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:continueSignOn using stored signOnData", signOnData);
					if (isSignedOn) {
						signOnData.validationRequired = false;
					} else {
						setUpResponseTimeout(signOnKey);
						signOnData.validationRequired = true;
						activeSignOns[signOnKey] = activeSignOnObject;
					}
					activeSignOnObject.signOnData = signOnData; // will use if accepted
					queryEvent.sendQueryResponse(null, signOnData); // send back to first app requesting this signup, which will accept or reject
				} else {
					__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:authentication.appSignOn spawning dialog");
					__WEBPACK_IMPORTED_MODULE_1__clients_launcherClient___default.a.spawn("dialogSignOn", { data: { signOnKey, params } }, function (err, msg) {
						if (err) {
							__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:Failed To Spawn Authentication Component: " + JSON.stringify(err));
							queryEvent.sendQueryResponse(errMsg, null);
							for (var i = 0; i < activeSignOnObject.queuedQuerys.length; i++) {
								activeSignOnObject.queuedQuerys[i].sendQueryResponse("SignOn Rejected and Terminating", null);
							}
							delete activeSignOns[signOnKey];
						} else {
							// spawn successful so wait for response
							__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:Authentication SignOn Successfully Spawned");
						}
					});
					activeSignOns[signOnKey] = activeSignOnObject;
				}
			} else {
				// already in the  middle of an active sign on, so queue this one
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:AuthenticationService:continueSignOn queueing request", queryEvent);
				// wait to respond to the other queries with same signOnKey after the first one is complete
				activeSignOnObject.queuedQuerys.push(queryEvent);
			}
		}

		function getSignOnStorageKey(signOnKey) {
			return "SignOn." + signOnKey;
		}

		// handles client beginAuthentication requests
		RouterClient.addResponder("authentication.beginAuthentication", function (err, queryEvent) {
			self.beginAuthentication(queryEvent.data, function (err, result) {
				queryEvent.sendQueryResponse(err, result);
			});
		});

		// handles client appSignOn request
		RouterClient.addResponder("authentication.appSignOn", function (err, queryEvent) {
			var signOnKey = queryEvent.data.signOnKey;
			var params = queryEvent.data.params;
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authentication.appSignOn", signOnKey, params, queryEvent);

			if (!params.force) {
				if (signOnKey in autoSignOnConfig.hardcoded) {
					// if hard coded key in config then use it
					var hardcodedSignon = autoSignOnConfig.hardcoded[signOnKey];
					hardcodedSignon.signOnKey = signOnKey; // add the key to the object since will be returned to component
					__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authentication.appSignOn hardcoded " + JSON.stringify(hardcodedSignon));
					continueSignOn(queryEvent, signOnKey, params, hardcodedSignon, false);
				} else {
					__WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default.a.get({ topic: "finsemble", key: getSignOnStorageKey(signOnKey) }, function (err, encryptedData) {
						if (encryptedData) {
							// if signon info in storage
							//var parsedEncryptedData = JSON.parse(encryptedData);
							myCrypto.decryptString(encryptedData, function (signOnData) {
								continueSignOn(queryEvent, signOnKey, params, JSON.parse(signOnData), false);
							});
						} else {
							// else continue and prompt
							continueSignOn(queryEvent, signOnKey, params, null, false);
						}
					});
				}
			} else {
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authentication.appSignOn forcing signOn");
				continueSignOn(queryEvent, signOnKey, params, null, false);
			}
		});

		// handles client appRejectAndRetrySignOn request
		RouterClient.addResponder("authentication.appRejectAndRetrySignOn", function (err, queryEvent) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authentication.appRejectAndRetrySignOn", err, queryEvent);
			var signOnKey = queryEvent.data.signOnKey;
			var activeSignOnObject = activeSignOns[signOnKey];
			if (activeSignOnObject !== undefined) {
				// start again using the previous signon params
				clearResponseTimeout(signOnKey);
				var params = activeSignOnObject.params;
				params.userMsg = queryEvent.data.params ? queryEvent.data.params.userMsg : null;
				nowSignedOn[signOnKey] = false;
				continueSignOn(queryEvent, signOnKey, params, null, true);
			} else {
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.warn("APPLICATION LIFECYCLE:STARTUP:authentication.appRejectAndRetrySignOn for inactive signOnKey:", signOnKey);
			}
		});

		// Handles requests for current credentials
		RouterClient.addResponder("authentication.currentCredentials", function (err, queryEvent) {
			queryEvent.sendQueryResponse(null, self.currentCredentials);
		});

		// handles response from signon dialog spawned by signon request
		RouterClient.addListener("authentication.dialogSignOnToAuthService", function (err, signOnEvent) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authentication.dialogSignOnToAuthService", err, signOnEvent);
			var signOnData = signOnEvent.data;
			var activeSignOnObject = activeSignOns[signOnData.signOnKey];
			err = err || signOnData.error || null;
			activeSignOnObject.signOnData = signOnData; // will use if accepted
			var queryEvent = activeSignOnObject.mainQueryEvent;
			if (!err) {
				setUpResponseTimeout(signOnData.signOnKey);
				signOnData.validationRequired = true;
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authentication.dialogSignOnToAuthService response" + JSON.stringify(signOnData));
				queryEvent.sendQueryResponse(err, signOnData); // send back to first app requesting this signup, which will accept or reject
			} else {
				queryEvent.sendQueryResponse(err, null); // send back to first app requesting this signup, which will accept or reject
				for (var i = 0; i < activeSignOnObject.queuedQuerys.length; i++) {
					activeSignOnObject.queuedQuerys[i].sendQueryResponse(err, null);
				}
				delete activeSignOns[signOnData.signOnKey]; // apps will have to restart sign ons if error (or kill themsselves)
			}
		});

		// handles client appAcceptSignOn request
		RouterClient.addListener("authentication.appAcceptSignOn", function (err, transmitEvent) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authentication.appAcceptSignOn", err, transmitEvent);
			var signOnKey = transmitEvent.data.signOnKey;
			var activeSignOnObject = activeSignOns[signOnKey];
			if (activeSignOnObject !== undefined) {
				clearResponseTimeout(signOnKey);
				nowSignedOn[signOnKey] = true;
				activeSignOnObject.signOnData.validationRequired = false;

				//  save accepted data in storage for future use;
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:appAcceptSignOn Saving in Storage", activeSignOnObject.signOnData);

				myCrypto.encryptString(JSON.stringify(activeSignOnObject.signOnData), function (encryptedData) {
					__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:appAcceptSignOn After Encryption", activeSignOnObject.signOnData);
					__WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default.a.save({ topic: "finsemble", key: getSignOnStorageKey(signOnKey), value: encryptedData });

					for (var i = 0; i < activeSignOnObject.queuedQuerys.length; i++) {
						__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("authentication.appAcceptSignOn", i, activeSignOnObject.signOnData);
						activeSignOnObject.queuedQuerys[i].sendQueryResponse(null, activeSignOnObject.signOnData);
					}

					delete activeSignOns[signOnKey];
				});
			} else {
				console.warn("APPLICATION LIFECYCLE:STARTUP:authentication.appAcceptSignOn for inactive signOnKey", signOnKey);
			}
		});

		// handles client appRejectSignOn request
		RouterClient.addListener("authentication.appRejectSignOn", function (err, transmitEvent) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authentication.appRejectSignOn", err, transmitEvent);
			var signOnKey = transmitEvent.data.signOnKey;
			var activeSignOnObject = activeSignOns[signOnKey];
			if (activeSignOnObject !== undefined) {
				clearResponseTimeout(signOnKey);
				for (var i = 0; i < activeSignOnObject.queuedQuerys.length; i++) {
					activeSignOnObject.queuedQuerys[i].sendQueryResponse("SignOn Rejected and Terminating", null);
				}
				delete activeSignOns[signOnKey];
			} else {
				console.warn("APPLICATION LIFECYCLE:STARTUP:authentication.appRejectSignOn for inactive signOnKey", signOnKey);
			}
		});
		autoSignOnConfig = FINSEMBLE_CONFIG["autoSignOn"] || { hardcoded: {} };
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.log("APPLICATION LIFECYCLE:STARTUP:hardcoded", autoSignOnConfig);
		myCrypto = new MyCrypto(keyPart1 + keyPart2, function () {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("STARTUP:AuthenticationService:STARTUP:MyCrypto callback");
			startSignOnCallback();
		});
	}

	//start the service
	this.initialize = function (initDoneCallback) {
		console.profile("Authentication");
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authenticationService: initialization started.");
		__WEBPACK_IMPORTED_MODULE_3__clients_configClient___default.a.getValue({ field: "finsemble" }, (err, config) => {
			FINSEMBLE_CONFIG = config;
			__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_async__["parallel"])([startAuthentication, startServingSignOn], initDoneCallback);
		});
	};
}

function MyCrypto(inputSimpleKey, ready) {
	var myIv = new window.TextEncoder("utf-8").encode("w5ZK8yaOfktXmgny"); // 16-byte initialization vector used for encrypt and decrypt
	var mySimpleKey = inputSimpleKey;
	var myKey; // will hold the true encryption/decryption key

	function getSeedKey(simpleKey) {
		var index = 4; // where to substitute simple key into base key
		var baseKey = "t0zt37HgOxMBY7SZjYVmrqhPkO44Ii2Jcb9yedUEPfE"; // random key of required size that will be overlaid with simple key (to get a better result)
		var truncatedSimpleKey = simpleKey.substring(0, baseKey.length - (index + 1)); // simple key can't be too long to fit into base
		var keySeed = baseKey.substr(0, index) + truncatedSimpleKey + baseKey.substr(index + truncatedSimpleKey.length); // substitute into base
		return keySeed; // the seed key used to import/create the true key used for encrypt and decrypt
	}

	function arrayBufferToString(buf) {
		return String.fromCharCode.apply(null, new Uint16Array(buf));
	}

	function stringToArrayBuffer(str) {
		var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
		var bufView = new Uint16Array(buf);
		for (var i = 0, strLen = str.length; i < strLen; i++) {
			bufView[i] = str.charCodeAt(i);
		}
		return buf;
	}

	window.crypto.subtle.importKey("jwk", { // the JSON Web Key (jwk)
		kty: "oct",
		k: getSeedKey(mySimpleKey),
		alg: "A256CBC",
		ext: true
	}, { name: "AES-CBC" }, false, //whether the key can be used in exportKey
	["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
	).then(function (key) {
		myKey = key; // the true key -- a symmetric key
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:importKey success", mySimpleKey, getSeedKey(mySimpleKey), "K", key, "M", myKey);
		ready();
	}).catch(function (err) {
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error("APPLICATION LIFECYCLE:STARTUP:importKey failure", err);
		//band-aid. Crypto doesn't work on insecure sites.
		ready();
	});

	this.encryptString = function (stringToEncrypt, callback) {
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:encryptString", "stringToEncrypt", stringToEncrypt); // <<<<---------- REMOVE AFTER DEBUGGING !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		var utfData = new window.TextEncoder("utf-8").encode(stringToEncrypt);
		window.crypto.subtle.encrypt({
			name: "AES-CBC",
			iv: myIv // should eventually create new iv for each encryption
		}, myKey, utfData // ArrayBuffer of data to encrypt
		).then(function (encryptedData) {
			var encryptedString = arrayBufferToString(encryptedData);
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("encryptString", "encryptedData", encryptedData, encryptedString);
			//returns an ArrayBuffer containing the encrypted data
			callback(encryptedString);
		}).catch(function (err) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error(err);
		});
	};

	this.decryptString = function (encryptedString, callback) {
		var encryptedData = stringToArrayBuffer(encryptedString);
		__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:decryptString", "encryptedData", encryptedData, encryptedString);
		window.crypto.subtle.decrypt({
			name: "AES-CBC",
			iv: myIv
		}, myKey, encryptedData).then(function (decrypted) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:decryptString", "decrypted", decrypted); // <<<<---------- REMOVE AFTER DEBUGGING !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
			var decryptedString = new TextDecoder("utf-8").decode(new Uint8Array(decrypted));
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:decryptString", "decryptedString", decryptedString); // <<<<---------- REMOVE AFTER DEBUGGING !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
			callback(decryptedString);
		}).catch(function (err) {
			__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.error("APPLICATION LIFECYCLE:STARTUP:decryptString error", err, "myKey", myKey, "encryptedData", encryptedData, "encryptedString", encryptedString);
		});
	};
}

function cryptoTest1() {
	// basic crypto test case
	var stringToEncrypt = "01234567890";
	var crypto = new MyCrypto("mySimpleTestKey1", function () {
		crypto.encryptString(stringToEncrypt, function (encryptedString) {
			crypto.decryptString(encryptedString, function (myString) {
				__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:Decrypt*** RESULT 1------>", myString);
			});
		});
	});
}

function cryptoTest2() {
	// crypto test cases including with storage save and get
	var stringToEncrypt = "01234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var crypto = new MyCrypto("09587BJDlfakjMGWROY", function () {
		crypto.encryptString(stringToEncrypt, function (encryptedString) {
			__WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default.a.save({ topic: "finsemble", key: "cyptostoraget2", value: encryptedString }, function () {
				__WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default.a.get({ topic: "finsemble", key: "cyptostoraget2" }, function (err, storedEncryptedString) {
					var parsed = JSON.parse(storedEncryptedString);
					crypto.decryptString(parsed, function (myString) {
						__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("***APPLICATION LIFECYCLE:STARTUP:Decrypt RESULT 2------>", myString);
					});
				});
			});
		});
	});
}

function cryptoTest3() {
	// crypto test cases including save and get to storage using independent instances of crypto class
	var stringToEncrypt = "01234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ 01234567890";
	var crypto1 = new MyCrypto("lkwgrjOIHJfnqoehfdf", function () {
		crypto1.encryptString(stringToEncrypt, function (encryptedString) {
			__WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default.a.save({ topic: "finsemble", key: "cyptostoraget3", value: encryptedString }, function () {
				var crypto2 = new MyCrypto("lkwgrjOIHJfnqoehfdf", function () {
					__WEBPACK_IMPORTED_MODULE_2__clients_storageClient___default.a.get({ topic: "finsemble", key: "cyptostoraget3" }, function (err, storedEncryptedString) {
						var parsed = JSON.parse(storedEncryptedString);
						crypto2.decryptString(parsed, function (myString) {
							__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("***APPLICATION LIFECYCLE:STARTUP:Decrypt RESULT 3------>", myString);
						});
					});
				});
			});
		});
	});
}

AuthenticationService.prototype = new __WEBPACK_IMPORTED_MODULE_0__baseService__["BaseService"]({
	name: "authenticationService",
	startupDependencies: {
		services: [], //"finsembleNativeService"],
		clients: ["launcherClient", "storageClient"]
	},
	shutdownDependencies: {
		services: ["startupLauncherService"]
	}
});
var serviceInstance = new AuthenticationService();
RouterClient = serviceInstance.RouterClient;
__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.start();
serviceInstance.onBaseServiceReady(function (callback) {
	__WEBPACK_IMPORTED_MODULE_4__clients_logger___default.a.system.debug("APPLICATION LIFECYCLE:STARTUP:authenticationService:BaseServiceReady");
	window.AuthenticationService = serviceInstance;
	serviceInstance.initialize(callback);
});

serviceInstance.start();

/* harmony default export */ __webpack_exports__["default"] = (serviceInstance);

 ;(function register() { /* react-hot-loader/webpack */ if (process.env.NODE_ENV !== 'production') { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } if (typeof module.exports === 'function') { __REACT_HOT_LOADER__.register(module.exports, 'module.exports', "C:\\Users\\BradC\\git\\finsemble\\src\\services\\authentication\\authenticationService.js"); return; } for (var key in module.exports) { if (!Object.prototype.hasOwnProperty.call(module.exports, key)) { continue; } var namedExport = void 0; try { namedExport = module.exports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "C:\\Users\\BradC\\git\\finsemble\\src\\services\\authentication\\authenticationService.js"); } } })();
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(1), __webpack_require__(2)(module)))

/***/ }),
/* 90 */,
/* 91 */,
/* 92 */,
/* 93 */,
/* 94 */,
/* 95 */,
/* 96 */,
/* 97 */,
/* 98 */,
/* 99 */,
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
/* 160 */,
/* 161 */,
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
/* 178 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(89);


/***/ })
/******/ ]);
//# sourceMappingURL=authenticationService.js.map