
import { Episode } from './Episode.js';


class EpisodeIdle extends Episode {

	constructor(task, startNode, params) {

		super(task, startNode, "Idle", params);

		this.endWP = null;
	}


	isIdle() { return true }


	compute(targetTime) {

		if (!targetTime)
			targetTime = this.unit.aI.getIdleComputeTime();

		this.unit.aI.numEpisodesIdle ++;

		var start = this.createNode(false).addFlags(VGNode.EPISODE_START);

		this.endWP = this.createNode(false).addG(targetTime);

		this.wayPoints = new WayPoints;
		this.wayPoints.push(start, this.endWP);


		if ( !this.checkAndHandleCollision(start, this.endWP) )
			return;

		console.assert(!this._onFinished);

		this.completed = true;
		return true;
	}

/*
	forceLeaveAway(p) {

		
		var t = Engine.time;

		this.endWP.g = 
	}
*/
}



export { EpisodeIdle };

