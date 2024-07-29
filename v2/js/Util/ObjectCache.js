
class ObjectCache {

	constructor(n, createFn, freeFn) {

		this.n = n;
		this.createFn = createFn;
		this.freeFn = freeFn;

		this._array = [];
		this._cnt = 0;

		this._created = 0;
		this._allocated = 0;
		this._discarded = 0;
		this._freed = 0;
	}


	alloc() {

		if (this._cnt === 0) {

			this._created ++;
			return this.createFn();
		}

		this._allocated ++;

		var i = -- this._cnt;
		var obj = this._array[i];

		this._array[i] = null;

		return obj;
	}


	free(obj) {

		if (this._cnt >= this.n) {

			this._discarded ++;
			return;
		}

		this._freed ++;

		this.freeFn && this.freeFn(obj);

		this._array[ this._cnt ++ ] = obj;
	}

}




export { ObjectCache };

