
class VCFace {

	constructor(vC) {

		this.vC = vC;

		this.item = null;
		this.face = null;
		this.cI = new CircumferenceIntervals;

		this.plane = new THREE.Plane;

		this._faceIntersectsCylinder = false;
		this._faceToPlaneTransform = new THREE.Matrix4;
		this._planeToLocalTransform = new THREE.Matrix4;
		this._localToPlaneTransform = new THREE.Matrix4;

		this._coneLCurve = new QuadraticCurve().setName("coneL");
		this._coneUCurve = new QuadraticCurve().setName("coneU");
		this._cylinderCurve = new QuadraticCurve().setName("cylinder");
		this._facePolygon = new Polygon;

		this._edgeIntersections = [];
		this._coneLIntersections = [];
		this._coneUIntersections = [];
		this._cylinderIntersections = [];
	}


	clear() {
	}


	process(item, face) {

		this.item = item;
		this.face = face;

		this.cI.circle.copy( this.vC.cI.circle );
		this.cI.intervals.clear();

		this.plane.copy( face.getPlane() ).applyMatrix4( this.vC._itemToLocalTransform );

		if ( this.vC.isPlaneInvisible(this.plane) )
			return;

		var result = this.vC.volumeOverlapsSphere(face.getBoundingSphere(), this.vC._itemToLocalTransform);

		if (result === 0)
			return;

		this._faceIntersectsCylinder = result === 2;

		this.projectOnPlane();
	}


	projectOnPlane() {

		var	plane = this.plane,
			coneL = this.vC.coneL,
			coneU = this.vC.coneU;

		this.face.getProjectionOnPlaneMatrix(plane, this._localToPlaneTransform, this._planeToLocalTransform);

		// I. Rule out corner cases, determine conic type.

		var coneLCurveType, coneUCurveType, cylinderCurveType;

		var B_DIFF = 3e-5; // 70-km ellipses w/ r=10m.

		var planeXZ = Util.hypot(plane.normal.x, plane.normal.z), // use bSq - skip sqrt?
			planeB = Math.abs(plane.normal.y) / planeXZ,
			bDiffL = Math.abs(planeB - coneL.b),
			bDiffU = Math.abs(planeB - coneU.b);

		if (bDiffL < B_DIFF || bDiffU < B_DIFF) {

			let addB = B_DIFF * (Math.abs(coneL.b - coneU.b) < 2 * B_DIFF ? 3 : 1);

			plane.normal.y -= 2 * addB / planeXZ;
			plane.normal.normalize();
			planeB = Math.abs(plane.normal.y) / planeXZ;
		}

		var coneLCurveType = coneL.b > planeB ? "hyperbola" : "ellipse";
		var coneUCurveType = coneU.b > planeB ? "hyperbola" : "ellipse";

		var D_DIFF = 2e-5; // 1e-4..1e-3 semiaxis len.

		if (0
			|| Math.abs( plane.distanceToPoint(this.vC.coneLPositionLocal) ) < D_DIFF
			|| Math.abs( plane.distanceToPoint(this.vC.coneUPositionLocal) ) < D_DIFF
		) {

			// What if cones are very close one to the other.
			plane.constant -= 2 * D_DIFF; // In the direction of plane.normal
		}

		if (this._faceIntersectsCylinder) {

			if ( Math.abs(plane.normal.y) < B_DIFF && plane.normal.y !== 0 ) {

				plane.normal.setY(0).normalize();
			}

			if ( plane.normal.y === 0 ) {

				let diff = this.cI.circle.radius - Math.abs(plane.constant);

				if (diff < 0)
					return; // no intersection cylinder plane

				if (diff < D_DIFF)
					plane.constant = Math.sign(plane.constant) * (this.cI.circle.radius - D_DIFF);
			}

			cylinderCurveType = plane.normal.y === 0 ? "parallelLines" : "ellipse";
		}


		this._coneLCurve.setFromSectioningCone(coneL, coneLCurveType, this._planeToLocalTransform,
			this._localToPlaneTransform, this.vC.coneLPositionLocal, plane);

		this._coneUCurve.setFromSectioningCone(coneU, coneUCurveType, this._planeToLocalTransform,
			this._localToPlaneTransform, this.vC.coneUPositionLocal, plane);

		if ( this._coneLCurve.isImaginaryOrNone() && this._coneUCurve.isImaginaryOrNone() )
			return;

		if (VisibilityCircle.DEBUG_SHOW_CURVES) {

			this._coneLCurve.show( this.getPlaneToWorldMatrix(), "blue" );
			this._coneUCurve.show( this.getPlaneToWorldMatrix(), "red" );
		}

		if (this._faceIntersectsCylinder) {

			this._cylinderCurve.setFromSectioningCylinder(this.cI.circle.radius,
				cylinderCurveType, this._planeToLocalTransform);

			if (VisibilityCircle.DEBUG_SHOW_CURVES)
				this._cylinderCurve.show( this.getPlaneToWorldMatrix(), "asOriginSmashed" );
		}

//Line2.showAxes( this.getPlaneToWorldMatrix() );

		this._faceToPlaneTransform.multiplyMatrices(

			this._localToPlaneTransform,
			this.vC._itemToLocalTransform
		);

		this.face.getPlanarPolygon(this._faceToPlaneTransform, this._facePolygon);
		this._facePolygon.forceCCW(true);

		this.createIntersectionLists();
	}


	createIntersectionLists() {

		this.clearAllIntersectionLists();

		// - Parameter along polygon boundary t E [ 0, +Infinity )
		// - polygon boundary parameter is a sum of integer edge ID and edge parameter [ 0, 1 ).

		var intersectEdgeCurve = (edgeSegment, i, curve) => {

			// halfSgn applies.
			edgeSegment.intersectQuadraticCurve(curve, (x, y, t, typeInOut) => {

				if (t >= 1) // there will be an intersection with the next edge w/ t=0.
					return;

				// Skip intersections outside the volume.
				if (curve.name == "cylinder") {

					if ( this._coneUCurve.contains(x, y) ) // TestAreaDisplay_Paper2_noIntersection case E
						return;

					if ( !this._coneLCurve.contains(x, y) )
						return;

				} else {

					if (this._faceIntersectsCylinder && !this._cylinderCurve.contains(x, y))
						return;
				}

				var	intr1 = this.allocIntersection(),
					intr2 = this.allocIntersection();

				intr1.set("edge", i + t, typeInOut, x, y, intr2);

				intr2.set(curve.name,
					curve.getParameter(x, y),
					curve.isHyperbola() ? typeInOut : typeInOut == "IN" ? "OUT" : "IN",
					x, y, intr1);

				this._edgeIntersections.push(intr1);
				this.intersectionListByObjId(curve.name).push(intr2);

			}, true, true);
		};


		this._facePolygon.traverseSomeEdges((edgeSegment, i) => {

			intersectEdgeCurve(edgeSegment, i, this._coneLCurve);
			intersectEdgeCurve(edgeSegment, i, this._coneUCurve);

			if (this._faceIntersectsCylinder)
				intersectEdgeCurve(edgeSegment, i, this._cylinderCurve);
		});


		var intersect2Curves = (curve1, curve2) => {

			console.assert(curve1.name == "cylinder");

			return curve1.intersectQuadraticCurve(curve2, (x, y) => { // halfSgn applies.

				var	intr1 = this.allocIntersection(),
					intr2 = this.allocIntersection();

				var dirV1 = VCFace._curveDirectionV.copy( curve1.getDirectionParamIncreaseV(x, y) );
				var dirV2 = curve2.getDirectionParamIncreaseV(x, y);
				var perp = dirV1.perpProduct(dirV2); // a.perp(b)==-b.perp(a); check if 0?

				intr1.set(curve1.name,
					curve1.getParameter(x, y),
					curve2.isHyperbola() ? (perp > 0 ? "OUT" : "IN") : (perp > 0 ? "IN" : "OUT"),
					x, y, intr2);

				intr2.set(curve2.name,
					curve2.getParameter(x, y),
					perp > 0 ? "OUT" : "IN",
					x, y, intr1);

				this.intersectionListByObjId(curve1.name).push(intr1);
				this.intersectionListByObjId(curve2.name).push(intr2);
			});
		};


		if (this._faceIntersectsCylinder) {

			intersect2Curves(this._cylinderCurve, this._coneLCurve);
			intersect2Curves(this._cylinderCurve, this._coneUCurve);
		}

		this.processIntersections();
	}


	processIntersections() {

		if (this._edgeIntersections.length === 0 && this._cylinderIntersections.length === 0)

			return this.processNoIntersectionCases();

		// Having any of intersections: curve-edge, curve-cylinder, edge-cylinder

		this._edgeIntersections.sort((a, b) => a.t - b.t);
		this._coneLIntersections.sort((a, b) => a.t - b.t);
		this._coneUIntersections.sort((a, b) => a.t - b.t);

		if (VisibilityCircle.DEBUG_SHOW_INTERSECTIONS) {

			this._coneLIntersections.forEach(intr => this.showLocalPoint(intr.p));
			this._coneUIntersections.forEach(intr => this.showLocalPoint(intr.p));
			this._cylinderIntersections.forEach(intr => this.showLocalPoint(intr.p));
		}

		this.addCurveIntervals( this._coneLCurve );
		this.addCurveIntervals( this._coneUCurve );

		if ( this._cylinderIntersections.length !== 0
		//if ( this._hasCylinderCurveIntersection // No, see TestAreaDisplay_Paper2_intersections3 case C
				&& this._cylinderCurve.isEllipse() ) { // parallelLines: zero width interval

			this._cylinderIntersections.sort((a, b) => a.t - b.t);
			this.addCurveIntervals( this._cylinderCurve );
		}


		for (let i = 0; i < this._edgeIntersections.length; i++) {

			let intr = this._edgeIntersections[i];

			if (!this.isEdgeIntersectionIntoVolume(intr))
				continue;

			this.addEdgeChainToIntervals(intr, i);
		}

		// Remains unaccounted: due to cylinder curvature it spans more
		// than max. of 2 intersections w/ cones (considered insignificant).
	}


	processNoIntersectionCases() {

		var p = this._facePolygon.getPoint(0);

		// _facePolygon is completely inside _coneUCurve. halfSgn applies.
		if (this._coneUCurve.containsPoint(p))
			return;

		if (this._coneLCurve.containsPoint(p)) { // between curves.

			if (!this._faceIntersectsCylinder || this._cylinderCurve.containsPoint(p))
				return this.addEntirePlanarPolygonToIntervals();

			return; // outside cylinder
		}

		// outside _coneLCurve.
		if ( !this._coneLCurve.isEllipse() ) {
			return;

		} else {

			if ( this._facePolygon.containsPoint( this._coneLCurve.getCenter() ) )
				this.cI.fillIntervals();

			return;
		}

		Report.warn("unknown NoIntersectionCase");
	}


	addCurveIntervals(curve) {

		var intrList = this.intersectionListByObjId(curve.name);

		for (let i = 0; i < intrList.length; i++) {

			let intr = intrList[i];

			if ( this.isCurveIntersectionIntoObscuringInterval(intr) ) {

				i = Util.nextIndex(intrList, i);
				this.addCurveInterval(curve, intr.p, intrList[i].p);

				if (i === 0)
					break;
			}
		}
	}


	isCurveIntersectionIntoObscuringInterval(intr) {

		if (intr.objId == "cylinder" && intr.otherSide.objId == "coneU")

			return intr.inOut == "OUT" && this._facePolygon.containsPoint(intr.p);

		if (intr.inOut == "OUT")
			return false;

		return intr.otherSide.objId == "edge" || this._facePolygon.containsPoint(intr.p);
	}


	// ===========================================================================
	//
	// Given plane curve, 2 intersection points in plane: start and end of obscure area.
	//
	// * plane orientation may be anything.
	// * start and end is in the direction of curve.
	//   Forward direction is where parameter along the curve t increases.
	//
	//
	//  |       curve         | face/curve2
	//  |     .-------.       |
	//  |    /         \      |
	//  |   /           \     |
	//  +--+-------------+----+
	//    / p1         p2 \
	//
	//            curve        
	//          .-------.       
	//         /         \      
	//        /           \     
	//  +----+-------------+-------+
	//  |   / p1         p2 \      | face/curve2
	//  |  /                 \     |
	//
	//
	// The question is which interval to fill, p1-p2 or p2-p1 in cone local space (+Y up).

	addCurveInterval(curve, p1, p2) {

		var	a2 = this.getLocalAngle(p2), // trashes localP
			localP = this.getLocalPoint(p1),
			a1 = Math.atan2(localP.z, localP.x);

		if (0) // hyperbola? TODO
			return this.cI.intervals.mergeCircularClosestPath(a1, a2);

		var	localV = this.getLocalVector( curve.getDirectionParamIncreaseV(p1.x, p1.y) );
		var perpProduct = localP.x * localV.z - localP.z * localV.x;

		if (Math.abs(perpProduct) < 1e-12) {

			this.cI.intervals.mergeCircularClosestPath(a1, a2);
			return Report.warn("low perpProduct", `value=${perpProduct} curve=${curve}`);
		}

		this.cI.intervals.mergeCircularInDirection(a1, a2, perpProduct > 0);
	}


	addCurveInterval_v1(curve, p1, p2) { // fails if interval > PI

		var	a1 = this.getLocalAngle(p1),
			a2 = this.getLocalAngle(p2);

		this.cI.intervals.mergeCircularClosestPath(a1, a2);
	}


	intersectionListByObjId(objId) {

		switch (objId) {

		case "edge":
			return this._edgeIntersections;
		case "coneL":
			return this._coneLIntersections;
		case "coneU":
			return this._coneUIntersections;
		case "cylinder":
			return this._cylinderIntersections;
		};
	}


	getLocalVector(p) { // on plane (u, v) -> (x, y, z)
		return VCFace._localVector.set(p.x, p.y, 0).applyRotation( this._planeToLocalTransform );
	}

	getLocalPoint(p) { // on plane (u, v) -> (x, y, z)
		return VCFace._localPoint.set(p.x, p.y, 0).applyMatrix4( this._planeToLocalTransform );
	}

	getLocalAngle(p) {
		var v = this.getLocalPoint(p);
		return Math.atan2(v.z, v.x);
	}


	addEdgeChainToIntervals(intr, i) {

		var	nextIntr = Util.nextElement(this._edgeIntersections, i);

		var lastAngle = this.getLocalAngle(intr.p);
		var angle;

		var	edgeNumCurrent = Math.floor(intr.t),
			edgeNumEnd = Math.floor(nextIntr.t);

		if (edgeNumCurrent === edgeNumEnd && nextIntr.t >= intr.t) {

			this.cI.intervals.mergeCircularClosestPath( lastAngle, this.getLocalAngle(nextIntr.p) );
			return;
		}

		while (1) {

			edgeNumCurrent = this._facePolygon.nextIndex(edgeNumCurrent);
			angle = this.getLocalAngle( this._facePolygon.getPoint(edgeNumCurrent) );

			this.cI.intervals.mergeCircularClosestPath( lastAngle, angle );
			lastAngle = angle;

			if (edgeNumCurrent === edgeNumEnd)
				break;
		}

		this.cI.intervals.mergeCircularClosestPath( lastAngle, this.getLocalAngle(nextIntr.p) );
	}


	isEdgeIntersectionIntoVolume(intr) {

		return intr.otherSide.objId == "coneU" ? intr.inOut == "OUT" : intr.inOut == "IN";
	}


	addEntirePlanarPolygonToIntervals() {

		var p = this._facePolygon.getPoint(this._facePolygon.points.length - 2);
		var lastAngle = this.getLocalAngle(p);

		this._facePolygon.traversePoints((p, i) => {

			let angle = this.getLocalAngle(p);

			this.cI.intervals.mergeCircularClosestPath(lastAngle, angle);
			lastAngle = angle;
		});
	}



	allocIntersection() { return VisibilityCircle.Intersection.objectCache.alloc() }

	freeIntersection(obj) { VisibilityCircle.Intersection.objectCache.free(obj) }


	clearAllIntersectionLists() {

		var clearList = (arr) => {

			arr.forEach(el => this.freeIntersection(el));
			arr.length = 0;
		};

		clearList(this._edgeIntersections);
		clearList(this._coneLIntersections);
		clearList(this._coneUIntersections);
		clearList(this._cylinderIntersections);
	}



	getWorldPoint(x, y) { //TODO (below)
		return new THREE.Vector3().set(x, y, 0).applyMatrix4( this.getPlaneToWorldMatrix() );
	}


	showLocalPoint(p) {

		this.getLocalPoint(p).clone().applyMatrix4( // TODO getPlaneToWorldMatrix ?

			this.vC.coneL.getWorldTransformInverse().clone().invert()

		).show(null, VisibilityCircle.DEBUG_INTERSECTION_RADIUS, "sphere");
	}


	getPlaneToWorldMatrix() {

		return VCFace._planeToWorldMatrix.multiplyMatrices(

			this.vC.coneL.getWorldTransformInverse().clone().invert(),
			this._planeToLocalTransform,
		);
	}

}



Object.assign( VCFace, {

	_curveDirectionV: new Point,
	_localPoint: new THREE.Vector3,
	_localVector: new THREE.Vector3,

	_planeToWorldMatrix: new THREE.Matrix4(),
});




export { VCFace }

