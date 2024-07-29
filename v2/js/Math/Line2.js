
import { Point } from './Point.js';
import { Rectangle } from './Rectangle.js';


class Line2 {

	constructor(p1 = new Point, p2 = new Point) {
		this.p1 = p1;
		this.p2 = p2;
	}

	toString() {
		return `[Line2 p1=${this.p1} p2=${this.p2}`
		+ ` d=${Util.toStr(this.distance())}]`;
	}

	clone() { return new Line2(this.p1.clone(), this.p2.clone()); }

	isDegenerate() { return this.p1.equals(this.p2); }

	getX() { return this.p2.x - this.p1.x; }

	getY() { return this.p2.y - this.p1.y; }

	set(p1x = 0, p1y = 0, p2x = 0, p2y = 0) {
		this.p1.x = p1x;
		this.p1.y = p1y;
		this.p2.x = p2x;
		this.p2.y = p2y;
		return this;
	}

	copyFromArray(array, i) {
		this.p1.x = array[i];
		this.p1.y = array[i + 1];
		this.p2.x = array[i + 2];
		this.p2.y = array[i + 3];
		return this;
	}

	setPoints(p1, p2) {
		this.p1 = p1;
		this.p2 = p2;
		return this;
	}

	copy(line2) {
		this.p1.x = line2.p1.x;
		this.p1.y = line2.p1.y;
		this.p2.x = line2.p2.x;
		this.p2.y = line2.p2.y;
		return this;
	}

	copyFromTrack(track) {
		this.p1.x = track.p1.x;
		this.p1.y = track.p1.y;
		this.p2.x = track.p2.x;
		this.p2.y = track.p2.y;
		return this;
	}

	copyFromLine3(line3) {
		this.p1.x = line3.start.x;
		this.p1.y = line3.start.z;
		this.p2.x = line3.end.x;
		this.p2.y = line3.end.z;
		return this;
	}

	copyFrom2XVector3(v1, v2) {
		this.p1.x = v1.x;
		this.p1.y = v1.z;
		this.p2.x = v2.x;
		this.p2.y = v2.z;
		return this;
	}

	copyFromPoints(p1, p2) {
		this.p1.copy(p1);
		this.p2.copy(p2);
		return this;
	}

	getRect(rect = this._rect) {
		return rect.set(Math.min(this.p1.x, this.p2.x), Math.min(this.p1.y, this.p2.y),
			Math.max(this.p1.x, this.p2.x), Math.max(this.p1.y, this.p2.y) );
	}

	getDelta(p = new Point) { return p.copy(this.p2).sub(this.p1); }

	getNormalizedVector(v = this._normalizedVector) {
		return v.set( this.p2.x - this.p1.x, this.p2.y - this.p1.y ).normalize();
	}

	translate(x, y) {
		this.p1.x += x;
		this.p2.x += x;
		this.p1.y += y;
		this.p2.y += y;
		return this;
	}

	applyMatrix3(mat3) {
		this.p1.applyMatrix3(mat3);
		this.p2.applyMatrix3(mat3);
		return this;
	}

	swapPoints() {
		var tmp = this.p1;
		this.p1 = this.p2;
		this.p2 = tmp;
		return this;
	}

	distance() { return Util.hypot(this.p2.x - this.p1.x, this.p2.y - this.p1.y); }

	distanceSq() { return Util.hypotSq(this.getX(), this.getY()); }


	setDistance(newDistance) {

		var curDistance = this.distance();
		if (curDistance === 0) {
			console.error(`distance=0`, this);
			return this;
		}

		return this.multiplyDistance(newDistance / curDistance);
	}


	normalize() { return this.setDistance(1) }

	multiplyDistance(factor) {
		this.p2.x = this.p1.x + factor * this.getX();
		this.p2.y = this.p1.y + factor * this.getY();
		return this;
	}


	angle() { return Math.atan2(this.p2.y - this.p1.y, this.p2.x - this.p1.x); }

	oppositeAngle() { return Math.atan2(this.p1.y - this.p2.y, this.p1.x - this.p2.x); }

	rotateAroundP1(angle) { // TODO less computations
		var distance = this.distance();
		angle += this.angle();
		this.p2.copy(this.p1).move(angle, distance);
		return this;
	}

	slidePoint(pt, distance) { // move point along line
		var t = distance / this.distance();
		pt.x += t * this.getX();
		pt.y += t * this.getY();
	}


	// move p1 back by d1, move p2 forward by d2
	extend2Ends(d1, d2 = d1) {

		var x = this.getX(),
			y = this.getY(),
			d = Util.hypot(x, y);

		if (d === 0) {
			Report.warn("d=0");
			return this;
		}

		this.p1.x -= (d1 / d) * x;
		this.p1.y -= (d1 / d) * y;
		this.p2.x += (d2 / d) * x;
		this.p2.y += (d2 / d) * y;
		return this;
	}


	// create, return a point: 'distance' away from p, perp to p1-p2
	// distance > 0: to the left of p1-p2 direction
	getPerpPoint(p, distance) {
		var d = distance / this.distance();
		return new Point(p.x - this.getY() * d, p.y + this.getX() * d);
	}

	getParallelPoint(p, distance) {
		var d = distance / this.distance();
		return new Point(p.x + this.getX() * d, p.y + this.getY() * d);
	}

	perp(factor = 1.00) {
		this.p2.set(this.p1.x - this.getY() * factor, this.p1.y + this.getX() * factor);
		return this;
	}


	// distance > 0: to the left of p1-p2 direction
	setFromParallel(segment, distance) {

		var d = distance / segment.distance(),
			x = segment.getX() * d,
			y = segment.getY() * d;

		this.p1.x = segment.p1.x + y;
		this.p2.x = segment.p2.x + y;
		this.p1.y = segment.p1.y - x;
		this.p2.y = segment.p2.y - x;
		return this;
	}


	moveParallel(distance) {

		var d = distance / this.distance(),
			x = this.getX() * d,
			y = this.getY() * d;

		this.p1.x += y;
		this.p2.x += y;
		this.p1.y -= x;
		this.p2.y -= x;
		return this;
	}


	// create segment: center is 'p', length = 2 * 'distanceEachDirection',
	// perpendicular to 'segment', p1 is to the left of segment's p1-p2
	// (L/R is inverted if viewed towards +Y). Functions assume the inversion.
	setFromPLengthAndSegment(p, distanceEachDirection, segment) {

		var d = distanceEachDirection / segment.distance(),
			dx = segment.getX() * d,
			dy = segment.getY() * d,
			x = p.x,
			y = p.y;

		this.p1.x = x - dy;
		this.p1.y = y + dx;
		this.p2.x = x + dy;
		this.p2.y = y - dx;
		return this;
	}


	// distance > 0: to the left of p1-p2 direction
	getPointOnPerpendicularToP2(distance, p = new Point) {

		var d = distance / this.distance();
		p.x = this.p2.x + this.getY() * d;
		p.y = this.p2.y - this.getX() * d;
		return p;
	}


	isPointAheadOfPoint(p1, p2) { // 2 points on this or parallel line. Is p1 ahead of p2?

		var x = this.getX(),
			y = this.getY();

		return Math.abs(x) > Math.abs(y)
			? (p1.x - p2.x) * x > 0
			: (p1.y - p2.y) * y > 0;
	}


	isPointWithinSegment(p) {

		var x = this.getX(),
			y = this.getY();

		var t = Math.abs(x) > Math.abs(y)
			? (p.x - this.p1.x) / x : (p.y - this.p1.y) / y;
		return t >= 0 && t <= 1;
	}


	perpProduct(p) {
		return p.x * this.getY() - p.y * this.getX();
	}

	// (L/R is inverted if viewed towards +Y!). W/o the inversion:
	// > 0 strictly left
	// == 0 on the line
	// < 0 strictly right
	isPointLeft(p) { return this.isLeft(p.x, p.y); }

	isLeft(x, y) {
		return (this.p2.x - this.p1.x) * (y - this.p1.y)
			- (x - this.p1.x) * (this.p2.y - this.p1.y);
	}

	// https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
	// < 0: point at (x,y) is to the right of the line
	distanceSignedTo(x, y) {
		return ( (this.p2.x - this.p1.x) * y - (this.p2.y - this.p1.y) * x
			- this.p2.x * this.p1.y + this.p2.y * this.p1.x ) / this.distance();
	}

	distanceTo(x, y) { return Math.abs(this.distanceSignedTo(x, y)); }

	distanceToPoint(p) { return Math.abs(this.distanceSignedTo(p.x, p.y)); }


	distanceSegmentTo(x, y) {

		var t = this.parameterClosestPointTo(x, y);

		if (t <= 0)
			return this.p1.distanceTo(x, y);
		if (t >= 1)
			return this.p2.distanceTo(x, y);

		return this.distanceTo(x, y);
	}


	distanceSegmentToPoint(p) { return this.distanceSegmentTo(p.x, p.y); }


	distanceMinMaxSegmentTo(x, y) {

		var t = this.parameterClosestPointTo(x, y);
		var p = t < 0.5 ? this.p2 : this.p1; // farthest endpt.
		var result = this._minMax;

		result.max = p.distanceTo(x, y);
		result.min = this.distanceSegmentTo(x, y);

		return result;
	}


	intersectsCircle(c) { return this.distanceTo(c.x, c.y) <= c.radius; }

	intersectsSegmentCircle(c) { return this.distanceSegmentTo(c.x, c.y) <= c.radius; }


	//
	//   "Closest Point"
	//
	parameterClosestPointTo(x, y) {
		var dx = this.getX(),
			dy = this.getY();
		return (dx * (x - this.p1.x) + dy * (y - this.p1.y)) / (dx * dx + dy * dy);
	}

	parameterClosestPointToPoint(p) { return this.parameterClosestPointTo(p.x, p.y); }

	getPointAt(t, target = this._pt) {
		target.x = this.p1.x + t * this.getX();
		target.y = this.p1.y + t * this.getY();
		return target;
	}

	closestPointTo(x, y, target = this._pt) {
		var t = this.parameterClosestPointTo(x, y);
		return this.getPointAt(t, target);
	}


	closestPointOnSegmentTo(x, y) {

		var t = this.parameterClosestPointTo(x, y);

		return t <= 0 ? this.p1 :
			t >= 1 ? this.p2 :
			this.getPointAt(t);
	}

	//
	// Compute distance on ray: P1 to point closest to given (x, y).
	// Return 0 if closest point is behind ray origin (p1).
	//
	//  p1      closest pt
	//  .-------.------------->  ray
	//
	//          .(x,y)
	//
	distanceP1ClosestPointTo(x, y) {

		var dx = this.getX(),
			dy = this.getY(),
			dSq = dx * dx + dy * dy;

		var t = (dx * (x - this.p1.x) + dy * (y - this.p1.y)) / dSq;
		if (t <= 0)
			return 0;

		return t * Math.sqrt(dSq);
	}


	parameterP1IntersectionCircle(c) {
		return this.parameterP1Intersection(c.x, c.y, c.radius);
	}

	parameterP1Intersection(x, y, radius) {

		var distanceLineCenter = this.distanceTo(x, y);
		if (distanceLineCenter > radius)
			return false;

		var radiusSq = radius * radius;

		var distanceP1Closest = this.distanceP1ClosestPointTo(x, y);
		if (distanceP1Closest === 0) // circle center is behind p1
			return Util.hypotSq(x - this.p1.x, y - this.p1.y) <= radiusSq ? 0 : false;

		var d = distanceP1Closest
			- Math.sqrt(radiusSq - distanceLineCenter * distanceLineCenter);
		if (d <= 0) // p1 is inside circle
			return 0;

		var t = d / this.distance();
		return t <= 1 ? t : false;

	}


	// 2 lines
	intersectLine(line, target) {

		var x = this.getX(), lineX = line.getX(),
			y = this.getY(), lineY = line.getY();

		var d = x * lineY - y * lineX;
		if (d == 0)
			return;

		var t = ( (line.p1.x - this.p1.x) * lineY
			- (line.p1.y - this.p1.y) * lineX ) / d;

		target.x = this.p1.x + x * t;
		target.y = this.p1.y + y * t;
		return target;
	}


	intersect2Segments(segment, target) {

		var x = this.getX(), segmentX = segment.getX(),
			y = this.getY(), segmentY = segment.getY();

		var d = x * segmentY - y * segmentX;
		if (d === 0)
			return;

		var t = ( (segment.p1.x - this.p1.x) * segmentY
			- (segment.p1.y - this.p1.y) * segmentX ) / d;
		if (t < 0 || t > 1)
			return;

		var u = ( (segment.p1.y - this.p1.y) * x
			- (segment.p1.x - this.p1.x) * y ) / d;
		if (u < -1 || u > 0)
			return;

		if (target === undefined)
			return true;

		target.x = this.p1.x + x * t;
		target.y = this.p1.y + y * t;
		return target;
	}


	distance2Segments(segment) {

		var x = this.getX(), segmentX = segment.getX(),
			y = this.getY(), segmentY = segment.getY();

		var d = x * segmentY - y * segmentX;

		if (d === 0)
			return this.distanceSegmentToPoint( segment.p1 );

		var t = ( (segment.p1.x - this.p1.x) * segmentY
			- (segment.p1.y - this.p1.y) * segmentX ) / d;

		var u = ( (segment.p1.y - this.p1.y) * x
			- (segment.p1.x - this.p1.x) * y ) / d;

		if (t >= 0 && t <= 1) {

			if (u <= 0 && u >= -1)
				return 0;

			return this.distanceToPoint( u > 0 ? segment.p1 : segment.p2 );

		} else if (u <= 0 && u >= -1) { // u < -1 is behind segment.p2

			return segment.distanceToPoint( t < 0 ? this.p1 : this.p2 );
		}

		var	nearestPt1 = t < 0 ? this.p1 : this.p2;
		var	nearestPt2 = u > 0 ? segment.p1 : segment.p2;

		return nearestPt1.distanceToPoint( nearestPt2 );
	}


	// intersect ray from (0,0) and 'this' line.
	// Returns: undefined if no intersection. If it intersects returns true
	// or fills-in target (instanceof Point) and returns it.
	intersectRayFromOrigin(angle, target) {

		var x = this.getX(),
			y = this.getY(),
			rayX = Math.cos(angle),
			rayY = Math.sin(angle);

		var d = x * rayY - y * rayX;
		if (Math.abs(d) < 1e-9) // TODO more precise
			return;

		var u = (this.p1.y * x - this.p1.x * y) / d;
		if (u < 0)
			return;

		if (target === undefined)
			return true;

		target.x = rayX * u;
		target.y = rayY * u;
		return target;
	}


	static distanceIntersectionSweepLineSegment(angle, x0, y0, x1, y1) {

		console.assert(Number.isFinite(angle));

		var p1At00 = x0 === 0 && y0 === 0,
			p2At00 = x1 === 0 && y1 === 0;

		if (p1At00 || p2At00) { // 0-Segment

			if (p1At00 && p2At00)
				return 0;

			if (p1At00) // segment end is at origin
				return Util.hypot(x1, y1);

			if (p2At00)
				return Util.hypot(x0, y0);
		}

		var x = x1 - x0,
			y = y1 - y0,
			cos = Math.cos(angle),
			sin = Math.sin(angle);

		var d = cos * y - sin * x;
		if (d === 0) {
			if (x0 * x1 < 0 || y0 * y1 < 0) // sweepLine origin is on the segment
				return 0;

			return Math.min(Util.hypot(x0, y0), Util.hypot(x1, y1));
		}

		var u = (y0 * cos - x0 * sin) / d;

		// sweepLine intersects the segment at endpoint or doesn't intersect.
		if (u > 0) {
			return Util.hypot(x0, y0);

		} else if (u < -1) {
			return Util.hypot(x1, y1);
		}

		// sweepLine intersects the segment between segment endpoints.
		return (x0 * y - y0 * x) / d;
	}


	intersectCircumference(c, fn) {

		var	x = this.getX(),
			y = this.getY(),
			xc = c.x - this.p1.x,
			yc = c.y - this.p1.y;

		var roots = Polynomial.solveQuadraticEqn(

			x * x + y * y,
			-2 * (x * xc + y * yc),
			xc * xc + yc * yc - c.radius * c.radius,
			true
		);

		if (!roots)
			return;

		var	t1 = roots.x1,
			t2 = roots.x2;

		if (t2 < 0 || t1 > 1)
			return;

		if (!fn)
			return roots;

		// On the infinite line with defined direction, if it intersects
		// there are always 2 intersections. The 1st along the direction of line
		// counts as "IN", the 2nd as "OUT".

		if (t1 >= 0)
			fn(t1, t1 * x + this.p1.x, t1 * y + this.p1.y, "IN");

		if (t2 <= 1)
			fn(t2, t2 * x + this.p1.x, t2 * y + this.p1.y, "OUT");
	}


	intersectQuadraticCurve(qC, fn = (...args) => console.log("intr. line2 qC", ...args),
			clampToSegment, setInOut) {

		if ( qC.isImaginaryOrNone() )
			return;

		var	x = this.getX(),
			y = this.getY(),
			x0 = this.p1.x,
			y0 = this.p1.y;

		var	a = qC.a * x * x + qC.c * y * y,
			b = 2 * (qC.a * x * x0 + qC.c * y * y0) + qC.d * x + qC.e * y,
			c = qC.a * x0 * x0 + qC.c * y0 * y0 + qC.d * x0 + qC.e * y0 + qC.f;

		if (qC.b !== 0) {

			a += qC.b * x * y;
			b += qC.b * (y0 * x + x0 * y);
			c += qC.b * x0 * y0;
		}

		var roots = Polynomial.solveQuadraticEqn(a, b, c, true);

		if (!roots)
			return;

		var	t1 = roots.x1,
			t2 = roots.x2;

		if (clampToSegment === true && (t2 < 0 || t1 > 1 || (t2 > 1 && t1 < 0)) )
			return;

		var	typeInOut1 = "IN", // 1st (along the line) intersection
			x1 = t1 * x + x0,
			y1 = t1 * y + y0;

		// Intersection w/ multiplicity 2:
		// * ellipse, parallelLines: same as circle (1st IN, 2nd OUT);
		// * hyperbola, parabola: 2 types of such intersection:
		// - tangent line;
		// - IN,OUT or OUT,IN: this is detected, 1 intersection reported (nonTangentMult2)
		// * intersectingLines. Computed as hyperbola in case of det!=0.

		var skipIntr2;

		if ( !qC.isEllipseOrParallelLines() ) {

			if (t1 === t2) { // Report 1 intersection if it's non-tangent.

				if ( qC.evaluateAt(x1 - x, y1 - y) < 0 !== qC.evaluateAt(x1 + x, y1 + y) < 0 )
					skipIntr2 = true; // TODO 2024.05 know signs (IN/OUT) return here?
			}

			if (setInOut === true) {

				if ( qC.isInside(x1 - x, y1 - y) )
					typeInOut1 = "OUT";
			}
		}

		var haveSolutions;

		if (t1 >= 0 || clampToSegment !== true) {

			if ( qC.checkHalfSgn(x1, y1) ) {

				fn(x1, y1, t1, typeInOut1);
				haveSolutions = true;
			}
		}

		if (skipIntr2 === true)
			return haveSolutions;

		if (t2 <= 1 || clampToSegment !== true) {

			var	x2 = t2 * x + x0,
				y2 = t2 * y + y0;

			if ( qC.checkHalfSgn(x2, y2) ) {

				fn(x2, y2, t2, typeInOut1 == "IN" ? "OUT" : "IN");
				haveSolutions = true;
			}
		}

		return haveSolutions;
	}


	intersectsRect(rect) { return Line2.intersectsRect(rect, this.p1, this.p2) }


	static intersectsRect(rect, p1, p2) {

		var	code1, code2;

		if ( (code1 = rect.outCode(p1.x, p1.y)) === 0 )
			return true;

		if ( (code2 = rect.outCode(p2.x, p2.y)) === 0 )
			return true;

		if ((code1 & code2) !== 0) // sharing same zone
			return;

		const LEFT = 1, RIGHT = 2, TOP = 4, BOTTOM = 8;

		// outcode bit tested guarantees the denominator is non-zero
		var slope = (p2.x - p1.x) / (p2.y - p1.y);

		if (code1 & (TOP | BOTTOM)) { // top or bottom

			let targetY = (code1 & TOP) ? rect.maxY : rect.minY,
				intersectX = p1.x + slope * (targetY - p1.y);

			if (intersectX >= rect.minX && intersectX <= rect.maxX)
				return true;
		}

		if (code1 & (LEFT | RIGHT)) {

			let targetX = (code1 & RIGHT) ? rect.maxX : rect.minX,
				intersectY = p1.y + (targetX - p1.x) / slope;

			if (intersectY >= rect.minY && intersectY <= rect.maxY)
				return true;
		}
	}


	static intersectsRectSide(rect, p1, p2) {

		var	code1 = rect.outCode(p1.x, p1.y),
			code2 = rect.outCode(p2.x, p2.y);

		if ((code1 & code2) !== 0)
			return false;

		if (code1 === 0 || code2 === 0) // 1 or 2 pts. are inside
			return (code1 | code2) !== 0;

		const LEFT = 1, RIGHT = 2, TOP = 4, BOTTOM = 8;

		var slope = (p2.x - p1.x) / (p2.y - p1.y);

		if (code1 & (TOP | BOTTOM)) {

			let targetY = (code1 & TOP) ? rect.maxY : rect.minY,
				intersectX = p1.x + slope * (targetY - p1.y);

			if (intersectX >= rect.minX && intersectX <= rect.maxX)
				return true;
		}

		if (code1 & (LEFT | RIGHT)) {

			let targetX = (code1 & RIGHT) ? rect.maxX : rect.minX,
				intersectY = p1.y + (targetX - p1.x) / slope;

			if (intersectY >= rect.minY && intersectY <= rect.maxY)
				return true;
		}

		return false;
	}


	// ======================
	//
	//   Helpers
	//
	// ======================

	static addToPlanarGeometry(p, v, positions = []) { // ByStartAndDirection

		var LEN = 1e5;

		positions.push( p.x - LEN * v.x, p.y - LEN * v.y, 0,
			p.x + LEN * v.x, p.y + LEN * v.y, 0	);

		return positions;
	}


	static showAxes(matrix4) {

		var LEN = 1e+4;
		var r = 0.4, d = 10;

		var getRayMesh = (v, matName, name) => {

			var pos = [ 0, 0, 0, v.x * LEN, v.y * LEN, 0 ];
			var p1 = v.clone().perp().multiplyScalar(r);
			var p2 = v.clone().perp().multiplyScalar(r * 7);

			for (let i = d; i < LEN; i += d) {

				let p = i % (5 * d) === 0 ? p2 : p1;

				pos.push( v.x * i + p.x, v.y * i + p.y, 0,
					v.x * i - p.x, v.y * i - p.y, 0 );
			}

			var g = new LineSegmentsGeometry().setPositions(pos);
			var mesh = new THREE.Mesh(g, Assets.materials.line[matName]);
			mesh.name = name;

			if (matrix4)
				g.applyMatrix4(matrix4);

			return mesh;
		}

		var mesh1 = getRayMesh(new Point(1, 0), "axisX", "axis X+ (+3 axes)");
		mesh1.add( getRayMesh(new Point(-1, 0), "axisXminus", "axis X-") );
		mesh1.add( getRayMesh(new Point(0, 1), "axisY", "axis Y+") );
		mesh1.add( getRayMesh(new Point(0, -1), "axisYminus", "axis Y-") );
		scene.add(mesh1);
	}


	addToGeometry(positions, y = 0.01, delta = 0) {
		positions.push(this.p1.x + delta, y, this.p1.y + delta,
			this.p2.x + delta, y, this.p2.y + delta);
	}


	show(matName = 'line2') {

		var mesh = this._showData.get(this);
		if (mesh) {
			scene.remove(mesh);
			mesh.geometry.dispose();
			this._showData.delete(this);

		} else {
			let positions = [];
			this.addToGeometry(positions);
			let g = new LineSegmentsGeometry;
			g.setPositions(positions);

			var mesh = new THREE.Mesh(g, Assets.materials.line[matName]);
			mesh.name = `${this}`;
			scene.add(mesh);
			this._showData.set(this, mesh);
		}

		return this;
	}

}

Object.assign(Line2.prototype, {

	shapeType: "Line2",

	_rect: new Rectangle,
	_pt: new Point,
	_minMax: { min: 0, max: 0 },

	_normalizedVector: new Point,

	_showData: new WeakMap
});



export { Line2 };

