
import { Circle } from '../../Math/Circle.js';
import { Line2 } from '../../Math/Line2.js';
import { Point } from '../../Math/Point.js';

//
// "Solving Track" with respect to given unit position is seen as
// computing data for inclusion into Angular Sweep, Visibilty Graph.
//
class TrackSolver {

	constructor() {

		this.result = "";
		this.resultDescr = "";

		this.track = null;
		this.unit = null;
		this.t0 = undefined;
		this.sector = null; // skip segments, points if out of sector

		this.p0 = new Point; // Position of unit at t0
		this.r = 0; // sum of unit radii
		this.isStandingOnTrack = undefined;
		this.p = new Point; // Position of track.unit at time t0; relative to p0
		this.c = 0; // position constant p.x^2 + p.y^2 - r^2

		this.interval1 = new TrackInterval("interval1");
		this.interval2 = new TrackInterval("interval2");
		this.quarticSolver = new TrackQuarticSolver;

		if (Main.DEBUG >= 5) {
			this.id = TrackSolver.nextId ++;
			TrackSolver.byId[this.id] = this;
		}

	}


	toString() {
		var idStr = this.id ? `.byId[${this.id}]` : "";
		var trackStr = `Track.byId[${this.track && this.track.id}]`;
		return `<TrackSolver${idStr} "${this.result}" ${trackStr}>`;
	}

}


TrackSolver.nextId = 1;
TrackSolver.byId = {};


Object.assign(TrackSolver, {

	DistanceEpsilon: 1e-6,

	EpsilonMin: 1e-7,
	EpsilonMax: 5e-6,

	results: [
		"Clear", // COLLISION_IMPOSSIBLE
		"OK", // COLLISION_POSSIBLE
		"CollisionAtStart",
		"Smashed",
		"ComputeError",
	],
});


Object.assign(TrackSolver.prototype, {

	_pt1: new Point,
	_pt2: new Point,
	_line1: new Line2,
	_circle: new Circle,

	_showData: new WeakMap
});


TrackSolver.prototype.init = function(track, unit, t0, sector) {

	this.track = track;
	this.unit = unit;
	this.t0 = t0;
	this.sector = sector;

	this.p0.copyFromSector(sector);
	this.r = unit.getRadius() + track.unit.getRadius() + 2 * TrackSolver.DistanceEpsilon;
	this.isStandingOnTrack = undefined;

	this.result = "";
	this.resultDescr = "";
	this.interval1.clear();
	this.interval2.clear();
	this.quarticSolver.clear();

	return this;
}


TrackSolver.prototype.compute = function() {

	if (this.track.unit === this.unit || this.track.t2 < this.t0) {

		//Report.warn("must have filtered out before");
		return (this.result = "Clear");
	}

	//
	// Position of track.unit at time t0
	//
	this.p.copy( this.track.pointAtTime(this.t0) ).sub(this.p0);

	this.c = Util.hypotSq(this.p.x, this.p.y) - this.r * this.r;

	if (this.t0 >= this.track.t1 && this.t0 <= this.track.t2 && this.c <= 0) {

		this.resultDescr = `d=${this.p.length() - this.r} r=${this.r}`;
		return (this.result = "CollisionAtStart");
	}

	this.statInc('tracks-total');

	if (this.c <= 0)
		this.statInc('tracks-close-at-T0');

	if (this.track.isInPlace())
		return (this.result = this.processInPlaceTrack());

	this.statInc('tracks-moving');
	//
	// track w/ moving unit.
	// Compute intervals assuming track to be infinite
	//
	var result = this.computeIntervals();
	if (result)
		return (this.result = result);

	this.statInc('tracks-moving-have-intervals');

	//
	// Compare intervals with track's t1/t2, compute tMin/tMax
	//
	this.interval1.checkVsTrack(this.track, this.t0);
	this.interval2.checkVsTrack(this.track, this.t0);

	if (!this.interval1.active && !this.interval2.active)
		return (this.result = "Clear");


	this.statInc('tracks-moving-have-active-intervals');

//	if (this.c <= 0)

	this.quarticSolver.compute(this.track, this.unit.speed, this.p.x, this.p.y, this.r - 2 * TrackSolver.DistanceEpsilon); // TODO review eps.

	this.isStandingOnTrack = this.track.distanceLineToPoint(this.p0) <= this.r;

	// mb.TODO (+) different interval state representation

	var result1 = this.processInterval(this.interval1);
	if (result1 != "OK" && result1 != "Clear")
		return (this.result = result1);

	var result2 = this.processInterval(this.interval2);
	if (result2 != "OK" && result2 != "Clear")
		return (this.result = result2);

	if (result1 == "Clear" && result2 == "Clear")
		return (this.result = "Clear");

	//if (!this.interval1.active && this.interval2.active) // it happens when i1 is out-of-setor
	//	Report.warn("only int.#2 active", `${this}`);

	return (this.result = "OK");
}


TrackSolver.prototype.processInterval = function(interval) {

	if (!interval.active)
		return "Clear";

	var numBypasses = this.acquireIntervalQuarticRoots(interval);

	var bypassL = interval.bypassL,
		bypassR = interval.bypassR;


var gotRoots = numBypasses;
// Track, interval end beyond sector radius.
//var tAway = this.sector.radius * this.unit.speed;
//if (bypass.t > tAway && interval.tMax > tAway) { // interval.tEnd > tAway

	//
	// Finally it requires to have 2 bypasses: left, right.
	// onTrack: bypass is within track's t1/t2.
	// If a bypass is not found with quartic eqn. or it's outside track's t1/t2
	// then it has to be computed additionally.
	//
	interval.angleToStart = Math.atan2(this.p.y + interval.tMin * this.track.v.y,
			this.p.x + interval.tMin * this.track.v.x);

	var createdBypassL;

	if (numBypasses === 0) {
		// No bypasses. 

/*
if (this.isStandingOnTrack)
	this.statInc(`int-0-b-SOT`);
else
	this.statInc(`int-0-b-not-sot`);
*/
		// Create one.
		if (!this.createBypassL(interval)) {

			if (!this.isStandingOnTrack) {
				Report.warn("!SOT no bypass - must not happen", `${this}`);
				return "ComputeError";
			}

			return "Smashed"; // upper handler prohibits the location
		}

		createdBypassL = true;
		numBypasses = 1;
	}
/*
else { // numBypasses!=0
if (numBypasses == 1) {
	if (interval.tEnd == Infinity) {
		this.statInc(`int-1-b-infinity`);

	} else {
		this.statInc(`int-1-b`);
	}

} else if (numBypasses == 2) {
	this.statInc(`int-2-b`);
}
}
*/
var mBypass;

	if (numBypasses === 1) {

//.tMax?
if (interval.tEnd > this.sector.radius * this.unit.speed && interval.tEnd != Infinity)
this.statInc(`interval-large-tEnd`);


		let bypass = bypassL.isApplicable() ? bypassR : bypassL; // select the missing one
mBypass = bypassL.isApplicable() ? "R" : "L";

		if (interval.tEnd == Infinity) {

			// Typical case where units have same speed. E.g. when a number of units
			// move in the same direction, the fraction can be >50%.

			// In quartic solver, roots w/ very large (incl.negative) t appear, get skipped.

			// Bisection typically produces meaningless points.
/*
console.log(`${this}`);
AI.stop();AI.throw();
return;
*/
			//if (!createdBypassL)

			// TODO produce meaningful point (t ~= tMax, d = ?) or maybe skip point.

			// is this correct at all?
			bypass.set(Infinity, this.track.angle(), false);

if (!createdBypassL)
this.statInc(`interval-1bypass-infinite`);

		} else {
/*
if (!createdBypassL) {
console.log(`${this}`);
AI.stop();AI.throw();
return;
}
*/
			//if (!createdBypassL) // rare case. Includes:
			// - quartic solver produces slightly-off results

			let directionSign = bypassL.isApplicable() ? -1 : 1,
				endAngle = bypassL.isApplicable() ? bypassL.angle : bypassR.angle;

			bypass.computeAngleUsingBisection(interval, this.track, this.p, this.c,
					this.unit.speed, directionSign, endAngle);

if (!createdBypassL) // rare case.
this.statInc(`interval-1bypass-NOT-infinite`);
		}

	} // numBypasses==1

	//console.assert(bypassL.isApplicable() && bypassR.isApplicable());

	if ( !(bypassL.isApplicable() && bypassR.isApplicable()) ) {

		console.error(`${this} b. N/A createdBypassL=${createdBypassL} mBypass=${mBypass} gotRoots=${gotRoots}`, this);
		AI.stop();AI.throw();
	}

	if (!bypassR.onTrack)
		bypassR.computeAngleUsingBisection(interval, this.track, this.p, this.c,
				this.unit.speed, -1, bypassR.angle);

	if (!bypassL.onTrack)
		bypassL.computeAngleUsingBisection(interval, this.track, this.p, this.c,
				this.unit.speed, 1, bypassL.angle);


	if (this.isStandingOnTrack) {

		if (bypassL.angle === bypassR.angle || Angle.closestInDirection(interval.angleToStart,
				1, bypassL.angle, bypassR.angle) !== bypassL.angle) {

			//Report.warn("collapsing thin escape sector", `${this} L=${bypassL.angle} R=${bypassR.angle}`);
			return "Smashed";
		}
	}

	var result = interval.processBypassAngles(this.sector);
	if (result != "OK")
		return result;


	var approachLine;
	var diffLR = Angle.diffLR(interval.bypassL.angle, interval.bypassR.angle);

	if (!this.isStandingOnTrack && diffLR < 0.99 * Math.PI) {

		// If distance track to origin slightly exceeds r, >=PI is possible.
		// In such case create 0-segment (undefined approachLine).

		approachLine = this.createApproachLineCommon(interval);

	} else if (this.isStandingOnTrack && diffLR <= 0.67 * Math.PI) {

		approachLine = this.createApproachLineSOT(interval);
	}

	this.createIntervalOutputData(interval, approachLine);


	if (Main.DEBUG >= 5 && interval.bypassL.isApplicable() && interval.bypassR.isApplicable()) {

		// ~10% suspicious points by distance between 2 pts.

		this.statInc('interval-moving-2b-total');

		if (interval.bypassL.hasPoint && interval.bypassR.hasPoint) {

			this.statInc('interval-moving-2b-2p');

			let d = interval.bypassL.point.distanceToVGNode(interval.bypassR.point);
			let r = this.unit.getRadius() + this.track.unit.getRadius();

			if (d > r * 1.3)
				this.statInc('interval-moving-2b-dX1.3+');
			else if (d > r * 1.1)
				this.statInc('interval-moving-2b-dX1.1+');
			else if (d > r * 0.9)
				this.statInc('interval-moving-2b-dX0.9+');
			else if (d > r * 0.5)
				this.statInc('interval-moving-2b-dX0.5+');
			else if (d > r * 0.1)
				this.statInc('interval-moving-2b-dX0.1+');
			else
				this.statInc('interval-moving-2b-dX0.0+');
		}
	}

	return "OK";
}


TrackSolver.prototype.acquireIntervalQuarticRoots = function(interval) {

	var numBypasses = 0;

	for (let i = 0; i < 4; i++) {

		let root = this.quarticSolver[i];

		if (!root.checkVsInterval(interval))
			continue;

		// e.g. t=1476405620014.8843 unitLeft=1.852783203125
		if (Math.abs(root.t) > 1e4 || root.unitLeft === 0) {
			//Report.warn("bad root", `${this} t=${root.t} unitLeft=${root.unitLeft}`);
			continue;
		}

		// interval.bypass{L|R} is from the point of view of the observing unit.
		// TrackQuarticRoot.unitLeft is of graze point.
		//(root.unitLeft < 0 ? bypassL : bypassR).setFromQuarticRoot(root).checkOnTrack(interval);

		// The above is wrong: e.g. 2 bypasses (very small interval) w/ same unitLeft due to error.
		// unitLeft is correct w/ respect to angleToStart.
		if (root.unitLeft < 0) {

			if (!interval.bypassL.isApplicable()) {
				interval.bypassL.setFromQuarticRoot(root).checkOnTrack(interval);
				numBypasses ++;
			}

		} else {
			if (!interval.bypassR.isApplicable()) {
				interval.bypassR.setFromQuarticRoot(root).checkOnTrack(interval);
				numBypasses ++;
			}
		}

		if (numBypasses === 2)
			break;

		//if (++ numBypasses === 2)
		//	break;
	}

	return numBypasses;
}


TrackSolver.prototype.getBypassLAngle = function() { // independent from interval

	// best angle to avoid head-to-head collision (TODO more research)
	const evasionAngle = 1.46795;

	var isLeftOfTrack = this.track.isPointLeft(this.p0);
	var angle = this.track.angle() + (isLeftOfTrack > 0 ? evasionAngle : -evasionAngle);

	return Angle.normalize(angle);
}


TrackSolver.prototype.createBypassL = function(interval) {

	var checkEscapeVector = angle => {
		if (!this.testCollision(interval, angle))
			return angle;
	}

	var angle = checkEscapeVector( this.getBypassLAngle() );

	if (angle === undefined)
		return;

	interval.bypassL.computeAngleUsingBisection(interval, this.track, this.p, this.c,
			this.unit.speed, 1, angle);

	return true;
}


//=====================================================================================
//
// * Assuming given track to be infinite, there are up to 2 intervals [ tStart, tEnd ]
// such as if there exist velocities for this.unit at which collisions occurs,
// the time of a collision would be within one of the intervals tStartN <= tCol <= tEndN.
//
// Cases:
// "SOT-Smashing": reports 2 intervals
//
// Return true if number of intervals > 0.
//
TrackSolver.prototype.computeIntervals = function() {

	var sa = this.track.unit.speed,
		sb = this.unit.speed,
		b = 2 * (this.track.v.x * this.p.x + this.track.v.y * this.p.y),
		bStart = b - 2 * sb * this.r,
		bEnd = b + 2 * sb * this.r;

	if (sa === sb) { // eqn.10, a == 0

		let tStart = -this.c / bStart;
		if ( !(tStart > 0) )
			return "Clear";

		let tEnd = -this.c / bEnd;
		if ( !(tEnd > 0) ) {
			tEnd = Infinity;
		}

		//console.log(`id=${this.id} track.id=${this.track.id} tStart=${tStart} tEnd=${tEnd}`);

		this.interval1.set(tStart, tEnd);
		return;
	}

	// eqn.10, a != 0
	// mb.TODO (if required) slightly different speeds
	if (sa / sb < (1 + 1e-5) && sa / sb > (1 - 1e-5))
		Report.warn("TODO very small speed diff.",  `sa=${sa} sb=${sb}`);


	var a = sa * sa - sb * sb;
	var d = Math.sqrt(bStart * bStart - 4 * a * this.c);

	if ( !(d >= 0) ) {
		// bEnd > bStart. no intervals here.
		return "Clear";
	}

	var tStart1 = (-bStart - d) / (2 * a),
		tStart2 = (-bStart + d) / (2 * a);

	var tEnd1, tEnd2;

	d = Math.sqrt(bEnd * bEnd - 4 * a * this.c);
	if (d >= 0) {
		tEnd1 = (-bEnd - d) / (2 * a);
		tEnd2 = (-bEnd + d) / (2 * a);
	}

	if ( (tStart1 > 0) != (tEnd1 > 0) ) {

		// 2 intervals w/o ends overlap
		if (tStart1 > 0 && tStart2 > 0 && !(tEnd1 > 0) && !(tEnd2 > 0) ) {
			this.interval1.set(tStart1, tStart2);
			return;
		}

		if ( !(tStart1 > 0) && !(tStart2 > 0) && tEnd1 > 0 && tEnd2 > 0) {
			this.interval1.set(tEnd1, tEnd2);
			return;
		}

		Report.warn("inexpected", `${this} s1=${tStart1} s2=${tStart2} e1=${tEnd1} e2=${tEnd2}`);
		return "ComputeError";
	}

	if (tStart1 > 0 && tEnd1 > 0)
		this.interval1.set(tStart1, tEnd1);

	if (tStart2 > 0 && tEnd2 > 0)
		this.interval2.set(tStart2, tEnd2);
}



TrackSolver.prototype.testCollision = function(interval, angle) {

	var vx = this.track.v.x - this.unit.speed * Math.cos(angle),
		vy = this.track.v.y - this.unit.speed * Math.sin(angle);

	var a = vx * vx + vy * vy, // can't be 0 unless inPlace track
		b = 2 * (vx * this.p.x + vy * this.p.y),
		d = Math.sqrt(b * b - 4 * a * this.c);

	if ( !(d >= 0) )
		return;

	var t1 = (-b + d) / (2 * a),
		t2 = (-b - d) / (2 * a);

	if (t1 < interval.tMin || t2 > interval.tMax)
		return;

	return true; // There's the collision
}


// =============================================================================

TrackSolver.prototype.processInPlaceTrack = function() {

	var d = this.p.length();

	if (this.c <= 0) // "SOT" - Standing on Track
		return this.processInPlaceSOT(d);


	if (d > this.sector.radius + this.track.unit.getRadius()) { // must filter out before?
	//if (d > this.sector.radius + this.r) { //no. pts are limited to s.r - u.r.
//console.error(`id=${this.id} must have filtered out before d=${Util.toStr(d)}`);
		return "Clear";
	}

	if (this.track.t1 > (d + this.r) / this.unit.speed + this.t0
			|| this.track.t2 < (d - this.r) / this.unit.speed + this.t0) {
		return "Clear";
	}


	// Collision is possible. Create blocking segment, bypass points.
	var angle = this.p.angle();
	var angleDelta, distanceGraze, useApproachLine;

	if (d < this.r * 1.01) {

		angleDelta = Math.PI / 2;
		distanceGraze = 1e-3; // will add-up goOn later

	} else {
		useApproachLine = true;
		angleDelta = Math.asin(this.r / d);
		distanceGraze = d * Math.cos(angleDelta);//Math.sqrt(d * d - r * r);
		//dBypass = (d - r) / Math.cos(angleDelta);
	}
//console.warn(`dBypass=${dBypass} proposed=${Math.sqrt(d * d - r * r)} diff=${dBypass-Math.sqrt(d * d - r * r)}`);

	var interval = this.interval1; // use interval1
	interval.active = true;

	var t = distanceGraze / this.unit.speed;
	interval.bypassL.set(t, angle + angleDelta, true);
	interval.bypassR.set(t, angle - angleDelta, true);

	var result = interval.processBypassAngles(this.sector);
	if (result != "OK")
		return result;


	var approachLine;

	if (useApproachLine) {

		let p = this._pt1.copy(this.p).scale(1 - this.r / d);
		approachLine = this._line1.copyFromPoints(p, p);
		approachLine.p2.perp().add( approachLine.p1 );
	}

	this.createIntervalOutputData(interval, approachLine);
	return "OK";
}


// Standing on inPlace track (can be ~2%+ of total inPlace tracks)
TrackSolver.prototype.processInPlaceSOT = function(d) {

	if (this.track.t2 < this.t0) {
		Report.warn("not filtered", `${this}`);
		return "Clear";
	}

	var t = this.track.t1 - this.t0; // time until track.unit appears at this.p.

	if (t < 0) { // Collision at t0.
		console.error(`id=${this.id} unit.id=${this.unit.id} collides with unit.id=${track.unit.id} at t0`
			+ ` track.id=${track.id}`);
		return "CollisionAtStart";
	}

	if (t > (d + this.r) / this.unit.speed) {
		// If the unit moves then it avoids the collision.
		return "Clear";
	}

//console.log(`processInPlaceSOT id=${this.id}`);
	//
	// If the unit wouldn't move then the collision is possible.
	// It requires to restrict possible moves.
	// Eqn.12 replaced with shorter construction.
	//
	var	inPlaceUnitLocation = this._circle.set(this.p.x, this.p.y, this.r),
		pt1 = this._pt1,
		pt2 = this._pt2;

// TODO handle coincident circumferences?

	if (!inPlaceUnitLocation.intersect(0, 0, t * this.unit.speed,
			pt1, pt2))
		return "Smashed";


	// Fill-in: interval, bypasses L,R
	var interval = this.interval1; // Always 1 interval; using interval1
	interval.active = true;

	var angle1 = pt1.angle(),
		angle2 = pt2.angle(),
		pt1IsLeft = pt1.isLeft00(this.p.x, this.p.y) > 0;
//new Line2(this.getPoint(), pt1.clone().translate(this.p0.x, this.p0.y)).show();
//new Line2(this.getPoint(), pt2.clone().translate(this.p0.x, this.p0.y)).show();

	interval.bypassL.set(t, pt1IsLeft ? angle1 : angle2, true);
	interval.bypassR.set(t, pt1IsLeft ? angle2 : angle1, true);

	var result = interval.processBypassAngles(this.sector);
	if (result != "OK")
		return result;

	this.createIntervalOutputData(interval);
	return "OK";
}



//====================================================================

TrackSolver.prototype.createApproachLineCommon = function(interval) {

	var	approachLine = this._line1.copyFromTrack(this.track),
		isLeftOfLineSign = approachLine.isPointLeft(this.p0) > 0 ? -1 : 1;

	approachLine.translate(-this.p0.x, -this.p0.y).moveParallel(this.r * isLeftOfLineSign);

	return approachLine;
}


TrackSolver.prototype.createApproachLineSOT = function(interval) {

	var approachLine;

	//
	// (TODO prove) in case unit stands on track - 
	// fastest encounter would be if the unit moves towards
	// either interval start or interval end.
	//
	let t = this.track.distanceFromPointAtTimeToPoint(interval.tMin + this.t0, this.p0)
			< this.track.distanceFromPointAtTimeToPoint(interval.tMax + this.t0, this.p0)
		? interval.tMin : interval.tMax;

	let	p = this._pt1.copy(this.p).addScaled(this.track.v, t),
		d = p.length(),
		dFactor = (d - this.r) / d;

	if (dFactor > 0.05) {

		p.scale(dFactor);

		approachLine = this._line1.copyFromPoints(p, p);
		approachLine.p2.perp().add( approachLine.p1 );
	}

	return approachLine;
}


TrackSolver.prototype.createIntervalOutputData = function(interval, approachLine) {

	console.assert(interval.active === true);

	this.createIntervalSegment(interval, approachLine);

	this.createIntervalBypassPoints(interval);
}


TrackSolver.prototype.createIntervalSegment = function(interval, approachLine) {

	if (approachLine //<-use interval.segment
			&& approachLine.intersectRayFromOrigin(interval.bypassR.angle, interval.segment.p1)
			&& approachLine.intersectRayFromOrigin(interval.bypassL.angle, interval.segment.p2) )
		return;

	// "0-segment": distance to segment is 0, angle p1-(0,0)-p2 can be >= PI
	interval.segment.set(0, 0, 0, 0);
}


TrackSolver.prototype.createIntervalBypassPoints = function(interval) {

	this.createBypassPoint(interval.bypassL, AngularData.Epsilon);
	this.createBypassPoint(interval.bypassR, -AngularData.Epsilon);
}


TrackSolver.prototype.createBypassPoint = function(bypass, addAngle) {

	var angle = bypass.angle + addAngle; // localized before

	if (angle > this.sector.left || angle < this.sector.right) {
		bypass.setNotApplicable();
		return;
	}

	var goOn = this.unit.getRadius() * 0.49;

	var distance = bypass.t * this.unit.speed + goOn;

	if (distance > this.sector.radius - this.unit.getRadius() - 1e-3) {
		bypass.setNotApplicable();
		return;
	}

	bypass.setPoint(this.p0, angle, distance);
}


// =============================================================================

Object.assign(TrackSolver.prototype, {

	// for helper fns.
	traverseIntervals(callbackFn) {
		this.interval1.active && callbackFn(this.interval1);
		this.interval2.active && callbackFn(this.interval2);
	},

	traverseBypasses(callbackFn) {
		this.interval1.traverseBypasses(callbackFn);
		this.interval2.traverseBypasses(callbackFn);
	},

	// for accessing data

	// Segments are relative to origin, angles localized, p1 is at the R angle.
	traverseSegments(callbackFn) {
		this.interval1.traverseSegment(callbackFn);
		this.interval2.traverseSegment(callbackFn);
	},

	traversePoints(callbackFn) { // Pts. are world positioned
		this.interval1.traversePoints(callbackFn);
		this.interval2.traversePoints(callbackFn);
	},
});


// =================================
//
//   Helpers
//
// =================================

TrackSolver.prototype.getPoint = function() { return this.p0.clone(); }


TrackSolver.prototype.getExpansion = function() {

	var result;

	Object.keys(Expansion.byId).forEach(id => {
		var expan = Expansion.byId[id];
		if (expan.aSDynamic) {
			expan.aSDynamic.debug.trackSolvers.forEach((ts, i) => {
				if (ts.id == this.id) {
					console.log(`Expansion.byId[${id}].aSDynamic.debug.trackSolvers[${i}]`);
					result = expan;
				}
			});
		}
	});

	return result;
}


TrackSolver.prototype.getShowData = function() {

	var data = this._showData.get(this);
	if (!data) {
		data = {};
		this._showData.set(this, data);
	}
	return data;
}


TrackSolver.prototype.showIntervals = function() {

	var data = this.getShowData();
	if (data.intervals) {
		data.intervals.forEach(line => line.show());
		delete data.intervals;
		return;
	}

	data.intervals = [];
	this.traverseIntervals(interval => {
		data.intervals.push(interval.getIntervalLine(this).show('interval'));
	});
}


TrackSolver.prototype.show = function() {

	this.traversePoints(p => p.show('bypassPoint', 0.12));

	var data = this.getShowData();
	if (data.segments) {
		data.segments.forEach(s => s.show());
		delete data.segments;

		data.grazeVectors.forEach(s => s.show());
		delete data.grazeVectors;

		data.grazeLocations.forEach(s => s.show());
		delete data.grazeLocations;
		return;
	}

	data.segments = [];
	this.traverseSegments(segment => {
		data.segments.push(segment.clone().translate(this.p0.x, this.p0.y).show('dSegment'));
	});

	data.grazeVectors = [];
	data.grazeLocations = [];
	//data.grazeLocationArrows = [];

	this.traverseBypasses(bypass => {
		data.grazeVectors.push(bypass.getGrazeVector(this).show('grazeVector'));
		data.grazeLocations.push(bypass.getGrazeLocation(this)
			.show('grazeLocation', this.track.unit.getRadius()));
		//data.grazeLocationArrows.push(bypass.getGrazeLocation(this)
	});

	return this;
}


TrackSolver.stats = {};

TrackSolver.prototype.statInc = function(key) {
	if (Main.DEBUG >= 3)
		TrackSolver.stats[key] = (TrackSolver.stats[key] || 0) + 1;
}

TrackSolver.statInc = function(key) {
	if (Main.DEBUG >= 3)
		TrackSolver.stats[key] = (TrackSolver.stats[key] || 0) + 1;
}



export { TrackSolver };

