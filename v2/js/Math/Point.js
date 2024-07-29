
import { Rectangle } from './Rectangle.js';


class Point {

	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	toString() {
		return `[Pt ${Util.toStr(this.x)},${Util.toStr(this.y)}]`;
	}

	get z() { Report.throw("get z"); }

	set z(val) { Report.throw("set z"); }

	clone() { return new Point(this.x, this.y); }

	equals(p) { return this.x === p.x && this.y === p.y; }

	set(x, y) {
		this.x = x;
		this.y = y;
		return this;
	}

	copy(p) {
		this.x = p.x;
		this.y = p.y;
		return this;
	}

	copyFromCircle(c) {
		this.x = c.x;
		this.y = c.y;
		return this;
	}

	copyFromSector(s) {
		this.x = s.x;
		this.y = s.y;
		return this;
	}

	onCircumference(c, angle) {
		return this.copyFromCircle(c).move(angle, c.radius);
	}

	copyFromVector3(v) { return this.setFromVector3(v) }

	setFromVector3(v) {
		this.x = v.x;
		this.y = v.z;
		return this;
	}

	static fromVector3(v) { return new Point().copyFromVector3(v); }

	getRect(rect = this._rect) {
		return rect.set(this.x, this.y, this.x, this.y);
	}

	perp() { // actually reverted
		var tmp = this.x;
		this.x = -this.y;
		this.y = tmp;
		return this;
	}

	getByAngleDistance(angle, distance = 1) {
		return this.clone().move(angle, distance);
	}

	setFromAngleDistance(angle, distance) {
		this.x = distance * Math.cos(angle);
		this.y = distance * Math.sin(angle);
		return this;
	}

	// Is p0 to the left of line p1-p2? (NOT taking world L/R inversion into account)
	// > 0 strictly left
	// == 0 on the line
	// < 0 strictly right
	// equal points (p0==p1 || p1==p2 || p0==p2): result is 0
	static isLeft(p0x, p0y, p1x, p1y, p2x, p2y) {
		return (p2x - p1x) * (p0y - p1y) - (p0x - p1x) * (p2y - p1y);
	}

	static isLeft00(p0x, p0y, p1x, p1y) { // Is p0 to the left of line (0,0)---p1 ?
		return p1x * p0y - p0x * p1y;
	}

	isLeft00(p1x, p1y) { // Non-static version. Is this to the left of line (0,0)---p1 ?
		return p1x * this.y - this.x * p1y;
	}

	// OK! (sign of perp product)
	isLeft(x, y) { // Is point at (x, y) to the left of (0, 0)-->this?
		return this.x * y - this.y * x;
	}

	//isPointLeft(p) { return this.x * p.y - this.y * p.x; }


	distanceSqTo(x, y) { return Util.hypotSq(this.x - x, this.y - y) }

	distanceSqToPoint(p) { return Util.hypotSq(this.x - p.x, this.y - p.y) }


	angle() { return Math.atan2(this.y, this.x); } // between (0,0)-->(this) and --X+-->

	angleTo(x, y) { return Math.atan2(y - this.y, x - this.x); }

	angleToPoint(p) { return Math.atan2(p.y - this.y, p.x - this.x); }

	angleFrom(x, y) { return Math.atan2(this.y - y, this.x - x); }

	angleFromPoint(p) { return Math.atan2(this.y - p.y, this.x - p.x); }

	angleToVector3(v) { return Math.atan2(this.y - v.z, this.x - v.x); }


	move(angle, distance = 1.00) {
		this.x += distance * Math.cos(angle);
		this.y += distance * Math.sin(angle);
		return this;
	}

	moveTowardsPoint(p, distance) { return this.moveTowards(p.x, p.y, distance); }


	moveTowards(x, y, distance) {

		var dTotal = this.distanceTo(x, y);
		if (dTotal === 0)
			return this;

		var d = Math.min(1, distance / dTotal);

		this.x += d * (x - this.x);
		this.y += d * (y - this.y);

		return this;
	}


	rotate(theta) {

		var	x = this.x * Math.cos(theta) - this.y * Math.sin(theta),
			y = this.y * Math.cos(theta) + this.x * Math.sin(theta);

		this.x = x;
		this.y = y;

		return this;
	}


	translate(x, y = 0) {
		this.x += x;
		this.y += y;
		return this;
	}


	normalize() {

		var length = this.length();

		if (length !== 0) {
			this.x /= length;
			this.y /= length;
		}

		return this;
	}


	length() { return Util.hypot(this.x, this.y); }

	distanceTo(x, y) { return Util.hypot(this.x - x, this.y - y); }

	distanceToPoint(p) { return Util.hypot(this.x - p.x, this.y - p.y); }

	distanceToVector3(v) { return Util.hypot(this.x - v.x, this.y - v.z); }


	static perpProduct(x1, y1, x2, y2) { return y1 * x2 - x1 * y2; } // <0 #2 is left

	perpProduct(p) { return this.y * p.x - this.x * p.y; } // <0 left

	dot(p) { return this.x * p.x + this.y * p.y; }

	add(p) {
		console.assert(p instanceof Point);
		this.x += p.x;
		this.y += p.y;
		return this;
	}

	addComponents(x, y) {
		this.x += x;
		this.y += y;
		return this;
	}

	scale(factor) {
		this.x *= factor;
		this.y *= factor;
		return this;
	}

	addScaled(p, factor) {
		this.x += factor * p.x;
		this.y += factor * p.y;
		return this;
	}

	sub(p) {
		this.x -= p.x;
		this.y -= p.y;
		return this;
	}

	subVectors(p1, p2) {
		this.x = p1.x - p2.x;
		this.y = p1.y - p2.y;
		return this;
	}

	negate() {
		this.x = -this.x;
		this.y = -this.y;
		return this;
	}

	multiplyScalar(s) {
		this.x *= s;
		this.y *= s;
		return this;
	}

	divideScalar(s) {
		this.x /= s;
		this.y /= s;
		return this;
	}


	getQuadNum() {
		var n = this.x < 0 ? 1 : 0;
		return this.y < 0 ? 3 - n : n;
	}

	tangentSlopeOfNormal() { return -this.x / this.y }


	applyMatrix3(matrix3) { // only 2 rows of matrix used

		var e = matrix3.elements;

		return this.set(
			this.x * e[0] + this.y * e[3] + e[6],
			this.x * e[1] + this.y * e[4] + e[7]
		);
	}


	applyMatrix4(matrix4, v) {

		var e = matrix4.elements;

		return v.set(
			this.x * e[0] + this.y * e[4] + e[12],
			this.x * e[1] + this.y * e[5] + e[13],
			this.x * e[2] + this.y * e[6] + e[14]
		);
	}


	getUint32() {

		var BASE_EXP = 10;

		var maxAbsValue = Math.max( Math.abs(this.x), Math.abs(this.y) );
		var exp = 1 + Math.floor( Math.log2(maxAbsValue) );
		var multiplier = exp >= 0 ? 1 / (1 << exp) : 1 << -exp;

		var to13Bits = (a) => {

			var sign = 0;
			if (a < 0) {
				sign = 4096;
				a = -a;
			}

			a *= multiplier;

			return sign | ((a * 4096) & 4095);
		}

		var result = to13Bits(this.x) | (to13Bits(this.y) << 13)
			| ((exp + BASE_EXP) << 26);

		return result >>> 0;
	}


	setFromUint32(u) {

		var BASE_EXP = 10;

		var pow = (u >>> 26);
		var multiplier = (1 << pow) * (1 / (1 << BASE_EXP) / 4096);

		var toNumber = (a) => {

			var sign = 1 - ((a & 4096) >> 11);
			a &= 4095;
			return a * sign * multiplier;
		}

		return this.set(
			toNumber(u >>> 0),
			toNumber(u >>> 13)
		);
	}


	static fromUint32(u) { return new Point().setFromUint32(u); }


	// =====================
	//
	//   Helpers
	//
	// =====================

	showSign(matName = 'sign', nSections, w, h, heightRatio) {

		var mesh = this._showDataSign.get(this);
		if (mesh) {
			scene.remove(mesh);
			this._showDataSign.delete(this);

		} else {
			var g = HelperGeometry.getSignLS(nSections, w, h, heightRatio);
			var mesh = new THREE.Mesh(g, Assets.materials.line[matName]);
			mesh.position.set(this.x, 0, this.y);
			mesh.name = `Sign->${this}`;
			scene.add(mesh);
			this._showDataSign.set(this, mesh);
		}

		return this;
	}


	showRect(matName = 'rect', r = 0.04) {

		var polygon = this._showDataRect.get(this);
		if (polygon) {
			polygon.show();
			this._showDataRect.delete(this);

		} else {
			polygon = Polygon.fromRectangle(this.getRect().enlarge(r)).show(matName);
			this._showDataRect.set(this, polygon);
		}

		return this;
	}


	show(matName = 'point', r = 0.03) {

		var mesh = this._showData.get(this);
		if (mesh) {
			scene.remove(mesh);
			this._showData.delete(this);

		} else {
			var g = HelperGeometry.getCircle(r);
			var mesh = new THREE.Mesh(g, Assets.materials.line[matName]);
			mesh.position.set(this.x, 0.01, this.y);
			mesh.name = `${this}`;
			scene.add(mesh);
			this._showData.set(this, mesh);
		}

		return this;
	}
}


Object.assign(Point, {

	pAt00: new Point,
	at00: new Point,
});


Object.assign(Point.prototype, {

	shapeType: "Point",
	_rect: new Rectangle,
	_showData: new Map,
	_showDataSign: new Map,
	_showDataRect: new Map,
});



export { Point };

