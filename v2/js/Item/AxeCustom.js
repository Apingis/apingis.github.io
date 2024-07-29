
import { CustomItem } from './CustomItem.js';


class AxeCustom extends CustomItem {

	constructor(spec) {

		super(spec);
	}

/*
	getGeometryEquip() {

		if (this.customData._customGeometryEquip)
			return this.customData._customGeometryEquip;

		var geometry = this.getGeometry().clone();

		geometry.applyMatrix4(ItemSpec.equipWeaponMatrix);

		Util.addSkinToGeometry(geometry, 13); // Right Hand

		return (this.customData._customGeometryEquip = geometry);
	}
*/

	getMesh() {

		return this.customData._customMesh || (this.customData._customMesh = ItemSpec.createDummyMesh(

			this.spec.name + "-" + this.id,
			this.getGeometry(),
			this.spec.data.matName,
		) );
	}


	getObjGeometry(name) {

		if (!name)
			return Report.warn("no name", `${this}`);

		var obj = this.spec.data.scene.getObjectByName(name);

		if (!obj)
			return Report.warn("no obj", `name="${name}" ${this}`);

		return obj.geometry;
	}


	getGeometry() {

		var geometries = this.customData.features.map(f => this.getFeatureGeometry(f));

		var geometry = Util.mergeGeometriesIfExist(geometries);

		return geometry;
	}


	getFeatureGeometry(feature) {

		var conf = this.customData.getFeatureConfByTypeId(feature.typeId);
		var value1Conf = this.customData.getFeatureValue1Conf(feature);

		if (!value1Conf)
			return;

		if (conf.name === "blade") {

			return this.getObjGeometry(value1Conf.name);


		} else if (conf.name === "handleShape") {

			let offU = 0;

			let handleMatValue1Conf = this.customData.getFeatureValue1ConfByName("handleMat");

			if (handleMatValue1Conf) {

				offU = handleMatValue1Conf.offU;

				if (typeof offU != "number") {
					Report.warn("no offU", `${this}`);
					offU = 0;
				}
			}

			//offU *= 256 / 3 / 2048;
			offU *= 128 / 2048;

			let geometryBase = this.getObjGeometry(value1Conf.name);

			if (offU > 0)
				geometryBase = geometryBase.clone(); // create .cloneUV? will merge anyway

			return Util.adjustUV(geometryBase, 1, offU);


		} else if (conf.name === "handleMat") {
			return;


		} else if (conf.name === "handleWrap") {

			let handleShapeValue1Conf = this.customData.getFeatureValue1ConfByName("handleShape");

			let geometry = this.getObjGeometry(handleShapeValue1Conf.handleWrap);

			if (value1Conf.offU > 0)
				geometry = geometry.clone();

			//return Util.adjustUV(geometry, 1, value1Conf.offU * 256 / 3 / 2048);
			return Util.adjustUV(geometry, 1, value1Conf.offU * 102 / 2048);


		} else
			Report.warn("getFeatureGeometry: unsupported", `${feature} item=${this}`);
	}


	getLangName() {

		var result = "";

		var hasHandle3 = (() => {

			var f = this.customData.getFeatureByName("handleShape"); // mandatory (in defaultFeatures)
			var value1Conf = this.customData.getFeatureValue1Conf(f);

			return value1Conf.name === "handle3";
		})();


		this.spec.data.features.forEach(featureConf => {

			var f = this.customData.getFeatureByTypeId( featureConf.typeId );
			if (!f)
				return;

			var value1Conf = this.customData.getFeatureValue1Conf(f);

			if (!value1Conf)
				return;

			var nextPart;

			if (hasHandle3 && value1Conf.nameKeyHandle3)

				nextPart = Lang(value1Conf.nameKeyHandle3);

			else if (value1Conf.nameKey)

				nextPart = Lang(value1Conf.nameKey);

			else
				return;

			if (nextPart)
				result += (result ? " " : "") + nextPart;
		});

		return result;
	}


}




export { AxeCustom }

