
class Track {

	constructor(unit, p1 = new Point, p2 = new Point, t1, t2) {

		this.id = Track.nextId ++;

		this.unit = unit;
		this.p1 = p1;
		this.p2 = p2;
		this.t1 = t1;
		this.t2 = t2;
		this.v = new Point;

		this.data = null;
		this.prev = null;
		this.next = null;

		this.setV();

		if (Main.DEBUG >= 5)
			Track.byId[this.id] = this;

		if (Main.DEBUG)
			this.validate();
	}


	validate() {

		if (this.t1 === undefined && this.t2 === undefined) // created empty
			return;

		if ( !(this.unit instanceof Unit) )
			Report.throw("bad unit", `${this}, typeof="${typeof unit}"`);

		if ( !Number.isFinite(this.t1) || this.t1 < 0 || this.t2 < 0 )
			return Report.warn("bad time", `${this} t1=${this.t1} t2=${this.t2}`);

		if (this.t2 <= this.t1) // mb. allow 0-duration?
			return Report.warn("bad time range(t2 <= t1)", `t1=${this.t1} t2=${this.t2}`);

		if (this.t2 != Infinity && !this.isInPlace()) {

			let d = this.p1.distanceToPoint(this.p2),
				t = d / this.unit.getSpeed();

			if (Math.abs(this.t1 + t - this.t2) > 1e-9)
				return Report.warn("time/speed/distance mismatch", `${this.id}`
					+ ` t=${this.t2 - this.t1} s=${this.unit.getSpeed()} d=${d}`);
		}

		return true;
	}


	toString() {

		var locationStr = this.isInPlace() ? `inPlace ${this.p1}` : `${this.p1}->${this.p2}`;
		var idStr = ("id" in this) ? `.byId[${this.id}]` : "";
		var distanceStr = this.isInPlace() ? "" : ` d=${Util.toStr(this.distance())}`;
		var dataStr = "";

		if (this.data) {

			dataStr += ` eId=${this.data.wP.episodeId}`;
			let action = this.data.wP.data.action;
			if (action)
				dataStr += ` action="${action}"`;
		}

		return `[Track${idStr} uId=${this.unit && this.unit.id} ${locationStr}`
			+ ` t1=${Util.toStr(this.t1)} t2=${Util.toStr(this.t2)}`
			+ `${distanceStr}${dataStr}]`;
	}


	clone() {
		return new Track(this.unit, this.p1.clone(), this.p2.clone(), this.t1, this.t2);
	}


	setV() {
		var t = this.t2 - this.t1;
		this.v.set( this.getX() / t || 0, this.getY() / t || 0 );
	}


	set(unit, x1, y1, x2, y2, t1, t2) {

		this.unit = unit;
		this.p1.set(x1, y1);
		this.p2.set(x2, y2);
		this.t1 = t1;
		this.t2 = t2;
		this.setV();
		return this;
	}


	setFromPoints(unit, p1, p2, t1, t2) { this.set(unit, p1.x, p1.y, p2.x, p2.y, t1, t2) }


	setT2(t2) { // preserving speed
		this.t2 = t2;
		this.p2.x = this.p1.x + (t2 - this.t1) * this.v.x;
		this.p2.y = this.p1.y + (t2 - this.t1) * this.v.y;
		return this;
	}


	setInPlace(position, t1, t2) {

		this.p1.copyFromVector3(position);
		this.p2.copyFromVector3(position);
		this.t1 = t1;
		this.t2 = t2;
		this.setV();
		return this;
	}


	isInPlace() { return this.v.x === 0 && this.v.y === 0; }

	isInPlaceInfinite() { return this.t2 == Infinity && this.isInPlace(); }

	getX() { return this.p2.x - this.p1.x; }

	getY() { return this.p2.y - this.p1.y; }


	getRect(rect = this._rect) { // Includes unit radius

		var r = this.unit.getRadius();
		return rect.set(
			Math.min(this.p1.x, this.p2.x) - r, Math.min(this.p1.y, this.p2.y) - r,
			Math.max(this.p1.x, this.p2.x) + r, Math.max(this.p1.y, this.p2.y) + r
		);
	}


	getSegment(segment = this._segment) {
		return segment.set(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
	}


	getCutoffSegment(tMin, tMax, segment = this._segment) {

		if (tMax < this.t1 || tMin > this.t2)
			return;

		var p;

		if (tMin > this.t1) {

			p = this.getPointAtTime(tMin);
			segment.p1.copy(p);
		}

		if (tMax < this.t2) {

			p = this.getPointAtTime(tMax);
			segment.p2.copy(p);
		}

		return segment;
	}


	getCircle(circle = this._circle) {
		return circle.set( this.p1.x, this.p1.y, this.unit.getRadius() );
	}


	distance() { return Util.hypot(this.p2.x - this.p1.x, this.p2.y - this.p1.y); }

	distanceTo(x, y) { // distance Line to (x, y)
		return Math.abs( (this.p2.x - this.p1.x) * y - (this.p2.y - this.p1.y) * x
			- this.p2.x * this.p1.y + this.p2.y * this.p1.x ) / this.distance();
	}

	distanceLineToPoint(p) { return this.distanceTo(p.x, p.y); }

	angle() { return Math.atan2(this.p2.y - this.p1.y, this.p2.x - this.p1.x); }

	oppositeAngle() { return Math.atan2(this.p1.y - this.p2.y, this.p1.x - this.p2.x); }

	// > 0 strictly left
	// == 0 on the line
	// < 0 strictly right
	// p1 == p2: result is 0
	isLeft(x, y) {
		return (this.p2.x - this.p1.x) * (y - this.p1.y)
			- (x - this.p1.x) * (this.p2.y - this.p1.y);
	}

	isPointLeft(p) { return this.isLeft(p.x, p.y); }

	distanceFromPointAtTimeTo(time, x, y) {
		time -= this.t1;
		return Util.hypot(this.p1.x + this.v.x * time - x,
			this.p1.y + this.v.y * time - y);
	}

	distanceFromPointAtTimeToPoint(time, p) {
		return this.distanceFromPointAtTimeTo(time, p.x, p.y);
	}

	// if time < t1, point would be behind p1
	// inPlace track: OK, equals to p1
	pointAtTime(time, p = this._pA) {
		var t = time - this.t1;
		p.x = this.p1.x + this.v.x * t;
		p.y = this.p1.y + this.v.y * t;
		return p;
	}

	pointAtTimeClamped(time, p = this._pA) {
		var t = Util.clamp(time, this.t1, this.t2) - this.t1;
		p.x = this.p1.x + this.v.x * t;
		p.y = this.p1.y + this.v.y * t;
		return p;
	}

	getPointAtTime(time) { // if time < t1, point would be behind p1
		var p = this.p1.clone();
		p.x += this.v.x * (time - this.t1);
		p.y += this.v.y * (time - this.t1);
		return p;
	}


	getCollisionTime(track) {

		var maxT1 = Math.max(this.t1, track.t1),
			minT2 = Math.min(this.t2, track.t2);

		if (maxT1 > minT2) // tracks don't intersect in time
			return;

		var r = this.unit.getRadius() + track.unit.getRadius();


		var processInPlace = (track1, track2) => { // track1 isInPlace

			if (track2.isInPlace()) {

				if (Util.hypotSq(track1.p1.x - track2.p1.x, track1.p1.y - track2.p1.y) < r * r)
					return maxT1;

				return;
			}

			var circle = this._circle.set(track1.p1.x, track1.p1.y, r);

			var roots = track2.getSegment().intersectCircumference(circle);
			if (!roots)
				return;

			var startT = Math.max(0, roots.x1) * (track2.t2 - track2.t1) + track2.t1; // started collision
			if (startT > track1.t2)
				return;

			var endT = Math.min(1, roots.x2) * (track2.t2 - track2.t1) + track2.t1;
			if (endT < track1.t1)
				return;

			return Math.max(startT, track1.t1);
		};

		if (this.isInPlace())
			return processInPlace(this, track);

		if (track.isInPlace())
			return processInPlace(track, this);


		var	vx = this.v.x - track.v.x,
			vy = this.v.y - track.v.y;

		var	p2_1 = track.pointAtTime(this.t1);
		var p = this._pB.copy( this.p1 ).sub(p2_1);

		var a = vx * vx + vy * vy,
			b = 2 * (vx * p.x + vy * p.y),
			c = p.x * p.x + p.y * p.y - r * r;

		if (a === 0) { // units move with equal vector velocity.

			if (p2_1.distanceSqToPoint(p) < r) { // one is inside another one.

				//Report.warn("");
				return maxT1;

			} else
				return;
		}

		var roots = Polynomial.solveQuadraticEqn(a, b, c);

		if (!roots)
			return;

		var	startT = Math.max(maxT1, roots.x1 + this.t1),
			endT = Math.min(minT2, roots.x2 + this.t1);

		if (startT > endT)
			return;

		// bypass at (startT + endT) / 2 because of quadratic error?

		return startT;
	}


	// ==============================================================
	//
	//   Track is the source of data regarding unit movement.
	//
	// ==============================================================

	isCut() {
		return this.data.wP.hasFlags(VGNode.CUT_TRACK);
	}

	getEpisodeId() {
		return this.data.wP.episodeId;
	}

	keyToInPlaceUnitLocation() {
		return this.unit.id + "-" + this.p1.x.toFixed(2) + "," + this.p1.y.toFixed(2);
	}


	addTrackData(wP, prevWP, events) {
		console.assert(!this.data);
		this.data = new TrackData(this, wP, prevWP, events);
		return this;
	}

	updateTrackData() {
		this.data.update();
	}


	getAction() {

		var action = this.data.wP.data.action;

		if (action)
			return action;

		return this.isInPlace() ? "_InPlace" : "_Moving";
	}


	getActionTimeScale() {

		var action = this.getAction();
		var refItem = this.data.wP.data.refItem;

		return this.unit.getActionTimeScale(action, refItem);
	}



	// =========================
	//
	//   DEBUG
	//
	// =========================

	addToGeometry(positions, y = 0.01, delta = 0) {
		positions.push(this.p1.x + delta, y, this.p1.y + delta,
			this.p2.x + delta, y, this.p2.y + delta);
	}


	get showData() {
		var data = this._showData.get(this);
		if (!data) {
			data = {};
			this._showData.set(this, data);
		}
		return data;
	}


	show(matName = 'track') {

		if (this.isInPlace()) {
			this.p1.show(matName, Math.max(0.05, this.unit.getRadius() - 0.05));
			return this;
		}

		var data = this.showData;
		if (data.mesh) {
			scene.remove(data.mesh);
			data.mesh.geometry.dispose();
			this._showData.delete(this);
			return;
		}

		let positions = [];
		this.addToGeometry(positions);
		let g = new LineSegmentsGeometry;
		g.setPositions(positions);

		var mesh = new THREE.Mesh(g, Assets.materials.line[matName]);
		mesh.name = `${this}`;
		scene.add(mesh);
		data.mesh = mesh;
		return this;
	}

}


Object.assign(Track.prototype, {

	shapeType: "Track",
	_rect: new Rectangle,
	_segment: new Line2,
	_pA: new Point,
	_pB: new Point,
	_p1: new Point,
	_p2: new Point,
	_circle: new Circle,
	_showData: new WeakMap
});


Track.nextId = 1;
Track.byId = {};




export { Track };

