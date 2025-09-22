
import { Shader } from '../Display/Shader.js';
//import { Glow } from '../Display/Glow.js';
import { ChainsCollection } from '../Display/Chains/ChainsCollection.js';

//import { RobotDisplay } from '../ItemDisplay/RobotDisplay.js';


// paths: relative to index.php

var Assets = (function() {

	var alwaysLoad = true;
	var noLoad = true;

	//var images = {};
	var dataURIs = {};


	var animations = {};



	var geometries = {

		"charAppearEffect": ( () => {

			var g = new THREE.CylinderBufferGeometry(1, 1, 200, 30, 1, true); // openEnded
			delete g.attributes.normal;
			delete g.attributes.uv;
			g.clearGroups();
			g = BufferGeometryUtils.mergeVertices(g);
			g.userData.noShadow = true;
			return g;
		})(),

		"dummy-c5": new THREE.CylinderBufferGeometry(5.0, 5.0, 2, 50),
		"dummy-c25": new THREE.CylinderBufferGeometry(25.0, 25.0, 2, 200),
		box1x5: new THREE.BoxBufferGeometry(5, 1, 1),
		box1x10: new THREE.BoxBufferGeometry(10, 1, 1),
		box1x25: new THREE.BoxBufferGeometry(25, 1, 1),
		box1x50: new THREE.BoxBufferGeometry(50, 1, 1),
		box1x500: new THREE.BoxBufferGeometry(500, 1, 1),
	};



	var models = {

		images: { path: "img/images.json", alwaysLoad },


		aspen: { path: "items/aspen/aspen.glb", what:["tree"] },


		head01a: { path: "char/headm/head01a.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 0/16, 1/32, 31/32 ] },
		head01b: { path: "char/headm/head01b.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 0/16, 1/32, 31/32 ] },
		head02a: { path: "char/headm/head02a.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 0/16, 1/16, 14/16 ] },
		head02b: { path: "char/headm/head02b.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 0/16, 1/16, 14/16 ] },

		head03a: { path: "char/headm/head03a.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 1/16, 1/16, 15/16 ] },
		head03b: { path: "char/headm/head03b.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 1/16, 1/16, 14/16 ] },

		head04a: { path: "char/headm/head04a.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 2/16, 1/16, 15/16 ] },
		head04c: { path: "char/headm/head04c.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 2/16, 1/16, 14/16 ] },
		head05a: { path: "char/headm/head05a.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 3/16, 1/16, 15/16 ] },
		head05c: { path: "char/headm/head05c.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 3/16, 1/16, 14/16 ] },
		head06: { path: "char/headm/head06a.md2", what:["char"], onLoad: processMD2Head, arg: [ 1/16, 4/16, 1/16, 15/16 ] },


		charmlight: { path: "char/charmlight22.glb", what:["char"], onLoad: function(obj) {

			var skinnedMesh = obj.scene.children[0].children[1];
			var bones = skinnedMesh.skeleton.bones;

			//for (let i = 14; i < bones.length; i++) // visible wield/rightHand(13), leftHand(9)
			//	bones[i].visible = false;

			Util.removeLowWeightSkins(skinnedMesh, 1e-3);
			skinnedMesh.normalizeSkinWeights();

			skinnedMesh.castShadow = true;
			skinnedMesh.receiveShadow = true;

			skinnedMesh.geometry = Util.convertSkinToUint8(skinnedMesh.geometry);

			var geometryEquip = skinnedMesh.geometry.clone();

			this.geometryEquip = Util.adjustUV(geometryEquip, 1/4, 0, 1/4, 0);
		} },

/*
		char3: { path: "char/char3.glb", onLoad: function(obj) {

			var skinnedMesh = obj.scene.getObjectByName("char3");

			Util.removeLowWeightSkins(skinnedMesh, 0.05);
			skinnedMesh.normalizeSkinWeights();

			skinnedMesh.castShadow = true;
			skinnedMesh.receiveShadow = true;

			var g = skinnedMesh.geometry.clone();
			this.geometryEquip = Util.adjustUV(g, 1/4, 0, 1/4, 0);
		} },
*/
/*
		baseCenter: { path: "items/baseCenter/baseCenter.dae", onLoad: function(obj) {

			obj.scene.traverse(object => {

				// EXPORT OPT. "-Z Forward, Y Up", "Apply Global Orientation"
				// EXPORT OPT. "No Triangulate" (for custom normals)
				// - appears: Y = Z; Z = -Y
				// - UVs appear mirrored vs. glb
				// - non-indexed geometry

				if (object.geometry)
					object.geometry = Util.mergeVertices(object.geometry);

				// Issue w/ skinned mesh. It adds vertices unassigned to bones
				// to bone #0 (which was created 1st in Blender, reordering later doesn't help).
			});
		} },
*/

		baseCenter: { path: "items/baseCenter/baseCenter.glb", what:['demo2'] },


		//robocenter: { path: "items/baseCenter/robocenter.glb" },


		chainTest: { path: "items/baseCenter/chainTest.glb", noLoad, what:['demo1'] },


		//proto1: { path: "items/baseCenter/proto1.glb", what:['demo2'] },


		demo2: { path: "items/baseCenter/demo2.glb", what:['demo2'] },


		//
		// .glb issues
		//
		// * animations won't export (empty tracks) (fixed)
		// * flipY = false
		// * custom normals (Blender 3.2 OK)
		//
		robot: { path: "items/robot/robot.glb", what:["robot"], onLoad: function(obj) {
		} },

/*
		mntn2: { path: "items/mntn2/mntn2.dae", what:["env"], onLoad: function(obj) {

			obj.scene.traverse(object => {

				if (object.geometry)
					object.geometry = Util.mergeVertices(object.geometry);
			});
		} },
*/
		mntn2: { path: "items/mntn2/mntn2.glb", what:["env"], onLoad: function(obj) {
		} },


		axeCustom1: { path: "items/axeCustom1.glb", what:["char"], onLoad: function(obj) {

			var transformMatrix = ( () => {

				var mesh = new THREE.Object3D;

				mesh.rotation.set(Math.PI/2, 0, 0.16);
				mesh.position.set(0.02, 0.025, 0);
				mesh.scale.multiplyScalar(0.14);
				mesh.updateMatrix();
				mesh.updateMatrixWorld();

				return mesh.matrixWorld;
			})();

			obj.scene.traverse(object => {

				if (!object.geometry)
					return;

				//object.geometry = Util.mergeVertices(object.geometry); // not required in .glb

				object.geometry = Util.addSkinToGeometry(object.geometry);

				object.geometry.applyMatrix4(transformMatrix);

				Util.adjustUV(object.geometry, 1, 0, -1, 1);
			});

		} },


		// =========================================
		//
		//   Animations
		//
		// =========================================

		anim_misc: { path: "animations/anim_misc.json", what:["tree", "robot"] },

		anim_dropFwd: { path: "animations/anim_dropFwd.json" },


		standingA55: { path: "animations/standingA55.glb", noLastFrame: 1, onLoad: function(obj) { // no LF

			var track = obj.animations[0].tracks.find(tr => tr.name == "mixamorigHips.position");

			if (!track)
				Report.throw("bad animation standingA55");

			for (let i = 0; i < track.values.length; i += 3)
				track.values[i] -= 11; // center it (move 0.11m to -X)
		} },


		standingCarrying: { path: "animations/standingCarrying.glb", noLastFrame: 1, onLoad: function(obj) {

				var tr = obj.animations[0].tracks.find(tr => tr.name == "mixamorigLeftHand.quaternion");

				var mesh = new THREE.Mesh,
					axisZ = new THREE.Vector3(0, 0, 1);

				for (let i = 0; i < tr.values.length; i += 4) {
					mesh.quaternion.fromArray(tr.values, i);
					mesh.rotateOnAxis(axisZ, -0.5); // local
					mesh.quaternion.toArray(tr.values, i);
				}
			}
		}, // *edit


		standingAxe: { path: "animations/axeStanding.glb", onLoad: function(obj) {

			Util.MixamoRig.scaleQuaternions(obj.animations[0], 0.67, Util.MixamoRig.bonesU);
		} },


		standingEquipAxe: { path: "animations/standingEquipAxe.glb" },


		walkingA60: { path: "animations/walkingA60.glb", onLoad: function(obj) { // "Standard Walk"
		} },

		walkingCarrying: { path: "animations/walkingCarrying.glb", noLastFrame: 1, onLoad: function(obj) { // no LF

				obj.animations[0].tracks.forEach(track => track.scale(0.9256414 / Char.speed));
				obj.animations[0].resetDuration();
		} },

		walkingAxe: { path: "animations/axeWalking.glb", onLoad: function(obj) {

				obj.animations[0].tracks.forEach(track => track.scale(1.004 / Char.speed));
				obj.animations[0].resetDuration();
		} },


		lifting2h5: { path: "animations/lifting2h5.glb", onLoad: function(obj) {
		} },


		throwLeft90: { path: "animations/throwLeft90.glb" },
		throwLeft45: { path: "animations/throwLeft45.glb" },
		throwRight90: { path: "animations/throwRight90.glb" },
		throwRight45: { path: "animations/throwRight45.glb" },

		getThrowAxe: { path: "animations/getThrowAxe.glb" },
		standingAxeThrow: { path: "animations/standingAxeThrow.glb" },

		pickUpAxe: { path: "animations/pickUpAxe.glb" },
		pickUpAxeThrow: { path: "animations/pickUpAxeThrow.glb" },

		putAxeBase: { path: "animations/putAxeBase.glb", onLoad: function(obj) {
		} },

		getAxeFromBase: { path: "animations/getAxeFromBase.glb", onLoad: function(obj) {
		} },


		axeHorizontalStump: { path: "animations/axeHorizontalStump.glb", onLoad: function(obj) {
		} },

		axeDownward: { path: "animations/axeDownward.glb" },
		axeHorizontal: { path: "animations/axeHorizontal.glb" },


		axeDisarm: { path: "animations/axeDisarm.glb" },
	};


	var headTransformMatrix = (() => {

		var obj = new THREE.Object3D;
		obj.rotation.y -= Math.PI/2;
		obj.position.set(0, 1.60, -0.085);
		obj.scale.multiplyScalar(0.0363);
		obj.updateMatrixWorld();
		return obj.matrixWorld;
	})();


	function processMD2Head(obj, arg) {

		this.obj.morphAttributes = {};
		this.obj = Util.mergeVertices(this.obj);

		Util.applyMatrix4ToGeometry(this.obj, headTransformMatrix);
		Util.addSkinToGeometry(this.obj, 5);

		if (arg)
			Util.adjustUV(this.obj, ...arg);
	}


	// ==========================================================
	//
	//   Texture & Material Properties
	//
	// ==========================================================

	const preload = true;
	const immune = true;
	const combinedAlpha = true;


	var textureProps = {

		normal_n: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgAQMAAABJtOi3A"
			+ "AAAA1BMVEWAf//D6qzuAAAADElEQVQI12NgGNwAAACgAAFhJX1HAAAAAElFTkSuQmCC",
			formatType: "565", anisotropy: 1,
		},

		checker_cd: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvD"
			+ "olAAAABlBMVEXNzc3///+dDYgGAAAAOElEQVRo3u3QIRIAAAjDsP3/0+BnOVyqo5pUUwUAAAAAAAAAAAAAAOAIjAEAAA"
			+ "AAAAAAAAAA4Bksimnw4hBbM8sAAAAASUVORK5CYII=",
			formatType: "BW", repeat: 4, // any repeat value even if patched later
		},

		checker_00: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA"
			+ "QAAAAEAAQMAAABmvDolAAAABlBMVEUAAAD///+l2Z/dAAAAOElEQVRo3u3QIRIAAAjDsP3/0+BnO"
			+ "Vyqo5pUUwUAAAAAAAAAAAAAAOAIjAEAAAAAAAAAAAAA4Bksimnw4hBbM8sAAAAASUVORK5CYII=",
			formatType: "BW", repeat: 4, // any repeat value even if patched later
		},

		checker13_00: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQA"
			+ "AAAEAAQMAAABmvDolAAAABlBMVEUAAAD///+l2Z/dAAAAOklEQVRo3u3KIQ4AMAgEsPv/p5lBkZA5VKu"
			+ "bLKpFEARBEARBEARBEARBEARBEAThONSHIAiCIAjC8ADLXPLEzQLr4wAAAABJRU5ErkJggg==",
			formatType: "BW", repeat: 4,
		},

		checker14a: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAA"
			+ "AABlBMVEUAAAD///+l2Z/dAAAAO0lEQVRo3u3KIQ4AMAgEsHP8/8UsmSc4VKubTKq/CIIgCIIgCIIgCII"
			+ "gCIIgCIIgCMIUeiEIgiAIN+EBFdcpE0TdAB4AAAAASUVORK5CYII=",
			formatType: "BW", repeat: 4,
		},
		checker14b: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAA"
			+ "AABlBMVEUAAAD///+l2Z/dAAAAQklEQVRo3u3VsQ0AIAwDQe8/ZTYBiYKKtGm4L63"
			+ "rndzWqdIGAAAAAAAAAPWe+wAAAABgCLhmAAAAAAAAAAAAAPgbbB7t1tjgC4GnAAAAAElFTkSuQmCC",
			formatType: "BW", repeat: 4,
		},

		checker18a: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAA"
			+ "AABlBMVEUAAAD///+l2Z/dAAAAO0lEQVRo3u3KsQ0AIAwDsHzS/68MH8CKVHt2cjFtIwiCIAiCIAiCIAiC"
			+ "IAiCIAiCIAiCsCf0QRCEP8MB9mpejzqDmuoAAAAASUVORK5CYII=",
			formatType: "BW", repeat: 4,
		},
		checker18b: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAA"
			+ "ABlBMVEUAAAD///+l2Z/dAAAAQUlEQVRo3u3UoQEAIAzEwG7Aymz+WBQVmIqLPp2qq5Vk1yMAAAAAAAAAAADgH6"
			+ "QJAIChwMQAAAAAAAAAAAAAYDA48tvB3+0SIMIAAAAASUVORK5CYII=",
			formatType: "BW", repeat: 4,
		},

		checker112a: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAA"
			+ "ABlBMVEUAAAD///+l2Z/dAAAAOklEQVRo3u3KoQEAIAwDsH6w/68tHgFuKtFJXqaNIAiCIAiCIAiCIAiCIAi"
			+ "CIAiCIAiCIFyhH4KwHA5o5WG5rXacmAAAAABJRU5ErkJggg==",
			formatType: "BW", repeat: 4,
		},
		checker112b: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAA"
			+ "ABlBMVEUAAAD///+l2Z/dAAAAP0lEQVRo3u3ToQEAIBDEsNt/WjY4LOpxGFId2+SsXRkDAAAAAAAAAAAA/gC"
			+ "9BACvgTcBAAAAAAAAAAAAABjBBld7MTTjj9Z/AAAAAElFTkSuQmCC",
			formatType: "BW", repeat: 4,
		},


		checker: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAA"
			+ "AEAAQMAAABmvDolAAAABlBMVEVgYGCxsbGKo74fAAAAOElEQVRo3u3QIRIAAAjDsP3/0+BnOVyqo5pU"
			+ "UwUAAAAAAAAAAAAAAOAIjAEAAAAAAAAAAAAA4Bksimnw4hBbM8sAAAAASUVORK5CYII=",
			formatType: "565", repeat: 4,
		},

		checker_green: { path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA"
			+ "AAQAAAAEAAQMAAABmvDolAAAABlBMVEVggE2gwY50kpOvAAAAOElEQVRo3u3QIRIAAAjDsP3/0+BnOVyq"
			+ "o5pUUwUAAAAAAAAAAAAAAOAIjAEAAAAAAAAAAAAA4Bksimnw4hBbM8sAAAAASUVORK5CYII=",
			formatType: "565", repeat: 4,
		},

		cursorArrowGreen: { dataURI: "cursorArrowGreen", formatType: "5551" },
		cursorArrowRed: { dataURI: "cursorArrowRed", formatType: "5551" },

		//metal: { path: "textures/metal_0004_base_color_2k.jpg" },
		//metal_n: { path: "textures/metal_0004_normal_1k.jpg" },


		char: { preload, what:["char"], path: "items/char.jpg" }, //flipY: false }, // flipY: where happens? (TODO) // 340
		char_n: { preload, what:["char"], path: "items/char_n.jpg" },
		char_r: { preload, what:["char"], path: "items/char_r.jpg" },


		//robot: { preload, what:["robot"], path: "items/robot/robot.jpg", flipY: false, formatType: "565" },
		//robot_n: { preload, what:["robot"], path: "items/robot/robot_n.jpg", flipY: false, formatType: "565" },
		//robot_r: { preload, what:["robot"], path: "items/robot/robot_r.jpg", flipY: false, formatType: "BW" },


		baseCenter_512: { preload, path: "items/baseCenter/baseCenter_512.jpg", flipY: false, formatType: "565" },
		baseCenter_m_256: { preload, path: "items/baseCenter/baseCenter_m_256.png", flipY: false, formatType: "BW" },
		baseCenter_n_256: { preload, path: "items/baseCenter/baseCenter_n_256.jpg", flipY: false, formatType: "565" },
		baseCenter_r_256: { preload, path: "items/baseCenter/baseCenter_r_256.jpg", flipY: false, formatType: "BW" },

		baseCenter: { pri:150, path: "items/baseCenter/baseCenter.jpg", flipY: false, formatType: "565" }, // 1.8M
		baseCenter_m: { path: "items/baseCenter/baseCenter_m.jpg", flipY: false, formatType: "BW" },
		baseCenter_n: { pri:255, path: "items/baseCenter/baseCenter_n.jpg", flipY: false, formatType: "565" }, // 2.5M
		baseCenter_r: { path: "items/baseCenter/baseCenter_r.jpg", flipY: false, formatType: "BW" }, // 150


		//fence: { pri:132, path: "textures/metal_0019/metal_0019_color4_2k.png", flipY: false, formatType: "BW" }, // 490
		fence: { pri:132, path: "textures/metal_0019/metal_0019_color4_1k.png", flipY: false, formatType: "BW" }, // 190
		fence_256: { preload, path: "textures/metal_0019/metal_0019_color4_256.png", flipY: false, formatType: "BW" },

		fence_n: { pri:220, path: "textures/metal_0019/metal_0019_normal_1k.jpg", flipY: false, formatType: "565" }, // 330

		//fence_a: { pri:130, path: "textures/metal_0019/metal_0019_opacity_2k.png", flipY: false, formatType: "BW", anisotropy: 16 }, // 550
		fence_a: { pri:130, path: "textures/metal_0019/metal_0019_opacity_1k.png", flipY: false, formatType: "BW", anisotropy: 16 }, // 230
		fence_a_512: { preload, path: "textures/metal_0019/metal_0019_opacity_512.png", flipY: false, formatType: "BW", anisotropy: 16 },

		// for combined map only
		aspen_leaves_1k: { preload, path: "items/aspen/aspen_leaves_90_1k.jpg", what:["tree"], flipY: false, formatType: "565" },

		// for combined map + depth
		aspen_leaves_a_1k: { preload, path: "items/aspen/aspen_leaves_90_a_1k.png", what:["tree"], flipY: false, formatType: "BW", anisotropy: 1 },

		aspen_leaves_combined: { combinedAlpha,
			diffuse: "aspen_leaves_1k", opacity: "aspen_leaves_a_1k",
			//formatType: "5551", // Shader.combinedMap : "Black edges fix" won't work
			anisotropy: 4,
			onAfterCreate: () => { delete Assets.textures.aspen_leaves_1k.image; },
		},


		aspen_trunk_4k: { pri:180, path: "items/aspen/aspen_trunk_4k.jpg", what:["tree"], flipY: false, formatType: "565" }, // 590
		aspen_trunk_256: { dataURI: "aspen_trunk_256", flipY: false, formatType: "565" },

		ground_grass_05: { pri:110, path: "textures/ground_grass_05.jpg", repeat: 8, mirrored: true, formatType: "565" }, // 760
		ground_grass_05_128: { dataURI: "ground_grass_05_128", repeat: 8, mirrored: true, formatType: "565" },


		ground051: { pri:105, path: "textures/Ground051/Ground051_1k.jpg", formatType: "565" }, // 150
		ground051_128: { dataURI: "ground051_128", formatType: "565" },

		//ground051_n: { pri:, path: "textures/Ground051/Ground051_n_1k.jpg", formatType: "565" }, // 380
		ground051_n: { pri:106, path: "textures/Ground051/Ground051_n_512.jpg", formatType: "565" }, // 145

		ground051_r_128: { dataURI: "ground051_r_128", formatType: "BW" },


		rock_04_2k: { pri:201, path: "textures/rock_04/rock_04_2k.jpg", repeat: 2, formatType: "565" }, // 1.2M
		rock_04_256: { dataURI: "rock_04_256", repeat: 2, formatType: "565" },

		rock_04_n_1k: { pri:250, path: "textures/rock_04/rock_04_n_1k.jpg", repeat: 2 }, // 350
		rock_04_n_128: { dataURI: "rock_04_n_128", repeat: 2 },

		rock_04_mm: { preload, path: "textures/rock_04/rock_04_mm.jpg", what:["env"] },


		rock_06_2k: { pri:242, path: "textures/rock_06/rock_06_2k.jpg", repeat: 3, formatType: "565" }, // 840
		rock_06_64: { dataURI: "rock_06_64", repeat: 3, formatType: "565" },

		rock_06_n_1k: { pri:240, path: "textures/rock_06/rock_06_n_1k.jpg", repeat: 3, formatType: "565" }, // 240
		rock_06_n_32: { dataURI: "rock_06_n_32", repeat: 3, formatType: "565" },

		rock_06_mm: { preload, path: "textures/rock_06/rock_06_mm.jpg", what:["env"] },

	};



	var materialProps = {

		cursorArrowGreen: { type: "Basic", map: "cursorArrowGreen", alphaTest: 0.35, fog: false },
		cursorArrowRed: { type: "Basic", map: "cursorArrowRed", alphaTest: 0.35, fog: false },

		cursorArrowGreen_2: { type: "Basic", map: "cursorArrowGreen", transparent: true, fog: false,
			opacity: 0.35, alphaTest: 0.1, depthWrite: false, depthTest: false },
		cursorArrowRed_2: { type: "Basic", map: "cursorArrowRed", transparent: true, fog: false,
			opacity: 0.35, alphaTest: 0.1, depthWrite: false, depthTest: false },


		metal: { type: "Standard", map: "metal", color: 0x909090, normalMap: "metal_n",
			metalness: 0.5, roughness: 0.8 },

		metal2: { type: "Standard", map: "metal", color: 0x909090, normalMap: "metal_n",
			metalness: 0.5, roughness: 0.8, side: THREE.DoubleSide },


		checker_green: { color: 0x777777, shininess: 10, map: [ "checker_green" ], },

		checker: { color: 0x777777, shininess: 10, map: [ "checker" ], },

		checker_cd: { color: 0x888888, map: [ "checker_cd" ], },


		coneChecker_Up: { type: "Basic", color: 0x999591,
			alphaMap: [ "checker_00" ], alphaTest: 0.4,
			side: THREE.BackSide,
		},
		coneChecker_Side: { type: "Basic", color: 0x46423e,
			alphaMap: [ "checker_00" ], alphaTest: 0.4,
		},


		coneChecker13_Up: { type: "Basic", color: 0x999591,
			alphaMap: [ "checker13_00" ], alphaTest: 0.4,
			side: THREE.BackSide,
		},
		coneChecker13_Side: { type: "Basic", color: 0x46423e,
			alphaMap: [ "checker13_00" ], alphaTest: 0.4,
		},

		coneChecker14a_Up: { type: "Basic", color: 0x999591,
			//alphaMap: [ "checker14b" ], alphaTest: 0.4,
			alphaMap: [ "checker14a" ], alphaTest: 0.4,
			side: THREE.BackSide,
		},
		coneChecker14a_Side: { type: "Basic", color: 0x36322e,
			//alphaMap: [ "checker14b" ], alphaTest: 0.4,
			alphaMap: [ "checker14a" ], alphaTest: 0.4,
		},

		coneChecker14b_Up: { type: "Basic", color: 0x6a6abb,
			alphaMap: [ "checker14a" ], alphaTest: 0.4,
			side: THREE.BackSide,
		},
		coneChecker14b_Side: { type: "Basic", color: 0x292965,
			alphaMap: [ "checker14a" ], alphaTest: 0.4,
		},

		coneChecker18a_Up: { type: "Basic", color: 0x999591,
			alphaMap: [ "checker18b" ], alphaTest: 0.4,
			side: THREE.BackSide,
		},
		coneChecker18a_Side: { type: "Basic", color: 0x36322e,
			alphaMap: [ "checker18b" ], alphaTest: 0.4,
		},

		coneChecker18b_Up: { type: "Basic", color: 0x6a6abb,
			alphaMap: [ "checker18a" ], alphaTest: 0.4,
			side: THREE.BackSide,
		},
		coneChecker18b_Side: { type: "Basic", color: 0x303065,
			alphaMap: [ "checker18a" ], alphaTest: 0.4,
		},


		coneChecker112a_Up: { type: "Basic", color: 0x999591,
			alphaMap: [ "checker112b" ], //alphaTest: 0.4,
			side: THREE.BackSide,
			transparent:true, opacity:0.6, depthTest:false, depthWrite:false,
		},
		coneChecker112a_Side: { type: "Basic", color: 0x36322e,
			alphaMap: [ "checker112b" ], //alphaTest: 0.4,
			transparent:true, opacity:0.6, depthTest:false, depthWrite:false,
		},

		coneChecker112b_Up: { type: "Basic", color: 0x6a6abb,
			alphaMap: [ "checker112a" ], //alphaTest: 0.4,
			side: THREE.BackSide,
			transparent:true, opacity:0.7, depthTest:false, depthWrite:false,
		},
		coneChecker112b_Side: { type: "Basic", color: 0x303065,
			alphaMap: [ "checker112a" ], //alphaTest: 0.4,
			transparent:true, opacity:0.7, depthTest:false, depthWrite:false,
		},


		constructionSiteStart: { type: "Standard",
			roughness: 0.5, metalness: 1,
			color: 0x232300,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.6,
			depthWrite: false,
			onBeforeCompile: [
				Shader.constructionSite
			],
		},

		constructionSiteStart_freeSpace: { type: "Standard",
			roughness: 0.5, metalness: 1,
			color: 0x101000,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.6,
			depthWrite: false,
			onBeforeCompile: [
				Shader.constructionSite
			],
		},

		constructionSite: { type: "Standard",
			roughness: 0.6, metalness: 2,
			color: 0x151527,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.6,
			depthWrite: false,
			onBeforeCompile: [
				Shader.constructionSite
			],
		},

		constructionSiteDisassembly: { type: "Standard",
			roughness: 0.5, metalness: 3,
			color: 0x2a1212,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.6,
			depthWrite: false,
			onBeforeCompile: [
				Shader.constructionSite
			],
		},

		constructionUpgrade: { type: "Standard",
			roughness: 0.5, metalness: 4,
			color: 0x1b1b1b,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.6,
			depthWrite: false,
			onBeforeCompile: [
				Shader.constructionSite
			],
		},


		// =======================================================================

		charSkinned: { type: "Standard", roughness: 1, metalness: 0,
			map: "char", color: 0xd0d0d0,//0xd8d8d8,
			normalMap: [ "char_n" ],
			//normalScale: new THREE.Vector2(1.3, 1.3),
			roughnessMap: [ "char_r" ],
			skinning: true,
			onBeforeCompile: [
				//{ name: "customChar", fn: s => Shader.customChar(s) },
				//Shader.customChar, // if w/o args then it takes fn name
			],
		},

		charAggregateSkinned: { type: "Standard", roughness: 1, metalness: 0,
			map: "char", color: 0xd0d0d0,//0xd8d8d8,
			normalMap: [ "char_n" ],
			//normalScale: new THREE.Vector2(1.3, 1.3),
			roughnessMap: [ "char_r" ],
			//skinning: true, // not required for aggregate
			onBeforeCompile: [
				Shader.aggregateSkinned,
			],
		},

		charAggregateSkinnedDepth: { type: "Depth", depthPacking: THREE.RGBADepthPacking,
			onBeforeCompile: [
				Shader.aggregateSkinnedDepth,
			],
		},

/*
		robotSkinned: { type: "Standard",
			metalness: 0.15, roughness: 1,
			color: 0x909090,
			skinning: true,
			map: [ "robot" ],
			normalMap: [ "robot_n" ],
			normalScale: new THREE.Vector2(1, -1),
			roughnessMap: [ "robot_r" ],
			onBeforeCompile: [
				ChainsCollection.shader,
				RobotDisplay.shader,
			],
		},

		robotAggregateSkinned: { type: "Standard",
			metalness: 0.15, roughness: 1,
			color: 0x909090,
			//skinning: true, // not required for aggregate
			map: [ "robot" ],
			normalMap: [ "robot_n" ],
			normalScale: new THREE.Vector2(1, -1),
			roughnessMap: [ "robot_r" ],
			onBeforeCompile: [
				//ChainsCollection.shader,
				Shader.aggregateSkinnedChains,
				RobotDisplay.shader,
			],
		},

		robotAggregateSkinnedDepth: { type: "Depth", depthPacking: THREE.RGBADepthPacking,
			onBeforeCompile: [
				Shader.aggregateSkinnedChainsDepth,
			],
		},
*/


		baseCenterSkinned: { type: "Standard",
			//color: 0xb0b0b0,
			skinning: true, // +must be SkinnedMesh ! attrib's not enough
			map: [ "baseCenter_512", "baseCenter" ],
			normalMap: [ "baseCenter_n_256", "baseCenter_n" ],
			metalnessMap: [ "baseCenter_m_256", "baseCenter_m" ],
			roughnessMap: [ "baseCenter_r_256", "baseCenter_r" ],
			normalScale: new THREE.Vector2(1, -1),
			metalness: 0.55, roughness: 1,
			onBeforeCompile: [
				ChainsCollection.shader,
				//Shader.customBaseCenter,
			],
			shadowSide: THREE.BackSide,
		},

		baseCenterAggregateSkinned: { type: "Standard",
			//color: 0xb0b0b0,
			//skinning: true,
			map: [ "baseCenter_512", "baseCenter" ],
			normalMap: [ "baseCenter_n_256", "baseCenter_n" ],
			metalnessMap: [ "baseCenter_m_256", "baseCenter_m" ],
			roughnessMap: [ "baseCenter_r_256", "baseCenter_r" ],
			normalScale: new THREE.Vector2(1, -1),
			metalness: 0.55, roughness: 1,
			onBeforeCompile: [
				//ChainsCollection.shader,
				Shader.aggregateSkinnedChains,
				// 10cm thickness (-0.32e-4 * k, -0.8e-4 * k, -1.9e-4 * k, -4.8e-4 * k)
				//s => Shader.csmBiasFactorPerCascade(s, [ 0, 0, 0.5, 1 ]),
				s => Shader.csmBiasFactorPerCascade(s, [ 0, 0, 0, 1 ]),
			],
			shadowSide: THREE.BackSide,
		},

		baseCenterAggregateSkinnedDepth: { type: "Depth", depthPacking: THREE.RGBADepthPacking,
			onBeforeCompile: [
				Shader.aggregateSkinnedChainsDepth,
			],
		},


		baseCenter: { type: "Standard",
			//color: 0xb0b0b0,
			map: [ "baseCenter_512", "baseCenter" ],
			normalMap: [ "baseCenter_n_256", "baseCenter_n" ],
			metalnessMap: [ "baseCenter_m_256", "baseCenter_m" ],
			roughnessMap: [ "baseCenter_r_256", "baseCenter_r" ],
			normalScale: new THREE.Vector2(1, -1),
			//normalScale: new THREE.Vector2(0.2, -0.2),
			//normalScale: new THREE.Vector2(-3, 3),
			metalness: 0.55, roughness: 1,
			onBeforeCompile: [
				Shader.baseCenterCS
			],
			shadowSide: THREE.BackSide,
		},

		baseCenterCS: { type: "Standard",
			//color: 0xb0b0b0,
			map: [ "baseCenter_512", "baseCenter" ],
			normalMap: [ "baseCenter_n_256", "baseCenter_n" ],
			metalnessMap: [ "baseCenter_m_256", "baseCenter_m" ],
			roughnessMap: [ "baseCenter_r_256", "baseCenter_r" ],
			normalScale: new THREE.Vector2(1, -1),
			metalness: 1, roughness: 1,
			onBeforeCompile: [
				Shader.baseCenterCS // metalness=1 apply constr.site uniforms
			],
		},


		// =======================================================================

		charAppearEffect: {// type: "Standard",
			transparent: true,
			onBeforeCompile: [
				Shader.charAppearEffect
			],
			blending: THREE.AdditiveBlending,
			userData: {
			//	noShadow: true
			},
		},
/*
		glowSkinned: {
			transparent: true,
			skinning: true,
			onBeforeCompile: [
				Glow.shader
			],
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		},
*/

		// =======================================================================

		fenceSkinned: { type: "Standard",
			skinning: true,
			side: THREE.DoubleSide,
			color: new THREE.Color(1.2, 1.2, 1.25),
			metalness: 0.25, roughness: 1,
			alphaTest: 0.07,
			//customDepthAlphaTest: 0.15,
			map: [ "fence_256", "fence" ],
			alphaMap: [ "fence_a_512", "fence_a" ], // same ^
			normalMap: [ "normal_n", "fence_n" ], // (+transp) - flickering (FIXED)
			normalScale: new THREE.Vector2(1, -1),
			transparent: true, depthWrite: false,
			onBeforeCompile: [
//Shader.alphaMapTest
				Shader.doubleSideNormalMap,
				Shader.customFence,
			],
		},


		fence_AggregateSkinned: { type: "Standard",
			side: THREE.DoubleSide,
			color: new THREE.Color(1.2, 1.2, 1.25),
			metalness: 0.25, roughness: 1,
			alphaTest: 0.07,
			//customDepthAlphaTest: 0.15,
			map: [ "fence_256", "fence" ],
			alphaMap: [ "fence_a_512", "fence_a" ], // same ^
			normalMap: [ "normal_n", "fence_n" ], // (+transp) - flickering (FIXED)
			normalScale: new THREE.Vector2(1, -1),
			transparent: true, depthWrite: false,
			onBeforeCompile: [

				//Shader.aggregate,
				Shader.aggregateSkinnedChains,
				Shader.doubleSideNormalMap,
				Shader.customFence,
			],
		},


		fence_AggregateSkinnedDepth: { type: "Depth", depthPacking: THREE.RGBADepthPacking,
			side: THREE.DoubleSide,
			alphaTest: 0.15,
			alphaMap: [ "fence_a_512", "fence_a" ], // same ^
			onBeforeCompile: [
				//Shader.aggregateDepth,
				Shader.aggregateSkinnedChainsDepth,
			],
		},


		fenceSkinned_I: { type: "Standard",
			side: THREE.DoubleSide,
			color: new THREE.Color(1.2, 1.2, 1.25),
			metalness: 0.25, roughness: 1,
			map: [ "fence_256", "fence" ],
			alphaMap: [ "fence_a_512", "fence_a" ],
			normalMap: [ "normal_n", "fence_n" ],
			normalScale: new THREE.Vector2(1, -1),
			alphaTest: 0.5,
			//customDepthAlphaTest: 0.15,
			transparent: true,
			userData: { hasTransparentPart: true },
			onBeforeCompile: [
				Shader.doubleSideNormalMap,
				Shader.customFence_I,
			],
		},

		fence_AggregateSkinned_I: { type: "Standard",
			side: THREE.DoubleSide,
			color: new THREE.Color(1.2, 1.2, 1.25),
			metalness: 0.25, roughness: 1,
			map: [ "fence_256", "fence" ],
			alphaMap: [ "fence_a_512", "fence_a" ],
			normalMap: [ "normal_n", "fence_n" ],
			normalScale: new THREE.Vector2(1, -1),
			alphaTest: 0.5,
			//customDepthAlphaTest: 0.15,
			transparent: true,
			userData: { hasTransparentPart: true },
			onBeforeCompile: [
				//Shader.aggregate,
				Shader.aggregateSkinnedChains,
				Shader.doubleSideNormalMap,
				Shader.customFence_I,
			],
		},

		fenceSkinned_TP: { type: "Standard",
			side: THREE.DoubleSide,
			color: new THREE.Color(1.2, 1.2, 1.25),
			metalness: 0.25, roughness: 1,
			map: [ "fence_256", "fence" ],
			alphaMap: [ "fence_a_512", "fence_a" ],
			normalMap: [ "normal_n", "fence_n" ],
			normalScale: new THREE.Vector2(1, -1),
			alphaTest: 0.5,
			depthWrite: false, transparent: true, opacity: 1,
			userData: { isTransparentPart: true },
			onBeforeCompile: [
				Shader.doubleSideNormalMap,
				Shader.customFence_TP,
			],
		},

		fence_AggregateSkinned_TP: { type: "Standard",
			side: THREE.DoubleSide,
			color: new THREE.Color(1.2, 1.2, 1.25),
			metalness: 0.25, roughness: 1,
			map: [ "fence_256", "fence" ],
			alphaMap: [ "fence_a_512", "fence_a" ],
			normalMap: [ "normal_n", "fence_n" ],
			normalScale: new THREE.Vector2(1, -1),
			alphaTest: 0.5,
			depthWrite: false, transparent: true, opacity: 1,
			userData: { isTransparentPart: true },
			onBeforeCompile: [
				//Shader.aggregate,
				Shader.aggregateSkinnedChains,
				Shader.doubleSideNormalMap,
				Shader.customFence_TP,
			],
		},



		// =======================================================================

		aspen_trunk: {
			map: [ "aspen_trunk_256", "aspen_trunk_4k" ],
			userData: { wind: true },
			onBeforeCompile: [
			],
		},

		aspen_trunk_AggregateWind: {
			map: [ "aspen_trunk_256", "aspen_trunk_4k" ],
			onBeforeCompile: [
				Shader.aggregateWind,
			],
		},

		aspen_trunk_AggregateWindDepth: { type: "Depth", depthPacking: THREE.RGBADepthPacking,
			onBeforeCompile: [
				Shader.aggregateWindDepth,
			],
		},

/*
		constructionSiteIntersectTreeTrunk: {

			color: new THREE.Color(4, 0.5, 0.5),
			map: [ "aspen_trunk_256", "aspen_trunk_4k" ],

			transparent: true, opacity: 0.95,
			depthTest: false, depthWrite: false,
			userData: { wind: true },
		},


		constructionSiteIntersectTreeLeaves: {

			color: new THREE.Color(4, 0.5, 0.5),
			side: THREE.DoubleSide,
			alphaTest: 0.42,
			map: [ "aspen_leaves_combined" ],

			transparent: true, opacity: 0.95,
			//blending: THREE.AdditiveBlending,
			depthTest: false, depthWrite: false,
			userData: { wind: true },
			onBeforeCompile: [

				s => Shader.combinedMap(s),
				Shader.custom_AspenLeaves,
			],
		},
*/

		aspen_leaves: {
			color: new THREE.Color(1, 1.25, 1),
			side: THREE.DoubleSide,
			alphaTest: 0.42,
			map: [ "aspen_leaves_combined" ],
			customDepthAlphaMap: "aspen_leaves_a_1k",
			shininess: 0,
			userData: { wind: true },
			onBeforeCompile: [

				s => Shader.combinedMap(s),
				Shader.custom_AspenLeaves,
			],
		},


		aspen_leaves_AggregateWind: {
			color: new THREE.Color(1, 1.25, 1),
			side: THREE.DoubleSide,
			alphaTest: 0.42,
			map: [ "aspen_leaves_combined" ],
			//customDepthAlphaMap: "aspen_leaves_a_1k",
			shininess: 0,
			//userData: { wind: true },
			onBeforeCompile: [

				Shader.aggregateWind,
				s => Shader.combinedMap(s),
				Shader.custom_AspenLeaves,
			],
		},


		aspen_leaves_AggregateWindDepth: { type: "Depth", depthPacking: THREE.RGBADepthPacking,
			side: THREE.DoubleSide,
			alphaTest: 0.42,
			//map: [ "aspen_leaves_combined" ],
			//customDepthAlphaMap: "aspen_leaves_a_1k",
			alphaMap: [ "aspen_leaves_a_1k" ],
			//userData: { wind: true },
			onBeforeCompile: [

				Shader.aggregateWindDepth,
				//s => Shader.combinedMap(s),
				//Shader.custom_AspenLeaves, <-- requires vDistanceToCamera
				shader => Shader.custom_AspenBranches(shader, 2.5),
			],
		},


		aspen_leaves_I: {
			color: new THREE.Color(1, 1.25, 1),
			side: THREE.DoubleSide,
			shininess: 0,
			map: [ "aspen_leaves_combined" ],
			customDepthAlphaMap: "aspen_leaves_a_1k",
			alphaTest: 0.67,
			customDepthAlphaTest: 0.35,
			userData: { wind: true, hasTransparentPart: true },
			onBeforeCompile: [

				Shader.custom_AspenBranches,
				s => Shader.combinedMap(s),
				{ name: "aspen_leaves_I", fn: s => Shader.distanceAlphaTest(s, 0.3, 0.41) },
			],
		},

		aspen_leaves_AggregateWind_I: {
			color: new THREE.Color(1, 1.25, 1),
			side: THREE.DoubleSide,
			shininess: 0,
			map: [ "aspen_leaves_combined" ],
			customDepthAlphaMap: "aspen_leaves_a_1k",
			alphaTest: 0.67,
			customDepthAlphaTest: 0.35,
			userData: { hasTransparentPart: true },
			onBeforeCompile: [

				Shader.aggregateWind,
				Shader.custom_AspenBranches,
				s => Shader.combinedMap(s),
				{ name: "aspen_leaves_I", fn: s => Shader.distanceAlphaTest(s, 0.3, 0.41) },
			],
		},


		aspen_leaves_TP: {
			color: new THREE.Color(1, 1.25, 1),
			side: THREE.DoubleSide,
			shininess: 0,
			map: [ "aspen_leaves_combined" ],
			alphaTest: 0.67,
			depthWrite: false, transparent: true, opacity: 1,
			userData: { wind: true, isTransparentPart: true },
			onBeforeCompile: [

				Shader.custom_AspenBranches,
				s => Shader.combinedMap(s),
				{ name: "aspen_leaves_TP", fn: s => Shader.distanceAlphaTest_TP(s, 0.3, 0.41) },
			],
		},

		aspen_leaves_AggregateWind_TP: {
			color: new THREE.Color(1, 1.25, 1),
			side: THREE.DoubleSide,
			shininess: 0,
			map: [ "aspen_leaves_combined" ],
			alphaTest: 0.67,
			depthWrite: false, transparent: true, opacity: 1,
			userData: { isTransparentPart: true },
			onBeforeCompile: [

				Shader.aggregateWind,
				Shader.custom_AspenBranches,
				s => Shader.combinedMap(s),
				{ name: "aspen_leaves_TP", fn: s => Shader.distanceAlphaTest_TP(s, 0.3, 0.41) },
			],
		},


		// =======================================================================

		ground_grass_05: {
			color: 0x4c4a3c, shininess: 10,
			map: [ "ground_grass_05_128", "ground_grass_05" ],
			onBeforeCompile: [
				s => Shader.csmBiasFactor(s, -0.01),
			],
		},

		ground051: {
			type: "Standard", metalness: 0, roughness: 0.87,
			color: 0x796d64,
			map: [ "ground051_128", "ground051" ],
			normalMap: [ "normal_n", "ground051_n" ],
			roughnessMap: "ground051_r_128",
			shadowSide: THREE.BackSide,
		},

		ground051_Aggregate: {
			type: "Standard", metalness: 0, roughness: 0.87,
			color: 0x796d64,
			map: [ "ground051_128", "ground051" ],
			normalMap: [ "normal_n", "ground051_n" ],
			roughnessMap: "ground051_r_128",
			onBeforeCompile: [
				Shader.aggregate,
			],
			shadowSide: THREE.BackSide,
		},

		ground051_AggregateDepth: { type: "Depth", depthPacking: THREE.RGBADepthPacking,
			onBeforeCompile: [
				Shader.aggregateDepth,
			],
		},


		rock_04: { type: "Phong",
			color: 0x668888,
			map: [ "rock_04_256", "rock_04_2k" ],
			normalMap: [ "rock_04_n_128", "rock_04_n_1k" ],
			onBeforeCompile: [
				s => Shader.csmBiasFactor(s, 2),
			],
			//shadowSide: THREE.BackSide, // verticalSurface
		},

		rock_04_Aggregate: { type: "Phong",
			color: 0x668888,
			map: [ "rock_04_256", "rock_04_2k" ],
			normalMap: [ "rock_04_n_128", "rock_04_n_1k" ],
			onBeforeCompile: [
				Shader.aggregate,
				s => Shader.csmBiasFactor(s, 2),
			],
			//shadowSide: THREE.BackSide, // ground_grass_05
		},

		rock_04_AggregateDepth: { type: "Depth", depthPacking: THREE.RGBADepthPacking,
			onBeforeCompile: [
				Shader.aggregateDepth,
			],
		},


		rock_06: { type: "Phong",
			color: 0x7a8a8a,
			map: [ "rock_06_64", "rock_06_2k" ],
			normalMap: [ "rock_06_n_32", "rock_06_n_1k" ],
			onBeforeCompile: [
				//s => Shader.csmBiasFactor(s, 2),
			],
			//shadowSide: THREE.BackSide,
		},

		rock_06_Aggregate: { type: "Phong",
			color: 0x7a8a8a,
			map: [ "rock_06_64", "rock_06_2k" ],
			normalMap: [ "rock_06_n_32", "rock_06_n_1k" ],
			onBeforeCompile: [
				Shader.aggregate,
				//s => Shader.csmBiasFactor(s, 2),
			],
			//shadowSide: THREE.BackSide,
		},

		rock_06_AggregateDepth: { type: "Depth", depthPacking: THREE.RGBADepthPacking,
			onBeforeCompile: [
				Shader.aggregateDepth,
			],
		},

	}; // textureProps


	// =======================================
	//
	//   Textures - Load & Access
	//
	// =======================================

	var textures = new Proxy({}, {

		get: function(obj, name) {

			if (name in obj)
				return obj[name];

			var texture;

			texture = AssetsLoader.loadTexture(name);

			return obj[name] = texture;
		},

	});



	// ============================================================
	//
	//   Materials - Creation & Access
	//
	// ============================================================

	var materials = new Proxy({

		highlight: {
			friend: new THREE.MeshBasicMaterial({ color: 0x00ff00,// side: THREE.DoubleSide,
				transparent: true, opacity: 0.3, fog: false, depthWrite: false }),
			neutral: new THREE.MeshBasicMaterial({ color: 0xffff00,// side: THREE.DoubleSide,
				transparent: true, opacity: 0.3, fog: false, depthWrite: false }),
			enemy: new THREE.MeshBasicMaterial({ color: 0xff0000,// side: THREE.DoubleSide,
				transparent: true, opacity: 0.3, fog: false, depthWrite: false }),
		},

		sector: new THREE.MeshBasicMaterial({ color: new THREE.Color('steelblue'),
				transparent: true, opacity: 0.2, fog: false, depthWrite: false }),
		cI_intervals: new THREE.MeshBasicMaterial({ color: 0xff1047,
				transparent: true, opacity: 0.3, fog: false, depthWrite: false }),
		flatPolygon: new THREE.MeshBasicMaterial({ color: 0xff1a1a,
				transparent: true, opacity: 0.6, fog: false, depthWrite: false }),
		flatPolygonYellow: new THREE.MeshBasicMaterial({ color: 0xffb000,
				transparent: true, opacity: 0.5, fog: false, depthWrite: false }),

		constructionSiteIntersect: new THREE.MeshPhongMaterial({ color: 0xff0000,
				transparent: true, opacity: 0.95, fog: false,
				//side: THREE.DoubleSide, // fence!
				//blending: THREE.AdditiveBlending,
				depthTest: false, depthWrite: false, }),

		constructionSiteIntersectUnit: new THREE.MeshPhongMaterial({ color: 0xff401a,
				transparent: true, opacity: 0.85, fog: false,
				depthTest: false, depthWrite: false, }),

		plane: new THREE.MeshBasicMaterial({ color: 0x000000,
				transparent: true, opacity: 0.7, fog: true, side: THREE.DoubleSide, depthWrite: false }),

		cone: new THREE.MeshBasicMaterial({ color: 0x202020,
				transparent: true, opacity: 0.7, fog: false, side: THREE.DoubleSide, depthWrite: false }),
		coneBlue: new THREE.MeshBasicMaterial({ color: 0x303047,
				transparent: true, opacity: 0.6, fog: false, side: THREE.DoubleSide, depthWrite: false }),
		coneRed: new THREE.MeshBasicMaterial({ color: 0xff0000,
				transparent: true, opacity: 0.25, fog: false, side: THREE.DoubleSide, depthWrite: false }),

		cylinder: new THREE.MeshBasicMaterial({ color: 0xe0e000, side: THREE.DoubleSide,
			transparent: true, opacity: 0.3, fog: false, depthWrite: false }),

		sphereTransparent: new THREE.MeshPhongMaterial({ color: new THREE.Color('cornflowerblue'), side: THREE.DoubleSide,
			transparent: true, opacity: 0.25, fog: false, depthWrite: false }),

		//sphere: new THREE.MeshStandardMaterial({ color: 0x6070ff, metalness: 0.1, roughness: 0.5 }),
		sphere: new THREE.MeshStandardMaterial({ color: 0x7d7da7, metalness: 0.9, roughness: 0.5 }),

		white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
		visTest: new THREE.MeshBasicMaterial({ color: 0x109060, side: THREE.DoubleSide }),
		visTest2: new THREE.MeshBasicMaterial({ color: 0, side: THREE.DoubleSide }),

		chainTestSphere: new THREE.MeshPhongMaterial({ color: 0x5030ff,// side: THREE.DoubleSide,
			transparent: true, opacity: 0.9, fog: false, depthTest: false, depthWrite: false }),

		polyhedron: new THREE.MeshBasicMaterial({ color: 0xe0e0ff, wireframe: true }),
		polyhedronVertex: new THREE.MeshPhongMaterial({ color: 0xf05047 }),

		line: {
			point: new LineMaterial({ color: 0xb095a3, linewidth: 2 }),
			approachPoint: new LineMaterial({ color: 0xa0bc47, linewidth: 2 }),
			vGNode: new LineMaterial({ color: 0x36d9b2, linewidth: 2 }),
			wayPoint: new LineMaterial({ color: 0xa0c050, linewidth: 2 }),
			extraNeighbor: new LineMaterial({ color: 0xbb8048, linewidth: 2 }),
			destination: new LineMaterial({ color: 0x80e0a0, linewidth: 4 }),
			destinationCircle: new LineMaterial({ color: 0xc0b047, linewidth: 2 }),

			bypassPoint: new LineMaterial({ color: 0x50b963, linewidth: 2 }),
			angularSegment: new LineMaterial({ color: 0xdc7a70, linewidth: 4 }),
			grazeVector: new LineMaterial({ color: 0x549359, linewidth: 1 }),
			grazeLocation: new LineMaterial({ color: 0x641a25, linewidth: 1 }),
			interval: new LineMaterial({ color: 0xd0b010, linewidth: 1 }),

			axisX: new LineMaterial({ color: 0xc81007, linewidth: 5, transparent: true, opacity: 0.75 }),
			axisXminus: new LineMaterial({ color: 0xff6050, linewidth: 4, transparent: true, opacity: 0.55 }),
			axisY: new LineMaterial({ color: 0x0020e0, linewidth: 5, transparent: true, opacity: 0.8 }),
			axisYminus: new LineMaterial({ color: 0x4c64ff, linewidth: 4, transparent: true, opacity: 0.55 }),

			circle: new LineMaterial({ color: 0xa0c947, linewidth: 2 }),
			circleGrey: new LineMaterial({ color: 0x9b998c, linewidth: 4 }),
			circle_coneChecker14b: new LineMaterial({ color: 0x6a6abb, linewidth: 4 }),
			//cI_circle: new LineMaterial({ color: 0xff7a37, linewidth: 6, transparent: true, opacity: 0.4 }),
			cI_circle: new LineMaterial({ color: 0xa7282a, linewidth: 5 }),

			line2: new LineMaterial({ color: 0x15a315, linewidth: 3 }),
			track: new LineMaterial({ color: 0xd7ff15, linewidth: 6, transparent: true, opacity: 0.25 }),
			tileset: new LineMaterial({ color: 0x2015ff, linewidth: 7, transparent: true, opacity: 0.4 }),

			rect: new LineMaterial({ color: 0xd07070, linewidth: 2 }),
			polygon: new LineMaterial({ color: 0xb0b0b0, linewidth: 1 }),

			sign: new LineMaterial({ color: 0xa0a0a0, linewidth: 2 }),
			signBlue: new LineMaterial({ color: 0x3040c0, linewidth: 2 }),
			signRed: new LineMaterial({ color: 0xc03737, linewidth: 2 }),

			intermediateLine: new LineMaterial({ color: 0x20c2a0, linewidth: 6 }),
			boundingLine: new LineMaterial({ color: 0xa93f12, linewidth: 3 }),
			boundingLine2: new LineMaterial({ color: 0x9a2510, linewidth: 2 }),
			dSegment: new LineMaterial({ color: 0xc7807a, linewidth: 4 }),
			dSegment2: new LineMaterial({ color: 0x8060e0, linewidth: 8 }),

			intersect: new LineMaterial({ color: 0x24113d, linewidth: 2 }),

			polyhedronEdge: new LineMaterial({ color: 0x80d850, linewidth: 2 }),
			polyhedronEdgeThin: new LineMaterial({ color: 0xffe000, linewidth: 1 }),
			edgeChain: new LineMaterial({ color: 0x1090ff, linewidth: 1 }),
			line3: new LineMaterial({ color: 0xb0b939, linewidth: 4 }),
			polyhedronNormal: new LineMaterial({ color: 0x9030b7, linewidth: 1 }),

			cGroup: new LineMaterial({ color: 0x5c65cb, linewidth: 2 }),
			cGroupRC1: new LineMaterial({ color: 0xb5b564, linewidth: 2 }),

			flatSegments: new LineMaterial({ color: 0x1570b5, linewidth: 3 }),
			flatPoints: new LineMaterial({ color: 0x6a90c0, linewidth: 2 }),
			asOrigin: new LineMaterial({ color: 0x6a50e0, linewidth: 3 }),
			asOriginSmashed: new LineMaterial({ color: new THREE.Color('tomato'), linewidth: 3 }),

			mPLine: new LineMaterial({ color: 0x128e25, linewidth: 3 }),
			pathSupplementary: new LineMaterial({ color: 0x60191b, linewidth: 3 }),
			redThin: new LineMaterial({ color: 0xc53030, linewidth: 1 }),

			red: new LineMaterial({ color: 0xc02020, linewidth: 2 }),
			blue: new LineMaterial({ color: new THREE.Color('blue'), linewidth: 2 }),
			green: new LineMaterial({ color: new THREE.Color('lawngreen'), linewidth: 2 }),
			grey: new LineMaterial({ color: 0xa0a0a0, linewidth: 2 }),

			friend: new LineMaterial({ color: 0x00ff00, linewidth: 3 }),
			neutral: new LineMaterial({ color: 0xffe000, linewidth: 3 }),
			enemy: new LineMaterial({ color: 0xff0000, linewidth: 3 }),

			cameraDragMarker: new LineMaterial({ color: new THREE.Color('tomato'),
				linewidth: 6, depthTest: false }),

			cursorRobotFlag: new LineMaterial({ color: 0xc0c0c0, linewidth: 3 }),
			//robotFlag: new LineMaterial({ color: 0x40f097, linewidth: 3 }),
			robotFlag: new LineMaterial({ color: 0xc1ff2a, linewidth: 3 }),

			chainTestX: new LineMaterial({ color: 0xc13500, linewidth: 2 }),
			chainTestY: new LineMaterial({ color: 0x22a522, linewidth: 2 }),
			chainTestZ: new LineMaterial({ color: 0x1515bb, linewidth: 2 }),
			chainTestPhi1: new LineMaterial({ color: 0xf59920, linewidth: 2 }),
			chainTestPhi: new LineMaterial({ color: 0xd10084, linewidth: 2 }),
			chainTestTangent: new LineMaterial({ color: 0x00f09c, linewidth: 2,
				transparent: true, fog: false, opacity: 0.9, depthTest: false, depthWrite: false }),
		},

		basicRed: new THREE.MeshBasicMaterial({ color: 0x901010, name: "basicRed" }),
		basicGreen: new THREE.MeshBasicMaterial({ color: 0x109010, name: "basicGreen" }),
		basicBlue: new THREE.MeshBasicMaterial({ color: 0x101090, name: "basicBlue" }),
		basicGray: new THREE.MeshLambertMaterial({ color: 0x707070, name: "basicGray" }),


		canBeFacade: function(matName) {
			var props = materialProps[matName];
			if (!props)
				return false;

			if (!props.userData || !('facade' in props.userData))
				return true; // the default

			return props.userData.facade;
		}


	}, {
		get: function(obj, name) {
			if (name in obj)
				return obj[name];
			return obj[name] = AssetsLoader.createMaterial(name);
		}
	});


	//onResize() Object.values(materials.line).forEach( m =>
	//	m.resolution.set(window.innerWidth, window.innerHeight) );


	// ======================================================
/*
//
//   Special Textures - require additional processing
//

	var TextureChar = {}; // Use directly (w/ GPU coloring) TODO (v2?)


	TextureChar.get = function(name, color) {

		var ctx = document.createElement('canvas').getContext('2d');
		ctx.canvas.width = 2048;
		ctx.canvas.height = 2048;

		var match = name.match(/^(char)-(\d+)$/);
		if (!match) {
			Report.warn("bad char texture", `name=${name}`);
			return ctx.canvas;
		}

		var [ , baseName, variant ] = match;

		ctx.drawImage(Assets.textures.char.image, 0, 0);

		//ctx.drawImage(Assets.textures.charBase.image, 0, 0);
		//ctx.drawImage(Assets.TextureUni.get("uni-std1", color), 0, 0);

		return ctx.canvas;
	}



	var TextureUni = {};

	TextureUni.ctx1 = document.createElement('canvas').getContext('2d');
	TextureUni.ctx1.canvas.width = 256;
	TextureUni.ctx1.canvas.height = 256;


	TextureUni.get = function(name, color, newCanvas) {

		var ctx;
		if (!newCanvas) {
			ctx = this.ctx1;

		} else {
			ctx = document.createElement('canvas').getContext('2d');
			ctx.canvas.width = 256;
			ctx.canvas.height = 256;
		}

		var result = name.match(/^(uni-[a-z]+)(\d+)$/);
		if (result === null) {
			console.error(`bad uni texture name=${name}`);
			return ctx.canvas;
		}
		var [ , baseName, variant ] = result;

		ctx.drawImage(Assets.textures[baseName].image, 0, 0);

		if (color) {
			ctx.globalCompositeOperation = "color";
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 256, 178);

			ctx.globalCompositeOperation = "destination-in";
			ctx.drawImage(Assets.textures[baseName].image, 0, 0);
			ctx.globalCompositeOperation = "source-over";
		}

		if (variant === "1") {
			ctx.drawImage(Assets.images.charmlightUniElem1a, 34, 53);
			ctx.drawImage(Assets.images.charmlightUniElem2a, 172, 36);

		} else if (variant === "2") {
			ctx.drawImage(Assets.images.charmlightUniElem1b, 34, 53);
			ctx.drawImage(Assets.images.charmlightUniElem2b, 172, 36);
		}

		return ctx.canvas;
	}
*/

	function imageDataFromImage(img) {

		var canvas = document.createElement('canvas');

		canvas.width = img.width;
		canvas.height = img.height;

		var ctx = canvas.getContext('2d');

		ctx.drawImage(img, 0, 0);

		return ctx.getImageData(0, 0, img.width, img.height);	
	}


	function getCombinedAlphaTexture(name, nameDiffuse, nameOpacity) {

		// Same effect as if created in Gimp (+save color values from transparent px.)
		// black edges effect: see Shader.combinedMap

		var	textureDiffuse = Assets.textures[ nameDiffuse ],
			textureOpacity = Assets.textures[ nameOpacity ];

		var imageData = imageDataFromImage(textureDiffuse.image);
		var imageDataOpacity = imageDataFromImage(textureOpacity.image);

		for (let i = 0; i < imageData.data.length; i += 4)

			imageData.data[i + 3] = imageDataOpacity.data[i];

		var canvas = document.createElement('canvas');

		canvas.width = imageData.width;
		canvas.height = imageData.height;

		canvas.getContext('2d').putImageData(imageData, 0, 0);

		var texture = new THREE.CanvasTexture(canvas);

		texture.name = name;
		texture.flipY = textureDiffuse.flipY;

		return texture;
	}


	// =============================================================

	//
	// Any display mesh gets material from here.
	//
	function getMaterial(name, isImproved, isStatic, isDepth) {

		console.assert(!name.endsWith("_I") && !name.endsWith("_S") && !name.endsWith("_D"));

		var lookupName = name;

		// material.name - original name w/o suffix.
		if (isImproved)
			lookupName += "_I";
		if (isStatic)
			lookupName += "_S";
		if (isDepth)
			lookupName += "_D";
//console.error(`getMaterial ${name} ${lookupName}`);

		if (materialProps[lookupName])
			return materials[lookupName];

		// No improved material - use non-improved.
		if (isImproved && !isStatic) {

			if (materialProps[name])
				return materials[name];

			Report.throw("no material", `name=${name}`);
		}

		// Material is not configured - create one.
		if (!materialProps[name])
			Report.throw("no base material", `name=${name} lookup=${lookupName}`);

		var sourceLookupName;

		// 3 variants: _S _I _I_S

		if (isImproved) {
			sourceLookupName = materialProps[name + "_I"] ? name + "_I" : name;
		} else
			sourceLookupName = name;

		if (isDepth)
			return getDepthMaterial(lookupName, sourceLookupName, isStatic);


		var material = materials[sourceLookupName].clone();

		if (isStatic) {
			console.assert(!material.userData.isStatic);
			material.userData.isStatic = true;
		}

		AssetsLoader.setupMaterialCallbacks(material,
			materialProps[sourceLookupName].onBeforeCompile);

		materialProps[lookupName] = materialProps[sourceLookupName];
		materialProps[lookupName].AUTO_ADDED = true;
		materials[lookupName] = material;

		return material;
	}



	function getDepthMaterial(name, sourceLookupName, isStatic) {

		console.assert(!materialProps[ name ]);

		var matProps = materialProps[ sourceLookupName ];

		if (matProps.alphaTest > 0 || matProps.wind) {
		} else
			return; // no need to create customDepthMaterial (if still requies: create *_D entry)


		var params = {
			depthPacking: THREE.RGBADepthPacking
		};

		var matProps = materialProps[ sourceLookupName ];
		if (!matProps)
			return Report.warn("no props for source material", `${sourceLookupName}`);


		if (matProps.alphaTest > 0) {

			params.alphaTest = matProps.customDepthAlphaTest || matProps.alphaTest;

			if (matProps.customDepthAlphaMap) {

				params.alphaMap = textures[matProps.customDepthAlphaMap];
				if (!params.alphaMap)
					Report.warn("no texture", `${matProps.customDepthAlphaMap}`);

			} else {

				let sourceMaterial = materials[ sourceLookupName ];

				if (matProps.alphaMap) { // using current best texture
					params.alphaMap = sourceMaterial.alphaMap;

				} else if (matProps.map) {
					params.map = sourceMaterial.map;
					Report.warn("using .map in customDepthMaterial", `${name}`);

				} else
					Report.warn("alphaTest > 0, no appropriate map", `${name}`);
			}
		}

		if (matProps.morphTargets)
			params.morphTargets = true;

		if (matProps.skinning)
			params.skinning = true;

		var customDepthMaterial = new THREE.MeshDepthMaterial(params); // This shader program gets reused.

		if (isStatic) {
			customDepthMaterial.userData.isStatic = true;
			customDepthMaterial.onBeforeCompile = Shader.staticMaterial;
		}

		if (matProps.userData && matProps.userData.wind) {
			customDepthMaterial.userData.wind = true;
			Wind.Area.setupWindMaterial(customDepthMaterial, true);
		}
//console.error(`created customDepthMaterial. ${name} from ${sourceLookupName} a=${params.alphaTest},${matProps.alphaTest}`, customDepthMaterial);


		customDepthMaterial.name = `customDepthMaterial ${name}`;

		materialProps[name] = materialProps[ sourceLookupName ];
		materialProps[name].AUTO_ADDED = true;
		materials[name] = customDepthMaterial;

		return customDepthMaterial;
	}



	return {
		textures, textureProps,// TextureChar, TextureUni,
		materials, materialProps,

		//images,
		dataURIs, animations, geometries,

		models,

		getMaterial,
		getCombinedAlphaTexture,
	};

})();




export { Assets };


