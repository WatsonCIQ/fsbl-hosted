/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


import Logger from "./logger";

Logger.system.debug("Starting searchClient");

import { _BaseClient } from "./baseClient";

/**
 *
 * @introduction
 * <h2>Search Client</h2>
 * The Search Client allows for any window launched by Finsemble to act as a search provider or query against the registered providers.
 * @hideConstructor
 * @constructor
 */
class SearchClient extends _BaseClient {
	searchId;
	resultsCallback;
	providers = {};
	resultProviders = {};
	searchResultsList = [];
	isSearching = false;// We use this so we don't create multiple responders for every window that searches.
	//Also, we if a window doesn't have any search functionality then we don't need extra listeners

	/**
	 * Register a provider with the search service.
	 * @param {Object} params - Params object
	 * @param {String} params.name - The name of the provider
	 * @param {Function} params.searchCallback - A function called when a search is initialized.
	 * @param {Function} params.itemActionCallback - A function that is called when an item action is fired.
	 * @param {Function} params.providerActionCallback - A function that is called when a provider action is fired.
	 * @param {string} params.providerActionTitle - The title of the provider action.
	 * @param {Function} cb - Callback to be invoked when the provider is registered.
	 * @example
	 * FSBL.Clients.SearchClient.register({
	 *		name: "MyProvider",
	 *		searchCallback: searchApplications,
	 *		itemActionCallback: itemActionCallback,
	 *		providerActionTitle: providerActionTitle,
	 *		providerActionCallback:providerActionCallback
	 *	},
	 *	(err, response) => {
	 * 		//provider has been registered
	 * 	});
	 */
	register(params: {
		name: string,
		searchCallback: Function,
		itemActionCallback?: Function,
		providerActionCallback?: Function,
		providerActionTitle?: string
	}, cb?: Function) {
		if (!params.name) return cb("no provider name provided");
		if (!params.searchCallback) return cb("no provider callback provided");
		this.routerClient.query("Search.register", {
			name: params.name,
			channel: this.finWindow.name + "." + params.name,
			providerActionTitle: params.providerActionTitle,
			providerActionCallback: params.providerActionCallback ? true : false
		}, (err, response) => {
			if (err) return cb ? cb(err) : console.error(err);
			var provider = this.finWindow.name + "." + params.name;
			this.providers[params.name] = params.name;
			//This is where we receive  our search requests.
			this.routerClient.addResponder("Search.Provider." + provider, (err, message) => {//create a query responder
				if (err) return console.error(err);
				if (!message) return;
				params.searchCallback(message.data, (err, res) => { message.sendQueryResponse(err, res); });
			});
			//This is where we receive calls for a result item action event
			this.routerClient.addResponder("Search.Provider.ItemAction." + provider, (err, message) => {//create a query responder
				if (err) return console.error(err);
				if (!message) return;
				if (params.itemActionCallback) params.itemActionCallback(message.data, message.header.origin, (err, res) => { message.sendQueryResponse(err, res); });
			});
			//This is where we receive calls for a provider level event
			if (params.providerActionCallback) {
				this.routerClient.addResponder("Search.Provider.Action." + provider, (err, message) => {//create a query responder
					if (err) return console.error(err);
					if (!message) return;
					if (params.providerActionCallback) params.providerActionCallback(message.header.origin, (err, res) => { message.sendQueryResponse(err, res); });
				});
			}
			return cb ? cb(null, response.data) : null;
		});
	};
	/**
	 * Remove a provider. This can only be done from the window that create the provider.
	 * @param {Object} params
	 * @param {string} params.name - The provider name
	 * @param {function} cb callback
	 * @example
	 * FSBL.Clients.SearchClient.unregister({ name: "MyProvider" }, function(){ });
	 *
	 */
	unregister(params: {
		name: string
	}, cb?: Function) {
		if (!params.name) return cb("Provider name was not provided");
		var provider = this.finWindow.name + "." + params.name;
		this.routerClient.query("Search.unregister", { channel: provider }, () => {
			this.routerClient.removeResponder("Search.Provider." + provider);
			this.routerClient.removeResponder("Search.Provider.ItemAction." + provider);
			this.routerClient.removeResponder("Search.Provider.Action." + provider);
			delete this.providers[params.name];
			return cb ? cb() : null;
		});
	};


	/**
	 * Deprecated. Provided for backwards compatibility.
	 * @see SearchClient.unregister
	 */
	unRegister = this.unregister;
	/**
	 * This initiates a search.
	 * @param {Object} params - Params object
	 * @param {String} params.text - The name of the provider
	 * @param {String} params.windowName Optional. Will be set to the window which is invoking the API method.
	 * @param {function} cb - callback to called as search results for each provider are returned. Results are combined as they come in.
	 * So, every response will have the complete list of results that have been returned. Example: You have two providers; provider one returns results first, you'll have an array with just the that providers data. Once Provider
	 * two returns you'll have results for provider one and provider two.
	 * @example
	 * FSBL.Clients.SearchClient.search({
	 *		text: "Chart",
	 *	(err, response) => {
	 * 		//Search results will be returned here
	 * });
	 */
	search(params: {
		text: string,
		windowName?: string
	}, cb: Function) {
		if (!this.isSearching) {
			this.routerClient.addPubSubResponder("Search." + this.finWindow.name);
			this.routerClient.subscribe("Search." + this.finWindow.name, this.handleResults);
			this.isSearching = true;
		}
		this.searchResultsList = [];
		params.windowName = this.finWindow.name;

		this.routerClient.query("Search.search", params, (err, response) => {
			if (err) return cb(err);
			this.resultsCallback = cb;
			this.searchId = response.data.searchId;
		});
	};
	/**
	 * Call this when you want to trigger an action associated to a returned item. There can be multiple actions associated with a result item and only one should be fired at a time.
	 * @param {SearchResultItem} item - This is the search result item
	 * @param {Action} action - This is the action that you would like to fire.
	 * @example
	 * FSBL.Clients.SearchClient.invokeItemAction(resultItem,action);
	 *
	 */
	invokeItemAction(item: any, action: Function) {
		this.routerClient.query("Search.Provider.ItemAction." + item.provider, { item: item, action: action });
	};
	/**
	 * Call this when you want to trigger an action associated to a provider. This may not exist on the provider
	 * @param {Provider} provider - This is the search result item
	 * @example
	 * FSBL.Clients.SearchClient.invokeProviderAction(provider);
	 *
	 */
	invokeProviderAction(provider: {
		channel: string
	}) {
		this.routerClient.query("Search.Provider.Action." + provider.channel, {});
	};
	//This handles our results when we get them back from a provider
	handleResults: StandardCallback = (err, message) => {
		if (!message.data.searchId || message.data.searchId != this.searchId) return;
		this.resultProviders[message.data.provider.channel] = message.data;
		this.searchResultsList.push(message.data);
		this.resultsCallback(null, this.searchResultsList);
	}
};

var searchClient = new SearchClient({
	startupDependencies: {
		services: ["searchService"]
	},
	onReady: function (cb) {
		if (cb) {
			cb();
		}
	},
	name: "searchClient"
});

export default searchClient;
