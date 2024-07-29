
class DynamicPathLevel_A_Star {

	constructor(arg) {

		this.unit = arg.unit;
		this.unitSpeed = arg.unitSpeed || arg.unit && arg.unit.speed || 1;
		this.radiusClass = arg.radiusClass || arg.unit && arg.unit.radiusClass || 0;
		this.dynamic = arg.dynamic;

		this.area = arg.area;
		this.level = arg.level || 0; //*? (spatialLevel)
		this.upperData = arg.upperData;

		this.sectorRadius = arg.sectorRadius || PathPlanner.SectorRadiusByLevel[this.level]
			|| PathPlanner.SectorRadiusMax; //*

		this.startNode = arg.startNode;
		if (this.startNode && !(this.startNode instanceof VGNode))
			Report.throw("bad startNode", `${startNode}`);

		this.currentStartNode = null;

		var startPt = arg.startPt;
		if (!this.startNode && (!startPt || !(startPt instanceof Point)) )
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

		if (arg.actionAtStartDuration || arg.actionAtGoalDuration)
			Report.throw("obsolete");

		this.episodeId = arg.episodeId;

		this.height = arg.height || 0;
		this.epsilon1 = arg.epsilon1 || 1.03;
		this.expanCountMax = arg.expanCountMax || 500;


		this.expanCount = 0;
		this.completed = false;

		this.result = ""; // "LimitReached", "OpenSetExhaustion", "ComputeError", "SmashedAtStart", "TrackCollision"
		this.resultData = null;

		this.nextFreestandingPtId = 1;
		this.nextDynamicPtId = 1;

		this.expan = [];

		this.closedSet = Object.create(null);

		this.expanCountByInPlaceUnitLocation = this.dynamic ? Object.create(null) : null;

		this.wayPoints = null;
	}

	toString() {
		var dynamicStr = this.dynamic ? " Dynamic" : "";
		return `[PathLevel=${this.level}${dynamicStr} res="${this.result}"`
			+ ` uId=${this.unit && this.unit.id}`
			+ `]`;
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
//console.log( "computePartial result", this.wayPoints && this.wayPoints.map(wP => wP + '').join(' ') );
		return this.wayPoints;
	}


	getPartialPath(advanceG, limitG) {
//console.error(`getPartialPath`);

		var currentNode = this.getCurrentNode();

		var wayPoints = this.reconstructPath(currentNode);

		for (let i = 1; i < wayPoints.length - 1; i++)

			if (wayPoints[i].g >= advanceG && wayPoints[i + 1].g > advanceG) {
				wayPoints.length = i + 1;
				break;
			}

		return wayPoints;
	}


	removeAlreadyTravelled(currentG) { // TODO this is called each frame

		// - The node the unit currently moves to, must remain unchanged.
		// - The node the unit currently moves from, must remain unchanged.
		//   Its other successors should not be considered.

		var currentDstNode = this.wayPoints.find(wP => wP.g >= currentG);
		if (!currentDstNode)
			return Report.warn("destination node not found", `${this}`);

		// currentStartNode is set for the next run.
		this.currentStartNode = currentDstNode.isExpanded() ? null : currentDstNode;

		// Remove obsolete expansions.

		for (let i = 0; i < this.expan.length; i++) {

			let node = this.expan[i].node;

			if ( !node.hasPredecessor(currentDstNode) ) {

				this.expan[i].remove();
				Util.cut(this.expan, i --);
			}
		}
	}


	remove() { // A must.

		for (let i = 0; i < this.expan.length; i++) {

			this.expan[i].remove();
		}
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

	getStartNode() {

		var startNode;

		if (this.startNode) {

			startNode = this.startNode;
			startNode.id = this.getNextFreestandingPtId();

			startNode.parent = null;

		} else {

			startNode = new VGNode(this.startPt.x, this.startPt.y, this.getNextFreestandingPtId());
			startNode.g = this.startG;
		}

		startNode.f = startNode.g; // (no heap) the only thing in the heap
		startNode.flags = VGNode.EPISODE_START;
		startNode.episodeId = this.episodeId;

		if (this.upperData)
			startNode.wPIndex = 0;

		return startNode;
	}


	getCurrentExpansion() {

		var currentExpansion, minF = Infinity;

		this.expan.forEach(expan => {

			//if (expan.result !== "")
			if (!expan.node.hasCleanPredecessors())
				return;

			var node = expan.getCurrentNode();
			console.assert(!node || node.f);

			if (node && node.f < minF) {
				currentExpansion = expan;
				minF = node.f;
			}
		});

		return currentExpansion;
	}


	getCurrentNode(arg) {

		console.assert(!arg);

		if (this.atStart) {
			this.atStart = false;
			return this.getStartNode();
		}

		if (this.currentStartNode) {

			let node = this.currentStartNode;

			this.currentStartNode = null;
			return node;
		}

		var expan = this.getCurrentExpansion();

		return expan && expan.getCurrentNode();
	}


	run_A_Star(limitG) {

		while (1) {

			let currentNode = this.getCurrentNode();
			if (!currentNode) {
				break;
			}

			console.assert(!currentNode.isDiscarded());

			if (limitG && currentNode.g >= limitG && !currentNode.isGoal()// && !currentNode.hasPriority()) {
					&& !(currentNode.parent && currentNode.parent.isGoal()) ) {
//console.error(`TODO`);
				if (VGNode.DEBUG)
					currentNode.debug.fetch = `STOP partialRun g=${currentNode.g} expanCount=${this.expanCount}`;

				return true;
			}

			if (this.expanCount === this.expanCountMax) {

				this.result = "LimitReached";
				return;
			}

			if ( !(currentNode.id >= 0) || !Number.isFinite(currentNode.g + currentNode.f) ) {
				Report.warn("bad currentNode", `${currentNode}`);
				continue;
			}

			if (VGNode.DEBUG)
				currentNode.debug.fetch = `FETCHED expanCount=${this.expanCount}`;

			//if (currentNode.fromExpansion) // fetch does nothing
			//	currentNode.fromExpansion.fetchCurrentNode();

console.assert(!currentNode.expanId);
currentNode.expanId = true; // will be expanding; remove from non-expanded (GOAL?)

			if (currentNode.blockedBy) {
//console.log(`blockedBy, will go myId=${this.unit.id} blockedBy=${currentNode.blockedBy.unit.id}`);

//currentNode.flags |= VGNode.DISCARDED;
				this.processBlockedNode(currentNode);

				if (currentNode.isDiscarded()) {
					//console.log(`discarded ${currentNode}`);
					continue;
				}
			}


			if (this.dynamic && !PathPlanner.checkAndReportTrackToNodeExpansion(this, currentNode) ) {

				//this.result = "TrackCollision";
				//return;
				currentNode.setDiscarded();
				continue;
			}


			if (currentNode.isGoal())
				return this.onCompleted(currentNode);

			//
			// closed set issue. Just skip for simplicity (no big gain here), consider same issue w/ dynamic.
			// TODO update consistency.
			// - prohibit circling around static
			//
			if (VGNodeId.isAtStaticVertex(currentNode.id)) {

				let baseId = currentNode.getBaseId();

				if (this.closedSet[baseId]) {
					//Report.warn("already in closed set");
					continue;
				}

				this.closedSet[baseId] = currentNode;
			}


			if ( !this.expandNode(currentNode) )
				return;
		}

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


	processBlockedNode(node) {

		console.assert(node.isGoal() && node.blockedBy);

//console.log(`processBlockedNode`, node);

		//var episode = this.startNode.getEpisode(this.unit);
		//if (episode && !episode

		var unit2 = node.blockedBy.track.unit;

		unit2.aI.episodes.stripIdleEpisodes();

		var t = unit2.aI.episodes.getEndTime();

		// As a result unit2 might be idle not obscuring path.
		// TODO check if unit can pass-by to goal node w/o moving unit2

		var p = PathPlanner.getLeaveAwayDestinationPoint(this.unit, node, t);

		if (!p) {
			return node.setDiscarded();
		}
//p.showSign();
		if ( unit2.aI.addAndComputeEpisodeLeave(p) )
			return;

//		console.log(`${this.unit} EpisodeLeave for ${unit2} not computed`);
		node.setDiscarded();
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

				this.result = "SmashedAtStart"; // TODO what on partial (2nd+ run)
				this.resultData = expansion.smashingTrack;

			} else
				Report.throw(`unknown result=${expansion.result}`);

			return false; // stop algorithm; return no path (nothing in openSet)
		}

/*
		var neighbors = expansion.getNeighbors();
		if (!neighbors)
			return true;

		for (let i = 0; i < neighbors.length; i++) {

			let result = this.processNeighbor(currentNode, neighbors[i]);
			if (result)
				this.insertNodeIntoOpenSet(neighbors[i]);
		}
*/
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
/* moved to after fetch
		if (this.dynamic) {
			if ( !PathPlanner.checkAndReportTrackToNodeExpansion(this, node) )
				return;
		}
*/
		var expansion = new DynamicExpansion(this, node);
		expansion.compute(); // can be an errorneous expansion

		//this.expanById[expansion.id] = expansion;
		this.expan.push(expansion);
//if (expansion.aSDynamic.id==98)
//AI.throw();

		return expansion;
	}


	processNeighbor(node, neighbor) { // <-- from DynamicExpansion

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

			neighbor.flags |= VGNode.DISCARDED;

			return;
		}


		neighbor.g = node.g + node.distanceToVGNode(neighbor) / this.unitSpeed;

		neighbor.f = neighbor.g + Heuristic.get(neighbor, this) + neighbor.penalty;

		// (NO!) G-values may be modified later (add-up start time; to wayPoints)
		if (VGNode.DEBUG)
			neighbor.debug.process = "GO " + neighbor.g;

		return true;
	}

/*
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
*/

	// =============================
	//
	//   DEBUG
	//
	// =============================

	findExpan(x, y) {

		console.assert(x && y);

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



export { DynamicPathLevel_A_Star };

