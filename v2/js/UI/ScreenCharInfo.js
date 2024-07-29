
var ScreenCharInfo = {

	isItemInfo: true, // unused
	aspectRatio: Infinity,
	widthFractionMax: 0.35,
	widthMax: 500,
	hasFullHeight() {},
	bgName: "medium-paper4",

	checkItem(item) { return item && item.isChar() },

	mainElem: document.querySelector("#charinfo-main"),


	item: null,
/*
	unitTaskIconName: 'arrow-tl',
	arrowTLLock: true,
	cameraFollow: true,
*/
	unitTaskIconName: '',
	arrowTLLock: false,
	cameraFollow: false,


	close() {

		this.item = null;
	},


	open(item) {

		this.item = item;

		if (this.cameraFollow)
			Display.cameraView.startFollowing(this.item);

		//this.updateHeader(); // resize!
	},


	update() {

		this.updateUnitTaskIcons();

		this.updateOtherIcons();

		try {
			this.updateHeader();
			this.updateTask();

		} catch (e) {
			Report.warn("update", e);
		}
	},


	pressEsc() { Main.selectedItemSet() },


	init() {

		this.mainElem.innerHTML = getUIElem("charinfo-main").innerHTML;

		this.loadUIPrefs();
	},


	loadUIPrefs() {

		var getItem = (name, defaultValue) => {

			var value = window.localStorage.getItem(`ScreenCharInfo-${name}`);
			if (value === null)
				return defaultValue;

			if (value.toLowerCase() == "false")
				return false;
			if (value.toLowerCase() == "true")
				return true;

			return value;
		}

		//this.unitTaskIconName = getItem('unitTaskIconName', this.unitTaskIconName);
		this.arrowTLLock = getItem('arrowTLLock', this.arrowTLLock);
		this.cameraFollow = getItem('cameraFollow', this.cameraFollow);

		if (this.arrowTLLock && !this.unitTaskIconName)
			this.unitTaskIconName = 'arrow-tl';
	},


	saveUIPrefs() {

		var setItem = (name, value) => window.localStorage.setItem(`ScreenCharInfo-${name}`, value);

		//setItem('unitTaskIconName', this.unitTaskIconName);
		setItem('arrowTLLock', this.arrowTLLock);
		setItem('cameraFollow', this.cameraFollow);
	},


	clickUnitTaskIcon(name) {

		if (name == 'piledrop') {

			this.item.taskList.setTask("TaskDeliverLog");
			return;
		}

		if (name == 'goto-basecenter') {

			this.item.taskList.setTask("TaskMoveToBaseCenter");
			return;
		}


		if (this.unitTaskIconName === name) {

			this.unitTaskIconName = '';

			if (name == 'arrow-tl' && this.arrowTLLock) {

				this.arrowTLLock = false;
				this.saveUIPrefs();
			}
				
		} else
			this.unitTaskIconName = name;

		UI.update();
	},


	onSetTask(unit) {

		if (unit !== this.item)
			return;

		if (!this.arrowTLLock) {
			this.unitTaskIconName = '';

		} else
			this.unitTaskIconName = 'arrow-tl';

		UI.update();
	},


	isIconAvailable(name) {

		if (name == 'arrow-tl')// || name == 'move')
			return true;

		if (this.item.isCarrying()) {
			return name == 'drop' || name == 'piledrop';
		}

		// Not carrying

		if (name == 'goto-basecenter')
			return true;
/*
		if (name == 'axe')
			return !!this.item.getEquipAxe();

		if (name == 'grab')
			return true;
*/
	},


	isIconInactive(name) {

		if (name == 'goto-basecenter' && (0
				|| !Main.area.baseCenter
				|| this.item.taskList.hasUnfinishedTask('TaskMoveToBaseCenter')
		) )
			return true;

		if (name == 'piledrop' && this.item.taskList.hasUnfinishedTask('TaskDeliverLog'))
			return true;
	},


	updateUnitTaskIcons() {

		Array.from( this.mainElem.getElementsByClassName('unit-task-icon') ).forEach(el => {

			el.classList.remove('highlight');

			if (el.id === this.unitTaskIconName)
				el.classList.add('highlight');

			el.style.display = this.isIconAvailable(el.id) ? "" : "none";

			if (this.isIconInactive(el.id))
				el.classList.add('btn-2-inactive');
			else
				el.classList.remove('btn-2-inactive');
		});


		if (this.unitTaskIconName && !this.isIconAvailable(this.unitTaskIconName) )
			this.unitTaskIconName = '';
	},


	updateOtherIcons() {

		this.mainElem.querySelector('#lock-locked').style.display = this.arrowTLLock ? "" : "none";
		this.mainElem.querySelector('#lock-unlocked').style.display = this.arrowTLLock ? "none" : "";

		this.updateCameraFollow();
	},


	updateCameraFollow() {

		var el = this.mainElem.querySelector('#camera-follow');

		if (this.cameraFollow)
			el.classList.add('highlight');
		else
			el.classList.remove('highlight');
	},


	clickArrowTLLock() {

		this.arrowTLLock = !this.arrowTLLock;

		if (this.arrowTLLock && !this.unitTaskIconName)
			this.unitTaskIconName = 'arrow-tl';

		if (!this.arrowTLLock)
			this.unitTaskIconName = '';

		this.saveUIPrefs();
		UI.update();
	},


	clickStopTask() {
		this.item.aI.stopTask();
	},


	clickCameraFollow(arg) {

		this.cameraFollow = arg === undefined ? !this.cameraFollow : arg;

		Main.user.progress.onClickCameraFollow(arg, this.item);

		if (this.cameraFollow)
			Display.cameraView.startFollowing(this.item);
		else
			Display.cameraView.stopFollowing();

		this.saveUIPrefs();
		UI.update();
	},


	removeCameraFollow() { // e.g. free move from keyboard

		if (this.cameraFollow === false)
			return;

		if (!Main.selectedItem || !Main.selectedItem.isUnit())
			return;

		this.cameraFollow = false;

		this.saveUIPrefs();
		UI.update();
	},


	updateTimers() {

		//if (this.item.taskList.hasUnfinishedTask("TaskCutWood"))
			this.updateTask();
	},

}


ScreenCharInfo.init();


ScreenCharInfo.updateHeader = function() {

	if (!this.item)
		return Report.warn("no char");


	var el;
	var select = (arg) => this.mainElem.querySelector(arg);


	var addUp = select('.screeninfo-addup');

	if (addUp.firstChild)
		addUp.removeChild(addUp.firstChild);

	var canvas = this.item.display2D.getImage2D({ key: "ScreenCharInfo", noStyle: true });

	canvas.classList.add('char-img-smaller0');
	addUp.appendChild(canvas);
	addUp.style.right = UI.getScreenWidth() - Math.floor(window.innerHeight * 0.02) + "px";

	var rect = addUp.getBoundingClientRect();

	UI.setAddUpWidth( Math.floor(rect.width + 0.5) );

	this.mainElem.style['min-height'] = Math.floor(rect.height + 0.5) + "px";

	select("#char-name").textContent = this.item.getLangName();
}



ScreenCharInfo.updateTask = function() {

	var select = (arg) => this.mainElem.querySelector(arg);

	var task = this.item.taskList.getCurrentTask();
/*
console.log(
"TaskCutWood",
		task.cntChopped,
		task.cntLogs,
		task.totalLogMass,

		task.cntHits,
		task.cntBranches,
		task.totalMaxHeight,
);
*/

	var el = select('#task-cur');

	if (task.type == "TaskIdle") {

		el.style.display = "none";
		return;
	}


	el.style.display = "";

	select('#task-cur-overhdr').textContent = task.getLangDescr();
	select('#task-cur-overhdr-time').textContent = task.getTimerText();

	var statusEl = el.querySelector('#task-cur-status');

	if (task.isTaskFinished()) {

		statusEl.textContent = Lang(task.status);

		statusEl.style.color = !task.objectionsReached ? '#900' : '';

	} else {
		statusEl.textContent = '';//([test])';
	}

	//select('#task-cur-stop').style.display = task.isTaskFinished() ? "none" : "";


	// TASK-SPECIFIC DATA

	el.querySelector('#task-status-cut-wood').style.display = task.type == "TaskCutWood" ? "" : "none";

	if (task.type == "TaskCutWood") {

		el.querySelector('#trees-val').textContent = task.cntChopped;

		el.querySelector('#task-status-cut-wood-totalMaxHeight').style.display = 'none';
		el.querySelector('#task-status-cut-wood-totalMaxHeight-short').style.display = 'none';

		if (task.cntChopped > 0) {
			el.querySelector('#task-status-cut-wood-totalMaxHeight').style.display = 'block';

		} else if (task.cntChopped >= 100 && task.totalMaxHeight >= 100) {

			el.querySelector('#task-status-cut-wood-totalMaxHeight-short').style.display = 'block';
		}

		el.querySelector('#totalMaxHeight-val').textContent
			= task.cntChopped ? Util.formatHeight(task.totalMaxHeight) : '';

		el.querySelector('#task-status-cut-wood-totalMaxHeight-units').style.display
			= task.cntChopped ? 'block' : 'none';


		el.querySelector('#hits-branches').style.display = task.cntHits ? "flex" : "none";

		if (task.cntHits) {
			el.querySelector('#cntHits-val').textContent = task.cntHits;
			el.querySelector('#cntBranches-val').textContent = task.cntBranches;
		}


		el.querySelector('#cntLogs-val').textContent = task.cntLogs;
		el.querySelector('#totalLogMass-val').textContent = Util.formatMass(task.totalLogMass);
	}

}

//		let episode = this.item.taskList.getCurrentEpisode();
//		statusEl.textContent = !episode ? '' : episode.getLangDescr();





export { ScreenCharInfo }

