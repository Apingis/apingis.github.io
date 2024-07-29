
class LogSpec {

	constructor() {
		Report.throw("static constructor");
	}

}


LogSpec.getAxisData = function(p, lowerPlane, upperPlane) {

	var lowerVertices = p.getVertices().filter(v =>
		Math.abs(lowerPlane.distanceToPoint(v.position)) < 1e-9);

	var	lowerSphere = new THREE.Sphere().setFromPoints(lowerVertices.map(v => v.position));

	var upperVertices = p.getVertices().filter(v =>
		Math.abs(upperPlane.distanceToPoint(v.position)) < 1e-9);

	var	upperSphere = new THREE.Sphere().setFromPoints(upperVertices.map(v => v.position));

	var	axis = new THREE.Line3(lowerSphere.center, upperSphere.center);


	return {

		axis,

		axisDirectionNorm: axis.delta(new THREE.Vector3).normalize(),
		center: axis.getCenter(new THREE.Vector3),
		length: axis.distance(),

		radius: {
			min: upperSphere.radius,
			max: lowerSphere.radius,
			avg: (lowerSphere.radius + upperSphere.radius) / 2,
		},

		vRange: {
			min: upperVertices[0].uv.y,
			max: lowerVertices[0].uv.y,
		},
	};
}


LogSpec.getLogData = function(p, axisData) { // geometry, cutoff matrix

	// 1. "Rest pose": at origin, horizontal, "upper" cross-section towards +X
	// created from tree w/ facing=0.

	var cutoffToOriginMatrix = new THREE.Matrix4().setPosition(
		-axisData.center.x, -axisData.center.y, -axisData.center.z
	);

	var cutoffOriginToRestMatrix = new THREE.Matrix4().makeRotationFromQuaternion(

		new THREE.Quaternion().setFromUnitVectors(
			axisData.axisDirectionNorm,
			new THREE.Vector3(1, 0, 0)
		)
	);

	var cutoffToRestMatrix = cutoffOriginToRestMatrix.multiply(cutoffToOriginMatrix);

	//var geometry = p.clone().removeWind().getGeometry();
	var geometry = p.clone().stopWind().getGeometry();
	geometry.applyMatrix4(cutoffToRestMatrix);


	// 2. "Cutoff pose": chopped off the rest of the tree as if
	// the tree was standing up w/ facing=0.

	var cutoffMatrix = cutoffToRestMatrix.invert();


	return {
		geometry,
		cutoffMatrix,
	};
}


LogSpec.applyMatrix4ToAttributes = function(geometry, matrix4) {
}



LogSpec.crumbleT = 40 * 60;




export { LogSpec };

