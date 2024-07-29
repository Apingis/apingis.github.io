
var ProgressWindow = {

	_isOpen: false,

	what: '',
	item: null,
	autoAppeared: false,
	_btnAnimationElems: new Set,

	_force: '',

	mainElem: document.getElementById('progress-window'),
	smallElem: document.getElementById('progress-window-small'),

	_lastCloseTime: 0, // real time in sec.
	_lastOpenTime: 0,

	_setupTipName: '',
	_forceTipName: '',

	_autoAppear: {},

	autoAppearConf: {
/*
		"GET_AXE2": { delay: 1 },
		"BUY_AXE": { cnt: 2, interval: 60, delay: 2.5 },
		"GATHER_MIN_AMOUNT": { cnt: 1, delay: 2.5 },
		"SELL_WOOD_MIN_AMOUNT": { delay: 1.5 },
		"START_WOODCUTTING_ALL": { cnt: 2, interval: 60, delay: 1.5 },
		"CHAR_ADD": { cnt: 2, interval: 300, delay: 10 },
		"SUMMARY": { cnt: 0 },
*/
		"DEMO2_CLICK_NEXT_CHAR": { delay: 0.5 },
		"DEMO2_CAMERA_FOLLOW": { cnt: 1, delay: 2 },
		"DEMO2_SUMMARY": { cnt: 0 },
	},

	_btnCharsAxes: 'chars',


	close() {

		//Main.user.progress.set(Progress.CLICK_START);

		this._isOpen = false;
		this._lastCloseTime = Engine.getRealTime();

		if (this._autoAppear[ this.what ])
			this._autoAppear[ this.what ].lastCloseTime = this._lastCloseTime;


		this.what = '';
		this.item = null;
		this.autoAppeared = false;

		this.mainElem.classList.remove('progress-window-open');
		this.mainElem.classList.add('progress-window-close');

		//this.smallElem.classList.remove('progress-window-small-close');
		//this.smallElem.classList.add('progress-window-small-open');

		this._forceTipName = '';
		this._btnCharsAxes = 'chars';
	},


	open() {

		if (this.isOpen())
			return;

		this._isOpen = true;
		this._lastOpenTime = Engine.getRealTime();

		this.mainElem.classList.add('progress-window-open');
		this.mainElem.classList.remove('progress-window-close');

		//this.smallElem.classList.add('progress-window-small-close');
		//this.smallElem.classList.remove('progress-window-small-open');
	},


	isOpen(what) { return this._isOpen && (!what || what === this.what) },

	isClosedFor(t) { return !this.isOpen() && Engine.getRealTime() - this._lastCloseTime > t },


	init() {

		this.mainElem.innerHTML = getUIElem('progress-window').innerHTML;
		this.smallElem.innerHTML = getUIElem('progress-window-small').innerHTML;
	},



	_lastCheckAppearWindowData: null,

	_cmpWindowData(data1, data2 = this._lastCheckAppearWindowData) {

		return !data1 && !data2
			|| Array.isArray(data1) && Array.isArray(data2)
		//		&& data1[0] === data2[0] && data1[1] === data2[1];
				&& data1[0] === data2[0];
	},


	timelyCheckAppear() {

		if ( AppConfig.isDemo2() ) {

		} else if (AppConfig.noServer)
			return;

		var	data = Main.user.progress.nextProgressWindowData(),
			what = data[0],
			item = data[1];
//console.log(`timelyCheckAppear ${what} ${item}`);

		this.timelyCheckBtnAnimation(what, item);

		if ( this.isOpen(what) )
			return;

		if ( !this.checkAutoAppear(what) )
			return;

		if ( this._cmpWindowData(data) )
			return;


		if (Main.DEBUG >= 5) {

			let lastData = this._lastCheckAppearWindowData;

			console.log(`Progress`
				+ ` ${lastData && lastData[0]} ${lastData && lastData[1]}`
				+ ` -> ${data && data[0]} ${data && data[1]}`);
		}


		this._lastCheckAppearWindowData = data;

		this._autoAppear[ what ].cnt ++;
		this.autoAppeared = true;

		this.appear(data, true);
	},


	timelyCheckBtnAnimation(what, item) {

		this.removeAllBtn2Animations();

		if (what == 'DEMO2_CLICK_NEXT_CHAR') {

			if ( Main.isCharSelected() )
				return;

			this.addBtn2Animation( document.querySelector('#btn-char-next') );

		} else if (what == 'DEMO2_CAMERA_FOLLOW') {

			if ( !Main.isCharSelected() )
				return;

			this.addBtn2Animation( ScreenCharInfo.mainElem.querySelector('#camera-follow') );
		}

//document.querySelector('#camera-follow')

/*
		if (what == 'GET_AXE1') {

			let char = Main.selectedItem;
			let task = char && char.isChar() && char.taskList.getCurrentTask();
			let hasTaskGetAxe1 = task && task.type == "TaskGrabItem"
				&& task.item && task.item.id === Progress.AXE1_ID;

			if ( !(
				char && char.isChar() && ( hasTaskGetAxe1 || char.taskList.isIdle() )
			) ) {

				this.addBtn2Animation( document.querySelector('#btn-char-next') );

			} else if (!hasTaskGetAxe1) {

				if ( ScreenCharInfo.unitTaskIconName != 'arrow-tl' )

					this.addBtn2Animation( ScreenCharInfo.mainElem.querySelector('#arrow-tl') );
			}


		} else if (what == 'START_WOODCUTTING1' || what == 'START_WOODCUTTING2') {

			let char = Main.selectedItem;

			if (char && char.isChar() && char.getEquipAxe() && char.getEquipAxe() ) {

				let task = char.taskList.getCurrentTask();

				if ( char.taskList.isIdle() || task && task.type !== "TaskCutWood" )

					if ( ScreenCharInfo.unitTaskIconName != 'arrow-tl' )

						this.addBtn2Animation( ScreenCharInfo.mainElem.querySelector('#arrow-tl') );
			}


		} else if (what == 'GET_AXE2') {

			let char = Main.selectedItem;

			if ( !char || !char.isChar() || char.getEquipAxe() ) {

				this.addBtn2Animation( document.querySelector('#btn-char-next') );

			} else { // selected is char w/o axe

				let task = char.taskList.getCurrentTask();

				if ( char.taskList.isIdle() || task && task.type !== "TaskMoveToBaseCenter"
						&& task.type !== "TaskExchangeItemsBaseCenter" )

					this.addBtn2Animation( ScreenCharInfo.mainElem.querySelector('#goto-basecenter') );
			}


		} else if (what == 'BUY_AXE') {

			if ( UI.hasOpen('BaseCenter') && ! Main.user.progress.haveAxeInBaseInventory() )

				this.addBtn2Animation( ScreenBaseCenterInfo.mainElem.querySelector('#btn-buy-sell-wide') );


		} else if (what == "START_WOODCUTTING_ALL") {

			var char = Main.selectedItem;

			if ( char && char.isChar() && !char.getEquipAxe()
					&& Main.user.progress.haveAxeInBaseInventory() ) {

				let task = char.taskList.getCurrentTask();

				if ( char.taskList.isIdle() || task && task.type !== "TaskMoveToBaseCenter"
						&& task.type !== "TaskExchangeItemsBaseCenter" )

					this.addBtn2Animation( ScreenCharInfo.mainElem.querySelector('#goto-basecenter') );
			}

		} //else
*/
	},


	checkAutoAppear(what) {

		var data = this._autoAppear[ what ];

		if (!data) {

			data = {
				cnt: 0,
				lastCloseTime: -Infinity,
				delayStart: -Infinity,
			};

			this._autoAppear[ what ] = data;
		}

		var conf = this.autoAppearConf[ what ];
		if (!conf)
			return true;

		if (typeof conf.cnt == "number" && conf.cnt <= data.cnt)
			return;

		if (typeof conf.interval == "number" && data.lastCloseTime + conf.interval > Engine.getRealTime())
			return;


		if (typeof conf.delay == "number") {

			if (data.delayStart <= data.lastCloseTime)
				data.delayStart = Engine.getRealTime();

			if (data.delayStart + conf.delay > Engine.getRealTime())
				return;
		}

		return true;
	},


	appear(data = Main.user.progress.nextProgressWindowData()) {

		var [ what, item ] = data;

		this.open();
		this.update(what, item);
	},


	clickSmall() {

		if (this.isOpen())
			this.close();
		else
			this.appear();
	},


	force(what) { // DEBUG
		this._force = what;
		what ? this.appear() : this.close();
	},


	update(what = this.what, item = this.item) {

		if (!this.isOpen())
			return;

		try {
			this.update_1(what, item);

		} catch (e) {
			Report.warn(`update ${what}`, e);
		}
	},


	update_1(what, item) {

		if (this._force)
			what = this._force;

		if (!what) {
			Report.warn("ProgressWindow: nothing");
			this.close();
			return;
		}

		this.what = what;
		this.item = item;


		this.mainElem.style['width'] = '';
		//this.mainElem.style['max-width'] = '46vw';
		this.mainElem.style['max-width'] = '530px';

		this.mainElem.querySelector('#btn-minimize').style.display = what == 'START' ? "none" : "";

		Array.from( this.mainElem.getElementsByClassName('progress-hdr') )
			.forEach(el => el.style.display = "");

		Array.from( this.mainElem.getElementsByClassName('progress-msg') )
			.forEach(el => el.style.display = "");

		this.mainElem.querySelector(`#progress-${what}-hdr`).style.display = "block";
		this.mainElem.querySelector(`#progress-${what}-msg`).style.display = "block";

		this.mainElem.querySelector(`#progress-btn-move-to-char`).style.display = "none";

		if (this.item && this.item.isChar() && !Display.cameraView.isItemInSector_Good(this.item) )
			this.mainElem.querySelector(`#progress-btn-move-to-char`).style.display = "flex";

		this.mainElem.querySelector(`#progress-btn-move-to-axe`).style.display = "none";

/*
		if (what == 'GET_AXE1')
			this.setup_GET_AXE1();

		if (what == 'GET_AXE2')
			this.setup_GET_AXE2();

		if (what == 'BUY_AXE')
			this.setup_BUY_AXE();

		if (what == 'START_WOODCUTTING_ALL')
			this.setup_START_WOODCUTTING_ALL();

		if (what == 'GATHER_MIN_AMOUNT')
			this.setup_GATHER_MIN_AMOUNT();

		if (what == 'SELL_WOOD_MIN_AMOUNT')
			this.setup_SELL_WOOD_MIN_AMOUNT();

		//if (what == 'GATHER_FOR_LEVEL1')
		//	this.setup_GATHER_FOR_LEVEL1();

		if (what == 'SHOP_UPDATE')
			this.setup_SHOP_UPDATE();

		if (what == 'SUMMARY')
			this.setup_SUMMARY();
*/

		if (what == 'DEMO2_SUMMARY')
			this.setup_DEMO2_SUMMARY();
	},


	updateTimers() {

		if ( this.isOpen('SUMMARY') )

			this.mainElem.querySelector('#progress-SUMMARY-time-val').textContent
				= Util.formatTime( Engine.time, false );

		if ( this.isOpen('DEMO2_SUMMARY') )

			this.mainElem.querySelector('#progress-DEMO2_SUMMARY-time-val').textContent
				= Util.formatTime( Engine.time, true );
	},


	clickNextTip(ifPrev) {

		var curName = this._forceTipName || this._setupTipName;

		this._forceTipName = Main.user.progress.getNextTip(curName, ifPrev);

		UI.update();
	},


	setupTipElem(el) {

		var tipName;

		if (this._forceTipName) {
			tipName = this._forceTipName;

		} else {
			tipName = Main.user.progress.getActualTip();
			this._setupTipName = tipName;
		}

		el.querySelector('#tip').style.display = tipName ? '' : 'none';

		if (!tipName)
			return;

		Array.from( el.querySelectorAll('div[id^="progress-tip-msg-"]') )
			.forEach(el => el.style.display = 'none');

		el.querySelector(`#progress-tip-msg-${tipName}`).style.display = '';

		return true;
	},


	clickMoveToChar() {

		if (!this.item || !this.item.isChar())
			return Report.warn("bad char", `${this.item}`);

		// Duplicate:
		// - clickMoveToLog()
		// ScreenCharInfo
		// TaskMoveToBaseCenter
		// more?

		Main.select(this.item);

		if (!ScreenCharInfo.cameraFollow)
			Display.cameraView.startMoveToItem(this.item);

		this.close();
	},


	hasBtn2Animation(el) { return el && !!el.querySelector('.btn-2-animation') },


	addBtn2Animation(el) {

		if (!el)
			return Report.warn("no element");

		if ( this.hasBtn2Animation(el) )
			return;

		var btnAnimElem = document.createElement('div');

		btnAnimElem.classList.add('btn-2-animation');

		el.appendChild(btnAnimElem);

		this._btnAnimationElems.add(el);
	},


	removeAllBtn2Animations() {

		this._btnAnimationElems.forEach(el => {

			Array.from( el.querySelectorAll('.btn-2-animation') )
				.forEach(btnAnimElem => el.removeChild(btnAnimElem));
		});

		this._btnAnimationElems.clear();
	},


	// ============================================================
/*
	setup_GET_AXE1() {

		//this.mainElem.style['max-width'] = '500px';

		if ( ! Display.cameraView.isItemInSector_Good(Item.byId(Progress.AXE1_ID)) ) {

			this.mainElem.querySelector(`#progress-btn-move-to-axe`).style.display = "flex";
		}
	},


	setup_GET_AXE2() {

		//this.mainElem.style['max-width'] = '500px';
	},


	setup_BUY_AXE() {

		var displayTip = ! Display.cameraView.isItemInSector_Good(Main.area.baseCenter);

		this.mainElem.querySelector(`#progress-BUY_AXE-tip`).style.display = displayTip ? "flex" : "none";
	},


	setup_START_WOODCUTTING_ALL() {

		var listCharsEl = this.mainElem.querySelector('#progress-START_WOODCUTTING_ALL-list-chars');
		var listAxesEl = this.mainElem.querySelector('#progress-START_WOODCUTTING_ALL-list-axes');

		var btnChars = this.mainElem.querySelector('#btn-chars');
		var btnAxes = this.mainElem.querySelector('#btn-axes');

		if (this._btnCharsAxes == 'chars') {

			listCharsEl.style.display = "flex";
			listAxesEl.style.display = "none";

			btnChars.classList.add('highlight');
			btnAxes.classList.remove('highlight')

			this.setup_START_WOODCUTTING_ALL_chars(listCharsEl);

		} else {

			listCharsEl.style.display = "none";
			listAxesEl.style.display = "flex";

			btnChars.classList.remove('highlight');
			btnAxes.classList.add('highlight')

			this.setup_START_WOODCUTTING_ALL_axes(listAxesEl);
		}
	},



	setup_START_WOODCUTTING_ALL_axes(listEl) {

		Array.from( listEl.querySelectorAll('div') ).forEach(el => {

			while (el.firstChild)
				el.removeChild(el.firstChild);
		});


		var axes = Item.getAllAxes();

		axes.sort((a, b) => {

			var	aBaseItem = a.getBaseItem(),
				bBaseItem = b.getBaseItem();

			return !aBaseItem ? -1 : !bBaseItem ? 1 : // 1st on the ground
				!aBaseItem.isChar() ? -1 : !bBaseItem.isChar() ? 1 : // 2nd stored in non-char
				a.id - b.id;
		});


		this.mainElem.style['max-width'] = '75vw';

		if (axes.length > 6)
			this.mainElem.style['width'] = '65vw';


		var axeByCharId = {};

		axes.forEach((axe, i) => {

			var colNum = Math.floor(i / 3) + 1;
			if (colNum > 3)
				return;

			var el = getUIElem('progress-axe-list-elem').cloneNode(true);

			el.id = `progress-axe-list-elem-${axe.id}`;
			el.onclick = () => ProgressWindow.onClickAxe_START_WOODCUTTING_ALL(axe.id);

			listEl.querySelector(`#col-${colNum}`).appendChild(el);


			var canvas = axe.display2D.getCanvas("ProgressWindow", "allowParent");
			canvas.classList.add('progress-axe-img');

			var imgAnchorEl = el.querySelector(`#axe-img`)
			imgAnchorEl.appendChild(canvas);

			if (axe.canGrab())
				imgAnchorEl.style.background = '#8c6';
			else
				imgAnchorEl.classList.add('uicoins-bg');


			el.querySelector(`#axe-name`).textContent = axe.getLangName();


			var locationText = '';
			var checkMark;
			var baseItem = axe.getBaseItem();

			if (axe.canGrab()) {

				locationText = Lang('progress_AxeOnGround') + ' ' + Util.formatPointLocation(axe.getPoint());

			} else if (!baseItem) {

				Report.warn("no baseItem", `${axe}`);

			} else {

				if (baseItem.isChar()) {

					locationText = Lang('progress_AxeStoredAtChar');

					if (!axeByCharId[ baseItem.id ]) { // only 1 axe/char checkmarked
						checkMark = true;
						axeByCharId[ baseItem.id ] = true;
					}

				} else
					locationText = Lang('progress_AxeStoredAt');

				locationText += ' "' + baseItem.getLangName() + '"';
			}

			el.querySelector(`#axe-location`).textContent = locationText;

			el.querySelector(`#check-mark`).style.display = checkMark ? '' : 'none';
		});
	},



	onClickAxe_START_WOODCUTTING_ALL(id) {

		var axe = Item.getById(id);

		if (!axe || axe.isRemoved())
			return Report.warn("onClickAxe: bad item", `axe=${axe}`);

		var baseItem = axe.getBaseItem();

		if (axe.canGrab()) {

			//Main.select(null);
			Display.cameraView.startMoveToItem(axe);


		} else if (!baseItem) {

			Report.warn("onClickAxe: !canGrab, !baseItem", `${axe}`);

			Display.cameraView.startMoveToItem(axe);


		} else if (baseItem.canBeSelected()) {

			Main.select(baseItem);

			if (!baseItem.isChar() || !ScreenCharInfo.cameraFollow) {

				let intervals = baseItem.isBaseCenter() ? baseItem.getCameraIntervals() : null;

				Display.cameraView.startMoveToItem(baseItem, intervals);
			}

		} else {

			Report.warn("onClickAxe: !canGrab, baseItem", `${axe}`);

			//Main.select(null);
			Display.cameraView.startMoveToItem(axe);
		}

		this.close();
	},



	setup_START_WOODCUTTING_ALL_chars(listEl) {

		while (listEl.firstChild)
			listEl.removeChild(listEl.firstChild);


		Main.getChars().forEach(char => {

			if (!char.isChar())
				return;

			var el = getUIElem('progress-char-list-elem').cloneNode(true);

			el.id = `progress-char-list-elem-${char.id}`;
			el.onclick = () => ProgressWindow.onClickChar_START_WOODCUTTING_ALL(char.id);

			listEl.appendChild(el);

			var canvas = char.display2D.getImage2D({ key: "ProgressWindow", noStyle: true });

			canvas.classList.add('char-img-smaller1');
			el.querySelector(`#char-img`).appendChild(canvas);

			el.querySelector(`#char-name`).textContent = char.getLangName();


			el.querySelector(`#line1-no`).style.display = char.getEquipAxe() ? "none" : "flex";
			el.querySelector(`#line1-ok`).style.display = char.getEquipAxe() ? "flex" : "none";


			el.querySelector(`#line2-no`).style.display = "none";
			el.querySelector(`#line2-ok`).style.display = "none";


			var line2El;
			var descr;

			if ( char.taskList.hasUnfinishedTask("TaskCutWood") ) {

				line2El = el.querySelector(`#line2-ok`);
				descr = char.taskList.getCurrentTask().getLangDescr();

			} else {
				line2El = el.querySelector(`#line2-no`);

				if (char.taskList.isIdle())
					descr = Lang('TaskIdle');
				else
					descr = Lang('progress_TaskOtherTask');
			}

			line2El.style.display = "flex";
			line2El.querySelector('#line2-descr').textContent = descr;
		});
	},



	onClickChar_START_WOODCUTTING_ALL(id) {

		var char = Item.getById(id);

		Main.select(char);

		if (!ScreenCharInfo.cameraFollow)
			Display.cameraView.startMoveToItem(char);

		this.close();
	},


	onClick_START_WOODCUTTING_ALL(what) {

		this._btnCharsAxes = what == 'chars' ? 'chars' : 'axes';

		UI.update();
	},



	// ================================================================

	setup_GATHER_MIN_AMOUNT() {

		this.mainElem.style['max-width'] = '550px';

		var el = this.mainElem.querySelector('#progress-GATHER_MIN_AMOUNT-msg');

		var summary = Main.area.getLogStorageSummary();
		var percentGathered = ( Math.min(1, (summary.volume) / LogStorage.MIN_AMOUNT) * 100 ).toFixed(0);

		el.querySelector('#progress-GATHER_MIN_AMOUNT-msg-2-val').textContent = percentGathered + "%";
		el.querySelector('#progress-bar-gathered').style.width = percentGathered + "%";
	},


	setup_SELL_WOOD_MIN_AMOUNT() {

		var logStorageItem = Main.area.logStorages[0] && Main.area.logStorages[0].baseItem;

		var	displayTip = logStorageItem && ! Display.cameraView.isItemInSector_Good(logStorageItem);

		this.mainElem.querySelector(`#progress-SELL_WOOD_MIN_AMOUNT-tip`).style.display = displayTip ? "flex" : "none";
	},
*/
/*
	setup_GATHER_FOR_LEVEL1() {

		this.mainElem.style['max-width'] = '50vw';
		this.mainElem.style['width'] = '45vw';

		var TARGET_AMOUNT = UserBase.LEVEL1_TARGET_AMOUNT;

		var el = this.mainElem.querySelector('#progress-GATHER_FOR_LEVEL1-msg');

		var percentSold = Math.min(1, Main.user.soldWood / TARGET_AMOUNT) * 100;

		var summary = Main.area.getLogStorageSummary();
		var percentSoldAndGathered = Math.min(1, (Main.user.soldWood + summary.volume) / TARGET_AMOUNT) * 100;

		el.querySelector('#progress-bar-sold').style.width = percentSold + "%";
		el.querySelector('#progress-bar-sold-gathered').style.width = percentSoldAndGathered + "%";

		el.querySelector('#progress-bar-volume-val').textContent = Util.formatVolume(Main.user.soldWood);
		//el.querySelector('#progress-bar-percent-val').textContent = ' (100%)';
	},
*/

/*
	setup_SHOP_UPDATE() {

		this.mainElem.style['width'] = '40vw';
		this.mainElem.style['max-width'] = '500px';

		ScreenShop.updateInform();

		// If used "Home": never display after 20 min.
		var after20minUsedHome = Engine.time > 20 * 60 && Main.user.progress.isSet(Progress.CLICK_HOME);

		var displayTip;

		if (!after20minUsedHome)
			displayTip = ! Display.cameraView.isItemInSector_Good(Main.area.baseCenter);

		this.mainElem.querySelector(`#progress-SHOP_UPDATE-tip`).style.display = displayTip ? "flex" : "none";
	},



	setup_SUMMARY() {

		var el = this.mainElem.querySelector('#progress-SUMMARY-msg');

		el.querySelector('#progress-SUMMARY-num-chars-val').textContent = Main.getChars().filter(char => char.isChar()).length;
		el.querySelector('#progress-SUMMARY-earned-val').textContent = Util.formatCoins( Main.user.earned );
		el.querySelector('#progress-SUMMARY-volume-val').textContent = Util.formatVolume( Main.user.soldWood );

		var haveTipElem = this.setupTipElem(el);

		if (haveTipElem) {
			this.mainElem.style['max-width'] = '500px'; // remain same width after clicking next tip
			this.mainElem.style['width'] = '500px';
		}

		this.updateTimers();
	},
*/


	setup_DEMO2_SUMMARY() {

		var el = this.mainElem.querySelector('#progress-DEMO2_SUMMARY-msg');;

		el.querySelector('#progress-DEMO2_SUMMARY-msg-1-val').textContent = Main.user.progress.everSelectedChars.size;
		el.querySelector('#progress-DEMO2_SUMMARY-msg-1-val2').textContent = Main.getChars().length;

		var haveTipElem = this.setupTipElem(el);

		if (haveTipElem) {
			this.mainElem.style['max-width'] = '500px'; // remain same width after clicking next tip
			this.mainElem.style['width'] = '500px';
		}

		this.updateTimers();
	},

}


ProgressWindow.init();




export { ProgressWindow }

