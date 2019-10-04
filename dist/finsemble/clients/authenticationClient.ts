/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

"use strict";
import Validate from "../common/validate"; // Finsemble args validator
import { _BaseClient as BaseClient } from "./baseClient";
import { FinsembleWindow } from "../common/window/FinsembleWindow";
import { SpawnParams } from "../services/window/Launcher/launcher";

/**
 * @introduction
 * <h2>Authentication Client</h2>
 *
 * The Authentication Client supports three distinct areas of functionality:
 *
 *  1) The client API provides hooks for plugging in a custom sign-on component at the beginning of Finsemble start-up (before application-level components are started).
 * See the <a href=tutorial-Authentication.html>Authentication tutorial</a> for an overview of using these hooks.
 *
 * 2) The client API provides hooks for running authentication processes dynamically via "authentication profiles."
 *
 * 3) The client API provides automatic login capabilities for Finsemble components (password auto-fill).
 *
 * @hideconstructor
 * @constructor
 */
export class AuthenticationClient extends BaseClient {
	isInAService: boolean;
	constructor(params) {
		super(params);
		//Method was formally an arrow function. If we want our documentation build to read nested parameters, we need to use this instead of an arrow.
		this.beginAuthentication = this.beginAuthentication.bind(this);
	}
	/**
	 * During Finsemble's start-up process, this function must be invoked before Finsemble will start the application.
	 * Once invoked, the authenticated user name and authorization credentials are received by the Authentication Service and published on the "AuthenticationService.authorization" channel.
	 * Any component can revive the credentials by subscribing to that channel or by calling {@link AuthenticationClient#getCurrentCredentials}.
	 *
	 * Note that all calls to Storage Client are keyed to the authenticated *user*. See {@link StorageClient#setUser}.
	 * If authentication is not enabled, then "defaultUser" is used instead.
	 *
	 * @param {string} user the name of the authenticated user
	 * @param {object} credentials the authorization credentials (or token) for the current user, as specified by the application's authentication component.
	 * @example
	 *
	 * FSBL.Clients.AuthenticationClient.publishAuthorization(username, credentials);
	 */
	publishAuthorization = (user: string, credentials: any) => {
		let authMessage = "AUTHORIZATION: Publishing Authorization for " + user;
		Validate.args(user, "string", credentials, "object");
		this.routerClient.transmit("AuthenticationService.authorization", { user, credentials });
	};

	/**
	 * Returns the current global credentials (as published through {@link AuthenticationClient#publishAuthorization}) or null if no credentials are set yet.
	 * @param {function} cb A function that returns the current credentials. Will return null/undefined if no credentials have yet been established.
	 * @since TBD
	 */
	getCurrentCredentials = (cb: StandardCallback) => {
		this.routerClient.query("authentication.currentCredentials", null, (err, response) => {
			var credentials = err ? null : response.data;
			cb(err, credentials);
		});
	};

	/**
	 * ALPHA Automatic SignOn Function. Not used by components signing on, but only by "system dialog" component that prompts the user for sign on data. This command will send the user-input sign-on data back to the Authentication Service.
	 *
	 * @param {string} signOnData
	 */
	transmitSignOnToAuthService = (signOnData: object) => {
		Validate.args(signOnData, "object");
		this.logger.system.debug("AUTHORIZATION: Transmitting SignOn To AuthService");
		this.routerClient.transmit("authentication.dialogSignOnToAuthService", signOnData);
	};

	/**
	 * ALPHA Automatic SignOn Function. Returns the sign on data after either prompting user or getting a cached version.
	 *
	 * @param {string} signOnKey component-defined unique identifier string representing the sign-on data (the same string must be used for each unique sign on).
	 * @param {object} params object { icon, prompt, force, userMsg }.  `icon` is a URL to icon to displace in sign-on dialog. `prompt` is a string to display in sign on dialog. `force` indicates if sign-on dialog should be used even if accepted sign-on data is available in the encrypted store. `userMsg` is an optional message to be displayed for the user in the sign-on dialog.
	 * @param {function} cb callback (err,response) with the response being an object: { signOnKey, username, password, validationRequired }
	 * @private
	 */
	appSignOn = (signOnKey, params, cb: StandardCallback) => {
		this.logger.system.debug(`AUTHORIZATION: Signing on to app ${signOnKey}`);
		Validate.args(signOnKey, "string", params, "object", cb, "function");
		this.routerClient.query("authentication.appSignOn", { signOnKey, params }, { timeout: -1 }, (err, response) => {
			if (cb) {
				cb(err, response.data);
			}
		});
	};

	/**
	 * ALPHA Automatic SignOn Function. Rejects previous sign-on data and restarts sign on. Returns the sign-on data after either prompting user or getting a cached version. Should only be called when `validationRequired` is `true` in sign-on response.
	 *
	 * @param {string} signOnKey
	 * @param {object} params object { userMsg } where `userMsg` is an option message to be displayed for user in sign`on dialog
	 * @param {function} cb
	 * @private
	 */
	appRejectAndRetrySignOn = (signOnKey: string, params: object, cb: StandardCallback) => {
		this.logger.system.warn("AUTHORIZATION: appRejectAndRetrySignOn", signOnKey);
		Validate.args(signOnKey, "string", params, "object", cb, "function");
		this.routerClient.query("authentication.appRejectAndRetrySignOn", { signOnKey, params }, { timeout: -1 }, (err, response) => {
			if (cb) {
				cb(err, response.data);
			}
		});
	};

	/**
	 * ALPHA Automatic SignOn Function. Accepts the data returned by `appSignOn`, causing the data to be saved for future use. Should only be called when `validationRequired` is `true` in sign-on response.
	 *
	 * @param {string} signOnKey
	 * @private
	 */
	appAcceptSignOn = (signOnKey) => {
		this.logger.system.info("AUTHORIZATION: Accepted application sign on.", signOnKey);
		Validate.args(signOnKey, "string");
		this.routerClient.transmit("authentication.appAcceptSignOn", { signOnKey });
	};

	/**
	 * ALPHA Automatic SignOn Function. Rejects the data returned by previous sign on. Should only be called when validationRequired is true in sign-on response.
	 *
	 * @param {string} signOnKey
	 * @private
	 */
	appRejectSignOn = (signOnKey) => {
		this.logger.system.error("AUTHORIZATION: Rejected application sign on.", signOnKey);
		Validate.args(signOnKey, "string");
		this.routerClient.transmit("authentication.appRejectSignOn", { signOnKey });
	};

	/**
	 * Completes an OAuth2 authentication that was begun with {@link AuthenticationClient#beginAuthentication}.
	 * This function is called when an OAuth2 response is completed.
	 * You should call this function from within the page that you specified in "redirect_uri" in your Authentication Profile config.
	 * See the authentication tutorial for more information on configuring OAuth.
	 * @param {string} error
	 * @param {object} params Optionally pass the OAuth2 query string parameters from your response page. Set to null and the query string will automatically be parsed based on the OAuth2 specification.
	 * @param {function} cb Returns the result (err, data). data will contain the results of the authentication process, such as the access_token and other values provided by your Identify Provider.
	 * @since TBD
	 */
	completeOAUTH = (err?: string, params?, cb?: StandardCallback) => {
		this.logger.system.log("completeOAUTH", params);
		Validate.args(params, "object=");
		// Get parameters from the query string by default
		if (!params) {
			params = {};
			var queryString = new URLSearchParams(window.location.search);
			// Convert URLSearchParams into POJO
			for (let pair of queryString.entries()) {
				params[pair[0]] = pair[1];
			}
		}

		const sendToAuthService = () => {
			this.routerClient.query("authentication.completeOAUTH", { err, params }, (err, response) => {
				var data;
				if (response.data) data = response.data;
				cb(err, data);
			});
		}

		// Normally, we should have the "state" back by now, but sometimes oauth can get stuck in limbo, for instance
		// if the identity provider's redirect page doesn't return properly. In this case, we revert to looking
		// for our original "state" in the window's options (customData) where we had previously stashed it away for
		// just such a circumstance.
		if (params.state) {
			sendToAuthService();
		} else {
			if (!this.isInAService) {
				this.finsembleWindow.getOptions((err, opts) => {
					params.state = opts.customData.OAuthState;
					sendToAuthService();
				});
			} else {
				this.logger.system.error("OAUTH Error. This functionality is not yet available in services.");
			}
		}
	};

	/**
	 * Starts an authentication process. The callback will be triggered when the authentication is totally complete.
	 * Use this method if you have a component that needs to complete an authentication process, such as OAuth2.
	 *
	 * You must set up an "authentication profile" in your Finsemble config. Reference the name of that profile
	 * in params.profile. See the Authentication Tutorial for information on configuration authentication profiles.
	 *
	 * @param {object} params Parameters
	 * @param {string} params.profile The name of the authentication profile from the authentication config section. See "startup" for instance.
	 * @param {SpawnParams} params.spawnParams Optionally specify parameters to send to spawn, for when spawning an authentication window.
	 * @param {function} cb Returns an object containing the authentication response, i.e., OAuth credentials, etc
	 */
	beginAuthentication(params: {
		profile?: string,
		spawnParams?: SpawnParams
	}, cb: StandardCallback) {
		this.routerClient.query("authentication.beginAuthentication", params, (err, response) => {
			cb(err, response.data);
		});
	};

	/**
	 * @private
	 *
	 * @memberof AuthenticationClient
	 */
	start = (cb) => {
		FinsembleWindow.getInstance({ name: this.finWindow.name, uuid: this.finWindow.uuid }, (err, response) => {
			if (err === "Cannot Wrap Service Manager or Services") {
				this.isInAService = true;
			} else {
				this.finsembleWindow = response;
			}
			if (cb) cb();
		});
	};
};

var authenticationClient = new AuthenticationClient({
	onReady: (cb) => {
		authenticationClient.start(cb);
	},
	name: "authenticationClient"
});

export default authenticationClient;
