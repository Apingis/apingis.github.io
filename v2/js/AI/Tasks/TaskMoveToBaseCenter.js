
import { Task } from './Task.js';


class TaskMoveToBaseCenter extends Task {

	constructor(unit, baseCenter) {

		super(unit, "TaskMoveToBaseCenter");

		//this.baseCenter = baseCenter;
		this.baseCenter = Main.area.baseCenter;

		if (!this.baseCenter || !this.baseCenter.isBaseCenter()) {

			Report.warn("no or bad base center");
			this.setTaskFinishedFail('task_status_no_item');
			return;
		}

		if ( this.baseCenter.isAtApproachPoint(unit) )
			this.onArriveToOP();
	}


	toJSON() {

		var obj = super.toJSON();

		//obj.taskArg1 = this.baseCenter.id;

		return obj;
	}


	getLangDescr() {
		return Lang('TaskMoveToBaseCenter');
	}


	onArriveToOP() {

		ProgressWindow.close();

		Main.selectedItemSet(this.unit);

		Display.cameraView.temporarilyStopFreeMove();

		var intervals = this.baseCenter.getCameraIntervals();

		if (ScreenCharInfo.cameraFollow)
			Display.cameraView.startFollowing(this.unit, intervals);
		else
			Display.cameraView.startMoveToItem(this.unit, intervals);


		UI.setScreen('BaseCenter');

		this.setTaskFinishedOK();

		this.baseCenter.display.onCharArrive(this.unit);
	}


	addEpisode(startNode) {

		var dst = new DestinationPoints().setDistanceMargin(1e-3)
				.addApproachPoint( this.baseCenter.getApproachPoint() );

		if (dst.isEmpty()) {
			Report.warn("TaskMoveToBaseCenter dst.isEmpty");
			this.setTaskFinishedFail('task_status_unreachable');
			return;
		}

		if (dst.isNodeAtDestination(startNode)) {

			return;
		}


		var episode = new EpisodeMoveToPartial(this, startNode, "MoveToBaseCenter", dst);

		var equipItem = this.unit.getEquipRightHandAt(startNode.g);
		if (equipItem)
			episode.addActionAtStart("AxeDisarm", wP => wP.data.eventItem2 = equipItem, equipItem);

		episode.addActionAtGoal(0.15, wP => { // turn in place to achieve target facing

			wP.data.startFn = () => this.onArriveToOP();
		});

		//episode.onFinished( () => this.onArriveToOP() ); // EpisodeMoveToPartial supports

		return episode;
	}

}



export { TaskMoveToBaseCenter };

