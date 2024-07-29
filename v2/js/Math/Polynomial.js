
import { ComplexNumber } from './Math.js';


class Polynomial extends Array {

	constructor(n) {

		super(n).fill(0);
	}


	hasError() { return this[0] !== this[0] }

	setError() { this[0] = NaN; return this }


	set(...args) {

		var len = Math.min(this.length, args.length);
		var i = 0;

		for (i = 0; i < len; i++)
			this[i] = args[i];

		if (len < args.length)
			Report.warn("excess elements", `len=${this.length} args=${args.length}`);

		for ( ; i < this.length; i++)
			this[i] = 0;

		return this;
	}


	getMaxAbsTerm(N = this.length - 1) {

		var max = 0;

		for (let i = 1; i <= N; i++)
			max = Math.max( max, Math.abs(this[i]) );

		return max;
	}


	clone(N = this.length - 1) {

		var p = new Polynomial(N + 1);

		for (let i = 0; i <= N; i++)
			p[i] = this[i];

		return p;
	}


	copy(p, N = this.length - 1) {

		for (let i = 0; i <= N; i++)
			this[i] = p[i];

		return this;
	}


	copyScaled(p, factor) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i] = factor * p[i];

		return this;
	}


	copyShiftRight(p, n = 1) {

		var len = p.length;

		if (len + n !== this.length)
			Report.warn("copyShiftRight: length mismatch", `src=${len} dst=${this.length}`);

		for (let i = 0; i < n; i++)
			this[i] = 0;

		for (let i = 0; i < len; i++)
			this[i + n] = p[i];

		return this;
	}


	add(p) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i] += p[i];

		return this;
	}


	addScaled(p, factor) {

		for (let i = 0, len = this.length; i < len; i++) {

			let summand = factor * p[i];

			summand !== 0 && (this[i] += summand);
		}

		return this;
	}


	setSum(p1, p2) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i] = p1[i] + p2[i];

		return this;
	}


	sub(p) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i] -= p[i];

		return this;
	}


	setDiff(p1, p2) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i] = p1[i] - p2[i];

		return this;
	}


	multiplyScalar(scalar) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i] *= scalar;

		return this;
	}


	setDerivatives_variable(t) { // = .setDerivatives_pow(t, 1)

		this[0] = t;

		if (this.length > 1) {
			this[1] = 1;
			this.fill(0, 2);
		}

		return this;
	}


	setDerivatives_cos(t, factor = 1) {

		var cos = t === Math.PI / 2 ? 0 : factor * Math.cos(t), sin = factor * Math.sin(t);
		var i, maxI = this.length - 1;

		for (i = 0; i < maxI; i += 2) {

			this[i] = cos;

			cos = -cos; sin = -sin;

			this[i + 1] = sin;
		}

		if (i === maxI)
			this[i] = cos;
			
		return this;
	}


	setDerivatives_sin(t, factor = 1) {

		var cos = t === Math.PI / 2 ? 0 : factor * Math.cos(t), sin = factor * Math.sin(t);
		var i, maxI = this.length - 1;

		for (i = 0; i < maxI; i += 2) {

			this[i] = sin;
			this[i + 1] = cos;

			cos = -cos; sin = -sin;
		}

		if (i === maxI)
			this[i] = sin;

		return this;
	}


	setDerivatives_pow(t, n, factor = 1) {

		var N = this.length - 1;

		if (!Number.isFinite(t))
			Report.throw("arg is not finite", `t=${t} n=${n} f=${factor}`);

		if ( Math.abs(t) < 1e-308 ) {

			if (n >= 0 && n - N <= 0 && Number.isInteger(n)) {

				let curr_n = n, currFactor = curr_n;

				this[0] = n === 0 ? factor : 0;

				for (let i = 1; i <= N; i++) {

					this[i] = n - i === 0 ? factor * currFactor : 0;
					currFactor *= --curr_n;
				}

				return this;

			} else if (n - N > 0) {

				//Report.warn("function and the derivatives are all zero", `t=${t} n=${n}`);

				this.fill(0);

				return this;

			}//if (!Number.isInteger(n)) {

			// d^5/dt^5 sin^2.5 t at t=0
			// Result: (undefined)

			//Report.throw("undefined result, setting 0", `t=${t} n=${n}`);
			Report.warn("undefined result, setting 0", `t=${t} n=${n}`);

			for (let i = 0; i <= N; i++)
				this[i] = 0;

			return this;

		} // abs(t) < 1e-300


		var value = factor * Math.pow(t, n);
		var curr_n = n, curr_nFactor = curr_n;

		if (!Number.isFinite(value))
			Report.throw("not finite 1", `t=${t} n=${n} f=${factor} v=${value}`);

		this[0] = value;

		for (let i = 1; i <= N; i++) {

			value /= t;

			let d = value * curr_nFactor;

			if (!Number.isFinite(d))
				Report.throw("not finite 2", `i=${i} t=${t} n=${n} v=${value} d=${d}`);

			this[i] = d;
			curr_nFactor *= --curr_n;
		}

		return this;
	}


	// https://mathworld.wolfram.com/FaadiBrunosFormula.html
	// https://en.wikipedia.org/wiki/Bell_polynomials#Fa%C3%A0_di_Bruno's_formula

	derivativesPow(arg, n, factor) {

		if (typeof arg == 'number') {

			if (factor !== undefined)
				Report.throw("derivativesPow bad usage");

			factor = n;
			n = arg;

			let fx_pow = this.getTmpPolynomial().setDerivatives_pow(this[0], n, factor);

			return this.setChainedDerivatives(fx_pow, this);
		}

		if (arg === this)
			Report.throw("derivativesPow arg === this");

		if (this.length > arg.length)
			Report.warn("length mismatch", `this=${this.length} arg=${arg.length}`);

		this.setDerivatives_pow(arg[0], n, factor);

		return this.setChainedDerivatives(this, arg);
	}


	setChainedDerivatives(f, g) {

		var fn = Polynomial._fn_setChainedDerivatives;

		if (!fn)
			fn = Polynomial._fn_setChainedDerivatives
				= Polynomial._createFn_setChainedDerivatives();

		return fn.call(this, f, g);
	}


	// https://doi.org/10.20944/preprints202302.0082.v1

	setDerivatives_atan(t) {

		console.assert(typeof t == 'number');

		this[0] = Math.atan(t);

		var a = Math.asin(1 / Math.sqrt(1 + t * t));
		var sign = 1;

		for (let i = 1, len = this.length; i < len; i++) {

			this[i] = sign * Polynomial.factorial(i - 1) / (1 + t * t) **(i / 2)
				* Math.sin(i * a);

			sign = -sign;
		}

		return this;
	}


	derivativesAtan(arg = this) {

		if (arg === this)
			arg = this.getTmpPolynomial().copy(this);

		else if ( !(arg instanceof Polynomial) )
			Report.throw("bad arg");

		else if (this.length > arg.length)
			Report.warn("length mismatch", `this=${this.length} arg=${arg.length}`);

		this.setDerivatives_atan(arg[0]);

		return this.setChainedDerivatives(this, arg);
	}


	setDerivatives_acos(t) {

		if (Math.abs(t) >= 1)
			Report.throw("derivatives_acos", `t=${t}`);

		var N = this.length - 1;

		var p = new Polynomial(N - 1).setDerivatives_variable(t);

		p.multiplyDerivatives(p).multiplyScalar(-1);
		p[0] += 1;
		p.derivativesPow( -1/2, -1 );

		this[0] = Math.acos(t);

		for (let i = 1; i < this.length; i++)
			this[i] = p[i - 1];

		return this;
	}


	derivativesAcos(arg = this) {

		if (arg === this)
			arg = this.getTmpPolynomial().copy(this);

		else if ( !(arg instanceof Polynomial) )
			Report.throw("bad arg");

		else if (this.length > arg.length)
			Report.warn("length mismatch", `this=${this.length} arg=${arg.length}`);

		this.setDerivatives_acos(arg[0]);

		return this.setChainedDerivatives(this, arg);
	}


	setDerivatives_polynomial(coeffArray, t) {

		for (let n = 0, len = this.length; n < len; n++) {

			let tn = 1, value = 0; // n'th derivative

			for (let i = n; i < coeffArray.length; i++) {

				value += Polynomial.fallingFactorial(i, n) * coeffArray[i] * tn;
				tn *= t;
			}

			this[n] = value;
		}

		return this;
	}


	// https://en.wikipedia.org/wiki/General_Leibniz_rule

	setDerivatives_product(fx_d, gx_d) {

		var N = this.length - 1; // N: max.order of derivative (=number of derivatives).
		
		if (N === 0) {
			this[0] = fx_d[0] * gx_d[0];
			return this;
		}

		var f0 = fx_d[0], f1 = fx_d[1], g0 = gx_d[0], g1 = gx_d[1];

		for (let n = N; n > 2; n--) {

			let sum = fx_d[n] * g0 + n * (fx_d[n - 1] * g1 + f1 * gx_d[n - 1]) + f0 * gx_d[n];
			let binomial = n;

			for (let k = 2; k < n - 1; k++) {

				binomial = (binomial * (n + 1 - k)) / k;

				sum += binomial * fx_d[n - k] * gx_d[k];
			}

			this[n] = sum;
		}

		if (N >= 2)
			this[2] = fx_d[2] * g0 + 2 * f1 * g1 + f0 * gx_d[2];

		this[1] = f1 * g0 + f0 * g1;
		this[0] = f0 * g0;

		return this;
	}


	setDerivatives_product_2(fx_d, gx_d) { // correct; unused

		var N = this.length - 1; // N: max.order of derivative (=number of derivatives).

		var f0 = fx_d[0], g0 = gx_d[0];

		for (let n = N; n > 0; n--) {

			let sum = fx_d[n] * g0 + f0 * gx_d[n];
			let binomial = 1;

			for (let k = 1; k < n; k++) {

				binomial = (binomial * (n + 1 - k)) / k;

				sum += binomial * fx_d[n - k] * gx_d[k];
			}

			this[n] = sum;
		}

		this[0] = f0 * g0;

		return this;
	}


	derivativesMultiply(gx_d) { return this.setDerivatives_product(this, gx_d) }

	multiplyDerivatives(gx_d) { return this.setDerivatives_product(this, gx_d) }

	addDerivatives_product(fx_d, gx_d) {
		return this.add( this.getTmpPolynomial().setDerivatives_product(fx_d, gx_d) );
	}

	subDerivatives_product(fx_d, gx_d) {
		return this.sub( this.getTmpPolynomial().setDerivatives_product(fx_d, gx_d) );
	}


	applyTaylorFactorials() {

		var cnt = 2, factorial = 1;

		for (let i = 2, len = this.length; i < len; i++) {

			factorial *= cnt ++;
			this[i] /= factorial;
		}

		return this;
	}


	rollbackTaylorFactorials() {

		var cnt = 2, factorial = 1;

		for (let i = 2, len = this.length; i < len; i++) {

			factorial *= cnt ++;
			this[i] *= factorial;
		}

		return this;
	}


	sumSeries(t, N = this.length - 1) {

		var variable = t, result = this[0];

		for (let i = 1; i <= N; i++) {

			result += this[i] * variable;
			variable *= t;
		}

		return result;
	}


	setReversed(a = this) {

		var N = a.length - 1;

		var a1 = a[1], a1_2 = a1 * a1, a1_m2 = 1 / a1_2, a1_m3 = a1_m2 / a1;
		var a2 = a[2], a2_2 = a2 * a2;
		var a3 = a[3];

		this[0] = a[0];
		this[1] = 1 / a1;

		if (N <= 1)
			return this;

		this[2] = -a1_m3 * a2;

		if (N === 2)
			return this;

		this[3] = (a1_m3 * a1_m2) * (2 * a2_2 - a1 * a3);

		if (N === 3)
			return this;

		var a4 = a[4], a1_m7 = a1_m3 * a1_m2 * a1_m2, a2_3 = a2_2 * a2;

		this[4] = a1_m7 * (5 * a1 * a2 * a3 - a1_2 * a4 - 5 * a2_3);

		if (N === 4)
			return this;

		var a5 = a[5], a1_3 = a1_2 * a1, a2_4 = a2_2 * a2_2, a3_2 = a3 * a3;

		this[5] = (a1_m7 * a1_m2) * ( 6 * (a1_2 * a2) * a4 + 3 * a1_2 * a3_2
			+ 14 * a2_4 - a1_3 * a5 - 21 * a1 * a2_2 * a3 );

		if (N === 5)
			return this;

		var a6 = a[6], a1_4 = a1_2 * a1_2;

		this[6] = (a1_m7 * a1_m2 * a1_m2) * ( 7 * a1_3 * a2 * a5 + 7 * a1_3 * a3 * a4
			+ 84 * a1 * a2_3 * a3 - a1_4 * a6 - 28 * (a1_2 * a2) * a3_2
			- 42 * (a2_3 * a2_2) - 28 * (a1_2 * a2_2) * a4 );

		if (N === 6)
			return this;

		this[7] = (a1_m7 * a1_m2 * a1_m2 * a1_m2) * ( 8 * a1_4 * a2 * a6 + 8 * a1_4 * a3 * a5
			+ 4 * a1_4 * (a4 * a4) + 120 * a1_2 * a2_3 * a4 + 180 * (a1_2 * a2_2) * a3_2
			+ 132 * (a2_3 * a2_3) - (a1_4 * a1) * a[7] - 36 * a1_3 * a2_2 * a5
			- 72 * a1_3 * a2 * a3 * a4 - 12 * a1_3 * (a3_2 * a3) - 330 * a1 * a2_4 * a3 );

		if (N > 7)
			Report.warn("not supported", `N=${N}`);

		return this;

		// B.<a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15> = PolynomialRing(ZZ)
		// A.<t> = PowerSeriesRing(B)
		// f = a1*t + a2*t^2 + a3*t^3 + a4*t^4 + a5*t^5 + a6*t^6 + a7*t^7 + a8*t^8
		// + a9*t^9 + a10*t^10 + a11*t^11 + a12*t^12 + a13*t^13 + a14*t^14 + a15*t^15 + O(t^16)
		// g = f.reverse(precision=15); g
	}


	static factorial(n) { return this._factorial[n] }


	static fallingFactorial(x, n) {

		if ( !Number.isInteger(n) && n < 0 ) {
			Report.once("falling factorial", `x=${x} n=${n}`);
			return 0;
		}

		var result = 1;

		for ( ; n > 0; n--)
			result *= x--;

		return result;
	}


	static binomial(n, k) {

		//return this.factorial(n) / ( this.factorial(k) * this.factorial(n - k) );

		if ( !Number.isInteger(n) || !Number.isInteger(k) )
			return this._binomialNonInteger(n, k);

		if (k > n) {
			Report.once("binomial k>n", `n=${n} k=${k}`);
			return 0;
		}

		if (k + k > n)
			k = n - k;

		var res = 1;

		for (let k1 = 1; k1 <= k; k1++)
			res = (res * (n + 1 - k1)) / k1;

		if (!Number.isInteger(res)) {
			Report.once("binomial: non-integer result on integer input",  `${res} n=${n} k=${k}`);
			res = Math.floor(res + 0.5)
		}

		return res;
	}


	static _binomialNonInteger(n, k) {
		return Util.gamma(n + 1) / ( Util.gamma(k + 1) * Util.gamma(n + 1 - k) );
	}


	static numberOfMultinomialCoefficients(n, m) { // (x_1, ..., x_m)^n
		return this.binomial(n + m - 1, m - 1);
	}


	getTmpPolynomial(N = this.length - 1) {

		return Polynomial._tmpPolynomials[N] ||
			( Polynomial._tmpPolynomials[N] = new Polynomial(N + 1) );
	}
}



Object.assign( Polynomial, {

	DERIVATIVES_MAX: 15,

	_factorial: [
		1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600,
		6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000,
		6402373705728000, 121645100408832000, 2432902008176640000, 51090942171709440000,
		1.1240007277776077e+21, 2.585201673888498e+22, 6.204484017332394e+23, 1.5511210043330986e+25,
		4.0329146112660565e+26, 1.0888869450418352e+28, 3.0488834461171384e+29, 8.841761993739701e+30
	],

	_tmpPolynomials: {},

	_fn_setChainedDerivatives: null,


	data: {

		quarticRoots: [],

		quadraticCoefficients: { a: 0, b: 0, c: 0 },
	},

	_R: new ComplexNumber,
	_U: new ComplexNumber,
	_Ux3: new ComplexNumber,
	_cubicRoots: [],

	_quadraticRoots: {

		x1: 0,
		x2: 0,
		toString() { return `[Quadratic Roots x1=${this.x1} x2=${this.x2}]` }
	},

});


/*
Polynomial.prototype.setChainedDerivatives_1 = function(f, g) {

	f = f.clone();

	console.assert(this !== f);

	var N = this.length - 1;

	this[0] = f[0];

	for (let n = 1; n <= N; n++) {

		let sum = 0;

		for (let k = 1; k <= n; k++) {

			let B = BellPolynomial.get(n, k);

			sum += f[k] * B.evaluate(g);
		}

		this[n] = sum;
	}

	return this;
}
*/



Polynomial._createFn_setChainedDerivatives = function() {

	var maxN = Polynomial.DERIVATIVES_MAX; // 15: textLen=20K, 20: textLen=87K

	var text = `	// Auto-generated.

	var N = this.length - 1;

	this[0] = f[0];

	if (N === 0)
		return this;

	var f1 = f[1], g1 = g[1];

	this[1] = f1 * g1;

	if (N === 1)
		return this;

	var f2 = f[2], g2 = g[2], g1_2 = g1 * g1;

	this[2] = f1 * g2 + f2 * g1_2;

	if (N === 2)
		return this;
`;

	for (let n = 3; n <= maxN; n++) {

		let varDecl = `var f${n} = f[${n}], g${n} = g[${n}], g1_${n} = g1_${n-1} * g1`;

		for (let j = 2; j <= n / 2; j++) {
			// x_j
			if ( n / j === Math.floor(n / j) )
				varDecl += `, g${j}_${n/j} = ` + (n / j === 2 ? `g${j}` : `g${j}_${n/j-1}`) +  ` * g${j}`;
		}


		text += `
	${varDecl};

	this[${n}] = f1 * g${n}
`;

		for (let k = 2; k < n; k++) {

			text += `\t\t+ f${k} * (`;

			let B = BellPolynomial.get(n, k);

			B.forEach( (part, partNum) => {

				if (partNum !== 0)
					text += ' + ';

				if (part[0] !== 1)
					text += `${part[0]} * (`;

				for (let i = 1; i < part.length; i += 2) {

					let expr = `g${part[i]}` + (part[i + 1] === 1 ? '' : `_${part[i+1]}`);

					if (i > 1)
						text += ' * ';

					text += `${expr}`;
				}

				if (part[0] !== 1)
					text += ')';
			});

			text += `)\n`;
		}

		text += `\t\t+ f${n} * g1_${n};

	if (N === ${n})
		return this;
`;
	}

	text += `
	Report.once("chainedDerivatives", "maxN=${maxN}");

	return this;
`;

	//console.log(`setChainedDerivatives.length=${text.length}`);

	var fn = new Function('f, g', text);

	Object.defineProperty(fn, 'name', { value: `setChainedDerivatives_max${maxN}` });

	return fn;
}





Polynomial.solveQuadraticEqn = function(a, b, c, orderRoots) {

	var x1, x2;

	if (a === 0) {

		if (b === 0) {

			if (c === 0) // Infinite number of roots
				return;
			else // No roots
				return;
		}

		// Count as root w/ multiplicity 2 (TODO correct?)
		x1 = x2 = -c / b;

	} else {

		let d = b * b - 4 * a * c;
		if (d < 0)
			return;

		// TODO use formulae that avoid cancellation

		x1 = (b + Math.sqrt(d)) / (-2 * a);
		x2 = (b - Math.sqrt(d)) / (-2 * a);

		// Roots always appear ordered ascending when a > 0

		if (orderRoots === true && x2 < x1) {
			let tmp = x1; x1 = x2; x2 = tmp;
		}
	}

	var roots = this._quadraticRoots;

	roots.x1 = x1;
	roots.x2 = x2;

	return roots;
}



Polynomial.solveCubicReal = function(a, b, c, d, return1Root) {

	if (a === 0) {

		if (return1Root === true)
			return 0;

		let cubicRoots = Util.setLength( this._cubicRoots, 1 );
		cubicRoots[0] = 0;

		let roots = this.solveQuadraticEqn(b, c, d);
		if (roots)
			cubicRoots.push(roots.x1, roots.x2);

		return cubicRoots;
	}


	var	P = (a * c * 3 - b * b) / (a * a * 3),
		Q = (b * b * b * 2 - a * c * b * 9 + a * a * 27 * d) / (a * a * 27 * a);

	var result = Polynomial.solveDepressedCubicReal(P, Q, return1Root);

	if (return1Root === true)
		return result - b / (3 * a);

	for (let i = 0; i < result.length; i++)
		result[i] -= b / (3 * a);

	return result;
}


Polynomial.solveDepressedCubicReal = function(P, Q, return1Root) {

	var roots;

	var R0 = Q * Q / 4 + P * P * P / 27;

	if (R0 !== R0) { // e.g. Q=4.782e+165 P=-5.364e+110
		Report.warn("solveCubic overlow", `P=${P} Q=${Q}`);
		return return1Root ? undefined : [];
	}

	if (R0 >= 0) { // There's 1 real root.

		let U = Math.cbrt(Q / -2 + Math.sqrt(R0));

		let t = U === 0 ? -Math.cbrt(Q) : U - P / (3 * U);

		if (return1Root === true)
			return t;

		roots = Util.setLength( this._cubicRoots, 1 );
		roots[0] = t;


	} else { // There're 3 real roots.

		let R = this._R.setFromSqrtOfReal(R0).addReal(Q / -2);
		let U = this._U;
		let Ux3 = this._Ux3;
		let t;

		for (let i = 0; i < 3; i++) {

			U = U.copy(R).root(3, i);

			if (U.re === 0 && U.im === 0) {

				t = -Math.cbrt(Q);

			} else {

				Ux3 = Ux3.copy(U).multiplyReal(3);
				U.subComplex( Ux3.setFromRealDividedByComplex(P, Ux3) );
				t = U.re;
			}

			if (i === 0) {

				if (return1Root === true)
					return t;

				roots = this._cubicRoots;
			}

			roots[i] = t;
		}
	}

	return roots;
}



//
// Quartic is given with 2 equations, each equation is in the form
// ax^2 + bxy + cy^2 + dx + ey + f = 0.
//
// fn(x, y) is called on every result. Returns true if there are solutions.
//
Polynomial._quarticGeometric = null;

Polynomial.solveQuarticGeometric = function(
		a1, b1, c1, d1, e1, f1,
		a2, b2, c2, d2, e2, f2,
		fn) {

	var data = Polynomial._quarticGeometric || (Polynomial._quarticGeometric = {

		qC1: new QuadraticCurve,
		qC2: new QuadraticCurve,
	});

	data.qC1.set(a1, b1, c1, d1, e1, f1);
	data.qC2.set(a2, b2, c2, d2, e2, f2);

	return data.qC1.intersectQuadraticCurve(data.qC2, fn);
}



//
// Equation ax^4 + bx^3 + cx^2 + dx + e = 0. Compute only real roots.
// https://en.wikipedia.org/wiki/Quartic_equation#Ferrari's_solution_in_the_special_case_of_real_coefficients
//
Polynomial.solveQuarticReal = function(a, b, c, d, e) {

	//
	// Returns roots in static array,
	// in order same as in: https://en.wikipedia.org/wiki/Quartic_equation
	//
	var result = this.data.quarticRoots;
	result.length = 0;

	// mb.TODO check a!=0 (in grazeTrack a==d**4)
	b /= a;
	c /= a;
	d /= a;
	e /= a;

	var alpha = b * b * (-3/8) + c,
		beta = b * b * b / 8 - b * c / 2 + d,
		gamma = b * b * b * b * (-3/256) + b * b * c / 16 - b * d / 4 + e;

//console.log(`beta=${beta}`);
//beta=0;
	if (beta === 0) { // biquadratic eqn.

		let d = alpha * alpha - 4 * gamma;
//console.log(`d=${d} gamma=${gamma}`);
		if (d < 0)
			return result;

		let	z1 = (-alpha + Math.sqrt(d)) / 2,
			z2 = (-alpha - Math.sqrt(d)) / 2;

		if (z1 >= 0)
			result.push( Math.sqrt(z1) - b / 4, -Math.sqrt(z1) - b / 4 );

		if (z2 >= 0)// && d > 1e-9)
			result.push( Math.sqrt(z2) - b / 4, -Math.sqrt(z2) - b / 4 );

		return result;
	}

	//
	// If the coefficients of the quartic equation are real then
	// the nested depressed cubic equation also has real coefficients,
	// thus it has at least one real root.
	//
	var P = alpha * alpha / -12 - gamma,
		Q = alpha * alpha * alpha / -108 + alpha * gamma / 3 - beta * beta / 8;

	//let y = -5/6 * alpha + this.solveDepressedCubic1Real(P, Q);
	let y = -5/6 * alpha + this.solveDepressedCubicReal(P, Q, true);

	let W = Math.sqrt(alpha + 2 * y);


	let resultLength = 0;

	let Z1 = -3 * alpha - 2 * (y + beta / W);
	if (Z1 >= 0) {
		Z1 = Math.sqrt(Z1);
		result[0] = b / -4 + (W + Z1) / 2;
		result[1] = b / -4 + (W - Z1) / 2;
		resultLength = 2;
	}

	let Z2 = -3 * alpha - 2 * (y - beta / W);
	if (Z2 >= 0) {
		Z2 = Math.sqrt(Z2);
		result[resultLength] = b / -4 - (W + Z2) / 2;
		result[resultLength + 1] = b / -4 - (W - Z2) / 2;
	}

	return result;
}



Polynomial.getQuadraticCoefficientsLagrange_Points = function(p0, p1, p2) {
	return this.getQuadraticCoefficientsLagrange(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
}


Polynomial.getQuadraticCoefficientsLagrange = function(x0, y0, x1, y1, x2, y2) {

	var	a0 = y0 / ((x0 - x1) * (x0 - x2)),
		a1 = y1 / ((x1 - x0) * (x1 - x2)),
		a2 = y2 / ((x2 - x0) * (x2 - x1)),
		a = a0 + a1 + a2;

	if (a !== a)
		return;

	var result = Polynomial.data.quadraticCoefficients;

	result.a = a;
	result.b = -a0 * (x1 + x2) - a1 * (x0 + x2) - a2 * (x0 + x1);
	result.c = a0 * x1 * x2 + a1 * x0 * x2 + a2 * x0 * x1;

	return result;
}



Polynomial.prototype.integrate = function(a, b) {

	var an = a, bn = b;
	var Fa = 0, Fb = 0;

	for (let i = 0; i < this.length; i++) {

		Fa += this[i] / (i + 1) * an;
		Fb += this[i] / (i + 1) * bn;

		an *= a, bn *= b;
	}

	return Fb - Fa;
}



Polynomial.interpolate = function(x, y, id) {

	if ( !(Array.isArray(x) && Array.isArray(y) && x.length === y.length) )
		return Report.warn("interpolate: bad args");

	var n = x.length;

	var matrix = new Matrix(n, n + 1);

	var rowArray = [];

	var setRow = (i, x, y) => {

//console.log(`row i=${i} x=${x}`);
		for (let j = 0; j < n; j++)
			rowArray[j] = x ** j;

		rowArray[n] = y;

		matrix.setRow(i, ...rowArray);
	};

	for (let i = 0; i < n; i++)
		setRow(i, x[i], y[i]);

	var result = matrix.gaussianEliminate( new Polynomial(n) );

	if (!result)
		return Report.warn("non-solvable matrix", `n=${n} id=${id}`);

	return result;
}


// https://en.wikipedia.org/wiki/Richardson_extrapolation#Properties
/*
cHE = new CoatedHyperEllipseBase(2.7,1,1,0.5); af = (t) => cHE.getPointByInnerAngle(t).x;
var { a, b, c } = Polynomial.getQuadraticCoefficientsLagrange(0, af(0), 0.01, af(0.01), 0.02, af(0.02));
console.log( a*0.015**2+b*0.015+c - af(0.015) );
Polynomial.findOrderRichardson( 0.5, af(0.02), af(0.02/0.5), af(0.02/0.25) )
*/
Polynomial.findOrderRichardson = function(t, ah, aht, ahs) {

	var roots = Polynomial.solveQuadraticEqn(

		aht - ahs,
		ahs - ah,
		ah - aht
	);

	// It seems 1 root is always 1 ?
	//console.log(roots);

	if (!roots)
		return 0;

	var u = Math.abs(roots.x1 - 1) > Math.abs(roots.x2 - 1) ? roots.x1 : roots.x2;

	var k0 = Math.log(u) / Math.log(t);

	if ( !(k0 > 0) || k0 === Infinity ) {
		Report.warn("findOrderRichardson", `t=${t} ${roots} u=${u} k0=${k0}`);
		return 0;
	}

	return k0;
}




export { Polynomial };

