
import { Point } from './Point.js';


var TriangleSolver = {

	_upperVertex: new Point,
};


// segment.p1    p2
//  +----------+
//   \         | ==90deg
//    \        |
//     \       |
//      \ d    | line
//       \     |
//        \    |
//         \   |
//          \  |
//           \ |
//         p3 \|
//
TriangleSolver.getP3From2PointsAndD = function(segment, d) {

	var distanceP2P3 = Math.sqrt(d * d - segment.distanceSq());
	if ( !(distanceP2P3 >= 0) )
		return false;

	var p = segment.getPointOnPerpendicularToP2(distanceP2P3);
	return p;
}


//   Given:
//
//         O (x=?,y=?)
//        / \
//    d1 /   \ d2
//      /     \
//     O-------O
// (x1,y1)  d3  (x2,y2)
//
TriangleSolver.getUpperVertex = function(x1, y1, x2, y2, d1, d2,
			target = TriangleSolver._upperVertex) {

	var d3 = Util.hypot(x1 - x2, y1 - y2);

	var cosAngle1 = (d1 * d1 + d3 * d3 - d2 * d2) / (2 * d1 * d3);
	if (cosAngle1 < -1 || cosAngle1 > 1)
		return;

	// If required x3 within interval x1..x2 (x2 may be less than x1)
	// considered checking cosAngle1 for < 0. The case of angle2 being >90deg
	// still remanis.

	var angle1 = Math.acos(cosAngle1);
	var angleD3ToAxisX = Math.atan2(y2 - y1, x2 - x1);

	//
	// There're 2 solutions. We need the "upper" point (with largest Y).
	//
	var angleD1ToAxisX = angleD3ToAxisX
		+ (Math.abs(angleD3ToAxisX) < Math.PI / 2 ? angle1 : -angle1);

	return target.set(
		x1 + d1 * Math.cos(angleD1ToAxisX),
		y1 + d1 * Math.sin(angleD1ToAxisX)
	);
}



export { TriangleSolver };

