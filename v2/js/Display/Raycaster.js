
class Raycaster {

	constructor() {

		this.distance = Infinity;
		this.item = null;
		this.intersectionPoint = new THREE.Vector3;
		this.intersectedSurface = false;
		this.surfacePoint = new THREE.Vector3;
		this.inTheSky = false;
		this.intersect = null; // filled-in in case THREE.Raycaster used

		this.maxDistance = Infinity;
		this.chunkLength = 30;

		this.itemChanged = false; // since previous raycast
		this.prevItem = null;

		this.raycaster = new THREE.Raycaster;
		this.dBehind = 0;

		this._checkedItemsById = new Map;
		this._origRay = new THREE.Ray;
		this._line3 = new THREE.Line3;
		this._chunkLine3 = new THREE.Line3;
		this._line2 = new Line2;
	}


	clearResult() {

		this.distance = Infinity;
		this.item = null;
		this.intersectedSurface = false;
		this.intersect = null;
		this._checkedItemsById.clear();
	}

}


Raycaster.prototype.raycastFromCamera = function() {

	this.prevItem = this.item;
	this.clearResult();

	if (Controls.mouseIn) {
		this.maxDistance = Display.maxDistance;

		this.raycaster.setFromCamera(Controls.mouseCurrPosNDC, Display.camera);

		let ray = this.raycaster.ray.recast(0.5);
		ray.origin.y = Math.max(1e-3, ray.origin.y);

		this.raycastFullDistance(ray);
	}

	this.itemChanged = this.item != this.prevItem;
}


Raycaster.prototype.raycastFullDistance = function(ray) {

	this._origRay.copy(ray);

	this._line3.start = ray.origin;
	ray.at(this.maxDistance, this._line3.end);
	this.intersectSurface(this._line3); // cut with surface intersection

	this._chunkLine3.start = ray.origin;

	for (this.dBehind = 0; this.dBehind < this.maxDistance; this.dBehind += this.chunkLength) {

		let dRemain = this.maxDistance - this.dBehind;

		ray.at(Math.min(dRemain, this.chunkLength), this._chunkLine3.end);
		this.raycaster.far = dRemain;

		this.raycastChunk(this._line3, this._chunkLine3);

		// stop if the nearest item or surface is within the chunk.
		if (this.item !== null && this.distance <= this._chunkLine3.distance() + this.dBehind)
			break;

		ray.recast(this.chunkLength); // {line3,chunkLine3}.start move as well
	}

	if (this.item !== null) {
		if (this.item == "Surface") {
			this.item = null;
			this.intersectedSurface = true;
		}

		var p = this.intersectionPoint;
		this._origRay.at(this.distance, p);

		console.assert(p.y > -1e+6 * Number.EPSILON);

		p.y = Math.max(0, p.y);
	}
}


Raycaster.prototype.raycastChunk = function(line3, chunkLine3) {

	var line2 = this._line2.copyFromLine3(chunkLine3);

	Main.area.spatialIndex.processUnitsAlongLine2(line2,
		unit => this.raycastItem(line3, unit) );

	Main.area.spatialIndex.getAllItemsUsingShape(line2)
		.forEach(item => this.raycastItem(line3, item) );
}


Raycaster.prototype.raycastItem = function(line3, item) {

	if (this._checkedItemsById.has(item.id))
		return;

	this._checkedItemsById.set(item.id, true);

	var distance, intersect;

	var result = item.raycast(line3, this);
	if (result === false) {
		return;

	} else if (Array.isArray(result)) { // "intersect" objects from THREE.Raycaster
		if (result.length === 0)
			return;

		intersect = result[0];
		distance = intersect.distance;

	} else {
		distance = result;
	}

	if ( !(distance >= 0) ) {
		console.error(`bad return value:`, result);
		return;
	}

	distance += this.dBehind;
	if (distance < this.distance) {
		this.distance = distance;
		this.item = item;
		if (intersect)
			this.intersect = intersect;
	}
}


Raycaster.prototype.intersectSurface = function(line3) { // performed once

	var dy = line3.start.y - line3.end.y;
	var t = line3.start.y / dy;

	if (dy <= 0 || t < 0 || t > 1) {
		this.inTheSky = true;
		return;
	}

	line3.at(t, line3.end);

	this.inTheSky = false;
	this.distance = line3.distance();
	this.item = "Surface";
	this.surfacePoint.set(line3.end.x, 0, line3.end.z);
}



export { Raycaster };

