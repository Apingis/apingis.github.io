
class Storage {

	constructor(data, baseItem, storageId) {

		console.assert(data && data.storageType && baseItem);

		this.type = data.storageType;
		this.data = data;

		this.baseItem = baseItem;
		this.storageId = storageId;

		this.items = [];

		this.reservedPositions = [];
	}


	toString() { return `[Storage ${this.type} ${this.baseItem.spec.name}.${this.storageId}]`; }

	// ======================================================================
	//
	// Notions.
	//
	// * "Instant inventory item relocation" (e.g. buy/sell, relocate inv/eq)
	//
	// * "Planned inventory item operation" w/ resulting occupation in inv/eq
	//
	// - in such case space must be reserved
	// - incl. taskExchangeItemBaseCenter, taskGrabItem
	//
	// ======================================================================

	reservePosition(item, sP) {

		if ( this.reservedPositions.find(rP => rP.item === item) )
			return Report.warn("repeated reservePosition", `${item}`);

		this.reservedPositions.push( new Storage.ReservedItemPosition(item, sP) );

		UI.updateFor(this.baseItem);
	}


	static reservePosition(item, sP, localKey) {

		var storage = sP.getStorage(localKey);
		storage.reservePosition(item, sP, localKey);
	}


	static removeReservedPosition(item, sP, localKey) {

		var storage = sP.getStorage(localKey);
		storage.removeReservedPosition(item);
	}


	removeReservedPosition(item) {

		var i = this.reservedPositions.findIndex(rP => rP.item === item);
		if (i === -1)
			return Report.warn("removeReservedPosition: not found", `${item}`);

		Util.cut( this.reservedPositions, i );
	}


	findReservedPosition(item) {
		return this.reservedPositions.find(rP => rP.item === item);
	}

/*
	findAndReservePositionFor(item) {

		var sP = this.findStoragePositionFor(item); // <-- must have overload fn.
		if (sP)
			this.reservePosition(item, sP);

		return sP;
	}
*/

	static claimReservedPosition(item, sP, localKey) {

		var storage = sP.getStorage(localKey);
		storage.claimReservedPosition(item, sP, localKey);
	}


	claimReservedPosition(item, sP, localKey) {

		var rP = this.findReservedPosition(item);

		if (!sP.belongsTo(this))
			Report.throw("wrong storagePosition", `${sP}`);

		if (!rP || rP.item !== item || !sP.equals(rP.sP))
			Report.throw("missing or mismatching reservedPosition", `${item} ${sP} ${rP && rP.sP}`);

		this.removeReservedPosition(item);

		item.assignStoragePosition(sP, localKey);

		//UI.updateFor(this.baseItem);
		// BaseCenter...

		UI.update();
	}


	itemFits(item) { return !!this.findStoragePositionFor(item) }



	// ===================================================================

	static get(baseItem, storageId) {
		return baseItem && baseItem.storages && baseItem.storages[ storageId ];
	}


	static create(data, baseItem, storageId) {

		var storage;

		switch (data.storageType) {

			case "LogStorage":
				storage = new LogStorage(data, baseItem, storageId);
				break;

			case "Equipment":
				storage = new Equipment(data, baseItem, storageId);
				break;

			case "Inventory":
				storage = new Inventory(data, baseItem, storageId);
				break;

			case "Shop":
				storage = new Shop(data, baseItem, storageId);
				break;
// ? TODO
			case "Common":
				storage = new Shop(data, baseItem, storageId);
				break;

			default:
				Report.warn("unknown storageType", `t="${data.type}" ${baseItem}`);
		};

		return storage;
	}


	isInventory() { return this instanceof Inventory }

	isEquipment() { return this instanceof Equipment }

	isInventoryOrEquipment() { return this.isInventory() || this.isEquipment() }

	isLogStorage() { return this.type == "LogStorage" }

	isShop() { return this.type == "Shop" }


	updatePosition() {}


	canPlaceInPosition(item, sP) { return false }


	static canPlaceInPosition(item, sP, localKey) {

		var storage = sP.getStorage(localKey);

		return storage && storage.canPlaceInPosition(item, sP);
	}


	placeItem(item) { console.error(`virtual call`) } // w/ storagePosition
/*
	addItem(item) { console.error(`virtual call`) } // w/o storagePosition; create one

	removeItem(item) { console.error(`virtual call`) }

	getItems() { console.error(`virtual call`) }
*/
	findStoragePositionFor(item) { Report.throw("virtual call") }


	addItem(item, sP, localKey) {

		if (item.storagePosition)
			return Report.warn("already have storagePosition", `${item}`);

		if (!sP)
			sP = new StoragePosition;

		sP.baseId = this.baseItem.id;
		sP.storageId = this.storageId;

		if (!item.addStoragePosition(sP, localKey))
			return;

		this.items.push(item);
	}

	
	removeItem(item) { Util.removeElement(this.items, item) }

	_hasItem(item) { return this.items.indexOf(item) }

	getItems() { return this.items }


	isStoredHere(item) { return item.storagePosition && item.storagePosition.belongsTo(this) }

}




Storage.ReservedItemPosition = function(item, sP) {

	this.item = item;
	this.sP = sP;
}


//Object.assign(Storage.ReservedItemPosition.prototype, {
//});




export { Storage };

