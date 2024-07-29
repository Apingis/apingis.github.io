
import { Line2 } from './Line2.js';
import { Point } from './Point.js';
import { Rectangle } from './Rectangle.js';


class Circle {

	constructor(x = 0, y = 0, radius = 0) {
		this.x = x;
		this.y = y;
		this.radius = radius;
	}

	get r() { Report.throw("use .radius"); }

	set r(value) { Report.throw("use .radius"); }

	toString() { return `[Circle ${Util.toStr(this.x)},${Util.toStr(this.y)}`
		+ ` r=${Util.toStr(this.radius)}]`; }

	clone() { return new Circle(this.x, this.y, this.radius); }

	set(x, y, radius) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		return this;
	}

	copy(circle) {
		this.x = circle.x;
		this.y = circle.y;
		this.radius = circle.radius;
		return this;
	}

	equalsEpsilon(c, eps = 1e-9) {
		return Math.abs(c.x - this.x) <= eps && Math.abs(c.y - this.y) <= eps
			&& Math.abs(c.radius - this.radius) <= eps;
	}

	translate(x, y) {
		this.x += x;
		this.y += y;
		return this;
	}

	scale(factor) {
		this.x *= factor;
		this.y *= factor;
		this.radius *= factor;
		return this;
	}

	getMaxY() { return this.y + this.radius; }

	getPoint(p = this._pt) { return p.set(this.x, this.y); }

	getPointOnCircumference(a) {
		return this._pt.set(
			this.x + Math.cos(a) * this.radius,
			this.y + Math.sin(a) * this.radius
		);
	}

	getRect(rect = this._rect) {
		return rect.set(
			this.x - this.radius, this.y - this.radius,
			this.x + this.radius, this.y + this.radius
		);
	}


	contains(x, y) {
		return Util.hypotSq(this.x - x, this.y - y) <= this.radius * this.radius;
	}

	containsPoint(p) {
		return Util.hypotSq(this.x - p.x, this.y - p.y) <= this.radius * this.radius;
	}

	distanceTo(x, y) {
		return Math.max(0, Util.hypot(this.x - x, this.y - y) - this.radius);
	}

	distanceToPoint(p) {
		return Math.max(0, Util.hypot(this.x - p.x, this.y - p.y) - this.radius);
	}

	// Negative: inside
	distanceToVector3(v) { return Util.hypot(this.x - v.x, this.y - v.z) - this.radius; }

	distanceToCircle(c) {
		return Util.hypot(c.x - this.x, c.y - this.y) - this.radius - c.radius;
	}

	angleTo(x, y) { return Math.atan2(y - this.y, x - this.x); }

	angleToPoint(p) { return Math.atan2(p.y - this.y, p.x - this.x); }

	angleFromPoint(p) { return Math.atan2(this.y - p.y, this.x - p.x); }

	angleToVector3(v) { return Math.atan2(v.z - this.y, v.x - this.x); }

	//
	// Lay circle on top of 2 ("this" and "circle").
	// Skip if resulting circle center is outside X-interval formed by 2 centers.
	// If unsuccessful - return undefined.
	//
	layCircleOnTopOf2(circle, radius, target = this._layCircleOnTopOf2) {

		var p = TriangleSolver.getUpperVertex(this.x, this.y, circle.x, circle.y,
				this.radius + radius, circle.radius + radius);

		if (!p || (p.x - this.x) * (p.x - circle.x) >= 0)
			return;

		return target.set(p.x, p.y, radius);
	}

	//
	// Lay circle on top of "this" and vertical line defined with eqn. y = x1
	// Skip if resulting circle center is outside X-interval formed by 2 centers.
	// If unsuccessful - return undefined.
	//
	layCircleOnCircleAndVLine(x1, radius, target = this._layCircleOnTopOf2) {

		// TODO abs(this.x - x1) < radius - 1e-9?

		var x = x1 + (x1 < this.x ? radius : -radius),
			y = Math.sqrt( (radius + this.radius) **2 - (x - this.x) **2 ) + this.y;

		if (!Number.isFinite(y) || (x - x1) * (x - this.x) >= 0)
			return;

		return target.set(x, y, radius);
	}


	overlapsRectangle(rect) {

		var x =
			this.x <= rect.minX ? rect.minX :
			this.x >= rect.maxX ? rect.maxX :
			this.x;

		var y =
			this.y <= rect.minY ? rect.minY :
			this.y >= rect.maxY ? rect.maxY :
			this.y;

		x -= this.x; y -= this.y;

		return x * x + y * y <= this.radius * this.radius;
	}


	overlapsCircle(c) {
		var r = this.radius + c.radius;
		return Util.hypotSq(this.x - c.x, this.y - c.y) <= r * r;
	}


	intersectRayFromOriginFromInside(theta, p = this._pt) {

		var roots = Polynomial.solveQuadraticEqn(
			1,
			-2 * (Math.cos(theta) * this.x + Math.sin(theta) * this.y),
			this.x * this.x + this.y * this.y - this.radius * this.radius
		);

		return p.set(
			roots.x2 * Math.cos(theta),
			roots.x2 * Math.sin(theta)
		);
	}


	intersectsCircumference(c) {

		var d = this.distanceToCircle(c);

		if (d > 0 || d < -Math.min(this.radius, c.radius))
			return false;

		return true;
	}


	// Intersect other circle, fill-in target1,2 (instanceof Point)
	intersect(x, y, radius, target1, target2) {

		var dx = x - this.x,
			dy = y - this.y,
			d = Util.hypot(dx, dy);

		if (d === 0 || d > this.radius + radius
				|| d < Math.abs(this.radius - radius) )
			return; // Circumferences are coincident or don't intersect

		if (!target1)
			return true;

		var a = (this.radius * this.radius - radius * radius + d * d) / (2 * d);
		var h = Math.sqrt(this.radius * this.radius - a * a);

		var x2 = this.x + a * dx / d,
			y2 = this.y + a * dy / d,
			x3a = h * dy / d,
			y3a = h * dx / d;

		target1.set(x2 + x3a, y2 - y3a);
		target2.set(x2 - x3a, y2 + y3a);
		return true;
	}


	// Returns false if there's no intersection
	distanceLine3P1ToIntersection(line3, height) {

		var t = this._line2.copyFromLine3(line3).parameterP1IntersectionCircle(this);
		if (t === false)
			return false;

		var dy = line3.end.y - line3.start.y;
		if (line3.start.y + t * dy <= height) // at intersection height is OK
			return t * line3.distance();

		if (dy >= 0) // line3 goes upwards
			return false;

		// check at max.item height
		var k = (height - line3.start.y) / dy;
		if (k < 0 || k > 1)
			return false;

		var x = line3.start.x + k * (line3.end.x - line3.start.x),
			y = line3.start.z + k * (line3.end.z - line3.start.z);

		if (Util.hypot(x - this.x, y - this.y) > this.radius) //.distanceTo!
			return false;

		return k * line3.distance();
	}


	setFrom2Points(x1, y1, x2, y2) {
		this.x = (x1 + x2) / 2;
		this.y = (y1 + y2) / 2;
		this.radius = Util.hypot(x1 - this.x, y1 - this.y);
		return this;
	}

	setFrom2ArrayPoints(arr, i, j) {
		return this.setFrom2Points(arr[i], arr[i + 1], arr[j], arr[j + 1]);
	}


	setMinimalFrom3ArrayPoints(arr, a, b, c) { // any angles.

		if (a === b || b === c || a === c)
			Report.warn("repeating indices", `a=${a} b=${b} c=${c}`);

		var ax = arr[a], ay = arr[a + 1],
			bx = arr[b] - ax, by = arr[b + 1] - ay,
			cx = arr[c] - ax, cy = arr[c + 1] - ay;

		if (bx * cx + by * cy <= 0)
			return this.setFrom2ArrayPoints(arr, b, c);

		if (-bx * (cx - bx) - by * (cy - by) <= 0)
			return this.setFrom2ArrayPoints(arr, a, c);

		if (-cx * (bx - cx) - cy * (by - cy) <= 0)
			return this.setFrom2ArrayPoints(arr, a, b);

		// Collinear and equal pts. are ruled out by the above checks.

		var distBSq = Util.hypotSq(bx, by),
			distCSq = Util.hypotSq(cx, cy);

		var d = 2 * (bx * cy - cx * by);
		if (d === 0)
			Report.warn("can't happen");

		var x = (distBSq * cy - distCSq * by) / d;
		var y = (distCSq * bx - distBSq * cx) / d;

		this.x = x + ax;
		this.y = y + ay;
		this.radius = Util.hypot(x, y);

		return this;
	}


	setFrom3Points(pa, pb, pc) {

		var ax = pa.x, ay = pa.y,
			bx = pb.x - ax, by = pb.y - ay,
			cx = pc.x - ax, cy = pc.y - ay;

		var d = 2 * (bx * cy - cx * by);
		if (d === 0)
			return;

		var distBSq = Util.hypotSq(bx, by),
			distCSq = Util.hypotSq(cx, cy);

		var x = (distBSq * cy - distCSq * by) / d;
		var y = (distCSq * bx - distBSq * cx) / d;

		this.set( x + ax, y + ay, Util.hypot(x, y) );

		return true;
	}


	closestOnCircumferenceToPoint(p, target = this._closestOnCircumference) {

		var a = this.angleToPoint(p);

		return target.set( this.radius * Math.cos(a), this.radius * Math.sin(a) );
	}


	static distToBoundingNgonVertex(nEdges) {
		return 1 / Math.cos(Math.PI / nEdges);
	}

	static boundingNEdgesByRadius(r, maxDelta = 0.3) { // f(0.7,0.3)=3.95
		var ratio = maxDelta / r;
		return ratio > 0.414213563 ? 4 : Math.ceil( Math.PI / Math.acos(1 / (1 + ratio)) );
	}


	// =========================
	//
	//   DEBUG
	//
	// =========================

	show(lineMatName = 'circle', y0) {

		var mesh = this._showData.get(this);
		if (mesh) {
			scene.remove(mesh);
			this._showData.delete(this);

		} else {
			var mesh = new THREE.Mesh(
				HelperGeometry.getCircle(this.radius),
				Assets.materials.line[lineMatName]
			);
			mesh.position.set(this.x, y0 || 0.01, this.y);
			mesh.name = `${this}`;
			scene.add(mesh);
			this._showData.set(this, mesh);
		}

		return this;
	}

}


Object.assign(Circle.prototype, {

	shapeType: "Circle",

	_rect: new Rectangle,
	_line2: new Line2,
	_layCircleOnTopOf2: new Circle,
	_pt: new Point,
	_closestOnCircumference: new Point,

	_showData: new Map
});



export { Circle };

