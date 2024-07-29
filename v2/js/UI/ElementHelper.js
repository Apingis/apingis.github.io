
var ElementHelper = {

	cellSize: 0,


	setCellSize(cellSize) {

		console.assert(Number.isFinite(cellSize) && cellSize > 0);

		this.cellSize = cellSize;

		this.ItemFollowsPointer.onResize();
	},


	removeItemHover() {
		this.ItemFollowsPointer.updateItemHover(false);
	},

/*
	centerX(el) { return Math.abs(el.offsetLeft + el.offsetWidth / 2); },

	centerY(el) { return Math.abs(el.offsetTop + el.offsetHeight / 2); },
*/

	getAllElementsByCoord(querySelector, x, y, maxX = x, maxY = y) {

		var left = x, right = maxX, top = maxY, bottom = y; // (!) bottom >= top

		if (typeof x != "number" && (x instanceof DOMRect) ) {

			left = x.left; right = x.right;
			top = x.top; bottom = x.bottom;
		}

		var stack = [];

		var allElements = document.querySelectorAll(querySelector);
		var len = allElements.length;

		for (let i = 0; i < len; i++) {

			let el = allElements[i];
			let rect = el.getBoundingClientRect();

			if (bottom < rect.top || top > rect.bottom || right < rect.left || left > rect.right)
				continue;

			stack.push(el);
		}

		return stack;
	},



	clearCellGroup(selector) {

		var grpElem = document.querySelector(selector);

		while (grpElem.firstChild)
			grpElem.removeChild(grpElem.firstChild);
	},


	updateCellGroup(inv, selector, blockedItems = []) {

		this.clearCellGroup(selector);

		var grpElem = document.querySelector(selector);

		//grpElem.style.width = cellSize * cellGroup.cols + "px"; // %, non-integer px: bad in chrome
		//grpElem.style.height = cellSize * cellGroup.rows + "px";

		this.createCellGroupCells(inv, grpElem);//, targetCells);

		this.updateCellGroupImages(inv, grpElem, blockedItems);
	},


	createCellGroupCells(inv, grpElem) {

		var borderSpec = "2px solid #2d2d2d";
		var mouseItem = this.ItemFollowsPointer.item;
		var reservedCells = inv.getReservedCells();

		inv.forEachCell( (col, row, n, itemInCell) => {

			var el = document.createElement('div');
			el.id = "inv-cell-" + inv.baseItem.id + "-" + inv.storageId + "-" + col + "-" + row;
			el.classList.add('inv-cell');

			el.style.top = row * this.cellSize + "px";
			el.style.height = this.cellSize + "px";
			el.style.left = col * this.cellSize + "px";
			el.style.width = this.cellSize + "px";

			if (!row)
				el.style['border-top'] = borderSpec;

			el.style['border-bottom'] = borderSpec;

			if (!col)
				el.style['border-left'] = borderSpec;

			el.style['border-right'] = borderSpec;

			if (itemInCell && itemInCell !== mouseItem)
				el.classList.add('equip-slotBgImg-used');

			if ( reservedCells[ inv.cellIndexByXY(col, row) ] )
				el.classList.add('equip-slotBg-targeted');

			grpElem.appendChild(el);
		});
	},


	updateCellGroupImages(inv, grpElem, blockedItems) {

		var mouseItem = this.ItemFollowsPointer.item;

		inv.items.forEach(item => {

			if (item === mouseItem)
				return;

			var img = item.display2D.getImage2D({

				key: 'ElementHelper',
				width: item.spec.getInvCellsX() * this.cellSize,
			});

			img.id = "item-inv-" + item.id;

			img.style.position = "absolute";
			img.style.left = item.storagePosition.x * this.cellSize + "px";
			img.style.top = item.storagePosition.y * this.cellSize + "px";
			img.style.width = item.spec.getInvCellsX() * this.cellSize + "px";
			img.style.height = item.spec.getInvCellsY() * this.cellSize + "px";

			if (blockedItems.indexOf(item) !== -1)
				img.classList.add("item-inv-blockedItem");

			grpElem.appendChild(img);
		});
	},



	clearEquipImages(mainElem) {

		Array.from( mainElem.querySelectorAll('canvas[id^="item-equip-"]') )
			.forEach(img => mainElem.removeChild(img));

		Array.from( mainElem.querySelectorAll('div[id^="equip-slot-"]') )

			.forEach(el => {
				el.classList.add("bg-image");
				el.classList.remove('equip-slotBg-allow');
				el.classList.remove('equip-slotBg-deny');
				el.classList.remove('equip-slotBg-targeted');
			});
	},


	updateEquipImages(equip, mainElem, blockedItems = []) {

		this.clearEquipImages(mainElem);

		var reservedSlotNames = equip.getReservedSlotsNames();

		equip.getSlotNames().forEach(slotName => {

			this.updateEquipImage(slotName, equip, mainElem, blockedItems, reservedSlotNames);
		});
	},


	updateEquipImage(slotName, equip, mainElem, blockedItems, reservedSlotNames) {

		var item = equip.itemBySlotName(slotName);
		var itemIsBlocked = item && blockedItems.indexOf(item) !== -1;
		var mouseItem = this.ItemFollowsPointer.item;

		// I. Slot itself (allow/deny)

		var slotElem = document.getElementById(`equip-slot-${slotName}`);
		if (!slotElem)
			return Report.warn("!slotElem", `${slotName}`);

		// Ia. Exact size
		// Oops...

		if (slotName == 'weapon') {

			slotElem.style.width = 2 * this.cellSize + 'px';
			slotElem.style.height = 4 * this.cellSize + 'px';
		}


		if (mouseItem && !itemIsBlocked) {

			if (mouseItem.spec.getEquipSlotName() === slotName)
				slotElem.classList.add('equip-slotBg-allow');
			else
				slotElem.classList.add('equip-slotBg-deny');
		}

		// Ia. Block reserved (targeted) slot

		if (!item && reservedSlotNames.indexOf(slotName) !== -1)
			slotElem.classList.add('equip-slotBg-targeted');

		// II. Image

		if (!item || item === mouseItem)
			return;

		slotElem.classList.remove("bg-image");

		var img = item.display2D.getImage2D({

			key: 'ElementHelper',
			width: item.spec.getInvCellsX() * this.cellSize,
		});

		img.id = "item-equip-" + item.id;
		img.className = "equip-slot-" + item.spec.getInventorySize() + " " + slotName;

		if (itemIsBlocked)
			img.classList.add("item-inv-blockedItem");

		mainElem.appendChild(img);
	},

};



ElementHelper.ItemFollowsPointer = {

	item: null,
	img: null,

	offsetPx: { x: 0, y: 0 }, // from ptr. to TL of img.
	offsetFrac: { x: 0, y: 0 },
	offsetCells: { x: 0, y: 0 },

	ptrClientX: 0,
	ptrClientY: 0,
	ptrTarget: null,
	lastHoverElem: null,


	isPtrOverCanvas3D() { return this.ptrTarget && this.ptrTarget === Display.canvas; },


	getPtrTargetItem() {

		if (!this.ptrTarget || !('id' in this.ptrTarget) )
			return;

		if (typeof this.ptrTarget.id != "string")
			return Report.warn("bad ptrTarget", this.ptrTarget);

		var match = this.ptrTarget.id.match(/^item-(equip|inv|shop)-(\d+)$/);

		return match && Item.byId(match[2]);
	},


	updatePtrDataFromEvent(e) {

		if (!e)
			return;

		this.ptrClientX = e.clientX;
		this.ptrClientY = e.clientY;
		this.ptrTarget = e.target;

		this.updateItemHover();
	},


	onMouseMove(e) {

		this.updatePtrDataFromEvent(e);
		this.update();
	},


	updateItemHover(forceState) {

		// hover-when-close!
		//if (!UI.QuestionArrow.state)
		//	return;

		if (this.lastHoverElem) {
			this.lastHoverElem.classList.remove('equip-slotBgImg-hover');
			this.lastHoverElem.classList.remove('equip-slotBgImg-hover-shop');
		}

		var el = document.getElementById('item-hover');
		var item = this.getPtrTargetItem();

		var isOn = forceState !== undefined ? forceState
			: item && !this.img;

		el.style.display = isOn ? "" : "none";

		if (isOn) {

			Label2D.updateHoverContent(el, item);
			this.positionItemHover(el, item);

			this.lastHoverElem = this.ptrTarget;
			this.lastHoverElem.classList.add( item.isInShop()
				? 'equip-slotBgImg-hover-shop' : 'equip-slotBgImg-hover');

		} else
			this.lastHoverElem = null;
	},


	positionItemHover(el, item) {

		var DELTA = 8;

		var rect = el.getBoundingClientRect();

		var left = this.ptrClientX - DELTA - rect.width;
		var bottom = this.ptrClientY + DELTA + rect.height;

		el.style.left = (left >= 0 ? left : this.ptrClientX + DELTA) + "px";

		var top = bottom < window.innerHeight
			? this.ptrClientY + DELTA
			: this.ptrClientY - DELTA - rect.height;

		el.style.top = top + "px";
	},


	begin(item, e) {

		if (this.item)
			return Report.warn("already follows");

		this.item = item;

		// HTML props. remain; incl. "allowParent"
		//this.img = item.display2D.getCanvas(null, "keepProperties");

		this.img = item.display2D.getImage2D({

			key: 'ElementHelper',
			width: item.spec.getInvCellsX() * ElementHelper.cellSize,
			keepProperties: true,
		});

		var rect = this.img.getBoundingClientRect();

		this.img.style.position = "absolute";
		this.img.className = "inv-item-follows-pointer";

		this.offsetFrac.x = (rect.left + 2 - this.ptrClientX) / rect.width;
		this.offsetFrac.y = (rect.top - 1 - this.ptrClientY) / rect.height;

		var [ cellsX, cellsY ] = item.spec.getInvCellsXY();

		this.offsetCells.x = Util.clamp(Math.trunc(this.offsetFrac.x * cellsX), -cellsX + 1, 0);
		this.offsetCells.y = Util.clamp(Math.trunc(this.offsetFrac.y * cellsY), -cellsY + 1, 0);

		this.onResize();

		UI.el.appContainer.appendChild(this.img);

		this.updateItemHover(false);

		this.update(); // TODO? why won't update hover in update()
	},


	release() {

		this.ptrTarget = this.img; // no ptr. target from event

		this.clearCellsUnder();

		if (this.img)
			UI.el.appContainer.removeChild(this.img);

		this.img = null;
		this.item = null;

		// else wrong ptrTarget, destroyed w/ subsequent update
		setTimeout( () => this.updateItemHover(), 0);
	},


	clear() {

		this.release();
		this.updateItemHover(false);

		// doh.
		setTimeout( () => document.getElementById('item-hover').style.display = "none", 10);
	},


	onResize() {

		if (!this.img)
			return;

		var [ cellsX, cellsY ] = this.item.spec.getInvCellsXY();

		var	width = cellsX * ElementHelper.cellSize,
			height = cellsY * ElementHelper.cellSize;

		this.img.style.width = Math.trunc(width) + "px"; // Non-integer px: bad in Chrome
		this.img.style.height = Math.trunc(height) + "px";

		this.offsetPx.x = Math.trunc(this.offsetFrac.x * width);
		this.offsetPx.y = Math.trunc(this.offsetFrac.y * height);
	},


	update() {

		if (!this.img)
			return;

		this.updateItemPosition(this.ptrClientX, this.ptrClientY);

		this.updateCellsUnderMouseItem();
	},


	updateItemPosition(x, y) {

		this.img.style.left = (x + this.offsetPx.x) + "px";
		this.img.style.top = (y + this.offsetPx.y) + "px";
	},


	cellElemsUnder: [],

	clearCellsUnder() {

		this.cellElemsUnder.forEach(el => {

			el.classList.remove('equip-slotBg-allow');
			el.classList.remove('equip-slotBg-deny');
			el.classList.remove('equip-slotBg-occupied');
			el.classList.remove('equip-slotBg-canSwap');
		});

		this.cellElemsUnder.length = 0;
	},

/* TODO (v2)? mouse ptr. is not over a cell
	updateCellsUnderMouseItem() {

		this.clearCellsUnder();

		var domRect = this.img.getBoundingClientRect();
		var elems = ElementHelper.getAllElementsByCoord('div[id^="inv-cell-"]',
			domRect.left, domRect.top, domRect.right - 1, domRect.bottom - 1);
//console.log(elems);
	},
*/

	updateCellsUnderMouseItem(e) {

		this.clearCellsUnder();

		if (!this.item)
			return Report.warn("no item");

		if (this.ptrTarget && this.ptrTarget.id.startsWith("inv-cell-")) {

			this.updateCellsUnder(this.ptrTarget.id);
			return;
		}

		var elem = ElementHelper.getAllElementsByCoord('div[id^="inv-cell-"]',
				this.ptrClientX, this.ptrClientY);

		if (elem.length > 0)
			this.updateCellsUnder(elem[0].id);
	},


	updateCellsUnder(elemId) {

		var sP = this.getStoragePositionByCellElemId(elemId, false);
		if (!sP)
			return;

		var inv = sP.getStorage();
		if (!inv)
			return Report.warn("no storage", `${sP}`);


		var itemUnder = inv.getItemInCell(sP.x, sP.y);

		sP.x += this.offsetCells.x;
		sP.y += this.offsetCells.y;

		var cellIndices = inv.getCellIndicesUnderItem(this.item, sP.x, sP.y);

		var canSwap = itemUnder
			&& itemUnder !== this.item
			&& inv.baseItem.canSwapInventoryItems(this.item, itemUnder);

		if (canSwap)
			Array.prototype.push.apply(cellIndices,
				inv.getCellIndicesOccupiedByItem(itemUnder) ); // dups


		this.cellElemsUnder = cellIndices.map(i => {

			var id = "inv-cell-" + inv.baseItem.id + "-" + inv.storageId + "-"
				+ inv.colByIndex(i) + "-" + inv.rowByIndex(i);

			var el = document.getElementById(id);
			if (!el)
				return Report.warn("no element", `id=${id}`);

			if (inv.cells[i] && inv.cells[i] !== this.item)
				el.classList.add(canSwap ? 'equip-slotBg-canSwap' : 'equip-slotBg-occupied');
			else
				el.classList.add(cellIndices.itemFits ? 'equip-slotBg-allow' : 'equip-slotBg-deny');

			return el;
		});
	},


	getStoragePositionByCellElemId(id, withOffset = true) {

		var match = id.match(/^inv-cell-(\d+)-(\d+)-(.+)-(.+)$/);
		if (!match)
			return;

		var	baseId = Number.parseInt(match[1]);
		if (!baseId)
			return;

		var	storageId = Number.parseInt(match[2]),
			x = Number.parseInt(match[3]) + (withOffset ? this.offsetCells.x : 0),
			y = Number.parseInt(match[4]) + (withOffset ? this.offsetCells.y : 0);

		return new StoragePosition(baseId, storageId, x, y);
	},

};




ElementHelper.BtnController = function(arg) {

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	this.amountMult = arg.amountMult || 1;
	this.fasterAmountMult = arg.fasterAmountMult || 10;

	this.amount = 0;
	this.pressed = false;
	this.isFaster = false;
	this.direction = null;

	this.pressTime = -1;

	this.result = {
		amount: 0,
		direction: null,
	};
}



Object.assign( ElementHelper.BtnController.prototype, {

	press(direction) {

		if (this.pressed === true)
			return;

		this.pressed = true;
		this.direction = direction;
		this.isFaster = false;

		this.pressTime = Date.now();
	},


	pressFaster(direction) {

		this.press(direction);

		this.isFaster = true;
	},


	release() {

		if (this.pressed === false)
			return;

		this.pressed = false;

		this.amount += (Date.now() - this.pressTime)
			* (this.isFaster ? this.fasterAmountMult : this.amountMult);

		this.pressTime = -1;
	},


	_getResult() {

		this.result.amount = this.amount;
		this.result.direction = this.amount === 0 ? null : this.direction;

		this.amount = 0;

		return this.result;
	},


	read() {

		if (this.pressed === false)
			return this._getResult();

		var currentTime = Date.now();

		this.amount += (currentTime - this.pressTime)
			* (this.isFaster ? this.fasterAmountMult : this.amountMult);

		this.pressTime = currentTime;

		return this._getResult();
	},

});




export { ElementHelper }

