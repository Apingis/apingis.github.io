
Object.assign(THREE.Plane.prototype, {

	_intersectPlaneV: new THREE.Vector3,
	_normalV: new THREE.Vector3,
	_showData: new Map,
});


THREE.Plane.prototype.intersectPlane = function(plane, target) {

	var u = this._intersectPlaneV.crossVectors(this.normal, plane.normal);

	// determine max abs coordinate of cross product
	var	absX = Math.abs(this.x),
		absY = Math.abs(this.y),
		absZ = Math.abs(this.z);

	if (absX + absY + absZ < 1e-9)
		return Report.warn("parallel planes", plane);

	var maxCoord = absX > absY ? (absX > absZ ? 0 : 2) : (absY > absZ ? 1 : 2);

	// to get a point on the intersect line
    // zero the max coord, and solve for the other two

	if (maxCoord === 0) {
		target.start.x = 0;
		target.start.y = (plane.constant * this.normal.z - this.constant * plane.normal.z) / u.x;
		target.start.z = (this.constant * plane.normal.y - plane.constant * this.normal.y) / u.x;

	} else if (maxCoord === 1) {
		target.start.x = (this.constant * plane.normal.z - plane.constant * this.normal.z) / u.y;
		target.start.y = 0;
		target.start.z = (plane.constant * this.normal.x - this.constant * plane.normal.x) / u.y;

	} else {
		target.start.x = (plane.constant * this.normal.y - this.constant * plane.normal.y) / u.z;
		target.start.y = (this.constant * plane.normal.x - plane.constant * this.normal.x) / u.z;
		target.start.z = 0;
	}

	target.end.addVectors(target.start, u);

	return true;
}


THREE.Plane.prototype.epsilonEquals = function(plane) {

	return this._normalV.copy( this.normal ).sub( plane.normal ).length()
//		+ Math.abs(this.constant - plane.constant);
}


THREE.Plane.prototype.setFromLineAndDistance = function(start, end, distance) {

	this.normal.subVectors(end, start).normalize();
	this.constant = -(distance + this.normal.dot(start));

	return this;
}

//
// Negative side of the plane (points w/ negative distance, opposite
// to the direction of plane.normal) appear backwards of the direction of ray.
//
THREE.Plane.prototype.setFromRayAndDistance = function(ray, distance) {

	this.normal.copy(ray.direction);
	this.constant = -(distance + this.normal.dot(ray.origin));

	return this;
}


THREE.Plane.prototype.show = function(addVect3) {

	var mesh = this._showData.get(this);

	if (mesh) {
		scene.remove(mesh);
		this._showData.delete(this);

	} else {
		mesh = new THREE.Mesh(HelperGeometry.getPlane(this), Assets.materials.plane);
		addVect3 && mesh.position.add(addVect3);
		scene.add(mesh);
		mesh.name = "Plane";
		this._showData.set(this, mesh);
	}

	return this;
}




Object.assign(THREE.Ray.prototype, {

	setFrom2Points(p1, p2) {

		this.origin.copy(p1);
		this.direction.subVectors(p2, p1).normalize();

		return this;
	},


	setFromCamera(camera, ndcX, ndcY, ndcZ = 0.5) {

		this.origin.setFromMatrixPosition( camera.matrixWorld );
		this.direction.set( ndcX, ndcY, ndcZ ).unproject(camera)
			.sub(this.origin).normalize();

		return this;
	},

});




// Include any rotation around (0, 0) in the box.
THREE.Box3.prototype.expandByRotationY = function() {

	var r = Util.hypot(
		Math.max(this.max.x, -this.min.x),
		Math.max(this.max.z, -this.min.z)
	);

	this.min.x = -r;
	this.max.x = r;
	this.min.z = -r;
	this.max.z = r;

	return this;
}


THREE.Box3.prototype.sizeX = function() { return this.max.x - this.min.x; }

THREE.Box3.prototype.centerX = function() { return (this.max.x + this.min.x) / 2; }

THREE.Box3.prototype.centerZ = function() { return (this.max.z + this.min.z) / 2; }




// ==========================
//
//   THREE.Vector3
//
// ==========================

Object.assign(THREE.Vector3.prototype, {

	_moveTowardsV: new THREE.Vector3,
	_showData: new Map,
	_angleSignedV: new THREE.Vector3,


	//toString(v) { // somehow it's called by renderer
	//	return `[Vec3 ${Util.toStr(this.x)} ${Util.toStr(this.y)} ${Util.toStr(this.z)}]`;
	//},

	hasNaN(v) {
		return this.x !== this.x || this.y !== this.y || this.z !== this.z;
	},

	scalarAbsDiff(v) {
		return Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z);
	},

	maxAbsValue() {
		return Math.max( Math.abs(this.x), Math.abs(this.y), Math.abs(this.z) );
	},

	distance2DTo(x, y) {
		return Util.hypot(this.x - x, this.z - y);
	},

	// Vectors must be of unit length. Axis need not be of unit length or orthogonal.
	angleSignedTo(axis, v) {

		console.assert( (axis instanceof THREE.Vector3) && (v instanceof THREE.Vector3) );

		var dot = Util.clamp(this.dot(v), -1, 1);

		if (Math.abs(dot) === 1) // this excludes |this X v|=0
			return dot === 1 ? 0 : -Math.PI;

		var angle = Math.acos(dot);

		if ( this._angleSignedV.crossVectors(this, v).dot(axis) < 0 )
			angle = -angle;

		return angle;
	},


	makeOrthogonalTo(v) {
		return this.addScaledVector( v, -this.dot(v) );
	},


	rotateXY(theta) {

		var	cos = Math.cos(theta), sin = Math.sin(theta);

		return this.set(
			this.x * cos - this.y * sin,
			this.y * cos + this.x * sin,
			this.z
		);
	},


	slerp(v, t) {

		var qStart = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), this);
		var qEnd = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), v);

		return this.set(1, 0, 0).applyQuaternion(qStart.slerp(qEnd, t));
	},


	moveTowards(dstV, d) {

		var deltaV = this._moveTowardsV.copy(dstV).sub(this);

		var length = deltaV.length();
		if (length === 0) // rule out the case of 0/0=NaN
			return this;

		return this.add( deltaV.multiplyScalar(Math.min(1, d / length)) );
	},


	moveToPlane(plane) { // .projectPoint() w/o target (?)

		var d = plane.distanceToPoint(this);

		return this.addScaledVector(plane.normal, -d);
	},

//
// TODO (?)
// * improvement in precision (format-breaking) (?)
// * detect out-of-upper-bound values
//
	getUint32() {

		var BASE_EXP = 10;

		var exp = 1 + Math.floor( Math.log2(this.maxAbsValue()) );
		var multiplier = exp >= 0 ? 1 / (1 << exp) : 1 << -exp;

		var to9Bits = (a) => {

			var sign = 0;
			if (a < 0) {
				sign = 256;
				a = -a;
			}

			a *= multiplier;

			var result = sign | ((a * 256) & 255);
			return result;
		}

		var result = to9Bits(this.x) | (to9Bits(this.y) << 9) | (to9Bits(this.z) << 18)
			| ((exp + BASE_EXP) << 27);

		return result >>> 0;
	},


	setFromUint32(u) {

		var BASE_EXP = 10;

		var pow = (u >>> 27);
		var multiplier = (1 << pow) * (1 / (1 << BASE_EXP) / 256);

		var toNumber = (a) => {

			var sign = 1 - ((a & 256) >> 7);
			a &= 255;
			return a * sign * multiplier;
		}

		return this.set(
			toNumber(u >>> 0),
			toNumber(u >>> 9),
			toNumber(u >>> 18)
		);
	},


	getFloat() {

		var BASE_EXP = 10;

		var exp = 1 + Math.floor( Math.log2(this.maxAbsValue()) );
		var multiplier = exp >= 0 ? 1 / (1 << exp) : 1 << -exp;

		var to6Bits = (a) => {

			var sign = 0;
			if (a < 0) {
				sign = 32;
				a = -a;
			}

			a *= multiplier;

			console.assert( !(a < 0 || a >= 1) );

			var result = sign | ((a * 32) & 31);
			return result;
		}

		var result = to6Bits(this.x) | (to6Bits(this.y) << 6) | (to6Bits(this.z) << 12)
			| ((exp + BASE_EXP) << 18);

		return result >>> 0;
	},


	setFromFloat(u) {

		var BASE_EXP = 10;

		var pow = (u >>> 18);
		var multiplier = (1 << pow) * (1 / (1 << BASE_EXP) / 32);

		var toNumber = (a) => {

			var sign = 1 - ((a & 32) >> 4);
			a &= 31;
			return a * sign * multiplier;
		}

		return this.set(
			toNumber(u >>> 0),
			toNumber(u >>> 6),
			toNumber(u >>> 12)
		);
	},


	applyRotation(mat4) { // THREE.REVISION="127" contains the same in .transformDirection()
//console.error(`!`);
		const x = this.x, y = this.y, z = this.z;
		const e = mat4.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z;

		return this;
	},



	show(add, r = 0.1, matName = 'sphere') {

		var mesh = this._showData.get(this);

		if (mesh) {
			this.showOff();

		} else {
			mesh = new THREE.Mesh(new THREE.SphereBufferGeometry(r), Assets.materials[matName]);
			mesh.position.copy(this);
			if (add) {
				console.assert(add instanceof THREE.Vector3);
				mesh.position.add(add);
			}
			scene.add(mesh);
			this._showData.set(this, mesh);
		}

		return this;
	},


	showOff() {

		var mesh = this._showData.get(this);

		if (mesh) {
			scene.remove(mesh);
			this._showData.delete(this);
		}
	},


	showOn(add, r, matName) {
		this.showOff();
		this.show(add, r, matName);
	},

});




THREE.Sphere.prototype._showData = new Map;


THREE.Sphere.prototype.show = function() {

	var mesh = this._showData.get(this);

	if (mesh) {
		scene.remove(mesh);
		this._showData.delete(this);
		return;
	}

	var geometry = new THREE.SphereBufferGeometry(this.radius, 24, 20);
	var posArray = geometry.attributes.position.array;

	for (let i = 0; i < posArray.length; i += 3) { // THREE.BufferGeometry.translate?

		posArray[i] += this.center.x;
		posArray[i + 1] += this.center.y;
		posArray[i + 2] += this.center.z;
	}

	var mat = Assets.materials.sphereTransparent;

	mesh = new THREE.Mesh(geometry, mat);
	scene.add(mesh);
	this._showData.set(this, mesh);

	return this;
}



// ================================
//
//   THREE.Quaternion
//
// ================================

Object.assign(THREE.Quaternion.prototype, {

	_upV: new THREE.Vector3,
	_fwdV: new THREE.Vector3,

	_axisV1proj: new THREE.Vector3,
	_axisV2proj: new THREE.Vector3,
	//_from2VAndAxis: new THREE.Vector3,

	_pB1tmp: new THREE.Vector3,
	_pB2tmp: new THREE.Vector3,
	_pC1tmp: new THREE.Vector3,
	_pC2tmp: new THREE.Vector3,
	_q1tmp: new THREE.Quaternion,
});


// new THREE.Vector3(0,1,0).applyQuaternion(q)
THREE.Quaternion.prototype.getUpV = function(v = this._upV) {

	v.x = 2 * (this.x * this.y - this.w * this.z);
	v.y = 1 - 2 * (this.x * this.x + this.z * this.z);
	v.z = 2 * (this.y * this.z + this.w * this.x);

	return v;
}

// new THREE.Vector3(1,0,0).applyQuaternion(q)
THREE.Quaternion.prototype.getForwardV = function(v = this._fwdV) {

	v.x = 1 - 2 * (this.y * this.y + this.z * this.z);
	v.y = 2 * (this.x * this.y + this.w * this.z);
	v.z = 2 * (this.x * this.z - this.w * this.y);

	return v;
}


THREE.Quaternion.prototype.rotateXLocal = function(angle) {

	this.premultiply(
		this._q1tmp.setFromAxisAngle( this.getForwardV(), angle )
	);

	return this;
}


// Axis should be normalized.
THREE.Quaternion.prototype.setFrom2VectorsAndAxis = function(v1, v2, axis) {

	//
	// Project given vector onto the plane containing origin,
	// to which 'axis' is plane normal. Normalize the result.
	//
	var projectNormalizeVector = (v, target) => target.copy(v)
		.addScaledVector(axis, -axis.dot(v)).normalize();

	return this.setFromUnitVectors(

		projectNormalizeVector(v1, this._axisV1proj),
		projectNormalizeVector(v2, this._axisV2proj)
	);

/* w/ trig.
	// Project given vectors onto the plane containing origin, to which 'axis' is plane normal.
	var projectVector = (v, d, target) => target.copy(v).addScaledVector(axis, -d);

	var d1 = axis.dot(v1);
	var v1proj = projectVector(v1, d1, this._axisV1proj);

	var d2 = axis.dot(v2);
	var v2proj = projectVector(v2, d2, this._axisV2proj);

	var d = Math.sqrt( Math.max(0, (1 - d1 * d1) * (1 - d2 * d2)) );
	var angle = Math.acos( Util.clamp(v1proj.dot(v2proj) / d, -1, 1) );

	if (this._from2VAndAxis.copy(axis).cross(v1proj).dot(v2proj) < 0)
		angle = -angle;

	return this.setFromAxisAngle(axis, angle);
*/
}

//
// Determine rotation from the 1st triangle to the 2nd triangle.
// pA1, pA2 are at the origin. pB1, pB2 should be normalized.
//
THREE.Quaternion.prototype.setFrom2TrianglesAtOriginNorm = function(pB1, pC1, pB2, pC2) {

	var q1 = this._q1tmp.setFromUnitVectors(pB1, pB2);

	this.setFrom2VectorsAndAxis(

		this._pC1tmp.copy(pC1).applyQuaternion(q1),
		pC2,
		pB2

	).multiply(q1);

	return this;
}


THREE.Quaternion.prototype.setFrom2Triangles = function(pA1, pB1, pC1, pA2, pB2, pC2) {

	this.setFrom2TrianglesAtOriginNorm(

		this._pB1tmp.copy(pB1).sub(pA1).normalize(),
		this._pC1tmp.copy(pC1).sub(pA1),

		this._pB2tmp.copy(pB2).sub(pA2).normalize(),
		this._pC2tmp.copy(pC2).sub(pA2),
	);

	return this;
}




// ==========================
//
//   THREE.Matrix3
//
// ==========================

THREE.Matrix3.prototype.setBasis = function(v1, v2, v3) {

	return this.set(
		v1.x, v1.y, v1.z,
		v2.x, v2.y, v2.z,
		v3.x, v3.y, v3.z
	);
}




// ==========================
//
//   THREE.Matrix4
//
// ==========================

Object.assign(THREE.Matrix4.prototype, {

	_from2TrisQ: new THREE.Quaternion,
	_from2TrisV: new THREE.Vector3,

	// Rotation is around pA1
	setFrom2Triangles(pA1, pB1, pC1, pA2, pB2, pC2) {

		this.makeRotationFromQuaternion(

			this._from2TrisQ.setFrom2Triangles(pA1, pB1, pC1, pA2, pB2, pC2)

		).setPosition(

			this._from2TrisV.subVectors(pA2, pA1)
		);

		return this;
	},


	setPositionFromVectorDiff(v2, v1) {

		return this.setPosition(this._from2TrisV.subVectors(v2, v1));
	},


	getRowCol(row, col) {
		console.assert(row < 3);
		//return this.elements[ row * 4 + col ];
		return this.elements[ row + col * 4 ];
	},

	setRowCol(row, col, value) {
		console.assert(row < 3);
		//this.elements[ row * 4 + col ] = value;
		this.elements[ row + col * 4 ] = value;
	},


	swapRows(row1, row2) {

		if (row1 === row2)
			return;

		for (let i = 0; i < 4; i++) {

			let tmp = this.getRowCol(row1, i);
			this.setRowCol(row1, i, this.getRowCol(row2, i));
			this.setRowCol(row2, i, tmp);
		}
	},


	print() {

		//for (let i = 0; i < 4; i++) {
		for (let i = 0; i < 3; i++) {

			let str = "";

			for (let j = 0; j < 4; j++)
				str += this.getRowCol(i, j) + "   ";

			console.log(str);
		}
	},


	gaussianEliminate() { // 3x4 matrix

		var processPivot = i => {

			// I. Swap rows

			var	maxVal = 0, maxValRow;

			for (let j = i; j < 3; j++) {

				let val = Math.abs( this.getRowCol(j, i) );

				if (val > maxVal) {
					maxVal = val;
					maxValRow = j;
				}
			}

			if (maxVal < 1e-14)
				return;

			this.swapRows(i, maxValRow);

			// II. Forward elimination

			var	pivot = this.getRowCol(i, i);

			for (let j = i + 1; j < 3; j++) {

				let f = this.getRowCol(j, i) / pivot;

				this.setRowCol(j, i, 0);

				for (let k = i + 1; k < 4; k++)
					this.setRowCol(j, k, this.getRowCol(j, k) - f * this.getRowCol(i, k) );
			}

			return true;
		};
 

		if (processPivot(0) && processPivot(1))
			return true;
	},


	_linearEquations3x4Result: new THREE.Vector3,

	solveLinearEquations3x4() {

		if (!this.gaussianEliminate())
			return;

		var z = -this.getRowCol(2, 3) / this.getRowCol(2, 2);
		var y = ( -this.getRowCol(1, 3) - z * this.getRowCol(1, 2) ) / this.getRowCol(1, 1);
		var x = ( -this.getRowCol(0, 3) - y * this.getRowCol(0, 1) - z * this.getRowCol(0, 2) )
			/ this.getRowCol(0, 0);

		return this._linearEquations3x4Result.set(x, y, z);
	},


});


// ==========================
//
//   THREE.Line3
//
// ==========================

Object.assign(THREE.Line3.prototype, {

	_tmpV1: new THREE.Vector3,
	_tmpV2: new THREE.Vector3,
	_tmpP: new THREE.Vector3,
	_tmpU: new THREE.Vector3,
	_tmpMat4: new THREE.Matrix4,

	_showData: new Map,


	closestPointToPointParameter(p, ifClamp) { // r121 /0

		var	deltaV = this._tmpV1.subVectors(this.end, this.start);

		var deltaLenSq = deltaV.dot(deltaV);
		if (deltaLenSq === 0)
			return 0;

		var	u = this._tmpV2.subVectors(p, this.start);
		var	t = deltaV.dot(u) / deltaLenSq;

		return ifClamp ? Util.clamp(t, 0, 1) : t;
	},


	distanceTo(v) {

		return this.closestPointToPoint(v, true, this._tmpV1).distanceTo(v);
	},


	copyFrom2XVector3(v1, v2) {

		console.assert(v2 instanceof THREE.Vector3);

		this.start.copy(v1);
		this.end.copy(v2);

		return this;
	},


	createMesh(matName = 'line3') {

		var lineSegments = new Float32Array([
			this.start.x, this.start.y, this.start.z,
			this.end.x, this.end.y, this.end.z
		]);

		var mesh = new THREE.Mesh(
			new LineSegmentsGeometry().setPositions(lineSegments),
			Assets.materials.line[matName]
		);

		mesh.name = `Line3 start=${this.start} end=${this.end}`;

		return mesh;
	},


	show(addVect3, matName) {

		var mesh = this._showData.get(this);
		if (mesh) {
			scene.remove(mesh);
			this._showData.delete(this);
			return;
		}

		if (!matName)
			matName = typeof addVect3 == "string" ? addVect3 : "line3";

		var mesh = this.createMesh(matName);

		if (addVect3 instanceof THREE.Vector3)
			mesh.position.add(addVect3);

		this._showData.set(this, mesh);
		scene.add(mesh);

		return this;
	},


	showOff() {

		var mesh = this._showData.get(this);

		if (mesh) {
			scene.remove(mesh);
			this._showData.delete(this);
		}
	},


	showOn(matName) {
		this.showOff();
		this.show(matName);
	},


	getMatrixFor2Lines(line3) {

		var	v1 = this.delta(this._tmpV1),
			v2 = line3.delta(this._tmpV2),
			u = this._tmpU.crossVectors(v1, v2);

		if ( !( Math.abs(u.dot(u)) > 1e-25 ) ) // parallel
			return;

		u.normalize();

		var	p = this._tmpP.subVectors(this.start, line3.start);

		// Matrix 3x4 represents system of 3 linear equations:
		//
		// V1 * t1 - V2 * t2 + U * d + P = 0
		//
		//       U ^   / V2
		// P1      |  /      V1
		// --o-----x---------->
		//    .    |/
		//     .   x
		//      . /|
		//    P2 o |
		//      /  |

		return this._tmpMat4.set(

			v1.x, -v2.x, u.x, p.x,
			v1.y, -v2.y, u.y, p.y,
			v1.z, -v2.z, u.z, p.z,
			0, 0, 0, 1 // <-- requires for e.g. determinant
		);
	},


	distance2Lines(line3) {

		var matrix = this.getMatrixFor2Lines(line3);

		if (matrix && matrix.gaussianEliminate())
			return Math.abs( matrix.getRowCol(2, 3) / matrix.getRowCol(2, 2) );

		else // parallel or coincident
			return this.distanceTo(line3.start);
	},

/*
	distance2Lines(line3) {

		var	v1 = this.delta(this._tmpV1),
			v2 = line3.delta(this._tmpV2),
			u = this._tmpU.crossVectors(v1, v2);

		if ( !( Math.abs(u.dot(u)) > 1e-25 ) ) // parallel
			return;

		var	p = this._tmpP.subVectors(this.start, line3.start);

		// abs( p.dot(u) )
		// TODO?
	},
*/

	intersect2Lines(line3) {

		var matrix = this.getMatrixFor2Lines(line3);
		var result = matrix && matrix.solveLinearEquations3x4();

		if (result)
			result.z = -result.z;

		return result; // Vector3( t1, t2, abs(d) ) or undef.
	}

});

/*
//
// Static Fn.
// https://www.geomalgorithms.com/a07-_distance.html
//
THREE.Line3.distance2Segments = function(s1P0, s1P1, s2P0, s2P1) {

	var epsilon = 1e-9;

	var u = THREE.Line3._distance2Segments_u.subVectors(s1P1, s1P0),
		v = THREE.Line3._distance2Segments_u.subVectors(s2P1, s2P0),
		w = THREE.Line3._distance2Segments_u.subVectors(s1P0, s2P0);

	var a = u.dot(u),
		b = u.dot(v),
		c = v.dot(v),
		d = u.dot(w),
		e = v.dot(w);

	var D = a * c - b * b;

	// s, t - parameters
	var sN, sD = D;
	var tN, tD = D;

	if (D < epsilon) { // lines are almost parallel
		sN = 0; // force using point P0 on segment S1
		sD = 1;
		tN = e;
		tD = c;

	} else { // get the closest points on the infinite lines
		sN = b * e - c * d;
		tN = a * e - b * d;

		if (sN < 0) { // sc < 0 => the s=0 edge is visible
			sN = 0;
			tN = e;
			tD = c;

		} else if (sN > sD) { // sc > 1  => the s=1 edge is visible
			sN = sD;
			tN = e + b;
			tD = c;
		}
	}

	if (tN < 0) { // tc < 0 => the t=0 edge is visible
		tN = 0;
        if (-d < 0) // recompute sc for this edge
			sN = 0;
        else if (-d > a)
			sN = sD;
		else {
			sN = -d;
			sD = a;
		}

	} else if (tN > tD) { // tc > 1  => the t=1 edge is visible
        tN = tD;
		if ((-d + b) < 0) // recompute sc for this edge
			sN = 0;
		else if ((-d + b) > a)
			sN = sD;
		else {
			sN = (-d + b);
			sD = a;
        }
    }

// TODO div.
	var	sc = Math.abs(sN) < epsilon ? 0 : sN / sD,
		tc = Math.abs(tN) < epsilon ? 0 : tN / tD;

	//Vector   dP = w + (sc * u) - (tc * v); // =  S1(sc) - S2(tc)
	// get the difference of the two closest points
	var dP = w.add(u.multiplyScalar(sc)).sub(v.multiplyScalar(tc));

	return dP.length();
}
*/




