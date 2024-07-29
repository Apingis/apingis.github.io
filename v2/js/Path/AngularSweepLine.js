
class AngularSweepLine {

	constructor(mPLine) {
		this.mPLine = mPLine;
		this.x = undefined;
		this.y = undefined;
	}

	update(x, y) {
		this.x = x;
		this.y = y;
	}

	updateFromMPLine(mPLineIndex) {
		this.x = this.mPLine[mPLineIndex];
		this.y = this.mPLine[mPLineIndex + 1];
	}

	updateWithAngle(angle) {
		this.x = Math.cos(angle);
		this.y = Math.sin(angle);
	}

	distance() {
		return Util.hypot(this.x, this.y);
	}

	distanceToMPLine(i) {
		return i >= 0 ? this.normalizedDistanceToMPLine(i) * this.distance()
			: Infinity;
	}


	normalizedDistanceToMPLine(i) {

		var x0 = this.mPLine[i],
			y0 = this.mPLine[i + 1];

		if (x0 === 0 && y0 === 0) // 0-Segment
			return 0;

		var x1 = this.mPLine[i + 3],
			y1 = this.mPLine[i + 4],
			x = x1 - x0,
			y = y1 - y0;

		var d = this.x * y - this.y * x;
		if (d === 0) {
			if (x0 * x1 < 0 || y0 * y1 < 0) // sweepLine origin is on the segment
				return 0;

			return Math.min(Util.hypot(x0, y0), Util.hypot(x1, y1)) / this.distance();
		}

		var u = (y0 * this.x - x0 * this.y) / d;
//if (u > 0 || u < -1)
//console.error(`u=${u}`,this.x, this.y, x0,y0, x1,y1);

		// sweepLine intersects the segment at endpoint or doesn't intersect.
		if (u > 0) {
			return Util.hypot(x0, y0) / this.distance();

		} else if (u < -1) {
			return Util.hypot(x1, y1) / this.distance();
		}

		// sweepLine intersects the segment between segment endpoints.
		return (x0 * y - y0 * x) / d;
	}

/*
	distanceToDynamicSegment(segmentData, i) {

		var x0 = segmentData[i],
			y0 = segmentData[i + 1];

		if (x0 === 0 && y0 === 0)
			return 0;

		var x = segmentData[i + 2],
			y = segmentData[i + 3];

		return (x0 * y - y0 * x) / (this.x * y - this.y * x);
	}
*/
}



export { AngularSweepLine };

