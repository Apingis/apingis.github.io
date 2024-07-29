
import { Task } from './Task.js';


class TaskMoveTo extends Task {

	constructor(unit, arg1) {

		super(unit, "TaskMoveTo");

		this.dstPoint = this.getPointFromArg(arg1);

		// TODO inside area rect!

		// TODO unit fits!

		if ( this.unit.getPoint().distanceToPoint(this.dstPoint) <= 1e-4 ) {

			this.setTaskFinishedOK('task_status_already_here');
			return;
		}
	}


	toJSON() {

		var obj = super.toJSON();

		obj.taskArg1 = this.dstPoint.getUint32();

		return obj;
	}


	getLangDescr() {
		return Lang('TaskMoveTo') + " " + Util.formatPointLocation( this.dstPoint );
	}


	addEpisode(startNode) {

		var dst = new DestinationPoints().setDistanceMargin(1e-4).addPoint(this.dstPoint);

		if (dst.isEmpty()) {
			Report.warn("TaskMoveTo dst.isEmpty");
			this.setTaskFinishedFail('task_status_unreachable');
			return;
		}

		if (dst.isNodeAtDestination(startNode)) {
// not clean
//			this.setTaskFinished();
			return;
		}


		var episode;

		episode = this.createEpisodeIfRequiresReEquip(startNode);
		if (episode)
			return episode;

		episode = new EpisodeMoveToPartial(this, startNode, "MoveTo", dst);


		var D_WALK_AXE = 15;

		var equipItem = this.unit.getEquipRightHandAt(startNode.g);
		if (equipItem) {

			episode.onComputePL1(d => {

				if (d > D_WALK_AXE)
					episode.addActionAtStart("AxeDisarm", wP => wP.data.eventItem2 = equipItem, equipItem);
			});
		}


		episode.onFinished( () => { // EpisodeMoveToPartial supports

			//console.error(`onArrive`);
			this.setTaskFinishedOK();
		});


		return episode;
	}

}



export { TaskMoveTo };



