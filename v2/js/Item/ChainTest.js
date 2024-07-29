
import { CustomItem } from './CustomItem.js';


class ChainTest extends CustomItem {

	constructor(spec) {

		super(spec);
	}


	isChainTest() { return true }


	get display() {

		if (!this._display) {

			this._display = new ChainTestDisplay(this);
			this._display.update();
		}

		return this._display;
	}


	getOptionUpdateIfVisible() { return true }

	getDisplayDataSize() { return 'size_skinned_chains' }


/*
	updateDisplayData(array, offset) {

		if (ScreenChainTestInfo.item === this)
			ScreenChainTestInfo.updatePerFrame_readControls();

		super.updateDisplayData_Skinned(array, offset);

		if (ScreenChainTestInfo.item === this)
			ScreenChainTestInfo.updatePerFrame_lineMeshes();
	}
*/

	raycast(line3, raycaster) {

		var maxHeight = this.position.y + this.getHeight();
		var polygon = this.getPolygon();
		var d = polygon.getBoundingCircle().distanceLine3P1ToIntersection(line3, maxHeight);

		if (d === false)
			return false;

		//return raycaster.raycaster.intersectObject(this.display.cBodyMesh, true);
		//return raycaster.raycaster.intersectObject(this.display.mesh, true);

		if (this.display.raycastMesh)
			return raycaster.raycaster.intersectObject(this.display.raycastMesh, true);
		else
			return raycaster.raycaster.intersectObject(this.display.mesh, true);
	}


	getP2() {

		return ChainTest._P2.set(

			this.getFeatureValue2('x') || 0,
			this.getFeatureValue2('y') || 0,
			this.getFeatureValue2('z') || 0,
		);
	}


	setP2(v) {

		this.setFeatureValue2('x', v.x);
		this.setFeatureValue2('y', v.y);
		this.setFeatureValue2('z', v.z);
	}


	get P2() {

		var item = this;

		return {

			get x() { return item.getP2().x },
			get y() { return item.getP2().y },
			get z() { return item.getP2().z },

			set x(val) { item.setFeatureValue2('x', val); return val },
			set y(val) { item.setFeatureValue2('y', val); return val },
			set z(val) { item.setFeatureValue2('z', val); return val },
		};
	}


	getDL() { return this.getFeatureValue2('dL') || 0 }

	setDL(value) { return this.setFeatureValue2('dL', value) }

}


ChainTest._P2 = new THREE.Vector3;




export { ChainTest }

