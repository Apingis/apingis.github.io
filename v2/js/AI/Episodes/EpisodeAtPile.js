
import { Episode } from './Episode.js';


class EpisodeAtPile extends Episode {

	constructor(task, startNode, facing, oP) {

		super(task, startNode, "AtPile");

		this.facing = facing;

		console.assert(oP.name == "ThrowToPileOP");
		console.assert(oP.aP.facing === facing);
		this.oP = oP;

		this.throwAction = null;
	}


	compute(targetTime) {

		// TODO review
		//if ( this.task.getEpisodes().find(e => e !== this && e.type == "AtPile") )
		//	return Report.warn("already have atPile");

		if ( !this.createWayPoints() )
			return;

		this.completed = true;
		return true;
	}


	createWayPoints() {

		// Event must be registered when the episode/action is created
		// (consistent item handling principle).
		// - Requires to updateUnitTrackList() after episode is computed
		//
		var carriedItem = this.unit.getCarryingAt(this.getStartTime());
		if (!this.checkCarriedItem(carriedItem))
			return;


		var start = this.createNode().addFlags(VGNode.EPISODE_START);

		var stand1 = this.createNode(true, this.oP.aP.facing).addG(0.3);

		this.throwAction = this.createNode(true, this.oP.aP.facing);
		this.throwAction.g = stand1.g + Action.getDuration("ThrowLeft90", this.unit);

		this.throwAction.data.action = "ThrowLeft90"; // Will replace later (all equal duration)
		this.throwAction.data.eventItem2 = carriedItem;
		this.throwAction.data.eventTarget = {
			oP: this.oP,
			targetPosition: null,
		};


		this.wayPoints = new WayPoints().add(start, stand1, this.throwAction);

		if ( !this.checkAndHandleCollision(start, this.throwAction) )
			return;


		stand1.data.startFn = () => {

			// On arrival at the operation point, it starts "Standing" track. Choices:
			//
			// - throwing is not possible, determine further activity, force update of TrackList.
			// (remove next episodes)
			//
			// - keep current planning, determine throw parameters
			// (update WP's).
			// At the moment, log is considered placed into storage.

			var log = this.unit.getCarrying();

			console.assert(log === carriedItem);

			if (!this.checkCarriedItem(log))
				return this.cancelThrowAction("NoLogToThrow");


			var cP = this.oP.baseItem.getPlacement();

			if (cP && cP.isMoving())
				return this.cancelThrowAction("cPIsMoving");


			var logStorage = this.oP.storage;

			var sP = logStorage.placeLogIntoStorage(log, this.oP);
			if (!sP)
				return this.cancelThrowAction("PlacementNotAvailable");


			// After placement, determine throw parameters, update WP.data.* params.

			var targetPosition = logStorage.getLogPositionWorld(log).clone();

			this.throwAction.data.eventTarget.targetPosition = targetPosition;

			var action = logStorage.getThrowType(sP, this.oP);

			if (action !== this.throwAction.data.action) {

				this.throwAction.data.action = action;
				// Update is performed "in place" (w/o full update of TrackList).
				super.updateTrackFromWayPoint(this.throwAction); // different event timing
			}


			// Log counts as placed. Send its position in the pile.

			Accounting.addUnitPosEntry(this.unit);

			var data = {
				sP,
				id: log.id,
				x: Util.froundPos(targetPosition.x),
				y: Util.froundPos(targetPosition.y),
				z: Util.froundPos(targetPosition.z),
			};

			var q = this.unit.charData.getThrowToPile_Quaternion(this.oP.unitFacing, action);

			Util.addFroundQuaternion(data, q);

			Accounting.addEntry(this.unit, "logToStorage", data);

			this.unit.accountLog(log);

			this.task.cntLogs ++;
			this.task.totalLogMass += log.getLogMass();

			Main.user.progress.onPlaceLogToStorage();
		};


		if (this._onFinished) // for TaskDeliverLog/DropCarrying
			this.throwAction.data.arriveFn = this._onFinished;

		this.completed = true;
		return true;
	}


	static runThrowEvent(type, unit, log, target) {

		if (!unit.charData.carryId)
			return Report.warn("log is already placed", `${unit} ${log}`);

		unit.releaseItem_ThrowToPile(type, target.oP); // sets log's position, quaternion

		log.setThrownTo(target.targetPosition, () => {

			target.oP.storage.setLogLocalCoord( log );
			target.oP.baseItem.addDependentItem( log );
		});

		UI.updateFor(unit);
	}


	// Standing at pile's OP, it determined operation is not possible.
	// Throw is cancelled.
	cancelThrowAction(reason) {

		if (Main.DEBUG >= 5)
			console.log(`unit.id=${this.unit.id} throw cancelled: ${reason}`);

		// 1. Throw WP is replaced with equal duration Standing

		this.throwAction.data.action = "";
		super.updateTrackFromWayPoint(this.throwAction);

		// 2. Cancel further episodes

		this.unit.aI.episodes.removeEpisodesAfter(this.id); // from ItemEvent (not AI.update)
		this.updateUnitTrackList();

		if (reason == "NoLogToThrow")
			return Report.warn("cancelThrowAction", `reason=${reason}`);

		// Unless this OP is somehow prohibited, it'd try to use it again.

		// OP is requested base on actual remaining capacity; if it can't throw now
		// then it wouldn't be in destination later (unless wood is removed from the storage).
	}


	checkCarriedItem(item) {

		if (!item || !item.isLog())
			Report.warn("carrying nothing", `item=${item} e=${this}`);
		else
			return true;
	}

}



export { EpisodeAtPile };

