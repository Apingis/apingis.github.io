
import { CustomItem } from './CustomItem.js';

//
// Unit:
// - moves using tracks (w/ pathfinding)
// - has trackList
// - circular cBody (?)
//
class Unit extends CustomItem {

	constructor(spec) {

		super(spec);

		this.radiusClass = 0;

		if (!Main.isServer) {

			this.aI = new AI(this, Main.area);

			this.taskList = new TaskList(this);

			this.trackList = new TrackList(this);
		}
	}


	isUnit() { return true }


	onAfterCreate() {

		if (Main.isServer)
			return;

		this.checkAndHandleCollision();

// TODO use TaskList
		this.aI.task = Task.fromItemCharData(this); // introduce separate unitData w/ task ?
	}


	removeItem() {

		this.trackList.removeAllTracks();

		super.removeItem();
	}


	canThrowOutTrackWith(track, oversteppingTrack, fromEpisodeId) { // target episodeId: in WP

		console.assert(oversteppingTrack.isInPlace());

		if (track.t2 < Engine.time || oversteppingTrack.t2 < Engine.time)
			return Report.warn("outdated");


		if (track.isInPlace()) {

			if (track.t1 <= Engine.time) // this must be because of algorithm error
				return Report.warn("inPlace track already started", `Engine.time=${Engine.time}`
					+ ` track=${track}, oversteppingTrack=${oversteppingTrack}`);
		}


		if (!track.isInPlace()) {

			if (track.data.wP.hasPriority()) // as of 2023.01.06 never happens
				return Report.warn("canThrowOutTrackWith = false",
					`${track}, oversteppingTrack=${oversteppingTrack}, wP=${track.data.wP}`);
		}

		// oversteppingTrack.unit has already arrived at oversteppingTrack.p1 w/o collision.
		// Considering "Can Stop Movement Immediately" principle, if track is not inPlace:
		// if track is cancelled then track.unit would have the ability not to collide
		// (e.g. if stops immediately).

		//if (track.isInPlace())
		//	return Report.warn("inPlace", `unit.id=${track.unit.id} track.id=${track.id}`);

		return true;
	}


	doThrowOutTrackWith(track, oversteppingTrack, fromEpisodeId) {

		console.assert(track.unit === this && oversteppingTrack.unit !== this);

		this.aI.throwOutTrack(track, fromEpisodeId);
	}


	


	// =====================================================================

	updateDisplayRect() {

		var r = 2.5 * this.getRadius();

		this._displayRect.set(-r, -r, r, r)
			.translate( this.position.x, this.position.z );
	}


	//getOptionUpdateIfVisible() { return true }
/*
	getOptionUpdateIfVisible() {} // units updated per-frame from Engine

	getDisplayDataSize() { return 'size_skinned' }


	updateDisplayData(array, offset) {

		this.updateAnimation(); // from trackList

		super.updateDisplayData_Skinned(array, offset);
	}
*/

	updatePositionFacing() {

		if (Main.isServer)
			return;

		if (this.trackList)
			this.trackList.updatePositionFacing();
		else
			Report.warn("no trackList");
	}


	updatePosition() { this.updatePositionFacing(); }

	updateAnimation() { this.trackList && this.trackList.updateAnimation(); }



	static removeAllUnitPathDisplay() {

		//Util.findAndRemoveElement(scene.children, mesh => mesh.userData.isUnitPath);
		Util.filterInPlace(scene.children, mesh => !mesh.userData.isUnitPath);

		MiniMap.setPath();
	}


	setupUnitPathDisplay() {

		//this.removeUnitPathDisplay();

		var geometry = this.trackList.getGeometry();
		var mesh = new THREE.Mesh(geometry, Assets.materials.line.track);

		mesh.name = `TrackList ${this}`;
		mesh.userData.isUnitPath = true;
		scene.add(mesh);
//console.log(this.id, mesh);
	}


	setupUnitPathDisplay_MM(isOn) {
		MiniMap.setPath( isOn ? this.trackList.getPath() : null );
	}


	// =====================================================================

	checkAndHandleCollision(reason = "initialPlacement") {

		var isColliding = (p) => this.checkCollisionWithChars(p) || this.checkCollisionWithStatic(p);

		if (!isColliding())
			return;

		var sprng = new Util.SpreadPRNG;
		var origPoint = this.getPoint().clone();
		var p = new Point;
		var attempts = 0;


		var performAttempts = (dMin, dMax, n = 25) => {

			for (let i = 0; i < n; i++) {

				attempts ++;

				let d = dMin + sprng.random(dMax - dMin);

				p.copy( origPoint ).addScaled( sprng.randVNorm(), d );
				Util.froundPoint(p);

				if (!isColliding(p))
					return [ p, d ];
			}
		};


		var [ p, d ] = performAttempts(0.001, 0.1) || performAttempts(0.2, 1.5)
			|| performAttempts(2, 5) || performAttempts(5, 10)
			|| performAttempts(10, 30, 100);

		if (!p)
			return Report.warn(`did not handle collision (${reason})`, `${this}`);

		Report.warn(`teleport (${reason})`, `${this} d=${d} attempts=${attempts}`);

		this.position.setX(p.x).setZ(p.y);

		this.aI.setupFullReplanning("handledCollision");

		Accounting.addEntry(this, "teleport", { reason, x: p.x, z: p.y });

		return p;
	}



	checkCollisionWithChars(p = this.getPoint()) {

		var circle = Unit.prototype._collisionCircle.set(p.x, p.y, this.getRadius());
		
		return Main.getUnits().find(unit =>
				unit !== this && unit.getCircle().overlapsCircle(circle) );
	}


	checkCollisionWithStatic(p = this.getPoint()) {

		var collidingPolygon;

		Main.area.spatialIndex.processSomeDisjointPolygonsUsingShape(p, 0,
				this.radiusClass, polygon => {

			if (polygon.containsPoint(p)) {

				collidingPolygon = polygon;
				return true;
			}
		});

		return collidingPolygon;
	}



	// =====================================================================

	getRequiresReEquipAt() {}

	getEquipRightHandAt() {}

	getEquipRightHand() {}


	// =====================================================================

	getPoint(p = this._unitPoint) {
		this.updatePosition();
		return p.set(this.position.x, this.position.z);
	}

	getPointAt(t) {
		return this._unitPoint.copy(this.trackList.getPointAt(t));
	}


	getCircle(r = this.getRadius(), c = this._circle) {
		this.updatePosition();
		return c.set(this.position.x, this.position.z, r);
	}


	getBoundingCircle() { return this.getCircle() }


	getPosition(v = this._getPosition) {
		this.updatePosition();
		return v.copy(this.position);
	}


	setPosition(x, y, facing) { // Cancelling existing actionPlan

return console.error(`obsolete`);
/*
		console.assert(this.position.equals(new THREE.Vector3));

		if (x instanceof THREE.Vector3 && y === undefined) {
			this.position.copy(x);

		} else {
			this.position.set(x, 0, y);
			if (facing !== undefined)
				this.facing = facing;
		}
*/
	}

/*
	static clearAction(action) {
		action.enabled = true;
		action.setEffectiveTimeScale(1);
		action.setEffectiveWeight(1);
		action.time = 0;
	}
*/

	static playAction(action, time = 0, timeScale = 1) {

		action.play();
		action.enabled = true;
		action.setEffectiveTimeScale(timeScale);
		action.setEffectiveWeight(1);
		action.time = time;
	}


	static executeCrossFade(startAction, nextAction, duration, nextActionTime,
			nextActionTimeScale = 1, warp = false) {

		this.playAction(nextAction, nextActionTime, nextActionTimeScale);
		startAction.crossFadeTo(nextAction, duration, warp);
	}


	static distanceByRC(radiusClass) { return Unit.RadiusClass[radiusClass] || 0; }

	static radiusByRC(radiusClass) { return Unit.RadiusClass[radiusClass] || 0; }
}


//
// List of all existing radiusClass'es, with added radius for each radiusClass.
// last in the array is the "base" one (added radius 0).
//
Unit.RadiusClass = [ 0.63, 0 ];
Unit.RadiusClassMax = 0;
//Unit.RadiusClass = [ 0.63, 1.45, 0 ];
//Unit.RadiusClassMax = 1;
Unit.RadiusClassBase = Unit.RadiusClass.length - 1;
Unit.ItemPolygonByRC = Unit.RadiusClass.map(el => null);

Unit.RadiusMax = Unit.RadiusClass.reduce((max, el) => Math.max(max, el));

//
// Template array for initializing item.cGroupIds; has 1 element per every existing cGroup;
// array content is not used
//
Unit.ItemCGroupIds = [ null ];
//Unit.ItemCGroupIds = [ null, null ];
Unit.CreateCGroups = Unit.ItemCGroupIds.map((el, i) => i);


Object.assign(Unit.prototype, {

	// from Item.prototype
	//_circle: new Circle,
	_unitPoint: new Point,
	_collisionCircle: new Circle,
	//_pointAt: new Point,
	_getPosition: new THREE.Vector3,
});



export { Unit };

