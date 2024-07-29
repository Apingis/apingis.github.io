
import { AngularSweep } from './AngularSweep.js';


AngularSweep.prototype.createStaticData = function() {

	this.sweepLine.updateWithAngle(this.right);

	var radius = Unit.RadiusClass[this.radiusClass] + 1e-3;

	// TODO? sector limited by area.rect.
	this.area.spatialIndex.processDisjointPolygonsInSector(this.sector,
			this.level, this.radiusClass, polygon => {

		if (polygon.height < this.height)
			return;

		if (polygon.getBoundingCircle().distanceTo(this.x, this.y) > radius) {

			this.processRemoteStaticPolygon(polygon);

			if (Main.DEBUG && this.basePolygon && this.basePolygon.id == polygon.id)
				console.error(`id=${this.id} something wrong with basePolygon`);

		} else {
			this.processStaticPolygon(polygon);
		}
	});

	if (this.basePolygon && !this.basePolygonProcessed) {
		console.error(`id=${this.id} basePolygon not processed ${this.basePolygon.id}`);
	}
}


AngularSweep.prototype.processRemoteStaticPolygon = function(polygon) {

	var viewX = this.x,
		viewY = this.y,
		polygonId = polygon.id,
		p = polygon.points,
		length = p.length;

	// Polygon vertices are processed in reverse order.
	var i = 0,
		x = p[0] - viewX,
		y = p[1] - viewY,
		prevLeft = Point.isLeft00(x, y, p[2] - viewX, p[3] - viewY),
		nextLeft;

	// Select starting pt. for mPLine.
	var startI;

	while (1) {
		let nextI = i === 0 ? length - 2 : i - 2;

		var nextX = p[nextI] - viewX,
			nextY = p[nextI + 1] - viewY;

		nextLeft = Point.isLeft00(nextX, nextY, x, y);

		// start/end MPLine traversal with invisible point or INSERT. TODO CW polygon
		if (prevLeft < 0) {
			if (nextLeft < 0) { // invisible point
				if (startI === undefined) // ?? TODO (break?)
					startI = i;

			} else { // INSERT
				if (startI === undefined) // ?? TODO
					startI = i;
				break;
			}
		}

		prevLeft = nextLeft;

		if (nextI === 0) {
			console.error(`id=${this.id} polygonId=${polygonId} no starting vertex:`
				+ ` it seems the unit is inside the polygon.`);
			return;
		}
		i = nextI;
		x = nextX;
		y = nextY;
	}

	// Write relevant portions of mPLine.
	while (1) {
		let nextI = i === 0 ? length - 2 : i - 2;

		var nextX = p[nextI] - viewX,
			nextY = p[nextI + 1] - viewY;

		nextLeft = Point.isLeft00(nextX, nextY, x, y);
//console.log(`prevLeft=${prevLeft} nextLeft=${nextLeft}`);// polygonId=${polygonId}`);

		let type = nextLeft < 0 ? (prevLeft < 0 ? -1 : AngularData.REMOVE)
			: (prevLeft < 0 ? AngularData.INSERT : AngularData.REPLACE);

		if (type != -1) {
			let ptId;
			if (type != AngularData.REPLACE)
				ptId = VGNodeId.getAtStaticVertex(polygonId, i, type == AngularData.INSERT ? 1 : 2);
			this.createMPLinePoint(x, y, type, ptId);
		}

		prevLeft = nextLeft;

		if (nextI == startI)
			break;
		i = nextI;
		x = nextX;
		y = nextY;
	}

}


AngularSweep.prototype.processStaticPolygon = function(polygon) {

	const leftEpsilon = 1e-9, // 1.5K bigger than max.observed
		distanceEpsilon = 1e-9;


var debug = 0;//this.id==0;

	var viewX = this.x,
		viewY = this.y,
		polygonId = polygon.id,
		p = polygon.points,
		length = p.length;

	// Polygon vertices are processed in reverse order.
	var i = 0,
		x = p[0] - viewX,
		y = p[1] - viewY,
		prevLeft = Point.isLeft00(x, y, p[2] - viewX, p[3] - viewY),
		nextLeft;

	// Select starting pt. for mPLine.
	while (1) {
		let nextI = i === 0 ? length - 2 : i - 2;

		var nextX = p[nextI] - viewX,
			nextY = p[nextI + 1] - viewY;

		nextLeft = Point.isLeft00(nextX, nextY, x, y);
//if (debug)
//console.log(`findStartPt polygonId=${polygonId} i=${i} prevLeft=${prevLeft} nextLeft=${nextLeft}`);

		// start MPLine traversal with invisible point. TODO CW polygon
		if (nextLeft < -leftEpsilon && prevLeft < -leftEpsilon)
			break;

		// start MPLine with INSERT. TODO mb.improve
		else if (nextLeft > leftEpsilon) {
			if (prevLeft < -leftEpsilon)
				break;
			if (prevLeft < 0 && !prevPtIsViewPtOrOnOppositeSide())
				break;

		} else if (nextLeft >= -leftEpsilon) {
			if (prevLeft < 0 && !currentPtIsViewPt()
					&& (nextLeft >= 0 || nextPtIsViewPtOrOnOppositeSide()) )
				break;
		}

		prevLeft = nextLeft;

		if (nextI === 0) {
			console.error(`id=${this.id} polygonId=${polygonId} no starting vertex:`
				+ ` it seems the unit is inside the polygon.`);
			return;
		}
		i = nextI;
		x = nextX;
		y = nextY;
	}

	var startI = i;

	// Write relevant portions of mPLine.
	while (1) {
		let nextI = i === 0 ? length - 2 : i - 2;

		var nextX = p[nextI] - viewX,
			nextY = p[nextI + 1] - viewY;

		nextLeft = Point.isLeft00(nextX, nextY, x, y);
//console.log(`prevLeft=${prevLeft} nextLeft=${nextLeft}`);// polygonId=${polygonId}`);

		let type = -1;

		if (nextLeft < -leftEpsilon) {

			if (prevLeft < -leftEpsilon) { // case D

			} else if (prevLeft >= 0 || prevPtIsViewPtOrOnOppositeSide()) { // case C
				type = AngularData.REMOVE;
			}

		} else if (nextLeft > leftEpsilon) {

			if (prevLeft < -leftEpsilon) { // case B
				type = AngularData.INSERT;

			} else if (prevLeft >= 0 || prevPtIsViewPtOrOnOppositeSide()) {
				type = AngularData.REPLACE;

			} else {
				type = AngularData.INSERT;
			}

		// Math.abs(nextLeft) <= leftEpsilon

		} else if (currentPtIsViewPt()) { // At viewPoint / sector origin

			if (nextPtIsViewPt()) {
				console.error(`id=${this.id} Short edge polygonId=${polygonId} i=${i}`);

			} else {
				this.createMPLinePoint(0, 0, AngularData.REPLACE, undefined, this.prevAngle + AngularData.Epsilon);

				let nextAngle = Math.atan2(nextY, nextX);
				// Extremely sharp angle? Can't happen, polygon inward angles are >= 90 deg
				this.createMPLinePoint(0, 0, AngularData.REPLACE, undefined, nextAngle - AngularData.Epsilon); // 0-Segment
//if (polygonId==1)
//console.log(`polygonId=1 this.basePolygon.id=${this.basePolygon.id} this.baseVertex=${this.baseVertex}`);

				if (this.basePolygon && this.basePolygon.id == polygonId && this.baseVertex == i) {
					if (this.basePolygonProcessed)
						console.error(`id=${this.id} basePolygon already processed`);
					this.basePolygonProcessed = true;
				}

				if (debug)
					console.warn(`id=${this.id} i=${i} at sector origin: 0-Segment`);
			}

		} else if (nextLeft >= 0 || nextPtIsViewPtOrOnOppositeSide()) {

			if (prevLeft < 0) {
				type = AngularData.INSERT;

			} else {
				type = AngularData.REPLACE;
			}

		} else {

			if (prevLeft < 0) { // equal to case D

			} else { // equal to case C
				type = AngularData.REMOVE;
			}
		}

		if (type != -1) {
			let ptId;
			if (type != AngularData.REPLACE)
				ptId = VGNodeId.getAtStaticVertex(polygonId, i, type == AngularData.INSERT ? 1 : 2);
			this.createMPLinePoint(x, y, type, ptId);
		}

		prevLeft = nextLeft;

		if (nextI == startI)
			break;
		i = nextI;
		x = nextX;
		y = nextY;
	}

	return;

	// infrequent cases
	function currentPtIsViewPt() {
		return Math.abs(x) + Math.abs(y) < distanceEpsilon;
	}

	function nextPtIsViewPt() {
		return Math.abs(nextX) + Math.abs(nextY) < distanceEpsilon;
	}

	function nextPtIsViewPtOrOnOppositeSide() {
		if (Math.abs(nextX) + Math.abs(nextY) < distanceEpsilon)
			return true;

		return y * nextY < 0 || x * nextX < 0;
	}
/*
	function prevPtIsViewPt() {
		var iNext = polygon.nextIndex(i);
//console.warn(`prevPtIsViewPt(): polygonId=${polygonId} i=${i} x=${x} y=${y} -- ${p[iNext]} ${p[iNext + 1]}`);
		//return viewX == p[iNext] && viewY == p[iNext + 1];
		return Math.abs(p[iNext] - viewX) + Math.abs(p[iNext + 1] - viewY) < distanceEpsilon;
	}
*/
	function prevPtIsViewPtOrOnOppositeSide() {
		var iNext = polygon.nextIndex(i),
			prevX = p[iNext] - viewX,
			prevY = p[iNext + 1] - viewY;

		if (Math.abs(prevX) + Math.abs(prevY) < distanceEpsilon)
			return true;

		return prevY * y < 0 || prevX * x < 0;
	}

}


//   maybe TODO
// - different input data representation (mb. don't write MPLine at all).
//
// TODO? distance > radius
//
AngularSweep.prototype.createMPLinePoint = function(x, y, type, ptId,
		angle = Math.atan2(y, x)) {

	angle = this.sector.localizeAngle(angle);

	var inSector = angle <= this.left;
	var intersectsR;

	// What to do.
	// 0: discard current point and last point
	// 1: move current point to last point
	// 2: save current point
	// 3: save current point, save last point if it exists
	var action;

	if (type == AngularData.INSERT) {
		action = inSector ? 2 : 1;

	} else if (this.prevAngle > angle) {
		intersectsR = true;
		action = 3;

	} else if (inSector || this.prevInSector) {
		action = 3;

	} else {
		action = type == AngularData.REPLACE ? 1 : 0;
	}


	if (action === 0) {
		this.lastPt = false;
		return;

	} else if (action == 1) {
		this.lastPt = true;
		this.lastPtX = x;
		this.lastPtY = y;

	} else {
		if (action == 3 && this.lastPt) {
			this.saveMPLine(this.lastPtX, this.lastPtY);
			this.lastPt = false;
		}

		if (inSector)
			this.events.push(AngularData.encode(angle, type, this.mPLine.length));

		this.saveMPLine(x, y, ptId);

		if (intersectsR)
			this.segmentsHeap.insert(this.mPLine.length - 6);
	}

//if (this.id==5)
//console.warn(`createPt (${Util.toStr(x)},${Util.toStr(y)}) ${AngularData.typeStr[type]} ptId=${ptId} angle=${angle}`
//+ ` intersectsR=${intersectsR} action=${action} prevAngle=${this.prevAngle}`);

	this.prevAngle = angle;
	this.prevInSector = inSector;
}


AngularSweep.prototype.saveMPLine = function(x, y, ptId) {

	var mPLine = this.mPLine,
		length = mPLine.length;

	mPLine[length] = x;
	mPLine[length + 1] = y;
	mPLine[length + 2] = ptId;
}

/*
AngularSweep.prototype.addStaticPoint = function(p, ptId = p.id) {

	console.assert(isFinite(p.x + p.y));

	var x = p.x - this.x,
		y = p.y - this.y,
		angle = this.sector.localizedAngleTo(x, y);

	if (angle > this.left)
		return;

	this.saveMPLine(x, y, ptId);
	this.events.push(AngularData.encode(angle, AngularData.STATIC_POINT, this.mPLine.length - 3));
}
*/

