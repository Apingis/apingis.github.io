
//
// Circular cone.
// Equation x^2 + z^2 - b^2 * y^2 = 0
//
class Cone {

	constructor() {

		// One half of the cone is considered, incl. apex (1: upper, -1: lower)
		this.halfSgn = 1;

		this.b = 0;
		this.bSq = 0;
		this.perpVLengthReciprocal = 0;

		this.position = new THREE.Vector3;

		this.worldTransformInverse = new THREE.Matrix4;
	}


	toString() { return `<Cone b=${Util.toStr(this.b)} pos=${this.position}>`; }


	getWorldTransformInverse() {
		return this.worldTransformInverse;
	}


	setFromApexAndPoint(apex, p) {

		console.assert( (apex instanceof THREE.Vector3) && (p instanceof THREE.Vector3) );

		var v = this._v.subVectors(p, apex);

		if (Math.abs(v.y) < 1e-5) {
			Report.warn("the cone is extremely broad", `v.y=${v.y}`);
			v.y = 1e-5;
		}

		this.halfSgn = v.y < 0 ? -1 : 1;

		this.bSq = (v.x * v.x + v.z * v.z) / (v.y * v.y);
		this.b = Math.sqrt(this.bSq);
		this.perpVLengthReciprocal = 1 / Math.sqrt(1 + this.bSq);

		this.position.copy(apex);

		this.worldTransformInverse.setPosition(-this.position.x, -this.position.y, -this.position.z);

		return this;
	}

	//
	// Given is Vector3 in cone local space.
	// Honors .halfSgn.
	//
	contains(p, offsetV) {

		var	x = p.x,
			y = p.y,
			z = p.z;

		if (offsetV) {

			x -= offsetV.x;
			y -= offsetV.y;
			z -= offsetV.z;
		}

		if (y * this.halfSgn < 0)
			return false;

		return x * x + z * z - this.bSq * y * y <= 0; // <= ?
	}

	//
	// * v is assumed to be in cone's local space
	// * Only upper half of the cone is considered.
	// * w/ sign. (negative = inside)
	//
	distanceTo(v) {

		// 2D coords: (u = sqrt(x^2 + z^2), y);
		var	pu = Util.hypot(v.x, v.z);

		// if directed downwards then apex is the nearest pt.
		if (pu * this.b + v.y < 0)
			return Util.hypot(pu, v.y);

		// "perp product" w/ "slant height" vector
		var d = (pu - v.y * this.b) * this.perpVLengthReciprocal;
/*
		if (Main.DEBUG >= 3) {

			let d2 = this.closestPoint(p).sub(p).length();
			let diff = Math.abs(Math.abs(d) - d2);

			if (diff > 1e-9)
				Report.warn("diff", `diff=${diff} d=${d} d2=${d2} |p, closest pt:`, p.clone(), this.closestPoint(p));
		}
*/
		return d;
	}


	// Upper half only.
	// Cone's local space.
	overlapsSphere(sphere) {

		return this.distanceTo(sphere.center) <= sphere.radius;
	}


	sphereIntersectsSurface(sphere) {

		return Math.abs( this.distanceTo(sphere.center) ) <= sphere.radius;
	}


	sphereIsFullyInside(sphere, conePositionLocal) {

		var center = this._v.copy(sphere.center);

		conePositionLocal && center.sub(conePositionLocal);

		return this.distanceTo(center) <= -sphere.radius;
	}


	closestPoint(p, target = new THREE.Vector3) { // Upper half only.

		var v = this._v.subVectors(p, this.position);

		var	a = (1 + this.bSq) * (1 + this.bSq),
			b = -2 * (1 + this.bSq) * v.y,
			c = v.y * v.y - this.bSq * (v.x * v.x + v.z * v.z),
			d = Math.sqrt(b * b - 4 * a * c);

		if (d !== d) {
			Report.warn(`a=${a} b=${b} c=${c}`); // must not happen?
			return target.copy(p).add(this.position);
		}

		var y0 = (-b - d) / (2 * a);
		var y1 = (-b + d) / (2 * a);

		//console.log(`y0=${y0} y1=${y1}`);
		// TODO inside the cone?
		//if (this.containsAtOrigin(v) === true)
		//	console.log("inside the cone");

		var y = y1; // For upper half of the cone always take y1.

		if (y < 1e-9) {
			Report.warn("apex is the closest");
			target.set(0, 0, 0);

		} else {

			let divisor = v.y - y * (1 + this.bSq);

			if (Math.abs(divisor) < 1e-9) { // inside the cone on the axis: return towards +X
				Report.warn("on the axis");
				target.set(this.b * y, y, 0);

			} else {
				let k = -y * this.bSq / divisor;
				target.set(k * v.x, y, k * v.z);
			}
		}

		return target.add(this.position);
	}


	static cylinderContains(r, p) { // local space
		return Util.hypotSq(p.x, p.z) - r * r <= 0;
	}


	static sphereIsInsideCylinder(r, sphere) { // local space

		r += sphere.radius;

		return Util.hypotSq(sphere.center.x, sphere.center.z) - r * r <= 0;
	}


	//
	// Adds to intersectData array, 4 elements per intersection:
	// line id, parameter t E [0, 1], intersecting object id,
	// intersect type (IN/OUT), x, y, z.
	//
	// * Line is assumed previously transformed into cone local space.
	// * Intersection pts. w/ multiplicity 2 count as 2 intersections.
	// * .halfSgn applies.
	//
	intersectLine3(line3, intersectData, lineId, objId, addY = 0) {

		var p0 = line3.start;
		var v = this._v.subVectors(line3.end, p0);
		var p0y = p0.y + addY;

		var roots = Polynomial.solveQuadraticEqn(

			v.x * v.x + v.z * v.z - this.bSq * (v.y * v.y),
			2 * (p0.x * v.x + p0.z * v.z - this.bSq * p0y * v.y),
			p0.x * p0.x + p0.z * p0.z - this.bSq * p0y * p0y,
			true
		);

		if (!roots)
			return;

		var	t0 = roots.x1,
			t1 = roots.x2;

		if (t0 > 1 || t1 < 0)
			return;

		var	intr0SameHalf = this.halfSgn * (p0y + t0 * v.y) >= 0,
			intr1SameHalf = this.halfSgn * (p0y + t1 * v.y) >= 0,
			diffHalves = intr0SameHalf !== intr1SameHalf;

		var result;

		var pushCoords = t => intersectData.push(
			p0.x + t * v.x, p0y + t * v.y, p0.z + t * v.z
		);

		if (t0 >= 0 && intr0SameHalf) {
			intersectData.push(lineId, t0, objId, diffHalves ? "OUT" : "IN");
			pushCoords(t0);
			result = true;
		}

		if (t1 <= 1 && intr1SameHalf) {
			intersectData.push(lineId, t1, objId, diffHalves ? "IN" : "OUT");
			pushCoords(t1);
			result = true;
		}

		return result;
	}


	//
	// x^2 + z^2 = r^2 for any y.
	// Line3 is assumed to be in cylinder local space.
	//
	static intersectOpenCylinderLine3(line3, r, intersectData, lineId, objId) {

		var p0 = line3.start;
		var v = Cone.prototype._v.subVectors(line3.end, p0);

		var roots = Polynomial.solveQuadraticEqn(

			v.x * v.x + v.z * v.z,
			2 * (p0.x * v.x + p0.z * v.z),
			p0.x * p0.x + p0.z * p0.z - r * r,
			true
		);

		if (!roots)
			return;

		var	t0 = roots.x1,
			t1 = roots.x2;

		if (t0 > 1 || t1 < 0)
			return;

		var result;

		var pushCoords = t => intersectData.push(
			p0.x + t * v.x, p0.y + t * v.y, p0.z + t * v.z
		);

		if (t0 >= 0) {
			intersectData.push(lineId, t0, objId, "IN");
			pushCoords(t0);
			result = true;
		}

		if (t1 <= 1) {
			intersectData.push(lineId, t1, objId, "OUT");
			pushCoords(t1);
			result = true;
		}

		return result;
	}


	// =========================================================

	getMesh(r, matName = "cone") {

		var position = this.position.clone();

		this.position.setScalar(0);

		var mesh = new THREE.Mesh(
			HelperGeometry.getCone(this, r),
			Assets.materials[matName]
		);

		this.position.copy(position);
		mesh.position.copy(position);

		mesh.name = `${this} r=${r}`;

		return mesh;
	}


	show(r, matName) {

		var mesh = this._showData.get(this);
		if (mesh) {
			mesh.geometry.dispose();
			scene.remove(mesh);
			this._showData.delete(this);

		} else {
/*
			var mesh = new THREE.Mesh(
				HelperGeometry.getCone(this, r),
				Assets.materials[matName || "cone"]
			);

			//mesh.position.set(this.x, 0.01, this.y);
			mesh.name = `${this}`;
*/
			var mesh = this.getMesh(r, matName);

			scene.add(mesh);
			this._showData.set(this, mesh);
		}

		return this;
	}


	createCheckerMesh(r, matId = 'coneChecker13') {

		var geometry = HelperGeometry.getCone(this, r);

		//var mesh = new THREE.Mesh(geometry, Assets.materials[ matId + '_Up' ]);
		var mesh = this.getMesh(r, matId + '_Up');

		mesh.add( this.getMesh(r, matId + '_Side') );
		mesh.children[0].position.setScalar(0);

		mesh.name = `${this} ${matId}`;

		var circleMatName = matId.endsWith('b') ? 'circle_coneChecker14b' :
			'circleGrey';

		var circleMesh = new THREE.Mesh(
				HelperGeometry.getCircle(r), Assets.materials.line[circleMatName] );

		//circleMesh.position.set( 0, r / this.b + this.position.y, 0 );
		circleMesh.position.set( 0, r / this.b, 0 );
		mesh.add( circleMesh );

		return mesh;
	}


	showChecker(r, matId) {

		var key = `${this} ${matId}`;
		var mesh = this._showData.get(key);

		if (mesh) {

			mesh.geometry.dispose();
			scene.remove(mesh);
			this._showData.delete(key);

			return this;
		}

		var mesh = this.createCheckerMesh(r, matId);

		scene.add(mesh);
		this._showData.set(key, mesh);

		return this;
	}


	showCylinder(r, h = 30, matName = "cylinder", isOpenEnded) {

		var g = HelperGeometry.getCylinder(r, h, isOpenEnded);
		var mesh = new THREE.Mesh(g, Assets.materials[matName]);

		mesh.position.add(this.position);
		scene.add(mesh);
	}



}


Object.assign(Cone, {

});


Object.assign(Cone.prototype, {

	_v: new THREE.Vector3,
	_p0: new THREE.Vector3,
	_tmp: new THREE.Vector3,

	_planeProjU: new THREE.Vector3,
	_planeProjV: new THREE.Vector3,

	_showData: new Map,
});




export { Cone };

