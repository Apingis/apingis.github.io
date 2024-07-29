
import { Task } from './Task.js';


class TaskCutWood extends Task {

	constructor(unit, arg1, arg2) {

		super(unit, "TaskCutWood");

		var tree = this.getItemFromArg(arg1);

		if (tree) {

			// What was pointed at from the UI;
			// saved to server is what's currently worked at, or null

			if (!tree.isTree()) {
				Report.warn("not a tree", `${tree}`);
				tree = null;
			}

			this.setBaseTarget("tree", tree);

			this.clearAttempt("tree", tree);


			let unit2 = this.whoIsTargeting("tree", tree, unit);

			if (unit2) {
				unit2.aI.enqueueReplanning(); // doesn't work here? (TODO)
				Messages.add(`Tree is targeted by ${unit2}`);
			}

		}
		
		// last successful axe op. (can't be  null)
		//this.lastTreePoint = lastTreePoint
		//	|| (tree && tree.getPoint() || unit.getPoint()).clone();

		this.startPoint = arg2 !== undefined ? this.getPointFromArg(arg2)
			: tree ? tree.getPoint().clone()
			: unit.getPoint().clone();

		this.startNode = null;


		this.cntChopped = 0;
		this.cntLogs = 0;
		this.totalLogMass = 0;

		this.cntHits = 0;
		this.cntBranches = 0;
		this.totalMaxHeight = 0;
	}


	toJSON() {

		var obj = super.toJSON();

		var targetTree = this.getLastTargets("tree")[0];

		if (targetTree && !targetTree.hasTmpId())
			obj.taskArg1 = targetTree.id;

		obj.taskArg2 = this.startPoint.getUint32();

		return obj;
	}


	getLangDescr() {
		return Lang('TaskCutWood') + " " + Util.formatPointLocation( this.startPoint );
	}


	addEpisode(startNode) {

		this.startNode = startNode;

		var episode;

		// I. What are we doing at startNode.g?

		var carrying = this.unit.getCarryingAt(startNode.g);

		if (!carrying) {
			episode = this.addEpisodeOperateOnTree();

		} else {

			let dst = this.getDestinationLogStorage(carrying);

			if (!dst || dst.isEmpty()) {

				//console.error(`uId=${this.unit.id} empty dst DeliverLog`);
				return; // Idle until dst appears (e.g. wood is sold, logStorages freed)
			}

			let dstNode = dst.findNodeByNode(startNode); // at destination/pile

			if (dstNode) {

				let facing = dst.getNodeFacing(dstNode);
				let oP = dst.getNodeData(dstNode);

				episode = new EpisodeAtPile(this, startNode, facing, oP)
					.propagateTargets()

				episode.addItemListener( oP.baseItem, () => this.unit.aI.enqueueReplanning() );

			} else {

				episode = new EpisodeMoveToPartial(this, startNode, "DeliverLog", dst)
					.setChainComputeNext()
					.propagateTargets()

				dst.traverseGoals( node => {

					var oP = dst.getNodeData(node);

					episode.addItemListener( oP.baseItem, () => this.unit.aI.enqueueReplanning() );
				});
			}

		}

		return episode;
	}


	addEpisodeOperateOnTree() {

		var episode;

		// axe hit forces replanning. That is, unit actions don't modify state of the tree.
		if (this.unit.isPlanningAxeHit())
			return;

		// requires re-equip? (equipment changes force replanning).
		episode = this.createEpisodeIfRequiresReEquip(this.startNode);
		if (episode)
			return episode;

		// these actions require axe. inventory changes force replanning.
		var axe = this.unit.getEquipAxe();

		if (!axe)
			return this.setTaskFinishedFail('task_status_no_axe');

		// Tree changed not because of axe hit. (?)

		var tree = this.getLastTargets("tree")[0];

		for (let i = 0; ; i++) {
//console.log(`tree: ${tree}`);
			tree = this.selectTree(tree);
			if (!tree) {
				//return Report.warn("tree not selected", `${this}`); // TODO task done?
				return; // wait until trees grow?
			}
//console.warn(`uId=${this.unit.id} SELECT TREE: ${tree.id} "${tree.spec.name}" p=${tree.getPoint()}`);

			// TODO? walk to 1 of multiple tree destinations

			episode = this.addEpisodeOperateOnTree_byTreeState(tree);
			if (episode)
				break;

			// no episode: select next tree
			tree = null;

			if (i >= 50) {
				Report.warn("unable to handle trees", `${i} ${this}`);
				return;
			}
		}

		// Created episode.

		episode.addTarget("tree", tree);

		return episode;
	}


	selectTree(tree) {

		tree = Item.getSlotReplacedWith(tree);

		if (!tree || tree.isRemoved() || !this.isTargetAvailable("tree", tree)) {
			tree = this.getNearestAvailableTree();
		}

		return tree;
	}


	updateSelected(tree) { // set initially and on successful axe operation; set null on failed op.

		tree = Item.getSlotReplacedWith(tree);

		if (!tree || tree.isRemoved())
			tree = null;

		if (tree) {
			//this.lastTreePoint.copy( tree.getPoint() );
			this.setBaseTarget("tree", tree);
		}
	}


	addEpisodeOperateOnTree_byTreeState(tree) {

		var CHOP_ONLY = 0;

		var episode;

		// current status (wouldn't change because of unit)

		if (!tree.isChoppedTree()) {
			episode = this.onStandingTree(tree);

		} else if (!CHOP_ONLY) {

			if (tree.isFallingTree()) {
				episode = this.onFallingTree(tree);

			} else if (tree.isFallenTree()) {
				episode = this.onFallenTree(tree);
			}
		}

		// Q. Why wouldn't the unit reach destination.
		// - all dst.op's statically reachable

		if (!episode) { // handling the selected tree - unsuccessful.

			// - if something prohibiting task execution regardless of the
			// given tree (i.e. have no axe) - it sets task finished.
			if (this.isTaskFinished())
				return;

//console.warn(`REGISTER ATTEMPT: ${tree.id}`);
			this.registerAttempt("tree", tree);
			this.updateSelected(null);
			return;
		}

		return episode;
	}


	onStandingTree(tree) {

		var episode = this.createEpisodeNextAxeOperation(tree, "chopStanding");

		return episode;
	}


	onFallingTree(tree) {

		var episode;

		episode = new EpisodeWait(this, this.startNode, 0.5, () => {

			if (!tree || tree.isFallenTree() || tree.isRemoved())
				//this.unit.aI.enqueueReplanning(false);
				this.unit.aI.enqueueReplanning();
		});

		return episode;
	}


	onFallenTree(tree) {

		var episode;

		episode = this.doRemoveBranches(tree);
		if (episode)
			return episode;

		episode = this.doCheckLogs(tree);
		if (episode)
			return episode;

		episode = this.doCutLogs(tree);
		if (episode)
			return episode;
	}


	doRemoveBranches(tree) {

		if (tree.hasAllBranchesRemoved())
			return;

		return this.createEpisodeNextAxeOperation(tree, "removeBranches");
	}


	doCheckLogs(tree) {

		var dst = this.getDestinationGetLogsFromTree(tree);

		if (!dst || dst.isEmpty())
			return;// Report.warn(`no logs`);

//console.error(`id=${tree.id} doCheckLogs HAVE LOGS`);

		var episode = new EpisodeMoveToPartial(this, this.startNode, "GetLog", dst);

		var equipItem = this.unit.getEquipRightHandAt(this.startNode.g);
		if (equipItem)
			episode.addActionAtStart("AxeDisarm", wP => wP.data.eventItem2 = equipItem, equipItem);

		// Invoked when goal is defined. Can be invoked several times(?).
		episode.addActionAtGoal("Lifting2H", wP => {

			var log = episode.getTargetData();

			wP.data.eventItem2 = log;

			// TODO ISSUE.
			// If log disappears after lift operation starts, replanning doesn't help.

			wP.data.beforeEventFn = () => {
				episode.removeItemListener(log);
			}

			// On episode removal or cancel, all itemListeners are removed.

			episode.addItemListener(log, () => {
				this.unit.aI.forceReplanning();
			});
		});

		return episode;
	}


	doCutLogs(tree) {

		if (tree.hasAllCutsCompleted())
			return;

		return this.createEpisodeNextAxeOperation(tree, "cutFallen");
	}


	// ========================================================================


	createEpisodeNextAxeOperation(tree, what) {

		var dst = tree.getDestination(this.unit, what);
		if (!dst || dst.isEmpty())
			return;

		var dstNode = dst.findNodeByNode(this.startNode);
		var equipItem = this.unit.getEquipRightHandAt(this.startNode.g);

		if (!dstNode || !equipItem)
			return this.createEpisodeMoveToEquip(this.startNode, dst, equipItem, [ tree ])
				.setChainComputeNext();


		// Ready for axe hit

		var facing = dst.getNodeFacing(dstNode);
		var target = dst.getNodeData(dstNode);

		var episode = new EpisodeInPlaceAction(this, this.startNode, `${target.action}`);

		var node = episode.addAction(target.action, null,

			target,
			() => {
				this.updateSelected(target.item);
			},
			null,
			facing,
			equipItem
		);

		return episode;
	}


	// ========================================================================


	getDestinationGetLogsFromTree(tree) {

		// Task. Identify exactly logs that appeared as a result of cutting given tree.

		var polygon = tree.getCutoffLogsPolygon();

		var logsOnTheGround = Util.filterInPlace(

			Main.area.spatialIndex.getAllItemsUsingShape(polygon),
			item => item.isLogOnTheGround() && polygon.containsPoint( item.getPoint() )
		);

		if (logsOnTheGround.length === 0) {

			if (tree.hasAllCutsCompleted())
				tree.setAllLogsCarriedAway();

			return;
		}

		var logs = Util.filterInPlace(logsOnTheGround, log => !this.unit.isPlanningCarrying(log));

		if (logs.length === 0)
			return;


		var dst = new DestinationPoints();

		logs.forEach(log =>
			log.getUnitFitGrabLocations(this.unit).forEach(aP => dst.addApproachPoint(aP, log))
		);

		return dst;
	}


	getNearestAvailableTree() {

		var tree;

		//if (this.lastTreePoint)
		//	tree = this.getTreeWithinRadius(this.lastTreePoint, 50);

		tree = this.getTreeWithinRadius(this.startPoint, TaskCutWood.TREE_SEARCH_RADIUS);

		return tree;
	}


	getTreeWithinRadius(point, radius) {

		var tree;

		Main.area.spatialIndex.processKNNItems(point, 1,

			container => { // filter fn.

				var item = container.obj;

				if (!item.isTree() || item.isSmallTree() || item.hasAllLogsCarriedAway()
						|| !this.isTargetAvailable("tree", item))
					return;

				return true;
			},

			item => {
				tree = item;
			},

			radius
		);

		return tree;
	}

}


TaskCutWood.TREE_SEARCH_RADIUS = 50;




export { TaskCutWood }

