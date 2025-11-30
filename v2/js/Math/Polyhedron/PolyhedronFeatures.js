
import { Polyhedron } from './Polyhedron.js';

import { Polygon } from '../Polygon.js';


Polyhedron.Vertex = function(id, position, normal, uv, morphPosition, wind) {

	if (typeof this == "function")
		Polyhedron.throw("call to constructor w/o 'new'");

	this.id = id;
	this.edges = [];
	this.faces = [];
	//this.aggregate = undefined;

	// Geometry data
	this.position = position;
	this.normal = normal;
	this.uv = uv;
	this.morphPosition = morphPosition;

	// Custom attributes
	this.wind = wind;
}


Object.assign(Polyhedron.Vertex.prototype, {

	toString() {
		return `<Vertex id=${this.id} f=${this.faces.map(f => f.id).join(' ')}`
			+ ` e=${this.edges.map(e => e.id).join(' ')}>`;
	},


	// TODO? option not to clone geometry data
	clone() {
		return new Polyhedron.Vertex(
			this.id,
			this.position && this.position.clone(),
			this.normal && this.normal.clone(),
			this.uv && this.uv.clone(),
			this.morphPosition && this.morphPosition.map(posV => posV.clone()),
			this.wind && this.wind.clone(),
		);
	},

	addEdge(e) {
		if (this.edges.indexOf(e) !== -1)
			Polyhedron.throw("already have");
		this.edges.push(e);
	},


	removeEdge(e, skipIfAlreadyRemoved) {

		var i = this.edges.indexOf(e);

		if (i === -1) {
			//if (!skipIfAlreadyRemoved)
			//	Polyhedron.warn("no edge", `${e} | ${this}`);
			return;
		}

		Util.cut(this.edges, i);
	},


	addFace(f, maybeAlreadyAdded) {

		if (this.faces.indexOf(f) === -1) {

			this.faces.push(f);

		} else if (!maybeAlreadyAdded)
			Polyhedron.warn("already here", `${this} ${f}`);
	},


	removeFace(f) {

		var i = this.faces.indexOf(f);

		if (i === -1)
			Polyhedron.warn("no face", `${f}`);
		else
			Util.cut(this.faces, i);
	},

	numEdgesOfFace(f) {
		return this.edges.reduce((count, e) => count + (e.hasFace(f) ? 1 : 0), 0);
	},

	getEdgeTo(v) { return this.edges.find(e => e.vA === v || e.vB === v); },

/*
	isAggregate() { return Array.isArray(this.aggregate); },

	createAggregate() {
	},
*/

	distanceToSquared(v) { return this.position.distanceToSquared(v.position) },

	distanceTo(v) { return Math.sqrt( this.distanceToSquared(v) ) },

});



// ===============================================================
//
// * Edge has strictly 2 vertices, 0-2 faces.
//
//   In a theory edge may have 3+ faces. The library is targeting
// modeling of surfaces, limiting edge to have at most 2 faces.
//
// * If 1 face is connected then it's always fA.
//
// ===============================================================

Polyhedron.Edge = function(id, vA, vB) {

	if (typeof this == "function")
		Polyhedron.throw("call to constructor w/o 'new'");

	this.id = id;
	this.vA = vA;
	this.vB = vB;
	this.fA = undefined;
	this.fB = undefined;
}



Object.assign(Polyhedron.Edge.prototype, {

	toString() {
		return `<Edge id=${this.id}`
			+ ` vA=${this.vA && this.vA.id || ''} vB=${this.vB && this.vB.id || ''}`
			+ ` fA=${this.fA && this.fA.id || ''} fB=${this.fB && this.fB.id || ''}`
			+ `>`;
	},


	clone() {

		var e = new Polyhedron.Edge(this.id, this.vA, this.vB);

		e.fA = this.fA;
		e.fB = this.fB;

		return e;
	},


	isShort() {

		if (!this.vA || !this.vB) {
			Report.warn("defective edge", `${this}`);
			return 0;
		}

		if (!this.vA.position || !this.vB.position) {
			Report.warn("no vertex position", `${this}`);
			return 0;
		}

		return this.vA.distanceToSquared(this.vB) < 1.25 * Polyhedron.VertexPositionIndex.DISTANCE **2;
	},


	_edgeDirection: new THREE.Vector3,

	getEdgeDirection() {
		return this._edgeDirection.subVectors(this.vB.position, this.vA.position);
	},


	hasVertex(v) { return v && (this.vA === v || this.vB === v); },

	hasVertices(v1, v2) {
		return this.vA === v1 && this.vB === v2
			|| this.vA === v2 && this.vB === v1
	},

	getOtherVertex(v) {

		if (this.vA === v)
			return this.vB;

		else if (this.vB === v)
			return this.vA;

		else
			Polyhedron.throw("getOtherVertex", `e.id=${this.id} v=${v}`);
	},	


	replaceVertex(vFrom, vTo) {

		if (vFrom === vTo)
			Report.warn("same vertex", `${this} ${vFrom}`);

		if (this.vA === vFrom)
			this.vA = vTo;
		else if (this.vB === vFrom)
			this.vB = vTo;
		else
			Report.warn("not found", `${this} ${vFrom} ${vTo}`);
	},


	has2Faces() { return this.fA && this.fB },

	// If it has 1 face then it's .fA
	has1Face() { return this.fA && !this.fB },

	hasNoFaces() { return !this.fA },

	hasFace(f) { return this.fA === f || this.fB === f },

	numFaces() { return this.fB ? 2 : this.fA ? 1 : 0 },

/*
meaningless: often edges are shared
	revertDirection() {
		let v = this.vA;
		this.vA = this.vB;
		this.vB = v;
	},
*/

	addFace(f) { // silent OK if alreadyAdded

		if (this.fA === undefined) {
			this.fA = f;

		} else if (this.fA === f) {

		} else if (this.fB === undefined) {
			this.fB = f;

		} else if (this.fB === f) {

		} else
			Polyhedron.warn("attempted 3 faces/edge", `f.id=${f.id} this=${this}`);
	},


	removeFace(f) {

		if (this.fA === f) {

			if (this.fB) {
				this.fA = this.fB;
				this.fB = undefined;
			} else
				this.fA = undefined;

		} else if (this.fB === f) {
			this.fB = undefined;

		} else
			Polyhedron.warn("face not found", `face.id=${f.id} this=${this}`);
	},


	getOtherFace(f) {

		if (f === this.fA)
			return this.fB;

		if (f === this.fB)
			return this.fA;

		Polyhedron.warn("getOtherFace", `${this} ${f}`);
	},

	//
	// Return values:
	// number: on which side of the plane (negative or positive)
	// "cutData" JS Object: intersection data
	//
	vsPlane(plane) {

		var dA = plane.distanceToPoint(this.vA.position),
			dB = plane.distanceToPoint(this.vB.position);

		if (dA < 0 === dB < 0)
			return dA;

		var denominator = plane.normal.dot( this.getEdgeDirection() );

		var t; // vA:0.00 --> vB:1.00

		if (denominator === 0) {

			if (Math.abs(dA) > 1e-3) {
				Polyhedron.warn(`distance to vA=${dA}`, this);
				return dA;
			}

			t = 0;

		} else {
			t = -(this.vA.position.dot(plane.normal) + plane.constant) / denominator;
		}

		if (t < -1e-3 || t > 1 + 1e-3) { // must not happen

			Polyhedron.warn("bad t", `t=${t} this=${this}`);
		}

		t = Util.clamp(t, 0, 1);

		return { // "cutData"
			edge: this,
			t,
			//intersectPt,
			cutoffVA: dA < 0, // is vA cutoff? (on the negative side of the plane)
		};
	},


	avgPosition() {
		return this.vertices.reduce((avg, v) => avg.add(v.position),
			new THREE.Vector3).divideScalar(this.vertices.length);
	},


	_showData: new Map,

	show(addVect3, forceStatus, matName = "polyhedronEdge") {

		var mesh = this._showData.get(this);

		if (mesh) {

			if (forceStatus === true)
				return;

			scene.remove(mesh);
			this._showData.delete(this);
		}

		if (forceStatus === false)
			return;

		var lineSegments = new Float32Array([
			this.vA.position.x, this.vA.position.y, this.vA.position.z,
			this.vB.position.x, this.vB.position.y, this.vB.position.z
		]);

		var mesh = new THREE.Mesh(
			new LineSegmentsGeometry().setPositions(lineSegments),
			Assets.materials.line[ matName ]
		);

		addVect3 && mesh.position.add(addVect3);

		mesh.name = `PolyhedronEdge`;
		this._showData.set(this, mesh);
		scene.add(mesh);
	}

});



// ===============================================================
//
//
//
// ===============================================================

Polyhedron.Face = function(id, vertices, edges, normal) {

	if (typeof this == "function")
		Polyhedron.throw("call to constructor w/o 'new'");

	this.id = id;
	this.vertices = vertices;
	this.edges = edges;
	this.normal = normal;

	this._plane = null;
	this._boundingSphere = null;
}


Object.assign(Polyhedron.Face.prototype, {

	toString() {
		return `<Face id=${this.id}`
			+ ` v=${this.vertices.map(v => v && v.id).join(' ')}`
			+ ` e=${this.edges.map(e => e && e.id).join(' ')}>`;
	},


	setModified() {
		this._plane = null;
		this._boundingSphere = null;
	},


	nextEdgeIndex(i) {
		if (i < 0)
			Polyhedron.throw("bad i", `f=${this} i=${i}`);
		return i >= this.edges.length - 1 ? 0 : i + 1;
	},


	addEdge(e) {

		if (!e) {
			Polyhedron.warn("bad edge", `f=${this} e=${e}`);
			return;
		}

		if (this.edges.indexOf(e) !== -1) { // TODO why would it add?

			Polyhedron.warn("already have this edge", `f=${this} e=${e}`);
			return;
		}

		this.edges.push(e);
	},


	insertEdgeAtIndex(e, i, maybeAlreadyAdded) {

		if (this.edges.indexOf(e) === -1) {

			//this.edges.splice(i, 0, e);
			Util.cutAndInsert(this.edges, i, 0, 1, e);
			e.addFace(this);

		} else if (!maybeAlreadyAdded)
			Polyhedron.warn("edge already added", `f=${this} e=${e}`);
	},


	removeEdge(e) {

		var i = this.edges.indexOf(e);

		if (i >= 0)
			Util.cut(this.edges, i);
		else
			Polyhedron.throw("no edge", `f=${this} e=${e}`);
	},


	// (?) Assuming vertices are properly sequenced; edges and vertices properly connected.
	// Vertices and edges are always properly ordered (so far).
	orderEdges() {

		this.edges = this.vertices.map((v, i) => {

			//var nextVertex = this.vertices[ i === this.vertices.length - 1 ? 0 : i + 1 ];
			var nextVertex = Util.nextElement( this.vertices, i );

			var e = v.edges.find(e => e.vA === v && e.vB === nextVertex
				|| e.vB === v && e.vA === nextVertex);

			if (!e) {
				Polyhedron.warn("unconnected vertex", `f=${this} v=${v} nextV=${nextVertex}`);
				return;
			}

			// meaningless!
			//if (e.vA === nextVertex) // edges ordered vA -> vB
			//	e.revertDirection();

			return e;
		});
	},


	checkEdgesOrdered() {

		return this.edges.every((e, i) => {

			var	v1 = this.vertices[i],
				v2 = Util.nextElement( this.vertices, i );

			return e.hasVertices(v1, v2);
		});
	},


	nextVertexIndex(i) {
		if (i < 0)
			Polyhedron.throw("bad i", `f=${this} i=${i}`);
		return i >= this.vertices.length - 1 ? 0 : i + 1;
	},

	prevVertexIndex(i) {
		return i === 0 ? this.vertices.length - 1 : i - 1;
	},

	nextVertex(i) {
		return this.vertices[ this.nextVertexIndex(i) ];
	},


	addVertex(v, skipIfAlreadyAdded) {

		if (this.vertices.indexOf(v) !== -1) {

			if (!skipIfAlreadyAdded)
				Polyhedron.warn("already have this vertex", `f=${this} v=${v}`);

		} else
			this.vertices.push(v);
	},


	getVertexIndex(v, noWarn) {

		var i = this.vertices.indexOf(v);

		if (i === -1 && !noWarn)
			Polyhedron.warn("no vertex", `f=${this} v=${v} this=${this}`);

		return i;
	},


	insertVertexAtIndex(v, i) {

		//this.vertices.splice(i, 0, v);

		Util.cutAndInsert(this.vertices, i, 0, 1, v);

		v.addFace(this);
	},


	replaceVertexAtIndex(v, i) {

		Util.cutAndInsert(this.vertices, i, 1, 1, v);

		v.addFace(this);
	},


	insertVertexAfterIndex(v, i, maybeAlreadyAdded) {

		if (this.vertices.indexOf(v) === -1) {

			//this.vertices.splice(i + 1, 0, v);
			Util.cutAndInsert(this.vertices, i + 1, 0, 1, v);
			v.addFace(this, true);

		} else if (!maybeAlreadyAdded)
			Polyhedron.warn("vertex already added", `f=${this} v=${v}`);
	},


	removeVertex(v) {
		var i = this.vertices.indexOf(v);
		if (i >= 0)
			Util.cut(this.vertices, i);
	},


	vertexIndicesImmediatelyFollow(v1I, v2I) { // v1I --> v2I
		return v2I === v1I + 1 || v2I === 0 && v1I === this.vertices.length;
	},


	revertVertexOrder() {

		this.vertices.reverse();

		var e = this.edges.pop();
		this.edges.reverse().push(e);

		this.setModified();
	},


	getPlane() {

		if (this._plane)
			return this._plane;

		var plane = new THREE.Plane();

		if (this.normal) { // TODO consider avg.position
			plane.setFromNormalAndCoplanarPoint(this.normal, this.vertices[0].position);

		} else {
			var numVertices = this.vertices.length;
			var i1 = 1, i2 = 2;

			if (numVertices >= 5) {
				i1 = Math.floor(numVertices * 0.334);
				i2 = Math.floor(numVertices * 0.667);
			}

			// during mergeFace it adds normal.
			// In some other cases (e.g. cut) it appears w/o normal.
			//if (numVertices > 3)
			//	Polyhedron.warn("no normal", `face.id=${this.id} numVertices=${numVertices}`);

			plane.setFromCoplanarPoints(this.vertices[0].position,
				this.vertices[i1].position, this.vertices[i2].position);
		}

		return (this._plane = plane);
	},


	//getNormal() {
	//,
/*
	isCoplanar(face) {
		var epsilon = this.getPlane().epsilonEquals(face.getPlane());
		//console.log(`id=${this.id} face.id=${face.id} e=${epsilon}`);
		// Blender "mesh" -> "make planar faces" results in 1e-6 ... 5e-6.
		return epsilon < 3e-5;
	},
*/
	//
	// Return -1 (on negative side of plane), 1 or undefined (intersecting).
	// If the plane was obtained with .getPlane() then -1 would mean
	// inside of convex polyhedron.
	// undefined: face intersects plane.
	// Points exactly on the plane considered as if they are on the positive side.
	//
	getSideOfPlane(plane) {

		var side0;

		for (let i = 0; i < this.vertices.length; i++) {

			let side = plane.distanceToPoint(this.vertices[i].position) < 0 ? -1 : 1;

			if (side0 === undefined)
				side0 = side;
			else if (side !== side0)
				return;
		}

		return side0;
	},


	setNormals(normal) {

		this.vertices.forEach(v => {
			if (!v.normal)
				v.normal = normal.clone();
			else
				v.normal.copy(normal);
		});
	},


	enforceWindingOrder() {

		if (!this.normal) {
			Polyhedron.warn("must have face.normal");
			return;
		}

		// - It requires CW vertex order.
		// - getPlanarPolygon() produces CCW polygon on CW face (left-handed orthonormal base)

		var testCCWResult2 = this.getPlanarPolygon().testCCW();

		if (testCCWResult2)
			this.revertVertexOrder();
	},


	_edgeV: new THREE.Vector3,

	getEdgeV(i) { // direction from vertex i to the next vertex (not normalized)

		var v = this._edgeV.copy( this.vertices[ this.nextVertexIndex(i) ].position );

		return v.sub(this.vertices[i].position);
	},


	_planarPolygon: new Polygon,

	// It preserves indices, such as f.vertices[0].position becomes polygon.points[0,1].

	getPlanarPolygon(matrix = this.getProjectionOnPlaneMatrix(), polygon = this._planarPolygon) {

		polygon.setUpdated();

		var e = matrix.elements;
		var nVertices = this.vertices.length;

		for (let i = 0; i < nVertices; i++) {

			let pos = this.vertices[i].position;

			polygon.points[2 * i] = e[0] * pos.x + e[4] * pos.y + e[8] * pos.z + e[12];
			polygon.points[2 * i + 1] = e[1] * pos.x + e[5] * pos.y + e[9] * pos.z + e[13];
		}

		Util.setLength(polygon.points, 2 * nVertices);

		return polygon;
	},


	_projOnPlane: new THREE.Matrix4,
	_tmpU: new THREE.Vector3,
	_tmpV: new THREE.Vector3,
	_tmpN: new THREE.Vector3,

	// * produces CCW polygon on CW face (left-handed orthonormal base)

	getProjectionOnPlaneMatrix(plane = this.getPlane(), mat4 = this._projOnPlane, mat4Inv) {

		var n = plane.normal;
		var u = this._tmpU.set(0, 1, 0);

		u.addScaledVector( n, -n.dot(u) );

		if ( u.dot(u) > 0 )
			u.normalize();
		else
			u.set(1, 0, 0);

		var v = this._tmpV.crossVectors(u, n); // left-handed orthonormal base.

		Math.abs(v.x) < 1e-15 && (v.x = 0);
		Math.abs(v.y) < 1e-15 && (v.y = 0);
		Math.abs(v.z) < 1e-15 && (v.z = 0);

		if ( !(v.x === 0 || v.y === 0 || v.z === 0) )
			Report.warn("getProjectionOnPlaneMatrix", `v.x=${v.x} v.y=${v.y} v.z=${v.z}`);

		if (mat4Inv) { // (u, v, n) -> (x, y, z)

			let posV = this._tmpN.copy(n).multiplyScalar(-plane.constant);

			mat4Inv.makeBasis(u, v, n).setPosition(posV);
		}

		if (mat4) {

			mat4.set( // (x, y, z) -> (u, v, n)   "localToPlaneTransform"

				u.x, u.y, u.z, 0,
				v.x, v.y, v.z, 0,
				n.x, n.y, n.z, plane.constant,
				0, 0, 0, 1
			);

			return mat4;
		}
	},


	_intersectsLine3Pt: new THREE.Vector3,


	intersectsLine3(line3) { // line3 is in polyhedron's local space

		var plane = this.getPlane();

		var pt = plane.intersectLine(line3, this._intersectsLine3Pt);
		if (!pt) // incl. not-within-segment-endpoints
			return;

		var projPlaneMatrix = this.getProjectionOnPlaneMatrix();
		var polygon = this.getPlanarPolygon(projPlaneMatrix).forceCCW(true);

		pt.applyMatrix4(projPlaneMatrix);

		console.assert(Math.abs(pt.z) < 1e-9);

		return polygon.contains(pt.x, pt.y);
	},


	intersectsAnyOfLine3(line3s) {

		var plane = this.getPlane();
		var projPlaneMatrix = this.getProjectionOnPlaneMatrix();
		var polygon = this.getPlanarPolygon(projPlaneMatrix).forceCCW(true);

		for (let i = 0, len = line3s.length; i < len; i++) {

			let pt = plane.intersectLine(line3s[i], this._intersectsLine3Pt);

			if (!pt) // incl. not-within-segment-endpoints
				continue;

			pt.applyMatrix4(projPlaneMatrix);

			if ( polygon.contains(pt.x, pt.y) )
				return true;
		}
	},


	_positionArray: [],


	getBoundingSphere() {

		if (!this._boundingSphere) {

			this.vertices.forEach(v => this._positionArray.push(v.position));

			this._boundingSphere = new THREE.Sphere().setFromPoints(this._positionArray);
			this._positionArray.length = 0;
		}

		return this._boundingSphere;
	},


	_showData: new Map,


	show(matName) {

		var mesh = this._showData.get(this);

		if (mesh) {
			this._showData.delete(this);
			scene.remove(mesh);
			return;
		}


		var polygon = this.getPlanarPolygon();
		var triangleVertices = earcut(polygon.points);

		var posArray = [];

		for (let i = 0; i < triangleVertices.length; i += 3) {

			let i0 = triangleVertices[i],
				i1 = triangleVertices[i + 2], // getPlanarPolygon: CCW on CW face
				i2 = triangleVertices[i + 1];

			this.vertices[i0].position.toArray(posArray, i * 3);
			this.vertices[i1].position.toArray(posArray, i * 3 + 3);
			this.vertices[i2].position.toArray(posArray, i * 3 + 6);
		}


		var geometry = new THREE.BufferGeometry;

		geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(posArray), 3));

		var material;

		if (!matName) {

			material = new THREE.MeshBasicMaterial({

				color: new THREE.Color('cornflowerblue'),
				//depthTest: false,
				//side: 2,
			});

		} else {
			material = Assets.materials[matName];
			console.assert(material);
		}

		var mesh = new THREE.Mesh(geometry, material);

		mesh.name = `${this}`;
		mesh.renderOrder = 1e10;

		this._showData.set(this, mesh);
		scene.add(mesh);
	},

});



