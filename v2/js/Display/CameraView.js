
import { Line2 } from '../Math/Line2.js';
import { Point } from '../Math/Point.js';


var ROTATE_SPEED = 0.0015; // rad/ms
var MOVE_SPEED = 0.018; // in m/ms


class CameraView {

	constructor(camera) {

		console.assert(camera.isCamera);
		this.camera = camera;
		this.position = camera.position;
		this.refPt = new Point;

		this._theta = 0;
		this._phi = 0;
		this._forcePhi = null;
		this.lookAt = new THREE.Vector3;
		//this._line3 = new THREE.Line3;
		this._line3s = [ new THREE.Line3, new THREE.Line3, new THREE.Line3 ];

		this.freeMoveStoppedUntilT = -1;
		this.curPt = new Point;
		this.moveV = new Point;
		this.dRemains = 0;

		this.onEdge = {

			isOnEdge: false,
			lastTime: 0,
			polygon: null,
			dot0: 0,
			i: 0,

			clear() { this.isOnEdge = false; },
		};

		// moving camera: this is the target setting
		this.zoomSettingNum = 0;
		this.zoomSetting = CameraView.zoomSettings[0];

		this.followItem = null;
		this.cameraMove = new CameraMove(this);

		this.sector = new Sector;

		this.cameraShape = new CameraViewShape2D;
	}


	isMoving() { return this.cameraMove.isGoing }

	getSettingHeight() { return this.zoomSetting.y }


	setZoomSetting(n) {
		this.zoomSettingNum = n;
		this.zoomSetting = CameraView.zoomSettings[ n ];
	}


	init(x, y, theta = 0, zoomSettingNum = 0) {

		this.setZoomSetting(zoomSettingNum);

		this.theta = theta;
		this.phi = this.zoomSetting.phi;
		this.position.set(x, this.getSettingHeight(), y);
	}


	getZoomSettingNumByHeight(h) {

		var zSN = CameraView.zoomSettings.findIndex(zS => zS.y >= h);

		return zSN >= 0 ? zSN : CameraView.zoomSettings.length - 1;
	}


	setZoomSettingByHeight(h) { this.setZoomSetting( this.getZoomSettingNumByHeight(h) ); }


	getLocation() {

		return new CameraLocation(this.position.x, this.position.z,
			this.getSettingHeight(), this.theta);
	}


	setLocation(loc) {

		//console.assert(loc instanceof CameraLocation);

		var zSN = this.getZoomSettingNumByHeight(loc.h);

		this.init(loc.x, loc.y, loc.a, zSN);
	}


	get theta() { return this._theta; }

	set theta(value) {

		if (!Number.isFinite(value)) {
			Report.warn("bad value", `${value}`);
			return;
		}

		this._theta = Angle.normalize(value);
		this.updateLookAt();
	}

	rotate(amount) { this.theta += amount; }


	get phi() { return this._phi; }

	set phi(value) {

		if (typeof this._forcePhi == "number")
			value = this._forcePhi;

		if (!Number.isFinite(value)) {
			Report.warn("bad value", `${value}`);
			return;
		}

		this._phi = Angle.normalize(value);
		this.updateLookAt();
	}


	forcePhi(value) {

		if (typeof value == "number") {

			this.phi = value;
			this._forcePhi = value;

		} else
			this._forcePhi = null;

		this.updateLookAt();
	}


	updateLookAt() {

		this.lookAt.set(
			this.position.x + Math.cos(this.theta),
			this.position.y + this.phi,
			this.position.z + Math.sin(this.theta)
		);

		this.camera.lookAt(this.lookAt);
	}


	getFwdVector3() {
		return new THREE.Vector3( Math.cos(this.theta), Math.sin(this.phi), Math.sin(this.theta) )
			.normalize();
	}

	getPositionInFront() {
		return this.getFwdVector3().multiplyScalar( this.zoomSetting.d ).add( this.position );
	}


	temporarilyStopFreeMove(t = 1.0) {

		this.freeMoveStoppedUntilT = Engine.time + t;
		return this;
	}


	update() {

		var clickData = MiniMap.clickData;
		if (clickData.clicked === true) {

			this.stopFollowing();
			this.onEdge.clear();

			this.moveFromMinimap(clickData.p);
			clickData.clicked = false;
			return;
		}

		var ctrlKbd = Controls.cameraKeyboardMove.get(); // keyboard arrow key pressed?
		if (ctrlKbd.amount > 0 && this.freeMoveStoppedUntilT < Engine.time) {

			this.stopFollowing(); // TODO Continue following if rotation?

			this.applyKeyboardControls(ctrlKbd.amount, ctrlKbd.direction);
			return;
		}

		this.onEdge.clear();
		this.updateFollow();
	}


	getReferencePoint() {

		if (this.followItem) {

			let p = this.followItem instanceof Unit
				? this.followItem.getPointAt(Engine.time + CameraMove.DurationTypical)
				: this.followItem.getPoint();

			return this.refPt.copy(p);
		}

		if (this.cameraMove.isGoing) {
			return this.refPt;
		}

		return this.refPt.copy(this.getPoint()).move(this._theta, this.zoomSetting.d);
	}


	startFollowing(item, allowIntervals) {

		this.stopFollowing(false);

		this.followItem = item;
		
		this.cameraMove.startMove(this.getReferencePoint(), "follow", allowIntervals, item);
	}


	updateFollow() {

		if (!this.followItem)
			return;

		if (this.followItem !== Main.selectedItem) { // deselected

			this.stopFollowing();
			return;
		}

		if (this.cameraMove.isGoing)
			return;

		if ((Engine.frameNum & 3) !== 0)
			return;


		var p = this.getReferencePoint();

		var doStartMove = () => this.cameraMove.startMove(p, "follow", null, this.followItem);
/*
		this._line3.start.set(p.x, 1.25, p.y);
		this._line3.end.copy(this.position); // TODO advance a little?
//this._line3.clone().show();
		
		if ( VisibilityCircle.line3VsPolyhedra(this._line3) ) {
*/

		var deltaH = this.cameraMove.vC.deltaH;
		var itemHeight = this.cameraMove.vC.itemHeight;
		var totalLine3s = this._line3s.length;

		this._line3s.forEach( (line3, i) => {

			line3.start.set(p.x, i * (itemHeight / (totalLine3s - 1)), p.y);
			line3.end.copy(this.position)
				.setY( this.position.y - deltaH + i * (2 * deltaH / (totalLine3s - 1)) );
		});
//this._line3s.forEach( line3 => line3.clone().show() );

		if ( VisibilityCircle.multipleLine3VsPolyhedra(this._line3s, this.followItem) ) {

			return doStartMove();
		}

		// additionally check out-of-center.

		var dRatio = p.distanceToVector3(this.position) / this.zoomSetting.d;

		//if (dRatio < 0.79 || dRatio > 1.42)
		if (dRatio < 0.75 || dRatio > 1.5)
			return doStartMove();

		var angleAbsDiff = this.getCameraItemAngleAbsDiff(p);

		if (angleAbsDiff > 0.275 * (this.sector.left - this.sector.right) )
			return doStartMove();
	}


	stopFollowing(removeCameraFollow = true) {

		this.followItem = null;
		this.cameraMove.cancel();

		if (removeCameraFollow === true)
			window['ScreenCharInfo'] && ScreenCharInfo.removeCameraFollow();
	}


	startMoveToItem(item, allowIntervals) {

		this.stopFollowing(false); // every use case considers following+cameraFollow issue

		// does not necesserily follow.
		this.cameraMove.startMove(item.getPoint(), "follow", allowIntervals, item);
	}


	startMoveToPoint(p, allowIntervals, deltaScreenFraction) {

		this.stopFollowing();

		var deltaAngle;

		if (deltaScreenFraction) {

			let	theta = Math.tan( this.camera.fov * (Math.PI / 180 / 2) ),
				centralAngle = 2 * Math.atan(theta * this.camera.aspect);

			deltaAngle = centralAngle * deltaScreenFraction;
		}

		this.cameraMove.startMove(p, "follow", allowIntervals, null, null, deltaAngle);
	}


	restartMove() { this.cameraMove.restartMove() }


	isAtLocation(loc) {

		if (!loc)
			loc = Main.area.homeCameraLocation;

		var delta = 0.01;

		if (this.cameraMove.isGoing)
			return;

		var d = this.position.distance2DTo(loc.x, loc.y);

		if (d < delta && Math.abs(this.getSettingHeight() - loc.h) < delta
				&& Angle.absDiff(this.theta, loc.a) < delta)

			return true;
	}


	moveToLocation(loc) {

		if (!loc)
			loc = Main.area.homeCameraLocation;

		this.stopFollowing();

		if (this.isAtLocation(loc))
			return this.cameraMove.startMoveAttempt();

		this.setZoomSettingByHeight(loc.h);

		this.cameraMove.startMoveToLocation(loc);
	}


	applyKeyboardControls(amount, direction) {

		amount = Math.min(amount, 200); // in ms

		if (direction == "left") {

			this.rotate(amount * -ROTATE_SPEED);

		} else if (direction == "right") {

			this.rotate(amount * ROTATE_SPEED);

		} else {
			this.keyboardMove(amount, direction);
		}
	}


	keyboardMove(amount, direction) {

		amount *= this.zoomSetting.factor || 1.00;

		if (direction == "up") {

			this.movePosition(amount * MOVE_SPEED);

		} else {
			this.movePosition(amount * -MOVE_SPEED);
		}
	}


	movePosition(amount) {

		this.curPt.copyFromVector3(this.position);
		this.moveV.setFromAngleDistance(this.theta, amount > 0 ? 1 : -1);
		this.dRemains = Math.abs(amount);

		for (let i = 0; ; i++) {

			let result;

			if (this.onEdge.isOnEdge && this.onEdge.lastTime > Engine.time - 0.5)

				result = this.moveOnEdge();

			else
				result = this.moveHandlePolygon();

			if (result)
				break;

			if (i === 10) {
				Report.warn("camera move not handled", `a=${amount} d=${this.dRemains} curPt=${this.curPt}`);
				break;
			}
		}

		this.position.set(this.curPt.x, this.getSettingHeight(), this.curPt.y);
	}


	// Return true if the movement is done, this.curPt contains final pos.
	moveHandlePolygon() {

		var segment = this._moveSegment.copyFromPoints(this.curPt, this.curPt);
		segment.p2.addScaled(this.moveV, this.dRemains);

		var intersectData;

		Main.area.spatialIndex.processSomeDisjointPolygonsUsingShape(segment, 0,
				CameraView.CAMERA_RADIUS_CLASS, polygon => {

			if (polygon.height < this.getSettingHeight())
				return;

			intersectData = polygon.getSegmentInwardIntersectData(segment, intersectData);

		}, true);

		if (!intersectData) {
			this.curPt.copy(segment.p2);
			return true;
		}


		var i = intersectData.i; // next vertex in the direction

		this.onEdge.isOnEdge = true;
		this.onEdge.polygon = intersectData.polygon;
		this.onEdge.dot0 = intersectData.polygon.segmentDotEdge(segment, i);
		this.onEdge.i = this.onEdge.dot0 < 0 ? i : intersectData.polygon.nextIndex(i);

		segment.getPointAt(intersectData.t, this.curPt);
		this.dRemains *= (1 - intersectData.t);

		return this.moveOnEdge();
	}


	// Return true if the movement is done, this.curPt contains final pos.
	moveOnEdge() {

		var polygon = this.onEdge.polygon;
		var dot0 = this.onEdge.dot0; // orig. encounter
		var i = this.onEdge.i; // next vertex in the direction

		// Move along obstacle edges. State of the movement is kept between frames.

		// TODO (v2) abs(dot0) < 0.x
		// dot0 < 0 moving against vertex order

		var nextPt = this._nextPt;
		var edgeIndex = dot0 < 0 ? i : polygon.prevIndex(i);

		while (1) {

			polygon.getVertex(i, nextPt);

			let dEdgeRemains = this.curPt.distanceToPoint(nextPt);

			// !TODO! Can move along areaPolygon edges through obstacles

			if ( !Main.area.spatialIndex.areaContains(nextPt.x, nextPt.y,
					CameraView.CAMERA_RADIUS_CLASS) ) {

				let areaPolygon = Main.area.spatialIndex.getPolygon(CameraView.CAMERA_RADIUS_CLASS);
				let segment = new Line2(this.curPt, nextPt);

				let	minParameter = areaPolygon.intersectLine2(segment, true);

				if ( !Number.isFinite(minParameter) ) {
					Report.once("!areaContains Polygon.intersectLine2 fails");
					minParameter = 0;
				}

				// stop before area polygon edge.

				dEdgeRemains = Math.max(0, minParameter * dEdgeRemains - 0.05);

				this.dRemains = Math.min(this.dRemains,
					dEdgeRemains / CameraView.MOVE_ON_EDGE_FACTOR);
			}


			if (this.dRemains <= dEdgeRemains / CameraView.MOVE_ON_EDGE_FACTOR)
				return this.moveOnEdgeDone(polygon, i, edgeIndex, nextPt);

			// Proceed w/ the next edge, vertex.

			this.dRemains -= dEdgeRemains / CameraView.MOVE_ON_EDGE_FACTOR;
			this.curPt.copy(nextPt);

			i = dot0 < 0 ? polygon.prevIndex(i) : polygon.nextIndex(i); // Next vertex

			let edgeV = polygon.getEdgeV(edgeIndex, this._edgeV);

			let nextEdgeIndex = dot0 < 0 ? i : polygon.prevIndex(i);
			let nextEdgeV = polygon.getEdgeV(nextEdgeIndex, this._nextEdgeV);


			let isAwayFromEdge = this.moveV.perpProduct(nextEdgeV) < 0
				&& edgeV.perpProduct(nextEdgeV) * dot0 < 0;

			if (isAwayFromEdge) {

				this.onEdge.isOnEdge = false;
				polygon.repulsePoint(nextEdgeIndex, this.curPt); // Inward intersection possible.
				return;
			}


			// TODO (v2) backwards
			//if (this.moveV.dot(nextEdgeV) * dot0 < 0)
			//	console.warn(`backwards i=${i}`);


			// Continue movement along the next edge.
			edgeIndex = nextEdgeIndex;
		}
	}


	moveOnEdgeDone(polygon, i, edgeIndex, nextPt) {

		this.curPt.moveTowardsPoint(nextPt, this.dRemains * CameraView.MOVE_ON_EDGE_FACTOR);
		this.dRemains = 0;

		// The resulting point is on or near the edge at either side.
		var distanceToEdge = polygon.getEdge(edgeIndex).distanceSignedTo(this.curPt.x, this.curPt.y);

		if (distanceToEdge > -1e-9)
			polygon.repulsePoint(edgeIndex, this.curPt);

		if (  0  && Main.DEBUG >= 3 && polygon.containsPoint(this.curPt)) { // <-- wrong for area enclosing polygon
			Report.warn("camera moved into polygon", `id=${polygon.id} i=${i}`);
		}

		this.onEdge.lastTime = Engine.time;
		this.onEdge.i = i;

		return true;
	}


	moveFromMinimap(p) {

		Main.area.rect.clampPoint(p, -1); // 1m

		Main.area.spatialIndex.processSomeDisjointPolygonsUsingShape(p, 0,
				CameraView.CAMERA_RADIUS_CLASS, polygon => {

			if (polygon.height < this.getSettingHeight())
				return;

			if (polygon.containsPoint(p)) {
				polygon.teleportPoint(p);
				return true;
			}
		});

		//if (!Main.area.rect.containsPoint(p)) // above is .clampPoint()
		//	return;

		this.position.set(p.x, this.getSettingHeight(), p.y);
	}


	zoom(ifZoomPlus) {

		var p = this.getReferencePoint();

		var n = this.zoomSettingNum + (ifZoomPlus ? -1 : 1);
		var nClamped = Util.clamp(n, 0, CameraView.zoomSettings.length - 1);

		if (n === nClamped) {

			this.setZoomSetting(nClamped);

			this.cameraMove.startMove(p, "zoom", null, null, true); // true: no VC

		} else
			this.cameraMove.startZoomAttemptMove(p);
	}


	zoomToHeight(h) {

		if (typeof h != 'number')
			return Report.warn("bad arg", `h=${h}`);

		var n = this.getZoomSettingNumByHeight(h);

		if (n === this.zoomSettingNum)
			return;

		var p = this.getReferencePoint();

		this.setZoomSetting(n);

		this.cameraMove.startMove(p, "zoom", null, null, true); // true: no VC
	}


	getPoint() {
		return this._currentPosition.copyFromVector3(this.position);
	}

	getLineCameraItem(itemPt) {
		return this._lineCameraItem.copyFromPoints(
			this.getPoint(),
			itemPt || this.followItem.getPoint()
		);
	}

	getCameraItemAngleAbsDiff(itemPt) {
		return Angle.absDiff(this._theta, this.getLineCameraItem(itemPt).angle());
	}


	// =================================================
	//
	//    Visibility
	//
	// =================================================

	// TODO visibility fn. w/ VC
	// TODO better camera visibility area w/ inclination taken into account

	isItemInSector_Good(item) { // Item center is in the sector, not-so-far

		if (!item)
			return;

		var sector = this.sector.clone();
		var angle = sector.getAngle();
		var h = this.getSettingHeight();

		sector.left = Angle.sub(sector.left, angle * 0.2);
		sector.right = Angle.add(sector.right, angle * 0.2);
		sector.radius =
			h >= 10 ? 90 :
			h >= 7 ? 70 : 60;

		if ( ! sector.containsPoint( item.getPoint() ))
			return;

		var d = sector.distanceToCircle( item.getCircle() );

		if (h >= 15 && d >= 27
			|| h >= 10 && d >= 21
			|| h >= 7 && d >= 15
				|| d >= 10)
			return true;
	}



	getCameraShape() { return this.cameraShape.setFromCamera(this.camera, Display.maxDistance) }


	createSceneList() {

		var newList = Util.filterInPlace(scene.children, m => !('autoAdded' in m.userData));
		var cameraShape = this.getCameraShape();

		this.sector = cameraShape.sector; // for MiniMap

		//this.sector.setFromPerspectiveCamera(this.camera).enlarge(+8); // unit! (static was OK +4)

		var meshes = Main.area.display.getDisplayMeshes(cameraShape);

		Array.prototype.push.apply(newList, meshes);
	}
}


Object.assign(CameraView.prototype, {

	_curPt: new Point,
	_nextPt: new Point,
	_moveV: new Point,
	_moveSegment: new Line2,
	_edgeV: new Point,
	_nextEdgeV: new Point,

	_lineCameraItem: new Line2,
	_currentPosition: new Point,
});


CameraView.MOVE_ON_EDGE_FACTOR = 0.4;
CameraView.CAMERA_RADIUS_CLASS = 0;


CameraView.zoomSettings = [

	{ y: 2, phi: -0.05, d: 5.1 },
	{ y: 3, phi: -0.15, d: 7.3 },
	{ y: 4.5, phi: -0.22, d: 11, factor: 1.3 },
	{ y: 7, phi: -0.28, d: 15.5, factor: 1.7 },
	{ y: 10, phi: -0.32, d: 21, factor: 2.5 },
	{ y: 15, phi: -0.36, d: 31, factor: 3.7 },
];




export { CameraView }

