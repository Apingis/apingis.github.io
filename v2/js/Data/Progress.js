
class Progress {

	constructor() {

		this._targetCompleted = 0 |0;

		this.everSelectedChars = new Set;
	}


	fromJSON(obj) {
		console.assert(Number.isInteger(obj) && obj >= 0);
		this._targetCompleted = obj |0;
	}

	toJSON() {
		return this._targetCompleted;
	}


	isSet(n) { return (this._targetCompleted & n) === n }


	set_noAccount(n) { this._targetCompleted |= n }


	set(n, doAppearWindow) {

		if (doAppearWindow)
			Report.warn("obsolete");

		if (this.isSet(n))
			return;

		n |= Progress.CLICK_START; // CLICK_START: set w/ anything else

		this._targetCompleted |= n;

		if (Main.isServer)
			return true;


		Accounting.addEntry(null, "setProgress", { n });

		ProgressWindow.close();

		return true;
	}


	// Used for arbitrary user settings (upper byte only)
	unset(n) {

		if (!this.isSet(n))
			return;

		n &= ~(256 **3 - 1);

		this._targetCompleted &= ~n;

		if (!Main.isServer)
			Accounting.addEntry(null, "unsetProgress", { n });
	}

/*
	toggle(n) {

		if (this.isSet(n))
			this.unset(n);
		else
			this.set(n);
	}
*/
/*
	nextProgressWindowData() {

		// 1st update: popup regardless of checkbox
		if ( Engine.time < 20 * 60 || ! Main.user.progress.isSet(Progress.SHOP_INFORM) ) {

			if (Main.area.baseCenter && Main.area.baseCenter.getShop().isSubjectForShopInform() )
				return [ "SHOP_UPDATE" ]; // Does not inform if not visited the shop since last update
		}

		if (Main.user.soldWood === 0)
			return this.nextProgressWindowData_noSoldWood();

		//return [ "GATHER_FOR_LEVEL1" ]; // Not used; have it designed

		return this.nextProgressWindowData_haveSoldWood();
	}


	nextProgressWindowData_haveSoldWood() {

		if (Engine.time < 20) {

			if (!this.isSet(Progress.GET_AXE2) && this.haveAxeInBaseInventory())
				return [ "GET_AXE2", this.getIdleAxelessChar_nearestToBaseCenter() ];

			if (!this.isSet(Progress.BUY_AXE)) // Just for the case
				return [ "BUY_AXE" ];

			if (this.getNumStartedWoodcutting() < 3) { // After wood is sold, it appears 1 char never had task?
				return [ "START_WOODCUTTING_ALL" ];
			}
		}


		if (!this.isSet(Progress.OPEN_SCREEN_CHARADD) && Main.user.soldWood >= 0.2)
			return [ "CHAR_ADD" ];

		return [ "SUMMARY" ];
	}
*/

	nextProgressWindowData() {//_noSoldWood() {

		if ( !this.isSet(Progress.CLICK_NEXT_CHAR) )
			return [ "DEMO2_CLICK_NEXT_CHAR" ];

		if ( !this.isSet(Progress.CLICK_CAMERA_FOLLOW) ) {

			if ( Main.isCharSelected() && !ScreenCharInfo.cameraFollow )
				return [ "DEMO2_CAMERA_FOLLOW" ];
		}

		return [ "DEMO2_SUMMARY" ];

/*
		if (this.isSet(Progress.MIN_AMOUNT))
			return [ "SELL_WOOD_MIN_AMOUNT" ];

		if (this.everyCharHasAxeAndTask())
			return [ "GATHER_MIN_AMOUNT" ];


		if (!this.isSet(Progress.GET_AXE1) && this.getNumAxesTotal() <= 3)
			return [ "GET_AXE1" ];


		var char = this.getNonWoodcuttingCharWithAxe();
		var n = this.getNumStartedWoodcutting();

		if (char && n === 0)
			return [ "START_WOODCUTTING1", char ];

		if (char && n === 1)
			return [ "START_WOODCUTTING2", char ];


		if (!this.isSet(Progress.GET_AXE2) && this.haveAxeInBaseInventory())
			return [ "GET_AXE2", this.getIdleAxelessChar_nearestToBaseCenter() ];

		if (!this.isSet(Progress.BUY_AXE))
			return [ "BUY_AXE" ];


		return [ "START_WOODCUTTING_ALL" ];
*/
	}

/*
	getNumCharsTotal() { return Main.getChars().length }

	getNumAxesTotal() { return Item.getAllAxes().length }


	everyCharHasAxeAndTask() {

		return Main.getChars().every(char => char.isChar()
			&& char.getEquipAxe() && char.taskList.hasUnfinishedTask("TaskCutWood") );
	}


	getNumStartedWoodcutting() {

		return this.isSet(Progress.CHAR1_GOT_TASK_CUT_WOOD)
			+ this.isSet(Progress.CHAR2_GOT_TASK_CUT_WOOD)
			+ this.isSet(Progress.CHAR3_GOT_TASK_CUT_WOOD)
	}


	getNonWoodcuttingCharWithAxe() {

		var isNonWoodcuttingCharWithAxe = char => char && char.isChar()
			&& char.getEquipAxe()
			&& !char.taskList.hasUnfinishedTask("TaskCutWood");

		if ( isNonWoodcuttingCharWithAxe(Main.selectedItem) )
			return Main.selectedItem;

		return Main.getChars().find(char => isNonWoodcuttingCharWithAxe(char));
	}


	getIdleAxelessChar_nearestToBaseCenter() {

		var baseCenter = Main.area.baseCenter;
		if (!baseCenter)
			return;

		var nearestChar, dMin = Infinity;

		Main.getChars().forEach(char => {

			if ( !char.isChar() || char.getEquipAxe() || !char.taskList.isIdle() )
				return;

			let d = char.distanceToItem( Main.area.baseCenter );
			if (d < dMin) {
				dMin = d;
				nearestChar = char;
			}
		});

		return nearestChar;
	}


	haveAxeInBaseInventory() {

		var base = Main.area.baseCenter;

		if (!base || !base.storages[0] || !base.storages[0].isInventory())
			return Report.warn("no or bad baseCenter", base);

		return base.storages[0].getItems().some(item => item.isAxe());
	}
*/

	// ==============================================================


	onPickUpInventoryItem(item, char) {

		ProgressWindow.close();

		if (!this.isSet(Progress.GET_AXE1) && item.id === Progress.AXE1_ID) {

			this.set(Progress.GET_AXE1);
		}
	}


	onGetAxeFromBase(item, char) {

		ProgressWindow.close();

		this.set(Progress.GET_AXE2);
	}


	onAxeHit(unit, tree) {
	}


	onSetTask(unit, type) {
return;
/*
		ProgressWindow.close();

		if (type !== "TaskCutWood")
			return;

		if (unit.id === Progress.CHAR1_ID) {

			this.set(Progress.CHAR1_GOT_TASK_CUT_WOOD);

		} else if (unit.id === Progress.CHAR2_ID) {

			this.set(Progress.CHAR2_GOT_TASK_CUT_WOOD);

		} else if (unit.id === Progress.CHAR3_ID) {

			this.set(Progress.CHAR3_GOT_TASK_CUT_WOOD);
		}
*/
	}


	onBuy(item) {

		ProgressWindow.close();

		if (item.isAxe() && !this.isSet(Progress.BUY_AXE)) {

			this.set(Progress.BUY_AXE);
		}
	}


	onClickHome() { this.set(Progress.CLICK_HOME) }

	onClickZoom() { this.set(Progress.CLICK_ZOOM) }

	onClickNextChar() { this.set(Progress.CLICK_NEXT_CHAR) }


	onSelectChar(char) {

		this.set(Progress.CLICK_NEXT_CHAR);

		this.everSelectedChars.add(char);
	}


	onClickCameraFollow(arg, item) { this.set(Progress.CLICK_CAMERA_FOLLOW) }


	onPlaceLogToStorage() {

		if (this.isSet(Progress.MIN_AMOUNT) || Main.user.soldWood > 0)
			return;

		var summary = Main.area.getLogStorageSummary();

		if (summary && summary.volume >= LogStorage.MIN_AMOUNT)
			this.set(Progress.MIN_AMOUNT);
	}


	onSellWood() {

		if (Main.isServer)
			return;

		//if (Main.user.level === 0 && ProgressWindow.isOpen("GATHER_FOR_LEVEL1"))
		//	return;

		ProgressWindow.close();
	}


	onOpenScreenCharAdd() {

		this.set(Progress.OPEN_SCREEN_CHARADD);

		ProgressWindow.close();
	}


	isTipActual(name) {

		switch (name) {
			case "CLICK_HOME": return !this.isSet(Progress.CLICK_HOME);
			case "CLICK_ZOOM": return !this.isSet(Progress.CLICK_ZOOM);
			//case "CLICK_NEXT_CHAR": return !this.isSet(Progress.CLICK_NEXT_CHAR);
			default: return true;
		};
	}


	getActualTip() {

		for (let i = 0; i < Progress.tipNames.length; i++)

			if (this.isTipActual(Progress.tipNames[i]))
				return Progress.tipNames[i];
	}


	getNextTip(name, ifPrev) {

		var i = Progress.tipNames.indexOf(name);

		return ifPrev
			? Util.prevElement(Progress.tipNames, i)
			: Util.nextElement(Progress.tipNames, i);
	}

}


Object.defineProperties(Progress, {

	START: {
		enumerable: true,
		get: function() { console.error(`START`) },
	},

});


Object.assign(Progress, {

	CLICK_START: 1,

	CLICK_NEXT_CHAR: 16,
	CLICK_CAMERA_FOLLOW: 32,

	CLICK_HOME: (256 **2) * 32,
	CLICK_ZOOM: (256 **2) * 64,

	tipNames: [ "CLICK_HOME", "CLICK_ZOOM" ],// "DEMO2" ],

/*
	CLICK_START: 1,
	GET_AXE1: 2,
	GET_AXE2: 4,
	BUY_AXE: 8,
	MIN_AMOUNT: 16,

	CHAR1_GOT_TASK_CUT_WOOD: (256 **2) * 1,
	CHAR2_GOT_TASK_CUT_WOOD: (256 **2) * 2,
	CHAR3_GOT_TASK_CUT_WOOD: (256 **2) * 4,

	OPEN_SCREEN_CHARADD: (256 **2) * 8,

	CLICK_HOME: (256 **2) * 32,
	CLICK_ZOOM: (256 **2) * 64,

	tipNames: [ "CLICK_HOME", "CLICK_ZOOM", "CLICK_NEXT_CHAR" ],

	// Interface checkbox
	SHOP_INFORM: (256 **3) * 1, // set: don't inform

	VK_ADD_TO_FAVORITES: (256 **3) * 2,
*/

	AXE1_ID: 10,
	CHAR1_ID: 1,
	CHAR2_ID: 2,
	CHAR3_ID: 3,
});




export { Progress }

