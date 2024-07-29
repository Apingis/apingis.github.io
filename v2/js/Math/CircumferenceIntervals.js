
import { Point } from './Point.js';
import { Line2 } from './Line2.js';


class CircumferenceIntervals {

	constructor(circle = new Circle, intervals = new Intervals(-Math.PI, Math.PI, true)) {

		this.circle = circle;
		this.intervals = intervals;
	}


	toString() {
		var type = this.is360() ? " 360" : this.isClear() ? " Clear" : "";
		return `[CircumferenceIntervals${type} ${Util.toStr(this.circle.x)},${Util.toStr(this.circle.y)}`
			+ ` r=${Util.toStr(this.circle.radius)} Nintervals=${this.intervals.length/2}]`;
	}

	clone() { return new CircumferenceIntervals(this.circle.clone(), this.intervals.clone()); }

	translate(x, y = 0) {
		this.circle.translate(x, y);
		return this;
	}

	set(x, y, r) {
		this.circle.set(x, y, r);
		this.intervals.clear();
		return this;
	}

	copyCircleProps(sC) {
		this.circle.copy(sC.circle);
		return this;
	}


	static from(x, y, r) { return new CircumferenceIntervals(new Circle(x, y, r)); }

	getRect(rect) { return this.circle.getRect(rect); }


	isClear() { return this.intervals.isClear(); }

	is360() { return this.intervals.isFull(); }

	containsAngle(a) { return this.intervals.contain(a); }

	fillIntervals() {
		this.intervals.fill();
		return this;
	}

	invertIntervals() {
		this.intervals.invert();
		return this;
	}

	rotateIntervals(angle) {
		this.intervals = this.intervals.getRotated(angle);
		return this;
	}


	removeShortIntervals() {
		this.intervals.removeShort();
		return this;
	}

/*
	mergeAngles(start, end) {
		this.intervals.mergeIn( Angle.normalize(start), Angle.normalize(end) );
	}
*/
/*
	addIntervalFromLine3(line3) {

		// is line3.start left of line3.end-->center?
		var isStartLeft = Point.isLeft(line3.start.x, line3.start.z,
			line3.end.x, line3.end.z, this.circle.x, this.circle.y) > 0;

		var	startAngle = this.circle.angleToVector3(line3.start),
			endAngle = this.circle.angleToVector3(line3.end);

		if (isStartLeft)
			this.intervals.mergeIn(startAngle, endAngle);
		else
			this.intervals.mergeIn(endAngle, startAngle);
//console.log(line3, isStartLeft, startAngle, endAngle, `${this.intervals}`);
//throw 1;
		return this;
	}
*/

	processPointsOnIntervals(processFn, setupType = "") {

		if (this.isClear()) // No intervals - no points
			return;

		var	minPoints = 6,
			maxPoints = 50,
			p2PDistance = 1.0;

		var epsilon = 1e-3;

		var nPointsTotal = Math.max(
			minPoints,
			Math.floor(2 * Math.PI * this.circle.radius / p2PDistance)
		);

		if (nPointsTotal > maxPoints) {
			nPointsTotal = maxPoints;
			p2PDistance = 2 * Math.PI * this.circle.radius / nPointsTotal;
		}

		var p2PAngle = 2 * Math.PI / nPointsTotal;


		this.intervals.process((start, end) => {

			var angle = end - start;

			if (angle < 2 * epsilon)
				return;

			if (setupType == "camera") { // pts. are close to interval ends.

				if (angle <= p2PAngle / 2) {
					processFn(start + angle / 2);
					return;
				}

				var	nPoints = Math.max(2, Math.ceil(angle / p2PAngle)),
					anglePerPoint = angle / (nPoints - 1);

				for (let i = 0; i < nPoints - 1; i++)
					processFn(start + epsilon + i * anglePerPoint);

				if (angle !== 2 * Math.PI)
					processFn(end - epsilon);

			} else { // pts. are most distant from interval ends (tree falling)

				if (angle <= 2 * p2PAngle) {
					processFn(start + angle / 2);
					return;
				}

				var	nPoints = Math.floor(angle / p2PAngle),
					remainAngle = angle - p2PAngle * nPoints;

	//console.log(`nPoints=${nPoints} nPointsTotal=${nPointsTotal} p2PAngle=${p2PAngle} remainAngle=${remainAngle}`);
				for (let i = 0; i < nPoints; i++)
					processFn(start + (remainAngle + p2PAngle) / 2 + i * p2PAngle);
			}

		});
	}


	getPointOnIntervalClosestToPoint(p) {

		var angle = this.circle.angleToPoint(p);

		angle = this.intervals.getNearestValueOnInterval(angle);
		if (angle === undefined)
			return;

		return this._pointClosestToPoint.onCircumference(this.circle, angle);
	}


	addPolygonToApproachBlockingIntervals(polygon, halfWidth) {

		// inside CW polygon: OK
		// inside polygon: deal at upper level
		// halfWidth > 0, too close: OK, fillIntervals

		if (!polygon)
			return;

		var x = this.circle.x,
			y = this.circle.y,
			segment = this._line2;

		for (let i = 0; i < polygon.points.length; i += 2) {

			if (!polygon.isEdgeVisible(i, x, y))
				continue;

			if (polygon.cutEdgeWithCircle(i, this.circle, segment) === false)
				continue;

			var a1 = segment.p1.angleFrom(x, y),
				a2 = segment.p2.angleFrom(x, y);

			// a1 must be to the left of a2 (or edge would be invis.)
			if (!Angle.isLeft(a1, a2)) {
				Report.warn("bad polygon", `i=${i} a1=${a1} a2=${a2} id=${polygon.id}`);
				break;
			}

			if (halfWidth > 0) {

				let	d1 = segment.p1.distanceTo(x, y),
					d2 = segment.p2.distanceTo(x, y);

				let	ratio1 = halfWidth / d1,
					ratio2 = halfWidth / d2;

				if (ratio1 >= 1 || ratio2 >= 1) {

					this.fillIntervals();
					return;

				} else {
					this.intervals.mergeNormalizeAngles(a2 - Math.asin(ratio2), a1 + Math.asin(ratio1));
				}
//console.log(`id=${polygon.id} i=${i} ${a2 - Math.asin(ratio2)} ${a1 + Math.asin(ratio1)}`, this.intervals.clone());
			} else
				this.intervals.mergeIn(a2, a1);
		}
	}


// ===============================================================
//
//           G--F  polygon
//           |  |
//        .--H--E--- circumference
//       /   |  |
//      /    A  D
//     /    /  /
//    .    B--C
//    |            * circle center
//
//
//  addPolygonToApproachBlockingIntervals: adds interval B-*-E
//  addIntervalsOnCircumferenceInsidePolygon: adds interval H-*-E
//
// ===============================================================


	//
	// Unlike the above (addPolygonToApproachBlockingIntervals), counts only
	// intervals on circumference inside the polygon.
	// Handles non-convex polygons (not self-intersecting).
	//
	addIntervalsOnCircumferenceInsidePolygon(polygon, addUp = 0) {

		var bC = polygon.getBoundingCircle();
		var d = Util.hypot(bC.x - this.circle.x, bC.y - this.circle.y);

		if (d > bC.radius + this.circle.radius || bC.radius < this.circle.radius
				&& d < this.circle.radius - bC.radius)
			return this;


		var mergeInterval = (start, end) => {
//console.log(`merge ${Angle.normalize(lastOUTAngle - addUp)} ${Angle.normalize(angle + addUp)}`);
			this.intervals.mergeNormalizeAngles(start - addUp, end + addUp);
		};


		var intersectData = Util.setLength( this._insidePolygonIntersectData );

		polygon.traverseSomeEdges((segment, i) =>

			segment.intersectCircumference(this.circle, (x, y, type) => {

				var angle = this.circle.angleTo(x, y);

				intersectData.push(angle, type);
			})
		);


		var	lastOUTAngle, startINAngle;

		Util.getSortedIndices(intersectData, 2).forEach((dataI, indexI, indices) => {

			var	angle = intersectData[dataI],
				type = intersectData[dataI + 1];

			if (type == "OUT")
				lastOUTAngle = angle;

			else if (lastOUTAngle === undefined)
				startINAngle = angle;

			else
				mergeInterval(lastOUTAngle, angle);
		});

		if (startINAngle !== undefined && lastOUTAngle !== undefined)
			mergeInterval(lastOUTAngle, startINAngle);

		return this;
	}


	// =======================================================================

	getShowData() {

		var data = this._showData.get(this);
		if (!data) {
			data = {};
			this._showData.set(this, data);
		}
		return data;
	}


	show(h) {

		this.circle.show('cI_circle');
		//this.circle.show('redThin', h);

		var data = this.getShowData();

		if (data.sectors) {
			data.sectors.forEach(s => s.show());
			this._showData.delete(this);
			return;
		}

		data.sectors = [];

		for (let i = 0; i < this.intervals.length; i += 2) {
			data.sectors.push(
				Sector.createFromCircle(this.circle, this.intervals[i + 1], this.intervals[i]) // L,R
				.show('cI_intervals', h)
			);
		}

		return this;
	}

}


Object.assign(CircumferenceIntervals.prototype, {

	shapeType: "CircumferenceIntervals",

	_line2: new Line2,
	_pointClosestToPoint: new Point,
	_insidePolygonIntersectData: [],

	_showData: new Map,
});



export { CircumferenceIntervals };

