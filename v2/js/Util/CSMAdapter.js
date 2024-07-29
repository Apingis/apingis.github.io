
class CSMAdapter {

	constructor(scene, camera, lightDirection) {

		// opposite to dirLight.position
		console.assert(lightDirection instanceof THREE.Vector3);

		this.scene = scene;
		this.camera = camera;
		this.lightDirection = lightDirection.clone().normalize();

		this.csm = null;
		this.lightsScene = new THREE.Scene;
		this.materials = new Set;
		this.isOn = false;

		this.init();
	}


	init() {

		var IS_PRODUCTION = 1;

		this.csm = new CSM( !IS_PRODUCTION ? {

			parent: this.lightsScene,
			camera: this.camera,
			lightDirection: this.lightDirection,
			cascades: 5,
			mode: 'custom',
			shadowMapSize: 4096,
			customSplitsCallback: (cascades, near, far, breaks) => {
				breaks.push(0.03, 0.08, 0.23, 0.5, 1);
			},
			lightMargin: 0,

		} : {
			parent: this.lightsScene,
			camera: this.camera,
			lightDirection: this.lightDirection,
			cascades: 4,
			mode: 'custom',
			shadowMapSize: 1024,
			customSplitsCallback: (cascades, near, far, breaks) => {
				breaks.push(0.06, 0.15, 0.35, 0.9);
			},
			lightMargin: 0,
		});


		this.lightsScene.children.forEach(obj => {

			obj.userData.csmAdded = true;
		});


		if (!CSMAdapter.ShaderChunk.csm) {

			let chunkCsm = CSMAdapter.ShaderChunk.csm = {};
			chunkCsm["lights_fragment_begin"] = THREE.ShaderChunk.lights_fragment_begin;
			chunkCsm["lights_pars_begin"] = THREE.ShaderChunk.lights_pars_begin;
		}

		this.setOrigShaderChunk();
	}


	setOrigShaderChunk() {
		THREE.ShaderChunk.lights_fragment_begin = CSMAdapter.ShaderChunk.orig["lights_fragment_begin"];
		THREE.ShaderChunk.lights_pars_begin = CSMAdapter.ShaderChunk.orig["lights_pars_begin"];
	}


	setCSMShaderChunk() {
		THREE.ShaderChunk.lights_fragment_begin = CSMAdapter.ShaderChunk.csm["lights_fragment_begin"];
		THREE.ShaderChunk.lights_pars_begin = CSMAdapter.ShaderChunk.csm["lights_pars_begin"];
	}


	setBias(...bias) {
		console.assert(bias.length >= this.csm.lights.length);

		this.csm.lights.forEach((light, i) => light.shadow.bias = bias[i]);
	}


	registerMaterial(material) {

		//console.error(`CSM registerMaterial name="${material.name}"`);

		this.materials.add(material);
		if (this.isOn)
			this.csm.setupMaterial(material);
	}


	unregisterMaterial(material) {

		this.materials.delete(material);
	}


	update() {
		this.csm.update();
	}


/* negate?	setLightDirection(v) {
		this.csm.lightDirection.copy(v).normalize();
	}
// UNUSED
	setLightAE(a, e) { // 1 wrong frame (no shadow in the nearest frustum)
		this.csm.lightDirection.setFromAE(a, e).negate();

// useless
//		this.scene.children.forEach(obj => {
//			if (obj.isDirectionalLight) {
//				obj.target.position.copy(obj.position);
//				obj.target.position.add(this.csm.lightDirection);
//			}
//		});

//		this.csm.frustums.length = 0;
		this.csm.updateFrustums();
	}
*/

	updateCameraFar() {
		//this.csm.maxFar = this.camera.far * 0.9;
		this.csm.updateFrustums();
	}


	turnOn() {

		if (this.isOn)
			return;

		this.isOn = true;

		Array.from(this.lightsScene.children).forEach(obj => this.scene.add(obj));

		this.setCSMShaderChunk();

		for (let material of this.materials)
			this.csm.setupMaterial(material);

		this.updateCameraFar();
	}


	turnOff() {

		if (!this.isOn)
			return;

		this.isOn = false;

		this.scene.children.filter(obj => obj.userData.csmAdded).forEach(obj => this.lightsScene.add(obj));

		this.setOrigShaderChunk();

		try {
			this.csm.dispose();

		} catch (e) {
			// TypeError: shader is null debugger eval code:806:5
			if (!(e instanceof TypeError))
				console.error(`csm.dispose`);
		}
	}

}


CSMAdapter.ShaderChunk = {
	orig: {
		"lights_fragment_begin": THREE.ShaderChunk.lights_fragment_begin,
		"lights_pars_begin": THREE.ShaderChunk.lights_pars_begin
	}
};




export { CSMAdapter };

