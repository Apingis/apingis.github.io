
import { Point } from '../Math/Point.js';


class VGNode { // Visibility Graph Node

	constructor(x, y, id, angle, flags) {

//this.gId = VGNode.nextId ++;

		this.episodeId = undefined;
		this.g = undefined;

		this.x = x;
		this.y = y;
		this.id = id; // is unique within episode
		this.angle = angle; // "arrive angle"
		this.flags = flags |0;

		this.parent = null;
		this.wPIndex = undefined;
		this.penalty = 0;
		this.f = undefined;

		this.expanId = undefined;
		//this.fromExpansion = undefined;

		//this.duration = 0;
		this.aroundTrack = null; // dynamic pt. around track

		this.blockedBy = null;

		this.data = null; // auxiliary data, (? cloned ?)

		if (VGNode.DEBUG)
			this.debug = {};
	}

	get duration() { console.error(`duration`); }
	set duration(v) { console.error(`duration`); }

	get action() { console.error(`action`); }
	set action(v) { console.error(`action`); }

	toString() {
		return `[VGNode=${this.id} ${Util.toStr(this.x)},${Util.toStr(this.y)}`
			+ ` g=${Util.toStr(this.g)} f=${Util.toStr(this.f)}]`;
	}

	getBaseId() { return VGNodeId.removeFlags(this.id); }

	isGoal() { return VGNodeId.isGoalPt(this.id) !== undefined; }

	isDynamic() { return VGNodeId.isDynamicPt(this.id) !== undefined; }


	//isAction() { return (this.flags & VGNode.ACTION) !== 0; }

	isInPlace() { return (this.flags & VGNode.IN_PLACE) !== 0; }

	isEpisodeStart() { return (this.flags & VGNode.EPISODE_START) !== 0; }

	expandsInPlace() { return (this.flags & VGNode.EXPANDS_IN_PLACE) !== 0; }

	hasPriority() { return (this.flags & VGNode.PRIORITY) !== 0; }

	hasFlags(flags) { return (this.flags & flags) !== 0; }

	isDiscarded() { return (this.flags & VGNode.DISCARDED) !== 0; }

	isBlocked() { return (this.flags & VGNode.BLOCKED) !== 0; }
	isSmashed() { return (this.flags & VGNode.SMASHED) !== 0; }

	isExpanded() { return typeof this.expanId == "number"; }

	getEpisode(unit) { return unit.aI.episodes.getById(this.episodeId) }


	setDiscarded() { this.flags |= VGNode.DISCARDED }

	addPenalty(val) {
		//console.assert(!this.penalty);
		this.penalty += val;
	}



	equals(node) {
		return this.g === node.g && this.inSameLocation(node);
	}

	keyToTrack() {
		return this.episodeId + "-" + this.expanId + "-" + this.id
			+ "-" + this.x.toFixed(2) + "," + this.y.toFixed(2);
	}

	uniqueKey() { return this.episodeId + "-" + this.id; }


	clone() {
//console.error(`VGNode.clone`);
		var vGNode = new VGNode(this.x, this.y, this.id, this.angle, this.flags);

		vGNode.g = this.g;
		vGNode.penalty = this.penalty;

		return vGNode;
	}

/*
	cloneFullWithData(parent) {

		var vGNode = this.clone();

		vGNode.parent = this.parent;
		vGNode.g = this.g;

		vGNode.episodeId = this.episodeId;
		vGNode.expanId = this.expanId;

		vGNode.data = this.data; // by ref.

		return vGNode;
	}
*/

	addWayPointData() {

		if (this.data)
			return this;

		this.data = {

			startFn: null,

			action: "",
			refItem: null,
			eventItem2: null,
			eventTarget: null,
			eventFn: null,
			beforeEventFn: null,

			arriveFn: null,
		};

		return this;
	}


	inSameLocation(node) { return this.x === node.x && this.y === node.y; }

	inSameLocationDelta(node, delta = 1e-6) {
		return Math.abs(this.x - node.x) < delta && Math.abs(this.y - node.y) < delta;
	}

	isPointInSameLocation(p) { return this.x === p.x && this.y === p.y; }

	hasPredecessor(predecessor) { // includes case where 'this' node is given predecessor.
		for (let p = this; p; p = p.parent)
			if (p === predecessor)
				return true;
	}


	hasCleanPredecessors() {

		for (let p = this; p; p = p.parent) {

			if ( !(p.g >= Engine.time) )
				return true;

			if (p.isBlocked() || p.isSmashed())
				return false;
		}

		return true;
	}


	height() {
		var height = -1;
		for (let p = this; p; p = p.parent)
			height ++;
		return height;
	}

	getPoint() { return this._getPoint.set(this.x, this.y); }

	addFlags(flags) {
		this.flags |= flags;
		return this;
	}

	addG(g) {
		this.g += g;
		return this;
	}

	setG(g) {
		this.g = g;
		return this;
	}


	setExpandsInPlace(duration) {

		this.duration = duration;
		this.addFlags(VGNode.EXPANDS_IN_PLACE);
		return this;
	}


	set(x, y, id, angle) {

		this.x = x;
		this.y = y;
		this.id = id;
		this.angle = angle;
		return this;
	}


	getByAngleDistance(angle, distance, id) {

		return new VGNode(
			this.x + distance * Math.cos(angle),
			this.y + distance * Math.sin(angle),
			id, angle);
	}


	setFromAngleDistance(x, y, angle, distance) {

		this.x = x + distance * Math.cos(angle);
		this.y = y + distance * Math.sin(angle);
		this.angle = angle;
		return this;
	}


	setFromCircleAngle(circle, angle) {

		this.x = circle.x + circle.radius * Math.cos(angle);
		this.y = circle.y + circle.radius * Math.sin(angle);
		this.angle = angle;
		return this;
	}


	distanceTo(x, y) { return Util.hypot(this.x - x, this.y - y); }

	distanceToPoint(p) { return Util.hypot(this.x - p.x, this.y - p.y); }

	distanceToVGNode(vGNode) { return this.distanceTo(vGNode.x, vGNode.y); }

	distanceSqTo(x, y) { return Util.hypotSq(this.x - x, this.y - y); }

	angleTo(x, y) { return Math.atan2(y - this.y, x - this.x); }


	// ================================
	//
	//   DEBUG
	//
	// ================================

	showSign(matName = 'vGNode', nSections = 5, w = 0.5, h = 3) {

		var p = this._showDataSign.get(this);
		if (p) {
			this._showDataSign.delete(this);

		} else {
			p = this.getPoint().clone();
			this._showDataSign.set(this, p);
		}

		p.showSign(matName, nSections, w, h, 0.9);
		return this;
	}


	showRect(matName = 'vGNode', r) {

		var p = this._showDataRect.get(this);
		if (p) {
			this._showDataRect.delete(this);

		} else {
			p = this.getPoint().clone();
			this._showDataRect.set(this, p);
		}

		p.showRect(matName, r);
		return this;
	}


	show(matName = 'vGNode', r = 0.08) {

		var mesh = this._showData.get(this);
		if (mesh) {
			scene.remove(mesh);
			this._showData.delete(this);
			return;
		}

		var g = HelperGeometry.getCircle(r);
		var mesh = new THREE.Mesh(g, Assets.materials.line[matName]);
		mesh.position.set(this.x, 0.01, this.y);
		mesh.name = `${this}`;
		scene.add(mesh);
		this._showData.set(this, mesh);
		return this;
	}
	
}


Object.assign(VGNode, {

	DEBUG: typeof Main != "undefined" && Main.DEBUG >= 3,

	nextId: 1,

	IN_PLACE: 1,
	EXPANDS_IN_PLACE: 2,
//	ACTION: 4,
	EPISODE_START: 8,

	PRIORITY: 1 << 8,
//GOAL?
	BLOCKED: 1 << 16,
	SMASHED: 1 << 17,

	WAYPOINT: 1 << 24,
	DISCARDED: 1 << 25,
	CUT_TRACK: 1 << 26,
});


Object.assign(VGNode.prototype, {

	shapeType: "VGNode",
	_getPoint: new Point,
	_showData: new Map,
	_showDataSign: new Map,
	_showDataRect: new Map,
});



export { VGNode };

