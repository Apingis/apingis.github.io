
var ItemSpecData = {};


ItemSpecData.getAll = function() {

	var f = ItemSpec.flags;


	var data = [

// ============================================================

{ id: 1000, name: "char", entity: "char", flags: f.CIRCULAR,//f.UNIT | f.CHAR, // <-- by spec.name
	canSelect: true,
	radius: 0.63, height: 1.8,
	matWeights: { matNames: [ 'charSkinned'], weights: [ 1000 ] },
	storages: [
		{ storageType: "Equipment" },
		{ storageType: "Inventory", cols: 6, rows: 4 },
		{ storageType: "Inventory", cols: 6, rows: 4 },
	],

},


{ id:1100, name: "robot", entity: "robot", flags: f.CIRCULAR,
	canSelect: true,
	radius: 1.45, height: 2.0,
	matWeights: { matNames: [ 'robotSkinned'], weights: [ 5000 ] },
	storages: [
		{ storageType: "Common" }
	],

	defaultFeatures: [
		{ typeId: 100, value1: 1, value2: -1 },
	],

	features: [
		{ typeId: 100, name: "taskTransportFlag", value1Conf: [
			{ value1: 1, name: "taskTransportFlag", value2any: true }
		] },
	],
},


// ============================================================


{ id:1101, name: "testmetal", flags: f.CIRCULAR,
	get geometry() { return Assets.models.robot.obj.scene.getObjectByName("testmetal").geometry; },
	matName: "robot",
},

{ id:1102, name: "testplane", flags: f.CIRCULAR,
	get geometry() { return Assets.models.robot.obj.scene.getObjectByName("testplane").geometry; },
	matName: "glow",
	polygon: new Polygon([
		-0.02,-1.5, -0.01,-1.51, 0.01,-1.51, 0.02,-1.5,
		0.02,1.5, 0.01,1.51, -0.01,1.51, -0.02,1.5
	], 3.1).mirrorX(),
},

{ id:1103, name: "rope", flags: 0,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("rope").geometry; },
	matName: "baseCenterSkinned",
},

{ id:1104, name: "shadertest", flags: 0,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("shadertest").geometry; },
	matName: "norm_shadertest",
},

{ id:1105, name: "ropeb", flags: 0,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("ropeb").geometry; },
	matName: "ropeb",
},

{ id:1106, name: "wall075b", flags: f.NONE,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("wall075b").geometry; },
	matName: "baseCenterSkinned",
	polygon: new Polygon([
		-0.02,-1.5, -0.01,-1.51, 0.01,-1.51, 0.02,-1.5,
		0.02,1.5, 0.01,1.51, -0.01,1.51, -0.02,1.5
	], 3.1).mirrorX(),
},


// ============================================================


{ id: 850, name: "container", entity: "container", flags: f.COLLIDING,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("container").geometry; },
	matName: "baseCenterSkinned",

	storages: [ // height: relative to startPos.y
		{ storageType: "LogStorage", pileType: "ClosedEnded", twoSides: true,
			height: 0.67, depth: 1, approachMargin: 0.101, // up to 5cm box exterior, +5 spacing

			// from .dae: Y = Z; Z = -Y; absolute endPos
			// .dae (-0.75,-0.5,0) (0.75,-0.5,0)

			startPos: [ -0.75, 0.06, 0.5 ], endPos: [ 0.75, 0.06, 0.5 ],
		},
	],
},
{ id: 851, name: "container1", entity: "container", flags: f.COLLIDING,
	nameKey: "container",
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("container1").geometry; },
	matName: "baseCenterSkinned",
	storages: [ // height: relative to startPos.y
		{ storageType: "LogStorage", pileType: "ClosedEnded", twoSides: true,
			height: 0.67, depth: 1, approachMargin: 0.101, // up to 5cm box exterior, +5 spacing
			startPos: [ -0.75, 0.06, 0.5 ], endPos: [ 0.75, 0.06, 0.5 ],
		},
	],
},
{ id: 852, name: "container2", entity: "container", flags: f.COLLIDING,
	nameKey: "container",
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("container2").geometry; },
	matName: "baseCenterSkinned",
	storages: [ // height: relative to startPos.y
		{ storageType: "LogStorage", pileType: "ClosedEnded", twoSides: true,
			height: 0.67, depth: 1, approachMargin: 0.101, // up to 5cm box exterior, +5 spacing
			startPos: [ -0.75, 0.06, 0.5 ], endPos: [ 0.75, 0.06, 0.5 ],
		},
	],
},
{ id: 853, name: "container3", entity: "container", flags: f.COLLIDING,
	nameKey: "container",
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("container3").geometry; },
	matName: "baseCenterSkinned",
	storages: [ // height: relative to startPos.y
		{ storageType: "LogStorage", pileType: "ClosedEnded", twoSides: true,
			height: 0.67, depth: 1, approachMargin: 0.101, // up to 5cm box exterior, +5 spacing
			startPos: [ -0.75, 0.06, 0.5 ], endPos: [ 0.75, 0.06, 0.5 ],
		},
	],
},



// ============================================================

{ id: 899, name: "constructionSite", entity: "constructionSite", flags: f.COLLIDING,
	canSelect: true,
	hasOnlyNonAggregate: true,
	matWeights: { matNames: [], weights: [] },

	defaultFeatures: [
		{ typeId: 2, value1: 1, value2: 0 }, // constructionUpgradeLevel
		{ typeId: 3, value1: 1, value2: 1 }, // stage=start
	],

	features: [
		{ typeId: 1, name: "constructionSpecId", value1Conf: [
			{ value1: 1, name: "constructionSpecId", value2any: true }
		] },
		{ typeId: 2, name: "constructionUpgradeLevel", value1Conf: [
			{ value1: 1, name: "constructionUpgradeLevel", value2any: true }
		] },
		{ typeId: 3, name: "stage", value1Conf: [
			{ value1: 1, name: "stage", value2any: true }
		] },
	],
},


{ id: 840, name: "chainTest1", entity: "chainTest", flags: f.COLLIDING,
	canSelect: true,
	//matName: "baseCenterSkinned",
	matWeights: { matNames: [ 'fenceSkinned', 'baseCenterSkinned' ], weights: [ 500, 5500 ] },
	get geometry() { return Assets.models.chainTest.obj.scene.getObjectByName("chainTest1").geometry; }, // for cBody
	//get cBody3D() { return Assets.models.chainTest.obj.scene.getObjectByName("chainTest1-cBody3D") },
	//get cBody2D() { return Assets.models.chainTest.obj.scene.getObjectByName("chainTest1-cBody2D") },
	height: 0.1,

	//get freeSpace() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter-freeSpace") },
	//get cSGeometry() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter-cS").geometry },
	//cSCBody2D ? so far unnecessary
	//get cSInternalGeometry() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter").geometry },

	defaultFeatures: [
		//{ typeId: 1, value1: 1, value2: 1 }, // rope
		{ typeId: 2, value1: 1, value2: 1 }, // cw
		{ typeId: 7, value1: 1, value2: -1 }, // animation-down

		// pic1 (1022 el. - 153.3m) z!
		//{ typeId: 3, value1: 1, value2: 6.6 }, { typeId: 4, value1: 1, value2: 9 }, { typeId: 6, value1: 1, value2: 0 }, // x, y, dL

		// demo1
		{ typeId: 3, value1: 1, value2: 6.4 }, { typeId: 4, value1: 1, value2: 9 }, // x, y
			{ typeId: 5, value1: 1, value2: -0.7 }, { typeId: 6, value1: 1, value2: 0.5 }, // z, dL

		// pic2-7-2 (+graph)
		//{ typeId: 3, value1: 1, value2: 3.27 }, { typeId: 4, value1: 1, value2: 9.2 }, { typeId: 6, value1: 1, value2: 0.01 }, // x, y, dL

		// CHAIN only; glitch test
		//{ typeId: 3, value1: 1, value2: 3.967426406871193 * (1 + 1e-15) }, { typeId: 4, value1: 1, value2: 0.36 }, { typeId: 6, value1: 1, value2: 30 },
	],

	features: [
		{ typeId: 1, name: "rope", value1Conf: [
			{ value1: 1, name: "rope", value2any: true }
		] },
		{ typeId: 2, name: "cw", value1Conf: [
			{ value1: 1, name: "cw", value2any: true }
		] },
		{ typeId: 3, name: "x", value1Conf: [
			{ value1: 1, name: "x", value2any: true }
		] },
		{ typeId: 4, name: "y", value1Conf: [
			{ value1: 1, name: "y", value2any: true }
		] },
		{ typeId: 5, name: "z", value1Conf: [
			{ value1: 1, name: "z", value2any: true }
		] },
		{ typeId: 6, name: "dL", value1Conf: [
			{ value1: 1, name: "dL", value2any: true }
		] },
		{ typeId: 7, name: "animDirection", value1Conf: [
			{ value1: 1, name: "animDirection", value2any: true }
		] },
	],
},

{ id: 842, name: "he-show", flags: f.COLLIDING, // for img3-1, TestAreaDisplay_ChainTest_HEShow()
	matName: 'baseCenterSkinned',
	get geometry() { return Assets.models.chainTest.obj.scene.getObjectByName("he-show").geometry; },
},


{ id: 841, name: "chainTest2", entity: "chainTest", flags: f.COLLIDING,
	canSelect: true,
	matWeights: { matNames: [ 'baseCenterSkinned' ], weights: [ 5500 ] },
	get geometry() { return Assets.models.chainTest.obj.scene.getObjectByName("chainTest2").geometry; }, // for cBody
	//get cBody3D() { return Assets.models.chainTest.obj.scene.getObjectByName("chainTest1-cBody3D") },
	//get cBody2D() { return Assets.models.chainTest.obj.scene.getObjectByName("chainTest1-cBody2D") },
	height: 0.1,

	//get freeSpace() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter-freeSpace") },
	//get cSGeometry() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter-cS").geometry },
	//cSCBody2D ? so far unnecessary
	//get cSInternalGeometry() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter").geometry },

	P2Box: new THREE.Box3(
		new THREE.Vector3().set(-10, 0.2, -3),
		new THREE.Vector3().set(10, 20, 3)
	),

	defaultFeatures: [
		//{ typeId: 1, value1: 1, value2: 1 }, // rope
		{ typeId: 2, value1: 1, value2: 1 }, // cw
		{ typeId: 7, value1: 1, value2: 1 }, // animation-up

		// Plane
		//{ typeId: 4, value1: 1, value2: 1.8 }, { typeId: 5, value1: 1, value2: 1.44 }, { typeId: 6, value1: 1, value2: 0 }, // y z dL

		// img5_1
		//{ typeId: 3, value1: 1, value2: 6.6 }, { typeId: 4, value1: 1, value2: 10 }, // x y
		//	{ typeId: 5, value1: 1, value2: 0.05 }, { typeId: 6, value1: 1, value2: 0 }, // z dL

		// demo
		{ typeId: 3, value1: 1, value2: 2.8 }, { typeId: 4, value1: 1, value2: 1.05 }, // x y
			{ typeId: 5, value1: 1, value2: 0.4 }, { typeId: 6, value1: 1, value2: 0 }, // z dL
	],

	features: [
		{ typeId: 1, name: "rope", value1Conf: [
			{ value1: 1, name: "rope", value2any: true }
		] },
		{ typeId: 2, name: "cw", value1Conf: [
			{ value1: 1, name: "cw", value2any: true }
		] },
		{ typeId: 3, name: "x", value1Conf: [
			{ value1: 1, name: "x", value2any: true }
		] },
		{ typeId: 4, name: "y", value1Conf: [
			{ value1: 1, name: "y", value2any: true }
		] },
		{ typeId: 5, name: "z", value1Conf: [
			{ value1: 1, name: "z", value2any: true }
		] },
		{ typeId: 6, name: "dL", value1Conf: [
			{ value1: 1, name: "dL", value2any: true }
		] },
		{ typeId: 7, name: "animDirection", value1Conf: [
			{ value1: 1, name: "animDirection", value2any: true }
		] },
	],
},


{ id: 830, name: "robocenter", entity: "robocenter", flags: f.COLLIDING,
	canSelect: true,
	matName: "baseCenterSkinned",
	matWeights: { matNames: [ 'baseCenterSkinned'], weights: [ 5500 ] },
	//hasNonMergeableGeometry: true,
	get cBody3D() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter-cBody3D") },
	get cBody2D() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter-cBody2D") },
	height: 6.55,

	get freeSpace() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter-freeSpace") },
	get cSGeometry() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter-cS").geometry },
	//cSCBody2D ? so far unnecessary
	get cSInternalGeometry() { return Assets.models.robocenter.obj.scene.getObjectByName("robocenter").geometry },
},


{ id: 832, name: "bigBox", flags: f.COLLIDING,
	get geometry() { return Assets.models.robocenter.obj.scene.getObjectByName("bigBox").geometry; },
	matName: "baseCenterSkinned",
},


{ id: 800, name: "baseCenter", entity: "baseCenter", flags: f.COLLIDING,
	canSelect: true,
	//get displayRectGeometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("baseCenter").geometry; },
	// displayRectGeometry + _createCBody / basePolygon (no cBody2D)
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("baseCenter").geometry; },
	//hasNonMergeableGeometry: true,
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.baseCenter.obj.scene.getObjectByName("baseCenter-cBody3D") },
	//matName: "baseCenterSkinned", // set in BaseCenterDisplay
	//nameKey: "baseCenter", // if not set - equals to name

	get freeSpace() { return Assets.models.baseCenter.obj.scene.getObjectByName("baseCenter-freeSpace") },

	storages: [
		{ storageType: "Inventory", cols: 11, rows: 4 },
		{ storageType: "Shop", tabs: [
			{ name: "axes1", n: 5 }, // .x=0 (x: tabNum)
			{ name: "axes2", n: 5 }, // .x=1
			{ name: "axes3", n: 5 }, // .x=2
		] },
	],

	shopUpdateInterval: 15 * 60,

	defaultFeatures: [
		{ typeId: 99, value1: 1, value2: 0 }, // shopUpdateLastT
		{ typeId: 98, value1: 1, value2: 0 }, // shopLastLevel
		{ typeId: 97, value1: 1, value2: 0 }, // shopRandom
	],

	features: [

		{ typeId: 99, name: "shopUpdateLastT", value1Conf: [
			{ value1: 1, name: "shopUpdateLastT", value2any: true }
		] },
		{ typeId: 98, name: "shopLastLevel", value1Conf: [
			{ value1: 1, name: "shopLastLevel", value2any: true }
		] },
		{ typeId: 97, name: "shopRandom", value1Conf: [
			{ value1: 1, name: "shopRandom", value2any: true }
		] },
	],
		
},



{ id: 810, name: "woodIntake1", entity: "woodIntake", flags: f.COLLIDING,
	canSelect: true,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake1").geometry; },
//	hasNonMergeableGeometry: true,
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake1-cBody3D") },

	get freeSpace() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake1-freeSpace") },
	get cSGeometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake1-cS").geometry },
	get cSInternalGeometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake1").geometry },

	disassemblyTime: 1, // mins.
	disassemblyReward: { type: "coins", amount: 5 },

	containerPlacements: [
		{ position: new THREE.Vector3(0, 0.1, 2.66), endPos: new THREE.Vector3(0, 0.1, 0.9), facing: 0 },
	],

	features: [
		{ typeId: 1, name: "cPAllowLogBits", value1Conf: [
			{ value1: 1, name: "cPAllowLogBits", value2any: true }
		] },
	],
},


{ id: 812, name: "woodIntake2", entity: "woodIntake", flags: f.COLLIDING,
	canSelect: true,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake2").geometry; },
//	hasNonMergeableGeometry: true,
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake2-cBody3D") },
	get cBody2D() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake2-cBody2D") },
	height: 5.34,

	get freeSpace() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake2-freeSpace") },
	get cSGeometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake2-cS").geometry },
	get cSInternalGeometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("woodIntake2").geometry },

	disassemblyTime: 3, // mins.
	disassemblyReward: { type: "coins", amount: 20 },

	containerPlacements: [

		{ position: new THREE.Vector3(-3.2, 0.1, 1.83), endPos: new THREE.Vector3(-3.2, 0.1, -0.96), facing: Math.PI/2 },
		{ position: new THREE.Vector3(-2.01, 0.1, 1.83), endPos: new THREE.Vector3(-2.01, 0.1, -0.96), facing: Math.PI/2 },

		{ position: new THREE.Vector3(2.21, 0.1, 1.83), endPos: new THREE.Vector3(2.21, 0.1, -0.96), facing: Math.PI/2 },
		{ position: new THREE.Vector3(3.4, 0.1, 1.83), endPos: new THREE.Vector3(3.4, 0.1, -0.96), facing: Math.PI/2 },
	],

	features: [
		{ typeId: 1, name: "cPAllowLogBits", value1Conf: [
			{ value1: 1, name: "cPAllowLogBits", value2any: true }
		] },
	],
},


{ id: 820, name: "tower", entity: "tower", flags: f.COLLIDING,
	type: 'tower',
	canSelect: true,
	hasNonMergeableGeometry: true,
	get displayRectGeometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("tower").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.baseCenter.obj.scene.getObjectByName("tower-cBody3D") },
	get cBody2D() { return Assets.models.baseCenter.obj.scene.getObjectByName("tower-cBody2D") },
	height: 5.64,

	// no freeSpace - creates from cSGeometry (selection doesn't look good)
	get freeSpace() { return Assets.models.baseCenter.obj.scene.getObjectByName("tower-freeSpace") },

	// upgradeLevel dependent (separate fn's).
	//get cSGeometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("tower-cS").geometry },
	//get cSInternalGeometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("tower").geometry },

	limitPerArea: 1,

	defaultFeatures: [
		{ typeId: 1, value1: 1, value2: 1 }, // level: 1
		{ typeId: 10, value1: 1, value2: 1 }, // setting: 1x
	],

	features: [
		{ typeId: 1, name: "upgradeLevel", value1Conf: [
			{ value1: 1, name: "upgradeLevel", value2any: true }
		] },
		{ typeId: 2, name: "upgradeStartT", value1Conf: [
			{ value1: 1, name: "upgradeLevel", value2any: true }
		] },
		{ typeId: 10, name: "setting", value1Conf: [
			{ value1: 1, name: "setting", value2any: true }
		] },
	],
},




{ id: 890, name: "column1", flags: f.COLLIDING,
	nameKey: "column",
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("column1").geometry; },
	matName: "baseCenterSkinned",
},
{ id: 891, name: "column2", flags: f.COLLIDING,
	nameKey: "column",
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("column2").geometry; },
	matName: "baseCenterSkinned",
},

{ id: 880, name: "fence3", flags: f.COLLIDING | f.RAYTRANSPARENT,
	nameKey: "fence",
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("fence3").geometry; },
	matName: "fenceSkinned",
	polygon: new Polygon([
		-0.02,-1.5, -0.01,-1.51, 0.01,-1.51, 0.02,-1.5,
		0.02,1.5, 0.01,1.51, -0.01,1.51, -0.02,1.5
	], 3.1).mirrorX(),
},
{ id: 881, name: "fence3x2", flags: f.COLLIDING | f.RAYTRANSPARENT,
	nameKey: "fence",
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("fence3x2").geometry; },
	matName: "fenceSkinned",
	polygon: new Polygon([
		-0.02,-3, -0.01,-3.01, 0.01,-3.01, 0.02,-3,
		0.02,3, 0.01,3.01, -0.01,3.01, -0.02,3
	], 3.1).mirrorX(),
},

{ id: 870, name: "sign-exclamation", flags: f.NOHIGHLIGHT,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("sign-exclamation").geometry; },
	matName: "baseCenterSkinned",
},
{ id: 871, name: "sign-lightning", flags: f.NOHIGHLIGHT,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("sign-lightning").geometry; },
	matName: "baseCenterSkinned",
},



/*
{ id: , name: "sign-planet", flags: f.COLLIDING,
	get geometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("sign-planet").geometry; },
	matName: "baseCenterSkinned",
	nameKey: "sign-planet",
	descrKey: "sign-planet-descr",
},
*/

/*
{ id: 807, name: "dish1", flags: f.STATIC,
	geometry: Assets.models.baseCenter.obj.scene.getObjectByName("dish1").geometry,
	matName: "baseCenterSkinned",
},
*/

// ===================================================================
//
// 5xxx - mountains5
//
// ===================================================================


{ id: 5202, name: "mntn2-cliff2", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("cliff2").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("cliff2-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("cliff2-cBody2D") },
	height: 9.01,
	matName: "rock_04",
},
{ id: 5203, name: "mntn2-cliff3", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("cliff3").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("cliff3-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("cliff3-cBody2D") },
	height: 8.87,
	matName: "rock_06",
},
{ id: 5204, name: "mntn2-cliff4", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("cliff4").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("cliff4-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("cliff4-cBody2D") },
	height: 8.81,
	matName: "rock_06",
},


{ id: 5205, name: "mntn2-c20", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("c20a").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("c20a-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("c20a-cBody2D") },
	height: 16.72,
	matName: "rock_04",
},
{ id: 5206, name: "mntn2-c20-6", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("c20a").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("c20a-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("c20a-cBody2D") },
	height: 16.72,
	matName: "rock_06",
},
{ id: 5207, name: "mntn2-c20-concave", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("c20a-concave").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("c20a-concave-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("c20a-concave-cBody2D") },
	height: 18,
	matName: "rock_04",
},

{ id: 5208, name: "mntn2-e25", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("e25").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("e25-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("e25-cBody2D") },
	height: 16.60,
	matName: "rock_04",
},
{ id: 5209, name: "mntn2-e25-6", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("e25").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("e25-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("e25-cBody2D") },
	height: 16.60,
	matName: "rock_06",
},


{ id: 5220, name: "mntn2-concave4", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("concave4").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("concave4-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("concave4-cBody2D") },
	height: 12.76,
	matName: "rock_04",
},
{ id: 5221, name: "mntn2-concave5", flags: f.COLLIDING | f.NOHIGHLIGHT,
	nameKey: "mountain",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("concave5").geometry },
	get cBody3D() { return Assets.models.mntn2.obj.scene.getObjectByName("concave5-hull") },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("concave5-cBody2D") },
	height: 17.88,
	matName: "rock_04",
},




// ============================================================

{ id: 5251, name: "hole-c2", flags: f.COLLIDING,
	nameKey: "hole",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("hole-c2").geometry; },
	isHole: true,
	matName: "ground051",
},
{ id: 5252, name: "hole-e11", flags: f.COLLIDING,
	nameKey: "bigHole",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("hole-e11").geometry; },
	isHole: true,
	matName: "ground051",
},
{ id: 5253, name: "hole-e16", flags: f.COLLIDING,
	nameKey: "bigHole",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("hole-e16").geometry; },
	isHole: true,
	matName: "ground051",
},


{ id: 5261, name: "hole-l5", flags: f.COLLIDING,
	nameKey: "hole",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("hole-l5").geometry; },
	isHole: true,
	matName: "ground051",
},
{ id: 5262, name: "hole-l15", flags: f.COLLIDING,
	nameKey: "hole",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("hole-l15").geometry; },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("hole-l15-2d") },
	height: 0.001,
	isHole: true,
	matName: "ground051",
},
{ id: 5263, name: "hole-concave1", flags: f.COLLIDING,
	nameKey: "bigHole",
	get geometry() { return Assets.models.mntn2.obj.scene.getObjectByName("hole-concave1").geometry; },
	get cBody2D() { return Assets.models.mntn2.obj.scene.getObjectByName("hole-concave1-cBody2D") },
	height: 0.001, // required for cBody2D, can't be 0 (TODO)
	isHole: true,
	matName: "ground051",
},




// ============================================================


// Object.values(ItemSpec.byName).filter(iS=>iS.tree).forEach(iS=>console.log(iS.name,iS.tree.cuts[0].dPoints))

// "b": bronze
{ id: 112, name: "axeCustom1b", entity: "axeCustom", flags: f.INV,

	inv: { size: 42, slot: "weapon" },
	get scene() { return Assets.models.axeCustom1.obj.scene },
	get cBody2D() { return this.scene.getObjectByName("cBody2D") },
	height: 0.08,
	matName: "charSkinned",

	cost: 10,
	hitStrength: 10,

	defaultFeatures: [
		{ typeId: 1, value1: 1 }, // blade
		{ typeId: 2, value1: 1 }, // handleShape
		{ typeId: 3, value1: 4 }, // handleMat
	],

	features: [

		{ typeId: 1, name: "blade", value1Conf: [

			{ value1: 1, name: "axeSmallBronze", nameKey: "axe_small_bronze",
				affects: [
					{ affects: "hitStrength", acts: "add", value: -4 }, // hitStr=6
					{ affects: "cost", acts: "mult", value: 0.395 },
				],
			},
			{ value1: 2, name: "axeSmallBronze2", nameKey: "axe_small_bronze",
				affects: [
					{ affects: "hitStrength", acts: "add", value: -4 },
					{ affects: "cost", acts: "mult", value: 0.395 },
				],
			},
			{ value1: 3, name: "axeSimpleBronze", nameKey: "axe_simple_bronze",
				affects: [
					{ affects: "hitStrength", acts: "add", value: -3 }, // hitStr=7
					{ affects: "cost", acts: "mult", value: 0.62 },
				],
			},
			{ value1: 4, name: "axeSimpleBronze2", nameKey: "axe_simple_bronze",
				affects: [
					{ affects: "hitStrength", acts: "add", value: -3 },
					{ affects: "cost", acts: "mult", value: 0.62 },
				],
			},
		] },

		{ typeId: 2, name: "handleShape", value1Conf: [

			{ value1: 1, name: "handle1", handleWrap: "handle1-wrap",
			},
			{ value1: 2, name: "handle1h", handleWrap: "handle1-wrap",
				affects: [
					{ affects: "cost", acts: "mult", value: 1.2 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 15, 36 ],
					expIncreaseAfter: 28, expBase: 4, expFactor: 1/3 },
			},
			{ value1: 3, name: "handle2", handleWrap: "handle2-wrap",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 2 },
					{ affects: "cost", acts: "mult", value: 2.0 },
				],
			},
			{ value1: 4, name: "handle2h", handleWrap: "handle2-wrap",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 2 },
					{ affects: "cost", acts: "mult", value: 2.6 },
					{ affects: "cost", acts: "ceilMultipleOf", value: 2.50 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 30, 50 ],
					expIncreaseAfter: 36, expBase: 3, expFactor: 1/3 },
			},
		] },

		{ typeId: 3, name: "handleMat", value1Conf: [ // ordered as in image file (by offU ascending)

			{ value1: 4, name: "light", offU: 3,
			},
			{ value1: 5, name: "dark", offU: 4,
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 1.5 },
				],
			},
			{ value1: 6, name: "paintedBlack", offU: 5, nameKey: "handle_paintedBlack",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 2 },
					{ affects: "cost", acts: "mult", value: 2.1 },
				],
			},
			{ value1: 7, name: "paintedRed", offU: 6, nameKey: "handle_paintedRed",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 2.25 },
				],
				value2: { affects: "hitRate", acts: "add", range: [ 13, 24 ],
					expIncreaseAfter: 18 },//, expBase: 1, expFactor: 1/2 },
			},
			{ value1: 8, name: "paintedBrown", offU: 7, nameKey: "handle_paintedBrown",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 1.73 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 23, 40 ],
					expIncreaseAfter: 30, expBase: 3, expFactor: 1/3 },
			},
		] },

		{ typeId: 4, name: "handleWrap", value1Conf: [ // ordered as in image file (by offU ascending)

			{ value1: 4, name: "black", offU: 3, nameKey: "wrap_black",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "postAdd", value: 2 },
					{ affects: "cost", acts: "mult", value: 1.3 },
				],
			},
			{ value1: 10, name: "whiteStripe", offU: 9,
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 3 },
					{ affects: "costCrystals", acts: "add", value: 10 }
				],
			},
			{ value1: 11, name: "plain", offU: 10,
				affects: [
					{ affects: "cost", acts: "mult", value: 1.14 }
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 12, 21 ],
					expIncreaseAfter: 15, expFactor: 0.3 },
			},
			{ value1: 12, name: "cherryStripe", offU: 11, nameKey: "wrap_cherry",
				affects: [
					{ affects: "cost", acts: "mult", value: 1.27 }
				],
				value2: { affects: "hitRate", acts: "add", range: [ 8, 15 ],
					expIncreaseAfter: 10, expFactor: 0.4 },
			},
		] },

	],

},



{ id: 113, name: "axeCustom1i", entity: "axeCustom", flags: f.INV,

	inv: { size: 42, slot: "weapon" },
	get scene() { return Assets.models.axeCustom1.obj.scene },
	get cBody2D() { return this.scene.getObjectByName("cBody2D") },
	height: 0.08,
	matName: "charSkinned",

	cost: 10,
	hitStrength: 10,

	defaultFeatures: [
		{ typeId: 1, value1: 5 }, // blade
		{ typeId: 2, value1: 1 }, // handleShape
		{ typeId: 3, value1: 4 }, // handleMat
	],

	features: [

		{ typeId: 1, name: "blade", value1Conf: [

			{ value1: 5, name: "axeSmall", nameKey: "axe_small", // hitStr=10
				affects: [
					{ affects: "cost", acts: "mult", value: 2.0 } // cost=20
				],
			},
			{ value1: 6, name: "axeSimple", nameKey: "axe_simple",
				affects: [
					{ affects: "hitStrength", acts: "add", value: 3 }, // hitStr=13
					{ affects: "cost", acts: "mult", value: 4.0 }, // cost=40
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ -11, -4 ],
					expIncreaseAfter: -10, expFactor: 0.4 },
			},
		] },

		{ typeId: 2, name: "handleShape", value1Conf: [

			{ value1: 1, name: "handle1", handleWrap: "handle1-wrap",
			},
			{ value1: 2, name: "handle1h", handleWrap: "handle1-wrap",
				affects: [
					{ affects: "cost", acts: "mult", value: 1.2 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 15, 36 ],
					expIncreaseAfter: 28, expBase: 4, expFactor: 1/3 },
			},
			{ value1: 3, name: "handle2", handleWrap: "handle2-wrap",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 2 },
					{ affects: "cost", acts: "mult", value: 1.59 },
				],
			},
			{ value1: 4, name: "handle2h", handleWrap: "handle2-wrap",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 2 },
					{ affects: "cost", acts: "mult", value: 2.07 },
					{ affects: "cost", acts: "ceilMultipleOf", value: 5 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 30, 50 ],
					expIncreaseAfter: 36, expBase: 3, expFactor: 1/3 },
			},
		] },

		{ typeId: 3, name: "handleMat", value1Conf: [ // ordered as in image file (by offU ascending)

			{ value1: 4, name: "light", offU: 3,
			},
			{ value1: 5, name: "dark", offU: 4,
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 1.3 },
				],
			},
			{ value1: 6, name: "paintedBlack", offU: 5, nameKey: "handle_paintedBlack",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 3 },
					{ affects: "cost", acts: "mult", value: 2.1 },
				],
			},
			{ value1: 7, name: "paintedRed", offU: 6, nameKey: "handle_paintedRed",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 2.0 },
				],
				value2: { affects: "hitRate", acts: "add", range: [ 13, 24 ],
					expIncreaseAfter: 18 },//, expBase: 1, expFactor: 1/2 },
			},
			{ value1: 8, name: "paintedBrown", offU: 7, nameKey: "handle_paintedBrown",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 1.56 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 23, 40 ],
					expIncreaseAfter: 30, expBase: 3, expFactor: 1/3 },
			},
		] },

		{ typeId: 4, name: "handleWrap", value1Conf: [ // ordered as in image file (by offU ascending)

			{ value1: 3, name: "green", offU: 2, nameKey: "wrap_green",
				affects: [
					{ affects: "addHitStrengthVsTree", acts: "postAdd", value: 2 },
					{ affects: "cost", acts: "mult", value: 1.42 },
				],
			},
			{ value1: 4, name: "black", offU: 3, nameKey: "wrap_black",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "postAdd", value: 4 },
					{ affects: "cost", acts: "mult", value: 1.16 },
				],
			},
			{ value1: 5, name: "indigo", offU: 4, nameKey: "wrap_indigo",
				affects: [
					{ affects: "hitRate", acts: "add", value: 12 },
					{ affects: "equipSpeed", acts: "mult", value: 1.2 },
					{ affects: "equipSpeed", acts: "postAddIfNonZero", value: 6 },
					{ affects: "cost", acts: "mult", value: 2 },
				],
				value2: { affects: "hitRate", acts: "mult", range: [ 1.133, 1.3 ] },
			},
/*
			{ value1: 10, name: "whiteStripe", offU: 9,
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 2 },
					{ affects: "costCrystals", acts: "add", value: 10 }
				],
			},
*/
			{ value1: 11, name: "plain", offU: 10,
				affects: [
					{ affects: "cost", acts: "mult", value: 1.14 }
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 12, 21 ],
					expIncreaseAfter: 15, expFactor: 0.3 },
			},
			{ value1: 12, name: "cherryStripe", offU: 11, nameKey: "wrap_cherry",
				affects: [
					{ affects: "cost", acts: "mult", value: 1.27 }
				],
				value2: { affects: "hitRate", acts: "add", range: [ 8, 15 ],
					expIncreaseAfter: 10, expFactor: 0.4 },
			},
		] },

	],

},




{ id: 114, name: "axeCustom1c", entity: "axeCustom", flags: f.INV,

	inv: { size: 42, slot: "weapon" },
	get scene() { return Assets.models.axeCustom1.obj.scene },
	get cBody2D() { return this.scene.getObjectByName("cBody2D") },
	height: 0.08,
	matName: "charSkinned",

	cost: 10,
	hitStrength: 10,

	defaultFeatures: [
		{ typeId: 1, value1: 7 }, // blade
		{ typeId: 2, value1: 1 }, // handleShape
		{ typeId: 3, value1: 4 }, // handleMat
	],

	features: [

		{ typeId: 1, name: "blade", value1Conf: [

			{ value1: 7, name: "axeW001", nameKey: "axe_W001",
				affects: [
					{ affects: "hitStrength", acts: "add", value: 5 },
					{ affects: "hitStrength", acts: "postAdd", value: 1 }, // hitStr=16
					{ affects: "cost", acts: "mult", value: 10 } // cost=100
				],
			},
			{ value1: 8, name: "axeHatchet", nameKey: "axe_hatchet",
				affects: [
					{ affects: "hitStrength", acts: "add", value: 10 }, // hitStr=20
					{ affects: "cost", acts: "mult", value: 20 } // cost=200
				],
			},
			{ value1: 9, name: "axeW002", nameKey: "axe_W002",
				costCategory: "high",
				affects: [
					{ affects: "hitStrength", acts: "add", value: 15 }, // hitStr=25
					{ affects: "cost", acts: "mult", value: 38 },
					{ affects: "cost", acts: "postAdd", value: 20 } // cost(basic)=380+20
				],
			},
		] },

		{ typeId: 2, name: "handleShape", value1Conf: [

			{ value1: 1, name: "handle1", handleWrap: "handle1-wrap",
			},
			{ value1: 2, name: "handle1h", handleWrap: "handle1-wrap",
				appearWeight: 0.6,
				affects: [
					{ affects: "cost", acts: "mult", value: 1.2 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 15, 36 ],
					expIncreaseAfter: 28, expBase: 4, expFactor: 1/3 },
			},
			{ value1: 3, name: "handle2", handleWrap: "handle2-wrap",
				incompat: [ "wood-plastic" ],
				affects: [
					{ affects: "hitStrength", acts: "mult", value: 1.16 }, // +2, +3, +4
					{ affects: "cost", acts: "mult", value: 1.41 },
				],
			},
			{ value1: 4, name: "handle2h", handleWrap: "handle2-wrap",
				appearWeight: 0.5,
				incompat: [ "wood-plastic" ],
				affects: [
					{ affects: "hitStrength", acts: "mult", value: 1.16 },
					{ affects: "cost", acts: "mult", value: 1.84 },
					{ affects: "cost", acts: "ceilMultipleOf", value: 10 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 30, 50 ],
					expIncreaseAfter: 36, expBase: 3, expFactor: 1/3 },
			},
			{ value1: 5, name: "handle3", handleWrap: "handle3-wrap",
				appearWeight: 1.3,
				costCategory: "high",
				affects: [
					{ affects: "hitStrength", acts: "mult", value: 1.47 }, // +7, +9, +11
					{ affects: "hitRate", acts: "mult", value: 1.15 },
					{ affects: "hitRate", acts: "postAddIfNonZero", value: 6 },
					{ affects: "equipSpeed", acts: "mult", value: 1.15 },
					{ affects: "equipSpeed", acts: "postAddIfNonZero", value: 6 },
					{ affects: "cost", acts: "mult", value: 3 },
				],
			},
		] },

		{ typeId: 3, name: "handleMat", value1Conf: [ // ordered as in image file (by offU ascending)

			{ value1: 1, name: "plasticGreen", offU: 0, nameKey: "handle_plastic", nameKeyHandle3: "handle_plastic_ergonomic",
				incompat: [ "green", "plain", "wood-plastic" ],
				appearWeight: 1.75,
				affects: [
					{ affects: "addHitStrengthVsTree", acts: "postAdd", value: 5 },
					{ affects: "cost", acts: "mult", value: 1.8 },
					{ affects: "cost", acts: "postAdd", value: 12 },
				],
			},
			{ value1: 2, name: "plasticWhite", offU: 1, nameKey: "handle_plastic", nameKeyHandle3: "handle_plastic_ergonomic",
				incompat: [ "wood-plastic" ],
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 10 },
					{ affects: "costCrystals", acts: "add", value: 100 }
				],
				value2: { affects: "hitRate", acts: "add", range: [ 22, 24 ] },
			},
			{ value1: 4, name: "light", offU: 3, nameKeyHandle3: "handle_wood_ergonomic",
				appearWeight: 1.5,
			},
			{ value1: 5, name: "dark", offU: 4, nameKeyHandle3: "handle_wood_ergonomic",
				incompat: [ "plain" ],
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 1.12 },
					{ affects: "cost", acts: "postAdd", value: 10 },
				],
			},
			{ value1: 6, name: "paintedBlack", offU: 5, nameKey: "handle_paintedBlack", nameKeyHandle3: "handle_paintedBlack_ergonomic",
				affects: [
					{ affects: "hitStrength", acts: "mult", value: 1.267 }, // +4, +5, +6
					{ affects: "cost", acts: "mult", value: 2.1 },
				],
			},
			{ value1: 7, name: "paintedRed", offU: 6, nameKey: "handle_paintedRed", nameKeyHandle3: "handle_paintedRed_ergonomic",
				incompat: [ "red" ],
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 1.68 },
					{ affects: "cost", acts: "postAdd", value: 15 },
				],
				value2: { affects: "hitRate", acts: "add", range: [ 13, 24 ],
					expIncreaseAfter: 18 },//, expBase: 1, expFactor: 1/2 },
			},
			{ value1: 8, name: "paintedBrown", offU: 7, nameKey: "handle_paintedBrown", nameKeyHandle3: "handle_paintedBrown_ergonomic",
				incompat: [ "brown", "red" ],
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 1.31 },
					{ affects: "cost", acts: "postAdd", value: 12 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 23, 40 ],
					expIncreaseAfter: 30, expBase: 3, expFactor: 1/3 },
			},
			{ value1: 9, name: "plasticBlue", offU: 8, nameKey: "handle_plastic", nameKeyHandle3: "handle_plastic_ergonomic",
				costCategory: "high",
				incompat: [ "blue", "plain", "wood-plastic" ],
				affects: [
					{ affects: "cost", acts: "mult", value: 4 },
					{ affects: "cost", acts: "ceilMultipleOf", value: 100 },
				],
				value2: { affects: "hitRate", acts: "add", range: [ 38, 50 ],
					expIncreaseAfter: 42, expFactor: 0.4 },
			},
			{ value1: 10, name: "plasticRed", offU: 9, nameKey: "handle_plastic", nameKeyHandle3: "handle_plastic_ergonomic",
				incompat: [ "red", "wood-plastic" ],
				affects: [
					{ affects: "cost", acts: "mult", value: 2.1 },
					{ affects: "cost", acts: "ceilMultipleOf", value: 50 },
				],
				value2: { affects: "hitRate", acts: "add", range: [ 23, 35 ],
					expIncreaseAfter: 26, expFactor: 0.4 },
			},

		] },

		{ typeId: 4, name: "handleWrap", value1Conf: [ // ordered as in image file (by offU ascending)

			{ value1: 1, name: "blue2", offU: 0, nameKey: "wrap_blue2",
				costCategory: "high",
				incompat: [ "blue", "green" ],
				affects: [
					{ affects: "cost", acts: "mult", value: 2.5 },
					{ affects: "cost", acts: "ceilMultipleOf", value: 50 },
				],
				value2: { affects: "hitRate", acts: "add", range: [ 27, 37 ],
					expIncreaseAfter: 31 },
			},
			{ value1: 2, name: "white2", offU: 1,
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 7 },
					{ affects: "costCrystals", acts: "add", value: 30 }
				],
			},
			{ value1: 3, name: "green", offU: 2, nameKey: "wrap_green",
				incompat: [ "green" ],
				affects: [
					{ affects: "addHitStrengthVsTree", acts: "postAdd", value: 2 },
					{ affects: "cost", acts: "mult", value: 1.25 },
					{ affects: "cost", acts: "postAdd", value: 8 },
				],
			},
			{ value1: 4, name: "black", offU: 3, nameKey: "wrap_black",
				affects: [
					{ affects: "hitStrength", acts: "postAdd", value: 1 },
					{ affects: "cost", acts: "mult", value: 1.09 },
					{ affects: "cost", acts: "postAdd", value: 10 },
				],
			},
			{ value1: 5, name: "indigo", offU: 4, nameKey: "wrap_indigo",
				costCategory: "high",
				affects: [
					{ affects: "hitRate", acts: "add", value: 12 },
					{ affects: "equipSpeed", acts: "mult", value: 1.2 },
					{ affects: "equipSpeed", acts: "postAddIfNonZero", value: 6 },
					{ affects: "cost", acts: "mult", value: 2 },
				],
				value2: { affects: "hitRate", acts: "mult", range: [ 1.133, 1.3 ] },
			},
			{ value1: 6, name: "red2", offU: 5, nameKey: "wrap_red2",
				incompat: [ "red" ],
				affects: [
					{ affects: "cost", acts: "mult", value: 1.72 },
				],
				value2: { affects: "hitRate", acts: "add", range: [ 16, 24 ],
					expIncreaseAfter: 19 },
			},
			{ value1: 7, name: "brown2", offU: 6, nameKey: "wrap_brown2",
				incompat: [ "brown" ],
				affects: [
					{ affects: "hitStrength", acts: "mult", value: 1.2 }, // +3, +4, +5
					{ affects: "cost", acts: "mult", value: 1.69 },
				],
			},
			{ value1: 8, name: "lawngreen2", offU: 7, nameKey: "wrap_lawngreen2",
				incompat: [ "green" ],
				affects: [
					{ affects: "addHitStrengthVsTree", acts: "postAdd", value: 4 },
					{ affects: "cost", acts: "mult", value: 1.95 },
					{ affects: "cost", acts: "postAdd", value: 10 },
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 20, 30 ],
					expIncreaseAfter: 25, expFactor: 0.4 },
			},
			{ value1: 11, name: "plain", offU: 10,
				incompat: [ "plain" ],
				affects: [
					{ affects: "cost", acts: "mult", value: 1.14 }
				],
				value2: { affects: "equipSpeed", acts: "add", range: [ 12, 21 ],
					expIncreaseAfter: 15, expFactor: 0.3 },
			},
			{ value1: 12, name: "cherryStripe", offU: 11, nameKey: "wrap_cherry",
				affects: [
					{ affects: "cost", acts: "mult", value: 1.27 }
				],
				value2: { affects: "hitRate", acts: "add", range: [ 8, 15 ],
					expIncreaseAfter: 10, expFactor: 0.4 },
			},
		] },

	],

},




// ===================================================================
//
// Item ID 100000..100999
// 101xxx: aspen1*
//
// ===================================================================

{ id: 110100, name: "aspen1h1", flags: f.TREE,
	radius: 0.1, height: 0.8,
	displayBox: [ 2, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",
		stumpIsColliding: false,
	}
},

{ id: 110200, name: "aspen1h2", flags: f.TREE,
	radius: 0.1, height: 1.5,
	displayBox: [ 4, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",
		stumpIsColliding: false,
	}
},

{ id: 110300, name: "aspen1h3", flags: f.TREE,
	radius: 0.1, height: 2.2,
	displayBox: [ 5, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	get cBody3D() { return Assets.models.aspen.obj.scene.getObjectByName("1h3-cBody3D") },
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 5, name: "b31-t" },
			{ posId: 6, name: "b31-t" },
		],
	}
},

{ id: 110400, name: "aspen1h4", flags: f.TREE,
	radius: 0.1, height: 2.6,
	displayBox: [ 6, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 5, name: "b31-1" },
			{ posId: 6, name: "b31-1" },
			{ posId: 7, name: "b31-1" },

			{ posId: 8, name: "b52-t" },
			{ posId: 9, name: "b52-t" }, // *camera 3m
		],
	}
},

{ id: 110500, name: "aspen1h5", flags: f.TREE,
	radius: 0.1, height: 3.2,
	displayBox: [ 6, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 5, name: "b2-41-d1" },
			//{ posId: 6, name: "b31-d1" },
			{ posId: 6, name: "b2-41-d1" },
			{ posId: 7, name: "b31-2" },

			{ posId: 8, name: "b52-1" },
			{ posId: 9, name: "b52-1" }, // *camera 3m (3.0)
			{ posId: 10, name: "b52-1" },

			{ posId: 11, name: "b71-t" },
			{ posId: 12, name: "b72-t" },
			{ posId: 13, name: "b72-t" },
		],
	}
},

{ id: 110600, name: "aspen1h6", flags: f.TREE,
	radius: 0.1, height: 4,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 5, name: "b31-d4" },
			//{ posId: 6, name: "b31-d1" },
			{ posId: 6, name: "b2-41-d1" },
			{ posId: 7, name: "b31-d2" },

			{ posId: 8, name: "b52-l" },
			{ posId: 9, name: "b52-l" }, // *camera 3m (3.0)
			{ posId: 10, name: "b52-l" },

			{ posId: 11, name: "b71-1" },
			{ posId: 12, name: "b72-1" },
			{ posId: 13, name: "b72-1" },

			{ posId: 14, name: "b72-t" },
			{ posId: 15, name: "b71-t" },
			{ posId: 16, name: "b72-t" },
		],
	}
},

{ id: 110700, name: "aspen1h7", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		//name: "aspen1h7",
		//treeName: "aspen",
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		//obj: Assets.models.aspen.obj.scene.getObjectByName("aspen"),
		//(auto!)stump: "aspen2a3-stump",
		//(auto!)fallenY0: 0.052,
		//main: { name: "aspen1h7" },

		branches: [
			//{ posId: 6, name: "b31-d3" },
			{ posId: 6, name: "b2-41-d1" },
			//{ posId: 7, name: "b31-d2" },
			{ posId: 7, name: "b2-41-d1" },

			{ posId: 8, name: "b52-l" },
			{ posId: 9, name: "b52-l" }, // *camera 3m (3.0)
			{ posId: 10, name: "b52-l" },

			{ posId: 11, name: "b71-2" },
			{ posId: 12, name: "b72-2" },
			{ posId: 13, name: "b72-2" },

			{ posId: 14, name: "b72-1" },
			{ posId: 15, name: "b71-1" },
			{ posId: 16, name: "b72-1" },

			{ posId: 17, name: "b72-t" },
			{ posId: 18, name: "b72-t" },
			{ posId: 19, name: "b71-t" },
		],
	}
},


{ id: 110800, name: "aspen1h8", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 6, name: "b31-d5" },
			//{ posId: 7, name: "b31-d3" },
			{ posId: 7, name: "b2-41-d1" },

			{ posId: 8, name: "b52-d1" },
			{ posId: 9, name: "b52-d1" }, // *camera 3m (3.0)
			{ posId: 10, name: "b52-d1" },

			{ posId: 11, name: "b71-d1" },
			{ posId: 12, name: "b72-2" },
			{ posId: 13, name: "b72-2" },

			{ posId: 14, name: "b72-1" },
			{ posId: 15, name: "b71-1-d1" },
			{ posId: 16, name: "b72-1" },

			{ posId: 17, name: "b72-t" },
			{ posId: 18, name: "b72-t" },
			{ posId: 19, name: "b71-t" },
		],
	}
},


{ id: 110900, name: "aspen1h8-d1", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 7, name: "b31-d4" },

			{ posId: 8, name: "b31-d2" },
			{ posId: 9, name: "b52-d1" }, // *camera 3m (3.0)
			{ posId: 10, name: "b52-d1" },

			{ posId: 11, name: "b31-d2" },
			{ posId: 12, name: "b72-d2" },
			{ posId: 13, name: "b72-2" },

			{ posId: 14, name: "b72-1" },
			{ posId: 15, name: "b71-1-d1" },
			{ posId: 16, name: "b72-1-d1" },

			{ posId: 17, name: "b72-t" },
			{ posId: 18, name: "b72-t-d1" },
			{ posId: 19, name: "b71-t" },
		],
	}
},


{ id: 111000, name: "aspen1h8-d2", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 7, name: "b31-d5" },

			//{ posId: 8, name: "b52-d1" },
			{ posId: 9, name: "b31-d4" }, // *camera 3m (3.0)
			{ posId: 10, name: "b52-d2" },

			//{ posId: 11, name: "b71-d1" },
			{ posId: 12, name: "b72-d2" },
			{ posId: 13, name: "b31-d1" },

			{ posId: 14, name: "b31-d1" },
			{ posId: 15, name: "b71-1-d4" },
			{ posId: 16, name: "b72-1-d1" },

			{ posId: 17, name: "b72-t" },
			{ posId: 18, name: "b72-t-d1" },
			{ posId: 19, name: "b71-t" },
		],
	}
},


{ id: 111100, name: "aspen1h8-d3", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 9, name: "b31-d5" }, // *camera 3m (3.0)
			{ posId: 10, name: "b52-d2" },

			//{ posId: 11, name: "b71-d1" },
			{ posId: 12, name: "b31-d4" },
			{ posId: 13, name: "b31-d3" },

			{ posId: 14, name: "b71-1-d4" },
			//{ posId: 15, name: "b71-1-d1" },
			{ posId: 16, name: "b72-1-d1" },

			{ posId: 17, name: "b72-t-d1" },
			{ posId: 18, name: "b72-t-d1" },
			//{ posId: 19, name: "b71-" },
		],
	}
},


// ==================================================================

{ id: 120100, name: "aspen2h1", flags: f.TREE,
	radius: 0.1, height: 0.7,
	displayBox: [ 2, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",
		stumpIsColliding: false,
	}
},

{ id: 120200, name: "aspen2h2", flags: f.TREE,
	radius: 0.1, height: 1.4,
	displayBox: [ 4, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",
		stumpIsColliding: false,
	}
},

{ id: 120400, name: "aspen2h4", flags: f.TREE,
	radius: 0.1, height: 2.2,
	displayBox: [ 6, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 4, name: "b2-ts2" },
			{ posId: "4a", name: "b3-t" },
			{ posId: 5, name: "b2-ts" },
			{ posId: 6, name: "b2-ts" },
		],
	}
},

{ id: 120600, name: "aspen2h6", flags: f.TREE,
	radius: 0.1, height: 4,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: "4a", name: "b2-81-t-d2" },

			{ posId: 6, name: "b2-41-2" },
			{ posId: 7, name: "b4-t" },
			{ posId: 8, name: "b2-41-2" },
			{ posId: "8b", name: "b2-ts" },
			{ posId: 9, name: "b2-41-2" }, // *camera 3m (3.0)
			{ posId: "9a", name: "b2-ts" },

			{ posId: 10, name: "b2-61-t" }, //=81-1
			{ posId: 11, name: "b2-61-t" },
			{ posId: 12, name: "b2-61-t" },
			{ posId: 13, name: "b2-61-t" }, //=81-t
		],
	}
},

{ id: 120800, name: "aspen2h8", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 6, name: "b2-41-d2" },
			{ posId: 7, name: "b2-41-2" },
			{ posId: 8, name: "b31-d4" },
			{ posId: 9, name: "b2-41-2" },

			{ posId: 10, name: "b2-61-2" },
			{ posId: 11, name: "b2-61-2" },
			{ posId: 12, name: "b2-61-2" },
			{ posId: 13, name: "b2-61-2" },

			{ posId: 14, name: "b2-81-1" },
			{ posId: 15, name: "b2-81-1" },
			{ posId: 16, name: "b2-81-1" },
			{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b2-81-t" },
			{ posId: 19, name: "b2-81-t" },
			{ posId: 20, name: "b2-81-t" },
		],
	}
},

{ id: 120900, name: "aspen2h8-d1", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 7, name: "b2-41-d2" },
			{ posId: 8, name: "b31-d4" },

			{ posId: 10, name: "b2-41-d1" },
			{ posId: 11, name: "b2-41-d1" },
			{ posId: 13, name: "b2-61-2" },

			{ posId: 15, name: "b2-81-1-d2" },
			{ posId: 16, name: "b2-81-1" },
			{ posId: 17, name: "b2-81-1-d" },

			{ posId: 18, name: "b2-81-t" },
			{ posId: 19, name: "b2-81-t-d" },
			{ posId: 20, name: "b2-81-t" },

		],
	}
},

{ id: 121000, name: "aspen2h8-d2", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 7, name: "b2-41-d2" },
			{ posId: 8, name: "b31-d4" },

			{ posId: 10, name: "b31-d5" },
			{ posId: 11, name: "b2-41-d2" },
			{ posId: 13, name: "b2-41-d1" },

			{ posId: 15, name: "b2-81-1-d2" },
			{ posId: 16, name: "b2-81-1-d" },
			{ posId: 17, name: "b2-81-t-d2" },

			{ posId: 18, name: "b2-81-t-d2" },
			{ posId: 19, name: "b2-81-t-d2" },
			{ posId: 20, name: "b2-81-t-d" },
		],
	}
},




// ===================================================================

{ id: 122600, name: "aspen21h6", flags: f.TREE,
	radius: 0.1, height: 4,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 5, name: "b2-ts" },
			{ posId: 7, name: "b2-ts" },
			//{ posId: 8, // concavity
			{ posId: "8a", name: "b2-ts" }, // branch auto placement affected by concavity

			{ posId: 9, name: "b2-ts" },
			{ posId: "9a", name: "b2-ts" },

			{ posId: 10, name: "b2-61-t" }, //=81-1
			{ posId: 11, name: "b2-61-t" },
			{ posId: 12, name: "b2-61-t" },
			{ posId: 13, name: "b2-61-t" }, //=81-t
		],
	}
},

{ id: 122800, name: "aspen21h8", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 5, name: "b2-ts-d" },
			{ posId: 7, name: "b2-ts-d" },
			//{ posId: 8, // concavity
			{ posId: "8a", name: "b2-ts-d4" }, // branch auto placement affected by concavity

			{ posId: 9, name: "b2-ts" },
			{ posId: "9a", name: "b2-ts-d5" },

			{ posId: 10, name: "b2-61-2" },
			{ posId: 11, name: "b2-61-2" },
			{ posId: 12, name: "b2-61-2" },
			{ posId: 13, name: "b2-61-2" },

			{ posId: 14, name: "b2-81-1" },
			{ posId: 15, name: "b2-81-1" },
			{ posId: 16, name: "b2-81-1" },
			{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b2-81-t" },
			{ posId: 19, name: "b2-81-t" },
			{ posId: 20, name: "b2-81-t" },
		],
	}
},

{ id: 122900, name: "aspen21h8-d1", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 7, name: "b2-ts-d" },
			//{ posId: 8, // concavity
			{ posId: "8a", name: "b2-ts-d4" }, // branch auto placement affected by concavity
			{ posId: 9, name: "b2-ts-d" },
			{ posId: "9a", name: "b2-ts-d5" },

			{ posId: 10, name: "b2-61-2-d" },
			//{ posId: 11, name: "b2-61-2" },
			{ posId: 12, name: "b2-61-2" },
			{ posId: 13, name: "b2-61-2-d" },

			{ posId: 14, name: "b2-81-1" },
			{ posId: 15, name: "b2-81-1-d" },
			{ posId: 16, name: "b2-81-1" },
			{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b2-81-t-d" },
			{ posId: 19, name: "b2-81-t" },
			{ posId: 20, name: "b2-81-t" },
		],
	}
},

{ id: 123000, name: "aspen21h8-d2", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: "8a", name: "b2-ts-d5" }, // branch auto placement affected by concavity

			{ posId: 10, name: "b2-41-d1" },
			//{ posId: 11, name: "b2-61-2" },
			{ posId: 12, name: "b2-41-d1" },
			{ posId: 13, name: "b2-41-d1" },

			{ posId: 14, name: "b2-41-d1" },
			{ posId: 15, name: "b31-d4" },
			{ posId: 16, name: "b2-81-1-d2" },
			{ posId: 17, name: "b2-81-1-d" },

			{ posId: 18, name: "b2-81-t-d2" },
			{ posId: 19, name: "b2-81-t-d" },
			{ posId: 20, name: "b2-81-t-d" },
		],
	}
},



// ===================================================================

{ id: 124400, name: "aspen22h4", flags: f.TREE,
	radius: 0.1, height: 2.2,
	displayBox: [ 6, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: "4a", name: "b2-ts2" },
			{ posId: 5, name: "b2-ts" },
			{ posId: 6, name: "b2-ts" },
		],
	}
},

{ id: 124600, name: "aspen22h6", flags: f.TREE,
	radius: 0.1, height: 4,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: "4a", name: "b2-ts2" },
			{ posId: 5, name: "b2-ts" },

			{ posId: 6, name: "b2-61-2s" },
			{ posId: 7, name: "b3-t" },
			{ posId: 8, name: "b2-61-2s" },
			{ posId: 9, name: "b2-61-2s" },

			{ posId: 10, name: "b2-61-2s" },
			{ posId: "10a", name: "b2-61-2s" },
			{ posId: 11, name: "b2-61-t" },
			{ posId: 12, name: "b2-61-t" },
		],
	}
},

{ id: 124800, name: "aspen22h8", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 6, name: "b2-41-d1" },
			{ posId: 7, name: "b2-41-d1" },
			{ posId: 8, name: "b2-61-2s" },
			{ posId: 9, name: "b2-61-2s" },

			{ posId: 10, name: "b4-2" },
			{ posId: "10a", name: "b2-41-d1" },
			{ posId: 11, name: "b2-61-2s" },
			{ posId: 12, name: "b2-81-1" },

			{ posId: 13, name: "b2-61-2s" },
			{ posId: 14, name: "b2-61-2s" },

			{ posId: 15, name: "b2-81-t" },
			{ posId: 16, name: "b2-81-t" },
			{ posId: 17, name: "b2-81-t" },
		],
	}
},

{ id: 124900, name: "aspen22h8-d1", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 6, name: "b2-41-d2" },
			{ posId: 7, name: "b2-41-d1" },
			{ posId: 8, name: "b2-41-d2" },
			{ posId: 9, name: "b2-41-d2" },

			{ posId: 10, name: "b31-d4" },
			{ posId: "10a", name: "b2-41-d1" },
			{ posId: 11, name: "b2-41-d2" },
			{ posId: 12, name: "b2-81-1-d2" },

			{ posId: 13, name: "b2-61-2s" },
			{ posId: 14, name: "b2-61-2s" },

			{ posId: 15, name: "b2-81-t" },
			{ posId: 16, name: "b2-81-t" },
			{ posId: 17, name: "b2-81-t-d" },
		],
	}
},

{ id: 125000, name: "aspen22h8-d2", flags: f.TREE,
	radius: 0.1, height: 5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 7, name: "b31-d4" },
			{ posId: 8, name: "b2-41-d2" },
			{ posId: 9, name: "b2-41-d2" },

			{ posId: 10, name: "b31-d4" },
			{ posId: "10a", name: "b2-41-d2" },
			{ posId: 11, name: "b2-41-d2" },
			{ posId: 12, name: "b2-81-1-d2" },

			{ posId: 13, name: "b2-41-d2" },
			{ posId: 14, name: "b2-41-d2" },

			{ posId: 15, name: "b2-81-t-d" },
			{ posId: 16, name: "b2-81-t-d" },
			{ posId: 17, name: "b2-81-t-d2" },
		],
	}
},




// ===================================================================

{ id: 130100, name: "aspen3h1", flags: f.TREE,
	radius: 0.1, height: 0.8,
	displayBox: [ 2, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",
		stumpIsColliding: false,
	}
},

{ id: 130200, name: "aspen3h2", flags: f.TREE,
	radius: 0.1, height: 1,
	displayBox: [ 2, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",
		stumpIsColliding: false,
	}
},

{ id: 130300, name: "aspen3h3", flags: f.TREE,
	radius: 0.1, height: 1.8,
	displayBox: [ 4, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",
	}
},

{ id: 130500, name: "aspen3h5", flags: f.TREE,
	radius: 0.1, height: 2.7,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 6, name: "b3-t" },
			{ posId: 7, name: "b3-t" },
			{ posId: 8, name: "b3-t" },
		],
	}
},

{ id: 130700, name: "aspen3h7", flags: f.TREE,
	radius: 0.1, height: 4.25,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 8, name: "b2-41-d2" },

			{ posId: 9, name: "b2-41-2" },
			{ posId: 10, name: "b2-41-2" },
			{ posId: 11, name: "b2-41-2" },
			{ posId: 12, name: "b2-41-2" },

			{ posId: 13, name: "b2-41-2" },
			{ posId: "13a", name: "b3-t" },
			{ posId: 14, name: "b3-tb" },
			{ posId: 15, name: "b3-tb" },
		],
	}
},

{ id: 130900, name: "aspen3h9", flags: f.TREE,
	radius: 0.1, height: 5.5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 9, name: "b2-41-d2" },

			{ posId: 11, name: "b2-61-2-d05" },
			{ posId: 12, name: "b2-61-2" },
			{ posId: 13, name: "b2-61-2" },
			{ posId: 14, name: "b2-61-2" },

			{ posId: 15, name: "b2-81-1" },
			{ posId: 16, name: "b2-81-1" },
			{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b2-81-t" },
			{ posId: 19, name: "b2-81-t" },
			{ posId: 20, name: "b2-81-t" },
		],
	}
},

{ id: 131000, name: "aspen3h9-d1", flags: f.TREE,
	radius: 0.1, height: 5.5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 11, name: "b2-41-d2" },
			{ posId: 12, name: "b2-41-d1" },
			{ posId: 13, name: "b31-d4" },
			{ posId: 14, name: "b2-61-2-d" },

			{ posId: 15, name: "b2-81-1-d" },
			{ posId: 16, name: "b2-81-1" },
			{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b2-81-t" },
			{ posId: 19, name: "b2-81-t" },
			{ posId: 20, name: "b2-81-t-d" },
		],
	}
},

{ id: 131100, name: "aspen3h9-d2", flags: f.TREE,
	radius: 0.1, height: 5.5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 11, name: "b2-41-d2" },
			{ posId: 12, name: "b2-41-d1" },
			{ posId: 13, name: "b31-d4" },

			{ posId: 15, name: "b2-81-1-d" },
			{ posId: 16, name: "b2-81-1-d" },

			{ posId: 19, name: "b2-81-t-d2" },
			{ posId: 20, name: "b2-81-t-d" },
		],
	}
},



//====================================================================

{ id: 132500, name: "aspen31h5", flags: f.TREE,
	radius: 0.1, height: 2.7,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 6, name: "b2-ts" },
			{ posId: 7, name: "b3-t" },
			{ posId: 8, name: "b3-t" },
			{ posId: 9, name: "b3-t" },
			{ posId: 10, name: "b2-ts" },
		],
	}
},

{ id: 132700, name: "aspen31h7", flags: f.TREE,
	radius: 0.1, height: 4.25,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 8, name: "b2-ts" },
			{ posId: 9, name: "b2-41-2" },
			{ posId: 10, name: "b2-41-2" },

			{ posId: 11, name: "b2-41-2" },
			{ posId: 12, name: "b2-41-2" },
			{ posId: 13, name: "b2-41-2" },
			{ posId: 14, name: "b2-41-2" },
			{ posId: "14a", name: "b2-ts" },
			{ posId: 15, name: "b3-t" },
			{ posId: 16, name: "b2-ts" },
		],
	}
},

{ id: 132900, name: "aspen31h9", flags: f.TREE,
	radius: 0.1, height: 5.5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 9, name: "b2-41-d1" },
			{ posId: 10, name: "b2-41-d1" },

			{ posId: 11, name: "b2-61-2" },
			{ posId: 12, name: "b2-61-2" },
			{ posId: 13, name: "b2-61-2" },
			{ posId: 14, name: "b2-61-2" },

			{ posId: 15, name: "b2-81-1" },
			{ posId: 16, name: "b2-81-1" },
			{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b2-81-t" },
			{ posId: 19, name: "b2-81-t" },
			{ posId: 20, name: "b2-81-t" },
		],
	}
},

{ id: 133000, name: "aspen31h9-d1", flags: f.TREE,
	radius: 0.1, height: 5.5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 9, name: "b2-41-d1" },

			{ posId: 11, name: "b2-61-2-d05" },
			{ posId: 12, name: "b2-41-d1" },
			{ posId: 13, name: "b2-61-2-d05" },
			{ posId: 14, name: "b2-61-2-d05" },

			{ posId: 15, name: "b2-81-1-d" },
			{ posId: 16, name: "b2-81-1-d" },
			{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b2-81-t-d" },
			{ posId: 19, name: "b2-81-t" },
			{ posId: 20, name: "b2-81-t-d" },
		],
	}
},

{ id: 133100, name: "aspen31h9-d2", flags: f.TREE,
	radius: 0.1, height: 5.5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [

			{ posId: 9, name: "b31-d5" },

			{ posId: 11, name: "b31-d4" },
			{ posId: 12, name: "b2-41-d1" },
			{ posId: 13, name: "b2-61-2-d" },
			{ posId: 14, name: "b2-61-2-d" },

			{ posId: 15, name: "b2-81-1-d" },
			{ posId: 16, name: "b2-81-1-d" },
			//{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b2-81-t-d" },
			{ posId: 19, name: "b2-81-t-d" },
			{ posId: 20, name: "b2-81-t-d2" },
		],
	}
},



//====================================================================

{ id: 140100, name: "aspen4h1", flags: f.TREE,
	radius: 0.1, height: 1,
	displayBox: [ 2, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",
		stumpIsColliding: false,
	}
},

{ id: 140300, name: "aspen4h3", flags: f.TREE,
	radius: 0.1, height: 2,
	displayBox: [ 4, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",
	}
},

{ id: 140500, name: "aspen4h5", flags: f.TREE,
	radius: 0.1, height: 2.5,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 6, name: "b2-ts" },
			{ posId: "6a", name: "b4-t" },
			{ posId: 7, name: "b3-t" },
			{ posId: 8, name: "b3-t" },
		],
	}
},

{ id: 140700, name: "aspen4h7", flags: f.TREE,
	radius: 0.1, height: 4.25,
	displayBox: [ 8, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 8, name: "b2-41-2" },

			{ posId: 9, name: "b4-2" },
			{ posId: 10, name: "b4-2" },

			{ posId: 11, name: "b2-81-1" },
			{ posId: 12, name: "b3-t" },
			{ posId: 13, name: "b2-81-1" },
			{ posId: 14, name: "b3-t" },
		],
	}
},

{ id: 140900, name: "aspen4h9", flags: f.TREE,
	radius: 0.1, height: 5.5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			//{ posId: 9, name: "b4-2-d05" },
			//{ posId: 10, name: "b31-d4" },

			{ posId: 11, name: "b4-2-d05" },
			{ posId: 12, name: "b2-61-2" },
			{ posId: 13, name: "b2-61-2-d05" },
			{ posId: 14, name: "b2-61-2" },

			{ posId: 15, name: "b2-81-1" },
			{ posId: 16, name: "b2-81-1" },
			{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b3-t" },
			{ posId: 19, name: "b3-t" },
			{ posId: 20, name: "b3-t" },
		],
	}
},

{ id: 141000, name: "aspen4h9-d1", flags: f.TREE,
	radius: 0.1, height: 5.5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 11, name: "b31-d4" },

			{ posId: 12, name: "b2-61-2-d" },
			{ posId: 13, name: "b2-61-2-d" },
			{ posId: 14, name: "b2-61-2-d05" },

			{ posId: 15, name: "b2-81-1" },
			{ posId: 16, name: "b2-81-1-d" },
			{ posId: 17, name: "b2-81-1" },

			{ posId: 18, name: "b3-t-d" },
			{ posId: 19, name: "b3-t" },
			{ posId: 20, name: "b3-t" },
		],
	}
},

{ id: 141100, name: "aspen4h9-d2", flags: f.TREE,
	radius: 0.1, height: 5.5,
	displayBox: [ 10, [ "aspen_trunk", "aspen_leaves" ], [ 1000, 1000 ] ],
	nameKey: "aspen",
	tree: {
		trunkMatName: "aspen_trunk",
		leavesMatName: "aspen_leaves",

		branches: [
			{ posId: 12, name: "b31-d4" },
			{ posId: 14, name: "b2-41-d1" },

			{ posId: 15, name: "b2-81-1-d2" },
			//{ posId: 16, name: "b71-1-d4" },
			{ posId: 17, name: "b2-81-1-d" },

			//{ posId: 18, name: "b3-t-d" },
			{ posId: 19, name: "b3-t-d" },
			{ posId: 20, name: "b3-t-d" },
		],
	}
},


//====================================================================


{ id: 99, name: "charAppearEffectPlaceholder", flags: f.COLLIDING | f.INVISIBLE | f.RAYTRANSPARENT,
	geometry: Assets.geometries.charAppearEffect,
	radius: 1.05, height: 100,
	matName: "",
},

{ id: 98, name: "charAppearEffect", flags: f.RAYTRANSPARENT,
	geometry: Assets.geometries.charAppearEffect,
	radius: 1.05, height: 100,
	matName: "charAppearEffect",
	// e.g. per-(non-static)mesh uniform
	customOnBeforeRender: "charAppearEffect",
},

{ id: 97, name: "glow", flags: f.RAYTRANSPARENT,
	geometry: Assets.geometries.charAppearEffect,
	radius: 3, height: 10,
	matName: "glow",
	// e.g. per-(non-static)mesh uniform
	//customOnBeforeRender: "charAppearEffect",
},



//====================================================================

// id=90xx  : TestAreaDisplay_Paper2_getItemSpecData


//====================================================================


{ id: 3, name: "dummy-c5", flags: f.STATIC,
	geometry: Assets.geometries['dummy-c5'],
	matName: "metal",
	radius: 5.1, height: 1.1,
},
{ id: 4, name: "dummy-c25", flags: f.STATIC,
	geometry: Assets.geometries['dummy-c25'],
	matName: "metal",
	radius: 25.01, height: 1.1,
},

{ id: 7, name: "box1x5", flags: f.STATIC,
	geometry: Assets.geometries.box1x5,
	matName: "metal",
},
{ id: 8, name: "box1x10", flags: f.STATIC,
	geometry: Assets.geometries.box1x10,
	matName: "metal",
},
{ id: 9, name: "box1x25", flags: f.STATIC,
	geometry: Assets.geometries.box1x25,
	matName: "metal",
},
{ id: 10, name: "box1x50", flags: f.STATIC,
	geometry: Assets.geometries.box1x50,
	matName: "metal",
},
{ id: 11, name: "box1x500", flags: f.STATIC, // ! wrong fog on long tris
	geometry: Assets.geometries.box1x500,
	isHole: true,
	matName: "metal",
},


	// ======================================================================

	]; // data

	//return Util.deepFreeze(data); // - compute bboxes

	return data;
}


export { ItemSpecData };

