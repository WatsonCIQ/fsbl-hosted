import * as util from "../../../common/util";
import merge = require("deepmerge");
import { WindowDescriptor } from "./types";
import Logger from "../../../clients/logger";

export default {	/**
	* If the component has a security policy specified, we check to see that it exists.
	* If it does, we return that.
	* If not, we return the default security policy based on whether it's same or cross domain.
	* @param descriptor
	*/
	getSecurityPolicy(descriptor: WindowDescriptor, finsembleConfig) {
		let policyDefinedPermissions = null;
		if (descriptor.securityPolicy) {
			policyDefinedPermissions = finsembleConfig.securityPolicies[descriptor.securityPolicy];
			if (policyDefinedPermissions) {
				return descriptor.securityPolicy;
			}
		}

		// If we make it down here, either the component doesn't have a security policy or
		// the policy that the component wants to use is not part of our config.
		// Below, we decide which policy we should apply for the component.
		const isCrossDomain = util.crossDomain(descriptor.url);
		let policy = finsembleConfig.securityPolicyRules.sameDomain;
		if (isCrossDomain) {
			policy = finsembleConfig.securityPolicyRules.crossDomain;
		}

		// Notify the dev that the policy that they want to use is undefined.
		if (!policyDefinedPermissions && descriptor.securityPolicy) {
			Logger.system.error(`Security policy ${descriptor.securityPolicy} not found. Defaulting to ${policy}`)
		}
		return policy;
	},

	/**
	 * Returns a permissions object with information expected in the e2o layer.
	 * This will go grab the set of permissions defined by the security policy.
	 * Afterwards, it will apply any specific permissions that the component has on it.
	 * It will not allow _more permissive_ permissions to be set.
	 *
	 * If the policy says System.exist is not allowed, but the component says that it is,
	 * this function will return a set of permissions where System.exit is false.
	 * @param descriptor
	 */
	getPermissions(descriptor: WindowDescriptor, finsembleConfig) {
		// Default object with no permissions. If there's a security policy, we'll grab the permissions from config and feed them down to e2o.
		let approvedPermissions = {
			System: {},
			Window: {},
			Application: {}
		};
		let requestedPermissions = {};

		// If the dev has set up this component with explicit permissions, we assign those. Any permission that is
		// defined on the security policy will overwrite component-specific permissions.
		try {
			requestedPermissions = JSON.parse(JSON.stringify(descriptor.permissions));
		} catch (e) {
			requestedPermissions = {};
		}

		approvedPermissions = merge(approvedPermissions, requestedPermissions);

		// finsembleConfig.securityPolicies will always exist. Defaults are exported from finsemble core.
		const securityPolicy = finsembleConfig.securityPolicies[descriptor.securityPolicy];

		// This should always be defined in the normal course of the program executing. Prior to calling getPermissions,
		// we call getSecurityPolicy. That method will assign a policy if the one that the dev supplies doesn't exist.
		// This check is here in case we do unit testing in the future.
		if (securityPolicy) {
			// this will be something like Application, Window, System.
			const namespaces = Object.keys(securityPolicy);

			// go through the permissions enumerated in the security policy and apply what the component requests,
			// unless it conflicts with the default security policy for this component.
			for (let i = 0; i < namespaces.length; i++) {
				const namespace = namespaces[i];
				const namespacePermissions = Object.keys(securityPolicy[namespace]);
				// Component permissions are a subset of system permissions. They do not have to specify anything for System, Window, or Application.
				if (!approvedPermissions[namespace]) approvedPermissions[namespace] = {};

				for (let p = 0; p < namespacePermissions.length; p++) {
					const permissionName = namespacePermissions[p];
					const defaultPermission = securityPolicy[namespace][permissionName];

					// approvedPermissions is the merged object of defaults and what was requested by the component's config.
					let assignedPermission = approvedPermissions[namespace][permissionName];

					if (assignedPermission) {
						// If the component wants to have access to something that the security policy says
						// that it can't, we deny access.
						// Component permissions can only be _more_ restrictive, not less.
						// @NOTE: Only did === false for clarity. Makes the chunk below much more clear.
						if (defaultPermission === false) {
							assignedPermission = false;
						}
					} else if (typeof assignedPermission === "undefined") {
						// if the component doesn't specify whether they want access, fall back to whatever the system says should happen.
						assignedPermission = defaultPermission;
					}
					approvedPermissions[namespace][permissionName] = assignedPermission;
				}
			}
		}
		// The Window Service should not have a permission set to disable the ability to close windows.
		// If it does remove that permission, and log an error.
		const closeDisallowed = approvedPermissions.Window["close"] === false;
		if (descriptor.name === "windowService" && closeDisallowed) {
			Logger.system.error("Window Service cannot be restricted from closing windows, disabling restriction.")
			approvedPermissions.Window["close"] = true;
		}
		return approvedPermissions;
	}
}
