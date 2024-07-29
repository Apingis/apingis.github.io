
import { Point } from './Point.js';
import { Rectangle } from './Rectangle.js';
import { PolarCoords } from './Math.js';


class Sector {

	//
	// left, right is from the point of view of left-handed coordinate system:
	// +X is to the right, +Y up, angle increases CCW.
	//
	constructor(x = 0, y = 0, radius = 0, left = Math.PI, right = -Math.PI, isSubSector) {

		this.x = x;
		this.y = y;
		this.radius = radius;

		this.left = left; // Range: [-PI..3*PI)
		this.right = right; // Range: [-PI..PI); in subSector [-PI..3*PI)

		this._leftSegment = null;
		this._rightSegment = null;

		if (Main.DEBUG)
			this.validate(isSubSector);
	}


	validate(isSubSector) {

		var left = this.left,
			right = this.right;

		if (left < -Math.PI || left >= 3 * Math.PI || right < -Math.PI
				|| left < right || left - right > 2 * Math.PI
				|| !isSubSector && right >= Math.PI) {
			Report.throw("invalid sector", `R=${right} L=${left}`);
		}

		if (isSubSector && right >= 3 * Math.PI)
			Report.throw("invalid subSector", `R=${right} L=${left}`);

		if (!Number.isFinite(this.radius) || this.radius < 0) {
			Report.warn("bad radius", `r=${this.radius}`);
			this.radius = 1.00;
		}
	}


	toString() { return `[Sector ${Util.toStr(this.x)},${Util.toStr(this.y)}`
		+ ` r=${Util.toStr(this.radius)} L=${Util.toStr(this.left)} R=${Util.toStr(this.right)}]`; }

	is360() { return this.left === Math.PI && this.right === -Math.PI; }

	isGt180() { return this.left - this.right > Math.PI; }

	equals(s) {
		return this.left === s.left && this.right === s.right
			&& this.x === s.x && this.y === s.y && this.radius === s.radius;
	}


	get geometry() { return HelperGeometry.getSector(this); }

	clone() {
		return new Sector(this.x, this.y, this.radius, this.left, this.right);
	}


	update() {
		this.setupLeftSegment();
		this.setupRightSegment();
	}


	set(x, y, radius, left, right) {

		this.x = x;
		this.y = y;
		this.radius = radius;
		this.left = left;
		this.right = right;

		this.update();
		return this;
	}


	static createFromCircle(circle, left, right) {
		return new Sector(circle.x, circle.y, circle.radius, left, right);
	}


	// =======================================================================

	getAngle() { return this.left - this.right }


	distanceTo(x, y) { return Util.hypot(x - this.x, y - this.y); }

	distanceToVGNode(node) { return Util.hypot(node.x - this.x, node.y - this.y); }

	distanceToCircle(circle) {
		return Math.max(0, Util.hypot(circle.x - this.x, circle.y - this.y) - circle.radius);
	}

	//
	// Input is NOT nesessarily a normalized angle [-PI..PI] as returned by atan2().
	//
	// Localize given angle at the sector:
	// - must be >= R
	// - must be < R + 2 * PI
	//
	localizeAngle(a) {

		var right = this.right;

		var checkEpsilon = () => {

			if (a > right - 64 * Number.EPSILON) {

				//if (a < right - 6 * Number.EPSILON)
				//	Report.warn("localizeAngle", a=${a} r=${right} diff=${(right-a)/Number.EPSILON}eps.`);
				return true;
			}
		}

		if (Math.abs(a) >= 2 * Math.PI)
			a %= 2 * Math.PI;

		if (a < right) {

			if (checkEpsilon()) {
				a = right;

			} else {
				a += 2 * Math.PI;

				if (a < right) // This can happen in case of a subSector
					a = checkEpsilon() ? right : a + 2 * Math.PI;
			}

		} else if (a >= right + 2 * Math.PI)
			a -= 2 * Math.PI;

		//if ( !(a >= right && a < right + 2 * Math.PI) )
		//	console.error(`origA=${origA} a=${a} L=${this.left} R=${right}`);

		return a;
	}


	localizedAngleTo(x, y) {
		return this.localizeAngle(Math.atan2(y - this.y, x - this.x));
	}

	localizedAngleToIfFits(x, y) {
		var a = this.localizedAngleTo(x, y);
		if (a <= this.left)
			return a;
	}

	localizedAngleToVGNode(vGNode) {
		return this.localizedAngleTo(vGNode.x, vGNode.y);
	}


	angleFits(a) {
		return this.localizeAngle(a) <= this.left;
	}

	oppositeMedianAngle() {
		return (this.right + this.left) / 2 + Math.PI;
	}


	localizeClampAngle(a, warn = true, threshold = 1e-5) {

		a = this.localizeAngle(a);
		if (a <= this.left)
			return a;

		var diff = a - this.oppositeMedianAngle();

		if (warn === true && Math.abs(diff) > threshold)
			console.error(`localizeClampAngle diff=${diff}`);

		return diff > 0 ? this.right : this.left;
	}


	// Is sector formed with given L,R (normalized with this) completely outside this?
	isOutsideLR(aL, aR) { // TODO aR<aL
		return aR < aL && aR > this.left && aL > this.left;
	}
/*
	// Is sector formed with given L,R (normalized with this) completely inside this?
	//isInsideLR(aL, aR) {
	//}
*/
	getLocalizedPolar(x, y, polar = this._polar) {

		var r = this.distanceTo(x, y),
			phi = this.localizedAngleTo(x, y);

		return polar.set(r, phi);
	}


	getLocalizedPolarIfFits(x, y, polar) {

		var r = this.distanceTo(x, y);

		if (r <= this.radius) {
			let phi = this.localizedAngleTo(x, y);

			if (phi <= this.left) {
				if (polar === undefined)
					polar = this._polar;

				return polar.set(r, phi);
			}
		}
	}


	// ===================================================================

	get leftSegment() {

		if (!this._leftSegment) {
			this._leftSegment = new Line2();
			this.setupLeftSegment();
		}

		return this._leftSegment;
	}


	get rightSegment() {

		if (!this._rightSegment) {
			this._rightSegment = new Line2();
			this.setupRightSegment();
		}

		return this._rightSegment;
	}


	setupLeftSegment() { this.setupRadialSegment(this._leftSegment, this.left); }

	setupRightSegment() { this.setupRadialSegment(this._rightSegment, this.right); }

	setupRadialSegment(segment, angle) {
		segment && segment.set(
			this.x, this.y,
			this.x + this.radius * Math.cos(angle),
			this.y + this.radius * Math.sin(angle)
		);
	}


	containsPoint(p) {
		return this.contains(p.x, p.y);
	}

	containsVGNode(node) {
		return this.contains(node.x, node.y);
	}


	contains(x, y) {

		if (this.distanceTo(x, y) > this.radius)
			return false;

		return this.containsByAngle(x, y);
	}


	containsByAngle(x, y) {

		if (this.is360())
			return true;

		return this.localizedAngleTo(x, y) <= this.left;
	}


	overlapsCircle(circle, addToRadius = 0) {
		return this.overlaps(circle.x, circle.y, circle.radius + addToRadius);
	}


	overlaps(x, y, radius) {

		var d = this.distanceTo(x, y);
		if (d > this.radius + radius)
			return;

		if (this.is360() || d <= radius)
			return true;

		if (this.radius == Infinity || this.radius < 0) {
			Report.warn("unsupported case", `r=${this.radius}`);
			return;
		}

		var leftSegment = this.leftSegment,
			rightSegment = this.rightSegment;

		var dLeft, dRight;
		var tLeft, tRight;

		if (!this.isGt180()) {
			if ( (dLeft = leftSegment.distanceSignedTo(x, y)) > radius
					|| (dRight = rightSegment.distanceSignedTo(x, y)) < -radius)
				return;

			if (dLeft <= 0 && dRight >= 0) // circle center is in the sector
				return true;

			// point closest to circle center - parameter
			tLeft = leftSegment.parameterClosestPointTo(x, y);
			if (tLeft >= 0 && tLeft <= 1 && dLeft > 0)
				return true;

			tRight = rightSegment.parameterClosestPointTo(x, y);
			if (tRight >= 0 && tRight <= 1 && dRight < 0)
				return true;

			if (tLeft < 0 && tRight < 0)
				return;

		} else {
			dLeft = leftSegment.distanceSignedTo(x, y);
			dRight = rightSegment.distanceSignedTo(x, y);
			if (dLeft > radius && dRight < -radius)
				return;

			if (dLeft <= 0 || dRight >= 0)
				return true;

			tLeft = leftSegment.parameterClosestPointTo(x, y);
			if (tLeft <= 1)
				return true;

			tRight = rightSegment.parameterClosestPointTo(x, y);
			if (tRight <= 1)
				return true;
		}

		if (tLeft > 1)
			return leftSegment.p2.distanceTo(x, y) <= radius;
		if (tRight > 1)
			return rightSegment.p2.distanceTo(x, y) <= radius;

		Report.warn("inexpected", `x=${x} y=${y} r=${radius} | ${this}`);
	}

	//
	// Returns:
	// - undefined: circle is not within L/R
	// - true: circle is partly or fully within L/R
	//
	overlapsCircleByLR(circle) {
		return this.overlapsByLR(circle.x, circle.y, circle.radius);
	}


	overlapsByLR(x, y, radius) {

		if (this.is360())
			return true;

		var dLeft = this.leftSegment.distanceSignedTo(x, y);

		if (!this.isGt180()) {
			if (dLeft > radius || this.rightSegment.distanceSignedTo(x, y) < -radius)
				return;

		} else {
			if (dLeft > radius && this.rightSegment.distanceSignedTo(x, y) < -radius)
				return;
		}

		return true;
	}


	getPoint(p = this._getPoint) { return p.set(this.x, this.y); }


	getRect(rect = this._rect) {

		var	p1 = this.leftSegment.p2,
			p2 = this.rightSegment.p2;

		return rect.set(

			this.containsCircleMinX() ? this.x - this.radius
				: Math.min(p1.x, p2.x, this.x),
			this.containsCircleBottom() ? this.y - this.radius
				: Math.min(p1.y, p2.y, this.y),
			this.containsCircleMaxX() ? this.x + this.radius
				: Math.max(p1.x, p2.x, this.x),
			this.containsCircleTop() ? this.y + this.radius
				: Math.max(p1.y, p2.y, this.y)
		);
	}

// TODO what if subSector?
	containsCircleTop() {
		return this.right <= Math.PI / 2 && this.left > Math.PI / 2 || this.left >= 2.5 * Math.PI;
// TODO this.left >= Math.PI / 2 (?)
	}

	containsCircleBottom() {
		return this.right <= -Math.PI / 2 && this.left > -Math.PI / 2 || this.left >= 1.5 * Math.PI;
	}

	containsCircleMaxX() {
		return this.right <= 0 && this.left > 0 || this.left >= 2 * Math.PI;
	}

	containsCircleMinX() {
		return this.right === -Math.PI || this.left >= Math.PI;
	}


	setFrom3Points(left, c, right) {

		var r = c.distanceToPoint(left);
		var [ left, right ] = Angle.normalizeLR( c.angleToPoint(left), c.angleToPoint(right) );

		return this.set(c.x, c.y, r, left, right);
	}


	setFromPerspectiveCamera(camera) {

		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

		this._projectionScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

		var	frustum = this._frustum.setFromProjectionMatrix(this._projectionScreenMatrix),
			line3 = this._line3,
			groundPlane = this._groundPlane;

		if (!groundPlane.intersectPlane(frustum.planes[0], line3))
			Report.throw("parallel plane", "0 (right)");

		var left = Angle.opposite( Angle.fromLine3(line3) );
		
		if (!groundPlane.intersectPlane(frustum.planes[1], line3))
			Report.throw("parallel plane", "1 (left)");

		var right = Angle.fromLine3(line3);

		return this.set(camera.position.x, camera.position.z, camera.far,
			...Angle.normalizeLR(left, right) );
	}


	enlarge(d) {

		this.radius += 2 * d;

		if (this.is360()) {
			this.update();
			return this;
		}

		// On sharp sector, enlargement in this direction is substantially greater than d.
		var a = this.oppositeMedianAngle();

		this.x += Math.cos(a) * d;
		this.y += Math.sin(a) * d;

		this.update();
		return this;
	}


	intersectsArc(segment) {

		// Move sector center to (0, 0)
		var	x0 = segment.p1.x - this.x,
			y0 = segment.p1.y - this.y,
			x = segment.getX(),
			y = segment.getY();

		var	a = x * x + y * y,
			b = 2 * (x0 * x + y0 * y),
			c = x0 * x0 + y0 * y0 - this.radius * this.radius,
			d = b * b - 4 * a * c;

		if (d < 0)
			return;

		// It's possible w/o trig if precompute sector angles.

		var checkAngleFits = (t) => t >= 0 && t <= 1
			&& this.angleFits(Math.atan2(y0 + t * y, x0 + t * x));

		if (checkAngleFits( (-b - Math.sqrt(d)) / (2 * a) )
				|| checkAngleFits( (-b + Math.sqrt(d)) / (2 * a) ) )
			return true;
	}


	overlapsTrack(track) { // no radius check.

		if (this.containsPoint(track.p1))
			return true;

		if (track.isInPlace())
			return;

		var segment = track.getSegment();

		return segment.intersect2Segments(this.leftSegment)
			|| segment.intersect2Segments(this.rightSegment)
			|| this.intersectsArc(segment);
	}


	// =======================================================================

	show(matName = 'sector', h) {

		var mesh = this._showData.get(this);
		if (mesh) {
			mesh.geometry.dispose();
			scene.remove(mesh);
			this._showData.delete(this);

		} else {
			var mesh = new THREE.Mesh(this.geometry, Assets.materials[matName]);
			mesh.renderOrder = this.geometry.attributes.position.array[1] * 1e+6;

			mesh.position.set(this.x, h || 0.01, this.y);
			mesh.name = `${this}`;
			scene.add(mesh);
			this._showData.set(this, mesh);
		}

		return this;
	}

}

Object.assign(Sector.prototype, {

	shapeType: "Sector",

	_rect: new Rectangle,
	_polar: new PolarCoords,
	_getPoint: new Point,

	_projectionScreenMatrix: new THREE.Matrix4,
	_frustum: new THREE.Frustum,
	_groundPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
	_line3: new THREE.Line3,

	_showData: new WeakMap
});



export { Sector };

