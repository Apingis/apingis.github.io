
class TrackQuarticRoot {

	constructor() {

		this.status = TrackQuarticRoot.STATUS_NONE;
		this.t = 0; // "grazeTime"
		this.angle = undefined;
		this.vyb = undefined;
		this.unitLeft = undefined;
	}


	toString() {
		var statusStr = `${this.status}(${TrackQuarticRoot.statusStr[this.status]})`;
		var leftStr = this.unitLeft > 0 ? "L" : this.unitLeft < 0 ? "R" : "?";
		var dataStr = this.isApplicable() ? ` ${leftStr} a=${this.angle} t=${this.t}` : "";
		return `[TrackQuarticRoot ${statusStr}${dataStr}]`;
	}

	isApplicable() { return this.status === TrackQuarticRoot.STATUS_OK; }

	clear() { this.status = TrackQuarticRoot.STATUS_NONE; }


	set(t, vxb, vyb, unitLeft) {

		this.t = t;
		this.angle = Math.atan2(vyb, vxb);
		this.vyb = vyb;
		this.unitLeft = unitLeft;
		this.status = TrackQuarticRoot.STATUS_OK;
		return this;
	}


	checkVsInterval(interval) {
		return this.isApplicable() && this.t >= interval.tStart && this.t <= interval.tEnd;
	}

}


Object.assign(TrackQuarticRoot, {

	STATUS_NONE: 0,
	STATUS_OK: 200,
	//STATUS_NA: 500, // has not applicable root, e.g. negative tCPA

	statusStr: {
		0: "None",
		200: "OK",
		500: "N/A",
	}
});



// ============================================================================
//
// * Assuming given track to be infinite, compute up to 4 vectors (Vxb, Vyb)
// such as the unit passes-by ("grazes") track.unit.
// The unit has speed 'sb', at time 0 positioned at (0,0).
// 
// "Robust solution": if vectors are used for movement then collision doesn't occur,
// except for "Collapsing Thin Escape Sector" issue which is to be resolved by the caller.
// Distance between units at "graze point" is: epsilonMin < d < epsilonMax (strict ineq.)
//
// ============================================================================

class TrackQuarticSolver extends Array {

	constructor() {

		super();

		for (let i = 0; i < 4; i++)
			this[i] = new TrackQuarticRoot;
	}


	clear() {
		for (let i = 0; i < 4; i++)
			this[i].clear();
	}
}


TrackQuarticSolver.DEBUG = 0;


TrackQuarticSolver.prototype.compute = function(track, sb, x, y, sumRadii) {

	var DEBUG = TrackQuarticSolver.DEBUG;

	if (DEBUG)
		console.log(`TrackQuarticSolver.compute`);

	var rMax = sumRadii + TrackSolver.EpsilonMax;
	var rMin = sumRadii + TrackSolver.EpsilonMin;
	var r = sumRadii + (TrackSolver.EpsilonMax + TrackSolver.EpsilonMin) / 2;

	var dSq = x * x + y * y;
// TODO detect before?
	if (dSq < rMax * rMax) { // TODO mb. solve differently(?)
		if (DEBUG)
			console.log(`TrackQuarticSolver: too close`);
		return;
	}

	var vxa = track.v.x,
		vya = track.v.y,
		sbSq = sb * sb,
		xy = x * y;

	var f = r * r - y * y, // from eqn.4
		g = r * r - x * x,
		k1 = vxa * vxa * f + vya * vya * g + 2 * xy * vxa * vya + sbSq * g,
		k2 = vya * g + xy * vxa,
		k3 = -2 * (vxa * f + xy * vya);

	var a = dSq * dSq, // TODO simplify mb. w/ improvement in numeric stability
		b = 2 * k3 * (x * x - y * y) - 8 * xy * k2,
		c = k3 * k3 + 2 * k1 * (x * x - y * y) + 4 * k2 * k2 - 4 * xy * xy * sbSq,
		d = 2 * k3 * k1 + 8 * xy * k2 * sbSq,
		e = k1 * k1 - 4 * k2 * k2 * sbSq;

	var resultVxb = Polynomial.solveQuarticReal(a, b, c, d, e);

	if (DEBUG && resultVxb.length === 0)
		console.log(`roots=${resultVxb.length}`);


	var root;
	var i, vxb, vyb, vx;

	for (i = 0; i < resultVxb.length; i++) {

		root = this[i];
		vxb = resultVxb[i];

		if (vxb !== vxb)
			Report.warn("no vxb");

		vx = vxa - vxb;
		vyb = Math.sqrt(Math.max(0, sbSq - vxb * vxb)); // in eqn.4 we have vyb=+/-sqrt()

		let checkOnlyMirrorSolution = i >= 2 // TODO is this correct if 2 roots?
			&& Math.abs(vxb - resultVxb[i - 2]) < 1e-5 // TODO more precise
			&& this[i - 2].isApplicable()
			&& this[i - 2].vyb > 0; //abs(vyb)?

//if (Math.abs(vyb/vxb) < 1e-5)
//	console.error(`### vyb/vxb=${ (vyb/vxb).toExponential(2) }`);

		if (!checkOnlyMirrorSolution) {

			if (checkSolutionVyb(vyb))
				continue;
		}

		checkSolutionVyb(-vyb);
	}

	return;


	function checkSolutionVyb(vyb) {

		var vy = vya - vyb;
		var t = computeTCPA();

		if (DEBUG)
			console.log(`[${i}] ${Math.sign(vyb)} vxb=${vxb} vyb=${vyb} t=${t}`
				+ ` dAtCPA=${distanceAtCPA()}`
				+ ` left=${computeUnitLeft()}`);

		if (t > 0 && checkDistanceAtCPA()) {
			root.set(t, vxb, vyb, computeUnitLeft());
			return true;
		}

		return;


		// tCPA: time at closest point of approach: from eqn.1 (-b / 2a)
		function computeTCPA() {
			return -(vx * x + vy * y) / (vx * vx + vy * vy);
		}

		function checkDistanceAtCPA() {
			var dSq = Util.hypotSq(x + t * vx, y + t * vy);

//if (dSq > rMax * rMax && dSq < (sumRadii+1e-4)**2)
//	console.error(`### d=${ (Math.sqrt(dSq)-sumRadii).toExponential(2) }`)

			return dSq < rMax * rMax && dSq > rMin * rMin;
		}

		function computeUnitLeft() { // TODO (can be wrong, much larger value)
			var left = Point.perpProduct(x + t * vxa, y + t * vya, vxb, vyb);
			if (Math.abs(left) < 1e-11) // can't happen: sum of radii (no, can't exclude)
				Report.warn("bad left", `left=${left}`);
			return left;
		}
	}

}



export { TrackQuarticRoot, TrackQuarticSolver };

