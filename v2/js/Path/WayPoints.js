
class WayPoints extends Array {

	constructor() {

		super();

		this._distance = undefined;
	}


	toString() {
		return `[WayPoints N=${this.length} endG=${Util.toStr(this.getEndG())}]`;
	}

/*
parent, G
	cloneDeep() {

		var wayPoints = new WayPoints;

		for (let i = 0; i < this.length; i++)
			wayPoints[i] = this[i].clone();

		return wayPoints;
	}
*/

	getLast() { return this[this.length - 1]; }

	getEndG() { return this.getLast().g; }


	add(...args) {
		super.push.apply(this, args);
		return this;
	}


	distance() {

		if (this._distance === undefined) {

			this._distance = 0;

			for (let i = 0; i < this.length - 1; i++)
				this._distance += this[i].distanceToVGNode(this[i + 1]);
		}

		return this._distance;
	}


	show() {

		var data = this._showData.get(this);

		if (data) {

			data.lines.forEach(l => l.show());

			this.forEach(wP => wP.show());

			this._showData.delete(this);
			return;
		}

		data = { lines: [], points: [] };

		for (let i = 0; i < this.length - 1; i++) {

			if (this[i].inSameLocation(this[i + 1]))
				return;

			var line = new Line2(
				this[i].getPoint().clone(), this[i + 1].getPoint().clone()
			).show('wayPoint');

			data.lines.push(line);
		}

		//this.forEach(wP => { console.log(wP); wP.show(); });
		this.forEach(wP => { wP.show(); });

		this._showData.set(this, data);
		return this;
	}
}


WayPoints.prototype._showData = new Map;



export { WayPoints };

