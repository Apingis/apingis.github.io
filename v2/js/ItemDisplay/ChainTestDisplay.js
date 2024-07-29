
class ChainTestDisplay {

	constructor(item) {

		this.item = item;

		this.cHE_chain = new CoatedHyperEllipseBase(3, 1.3, 2, 0.067);
		//this.cHE_chain = new CoatedHyperEllipseBase(2, 2, 2, 0.067);

		//this.cHE_chain = new CoatedHyperEllipseBase(6, 1.3, 2, 0.067);
		//*this.cHE_chain = new CoatedHyperEllipseBase(15, 1.3, 2, 0.067);


		//this.cHE_rope = new CoatedHyperEllipseBase(3, 1.29, 1.99, 0.07);
		this.cHE_rope = new CoatedHyperEllipseBase(3, 0.69, 0.94, 0.07);

		this.createMeshes();

		this.setFacing(this.item.facing);

		this.animationLastRunT = -1;
	}


	update() {

		Util.getObjectByNameStartsWith( this.mesh, 'lBPBone' ).position.copy( this.item.getP2() );

		this.mesh.updateMatrixWorld(true);
		this.skinnedMesh.skeleton.update();

		this.chains.updateChainData();
	}


	getArmature() {
		return Assets.models.chainTest.obj.scene.getObjectByName(`${this.item.spec.name}_Armature`);
	}


	createMeshes() {

		var materialName = "baseCenterSkinned";

		this.mesh = SkeletonUtils.clone( this.getArmature() );
		Object.defineProperties(this.mesh, ItemDisplay.object3DPropsWritable);
		this.mesh.position = this.item.position;

		this.skinnedMesh = this.mesh.getObjectByName( this.item.spec.name );

		this.skinnedMesh.material = Assets.materials[ materialName ];
		this.skinnedMesh.userData.matName = materialName;

		this.skinnedMesh.castShadow = true;
		this.skinnedMesh.receiveShadow = true;
		this.skinnedMesh.matrixAutoUpdate = false;


		this.createChains( this.skinnedMesh );

		this.skinnedMesh.geometry = Util.mergeGeometriesIfExist([

			this.skinnedMesh.geometry,
			...this.chains.getGeometries(),
		]);


		if (this.item.spec.name == 'chainTest1') {

			let materialName2 = "fenceSkinned";

			let fenceMesh = this.mesh.getObjectByName('chainTest1_cylinder_fence');

			fenceMesh.geometry = fenceMesh.geometry.clone();

			this.chains.chains[0].processCylinderGeometry( fenceMesh.geometry );

			fenceMesh.material = Assets.materials[ materialName2 ];
			fenceMesh.userData.matName = materialName2;
		}


		this.skinnedMesh.onBeforeRender = () => {

			var program = ItemDisplay.getProgramByCallback( materialName );
			if (!program)
				return;// Report.warn("no program", `${materialName}`);

			var gl = Display.renderer.getContext();

			gl.useProgram(program);

			this.chains.updateUniforms(gl, program);
		}

		this.skinnedMesh.onAfterRender = () => ItemDisplay.setProgramByCallback( materialName );


		//this.raycastMesh = this.mesh.getObjectByName('chainTest1_raycast');
		this.raycastMesh = Util.getObjectByNameStartsWith( this.mesh, 'raycast_' );

		if (this.raycastMesh) {

			this.mesh.remove( this.raycastMesh );

			this.raycastMesh.material = new THREE.MeshBasicMaterial({ skinning: true }); // !important

			this.raycastMesh.skeleton = this.skinnedMesh.skeleton;
			this.raycastMesh.matrixWorld = this.skinnedMesh.matrixWorld;
			this.raycastMesh.bindMatrixInverse = this.skinnedMesh.bindMatrixInverse;
		}
	}



	createChains(skinnedMesh) {

		var type = this.item.getFeatureValue2('rope') > 0 ? 'rope' : 'chain';
		var chainData;

		if (this.item.spec.name == 'chainTest1') {

			chainData = this.getChainConfig_chainTest1(type);

		} else if (this.item.spec.name == 'chainTest2') {

			chainData = this.getChainConfig_chainTest2(type);

		} else
			Report.warn("unknown item.spec", `${this.item}`);

		this.chains = new ChainsCollection({

			name: this.item.spec.name + '-' + type,
			mesh: skinnedMesh,
			scene: Assets.models.chainTest.obj.scene,
			chainData,
		});
	}


	getDataBlockDescriptors() { // is called for each material

		if (this.item.spec.name == 'chainTest1')
			return;

		if ( this.item.getFeatureValue2('rope') > 0 )
			return [ this.cHE_rope.getCurveLengthData_GPU().getDataBlockDescriptor() ];

		else
			return [ this.cHE_chain.getCurveLengthData_GPU().getDataBlockDescriptor() ];
	}


	updateDataBlockIID(name, iId) {
		this.chains.updateDataBlockIId(name, iId);
	}


	getChainConfig_chainTest2(type) {

		var item = this.item;

		if ( type == 'rope' ) {

			return [

				Object.assign(
					Object.assign({ get dL() { return item.getDL() } }, ChainTestDisplay.ChainData_ropeT1),
				{
					P2Marker: new THREE.Vector3,
					P0Marker: "chainTest2-hE-P0",

					//cylinderMarker: "chainTest2_cylinder_marker",
					//cylinderObject: "he3-13-2",

					cylinderMarker: "chainTest2_cylinder_marker2",
					cylinderObject: "he3-07-095",

					nonCircular: { cHE: this.cHE_rope },

					lowerBone: "lBPBone_cT2",
					upperBone: "cylinder_cT2",

					nElements: 200,
					isCW_sgn: this.item.getFeatureValue2('cw') ? 1 : -1,

					//turnSpacing: 0.05,
				}),
			];

		} else {

			return [

				Object.assign(
					Object.assign({ get dL() { return item.getDL() } }, ChainTestDisplay.ChainData_wi2B),
				{
					P2Marker: new THREE.Vector3,
					P0Marker: "chainTest2-hE-P0",

					cylinderMarker: "chainTest2_cylinder_marker",
					cylinderObject: "he3-13-2",

					nonCircular: { cHE: this.cHE_chain },

					lowerBone: "lBPBone_cT2",
					upperBone: "cylinder_cT2",

					nElements: AppConfig.isDemo1() ? 117 : 2000,
					isCW_sgn: this.item.getFeatureValue2('cw') ? 1 : -1,
/*
					elementObjects: [
						"cT_chainElementB",
						//"cT_chainElementB-T2-1", "cT_chainElementB-T2-2",
						//"cT_chainElementB-T2b-1", "cT_chainElementB-T2b-2",
					],
*/
				}),
			];
		}
	}


	getChainConfig_chainTest1(type) {

		var item = this.item;

		if ( type == 'rope' ) {

			return [

				Object.assign(
					Object.assign({ get dL() { return item.getDL() } }, ChainTestDisplay.ChainData_ropeT1),
				{
					P2Marker: new THREE.Vector3,
					//lBPAngle: Math.PI,
					P0Marker: new THREE.Vector3(0, 100, 0),

					cylinderMarker: "chainTest1_cylinder_marker",
					cylinderObject: "chainTest1_cylinder",

					lowerBone: "lBPBone",
					upperBone: "cylinder",

					nElements: 822, // Rope: includes +1 element at the end
					isCW_sgn: this.item.getFeatureValue2('cw') ? 1 : -1,

					rRollInner: 3.9,
				}),
			];

		} else {

			return [

				Object.assign(
					Object.assign({ get dL() { return item.getDL() } }, ChainTestDisplay.ChainData_wi2B),
				{
					P2Marker: new THREE.Vector3,
					//P2Angle: Math.PI,
					P0Marker: new THREE.Vector3(0, 100, 0),

					cylinderMarker: "chainTest1_cylinder_marker",
					cylinderObject: "chainTest1_cylinder",

					lowerBone: "lBPBone",
					upperBone: "cylinder",

					nElements: 136,
					isCW_sgn: this.item.getFeatureValue2('cw') ? 1 : -1,

					rRollInner: 3.9,
/*
					elementObjects: [
						//"cT_chainElementB",
						"cT_chainElementB-T2-1", "cT_chainElementB-T2-2",
					],
*/
				}),
			];
		}
	}


	remove() {}

	setFacing(value) {
		this.mesh.rotation.y = -value;
	}


	static runAnimation() {

		Local.get().getItems(item => item.isChainTest()).forEach( item =>
			item.display.runAnimation() );
	}


	runAnimation() {

		var MIN = 0.5, MAX = 8;
		var RATE = 0.75; // per Engine second

		var animDirection = this.item.getFeatureValue2('animDirection') || 0;

		if (!animDirection)
			return;

		// it runs offscreen; OK
		var diff = (Engine.time - this.animationLastRunT) * RATE;

		var y = this.item.getFeatureValue2('y') || 0;

		if (y > MAX || animDirection < 0) {

			y = Math.max(y - diff, MIN);

			if (y === MIN)
				this.item.setFeatureValue2('animDirection', 1);

		} else {

			y = Math.min(y + diff, MAX);

			if (y === MAX)
				this.item.setFeatureValue2('animDirection', -1);
		}

		this.item.setFeatureValue2('y', y);

		this.animationLastRunT = Engine.time;

		if ((Engine.frameNum % 5) === 0)
			UI.updateFor(this.item);
	}

}


ChainTestDisplay.ChainData_rope = {

	type: "rope",

	ropeRadius: 0.05,
	ropeHeight: 2,

	// 2m, sudiv by 24 = 25 elems. (26 x10-11 vert.)
	ropeNlements: 26, // +1 elem. at the end of the rope

	ropeObject: "chainTest1-rope",
};


ChainTestDisplay.ChainData_ropeT1 = {

	type: "rope",

	ropeRadius: 0.07,
	ropeHeight: 2.25,

	ropeNlements: 16, // +1 elem. at the end of the rope (subdiv.14)

	ropeObject: "rope6-007-2m25-15+1",
};


ChainTestDisplay.ChainData_wi2B = {

	elementObjects: [
//		"wi2_chainElementB",
		"wi2_chainElementB_3", "wi2_chainElementB_4", "wi2_chainElementB_1",
		"wi2_chainElementB_2", "wi2_chainElementB_5", "wi2_chainElementB_6",
	],
	rMin: 0.025,
	rMajMin: 0.06,
	rMajMax: 0.12 * 1.01,
	turnSpacing: 0,
	rRollInner: 0.216,
};




export { ChainTestDisplay }

