
class PathLevel_A_Star {

	constructor(arg) {

		this.unit = arg.unit;
		this.unitSpeed = arg.unitSpeed || arg.unit && arg.unit.speed || 1;
		this.radiusClass = arg.radiusClass || arg.unit && arg.unit.radiusClass || 0;
		this.dynamic = arg.dynamic;

		// DynamicPathLevelA_Star, DynamicExpansion: different thing, w/ updates of partially computed
		console.assert(!this.dynamic);

		this.area = arg.area;
		this.level = arg.level || 0; //*? (spatialLevel)
		this.upperData = arg.upperData;

		this.sectorRadius = arg.sectorRadius || PathPlanner.SectorRadiusByLevel[this.level]
			|| PathPlanner.SectorRadiusMax; //*

		var startPt = arg.startPt;
		if (!startPt || !(startPt instanceof Point))
			Report.throw("bad startPt", `${startPt}`);

		this.startPt = startPt;
		this.atStart = true;

		this.dst = arg.dst;
		//if (!this.dst)
		//	Report.throw("it requires dst");

		if (this.dst)
			this.dst.checkFinalized();

		this.startTime = arg.startTime || (this.dynamic ? Engine.time : 0);
		this.startG = this.startTime;

		this.actionAtStartDuration = arg.actionAtStartDuration || 0;
		this.actionAtGoalDuration = arg.actionAtGoalDuration || 0;

		this.episodeId = arg.episodeId;

		this.height = arg.height || 0;
		this.epsilon1 = arg.epsilon1 || 1.03;
		this.expanCountMax = arg.expanCountMax || 500;


		this.expanCount = 0;
		this.completed = false;

		this.result = ""; // "LimitReached", "OpenSetExhaustion", "ComputeError", "SmashedAtStart"
		this.resultData = null;

		this.nextFreestandingPtId = 1;
		this.nextDynamicPtId = 1;

		this.openSet = new Heap( (a, b) => a.f - b.f, node => node.getBaseId() );

		this.closedSet = Object.create(null);
		//this.headingNode = null; // fetched; before expansion, not in open or closed set.

		//prop. in VGNode this.trackIdByNodeId = this.dynamic ? Object.create(null) : null;
		//this.expanCountByTrackId = this.dynamic ? Object.create(null) : null;
		this.expanCountByInPlaceUnitLocation = this.dynamic ? Object.create(null) : null;

		this.expanById = Object.create(null);

		this.wayPoints = null;

		if (Main.DEBUG >= 5)
			this.expan = [];
	}


	getNextFreestandingPtId() {
		return VGNodeId.getFreestandingPt(this.nextFreestandingPtId ++);
	}

	getNextDynamicPtId(unitLeftSign) {
		return VGNodeId.getDynamicPt(this.nextDynamicPtId ++, unitLeftSign > 0 ? 1 : 2);
	}


	computePath() {

		this.wayPoints = this.run_A_Star();

		if (!this.wayPoints) {
			//Messages.add(`${this.unit}: can't find path level=${this.level}`);

		} else {
		}

		return this.wayPoints;
	}


	getPathLevelData() {

		var data = new PathLevelData(this);
		data.setup(this.wayPoints);
		return data;
	}


	computePartial(advanceG, limitG = advanceG) {

		console.assert(advanceG > this.startG && limitG >= advanceG);

		this.wayPoints = this.run_A_Star(limitG);

		if (this.wayPoints === true) { // partial run OK
			this.wayPoints = this.getPartialPath(advanceG, limitG);
		}

		return this.wayPoints;
	}


	getPartialPath(advanceG, limitG) {
//console.error(`getPartialPath`);
		var wayPoints = this.reconstructPath(this.openSet[0]);

		for (let i = 1; i < wayPoints.length - 1; i++)

			if (wayPoints[i].g >= advanceG && wayPoints[i + 1].g > advanceG) {
				wayPoints.length = i + 1;
				break;
			}

		return wayPoints;
	}


	removeAlreadyTravelled(currentG) {

		// The node the unit currently moves to, must remain unchanged.
		var node1 = this.wayPoints.find(wP => wP.g >= currentG);

var nRemoved=0;
		Array.from(this.openSet).forEach(node => { // .filterInPlace?

			if (node.g < currentG || !node.hasPredecessor(node1)) {
				this.openSet.remove(node);
				nRemoved++;
//if (this.unit.id==2)
//console.warn(`uId=${this.unit.id} removed: ${node}`, node);
			}
		});
console.log(`uId=${this.unit.id} openSet: nRemoved=${nRemoved} nRemains=${this.openSet.length}`);

		// closedSet - not touched (mb. remove outdate dynamic & freestanding?)

		//this.expanById[expansion.id]

/*
		for (let id in this.expanByNodeId) {

			let expan = this.expanByNodeId[id];

			if (expan.node.g < node.g || !expan.node.hasPredecessor(node))
				delete this.expanByNodeId[id];
		}
*/
	}


	remove() { // A must.

		Util.forEachKey(this.expanById, (expan, id) => {

			expan.remove();
		});
	}


	// ==============================
	//
	//   A - Star
	//
	//    Returns:
	//
	// undef: finished, no path
	// wayPoints: finished
	// true: partial run OK
	//
	// ==============================

	init_A_Star() {

		this.atStart = false;

		var startNode = new VGNode(this.startPt.x, this.startPt.y, this.getNextFreestandingPtId());
		startNode.g = this.startG;
		startNode.f = this.startG; // the only thing in the heap
		startNode.addFlags(VGNode.EPISODE_START);
		startNode.episodeId = this.episodeId;

		if (this.actionAtStartDuration) {

			console.assert(this.dynamic);
			startNode.setExpandsInPlace(this.actionAtStartDuration);
			startNode.addFlags(VGNode.PRIORITY);
		}

		if (this.upperData)
			startNode.wPIndex = 0;

		this.openSet.insert(startNode);
		return true;
	}


	run_A_Star(limitG) {

		if (this.atStart)
			if (!this.init_A_Star())
				return;

		while (this.openSet.length > 0) {// || this.headingNode) {

			let currentNode = this.openSet[0];

			if (limitG && currentNode.g >= limitG && !currentNode.isGoal()// && !currentNode.hasPriority()) {
					&& !(currentNode.parent && currentNode.parent.isGoal()) ) {

				if (VGNode.DEBUG)
					currentNode.debug.fetch = `STOP partialRun g=${currentNode.g} expanCount=${this.expanCount}`;

				return true;
			}

			if (this.expanCount === this.expanCountMax) {

				this.result = "LimitReached";

//console.error(`search expanCount=${this.expanCount} reached Episode.byId[${this.episodeId}]`);
//window.limitCnt = (window.limitCnt || 0) + 1;
//if (window.limitCnt === 1) { AI.stop(); AI.throw(); }
				return;
			}

			//currentNode = this.openSet.fetch();
			this.openSet.fetch();

			if ( !(currentNode.id >= 0) || !Number.isFinite(currentNode.g + currentNode.f) ) {
				Report.warn("bad currentNode", `${currentNode}`);
				continue;
			}

			if (this.openSet[0] && !(currentNode.f <= this.openSet[0].f)) {
				Report.warn("corrupted heap", `${currentNode} ${this.openSet[0]}`);
				continue;
			}

			if (VGNode.DEBUG)
				currentNode.debug.fetch = `FETCHED expanCount=${this.expanCount}`;


			if (currentNode.isGoal()) {

				if (!this.actionAtGoalDuration)
					return this.onCompleted(currentNode);

				currentNode.setExpandsInPlace(this.actionAtGoalDuration);

			} else if (this.actionAtGoalDuration && currentNode.parent && currentNode.parent.isGoal()) {

				return this.onCompleted(currentNode);
			}


			let baseId = currentNode.getBaseId();

			if (VGNode.DEBUG && this.closedSet[baseId]) { // Must not happen.

				let fClosed = this.closedSet[baseId].f; // Must be better than current.
				Report.warn("already in closed set", `fClosed=${fClosed} f=${currentNode.f} id=${baseId}`);
				continue;
			}

			this.closedSet[baseId] = currentNode;
			
			if ( !this.expandNode(currentNode) )
				return;

		} // while(openSet.length)

		if (this.result === "")
			this.result = "OpenSetExhaustion";
	}


	onCompleted(goalNode) {

		this.completed = true;

		var wayPoints = this.reconstructPath(goalNode);

		return wayPoints;
	}


	reconstructPath(targetNode) {

		var wayPoints = new WayPoints;

		for (let node = targetNode; node; node = node.parent)
			wayPoints.push(node);

		if (wayPoints.length < 2)
			Report.throw("bad wayPoints", `${wayPoints}`);

		return wayPoints.reverse();
	}


	expandNode(currentNode) {

		// Prohibit circling around standing unit
		if (VGNodeId.isDynamicPt(currentNode.id) && currentNode.aroundTrack.isInPlace()) {

			var key = currentNode.aroundTrack.keyToInPlaceUnitLocation();
			var count = this.expanCountByInPlaceUnitLocation[key] || 0;

			if (count >= PathPlanner.TRACK_COUNT_MAX)
				return true;

			this.expanCountByInPlaceUnitLocation[key] = count + 1;
		}


		var expansion = this.getExpansion(currentNode);
		if (!expansion)
			return true;

		this.expanCount ++;

		if (this.expanCount === 1 && expansion.result !== "") {

			if (expansion.result == "ComputeError") {

				this.result = "ComputeError";

			} else if (this.dynamic && expansion.result == "Smashed") {

				// collision at origin: no neighbors, expansion is not usable.
				// distinguish: errors reported where happened.

				this.result = "SmashedAtStart";
				this.resultData = expansion.smashingTrack;

			} else
				Report.throw(`unknown result=${expansion.result}`);

			return false; // stop algorithm; return no path (nothing in openSet)
		}


		var neighbors = expansion.getNeighbors();
		if (!neighbors)
			return true;

		for (let i = 0; i < neighbors.length; i++) {

			let result = this.processNeighbor(currentNode, neighbors[i]);
			if (result)
				this.insertNodeIntoOpenSet(neighbors[i]);
		}

		return true;
	}


	getExpansion(node) {
/*
		// id, arriveAngle unchanged: same neighbors
		// upperData unchanged: same extraNeghbors /(often if changed)
		// dynamic:
		if (expansion && expansion.arriveAngle == node.angle) {
			// reuse existing one
console.log(`using from cache level=${this.level} id=${node.id}`);

		} else {
*/

		if (this.dynamic) {
			if ( !PathPlanner.checkAndReportTrackToNodeExpansion(this, node) )
				return;
		}

		var expansion = new Expansion(this, node);
		expansion.compute(); // can be an errorneous expansion

		this.expanById[expansion.id] = expansion;

		if (Main.DEBUG >= 5)
			this.expan.push(expansion);

		return expansion;
	}


	processNeighbor(node, neighbor) {

		neighbor.episodeId = this.episodeId;
		neighbor.parent = node;

		var result = neighbor.isInPlace()
			? this.processNeighborInPlace(node, neighbor)
			: this.processNeighborRegular(node, neighbor);

		return result;
	}


	processNeighborInPlace(node, neighbor) {

		console.assert(this.dynamic);

		if (node.wPIndex !== undefined)
			neighbor.wPIndex = node.wPIndex;

		// g: already set
		neighbor.f = neighbor.g + Heuristic.get(neighbor, this);

		// adjust f for action at goal (let it weight nothing)
		if (node.isGoal())
			neighbor.f -= neighbor.g - node.g;

		if (VGNode.DEBUG)
			neighbor.debug.process = "GO_IN_PLACE " + neighbor.g;

		return true;
	}


	processNeighborRegular(node, neighbor) { // wPIndex, g, h

		if (this.upperData && this.upperData.checkNeighborWPIndex(node, neighbor) === false) {

			if (VGNode.DEBUG)
				neighbor.debug.process = "DISCARD";

			if (neighbor.isGoal())
				Report.warn("discard GOAL");//, `id=${neighbor.id}`);

			return;
		}


		neighbor.g = node.g + node.distanceToVGNode(neighbor) / this.unitSpeed;

		neighbor.f = neighbor.g + Heuristic.get(neighbor, this);

		// (NO!) G-values may be modified later (add-up start time; to wayPoints)
		if (VGNode.DEBUG)
			neighbor.debug.process = "GO " + neighbor.g;

		return true;
	}


	insertNodeIntoOpenSet(node) {

		var insertIntoOpenSet = node => {

			this.openSet.insert(node);

			if (VGNode.DEBUG)
				node.debug.openSet = "INSERTED";
		}


		if (VGNodeId.isFreestandingPt(node.id) || VGNodeId.isDynamicPt(node.id)) {

			insertIntoOpenSet(node);
			return;
		}

		// The following applies only to nodes AtStaticVertex and Goals.

		var baseId = node.getBaseId();

		var nodeInClosedSet = this.closedSet[ baseId ];
		if (nodeInClosedSet) {

			if (VGNode.DEBUG)
				node.debug.openSet = "already in closedSet";

			if (nodeInClosedSet.f <= node.f) { // same baseId already processed, has better f.

				return;

			} else { // same baseId already processed, has worse f.

				// Remove from closedSet, add to openSet issues:
				// - successors?
				return;
			}
		}


		var nodeInOpenSet = this.openSet.getObjById(baseId);
		if (!nodeInOpenSet) {

			insertIntoOpenSet(node);
			return;
		}

		if (nodeInOpenSet.f <= node.f) {

			if (VGNode.DEBUG)
				node.debug.openSet = "already in openSet";
			return;
		}

		this.openSet.remove(nodeInOpenSet);

		insertIntoOpenSet(node);
	}


	// =============================
	//
	//   DEBUG
	//
	// =============================

	prevExpansion(id) {

		console.assert(Main.DEBUG >= 5);

		var expansion = Expansion.byId[id];
		if (!expansion) {
			console.warn(`expansion id=${id} doesn't exist`);
			return;
		}

		expansion = this.expansionCache[expansion.node.parent.id];
		if (!expansion) {
			console.warn(`expansion for node.id=${node.parent.id} doesn't exist`);
			return;
		}

		console.log(`prevExpansion.id=${expansion.id}`);
		return expansion;
	}


	findExpan(x, y) {

		console.assert(Main.DEBUG >= 3 && x && y);

		var distance = Infinity,
			index;

		this.expan.forEach((expan, i) => {
			var d = expan.getPoint().distanceTo(x, y);
			if (d < distance) {
				distance = d;
				index = i;
			}
		});

		if (index >= 0) {
			console.log(`expan[${index}]`);

		} else {
			console.log(`Not found (expan.length=${this.expan.length})`);
		}
	}


	show() {

		var data = this._showData.get(this);

		if (data) {
			data.tracks.forEach(line2 => line2.show());
			this._showData.delete(this);
			return;
		}

		data = { tracks: [] };

		for (let i = 1; i < this.wayPoints.length - 1; i++) {

			data.tracks.push(new Line2(
				this.wayPoints[i - 1].getPoint().clone(),
				this.wayPoints[i].getPoint().clone()
			).show("wayPoint") );
		}

		this._showData.set(this, data);
	}

}


PathLevel_A_Star.prototype._showData = new Map;



export { PathLevel_A_Star };

