
class CameraViewShape2D {

	constructor() {

		this.cameraPt = new Point;
		this.circle = new Circle; // cylindrical fog
		this.dirLightV = new Point().setFromVector3( Display.directionalLightPosition )
			.normalize(); // towards light source

		this.left = new HessianLine; // normals are directed inside
		this.right = new HessianLine;
		this.near = new HessianLine;
		this.leftLine2 = new Line2;
		this.rightLine2 = new Line2;
		this.sector = new Sector; // loose; OK for miniMap
		this.rect = new Rectangle;

		this._projectionScreenMatrix = new THREE.Matrix4;
		this._frustum = new THREE.Frustum;
		this._line3 = new THREE.Line3;
		this._line2 = new Line2;
		this._groundPlane = new THREE.Plane( new THREE.Vector3(0, 1, 0), 0 );
	}



	// Returns:
	// - undefined if rect is outside
	// - distance for depth

	depthDistanceToRect(rect) {

		// - distance for depth arrangement: z component only
		// - distance for fog: Euclidean distance from cameraPt

		// Considering SectorRectangleQuery

		if ( rect.containsPoint(this.cameraPt) )
			return 0; // introduce negative distances?


		var	l1 = this.left.distanceTo(rect.minX, rect.minY),
			l2 = this.left.distanceTo(rect.maxX, rect.minY),
			l3 = this.left.distanceTo(rect.maxX, rect.maxY),
			l4 = this.left.distanceTo(rect.minX, rect.maxY);

		if ( Math.max(l1, l2, l3, l4) < 0 )
			return;

		var	r1 = this.right.distanceTo(rect.minX, rect.minY),
			r2 = this.right.distanceTo(rect.maxX, rect.minY),
			r3 = this.right.distanceTo(rect.maxX, rect.maxY),
			r4 = this.right.distanceTo(rect.minX, rect.maxY);

		if ( Math.max(r1, r2, r3, r4) < 0 )
			return;


		if ( !this.circle.overlapsRectangle(rect) )
			return;

		var intrNearSgn = this.near.intersectsRectSgn(rect);

		if (intrNearSgn !== 1) {

			if (intrNearSgn === -1)
				return;

			if ( Line2.intersectsRectSide(rect, this.leftLine2.p1, this.rightLine2.p1) )
				return 0;
		}

		// Inside or outside tests completed.

		var minDistanceAlongLine = Infinity;

		var checkLine = (pu, vu, u) => {

			var t = (u - pu) / vu;
			t >= 0 && ( minDistanceAlongLine = Math.min(minDistanceAlongLine, t) );
		}

		var v = this.leftLine2.getNormalizedVector();

		l1 < 0 !== l2 < 0 && checkLine( this.leftLine2.p1.y, v.y, rect.minY );
		l2 < 0 !== l3 < 0 && checkLine( this.leftLine2.p1.x, v.x, rect.maxX );
		l3 < 0 !== l4 < 0 && checkLine( this.leftLine2.p1.y, v.y, rect.maxY );
		l4 < 0 !== l1 < 0 && checkLine( this.leftLine2.p1.x, v.x, rect.minX );

		v = this.rightLine2.getNormalizedVector();

		r1 < 0 !== r2 < 0 && checkLine( this.rightLine2.p1.y, v.y, rect.minY );
		r2 < 0 !== r3 < 0 && checkLine( this.rightLine2.p1.x, v.x, rect.maxX );
		r3 < 0 !== r4 < 0 && checkLine( this.rightLine2.p1.y, v.y, rect.maxY );
		r4 < 0 !== r1 < 0 && checkLine( this.rightLine2.p1.x, v.x, rect.minX );

		var minDistance = this.near.distanceToPoint(
			v.multiplyScalar( minDistanceAlongLine ).add( this.rightLine2.p1 )
		);


		var checkPoint = (x, y) => {

			var d = this.near.distanceTo(x, y);
			d >= 0 && ( minDistance = Math.min(minDistance, d) );
		}

		!(l1 < 0 || r1 < 0) && checkPoint(rect.minX, rect.minY);
		!(l2 < 0 || r2 < 0) && checkPoint(rect.maxX, rect.minY);
		!(l3 < 0 || r3 < 0) && checkPoint(rect.maxX, rect.maxY);
		!(l4 < 0 || r4 < 0) && checkPoint(rect.minX, rect.maxY);

		if (minDistance < Infinity)
			return minDistance;

		// Below, depth is definitely no less than in above cases.

		var x = this.cameraPt.x, y = this.cameraPt.y;

		if ( x >= rect.minX && x <= rect.maxX ) {

			if ( y < rect.minY ) {
				if ( this.leftLine2.p2.x <= x && this.rightLine2.p2.x >= x )
					minDistance = Math.min( minDistance, (rect.minY - y) * this.near.n.y );

			} else { // y > rect.maxY
				if ( this.leftLine2.p2.x >= x && this.rightLine2.p2.x <= x )
					minDistance = Math.min( minDistance, (y - rect.maxY) * this.near.n.y );
			}

		} else if ( y >= rect.minY && y <= rect.maxY ) {

			if ( x < rect.minX ) {
				if ( this.leftLine2.p2.y >= y && this.rightLine2.p2.y <= y )
					minDistance = Math.min( minDistance, (rect.minX - x) * this.near.n.x );

			} else {
				if ( this.leftLine2.p2.y <= y && this.rightLine2.p2.y >= y )
					minDistance = Math.min( minDistance, (x - rect.maxX) * this.near.n.x );
			}
		}


		if (minDistance === Infinity || minDistance < 0) { // must not happen

			Report.warn("distance not found", `d=${minDistance} (must not happen)`);
			return 0;
		}

		return minDistance;
	}



	intersectsRect(rect) {

		return (1
			&& this.left.intersectsRectSgn(rect) !== -1
			&& this.right.intersectsRectSgn(rect) !== -1
			&& this.circle.overlapsRectangle(rect)
			&& this.near.intersectsRectSgn(rect) !== -1
		);
	}


	setFromCamera(camera, displayMaxDistance) {

		var cameraPt = this.cameraPt.set( camera.position.x, camera.position.z );

		// cylindrical fog. Distance is valid if the horizon is visible.
		var radius = displayMaxDistance || camera.far;

		this.circle.set( cameraPt.x, cameraPt.y, radius );

		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

		this._projectionScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

		// _projectionScreenMatrix= new THREE.Matrix4; _frustum= new THREE.Frustum;
		// _projectionScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		// _frustum.setFromProjectionMatrix(_projectionScreenMatrix);

		// In frustum, plane vectors are directed inside.
		// Planes: 2 - bottom, 3 - top, 4 - far, 5 - near.

		this._frustum.setFromProjectionMatrix(this._projectionScreenMatrix);

		var intersectGroundFrustumPlane = (plane, comment, hessianLine) => {

			if ( !this._groundPlane.intersectPlane(plane, this._line3) )
				return Report.warn("parallel plane", comment);

			hessianLine.setFromLine2( this._line2.copyFromLine3(this._line3), true );
			return true;
		};


		var left = this.left, right = this.right, near = this.near;

		if ( !intersectGroundFrustumPlane(this._frustum.planes[0], "0 (right)", left) )
			return;

		if ( !intersectGroundFrustumPlane(this._frustum.planes[1], "1 (left)", right) )
			return;

		near.setFromNormalAndPointOnLine(
			near.n.copy( left.n ).add( right.n ).normalize(),
			cameraPt
		);


		if (UIPrefs.csm.isOn) {

			const D_SHADOW = 5;

			let dot;

			dot = this.dirLightV.dot(left.n);
			dot < 0 && (left.c -= dot * D_SHADOW);

			dot = this.dirLightV.dot(right.n);
			dot < 0 && (right.c -= dot * D_SHADOW);

			dot = this.dirLightV.dot(near.n);
			dot < 0 && (near.c -= dot * D_SHADOW);
		}


		var setLine2FromIntersections = (line, line2) => {

			var intrs = line.intersectCircle( this.circle );

			line2.p2.copy( near.distanceToPoint(intrs.p1) >= 0 ? intrs.p1 : intrs.p2 );
			line2.p1.copy( near.intersectHessianLine(line) );

			return line2;
		};

		var leftLine2 = setLine2FromIntersections(left, this.leftLine2);
		var rightLine2 = setLine2FromIntersections(right, this.rightLine2);


		var sector = this.sector.setFrom3Points(leftLine2.p2, cameraPt, rightLine2.p2);


		this.rect.set(

			sector.containsCircleMinX() ? cameraPt.x - radius
				: Math.min(leftLine2.p1.x, leftLine2.p2.x, rightLine2.p1.x, rightLine2.p2.x),

			sector.containsCircleBottom() ? cameraPt.y - radius
				: Math.min(leftLine2.p1.y, leftLine2.p2.y, rightLine2.p1.y, rightLine2.p2.y),

			sector.containsCircleMaxX() ? cameraPt.x + radius
				: Math.max(leftLine2.p1.x, leftLine2.p2.x, rightLine2.p1.x, rightLine2.p2.x),

			sector.containsCircleTop() ? cameraPt.y + radius
				: Math.max(leftLine2.p1.y, leftLine2.p2.y, rightLine2.p1.y, rightLine2.p2.y)
		);

		//if ( this.leftLine2.intersect2Segments(this.rightLine2) ) // NP. not looking down.
		//	Report.warn(`cameraShape segment intersection`);

		return this;
	}



	show() {

		this.cameraPt.show('blue', 0.07);
		this.leftLine2.show();
		this.rightLine2.show();
		this.circle.show();
	}

}




export { CameraViewShape2D }

