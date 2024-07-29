
class EventSource {

	constructor() {

		this._listeners = null;
	}


	addListener(key, fn) {

		if (this._listeners === null)
			this._listeners = new Map;

		// just replace it
		//if (this._listeners.has(key))
		//	return Report.warn("already has key", `k="${key}"`);

		console.assert(typeof fn == "function");

		this._listeners.set(key, fn);
//console.error(`${this.id} SET _listeners k=${key}`);
	}


	hasListener(key) {
		return this._listeners && this._listeners.has(key);
	}


	removeListener(key) {
//console.error(`${this.id} REMOVE _listeners k=${key}`);
		this._listeners && this._listeners.delete(key);
	}


	removeAllListeners() {
		this._listeners = null;
	}


	runEvent(type, arg1) {

		this._listeners && this._listeners.forEach(fn => {

			fn(type, arg1);
		});
	}

}




export { EventSource }

