
import { Line2 } from '../Math/Line2.js';
import { Point } from '../Math/Point.js';

//
//   For hierarcial pathfinding
//
// PathLevelData represents data from the upper level.
//
class PathLevelData {

	constructor(pathLevel) {

		this.pathLevel = pathLevel; // contains 'dst' for upper level used for creation of this data

		this.wayPoints = null;
		this.dst = null; // resulting dst for the lower level.

		this.distance = undefined;
		this.intermediateLines = null;
		this.extILines = null;
		this.boundingLines = null;
	}


	setup(wayPoints) { // WP's can change?

		console.assert(wayPoints.length >= 2);

		this.wayPoints = wayPoints;

// TODO? same for now
		this.dst = this.pathLevel.dst;

		var wPIndex = 0;

		for (let i = 0; i < wayPoints.length; i++) {

			wayPoints[i].wPIndex = wPIndex ++;

			if (VGNode.DEBUG)
				wayPoints[i].debug.wayPoint = wPIndex;
		}

		//
		// WayPoints are not used like "regular" VGNodes in the heap.
		//
		// Initialize G with distance in reverse direction
		// for usage as such in Heuristic.
		// Clear F.
		// - clear parent?
		//
		var endWayPoint = wayPoints[wayPoints.length - 1];
		endWayPoint.g = 0;
		endWayPoint.f = undefined;

		for (let i = wayPoints.length - 2; i >= 0; i--) {

			wayPoints[i].g = wayPoints[i + 1].g
				+ wayPoints[i].distanceToVGNode(wayPoints[i + 1]);

			wayPoints[i].f = undefined;
			wayPoints[i].addFlags(VGNode.WAYPOINT);
		}

		this.distance = wayPoints[0].g;


		this.createIntermediateLines();

		// Issue. All destination WP's to have same wPIndex, beyond last iLine.
		this.forceDestinationBeyondILines();

		this.createBoundingLines();
	}


	forceDestinationBeyondILines() {

		//if (this.dst instanceof DestinationPile)
		//	return;


		if (this.dst.count() <= 1)
			return;

		var bCircle = this.dst.boundingCircle;
		console.assert(bCircle);

		var i = this.intermediateLines.length - 1,
			scrapExcessILinesNum = 0;

		for ( ; i >= 1; i--) {

			if (this.intermediateLines[i].intersectsSegmentCircle(bCircle))
				scrapExcessILinesNum ++;
			else
				break;
		}

		if (scrapExcessILinesNum > 0) {
			this.intermediateLines.length = i + 1;
			this.wayPoints.splice(i + 1, scrapExcessILinesNum);
		}
	}


	createBoundingLines() {

		this.boundingLines = [];

		var lineDistance = PathPlanner.IntermediateLineDistanceByLevel[this.pathLevel.level];

		if (this.wayPoints.length === 2) {
			this.createBoundingLines_SignlePathSegment(lineDistance);
			return;
		}


		this.extILines = this.intermediateLines.map(line => {
			return line ? line.clone().extend2Ends(lineDistance / 2) : null;
		});

		this.createBoundingLines_EndPathSegment(0, lineDistance);

		for (let i = 1; i < this.wayPoints.length - 2; i++)
			this.createBoundingLines_IntermediatePathSegment(i);

		this.createBoundingLines_EndPathSegment(1, lineDistance);
	}


	createBoundingLines_IntermediatePathSegment(i) {

		var extILine1 = this.extILines[i],
			extILine2 = this.extILines[i + 1];

		var intersectionPt = extILine1.intersect2Segments(extILine2, this._pt),
			isOpposite = Angle.absDiff(extILine1.angle(), extILine2.angle()) > Math.PI / 2;

		var line1, line2;

		if (!intersectionPt) {
			if (isOpposite) {
				line1 = new Line2(extILine1.p1, extILine2.p2);
				line2 = new Line2(extILine1.p2, extILine2.p1);

			} else {
				line1 = new Line2(extILine1.p1, extILine2.p1);
				line2 = new Line2(extILine1.p2, extILine2.p2);
			}

		} else {
			if (isOpposite) {
				let iLine = this.intermediateLines[i];
				if (iLine.isPointAheadOfPoint(intersectionPt, iLine.p1))
					line1 = new Line2(extILine1.p1, extILine2.p2);
				else
					line1 = new Line2(extILine1.p2, extILine2.p1);

			} else {
				line1 = new Line2(extILine1.p2, extILine2.p2);
			}
		}

		this.boundingLines.push(line1, line2);
	}


	createBoundingLines_EndPathSegment(isGoal, lineDistance) {

		var wP0Index = isGoal ? this.wayPoints.length - 1 : 0,
			wP1Index = isGoal ? wP0Index - 1 : 1,
			wP0 = this.wayPoints[wP0Index],
			wP1 = this.wayPoints[wP1Index],
			extILine = this.extILines[wP1Index];

		var line = new Line2().set(wP0.x, wP0.y, wP1.x, wP1.y).extend2Ends(lineDistance, 0);
		line.setFromPLengthAndSegment(line.p1, lineDistance, line);

		var line1 = new Line2(line.p1, extILine.p1),
			line2 = new Line2(line.p2, extILine.p2);

		if (line1.intersect2Segments(line2)) {
			line1.p2 = extILine.p2;
			line2.p2 = extILine.p1;
		}

		this.boundingLines.push(line, line1, line2);
	}


	createBoundingLines_SignlePathSegment(lineDistance) {

		var wP0 = this.wayPoints[0],
			wP1 = this.wayPoints[1];

		var line = this._line.set(wP0.x, wP0.y, wP1.x, wP1.y).extend2Ends(lineDistance),
			line1 = new Line2().setFromPLengthAndSegment(line.p1, lineDistance, line),
			line2 = new Line2().setFromPLengthAndSegment(line.p2, lineDistance, line);

		this.boundingLines.push(
			line1, new Line2(line1.p1, line2.p1),
			line2, new Line2(line1.p2, line2.p2)
		);
	}


	createIntermediateLines() {

		this.intermediateLines = [ null ];

		var distance = PathPlanner.IntermediateLineDistanceByLevel[this.pathLevel.level];
		var prevLine;

		for (let i = 1; i < this.wayPoints.length - 1; i++) {

			let line = this.createIntermediateLine(i, distance);

			if (i > 1 && line.intersect2Segments(prevLine, this._pt)) {
				// must not happen
				console.error(`2 intermediate lines intersect i=${i}`, line.clone(), prevLine.clone() );
line.clone().show('blue');
prevLine.clone().show('red');

/*
				// intersects previous line; correct it
				let isLeftOfPrevLine = prevLine.isPointLeft(line.p1) > 0;
				line.p2.copy(prevLine.p2);
				line.rotateAroundP1(isLeftOfPrevLine ? 0.02 : -0.02);

				console.assert(!line.intersect2Segments(prevLine, this._pt));

				line.setDistance(PathPlanner.IntermediateLineDistanceByLevel[this.level]);
*/
			}

			this.intermediateLines[i] = line;
			prevLine = line;
		}
	}


	createIntermediateLine(i, distance) {

		var wP = this.wayPoints[i];

		var alpha = Angle.obtuseAvgOf3(this.wayPoints[i - 1].x, this.wayPoints[i - 1].y,
				wP.x, wP.y, this.wayPoints[i + 1].x, this.wayPoints[i + 1].y);

		//
		// Intermediate lines created only for paths where all waypoints
		// (except for start and end ones) are vertices of static polygons.
		//
		console.assert(VGNodeId.isAtStaticVertex(wP.id));

		var radiusClass = this.pathLevel.radiusClass,
			polygon = VGNodeId.polygon(wP.id, radiusClass),
			vertexIndex = VGNodeId.vertexIndex(wP.id),
			flagLeftSign = VGNodeId.flagLeftSign(wP.id);

		// Collinear or almost-collinear (epsilon) waypoints require extra check
		// (mb.TODO simplification possible)
		if (Angle.absDiff(alpha, polygon.angleOfVertexNormal(vertexIndex)) > 1) {
			alpha = Angle.opposite(alpha);
		}

		var p1 = new Point(wP.x, wP.y),
			p2 = p1.getByAngleDistance(alpha, distance),
			line = new Line2(p1, p2);

		this.pathLevel.area.spatialIndex.processSomeDisjointPolygonsUsingShape(line,
				this.pathLevel.level, radiusClass, polygonInArea => {

			if (polygonInArea != polygon)
				polygonInArea.cutSegmentWithEdges(line, 1e-3);

		}, true);

		return line;
	}


	// ==============================
	//
	//   Checks
	//
	// ==============================

	nextIntermediateLine(node) {
		return this.intermediateLines[node.wPIndex + 1];
	}

	nextWayPoint(node) {
		return this.wayPoints[node.wPIndex + 1];
	}


	//
	// Returns: true to accept, false to discard
	// Sets neighbor.wPIndex
	//
	checkNeighborWPIndex(node, neighbor) {

		var line = this._line.set(node.x, node.y, neighbor.x, neighbor.y);

		var wPIndex = this.checkIntersectionIntermediateLines(line, node.wPIndex);
		if (wPIndex === false)
			return false;

		if (this.checkIntersectionBoundingLines(line, wPIndex) === true)
			return false;

		neighbor.wPIndex = wPIndex;
		return true;
	}


	// Returns true if there's an intersection
	checkIntersectionBoundingLines(line, wPIndex) {

		var length = this.wayPoints.length,
			startI, endI;

		console.assert(wPIndex < length - 1 && wPIndex >= 0);

		if (wPIndex === 0) {
			startI = 0;
			endI = length == 2 ? 3 : 2;

		} else {
			startI = 2 * wPIndex + 1;
			endI = startI + (wPIndex == length - 2 ? 2 : 1);
		}

		for (let i = startI; i <= endI; i++) {
			let bLine = this.boundingLines[i];
			if (bLine && bLine.intersect2Segments(line) === true)
				return true;
		}
	}


	checkIntersectionIntermediateLines(line, wPIndex) {

		var result = this.checkIntersectionIntermediateLinesDirection(line, wPIndex, 1);
		if (result !== wPIndex)
			return result;

		return this.checkIntersectionIntermediateLinesDirection(line, wPIndex, -1);
	}

	//
	// wPIndex: current index (0 or last intersected line)
	// directionSign: 1 forward, -1 backward
	// Returns:
	// - false if it intersects outside segment ends (to be discarded)
	// - same wPIndex if there was no intersection
	// - new wPIndex if there were intersections
	//
	// Cuts line with intersection pt. (line.p1)
	//
	checkIntersectionIntermediateLinesDirection(line, wPIndex, directionSign) {

		while (1) {
			let result = this.checkIntersectionIntermediateLine(line, wPIndex, directionSign);
			if (result === undefined) {
				break;

			} else if (result === false) {
				return false;

			} else {
				wPIndex += directionSign;

				if (result >= 1)
					break;
				if (result < 0) // shouldn't have happened
					break;

				line.getPointAt(result, line.p1); // cut line with intersection pt.
			}
		}

		return wPIndex;
	}

	//
	// Forward intersection rules (epsilon hard):
	// - line.p2 is on iLine: intersection
	// - line starts on iLine: no intersection (must not happen)
	// - coincident: no intersection (must not happen)
	//
	// Backward intersection:
	// - line starts on iLine: if goes backwards then there's an intersection
	// - line.p2 is on iLine: NO intersection
	// - coincident: no intersection
	//
	// Returns:
	// - undefined: no intersection
	// - false: intersection outside line segment ends
	// (NO) - true: intersection within line segment
	// - number: intersection parameter for line
	//
	checkIntersectionIntermediateLine(line, wPIndex, directionSign) {

		var iLine = this.intermediateLines[wPIndex + (directionSign > 0 ? 1 : 0)];
		if (!iLine)
			return;

		var isLeft1 = Math.sign(iLine.isPointLeft(line.p1)),
			isLeft2 = Math.sign(iLine.isPointLeft(line.p2));

		if (isLeft1 === 0) {

			if (directionSign > 0) { // forward - no way
				console.error(`can't happen 1, Expansion.byId[${Expansion.nextId-1}]`);
				return;
			}

			// line started on iLine. which direction did it take?
			if (isLeft2 === 0)
				return; // coincident (TODO: check out-of-segment?)

			let prevWP = this.wayPoints[wPIndex - 1];
			if (!prevWP) {
				console.error(`can't happen 2, Expansion.byId[${Expansion.nextId-1}]`);
				return;
			}

			// not same direction as previous WP: no intersection
			if (iLine.isLeft(prevWP.x, prevWP.y) !== isLeft2)
				return;

			// else: intersection, check segment ends & return parameter
		}

		if (isLeft1 === isLeft2)
			return;

		// Backwards, line.p2 is on iLine: count as NO intersection
		if (isLeft2 === 0 && directionSign < 0) {

			let result = this.checkIntersectionIntermediateLine_SegmentEnds(line, iLine);

			if (result === false)
				return false;

			if (result === undefined)
				console.error(`can't happen 3, Expansion.byId[${Expansion.nextId-1}]`);

			return; // result=true: intersected within segment ends, OK
		}

		// Intersected iLine, requires to check segment ends

		return this.checkIntersectionIntermediateLine_SegmentEnds(line, iLine);
	}

	//
	//  Returns:
	//
	// - false: outside iLine ends
	// - undefined: no intersection
	// (NO) - true: intersection OK
	// - number: intersection paremeter for line (0 <= t <= 1), other
	// cases were previously ruled out
	//
	checkIntersectionIntermediateLine_SegmentEnds(line, iLine) {

		var x = line.getX(), iLineX = iLine.getX(),
			y = line.getY(), iLineY = iLine.getY();

		var d = x * iLineY - y * iLineX;
		if (d === 0)
			return;

		const epsilon = 1e-9;

		var u = ( (iLine.p1.y - line.p1.y) * x - (iLine.p1.x - line.p1.x) * y ) / d;
		if (u < -1 - epsilon || u > epsilon)
			return false;

		var t = ( (iLine.p1.x - line.p1.x) * iLineY	- (iLine.p1.y - line.p1.y) * iLineX ) / d;
		if (t <= 0 || t > 1) {
			console.error(`can't happen t=${t} Expansion.byId[${Expansion.nextId-1}]`);
		}

		return t;
	}


	// ===============
	//
	//   DEBUG
	//
	// ===============

	showMini() {
		if (MiniMap.path)
			MiniMap.setPath();
		else
			MiniMap.setPath(this.wayPoints);
	}


	show() {
		this.showMini();

		this.wayPoints.forEach(wP => wP.show());

		this.boundingLines.forEach(l => l && l.show('boundingLine'));
		this.extILines && this.extILines.forEach(l => l && l.show('boundingLine2'));

		this.intermediateLines.forEach(l => l && l.show('intermediateLine'));

		return this;
	}

}


Object.assign(PathLevelData.prototype, {
	_line: new Line2,
	_pt: new Point
});



export { PathLevelData };

