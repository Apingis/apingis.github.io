
import { VGNode } from './VGNode.js';


class DynamicExpansion {

	constructor(pathLevel, node) {

		this.id = Expansion.nextId ++;

		this.pathLevel = pathLevel;
		this.node = node;

		if (node.expanId !== true)
			Report.warn("already was expanded", `${node} now=${this.id}`);
		node.expanId = this.id;

		this.inPlace = node.expandsInPlace();

		// "Effective Sector", typically different from one in aSData in case of staticVertex
		this.sector = null;

		this.computed = false;
		this.result = ""; // "ComputeError", "Smashed"
		this.smashingTrack = null;

		this.aSData = null;
		this.staticNeighbors = null;
		this.extraNeighbors = null;
		this.neighbors = null;

		this.aSDynamic = null;
		//his.aSD2 = null;

		if (Main.DEBUG >= 5)
			Expansion.byId[this.id] = this;
	}


	remove() {
		this.aSDynamic && this.aSDynamic.remove();
	}


	getCurrentNode() {

		if (this.inPlace) {

			if (this.neighbors[0].f === undefined)
				this.pathLevel.processNeighbor(this.node, this.neighbors[0]);

			return this.neighbors[0];
		}

		var node = this.aSDynamic && this.aSDynamic.getCurrentNode();

		//if (node)
		//	node.fromExpansion = this;

		return node;
	}


	fetchCurrentNode() {
	}


}


DynamicExpansion.nextId = 1;
DynamicExpansion.byId = {};


Object.assign(DynamicExpansion.prototype, {
	_node: new VGNode,
});


// neighbor.angle - normalized.
DynamicExpansion.prototype.getNeighbors = function() {

	if (this.result !== "")
		return;

	if (!this.computed) {
		console.error(`not computed`);
		return;
	}

	if (this.inPlace)
		return this.neighbors;


	//var neighbors;

	if (!this.pathLevel.dynamic) {
		//this.neighbors = this.staticNeighbors.concat(this.extraNeighbors);
		this.neighbors = this.staticNeighbors;
		Array.prototype.push.apply(this.neighbors, this.extraNeighbors);

	} else {
		//neighbors = this.neighbors;
	}

	return this.neighbors;
}


DynamicExpansion.prototype.computeInPlace = function() {

Report.throw("computeInPlace (?)");

	var node = this.node;

	if ( !(node.duration >= 0) )
		Report.throw("inPlace duration", `d=${node.duration}`);

	// 1. No static

	var neighbor = new VGNode(node.x, node.y, this.pathLevel.getNextFreestandingPtId());
	neighbor.g = node.g + node.duration;
	neighbor.addFlags(VGNode.IN_PLACE);

	if (node.isGoal()) {

		neighbor.angle = this.pathLevel.dst.getNodeFacing(node);
		if (neighbor.angle === undefined)
			neighbor.angle = node.angle;
		neighbor.addFlags(VGNode.PRIORITY);


	} else if (node.isEpisodeStart()) {

		neighbor.addFlags(VGNode.PRIORITY);
	}

//console.log(`computeInPlace isGoal=${node.isGoal()} isStart=${node.isEpisodeStart()}`);


	if ( !PathPlanner.checkAndHandleCollision(this.pathLevel.unit, this.pathLevel.area,
			node, neighbor) ) {
//this.result = ?
		return;
	}

	this.neighbors = [ neighbor ];
}


DynamicExpansion.prototype.compute = function() {

	this.computed = true;

	if (this.inPlace)
		return this.computeInPlace();

	//
	//   Workflow
	// 1. get ASData
	//
	this.aSData = ASData.get(this.node, this.pathLevel);

	if (!this.aSData) {
		Report.warn("no ASData", `id=${this.id} node.id=${this.node.id}`);
		this.result = "ComputeError";
		return;
	}

	this.sector = this.aSData.getEffectiveSector(this.node.angle);

	if (!this.sector) {
		this.result = "ComputeError";
		return;
	}

	this.staticNeighbors = this.aSData.getNeighborsInSector(this.sector);

	// 2. compute extra points. (affected by upperData)
	//if (this.pathLevel.upperData && this.upperDataVersion < this.pathLevel.upperData.version) {
	//}

	this.createExtraNeighbors();


	// 3. dynamic. different workflow.
	if (!this.pathLevel.dynamic)
		return;


/*
	this.aSDynamic = new ASDynamic(this.pathLevel, this.aSData, this.sector, this.node.g);

	var result;
	if ( (result = this.aSDynamic.createData()) !== true) {
		//console.error(`DynamicExpansion.byId[${this.id}] aSDynamic.createData: ${result}`); // can't expand
		this.result = "Smashed";
		this.smashingTrack = this.aSDynamic.smashingTrack;
		return;
	}

	this.aSDynamic.setExtraPoints(this.extraNeighbors);

	this.neighbors = this.aSDynamic.processDynamicEvents();
*/


	this.aSDynamic = new ASDynamic(this.pathLevel, this.aSData, this.node, this.sector);
	this.aSDynamic.initStatic(this.staticNeighbors);//, this.extraNeighbors);

	this.extraNeighbors.forEach(p => {

		if (!this.sector.containsVGNode(p))
			return;

		p.angle = this.sector.localizeAngle(p.angle);
		this.aSDynamic.addDynamicPoint(p);
	});


	if (!this.aSDynamic.processTracks()) {

		this.result = "Smashed";
		this.smashingTrack = this.aSDynamic.smashingTrack;
		return;
	}

	this.neighbors = this.aSDynamic.getNeighbors();

/*
this.n2 = n2;
if (this.id > 0 && this.id < 40000) {
if (1) {

	if (this.neighbors.length !== n2.length) {
		console.warn(`DynamicExpansion.byId[${this.id}] n=${this.neighbors.length} n2=${n2.length}`);
	}

	this.neighbors.sort((a, b) => a.x - b.x);
	n2.sort((a, b) => a.x - b.x);

	for (let i = 0; i < Math.min(this.neighbors.length, n2.length); i++) {
		if ( !this.neighbors[i].inSameLocationDelta(n2[i]) ) {
			console.log(`!inSameLocation i=${i}`);
			break;
		}
	}
}
*/
//if (this.id >= 40000) { AI.stop(); AI.throw(); }


}


// TODO more clean
DynamicExpansion.prototype.createExtraNeighbors = function() {

	this.extraNeighbors = [];

	var upperData = this.pathLevel.upperData,
		node = this.node;

	var nextILine = upperData && upperData.nextIntermediateLine(node);
	if (nextILine) { // TODO? consider several iLines forth of node

		let t = nextILine.parameterClosestPointTo(node.x, node.y);
		if (t <= 0) { // < .01 ?

			this.checkAddExtraNode(upperData.nextWayPoint(node), false, true);

		} else {

			let p = nextILine.getPointAt(Math.min(t, 1));
			if (t != 1) {
				// TODO sharp angle - can walk into obstacle?
				let angle = node.angleTo(p.x, p.y);
				p.move(angle, 1e-7); // TODO compute real min.
			}

			let nextWP = this._node.set(p.x, p.y, this.pathLevel.getNextFreestandingPtId());
			this.checkAddExtraNode(nextWP);
		}
	}

	this.addDestination(nextILine);
}


DynamicExpansion.prototype.checkAddExtraNode = function(nextNode, // node is cloned if added.
		noIntermediate, // Do not add intermediate pts.
		isVertex // Vertex which would be added as usual if distance permits
		) {

	var sector = this.aSData.sector; // this.sector?

	var polar = sector.getLocalizedPolar(nextNode.x, nextNode.y);
	if (polar.phi > sector.left)
		return;

	if (polar.r <= sector.radius) {

		if (isVertex === true)
			return;

		if (polar.r > this.aSData.distanceToStatic(polar.phi))
			return;

		let dstNode = nextNode.clone();
		dstNode.angle = Math.atan2(nextNode.y - sector.y, nextNode.x - sector.x);
		this.extraNeighbors.push(dstNode);


	} else if (!noIntermediate) { // Not within sector radius - requires to insert extra pt.

		console.assert(this.pathLevel.level === 0);

		let diameterPolygonMax = 2 * (
			PathPlanner.ItemRadiusByLevel[1]
			+ Unit.radiusByRC(this.pathLevel.radiusClass)
		) + 1e-3;

		let dAdvance = sector.radius - diameterPolygonMax;

		let dToStatic = this.aSData.distanceToStatic(polar.phi);

		dAdvance = Math.min(dAdvance, 0.5 * dToStatic);

		if (dAdvance < 0.5) // 0.5m
			return;

		let wP = this.node.getByAngleDistance(polar.phi, dAdvance,
			this.pathLevel.getNextFreestandingPtId() );

		this.extraNeighbors.push(wP);

		// Prevent catwalking or worse; duplicate possible expansions (bad)

		let maxR = PathPlanner.SectorRadiusByLevel[this.pathLevel.level] - 1e-3;

		if (dToStatic < maxR)
			return;

		wP = this.node.getByAngleDistance(polar.phi, maxR,
			this.pathLevel.getNextFreestandingPtId() );

		this.extraNeighbors.push(wP);
	}
}


DynamicExpansion.prototype.addDestination = function(nextILine) {

	// PL1 ?? sector.r++

	// Goal: gets added if in the sector
	// If out of sector by distance: it gets added only if no nextILine
	var noIntermediates = nextILine ? true : false;

	var dst = this.pathLevel.dst;

	if (dst.count() === 1) {
		this.checkAddExtraNode(dst.nodes[0], noIntermediates);
		return;
	}

	var sector = this.aSData.sector; // this.sector?
	if (!dst.someWithinSectorLR(sector))
		return;

	var d = sector.distanceToCircle(dst.boundingCircle);
	if (d > 2 * sector.radius && d > 3 * dst.boundingCircle.radius) {

		// Enough far away; process as single pt.
		let nextWP = this._node.set(dst.boundingCircle.x, dst.boundingCircle.y,
				this.pathLevel.getNextFreestandingPtId());
		this.checkAddExtraNode(nextWP);
		return;
	}

	// Adding goals as next WP's.
	dst.traverseGoals(node => this.checkAddExtraNode(node, noIntermediates));
}



// ==========================
//
//   Debug
//
// ==========================

Object.assign(DynamicExpansion, {

	find(x, y) {

		console.assert(isFinite(x + y));

		var result = [];

		Object.keys(DynamicExpansion.byId).forEach(id => {

			var e = DynamicExpansion.byId[id];
			if (e.node.distanceTo(x, y) < 0.5)
				result.push(e);
		});

		return result;
	},


	findByTSId(tSId) {

		return Object.values(DynamicExpansion.byId).find(e => {
/*
			var i = e.aSDynamic && e.aSDynamic.debug.trackSolvers.findIndex(tS => tS.id === tSId);
			if (typeof i == "number" && i !== -1) {
				console.log(`DynamicExpansion.byId[${e.id}].aSDynamic.debug.trackSolvers[${i}]`);
				return true;
			}
*/
			if (!e.aSDynamic)
				return;

			for (let key in e.aSDynamic.trackSolvers) {

				let tS = e.aSDynamic.trackSolvers[key];
				if (tS.id === tSId) {
					console.log(`DynamicExpansion.byId[${e.id}].aSDynamic.trackSolvers[${key}]`);
					return true;
				}
			}
		});
	},


	byNode(node) {
		return Object.values(DynamicExpansion.byId).find(e => e.node === node);
	},

});


Object.assign(DynamicExpansion.prototype, {

	prev() { return DynamicExpansion.byNode(this.node.parent); },

	getPoint() { return this.node.getPoint().clone(); },

	showOrigin() {
		this.node.show(this.result ? "asOriginSmashed" : "asOrigin",
			Unit.RadiusClass[this.pathLevel.radiusClass]);
	},

	getArriveLine() {
		var p = this.node.parent;
		if (p)
			return new Line2().set(p.x, p.y, this.node.x, this.node.y);
	},


	_showPathData: new Map,


	showPath() {

		var data = this._showPathData.get(this);
		if (data) {

			data.lines.forEach(l => l.show());
			data.points.forEach(p => p.show());
			this._showPathData.delete(this);
			return;
		}

		data = { lines: [], points: [] };

		for (let n = this.node; n; n = n.parent) {

			if (n.parent)
				data.lines.push( new Line2().set(n.parent.x, n.parent.y, n.x, n.y).show() );

			data.points.push( n.getPoint().clone().show('red', 0.05) );
		}

		this._showPathData.set(this, data);
	},

});


DynamicExpansion.prototype.show = function() {

	if (this.inPlace) {

		console.log("inPlace expansion");
		this.node.show('dSegment', 0.4);
		return this;
	}

/*
	if (!this.pathLevel.dynamic || this.aSDynamic) {

		this.extraNeighbors.forEach(n => {
			n.show('extraNeighbor', 0.14);
		});

		if (this.aSData) {
			this.aSData.show();
			this.aSData.sector.show(); // turn off aSData.sector!
			this.aSData.sector.showOrigin();
		}

		this.showOrigin();

		this.sector.show();

		this.aSDynamic && this.aSDynamic.show();
	}
*/

	if (!this.aSDynamic) {
		console.assert(!this.pathLevel.dynamic);

		this.extraNeighbors.forEach(n => {
			n.show('extraNeighbor', 0.14);
		});

		if (this.aSData) {
			this.aSData.show();
			this.aSData.sector.show(); // turn off aSData.sector!
			this.aSData.showOrigin();
		}

		this.sector.show();
		this.showOrigin();


	} else {
		console.assert(this.pathLevel.dynamic);

		this.showOrigin();
		this.sector.show();
		this.aSDynamic.show();
	}

	return this;
}



export { DynamicExpansion };

