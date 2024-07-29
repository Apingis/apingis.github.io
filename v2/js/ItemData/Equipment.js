
import { Storage } from './Storage.js';


class Equipment extends Storage {

	constructor(data, baseItem, storageId) {

		super(data, baseItem, storageId);

		this.items = [];
	}


	getItems() { return this.items }

	getSlotName(x) { return Equipment.SlotNameByX[ x ]; }

	getSlotX(name) { return Equipment.SlotXByName[ name ]; }

	getSlotNames() { return Equipment.SlotNames; }

	static getSlotName(x) { return Equipment.SlotNameByX[ x ]; }

	static getSlotX(name) { return Equipment.SlotXByName[ name ]; }

	static getSlotNames() { return Equipment.SlotNames; }


	itemBySlotName(name) {
		var x = this.getSlotX(name);
		return this.items.find(item => item.storagePosition.x === x);
	}

/*
	itemFits(item) {
		var slotName = item.spec.getEquipSlotName();
		return this.itemFitsIntoSlot(item, slotName);
	}
*/

	placeItem(item) {

		var sP = item.storagePosition;
		if (!sP)
			return Report.warn("no storagePosition", `${item}`);

		if (this.items.indexOf(item) !== -1)
			return Report.warn("already placed", `${item}`);

		//if (this.items.some(item => item.storagePosition.x === sP.x))
		//	return Report.warn("slot already occupied", `${this.getSlotName(sP.x)}`);

		if ( !this.canPlaceInPosition(item, item.storagePosition) )
			return Report.warn("can't place", `${item} ${item.storagePosition}`);

		this.items.push(item);

		this.checkBaseItemUpdate();

		return true;
	}


	addItem(item) {

		if (item.storagePosition)
			return Report.warn("already have storagePosition", `${item}`);
/*
		if (!this.itemFits(item))
			return;

		var x = this.getSlotX( item.spec.getEquipSlotName() );

		if (!x)
			return Report.warn("bad equip item", `${item}`);

		item.addStoragePosition( new StoragePosition(this.baseItem.id, this.storageId, x) );
*/
		var sP = this.findStoragePositionFor(item);
		if (!sP)
			return;

		if ( !item.addStoragePosition(sP) )
			return;

		return this.placeItem(item);
	}


	removeItem(item) {
/*
		var i = this.items.findIndex(item2 => item2 === item);
		if (i === -1)
			return;

		Util.cut(this.items, i);

		this.checkBaseItemUpdate();

		return true;
*/
		Util.removeElement(this.items, item);

		this.checkBaseItemUpdate();
	}

/*
	itemFitsIntoSlot(item, slotName) {

		var x = this.getSlotX(slotName);
		if (!x)
			return Report.warn("bad slotName", `${slotName}`);

		if (slotName !== item.spec.getEquipSlotName())
			return;

		return this.items.every(item2 => item2 === item || item2.storagePosition.x !== x);
	}


	itemFitsStoragePosition(item, sP) {

		if (!item.isEquipmentItem() || !sP.belongsTo(this))
			return;

		var x = this.getSlotX( item.spec.getEquipSlotName() );

		if (!x || sP.x !== x)
			return;

		return this.items.every(item2 => item2 === item || item2.storagePosition.x !== x);
	}
*/

	checkBaseItemUpdate() {

		if (Main.isServer)
			return;

		var char = this.baseItem;
		if (!char.isChar())
			return;

		// Equipment change.

		char.aI.enqueueReplanning(); // Any equip change: replanning.
	}


	// **********************************************************************

	// - given item can fit only 1 of possible slots (ItemSpecData issue) - OK for v1-2

	getReservedSlotsNames() {
		return this.reservedPositions.map(rP => this.getSlotName(rP.sP.x));
	}


	findStoragePositionFor(item) {

		//isHere?
		var x = this.getSlotX( item.spec.getEquipSlotName() );

		if ( !x || this.items.some(item2 => item2.storagePosition.x === x) )
			return;

		// slot already occupied?
		if ( this.reservedPositions.some(rP => rP.sP.x === x) )
			return;

		return new StoragePosition(this.baseItem.id, this.storageId, x);
	}


	canPlaceInPosition(item, sP) {

		if (sP.baseId !== this.baseItem.id || sP.storageId !== this.storageId)
			return;

		if (Equipment.SlotXList.indexOf(sP.x) === -1)
			return;

		var x = this.getSlotX( item.spec.getEquipSlotName() );

		return x
			&& this.items.every(item => item.sP.x !== x)
			&& this.reservedPositions.every(rP => rP.sP.x !== x);
	}


}


Equipment.SlotXByName = { // x != 0
//	"head":		1,
	"weapon":	2,
	"armor":	3,
	"clothes":	4,
	"neck1":	5,
//	"ring1":	6,
};


Equipment.SlotNames = Object.keys(Equipment.SlotXByName);

Equipment.SlotXList = Object.values(Equipment.SlotXByName);


Equipment.SlotNameByX = (() => {

	var res = {};
	Equipment.SlotNames.forEach(name => res[ Equipment.SlotXByName[name] ] = name);
	return res;
})();




export { Equipment };

