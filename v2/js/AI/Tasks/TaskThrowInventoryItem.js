
import { Task } from './Task.js';


class TaskThrowInventoryItem extends Task {

	constructor(unit, item) {

		super(unit, "TaskThrowInventoryItem");

		// 1 item per episode. 1st episode may contain dropping of carried item or disarm.
		this.items = [ item ];
	}


	getLangDescr() {
		return Lang('TaskThrowInventoryItem');
	}


	enqueueItem(item) {

		if (this.isTaskFinished())
			return Report.warn("task is finished");

		if (this.items.indexOf(item) !== -1)
			return Report.warn("item already enqueued");

		if (!item.isStoredAt(this.unit))
			return Report.warn("item is not in inventory");

		this.items.push(item);

		// It assumes add-up of one more episode.

		this.enqueueStripIdleEpisodes();

		return true;
	}


	getNextItem() {
		return this.items.find(item =>
			!this.findEpisode(e => e.type == "ThrowInventoryItem" && e.data.item === item)
		);
	}


	setItemFinished(item) {
		Util.removeElement(this.items, item);
	}


	addEpisode(startNode) {

		var item = this.getNextItem();
		if (!item)
			return;

		var episode = new EpisodeInPlaceAction(this, startNode, "ThrowInventoryItem");
		episode.data.item = item;


		var carrying = this.unit.getCarryingAt(startNode.g);
		if (carrying)
			episode.addAction("DropFwd", carrying);


		var target = {
			throwPosition: episode.getStartPosition(),
			throwFacing: startNode.angle,
			oP: this.getOperationPoint(startNode, item),
		};

		var equipRightHand = this.unit.getEquipRightHandAt(startNode.g);
		var throwEquipped = equipRightHand === item;

		if (equipRightHand) {

			if (throwEquipped) {
				episode.addAction("StandingAxeThrow", item,
					target, () => this.onThrowAxe(item, target)
				);

			} else {
				episode.addDisarmAction(equipRightHand);
			}
		}

		if (!throwEquipped) {
			episode.addAction("GetThrowAxe", item,
				[ null, target ],
				[ null, () => this.onThrowAxe(item, target) ]
			);
		}


		episode.onFinished( () => {

			if (this.items.length === 0)
				this.setTaskFinishedOK();
		});

		return episode;
	}


	onThrowAxe(item, target) {

		this.setItemFinished(item);

		Accounting.addEntry(this.unit, "throwInventoryItem", {

			id: item.id,
			pos: target.oP.position,
			//facing: target.oP.facing
			facing: target.throwFacing - 2.356 // as in releaseItemAxe_Throw()
		});
	}


	// =======================================================================
	//
	// Criteria:
	//
	// 1) must have accessible "grab item" approach pt.
	//
	// - "must look good":
	// 2) several item gets thrown into different positions
	// 3) item.polygon must not collide
	// - item trajectory does not intersect anything
	// - always successful.
	//
	// TODO (v2) if starting unit location considered inappropriate (not looking good)
	//   then evaluate other locations.
	//
	// =======================================================================

	getOperationPoint(startNode, item) {

		var unitPoint = startNode.getPoint();
		var direction = new Point().setFromAngleDistance(startNode.angle, 1);
		var directionLeft = direction.clone().perp();

		var grabAP = item.getGrabTargetPoint(unitPoint, startNode.angle);

		var p = new Point;

		var evaluatePointOffset = (fwd, left) => {

			p.set(0, 0).addScaled(direction, fwd).addScaled(directionLeft, -left).add(unitPoint);
			Util.froundPoint(p);

			if (this.checkTargetPoint(p, grabAP.facing, item))
				return true;
		};


		var found;
		var offsets = this._targetPointOffsets;

		for (let i = 0; i < offsets.length; i += 2)

			if (evaluatePointOffset(offsets[i], offsets[i + 1])) {
				found = true;
				break;
			}


		if (!found) {

			let sprng = new Util.SeedablePRNG(item.id, this.unit.id);

			for (let i = 0; i < 10; i++)

				if (evaluatePointOffset(sprng.random(1.5) + 0.5, sprng.random(1.5) - 0.3) ) {
					found = true;
					break;
				}
		}


		if (!found) {
			p.set(grabAP.x, grabAP.y); // w/o checks
			//TODO! incl.grabLocations
			//Util.froundPoint(p);
		}


		return {
			name: "OP_ThrowInventoryItem",
			position: new THREE.Vector3(p.x, 0, p.y),
			facing: grabAP.facing,
		};
	}


	checkTargetPoint(p, facing, item) { // TODO account thrown items "in flight" - avoid stacking

		// accessible "grab item" approach pt

		var grabLocations = item.getUnitFitGrabLocations(this.unit, p, facing, true);

		if (grabLocations.length === 0)
			return;


		var items = Main.area.spatialIndex.getAllItemsUsingShape(new Circle(p.x, p.y, 0.3));

		if (items.some(item => !item.isColliding() && item.getPoint().distanceToPoint(p) < 0.3))
			return;


		var polygon = item.spec.createPolygon(p.x, p.y, facing);

		if (Main.area.spatialIndex.polygonCollides(polygon))
			return;

		// TODO item trajectory does not intersect anything

		return true;
	}

}


Object.assign(TaskThrowInventoryItem.prototype, {

	_targetPointOffsets: [ 1.3, 0,  1.1, 0.65 ],
});



export { TaskThrowInventoryItem };

