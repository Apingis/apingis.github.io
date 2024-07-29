
import { Range } from './Range.js';


class Intervals extends Array {

	constructor(leftBound = -Infinity, rightBound = Infinity, isCircular) {

		super();

		if (leftBound > rightBound)
			Report.throw("invalid bounds", `${leftBound} ${rightBound}`);

		this.leftBound = leftBound;
		this.rightBound = rightBound;
		this.isCircular = isCircular;
		this.hasFiniteBounds = leftBound !== -Infinity && rightBound !== Infinity;

		if (this.isCircular && !this.hasFiniteBounds)
			Report.throw("circular w/ infinite bounds", `${this}`);
	}


	toString() {

		var outputMax = 5;
		var lB = this.leftBound === -Math.PI ? "-PI" : this.leftBound;
		var rB = this.rightBound === Math.PI ? "PI" : this.rightBound;

		var str = `[Intervals ${lB}..${rB} N=${this.getCount()}`;

		for (let i = 0; i < Math.min(outputMax, this.count) * 2; i += 2)
			str += ` ${Util.toStr(this[i])}..${Util.toStr(this[i + 1])}`;

		return str + (this.getCount() > outputMax ? " ...]" : "]");
	}


	clone() {

		var intervals = new Intervals(this.leftBound, this.rightBound, this.isCircular);

		for (let i = 0; i < this.length; i++)
			intervals[i] = this[i];

		return intervals;
	}


	get count() { return this.length / 2; }

	getCount() { return this.length / 2; }

	clear() {
		this.length = 0;
		return this;
	}

	isClear() { return this.length === 0; }

	isFull() { return this.length === 2 && this[0] === this.leftBound && this[1] === this.rightBound; }


	fill() {

		this[0] = this.leftBound;
		this[1] = this.rightBound;
		if (this.length > 2)
			this.length = 2;

		return this;
	}


	contain(value) { return this.getIndex(value) !== false; }


	getIndex(value) {

		for (let i = 0; i < this.length; i += 2) {

			if (value < this[i])
				return false;

			if (value <= this[i + 1])
				return i;
		}

		return false;
	}


	containRange(range) { // fully

		var i = this.getIndex(range.start);
		if (i === false)
			return false;

		return this[i + 1] >= range.end;
	}


	overlapsInterval() {
		console.assert(!this.isCircular);
//TODO
	}


	getIntervalsInRange(range) { // TODO set bounds?

		console.assert(!this.isCircular);

		var intervals = this._intervalsInRange.clear();

		for (let i = 0; i < this.length; i += 2) {

			// strict inequality: don't output 0-length intervals
			if (this[i] < range.end) {
				if (this[i + 1] > range.start)
					intervals.push( Math.max(range.start, this[i]), Math.min(range.end, this[i + 1]) );

			} else
				break;
		}

		return intervals;
	}


	getFreeWidthInRange(width, range = Range.Everything) {

		var intervals = this.getIntervalsInRange(range);
		var length = intervals.length;

		for (let i = -1; i < length; i += 2) {

			let nextStart, prevEnd;

			if (i === -1) {
				if (intervals[0] <= range.start)
					continue;
				else
					prevEnd = range.start;

			} else
				prevEnd = intervals[i];

			if (i === length - 1) {
				if (intervals[i] >= range.end)
					break;
				else
					nextStart = range.end;

			} else
				nextStart = intervals[i + 1];

			if (nextStart - prevEnd >= width)
				return prevEnd;
		}

		return false;
	}


	getInterval(value) {

		for (let i = 0; i < this.length; i += 2) {

			if (value < this[i])
				return;

			if (value <= this[i + 1])
				return this._getIntervalResult.set(this[i], this[i + 1]);
		}
	}


	getNearestInterval(value) {

		var length = this.length;
		if (length === 0)
			return;

		var getResult = i => this._getIntervalResult.set(this[i], this[i + 1]);

		var getResultCircular = () => {

			var	distanceToStart = this[0] - value,
				distanceToEnd = value - this.leftBound + this.rightBound - this[length - 1];

			return getResult(distanceToStart < distanceToEnd ? 0 : length - 2);
		}


		if (this.isFull())
			return getResult(0);

		if (value < this[0])
			return this.isCircular ? getResultCircular() : getResult(0);

		if (value > this[length - 1])
			return this.isCircular ? getResultCircular() : getResult(length - 2);


		for (let i = 0; i < length; i += 2) {

			if (value <= this[i + 1])
				return getResult(i);

			if (i === length - 2)
				Report.throw("inexpected 1", this);

			if (value < this[i + 2])
				return getResult(value - this[i + 1] < this[i + 2] - value ? i : i + 2);
		}

		Report.throw("inexpected 2", this);
	}


	getNearestValueOnInterval(value, eps = 1e-3) {

		var interval = this.getNearestInterval(value);
		if (!interval)
			return;

		if (interval.getWidth() < 2 * eps)
			return;

		return value - interval.start < eps ? interval.start + eps :
			interval.end - value < eps ? interval.end - eps :
			value;
	}

/*
	getNearestValueNotOnOpenInterval(value) { // tested

		if (this.isFull())
			return;

		var interval = this.getInterval(value);
		if (!interval)
			return value;


		var getNearestNearBounds = (width, isTowardsUpperValue) => {

			var	start = this[this.length - 2],
				end = this[1],
				intervalWidth = end - this.leftBound + this.rightBound - start;

			return (width > intervalWidth / 2) === isTowardsUpperValue ? start : end;
		};


		if (this.hasFiniteBounds) {

			if (this.isCircularIntervalCrossingBounds()) {

				if (interval.start === this.leftBound)
					return getNearestNearBounds(interval.end - value, true);

				else if (interval.end === this.rightBound)
					return getNearestNearBounds(value - interval.start, false);
			}

			return value - interval.start <= interval.end - value
				? interval.start : interval.end;
		}

		Report.throw(`TODO`);

		//if (interval.start === this.leftBound) {
		//	if (!Number.isFinite(this.leftBound))
	}
*/
/*
	// directionSgn: 1 increase, -1 decrease. Return index of interval start or undef.
	getNearestIndexInDirection(value, directionSgn) {

		var length = this.length;
		if (length === 0)
			return;

		if (this.isFull())
			return 0;

		if (value < this[0])
			return directionSgn === 1 ? 0 : this.isCircular ? length - 2 : undefined;

		if (value > this[length - 1])
			return directionSgn === -1 ? length - 2 : this.isCircular ? 0 : undefined;


		for (let i = 0; i < length; i += 2) {

			if (value <= this[i + 1])
				return i;

			if (i === length - 2)
				Report.throw("inexpected 1", this);

			if (value < this[i + 2])
				return directionSgn === -1 ? i : i + 2;
		}

		Report.throw("inexpected 2", this);
	}
*/

	removeShort(minWidth = 2e-3) {

		if (this.isCircularIntervalCrossingBounds())

			if (this[0] - this.leftBound + this.rightBound - this[this.length - 1] < minWidth) {
				this.copyWithin(0, 2);
				this.length -= 4;
			}

		for (let i = 0; i < this.length; i += 2)

			if (this[i + 1] - this[i] < minWidth) {
				Util.cut(this, i, 2);
				i -= 2;
			}
	}


	isCircularIntervalCrossingBounds() {

		return this.isCircular && this.length >= 4
			&& this[0] === this.leftBound && this[this.length - 1] === this.rightBound;
	}


	//
	// If an interval is split into 2 (because it intersects bounds)
	// then it is processed as 1 interval
	// (except for .isFull() condition)
	//
	process(callbackFn) {

		var	startI, endI;

		if (this.isCircularIntervalCrossingBounds()) {

			startI = 2;
			endI = this.length - 2;
			callbackFn(this[endI], this[1] + this.rightBound - this.leftBound);

		} else {
			startI = 0;
			endI = this.length;
		}

		for (let i = startI; i < endI; i += 2)
			callbackFn(this[i], this[i + 1]);

		return this;
	}


	processSome(callbackFn) {

		var	startI, endI;

		if (this.isCircularIntervalCrossingBounds()) {

			startI = 2;
			endI = this.length - 2;
			if ( callbackFn(this[endI], this[1] + this.rightBound - this.leftBound) )
				return true;

		} else {
			startI = 0;
			endI = this.length;
		}

		for (let i = startI; i < endI; i += 2)
			if ( callbackFn(this[i], this[i + 1]) )
				return true;
	}


	mergeCircularInDirection(aFrom, aTo, isCCW = true) {

		isCCW ? this.mergeIn(aFrom, aTo) : this.mergeIn(aTo, aFrom);
	}


	mergeCircularClosestPath(value1, value2) {

		var	min = Math.min(value1, value2),
			max = Math.max(value1, value2);

		if (max - min < (this.rightBound - this.leftBound) / 2) {

			this.mergeInRaw(min, max);

		} else {
			this.mergeIn(max, min);
		}
//console.error(`mergeCircularClosestPath ${value1} ${value2} | result:`, this.clone());
	}


	mergeNormalizeAngles(start, end) {

		console.assert(this.isCircular === true && this.rightBound === Math.PI && this.leftBound === -Math.PI);

		this.mergeIn( Angle.normalize(start), Angle.normalize(end) );

		return this;
	}


	mergeIn(start, end) {

		if (Main.DEBUG && (
				start < this.leftBound || start > this.rightBound
				|| end < this.leftBound || end > this.rightBound) ) {

			Report.warn("bad start/end", `${this} start=${start} end=${end}`);

			start = Util.clamp(start, this.leftBound, this.rightBound);
			end = Util.clamp(end, this.leftBound, this.rightBound);
		}

		if (start > end) {

			if (!this.isCircular)
				Report.throw("start > end", `${this} start=${start} end=${end}`);

			this.mergeInRaw(this.leftBound, end);
			this.mergeInRaw(start, this.rightBound);

		} else {
			this.mergeInRaw(start, end);
		}

//console.error(`mergeIn ${start} ${end} | result:`, this.clone());
	}


	mergeInIntervals(intervals) {

		for (let i = 0; i < intervals.length; i += 2)
			this.mergeInRaw(intervals[i], intervals[i + 1]);

		return this;
	}


	add(start, end) { this.mergeInRaw(start, end); }

	merge(start, end) { this.mergeInRaw(start, end); }

	mergeRange(range) { this.mergeInRaw(range.start, range.end); }


	mergeInRaw(start, end) {

		if (start > end)
			Report.throw("bad start/end", `${this} start=${start} end=${end}`);

		var length = this.length;
		var i;
		var intersectedCount = 0;

		for (i = 0; i < length; i += 2) {
			if (end < this[i])
				break;

			if (start <= this[i + 1]) {
				start = Math.min(start, this[i]);
				intersectedCount = 1;
				break;
			}
		}

		var intersectedFirst = i;

		if (intersectedCount === 1)
			for ( ; ; i += 2) {
				if (end <= this[i + 1]) {
					end = Math.max(end, this[i + 1]);
					break;
				}

				if (i >= length - 2 || end < this[i + 2]) // nextStart
					break;
				intersectedCount ++;
			}

		Util.cutAndInsert(this, intersectedFirst, intersectedCount * 2, 2, start, end);
	}


	addCircleX(circle) {
		this.mergeIn(circle.x - circle.radius, circle.x + circle.radius);
	}


	subtract(start, end) {

		console.assert(!this.isCircular);

		var removeI, removeCount = 0;

		for (let i = 0; i < this.length; i += 2) {

			let intStart = this[i], // interval [intStart..intEnd]
				intEnd = this[i + 1];

			if (start >= intEnd)
				continue;

			if (end <= intStart)
				break;

			// intersection: interval and subtraction area

			if (start > intStart) {

				if (end < intEnd) { // subtraction splits interval into 2
					this.splice(i + 1, 0, start, end);
					return;

				} else {
					this[i + 1] = start;
				}

			// start <= intStart
			} else if (end < intEnd) {
				this[i] = end;
				break;

			} else { // interval to be removed
				if (removeCount === 0)
					removeI = i;
				removeCount ++;
			}
		}

		if (removeCount !== 0)
			this.splice(removeI, removeCount * 2);
	}


	// Return true if one of the intervals totally covers [start, end]
	isWhollyCovering(start, end) {

		console.assert(!this.isCircular);

		for (let i = 0; i < this.length; i += 2)
			if (start >= this[i])
				return end <= this[i + 1];

		return false;
	}


	isWhollyCoveringCircleX(circle) {
		return this.isWhollyCovering(circle.x - circle.radius, circle.x + circle.radius);
	}


	// Remove everything before start and after end
	cut(start, end) {

		console.assert(!this.isCircular);

		this.subtract(-Infinity, start);
		this.subtract(end, Infinity);
		return this;
	}


	getInverted() {
		return this.clone().invert();
	}


	invert() {

		var	length = this.length;
		if (length === 0)
			return this.fill();

		var isRightClosed = this[length - 1] === this.rightBound;

		if (this[0] === this.leftBound) {

			this.copyWithin(0, 1);

			if (isRightClosed)
				this.length = length - 2;
			else
				this[length - 1] = this.rightBound;

		} else {
			if (!isRightClosed)
				this.push(this.rightBound, null);

			this.copyWithin(1);
			this[0] = this.leftBound;
		}

		return this;
	}


	getRotated(amount) {

		console.assert(this.isCircular);

		var result = new Intervals(this.leftBound, this.rightBound, this.isCircular);

		//var normalize = (value) => value > this.rightBound ? value - this.rightBound + this.leftBound : value;

		console.assert(this.rightBound === Math.PI && this.leftBound === -Math.PI);

		this.process( (start, end) => result.mergeNormalizeAngles(start + amount, end + amount) ); 

		return result;
	}

/*
	circularSplitLongInterval() {

		for (let i = 0; i < this.length; i += 2) {

			let diff = this[i + 1] - this[i];

			if (diff >= Math.PI) {
				Util.cutAndInsert(this, i + 1, 0, 2, this[i] + diff / 2, this[i] + diff / 2);
				break;
			}
		}
	}


	getCircularAppliedMatrix4(matrix4) {

		console.assert(this.rightBound === Math.PI && this.leftBound === -Math.PI);

		this.circularSplitLongInterval();

		var v = Util._v;

		var getTransformed = a => {
			v.set(Math.cos(a), Math.sin(a), 0).applyMatrix4(matrix4);
			return Math.atan2(v.z, v.x);
		};

		var result = this._circularAppliedMatrix4.clear();

		for (let i = 0; i < this.length; i += 2) {

			let	a1 = getTransformed(this[i]),
				a2 = getTransformed(this[i + 1]);

			result.mergeCircularClosestPath(a1, a2);
		}

		return result;
	}
*/
}


Object.assign(Intervals.prototype, {

	_getIntervalResult: new Range,
	_intervalsInRange: new Intervals,
	_circularAppliedMatrix4: new Intervals(-Math.PI, Math.PI, true),
});



export { Intervals };

