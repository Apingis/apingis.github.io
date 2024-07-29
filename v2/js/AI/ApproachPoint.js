
class ApproachPoint {

	constructor(x, y, facing, distance) {

		this.x = x;
		this.y = y;
		this.facing = facing;
		this.distance = distance;
	}


	toString() {
		return `[ApproachPoint ${Util.toStr(this.x)},${Util.toStr(this.y)}`
			+ ` f=${Util.toStr(this.facing)} d=${Util.toStr(this.distance)}]`;
	}


	set(x, y, facing, d) {

		this.x = x;
		this.y = y;
		this.facing = facing;
		this.distance = d;

		return this;
	}


	setFromPointAngleDistance(p, a, d) {

		this.x = p.x + d * Math.cos(a);
		this.y = p.y + d * Math.sin(a);
		this.facing = Angle.opposite(a);
		this.distance = d;

		return this;
	}


	distanceToVector3(v) { return Util.hypot(this.x - v.x, this.y - v.z) }


	// ============
	//
	//   DEBUG
	//
	// ============

	getGeometry() {

		var	x = this.x,
			y = 0.01,
			z = this.y,
			f = this.facing,
			d = this.distance,
			d1 = 0.15;

		var	c2 = Math.cos(f + Math.PI / 2),
			s2 = Math.sin(f + Math.PI / 2);

		var pos = [ x + d1 * c2, y, z + d1 * s2, x - d1 * c2, y, z - d1 * s2 ];

		var	x1 = x + d * Math.cos(f),
			z1 = z + d * Math.sin(f);

		pos.push(x, y, z, x1, y, z1);

		pos.push(x1, y, z1, x1 + d1 * Math.cos(f + 2.5), y, z1 + d1 * Math.sin(f + 2.5));
		pos.push(x1, y, z1, x1 + d1 * Math.cos(f - 2.5), y, z1 + d1 * Math.sin(f - 2.5));

		return new LineSegmentsGeometry().setPositions( new Float32Array(pos) );
	}


	show(lineMatName = 'approachPoint') {

		var mesh = this._showData.get(this);
		if (mesh) {
			scene.remove(mesh);
			this._showData.delete(this);

		} else {
			var mesh = new THREE.Mesh(this.getGeometry(), Assets.materials.line[lineMatName]);
			//mesh.position.set(this.x, 0, this.y);
			mesh.name = `${this}`;
			scene.add(mesh);
			this._showData.set(this, mesh);
		}

		return this;
	}

}


Object.assign(ApproachPoint.prototype, {

	shapeType: "ApproachPoint",

	//_rect: new Rectangle,
	_showData: new Map
});



export { ApproachPoint };

