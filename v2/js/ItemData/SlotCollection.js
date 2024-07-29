
class SlotCollection {

	constructor() {

		this.slotById = new Map;
		this._maxId = 0;

		if (Main.isServer)
			return;


		this.slotByNextEventT = {

			_heap: new Heap( (a, b) => 0
				|| a.getNextExecuteEventT() - b.getNextExecuteEventT()
				|| a.id - b.id // Heap requires strict ineq.
			),


			addSlot(slot, t) { // incl. modified slots

				var eventT = slot.getNextExecuteEventT(); // (doesnt matter) heap doesn't necessarily call cmpFn

				if (typeof eventT != 'number' || eventT <= t)
					return Report.warn("incorrect eventT", `${slot} eventT=${eventT} t=${t}`);

				if (eventT === Infinity)
					return;

				this._heap.insert(slot);
			},


			updateSlot(slot, t) {

				var i = this._heap.getObjIndex(slot);

				if (i === -1)
					return;

				this._heap.removeByIndex(i);

				this.addSlot(slot, t);
			},


			getNextEventT(t) {

				console.assert(typeof t == "number");

				return this._heap[0] ? this._heap[0].getNextExecuteEventT() : Infinity;
			},


			executeEvents(t) {

				for (let i = 0; i < 1e4; i++) {

					if (this.getNextEventT(t) > t)
						return;

					let slot = this._heap.fetch();

					slot.executeEvent(t);

					this.addSlot(slot, t);
				}

				Report.warn("executeEvents loop", `t=${t}`);
			},
		};
	}


	getById(id) { return this.slotById.get(id); }

	getAll() { return [ ...this.slotById.values() ]; }

	forEach(fn) { this.slotById.forEach(slot => fn(slot)); }


	addSlotsById(slotsById) {

		console.assert(typeof slotsById == "object");

		Object.values(slotsById).forEach(slot => this.add(slot));

		return this;
	}


	getNextId() { return this._maxId + 1 }


	add(slot) {

		console.assert(slot instanceof Slot);

		if (this.slotById.has(slot.id))
			return Report.warn("already in collection", `${slot}`);

		this.slotById.set(slot.id, slot);

		this._maxId = Math.max(this._maxId, slot.id);

		if (Main.isServer)
			return;


		slot.initialPlacement(Engine.time);

		this.slotByNextEventT.addSlot(slot, Engine.time);
	}




	fromJSON(data) {

		console.assert(Array.isArray(data));

		if (Main.DEBUG >= 5 && this.slotById.size > 0)
			Report.warn("slots not empty - ok");

		data.forEach(slotData =>
			this.add(Slot.fromJSON(slotData)) );

		return this;
	}


	toJSON() {
		return [ ...this.slotById.values() ];
	}


	getNextEventT(t) { return this.slotByNextEventT.getNextEventT(t) }

	executeEvents(t) { return this.slotByNextEventT.executeEvents(t) }


	verify(t = Engine.time) {

		this.forEach( slot => {

			if ( slot.isModified() )
				return;

			var currentItem = slot.getCurrentItem();
			var specName = slot.getSpecNameAt(t);

			if ( currentItem && currentItem.spec.name !== specName
					|| !currentItem && specName )

				console.error(`${slot} have=${currentItem && currentItem.spec.name}`
					+ ` must have=${specName}`);
		});
	}

}




export { SlotCollection }

