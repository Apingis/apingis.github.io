
class CirclePacking {

	constructor(width, height = Infinity, type) {

		this.width = width;
		this.height = height;

		if (type != "ClosedEnded" && type != "OpenEnded") {

			if (type)
				Report.warn("bad type", `type=${type}`);

			type = "OpenEnded";
		}

		this.type = type;

		this.EPSILON = 1e-3;

		var	getSlotMin = slot => slot.circle.x - slot.circle.radius,
			getSlotMax = slot => slot.circle.x + slot.circle.radius;

		this.slots = new IntervalSGTree.Wrapper(getSlotMin, getSlotMax);

		this.openSlots = new IntervalSGTree.Wrapper(getSlotMin, getSlotMax);

		this.occupiedIntervals = new Intervals(0, width);
		this.range = new Range(0, width);
	}


	clear() {

		this.slots.clear();
		this.openSlots.clear();
		this.occupiedIntervals.clear();
		return this;
	}


	isCircleInsideRect(circle) {

		var r = circle.radius;

		return circle.x - r >= 0 && circle.x + r <= this.width
			&& circle.y - r >= 0 && circle.y + r <= this.height;
	}


	validateCirclePosition(circle, ifVerbose) {

		if (!this.isCircleInsideRect(circle)) {

			if (ifVerbose)
				Report.warn("not inside rect", `${circle}`);

			return;
		}

		var r = circle.radius - this.EPSILON;

		//var result = this.openSlots.every(circle.x - r, circle.x + r, slot => {
		var result = this.slots.every(circle.x - r, circle.x + r, slot => {

			var d = circle.distanceToCircle(slot.circle);

			if (d < -this.EPSILON) {

				if (ifVerbose)
					Report.warn("too close", `d=${d} ${circle}`);

			} else
				return true;
		});

		return result;
	}


	recomputeOpenSlots() {

		this.openSlots.clear();

		this.slots.forEach(slot => {

			var y = slot.circle.y;
			var intervals = this._intervals.clear();

			this.slots.forEachOverlapping(slot, slot2 => {

				if (y < slot2.circle.y)
					intervals.mergeRange(slot2.getRange());
			});

			if ( !intervals.containRange( slot.getRange() ) )
				this.openSlots.insert(slot);
		});
	}


	isSlotOpen(slot) {

		var y = slot.circle.y;
		var intervals = this._intervals.clear();

		this.openSlots.forEachOverlapping(slot, slot2 => {

			if (y < slot2.circle.y)
				intervals.mergeRange(slot2.getRange());
		});

		return !intervals.containRange( slot.getRange() );
	}


	addCircle(circle, ifVerbose) {

		if (!this.validateCirclePosition(circle, ifVerbose))
			return;

		var slot = new CirclePacking.Slot(circle);

		this.slots.insert(slot);

		this.openSlots.insert(slot);
		this.openSlots.searchOverlapping(slot).forEach(slot2 => {

			if (!this.isSlotOpen(slot2))
				this.openSlots.remove(slot2);
		});

		this.occupiedIntervals.addCircleX(circle);

		return slot;
	}



	getPlacementOnGround(r, range) {

		var centralRange = this._centralRange.set(

			range.start + range.getWidth() * 0.25,
			range.end - range.getWidth() * 0.25
		);

		var x0 = this.occupiedIntervals.getFreeWidthInRange(2 * r, centralRange);

		if (x0 !== false)
			return Util.froundPos(x0);

		x0 = this.occupiedIntervals.getFreeWidthInRange(2 * r, range);

		if (x0 !== false)
			return Util.froundPos(x0);
	}


	//
	// TODO out of range placement? (on 2 circles)
	// mb.TODO other approach: generate position 1st, then check
	// TODO/onDemand remove 1 circle
	//
	getAvailableCircle(r, range = this.range, option) {

		console.assert(r < range.getWidth());

		var getFirst = option == "getFirst";

		var availableCircle = new Circle(0, Infinity, 0);

		var x0 = this.getPlacementOnGround(r, range);
		if (typeof x0 == "number") {

			availableCircle.set(x0 + r, r, r);

			if (this.isCircleInsideRect(availableCircle)) // low height case
				return availableCircle;
			else
				return;
		}


		var openSlots = this.openSlots.searchRange(range);

		// circle + neighbor. openSlots are sorted by x-r.
		for (let i = 0; i < openSlots.length - 1; i++) {

			let slot1 = openSlots[i];

			for (let j = i + 1; j < openSlots.length; j++) {

				let slot2 = openSlots[j];
				let d = slot1.circle.radius + slot2.circle.radius + 2 * r - this.EPSILON;

				if (Math.abs(slot1.circle.x - slot2.circle.x) < d) {

					this.tryPlacementOn2Slots(slot1, slot2, r, availableCircle);
					if (getFirst && availableCircle.y < Infinity)
						return availableCircle;

				} else
					break;
			}
		}

		// circle + vertical side. openSlots are sorted by x-r.
		if (this.type == "ClosedEnded") {

			for (let i = 0; i < openSlots.length; i++) {

				let slot = openSlots[i];
				let d = slot.circle.radius + 2 * r - this.EPSILON;

				if (slot.circle.x < d) {

					this.tryPlacementOnSlotAndSide(slot, 0, r, availableCircle);
					if (getFirst && availableCircle.y < Infinity)
						return availableCircle;

				} else
					break;
			}

			for (let i = openSlots.length - 1; i >= 0; i--) {

				let slot = openSlots[i];
				let d = slot.circle.radius + 2 * r - this.EPSILON;

				if (slot.circle.x > this.width - d) {

					this.tryPlacementOnSlotAndSide(slot, this.width, r, availableCircle);
					if (getFirst && availableCircle.y < Infinity)
						return availableCircle;

				} else
					break;
			}
		}

		if (availableCircle.y < Infinity)
			return availableCircle;
	}


	evaluateCircles(laidCircle, availableCircle) {

		// large circle on the ground
		laidCircle.y = Math.max(laidCircle.radius, laidCircle.y);

		// search for the lowest.
		if (laidCircle.getMaxY() >= availableCircle.getMaxY())
			return;

		if (this.validateCirclePosition(laidCircle))
			availableCircle.copy(laidCircle);
	}


	tryPlacementOn2Slots(slot1, slot2, r, availableCircle) {

		console.assert(slot1 != slot2);

		var laidCircle = slot1.circle.layCircleOnTopOf2(slot2.circle, r);
		if (!laidCircle)
			return;

		var	dx1 = Math.abs(laidCircle.x - slot1.circle.x),
			dx2 = Math.abs(laidCircle.x - slot2.circle.x);

		if (dx1 < this.EPSILON || dx2 < this.EPSILON) // prohibit center-above-center
			return;
/*
		if (this.type == "OpenEnded") // it helps for good look; however...
			if (dx1 + slot1.circle.radius < 1.25 * r || dx2 + slot2.circle.radius < 1.25 * r)
				return;// Report.warn(`OpenEnded dx1=${dx1} dx2=${dx2}`);
*/
		Util.froundCircle(laidCircle);

		this.evaluateCircles(laidCircle, availableCircle);
	}


	tryPlacementOnSlotAndSide(slot, x1, r, availableCircle) {

		var laidCircle = slot.circle.layCircleOnCircleAndVLine(x1, r);

		// prohibit center-above-center
		if (!laidCircle || Math.abs(laidCircle.x - slot.circle.x) < this.EPSILON)
			return;

		Util.froundCircle(laidCircle);

		this.evaluateCircles(laidCircle, availableCircle);
	}

}


Object.assign(CirclePacking.prototype, {

	_intervals: new Intervals,
	_centralRange: new Range,
});



CirclePacking.Slot = function(circle) {

	this.circle = circle;
}


Object.assign(CirclePacking.Slot.prototype, {

	toString() {
		return `<CirclePacking.Slot ${this.circle}>`;
	},

	//isOnGround() { return this.circle.y === this.circle.radius; },


	_slotRange: new Range,

	getRange() {

		let	x = this.circle.x,
			r = this.circle.radius;

		return this._slotRange.set(x - r, x + r);
	},

});




export { CirclePacking };

