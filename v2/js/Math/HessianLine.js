
class HessianLine {

	constructor(n = new Point, c = 0) {

		this.n = n;
		this.c = 0; // c-: move along v
	}

	toString() { return `[HessianLine n=${n} c=${c}]` }


	distanceTo(x, y) { return x * this.n.x + y * this.n.y + this.c }

	distanceToPoint(p) { return this.distanceTo(p.x, p.y) }

	negate() { this.n.negate(); this.c *= -1 }


	setFromLine2(line2, revertLineDirection) {

		var	x = line2.getX(),
			y = line2.getY(),
			d = Util.hypot(x, y);

		if (d === 0)
			Report.warn("zero length segment");

		this.n.x = (revertLineDirection ? -y : y) / d;
		this.n.y = (revertLineDirection ? x : -x) / d;

		this.c = -(line2.p1.x * this.n.x + line2.p1.y * this.n.y);

		return this;
	}


	setFromNormalAndPointOnLine(n, p) {

		this.c = -(p.x * n.x + p.y * n.y);
		this.n.copy(n);

		return this;
	}


	intersectHessianLine(line) {

		var d = this.n.x * line.n.y - line.n.x * this.n.y;

		if ( Math.abs(d) < 1e-9 )
			return;

		var p = HessianLine._intersectPoint || ( HessianLine._intersectPoint = new Point );

		return p.set(
			(line.c * this.n.y - this.c * line.n.y) / d,
			(this.c * line.n.x - line.c * this.n.x) / d
		);
	}


	intersectCircle(circle) {

		var a, b, c;

		if (this.n.x > Math.SQRT1_2) {

			a = 1 + (this.n.y / this.n.x) **2;
			b = 2 * ( (this.n.y / this.n.x) * (circle.x + this.c / this.n.x) - circle.y );
			c = (circle.x + this.c / this.n.x) **2 + circle.y **2 - circle.radius **2;

		} else {

			a = 1 + (this.n.x / this.n.y) **2;
			b = 2 * ( (this.n.x / this.n.y) * (circle.y + this.c / this.n.y) - circle.x );
			c = (circle.y + this.c / this.n.y) **2 + circle.x **2 - circle.radius **2;
		}

		var roots = Polynomial.solveQuadraticEqn(a, b, c);

		if (!roots)
			return;

		var result = HessianLine._intersectCircle || ( HessianLine._intersectCircle = {
			p1: new Point, p2: new Point
		});

		var x1, y1, x2, y2;

		if (this.n.x > Math.SQRT1_2) {

			y1 = roots.x1;
			y2 = roots.x2;
			x1 = (y1 * this.n.y + this.c) / -this.n.x;
			x2 = (y2 * this.n.y + this.c) / -this.n.x;

		} else {

			x1 = roots.x1;
			x2 = roots.x2;
			y1 = (x1 * this.n.x + this.c) / -this.n.y;
			y2 = (x2 * this.n.x + this.c) / -this.n.y;
		}

		result.p1.set(x1, y1);
		result.p2.set(x2, y2);

		return result;
	}


	getPointByDistanceFromPoint(p1, d) { // on this or parallel line

		var p2 = HessianLine._pointByDistance || ( HessianLine._pointByDistance = new Point );

		return p2.set(
			p1.x + this.n.y * d,
			p1.y - this.n.x * d
		);
	}


	intersectsRectSgn(rect) { // -1: fully left, 0: intersects

		var	d1 = this.distanceTo(rect.minX, rect.minY);

		if (Math.min(
			d1 * this.distanceTo(rect.maxX, rect.minY),
			d1 * this.distanceTo(rect.minX, rect.maxY),
			d1 * this.distanceTo(rect.maxX, rect.maxY),
		) <= 0)
			return 0;

		return Math.sign(d1);
	}


	getPoint(p) { // nearest to the origin

		if (!p)
			p = HessianLine._point || ( HessianLine._point = new Point );

		return p.set( this.n.x * -this.c, this.n.y * -this.c );
	}


	getLine2(line2) { // length=1; normal is to the right of p1->p2

		if (!line2)
			line2 = HessianLine._line2 || ( HessianLine._line2 = new Line2 );

		var p1 = this.getPoint(line2.p1);

		line2.p2.set( p1.x - this.n.y, p1.y + this.n.x );

		return line2;
	}

}



Object.assign( HessianLine, {

	_intersectPoint: null,
	_pointByDistance: null,
	_intersectCircle: null,
	_point: null,
	_line2: null,
});




export { HessianLine }

