
import { Point } from './Point.js';
import { Line2 } from './Line2.js';
import { HessianLine } from './HessianLine.js';


//
// ax^2 + bxy + cy^2 + dx + ey + f = 0
//
// Q. Rename to ConicSection?
// A. Some curves are not a result of intersection of a cone and a plane,
//    even if include case of intersection of a cylinder and a plane.
// 
// Tested well only: ellipse, hyperbola, parallelLines, intersectingLines.
//
class QuadraticCurve {

	constructor(arg) {

		if (arg !== undefined)
			Report.warn("bad usage");

		this._type = null;
		this.name = "";

		this.a = 0;
		this.b = 0;
		this.c = 0;
		this.d = 0;
		this.e = 0;
		this.f = 0;

		this.halfSgn = 0; // additional definition.

		this._center = new Point(null);
		this._signAtCenter = null;
		this._conjugateAxis = new HessianLine;
	}

	get type() { Report.warn(`get type`); }
	set type(v) { Report.warn(`set type`); }


	setCoefficients(a, b, c, d, e, f, eps = 0) {

		this._type = null;

		if (eps > 0) {

			this.a = Math.abs(a) < eps ? 0 : a;
			this.b = Math.abs(b) < eps ? 0 : b;
			this.c = Math.abs(c) < eps ? 0 : c;
			this.d = Math.abs(d) < eps ? 0 : d;
			this.e = Math.abs(e) < eps ? 0 : e;
			this.f = Math.abs(f) < eps ? 0 : f;

		} else {
			this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f;
		}

		return this;
	}


	toString() {
		return `[QuadraticCurve t=${this.getType()} ${this.name} a=${this.a} b=${this.b} c=${this.c}`
			+ ` d=${this.d} e=${this.e} f=${this.f} detNorm=${this.detNorm().toExponential(1)}`
			+ ` discrNorm=${this.discrNorm().toExponential(1)}`
			+ `]`;
	}


	clear() {

		this._type = null;
		this.halfSgn = 0;

		this._center.x = null;
		this._signAtCenter = null;
		this._conjugateAxis.n.x = null;

		return this;
	}


	setFactors(a, b, c, d, e, f) {

		this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f;

		return this;
	}


	set(a, b, c, d, e, f, epsilon) {

		this.clear();

		this.setCoefficients(a, b, c, d, e, f, epsilon);

		return this;
	}


	setName(name) { this.name = name; return this; }


	clone() {
		return new QuadraticCurve().set(this.a, this.b, this.c, this.d, this.e, this.f);
	}

	maxAbsCoefficient() {
		return Math.max( Math.abs(this.a), Math.abs(this.b), Math.abs(this.c),
			Math.abs(this.d), Math.abs(this.e), Math.abs(this.f) );
	}

	getType() {
		return this._type !== null ? this._type : (this._type = this._getType());
	}


	_getType() {

		// not so useful for direct degeneracy assessment w/ epsilon in mind?
		var	det = this.determinant(),
			d = this.discriminant();

		var	mC = this.maxAbsCoefficient();

		var	type;

		if (Math.abs(det / (mC * mC * mC)) < 1e-11) {

			if (Math.abs(d / (mC * mC)) < 1e-11) {

				let k = this.getK() / (mC * mC);

				type = k > 1e-8 ? "parallelLines" : "imaginary"; // coincident lines: imaginary

			} else
				//type = d > 0 ? "intersectingLines" : "point";
				type = d > 0 ? "intersectingLines" : "imaginary"; // treat pt. as imaginary lines-x

		} else if (d > 0) {
			type = "hyperbola";

		} else // skipped parabola
			type = det / (this.a + this.c) < 0 ? "ellipse" : "imaginary";

		return (this._type = type);
	}


	isImaginaryOrNone() { return this.getType() === "none" || this.getType() === "imaginary" }

	isHyperbola() { return this.getType() === "hyperbola"; }

	isIntersectingLines() { return this.getType() === "intersectingLines"; }

	isHyperbolaOrIntersectingLines() {
		var type = this.getType();
		return type === "hyperbola" || type === "intersectingLines";
	}

	isEllipse() { return this.getType() === "ellipse"; }

	isEllipseOrParallelLines() { return this.getType() === "ellipse"
		|| this.getType() === "parallelLines" }

	isImaginary() { return this.getType() === "imaginary"; }

	isLines() {
		var type = this.getType();
		return type === "parallelLines" || type === "intersectingLines";
	}


	discriminant() { return this.b * this.b - 4 * this.a * this.c; }

	discrNorm() { return this.discriminant() / this.maxAbsCoefficient() **2; }

	determinant() {

		var	a = this.a, b = this.b, c = this.c,
			d = this.d, e = this.e, f = this.f;

		return a * c * f + (b * e * d - a * e * e - b * b * f - c * d * d) / 4;
	}


	detNorm() {
		return this.determinant() / this.maxAbsCoefficient() **3;
	}


	getK() { return this.d * this.d + this.e * this.e - 4 * this.f * (this.a + this.c); }

	getKNorm() { return this.getK() / this.maxAbsCoefficient() **2; }


	isStandardForm() {

		return this.b === 0 && (this.f === 1 || this.f === 0) && this.e === 0
			&& this.c !== 0 // at least 1 term ^2
	}

/*
	getSemiAxesLengthsStandardForm(p = new Point) {

		return p.set(
			1 / Math.sqrt(Math.abs(this._standardForm.a)),
			1 / Math.sqrt(Math.abs(this._standardForm.c))
		);
	}
*/
	//
	// For hyperbola, this formula gives only 1 axis
	// ("transverse axis": the one passing through foci if extended), other axis length is Infinity.
	// hyperbola-h (a < 0): p.x
	// hyperbola-v (c < 0): p.y
	//
	getSemiAxesLengths(p = new Point) {

		var	a = this.a, b = this.b, c = this.c,
			d = this.d, e = this.e, f = this.f;

		var discriminant = b * b - 4 * a * c;
		var g = 2 * (a * e * e + c * d * d + f * discriminant - b * d * e) / discriminant;
		var h = Math.sqrt( (a - c) * (a - c) + b * b );

		var	len1 = Math.sqrt( g / (h - (a + c)) ),
			len2 = Math.sqrt( g / (-h - (a + c)) );

		return a <= c ? p.set(len1, len2) : p.set(len2, len1); // is this correct? TODO
	}


	getCenterUsingFormula() {

		return QuadraticCurve._tmpCenter.set(

			(2 * this.c * this.d - this.b * this.e),
			(2 * this.a * this.e - this.b * this.d)

		).divideScalar(this.b * this.b - 4 * this.a * this.c);
	}

	//
	// Parameter along the curve t E [ -PI, PI ].
	//
	// Selected is the point such as any ray from the point intersects the curve at most once.
	// For curves which have a center, this point is the center of the curve.
	//
	//( Math.atan2(1e9,1e-5)-Math.PI/2 ) / Number.EPSILON =~ -50
	//
	getCenter() {

		if (this._center.x !== null)
			return this._center;

		var type = this.getType();

		if (type == "hyperbola" || type == "ellipse" || type == "intersectingLines") {
			this._center.copy( this.getCenterUsingFormula() );

		} else if (type == "parallelLines") {
			this._center.set(0, 0); // this is correct only within our app (TODO!!)

		} else {
			Report.warn("unsupported type", `${this}`);
			this._center.set(0, 0);
		}

		return this._center;
	}


	getConjugateAxis() {

		var a = this._conjugateAxis;

		if (a.n.x === null)
			Report.warn("unset conjugateAxis", `${this}`);

		return a;
	}



	getParameter(x, y) { return this.getCenter().angleTo(x, y) }


	getDirectionParamIncreaseV(x, y) { // not normalized

		var n = this.getGradientV(x, y);
		var dirV = this._directionIncrV.set(-n.y, n.x); // -perp

		if ( this.getSignAtCenter() === 1 )
			dirV.negate();

		return dirV;
	}


	getGradientV(x, y) { // not normalized

		var v = this._gradientV.set(
			2 * this.a * x + this.b * y + this.d,
			2 * this.c * y + this.b * x + this.e
		);

		return v;
	}


	check(u, v) { // 2D local coords.

		var sum = this.a * u * u + this.b * u * v + this.c * v * v
			+ this.d * u + this.e * v + this.f;

		return sum;
	}


	getV(v) {
		return Polynomial.solveQuadraticEqn(this.c, this.b * v + this.e,
			this.a * v * v + this.d * v + this.f);
	}


	getU(u) {
		return Polynomial.solveQuadraticEqn(this.c, this.b * u + this.d,
			this.c * u * u + this.e * u + this.f);
	}


	containsPoint(p) { return this.contains(p.x, p.y); }

	contains(x, y) { return this.isInside(x, y) && this.checkHalfSgn(x, y) }


	isInside(x, y, eps = 1e-11) { // .halfSgn NOT APPLIES

		if ( this.isImaginaryOrNone() )
			return false;

		var fnValue = this.evaluateAt(x, y);

		if ( this.isEllipseOrParallelLines() )
			return fnValue <= eps;

		if ( this.isHyperbola() )
			return this.getSignAtCenter() * fnValue <= eps;

		Report.warn("isInside(): unsupported curve type", `${this}`);
	}


	evaluateAtPoint(p) { return this.evaluateAt(p.x, p.y) }

	evaluateAt(x, y) {
		return this.a * x * x + this.b * x * y + this.c * y * y
			+ this.d * x + this.e * y + this.f;
	}


	getSignAtCenter() {

		if (this._signAtCenter !== null)
			return this._signAtCenter;

		var sign = Math.sign( this.evaluateAtPoint(this.getCenter()) );

		if ( Math.abs(sign) !== 1 )
			Report.warn("zero at center", `${this}`);

		return (this._signAtCenter = sign);
	}


	checkHalfSgn(x, y) {

		if (this.halfSgn === 0)
			return true;

		//if ( !this.isHyperbolaOrIntersectingLines() )
		//	return true;

		return this.getConjugateAxis().distanceTo(x, y) * this.halfSgn >= 0;
	}



	setFromSectioningCone(cone, curveType, planeToLocalTransform, localToPlaneTransform,
			conePositionLocal, plane) {

		this.clear();

		this._type = curveType;

		if ( this.isEllipse() && cone.halfSgn !== 0 ) {

			let interceptY = -plane.constant / plane.normal.y;

			if ( (interceptY < conePositionLocal.y ? -1 : 1) !== this.halfSgn ) {
				this._type = "none";
				return this;
			}
		}

		var e = planeToLocalTransform.elements;

		var	ux = e[0], vx = e[4], cx = e[12],
			uy = e[1], vy = e[5], cy = e[13],
			uz = e[2], vz = e[6], cz = e[14];

		//if (conePositionLocal) { // cone is off origin. Use cone.position?

			cx -= conePositionLocal.x;
			cy -= conePositionLocal.y;
			cz -= conePositionLocal.z;
		//}

		this.setFactors(

			ux * ux + uz * uz - cone.bSq * uy * uy,
			2 * (ux * vx + uz * vz - cone.bSq * uy * vy),
			vx * vx + vz * vz - cone.bSq * vy * vy,
			2 * (ux * cx + uz * cz - cone.bSq * uy * cy),
			2 * (vx * cx + vz * cz - cone.bSq * vy * cy),
			cx * cx + cz * cz - cone.bSq * cy * cy,
		);

		if ( this.isHyperbolaOrIntersectingLines() ) {//&& cone.halfSgn !== 0 ) {

			this.halfSgn = cone.halfSgn;

			let v = this._tmpV.set(0, this.halfSgn || 1, 0).applyRotation(localToPlaneTransform);

			this._conjugateAxis.setFromNormalAndPointOnLine(

				this._p.set(v.x, v.y).normalize(),
				this.getCenter()
			);

			//this._conjugateAxis.getLine2().intersectQuadraticCurve(this);
		}

		return this;
	}


	setFromSectioningCylinder(r, curveType, planeToLocalTransform) {

		this.clear();

		if ( !(r > 0) )
			Report.warn("bad r", `r=${r}`);

		this._type = curveType;

		var e = planeToLocalTransform.elements;

		var	ux = e[0], vx = e[4], cx = e[12],
			uz = e[2], vz = e[6], cz = e[14];

		this.setFactors(

			ux * ux + uz * uz,
			2 * (ux * vx + uz * vz),
			vx * vx + vz * vz,
			2 * (ux * cx + uz * cz),
			2 * (vx * cx + vz * cz),
			cx * cx + cz * cz - r * r,
		);

		return this;
	}


/*
	intersectQuadraticCurve(qC, fn = (x, y) => console.log(x, y)) {

		if ( this.isImaginaryOrNone() || qC.isImaginaryOrNone() )
			return;

//console.log(this.clone(), qC.clone());
		if (this.isIntersectingLines())
			return qC.intersectDegenerateCurve(this, fn);

		if (qC.isIntersectingLines())
			return this.intersectDegenerateCurve(qC, fn);

		// TODO parallel lines?

		var	a1 = this.a, b1 = this.b, c1 = this.c,
			d1 = this.d, e1 = this.e, f1 = this.f;

		if (b1 === 0 && e1 === 0 && qC.b === 0 && qC.e === 0) {

			return this.intersectQuadraticCurve_caseBE0( qC,

				a1 * qC.c - qC.a * c1,
				d1 * qC.c - qC.d * c1,
				f1 * qC.c - qC.f * c1,
			fn);
		}

		// Linear combination det[ Q1 + u * (Q2 - Q1) ] = det[ Q1 + u * Q2' ] = 0.

		var	a2 = qC.a - a1, b2 = qC.b - b1, c2 = qC.c - c1,
			d2 = qC.d - d1, e2 = qC.e - e1, f2 = qC.f - f1;

		var	a = a2 * (c2 * f2) + (b2 * d2 * e2 - e2 * e2 * a2 - b2 * b2 * f2 - d2 * d2 * c2) / 4;

		var	b = a1 * (c2 * f2) + a2 * c1 * f2 + a2 * (c2 * f1)
			+ (	b1 * d2 * e2 + b2 * d1 * e2 + b2 * d2 * e1
				- e2 * e2 * a1 - b2 * b2 * f1 - d2 * d2 * c1 ) / 4
			- ( e1 * e2 * a2 + b1 * b2 * f2 + d1 * d2 * c2 ) / 2;

		var	c = a1 * c1 * f2 + a1 * (c2 * f1) + a2 * c1 * f1
			+ ( b1 * d1 * e2 + b1 * d2 * e1 + b2 * d1 * e1
				- e1 * e1 * a2 - b1 * b1 * f2 - d1 * d1 * c2 ) / 4
			- ( e1 * e2 * a1 + b1 * b2 * f1 + d1 * d2 * c1 ) / 2;
		
		var d = this.determinant();

//console.warn(`${a}, ${b}, ${c}, ${det}`);
		var roots = Polynomial.solveCubicReal(a, b, c, d);

		var u = roots[0];

		var curve = this._degenerateLinearCombination.set(

			a1 + u * a2, b1 + u * b2, c1 + u * c2,
			d1 + u * d2, e1 + u * e2, f1 + u * f2
		);


		if (QuadraticCurve.DEBUG_3_DEGENERATE_LINES && roots[1]) {

			console.log(`roots=${roots.join(' ')}`);

			u = roots[1];

			this.getDegenerateLines(new QuadraticCurve().set(
				a1 + u * a2, b1 + u * b2, c1 + u * c2,
				d1 + u * d2, e1 + u * e2, f1 + u * f2
			), new Line2, new Line2);

			u = roots[2];

			this.getDegenerateLines(new QuadraticCurve().set(
				a1 + u * a2, b1 + u * b2, c1 + u * c2,
				d1 + u * d2, e1 + u * e2, f1 + u * f2
			), new Line2, new Line2);
		}


		return this.intersectQuadraticCurve_part2(qC, fn, curve);
	}
*/


	//intersectQuadraticCurve_v1(qC, fn = (x, y) => console.log(x, y)) {
	intersectQuadraticCurve(qC, fn = (x, y) => console.log(x, y)) {

//console.log(`intersectDegenerateCurve im1=${this.isImaginary()} im2=${qC.isImaginary()}`);

		if ( this.isImaginaryOrNone() || qC.isImaginaryOrNone() )
			return;

		// Case. An ellipse w/ semiAxisLen=1e+6, center appeared at Y=0.7e+6,
		// by determinant=1e-8 classified as degenerate.
		// Construction of parallel lines appeared inappropriate:
		// substantially off curve at Y~0..1e+3.

		if (this.isIntersectingLines())
			return qC.intersectDegenerateCurve(this, fn);

		if (qC.isIntersectingLines())
			return this.intersectDegenerateCurve(qC, fn);


		var	a1 = this.a, b1 = this.b, c1 = this.c,
			d1 = this.d, e1 = this.e, f1 = this.f,
			a2 = qC.a, b2 = qC.b, c2 = qC.c,
			d2 = qC.d, e2 = qC.e, f2 = qC.f;

		if (b1 === 0 && b2 === 0 && e1 === 0 && e2 === 0) {
		//if (0) {

			// b: Both curves are axis aligned;
			// e: Both curves are not offset by Y.

			var	a3 = a1 * c2 - a2 * c1,
				d3 = d1 * c2 - d2 * c1,
				f3 = f1 * c2 - f2 * c1;

			return this.intersectQuadraticCurve_caseBE0(qC, a3, d3, f3, fn);
		}


		// Linear combination det(Q1 + u * Q2) = 0.
		//
		// q1 = new QuadraticCurve().set(5, 0, 1, 0,0,-1); q2 = new QuadraticCurve().set(0, 0.1, 1.15, 0.1,0.05,-1.100)
		// q1.intersectQuadraticCurve(q2)
		// roots=14591662792680407000 hyperbola det=1e+39
		//
		// q2 is determined as intersectingLines, detNorm=5.7e-19, center: x=22.499999999999993, y=-1 a/c(after rot.)=0.00188
		// created: intersectingLines detNorm=2.9e-19, center: x=22.5, y=-1.0000000000000002 a/c=3.0e-19

		var	a = a2 * c2 * f2 + (b2 * d2 * e2 - e2 * e2 * a2 - b2 * b2 * f2 - d2 * d2 * c2) / 4;

		var	b = a1 * c2 * f2 + a2 * c1 * f2 + a2 * c2 * f1
			+ (
				b1 * d2 * e2 + b2 * d1 * e2 + b2 * d2 * e1
				- (e2 * e2 * a1 + 2 * e1 * e2 * a2)
				- (b2 * b2 * f1 + 2 * b1 * b2 * f2)
				- (d2 * d2 * c1 + 2 * d1 * d2 * c2)
			) / 4;

		var	c = a1 * c1 * f2 + a1 * c2 * f1 + a2 * c1 * f1
			+ (
				b1 * d1 * e2 + b1 * d2 * e1 + b2 * d1 * e1
				- (2 * e1 * e2 * a1 + e1 * e1 * a2)
				- (2 * b1 * b2 * f1 + b1 * b1 * f2)
				- (2 * d1 * d2 * c1 + d1 * d1 * c2)
			) / 4;

		var det = this.determinant();

//console.warn(`${a}, ${b}, ${c}, ${det}`);
		var roots = Polynomial.solveCubicReal(a, b, c, det);

//console.log("roots v1:", roots.join(" "));
/* this requires rework (TODO)
		var u = this.selectRootForLinearCombination(roots, a1, b1, c1, a2, b2, c2);

		if (u === undefined)
			return Report.warn("No root for linear combination", `${this} ${qC}`);
*/
		var u = roots[0];

		if (QuadraticCurve.DEBUG_3_DEGENERATE_LINES && roots.length > 1) {

			let u = roots[1];

			this.getDegenerateLines( new QuadraticCurve().set(
				a1 + u * a2, b1 + u * b2, c1 + u * c2,
				d1 + u * d2, e1 + u * e2, f1 + u * f2
			), new Line2, new Line2);

			u = roots[2];

			this.getDegenerateLines( new QuadraticCurve().set(
				a1 + u * a2, b1 + u * b2, c1 + u * c2,
				d1 + u * d2, e1 + u * e2, f1 + u * f2
			), new Line2, new Line2);
		}


		var curve = this._degenerateLinearCombination.set(

			a1 + u * a2, b1 + u * b2, c1 + u * c2,
			d1 + u * d2, e1 + u * e2, f1 + u * f2
		);

		return this.intersectQuadraticCurve_part2(qC, fn, curve);
	}


	intersectQuadraticCurve_part2(qC, fn, curve) {

		// TODO consider idea.
		// Create lines of degenerate conics and intersect them.

//console.log(`roots=${roots.join(" ")} | u=${u} t=${curve.getType()}`, curve.clone() );

/*
var l =curve.getSemiAxesLengths();

console.error(`${curve.getType()} det=${curve.determinant().toExponential(0)}`
+ ` detNorm=${curve.detNorm().toExponential(1)} discrNorm=${curve.discrNorm().toExponential(1)}`
+ ` semiAxesLen= ${l.x.toExponential(1) + ", " + l.y.toExponential(1)} center:`, curve.getCenter(), curve.clone());
*/
		if (curve.isImaginary())
			return;

		var	line21 = this._line21,
			line22 = this._line22;

		if (!this.getDegenerateLines(curve, line21, line22))
			return;

		// Next. Intersect created lines w/ both curves.

		var intersectCnt = 0;

		var checkLineVs2Curves = line => {

			var	t1, t2;

			// TODO
			// isn't enough to intersect 1 curve?
			// maybe take less sharp intersection

			line.intersectQuadraticCurve(this, (x, y, t) => {

				if (t1 === undefined)
					t1 = t;
				else
					t2 = t;
			});

			if (t1 === undefined)
				return;

			line.intersectQuadraticCurve(qC, (x, y, t) => {

				// Created segments have unit length.
				if (Math.abs(t - t1) < 1e-6 || t2 !== undefined && Math.abs(t - t2) < 1e-6) {
					fn(x, y);
					intersectCnt ++;
				}
			});
		};

		checkLineVs2Curves(line21);
		checkLineVs2Curves(line22);

		// If linear combination is not imaginary then it must have intersections,
		// unless .halfSgn used.
/*
		if (intersectCnt === 0)
			return Report.warn("no intersections", `degenerate=${curve}`
				+ ` name=${this.name} curve2name=${qC.name}`);
*/
		return true;
	}


	selectRootForLinearCombination(roots, a1, b1, c1, a2, b2, c2) {

		if (roots.length === 1) {

			let u = roots[0];
			if (u === 0)
				return;

			return roots[0];
		}

		var getRatioAC = (a, b, c) => { // TODO not enough

			if (b !== 0) {

				let theta = Math.atan2(b, a - c) / 2,
					cos = Math.cos(theta),
					sin = Math.sin(theta);

				let a1 = a, c1 = c;

				a = a1 * (cos * cos) + b * cos * sin + c1 * (sin * sin),
				c = a1 * (sin * sin) - b * cos * sin + c1 * (cos * cos);
			}

			a = Math.abs(a); c = Math.abs(c);

			return a < c ? a / c : c / a;
		};


		var	ratioAC0 = 1, ratioAC1 = 0;
		var	u0, u1;

		for (let i = 0; i < roots.length; i++) {

			let	u = roots[i];
			if (u === 0) // definitely skip: meaningless
				continue;

			let	ratioAC = getRatioAC(a1 + u * a2, b1 + u * b2, c1 + u * c2);

			if (ratioAC < ratioAC0) {
				ratioAC0 = ratioAC;
				u0 = u;
			}

			if (ratioAC > ratioAC1) {
				ratioAC1 = ratioAC;
				u1 = u;
			}
//console.log(`i=${i} ratioAC=${ratioAC.toExponential(2)} u=${u}`);
		}

		// TODO selection criteria

		if (ratioAC1 > 1e-4)
			return u1;

		return u0;
	}


	intersectDegenerateCurve(qC, fn) {

		var	line21 = this._line21,
			line22 = this._line22;

		if (!this.getDegenerateLines(qC, line21, line22))
			return;
//console.log(`intersectDegenerateCurve ${qC}`);

		var result1 = line21.intersectQuadraticCurve(this, fn);
		var result2 = line22.intersectQuadraticCurve(this, fn);

		return result1 || result2;
	}



	getDegenerateLines(curve, line21, line22) {

		// Task: get lines.
		// For that, create standard form and record transformation matrix.

		var	stdForm = this._degenerateStandardForm,
			mat3 = this._matrix3;

		curve.setDegenerateStandardFormAndTransform(stdForm, mat3);

		// Case. 2 ellipses not intersecting on the display.
		// linear combination a=3e-7,c=3e-7,f=-230 detNorm=-1e-18 discrNorm=-6e-18 KNorm=1e-8
		// was classified as "parallelLines". stdForm (.c removed) is determined to be imaginary.

		if (stdForm.isImaginary()) {
			//Report.warn("getDegenerateLines: found to be imaginary", `${curve} ${stdForm}`);
			return;
		}

		if (!stdForm.isLines())
			return Report.warn("degenerate stdForm !isLines", `${curve} ${stdForm}`);

		var c = stdForm.getCenter();
		if (c.x === c.x && Math.abs(c.x > 1e+4) || c.y === c.y && Math.abs(c.y > 1e+4) )
			Report.warn("degenerate off-center", `x=${c.x.toExponential(1)} y=${c.y.toExponential(1)}`);


		if (stdForm.getType() == "parallelLines") { // vertical ax^2 + 1 = 0; horizontal cy^2 + 1 = 0

			if (stdForm.c > 0 || stdForm.a > 0)
				return Report.warn("bad parallelLines", `${curve}`);

			let dirX = 0, offX = 0, offY = 0;

			if (stdForm.c < stdForm.a) { // horizontal
				dirX = 1;
				offY = Math.sqrt(-1 / stdForm.c);

			} else
				offX = Math.sqrt(-1 / stdForm.a);

			let dirY = 1 - dirX;

			line21.set(offX, offY, dirX + offX, dirY + offY);
			line22.set(-offX, -offY, dirX - offX, dirY - offY);


		} else { // "intersectingLines" ax^2 + cy^2 = 0 (diff.signs a,c)

			if (Math.sign(stdForm.c) * Math.sign(stdForm.a) !== -1)
				return Report.warn("bad intersectingLines", `${curve}`);

			let slope = Math.sqrt(-stdForm.c / stdForm.a);

			line21.set(0, 0, slope, 1);
			line21.p2.normalize();

			line22.set(0, 0, -line21.p2.x, line21.p2.y);
		}


		line21.applyMatrix3(mat3);
		line22.applyMatrix3(mat3);

		//console.log(line21.clone(), line22.clone(), Array.from(mat3.elements) );

		var showFn = QuadraticCurve.SHOW_DEGENERATE_LINES_FN;

		showFn && showFn(line21, line22, curve);

		return true;
	}


	setDegenerateStandardFormAndTransform(stdForm, matrix3) {

		// This is meant for curves created as degenerate ones,
		// such as linear combination w/ det=0.

		stdForm.setCoefficients(this.a, this.b, this.c, this.d, this.e, this.f);

		if (!stdForm.isLines())
			return Report.warn("not lines", `${stdForm}`);

		var rotation = stdForm.rotateAxes();
		var x = 0, y = 0;

		var a = stdForm.a, c = stdForm.c, d = stdForm.d, e = stdForm.e, f = stdForm.f;
//console.warn(`after rotation a=${a}, c=${c}, d=${d}, e=${e}, f=${f}`);

		var isParallelLines = stdForm.getType() == "parallelLines";

		if (isParallelLines) { // Remove offset and quadratic factor along major axis.

			if (Math.abs(a) < Math.abs(c)) { // horizontal cy^2 + 1 = 0
				a = 0; d = 0;

			} else {
				c = 0; e = 0;
			}
//console.warn(`isParallelLines major-axis a=${a}, c=${c}, d=${d}, e=${e}, f=${f}`);
		}

		if (e !== 0) { // a,c != 0

			console.assert(c !== 0);
			f -= e * e / (4 * c);
			y = e / (2 * c);
//console.warn(`e->0 f=${f} y=${y}`);
		}

		if (d !== 0) { // "Completing the square" x = x - d / (2 * a)

			console.assert(a !== 0);
			f -= d * d / (4 * a);
			x = d / (2 * a);
//console.warn(`d->0 f=${f} x=${x}`);
		}

		if (isParallelLines) {

			if (Math.abs(f) < 1e-15)
				Report.warn("coincident lines", `${stdForm}`);

			a /= f; c /= f;
			f = 1;

		} else { // intersectingLines
			f = 0;
		}

		var cos = rotation.x, sin = rotation.y;

		if (matrix3) {

			let	xc = y * sin - x * cos,
				yc = -x * sin - y * cos;

			matrix3.set( // std.form -> pt.on plane
				cos, -sin, xc,
				sin, cos, yc,
				0, 0, 1
			);

			let D = 1e+5;

			if (Math.abs(xc) > D || Math.abs(yc) > D)
				Report.warn("extreme off-center", `x=${xc.toExponential(1)} y=${yc.toExponential(1)}`);
		}

		stdForm.setCoefficients(a, 0, c, 0, 0, f);

		return true;
	}


	// Perform rotation of axes "in place";
	// Return cos,sin of rotation angle in a static Point.

	rotateAxes(rotation = this._rotateAxes) {

		var	a = this.a, b = this.b, c = this.c,
			d = this.d, e = this.e, f = this.f,
			cos = 1, sin = 0;

		if (b !== 0) {

			let	theta = Math.atan2(b, a - c) / 2;

			cos = Math.cos(theta), // Max.angle is +/- PI/2.
			sin = Math.sin(theta);

			let	a1 = a * (cos * cos) + b * cos * sin + c * (sin * sin),
				c1 = a * (sin * sin) - b * cos * sin + c * (cos * cos),
				d1 = d * cos + e * sin,
				e1 = -d * sin + e * cos;

			a = a1; b = 0; c = c1; d = d1; e = e1;

			this.setCoefficients(a, b, c, d, e, f);
		}
/*
		if (c === 0) { // We need c != 0. Rotate by 90deg. TODO review
console.error(`interchangedXY`); // dummyF_inclined: E+H, edge intersect <-- incorrect
			//[ a, c, d, e, cos, sin ] = [ c, a, e, -d, sin, -cos ];
			[ a, c, d, e, cos, sin ] = [ c, a, e, d, sin, -cos ]; // dummyF_inclined: E+H, edge intersect <-- OK!

			this.setCoefficients(a, b, c, d, e, f);
		}
*/
		return rotation.set(cos, sin);
	}



	intersectQuadraticCurve_caseBE0(qC, a3, d3, f3, fn) {

		var roots = Polynomial.solveQuadraticEqn(a3, d3, f3);

		if (!roots)
			return;

		var	x1 = roots.x1,
			x2 = roots.x2;

		var processX = (x) => {

			var var1 = -( (this.a * x + this.d) * x + this.f ) / this.c;

			if (var1 < 0)
				return;

			var y = Math.sqrt(var1);

			qC.contains(x, y) && fn(x, y);
			qC.contains(x, -y) && fn(x, -y);
		};

		processX(x1);
		processX(x2);
	}


	// =================================
	//
	//     DEBUG
	//
	// =================================

	static showDottedLine(line2, planeToWorldMatrix, matName = "green",
			segmentLen = 0.2, dutyCycle = 0.35, setLen = 1000) {

		if (setLen) {

			let line2b = new Line2().copy(line2).setDistance(setLen / 2)
				.swapPoints().setDistance(setLen).swapPoints();

			return this.showDottedLine(line2b, planeToWorldMatrix, matName,
				segmentLen, dutyCycle, null);
		}

		var	v = line2.p2.clone().sub(line2.p1).normalize();
		var nSegments = Math.ceil( line2.distance() / (segmentLen / dutyCycle) );

		var fullSegmentLen = line2.distance() / nSegments;
		var effectSegmentLen = fullSegmentLen * dutyCycle;
		var pos = [];

		for (let i = 0; i < nSegments; i++) {

			let	x = line2.p1.x + v.x * fullSegmentLen * i,
				y = line2.p1.y + v.y * fullSegmentLen * i;

			pos.push( x, y, 0,  x + v.x * effectSegmentLen, y + v.y * effectSegmentLen, 0 );
		}

		var geometry = new LineSegmentsGeometry().setPositions(pos);

		planeToWorldMatrix && geometry.applyMatrix4(planeToWorldMatrix);

		var mesh = new THREE.Mesh(geometry, Assets.materials.line[matName]);

		mesh.name = `showDottedLine ${line2}`;
		scene.add(mesh);
	}


	static showLine(line2, planeToWorldMatrix, matName = "grey") {

		var pos = [];
		Line2.addToPlanarGeometry( line2.p1, line2.p2.clone().sub(line2.p1), pos );

		var g = new LineSegmentsGeometry().setPositions(pos);
		g.applyMatrix4(planeToWorldMatrix);

		var mesh = new THREE.Mesh(g, Assets.materials.line[matName]);

		mesh.name = `showLine ${line2}`;
		scene.add(mesh);
	}


	showConjugateAxis(planeToWorldMatrix, matName = "green") {

		QuadraticCurve.showLine(

			this._conjugateAxis.getLine2(),//.extend2Ends(1e3),
			planeToWorldMatrix,
			matName
		);

		return this;
	}


	show(planeToWorldMatrix, matName = "green") {

		if ( this.isImaginaryOrNone() )
			return;

		console.assert(planeToWorldMatrix && (planeToWorldMatrix instanceof THREE.Matrix4));

		var mesh = this._showData.get(this);
		if (mesh) {
			scene.remove(mesh);
			this._showData.delete(this);

		} else {
			var g = this.getShowGeometry(planeToWorldMatrix);
			var mesh = new THREE.Mesh(g, Assets.materials.line[matName]);

			// no - THREE inverts scale when det < 0
			//if (planeToWorld)
			//	mesh.position.applyMatrix4(planeToWorld);

			mesh.name = `${this}`;
			scene.add(mesh);
			this._showData.set(this, mesh);
		}

		return this;
	}


	getShowGeometry(planeToWorldMatrix) {

		var position = this._getPositionAnyType();
/*
		var position;

		if (this.type == "parallelLines") {

			position = this._getPositionLines();

		} else if (this.type == "ellipse") {

			position = this._getPositionEllipse();

		} else if (this.type == "hyperbola") {

			position = this._getPositionHyperbola();

		} else {
			Report.warn("create geometry: not implemented", this);
			position = [];
		}
*/
		var g = new LineSegmentsGeometry().setPositions(position);

		if (planeToWorldMatrix)
			g.applyMatrix4(planeToWorldMatrix);

		g.name = `${this.getType()} center=${this.getCenter()}`;
		return g;
	}


	_getPositionAnyType() { // Q & D

		var	D_MAX = 1e9,
			N_SEGMENTS = 5000;

		if (this.getType() == "hyperbola")
			N_SEGMENTS = 50000;

		var pos = [];

		var c = this.getCenter();

		var segment = new Line2().set(c.x, c.y);
		var x1, y1;

		for (let i = 0; i <= N_SEGMENTS; i++) {

			let	t = 2 * Math.PI / N_SEGMENTS * i;
			let x2, y2;

			segment.p2.set(c.x + D_MAX * Math.cos(t), c.y + D_MAX * Math.sin(t) );

			let haveIntersect = false;

			segment.intersectQuadraticCurve(this, (x, y, t, inOut) => {
				x2 = x;
				y2 = y;
				haveIntersect = true;
			}, true);

			if (!haveIntersect) {
				x1 = undefined;
				continue;
			}

			if (x1 !== undefined)
				pos.push(x1, y1, 0, x2, y2, 0);

			x1 = x2;
			y1 = y2;
		}

		//Line2.addToPlanarGeometry( Point.pAt00, new Point(1, 0), pos );

		return pos;
	}

/*
	_getPositionEllipse() {

		var N_SEGMENTS = 500;

		var pos = [];

		var	r = this.getSemiAxesLengths(), // only for approx. N_SEGMENTS
			c = this.getCenter();

		var rSum = r.x + r.y;

		N_SEGMENTS *=
			rSum > 1e5 ? 15 :
			rSum > 3e4 ? 7 :
			rSum > 1e4 ? 3 : 1;

		var segment = new Line2().set(c.x, c.y);
		var x1, y1;

		for (let i = 0; i <= N_SEGMENTS; i++) {

			let	t = 2 * Math.PI / N_SEGMENTS * i;
			let x2, y2;

			segment.p2.set(c.x + Math.cos(t) * 1e9, c.y + Math.sin(t) * 1e9);

			segment.intersectQuadraticCurve(this, (t, inOut, x, y) => {
				x2 = x;
				y2 = y;
			});

			if (i !== 0)
				pos.push(x1, y1, 0, x2, y2, 0);

			x1 = x2;
			y1 = y2;
		}


		var	x1 = c.x + r.x, // t==0
			y1 = c.y;

		for (let i = 1; i <= N_SEGMENTS; i++) {

			let	t = 2 * Math.PI / N_SEGMENTS * i,
				x2 = r.x * Math.cos(t) + c.x,
				y2 = r.y * Math.sin(t) + c.y;

			pos.push(x1, y1, 0, x2, y2, 0);

			x1 = x2;
			y1 = y2;
		}

		return pos;
	}


	_getPositionHyperbola(type) {

		if (this.b !== 0) {
			Report.warn("hyperbola b!=0: not supported");
			return [];
		}

		console.assert(this._standardForm.a < 0); // horizontal

		var	c = this.getCenter(),
			r = this.getSemiAxesLengthsStandardForm();

		var pos = [];

		if (this.halfSgn >= 0)
			this._addPositionHyperbolaBranch(1, c, r, pos);

		if (this.halfSgn <= 0)
			this._addPositionHyperbolaBranch(-1, c, r, pos);

		//Line2.addToPlanarGeometry( c, this.getAsymptoteV(), pos );
		return pos;
	}


	_addPositionHyperbolaBranch(branchSgn, c, r, pos) {

		var	N_SEGMENTS = 5000;

		var rMax = Math.max(r.x, r.y);

		var	T_MAX =
			rMax > 1e5 ? 0.1 :
			rMax > 1e4 ? 0.5 :
			rMax > 1e3 ? 2 :
			rMax > 1 ? 7 :
			rMax > 0.01 ? 12 : 20;

		var	x1 = c.x + r.x * branchSgn * Math.cosh(-T_MAX), // t==0
			y1 = c.y + r.y * Math.sinh(-T_MAX);

		for (let i = 1; i < N_SEGMENTS; i++) {

			let	t = -T_MAX + 2 * T_MAX / N_SEGMENTS * i,
				x2 = r.x * branchSgn * Math.cosh(t) + c.x,
				y2 = r.y * Math.sinh(t) + c.y;

			pos.push(x1, y1, 0, x2, y2, 0);

			x1 = x2;
			y1 = y2;
		}
	}


	_getPositionLines() {

		if (this.c === 0)
			Report.warn("parallelLines c=0: not supported");

		if (this.b !== 0)
			Report.warn("parallelLines b!=0: not supported");

		var r = this.getSemiAxesLengthsStandardForm().y;
		var pos = [];

		Line2.addToPlanarGeometry( new Point(0, -r), new Point(1, 0), pos );
		Line2.addToPlanarGeometry( new Point(0, r), new Point(1, 0), pos );

		return pos;
	}
*/

	get _degenerateLinearCombination() {

		return QuadraticCurve._degenerateLinearCombination || (
			QuadraticCurve._degenerateLinearCombination
				= new QuadraticCurve().setName("_degenerateLinearCombination")
		);
	}

	get _degenerateStandardForm() {

		return QuadraticCurve._degenerateStandardForm || (
			QuadraticCurve._degenerateStandardForm
				= new QuadraticCurve().setName("_degenerateStandardForm")
		);
	}

}


Object.assign(QuadraticCurve, {

	_tmpCenter: new Point,
	_degenerateLinearCombination: null,
	_degenerateStandardForm: null,

	SHOW_DEGENERATE_LINES_FN: null,
	DEBUG_3_DEGENERATE_LINES: false,

	Epsilon: 1e-12,
	EpsilonSq: 1e-20,

	Types: [ "imaginary", "parabola", "parallelLines", "line2",
		"ellipse", "hyperbola", "point", "intersectingLines" ],
});


Object.assign(QuadraticCurve.prototype, {

	_gradientV: new Point,
	_directionIncrV: new Point,

	_tmpV: new THREE.Vector3,
	_tmpV2: new THREE.Vector3,
	_p: new Point,

	//_degenerateLinearCombination: new QuadraticCurve().setName("_degenerateLinearCombination"),
	//_degenerateStandardForm: new QuadraticCurve().setName("_degenerateStandardForm"),

	_matrix3: new THREE.Matrix3,
	_line21: new Line2,
	_line22: new Line2,

	_rotateAxes: new Point,

	_showData: new Map,
});




export { QuadraticCurve };

