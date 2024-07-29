
import { Point } from './Math/Point.js';


var Controls = (function() {

	var cameraKeyboardMove = {

		direction: "",
		ifPressed: false,
		shiftKey: false,
		ctrlKey: false,
		//changedTime: 0,
		updatedTime: -1,
		readTime: 0,

		result: {
			amount: 0,
			direction: ""
		},


		press(name, event) {

			if (name == 'shift') {

				this.shiftKey = true;
				return;

			} else if (name == 'ctrl') {

				this.ctrlKey = true;
				return;
			}

			this.direction = name;

			if (this.ifPressed)
				return;

			this.ifPressed = true;
			//this.shiftKey = event && event.shiftKey;
			//this.ctrlKey = event && event.ctrlKey;
			//this.changedTime = Date.now();
			this.updatedTime = Date.now();
		},


		release(name) {

			if (name == 'shift') {

				this.shiftKey = false;
				return;

			} else if (name == 'ctrl') {

				this.ctrlKey = false;
				return;
			}

			if (!this.ifPressed)
				return;

			this.ifPressed = false;
			//this.shiftKey = false;
			//this.ctrlKey = false;
			//this.changedTime = Date.now();
			this.updatedTime = Date.now();
		},

/*
		get() {

			if (!this.ifPressed && this.changedTime < this.updatedTime) {
				this.result.amount = 0;
				return this.result;
			}

			this.result.direction = this.direction;

			var currentTime = Date.now();
			var amount;

			if (!this.ifPressed)
				amount = this.changedTime - this.updatedTime;
			else
				amount = currentTime - Math.max(this.changedTime, this.updatedTime);

			this.result.amount = amount < 0 ? 0 : amount;

			this.updatedTime = currentTime;
			return this.result;			
		},
*/
		get() {

			if (!this.ifPressed && this.updatedTime <= this.readTime) {

				this.result.amount = 0;
				return this.result;
			}

			this.result.direction = this.direction;

			var currentTime = Date.now();
			var amount;

			if (!this.ifPressed)
				amount = this.updatedTime - this.readTime;
			else
				amount = currentTime - Math.max(this.readTime, this.updatedTime);

			//if (this.shiftKey)
			//	amount *= 2;
//console.log(`get amount=${amount} shiftKey=${this.shiftKey}`);

			this.result.amount = Math.max(0, amount);

			//this.shiftKey = false;
			//this.ctrlKey = false;
			this.readTime = currentTime;

			return this.result;			
		},

	};


	function press(name) { this.cameraKeyboardMove.press(name); }

	function release() { this.cameraKeyboardMove.release(); }



	var debug = {
		drawUnitPath: false,
	};
/*
	const mouseButtons = {
		LEFT: THREE.MOUSE.LEFT,
		MIDDLE: THREE.MOUSE.MIDDLE,
		RIGHT: THREE.MOUSE.RIGHT
	};
*/

	var canvas;
	
	var mouseCurrPos = new THREE.Vector2;
	var mouseCurrPosNDC = new THREE.Vector2;
	var mouseIn = 0;
	var mouseDownPos = new THREE.Vector2;
	var mouseDownBtn;

	var isFullscreen;

	var keyPressedD;


	function init() {

		fullscreenInit();

		canvas = document.getElementById('canvas-main');

		canvas.addEventListener('click', onClick, false);
		canvas.addEventListener('dblclick', ondblClick, false);
		canvas.addEventListener('mousedown', onMouseDown, false);
		canvas.addEventListener('mouseup', onMouseUp, false);
		canvas.addEventListener('mousemove', onMouseMove, false);
		//canvas.addEventListener('contextmenu', onContextMenu, false);
		canvas.addEventListener('mouseleave', onMouseLeave, false);
		canvas.addEventListener('wheel', onWheel, false);

		window.addEventListener('keydown', onKeyDown, false);
		window.addEventListener('keyup', onKeyUp, false);

		window.addEventListener('resize', () => UI.processResizeEvent(), false);
	}


	function fullscreenInit() {

		if (document.onfullscreenchange === null)
			document.onfullscreenchange = fullscreenChange;
		else if (document.onwebkitfullscreenchange === null)
			document.onwebkitfullscreenchange = fullscreenChange;
		else if (document.onmozfullscreenchange === null)
			document.onmozfullscreenchange = fullscreenChange;
		else if (document.onMSFullscreenChange === null)
			document.onMSFullscreenChange = fullscreenChange;

		fullscreenChange();
	}


	function fullscreenChange() {

		var iconEnter = document.getElementById('icon-fullscreen'),
			iconLeave = document.getElementById('icon-fullscreen-leave');

		if (!iconEnter || !iconLeave)
			return console.error("no fullscreen icon elems.");

		if (document.fullscreenElement || document.webkitFullscreenElement
				|| document.mozFullScreenElement || document.msFullscreenElement) {

			isFullscreen = true;
			iconEnter.style.display = "none";
			iconLeave.style.display = "block";

		} else if (document.fullscreenEnabled || document.webkitFullscreenEnabled
				|| document.mozFullScreenEnabled || document.msFullscreenEnabled) {

			isFullscreen = false;
			iconEnter.style.display = "block";
			iconLeave.style.display = "none";
		}
	}


	function fullscreenEnter() {

		var appContainer = document.getElementById('app-container');

		if (document.fullscreenEnabled)
			appContainer.requestFullscreen();
		else if (document.webkitFullscreenEnabled)
			appContainer.webkitRequestFullscreen();
		else if (document.mozFullScreenEnabled)
			appContainer.mozRequestFullScreen();
		else if (document.msFullscreenEnabled)
			appContainer.msRequestFullscreen();
	}


	function fullscreenLeave() {

		if (document.exitFullscreen)
			document.exitFullscreen();
		else if (document.webkitExitFullscreen)
			document.webkitExitFullscreen();
		else if (document.mozCancelFullScreen)
			document.mozCancelFullScreen();
		else if (document.msExitFullscreen)
			document.msExitFullscreen();
	}


	// =======================================================================

/*
	var clickData = {
		frameNum: -1,
		clickNDC: new THREE.Vector2,
	};
*/

	function onClick(event) {

		//if (cameraDrag.isActive) // this is after onmouseup
		//	return;
/*
		clickData.frameNum = Engine.frameNum;
		clickData.clickNDC.copy( mouseCurrPosNDC );
*/
//console.log(`click Main.selectedItem=${Main.selectedItem} mouseRaycaster.item=${mouseRaycaster.item} Controls.mouseIn=${Controls.mouseIn}`);

		// ! mouseIn=0 until moved

		if ( UI.hasOpen('ConstructionStartInfo') ) {

			ScreenConstructionStartInfo.onClickGround(event);
			return;
		}

		if (ElementHelper.ItemFollowsPointer.item)
			return;


		var unit = Main.selectedItem;

		// Main.selectedItemSet() handles repeated

		//if (unit === mouseRaycaster.item)
		//	return;

		if (unit && unit.isUnit()) {

			let iconName = UI.getUnitTaskIconName();
			if (iconName)
				return onClick_UnitTaskIconIsActive(iconName, unit);

			if ( unit.isRobot() && Cursor.isActive() && Cursor.getName() == '3d-robot-flag') {

				let surfacePoint = mouseRaycaster.intersectedSurface && mouseRaycaster.surfacePoint;
				ScreenRobotInfo.clickCursorSetFlag( surfacePoint );
			}
		}


		var item = mouseRaycaster.item;

		if (item && item.canBeSelected()) {
			Main.selectedItemSet(mouseRaycaster.item);
		}

		// Clicked empty space w/ unit icons inacive, irrespective of what's selected

		//if (mouseRaycaster.intersectedSurface)
		//	cameraDrag.start();
	}


	function onClick_UnitTaskIconIsActive(iconName, unit) {

		if (!Cursor.isActive())
			return;

		var item = mouseRaycaster.item;
		var surfacePoint = mouseRaycaster.intersectedSurface && mouseRaycaster.surfacePoint;

		var cursorName = Cursor.getName();


		if (cursorName == 'cursor-select-green') {

			Main.selectedItemSet(mouseRaycaster.item);


		} else if (cursorName == 'arrow-green') {

			if (unit.isRobot())
				unit.taskList.setTask("TaskRobotMoveTo", surfacePoint);
			else
				unit.taskList.setTask("TaskMoveTo", surfacePoint);


		} else if (cursorName == 'cursor-axe-green') {

			unit.taskList.setTask("TaskCutWood", item);

		} else if (cursorName == 'cursor-grab-green') {

			unit.taskList.setTask("TaskGrabItem", item);

		} else if (cursorName == 'cursor-drop-green') {

			unit.taskList.setTask("TaskDropCarrying", surfacePoint);

		} else if (cursorName == 'cursor-piledrop-green') {

			unit.taskList.setTask("TaskDeliverLog");


		} else if (cursorName == 'cursor-load-green') {

			unit.taskList.setTask("TaskRobotLoadItem", item);

		} else if (cursorName == 'cursor-unload-green') {

			unit.taskList.setTask("TaskRobotUnloadItem", item, surfacePoint);
		}
	}


	var _wheelY = 0;

	function onWheel(event) {

		var AMOUNT = 9;

		_wheelY += event.deltaY;

		if (Math.abs(_wheelY) >= AMOUNT) {

			Display.cameraView.zoom(_wheelY < 0);

			_wheelY = 0;
		}

		event.preventDefault();
	}


	function ondblClick(event) {

		cameraDrag.stop();

		var item = mouseRaycaster.item;
		if (!item)
			return;

		if (item.isChar()) {

			ScreenCharInfo.cameraFollow = true;
			ScreenCharInfo.updateCameraFollow();

			Display.cameraView.startFollowing(item);

		} else {//if (item.canBeSelected()) {

			Display.cameraView.startMoveToItem(item);
		}
	}


	function onMouseDown(event) {

		canvas.focus ? canvas.focus() : window.focus();

		//mouseDownBtn = event.button;

		cameraDrag.start();

		event.preventDefault();
	}


	function onMouseUp(event) {

		cameraDrag.stop();

		event.preventDefault();
	}


	function onMouseMove(event) {

		mouseIn = 1;
		mouseCurrPos.x = event.clientX;
		mouseCurrPos.y = event.clientY;
		mouseCurrPosNDC.x = (event.clientX / canvas.width) * 2 - 1;
		mouseCurrPosNDC.y = 1 - (event.clientY / canvas.height) * 2;

		// via raycaster & per-frame update
		//if ( UI.hasOpen('ConstructionStartInfo') )
		//	ScreenConstructionStartInfo.onMouseMove(event);

		cameraDrag.update();

		event.preventDefault();
	}


	function onContextMenu(event) {
		event.preventDefault();
	}


	function onMouseLeave(event) {

		mouseIn = 0;

		cameraDrag.stop();

		event.preventDefault();
	}


// =========================================================================

// =========================================================================

	var cameraDrag = {

		isActive: false,
		dragType: "",

		startMousePosNDC: new THREE.Vector2,
		startPt: new THREE.Vector3,
		lastCameraPt: new Point,

		isOnSky: false,
		maxDistance: 0,
		startTheta: 0,

		_deltaNDC: new THREE.Vector2,
		_ray: new THREE.Ray,

		_marker: null,


		getMarker() {

			if (!this._marker) {

				this._marker = new THREE.Mesh( HelperGeometry.getCircle(5e-3),
					Assets.materials.line.cameraDragMarker );

				this._marker.name = "cameraDragMarker";
				this._marker.renderOrder = 1e5 + 150; // (?) surfaceHorizontal
			}

			return this._marker;
		},


		start() {

			this.dragType = "";

			this.startMousePosNDC.copy( mouseCurrPosNDC );
			this.startPt.copy( mouseRaycaster.surfacePoint );
			this.lastCameraPt.copyFromVector3( Display.cameraView.position );

			this._ray.setFromCamera( Display.camera, 0, mouseCurrPosNDC.y );

			if (this._ray.direction.y >= 0) {

				this.isOnSky = true;

			} else {

				//this.maxDistance = Math.min(150, 0.9 * Display.maxDistance);
				this.maxDistance = 0.95 * Display.maxDistance;

				let d = -Display.cameraView.getSettingHeight() / this._ray.direction.y;

				this.isOnSky = d > this.maxDistance;
			}

			this.startTheta = Display.cameraView.theta;

			if (!this.isOnSky)
				this.isActive = true;
		},


		stop() {

			if (this.isActive) {

				this.isActive = false;
				scene.remove( this.getMarker() );
			}
		},


		update() {

			var VERSION = 1;

			if (!this.isActive)
				return;

			console.assert(!this.isOnSky);

			if (this.dragType === "") {

				let delta = this._deltaNDC.subVectors(mouseCurrPosNDC, this.startMousePosNDC);

				let TOLERANCE_SQ = 0.01 **2;

				if ( delta.lengthSq() < TOLERANCE_SQ )
					return;


				this.dragType = "vertical";

				let mesh = this.getMarker();

				mesh.position.copy( this.startPt );
				scene.add( mesh );

				Display.cameraView.stopFollowing();
			}


			this._ray.setFromCamera( Display.camera, mouseCurrPosNDC.x, mouseCurrPosNDC.y );

			var h = Display.cameraView.getSettingHeight();
			var dir = this._ray.direction;

			var d = dir.y >= 0 ? -this.maxDistance :
				h / dir.y < -this.maxDistance ? -this.maxDistance :
				h / dir.y;


			var targetPos = this.startPt.clone().addScaledVector(dir, d).setY(h);

			var p = Point.fromVector3(targetPos);

			Main.area.rect.clampPoint(p, -1); // 1m


			var obstaclePolygon;

			Main.area.spatialIndex.processSomeDisjointPolygonsUsingShape(p, 0,
					CameraView.CAMERA_RADIUS_CLASS, polygon => {

				if (polygon.height < h)
					return;

				if (polygon.containsPoint(p)) {
					obstaclePolygon = polygon;
					return true;
				}
			});


			if (obstaclePolygon) {

				let segment = new Line2( this.lastCameraPt, p );

				Main.area.spatialIndex.processSomeDisjointPolygonsUsingShape(segment, 0,
						CameraView.CAMERA_RADIUS_CLASS, polygon => {

					if (polygon.height < h)
						return;

					polygon.cutSegmentWithEdges(segment, -0.01);
//console.log(polygon.id, segment.clone());
				}, true);
			}


			targetPos.setX(p.x).setZ(p.y);

			Display.cameraView.position.copy( targetPos );
			this.lastCameraPt.copy(p);
		},

	}



// =========================================================================

	function onKeyDown(event) {

		var update = 0;
		//console.log(event.key, event.location);

		if (keyPressedD) {
			keyPressedD = 0;
			switch (event.key) {
				case "0": debug0(); break;
				case "1": debug1(); break;
				case "2": debug2(); break;
				case "3": debug3(); break;
				case "4": debug4(); break;
				case "5": debug5(); break;
			};
			event.preventDefault();
		}

		switch (event.code) {

		case "Escape":
		case "Backquote":
			UI.pressEsc();
			return;

		case "Tab":
			event.preventDefault();
			Buttons.clickNextUnit();
			return;

		case "Numpad7":
			Buttons.clickHome();
			event.preventDefault();
			return;

		case "ShiftLeft":
		case "ShiftRight":
			cameraKeyboardMove.press('shift');
			return;

		case "CtrlLeft":
		case "CtrlRight":
			cameraKeyboardMove.press('ctrl');
			return;
		};

		if (update) {
			event.preventDefault(); // TODO required?
			return;
		}

//console.log(event);
		switch (event.key) {

		case "ArrowUp":
			cameraKeyboardMove.press('up', event);
			update = 1;
			break;
		case "ArrowDown":
			cameraKeyboardMove.press('down', event);
			update = 1;
			break;
		case "ArrowLeft":
			cameraKeyboardMove.press('left', event);
			update = 1;
			break;
		case "ArrowRight":
			cameraKeyboardMove.press('right', event);
			update = 1;
			break;

		case "Home":
			Buttons.clickHome();
			update = 1;
			return;

		case "+":
		case "=":
			Buttons.clickZoom(true);
			update = 1;
			break;
		case "-":
		case "_":
			Buttons.clickZoom(false);
			update = 1;
			break;

		case "D":
		case "d":
			keyPressedD = 1;
			update = 1;
			break;
		};

		if (update) {
			event.preventDefault();
		}
	}


	function onKeyUp(event) {

		switch (event.code) {

		case "ShiftLeft":
		case "ShiftRight":
			cameraKeyboardMove.release('shift');
			return;

		case "CtrlLeft":
		case "CtrlRight":
			cameraKeyboardMove.release('ctrl');
			return;
		};


		switch (event.key) {

		case "ArrowUp":
			cameraKeyboardMove.release('up', event);
			break;
		case "ArrowDown":
			cameraKeyboardMove.release('down', event);
			break;
		case "ArrowLeft":
			cameraKeyboardMove.release('left', event);
			break;
		case "ArrowRight":
			cameraKeyboardMove.release('right', event);
			break;
		};
	}


	function debug0() {
		Messages.add(`TODO`, Messages.type.debug);
	}


	function debug1() {

		var cV = Display.cameraView;
		var pos = cV.position;

		Messages.add(`camera position x=${pos.x.toFixed(1)} y=${pos.z.toFixed(1)}`
			+ ` h=${pos.y.toFixed(1)} theta=${cV.theta.toFixed(2)} zSN=${cV.zoomSettingNum}`,
			Messages.type.debug);
	}


	function debug2() {

		var pos = mouseRaycaster.surfacePoint;
		var d = Display.cameraView.position.distanceTo(pos).toFixed(0);

		Messages.add(mouseRaycaster.intersectedSurface
			? `cursor x:${pos.x.toFixed(1)} y:${pos.z.toFixed(1)} d=${d}m`
			: `cursor: No intersection with surface`, Messages.type.debug);
	}


	function debug3() {

		var item = Main.highlightItem;
		if (!item) {

			item = Main.selectedItem;
			if (!item) {
				Messages.add(`No highlight/selection`, Messages.type.debug);
				return;
			}
		}

		var msg = `id=${item.id} name=${item.spec.name}`
			+ ` x=${item.position.x.toFixed(1)},y=${item.position.z.toFixed(1)}`;

		msg += ` d=${Display.cameraView.position.distanceTo(item.position).toFixed(0)}m`;

		if (item.cGroupIds)
			msg += ` cGroupIds=${item.cGroupIds}`;

		if (item.slotId)
			msg += ` slotId=${item.slotId}`;

		if (item instanceof Unit)
			msg += ` "${item.aI.getLangOrderShortDescription()}"`;

		Messages.add(msg, Messages.type.debug);
	}


	function debug4() {
/*
		debug.drawUnitPath = !debug.drawUnitPath;
		Messages.add(`Draw path of selected unit: `
			+ (debug.drawUnitPath ? "ON" : "OFF"),
			Messages.type.debug);
*/
	}


	function debug5() {

		var unit = Main.selectedItem;

		if (!(unit instanceof Unit)) {
			Messages.add(`Must be unit`);
			return;
		}

		if (!mouseRaycaster.intersectedSurface) {
			Messages.add(`Raycaster doesn't intersect surface`);
			return;
		}

		unit.setPosition(mouseRaycaster.surfacePoint);
	}

// =========================================================================

	return {

		init, cameraKeyboardMove, press, release,

		debug,

		fullscreenEnter, fullscreenLeave,

		get mouseIn() { return mouseIn },
		mouseCurrPos, mouseCurrPosNDC, //clickData,
		//mouseDownPos, mouseDownBtn,
	};

})();



export { Controls };

