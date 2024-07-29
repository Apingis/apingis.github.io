

class DifferentiableCurve {

	constructor(arg = {}) {

		this.arg = arg;

		if (!arg.targetRelError)
			arg.targetRelError = 1e-10;

		if (!arg.nDerivatives)
			arg.nDerivatives = 7;

		this.intervals = [];
		this.totalLen = 0;
		this.absError = 0;
		this.relError = null;
		this.midPointInterval = null;

		this.maxLevel = 0;
		this.replacementAttempts = 0;
		this.maxAbsTerm_L_t = 0;
		this.maxAbsTerm_other = 0;

		this._tmp = {};
		this._dataBlock = null;

		this._createIntervals();
	}


	toString() { return `<DifferentiableCurve ${this.arg.name} l=${this.totalLen}>` }


	// ==================================================================

	getIntervalByParameter(t) {

		if (t < this.start || t > this.end)
			return Report.warn("parameter is not in the range", `${this.start} ${this.end} ${this}`);

		var i = Util.bsearch( this.intervals, int => t - int.tEnd );

		if (i < 0)
			return Report.warn("entry not found", `i=${i} t=${t} ${this}`);

		return this.intervals[i];
	}


	getLengthByParameter(t) {

		var int = this.getIntervalByParameter(t);

		return int.polynomial_L_t.sumSeries(t - int.t0);
	}


	getLengthByPoint(p) { return this.getLengthByCoords(p.x, p.y) }


	getLengthByCoords(x, y) {

		if (x < this.arg.midPoint.x) {

			let i = Util.bsearch( this.intervals, int => int.p.x - x, this.midPointInterval.i );

			if (i < 0)
				return Report.warn("interval (x) not found", `i=${i} t=${t} ${this}`);

			let int = this.intervals[i];

			this._createPolynomials_all(int);

			return int.polynomial_L_x.sumSeries(x - int.x0);
		}

		var i = Util.bsearch( this.intervals, int => y - int.p.y, undefined, this.midPointInterval.i );

		if (i < 0)
			return Report.warn("interval (y) not found", `i=${i} t=${t} ${this}`);

		var int = this.intervals[i];

		this._createPolynomials_all(int);

		return int.polynomial_L_y.sumSeries(y - int.y0);
	}


	getIntervalByLength(len) {

		if (len < 0 || len > this.totalLen)
			return Report.warn("length is not in the range", `0...${this.totalLen} ${this}`);

		var i = Util.bsearch( this.intervals, int => len - int.lenEnd );

		if (i < 0)
			return Report.warn("entry not found", `i=${i} len=${len} ${this}`);

		var int = this.intervals[i];

		this._createPolynomials_all(int);

		return int;
	}


	getParameterByLength(len) {

		var int = this.getIntervalByLength(len);

		return int.polynomial_t_L.sumSeries(len - int.len0);
	}


	getPointByLength(len) {

		var int = this.getIntervalByLength(len);

		var p = DifferentiableCurve._pointByLength || (
					DifferentiableCurve._pointByLength = new Point );

		return p.set(
			int.polynomial_x_L.sumSeries(len - int.len0),
			int.polynomial_y_L.sumSeries(len - int.len0)
		);
	}


	getNormalByLength(len) {

		var int = this.getIntervalByLength(len);

		var p = DifferentiableCurve._normalByLength || (
					DifferentiableCurve._normalByLength = new Point );

		return p.set(
			int.polynomial_nx_L.sumSeries(len - int.len0),
			int.polynomial_ny_L.sumSeries(len - int.len0)
		);
	}


	checkPolynomial_1(p, x, id, int) {

return;
		for (let i = 1; i < p.length - 2; i++) {

			let termI = Math.abs(p[i] * x **i),
				termI1 = Math.abs(p[i + 1] * x **(i + 1)),
				termI2 = Math.abs(p[i + 2] * x **(i + 2));

			let ratio = termI1 / termI;

			//if ( termI1 > 1e-15 && termI <= termI1 )
			//	console.error(`${id} int=${int.i} i=${i} | ${termI.toExponential(1)} ${termI1.toExponential(1)} -> ${ratio.toExponential(1)}`);
			if ( termI2 > 1e-14 && termI <= termI2 && termI <= termI1 )
				console.error(`${id} int=${int.i} i=${i} | ${termI.toExponential(1)} ${termI1.toExponential(1)} ${termI2.toExponential(1)}`);
		}
	}


	_createPolynomials_all(int) { 

		if (int.polynomial_t_L)
			return;

this.checkPolynomial_1(int.polynomial_L_t, int.t0 - int.tEnd, `L_t`, int);

		int.len0 = int.polynomial_L_t[0];
		int.polynomial_t_L = int.polynomial_L_t.clone().setReversed();
		int.polynomial_t_L[0] = int.t0;

this.checkPolynomial_1(int.polynomial_t_L, int.len0 - int.lenEnd, `t_L`, int);


		//var theta_t = this.arg.fn_getPolynomial_theta_t( this.arg.nDerivatives, int.t0 );
		//int.theta_t = theta_t.clone();


		var data = this.arg.fn_getIntervalPolynomials(int.polynomial_t_L);

		int.polynomial_x_L = data.x_L.clone();
		int.polynomial_y_L = data.y_L.clone();
		int.polynomial_nx_L = data.nx_L.clone();
		int.polynomial_ny_L = data.ny_L.clone();

this.checkPolynomial_1(int.polynomial_x_L, int.len0 - int.lenEnd, `x_L`, int);
this.checkPolynomial_1(int.polynomial_y_L, int.len0 - int.lenEnd, `y_L`, int);
this.checkPolynomial_1(int.polynomial_nx_L, int.len0 - int.lenEnd, `nx_L`, int);
this.checkPolynomial_1(int.polynomial_ny_L, int.len0 - int.lenEnd, `ny_L`, int);

		this.maxAbsTerm_other = Math.max(

			this.maxAbsTerm_other,

			int.polynomial_t_L.getMaxAbsTerm(),

			int.polynomial_x_L.getMaxAbsTerm(),
			int.polynomial_y_L.getMaxAbsTerm(),
			int.polynomial_nx_L.getMaxAbsTerm(),
			int.polynomial_ny_L.getMaxAbsTerm(),
		);


		if (int.i >= this.midPointInterval.i) {

			int.x0 = int.polynomial_x_L[0];
			int.polynomial_L_x = int.polynomial_x_L.clone().setReversed();
			int.polynomial_L_x[0] = int.len0;
			this.maxAbsTerm_other = Math.max( this.maxAbsTerm_other, int.polynomial_L_x.getMaxAbsTerm() );

this.checkPolynomial_1(int.polynomial_L_x, int.x0 - int.p.x, `L_x`, int);
		}

		if (int.i <= this.midPointInterval.i) {

			int.y0 = int.polynomial_y_L[0];
			int.polynomial_L_y = int.polynomial_y_L.clone().setReversed();
			int.polynomial_L_y[0] = int.len0;
			this.maxAbsTerm_other = Math.max( this.maxAbsTerm_other, int.polynomial_L_y.getMaxAbsTerm() );

this.checkPolynomial_1(int.polynomial_L_y, int.y0 - int.p.y, `L_y`, int);
		}

	}


	// ============================================
	//
	//   Initialization
	//
	// ============================================

	_createIntervals() {

		console.assert(this.arg.intervals.length > 0);
		console.assert(this.intervals.length === 0);

		try {

			this.arg.intervals.forEach( descr => this._createIntervalsFromDescription(descr) );

		} catch (e) {

			if (!e.isReport)
				throw e;

			return;
		}


		var maxLen = 0, minLen = Infinity;

		this.intervals.forEach( (int, i) => { // TODO? summation error in total/intermediate length

			int.i = i;

			int.lenStart = this.totalLen;
			int.lenEnd = this.totalLen + int.len;
			this.totalLen += int.len;

			int.polynomial_L_t[0] = int.lenStart + int.len1;

			maxLen = Math.max(maxLen, int.len);
			minLen = Math.min(minLen, int.len);
		});

		//console.log(`maxLen=${maxLen}, minLen=${minLen} (minLen ints.=${Math.ceil(this.totalLen/minLen)})`);

		this.relError = this.absError / this.totalLen;

		this.midPointInterval = this.getIntervalByParameter( this.arg.midPointT );
	}


	_createIntervalsFromDescription(descr) {

		console.assert( descr.singularities.list.every(t => t === descr.start || t === descr.end) );

		var haveSingularity = (t) => descr.singularities.list.indexOf(t) !== -1;

		var total = descr.end - descr.start;

		var intFirst, intLast;

		if ( haveSingularity(descr.start) )

			intFirst = this._allocateSpecialInterval(descr.singularities.method,
				descr.start, descr.start + total / 8, 'start');

		if ( haveSingularity(descr.end) )

			intLast = this._allocateSpecialInterval(descr.singularities.method,
				descr.end - total / 8, descr.end, 'end');


		var	start = intFirst ? intFirst.tEnd : descr.start,
			end = intLast ? intLast.tStart : descr.end;

		var list = this._allocateIntervals_Recursive(start, end);


		intFirst && this.intervals.push(intFirst);

		this.intervals.push(...list);

		intLast && this.intervals.push(intLast);
	}


	_allocateSpecialInterval(method, start, end, towards, level = 0) {

		var	STEP_FACTOR = 0.5;

		if (Math.abs(end - start) < DifferentiableCurve.INTERVAL_MIN_WIDTH)
			Report.throw("Special interval is too small", `method=${method.name} ${this}`);

		this.replacementAttempts ++;

		var int = this._processSpecialInterval(method, start, end);

		if (int)
			return int;

		//if (method.name == 'interpolate')
		//	Report.throw("Special interval SKIPPED");

		if (towards == 'end')
			start = start + (1 - STEP_FACTOR) * (end - start);
		else
			end = end - (1 - STEP_FACTOR) * (end - start);

		return this._allocateSpecialInterval(method, start, end, towards, level + 1);
	}


	_processSpecialInterval(method, start, end) {

		//console.log(`SpecialInterval ${method.name} --> start=${start} end=${end} size=${Math.abs(end-start)}`);

		//if (method.name == 'fourier')
		//	return this._processInterpolationIntervalFourier(method, start, end);

		if (method.name == 'interpolate')
			return this._processInterpolationInterval(method, start, end);

		console.assert(method.name == 'reduceTaylorTerms');

		var N = method.N - 1; // 1 for error term

		console.assert(N >= 1);

		var int = this._processInterval( N, start, end );

		if (int) {
			int.comment = `reduceTaylorTerms N=${N}`;
		}

		return int;
	}


	_processInterpolationIntervalFourier(method, start, end) {

		var N_POINTS = 2000;
		var endFract = 0.15;
		var extIntervalLen = (end - start) / (1 - 2 * endFract);

		var t_valuesNorm = new Array(N_POINTS).fill(0);

		//t_valuesNorm.forEach( (el, i, arr) => arr[i] = (i + 0.5) / N_POINTS );
		t_valuesNorm.forEach( (el, i, arr) => arr[i] = i / (N_POINTS - 1) );

		var L_values = t_valuesNorm.map( t => {

			if (t < endFract)
				return -this.arg.fn_integrateLength( start, start + (endFract - t) * extIntervalLen );

			return this.arg.fn_integrateLength( start, start + (t - endFract) * extIntervalLen );
		});

		//var discreteTransform = new DST().set(L_values);
		var discreteTransform = new DCT().set(L_values);

console.log(t_valuesNorm, L_values);

		var N_POINTS_CHECK = 2 * N_POINTS;
		var sprng = new Util.SeedablePRNG(1);

		var maxRelDiff = 0, tMaxDiff;

		for (let i = 0; i < N_POINTS_CHECK; i++) {

			let t = sprng.random();

			if (t < endFract * 2 || t > 1 - endFract)
				continue;

			let L = discreteTransform.interpolate(t);
			let LRef = this.arg.fn_integrateLength( start, start + (t - endFract) * extIntervalLen );

			let relDiff = Math.abs(L - LRef) / L;
//console.log(`t=${t} L=${L} LRef=${LRef} relDiff=${relDiff}`);

			if (relDiff > maxRelDiff) {
				maxRelDiff = relDiff;
				tMaxDiff = t;
			}
		}

throw `thrown maxRelDiff=${maxRelDiff} t=${tMaxDiff}`;
	}


// cHE = new CoatedHyperEllipseBase(2.1, 2, 1, 1); d = cHE.getCurveLengthData(); c = d.intervals[0]._data.curve

	_processInterpolationInterval(method, start, end) {

//console.error(`InterpolationInterval start=${start} end=${end} size=${end-start}`);
	}


	_allocateIntervals_Recursive(start, end, level = 0, array = []) {

		if (Math.abs(end - start) < DifferentiableCurve.INTERVAL_MIN_WIDTH)
			Report.throw("interval width is too small", `w=${Math.abs(end-start)} lv=${level} ${this}`);

		if (level > 30)
			Report.throw("level excess", `l=${level} ${start} ${end} size=${end-start} ${this}`);

		this.maxLevel = Math.max(this.maxLevel, level);

		var t0 = 0.5 * (start + end);

		var allocateSplitIntervals = () => {

			this._allocateIntervals_Recursive(start, t0, level + 1, array);
			this._allocateIntervals_Recursive(t0, end, level + 1, array);

			return array;
		};


		var N = this.arg.nDerivatives;

		var int = this._processInterval( N, start, end );

		if (!int)
			return allocateSplitIntervals();

		array.push( int );

		return array;
	}


	_integrateRemainder(N, t0, t1, approxLen, expanAtT0) {

		var EPS_REL = 0.2 * this.arg.targetRelError;

		var eps = EPS_REL * approxLen;
		var terminateTotal = this.arg.targetRelError * approxLen;

		var remainder = NumericMethod.integrateAdaptiveSimpson(t0, t1, t => {

			var der = this.arg.fn_getPolynomial_L_t(N + 1, t)[N + 1];

			der *= N + 1;
			der *= (expanAtT0 ? (t1 - t) : (t0 - t)) **N;

			return Math.abs(der);

		}, 'integrateRemainder',
			{ debug: 1, eps,
				levelMax: 12, // limit fn.evals for runtime app.
				terminateEarly: { terminateTotal },
			}
		);

		return remainder + eps;
	}


	_processInterval(N, start, end) { // N: number of derivatives in resulting Taylor polynomial

		var t0 = 0.5 * (start + end);

		var L_t = this.arg.fn_getPolynomial_L_t(N + 1, t0);

		var len1 = Math.abs( L_t.sumSeries(start - t0), N );
		var len2 = Math.abs( L_t.sumSeries(end - t0), N );

		if ( !(len1 > 0 && len2 > 0) )
			Report.throw("Invalid interval length", `size=${end-start}`
				+ ` len1=${len1} len2=${len2} ${this}`);

		if (len1 + len2 > this.arg.lengthUpperBound)
			return;

		if ( Math.abs( L_t[N + 1] * (t0 - start) **(N + 1) )
				/ Math.min(len1, len2) > this.arg.targetRelError )
			return;

		var data = this._getIntervalDataObj(N);

		data.L_t.copy(L_t, N);


		var absErr1 = this._integrateRemainder(N, start, t0, len1, false);

		if ( absErr1 / len1 > this.arg.targetRelError )
			return;

		var absErr2 = this._integrateRemainder(N, t0, end, len2, true);

		if ( absErr2 / len2 > this.arg.targetRelError )
			return;

		data.comment = '';
		data.start = start; data.end = end; data.t0 = t0;
		data.len1 = len1; data.len2 = len2; data.len = len1 + len2;
		data.absError = absErr1 + absErr2;

		return this._createInterval(data);
	}


	_processInterval_LagrangeRemainder(N, start, end) { // N: number of derivatives in resulting Taylor polynomial

		var t0 = 0.5 * (start + end);
		var maxAbsErrX = Math.max(t0 - start, end - t0) **(N + 1);

		var err1_L_t = this.arg.fn_getIntervalError_L_t(N + 1, start, t0);
		var absErr1 = err1_L_t[N + 1].maxAbs() * maxAbsErrX;

		if (absErr1 > this.arg.lengthUpperBound)
			return;

		var maxLen1 = Math.abs( err1_L_t.sumSeriesMax(start - t0) );

		if (absErr1 / maxLen1 > this.arg.targetRelError)
			return;

		var data = this._getIntervalDataObj(N);

		data.err1_L_t.copy(err1_L_t);


		var err2_L_t = this.arg.fn_getIntervalError_L_t(N + 1, t0, end);
		var absErr2 = err2_L_t[N + 1].maxAbs() * maxAbsErrX;

		var maxLen2 = Math.abs( err1_L_t.sumSeriesMax(end - t0) );

		if (absErr2 / maxLen2 > this.arg.targetRelError)
			return;


		var L_t = this.arg.fn_getPolynomial_L_t(N, t0);

		var len1 = Math.abs( L_t.sumSeries(start - t0) );
		var len2 = Math.abs( L_t.sumSeries(end - t0) );

		if ( !(len1 > 0 && len2 > 0) )
			Report.throw("Invalid interval length", `size=${end-start}`
				+ ` len1=${len1} len2=${len2} ${this}`);

		if ( Math.max(absErr1 / len1, absErr2 / len2) > this.arg.targetRelError )
		//if ( absErr1 / len1 > this.arg.targetRelError )
			return;


		data.err2_L_t.copy(err2_L_t);
		data.L_t.copy(L_t);

		data.comment = '';
		data.start = start; data.end = end; data.t0 = t0;
		data.len1 = len1; data.len2 = len2; data.len = len1 + len2;
		data.absError = absErr1 + absErr2;

		return this._createInterval(data);
	}


	_getIntervalDataObj(N) {

		return DifferentiableCurve._intervalData[N] ||
				(DifferentiableCurve._intervalData[N] = {

			comment: '',
			start: 0, end: 0, t0: 0,
			len1: 0, len2: 0, len: 0,
			absError: 0,
			L_t: new Polynomial(N + 1),
			//err1_L_t: new IntervalPolynomial(N + 2),
			//err2_L_t: new IntervalPolynomial(N + 2),
		});
	}


	_createInterval(data) {

		//console.log(`created size=${data.end-data.start}`);
		//console.log(`created comment=${data.comment} size=${data.end-data.start}`
		//	+ ` start=${data.start} len=${data.len} absError=${data.absError}`);

		this.absError += data.absError;

		if (!data.L_t)
			console.error("!data.L_t", data);

		this.maxAbsTerm_L_t = Math.max( this.maxAbsTerm_L_t, data.L_t.getMaxAbsTerm() );

		var interval = Object.seal({

			lenStart: null,
			lenEnd: null,
			p: this.arg.fn_getPointByParameter(data.end).clone(),
			tStart: data.start,
			tEnd: data.end,
			t0: data.t0,
			polynomial_L_t: data.L_t.clone(),
			//err1_L_t: data.err1_L_t.clone(),
			//err2_L_t: data.err2_L_t.clone(),
			len1: data.len1,
			len2: data.len2,
			len: data.len,
			absError: data.absError,
			relError: data.absError / data.len,
			i: null,
			comment: data.comment,
			_data: {},

			len0: null,
			polynomial_t_L: null,
			polynomial_x_L: null,
			polynomial_y_L: null,
			polynomial_nx_L: null,
			polynomial_ny_L: null,

			x0: null, y0: null,
			polynomial_L_x: null, polynomial_L_y: null,

			theta0: null,
			theta_t: null,
		});

		return interval;
	}


	// =====================================
	//
	//   Geometry
	//
	// =====================================

	getMesh(nSegments) { return new THREE.Mesh( this.getGeometry(nSegments) ) }


	getGeometry(nSegments = 64) {

		console.assert(nSegments % 4 === 0);

		var NORMAL_FACTOR = 0.67;
		var n = nSegments / 4 + 1;

		var equidistant = this.getEquidistantParameters(n);
		var equinormal = this.getEquinormalParameters(n);

		var position = [];

		var lastP = new Point;

		var addSegment = (p, signX = 1, signY = 1) => {

			var Z = 1;

			p.x *= signX; p.y *= signY;

			position.push( lastP.x, lastP.y, 0,   p.x, p.y, 0,   lastP.x, lastP.y, Z );
			position.push( lastP.x, lastP.y, Z,   p.x, p.y, 0,   p.x, p.y, Z );

			lastP.copy(p);
		}

		var getPoint = (i) => {

			var a = NORMAL_FACTOR * equinormal[i] + (1 - NORMAL_FACTOR) * equidistant[i];

			return this.arg.fn_getPointByParameter(a);
		}


		lastP.copy( getPoint(0) );

		for (let i = 1; i < n; i++)
			addSegment( getPoint(i) );

		for (let i = n - 2; i >= 0; i--)
			addSegment( getPoint(i), -1, 1 );

		for (let i = 1; i < n; i++)
			addSegment( getPoint(i), -1, -1 );

		for (let i = n - 2; i >= 1; i--)
			addSegment( getPoint(i), 1, -1 );

		addSegment( getPoint(0) );

		var geometry = new THREE.BufferGeometry;

		geometry.setAttribute("position",
			new THREE.BufferAttribute( Float32Array.from(position), 3) );

		return Util.mergeVertices(geometry);
	}


	getEquidistantParameters(n) {

		var result = [ 0 ];

		for (let i = 1; i < n - 1; i++) {

			let len = this.totalLen / (n - 1) * i;

			result.push( this.getParameterByLength(len) );
		}

		result.push(Math.PI / 2);

		return result;
	}


	getEquinormalParameters(n) {

		var result = [ 0 ];

		for (let i = 1; i < n - 1; i++) {

			let a = Math.PI / 2 / (n - 1) * i;

			result.push( this.arg.fn_getParameterByNormalAngle(a) );
		}

		result.push(Math.PI / 2);

		return result;
	}


	// ============================================
	//
	//   Data Block for GPU
	//
	// ============================================

	getDataBlockDescriptor() {

		return {
			name: `${this}`,
			size: this.getDataBlock().length,
			fnUpdate: (array, offset) => array.set( this.getDataBlock(), offset ),
		};
	}


	getDataBlock() {

		if (this._dataBlock)
			return this._dataBlock;

		var nEntries = this.intervals.length;
		var maxEntries = DifferentiableCurve.DATA_BLOCK_ENTRIES_MAX;

		console.assert( !(maxEntries % 4) );

		if (nEntries > maxEntries)
			Report.warn("excess entries", `${this} nEntries=${nEntries} maxEntries=${maxEntries}`);

		if ( !Number.isFinite(Math.fround(this.maxAbsTerm_L_t)) )
			Report.warn("maxAbsTerm_L_t exponent overflow", `${this} val=${this.maxAbsTerm_L_t}`);

		if ( !Number.isFinite(Math.fround(this.maxAbsTerm_other)) )
			Report.warn("maxAbsTerm_other exponent overflow", `${this} val=${this.maxAbsTerm_other}`);

		// 2 parts.
		// * index (+header): 4 floats header; index is 1 float per entry;
		// * data.

		var headerSize = 4;
		var indexSize = Math.ceil(nEntries / 4) * 4;
		var indexSizeVec4 = indexSize / 4;
		var entrySize = DifferentiableCurve.DATA_BLOCK_ENTRY_SIZE;

		console.assert( !(entrySize % 4) );

		var N = DifferentiableCurve.DATA_BLOCK_POLYNOMIAL_LEN - 1;
		var NORM_N = DifferentiableCurve.DATA_BLOCK_POLYNOMIAL_NORM_LEN - 1;

		var b = new Float32Array( headerSize + indexSize + nEntries * entrySize );

		b[0] = nEntries;
		b[1] = indexSizeVec4;
		// +2 floats

		var i;

		for (i = 0; i < nEntries; i++) {

			let int = this.intervals[i];

			this._createPolynomials_all(int);

			b[ headerSize + i ] = int.lenEnd;

			// entry content

			let entryOff = headerSize + indexSize + i * entrySize;

			for (let j = 0; j <= N; j++) {

				b[ entryOff + 0 + j ] = int.polynomial_x_L[j] || 0;
				b[ entryOff + (N + 1) + j ] = int.polynomial_y_L[j] || 0;
			}

			for (let j = 0; j <= NORM_N; j++) {

				b[ entryOff + 2 * (N + 1) + 0 + j ] = int.polynomial_nx_L[j] || 0;
				b[ entryOff + 2 * (N + 1) + (NORM_N + 1) + j ] = int.polynomial_ny_L[j] || 0;
			}

			//b[ entryOff + 24 ] = int.len0;
			b[ entryOff + 2 * (N + 1) + 2 * (NORM_N + 1) + 0 ] = int.len0;
			// +3 floats
		}

		for ( i--; i < indexSize; i++) // pad index; patch last interval for the case
			b[ headerSize + i ] = 1e+38;

		return (this._dataBlock = b);
	}

}



Object.assign( DifferentiableCurve, {

	_pointByLength: null,
	_normalByLength: null,

	INTERVAL_MIN_WIDTH:	1e-7,
	_intervalData: {},

	DATA_BLOCK_ENTRIES_MAX: 32,
	DATA_BLOCK_ENTRY_SIZE: 8*2 + 4*2 + 4,
	DATA_BLOCK_POLYNOMIAL_LEN: 8,
	DATA_BLOCK_POLYNOMIAL_NORM_LEN: 4,
});



class DifferentiableCurve_4X extends DifferentiableCurve {

	constructor(arg) {

		super(arg);
	}


	_getLength_wrt_QuadNum(L, quadNum, isCW_sgn) {

		var resultL = quadNum < 2
			? ( quadNum === 0 ? L : 2 * this.totalLen - L )
			: ( quadNum === 2 ? 2 * this.totalLen + L : 4 * this.totalLen - L );

		return isCW_sgn < 0 ? resultL : 4 * this.totalLen - resultL;
	}


	getLengthByParameter(t, isCW_sgn = -1) {

		var L = super.getLengthByParameter( Angle.toQuad0(t) );

		L = Util.clamp(L, 0, this.totalLen);

		return this._getLength_wrt_QuadNum(L, Angle.getQuadNum(t), isCW_sgn);
	}


	getLengthByPoint(p, isCW_sgn = -1) {

		var L = super.getLengthByCoords( Math.abs(p.x), Math.abs(p.y) );

		console.assert(L <= this.totalLen && L >= 0);

		L = Util.clamp(L, 0, this.totalLen);

		return this._getLength_wrt_QuadNum(L, p.getQuadNum(), isCW_sgn);
	}

}




export { DifferentiableCurve, DifferentiableCurve_4X }

