
class CoatedHyperEllipseBase {

	constructor(n, a = 1, b = 1, r1 = 0) {

		this.n = n;
		this.a = a;
		this.b = b;
		this.r1 = r1;

		console.assert(typeof r1 == 'number');

		this.hE = new HyperEllipseBase(n, a, b);

		var n = this.hE.corner.n;
		var p = this.hE.corner.p.clone().addScaled( this.hE.corner.n, r1 );

		this.corner = {
			p, n,
			d: p.length(),
			tangentC: -p.dot(n),
		};

		this._approx = null;

		//if (n > 7 || a / b > 7 || b / a > 7)
		//	Report.warn("cHE approximation works good w/ n < 7 && a-b ratio < 7", `have n=${n}, a=${a} b=${b}`);

		this._curveLengthData = {};
	}

	get r() { Report.warn(".r1 ?"); }


	toString() {
		return `[ CoatedHyperEllipseBase(${this.n}, ${this.a}, ${this.b}, ${this.r1}) ]`;
	}


	getApprox() {

		return this._approx || (this._approx = new CurveApproximation4X(
				null,
				{
					name: `${this}`,
					fnGetPointByAngle: a => this.getPointByCentralAngle(a),
					fnGetNormalAngleInPoint: p => this.getNormalAngleInPoint(p),
					fnClosestPoint: p => this.getClosestPoint(p),
				}
			).setupEquidistant()
		);

	}


	getCurveLengthData(targetRelError = 1e-10, nDerivatives = 7) {

		var id = targetRelError + '--' + nDerivatives;

		if (this._curveLengthData[id])
			return this._curveLengthData[id];

		var havePoles = !Number.isInteger(this.n); // *no poles at high enough n

		var arg = {

			nDerivatives,
			targetRelError,
		};

		var midPointT = this.hE.getAngleByNormalAngle(Math.PI / 4);

		Object.assign( arg, {

			name: `${this} TRIG-${id} (${nDerivatives}/${targetRelError})`,
			intervals: [
				{ start: 0, end: Math.PI / 2, singularities: {
					list: !havePoles ? [] : [ 0, Math.PI / 2 ],
					//method: { name: 'interpolate', points: 3 }, // same error prob.
					method: { name: 'fourier', N: 3 },
					//method: { name: 'reduceTaylorTerms', N: Math.floor(this.n) },
				} },
			],
			lengthUpperBound: this.a + this.b + 2 * this.r1,
			midPointT,
			midPoint: this.getPointByInnerAngle(midPointT).clone(),
			fn_getPointByParameter: t => this.getPointByInnerAngle(t),

			fn_getIntervalError_L_t: (...args) => this.getIntervalError_L_t(...args),
			fn_getPolynomial_L_t: (...args) => this.getPolynomial_L_t(...args),
			//fn_getPolynomial_theta_t: (...args) => this.getPolynomial_theta_t(...args),
			fn_getIntervalPolynomials: (...args) => this.getIntervalPolynomials(...args),

			//fn_getPointAndNormalByInnerAngle: (t) => this.getPointAndNormalByInnerAngle(t),
			fn_integrateLength: (...args) => this.integrateLength(...args),

			fn_getParameterByNormalAngle: a => this.hE.getAngleByNormalAngle(a),
		});

		return ( this._curveLengthData[id] = new DifferentiableCurve_4X(arg) );
	}


	getCurveLengthData_GPU() { return this.getCurveLengthData(2e-6, 7) }

	getCurveLength() { return 4 * this.getCurveLengthData().totalLen }


	lengthLowerBound() {
		return this.corner.p.distanceTo(this.a + this.r1, 0)
			+ this.corner.p.distanceTo(0, this.b + this.r1);
	}

	getLength() { return 4 * this.getApprox().getLength() }

	maxRadius() { return this.r1 + Util.hypot(this.a, this.b) } // TODO? compute

	minRadius() { return this.r1 + Math.min(this.a, this.b) }


	getPointAndNormalByInnerAngle(theta) {

		var data = this.hE.getPointAndNormal(theta);

		data.p.addScaled( data.n, this.r1 );

		return data;
	}


	getPointByInnerAngle(theta) { return this.getPointAndNormalByInnerAngle(theta).p }


	getPointByCentralAngle(a) {

		var start = Angle.quadMin(a), end = start + Math.PI / 2;
		var p;

		NumericMethod.regulaFalsi(start, end, theta => {

			p = this.getPointByInnerAngle(theta);

			return p.angle() - a;

		}, 'CHE-GetPoint');

		return p;
	}


	getNormalAngleInPoint(p) {

		var theta = this.getInnerAngleByCentralAngle( p.angle() );

		return this.hE.getNormalInPoint( this.hE.getPoint(theta) ).angle();
	}


	getInnerAngleByCentralAngle(a) {

		var perpV = this._getTmpP1().set( Math.sin(a), -Math.cos(a) );
		var start = Angle.quadMin(a), end = start + Math.PI / 2;

		return NumericMethod.regulaFalsi(start, end, theta => {

			return this.getPointByInnerAngle(theta).dot(perpV);

		}, 'CHE-InnerAngleByCentralAngle');
	}


	distanceToPoint(p) { return this.hE.distanceToPoint(p) - this.r1 }


	getClosestPoint(p) {

		var data = this.hE.getClosestPointData(p);

		return data.p.addScaled( data.n.normalize(), this.r1 );
	}


	getPointByNormalAngle(a) {

		var p = this.hE.getPointByNormalAngle(a);

		return p.addComponents( this.r1 * Math.cos(a), this.r1 * Math.sin(a) );
	}


	integrateLength(t0, t1) {

		return NumericMethod.integrateAdaptiveSimpson(t0, t1, t => {

			return this.getLengthDerivative(t);

		}, 'CHE-integrateLength',
			{ debug: 1, eps: 1e-10, levelMax: 50 }
		);
	}


	//getLengthDerivative(t) { return this.getPolynomial_L_t(1, t)[1] }

	getLengthDerivative(t) {

		var n = this.n, an = this.hE.an, bn = this.hE.bn;

		var cos = Math.cos(t), sin = Math.sin(t);
		var cos_n_2_an = cos **(n - 2) / an, sin_n_2_bn = sin **(n - 2) / bn;
		var cos_n_1_an = cos * cos_n_2_an, sin_n_1_bn = sin * sin_n_2_bn;

		var r0 = cos * cos_n_1_an + sin * sin_n_1_bn;
		var lenSq = cos_n_1_an * cos_n_1_an + sin_n_1_bn * sin_n_1_bn;

		return r0 **(-1 / n - 1) * Math.sqrt(lenSq)
			+ this.r1 * (n - 1) * cos_n_2_an * sin_n_2_bn / lenSq;
	}


	getPointByLengthIntegration(L) {

		var a = this.getInnerAngleByLengthIntegration(L);

		return this.getPointByInnerAngle(a);
	}


	getInnerAngleByLengthIntegration(L, t1 = 0, t2Max = Math.PI / 2) {

		return NumericMethod.NewtonRaphsonHardened(t1, t2Max, (t1 + t2Max) / 2, (t) => {

			return {
				result: -L + NumericMethod.integrateLength(t1, t,
					t => this.getLengthDerivative(t), 'InnerAngleByLength',
					{ eps: 1e-12, levelMax: 30 }),

				derivative: this.getLengthDerivative(t),
			}

		}, 'CHE-getInnerAngleByLengthIntegration', {
			debug: 1,
		});
	}


	getSlopeData(tArray) {

		var result = [];

		tArray.forEach(t => {

			var n = this.getPointAndNormalByInnerAngle(t).n.perp();

			if (Math.abs(n.x) > Math.abs(n.y))
				result.push('y/x', n.y / n.x, t);
			else
				result.push('x/y', n.x / n.y, t);
		});

		return result;
	}


	// ==================================================================
/*
	getPolynomial_theta_t(N, t0) {

		var p = CoatedHyperEllipseBase._polynomial_theta_t[ N ] || (
				CoatedHyperEllipseBase._polynomial_theta_t[ N ] = {

			cos: new Polynomial(N + 1),
			sin: new Polynomial(N + 1),
			cos_n_1: new Polynomial(N + 1),
			sin_n_1: new Polynomial(N + 1),
			r: new Polynomial(N + 1),
			r1_len_1: new Polynomial(N + 1),
			x: new Polynomial(N + 1),
			y: new Polynomial(N + 1),

			theta: new Polynomial(N + 1)
		});

		p.cos.setDerivatives_cos( t0 );
		p.sin.setDerivatives_sin( t0 );

		p.cos_n_1.derivativesPow( p.cos, this.n - 1, 1 / this.hE.an );
		p.sin_n_1.derivativesPow( p.sin, this.n - 1, 1 / this.hE.bn );

		p.r.setDerivatives_product( p.cos, p.cos_n_1 )
			.addDerivatives_product( p.sin, p.sin_n_1 )
			.derivativesPow( -1 / this.n );

		p.r1_len_1.setDerivatives_product( p.cos_n_1, p.cos_n_1 )
			.addDerivatives_product( p.sin_n_1, p.sin_n_1 )
			.derivativesPow( -1/2, this.r1 );

		p.x.setDerivatives_product( p.cos, p.r )
			.addDerivatives_product( p.cos_n_1, p.r1_len_1 );
		p.y.setDerivatives_product( p.sin, p.r )
			.addDerivatives_product( p.sin_n_1, p.r1_len_1 );

		p.theta.derivativesPow( p.x, -1 ).multiplyDerivatives( p.y )
			.derivativesAtan()
			.applyTaylorFactorials();

		return p.theta;
	}
*/

	getIntervalError_L_t(N, tStart, tEnd) {

		console.assert(tStart <= tEnd);

		var p = CoatedHyperEllipseBase._intervalError_L_t[ N ] || (
				CoatedHyperEllipseBase._intervalError_L_t[ N ] = {

			tmp: new IntervalPolynomial(N),

			cos: new IntervalPolynomial(N),
			sin: new IntervalPolynomial(N),
			cos_n_2: new IntervalPolynomial(N),
			sin_n_2: new IntervalPolynomial(N),
			cos_n: new IntervalPolynomial(N),
			sin_n: new IntervalPolynomial(N),
			r0_1_n_1: new IntervalPolynomial(N),
			lenSq: new IntervalPolynomial(N),

			L_t: new IntervalPolynomial(N + 1),
		});

		var n = this.n, an = this.hE.an, bn = this.hE.bn;

		p.cos.setDerivatives_cos( tStart, tEnd );
		p.sin.setDerivatives_sin( tStart, tEnd );

		p.cos_n_2.derivativesPow( p.cos, n - 2, 1 / an );
		p.sin_n_2.derivativesPow( p.sin, n - 2, 1 / bn );

		p.cos_n.setDerivatives_product( p.cos_n_2, p.cos ).multiplyDerivatives( p.cos );
		p.sin_n.setDerivatives_product( p.sin_n_2, p.sin ).multiplyDerivatives( p.sin );

		p.r0_1_n_1.setSum( p.cos_n, p.sin_n ).derivativesPow(-1 / n - 1);
		p.lenSq.setDerivatives_product( p.cos_n_2, p.cos_n )
			.addDerivatives_product( p.sin_n_2, p.sin_n );

		p.tmp.derivativesPow( p.lenSq, -1 )
			.multiplyDerivatives( p.cos_n_2 )
			.multiplyDerivatives( p.sin_n_2 )
			.multiplyScalar( this.r1 * (n - 1) )
			.addDerivatives_product( p.r0_1_n_1, p.lenSq.derivativesPow(1/2) );

		p.L_t.copyShiftRight( p.tmp ).applyTaylorFactorials();

		if ( !p.L_t.every(int => int.a <= int.b) )
			console.error("bad IntervalError_L_t", p.L_t.clone());

		return p.L_t;
	}

	// cHE = new CoatedHyperEllipseBase(3,1,1,0.5); cHE.getCurveLengthData().totalLen - 2.4716464484
	// cHE = new CoatedHyperEllipseBase(10,1,1,9); cHE.getCurveLengthData().totalLen - 16.031519020467
	// cHE = new CoatedHyperEllipseBase(2,10,0.1,0.01); cHE.getCurveLengthData().totalLen - 10.018453787573

	getPolynomial_L_t(N, t0) {

		// N: number of derivatives. In L(t), derivatives start at index 0.

		var p = CoatedHyperEllipseBase._polynomial_L_t_Data_trig[ N ] || (
				CoatedHyperEllipseBase._polynomial_L_t_Data_trig[ N ] = {

			tmp: new Polynomial(N),

			cos: new Polynomial(N),
			sin: new Polynomial(N),
			cos_n_2: new Polynomial(N),
			sin_n_2: new Polynomial(N),
			cos_n: new Polynomial(N),
			sin_n: new Polynomial(N),
			r0_1_n_1: new Polynomial(N),
			lenSq: new Polynomial(N),

			L_t: new Polynomial(N + 1),
		});

		var n = this.n, an = this.hE.an, bn = this.hE.bn;

		p.cos.setDerivatives_cos( t0 );
		p.sin.setDerivatives_sin( t0 );

		p.cos_n_2.derivativesPow( p.cos, n - 2, 1 / an );
		p.sin_n_2.derivativesPow( p.sin, n - 2, 1 / bn );

		p.cos_n.setDerivatives_product( p.cos_n_2, p.cos ).multiplyDerivatives( p.cos );
		p.sin_n.setDerivatives_product( p.sin_n_2, p.sin ).multiplyDerivatives( p.sin );

		p.r0_1_n_1.setSum( p.cos_n, p.sin_n ).derivativesPow(-1 / n - 1);
		p.lenSq.setDerivatives_product( p.cos_n_2, p.cos_n )
			.addDerivatives_product( p.sin_n_2, p.sin_n );

		p.tmp.derivativesPow( p.lenSq, -1 )
			.multiplyDerivatives( p.cos_n_2 )
			.multiplyDerivatives( p.sin_n_2 )
			.multiplyScalar( this.r1 * (n - 1) )
			.addDerivatives_product( p.r0_1_n_1, p.lenSq.derivativesPow(1/2) );

		p.L_t.copyShiftRight( p.tmp ).applyTaylorFactorials();

		return p.L_t;
	}


	getIntervalPolynomials(polynomial_t_L) {

		var N = polynomial_t_L.length - 1;

		var p = CoatedHyperEllipseBase._intervalPolynomials_Data_trig[ N ] || (
				CoatedHyperEllipseBase._intervalPolynomials_Data_trig[ N ] = {

			t_L: new Polynomial(N + 1),

			cos_t: new Polynomial(N + 1),
			sin_t: new Polynomial(N + 1),
			cos_n_1: new Polynomial(N + 1),
			sin_n_1: new Polynomial(N + 1),
			r: new Polynomial(N + 1),
			len_1: new Polynomial(N + 1),

			x_L: new Polynomial(N + 1),
			y_L: new Polynomial(N + 1),
			nx_L: new Polynomial(N + 1),
			ny_L: new Polynomial(N + 1),
		});

		polynomial_t_L = p.t_L.copy( polynomial_t_L ).rollbackTaylorFactorials();

		var t0 = polynomial_t_L[0];

		var n = this.n, an = this.hE.an, bn = this.hE.bn;

		p.cos_t.setDerivatives_cos( t0 );
		p.sin_t.setDerivatives_sin( t0 );

		p.cos_t.setChainedDerivatives( p.cos_t, polynomial_t_L );
		p.sin_t.setChainedDerivatives( p.sin_t, polynomial_t_L );

		p.cos_n_1.derivativesPow( p.cos_t, n - 1, 1 / an );
		p.sin_n_1.derivativesPow( p.sin_t, n - 1, 1 / bn );

		p.r.setDerivatives_product( p.cos_t, p.cos_n_1 )
			.addDerivatives_product( p.sin_t, p.sin_n_1 )
			.derivativesPow( -1 / n );

		p.len_1.setDerivatives_product( p.cos_n_1, p.cos_n_1 )
			.addDerivatives_product( p.sin_n_1, p.sin_n_1 )
			.derivativesPow( -1/2 );

		p.nx_L.setDerivatives_product(p.len_1, p.cos_n_1);
		p.ny_L.setDerivatives_product(p.len_1, p.sin_n_1);

		p.x_L.setDerivatives_product( p.r, p.cos_t ).addScaled( p.nx_L, this.r1 );
		p.y_L.setDerivatives_product( p.r, p.sin_t ).addScaled( p.ny_L, this.r1 );

		p.x_L.applyTaylorFactorials();
		p.y_L.applyTaylorFactorials();
		p.nx_L.applyTaylorFactorials();
		p.ny_L.applyTaylorFactorials();

		return p;
	}



	// ===========================================================
/*
		var n = this.n, an = this.hE.an, bn = this.hE.bn;
		var	cos = t === Math.PI / 2 ? 0 : Math.cos(t), sin = Math.sin(t);
		var cos_n_2 = Math.pow(cos, n - 2), sin_n_2 = Math.pow(sin, n - 2);


var('t','n','x','y','r_1')
var('t','n','r','len')
r = (cos(t)^n+sin(t)^n)^(-1/n); len = sqrt(cos(t)^(2*n-2)+sin(t)^(2*n-2))
var('r_1','x_1','y_1','x_2','y_2','dist')
x_1 = r*cos(t)+r_1/len*cos(t)^(n-1); y_1 = r*sin(t)+r_1/len*sin(t)^(n-1)
dist = sqrt((x_1-x_2)^2+(y_1-y_2)^2)
f = ( x_1*cos(t)^(n-1) + y_1*sin(t)^(n-1) - x_2*cos(t)^(n-1) - y_2*sin(t)^(n-1) )/(len * dist)
e = f.differentiate(t,1).simplify()
var('lenSq','r_0','len_d','expr_0')
e = e.subs( cos(t)^(2*n - 2) + sin(t)^(2*n - 2) == lenSq ).subs( cos(t)^n + sin(t)^n == r_0 )
e = e.subs( ((n - 1)*sin(t)^(2*n - 3)*cos(t) - (n - 1)*cos(t)^(2*n - 3)*sin(t)) == len_d )
e = e.subs( (n*sin(t)^(n - 1)*cos(t) - n*cos(t)^(n - 1)*sin(t)) == expr_0 )
e

*/

	_fnTangentPoint(t, p, result = CoatedHyperEllipseBase._fnTangentPointResult) {

		var N = 2;

		var data = CoatedHyperEllipseBase._fnTangentPoint_data || (
				CoatedHyperEllipseBase._fnTangentPoint_data = {

			tmp: new Polynomial(N),

			cos: new Polynomial(N),
			sin: new Polynomial(N),
			cos_n_1: new Polynomial(N),
			sin_n_1: new Polynomial(N),

			r0: new Polynomial(N),
			r: new Polynomial(N),
			len_1: new Polynomial(N),

			x1: new Polynomial(N),
			y1: new Polynomial(N),
			dist_1: new Polynomial(N),

			result: new Polynomial(N),
		});

		var n = this.n, an = this.hE.an, bn = this.hE.bn;

		data.cos.setDerivatives_cos( t );
		data.sin.setDerivatives_sin( t );
		data.cos_n_1.derivativesPow( data.cos, n - 1, 1 / an );
		data.sin_n_1.derivativesPow( data.sin, n - 1, 1 / bn );

		data.r0.setDerivatives_product( data.cos_n_1, data.cos )
			.addDerivatives_product( data.sin_n_1, data.sin );
		data.r.derivativesPow( data.r0, -1 / n );

		data.len_1.setDerivatives_product( data.cos_n_1, data.cos_n_1 )
			.addDerivatives_product( data.sin_n_1, data.sin_n_1 )
			.derivativesPow(-1/2);

		data.result.setDerivatives_product( data.r, data.r0 )
			.addScaled( data.cos_n_1, -p.x )
			.addScaled( data.sin_n_1, -p.y )
			.multiplyDerivatives( data.len_1 );

		data.result[0] += this.r1;

		var r1_len_1 = data.tmp.copyScaled( data.len_1, this.r1 );

		data.x1.setDerivatives_product( data.cos, data.r )
			.addDerivatives_product( r1_len_1, data.cos_n_1 );
		data.y1.setDerivatives_product( data.sin, data.r )
			.addDerivatives_product( r1_len_1, data.sin_n_1 );

		data.x1[0] -= p.x;
		data.y1[0] -= p.y;
		data.dist_1.setDerivatives_product( data.x1, data.x1 )
			.addDerivatives_product( data.y1, data.y1 )
			.derivativesPow(-1/2);

		data.result.multiplyDerivatives( data.dist_1 );

		result.result = data.result[0];
		result.derivative = data.result[1];

		return result;
	}


	getTangentPoint(isCW_sgn, x, y) {

		var t = this.getTangentInnerAngle(isCW_sgn, x, y);

		if (t === undefined)
			return;

		var tP = CoatedHyperEllipseBase._tangentPoint
			|| (CoatedHyperEllipseBase._tangentPoint = new Point);

		return tP.copy( this.getPointByInnerAngle(t) );
	}


	getTangentInnerAngle(isCW_sgn, x, y) {

		var EPSILON = 1e-8; // abs. distance to surface

		var p;

		if (typeof x == 'number') {
			p = CoatedHyperEllipseBase._tangentPointTmp
				|| (CoatedHyperEllipseBase._tangentPointTmp = new Point);
			p.set(x, y);

		} else if (x instanceof Point)
			p = x;

		if (p.x !== p.x || p.y !== p.y || Math.abs(isCW_sgn) !== 1)
			return Report.warn("bad args", `p.x=${p.x} p.y=${p.y} isCW_sgn=${isCW_sgn}`);


		var	w = this.a + this.r1,
			h = this.b + this.r1;

		var inSector3_4, inSector2;
		var effectiveCW = isCW_sgn;

		if (isCW_sgn < 0) {

			if (p.x <= -w || p.y < 0 && p.x < w) {
				p.negate();
				inSector3_4 = true;
			}

			if (p.y > h || p.y > 0 && p.x < 0) {
				p.x = -p.x;
				effectiveCW = -effectiveCW;
				inSector2 = true;
			}

		} else { // isCW_sgn > 0

			if (p.x >= w || p.y < 0 && p.x > -w) {
				p.negate();
				inSector3_4 = true;
			}

			if (p.y < 0 || p.y < h && p.x < 0) {
				p.x = -p.x;
				effectiveCW = -effectiveCW;
				inSector2 = true;
			}
		}


		var start, end, t0;

		var distTangent = this.corner.n.dot(p) + this.corner.tangentC;

		// Outside of the box OR above corner tangent

		if ( !(p.x <= w && p.x >= 0 && p.y <= h && p.y >= 0 && distTangent <= 0) ) {

			if (distTangent > 0 === effectiveCW > 0) {

				let distAxis = Math.abs(p.x - w);

				start = 0;
				end = this.hE.corner.theta;
				t0 = end * distAxis / (Math.abs(distTangent) / 2 + distAxis);

			} else {

				let distAxis = Math.abs(p.y - h);

				start = this.hE.corner.theta;
				end = Math.PI / 2;
				t0 = end - (end - start) * distAxis / (Math.abs(distTangent) / 2 + distAxis);
			}

			//t0 = 0.5 * (start + end);

			// CW < 0, dTangent < 0, p.y > 0, p.x > w and equal area above:
			// approximation isn't so adequate (considering as low prob.)

		} else { // In the box AND below tangent

			// Possibilities:
			// * 2 tangent points within half of PI/2 interval;
			// * p is inside.

			let data = this.hE.getClosestPointData(p);

			data.n.normalize();

			let distSurface = -data.p.sub(p).dot( data.n ) - this.r1;

			if (distSurface <= -EPSILON)
				return;

			if (distSurface <= EPSILON)
				return p.angle(); // inner angle

			if (p.y < this.corner.p.y) {
				start = 0;
				end = this.hE.corner.theta;
	
			} else {
				start = this.hE.corner.theta;
				end = Math.PI / 2;
			}

			if (data.t < start || data.t > end)
				return Report.warn("computed IV is outside interval",
					`t=${data.t} !E [ ${start}, ${end} ]`);

			if (effectiveCW < 0)
				start = data.t;
			else
				end = data.t;

			t0 = 0.5 * (start + end);
		}

		var result = CoatedHyperEllipseBase._fnTangentPointResult;

		var t = NumericMethod.NewtonRaphsonHardened(start, end, t0, (t) => {

			return this._fnTangentPoint(t, p, result);

		}, 'CHE-tangentPoint', {
			debug: 1,
			itersMax: 50,
			epsilonY: 1e-12, epsilonX: 1e-14,
			fnError: id => console.error(`${id} ${this} new Point(${p.x},${p.y})`),
		});

		inSector2 === true && (t = Math.PI - t);
		inSector3_4 === true && (t = Angle.opposite(t));

		return t;
	}



	// ==================================================================

	getTangentPoint_Rotated(a, isCW_sgn, x, y) { // CHE is rotated CCW by angle a.

		var	cos = Math.cos(a), sin = Math.sin(a);
		var xPrime = x * cos + y * sin, yPrime = y * cos - x * sin; // rotate pt. in opposite dir.

		var tP = this.getTangentPoint(isCW_sgn, xPrime, yPrime);

		return tP && tP.set( tP.x * cos - tP.y * sin, tP.y * cos + tP.x * sin );
	}


	getTangentInnerAngle_Rotated(a, isCW_sgn, x, y) {
/*
		var	cos = Math.cos(a), sin = Math.sin(a);
		var xPrime = x * cos + y * sin, yPrime = y * cos - x * sin; // rotate pt. in opposite dir.

		var t = this.getTangentInnerAngle(isCW_sgn, xPrime, yPrime);

console.log(`t=${t} t+a=${t + a}`);

//		return Angle.normalize(t + a);

// WRONG

		var tP = this.getPointByInnerAngle(t).clone();

		tP && tP.set( tP.x * cos - tP.y * sin, tP.y * cos + tP.x * sin );

console.log(`ia=${this.getInnerAngleByCentralAngle(tP.angle())}`);
*/
		var tP = this.getTangentPoint_Rotated(a, isCW_sgn, x, y);

		return tP && this.getInnerAngleByCentralAngle( tP.angle() );
	}



	getLengthByPointOnCurve(p, isCW_sgn = -1) { // Left handed basis (as on paper)

		return this.getCurveLengthData().getLengthByPoint(p, isCW_sgn);
	}


	distanceAlongCurveInDirection(p1, p2, isCW_sgn = -1) {

		var d1 = this.getLengthByPointOnCurve(p1, isCW_sgn);
		var d2 = this.getLengthByPointOnCurve(p2, isCW_sgn);
		var d = d2 - d1;

		return d >= 0 ? d : d + this.getLength();
	}


	getLengthByCentralAngle(a, isCW_sgn = -1) { // Left handed basis (as on paper)

		var p = this.getPointByCentralAngle(a);

		return this.getLengthByPointOnCurve(p, isCW_sgn);
	}




	getPointDataOnCurveByLength(L, isCW_sgn = -1) {

		return this.getApprox().getPointDataByLength4X(L, isCW_sgn);
	}


	normalizeLength(L) {

		console.assert(L >= 0);

		var totalL = this.getLength();

		return L < totalL ? L : L % totalL;
	}


	getPointDataByDistanceOnCurveFromPoint(p1, d, isCW_sgn = -1) {

		console.assert(d >= 0);

		var d1 = this.getLengthByPointOnCurve(p1, isCW_sgn);
		var L = this.normalizeLength(d1 + d);

		return this.getPointDataOnCurveByLength(L, isCW_sgn);
	}


	getPointDataByDistanceOnCurveFromPoint_Rotated(a, p1, d, isCW_sgn = -1) {

		console.assert(p1 instanceof Point);

		var pTmp = this._getTmpP2().copy(p1);
		var	cos = Math.cos(a), sin = Math.sin(a);

		pTmp.set( // rotate pt. in opposite dir. by a
			pTmp.x * cos + pTmp.y * sin,
			pTmp.y * cos - pTmp.x * sin
		);

		var d1 = this.getLengthByPointOnCurve(pTmp, isCW_sgn);
		var L = this.normalizeLength(d1 + d);

		var data = this.getPointDataOnCurveByLength(L, isCW_sgn);

		data.p.set(
			data.p.x * cos - data.p.y * sin,
			data.p.y * cos + data.p.x * sin
		);

		data.derivatives.set(
			data.derivatives.x * cos - data.derivatives.y * sin,
			data.derivatives.y * cos + data.derivatives.x * sin
		);

		return data;
	}


// cHE = new CoatedHyperEllipseBase(3,1,2,0.1); p1 = new Point(1.1,0); p2=new Point(1.7,0.4);
// p = cHE.getPathAlongCurveThenStraightSegment(p1, p2, 2, -1);
// p2=new Point(1.2, 0.5); p = cHE.getPathAlongCurveThenStraightSegment(p1, p2, 6.5, 1)
// ^poor converg.: after 5 iters. ~10X/iteration
//
// cHE = new CoatedHyperEllipseBase(7,1,2,0.1); p1= new Point(-0.04635, 2.1); p2 = new Point(0.1,2.5);
// p = cHE.getPathAlongCurveThenStraightSegment(p1, p2, 2, -1);
//
// cHE = new CoatedHyperEllipseBase(7,1,2,0.1); p1= new Point(1.1,0); p2 = new Point(0.1,2.5);
// p = cHE.getPathAlongCurveThenStraightSegment(p1, p2, 3.365, -1);
/*

	getPathAlongCurveThenStraightSegment(p1, p2, dTotal, isCW_sgn = -1) {

		var dMin = p2.distanceToPoint(p1);

		if (dMin > dTotal)
			return;

		var LCurve = this.getLength();

		if (LCurve + dMin <= dTotal)
			return;

		var approx = this.getApprox();
		var data;
		var result = CoatedHyperEllipseBase._pathAlongCurveResult;

		var lengthOnCurve = NumericMethod.NewtonRaphsonHardened(0, LCurve, 0.5 * LCurve, L => {

			data = this.getPointDataByDistanceOnCurveFromPoint(p1, L, isCW_sgn);
			// TODO ^simplification: loop invariable length to p1

			var distance_p2_p = p2.distanceToPoint( data.p );

			result.result = L + distance_p2_p - dTotal;

			result.derivative = (
				(data.p.x - p2.x) * data.derivatives.x // x'(L)
				+ (data.p.y - p2.y) * data.derivatives.y // y'(L)
			) / distance_p2_p + 1;

			return result;

		}, 'CHE-pathAlongCurve', {
//fnBadInterval: () => {},
			itersMax: 30,
			debug: 1,
		});

		var p = CoatedHyperEllipseBase._pathAlongCurve || (CoatedHyperEllipseBase._pathAlongCurve = new Point);

		return p.copy( data.p );
	}
*/


	_getTmpP1() { return CoatedHyperEllipseBase._tmpP1 || (CoatedHyperEllipseBase._tmpP1 = new Point) }

	_getTmpP2() { return CoatedHyperEllipseBase._tmpP2 || (CoatedHyperEllipseBase._tmpP2 = new Point) }
}



Object.assign( CoatedHyperEllipseBase, {

	_tmpP1: null,
	_tmpP2: null,

	_pathAlongCurve: null,
	_pathAlongCurveResult: { result: null, derivative: null },

	_fnTangentPoint_data: null,
	_fnTangentPointResult: { result: null, derivative: null },
	_tangentPointTmp: null,
	_tangentPoint: null,

	_intervalError_L_t: {},

	_polynomial_theta_t: {},
	_polynomial_L_t_Data_trig: {},
	_intervalPolynomials_Data_trig: {},

});




export { CoatedHyperEllipseBase }

