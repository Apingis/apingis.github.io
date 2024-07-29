
class Polyhedron {

	constructor() {

		this.id = Polyhedron.nextId ++;
		this.name = undefined;

		this.vertexById = Object.create(null);
		this._vertices = null;
		this.edgeById = Object.create(null);
		this._edges = null;
		this.faceById = Object.create(null);
		this._faces = null;

		this.data = {
			nextVertexId: 1,
			nextEdgeId: 1,
			nextFaceId: 1,
		};

		//this.vPI = null;

		this.position = new THREE.Vector3;
		this.parts = [];

		this._boundingSphere = null;

		this.auxData = {}; // not cloned
	}


	toString() {

		var name = this.name ? ` ${this.name}` : '';

		return `[Polyhedron id=${this.id}${name} `
			+ `${this.getVertices().length}v,${this.getEdges().length}e,`
			+ `${this.getFaces().length}f]`;
	}


	_updateBoundingVolumes() {
		this._boundingSphere = null;
	}


	_addVertex(v) {
		this.vertexById[v.id] = v;
		this._vertices && this._vertices.push(v);
		this._updateBoundingVolumes();
	}

	_removeVertex(v) {
		delete this.vertexById[v.id];
		this._vertices = null;
		this._updateBoundingVolumes();
	}

	getVertices() {
		return this._vertices || (this._vertices = Object.values(this.vertexById));
	}


	forEachVertex(fn) { // No definite vertex order. Returns this.

		var	vertices = this.getVertices(),
			length = vertices.length;

		for (let i = 0; i < length; i++)
			fn(vertices[i], i);
		
		return this;
	}

	vertexCount() { return this.getVertices().length; }


	filterAndMapVertices(fn) {

		var result = [];

		this.forEachVertex((v, i) => {

			var res = fn(v, i);
			res && result.push(res);
		});

		return result;
	}


	_addEdge(e) {
		this.edgeById[e.id] = e;
		this._edges && this._edges.push(e);
	}

	_removeEdge(e) {
		delete this.edgeById[e.id];
		this._edges = null;
	}

	getEdges() {
		return this._edges || (this._edges = Object.values(this.edgeById));
	}


	_addFace(f) {
		this.faceById[f.id] = f;
		this._faces && this._faces.push(f);
	}

	_removeFace(f) {
		delete this.faceById[f.id];
		this._faces = null;
	}

	getFaces() {
		return this._faces || (this._faces = Object.values(this.faceById));
	}

	getFaceById(id) { return this.faceById[id] }


	forEachFace(fn) {

		var faces = this.getFaces();

		for (let i = 0; i < faces.length; i++)
			fn(faces[i], i);
	}


	clone(alsoParts, customFn) { // Recursively w/ vertices, edges, faces; ID's remain the same

		var	p = new Polyhedron;

		p.name = this.name;

		this.forEachVertex(v => p._addVertex(v.clone())); // edges, faces remain empty


		this.getEdges().forEach(e => { // fA, fB remain undefined

			var vA = p.vertexById[e.vA.id],
				vB = p.vertexById[e.vB.id];

			if (!vA || !vB)
				this.throw("invalid edge", this);

			p._addEdge( new Polyhedron.Edge(e.id, vA, vB) );
		});


		this.forEachFace(f => {

			var f2 = new Polyhedron.Face(
				f.id,
				f.vertices.map(v => p.vertexById[v.id]),
				f.edges.map(e => p.edgeById[e.id]),
				f.normal && f.normal.clone()
			);

			p._addFace(f2);
		});


		this.forEachVertex(v => {

			var v2 = p.vertexById[v.id];
			v.edges.forEach((e, i) => v2.edges[i] = p.edgeById[e.id]);
			v.faces.forEach((f, i) => v2.faces[i] = p.faceById[f.id]);
		});

		
		this.getEdges().forEach(e => {

			var e2 = p.edgeById[e.id];
			if (e.fA !== undefined)
				e2.fA = p.faceById[e.fA.id];
			if (e.fB !== undefined)
				e2.fB = p.faceById[e.fB.id];
		});


		p.copyNextIds(this);

		p.position.copy(this.position);

		if (customFn)
			customFn(p, this);

		if (alsoParts)
			this.parts.forEach(part => p.parts.push(part.clone(true, customFn)));

		return p;
	}


	print() {

		var str = `${this}\n`;

		this.getVertices().forEach(v => str += `${v}\n`);
		this.getEdges().forEach(e => str += `${e}\n`);
		this.getFaces().forEach(f => str += `${f}\n`);

		console.log(str);
	}


	copyNextIds(p) {
		this.data.nextVertexId = p.data.nextVertexId;
		this.data.nextEdgeId = p.data.nextEdgeId;
		this.data.nextFaceId = p.data.nextFaceId;
		return this;
	}


	setName(name) {
		this.name = name;
		return this;
	}


	add(p) {
		if ( !(p instanceof Polyhedron) )
			this.throw("not a polyhedron");

		if (this.parts.indexOf(p) === -1)
			this.parts.push(p);
		return this;
	}


	getAllParts() { // this + "children"
		var parts = [];
		this.traverseParts(p => parts.push(p));
		return parts;
	}


	traverseParts(fn) {
		fn(this);
		this.parts.forEach(p => p.traverseParts(fn));
	}


	remove(p) {
		this.parts.splice(this.parts.indexOf(p), 1);
		return this;
	}


	throw(...args) { Report.throw(...args); }

	warn(...args) { Report.warn(...args); }

	static throw(...args) { Report.throw(...args); }

	static warn(...args) { Report.warn(...args); }

}


Object.assign( Polyhedron, {

	nextId: 1,

	_v1: new THREE.Vector3,
	_v2: new THREE.Vector3,
});



Polyhedron.prototype.getBoundingSphere = function() {

	return this._boundingSphere || (
		this._boundingSphere = new THREE.Sphere().setFromPoints(this.getVertices().map(v => v.position))
	);
}


Polyhedron.prototype.createVertex = function(position = new THREE.Vector3,
		normal, uv, morphPosition, wind) {

	var v = new Polyhedron.Vertex(this.data.nextVertexId ++,
		position, normal, uv, morphPosition, wind);
	this._addVertex(v);
	return v;
}


Polyhedron.prototype.createDuplicateVertex = function(v) {

	var v2 = v.clone();
	v2.id = this.data.nextVertexId ++;
	this._addVertex(v2);
	return v2;
}


Polyhedron.prototype.removeVertexIfWithoutEdges = function(v) {

	if (v.edges.length === 0) {

		if (v.faces.length !== 0)
			this.throw("vertex has face, no edges", v);

		this._removeVertex(v);
	}
}


// Get edge w/ endpoints vA and vB. If it doesn't exist then create it.
// Edge is considered to be undirected.
Polyhedron.prototype.getEdge = function(vA, vB) {

	return vA.edges.find(e => e.hasVertex(vB)) || this.createEdge(vA, vB);
}


Polyhedron.prototype.createEdge = function(vA, vB) {

	var e = new Polyhedron.Edge(this.data.nextEdgeId ++, vA, vB);
	this._addEdge(e);

	vA.addEdge(e);
	vB.addEdge(e);

	return e;
}


Polyhedron.prototype.removeEdge = function(e) {

	e.vA.removeEdge(e);
	e.vB.removeEdge(e);

	e.fA && e.fA.removeEdge(e);
	e.fB && e.fB.removeEdge(e);

	this._removeEdge(e);
}


Polyhedron.prototype.removeEdgeAndVerticesIfWithoutFaces = function(e) {

	if (e.hasNoFaces()) {

		this.removeEdge(e);
		this.removeVertexIfWithoutEdges(e.vA);
		this.removeVertexIfWithoutEdges(e.vB);
	}
}


Polyhedron.prototype.createFace = function(vertices, edges, normal) {

	var f = new Polyhedron.Face(this.data.nextFaceId ++, vertices, edges, normal);

	vertices.forEach(v => v.addFace(f));
	edges.forEach(e => e.addFace(f));

	this._addFace(f);
	return f;
}


Polyhedron.prototype.removeFace = function(f, removeUnusedEdgesVertices) {

	f.vertices.forEach(v => v.removeFace(f));
	f.edges.forEach(e => e.removeFace(f));

	this._removeFace(f);

	if (removeUnusedEdgesVertices)
		f.edges.forEach(e => this.removeEdgeAndVerticesIfWithoutFaces(e));
}


Polyhedron.prototype.addWind = function() {

	return this.forEachVertex(v => !v.wind && (v.wind = new Wind()));
}


Polyhedron.prototype.removeWind = function() {

	return this.forEachVertex(v => v.wind && (v.wind = null));
}


Polyhedron.prototype.stopWind = function() {

	return this.forEachVertex(v => v.wind.type = "None");
}


// ======================================
//
//   DEBUG
//
// ======================================

Polyhedron.prototype.getNormalsMesh = function() {

	var lineSegments = new Float32Array(this.vertexCount() * 6);

	var k = 0.08;

	this.getVertices().every((v, i) => {

		if (!v.normal)
			return Report.warn("no normal", `${v} this=${this}`);

		lineSegments.set([
			v.position.x, v.position.y, v.position.z,
			v.position.x + k * v.normal.x, v.position.y + k * v.normal.y, v.position.z + k * v.normal.z
		], i * 6);

		return true;
	});
	
	var mesh = new THREE.Mesh(

		new LineSegmentsGeometry().setPositions(lineSegments),
		Assets.materials.line.polyhedronNormal
	);

	mesh.name = `Normals ${this}`;
	mesh.userData.isPolyhedron = true;

	return mesh;
}



Polyhedron.prototype.addEdgesToLineSegments = function(lineSegments = [], matrix) {

	var	vA = Polyhedron._v1,
		vB = Polyhedron._v2;

	var edges = this.getEdges();

	for (let i = 0, len = edges.length; i < len; i++) {

		vA.copy( edges[i].vA.position );
		vB.copy( edges[i].vB.position );

		if (matrix) {

			vA.applyMatrix4(matrix);
			vB.applyMatrix4(matrix);
		}

		lineSegments.push( vA.x, vA.y, vA.z,  vB.x, vB.y, vB.z );
	}

	return lineSegments;
}


Polyhedron.prototype.getEdgesMesh = function(matName = "polyhedronEdge") {

	var lineSegments = this.addEdgesToLineSegments();

	var mesh = new THREE.Mesh(

		new LineSegmentsGeometry().setPositions(lineSegments),
		Assets.materials.line[ matName ]
	);

	mesh.name = `Edges ${this}`;
	mesh.userData.isPolyhedron = true;

	return mesh;
}



Polyhedron.prototype._showData = new Map;

Polyhedron.prototype.show = function(addV = new THREE.Vector3) {

	var data = this._showData.get(this);

	if (data) {

		scene.remove(data.mesh);
		this._showData.delete(this);
		return;
	}


	var verticesMesh = new THREE.Mesh( Util.mergeGeometries(

		this.getVertices().map(v => {

			var g = new THREE.SphereBufferGeometry(0.025);

			g.translate(v.position.x, v.position.y, v.position.z);
			//NO! g.translate(v.position);
			//if (addV)
			//	g.translate(addV.x, addV.y, addV.z);

			return g;
		})

	), Assets.materials.polyhedronVertex);

	if (addV)
		verticesMesh.position.copy(addV);

	verticesMesh.name = `${this}`;
	verticesMesh.userData.isPolyhedron = true;

	verticesMesh.add( this.getEdgesMesh() );

	//verticesMesh.add( this.getNormalsMesh() );


	this._showData.set(this, { mesh: verticesMesh });

	scene.add(verticesMesh);

/*
	var mesh = this.getEdgesMesh();

	this._showData.set(this, { mesh });

	scene.add(mesh);
*/
	return this;
}




export { Polyhedron };

