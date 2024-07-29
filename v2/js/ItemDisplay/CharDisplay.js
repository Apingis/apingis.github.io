
const USE_CHAR_22 = true;


class CharDisplay {

	constructor(item) {

		this.item = item;

		this.createMeshes();

		this.setFacing(item.facing);

		// * A built-in material is modified w/ onBeforeCompile, uniforms added.
		// * We'd like to modify custom uniforms on per-object basis.
		// * No support for such in THREE (suggestion is to use ShaderMaterial).
/*
		this.mesh.children[1].onBeforeRender = () => {

			//var program = gl.getParameter(gl.CURRENT_PROGRAM); // not set correctly
			var programData = Shader.getProgramByCallback("customChar");
			if (!programData)
				return;

			var gl = Display.renderer.getContext();

			gl.useProgram(programData.program);

			//var location = programData.getUniforms().map.charColor.addr; // This works
			var location = gl.getUniformLocation(programData.program, "charColor");

			if (this.item.id & 1)
				gl.uniform3f(location, 1, 1, 1);

			else
				gl.uniform3f(location, 0, 0, 0);
		}

*/


		// ========================================================
		//
		// Mixer animation - run only if there's the display
		//
		// ========================================================

		this.mixer = new THREE.AnimationMixer( this.skinnedMesh );
		this.mixerLastUpdateTime = Engine.time;

		this.clipActions = {};

		var clips = CharDisplay.getAnimationClips();
		for (let clipName in clips)
			this.clipActions[clipName] = this.mixer.clipAction(clips[clipName]);


		// Prevent T-Pose in any circumstances
		this.setupAnimationStanding();

		this.updateType = 0; // 0: trackList animation
/*
		if (this.updateType !== 0) {

			this.skinnedMesh.onBeforeRender = () => { // DEBUG ONLY
				if (this.updateType !== 1)
					return;

				var delta = Engine.time - this.mixerLastUpdateTime;
				if (delta > 0) {
					this.mixer.update(delta);
					//this.mixer.update(delta /5);
					this.mixerLastUpdateTime = Engine.time;
				}
			};
		}
*/
	}


	update() {

		this.item.updateAnimation(); // from Unit/trackList
		
		this.mesh.updateMatrixWorld(true);
		this.skinnedMesh.skeleton.update();
	}



	setupAnimationStanding() {

		this.mixer.stopAllAction();
		this.mixer.time = 0;

		var clipName = "Standing"; // irrespective of carrying/axe/etc.

		Unit.playAction( this.clipActions[clipName] );
		this.mixer.update(1e-5);
	}

/*
	getSkinnedMesh() {

		var mesh;

		if (USE_CHAR_22) {

			mesh = SkeletonUtils.clone(Assets.models.charmlight.obj.scene.children[0]);

		} else {

			mesh = SkeletonUtils.clone(Assets.models.char3.obj.scene.getObjectByName("Armature"));

			for (let i = 0; i < this.mesh.children.length; i++)

				if (this.mesh.children[i].name !== "char3" && this.mesh.children[i].name !== "mixamorigHips") {
					this.mesh.remove(this.mesh.children[i]);
					i --;
				}
		}

		return mesh;
	}
*/

	createMeshes() {

		var armature = Assets.models.charmlight.obj.scene.children[0];

		this.mesh = SkeletonUtils.clone( armature );

		Object.defineProperties(this.mesh, ItemDisplay.object3DPropsWritable);
		this.mesh.position = this.item.position;

		//this.mesh.userData.autoAdded = true; // per-frame dynamically added to scene list

		this.skinnedMesh = this.mesh.children[1];
		this.skinnedMesh.material = Assets.materials.charSkinned;

		this.skinnedMesh.updateMatrixWorld(); // Non-identity one; never updated later
		this.skinnedMesh.matrixAutoUpdate = false;

		this.skinnedMesh.userData.matName = 'charSkinned';

		this.updateGeometry();


/*
		this.glowMesh = SkeletonUtils.clone( armature ).children[1];
		this.glowMesh.name = 'char.glowSkinned';

		this.glowMesh.material = Assets.materials.glowSkinned;
		this.glowMesh.updateMatrixWorld(); // Non-identity one; never updated later
		this.glowMesh.matrixAutoUpdate = false;
		this.glowMesh.skeleton = this.skinnedMesh.skeleton;

		this.mesh.add( this.glowMesh);

		this.glow = new Glow([
			{
				id: 0,
				name: 'glowHead',
				type: 20,
				center: new THREE.Vector3(0, 1.5, 0),
				//factors: new THREE.Vector3(0.49, 2.95, 0.49),
				factors: new THREE.Vector3(0.1, 0.1, 0.1),
				color: new THREE.Vector3(0.3, 0.2, 1),
			}
		]);

		var geometry = new THREE.BoxBufferGeometry();

		geometry.clearGroups();

		this.glow.addAttributes( geometry, 'glowHead' );
		Util.addSkinToGeometry( geometry, 5 );

		this.glowMesh.geometry = geometry;


		this.glowMesh.onBeforeRender = () => {

			var program = ItemDisplay.getProgramByCallback("glowSkinned");
			if (!program)
				return;

			var gl = Display.renderer.getContext();

			gl.useProgram(program);

			this.glow.updateUniforms(gl, program);
		}

		this.glowMesh.onAfterRender = () => ItemDisplay.setProgramByCallback("glowSkinned");
*/
	}


	updateGlowData(track, t) {

		//this.glow.getParams('glowHead').intensity = 1;
	}


	remove() {
	}


	setFacing(value) {
		this.mesh.rotation.z = Angle.normalize(value - Math.PI / 2);
	}


	updateGeometry() {

		var partGeometries = [

			this.item.getHeadGeometry(),
			USE_CHAR_22 ? Assets.models.charmlight.geometryEquip : Assets.models.char3.geometryEquip,
		];


		var geometry = Util.mergeGeometriesIfExist(partGeometries);
		geometry.boundingSphere = CharDisplay.boundingSphere;

		this.skinnedMesh.geometry.dispose();

		this.skinnedMesh.geometry = geometry;
	}


	// =============================================================
	//
	//   Operations on Items
	//
	// =============================================================
/*
	updateEquipRightHand() {
return Report.warn(`updateEquipRightHand: obsolete`);
		var mesh = this.rightHandBone.children[0];

		mesh && this.rightHandBone.remove(mesh);

		var item = this.item.getEquipRightHand();

		if (!item)
			return;

		this.mixer.stopAllAction();

		// facing updates every frame from trackList
		this.item.facing = Math.PI / 2;

		var mesh = item.display.mesh;

		mesh.position.set(-0.887, 1.36, 0.25).add( this.item.position );
		mesh.rotation.set(0, 0, 0);
		mesh.scale.setScalar(1);

		this.rightHandBone.attach( mesh );
console.log(`updateEquipRightHand`, Array.from(mesh.matrix.elements) );
	}


	carriedMesh() {
		return this.leftHandBone.children[0];
	}


	updateCarrying() {
console.error(`updateCarrying: obsolete`);

		var item = this.item.getCarrying();
		var carriedMesh = this.carriedMesh();

		if (item) {
			if (carriedMesh) {
				if (item.display.mesh == carriedMesh)
					return;

				console.error(`char="${this}" carrying smth.else`);
				this.removeCarrying();
			}

			this.addCarrying(item);

		} else { // doesn't carry anything
			if (carriedMesh)
				this.removeCarrying();
		}
	}


	addCarrying(item) {
return;
		console.assert( item.isOn3D() );
		console.assert( item.isLog() );
		console.assert( !item.storagePosition );

		console.assert(this.leftHandBone.children.length === 0);

		// If char.display is requested then carried item must have display as well.
		var itemMesh = item.display.mesh;

		// Char position,facing can be anything.

		// 1. Position item mesh vs char mesh.
		var charFacing = this.item.facing;

		itemMesh.position.copy(this.mesh.position);

var radius;

		if (item.isLog()) {

			// 1. Reset, setup rotation to fit as in walkingCarrying, starting frame
			item.useQuaternion().identity();

			let carryRev = this.item.charData.carryingReverted;

			// onTheGround --> walkingCarrying, frame 0.
			item.rotateXLocal(this.item.charData.carryingRotationXLocal
				+ (carryRev ? 1.590707 : -1.590707) );

			item.rotateY(
				(carryRev ? Angle.opposite(charFacing) : charFacing)
				- 0.165 - Math.PI / 2
			);


			// 2. Offset position as in walkingCarrying, starting frame
			radius = item.getLogRadius();

//if (radius < 0.05)
//	radius = 0;

			itemMesh.position.add( this.item.getDirection().multiplyScalar(0.32) );
			itemMesh.position.y = 1.15 + radius;

		} else {
			Report.warn("unsupported item type");
		}

		// 3. Perform attach
		this.mixer.stopAllAction();
		this.mixer.time = 0;
		Unit.playAction(this.clipActions.WalkingCarrying);
		this.mixer.update(1e-5);

		this.mesh.updateMatrixWorld(true);

		this.leftHandBone.attach(itemMesh);

		// 4. What else?
console.log(`addCarrying rotXL=${this.item.charData.carryingRotationXLocal} rev=${this.item.charData.carryingReverted}`
	+ ` r=${radius}`,
	Array.from(itemMesh.matrix.elements) );

	}


	removeCarrying() {
return;
		var mesh = this.leftHandBone.children[0];
		if (!mesh) {
			console.error(`char="${this}" carries nothing`);
			return;
		}

		this.leftHandBone.remove(mesh);

		// carried item: expected other pieces of code to handle it
		// (assign positionType etc.)
	}
*/

	static getClipSummary() {

		var res = "";

		res += "\n//===================================================\n";
		res += "//\n// Auto-generated: CharDisplay.getClipSummary()\n//\n";
		res += "Action.DurationByType = {\n\n";

		for ( let [ name, clip ] of Object.entries(this.getAnimationClips()) ) {

			let d = clip.duration.toFixed(3);

			res += `\t${name}:`.padEnd(22, " ") + `${d},\n`;
		}

		res += "}\n\n";
		res += "//===================================================\n\n";

		return res;
	}

}


CharDisplay.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 2.5);


CharDisplay._animationClips = null;

CharDisplay.getAnimationClips = function() {

	if (CharDisplay._animationClips)
		return CharDisplay._animationClips;

	return (CharDisplay._animationClips = {

		Standing: Assets.models.standingA55.obj.animations[0],
		StandingCarrying: Assets.models.standingCarrying.obj.animations[0],
		StandingAxe: Assets.models.standingAxe.obj.animations[0],
		StandingEquipAxe: Assets.models.standingEquipAxe.obj.animations[0],

		Walking: Assets.models.walkingA60.obj.animations[0],
		WalkingCarrying: Assets.models.walkingCarrying.obj.animations[0],
		WalkingAxe: Assets.models.walkingAxe.obj.animations[0],

		Lifting2H: Assets.models.lifting2h5.obj.animations[0],
		DropFwd: Assets.animations.dropFwd,
		ThrowLeft90: Assets.models.throwLeft90.obj.animations[0],
		ThrowLeft45: Assets.models.throwLeft45.obj.animations[0],
		ThrowRight90: Assets.models.throwRight90.obj.animations[0],
		ThrowRight45: Assets.models.throwRight45.obj.animations[0],

		GetThrowAxe: Assets.models.getThrowAxe.obj.animations[0],
		StandingAxeThrow: Assets.models.standingAxeThrow.obj.animations[0],

		PickUpAxe: Assets.models.pickUpAxe.obj.animations[0],
		PickUpAxeThrow: Assets.models.pickUpAxeThrow.obj.animations[0],

		PutAxeBase: Assets.models.putAxeBase.obj.animations[0],
		GetAxeFromBase: Assets.models.getAxeFromBase.obj.animations[0],

		AxeDownward: Assets.models.axeDownward.obj.animations[0],
		AxeHorizontal: Assets.models.axeHorizontal.obj.animations[0],
		AxeHorizontalStump: Assets.models.axeHorizontalStump.obj.animations[0],

		AxeDisarm: Assets.models.axeDisarm.obj.animations[0],

	} );
}



export { CharDisplay, USE_CHAR_22 };

