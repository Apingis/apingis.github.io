
import { Episode } from './Episode.js';


class EpisodeWait extends Episode {

	constructor(task, startNode, deltaTime, fn, params) {

		super(task, startNode, "Wait", params);

		this.deltaTime = deltaTime;
		this.fn = fn;

		this.endWP = null;
	}


	isIdle() { return true }


	compute() {

		var start = this.createNode(false).addFlags(VGNode.EPISODE_START);

		this.endWP = this.createNode(false).addG(this.deltaTime);

		this.wayPoints = new WayPoints;
		this.wayPoints.push(start, this.endWP);


		if ( !this.checkAndHandleCollision(start, this.endWP) )
			return;

		//this.endWP.data.arriveFn = this.fn;
		this.endWP.data.startFn = this.fn;

		this.completed = true;
		return true;
	}

}


export { EpisodeWait };

