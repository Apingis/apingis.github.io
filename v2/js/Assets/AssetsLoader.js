
var AssetsLoader = {

	loadingMgr: null,
	bufferGeometryLoader: new THREE.BufferGeometryLoader,

	materialMapTypes: [ "aoMap", "alphaMap", "map", "normalMap", "bumpMap",
		"specularMap", "roughnessMap", "metalnessMap",
	],

	materialProps: [ "alphaTest", "side", "shadowSide", "color", "bumpScale", "fog",
		"shininess", "metalness", "roughness", "normalScale",
		"skinning", "morphTargets", "morphNormals", "transparent", "opacity",
		"wireframe", "depthWrite", "depthTest", "vertexColors", "blending",
		"depthPacking",
		// "lights", <-- n/a in phong
	],

	materialDataProps: [
		"type", "customDepthAlphaMap", "customDepthAlphaTest", "userData", "onBeforeCompile",
		//"customProgramCacheKey",
	],

	loadingCount: 0,
	completeCount: 0,
	postLoadingAllow: false,
	postLoadingMaxConcurrent: 1,
};



AssetsLoader.checkPreload = function(m) {

	if ( m.alwaysLoad )
		return true;

	var what = m.what || [];


	if ( AppConfig.isDemo1() ) {

		return what.includes('demo1');
	}


	if ( AppConfig.isDemo2() ) {

		if ( m.path && m.path.includes("animations/") )
			return true;

		if ( what.includes('char') || what.includes('tree') || what.includes('env')
				|| what.includes('demo2') )
			return true;

		return;
	}


	if (!m.noLoad)
		return true;
}



AssetsLoader.loadAll = function(onCompleteCallback) {

	var loadedURLs = new Set;

	this.loadingMgr = new THREE.LoadingManager( () => {

		setTimeout( () => {

			setTimeout( () => {
				this.postLoadingAllow = true;
//console.log(`postLoadingAllow loadingCount=${this.loadingCount}`);
				this.checkLoadTextures();
			}, 1000);

			onCompleteCallback();
		}, 10);
	},

	(url, itemsLoaded, itemsTotal) => { // somehow it fires 2 times per item, ok

		if (loadedURLs.has(url)) {
			//console.log(`onLoad fired twice url=${url}`);
			return;
		}

		loadedURLs.add(url);

		//console.log(`loaded url=${url} ${itemsLoaded}/${itemsTotal}`);
	},

	(url) => {
		Report.warn("LoadingMgr error", `url="${url}"`)
	});


	// 1. models (anything but textures)
	for (let name in Assets.models) {

		let m = Assets.models[name];

		if ( !this.checkPreload(m) )
			continue;

		if (m.path.match(/\.dae$/))
			this.loadDAE(m);

		else if (m.path.match(/\.obj$/))
			this.loadObj(m);

		else if (m.path.match(/\.md2$/))
			this.loadMD2(m);

		else if (m.path.match(/\.fbx$/))
			this.loadFBX(m);

		else if (m.path.match(/\.glb$/))
			this.loadGLTF(m);

		else if (m.path.match(/\.json$/))
			this.loadJSON(m);

		else
			Report.throw("Unknown type", `name="${name}", path="${m.path}"`);
	}


	// 2. textures marked as "preload"
	for (let name in Assets.textureProps) {

		let props = Assets.textureProps[name];

		if ( props.path && props.path.startsWith("data:") ) // props.dataURI handled by JSON load
			Assets.textures[name] = this.loadTexture(name, this.loadingMgr);

		if ( !this.checkPreload(props) )
			continue;

		if (props.preload)
			Assets.textures[name] = this.loadTexture(name, this.loadingMgr);
	}
}


AssetsLoader.loadDAE = function(model) {

	new ColladaLoader(this.loadingMgr).load(AppConfig.urlStatic + model.path,
	(function(obj) {

		if (!obj || !obj.scene || !obj.scene.children) {
			Report.warn(`Loaded ${model.path}: no content`);
			return;
		}
		this.obj = obj;
		this.onLoad && this.onLoad.call(this, obj);

	}).bind(model) );
};


AssetsLoader.loadObj = function(model) {

	Report.warn(".obj n/a");
/*
	new OBJLoader(this.loadingMgr).load(AppConfig.urlStatic + model.path,
	(function(obj) {

		this.obj = obj;
		this.onLoad && this.onLoad.call(this, obj);

	}).bind(model) );
*/
};


AssetsLoader.loadMD2 = function(model) {

	new MD2Loader(this.loadingMgr).load(AppConfig.urlStatic + model.path,
	(function(obj) {

		this.obj = obj;
		this.onLoad && this.onLoad.call(this, obj, this.arg);

	}).bind(model) );
};


AssetsLoader.loadFBX = function(model) {

	//Report.warn(".fbx n/a");

	 new FBXLoader(this.loadingMgr).load(AppConfig.urlStatic + model.path,
	(function(obj) {

		this.obj = obj;
		this.onLoad && this.onLoad.call(this, obj);

	}).bind(model) );

};


AssetsLoader.loadGLTF = function(model) {

	var loader = new GLTFLoader(this.loadingMgr);

	var dracoLoader = new DRACOLoader;

	if (AppConfig.localStatic) {

		dracoLoader.setDecoderPath( '/three127/examples/jsm/libs/draco/gltf/' );

	} else {
		dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.127.0/examples/js/libs/draco/gltf/' );
	}

	dracoLoader.setDecoderConfig({type: 'js'}); // FF 60

	loader.setDRACOLoader( dracoLoader );


	loader.load(AppConfig.urlStatic + model.path,

	(function(obj) {

		this.obj = obj;

		if (obj.animations.length > 1)
			return;

		if (obj.animations && obj.animations[0]) {

			Util.MixamoRig.filterTracks(obj.animations[0]);

			for (let trackNum = 0; trackNum < obj.animations[0].tracks.length; trackNum ++) {

				let track = obj.animations[0].tracks[trackNum];
				let endTime = track.times[track.times.length - 1];

				if (track.name.endsWith(".scale") || track.name != "mixamorigHips.position"
						&& track.name.startsWith("mixamorig") && track.name.endsWith(".position") ) {

					obj.animations[0].tracks.splice(trackNum --, 1);
					continue;
				}

				// - Animation time doesn't start with 0 (Blender 2.80 glb exporter)
				// - Some animations don't have last frame
				if (this.noLastFrame) {
					track.times = Float32Array.from(
						[...track.times.map(t => Math.max(1e-5, t - 1/30)), endTime ]);

				} else {
					track.times = Float32Array.from(
						[...track.times.map(t => Math.max(1e-5, t - 1/30)) ]);
				}

				if (track.name.endsWith(".position")) {

					if (this.noLastFrame) {
						track.values = Float32Array.from([...track.values, track.values[0],
							track.values[1], track.values[2] ]);
					}

				} else if (track.name.endsWith(".quaternion")) {

					if (this.noLastFrame) {
						track.values = Float32Array.from([...track.values, track.values[0],
							track.values[1], track.values[2], track.values[3] ]);
					}
				}
			}

			obj.animations[0].resetDuration();
		}

		this.onLoad && this.onLoad.call(this, obj);

	}).bind(model) );
}



AssetsLoader.loadJSON = function(model) {

	new THREE.FileLoader(this.loadingMgr).load(AppConfig.urlStatic + model.path,
	(function(obj) {

		this.obj = JSON.parse(obj);
		this.onLoad && this.onLoad.call(this, this.obj);

		AssetsLoader.processJSON(this);

	}).bind(model) );
}


AssetsLoader.processJSON = function(model) {

	for (let id in model.obj) {

		let elem = model.obj[id];
		//console.log(id, elem);

		if (Util.isString(elem) && elem.startsWith("data:image/")) {

			//Assets.images[id] = new Image;
			//Assets.images[id].src = elem;
			Assets.dataURIs[id] = elem;

			if (!Assets.textureProps[id]) {
				Report.warn("Not in texture conf.", `"${id}"`);
				continue;
			}

			let ref = Assets.textures[id]; // Otherwise it won't show in the 1st frame


		} else if (elem.tracks && Array.isArray(elem.tracks) && elem.duration) {
			this.processJSONAnimation(id, elem);

		} else if (elem.type && elem.type == "BufferGeometry") {
			this.processJSONGeometry(id, elem);

		} else {
			Report.throw("Invalid path", `${model.path}:${id}`);
		}
	}
}


AssetsLoader.processJSONAnimation = function(id, elem) {

	if (Assets.animations[id]) {
		Report.throw("Duplicate animation", `id=${id}`);
		return;
	}

	Assets.animations[id] = THREE.AnimationClip.parse(elem);
}


AssetsLoader.processJSONGeometry = function(id, elem) {

	if (Assets.geometries[id]) {
		Report.throw("Duplicate geometry", `id=${id}`);
		return;
	}

	let g = this.bufferGeometryLoader.parse(elem);
	if (!g.attributes.normal)
		g.computeVertexNormals();

	Assets.geometries[id] = g;
}


// =========================================================================
//
//   Textures & Materials
//
// - if it requires raw images from url, they are loaded as textures
//
//   loadTexture gets invoked:
//
// - during preloading (with loadingMgr)
// - "on demand" from createMaterial()
// - from "postLoading" (2+ textures defined for material map)
//
// =========================================================================

AssetsLoader.setTextureFormatType = function(texture, props) {

	if (!props.formatType)
		return;

	if (props.formatType == "565") {

		texture.format = THREE.RGBFormat;
		texture.type = THREE.UnsignedShort565Type;

	} else if (props.formatType == "5551") {

		texture.format = THREE.RGBAFormat;
		texture.type = THREE.UnsignedShort5551Type;

	} else if (props.formatType == "BW") {

		texture.format = THREE.LuminanceFormat;
		texture.type = THREE.UnsignedByteType;

	} else
		Report.warn("unknown formatType", `${props.formatType}`);
}


AssetsLoader.setTextureAnisotropy = function(texture, mapType) {

	if (!texture.name) {
		return Report.warn("texture w/o name");
	}

	var doSet = (value) => texture.anisotropy
		= Math.min(value, Display.renderer.capabilities.getMaxAnisotropy());

	var props = Assets.textureProps[texture.name];

	if (props.anisotropy)
		return doSet(props.anisotropy);

	if (!mapType)
		return;

	if (mapType === "map")
		doSet(Infinity);
	else
		doSet(4);
}


AssetsLoader.loadTexture = function(name, loadingMgr) {

	var props = Assets.textureProps[name];
	if (!props)
		return Report.warn("No config for texture", `name="${name}"`);

	var texture;

	if (props.combinedAlpha) {

		texture = Assets.getCombinedAlphaTexture(name, props.diffuse, props.opacity);

		props.onAfterCreate && props.onAfterCreate();

	} else {

		if (!loadingMgr) {

			this.loadingCount ++;
			//if (!props.dataURI)
			//	console.log(`start loading ${name} c=${this.loadingCount}`);
		}

		var path = props.dataURI ? Assets.dataURIs[ props.dataURI ]
			: props.path.startsWith("data:image/") ? props.path : AppConfig.urlStatic + props.path;

		if (!path)
			Report.warn("no path", `name=${name}`);

		texture = new THREE.TextureLoader(loadingMgr).load(path,

			(texture) => {
				props.loaded = true;

				this.setTextureFormatType(texture, props);

				if (!loadingMgr) {
					this.loadingCount --;
					this.completeCount ++;
					this.onTexturePostLoaded(name);
				}
			},

			undefined,

			(arg) => {
				props.loadError = true;
				Report.warn("Loading error", `url="${arg.target && arg.target.src}" mgr=${!!loadingMgr}`);

				if (!loadingMgr) {
					this.loadingCount --;
					this.checkLoadTextures();
				}
			}
		);

	} // w/ props.path


	texture.name = name;

	if (props.repeat) {

		if (!Array.isArray(props.repeat))
			props.repeat = [ props.repeat, props.repeat ];

		var mode = props.mirrored ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;

		if (props.repeat[0] > 1)
			texture.wrapS = mode;
		if (props.repeat[1] > 1)
			texture.wrapT = mode;

		texture.repeat.set(props.repeat[0], props.repeat[1]);
	}

	if (props.flipY !== undefined)
		texture.flipY = props.flipY;

	// if w/ loadingMgr: takes effect after load (above ^).
	this.setTextureFormatType(texture, props);

	this.setTextureAnisotropy(texture);

	return texture;
}


// Assign texture to the material in case 2+ textures defined in material map
AssetsLoader.onTexturePostLoaded = function(textureName) {

	//console.log(`onTexturePostLoaded(${textureName}) c=${this.loadingCount}`);

	for (let matName in Assets.materialProps) {

		let props = Assets.materialProps[ matName ];
		//if (props.AUTO_GENERATED)
		//	continue;

		if (!props.created)
			continue;

		for (let mapType of this.materialMapTypes) {

			let mapArray = props[mapType];
			if (!mapArray || !Array.isArray(mapArray))
				continue;

			if (mapArray.indexOf(textureName) == -1)
				continue;

			let texture = Assets.textures[ textureName ];

			this.setTextureAnisotropy(texture, mapType);

			let material = Assets.materials[ matName ];

			// free memory of the previous texture version
			if (material[mapType]) {

				let prevTextureVersion = material[mapType];
				let textureProps = Assets.textureProps[ prevTextureVersion.name ];

				if (!textureProps) {
					Report.warn("textureProps not found",
						`name=${prevTextureVersion.name} matName=${matName} mapType=${mapType}`);

				} else if (1
						&& !textureProps.immune
						&& !textureProps.dataURI
						&& !(textureProps.path && textureProps.path.startsWith("data:"))
				) {

					setTimeout( () => {

						//console.log(`dispose ${prevTextureVersion.name}`);

						prevTextureVersion.dispose();
						//prevTextureVersion.image = null; // TODO wrong (it hangs)
					}, 2000);
				}
			}

			material[ mapType ] = texture;
		}
	}

	this.checkLoadTextures();
}


// If 2+ textures defined in material map - load additional textures
AssetsLoader.checkLoadTextures = function() {

	if (!this.postLoadingAllow || this.loadingCount >= this.postLoadingMaxConcurrent)
		return;

	if (Engine.frameNum < 15) {
		setTimeout( () => this.checkLoadTextures(), 500);
		return;
	}


	var whatToLoad = [];

	for (let name in Assets.materialProps) {

		let props = Assets.materialProps[name];
		//if (props.AUTO_GENERATED)
		//	continue;

		if (!props.created)
			continue;

		for (let mapType of this.materialMapTypes) {

			let mapArray = props[mapType];
			if (!mapArray || !Array.isArray(mapArray))
				continue;

			let maxAvailableVersion = 0,
				maxVersion = mapArray.length - 1;

			for (let version = maxVersion; version > 0; version--) {

				let textureProps = Assets.textureProps[ mapArray[version] ];

				if (!textureProps) {
					Report.warn("no textureProps", `name="${mapArray[version]}"`);
					break;

				} else if (textureProps.loaded || textureProps.loadError) {
					maxAvailableVersion = version;
					break;
				}
			}

			if (maxAvailableVersion < maxVersion) {

				let newVersionName = mapArray[maxAvailableVersion + 1],
					newVersionProps = Assets.textureProps[newVersionName];

				whatToLoad.push({
					pri: newVersionProps.pri || Infinity,
					name: newVersionName
				});
			}
		} // for (mapType)
	}

	if (whatToLoad.length === 0) {

		console.log(`Loaded total ${this.completeCount} textures.`);
		return;
	}


	whatToLoad.sort((a, b) => a.pri - b.pri);
	var pri = whatToLoad[0].pri;

	for (let i = 0; i < whatToLoad.length; i++) {

		if (this.loadingCount >= this.postLoadingMaxConcurrent)
			break;
		if (pri < whatToLoad[i].pri)
			break;

		setTimeout( () => {
//console.log(`loading ${whatToLoad[i].name}`);
			var ref = Assets.textures[ whatToLoad[i].name ]; // get from Proxy
		}, 200);
	}
}


AssetsLoader.createMaterial = function(name) {

	var props = Assets.materialProps[name];
	if (!props)
		Report.throw("material not found", `name=${name}`);

	if (props.created)
		Report.throw("unexpected material creation", `name="${name}"`);

	for (let prop in props)
		if (this.materialProps.indexOf(prop) == -1
				&& this.materialMapTypes.indexOf(prop) == -1
				&& this.materialDataProps.indexOf(prop) == -1)
			Report.throw(`unknown material property "${prop}"`);


	var requiresCheckLoadTextures;

	var newMaterialProps = {};
	for (let prop in props)
		if (this.materialProps.indexOf(prop) != -1)
			newMaterialProps[prop] = props[prop];

	if ( !("shadowSide" in props) ) {
		if ("side" in props)
			newMaterialProps.shadowSide = props.side;
		else
			newMaterialProps.shadowSide = THREE.FrontSide;
	}


	for (let mapType of this.materialMapTypes) {

		let mapArray = props[mapType];
		if (!mapArray)
			continue;
		if (!Array.isArray(mapArray))
			mapArray = [ mapArray ];

		let maxAvailableVersion = 0,
			maxVersion = mapArray.length - 1;

		for (let version = maxVersion; version > 0; version--) {

			let textureProps = Assets.textureProps[ mapArray[version] ];

			if (!textureProps) {
				Report.warn("no textureProps", `name="${mapArray[version]}"`);
				break;

			} else if (textureProps.loaded) {
				maxAvailableVersion = version;
				break;
			}
		}

		if (maxAvailableVersion < maxVersion)
			requiresCheckLoadTextures = true;

		// Texture - Get from Proxy
		var textureName = mapArray[maxAvailableVersion];
		var texture = Assets.textures[ textureName ];

		newMaterialProps[mapType] = texture;

/*
		// e.g. "uni-std1" has no textureProps[]
		if (Assets.textureProps[textureName] && !Assets.textureProps[textureName].anisotropy)
			this.setAnisotropyForMapType(mapType, texture);
*/
		this.setTextureAnisotropy(texture, mapType);
	}


	var material;
	var materialType;

	materialType = props.type || "Phong";

	if (materialType == "Lambert") {
		material = new THREE.MeshLambertMaterial(newMaterialProps);

	} else if (materialType == "Basic") {
		material = new THREE.MeshBasicMaterial(newMaterialProps);

	} else if (materialType == "Phong") {
		material = new THREE.MeshPhongMaterial(newMaterialProps);

	} else if (materialType == "Standard") {
		material = new THREE.MeshStandardMaterial(newMaterialProps);

	} else if (materialType == "Depth") {
		material = new THREE.MeshDepthMaterial(newMaterialProps);

	} else
		Report.throw("unknown materialType", `name=${name}`);


	if (material instanceof THREE.MeshPhongMaterial && !("shininess" in props) )
		material.shininess = 12;

	material.toneMapped = false;

	for (let prop in props.userData) {
		material.userData[prop] = props.userData[prop];
	}

	// name is the lookup name; must be w/o suffix.
	//material.name = name;

	// Improved version of the material must be w/o suffix.
	material.name = name.replace(/(_I)$/, "");

	props.created = true;

	if (requiresCheckLoadTextures)
		this.checkLoadTextures();

	//if (props.customProgramCacheKey)
	//	material.customProgramCacheKey = () => props.customProgramCacheKey;

	this.setupMaterialCallbacks(material, props.onBeforeCompile);

	return material;
}


// Base on .userData.* props.
AssetsLoader.setupMaterialCallbacks = function(material, callbacks) {

	material.setupOnBeforeCompile();

	//material.customProgramCacheKey = () => `>${material.name}<`;


	// fog not working
	//if (material instanceof THREE.MeshBasicMaterial)
	//	material.onBeforeCompile = Shader.cameraPosition;

	if (material.userData.isStatic)
		material.onBeforeCompile = Shader.staticMaterial;


	if (material.alphaTest) {

		if (material.normalMap) { // alphaTest + normal
			material.onBeforeCompile = Shader.alphaTestNormalMap;
/*
		} else if (material.alphaMap) { // alphaMap
			material.onBeforeCompile = Shader.alphaMapTest;
*/
		}
	}


	//if (!material.userData.noShadow)
		UIPrefs.csm.adapter.registerMaterial(material);

	if (material.userData.wind)
		Wind.Area.setupWindMaterial(material);


	if (callbacks) {
		callbacks.forEach((elem, i) => addCallback(elem, i));
	}

	return;


	function addCallback(elem, i = 0) {

		var fn;
		var name;

		if (!elem)
			return Report.warn("no .onBeforeCompile element");

		if (typeof elem == "function") {
			fn = elem;

		} else {
			fn = elem.fn;
			name = elem.name;
		}

		if (!fn.name || name) {

			if (!name)
				name = `Assets:callbacks[${i}]`;

			Object.defineProperty(fn, "name", { value: name });
		}

		material.onBeforeCompile = fn;
	}
}




export { AssetsLoader };

