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
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

/**
 * This file contains a set of overrides that will convert HTML5 window actions to corresponding Finsemble actions.
 * Overrides must be specified for each component via a "preload" script. You do this by adding the preload to the
 * component config like so:
 * 
 * 	"Your Component": {
  			...
			"component": {
				...
				"inject": false,
				"preload": "$applicationRoot/preloads/nativeOverrides.js"
				...
			}
			...
		}

	IMPORTANT NOTE: If you set that path incorrectly it will cause Finsemble to stop working in that component.
	Check your component's chrome console for the existence of FSBL. If it doesn't exist then check your path.
 */

/**
 * This overrides the browser's built in window.open function by instead creating windows using LauncherClient.spawn.
 * This ensures that the Finsemble workspace manager is aware of newly opened windows, that they can participate in
 * the on screen workspace management, and that they can be restored with workspaces.
 */

var originalWindowOpen = window.open;
window.open = function (URL, name, specs, replace) {
	// For some strange reason, openfin notifications use window.open. So we make an exception for that one case.
	if (name && name.includes("openfin-child-window")) {
		originalWindowOpen.call(window, URL, name, specs, replace);
		return;
	}
	var params = {};
	if (specs) {
		let paramList = specs.split(",");
		for (let i = 0; i < paramList.length; i++) {
			let param = paramList[i].split("=");
			params[param[0]] = param[1];
		}
	}
	if (name) {
		switch (name) {
			case "_self":
				location.href = URL;
				return;
			case "_top":
				window.top.href = URL;
				return;
			case "_parent":
				window.parent.href = URL;
				return;
			case "_blank":
				break;
			default:
				params.name = name;
		}
	}
	params.url = URL;

	var w;
	FSBL.Clients.LauncherClient.spawn(null, params, function (err, response) {
		if (err) {
			console.error("nativeOverrides.js window.open patch error: " + err);
		} else {
			w = response.finWindow;
		}
	});
	return w;
};

/**
 * Overrides the browser's built in alerting. Native alerts are synchronous. They cause the application to cease functioning
 * and they create an ugly pop up window. Instead, we funnel these alerts through notifications.
 */
window.alert = function (message) {
	FSBL.UserNotification.alert("alert", "", "ALWAYS", message, {});
};

/***/ })
/******/ ]);
//# sourceMappingURL=nativeOverrides.map.js