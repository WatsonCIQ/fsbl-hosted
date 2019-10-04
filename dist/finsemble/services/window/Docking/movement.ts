

// example file to illustrate the interface hooks which may or may not be used by Docking

import {
	BasePrivateWindowInterface,
	WindowCreationParams,
	WindowParams
} from "../ServiceEntryPoints/Interface_BasePrivateWindow";

import {
	Interface_Window,
	DockingParams,
} from "../ServiceEntryPoints/Interface_Window";

function stub() {
	return new Promise((resolve) => {
		let result = { err: null, data: null };
		resolve(result)
	});
}

class Movement implements Interface_Window.Docking {
	constructor() {
	}
	register(params: DockingParams) { return stub(); }
	unregister(params: DockingParams) { return stub(); }
}