
class HyperEllipseBase {

	constructor(n, a = 1, b = 1) {

		if (n < 2 || a <= 0 || b <= 0)
			Report.throw("unsupported parameters", `n=${n} a=${a} b=${b}`);

		this.n = n;
		this.a = a;
		this.b = b;

		this.an = Math.pow(a, n);
		this.bn = Math.pow(b, n);

		// "corners" are (±sa, ±sb), where s=2^(-1/n)

		var s = Math.pow(2, -1 / n);
		var p = new Point(s * a, s * b);
		var normal = new Point(1 / a, 1 / b).normalize();

		this.corner = {
			p,
			n: normal,
			theta: Math.atan(b / a),
			d: p.length(),
			normalC: p.y * normal.x - p.x * normal.y,
			distanceNormalTo(x, y) { return this.n.y * x - this.n.x * y + this.normalC },
			tangentC: -p.dot(normal),
		};

		this._approx = null;

		this._curveLengthData = {};
	}



	toString() { return `[ HyperEllipseBase(${this.n}, ${this.a}, ${this.b}) ]` }

	fnInPoint(p) { return Math.pow( Math.abs(p.x) / this.a, this.n )
		+ Math.pow( Math.abs(p.y) / this.b, this.n ) }

	isPointInside(p) { return this.fnInPoint(p) <= 1 }


//parametric plot x=2cos t(cos^3 t + (2 sin t)^3)^(-1/3), y=2sin t(cos^3 t + (2 sin t)^3)^(-1/3)  from x=0 to 2.5, y=0 to 1.5
//plot x=2k cos t, y=2k sin t where k=(cos^3 t +  (2 sin t)^3)^(-1/3)

// n=3, a=2, b=3:
// plot x=r cos t, y=r sin t where r=((cos t / 2)^3 +  (sin t / 3)^3)^(-1/3)

// rotated
// plot x=r cos t, y=r sin t where r=(|cos (t-0.2) / 2|^3 +  |sin (t-0.2) / 3|^3)^(-1/3)
// plot x=r cos t+sgn(cos t)0.3(cos^4(t)/64+sin^4(t)/729)^(-1/2)*cos^2(t)/8, y=r sin t+sgn(t)0.3(cos^4(t)/64+sin^4(t)/729)^(-1/2)*sin^2(t)/27 where r=(|cos(t-0.2)/2|^3+|sin(t-0.2)/3|^3)^(-1/3)

// parametric plot [{(|cos(t-0.2)/2|^3+|sin(t-0.2)/3|^3)^(-1/3)cos t, (|cos(t-0.2)/2|^3+|sin(t-0.2)/3|^3)^(-1/3)sin t}]
// parametric won't 2 graphs

// GOOD!
// parametric plot x=-0.1169t^2+0.10537t+1.97654,y=-0.39665t^2+1.54t-0.6708, plotrange ((0,2.2),(-0.1,1)), AspectRatio 1


	getApprox(n) {

		return this._approx || (this._approx = new CurveApproximation4X(
				n,//null,
				{
					name: `${this}`,
					fnGetPointByAngle: a => this.getPoint(a),
					fnGetNormalAngleInPoint: p => this.getNormalAngleInPoint(p),
					fnClosestPoint: p => this.getClosestPoint(p),
				}
			)//.setupEquidistant()
		);
	}


	getCurveLengthData(targetRelError = 1e-10, nDerivatives = 7) {

		var id = targetRelError + '--' + nDerivatives;

		if (this._curveLengthData[id])
			return this._curveLengthData[id];

		var maxTaylorDerivatives = Math.floor(this.n) + 1; // n=2.1: total 3 derivatives

		if (this.n < 2)
			Report.warn("n < 2 not supported (TODO?)", `${this}`);

		var havePoles = maxTaylorDerivatives < nDerivatives && !Number.isInteger(this.n);

		var arg = {

			nDerivatives,
			targetRelError,
		};

		var midPointT = this.getAngleByNormalAngle(Math.PI / 4);

		Object.assign( arg, {

			name: `${this} TRIG-${id}`,
			intervals: [
				{ start: 0, end: Math.PI / 2, singularities: {
					list: !havePoles ? [] : [ 0, Math.PI / 2 ],
					method: { name: 'reduceTaylorTerms', N: maxTaylorDerivatives },
				} },
			],
			lengthUpperBound: this.a + this.b,
			midPointT,
			midPoint: this.getPoint(midPointT).clone(),
			fn_getPointByParameter: t => this.getPoint(t),

			fn_getIntervalError_L_t: (...args) => this.getIntervalError_L_t(...args),
			fn_getPolynomial_L_t: (...args) => this.getPolynomial_L_t(...args),
		});

		return ( this._curveLengthData[id] = new DifferentiableCurve_4X(arg) );
	}


	getCurveLength() { return 4 * this.getCurveLengthData().totalLen }

	lengthLowerBound() {
		return this.corner.p.distanceTo(this.a, 0)
			+ this.corner.p.distanceTo(0, this.b);
	}

	// Quad 0.
	getX_byY(y) { return this.a * Math.pow(1 - Math.pow(y / this.b, this.n), 1 / this.n) }

	getY_byX(x) { return this.b * Math.pow(1 - Math.pow(x / this.a, this.n), 1 / this.n) }


	getPoint(theta) { // Any quadrant.

		var	cos = theta === Math.PI / 2 ? 0 : Math.cos(theta), sin = Math.sin(theta);

		var r = Math.pow(
			Math.pow( Math.abs(cos) / this.a, this.n )
			+ Math.pow( Math.abs(sin) / this.b, this.n ),
			-1 / this.n
		);

		var p = HyperEllipseBase._point || (HyperEllipseBase._point = new Point);

		return p.set( r * cos, r * sin );
	}


	getNormalByAngle(theta) {

		var normal = HyperEllipseBase._normal || (HyperEllipseBase._normal = new Point);

		var	cos = theta === Math.PI / 2 ? 0 : Math.cos(theta), sin = Math.sin(theta);

		return normal.set(
			cos * Math.pow( Math.abs(cos) / this.a, this.n - 2 ) / (this.a * this.a),
			sin * Math.pow( Math.abs(sin) / this.b, this.n - 2 ) / (this.b * this.b),
		);
	}


	getPointAndNormal(theta) { // Any quad.

		var	cos = theta === Math.PI / 2 ? 0 : Math.cos(theta), sin = Math.sin(theta);
		var cos_n_2 = Math.pow( Math.abs(cos), this.n - 2 );
		var sin_n_2 = Math.pow( Math.abs(sin), this.n - 2 );

		var r = Math.pow(
			cos * (cos * cos_n_2 / this.an)
			+ sin * (sin * sin_n_2 / this.bn),
			-1 / this.n
		);

		var data = HyperEllipseBase._pointAndNormal || (HyperEllipseBase._pointAndNormal = {
			p: new Point,
			n: new Point,
		});

		data.p.set( r * cos, r * sin );
		data.n.set( cos * cos_n_2 / this.an, sin * sin_n_2 / this.bn ).normalize();

		return data;
	}


	getNormalInPoint(p) { // Any quadrant. Not normalized.

		var normal = HyperEllipseBase._normal || (HyperEllipseBase._normal = new Point);

		return normal.set(
			p.x * Math.pow( Math.abs(p.x) / this.a, this.n - 2 ) / (this.a * this.a),
			p.y * Math.pow( Math.abs(p.y) / this.b, this.n - 2 ) / (this.b * this.b)
		);
	}


	getNormalAngleInPoint(p) { return this.getNormalInPoint(p).angle() }

	getPointByNormalAngle(a) { return this.getPoint( this.getAngleByNormalAngle(a) ) }


	getAngleByNormalAngle(a) { // Quad 0.

		//var	cos = a === Math.PI / 2 ? 0 : Math.cos(a), sin = Math.sin(a);

		//return Math.atan2(
		//	sin * this.bn * Math.pow( Math.abs(sin) * this.bn, 1 / (this.n - 1) - 1 ),
		//	cos * this.an * Math.pow( Math.abs(cos) * this.an, 1 / (this.n - 1) - 1 )

		return Math.atan( (this.bn / this.an * Math.tan(a)) **(1 / (this.n - 1)) );
	}


	// =============================================================

	integrateLength(start, end) {

		return NumericMethod.integrateAdaptiveSimpson(start, end, t => {

			return this.getPolynomial_L_t(1, t)[1];

		}, 'HE-integrateLength',
			{ debug: 2 }
		);
	}


	getIntervalError_L_t(N, tStart, tEnd) {

		var p = HyperEllipseBase._intervalError_L_t[ N ] || (
				HyperEllipseBase._intervalError_L_t[ N ] = {

			cos: new IntervalPolynomial(N),
			sin: new IntervalPolynomial(N),
			//cos_n_1: new IntervalPolynomial(N), // no, (n - 1)
			cos_n: new IntervalPolynomial(N),
			sin_n: new IntervalPolynomial(N),
			r0_1_n_1: new IntervalPolynomial(N),
			cos_2n_2: new IntervalPolynomial(N),
			sin_2n_2: new IntervalPolynomial(N),
			len: new IntervalPolynomial(N),

			L_t: new IntervalPolynomial(N + 1),
		});

		var n = this.n, an = this.an, bn = this.bn;

		p.cos.setDerivatives_cos( tStart, tEnd );
		p.sin.setDerivatives_sin( tStart, tEnd );

		p.cos_n.derivativesPow( p.cos, n, 1 / an );
		p.sin_n.derivativesPow( p.sin, n, 1 / bn );

		p.r0_1_n_1.setSum( p.cos_n, p.sin_n ).derivativesPow( -1 / n - 1 );

		p.cos_2n_2.derivativesPow( p.cos, 2 * n - 2, 1 / (an * an) );
		p.sin_2n_2.derivativesPow( p.sin, 2 * n - 2, 1 / (bn * bn) );

		p.len.setSum( p.cos_2n_2, p.sin_2n_2 ).derivativesPow( 1/2 )
			.multiplyDerivatives( p.r0_1_n_1 );

		p.L_t.copyShiftRight( p.len ).applyTaylorFactorials();

		return p.L_t;
	}


	getPolynomial_L_t(N, t0) {

		// N: number of derivatives. In L(t), derivatives start at index 0.

		// 1.0*[ integrate (cos^7 t+sin^7 t)^(-1/7-1) sqrt(cos^(7*2-2) t+sin^(7*2-2) t) dt from t=0 to 0.5 ]
		// hE = new HyperEllipseBase(7); d=hE.getCurveLengthData(); d.getLengthByParameter(0.5) - 0.5451931276653975141261224781
		// 1.0*[ integrate (cos^50 t+sin^50 t)^(-1/50-1) sqrt(cos^(50*2-2) t+sin^(50*2-2) t) dt from t=0 to 1 ]
		// hE = new HyperEllipseBase(50); d=hE.getCurveLengthData(); d.getLengthByParameter(1) - 1.335977000091869556452524455
		// hE = new HyperEllipseBase(50); d=hE.getCurveLengthData(); d.getLengthByParameter(1.1) - 1.469101510784056152731474134

		var p = HyperEllipseBase._polynomial_L_t_Data[ N ] || (
				HyperEllipseBase._polynomial_L_t_Data[ N ] = {

			cos: new Polynomial(N),
			sin: new Polynomial(N),
			cos_n: new Polynomial(N),
			sin_n: new Polynomial(N),
			r0_1_n_1: new Polynomial(N),
			cos_2n_2: new Polynomial(N),
			sin_2n_2: new Polynomial(N),
			len: new Polynomial(N),

			L_t: new Polynomial(N + 1),
		});

		var n = this.n, an = this.an, bn = this.bn;

		p.cos.setDerivatives_cos( t0 );
		p.sin.setDerivatives_sin( t0 );

		p.cos_n.derivativesPow( p.cos, n, 1 / an );
		p.sin_n.derivativesPow( p.sin, n, 1 / bn );

		p.r0_1_n_1.setSum( p.cos_n, p.sin_n ).derivativesPow( -1 / n - 1 );

		p.cos_2n_2.derivativesPow( p.cos, 2 * n - 2, 1 / (an * an) );
		p.sin_2n_2.derivativesPow( p.sin, 2 * n - 2, 1 / (bn * bn) );

		p.len.setSum( p.cos_2n_2, p.sin_2n_2 ).derivativesPow( 1/2 )
			.multiplyDerivatives( p.r0_1_n_1 );

		p.L_t.copyShiftRight( p.len ).applyTaylorFactorials();

		return p.L_t;
	}



	// =============================================================

	_fnAngleToClosestPoint(t, x, y, result = HyperEllipseBase._fnClosestPointResult) { // Quad 0.

		var n = this.n;
		var	cos = t === Math.PI / 2 ? 0 : Math.cos(t), sin = Math.sin(t);

		var cos_n_2_an = Math.pow(cos, n - 2) / this.an, sin_n_2_bn = Math.pow(sin, n - 2) / this.bn;
		var cos_n_1_an = cos * cos_n_2_an, sin_n_1_bn = sin * sin_n_2_bn;
		var cos_2n_3_a2n = cos_n_1_an * cos_n_2_an, sin_2n_3_b2n = sin_n_1_bn * sin_n_2_bn;
		var cos_2n_2_a2n = cos_n_1_an * cos_n_1_an, sin_2n_2_b2n = sin_n_1_bn * sin_n_1_bn;

		var r0 = cos * cos_n_1_an + sin * sin_n_1_bn;
		var r_1n_1 = Math.pow(r0, -1 / n - 1);
		var r = r_1n_1 * r0;
		var len_2 = 1 / (cos_2n_2_a2n + sin_2n_2_b2n), len_1 = Math.sqrt(len_2);

		var expr_0 = (x - r * cos) * sin_n_1_bn - (y - r * sin) * cos_n_1_an;

		result.result = len_1 * expr_0;

		// hE = new HyperEllipseBase(3.5,2.5); hE._fnAngleToClosestPoint(0.5,3,2)
		//
		// [ cos^n t / a^n + sin^n t / b^n ]^(-1/n)
		// /sqrt[cos^(2n-2)t/a^(2n)+sin^(2n-2)t/b^(2n)]
		// evaluate   at n=3.5,a=2.5,b=1,t=0.5,x=3,y=2
		//
		// hE = new HyperEllipseBase(9,5,2); hE._fnAngleToClosestPoint(0.1,2,5)
		// evaluate d/dt (x (sin t)^8/b^9-y (cos t)^8/a^9-[((cos t)/a)^9+((sin t)/b)^9]^(-1/9)
		// (cos t (sin t)^8/b^9-sin t (cos t)^8/a^9))/sqrt[(cos t)^16/a^18+(sin t)^16/b^18] at a=5,b=2,t=0.1,x=2,y=5

		var cos4 = (cos * cos) * (cos * cos), sin4 = (sin * sin) * (sin * sin);

		result.derivative = len_1 * (
			(n - 1) * (
				len_2 * ( sin * cos_2n_3_a2n - cos * sin_2n_3_b2n ) * expr_0
				+ (x * cos * sin_n_2_bn + y * sin * cos_n_2_an)
			)
			- r_1n_1 * (
				+ ((n - 1) * (sin * sin) - 1) * cos_2n_2_a2n
				+ ((n - 1) * (cos * cos) - 1) * sin_2n_2_b2n
				+ (n - 1) * (cos4 + sin4) * cos_n_2_an * sin_n_2_bn
			)
		);

		// https://sagecell.sagemath.org/
		//
		// var('t','n','x','y','a','b')
		// f = ( x*sin(t)^(n-1)/b^n - y*cos(t)^(n-1)/a^n - (cos(t)^n/a^n + sin(t)^n/b^n)^(-1/n) *( cos(t)*sin(t)^(n-1)/b^n - sin(t)*cos(t)^(n-1)/a^n ) ) *( cos(t)^(2*n-2)/a^(2*n) + sin(t)^(2*n-2)/b^(2*n) )^(-1/2)
		// e = f.differentiate(t,1).simplify()

		var distance = Util.hypot(x - r * cos, y - r * sin);

		if (distance > 1) {
			result.result /= distance;
			result.derivative /= distance;
		}

		return result;
	}


	getAngleToClosestPointQuad0(x, y) {

		var start, end, t;

		var d = this.corner.distanceNormalTo(x, y);

		if (d < 0) {
			start = this.corner.theta; end = Math.PI / 2;
			t = start + (end - start) * Math.abs(d) / ( Math.abs(d) + x );

		} else {
			start = 0; end = this.corner.theta;
			t = end * y / ( y + Math.abs(d) );
		}

		//t = (start + end) * 0.5;

		var fnResult = HyperEllipseBase._fnClosestPointResult;

		return NumericMethod.NewtonRaphsonHardened(start, end, t, (t) => {

			return this._fnAngleToClosestPoint(t, x, y, fnResult);

		}, 'HyperEllipseBase-closestPoint', {
			debug: 1,
			itersMax: 50,
			epsilonY: 1e-12, epsilonX: 1e-14,
			fnError: id => console.error(`HyperEllipseBase-closestPoint ${id} ${this} (${x},${y})`),
		});
	}


	getClosestPointData(p1) {

		var t = this.getAngleToClosestPointQuad0( Math.abs(p1.x), Math.abs(p1.y) );

		var p = this.getPoint(t); // .getPointAndNormal(t) ?

		p1.x < 0 && (p.x *= -1);
		p1.y < 0 && (p.y *= -1);

		var n = this.getNormalInPoint(p);

		var data = HyperEllipseBase._closestPointData || (HyperEllipseBase._closestPointData =
			{ t: null, p: new Point, n: new Point } );

		data.t = t;
		data.p.copy(p);
		data.n.copy(n);

		return data;
	}


	// ======================================================================

	_fnExtremumX(theta, cosAngle, result = HyperEllipseBase._fnExtremumXResult) {

		var n = this.n, an = this.an, bn = this.bn;
		var	cos = Math.cos(theta), sin = Math.sin(theta);
		var cos_n_2 = Math.pow( Math.abs(cos), n - 2 ), sin_n_2 = Math.pow( Math.abs(sin), n - 2 );
		var cos_2n_4 = cos_n_2 * cos_n_2, sin_2n_4 = sin_n_2 * sin_n_2;
		//var cos_2n_2 = cos_2n_4 * (cos * cos), sin_2n_2 = sin_2n_4 * (sin * sin);

		//var lenSq = bn * bn * cos_2n_2 + an * an * sin_2n_2;
		var lenSq = bn * bn * cos_2n_4 * (cos * cos) + an * an * sin_2n_4 * (sin * sin);
		var len = Math.sqrt(lenSq);

		result.result = cos * (bn * cos_n_2 / len) - cosAngle;

		result.derivative = (1 - n) * sin * (bn * cos_n_2 / len)
			* ( 1 + (cos * cos) * (an * an * sin_2n_4 - bn * bn * cos_2n_4) / lenSq );

		return result;
	}


	getExtremumX_Rotated(a) { // TODO it can be much simpler

		// "fnCalls/run": 9.532, "bisections/run": 2.39, "divergencies/run": 0.2
		// n=300: OK
		//var start = Angle.quadMin(a), end = start + Math.PI / 2;
		//var theta = (start + end) * 0.5;
		//var cos = Math.cos(a);

		// "fnCalls/run": 4.316, "bisections/run": 0.056, "divergencies/run": 0.044
		var theta = this.getApprox().getCentralAngleByNormalAngle4X(-a);
		var start = Angle.quadMin(theta), end = start + Math.PI / 2;
		var cos = Math.cos(a);

		var fnResult = HyperEllipseBase._fnExtremumXResult;

		theta = NumericMethod.NewtonRaphsonHardened(start, end, theta, (theta) => {

			return this._fnExtremumX(theta, cos, fnResult);

		}, 'HyperEllipseBase-extremumX', {
			debug: 1,
			itersMax: 35,
			epsilonY: 1e-12, epsilonX: 1e-12,
			fnError: id => console.error(`HyperEllipseBase-extremumX ${id} ${this} (${a})`),
		});

		return this.getPoint(theta).rotate( -a ).x;
	}
// new HyperEllipseBase(3.24, 3.22, 1).getExtremumX_Rotated(-0.00000142)
// ^ slow converg. (3x after 4 iters)
// ^^ slow convergency appears near +-0 & +-PI


	// ====================================================

	getClosestPoint(p) { return this.getClosestPointData(p).p }

	getCentralAngleToClosestPoint(p) { return this.getClosestPointData(p).p.angle() }


	distanceToPoint(p) {

		var data = this.getClosestPointData(p);

		return data.p.subVectors(p, data.p).dot( data.n.normalize() );
	}


	isPointInside_2(p) {

		if ( Math.abs(p.x) > this.a || Math.abs(p.y) > this.b )
			return false;

		if ( Util.hypot(p.x, p.y) <= Math.min(this.a, this.b) )
			return true;

		var data = this.getClosestPointData(p);

		return data.p.subVectors(p, data.p).dot( data.n ) <= 0;
	}

}



Object.assign( HyperEllipseBase, {

	_point: null,
	_normal: null,
	_pointAndNormal: null,

	_closestPointData: null,
	_fnClosestPointResult: { result: null, derivative: null },
	_fnExtremumXResult: { result: null, derivative: null },

	_intervalError_L_t: {},
	_polynomial_L_t_Data: {},

	_intervalPolynomials_Data: {},
});




export { HyperEllipseBase }

