
class TrackBypass {

	constructor() {

		this.status = TrackBypass.STATUS_NONE;

		this.t = undefined; // "grazeTime"
		this.angle = undefined;
		this.onTrack = false;

		this.hasPoint = false;
		this.point = null;
	}


	toString() {
		var statusStr = `${this.status}(${TrackBypass.statusStr[this.status]})`;
		var leftStr = "";//this.unitLeft > 0 ? "L" :
			//this.unitLeft < 0 ? "R" : "?";

		var dataStr = this.isApplicable() ? ` ${leftStr} a=${this.angle}`
			+ ` t=${this.t}`//${Util.toStr(this.t)}`
			+ ` onTrack=${this.onTrack}` : "";
		return `[Bypass ${statusStr}${dataStr}]`;
	}


	isApplicable() { return this.status === TrackBypass.STATUS_OK; }

	clear() {
		this.onTrack = false;
		this.hasPoint = false;
		this.status = TrackBypass.STATUS_NONE;
	}

	setFromQuarticRoot(root) {
		this.t = root.t;
		this.angle = root.angle;
		this.status = TrackBypass.STATUS_OK;
		return this;
	}

	set(t, angle, onTrack) {
		this.t = t;
		this.angle = angle;
		this.onTrack = onTrack;
		this.status = TrackBypass.STATUS_OK;
		return this;
	}

	checkOnTrack(interval) {
		this.onTrack = this.t >= interval.tMin && this.t <= interval.tMax;
	}

	setNotApplicable() {
		this.status = TrackBypass.STATUS_NA;
	}

	localizeAngle(sector, addUp = 0) {
		return (this.angle = sector.localizeAngle(this.angle + addUp));
	}


	//
	// Version w/ approximate tHit.
	// Assumes normalized endAngle.
	// TODO exact tHit (inexact doesn't save much anyway)
	//
	computeAngleUsingBisection(interval, track, p, c, sb, directionSign, endAngle, maxDistance = 25) {

		var alpha = interval.angleToStart, // this hits by definition
			alphaDiff = -Angle.diffInDirection(alpha, directionSign, endAngle);

		const sigmaDistance = 2.5e-3;

		// 1e-4: 2.5mm/25m
		// 4e-5: 1mm/25m
		// AngularData.Epsilon(17bit after pt.): 7.6e-6
		var sigma = sigmaDistance / Math.max(1, maxDistance);

		var vxa = track.v.x,
			vxb = track.v.y,
			tMin = interval.tMin,
			tMax = interval.tMax;

		var vx, vy,
			a, b;

		var t1, t2;

//console.log(`id=${this.id} Bisection dir=${directionSign} start=${alpha} end=${endAngle} diff=${alphaDiff}`);
//var iter=0;

		//while (1) {
		while(Math.abs(alphaDiff) >= sigma) {

			alphaDiff /= 2;
//console.warn(`iter=${iter++} try=${alpha + alphaDiff}`);

			vx = vxa - sb * Math.cos(alpha + alphaDiff);
			vy = vxb - sb * Math.sin(alpha + alphaDiff);
			a = vx * vx + vy * vy;
			b = 2 * (vx * p.x + vy * p.y);

			//if (Math.abs(alphaDiff) < sigma / 2)
			//	break;

			if (a === 0) {
				t1 = -c / b;
				if (t1 > minT2 || t1 < maxT1)
					continue;

			} else {
				let d = b * b - 4 * a * c;
				if (d < 0)
					continue;

				d = Math.sqrt(d);

				t1 = (-b + d) / (2 * a);
				if (t1 < tMin)
					continue;

				t2 = (-b - d) / (2 * a);
				if (t2 > tMax)
					continue;
			}

			alpha += alphaDiff;
//console.warn(`hit. alpha=${alpha} t=${tResult}`);
		}

// Not entirely correct (TODO)
		if (t1 === undefined) { // TODO no tLastHit: compute tCPA?

			if (b && a) {
				t1 = Math.max(0, b / (-2 * a));

			} else {
				console.error(`no t1, a=${a} b=${b} | ${this}`);
				t1 = 2.5; // arbitrary value
			}
		}

		var angle = alpha + directionSign * sigma,
			t = Math.min(tMax, Math.max(t1, tMin));

		this.set(t, angle, true);
//console.log(`t:${bypass.t} angle=${bypass.angle}`);
	}


	setPoint(p, angle, distance) {

		if (!this.point)
			this.point = new VGNode;

		this.point.setFromAngleDistance(p.x, p.y, angle, distance);
		this.hasPoint = true;
	}


	traversePoint(callbackFn, unitLeftSign) {

		if (this.hasPoint)
			callbackFn(this.point, unitLeftSign);
	}


	// =======================
	//
	//   Helpers
	//
	// =======================

	getGrazeVector(trackSolver) {

		var p = new Point;
		return new Line2(p, p.getByAngleDistance(this.angle, this.t * trackSolver.unit.speed))
			.translate(trackSolver.p0.x, trackSolver.p0.y);
	}


	getGrazeLocation(trackSolver) {

		var track = trackSolver.track,
			t = this.t + trackSolver.t0,
			x = track.p1.x + track.v.x * (t - track.t1),
			y = track.p1.y + track.v.y * (t - track.t1);

		return new Point(x, y);
	}
}


Object.assign(TrackBypass, {

	STATUS_NONE: 0,
	STATUS_OK: 200,
	STATUS_NA: 500, // has not applicable root, e.g. negative tCPA
	//STATUS_QUARTIC_

	statusStr: {
		0: "None",
		200: "OK",
		500: "N/A",
	},
});


Object.assign(TrackBypass.prototype, {

	_showData: new WeakMap
});



export { TrackBypass };

