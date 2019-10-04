/**
 * The system needs to use certain functionality on windows that aren't managed by the window service. This code lives inside of the old 'docking' code, which operates on dockableWindows. For windows that aren't managed by the window service, we need to create a functional interface so that we don't have to rewrite all that code. This is used in getMonitorForWindow. Given an object with a name and some bounds, it'll create a dummy object that won't throw errors when we try to operate on it.
 */
export class MockDockableWindow {
	name: string;
	left: number;
	right: number;
	top: number;
	bottom: number;
	width: number;
	height: number;

	constructor(params) {
		if (!params || !params.name) throw new Error("No params passed to MockDockableWindow.");
		this.name = params.name;
		this.left = params.left;
		this.top = params.top;
		this.right = params.right;
		this.bottom = params.bottom;
		this.width = params.width;
		this.height = params.height;
	}

	getBounds = () => {
		return {
			left: this.left,
			top: this.top,
			right: this.right,
			bottom: this.bottom,
			width: this.width,
			height: this.height
		};
	};
}