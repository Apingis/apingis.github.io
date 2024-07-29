
var Label2D = {

	HOLD_T: 150,

	elemItem: document.querySelector("#item-hover-3d"),
	elemChar: document.querySelector("#char-hover-3d"),

	curElem: null,

	curItem: null,
	curDistance: 0,
	holdItem: null,
	holdItemDate: 0,

	tempV: new THREE.Vector3,


	update() {

		var item = mouseRaycaster.item;

		if ( item && !item.canShowLabel2D() )
			item = null;

		if (this.curElem) {

			if (item === this.curItem) {

				if ((Engine.frameNum & 15) === 0)
					this.updateContent(this.curElem, item);

				this.updatePosition(this.curElem, item);
				return;
			}

			// Item change: immediately hide label.
			this.removeLabel();
		}

		console.assert(!this.curElem && !this.curItem);

		if (!item) {
			this.holdItem = null;
			return;
		}

		if (item != this.holdItem) { // Item change goes "on hold".
			this.holdItem = item;
			this.holdItemDate = Date.now();
			return;
		}

		console.assert(item && this.holdItem);

		if (this.holdItemDate > Date.now() - this.HOLD_T)
			return;

		this.holdItem = null;
		this.curItem = item;

		this.addLabel(item);
	},


	removeLabel() {

		this.curElem.style.display = "none";
		this.curElem = null;
		this.curItem = null;
	},


	addLabel(item) {

		this.curElem = item.isChar() ? this.elemChar : this.elemItem;
		this.curElem.style.display = "";

		this.updateContent(this.curElem, item);
		this.updatePosition(this.curElem, item);
	},


	updateContent(elem, item) {

		if (!item.isChar()) {

			this.updateHoverContent(elem, item);
			return;
		}


		var select = (arg) => elem.querySelector(arg);


		select("#hover-name").textContent = item.getLangName();

		var distance = mouseRaycaster.distance;

		//elem.children[0].textContent =
		//	`${item.spec.name}`;// ${distance.toFixed(0)}m`;

		var canvas = item.display2D.getImage2D({ key: "Label2D", noStyle: true });

		var el = select("#char-hover-3d-img-wrapper");

		if (el.firstChild)
			el.removeChild(el.firstChild);

		el.appendChild(canvas);

		canvas.classList.add("char-img");
	},


	updatePosition(elem, item) {

		var canvas = Display.canvas,
			camera = Display.camera,
			pt = mouseRaycaster.intersectionPoint;

		if (item instanceof Unit) {
			this.tempV.set(item.position.x, item.getHeight(), item.position.z);

		} else {
			//this.tempV.set(pt.x, item.height, pt.z); // place hover above intersection pt.
			var bCircle = item.getPolygon().getBoundingCircle();
			this.tempV.set(bCircle.x, item.position.y + item.getHeight(), bCircle.y); // above geometric center
		}

		this.tempV.project(camera);


		var domRect = elem.getBoundingClientRect(); // TODO don't do this every frame

		var x = Math.floor((this.tempV.x * .5 + .5) * canvas.clientWidth - domRect.width / 2);
		var y = Math.floor((this.tempV.y * -.5 + .5) * canvas.clientHeight - domRect.height);

		y -= 15;

		x = Util.clamp(x, 0, Math.max(0, window.innerWidth - domRect.width) );
		y = Util.clamp(y, 0, Math.max(0, window.innerHeight - domRect.height) );

		// Oops...
/* TODO +positioning
		var mousePos = Controls.mouseCurrPos;

		if (mousePos.x >= domRect.left && mousePos.x <= domRect.right
*/
		elem.style.left = x + "px";
		elem.style.top = y + "px";
	},


	updateHoverContent(baseEl, item) {

		try {
			this.updateHoverContent_1(baseEl, item);

		} catch (e) {
			console.log(e);
			Report.warn("updateHoverContent", `id=${baseEl && baseEl.id} ${item}`);
		}
	},


	// TODO? auto-update on tree growth etc.
	updateHoverContent_1(baseEl, item) {

		var is3D = baseEl.id.endsWith("-3d");

		var select = (arg) => baseEl.querySelector(arg);

		var el;

		select('#hover-name').textContent = item.getLangName();
/*
		var descr = item.getLangDescr();

		el = baseEl.querySelector('#hover-descr');
		el.style.display = descr ? "block" : "none";
		el.textContent = descr;
*/

		var props = item.getProps();
		var isAxe = item.isAxe();

		if (is3D)
			return this.updateHoverContent_3D_only(baseEl, item);


		var showCost = props.canSell() && !item.isInShop();

		select('#hover-cost').style.display = showCost ? "" : "none";

		if (showCost)
			select('#hover-cost-val').textContent = Util.formatCoins( props.getSellCost() );


		select('#hover-hitStrength').style.display = props.hitStrength ? "" : "none";
		select('#hover-hitRate').style.display = props.hitRate ? "" : "none";
		select('#hover-equipSpeed').style.display = props.equipSpeed ? "" : "none";
		select('#hover-hitStrengthVsTree').style.display = props.addHitStrengthVsTree ? "inline" : "none";

		if (isAxe) {

			select('#hover-hitStrength-val').textContent = props.hitStrength;

			let elHitRate = select('#hover-hitRate-val');

			elHitRate.textContent = (props.hitRate > 0 ? "+" : "") + props.hitRate + "%";
			elHitRate.style.color = props.hitRate > 0 ? '' : '#500';
			elHitRate.style['font-weight'] = props.hitRate > 0 ? '' : 'bold';

			let elEquipSpeed = select('#hover-equipSpeed-val');

			elEquipSpeed.textContent = (props.equipSpeed > 0 ? "+" : "") + props.equipSpeed + "%";
			elEquipSpeed.style.color = props.equipSpeed > 0 ? '' : '#500';
			elEquipSpeed.style['font-weight'] = props.equipSpeed > 0 ? '' : 'bold';

			select('#hover-hitStrengthVsTree-val').textContent = props.getHitStrengthVsTree();
		}

	},


	updateHoverContent_3D_only(baseEl, item) {

		var select = (arg) => baseEl.querySelector(arg);

		var isTree = item.isTree();

		select('#hover-trunk-height').style.display = isTree ? "" : "none"
		select('#hover-base-radius').style.display = isTree ? "" : "none";
		select('#hover-branches').style.display = isTree ? "" : "none";

		if (isTree) {

			select('#hover-trunk-height-val').textContent
				= Util.format( item.spec.tree.maxHeight, 1, false );

			select('#hover-base-radius-val').textContent
				= Util.format( item.spec.tree.baseRadius, 2, false );

			select('#hover-branches-val').textContent = item.getNumBranches();
		}


		select('#hover-radius').style.display = item.isLog() || item.isStump() ? "" : "none";

		if (item.isLog() || item.isStump()) {

			let r = item.isLog() ? item.getLogRadius() : item.getRadius();

			select('#hover-radius-val').textContent = Util.format( r, 2, false );
		}

		select('#hover-mass').style.display = item.isLog() ? "" : "none";

		if (item.isLog())
			select('#hover-mass-val').textContent = Util.formatMass( item.getLogMass() );


		select('#hover-container-empty').style.display = item.isContainer() && item.isEmpty() ? '' : 'none';

		var isNonEmptyContainer = item.isContainer() && !item.isEmpty();

		select('#hover-container-logs').style.display = isNonEmptyContainer ? '' : 'none';

		if ( isNonEmptyContainer )
			select('#hover-container-logs-val').textContent
				= Util.formatVolume( item.getSummary().volume );
	},


};




export { Label2D };

