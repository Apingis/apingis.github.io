//
// Loaded all the codebase.
//
setTimeout(onAfterCodebaseLoaded, 0);



function onAfterCodebaseLoaded() {

	Local.create();

	Main.user = new UserBase;

	Main.DEBUG = AppConfig.DEBUG;

	mouseRaycaster = new Raycaster;

	wMon = new Util.WindowMonitor;
	wMon.check();

	Messages.init(document.getElementById('canvas-msg'));

	UIPrefs.loadAllPrefs();


	LoadingScreen.onCompleteStage(0);

	setTimeout( () => AssetsLoader.loadAll(onAfterAssetsLoaded), 20);
}


//
// Loaded all the codebase & 3D assets.
//
function onAfterAssetsLoaded() {

	wMon.check();

	(typeof BranchSpec != "undefined") && BranchSpec.createAll();

	ItemSpec.createAll();


	// also will init from server. Forces HTML lang. selectors.
	Lang.doSwitch( AppConfig.forceLang || window.localStorage.getItem("lang") || AppConfig.lang || "EN", true );

	Display.init(); // <-- after everything loaded

	//window['vC'] = Display.cameraView.cameraMove.vC;



	LoadingScreen.onCompleteStage(1);



	//document.querySelector('#buttons-top-row-2-anchor-top')
	document.querySelector('#buttons-top-row-2-anchor-below')
		.appendChild( getUIElem('buttons-top-row2') );


	if (Main.DEBUG >= 5) {

		CameraView.zoomSettings = [

			{ y: -1, phi: -0, d: 5.1, factor: 3 },

			{ y: 0.15, phi: -0, d: 5.1, factor: 0.3 },
			{ y: 0.45, phi: -0, d: 5.1, factor: 0.5 },
			{ y: 1.3, phi: -0, d: 5.1, factor: 0.8 },

			{ y: 2, phi: -0.05, d: 5.1 },
			//{ y: 1.85, phi: -0, d: 5.1 },
			{ y: 3, phi: -0.16, d: 7.3 },
			{ y: 4.5, phi: -0.22, d: 11, factor: 1.3 },
			{ y: 7, phi: -0.28, d: 15.5, factor: 1.7 },
			{ y: 10, phi: -0.32, d: 21, factor: 2.5 },
			{ y: 15, phi: -0.36, d: 31, factor: 3.7 },

			{ y: 20, phi: -0.42, d: 40, factor: 4.5 },
			{ y: 70, phi: -0.52, d: 50, factor: 6 },
		];

	}


	if (!AppConfig.isVK) {
		document.getElementById('vk-invite').style.display = 'none';
		document.getElementById('btn-uicoins').style.display = 'none';
	}


	if (AppConfig.confName == "vk-local" || AppConfig.confName == "vk") {

		//if (AppConfig.confName == "vk-local")
		//	UI.Debug.turnOn();

		var userData = {
			login: '', // is taken from urlParams
			origin: 'VK',
			urlParams: window.location.search.substr(1),
		};

		Server.sendRequestStartOrLoad(userData, data => {

			//if (Main.DEBUG >= 5)
				console.log("VK StartOrLoad >", data);

			console.error(`CLIENT IP: ${data.clientIP}`);

			var result = LoadUser.initializeFromServerUserData(data.startOrLoad);

			if (!result)
				return Loader.displayHaltMsg("Bad server data", "", "sendRequestStartOrLoad");


			if (data.allowDebug)
				UI.Debug.turnOn();

			onLoadedServerOrLocalData();
		});

		return;
	}




	if (AppConfig.confName == "local") { // local w/ server

		UI.Debug.turnOn();

		var userData = {
			login: 'localRoot',
			origin: '',
		};

		Server.sendRequestStartOrLoad(userData, data => {

			if (Main.DEBUG >= 5)
				console.log("StartOrLoad >", data);

			var result = LoadUser.initializeFromServerUserData(data.startOrLoad);

			if (!result)
				return Loader.displayHaltMsg("Bad server data", "", "sendRequestStartOrLoad");

			onLoadedServerOrLocalData();
		});

		return;
	}



	if ( AppConfig.isDemo1() )
		return initDemo1();


	if ( AppConfig.isDemo2() ) {

		return initDemo2();
	}


	if (AppConfig.noServer) { // *** NO SERVER ***

		UI.Debug.turnOn();

		Main.noServer = true;

		createNoServerData();

		LoadingScreen.updateProgressStage2(10);


		let SKIP_WARMUP = 1;

		if (SKIP_WARMUP)
			return Engine.startFrame1();

		Engine.startWarmUp_Tree_Char( () => Engine.startFrame1() );
		return;
	}



	Loader.displayHaltMsg("Unsupported configuration", "", JSON.stringify(AppConfig));

} // End of top-level Function


/*
	var sessionKey = window.localStorage.getItem("sessionKey");

Server.sendRequestRegisterUser(data => { console.log(`RegisterUser`, data); });

	//window.localStorage.setItem("sessionKey", data.sessionKey);
});
*/

// document.querySelector("div.js-consent-banner").style.opacity=0



// ========================================================================

function createNoServerData() {

	//VCTest_inclined();
	//VCTest_degenerate();
	//VCTest_4cylinder(); // dummy 1-face +cylinder
	//VCTest_3(); // dummy 1-face -cylinder
	//VCTest_2();
	//VCTest_1(); // <-- obs.


	//PFtest_ME_11(); // 20 chars. !

	//PFtest_ME_10_b(); // 8 chars (experimental)

	//PFtest_ME_10_ref(); // 8 chars. REF.!


	//PFtest_ME_01(); // <--INVENTORY (basic)

	//PFtest_ME_surface(); // <--INVENTORY (minimal / surface)


//	PFtest_cover1();

//	PFtest_trees();

//	PFtest_structures();

if (0) {

	//PFtest_robots();

	//PFtest_base_v5(); // base v5

	//createSlots_B1_plus();
	//createSlots_C1D1_plus(); // <--- PRODUCTION SLOTS (add-up to base_v5)
/*
	createSlots_C2();
	createSlots_AB234();
	createSlots_D4_plus();
	createSlots_C3_plus();

	PFtest_base_v5_extraSlots();
*/
}
	//PFtest_base_collectLogs();

	//PFtest_smashing();
	//PFtest_itemColor();


	//TestAreaDisplay2();
	//TestAreaDisplay_Structures();


	//TestAreaDisplay_Chains_img_plogo1();


	ItemSpec.createAll( TestAreaDisplay_Paper2_getItemSpecData(), { allowWithoutId: true } );

	TestAreaDisplay_VCDebug_1();

	//TestAreaDisplay_Paper2_1(); // replaced w/ VCDebug_1()
	//TestAreaDisplay_Paper2_1a(); // same as above^
	//TestAreaDisplay_Paper2_2(); // replaced w/ *_intersections()

	//TestAreaDisplay_Paper2_sectioning();
	//TestAreaDisplay_Paper2_2branches();
	//TestAreaDisplay_Paper2_noIntersection();

	//TestAreaDisplay_Paper2_intersections();
	//TestAreaDisplay_Paper2_intersections2();
	//TestAreaDisplay_Paper2_intersections3();
	//TestAreaDisplay_Paper2_arbitrary();


	//TestAreaDisplay_Exercise1();

	//TestAreaDisplay_ChainTest_HEShow();
	//TestAreaDisplay_Chains_img_perimeter_4();
	//TestAreaDisplay_Chains_img_perimeter_1();


	//TestAreaDisplay_Chains_perf_shader();

	//TestAreaDisplay_ChainTest_Plane();


// ========================================================================

	Messages.add('Test (NO SERVER): Started.');
}



// ========================================================================



// ==============================================================================

function initDemo1() {

	var FOR_IMG = 0;

	CameraView.zoomSettings = [

		{ y: 1, phi: -0, d: 4.4, factor: 0.5 },
		{ y: 2, phi: -0.05, d: 5.1, factor: 0.75 },
		{ y: 3, phi: -0.16, d: 7.3 },
		{ y: 4, phi: -0.19, d: 9.4, factor: 1.1 },
		{ y: 5, phi: -0.22, d: 11.5, factor: 1.1 },
		{ y: 6, phi: -0.25, d: 13.5, factor: 1.1 },
		{ y: 7, phi: -0.28, d: 15.5, factor: 1.2 },
		{ y: 8.5, phi: -0.30, d: 18, factor: 1.3 },
		{ y: 10, phi: -0.32, d: 21, factor: 1.4 },
		{ y: 15, phi: -0.36, d: 31, factor: 2 },
	];

	document.getElementById('uicoins').style.display = 'none';
	document.getElementById('btn-char-prev').style.display = 'none';
	document.getElementById('btn-char-next').style.display = 'none';
	document.getElementById('progress-window-small').style.display = 'none';

	Main.area = new Area(new Rectangle(100, 100, 330, 330));
	Main.area.homeCameraLocation = new CameraLocation(246.4, 129, 6, 0.9);
	Display.cameraView.setLocation(Main.area.homeCameraLocation);

	var item2 = Item.createOn3D("chainTest2", 255.2, 135.8, 2.98);

	item2.setP2( new THREE.Vector3(2.8, 1, 0.5) ); item2.setDL(0);
	item2.setFeatureValue2('rope', 0); item2.setFeatureValue2('cw', 1); item2.setFeatureValue2('animDirection', 1);

	if (FOR_IMG) {
		item2.setY(-0.1); item2.setFeatureValue2('animDirection', 0);
	}

	Main.select( item2 );


	if (!FOR_IMG) {

		var item3 = Item.createOn3D("chainTest2", 266, 158, -1.3);

		item3.setP2( new THREE.Vector3(4, 8, 0.1) ); item2.setDL(0);
		item3.setFeatureValue2('rope', 1); item2.setFeatureValue2('cw', 0); item2.setFeatureValue2('animDirection', -1);
	}

	Engine.startFrame1();
}



