
class SpatialContainer {

	constructor() {

		this.minX = Infinity;
		this.minY = Infinity;
		this.maxX = -Infinity;
		this.maxY = -Infinity;
		this.obj = null;
	}


	setFromRBush(rbush) {

		var data = rbush.data;

		this.minX = data.minX;
		this.minY = data.minY;
		this.maxX = data.maxX;
		this.maxY = data.maxY;

		return this;
	}


	setObj(obj) { this.obj = obj; return this }


	setFromRect(rect, obj) {

		if (rect.hasNaN()) {
			Report.warn("bad rect", `${rect} obj=${obj}`);
			rect.clear();
		}

		this.minX = rect.minX;
		this.minY = rect.minY;
		this.maxX = rect.maxX;
		this.maxY = rect.maxY;
		this.obj = obj;

		return this;
	}


	setFromShape(shape) {
		return this.setFromRect(shape.getRect(), shape);
	}


	// if radiusClass not specified - uses radiusClassBase
	setFromItem(item, radiusClass) {

		var polygon = item.getPolygon(radiusClass);

		if (!polygon) {
			Report.warn("no polygon", `${item}`);
			return;
		}

		return this.setFromRect(polygon.getRect(), item);
	}


	enlarge(distance) {

		if (!distance)
			return this;

		this.minX -= distance;
		this.minY -= distance;
		this.maxX += distance;
		this.maxY += distance;

		return this;
	}


	enlargeByRC(radiusClass) { return this.enlarge(Unit.radiusByRC(radiusClass)); }


	getPolygon(radiusClass) {

		if (!this.obj)
			return;

		return (this.obj instanceof CGroup) ? this.obj.getPolygon() : this.obj.getPolygon(radiusClass);
	}


	getHeight() {
		return this.obj.getHeight();
	}

	getRect() {
		return new Rectangle(this.minX, this.minY, this.maxX, this.maxY);
	}


	static setRectFromRBush(rect, rbush) {

		var data = rbush.data;

		return rect.set(data.minX, data.minY, data.maxX, data.maxY);
	}

}




export { SpatialContainer }

