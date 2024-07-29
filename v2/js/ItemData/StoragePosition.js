
class StoragePosition {

	constructor(baseId, storageId, x, y) {

		this.baseId = baseId;
		this.storageId = storageId || 0;
		this.x = x || 0;
		this.y = y || 0;
	}


	toString() {
		return `[StoragePosition baseId=${this.baseId} storageId=${this.storageId}`
			+ ` x=${this.x} y=${this.y}]`;
	}

	clone() { return new StoragePosition(this.baseId, this.storageId, this.x, this.y) }


	getBaseItem(localKey) {
		return Item.getById(this.baseId, localKey);
	}

	getStorage(localKey) {
		var baseItem = this.getBaseItem(localKey);
		return baseItem && baseItem.storages && baseItem.storages[ this.storageId ];
	}

	equals(sP) {
		return sP
			&& this.baseId === sP.baseId && this.storageId === sP.storageId
			&& this.x === sP.x && this.y === sP.y;
	}


	static fromJSON(obj) {

		var sP = new StoragePosition(obj.baseId, obj.storageId, obj.x, obj.y);
		return sP;
	}


	toJSON() {

		var obj = { baseId: this.baseId };

		this.storageId !== 0 && ( obj.storageId = this.storageId );
		this.x !== 0 && ( obj.x = this.x );
		this.y !== 0 && ( obj.y = this.y );

		return obj;
	}

/*
	itemFits(item, localKey) { // Item.canPlaceInPosition
		return this.getStorage(localKey).canPlaceInPosition(item, this);
	}
*/

	belongsToItem(item) {

		if (!item || !(item instanceof Item))
			return Report.warn("bad argument", `${item}`);

		return this.baseId === item.id;
	}


	belongsTo(storage) {
		return this.baseId === storage.baseItem.id && this.storageId === storage.storageId;
	}

}




export { StoragePosition };

