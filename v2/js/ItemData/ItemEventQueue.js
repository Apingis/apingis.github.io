
class ItemEventQueue {

	constructor() {

		this.byTime = new Heap( (e1, e2) => e1.time - e2.time );

		this.byItem = new Map;

		this.byItem.add = function(event) {

			if (event.time < Engine.time)
				Report.warn("adding event from the past", `${event.time} ${Engine.time}`);

			var events = this.get(event.item);

			if (events) { // TODO Util.insertAscending()
				events.push(event);
				events.sort( (e1, e2) => e1.time - e2.time );

			} else
				this.set(event.item, [ event ]);
		}


		this.byItem.remove = function(event) {

			var events = this.get(event.item);
			if (!events) 
				return;

			var i = events.indexOf(event);
			if (i === -1)
				return;

			if (events.length > 1)
				Util.cut(events, i);
			else
				this.delete(event.item);

			return true;
		}


		this.byItem.removeByType = function(item, type) {

			var events = this.get(item);
			if (!events) 
				return;

			var i = events.findIndex(e => e.type === type);
			if (i === -1)
				return;

			var event = events[i];

			if (events.length > 1)
				Util.cut(events, i);
			else
				this.delete(item);

			return event;
		}

		this.stopped = false;
	}


	nextEventTime() {

		if (this.stopped)
			return;

		var event = this.byTime[0];

		return event && event.time;
	}


	get(item) { return this.byItem.get(item); }

	removeItem(item) { this.byItem.delete(item); }
		

	add(event) {

		this.byItem.add(event);
		this.byTime.insert(event);
	}


	remove(event) {

		this.byItem.remove(event);
		this.byTime.remove(event, true);
	}


	removeByType(item, type) {

		var event = this.byItem.removeByType(item, type);

		event && this.byTime.remove(event);
		return event;
	}


	executeEvents(time) {

		if (this.stopped)
			return;

		if (typeof time != "number" || time < 0)
			return Report.warn("executeEvents", `time=${time}`);

		while (1) {

			let event = this.byTime[0];

			if (event === undefined || event.time > time)
				break;

			this.byTime.fetch();
			this.byItem.remove(event);

			event.execute();
		}
	}


	// =====================================================================

	getEquipRightHandAt(unit, time) {

		var events = this.get(unit);
		if (!events)
			return;

		for (let i = events.length - 1; i >= 0; i--) {

			let e = events[i];
			if (e.time > time)
				continue;

			if (e.isTypeEquipAxe())
				return e.item2;

			if (e.isTypeDisarm())
				return false;
		}
	}

	// Returns:
	// - item
	// - false (definitely wouldn't be carrying)
	// - undefined (current status remains)
	getCarryingAt(unit, time) {

		var events = this.get(unit);

		if (!events)
			return;

		for (let i = events.length - 1; i >= 0; i--) {

			let e = events[i];

			if (e.time > time)
				continue;

			if (e.isTypeStartCarrying())
				return e.item2;

			if (e.isTypeStopCarrying())
				return false;

			if (e.time < Engine.time)
				Report.warn("events from the past (TODO)", `${e} ${Engine.time}`);
		}
	}


	isPlanningCarrying(unit, item) {

		var events = this.get(unit);

		if (!events)
			return;

		for (let i = 0; i < events.length; i++)

			if (events[i].isTypeStartCarrying() && events[i].item2 === item)
				return true;
	}


	isPlanningAxeHit(unit) {

		var events = this.get(unit);

		if (events)
			for (let i = 0; i < events.length; i++)

				if (events[i].isTypeAxeHit())
					return true;
	}



	// =====================================================================

	getRobotLoadedAt(unit, time) {

		var events = this.get(unit);

		if (!events)
			return;

		for (let i = events.length - 1; i >= 0; i--) {

			let e = events[i];

			if (e.time > time)
				continue;

			if (e.isTypeRobotLoad())
				return e.item2;

			if (e.isTypeRobotUnload())
				return false;

			if (e.time < Engine.time)
				Report.warn("events from the past (TODO)", `${e} ${Engine.time}`);
		}
	}


	haveLoadUnloadOperationBeforeOrAt(unit, time) {

		var events = this.get(unit);

		if (!events)
			return;

		for (let i = events.length - 1; i >= 0; i--) {

			let e = events[i];

			if (e.time > time)
				continue;

			if ( e.isTypeRobotLoad() || e.isTypeRobotUnload() )
				return true;
		}
	}


	getRobotFlyingAt(unit, time) {

		var events = this.get(unit);

		if (!events)
			return;

		for (let i = events.length - 1; i >= 0; i--) {

			let e = events[i];

			if (e.time > time)
				continue;

			if (e.isTypeRobotTakeoff())
				return true;

			if (e.isTypeRobotTouchdown())
				return false;
		}
	}

}


Object.assign(ItemEventQueue.prototype, {
});




export { ItemEventQueue }

