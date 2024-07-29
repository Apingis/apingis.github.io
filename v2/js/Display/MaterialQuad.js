//
// Items for display are aggregated for output in 1 WebGL draw call.
//
class MaterialQuad {

	constructor(matName, materialConf, areaDisplay, areaPartDisplay) {

		this.matName = matName;
		this.materialConf = materialConf;
		this.areaDisplay = areaDisplay;
		this.areaPartDisplay = areaPartDisplay;
		
		this.items = new Set;
		//this.totalWeight = 0;

		this.rectIndex = new rbush(4);
		this.containerByItemId = new Map;

		this.resultRect = new Rectangle;
		this.container = new SpatialContainer().setObj(this); // rename to quadContainer?
		this.containerRequiresUpdate = false;

		this.aggregateMesh = null;
		this.lastAccessed = -Infinity; // Engine.time (in seconds)

		this.aggregateGeometry = null;
		this.itemsAdded = new Set; // added vs existing aggregateGeometry

		this.itemsForUpdateFromQuad = new Set;
		this.itemsForUpdateIfVisible = new Set;
	}


	toString() { return `[MaterialQuad matName=${this.matName} items=${this.items.size}]` }


	add(item) { // Only w/ appropriate material & must have geometry

		if (this.items.has(item))
			return;// Report.warn("already has item", `${item}`);

		this.items.add(item);

		//this.totalWeight += item.spec.displayWeightByMatName(this.matName);

		if (this.aggregateGeometry)
			this.itemsAdded.add(item);

		if ( item.getOptionUpdateIfVisible() )
			this.itemsForUpdateIfVisible.add( item );
		else
			this.itemsForUpdateFromQuad.add( item );


		var container = new SpatialContainer().setFromRect( item.getDisplayRect() );

		this.containerByItemId.set(item.id, container);

		this.rectIndex.insert(container);

		this.setContainerRequiresUpdate();
	}


	_addItemToGeometry(item) {

		var iId = this.areaPartDisplay.getItemIId(item);

		// activates itemDisplay, material
		//item.display.getStaticMesh().traverse(m => {

		var hasAdded;

		item.display.mesh.traverse( mesh => {

			if (mesh.geometry && mesh.userData.matName === this.matName) {

				this.aggregateGeometry.addMesh(mesh, iId);
				hasAdded = true;
			}
		});

		if (!hasAdded)
			return Report.warn("_addItemToGeometry: no mesh with material (matWeights?)",
				`${item} matName=${this.matName}`);

		this.checkItemDataBlocks(item);
	}


	checkItemDataBlocks(item) {

		var itemDisplay = item.display;

		var descriptors = itemDisplay.getDataBlockDescriptors
			&& itemDisplay.getDataBlockDescriptors();

		descriptors && descriptors.forEach( descriptor => {

			if (typeof descriptor.name != 'string')
				return Report.warn("bad data block descriptor", `${item}`);

			var blockIId = this.areaPartDisplay.checkItemDataBlock(item, descriptor);

			itemDisplay.updateDataBlockIID(descriptor.name, blockIId);
		});
	}


	remove(item) {

		if ( !this.items.delete(item) )
			return Report.warn("no item", `${item}`);

		//this.totalWeight -= item.spec.displayWeightByMatName(this.matName);

		if (this.aggregateGeometry) {

			if (!this.itemsAdded.delete(item)) {
				this._removeItemFromGeometry(item);
			}
		}

		if ( item.getOptionUpdateIfVisible() )
			this.itemsForUpdateIfVisible.delete( item );
		else
			this.itemsForUpdateFromQuad.delete( item );


		var container = this.containerByItemId.get(item.id);

		this.rectIndex.remove(container);

		this.containerByItemId.delete(item.id);

		// mb. TODO? check if fully inside etc.
		this.setContainerRequiresUpdate();
	}


	_removeItemFromGeometry(item) {

		// (??) TODO let geometry memorize mesh by item

		if (!item._display)
			return;// Report.warn("item w/o display remove attempt", `${item}`);

		var mesh = item._display.mesh;

		if (!mesh)
			return Report.warn("item w/o .display.mesh", `${item}`);

		mesh.traverse( mesh => {

			if (mesh.geometry && mesh.userData.matName === this.matName)
				this.aggregateGeometry.removeMesh(mesh);
		});
	}


	updateGeometry(item) {

		if ( !this.items.has(item) )
			return Report.warn("updateGeometry: no item", `${item}`);

//console.error(`> updateGeometry ${item}`);
/*
		this.remove(item);

		this.add(item); // + some extra container work
*/
		if (!this.aggregateGeometry)
			return;

		if (!item._display)
			return Report.warn("item w/o .display: updateGeometry attempt", `${item}`);

		var mesh = item._display.mesh;

		if (!mesh)
			return Report.warn("item w/o .display.mesh", `${item}`);

		mesh.traverse( mesh => {

			if (mesh.geometry && mesh.userData.matName === this.matName) {

				this.aggregateGeometry.removeMesh(mesh);

				var iId = this.areaPartDisplay.getItemIId(item);

				this.aggregateGeometry.addMesh(mesh, iId);
			}
		});

		if ( ! item.getOptionUpdateIfVisible() )
			this.itemsForUpdateFromQuad.add( item );
	}


	updateDisplayRect(item) {

		// Extra unnecessary update possible after e.g. stopped carrying and walked away (OK)
		// same in remove()

		if ( ! item.getOptionUpdateIfVisible() ) // TODO!
			this.itemsForUpdateFromQuad.add( item );

		var container = this.containerByItemId.get(item.id);

		if (!container) {
			Report.warn("no container for displayRect (position changes w/o update?)",
				`${this} ${item}`, this);
			return;
		}

		var rect = item.getDisplayRect();

		if (container.minX === rect.minX && container.maxX === rect.maxX
				&& container.minY === rect.minY && container.maxY === rect.maxY)
			return;

		// mb. TODO? remove-insert

		this.rectIndex.remove(container);

		container.setFromRect(rect);

		this.rectIndex.insert(container);

		this.setContainerRequiresUpdate();
	}


	getItems() {
		return [ ...this.items ];
	}


	setContainerRequiresUpdate() {

		if (this.containerRequiresUpdate === true)
			return;

		this.containerRequiresUpdate = true;

		this.areaDisplay.addQuadForUpdate(this);

		if (this.aggregateGeometry)
			this.aggregateGeometry.setBoundingVolumesRequireUpdate();
	}


	updateContainer() {

		console.assert(this.containerRequiresUpdate === true);

		this.containerRequiresUpdate = false;

		// empty, not in index - ok
		// Warning: when removing container which isn't in index it consumes CPU
		this.areaDisplay.activeDisplay.remove(this.container);

		SpatialContainer.setRectFromRBush(this.resultRect, this.rectIndex);

		//this.container.setFromRBush(this.rectIndex); // from rect?
		this.container.setFromRect(this.resultRect).setObj(this);

		if ( this.resultRect.isEmpty() )
			return;

		this.areaDisplay.activeDisplay.insert(this.container);
	}

/*
	removeScreenReady() {

		if (!this.aggregateGeometry)
			return;

		this.aggregateGeometry.dispose();
		this.aggregateGeometry = null;
		this.itemsAdded.clear(); // ??TODO

		//DisplayGroup.Storage.remove(this);

		ItemDisplay.removeAggregateMesh(this.aggregateMesh);
		this.aggregateMesh = null;
	}
*/

	getMeshName() {

		return `Agg.(${this.items.size}) ${this.matName}`
			+ ` [${this.resultRect.minX.toFixed(0)},${this.resultRect.minY.toFixed(0)},`
			+ ` ${this.resultRect.maxX.toFixed(0)},${this.resultRect.maxY.toFixed(0)}]`;
	}


	updateItemsData() {

		if ( this.itemsForUpdateFromQuad.size > 0 ) {

			this.areaPartDisplay.updateItemsFromQuad( this.itemsForUpdateFromQuad );
			this.itemsForUpdateFromQuad.clear();
		}

		if ( this.itemsForUpdateIfVisible.size > 0 )
			this.areaPartDisplay.updateItemsFromQuad( this.itemsForUpdateIfVisible );
	}

}



// Assuming it got this from areaDisplay's spatial index.

MaterialQuad.prototype.getDisplayMesh = function() {

	if (this.containerRequiresUpdate !== false) {
		//Report.warn("containerRequiresUpdate", `${this}`);

		// After displayMesh is determined:
		// .updateItemsData() updated container.
	}

	if (this.items.size === 0 && this.itemsAdded.size === 0) {

		return;
	}

	this.lastAccessed = Engine.time;


	if (this.aggregateMesh) {

		this.itemsAdded.forEach(item => this._addItemToGeometry(item));
		this.itemsAdded.clear();

		if (this.aggregateGeometry.requiresUpdate === true) {

			this.aggregateGeometry.update( this.resultRect );
			this.aggregateMesh.name = this.getMeshName();

		} else {

			if (this.aggregateGeometry.boundingVolumesRequireUpdate === true)

				this.aggregateGeometry.updateBoundingVolumes( this.resultRect );
		}

		this.updateItemsData(); // after added to aggregate geometry (+ data blocks)

		return this.aggregateMesh;
	}


	console.assert(!this.aggregateGeometry && !this.aggregateMesh);

	this.aggregateGeometry = new AggregateGeometry;

	this.items.forEach( item => this._addItemToGeometry(item) );

	this.aggregateGeometry.update( this.resultRect );

	this.updateItemsData();


	var mesh = ItemDisplay.createAggregateMesh(

		this.getMeshName(),
		this.aggregateGeometry.geometry,
		this.materialConf.aggregate,
		{
			aggregateDepthMatName: this.materialConf.aggregateDepth,
		}
	);

	mesh.onBeforeRender = () => {

		var uniforms = Shader.aggregate.uniforms;

		uniforms.u_itemDataTexture.value = this.areaPartDisplay.itemDataTexture.texture;
		uniforms.u_itemDataTextureSize.value.copy( this.areaPartDisplay.itemDataTexture.textureSize );
	};

	this.aggregateMesh = mesh;

	return this.aggregateMesh;
}




export { MaterialQuad }

