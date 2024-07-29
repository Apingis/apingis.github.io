
var Engine = {

	updateNum: 0,
	frameNum: 0,
	onAfterStart: null,

	//   Application Time
	//
	// * in sec
	// * is what is referenced by application logic
	// * never decrease
	// * doesn't increase when application is not running
	time: 0,
	timeMultiplier: 1,
	enqueuedTimeMultiplier: 1,
	T_MULT_MIN: 1e-5,

	u_time: { value: 0 },

	lastRenderTime: 0,

	// What would be app time at the start of the next render
	targetRenderTime: 0,

	// Real Time (clock, in sec)
	startRealTime: 0,
	realTime: 0,

	getRealTime() { return performance.now() / 1000; },

	updateRealTime() { this.realTime = this.getRealTime() },

	renderInterval: 1/30,
	targetRenderRealT: 0,
	lastRenderStartRealT: 0,


	offscreenUpdatesInTimeCnt: 0,
	offscreenUpdatesTotalTime: 0,


	visibilityState: "",
	visibilityHiddenStartTime: 0,

	isVisible() { return this.visibilityState == "visible" },

	onVisibilityChange() { Engine.updateVisibilityState() }, // 'this' is not set on event


	updateVisibilityState() {

		var state = document.visibilityState;

		//console.log(`visibilityState=${state}`);

		if (this.visibilityState && this.visibilityState == state)
			return Report.warn("visibilityState");

		this.visibilityState = state;

		//if (this.isVisible()) // from setTimeout!
		//	this.updateStart();
	},


	stopped: false,

	isStopped() { return this.stopped },

	stop() {
		this.stopped = true;
// includes!
//		AI.stop();
//		Main.area.events.stopped = true;
	},


	setTimeMultiplier(n) {

		if (typeof n == 'string')
			n = Number.parseFloat(n);

		n = Math.max(this.T_MULT_MIN, n);
		this.enqueuedTimeMultiplier = n;

		//console.log(`setTimeMultiplier(${n}) t=${Util.toStr(this.time)}`);

		//UI.update(); //TODO
	},


	onAfterTimeMultiplierInEffect() {

		Display.cameraView.restartMove();

		UI.update();
	},
}



Engine.start = function() {

	if (this.startRealTime === 0)
		this.startRealTime = this.getRealTime();

	TWEEN.now = () => Engine.time * 1e3;
	TWEEN.update(1e-4);

	document.onvisibilitychange = () => { Engine.updateVisibilityState() };
	this.updateVisibilityState();

	setTimeout(Engine.runUpdateStart, 10);
}



Engine.runUpdateStart = () => Engine.updateStart();


Engine.updateStart = function() { // w/ rAF

	if (this.frameNum === 0)
		return Engine.runRender();

	this.updateNum ++;

	if (!this.isVisible() || this.stopped) {

		setTimeout(Engine.runUpdateStart, 200);
		return;
	}


	this.targetRenderTime = this.time + this.renderInterval;


	this.updateRealTime();

	this.targetRenderRealT = this.lastRenderStartRealT + this.renderInterval;

	// rAF
	var useRAF = this.renderInterval === 1/30 || this.renderInterval === 1/60;
	if (useRAF) {
		let advanceT = this.renderInterval === 1/30 ? 0.006 : 0.003;
		this.targetRenderRealT -= advanceT;
	}

	var noTimeRemains;

	if (this.targetRenderRealT < this.realTime) {

		noTimeRemains = true;
		this.targetRenderRealT = this.realTime;

		let t = this.targetRenderRealT - (this.lastRenderStartRealT + this.renderInterval);
		if (t < -0.01) { // since the start of the previous render()
			console.log(`renderInterval: off by ${Util.toStr(t)}`);
		}
		//this.targetRenderTime += ?
	}


	this.offscreenUpdate(noTimeRemains);
/*
	var t = this.getRealTime() - this.realTime;
	//if (t > 0.02) {
	if (t > 0.1 && this.frameNum > 100) {
		console.warn(`offscreenUpdate ${Util.toStr(t)} (${this.offscreenUpdatesInTimeCnt}`
			+ ` avg=${(this.offscreenUpdatesTotalTime/(this.offscreenUpdatesInTimeCnt || 1)).toFixed(4)})`);
		this.offscreenUpdatesInTimeCnt = 0;
		this.offscreenUpdatesTotalTime = 0;

	} else {
		this.offscreenUpdatesInTimeCnt ++;
		this.offscreenUpdatesTotalTime += t;
	}
*/

	var timeout = this.targetRenderRealT - this.getRealTime();

	if (Main.DEBUG >= 3 && this.frameNum > 100) {

		if (Engine.timeMultiplier >= 10 && timeout < -0.1
				|| Engine.timeMultiplier < 10 && timeout < -0.03)

			console.log(`targetRenderRealT: off by ${Util.toStr(-timeout)}`);
	}

	timeout = 1e3 * Math.max(0, timeout);

	if (useRAF)
		setTimeout(Engine.runRequestAnimationFrame, timeout);
	else
		setTimeout(Engine.runRender, timeout);
}


Engine.runRequestAnimationFrame = () => requestAnimationFrame(Engine.runRender);

Engine.runRender = () => {
/*
for(let i=0; i < 5;i++) {
	UI.setRequiresUpdate();
	UI.checkRequiresUpdate();
}
*/
	UI.checkRequiresUpdate(); // No more click events processed before render.

	//Unit.removeAllUnitPathDisplay();
	//Main.getChars().forEach(char => char.setupUnitPathDisplay());

	//Main.getChars()[0].setupUnitPathDisplay();


	Engine.render();
}

//
//   Display-independent periodic processing
//
// - runs before every render (display update)
// (X) - runs every 'offscreenUpdateInterval' (or as often as browser permits)
//
Engine.offscreenUpdate = function(noTimeRemains) {

	var tMultDiff = this.timeMultiplier - this.enqueuedTimeMultiplier;

	if (tMultDiff > 0) {
		this.timeMultiplier = this.enqueuedTimeMultiplier;
		this.onAfterTimeMultiplierInEffect();
	}

	var targetTime = this.time + (this.targetRenderTime - this.time) * this.timeMultiplier;

	if (tMultDiff < 0) { // acceleration
		this.timeMultiplier = this.enqueuedTimeMultiplier;
		this.onAfterTimeMultiplierInEffect();
	}

var tDelta = this.targetRenderTime - this.time;
if (tDelta > 3)
	console.error(`tDelta=${tDelta}`);

	var tCurr = Engine.time;
	var numUpdates = 0;

	var runIntervalMax = window['AI'] && AI.T_RUN_INTERVAL_MAX || 1;

	var areaEvents = Main.area.events;
	var slots = Local.get().slots;

	while (1) { // At least 1 update

		let tNextEvent = areaEvents && areaEvents.nextEventTime() || Infinity;

		let tNext = Math.min(tNextEvent, targetTime, tCurr + runIntervalMax);

		// Slot events.
		tNext = Math.min(tNext, slots && slots.getNextEventT(tCurr) || Infinity);

console.assert(tNext >= tCurr);

		this.offscreenUpdateStep(tNext); // sets [this|Engine].time
		numUpdates ++;
		tCurr = tNext;

		if (tCurr === targetTime)
			break;
	}

	//if (numUpdates > 1)
	//	console.log(`numUpdates=${numUpdates}`);
//if (this.frameNum % 100 === 0)
//console.log(`offscreenUpdate T=${this.time} rT=${Engine.getRealTime()}`);

	this.offscreenUpdate_2();
}



Engine.offscreenUpdateStep = function(time) {

	this.time = time; // set correct Engine.time

	TWEEN.update(time * 1000); // TODO (+tMult)

	var slots = Local.get().slots;

	slots && slots.executeEvents(time);

	Main.area.events && Main.area.events.executeEvents(time);

	CGroup.updateAll(); // items crumble/etc during events

	window['AI'] && AI.update();
}



Engine.offscreenUpdate_2 = function() {

	Tooltip.update();

	Label2D.update();

	MiniMap.update();

	if ( UI.hasOpen('ChainTestInfo') )
		ScreenChainTestInfo.updatePerFrame();

	if ( UI.hasOpen('ConstructionStartInfo') )
		ScreenConstructionStartInfo.updatePerFrame();

	if ( AppConfig.isDemo2() )
		window['demo2_updatePerFrame']();


	var f = this.frameNum & 31;

	if (f === 0 && Main.DEBUG >= 5)
		return wMon.check();

	if (f === 1) {
		this.debugModeCleanup();
		return;
	}

	if (f === 2)
		return Accounting.checkSendJournal();

	if (f === 3) {

		let baseCenter = Main.area.baseCenter;
		baseCenter && baseCenter.display.checkCloseDoor();
		return;
	}

	if (f === 5)
		return UIPrefs.polygonUnionShow.update();


	//if ((f & 15) === 11)

	if ((f & 15) === 12)
		return UIPrefs.polygonShow.update();

	if ((f & 15) === 13)
		return ProgressWindow.timelyCheckAppear();

	if ((f & 15) === 14)
		return UI.updateTimers();

	//if ((f & 15) === 15)
	if ((f & 3) === 3)
		return UIPrefs.showPolyhedra.update();
}


// ===========================================================================

Engine.render = function() {

	this.frameNum ++;

	var dateStartFrame = Date.now();

	// (?)this.time already set (+ events processed)
	//this.time = this.targetRenderTime;
	
	//console.assert(this.time === this.targetRenderTime); // <-- on load

	this.lastRenderTime = this.time;

	this.updateRealTime();
//console.log(`render ${this.realTime}`);
/*
	var t = this.lastRenderStartRealT - this.realTime;
	if (t < -0.002 && this.frameNum > 100) {
		//console.warn(`lastRenderStartRealT: off by ${Util.toStr(-t)}`);
	}
*/

	this.lastRenderStartRealT = this.getRealTime();


	this.u_time.value = this.time % 2048;

	if (UIPrefs.stats.isOn)
		UIPrefs.stats.statsObj.begin();

	if (Engine.frameNum > 20)
		testFrame();


	Main.getUnits().forEach( unit => {

		unit.updatePositionFacing();
		unit.updateDisplayPosition(); // +animation
	});

	('ChainTestDisplay' in window) && ChainTestDisplay.runAnimation();

	//
	//   Move Camera
	//
	Display.cameraView.update();


	//
	//   Camera Position Updated
	//
	Cursor.update();


	var startTime = Date.now();

	Display.cameraView.createSceneList();

	var diffTime = Date.now() - startTime;

	if (diffTime > 30 && Engine.frameNum > 3)
		console.log(`createSceneList: ${diffTime}`);


	if (UIPrefs.csm.isOn)
		UIPrefs.csm.adapter.update();

	if (this.frameNum > 2)
		this.raycast();

	Main.area.wind && Main.area.wind.update(this.time);


	Display.runRender();


	if (UIPrefs.stats.isOn)
		UIPrefs.stats.statsObj.end();

	// ================================
	//
	//   *** Rendering complete ***
	//
	// ================================

	if (this.frameNum <= 3) {

		if (this.frameNum === 1) {

			LoadingScreen.updateProgressStage2(90);

			if (Main.DEBUG >= 3)
				console.warn(`frame 1: ${Date.now()-dateStartFrame} ms`);


		} else if (this.frameNum === 2) {

			LoadingScreen.updateProgressStage2(95);

			MiniMap.updateStatic(true);

			UIPrefs.showGrid.update();

			UI.Lang.checkOpenCanvasSelector();

			Tooltip.setup();

			if (Main.DEBUG >= 3)
				console.warn(`frame 2: ${Date.now()-dateStartFrame} ms`);


		} else {

			LoadingScreen.removeBg();

			ProgressWindow.timelyCheckAppear();

			window.focus(); // VK: works

			UI.update(); // chainTest

			this.onAfterStart && this.onAfterStart();
		}
	}


	setTimeout(Engine.runUpdateStart, 0);
}

// ===========================================================================



Engine.raycast = function() {

	mouseRaycaster.raycastFromCamera();

	if (0) { // use OutlinePass
		if (!mouseRaycaster.item && Display.outlinePass.selectedObjects.length !== 0) {
			Display.outlinePass.selectedObjects.length = 0;

		} else if (mouseRaycaster.item && mouseRaycaster.itemChanged) {
			Display.outlinePass.selectedObjects[0] = mouseRaycaster.item.display.mesh;
		}

	} else {
/*
		if ( UI.hasOpen('ConstructionStartInfo') ) { // highlight only construction item

			if (mouseRaycaster.itemChanged) {

				if (Main.highlightItem)
					Main.highlightItem.removeHighlight();

				if (mouseRaycaster.item && mouseRaycaster.item === ScreenConstructionStartInfo.item)
					mouseRaycaster.item.addHighlight();
			}

			return;
		}
*/
		if (mouseRaycaster.itemChanged && Main.highlightItem) {
			Main.highlightItem.removeHighlight();
		}

		if (mouseRaycaster.item && mouseRaycaster.itemChanged) {
			mouseRaycaster.item.addHighlight();
		}
	}

}



Engine.debugModeCleanup = function() {

	if (Main.DEBUG < 5)
		return;

	if (!window['AI'] || AI.isStopped())
		return;

	var cleanup = (obj, deleteFn = () => true) => {

		var array = Object.values(obj);

		for (let i = array.length - 1; i >= 0; i--) {

			let item = array[i];

			if (deleteFn(item))
				delete obj[ item.id ];
		}
	};


	var maxT = Engine.time - Engine.timeMultiplier * 5; // able to respond interactively


	cleanup( Expansion.byId, ex => ex.node.g < maxT );

	cleanup( DynamicExpansion.byId, ex => ex.node.g < maxT );

	cleanup( Track.byId, track => track.t2 < maxT );

	cleanup( TrackSolver.byId, tS => tS.t0 < maxT );

	cleanup( Episode.byId, e => e.startNode.g < maxT );

	cleanup( ASDynamic.byId, aSDynamic => aSDynamic.t0 < maxT );

	//cleanup( AngularSweep.byId, a => 
}



// ====================================================================

Engine.testN = null;
Engine.matrices = null;
Engine.array = null;



function testFrame() {


if (0) {

	if (!Engine.testN) {

		Engine.testN = 256 * 100;
		Engine.matrices = new Array(Engine.testN).fill(null).map(el => new THREE.Matrix4)
		Engine.array = new Float32Array(Engine.testN * 16);
	}


	for (let i = 0; i < 1; i++)

		for (let j = 0; j < Engine.testN; j++)

			Engine.matrices[j].toArray( Engine.array, j * 16 );
}



	if (0) {

		if (!this.vC)
			this.vC = new VisibilityCircle;

		var cM = Display.cameraView.cameraMove;

		if (cM.view.followItem) {

			for (let i = 0; i < 20; i++)
				this.vC.set(cM.refPt, cM.view.followItem, cM.view.zoomSetting.d, cM.endHeight,
						cM.view.followItem.getHeight() ).computeCI();
		}
	}

}



Object.assign( Engine, {

	startFrame1() {

		Main.area.surface.createSurfaceMeshes(); // after all slots & items (for holes)

		Cursor.Animation.start();

		// area init'd; html size not required; updates on resize(); for the 1st time updateStatic(true)
		MiniMap.init(Main.area);

		UI.processResizeEvent();

		Controls.init();

		setTimeout( () => Engine.start(), 0);
	},


	DEBUG_WARMUP: 0,

	runWarmUpFrame(items) {

		var d = Date.now();

		items.forEach(item => {

			item.position.copy( Display.cameraView.getPositionInFront() );
			item.updateDisplayPosition();
		});

		Display.cameraView.createSceneList();

		if (UIPrefs.csm.isOn)
			UIPrefs.csm.adapter.update();

		Display.runRender();

		items.forEach(item => item.removeItem());

		if (this.DEBUG_WARMUP) {

			let matNames = new Set;

			scene.traverse( c => c.material && c.material.name && matNames.add(c.material.name) );

			console.log(`warmUp ${(Date.now()-d)} ms shaders=${Display.renderer.info.programs.length}`,
				 [ ...matNames ] );
		}
	},


	_warmUp_Tree_Char_callbackFn: null,

	startWarmUp_Tree_Char( callbackFn ) {

		this._warmUp_Tree_Char_callbackFn = callbackFn;
		Display.resize(new Point(256, 256));

		this.runWarmUpFrame([]);
		LoadingScreen.updateProgressStage2(20);

		setTimeout( () => this.warmUp_Tree_Char_2(), 5 );
	},


	warmUp_Tree_Char_2( callbackFn ) {

		var d = Date.now();

		for (let [ k, v] of Object.entries(BranchSpec.byTreeName.aspen) )
			v.getSplitGeometryData();

		ItemSpec.getAll().filter(iS => iS.tree).forEach( iS => iS.getPolyhedronBase() );

		if (this.DEBUG_WARMUP)
			console.log(`warmUp ${(Date.now()-d)} ms`);

		LoadingScreen.updateProgressStage2(30);

		setTimeout( () => this.warmUp_Tree_Char_3(), 5 );
	},


	warmUp_Tree_Char_3( callbackFn ) {

		this.runWarmUpFrame([ Item.createOn3D("aspen1h4") ]);
		LoadingScreen.updateProgressStage2(50);

		setTimeout( () => this.warmUp_Tree_Char_4(), 5 );
	},


	warmUp_Tree_Char_4( callbackFn ) {

		var tmpChar = Item.createOn3D("char");

		tmpChar.addHighlight();
		tmpChar.addSelection();

		this.runWarmUpFrame([ tmpChar ]);
		LoadingScreen.updateProgressStage2(70);

		setTimeout( () => this._warmUp_Tree_Char_callbackFn(), 5 );
	},

});


