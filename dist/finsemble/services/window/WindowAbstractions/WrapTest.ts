import RouterClient from "../../../clients/routerClientInstance";

import { BaseWindow } from "./BaseWindow";
import OpenfinWindow  from "./openfinWindowWrapper";

export function testWraps() {
  let myWrap = BaseWindow.getInstance({ windowName: "wrap1" });
  myWrap.onReady(() => {
    console.log("Wrap is ready.");
    console.log("Has private get bounds", myWrap.hasOwnProperty('_getBounds'));
    console.log(myWrap instanceof OpenfinWindow)
  });
  RouterClient.publish("Finsemble.Component.State.wrap1", { state: "ready" });
}
