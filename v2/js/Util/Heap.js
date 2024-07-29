
class Heap extends Array { // binary min-heap

	constructor(cmpFn = (a, b) => a - b, mapFn = null) {

		super();

		this.cmpFn = cmpFn;
		this.mapFn = mapFn;
		// TODO if indexed, time complexity increases to O(N * log^2 N)
		this._map = mapFn ? Object.create(null) : null;
	}


	toString() {

		var numDisplay = 10,
			str = `[${this.constructor.name} ${this.length}el`;

		for (let i = 0; i < Math.min(this.length, numDisplay); i++)
			str += ` ${this[i]}`;
		if (this.length > numDisplay)
			str += " ...";
		return str + "]";
	}


	clear() {
		this.length = 0;
		if (this.mapFn)
			this._map = Object.create(null);
		return this;
	}

	valueOf() { return this[0]; }

	first() { return this[0]; }


	initializeFromArray(array) {

console.assert(!this.mapFn);
		this.clear();

		for (let i = 0; i < array.length; i++)
			this[i] = array[i];

		this.heapifyNonLeaf();
		return this;
	}


	initializeFromSet(set) {

console.assert(!this.mapFn);
		this.clear();
		var i = 0;

		for (let obj of set)
			this[i++] = obj;

		this.heapifyNonLeaf();
		return this;
	}


	heapifyNonLeaf() {

		for (let i = this.length >> 1; i >= 0; i--) {

			let obj = this[i],
				newObjIndex = this.moveDown(obj, i);

			if (newObjIndex !== i)
				this[newObjIndex] = obj;
		}
	}


	verify() {

		var endI = this.length - 1;

		for (let i = 0; i < Math.ceil(this.length / 2); i++) {

			if (i * 2 + 1 <= endI && this.cmpFn(this[i], this[i * 2 + 1]) > 0)
				return Report.warn("incorrect 1:", `${i} ${i * 2 + 1}`);

			if (i * 2 + 2 <= endI && this.cmpFn(this[i], this[i * 2 + 2]) > 0)
				return Report.warn("incorrect 2:", `${i} ${i * 2 + 2}`);
		}

		return true;
	}


	fetch() {

		if (this.length === 0)
			return;

		var resultObj = this[0];

		this.removeByIndex(0);

		return resultObj;
	}


	insert(obj) {

		var i = this.moveUp(obj, this.length);

		this[i] = obj;

		if (this.mapFn !== null)
			this._map[ this.mapFn(obj) ] = i;

		return i;
	}


	insertArray(array) {
		for (let i = 0; i < array.length; i++)
			this.insert(array[i]);
		return this;
	}


	getObjById(objId) {

		if (this.mapFn === null)
			Report.throw("no mapFn");

		var i = this._map[objId];

		if (i !== undefined)
			return this[i];
	}


	getObjIndex(obj, noWarning) {

		var i;

		if (this.mapFn !== null) {

			i = this._map[ this.mapFn(obj) ];
			if (i === undefined)
				i = -1;

		} else
			i = this.indexOf(obj);

		if (i === -1 && !noWarning)
			Report.warn("getObjIndex: not in heap", `obj=${obj}`);

		return i;
	}


	remove(obj, noWarning) {

		var i = this.getObjIndex(obj, noWarning);

		if (i !== -1)
			this.removeByIndex(i);
	}


	replace(obj, newObj) { // w/ same priority

		var i = this.getObjIndex(obj);

		this[i] = newObj;

		if (this.mapFn !== null) {
			delete this._map[ this.mapFn(obj) ];
			this._map[ this.mapFn(newObj) ] = i;
		}
	}


	removeByIndex(i) { // this[i] <-- object for remove

		if ( !(i >= 0 && i < this.length) ) {
			Report.warn("not in heap", `i=${i}`);
			return;
		}

		if (this.mapFn !== null) {

			let result = delete this._map[ this.mapFn(this[i]) ];
			if (result !== true) {
				Report.warn("not in map", `i=${i} obj=${obj}`);
				return;
			}
		}

		var obj = this.pop();

		if (i !== this.length) { // popped object is not the object for remove

			let objNewIndex = this.moveUp(obj, i);
			if (objNewIndex === i) {
				objNewIndex = this.moveDown(obj, i);
			}

			this[objNewIndex] = obj;

			if (this.mapFn !== null)
				this._map[ this.mapFn(obj) ] = objNewIndex;
		}
	}


	moveUp(obj, i) {

		while (i > 0) {

			let parentIndex = (i - 1) >> 1;
			let moveObj = this[parentIndex];

			if (this.cmpFn(obj, moveObj) >= 0)
				break;


			this[i] = moveObj;

			if (this.mapFn !== null)
				this._map[ this.mapFn(moveObj) ] = i;

			i = parentIndex;
		}

		return i;
	}


	moveDown(obj, i) {

		var length = this.length;

		while (1) {

			let child1Index = 2 * i + 1;
			if (child1Index >= length)
				break;

			let child2Index = child1Index + 1;
			let swapIndex;
			let moveObj;

			// In a heap, objects must be strictly inequal

			if (this.cmpFn(obj, this[child1Index]) > 0 // #1 is OK for swap
				&& (child2Index >= length // and #2 doesn't exist OR #1 is better for swap/equal
					|| this.cmpFn(this[child2Index], this[child1Index]) >= 0)) {

				swapIndex = child1Index;
				moveObj = this[child1Index];

			} else if (child2Index < length && this.cmpFn(obj, this[child2Index]) > 0) {

				swapIndex = child2Index;
				moveObj = this[child2Index];

			} else
				break;

			this[i] = moveObj;

			if (this.mapFn !== null)
				this._map[ this.mapFn(moveObj) ] = i;

			i = swapIndex;
		}

		return i;
	}

}




export { Heap }

