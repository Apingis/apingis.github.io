//
//   Unique identifier of a visibility graph (VG) node
//
// encoded in a positive integer in the format:
//
// ffvvvvtiiiiiiiii
//
// f (*1e14) - flags
// v (*1e10) - vertex index
// t (*1e9) - type (0 - regular item, 1 - cGroup,
//   7 - dynamic pt., 8 - freestanding point, 9 - endpoint)
// i - polygon Id (for regular item it equals to item.id, for cGroup
//   it equals to cGroup.id)
//
class VGNodeId {

	constructor() { return Report.warn("static constructor"); }


	static validate(id) {

		if ( !(id > 0) || Math.floor(id) !== id)
			return Report.warn("bad id", `id=${id}`);

		if (this.isAtStaticVertex(id))
			return this.validateAtStaticVertex(id);

		if (this.isDynamicPt(id))
			return this.validateFlags(id);

		if (this.isFreestandingPt(id) || this.isGoalPt(id))
			return true;

		return Report.warn("bad id", `id=${id}`);
	}



	static validateAtStaticVertex(id) {

		if (!this.polygon(id))
			return;

		var vertexIndex = this.vertexIndex(id);
		if (vertexIndex < 0 || (vertexIndex & 1))
			return Report.warn("bad vertexIndex", `"${vertexIndex}" id=${polygonId}`);

		return this.validateFlags(id);
	}


	static getAtStaticVertex(polygonId, vertexIndex, flags = 0) {
		return polygonId + vertexIndex * 1e10 + flags * 1e14;
	}


	static isAtStaticVertex(id) {

		var type = id % 1e10;
		return type > 0 && type < 2e9;
	}


	static polygon(id, radiusClass = 0) {

		var item = this.getItem(id);
		return item && item.getPolygon(radiusClass);
	}


	static getItem(id) {

		var polygonId = id % 1e10;
		
		if (polygonId > 1e9 && polygonId < 2e9) {

			let cGroup = CGroup.byId[polygonId];
			if (!cGroup) {
				Report.warn("no cGroup", `id=${id} id=${polygonId}`);
				return;
			}

			return cGroup;

		} else if (polygonId > 0 && polygonId < 1e9) {

			let item = Local.get().itemById[polygonId];

			if (!item)
				return Report.warn("no item", `id=${id} id=${polygonId}`);

			return item;

		} else
			return Report.warn("bad id", `id=${polygonId}`);
	}


	static vertexIndex(id) { return Math.floor(id / 1e10) % 1e4; }


	static getPoint(id, radiusClass = 0) {

		var polygon = this.polygon(id, radiusClass);
		if (!polygon)
			return;

		var i = this.vertexIndex(id);

		return new Point(polygon.points[i], polygon.points[i + 1]);
	}


	static getDynamicPt(id, flags = 0) { return 7e9 + id + flags * 1e14; }


	static isDynamicPt(id) {

		id = this.removeFlags(id);
		if (id > 7e9 && id < 8e9)
			return id - 7e9;
	}


	static getFreestandingPt(id) { return 8e9 + id; }


	static isFreestandingPt(id) {

		id = this.removeFlags(id);
		if (id > 8e9 && id < 9e9)
			return id - 8e9;
	}


	static getGoalPt(id) { return 9e9 + id; }


	static isGoalPt(id) {

		id = this.removeFlags(id);
		if (id > 9e9 && id < 10e9)
			return id - 9e9;
	}



	static validateFlags(id) {

		var flags = this.flags(id);

		if (flags === 1 || flags === 2)
			return true;

		return Report.warn("bad flags", `id=${id} f=${flags}`);
	}


	static flags(id) { return Math.floor(id / 1e14); }

	//static removeFlags(id) { return id % 1e14; }
	static removeFlags(id) { return id - Math.floor(id / 1e14) * 1e14; }

	//static compareWithoutFlags(id1, id2) { return id1 % 1e14 - id2 % 1e14; }


	static flagLeftSign(id) {

		var flags = this.flags(id);

		if ((flags & 3) == 1)
			return 1;
		else if ((flags & 3) == 2) // right
			return -1;
		else
			return Report.warn("no flagLeft", `id=${id}`);
	}


	static flipFlagLeft(id) {

		var flags = this.flags(id);
		var newId = this.removeFlags(id);

		if ((flags & 3) == 1)
			return newId + 2 * 1e14;
		else if ((flags & 3) == 2)
			return newId + 1 * 1e14;
		else
			return Report.warn("bad flagLeft", `id=${id} f=${flags & 3}`);
	}


	static flipFlagLeftIfStaticVertex(id) {
		return this.isAtStaticVertex(id) ? this.flipFlagLeft(id) : id;
	}
}



export { VGNodeId };

