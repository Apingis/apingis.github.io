
class HelperGeometry {

	constructor() { console.error(`static constructor`); }


	static getFromStorage(type, key) {
		return key && this.Storage[type][key];
	}


	static saveToStorage(type, key, geometry) {

		if (key) {
			this.Storage[type][key] = geometry;
			geometry.userData._savedInStorage = true;
		}
	}


	static getCircle(radius) {

		radius = radius.toPrecision(5);

		var key = radius;

		var g = this.getFromStorage("Circle", key);
		if (g)
			return g;

		var y0 = 0.007;

		var numSegments = this.numSegmentsByRadius(radius);
		var step = 2 * Math.PI / numSegments;

		var lineSegments = new Float32Array(numSegments * 6);

		var angle = 0,
			x = radius,
			z = 0;

		for (let i = 0; i < 6 * numSegments; i += 6) {

			lineSegments[i] = x;
			lineSegments[i + 1] = y0;
			lineSegments[i + 2] = z;

			angle += step;
			x = Math.cos(angle) * radius;
			z = Math.sin(angle) * radius;

			lineSegments[i + 3] = x;
			lineSegments[i + 4] = y0;
			lineSegments[i + 5] = z;
		}

		g = new LineSegmentsGeometry();
		g.setPositions(lineSegments);

		g.name = "Circle " + key;
		this.saveToStorage("Circle", key, g);
		return g;
	}


	static getCylinder(radius, height, isOpenEnded) {

		isOpenEnded = !!isOpenEnded;
		radius = radius.toPrecision(5);
		height = height.toPrecision(5);

		var key = `${radius}-${height}-${isOpenEnded}`;

		var g = this.getFromStorage("Cylinder", key);
		if (g)
			return g;

		g = new THREE.CylinderBufferGeometry(radius, radius, height * 1 + 0.005,
			this.numSegmentsByRadius(radius), 1, isOpenEnded );
		g = g.translate(0, height / 2 - 0.01, 0);
		g.clearGroups();

		g.name = "Cylinder " + key;
		this.saveToStorage("Cylinder", key, g);
		return g;
	}


	static numSegmentsByRadius(r) {

		return 8 * (
			r < 0.3 ? 7 :	r < 0.6 ? 11 :	r < 1.2 ? 15 :	r < 2.1 ? 20 :
			r < 4.0 ? 28 :	r < 7.0 ? 36 :	r < 15 ? 48 :	r < 25 ? 64 :
			r < 50 ? 120 :	r < 100 ? 240 :	r < 300 ? 400 :	r < 1000 ? 800 :
		2000);
	}


	static getSector(sector) {

		var radius = sector.radius;
		var radiusStr;

		if (radius == Infinity) {
			radius = 1e6;
			Report.warn("Sector of infinite radius isn't well-supported", `${sector}`);
		}

		if (radius > 0) {
			radiusStr = radius.toPrecision(5);

		} else {
			radiusStr = "1";
			Report.warn("bad radius", `r=${radius}, displaying r=1`);
		}

		if (sector.left < sector.right || !isFinite(sector.left) || !isFinite(sector.right)) {
			Report.warn(`left=${sector.left} right=${sector.right}`);
			return;
		}

		var key = `${radiusStr}-${sector.left.toFixed(4)}-${sector.right.toFixed(4)}`;

		var g = this.getFromStorage("Sector", key);
		if (g)
			return g;


		var y = 0.003;

		var step = Math.PI * (radius < 50 ? 0.01 : radius < 500 ? 0.003 : 0.001);
		var positionArray = [];

		for (let alpha = sector.right; alpha < sector.left; alpha += step) {

			let nextAlpha = Math.min(alpha + step, sector.left);
			positionArray.push(0, y, 0,
				Math.cos(nextAlpha) * radius, y, Math.sin(nextAlpha) * radius,
				Math.cos(alpha) * radius, y, Math.sin(alpha) * radius);
		}

		positionArray = new Float32Array(positionArray);

		g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));

		g.name = "Sector " + key;
		this.saveToStorage("Sector", key, g);
		return g;
	}


	static getPolygon2D(polygon, key, enlarge, y0 = 0) {

		if (key && enlarge)
			key = `${key}-enlarged-${enlarge}`;

		var g = this.getFromStorage("Polygon2D", key);
		if (g)
			return g;

		y0 += 0.007;

		if (enlarge)
			polygon = polygon.getEnlarged(enlarge);

		var p = polygon.points;
		var numPoints = p.length / 2;
		var lineSegments = new Float32Array(numPoints * 6);

		var prevX = p[p.length - 2],
			prevY = p[p.length - 1];

		for (let i = 0; i < numPoints; i++) {

			let x = p[i * 2],
				y = p[i * 2 + 1];

			lineSegments[i * 6] = prevX;
			lineSegments[i * 6 + 1] = y0;
			lineSegments[i * 6 + 2] = prevY;
			lineSegments[i * 6 + 3] = x;
			lineSegments[i * 6 + 4] = y0;
			lineSegments[i * 6 + 5] = y;

			prevX = x;
			prevY = y;
		}

		g = new LineSegmentsGeometry();
		g.setPositions(lineSegments);

		g.name = "Polygon2D " + key;
		this.saveToStorage("Polygon2D", key, g);
		return g;
	}


	static addToPositionArrayFromEarcutResult(trianglePoints, origPoints, y = 0, position = []) {

		var p = origPoints;

		for (let i = 0; i < trianglePoints.length; i += 3) {

			let i0 = 2 * trianglePoints[i],
				i1 = 2 * trianglePoints[i + 1],
				i2 = 2 * trianglePoints[i + 2];

			if (Point.isLeft(p[i2], p[i2 + 1], p[i0], p[i0 + 1], p[i1], p[i1 + 1]) <= 0) {
				Report.warn("wrong winding");
				break;
			}

			position.push( // expecting CCW triangles from earcut (not documented)
				//p[i0], y, p[i0 + 1], p[i1], y, p[i1 + 1], p[i2], y, p[i2 + 1],
				p[i0], y, p[i0 + 1], p[i2], y, p[i2 + 1], p[i1], y, p[i1 + 1]
			);
		}

		return position;
	}


	static getPolygon3D(polygon, key, enlarge = 0, y0 = 0, height) {

		if (key)// && (enlarge || y0))
			key = `${key}-enlarged-${enlarge}-y0-${y0}-height-${height}`;

		var g = this.getFromStorage("Polygon3D", key);
		if (g)
			return g;

		if (enlarge)
			polygon = polygon.getEnlarged(enlarge);

		var p = polygon.points,
			//y = polygon.height + (enlarge || 0) + y0,
			y = height + enlarge + y0,
			position = [];

		y0 -= enlarge;

		for (let i = 0; i < p.length; i += 2) {

			let iNext = polygon.nextIndex(i);
			position.push(
				p[i], y0, p[i + 1], p[i], y, p[i + 1], p[iNext], y, p[iNext + 1],
				p[i], y0, p[i + 1], p[iNext], y, p[iNext + 1], p[iNext], y0, p[iNext + 1]
			);
		}

		var trianglePoints = earcut(p);

		this.addToPositionArrayFromEarcutResult(trianglePoints, p, y, position);

		g = new THREE.BufferGeometry;
		g.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(position), 3));
		if (key)
			g = Util.mergeVertices(g);

		g.name = "Polygon3D " + key;
		this.saveToStorage("Polygon3D", key, g);
		return g;
	}


	static getFlatPolygon(polygon, key, opts = {}) {

		if (key && opts.enlarge)
			key = `${key}-enlarged-${enlarge}`;

		var g = this.getFromStorage("FlatPolygon", key);
		if (g)
			return g;

		if (opts.enlarge)
			polygon = polygon.getEnlarged(opts.enlarge);

		var p = polygon.points,
			position = [];

		var trianglePoints = earcut(p);
		var y = opts.y0 || 5e-4;

		for (let i = 0; i < trianglePoints.length; i += 3) {

			let i0 = 2 * trianglePoints[i],
				i1 = 2 * trianglePoints[i + 1],
				i2 = 2 * trianglePoints[i + 2];

			if (0) { // It happens

				if (Point.isLeft(p[i2], p[i2 + 1], p[i0], p[i0 + 1], p[i1], p[i1 + 1]) <= 0) {
					Report.warn("wrong winding", `key="${key}"`);
					break;
				}
			}

			let perpProduct = Point.isLeft(p[i2], p[i2 + 1], p[i0], p[i0 + 1], p[i1], p[i1 + 1]);

			if (perpProduct >= 0) { // It produces CCW triangles (not documented).

				position.push( p[i0], y, p[i0 + 1], p[i2], y, p[i2 + 1], p[i1], y, p[i1 + 1] );

				if (perpProduct === 0)
					Report.warn("zero perpProduct", `key="${key}"`);

			} else {
				position.push( p[i0], y, p[i0 + 1], p[i1], y, p[i1 + 1], p[i2], y, p[i2 + 1] );
				Report.warn("CW triangle (never seen)", `key="${key}"`);
			}
		}

		g = new THREE.BufferGeometry;
		g.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(position), 3));

		if (key)
			g = Util.mergeVertices(g);

		var attribCount = g.attributes.position.count;

		if (opts.addNormals) {

			let array = new Float32Array(attribCount * 3);

			for (let i = 1; i < array.length; i += 3)
				array[i] = 1;

			g.setAttribute("normal", new THREE.BufferAttribute(array, 3));
		}


		g.name = "FlatPolygon " + key;
		this.saveToStorage("FlatPolygon", key, g);
		return g;
	}


//mb. TODO (not tested)
	static getArrow() { // (0,0)->(1,0) (angle=0)

		var key=1;

		var g = this.getFromStorage("Arrow", key);
		if (g)
			return g;

		var y = 0.015;
		var lineSegments = [
			0, y, 0, 1, y, 0,
			1, y, 0, 0.7, y, 0.3,
			1, y, 0, 0.7, y, -0.3
		];

		g = new LineSegmentsGeometry;
		g.setPositions(lineSegments);

		g.name = "Arrow " + key;
		this.saveToStorage("Arrow", key, g);
		return g;
	}


	static getRobotFlag() { return this.getSignLS(3, 1.3, 4, 0.8, 1) }


	static getSignLS(nSections = 3, width = 0.75, height = 3.5, heightRatio = 0.75, opt = 0) {

		var key = `${nSections}-${width}-${height}-${heightRatio}-${opt}`;

		var g = this.getFromStorage("SignLS", key);
		if (g)
			return g;

		const y1 = height * heightRatio, y2 = height;

		var lineSegments = [];

		if (opt === 1) {

			let N = 10;

			for (let h = 0; h < y2 - y2 / N; h += y2 / N)

				lineSegments.push( 0, h, 0, 0, h + y2 / (3 * N), 0 );

		} else
			lineSegments.push( 0, 0, 0, 0, y2, 0 );

		var angle = 0;

		for (let i = 0; i < nSections; i++) {

			let x = width * Math.cos(angle),
				z = width * Math.sin(angle);

			angle += 2 * Math.PI / nSections;
			lineSegments.push(0, y1, 0, x, y1, z,
				x, y1, z, x, y2, z,
				x, y2, z, 0, y2, 0);
		}

		g = new LineSegmentsGeometry;
		g.setPositions(lineSegments);

		g.name = "SignLS " + key;
		this.saveToStorage("SignLS", key, g);
		return g;
	}


	static getPlane(p) {

		console.assert(p instanceof THREE.Plane);

		var transform = new THREE.Matrix4().makeRotationFromQuaternion(

			new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.normal)

		).setPosition(p.normal.clone().multiplyScalar(-p.constant));

		//var SIZE = 500;
		var SIZE = 1000;
		var g = new THREE.PlaneBufferGeometry(SIZE, SIZE, 50, 50);

		g.applyMatrix4(transform);

		return g;
	}


	static getCone(cone, r = 17) {

		var N_SEGMENTS = 2500;
		var LEN = r;
		var UV_FRACT = this.CONE_UV_FRACT;

		var v = cone.position;
		var b = cone.b;

		var angle = 0;
		var position = [];
		var uv = [];

		for (let i = 0; i < N_SEGMENTS; i++) { // 1 triangle / seg

			let nextAngle = angle + 2 * Math.PI / N_SEGMENTS;

			position.push(
				v.x, v.y, v.z,
				v.x + LEN * Math.cos(angle), v.y + LEN / b, v.z + LEN * Math.sin(angle),
				v.x + LEN * Math.cos(nextAngle), v.y + LEN / b, v.z + LEN * Math.sin(nextAngle),
			);

			uv.push(
				0.5, 0.5,
				0.5 + UV_FRACT * 0.5 * Math.cos(angle), 0.5 + UV_FRACT * 0.5 * Math.sin(angle),
				0.5 + UV_FRACT * 0.5 * Math.cos(nextAngle), 0.5 + UV_FRACT * 0.5 * Math.sin(nextAngle),
			);

			angle = nextAngle;
		}

		var g = new THREE.BufferGeometry;
		g.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(position), 3));
		g.setAttribute("uv", new THREE.BufferAttribute(Float32Array.from(uv), 2));
		g = Util.mergeVertices(g);
		g.computeVertexNormals();

		return g;
	}

}


HelperGeometry.Storage = {

	Circle: {},
	Sector: {},
	Cylinder: {},
	Polygon2D: {},
	Polygon3D: {},
	FlatPolygon: {},
	SignLS: {},
	Arrow: {},
};



HelperGeometry.CONE_UV_FRACT = 0.93;



export { HelperGeometry };

