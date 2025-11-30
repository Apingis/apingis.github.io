
import { Line2 } from './Line2.js';
import { Point } from './Point.js';
import { Rectangle } from './Rectangle.js';



var	boundingCircleIndices = [];


class Polygon { // Can also represent PointSet.

	constructor(points = [], height) {

		this.points = points;

		if (points.length & 1) {
			Report.warn("bad points array length", `${points.length}`);
			points.length --;
		}

		this.height = height;
		this._boundingCircle = null;
		this.id = undefined;
	}


	toString() {
		var idStr = this.id ? ` id=${this.id}` : "";
		return `[Polygon${idStr} p0=${Util.toStr(this.points[0])},`
			+ `${Util.toStr(this.points[1])} ${this.points.length/2}pts]`;
	}

	has3Pts() { return this.points.length >= 6; }


	setUpdated() {
		this._boundingCircle = null;
	}


	getBoundingCircle() {
		return this._boundingCircle
			|| (this._boundingCircle = this.createBoundingCircle() );
	}


	clone() {
		var polygon = new Polygon(Array.from(this.points), this.height);

		if (this._boundingCircle)
			polygon._boundingCircle = this._boundingCircle.clone();

		return polygon;
	}


	copy(polygon) {

		var length = polygon.points.length;

		for (let i = 0; i < length; i++)
			this.points[i] = polygon.points[i];

		if (this.points.length > length)
			this.points.length = length;

		this.height = polygon.height;
		this._boundingCircle = null;
		this.id = polygon.id;

		return this;
	}


	getSPRNG() { return Polygon._sprng || (Polygon._sprng = new Util.SeedablePRNG); }

	getVertex(i, p = this._vertex) { return p.set(this.points[i], this.points[i + 1]); }


	getEdge(i, segment = this._edgeSegment) {

		var	p = this.points,
			iNext = this.nextIndex(i);

		return segment.set(p[i], p[i + 1], p[iNext], p[iNext + 1]);
	}


	getEdgeV(i, target = this._edgeV) {

		var	p = this.points,
			iNext = this.nextIndex(i);

		return target.set(p[iNext] - p[i], p[iNext + 1] - p[i + 1]);
	}


	traversePoints(fn) {

		var	length = this.points.length,
			p = this._traversePoint;

		for (let i = 0; i < length; i += 2)
			fn( p.set(this.points[i], this.points[i + 1]), i);
	}


	traverseSomeEdges(fn) {

		var	line2 = this._line2,
			p = this.points,
			length = p.length;

		line2.p1.set( p[0], p[1] );

		var prevI = 0;

		for (let i = 2; ; i += 2) {

			let lastEdge;

			if (i >= length) {
				lastEdge = true;
				i = 0;
			}

			line2.p2.set( p[i], p[i + 1] );

			let result = fn(line2, prevI);

			if (result)
				return true;

			if (lastEdge)
				break;

			line2.p1.copy(line2.p2);
			prevI = i;
		}

		return false;
	}


	getPoint(i) { return this._getPoint.set(this.points[i], this.points[i + 1]); }

	containsPoint(p) { return this.contains(p.x, p.y); }


	contains(x, y) { // Non Zero Winding

		var	p = this.points,
			length = p.length,
			prevX = p[length - 2],
			prevY = p[length - 1],
			count = 0;

		for (let i = 0; i < length; i += 2) {

			let vertexX = p[i];
			let vertexY = p[i + 1];

			if ((vertexY < y) !== (prevY < y)) {
				if (vertexX + (y - vertexY) / (prevY - vertexY) * (prevX - vertexX) < x) {

					count += vertexY < y ? 1 : -1;
				}
			}

			prevX = vertexX;
			prevY = vertexY;
		}

		// Issue.
		// "CW polygon as CCW", w/ meaning that area encircled w/ edges of such polygon
		// treated as "outside", and the rest of the plane is treated as "inside".
		// For such polygon, a point would be inside if count !== -1.

		return count !== 0;
	}

/*
	contains(x, y) {

		var p = this.points;
		var length = p.length;
		var prevX = p[length - 2];
		var prevY = p[length - 1];
		var oddNodes = false;

		for (let i = 0; i < length; i += 2) {

			let vertexX = p[i];
			let vertexY = p[i + 1];

			if ((vertexY < y) !== (prevY < y)) {
				if (vertexX + (y - vertexY) / (prevY - vertexY) * (prevX - vertexX) < x)
					oddNodes = !oddNodes;
			}

			prevX = vertexX;
			prevY = vertexY;
		}

		return oddNodes;
	}
*/

	getRect(rect = this._rect) {

		var p = this.points;
		var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

		for (let i = 0; i < p.length; i += 2) {
			minX = Math.min(minX, p[i]);
			maxX = Math.max(maxX, p[i]);
			minY = Math.min(minY, p[i + 1]);
			maxY = Math.max(maxY, p[i + 1]);
		}

		return rect.set(minX, minY, maxX, maxY);
	}


	minXIndex() {
		var p = this.points;
		var minX = Infinity, minY = Infinity, index;

		for (let i = 0; i < p.length; i += 2) {
			let x = p[i];
			if (x < minX || x === minX && p[i + 1] < minY) {
				minX = x;
				minY = p[i + 1];
				index = i;
			}
		}

		return index;
	}


	mirrorX() {

		var p = this.points;

		for (let i = 0; i < p.length; i += 2)
			p[i + 1] = -p[i + 1];

		return this;
	}

	//
	// * input is assumed to be CCW.
	// * 3 sequential pts. on line count as don't break convexity.
	//
	// Returns:
	// * false if convex
	// * index where external angle < 180deg
	//
	testNonConvex() {

		var	p = this.points,
			length = p.length,
			prevX = p[length - 4], prevY = p[length - 3],
			x = p[length - 2], y = p[length - 1];

		for (let i = 0; i < length; i += 2) {

			let nextX = p[i],
				nextY = p[i + 1];

			if (Point.isLeft(nextX, nextY, prevX, prevY, x, y) < 0)
				return this.prevIndex(i);

			prevX = x; prevY = y;
			x = nextX; y = nextY;
		}

		return false;
	}


	testCCW() { // true: CCW

		var i = this.minXIndex();
		var iNext = this.nextIndex(i), iPrev = this.prevIndex(i);
		var p = this.points;

		var isLeft = Point.isLeft(p[iNext], p[iNext + 1], p[iPrev], p[iPrev + 1], p[i], p[i + 1]);
		// can't happen w/ correct min.X index & non-degenerate polygon

		// '23: easily appear in 3D planar faces of polyhedra

		if (isLeft === 0)
			Report.once(`collinear vertices`, this.clone());

		return isLeft > 0;
	}


	revertVertexOrder() {

		var p = this.points;
		var length = p.length;

		for (let i = 0; i < length / 2; i += 2) {

			let tmp = p[i];
			p[i] = p[length - i - 2];
			p[length - i - 2] = tmp;

			tmp = p[i + 1];
			p[i + 1] = p[length - i - 1];
			p[length - i - 1] = tmp;
		}
	}


	forceCCW(skipWarn) {

		if (!this.testCCW()) {

			if (!skipWarn)
				Report.warn("reverting vertex order", `${this}`);

			this.revertVertexOrder();
		}

		return this;
	}


	static fromRectangle(rect, height) {
		return new Polygon([ rect.minX, rect.minY, rect.maxX, rect.minY,
			rect.maxX, rect.maxY, rect.minX, rect.maxY ], height);
	}


	static fromRectangleCW(rect, height) {
		return new Polygon([ rect.minX, rect.maxY, rect.maxX, rect.maxY,
			rect.maxX, rect.minY, rect.minX, rect.minY ], height);
	}


	static from2Points(x1in, y1in, x2in, y2in, d) {

		console.assert(d > 0);

		var	x1 = Math.min(x1in, x2in) - d,
			x2 = Math.max(x1in, x2in) + d,
			y1 = Math.min(y1in, y2in) - d,
			y2 = Math.max(y1in, y2in) + d;

		return new Polygon([ x2, y1, x1, y1, x1, y2, x2, y2 ]);
	}


	setOBBFromLine2(line2, halfWidth) {

		var d = line2.distance();

		if (d > 0)
			d = halfWidth / d;

		var	x = d * line2.getX(),
			y = d * line2.getY();

		this.setVertexFromPointAndOffset(0, line2.p1, -y - x, x - y);
		this.setVertexFromPointAndOffset(2, line2.p1, y - x, -x - y);
		this.setVertexFromPointAndOffset(4, line2.p2, y + x, -x + y);
		this.setVertexFromPointAndOffset(6, line2.p2, -y + x, x + y);

		this.points.length = 8;

		return this;
	}


	setVertexFromPointAndOffset(i, p, x, y) {

		this.points[i] = p.x + x;
		this.points[i + 1] = p.y + y;
	}


	isWhollyInsideRect(rect) {

		for (let i = 0; i < this.points.length; i += 2)

			if ( !rect.contains(this.points[i], this.points[i + 1]) )
				return;

		return true;
	}


	//
	// Returns:
	// 0: no intersection
	// 1: edges intersect, or polygon is completely inside the rectangle
	// 2: rectangle is completely inside the polygon
	//
	overlapsRectangle(rect) {

		const LEFT = 1, RIGHT = 2, TOP = 4, BOTTOM = 8;

		var	p = this.points,
			length = p.length,
			prevX = p[length - 2],
			prevY = p[length - 1],
			prevCode = rect.outCode(prevX, prevY);

		if (prevCode === 0)
			return 1;

		var accumulator = 0;

		for (let i = 0; i < length; i += 2) {
			let	x = p[i],
				y = p[i + 1],
				code = rect.outCode(x, y);

			if (code === 0)
				return 1;

			if ((code & prevCode) === 0) { // not sharing same zone

				// outcode bit tested guarantees the denominator is non-zero
				let slope = (x - prevX) / (y - prevY);

				if (prevCode & (TOP | BOTTOM)) { // top or bottom

					let targetY = (prevCode & TOP) ? rect.maxY : rect.minY,
						intersectX = prevX + slope * (targetY - prevY);

					if (intersectX >= rect.minX && intersectX <= rect.maxX)
						return 1;
				}

				if (prevCode & (LEFT | RIGHT)) {

					let targetX = (prevCode & RIGHT) ? rect.maxX : rect.minX,
						intersectY = prevY + (targetX - prevX) / slope;

					if (intersectY >= rect.minY && intersectY <= rect.maxY)
						return 1;
				}
			}

			accumulator |= code;

			prevX = x;
			prevY = y;
			prevCode = code;
		}

		if (accumulator !== (LEFT | RIGHT | TOP | BOTTOM))
			return 0;

		return this.contains(rect.minX, rect.minY) ? 2 : 0;
	}


	overlapsPolygon(polygon) {

		if (this.contains(polygon.points[0], polygon.points[1]))
			return true;

		if (polygon.contains(this.points[0], this.points[1]))
			return true;

		return this.intersectsPolygonEdges(polygon);
	}


	intersectsPolygonEdges(polygon) {

		var p = this.points;
		var length = p.length;
		var prevX = p[length - 2];
		var prevY = p[length - 1];

		for (let i = 0; i < length; i += 2) {
			let x = p[i];
			let y = p[i + 1];

			if (polygon.intersectSegment(prevX, prevY, x, y) === true)
				return true;

			prevX = x;
			prevY = y;
		}
	}


	// Move point to the nearest position outside an edge. CW polygon as CCW: OK
	teleportPoint(p) {

		var i = this.nearestEdgeIndex(p);

		p.copy( this.getEdge(i).closestPointOnSegmentTo(p.x, p.y) );
		this.repulsePoint(i, p);
	}


	//nearestPointOnEdge(p, target = this._nearestPtOnEdge) {
	nearestEdgeIndex(p) {

		var	nearestI,
			minDistance = Infinity;

		this.traverseSomeEdges( (line2, i) => {

			var d = line2.distanceSegmentToPoint(p);
			if (d < minDistance) {
				minDistance = d;
				nearestI = i;
			}
		});

		return nearestI;
		//return target.copy( this.getEdge(nearestI).closestPointOnSegmentTo(p.x, p.y) );
	}


	minDistanceToPoint(p) {

		var i = this.nearestEdgeIndex(p);

		if (i === undefined) {
			Report.warn("no nearest edgeIndex", `${this}`);
			return Infinity;
		}

		return this.getEdge(i).distanceSegmentToPoint(p);
	}


	overlapsCircle(circle) {
		return this.traverseSomeEdges( (line2, i) => line2.intersectsSegmentCircle(circle) );
	}


	// Move point towards the outside of edge i by distance d.
	// Polygon must be ordered CCW. CW polygon as CCW: OK
	repulsePoint(i, p, d = 1e-7) {

		var repulseV = this.getEdge(i).perp();

		repulseV.setDistance(d);
		repulseV.p2.sub(repulseV.p1);

		p.sub(repulseV.p2);
	}


	segmentDotEdge(segment, i) {

		var	segX = segment.getX(),
			segY = segment.getY(),
			p = this.points,
			iNext = this.nextIndex(i),
			x = p[iNext] - p[i],
			y = p[iNext + 1] - p[i + 1];

		var dot = segX * x + segY * y;

		return dot / Math.sqrt( Util.hypotSq(segX, segY) * Util.hypotSq(x, y) );
	}


	overlapsTrack_noRadiusCheck(track) { // assuming polygon is enlarged by track.unit.getRadius()

		if (this.containsPoint(track.p1))
			return true;

		if (track.isInPlace())
			return;

		return this.intersectLine2(track.getSegment());
	}


	overlapsTrack(track, tMin, tMax = tMin + 3) {

		if (tMin !== undefined && (tMax < track.t1 || tMin > track.t2) )
			return false;

		if ( track.isInPlace() ) {

			if ( this.containsPoint(track.p1) )
				return true;

			return this.overlapsCircle( track.getCircle() );
		}

		var segment;

		if (tMin !== undefined) {

			segment = track.getCutoffSegment(tMin, tMax);

			if (!segment)
				return false;

		} else
			segment = track.getSegment();

		var r = track.unit.getRadius();

		if ( this.traverseSomeEdges( edge => segment.distance2Segments(edge) < r ) )
			return true;

		return this.containsPoint(track.p1);
	}


	// *INTERSECTION: w/ edges!
	intersectLine2(line2, fn) {
		return this.intersectSegment(line2.p1.x, line2.p1.y, line2.p2.x, line2.p2.y, fn);
	}

	// *INTERSECTION: w/ edges!
	//
	// fn argument:
	// undef: return true if there's an intersection
	// true: return least segment intersection parameter
	// function: call on every intersection
	//
	intersectSegment(x1, y1, x2, y2, fn) {

		var segX = x2 - x1,
			segY = y2 - y1,
			p = this.points,
			length = p.length,
			prevX = p[length - 2],
			prevY = p[length - 1],
			tMin = Infinity;

		for (let i = 0; i < length; i += 2) {

			let x = p[i];
			let y = p[i + 1];

			var d = (x - prevX) * segY - (y - prevY) * segX;
			if (d === 0) { // parallel - TODO (?)
				prevX = x;
				prevY = y;
				continue;
			}

			let t = ((x1 - prevX) * segY - (y1 - prevY) * segX) / d;
			if (t >= 0 && t <= 1) {

				let u = ((x1 - prevX) * (y - prevY) - (y1 - prevY) * (x - prevX)) / d;
				if (u >= 0 && u <= 1) { // segment parameter

					if (fn === undefined)
						return true;

					if (fn === true)
						tMin = Math.min(tMin, u);
					else
						fn(u, this.prevIndex(i), x - prevX, y - prevY); // edge x/y (NOT intersect)
				}
			} // if (t)

			prevX = x;
			prevY = y;
		}

		if (fn === true)
			return tMin;
	}


	// mb. TODO re-consider interface (+)
	// Outward intersections skipped.
	getSegmentInwardIntersectData(line2, data, searchMinParam = true) {

		if (data === undefined) {
			data = this._intersectData;
			data.t = Infinity;
		}

		this.intersectLine2(line2, (t, i, edgeX, edgeY) => {

			if (line2.getY() * edgeX - line2.getX() * edgeY < 0)
				return;

			if (searchMinParam && t < data.t) {

				data.t = t;
				data.i = i;
				data.id = this.id;
				data.polygon = this;
			}
		});

		if (data.t < Infinity)
			return data;
	}

/*
	cutSegmentWithEdges(line2, letItRemainIntersecting = true) {

		var t = this.intersectLine2(line2, true);
		if (t === undefined)
			return;

		if (letItRemainIntersecting)
			t += 1e-3 / line2.distance();

		line2.multiplyDistance(t);
	}
*/

	// delta > 0: prolong segment after intersection
	// delta < 0: shorten it (never behind p1)
	cutSegmentWithEdges(line2, delta = 0) {

		var t = this.intersectLine2(line2, true);

		if ( !Number.isFinite(t) )
			return;

		if (delta !== 0)
			t = Math.max( 0, t + delta / line2.distance() );

		line2.multiplyDistance(t);
	}


	// Convex polygon. Returns false if no intersection.
	distanceLine3P1ToIntersection(line3, maxHeight = this.height) {

		console.assert(maxHeight >= 0);

		// Check height.
		var dy = line3.end.y - line3.start.y,
			diffHeight = maxHeight - line3.start.y;
		if (dy >= 0 && diffHeight < 0)
			return false;

		var t = this.intersectSegment(line3.start.x, line3.start.z,
			line3.end.x, line3.end.z, true);
		if (t === undefined)
			return false;

		if (t * dy <= diffHeight) // at intersection height is OK
			return t * line3.distance();

		// check at max.item height
		var k = diffHeight / dy;
		if (k < 0 || k > 1)
			return false;

		var x = line3.start.x + k * (line3.end.x - line3.start.x),
			y = line3.start.z + k * (line3.end.z - line3.start.z);

		//non-convex TODO

		if (!this.contains(x, y))
			return false;

		return k * line3.distance();
	}


	prevIndex(i) {
		return i > 0 ? i - 2 : this.points.length - 2;
	}

	nextIndex(i) {
		return i < this.points.length - 2 ? i + 2 : 0;
	}

	distance2Vertices(i, j) {
		var p = this.points;
		return Util.hypot(p[i] - p[j], p[i + 1] - p[j + 1]);
	}


	// move point at j, increase distance by delta (negative: make edge shorter)
	modifyDistance2Vertices(i, j, delta) {

		var p = this.points,
			x = p[j] - p[i],
			y = p[j + 1] - p[i + 1],
			distance = Util.hypot(x, y);

		var t = (distance + delta) / distance;
		p[j] = p[i] + t * x;
		p[j + 1] = p[i + 1] + t * y;
	}


	// is edge visible from the outside of CCW polygon or from inside CW polygon?
	isEdgeVisible(i, viewX, viewY) {

		var p = this.points,
			iNext = this.nextIndex(i);

		return Point.isLeft(viewX, viewY, p[i], p[i + 1], p[iNext], p[iNext + 1]) < 0;
	}

	//
	// If the edge is completely outside the circle - return false
	// else fill target's p1, p2 with a part of edge which is inside the circle.
	// expecting target an instanceof Line2
	//
	cutEdgeWithCircle(i, circle, target) {

		var p = this.points,
			iNext = this.nextIndex(i);

		var x1 = p[i],
			y1 = p[i + 1],
			x20 = p[iNext] - x1,
			xr0 = circle.x - x1,
			y20 = p[iNext + 1] - y1,
			yr0 = circle.y - y1;

		var a = x20 * x20 + y20 * y20,
			b = -2 * (x20 * xr0 + y20 * yr0),
			c = xr0 * xr0 + yr0 * yr0 - circle.radius **2,
			d = b * b - 4 * a * c;

		if (d < 0) // line extending the edge completely misses the circle
			return false;

		d = Math.sqrt(d);
		// t1 is always the smaller value, because BOTH discriminant and
		// a are nonnegative.
		var t1 = (-b - d) / (2 * a),
			t2 = (-b + d) / (2 * a);

		if (t2 < 0 || t1 > 1) // "FallShort" or started past circle
			return false;

		if (t1 < 0)
			t1 = 0;
		if (t2 > 1)
			t2 = 1;

		target.set(t1 * x20 + x1, t1 * y20 + y1, t2 * x20 + x1, t2 * y20 + y1);
	}


	angleOf3Pts(i, j, k) { // negative on CW
		var p = this.points;
		return Angle.of3(p[i], p[i + 1], p[j], p[j + 1], p[k], p[k + 1]);
	}

	angleInternalAtVertex(i) {
		var iPrev = this.prevIndex(i);
		var iNext = this.nextIndex(i);
		return this.angleOf3Pts(iPrev, i, iNext);
	}

	angleOfVertexNormal(i) { // TODO weird
		return Angle.avgLR(this.nextEdgeAngle(i), this.oppositePrevEdgeAngle(i));
	}


	prevEdgeAngle(i) {
		var p = this.points;
		var iPrev = this.prevIndex(i);
		return Math.atan2(p[i + 1] - p[iPrev + 1], p[i] - p[iPrev]);
	}

	oppositePrevEdgeAngle(i) {
		var p = this.points;
		var iPrev = this.prevIndex(i);
		return Math.atan2(p[iPrev + 1] - p[i + 1], p[iPrev] - p[i]);
	}

	nextEdgeAngle(i) { // TODO mb.rename? .edgeAngle
		var p = this.points;
		var iNext = this.nextIndex(i);
		return Math.atan2(p[iNext + 1] - p[i + 1], p[iNext] - p[i]);
	}

	oppositeNextEdgeAngle(i) {
		var p = this.points;
		var iNext = this.nextIndex(i);
		return Math.atan2(p[i + 1] - p[iNext + 1], p[i] - p[iNext]);
	}


	// Returns undefined if resulting polygon is degenerate
	fixShortEdges(minLength, warnMsg) {

		var count = 0;

		for (let i = 0; i < this.points.length; i += 2) {

			if (this.distance2Vertices(i, this.nextIndex(i)) > minLength)
				continue;

			this.points.splice(i, 2);
			i -= 2;
			count ++;
		}

		if (warnMsg && count > 0)
			console.warn(`${warnMsg}: ${count} short edges`);

		if (this.points.length >= 6)
			return this;
	}


	fixAcuteAngles(cutDistance = 0.0005, warnMsg) {

		if (!this.has3Pts())
			return;

		this.setUpdated();

		for (let i = 0; i < this.points.length; i += 2) {
			let alpha = this.angleInternalAtVertex(i);
			if (alpha >= Math.PI / 2)
				continue;

			if (this.fixAcuteAngleWithPointInsertion(i, cutDistance, warnMsg) === false)
				return;
			i += 2;
		}

		return this;
	}


	fixAcuteAngleWithPointInsertion(i, cutDistance, warnMsg) {

		var prevEdgeLength = this.distance2Vertices(this.prevIndex(i), i);
		var nextEdgeLength = this.distance2Vertices(i, this.nextIndex(i));

		var minLength = Math.min(prevEdgeLength, nextEdgeLength);

		// TODO exact calculations incl.very sharp angles
		if (minLength < 2 * cutDistance) {
			console.warn(`fixAcuteAngle: ${warnMsg} minLength=${minLength} cutDistance=${cutDistance} i=${i}`, this);
			return false;
		}

		// insert duplicate point at i
		this.points.splice(i, 0, this.points[i], this.points[i + 1]);

		this.modifyDistance2Vertices(this.prevIndex(i), i, -cutDistance);
		this.modifyDistance2Vertices(this.nextIndex(i + 2), i + 2, -cutDistance);
	}


	scale(sx, sy = sx) {

		for (let i = 0; i < this.points.length; i += 2) {

			this.points[i] *= sx;
			this.points[i + 1] *= sy;
		}

		return this;
	}


	getEnlarged(distance) {
		return this.clone().enlarge(distance);
	}


	enlarge(distance) {

		if (distance === 0)
			return this;

		this.setUpdated();

		var	p = this.points,
			newPoints = [];

		for (let i = 0; i < p.length; i += 2) {

			// TODO simplify for less trig.

			let	aNext = this.nextEdgeAngle(i);

			let	alpha = Angle.sub(aNext, this.oppositePrevEdgeAngle(i) ) / 2,
				d = distance / Math.sin(alpha);

			let	beta = aNext - alpha;

			newPoints.push(
				p[i] + d * Math.cos(beta),
				p[i + 1] + d * Math.sin(beta)
			);
		}

		this.points = newPoints;
		return this;
	}


	rotate(alpha) { // CCW rotation. Rotation by item.facing: as expected.

		this.setUpdated(); // boundingCircle would not be the same.

		var p = this.points,
			length = p.length,
			sin = Math.sin(alpha),
			cos = Math.cos(alpha);

		for (let i = 0; i < length; i += 2) {

			let x = p[i],
				y = p[i + 1];

			p[i] = cos * x - sin * y;
			p[i + 1] = cos * y + sin * x;
		}

		return this;
	}


	translate(x, y = 0) {

		if (this._boundingCircle)
			this._boundingCircle.translate(x, y);

		var p = this.points;

		for (let i = 0; i < p.length; i += 2) {
			p[i] += x;
			p[i + 1] += y;
		}

		return this;
	}


	translateByVector3(v) { return this.translate(v.x, v.z); }


	vertexInCircle(i, circle) { // <0 not in circle, ==0 on boundary
		return circle.radius * circle.radius
			- Util.hypotSq(this.points[i] - circle.x, this.points[i + 1] - circle.y)
	}


	getIndicesForBoundingCircle() {

		var nPoints = this.points.length >> 1;
		var indices = Util.setLength(boundingCircleIndices, nPoints);

		for (let i = 0; i < nPoints; i++)
			indices[i] = i * 2;

		var sprng = this.getSPRNG().set();

		for (let i = nPoints - 1; i >= 2; i--) { // shuffle
			let j = sprng.randInt(i - 1) + 2;
			swapIndices(i, j);
		}

		swapIndices(1, nPoints >> 1);

		return indices;


		function swapIndices(i, j) {
			var tmp = indices[i];
			indices[i] = indices[j];
			indices[j] = tmp;
		}
	}


	createBoundingCircle() {

		if (this.points.length < 6) {

			if (this.points.length === 4)
				return new Circle().setFrom2ArrayPoints(this.points, 0, 2);

			if (this.points.length === 2)
				return new Circle(this.points[0], this.points[1], 0);

			return null;
		}

		var indices = this.getIndicesForBoundingCircle();

		var circle = new Circle;


		var setAndCheckCircle = () => {

			var i = indices.length - 1;

			circle.setMinimalFrom3ArrayPoints(this.points, indices[i], indices[i - 1], indices[i - 2]);

			for (i -= 3; i >= 0; i--) { // NaN: count as inside
				if (indices[i] !== null && this.vertexInCircle(indices[i], circle) < -1e-9)
					return i;
			}
		};


		while (1) {

			let i = setAndCheckCircle();
			if (i === undefined)
				break;

			indices.push( indices[i] );
			indices[i] = null;
		}

//console.log(`checkBC ${circle}`);
this.checkBC(circle);

		return circle;
	}



checkBC(circle) {

	var min = 0;

	for (let i = 0; i < this.points.length; i += 2) {
		let d2 = this.vertexInCircle(i, circle);
//if (d2 < -1e-15)
//	console.error(`${d2} x=${this.points[i]} y=${this.points[i+1]}`, circle);
		min = Math.min(min, d2);
	}

	if (min < -1e-9)
		console.error(`< ${min}`, this, circle);
	if (min > 1e-9)
		console.error(`> ${min}`, this);
//p = CGroup.byId[1e9+10].getPolygon()
//p.getBoundingCircle()
	return min;
}


	static testBC(n = 10, nPoints = 200, seed) {

		var sprng = new Util.SeedablePRNG(seed);

		for (let i = 0; i < n; i++)
			createAndTestBC();


		function createAndTestBC() {

			var points = [];

			for (let i = 0; i < nPoints; i++) {

				let	x = sprng.random(200) - 100,
					y = sprng.random(200) - 100;

				if (Util.hypot(x, y) > 100)
					continue;

				points.push(x, y);
			}

			var polygon = new Polygon(points);

			var ref = polygon.getBoundingCircle();
		}
	}


	static createRegularConvex(r, isInscribed, height, minNEdges = 5) {

		console.assert(r > 0);

		var nEdges = Math.max(minNEdges, Circle.boundingNEdgesByRadius(r));

		if (isInscribed !== true)
			r *= Circle.distToBoundingNgonVertex(nEdges);

		var points = [],
			alpha = 0,
			step = 2 * Math.PI / nEdges;

		for (let i = 0; i < nEdges * 2; i += 2) {

			let x = Math.cos(alpha) * r;
			let y = -Math.sin(alpha) * r; // CCW

			points[i] = Math.abs(x) > Number.EPSILON ? x : 0;
			points[i + 1] = Math.abs(y) > Number.EPSILON ? y : 0;

			alpha -= step;
		}

		return new Polygon(points, height);
	}


	static mergePointSets(array) {

		var height = -Infinity;
		var points = [];

		for (let i = 0; i < array.length; i++) {

			height = Math.max(height, array[i].height);
			Array.prototype.push.apply(points, array[i].points);
		}

		return new Polygon(points, height);
	}


	static createFromLineSegments(lineSegments, height, name) {

		// LineSegments (extends THREE.Object3D)
		// special mesh w/ BufferGeometry consisting of line segments

		if ( !(1
			&& (lineSegments instanceof THREE.LineSegments)
			&& (lineSegments.material instanceof THREE.LineBasicMaterial)
			&& lineSegments.geometry
		) )
			return Report.warn("bad lineSegments", `name=${name}`);

		return this.createFromLineSegmentsGeometry(lineSegments.geometry, height, name);
	}


	static createFromLineSegmentsGeometry(geometry, height, name) {

		if ( !(1
			&& (geometry instanceof THREE.BufferGeometry)
			&& geometry.attributes.position
			&& geometry.attributes.position.itemSize === 3
			&& geometry.attributes.position.count >= 3
			&& geometry.index
		) )
			return;


		var nVertices = geometry.attributes.position.count;

		var vertexConnectivity = new Array(2 * nVertices).fill(-1);

		var addConnection = (fromI, toI) => {

			var i = vertexConnectivity[ 2 * fromI ] === -1 ? 2 * fromI :
				vertexConnectivity[ 2 * fromI + 1 ] === -1 ? 2 * fromI + 1 : -1;

			if (i === -1)
				return;

			vertexConnectivity[ i ] = toI;

			return true;
		};


		for (let i = 0; i < geometry.index.array.length; i += 2) {

			let	fromI = geometry.index.array[i],
				toI = geometry.index.array[i + 1];

			if ( !addConnection(fromI, toI) || !addConnection(toI, fromI) )
				return Report.warn("3+ junction", `${name}`);
		}


		var startI = 0;
		var curI = 0;
		var cameFromI = vertexConnectivity[0];

		var points = [];

		for (let i = 0; ; i++) {

			points.push(
				geometry.attributes.position.array[ curI * 3 ],
				geometry.attributes.position.array[ curI * 3 + 2 ],
			);

			let	next1 = vertexConnectivity[ 2 * curI ],
				next2 = vertexConnectivity[ 2 * curI + 1 ],
				nextI;

			if (next1 === cameFromI)
				nextI = next2;
			else if (next2 === cameFromI)
				nextI = next1;
			else
				return Report.warn("one-way connection", `${curI} ${cameFromI} ${name}`);

			cameFromI = curI;
			curI = nextI;

			if (curI === startI) {

				if (i !== nVertices - 1)
					Report.warn("isolated parts", `${i} ${nVertices} ${name}`);

				break;
			}

			if (i >= nVertices)
				return Report.warn("incorrect geometry", `${i} ${name}`);
		}

		if (points.length < 6)
			return Report.warn("too few points", `${points.length} ${name}`);

		return new Polygon(points, height);
	}



	static createPointSetFrom3DGeometry(geometry, maxHeight = 2.00) {

		var array = geometry.attributes.position.array;
		if (array.length < 9) {
			Report.warn("bad geometry", `${geometry.name}`);
			return;
		}

		var height = -Infinity;
		var points = [];

		for (let i = 0; i < array.length; i += 3) {

			height = Math.max(height, array[i + 1]);
			if (array[i + 1] > maxHeight)
				continue;

			points.push(array[i], array[i + 2]);
		}

		return new Polygon(points, height);
	}


	getPointsSortedByCoordsAscend() { // lower X 1st, then by lower Y

		var p = this.points;

		var indices = new Uint32Array(p.length / 2);
		for (let i = 0; i < indices.length; i++)
			indices[i] = i * 2;

		indices.sort((a, b) => {
			return (p[a] - p[b]) || p[a + 1] - p[b + 1];
		});

		var resultPoints = [];

		for (let i = 0; i < indices.length; i++) {
			let idx = indices[i];
			resultPoints.push(p[idx], p[idx + 1]);
		}

		return resultPoints;
	}


	getConvexHull() { // loses equal pts.

		if (!this.has3Pts())
			return;

		var p = this.getPointsSortedByCoordsAscend();
		var length = p.length;

		var divisorLine = this._divisorLine.set(p[0], p[1], p[length - 2], p[length - 1]);

		var stack = [ p[0], p[1] ];
		this.processVertexChain(p, stack, 2, length, 2, divisorLine);

		this.processVertexChain(p, stack, length - 2, -2, -2);
		stack.length -= 2;

		if (stack.length < 6) {
			Report.warn("too few points", `${this} (${stack.length/2} pts of ${length/2})`);
			return;
		}

		return new Polygon(stack, this.height);
	}


	processVertexChain(p, stack, startIdx, lastIdx, step, divisorLine) {

		var stackSize = stack.length;
		// the stack already contains 1 pt. of current chain
		var minOperationalStackSize = stackSize + 2;

		for (let i = startIdx; i != lastIdx; i += step) {

			let x = p[i];
			if (x === undefined)
				continue;

			let y = p[i + 1];

			if (divisorLine !== undefined ) { // 1st pass (lower VertexChain)
				// divisor line check; mark the processed points
				if (divisorLine.isLeft(x, y) > 0)
					continue;

				p[i] = undefined;
			}

			// skip equal pts.
			if (stack[stackSize - 2] === x && stack[stackSize - 1] === y)
				continue;

			while (stackSize >= minOperationalStackSize) {

				if (Point.isLeft(x, y, stack[stackSize - 4], stack[stackSize - 3],
						stack[stackSize - 2], stack[stackSize - 1]) > 0)
					break;

				stackSize -= 2;
				stack.length = stackSize;
			}

			stack.push(x, y);
			stackSize += 2;
		}
	}


	static fromPerspectiveCamera(camera) {

		camera.updateMatrix(); // make sure camera's local matrix is updated
		camera.updateMatrixWorld(); // make sure camera's world matrix is updated
		camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

		this._projectScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		this._frustum.setFromProjectionMatrix(this._projectScreenMatrix);

		var line3 = this._line3;

		if (!this._floorPlane.intersectPlane(this._frustum.planes[0], line3))
			Report.throw("parallel plane", "0 (right)");

		this._lineRight.copyFromLine3(line3);
		
		if (!this._floorPlane.intersectPlane(this._frustum.planes[1], line3))
			Report.throw("parallel plane", "1 (left)");

		this._lineLeft.copyFromLine3(line3);

		if (!this._floorPlane.intersectPlane(this._frustum.planes[4], line3))
			Report.throw("parallel plane", "4 (far)");

		this._lineFar.copyFromLine3(line3);

		//this._floorPlane.intersectPlane(this._frustum.planes[5], this._line3);
		//this._lineNear.copyFromLine3(this._line3);

		//TODO, mb. use camera.userData
		//var lineTop = this.intersectFloorPlane(this._frustum.planes[3]);
		//var p0 = new Point(camera.position.x, camera.position.z);
		//if (lineTop.distanceLineToPoint(p0) < lineFar.distanceLineToPoint(p0))
		//	lineFar = lineTop;

		this._lineLeft.intersectLine(this._lineFar, this._pFarLeft);
		this._lineRight.intersectLine(this._lineFar, this._pFarRight);

		return new Polygon([
			camera.position.x, camera.position.z,
			this._pFarLeft.x, this._pFarLeft.y, this._pFarRight.x, this._pFarRight.y
		]);
	}


	isSimple() {
console.error(`TODO`);
		function allowCheckIntersection(n1, n2, total) {
			if (n1 === 0)
				return n2 > 1 && n2 != total - 1;
			if (n1 == total - 1)
				return n2 !== 0 && n2 < total - 2;
			return n2 < n1 - 1 && n2 > n1 + 1;
		}

		var totalEdges = this.points.length / 2;
		if (totalEdges < 4)
			return true;

		var edge = Polygon._edge;
		edge.x0 = this.points[this.points.length - 2];
		edge.y0 = this.points[this.points.length - 1];
		var edgeNum = 0;

		for (let i = 0; i < this.points.length; i += 2) {
			edge.x1 = this.points[i];
			edge.y1 = this.points[i + 1];

			var segment = Polygon._intersectSegment;
			segment.x0 = this.points[this.points.length - 2];
			segment.y0 = this.points[this.points.length - 1];
			var segmentNum = 0;

			for (let j = 0; j < this.points.length; j += 2) {
				segment.x1 = this.points[j];
				segment.y1 = this.points[j + 1];

				if (allowCheckIntersection(edgeNum, segmentNum, totalEdges))
					if (edge.intersect2Segments(segment))
						return false;

				segment.x0 = segment.x1;
				segment.y0 = segment.y1;
				segmentNum ++;
			}

			edge.x0 = edge.x1;
			edge.y0 = edge.y1;
			edgeNum ++;
		}
		return true;
	}


	// ===========================================================
	//
	//   Using PolyBool
	//
	// ===========================================================

/*
	//PolyBool.epsilon(newEpsilonValue);
	toPolyBool() {

		var result = { regions: [ [] ], inverted: false };

		var p = this.points;
		for (let i = 0; i < p.length; i += 2)
			result.regions[0].push([ p[i], p[i + 1] ]);

		return result;
	}


	static arrayToPolyBool(array) {

		var result = { regions: [], inverted: false };

		array.forEach( (polygon, idx) => {
			var region = [];
			var p = polygon.points;

			for (let i = 0; i < p.length; i += 2)
				region.push([ p[i], p[i + 1] ]);

			result.regions.push(region);
		});

		return result;
	}


	static createFromPolyBool(polyBool) {

		var src = ('regions' in polyBool) ? polyBool.regions[0] : polyBool;
		if (!src) {
			Report.warn(`empty polyBool`, polyBool);
			return;
		}

		var points = [];
		for (let i = 0; i < src.length; i++) // CCW
			points.push(src[i][0], src[i][1]);
		//for (let i = src.length - 1; i >= 0; i--) // CW
		//	points.push(src[i][0], src[i][1]);

		var polygon = new Polygon(points);

		//if (!polygon.testCCW())
		//	polygon.revertVertexOrder();
		polygon.forceCCW();

		return polygon;
	}

	union(polygon) {
		var polyBool = PolyBool.union(this.toPolyBool(), polygon.toPolyBool());
		return Polygon.createFromPolyBool(polyBool);
	}


	static union(polygons) {
		console.assert(Array.isArray(polygons) && polygons.length >= 2);

		var segments = PolyBool.segments(polygons[0].toPolyBool());

		for (var i = 1; i < polygons.length; i++){
			let seg2 = PolyBool.segments(polygons[i].toPolyBool());
			let comb = PolyBool.combine(segments, seg2);
			segments = PolyBool.selectUnion(comb);
		}

		var polyBool = PolyBool.polygon(segments);
		console.assert(polyBool.regions.length == 1);
		console.assert(!polyBool.inverted);

		return this.createFromPolyBool(polyBool);
	}


	difference(polygon) {
		var polyBool = PolyBool.difference(this.toPolyBool(), polygon.toPolyBool());
		//return Polygon.createFromPolyBool(polyBool);
		return polyBool;
	}
*/

	// =============================================
	//
	// using polygonClipping
	//
	// =============================================

	toGeoJSON() {

		var result = [];

		var p = this.points;
		for (let i = 0; i < p.length; i += 2)
			result.push([ p[i], p[i + 1] ]);

		return [ result ]; // 1 GeoJSON "ring"
	}


	static handleSelfClosingRing(ring) { // produced by polygonClipping

		var len = ring.length;

		if (len <= 1)
			return Report.warn("bad length", `l=${len}`);

		if ( ring[len - 1][0] === ring[0][0] && ring[len - 1][1] === ring[0][1] ) {

			ring.length = len - 1;
		}
	}


	static createFromGeoJSON(input) {

		var ring = input[0]; // 1st "ring" (outer)

		if (!Array.isArray(ring))
			return Report.warn("empty input");

		this.handleSelfClosingRing(ring);

		//FF60 var points = ring.flat();

		var points = [];

		for (let i = 0; i < ring.length; i++) // CCW
			points.push(ring[i][0], ring[i][1]);
		//for (let i = length - 1; i >= 0; i--) // CW
		//	points.push(src[i][0], src[i][1]);

		var polygon = new Polygon(points);

		//if (!polygon.testCCW())
		//	polygon.revertVertexOrder();

		return polygon;
	}


	static union(polygons) {

		console.assert(Array.isArray(polygons) && polygons.length >= 2);

		var geoms = [];
		var height = -Infinity;

		polygons.forEach(p => {
			geoms.push(p.toGeoJSON())
			height = Math.max(height, p.height || 0);
		});


		var result = polygonClipping.union.apply(null, geoms); // returns MultiPolygon

		console.assert(result.length == 1);

		if (result[0].length > 1)
			console.warn(`rings:${result[0].length}`);

		var polygon = Polygon.createFromGeoJSON(result[0]);
		polygon.height = height;
		return polygon;
	}


	static getDifferenceMultiPolygon(polygon1, polygons) {

		if (polygons.length === 0)
			return [ polygon1.toGeoJSON() ];

		return polygonClipping.difference(

			polygon1.toGeoJSON(),
			...polygons.map(p => p.toGeoJSON())
		);
	}


	// =====================================================

	difference(polygons) {

		console.assert(Array.isArray(polygons));
		console.assert(polygons.length > 0);

		var mP = Polygon.getDifferenceMultiPolygon(this, polygons);

		mP.forEach(geoJSONPolygon => {

			geoJSONPolygon.forEach(ring => Polygon.handleSelfClosingRing(ring));

		});

		// oops.
		// how to know if inner or outer ring.

		//Polygon.createFromGeoJSON(result[0]);

		return mP.map( geoJSONPolygon => Polygon.createFromGeoJSON(geoJSONPolygon) );
	}


	getGeometryFromDifference(polygons) {

		var mP = Polygon.getDifferenceMultiPolygon(this, polygons);

		var position = [];

		mP.forEach(geoJSONPolygon => {

			geoJSONPolygon.forEach(ring => Polygon.handleSelfClosingRing(ring));

			let data = earcut.flatten(geoJSONPolygon);

			let trianglePoints = earcut(data.vertices, data.holes, data.dimensions);

			HelperGeometry.addToPositionArrayFromEarcutResult(trianglePoints, data.vertices, 0, position);
		});

		var geometry = new THREE.BufferGeometry;

		geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(position), 3));

		return geometry;
	}




	// =====================================================
	//
	//   Helpers
	//
	// =====================================================
/*
	getFlatMesh() {

		var mesh = new THREE.Mesh(
			HelperGeometry.getFlatPolygon(this, this.id),
			Assets.materials.flatPolygon
		);

		return mesh;
	}
*/

	addToGeometry(positions = [], y = 0.01, delta = 0) {
		const factor = 1;

		var p = this.points;
		var length = p.length;
		var lastX = p[length - 2];
		var lastY = p[length - 1];

		for (let i = 0; i < length; i += 2) {
			let vertexX = p[i];
			let vertexY = p[i + 1];

			positions.push(lastX * factor + delta, y, lastY * factor + delta,
				vertexX * factor + delta, y, vertexY * factor + delta);

			lastX = vertexX;
			lastY = vertexY;
		}
		return positions;
	}


	show(matName = 'polygon', y) {

		var mesh = this._showData.get(this);
		if (mesh) {
			scene.remove(mesh);
			mesh.geometry.dispose();
			this._showData.delete(this);

		} else {
			let positions = this.addToGeometry([], y);
			let g = new LineSegmentsGeometry;
			g.setPositions(positions);

			var mesh = new THREE.Mesh(g, Assets.materials.line[matName]);
			mesh.name = `${this}`;
			scene.add(mesh);
			this._showData.set(this, mesh);
		}

		return this;
	}


	showTurnOff() {

		var mesh = this._showData.get(this);

		if (mesh) {
			scene.remove(mesh);
			mesh.geometry.dispose();
			this._showData.delete(this);
		}
	}

}


Object.assign(Polygon, {

	_projectScreenMatrix: new THREE.Matrix4,
	_frustum: new THREE.Frustum,
	_floorPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
	_line3: new THREE.Line3,
	_lineRight: new Line2,
	_lineLeft: new Line2,
	_lineFar: new Line2,
	_pFarLeft: new Point,
	_pFarRight: new Point,

	_sprng: null,
});


Object.assign(Polygon.prototype, {

	shapeType: "Polygon",

	_rect: new Rectangle,
	_vertex: new Point,
	_traversePoint: new Point,
	_getPoint: new Point,
	_line2: new Line2,
	_edgeSegment: new Line2,
	_edgeV: new Point,
	_nearestPtOnEdge: new Point,
	_extremeIndicesDirection: { left: 0, right: 0 },
	_divisorLine: new Line2,

	_intersectData: {
		t: 0, i: 0, id: 0, polygon: null,
		copy(d) {
			this.t = d.t; this.i = d.i; this.id = d.id; this.polygon = d.polygon;
		},
	},

	_showData: new WeakMap
});



export { Polygon };

