

function createLocalData() {

	return {

		//     Temporary Item ID:
		//
		// - not stored in DB
		// - not transferred over network
		//
		_startTmpItemId: 1e8,

		_nextTmpItemId: 1e8 + 1,

		getNextTmpId() { return this._nextTmpItemId ++; },


		itemById: Object.create(null),

		_removedItemGIds: [],


		enlistItem(item, id) {

			if (id)
				return Report.warn("enlist: id is obsolete");

			if (!item.id)
				return Report.warn("enlist: no item.id", `${item}`);

			if (!Number.isInteger(item.id) || item.id < 0)
				return Report.warn("enlist: bad id", `${item}`);

			if (this.itemById[item.id]) {
				return Report.warn("enlist: id already assigned", `${item}`);
			}

			this.itemById[item.id] = item;
		},


		removeItem(item) {

			if (item.id) {
				delete this.itemById[ item.id ];

			} else
				Report.warn("item has no id", `${item}`);

			if (!item.hasTmpId() && item.gId)
				this._removedItemGIds.push(item.gId);

			if (item.id) {
				this._removedSPIds.delete(item.id); // CASCADE
				this._updatedSPIds.delete(item.id);
			}
		},


		getItems(filterFn) {

			var items = Object.values(this.itemById);

			return !filterFn ? items : Util.filterInPlace(items, filterFn);
		},


		getAllChars() { return this.getItems(item => item.isChar()) },


		// ===============================================

		slots: (typeof SlotCollection != "undefined") ? new SlotCollection : null,

		//getSlotById(slotId) { return this.slots.getById(slotId); },


		// ===============================================

		_updatedSPIds: new Set,
		_removedSPIds: new Set,


		updateItemSP(item) {

			if (!item.storagePosition)
				return Report.warn("updateItemSP: no SP", `${item}`);

			this._removedSPIds.delete(item.id);
			this._updatedSPIds.add(item.id);
		},


		removeItemSP(item) {

			this._updatedSPIds.delete(item.id);
			this._removedSPIds.add(item.id);
		},


		// ===============================================

		_updatedShopPositions: null,


		addUpdatedShopPosition(shopPos) {

			if (!this._updatedShopPositions)
				this._updatedShopPositions = new Set;

			this._updatedShopPositions.add(shopPos);
		},


		_updatedShopBaseIds: null,


		addUpdatedShopBaseId(id) {

			if (this._updatedShopPositions)

				[ ...this._updatedShopPositions ].forEach(shopPos =>
					shopPos.baseId === id && this._updatedShopPositions.delete(id) );


			if (!this._updatedShopBaseIds)
				this._updatedShopBaseIds = new Set;

			this._updatedShopBaseIds.add(id);
		},


		// ===============================================

	};
}



var Local = {

	_map: new Map,

	create(key, forceSameKey) {

		if (key === undefined && typeof window == "undefined")
			return Report.warn("Local.create: undefined key");

		if (!forceSameKey && this._map.has(key))
			return Report.warn("Local.create: already has key", `${key}`);
//console.log(`Local: created key="${key}"`);

		var data = createLocalData();

		this._map.set(key, data);

		return data;
	},


	destroy(key) {

		var result = this._map.delete(key);
		if (!result)
			Report.warn("Local.destroy: no key", `${key}`);

//console.log(`Local: destroy key="${key}"`);
	},


	get(key) {

		var data = this._map.get(key);

		if (!data)
			return Report.warn("Local.get(): no data", `${key}`);

		return data;
	},


	getNextTmpId(key) { return this.get(key).getNextTmpId() },


	getNextItemId(key) { return this.getUser(key).nextItemId ++ },


	getUser(key) {

		if (!Main.isServer)
			return Main.user;

		return key.user; // key instanceof RequestHandler
	},


/*
	// Server-aware get-time interface
	setCurrentT(t, key) { this.get(key)._currentT = t },

	getCurrentT(key) { return this.get(key)._currentT },
*/
};




export { Local }

