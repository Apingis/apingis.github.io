
class TreeSpec {

	constructor(itemSpec) {

		this.itemSpec = itemSpec;
		this.name = itemSpec.name;
		this.data = itemSpec.data.tree;

		// "aspen1h5" --> "1h5"
		this.trunk = new TreeSpec.Branch(itemSpec.name, itemSpec.name.replace(/^[a-z]+/, ""));

		var computedSummary = this.trunk.branchSpec.getComputedSummary();

		if (!computedSummary)
			Report.throw("no computedSummary", `${itemSpec}`);

		this.maxHeight = computedSummary.maxHeight;
		this.baseRadius = computedSummary.baseRadius;
		this.cut0Radius = computedSummary.cut0Radius;

		this.branches = this.createBranches();

		this.cuts = this.createCuts();
		console.assert(this.cuts.length > 0);

		this.logs = this.createLogs();

		this._mesh = null;
		this._stumpGeometry = null;

		this.createItemSpecs();
	}


	toString() { return `[TreeSpec "${this.name}" ${this.branches && this.branches.length}b]`; }


	static create(itemSpec) {

		var data = itemSpec.data.tree;

		if (!data.trunkMatName || !data.leavesMatName)
			Report.throw("missing fields", `${itemSpec.name}`);

		return new TreeSpec(itemSpec);
	}


	// treeName: "aspen" (1 tree name per design file)
	// treeSpecName: "aspen1"
	// item.spec.name: "aspen1h7"

	static getTreeName(itemSpecName) {

		var res = itemSpecName.match(/^([a-zA-Z_]+)/);
		if (!res)
			Report.throw("bad itemSpecName", itemSpecName);
		return res[1];
	}


	static getTreeSpecName(itemSpecName) {

		var res = itemSpecName.match(/^([a-zA-Z_]+[0-9]+)/);
		if (!res)
			Report.throw("bad itemSpecName", itemSpecName);
		return res[1];
	}


	getStumpSpecId() { return this.itemSpec.id + 1; }

	getStumpGeometry() {
		return this._stumpGeometry || (
			this._stumpGeometry = this.trunk.branchSpec.getSplitGeometryData().stump.getGeometry()
		);
	}


	getTopGeometryTrunk() {
		return this.trunk.getTopGeometryTrunk();
	}


	getTopGeometryLeaves(dried) {
		// All leaves connected to the trunk are on the top
		return this.trunk.getGeometryLeaves(dried);
	}


	createBranches() {
		var b = this.data.branches;
		return !b ? [] : b.map((branchData, i) =>
			new TreeSpec.Branch(this.name, branchData.name, i, branchData, this.trunk) );
	}
/*
	// argument: cut or log
	// return: array of TreeSpec.Branch objects
	// Processed branches get flagged (.hasConnected)
	getConnectedBranches(p) {

		var axisData = p.auxData.axisData;
		if (!axisData)
			Report.throw("no axisData", `${this}`);

		var minDistance = axisData.radius.avg * Math.SQRT2 + 0.1;

		return this.branches.filter(b => {

			var d = axisData.axis.distanceTo(b.position);

			if (d < b.branchSpec.getBaseRadius() + minDistance) {
				b.hasConnected = true;
				return true;
			}
		});
	}
*/

	// approximate version w/o geometry.
	// return: array of TreeSpec.Branch objects
	// Processed branches get flagged (.hasConnected)
	getConnectedBranches(type, i) {

		var delta = 0.15;
		var y = BranchSpec.STUMP_HEIGHT;

		if (type == "log") {
			delta += 0.5 * BranchSpec.LOG_LENGTH;
			y += i * BranchSpec.CUT_LENGTH + (i + 0.5) * BranchSpec.LOG_LENGTH;

		} else {
			delta += 0.5 * BranchSpec.CUT_LENGTH;
			y += (i + 0.5) * BranchSpec.CUT_LENGTH + i * BranchSpec.LOG_LENGTH;
		}

		return this.branches.filter(b => {

			if (Math.abs(y - b._getPositionData().h) < delta) {
				b.hasConnected = true;
				return true;
			}
		});
	}


	createCuts() {
		return this.trunk.branchSpec.getComputedSummary()
			.cuts.map((cutData, i) => this.createCut(cutData, i));
	}

	createCut(cutData, i) {
		return new TreeSpec.Cut(`cut${i}`, i, cutData, this.trunk, this.getConnectedBranches("cut", i));
	}


	createLogs() {

		console.assert(this.cuts);

		return this.trunk.branchSpec.getComputedSummary()
			.logs.map((logData, i) => this.createLog(logData, i));
	}


	createLog(logData, i) {

		var requiredCuts = [ this.cuts[i], this.cuts[i + 1] ];

		return new TreeSpec.Log(
			`${this.name}-log${i + 1}`,
			i,
			logData,
			this.trunk,
			this.getConnectedBranches("log", i),
			requiredCuts
		);
	}


	getMesh() { // Same for every tree of this species

		if (this._mesh)
			return this._mesh;

		this._mesh = ItemSpec.createDummyMesh(

			this.name + " trunk | unmodified",

			Util.mergeGeometries([
				this.trunk.getGeometryTrunk(),
				...this.branches.map(b => b.getGeometryTrunk())
			]),

			this.data.trunkMatName

		).add( ItemSpec.createDummyMesh(

			this.name + " leaves | unmodified",

			Util.mergeGeometriesIfExist([
				this.trunk.getGeometryLeaves(),
				...this.branches.map(b => b.getGeometryLeaves())
			]),

			this.data.leavesMatName
		) );

		return this._mesh;
	}


	getGreenLeavesPositions() {

		var result = [];

		var accumulateBranch = treeSpecBranch =>
			Array.prototype.push.apply(result, treeSpecBranch.getGreenLeavesPositions());

		accumulateBranch(this.trunk);

		this.branches.forEach(treeSpecBranch => accumulateBranch(treeSpecBranch));

		return result;
	}


	// created polyhedron gets cached at ItemSpec

	getCollisionPolyhedron() {

		if ( this.itemSpec.name == "aspen1h8-d3"
				|| this.itemSpec.name.endsWith("-d2") && this.itemSpec.name !== "aspen1h8-d2" ) {

			return this.getTrunkPolyhedron(this.maxHeight);
		}


		var greenLeavesPos = this.getGreenLeavesPositions();

		if (greenLeavesPos.length === 0) {

			Report.warn("greenLeavesPos.length=0", `${this.itemSpec.name}`);
			return this.getTrunkPolyhedron(this.maxHeight);
		}


		var bBox = new THREE.Box3().setFromPoints(greenLeavesPos);
		var p = new Polyhedron().setFromBox3(bBox).setName(`${this.itemSpec.name}-collision`);

		this.cutPolyhedron(p, bBox, greenLeavesPos); // TODO (v2+) smarter


		var pTrunk = this.getTrunkPolyhedron( Math.min(bBox.min.y + 0.1, bBox.max.y) );

		p.joinPolyhedron(pTrunk);

		return p;
	}


	getTrunkPolyhedron(height) {

		var p = new Polyhedron().createBox3(); // TODO! open box

		var	r = this.cut0Radius;
			//rTop = rBottom * // it's bending

		for (let i = 1; i < 9; i++)

			p.vertexById[i].position.set(

				(i & 2) ? r : -r,
				i > 4 ? height : 0,
				((i - 1) & 2) ? r : -r
			);

		return p.setName(`${this.itemSpec.name}-collision-trunk`);
	}


	cutPolyhedron(p, bBox, greenLeavesPos) {

		this.attemptCutPolyheronSide(

			p, bBox, greenLeavesPos,
			new THREE.Vector3(Math.SQRT1_2, 0, Math.SQRT1_2),
			new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2)
		);

		this.attemptCutPolyheronSide(

			p, bBox, greenLeavesPos,
			new THREE.Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2),
			new THREE.Vector3(-Math.SQRT1_2, 0, Math.SQRT1_2)
		);

		this.attemptCutPolyheronSide(

			p, bBox, greenLeavesPos,
			new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2),
			new THREE.Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2)
		);

		this.attemptCutPolyheronSide(

			p, bBox, greenLeavesPos,
			new THREE.Vector3(-Math.SQRT1_2, 0, Math.SQRT1_2),
			new THREE.Vector3(Math.SQRT1_2, 0, Math.SQRT1_2)
		);

		p.removeShortEdges();
	}


	attemptCutPolyheronSide(p, bBox, greenLeavesPos, cutV, axis) {

		this.attemptCutPolyhedron(p, bBox, greenLeavesPos, cutV, axis);

		this.attemptCutPolyhedron(p, bBox, greenLeavesPos, cutV, axis.negate());
	}


	attemptCutPolyhedron(polyhedron, bBox, greenLeavesPos, cutV, axis) {

		var plane = new THREE.Plane( cutV, 0 );

		var closestPt = Util.closestPointToPlane(greenLeavesPos, plane);

		if (!closestPt)
			return Report.warn("no closestPt", `${this.itemSpec} cutV=${cutV} axis=${axis}`);

		var d = plane.distanceToPoint(closestPt);

		var angle = Util.minDihedralAngleToPoints(plane, closestPt, axis, greenLeavesPos);

//console.log(this.itemSpec.name, angle, d, closestPt.y - bBox.min.y, bBox.max.y - closestPt.y);

		if (angle < 0)
			Report.warn("angle < 0", `${this.itemSpec} cutV=${cutV} axis=${axis}`);

		if (angle < 0.12)
			return;

		plane.constant -= d;
		plane.normal.applyAxisAngle(axis, -angle);
		plane.setFromNormalAndCoplanarPoint( plane.normal, closestPt );

		// Newly created faces don't share vertices, edges (doesn't matter for VC-'22).

		var faces = polyhedron.cutWithPlaneCreateFaces(plane, false);
	}



}



// ====================================================================
//
// Branch on tree species.
// A branch from assets (BranchSpec) is positioned w/ BranchSpec.PositionData.
// (?) - independent of where it's connected to (incl. wind) (mb.TODO)
//
// ====================================================================

TreeSpec.Branch = function(itemSpecName, name, id, data, upper) {

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	this.itemSpecName = itemSpecName;
	this.name = name;
	this.id = id; // start from 0 (trunk==undefined)

	console.assert(upper && data || !upper && !data);
	console.assert(!data || data.posId && data.name);

	this.data = data; // ItemSpecData: { posId: 10, name: "b52-l" },

	console.assert(!upper || (upper instanceof TreeSpec.Branch) );

	this.upper = upper;

	//this.id ??

	this._position = null;
	this.azimuth = this.upper && this._getPositionData().a * (Math.PI / 180) || 0;

	this.branchSpec = BranchSpec.get(TreeSpec.getTreeName(itemSpecName), this.name);

	this.branchPhase = this._getSPRNG().random();
	//this.branchBendFactor = undefined; // on per-branchSpec basis

	// cut or log; set externally after everything created;
	// to decide if chop off the branch or not
	this.hasConnected = false;

	this._cutNormal = null;
	this._cutPosition = null;
	this._cutPositionApprox = null;

	this._geometryTrunk = null;
	this._geometryLeaves = [];
	this._topGeometryTrunk = null;
}


TreeSpec.Branch._sprng = null;


Object.assign(TreeSpec.Branch.prototype, {

	toString() { return `[TreeSpec.Branch name=${this.name}]`; },


	_getSPRNG() {
		return TreeSpec.Branch._sprng || (TreeSpec.Branch._sprng = new Util.SpreadPRNG);
	},


	_getPositionData() { // == connection to upper level

		var upperTreeSpecName = TreeSpec.getTreeSpecName(this.upper.itemSpecName);

		return BranchSpec.PositionData.get(upperTreeSpecName, this.data.posId);
	},


	getPosition() {

		if (!this._position) {

			this._position = new THREE.Vector3;

			if (this.upper) {
				this._position.y = this._getPositionData().h;
				let offsetV = this.upper.branchSpec.getVectorToAxis(this._position);
				this._position.add(offsetV);
			}
		}

		console.assert(!this._position.hasNaN());

		return this._position;
	},


	_mat4: new THREE.Matrix4(),

	getMatrix4() {
		return this._mat4.makeRotationY(-this.azimuth).setPosition( this.getPosition() );
	},


	getCutNormal() {

		if (!this._cutNormal) {

			if (this.upper) {
				this._cutNormal = new THREE.Vector3(1, 0, 0)
					.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.azimuth);

			} else
				this._cutNormal = new THREE.Vector3(0, 1, 0);
		}

		return this._cutNormal;
	},


	getCutPosition() {

		if (!this._cutPosition) {

			let pt = this.getCutNormal().clone().multiplyScalar(0.1); // 0.1m from origin (constant)
			pt.add(this.getPosition());
			this._cutPosition = pt;
		}

		return this._cutPosition;
	},


	getCutPositionApproximate() { // w/o geometry

		if (!this._cutPositionApprox) {

			if (!this.upper)
				Report.throw("must be a branch connected to smth.", `${this}`);

			let pt = this.getCutNormal().clone().multiplyScalar(0.1); // 0.1m from origin (constant)
			pt.y += this._getPositionData().h;
			this._cutPositionApprox = pt;
		}

		return this._cutPositionApprox;
	},


	_positionGeometry(geometry) {
		Util.applyMatrix4ToGeometry(geometry, this.getMatrix4());
	},


	_getFilteredParts(filterFn) {
		return this.branchSpec.getPolyhedron().getAllParts().filter(filterFn);
	},


	_getMergedPartsGeometry(parts) {

		var geometry = Util.mergeGeometriesIfExist( parts.map(p => p.getGeometry()) );
		if (geometry) {

			this._positionGeometry(geometry);

			// Per- TreeSpec.Branch random (branch & leaf)

			if (!this.upper) // upper: objPhase's enough
				Wind.applyObjPhaseColorToGeometry(geometry, this.branchPhase);
		}

		return geometry;
	},


	getGeometryTrunk() {

		if (!this._geometryTrunk) {

			var parts = this._getFilteredParts(p => !p.auxData.isLeaf);

			this._geometryTrunk = this._getMergedPartsGeometry(parts);
		}

		return this._geometryTrunk;
	},


	getGeometryLeaves(dried = 0) {

		if (!this._geometryLeaves[dried]) {

			var parts = this._getFilteredParts(p => p.auxData.isLeaf);
			if (dried > 0)
				parts = parts.map(p => p.auxData.leafData.pDried);

			this._geometryLeaves[dried] = this._getMergedPartsGeometry(parts);
		}

		return this._geometryLeaves[dried];
	},


	getTopGeometryTrunk() {

		if (this.upper)
			return Report.warn("bad call", `${this}`);

		if (!this._topGeometryTrunk) {

			this._topGeometryTrunk = Util.mergeGeometriesIfExist(

				this.branchSpec.getSplitGeometryData().top.getAllParts()
					.filter(p => !p.auxData.isLeaf).map(p => p.getGeometry())
			);

			// does not require positioning

			// no: objPhase is enough
			//Wind.applyObjPhaseColorToGeometry(this._topGeometryTrunk, this.branchPhase);
		}

		return this._topGeometryTrunk;
	},


	getGreenLeavesPositions() {

		var result = [];
		var mat4 = this.getMatrix4();

		this.branchSpec.getPolyhedron().traverseParts(p => {

			if (!p.auxData.isLeaf || BranchSpec.ListGreenLeaves.indexOf(p.name) === -1)
				return;

			p.getVertices().forEach(v =>
				result.push( v.position.clone().applyMatrix4(mat4) )
			);
		});

		return result;
	},

});




TreeSpec.Log = function(name, id, logData, branch, connectedBranches, requiredCuts) { // "on the tree"

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	this.name = name;
	this.id = id; // start from 0
	this.branch = branch; // == trunk
	this.connectedBranches = connectedBranches;
	this.requiredCuts = requiredCuts;

	this._geometry = null;
}


Object.assign(TreeSpec.Log.prototype, {

	getPolyhedron() {

		var p = this.branch.branchSpec.getSplitGeometryData().logs[ this.id ];
		if (!p)
			return Report.warn("no cut geometry", `${this} id=${this.id}`);

		return p;
	},


	getGeometry() {
		return this._geometry || (
			this._geometry = this.getPolyhedron().getGeometry()
		);
	},

});




TreeSpec.Cut = function(name, id, cutData, branch, connectedBranches) {

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	if (name == "cut0" && connectedBranches.length !== 0)
		Report.throw("cut0 may not have connectedBranches", `${this}`);

	console.assert(cutData.r > 0);

	this.name = name;
	this.id = id; // start from 0
	this.r = cutData.r;

	var dPointsBase = Math.ceil(20000 * cutData.r **2);

	this.dPoints = dPointsBase;

	if (dPointsBase > 60)
		this.dPoints += Math.ceil( (dPointsBase - 60) * 0.334 );

	if (dPointsBase > 120)
		this.dPoints += Math.ceil( (dPointsBase - 120) * 0.334 );

	//this.dPoints = Math.ceil(20000 * cutData.r **2);

	if (this.dPoints >= 4096) {
		Report.warn("dPoints", `${this.dPoints} ${name} ${branch}`);
		this.dPoints = 4095;
	}

	this.branch = branch; // must be trunk

	this.connectedBranches = connectedBranches;
	this.normal = new THREE.Vector3(0, 1, 0);

	this._center = null;
	this._geometry = null;
}


Object.assign(TreeSpec.Cut.prototype, {

	getPolyhedron() {

		var p = this.branch.branchSpec.getSplitGeometryData().cuts[ this.id ];
		if (!p)
			return Report.warn("no cut geometry", `${this} id=${this.id}`);

		return p;
	},


	getCenter() {
		//	this._center = this.getPolyhedron().getBoundingSphere().center.clone()

		if (this._center)
			return this._center;

		var y = BranchSpec.STUMP_HEIGHT
			+ this.id * BranchSpec.LOG_LENGTH
			+ (this.id + 0.5) * BranchSpec.CUT_LENGTH;

		return (this._center = new THREE.Vector3(0, y, 0) );
	},

	getGeometry() {
		return this._geometry || (
			this._geometry = this.getPolyhedron().getGeometry()
		);
	},

});



TreeSpec.prototype.createItemSpecs = function() {

	if (!this.trunk.branchSpec.data.split)
		Report.throw("bad trunk", `${this}`);

	var id = this.getStumpSpecId();
	if (!id)
		Report.throw("no stumpSpecId", `${this}`);

	if (ItemSpec.byId[id])
		Report.throw("stumpSpecId in use", `${id} ${this}`);

	// 1. Stump

	var f = ItemSpec.flags;

	var stumpFlags = f.STATIC | f.CIRCULAR;
	if (this.data.stumpIsColliding === false)
		stumpFlags &= ~f.COLLIDING;

	var _this = this;

	ItemSpec.create({

		id: id ++,
		name: `${this.name}-stump`,
		flags: stumpFlags,
		type: "stump",

		radius: this.baseRadius,
		height: BranchSpec.STUMP_HEIGHT,

		matName: this.data.trunkMatName,
		nameKey: "aspen_stump",

		// same geometry for "stump as a part of the tree" and standalone stump.
		get geometry() { return _this.getStumpGeometry(); }
	});

	id += 9; // reserve

	// 2. Logs

	this.trunk.branchSpec.getComputedSummary().logs.forEach((logData, i) => {

		console.assert(logData.r > 0 && logData.l > 0);

		ItemSpec.create({

			id: id ++,
			name: `${this.name}-log${i + 1}`,
			flags: f.SELECTABLE,
			y0: logData.r,
			type: "log",

			matName: this.data.trunkMatName,
			//matName: "aspen_log",

			nameKey: "aspen_log",

			//! _geometry: null,

			get geometry() {

				var logAuxData = _this.trunk.branchSpec.getSplitGeometryData().logs[i].auxData;

				//TODO return LogSpec.getGeometry(logAuxData.axisData);

				return logAuxData.logData.geometry;
			},

			logRadius: logData.r,
			logLength: logData.l,
			logCutoff: new THREE.Matrix4().fromArray(logData.cutoff),
		});
	});
}




export { TreeSpec };

