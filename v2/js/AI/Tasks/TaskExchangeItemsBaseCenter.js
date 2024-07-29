
import { Task } from './Task.js';


class TaskExchangeItemsBaseCenter extends Task {

	constructor(unit, baseCenter, item, targetSP) {

		super(unit, "TaskExchangeItemsBaseCenter");

		this.baseCenter = baseCenter;
		this.sP_ByItem = this.createSP_ByItem();

		console.assert(!this.isTaskFinished());

		if ( !baseCenter.isAtApproachPoint(unit) ) {

			this.setTaskFinishedFail();
			Report.warn("not at baseCenter OP");
			return;
		}

		if (!this.checkItem(item, targetSP)) {

			this.setTaskFinishedFail('task_status_no_item');
			return;
		}

		// 1 item per episode. 1st episode may contain dropping of carried item or disarm.

		this.enqueueItem(item, targetSP);
	}


	getLangDescr() {
		return Lang('TaskExchangeItemsBaseCenter');
	}


	createSP_ByItem() {

		// Target storagePosition (sP) by item.
		// * This is preferred sP; It gets reserved when operation starts.

		var sP_ByItem = new Map;

		return sP_ByItem;
	}


	checkItem(item, targetSP) {

		if (this.isTaskFinished())
			return Report.warn("task is finished");

		if (this.sP_ByItem.has(item))
			return Report.warn("item already enqueued");

		if (!item.isStoredAt(this.unit) && !item.isStoredAt(this.baseCenter)) // allow unit equip?
			return Report.warn("item is not in inventory");

		var sP = item.storagePosition;

		if (sP.baseId === targetSP.baseId
				|| sP.baseId !== this.unit.id && targetSP.baseId !== this.unit.id
				|| sP.baseId !== this.baseCenter.id && targetSP.baseId !== this.baseCenter.id)

			return Report.warn("bad sP, targetSP", `${item} ${sP} ${targetSP}`);

		return true;
	}


	enqueueItem(item, targetSP) {

		if (!this.checkItem(item, targetSP))
			return;

		this.sP_ByItem.set(item, targetSP);

		this.enqueueStripIdleEpisodes(); // It assumes add-up of one more episode.
	}


	hasEnqueuedItems() { return this.sP_ByItem.size > 0 }

	getEnqueuedItems() { return [ ...this.sP_ByItem.keys() ] }

	getNextItem() {
		return this.getEnqueuedItems().find(item =>
			!this.findEpisode(e => e.type == "ExchangeItem_BaseCenter" && e.data.item === item) );
	}

	removeItemFromQueue(item) { this.sP_ByItem.delete(item) }

	getCurrentlyMisplacedItems() { return this.getEnqueuedItems() }


	addEpisode(startNode) {

		var item = this.getNextItem();
		if (!item)
			return;

		var episode = new EpisodeInPlaceAction(this, startNode, "ExchangeItem_BaseCenter");
		episode.data.item = item;


		var carrying = this.unit.getCarryingAt(startNode.g);
		if (carrying)
			episode.addAction("DropFwd", carrying);

		var equipRightHand = this.unit.getEquipRightHandAt(startNode.g);
		if (equipRightHand)
			episode.addDisarmAction(equipRightHand);


		var sP = this.sP_ByItem.get(item);
		var toChar = sP.baseId === this.unit.id;

		var target = {
			sP,
		};

		var wP;

		if (toChar) {

			wP = episode.addAction("GetAxeFromBase", item,
				[ target, target ],
				[ () => this.onExchangeEvent1(item, target, "getAxe"),
					() => this.onExchangeEvent2(item, target, "getAxe") ]
			);

		} else {

			wP = episode.addAction("PutAxeBase", item,
				[ target, target ],
				[ () => this.onExchangeEvent1(item, target, "putAxe"),
					() => this.onExchangeEvent2(item, target, "putAxe") ]
			);
		}

		wP.data.startFn = () => { // "Uninterruptable" current operation starts

			if ( item.canPlaceInPosition(target.sP) ) {
//console.log(`${item.id} | planned sP ${sP}`);
				Storage.reservePosition(item, target.sP);
				return; // OK, proceed
			}

			// Previously appointed sP is not available.
			// Get some other one, within baseItem.

			var baseItem = target.sP.getBaseItem();

			target.sP = baseItem.findAndReserveStoragePositionFor(item);

			if (target.sP) {
//console.log(`${item.id} | different sP ${sP} -> ${target.sP}`);
				return; // OK, proceed w/ different sP
			}

			// No sP available. Item remains "as is" w/o further attempts.
//console.log(`${item.id} | No sP available.`);
			this.removeItemFromQueue(item); // delete item from queue

			wP.data.action = "";

			this.unit.aI.episodes.removeEpisodeByIdAndAfter(episode.id); // this is from ItemEvent (not AI.update)
			this.updateUnitTrackList();

			UI.update();
		}

		episode.onFinished( () => {

			if (!this.hasEnqueuedItems()) {

				this.setTaskFinishedOK();
			}
		});

		return episode;
	}


	onExchangeEvent1(item, target) {

		this.unit.doEquipAxe(item);
	}


	onExchangeEvent2(item, target, what) {

		this.removeItemFromQueue(item);

		this.unit.doDisarm(item);

		if (item.isRemoved()) { // TODO handle if sold before operation starts

			Report.warn("removed(sold) before taken from the base");
			Storage.removeReservedPosition(item, target.sP);
			return;
		}

		item.removeFromStorage();
		Storage.claimReservedPosition(item, target.sP); // screen upd.

		Accounting.addEntry(this.unit, "invTransfer", {

			id: item.id,
			sP: target.sP,
			baseId: this.baseCenter.id
		});

		if (what == "getAxe")
			Main.user.progress.onGetAxeFromBase(item, this.unit);

		this.unit.aI.enqueueReplanning(); // possible change in equipment
	}


}



export { TaskExchangeItemsBaseCenter };

