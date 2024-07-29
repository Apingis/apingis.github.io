
class Angle {

	constructor() { Report.throwStatic(); }


	static normalize(a) { // returns in the range [-PI..PI] (exactly as Math.atan2)
// TODO why not exclude +PI?
		if (Math.abs(a) >= 2 * Math.PI)
			a %= 2 * Math.PI;

		if (a < -Math.PI)
			a += 2 * Math.PI;

		else if (a > Math.PI)
			a -= 2 * Math.PI;

		return a;
	}


	static normalize02(a) { // returns in the range [0..2PI)

		if (Math.abs(a) >= 2 * Math.PI)
			a %= 2 * Math.PI;

		if (a < 0) {

			a += 2 * Math.PI;

			if (a >= 2 * Math.PI) // -Number.EPSILON*2 + 2 * Math.PI === 2 * Math.PI
				a = 0;
		}

		return a;
	}


	static getQuadNum(a) { // normalized
		return a < 0 ? (a >= -Math.PI / 2 ? 3 : 2) : (a >= Math.PI / 2 ? 1 : 0);
	}

	static toQuad0(a) { // normalized
		a = Math.abs(a);
		return a <= Math.PI / 2 ? a : Math.PI - a;
	}

	static toQuadNum(a, quadNum) {
		if (quadNum === 1 || quadNum === 2)
			a = Math.PI - a;
		return quadNum <= 1 ? a : -a;
	}

	static quadMin(a) {
		return Math.floor( a / (Math.PI / 2) ) * (Math.PI / 2);
	}


	static fromLine3(line3) {
		return Math.atan2(line3.end.z - line3.start.z, line3.end.x - line3.start.x);
	}

	static opposite(a) { // normalized arg.
		return a + (a < 0 ? Math.PI : -Math.PI);
	}

	static of3(ax, ay, bx, by, cx, cy) { // A-B-C; may be negative
		return this.normalize(Math.atan2(by - ay, bx - ax)
			- Math.atan2(by - cy, bx - cx) );
	}

	static avg(a1, a2) { // normalized input
		var result = (a1 + a2) / 2;
		return Math.abs(a1 - a2) < Math.PI ? result
			: result + (result < 0 ? Math.PI : -Math.PI);
	}


	static obtuseAvgOf3(ax, ay, bx, by, cx, cy) { // A-B-C

		var angleAB = Math.atan2(by - ay, bx - ax),
			angleCB = Math.atan2(by - cy, bx - cx);

		return this.avg(angleAB, angleCB);
	}


	// is a1 to the left of a2? (CCW, normalized)
	static isLeft(a1, a2) {

		if (Math.abs(a1 - a2) < Math.PI)
			return a1 > a2;

		if (a2 < a1)
			return a1 > a2 + 2 * Math.PI;
		else
			return a1 + 2 * Math.PI > a2;
	}


	// Return difference (a1 - a0) in specified direction (-1: right CW, 1: left CCW)
	static diffInDirection(a0, directionSign, a1) {

		if (directionSign < 0)
			return a0 - (a1 <= a0 ? a1 : a1 - 2 * Math.PI);
		else
			return a0 - (a1 >= a0 ? a1 : a1 + 2 * Math.PI);
	}


	static subCCW(a1, a0) {
		return a0 - (a1 >= a0 ? a1 : a1 + 2 * Math.PI);
	}


	// Given a0 and direction (-1: right CW, 1: left CCW), return closest to a0
	static closestInDirection(a0, directionSign, a1, a2) {

		if (directionSign < 0)
			return (a1 <= a0 ? a1 : a1 - 2 * Math.PI) > (a2 <= a0 ? a2 : a2 - 2 * Math.PI)
				? a1 : a2;
		else
			return (a1 >= a0 ? a1 : a1 + 2 * Math.PI) < (a2 >= a0 ? a2 : a2 + 2 * Math.PI)
				? a1 : a2;
	}

	//
	// Given L,R, perform the following:
	// L must not be < R
	// R must be >= -PI && < PI
	// Returns static array of 2 elems.
	//
	static normalizeLR(left, right) {

		if (left < right)
			left += 2 * Math.PI;

		if (right < -Math.PI) {
			right += 2 * Math.PI;
			left += 2 * Math.PI;

		} else if (right >= Math.PI) {
			right -= 2 * Math.PI;
			left -= 2 * Math.PI;
		}

		this._normalizeLR[0] = left;
		this._normalizeLR[1] = right;
		return this._normalizeLR;
	}


	static avgLR(left, right) { // in, out - normalized (?)
		var res = ((left >= right ? left : left + 2 * Math.PI) + right) / 2;
		return res <= Math.PI ? res : res - 2 * Math.PI;
	}

	static diffLR(left, right) { // in, out - normalized, or localized to sector
		return (left >= right ? left : left + 2 * Math.PI) - right;
	}

	static absDiff(a0, a1) { return Math.abs(this.normalize(a0 - a1)); }

	static sub(a0, a1) { return this.normalize(a0 - a1); }

	static add(a0, a1) { return this.normalize(a0 + a1); }

	// circular interpolate in the direction where it's closer.
	static clerpShort(a0, a1, t) {
		return this.normalize(a0 - this.sub(a0, a1) * t);
	}

/*
	static thisOrOpposite(a, a0) { // normalized input angles.
		return this.absDiff(a, a0) < Math.PI / 2 ? a0 : Angle.opposite(a0);
	}
*/
}

Angle._normalizeLR = [ undefined, undefined ];



class HorizontalLine extends Number {

	intersectSegment(segment) {
		var t = (this - segment.p1.y) / (segment.p2.y - segment.p1.y);
		if (t > 1 || t < 0)
			return;
		return segment.p1.x + t * (segment.p2.x - segment.p1.x);
	}
}



class PolarCoords {

	constructor(r = 0, phi = 0) {
		this.r = r;
		this.phi = phi;
	}

	toString() { return `(r=${this.r}, phi=${this.phi})`; }

	set(r, phi) {
		this.r = r;
		this.phi = phi;
		return this;
	}

	setFromCartesian(x, y) {
		this.r = Math.sqrt(x * x + y * y);
		this.phi = Math.atan2(y, x);
		return this;
	}
}



class ComplexNumber {

	constructor(re = 0, im = 0) {
		this.re = re;
		this.im = im;
	}

	toString() { return `(${this.re} + ${this.im}i)`; }

	clone() { return new ComplexNumber(this.re, this.im); }

	set(re, im = 0) {
		this.re = re;
		this.im = im;
		return this;
	}

	copy(complexNumber) {
		this.re = complexNumber.re;
		this.im = complexNumber.im;
		return this;
	}

	arg() { return Math.atan2(this.im, this.re) }

	rSq() { return this.re * this.re + this.im * this.im }

	mod() { return Math.sqrt(this.rSq()) }


	root(n, k = 0) {

		var r = Math.pow(this.rSq(), 1 / (2 * n)),
			theta = (Math.atan2(this.im, this.re) + 2 * Math.PI * k) / n;

		this.re = r * Math.cos(theta);
		this.im = r * Math.sin(theta);
		return this;
	}


	sqrt() { return this.root(2); }

	setFromSqrtOfReal(number) {
		var r = Math.sqrt(Math.abs(number));
		this.re = number < 0 ? 0 : r;
		this.im = number < 0 ? r : 0;
		return this;
	}

	multiplyReal(number) {
		this.re *= number;
		this.im *= number;
		return this;
	}


	multiplyComplex(complexNumber) {

		return this.set(
			this.re * complexNumber.re - this.im * complexNumber.im,
			this.re * complexNumber.im + this.im * complexNumber.re
		);
	}


	divideByComplex(divisor) {

		var rSq = divisor.rSq();

		return this.set(
			(this.re * divisor.re + this.im * divisor.im) / rSq,
			(this.im * divisor.re - this.re * divisor.im) / rSq
		);
	}


	setFromRealDividedByComplex(number, divisor) {
		var rSq = divisor.rSq();
		this.re = divisor.re * number / rSq;
		this.im = -divisor.im * number / rSq;
		return this;
	}

	addReal(number) {
		this.re += number;
		return this;
	}

	subFromReal(number) {
		this.re = number - this.re;
		this.im = -this.im;
		return this;
	}

	addComplex(complexNumber) {
		this.re += complexNumber.re;
		this.im += complexNumber.im;
		return this;
	}

	subComplex(complexNumber) {
		this.re -= complexNumber.re;
		this.im -= complexNumber.im;
		return this;
	}


	powComplex(cN) {

		var arg = this.arg();
		var exp = Math.pow(this.rSq(), cN.re / 2) * Math.exp(-cN.im * arg);
		var theta = cN.re * arg + (1/2) * cN.im * Math.log(this.rSq());

		this.re = exp * Math.cos(theta);
		this.im = exp * Math.sin(theta);

		return this;
	}


	pow(n) {

		var	exp = Math.pow(this.rSq(), n / 2);
		var	arg = this.arg();

		this.re = exp * Math.cos(n * arg);
		this.im = exp * Math.sin(n * arg);

		return this;
	}


	cos() {
		return this.set(
			Math.cos(this.re) * Math.cosh(this.im),
			-Math.sin(this.re) * Math.sinh(this.im)
		);
	}

	sin() {
		return this.set(
			Math.sin(this.re) * Math.cosh(this.im),
			Math.cos(this.re) * Math.sinh(this.im)
		);
	}
}




class DST extends Array { // DST-IV

	set(data) {

		var N = data.length;

		if (this.length > N)
			this.length = N;

		for (let k = 0; k < N; k++) {

			let sum = 0;

			data.forEach( (x, n) => {

				sum += x * Math.sin( Math.PI / N * (n + 1/2) * (k + 1/2) );
			});

			this[k] = sum;
		}

		return this;
	}


	interpolate(t) { // t E [0, 1]

		var N = this.length; // n = 0, ..., N - 1
		var sum = 0;

		this.forEach( (Xn, k) => {

			sum += Xn * Math.sin( Math.PI * (k + 1/2) * t );
		});

		return 2 / N * sum;
	}

}




class DFT extends Array {

	constructor(N) {

		super(N).fill(null);
	}


	// https://en.wikipedia.org/wiki/Discrete_Fourier_transform
	//
	// d = new DFT(4).set([ new ComplexNumber(1,0), new ComplexNumber(2,-1), new ComplexNumber(0,-1), new ComplexNumber(-1,2) ])
	// d = new DFT(3).set([ new ComplexNumber(1,0), new ComplexNumber(2,-1), new ComplexNumber(0,-1) ])

	set(data) {

		var N = data.length;

		console.assert(N === this.length);

		this.forEach( (elem, k) => {

			this[k] = data.reduce( (accum, x, n) => {

				if ( !(x instanceof ComplexNumber) )
					x = new ComplexNumber(x);

				var exp = new ComplexNumber(0, -1).multiplyReal(2 * Math.PI * k / N * n);

				x = x.clone().multiplyComplex( new ComplexNumber(Math.E).powComplex(exp) );

				return accum.addComplex(x);

			}, new ComplexNumber);
		});

		return this;
	}


	interpolate(t) {

		var N = this.length; // n = 0, ..., N - 1
		var sum = new ComplexNumber;

		this.forEach( (Xn, k) => {

			if (k === N / 2) {

				Xn = Xn.clone().multiplyReal( Math.cos(N * Math.PI * t) );
				sum.addComplex(Xn);
/*
let arg = N * Math.PI * t;
console.warn(`k=${k} Xn=${Xn} arg=${arg} cos=${Math.cos(arg)}`);
console.log(`sum=${sum.re}`);
*/
				return;
			}

			// e^(ix) + e^(-ix) = 2 cos x

			var exp = new ComplexNumber(0, k < N / 2 ? 1 : -1).multiplyReal(2 * Math.PI * t * (k < N / 2 ? k : N - k));

//var arg = 2 * Math.PI * t * (k < N / 2 ? k : N - k);
//console.log(`k=${k} Xn=${Xn} term=${new ComplexNumber(Math.E).powComplex(exp).re}`);

			Xn = Xn.clone().multiplyComplex( new ComplexNumber(Math.E).powComplex(exp) );

			sum.addComplex(Xn);
//console.log(`sum=${sum.re}`);
		});

		return sum.multiplyReal(1 / N);
	}

}



class DCT {

	constructor() {

		this.dFT = null;
	}


	set(data) {

		data = Array.from(data);

		for (let i = 1, len = data.length; i < len - 1; i++)
			data.push(data[len - 1 - i]);

		this.dFT = new DFT(data.length).set(data);

		return this;
	}


	interpolate(t) {

		return this.dFT.interpolate(t / 2).re;
	}

}





export { Angle, HorizontalLine, PolarCoords, ComplexNumber, DFT, DCT, DST };

