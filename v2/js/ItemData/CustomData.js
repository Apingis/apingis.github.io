
import { ItemSpec } from '../Assets/ItemSpec.js';


class CustomData {

	constructor(item) {

		this.item = item;

		this.features = [];

		this.addUpDefaultFeatures();

		this._customMesh = null;
		//this._customGeometryEquip = null;
	}


	toString() {
		return `<CustomData for ${this.item} f: `
			+ this.features.map(f => `${f.typeId}=${f.value1}${!f.value2 ? '' : ','+f.value2}`).join(" | ")
			+ ` >`;
	}


	clearCache() {
		this._customMesh = null;
		//this._customGeometryEquip = null;
	}


	setUpdated() {
		this.features.forEach(feature => feature.setFlagUpdated());
	}


	clampFeatureValue2(f, value1Conf) {

		if (value1Conf.value2any)
			return;

		if (!value1Conf.value2 && f.value2) {

			Report.warn("non-zero value2", `${f} ${this.item}`);
			f.value2 = 0;
		}

		if (!value1Conf.value2)
			return;


		if (Main.DEBUG >= 3) {

			if ( ItemProps.List.indexOf(value1Conf.value2.affects) === -1 )
				Report.warn("bad affects", `${f} ${this.item}`);

			if ( !(0
				|| value1Conf.value2.acts === "add"
				|| value1Conf.value2.acts === "mult"
				|| value1Conf.value2.acts === "postAdd"
			) )
				Report.warn("bad keyword", `${f} ${this.item}`);
		}


		var range = value1Conf.value2.range;

		if (f.value2 < range[0] || f.value2 > range[1]) {

			Report.warn("value2 not in range", `${f} ${this.item}`);
			f.value2 = Util.clamp(f.value2, range[0], range[1]);
		}
	}


	addFeature(f, ifAutoAdded) {

		var conf = this.getFeatureConfByTypeId(f.typeId);

		if (!conf)
			return Report.warn("no feature conf", `${f} ${this.item}`);

		if ( !('value1' in conf) ) {

			// Ensure: feature and its value1 have config
			var value1Conf = this.getFeatureValue1Conf(f);

			if (!value1Conf)
				return Report.warn("no value1Conf", `${f} ${this.item}`);

			// Some are required but can be omitted in DB.
			if (ifAutoAdded)
				f.autoAdded = true;

			this.clampFeatureValue2(f, value1Conf);
		}

		var i = this.features.findIndex(f2 => f2.typeId === f.typeId);

		if (i === -1)
			this.features.push(f);
		else
			Util.cutAndInsert( this.features, i, 1, 1, f );
	}


	fromJSON(data) {

		// no data or empty features: OK (defaultFeatures)
		data && data.features && data.features.forEach(featureData => {

			if (!featureData)
				return;

			var f = new CustomFeature(this).fromJSON(featureData);

			this.addFeature(f);
		});

		this.addUpDefaultFeatures();

		return this;
	}


	addUpDefaultFeatures() {

		var defaultFeatures = this.item.spec.data.defaultFeatures;

		defaultFeatures && defaultFeatures.forEach(el => {

			console.assert(el.typeId && el.value1);

			if (this.getFeatureByTypeId(el.typeId))
				return;

			var f = new CustomFeature(this, el.typeId, el.value1, el.value2);

			this.addFeature(f, true);
		});
	}


	toJSON() {

		var features = Util.mapInPlace(

			this.features.filter(f => !f.autoAdded),
			f => f.toJSON()
		);

		if (features.length === 0)
			return;

		return {
			features
		};
	}


	getFeatureByTypeId(typeId) { return this.features.find(el => el.typeId === typeId); }

	getFeatureName(typeId) {
		var conf = this.getFeatureConfByTypeId(typeId);
		return conf && conf.name;
	}

	getFeatureByName(name) { // easier access?
		var conf = this.getFeatureConfByName(name);
		return conf && this.features.find(f => f.typeId === conf.typeId);
	}

	getFeatureConfByTypeId(typeId) {
		return this.item.spec.data.features.find(f => f.typeId === typeId);
	}


	getFeatureConfByName(name) {

		var conf = this.item.spec.data.features.find(f => f.name === name);
		if (!conf)
			return Report.warn("no feature conf", `name=${name} item=${this.item}`);

		return conf;
	}


	// e.g. feature name: "blade", value1==1: { id:1, name:"axe1", ...}
	getFeatureValue1Conf(f) {

		if (!f)
			return;

		console.assert(f instanceof CustomFeature);

		var conf = this.getFeatureConfByTypeId(f.typeId);

		return conf && conf.value1Conf
			&& conf.value1Conf.find(value1Conf => value1Conf.value1 === f.value1);
	}


	getFeatureValue1ConfByName(name) {
		return this.getFeatureValue1Conf( this.getFeatureByName(name) );
	}



	setFeatureValue2(name, value2) {

		var conf = this.getFeatureConfByName(name);

		if (!conf)
			return Report.warn("no feature conf", `${this} name=${name}`);

		var f = this.features.find(f => f.typeId === conf.typeId);

		if (!f) {

			let value1;

			if ('value1' in conf) {
				value1 = conf.value1;

			} else { // 1st encountered?

				Report.warn("1st encountered", `${this} name=${name}`);

				value1 = conf.value1Conf && conf.value1Conf[0] && conf.value1Conf[0].value1;

				if (!value1)
					return Report.warn("no feature value1 conf", `${this} name=${name}`);
			}

			f = new CustomFeature(this, conf.typeId, value1, value2);

			this.addFeature(f);
		}

		if (value2 !== f.value2) { // TODO v.1

			f.autoAdded = false;
			f.value2 = value2;

			f.setFlagUpdated();
		}
	}


	// ====================================================================


	static getFeatureTypeId(specId, name) {

		var spec = ItemSpec.get(specId);

		if (!spec || !spec.data.features)
			return;

		for (let i = 0; i < spec.data.features.length; i++)

			if (spec.data.features[i].name === name)
				return spec.data.features[i].typeId;
	}


}




export { CustomData }

