
import { Item } from './Item.js';


var _propCompData;


class CustomItem extends Item {

	constructor(spec) {

		super(spec);

		this.customData = new CustomData(this);

		if (!this.spec.data.features)
			this.spec.data.features = [];
	}


	fromJSON(data) {

		super.fromJSON(data);

		this.customData.fromJSON(data.customData);

		return this;
	}


	toJSON() {

		var obj = super.toJSON();

		obj.customData = this.customData.toJSON();

		return obj;
	}


	getFeatureValue2(name) {

		var f = this.customData.getFeatureByName(name);

		return f && f.value2;
	}


	setFeatureValue2(name, value2) {

		this.customData.setFeatureValue2(name, value2);

		//this.setFlagUpdated(); // TODO required?
	}


	updateProps() {

		this._itemProps = null;

		if (!Main.isServer) {

			this.customData.clearCache();
			this.updateDisplay(); // +static pos.data
		}
	}


	getMesh() {

		if (this.isUnit())
			return Report.warn("bad call", `${this}`);

		if ( !('getGeometry' in this) ) {

			Report.warn("CustomItem w/o .getGeometry()", `${this}`);
			return super.getMesh();
		}

		var geometry = this.getGeometry(); // unlike Item: can have per-item geometry

		this.customData._customMesh = ItemSpec.createDummyMesh(

			this.spec.name + "-" + this.id,
			geometry,
			this.spec.data.matName,
		);

		return this.customData._customMesh;
	}


	getPropCompData() {

		return _propCompData ? ItemProps.clearPropCompData( _propCompData )
			: ( _propCompData = ItemProps.createPropCompData() );
	}


	getProps() {

		if (this._itemProps)
			return this._itemProps;

		var props = super.getProps(); // "base props"


		var propCompData = this.getPropCompData();

		// value2: { affects: "hitStrength", acts: "add", range: [ 1, 3 ] },
		// { affects: "costCrystals", acts: "add", value: 99 }
		var doAddUp = (obj, value2) => {

			var data = propCompData.props[ obj.affects ];
			if (!data)
				return Report.warn("no propCompData entry", `affects=${obj.affects}`);

			var value = value2 !== undefined ? value2 : obj.value;
			if (typeof value != "number")
				return Report.warn("addUp value: bad type", `"${value}"`);

			if (obj.acts == "add")
				data.add += value;

			else if (obj.acts == "mult")
				data.mult *= value;

			else if (obj.acts == "postAdd")
				data.postAdd += value;

			else if (obj.acts == "ceilMultipleOf")
				data.ceilMultipleOf = Math.max(data.ceilMultipleOf, value);

			else if (obj.acts == "postAddIfNonZero")
				data.postAddIfNonZero += value;

			else
				Report.warn("unrecognized obj.acts", `${obj.acts}`);

			//console.log(`${this} getProps doAddUp ${obj.affects} ${data.add} ${data.mult}`);
		};


		this.customData.features.forEach(f => {

			var value1Conf = f.getValue1Conf();

			if (value1Conf.value2)
				doAddUp(value1Conf.value2, f.value2);

			if (value1Conf.affects)
				value1Conf.affects.forEach(obj => doAddUp(obj));
		});

		propCompData.traverseProps( (data, propName) => {

			var value = props[ propName ];

			value += data.add;
			value *= data.mult;

			if (value !== 0)
				value += data.postAddIfNonZero;

			value += data.postAdd;

			if (ItemProps.isInteger(propName))
				value = Math.trunc(value);

			else if (ItemProps.isIntegerAfter100(propName) && value > 100)
				value = Math.floor(value + 0.5);

			if (data.ceilMultipleOf > 0)
				value = Math.ceil(value / data.ceilMultipleOf) * data.ceilMultipleOf;

			props[ propName ] = value;
		});

		return props;
	}

}




export { CustomItem };

