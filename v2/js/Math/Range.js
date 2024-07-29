
class Range {

	constructor(start = -Infinity, end = Infinity) {

		this.start = start;
		this.end = end;
	}


	toString() { return `[Range ${Util.toStr(this.start)}...${Util.toStr(this.end)}]`; }

	set(start, end) {
		this.start = start;
		this.end = end;
		return this;
	}

	getWidth() { return this.end - this.start; }

	getAvg() { return 0.5 * (this.start + this.end); }

	contains(value) { return value >= this.start && value <= this.end; }


	expand(d) {
		this.start -= d;
		this.end += d;
		return this;
	}


	static setFromArray(array, fn, range = Range._fromArray) {

		var	min = Infinity,
			max = -Infinity,
			length = array.length;

		for (let i = 0; i < length; i++) {

			let val = fn(array[i], i);

			if (typeof val !== "number" || val !== val)
				Report.throw("bad value", `v="${val}" i=${i}`);

			min = Math.min(min, val);
			max = Math.max(max, val);
		}

		return range.set(min, max);
	}

}


Range.Everything = Object.freeze(new Range);

Range._fromArray = new Range;



export { Range };

