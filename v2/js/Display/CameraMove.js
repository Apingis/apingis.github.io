
class CameraMove {

	constructor(cameraView) {

		this.view = cameraView;

		this.isGoing = false;
		this.type = "";

		this.vC = new VisibilityCircle;
		this.tweens = [];
		this.progressNorm = 0;

		this.pL = null;
		this.wayPoints = null;

		this.startTheta = 0;
		this.endTheta = 0;
		this.startHeight = 0;
		this.endHeight = 0;
		this.startPhi = 0;
		this.endPhi = 0;

		this._approachCI = new CircumferenceIntervals;

		//this.lineOfSight = undefined;

		this.params = null;
	}


	cancel() { // from stopFollowing

		this.isGoing = false;
		this.stopAndClearAllTweens();

		this.view.position.y = this.view.zoomSetting.y;
		this.view.phi = this.view.zoomSetting.phi;
	}


	clearMovementData() {

		this.progressNorm = 0;
		this.stopAndClearAllTweens();

		this.startTheta = this.endTheta = this.view._theta;
		this.startHeight = this.endHeight = this.view.position.y;
		this.startPhi = this.endPhi = this.view._phi;
	}


	startMoveToLocation(loc) {

		this.type = "location";
		this.clearMovementData();

		this.endHeight = this.view.zoomSetting.y;
		this.endPhi = this.view.zoomSetting.phi;

		var d = this.view.position.distance2DTo(loc.x, loc.y);

		if (d > CameraMove.DistanceJump)
			return this.jumpUnconditional(loc.x, loc.y, loc.a);


		var dst = new DestinationPoints().add(loc.x, loc.y, loc.a);

		this.startMoveTo(dst);
	}


	restartMove() {

		if (!this.isGoing)
			return;

		this.stopAndClearAllTweens();

		this.startMove( this.params.p, this.params.type, this.params.allowIntervals,
			this.params.targetItem, this.params.noVC, this.params.deltaAngle );
	}


	startMove(p, type, allowIntervals, targetItem, noVC, deltaAngle) {

		this.params = {

			p: p.clone(),
			type,
			allowIntervals: allowIntervals && allowIntervals.clone(),
			targetItem,
			noVC,
			deltaAngle,
		};

		//if (this.isGoing && this.type == "zoom") {
			//console.warn("zoom when moving to location not handled - mb refactor");
			//return;
		//}

		if (this.isGoing && this.type == "zoom") // follow when zoom is running -> still zoom
			type = "zoom";

		this.type = type;
		this.clearMovementData();

		this.endHeight = this.view.zoomSetting.y;
		this.endPhi = this.view.zoomSetting.phi;

		var d = this.view.zoomSetting.d;
		var h = Math.min(this.startHeight, this.endHeight);

		var prohibitIntervals;
		if (allowIntervals)
			prohibitIntervals = allowIntervals.getInverted();

		var itemHeight = targetItem && targetItem.getHeight() || 0.1;

		var getCI = (d, useVC = true) => {

			var cI;

			if (useVC) {

				let vC = this.vC.set(p, targetItem, d, this.endHeight, itemHeight);
				cI = vC.computeCI(prohibitIntervals);

			} else {
				cI = this.getApproachCI(p, d, this.endHeight, prohibitIntervals);
			}

			return cI;
		};


		var cI;

		if (!noVC) {

			cI = getCI(d);

			if (cI.isClear()) {

				cI = getCI(0.8 * d);

				if (Main.DEBUG >= 5)
					Report.warn("vC, getCI(0.8 * d)", `result=${!cI.isClear()}`);
			}
		}

		if (!cI || cI.isClear())
			cI = getCI(d, false);

		if (cI.isClear()) {

			cI = getCI(0.8 * d, false);

			if (Main.DEBUG >= 5)
				Report.warn("noVC, getCI(0.8 * d)", `result=${!cI.isClear()}`);
		}


		if (!cI || cI.isClear()) {

			Report.warn("Unable to position camera", `${p} ${targetItem}`);
			Messages.add(`Unable to position camera`);

			return;
		}


		if (p.distanceToVector3(this.view.position) > CameraMove.DistanceJump) {
			this.jumpTo(cI, deltaAngle);
			return;
		}


		var dst = new DestinationPoints().setDistanceMargin(0.2);

		//dst.addCircumferenceIntervals(cI, null, "camera"); // pts. are close to interval ends.
		dst.addCircumferenceIntervals(cI);

		dst.addOnCircumferenceClosestToPoint(cI, this.view.getPoint());

		this.startMoveTo(dst, deltaAngle);
	}



	startMoveTo(dst, deltaAngle = 0) {

		this.pL = new PathLevel_A_Star({

			radiusClass: 0,
			area: Main.area,
			sectorRadius: CameraMove.DistanceJump + 1,
			level: 0,
			dynamic: false,
			epsilon1: 1.05,
			startPt: this.view.getPoint(),
			height: Math.min(this.startHeight, this.endHeight),
			dst,
			expanCountMax: 1500,
		});

		this.wayPoints = this.pL.computePath();

		if (!this.wayPoints) {
			Report.warn("no path"); // wait until there's a path
			//this.view.stopFollowing(); // TODO consider
			return;
		}

		//if (this.lineOfSight)

		var endWP = this.wayPoints[ this.wayPoints.length - 1 ];

		this.endTheta = dst.getNodeFacing(endWP) + deltaAngle;

		// already at destination (case where height doesn't change)
		if (this.wayPoints === true && this.startHeight === this.endHeight)
			return;


//console.warn(`d=${this.view.zoomSetting.d} result p=${this.wayPoints[this.wayPoints.length - 1]}`);

		var d = PathPlanner.getWayPointsDistance(this.wayPoints);
/* no CI here
		if (d > CameraMove.DistanceJump) {
			this.jumpTo(cI);
			return;
		}
*/
		var time = Math.min(CameraMove.DurationMax, Math.max(

			Math.sqrt(d) * CameraMove.DurationMax / Math.sqrt(CameraMove.DistanceJump),
			Angle.absDiff(this.startTheta, this.endTheta) * (CameraMove.Duration180 / Math.PI),
			Math.sqrt( Math.abs(this.startHeight - this.endHeight) ) * 0.333,
			CameraMove.DurationMin
		) );
//console.log(`t=${time.toFixed(3)} d=${d}`);

		var easingFn = time < CameraMove.DurationMin * 1.5 ? Util.Semicubic : CameraMove.easing;

		time *= Engine.timeMultiplier;

		this.isGoing = true;

		this.tweens.push( new TWEEN.Tween(this)

			.to({ progressNorm: 1 }, 1000 * time)
			.easing( easingFn )
			.onUpdate( () => {

				var t = this.progressNorm;

				this.view.theta = Angle.clerpShort(this.startTheta, this.endTheta, t);
				this.view.position.y = Util.lerp(this.startHeight, this.endHeight, t);
				this.view.phi = Util.lerp(this.startPhi, this.endPhi, t);

				if (Array.isArray(this.wayPoints))
					PathPlanner.setPositionFromWayPoints(this.view.position, this.wayPoints, t);
			})

			.onComplete( () => {

				this.displayElevationMessage();
				this.isGoing = false;
			})
			.start()
		);

	}


	stopAndClearAllTweens() {
		this.tweens.forEach(tween => tween.stop());
		this.tweens.length = 0;
	}


	displayElevationMessage(ifAttempt, ifMin) {

		if (this.type == "follow" || this.type == "location")
			return;

		var msg = `Camera elevation: ${this.view.zoomSetting.y}m`;
		if (ifAttempt)
			msg += ifMin ? " (min)" : " (max)";

		Messages.add(msg, Messages.type.camera);
	}


	startZoomAttemptMove(p) {

		var n = this.view.zoomSettingNum;

		if (this.isGoing) {
			this.displayElevationMessage(true, n === 0);
			return;
		}

		this.type = "zoomAttempt";
		this.clearMovementData();

		this.endHeight = this.view.zoomSetting.y + (n === 0 ? -0.07 : +0.3);
		this.endPhi = this.view.zoomSetting.phi + (n === 0 ? -0.04 : +0.05);

		this.isGoing = true;

		this.tweens.push( new TWEEN.Tween(this)

			.to({ progressNorm: 1 }, Engine.timeMultiplier * 1000 * CameraMove.DurationZoomAttempt1)
			.easing(Util.Semicubic)
			.onUpdate( () => {

				this.view.position.y = Util.lerp(this.startHeight, this.endHeight, this.progressNorm);
				this.view.phi = Util.lerp(this.startPhi, this.endPhi, this.progressNorm);
			})

			.onComplete( () => {

				this.startZoomAttemptMove2();
				this.displayElevationMessage(true, n === 0);
			})
			.start()
		);
	}


	startZoomAttemptMove2() {

		this.progressNorm = 0;

		this.tweens.push( new TWEEN.Tween(this)

			.to({ progressNorm: 1 }, Engine.timeMultiplier * 1000 * CameraMove.DurationZoomAttempt2)
			.easing(Util.Semicubic)
			.onUpdate( () => {

				this.view.position.y = Util.lerp(this.endHeight, this.startHeight, this.progressNorm);
				this.view.phi = Util.lerp(this.endPhi, this.startPhi, this.progressNorm);
			})

			.onComplete( () => {
				this.isGoing = false;
			})
			.start()
		);
	}


	startMoveAttempt() {

		if (this.isGoing)
			return;

		this.type = "moveAttempt";
		this.clearMovementData();

		this.endHeight = this.view.zoomSetting.y - 0.01;
		this.endPhi = this.view.zoomSetting.phi - 0.01;

		this.isGoing = true;

		this.tweens.push( new TWEEN.Tween(this)

			.to({ progressNorm: 1 }, 1000 * CameraMove.DurationZoomAttempt1)
			.easing(Util.Semicubic)
			.onUpdate( () => {

				this.view.position.y = Util.lerp(this.startHeight, this.endHeight, this.progressNorm);
				this.view.phi = Util.lerp(this.startPhi, this.endPhi, this.progressNorm);
			})

			.onComplete( () => {

				this.startMoveAttempt2();
			})
			.start()
		);
	}


	startMoveAttempt2() {

		this.progressNorm = 0;

		this.tweens.push( new TWEEN.Tween(this)

			.to({ progressNorm: 1 }, 1000 * CameraMove.DurationZoomAttempt2)
			.easing(Util.Semicubic)
			.onUpdate( () => {

				this.view.position.y = Util.lerp(this.endHeight, this.startHeight, this.progressNorm);
				this.view.phi = Util.lerp(this.endPhi, this.startPhi, this.progressNorm);
			})

			.onComplete( () => {
				this.isGoing = false;
			})
			.start()
		);
	}



	jumpTo(cI, deltaAngle = 0) {

		var p;

		if (cI.isClear()) {

			Messages.add(`Unable to position camera properly`);
			Report.warn("position camera", `${p}`);
			p = cI.circle.getPoint();

		} else {

			p = cI.getPointOnIntervalClosestToPoint(this.view.getPoint());

			if (!p) { // not guaranteed (TODO why? have interval - have pt. on interval)
				Report.warn("no closest pt. on interval", cI.clone(), this.view.getPoint().clone());
				p = cI.circle.getPoint();
			}
		}

		console.assert(p);

		this.view.position.set(p.x, this.view.zoomSetting.y, p.y);
		this.view.theta = cI.circle.angleFromPoint(p) + deltaAngle;
		this.view.phi = this.view.zoomSetting.phi;
	}


	jumpUnconditional(x, y, facing) {

		this.view.position.set(x, this.view.zoomSetting.y, y);
		this.view.theta = facing;
		this.view.phi = this.view.zoomSetting.phi;
	}


	getApproachCI(p, distance, height, prohibitIntervals) { // no target item - no check for target visibility

		var cI = this._approachCI.set(p.x, p.y, distance);

		Main.area.spatialIndex.addDisjointPolygonsToCircumferenceIntervals(cI, this.cameraHeight);

		if (prohibitIntervals)
			cI.intervals.mergeInIntervals(prohibitIntervals);

		return cI.removeShortIntervals().invertIntervals();
	}


}


Object.assign(CameraMove, {

	DistanceJump: 120,

	DurationMin: 0.5,
	Duration180: 1.1,
	DurationTypical: 0.6,
	DurationMax: 1.5,

	DurationZoomAttempt1: 0.1,
	DurationZoomAttempt2: 0.2,

	easing(x) {

		var tx = 0.2, ty = 0.08;

		var compute = x => {

			return x < tx ? x * x * 2
				: ty + (0.5 - ty) * (x - tx) / (0.5 - tx);
		}

		return x < 0.5 ? compute(x) : 1 - compute(1 - x);
	},

});




export { CameraMove };

