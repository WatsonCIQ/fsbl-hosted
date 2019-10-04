import { ObjectPool } from "./ObjectPool";

class WindowPool extends ObjectPool {
	*iterator() {
		for (let windowName in this.objects) {
			let win = this.get(windowName);
			if (!win.isMinimized && !win.isHidden) {
				yield win;
			}
		}
	}
}
export { WindowPool }