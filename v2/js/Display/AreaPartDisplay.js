//
//  Aggregates item display data in 1 texture.
//	Items are further divided by material.
//
class AreaPartDisplay {

	constructor(areaDisplay, rect) {

		this.areaDisplay = areaDisplay;
		this.rect = rect;

		this.itemData = new Map;
		this.itemDataTexture = new ItemDataTexture;

		this.dataBlocks = new Map;

		this.itemsUpdatedFromQuads = new Set; // in this frame
		this.textureRequiresUpdate = false;

		this.quadIndices = {};
	}


	getQuadIndex(matName) {

		var quadIndex = this.quadIndices[ matName ];

		if (quadIndex)
			return quadIndex;

		quadIndex = new MaterialQuadIndex(matName, this.rect, this.areaDisplay, this);

		return (this.quadIndices[ matName ] = quadIndex);
	}


	remove(item) {

		var data = this.itemData.get(item.id);

		if (!data)
			return;// Report.warn('no item data', `${item}`);

		this.itemData.delete(item.id);

		data.quadIndices.forEach( quadIndex => quadIndex.remove(item) );

		this.itemDataTexture.freeIId(data.iId, item);


		data.dataBlocks && data.dataBlocks.forEach(descriptorName => {

			var blockData = this.dataBlocks.get(descriptorName);

			if (!blockData)
				return Report.warn("no blockData", `${item} ${descriptorName}`);

			blockData.items.delete(item.id);

			if (blockData.items.size === 0) {

				blockData.iIds.forEach( iId => this.itemDataTexture.freeIId(iId) );
				this.dataBlocks.delete(descriptorName);
			}
		});

		//this.textureRequiresUpdate = true; // no need for texture update
	}


	add(item) {

//console.log(`areaPart add item=${item}`);

		var matWeights = item.getMatWeights();

		if (matWeights.matNames.length === 0)
			return Report.warn("no matNames", `${item}`);

		var iId = this.itemDataTexture.allocateIId(item);
//console.log(`iId=${iId}`);

		var quadIndices = matWeights.matNames.map( (matName, i) => {

			var weight = matWeights.weights[i];

			if ( !(weight > 0) ) {
				Report.warn("bad weight", `${item} matName=${matName} weight=${weight}`);
				weight = 1;
			}

			var quadIndex = this.getQuadIndex(matName);

			quadIndex.add(item);

			return quadIndex;
		});


		this.itemData.set(item.id, {

			iId,
			quadIndices,
			dataBlocks: null,
		});
	}


	checkItemDataBlock(item, descriptor) { // from materialQuad

		if (!this.itemDataTexture.dataArray)
			return Report.warn("checkItemDataBlock: no data texture", `${item}`);

		var blockData = this.dataBlocks.get(descriptor.name);

		if (!blockData) {

			let iIds = this.itemDataTexture.allocateBlockIId(descriptor.size);

			blockData = {
				iIds,
				items: new Set,
			};

			this.dataBlocks.set(descriptor.name, blockData);

			let offset = iIds[0] * (ItemDataTexture.ELEM_WIDTH_PX * 4); // px is vec4

			descriptor.fnUpdate( this.itemDataTexture.dataArray, offset );
//console.log(`f=${Engine.frameNum} checkItemDataBlock`);
			this.textureRequiresUpdate = true;
		}

		blockData.items.add(item.id);

		var iId = blockData.iIds[0];


		var itemData = this.itemData.get(item.id);

		if (!itemData.dataBlocks)
			itemData.dataBlocks = new Set;

		itemData.dataBlocks.add(descriptor.name);

		return iId;
	}


	getItemIId(item) { return this.itemData.get(item.id).iId }


	updateGeometry(item) {

		var data = this.itemData.get(item.id);

		if (!data)
			return Report.warn('updateGeometry: no item', `${item}`);

		data.quadIndices.forEach( quadIndex => quadIndex.updateGeometry(item) );
	}


	// updates: position(+rotation); other props in texture; displayRect
	// dependentItem: displayRect is same as from .dependentOn

	updateDisplayRect(item) {

		var data = this.itemData.get(item.id);

		if (!data)
			return Report.warn('updateDisplayRect: no item', `${item}`);

		data.quadIndices.forEach( quadIndex => quadIndex.updateDisplayRect(item) );
	}


	updateItemFromQuad(item) {

		var data = this.itemData.get(item.id);

		if (!data)
			return Report.warn('updateItemFromQuad: no item data', `${item}`);

		this.textureRequiresUpdate = true;

		if (!this.itemDataTexture.dataArray)
			return Report.warn("no itemDataTexture");

		var offset = data.iId * (ItemDataTexture.ELEM_WIDTH_PX * 4); // px is vec4
//console.log(`updateItemFromQuad ${item}`);

		item.updateDisplayData( this.itemDataTexture.dataArray, offset );

		item.getDependentItems().forEach( item => this.updateItemFromQuad(item) );
	}


	updateItemsFromQuad(items) {

		items.forEach( item => {

			item = item.getUppermostDependentOn(); // <-- do in quad?

			if ( this.itemsUpdatedFromQuads.has(item) ) // uppermost
				return;

			this.itemsUpdatedFromQuads.add(item);

			this.updateItemFromQuad(item);
		});
	}


	updateDataTexture() {

		if (this.textureRequiresUpdate !== true)
			return;
//console.log(`f=${Engine.frameNum} updateDataTexture ${this.itemDataTexture.texture.needsUpdate}`);

		this.textureRequiresUpdate = false;

		this.itemsUpdatedFromQuads.clear();

		// texture size updates immediately w/ allocation of IId (OK for the app.)
		this.itemDataTexture.updateTexture();
	}

}




export { AreaPartDisplay }

