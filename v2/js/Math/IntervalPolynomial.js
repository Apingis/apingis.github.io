
class IntervalPolynomial extends Array {

	constructor(n) {

		super(n).fill(0).forEach( (int, i) => this[i] = new IntervalPolynomial.Interval );
	}


	clear() {
		this.forEach( int => int.set() );
		return this;
	}


	clone() {

		var p = new IntervalPolynomial(this.length);

		p.forEach( (int, i) => int.copy(this[i]) );

		return p;
	}


	copy(p) {

		console.assert(p instanceof IntervalPolynomial);

		for (let i = 0, len = this.length; i < len; i++)
			this[i].copy(p[i]);

		return this;
	}


	add(p) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i].addInterval(p[i]);

		return this;
	}


	setSum(p1, p2) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i].copy(p1[i]).addInterval(p2[i]);

		return this;
	}


	sub(p) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i].subInterval(p[i]);

		return this;
	}


	multiplyScalar(scalar) {

		for (let i = 0, len = this.length; i < len; i++)
			this[i].multiply(scalar);

		return this;
	}


	copyShiftRight(p, n = 1) {

		var len = p.length;

		if (len + n !== this.length)
			Report.warn("copyShiftRight: length mismatch", `src=${len} dst=${this.length}`);

		for (let i = 0; i < n; i++)
			this[i].set();

		for (let i = 0; i < len; i++)
			this[i + n].copy(p[i]);

		return this;
	}


	setDerivatives_cos( t1, t2, factor = 1 ) {

		var cos1 = t1 === Math.PI / 2 ? 0 : factor * Math.cos(t1), sin1 = factor * Math.sin(t1);
		var cos2 = t2 === Math.PI / 2 ? 0 : factor * Math.cos(t2), sin2 = factor * Math.sin(t2);
		var a, b;

		for (let i = 0, len = this.length; i < len; i += 2) {

			this[i].a = Math.min(cos1, cos2);
			this[i].b = Math.max(cos1, cos2);

			if (i === len - 1)
				break;

			cos1 = -cos1; cos2 = -cos2; sin1 = -sin1; sin2 = -sin2;

			this[i + 1].a = Math.min(sin1, sin2);
			this[i + 1].b = Math.max(sin1, sin2);
		}

		return this;
	}


	setDerivatives_sin( t1, t2, factor = 1 ) {

		var cos1 = t1 === Math.PI / 2 ? 0 : factor * Math.cos(t1), sin1 = factor * Math.sin(t1);
		var cos2 = t2 === Math.PI / 2 ? 0 : factor * Math.cos(t2), sin2 = factor * Math.sin(t2);
		var a, b;

		for (let i = 0, len = this.length; i < len; i += 2) {

			this[i].a = Math.min(sin1, sin2);
			this[i].b = Math.max(sin1, sin2);

			if (i === len - 1)
				break;

			this[i + 1].a = Math.min(cos1, cos2);
			this[i + 1].b = Math.max(cos1, cos2);

			cos1 = -cos1; cos2 = -cos2; sin1 = -sin1; sin2 = -sin2;
		}

		return this;
	}


	setDerivatives_pow(t1, t2, n, factor = 1) {

		var N = this.length - 1;

		if ( !Number.isFinite(t1 + t2) )
			Report.throw("arg is not finite", `t1=${t1} t2=${t2} n=${n} f=${factor}`);

		var	zeroT1 = Math.abs(t1) < 1e-308,
			zeroT2 = Math.abs(t2) < 1e-308;

		var	caseNum = 0;

		if (zeroT1 || zeroT2) {

			if (n >= 0 && n - N <= 0 && Number.isInteger(n)) {
				caseNum = 1;

			} else if (n - N > 0) {
				caseNum = 2;
				//Report.warn("function and the derivatives are all 0", `t1=${t1} t2=${t2} n=${n}`);

			} else {
				caseNum = 3;
				Report.warn("undefined result, setting 0", `t1=${t1} t2=${t2} n=${n}`);
			}
		}

		var setPowComponent = (id, t) => {

			var	curr_n = n, curr_nFactor = curr_n;

			if (caseNum === 1) {

				this[0].setComponent(id, n === 0 ? factor : 0);

				for (let i = 1; i <= N; i++) {

					this[i].setComponent(id, n - i === 0 ? factor * curr_nFactor : 0);
					curr_nFactor *= --curr_n;
				}

				return;

			} else if (caseNum !== 0) {

				for (let i = 0; i <= N; i++)
					this[i].setComponent(id, 0);

				return;
			}

			var value = factor * t **n;

			if (!Number.isFinite(value))
				Report.throw("not finite 1", `id=${id} t=${t} n=${n} f=${factor} v=${value}`);

			this[0].setComponent(id, value);

			for (let i = 1; i <= N; i++) {

				value /= t;

				let result = value * curr_nFactor;

				if (!Number.isFinite(result))
					Report.throw("not finite 2", `id=${id} i=${i} t=${t} n=${n} v=${value} result=${result}`);

				this[i].setComponent(id, result);
				curr_nFactor *= --curr_n;
			}
		};

		setPowComponent(0, t1);
		setPowComponent(1, t2);

		return this;
	}



	derivativesPow(arg, n, factor) {

		if (typeof arg == 'number') {

			if (factor !== undefined)
				Report.throw("derivativesPow bad usage");

			factor = n;
			n = arg;
			arg = this.getTmpPolynomial().copy(this);
		}

		if (arg === this)
			Report.throw("derivativesPow arg === this");

		if (this.length > arg.length)
			Report.warn("length mismatch", `this=${this.length} arg=${arg.length}`);

		this.setDerivatives_pow(arg[0].a, arg[0].b, n, factor);

		return this.setChainedDerivatives(this, arg);
	}


	setChainedDerivatives(f, g) {

		var fn = IntervalPolynomial._fn_setChainedDerivatives;

		if (!fn)
			fn = IntervalPolynomial._fn_setChainedDerivatives
				= IntervalPolynomial._createFn_setChainedDerivatives();

		return fn.call(this, f, g);
	}


	setDerivatives_product(fx_d, gx_d) {

		var N = this.length - 1; // N: max.order of derivative (=number of derivatives).

		var sum = this._getTmpInterval();
		var f0 = fx_d[0], g0 = gx_d[0];

		for (let n = N; n > 1; n--) {

			sum.setProduct(fx_d[n], g0).addProduct(f0, gx_d[n]);

			let binomial = 1;

			for (let k = 1; k < n; k++) {

				binomial = (binomial * (n + 1 - k)) / k;

				sum.addProduct( fx_d[n - k], gx_d[k], binomial );
			}

			this[n].copy(sum);
		}

		if (N > 0)
			this[1].setProduct(fx_d[1], g0).addProduct(f0, gx_d[1]);

		this[0].setProduct(f0, g0);

		return this;
	}


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
			this[i].a /= factorial;
			this[i].b /= factorial;
		}

		return this;
	}


	sumSeriesMax(t, N = this.length - 1) {

		var variable = 1, result = 0;

		for (let i = 0; i <= N; i++) {

			let a = this[i].a, b = this[i].b;

			result += (Math.abs(a) < Math.abs(b) ? b : a) * variable;
			variable *= t;
		}

		return result;
	}


	getTmpPolynomial(N = this.length - 1) {

		return IntervalPolynomial._tmpPolynomials[N] ||
			( IntervalPolynomial._tmpPolynomials[N] = new IntervalPolynomial(N + 1) );
	}

	_getTmpInterval() {

		return IntervalPolynomial._tmpInterval ||
			( IntervalPolynomial._tmpInterval = new IntervalPolynomial.Interval );
	}

	static _getTmpIntervalById(id) {

		return IntervalPolynomial._tmpIntervalById[ id ] ||
			( IntervalPolynomial._tmpIntervalById[ id ] = new IntervalPolynomial.Interval );
	}

	_getTmpIntervalById(id) { return IntervalPolynomial._getTmpIntervalById(id) }

}



Object.assign( IntervalPolynomial, {

	_tmpPolynomials: {},
	_tmpInterval: null,
	_tmpIntervalById: {},
	_fn_setChainedDerivatives: null,
});



IntervalPolynomial._createFn_setChainedDerivatives_1 = function() {

	var maxN = Polynomial.DERIVATIVES_MAX;

	var text = `	// Auto-generated.

	var N = this.length - 1;

	this[0].copy(f[0]);

	if (N === 0)
		return this;

	var _getIdFn = IntervalPolynomial._getTmpIntervalById;

	var f1 = _getIdFn('f1').copy(f[1]), g1 = g[1];

	this[1].setProduct(f1, g1);

	if (N === 1)
		return this;

	var f2 = _getIdFn('f2').copy(f[2]), g2 = g[2], g1_2 = _getIdFn('g1_2').setProduct(g1, g1);

	this[2].setProduct(f1, g2).addProduct(f2, g1_2);

	if (N === 2)
		return this;

	var _fAcc = _getIdFn('_fAcc'), _fNAcc  = _getIdFn('_fNAcc');
`;

	for (let n = 3; n <= maxN; n++) {

		let varDecl = `var f${n} = _getIdFn('f${n}').copy(f[${n}]), g${n} = g[${n}],`
			+ ` g1_${n} = _getIdFn('g1_${n}').setProduct(g1_${n-1}, g1)`;

		for (let j = 2; j <= n / 2; j++) {
			// x_j
			if ( n / j === Math.floor(n / j) )
				varDecl += `, g${j}_${n/j} = _getIdFn('g${j}_${n/j}')`
					+ `.setProduct(`
					+ (n / j === 2 ? `g${j}` : `g${j}_${n/j-1}`) +  `, g${j})`;
		}


		text += `
	${varDecl};

	this[${n}].setProduct(f1, g${n}).addProduct(f${n}, g1_${n}); `;

		for (let k = 2; k < n; k++) {

			text += '_fAcc.set(0);\n';

			let B = BellPolynomial.get(n, k);

			B.forEach( (part, partNum) => {

				let gName1 = `g${part[1]}` + (part[2] === 1 ? '' : `_${part[2]}`);

				if (part.length === 3) {

					text += `\t\t_fNAcc.copy(${gName1}).multiply(${part[0]})`;

				} else {

					let gName2 = `g${part[3]}` + (part[4] === 1 ? '' : `_${part[4]}`);

					text += `\t\t_fNAcc.setProduct(${gName1}, ${gName2}).multiply(${part[0]})`

					for (let i = 5; i < part.length; i += 2) {

						let gName = `g${part[i]}` + (part[i + 1] === 1 ? '' : `_${part[i+1]}`);

						text += `.multiplyInterval(${gName})`;
					}
				}

				text += '; _fAcc.addInterval(_fNAcc)\n';
			});

			text += `\tthis[${n}].addProduct(f${k}, _fAcc);`;
		}

		text += `

	if (N === ${n})
		return this;
`
	}

	text += `
	Report.once("IntervalPolynomial.chainedDerivatives", "maxN=${maxN}");

	return this;
`;

	//console.log(text);
	//console.log(`IntervalPolynomial.setChainedDerivatives.length=${text.length}`);

	var fn = new Function('f, g', text);

	Object.defineProperty(fn, 'name', { value: `IntervalPolynomial.setChainedDerivatives_max${maxN}` });

	return fn;
}



IntervalPolynomial._createFn_setChainedDerivatives = function() {

	var maxN = Polynomial.DERIVATIVES_MAX;

	var textWrap = `	// Auto-generated.

var f1 = new IntervalPolynomial.Interval;
var f2 = new IntervalPolynomial.Interval;
var g1_2 = new IntervalPolynomial.Interval;
var _fAcc = new IntervalPolynomial.Interval, _fNAcc = new IntervalPolynomial.Interval;
`;

	var text = `return function IntervalPolynomial_setChainedDerivatives_max${maxN}(f, g) {

	var N = this.length - 1;

	this[0].copy(f[0]);

	if (N === 0)
		return this;

	//var _getIdFn = IntervalPolynomial._getTmpIntervalById;

	//var f1 = _getIdFn('f1').copy(f[1]), g1 = g[1];
	var g1 = g[1];
	f1.copy(f[1]);

	this[1].setProduct(f1, g1);

	if (N === 1)
		return this;

	//var f2 = _getIdFn('f2').copy(f[2]), g2 = g[2], g1_2 = _getIdFn('g1_2').setProduct(g1, g1);
	var g2 = g[2];
	f2.copy(f[2]); g1_2.setProduct(g1, g1);

	this[2].setProduct(f1, g2).addProduct(f2, g1_2);

	if (N === 2)
		return this;

	//var _fAcc = _getIdFn('_fAcc'), _fNAcc  = _getIdFn('_fNAcc');
`;

	for (let n = 3; n <= maxN; n++) {

		textWrap += `var f${n} = new IntervalPolynomial.Interval;
var g1_${n} = new IntervalPolynomial.Interval;\n`;

		//let varDecl = `var f${n} = _getIdFn('f${n}').copy(f[${n}]), g${n} = g[${n}],`
		//	+ ` g1_${n} = _getIdFn('g1_${n}').setProduct(g1_${n-1}, g1)`;
		let varDecl = `var g${n} = g[${n}];`;
		let varInit = `f${n}.copy(f[${n}]); g1_${n}.setProduct(g1_${n-1}, g1);`;

		for (let j = 2; j <= n / 2; j++) {
			// x_j
			if ( n / j === Math.floor(n / j) ) {
				//varDecl += `, g${j}_${n/j} = _getIdFn('g${j}_${n/j}')`
				//	+ `.setProduct(`
				//	+ (n / j === 2 ? `g${j}` : `g${j}_${n/j-1}`) +  `, g${j})`;
				textWrap += `var g${j}_${n/j} = new IntervalPolynomial.Interval;\n`;
				varInit += ` g${j}_${n/j}.setProduct(`
					+ (n / j === 2 ? `g${j}` : `g${j}_${n/j-1}`) + `, g${j});`;
			}
		}


		text += `
	${varDecl}
	${varInit}

	this[${n}].setProduct(f1, g${n}).addProduct(f${n}, g1_${n}); `;

		for (let k = 2; k < n; k++) {

			text += '_fAcc.set(0);\n';

			let B = BellPolynomial.get(n, k);

			B.forEach( (part, partNum) => {

				let gName1 = `g${part[1]}` + (part[2] === 1 ? '' : `_${part[2]}`);

				if (part.length === 3) {

					text += `\t\t_fNAcc.copy(${gName1}).multiply(${part[0]})`;

				} else {

					let gName2 = `g${part[3]}` + (part[4] === 1 ? '' : `_${part[4]}`);

					text += `\t\t_fNAcc.setProduct(${gName1}, ${gName2}).multiply(${part[0]})`

					for (let i = 5; i < part.length; i += 2) {

						let gName = `g${part[i]}` + (part[i + 1] === 1 ? '' : `_${part[i+1]}`);

						text += `.multiplyInterval(${gName})`;
					}
				}

				text += '; _fAcc.addInterval(_fNAcc)\n';
			});

			text += `\tthis[${n}].addProduct(f${k}, _fAcc);`;
		}

		text += `

	if (N === ${n})
		return this;
`
	}

	text += `
	Report.once("IntervalPolynomial.chainedDerivatives", "maxN=${maxN}");

	return this;
};
`;

	var resultText = `${textWrap}\n\n${text}`;

	//console.log(resultText);
	//console.log(`IntervalPolynomial.setChainedDerivatives.length=${resultText.length}`);

	var fnWrapper = new Function('', resultText);
	var fn = fnWrapper();

	Object.defineProperty(fn, 'name', { value: `IntervalPolynomial_setChainedDerivatives_max${maxN}` });

	return fn;
}



IntervalPolynomial.Interval = function(a = 0, b = 0) {

	this.a = a;
	this.b = b;
}



Object.assign( IntervalPolynomial.Interval.prototype, {

	clone() { return new IntervalPolynomial.Interval(this.a, this.b) },

	copy(int) {
		this.a = int.a;
		this.b = int.b;
		return this;
	},

	set(a = 0, b = a) {
		this.a = a;
		this.b = b;
		return this;
	},

	setComponent(id, value) {
		if (id === 0) { this.a = value }
		else { this.b = value }
		return this;
	},

	maxAbs() { return Math.max( Math.abs(this.a), Math.abs(this.b) ) },


	add(c) {
		this.a += c;
		this.b += c;
		return this;
	},

	addInterval(int) {
		this.a += int.a;
		this.b += int.b;
		return this;
	},

	sub(c) {
		this.a -= c;
		this.b -= c;
		return this;
	},

	subInterval(int) {
		this.a -= int.b;
		this.b -= int.a;
		return this;
	},


	normalize() {

		if (this.a > this.b) {
			let tmp = this.a; this.a = this.b; this.b = tmp;
		}

		return this;
	},


	multiply(c) {
		this.a *= c;
		this.b *= c;
		return this.normalize();
	},


	multiplyInterval(int) {
		this.setProduct(this, int);
		return this;
	},


	setProduct(int1, int2) {

		var	a = Math.min( int1.a * int2.a, int1.a * int2.b, int1.b * int2.a, int1.b * int2.b ),
			b = Math.max( int1.a * int2.a, int1.a * int2.b, int1.b * int2.a, int1.b * int2.b );

		this.a = a;
		this.b = b;

		return this;
	},


	addProduct(int1, int2, c) {

		var	a = Math.min( int1.a * int2.a, int1.a * int2.b, int1.b * int2.a, int1.b * int2.b ),
			b = Math.max( int1.a * int2.a, int1.a * int2.b, int1.b * int2.a, int1.b * int2.b );

		if (c !== undefined) {
			a *= c; b *= c;
			if (a > b) {
				let tmp = a; a = b; b = tmp;
			}
		}

		this.a += a;
		this.b += b;

		return this;
	},


	pow(n) {
		this.a **= n;
		this.b **= n;
		return this.normalize();
	},

});




export { IntervalPolynomial }

