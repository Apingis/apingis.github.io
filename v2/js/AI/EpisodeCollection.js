
class EpisodeCollection extends Array {


	getCount() { return this.length; }

	getLast() { return this[this.length - 1]; }

	getById(id) { return id && this.find(e => e.id === id); }


	getByTime(t) {

		return this.find(e =>
			(e.isPartiallyComputed() || e.isClosed() )
			&& t >= e.getStartTime() && t <= e.getEndTime()
		);
	}

/* not tested
	getFirstIdle(t = Engine.time) {

		return this.find(e => 1

			&& e.isClosed() && e.isIdle()
			&& t >= e.getStartTime() && t <= e.getEndTime()
		);
	}
*/

	getCurrent() { return this.getByTime(Engine.time) }


	getEndTime() {

		if (this.length === 0)
			return Engine.time;

		var e = this[ this.length - 1 ];

		console.assert(e.isClosed() || e.isPartiallyComputed());

		return e.getEndTime();
	}


	endsWithPartiallyComputed() {

		var e = this.getLast();

		return e && e.isPartiallyComputed();
	}


	getCurrentWayPoints(curWPs = []) {
		this.forEach(e => e.addUpWayPoints(curWPs));
		return curWPs;
	}


	push(e) { this.add(e); }


	add(e) {

		console.assert(e && (e instanceof Episode));
		console.assert(!e.isClosed());

		var lastEpisode = this.getLast();
		console.assert(!lastEpisode || lastEpisode.isClosed() );

		AI.statInc('episodes-added');

		if (e.isMove())
			AI.statInc('episodes-added-moving');

		if (e.isIdle())
			AI.statInc('episodes-added-idle');

		super.push(e);
	}


	removeOutdated() {

		var t = Engine.time - EpisodeCollection.T_OUTDATE_DELTA;
		var removedSome;

		while (1) {
			let e = this[0];

			if (e && e.isClosed() && e.getEndTime() < t) {

				e.runOnRemove();
				this.shift();
				removedSome = true;

			} else
				break;
		}

		return removedSome;
	}


	removeNonOutdated(e, i) {

		AI.statInc('episodes-cancelled');

		if (e.isMove())
			AI.statInc('episodes-cancelled-moving');

		if (e.isClosed()) {
			AI.statInc('episodes-cancelled-completed');
			if (e.isMove())
				AI.statInc('episodes-cancelled-moving-completed');
		}

		e.runOnRemove();
		Util.cut(this, i);
	}


	removeEpisodesAfter(id, ifIncludeId) {

		for (let i = 0; i < this.length; i++)

			if (this[i].id > id || ifIncludeId && this[i].id === id) {
				this.removeNonOutdated(this[i], i);
				i --;
			}
	}


	removeEpisodeByIdAndAfter(id) { this.removeEpisodesAfter(id, true); }


	stripIdleEpisodes() {

		var t = Engine.time;
		var i, e;

		for (i = this.length - 1; i >= 0; i--) {

			e = this[i];

			if (e.isIdle() && e.getStartTime() >= t)
				this.removeEpisodeByIdAndAfter(e.id);
			else
				break;
		}

		if (!e || !e.isIdle())
			return;

		if ( !(e.getStartTime() < t && this.length === i + 1) )
			return Report.warn("idle inconsistency", `t=${t} i=${i}/${this.length} ${e}`);

		e.cancelAt(t); // e: 1st Idle and not in the past
	}


	// It's possible 1 partially computed episode and it's the last one.
	removeAlreadyTravelledInPartiallyComputed() {

		var removedSome;
		var episode = this.getLast();

		// what removed: expansions etc. (travelled wayPoints remain)

		if (episode && episode.isPartiallyComputed()) // stopped?
			removedSome = episode.removeAlreadyTravelled(Engine.time);// - EpisodeCollection.T_OUTDATE_DELTA);

		return removedSome;
	}


}


EpisodeCollection.T_OUTDATE_DELTA = 0.5;



export { EpisodeCollection };

