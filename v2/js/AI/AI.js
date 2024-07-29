
class AI {

	constructor(unit, area) {

		this.unit = unit;
		this.area = area;
		this.episodes = new EpisodeCollection;

		this.task = null;

		// If set, perform additional update pass.
		this.requiresUpdate = false;

		this._enqueuedReplanning = false;
		this._enqueuedReplanningCancelCurrent = false;
		this._enqueuedStripIdleEpisodes = false;

		this.sprng = new Util.SeedablePRNG(unit.id);
		this.numEpisodesIdle = 0;

		//this.stopped = false;
	}


	toString() { return `<AI unit=${this.unit} task=${this.task} >` }


	enqueueReplanning(cancelCurrentEpisode = true) {

		this._enqueuedReplanning = true;
		this._enqueuedReplanningCancelCurrent = cancelCurrentEpisode;
	}


	enqueueStripIdleEpisodes() { this._enqueuedStripIdleEpisodes = true }



	// ======================================
	//
	//     I. Update
	//
	// ======================================

	static getMinEndT() { return Engine.time + AI.T_HORIZON_MIN }

	//static getMaxEndT() { return Engine.time + AI.T_HORIZON_MAX }


	doesRequireUpdate() {

		return this._enqueuedReplanning || this._enqueuedStripIdleEpisodes
			|| this.episodes.getEndTime() <= AI.getMinEndT();
	}


	removeOutdated() {

		this.episodes.removeOutdated();
		this.episodes.removeAlreadyTravelledInPartiallyComputed();
	}


	update() { // called per-unit from Engine -> AI.update()

		if (!this.task)
			this.task = new TaskIdle(this.unit);


		if (this._enqueuedReplanning) {

			this.forceReplanning(this._enqueuedReplanningCancelCurrent);

			this._enqueuedReplanning = false;
			this._enqueuedReplanningCancelCurrent = false;
		}


		if (this._enqueuedStripIdleEpisodes) {

			this.episodes.stripIdleEpisodes();
			this._enqueuedStripIdleEpisodes = false;
		}


		if (!this.doesRequireUpdate())
			return;


		var targetTime = AI.getMinEndT();

		if (AI.passNum >= AI.passNumIdleOnly) {

			let tRemains = targetTime - this.episodes.getEndTime();

			this.advanceWithIdle(tRemains);
			return;
		}

		var chainComputedNext = 0;
		var result;


		for (let i = 0; ; i++) {

			if (this.task.isTaskFinished())
				break;

			result = this.advanceEpisode(targetTime);

			if (result !== true)
				break;


			let lastEpisode = this.episodes.getLast();

			if (!lastEpisode) { // This should not happen
				Report.warn("!lastEpisode", `uId=${this.unit.id} t=${Engine.time}`);
				break;
			}


			if (lastEpisode.isCompleted() && lastEpisode.hasChainComputeNext()) {

				AI.statInc('chainComputedNext');

				if (chainComputedNext ++ < 3)
					continue;

				Report.warn(`chainComputedNext=${chainComputedNext}`);
				console.log(Array.from(this.episodes));

			} else
				chainComputedNext = 0;


			console.assert(lastEpisode.getEndTime() === this.episodes.getEndTime() );

			if (lastEpisode.getEndTime() > targetTime)
				return;

			if (lastEpisode.isPartiallyComputed()) {

				Report.warn("partiallyComputed() did not compute enough: STOPPED", `${lastEpisode}`);
				lastEpisode.stopped = true;
			}

			if (i >= 20) { // w/ endTime still not satisfactory
				Report.warn("ExcessEpisodeCreation", `i=${i} targetTime=${targetTime} t=${Engine.time}`);
				break;
			}
		}


		console.assert(result !== true);
/*
		var tRemains = targetTime - this.episodes.getEndTime();

		if (tRemains <= 0)
			return Report.warn("bad computation somewhere", `tRemains=${tRemains}`);
*/
		// targetTime not reached.
		//
		// Reasons:
		// "EpisodeNotAdded" for various reasons
		// "ExcessEpisodeCreation"

		//this.advanceWithIdle(tRemains); // Add-up idle to satisfy targetTime.

		// use getIdleComputeTime(); result endTime may be not satisfactory;
		// continue on the next updatePass
		this.advanceWithIdle();
	}


	// ======================================
	//
	//   II. Episode creation, computation
	//
	// ======================================

	addAndComputeEpisodeLeave(dstPt) {

		var lastEpisode = this.episodes.getLast();

		if (lastEpisode && !lastEpisode.isClosed()) {
			//UI.Debug.setTMult(0);
			//return Report.warn("lastEpisode not closed", `${this}`);

			// It appears unit has already planned to start movement.
			// Reject EpisodeLeave, go on.
			AI.statInc('computeEpisodeLeave-rejected');
			return;
		}

		var episode = this.createNewEpisode("Leave", dstPt);

		var result = this.computeEpisode(episode);

		if (result)
			AI.statInc('computeEpisodeLeave-ok');
		else
			AI.statInc('computeEpisodeLeave-error');

		return result;
	}


	// as of 2022.12 in EpisodeCollection:
	//
	// - every episode is closed (except for maybe the last which is then isPartiallyComputed)

	// Return values:
	// - true: may continue w/ further episodes
	// - undef.: idle to be added

	advanceEpisode() {

		var lastEpisode = this.episodes.getLast();

		if (!lastEpisode || lastEpisode.isClosed() ) {

			lastEpisode = this.createNewEpisode();

			if (!lastEpisode)
				return;
		}

		return this.computeEpisode(lastEpisode);
	}


	computeEpisode(lastEpisode) {

		var computeResult = lastEpisode.compute();

		if (lastEpisode.canBePartiallyComputed())

			if ( !( lastEpisode.isCompleted()
				|| lastEpisode.isStopped() && computeResult !== true
				|| !lastEpisode.isStopped() && computeResult === true
				|| computeResult !== true // e.g. "OpenSetExhaustion"
			) ) {

				Report.warn("unexpected partiallyComputed state", `${lastEpisode} result=${computeResult}`);
				console.log(lastEpisode);
				AI.throw();
			}


		if (computeResult === true) { // Episode was successfully computed

			if (lastEpisode.isCompleted()) {

				if (lastEpisode.isMove() && lastEpisode.pL0)
					AI.statInc('expanCount-computed', lastEpisode.pL0.expanCount);

			} else { // partially computed OK
				console.assert(lastEpisode.canBePartiallyComputed());
				// what if at least once was computed successfully (got wayPoints): stopped=true, bad result
			}

			if (!lastEpisode.isIdle())
				this.numEpisodesIdle = 0;

			// update after each computed episode. This is required for events -> item accounting.

			this.updateTrackList();
			return true;
		}

//? TODO
		if (lastEpisode.isMove() && lastEpisode.pL0)
			AI.statInc('expanCount-not-computed', lastEpisode.pL0.expanCount);


		// Episode compute error.

		if (computeResult == "SmashedAtStart") {

			// As of 2022-12-29 not reported; reported is OpenSetExhaustion
			// replaced w/ Idle; then proceeded as w/ Idle

			AI.statInc('--SmashedAtStart');

			//if ( this.cancelSmashingEpisode(lastEpisode) )

			// TODO (ASDynamic) return 1st of several smashing tracks (where possible)
			let smashingTrack = lastEpisode.getCollidingAtStartTrack();
			if (!smashingTrack)
				return Report.warn("no smashing track", `${lastEpisode}`);

			AI.statInc('cancelSmashingEpisode');

			console.error(`### smashingTrack.unit=${smashingTrack.unit.id}`);

			//smashingTrack.unit.aI.throwOutTrack(smashingTrack, lastEpisode.id);

			smashingTrack.unit.aI.removeOffendingTrack(smashingTrack, lastEpisode.id);

			// TODO? keep episode w/ dataL1 etc.
			this.episodes.removeEpisodeByIdAndAfter(lastEpisode.id);

			this.updateTrackList();
			
			return true;
		}


		// Compute error - remove episode.

		if (lastEpisode.isStopped()) { // no episodes after

		} else
			this.episodes.removeEpisodeByIdAndAfter(lastEpisode.id); // no episodes after... ok

		this.updateTrackList();


		// checks...

		lastEpisode = this.episodes.getLast();

		if (lastEpisode && !lastEpisode.isClosed() )
			this.setupFullReplanning("uncomplete episode", `${lastEpisode}`);
	}


	advanceWithIdle(idleTime) {

		var episode = this.createNewEpisode("Idle"); // no .dst / etc - must be no probs to add
		console.assert(episode);

		//console.assert(!idleTime);

		//if (!idleTime)
		//	idleTime = this.getIdleComputeTime(); // moved to inside episode

		var result = episode.compute(idleTime);

		if (!result) { // e.g. colliding & !throwOutWP
			Report.warn("IDLE not computed", `uId=${this.unit.id}`);
			AI.stop();
			return;
		}

		this.updateTrackList();
	}


	getIdleComputeTime() {

		return this.numEpisodesIdle < 5 ? 1 :
			this.numEpisodesIdle < 10 ? 1.5 : 3;
	}


	createNewEpisode(type, arg) {

		AI._onAddNewEpisode && AI._onAddNewEpisode(this.unit);

		var lastEpisode = this.episodes.getLast();
		var startNode;

		if (lastEpisode) {
			startNode = lastEpisode.getEndNode();

		} else {
			startNode = new VGNode(this.unit.position.x, this.unit.position.z).setG(Engine.time);
			startNode.angle = this.unit.facing;
		}

		console.assert(startNode.angle !== undefined);

		var startTime = lastEpisode ? lastEpisode.getEndTime() : Engine.time;

		if (!Number.isFinite(startTime))
			return Report.warn("bad endTime", `e=${lastEpisode} t=${startTime}`);

//. ever used?  requires callee to check type of lastEpisode
/*
		var facing = lastEpisode && lastEpisode.getTargetFacing();
		var target = lastEpisode && lastEpisode.getTargetData();
*/

		var episode;

		episode = this.task.createEpisodeIfRequiresReEquip(startNode);

		if (episode) {

		} else if (type == "Idle") {

			episode = new EpisodeIdle(this.task, startNode);

		} else if (type == "Leave") {

			episode = new EpisodeLeave(this.task, startNode, arg); // TODO robot takeoff/touchdown

		} else {
			episode = this.task.addEpisode(startNode);//, facing, target);
		}


		episode && this.episodes.add(episode);

		return episode;
	}

/*
	handleSmashedAtStart(lastEpisode) {

		console.assert(lastEpisode.isMove());
console.warn('handleSmashedAtStart');
		AI.statInc('handleSmashedAtStart');

		if ( !this.cancelSmashingEpisode(lastEpisode) ) {

			if (this.episodes.getCount() === 1) {
				Report.warn("the only episode is SmashedAtStart, can't resolve");
				AI.stop(); AI.throw();
			}

			return;
		}

		return true;
	}
*/
/*
	cancelSmashingEpisode(lastEpisode) {

		// Cancel episode that has caused the collision...

		var smashingTrack = lastEpisode.getCollidingAtStartTrack();
		if (!smashingTrack)
			return Report.warn("no smashing track", `${lastEpisode}`);

		AI.statInc('cancelSmashingEpisode');

console.error(`### smashingTrack.unit=${smashingTrack.unit.id}`);

		smashingTrack.unit.aI.throwOutTrack(smashingTrack, lastEpisode.id);

		// & let it compute equal episode again (TODO? keep w/ .dst, .dataL1)

		this.episodes.removeEpisodeByIdAndAfter(lastEpisode.id);
		this.updateTrackList();

		return true;
	}
*/


	// ======================================
	//
	//   III. Various
	//
	// ======================================

	updateTrackList() {

		var wayPoints = this.episodes.getCurrentWayPoints();

		this.unit.trackList.updateFromWayPoints(wayPoints);
	}


	forceReplanning(cancelCurrentEpisode = true) {

		var t = Engine.time + 0.2;
		var episode = this.episodes.getByTime(t);

		if (!episode) {
			t = Engine.time;
			episode = this.episodes.getByTime(t); // now must get one
		}

		if (!episode) { // at startup
			//Report.warn("forceReplanning: no episode", `${this}`);
			return;

		} else {

			this.episodes.removeEpisodesAfter(episode.id);

			if (cancelCurrentEpisode) {

				episode.cancelAt(t);

				if (!episode.wayPoints)
					Report.warn("forceReplanning: no WPs remain", `${this}`);
			}

//console.error(`forceReplanning after:${episode.id} ${episode.type} endTime:${this.episodes.getEndTime()}`, Array.from(this.episodes) );
		}
//!
		this.updateTrackList();
	}


	setupFullReplanning(reason, data) {

		//if (reason != "setTask" && reason != "throwOutTrack")
		//	Report.warn(`FULL REPLAN: "${reason}"`, `uId=${this.unit.id} | ${data}`);

		AI.statInc('replan-full');

		this.episodes.removeEpisodeByIdAndAfter(0);
		this.updateTrackList();
	}


	removeOffendingTrack(track, fromEpisodeId) { // Called by other units' AI

		Report.warn("not used");

		if (!track) { // track must have disappeared after previous recomputation.
console.log(`removeOffendingTrack: no track`);
			return;
		}

		var wP = track.data.wP;

		if (wP.g < Engine.time)
			return Report.warn("outdated offending WP");

		var episode = this.episodes.getById(wP.episodeId);

		if (!episode) { // must have disappeared after previous recomputation.
console.log(`removeOffendingTrack: no episode`);
			return;
		}

		AI.statInc('removeOffendingTrack-Episode');

		// TODO careful w/ partiallyComputed

		this.episodes.removeEpisodeByIdAndAfter(episode.id);
	}


	throwOutTrack(track, fromEpisodeId) {

		if (!track) { // track may disappear after previous throwOutTrack caused recomputation.
console.log(`throwOutTrack: no track`);
			return;
		}

		var wP = track.data.wP;

		if (wP.g < Engine.time)
			Report.warn("outdated cancelWP");

		var episode = this.episodes.getById(wP.episodeId);
		if (!episode) { // must have disappeared after previous track caused recomputation.
//console.log(`throwOutTrack: no episode`);
			return;
		}

		var episodeAlreadyStarted = episode.getStartTime() <= Engine.time;

//console.log(`throwOutTrack: episodeId=${wP.episodeId} episodeAlreadyStarted=${episodeAlreadyStarted}`);

		if (!episodeAlreadyStarted) {

//AI.stop();return;
			AI.statInc('throwOutTrack-episodeNotStarted');

			this.episodes.removeEpisodeByIdAndAfter(wP.episodeId);

			// Immediately update actionPlan, remove tracks from spatialIndex
			this.updateTrackList();
			return;
		}


		AI.statInc('throwOutTrack-episodeAlreadyStarted');

		var trackAlreadyStarted = track.t1 <= Engine.time;

		if (trackAlreadyStarted)
			AI.statInc('throwOutTrack-trackAlreadyStarted');

		// What if no episodes:
		// - episodes.getWayPoints() return [].

		// Considering:
		// 1) re-create, compute episode immediately
		// 2) set some kind of intermediate state, add and compute episode later

		// TODO reuse existing episode + solve partial comp. probs.

		this.setupFullReplanning("throwOutTrack", `fromEpisodeId=${fromEpisodeId} ${episode}`);
	}



	// =======================================
	//
	//   Updates.
	//
	// =======================================
/*
	stop() { console.error(`not impl., use global stop`);this.stopped = true }

	isStopped() { return AI.stopped || this.stopped }
*/

	static start() {
		AI.lastUpdateT = Engine.time;
	}


	static stop() {

		AI.stopped = true;
		Main.area.events.stopped = true;
		Report.warn(`AI: STOPPED ALL (+events) t=${Engine.time} f=${Engine.frameNum}`);
	}

	static isStopped() { return AI.stopped; }

	static onAddNewEpisode(fn) { AI._onAddNewEpisode = fn; }


	static update() {

		if (AI.stopped)
			return;

		var expectedTMax = AI.lastUpdateT + AI.T_RUN_INTERVAL_MAX;

		if (expectedTMax < Engine.time) {

			Report.warn("delay beyond AI.T_RUN_INTERVAL_MAX",
				`expectedTMax=${expectedTMax} Engine.time=${Engine.time}`);
		}

		AI.lastUpdateT = Engine.time;


		var chars = Main.getUnits();

		// At the start of AI.update(), at given Engine.time, unit positions, facings are up-to-date.

		chars.forEach(c => c.updatePositionFacing());

		AI.checkAndResolveUnitIntersection(chars);


		try {

var DEBUG = 0;

if (DEBUG)
console.error(`AI.update START f=${Engine.frameNum}`);

			chars.forEach(char => char.aI.removeOutdated());

			var UPDATES_MAX = 15;

			for (AI.passNum = 0; AI.passNum < UPDATES_MAX; AI.passNum ++) {

				if (this.updatePass(chars)) // It goes at least 1 updatePass call (i=0)
					break;
			}

if (AI.passNum >= 5)
Report.warn(`AI.update passNum=${AI.passNum}`);

if (AI.passNum >= UPDATES_MAX)
Report.warn(`AI.passNum >= UPDATES_MAX passNum=${AI.passNum}`);

if (DEBUG)
console.error(`AI.update END f=${Engine.frameNum}`);

		} catch (e) {
			AI.checkException(e);
console.error(`AI Exception`, e);
			AI.stop();
		}


		if (AI.stopped)
			return;

		chars.forEach(char => {

			if ( char.aI.episodes.getEndTime() <= AI.getMinEndT() ) {

				Report.warn("AI.getMinEndT()", `${char} lastEpisode=${char.aI.episodes.getLast()}`
					+ ` Engine.time=${Engine.time} haveEndTime=${char.aI.episodes.getEndTime()}`
					+ ` requires=${AI.getMinEndT()} AI.passNum=${AI.passNum}`);

				AI.stop();
			}
		});
	}


	static updatePass(chars) {

		if ( AI.stopped || chars.every(char => !char.aI.doesRequireUpdate()) )
			return true;

		for (let i = 0; i < chars.length; i++) {

			chars[i].aI.update();

			if (AI.stopped)
				return true;
		}
	}



	static checkAndResolveUnitIntersection(chars) {

		var char = this.checkUnitIntersection(chars);
		if (!char)
			return;

		var p = char.checkAndHandleCollision("aIUpdate");
		if (!p)
			return AI.stop();


		if (this.checkUnitIntersection(chars)) {

			Report.warn("IMPOSSIBLE: intersection after collision successfully handled");
			AI.stop();
		}
	}


	static checkUnitIntersection(chars) {

		var p = AI._p || (AI._p = new Point);

		for (let i = 0; i < chars.length - 1; i++) {

			p.copy( chars[i].getPoint() );

			let ri = chars[i].getRadius();

			for (let j = i + 1; j < chars.length; j++) {

				let d = p.distanceToPoint( chars[j].getPoint() );

				if (d < ri + chars[j].getRadius()) {

					Report.warn(`CHAR INTERSECTION d=${d} ${chars[i]} ${chars[j]}`
						+ ` t=${Engine.time} f=${Engine.frameNum}`);

					return chars[i];
				}
			}
		}
	}



	// =======================================
	//
	//   Task Management.
	//
	// =======================================

	stopTask() {
		this.setTask( new TaskIdle(this.unit) );
	}


	// Action interrupting; animation
	cancelTask() {

		if (this.task instanceof TaskIdle)
			return Report.warn("already idle", `uId=${this.unit.id}`);

		this.setTask( new TaskIdle(this.unit) );
	}


	setTask(task) {

		console.assert(task.unit === this.unit);

		if (this.task)
			this.cancelTaskEpisodes();

		this.task = task;

		UI.setRequiresUpdateFor(this.unit);
	}


	cancelTaskEpisodes() {

		var cancelT = Engine.time + AI.T_CANCEL_DELTA;

		// (usually?) must get one (T_HORIZON_MIN > T_CANCEL_DELTA)
		var episode = this.episodes.getByTime(cancelT);

		if (!episode) {
			episode = this.episodes.getByTime(Engine.time);
		}

		if (!episode) {

			if (Engine.frameNum > 0) {

				console.log(Array.from(this.episodes));
				Report.warn("no episode", `uId=${this.unit.id} cancelT=${cancelT}`
					+ ` getEndT=${this.episodes.getEndTime()} t=${Engine.time}`);
			}

		} else {
			episode.cancelAt(cancelT);
			this.episodes.removeEpisodesAfter(episode.id);
		}
	}



	// =======================================
	//
	//   Status Queries
	//
	// =======================================

	isIdle() {
		return this.task.isIdle() || this.task.isTaskFinished();
	}


	getActiveTask(type) {

		console.assert(type);

		if (this.task.type === type && !this.task.isTaskFinished())
			return this.task;
	}


	getLangOrderShortDescription() {

		var str = Lang(this.task.constructor.name);

		if (this.task.isTaskFinished())
			str += " " + Lang("task_finished");

		return str;
	}
}


AI.passNum = 0;
AI.passNumIdleOnly = 10;

AI.stopped = false;

AI._onAddNewEpisode = null;


Object.assign(AI, {

	DEBUG: 1,

	T_RUN_INTERVAL_MAX: 0.5,

	T_HORIZON_MIN: 3,
	//T_HORIZON_MAX: 4,

	T_CANCEL_DELTA: 0.35,

	//D_FRAGMENTED_RUN: 20,
	//D_FRAGMENTED_RUN_EXTRA: 10,

	DISTANCE_PARTIAL_ADVANCE: 25,
	DISTANCE_PARTIAL_LIMIT: 40,

	lastUpdateT: 0,
	_p: null,
});




AI.throw = function(type) {

	throw {
		isAIException: true,
		type,
		stack: (new Error).stack
	};
}


AI.checkException = function(e) {

	if (!e.isAIException)
		throw e;
}

/*
	static roundTime(t) {
		return t;
		//TODO return Math.floor(t / AI.Interval) * AI.Interval;
	}
*/



AI.stats = {};

AI.prototype.statInc = function(key, v = 1) {
	if (Main.DEBUG >= 3)
		AI.stats[key] = (AI.stats[key] || 0) + v;
}

AI.statInc = function(key, v = 1) {
	if (Main.DEBUG >= 3)
		AI.stats[key] = (AI.stats[key] || 0) + v;
}


AI.show = function() {

	var avg1 = AI.stats['expanCount-path-not-found'] / AI.stats['episodes-path-not-found'];
	var avg2 = AI.stats['expanCount-computed'] / AI.stats['episodes-computed-move'];

	console.log(`AVG:`
		+ ` (expan/path-not-found)=${avg1.toFixed(0)}`
		+ ` (expan/computed-move)=${avg2.toFixed(0)}`
	);

}




export { AI };

