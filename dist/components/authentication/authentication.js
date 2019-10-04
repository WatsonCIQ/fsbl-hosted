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
/******/ 	return __webpack_require__(__webpack_require__.s = 189);
/******/ })
/************************************************************************/
/******/ ({

/***/ 189:
/***/ (function(module, exports) {

let inLogin = true;
/************************************************
 * 			SAMPLE AUTHENTICATION
 ************************************************/
// On ready, check to see if the user has a valid session
if (window.FSBL && FSBL.addEventListener) {
    FSBL.addEventListener("onReady", checkAuthorizationStatus);
} else {
    window.addEventListener("FSBLReady", checkAuthorizationStatus);
}

$('#authAction').click(e => {
    const text = inLogin ? 'Sign Up' : 'Login';
    const actionLink = inLogin ? 'Login' : 'Sign Up';
    inLogin = !inLogin;
    $('#submitButton').html(text);
    $('#authAction').html(actionLink);
});

document.body.addEventListener('keydown', handleKeydown);

// Submits credentials on enter, closes on quit.
function handleKeydown(event) {
    switch (event.code) {
        case 'Enter':
        case 'NumpadEnter':
            !event.shiftKey && processAuthInput();
            break;
        case 'Escape':
            quit();
            break;
    }
}

//Here, you may want to hit a server and request the user's session information. If the session is valid, log them in automatically. This sample code assumes that they are not logged in and just shows the authentication page.
function checkAuthorizationStatus() {
    FSBL.System.Window.getCurrent().show();
    //setTimeout(processAuthInput, 0);
}

//Dummy function that just dumbly accepts whatever is in the form.
function processAuthInput() {
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
    // real authentication might use BasicAuth, Digest Auth, or pass off to authentication server which redirects back when authenticated
    // below is a dummy example that just accepts credentials from the form and publishes them out.
    var data = { username: username, password: password };
    FSBL.System.Window.getCurrent().hide();

    //FSBL.Clients.WindowClient.finsembleWindow.hide();
    //In the real world, you'd get this from a server. Send joe's credentials to a server, and get back entitlements/basic config. For this example, we just accept the credentials.
    publishCredentials(data);
}

//Pass credentials to the application.
function publishCredentials(user) {
    FSBL.Clients.AuthenticationClient.publishAuthorization(user.username, user);
}

//CLose app when the X is clicked.
function quit() {
    FSBL.shutdownApplication();
}

// Add events to HTML elements
$("#submitButton").click(processAuthInput);
$("#FSBL-close").click(quit);

// For this example, the password doesn't do anything, so we are disabling it and setting a tooltip to let the user
// know they don't need to enter a password. This should be removed in a production implementation.
$("#password").prop("disabled", true).prop("placeholder", "Demo needs no password");

/************************************************
 * 				UNUSED EXAMPLE CODE
 ************************************************/

//Add the config to the config service. Our sample has nothing, b
function updateConfig(config, cb) {
    var configSet = {};
    if (config.components) configSet["components"] = config.components;
    if (config.menuItems) configSet["menus"] = config.menuItems;
    if (config.defaultWorkspace) configSet["workspaces"] = config.defaultWorkspace.workspaces;

    //if (config.overrides) configSet["cssOverridePath"] = config.overrides;
    FSBL.Clients.ConfigClient.processAndSet({
        newConfig: configSet,
        overwrite: true,
        replace: true
    }, function (err, config) {
        return cb(err);
    });
}

//Get a config for the user
function getConfig(cb) {
    fetch("/user/config", {
        method: "GET",
        credentials: 'include'
    }).catch(reason => {
        console.warn("Fail Auth Get", reason);
    }).then(res => {
        return res.json();
    }).then(data => {
        if (data) {
            updateConfig(data, cb);
        }
    });
}

function displayErrorMessage() {
    fin.desktop.Window.getCurrent().show();
    var ERROR_MESSAGE = $('.fsbl-input-error-message');
    var INPUTS = $('.fsbl-auth-input');
    const INPUT_ERROR_CLASS = 'fsbl-input-error';

    INPUTS.addClass(INPUT_ERROR_CLASS);

    ERROR_MESSAGE.show();

    INPUTS.on('keydown', function () {
        INPUTS.removeClass(INPUT_ERROR_CLASS);
        ERROR_MESSAGE.hide();
    });
}

/***/ })

/******/ });
//# sourceMappingURL=authentication.map.js