
var UIPrefs = {

	List: [
		"stats",
		//"color", "stats2",
		"brightness", "arrows", "csm", "materialConf",
		"fps", "visDistance", "aa",
		//"polygonOp",
		"polygonUnionShow", "polygonShow",
		"showPolyhedra",
		//"showGrid",
		"ss"
	],


	updateCheckbox(name, isOn, noSave) {

		console.assert(name.startsWith("prefs-"));

		var el = document.querySelector('#' + name);
		if (!el)
			return Report.warn("no element", `n=${name}`);

		el.checked = isOn;

		if (!noSave)
			this.updateLocalStorage(name, isOn);
	},


	updateRadioBtn(name, setting, noSave) {

		console.assert(name.startsWith("prefs-"));

		var query = '#' + name + '-' + setting;
		var el = document.querySelector(query);
		if (!el)
			return Report.warn("no element", `q=${query}`);

		el.checked = true;

		if (!noSave)
			this.updateLocalStorage(name, setting);
	},


	updateLocalStorage(name, setting) {

		window.localStorage.setItem(name, setting);
	},


	// If no setting in local storage: initialize w/ hardcoded default

	loadPref(name) {

		if (this.List.indexOf(name) === -1)
			return Report.warn("no name", `name=${name}`);

		var obj = this[ name ];
		if ( !obj )
			return Report.warn("no obj", `name=${name}`);

		var value = window.localStorage.getItem("prefs-" + name);

		if (value === null) {
			value = undefined;

		} else {
			value = value === "true" ? true : value === "false" ? false : parseInt(value);
		}

		if ( !('set' in obj) )
			return Report.warn("bad obj", `name=${name}`);

		obj.set(value, true);
	},



	loadAllPrefs() {

		this.List.forEach(name => this.loadPref(name));
	},


	resetAllPrefs() {

		this.List.forEach(name => {

			var obj = this[ name ];

			obj.set(); // reset to default & save
		});
	},


	// ===================================================================

	arrows: {

		name: "arrows",
		isOn: false,
		defaultValue: false,

		set(isOn = this.defaultValue, noSave) {

			this.isOn = !!isOn;

			// queried where required (UI/Buttons)

			Buttons.updateBottom();

			UIPrefs.updateCheckbox("prefs-arrows", isOn, noSave);
		}
	},


	color: {

		name: "color",
		setting: 1,
		defaultValue: 1,

		set(n = this.defaultValue, noSave) {

			if ( !(n >= 1 && n <= 5) )
				return;

			this.setting = n;
			UIPrefs.updateRadioBtn("prefs-color", n, noSave);

			console.error(`not implemented`);

			Main.getUnits().forEach(c => c.updateDisplay());
		}
	},


	stats: {

		name: "stats",
		isOn: true,
		defaultValue: true,

		statsObj: null,

		set(isOn = this.defaultValue, noSave) {

			this.isOn = !!isOn;

			if (this.isOn) {

				if (!this.statsObj) {

					this.statsObj = new Stats();
					this.statsObj.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
					UI.el.appContainer.appendChild(this.statsObj.dom);

					this.statsObj.dom.style.left = "25vh"; // minimap
				}

				this.statsObj.dom.style["z-index"] = 3001;

			} else {

				this.statsObj && (this.statsObj.dom.style["z-index"] = -3001);
			}

			UIPrefs.updateCheckbox("prefs-stats", isOn, noSave);

			UI.update();
		},
	},


	stats2: {

		name: "stats2",
		isOn: false,
		defaultValue: false,

		set(isOn = this.defaultValue, noSave) {

			isOn = !!isOn;
			var el2 = document.getElementById("stats2");

			if (!el2) {

			} else if (isOn && !this.isOn) {

				el2.style["z-index"] = 3002;
				el2.style.display = "block";

			} else if (!isOn && this.isOn) {

				el2.style["z-index"] = -3002;
				el2.style.display = "none";
				this.clearText();
			}

			this.isOn = isOn;
			UIPrefs.updateCheckbox("prefs-stats2", isOn, noSave);
		},


		update(...args) {

			if (!this.isOn)
				return;

			for (let i = 0; i < 10; i++) {

				let el = document.getElementById("stats2-" + i);
				if (!el)
					break;

				el.textContent = args[i] || "";
			}
		},


		clearText() {

			for (let i = 0; i < 10; i++) {

				let el = document.getElementById("stats2-" + i);
				if (!el)
					break;

				el.textContent = "";
			}
		},
	},


	brightness: {

		name: "brightness",
		isOn: true,
		defaultValue: true,

		set(isOn = this.defaultValue, noSave) {

			this.isOn = !!isOn;

			Display.updateLightIntensity(this.isOn ? 1.15 : 1);

			UIPrefs.updateCheckbox("prefs-brightness", isOn, noSave);
		}
	},


	materialConf: {

		name: "materialConf",
		isOn: true,
		defaultValue: true,

		meshes: new Set,


		set(isOn = this.defaultValue, noSave) {

			var requiresUpdate = this.isOn !== !!isOn;

			this.isOn = !!isOn;

			requiresUpdate && this.meshes.forEach(mesh => {

				if (mesh.userData.isAggregate)
					ItemDisplay.updateAggregateMesh(mesh);
				else
					ItemDisplay.updateMeshForDisplay(mesh);
			});

			UIPrefs.updateCheckbox("prefs-materialConf", this.isOn, noSave);
		},

		clearAll() { this.meshes.clear(); },

		register(mesh) { this.meshes.add(mesh); },

		unregister(mesh) { this.meshes.delete(mesh); },
	},


	csm: {

		name: "csm",
		isOn: false,
		defaultValue: true,

		_adapter: null,

		get adapter() {

			return this._adapter || (
				this._adapter = new CSMAdapter(scene, Display.camera,
					Display.directionalLightPosition.clone().negate())
			);
		},


		set(isOn = this.defaultValue, noSave) {

			this.isOn = !!isOn;

			if (this.isOn) {

				Display.renderer.shadowMap.enabled = true;
				//Display.renderer.shadowMap.type = THREE.BasicShadowMap;
				Display.renderer.shadowMap.type = THREE.PCFShadowMap;
				//Display.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
				//Display.renderer.shadowMap.type = THREE.VSMShadowMap;

				scene.remove(Display.lights[1]);

				this.adapter.turnOn();

				this.updateDistance();


			} else {

				Display.renderer.shadowMap.enabled = false;

				this.adapter.turnOff();

				scene.add(Display.lights[1]);
			}

			ItemDisplay.clearProgramByCallback();

			UIPrefs.updateCheckbox("prefs-csm", isOn, noSave);
		},


		updateDistance() {

			this.adapter.updateCameraFar();

			var k = Display.maxDistance / 300;
			//this.adapter.setBias(-0.3e-4 * k, -0.8e-4 * k, -2e-4 * k, -4e-4 * k);
			//BAD this.adapter.setBias(-2e-4 * k, -3e-4 * k, -3e-4 * k, -5e-4 * k);

			//this.adapter.setBias(-0.32e-4 * k, -0.8e-4 * k, -2e-4 * k, -5e-4 * k); // 2024.05. (0.06, 0.15, 0.35, 1)

			this.adapter.setBias(-0.32e-4 * k, -0.8e-4 * k, -1.9e-4 * k, -4.8e-4 * k, -5e-4 * k); // 2024.06. (0.06, 0.15, 0.35, 0.9)
		},


		updateLightIntensity(value) { // called from Display

			console.assert(value > 0);

			this.adapter.csm.lights.forEach(l => l.intensity = value);
		},

	},


	fps: {

		name: "fps",
		setting: 1,
		defaultValue: 2,

		set(n = this.defaultValue, noSave) {

			if ( !(n >= 1 && n <= 4) )
				return Report.warn("allowed fps settings: 1..4");

			var fps =
				n === 1 ? 25 :
				n === 2 ? 30 :
				n === 3 ? 40 :
				60;

			Engine.renderInterval = 1 / fps;

			this.setting = n;
			UIPrefs.updateRadioBtn("prefs-fps", n, noSave);
		}
	},



	visDistance: {

		name: "visDistance",
		setting: 1,
		defaultValue: 1,

		set(n = this.defaultValue, noSave) {

			if ( !(n >= 1 && n <= 4) )
				return Report.warn("allowed visDistance settings: 1..4");

			Display.setMaxDistance(
				n === 1 ? 200 :
				n === 2 ? 300 :
				n === 3 ? 400 :
				500
			);

			this.setting = n;
			UIPrefs.updateRadioBtn("prefs-visDistance", n, noSave);
		}
	},


	aa: {

		name: "aa",
		setting: 3,
		defaultValue: 3,

		set(n = this.defaultValue, noSave) {

			if ( !(n >= 1 && n <= 4) )
				return Report.warn("allowed aa settings: 1..4");

			n = Display.setupRenderer(n);

			this.setting = n;
			UIPrefs.updateRadioBtn("prefs-aa", n, noSave);
		}
	},


	ss: {

		name: "ss",
		isOn: false,
		defaultValue: false,

		set(isOn = this.defaultValue, noSave) {

			this.isOn = !!isOn;

			Display.setSS(this.isOn ? 4 : 1);

			//UIPrefs.updateCheckbox("prefs-ss", this.isOn, noSave);
			UIPrefs.updateCheckbox("prefs-ss", this.isOn, true); // don't save
		},

	},


	showPolyhedra: {

		name: "showPolyhedra",
		isOn: false,
		defaultValue: false,

		set(isOn = this.defaultValue, noSave) {

			this.isOn = !!isOn;

			//VisibilityCircle.DebugPolyhedra.toggle(this.isOn);
			VCDebug.Edges.toggle(this.isOn);

			UIPrefs.updateCheckbox("prefs-showPolyhedra", this.isOn, noSave);
		},


		update() { VCDebug.Edges.update() },
	},


	showGrid: {

		name: "showGrid",
		isOn: false,
		defaultValue: false,

		set(isOn = this.defaultValue, noSave) {

			this.isOn = !!isOn;

			this.update();

			UIPrefs.updateCheckbox("prefs-showGrid", this.isOn, noSave);
		},

		update() {
			//Messages.add("not implemented");
			//Main.area && Main.area.displayIndex.tileset.toggle(this.isOn);
		},
	},



	polygonOp: {

		name: "polygonOp",
		setting: 1,
		defaultValue: 1,

		set(n = this.defaultValue, noSave) {

			if ( !(n >= 1 && n <= 2) )
				return Report.warn("allowed polygonOp settings: 1..2");

			this.setting = n;
			UIPrefs.updateRadioBtn("prefs-polygonOp", n, noSave);
		},
	},



	polygonUnionShow: {

		name: "polygonUnionShow",
		isOn: false,
		defaultValue: false,

		set(isOn = this.defaultValue, noSave) {

			this.isOn = !!isOn;

			if (this.isOn)
				this.show();
			else
				this.clear();

			UIPrefs.updateCheckbox("prefs-polygonUnionShow", this.isOn, noSave);
		},


		clear() {

			Object.values(CGroup.byId).forEach( cGroup => cGroup.showTurnOff() );

			Util.filterInPlace( scene.children, mesh => {

				if ( this.isPolygonUnionMesh(mesh) )
					mesh.geometry.dispose();
				else
					return true;
			});
		},


		isPolygonUnionMesh(mesh) {

			if ( !mesh.name.startsWith("[Polygon") )
				return;

			if (0
				|| mesh.material === Assets.materials.line.cGroup
				|| mesh.material === Assets.materials.line.cGroupRC1
			)
				return true;
		},


		show() {

			this.clear();
			CGroup.show();
		},


		update() { this.isOn && this.show() },
	},



	polygonShow: {

		name: "polygonShow",
		isOn: false,
		defaultValue: false,

		set(isOn = this.defaultValue, noSave) {

			this.isOn = !!isOn;

			if (this.isOn)
				this.show();
			else
				this.clear();

			UIPrefs.updateCheckbox("prefs-polygonShow", this.isOn, noSave);
		},


		clear() {

			Util.filterInPlace( scene.children, mesh => {

				if ( mesh.name != 'UIPrefs.polygonShow' )
					return true;

				mesh.geometry.dispose();
			});
		},


		show() {

			this.clear();

			var lineSegments = [];

			UIPrefs.getItemsForPolygonShow().forEach(item => {

				if ( item.isUnit() )
					return;

				if ( item.isRayTransparent() && !item.isColliding() )
					return;

				var polygon = item.getPolygon( item.isColliding() ? 0 : undefined );

				polygon.addToGeometry(lineSegments);
			});

			var mesh = new THREE.Mesh(

				new LineSegmentsGeometry().setPositions(lineSegments),
				Assets.materials.line[ 'polygon' ]
			);

			mesh.renderOrder = -1000;
			mesh.name = 'UIPrefs.polygonShow';
			scene.add(mesh);
		},


		update() { this.isOn && this.show() },
	},


	getItemsForPolygonShow() {

		if (!Display.cameraView)
			return [];

		var sector = Display.cameraView.sector.clone();

		sector.radius = 110;
		sector.enlarge(+25);

		var items = Main.area.spatialIndex.getAllItemsUsingShape( sector );

		return Util.filterInPlace( items, item => sector.overlapsCircleByLR(item.getBoundingCircle()) );
	},

}




export { UIPrefs }

