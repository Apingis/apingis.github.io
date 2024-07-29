
class VCDebug {

	constructor(vC) {

		this.vC = vC;
		this.isOn = false;

		this.meshes = [];
	}

/*
	toggle(isOn = true) {

		this.isOn = isOn;

		if (!isOn)
			this.clear();
		else
			this.show();
	}
*/

	clear() {

		this.meshes.forEach( mesh => scene.remove(mesh) );
		Util.setLength(this.meshes, 0);
	}


	addSectionedFace(face) { //this.isOn && this.sectionedFaces.push(face)
		
	}


	show() {

		if (!this.isOn)
			return;

		this.clear();

		var r = this.vC.cI.circle.radius;

		var mesh_coneU = this.vC.coneU.createCheckerMesh(r, 'coneChecker112a');
		var mesh_coneL = this.vC.coneL.createCheckerMesh(r, 'coneChecker112b');

		mesh_coneL.renderOrder = -1;

		this.meshes.push( mesh_coneU, mesh_coneL );
/*
		var repeat = 2 * Math.ceil(r * 0.8);

		Assets.textures.checker18a.repeat.set(repeat, repeat);
		Assets.textures.checker18b.repeat.set(repeat, repeat);
*/
		scene.add(...this.meshes);
	}


}



VCDebug.Edges = {

	_isOn: false,


	toggle(isOn = true) {

		this._isOn = isOn;

		if (!isOn)
			this.clear();
		else
			this.show();
	},


	update() { this._isOn && this.show() },


	clear() {

		Util.filterInPlace(scene.children, mesh => {

			if ( !mesh.name.startsWith(`VCDebug.Edges`) )
				return true;

			mesh.geometry.dispose();
		});
	},


	getItemsForShow() {

		if (!Display.cameraView)
			return [];

		var sector = Display.cameraView.sector.clone();

		sector.radius = 130;

		var items = Main.area.spatialIndex.getAllItemsDependencyUsingShape( sector );

		return items;

		//sector.enlarge(+10); // TODO for dependent items boundingCircle, polygon are not correct

		//return Util.filterInPlace( items, item => sector.overlapsCircleByLR(item.getBoundingCircle()) );
	},


	show() {

		this.clear();

		var lineSegments = [];

		this.getItemsForShow().forEach( item => {

			var polyhedronBase = item.getPolyhedronBase();

			if ( !polyhedronBase )
				return;
			
			polyhedronBase.addEdgesToLineSegments( lineSegments, item.getMatrixWorld() );
		});

		var mesh = new THREE.Mesh(

			new LineSegmentsGeometry().setPositions(lineSegments),
			Assets.materials.line[ 'polyhedronEdgeThin' ]
		);

		mesh.name = `VCDebug.Edges`;
		scene.add(mesh);
	},

}




export { VCDebug }

