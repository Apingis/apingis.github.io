

CoatedHyperEllipseBase.prototype.testLength1 = function(t) {

	var n = this.n, an = this.hE.an, bn = this.hE.bn;

	var cos = Math.cos(t), sin = Math.sin(t);
	var cos_n_2 = Math.pow(cos, n - 2), sin_n_2 = Math.pow(sin, n - 2);
	var cos_n_1 = Math.pow(cos, n - 1), sin_n_1 = Math.pow(sin, n - 1);
	var cos_n = cos * cos_n_1, sin_n = sin * sin_n_1;
	var cos_2n_2 = cos_n_1 * cos_n_1, sin_2n_2 = sin_n_1 * sin_n_1;

	var r0 = cos_n / an + sin_n / bn;
	var r0_1_n = Math.pow(r0, -1 / n);

	var x0 = r0_1_n * cos, y0 = r0_1_n * sin;
	var nx = cos_n_1 / an, ny = sin_n_1 / bn;
	var len_1 = 1 / Math.sqrt(cos_2n_2 / an / an + sin_2n_2 / bn / bn);

	var x = x0 + this.r1 * len_1 * nx, y = y0 + this.r1 * len_1 * ny;

	// cHE = new CoatedHyperEllipseBase(2.1, 1.4, 1.2, 0.5); d = cHE.getCurveLengthData()
	// cHE.getPointByInnerAngle(0.5)
	// cHE.testLength1(0.5)

	// cHE = new CoatedHyperEllipseBase(3,1,1,2)
	//
	// evaluate [d/dt (cos^3 t+sin^3 t)^(-1/3)cos t+2(cos^(3*2-2)t+sin^(3*2-2)t)^(-1/2)cos^(3-1)t]^2 at t=0.5
	// evaluate [d/dt (cos^3 t+sin^3 t)^(-1/3)sin t+2(cos^(3*2-2)t+sin^(3*2-2)t)^(-1/2)sin^(3-1)t]^2 at t=0.5

	console.log(`(${x}, ${y})`);

	var cos_2n_3 = Math.pow(cos, 2 * n - 3), sin_2n_3 = Math.pow(sin, 2 * n - 3);

	var r_d = r0_1_n / r0 * (sin * cos_n_1 / an - cos * sin_n_1 / bn);
	var var2 = cos * sin_2n_3 / bn / bn - sin * cos_2n_3 / an / an;

	var len_1_d = -(n - 1) * var2 * (len_1 * len_1 * len_1);

	var dx_dt = r_d * cos - r0_1_n * sin + this.r1 * cos_n_2 / an
		* ( len_1_d * cos - (n - 1) * sin * len_1 );

	var dy_dt = r_d * sin + r0_1_n * cos + this.r1 * sin_n_2 / bn
		* ( len_1_d * sin + (n - 1) * cos * len_1 );

	return [ dx_dt * dx_dt, dy_dt * dy_dt ];
}



CoatedHyperEllipseBase.testCurveLengthData = function(nCHEs = 1, nPoints = 1) {

	var prng = new Util.SeedablePRNG();

	var maxDistance = 0, avgDistance = 0;

	var testCHE = () => {

		var doA = prng.random() < 0.5;

		//var n = 2 + prng.random(2), a = doA ? 3 + prng.random(2) : 1, b = doA ? 1 : 3 + prng.random(2);
		//var n = 20 + prng.random(2), a = doA ? 3 + prng.random(2) : 1, b = doA ? 1 : 3 + prng.random(2);

		var n = 2 + prng.random(2), a = 1 + prng.random(2), b = 1 + prng.random(2);
		//var n = 15 + prng.random(5), a = 1 + prng.random(2), b = 1 + prng.random(2);

		var r1 = prng.random(0.5);

		n = Util.fround(n, 2), a = Util.fround(a, 2), b = Util.fround(b, 2), r1 = Util.fround(r1, 3);

		var cHE = new CoatedHyperEllipseBase(n, a, b, r1);
		var d = cHE.getCurveLengthData();
		var totalLen = d.totalLen;

		for (let i = 0; i < nPoints; i++) {

			let len = prng.random(totalLen);

			let p1 = d.getPointByLength(len);
			let p2 = cHE.getPointByInnerAngle( d.getParameterByLength(len) );

			let distance = p1.distanceToPoint(p2);

			maxDistance = Math.max(maxDistance, distance);
			avgDistance += distance;
		}
	}

	for (let i = 0; i < nCHEs; i++)
		testCHE();

	avgDistance /= (nCHEs * nPoints);

	console.log(`max: ${maxDistance.toExponential(1)} avg: ${avgDistance.toExponential(1)}`);
}



CoatedHyperEllipseBase.testApprox = function(nHEs = 1, nPoints = 1) {

	var prng = new Util.SeedablePRNG();

	var maxDistance = 0, avgDistance = 0;

	var testHE = () => {

		var doA = prng.random() < 0.5;

		//var n = 2 + prng.random(2), a = doA ? 3 + prng.random(2) : 1, b = doA ? 1 : 3 + prng.random(2);
		//var n = 20 + prng.random(2), a = doA ? 3 + prng.random(2) : 1, b = doA ? 1 : 3 + prng.random(2);

		var n = 2 + prng.random(2), a = 1 + prng.random(2), b = 1 + prng.random(2);
		//var n = 15 + prng.random(5), a = 1 + prng.random(2), b = 1 + prng.random(2);

		var r1 = prng.random(0.5);

		n = Util.fround(n, 2), a = Util.fround(a, 2), b = Util.fround(b, 2), r1 = Util.fround(r1, 3);

		var hE = new CoatedHyperEllipseBase(n, a, b, r1);
		var approx = hE.getApprox();
		var totalLen = hE.getCurveLengthData().totalLen;

		approx._setFromAngles( hE.getCurveLengthData().getEquidistantParameters(approx.n) );

		for (let i = 0; i < nPoints; i++) {

			let len = prng.random(totalLen);

			let p1 = approx.getPointDataByLength4X(len).p;
			let t = hE.getCurveLengthData().getParameterByLength(len);
			let p2 = hE.getPoint(t);

			let d = p1.distanceToPoint(p2);

//console.log(`${hE} t=${t} len=${len} d=${d}`, p1.clone(), p2.clone() );

			maxDistance = Math.max(maxDistance, d);
			avgDistance += d;
		}
	}

	for (let i = 0; i < nHEs; i++)
		testHE();

	avgDistance /= (nHEs * nPoints);

	console.log(`max: ${maxDistance.toExponential(1)} avg: ${avgDistance.toExponential(1)}`);
}



HyperEllipseBase.testApprox = function(nHEs = 1, nPoints = 1) {

	var prng = new Util.SeedablePRNG();

	var maxDistance = 0, avgDistance = 0;

	var testHE = () => {

		var doA = prng.random() < 0.5;

		//var n = 2 + prng.random(2), a = doA ? 3 + prng.random(2) : 1, b = doA ? 1 : 3 + prng.random(2);
		//var n = 20 + prng.random(2), a = doA ? 3 + prng.random(2) : 1, b = doA ? 1 : 3 + prng.random(2);
		//var n = 2 + prng.random(2), a = 1 + prng.random(2), b = 1 + prng.random(2);
		var n = 15 + prng.random(5), a = 1 + prng.random(2), b = 1 + prng.random(2);

		n = Util.fround(n, 2), a = Util.fround(a, 2), b = Util.fround(b, 2);

		var hE = new HyperEllipseBase(n, a, b);
		var approx = hE.getApprox();
		var totalLen = hE.getCurveLengthData().totalLen;

		approx._setFromAngles( hE.getCurveLengthData().getEquidistantParameters(approx.n) );

		for (let i = 0; i < nPoints; i++) {

			let len = prng.random(totalLen);

			let p1 = approx.getPointDataByLength4X(len).p;
			let t = hE.getCurveLengthData().getParameterByLength(len);
			let p2 = hE.getPoint(t);

			let d = p1.distanceToPoint(p2);

//console.log(`${hE} t=${t} len=${len} d=${d}`, p1.clone(), p2.clone() );

			maxDistance = Math.max(maxDistance, d);
			avgDistance += d;
		}
	}

	for (let i = 0; i < nHEs; i++)
		testHE();

	avgDistance /= (nHEs * nPoints);

	console.log(`max: ${maxDistance.toExponential(1)} avg: ${avgDistance.toExponential(1)}`);
}



HyperEllipseBase.testExtremumX = function(nHEs = 1, nPoints = 1) {

	delete NumericMethod.stats['HyperEllipseBase-extremumX'];

	var d0 = Date.now();

	var prng = new Util.SeedablePRNG(20);

	var testHE = () => {

		var doA = prng.random() < 0.5;

		var n = 2 + prng.random(2), a = doA ? 3 + prng.random(2) : 1, b = doA ? 1 : 3 + prng.random(2);
		//var n = 5 + prng.random(2), a = 1 + prng.random(2), b = 1 + prng.random(2);

		n = Util.fround(n, 2), a = Util.fround(a, 2), b = Util.fround(b, 2);

		var hE = new HyperEllipseBase(n, a, b);

		for (let i = 0; i < nPoints; i++) {

			let a = prng.randAngle();
			let data = hE.getExtremumX_Rotated(a);
		}
	}

	for (let i = 0; i < nHEs; i++)
		testHE();

	var s = nHEs * nPoints * 1e3 / (Date.now() - d0);

	console.log(`time=${((Date.now() - d0) / 1e3).toFixed(2)}s s=${s.toExponential(1)}/s`);

	return NumericMethod.stats['HyperEllipseBase-extremumX'];
}



HyperEllipseBase.testClosestPointData = function(nHEs = 1, nPoints = 1) {

	var d0 = Date.now();

	var prng = new Util.SeedablePRNG(10);
	var p2 = new Point, pCmp = new Point;

	//var opt = 'min';
	var opt = 'near';
	//var opt = 'far';

	var testHE = () => {

		var doA = prng.random() < 0.5;

		//var n = 2 + prng.random(2), a = 1 + prng.random(1), b = 1 + prng.random(1);
		//var n = 2 + prng.random(2), a = doA ? 15 + prng.random(5) : 1, b = doA ? 1 : 15 + prng.random(5);

		//var n = 10, a = 1 + prng.random(1), b = 1 + prng.random(1);
		//var n = 10, a = doA ? 15 + prng.random(5) : 1, b = doA ? 1 : 15 + prng.random(5);
		var n = 50, a = 1 + prng.random(1), b = 1 + prng.random(1);

		//var n = 5 + prng.random(20), a = 1 + prng.random(2), b = 1 + prng.random(2);
		//var n = 5 + prng.random(20), a = doA ? 15 + prng.random(5) : 1, b = doA ? 1 : 15 + prng.random(5);

//a*=10;b*=10;

		//var n = 80 + prng.random(20), a = 1 + prng.random(2), b = 1 + prng.random(2);

		//n = Util.fround(n, 2), a = Util.fround(a, 2), b = Util.fround(b, 2);

		var hE = new HyperEllipseBase(n, a, b);

		for (let i = 0; i < nPoints; i++) {

			if (opt == 'min')
				p2.set(
					-3 + prng.random( 6 ),
					-3 + prng.random( 6 ),
				);
			else if (opt == 'near')
				p2.set(
					-a * 2 + prng.random( a * 4 ),
					-b * 2 + prng.random( b * 4 )
				);
			else if (opt == 'far')
				p2.set(
					//-1e5 + prng.random(2e5), -1e5 + prng.random(2e5)
					-1e8 + prng.random(2e8), -1e8 + prng.random(2e8)
				);

			//var fn = hE.fnInPoint(p2);

			//if (fn <= 1)
			//	continue;

			var data = hE.getClosestPointData(p2);
		}
	}

	for (let i = 0; i < nHEs; i++)
		testHE();

	var s = nHEs * nPoints * 1e3 / (Date.now() - d0);

	console.log(`time=${((Date.now() - d0) / 1e3).toFixed(2)}s s=${s.toExponential(1)}/s`);

	return NumericMethod.stats['HyperEllipseBase-AngleToClosestPoint'];
}



CoatedHyperEllipseBase.testGetTangentPoint = function(cHEs = 1, nPoints = 1) {

	NumericMethod.stats = {};

	var d0 = Date.now();

	var prng = new Util.SeedablePRNG(10);
	var p2 = new Point;

	var nInside = 0;

	//var opt = 'near';
	//var opt = 'medium';
	var opt = 'far';

	var testCHE = () => {

		var doA = prng.random() < 0.5;

		var n = 2 + prng.random(1), a = 1 + prng.random(0.5), b = 1 + prng.random(0.5);

		//var n = 2 + prng.random(2), a = 1 + prng.random(2), b = 1 + prng.random(2);
		//var n = 5 + prng.random(2), a = 1 + prng.random(2), b = 1 + prng.random(2);
		//var n = 2 + prng.random(2), a = doA ? 15 + prng.random(5) : 1, b = doA ? 1 : 15 + prng.random(5);
		//var n = 5 + prng.random(15), a = doA ? 15 + prng.random(5) : 1, b = doA ? 1 : 15 + prng.random(5);

		var r1 = Util.fround( prng.random(0.1), 3 );
		//var r1 = 20;

		n = Util.fround(n, 2), a = Util.fround(a, 2), b = Util.fround(b, 2);

		var cHE = new CoatedHyperEllipseBase(n, a, b, r1);

		for (let i = 0; i < nPoints; i++) {

			if (opt == 'near')
				p2.set(
					-(a + r1) * 1.5 + prng.random( (a + r1) * 3 ),
					-(b + r1) * 1.5 + prng.random( (b + r1) * 3 )
				);

			else if (opt == 'medium')
				p2.set(
					-(a + r1) * 5 + prng.random( (a + r1) * 10 ),
					-(b + r1) * 5 + prng.random( (b + r1) * 10 )
				);

			else if (opt == 'far')
				p2.set(
					//-(a + r1) * 50 + prng.random( (a + r1) * 100 ), -(b + r1) * 50 + prng.random( (b + r1) * 100 )
					-1e5 + prng.random(2e5), -1e5 + prng.random(2e5)
				);

			else
				throw `opt.`;

			//console.error(`${p2}`);

			var result = cHE.getTangentPoint(-1, p2.x, p2.y);

			if (!result)
				nInside ++;
		}
	};

	try {

		for (let i = 0; i < cHEs; i++)
			testCHE();

	} catch (e) {
		Report.warn(e);
	}

	var s = cHEs * nPoints * 1e3 / (Date.now() - d0);

	console.log(`nInside=${nInside} time=${((Date.now() - d0) / 1e3).toFixed(2)}s s=${s.toExponential(1)}/s`);

	//console.log(CoatedHyperEllipseBase.stats);

	return NumericMethod.stats[ 'CHE-tangentPoint' ];
}



CoatedHyperEllipseBase.testPathAlongCurve = function(cHEs = 1, nPoints = 1) {

	NumericMethod.stats = {};

	var d0 = Date.now();

	var prng = new Util.SeedablePRNG();
	var p2 = new Point;

	var testCHE = () => {

		//var n = 2 + prng.random(2), a = 1 + prng.random(2), b = 1 + prng.random(2);
		var n = 2 + prng.random(2), a = 10 + prng.random(20), b = 10 + prng.random(20);
		//var n = 5 + prng.random(2), a = 1 + prng.random(2), b = 1 + prng.random(2);

		var r1 = Util.fround( prng.random(0.05), 3 );

		n = Util.fround(n, 2), a = Util.fround(a, 2), b = Util.fround(b, 2);

		var cHE = new CoatedHyperEllipseBase(n, a, b, r1);
		var dCurve = cHE.getLength();
		var L = prng.random( dCurve );
		var p1 = cHE.getPointDataOnCurveByLength(L).p.clone();

		var opt = 'near';
		//var opt = 'far';

		//console.error(`==> ${cHE}`);

		for (let i = 0; i < nPoints; i++) {

			var d;

			if (opt == 'near') {

				p2.set(
					-(a + r1) * 1.25 + prng.random( (a + r1) * 2.5 ),
					-(b + r1) * 1.25 + prng.random( (b + r1) * 2.5 )
				);
				d = prng.random(dCurve) * 0.8 + 1;

			} else if (opt == 'far') {

				p2.set(
					-(a + r1) * 50 + prng.random( (a + r1) * 100 ),
					-(b + r1) * 50 + prng.random( (b + r1) * 100 )
				);
				d = prng.random(dCurve) * 0.8 + 50;
			}

			var result = cHE.getPathAlongCurveThenStraightSegment( p1, p2, d );
		}
	};

	for (let i = 0; i < cHEs; i++)
		testCHE();

	var s = cHEs * nPoints * 1e3 / (Date.now() - d0);

	console.log(`time=${((Date.now() - d0) / 1e3).toFixed(2)}s s=${s.toExponential(1)}/s`);

	return NumericMethod.stats['CHE-pathAlongCurve'];
}









