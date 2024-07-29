
class ASData {

	constructor(id, sector, area, level, radiusClass) {

		this.id = id; // node.id
		this.sector = sector;

		this.area = area;
		this.level = level;
		this.radiusClass = radiusClass;

		this.mPLine = null;
		this.flatPoints = null;
		this.flatSegments = null;

		if (Main.DEBUG) {
			this.aS = null;
			this.debug = null;
		}
	}


	//static get(node, area, level, radiusClass) {
	static get(node, pathLevel) {
		// TODO! cache (w/ sensitivity area) (height!)
		// TODO! minimal necessary angle

		// Cases: static item disappeared (TODO! recompute?)
		if (!VGNodeId.validate(node.id))
			return;

		var aS = AngularSweep.createFromVGNode(node, pathLevel.area, pathLevel.level,
			pathLevel.sectorRadius, pathLevel.radiusClass);

		if (!aS)
			return;

		aS.height = pathLevel.height;

		aS.createStaticData();

		aS.processStaticData();

		var aSData = new ASData(node.id, aS.sector, pathLevel.area, pathLevel.level, pathLevel.radiusClass);
		aSData.mPLine = aS.mPLine;
		aSData.flatPoints = aS.flatPoints;
		aSData.flatSegments = aS.flatSegments;
		if (Main.DEBUG >= 3)
			aSData.aS = aS;

		return aSData;
	}

}


	// =============================
	//
	//   Retrieval from ASData
	//
	// =============================

//
// Can be different from one in aSData; is fully included in this.sector;
// can be "subSector" (right >= +PI).
// In cases other than at static vertex, returns this.sector.
// Assuming arriveAngle is previously obtained using this.getLocalizedArriveAngle()
//
ASData.prototype.getEffectiveSector = function(arriveAngle) {

	var sector = this.sector;

	if (!VGNodeId.isAtStaticVertex(this.id))
		return sector;


	if (!Number.isFinite(arriveAngle) || sector.is360())
		Report.throw("bad arriveAngle or sector", `a=${arriveAngle} ${this}`);

	var arriveAngleLoc = sector.localizeAngle(arriveAngle);

	// Does arriveAngleLoc fit into sector (taking rounding errors into account)?

	if (arriveAngleLoc > sector.right + (2 * Math.PI - 1e-9) ) {

		arriveAngleLoc = sector.right;

	} else if (arriveAngleLoc > sector.left + 1e-9) {

		// this prohibits usage of ASData, makes expansion erroneous.
		return Report.warn("arriveAngle isn't in sector", `a=${arriveAngleLoc} ${sector}`);
	}


	var left = sector.left,
		right = sector.right;

	if (VGNodeId.flagLeftSign(this.id) > 0) {

		right = Math.max(sector.right, arriveAngleLoc - AngularData.Epsilon);

	} else { // polygon is to the right: < 0
		left = Math.min(sector.left, arriveAngleLoc + AngularData.Epsilon);
	}

	return new Sector(sector.x, sector.y, sector.radius, left, right, true);
}


ASData.prototype.checkReachable = function(vGNode) {

	var polar = this.sector.getLocalizedPolarIfFits(vGNode.x, vGNode.y);
	return polar && polar.r <= this.distanceToStatic(polar.phi);
}


ASData.prototype.distanceToStatic = function(angle) { // requires localized angle

	if (angle < this.sector.right || angle > this.sector.left) {
		console.error(`id=${this.id} angle=${angle} is out of sector ${this.sector}`);
		return 0;
	}

	var i = Util.bsearchGT(this.flatSegments, AngularData.encode(angle)) - 1;
	if (i === -1)
		i = 0;

	var mPLineIndex = AngularData.data(this.flatSegments[i]);

	return this.distanceIntersectionSweepLineMPLine(angle, mPLineIndex);
}


ASData.prototype.distanceIntersectionSweepLineMPLine = function(angle, i) {

	if (i === undefined)
		return Infinity;

	var mPLine = this.mPLine;
	return Line2.distanceIntersectionSweepLineSegment(angle, mPLine[i],
		mPLine[i + 1], mPLine[i + 3], mPLine[i + 4]);
}


ASData.prototype.getNeighbors = function(sector) {

	console.assert(sector.shapeType == "Sector");

	return this.getFlatPoints(sector).map(flatPoint => {

		var mPLineIndex = AngularData.data(flatPoint);

		var x = this.mPLine[mPLineIndex],
			y = this.mPLine[mPLineIndex + 1],
			id = this.mPLine[mPLineIndex + 2];

		return new VGNode(x + sector.x, y + sector.y, id, Math.atan2(y, x));
	});
}


ASData.prototype.getFlatPoints = function(sector) {

	var startIndex = 0,
		endIndex = this.flatPoints.length,
		all = true;

	if (sector.right !== this.sector.right) {
		all = false;
		startIndex = Util.bsearchGTE(this.flatPoints, AngularData.encodeAngle(sector.right));
	}

	if (sector.left !== this.sector.left) {
		all = false;
		endIndex = Util.bsearchGT(this.flatPoints, AngularData.encodeAngle(sector.left));
	}

	return all ? this.flatPoints : this.flatPoints.slice(startIndex, endIndex);
}


ASData.prototype.getNeighborsInSector = function(sector) {

	var neighbors = [];

	this.forEachNeighborInSector(sector, vGNode => neighbors.push(vGNode));

	return neighbors;
}


ASData.prototype.forEachNeighborInSector = function(sector, fn) {

	var startI = 0,
		endI = this.flatPoints.length;

	if (sector.right !== this.sector.right)
		startI = Util.bsearchGTE(this.flatPoints, AngularData.encodeAngle(sector.right));

	if (sector.left !== this.sector.left)
		endI = Util.bsearchGT(this.flatPoints, AngularData.encodeAngle(sector.left));

	for (let i = startI; i < endI; i++) {

		let mPLineI = AngularData.data(this.flatPoints[i]);

		let	x = this.mPLine[mPLineI],
			y = this.mPLine[mPLineI + 1],
			id = this.mPLine[mPLineI + 2],
			angle = Math.atan2(y, x); // doesn't require localization

		fn( new VGNode(x + sector.x, y + sector.y, id, angle) );
	}
}


ASData.prototype.forEachFlatSegmentInSector = function(sector, fn) {

	var startI = 0,
		endI = this.flatSegments.length;

	var inequalSectors = !sector.equals(this.sector);

	if (inequalSectors) {

		if (sector.right !== this.sector.right)
			startI = Math.max(0, Util.bsearchGT(this.flatSegments,
				AngularData.encodeAngle(sector.right)) - 1);

		if (sector.left !== this.sector.left)
			endI = Util.bsearchGT(this.flatSegments, AngularData.encodeAngle(sector.left));
	}


	var mPLine = this.mPLine;

	for (let i = startI; i < endI; i++) {

		let mPLineI = AngularData.data(this.flatSegments[i]);
		if (mPLineI === undefined)
			continue;

		let angle = AngularData.angle(this.flatSegments[i]);
		let nextAngle = i === endI - 1 ? sector.left :
			AngularData.angle(this.flatSegments[i + 1]);

		if (inequalSectors) {
			angle = sector.localizeAngle(angle);
			nextAngle = sector.localizeAngle(nextAngle);
		}

		fn(angle, nextAngle, mPLine[mPLineI], mPLine[mPLineI + 1],
			mPLine[mPLineI + 3], mPLine[mPLineI + 4]);
	}
}

/*
ASData.prototype.setCoordinatesFromPolygon = function(vGNode) {

	console.error(`deprecated feature`);

	var id = vGNode.id;

	if (VGNodeId.isAtStaticVertex(id)) {

		let polygon = VGNodeId.polygon(id), <-- radiusClass!
			vertexIndex = VGNodeId.vertexIndex(id);

		vGNode.x = polygon.points[vertexIndex];
		vGNode.y = polygon.points[vertexIndex + 1];
	}
}
*/
/*
	static getCacheKey(area, level, radiusClass, id) {
		console.assert(area.id >= 0 && level >= 0 && radiusClass >= 0 && id >= 0);

		return (area.id * 10000 + level * 100 + radiusClass) + '-' + id;
	}
ASData.cache = {};
*/

	// ==========================
	//
	//   Debug
	//
	// ==========================


ASData.prototype.show = function() {
	this.sector.show();
	this.showOrigin();
	this.showStatic();
	return this;
}


ASData.prototype.getPoint = function() {
	return new Point(this.sector.x, this.sector.y);
}


ASData.prototype.showOrigin = function(matName = 'asOrigin', radius) {

	if (!this.debug)
		this.debug = {};

	if (this.debug.asOrigin) {
		this.debug.asOrigin.show();
		delete this.debug.asOrigin;
		return;
	}

	this.debug.asOrigin = this.getPoint().show(matName, radius
		|| Unit.RadiusClass[this.radiusClass]);
}


ASData.prototype.showStatic = function() {

	if (!this.debug)
		this.debug = {};

	var mesh = this.debug.flatSegmentsMesh;
	if (mesh) {
		mesh.geometry.dispose();
		scene.remove(mesh);
		delete this.debug.flatSegmentsMesh;

		this.debug.flatPoints.forEach(p => p.show());
		delete this.debug.flatPoints;
		return;
	}


	var positions = [],
		top = 0.04,
		x = this.sector.x,
		y = this.sector.y;

	for (let i = 0; i < this.flatSegments.length; i++) {
		let index = AngularData.data(this.flatSegments[i]);
		if (index === undefined)
			continue;
		console.assert(index <= this.mPLine.length - 3);

		positions.push(
			this.mPLine[index] + x, top, this.mPLine[index + 1] + y,
			this.mPLine[index + 3] + x, top, this.mPLine[index + 4] + y
		);
	}

	var g = new LineSegmentsGeometry().setPositions(positions);

	this.debug.flatSegmentsMesh = mesh = new THREE.Mesh(g, Assets.materials.line['flatSegments']);
	mesh.name = `Flat static segments for ${this}`;
	scene.add(mesh);


	this.debug.flatPoints = [];

	for (let i = 0; i < this.flatPoints.length; i++) {
		let index = AngularData.data(this.flatPoints[i]);

		console.assert(index <= this.mPLine.length - 3);
		console.assert(this.mPLine[index + 2] >= 0);

		this.debug.flatPoints.push(new Point(
			this.mPLine[index] + x,
			this.mPLine[index + 1] + y
		).show('flatPoints', 0.15));
	}
}



export { ASData };

