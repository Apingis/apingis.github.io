
import { Task } from './Task.js';


class TaskDropCarrying extends Task {

	constructor(unit, arg1) {

		super(unit, "TaskDropCarrying");

		this.dstPoint = this.getPointFromArg(arg1);


		var carrying = this.unit.getCarrying();
		if (!carrying) {
			Report.warn("not carrying anything");
			this.setTaskFinishedFail('task_status_no_item');
			return;
		}
	}


	toJSON() {

		var obj = super.toJSON();

		obj.taskArg1 = this.dstPoint.getUint32();

		return obj;
	}


	getLangDescr() {
		return Lang('TaskDropCarrying');
	}


	addEpisode(startNode) {

		var carrying = this.unit.getCarryingAt(startNode.g);
		if (!carrying)
			return;

		var dst = new DestinationPoints().addPoint(this.dstPoint);

		var episode = new EpisodeMoveToPartial(this, startNode, "DropCarrying", dst)

		// fn executes when episode's computed, WP's are being processed.
		// can be called several times on partial compute

		.addActionAtGoal("DropFwd", wP => {

			wP.data.eventItem2 = carrying;
			wP.data.eventFn = () => this.setTaskFinishedOK();
		})

		return episode;
	}

}



export { TaskDropCarrying };

