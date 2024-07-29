

class ApproximationInterval {

	constructor(i) {

		this.i = i;
		this.theta = null;
		this.p = new Point;

		this.type = '';
		this.v = new Point;
		this.c = new Circle;
		this.circularAngle = null;
		this.intervalL = null;
		this.Ltotal = null;
		this.normalAngle = null;
		this.prevNormalAngle = null;
	}

	get L() { console.error(`get L`) }
}



class CurveApproximation {

	constructor(n, angle0, angle1, arg = {}) {

		console.assert(angle1 > angle0);

		this.type = '';
		this.n = n || this.getDefaultN();
		this.angle0 = angle0;
		this.angle1 = angle1;

		this.arg = arg;
		//this.fnGetPointByAngle = fnGetPointByAngle;
		//this.fnGetNormalAngleInPoint = fnGetNormalAngleInPoint;

		this.intervals = new Array(this.n).fill(null);

		this.intervals.forEach( (el, i, arr) => arr[i] = new ApproximationInterval(i) );

		this.L = null;
		this.avgIntervalL = null;
		this.relDeviation = null;
		this.finingIters = null;

		this._dataBlock = null;
	}

	get intervalL() { console.error(`get intervalL`) }
	get fnGetPointByAngle() { console.error(`get fnGetPointByAngle`) }

// integrate sqrt((k cos t)^2 + (k sin t)^2) from t=0 to 1 where k=1
// 1.0* integrate sqrt(((|cos t|^3 + |2 sin t|^3)^(-1/3) cos t)^2 + ((|cos t|^3 + |2 sin t|^3)^(-1/3) sin t)^2) from t=0 to 1

// 1.0* integrate sqrt(((|(cos t)/2|^3 + |sin t|^3)^(-1/3) cos t)^2 + ((|(cos t)/2|^3 + |sin t|^3)^(-1/3) sin t)^2) from t=0 to pi/2 <-- WRONG

	toString() {
		return `<CurveApproximation ${this.arg.name}${this.type ? ' '+this.type : ''}`
			+ ` n=${this.n} L=${this.L}>`;
	}


	getLength() { return this.L }


	setupEquidistant(targetRelDeviation = CurveApproximation.DEFAULT_REL_DEVIATION) {

		console.assert(this.finingIters === null);

		this._setEquiangular();

		var lastRelDeviation = Infinity;
		var i;
		var ITERS_MAX = 10;

		for (i = 1; i < ITERS_MAX; i++) {

			this._setEquidistant();
			this.finingIters = i;

			if (this.relDeviation < targetRelDeviation)
				break;

			if (lastRelDeviation < this.relDeviation) {

				Report.warn("relDeviation degrades", `${this} i=${i}`
					+ ` ${this.relDeviation.toExponential(2)}`
					+ ` last=${lastRelDeviation.toExponential(2)}`);
				break;
			}

			lastRelDeviation = this.relDeviation;
		}

		if (i >= ITERS_MAX)
			Report.warn("targetRelDeviation not achieved", `${this} i=${i}`
				+ ` ${this.relDeviation.toExponential(2)}`
				+ ` target=${targetRelDeviation.toExponential(2)}`);

		this.computeNormals();

		this.type = 'equidistant';

		return this;
	}


	_setEquidistant(sourceApprox = this) {

		console.assert(sourceApprox instanceof CurveApproximation);
		console.assert(typeof sourceApprox.intervals[1].Ltotal == 'number');

		return this._setFromAngles( sourceApprox.getEquidistantAngles() );
	}


	_setEquiangular() {

		var angles = [ this.angle0 ];

		for (let i = 1; i < this.n - 1; i++)
			angles.push( this.angle0 + (this.angle1 - this.angle0) * i / (this.n - 1) );

		angles.push( this.angle1 );

		this._setFromAngles(angles);
		this.type = 'equiangular';

		return this;
	}


	_setFromAngles(angles) {

		if ( angles.length !== this.n
				|| angles[0] !== this.angle0 || angles[this.n - 1] !== this.angle1 )

			Report.warn("bad angles", `${this} ${angles.length}/${this.n}`);

		var intervalLMin = Infinity, intervalLMax = -Infinity;

		this.intervals.forEach( (entry, i, arr) => {

			entry.theta = angles[i];
			entry.p.copy( this.arg.fnGetPointByAngle(entry.theta) );

			if (i === 0) {
				entry.Ltotal = 0;
				return;
			}

			var pMiddle = this.arg.fnGetPointByAngle( (arr[i - 1].theta + entry.theta) / 2 );
			var pPrev = arr[i - 1].p;

			var perpProduct = (entry.p.x - pPrev.x) * (pMiddle.y - pPrev.y)
				- (entry.p.y - pPrev.y) * (pMiddle.x - pPrev.x);

			var circleOK = perpProduct < 0
				&& entry.c.setFrom3Points(pPrev, pMiddle, entry.p);

			if (!circleOK || entry.c.radius > 1e+7) {

				entry.type = 'linear';
				entry.circularAngle = null;
				entry.c.set(0, 0, -1);

				entry.v.copy( entry.p ).sub( pPrev ).normalize();
				entry.intervalL = entry.p.distanceToPoint( pPrev );
	
			} else {

				entry.type = 'circular';
				entry.circularAngle = entry.c.angleToPoint(entry.p);

				entry.intervalL = entry.c.radius
					* ( entry.circularAngle - entry.c.angleToPoint(pPrev) );
			}

			if (entry.intervalL <= 0 || entry.intervalL > 1000)
				Report.warn(`entry.intervalL=${entry.intervalL} finingIters=${this.finingIters}`, entry);

			intervalLMin = Math.min(intervalLMin, entry.intervalL);
			intervalLMax = Math.max(intervalLMax, entry.intervalL);

			entry.Ltotal = arr[i - 1].Ltotal + entry.intervalL;
		});


		this.L = this.intervals[ this.n - 1 ].Ltotal;
		this.avgIntervalL = this.L / (this.n - 1);

		this.relDeviation = Math.max(

			Math.abs(this.avgIntervalL - intervalLMin),
			Math.abs(intervalLMax - this.avgIntervalL)

		) / this.avgIntervalL;

		return this;
	}


	getEntryByLength(L) { // not equidistant; from angle0

		if (L === 0)
			return this.intervals[1];

		var i = Util.bsearch( this.intervals, entry => L - entry.Ltotal );

		if (i <= 0)
			return Report.warn("entry not found", `${this} i=${i} L=${L} this.L=${this.L}`);

		console.assert( this.intervals[i].Ltotal >= L && this.intervals[i - 1].Ltotal < L );

		return this.intervals[i];
	}


	getEntryByCentralAngle(theta) {

		console.assert(theta >= this.angle0 && theta <= this.angle1);

		if (theta === 0)
			return this.intervals[1];

		var i = Util.bsearch( this.intervals, entry => theta - entry.theta );

		if (i <= 0)
			return Report.warn("entry not found", `${this} i=${i} theta=${theta}`);

		return this.intervals[i];
	}


	_fitLengthIntoQuad(L, quadNum) {

		var resultL = quadNum < 2
			? ( quadNum === 0 ? L : 2 * this.L - L )
			: ( quadNum === 2 ? 2 * this.L + L : 4 * this.L - L );

		if (resultL < 0)
			resultL += 4 * this.L;
		else if (resultL >= 4 * this.L)
			resultL -= 4 * this.L;

		return resultL;
	}


	getLengthByPointOnCurve4X(p) { // quad-relevant. Returns in range [0 .. 4*L].

		var quadNum = p.y >= 0 ? (p.x >= 0 ? 0 : 1) : (p.x >= 0 ? 3 : 2);

		var zeta = Angle.toQuad0(p.angle());
		var entry = this.getEntryByCentralAngle(zeta);

		var circularAngleToPoint = entry.c.angleTo(Math.abs(p.x), Math.abs(p.y));

		var L = entry.Ltotal - entry.c.radius * ( entry.circularAngle - circularAngleToPoint );

		return this._fitLengthIntoQuad(L, quadNum);
	}


	getLengthByCentralAngle4X(a) { // quad-relevant. TODO? approx. can be different

		var quadNum = Angle.getQuadNum(a);

		var zeta = Angle.toQuad0(a);
		var entry = this.getEntryByCentralAngle(zeta);

		var p = entry.c.intersectRayFromOriginFromInside(zeta);

		if (p.x < 0 || p.y < 0)
			Report.warn("bad point", `${this} ${p} ${a} ${zeta}`);

		var circularAngleToPoint = entry.c.angleToPoint(p);

		var L = entry.Ltotal - entry.c.radius * ( entry.circularAngle - circularAngleToPoint );

		return this._fitLengthIntoQuad(L, quadNum);
	}


	getPointDataByLength4X(L, isCW_sgn = -1) { // 4X: by-quad approximation

		console.assert(L >= 0 && L < 4 * this.L);

		if (isCW_sgn > 0)
			L = 4 * this.L - L;

		var quadNum = Math.floor(L / this.L);
		var LwithinQuad = L - quadNum * this.L;

		if (quadNum === 1 || quadNum === 3)
			LwithinQuad = this.L - LwithinQuad;
			
		var data = this.getPointDataByLength(LwithinQuad);

		if (quadNum >= 2) {
			data.p.y *= -1;
			data.derivatives.x *= -1;
		}

		if (quadNum === 1 || quadNum === 2) {
			data.p.x *= -1;
			data.derivatives.y *= -1;
		}

		return data;
	}


	getPointDataByLength(L) {

		if ( !(L >= 0 && L <= this.L) )
			Report.warn("Length is outside range", `${this} L=${L}`);

		var entryNum = Math.min(this.n - 1, Math.floor(L / this.avgIntervalL) + 1);
		var entry = this.intervals[ entryNum ];

		var data = CurveApproximation._pointDataByLength || (CurveApproximation._pointDataByLength
			= { p: new Point, derivatives: new Point } );

		if (entry.type == 'circular') {

			let cAngle1 = entry.circularAngle - (entry.Ltotal - L) / entry.c.radius;

			data.p.copy( entry.c.getPointOnCircumference(cAngle1) );

			// Q. Why derivatives don't depend on radius: d/dL(r cos L) = -r sin L.
			// A. That's incorrect; actually depend; see above (a = L / r).

			data.derivatives.set( -Math.sin(cAngle1), Math.cos(cAngle1) );

		} else {

			data.p.copy( entry.p ).addScaled( entry.v, L - entry.Ltotal );
			data.derivatives.set( -entry.v.x, -entry.v.y );
		}

		return data;
	}


	getEquidistantAngles(n = this.n) {

		var chunkLen = this.L / (n - 1);

		var p = CurveApproximation._pTmp || (CurveApproximation._pTmp = new Point);

		var result = [ this.angle0 ];

		for (let i = 1; i < n - 1; i++) {

			let entry = this.getEntryByLength(i * chunkLen);
			//let entry = this.intervals[ i ];

			if (entry.type == 'circular') {

				let t = ( i * chunkLen - (entry.Ltotal - entry.intervalL) ) / entry.intervalL;

				//if ( !(t >= 0 && t <= 1) )
				//	Report.warn("bad data", `${this} i=${i} t=${t}`);

				let a = entry.circularAngle - (1 - t) * entry.intervalL / entry.c.radius;
				let p = entry.c.getPointOnCircumference(a);

				//result.push( p.angle() );

				let pCurve = this.arg.fnClosestPoint(p);
				//console.log(p.distanceToPoint(pCurve));
				result.push( pCurve.angle() );

			} else {

				p.copy( entry.p ).addScaled( entry.v, entry.Ltotal - i * chunkLen );

				result.push( p.angle() );
			}
		}

		result.push(this.angle1);

		return result;
	}


	computeNormals() {

		var prevNormalAngle;

		this.intervals.forEach( (entry, i, arr) => {

			entry.prevNormalAngle = prevNormalAngle;
			entry.normalAngle = this.arg.fnGetNormalAngleInPoint( entry.p );

			prevNormalAngle = entry.normalAngle;
		});
	}


	getEntryByNormalAngle(a) {

		console.assert(a >= this.angle0 && a <= this.angle1);

		var i = Util.bsearch( this.intervals, entry => a - entry.normalAngle );

		if (i < 0)
			return Report.warn("entry not found", `${this} i=${i} a=${a}`);

		return this.intervals[ Math.max(i, 1) ];
	}


	getPointByNormalAngle(a) {

		var entry = this.getEntryByNormalAngle(a);

if (entry.type == 'linear')
	Report.warn(`TODO linear getPointByNormalAngle`);

		var t = (a - entry.normalAngle) / (entry.prevNormalAngle - entry.normalAngle);

		console.assert(t >= 0);

		var p = CurveApproximation._pointByNormalAngle || (
				CurveApproximation._pointByNormalAngle = new Point);

		var cAngle = entry.circularAngle - t * entry.intervalL / entry.c.radius;

		return p.copy( entry.c.getPointOnCircumference(cAngle) );
	}


	getCentralAngleByNormalAngle(a) { return this.getPointByNormalAngle(a).angle() }


	getCentralAngleByNormalAngle4X(a) {

		var quadNum = Angle.getQuadNum(a);
		var zeta = this.getCentralAngleByNormalAngle( Angle.toQuad0(a) );

		return Angle.toQuadNum(zeta, quadNum);
	}


	getEquinormalCentralAngles(n = this.n) { // curve is convex on the interval

		var a0 = this.intervals[0].normalAngle;
		var a1 = this.intervals[ this.n - 1 ].normalAngle;

		var result = [ a0 ];

		for (let i = 1; i < n - 1; i++) {

			let a = a0 + (a1 - a0) * i / (n - 1);
			let entry = this.getEntryByNormalAngle(a);
			let prevEntry = this.intervals[ entry.i - 1 ];

			let t = (a - entry.normalAngle) / (prevEntry.normalAngle - entry.normalAngle);

			result.push( entry.theta * (1 - t) + prevEntry.theta * t );
		}

		result.push(a1);

		return result;
	}


	getMesh(nSegments) { return new THREE.Mesh( this.getGeometry(nSegments) ) }


	getGeometry(nSegments = 64) {

		console.assert(nSegments % 4 === 0);

		var NORMAL_FACTOR = 0.6;
		var n = nSegments / 4 + 1;

		var equidistant = this.getEquidistantAngles(n);
		var equinormal = this.getEquinormalCentralAngles(n);

		var position = [];

		var lastP = new Point;

		var addSegment = (p, signX = 1, signY = 1) => {

			var Z = 1;

			p.x *= signX; p.y *= signY;

			position.push( lastP.x, lastP.y, 0,   p.x, p.y, 0,   lastP.x, lastP.y, Z );
			position.push( lastP.x, lastP.y, Z,   p.x, p.y, 0,   p.x, p.y, Z );

			lastP.copy(p);
		}

		var getPoint = (i) => {

			var a = NORMAL_FACTOR * equinormal[i] + (1 - NORMAL_FACTOR) * equidistant[i];

			return this.arg.fnGetPointByAngle(a);
		}


		lastP.copy( getPoint(0) );

		for (let i = 1; i < n; i++)
			addSegment( getPoint(i) );

		for (let i = n - 2; i >= 0; i--)
			addSegment( getPoint(i), -1, 1 );

		for (let i = 1; i < n; i++)
			addSegment( getPoint(i), -1, -1 );

		for (let i = n - 2; i >= 1; i--)
			addSegment( getPoint(i), 1, -1 );

		addSegment( getPoint(0) );

		var geometry = new THREE.BufferGeometry;

		geometry.setAttribute("position",
			new THREE.BufferAttribute( Float32Array.from(position), 3) );

		return Util.mergeVertices(geometry);
	}


	getDataBlockDescriptor() {

		return {
			name: `${this}`,
			size: this.getDataBlock().length,
			fnUpdate: (array, offset) => array.set( this.getDataBlock(), offset ),
		};
	}


	getDataBlock() {

		if (this._dataBlock)
			return this._dataBlock;

		var FLOATS_PER_ENTRY = this.getDataBlockEntrySize();

		// entry #0 doesn't go into the block (having n-1 entries total)

		this._dataBlock = new Float32Array( (this.n - 1) * FLOATS_PER_ENTRY );

		for (let i = 1; i < this.n; i++) {

			let entry = this.intervals[i];
			//let prevEntry = this.intervals[i - 1];

			let isLinear = entry.type == 'linear';
			let i0 = (i - 1) * FLOATS_PER_ENTRY;

			this._dataBlock[ i0 + 0 ] = entry.intervalL;
			this._dataBlock[ i0 + 1 ] = isLinear ? entry.v.x : entry.c.x;
			this._dataBlock[ i0 + 2 ] = isLinear ? entry.v.y : entry.c.y;

			this._dataBlock[ i0 + 3 ] = isLinear ? -1 : entry.c.radius;
			this._dataBlock[ i0 + 4 ] = entry.circularAngle;
			this._dataBlock[ i0 + 5 ] = entry.normalAngle;

			//this._dataBlock[ i0 + 6 ] = prevEntry.normalAngle;
			this._dataBlock[ i0 + 6 ] = entry.prevNormalAngle;
			this._dataBlock[ i0 + 7 ] = entry.p.x;
			this._dataBlock[ i0 + 8 ] = entry.p.y;
		}

		return this._dataBlock;
	}


	getDefaultN() { return CurveApproximation.DEFAULT_N }

	static getDefaultN() { return CurveApproximation.DEFAULT_N }

	getDataBlockEntrySize() { return CurveApproximation.DataBlockEntrySize }

	static getDataBlockEntrySize() { return CurveApproximation.DataBlockEntrySize }

}


Object.assign( CurveApproximation, {

	// 16, 1e-7: (7,7,1,1e-5) OK; (8,8,..) collinear pts.
	// close to b=10 "targetRelDeviation not achieved"
	DEFAULT_N:	64,//16,
	DEFAULT_REL_DEVIATION:	1e-7,

	DataBlockEntrySize:		12,

	_pTmp: null,
	_pointDataByLength: null,
	_pointByNormalAngle: null,
});




class CurveApproximation4X extends CurveApproximation {

	constructor(n, arg) {

		super(n, 0, Math.PI / 2, arg);
	}

}




export { CurveApproximation, CurveApproximation4X }

