/** Singleton of the Logger class shared among all instances of ObjectPool
 * @TODO Refactor to instance member of class.
 */
let Logger;
export class ObjectPool {
	objects: any;
	poolName: string;
	constructor(name: string, dependencies: { Logger: any }) {
		if (dependencies) {
			Logger = dependencies.Logger;
		} else {
			throw new Error("ObjectPool class requires dependency injection. Ensure that dependencies are being passed in as the 2nd parameter.");
		}
		this.objects = {};
		this.poolName = name;
	}

	get(name, throwError = true) {
		var result;
		if (!this.objects.hasOwnProperty(name)) {
			if (throwError && name && !(name.toLowerCase().includes("finsemble") || name.toLowerCase().includes("service"))) {
				Logger.system.warn(`${this.poolName} pool.get failed for ${name}`);
			}
		} else {
			result = this.objects[name];
		}
		return result;
	}

	remove(name) {
		Logger.system.debug(`${this.poolName} pool.remove for ${name}`);
		if (!this.objects.hasOwnProperty(name)) {
			Logger.system.warn(`${this.poolName} pool.remove operating on non-existent value for ${name}`);
		}

		delete this.objects[name];
	}

	add(name, obj) {
		Logger.system.debug(`${this.poolName} pool.add for ${name}`);
		if (this.objects.hasOwnProperty(name)) {
			Logger.system.warn(`${this.poolName} pool.add overwriting existing value for ${name}`);
		}

		this.objects[name] = obj;
	}

	*iterator() {
		for (let name in this.objects) {
			let obj = this.get(name);
			yield obj;
		}
	}
	getAll() {
		return this.objects;
	}
}