
import { Point } from '../Math/Point.js';


var Display = (function() {

	var canvas = document.getElementById('canvas-main');

	// ============================
	//
	//   *** 3D / RENDERER ***
	//
	// ============================

	var maxDistance = 200;

	//var clearColor = new THREE.Color('skyblue'); // 87ceeb
	var clearColor = new THREE.Color(0x8cd0ef);

	function setClearColor(color) {

		console.assert(color instanceof THREE.Color);
		clearColor = color;
		scene.fog.color = color;
		renderer.setClearColor(color, 1);
	}


	var scene = new THREE.Scene();

	//scene.background = clearColor;
	scene.fog = new THREE.Fog(clearColor, maxDistance * 0.55, maxDistance);


	var camera = new THREE.PerspectiveCamera(45, 2, 0.125, maxDistance);
	var cameraView;


	function init() {

		cameraView = new CameraView(camera);
	}


	var lightIntensity = [ 1.1, 1.1 ];
	var lightIntensityMult = 1;
	var lights = [];

	lights[0] = new THREE.HemisphereLight(0xffffff, 0xb0b090, lightIntensity[0]);
	lights[1] = new THREE.DirectionalLight(0xffffff, lightIntensity[1]);

	lights.forEach(l => scene.add(l));
/*
	//lights[1].shadow.mapSize.width = lights[1].shadow.mapSize.height = 2048;
	lights[1].shadow.mapSize.width = lights[1].shadow.mapSize.height = 1024;
	lights[1].shadow.camera.near = 1;
	lights[1].shadow.camera.far = 4000;
	//lights[1].shadow.bias = -5e-5; // -2e-6: 1cm/2km. (-5e-5/2km leaves ok)
	//lights[1].shadow.bias = -5e-4; // absolutely no artifacts
	//lights[1].shadow.bias = -1e-4; // (char still ok)
	lights[1].shadow.bias = -3e-5;
	lights[1].shadow.normalBias = 0.015;
*/

	//var directionalLightPosition = new THREE.Vector3(-1, 2, 0);
	//var directionalLightPosition = new THREE.Vector3(-1, 1.8, -0.8);

	//var directionalLightPosition = new THREE.Vector3(0, 0.9, -1);
	//var directionalLightPosition = new THREE.Vector3(-1, 1.2, -0.3);

	//var directionalLightPosition = new THREE.Vector3(1, 1.2, 1.3); // TestAreaDisplay_VCDebug_1

	var directionalLightPosition = new THREE.Vector3(-0.9, 1.2, 0.4);

	lights[1].position.copy(directionalLightPosition.normalize());


	function updateLightIntensity(mult) {

		if (mult)
			lightIntensityMult = mult;

		lights.forEach((l, i) => l.intensity = lightIntensityMult * lightIntensity[i]);
		UIPrefs.csm.updateLightIntensity(lightIntensityMult * lightIntensity[1]);
	}



	var renderer = new THREE.WebGLRenderer({

		canvas,
		//alpha: false, // doesn't matter
		//alpha: true,
		stencil: false,
		antialias: false,
		failIfMajorPerformanceCaveat: true
	 });

	//renderer.autoClear = false; //? composer/renderPass!
	//renderer.sortObjects = false;
	//renderer.setClearAlpha(1);

	renderer.setClearColor(clearColor, 1);

	var isWebGL2 = renderer.capabilities.isWebGL2;
	var maxSamples = renderer.capabilities.maxSamples;

	if (!isWebGL2)
		console.error(`!isWebGL2 Wind TODO`);


	var dBufSize = renderer.getDrawingBufferSize( new THREE.Vector2 );
	var mSRTParams = {
		format: THREE.RGBFormat,
		stencilBuffer: false,
	};

	var mSRT4, mSRTMax;

	if (isWebGL2) {

		mSRT4 = new THREE.WebGLMultisampleRenderTarget( dBufSize.width, dBufSize.height, mSRTParams );
		mSRT4.samples = 4;

		mSRTMax = new THREE.WebGLMultisampleRenderTarget( dBufSize.width, dBufSize.height, mSRTParams );
		mSRTMax.samples = maxSamples;
	}

	var renderOption = 1;
	var ssOption = 1;

	var composer;
	var fxaaPass = new ShaderPass(FXAAShader);

/*
if (0) {

	var outlinePass = new OutlinePass(
		new THREE.Vector2(window.innerWidth, window.innerHeight),
		scene, camera
	);

	outlinePass.edgeGlow = 1;
	outlinePass.visibleEdgeColor = new THREE.Color( 1, 0, 0 );
	outlinePass.hiddenEdgeColor = new THREE.Color( 0, 0, 0.8 );
	outlinePass.edgeThickness = 4; // default 1
	outlinePass.edgeStrength = 10;  // default 3
}
*/

	function runRender() {

		if (renderOption === 1)
			renderer.render(scene, camera);
		else
			composer.render();
	}


	var forceResize = false;


	function setSS(n) {

		ssOption = Math.sqrt(n);

		forceResize = true;
		UI.setRequiresUpdate();
	}


	function setupRenderer(n) {

		if (n === 2) {

			composer = new EffectComposer(renderer);
			composer.addPass( new RenderPass(scene, camera) );
			//composer.addPass(outlinePass);
			composer.addPass(fxaaPass);

		} else if (!isWebGL2) {

			console.warn("MSAA not supported");
			n = 1;

		} else {

			let renderTarget = n === 3 ? mSRT4 : mSRTMax;

			composer = new EffectComposer(renderer, renderTarget);
			composer.addPass( new RenderPass(scene, camera) );
			//composer.addPass( new ShaderPass(CopyShader) );
			//composer.addPass(outlinePass); // TODO error MSRT
			composer.addPass( new ShaderPass(CopyShader) );
		}

		renderOption = n;

		forceResize = true;
		UI.setRequiresUpdate();

		return n;
	}



	var prevSize = new Point;
	var htmlSize = new Point;


	function resize(size) { // call from UI.*

		if (forceResize) {
			forceResize = false;

		} else if (prevSize.equals(size))
			return;


		htmlSize.copy(size);
		size.multiplyScalar(ssOption);


		var CAMERA_FOV = 45;
		var newAspect = Math.min(5, size.x / size.y);

		// ======================================================
		//
		// The Case.
		//
		// - canvas were shrink because of screen opening
		// - selected item (associated or not w/ opened screen?)
		//   appears off-screen
		//
		// * "center of item" notion:
		// ** char. (small radius) - OK
		// ** larger structures - ?
		//
		// ======================================================

		// Can item be off-screen?
		// 1) partly, center is offscreen while some part is visible
		// 2) wholly?
		//
		// - item was selected then camera was freely moved

		if (prevSize.x > size.x && Main.selectedItem
				&& Display.cameraView.sector.overlapsCircle( Main.selectedItem.getCircle() )
		) {

			let p = Main.selectedItem.getBoundingCircleCenter();

			let a = Display.cameraView.getPoint().angleToPoint(p);

			let	theta = Math.tan( CAMERA_FOV * (Math.PI / 180 / 2) ),
				centralAngle = 2 * Math.atan(theta * camera.aspect),
				newCentralAngle = 2 * Math.atan(theta * newAspect);

			let diff = Angle.sub(Display.cameraView.theta, a);

			if (Math.abs(diff) > newCentralAngle / 2) {

				let ADD_UP = 0.03;

				let correctionAngle = -Math.sign(diff) * (Math.abs(diff) - newCentralAngle / 2 + ADD_UP);

				new TWEEN.Tween(Display.cameraView) // TODO! removes "follow the char"
					.to({ theta: Display.cameraView.theta + correctionAngle }, 250)
					.easing(Util.Semicubic)
					.start();
			}
		}


		prevSize.copy(size);

		var canvasContainer = document.getElementById('canvas-container');

		canvasContainer.style.width = htmlSize.x + "px";
		canvasContainer.style.height = htmlSize.y + "px";

		var canvas = document.getElementById('canvas-main');

		canvas.width = size.x;
		canvas.height = size.y;


		camera.fov = CAMERA_FOV;
		camera.aspect = newAspect;
		camera.updateProjectionMatrix();

		renderer.setSize(size.x, size.y);
		if (composer)
			composer.setSize(size.x, size.y);


		canvas.style.width = htmlSize.x + "px"; // affected by renderer.setSize()
		canvas.style.height = htmlSize.y + "px";


		fxaaPass.uniforms['resolution'].value.set(1 / size.x, 1 / size.y);


		if (window.Assets)
			Object.values(Assets.materials.line).forEach( m =>
				m.resolution.set(htmlSize.x, htmlSize.y) );

		Cursor.resize();
	}



	// =======================================================================

	function setMaxDistance(d) {

		d -= 25;

		maxDistance = d;

		if (scene.fog) {
			scene.fog.far = d; // could be less for camera inclination
			scene.fog.near = d * 0.55;
		}

		camera.far = d;
		camera.updateProjectionMatrix();

		UIPrefs.csm.updateDistance();

		return d;
	}



	// =======================================================================

	// =======================================================================


	return {

		canvas,

		setClearColor,

		lights,
		get light() { return lights[1] },
		directionalLightPosition,
		updateLightIntensity,

		init,

		resize, forceResize,

		get maxDistance() { return maxDistance },
		setMaxDistance,

		setupRenderer, setSS,
		runRender,

		camera, scene,
		renderer, composer, fxaaPass, //outlinePass,
		get isWebGL2() { return isWebGL2 },
		get maxSamples() { return maxSamples },
		get cameraView() { return cameraView },
	};

})();


var scene = Display.scene;




export { Display, scene }

