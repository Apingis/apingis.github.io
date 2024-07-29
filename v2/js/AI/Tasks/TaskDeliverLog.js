
import { Task } from './Task.js';


class TaskDeliverLog extends Task {

	constructor(unit) {

		super(unit, "TaskDeliverLog");

		var carrying = unit.getCarrying();

		if ( !carrying || !carrying.isLog() )
			return this.setTaskFinishedFail('task_status_not_carrying');
	}


	getLangDescr() {
		return Lang('TaskDeliverLog');
	}


	addEpisode(startNode) {

		var carrying = this.unit.getCarryingAt(startNode.g);

		if (!carrying || !carrying.isLog()) {
			return;
		}


		var dst = this.getDestinationLogStorage(carrying);

		if (dst.isEmpty()) {

			//Report.warn("nowhere to carry to");
			return; // go idle, continue attempts
		}


		var episode;
		var dstNode = dst.findNodeByNode(startNode);

		if (dstNode) {

			let oP = dst.getNodeData(dstNode);

			episode = new EpisodeAtPile(this, startNode, dst.getNodeFacing(dstNode), oP)

			.onFinished( () => {

				if (this.unit.charData.carryId) // "PlacementNotAvailable", "cPIsMoving"
					return;

				this.setTaskFinishedOK();
			})

			episode.addItemListener( oP.baseItem, () => this.unit.aI.enqueueReplanning() );

		} else {

			episode = new EpisodeMoveToPartial(this, startNode, "DeliverLog", dst)
				.setChainComputeNext();

			dst.traverseGoals( node => {

				var oP = dst.getNodeData(node);

				episode.addItemListener( oP.baseItem, () => this.unit.aI.enqueueReplanning() );
			});
		}

		return episode;
	}


}



export { TaskDeliverLog };

