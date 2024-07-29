
import { Task } from './Task.js';


class TaskIdle extends Task {

	constructor(unit) {

		super(unit, "TaskIdle");
	}


	addEpisode(startNode) {

		// It would add EpisodeIdle
	}

}



export { TaskIdle };

