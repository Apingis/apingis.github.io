

var _p;


class Slot {

	constructor(id, position, facing, seed, type, quaternion, modT = null) {

		this.id = id;
		this.position = position || new THREE.Vector3;
		this.facing = facing || 0;
		this.seed = seed || 0;

		if (this.seed < 0 || this.seed > 4294967295) {

			Report.warn("bad seed", `${this} seed=${this.seed}`);
			this.seed = Util.clamp(this.seed, 0, 4294967295);
		}

		this.type = type || "tree";
		this.quaternion = quaternion || null;

		//this.modT = modT || null; // modT=0 is valid; slot was modified at t=0.
		this.modT = modT;
		this.itemId = null;
		this.flags = 0 |0;

		this._execEventT = -1; // last executed
		this._nextEventT = -1; // next for execution (caching)
	}


	toString() {
		var itemStr = (!this.isModified() && this.itemId) ? ` itemId=${this.itemId}` : "";
		var modStr = this.isModified() ? ` mod=${Util.toStr(this.modT)}` : "";
		return `[Slot id=${this.id} type=${this.type}${itemStr}${modStr}]`;
	}

	get p() { Report.warn(`p`) }
	set p(v) { Report.warn(`p`) }

	isStatic() { return this.type != "tree"; } // Item always remains the same

	isImmune() { return this.type != "tree"; } // Can't modify

	isModified() { return this.modT !== null; }

	// slot "removed" (from DB): means restored to original state
	isRemoved() { return (this.flags & Item.FLAG_REMOVED) !== 0; }

	setUpdated() {
		this.flags |= Item.FLAG_UPDATED;
		this.flags &= ~Item.FLAG_REMOVED;
	}

	hasFlagUpdated() { return (this.flags & Item.FLAG_UPDATED) !== 0; }


	static fromJSON(data) {

		var slot = new Slot(

			data.id,
			new THREE.Vector3(data.x, data.y || 0, data.z),
			data.facing,
			data.seed,
			data.type,
			('qx' in data) ? new THREE.Quaternion(data.qx, data.qy, data.qz, data.qw) : null,
			data.modT,
		);

		return slot;
	}


	toJSON() {

		var obj = {

			id: this.id,
			x: this.position.x,
			z: this.position.z,
		};

		this.position.y !== 0 && (obj.y = this.position.y);
		this.facing !== 0 && (obj.facing = this.facing);
		this.seed && (obj.seed = this.seed);
		this.type != "tree" && (obj.type = this.type);

		if (this.quaternion) {
			obj.qx = this.quaternion.x;
			obj.qy = this.quaternion.y;
			obj.qz = this.quaternion.z;
			obj.qw = this.quaternion.w;
		}

		this.modT !== null && (obj.modT = this.modT);

		return obj;
	}


	getPoint() { return (_p || (_p = new Point)).copyFromVector3(this.position) }


	getColor(t) {

		if (this.type != "tree")
			return 0;

		var n = this.seed + 3571 * this.getPeriodNumAtStartT( this.getStartT(t) );

		// This would be seed ending with:
		// ..LLTTSS
		// (L: leaf color, T: trunk color, S: species - during periodNum=0)

		var trunkColor = Math.floor(n / 100) & 3;
		var leafColor = Math.floor(n / 10000) & 3;

		return (leafColor << 2) | trunkColor;
	}


	getOffsetTNorm() { return 1 - this.seed / 4294967296 }

	getPeriod() {
		return this.type == "tree" ? Slot.roundEventT(Slot.tree.PERIOD)
			: Infinity;
	}

	// * t must fall on startT.
	// * t=0: periodNum=0 is going for all slots w/ startT < 0. For slots w/ startT=0,
	//   periodNum=1 is going.
	// * For slots w/ infinie period, it's always periodNum=0.

	getPeriodNumAtStartT(t) {

		var period = this.getPeriod();

		return period === Infinity ? 0 : Math.floor(t / period) + 1;
	}


	getContentDescrAtStartT(t) { // t must fall on startT

		var n = this.seed + 37 * ((this.seed >>> 20) & 7) * this.getPeriodNumAtStartT(t);

		// 2 last decimal digits in seed define content.

		var d = n - 100 * Math.floor(n / 100);

		if (d < 57) {

			if (d < 10)
				return Slot.tree.aspen21;

			if (d < 23)
				return Slot.tree.aspen2;

			if (d < 32)
				return Slot.tree.aspen22;

			return Slot.tree.aspen1;
		}

		if (d > 94)
			return Slot.tree.aspen31;

		if (d > 76)
			return Slot.tree.aspen3;

		return Slot.tree.aspen4;
	}


	getStartT(t) { // current cycle

		var period = this.getPeriod();

		if (period === Infinity)
			return 0;

		var tStart = ( Math.floor(t / period) + this.getOffsetTNorm() ) * period;

		tStart = Slot.roundEventT(tStart);

		return tStart <= t ? tStart : tStart - period;
	}


	getNextStartT(t) { return this.getStartT(t) + this.getPeriod(); }

	//
	//    2 types of slot events:
	// * unmodified slot: content change
	// * modified slot: check restore op
	//
	static roundEventT(t) { return Math.ceil(t / Slot.ROUND_EVENT_T) * Slot.ROUND_EVENT_T }

	roundEventT(t) { return Slot.roundEventT(t) }


	getEventT() { console.error(`obsolete, use getEventTAt(t, ifNextEvent)`) }


	getEventTAt(t, ifNextEvent) { // ifNext: in case event happens exactly at t

		if (this.isImmune())
			return Infinity;

		if (this.isModified()) {

			if ( ifNextEvent && t === this.getStartT(t) )
				return this.getStartT(t);
			else
				return this.getNextStartT(t);
		}

		return this.getContentEventTAt(t, !ifNextEvent);
	}


	getSpecNameAt(t, isBeforeEvent) {

		if (this.isStatic())
			return this.type;

		var contentTiming = this.getContentTimingAt(t, isBeforeEvent);

		return contentTiming && contentTiming.contentElem.name;
	}


	getContentEventTAt(t, isBeforeEvent) {
		return this.getContentTimingAt(t, isBeforeEvent).tEnd;
	}


	getContentTimeUnitsTotal(contentDescr) {
		return contentDescr.contentData.reduce( (sum, el) => sum += (el.t || 1), 0 );
	}


	getContentTimingAt(t, isBeforeEvent) {

		var period = this.getPeriod();
		var startT = this.getStartT(t);

		var contentDescr = this.getContentDescrAtStartT(startT);
		var contentData = contentDescr.contentData;

		var tUnitsTotal = this.getContentTimeUnitsTotal(contentDescr);
		var tUnits = 0; // "content time units"

		//_contentTimingAt: { contentElem: null, tStart: 0, tEnd: 0 },
		var contentTimingResult = Slot._contentTimingAt;

		if (isBeforeEvent && t === startT) { // startT equals to the very 1st event

			contentTimingResult.contentElem = contentData[0];
			contentTimingResult.tEnd = startT;

			let sub_tUnits = contentData[ contentData.length - 1 ].t || 1;

			contentTimingResult.tStart = startT - Slot.roundEventT( sub_tUnits / tUnitsTotal * period );

			return contentTimingResult;
		}

		var prevEventT = startT;

		for (let i = 0, len = contentData.length; i < len; i++) {

			tUnits += (contentData[i].t || 1);

			let eventT = startT + Slot.roundEventT( tUnits / tUnitsTotal * period );

			if (t < eventT || isBeforeEvent && t === eventT) {

				contentTimingResult.contentElem = contentData[i];
				contentTimingResult.tEnd = eventT;
				contentTimingResult.tStart = prevEventT;

				return contentTimingResult;
			}

			prevEventT = eventT;
		}

		Report.warn("can't happen", `${this} t=${t}`);
	}


	static print(seed) {

		console.assert(seed >= 0 && seed <= 99);

		var slot = new Slot(0, null, null, seed);
		var startT = slot.getStartT(-Slot.ROUND_EVENT_T);

		var contentDescr = slot.getContentDescrAtStartT(startT);
		var contentTimeUnitsTotal = slot.getContentTimeUnitsTotal(contentDescr);
		var tUnits = 0;

		console.log(`contentTimeUnitsTotal=${contentTimeUnitsTotal}`);

		for (let i = 0; i < contentDescr.contentData.length; i++) {

			let contentElem = contentDescr.contentData[i];

			// close approximate
			let s = Math.floor(2 **32 / contentTimeUnitsTotal * tUnits);

			s = Math.floor(s / 1e6) * 1e6 + seed % 100;

			let frac = (contentElem.t || 1) / contentTimeUnitsTotal

			console.log(`${s} ${contentElem.name || '---'} ${(frac*100).toFixed(0) + '%'}`);

			tUnits += (contentElem.t || 1);
		}
	}


	getCurrentItem(localKey) {
		return this.itemId && Item.byId(this.itemId, localKey);
	}


	checkRestore(t) {

		if (t !== this.getStartT(t))
			return;

		// * Assuming slot has item at the start of a cycle.
		//   Other cases were not considered.

		var specName = this.getSpecNameAt(t);
		if (!specName)
			Report.warn("no specName at the start of the cycle", `${this}`);

		var restoreCheckOK = !specName ? true : this.checkRestoreEnvironment(specName, t);

		if (this.isModified()) {

			if (!restoreCheckOK) // Won't restore, remain modified
				return;

			this.restore(t);

			Accounting.addEntry(this, "slotRestore");

			return;
		}

		if (!restoreCheckOK) { // Unmodified slot: start of a cycle.

			this.modify(t, true);

			Accounting.addEntry(this, "slotRestore", { fail: 1 });
		}
	}


	getNextExecuteEventT(t = 0) {

		if (this._nextEventT > this._execEventT)
			return this._nextEventT;

		this._nextEventT = this.getEventTAt(this._execEventT !== -1 ? this._execEventT : t, true);

		if (this._nextEventT <= this._execEventT)
			Report.warn("incorrect nextEventT", `${this} t=${t}`);

		return this._nextEventT;
	}


	executeEvent(t) {

		if (this._execEventT === t)
			return Report.warn("slot event already executed", `${this} ${t}`);

		var eventT = this.getEventTAt(t);

		if (eventT !== t)
			return Report.warn("slot executeEvent bad timing", `${this} ${eventT} ${t}`);

		this._execEventT = t;

		this.updateItem(t);
	}


	initialPlacement(t, localKey) {

		this._execEventT = t; // in case event happens exactly at t.
/*
		let result = this.checkRestoreEnvironment(this.getSpecNameAt(t), t);

		if (!result) {
			Report.warn(`"${reason}" slot position occupied`, `${this} t=${t}`);
			this.modify(t);
		}
*/
		// NO: demo2-robocenter2-f; testCreateSlots/initDemo2_createTreeSlots

		this.updateItem(t, localKey, "initialPlacement");
	}


	updateItem(t, localKey, reason) {

		if (reason == "initialPlacement") {

		} else { // event exec.

			if (t !== Slot.roundEventT(t))
				return Report.warn("call not in time",
					`t=${t} roundEventT=${Slot.roundEventT(t)} ${this}`);

			this.checkRestore(t);
		}

		if (this.isModified())
			return;


		var currentItem = this.getCurrentItem(localKey);
		var specName = this.getSpecNameAt(t);

		//
		//     The Approach.
		// * Item Id remains, itemSpec (& maybe other props) change.
		//
		if (!currentItem && specName) {

			var item = Item.fromSlot(this, specName, t, localKey);
			item.setColor( this.getColor(t) );
			this.itemId = item.id;
//console.error(`SLOT ${this.id}: create item ${item}`);

		} else if (currentItem && !specName) {

			currentItem.removeItem(localKey);
			this.itemId = null;
//console.error(`SLOT ${this.id}: remove ${currentItem}`);

		} else if (currentItem && specName && currentItem.spec.name !== specName) {

			// Replace itemSpec.
			console.assert(currentItem.isUnmodifiedTree());


			//currentItem.removeDisplay(); // NO!!

			currentItem.setPositionNone(t); // this doesn't update .display (same mesh remains)

			//currentItem.removeDisplay(false); // highlight remains wrong
			currentItem.removeDisplay(); // highlight disappears

			currentItem.spec = ItemSpec.get(specName);
			console.assert(currentItem.spec);

			currentItem.setOn3D(t);
//console.error(`SLOT ${this.id}: replace -> ${currentItem.spec.name}`);

			//currentItem.updateDisplay(); // Also probs.

			//currentItem.updateHighlight(); // won't work
		}
	}


	// modify() is called:
	// - when slot is modified by user actions;
	// - from SlotCollection events. (? 2024.06 no calls from SlotCollection)
	modify(t, fromEvent) {

		if (typeof t != "number") {
			Report.warn("bad t", `${t}`);
			t = 0;
		}

		if (this.isModified())
			return Report.warn("slot already modified", `${this}`);

		if (this.isImmune())
			return Report.warn("slot is immune", `${this}`);

		this.modT = t;
		//this.itemId = null;// this and item.slotId: by the caller!

		this.setUpdated();

		if (Main.isServer || fromEvent)
			return;

		Local.get().slots.slotByNextEventT.updateSlot(this, t);
	}


	restore(t) {

		if (!this.isModified())
			Report.warn("not modified", `${slot}`);

		this.modT = null;
		this.flags |= Item.FLAG_REMOVED;
	}


	checkRestoreEnvironment(specName, t, localKey) {

		if (Main.isServer)
			Report.throw("wrong run");

		var itemSpec = ItemSpec.get(specName);

		if (!itemSpec)
			return Report.warn("no specName", `${this}`);

		var p = this.getPoint();

		// I. Collides w/ anything?

		if ( Main.area.spatialIndex.intersectsStaticOrTracks(itemSpec, p, this.facing, t) )
			return;

		// II. Prohibits grabbing?

		var polygon = itemSpec.createPolygon(p.x, p.y, this.facing, 0); // RC 0 (char)

		if ( this.checkPolygonIntersectingGrabbingLocations(polygon) )
			return;

		return true;
	}

	//
	// polygon should not contain any grabbing location (return true if it contains)
	// mb. TODO more strict check (incl. other colliding items)
	//
	checkPolygonIntersectingGrabbingLocations(polygon) {

		return Main.area.spatialIndex.getAllItemsUsingShape(polygon).some(item => {

			if (item.canGrab() && item.getGrabLocations()
					.some(aP => polygon.contains(aP.x, aP.y)) )
				return true;
		});
	}


	static get(id, localKey) { return Local.get(localKey).slots.slotById.get(id) }


	static showAll() {

		Local.get().slots.getAll().forEach(s =>
			! s.getSpecNameAt(Engine.time) && s.getPoint().clone().showSign()
		);
	}

}


Object.assign( Slot, {

	ROUND_EVENT_T: 4,

	_contentTimingAt: { contentElem: null, tStart: 0, tEnd: 0 },
});


Slot.tree = {

	PERIOD: 2 * 24 * 3600,

	aspen1: {
		contentData: [
			{ name: "aspen1h1" },
			{ name: "aspen1h2" },
			{ name: "aspen1h3" },
			{ name: "aspen1h4" },
			{ name: "aspen1h5" },
			{ name: "aspen1h6" },
			{ name: "aspen1h7", t: 1.2 },
			{ name: "aspen1h8", t: 1.3 },
			{ name: "aspen1h8-d1" },
			{ name: "aspen1h8-d2" },
			{ name: "aspen1h8-d3" },
			{ name: "", t: 3 },
		],
	},

	aspen2: {
		contentData: [
			{ name: "aspen2h1" },
			{ name: "aspen2h2", t: 2 },
			{ name: "aspen2h4", t: 2 },
			{ name: "aspen2h6", t: 2 },
			{ name: "aspen2h8", t: 3.25 },
			{ name: "aspen2h8-d1", t: 1.1 },
			{ name: "aspen2h8-d2" },
			{ name: "", t: 4 },
		],
	},

	aspen21: {
		contentData: [
			{ name: "aspen2h1" },
			{ name: "aspen2h2", t: 2 },
			{ name: "aspen2h4", t: 2 },
			{ name: "aspen21h6", t: 2 },
			{ name: "aspen21h8", t: 3.25 },
			{ name: "aspen21h8-d1", t: 1.1 },
			{ name: "aspen21h8-d2" },
			{ name: "", t: 4 },
		],
	},

	aspen22: {
		contentData: [
			{ name: "aspen2h1" },
			{ name: "aspen2h2", t: 2 },
			{ name: "aspen22h4", t: 2 },
			{ name: "aspen22h6", t: 2 },
			{ name: "aspen22h8", t: 3.25 },
			{ name: "aspen22h8-d1", t: 1.1 },
			{ name: "aspen22h8-d2" },
			{ name: "", t: 4 },
		],
	},


	// =========================================

	aspen3: {
		contentData: [
			{ name: "aspen3h1" },
			{ name: "aspen3h2" },
			{ name: "aspen3h3", t: 2 },
			{ name: "aspen3h5", t: 2 },
			{ name: "aspen3h7", t: 2 },
			{ name: "aspen3h9", t: 3.5 },
			{ name: "aspen3h9-d1", t: 1.2 },
			{ name: "aspen3h9-d2" },
			{ name: "", t: 4 },
		],
	},

	aspen31: {
		contentData: [
			{ name: "aspen3h1" },
			{ name: "aspen3h2" },
			{ name: "aspen3h3", t: 2 },
			{ name: "aspen31h5", t: 2 },
			{ name: "aspen31h7", t: 2 },
			{ name: "aspen31h9", t: 3.5 },
			{ name: "aspen31h9-d1", t: 1.2 },
			{ name: "aspen31h9-d2" },
			{ name: "", t: 4 },
		],
	},

	aspen4: {
		contentData: [
			{ name: "aspen4h1", t: 1.5 },
			{ name: "aspen4h3", t: 2 },
			{ name: "aspen4h5", t: 2 },
			{ name: "aspen4h7", t: 2 },
			{ name: "aspen4h9", t: 3.25 },
			{ name: "aspen4h9-d1", t: 1.1 },
			{ name: "aspen4h9-d2" },
			{ name: "", t: 4 },
		],
	},

};




export { Slot };

