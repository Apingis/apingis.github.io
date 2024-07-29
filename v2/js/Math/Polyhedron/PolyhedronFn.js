
import { Polyhedron } from './Polyhedron.js';

import { Line2 } from '../Line2.js';
import { Rectangle } from '../Rectangle.js';


Polyhedron.fromGeometry = function(geometry, name, mergeDistance = 0) {

	if (!geometry.index || !geometry.index.array)
		this.throw("indexed geometry only", `name=${geometry.name}`);

	if (geometry.morphAttributes.position && !geometry.morphTargetsRelative)
		this.throw("only morphTargetsRelative=true handled", `name=${geometry.name}`);

	var p = new Polyhedron;
	p.name = name || geometry.name;

	var indexToVertex = []; // "sparse array"


	var verticesByPosition;
	if (mergeDistance >= 0)
		verticesByPosition = Object.create(null);


	var vPI;
	if (mergeDistance > 0)
		vPI = new Polyhedron.VertexPositionIndex(mergeDistance);

	for (let i = 0; i < geometry.index.array.length; i += 3)
		p.addTriangleFromGeometry(geometry, i, indexToVertex, verticesByPosition, vPI);

	return p;
}


Polyhedron.prototype.addTriangleFromGeometry = function(geometry, i, indexToVertex, verticesByPosition, vPI) {

	var getVertex = (index) => {

		var v = indexToVertex[index];
		if (v)
			return v;

		v = this.addVertexFromGeometry(geometry, index, verticesByPosition, vPI);
		indexToVertex[index] = v;
		return v;
	};

	var indexArray = geometry.index.array;

	var vA = getVertex(indexArray[i]),
		vB = getVertex(indexArray[i + 1]),
		vC = getVertex(indexArray[i + 2]);

	var eA = this.getEdge(vA, vB),
		eB = this.getEdge(vB, vC),
		eC = this.getEdge(vC, vA);

	this.createFace([ vA, vB, vC ], [ eA, eB, eC ]);
}


Polyhedron.prototype.addVertexFromGeometry = function(geometry, i, verticesByPosition, vPI) {

	var	attr = geometry.attributes;

	var	position = new THREE.Vector3().fromArray(attr.position.array, i * 3);
	var	normal = attr.normal && new THREE.Vector3().fromArray(attr.normal.array, i * 3);
	var	uv = attr.uv && new THREE.Vector2().fromArray(attr.uv.array, i * 2);

	var	morphAttr = geometry.morphAttributes;

	var	morphPosition = morphAttr.position
		&& morphAttr.position.map(posAttr => new THREE.Vector3().fromArray(posAttr.array, i * 3));


	//
	//   2 types of vertex equality check.
	//
	// - exactly equal positions
	// - small difference in position
	// *** morphPosition is IGNORED ***
	//
	var diff = 1e-6; // for normal, uv


	var positionStr = position.x + "-" + position.y + "-" + position.z;
	var verticesSamePos = verticesByPosition[ positionStr ];

	if (verticesSamePos) {

		for (let i = 0; i < verticesSamePos.length; i++)
			if (checkEquality(verticesSamePos[i]))
				return verticesSamePos[i];
	}


	if (vPI) {

		let vertices = vPI.getNearest(position);

		for (let i = 0; i < vertices.length; i++)
			if (checkEquality(vertices[i]))
				return vertices[i];
	}


	var v = this.createVertex(position, normal, uv, morphPosition);

	if (verticesSamePos)
		verticesSamePos.push(v);
	else
		verticesByPosition[ positionStr ] = [ v ];


	if (vPI)
		vPI.insert(v);

	return v;


	function checkEquality(v) {
		return (!v.normal || v.normal.scalarAbsDiff(normal) < diff)
			&& (!v.uv || Math.abs(v.uv.x - uv.x) + Math.abs(v.uv.y - uv.y) < diff);
	}
}


Polyhedron.prototype.mergeFaces = function(warnAtVerticesPerFace = 200) {

	var faces = this.getFaces(); // array remains constant when faces deleted (added)

	var checkedFaces = new Set;
	var removedFaces = new Set;
	var normal = new THREE.Vector3;


	for (let i = 0; i < faces.length - 1; i++) {

		let face = faces[i];

		if (removedFaces.has(face))
			continue;

		let face2, sharedEdgeIndex = -1;

		for (let j = 0; j < face.edges.length; j++) {

			let edge = face.edges[j];

			face2 = edge.getOtherFace(face);

			if (!face2 || checkedFaces.has(face2))
				continue;

			let eps = face.getPlane().epsilonEquals(face2.getPlane());

			//let DELTA = 0.01;
			let DELTA = 0.0025;

			if (Main.DEBUG >= 5) {

				if (eps < DELTA && eps > DELTA / 5)
					Report.warn("* Face Merged <--", `${this.name} ${face.id} ${face2.id} -- ${(eps / DELTA).toFixed(2)}`);

				else if (eps >= DELTA && eps < DELTA * 3)
					Report.warn("Not Merged ==>", `${this.name} ${face.id} ${face2.id} -- ${(eps / DELTA).toFixed(2)}`);
			}

			if (eps < DELTA) {
				sharedEdgeIndex = j;
				break;
			}
		}


		if (sharedEdgeIndex === -1) {
			checkedFaces.add(face);
			continue;
		}

		if (!this._merge2Faces(face, face2, sharedEdgeIndex))
			continue;

		removedFaces.add(face2);


		// > 3 vertices, in case of concave face add normal.
		// .plane was created when it had 3 vertices.
		if (!face.normal)
			face.normal = face.getPlane().normal.clone();

		//if (face.vertices.length >= stopAtVerticesPerFace)
		//	continue;

		if (face.vertices.length === warnAtVerticesPerFace)
			this.warn(`Reached ${face.vertices.length} vertices/face`, `${this}`);

		i --; // reconsider merged face again (!traverse edges from the beginning)
	}

	return this;
}


Polyhedron.prototype._merge2Faces = function(face, face2, sharedEdgeIndex) {

	var	sharedEdge = face.edges[sharedEdgeIndex];

	if (face2.vertices.length < 3 || face2.vertices.length != face2.edges.length)

		return this.warn("bad face2, skip merge", `face2.id=${face2.id} this=${this}`
			+ ` v.len=${face2.vertices.length} e.len=${face2.edges.length}`);

	//console.log(`merging 2 faces ${face.id} ${face2.id}`);

	// _merge2Faces preserves vertex and edge order.
	//
	//   vA/vB  nextEdge2
	//  -->--+--->--
	//  face | face2
	//       |
	// shared|
	// edge  |
	//  --<--+---<--
	//     vB/vA

	var nextEdge2 = face2.edges[ face2.nextEdgeIndex(face2.edges.indexOf(sharedEdge)) ];

	this.removeEdge(sharedEdge);

	// After removal of sharedEdge, all edges from face2 are eligible for insertion
	var	edgeStartIndex2 = face2.edges.indexOf(nextEdge2),
		edgeCount = face2.edges.length,
		edgeInsertIndex = sharedEdgeIndex;


	// All but 2 vertices from face2 are for insertion
	var	vIA2 = face2.vertices.indexOf(sharedEdge.vA),
		vIB2 = face2.vertices.indexOf(sharedEdge.vB);

	var	vertexStartIndex2 = face2.nextVertexIndex(
		face2.vertexIndicesImmediatelyFollow(vIA2, vIB2) ? vIB2 : vIA2
	);
	var	vertexCount = face2.vertices.length - 2;
	var vertexInsertAfterIndex = sharedEdgeIndex;


	this.removeFace(face2);

	Util.processArray(face2.edges, edgeStartIndex2, edgeCount, (e, i) => {
		face.insertEdgeAtIndex(e, edgeInsertIndex ++, true);
	});

	Util.processArray(face2.vertices, vertexStartIndex2, vertexCount, (v, i) => {
		face.insertVertexAfterIndex(v, vertexInsertAfterIndex ++, true);
	});

	// TODO delete vertices w/ 2 edges (~180deg)

	return true;
}


// =================================================
//
// Triangle face for output (simplified):
// - can be w/o edges
// - vertices may have no references to face
// - isn't required to have unique id
//
// This function does not modify the polyhedron.
//
// =================================================

Polyhedron.prototype.getOutputTriangleFaces = function(concaveFaces) {

	var outputFaces = [];

	this.getFaces().forEach(face => {

		if (face.vertices.length < 3) {
			this.warn("bad face", `f.id=${face.id} this=${this}`);

		} else if (face.vertices.length === 3) {
			outputFaces.push(face);

		} else if (concaveFaces) {
			this.triangulateConcaveFace(face, outputFaces);

		} else
			this.triangulateConvexFace(face, outputFaces);
	});

	return outputFaces;
}


Polyhedron.prototype.triangulateConcaveFace = function(face, outputFaces) {

	//var mat4 = face.getProjectionOnPlaneMatrix();

	var polygon = face.getPlanarPolygon();//mat4);

	var triangleVertices = earcut(polygon.points);

	for (let i = 0; i < triangleVertices.length; i += 3) {

		let i0 = triangleVertices[i],
			i1 = triangleVertices[i + 2], // getPlanarPolygon: CCW on CW face
			i2 = triangleVertices[i + 1];

		let f = new Polyhedron.Face(-1, [
			face.vertices[i0], face.vertices[i1], face.vertices[i2]
		]);

		outputFaces.push(f);
	}
}


Polyhedron.prototype.triangulateConvexFace = function(face, outputFaces) {

	// Triangulation of N-gon produces N-2 triangles.

	var v0 = face.vertices[0],
		v1 = face.vertices[1];

	for (let i = 2; i < face.vertices.length; i++) {

		let	v2 = face.vertices[i];
		outputFaces.push(new Polyhedron.Face(-1, [ v0, v1, v2 ]));
		v1 = v2;
	}
}


Polyhedron.prototype.getGeometry = function(allParts, concaveFaces = true) { // Does not modify the polyhedron.

	if (allParts) {
		return Util.mergeGeometries(this.getAllParts().map(p => p.getGeometry(false, concaveFaces)) );
	}


	var vertices = this.getVertices();

	var geometry = Util.createGeometry(vertices.length);

	if (vertices[0] && vertices[0].morphPosition) {

		let shapeKeyCount = vertices[0].morphPosition.length;
		//for (let i = 1; i 
		// check equal #.of shapeKeys / add ones?

		Util.addMorphPositionAttributesToGeometry(geometry, shapeKeyCount);
		geometry.morphTargetsRelative = true;
	}

	var newVertexIndices = [];

	vertices.forEach((v, i) => {

		newVertexIndices[v.id] = i; // "sparse array"
		this.vertexToGeometry(v, geometry, i);
	});


	var outputFaces = this.getOutputTriangleFaces(concaveFaces);

	var indexArray = new Uint16Array(outputFaces.length * 3);

	outputFaces.forEach((face, i) => {

		for (let j = 0; j < 3; j++)
			indexArray[i * 3 + j] = newVertexIndices[ face.vertices[j].id ];
	});

	geometry.setIndex(new THREE.Uint16BufferAttribute(indexArray, 1));

	return geometry;
}


Polyhedron.prototype.vertexToGeometry = function(v, geometry, newI) {

	v.position.toArray(geometry.attributes.position.array, newI * 3);
	v.normal && v.normal.toArray(geometry.attributes.normal.array, newI * 3);
	v.uv && v.uv.toArray(geometry.attributes.uv.array, newI * 2);
	v.morphPosition && v.morphPosition.forEach( (posV, i) => posV
		.toArray(geometry.morphAttributes.position[i].array, newI * 3) );

	v.wind && v.wind.toGeometry(geometry, newI);
}



//
//   v6(id=7)  v7(id=8)    ^ +Y
//      +--------+         |
//  v5 /.    v4 /|         | / +Z
//    +--------+ |     +X  |/  (Right-handed
//    | .      | |     <---0  coordinate system)
//    | . . . .|.|
//    |. v2    |/ v3(id=4)
//    +--------+
//  v1(id=2)   v0(id=1)
//
// * vertex IDs are fixed
//
Polyhedron.prototype.createBox3 = function() {

	var v = new Array(8).fill(0).map(el => this.createVertex());
	var e = [];
	var edgeByVNum = (vNum1, vNum2) => v[vNum1].getEdgeTo(v[vNum2]);


	[ 0,1, 1,2, 2,3, 3,0,  4,5, 5,6, 6,7, 7,4,  0,4, 1,5, 2,6, 3,7 ].forEach((n, i, arr) =>

		!(i & 1) && e.push( this.createEdge(v[n], v[ arr[i + 1] ]) )
	);


	[ 0,1,2,3, 4,5,1,0, 5,6,2,1, 6,7,3,2, 7,4,0,3, 7,6,5,4 ].forEach((n, i, arr) =>

		!(i & 3) && this.createFace([
			v[n], v[ arr[i + 1] ], v[ arr[i + 2] ], v[ arr[i + 3] ]
		], [
			edgeByVNum(n, arr[i + 1]), edgeByVNum(arr[i + 1], arr[i + 2]),
			edgeByVNum(arr[i + 2], arr[i + 3]), edgeByVNum(arr[i + 3], n)
		])
	);

	return this;
}


Polyhedron.prototype.setFromBox3 = function(b) {

	if (!this.auxData._fromBox3) {

		if (this.vertexCount() > 0 || this.data.nextVertexId !== 1)
			this.throw("only from new or from before-created-from-box3");

		this.createBox3();
		this.auxData._fromBox3 = true;
	}

	for (let i = 1; i < 9; i++)

		this.vertexById[i].position.set(
			(i & 2) ? b.max.x : b.min.x,
			i > 4 ? b.max.y : b.min.y,
			((i - 1) & 2) ? b.max.z : b.min.z
		);

	return this;
}


Polyhedron.prototype.createRectangularFaceXY = function(x = 1, y = 1) {

	var n = new THREE.Vector3(0, 0, -1);

	var	vertices = [

		this.createVertex( new THREE.Vector3(0, 0, 0), n.clone(), new THREE.Vector2(1, 0) ),
		this.createVertex( new THREE.Vector3(0, y, 0), n.clone(), new THREE.Vector2(1, 1) ),
		this.createVertex( new THREE.Vector3(x, y, 0), n.clone(), new THREE.Vector2(0, 1) ),
		this.createVertex( new THREE.Vector3(x, 0, 0), n.clone(), new THREE.Vector2(0, 0) ),
	];

	var edges = vertices.map( (v, i, arr) =>
		this.createEdge(arr[ i === 0 ? arr.length - 1 : i - 1 ], v)
	);

	this.createFace(vertices, edges);

	return this;
}


Polyhedron.prototype.createFaceFromArray = function(array, adjustFlat = true) {

	if (array.length % 3 !== 0 || array.length < 9)
		this.warn("createFaceFromArray", `len=${array.length}`);

	var	vertices = [];
	var plane;

	for (let i = 0; i < array.length; i += 3) {

		let pos = new THREE.Vector3().fromArray(array, i);

		if (adjustFlat && i >= 9)
			pos.moveToPlane(plane);

		let v = this.createVertex(pos);

		vertices.push(v);

		if (adjustFlat && i === 6)
			plane = new THREE.Plane().setFromCoplanarPoints(vertices[0].position,
				vertices[1].position, vertices[2].position);
	}

	var edges = vertices.map( (v, i, arr) =>
		this.createEdge(arr[ i === 0 ? arr.length - 1 : i - 1 ], v)
	);

	this.createFace(vertices, edges);

	return this;
}


// =========================================
//
//   Operations on Polyhedron
//
// =========================================

Object.assign(Polyhedron.prototype, {

	_matrix3: new THREE.Matrix3,
	_rect: new Rectangle,
});


Polyhedron.prototype.applyMatrix4 = function(matrix4) {

	var normalMatrix = this._matrix3.getNormalMatrix(matrix4);

	this.forEachVertex(v => {
		v.position.applyMatrix4(matrix4);
		v.normal && v.normal.applyNormalMatrix(normalMatrix);
	});

	this.forEachFace(f => {
		f.normal && f.normal.applyNormalMatrix(normalMatrix); // transformDirection() ? (+ applyRotation TODO)
		f.setModified();
	});

	this.position.applyMatrix4(matrix4);

	return this;
}


Polyhedron.prototype.scale = function(factor, origin = new THREE.Vector3) {

	if (!Number.isFinite(factor))
		this.throw("scale", `factor=${factor} ${this}`);

	return this.forEachVertex(v => {
		v.position.sub(origin).multiplyScalar(factor).add(origin)
	});
}


Polyhedron.prototype.translate = function(offsetV) {

	return this.forEachVertex(v => v.position.add(offsetV));
}


Polyhedron.prototype.getRect = function(rect = this._rect) { // Projection onto the plane y=0

	rect.clear();

	this.forEachVertex(v => rect.expandByVector3(v.position));

	return rect;
}

/*
Polyhedron.prototype.applyAxisAngle = function() {

	this.forEachVertex(v => {
		//v.position.z = -v.position.z;
		v.position.y = -v.position.y;
	});

	this.forEachFace(f => {
		//f.normal && f.normal.applyNormalMatrix(normalMatrix);
		f.setModified();
	});

	return this;
}
*/

Polyhedron.prototype.removeShortEdges = function() {

	while (1) {

		let haveShortEdgesThisRun = false;

		let edges = this.getEdges();

		for (let i = 0; i < edges.length; i++) {

			if ( !edges[i].isShort() )
				continue;

			haveShortEdgesThisRun = true;

			this.collapseEdge(edges[i]);
//console.error(`> removed short edge ${edges[i]}`);

			break;
		}

		if (!haveShortEdgesThisRun)
			break;
	}

	return this;
}



Polyhedron.prototype.collapseEdge = function(e) {

	var	keepVertex = e.vA,
		removeVertex = e.vB;

	var resolveWouldBeDegenerateFace = f => {

		if ( !f || f.vertices.length > 3 )
			return;

		if (f.edges.length !== 3)
			this.warn("invalid degenerate face case 1", `${f} ${this}`);

		var wouldBeDegenerateEdge = f.edges.find(edge => edge !== e && !edge.hasVertex(keepVertex));

		if ( !wouldBeDegenerateEdge || !wouldBeDegenerateEdge.hasVertex(removeVertex) )
			this.warn("invalid degenerate face case 2", `${f} ${wouldBeDegenerateEdge} ${this}`);


		var keepEdge = f.edges.find(edge => edge !== e && edge.hasVertex(keepVertex));

		if ( !keepEdge || keepEdge.hasVertex(removeVertex) )
			this.warn("invalid degenerate face case 3", `${f} ${keepEdge} ${this}`);


		this.removeFace(f);

		var switchFace = wouldBeDegenerateEdge.fA; // if has 1 face - it's at .fA

		this.removeEdge(wouldBeDegenerateEdge);


		if (switchFace) { 

			switchFace.addEdge(keepEdge);
			keepEdge.addFace(switchFace);
		}
	};

	resolveWouldBeDegenerateFace(e.fA);
	resolveWouldBeDegenerateFace(e.fB);


	this.removeEdge(e); // removes edge from vertices, faces

//console.log(`removeVertex after resolve-degenerate, remove: ${removeVertex}`);

	removeVertex.edges.forEach(e => {

		e.replaceVertex(removeVertex, keepVertex);
		keepVertex.addEdge(e);
		// edge faces remain
	});


	removeVertex.faces.forEach(f => { // Vertex order must be preserved.

		var keepVI = f.getVertexIndex(keepVertex, true);

		if (keepVI === -1) {

			let removeVI = f.getVertexIndex(removeVertex);

			f.replaceVertexAtIndex(keepVertex, removeVI); // adds face to vertex

		} else {
			f.removeVertex(removeVertex);
		}

		f.orderEdges();
	});


	keepVertex.position.add(removeVertex.position).multiplyScalar(0.5);

	this._removeVertex(removeVertex);

}


// =============================================================
//
// Content on the negative side of the plane is to be removed.
// (exactly on the plane - remains).
// - some faces are fully removed
// - some faces are modified:
// -- some vertices, edges removed
// -- added coplanar vertices, edges
// - created new faces
//
// * Can handle closed polyhedron w/ concave faces (not always true; TODO)
// * Can handle non-closed if it results in 1 face
//
// =============================================================

Polyhedron.prototype.cutWithPlaneCreateFaces = function(cutPlane, duplicate = true) {

	var newEdges = this.cutWithPlane(cutPlane);

	// No edges mean following cases:
	// - polyhedron features are completely removed (fully on the negative side)
	// - nothing changed (fully on positive side)

	if (newEdges.size === 0)
		return this.warn("no edges", `this=${this}`);


	var haveShortEdges, haveShortEdgesThisRun;

	while (1) {

		haveShortEdgesThisRun = false;

		newEdges.forEach(e => {

			if (!e.isShort())
				return;

			haveShortEdges = true;
			haveShortEdgesThisRun = true;

			this.collapseEdge(e); // TODO what if !duplicate
			newEdges.delete(e);

//console.error(`removed short edge ${e}, newEdges:`, [ ...newEdges ].map(e=>e.clone()) );
		});

		if (!haveShortEdgesThisRun)
			break;
	}

	var chains = this.connectEdgesInChains(newEdges);
	
	var faces = this.createFlatFaces(chains, cutPlane.normal, duplicate);

	return faces;
}


// Return set of newly added (coplanar) edges
Polyhedron.prototype.cutWithPlane = function(plane) {

	var cutEdges = new Map;
	var newEdges = new Set;

	var faces = this.getFaces();

	for (let i = 0; i < faces.length; i++) {

		let face = faces[i];

		if (face.vertices.length < 3) {
			this.warn("degenerate face", `f=${face} this=${this}`);
			continue;
		}

		this.cutFaceEdgesWithPlane(face, plane, cutEdges, newEdges);
	}

	return newEdges;
}


Polyhedron.prototype.cutFaceEdgesWithPlane = function(face, plane, cutEdges, newEdges) {

	var rangeVertexIds;

	Util.processFalseRanges(

		face.vertices,
		v => plane.distanceToPoint(v.position) >= 0,

		(startI, endI) => (rangeVertexIds || (rangeVertexIds = []))
			.push( face.vertices[startI].id, face.vertices[endI].id ),

		() => this.removeFace(face, true),
	);

	if (!rangeVertexIds)
		return;
//console.log(`rangeVertexIds=${rangeVertexIds.join(' ')} | f=${face}`);

	for (let i = 0; i < rangeVertexIds.length; i += 2)

		this.cutFaceEdgesWithPlane_Range(face, plane,
			rangeVertexIds[i], rangeVertexIds[i + 1], cutEdges, newEdges);
}	


Polyhedron.prototype.cutFaceEdgesWithPlane_Range = function(face, plane,
		startVId, endVId, cutEdges, newEdges) {

//console.warn(`==/== f=${face} ${startVId} ${endVId}`);

	var getVertexIndexById = id => face.vertices.findIndex(v => v.id === id);

	var	startVertexI = getVertexIndexById(startVId),
		endVertexI = getVertexIndexById(endVId);

//console.log(`startVertexI=${startVertexI} endVertexI=${endVertexI} f=${face}`);
	if (startVertexI === -1 || endVertexI === -1)
		return this.warn("vertex index not found", `${startVertexI} ${endVertexI} f=${face} this=${this}`);

	var	startEdgeI = Util.prevIndex( face.edges, startVertexI ),
		endEdgeI = endVertexI;

	// newEdge1 -->-- negative side -->-- newEdge2
	var newEdge1 = this.cutEdgeWithPlane(face, startEdgeI, plane, cutEdges);
	var newEdge2 = this.cutEdgeWithPlane(face, endEdgeI, plane, cutEdges);

	if (!newEdge1 || !newEdge2)
		return this.warn("missing edges", `${newEdge1} | ${newEdge2} | f=${face} ${this}`);;

	// Replace range: 1+ vertices and 2+ edges w/ 2 vertices and 3 edges.

	// 1. Vertices

	Util.cutAndProcess( face.vertices, startVertexI, endVertexI, v => v.removeFace(face) );

	// a) newEdge1.vB, newEdge2.vB appear properly ordered
	// b) after cut'n'process face.vertices, startVertexI may appear beyond face.vertices.length.
	//    in such case it places vertex at the end of the array.

	face.insertVertexAtIndex(newEdge1.vB, startVertexI);
	face.insertVertexAtIndex(newEdge2.vB, startVertexI + 1);

	// 2. Edges

	var newCoplanarEdge = this.createEdge(newEdge1.vB, newEdge2.vB);

	Util.cutAndProcess(face.edges, startEdgeI, endEdgeI, e => {

		e.removeFace(face);
		this.removeEdgeAndVerticesIfWithoutFaces(e);
	});

	face.insertEdgeAtIndex(newEdge1, startEdgeI); // face gets added to edge
	face.insertEdgeAtIndex(newCoplanarEdge, startVertexI);
	face.insertEdgeAtIndex(newEdge2, startVertexI + 1);
//console.log(`after cut'n'insert: ${face} | NEW EDGES: ${newEdge1} ${newCoplanarEdge} ${newEdge2}`);

	if ( Main.DEBUG >= 5 && ! face.checkEdgesOrdered() ) {

		console.error(`edges not ordered this=${this} f=${face} | ${face.edges.map(e => e + '').join(' ')}`);

		face.orderEdges();

		console.log(`after ordering f=${face}`);
	}

	newEdges.add(newCoplanarEdge);
}



Polyhedron.prototype.cutEdgeWithPlane = function(f, edgeI, plane, cutEdges) {

	var e = f.edges[edgeI];

	if (!e)
		return this.warn("no edge", `${f} edgeI=${edgeI} this=${this}`);

	var result = cutEdges.get(e);

	if (result)
		return result;

//console.log(`==/== f=${f.id} e=${e.id} cut`);
	var cutData = e.vsPlane(plane);

	if (Number.isFinite(cutData))
		return this.warn("doesn't intersect", `e.id=${e.id} f.id=${f.id} cutData=${cutData}`);

	var	vRemains = cutData.cutoffVA ? e.vB : e.vA; // this one remains
		//vCutoff = cutData.cutoffVA ? e.vA : e.vB; // this one gets cut off

	//var position = e.getEdgeDirection().clone().multiplyScalar(cutData.t).add(e.vA.position),
	var position = e.vA.position.clone().addScaledVector( e.getEdgeDirection(), cutData.t),

		normal = e.vA.normal
			&& e.vA.normal.clone().slerp(e.vB.normal, cutData.t),

		uv = e.vA.uv
			&& e.vA.uv.clone().multiplyScalar(1 - cutData.t)
			.addScaledVector(e.vB.uv, cutData.t),

		wind = e.vA.wind // !!TODO wrong
			&& Wind.createInterpolated(e.vB.wind, e.vA.wind, cutData.t);

	// TODO w/o morphPosition
	var v = this.createVertex(position, normal, uv, null, wind);

	// Created edge has 1 new vertex which appears as e.vB

	var newEdge = this.createEdge(vRemains, v);

	cutEdges.set(e, newEdge);
	return newEdge;
}


// ===============================================================
//
// Input: unordered edges
// Find edges connected with common vertex or coincident vertex
// Return: array of edge chains
//
// ===============================================================

Polyhedron.prototype.connectEdgesInChains = function(edges) {

	var vPI = new Polyhedron.VertexPositionIndex;

	// 1. Insert all vertices into position index
	for (let e of edges) {
		insertVertex(e.vA);
		insertVertex(e.vB);
	}


	// 2. Loop over edges, walk along each edge & assign chain ID
	var	chainIdByEdge = new Map,
		halfEdge = new Polyhedron.HalfEdge,
		nextChainId = 1,
		chains = [];

	for (let e of edges) {

		if (chainIdByEdge.has(e))
			continue;

		var chain = getChain(e);
		if (!chain) // 2+ next edges
			return;

		chains.push(chain);
	};

	return chains;


	function getChain(e) {

		var chain = new Polyhedron.EdgeChain(nextChainId ++, e);

		if (!walkAlongEdges(halfEdge.set(e.vB, e), chain))
			return;

		chain.edges.reverse();

		if (!chain.isCircular) {
			if (!walkAlongEdges(halfEdge.set(e.vA, e), chain))
				return;
		}

		return chain;
	}


	function walkAlongEdges(halfEdge, chain) { // walk & assign ID

		while (1) {
			chainIdByEdge.set(halfEdge.e, chain.id);

			halfEdge = nextHalfEdge(halfEdge, chain);

			if (halfEdge === undefined)
				return true;

 			if (halfEdge === false)
				return;
//console.warn(`nextHalfEdge=${halfEdge} e.id=${halfEdge.e.id}`);

			let id = chainIdByEdge.get(halfEdge.e);
			if (id !== undefined) {

				if (id === chain.id) {
					//console.assert(direction === 1);
					chain.isCircular = true;
					return true;
				}

				if (id) {
					Polyhedron.warn("encountered processed chain", `id=${id}, curr.id=${chain.id}`);
					return;
				}
			}

			chain.edges.push(halfEdge.e);
		}
	}

	//
	// Given half-edge (vertex and continue-along edge), return next half-edge.
	// Original halfEdge gets replaced w/ new content.
	// Populates chain.coincidentVertices.
	// Return undefined if no next edge, false on 2+ next edges.
	//
	function nextHalfEdge(halfEdge, chain) {

		var nextVertex = halfEdge.otherVertex();
		var nextEdge = findNextEdge(halfEdge.e, nextVertex);

		if (nextEdge === false)
			return false;

		// Check coincident vertices
		var vFrom = nextVertex;
		var coincidentVertices = vPI.getCoincident(nextVertex);
//console.warn(`coincidentVertices (v.id=${halfEdge.v.id}): ${coincidentVertices.map(v=>v.id).join(" ")}`);

		for (let i = 0; i < coincidentVertices.length; i++) {

			let result = findNextEdge(halfEdge.e, coincidentVertices[i], vFrom);
//console.log(`v.id=${coincidentVertices[i].id} result=${result}`);

			if (result === undefined)
				continue;
			if (result === false)
				return false;

			if (nextEdge) {
				Polyhedron.warn("2+ next edges", `${halfEdge} -> 1) ${nextEdge} 2) ${result}`
					+ ` | coincidentV: ${coincidentVertices.map(v => v + '').join(' ')}`);
				return false;
			}

			nextEdge = result;
			nextVertex = coincidentVertices[i];

			chain.coincidentVertices.set(vFrom, nextVertex);
			chain.coincidentVertices.set(nextVertex, vFrom);
		}

		if (nextEdge)
			return halfEdge.set(nextVertex, nextEdge);
	}


	// Arrived via "e" and "vFrom"; at "v";
	// Return next edge to continue along, or false if 2+ such edges, or undefined.
	function findNextEdge(e, v, vFrom) {

		var nextEdge;

		for (let i = 0; i < v.edges.length; i++) {

			let e2 = v.edges[i];
			if (e === e2 || !edgeIsConsidered(e2))
				continue;

			if (e2.hasVertex(vFrom)) // probably short edge (between coincident vertices)
				continue;

			if (!nextEdge) {
				nextEdge = e2;

			} else {
				Polyhedron.warn("2+ next edges", `e.id=${e.id} v.id=${v.id}`);
				return false;
			}
		}

		return nextEdge;
	}


	function edgeIsConsidered(e) { return edges.has(e); }

	function insertVertex(v) {
		//if (!vPI.has(v.position))
			vPI.insert(v);
	}

} // .connectEdgesInChains()


// ===========================================================
//
// Duplicate vertices, create new edges, create the face.
// Resulting face is not necessarily convex.
// Set normals, winding.
//
// ===========================================================

Polyhedron.prototype.createFlatFaces = function(chains, oppositeNormal, duplicate) {

	if (!chains || chains.length === 0)
		return this.warn("no chains", `this=${this}`);

	// 1. It requires ordered vertex list

	if (chains.length === 1) {

		let face = this.createFaceFromVertices( chains[0].getVertices(), oppositeNormal, duplicate );

		return face ? [ face ] : undefined;


	} else if (chains.every(chain => chain.isCircular)) {

		let faces = [];

		chains.forEach(chain => {

			var face = this.createFaceFromVertices( chain.getVertices(), oppositeNormal, duplicate );

			face && faces.push(face);
		});

		return faces.length > 0 ? faces : undefined;


	} else if (chains.length === 2) {

		if (!duplicate)
			return Report.warn("chains.length=2, !duplicate", `${this}`);

		let vertices = this.getFaceVerticesFrom2Chains(chains[0], chains[1], oppositeNormal);
		let face = vertices && this.createFaceFromVertices(vertices, oppositeNormal, duplicate);

		return face ? [ face ] : undefined;
	}

	this.warn(`${chains.length} chains, some are non-circular: not handled`);
}


// Given array of existing vertices, possibly duplicate 'em & create new face.

Polyhedron.prototype.createFaceFromVertices = function(vertices, oppositeNormal, duplicate) {

	// 2. Create new vertices (duplicate given ones)

	if (!vertices || vertices.length < 3)
		return this.warn(`${vertices && vertices.length} vertices - skip face creation`);

	var edges;

	if (duplicate) {
// TODO!
		vertices.forEach((v, i, arr) => arr[i] = this.createDuplicateVertex(v));

		edges = vertices.map((v, i) => {

			var nextVertex = Util.nextElement( vertices, i );

			return this.createEdge(v, nextVertex);
		});


	} else {

		edges = [];

		let edgesOK = vertices.every((v, i) => {

			var nextVertex = Util.nextElement( vertices, i );
			var e = v.getEdgeTo(nextVertex);

			if (!e)
				return Report.warn("no edgeTo", `${v} -> ${nextVertex} | ${this}`);

			edges.push(e);

			return true;
		});

		if (!edgesOK)
			return;
	}

	// 3. Create face (+face normal)

	var normal = oppositeNormal.clone().negate();

	var face = this.createFace(vertices, edges, normal);

	// 4. Set normals (+vertex normals), winding order

	if (duplicate)
		face.setNormals(normal);

	face.enforceWindingOrder();

	return face;
}



Object.assign(Polyhedron.prototype, {

	_from2Chains_Line31: new THREE.Line3,
	_from2Chains_Line32: new THREE.Line3,
});

Polyhedron.prototype.getFaceVerticesFrom2Chains = function(chain1, chain2, oppositeNormal) {

	if (chain1.isCircular || chain2.isCircular) {

		this.warn("2 chains, have circular chain - case is not handled", `this=${this}`);

		return;
	}


	var vertices1 = chain1.getVertices(),
		vertices2 = chain2.getVertices();


	var	line31 = this._from2Chains_Line31.set( // copies vals. into pts.
		vertices1[0], vertices1[ vertices1.length - 1 ]
	);

	var line32 = this._from2Chains_Line32.set(
		vertices2[0], vertices2[ vertices2.length - 1 ]
	);

	var iData = line31.intersect2Lines(line32);

	var segmentsIntersect = iData
		&& iData.x >= 0 && iData.x <= 1
		&& iData.y >= 0 && iData.y <= 1
		&& iData.z < 0.01;

	if (segmentsIntersect)
		vertices2.reverse();


	Array.prototype.push.apply(vertices1, vertices2);

	return vertices1;
}


Object.assign(Polyhedron.prototype, {

	_distanceRangePosition: new THREE.Vector3,

	_distanceRange: {
		min: 0, max: 0,
		set(min, max) { this.min = min; this.max = max; return this; },
	},
});

Polyhedron.prototype.distanceRangeToClosestPointOnRay = function(ray) {

	var position = this._distanceRangePosition; // relative to ray.origin
	var dMin = Infinity, dMax = -Infinity;

	this.forEachVertex(v => {

		position.subVectors(v.position, ray.origin);

		var d = position.dot(ray.direction);
		dMin = Math.min(dMin, d);
		dMax = Math.max(dMax, d);
	});

	return this._distanceRange.set(dMin, dMax);
}


Polyhedron.prototype.getVertexDistancesToClosestPointOnRay = function(ray, sort = true) {

	var position = this._distanceRangePosition; // relative to ray.origin

	var result = [];

	this.forEachVertex(v => {

		position.subVectors(v.position, ray.origin);
		var d = position.dot(ray.direction);

		result.push({
			v,
			d
		});
	});

	if (sort)
		result.sort((a, b) => a.d - b.d);

	return result;
}


Polyhedron.prototype.fartherstVertex = function(position) {

	var	dMax = 0;
	var	resultVertex;

	this.forEachVertex(v => {

		var distance = position.distanceTo(v.position);
		if (distance > dMax) {
			dMax = distance;
			resultVertex = v;
		}
	});

	return resultVertex;
}


Polyhedron.prototype.nearestVertex = function(position) {

	var	dMin = Infinity;
	var	resultVertex;

	this.forEachVertex(v => {

		var distance = position.distanceTo(v.position);
		if (distance < dMin) {
			dMin = distance;
			resultVertex = v;
		}
	});

	return resultVertex;
}


// ===========================================================
//
// Return array of disconnected parts.
// Features (v/e/f) of the original polyhedron get distributed
// over newly created ones.
// Original polyhedron remains empty.
//
// * checkSamePosition: 2 vertices are counted as same vertex
//   if they have exactly same position.
//
// ===========================================================

Polyhedron.prototype.splitDisconnectedParts = function(checkSamePosition = true) {

	var	vertices = this.getVertices();
	if (vertices.length === 0) {
		this.warn("empty polyhedron", `this=${this}`);
		return [];
	}

	var	visitedVerticesById = Object.create(null), // holds target polyhedron part.
		visitedEdgesById = Object.create(null),
		visitedFacesById = Object.create(null);


	var verticesByPosition;

	if (checkSamePosition)
		verticesByPosition = Object.create(null);


	var origP = this;
	var	disconnectedParts = [];

	this.forEachVertex((v, i) => {

		if (v.id in visitedVerticesById)
			return;

		let p = new Polyhedron().copyNextIds(this);
		disconnectedParts.push(p);

		collectFeaturesWalkNextVertex(v, p);
	});


	if (checkSamePosition)

		Object.keys(verticesByPosition).forEach(key => {

			var vertices = verticesByPosition[ key ];
			if (vertices.length <= 1)
				return;

			var p0 = visitedVerticesById[ vertices[0].id ];

			for (let i = 1; i < vertices.length; i++) {

				let pCurrent = visitedVerticesById[ vertices[i].id ];
				if (pCurrent === p0)
					continue;

				// pCurrent is disconnected part, has vertex in same pos. w/ p0

				//joinPart(p0, pCurrent);
				//pCurrent.joinPolyhedron(p0);
				p0.joinPolyhedron(pCurrent, true);

				Object.keys(visitedVerticesById).forEach(id => {

					if (visitedVerticesById[id] === pCurrent)
						visitedVerticesById[id] = p0;
				});

				Util.removeElement(disconnectedParts, pCurrent);
			}
		});


	return disconnectedParts;


	function collectFeaturesWalkNextVertex(v, p) {

		p._addVertex(v);
		origP._removeVertex(v);

		visitedVerticesById[v.id] = p;

		addVerticesSamePosition(v);

		v.faces.forEach(f => {

			if (f.id in visitedFacesById)
				return;

			p._addFace(f);
			origP._removeFace(f);
			visitedFacesById[f.id] = true;
		});
		
		v.edges.forEach(e => {

			if (e.id in visitedEdgesById)
				return;

			p._addEdge(e);
			origP._removeEdge(e);
			visitedEdgesById[e.id] = true;

			var vNext = e.getOtherVertex(v);
			if (vNext.id in visitedVerticesById)
				return;

			collectFeaturesWalkNextVertex(vNext, p);
		});
	}


	function addVerticesSamePosition(v) {

		if (!checkSamePosition)
			return;

		var positionStr = v.position.x + "-" + v.position.y + "-" + v.position.z;
		var verticesSamePos = verticesByPosition[ positionStr ];

		if (verticesSamePos)
			verticesSamePos.push(v);
		else
			verticesByPosition[ positionStr ] = [ v ];
	}

/*
	function joinPart(pTo, pFrom) {

		pFrom.getVertices().forEach(v => pTo._addVertex(v));
		pFrom.getFaces().forEach(f => pTo._addFace(f));
		pFrom.getEdges().forEach(e => pTo._addEdge(e));
	}
*/
}


Polyhedron.prototype.joinPolyhedron = function(pFrom, preserveIds = false) {

	pFrom.getVertices().forEach(v => {

		if (!preserveIds)
			v.id = this.data.nextVertexId ++;
		this._addVertex(v);
	});

	pFrom.getFaces().forEach(f => {

		if (!preserveIds)
			f.id = this.data.nextFaceId ++;
		this._addFace(f);
	});

	pFrom.getEdges().forEach(e => {

		if (!preserveIds)
			e.id = this.data.nextEdgeId ++;
		this._addEdge(e);
	});
}


/*
Polyhedron.prototype.findVertex = function(testFn) {

	this.getVertices().find(v => testFn(v));
}
*/

Polyhedron.prototype.findVertexByUV = function(x, y, epsilon = 0) {

	return this.getVertices().find(v => {

		return v.uv && Math.abs(v.uv.x - x) <= epsilon
			&& Math.abs(v.uv.y - y) <= epsilon;
	});
}


Polyhedron.prototype.intersectsLine3 = function(line3) { // in polyhedron's local space

	var bSphere = this.getBoundingSphere();

	if (line3.distanceTo(bSphere.center) > bSphere.radius)
		return;

	var faces = this.getFaces();

	for (let i = 0; i < faces.length; i++)

		if (faces[i].intersectsLine3(line3))
			return true;
}


Polyhedron.prototype.intersectsAnyOfLine3 = function(line3s) { // in polyhedron's local space

	var bSphere = this.getBoundingSphere();

	if ( line3s.every(line3 => line3.distanceTo(bSphere.center) > bSphere.radius) )
		return;

	return this.getFaces().some( face => face.intersectsAnyOfLine3(line3s) );
}



