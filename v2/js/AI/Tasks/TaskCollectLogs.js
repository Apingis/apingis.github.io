
import { Task } from './Task.js';

// TODO no container listeners
class TaskCollectLogs extends Task {

	constructor(unit, arg1) {

		super(unit, "TaskCollectLogs");

		this.lastGrabLocation = this.getPointFromArg(arg1) || unit.getPoint().clone();
	}


	addEpisode(startNode) {

		var carrying = this.unit.getCarryingAt(startNode.g);
//console.log(`addEpisode carry:${!!carrying} g=${Util.toStr(startNode.g)} id=${carrying && carrying.id}`);

		if (carrying && !carrying.isLog())
			Report.warn("not a log", carrying);

		var episode;

		if (!carrying) {

			let dst = this.getDestinationGetLog();

if (dst.isEmpty()) {
console.error(`uId=${this.unit.id} empty dst GetLog`);
return;
}

			episode = new EpisodeMoveToPartial(this, startNode, "GetLog", dst);
			episode.addTarget("log", dst.getNodeData(dst.nodes[0]));

			var equipItem = this.unit.getEquipRightHandAt(startNode.g);
			if (equipItem)
				episode.addActionAtStart("AxeDisarm", wP => wP.data.eventItem2 = equipItem, equipItem);

			episode.addActionAtGoal("Lifting2H", wP => {

				var log = episode.getTargetData();

				wP.data.eventItem2 = log;
				wP.data.startFn = () => {

					//if (!log.isLogOnTheGround())
					//	Report.warn("!LogOnTheGround", `${log} ${episode}`);

					this.lastGrabLocation.copy(wP.data.eventItem2.getPoint());

					episode.removeItemListener(log);
//console.warn(`# removeItemListener ${episode.id} ${log}`);
				};

				//wP.data.eventFn = () => this.clearTarget("log", log);

//console.warn(`# addItemListener ${episode.id} ${log}`);
				episode.addItemListener(log, () => {
//console.warn(`## runItemListener ${episode.id} ${log}`);
					this.unit.aI.forceReplanning();
				});

			});


// ======================================================================

		} else { // carrying

			let dst = this.getDestinationLogStorage(carrying);

if (dst.isEmpty()) {
console.error(`uId=${this.unit.id} empty dst DeliverLog`);
return;
}

			let dstNode = dst.findNodeByNode(startNode);

			if (dstNode) {

				let facing = dst.getNodeFacing(dstNode);
				let target = dst.getNodeData(dstNode);

				episode = new EpisodeAtPile(this, startNode, facing, target);

			} else {

				episode = new EpisodeMoveToPartial(this, startNode, "DeliverLog", dst)
					.setChainComputeNext();
			}
		}


		return episode;
	}


	// ====================================================================



	getDestinationGetLog() {

		var dst = new DestinationPoints();

		Main.area.spatialIndex.processKNNItems(this.lastGrabLocation, 1,

			container => { // filter fn.

				var item = container.obj;

				if (!item.isLogOnTheGround() || !this.isTargetAvailable("log", item))
					return;

				var grabLocations = item.getUnitFitGrabLocations(this.unit);

				if (grabLocations.length === 0) {
					// would not save much
					//this.registerAttempt("log", log); // flag invalid grab loc.
					return;
				}

				return true;
			},

			log => {
				var grabLocations = log.getUnitFitGrabLocations(this.unit);

				grabLocations.forEach(aP => { // !!!TODO!!!
					dst.addApproachPoint(aP, log);
					//this.attemptedLogs.push(log); // ^^^
				});

				//this.registerTarget("log", log);
			},

		100);

//console.warn(`uId=${this.unit.id} getDestinationGetLog: n=${logs.length}`);

		return dst;
	}


}



export { TaskCollectLogs };

