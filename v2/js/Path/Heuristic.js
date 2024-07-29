
class Heuristic {

	constructor() { Report.throw("static constructor"); }


	static get(node, pathLevel) {

		var nextILine;
		var d;
		var type;

		if (pathLevel.upperData)
			nextILine = pathLevel.upperData.nextIntermediateLine(node);

		if (nextILine) {
			d = this.getDistanceNodeToLine(node, pathLevel, nextILine);
			type = "iLine ";

		} else {
			d = this.getDistanceNodeToNode(node, pathLevel);
			type = "Pt ";
		}

		var h = pathLevel.epsilon1 * d / pathLevel.unitSpeed;

		if (VGNode.DEBUG)
			node.debug.heuristic = type + h;

		return h;
	}


	static getDistanceNodeToNode(node, pathLevel) {

		return pathLevel.dst.minDistanceToNode(node);
	}


	static getDistanceNodeToLine(node, pathLevel, line) {

		return line.distanceSegmentTo(node.x, node.y)
			// in upperData (PathLevelData), G is initialized with distance in reverse direction
			+ pathLevel.upperData.wayPoints[node.wPIndex + 1].g;
	}
}



export { Heuristic };

