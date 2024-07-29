
import { Item } from './Item.js';



	//	this.dependentOn = null;
	//	this.dependencyName = '';
	//	this.dependencyObj = null;
	//	this.dependentItems = null;


// TODO ============================================= TODO
//
// *   ._displayRect unused
// *   Not in SpatialIndex
//
//
//
// TODO ============================================= TODO


Object.assign( Item.prototype, {


	getDependentOn() { return this.dependentOn },

	isDependent() { return !!this.dependentOn },


	getDependencyObj() {

		if (this.dependentOn === null)
			return;

		if (this.dependencyObj)
			return this.dependencyObj;


		if (this.dependencyObj === false)
			return;

		if (this.dependencyName === '') // TODO TODO processed once  (new display.mesh??)
			this.dependencyObj = this.dependentOn.display.mesh;
		else
			this.dependencyObj = this.dependentOn.display.mesh.getObjectByName(this.dependencyName);

		if (!this.dependencyObj) {

			dependencyObj = false;
			return Report.warn("no dependencyObj", `${this} ${this.dependentOn} ${this.dependencyName}`);
		}

		// delayed compute-matrix (attach)

		if (this.dependencyMatrix) { // TODO getDependencyMatrix() ?

			let matrix;

			if (typeof this.dependencyMatrix == 'function') {

				matrix = this.dependencyMatrix();

			} else
				matrix = this.dependencyMatrix;

			this.display.mesh.matrix.copy( matrix );
//console.log(`getDependencyObj copy matrix`, Array.from( matrix.elements) );

		} else { // having item position,rotation/quaternion in local coord.
			this.display.mesh.updateMatrix();
//if (this.id==1e8+4)
//console.error(`f=${Engine.frameNum} updateMatrix id=${this.id}`);
		}

		return this.dependencyObj;
	},


	getUppermostDependentOn() {

		var upper = this;

		while (1) {

			if (!upper.dependentOn)
				return upper;

			upper = upper.dependentOn;
		}
	},


	getDependentItems() { return this.dependentItems },


	addDependentItem(item, dependencyName = '', dependencyMatrix) {

		if( !item.isOn3D() )
			Report.warn("addDependentItem !isOn3D", `${item} depends on ${this}`);

		if (item === this)
			return Report.warn('same item', `${this}`);

		if (item.dependentOn) {

			Report.warn('item already has dependency', `${item} ${this}`);

			item.dependentOn.removeDependentItem(item);
		}

		Main.area.spatialIndex.remove(item);

		item.removeStaticPositionData();

		item.dependentOn = this;
		item.dependencyName = dependencyName;
		item.dependencyObj = null;
		item.dependencyMatrix = dependencyMatrix;

		//if (item._display)
		//	item._display.mesh.matrixAutoUpdate = false;

		this.dependentItems.push(item);

		item.updateDisplayPosition();
	},


	removeDependentItem(item) {

		item.dependentOn = null;
		item.dependencyName = '';
		item.dependencyObj = null;
		item.dependencyMatrix = null;

		Util.removeElement( this.dependentItems, item );

		// dependent item does have correct .position
		// (if has .display then can restore)

		if (item._display)
			item._display.afterRemoveDependency();
			

		if ( item.isOn3D() ) {

			Main.area.spatialIndex.insert(item);

			item.updateDisplayPosition();
		}
	},


	addDependentItemsToArray(array) {

		Array.prototype.push.apply(array, this.dependentItems);

		for (let i = 0, len = this.dependentItems.length; i < len; i++)

			this.dependentItems[i].addDependentItemsToArray(array);
	},


	// ==============================================================
	//
	//     Default Display Properties
	//
	// ==============================================================

	getOptionUpdateIfVisible() {},

	getDisplayDataSize() { return 'size_static' },


	getItemDisplayData() {
		return Item._itemDisplayData.set(0, 0, this.getColor(), 0);
	},


	getMatWeights() { // { matNames, weights }
		return this.spec.data.matWeights || this.getDisplayContainer();
	},


	getDisplayContainer() { return this.spec.getDisplayContainer() },

	getDisplayRect() { return this.getUppermostDependentOn()._displayRect },


	updateDisplayRect() {

		var displayContainer = this.getDisplayContainer(); // TODO improve w/ rotation

		if (!displayContainer)
			return Report.warn("no displayRect", `${this}`);

		this._displayRect.copy( displayContainer.rect )
			.translate( this.position.x, this.position.z );
	},



	// ==============================================================
	//
	//     Updates
	//
	// .updateDisplayData* is called from AreaDisplay
	//
	// ==============================================================

	updateDisplayData(array, offset) {

		if ( this.getDisplayDataSize() != 'size_static' )
			return this.updateDisplayData_Skinned(array, offset);
//console.log(`updateDisplayData ${this}`);

		var mesh = this.display.mesh;
		var depObj = this.getDependencyObj();

		if (depObj) {

			//NO! TODO if (mesh.matrixAutoUpdate)
			//	mesh.updateMatrix();
//console.error(`depObj ${this}`, Array.from( mesh.matrix.elements ) );

			mesh.matrixWorld.multiplyMatrices( depObj.matrixWorld, mesh.matrix );

		} else {
			mesh.updateMatrixWorld(true); // updates local matrix unless !matrixAutoUpdate
//console.error(`depObj ${this}`);
		}

		this.getItemDisplayData().toArray( array, offset );

		Util.mat4ToArrayTight( mesh.matrixWorld, array, offset + 4 );
	},


	updateDisplayData_Skinned(array, offset) {
//console.log(`updateDisplayData_Skinned ${this}`);

		if (this.isDependent())
			Report.warn("Skinned: isDependent", `${item}`);

		var display = this.display; // getUpdatedDisplay() ?

		if ('update' in display)
			display.update();
		else
			Report.once(`${this.spec.name}: no display.update`);
/*
		this.display.mesh.updateMatrixWorld(true);

		var skinnedMesh = this.display.skinnedMesh;

		skinnedMesh.skeleton.update();
*/

		var hasChains = this.getDisplayDataSize() == 'size_skinned_chains';

		this.getItemDisplayData().toArray( array, offset );

		Util.arrayMatrix4ToArrayTight(

			display.skinnedMesh.skeleton.boneMatrices, 0,
			array, offset + 4,
			hasChains ? ChainsCollection.START_SKIN_INDEX : 22
		);


		if (hasChains) {
/*
			let chains = this.display.chains;

			if (!chains)
				return;// Report.warn("no chains", `${this}`);

			chains.updateChainData();
*/
			Util.arrayMatrix4ToArrayTight(

				display.chains._uMatrixArray, 0,
				array, offset + (4 + ChainsCollection.START_SKIN_INDEX * 12),
				//display.chains.nChains * ChainsCollection.DATA_MATRIX_ELEMS // array is of required size
			);
		}
	},


	// - position, orientation changes: call

	updateItemPosition() {

		if (Main.isServer)
			return;

		if ( !this.isDependent() && !this.isUnit() ) {

			Main.area.spatialIndex.remove(this);

			this.removeStaticPositionData();

			Main.area.spatialIndex.insert(this);
		}

		this.updateDisplayPosition();
	},


	updateDisplayPosition() {

		this.updateDisplayRect();

		Main.area.display.updatePosition(this);

		this.getDependentItems().forEach( item => Main.area.display.updatePosition(item) ); // updates uppermost displayRect
	},


	updateDisplayGeometry() {

		if ( Main.isServer || !this._display )
			return;

		if ('updateDisplayGeometry' in this._display)
			this._display.updateDisplayGeometry();
		else
			//this.removeDisplay(false);
			Report.warn("no updateDisplayGeometry", `${this}`);

		Main.area.display.updateGeometry(this);
	}


});



Item.flattenDependentItems = function(array) {

	array.forEach( item => item.addDependentItemsToArray(array) );

	return array;
}



