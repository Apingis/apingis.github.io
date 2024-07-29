
//
// For AngularSweep, the track appears as 1 or 2 segments blocking reachability,
// including case of a pseudo-segment with angle between endponts >= PI
// and distance to such segment is 0.
//
// TrackInterval represent 1 of abovementioned segments.
//
// The computed data guarantees no collision. By the way it blocks
// some (minor) actually reachable areas for simplicity (TODO description).
//
class TrackInterval {

	constructor(label) {

		this.label = label;
		this.active = false;
		// All times are relative to t0
		this.tStart = undefined; // tStart/tEnd: assuming track is infinite
		this.tEnd = undefined;
		this.tMin = undefined; // tMin/tMax: actual interval within track's t1-t2
		this.tMax = undefined;
		this.angleToStart = undefined;
		this.result = "";

		this.bypassL = new TrackBypass; // L,R is from the point of view of the observing unit
		this.bypassR = new TrackBypass;
		this.segment = new Line2;
	}

	toString() {
		return `["${this.label}" ` + (this.active
			? `active ${Util.toStr(this.tStart)}-${Util.toStr(this.tEnd)}]`
			: `inactive]`);
	}

	clear() {
		this.active = false;
		this.result = "";
		this.bypassL.clear();
		this.bypassR.clear();
	}


	set(tStart, tEnd) {

		if (tStart > tEnd) {
			let tmp = tStart; tStart = tEnd; tEnd = tmp;
		}
		this.tStart = tStart;
		this.tEnd = tEnd;
		this.active = true;
	}


	checkVsTrack(track, t0) {

		if (this.active !== true)
			return;

		var tMin = track.t1 - t0,
			tMax = track.t2 - t0;

		if (tMin > this.tEnd || tMax < this.tStart) {
			this.active = false;
			return;
		}

		this.tMin = Math.max(this.tStart, tMin);
		this.tMax = Math.min(this.tEnd, tMax);
		return true;
	}


	// 2*PI-epsilon: Pictures/PF-probs2/TS-createIntervalBypassPoints.png
	processBypassAngles(sector) {

		var angleR = this.bypassR.localizeAngle(sector);//, -AngularData.Epsilon);
		var angleL = this.bypassL.localizeAngle(sector);

		if (Angle.diffLR(angleL, angleR) > 2 * Math.PI - 0.1) {

			//Report.warn("thin escape sector", `L=${angleL} R=${angleR}`);

			// interval remains .active, can be traversed with helper fns.
			return (this.result = "Smashed");
		}

		if (sector.isOutsideLR(angleL, angleR)) {
			this.active = false;
			return (this.result = "Clear");
		}

		return (this.result = "OK");
	}


	traverseBypasses(callbackFn) {

		if (this.active === true) {
			this.bypassR.isApplicable() && callbackFn(this.bypassR);
			this.bypassL.isApplicable() && callbackFn(this.bypassL);
		}
	}


	traverseSegment(callbackFn) {
		if (this.active === true)
			callbackFn(this.segment, this.bypassL.angle, this.bypassR.angle);
	}


	traversePoints(callbackFn) {

		if (this.active === true) {
			this.bypassR.traversePoint(callbackFn, 1);
			this.bypassL.traversePoint(callbackFn, -1);
		}
	}


	// =======================
	//
	//   Helpers
	//
	// =======================

	getIntervalLine(trackSolver) {

		var track = trackSolver.track;

		return new Line2(
			track.getPointAtTime(trackSolver.t0 + this.tStart),
			track.getPointAtTime(trackSolver.t0 + Math.min(this.tEnd, 1e3))
		);
	}
}



export { TrackInterval };

