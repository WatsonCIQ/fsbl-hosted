import {
  WindowCreationParams,
} from "./Interface_BasePrivateWindow";

import {
  Interface_Window,
} from "./Interface_Window";

import RouterClient from "../../../clients/routerClientInstance";
import Logger from "../../../clients/logger";
import { FinsembleWindowInternal } from "../WindowAbstractions/FinsembleWindowInternal";

export class LauncherEntry {
  manifest: any;
  launcher: any;

  constructor(manifest, launcher) {
    this.manifest = manifest;
    this.launcher = launcher;
    this.bindAllFunctions();
    this.definePubicInterface();
  }

  async initialize(done) {
    done();
  }

  windowServiceChannelName(channelTopic) { return `WindowService-Request-${channelTopic}`; }

  bindAllFunctions() {
    let self = this;
    for (let name of Object.getOwnPropertyNames(Object.getPrototypeOf(self))) {
      if (self[name] instanceof Function) {
        self[name] = self[name].bind(self); // only bind function properties
      }
    }
  }

  // invoked by serviceEntryPoint shutdown
  shutdown(done) {
    done();
  }

  definePubicInterface() {
    // Note: More Cleanup To Do: better to have all the router message handling done here, with pure calls into to the launcher (i.e. not passing in router message to launcher).
    // So for now using the launcher code close to as-is, although had to do some refactoring for this interface

    Logger.system.debug(`LauncherEntry.definePubicInterface`);

    RouterClient.addPubSubResponder("Launcher.WindowList", []);

    RouterClient.addResponder("LauncherService.addWindowToGroups", (err, message) => {
      this.launcher.addWindowToGroups(message.data);
      message.sendQueryResponse(null, "success");
    });

    RouterClient.addResponder("LauncherService.deleteWindowGroup", this.launcher.deleteWindowGroup.bind(this));

    RouterClient.addResponder("Launcher.componentList", (err, message) => {
      let components = this.launcher.getComponents();
      message.sendQueryResponse(err, components);
    });

    RouterClient.addResponder("LauncherService.createWindowGroup", this.launcher.createWindowGroup.bind(this));

    RouterClient.addResponder("LauncherService.getGroupsForWindow", (err, message) => {
      message.sendQueryResponse(null, this.launcher.getGroupsForWindow(message.data));
    });

    RouterClient.addResponder("Launcher.getActiveDescriptors", (err, message) => {
      message.sendQueryResponse(null, this.launcher.getActiveDescriptors());
    });

    RouterClient.addResponder("LauncherService.getComponentsThatCanReceiveDataTypes", (err, message) => {
      message.sendQueryResponse(null, this.launcher.getComponentsThatCanReceiveDataTypes(message.data.dataTypes));

    });

    RouterClient.addResponder("Launcher.getMonitorInfo", (err, message) => {
      Logger.system.debug("LauncherEntry.getMonitorInfo request" + JSON.stringify(message));
      this.launcher.getMonitorInfo(message.data, function (err, response) {
        message.sendQueryResponse(err, response);
      });
    });

    RouterClient.addResponder("Launcher.getMonitorInfoAll", (err, message) => {
      Logger.system.debug("LauncherEntry.getMonitorInfoAll request" + JSON.stringify(message));
      this.launcher.getMonitorInfoAll((err, monitors) => {
        message.sendQueryResponse(err, monitors);
      });
    });

    RouterClient.addResponder("Launcher.removeComponent", (err, message) => {
      this.launcher.remove(message.data.name);
      message.sendQueryResponse(err, message.data);
    });

    RouterClient.addResponder("Launcher.showWindow", (err, message) => {
      //@todo only return after the window is ready...if asked to
      Logger.system.debug("LauncherEntry.showWindow request" + JSON.stringify(message));
      this.launcher.showWindow(message.data.windowIdentifier, message.data, function (err, descriptor) {
        message.sendQueryResponse(err, descriptor);
      });
    });

    RouterClient.addResponder("Launcher.spawn", (err, message) => {
      // The requester is the window name of whoever requested the spawn.
      // That window is allowed to call executeJavaScript on the wrap.
      if (!message.data.options) message.data.options = {};
      message.data.options.execJSWhitelist = [message.header.origin.replace("RouterClient.", "")];

      this.launcher.spawn(message.data, function (error, descriptor) {
        Logger.system.debug("LauncherEntry.Spawn done", message);
        message.sendQueryResponse(error, descriptor);
      });
    });
    RouterClient.addResponder("Launcher.userDefinedComponentUpdate", (err, message) => {
      function respond(error, response) {
        message.sendQueryResponse(error, response);
      }
      if (message.data.type === "add") {
        this.launcher.addUserDefinedComponent(message, respond);
      } else if (message.data.type === "remove") {
        this.launcher.removeUserDefinedComponent(message, respond);
      }
    });

    RouterClient.addResponder("LauncherService.addWindowsToGroup", (err, message) => {
      let errString = this.launcher.addWindowsToGroups(message.data);
      if (errString) {
        message.sendQueryResponse(errString);
      } else {
        message.sendQueryResponse(null, "Success");
      }
    });

    RouterClient.addResponder("LauncherService.getWindowsInGroup", (err, message) => {
      let windowList = this.launcher.getWindowsInGroup(message.data.groupName);
      message.sendQueryResponse(null, windowList);
    });

    RouterClient.addResponder("LauncherService.removeWindowsFromGroup", (err, message) => {
      let errString = this.launcher.removeWindowsFromGroup(message.data);
      if (errString) {
        message.sendQueryResponse(errString);
      } else {
        message.sendQueryResponse(null, "Success");
      }
    });

    RouterClient.addResponder("LauncherService.bringWindowsToFront", (err, message) => {
      let errString = this.launcher.bringWindowsToFront(err, message);
      if (errString) {
        message.sendQueryResponse(errString);
      } else {
        message.sendQueryResponse(null, "Success");
      }
    });

    RouterClient.addListener("LauncherService.hyperFocus", this.launcher.hyperFocus.bind(this));

    RouterClient.addListener("LauncherService.minimizeWindows", this.launcher.minimizeWindows.bind(this));

    RouterClient.addListener("LauncherService.restart", this.launcher.restart);
    RouterClient.addResponder("LauncherService.registerComponent", this.launcher.registerComponent.bind(this.launcher));
    RouterClient.addResponder("LauncherService.unRegisterComponent", this.launcher.unRegisterComponent.bind(this.launcher));

    RouterClient.addListener("Launcher.resetSpawnStagger", (err, message) => {
      this.launcher.resetSpawnStagger(message.data);
    });
  }
}
