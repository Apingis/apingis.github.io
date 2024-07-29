
import { Point } from '../Math/Point.js';


class ASDynamic {

	constructor(pathLevel, aSData, node, sector) {

		this.pathLevel = pathLevel;
		this.unit = pathLevel.unit;

		this.aSData = aSData;
		this.node = node;
		this.t0 = node.g;

		this.sector = sector;

		this.result = "Clear"; // "OK", "Smashed"
		this.smashingTrack = null;

		if (Main.DEBUG >= 5) {

			this.id = ASDynamic.nextId ++;
			ASDynamic.byId[this.id] = this;
		}

		this.segments = new IntervalSGTree;

		this.points = new IntervalSGTree;
		this.pointCntBlockers = Object.create(null);

		this.tracks = [];
		this.trackSolvers = Object.create(null);

		this._spatialContainer = new SpatialContainer().setFromRect(sector.getRect(), this)
			.enlarge(Unit.radiusByRC(pathLevel.unit.radiusClass) + 1e-3);

		this.segmentsMap = new Map;
		this.pointsMap = new Map;

		this.pathLevel.area.spatialIndex.aSDynamic.insert(this._spatialContainer);
	}


	toString() {
		return `[ASDynamic.byId[${this.id}] uId=${this.unit.id} t0=${this.t0}]`;
	}


	getCurrentNode() {

		console.assert(!this.node.isSmashed());

		var node;

		// TODO more effective data structure (+mod.)
		this.points.forEach(p => {

//console.assert(p.isBlocked() === this.pointHasBlockers(p));

			if (p.expanId || p.isDiscarded())
				return;
//SMASHED: has expanId

			//if (p.isBlocked())// && p.isDynamic())
			//	return;

			if (!this.checkBlocked(p)) // TODO multiple repeated calls w/ same result
				return;

			if (p.f === undefined)
				if ( !this.pathLevel.processNeighbor(this.node, p) )
					return; // discarded

// process blocked non-dynamic

			if (!node || p.f < node.f)
				node = p;
		});

		return node;
	}


	checkBlocked(p) {

		if (!p.isBlocked())
			return true;

		if (!VGNodeId.isGoalPt(p.id))
			return;

		// Goal is directly visible and is blocked by something.

		p.blockedBy = null; // is valid since the last query?

		// TODO other approaches (+rework everything?)

		var cnt = this.pointCntBlockers[p.id];

		if (cnt === 0)
			return Report.warn("BLOCKED, pointCntBlockers=0", `${this}`);


		// + effective data structures
		var segments = this.getBlockingSegments(p);

		if (!segments)
			return Report.warn("pointCntBlockers > 0, no segments", `${this}`);

		if ( !segments.every(s => s.track && s.track.isInPlace()) )
			return;

		var unit = segments[0].track.unit;

		for (let i = 1; i < segments.length; i++) // 2+ by same unit

			if (segments[i].track.unit !== unit)
				return;

		// All - idle episodes

		for (let i = 0; i < segments.length; i++) {

			let episodeId = segments[i].track.data.wP.episodeId;

			if (segments[i].track.t2 < Engine.time) {
				Report.warn("outdated track - skip", `${segments[i].track} eId=${episodeId}`)
				continue;
			}

			let unitEpisode = unit.aI.episodes.getById( episodeId );

			if (!unitEpisode)
				return;

			if (!unitEpisode.isIdle())
				return;
		}

		// Blocked by 1 idle unit.

// TODO's: 2+ idle units? non-goal?

		var t = segments[0].track.t1; // blocking unit idle starts

		if ( Main.area.baseCenter && Main.area.baseCenter.isAtApproachPoint( unit, t ) ) {

			if (UI.hasOpen('BaseCenter'))
				return;

			// about to arrive

			if ( (unit.aI.task.type == "TaskExchangeItemsBaseCenter"
					|| unit.aI.task.type == "TaskMoveToBaseCenter")
					&& !unit.aI.task.isFinished() )
				return; // it sets task finished after UI.open
		}

		//console.assert(!p.blockedBy); <-- point was already compared; 2) it queries 2 times/fetch

		p.blockedBy = {
			track: segments[0].track,
			unit,
		};

		p.addPenalty(5);

		return true;
	}


	getBlockingSegments(p) {

		var result;

		this.segments.traverse(p.angle, p.angle, segment => {

			//if (isStaticPoint && segment.isStatic)

			if (segment.isVGNodeLeft(p) > 0)
				return true;

			(result || (result = [])).push(segment);

		}, null, true);

		return result;
	}


	pointHasBlockers(p) {
		return this.pointCntBlockers[p.id] > 0;
	}


	initStatic(points) {

		this.addStaticSegments();

		// Static pts. don't conflict w/ static segments.
		points.forEach(p => {

			if (!this.sector.containsVGNode(p))
				return;

			p.angle = this.sector.localizeAngle(p.angle);
			this.points.insert(p.angle, p.angle, p);
		});
	}


	addStaticSegments() {

		this.aSData.forEachFlatSegmentInSector(this.sector, (angleStart, angleEnd, x0, y0, x1, y1) => {

			var segment = this.createSegment(angleStart, angleEnd, x0, y0, x1, y1, true);

			this.splitProcessSegment(segment, (angleStart, angleEnd) =>
				this.segments.insert(angleStart, angleEnd, segment) );
		});

	}


	splitProcessSegment(segment, fn) {

		if (!segment)
			return;

		if (segment.angleStart > segment.angleEnd) {

			fn(this.sector.right, segment.angleEnd);

			if (segment.angleStart <= this.sector.left)
				fn(segment.angleStart, this.sector.left);

		} else
			fn(segment.angleStart, segment.angleEnd);
	}


	createSegment(angleStart, angleEnd, x0, y0, x1, y1, isStatic) {

		console.assert(angleStart >= this.sector.right && angleEnd >= this.sector.right); // localized

		// intersects sector (static - not filtered)
		if (angleStart <= angleEnd) {
			if (angleStart > this.sector.left)
				Report.warn("segment is fully out of sector", `isStatic=${isStatic}`);
		} // else always in the sector


		// Segment ordered: x0y0->x1y1 to the left.
		var segmentPerpProduct = Point.perpProduct(x0, y0, x1, y1);
		if (segmentPerpProduct > 0) { 

			if (segmentPerpProduct > 1e-9)
				Report.warn("bad angularSegment", `s=${isStatic} Expansion.byId[${this.node.expanId}]`,
					angleStart, angleEnd, x0, y0, x1, y1);

			x0 = x1 = y0 = y1 = 0; // make it "0-segment"
		}

		// In general, it appears as 2 fragments/intervals.
		var segment = new AngularSegment(
			angleStart, angleEnd,
			x0, y0, x1, y1, isStatic
		);

		segment.translateBySector(this.sector);
/*
		if (!isStatic) {
			// for static, angles include only relevant portion of segment
			console.assert( Math.abs(this.sector.localizeAngle( s.line2.p1.angle() ) - s.angleStart) < 1e-9
				&& Math.abs(this.sector.localizeAngle( s.line2.p2.angle() ) - s.angleEnd) < 1e-9);
		}
*/
		return segment;
	}


	updateTrack(track, ifAdd) {

		if (ifAdd)
			this.addTrack(track, true);
		else
			this.removeTrack(track);
	}


	addTrack(track, ifDynamic) {

		this.tracks.push(track);

		var tS;

		if (Main.DEBUG >= 5) {

			tS = new TrackSolver;
			this.trackSolvers[track.id] = tS;

		} else {
			tS = this._trackSolver || (this._trackSolver = new TrackSolver);
		}

		tS.init(track, this.unit, this.t0, this.sector);

		var result = tS.compute();

		switch(result) {
		case "Clear":
			break;

		case "OK":
			if (this.result == "Clear")
				this.result = "OK";

			this.addTrackData(tS);
			break;

		default:
			Report.warn(`unknown "${result}"`);

		case "ComputeError":
			Report.warn(`"${result}"`, `ASDynamic.byId[${this.id}].trackSolvers[${tS.track.id}]`);

		case "CollisionAtStart":
			if (!ifDynamic)
				Report.warn(`"${result}"`, `ASDynamic.byId[${this.id}].trackSolvers[${tS.track.id}]`, tS.resultDescr);

		case "Smashed":
			this.smashingTrack = track;
//console.error(`id=${this.id} smashed`);
			this.result = "Smashed";
			this.node.flags |= VGNode.SMASHED;
			//return;
			break;
		};

		return true;
	}


	removeTrack(track) {

		var i = this.tracks.indexOf(track);
		if (i > 0)
			Util.cut(this.tracks, i);

		var tS = this.trackSolvers[track.id];
		delete this.trackSolvers[track.id];

AI.statInc('remove-track-total');
/*
		if (i === -1 || !tS) {
AI.statInc('remove-track-no-track');
			return;// Report.warn("no track", `${this} ${track}`);
		}
*/
		if (i === -1) {
AI.statInc('remove-track-not-in-list');
			return;
		}
// TODO! DEBUG >= 5
		if (!tS) {
AI.statInc('remove-track-no-TS');
			return;
		}

		if (tS.result == "Smashed") {
			this.node.flags &= ~VGNode.SMASHED;
			return;
		}

		this.removeTrackData(tS);
	}


	processTracks() {

		var tracks = this.pathLevel.area.spatialIndex.getTracksInSector(this.sector, this.unit, this.t0);

		//return tracks.every(track => this.addTrack(track));

		tracks.forEach(track => this.addTrack(track));

		return true;
	}


	addTrackData(trackSolver) {

		// Segments are relative to the origin, angles localized, p1 is at the R angle.
		trackSolver.traverseSegments((s, angleL, angleR) => {

			var segment = this.createSegment(angleR, angleL, s.p1.x, s.p1.y, s.p2.x, s.p2.y);
			segment.trackId = trackSolver.track.id;
// ^debug
			segment.track = trackSolver.track;

			this.addDynamicSegment(segment);

			this.segmentsMap.set(s, segment);
		});

		trackSolver.traversePoints((p, unitLeftSign) => {

			if ( !Main.area.spatialIndex.areaContains(p.x, p.y, this.unit.radiusClass) )
				return;

			var vGNode = new VGNode(p.x, p.y,
				this.pathLevel.getNextDynamicPtId(unitLeftSign),
				p.angle
			);

			vGNode.aroundTrack = trackSolver.track;

			this.addDynamicPoint(vGNode);

			this.pointsMap.set(p, vGNode);
		});
	}


	addDynamicSegment(segment) {

		this.splitProcessSegment(segment, (angleStart, angleEnd) => {

			console.assert(angleStart <= angleEnd);
			console.assert(angleStart <= this.sector.left);

			this.points.traverse(angleStart, angleEnd, p => {

				if (segment.isVGNodeLeft(p) > 0) // strictly left (0-segment doesn't satisfy)
					return;

				var cnt = this.pointCntBlockers[p.id] || 0;
				this.pointCntBlockers[p.id] = cnt + 1;
				p.flags |= VGNode.BLOCKED;
			});

			this.segments.insert(angleStart, angleEnd, segment);
		});

this.verifyCorrectPointBlockers(segment.trackId);
	}


	verifyCorrectPointBlockers(msg = "") {

		if ( !(Main.DEBUG >= 5) )
			return;

		this.points.traverse(-Infinity, Infinity, p => {

			var isStaticPoint = VGNodeId.isAtStaticVertex(p.id);
			var cntBlockers = 0;

			this.segments.traverse(p.angle, p.angle, segment => {

				if (isStaticPoint && segment.isStatic)
					return;

				if (segment.isVGNodeLeft(p) > 0)
					return;

				cntBlockers ++;
			});

			if (cntBlockers !== (this.pointCntBlockers[p.id] || 0)) {
				Report.warn(`verifyCorrectPointBlockers ${msg}`, `${this} cnt=${cntBlockers} have=${this.pointCntBlockers[p.id]}`
					+ ` `);
//AI.throw();
			}

		});
	}


	addDynamicPoint(p) {

		var cntBlockers = 0;

		this.segments.traverse(p.angle, p.angle, segment => {

			if (segment.isVGNodeLeft(p) > 0)
				return;

			cntBlockers ++;
		});

		this.points.insert(p.angle, p.angle, p);
AI.statInc('dynamic-points-total');

		if (cntBlockers > 0) {
			this.pointCntBlockers[p.id] = cntBlockers;
			p.flags |= VGNode.BLOCKED;

		} else {
			//this.processNonBlockedPoint(p);
			return true;
		}
	}


	removeTrackData(trackSolver) {

		trackSolver.traversePoints((p, unitLeftSign) => {

			var vGNode = this.pointsMap.get(p);

			if (vGNode.expanId) { // "Ghost" dynamic point
AI.statInc('dynamic-points-ghost');
				return;
			}
AI.statInc('dynamic-points-removed');

			this.removeDynamicPoint(vGNode);
			//this.pointsMap.delete
		});

		// Segments are relative to the origin, angles localized, p1 is at the R angle.
		trackSolver.traverseSegments((s, angleL, angleR) => {

			var segment = this.segmentsMap.get(s);

			this.removeDynamicSegment(segment);
			//segmentsMap.delete
		});
	}


	removeDynamicSegment(segment) {

		this.splitProcessSegment(segment, (angleStart, angleEnd) => {

			this.points.traverse(angleStart, angleEnd, p => {

				if (segment.isVGNodeLeft(p) > 0)
					return;

				var cnt = this.pointCntBlockers[p.id] || 0;
				if (cnt <= 0)
					return Report.warn("bad cnt", `cnt=${cnt} ${this} trackId=${segment.trackId}`
						+ ` p.id=${p.id}`);

				cnt --;
				this.pointCntBlockers[p.id] = cnt;

				if (cnt === 0)
					p.flags &= ~VGNode.BLOCKED;
			});

			this.segments.remove(angleStart, segment);
		});
	}


	removeDynamicPoint(p) {
//pointsMap?
		this.points.remove(p.angle, p);

		var cnt = this.pointCntBlockers[p.id] || 0;

		if (cnt) // can it be added again?
			this.pointCntBlockers[p.id] = 0;
	}


	getNeighbors() {
		return this.points.filter(p => !this.pointHasBlockers(p) );
	}


	getPoint(p = this._getPoint) { return p.set(this.sector.x, this.sector.y); }


	remove() {
		console.assert(this._spatialContainer);
		this.pathLevel.area.spatialIndex.aSDynamic.remove(this._spatialContainer);
	}

}


ASDynamic.nextId = 1;
ASDynamic.byId = {};


Object.assign(ASDynamic.prototype, {

	_trackSolver: null,
	_getPoint: new Point,
});



ASDynamic.prototype.showData = function() {

	this.segments.forEach(s => {

		var matName = s.isStatic ? 'flatSegments' : 'angularSegment';

		//if (!s.is0Segment())
		s.show(matName);
	});


	this.points.forEach(p => {

		if (VGNodeId.isAtStaticVertex(p.id))
			p.show('flatPoints', 0.15)
		else if (VGNodeId.isDynamicPt(p.id))
			p.show('bypassPoint', 0.11)
		else
			p.show('extraNeighbor', 0.13)

		if (!this.pointHasBlockers(p))
			p.showRect('red', 0.22);
	});
}


ASDynamic.prototype.show = function() {

	this.showData();

	return this;
}



export { ASDynamic };

