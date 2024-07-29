
import { Episode } from './Episode.js';


class EpisodeMoveToPartial extends Episode {

	// split-L1-start issue.

	constructor(task, startNode, type, dst, params) {

		super(task, startNode, type, params);

		this.dst = dst;

		this.atDestination = false;
		this.pL1 = null;
		this.wayPointsL1 = null;
		this.dataL1 = null;

		this.pL0 = null;
		this.wayPointsL0 = null;
		this.wayPointsAtStart = null;
		this.wayPointsAtGoal = null;

		// this is used only to get target facing,data from .dst
		// goalNode may be diffrenet from endWP (goalDistanceMargin)
		this.goalNode = null;

		this._onComputePL1 = null;
		this._onAtStart = null;
		this._onAtGoal = [];
	}


	isMove() { return true; }

	canBePartiallyComputed() { return true; }

	getCollidingAtStartTrack() {
		return this.pL0 && this.pL0.result == "SmashedAtStart" && this.pL0.resultData;
	}

	isPartiallyComputed() {
		return !!( !this.isClosed() && this.pL0 && !this.pL0.result && this.pL0.wayPoints );
	}

	runOnRemove() {
		this.pL1 && this.pL1.remove();
		this.pL0 && this.pL0.remove();
		super.runOnRemove();
	}


	compute(targetTime) {

		if (!this.pL1 && !this.atDestination) {

			var node = this.dst.findNodeByNode(this.startNode);

			if (node) {
				this.atDestination = true;

				this.runOnComputePL1();

				if (!this.runOnAtStart())
					return "CollisionAtActionAtStart";

				// requires .g, .angle for actionAtGoal
				// In this case goalNode doesn't match endWP
				this.goalNode = node.clone().setG(this.startNode.g);
				this.goalNode.angle = this.startNode.angle;

				if (!this.runOnAtGoal())
					return "CollisionAtActionAtGoal";

				this.completed = true;
				this.setupWayPoints();
				return true;
			}

			this.computePathLevel1();
			if (!this.wayPointsL1) {
//console.warn("!this.wayPointsL1");
				return;
			}

			this.runOnComputePL1();

			if (!this.runOnAtStart())
				return "CollisionAtActionAtStart";

			this.setupPathLevel0();

//AI.stop(); AI.throw();
		}

		if (this.isCompleted())
			Report.throw("already completed");

if (1) { // partial run

		var startTime = this.isPartiallyComputed() ? this.getEndTime() : this.getStartTime();

		var advanceG = startTime + AI.DISTANCE_PARTIAL_ADVANCE / this.unit.speed;
		var limitG = startTime + AI.DISTANCE_PARTIAL_LIMIT / this.unit.speed;

		//var dMax = this.dataL1.distance;

		this.pL0.expanCountMax = this.pL0.expanCount
			 + 15 + Math.ceil(AI.DISTANCE_PARTIAL_LIMIT / this.unit.getRadius());

		var result = this.pL0.computePartial(advanceG, limitG);
		if (!result) {

			if (!this.wayPointsL0) {
				console.assert(this.pL0.result !== "");

			} else {
				// already have WP's from the previous partial run; now error.
				// episode counts as "closed".
				this.stopped = true;
//console.error(`${this} STOPPED: ${this.pL0.result}`); // "OpenSetExhaustion" (do idle)
			}

			return this.pL0.result;

		} else
			this.wayPointsL0 = result;

		if (!this.pL0.completed) {
			this.setupWayPoints();
			return true;
		}

} else if (0) { // usual run (until destination reached)

		this.wayPointsL0 = this.pL0.computePath();
		if (!this.wayPointsL0) {
			console.assert(this.pL0.result !== "");
			return this.pL0.result;
		}
}

		if (!this.pL0.completed)
			Report.throw("inexpected");

		this.goalNode = this.wayPointsL0.getLast();

		if (!this.runOnAtGoal())
			return "CollisionAtActionAtGoal";

		this.completed = true;
		this.setupWayPoints();
		return true;
	}


	setupWayPoints() {

		this.wayPoints = new WayPoints;

		if (this.atDestination) {
			if (!this.wayPointsAtStart && !this.wayPointsAtGoal)
				return;
		}

		this.wayPoints.push(this.createNode(false).addFlags(VGNode.EPISODE_START));

		//unused	this.wayPoints.push(this.wayPointsL0[0]);

		Array.prototype.push.apply(this.wayPoints, this.wayPointsAtStart);

		if (!this.atDestination)
			for (let i = 1; i < this.wayPointsL0.length; i++)
				this.wayPoints.push(this.wayPointsL0[i]);

		if (this.completed)
			Array.prototype.push.apply(this.wayPoints, this.wayPointsAtGoal);

		this.wayPoints.forEach(wP => wP.addWayPointData());

		if (this.completed && this._onFinished)
			this.wayPoints.getLast().data.arriveFn = this._onFinished;
	}


	getDistanceL1() { return this.dataL1 && this.dataL1.distance || 0 }


	runOnComputePL1() {

		if (this._onComputePL1)
			this._onComputePL1(this.getDistanceL1());
	}


	runOnAtStart() {

		if (this._onAtStart) {
			if (!this._onAtStart())
				return;
		}

		return true;
	}


	runOnAtGoal() {

		for (let i = 0; i < this._onAtGoal.length; i++) {

			let result = this._onAtGoal[i]();
			if (!result)
				return;
		}

		return true;
	}


	removeAlreadyTravelled(currentG) {

		console.assert(this.isPartiallyComputed());

		return this.pL0.removeAlreadyTravelled(currentG);
	}


	// ===============================================


	getEndTime() {

		if (this.isPartiallyComputed()) {

			if (!this.wayPoints || this.wayPoints.length < 2)
				Report.throw("getEndTime (partial run) - no WPs", `${this}`);

			return this.wayPoints.getLast().g;
		}


		var wP = this.wayPoints.getLast();
		if (!wP) {
			if (this.atDestination)
				return this.getStartTime();
			else
				Report.throw("getEndPt - no end WP", `${this}`);
		}

		return wP.g;
	}


	getTargetFacing() {

		if (this.isStopped())
			return this.wayPoints.getLast().angle;

		if (!this.goalNode)
			Report.throw("not completed", `${this}`);

		return this.dst.getNodeFacing(this.goalNode);

	}


	getTargetData() {

		if (!this.goalNode)
			Report.throw("not completed", `${this}`);

		return this.dst.getNodeData(this.goalNode);
	}



	// ===============================================

	computePathLevel1() {

		console.assert(!this.pL1 && !this.wayPointsL1 && !this.dataL1);

		// no dst - must be handled on task level?
		if (this.dst.isEmpty())
			return Report.warn("no dst for PL1", `${this}`); //e.g. TaskGrabItem -> item disappeared

		this.pL1 = new PathLevel_A_Star({

			radiusClass: this.unit.radiusClass,
			area: this.getArea(),
			level: 1,
			//startPt: this.startPt,
			startPt: this.startNode.getPoint().clone(),
			dst: this.dst,
		});

		this.wayPointsL1 = this.pL1.computePath();
		if (!this.wayPointsL1)
			return; // RESULT!?

		this.dataL1 = this.pL1.getPathLevelData();
	}


	setupPathLevel0() {

		var expanCountMax = 1.0 * Math.ceil(this.dataL1.distance / this.unit.getRadius()) + 15;

		var startNode = this.wayPointsAtStart ? this.wayPointsAtStart.getLast() : this.startNode;

		this.pL0 = new DynamicPathLevel_A_Star({

			unit: this.unit,
			area: this.getArea(),
			level: 0,
			dynamic: true,
			epsilon1: 1.05,
			//startPt: this.startPt,
			startPt: startNode.getPoint().clone(),
			dst: this.dst, // TODO consider only selected goals
			startTime: startNode.g,
			upperData: this.dataL1,
			episodeId: this.id,
			expanCountMax,
		});

	}


	onComputePL1(fn) {

		console.assert(!this._onComputePL1);
		this._onComputePL1 = fn;
		return this;
	}


	addActionAtStart(type, fn, refItem) {

		console.assert(typeof fn == "function");

		this._onAtStart = () => {

			console.assert(!this.wayPointsAtStart && !this.pL0);

			var wP = this.createAndCheckActionNode(this.startNode, this.startNode.angle, type, refItem);
			if (!wP)
				return Report.warn("actionAtStart collides", `${this}`);

			var result = fn(wP);
			if (!result)
				return;

			this.wayPointsAtStart = new WayPoints().add(wP);
			return true;
		};

		return this;
	}


	addActionAtGoal(type, fn, refItem) {

		console.assert(!fn || typeof fn == "function");

		var getEndWP = () => {

			if (this.wayPointsAtGoal)
				return this.wayPointsAtGoal.getLast();

			if (this.atDestination)
				return this.wayPointsAtStart ? this.wayPointsAtStart.getLast() : this.startNode;

			return this.goalNode;
		};


		if (type == "_robot_turnInPlace") {

			console.assert(!fn);

			this._onAtGoal.push( () => {

				var endWP = getEndWP();
				var facing = !this.wayPointsAtGoal ? this.getTargetFacing() : undefined;

				if (facing === undefined) {
					Report.warn("_robot_turnInPlace: undefined facing");
					facing = 0;
				}

				var t = Angle.sub(facing, endWP.angle) / Math.PI * Action.TURN_DURATION_ROBOT;

				t = Math.max( 0.01, Math.abs(t) );

				var wP = this.createAndCheckActionNode(endWP, facing, t, refItem);
				if (!wP)
					return Report.warn("robot_turnInPlace: actionAtGoal collides", `${this}`);

				if (!this.wayPointsAtGoal)
					this.wayPointsAtGoal = new WayPoints;

				this.wayPointsAtGoal.add(wP);
				return true;
			});

			return this;
		}


		this._onAtGoal.push( () => {

			var endWP = getEndWP();
			var facing = !this.wayPointsAtGoal ? this.getTargetFacing() : undefined;

			var wP = this.createAndCheckActionNode(endWP, facing, type, refItem);
			if (!wP)
				return Report.warn("actionAtGoal collides", `${this}`);

			fn && fn(wP);

			if (!this.wayPointsAtGoal)
				this.wayPointsAtGoal = new WayPoints;

			this.wayPointsAtGoal.add(wP);
			return true;
		});

		return this;
	}


}



export { EpisodeMoveToPartial };

