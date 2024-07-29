//
// ES5; Lang is not avail. yet
//

var LoadingScreen = {

	intervalId: 0,
	stage: 0,
	nLoaded: [ 0, 0 ],
	size: [ 0, 0 ],
	stageAllLoaded: [],
	cntZeroSize: 0,
	lastWidth01: 0,

	stageMax: 2,
	totalSize: [ 2.4e+6, 2.4e+6 ],
	totalNLoaded: [ 210, 49 ],


	lang: {

		get(key) { return this.data[ key ] },

		data: {
			"loader-hdr": 			"Loading",
			"loader-bar-hdr-0-msg": "Codebase",
			"loader-bar-hdr-1-msg": "3D Assets",
			"loader-bar-hdr-2-msg": "Initialization",
		},
	},


	detectWebGL() {

		var canvas = document.createElement('canvas');

		var opts = {
			failIfMajorPerformanceCaveat: true
		};

		var ctx = window.WebGL2RenderingContext && canvas.getContext('webgl2', opts);

		//if (!ctx)
		//	window.WebGLRenderingContext && canvas.getContext('webgl', opts);

		return !!ctx;
	},


	start() { // stage 0 starts

		var el = document.getElementById('loader-hdr');
		el.textContent = this.lang.get('loader-hdr');

		performance.setResourceTimingBufferSize(2000);

		this.intervalId = setInterval( () => this.onUpdate(), 300 );

		this.onUpdate();
	},


	onUpdate() {

		var n = this.stage;

		if (n <= 1)
			this.updateStage01(n);

		for (let i = n; i <= this.stageMax; i++)
			this.updateStageMsg(i);
	},


	updateStage01(n) {

		var entries = performance.getEntriesByType("resource");

		for (let i = this.nLoaded[n]; i < entries.length; i++) {

			let size = entries[i].encodedBodySize;

			if (size === 0)
				this.cntZeroSize ++;

			this.size[n] += size;

//console.log(entries[i].encodedBodySize, entries[i]);
		}

		this.nLoaded[n] = entries.length;

		var el = document.getElementById('loader-progress-bar-stage' + n);


		if (this.cntZeroSize > 5) { // unpkg gives size 0

			let totalNLoaded = this.totalNLoaded[n];
			let nLoaded = this.stageAllLoaded[n] ? totalNLoaded : this.nLoaded[n];
			let width = Math.max( this.lastWidth01, Math.ceil( Math.min(1, nLoaded / totalNLoaded) * 100 ) );

			el.style.width = width + "%";
			this.lastWidth01 = width;

			return;
		}


		var totalSize = this.totalSize[n];
		var size = this.stageAllLoaded[n] ? totalSize : this.size[n];
		var width = Math.max( this.lastWidth01, Math.ceil( Math.min(1, size / totalSize) * 100 ) );

		el.style.width = width + "%";
		this.lastWidth01 = width;
	},


	updateStageMsg(n) {

		var el = document.getElementById(`loader-bar-hdr-${n}`);
 
		if (!el) {
			Report.warn("no element, update stopped", `loader-bar-hdr-${n}`);
			clearInterval(this.intervalId);
			return;
		}

		var text = this.lang.get(`loader-bar-hdr-${n}-msg`);

		if (n <= 1) {

			let	totalSize = this.totalSize[n],
				size = this.stageAllLoaded[n] ? totalSize : Math.min(totalSize, this.size[n]);

			//text += `(${(size / 1e6).toFixed(1)} / ${(totalSize / 1e6).toFixed(1)} MB)`;
		}

		el.textContent = text;
	},


	onCompleteStage(n) {

		console.assert(n === this.stage);

		this.stageAllLoaded[n] = true;

		this.onUpdate();

		performance.clearResourceTimings();

		if (n <= 1) { // stages 0,1: using performance / ResourceTimings
			this.stage = n + 1;

		} else {
			clearInterval(this.intervalId); // stage 2: updateProgressStage3()
		}

		console.log(`LoadingScreen onCompleteStage ${n}: nLoaded=${this.nLoaded[n]}`
			+ ` size=${this.size[n].toExponential(1)}`);
	},


	updateProgressStage2(percent) {

		var el = document.getElementById('loader-progress-bar-stage2');
		el.style.width = percent + "%"
	},


	removeBg() {

		clearInterval(this.intervalId);

		var el = document.getElementById('loader-bg');
		el.style.display = "none";
	},


	// ===============================================================

	setupTextOutput(text) {

		var bodyEl = document.querySelector('body');

		while (bodyEl.firstChild)
			bodyEl.removeChild(bodyEl.firstChild);

		var preEl = document.createElement('pre');

		preEl.textContent = text;

		bodyEl.appendChild(preEl);
		bodyEl.style.overflow = "auto";

		Engine.stop();

		console.log(`Text length: ${text.length}`);
	},


	exportMesh(mesh) {

		mesh = new THREE.Mesh(mesh.geometry); // set material - prevent from exporting textures

		new GLTFExporter().parse( mesh, (gltf) => {
			this.setupTextOutput( JSON.stringify(gltf) );
		});
	},

}



