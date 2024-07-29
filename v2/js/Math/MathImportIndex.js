
export * from './THREE-Math.js';

export * from './BellPolynomial.js';
export * from './CameraViewShape2D.js';
export * from './Circle.js';
export * from './CircumferenceIntervals.js';
export * from './Cone.js';
export * from './CurveApproximation.js';
export * from './DifferentiableCurve.js';
//export * from './IntervalPolynomial.js';
export * from './HessianLine.js';
export * from './Intervals.js';
export * from './HyperEllipseBase.js';
export * from './CoatedHyperEllipseBase.js';
export * from './Line2.js';
export * from './Math.js';
export * from './Matrix.js';
export * from './NumericMethod.js';
export * from './Point.js';
export * from './Polygon.js';
export * from './Polynomial.js';
export * from './QuadraticCurve.js';
export * from './Range.js';
export * from './Rectangle.js';
export * from './RectanglePacking.js';
export * from './Sector.js';
export * from './TriangleSolver.js';

export * from './Polyhedron/Polyhedron.js';
export * from './Polyhedron/PolyhedronData2.js';
export * from './Polyhedron/PolyhedronFeatures.js';
export * from './Polyhedron/PolyhedronFn.js';


function doImport() {

	var isNode = typeof window == "undefined";
	var haveExport5 = !isNode && typeof window.export5 == "function";

	for (let [ name, exported ] of Object.entries(this)) {

		if (name == "doImport")
			continue;

		if (isNode)
			global[name] = exported;
		else
			window[name] = exported;

		if (haveExport5)
			export5(name, exported);
	}
}


export { doImport };

