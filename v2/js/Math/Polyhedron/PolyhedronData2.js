
import { Polyhedron } from './Polyhedron.js';

// ===============================================================
//
//   Polyhedron - Data Structures 2
//
// * HalfEdge
// * VertexPositionIndex
// * EdgeChain
//
// ===============================================================

Polyhedron.HalfEdge = function(v, e) {

	if (typeof this == "function")
		Polyhedron.throw("call to constructor w/o 'new'");

	this.v = v;
	this.e = e;
}


Object.assign(Polyhedron.HalfEdge.prototype, {

	toString() { return `[HalfEdge v.id=${this.v && this.v.id} e.id=${this.e && this.e.id}]`; },

	otherVertex() { return this.e.getOtherVertex(this.v); },

	set(v, e) {
		this.v = v;
		this.e = e;
		return this;
	},

});



// ==========================================
//
//   Vertices inserted into k-d tree
//
// ==========================================

Polyhedron.VertexPositionIndex = function(distance) {//vertices = []) {

	if (typeof this == "function")
		Polyhedron.throw("call to constructor w/o 'new'");

	if (distance === undefined)
		distance = Polyhedron.VertexPositionIndex.DISTANCE;

	this.distanceSq = distance * distance;

	this.positionToVertex = new Map;
	//vertices.forEach(v => this.positionToVertex.set(v.position, v));

	this.tree = new kdTree(
		[],//vertices.map(v => v.position),
		(a, b) => Util.hypotSq3(a.x - b.x, a.y - b.y, a.z - b.z),
		[ "x", "y", "z" ]
	);

}

Polyhedron.VertexPositionIndex.DISTANCE = 1e-4;


Object.assign(Polyhedron.VertexPositionIndex.prototype, {

	has(pos) {
		console.assert(pos instanceof THREE.Vector3);
		return this.positionToVertex.has(pos);
	},

	get(pos) {
		console.assert(pos instanceof THREE.Vector3);
		return this.positionToVertex.get(pos);
	},


	insert(v) {

		if (this.has(v.position)) // same position obj - skip
			return;

		this.tree.insert(v.position);
		this.positionToVertex.set(v.position, v);
	},


	remove(v) {
		this.tree.remove(v.position);
		this.positionToVertex.delete(v.position);
	},


	getNearest(position, distanceSq = this.distanceSq, count = 1000) {

		return this.tree.nearest(position, count, distanceSq)
			.map(el => this.get(el[0]) );
	},


	getCoincident(v, distanceSq = this.distanceSq, count = 1000) {

		var result = [];

		this.tree.nearest(v.position, count, distanceSq).forEach(el => {

			// Each element is 2-element array: [ position, distanceSq ]
			var vertex = this.get(el[0]);
			if (!vertex) {
				Polyhedron.warn("no vertex", `position:${el[0]}`);
				return;
			}

			if (vertex !== v)
				result.push(vertex);
		});

		return result;
	},

});



// ===============================================================
//
//
//
// ===============================================================

Polyhedron.EdgeChain = function(id, e0) {

	if (typeof this == "function")
		Polyhedron.throw("call to constructor w/o 'new'");

	this.id = id;
	this.edges = [ e0 ];
	this.isCircular = false;
	this.coincidentVertices = new Map;
}


Object.assign(Polyhedron.EdgeChain.prototype, {

	// Get vertex shared by 2 edges.
	// If 2 coincident vertices then the one at i1 returned.
	getSharedVertex(i1, i2) {

		var e1 = this.edges[i1],
			e2 = this.edges[i2];

		if (this.vertexIsCommonWithEdge(e1.vA, e2))
			return e1.vA;

		if (this.vertexIsCommonWithEdge(e1.vB, e2))
			return e1.vB;
	},


	vertexIsCommonWithEdge(v, e) {
		return e.hasVertex(v) || e.hasVertex(this.coincidentVertices.get(v))
	},


	endVertexA() {
		if (this.edges.length === 1)
			return this.edges[0].vA;

		return this.edges[0].getOtherVertex(this.getSharedVertex(0, 1));
	},


	endVertexB() {
		var lastEdgeI = this.edges.length - 1;

		if (lastEdgeI === 0)
			return this.edges[0].vB;

		return this.edges[lastEdgeI].getOtherVertex(this.getSharedVertex(lastEdgeI, lastEdgeI - 1));
	},


	// At each edge connection, 1 of 2 coincident vertices get listed.
	// Order is endVertexA --> endVertexB
	getVertices() {

		var vertices = [ this.endVertexA() ];

		for (let i = 0; i < this.edges.length - 1; i++) {

			let v = this.getSharedVertex(i, i + 1);
			if (!v) {
				Polyhedron.warn("vertex not found", `i=${i}`); // shouldn't happen
				return;
			}

			vertices[i + 1] = v;
		}

		if (!this.isCircular)
			vertices.push(this.endVertexB());

		//return vertices;
		return this.removeCollinearVertices(vertices);
	},


	removeCollinearVertices(vertices) {

		var numVertices = vertices.length;
		if (numVertices < 3)
			return vertices;

		var angleDiffMax = 5e-4;

		var	lastV = vertices[0].position.clone().sub(vertices[numVertices - 1].position),
			currV = new THREE.Vector3;

		var isNotCollinear = () => Math.abs(currV.angleTo(lastV)) > angleDiffMax;

		var filteredVertices = [];

		var addFilteredVertex = (i) => filteredVertices.push(vertices[i]);


		for (let i = 1; i < numVertices; i++) {

			currV.subVectors(vertices[i].position, vertices[i - 1].position);

			if (i === 1 && !this.isCircular || isNotCollinear())
				addFilteredVertex(i - 1);

			lastV.copy(currV);
		}


		if (!this.isCircular) {
			addFilteredVertex(numVertices - 1);

		} else {
			currV.subVectors(vertices[0].position, vertices[numVertices - 1].position);

			if (isNotCollinear())
				addFilteredVertex(numVertices - 1);
		}

		return filteredVertices;
	},


	show(addVect3, matName = "edgeChain") {

		this.edges.forEach(e => e.show(addVect3, true, matName));
	},

});




/*
// =======================================================================
//
// A position in 3D space can be occupied by several coincident vertices.
//
// =======================================================================
/*
Polyhedron.VertexPosition = function() {

	if (typeof this == "function")
		Polyhedron.throw("call to constructor w/o 'new'");

	this.vertices = [];
	this.edges = [];
}


Object.assign(Polyhedron.VertexPosition.prototype, {

	add(v) {
		if (this.vertices.indexOf(v) !== -1) {
			console.error(`already added v.id=${v.id}`);
			return;
		}

		for (let i = 0; i < this.edges.length; i++) {
			if (this.edges[i].hasVertex(v))
				this.edges.splice(i --, 1);
		}

		v.edges.forEach(e => {
			var otherV = e.getOtherVertex(v);
			if (this.vertices.indexOf(otherV) === -1)
				this.edges.push(e);
		});

		this.vertices.push(v);
	},

});
*/




