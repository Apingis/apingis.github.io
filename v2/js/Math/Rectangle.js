
class Rectangle {

	constructor(minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity) {

		this.minX = minX;
		this.minY = minY;
		this.maxX = maxX;
		this.maxY = maxY;
	}


	toString() {
		var str = `[Rectangle `;
		str += this.isEmpty()
			? `Empty]`
			: (`${Util.toStr(this.minX)},${Util.toStr(this.minY)}`
				+ ` ${Util.toStr(this.maxX)},${Util.toStr(this.maxY)}]`
			);
		return str;
	}


	static fromJSON(data) {
		return new Rectangle(data.minX, data.minY, data.maxX, data.maxY);
	}


	hasNaN() {
		return this.minX !== this.minX || this.minY !== this.minY
			|| this.maxX !== this.maxX || this.maxY !== this.maxY;
	}

/*
	get width() { console.err(`rect.width`);return this.maxX - this.minX; }
	get height() { console.err(`rect.height`);return this.maxY - this.minY; }
*/
	get width() { return this.maxX - this.minX }
	get height() { return this.maxY - this.minY }

	getWidth() { return this.maxX - this.minX }

	getHeight() { return this.maxY - this.minY }

	area() { return (this.maxX - this.minX) * (this.maxY - this.minY); }


	isEmpty() { return !(this.maxX >= this.minX && this.maxY >= this.minY) }

	centerX() { return (this.minX + this.maxX) / 2; }

	centerY() { return (this.minY + this.maxY) / 2; }

	getCenterX() { return (this.minX + this.maxX) * 0.5 }

	getCenterY() { return (this.minY + this.maxY) * 0.5 }


	clone() { return new Rectangle(this.minX, this.minY, this.maxX, this.maxY); }

	getRect(rect = this._rect) {
		return rect.set(this.minX, this.minY, this.maxX, this.maxY);
	}


	clear() {
		this.minX = this.minY = Infinity;
		this.maxX = this.maxY = -Infinity;
		return this;
	}

	set(minX, minY, maxX, maxY) {
		this.minX = minX;
		this.minY = minY;
		this.maxX = maxX;
		this.maxY = maxY;
		return this;
	}

	copy(rect) {
		this.minX = rect.minX;
		this.minY = rect.minY;
		this.maxX = rect.maxX;
		this.maxY = rect.maxY;
		return this;
	}

	translate(x, y) {
		this.minX += x;
		this.minY += y;
		this.maxX += x;
		this.maxY += y;
		return this;
	}

	contains(x, y) {
		return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
	}

	containsPoint(p) { return this.contains(p.x, p.y); }

	containsDelta(x, y, delta) { // delta > 0: rect expands outside
		return x >= this.minX - delta && x <= this.maxX + delta
			&& y >= this.minY - delta && y <= this.maxY + delta;
	}

	overlapsCircle(circle) {
		return this.distanceBorderTo(circle.x, circle.y) <= circle.radius;
	}

	overlapsRectangle(rect) {
		return this.minX <= rect.maxX && this.maxX >= rect.minX
			&& this.minY <= rect.maxY && this.maxY >= rect.minY;
	}


	expandByCoords(x, y) {

		this.minX = Math.min(this.minX, x);
		this.minY = Math.min(this.minY, y);
		this.maxX = Math.max(this.maxX, x);
		this.maxY = Math.max(this.maxY, y);
		return this;
	}


	expand(minX, minY, maxX, maxY) {

		this.minX = Math.min(this.minX, minX);
		this.minY = Math.min(this.minY, minY);
		this.maxX = Math.max(this.maxX, maxX);
		this.maxY = Math.max(this.maxY, maxY);
		return this;
	}


	expandByRotation() { // Rotation around origin

		var r = Util.hypot(
			Math.max(-this.minX, this.maxX),
			Math.max(-this.minY, this.maxY)
		);

		this.minX = -r;
		this.minY = -r;
		this.maxX = r;
		this.maxY = r;
		return this;
	}


	expandBySphere(sphere) {

		var x = sphere.center.x,
			y = sphere.center.z,
			r = sphere.radius;

		this.minX = Math.min(this.minX, x - r);
		this.minY = Math.min(this.minY, y - r);
		this.maxX = Math.max(this.maxX, x + r);
		this.maxY = Math.max(this.maxY, y + r);
		return this;
	}


	expandByBox3(box) {

		this.minX = Math.min(this.minX, box.min.x);
		this.minY = Math.min(this.minY, box.min.z);
		this.maxX = Math.max(this.maxX, box.max.x);
		this.maxY = Math.max(this.maxY, box.max.z);
		return this;
	}


	expandByVector3(v) {

		this.minX = Math.min(this.minX, v.x);
		this.minY = Math.min(this.minY, v.z);
		this.maxX = Math.max(this.maxX, v.x);
		this.maxY = Math.max(this.maxY, v.z);
		return this;
	}


	expandByRect(rect) {

		this.minX = Math.min(this.minX, rect.minX);
		this.minY = Math.min(this.minY, rect.minY);
		this.maxX = Math.max(this.maxX, rect.maxX);
		this.maxY = Math.max(this.maxY, rect.maxY);
		return this;
	}

/* good, unused
	expandByRect(rect) { // Return true if it changes

		var updated;

		if (rect.minX < this.minX) {
			this.minX = rect.minX; updated = true;
		}
		if (rect.minY < this.minY) {
			this.minY = rect.minY; updated = true;
		}
		if (rect.maxX > this.maxX) {
			this.maxX = rect.maxX; updated = true;
		}
		if (rect.maxY > this.maxY) {
			this.maxY = rect.maxY; updated = true;
		}

		return updated;
	}


	expandByPoint(p) { // Return true if it changes

		var updated;

		if (p.x < this.minX) {
			this.minX = p.x; updated = true;
		}
		if (p.x > this.maxX) {
			this.maxX = p.x; updated = true;
		}
		if (p.y < this.minY) {
			this.minY = p.y; updated = true;
		}
		if (p.y > this.maxY) {
			this.maxY = p.y; updated = true;
		}

		return updated;
	}


	expandByLine2(line2) {
		this.expandByPoint(line2.p1);
		this.expandByPoint(line2.p2);
	}
*/
	//
	// Is given rect wholly inside this?
	// delta > 0: 'this' expands outside
	//
	isRectWhollyInside(rect, delta = 0) {

		return rect.minX >= this.minX - delta && rect.minY >= this.minY - delta
			&& rect.maxX <= this.maxX + delta && rect.maxY <= this.maxY + delta;
	}


	outCode(x, y) {
		const LEFT = 1, RIGHT = 2, TOP = 4, BOTTOM = 8;

		var code = x < this.minX ? LEFT : x > this.maxX ? RIGHT : 0;
		code |= y < this.minY ? BOTTOM : y > this.maxY ? TOP : 0;

		return code;
	}


	distanceBorderTo(x, y) { // Returns 0 if it's inside or on the border

		var dx = x < this.minX ? this.minX - x :
				x > this.maxX ? x - this.maxX : 0;

		var dy = y < this.minY ? this.minY - y :
				y > this.maxY ? y - this.maxY : 0;

		return dx === 0 ? dy : dy === 0 ? dx : Util.hypot(dx, dy);
	}


	// If (x, y) is inside of the rect or on border - angle from the center
	// If outside - angle from the nearest position on border
	angleCenterOrBorderTo(x, y) {

		var dx = x < this.minX ? x - this.minX :
				x > this.maxX ? x - this.maxX : 0;

		var dy = y < this.minY ? y - this.minY :
				y > this.maxY ? y - this.maxY : 0;

		if (dx === 0 && dy === 0) {
			dx = x - (this.maxX - this.minX) / 2;
			dy = y - (this.maxY - this.minY) / 2;
		}

		return Math.atan2(dy, dx);
	}


	enlarge(d) {
		this.minX -= d;
		this.minY -= d;
		this.maxX += d;
		this.maxY += d;
		return this;
	}


	clampPoint(p, delta = 0) {
		p.x = Util.clamp(p.x, this.minX - delta, this.maxX + delta);
		p.y = Util.clamp(p.y, this.minY - delta, this.maxY + delta);
	}


	// =====================================
	//
	//   DEBUG
	//
	// =====================================

	show(matName = 'rect') {

		var polygon = this._showData.get(this);

		if (polygon) {
			polygon.show();
			this._showData.delete(this);
			return;
		}

		if (this.isEmpty()) {
			Report.warn("empty rect", `${this}`);
			return this;
		}

		polygon = Polygon.fromRectangle(this).show(matName);

		this._showData.set(this, polygon);
		return this;
	}
}



Object.assign(Rectangle.prototype, {

	shapeType: "Rectangle",
	_rect: new Rectangle,
	_showData: new WeakMap
});



class RectangleProjection {

	constructor(rectFrom, rectTo) {

		this.ratioX = rectTo.width / rectFrom.width;
		this.minXFrom = rectFrom.minX;
		this.minXTo = rectTo.minX;

		this.ratioY = rectTo.height / rectFrom.height;
		this.minYFrom = rectFrom.minY;
		this.minYTo = rectTo.minY;
	}

	projectX(x) { return (x - this.minXFrom) * this.ratioX + this.minXTo; }

	projectY(y) { return (y - this.minYFrom) * this.ratioY + this.minYTo; }

	projectPoint(p, target) {
		target.x = this.projectX(p.x);
		target.y = this.projectY(p.y);
		return target;
	}
}



export { Rectangle, RectangleProjection };

