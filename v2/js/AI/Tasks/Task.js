
class Task {

	constructor(unit, type) {

		if (this.constructor.name == "Task")
			Report.throw("abstract constructor");

		console.assert(unit instanceof Unit);
		console.assert(typeof type == "string" && type.startsWith("Task"));

		this.type = type;

		this.id = Task.nextId ++;

		this.unit = unit;

		this.baseTargetsByType = Object.create(null);

		// At current time unit completed task objections (or determined it's impossible).
		//
		// * no more computations even on replanning
		// * reached last wayPoint (?)
		//
		this.taskFinished = false;
		this.objectionsReached = undefined;
		this.status = "";

		this.startT = Engine.time;
		this.finishedT = 0;

		//this.currentStatus = [];
	}


	toString() { return `[${this.type} uId=${this.unit.id}]`; }


	static getType(typeId) { return Task.Type_ByTypeId[ typeId ] || "" }

	static getTypeId(type) { return Task.TypeId_ByType[ type ] }


	toJSON() {

		var type = this.type;

		// Not saved to server
		if (this.type == "TaskThrowInventoryItem" || this.type == "TaskExchangeItemsBaseCenter")
			type = "TaskIdle";

		var taskTypeId = Task.getTypeId(type);

		if (typeof taskTypeId != "number") {

			Report.warn("unknown task type", `t="${type}"`);
			taskTypeId = Task.getTypeId("TaskIdle");
		}

		return { task: taskTypeId };
	}


	getLangDescr() {
		return `${Lang('TaskAbstract')} "${this.type}"`;
	}

/*
	clearObsoleteCurrentStatus(t) {
	}


	setCurrentStatus(t, str, str2) {

		this.clearObsoleteCurrentStatus(t);

		this.currentStatus.push({ t, str, str2 });
	}


	getCurrentStatus(t = Engine.time) {

		var episode = this.getEpisodes().getByTime(t);

		if (episode.currentStatus)
			return episode.currentStatus;

		for (let i = this.currentStatus.length - 1; i >= 0; i--) {

			if ( this.currentStatus[i].t <= t )
				return this.currentStatus[i];
		}
	}
*/

	setStatus(str) {
		this.status = str;
		UI.updateFor(this.unit);
	}


	static fromItemCharData(char) {

		return this.create( char,
			Task.getType(char.charData.task),
			char.charData.taskArg1,
			char.charData.taskArg2
		);
	}


	static create(char, type, arg1, arg2) {

		var task;
		var arg1Item;

		switch (type) {

		default:
			Report.warn("unknown task type", `type="${type}"`);
			// fall through

		case "":
		case "TaskIdle":
			task = new TaskIdle(char);
			break;

		case "TaskCutWood":
			task = new TaskCutWood(char, arg1, arg2);
			break;

		case "TaskCollectLogs":
			task = new TaskCollectLogs(char, arg1);
			break;

		case "TaskDeliverLog":
			task = new TaskDeliverLog(char);
			break;

		case "TaskGrabItem":
			task = new TaskGrabItem(char, arg1);
			break;

		case "TaskMoveTo":
			task = new TaskMoveTo(char, arg1);
			break;

		case "TaskDropCarrying":
			task = new TaskDropCarrying(char, arg1);
			break;

		//case "TaskThrowInventoryItem": // not saved
		//case "TaskExchangeItemsBaseCenter":

		case "TaskMoveToBaseCenter":
			task = new TaskMoveToBaseCenter(char);//, arg1);
			break;


		case "TaskRobotMoveTo":
			task = new TaskRobotMoveTo(char, arg1);
			break;

		case "TaskRobotMoveToBase":
			task = new TaskRobotMoveToBase(char, arg1);
			break;

		case "TaskRobotLoadItem":
			task = new TaskRobotLoadItem(char, arg1);
			break;

		case "TaskRobotUnloadItem":
			task = new TaskRobotUnloadItem(char, arg1, arg2);
			break;

		case "TaskRobotTransport":
			task = new TaskRobotTransport(char);
			break;

		};

		return task;
	}


	getItemFromArg(arg) {

		if (arg instanceof Item)
			return arg;

		return Item.getById(arg, undefined, false);
	}


	getPointFromArg(arg) {

		var p = new Point;

		if (typeof arg == "number") {
			p.setFromUint32(arg);

		} else if (arg instanceof THREE.Vector3) {
			p.copyFromVector3(arg);

		} else if (arg instanceof Point) {
			p.copy(arg);

		} else {
			Report.warn("bad arg", `${arg}`);
			p.copy( this.unit.getPoint() );
		}

		return p;
	}


	getItemFromArg(arg) {

		var item;

		if (typeof arg == "number") {
			item = Item.getById(arg, undefined, false);

		} else if (!arg) {
			return;

		} else if (arg instanceof Item) {
			item = arg;

		} else
			return Report.warn("bad arg", `${arg}`);

		return item;
	}


	getTimerText() { return Util.formatTime(Engine.time - this.startT) }

	isIdle() { return this.type == "TaskIdle"; }

	//onCancel() {}


	isTaskFinished() { return this.taskFinished; }

	isFinished() { return this.taskFinished; }


	setTaskFinishedOK(status = 'task_status_finished') { this._setTaskFinished(status, true) }

	setTaskFinishedFail(status = 'task_status_fail') { this._setTaskFinished(status, false) }


	_setTaskFinished(status, objectionsReached ) {

		console.assert(!this.taskFinished);

		this.taskFinished = true;
		this.objectionsReached = objectionsReached;
		this.finishedT = Engine.time;

		this.setStatus(status);

		UI.updateFor(this.unit);
	}


	getArea() { return this.unit.aI.area; }

	lastEpisode() { return this.unit.aI.episodes.getLast(); }

	getEpisodes() { return this.unit.aI.episodes; }

	getCurrentEpisode() { return this.getEpisodes().getByTime(Engine.time) }


	addEpisode(startNode) { Report.throw("virtual call"); }

	findEpisode(fn) { return this.unit.aI.episodes.find(fn); }

	enqueueStripIdleEpisodes() { this.unit.aI.enqueueStripIdleEpisodes(); }

/*
	registerTarget(type, item) { Main.area.activity.registerTarget(type, item, this.unit.id); }

	clearTarget(type, item) { Main.area.activity.clearTarget(type, item); }

	getTargetedBy(type, item) { return Main.area.activity.getTargetedBy(type, item, this.unit.id); }
*/
	registerAttempt(type, item) { Main.area.activity.registerAttempt(type, item); }

	clearAttempt(type, item) { Main.area.activity.clearAttempt(type, item); }

	checkAvailable(type, item) { return Main.area.activity.checkAvailable(type, item, this.unit.id); }


	//
	// Per-episode targets, disappear with episode.
	//
	isTargetAvailable(type, target) {

		if (!this.checkAvailable(type, target))
			return;

		var result = Episode.Targets.isAvailable(type, target, this.unit);
		//console.log(`uId=${this.unit.id} id=${target.id} res=${result}`);
		return result;
	}


	whoIsTargeting(type, target, unit) {
		return Episode.Targets.whoIsTargeting(type, target, unit);
	}


	getEpisodeTargets(episode, type) {

		if (!episode || episode.task !== this)
			return this.getBaseTargets(type) || [];
		else
			return episode.getTargets(type);
	}


	getTargetsAt(type, t) {
		var episode = this.getEpisodes().getByTime(t || Engine.time);
		return this.getEpisodeTargets(episode, type);
	}

	getLastTargets(type) {
		var episode = this.lastEpisode();
		return this.getEpisodeTargets(episode, type);
	}


	setBaseTarget(type, target) {
		this.baseTargetsByType[ type ] = [ target ];
	}

	getBaseTargets(type) { // <-- when NO EPISODES or TASK CHANGED
		return this.baseTargetsByType[ type ] || [];
	}


	updateTrackFromWayPoint(wP) { return this.unit.trackList.updateTrackFromWayPoint(wP); }

	updateUnitTrackList() { this.unit.aI.updateTrackList(); }



	// =================================================================

	getDestinationLogStorage(carrying, episode, listenerFn) {

		var dst = new DestinationPoints;

		Main.area.logStorages.forEach(logStorage => {

			// TODO (preferrably target best OP by placement height)
			//logStorage.getOperationPoints(this.unit, carrying).forEach(oP => dst.addApproachPoint(oP.aP, oP, penalty));

			if ( !logStorage.baseItem.isAllowedLogThrow() )
				return;

			var oPs = logStorage.getOperationPoints(this.unit, carrying)

			oPs.forEach(oP => dst.addApproachPoint(oP.aP, oP));
		});

		return dst;
	}


	createEpisodeIfRequiresReEquip(startNode) {

		if (!this.unit.isChar())
			return;

		var equipRightHand = this.unit.getRequiresReEquipAt(startNode.g);

		if (!equipRightHand)
			return;


		if (this.unit.getCarryingAt(startNode.g)) {
			Report.warn("bad thing w/ reequip");
			return;
		}

		var episode = new EpisodeInPlaceAction(this, startNode, "Disarm_ReEquip");

		episode.addDisarmAction(equipRightHand);
		episode.propagateTargets();

		return episode;
	}


	createEpisodeIfRequiresTakeoff(startNode, params) {

		if (!this.unit.isRobot())
			return Report.warn("not a robot");

		var isFlying = this.unit.getRobotFlyingAt(startNode.g);

		if (isFlying)
			return;

		var name = this.unit.getRobotLoadedAt(startNode.g) ? "RobotTakeoffLoaded" : "RobotTakeoff";

		var episode = new EpisodeInPlaceAction(this, startNode, name, params);

		episode.addAction( name );
		episode.propagateTargets();

		return episode;
	}


	createEpisodeMoveToEquip(startNode, dst, startEquipItem, refItems) {

		var D_WALK_AXE = 15;

		var episode = new EpisodeMoveToPartial(this, startNode, "MoveToEquip", dst);

		episode.onComputePL1(d => {

			if (startEquipItem) {

				if (d <= D_WALK_AXE)
					return;

				if (d > D_WALK_AXE && startEquipItem)
					episode.addActionAtStart("AxeDisarm", wP => wP.data.eventItem2 = startEquipItem, startEquipItem);
			}

			var axe = this.unit.getEquipAxe();

			episode.addActionAtGoal("StandingEquipAxe", wP => wP.data.eventItem2 = axe, axe);
		})

		// Case where items are defined before episode is computed
		refItems && refItems.forEach(item => {

			console.assert(item instanceof Item);

			episode.addItemListener(item, () =>
				this.unit.aI.forceReplanning()
			);
		});

		return episode;
	}


	createIdle(startNode, params) {
		return new EpisodeIdle(this, startNode, params);
	}


}


Task.nextId = 1;

Task.TypeId_ByType = {

	"TaskIdle": 0,
	"TaskCutWood": 1,
	"TaskCollectLogs": 2,
	"TaskDeliverLog": 3,
	"TaskGrabItem": 4,
	"TaskMoveTo": 5,
	"TaskDropCarrying": 6,
	"TaskThrowInventoryItem": 7,
	"TaskExchangeItemsBaseCenter": 8,
	"TaskMoveToBaseCenter": 9,

	"TaskRobotMoveTo": 30,
	"TaskRobotMoveToBase": 31,
	"TaskRobotLoadItem": 32,
	"TaskRobotUnloadItem": 33,
	"TaskRobotTransport": 34,
};


Task.Type_ByTypeId = ( () => {

	var obj = {};
	for (let [ type, id ] of Object.entries(Task.TypeId_ByType))
		obj[ id ] = type;
	return obj;
})();



export { Task };

