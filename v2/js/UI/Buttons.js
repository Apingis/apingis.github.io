
var Buttons = {

	el: {

		topContainer: document.getElementById('buttons-top-container'),

		topRow1Right: document.getElementById('buttons-top-row-1-right'),

		buttonGears: document.getElementById('button-gears'),
		buttonHelp: document.getElementById('button-help'),

		rowBottom: document.getElementById('buttons-row-bottom'),
	},


	resize() {
	},


	update() {

		this.updateTop();
		this.updateBottom();
	},


	towerIsVisible() {

		var tower = Main.area.tower;

		return tower && !tower.isUpgradeGoing();
	},


	updateTower() {

		var showButtons = this.towerIsVisible();

		document.getElementById('buttons-tower').style.display = showButtons ? 'flex' : 'none';

		if (!showButtons)
			return;

		var tower = Main.area.tower;

		if (!tower)
			return;

		var settings = tower.getPossibleSettings();
		var tMult = Engine.enqueuedTimeMultiplier;

		document.querySelectorAll('#buttons-tower div[id^=tower-]').forEach( el => {

			var match = el.id.match(/^tower-([\d\.]+)$/);
			var btnSetting = Number.parseFloat(match[1]);

			el.style.display = settings.indexOf(btnSetting) === -1 ? 'none' : '';

			el.classList[ btnSetting === tMult ? 'add' : 'remove' ]('highlight');
		});
	},


	updateTop() {

		this.el.buttonGears.classList[ UI.getScreenName() == "Gears" ? 'add' : 'remove' ]("highlight");
		this.el.buttonHelp.classList[ UI.getScreenName() == "Help" ? 'add' : 'remove' ]("highlight");

		this.updateTower();


		var topRow1Right_rect = this.el.topRow1Right.getBoundingClientRect();

		var MARGIN = window.innerHeight * 0.01;

		var PREFERRED_POS = Math.floor(0.4 * window.innerWidth - topRow1Right_rect.width / 2);

		var left = window.innerHeight * 0.25
			+ (UIPrefs.stats.isOn ? 80 : 0)
			+ MARGIN;

		var right = window.innerWidth
			- UI.getClearCanvasOffsetAtTopRight()
			- MARGIN;

		var positionTopRow1Right_single = (pos) => {

			if (left > pos)
				pos = left;
			else if (right < pos + topRow1Right_rect.width)
				pos = right - topRow1Right_rect.width;

			this.el.topContainer.style.left = Math.floor(pos) + "px";
		};

		if ( !(UI.Debug.isOn || this.towerIsVisible()) ) {

			return positionTopRow1Right_single(PREFERRED_POS);
		}


		var topRow2 = document.getElementById('buttons-top-row2');
		var topRow2_rect = topRow2.getBoundingClientRect();

		var totalWidth = topRow2_rect.width + MARGIN + topRow1Right_rect.width;

		if (totalWidth < right - left) {

			document.getElementById('buttons-top-row-2-anchor-top').appendChild(topRow2);

			let pos = PREFERRED_POS - totalWidth;

			if (left > pos)
				pos = left;
			else if (right < pos + totalWidth)
				pos = right - totalWidth;

			this.el.topContainer.style.left = Math.floor(pos) + "px";

			return;
		}

		var anchorBelow = document.getElementById('buttons-top-row-2-anchor-below');

		anchorBelow.appendChild(topRow2);
		anchorBelow.style.left = "26.5vh";

		anchorBelow.style.top = Math.max(54,
			Math.floor(topRow1Right_rect.height + 2 * MARGIN + 0.5)
		) + "px";

		positionTopRow1Right_single(PREFERRED_POS);
	},



	updateBottom() {

		// arrows: "on" means remove the from screen
		var btnBottom2Elem = document.getElementById('buttons-bottom-2');

		if (btnBottom2Elem)
			btnBottom2Elem.style.display = UIPrefs.arrows.isOn ? "none" : "flex";

		var off = UI.getClearCanvasOffsetAtBottomRight();

		off = Math.max(off, window.innerWidth * 0.4);

		this.el.rowBottom.style.right = Math.ceil(off + window.innerWidth * 0.01) + "px";
	},



	// =====================================================================

	clickTower(n) {

		if ( !Main.area.tower || !Main.area.tower.isSettingAllowed(n) ) {

			Report.warn("setting not allowed", `n=${n}`);
			this.updateTower();
			return;
		}

		Engine.setTimeMultiplier(n);
	},


	clickHome() {

		if (!Display.cameraView.isAtLocation())
			Main.user.progress.onClickHome();

		('ScreenCharInfo' in window) && ScreenCharInfo.removeCameraFollow();

		Display.cameraView.moveToLocation();

		ProgressWindow.close();
	},


	clickZoom(arg) {

		Main.user.progress.onClickZoom();

		Display.cameraView.zoom(arg);
	},


	clickNextUnit(arg) {

		Main.user.progress.onClickNextChar();

		Main.clickNextUnit(arg);
	},


	clickGears() {

		UI.setScreen( UI.getScreenName() == "Gears" ? "" : "Gears" );

		ProgressWindow.close();
	},


	clickHelp() {

		UI.setScreen( UI.getScreenName() == "Help" ? "" : "Help" );

		ProgressWindow.close();
	},

}




export { Buttons }

