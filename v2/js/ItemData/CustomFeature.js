
class CustomFeature {

	constructor(customData, typeId, value1 = 1, value2 = 0) {

		if (!customData)
			Report.warn("!customData");

		this.gId = null;

		this.customData = customData;

		this.autoAdded = false; // default: omitted in DB.

		this.typeId = typeId;
		this.value1 = value1; // can't be 0; default is 1
		this.value2 = value2;

		this.flags = 0 |0;
	}


	toString() {
		return `[CustomFeature typeId=${this.typeId} value1=${this.value1} value2=${this.value2}]`
	}


	hasFlagUpdated() { return (this.flags & Item.FLAG_UPDATED) !== 0 }

	setFlagUpdated() { this.flags |= Item.FLAG_UPDATED }


	//setFlagRemoved() { this.flags |= Item.FLAG_REMOVED; }

	//isRemoved() { return (this.flags & Item.FLAG_REMOVED) !== 0; }


	fromJSON(data) {

		if (!data.typeId)
			Report.warn(`feature typeId is missing`, `item=${this.customData.item}`);

		this.typeId = data.typeId;
		this.value1 = data.value1 || 1;
		this.value2 = data.value2 || 0;

		return this;
	}


	toJSON() {

		var obj = {
			typeId: this.typeId,
		};

		if (this.value1 !== 1)
			obj.value1 = this.value1;

		if (this.value2 !== 0)
			obj.value2 = this.value2;

		return obj;
	}


	getConf() {
		return this.customData.getFeatureConfByTypeId(this.typeId);
	}


	getValue1Conf() {
		return this.customData.getFeatureValue1Conf(this);
	}

}




export { CustomFeature };

