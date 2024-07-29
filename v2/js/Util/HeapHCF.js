//
// =============================================================================
//
//   HeapHCF
//
// The version of Binary Min-Heap designed for the case of "heavy" comparison function,
// minimizes number of function calls.
//
// It has the following properties:
//
// 1. cmpValueFn derives comparison value from an object in heap, value is used
//    to compare object with values of other objects.
// 1.1. Object's value does not depend on other objects.
// 1.2. Object's value does not change during insert/remove transaction, however
//      it may change in between transactions (e.g. when AngularSweep progresses).
//
// 2. To find an object, heap is to be searched directly e.g. with Array.prototype.indexOf().
//    This appears to be the fastest solution for given use case (< 20-50 objects).
//
// =============================================================================
//
class HeapHCF extends Array {

	constructor(cmpValueFn) {
		super();
		this.cmpValueFn = cmpValueFn;
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


	valueOf() { return this[0]; }

	clear() {
		this.length = 0;
		return this;
	}


	fetch() {
		if (this.length === 0)
			return;

		var obj = this[0];
		this.removeByIndex(0);
		return obj;
	}


	insert(obj, value) {

		var i;

		if (this.length === 0) {
			i = 0;

		} else {
			if (value === undefined)
				value = this.cmpValueFn(obj);

			i = this.moveUp(this.length, value);
		}

		this[i] = obj;
		return i;
	}


	insertArray(array) {
		for (let i = 0; i < array.length; i++)
			this.insert(array[i]);
		return this;
	}


	initializeFromArray(array) {

		this.clear();

		for (let i = 0; i < array.length; i++)
			this[i] = array[i];

		this.heapifyNonLeaf();
		return this;
	}


	initializeFromSet(set) { // TODO improvement possible?

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
				value = this.cmpValueFn(obj),
				newObjIndex = this.moveDown(i, value);

			if (newObjIndex != i)
				this[newObjIndex] = obj;
		}
	}


	remove(obj) {

		var i = this.indexOf(obj);
		if (i === -1) {
			console.error(`remove: not in heap: obj=${obj}`);
			return -1;
		}

		this.removeByIndex(i);
		return i;
	}


	removeByIndex(i) { //this[i] <-- object for remove

		var obj = this.pop();

		if (i === this.length) // popped object is the object for remove
			return;

		var objNewIndex;

		if (this.length === 1) {
			objNewIndex = 0;

		} else {
			let value = this.cmpValueFn(obj);

			objNewIndex = this.moveUp(i, value);
			if (objNewIndex === i)
				objNewIndex = this.moveDown(i, value);
		}

		this[objNewIndex] = obj;
	}


	replace(value, newValue) { // same priority

		var i = this.indexOf(value);
		if (i === -1) {
			console.error(`replace: not in heap: value=${value}`);
			return -1;
		}

		this[i] = newValue;
		return i;
	}


	moveUp(i, value) {

		var cmpValueFn = this.cmpValueFn;

		while (i > 0) {
			let parentIndex = (i - 1) >> 1;
			if (value >= cmpValueFn(this[parentIndex]))
				break;

			this[i] = this[parentIndex];
			i = parentIndex;
		}
		return i;
	}


	moveDown(i, value) {

		var length = this.length,
			cmpValueFn = this.cmpValueFn;

		while (1) {
			let child1Index = 2 * i + 1;
			if (child1Index >= length)
				break;

			let child1Value = cmpValueFn(this[child1Index]),
				child2Index = child1Index + 1,
				swapIndex;

			if (value > child1Value) { // #1 is OK for swap
				if (child2Index >= length // #2 doesn't exist OR #1 is better for swap
						|| cmpValueFn(this[child2Index]) >= child1Value) {

					swapIndex = child1Index;

				} else { // #2 exists and it's better for swap
					swapIndex = child2Index;
				}

			} else if (child2Index < length && value > cmpValueFn(this[child2Index])) {

				swapIndex = child2Index;

			} else
				break;

			this[i] = this[swapIndex];
			i = swapIndex;
		}

		return i;
	}

}




export { HeapHCF };

