
class UserBase {

	constructor() {

		this.login = null;
		this.origin = '';
		this.sessionKey = "";
		this.lang = "";

		this.nextItemId = 200;
		this.endT = 0;

		this.cameraLocation = new CameraLocation;

		this.coins = 0;
		this.earned = 0;
		this.crystals = 0;

		this.progress = new Progress;
		this.level = 0;
		this.soldWood = 0;
	}


	fromJSON(obj) {

		this.login = obj.login;
		this.origin = obj.origin;
		this.sessionKey = obj.sessionKey;
		this.lang = obj.lang;

		this.nextItemId = obj.nextItemId;
		this.endT = obj.endT;

		this.cameraLocation.set(obj.cameraX, obj.cameraY, obj.cameraH, obj.cameraA);

		this.coins = obj.coins;
		this.earned = obj.earned;
		this.crystals = obj.crystals;

		this.progress.fromJSON(obj.progress);
		this.level = obj.level;
		this.soldWood = obj.soldWood;
	}


	toJSON() { // flattened objs.

		var obj = {

			login: this.login,
			origin: this.origin,
			sessionKey: this.sessionKey,
			lang: this.lang,

			nextItemId: this.nextItemId,
			endT: this.endT,

			cameraX: this.cameraLocation.x,
			cameraY: this.cameraLocation.y,
			cameraH: this.cameraLocation.h,
			cameraA: this.cameraLocation.a,

			coins: this.coins,
			earned: this.earned,
			crystals: this.crystals,

			progress: this.progress.toJSON(),
			level: this.level,
			soldWood: this.soldWood,
		};

		return obj;
	}


	checkLevelUp() {

		if (this.level === 0 && this.soldWood >= UserBase.LEVEL1_TARGET_AMOUNT) {

			this._levelUp();
		}
	}


	_levelUp() {

		this.level ++;

		if (!Main.isServer)
			UI.update();
	}


	addSoldWood(volume) {

		this.soldWood = Util.froundVolume(this.soldWood + volume);

		this.checkLevelUp();
	}


	addCoins(amount) {

		if (!Util.checkCoins(amount))
			return;

		this.coins = Util.froundCoins(this.coins + amount);
		this.earned = Util.froundCoins(this.earned + amount);

		if (!Main.isServer)
			UI.Coins.setRequiresUpdate(1, 0);

		return true;
	}


	subtractCoins(amount) {

		if (!Util.checkCoins(amount))
			return;

		this.coins = Util.froundCoins(this.coins - amount);

		if (!Main.isServer)
			UI.Coins.setRequiresUpdate(-1, 0);

		return true;
	}


	addCrystals(amount) {

		if (!Util.checkCrystals(amount))
			return;

		this.crystals = this.crystals + amount;

		if (!Main.isServer)
			UI.Coins.setRequiresUpdate(0, -1);

		return true;
	}


	subtractCrystals(amount) {

		if (!Util.checkCrystals(amount))
			return;

		this.crystals = this.crystals - amount;

		if (!Main.isServer)
			UI.Coins.setRequiresUpdate(0, -1);

		return true;
	}


	hasEnough(data) {

		if ( !(1
			&& data instanceof Object
			&& (data.type == 'coins' || data.type == 'crystals')
			&& data.amount > 0
		) )
			return Report.warn("bad cost data", data);

		return data.type == 'coins' && this.coins >= data.amount
			|| data.type == 'crystals' && this.crystals >= data.amount;
	}


	spend(data) {

		if (!this.hasEnough(data))
			return;

		if (data.type == 'coins')
			return this.subtractCoins(data.amount);
		else
			return this.subtractCrystals(data.amount);
	}







	hasCashAmountToBuyItem(item) {

		var props = item.getProps();

		return props.hasCostCrystals()
			? this.crystals >= props.getCostCrystals()
			: this.coins >= props.getBuyCost()
	}


	subtractAmountForItem(item) {

		if (!this.hasCashAmountToBuyItem(item))
			return;

		var props = item.getProps();

		if ( props.hasCostCrystals() )
			this.subtractCrystals( props.getCostCrystals() );
		else
			this.subtractCoins( props.getBuyCost() );

		return true;
	}


	hasCashAmountToAddChar(headId) {

		var data = CharData.getAddExpenseData(headId); // { type: "coins", amount: 50 }

		return data && (
			data.type == "coins" && this.coins >= data.amount
			|| data.type == "crystals" && this.crystals >= data.amount
		);
	}


	spendForAddChar(headId) {

		if (!this.hasCashAmountToAddChar(headId))
			return;

		var data = CharData.getAddExpenseData(headId);

		if (data.type == "coins")
			this.subtractCoins(data.amount);

		else if (data.type == "crystals")
			this.subtractCrystals(data.amount);

		else
			return Report.warn("bad data.type", `${data.type}`);

		return true;
	}


}


Object.assign(UserBase, {

	LEVEL1_TARGET_AMOUNT:	1,

});



export { UserBase };

