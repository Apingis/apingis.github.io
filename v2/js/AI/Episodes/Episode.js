
class Episode {

	constructor(task, startNode, type, params = {}) {

		if (this.constructor.name == "Episode")
			Report.throw("abstract constructor");

		console.assert(task instanceof Task);

		this.id = Episode.nextId ++;
		this.type = type;
		//if (Main.DEBUG >= 5)
		//	Episode.Types[this.type] = 0;

		this.task = task;

		this.unit = task.unit;
		this.startNode = startNode; // not used as node for WP's

		this.data = Object.create(null);

		this.wayPoints = null;

		this.completed = false; // requires no more computation.
		this.stopped = false; // ? TODO

		// forced to stop. episode w/ waypoints must remain.
		this.cancelled = false;

		this._onFinished = null;
		this._onRemove = null; // runs on non-outdated
		this._itemListeners = [];

		this._chainComputeNext = false;

		this._nextPtId = 1;

		this.params = params;

		if (Main.DEBUG >= 5)
			Episode.byId[this.id] = this;
	}


	toString() {
		var name = this.constructor.name;
		return `<${name} Episode.byId[${this.id}] uId=${this.unit.id} type=${this.type}`
			+ ` start=${this.startNode}`;
	}


	getLangDescr() {
		return Lang('episode_' + this.type);
	}


	isMove() {}

	isIdle() {}

	isCompleted() { return this.completed; }

	isStopped() { return this.stopped; }

	isCompletedOrStopped() { return this.completed || this.stopped; }

	// All wayPoints defined; does not require more computation.
	isClosed() { return this.completed || this.stopped || this.cancelled; }

	// The unit has arrived at the last wayPoint; all WP's were defined.
	isInThePast() { return this.isClosed() && this.getEndTime() < Engine.time; }


	canBePartiallyComputed() {}

	isPartiallyComputed() {}

	compute(targetTime) { Report.throw("virtual call"); }


	getStartTime() { return this.startNode.g; }

	getArea() { return this.unit.aI.area; }

	getStartPosition() { return new THREE.Vector3(this.startNode.x, 0, this.startNode.y); }

	getStartPoint() { return this.startNode.getPoint().clone(); }


	getEpisodes() { return this.unit.aI.episodes; }

	getLastTaskEpisode() {
		var lastEpisode = this.getEpisodes().getLast();
		if (lastEpisode && lastEpisode.task === this.task)
			return lastEpisode;
	}


	cancelAt(t = Engine.time + 0.3) { // e.g. AI.forceReplanning(), from UI

//console.error(`CancelAt ${this} t=${t} Engine.time=${Engine.time}`);

		this.cancelled = true;

		// "Cancelled" means:
		//
		// - It counts as "Closed", no more computations or review;
		// - Episode objections are no longer considered (*? AtPile is an exception / can't cancel);
		// - It ends ASAP at the point where immediate transition to Idle is possible;
		// - Next episodes are removed (at upper level)

		this.doCancelAt(t);

		//this.getEpisodes().
	}


	doCancelAt(t) {

		if (this.type == "AtPile")
			return;

		this.removeAllItemListeners();


		if (!this.wayPoints)
			return;

		var i = this.wayPoints.findIndex(wP => wP.g >= t);
		if (i === -1)
			return Report.warn("episode ends after given time", `t=${t} ${this}`);

		if (i === 0) {
			let wP0t = this.wayPoints[0].g;
			if (wP0t > t) {
//console.log(Array.from(this.unit.aI.episodes));
				Report.warn("episode starts after given time", `t=${t} ${this}`);
//AI.stop(); AI.throw();
				return;
			}

			i = 1; // Zero-duration episode (2 WPs): possible
		}

		this.wayPoints.length = i + 1; // remove next WP's

		var	wP0 = this.wayPoints[i - 1],
			wP1 = this.wayPoints[i];

		if (t === wP1.g)
			return;

		console.assert(t < wP1.g && t >= wP0.g);

		// Some WP's can't be cut:
		// - action (consider ability to cut w/ appropriate animation)
		// - (?)has priority

		if (wP1.data.action)
			return;

		//if (wP1.hasPriority())
		//	return;

		if (!wP0.inSameLocation(wP1)) {

			let lambda = Util.clamp((t - wP0.g) / (wP1.g - wP0.g), 0, 1);
			wP1.x = Util.lerp(wP0.x, wP1.x, lambda);
			wP1.y = Util.lerp(wP0.y, wP1.y, lambda);
		}

		wP1.g = t;
		wP1.expanId = undefined;
		wP1.id = this.getNextPtId();
		wP1.addFlags(VGNode.CUT_TRACK);
	}


	addUpWayPoints(wayPoints) {

		var	lastWP = wayPoints[wayPoints.length - 1],
			nextWP = this.wayPoints[0];

		if (lastWP && nextWP && !lastWP.equals(nextWP))
			Report.throw("discontinuity in episode", `e=${this} last=${lastWP} next=${nextWP}`);

		this.wayPoints.forEach((wP, i) => {

			console.assert(i === 0 && wP.isEpisodeStart() || i > 0 && !wP.isEpisodeStart());

			wayPoints.push(wP);
		});
	}


	getEndWayPoint() { return this.wayPoints && this.wayPoints.getLast() || this.startNode; }


	getEndNode() { // for the next episode.

		if (!this.isClosed())
			Report.throw("getEndNode - not closed", `${this}`);

		return this.getEndWayPoint().clone();
	}


	getEndTime() {

		if (!this.isClosed())
			Report.throw("getEndTime - not closed", `${this}`);

		return this.getEndWayPoint().g;
	}


	getTargetFacing() {}

	getTargetData() {}


	onRemove(fn) {
		console.assert(!this._onRemove);
		this._onRemove = fn;
		return this;
	}

	runOnRemove() {
		this.removeAllItemListeners();
		Episode.Targets.clearAll(this);
		this._onRemove && this._onRemove();
	}


	onFinished(fn) {
		console.assert(!this._onFinished);
		this._onFinished = fn;
		return this;
	}

	//
	// Per-episode targets, disappear with episode.
	//
	getTargets(type) {
		if (!type)
			Report.warn("getTargets: no type", `t=${type}`);
		return Episode.Targets.get(this, type); // [] if no targets
	}


	addTarget(type, target) {
		Episode.Targets.add(this, type, target);
		return this;
	}


	propagateTargets() {

		var lastEpisode = this.getLastTaskEpisode();

		Episode.Targets.types.forEach(type =>
			this.propagateTargetsByType_1(type, lastEpisode) );

		return this;
	}


	propagateTargetsByType(type) {
		this.propagateTargetsByType_1(type, this.getLastTaskEpisode());
	}


	propagateTargetsByType_1(type, lastEpisode) {

		var targets;

		if (lastEpisode)
			targets = lastEpisode.getTargets(type);
		else
			targets = this.task.getBaseTargets(type);

		if (!targets)
			Report.warn("no targets", `${this}`);

		targets && targets.forEach(target => this.addTarget(type, target));
	}


	setChainComputeNext(arg = true) { this._chainComputeNext = arg; return this; }

	hasChainComputeNext(arg) { return this._chainComputeNext; }


	getNextPtId() { return VGNodeId.getFreestandingPt(this._nextPtId ++); }


	updateUnitTrackList() { this.unit.aI.updateTrackList(); }

	updateTrackFromWayPoint(wP) { return this.unit.trackList.updateTrackFromWayPoint(wP); }


	// =============================================
	//
	//     Episode Item Listener.
	//
	// * Is intact before episode starts.
	// * Doesn't run if episode's in the past.
	// * Executes one time (& gets removed)
	// * All removed on episode cancel.
	// * All removed on episode removal.
	// * Can be used on any objects w/ EventSource in proto.
	//
	// =============================================

	addItemListener(item, fn) {

		var key = this.id;

		if (!item.hasListener(key))
			this._itemListeners.push(item);

		item.addListener(key, () => {

//console.log(`ItemListener onChangeState ${key} ${item}${this.isInThePast() ? " InThePast" : ""}`);
			if (!this.isInThePast())
				fn();

			this.removeItemListener(item);
		});
	}


	removeItemListener(item) {

		item.removeListener(this.id);
		Util.removeElement(this._itemListeners, item);
	}


	removeAllItemListeners() {

		this._itemListeners.forEach(item => item.removeListener(this.id));
		this._itemListeners.length = 0;
	}


	// ==============================================================

	createNode(priority = true, facing) {

		var node = new VGNode(this.startNode.x, this.startNode.y, this.getNextPtId(), facing);

		node.g = this.startNode.g;
		node.angle = facing !== undefined ? facing : this.startNode.angle;

		node.addWayPointData();
		if (priority)
			node.addFlags(VGNode.PRIORITY);

		node.episodeId = this.id;
		node.expanId = Expansion.nextId ++;

		return node;
	}


	checkAndHandleCollision(node1, node2, notInSameLocation) {

		console.assert((node1 instanceof VGNode) && (node2 instanceof VGNode));

		return PathPlanner.checkAndHandleCollision(this.unit, this.getArea(), node1, node2, notInSameLocation);
	}


	createAndCheckActionNode(endWP, facing, type, refItem) {

		var duration;

		if (typeof type == "number") {
			duration = type;
			type = "";
			console.assert(!refItem);

		} else
			duration = Action.getDuration(type, this.unit, refItem);

		if (facing === undefined)
			facing = endWP.angle;

		if (duration === -1)
			duration = Math.max(0.01, Action.TURN_DURATION / Math.PI * Angle.absDiff(facing, endWP.angle));

		console.assert(endWP.angle !== undefined);
		console.assert(duration > 0);
		console.assert(endWP.g > 0);


		var node = new VGNode(endWP.x, endWP.y, this.getNextPtId(), facing, VGNode.PRIORITY)
			.setG(endWP.g + duration);

		node.episodeId = this.id;
		node.expanId = Expansion.nextId ++;

		node.addWayPointData();
		node.data.action = type;
		node.data.refItem = refItem;

		if (!this.checkAndHandleCollision(endWP, node))
			return;

		return node;
	}


	// ==============================================================

	static byUId(uId) {
		return Object.values(Episode.byId).filter(e => e.unit.id === uId);
	}

}


Episode.nextId = 1;
Episode.byId = {};

Episode.Types = {};


Episode.Targets = {

	types: [ "tree", "log" ],

	_dataByType: {},

	_emptyArray: Object.freeze([]),


	init() {

		this.types.forEach(type => {

			this._dataByType[ type ] = {

				_targetsByEpisode: new Map,
				_episodeByTarget: new Map,
			};
		});
	},


	clearAll(episode) { this.types.forEach(type => this.clearByType(episode, type)); },


	clearByType(episode, type) {

		var data = this._dataByType[ type ];

		var episodeTargets = data._targetsByEpisode.get(episode);
		if (!episodeTargets)
			return;

		episodeTargets.forEach(target => {

			var targetEpisodes = data._episodeByTarget.get(target);

			Util.removeElement(targetEpisodes, episode);

			if (targetEpisodes.length === 0)
				data._episodeByTarget.delete(target);
		});

		data._targetsByEpisode.delete(episode);
	},


	get(episode, type) {

		if (!episode)
			return this._emptyArray;

		var data = this._dataByType[ type ];
		return data._targetsByEpisode.get(episode) || this._emptyArray;
	},


	add(episode, type, target) {

		if (!target)
			return Report.warn("no target", `${episode} type=${type}`);

		var data = this._dataByType[ type ];

		var targetEpisodes = data._episodeByTarget.get(target);

		if (!targetEpisodes) {

			data._episodeByTarget.set(target, targetEpisodes = []);

		} else {

			if (targetEpisodes.indexOf(episode) !== -1)
				return Report.warn("already targeted", `${episode} ${target}`);

			// Won't add target if it's targeted by other unit

			if (episode.unit !== targetEpisodes[0].unit)
				return Report.warn("targeted by other unit",
					`myUId=${episode.unit.id} uId=${targetEpisodes[0].unit.id} ${target}`);
		}

		targetEpisodes.push(episode);


		var episodeTargets = data._targetsByEpisode.get(episode);

		if (!episodeTargets)
			data._targetsByEpisode.set(episode, episodeTargets = []);

		else if (episodeTargets.indexOf(target) !== -1)
			return Report.warn("target already set", `${target} ${episode}`);

		episodeTargets.push(target);
	},


	isAvailable(type, target, unit) {

		if (!target)
			return Report.warn("no target", `t=${type} ${unit}`);

		var data = this._dataByType[ type ];
		var targetEpisodes = data._episodeByTarget.get(target);

		return !targetEpisodes || unit === targetEpisodes[0].unit;
	},


	whoIsTargeting(type, target, unit) {

		var data = this._dataByType[ type ];
		var targetEpisodes = data._episodeByTarget.get(target);

		if (!targetEpisodes)
			return;

		for (let i = 0; i < targetEpisodes.length; i++) {

			let e = targetEpisodes[i];

			if ( !e.isInThePast() && e.unit !== unit )
				return e.unit;
		}
	},


	// ============================
	//
	//     DEBUG
	//
	// ============================

	show(type = "tree") {

		console.log(`type=${type}`);

		var data = this._dataByType[ type ];
		var units = [];

		data._targetsByEpisode.forEach((targets, episode) =>
			units.indexOf(episode.unit) === -1 && units.push(episode.unit) );

		units.sort((a, b) => a.id - b.id);

		units.forEach((unit, i) => {

			var str = `uId:${unit.id}`;
			var task = null;

			data._targetsByEpisode.forEach((targets, episode) => {

				if (unit !== episode.unit)
					return;

				var targetsToString = targets => targets ? targets.map(t => t ? t.id : "null").join(" ") : "";

				if (task !== episode.task) {
					task = episode.task;
					str += `  TASK<${task.id}>:[` + targetsToString(task.getBaseTargets(type)) + "] ";
				}

				str += ` ${episode.id}:[` + targetsToString(targets) + "]";
			});

			console.log(str);
		});
	},

}


Episode.Targets.init();



export { Episode };

