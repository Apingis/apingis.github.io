//
//   Geometry issue.
//
// - BranchSpec's created w/o geometry.
//
class BranchSpec {

	constructor(treeName, name, data) {

		// In blender/glb file all names are unique. Assuming 1 file per treeName.
		this.treeName = treeName; // e.g. "aspen"
		//this.treeSpecName = treeSpecName; // e.g. "aspen1"
		this.name = name; // branch name e.g. "1h1" as in BranchSpecData

		// treeName + name equals to item.spec.name ("aspen1h7") for trunks

		this.data = data;

		BranchSpec.byTreeName[treeName][name] = this;

		// branches in the design files are always at (0,0,0)
		this.origin = new THREE.Vector3;

		this._polyhedron = null;
		this._splitGeometryData = null;

		this.skel = this.getSkel();
	}


	toString() { return `[BranchSpec ${this.treeName} ${this.name}]`; }



	static get(treeName, name) {

		var branchSpec = BranchSpec.byTreeName[treeName][name];
		if (!branchSpec)
			Report.throw("no branchSpec", `treeName=${treeName} name=${name}`);

		return branchSpec;
	}


	static createAll() {

		Object.keys(BranchSpec.Data).forEach(treeName => {

			Object.keys(BranchSpec.Data[treeName]).forEach(name => this.create(treeName, name));
		});
	}


	static create(treeName, name) {

		if (name == "default")
			return;

		var data = BranchSpec.Data[treeName][name];
		var branchSpec = new BranchSpec(treeName, name, data);
	}


	getComputedSummary() { // computed before. trunks only.

		var name = this.data.objName || this.name;
		var summary = BranchSpec.ComputedSummary;

		return summary && summary[this.treeName] && summary[this.treeName][name];
	}


	getSPRNG() { return BranchSpec._sprng || (BranchSpec._sprng = new Util.SpreadPRNG); }


	// ================================================================
	//
	//   Below are operations that require geometry from design files.
	//
	// ================================================================

	getSkel() {

		return {
			_all: [],

			addBBData(bBData) { Array.prototype.push.apply(this._all, bBData); },

			getNearest(excludePart, position) {

				var minDistance = Infinity;
				var nearestEl;

				this._all.forEach(el => {

					if (el.line3 && el.part !== excludePart) {
						let d = el.line3.distanceTo(position);
						if (d < minDistance) {
							minDistance = d;
							nearestEl = el;
						}
					}
				});

				return nearestEl;
			}
		};
	}


	getObj(arg) {
		console.assert(!arg);
		return this.getObjByName(this.data.objName || this.name);
	}


	getObjByName(name) {

		var obj = Assets.models[this.treeName].obj.scene.getObjectByName(name);
		if (!obj)
			Report.throw("no object", `${this} name=${name}`);

		return obj;
	}


	_getMaxHeight() { // w/o leaves
		return this.getPolyhedron().auxData.bBData
			.reduce((max, el) => Math.max(max, el.center.y), -Infinity);
	}

	_getBaseRadius() {
		return 0.93 * this.getPolyhedron().auxData.bBData[0].radius;
	}


	_getCut0RadiusMin() {

		var splitData = this.getSplitGeometryData();

		return splitData && ( splitData.logs[0] && splitData.logs[0].auxData.logRadius
			|| splitData.cuts[0].auxData.axisData.radius.min * 0.93 );
	}


	getVectorToAxis(pt) {
		var p = this.getPolyhedron(); // ensure filled-in skelData
		var bBDataEl = this.skel.getNearest(null, pt);
		return bBDataEl.line3.closestPointToPoint(pt, true, this._v).sub(pt);
	}


	// ===============================================
	//
	// branch from data file, creation worlflow -
	// gets disassembled into polyhedral parts.
	// Process parts.
	//
	// ===============================================
	getPolyhedron() {

		if (this._polyhedron)
			return this._polyhedron;

		var obj = this.getObj();
		var p = Polyhedron.fromGeometry(obj.geometry, obj.name);

		if (p.vertexCount() < 4)
			Report.throw("<4 vertices", `${this} n=${p.vertexCount()}`);

		//var parts = p.mergeFaces().splitDisconnectedParts(); // UVs float
		var parts = p.splitDisconnectedParts();

		var numBranches = 0; // Several sub-branches possible.
		var pMain; // "Main" branch.

		parts.forEach((p, i, arr) => {

			if (this.isSaplingLeaf(p)) {

				p.auxData.isLeaf = true;

			} else {

				p.auxData.bBData = this.getBranchBendData(p);
				this.skel.addBBData(p.auxData.bBData);

				numBranches ++;
				pMain = p;
			}
		});

		if (!numBranches)
			Report.throw("no branches", `${this}`);

		if (numBranches > 1);
			pMain = this.arrangeBranches(parts);


		// 2. Process Leaves. Some parts may be replaced.
		this.processLeaves(parts.filter(p => p.auxData.isLeaf));


		pMain.traverseParts(p => p.addWind());

		// Branch starts at wind-unaffected point.
		this.setupWindBranch(pMain);

		pMain.setName(`${this}`);

		return (this._polyhedron = pMain);
	}


	arrangeBranches(parts) {

		var pMain;
		var minDistance = Infinity;

		// A). Select branches, select closest to origin as pMain

		parts.forEach(p => {
			if (p.auxData.isLeaf)
				return;

			var d = p.auxData.bBData[0].center.distanceTo(this.origin);
			if (d < minDistance) {
				pMain = p;
				minDistance = d;
			}
		});

		// B). Add secondary branches, set their positions

		parts.forEach(p => {
			if (p.auxData.isLeaf || p === pMain)
				return;

			// This is secondary branch
			p.position.copy(p.auxData.bBData[0].center);

			this.skel.getNearest(p, p.position).part.add(p);
		});

		return pMain;
	}


	getWindBranch(p, upperWB) {

		var bBData = p.auxData.bBData;
		var origin = bBData[0].center; // Branch starts here.

		var bendStartDistance = this.data.bendStartDistance || 0;
		var bendStartI;

		for (let i = 0; i < bBData.length; i++)
			if (bBData[i].center.distanceTo(origin) >= bendStartDistance) {
				bendStartI = i;
				break;
			}

		if (bendStartI === undefined)
			bendStartI = bBData.length - 1;

		var bendOrigin = bBData[bendStartI].center; // Bending starts here.

		var bendTotalLength = bendOrigin.distanceTo(bBData[bBData.length - 1].center);

		if (bendTotalLength === 0)
			Report.warn("bendTotalLength=0", `bTL=${bendTotalLength} bBDataLen=${bBData.length} ${this}`);

		if (!checkOverbent())
			Report.warn("overbent branch", `${this}`);

		//
		// * bends can be unavailable (further than end of branch)
		// * zero length: skipped
		//
		var bendLengths = [];
		bendLengths[0] = getBendDistance(Math.max(BranchSpec.MIN_BEND_LENGTH, 0.3 * bendTotalLength));
		bendLengths[1] = getBendDistance(Math.max(2 * BranchSpec.MIN_BEND_LENGTH, 0.6 * bendTotalLength))
			- bendLengths[0];

		var wB = new Wind.Branch(origin, bendOrigin, bendLengths, this.data.bendFactor);

		return wB;


		function getBendDistance(minFromBendOrigin) {

			for (let i = bendStartI; i < bBData.length; i++) {

				let distance = bendOrigin.distanceTo(bBData[i].center);
				if (distance >= minFromBendOrigin)
					return distance;
			}

			return Infinity;
		}


		function checkOverbent() {

			var lastDistance = 0;

			for (let i = bendStartI + 1; i < bBData.length; i++) {

				let d = bendOrigin.distanceTo(bBData[i].center);
				if (d < lastDistance)
					return;
				lastDistance = d;
			}

			return true;
		}
	}


	setupWindBranch(p, wB) {

		if (!wB)
			wB = this.getWindBranch(p);

		p.forEachVertex(v => {
			wB.setupWind(v.wind, v.position);
		});


		p.parts.forEach(part => {

			if (part.auxData.isLeaf) {

				this.setupWindLeaf(part, wB, part.auxData.leafData);

				// Attached is also dried version.
				let pDried = part.auxData.leafData.pDried;

				pDried.addWind();
				this.setupWindLeaf(pDried, wB, part.auxData.leafData);

			} else {
				// sub-branches' bending may be incorrect (TODO; barely visible)
				//var w = new Wind;

				this.setupWindBranch(part, wB);
			}

		});

	}


	setupWindLeaf(p, wB, leafData) {

		var leafBendFactor = BranchSpec.LeafBendFactor[p.name];

		p.forEachVertex(v => {

			var w = v.wind;

			wB.setupWind(w, p.position);

			if (w.type == "None") {
				//Report.warn("leaf connected to non-bending (TODO review data structures)", `${this} pos=${p.position}`);
				w.branchPosition.set(0, 0, 0);
				w.branchBendFactor = 0;
				w.branchBend1Frac = 1;
				w.branchBend2Frac = 0;
			}

			w.type = "Leaf";
			//w.leafPosition.copy(p.position);
			w.leafPosition.copy(v.position).sub(p.position);
			w.leafQuaternion.copy(leafData.quaternion);
			w.leafPhase = p.auxData.leafPhase;

			if (leafBendFactor !== undefined)
				w.leafBendFactor = leafBendFactor;
		});
	}

	//
	// branch object from the design file is connected to the trunk at (0, 0, 0).
	// It's typiclly "main" branch and maybe sub-branches ("secondary")
	// which are connected to the "main" branch elsewhere.
	//
	// Branch is elongated in the direction to the vertex farthest from origin.
	//
	getBranchBendData(p) {

		var maxDistInCluster = 0.1;

		var ray = new THREE.Ray().setFrom2Points(
			this.origin,
			p.fartherstVertex(this.origin).position
		);

		var vDist = p.getVertexDistancesToClosestPointOnRay(ray);

		if (vDist[0].d > maxDistInCluster) { // this must be secondary branch

			ray.origin = vDist[0].v.position;
			vDist = p.getVertexDistancesToClosestPointOnRay(ray);
		}

		var clusters = []; // Group vertices
		var prevDistance = -Infinity;

		vDist.forEach(el => {

			if (prevDistance < el.d - maxDistInCluster)
				clusters.push([ el.v ]);

			else
				clusters[clusters.length - 1].push(el.v);

			prevDistance = el.d;
		});

		if (clusters.length < 2)
			Report.warn("bad branch", `${this} id=${p.id} l=${clusters.length}`);


		var bBData = clusters.map((vArray, i) => {

			var sphere = new THREE.Sphere().setFromPoints(vArray.map(v => v.position));

			return {
				center: sphere.center,
				radius: sphere.radius,
				distance: sphere.center.distanceTo(this.origin),
				vertices: vArray,
				line3: null,
				part: p,
				index: i,
			};
		});

		bBData.forEach((data, i, arr) => {
			if (i !== arr.length - 1)
				data.line3 = new THREE.Line3(data.center, arr[i + 1].center);
		});

		return bBData;
	}


	processLeaves(leaves) {

		leaves.forEach(p => {
			p.auxData.leafData = this.getSaplingLeafData(p);
			p.position.copy(p.auxData.leafData.origin);
		});

		// 1. Assign leaf ID's by increase of distance from branch origin, IDs start from 0.

		leaves.sort((a, b) => a.auxData.leafData.distance - b.auxData.leafData.distance)
			.forEach((p, i) => p.auxData.leafData.leafId = i);

		leaves.forEach(p => this.processLeaf(p));
	}


	processLeaf(p) {

		var	leafData = p.auxData.leafData;

		// 1. Nearest branch.
		var bBDataEl = this.skel.getNearest(p, leafData.origin);

		// 2. Replace.
		var name = this.getLeafParam(leafData.leafId, "replace");

		if (name) {

			// Correct position
			let newPos = this.getCorrectedLeafPosition(p, bBDataEl);

			leafData.matrix.setPosition(newPos);
			p.translate(newPos.sub(leafData.origin));


			this.saveDriedLeafVersion(p); // Also create dried version.

			p = this.replaceSaplingLeaf(p, name);


		} else {
			Report.warn("remains auto-generated 'sapling leaf'", `${this}`);
		}

		// 3. Set per-leaf properties.

		p.auxData.leafPhase = this.getSPRNG().random();

		var scale = this.getLeafParam(leafData.leafId, "scale");
		if (scale)
			p.scale(scale, p.position);


		// 4. Set other props.

		//var flipZ = this.getLeafParam(leafId, "flipZ")
		//p2.applyMatrix4(this._rotateX180Matrix);


		// 5. Attach to branch.
		bBDataEl.part.add(p);
	}


	saveDriedLeafVersion(p) {
		p.auxData.leafData.pDried = this.replaceSaplingLeaf(p, "leaf1-d");
	}


	replaceSaplingLeaf(p, newName) {

		var p2 = BranchSpec.LeafPolyhedron[newName];

		if (!p2) {

			p2 = Polyhedron.fromGeometry(this.getObjByName(newName).geometry, newName);
			//p2.mergeFaces(); // no need
			p2.name = newName; // leaf object name

			BranchSpec.LeafPolyhedron[newName] = p2;
		}

		p2 = p2.clone();

		p2.applyMatrix4(p.auxData.leafData.matrix);

		p2.auxData.isLeaf = true;
		p2.auxData.leafData = p.auxData.leafData;

		return p2;
	}


	branchThickness(bBDataEl, closestPt) {

		var t = bBDataEl.line3.closestPointToPointParameter(closestPt, true);
		var nextEl = bBDataEl.part.auxData.bBData[ bBDataEl.index + 1 ];

		if (!nextEl.line3 && t > 0.97) // At the end of the branch.
			return 0;

		// minimal (for 4 vertices)
		return Math.SQRT1_2 * (bBDataEl.radius * (1 - t) + nextEl.radius * t);
	}


	getCorrectedLeafPosition(p, bBDataEl) {

		var	leafData = p.auxData.leafData,
			branchAxis = bBDataEl.line3;

		var closestPt = branchAxis.closestPointToPoint(
			leafData.origin,
			true,
			new THREE.Vector3
		);

		var thickness = this.branchThickness(bBDataEl, leafData.origin);

		if (thickness === 0) // at the end of the branch
			return closestPt.moveTowards(branchAxis.start, 0.011);

		var leafFwdV = leafData.quaternion.getForwardV();

		var branchV = branchAxis.delta(new THREE.Vector3);
		var planeV = branchV.clone().cross(leafFwdV);

		var directionOffBranch = planeV.cross(branchV);
		var directionLen = directionOffBranch.length();

		if (Math.abs(directionLen) < 1e-7) // leafFwdV is parallel to branch axis
			return closestPt.moveTowards(leafData.origin, thickness - 0.007);

		directionOffBranch.divideScalar(directionLen);

		return closestPt.add(directionOffBranch.multiplyScalar(thickness - 0.007));
	}


	isSaplingLeaf(p) { return this.getSaplingLeafData(p, true); }


	getSaplingLeafData(p, doCheckOnly) {

		if (p.vertexCount() !== 4)
			return;

		var	left = p.findVertexByUV(1, 1),
			farLeft = p.findVertexByUV(1, 0),
			right = p.findVertexByUV(0, 1);

		if (!left || !right || !farLeft)
			return;

		if (doCheckOnly)
			return true;


		// Sapling leaf is different from what you get when "Add mesh" -> "Plane".
		//
		// ^ +Y (+Z in THREE)
		// |
		// | "Rest pose", normal: +Z (+Y in THREE)
		// |  +---+
		// |  O   |
		// |  +---+
		// 0----------> +X
		//
		// "Add mesh" -> "Plane" requires to rotate UVs CCW by 90deg.

		var origin = left.position.clone().add(right.position).multiplyScalar(0.5);

		var quaternion = new THREE.Quaternion().setFrom2Triangles(
			...this._saplingLeafTemplate,
			origin, left.position, farLeft.position
		);

		var matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion)
			.setPositionFromVectorDiff(origin, this._saplingLeafTemplate[0]);


		var leafData = {

			distance: origin.length(),
			origin,
			quaternion,
			matrix,
			morph: [],
		};


		if (left.morphPosition)
			this.getSaplingLeafDataMorph(leafData, origin, left, right, farLeft);

		return leafData;
	}


	getSaplingLeafDataMorph(leafData, origin, left, right, farLeft) {

		var	morphLeft = new THREE.Vector3,
			morphFarLeft = new THREE.Vector3;

		for (let i = 0; i < left.morphPosition.length; i++) {

			let	morphOrigin = left.morphPosition[i].clone().add(right.morphPosition[i])
				.multiplyScalar(0.5).add(origin);

			morphLeft.copy(left.morphPosition[i]).add(left.position),
			morphFarLeft.copy(farLeft.morphPosition[i]).add(farLeft.position);

			let matrix = new THREE.Matrix4().setFrom2Triangles(

				origin, left.position, farLeft.position,
				morphOrigin, morphLeft, morphFarLeft
			);

			leafData.morph[i] = {
				origin: morphOrigin,
				matrix,
			};
		}
	}


	getLeafParam(leafId, param) {

		var leafParams = this.data.leaves && this.data.leaves[leafId];

		if (leafParams && (param in leafParams) )
			return leafParams[param];

		if (this.data.leavesAll && (param in this.data.leavesAll) )
			return this.data.leavesAll[param];


		var defaultParams = BranchSpec.Data[this.treeName].default;

		if (defaultParams && defaultParams.leavesAll)
			return defaultParams.leavesAll[param];
	}



	getCutProp(i, prop) {

		var cutProps = this.data.split.cutProps;

		return cutProps && cutProps[i] && cutProps[i][ prop ];
	}


	getSplitGeometryData() { // TODO? dup w/ .objName

/* no: different e.g. branchBendFactor

		if (this.data.objName) {

			let branchSpec = BranchSpec.get(this.treeName, this.data.objName);

			return branchSpec.getSplitGeometryData();
		}
*/

		if (this._splitGeometryData)
			return this._splitGeometryData;

		if (!this.data.split)
			return;


		var	stumpHeight = BranchSpec.STUMP_HEIGHT,
			logLength = BranchSpec.LOG_LENGTH,
			cutLength = BranchSpec.CUT_LENGTH;

		var	logCount = this.data.split.logs && this.data.split.logs.count || 0;

		var	lowerPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0)),
			upperPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0));


		// I. Top part (+parts; preserve leaves)

		var	top = this.getPolyhedron().clone(true, (dst, src) => dst.auxData.isLeaf = src.auxData.isLeaf)
			.setName(`${this} top`);

		var topHeight = stumpHeight + logLength * logCount + cutLength * (logCount + 1);

		lowerPlane.constant = -topHeight;
		this.cutoff(top, lowerPlane, null, true, logCount); // sub-parts remain unmodified

		// II. Other parts. Cut-off top to speed up.

		var	p = this.getPolyhedron().clone(); // sub-parts not cloned

		upperPlane.constant = topHeight;
		p.cutWithPlane(upperPlane);

		// II(a). Stump.

		var stump = p.clone().setName(`${this} stump`);

		upperPlane.constant = stumpHeight;
		this.cutoff(stump, null, upperPlane, true, null, 0).stopWind();

		var	splitGeometryData = {
			top,
			stump,
			logs: [],
			cuts: [],
		};


		for (let i = 0; i < logCount + 1; i++) {

			lowerPlane.constant = -(stumpHeight + logLength * i + cutLength * i);
			upperPlane.constant = -lowerPlane.constant + cutLength;

			let	cut = p.clone().setName(`${this} cut${i}`);

			// concaveCut: create closed polyhedron
			let createFaces = this.getCutProp(i, "concaveCut");

			this.cutoff(cut, lowerPlane, upperPlane, createFaces, i, i).stopWind();

//console.warn(`${this.treeName} ${this.name} i=${i} cl=${getIfCutClosed(i)} v=${getFaceVariant(i)}`);

			cut.auxData.axisData = LogSpec.getAxisData(cut, lowerPlane, upperPlane);

			splitGeometryData.cuts[i] = cut;
		}


		for (let i = 0; i < logCount; i++) {

			lowerPlane.constant = -(stumpHeight + logLength * i + cutLength * (i + 1));
			upperPlane.constant = -lowerPlane.constant + logLength;

			let	log = p.clone().setName(`${this} log${i + 1}`); // logs start from 1.

			log.auxData.isLog = true;

			this.cutoff(log, lowerPlane, upperPlane, true, i, i + 1).stopWind();

			log.auxData.axisData = LogSpec.getAxisData(log, lowerPlane, upperPlane);
			log.auxData.logData = LogSpec.getLogData(log, log.auxData.axisData);

			splitGeometryData.logs[i] = log;

if (0) {

	let rData = log.auxData.axisData.radius;
	console.log(`${log.name} radius ratio = ${(rData.max/rData.min).toFixed(2)}`);
}

		}


		return (this._splitGeometryData = splitGeometryData);
	}


	cutoff(p, plane1, plane2, createFaces, cutNum1, cutNum2) {

		plane1 && this.cutoff1Side(p, plane1, createFaces, cutNum1);
		plane2 && this.cutoff1Side(p, plane2, createFaces, cutNum2);

		return p;
	}


	cutoff1Side(p, plane, createFace, cutNum) {

		if (!plane)
			return;

		if (!createFace) {
			p.cutWithPlane(plane);
			return;
		}


		var faces = p.cutWithPlaneCreateFaces(plane);

		if (!faces) // must create all items
			Report.throw("no face", `${this} c=${plane.constant}`);

		if (faces.length > 1)
			Report.warn("more than 1 face: TODO if it happens", `${this} n=${faces.length}`);

		var face = faces[0];

		var polygon = face.getPlanarPolygon();

// [BranchSpec aspen 4h9] logs,stump failing to be convex
if (0 && ! this.getCutProp(cutNum, "concaveCut") ) {

	//console.error(`> testing convexity "${p.name}"`);

	let i = polygon.testNonConvex();
	if (i !== false) {

		let a = polygon.angleInternalAtVertex(i);
		let aDiff = Math.PI - a;

		console.warn(`non-convex "${p.name}" cutNum=${cutNum} isLower=${plane.normal.y > 0} aDiff=${aDiff}`);
	}

	//let convexHull = polygon.getConvexHull();

	//console.log(`"${p.name}" convexHull n=${convexHull.points.length/2}`);
}

		//
		//   I. Determine display radius
		//
		var bCircle = polygon.getBoundingCircle();

		var sides = this.getCutProp(cutNum, "sides") || 6;
		var factor = Math.cos( Math.PI / sides );

		// Circular cross-section display radius
		var displayRMax = factor * bCircle.radius - BranchSpec.XS_DISPLAY_MARGIN;

		var displayR = displayRMax; // always true for stump, top

		//
		//   II. Determine logRadius
		//
		// * affects actual placement into pile, different from visible dimensions.
		//
		// * design agreement:
		// w/ outer radius > 0.06 must have > 6 sides. (XS_PROTRUDING ~= 0.008)
		// (b.circle radius can be more than b.sphere's)
		//
		// * other design issues
		// reasonable min. outer radius: 0.4 (int. 0.346)
		//
		var isLowerCut = plane.normal.y > 0;

		if (p.auxData.isLog) {// && plane.normal.y > 0) { // lower cut

			let R_EXCESS = (BranchSpec.XS_PROTRUDING + BranchSpec.XS_DISPLAY_MARGIN) / 2;

			let logRadius;
			let dProtruding = (1 - factor) * bCircle.radius;

			if (isLowerCut && dProtruding > BranchSpec.XS_PROTRUDING) {

				Report.warn("design agreement not hold", `"${p.name}" sides=${sides}`
					+ ` r=${bCircle.radius.toFixed(5)} pro=${dProtruding.toFixed(5)}`
					+ ` XS_PROTRUDING=${BranchSpec.XS_PROTRUDING}`);

				logRadius = bCircle.radius - R_EXCESS;

			} else {
				logRadius = displayRMax + R_EXCESS;
			}


			if (isLowerCut)
				p.auxData["logRadius"] = Util.froundPos(logRadius);
			else
				p.auxData["logRadiusMin"] = Util.froundPos(logRadius); // INCORRECT!

		}

		//
		//   III. UV
		//
		// TODO(v2)? inscribed circle algorithm
		//
		var faceRect = new Rectangle(
			bCircle.x - displayR, bCircle.y - displayR,
			bCircle.x + displayR, bCircle.y + displayR
		);

		var faceVariant = displayR < 0.055 ? 1 : 0;

		var uVRect = new Rectangle(
			0.026715 + 0.25 * faceVariant, 1 - 0.993495,
			0.227876 + 0.25 * faceVariant, 1 - 0.94351
		);

		var uVRectProj = new RectangleProjection( faceRect, uVRect );

		polygon.traversePoints((p, i) => face.vertices[i / 2].uv
			.set(uVRectProj.projectX(p.x), uVRectProj.projectY(p.y)) );
	}



	static getSummary() {

		LoadingScreen.setupTextOutput( this.getSummary_1() );
	}


	static getSummary_1() {

		var res = `
// =================================================
//
//  !!! Auto-generated !!!
//
//
//    BranchSpecDataSummary.js
//
// BranchSpec.getSummary()
//
// =================================================

import { BranchSpec } from './BranchSpec.js';
import { Util } from '../Util/Util.js';


BranchSpec.ComputedSummary = Util.deepFreeze({
		`;

		res += '\n\n';

		for (let [ treeName, dataByTreeName ] of Object.entries(BranchSpec.byTreeName) ) {

			res += ('  "' + treeName + '": {\n\n');

			for (let [ branchName, data ] of Object.entries(dataByTreeName) ) {

				res = this.addBranchToSummary(treeName, branchName, data, res);
			}

			res += '  },\n\n';
		}

		res += `
});
		`;

		return res;
	}


	static addBranchToSummary(treeName, branchName, data, res) {

		var branchSpec = this.get(treeName, branchName);

		if (branchSpec.data.objName)
			return res;

		var splitGeometryData = branchSpec.getSplitGeometryData();

		if (!splitGeometryData)
			return res;


		res += '\t"' + branchName + '": {';

		res += ` maxHeight:${Util.froundPos(branchSpec._getMaxHeight())},`
			+ ` baseRadius:${Util.froundPos(branchSpec._getBaseRadius())},`
			+ ` cut0Radius:${Util.froundPos(branchSpec._getCut0RadiusMin())},\n`;

		res += '\t  logs:[\n';

		splitGeometryData.logs.forEach(log => {

			var elements = log.auxData.logData.cutoffMatrix.elements;

			var cutoff = elements.map(el => Util.toStr(el, 8));
			var cutoff1 = cutoff.slice(0, 6).join(",");
			var cutoff2 = cutoff.slice(6, 16).join(",");

			res += `\t\t{ r:${log.auxData.logRadius},`
				+ ` rMin:${log.auxData.logRadiusMin},`
				+ ` l:${Util.froundPos(BranchSpec.LOG_LENGTH)},`
				+ ` cutoff:[${cutoff1},\n`
				+ ` \t\t\t${cutoff2}] },\n`;
		});

		res += '\t  ],\n';


		res += '\t  cuts:[ ';

		splitGeometryData.cuts.forEach(cut => { // used to determine dP

			var r = 0.93 * cut.auxData.axisData.radius.avg;
			res += `{ r: ${Util.froundPos(r)} }, `;
		});

		res += '],\n';


		res += '\t},\n';

		return res;
	}


}


Object.assign(BranchSpec.prototype, {

	_v: new THREE.Vector3,

	_rotateX180Matrix: new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI),

	_saplingLeafTemplate: [ // Blender 2.8, "Sapling" add-on

		new THREE.Vector3,
		new THREE.Vector3(0, 0, 0.5),
		new THREE.Vector3(1, 0, 0.5),
	],
});


Object.assign(BranchSpec, {

	XS_PROTRUDING: 0.00815,
	XS_DISPLAY_MARGIN: 0.006,

	MIN_BEND_LENGTH: 0.25,

	STUMP_HEIGHT: 0.40,
	LOG_LENGTH: 0.90,
	CUT_LENGTH: 0.10,

	_sprng: null,
});


BranchSpec.byTreeName = {

	aspen: {},
};




export { BranchSpec };

