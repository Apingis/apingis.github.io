
var UI = {

	_requiresUpdate: true,

	item: null,
	newItem: null,

	screenName: "",
	newScreenName: "",

	screen: null,
	screenOpenTime: 0,
	screenWidth: 0,
	screenAddUpWidth: 0,
	screenMargin: 0, // width in px.

	dialogElem: null,
	dialogScreenName: "",
	dialogName: "",

	screenInfoList: [ "RobotInfo", "CharInfo", "WoodIntakeInfo", "BaseCenterInfo",
		"RobocenterInfo", "TowerInfo", "ConstructionStartInfo", "ConstructionSiteInfo",
		"ChainTestInfo",
	],

	el: {
		appContainer: document.getElementById('app-container'),
		screenContainer: document.getElementById('screen-container'),
		screenMargin: document.getElementById('screen-margin'),
		screenDialogBg: document.getElementById('screen-dialog-bg'),
		screenDarken: document.getElementById('screen-darken'),
		dialogContainer: document.getElementById('screen-dialog-container'),
		uilevel: document.getElementById('uilevel'),
		"uilevel-value": document.getElementById('uilevel-value'),
	},


	//MINIMAP_WIDTH_FRACT: 0.25,


	setRequiresUpdate() { this._requiresUpdate = true },

	update() { this.setRequiresUpdate() },


	updateFor(item) { this.setRequiresUpdateFor(item) },


	setRequiresUpdateFor(item) {

		if (item === this.newItem)
			this._requiresUpdate = true;
	},


	checkRequiresUpdate() {

		if (this._requiresUpdate === true) {

			this._update();
			this._requiresUpdate = false;
		}
	},


	processResizeEvent() {

		this.setRequiresUpdate();

		this.screenMargin = Math.ceil(window.innerHeight * 0.035);
		this.el.screenMargin.style.width = this.screenMargin + "px";

		this._resizeScreen();

		MiniMap.resize();

		Buttons.resize();
	},


	selectItem(item = null) { // Some item was selected.

		if ( item && !this.getScreenNameForItem(item) )
			return Report.warn("no UI info for item", `${item}`);

		if (item && item === this.newItem && this.screen && this.screen.checkItem(item) ) {

			if (Engine.time - this.screenOpenTime > 0.5) // TODO reconsider
				this.setScreen(); // opens item-info
		}

		this.newItem = item;
		this.setRequiresUpdate();
	},


	setScreen(name = "") {

		if (name !== this.newScreenName) {

			this.newScreenName = name;
			this.setRequiresUpdate();
		}
	},


	hasOpen(name) { // for cursor click
		return name ? this.screenName === name : !!this.screenName;
	},


	getScreenNameForItem(item) {

		if (!item)
			return;

		return this.screenInfoList.find( screenName => {

			var screenObj = window[ 'Screen' + screenName ];

			return screenObj && screenObj.checkItem(item);
		});
	},
/*
	canOpenUIForItem(item) {

		return 0
			|| ScreenRobotInfo.checkItem(item)
			|| ScreenCharInfo.checkItem(item)
			|| ScreenWoodIntakeInfo.checkItem(item)
			|| ScreenBaseCenterInfo.checkItem(item)
			|| ScreenRobocenterInfo.checkItem(item)
			|| ScreenTowerInfo.checkItem(item)
			|| ScreenConstructionStartInfo.checkItem(item)
			|| ScreenConstructionSiteInfo.checkItem(item)
			|| ScreenChainTestInfo.checkItem(item)
	},

	setScreenItemInfo(item) {

		if (!item)
			return;

		if (ScreenRobotInfo.checkItem(item))
			this.setScreen("RobotInfo");

		else if (ScreenCharInfo.checkItem(item))
			this.setScreen("CharInfo");

		else if (ScreenWoodIntakeInfo.checkItem(item))
			this.setScreen("WoodIntakeInfo");

		else if (ScreenBaseCenterInfo.checkItem(item))
			this.setScreen("BaseCenterInfo");

		else if (ScreenRobocenterInfo.checkItem(item))
			this.setScreen("RobocenterInfo");

		else if (ScreenTowerInfo.checkItem(item))
			this.setScreen("TowerInfo");

		else if (ScreenConstructionStartInfo.checkItem(item))
			this.setScreen("ConstructionStartInfo");

		else if (ScreenConstructionSiteInfo.checkItem(item))
			this.setScreen("ConstructionSiteInfo");

		else if (ScreenChainTestInfo.checkItem(item))
			this.setScreen("ChainTestInfo");

		else
			Report.warn("no screen-info for item", `${item}`);
	},
*/

	pressEsc() {

		if (this.haveOpenPaymentSelection())
			return this.closePaymentSelection();

		if (this.hasOpenDialog()) {

			this.closeDialog();
			return;
		}

		if (ProgressWindow.isOpen()) {

			ProgressWindow.close();
			return;
		}

		var screen = this._getScreenObj();

		if (!screen) {
			this.selectItem();
			return;
		}

		screen.pressEsc();
	},


	hasOpenScreen() { return !!this.newScreenName },

	getScreenName() { return this.newScreenName },


	getUnitTaskIconName() {

		//return ( this.hasOpen('CharInfo') || this.hasOpen('Equip') || this.hasOpen('BaseCenter') )
		//	&& ScreenCharInfo.unitTaskIconName;

		return this.hasOpen('RobotInfo') && ScreenRobotInfo.unitTaskIconName
			|| this.hasOpen('CharInfo') && ScreenCharInfo.unitTaskIconName;
	},


	getScreenWidth() {
		return !this.screen ? 0 : this.screenWidth + this.screenMargin;
	},


	getClearCanvasOffsetAtTopRight() {
		return this.getScreenWidth() + this.screenAddUpWidth;
	},


	getClearCanvasOffsetAtBottomRight() {
		return this.getScreenWidth();
	},


	addDarken() {
		UI.el.screenDarken.style.opacity = '';
		UI.el.screenDarken.style['pointer-events'] = '';
	},


	removeDarken() {
		UI.el.screenDarken.style.opacity = '0';
		UI.el.screenDarken.style['pointer-events'] = 'none';
	},


	hasOpenDialog(screenName, name) {

		if (!screenName && !name)
			return !!this.dialogElem;

		if (!screenName || !name)
			Report.warn("bad usage", `${screenName} ${name}`);

		return screenName === this.dialogScreenName && name === this.dialogName;
	},


	closeDialog() {

		if (this.dialogElem) {

			this.dialogElem.style.display = "";
			this.dialogElem = null;
			this.dialogScreenName = "";
			this.dialogName = "";
		}

		this.el.dialogContainer.style.display = "none";

		this.el.screenDialogBg.style.opacity = "0"; // always on screen (OK)
		this.el.screenDialogBg.style["pointer-events"] = "none";
	},


	openDialog(screenName, name) {

		this.closeDialog();

		var id = `${screenName}-dialog-${name}`;
		var el = this.el.dialogContainer.querySelector('#' + id);

		if (!el)
			return Report.warn("no element", `id=${id}`);

		el.style.display = "block";

		this.dialogElem = el;
		this.dialogScreenName = screenName;
		this.dialogName = name;

		this.el.dialogContainer.style.display = "";

		this.el.screenDialogBg.style.opacity = "";
		this.el.screenDialogBg.style["pointer-events"] = "";

		return el;
	},


	updateTimers() {

		UI.Debug.updateTimers();

		if (this.screen && ('updateTimers' in this.screen))
			this.screen.updateTimers();

		ProgressWindow.updateTimers();
	},


	haveOpenPaymentSelection() {
		return document.getElementById('btn-uicoins').classList.contains('highlight');
	},


	closePaymentSelection() {

		document.getElementById('btn-uicoins').classList.remove('highlight');
		document.getElementById('payment-selection').style.display = 'none';
	},


	openPaymentSelection() {

		document.getElementById('btn-uicoins').classList.add('highlight');
		document.getElementById('payment-selection').style.display = '';
	},


	clickPaymentSelection(arg) {

		if (arg === false || arg !== true && this.haveOpenPaymentSelection()) {

			this.closePaymentSelection();
			return;
		}

		ProgressWindow.close();

		this.openPaymentSelection();

		VKUtil.initializePaymentSelection();
	},


	clickPaymentElem(n) {

		UI.clickPaymentSelection(false);

		var i = n - 1;
		var paymentItem = Main.VKPayment.paymentItems[i];

		if (!paymentItem)
			return Report.warn("no paymentItem", `n=${n}`);

		VKUtil.openShowOrderBox(i);
	},


	// =================================================================

	setupPriceLabel(baseElem, data, opt = {}) {

		if ( !(baseElem instanceof HTMLElement) )
			return Report.warn("bad price label element", baseElem, data);

		var	elCoins = baseElem.querySelector("#price-coins"),
			elCrystals = baseElem.querySelector("#price-crystals"),
			elVal = baseElem.querySelector("#price-val");

		if ( !elCoins || !elVal || (!elCrystals && data.type == 'crystals') )
			return Report.warn("missing elements in price label", baseElem, data);

		elCoins.style.display = data.type == 'crystals' ? 'none' : '';

		if (elCrystals)
			elCrystals.style.display = data.type == 'crystals' ? '' : 'none';

		var amount;

		if (data.type == 'crystals') {
			amount = Util.formatCrystals(data.amount);

		} else {

			if (opt.integerCoins) {

				if (!Number.isInteger(data.amount))
					Report.warn("non-integer coins");

				amount = Util.formatThousands( Math.floor(data.amount) );

			} else
				amount = Util.formatCoins(data.amount);
		}

		elVal.textContent = amount;
	},

/*
	setupPriceBtn(elem, data) {

		this.setupPriceLabel(elem, data);
	},
*/

	updateExtra(mainElem, doShow, doShowBtn = true) {

		mainElem.querySelector('#btn-show-extra').style.display = doShowBtn ? '' : 'none';
		
		if (doShowBtn)
			mainElem.querySelector('#btn-show-extra').classList[ doShow ? 'add' : 'remove' ]('highlight');

		mainElem.querySelector('#show-extra').style.display = doShow && doShowBtn ? '' : 'none';
	},


	// =================================================================

	_getScreenObj(name = this.getScreenName()) {

		if (!name)
			return null;

		var obj = window[ "Screen" + name ];

		if (!obj) {
			Report.warn("screen doesn't exist", `name=${name}`);
			this.setScreen();
			return;
		}

		return obj;
	},


	_resizeScreen(screen = this.screen) {

		if (!screen)
			return;

		this.el.screenContainer.className = `bg-${screen.bgName}`;


		var	aspectRatio = screen.aspectRatio || 1, // W:H
			widthFractionMax = screen.widthFractionMax || 0.5,
			widthMax = screen.widthMax || Infinity;

		var width = Math.ceil( Math.min(

			aspectRatio * window.innerHeight,
			widthFractionMax * window.innerWidth,
			widthMax
		) );

		this.screenWidth = width;
		screen.mainElem.style.width = width + "px";

		this.el.screenContainer.style.width = width + this.screenMargin + "px";

		if (screen.hasFullHeight()) {

			let height = aspectRatio == Infinity ? window.innerHeight : Math.floor(width / aspectRatio);

			screen.mainElem.style.height = height + "px";

			this.el.screenContainer.style["align-items"] = aspectRatio == Infinity ? "start" : "center";

			this.el.screenContainer.style.height = window.innerHeight + "px";

		} else {
			this.el.screenContainer.style.height = "";
		}

		//console.error(`resize ${this.screenName} ${width} ${height}`);

		//	currentScreen.mainElem.style.height = aspect
		//		? Math.floor(mainElemWidth / aspect) + "px"
		//		//: "100%"; // <-- scrollbar disappears in Standards mode (FF 106d)
		//		: window.innerHeight + "px"; // <-- FF 60 also disappears

	},


	setAddUpWidth(w) { // TODO! incorrect + hard to maintain
		this.screenAddUpWidth = w;
	},

		
	_closeScreen() {

		this.el.screenContainer.style.display = "none";

		if (this.screen) {

			this.closeDialog();

			this.screen.mainElem.style.display = "none";
			this.screen.close();
		}

		this.screenName = "";
		this.screen = null;
		this.screenWidth = 0;
		this.screenAddUpWidth = 0;
	},


	_openScreen(screenName, item) {

		this.screenName = screenName;
		this.screen = this._getScreenObj(screenName);
		this.screenOpenTime = Engine.time;

		this.item = item;

		if (!this.screen)
			return;

		this.el.screenContainer.style.display = "";
		this.screen.mainElem.style.display = "";

		this._resizeScreen();

		this.screen.open(this.item);
	},


	_update() {

		var newScreen = this._getScreenObj();

		if ( newScreen && !newScreen.checkItem(this.newItem) ) { // I. Screen must allow the item.

			this.setScreen();
			newScreen = null;
		}

		// II. If a selectable item is selected and screen is not present
		//     then item-info must be open.

		var screenNameForNewItem = this.getScreenNameForItem(this.newItem);

		if ( !newScreen && screenNameForNewItem ) {

			this.setScreen(screenNameForNewItem);
		}


		// For screens, do open-close when: 1) screen changes; 2) item changes.

		if (this.screenName !== this.newScreenName || this.item !== this.newItem) {

			this._closeScreen();

			this._openScreen(this.newScreenName, this.newItem);
		}


		this.screen && this.screen.update();

		this._resizeCanvas();


		this.updateTimers();


		ProgressWindow.update();

		UI.Coins._update();
/*
		this.el['uilevel'].style.display = '';

		if (Main.user.level > 0)
			this.el['uilevel-value'].textContent = Main.user.level;
*/
		Buttons.update();
	},


	_resizeCanvas() {

		var canvasSize = new Point( window.innerWidth, window.innerHeight );

		if (this.screen && this.screen.hasFullHeight())
			canvasSize.x -= this.screenWidth + this.screenMargin;

		Display.resize(canvasSize);
	},


}





UI.QuestionArrow = {

	state: true,

	click() {
/*
		this.state = !this.state;

		var elems = document.getElementsByClassName('icon-question-arrow')

		if (this.state) {
			UI.addHighlight(elems);

		} else {
			UI.removeHighlight(elems);
			ElementHelper.ItemFollowsPointer.updateItemHover(false);
		}
*/
	},
}



UI.Coins = {

	uicoinsList: Array.from( document.querySelectorAll('#uicoins') ),
	elCoinsValList: Array.from( document.querySelectorAll('#uicoins-coins-val') ),
	elCrystalsValList: Array.from( document.querySelectorAll('#uicoins-crystals-val') ),

	coinsSgn: undefined, // <-- will update
	crystalsSgn: undefined,


	setRequiresUpdate(coinsSgn, crystalsSgn) {

		this.coinsSgn = coinsSgn;
		this.crystalsSgn = crystalsSgn;

		UI.setRequiresUpdate();
	},


	_update() {

		if (this.crystalsSgn === 0 && this.coinsSgn === 0)
			return;

		this.elCoinsValList.forEach(el => el.textContent = Util.formatCoins(Main.user.coins) );
		this.elCrystalsValList.forEach(el => el.textContent = Util.formatCrystals(Main.user.crystals) );

		if (this.coinsSgn !== undefined) // Not the 1st upd.

			this.uicoinsList.forEach(el => {

				el.style.animation = "";
				el.offsetTop;

				var keyframes = this.crystalsSgn
					? (this.crystalsSgn > 0 ? "flareAddCrystals" : "flareSubtractCrystals")
					: (this.coinsSgn > 0 ? "flareAddCoins" : "flareSubtractCoins");

				el.style.animation = "0.7s ease-in-out 0s 1 running " + keyframes;
			});


		this.coinsSgn = 0;
		this.crystalsSgn = 0;
	},

}



UI.Lang = {

	select(elId) {

		var el = document.getElementById(elId);
		var opts = el && el.selectedOptions;
		var lang = opts[0] && opts[0].value;

		if (!Lang.doSwitch(lang))
			return;

		Accounting.addEntry(null, "setLang", { lang });

		window.localStorage.setItem("lang", lang);
	},


	updateSelectors(lang) {

		var elems = document.getElementsByClassName('lang-select');

		var index = Array.from(elems[0].options).findIndex(opt => opt.value === lang);

		Array.from(elems).forEach(el => el.selectedIndex = index);
	},


	// - lang selection saves to server
	// - selector on canvas: appears at start; disappears on 1st selection

	closeCanvasSelector() {

		var el = document.getElementById('canvas-lang-select');
		el && ( el.style.display = "none" );

		window.localStorage.setItem("canvas-lang-select-closed", 1);
	},


	checkOpenCanvasSelector() {

		if ( window.localStorage.getItem("canvas-lang-select-closed") )
			return;

		var el = document.getElementById('canvas-lang-select');
		if (!el)
			return Report.warn("no #canvas-lang-select");

		el.style.display = "";
	},

}




UI.Debug = {

	isOn: false,


	turnOn() {

		document.querySelector('#buttons-top-debug').style.display = "flex";

		document.querySelector('#debug-delete').style.display = AppConfig.noServer ? 'none' : '';

		this.isOn = true;

		UI.update();
	},


	turnOff() {

		document.querySelector('#buttons-top-debug').style.display = "none";

		this.isOn = false;
	},


	setTMult(n) {

		Array.from( document.querySelectorAll('#buttons-top-debug div[id^=tMult-]') ).forEach(el => {

			el.classList.remove('highlight');

			if (el.id.endsWith(`-${n}`))
				el.classList.add('highlight');
		});

		Engine.setTimeMultiplier(n);
	},


	updateTimers() {

		if (this.isOn === false)
			return;

		document.getElementById('time-val').textContent = Util.formatTime(Engine.time, false);
	},


	clickAxe() {

		Main.getChars().forEach(char => char.isChar()
			&& char.taskList.setTask("TaskCutWood", null, char.getPoint()) );
	},


	clickCollectLogs() {

		Main.getChars().forEach(char => char.isChar()
			&& char.taskList.setTask("TaskCollectLogs", char.getPoint()) );
	},


	clickStop() {
		Main.getChars().forEach(char => char.taskList.setTask("TaskIdle"));
	},


	clickDelete() {

		var deleteBtn = document.getElementById('debug-delete-btn');
		var isPressed = deleteBtn.classList.contains('highlight');

		document.getElementById('debug-delete-confirm').style.display = isPressed ? 'none' : '';

		if (isPressed)
			deleteBtn.classList.remove('highlight');
		else
			deleteBtn.classList.add('highlight');

		document.getElementById('debug-delete-confirm-chk').checked = false;
	},


	clickDeleteConfirm() {

		if ( ! document.getElementById('debug-delete-confirm-chk').checked )
			return;

		Accounting.addEntry(null, "deleteUser");

		Accounting.forceSendJournal(true);
	},


	clickPlusCoins() {

		Main.user.addCoins(1000);

		Accounting.addEntry(null, "plusCoins", { n: 1000 });
	},

}




export { UI }

