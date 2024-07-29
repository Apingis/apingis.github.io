
class CharData {

	constructor(item) {

		this.item = item;

		this.headId = 1;
		this.name = ""; // unless set - dependent on headId
		this.wearGlasses = true;

		this.carryId = null;
		this.carryingReverted = false;
		this.carryingRotationXLocal = null; // At time when it was on the ground.

		this.task = 0;
		this.taskArg1 = null;
		this.taskArg2 = null;

		this.cntChopped = 0;
		this.cntLogs = 0;
		this.totalLogMass = 0;

		// There may be a weapon in hand.
		// Whether it's displayed or not depends on this.
		this.equipRightHand = null;
	}

/*
	get equipRightHand() { console.error(`equipRightHand`); }

	set equipRightHand(v) { console.error(`set equipRightHand`); }
*/
	get carrying() { console.error(`carrying`); }

	//setFlagUpdated() { this.flags |= Item.FLAG_UPDATED; } // looks useless

	//hasFlagUpdated() { return (this.flags & Item.FLAG_UPDATED) !== 0; }


	fromJSON(data) {

		if (typeof data != "object")
			Report.throw("no .charData", `id=${this.item.id}`);

		this.headId = data.headId || 1;
		this.name = data.name || "";

		this.carryId = data.carryId;
		this.carryingReverted = data.carryRev;
		this.carryingRotationXLocal = data.carryRotXL;

		this.task = data.task;
		this.taskArg1 = data.taskArg1;
		this.taskArg2 = data.taskArg2;

		this.cntChopped = data.cntChopped || 0;
		this.cntLogs = data.cntLogs || 0;
		this.totalLogMass = data.totalLogMass || 0;
	}


	toJSON() {

		var obj = {

			headId: this.headId,

			carryId: this.carryId,
			carryRotXL: this.carryingRotationXLocal,
			carryRev: this.carryingReverted,

			task: this.task,
			taskArg1: this.taskArg1,
			taskArg2: this.taskArg2,

			cntChopped: this.cntChopped,
			cntLogs: this.cntLogs,
			totalLogMass: this.totalLogMass,
		};

		return obj;
	}


	getNameKey() {

		switch (this.headId) {

			default: return "char_name_default";

			case 5: return "char_name_5";
			case 6: return "char_name_6";
			case 4: return "char_name_4";

			case 3: return "char_name_3";
			case 7: return "char_name_7";
			case 1: return "char_name_1";
			case 2:	return "char_name_2";
		};
	}


	getLangName() {
		return this.name || Lang( this.getNameKey() );
	}


	getHeadGeometryName() {

		var wearGlasses = this.wearGlasses;

		switch (this.headId) {

			default: Report.warn("unknown headId", `${this.headId}`);

			case 1: return wearGlasses ? "head01b" : "head01a";
			case 2:	return wearGlasses ? "head02b" : "head02a";
			case 3: return "head03a";
			case 4: return "head03b";
			case 5: return wearGlasses ? "head04c" : "head04a";
			case 6: return wearGlasses ? "head05c" : "head05a";
			case 7: return "head06";
		};
	}


	isCarrying() { return this.carryId; }

	getCarrying(localKey) {
		return this.carryId && Item.byId(this.carryId, localKey);
	}


	dropCarryingOnGround(item, charFacing, t) {

		if (!item || item.id !== this.carryId)
			Report.throw("wrong or no item", `${item}`);

		if (!Number.isFinite(charFacing))
			Report.throw("bad charFacing", `f=${charFacing}`);

		var direction = new THREE.Vector3(Math.cos(charFacing), 0, Math.sin(charFacing));

		item.position.copy(this.item.position).add(
			// 0.29 is from getGrabLocations()
			direction.multiplyScalar(0.29)//0.27 - item.getLogRadius()) <-- setY
		).setY(item.spec.y0);

		item.useQuaternion().identity();
		item.quaternion.setFromAxisAngle(Item.axisX, this.carryingRotationXLocal);

		item.rotateY( charFacing
			+ (this.carryingReverted ? Math.PI / 2 : -Math.PI / 2) );

		this.carryId = null;

		item.setFlagUpdated();
		this.item.setFlagUpdated();
	}


	liftItemFromGround(item, t) {

		if (this.isCarrying())
			Report.throw("already carrying", `${this.item}`);

		if (!item || !item.isLogOnTheGround())
			Report.throw("wrong or no item", `${item}`);

		var elevation = Math.abs(item.getElevationFactor());

		if (elevation > 0.1)
			Report.throw("not horizontally positioned", `${item} e=${elevation}`);

		else if (elevation > 1e-9)
			item.removeElevation();


		if (!item.isUnitAtGrabLocation(this.item))
			Report.throw("unit is not at grab location", `char=${this.item} item=${item}`);


		var	charPt = this.item.getPoint(),
			itemPt = item.getPoint();

		var absDiff = Angle.absDiff(charPt.angleToPoint(itemPt), item.facing + Math.PI / 2);

		if ( !(absDiff < 1e-2 || absDiff > Math.PI - 1e-2) )
			Report.throw("improperly positioned", `u=${this.item} absDiff=${absDiff}`);

		// Approximate, security safe distance check.

		let d = charPt.distanceToPoint(itemPt);
		if (d > 0.3)
			Report.throw("too far away", `d=${d}`);


		this.carryId = item.id;
		this.carryingReverted = absDiff > Math.PI / 2;
		this.carryingRotationXLocal = Util.froundPos( item.getRotationXLocal() );

		item.setFlagUpdated();
		this.item.setFlagUpdated();
	}


	// equals to item release quaternion
	getThrowToPile_Quaternion(unitFacing, actionType) {

		var getRotXDiff = () => {

			switch (actionType) {
				case "ThrowLeft90": return 1.907;
				case "ThrowLeft45": return 1.641;
				case "ThrowRight90": return 1.891;
				case "ThrowRight45": return 1.665;
				default: Report.throw("unknown type", actionType);
			};
		}

		var angleRotX = this.carryingRotationXLocal
			+ (this.carryingReverted ? getRotXDiff() : -getRotXDiff());

		var q = CharData._throwToPile_Quaternion.setFromAxisAngle(Item.axisX, angleRotX);

		var angleRotY = unitFacing
			+ (this.carryingReverted ? Math.PI / 2 : -Math.PI / 2);

		return q.premultiply(this.item._quaternion.setFromAxisAngle(Item.axisY, -angleRotY));
	}


	static isValidAddHeadId(headId) { return CharData.CharAddHeadIds.indexOf(headId) !== -1 }

	static getAddExpenseData(headId) { return CharData.CharAddCostByHeadId[ headId ] }
}


Object.assign(CharData, {

	CharAddHeadIds: [ 3, 7, 1, 2 ],

	CharAddCostByHeadId: {

		3: { type: "coins", amount: 50 },
		7: { type: "coins", amount: 50 },
		1: { type: "crystals", amount: 100 },
		2: { type: "crystals", amount: 100 },
	},


	_throwToPile_Quaternion: new THREE.Quaternion,

});




export { CharData }

