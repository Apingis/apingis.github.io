
class PathPlanner {

	constructor() { Report.throw("static constructor"); }


	static createTrackFrom2Nodes(unit, node1, node2) {

		var	p1 = node1.getPoint().clone(),
			p2 = node2.getPoint().clone();

		return new Track(unit, p1, p2, node1.g, node2.g);
	}


	static checkAndHandleCollision(unit, area, node1, node2, notInSameLocation) {

		if (!notInSameLocation && !node1.inSameLocation(node2))
			return Report.warn("not in same location", `${unit}`);

		var oversteppingTrack = this.createTrackFrom2Nodes(unit, node1, node2); // "popping" if inSameLoc.?
		var isInPlace = oversteppingTrack.isInPlace();

		console.assert(isInPlace != notInSameLocation);

		var tracks = area.spatialIndex.getCollidingTracks(oversteppingTrack);
		if (!tracks)
			return true;

		if (!isInPlace)
			return;

		if ( !tracks.every(track => track.unit.canThrowOutTrackWith(track, oversteppingTrack)) ) {
console.error(`unit.id=${unit.id} can't overstep`);
			return;
		}

//console.error(`unit.id=${unit.id} overstep OK tracks=${tracks.length}`);

		tracks.forEach(track => track.unit.doThrowOutTrackWith(track, oversteppingTrack, node1.episodeId));
		return true;
	}


	static getLeaveAwayDestinationPoint(unit, node, t) {

		console.assert(node.blockedBy);
		console.assert(node.isGoal());

		if (!node.parent)
			return Report.warn("!node.parent", `${node}`);

		// Most simple case handled (enough for most cases)

		var unit2 = node.blockedBy.unit;
		var r2 = unit2.getRadius();

		var r = r2 + unit2.getRadius() + 0.2;
		var line2 = new Line2().set(node.parent.x, node.parent.y, node.x, node.y);
		var deltaNorm = line2.getDelta().normalize();

		var startPt = node.blockedBy.track.p1;
		var p = new Point().copy( startPt ).sub( line2.p2 );
		var v = new Point;
		var newTrack = new Track;

		var crowdedAreas = Main.area.crowdedAreas.filter(shape => shape.containsPoint(startPt));

		console.assert(crowdedAreas.every(a => a instanceof Circle));



		var sprng = this.getSPRNG();
		var found;
		var iters;
		var ITERS_MAX = 400;
		var pResult;

		for (iters = 0; iters < ITERS_MAX; iters++) {

			v.copy( sprng.randVNorm(node.angle - 4/5 * Math.PI, node.angle + 4/5 * Math.PI) );

			let doLoosely = iters > 0.5 * ITERS_MAX;

			if (this.checkLeaveAwayVariant(v, 0, t, unit2, r, line2, deltaNorm, startPt, p,
					newTrack, crowdedAreas, doLoosely)) {

				pResult = v; // new track endpoint
				break;
			}
		}

		if (!pResult) {
			//UI.Debug.setTMult(0);
			AI.statInc('LeaveAwayDestinationPoint-not-found');
			return;// console.warn(`LeaveAwayDestinationPoint not found`);
		}

		AI.statInc('LeaveAwayDestinationPoint-ok');
		//console.log(`LeaveAwayDestinationPoint iters=${iters+1}`);
		return pResult;
	}


	static checkLeaveAwayVariant(v, addDistance, t, unit2, r, line2, deltaNorm, startPt, p,
			newTrack, crowdedAreas, doLoosely) {

		AI.statInc('checkLeaveAwayVariant-total');

		var dot = v.dot(deltaNorm);
		var d;
		var isBackwards;

		if (dot < -0.85) {
			return Report.warn("dot < -0.85", `dot=${dot}`);

		} else if (dot >= 0) {

			let roots = Polynomial.solveQuadraticEqn(

				v.dot(v),
				2 * (v.x * p.x + v.y * p.y),
				p.dot(p) - r * r
			);

			if (!roots) {
				AI.statInc('checkLeaveAwayVariant-no-roots-fwd');
				return;// Report.warn("no roots (fwd)", `${v} ${p} ${r}`); // it happens
			}

			d = roots.x2;


		} else {

			isBackwards = true;

			let	dx = line2.getX(),
				dy = line2.getY(),
				dist = line2.distance();

			let	var1 = dx * (line2.p1.y - startPt.y) - dy * (line2.p1.x - startPt.x),
				var2 = dy * v.x - dx * v.y;

			if (Math.abs(var2) < 0.1) // wasn't filtered out by dot?
				return Report.warn("abs(var2)", `${Math.abs(var2)}`);

			let	d1 = -(r * dist - var1) / var2;
			let	d2 = (r * dist + var1) / var2;

			if (d1 > 0) {
				d = d1;

			} else if (d2 > 0) {
				d = d2;

			} else {
				AI.statInc('checkLeaveAwayVariant-no-roots-back');
				return;// Report.warn("no roots (back)");
			}
		}


		if (crowdedAreas.length > 0) {

			if (doLoosely) {

				let rand = this.getSPRNG().random();

				addDistance += rand < 0.4 ? 0 : rand * r * 1.2; // r: sum of radii

			} else {

				for (let i = 0; i < crowdedAreas.length; i++) {

					let circle = crowdedAreas[i];

					// distance along v to the circumference

					let	x = startPt.x - circle.x,
						y = startPt.y - circle.y;

					let roots = Polynomial.solveQuadraticEqn(

						v.dot(v),
						2 * (v.x * x + v.y * y),
						x * x + y * y - circle.radius * circle.radius
					);

					if (!roots) {
						AI.statInc('checkLeaveAwayVariant-no-roots-crowded');
						//Report.warn("no roots (crowdedAreas)", `${circle} ${v}`); // must not happen
						continue;
					}

					d = Math.max(d, roots.x2 + 0.1); // .x2: outside intersection
				}
			}
		}


		if (d < 0.01) {
			AI.statInc('checkLeaveAwayVariant-small-root');
			return;
		}

		d += addDistance;

		v.multiplyScalar( d ).add( startPt );
//v.clone().show('blue');

		newTrack.set(unit2, startPt.x, startPt.y, v.x, v.y, t, t + d / unit2.getSpeed() );

		if ( !newTrack.validate() )
			return Report.warn("track not validated", `${newTrack}`);

		var isColliding = Main.area.spatialIndex.checkIfTrackCollides(newTrack);

		if (!isColliding)
			return true;
	}




	// =============================================

	static checkAndReportTrackToNodeExpansion(pathLevel, node, expanId) {

		if (!pathLevel.unit)
			return true;

		var nodeFrom = node.parent;
		if (!nodeFrom) // this must be start pt.
			return true;


		var track;

		if (Main.DEBUG >= 5)
			track = new Track;
		else
			track = PathPlanner._checkedTrack || (PathPlanner._checkedTrack = new Track);

		track.set(pathLevel.unit, nodeFrom.x, nodeFrom.y,
			node.x, node.y, nodeFrom.g, node.g);


		var track2 = pathLevel.area.spatialIndex.checkTrackIntersection(track);
		if (!track2)
			return true;
/*
		var wP = track2.data.wP;

		var expanStr = nodeFrom.expanId ? `Expansion.byId[${nodeFrom.expanId}]` : "";

//console.error(expanId, expanStr, track.clone().id, track2.id);

		var t = track.getCollisionTime(track2);
		var d = track.getPointAtTime(t).clone().distanceToPoint( track2.getPointAtTime(t) );

//		if (d <= track.unit.radius)
		Report.warn("track intersection", `${expanStr}`
			+ ` Track.byId[${track.clone().id}]`
			+ ` -> Track.byId[${track2.id}] d=${d}`
			//+ ` (pL | ->node | track2/wP)`, pathLevel, node, wP
		);

		//	AI.throw();
*/
	}


	static setPositionFromWayPoints(position = new THREE.Vector3, wayPoints, t, alsoCut) {

		console.assert(wayPoints[0].g === 0);
		console.assert(t >= 0 && t <= 1);

		t = Util.clamp(t, 0, 1);

		var gMax = wayPoints[wayPoints.length - 1].g;

		var i; // start of segment containing the requested point
		var wP, wPNext;

		for (i = 0; i < wayPoints.length - 1; i++)

			if (t * gMax <= wayPoints[i + 1].g) {

				wP = wayPoints[i];
				wPNext = wayPoints[i + 1];
				break;
			}

		var gDiff = wPNext.g - wP.g;
		var tSegment = gDiff === 0 ? 0 : (t * gMax - wP.g) / gDiff;

		console.assert(tSegment >= 0 && tSegment <= 1);

		position.x = Util.lerp(wP.x, wPNext.x, tSegment);
		position.z = Util.lerp(wP.y, wPNext.y, tSegment);

		if (alsoCut) {
			wP.g = Util.lerp(wP.g, wPNext.g, tSegment);
			wP.x = position.x;
			wP.y = position.z;
			wayPoints.length = i + 2;
		}

		return position;
	}


	static getWayPointsDistance(wayPoints) {

		var d = 0;
		for (let i = 1; i < wayPoints.length; i++)
			d += wayPoints[i - 1].distanceToVGNode(wayPoints[i]);

		return d;
	}


	static cutWayPoints(wayPoints, d) {

		if (wayPoints === true)
			return 0;

		console.assert(wayPoints[0].g === 0 && wayPoints.length >= 2 && d >= 0);

		var dTotal = this.getWayPointsDistance(wayPoints);
		if (dTotal === 0)
			return;

		var t = Math.max(0, dTotal - d) / dTotal;
		if (t >= 1)
			return;

		this.setPositionFromWayPoints(null, wayPoints, t, true);
	}


	static getSPRNG() {

		return this._sprng || (this._sprng
			= new Util.SpreadPRNG(0.1, 455369493, 3922520228, 1260608993, 198730496)
		);
	}

}


Object.assign(PathPlanner, { SectorRadiusMax: 1e+5, });


Object.assign(PathPlanner, {

	TRACK_COUNT_MAX: 10,

	ItemRadiusByLevel: [ undefined, 5 ],
	IntermediateLineDistanceByLevel: [ undefined, 10 ],
	SectorRadiusByLevel: [ 25, PathPlanner.SectorRadiusMax ],

	DefaultGoalDistanceMargin: 5e-3,

	_checkedTrack: null,

	_sprng: null,
});


console.assert(
	PathPlanner.ItemRadiusByLevel.length == PathPlanner.SectorRadiusByLevel.length
	&& PathPlanner.ItemRadiusByLevel.length == PathPlanner.IntermediateLineDistanceByLevel.length
);


PathPlanner.throw = function(...args) {
	Report.throw(...args);
}


PathPlanner.warn = function(...args) {
	Report.warn(...args);
}



export { PathPlanner };

