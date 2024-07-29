
import { Item } from './Item.js';


class Tree extends Item {

	constructor(spec) {

		super(spec);

	}


	isTree() { return true; }

	isUnmodifiedTree() { return !this.tree || this.tree.chopAzimuth === null; }

	isChoppedTree() { return this.tree && this.tree.choppedT !== 0; }

	isFallingTreeAt(t) { return this.isChoppedTree() && this.getFallingCompleteT() > t }

	isFallenTreeAt(t) { return this.isChoppedTree() && this.getFallingCompleteT() <= t }

	isFallingTree() { return this.isFallingTreeAt(Engine.time) }

	isFallenTree() { return this.isFallenTreeAt(Engine.time) }

	isAxeTarget() { return true; }

	isSmallTree() { return this.getTreeSpec().logs.length === 0; }


	getTreeSpec() { return this.spec.tree; }

	getMaxHeight() { return this.getTreeSpec().maxHeight || 0 }


	getFallingTime() {

		var hMaxT = 7;
		var h = Math.min(hMaxT, this.getMaxHeight());

		return (Tree.fallingTMax - Tree.fallingTMin) / hMaxT * h + Tree.fallingTMin;
	}


	getFallingCompleteT() {
		return Math.ceil( (this.tree.choppedT + this.getFallingTime()) * 2 ) / 2;
	}


	getNumBranches() {

		return this.isUnmodifiedTree() ? this.getTreeSpec().branches.length
			: this.tree.branches.reduce((acc, b) => acc += (b.removed ? 0 : 1), 0);
	}


	isCrumbling() { return this.isChoppedTree(); }

	getCrumbleT() {
		if (this.isChoppedTree())
			return Math.floor(this.updateT + this.getCrumblingT());
	}


	getCrumblingT() {

		const hMin = 4, hMax = 8;

		var hNorm = (Util.clamp( this.getMaxHeight(), hMin, hMax ) - hMin) / (hMax - hMin);

		return Tree.crumbleT * (Tree.crumbleTFractionMin + hNorm * (1 - Tree.crumbleTFractionMin));
	}


	createTreeData() {

		if (this.tree)
			return;

		this.tree = {

			choppedT: 0,
			chopAzimuth: null,
			branches: null,
			cuts: null,
			logs: null,

			_allCutsCompleted: null, // = allOperationsCompleted
			_allLogsCarriedAway: null, // set by woodcutting task
		};

		var treeSpec = this.getTreeSpec();

		this.tree.branches = treeSpec.branches.map(branchSpec => {

			return {
				spec: branchSpec,
				removed: false,
			};
		});

		this.tree.cuts = treeSpec.cuts.map(cutSpec => {

			return {
				spec: cutSpec,
				dPRemain: cutSpec.dPoints,

				get completed() { return this.dPRemain <= 0; },

				getDPRemainNorm() { return Util.clamp(this.dPRemain / cutSpec.dPoints, 0, 1); },
			};
		});

		this.tree.logs = treeSpec.logs.map(logSpec => {

			return {
				spec: logSpec,
				separated: false,
			};
		});
	}


	initTreeData(treeData) {

		if (!treeData)
			return;

		this.createTreeData();

		this.tree.choppedT = treeData.choppedT;
		this.tree.chopAzimuth = treeData.chopAzimuth;

		this.setupBranchesFromDBData(treeData.branches);
		this.setupCutsFromDBData(treeData.cuts);

		this.tree.logs.forEach(log => {

			if (this.logHasSeparationCondition(log))
				log.separated = true;
		});

		if (Main.isServer)
			return;


		if (this.isChoppedTree()) {

			this.enqueueDisplayUpdateEvents();
			this.createStump();
		}

		if (this.isFallingTree()) {

			this.setupFalling();
		}
	}


	setupBranchesFromDBData(val) {

		if (!Number.isInteger(val) || val < 0) {
			Report.warn("bad DB branches", `val=${val}`);
			val = 0;
		}

		for (let i = this.tree.branches.length - 1; i >= 0; i--) {

			this.tree.branches[i].removed = (val & (1 << i)) !== 0;
		}
	}


	getBranchesDBData() {

		var val = 0;

		for (let i = this.tree.branches.length - 1; i >= 0; i--) {

			if (this.tree.branches[i].removed)
				val |= (1 << i);
		}

		return val;
	}


	setupCutsFromDBData(str) {

		for (let i = 0; i < this.tree.cuts.length; i++) {

			var cut = this.tree.cuts[i];

			cut.dPRemain = Util.intFromStr(str, i * 2, 2);
		}
	}


	getCutsDBData() {

		console.assert(this.tree.cuts.length <= 8);

		var str = "";

		for (let i = 0; i < this.tree.cuts.length; i++) {

			str += Util.encodeIntIntoStr(this.tree.cuts[i].dPRemain, 2);
		}

		return str;
	}


	fromJSON(data) {

		super.fromJSON(data);

		if (!data.tree || typeof data.tree.cuts != "string") {
			console.assert(this.createT === this.updateT);
			return;
		}

		this.initTreeData(data.tree);
	}


	getTreeObj() {

		return {
			choppedT: Util.froundT(this.tree.choppedT),
			chopAzimuth: Util.froundPos(this.tree.chopAzimuth),
			cuts: this.getCutsDBData(),
			branches: this.getBranchesDBData()
		};
	}


	toJSON() {

		var data = super.toJSON();

		if (this.tree) // not mandatory
			data.tree = this.getTreeObj();

		return data;
	}


	hasAllCutsCompleted() {

		if (!this.tree)
			return;

		if (this.tree._allCutsCompleted)
			return true;

		if ( this.tree.cuts.every(c => c.completed) ) // array is mandatory
			return (this.tree._allCutsCompleted = true);
	}


	hasAllBranchesRemoved() {
		return this.tree.branches && this.tree.branches.every(b => !b.spec.hasConnected || b.removed);
	}

	hasAllLogsCarriedAway() { return this.tree && this.tree._allLogsCarriedAway }


	setAllLogsCarriedAway() {

		if (!this.tree)
			return Report.warn("set _allLogsCarriedAway: unmodified tree", `${this}`);

		if (this.tree._allLogsCarriedAway)
			return;

		if (!this.hasAllBranchesRemoved())
			return Report.warn("!hasAllBranchesRemoved", `${this}`);

		if (!this.hasAllCutsCompleted())
			return Report.warn("!hasAllCutsCompleted", `${this}`);

		this.tree._allLogsCarriedAway = true;
	}


	getWindObjPhase() { // not persistent

		if (this.data._windObjPhase)
			return this.data._windObjPhase;

		var sprng = Tree._objPhaseSprng || (Tree._objPhaseSprng = new Util.SeedablePRNG);

		sprng.set(
			(this._facing + Math.PI) * 683565275,
			this.position.x * 173,
			this.position.z * 3571
		).roll(2);

		return ( this.data._windObjPhase = sprng.random() ); // not 0?
	}


	getVectorFallen() {

		var v = this._vectorFallen.set(0, this.getMaxHeight(), 0)
			.applyQuaternion(this.quaternion); // simplify?

		return v;
	}


	getCutoffLogsPolygon() { // Could be even less size, OK for the app.

		console.assert(this.isFallenTree());

		var skelLine2 = this._cutoffLogsSkel;

		skelLine2.p1.copyFromVector3(this.position);
		skelLine2.p2.copyFromVector3( this.getVectorFallen() ).add(skelLine2.p1);

		return this._cutoffLogsPolygon.setOBBFromLine2(skelLine2, Tree.cut0RadiusMaxExcess);
	}


	// =========================================================
	//
	//   Tree Modification.
	//
	//
	//		type, index, action,
	//		cI, // expected to contain blocking intervals
	//		aP,
	//		item: this
	//
	// =========================================================

	checkAxeHitPosition(type, index, unitPoint) {

		var positionLocal = type == "branch"
			? this.tree.branches[index].spec.getCutPositionApproximate()
			: this.tree.cuts[index].spec.getCenter()

		var position = this.localToWorld( this._centerV.copy(positionLocal) );
		var p = this._p.copyFromVector3(position);

		var dMax = Math.max(Tree.horizontalDistance, Tree.downwardDistance);
		var dExpectedMax;

		if (type == "branch")
			dExpectedMax = dMax + Tree.branchDistanceMargin;

		else if (type == "cut")
			dExpectedMax = dMax + Tree.cutDistanceMargin;

		else
			dExpectedMax = Tree.horizontalStumpDistance + Tree.cutDistanceMargin;

		dExpectedMax += 0.2;

		var d = unitPoint.distanceToPoint(p);

		if (d > dExpectedMax + 1e-3)
			Report.throw("AxeHitPosition", `d=${d} dExpectedMax=${dExpectedMax}`);
	}


	verifyAxeHit(unit, type, index, t) {

		if (this.isRemoved())
			Report.throw("already removed");

		if (type == "chopStanding") {

			if (this.isChoppedTree())
				Report.throw("already chopped");

			if (index !== 0)
				Report.throw("bad chopStanding index");

			return;
		}

		if (!this.isFallenTreeAt(t))
			Report.throw("not fallen", `${this}`);

		if (type == "branch") {

			let branch = this.tree.branches[ index ];

			if (!branch || branch.removed)
				Report.throw("bad branch", `${unit} ${this.tree} i=${index}`
					+ ` b=${branch} removed=${branch && branch.removed}`);

		} else if (type == "cut") {

			if (index === 0)
				Report.throw("cut: bad index");

			let cut = this.tree.cuts[ index ];

			if (!cut || cut.completed)
				Report.throw("bad cut");

		} else
			Report.throw("bad type");
	}


	doAxeHit_event(unit, oP) {

		var slotId = this.slotId;
		var tree = this;

		if (slotId) {

			// 'this' tree could have been already replaced;
			// anyway it requires replacement w/ persistent item;
			// temporary items are deleted auto.

			if (oP.type != "chopStanding")
				Report.throw("hit w/ slotId: !chopStanding", `type=${oP.type}`);

			if (!this.hasTmpId())
				Report.throw("hit w/ slotId: not tmpId");

			if (this.tree)
				Report.throw("hit w/ slotId: has treeData");


			tree = Item.fromSlotPersistent(slotId, "", Engine.time);

			if (!tree) // Q. Is tree still here?
				return;
		}

		var axe = unit.getEquipRightHand();

		tree.processAxeHit(unit, axe, oP.type, oP.index, Engine.time);

		tree.recordAxeHit(unit, axe, oP, slotId);
	}


	processAxeHit(unit, axe, type = "chopStanding", index = 0, t, localKey) {

		this.createTreeData();

		this.verifyAxeHit(unit, type, index, t);

		this.checkAxeHitPosition(type, index, unit.getPoint());

		// All checks OK
		this.processAxeHit_1(unit, axe, type, index, t, localKey);

		this.setFlagUpdated();
		this.setUpdateT(t); // add-up/modify crumble events
	}


	processAxeHit_1(unit, axe, type, index, t, localKey) {

		var task;

		if (!Main.isServer)
			task = unit.taskList.getUnfinishedTask("TaskCutWood");

		if (task)
			task.cntHits ++;

		if (type == "branch") {

			this.removeBranch(this.tree.branches[ index ]);
			this.updateDisplay(false);

			if (task)
				task.cntBranches ++;

			return;
		}


		var cut = this.tree.cuts[ index ];

		if (type == "chopStanding") {
			let chopAzimuth = this._line2.copyFrom2XVector3(unit.position, this.position).angle();
			this.tree.chopAzimuth = Util.froundPos(chopAzimuth);
		}

		var hitStrength = axe.getProps().getHitStrengthVsTree();

		cut.dPRemain = Math.max(0, cut.dPRemain - hitStrength);

		if (cut.dPRemain > 0) { // cut was NOT completed with this hit
			this.updateDisplay(false);

		} else if (index === 0) {

			this.setChopped(t, localKey);
			this.updateDisplay();

			unit.increaseCntChopped();

			if (task) {
				task.cntChopped ++;
				task.totalMaxHeight += this.getMaxHeight();
			}

		} else {
			this.checkLogSeparation(cut, t, localKey);
			this.updateDisplay();
		}

		Local.getUser(localKey).progress.onAxeHit(unit, this);
	}


	recordAxeHit(unit, axe, oP, slotId) {

		var data = {
			id: this.id,
			axeId: axe.id,
		};

		if (oP.type != "chopStanding") {
			data.type = oP.type;
			data.index = oP.index;
		}

		if (oP.type == "branch")
			data.action = oP.action;

		if (slotId) {
			data.slotId = slotId;
			data.specName = this.spec.name;
		}

		Accounting.addEntry(unit, "axeHit", data);
	}



	logHasAllBranchesRemoved(log) {
		return log.spec.connectedBranches.every(treeSpecBranch =>
			this.tree.branches.find(b => b.spec === treeSpecBranch).removed);
	}

	logHasAllCutsCompleted(log) {
		return log.spec.requiredCuts.every(requiredCut =>
			this.tree.cuts.find(c => c.spec === requiredCut).completed);
	}

	logHasSeparationCondition(log) {
		return this.logHasAllCutsCompleted(log) && this.logHasAllBranchesRemoved(log);
	}


	checkLogSeparation(cut, t, localKey) { // cut was just completed

		this.tree.logs.forEach(log => {

			if (log.separated || log.spec.requiredCuts.indexOf(cut.spec) === -1)
				return;

			if (this.logHasSeparationCondition(log))
				this.separateLog(log, t, localKey);
		});
	}


	separateLog(log, t, localKey) {

		if (log.separated)
			Report.throw("log already separated", `${this} log:${log.spec.name}`);

		log.separated = true;

		var logItem = Item.createPersistent(log.spec.name, localKey);

		logItem.setFlagUpdated();

		logItem.useQuaternion();
		logItem.spec.data.logCutoff.decompose(logItem.position, logItem.quaternion, this._scale);

		logItem.position.applyQuaternion(this.quaternion);
		logItem.position.add(this.position).setY(logItem.spec.y0);

		logItem.quaternion.premultiply(this.quaternion);

		logItem.setCreateT(t);

		logItem.setColor( this.getColor() );

		logItem.setOn3D(t);
	}


	setChopped(t, localKey) {

		this.tree.choppedT = t; // this changes container/polygon

		if (!Main.isServer) {

			this.enqueueDisplayUpdateEvents();

			this.createStump(localKey);

			this.setupFalling();
		}
	}


	getDisplayUpdateEventT(n) {

		if (!this.isChoppedTree()) {
			Report.warn("not chopped", `${this}`);
			return Infinity;
		}

		var crumblingT = this.getCrumblingT();
		var tFactor = Infinity;

		if (n === 1)
			tFactor = Tree.displayEvent1Factor;
		else if (n === 2)
			tFactor = Tree.displayEvent2Factor;

		var t = Math.floor(this.tree.choppedT + tFactor * crumblingT);

		return t;
	}


	enqueueDisplayUpdateEvents() {

		var addEvent = n => {

			var t = this.getDisplayUpdateEventT(n);

			if (t < Engine.time)
				return;

			var e = new ItemEvent(this, "ItemDisplayUpdate", t);
			Main.area.events.add(e);
		};

		addEvent(1);
		addEvent(2);
	}


	createStump(localKey) {

		var stumpSpecId = this.getTreeSpec().getStumpSpecId();

		var stump = Item.createTmp(stumpSpecId, localKey);

		stump.position.set(this.position.x, stump.spec.y0, this.position.z);
		stump.facing = this._facing;

		stump.setCreateT(this.tree.choppedT);

		stump.setColor( this.getColor() );

		stump.setOn3D(this.tree.choppedT);
	}


	setupFalling() {

		this.setupFallingTween();

		// event would fire slightly past completion of tween
		var event = new ItemEvent( this, "FallingComplete", this.getFallingCompleteT() );

		Main.area.events.add( event );
	}


	setupFallingTween() {

		var tNorm = Util.clamp( (Engine.time - this.tree.choppedT) / this.getFallingTime() );

		this.setupFallingTweenQuaternion(tNorm);
		this.setupFallingTweenPosition(tNorm);
	}


	setupFallingTweenPosition(tNorm) {

		var fallingAmount = { t: tNorm };

		// Simplify: only Y-coord. changes
		var targetY = this.getTreeSpec().cut0Radius;

		var tRemains = (1 - tNorm) * this.getFallingTime();

		var fallPositionUpdateFn = () => this.position.setY(fallingAmount.t * targetY);

		new TWEEN.Tween(fallingAmount).to({ t: 1 }, tRemains * 1000)
			.onUpdate(fallPositionUpdateFn)
			.start();
	}


	getFallingStepNum(tNorm) {
		return Tree.fallingConf.findIndex(elem => tNorm <= elem.tNormEnd);
	}


	getTStepRemains(n, tNorm) {

		var	conf = Tree.fallingConf;

		if (tNorm === undefined)
			tNorm = n > 0 ? conf[n - 1].tNormEnd : 0;

		return Util.clamp(conf[n].tNormEnd - tNorm) * this.getFallingTime();
	}


	getFallingAmount(n, tNorm) {

		var conf = Tree.fallingConf;

		var	tStartNorm = n > 0 ? conf[n - 1].tNormEnd : 0,
			tEndNorm = conf[n].tNormEnd,
			amountStart = n > 0 ? conf[n - 1].toAmount : 0,
			amountEnd = conf[n].toAmount;

		var x = conf[n].easing( (tNorm - tStartNorm) / (tEndNorm - tStartNorm) );

		return x * (amountEnd - amountStart) + amountStart;
	}


	setupFallingTweenQuaternion(tNorm) {

		var qStart = this.getFallingStartQuaternion();
		var qEnd = this.getFallingEndQuaternion();

		this.useQuaternion(); // guaranteed tween run before render

		var n = this.getFallingStepNum(tNorm);

		var fallingAmount = { t: this.getFallingAmount(n, tNorm) };


		var fallingQuaternionUpdateFn = () => {

			this.quaternion.slerpQuaternions(qStart, qEnd, fallingAmount.t);

			this.updateDisplayPosition();
		}

		var setupTween = (n, tNorm) => {

			var conf = Tree.fallingConf[n];
			if (!conf)
				return this.onFallingTweenComplete();

			var tStepRemains = this.getTStepRemains(n, tNorm);

			new TWEEN.Tween(fallingAmount).to({ t: conf.toAmount }, tStepRemains * 1000)
				.onUpdate(fallingQuaternionUpdateFn)
				.easing(conf.easing)
				.onComplete( () => setupTween(n + 1) )
				.start();
		}

		setupTween(n, tNorm);
	}


	getFallingDirection() {
		var a = Angle.add(this.tree.chopAzimuth, Math.PI / 2);
		return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
	}

	getFallingStartQuaternion() {
		return new THREE.Quaternion().setFromAxisAngle(Item.axisY, -this._facing);
	}

	getFallingEndQuaternion() {
		var q = new THREE.Quaternion().setFromUnitVectors(Item.axisY, this.getFallingDirection())
			.multiply( this.getFallingStartQuaternion() );
		return Util.froundQuaternion(q);
	}


	onFallingTweenComplete() {
/*
		this.onFallingComplete();

		Accounting.addEntry(this, "fallingComplete");
*/
	}


	onFallingComplete_Event(t) {

		this.onFallingComplete(t);

		Accounting.addEntry(this, "fallingComplete");
	}


	onFallingComplete(t) {

		if (t !== this.getFallingCompleteT() ) {

			if ( Math.abs(t - this.getFallingCompleteT()) > 2 )
				Report.throw("wild falling timing", `${this} ${t} ${this.getFallingCompleteT()}`);

			Report.warn("inaccurate falling timing", `${this} ${t} ${this.getFallingCompleteT()}`);
		}

		this.useQuaternion( this.getFallingEndQuaternion() );

		this.position.y = this.getTreeSpec().cut0Radius;

		this.tree.branches.forEach(branch => {

			var normal = this.localToWorld(
				this._normalV.copy(branch.spec.getCutNormal()),
				true
			);

			if (normal.y <= 0.1)
				this.removeBranch(branch);
		});

		this.updateDisplay();
	}


	removeBranch(branch) {
		
		if (branch.removed)
			return Report.warn("branch already removed", `${this}`);

		branch.removed = true;
	}



	// ============= Props, Display =============

	getRadius() {

		if (this.isFallenTree())
			return this.getPolygon().getBoundingCircle().radius;
		else
			return super.getRadius();
	}


	getHeight() {

		if (this.isFallenTree())
			return this.getPolygon().height;
		else
			return super.getHeight();
	}


	createPolygon(radiusClass) {

		if (this.isChoppedTree())
			return this.getChoppedPolygon(radiusClass);

		return super.createPolygon(radiusClass);
	}


	// for raycast, spatialIndex (what else?). Already transformed.
	getChoppedPolygon(radiusClass = Unit.RadiusClassBase) {

		var createDummyPolygon = () => {

			var pt = this.getPoint();
			var polygon = Polygon.from2Points(pt.x, pt.y, pt.x, pt.y, 0.05);

			polygon.height = 0.05;
			polygon.id = this.id;
			return polygon;
		}


		if ( 0 &&  !this.isFallenTree()) {
			Report.warn("not fallen", `${this}`);
			return createDummyPolygon();
		}

		var log1 = this.tree.logs.find(log => !log.separated);

		var geometry = Util.mergeGeometriesIfExist([ // TODO only clone position attrib.

			//...this.tree.logs.map(log => !log.separated && log.spec.getGeometry()),
			log1 && log1.spec.getGeometry(),
			this.getTreeSpec().getTopGeometryTrunk()
		]);

		//geometry.applyMatrix4(this.getMatrix4()); // no .applyMatrix3

		geometry.applyMatrix4(
			this._mat4.makeRotationFromQuaternion( this.getFallingEndQuaternion() )
				.setPosition(this.position)
		);

		var polygon = ItemSpec.createPolygonFrom3DGeometry(geometry, radiusClass);

		if (!polygon)
			// It requires some polygon for SpatialIndex. ray vs geometry check anyway (TODO? consider)
			return createDummyPolygon();

		polygon.id = this.id;

		return polygon;
	}


	getItemDisplayData() {
		return Item._itemDisplayData.set(0, this.getWindObjPhase(), this.getColor(), 0);
	}


	updateDisplayRect() {

		if ( this.isChoppedTree() )
			return this.updateDisplayRect_Chopped();

		var r = Tree.R_LEAVES;

		this._displayRect.set(-r, -r, r, r)
			.translate( this.position.x, this.position.z );
	}


	updateDisplayRect_Chopped() {

		var rect = this._displayRect.set(0.5, 0.5, 0.5, 0.5);

		var p = new Point().move( this.tree.chopAzimuth, this.getMaxHeight() + Tree.H_LEAVES );

		rect.expandByCoords(p.x, p.y);

		p.move( this.tree.chopAzimuth - Math.PI / 2, Tree.R_LEAVES );
		rect.expandByCoords(p.x, p.y);

		p.move( this.tree.chopAzimuth + Math.PI / 2, Tree.R_LEAVES * 2 );
		rect.expandByCoords(p.x, p.y);

		rect.translate( this.position.x, this.position.z );
	}

	//getMatWeights() { // TODO


	getMesh() {

		var treeSpec = this.getTreeSpec();
		var mesh;

		if (this.isUnmodifiedTree()) {
			mesh = treeSpec.getMesh();

		// individual per-item mesh (may contain shared geometry)
		} else {

			mesh = this.getTrunkMesh()
				.add( this.getLeavesMesh() );
		}

		// item.tree.objPhase
		//mesh.traverse(m => m.userData.windObjPhase = this.objPhase);

		return mesh;
	}


	getTrunkMesh() {

		var treeSpec = this.getTreeSpec();

		return ItemSpec.createDummyMesh(

			this.spec.name + " trunk",

			Util.mergeGeometriesIfExist([

				!this.isChoppedTree() && treeSpec.getStumpGeometry(),
				treeSpec.getTopGeometryTrunk(),
				...this.tree.branches.map(b => !b.removed && b.spec.getGeometryTrunk()),
				...this.tree.logs.map(log => !log.separated && log.spec.getGeometry()),
				...this.tree.cuts.map(cut => this.getCutGeometry(cut)),
			]),

			treeSpec.data.trunkMatName,
			true
		);
	}


	getLeavesMesh() {

		var variant = 0;
		var withBranchLeaves = true;

		if (this.isChoppedTree()) {

			if (Engine.time >= this.getDisplayUpdateEventT(2))
				withBranchLeaves = false;

			if (Engine.time >= this.getDisplayUpdateEventT(1))
				variant = 1;
		}

		var geometries = [ this.getTreeSpec().getTopGeometryLeaves(variant) ];

		if (withBranchLeaves)
			Array.prototype.push.apply(geometries, this.tree.branches.map(b =>
				!b.removed && b.spec.getGeometryLeaves(variant)) );

		return ItemSpec.createDummyMesh(

			this.spec.name + " leaves",
			Util.mergeGeometriesIfExist(geometries),
			this.getTreeSpec().data.leavesMatName,
			true
		);
	}


	getCutGeometry(cut) {

		var dPRemainNorm = cut.getDPRemainNorm();

		if (dPRemainNorm === 0)
			return;

		if (dPRemainNorm === 1)
			return cut.spec.getGeometry();

		var p = this.createCustomCutPolyhedron(cut, dPRemainNorm);

		return p ? p.getGeometry() : cut.spec.getGeometry();
	}


	// cut0: base on .tree.chopAzimuth; other: from the above
	getCutFromPositionLocal(cut) {

		var fromPosition = this.localToWorld( cut.spec.getCenter().clone() );

		if (cut.spec.name == "cut0") {

			let a = Angle.sub(this.tree.chopAzimuth, Math.PI / 2);

			fromPosition.x -= 16 * Math.cos(a);
			fromPosition.y = 0.45;
			fromPosition.z -= 16 * Math.sin(a);

		} else {
			fromPosition.y = 16;
		}

		return this.worldToLocal(fromPosition);
	}


	createCustomCutPolyhedron(cut, dPRemainNorm = cut.getDPRemainNorm()) {

		dPRemainNorm = 0.2 + 0.8 * dPRemainNorm;

		var p = cut.spec.getPolyhedron().clone();

		var cutFromPositionLocal = this.getCutFromPositionLocal(cut);

		var cutRay = this._cutRay.setFrom2Points(
			cutFromPositionLocal,
			cut.spec.getCenter()
		);

		var distanceRange = p.distanceRangeToClosestPointOnRay(cutRay);

		var thickness = distanceRange.max - distanceRange.min;
		var distance = distanceRange.min + thickness * (1 - dPRemainNorm);

		var cutPlane = this._cutPlane.setFromRayAndDistance(cutRay, distance);
/*
TODO concave faces
i=Item.byId(1e8+18);i.createTreeData();i.tree.chopAzimuth=1.57;
p= i.createCustomCutPolyhedron( i.tree.cuts[0], 0.2); p1 = p.clone().scale(20); p1.show(new THREE.Vector3(256,-7,176))
*/
		var faces = p.cutWithPlaneCreateFaces(cutPlane);
		if (!faces)
			return Report.warn("no faces", `${this} cut="${cut.spec.name}"`);

		faces.forEach(face => {

			// UVs for created face

			var polygon = face.getPlanarPolygon().rotate(-Math.PI / 2);

			var uvRectProj = new RectangleProjection(
				polygon.getRect(),
				this._cutUVRect
			);

			polygon.traversePoints((p, i) => face.vertices[i / 2].uv
				.set(uvRectProj.projectX(p.x), uvRectProj.projectY(p.y)) );
		});

		return p;
	}



	// ================= Operation Points ====================

	getTreeFallingBlockCircle() {

		if (this.isChoppedTree())
			Report.warn("chopped", `${this}`);

		var p = this.getPoint();
		var cI = CircumferenceIntervals.from(p.x, p.y, this.getTreeSpec().maxHeight);

		Main.area.spatialIndex.addCollidingIntervals(cI, this, undefined,
			Tree.cut0RadiusMaxExcess + 0.35 );

		return cI;
	}


	addOpPoint(opPointsArray, type, index, action, cI, p, facing) {

		var aP = !p ? null : new ApproachPoint(p.x, p.y, facing, Tree.downwardDistance);

		opPointsArray.push({
			type, index, action,
			cI, // expected to contain blocking intervals
			aP,
			item: this
		});
	}


	addHorizontalOpPoints(opPoints, type, index, centerV, normalV) {

		var cI = CircumferenceIntervals.from(centerV.x, centerV.z, Tree.horizontalDistance);
/*
		if (normalV.y < 0.9) {

			let angle = Math.atan2(normalV.z, normalV.x),
				delta = Math.PI / 6;

			cI.intervals.mergeIn( Angle.normalize(angle - delta), Angle.normalize(angle + delta) );
		}
*/
		this.addOpPoint(opPoints, type, index, "AxeHorizontal", cI);
	}


	// TODO? line opPoint-target is not checked vs obstacles
	addDownwardOpPoints(opPoints, type, index, centerV, normalV) {

		var cutLine = this._line2;
		cutLine.p1.copyFromVector3(centerV);
		cutLine.p2.copyFromVector3(normalV).perp().add(cutLine.p1);

		var d = cutLine.distance();
		cutLine.extend2Ends(Tree.downwardDistance, Tree.downwardDistance - d);

		var facing = cutLine.angle();

		this.addOpPoint(opPoints, type, index, "AxeDownward", null, cutLine.p1, facing);
		this.addOpPoint(opPoints, type, index, "AxeDownward", null, cutLine.p2, Angle.opposite(facing));
	}


	addOpPoints(opPointsArray, type, index, centerV, normalV) {

		centerV = this.localToWorld(this._centerV.copy(centerV));
		normalV = this.localToWorld(this._normalV.copy(normalV), true);

		if (Math.abs(normalV.y) < 0.4) {
			this.addDownwardOpPoints(opPointsArray, type, index, centerV, normalV);

		} else {
			this.addHorizontalOpPoints(opPointsArray, type, index, centerV, normalV);
		}
	}


	getChopStandingOperationPoints(opPoints = []) {

		if (this.isFallenTree()) {
			Report.warn("already chopped", `${this}`);
			return opPoints;
		}

		var fallingBlockCI = this.getTreeFallingBlockCircle();
		if (fallingBlockCI.is360()) {
			//Report.warn("fallingBlockCI.intervals.is360", `${this}`);
			return opPoints;
		}

		// unit-approach-for-chopping: circle & blocking-intervals
		var cI = fallingBlockCI.rotateIntervals(Math.PI / 2);
		cI.circle.radius = Tree.horizontalStumpDistance;

		this.addOpPoint(opPoints, "chopStanding", 0, "AxeHorizontalStump", cI);
	
		return opPoints;
	}


	canDoCutFallen(cut) {
		return !cut.completed
			&& cut.spec.connectedBranches.every(treeSpecBranch =>
				this.tree.branches.find(b => b.spec === treeSpecBranch).removed);
	}


	getCutFallenOperationPoints(opPoints = []) {

		if (!this.isFallenTree()) {
			Report.warn("not fallen", `${this}`);
			return opPoints;
		}

		this.tree.cuts.forEach((cut, i) => {

			if (!this.canDoCutFallen(cut))
				return;

			this.addOpPoints(opPoints, "cut", i,
				cut.spec.getCenter(),
				cut.spec.normal
			);
		});

		return opPoints;
	}


	getRemoveBranchesOperationPoints(opPoints = []) {

		if (!this.isFallenTree()) {
			Report.warn("remove branches - not fallen", `${this}`);
			return opPoints;
		}

		this.tree.branches.forEach((branch, i) => {

			if (!branch.spec.hasConnected || branch.removed)
				return;

			this.addOpPoints(opPoints, "branch", i,
				branch.spec.getCutPosition(),
				branch.spec.getCutNormal()
			);
		});

		return opPoints;
	}


	getDestination(unit, type) {

		if (!unit || !unit.isChar())
			return Report.warn("usage: (unit, type)");

		var opPoints;
		var distanceMargin = Tree.cutDistanceMargin;

		if (type == "chopStanding") {
			opPoints = this.getChopStandingOperationPoints();

		} else if (type == "cutFallen") {
			opPoints = this.getCutFallenOperationPoints();

		} else if (type == "removeBranches") {
			opPoints = this.getRemoveBranchesOperationPoints();
			distanceMargin = Tree.branchDistanceMargin;

		} else
			Report.throw("bad type", `t=${type}`);

		opPoints = this.filterUnitFitOpPoints(unit, opPoints);
		if (opPoints.length === 0)
			return;


		var dst = new DestinationPoints().setDistanceMargin(distanceMargin);

		opPoints.forEach(oP => {

			// dst.*() adds goal points (type VGNode).
			// associated data:
			// - facing gets queried with planner.getGoalFacing()
			// - other auxiliary data added with dst.add*(), queried with planner.getGoalData();

			if (oP.cI) {
				oP.cI.invertIntervals();
				dst.addCircumferenceIntervals(oP.cI, oP);

			} else if (oP.aP) {
				dst.addApproachPoint(oP.aP, oP);

			} else
				Report.throw("bad oP", oP);
		});

		return dst;
	}


	filterUnitFitOpPoints(unit, opPoints) {

		console.assert(unit instanceof Unit);

		return Util.filterInPlace(opPoints, oP => {

			if (oP.aP) {
				if (Main.area.spatialIndex.unitFits(unit, oP.aP.x, oP.aP.y))
					return true;

			} else { // cI contains blocking intervals
				this.addUnitApproachBlockingIntervals(unit, oP.cI);
				if (!oP.cI.is360())
					return true;
			}
		});
	}


	addUnitApproachBlockingIntervals(unit, cI) {

		// Add +0.3 for swinging axe?
		Main.area.spatialIndex.addCollidingIntervals(cI, this, unit.radiusClass);//, +0.3);
	}

}


Object.assign( Tree, {

	R_LEAVES: 3, // max. leaves around local origin (2.5 was ok)
	H_LEAVES: 1.5, // max. leaves above getMaxHeight()

	fallingTMax: 12,
	fallingTMin: 0.5,

	crumbleT: 40 * 60,
	crumbleTFractionMin: 0.5,
	//stumpCrumbleFactor: 0.7,
	displayEvent1Factor: 0.4,
	displayEvent2Factor: 0.87,


	cut0RadiusMaxExcess: 0.15, // aspen1h8: 0.0924

	fallingConf: [
		{ tNormEnd: 0.88, toAmount: 1, easing: x => x * x * Math.sqrt(x) },
		{ tNormEnd: 0.93, toAmount: 0.975, easing: TWEEN.Easing.Quadratic.Out },
		{ tNormEnd: 1, toAmount: 1, easing: TWEEN.Easing.Quadratic.InOut },
	],

	horizontalStumpDistance: 1.24,
	horizontalDistance: 1.0,
	downwardDistance: 0.9,

	cutDistanceMargin: 0.03,
	branchDistanceMargin: 0.12,


	_objPhaseSprng: null,
});


Object.assign(Tree.prototype, {

	_p: new Point,
	_vectorFallen: new THREE.Vector3,
	_cutoffLogsSkel: new Line2,
	_cutoffLogsPolygon: new Polygon,

	_scale: new THREE.Vector3,

	_cutRay: new THREE.Ray,
	_cutPlane: new THREE.Plane,
	_cutFromPoint: new Point,
	_cutUVRect: new Rectangle(0.025, 1 - 0.967, 0.110, 1 - 0.970), // "flipY"

	_line2: new Line2,
	_fromPosition: new THREE.Vector3,
	_centerV: new THREE.Vector3,
	_normalV: new THREE.Vector3,
});




export { Tree };

