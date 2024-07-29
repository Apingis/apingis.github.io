
class ItemDisplay {

	constructor(item) {

		this.item = item;

		this.mesh = this._getMesh();

		if (this.item.quaternion)
			this.useQuaternion();
		else
			this.setFacing(this.item.facing);

		//if (this.item.isDependent())
		//	this.mesh.matrixAutoUpdate = false;

		this.mesh.updateMatrixWorld(true);

		this.cBodyMesh = this.getCBodyMesh();
//console.log(`ItemDisplay created`, Array.from( this.mesh.matrix.elements ) );
	}


	afterRemoveDependency() {
		
		this.mesh.scale.setScalar(1);

		//this.mesh.matrixAutoUpdate = true;

		// ! incorrect quaternion

//		this.mesh.rotation.set(0, 0, 0); // axe throwing

//		this.setFacing(this.item.facing);
	}


	isMeshForDisplay() {
//		return this.item.isMobile3D() || this.item.isCarried3D() || this.item.isStored3D()
	}


	useQuaternion() {
		this.mesh.quaternion = this.item.quaternion;
	}


/*
	setupCustomOnBeforeRender(mesh, baseMesh) {

		var fnName = baseMesh.userData.customOnBeforeRender;
		if (!fnName)
			return;

		if (fnName == "charAppearEffect") {

			mesh.onBeforeRender = () => {

				var program = ItemDisplay.getProgramByCallback("charAppearEffect");

				if (!program) // not avail. in the 1st call
					return;

				var gl = Display.renderer.getContext();

				gl.useProgram(program);

				var location = gl.getUniformLocation(program, "u_effectScale");
				if (!location)
					return Report.warn("no location", "u_effectScale");


				var valueFn = t => {

					if (t < Char.CharAddStage1_T) {
						value = (t / Char.CharAddStage1_T);
						return value;
					}

					t -= Char.CharAddStage1_T + 0.2 * Char.CharAddStage2_T;
					value = Math.max(0, t / (0.8 * Char.CharAddStage2_T) );
					return 1 - value * Math.sqrt(value);
				}

				var t = Engine.time - this.item.createT;
				var value = valueFn(t);

				gl.uniform1f(location, value);
			}


			mesh.onAfterRender = () => ItemDisplay.setProgramByCallback("charAppearEffect");

		} else
			Report.warn("unknown customOnBeforeRender", `fnName=${fnName}`);
	}
*/

	_getMesh() {

		var baseMesh = this.item.getMesh();

		if (!baseMesh) {
			Report.warn("no baseMesh", `${this.item}`);
			return new THREE.Mesh;
		}
/*
		var isStatic = this.item.isStatic3D();

		var mesh;

		if ( this.isMeshForDisplay() ) {

			mesh = ItemDisplay.createMeshForDisplay2(baseMesh, isStatic);

			if (this.requiresApplyWindObjPhaseColor())

				mesh.traverse(mesh => {

					mesh.geometry = Util.cloneGeometry(mesh.geometry);
					mesh.userData.isUnique = true;

					this.applyWindObjPhaseColor(mesh);
				});

			this.setupCustomOnBeforeRender(mesh, baseMesh);


		} else { // non-display

			mesh = ItemDisplay.createNonDisplayMesh2(baseMesh);
		}
*/
		var mesh = ItemDisplay.createNonDisplayMesh2(baseMesh);

		Object.defineProperties(mesh, ItemDisplay.object3DPropsWritable);
		mesh.position = this.item.position;

		return mesh;
	}


	getCBodyMesh() {

		var geometry = this.item.getCBody3DGeometry();

		if (!geometry)
			return;

		var mesh = new THREE.Mesh(geometry);

		Object.defineProperties(mesh, ItemDisplay.object3DPropsWritable);
		mesh.position = this.item.position;

		if (this.item.quaternion)
			return Report.warn("ItemDisplay.getCBodyMesh: have quaternion", `${this.item}`);

		mesh.rotation.y = -this.item.facing;

		mesh.updateMatrixWorld();

		return mesh;
	}


	// Static mesh w/ cloned, transformed geometry.
	// - for the merged BufferGeometry (if this is the only mesh then its geometry goes on)
	// v2+ consider per-item data in merged geometry
/*
	getStaticMesh() {

		if (this.staticMesh)
			return this.staticMesh;

		//console.assert(this.item.isStatic3D());

		var staticMesh = ItemDisplay.cloneMesh1(this.mesh, true); // position, matrix remains

		staticMesh.traverse(mesh => {

			Util.cloneTransformGeometry(mesh);

			this.applyWindObjPhaseColor(mesh);
		});

		staticMesh.name = `staticMesh ${this.item}`;

		return (this.staticMesh = staticMesh);
	}
*/

	remove() {}
/*
		//if (this.item.positionType === Item.Mobile3D) {// || this.item.positionType == "Dynamic3D") {
		if ( this.isMeshForDisplay() ) {

			scene.remove(this.mesh);

			this.mesh.traverse(mesh => {

				ItemDisplay.removeMeshForDisplay(mesh);

				if (mesh.userData.isUnique)
					mesh.geometry.dispose();
			});

		} else {
			// dispose geometry if was used? (done @ DisplayGroup)
		}
	}
*/

	//
	// "Facing": world 2D angle, equals to what is returned by atan2().
	// (==0 if facing towards +X, increases CCW).
	// On display view (inverted) increases CW.
	//
	setFacing(value) {
		this.mesh.rotation.y = -value; // OK 20.12.20
	}


	// NOT for display
	static cloneMesh1(mesh, recursive) {

		var newMesh = mesh.clone(false);

		//if (mesh.customDepthMaterial)
		//	newMesh.customDepthMaterial = mesh.customDepthMaterial;

		newMesh.children.length = 0;
		if (recursive)// && mesh.children.length !== 0)
			mesh.children.forEach(m => newMesh.add(ItemDisplay.cloneMesh1(m, true)) );

		return newMesh;
	}


	// ===============================================================

	static createNonDisplayMesh2(baseMesh) {

		if (!baseMesh.userData.dummy)
			return Report.warn("non-dummy mesh", `${this.item}`);

		if (!baseMesh.geometry) // No geometry - no mesh, OK
			return Report.warn("No geometry", `${this.item}`);


		var mesh = new THREE.Mesh(baseMesh.geometry, ItemSpec.dummyMaterial);

		mesh.name = name + ' NON DISPLAY';
		mesh.userData.matName = baseMesh.userData.matName;

		baseMesh.children.forEach(subMesh => mesh.add(this.createNonDisplayMesh2(subMesh)) );

		return mesh;
	}


	static createMeshForDisplay2(baseMesh, isStatic, temporary) {

		if (!baseMesh.userData.dummy)
			return Report.warn("non-dummy mesh", `"${baseMesh.name}"`);

		if (!baseMesh.geometry)
			return Report.warn("No geometry", `"${baseMesh.name}"`);

		var matName = baseMesh.userData.matName;
		var isUnique = baseMesh.userData.isUnique;

		var mesh = this.createMeshForDisplay(baseMesh.name, baseMesh.geometry, matName, isUnique, isStatic, temporary);

		baseMesh.children.forEach(subMesh => mesh.add(this.createMeshForDisplay2(subMesh, isStatic, temporary)) );

		return mesh;
	}


	static createMeshForDisplay(name, geometry, matName, isUnique, isStatic, temporary) {

		if (!geometry)
			return Report.warn("no geometry", `"${name}"`);

		console.assert(geometry instanceof THREE.BufferGeometry);

		var material = Assets.getMaterial(matName, UIPrefs.materialConf.isOn, isStatic);

		var mesh = new THREE.Mesh(geometry, material);

		mesh.name = name;
		mesh.userData.forDisplay = true;

		if (isStatic)
			mesh.matrixAutoUpdate = false;

		if (isUnique)
			mesh.userData.isUnique = true;

		if (!geometry.userData.noShadow) {

			mesh.castShadow = true;
			mesh.receiveShadow = true;
		}

		mesh.customDepthMaterial = Assets.getMaterial(matName, UIPrefs.materialConf.isOn, isStatic, true);

		ItemDisplay.setupTransparentPart2(mesh);

		if (!temporary)
			UIPrefs.materialConf.register(mesh);

		return mesh;
	}


	static setupTransparentPart2(mesh) {

		if (!UIPrefs.materialConf.isOn)
			return;

		var material = mesh.material;
		if (!material.userData.hasTransparentPart)
			return;

		var material_TP = Assets.getMaterial(material.name + "_TP", false,
				material.userData.isStatic);

		if (!material_TP)
			return Report.warn("no material_TP", `${material.name}`);

		if (!material_TP.name.endsWith("_TP")
				|| material_TP.userData.hasTransparentPart
				|| !material_TP.userData.isTransparentPart
				|| material_TP.transparent !== true
				|| material_TP.depthWrite !== false)

			return Report.warn("bad props", `${material.name}`);


		var mesh_TP = new THREE.Mesh(mesh.geometry, material_TP);

		mesh_TP.name = mesh.name + " (T.P.)";
		mesh_TP.userData.forDisplay = true;

		if (mesh.userData.isUnique)
			mesh_TP.userData.isUnique = true;

		mesh_TP.castShadow = false;

		if (!mesh.geometry.userData.noShadow)
			mesh_TP.receiveShadow = true;

		mesh_TP.userData.isTransparentPart = true;
		//no need (same geometry) mesh_TP.userData = JSON.parse( JSON.stringify( mesh.userData ) );

		mesh.add(mesh_TP);
	}


	static removeMeshForDisplay(mesh) {

		if (!mesh.userData.forDisplay)
			Report.warn("remove !forDisplay", `"${mesh.name}"`);

		UIPrefs.materialConf.unregister(mesh);
	}


	static updateMeshForDisplay(mesh) {

		if (mesh.userData.isTransparentPart)
			return;

		var materialConf = UIPrefs.materialConf.isOn;

		mesh.material = Assets.getMaterial(mesh.material.name, materialConf, mesh.material.userData.isStatic);

		if (!materialConf)
			Array.from(mesh.children).forEach(c => c.userData.isTransparentPart && mesh.remove(c));
		else
			ItemDisplay.setupTransparentPart2(mesh);

		mesh.children.forEach(c => ItemDisplay.updateMeshForDisplay(c));
	}



	// ***********************************************************
	//
	//     Tasks for 'Mesh for display'
	//
	// - updateable (registered in UIPrefs)
	// - different materials
	// - may have T.P.
	//
	// ***********************************************************

	static createAggregateMesh(name, geometry, matName, options = {}) {

		if (!geometry)
			return Report.warn("no geometry", `"${name}"`);

		var possibleOptions = [ 'temporary', 'aggregateDepthMatName' ];

		for (let key in options)
			if ( possibleOptions.indexOf(key) === -1 )
				Report.warn('unknown option', `${key} ${name}`);

		console.assert(geometry instanceof THREE.BufferGeometry);


		var material = Assets.getMaterial(matName, UIPrefs.materialConf.isOn, false);

		if (material.userData.wind)
			Report.warn("aggregate material should have no .userData.wind");

		var mesh = new THREE.Mesh(geometry, material);

		mesh.name = name;
		mesh.userData.isAggregate = true;
		mesh.userData.autoAdded = true;
		mesh.matrixAutoUpdate = false;

		if (!geometry.userData.noShadow) {

			mesh.castShadow = true;
			mesh.receiveShadow = true;
		}

		if (!options.aggregateDepthMatName) {
			Report.warn("no aggregate depth material", `matName=${matName}`);

		} else {

			let depthMaterial = Assets.materials[ options.aggregateDepthMatName ];

			if (!depthMaterial)
				Report.warn("missing aggregate depth material", `${options.aggregateDepthMatName}`);

			mesh.customDepthMaterial = depthMaterial;
		}

		ItemDisplay.setupAggregateTransparentPart(mesh);

		if (!options.temporary)
			UIPrefs.materialConf.register(mesh);

		return mesh;
	}



	static setupAggregateTransparentPart(mesh) {

		if (!UIPrefs.materialConf.isOn)
			return;

		var material = mesh.material;
		if (!material.userData.hasTransparentPart)
			return;

		var material_TP = Assets.getMaterial(material.name + "_TP", false,
				material.userData.isStatic);

		if (!material_TP)
			return Report.warn("no material_TP", `${material.name}`);

		if (!material_TP.name.endsWith("_TP")
				|| material_TP.userData.hasTransparentPart
				|| !material_TP.userData.isTransparentPart
				|| material_TP.transparent !== true
				|| material_TP.depthWrite !== false)

			return Report.warn("bad props", `${material.name}`);


		var mesh_TP = new THREE.Mesh(mesh.geometry, material_TP);

		mesh_TP.name = mesh.name + " (T.P.)";
		mesh_TP.userData.isTransparentPart = true;

		mesh_TP.castShadow = false;

		if (!mesh.geometry.userData.noShadow)
			mesh_TP.receiveShadow = true;

		mesh.add(mesh_TP);
	}


	static removeAggregateMesh(mesh) {

		if (!mesh.userData.isAggregate)
			Report.warn("remove !aggregateMesh", `"${mesh.name}"`);

		UIPrefs.materialConf.unregister(mesh);
	}


	static updateAggregateMesh(mesh) {

		if (mesh.userData.isTransparentPart)
			return;

		var materialConf = UIPrefs.materialConf.isOn;

		mesh.material = Assets.getMaterial(mesh.material.name, materialConf, mesh.material.userData.isStatic);

		if (!materialConf)
			Array.from(mesh.children).forEach(c => c.userData.isTransparentPart && mesh.remove(c));
		else
			ItemDisplay.setupAggregateTransparentPart(mesh);

		mesh.children.forEach(c => ItemDisplay.updateAggregateMesh(c));
	}



	// ***********************************************************
	//
	//    ATTENTION
	//
	// Program is not available from .onBeforeRender() if:
	// * The shader was not compiled yet;
	// * The shader was compiled for other materials/meshes w/o this interface.
	//
	// ***********************************************************

	static clearProgramByCallback() { this._programByProgramName = Object.create(null) }


	static getProgramByCallback(programName) {

		var program = this._programByProgramName[ programName ];

		if (program)
			return program;

		this.shaderWasNotCompiled = true;
	}


	static setProgramByCallback(programName) {

		if ( this._programByProgramName[ programName ] )
			return;

		var gl = Display.renderer.getContext();

		var program = gl.getParameter(gl.CURRENT_PROGRAM);

		this._programByProgramName[ programName ] = program;
	}


	//static clearProgramByMaterial() { ItemDisplay._programByMaterial.clear() }
	static clearProgramByMaterial() {  }

}


ItemDisplay._programByProgramName = Object.create(null);
ItemDisplay.shaderWasNotCompiled = false;


//ItemDisplay._programByMaterial = new Map;


ItemDisplay.object3DPropsWritable = {
	position: { writable: true, enumerable: true },
	quaternion: { writable: true, enumerable: true }
};




export { ItemDisplay };

