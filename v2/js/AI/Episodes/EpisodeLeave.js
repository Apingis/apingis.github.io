import { Episode } from './Episode.js';


class EpisodeLeave extends Episode {

	constructor(task, startNode, dstPt) {

		super(task, startNode, "Leave");

		this.dstPt = dstPt;

		this.endWP = null;
	}


	compute(targetTime) {

		var start = this.createNode(false).addFlags(VGNode.EPISODE_START);

		this.endWP = new VGNode(this.dstPt.x, this.dstPt.y, this.getNextPtId());
		this.endWP.angle = start.angleTo(this.dstPt.x, this.dstPt.y);

		var t = start.distanceTo(this.dstPt.x, this.dstPt.y) / this.unit.getSpeed();

		this.endWP.setG(start.g + t);

		this.endWP.addWayPointData();
		this.endWP.episodeId = this.id;
		this.endWP.expanId = Expansion.nextId ++;


		this.wayPoints = new WayPoints;
		this.wayPoints.push(start, this.endWP);


		if ( !this.checkAndHandleCollision(start, this.endWP, true) )
			return;

		console.assert(!this._onFinished);

		this.completed = true;
		return true;
	}

}



export { EpisodeLeave };

