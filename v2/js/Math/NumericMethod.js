
var NumericMethod = {

	stats: {},

	_emptyObj: Object.create(null),
};



NumericMethod.bisection = (a, b, fn, name, arg = NumericMethod._emptyObj) => {

	var epsilonX = arg.epsilonX || 1e-9;
	var epsilonY = arg.epsilonY || 0;

	if (a > b) {
		Report.warn("bisection a > b", `${name} ${a} > ${b}`);
		[ a, b ] = [ b, a ];
	}

	var fa = typeof arg.fa == 'number' ? arg.fa : fn(a);
	var fa_gt0 = fa > 0;

	if (Math.abs(fa) < epsilonY)
		return a;

	var fb = typeof arg.fb == 'number' ? arg.fb : fn(b);

	if (Math.abs(fb) < epsilonY)
		return b;

	if (fa_gt0 === fb > 0) {

		if (arg.fnBadInterval)
			arg.fnBadInterval();
		else
			Report.warn("bisection: bad interval", `${name} a=${a} b=${b} | fa=${fa} fb=${fb}`);

		return Math.abs(fa) < Math.abs(fb) ? a : b;
	}

	for (let i = 0; i < 100; i++) {

		let c = (a + b) * 0.5;

		if (c - a < epsilonX)
			return c;

		let fc = fn(c);

		if (Math.abs(fc) < epsilonY)
			return c;

		if (fc > 0 === fa_gt0)
			a = c;
		else
			b = c;
	}

	Report.warn("bisection: iteration limit", `${name} a=${a} b=${b} | fa=${fa} fb=${fb}`);
}



NumericMethod.regulaFalsi = (a, b, fn, name, arg = NumericMethod._emptyObj) => {

	if (typeof name != 'string')
		Report.warn("regulaFalsi: bad args", `${name}`);

	var epsilonX = arg.epsilonX || 1e-11;
	var epsilonY = arg.epsilonY || 1e-11;
	var ITERS_MAX = arg.itersMax || 50;
	var debug = arg.debug || 0;

	var bisectSameSign = ('bisectSameSign' in arg) ? !!arg.bisectSameSign : true;
	var bisectPoorShrink = !!arg.bisectPoorShrink;
	var advanceBisectPoorShrink = arg.advanceBisectPoorShrink;

	var fnCalls = 0, bisections = 0;

	if (a > b) {
		Report.warn("regulaFalsi: a > b", `${name} a=${a} b=${b}`);
		[ a, b ] = [ b, a ];
	}

	var fa = fn(a); fnCalls ++;

	if (Math.abs(fa) <= epsilonY) {
		if (debug >= 2)
			console.warn(`${name} epsilonY.a fa=${fa}`);
		updateStats();
		return a;
	}

	var fb = fn(b); fnCalls ++;

	if (Math.abs(fb) <= epsilonY) {
		if (debug >= 2)
			console.warn(`${name} epsilonY.b fb=${fb}`);
		updateStats();
		return b;
	}

	if (fa > 0 === fb > 0) {

		if (arg.fnBadInterval)
			arg.fnBadInterval();
		else
			Report.warn("regulaFalsi: bad interval", `${name} a=${a} b=${b} | fa=${fa} fb=${fb}`);

		return Math.abs(fa) < Math.abs(fb) ? a : b;
	}

	var c, fc, prevFc;
	var algorithm = 0;

	for (let i = 0; i < ITERS_MAX; i++) {

		if (b - a <= epsilonX) {
			if (debug >= 2)
				console.warn(`${name} epsilonX.1 i=${i} fc=${fc}`);
			updateStats();
			return 0.5 * (a + b);
		}

		if (bisectSameSign === true && prevFc !== undefined && prevFc > 0 === fc > 0
				&& prevFc / fc < 32) {

			algorithm = 3; bisections ++;
			c = 0.5 * (a + b);

		} else {

			c = (a * fb - b * fa) / (fb - fa);

			if (bisectPoorShrink === true && fc !== undefined //!!!TODO fract=~1
					&& (fc > 0 === fa > 0 ? c - a : b - c) < (b - a) * 0.25) {
/*
		if ( advanceBisectPoorShrink !== undefined
				&& Math.min(x1 - a, b - x1) < (b - a) * advanceBisectPoorShrink ) {

//console.log(`> advance-bisect-poor-shrink fract=${Math.min(x1 - a, b - x1)/(b-a)}`);
			x = 0.5 * (a + b);
*/
				algorithm = 32; bisections ++;
				c = 0.5 * (a + b);

			} else
				algorithm = 2;
		}

		prevFc = fc;
		fc = fn(c); fnCalls ++;

		if (debug >= 3)
			console.log(`i=${i} alg=${algorithm} fc=${fc} b|a=${(b-a).toExponential(1)}`);

		if (Math.abs(fc) <= epsilonY) {
			if (debug >= 2)
				console.warn(`${name} epsilonY.1 fc=${fc} b|a=${(b-a).toExponential(1)}`);
			updateStats();
			return c;
		}

		if (fa > 0 === fc > 0) {
			a = c;
			fa = fc;

		} else {
			b = c;
			fb = fc;
		}
	}

	Report.warn("regulaFalsi: iteration limit", `${name} fc=${fc} b|a=${(b-a).toExponential(1)}`);
	return c;


	function updateStats() {

		if (debug < 1)
			return;

		var entry = NumericMethod.stats[ name ];

		if (!entry)
			entry = NumericMethod.stats[ name ] = {
				runs: 0,
				fnCalls: 0,
				'fnCalls/run': 0,
				bisections: 0,
				'bisections/run': 0,
				type: "RegulaFalsi",
			};

		entry.runs ++;
		entry.fnCalls += fnCalls;
		entry['fnCalls/run'] = Util.fround( entry.fnCalls / entry.runs, 3 );
		entry.bisections += bisections;
		entry['bisections/run'] = Util.fround( entry.bisections / entry.runs, 5 );
	}
}




NumericMethod.NewtonRaphsonHardened = (a, b, x, fn, name, arg = NumericMethod._emptyObj) => {

	if (typeof name != 'string')
		Report.warn("NewtonRaphsonHardened: bad args");

	var epsilonX = arg.epsilonX || 1e-14 * Math.max( 1, Math.abs(a), Math.abs(b) );
	var epsilonY = arg.epsilonY || 1e-12;
	var ITERS_MAX = arg.itersMax || 15;
	var debug = arg.debug || 0;

	if (a >= b) {
		Report.warn("NewtonRaphsonHardened: a >= b", `${name} a=${a} b=${b}`);
		[ a, b ] = [ b, a ];
	}

	if ( !(x >= a && x <= b) ) {
		Report.warn("NewtonRaphsonHardened: x !E [a, b]", `${name} a=${a} x=${x} b=${b}`);
		x = 0.5 * (a + b);
	}

	if (b - a <= 2 * epsilonX) {
		if (debug >= 2)
			console.warn(`${name} epsilonX.0`);
		updateStats();
		return 0.5 * (a + b);
	}

	var algorithm = 0, bisections = 0, fnCalls = 0;
	var divergencies = 0; // incl.stalls

	var result, fx, prevX = x, prevFx;
	var fa, fb;
	var i;

	for (i = 0; i < ITERS_MAX; i++) {

		//console.assert(x >= a && x <= b); // non-strict ineq. OK

		prevFx = fx;
		result = fn(x);
		fnCalls ++;
		fx = result.result;

		if (debug >= 3)
			//console.log(`i=${i} alg=${algorithm} x=${x} fx=${fx} der=${result.derivative} | a=${a} b=${b} | fa=${fa} fb=${fb}`);
			console.log(`i=${i} alg=${algorithm} x=${x} fx=${fx} der=${result.derivative} | b-a=${(b-a).toExponential(0)}`);

		if ( !Number.isFinite(fx) ) { //TODO
			if (arg.fnError)
				arg.fnError("notFinite");
			else
				Report.warn("NewtonRaphsonHardened: !isFinite", `i=${i} fx=${fx} x=${x}`);
			break;
		}

		if (Math.abs(fx) <= epsilonY) {
			if (debug >= 2)
				console.warn(`${name} epsilonY.1 i=${i} fx=${fx.toExponential(1)} b-a=${(b-a).toExponential(0)}`);
			break;
		}

		if (fa !== undefined) { // Interval accounting is established.

			if (fa > 0 === fx > 0) {
				a = x; fa = fx;
			} else {
				b = x; fb = fx;
			}

		} else if (prevFx !== undefined && prevFx > 0 !== fx > 0) {

			// Establish interval from 2 last values of opposite signs

			if (prevX < x) {
				a = prevX; fa = prevFx; b = x; fb = fx;
			} else {
				a = x; fa = fx; b = prevX; fb = prevFx;
			}
		}

		if (fa !== undefined && b - a <= epsilonX) {
			if (debug >= 2)
				console.warn(`${name} epsilonX.1 i=${i} fx=${fx.toExponential(1)} b-a=${(b-a).toExponential(0)}`);
			break;
		}

		if (algorithm === 1 && prevFx !== undefined && Math.abs(fx) >= Math.abs(prevFx)) {

			divergencies ++;

		} else {

			let x1 = x - fx / result.derivative;

			if (x1 > a && x1 < b) { // Doing Newton-Raphson iteration

				algorithm = 1;
				prevX = x;
				x = x1;
				continue;
			}
		}

		// Going Bisection iteration.

		if (fa === undefined)
			if (establishInterval() !== true)
				break;

		prevX = x;
		x = 0.5 * (a + b);

		algorithm = 3;
		bisections ++;
	}


	if (i >= ITERS_MAX) {

		if (arg.fnError)
			arg.fnError("itersLimit");
		else
			Report.warn("NewtonRaphsonHardened: iteration limit",
				`${name} i=${ITERS_MAX} x=${x} fx=${fx} b-a=${(b-a).toExponential(0)}`);
	}

	updateStats();
	return x;


	function establishInterval() {

		fa = fn(a).result; // skip-derivative?
		fnCalls ++;

		if (Math.abs(fa) <= epsilonY) {
			if (debug >= 2)
				console.warn(`${name} epsilonY.2 i=${i} fx=${fx.toExponential(1)} b-a=${(b-a).toExponential(1)}`);
			x = a;
			return;
		}

		if (fa > 0 !== fx > 0) {
			b = x;
			fb = fx;

		} else {

			fb = fn(b).result; // skip-derivative?
			fnCalls ++;

			if (Math.abs(fb) <= epsilonY) {
				if (debug >= 2)
					console.warn(`${name} epsilonY.3 i=${i} fx=${fx.toExponential(1)} b-a=${(b-a).toExponential(1)}`);
				x = b;
				return;
			}

			a = x;
			fa = fx;

			if (fa > 0 === fb > 0 && a !== b) { // Zero-length interval has same signs: skip error.

				if (arg.fnBadInterval)
					arg.fnBadInterval();
				else if (arg.fnError)
					arg.fnError(`badInterval: a=${a} fa=${fa} | b=${b} fb=${fb}`);
				else
					Report.warn("NewtonRaphsonHardened: bad interval",
						`${name} a=${a} b=${b} | fa=${fa} fb=${fb}`);

				x = Math.abs(fa) < Math.abs(fb) ? a : b;
				return;
			}
		}

		// Distinguish: bad interval; zero-length interval; undivideable interval.
		// (1.5707963267948861 + 1.5707963267948863) * 0.5 == 1.5707963267948863

		if (b - a <= 2 * epsilonX) {
			if (debug >= 2)
				console.warn(`${name} epsilonX.3 i=${i} fx=${fx.toExponential(1)} b-a=${(b-a).toExponential(1)}`);
			x = 0.5 * (a + b);
			return;
		}

		return true;
	}


	function updateStats() {

		if (debug < 1)
			return;

		var entry = NumericMethod.stats[ name ];

		if (!entry)
			entry = NumericMethod.stats[ name ] = {
				runs: 0,
				fnCalls: 0,
				'fnCalls/run': 0,
				bisections: 0,
				'bisections/run': 0,
				divergencies: 0,
				'divergencies/run': 0,
				type: "NewtonRaphsonHardened",
			};

		entry.runs ++;
		entry.fnCalls += fnCalls;
		entry['fnCalls/run'] = Util.fround( entry.fnCalls / entry.runs, 3 );
		entry.bisections += bisections;
		entry['bisections/run'] = Util.fround( entry.bisections / entry.runs, 5 );
		entry.divergencies += divergencies;
		entry['divergencies/run'] = Util.fround( entry.divergencies / entry.runs, 5 );
	}
}




NumericMethod.integrateAdaptiveSimpson = function(a, b, f, name, arg = NumericMethod._emptyObj) {

	var intervals = 0, fnEvals = 0, levelReachedMax = 0;
	var levelExcesses = 0, minIntervalWidthReached = 0, deltaIncreases = 0;

	if ( !(a < b) ) {

		if (!Number.isFinite(a) || !Number.isFinite(b))
			Report.throw("interval endpoint is not finite", `a=${a} b=${b}`);

		if (a === b) {
			updateStats();
			return 0;
		}

		Report.warn("interval !(a < b)", `a=${a} b=${b}`);
		[ b, a ] = [ a, b ];
	}

	var epsBase = arg.eps || 1e-10; // absolute value
	var levelMax = arg.levelMax || 15;
	var minIntervalWidth = arg.minIntervalWidth || 1e-13;
	var terminateEarly = arg.terminateEarly, terminateTotal = 0; // fn. returns only >= 0
	var debug = arg.debug || 0;


	var total, terminated;

	var evaluateFn = (a) => {

		var result = f(a); fnEvals ++;

		if (!Number.isFinite(result))
			Report.throw("function result is not finite", `a=${a} result=${result}`);

		return result;
	}

	var evaluateApproximation = (a, b, fa, fm, fb) => (b - a) / 6 * (fa + 4 * fm + fb);


	var checkTerminateEarly = (addTotal) => {

		if (!terminateEarly || (terminateTotal += addTotal) < terminateEarly.terminateTotal)
			return;

		total = terminateTotal;
		terminated = 1;
		throw 'terminateEarly';
	}


	var evaluateInterval = (a, m, b, fa, fm, fb, eps, total, prevDelta, level) => {

		if (level > levelMax) {
			levelExcesses ++;
			checkTerminateEarly(total);
			return total;
		}

		levelReachedMax = Math.max(levelReachedMax, level);

		if (m - a <= minIntervalWidth || b - m <= minIntervalWidth) {
			minIntervalWidthReached ++;
			checkTerminateEarly(total);
			return total;
		}

		intervals ++;

		var left_m = 0.5 * (a + m)
		var f_left_m = evaluateFn(left_m);
		var left = evaluateApproximation(a, m, fa, f_left_m, fm);

		var right_m = 0.5 * (m + b);
		var f_right_m = evaluateFn(right_m);
		var right = evaluateApproximation(m, b, fm, f_right_m, fb);

		var delta = left + right - total;

//console.log(`l=${level} a=${a} b=${b} | l=${fa} r=${fb} | eps=${eps.toExponential(2)} delta/eps=${(Math.abs(delta)/eps).toExponential(2)}`);

		if (Math.abs(delta) >= Math.abs(prevDelta) / 2) {
			deltaIncreases ++;

		} else if (Math.abs(delta) <= eps) {

			let result = left + right + delta / 15;

			checkTerminateEarly(result);
			return result;
		}

		return evaluateInterval(a, left_m, m, fa, f_left_m, fm, eps / 2, left, delta, level + 1)
			+ evaluateInterval(m, right_m, b, fm, f_right_m, fb, eps / 2, right, delta, level + 1);
	}


	try {

		var m = 0.5 * (a + b);

		var fa = evaluateFn(a);
		var fb = evaluateFn(b);
		var fm = evaluateFn(m);

		total = evaluateApproximation(a, b, fa, fm, fb);

		total = evaluateInterval(a, m, b, fa, fm, fb, epsBase, total, Infinity, 0);

	} catch (e) {

		if (typeof e == 'string' && e == 'terminateEarly') {
		} else
			throw e;
	}

	if (debug >= 1) {

		let str = '';

		levelExcesses && (str += ` levelExcesses=${levelExcesses}`);
		minIntervalWidthReached && (str += ` minIntervalWidthReached=${minIntervalWidthReached}`);
		deltaIncreases && (str += ` deltaIncreases=${deltaIncreases}`);
		terminated && (str += ` TERMINATED=${terminated}`);

		//if (str !== '' || debug >= 2) {
		if (debug >= 2) {
			str += ` total=${total}`;
			console.warn(`IAS ${name} int=${intervals} fnEvals=${fnEvals} lv=${levelReachedMax}` + str);
		}

		updateStats();
	}
		
	return total;


	function updateStats() {

		if (debug < 1 || !name)
			return;

		var entry = NumericMethod.stats[ name ] || (NumericMethod.stats[ name ] = {

			runs: 0,
			intervals: 0,
			fnEvals: 0,
			levelReachedMax: 0,

			levelExcesses: 0,
			minIntervalWidthReached: 0,
			deltaIncreases: 0,
			terminatedEarly: 0,
			type: "IntegrateAdaptiveSimpson",
		});

		entry.runs ++;
		entry.intervals += intervals;
		entry.fnEvals += fnEvals;
		entry.levelReachedMax = Math.max(entry.levelReachedMax, levelReachedMax);

		entry.levelExcesses += levelExcesses;
		entry.minIntervalWidthReached += minIntervalWidthReached;
		entry.deltaIncreases += deltaIncreases;
		entry.terminatedEarly += (terminated ? 1 : 0);
	}
}




NumericMethod.integrateLength = function(a, b, f, name = '', arg = NumericMethod._emptyObj) {

	var intervals = 0, fnEvals = 0, levelReachedMax = 0;
	var levelExcesses = 0, minIntervalWidthReached = 0;//, deltaIncreases = 0;
	var straightSegments = 0, lineSegStack = 0, lengthNotComputed = 0;

	if ( !(a < b) ) {

		if (!Number.isFinite(a) || !Number.isFinite(b))
			Report.throw("interval endpoint is not finite", `${name} a=${a} b=${b}`);

		if (a === b) {
			updateStats();
			return 0;
		}

		Report.warn("interval !(a < b)", `a=${a} b=${b}`);
		[ b, a ] = [ a, b ];
	}

	var epsBase = arg.eps || 1e-10; // absolute value
	var levelMax = arg.levelMax || 25;
	var minIntervalWidth = arg.minIntervalWidth || 0;
	var tSplitMax = arg.tSplitMax || 0.2;
	var debug = arg.debug || 0;

	var evaluateFn = (a) => {

		var result = f(a); fnEvals ++;

		if (typeof result != 'object')
			Report.throw("function result must be object w/ .p and .n", `${name} result=${result}`);

		return result;
	}


	var curve = NumericMethod.integrateLength._curve ||
			( NumericMethod.integrateLength._curve = new NIOCurve(null, 0, 3) );

	var computeLength = (x1, y1, nx1, ny1, x2, y2, nx2, ny2) => {

		var result = curve.setFrom2PointsAnd2Normals(x1, y1, nx1, ny1, x2, y2, nx2, ny2);

		if (!result) {
			//Report.warn("non solvable matrix", `${name}`);
			straightSegments ++;
			return;// Util.hypot(x1 - x2, y1 - y2);
		}

		var len = curve.length2();

		if (!Number.isFinite(len) || len <= 0) {
			//Report.warn("length not computed", `${name} len=${len}`);
			lengthNotComputed ++;
			return;// Util.hypot(x1 - x2, y1 - y2);
		}

		return len;
	}


	var evaluateInterval = (t1, x1, y1, nx1, ny1, t2, x2, y2, nx2, ny2,
			len, eps, level, lineSegments) => {

		levelReachedMax = Math.max(levelReachedMax, level);

		if (level > levelMax) {
			levelExcesses ++;
			return len;
		}

		var tm = 0.5 * (t1 + t2);
		var data = evaluateFn(tm);
		var xm = data.p.x, ym = data.p.y, nxm = data.n.x, nym = data.n.y;

		if (tm - t1 <= minIntervalWidth || t2 - tm <= minIntervalWidth) {
			minIntervalWidthReached ++;
			return len;
		}

		intervals ++;

		var lineSegments1 = 0, lineSegments2 = 0;

		var len1 = computeLength(x1, y1, nx1, ny1, xm, ym, nxm, nym);

		if (len1 === undefined) {

			lineSegments1 = lineSegments + 1;
			len1 = Util.hypot(x1 - xm, y1 - ym);
		}

		var len2 = computeLength(xm, ym, nxm, nym, x2, y2, nx2, ny2);

		if (len2 === undefined) {

			lineSegments2 = lineSegments + 1;
			len2 = Util.hypot(x2 - xm, y2 - ym);
		}
/*
console.log(`2> level=${level} size=${t2-t1} len=${len} delta=${Math.abs(len1 + len2 - len)} eps=${eps} ${Math.abs(len1 + len2 - len) <= eps ? '*':''}`);
if (intervals > 1000)
throw 1;
*/
		if (len1 <= 0 || len2 <= 0) {
			Report.once("zero length", `${name} len1=${len1} len2=${len2} prev=${len} lv=${level} eps=${eps}`);
			return len;
		}

		if ( Math.abs(len1 + len2 - len) <= eps ) {

			if (lineSegments1 + lineSegments2 === 0)
				return len1 + len2;

			var DEPTH = 4;

			if (lineSegments1 > DEPTH || lineSegments2 > DEPTH) {

				lineSegStack ++;
				//Report.warn("multiple lineSegments in stack", `${name} depth=${DEPTH}`);// eps=${eps}`);
				return len1 + len2;
			}
		}

		var total
			= evaluateInterval(t1, x1, y1, nx1, ny1, tm, xm, ym, nxm, nym,
					len1, eps / 2, level + 1, lineSegments1)

			+ evaluateInterval(tm, xm, ym, nxm, nym, t2, x2, y2, nx2, ny2,
					len2, eps / 2, level + 1, lineSegments2);

		return total;
	}


	var processBigInterval = (t1, t2, eps) => {

		var f1 = evaluateFn(t1);
		var x1 = f1.p.x, y1 = f1.p.y, nx1 = f1.n.x, ny1 = f1.n.y;

		var f2 = evaluateFn(t2);
		var x2 = f2.p.x, y2 = f2.p.y, nx2 = f2.n.x, ny2 = f2.n.y;

		//var len = computeLength(t1, x1, y1, nx1, ny1, t2, x2, y2, nx2, ny2);
		var len = Util.hypot(x1 - x2, y1 - y2);

		return evaluateInterval(t1, x1, y1, nx1, ny1, t2, x2, y2, nx2, ny2,
			len, eps, 0, 1);
	}


	try {

		var total = 0;
		var n = tSplitMax && Math.ceil((b - a) / tSplitMax) || 1;
		var size = (b - a) / n;

		for (let i = 0; i < n; i++) {

			let	t1 = a + i * size,
				t2 = i === n - 1 ? b : a + (i + 1) * size;

			total += processBigInterval(t1, t2, epsBase / n);
		}

	} catch (e) {

		throw e;
	}

	if (debug >= 1) {

		let str = '';

		levelExcesses && (str += ` levelExcesses=${levelExcesses}`);
		minIntervalWidthReached && (str += ` minIntervalWidthReached=${minIntervalWidthReached}`);
		//deltaIncreases && (str += ` deltaIncreases=${deltaIncreases}`);
		straightSegments && (str += ` straightSegments=${straightSegments}`);
		lineSegStack && (str += ` lineSegStack=${lineSegStack}`);
		lengthNotComputed && (str += ` lengthNotComputed=${lengthNotComputed}`);

		if (str !== '' || debug >= 2)
			console.warn(`IL ${name} int=${intervals} fnEvals=${fnEvals} lv=${levelReachedMax}` + str);

		updateStats();
	}
		
	return total;


	function updateStats() {

		if (debug < 1 || !name)
			return;

		var entry = NumericMethod.stats[ name ] || (NumericMethod.stats[ name ] = {

			runs: 0,
			intervals: 0,
			fnEvals: 0,
			levelReachedMax: 0,

			levelExcesses: 0,
			minIntervalWidthReached: 0,
			//deltaIncreases: 0,
			straightSegments: 0,
			lineSegStack: 0,
			lengthNotComputed: 0,
			type: "IntegrateLength",
		});

		entry.runs ++;
		entry.intervals += intervals;
		entry.fnEvals += fnEvals;
		entry.levelReachedMax = Math.max(entry.levelReachedMax, levelReachedMax);

		entry.levelExcesses += levelExcesses;
		entry.minIntervalWidthReached += minIntervalWidthReached;
		//entry.deltaIncreases += deltaIncreases;
		entry.straightSegments += straightSegments;
		entry.lineSegStack += lineSegStack;
		entry.lengthNotComputed += lengthNotComputed;
	}
}


Object.assign( NumericMethod.integrateLength, {

	_curve: null,
});






export { NumericMethod }

