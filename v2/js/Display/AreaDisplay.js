
class AreaDisplay {

	constructor(area) {

		this.area = area;

		this.activeDisplay = new rbush(4);
		this.quadsForContainerUpdate = new Set;

		this._container = new SpatialContainer;

		this.part = new AreaPartDisplay(this, area.rect);
	}


	addQuadForUpdate(materialQuad) {
		this.quadsForContainerUpdate.add(materialQuad);
	}


	updateContainers() {

		this.quadsForContainerUpdate.forEach( quad => quad.updateContainer() );

		this.quadsForContainerUpdate.clear();
	}


	clearAll() {

Report.warn("clearAll")
		//this.activeDisplay.all().forEach(container => container.obj.removeScreenReady());
/*
		//TODO changes dynamically -> weight appears wrong

		DisplayGroup.Storage.refs.clear();
		DisplayGroup.Storage.weight = 0;
*/
	}


	getDisplayMeshes(cameraShape) {

		this.updateContainers();


		var TP_D_VISIBILITY = 200; // ineffective

		var containers = this.activeDisplay.search( this._container.setFromShape(cameraShape.rect) );
		var meshes = [];

		for (let i = 0, len = containers.length; i < len; i++) {

			let quad = containers[i].obj;

			let distance = cameraShape.depthDistanceToRect(quad.resultRect);

			if (distance === undefined)
				continue;

			let mesh = quad.getDisplayMesh();

			if (!mesh)
				continue;

			if (0) {

				let c = mesh.children[0];

				if (c && c.userData.isTransparentPart)
					c.visible = distance < TP_D_VISIBILITY;
			}

			mesh.renderOrder = Math.floor(distance);
			meshes.push(mesh);
		}


		this.part.updateDataTexture();

		return meshes;
	}



/*
		if ((Engine.frameNum & 15) === 0) {
			var meshesTotal = DisplayGroup.Storage.count,
				meshesSize = DisplayGroup.Storage.memSize;

			var facadesTotal = GroupFacadeDirection.Storage.count,
				facadesSize = GroupFacadeDirection.Storage.memSize;

			Display.stats2.update(
				`${numMeshes} meshes (+${numFacades} facades) = ${numMeshes+numFacades}`,
				`${Math.floor(0.5+numTriangles/1000)}k triangles`
					+ ` (+${Math.floor(0.5+numFacadeTriangles/1000)}k fake)`,
				` `,
				`total meshes ${meshesTotal} (${Math.floor(0.5+meshesSize/1e+6)}MB)`,
				`total facades ${facadesTotal} (${Math.floor(0.5+facadesSize/1e+6)}MB)`,
			);
		}

		return displayList;
	}
*/

	add(item) {

		if (item.isInvisible())
			return;

		if (item.spec.data.hasOnlyNonAggregate) {

			let mesh = item.display.mesh;
			let matName = item.spec.data.matName;
//console.log(`matName=${matName}`);
			if (matName)
				mesh.material = Assets.materials[matName];
			else
				Report.warn("no material", `matName=${matName} item=${item}`);

			mesh.castShadow = true;

			scene.add(mesh);
			return;
		}


		item.updateDisplayRect();


		var rect = item.getDisplayRect();

		if (!rect)
			return Report.warn("no displayRect", `item=${item}`);

		if ( rect.isEmpty() )
			return Report.warn("empty displayRect", `item=${item} ${rect}`);

		this.part.add(item);
	}


	remove(item) {

		if (item.isInvisible())
			return;

		if (item.spec.data.hasOnlyNonAggregate) {

			scene.remove(item.display.mesh);
			return;
		}

		this.part.remove(item);
	}


	updateGeometry(item) {

		if (item.isInvisible())
			return Report.warn("updateGeometry: invisible", `${item}`);

		if (item.spec.data.hasOnlyNonAggregate)
			return Report.warn("updateGeometry: hasOnlyNonAggregate", `${item}`);

		this.part.updateGeometry(item);
	}


	updatePosition(item) {

		if (item.isInvisible())
			return;

		if (item.spec.data.hasOnlyNonAggregate)
			return;

		this.part.updateDisplayRect(item);
	}


	//
	//    D E B U G
	//

	showRects() {

		Object.values( this.part.quadIndices ).forEach( quadIndex => {

			quadIndex.getAllQuads().forEach( quad => quad.resultRect.show() );
		});
	}

}




export { AreaDisplay }

