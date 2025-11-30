
import { ObjectCache } from '../Util/ObjectCache.js';


class VisibilityCircle {

	constructor() {

		this.cameraHeight = 0;
		this.item = null;
		this.itemHeight = 0;
		this.radius = 0;
		this.deltaH = 0.2;

		this.coneL = new Cone;
		this.coneU = new Cone;

		this.coneLPositionLocal = new THREE.Vector3;
		this.coneUPositionLocal = new THREE.Vector3;

		this.cI = new CircumferenceIntervals;

		this._rect = new Rectangle;
		this._apex = new THREE.Vector3;
		this._ptOnCone = new THREE.Vector3;

		this._itemToLocalTransform = new THREE.Matrix4;
		this._sphere = new THREE.Sphere;

		this.vCFaces = [ new VCFace(this) ];
		this.vCFace = this.vCFaces[0];

		//this.vCDebug = new VCDebug(this);
	}


	set(pt, item, distance, height, itemHeight = 2) {

		// "Volume": a space bounded by coaxial 2 cones and cylinder,
		// considered for camera-item visibility.

		if ( !(pt.shapeType == "Point" && (!item || (item instanceof Item)) && distance > 0 && height > 0) )
			Report.warn("bad args", `${pt}, ${item}, ${distance}, ${height}`);

		this.cameraHeight = height;
		this.item = item; // may be null (excluded from visibility test)
		this.itemHeight = itemHeight;
		this.radius = distance;

		var apex = this._apex.set(pt.x, 0, pt.y);
		var ptOnCone = this._ptOnCone.set(pt.x + distance, 0, pt.y);

		this.coneL.setFromApexAndPoint(

			apex.setY(item && item.position.y || 0),
			ptOnCone.setY(height - this.deltaH)
		);

		this.coneU.setFromApexAndPoint(

			apex.setY( (item && item.position.y || 0) + this.itemHeight ),
			ptOnCone.setY(height + this.deltaH)
		);

		this.coneUPositionLocal.setY(this.itemHeight);//.setX(0.5);

		this.cI.set(pt.x, pt.y, distance);

		return this;
	}


	computeCI(prohibitIntervals) {

		//   I. Camera Placement: must be consistent w/ possible camera moves.
		//
		// - All moves: free move from controls, move from MiniMap, PF
		//   use disjointPolygons (colliding)

		Main.area.spatialIndex.addDisjointPolygonsToCircumferenceIntervals(this.cI, this.cameraHeight);


		//   II. Target Visibility.
		//
		// =====================================================================
		//
		//   Task.
		//
		// Given volume bounded by 3 coaxial surfaces: 2 cones and cylinder,
		// and polyhedra (incl. non-convex), compute unobscured radial intervals
		// from the point of view from circle of intersection of cone and cylinder.
		// 2 cones don't intersect one with other inside the cylinder.
		//
		// =====================================================================

		this._rect.copy( this.cI.getRect() );

		('Tree' in window) && this._rect.enlarge(Tree.R_LEAVES);

		Main.area.spatialIndex.getAllItemsDependencyUsingShape(this._rect).forEach(item => {

			if (item === this.item)
				return;

			this.itemVsVolume(item);
		});

		//this.vCDebug.show();

		if (prohibitIntervals)
			this.cI.intervals.mergeInIntervals(prohibitIntervals);

		return this.cI.invertIntervals();
	}


	itemVsVolume(item) {

		if (item.isChoppedTree())
			return;

		var p = item.getPolyhedronBase();

		if (!p)
			return;

		this._itemToLocalTransform.multiplyMatrices(

			this.coneL.getWorldTransformInverse(),
			item.getMatrixWorld()
		);

		this.polyhedronVsVolume(item, p);
	}

	// Returns: 0: fully outside; 1: overlaps; 2: overlaps + intersects cylinder

	volumeOverlapsSphere(sphere, matrix4) {

		var sphere = this._sphere.copy(sphere);

		matrix4 && sphere.center.applyMatrix4(matrix4);

		if ( !this.coneL.overlapsSphere(sphere) )
			return 0;

		if ( this.coneU.sphereIsFullyInside(sphere, this.coneUPositionLocal) )
			return 0;

		var d = Util.hypot(sphere.center.x, sphere.center.z);

		if (d >= sphere.radius + this.radius) // outside cylinder
			return 0;

		if (this.radius - sphere.radius <= d)
			return 2;

		return 1;
	}


	polyhedronVsVolume(item, p) {

		var result = this.volumeOverlapsSphere(p.getBoundingSphere(), this._itemToLocalTransform);

		if (result === 0)
			return;

		VisibilityCircle.DebugPolyhedra.show(item, p);

		var faces = p.getFaces();

		faces.forEach( (face, i) => {

			var faceIndex = VisibilityCircle.DEBUG_FACES ? i : 0;
			var vCFace = this.vCFaces[i] || ( this.vCFaces[i] = new VCFace(this) );

			vCFace.process(item, face);

			this.cI.intervals.mergeInIntervals( vCFace.cI.intervals );
		});
		
		Util.setLength(this.vCFaces, VisibilityCircle.DEBUG_FACES ? faces.length : 1);
	}


	isPlaneInvisible(plane) {

		return plane.distanceToPoint(this.coneLPositionLocal) < 0
			&& plane.distanceToPoint(this.coneUPositionLocal) < 0;
	}




/* incompat. w/ dependent, item.getInvertedMatrix4
	static line3VsPolyhedra(line3, excludeItem) {

		var line2 = this._line2.copyFromLine3(line3);
		var items = Main.area.spatialIndex.getCollidingItemsUsingShape(0, line2, +2.5);

		return items.some(item => {

			if (item === excludeItem)
				return;

			var polyhedronBase = item.spec.getPolyhedronBase();

			if (!polyhedronBase)
				return;

			var line3Local = this._line3Local.copy(line3).applyMatrix4( item.getInvertedMatrix4() );

			return polyhedronBase.intersectsLine3(line3Local);
		});
	}
*/

	static multipleLine3VsPolyhedra(line3s, excludeItem) {

		var rect = this._rect.clear();

		line3s.forEach(	(line3, i) => {

			rect.expandByRect( this._line2.copyFromLine3(line3).getRect() );

			this._line3sLocal[i] || (this._line3sLocal[i] = new THREE.Line3);
		});

		('Tree' in window) && rect.enlarge(Tree.R_LEAVES);

		Util.setLength(this._line3sLocal, line3s.length);


		return Main.area.spatialIndex.getAllItemsDependencyUsingShape(rect).some( item => {

			if (item === excludeItem)
				return;

			var polyhedronBase = item.spec.getPolyhedronBase();

			if (!polyhedronBase)
				return;

			var matrixWorldInverse = item.getMatrixWorldInverse();

			this._line3sLocal.forEach( (line3, i) =>
				line3.copy( line3s[i] ).applyMatrix4(matrixWorldInverse) );

			// It does not skip invis. faces
			return polyhedronBase.intersectsAnyOfLine3(this._line3sLocal);
		});
	}

}


Object.assign(VisibilityCircle, {

	_rect: new Rectangle,
	_line2: new Line2,
	_line3Local: new THREE.Line3,
	_line3sLocal: [],

	DEBUG_FACES: 0,

	DEBUG_SHOW_CURVES: 0,
	DEBUG_SHOW_INTERSECTIONS: 0,
	DEBUG_INTERSECTION_RADIUS: 0.03,
/*
	stats: {

		_casesTotal: 0,
		_caseParabola: 0,
		_casePlaneHitsApex: 0,
		_caseExtremeEllipse: 0,
		_caseLine2Cylinder: 0,

		_faceBSphereSkip: 0,
		_faceBSphereTotal: 0,
	},
*/
});




VisibilityCircle.DebugPolyhedra = {

	_isOn: false,
	_shownItems: new Set,


	toggle(isOn) {

		this._isOn = isOn;

		if (!isOn) {

			Util.filterInPlace(scene.children, mesh => !mesh.userData.isPolyhedron);
			this._shownItems.clear();
		}
	},


	show(item, p) {

		if (!this._isOn || this._shownItems.has(item))
			return;

		p.clone().applyMatrix4( item.getMatrixWorld() ).show();

		this._shownItems.add(item);
	},
}




VisibilityCircle.Intersection = function() {

	this.objId = "";
	this.inOut = "";
	this.t = null;
	this.p = new Point;
	this.otherSide = null;
	this.status = null;
}


Object.assign(VisibilityCircle.Intersection.prototype, {

	toString() {
		return `[VisibilityCircle.Intersection objId=${this.objId} "${this.inOut}"`
			+ ` p=${this.p} other:${this.otherSide.objId} ${this.otherSide.inOut}]`;
	},


	set(objId, t, inOut, x, y, otherSide = null) {

		this.objId = objId;
		this.inOut = inOut;
		this.t = t;
		this.p.set(x, y);
		this.otherSide = otherSide;

		return this;
	},


	clear() {
		this.id = "";
		return this;
	},

});




VisibilityCircle.Intersection.objectCache = new ObjectCache(100,

	() => new VisibilityCircle.Intersection,

	(obj) => {
		obj.objId = "";
		obj.otherSide = null;
		obj.status = null;
	}
);




export { VisibilityCircle }

