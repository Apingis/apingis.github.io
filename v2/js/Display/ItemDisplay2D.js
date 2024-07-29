
// Conclusion.
// Most of the time is spent by
// readRenderTargetPixels or ctx.drawImage(renderCanvas).

class ItemDisplay2D {

	constructor(item) {

		this.item = item;

		this.imageDataByKey = new Map;

		ItemDisplay2D.Cache.add(this);
	}


	remove() { ItemDisplay2D.Cache.remove(this) }


	getImage2D(options = {}) {

		//console.log(`getImage2D ${this.item}`, options);

		if (!options.key) {

			Report.warn("options.key required");
			return document.createElement('canvas');
		}


		if ( this.item.isChar() ) {
			options.width = 240;

		} else if (!options.width) {

			Report.warn("options.width required");
			return document.createElement('canvas');
		}

		options.width = Math.floor(options.width);


		if ( this.item.isInventoryItem() && !('factor' in options) )
			options.factor = 2;


		var data = this.imageDataByKey.get( options.key );

		if (!data) {

			ItemDisplay2D.Cache.removeExcessImages();

			data = {
				createTime: Date.now(),
				updateTime: -1,
				canvas: null,
				options,
			};

			this.imageDataByKey.set( options.key, data );


		} else if (data.options.width !== options.width
				|| data.options.factor !== options.factor) {

			let canvas = data.canvas;

			if (canvas && canvas.parentElement)
				canvas.parentElement.removeChild(canvas);

			data.createTime = Date.now();
			data.canvas = null;
			data.options = options;
		}


		var canvas = data.canvas;

		if (canvas) {

			if ( !options.keepProperties ) {

				canvas.id = "";
				canvas.className = "";
				canvas.style.cssText = "";

				canvas.onmouseenter = null;
				canvas.onmousemove = null;
				canvas.onmouseleave = null;

				if (canvas.parentElement)
					canvas.parentElement.removeChild(canvas);
			}

		} else {

			canvas = ItemDisplay2DRenderer.renderWithDisplayRenderer(this.item, options);

			if (!canvas)
				canvas = ItemDisplay2DRenderer.renderWithDisplayRenderer(this.item, options);

			if (!canvas)
				Report.warn("repeated shaderWasNotCompiled", `${this.item}`);

			data.canvas = canvas;
		}


		if (!options.noStyle) {

			canvas.style.width = data.options.styleWidth + 'px';
			canvas.style.height = data.options.styleHeight + 'px';
		}

		data.updateTime = Date.now();

		return canvas;
	}



	// Several canvas elements w/ image of the item.
	// We'd probably want several elements having same imagedata (TODO possible?)

	getCanvas(key = null, option = "") {

		console.error(`getCanvas key=${key} option=${option}`);
		return document.createElement('canvas');
	}

}



ItemDisplay2D.Cache = {

	list: new Set,

	MAX_IMAGE_COUNT: 50, // +1
	IMMUNITY_TIME: 5, // in sec.
	//EXPIRE_TIME: 5,

	_map: new Map,


	add(elem) {

		console.assert(elem instanceof ItemDisplay2D);

		this.list.add(elem);
	},


	remove(elem) { this.list.delete(elem) },


	getTotalImages() {

		var total = 0;

		this.list.forEach( elem => total += elem.imageDataByKey.size );

		return total;
	},


	getMap_itemDisplay2DByImageData() {

		this._map.clear();

		this.list.forEach( itemDisplay2D => {

			itemDisplay2D.imageDataByKey.forEach( data =>
				this._map.set(data, itemDisplay2D) );
		});

		return this._map;
	},

/*
// TODO still used images
	removeExpiredImages() {

		var expireTime = Date.now() - this.EXPIRE_TIME * 1e3;

		this.list.forEach( itemDisplay2D => {

			itemDisplay2D.imageDataByKey.forEach( (data, key) => {

				if (data.updateTime < expireTime)
					itemDisplay2D.imageDataByKey.delete(key);
			});
		});
	}
*/

	removeExcessImages() {

		var total = this.getTotalImages();

		if ( total <= this.MAX_IMAGE_COUNT )
			return;

		var itemDisplay2DByImageData = this.getMap_itemDisplay2DByImageData();

		var heap = new Heap( (a, b) => a.updateTime - b.updateTime );

		heap.initializeFromArray([ ...itemDisplay2DByImageData.keys() ]);

		var immunityTime = Date.now() - this.IMMUNITY_TIME * 1e3;

		var cntToRemove = total - this.MAX_IMAGE_COUNT + 3;
		var removedCnt = 0;

		while (1) {

			if (removedCnt >= cntToRemove)
				break;

			let data = heap.fetch();

			if (!data || data.updateTime > immunityTime)
				break;

			itemDisplay2DByImageData.get(data).imageDataByKey.delete(data.options.key);

			removedCnt ++;
		}

		this._map.clear();

		console.log(`ItemDisplay2D.Cache total=${total} removed=${removedCnt}`);
	},

}




var ItemDisplay2DRenderer = {
/*
	initialized: false,
	canvas: document.createElement('canvas'),
	renderer: null,
	dirLight: null,
	scene: null,
	camera: null,
	fxaaPass: null,
	composer: null,

	lastWidth: 0,
	lastHeight: 0,
	mSRT: null,
	composerMSRT: null,


	init() {

		if (this.initialized)
			return;

		this.initialized = true;

		this.renderer = new THREE.WebGLRenderer({

			canvas: this.canvas,
			alpha: true,
			stencil: false,
			antialias: false,
		});

		this.renderer.setClearColor( new THREE.Color('skyblue') );

		this.dirLight = new THREE.DirectionalLight(0xffffff, 0.9);

		this.scene = new THREE.Scene;
		this.scene.add( new THREE.AmbientLight(0xffffff, 1.2) );
		this.scene.add( this.dirLight );

		this.camera = new THREE.OrthographicCamera;

		this.fxaaPass = new ShaderPass(FXAAShader);

		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(new RenderPass(this.scene, this.camera));
		this.composer.addPass(this.fxaaPass);
	},


	renderItem(item) {

		this.init();

		var isConstructible = ConstructionSite.isConstructible(item);

		var [ width, height ] =
			item.isChar() ? [ 240, 264 ]
			: item.spec.getDisplay2DSize();

		this.canvas.width = width;
		this.canvas.height = height;
		this.camera.aspect = width / height;
		this.renderer.setSize(width, height);


		var mesh, savePosition, saveRotation;


		if (isConstructible) {

Report.warn("use renderWithDisplayRenderer()");
			return this.renderWithDisplayRenderer(item, { width: 512 });

		// Unable to render w/ Display.renderer:
		// * ClearAlpha = 0 (mb able? TODO v3+)

		} else if (item.isChar()) {

			mesh = item.display.mesh;
			item.display.setupAnimationStanding();

			savePosition = mesh.position.clone();
			saveRotation = mesh.rotation.clone();

			mesh.position.set(0, 0, 0);
			mesh.rotation.z = 0.5 * Math.PI; // facing -X

			this.renderer.setClearAlpha(1);

			this.setupCameraLightChar();


		} else {

			mesh = item.getMesh2D();

			if (!mesh.geometry.boundingBox)
				mesh.geometry.computeBoundingBox();

			this.renderer.setClearAlpha(0);

			this.setupCameraLight(mesh.geometry.boundingBox);
		}

		this.scene.add(mesh);


		if (this.renderer.capabilities.isWebGL2) {

			this.renderUsingMSRT(width, height);

		} else {

			this.composer.setSize(width, height);
			this.fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);

			if (item.isChar())
				this.composer.render(); // FXAA requires for char.
			else
				this.renderer.render(this.scene, this.camera);
		}


		this.scene.remove(mesh);

		savePosition && mesh.position.copy(savePosition);
		saveRotation && mesh.rotation.copy(saveRotation);


		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		var ctx = canvas.getContext('2d', { alpha: true });
		ctx.drawImage(this.canvas, 0, 0);


		//this.canvasToBlob();

		//this.showCanvas();

		return canvas;
	},


	renderUsingMSRT(width, height) {

		if (!this.mSRT || width !== this.lastWidth || height !== this.lastHeight) {

			if (this.mSRT)
				this.mSRT.dispose();

			this.lastWidth = width;
			this.lastHeight = height;

			this.mSRT = new THREE.WebGLMultisampleRenderTarget( width, height, {

				format: THREE.RGBAFormat,
				stencilBuffer: false,
			} );

			this.mSRT.samples = this.renderer.capabilities.maxSamples;

			this.composerMSRT = new EffectComposer(this.renderer, this.mSRT);

			this.composerMSRT.addPass( new RenderPass(this.scene, this.camera) );
			//shaderPass.renderToScreen = false;
			this.composerMSRT.addPass( new ShaderPass(CopyShader) );

			this.composerMSRT.setSize( width, height );
		}

		this.composerMSRT.render();
	},


	setupCameraLight(bbox) {

		this.dirLight.position.set(-50, -150, 30);

		var camera = this.camera;
		var itemCenter = bbox.getCenter(new THREE.Vector3);
		var itemSize = bbox.getSize(new THREE.Vector3);

		itemSize.multiplyScalar(1.067);

		camera.left = -itemSize.x / 2;
		camera.right = itemSize.x / 2;
		camera.top = itemSize.z / 2;
		camera.bottom = -itemSize.z / 2;

		//if (!ifInvert)
		//	camera.position.set(itemCenter.x, bbox.max.y + 10, itemCenter.z - 1e-5);

		camera.position.set(itemCenter.x, bbox.min.y - 10, itemCenter.z + 1e-5);

		camera.lookAt(itemCenter);
		camera.updateProjectionMatrix();
	},



	setupCameraLightChar() {

		this.dirLight.position.set(-50, 200, -50);

		var camera = this.camera;

		camera.left = -0.25; // 38x42
		camera.right = 0.13;
		camera.top = 0.23;
		camera.bottom = -0.19;

		camera.position.set(-2, 1.65, 0);

		camera.lookAt( new THREE.Vector3(0, 1.65, 0) );
		camera.updateProjectionMatrix();
	},
*/


	// ==========================================================



	_renderMSRT(item, options) {
	},


	renderWithDisplayRenderer(item, options) {
/*
		var renderScene = new THREE.Scene; // compiles shaders

		renderScene.background = null;
		renderScene.fog = new THREE.Fog( new THREE.Color, 1e5, 1e5 + 1 );
*/
		var renderScene = scene;

		var childrenOrig = scene.children;

		var lightsOrig = scene.children.filter(mesh => 0

			|| mesh instanceof THREE.Light
			|| mesh.userData.csmAdded

		);

		renderScene.children = lightsOrig.map( mesh => mesh.clone() );


		var camera;

		var ratio;

		if ( item.isInventoryItem() ) {

			camera = new THREE.OrthographicCamera;

			ratio = item.spec.getInvCellsX() / item.spec.getInvCellsY();

			if (!ratio) {
				Report.warn("unknown W/H ratio", `${item}`);
				ratio = 1;
			}

		} else if ( item.isRobot() ) {

			//camera = new THREE.OrthographicCamera;
			ratio = 1 / 1.1;

		} else if ( item.isChar() ) {

			camera = new THREE.OrthographicCamera;
			ratio = 1 / 1.1;

		} else if ( ConstructionSite.isConstructible(item) ) {
			ratio = 1.04;

		} else {
			Report.warn("unknown height", `${item}`);
			ratio = 1;
		}


		var width = Math.floor( options.width * (options.factor || 1) );
		var height = Math.floor( width / ratio );
		var wHRatio = width / height;

		options.styleWidth = options.width;
		options.styleHeight = Math.floor( options.width / ratio );

		var mSRT = new THREE.WebGLMultisampleRenderTarget( width, height, {

			format: THREE.RGBAFormat,
			alpha: true,
			stencilBuffer: false,
		} );

		mSRT.samples = 4;

		if (!camera)
			camera = new THREE.PerspectiveCamera(45, 2, 1, 200);

		// Error: WebGL warning: blitFramebuffer: DRAW_FRAMEBUFFER may not have multiple samples.
		// * actually it works *

		var composer = new EffectComposer(Display.renderer, mSRT);

		composer.addPass( new RenderPass(renderScene, camera) );
		//composer.addPass( new ShaderPass(CopyShader) );
		composer.addPass( new ShaderPass(CopyShaderFlipY) );
		//composer.setSize( width, height );
		composer.renderToScreen = false;

		//var shadowMapSetting = Display.renderer.shadowMap.enabled; // doesn't work w/ CSM
		//var size = Display.renderer.getSize( new THREE.Vector2 );
		//Display.renderer.setSize( width, height );


		var savedClearAlpha = Display.renderer.getClearAlpha();

		var mesh;
		var savePosition, saveRotation;


		if ( item.isInventoryItem() ) {

			mesh = ItemDisplay.createMeshForDisplay2( item.getMesh(), true, true );

			if (!mesh.geometry.boundingBox)
				mesh.geometry.computeBoundingBox();


			renderScene.children.forEach( light => {

				if (light instanceof THREE.Light) {

					light.position.set(-50, -150, 30);
					light.intensity *= 0.85;
				}
			});

			Display.renderer.setClearAlpha(0);

			let bbox = mesh.geometry.boundingBox;
			let itemCenter = bbox.getCenter(new THREE.Vector3);
			let itemSize = bbox.getSize(new THREE.Vector3);

			itemSize.multiplyScalar(1.067);

			camera.left = -itemSize.x / 2;
			camera.right = itemSize.x / 2;
			camera.top = itemSize.z / 2;
			camera.bottom = -itemSize.z / 2;

			//if (!ifInvert)
			//	camera.position.set(itemCenter.x, bbox.max.y + 10, itemCenter.z - 1e-5);

			camera.position.set(itemCenter.x, bbox.min.y - 10, itemCenter.z + 1e-5);

			camera.lookAt(itemCenter);


		} else if ( item.isRobot() ) {

			mesh = item.display.mesh;
			item.display.setupAnimationStanding();

			savePosition = mesh.position.clone();
			saveRotation = mesh.rotation.clone();

			mesh.position.set(0, 0, 0);
			mesh.rotation.y = 0.7 * Math.PI;


			renderScene.children.forEach( light => {

				if (light instanceof THREE.DirectionalLight) {

					light.position.set(-50, 200, -50);
					light.intensity *= 0.9;
				}
			});

			camera.fov = 10;
			camera.aspect = wHRatio;

			camera.position.set(-20, 3, 0);

			//camera.lookAt( new THREE.Vector3(0, 1.65, 0) );
			camera.lookAt( new THREE.Vector3(0, 0.8, 0) );


		} else if ( item.isChar() ) {

			mesh = item.display.mesh;
			item.display.setupAnimationStanding();

			savePosition = mesh.position.clone();
			saveRotation = mesh.rotation.clone();

			mesh.position.set(0, 0, 0);
			mesh.rotation.z = 0.5 * Math.PI; // facing -X


			renderScene.children.forEach( mesh => {

				if (mesh instanceof THREE.DirectionalLight) {

					mesh.position.set(-50, 200, -50);
					mesh.intensity *= 0.9;
				}
			});

			camera.left = -0.25; // 38x42
			camera.right = 0.13;
			camera.top = 0.23;
			camera.bottom = -0.19;

			camera.position.set(-5, 1.65, 0);

			camera.lookAt( new THREE.Vector3(0, 1.65, 0) );


		} else if ( ConstructionSite.isConstructible(item) ) {

			mesh = item.display.mesh;

			let props = ConstructionSite.getProps(item);

			mesh.position.set(0, 0, 0);
			mesh.rotation.y = -(props.facing || 0);

			mesh.add( this.getCheckerMesh() );


			camera.fov = 15;
			camera.aspect = wHRatio;

			let cameraX = (props.render2D.cameraX || 0);
			let cameraD = (props.render2D.cameraD || 32);
			let cameraH = (props.render2D.cameraH || 6.7);

			camera.position.set(cameraX, cameraH, -cameraD);

			let lookAt = camera.position.clone();

			camera.lookAt( lookAt.set( lookAt.x, lookAt.y - 4, 0 ) );

		} else
			Report.warn("setup camera", `${item}`);


		renderScene.add(mesh);

		camera.updateProjectionMatrix();


		ItemDisplay.shaderWasNotCompiled = false;

		composer.render();

		if ( ItemDisplay.shaderWasNotCompiled ) { // doesn't help w/ renderToScreen = false (?)
		}

		scene.children = childrenOrig;

		Display.renderer.setClearAlpha(savedClearAlpha);

		savePosition && mesh.position.copy(savePosition);
		saveRotation && mesh.rotation.copy(saveRotation);


		if ( ItemDisplay.shaderWasNotCompiled )
			return;


		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		var ctx = canvas.getContext('2d', { alpha: true });

		//ctx.drawImage(Display.renderer.domElement, 0, 0);

		//Display.renderer.setSize( size.x, size.y );
		//return canvas;


		// ! FLIP-Y happens (adressed above in CopyShader)

		var buf = new Uint8Array(width * height * 4);

		Display.renderer.readRenderTargetPixels(mSRT, 0, 0, width, height, buf);

		var imgData = ctx.createImageData(width, height);

		imgData.data.set(buf);
		ctx.putImageData(imgData, 0, 0);

		mSRT.dispose();

		//this.canvasToBlob();

		//this.showCanvas();

		return canvas;
	},



	getCheckerMesh() {

		var geometry = new THREE.PlaneBufferGeometry(32, 32)
			.applyMatrix4( new THREE.Matrix4().makeRotationX(-Math.PI / 2) );

		var mesh = ItemDisplay.createMeshForDisplay("checker_green",
			geometry, "checker_green", true, true, true);

		mesh.castShadow = false;
		mesh.receiveShadow = true;

		return mesh;
	},



	// ==========================================================

	isCanvasShown: false,

	showCanvas() {

		if (this.isCanvasShown)
			return;

		this.isCanvasShown = true;

		var div = document.createElement('div');

		div.style.width = this.canvas.width + 'px';
		div.style.height = this.canvas.height + 'px';

		div.style.position = "absolute";
		div.style.top = 0;
		div.style.left = 0;
		div.style['z-index'] = 1e5;
		div.style['background'] = 'black';

		div.appendChild(this.canvas);

		document.getElementById('app-container').appendChild(div);
	},


	canvasToBlob() {

		this.canvas.toBlob(blob => {

			var newImg = document.createElement('img');
			var url = URL.createObjectURL(blob);

			// no longer need to read the blob so it's revoked
			newImg.onload = () => {

				URL.revokeObjectURL(url);
				document.body.removeChild(newImg);

				// only canvas, not regular img
				//var ctx = newImg.getContext('2d', { alpha: true });

				var canvas = document.createElement('canvas');
				canvas.width = this.canvas.width;
				canvas.height = this.canvas.height;

				var ctx = canvas.getContext('2d', { alpha: true });
				ctx.drawImage(newImg, 0, 0);

				this.printImageDataDetail(ctx, width, height, blob, item);
			}

			newImg.src = url;
			document.body.appendChild(newImg);
		});
	},


	printImageDataDetail(ctx, width, height, blob, item) {

		var imageData = ctx.getImageData(0, 0, width, height);

		var nSemiTransparent = 0;
		var nOpaque = 0;

		for (let i = 0; i < imageData.data.length; i += 4) {

			let alpha = imageData.data[i + 3];

			if (alpha > 0 && alpha < 255)
				nSemiTransparent ++;

			if (alpha === 255)
				nOpaque ++;
		}

		console.error(`${item} px=${imageData.data.length/4} nOpaque=${nOpaque} nSemiTransparent=${nSemiTransparent}`
			+ ` blob.size=${blob.size}`);
	},

}



var CopyShaderFlipY = {

	uniforms: {
		tDiffuse: { value: null },
	},

	vertexShader: `
varying vec2 vUv;

void main() {
	vUv = vec2( uv.x, 1.0 - uv.y );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
	`,

	fragmentShader: `
//uniform float opacity;
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
	vec4 texel = texture2D( tDiffuse, vUv );
	gl_FragColor = texel;
}
	`,
}




export { ItemDisplay2D }

