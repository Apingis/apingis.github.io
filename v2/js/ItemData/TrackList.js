
class TrackList {

	constructor(unit) {

		this.unit = unit;

		this.head = null;
		this.tail = null;
		this.trackByWayPoint = new Map;
	}


	toString() {
		return `[TrackList uId=${this.unit.id}`
			+ ` Engine.time=${Util.toStr(Engine.time)}]`;
	}


	cutTrackRequiresUpdate(wP, track) {
		return wP.hasFlags(VGNode.CUT_TRACK)
			&& (wP.g !== track.t2 || !wP.isPointInSameLocation(track.p2))
	}


	updateFromWayPoints(wayPoints) {

		if (wayPoints.length === 0) {
//console.log(`NO WAYPOINTS ${this}`);

			var tracksToRemove = this.removeTrackAndAfter(this.head);
			Main.area.spatialIndex.updateTracks([], tracksToRemove);
			return;
		}

		this.removeOutdatedWayPoints(wayPoints);

		this.removeOutdatedTracks();

		// Skip WP's for which tracks are already present. Tracks to remove follow.

		var i;
		var firstTrackVerified;
		var lastMatchingTrack;
		var cutTrackEvents;

		for (i = 1; i < wayPoints.length; i++) {

			let wP = wayPoints[i];

			if (wP.isEpisodeStart())
				continue;

			let	track = this.trackByWayPoint.get(wP);
//console.log(`${i} track:${track} ${this.cutTrackRequiresUpdate(wP, track) ? "CUT_TRACK" : ""}`);
			if (!track) {

				if (!firstTrackVerified && this.head) {
					Report.warn("having irrelevant tracks", `${this}`);
//UI.Debug.setTMult(0);
				}

				break;
			}

			firstTrackVerified = true;

			// CUT_TRACK has same WP w/ different id.
			// Events! some event could have been already executed.
			if (this.cutTrackRequiresUpdate(wP, track)) {

				// remove it, create new one
				// save data on events
				cutTrackEvents = track.data.events;
				break;
			}

			lastMatchingTrack = track;
		}

		// i (> 0): index of a wayPoint which has no corresponding track,
		// or cut track, or index after all WP's.

//console.log(Array.from(wayPoints), i, lastMatchingTrack, this.toArray());//, [...this.trackByWayPoint.entries()] );

		var wP = wayPoints[i];

		if (wP && wP.g < Engine.time)
			Report.warn("update of the past", `${this}`);

		var tracksToRemove = this.removeTrackAndAfter(lastMatchingTrack ? lastMatchingTrack.next : this.head);

		var tracksToAdd = [];
		var cutTrackEncountered;

		for ( ; i < wayPoints.length; i++) {

			let wP = wayPoints[i];

			if (wP.isEpisodeStart())
				continue;

			let track;

			if (wP.hasFlags(VGNode.CUT_TRACK)) { // was CUT_TRACK? handle separately

				if (cutTrackEncountered)
					Report.warn("cutTrackEncountered", `${this}`);

				cutTrackEncountered = true;
				track = this.addTrackFromWayPoint(wP, wayPoints[i - 1], cutTrackEvents);

			} else
				track = this.addTrackFromWayPoint(wP, wayPoints[i - 1]);

			tracksToAdd.push(track);
		}

		Main.area.spatialIndex.updateTracks(tracksToAdd, tracksToRemove);
	}


	addTrackFromWayPoint(wP, prevWP, events) {

		var prevTrack = this.tail;
		var p1 = prevTrack ? prevTrack.p2 : prevWP.getPoint().clone();

		if (p1.x !== prevWP.x || p1.y !== prevWP.y) {

			console.log(p1, wP.getPoint().clone());
			Report.throw("discontinuous tracks (space)", `${this}`);
		}

		var t1 = prevTrack ? prevTrack.t2 : prevWP.g;
		var t2 = wP.g;

		if (t1 !== prevWP.g)
			Report.throw("discontinuous tracks (time)", `prevWP.g=${prevWP.g} t1=${t1}`);

		var track = new Track(this.unit, p1, wP.getPoint().clone(), t1, t2);

		this.trackByWayPoint.set(wP, track);

		this.addTrackAtTail(track);
		track.addTrackData(wP, prevWP, events);

		return track;
	}


	addTrackAtTail(track) {

		track.prev = this.tail;

		if (!this.tail) {
			console.assert(!this.head);
			this.tail = this.head = track;

		} else {
			this.tail.next = track;
			this.tail = track;
		}
	}


	removeTrackAndAfter(startTrack) {

		if (!startTrack)
			return [];

		var tracks = [];

		for (let track = startTrack; track; track = track.next)
			tracks.push(track);

		if (startTrack === this.head) {
			this.head = this.tail = null;

		} else if (startTrack.prev) {
			startTrack.prev.next = null;
			this.tail = startTrack.prev;
		}

		tracks.forEach(track => this.trackByWayPoint.delete(track.data.wP));

		tracks.forEach(track => track.data.withdrawEvents());

		return tracks;
	}


	removeAllTracks() { this.removeTrackAndAfter(this.head) }

	getOutdateT() { return Engine.time - EpisodeCollection.T_OUTDATE_DELTA }


	removeOutdatedWayPoints(wayPoints) {

		var i;

		for (i = 0; i < wayPoints.length - 2; i++) {

			if (wayPoints[i + 1].g < this.getOutdateT())
				continue;

			break;
		} // i: number of WPs to remove

		for (let j = 0; j <= i; j++)
			this.trackByWayPoint.delete(wayPoints[j]);

		Util.cut(wayPoints, 0, i);

		// Events from outdated WPs, if they were not fired, remain.

		//if ( !(wayPoints[0].g > this.getOutdateT()) )
		//	return Report.warn("won't outdate last 2 WPs (must not happen)", `${this}`, wayPoints);
	}


	removeOutdatedTracks() {

		if (!this.head)
			return;

		var tracksToRemove = [];
		var track1;

		for (let track = this.head; track; track = track.next) {

			if (track.t2 < this.getOutdateT()) {
				tracksToRemove.push(track);

			} else {
				track1 = track;
				break;
			}
		}

		if (!track1) {
			this.head = this.tail = null;
			Report.warn("outdated all tracks", `${this}`);

		} else {
			this.head = track1;
			track1.prev = null;
		}

		console.assert(tracksToRemove.every(track => track.t2 < Engine.time));

		tracksToRemove.forEach(track => this.trackByWayPoint.delete(track.data.wP));

		Main.area.spatialIndex.removeTracks(tracksToRemove);
	}


	// This is used when WP data changes while track params remain the same.
	// Track remains in SpatialIndex.

	updateTrackFromWayPoint(wP) {

		if (wP.g <= Engine.time)
			return Report.warn("wP.g <= Engine.time", `${this}`);

		var track = this.trackByWayPoint.get(wP);
		if (!track)
			return Report.warn("no track byWayPoint", `${this}`, wP);

		if (track.p2.x !== wP.x || track.p2.y !== wP.y || track.t2 !== wP.g)
			return Report.warn("updateTrackFromWayPoint WP is inconsistent w/ track");

		track.data.update();
	}


	// ===========================================================

	equalWPs(wP1, wP2) {
		return wP1 && wP1.episodeId === wP2.episodeId && wP1.expanId === wP2.expanId
			&& wP1.g === wP2.g;
	}

	find(fn) {
		for (let track = this.head; track; track = track.next)
			if (fn(track))
				return track;
	}

	traverse(fn) {
		for (let track = this.head; track; track = track.next)
			fn(track);
	}

	toArray(array = []) {
		this.traverse(track => array.push(track));
		return array;
	}

	getAll() { return this.toArray(); }


	// =======================================================

	getTrackAt(t) {

		for (let track = this.head; track; track = track.next)
			if (t >= track.t1 && t <= track.t2)
				return track;
	}


	getPointAt(t) {

		var track = this.getTrackAt(t);
		if (!track)
			return this.unit.getPoint();

		return track.pointAtTime(t);
	}


	updatePositionFacing(t = Engine.time) {

		var track = this.getTrackAt(t);
		if (!track)
			return;

		var p = track.pointAtTime(t);

		this.unit.position.set(p.x, 0, p.y);


		var facing = track.data.facing;

		if (facing === undefined) {

			Report.warn("undefined facing", `${this} track=${track}`);

			//if (track.prev && track.prev.data.facing)
			//	facing = track.prev.data.facing;
			//else
				return;
		}

		var t = Math.min(1, (t - track.t1) / track.data.turnDuration);

		this.unit.facing = t === 1 || track.data.startFacing === undefined
			? facing : Angle.clerpShort(track.data.startFacing, facing, t);
	}


	updateAnimation(t = Engine.time) {

		if (this.unit.display.updateType !== 0)
			return;

		var mixer = this.unit.display.mixer;
		mixer.stopAllAction();

		var track = this.getTrackAt(t);

		if (!track) {

			mixer.time = this.getContinuousActionStartTime();
			Unit.playAction( Action.clipAction("_InPlace", this.unit) );
			mixer.update(t - mixer.time || 1e-5);
			return;
		}


		var action = track.getAction();
		var actionTimeScale = track.getActionTimeScale();
		var clipAction = Action.clipAction(action, this.unit);


		//if (this.unit.isChar())
		//	this.unit.display.updateGlowData(track, t);

		//else if (this.unit.isRobot())
			this.unit.display.updateGlowData(track, t);


		if (action != "_InPlace") {

			if (this.checkAndPlayFadeIn(t, track, action, clipAction, mixer, actionTimeScale))
				return;

			if (this.checkAndPlayFadeOut(t, track, action, clipAction, mixer, actionTimeScale))
				return;
		}


		mixer.time = track.t1;

		var actionTime = Action.hasContinuousAnimation(action)
			? actionTimeScale * (this.getContinuousActionStartTime() + mixer.time)
			: 0;

		Unit.playAction(clipAction, actionTime, actionTimeScale);

		mixer.update(t - mixer.time || 1e-5);
	}


	getContinuousActionStartTime() {

		return -(this.unit.id * 6.5 % 25);
	}


	checkAndPlayFadeIn(t, track, action, clipAction, mixer, actionTimeScale) { // "Standing" -> action

		var fadeDuration = action == "_Moving" ? 0.04 : 0.12;

		fadeDuration = Math.min(fadeDuration, (track.t2 - track.t1) / 2);

		if (t - track.t1 > fadeDuration)
			return;

		var prevAction = track.prev && track.prev.getAction();

		if (action === prevAction && Action.hasContinuousAnimation(action))
			return;


		var standingClipAction = Action.clipAction("_InPlace", this.unit);

		mixer.time = track.t1;

		Unit.playAction(standingClipAction, this.getContinuousActionStartTime() + mixer.time);


		var actionTime = Action.hasContinuousAnimation(action)
			? actionTimeScale * (this.getContinuousActionStartTime() + mixer.time)
			: 0;

		Unit.executeCrossFade(standingClipAction, clipAction, fadeDuration,
			actionTime, actionTimeScale);

		mixer.update(t - mixer.time || 1e-5);
		return true;
	}


	checkAndPlayFadeOut(t, track, action, clipAction, mixer, actionTimeScale) { // action -> "Standing"

		var fadeDuration = action == "_Moving" ? 0.09 : 0.12;

		fadeDuration = Math.min(fadeDuration, (track.t2 - track.t1) / 2);

		if (track.t2 - t > fadeDuration)
			return;

		var nextAction = track.next && track.next.getAction();

		if (action === nextAction && Action.hasContinuousAnimation(action))
			return;


		var standingClipAction = Action.clipAction("_InPlace", this.unit);

		mixer.time = track.t2 - fadeDuration;

		var actionTime = Action.hasContinuousAnimation(action)
			? actionTimeScale * (this.getContinuousActionStartTime() + mixer.time)
			: actionTimeScale * (mixer.time - track.t1);

		Unit.playAction(clipAction, actionTime, actionTimeScale );

		Unit.executeCrossFade(clipAction, standingClipAction, fadeDuration,
			this.getContinuousActionStartTime() + mixer.time,
			1//, true
		);

		mixer.update(t - mixer.time || 1e-5);
		return true;
	}



	// ======================================================================

	getGeometry() {

		var t = Engine.time;
		var y = 0.02;
		var positions = [];

		this.traverse(track => {

			if (track.t2 < t)
				return;

			if (track.isInPlace()) { // TODO addup circle/etc to array

				if (track.t1 <= t)
					return;

				let N = 15;
				let r = this.unit.getRadius() * 0.9;

				let	x = track.p1.x + r,
					z = track.p1.y;

				for (let i = 0; i <= N; i++) {

					positions.push(x, y, z);

					x = r * Math.cos(2 * Math.PI / N * i) + track.p1.x;
					z = r * Math.sin(2 * Math.PI / N * i) + track.p1.y;

					positions.push(x, y, z);
				}
					
				return;
			}

			var p1;

			if (track.t1 <= t)
				p1 = track.pointAtTime(t);
			else
				p1 = track.p1;

			positions.push(p1.x, y, p1.y, track.p2.x, y, track.p2.y);
		});

		var geometry = new LineSegmentsGeometry().setPositions(positions);

		geometry.name = `TrackList ${this.unit}`;

		return geometry;
	}


	getPath() {

		var t = Engine.time;
		var path = [];

		this.traverse(track => {

			if (track.t2 < t || track.isInPlace())
				return;

			var p1;

			if (track.t1 <= t)
				p1 = track.pointAtTime(t).clone();
			else
				p1 = track.p1;

			path.push(p1);
		});

		return path;
	}

}




export { TrackList };

