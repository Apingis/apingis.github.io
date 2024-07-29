
class TaskList {

	constructor(unit) {

		this.unit = unit;
	}


	setTask(type, arg1, arg2) {

		var task = Task.create(this.unit, type, arg1, arg2);
		this.unit.aI.setTask(task);

		if (this.unit.isChar())
			ScreenCharInfo.onSetTask(this.unit);
		else
			ScreenRobotInfo.onSetTask(this.unit);

		Main.user.progress.onSetTask(this.unit, type);
	}


	getCurrentTask() { return this.unit.aI.task }


	isIdle() {

		var task = this.getCurrentTask();
		return task && (task.type == 'TaskIdle' || task.isTaskFinished());
	}


	hasUnfinishedTask(type) { return !!this.getUnfinishedTask(type) }


	getUnfinishedTask(type) {

		if (Main.isServer)
			return;

		console.assert(type);

		var task = this.getCurrentTask();

		if (task && task.type === type && !task.isTaskFinished())
			return task;
	}


	getCurrentEpisode() { return this.unit.aI.episodes.getCurrent() }
}




export { TaskList }

