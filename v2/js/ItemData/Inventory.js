
import { Storage } from './Storage.js';


class Inventory extends Storage {

	constructor(data, baseItem, storageId) {

		super(data, baseItem, storageId);

		this.cols = data.cols;
		this.rows = data.rows;
		this.numCells = data.numCells || data.cols * data.rows;

		console.assert(this.cols && this.rows && this.numCells);

		this.items = [];
		this.cells = new Array(this.numCells).fill(null); // contain refs. to items
	}


	toString() {
		return `[Inventory c=${this.cols} r=${this.rows}`
			+ ` | ${this.cells.map(c => c && c.id || ".").join(" ")} ]`;
	}


	getItems() { return this.items }

	colByIndex(i) { return Math.floor(i / this.rows); }

	rowByIndex(i) { return i % this.rows; }


	cellIndexByXY(x, y) { // undef. on out-of-range

		if (x < 0 || x >= this.cols || y < 0 || y >= this.rows)
			return;

		var i = x * this.rows + y;

		if (i < this.numCells)
			return i;
	}


	getItemInCell(x, y) { return this.cells[ this.cellIndexByXY(x, y) ]; }


	forEachCell(fn) {

		for (let x = 0; x < this.cols; x++)

			for (let y = 0; y < this.rows; y++) {

				let i = this.cellIndexByXY(x, y);
				if (i === undefined)
					return;

				fn(x, y, i, this.cells[i]);
			}
	}


	getReservedCells() {

		var cells = new Array(this.numCells).fill(null);

		this.reservedPositions.forEach(rP => this.addItemToCells(rP.item, rP.sP, cells));

		return cells;
	}


	addItemToCells(item, sP, cells) { // item already checked.

		var [ width, height ] = item.spec.getInvCellsXY();

		for (let x = sP.x; x < sP.x + width; x++)

			for (let y = sP.y; y < sP.y + height; y++) {

				let i = this.cellIndexByXY(x, y);

				console.assert(i !== undefined && !cells[i]);

				cells[i] = item;
			}
	}


	getCellIndicesOccupiedByItem(item) {

		var indices = [];

		for (let i = 0; i < this.cells.length; i++)

			if (this.cells[i] === item)
				indices.push(i);

		return indices;
	}


	getCellIndicesUnderItem(item, cellX, cellY) { // mostly UI thing

		var [ width, height ] = item.spec.getInvCellsXY();
		var reservedCells = this.getReservedCells();

		var cellIndices = [];
		var itemFits = true;

		for (let x = cellX; x < cellX + width; x++)

			for (let y = cellY; y < cellY + height; y++) {

				let i = this.cellIndexByXY(x, y);

				if (i === undefined) {
					itemFits = false;
					continue;
				}

				cellIndices.push(i);

				if (this.cells[i] && this.cells[i] !== item) {
					itemFits = false;
					continue;
				}

				if (reservedCells[i] && reservedCells[i] !== item)
					itemFits = false;
			}

		cellIndices.itemFits = itemFits;

		return cellIndices;
	}


	placeItem(item) {

		var sP = item.storagePosition;
		if (!sP)
			return Report.warn("no storagePosition", `${item}`);

		if (this.items.indexOf(item) !== -1)
			return Report.warn("already placed", `${item}`);

		if ( !this.canPlaceInPosition(item, item.storagePosition) )
			return Report.warn("can't place", `${item} ${item.storagePosition}`);

		this.addItemToCells(item, item.storagePosition, this.cells);

		this.items.push(item);
		return true;
	}


	addItem(item) {

		if (item.storagePosition)
			return Report.warn("already have storagePosition", `${item}`);

		var sP = this.findStoragePositionFor(item);
		if (!sP)
			return;

		if ( !item.addStoragePosition(sP) )
			return;

		return this.placeItem(item);
	}


	removeItem(item) {

		for (let i = 0; i < this.numCells; i++)
			if (this.cells[i] === item)
				this.cells[i] = null;

		Util.removeElement(this.items, item);
	}


	itemFitsCellsXY(item, cells, startX, startY) {

		var [ width, height ] = item.spec.getInvCellsXY();

		for (let x = startX; x < startX + width; x++)

			for (let y = startY; y < startY + height; y++) {

				let i = this.cellIndexByXY(x, y);

				if (i === undefined || cells[i] && cells[i] !== item)
					return;
			}

		return true;
	}


	findStoragePositionFor(item) { // O(N^2)

		if (!item.isInventoryItem())
			return;

		var reservedCells = this.getReservedCells();
		var [ width, height ] = item.spec.getInvCellsXY();

		for (let x = 0; x <= this.cols - width; x++)

			for (let y = 0; y <= this.rows - height; y++) {

				if (this.itemFitsCellsXY(item, this.cells, x, y)
						&& this.itemFitsCellsXY(item, reservedCells, x, y) )

					return new StoragePosition(this.baseItem.id, this.storageId, x, y);
			}
	}


	canPlaceInPosition(item, sP) {

		if (sP.baseId !== this.baseItem.id || sP.storageId !== this.storageId)
			return;

		return item.isInventoryItem()
			&& this.itemFitsCellsXY(item, this.cells, sP.x, sP.y)
			&& this.itemFitsCellsXY(item, this.getReservedCells(), sP.x, sP.y);
	}

}




export { Inventory };

