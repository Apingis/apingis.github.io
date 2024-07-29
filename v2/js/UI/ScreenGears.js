
import { Display } from '../Display/Display.js';


var ScreenGears = {

	aspectRatio: Infinity,
	widthFractionMax: 0.4,
	hasFullHeight() { return true },
	bgName: "screen-metal011",

	checkItem(item) { return true },

	mainElem: document.querySelector("#gears-main"),


	close() {
	},

	open() {
	},


	update() {
	},


	pressEsc() { UI.setScreen() },


	init() {

		this.mainElem.innerHTML = getUIElem("gears-main").innerHTML;


		//if (AppConfig.noServer)
		//	this.mainElem.querySelector('#gears-server').style.display = 'none';


		if (!Display.isWebGL2) {

			this.mainElem.querySelector('#gears-msaa-4').style.display = 'none';
			this.mainElem.querySelector('#gears-msaa-max').style.display = 'none';

		} else {

			this.mainElem.querySelector('#gears-msaa-4').style.display
				= Display.maxSamples === 4 ? "none" : "";

			this.mainElem.querySelector('#gears-msaa-max-msg').innerHTML
				= 'MSAA&nbsp;x' + Display.maxSamples;
		}
	},


	clickServerSave() {

		Accounting.forceSendJournal();

		this.saveServerStatusUpdate();
	},


	saveServerStatusUpdate() {

		UI.update();

		this.updateTimers();
	},


	updateTimers() {

		this.mainElem.querySelector('#gears-server-present').style.display = AppConfig.noServer ? 'none' : '';
		this.mainElem.querySelector('#gears-server-not-present').style.display = AppConfig.noServer ? '' : 'none';


		var lastSavedElem = this.mainElem.querySelector('#gears-server-last-saved');
		var pendingElem = this.mainElem.querySelector('#gears-server-pending');
		var btnElem = this.mainElem.querySelector('#gears-server-save-btn');

		var btnIsInactive = btnElem.classList.contains('btn-2-inactive');


		if ( Accounting.isSavingOnServer() || Accounting.isForceSendEnqueued() ) {

			lastSavedElem.style.display = 'none';
			pendingElem.style.display = 'flex';

			! btnIsInactive && btnElem.classList.add('btn-2-inactive');

		} else {

			lastSavedElem.style.display = 'flex';
			pendingElem.style.display = 'none';

			let lastSaveTime = Accounting.responseOKLastTime || Engine.startRealTime;
			let t = Engine.getRealTime() - lastSaveTime;

			this.mainElem.querySelector('#gears-server-last-saved-val').textContent = Util.formatTime(t, true);

			if ( Accounting.haveForceSendCondition() ) {

				btnIsInactive && btnElem.classList.remove('btn-2-inactive');

			} else {
				! btnIsInactive && btnElem.classList.add('btn-2-inactive');
			}
		}
	},


	clickExtraSettings() {

		var el = document.getElementById('gears-debug');

		el.style.display = el.style.display === 'none' ? 'flex' : 'none';
	},

}


ScreenGears.init();



ScreenGears.click = function(what, arg2) {

	if (UIPrefs.List.indexOf(what) === -1)
		return Report.warn("unknown what", `w=${what} arg2=${arg2}`);

	var elName = 'prefs-' + what + (arg2 ? `-${arg2}` : "");
	var el = document.getElementById(elName);
	if (!el)
		return Report.warn("no elem", `w=${what} arg2=${arg2}`);


	var value = el.type == "checkbox" ? el.checked : arg2

	var obj = UIPrefs[ what ];
	if (!obj)
		Report.warn("no obj", `w=${what}`);

	obj.set(value);
}




export { ScreenGears }

