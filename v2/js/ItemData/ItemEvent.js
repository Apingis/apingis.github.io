
class ItemEvent {

	constructor(item, type, time, item2, target, eventFn, beforeEventFn) {

		if ( !(item instanceof Item) )
			Report.throw("bad item", `${item}`);

		if (typeof type != "string" || !type)
			Report.throw("bad type", `${type}`);

		if (typeof time != "number" || time < 0)
			Report.throw("bad time", `${time}`);

		this.item = item;
		this.type = type;
		this.time = time;

		this.item2 = item2;
		this.target = target;
		this.eventFn = eventFn;
		this.beforeEventFn = beforeEventFn;

		this.executed = false;

		if (this.isTypeFunction() && typeof item2 != "function")
			Report.throw("bad isTypeFunction", `${item2}`);
	}


	toString() {
		var item2IdStr = this.item2 ? ` item2Id=${this.item2 && this.item2.id}` : "";
		return `[ItemEvent type=${this.type} itemId=${this.item.id}${item2IdStr}`
			+ ` t=${Util.toStr(this.time)}]`;
	}


	isTypeFunction() {
		return this.type == "StartFn" || this.type == "ArriveFn"
	}

	isTypeAxeHit() {
		return this.type == "AxeDownward" || this.type == "AxeHorizontal"
			|| this.type == "AxeHorizontalStump";
	}

	isTypeEquipAxe() {
		switch (this.type) {
			case "StandingEquipAxe":
			case "GetThrowAxe":
			case "PickUpAxe":
			case "PickUpAxeThrow":
			case "PutAxeBase":
			case "GetAxeFromBase":
				return true;
		};
	}

	isTypeDisarm() {
		switch (this.type) {
			case "AxeDisarm":
			case "GetThrowAxe_1":
			case "StandingAxeThrow":
			case "PickUpAxe_1":
			case "PickUpAxeThrow_1":
			case "PutAxeBase_1":
			case "GetAxeFromBase_1":
				return true;
		};
	}

	isTypeStartCarrying() {
		return this.type == "Lifting2H";
	}

	isTypeStopCarrying() {
		return this.type == "DropFwd"
			|| this.type == "ThrowLeft90" || this.type == "ThrowLeft45"
			|| this.type == "ThrowRight90" || this.type == "ThrowRight45";
	}


	// ==============================================

	isTypeRobotLoad() {
		return this.type == "RobotLoad";
	}

	isTypeRobotUnload() {
		return this.type == "RobotUnload";
	}

	isTypeRobotTakeoff() {
		return this.type == "RobotTakeoff" || this.type == "RobotTakeoffLoaded";
	}

	isTypeRobotTouchdown() {
		return this.type == "RobotTouchdown" || this.type == "RobotTouchdownLoaded";
	}


	execute() {

		try {
			this.execute_1();

		} catch (e) {

			if (!e.isReport)
				throw e;

			Report.warn(e.message, e.arg, e.stack);
		}
	}

}


ItemEvent.prototype.execute_1 = function() {

	this.executed = true; // Replace of track w/ events from event: possible

	var	unit = this.item,
		item2 = this.item2,
		target = this.target;

//console.error(`Exec ${this}`);

	if (!this.isTypeFunction() && (unit instanceof Unit))
		Accounting.addUnitPosEntry(unit);

	if (!this.isTypeFunction() && this.beforeEventFn)
		 this.beforeEventFn();


	switch (this.type) {

	case "StartFn":
	case "ArriveFn":
	case "CustomFn":
		console.assert(!target);
		item2();
		break;

	case "Lifting2H":

		if (item2.isLogOnTheGround()) { // replace animation if not?
			unit.liftItemFromGround(item2, this.time);
		}

		UI.updateFor(unit);
		break;

	case "DropFwd":
		unit.dropCarryingOnGround(item2, this.time);
		UI.updateFor(unit);
		break;

	case "ThrowLeft90": // different event timing
	case "ThrowLeft45":
	case "ThrowRight90":
	case "ThrowRight45":
		EpisodeAtPile.runThrowEvent(this.type, unit, item2, target);
		break;


	case "GetThrowAxe":
		unit.doEquipAxe(item2);
		item2.setOn3D(this.time);
		break;

	case "GetThrowAxe_1":
	case "StandingAxeThrow":

		item2.removeFromStorage();
		unit.doDisarm(item2);

		unit.releaseItemAxe_Throw(this.type, item2, target);
		item2.setThrownTo(target.oP.position);
		UI.updateFor(unit);
		break;


	case "PickUpAxe":
	case "PickUpAxeThrow":
		unit.doEquipAxe(item2);
		break;

	case "PickUpAxe_1":
		unit.doDisarm(item2);
		item2.setPositionNone(this.time);
		Storage.claimReservedPosition(item2, target.sP);
		UI.updateFor(unit);
		break;

	case "PickUpAxeThrow_1":
		unit.doDisarm(item2);
		unit.releaseItemAxe_Throw(this.type, item2, target);
		item2.setThrownTo(target.oP.position);
		break;


	case "PutAxeBase":
	case "PutAxeBase_1":
	case "GetAxeFromBase":
	case "GetAxeFromBase_1":
		break; // Fn's moved to TaskExchangeItemsBaseCenter eventFn's


	case "AxeDownward":
	case "AxeHorizontal":
	case "AxeHorizontalStump": // item2 unused

		var oP = target;

		oP.item.doAxeHit_event(unit, oP);
		unit.aI.enqueueReplanning();
		break;


	case "StandingEquipAxe":
		console.assert(item2 && item2.isAxe())
		unit.doEquipAxe(item2);
		break;

	case "AxeDisarm":
		console.assert(item2 && item2.isAxe())
		unit.doDisarm(item2);
		item2.setPositionNone(this.time);
		break;



	case "FallingComplete":
		this.item.onFallingComplete_Event(this.time)
		break;

	case "ItemCrumble":
/*
		if (!this.item.isStatic3D()) {
			Report.warn("crumble event: !isStatic3D, skip", `${this.item} t=${Engine.time}`);
			break;
		}
*/
		this.item.removeItem();

		if (!this.item.hasTmpId())
			Accounting.addEntry(this.item, "crumble");

		break;

	case "ItemDisplayUpdate":
		this.item.updateDisplay(false);
		break;


	case "CharAppearStage":
		Char.charAppearStage(this.item, item2, target);
		break;


	case "RobotLoad":
	case "RobotUnload":
		break;


	case "RobotTakeoff":
	case "RobotTakeoffLoaded":
		this.item.setRobotFlying(true);
		break;

	case "RobotTouchdown":
	case "RobotTouchdownLoaded":
		this.item.setRobotFlying(false);
		break;


	case "ConstructionEvent":
		this.item.runEvent(this.time);
		break;

	case "WoodIntake_Sell":
		this.item.runEvent_Sell(this.time);
		break;

	case "WoodIntake_Sell_End":
		this.item.runEvent_Sell_End(this.time);
		break;

	case "UIUpdateFor":
		UI.updateFor(item2);
		break;


	default:
		Report.throw("unknown event type", `t=${this.type}`);
	};


	if (!this.isTypeFunction())
		this.eventFn && this.eventFn();
}




export { ItemEvent };

