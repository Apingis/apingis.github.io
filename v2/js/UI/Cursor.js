
var Cursor = {};


Cursor.State = function() {

	this.active = false; // =clickable
	this.cursorName = "";
	this.addUp = "";
	this.blockingEntities = [];
}


Object.assign(Cursor.State.prototype, {

	clear() {
		this.active = false;
		this.cursorName = "";
		this.addUp = "";
		this.blockingEntities.length = 0;
	},

	is3D() {
		return this.cursorName == "arrow-green" || this.cursorName == "arrow-red"
			|| this.cursorName.startsWith("3d-");
	},

	equals(state) {
		return 1
			&& this.active === state.active
			&& this.cursorName === state.cursorName
			&& this.addUp === state.addUp
	},

	copy(state) {
		this.active = state.active;
		this.cursorName = state.cursorName;
		this.addUp = state.addUp;
		this.blockingEntities = state.blockingEntities;
	},
});



Object.assign(Cursor, {

	currentState: new Cursor.State,
	nextState: new Cursor.State,
	blockingEntities: new Map,

	isActive() { return this.currentState.active }, // =clickable

	getName() { return this.currentState.cursorName },


	getMaxDistance() { return Display.maxDistance * 0.8; },

	is3D(type) {
		console.assert(type);
		return type == 'move';
	},

	resize() {
		this.resize2D();
		this.Cursor3D.resize();
	},


	update() {

		//  I. determine next cursor

		this.setNextCursorState();

		var cursorName = this.nextState.cursorName;

		// II.

		var sameCursor = this.currentState.equals(this.nextState);

		if (!sameCursor) {

			this.turnOff();
			this.Cursor3D.turnOff();

			this.currentState.copy(this.nextState);

			if (!cursorName)
				return;

			this.nextState.is3D() ? this.Cursor3D.turnOn(cursorName) : this.turnOn(this.currentState);
		}

		// III. Update

		if (cursorName) {

			this.currentState.is3D() ? this.Cursor3D.update(cursorName) : this.update2D(this.currentState);
		}

		this.setupBlockingEntities(this.nextState);
	},



	setNextCursorState(state = this.nextState) {

		state.clear();

		if (!Controls.mouseIn)
			return;


		if ( UI.hasOpen('ConstructionStartInfo') )
			return;


		var	item = mouseRaycaster.item,
			surfacePt = mouseRaycaster.surfacePoint,
			intersectedSurface = mouseRaycaster.intersectedSurface;


		var unit = Main.selectedItem;
		var unitTaskIconName = UI.getUnitTaskIconName();
/*
		if ( !unit || !unit.isUnit() ) { //|| !unitTaskIconName ) {

			if ( item && item.canBeSelected() ) {

				state.active = true;
				state.cursorName = 'cursor-select-green';
			}

			return;
		}
*/
		if ( !unitTaskIconName && item && item.canBeSelected() ) {

			state.active = true;
			state.cursorName = 'cursor-select-green';
			return;
		}



		var checkSurfaceDistance = () => intersectedSurface
			&& surfacePt.distanceTo(Display.cameraView.position) < this.getMaxDistance();

		var getBlockingEntities = () => {

			state.blockingEntities = Main.area.spatialIndex.unitFitGetBlockingEntities(unit, surfacePt);
			return state.blockingEntities.isBlocked;
		};


		if (unit && unit.isRobot() && ScreenRobotInfo.setFlagPressed) {

			if (intersectedSurface && !getBlockingEntities() ) {

				let d = Main.area.containerPlacements.minDistanceTo(surfacePt);

				if (d < 2 * Robot.D_AROUND_FLAG_POINT) {

					state.cursorName = 'cursor-cancel';
					state.addUp = Lang('cursor_min_distance_to_cP', 2 * Robot.D_AROUND_FLAG_POINT);

				} else {
					state.active = true;
					state.cursorName = '3d-robot-flag';
				}

			} else {
				state.cursorName = 'cursor-cancel';
				state.addUp = Lang('cursor_unreachable_for_robot');
			}

			return;
		}


		if (unitTaskIconName == 'arrow-tl') {

			if ( item && item.canBeSelected() ) {

				state.active = true;
				state.cursorName = 'cursor-select-green';
				return;
			}

			if ( unit.isRobot() ) {

				if ( item && item.robotCanLoad() && !unit.isRobotLoaded() ) {

					state.active = true;
					state.cursorName = 'cursor-load-green';
					return;
				}
			}

			if ( unit.isChar() ) {

				if ( item && unit.isCarrying() ) {

					if (item.hasLogStorage()) {

						state.active = true;
						state.cursorName = 'cursor-piledrop-green';
					} else
						state.cursorName = 'cursor-drop-red';

					return;
				}

				if ( item && !unit.isCarrying() ) {

					if (item.isAxeTarget()) {

						if ( !unit.getEquipAxe() ) {

							state.cursorName = 'cursor-grab-red';
							state.addUp = Lang('cursor_no_axe');

						} else {
							state.active = true;
							state.cursorName = 'cursor-axe-green';

							if (item.isSmallTree())
								state.addUp = Lang('cursor_too_small');
						}

					} else if (item.canGrab()) {// || item.isBaseCenter()) {

						state.active = true;
						state.cursorName = 'cursor-grab-green';

					} else
						state.cursorName = 'cursor-grab-red';

					return;
				}
			} // unit.isChar()

			if (!checkSurfaceDistance()) {

			} else if (!getBlockingEntities()) {

				state.active = true;
				state.cursorName = 'arrow-green';

			} else
				state.cursorName = 'arrow-red';

			return;
		}

/*
		if (unitTaskIconName == 'move') {

			if (!checkSurfaceDistance()) {

			} else if (!getBlockingEntities()) {

				state.active = true;
				state.cursorName = 'arrow-green';

			} else
				state.cursorName = 'arrow-red';


		} else if (unitTaskIconName == 'grab') {

			if (!item) {
				state.cursorName = 'cursor-grab-yellow';

			} else if (item.canGrab() || item.isBaseCenter()) {

				state.active = true;
				state.cursorName = 'cursor-grab-green';

			} else
				state.cursorName = 'cursor-grab-red';


		} else if (unitTaskIconName == 'axe') {

			if (!item) {
				state.cursorName = 'cursor-axe-yellow';

			} else if (item.isAxeTarget()) {

				state.active = true;
				state.cursorName = 'cursor-axe-green';

				if (!unit.getEquipAxe())
					state.addUp = Lang('cursor_no_axe');

				else if (item.isSmallTree())
					state.addUp = Lang('cursor_too_small');

			} else
				state.cursorName = 'cursor-cancel';


		} else if (unitTaskIconName == 'drop') {
*/
		if (unitTaskIconName == 'drop') {

			if (!item) {

				if (!checkSurfaceDistance()) {

				} else if (!getBlockingEntities()) {

					state.active = true;
					state.cursorName = 'cursor-drop-green';

				} else
					state.cursorName = 'cursor-drop-red';

			} else if (item.hasLogStorage()) {

				state.active = true;
				state.cursorName = 'cursor-piledrop-green';

			} else if ( item.canBeSelected() ) {

				state.active = true;
				state.cursorName = 'cursor-select-green';

			} else
				state.cursorName = 'cursor-drop-red';

		}


		if (unitTaskIconName == 'unload') {

			if (!item) {

				if (!checkSurfaceDistance()) {

				} else if (!getBlockingEntities()) {

					state.active = true;
					state.cursorName = 'cursor-unload-green';

				} else
					state.cursorName = 'cursor-unload-red';

			} else if ( item.hasContainerPlacements() ) {

				if ( item.getContainerPlacements().some(cP => cP.isAvailableForUnload()) ) {

					state.active = true;
					state.cursorName = 'cursor-unload-to-storage-green';

				} else {
					state.cursorName = 'cursor-unload-to-storage-red';
					state.addUp = Lang('cursor_unload-to-storage-red');
				}

			} else if ( item.canBeSelected() ) {

				state.active = true;
				state.cursorName = 'cursor-select-green';

			} else
				state.cursorName = 'cursor-unload-red';

		}

	},


	setupBlockingEntities(nextState) {

		// 1. Remove entities not in use
		this.blockingEntities.forEach((mesh, entity, map) => {

			if (nextState.blockingEntities.indexOf(entity) !== -1)
				return;

			scene.remove(mesh);

/* not clear; no big issue
			if (!entity.id) { // not reusable/cacheable
				//console.error(`w/o id`);
				mesh.geometry.dispose();
			}
*/

			map.delete(entity);
		});

		//	if (entity == "areaBorder" || (entity instanceof Polygon)
		//			|| (entity instanceof Track) ) {

		if (!nextState.cursorName)
			return;

		nextState.blockingEntities.forEach(entity => {

			if (this.blockingEntities.has(entity))
				return;

			var mesh;

			if (entity == "areaBorder") {

				let radiusClass = Main.selectedItem && Main.selectedItem.radiusClass || 0;

				mesh = Main.area.surface.getAreaBorderBlockingMesh(radiusClass);
				mesh.renderOrder = -200;


			} else if (entity instanceof Track) {

				let track = entity;

				let sector = new Sector;
				sector.radius = track.unit.getRadius() + Main.selectedItem.getRadius();

				mesh = new THREE.Mesh(
					HelperGeometry.getSector(sector),
					Assets.materials.flatPolygonYellow
				);

				mesh.position.set(track.p1.x, 2e-4, track.p1.y);

				mesh.name = `Track Area by ${track.unit}`;
				mesh.renderOrder = -300; // 1st for render


			} else if (entity instanceof Polygon) {

				mesh = new THREE.Mesh(
					HelperGeometry.getFlatPolygon(entity, entity.id + '-' + Main.selectedItem.radiusClass),
					Assets.materials.flatPolygon
				);

				mesh.name = "Blocking Area id=" + entity.id;
				//mesh.position.setY(4e-4); // depthWrite
				mesh.renderOrder = -200;

			} else
				return Report.warn("unknown entity type");

			scene.add(mesh);

			this.blockingEntities.set(entity, mesh);
		});
	},


	el: null,
	_addUpEl: document.getElementById('cursor-addup'),
	_addUpTextEl: document.querySelector('#cursor-addup > div'),
	_elemSize: 0,


	resize2D() {

		this._elemSize = Math.max(36, Math.floor(0.075 * window.innerHeight));
		this._elemSize = Math.min(62, this._elemSize);

		Array.from( document.querySelectorAll('.cursor-div') ).forEach(el => {

			if (el.id.startsWith('cursor-unload-to-storage-'))
				el.style.width = Math.floor(1.5 * this._elemSize) + "px";
			else
				el.style.width = this._elemSize + "px";

			el.style.height = this._elemSize + "px";
		});
	},


	turnOn(state) {

		console.assert(!this.el && state.cursorName);

		var el = document.getElementById(state.cursorName);
		if (!el)
			return Report.warn("no element", `id=${iconName}`);

		this.setVisibility(el, true);
		this.el = el;

		if (state.addUp) {

			this._addUpTextEl.textContent = state.addUp;
			this.setVisibility(this._addUpEl, true);
		}
	},


	turnOff() {

		if (!this.el)
			return;

		this.setVisibility(this.el, false);
		this.setVisibility(this._addUpEl, false);
		this.el = null;
	},


	setVisibility(el, ifVisible) {
		el.style.display = ifVisible ? "block" : "";
	},

	update2D(state) {
		this.updatePosition(this.el, state);
	},


	updatePosition(el, state) {

		var mousePos = Controls.mouseCurrPos;

		var	offX = 0, offY = 0;

		var size = this._elemSize;
		var checkInWindow;

		if ( state.cursorName.startsWith('cursor-unload-to-storage-') ) {

			offX = size * 0.75;
			offY = size * 1.04;
			checkInWindow = 1;

		} else if ( state.cursorName.startsWith('cursor-drop-')
			|| state.cursorName.startsWith('cursor-unload-') ) {

			offX = size * 0.185;
			offY = size * 1.03;
			checkInWindow = 2;

		} else if (state.cursorName.startsWith('cursor-select-')) {

			offX = size * 0.5;
			offY = size * 0.5;

		} else {
			offX = size * -0.22;
			offY = size * 0.4;
			checkInWindow = 1;
		}


		var	elLeft = Math.floor(mousePos.x - offX),
			elTop = Math.floor(mousePos.y - offY);

		if (checkInWindow === 1) {

			elLeft = Util.clamp(elLeft, 0, window.innerWidth - size); // wide cursor mb.TODO
			elTop = Util.clamp(elTop, 0, window.innerHeight - size);

		} else if (checkInWindow === 2) {

			if (elLeft > window.innerWidth / 2) {

				elLeft -= size - 2 * offX;
				el.style.transform = 'scale(-1, 1)';

			} else
				el.style.transform = '';
		}


		el.style.left = elLeft + "px";
		el.style.top = elTop + "px";

		if (state.addUp) {

			if (elLeft > 0.6 * window.innerWidth) {

				this._addUpEl.style.left = '';
				this._addUpEl.style.right = window.innerWidth - elLeft + 'px';

			} else {
				this._addUpEl.style.left = elLeft + "px";
				this._addUpEl.style.right = '';
			}

			if (elTop > 70) {

				this._addUpEl.style.top = '';
				this._addUpEl.style.bottom = window.innerHeight + 5 - elTop + "px";

			} else {
				this._addUpEl.style.top = elTop + size + 5 + 'px';
				this._addUpEl.style.bottom = '';
			}
		}
	},

});



Cursor.Cursor3D = {

	mesh: null,
	baseScale: 1.00,


	resize() {

		var baseScale = Math.min(
			Math.max(800, window.innerWidth),
			Math.max(400, window.innerHeight) * 2
		) / 800;

		this.baseScale = 1 / Math.pow(baseScale, 0.6);
	},


	turnOn(cursorName) {
		//Display.canvas.style.cursor = "none";
		this.mesh = this.getMeshByName(cursorName);
		scene.add(this.mesh);
	},


	turnOff() {
		//Display.canvas.style.cursor = "auto";

		if (this.mesh) {
			scene.remove(this.mesh);
			this.mesh = null;
		}
	},


	update(cursorName) {

		var surfacePt = mouseRaycaster.surfacePoint;

		if (cursorName == '3d-robot-flag') {

			this.mesh.position.copy( surfacePt );
			return;
		}

		var distance = surfacePt.distanceTo(Display.cameraView.position);

		this.setupArrowCursor(this.mesh, surfacePt, distance);
	},


	setupArrowCursor(mesh, surfacePt, distance) {

		mesh.position.copy(surfacePt);

		var lineItemPt = new Line2().copyFrom2XVector3(Main.selectedItem.position, surfacePt);

		var	alpha = lineItemPt.angle(),
			theta = Display.cameraView.theta;

		// < 0: directed from left to right from camera's point of view
		var angleDiff = Angle.sub(theta, alpha);

		var cursorScale = Math.pow(distance, 0.67) / 30 * this.baseScale;

		var elevation = Display.cameraView.position.y / distance;
		var elevationMinOnGround = 0.3;

		if (elevation > elevationMinOnGround) {

			//mesh.children[0].visible = false;

			mesh.rotation.set(0, -alpha + Math.PI / 2, 0);
			cursorScale *= 1.2;

		} else {

			//mesh.children[0].visible = true;

			var rotationY = 1.1 - elevation * (0.6 / elevationMinOnGround);

			if (angleDiff < 0)
				rotationY = Math.PI - rotationY;

			mesh.rotation.set(-Math.PI / 2, rotationY, -Math.PI / 2, "ZXY");
			mesh.rotateOnWorldAxis(	Item.axisY, -theta + Math.PI / 2);
			mesh.position.y = 0.1 * cursorScale;
		}

		mesh.scale.set(cursorScale, 1, cursorScale);
	},


	getMeshByName(cursorName) {

		switch (cursorName) {

			case 'arrow-green':
				return this.getArrowGreen();

			case 'arrow-red':
				return this.getArrowRed();

			case '3d-robot-flag':
				return this.getRobotFlag();

			default:
				return Report.warn("bad name", `cursorName=${cursorName}`);
		};
	},


	_arrowGeometry: (() => {

		var g = new THREE.PlaneBufferGeometry(2.4, 8);
		delete g.attributes.normal;

		g.applyMatrix4( (() => {
			var m = new THREE.Object3D;
			m.rotation.x = -Math.PI / 2;
			m.position.set(0, 0.01, -3.9);
			m.updateMatrixWorld(true);
			return m.matrixWorld;
		})() );

		return g;
	})(),


	_createArrowMesh(matName) {

		var m = new THREE.Mesh(this._arrowGeometry, Assets.materials[matName]);
		m.material.color = Cursor.Animation.colorArrow;
		m.name = matName;
		//m.renderOrder = -1e6; // doesn't help; mb.TODO(v2+) polygonal 3D arrow

		m.add(new THREE.Mesh(this._arrowGeometry, Assets.materials[matName + "_2"]));
		m.children[0].material.color = Cursor.Animation.colorArrow;

		return m;
	},


	//arrowGreen: (() => { // Assets/materials not loaded yet!

	// no, same-object-prop-referenced
	//arrowGreen: (() => this.createArrowMesh("cursorArrowGreen"))(),

	_arrowGreen: null,
	_arrowRed: null,
	_robotFlag: null,

	getArrowGreen() {
		return this._arrowGreen
			|| (this._arrowGreen = this._createArrowMesh("cursorArrowGreen"));
	},

	getArrowRed() {
		return this._arrowRed
			|| (this._arrowRed = this._createArrowMesh("cursorArrowRed"));
	},


	getRobotFlag() {

		if (!this._robotFlag) {

			this._robotFlag = new THREE.Mesh( HelperGeometry.getRobotFlag(),
				Assets.materials.line.cursorRobotFlag );

			this._robotFlag.material.color = Cursor.Animation.colorArrow;
			this._robotFlag.name = 'Cursor RobotFlag';
		}

		return this._robotFlag;
	},

}



Cursor.Animation = {

	colorArrow: new THREE.Color(1, 1, 1),
	_isRunning: false,


	start() {

		if (this._isRunning)
			return;

		this._isRunning = true;

		new TWEEN.Tween(this.colorArrow)
			.to({ r: 0.6, g: 0.6, b: 0.6 }, 400)
			.easing(TWEEN.Easing.Quadratic.Out)
			.yoyo(true).repeat(Infinity).start();

		new TWEEN.Tween( Assets.materials.flatPolygon )
			.to({ opacity: 0.4 }, 600)
			.easing(TWEEN.Easing.Quadratic.Out)
			.yoyo(true).repeat(Infinity).start();

		new TWEEN.Tween( Assets.materials.flatPolygonYellow )
			.to({ opacity: 0.3 }, 600)
			.easing(TWEEN.Easing.Quadratic.Out)
			.yoyo(true).repeat(Infinity).start();
	},

}



export { Cursor };

