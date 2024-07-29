
import { UI } from './UI.js';


var ScreenEquip = {

	aspectRatio: 1,
	widthFractionMax: 0.55,
	hasFullHeight() { return true },
	bgName: "screen-fabric037",

	checkItem(item) { return item && item.isChar() },

	mainElem: document.getElementById('equip-main'),


	char: null,


	toString() { return `<ScreenEquip char=${this.char}>` },


	onClick(e) { ScreenEquip._onClick.call(ScreenEquip, e); },

	onMouseMove(e) { ScreenEquip._onMouseMove.call(ScreenEquip, e); },


	close() {

		this.char = null;
		this.clear();

		UI.el.appContainer.removeEventListener('click', this.onClick, false);
		UI.el.appContainer.removeEventListener('mousemove', this.onMouseMove);
	},


	open(item) {

		console.assert( this.checkItem(item) );

		this.char = item;

		UI.el.appContainer.addEventListener('click', this.onClick, false);
		UI.el.appContainer.addEventListener('mousemove', this.onMouseMove);


		this.mainElem.querySelector('#char-name').textContent = this.char.getLangName();


		var imgWrapEl = this.mainElem.querySelector('#char-img');

		if (imgWrapEl.firstChild)
			imgWrapEl.removeChild(imgWrapEl.firstChild);

		var canvas = this.char.display2D.getImage2D({ key: "ScreenEquip", noStyle: true });

		canvas.style.cssText = 'width:100%;height:100%;position:relative;z-index:-1';

		imgWrapEl.appendChild(canvas);
	},


	pressEsc() { UI.setScreen() },


	init() {

		this.mainElem.innerHTML = getUIElem("equip-main").innerHTML;

		UI.el.dialogContainer.appendChild( getUIElem("Equip-dialog-rename") );
	},


	openRenameDialog() {

		var el = UI.openDialog('Equip', 'rename');

		el.querySelector("#char-name").textContent = this.char.getLangName();
		el.querySelector("#input-char-rename").value = this.char.getLangName();
	},


	onInputRename(e) {
		console.log(e.target.value);
	},

}


ScreenEquip.init();



ScreenEquip._onClick = function(e) {

	if (!this.char)
		return Report.warn("click w/o a char");

	var mouseItem = ElementHelper.ItemFollowsPointer.item;
	var match;

	// Clicked on item
	if ( (match = e.target.id.match(/^item-(inv|equip)-(\d+)$/)) ) {

		let clickedItem = Item.byId(match[2]);
		if (!clickedItem)
			return Report.warn("no item", `"${e.target.id}"`);

		if (mouseItem) { // swap items?

			if ( !this.char.swapInventoryItems(mouseItem, clickedItem) )
				return Report.warn("swapInventoryItems", `${mouseItem} ${clickedItem}`);;

			Accounting.addEntry(this.char, "invSwap", {

				id1: mouseItem.id,
				id2: clickedItem.id,
				baseId: this.char.id
			});

			ElementHelper.ItemFollowsPointer.release();
		}

		ElementHelper.ItemFollowsPointer.begin(clickedItem, e);
		UI.setRequiresUpdate();
		return;
	}

	if (!mouseItem)
		return;


	var onClickEmptyCellOrSlot = (sP) => {

		if ( !mouseItem.storagePosition.equals(sP) ) {

			if ( !mouseItem.canPlaceInPosition(sP) )
				return;

			mouseItem.removeFromStorage().assignStoragePosition(sP);

			Accounting.addEntry(this.char, "invRelocate", {

				id: mouseItem.id,
				sP: mouseItem.storagePosition,
				baseId: this.char.id
			});
		}

		ElementHelper.ItemFollowsPointer.release();
		UI.setRequiresUpdate();
	};


	// Clicked (empty) slot (w/ mouseItem)?
	if ( (match = e.target.id.match(/^equip-slot-(.+)/)) ) {

		let slot = match[1];
		let x = Equipment.getSlotX(slot);

		if (!x)
			return Report.warn("unrecognized equip slot", `${slot}`);

		let sP = new StoragePosition(this.char.id, 0, x);

		onClickEmptyCellOrSlot(sP);
		return;
	}


	// Clicked (empty) cell (w/ mouseItem)? (img's are added after cells)
	var sP = ElementHelper.ItemFollowsPointer.getStoragePositionByCellElemId(e.target.id);

	if (sP) {

		onClickEmptyCellOrSlot(sP);
		return;
	}

/* NO
	// Clicked canvas - throw inv.item
	if (e.target === Display.canvas) {// || e.target.parentElement === Display.canvas) {

		this.enqueueThrow();
	}
*/
}


Object.assign(ScreenEquip, {

	enqueueThrow() {

		var item = ElementHelper.ItemFollowsPointer.item;
		if (!item)
			return;

		// 1) remove img. from mouse ptr.

		ElementHelper.ItemFollowsPointer.release();

		// 2) task for the char.

		var task = this.char.aI.getActiveTask("TaskThrowInventoryItem");
		if (!task)
			this.char.aI.setTask( new TaskThrowInventoryItem(this.char, item) );
		else
			task.enqueueItem(item);

		UI.update();
	},


	_onMouseMove(e) {
		ElementHelper.ItemFollowsPointer.onMouseMove(e);
	},


	clickThrow() {
		this.enqueueThrow();
	},


	update() {

		if (!this.char)
			return Report.warn("update w/o char");

		ElementHelper.setCellSize( Math.floor(0.075 * UI.getScreenWidth() + 0.5) );

		var task = this.char.aI.getActiveTask("TaskThrowInventoryItem");
		var itemsForThrow = task && task.items;

		ElementHelper.updateCellGroup(this.char.storages[1], "#equip-inv-cellgroup0", itemsForThrow);
		ElementHelper.updateCellGroup(this.char.storages[2], "#equip-inv-cellgroup1", itemsForThrow);

		ElementHelper.updateEquipImages(this.char.storages[0], this.mainElem, itemsForThrow);

		ElementHelper.ItemFollowsPointer.update();


		var btnThrowEl = this.mainElem.querySelector('#btn-throw');

		if (ElementHelper.ItemFollowsPointer.item) {
			btnThrowEl.classList.remove('btn-2-inactive');

		} else
			btnThrowEl.classList.add('btn-2-inactive');
	},


	clear() {

		[ "#equip-inv-cellgroup0", "#equip-inv-cellgroup1" ]
			.forEach(selector => ElementHelper.clearCellGroup(selector));

		ElementHelper.clearEquipImages(this.mainElem);

		ElementHelper.ItemFollowsPointer.clear();
	},

});



export { ScreenEquip };

