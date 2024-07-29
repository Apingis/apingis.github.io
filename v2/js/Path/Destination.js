//
// Reach any 1 of multiple goals.
// Each goal may have associated facing.
// (?) Goals are not far away from each other (<..?)
//
class Destination {

	constructor(radiusClass = 0) { // area?

		if (this.constructor.name == "Destination")
			Report.throw("abstract constructor");

		this._nextGoalPtId = 1;
		this.goalDistanceMargin = PathPlanner.DefaultGoalDistanceMargin;
		//this.boundingCircle = null;

		this.radiusClass = radiusClass;
	}

	getNextGoalPtId() { return VGNodeId.getGoalPt(this._nextGoalPtId ++); }

	setDistanceMargin(d) {
		this.goalDistanceMargin = d;
		return this;
	}

	isPointAtDestination(p) { return this.minDistanceToPoint(p) <= this.goalDistanceMargin; }

	isNodeAtDestination(node) { return !!this.findNodeByNode(node); }


	isEmpty() { console.error(`virtual call`); }

	minDistanceTo() { console.error(`virtual call`); }

	minDistanceToNode(node) { return this.minDistanceTo(node.x, node.y); }

	minDistanceToPoint(p) { return this.minDistanceTo(p.x, p.y); }

	traverseGoals() { console.error(`virtual call`); }
}



class DestinationPoints extends Destination {

	constructor(radiusClass) {

		super(radiusClass);

		this.nodes = [];

		this.nodeFacingById = Object.create(null);
		this.nodeDataById = Object.create(null);

		this.boundingCircle = null; // A must if nodes.length > 1.

		this.finalized = false;
	}


	isEmpty() { return this.nodes.length === 0; }

	count() { return this.nodes.length; }

	//clear() {}


	checkFinalized() {

		if (this.finalized === true)
			return;

		this._computeBoundingCircle();
		this.finalized = true;
	}


	_addNode(node, facing, data, penalty) {

		if (node.id !== undefined)
			console.error(`id=${node.id}`);

		if (!Main.area.spatialIndex.areaContains(node.x, node.y, this.radiusClass))
			return;

		node.id = this.getNextGoalPtId();
		this.nodes.push(node);

		if (facing !== undefined)
			this.nodeFacingById[node.id] = facing;

		if (data !== undefined)
			this.nodeDataById[node.id] = data;

		if (penalty > 0)
			node.addPenalty(penalty);

		return this;
	}


	add(x, y, facing) {
		this._addNode(new VGNode(x, y), facing);
		return this;
	}


	addPoint(p, facing) {
		this._addNode(new VGNode(p.x, p.y), facing);
		return this;
	}


	addVector3(v, facing) {

		console.assert(v instanceof THREE.Vector3);

		this._addNode(new VGNode(v.x, v.z), facing);
		return this;
	}


	addApproachPoints(aPoints, data) {

		console.assert(aPoints.every(aP => aP instanceof ApproachPoint));

		aPoints.forEach(aP => this._addNode(new VGNode(aP.x, aP.y), aP.facing, data) );
		return this;
	}


	addApproachPoint(aP, data, penalty) {

		this._addNode(new VGNode(aP.x, aP.y), aP.facing, data, penalty);
		return this;
	}


	addCircumferenceIntervals(cI, data, setupType, addAngle) {

		console.assert(cI.shapeType == "CircumferenceIntervals");

		var wasEmpty = this.isEmpty();

		cI.processPointsOnIntervals( (angle) => {

			var node = new VGNode().setFromCircleAngle(cI.circle, angle);
			var facing = Angle.opposite(angle);

			if (addAngle)
				facing += addAngle;

			this._addNode(node, facing, data);

		}, setupType);

		return this;
	}

// TODO ^ (using in camera; regular?)
	addOnCircumferenceClosestToPoint(cI, nearestPt, data) {

		var angleToPt = cI.circle.angleToPoint(nearestPt);
		if (!cI.containsAngle(angleToPt))
			return;

		var node = new VGNode().setFromCircleAngle(cI.circle, angleToPt);
		this._addNode(node, Angle.opposite(angleToPt), data);

		console.assert(!this.boundingCircle || this.boundingCircle.radius >= cI.circle.radius);
	}


	_computeBoundingCircle() { // TODO optimize

		if (this.nodes.length <= 1)
			return;

		var points = [];
		this.nodes.forEach(n => points.push(n.x, n.y));
		this.boundingCircle = new Polygon(points).getBoundingCircle();
	}


	traverseGoals(callbackFn) {

		//this.checkFinalized();

		for (let i = 0; i < this.nodes.length; i++)
			callbackFn(this.nodes[i]);
	}


	minDistanceTo(x, y) {

		//this.checkFinalized();

		return Math.sqrt(
			this.nodes.reduce( (dMinSq, node) => {
				return Math.min(dMinSq, node.distanceSqTo(x, y));
			}, Infinity)
		);
	}


	getNodeFacing(node) { return this.nodeFacingById[node.id]; }

	getNodeData(node) { return this.nodeDataById[node.id]; }


	findNodeByNode(node) {

		//this.checkFinalized();
		var d = this.goalDistanceMargin **2;

		for (let i = 0; i < this.nodes.length; i++)
			if (this.nodes[i].distanceSqTo(node.x, node.y) <= d)
				return this.nodes[i];
	}


	findNodeByPoint(p) {

		//this.checkFinalized();

		for (let i = 0; i < this.nodes.length; i++)
			if (this.nodes[i].distanceSqTo(p.x, p.y) <= this.goalDistanceMargin **2)
				return this.nodes[i];
	}


	someWithinSectorLR(sector) {

		//this.checkFinalized();

		if (this.boundingCircle)
			return sector.overlapsCircleByLR(this.boundingCircle);

		if (this.nodes.length !== 1) {

			Report.warn("nodes.length", `len = ${this.nodes.length}`);

			if (this.nodes.length === 0)
				return;
		}

		return sector.containsByAngle(this.nodes[0].x, this.nodes[0].y);
	}


	// ========================================

	show() {

		var data = this._showData.get(this);
		if (data) {

			data.nodes.forEach(n => n.show());
			data.circle && data.circle.show();
			this._showData.delete(this);

		} else {
			data = {
				nodes: Array.from(this.nodes),
				circle: this._boundingCircle
			};

			data.nodes.forEach(n => n.show('destination', 0.12));
			data.circle && data.circle.show('destinationCircle');

			this._showData.set(this, data);
		}

		return this;
	}

}


Object.assign(Destination.prototype, {
	_showData: new WeakMap
});



export { DestinationPoints };

