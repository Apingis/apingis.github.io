
class AngularSweep {

	constructor(area, level, radiusClass, sector) {


		if (0  && Main.DEBUG >= 5) {
			this.id = AngularSweep.nextId ++;
			AngularSweep.byId[this.id] = this;
		}

		this.area = area;
		this.level = level;
		this.radiusClass = radiusClass;

		this.sector = sector;
		this.x = sector.x;
		this.y = sector.y;
		this.left = sector.left;
		this.leftRounded = AngularData.roundAngle(sector.left);
		this.right = sector.right;
		this.height = 0;

		this.basePolygon = null; // in case AS is created at static vertex
		this.baseVertex = undefined;
		this.basePolygonProcessed = false;

		//this.arriveAngle = undefined;

		this.mPLine = [];

		this.prevAngle = undefined; // temporary vars.
		this.lastPt = false;
		this.lastPtX = undefined;
		this.lastPtY = undefined;
		this.prevInSector = false;

		this.events = [];
		this.sweepLine = new AngularSweepLine(this.mPLine);
/*
		this.segmentsHeap = new Heap((a, b) => { // TODO optimized heap
			return this.sweepLine.distanceToMPLine(a)
				- this.sweepLine.distanceToMPLine(b);
		});
*/
		//this.segmentsHeap = new HeapHCF(a => this.sweepLine.normalizedDistanceToMPLine(a));
		this.segmentsHeap = new HeapHCF(AngularSweepLine.prototype.normalizedDistanceToMPLine
			.bind(this.sweepLine));

		this.flatSegments = [];
		this.flatPoints = [];

		//this.vGPts = null;

	}

	toString() {
		//var unitStr = this.unit ? ` unit.id=${this.unit.id}` : "";
		return `[AngularSweep id=${this.id}`//${unitStr}`
			+ ` x=${Util.toStr(this.x)} y=${Util.toStr(this.y)}]`;
	}


	static create(area, level, sectorRadius, radiusClass, x, y, left, right) {

		var sector = new Sector(x, y, sectorRadius, left, right);

		var aS = new AngularSweep(area, level, radiusClass, sector);

		return aS;
	}


	static createFromStaticVertex(area, level, sectorRadius, radiusClass, id) {

		console.assert(VGNodeId.isAtStaticVertex(id));

		var basePolygon = VGNodeId.polygon(id, radiusClass),
			baseVertex = VGNodeId.vertexIndex(id),
			flagLeftSign = VGNodeId.flagLeftSign(id);

		var right, left;

		if (flagLeftSign == 1) {
			left = basePolygon.nextEdgeAngle(baseVertex);
			right = basePolygon.prevEdgeAngle(baseVertex);
			//right = arriveAngle;

		} else {
			left = basePolygon.oppositeNextEdgeAngle(baseVertex);
			//left = arriveAngle;
			right = basePolygon.oppositePrevEdgeAngle(baseVertex);
		}

if ( !AppConfig.isDemo2() ) {
		// It allows only polygons with inward vertex angles >= 90deg. // TODO why? cGroup!
		// This might be unit inside polygon.
		if (Angle.diffInDirection(left, -1, right) > (Math.PI / 2 + 1e-9)) {

			//console.error(`ptId=${id} bad polygon right=${right} left=${left}`);
			//return;
			Report.once(`ptId=${id} bad polygon`, `right=${right} left=${left}`); // it works
		}
}

		[ left, right ] = Angle.normalizeLR(left + 1e-12, right - 1e-12); // epsilon add-up
		//[ left, right ] = Angle.normalizeLR(left, right);

		var x = basePolygon.points[baseVertex],
			y = basePolygon.points[baseVertex + 1];

		var aS = this.create(area, level, sectorRadius, radiusClass, x, y, left, right);

		aS.basePolygon = basePolygon;
		aS.baseVertex = baseVertex;

		return aS;
	}



	static createFromVGNode(node, area, level, sectorRadius, radiusClass) {

		var id = node.id;
		var aS;

		if (VGNodeId.isAtStaticVertex(id)) {
			aS = this.createFromStaticVertex(area, level, sectorRadius, radiusClass, id);

		} else {
			let left, right;

			if (VGNodeId.isDynamicPt(id)) {

				let width = Math.PI * 0.75; // TODO compute precise "go-ahead"

				if (VGNodeId.flagLeftSign(id) > 0) { // flagLeft
					right = node.angle;
					left = right + width;

				} else {
					left = node.angle;
					right = left - width;
				}

			} else if (VGNodeId.isFreestandingPt(id)) {

				// start pt. has no angle, use default L/R
				if (Number.isFinite(node.angle)) {
					let halfWidth = Math.PI / 4;
					left = node.angle + halfWidth;
					right = node.angle - halfWidth;
				}

			} else {
				console.error(`N/A: AngularSweep on pt.id=${id}`);
				return;
			}


			if (left !== undefined)
				[ left, right ] = Angle.normalizeLR(left, right);

			aS = this.create(area, level, sectorRadius, radiusClass, node.x, node.y, left, right);
		}

		return aS;
	}


	// ================================================================

	show() {
		this.sector.show();
		this.showOrigin();
		return this;
	}

}

AngularSweep.nextId = 1;
AngularSweep.byId = {};



export { AngularSweep };

