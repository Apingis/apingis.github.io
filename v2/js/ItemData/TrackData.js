
class TrackData {

	constructor(track, wP, prevWP, events) {

		this.track = track;

		this.wP = wP;
		this.prevWP = prevWP;

		console.assert( (wP instanceof VGNode) && (prevWP instanceof VGNode) );

		if (this.wP.isEpisodeStart())
			Report.throw("wP.isEpisodeStart", `${track}`);

		this.startFacing = undefined;
		this.facing = undefined;
		this.turnDuration = track.unit.isRobot() ? Action.TURN_DURATION_ROBOT : Action.TURN_DURATION;

		this.events = null;

		this.update(events);
	}

	get action() { console.error(`get action`); }

	get wayPoint() { console.error(`get wayPoint`); }


	update(events) { // having current and previous track

		if (this.track.t2 < Engine.time)
			return Report.warn("updating outdated track", `${this.track}`);

		//   I. Facing

		this.startFacing = this.prevWP.angle;
console.assert(this.startFacing !== undefined);

		this.facing =
			this.wP.angle !== undefined ? this.wP.angle :
			!this.track.isInPlace() ? this.track.angle() :
			this.startFacing;
console.assert(this.facing !== undefined);

		// Q. Should it depend on angle?
		this.turnDuration = Math.min(
			this.track.t2 - this.track.t1,
			this.track.unit.isRobot() ? Action.TURN_DURATION_ROBOT : Action.TURN_DURATION
		);


		//   II. Events

		this.createAndRegisterEvents(events); // repeated call OK
	}

	//
	// Q. What if the track is currently being walked,
	// some of the events could have been already executed.
	//
	createAndRegisterEvents(events) {

		var getEvent = (type) => {

			if (events) { // from a track being replaced
				return events.find(e => e.type === type);
			} else
				return this.events && this.events.find(e => e.type === type);
		};

		var newEvents = [];
		var addEvent = (e) => e && e.time >= Engine.time && newEvents.push(e);

		var wPData = this.wP.data;

		if (wPData.startFn) {

			let e = getEvent("StartFn");

			if (!e || !e.executed) {
				e = Action.createRawEvent("StartFn", this.track.unit, this.track.t1, wPData.startFn);
				addEvent(e);
			}
		}


		for (let i = 0; i < Action.getEventCount(wPData.action); i++) {

			let eventType = Action.getEventType(wPData.action, i);
			let e = getEvent(eventType);

			if (!e || !e.executed) {
				e = Action.createWayPointEvent(i, this.track, this.wP);
				addEvent(e);
			}
		}


		if (wPData.arriveFn && !this.wP.hasFlags(VGNode.CUT_TRACK)) {

			let e = getEvent("ArriveFn");

			if (events && e && !e.executed && e.time <= this.track.t2 // in case of CUT_TRACK
					|| (!e || !e.executed) ) {

				e = Action.createRawEvent("ArriveFn", this.track.unit, this.track.t2, wPData.arriveFn);
				addEvent(e);
			}
		}


		this.withdrawEvents();

		this.events = newEvents;
		this.events.forEach(event => Main.area.events.add(event));
	}


	withdrawEvents() {
		this.events && this.events.forEach(event => Main.area.events.remove(event));
		this.events = null;
	}


}



export { TrackData };

