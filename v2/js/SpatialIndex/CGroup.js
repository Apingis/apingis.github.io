
/*
 *   Collision Group
 *
 * - Is a set of static items.
 * - For any 2 items I1, I2 in the same collision group, unit can't pass between items.
 *   (cross the segment I1center - I2center).
 * - The converse holds true: if items I1 and I2 are not in the same
 *   collision group, a unit can pass between the items.
 *
 * - Operated from SpatialIndex
 *
 */
class CGroup {

	constructor(radiusClass) {

		if (Unit.ItemCGroupIds[radiusClass] === undefined)
			Report.throw("no CGroup creation", `radiusClass=${radiusClass}`);

		this.radiusClass = radiusClass;
		this.items = [];

		this.id = CGroup.nextId ++;
		CGroup.byId[this.id] = this;

		this._pointSet = null;
		this._spatialContainer = null;
		this._convexHull = null;
		this._polygon = null;

		this.inIndex = false;
	}


	static getById(id) {

		//if ( !(id > 0) )
		//	Report.throw("bad id", `${id}`);

		return CGroup.byId[id];
	}


	removeFromIndex() {

		if (this.inIndex !== true)
			return;

		console.assert(this._spatialContainer);

		Main.area.spatialIndex.removeCGroup(this);
		this.inIndex = false;
	}


	remove() {
		console.assert(!this.items || this.items.length === 0);

		this.removeFromIndex();
		delete CGroup.byId[this.id];
	}


	setRequireUpdate() {

		this.removeFromIndex();

		this._pointSet = null;
		this._spatialContainer = null;
		this._convexHull = null;
		this._polygon = null;

		CGroup.requireUpdate.add(this);
	}


	addItem(item) {

		if (item.getCGroupId(this.radiusClass)) {
			Report.warn("item already has group", `item=${item} cGroupIds=${item.cGroupIds}`
				+ ` id=${this.id} radiusClass=${this.radiusClass}`);
			return;
		}

		item.addCGroupId(this.radiusClass, this.id);

		this.items.push(item);
		this.setRequireUpdate();
	}


	removeItem(item) {

		if (!item.getCGroupId(this.radiusClass)) {
			Report.warn("attempt to remove group", `item=${item} cGroupIds=${item.cGroupIds}`
				+ ` id=${this.id} radiusClass=${this.radiusClass}`);
			return;
		}

		item.removeCGroupId(this.radiusClass);

		var i = this.items.indexOf(item);
		if (i == -1)
			Report.throw("Item is missing", `id=${this.id} item=${item}`);

		Util.cut(this.items, i);

		this.setRequireUpdate();

		if (this.items.length === 0)
			this.remove();
	}


	removeAllItems() {

		var items = this.items;
		this.items = null;
		this.remove();

		items.forEach(item => item.removeCGroupId(this.radiusClass));
		return items;
	}


	mergeCGroup(id) {
		//console.log(`mergeCGroup ${this.id} <- ${id}`);

		var group2 = CGroup.getById(id);

		if ( !(id > 0 && id != this.id && group2 && group2.radiusClass == this.radiusClass) )
			Report.throw("bad cGroup", `id=${id} this.id=${this.id}`);

		group2.items.forEach(item => item.addCGroupId(this.radiusClass, this.id));

		Array.prototype.push.apply(this.items, group2.items);
		this.setRequireUpdate();

		group2.items.length = 0;
		group2.remove();
	}


	getHeight() {
		return this.getPointSet().height;
	}

	getRadius() {
		return this.getBoundingCircle().radius;
	}

	getBoundingCircle() {
		//return this.getConvexHull().getBoundingCircle();
		return this.getPointSet().getBoundingCircle();
	}

	getPointSet() {

		if (this._pointSet)
			return this._pointSet;

		var polygons = this.items.map(item => item.getPolygon(this.radiusClass));

		return (this._pointSet = Polygon.mergePointSets(polygons) );
	}


	getSpatialContainer() {
		return (this._spatialContainer || (this._spatialContainer = new SpatialContainer()
			.setFromRect(this.getPointSet().getRect(), this) )
		);
	}

	getConvexHull() {
console.error(`getConvexHull()`);
		return this._convexHull
			|| (this._convexHull = this.getPointSet().getConvexHull() );
	}


	getPolygon() {

		if (this._polygon)
			return this._polygon;

		var polygons = this.items.map(item => item.getPolygon(this.radiusClass));

		var polygonUnion = Polygon.union(polygons);
		polygonUnion.id = this.id;

		return (this._polygon = polygonUnion);
	}


	update() {

		if (this.inIndex !== false)
			Report.throw("in index", `id=${this.id}`);

		if (!this.items || this.items.length === 0)
			return;

		Main.area.spatialIndex.insertCGroup(this);
		this.inIndex = true;
	}


	static updateAll() { // call before path planning!

		for (let cGroup of this.requireUpdate)
			cGroup.update();

		this.requireUpdate.clear();
	}


	static clearAll() {

		CGroup.nextId = 1e9 + 1;
		CGroup.byId = {};
		CGroup.requireUpdate.clear();
	}


	static get(id) { return CGroup.byId[id] }



	// =======================
	//
	//   DEBUG
	//
	// =======================

	show() {

		var matName = this.radiusClass === 1 ? 'cGroupRC1'
			:'cGroup';

		this.getPolygon().show(matName, 0.0125);
	}


	showTurnOff() { this.getPolygon().showTurnOff() }

	static show() { Object.values(CGroup.byId).forEach( cGroup => cGroup.show() ) }

/*
	static showTurnOff() {

		Object.values(CGroup.byId).forEach( cGroup => cGroup.showTurnOff() );
		Util.filterInPlace(scene.children, mesh => ! mesh.name.startsWith("[Polygon") ); // TODO other polygons affected!
	}
*/
}

// TODO per-area?
CGroup.nextId = 1e9 + 1;
CGroup.byId = {};
CGroup.requireUpdate = new Set;




export { CGroup };

