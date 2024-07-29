
var ScreenChainTestInfo = {

	isItemInfo: true,
	aspectRatio: Infinity,
	widthFractionMax: 0.32,
	widthMax: 450,
	hasFullHeight() {},
	bgName: "medium-paper4",

	checkItem(item) { return item && item.isChainTest() },

	mainElem: document.querySelector("#chaintestinfo-main"),


	item: null,

	P2Box: new THREE.Box3(
		new THREE.Vector3(-9, 0.25, -1.5),
		new THREE.Vector3(9, 15, 1.5),
	),

	dLMin: 0,
	dLMax: 10,

	_ctrlX: null,
	_ctrlY: null,
	_ctrlZ: null,
	_ctrlDL: null,

	_line3: new THREE.Line3,
	_lineMeshes: {},


	close() {

		this.removeHelpers();

		this.item = null;

		for (let key in this._lineMeshes)
			scene.remove( this._lineMeshes[key] );
	},


	open(item) {

		this.item = item;

		var amountMult = 0.0002;
		var fasterAmountMult = 0.006;

		var amountMultDL = 0.00005;
		var fasterAmountMultDL = 0.002;

		this._ctrlX = new ElementHelper.BtnController({ amountMult, fasterAmountMult });
		this._ctrlY = new ElementHelper.BtnController({ amountMult, fasterAmountMult });

		this._ctrlZ = new ElementHelper.BtnController({

			amountMult,
			fasterAmountMult: fasterAmountMult * 0.7
		});

		this._ctrlDL = new ElementHelper.BtnController({

			amountMult: amountMultDL,
			fasterAmountMult: fasterAmountMultDL
		});
	},


	update() {

		try {
			this.update_1();

		} catch (e) {
			Report.warn("update", e);
		}
	},


	pressEsc() {
		Main.selectedItemSet()
	},


	clickSwitchAnimDirection() {

		var el = this.mainElem.querySelector("#chaintest-switch-animDirection");

		this.item.setFeatureValue2('animDirection', el.checked ? 1 : 0);

		UI.update();
	},


	clickSwitchRope() {

		var el = this.mainElem.querySelector("#chaintest-switch-rope-0");

		this.item.setFeatureValue2('rope', el.checked ? 1 : 0);

		this.removeHelpers();
		this.item.updateDisplay();
		UI.update();
	},


	clickSwitchCW() {

		var el = this.mainElem.querySelector("#chaintest-switch-cw-0");

		this.item.setFeatureValue2('cw', el.checked ? 1 : 0);

		this.removeHelpers();
		this.item.updateDisplay();
		UI.update();
	},


	removeHelpers() {

		var chain = this.item.display.chains.chains[0];

		chain.Pshow.showOff();
		chain.line3Show.showOff();
	},


	updatePerFrame() {
		this.updatePerFrame_readControls();
		this.updatePerFrame_lineMeshes();
	},


	updatePerFrame_readControls() {

		var updated;

		var btnData = this._ctrlDL.read();

		if (btnData.amount) {

			var dL = this.item.getDL();

			dL += btnData.amount * (btnData.direction == '-' ? -1 : 1);

			this.item.setDL( Util.clamp(dL, this.dLMin, this.dLMax) );

			updated = true;
		}


		var v = this.item.getP2();

		var checkUpdate = (ctrl, componentIndex) => {

			var btnData = ctrl.read();

			if (!btnData.amount)
				return;

			var value = v.getComponent(componentIndex);

			value += Util.froundPos( btnData.amount * (btnData.direction == '-' ? -1 : 1) );

			v.setComponent(componentIndex, value);
			updated = true;
		};


		checkUpdate(this._ctrlX, 0);
		checkUpdate(this._ctrlY, 1);
		checkUpdate(this._ctrlZ, 2);

		if (updated) {

			let P2Box = this.getP2Box();

			v.clamp( P2Box.min, P2Box.max );

			this.item.setP2(v);

			// recompute chains (incl.screen data) even if not visible by camera
			this.item.display.update();
			UI.update();
		}
	},


	updatePerFrame_lineMeshes() {

		for (let key in this._lineMeshes)
			scene.remove( this._lineMeshes[key] );

		var v = this.item.getP2();

		this.updateLineMesh('x', v, 0);
		this.updateLineMesh('y', v, 1);
		this.updateLineMesh('z', v, 2);

		this.updateLineMesh('phi1', v);
		this.updateLineMesh('phi', v);

		this.updateLineMesh('tangent', v);
	},


	allowShowPhi() {

		var chain = this.item.display.chains.chains[0];

		var errorIsOK = !chain.errorId
			|| chain.errorId == 'case2';

		return !chain.isNonCircular() && chain.data.dL > 0 && errorIsOK;
	},


	getP2Box() { return this.item.spec.data.P2Box || this.P2Box },


	updateLineMesh(key, v, componentIndex, updated) {

		var matName;
		var y0 = 0.08;
		var line3 = this._line3;
		var P2Box = this.getP2Box();
		var chain = this.item.display.chains.chains[0];

		console.assert( this.item.display.chains.chains.length === 1 );

		if (key == 'tangent') {

			if (!chain.isNonCircular() || !chain.data.dL)
				return;

			matName = 'chainTestTangent';

			line3.start.copy( chain.P );
			line3.end.copy( chain.P );
			line3.end.x += chain.derivatives.x;
			line3.end.y += chain.derivatives.y;

			line3.applyMatrix4( chain.localToWorld );


		} else if (key == 'phi') {

			if (!this.allowShowPhi())
				return;

			matName = 'chainTestPhi';

			line3.start.set( Math.cos(chain.phi), Math.sin(chain.phi), 0 )
				.multiplyScalar( chain._rRoll );

			line3.end.set( 0, 0, 0 );

			line3.applyMatrix4( chain.localToWorld );


		} else if (key == 'phi1') {

			if (chain.isNonCircular())
				return;

			matName = 'chainTestPhi1';

			line3.start.set( Math.cos(chain.phi1), Math.sin(chain.phi1), 0 )
				.multiplyScalar( chain._rRoll );

			line3.end.set( 0, 0, 0 );

			line3.applyMatrix4( chain.localToWorld );


		} else if (componentIndex === 0) {

			matName = 'chainTestX';
			line3.start.set(P2Box.min.x, y0, v.z);
			line3.end.set(P2Box.max.x, y0, v.z);

		} else if (componentIndex === 1) {

			matName = 'chainTestY';
			line3.start.set(v.x, y0, v.z);
			line3.end.set(v.x, v.y, v.z);

		} else {
			matName = 'chainTestZ';
			line3.start.set(v.x, y0, P2Box.min.z);
			line3.end.set(v.x, y0, P2Box.max.z);
		}


		var mesh = this._lineMeshes[key];

		if (!mesh) {

			mesh = line3.createMesh(matName);

			this._lineMeshes[key] = mesh;

			mesh.name = `chainTest ${key}`;

			if (typeof componentIndex == 'number') // in item local space
				mesh.matrix.copy( this.item.display.mesh.matrix ); // item doesn't move

			mesh.matrixAutoUpdate = false; // item can change

			scene.add(mesh);
			return;
		}


		var instanceStart = mesh.geometry.attributes.instanceStart.data;
		var instanceEnd = mesh.geometry.attributes.instanceEnd.data;

		var updateArray = (i, val) => {

			if ( instanceStart.array[i] !== Math.fround(val) ) { // <-- !

				instanceStart.array[i] = instanceEnd.array[i] = val;
				return true;
			}
		}

		var updatedCnt = 0;

		updateArray(0, line3.start.x) && updatedCnt ++;
		updateArray(1, line3.start.y) && updatedCnt ++;
		updateArray(2, line3.start.z) && updatedCnt ++;
		updateArray(3, line3.end.x) && updatedCnt ++;
		updateArray(4, line3.end.y) && updatedCnt ++;
		updateArray(5, line3.end.z) && updatedCnt ++;

		if (updatedCnt) {

			instanceStart.version ++;
			instanceEnd.version ++;

			mesh.geometry.boundingSphere = null;
			mesh.geometry.boundingBox = null;
		}

		if (typeof componentIndex == 'number') // in item local space
			mesh.matrix.copy( this.item.display.mesh.matrix ); // item doesn't move

		scene.add(mesh);
	},

}


ScreenChainTestInfo.update_1 = function() {

	var select = (arg) => this.mainElem.querySelector(arg);


	select("#item-name").textContent = this.item.getLangName();

	select("#chaintest-switch-animDirection").checked = !!this.item.getFeatureValue2('animDirection');

	select("#chaintest-switch-rope-0").checked = !!this.item.getFeatureValue2('rope');

	select("#chaintest-switch-cw-0").checked = !!this.item.getFeatureValue2('cw');


	var P2Box = this.getP2Box();
	var P2 = this.item.getP2();

	var updateComponent = (componentIndex) => {

		var name = componentIndex === 0 ? 'x' : componentIndex === 1 ? 'y' : 'z';
		var value = P2.getComponent( componentIndex );

		select(`#${name}-val`).textContent = value.toFixed(3);

		var isMinValue = value === P2Box.min.getComponent( componentIndex );
		var isMaxValue = value === P2Box.max.getComponent( componentIndex );

		this.mainElem.querySelectorAll(`#btn-${name}-left`).forEach( el =>
			el.classList[ isMinValue ? 'add' : 'remove' ]('btn-2-inactive') );

		this.mainElem.querySelectorAll(`#btn-${name}-right`).forEach( el =>
			el.classList[ isMaxValue ? 'add' : 'remove' ]('btn-2-inactive') );
	};


	updateComponent(0);
	updateComponent(1);
	updateComponent(2);


	var chain = this.item.display.chains.chains[0];

	select("#psi-val").textContent = Util.fround( chain.psi, 3 );

	if (!chain.isNonCircular()) {

		select("#phi1-block").style.display = 'flex';
		select("#phi1-val").textContent = Util.fround( chain.phi1, 4 );

	} else
		select("#phi1-block").style.display = 'none';

	if (this.allowShowPhi()) {

		select("#phi-block").style.display = 'flex';
		select("#phi-val").textContent = Util.fround( chain.phi, 4 );

	} else
		select("#phi-block").style.display = 'none';


	var errorId = chain.errorId;

	select("#chaintest-error-isInside").style.display = errorId == 'isInside' ? '' : 'none';
	select("#chaintest-error-case2").style.display = errorId == 'case2' ? '' : 'none';
	select("#chaintest-error-excessDL").style.display = errorId == 'excessDL' ? '' : 'none';

/*
	select("#section-dL").style.display = chain.isNonCircular() ? 'none' : '';

	if (chain.isNonCircular())
		return;
*/
	select("#section-dL").style.display = 'none';
	return;

/*
	var dL = this.item.getDL();
	var r = chain._rRoll;

	select("#section-dL-angle").style.display = chain.isNonCircular() ? 'none' : 'flex';

	if (!chain.isNonCircular()) {

		select("#dL-radius").textContent = Util.froundPos(r);
		select("#dL-angle").textContent = Util.fround(dL / r, 4);
		//select("#dL-angle-fract").textContent = Util.fround(dL / r / Math.PI, 4);
	}

	select("#dL-val").textContent = dL.toFixed(3);// + ' m';

	this.mainElem.querySelectorAll(`#btn-dL-left`).forEach( el =>
		el.classList[ dL === this.dLMin ? 'add' : 'remove' ]('btn-2-inactive') );

	this.mainElem.querySelectorAll(`#btn-dL-right`).forEach( el =>
		el.classList[ dL === this.dLMax ? 'add' : 'remove' ]('btn-2-inactive') );
*/
}



ScreenChainTestInfo.mainElem.innerHTML = getUIElem("chaintestinfo-main").innerHTML;




export { ScreenChainTestInfo }

