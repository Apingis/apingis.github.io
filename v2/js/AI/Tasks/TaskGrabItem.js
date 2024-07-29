
import { Task } from './Task.js';


class TaskGrabItem extends Task {

	constructor(unit, arg1) {

		super(unit, "TaskGrabItem");

		var item = this.getItemFromArg(arg1);

		if (!this.checkItem(item))
			return this.setTaskFinishedFail('task_status_no_item');

		this.item = item;
		this.itemPosition = item.position.clone(); // in case of throw back
	}


	toJSON() {

		var obj = super.toJSON();

		obj.taskArg1 = this.item && this.item.id;

		return obj;
	}


	getLangDescr() {

		var str = Lang('TaskGrabItem');

		if (!this.item)
			return str;

		var name = this.item.getLangName();

		//if (name.length > 29) // 35vw/+timer 1152px
		//	name = name.substring(0, 28) + "...";

		if (name.length > 23) // 35vw/+timer 1000px
			name = name.substring(0, 22) + "...";

		return `${str} "${name}"`;
	}


	checkItem(item) {
		return item && item.canGrab();
	}


	addEpisode(startNode) {

		if (this.isTaskFinished())
			Report.throw("addEpisode: isTaskFinished");

		var haveEpisode = this.findEpisode(e => e.type == "GrabItem" && e.data.item === this.item);
		if (haveEpisode)
			return;

		if ( !this.checkItem(this.item) )
			return this.setTaskFinishedFail('task_status_no_item');

		if (this.unit.getCarryingAt(startNode.g)) {

			Report.warn("carrying a log"); // shouldn't be possible from UI
			return this.setTaskFinishedFail('task_status_carrying');
		}


		var aPoints = this.item.getUnitFitGrabLocations(this.unit);
		var dst = new DestinationPoints().addApproachPoints(aPoints);

		var episode = new EpisodeMoveToPartial(this, startNode, "GrabItem", dst);
		episode.data.item = this.item;


		var equipItem = this.unit.getEquipRightHandAt(startNode.g);
		if (equipItem)
			episode.addActionAtStart("AxeDisarm", wP => wP.data.eventItem2 = equipItem, equipItem);


		if (this.item.isLog()) {

			episode.addActionAtGoal("Lifting2H", wP => {

				wP.data.eventItem2 = this.item;
				wP.data.eventFn = () => this.setTaskFinishedOK();
			});


		} else if (this.item.isAxe()) {

			episode.addActionAtGoal("PickUpAxe", wP => {

				wP.data.eventItem2 = this.item;

				wP.data.startFn = () => {

					// This counts as uninterruptable (claimReservedPosition would follow)
					var sP = this.unit.findAndReserveStoragePositionFor(this.item);
//console.log(`sP: ${sP}`);

					if (sP) { // OK, proceed w/ grabbing

						wP.data.eventFn = [ null, () => this.onPickUpAxe() ];
						wP.data.eventTarget = { sP };

						super.updateTrackFromWayPoint(wP); // update event
						return;
					}

					// PickUpAxeThrow
					// - item is unable to get picked up: listener;
					// - during action: not handled (counts as uninterruptable)
// TODO (v2-3?)
// consider rework: add events,tracks as props. to WP's

					console.assert(wP.data.action == "PickUpAxe");

					// Replacement must have same duration (unless .g updated).
					wP.data.action = "PickUpAxeThrow";

					wP.data.eventTarget = {

						throwPosition: new THREE.Vector3(wP.x, 0, wP.y),
						throwFacing: wP.angle,
						oP: {
							name: "OP_PickUpAxeThrow",
							position: this.itemPosition,
							facing: wP.angle,
						}
					};

					// Update is performed "in place" (w/o full update of TrackList).
					// different events.
					super.updateTrackFromWayPoint(wP);

					// Item state changes, must recompute further episodes.
					this.unit.aI.episodes.removeEpisodesAfter(episode.id); // this is from ItemEvent (not AI.update)
					this.updateUnitTrackList();

					// It was determined: impossible to reach task objections.
					this.setTaskFinishedFail('task_status_inv_full');
				};

			});

		}


		episode.addItemListener(this.item, () => {

			this.unit.aI.forceReplanning();
		});

		return episode;
	}


	onPickUpAxe() {

		this.setTaskFinishedOK();

		console.assert(this.item.storagePosition);

		Accounting.addEntry(this.unit, "pickUpInventoryItem", {

			id: this.item.id,
			sP: this.item.storagePosition
		});

		Main.user.progress.onPickUpInventoryItem(this.item, this.unit);
	}

}



export { TaskGrabItem };

