
import { Episode } from './Episode.js';


class EpisodeInPlaceAction extends Episode {

	constructor(task, startNode, type = "InPlaceAction", params) {

		super(task, startNode, type, params);

		this._wayPoints = new WayPoints;
		this._wayPoints.push( this.createNode().addFlags(VGNode.EPISODE_START) );
	}


	addDisarmAction(axeItem) {

		console.assert(axeItem);

		return this.addAction("AxeDisarm", axeItem, null, null, null, undefined, axeItem);
	}


	addAction(type, eventItem2, eventTarget, eventFn, beforeEventFn, facing, refItem) {

		console.assert(!eventItem2 || (eventItem2 instanceof Item)
			 || Array.isArray(eventItem2) && eventItem2.every(item => item instanceof Item) );

		var duration;

		if (typeof type == "number") {
			duration = type;
			type = "";

		} else
			duration = Action.getDuration(type, this.unit, refItem);

		var endWP = this._wayPoints.getLast();

		var node = this.createNode(true, facing).setG(endWP.g + duration);

		node.data.action = type;
		node.data.refItem = refItem;
		node.data.eventItem2 = eventItem2;
		node.data.eventTarget = eventTarget;
		node.data.eventFn = eventFn;
		node.data.beforeEventFn = beforeEventFn;

		this._wayPoints.push(node);

		return node;
	}


	compute(targetTime) {

		var wayPoints = this.wayPoints = this._wayPoints;

		if (wayPoints.length < 2)
			Report.throw("wayPoints.length", `l=${wayPoints.length}`);

		var endWP = wayPoints.getLast();

		if ( !this.checkAndHandleCollision(wayPoints[0], endWP) )
			return;


		if (this._onFinished) {

			console.assert(!endWP.data.arriveFn);
			endWP.data.arriveFn = this._onFinished;
		}

		this.completed = true;
		return true;
	}

}



export { EpisodeInPlaceAction };

