
class Action {

	constructor() { Report.throw("static constructor"); }


	static getEventCount(type) {

		if (!type)
			return 0;

		var data = Action.DataByType[type];

		return data && data.e && data.e.length || 0;
	}


	static getEventType(type, n = 0) {
		return type + (n === 0 ? "" : "_" + n);
	}

	// Event time - offset from the start of the action.

	static getEventT_noTimeScale(type, n = 0) {

		if (!type)
			return;

		var data = Action.DataByType[type];
		var t = data && data.e && data.e[n];

		return t;
	}


	static getEventT(type, unit, n = 0, refItem) {

		if (!type)
			return;

		return Action.getEventT_noTimeScale(type, n)
			/ unit.getActionTimeScale(type, refItem);
	}


	// excludes eventless Standing / Walking; see clipDurationByType()

	static getDuration(type, unit, refItem) {

		//var t = Action.DurationByType[type];

		var t;

		if (type.startsWith("Robot")) {
			t = RobotDisplay.getAnimationClips()[ type ].duration;

		} else
			t = Action.DurationByType[type];

		t /= unit.getActionTimeScale(type, refItem);

		if ( !(t > 0) ) {
			Report.warn("no action time", `type="${type}"`);
			t = 0.1;
		}

		return t;
	}


	static createRawEvent(type, unit, time, item2, target, eventFn, beforeEventFn) {

		if (!Number.isFinite(time) || time < Engine.time) {

			Report.warn("bad time", `t=${time} Engine.time=${Engine.time} type=${type}`
				+ ` uId=${unit.id} item2.id=${this.item2 && this.item2.id}`);
			return;
		}

//console.log(`createRawEvent ${time} ${type} | now=${Engine.time}`);
		return new ItemEvent(unit, type, time, item2, target, eventFn, beforeEventFn);
	}


	static createWayPointEvent(n, track, wP) {

		var getProp = (propName, i) => {
			var prop = wP.data[propName];
			return Array.isArray(prop) ? prop[i] : prop;
		};

		var eventType = this.getEventType(wP.data.action, n);

		if (!eventType)
			Report.throw("no eventType", `${track} n=${n}`);


		var t = track.t1 + this.getEventT(wP.data.action, track.unit, n, wP.data.refItem);

		if (t < Engine.time)
			return Report.warn("bad WP event time", `t=${t} Engine.time=${Engine.time} type=${eventType}`);

		if (t > track.t2)
			return Report.warn("event time > track.t2", `t=${t} Engine.time=${Engine.time} type=${eventType}`);


		return Action.createRawEvent(eventType, track.unit, t,
			getProp("eventItem2", n), getProp("eventTarget", n),
			getProp("eventFn", n), getProp("beforeEventFn", n)
		);
	}


	// ==============================================
	//
	//   This is used for animation.
	//
	// ==============================================

	static hasContinuousAnimation(type) {
		return type == "_InPlace" || type == "_Moving";
	}


	static clipNameByType(type, unit) {

		if (type[0] !== '_')
			return type;

		if (type == '_InPlace') {

			if (unit.isRobot()) {

				if (unit.isRobotFlying())
					return unit.isRobotLoaded() ? 'RobotFlyingInPlaceLoaded' : 'RobotFlyingInPlace';

				return unit.isRobotLoaded() ? 'RobotStandingLoaded' : 'RobotStanding';
			}

			return unit.charData.carryId ? 'StandingCarrying' :
				unit.getEquipRightHand() ? 'StandingAxe' : 'Standing';
		}

		if (type == '_Moving') {

			if (unit.isRobot()) {
				return unit.isRobotLoaded() ? 'RobotFlyingLoaded' : 'RobotFlying';
			}

			return unit.charData.carryId ? 'WalkingCarrying' :
				unit.getEquipRightHand() ? 'WalkingAxe' : 'Walking';
		}
	}


	static clipAction(type, unit) {

		var name = Action.clipNameByType(type, unit);
//console.error(`action name=${name}`);
		var clipAction = unit.display.clipActions[name];
		if (!clipAction)
			Report.throw("no clipAction", name);

		return clipAction;
	}

}


Action.TURN_DURATION = 0.35;
Action.TURN_DURATION_ROBOT = 1.5;


Action.DataByType = {

	"Standing": {},
	"StandingEquipAxe": { e: [ 0.967 ] },

	"Walking": {},

	"Lifting2H": { e: [ 1.200 ] },
	"DropFwd": { e: [ 0.5 ] },
	"ThrowLeft90": { e: [ 0.467 ] },
	"ThrowLeft45": { e: [ 0.567 ] },
	"ThrowRight90": { e: [ 0.467 ] },
	"ThrowRight45": { e: [ 0.567 ] },

	"GetThrowAxe": { e: [ 0.967, 2.200 ] },
	"StandingAxeThrow": { e: [ 0.766 ] },
	"PickUpAxe": { e: [ 1.233, 3.0 ] },
	"PickUpAxeThrow": { e: [ 1.233, 3.066 ] },
	"PutAxeBase": { e: [ 0.933, 2.467 ] },
	"GetAxeFromBase": { e: [ 1.667, 3.900 ] },

	"AxeDownward": { e: [ 0.967 ] },
	"AxeHorizontal": { e: [ 0.867 ] },
	"AxeHorizontalStump": { e: [ 0.900 ] },
	"AxeDisarm": { e: [ 0.933 ] },


	"RobotStanding": {},
	"RobotFlying": {},

	"RobotTakeoff": { e: [ 0.5 ] },
	"RobotTakeoffLoaded": { e: [ 0.5 ] },
	"RobotTouchdown": { e: [ 0.5 ] },
	"RobotTouchdownLoaded": { e: [ 0.5 ] },

	"RobotLoad": { e: [ 10.0 ] },
	"RobotUnload": { e: [ 10.0 ] },

};

//===================================================
//
// Auto-generated: CharDisplay.getClipSummary()
//
Action.DurationByType = {

	Standing:            6.033,
	StandingCarrying:    10.000,
	StandingAxe:         1.833,
	StandingEquipAxe:    1.767,
	Walking:             1.167,
	WalkingCarrying:     1.773,
	WalkingAxe:          0.894,
	Lifting2H:           2.100,
	DropFwd:             1.500,
	ThrowLeft90:         0.967,
	ThrowLeft45:         0.967,
	GetThrowAxe:         2.967,
	StandingAxeThrow:    1.667,
	PickUpAxe:           3.633,
	PickUpAxeThrow:      3.633,
	PutAxeBase:          3.700,
	GetAxeFromBase:      4.800,
	AxeDownward:         1.867,
	AxeHorizontal:       1.967,
	AxeHorizontalStump:  1.500,
	AxeDisarm:           1.667,
}

//===================================================
//
// Auto-generated: RobotDisplay.getClipSummary()
//
/*
Object.assign(Action.DurationByType, {

	RobotStanding:       1.000,
	RobotStandingLoaded: 1.000,
	RobotFlying:         5.000,
	RobotFlyingLoaded:   5.000,
	RobotTakeoff:        2.500,
	RobotTakeoffLoaded:  2.500,
	RobotTouchdown:      1.667,
	RobotTouchdownLoaded:1.667,
	RobotUnload:         11.333,
	RobotLoad:           8.867,
});
*/



export { Action };

