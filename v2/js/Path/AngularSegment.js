
class AngularSegment {

	constructor(angleStart, angleEnd, x0, y0, x1, y1, isStatic = false) {

		this.angleStart = angleStart;
		this.angleEnd = angleEnd;
		this.x0 = x0;
		this.y0 = y0;
		this.x1 = x1;
		this.y1 = y1;
		this.isStatic = isStatic;

		this.trackId = undefined;

		this.track = undefined;
	}


	toString() {
		var staticStr = this.isStatic ? "S" : "D";
		return `[AngularSegment ${staticStr}`
			+ ` ${Util.toStr(this.angleStart)}...${Util.toStr(this.angleEnd)}`;
	}

/*
	is0Segment() {
		return this.x0 === this.x1 && this.y0 === this.y1;
	}
*/

	translateBySector(sector) {

		this.x0 += sector.x;
		this.y0 += sector.y;
		this.x1 += sector.x;
		this.y1 += sector.y;
	}

/*
	distanceFromOrigin(angle) {
		return Line2.distanceIntersectionSweepLineSegment(angle, this.x0,
			this.y0, this.x1, this.y1);
	}
*/

	// > 0 strictly left
	// == 0 on the line
	// < 0 strictly right
	isLeft(x, y) {
		return (this.x1 - this.x0) * (y - this.y0) - (x - this.x0) * (this.y1 - this.y0);
	}

	isVGNodeLeft(p) { return this.isLeft(p.x, p.y); }



	// ======================
	//
	//   Helpers
	//
	// ======================

	getLine2() {
		return new Line2().set(this.x0, this.y0, this.x1, this.y1);
	}


	show(matName = 'angularSegment') {

		var line2 = this._showData.get(this);
		if (line2) {
			line2.show();
			this._showData.delete(this);

		} else {
			line2 = this.getLine2().show(matName);
			this._showData.set(this, line2);
		}

		return this;
	}

}


Object.assign(AngularSegment.prototype, {

	_showData: new Map,
});



export { AngularSegment };

