

function initDemo2() {

	UI.Debug.turnOn();

	document.getElementById('uicoins').style.display = 'none';
	document.getElementById('debug-axe').style.display = 'none';
	document.getElementById('debug-logs').style.display = 'none';
	document.getElementById('debug-stop').style.display = 'none';
	document.getElementById('debug-coins').style.display = 'none';

	CameraMove.DistanceJump = 250;
	CameraMove.DurationMax = 4;

	ScreenCharInfo.cameraFollow = true;

	TaskCutWood.CUT_ONLY = false;
	LogSpec.crumbleT = Infinity;
	
	Main.area = new Area(new Rectangle(100, 100, 550, 550));

	//Main.area.homeCameraLocation = new CameraLocation(258, 150, 4.5, 1.57);
	Main.area.homeCameraLocation = new CameraLocation(258, 152.5, 3, 1.57);

	Display.cameraView.setLocation(Main.area.homeCameraLocation);

	//initDemo2_items();
	Engine.startWarmUp_Tree_Char( initDemo2_items );
}



function initDemo2_items() {

	ItemSpec.createAll( initDemo2_getItemSpecData(), { allowWithoutId: true } );

//return 	Engine.startFrame1();


var s = 0.3;

var item1 = Item.createOn3D('demo2-vc1',220,170);

var rotor1 = Item.createOn3D('demo2-vc1-rotor1').setInitialRotationParams(0, s);
var rotor2 = Item.createOn3D('demo2-vc1-rotor2').setInitialRotationParams(Math.PI/2, -s);
var rotor3 = Item.createOn3D('demo2-vc1-rotor1').setInitialRotationParams(0, s);

item1.addDependentItem( rotor1, '', new THREE.Matrix4().setPosition(-2.5, 0, -0.25) );
item1.addDependentItem( rotor2, '', new THREE.Matrix4().setPosition(0, 0, -0.25) );
item1.addDependentItem( rotor3, '', new THREE.Matrix4().setPosition(2.5, 0, -0.25) );


item1 = Item.createOn3D('demo2-vc1',220,182, Math.PI);

rotor1 = Item.createOn3D('demo2-vc1-rotor1').setInitialRotationParams(0, s);
rotor2 = Item.createOn3D('demo2-vc1-rotor2').setInitialRotationParams(Math.PI/2, -s);
rotor3 = Item.createOn3D('demo2-vc1-rotor1').setInitialRotationParams(0, s);

item1.addDependentItem( rotor1, '', new THREE.Matrix4().setPosition(-2.5, 0, -0.25) );
item1.addDependentItem( rotor2, '', new THREE.Matrix4().setPosition(0, 0, -0.25) );
item1.addDependentItem( rotor3, '', new THREE.Matrix4().setPosition(2.5, 0, -0.25) );


var base = Item.createOn3D("demo2-fanbase",225,176, Math.PI);
var fan = Item.createOn3D("demo2-fan1").setInitialRotationParams(0, 0.27);

base.addDependentItem(fan,'',new THREE.Matrix4().setPosition(0,3.35,0) );


//return 	Engine.startFrame1();


	LoadUser.initItemsFromJSON([

		{ specId: "char", id: Local.getNextItemId(), // 5 (hId=7)
			x:258.1, z:160.6, facing:-1.5, positionType: Item.On3D,
			charData: { headId: 7 },
		},
/*
		{ specId: "char", id: Local.getNextItemId(), // 1 (hId=5)
			x:258.1, z:160.6, facing:-1.5, positionType: Item.On3D,
			charData: { headId: 5 },
		},
		{ specId: "char", id: Local.getNextItemId(), // 3 (hId=4)
			x:321.5, z:234, facing:1.4, positionType: Item.On3D,
			charData: { headId: 4 },
		},
		{ specId: "char", id: Local.getNextItemId(), // 2 (hId=6)
 			x:354.1, z:138.6, positionType: Item.On3D,
			charData: { headId: 6 },
		},
*/
		{ specId: "char", id: Local.getNextItemId(), // 6 (hId=1)
			x:321.5, z:234, facing:1.4, positionType: Item.On3D,
			charData: { headId: 1 },
		},
		{ specId: "char", id: Local.getNextItemId(), // 7 (hId=2)
 			x:354.1, z:138.6, positionType: Item.On3D,
			charData: { headId: 2 },
		},
		{ specId: "char", id: Local.getNextItemId(), // 4 (hId=3)
			x:223.1, z:174.6, facing:-1.6, positionType: Item.On3D,
			charData: { headId: 3 },
		},
	]);



Item.createOn3D("container", 256, 164); Item.createOn3D("container1", 254, 164); Item.createOn3D("container2", 252, 164);
Item.createOn3D("container3", 255, 161); Item.createOn3D("container1", 252.8, 161, Math.PI);

var char, spec;

spec = ItemSpec.get("axeCustom1i");

char = Main.getChars()[0];

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1i", customData: { features:[
	spec.generateFeatureData("handleShape", "handle2"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1i", customData: { features:[
	spec.generateFeatureData("blade", "axeSimple"),
	spec.generateFeatureData("handleShape", "handle2"),
	spec.generateFeatureData("handleMat", "paintedRed"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1i", customData: { features:[
	spec.generateFeatureData("handleMat", "paintedBrown"),
	spec.generateFeatureData("handleWrap", "green"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1b", customData: { features:[
] }, positionType: Item.None }).addToInventoryOf(char);

spec = ItemSpec.get("axeCustom1b");

char = Main.getChars()[1];

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1b", customData: { features:[
	spec.generateFeatureData("blade", "axeSmallBronze2"),
	spec.generateFeatureData("handleShape", "handle2"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1b", customData: { features:[
	spec.generateFeatureData("blade", "axeSmallBronze2"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1b", customData: { features:[
	spec.generateFeatureData("handleShape", "handle1h"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1b", customData: { features:[
	spec.generateFeatureData("handleWrap", "cherryStripe"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1b", customData: { features:[
	spec.generateFeatureData("blade", "axeSimpleBronze"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1b", customData: { features:[
	spec.generateFeatureData("blade", "axeSimpleBronze2"),
	spec.generateFeatureData("handleShape", "handle2"),
	spec.generateFeatureData("handleMat", "paintedBlack"),
	spec.generateFeatureData("handleWrap", "black"),
] }, positionType: Item.None }).addToInventoryOf(char);

spec = ItemSpec.get("axeCustom1c");

char = Main.getChars()[2];

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("handleWrap", "red2"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("handleMat", "dark"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("handleShape", "handle2"),
	spec.generateFeatureData("handleWrap", "plain"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("blade", "axeHatchet"),
	spec.generateFeatureData("handleShape", "handle2h"),
	spec.generateFeatureData("handleMat", "paintedRed"),
	spec.generateFeatureData("handleWrap", "white2"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1i", customData: { features:[
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("blade", "axeHatchet"),
] }, positionType: Item.None }).addToInventoryOf(char);

char = Main.getChars()[3];

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("handleShape", "handle1h"),
	spec.generateFeatureData("handleMat", "plasticGreen"),
	spec.generateFeatureData("handleWrap", "red2"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("handleShape", "handle2h"),
	spec.generateFeatureData("handleMat", "plasticBlue"),
	spec.generateFeatureData("handleWrap", "brown2"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("handleShape", "handle2"),
	spec.generateFeatureData("handleMat", "dark"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("blade", "axeW002"),
	spec.generateFeatureData("handleShape", "handle2h"),
	spec.generateFeatureData("handleWrap", "black"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("blade", "axeW002"),
	spec.generateFeatureData("handleShape", "handle3"),
	spec.generateFeatureData("handleMat", "plasticRed"),
	spec.generateFeatureData("handleWrap", "blue2"),
] }, positionType: Item.None }).addToInventoryOf(char);

Item.fromJSON({ id: Local.getNextTmpId(), specId: "axeCustom1c", customData: { features:[
	spec.generateFeatureData("blade", "axeW002"),
	spec.generateFeatureData("handleShape", "handle3"),
	spec.generateFeatureData("handleMat", "plasticWhite"),
	spec.generateFeatureData("handleWrap", "indigo"),
] }, positionType: Item.None }).addToInventoryOf(char);


	
	initDemo2_addItemSlots();

	initDemo2_addEnvSlots();

	initDemo2_createTreeSlots();

	LoadUser.initSlotsFromJSON([ // 2025.11

		{ id:810, type:"tree", x:304.6, z:125, seed:2609010161 }, // SW
		{ id:811, type:"tree", x:304.1, z:131, seed:2209030099 },
		{ id:812, type:"tree", x:342.8, z:129.8, seed:2109020209 },
		{ id:813, type:"tree", x:348.5, z:137, seed:2509030244 },
		{ id:814, type:"tree", x:344.5, z:153.7, seed:2709000077 },

		{ id:820, type:"tree", x:325, z:209.8, seed:2111000099 }, // at char #2
		{ id:821, type:"tree", x:320, z:222.3, seed:2509020198, facing:1 },
		{ id:822, type:"tree", x:327.2, z:233, seed:2809030297, facing:3 },
		{ id:823, type:"tree", x:353, z:238.4, seed:3009010099, facing:-2 },
		{ id:824, type:"tree", x:358, z:231.6, seed:2909000198, facing:2 },
		{ id:825, type:"tree", x:363.6, z:226.2, seed:1909020397, facing:-1 },
	]);

	Engine.startFrame1();
}




function initDemo2_addItemSlots() {

	var lOX = 202, rOX = 147, oy = -1, roy = -1.9;

	LoadUser.initSlotsFromJSON([

		{ id:700, type:"demo2-wall6m", x:212.2, z:172 },
		{ id:701, type:"demo2-wall6m", x:213, z:174.8, facing:Math.PI/2 },
		{ id:702, type:"demo2-wall6m", x:213, z:180.4, facing:Math.PI/2 },
		{ id:703, type:"demo2-wall6m", x:213, z:186, facing:Math.PI/2 },


		{ id:800, type:"tree", x:260.7, z:165, seed:1481100040 }, // .getEventT(0)=0
		{ id:801, type:"tree", x:261.7, z:155, seed:2081100040, facing:0.5 },

		{ id:802, type:"tree", x:258.5, z:157.3, seed:593000040, facing:1.64 },



		{ id:910, type:"demo2-teleporter", x:320, z:230, facing:0 },
		{ id:911, type:"demo2-wall1", x:320, z:230, facing:3.14 },
		{ id:912, type:"demo2-wall1-f", x:320, z:230, facing:3.14 },



		{ id:921, type:"demo2-robocenter2", x:353, z:139, facing:-0.9 },
		{ id:922, type:"demo2-robocenter2-f", x:353, z:139, facing:-0.9 },

		{ id:923, type:"demo2-wall2", x:344, z:128, facing:-1.1 },
		{ id:924, type:"demo2-fence3x2wooden", x:343, z:135.5, facing:0.5 },



		//{ id:930, type:"demo2-robocenter1", x:278, z:129, facing:3 },
		{ id:930, type:"demo2-structure1", x:278, z:128.4, y:-1, facing:-1.57 },


		{ id:941, type:"demo2-robocenter2", x:186, z:127, facing:1.54 },
		//{ id:942, type:"demo2-robocenter2-f", x:186, z:127, facing:1.54 },

		// center-back
		{ id:950, type:"column5b", x:192, z:121 },
		{ id:951, type:"fence2-8m", x:188, z:121, facing:Math.PI/2 },
		{ id:952, type:"column5", x:186, z:121, facing:-1.57 },
		{ id:953, type:"fence2-4m", x:182, z:121, facing:Math.PI/2 },
		{ id:954, type:"column5", x:180, z:121 },

		// center-left
		{ id:1200, type:"column5", x:192, z:132.5 },
		{ id:1201, type:"fence2-4m", x:192, z:130.5 },
		{ id:1202, type:"column5b", x:192, z:128.5 },

		{ id:1203, type:"column5", x:192, z:125, facing:Math.PI/2 },
		{ id:1204, type:"fence2-4m", x:192, z:123 },
		{ id:1205, type:"column5b", x:192, z:121, facing:Math.PI },

		{ id:1206, type:"demo2-sign-exclamation", x:196, z:123, y:1.6 },
		{ id:1207, type:"demo2-sign-exclamation", x:196, z:129.5, y:1.6 },
		{ id:1208, type:"demo2-sign-exclamation", x:187, z:132.5, y:1.8, facing:Math.PI/2 },
		{ id:1209, type:"demo2-sign-exclamation", x:180, z:132.5, y:1.8, facing:Math.PI/2 },

		// center-right
		{ id:1250, type:"fence2-8m", x:180, z:125 },
		{ id:1251, type:"column5a", x:180, z:129 },

		// center-top
		{ id:1401, type:"fence2-8m", x:188, z:132.5, facing:Math.PI/2 },
		{ id:1402, type:"column5", x:182, z:132.5 },
		{ id:1403, type:"fence2-8m", x:180, z:132.5, facing:Math.PI/2 },
		{ id:1404, type:"column5", x:176, z:132.5 },


		// right - wooden
		{ id:1300, type:"column5", x:176, z:118.63, y:-0.8 },
		{ id:1301, type:"demo2-fence3x2wooden", x:176, z:118.73+3 },
		// gap
		{ id:1305, type:"demo2-fence3x2wooden", x:176, z:129.4 },
	
		// top-wooden
		{ id:1310, type:"demo2-fence3x2wooden", x:172.9, z:132.5, facing:Math.PI/2 },
		{ id:1311, type:"demo2-fence3wooden", x:168.4, z:132.5, facing:Math.PI/2 },
		// gap
		{ id:1314, type:"demo2-fence3wooden", x:162.6, z:132.5, facing:Math.PI/2 },
		{ id:1315, type:"demo2-fence3x2wooden", x:158.1, z:132.5, facing:Math.PI/2 },
		{ id:1316, type:"column5a", x:155, z:132.5, y:-0.6 },

		// rightmost-wooden
		{ id:1350, type:"demo2-fence3x2wooden", x:155, z:129.5 },
		{ id:1351, type:"demo2-fence3x2wooden", x:155, z:123.5 },
		{ id:1352, type:"demo2-fence3x2wooden", x:155, z:117.5 },

		// rightmost-wooden bottom
		//{ id:1360, type:"demo2-fence3wooden", x:155, z:101.6 },
		{ id:1360, type:"demo2-fence3wooden", x:155, z:104 },
		{ id:1361, type:"demo2-fence3x2wooden", x:155, z:108.5 },

		// INSIDE - top #2
		{ id:1600, type:"demo2-fence8m", x:167.9, z:124.5, facing:Math.PI/2 },
		{ id:1601, type:"column5b", x:163.8, z:124.5, y:-0.8 },
		{ id:1602, type:"demo2-fence3x2", x:160.7, z:124.5, facing:Math.PI/2 },
		{ id:1603, type:"column5", x:157.6, z:124.5, y:-0.8 },

		{ id:1604, type:"demo2-sign-exclamation", x:160.5, z:124.5, y:1.6, facing:Math.PI/2 },
		{ id:1605, type:"demo2-sign-exclamation", x:165, z:124.5, y:1.6, facing:Math.PI/2 },
		{ id:1606, type:"demo2-sign-exclamation", x:169.5, z:124.5, y:1.6, facing:Math.PI/2 },

		{ id:1609, type:"demo2-fence3x2", x:160.5, z:121, facing:Math.PI/2 },
		{ id:1610, type:"column5b", x:163.5, z:121, y:-0.7 },

		{ id:1614, type:"fence2-8m", x:163.5, z:117, y:-0.9 },
		{ id:1615, type:"column5", x:163.5, z:113, y:-0.7 },
		//{ id:1618, type:"fence2-8m", x:163.5, z:109, y:-0.9 },
		//{ id:1619, type:"column5a", x:163.5, z:105, y:-0.8 },

		{ id:1630, type:"demo2-fence3", x:162, z:113, facing:Math.PI/2 },
		{ id:1631, type:"column5", x:160.5, z:113, y:-0.8 },

		//{ id:1635, type:"demo2-fence3x2", x:160.5, z:110 },
		//{ id:1636, type:"column5", x:160.5, z:107, y:-0.8 },

		{ id:1650, type:"demo2-fence3x2", x:157.814, z:114.336, facing:1.1092 },
		{ id:1651, type:"column5", x:155.2, z:115.6, y:-0.8 },


		// INSIDE - left #2
		{ id:1700, type:"hole-l15", x:167.3, z:114.2, facing:Math.PI/2 },


		// INSIDE - leftmost
		{ id:1070, type:"column5", x:172, z:109.5, y:-0.8 },
		{ id:1071, type:"demo2-fence3x2", x:172, z:112.5 },
		{ id:1072, type:"column5b", x:172, z:115.5, y:-0.8 },
		{ id:1073, type:"demo2-fence3x2", x:172, z:118.5 },
		{ id:1074, type:"demo2-fence3", x:172, z:123 },
		{ id:1075, type:"column5", x:172, z:124.5, y:-0.8 },

		{ id:1077, type:"column5a", x:172, z:121, y:-0.8 },
		{ id:1078, type:"demo2-fence3", x:173.6, z:121, facing:-Math.PI/2 },
		{ id:1079, type:"column5", x:175.2, z:121, y:-0.8, facing:3.14 },

		{ id:1080, type:"demo2-sign-exclamation", x:172, z:122.8, y:1.6, facing:Math.PI },
		{ id:1081, type:"demo2-sign-exclamation", x:172, z:118, y:1.6, facing:Math.PI },
		{ id:1082, type:"demo2-sign-exclamation", x:172, z:112.5, y:1.6, facing:Math.PI },

		// INSIDE - topmost
		{ id:1500, type:"column5", x:175.6, z:130, y:-0.8, facing:1.57 },
		{ id:1503, type:"demo2-fence3x2", x:172.5, z:130, facing:Math.PI/2 },
		{ id:1504, type:"column5", x:169.5, z:130, y:-0.7 },
		{ id:1505, type:"demo2-fence3x2", x:166.5, z:130, facing:Math.PI/2 },
		{ id:1506, type:"column5a", x:163.5, z:130, y:-0.8, facing:1.57 },
		{ id:1507, type:"demo2-fence3x2", x:160.5, z:130, facing:Math.PI/2 },
		{ id:1508, type:"column5b", x:157.5, z:130, y:-0.8 },

		{ id:1510, type:"demo2-fence3x2", x:157.5, z:127 }, //d
		{ id:1512, type:"demo2-fence3", x:157.5, z:122.5 }, //d
		{ id:1514, type:"column5", x:157.5, z:121, y:-0.8 },


		// left - outer
		{ id:960, type:"column3", x:lOX, z:100.2, y:oy, facing:-3.14 },
		{ id:961, type:"fence2-8m", x:lOX, z:104.2, y:roy },
		{ id:962, type:"fence2-8m", x:lOX, z:112.2, y:roy },
		{ id:963, type:"fence2-8m", x:lOX, z:120.2, y:roy },
		{ id:964, type:"fence2-8m", x:lOX, z:128.2, y:roy },

		{ id:965, type:"column3", x:lOX, z:106.4, y:oy },
		{ id:966, type:"column3a", x:lOX, z:112.7, y:oy, facing:-3.14 },
		{ id:967, type:"column3", x:lOX, z:119.2, y:oy },
		{ id:968, type:"column3a", x:lOX, z:125.7, y:oy },
		{ id:969, type:"column3", x:lOX, z:132.2, y:oy },

		{ id:970, type:"fence2-8m", x:lOX, z:143, y:roy },
		{ id:971, type:"fence2-4m", x:lOX, z:137, y:roy },
		//{ id:971, type:"fence2-8m", x:lOX, z:135, y:roy },
		//{ id:972, type:"fence2-8m", x:lOX, z:127, y:roy },
		{ id:973, type:"column3", x:lOX, z:135, y:oy, facing:-3.14 },
		{ id:974, type:"column3a", x:lOX, z:141, y:oy },

		// left - middle

		{ id:981, type:"fence2-4m", x:194, z:132.5, y:-0.9, facing:-Math.PI/2 },
		{ id:982, type:"column5b", x:196, z:132.5, y:-0.8, facing:-1.57 },
		{ id:983, type:"demo2-fence3x2", x:196, z:129.5 },
		{ id:984, type:"column5", x:196, z:126.5, y:-0.8 },
		{ id:985, type:"demo2-fence8m", x:196, z:122.55 },

		{ id:989, type:"column5a", x:196, z:118.63, y:-0.8 },
		{ id:990, type:"demo2-fence3x2wooden", x:196, z:118.5-3 },
		{ id:991, type:"demo2-fence3x2wooden", x:196, z:118.5-9 },
		{ id:992, type:"demo2-fence3wooden", x:196, z:118.5-13.5 },

		// back
		{ id:1000, type:"hole-l15", x:184.5, z:102.6 },

		{ id:1001, type:"column3", x:195.5, z:106, facing:Math.PI/2 },
		//{ id:1002, type:"demo2-fence3x2", x:192.5, z:106, facing:Math.PI/2 },

		{ id:1003, type:"column3a", x:192, z:106 }, // towards 116
		{ id:1004, type:"demo2-fence3x2", x:192, z:109 },
		{ id:1006, type:"demo2-fence3", x:192, z:113.5 },
		{ id:1007, type:"column3", x:192, z:115, facing:0.7 },

		{ id:1008, type:"fence2-8m", x:191.5, z:106, y:-0.9, facing:Math.PI/2 },
		{ id:1009, type:"fence2-8m", x:183.5, z:106, y:-0.9, facing:Math.PI/2 },
		{ id:1010, type:"fence2-8m", x:175.5, z:106, y:-0.9, facing:Math.PI/2 },

		//{ id:1010, type:"demo2-fence3x2", x:186.5, z:106, facing:Math.PI/2 },
		{ id:1011, type:"column3", x:187.5, z:106, facing:-1.57 },
		//{ id:1012, type:"demo2-fence3x2", x:180.5, z:106, facing:Math.PI/2 },
		{ id:1013, type:"column3a", x:183, z:106, facing:1.57 },
		{ id:1014, type:"column3", x:179, z:106, facing:1.57 },
		//{ id:1015, type:"demo2-fence3x2", x:174.5, z:106, facing:Math.PI/2 },
		{ id:1017, type:"column3", x:175.2, z:106, facing:-1.57 },
		{ id:1019, type:"column3a", x:171.5, z:106, facing:-1.54 },

		{ id:1021, type:"column3", x:174.5, z:100.3, y:-0.7 },
		{ id:1022, type:"demo2-fence3", x:174.5, z:101.9, y:-0.7 },
		{ id:1023, type:"column3", x:174.5, z:103.5, y:-0.7 },
		{ id:1024, type:"demo2-sign-exclamation", x:174.5, z:101.7, y:1.3, facing:Math.PI },

		{ id:1030, type:"demo2-fence3", x:171.5, z:104.5 },
		{ id:1031, type:"column3", x:171.5, z:103, facing:-1.54 },
		{ id:1032, type:"demo2-fence3x2", x:168.5, z:103, facing:Math.PI/2 },
		{ id:1033, type:"column3a", x:165.5, z:103, facing:1.54 },
		{ id:1034, type:"demo2-fence3x2", x:162.5, z:103, facing:Math.PI/2 },
		{ id:1035, type:"column3a", x:159.5, z:103, facing:-1.54 },

		{ id:1036, type:"demo2-fence3x2", x:157.248, z:104.98, facing:0.849 },
		{ id:1037, type:"column3a", x:155.18, z:106.75, facing:2.42 },


		// back-116
		{ id:1050, type:"hole-l15", x:181.8, z:112.7 },

		{ id:1051, type:"demo2-fence3", x:190.587, z:115.5, facing:1.229 },
		{ id:1052, type:"column3", x:189.1, z:116, facing:-0.2 },
		{ id:1053, type:"demo2-fence3x2", x:186.1, z:116, facing:Math.PI/2 },
		{ id:1054, type:"column3a", x:183.1, z:116, facing:3.14 },
		{ id:1055, type:"demo2-fence3x2", x:180.1, z:116, facing:Math.PI/2 },
		{ id:1057, type:"column3", x:174.1+3, z:116, facing:-1.57 },

		{ id:1058, type:"demo2-sign-exclamation", x:180, z:116, y:1.6, facing:-Math.PI/2 },
		{ id:1059, type:"demo2-sign-exclamation", x:186, z:116, y:1.6, facing:-Math.PI/2 },

		{ id:1060, type:"column3", x:188, z:109.5, facing:-1.57 },
		{ id:1063, type:"fence2-8m", x:184, z:109.5, y:-0.9, facing:Math.PI/2 },
		{ id:1064, type:"column3", x:180, z:109.5, facing:1.54 },
		{ id:1065, type:"fence2-8m", x:176, z:109.5, y:-0.9, facing:Math.PI/2 },


		// back-118.6
		{ id:2100, type:"demo2-fence3x2wooden", x:192.85, z:118.6, facing:Math.PI/2 },
		{ id:2101, type:"demo2-fence3x2wooden", x:186.85, z:118.6, facing:Math.PI/2 },
		{ id:2102, type:"demo2-fence3x2wooden", x:179.15, z:118.6, facing:Math.PI/2 },


		// fwd-1
		{ id:1100, type:"fence2-8m", x:155, z:135, y:-0.9 },
		{ id:1101, type:"column5", x:155, z:139, y:-0.8 },

		{ id:1110, type:"fence2-8m", x:159, z:139, y:-0.9, facing:Math.PI/2 },
		{ id:1111, type:"fence2-8m", x:167, z:139, y:-0.9, facing:Math.PI/2 },
		{ id:1112, type:"fence2-8m", x:175, z:139, y:-0.9, facing:Math.PI/2 },
		{ id:1113, type:"fence2-8m", x:183, z:139, y:-0.9, facing:Math.PI/2 },
		{ id:1114, type:"fence2-8m", x:191, z:139, y:-0.9, facing:Math.PI/2 },
		{ id:1115, type:"column5b", x:195, z:139, y:-0.8 },

		{ id:1120, type:"column4", x:160, z:139, y:1.5+roy, facing:-Math.PI/2 },
		{ id:1121, type:"column4", x:165, z:139, y:1.5+roy, facing:-Math.PI/2 },
		{ id:1122, type:"column4", x:170, z:139, y:1.5+roy, facing:-Math.PI/2 },
		{ id:1123, type:"column4", x:175, z:139, y:1.5+roy, facing:-Math.PI/2 },
		{ id:1124, type:"column4", x:180, z:139, y:1.5+roy, facing:-Math.PI/2 },
		{ id:1125, type:"column4", x:185, z:139, y:1.5+roy, facing:-Math.PI/2 },
		{ id:1126, type:"column4", x:190, z:139, y:1.5+roy, facing:-Math.PI/2 },

		// fwd-2
		{ id:1902, type:"fence2-8m", x:151, z:147, y:roy, facing:Math.PI/2 },
		{ id:1903, type:"fence2-8m", x:159, z:147, y:roy, facing:Math.PI/2 },
		{ id:1904, type:"fence2-8m", x:167, z:147, y:roy, facing:Math.PI/2 },
		{ id:1905, type:"column4", x:152.8, z:147, y:0.5+roy, facing:-Math.PI/2 },
		{ id:1906, type:"column4", x:159, z:147, y:0.5+roy, facing:-Math.PI/2 },
		{ id:1907, type:"column4", x:165.3, z:147, y:0.5+roy, facing:-Math.PI/2 },

		{ id:1910, type:"column4", x:171, z:147, y:0.5+roy, facing:-Math.PI/2 },

		{ id:1920, type:"column4", x:174, z:147, y:0.5+roy, facing:-Math.PI/2 },
		{ id:1921, type:"fence2-8m", x:178, z:147, y:roy, facing:Math.PI/2 },
		{ id:1922, type:"fence2-8m", x:186, z:147, y:roy, facing:Math.PI/2 },
		{ id:1923, type:"fence2-8m", x:194, z:147, y:roy, facing:Math.PI/2 },
		{ id:1924, type:"fence2-4m", x:200, z:147, y:roy, facing:Math.PI/2 },

		{ id:1925, type:"column4", x:179.7, z:147, y:0.5+roy, facing:-Math.PI/2 },
		{ id:1926, type:"column4", x:185, z:147, y:0.5+roy, facing:-Math.PI/2 },
		{ id:1927, type:"column4", x:190.7, z:147, y:0.5+roy, facing:-Math.PI/2 },
		{ id:1928, type:"column4", x:196.2, z:147, y:0.5+roy, facing:-Math.PI/2 },

		{ id:1930, type:"column5", x:202, z:147, y:roy },


		// right outer
		{ id:1800, type:"column4", x:rOX, z:100.5, y:0.5+roy },
		{ id:1801, type:"fence2-8m", x:rOX, z:104.5, y:roy },
		{ id:1802, type:"fence2-8m", x:rOX, z:112.5, y:roy },
		{ id:1803, type:"column4", x:rOX, z:105.5, y:0.5+roy },
		{ id:1804, type:"column4", x:rOX, z:111, y:0.5+roy },
		{ id:1805, type:"column4", x:rOX, z:116.47, y:0.5+roy },

		{ id:1810, type:"column4", x:rOX, z:119, y:0.5+roy },
		{ id:1811, type:"fence2-8m", x:rOX, z:123, y:roy },
		{ id:1812, type:"fence2-8m", x:rOX, z:131, y:roy },
		{ id:1813, type:"fence2-8m", x:rOX, z:139, y:roy },
		{ id:1814, type:"fence2-4m", x:rOX, z:145, y:roy },
		{ id:1815, type:"column4", x:rOX, z:124.5, y:0.5+roy },
		{ id:1816, type:"column4", x:rOX, z:130, y:0.5+roy },
		{ id:1817, type:"column4", x:rOX, z:136, y:0.5+roy },
		{ id:1818, type:"column4", x:rOX, z:141.5, y:0.5+roy },
		{ id:1819, type:"column5", x:rOX, z:147, y:roy },

	]);
}



function initDemo2_createTreeSlots() {

	var createSlotsData = {

		baseId: Math.max( 3000, Local.get().slots.getNextId() ),
		polygon: new Polygon([ 270,100, 550,100, 550,300, 290,210 ]),
		excludePolygons: [
			new Polygon([ 370,127, 365,147, 342,140, 342,125 ]),
		],
		removeSlotIds: [],

		_sprng: new Util.SeedablePRNG(3833, 21366644, 1922564040, 691617317),
		_trees: [],
	};

	var DEBUG = 0;

	var startBaseId = createSlotsData.baseId;

	createSlotsData._sprng.roll(10);

	testCreateSlots( createSlotsData, 30, "grp-5", { minDistanceToItem: 20, grpDistMin: 6, grpDistMax: 7, seedMax:1.3e9 } );
	testCreateSlots( createSlotsData, 50, "grp-3", { minDistanceToItem: 12 } );
	testCreateSlots( createSlotsData, 250, "", { minDistanceToItem: 7.5 } );

	createSlotsData.polygon = new Polygon([ 280,100, 420,110, 390,205, 280,190 ]);

	testCreateSlots( createSlotsData, 250, "", { minDistanceToItem: 7, seedMin:2.7e9, seedMax:3.2e9 } );

	if (DEBUG) {
		createSlotsData.polygon.clone().show('red');
		console.log(`createSlots_left ${Local.get().slots.getNextId() - startBaseId} slots`);
	}


	startBaseId = Local.get().slots.getNextId();
	createSlotsData.polygon = new Polygon([ 100,201, 280,240, 240,360, 100,310 ]);
	createSlotsData.excludePolygons = [];

	testCreateSlots( createSlotsData, 50, "grp-3", { minDistanceToItem: 15 } );
	testCreateSlots( createSlotsData, 1200, "" );

	if (DEBUG) {
		createSlotsData.polygon.clone().show('red');
		console.log(`createSlots_fwd ${Local.get().slots.getNextId() - startBaseId} slots`);
	}


	startBaseId = Local.get().slots.getNextId();
	createSlotsData.polygon = new Polygon([ 100,410, 550,410, 550,550, 100,550 ]);
	createSlotsData.excludePolygons = [ new Polygon([ 360,460, 370,510, 310,490, 310,450 ]) ];

	testCreateSlots( createSlotsData, 100, "grp-3", { minDistanceToItem: 15 } );
	testCreateSlots( createSlotsData, 2000, "" );

	if (DEBUG) {
		createSlotsData.polygon.clone().show('red');
		console.log(`createSlots_far ${Local.get().slots.getNextId() - startBaseId} slots`);
	}


	createSlotsData._sprng.set(3833, 21366644, 1922564040, 691617317);

	startBaseId = Local.get().slots.getNextId();
	createSlotsData.polygon = new Polygon([ 208,100, 270,100, 270,145, 213,138 ]);
	createSlotsData.excludePolygons = [];

	testCreateSlots( createSlotsData, 70, "grp-3", { minDistanceToItem: 10 } );
	testCreateSlots( createSlotsData, 300, "", { seedMax:3.2e9 } );

	if (DEBUG) {
		createSlotsData.polygon.clone().show('red');
		console.log(`createSlots_back ${Local.get().slots.getNextId() - startBaseId} slots`);
	}


	startBaseId = Local.get().slots.getNextId();
	createSlotsData.polygon = new Polygon([ 330,301, 399,320, 390,380, 340,350 ]);

	testCreateSlots( createSlotsData, 30, "grp-4", { minDistanceToItem: 15 } );
	testCreateSlots( createSlotsData, 300, "", { minDistanceToItem: 7 } );

	if (DEBUG) {
		createSlotsData.polygon.clone().show('red');
		console.log(`createSlots_center ${Local.get().slots.getNextId() - startBaseId} slots`);
	}


	createSlotsData._sprng.roll(50);
	startBaseId = Local.get().slots.getNextId();
	createSlotsData.polygon = new Polygon([ 305,170, 305,200, 240,190, 250,170  ]);

	testCreateSlots( createSlotsData, 40, "grp-4", { minDistanceToItem: 12 } );
	testCreateSlots( createSlotsData, 300, "", { } );

	if (DEBUG) {
		createSlotsData.polygon.clone().show('red');
		console.log(`createSlots_fwd_near ${Local.get().slots.getNextId() - startBaseId} slots`);
	}


	onAfterCreateSlots(createSlotsData);
}



function initDemo2_addEnvSlots() {

	LoadUser.initSlotsFromJSON([

		{ id:100, type: "mntn2-cliff2", x:280, z:145 },

		{ id:101, type: "mntn2-c20-concave", x:287, z:215, facing:0.9 },
		{ id:102, type: "mntn2-e25", x:290, z:260, facing:-0.6 },

		{ id:104, type: "mntn2-concave4", x:169, z:225, facing:1.6 },
		{ id:105, type: "mntn2-concave5", x:199, z:299, facing:-1.8 },

		{ id:106, type: "mntn2-concave5", x:352, z:204, facing:1.7 },
		{ id:107, type: "mntn2-concave4", x:337, z:268, facing:-2.4 },

		{ id:110, type: "mntn2-c20", x:441, z:245 },

		{ id:120, type: "mntn2-c20-6", x:222, z:455, facing:-2.7 },
		{ id:121, type: "mntn2-e25-6", x:287, z:452 },
		{ id:123, type: "mntn2-cliff4", x:354, z:442, facing:0.8 },
		{ id:124, type: "mntn2-cliff3", x:390, z:440, facing:-0.4 },
		{ id:125, type: "mntn2-e25-6", x:400, z:490, facing:1 },

		// +
		{ id:130, type: "mntn2-e25", x:430, z:160, facing:0.7 },


		// H O L E S

		// B1 - back
		{ id:299, type:"hole-c2", x:237.7, z:143 }, // visible @home
		{ id:298, type:"hole-l5", facing:2, x:242, z:111 },
		{ id:297, type:"hole-concave1", facing:-2.4, x:246, z:131 },
		{ id:296, type:"hole-e11", facing:0.8, x:216, z:123 },
		{ id:295, type:"hole-c2", facing:2.5, x:268, z:126 },
		{ id:294, type:"hole-l5", facing:-0.7, x:233.8, z:117.7 },

		// B1_plus: fwd
		{ id:290, type:"hole-l15", x:260, z:201, facing:-0.3 },
		{ id:289, type:"hole-l5", x:259, z:214, facing:2.4 },
		{ id:288, type:"hole-c2", x:264, z:221, facing:2 },
		{ id:287, type:"hole-e16", x:283, z:239.5, facing:0.8 }, //z:237.7 joins cBody, bad for camera

		// +
		{ id:286, type:"hole-concave1", x:263.5, z:169, facing:-3 },

		// C1
		{ id:200, type: "hole-e16", x:300.1, z:128, facing:1.6 },
		{ id:201, type: "hole-l5", x:350, z:173, facing:0.8 },
		{ id:202, type: "hole-c2", x:375, z:120, facing:-1 },
		//{ id:204, type: "hole-e11", x:307, z:109, facing:-0.3 },
		{ id:206, type: "hole-c2", x:327, z:131 },
		{ id:207, type: "hole-c2", x:335, z:173, facing:2 },
		{ id:208, type: "hole-c2", x:355, z:107, facing:-2 },
		{ id:209, type: "hole-concave1", x:343, z:145, facing:2 },
		{ id:210, type: "hole-l5", x:368, z:150, facing:0.8 },
		{ id:211, type: "hole-l5", x:331, z:121, facing:-2.5 },
		{ id:212, type: "hole-l5", x:315, z:179, facing:1.7 },
		{ id:213, type: "hole-l5", x:303, z:160, facing:0.3 },
		{ id:214, type: "hole-c2", x:376, z:188, facing:-1 },

		{ id:215, type: "hole-concave1", x:316, z:120, facing:-0.8 },

		// A4
		{ id:220, type: "hole-e16", x:170, z:325, facing:1.8 },
		{ id:223, type: "hole-c2", x:160, z:320, facing:2 },
		{ id:224, type: "hole-c2", x:171, z:375, facing:1 },
		{ id:227, type: "hole-l5", x:120, z:365, facing:-2 },

		// D1
		{ id:230, type: "hole-l15", x:400, z:141, facing:2.7 },
		{ id:231, type: "hole-e11", x:357, z:120, facing:-1.7 },
		{ id:232, type: "hole-c2", x:326, z:108, facing:-2.5 },
		{ id:233, type: "hole-c2", x:365, z:157, facing:0.4 },
		{ id:234, type: "hole-l5", x:333.5, z:135.5, facing:2.1 },
		{ id:235, type: "hole-l5", x:295, z:171, facing:-2.2 },

	]);
}



initDemo2_getItemSpecData = function() {

	var f = ItemSpec.flags;

	var f1 = 0.12, f2 = 0.24;

	var data = [

{ name: "demo2-teleporter", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-teleporter").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-teleporter3d") },
	height: 5.58,
},
{ name: "demo2-wall1", flags: f.COLLIDING,
	//get displayRectGeometry() { return Assets.models.baseCenter.obj.scene.getObjectByName("tower").geometry; },
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-wall1").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-wall1-3d") },
	get cBody2D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-wall1-2d") },
	height: 3.25,
},
{ name: "demo2-wall1-f", flags: f.RAYTRANSPARENT, // not alone, colliding is wall
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-wall1-f").geometry; },
	matName: "fenceSkinned",
},


{ name: "demo2-robocenter1", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-robocenter1").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-robocenter1-3d") },
	get cBody2D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-robocenter1-2d") },
	height: 6.55,
},
{ name: "demo2-robocenter2", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-robocenter2").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-robocenter2-3d") },
	get cBody2D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-robocenter2-2d") },
	height: 5.68,
},
{ name: "demo2-robocenter2-f", flags: f.RAYTRANSPARENT, // not alone, colliding is wall
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-robocenter2-f").geometry; },
	matName: "fenceSkinned",
},


{ name: "demo2-wall2", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-wall2").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-wall2-3d") },
},
{ name: "demo2-wall6m", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("wall6m").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("wall6m-3d") },
},
{ name: "demo2-structure1", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("structure1").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("structure1-3d") },
},
{ name: "demo2-fence3wooden", flags: f.COLLIDING,// | f.RAYTRANSPARENT,
	nameKey: "fenceWooden",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("fence3wooden").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("fence3wooden-3d") },
},
{ name: "demo2-fence3x2wooden", flags: f.COLLIDING,// | f.RAYTRANSPARENT,
	nameKey: "fenceWooden",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("fence3x2wooden").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("fence3x2wooden-3d") },
},


{ name: "demo2-vc1", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-vc1").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-vc1-3d") },
},
{ name: "demo2-vc1-rotor1", entity:"rotor", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-vc1-rotor1").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-vc1-rotor1-3d") },
	rotor: { speed: 1 },
},
{ name: "demo2-vc1-rotor2", entity:"rotor", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-vc1-rotor2").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("demo2-vc1-rotor2-3d") },
	rotor: { offset: Math.PI/2, speed: -1 },
},


{ name: "demo2-fanbase", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("fanbase").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("fanbase-3d") },
},
{ name: "demo2-fan1", entity:"rotor", flags: f.COLLIDING,
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("fan1").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("fan1-3d") },
	rotor: { speed: -0.5, axis: new THREE.Vector3(1, 0, 0) },
},


{ name: "column3", flags: f.COLLIDING,
	nameKey: "column",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("column3").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("column3-3d") },
},
{ name: "column3a", flags: f.COLLIDING,
	nameKey: "column",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("column3a").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("column3-3d") },
},
{ name: "column4", flags: f.COLLIDING,
	nameKey: "columnIron",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("column4").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("column4-3d") },
	get cBody2D() { return Assets.models.demo2.obj.scene.getObjectByName("column4-2d") },
	height: 3.66,
},
{ name: "column5", flags: f.COLLIDING,
	nameKey: "column",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("column5").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("column5-3d") },
},
{ name: "column5a", flags: f.COLLIDING,
	nameKey: "column",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("column5a").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("column5-3d") },
},
{ name: "column5b", flags: f.COLLIDING,
	nameKey: "column",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("column5b").geometry },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("column5-3d") },
},


{ name: "demo2-fence3", flags: f.COLLIDING | f.RAYTRANSPARENT,
	nameKey: "fence",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("fence3").geometry; },
	matName: "fenceSkinned",
	polygon: new Polygon([
		-f2,-1.5, -f1,-1.5-f1, f1,-1.5-f1, f2,-1.5,   f2,1.5, f1,1.5+f1, -f1,1.5+f1, -f2,1.5
	], 3.1).mirrorX(),
},
{ name: "demo2-fence3x2", flags: f.COLLIDING | f.RAYTRANSPARENT,
	nameKey: "fence",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("fence3x2").geometry; },
	matName: "fenceSkinned",
	polygon: new Polygon([
		-f2,-3, -f1,-3-f1, f1,-3-f1, f2,-3,   f2,3, f1,3+f1, -f1,3+f1, -f2,3
	], 3.1).mirrorX(),
},
{ name: "demo2-fence8m", flags: f.COLLIDING | f.RAYTRANSPARENT,
	nameKey: "fence",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("fence8m").geometry; },
	matName: "fenceSkinned",
	polygon: new Polygon([
		-f2,-4, -f1,-4-f1, f1,-4-f1, f2,-4,   f2,4, f1,4+f1, -f1,4+f1, -f2,4
	], 3.1).mirrorX(),
},
{ name: "fence2-4m", flags: f.COLLIDING | f.RAYTRANSPARENT,
	nameKey: "fence",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("fence2-4m").geometry; },
	matName: "fenceSkinned",
	polygon: new Polygon([
		-f2,-2, -f1,-2-f1, f1,-2-f1, f2,-2,   f2,2, f1,2+f1, -f1,2+f1, -f2,2
	], 4),//.mirrorX(),
},
{ name: "fence2-8m", flags: f.COLLIDING | f.RAYTRANSPARENT,
	nameKey: "fence",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("fence2-8m").geometry; },
	matName: "fenceSkinned",
	polygon: new Polygon([
		-f2,-4, -f1,-4-f1, f1,-4-f1, f2,-4,   f2,4, f1,4+f1, -f1,4+f1, -f2,4
	], 4).mirrorX(),
},


{ name: "demo2-sign-exclamation", flags: 0,//f.NOHIGHLIGHT,
	nameKey: "sign-exclamation",
	get geometry() { return Assets.models.demo2.obj.scene.getObjectByName("sign-exclamation").geometry; },
	matName: "baseCenterSkinned",
	get cBody3D() { return Assets.models.demo2.obj.scene.getObjectByName("sign-exclamation-3d") },
},



	]; // data

	return data;
}



// *******************************************************************
//
//
//     C R E A T E    T R E E    S L O T S
// (Test-Common.js)
//
// *******************************************************************
function hasPolygonCollision(x, y, r) {

	var polygon = ItemSpec.get("aspen1h7").createPolygon(x, y, r, 0); // RC 0

	if (Main.area.spatialIndex.polygonCollides(polygon, 0, item => item.isHole() )) // vs hole - rc 0
		return true;

	if (Main.area.spatialIndex.polygonCollides(polygon)) // vs baseRC
		return true;
}


function onAfterCreateSlots(createSlotsData) {

	createSlotsData._trees.forEach(tree => tree.removeItem());

	Local.get().slots.getAll().forEach(slot => {

		if (createSlotsData.removeSlotIds.indexOf(slot.id) !== -1)
			slots.slotById.delete(slot.id);
	});
}



function testCreateSlots(data, attempts, opt, options = {}) {

	options = {

		verbose: 0,
		minDistanceToItem: options.minDistanceToItem || 6.5,
		grpDistMin: options.grpDistMin || 5,
		grpDistMax: options.grpDistMax || 6,
		seedMin: options.seedMin || 1,
		seedMax: options.seedMax || 2**32 - 1,
		//seedMin: options.seedMin || 1e6,
		//seedMax: options.seedMax || 2**32 - 1e6,
	};


	function slotRound(x) {

		x = Math.floor(x * 10) / 10;

		var f = Util.fract(x);
		if (f <= 0.201 || f >= 0.799)
			x = Math.floor(x + 0.5);

		return x;
	}


	function slotRoundAngle(a) {

		if (a > -0.4 && a < 0.3)
			a = 0;

		// trunc: "-0"
		a = Math.floor(a * 10) / 10;
		if (a < -Math.PI)
			a = 0;

		var f = Util.fract(a);
		if (f <= 0.101 || f >= 0.899)
			a = Math.floor(a + 0.5);

		return a;
	}


	var rectArea = Main.area.rect;
	var offArea = 1.5;


	function isLocationCorrect(x, y, r, d) {

		console.assert(typeof d == "number" && d > 1);

		if (x < rectArea.minX + offArea || x > rectArea.maxX - offArea
				|| y < rectArea.minY + offArea || y > rectArea.maxY - offArea)
			return;

		if (0
			|| !data.polygon.contains(x, y)
			|| data.excludePolygons.some(polygon => polygon.contains(x, y))
			|| !minDstToTreeGT(x, y, d)
			|| hasPolygonCollision(x, y, r)
		)
			return;

		return true;
	}



	var rect = data.polygon.getRect().clone();
	var offRect = 0;

	var sprng = data._sprng;
	var cnt = 0;

	for (let i = 0; i < attempts; i++) {

		let x = rect.minX + offRect + sprng.random() * (rect.width - 2 * offRect);
		let y = rect.minY + offRect + sprng.random() * (rect.height - 2 * offRect);

		x = slotRound(x);
		y = slotRound(y);

		let r = slotRoundAngle( sprng.randAngle() );

		if ( !isLocationCorrect(x, y, r, options.minDistanceToItem) )
			continue;
		

		data._trees.push( Item.createOn3D("aspen1h7", x, y, r) );

		createSlot(x, y, r);
		cnt ++;

		if (opt.startsWith("grp-"))
			createSlotGroup(data, opt, x, y);

	} // for (attempts)

	if (options.verbose)
		console.warn(`${opt} slots total: ${cnt} / ${attempts}`);


	function minDstToTreeGT(x, y, d) { // SMALL ITEM (e.g. tree)

		var items = Main.area.spatialIndex.getCollidingItemsUsingShape(0, new Point(x, y), d + 1, item => item.isTree());
		var minDistance = items.reduce((min, item) => Math.min(min, item.getPoint().distanceTo(x, y)), Infinity);

		return minDistance > d;
	}


	function createSlot(x, y, r) {

		var seed = Math.floor( sprng.randInterval(options.seedMin, options.seedMax) );
		var id = data.baseId ++;

		if (id === 3693)
			seed = 111000015;
		if (id === 3015)
			seed = 222000011;

		var slot = new Slot(id, new THREE.Vector3(x, 0, y), r, seed);

		Local.get().slots.add(slot);
	}


	function createSlotGroup(data, opt, x, y) {

		var match = opt.match(/^grp-(\d+)$/);
		var n = Number.parseInt(match[1]);

		if (!n || n < 2)
			console.error(`n=${n} opt=${opt}`);

		var ATTEMPTS_MAX = 50;

		for (let i = 1; i < n; i++) { // have 1 slot already

			for (let j = 0; j < ATTEMPTS_MAX; j++) {
				if ( createSlotGroupSlotAttempt(data, opt, x, y) )
					break;
			}
		}
	}


	function createSlotGroupSlotAttempt(data, opt, x, y) {

		//var D_MIN = 3.6, D_MAX = 4.4;
		var D_MIN = options.grpDistMin, D_MAX = options.grpDistMax;

		var DISTANCE = D_MIN + (D_MAX - D_MIN) * sprng.random();
		var ANGLE = sprng.randAngle();

		var p = new Point(x, y).getByAngleDistance( ANGLE, DISTANCE );

		p.x = slotRound(p.x);
		p.y = slotRound(p.y);

		var r = slotRoundAngle( sprng.randAngle() );

		if ( !isLocationCorrect(p.x, p.y, r, D_MIN - 0.01) )
			return;


		data._trees.push( Item.createOn3D("aspen1h7", p.x, p.y, r) );

		createSlot(p.x, p.y, r);
		cnt ++;

		return true;
	}

}



function printSlots() {

	var slots = Local.get().slots.getAll();
	var str = '';

	slots.forEach((slot, i) => {

		if (slot.id < 3000)
			return;

		str += JSON.stringify( slot.toJSON() ) + ",";

		if (i > 0 && i % 2 === 0)
			str += "\n";
	});

	LoadingScreen.setupTextOutput(str);
}



var demo2_char2;

function demo2_updatePerFrame() {

	if (Engine.frameNum % 50 === 49)
		return;

	if (!demo2_char2)
		demo2_char2 = Main.getChars().find(c => c.charData.headId === 2);

	if ( demo2_char2.taskList.hasUnfinishedTask("TaskMoveTo") )
		return;


	if ( demo2_char2.getPoint().distanceTo(185.6, 128) < 2 ) {

		demo2_char2.taskList.setTask("TaskMoveTo", new THREE.Vector3(354.1, 0, 138.6) );
		return;
	}

	if ( demo2_char2.getPoint().distanceTo(354.1, 138.6) < 2 ) {

		demo2_char2.taskList.setTask("TaskMoveTo", new THREE.Vector3(185.6, 0, 128) );
		return;
	}

}




