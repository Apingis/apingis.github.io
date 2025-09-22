
import { Storage } from './Storage.js';


var _mat4 = new THREE.Matrix4;
var _logPosWorld = new THREE.Vector3;
var _logQuaternion = new THREE.Quaternion;


class LogStorage extends Storage {

	constructor(data, baseItem, storageId) {

		super(data, baseItem, storageId);

		this.depth = data.depth || LogStorage.DEPTH;
		this.approachMargin = data.approachMargin || LogStorage.APPROACH_MARGIN;

		this.logs = [];

		this.startPos = new THREE.Vector3;
		this.frontV = new THREE.Vector3;
		this.depthV = new THREE.Vector3;
		this.itemFacing = 0;
		this.rotYQuaternion = new THREE.Quaternion;
		this.itemCenterRay = new THREE.Ray;

		var startPos = new THREE.Vector3().fromArray(this.data.startPos, 0);
		var endPos = new THREE.Vector3().fromArray(this.data.endPos, 0).sub(startPos);
		console.assert(endPos.y === 0);
		var frontV = endPos.clone().normalize();
		var depthV = new THREE.Vector3(0, 1, 0).cross(frontV);

		this._local = {

			startPos,
			frontV,
			depthV,
			itemFacing: Math.atan2(depthV.z, depthV.x),

			itemCenterRay: new THREE.Ray(
				startPos.clone().addScaledVector(depthV, this.depth / 2),
				frontV.clone()
			),
		};

		this.width = endPos.length();
		this.twoSides = data.twoSides;

		this.circlePacking = new CirclePacking(this.width, data.height, data.pileType);

		// Height is relative to basement
		if (data.height < 0.2)
			Report.warn("small height", `${this} h=${data.height}`);


		this.operationPoints = [];
		this.operationPoints.show = function() {
			this.forEach(oP => oP.point.show('circle', Unit.RadiusClass[0]));
		};
	}


	toString() { return `<LogStorage baseItem=${this.baseItem} .${this.storageId}`
		+ ` w=${Util.toStr(this.width)}`
		+ ` 2side=${this.twoSides} OPs=${this.operationPoints.length}`
		+ ` cntItems=${this.getSize()}>`; }

	getSize() { return this.logs.length }

	getItems() { return this.logs }


	updatePosition() {

		var mat4 = this.baseItem.getMatrix4();

		this.startPos.copy( this._local.startPos ).applyMatrix4(mat4);
		this.frontV.copy( this._local.frontV ).transformDirection(mat4);
		this.depthV.copy( this._local.depthV ).transformDirection(mat4);
		this.itemFacing = Math.atan2(this.depthV.z, this.depthV.x);
		this.rotYQuaternion.setFromAxisAngle( Item.axisY, -this.itemFacing );
		this.itemCenterRay.copy( this._local.itemCenterRay ).applyMatrix4(mat4);


		this.operationPoints.length = 0;

		this.createOPSide(0);
		this.createOPSide(0, true);

		if (this.twoSides) {
			this.createOPSide(1);
			this.createOPSide(1, true);
		}

	}


	createOPSide(sideNum, throwRight) {

		var sideStartPos = this.startPos.clone();
		var frontV = this.frontV.clone();
		var depthV = this.depthV.clone();

		if (sideNum === 1) {
			sideStartPos.addScaledVector(frontV, this.width).addScaledVector(depthV, this.depth);
			frontV.negate();
			depthV.negate();
		}


		if (throwRight) {
			sideStartPos.addScaledVector(frontV, this.width);
			frontV.negate();
		}


		var approachDistance = Unit.RadiusClass[0] + this.approachMargin;

		var approachRay = new THREE.Ray(
			sideStartPos.addScaledVector(depthV, -approachDistance),
			frontV
		);

		var unitFacing = Math.atan2(frontV.z, frontV.x);


		var oPRadius = Unit.RadiusClass[0] + 0.04;
		var oPCount = Math.floor(this.width / (2 * oPRadius));

		var remainsWidth = this.width - oPCount * (2 * oPRadius);
		if (remainsWidth > 0.75 * oPRadius)
			oPCount ++;

		var position = new THREE.Vector3;

		for (let i = 0; i < oPCount; i++) {

			let range = new Range( i * (2 * oPRadius) );
			// So, last range can be up to 2.75*r.
			range.end = i === oPCount - 1 ? this.width : range.start + 2.5 * oPRadius;

			if (sideNum === 1)
				[ range.start, range.end ] = [ this.width - range.end, this.width - range.start ];

			if (range.getWidth() < 1.25 * oPRadius)
				Report.warn("shallow range", `${this} w=${Util.toStr(range.getWidth())}`
					+ ` oPRadius=${Util.toStr(oPRadius)}`);

			approachRay.at( i * (2 * oPRadius) + LogStorage.UNIT_POSITION_OFFSET, position);

			var point = Point.fromVector3(position);

			this.operationPoints.push( Object.freeze({

				name: "ThrowToPileOP",
				sideNum,
				throwRight,
				range, // x in circlePacking coords.
				storage: this,
				baseItem: this.baseItem,

				position: position.clone(),
				point,
				unitFacing,
				frontV,
				depthV,

				aP: new ApproachPoint(point.x, point.y, unitFacing, 1),
				radiusClass: 0,
			}) );
		}
	}


	getOperationPoints(unit, carriedLog) {

		console.assert(unit.radiusClass === 0);

		var r = carriedLog.getLogRadius();

		return this.operationPoints.filter((oP, i) => {

			if (this.circlePacking.getAvailableCircle(r, oP.range, "getFirst"))
				return true;
		});
	}


	getStoragePositionForLog(log, oP) {

		var r = log.getLogRadius();
		var circle = this.circlePacking.getAvailableCircle(r, oP.range);

		if (circle)
			return new StoragePosition(this.baseItem.id, this.storageId,
				Util.froundPos(circle.x), Util.froundPos(circle.y) );
	}


	updateUI() {

		if (Main.isServer)
			return;

		UI.setRequiresUpdateFor(this.baseItem);

		if ( typeof this.baseItem.getPlacementBaseItem == "function" )
			UI.setRequiresUpdateFor( this.baseItem.getPlacementBaseItem() );

		ProgressWindow.update();
	}


	placeLogIntoStorage(log, oP) {

		if (Main.isServer)
			Report.throw("bad usage");

		if (log.storagePosition)
			return Report.warn("already in a storage", `${log}`);

		if ( ! this.baseItem.isOn3D() )
			return Report.warn("logStorage !isOn3D");

		//if (oP.storage !== this || this.baseItem.id !== oP.baseItem.id)
		//	return Report.warn("bad oP", `${oP} ${this}`);

		var sP = this.getStoragePositionForLog(log, oP);
		if (!sP)
			return;

		var circle = new Circle(sP.x, sP.y, log.getLogRadius());
		var result = this.circlePacking.addCircle(circle);
		if (!result)
			return;

		this.logs.push(log);
		log.addStoragePosition(sP);

		this.updateUI();

		return sP;
	}


	removeAllLogs(localKey) {

		this.logs.forEach(log => log.removeItem(localKey, true));
		this.logs.length = 0;
		this.circlePacking.clear();

		this.updateUI();
	}


	getThrowType(storagePosition, oP) {

		var dNear = LogStorage.UNIT_POSITION_OFFSET + Unit.RadiusClass[0];

		var isNear = (oP.sideNum === 0) === (oP.throwRight === false)
			? storagePosition.x < oP.range.start + dNear
			: storagePosition.x > oP.range.end - dNear;

		return oP.throwRight
			? (isNear ? "ThrowRight90" : "ThrowRight45")
			: (isNear ? "ThrowLeft90" : "ThrowLeft45");
	}


	getLogPositionWorld(log) {

		if (!log.storagePosition)
			return Report.warn("no storagePosition", `${log}`);

		var position = this.itemCenterRay.at(log.storagePosition.x, _logPosWorld);
		position.y += log.storagePosition.y;

		return position;
	}


	setLogLocalCoord(log) { // - Pile is centered at local origin

		log.position.set(

			log.storagePosition.x + this._local.startPos.x,
			log.storagePosition.y + this._local.startPos.y,
			0
		);

		log.quaternion.premultiply( this.baseItem.getQuaternion().conjugate() );

		//log._display && log._display.mesh.updateMatrix(); // -> .getDependencyObj()
	}

/*
	setLogQuaternion(log) {

		var rotXLoc = log.getRotationXLocal();

		_logQuaternion.setFromAxisAngle( Item.axisX, rotXLoc );

		log.useQuaternion().copy(_logQuaternion);

		log.quaternion.premultiply( this.rotYQuaternion );
	}


	updateLogPositions(afterFn) {

		var logs = this.getItems();

		for (let i = 0; i < logs.length; i++) {

			let log = logs[i];

			log.stopAllTweens();
			log.position.copy( this.getLogPositionWorld(log) );
			this.setLogQuaternion(log);

			afterFn && afterFn(log);
		}
	}
*/

	static createSummary() {

		return {

			count: 0,
			volume: 0,
			mass: 0,
			cost: 0,

			price1m3: LogStorage.PRICE_1M3,
			minAmount: LogStorage.MIN_AMOUNT,

			canSell() { return this.volume >= this.minAmount; },

			toString() {
				return `[Summary (LogStorage): c=${this.count} v=${this.volume}`
					+ ` m=${this.mass} c=${this.cost} min=${this.minAmount} canSell=${this.canSell()}]`;
			},
		};
	}


	getSummary(summary = LogStorage.createSummary()) {

		summary.count += this.getSize();

		var volume = this.logs.reduce((acc, log) => acc + log.getLogVolume(), 0);
		summary.volume += volume;

		summary.mass += this.logs.reduce((acc, log) => acc + log.getLogMass(), 0);

		summary.cost += this.logs.reduce((acc, log) => acc + log.getLogCost(), 0);

		return summary;
	}


	//
	// * It validates non-intersection, does not check gravity rules.
	// * (!) openSlots require recomputation
	//
	placeItem(log) {

		if (!log.isLog())
			return Report.warn("not a log", `${log}`);

		if (this.logs.indexOf(log) !== -1)
			return Report.warn("already placed", `${log}`);

		var sP = log.storagePosition;
		if (!sP)
			return Report.warn("no storagePosition", `${log}`);

		var circle = new Circle(sP.x, sP.y, log.getLogRadius());
		var result = this.circlePacking.addCircle(circle, true);

		if (!result) { // place it anyway... to logs[], not to circlePacking
			Report.warn("storagePosition does not fit", `${log}`);
		}

		this.logs.push(log);

		return true;
	}


	isAboutFull() { // log of max.radius does not fit

		var r = LogStorage.getMaxLogRadius();

		return !this.circlePacking.getAvailableCircle(r, undefined, "getFirst"); // undef: full width
	}


	static getMaxLogRadius() {

		return this._maxLogRadius || (this._maxLogRadius = Object.values( ItemSpec.byId )
			.filter(iS => iS.type == 'log')
			.reduce((max, iS) => Math.max(max, iS.data.logRadius), 0)
		);
	}

}


Object.assign(LogStorage, {

	PRICE_1M3: 100, // for 1m^3
	MIN_AMOUNT: 0.1, // in m^3

	APPROACH_MARGIN: 0.001,
	UNIT_POSITION_OFFSET: -0.25,
	DEPTH: 1.20,

	_maxLogRadius: 0,
});




export { LogStorage };

