
import { AngularSweep } from './AngularSweep.js';


AngularSweep.prototype.sortEvents = function() {
	this.events.sort((a, b) => a - b);
}


AngularSweep.prototype.processStaticData = function() {

	this.sortEvents();

	this.prevAngle = undefined; // We disallow flat segments with same angle
	this.saveFlatSegment(this.segmentsHeap[0], this.right);

var sameAngle=0;

	var rightRounded = AngularData.roundAngle(this.right),
		leftRounded = AngularData.roundAngle(this.left);

	var angle = AngularData.angle(this.events[0]);

	var eventsLength = this.events.length;
	for (let i = 0; i < eventsLength; i++) {

		let nextAngle = AngularData.angle(this.events[i + 1]),
			event = this.events[i],
			type = AngularData.type(event),
			mPLineIndex = AngularData.data(event);

		if (angle < rightRounded) {
			console.error(`id=${this.id} angle=${angle} r=${this.right}`);
			continue;

		} else if (angle > leftRounded) {
			console.error(`id=${this.id} angle=${angle} l=${this.left}`);
			break;
		}

		if (angle != nextAngle) {
			this.processEvent(angle, type, mPLineIndex);

		} else {
let startI = i;
			i = this.processEventsSameWideAngle(angle, i);
			nextAngle = AngularData.angle(this.events[i + 1]);
sameAngle += (i - startI + 1);
		}

		angle = nextAngle;
	}
/*
	if (sameAngle > 0)
		console.warn(`id=${this.id} sameAngle=${sameAngle} total=${eventsLength}`
		+ ` (${Util.toStr(sameAngle/eventsLength*100)}%)`);
*/
}


Object.assign(AngularSweep.prototype, {
	_eventsWideAngle: [],
	_eventsExactAngles: [],
	_eventsIndices: [],
	_eventsExactAngles2: [],
	_eventChains: [],
	_eventChainCategory: []
});


AngularSweep.prototype.processEventsSameWideAngle = function(angle, startI) {

	var eventsExactAngles = this._eventsExactAngles;
	var eventsIndices = this._eventsIndices;
	var eventsLength = 0;

	var endI;
	for (let i = startI; ; i++) {

		let event = this.events[i],
			mPLineIndex = AngularData.data(event);

		// sector.localizedAngleTo(x, y) n/a: mPLine is offsect from sector origin
		let exactAngle = Math.atan2(this.mPLine[mPLineIndex + 1], this.mPLine[mPLineIndex]);
		exactAngle = this.sector.localizeAngle(exactAngle);

		eventsExactAngles[eventsLength] = exactAngle;
		eventsIndices[eventsLength] = eventsLength;
		eventsLength ++;

		if (angle != AngularData.angle(this.events[i + 1])) {
			endI = i;
			break;
		}
	}

	eventsIndices.length = eventsLength;

//console.log(`id=${this.id} SameWideAngle eventsLength=${eventsLength} startI=${startI} endI=${endI}`);

	eventsIndices.sort((a, b) => eventsExactAngles[a] - eventsExactAngles[b]
		|| this.events[a + startI] - this.events[b + startI]);


	var events = this._eventsWideAngle;
	var eventsExactAngles2 = this._eventsExactAngles2;

	for (let i = 0; i < eventsLength; i++) {
		let index = eventsIndices[i];
		events[i] = this.events[startI + index];
		eventsExactAngles2[i] = eventsExactAngles[index];
	}

	events.length = eventsLength;
	eventsExactAngles2.length = eventsLength;//[eventsLength] = undefined;

/*
for (let i = 0; i < eventsLength; i++) {
	let a1 = AngularData.angle(events[i]),
		a2 = AngularData.roundAngle(eventsExactAngles2[i]);
	if (a1 != a2)
		console.error(`## id=${this.id} a1=${a1} a2=${a2}`);
}
*/
	for (let i = 0; i < eventsLength; i++) {

		let event = events[i],
			angle = eventsExactAngles2[i],
			type = AngularData.type(event),
			mPLineIndex = AngularData.data(event);

//if (angle < AngularData.roundAngle(this.sector.right) || angle > AngularData.roundAngle(this.sector.left))
if (angle < this.sector.right || angle > this.sector.left)
	console.error(`Before processEvent id=${this.id} a=${angle} l=${this.sector.left} r=${this.sector.right}`, events, eventsExactAngles2);

		if (angle != eventsExactAngles2[i + 1])
			this.processEvent(angle, type, mPLineIndex);
		else
			i = this.processEventsExactSameAngle(angle, i, events, eventsExactAngles2);
	}

	return endI;
}


AngularSweep.prototype.processEventsExactSameAngle = function(angle, startI,
		events, eventsExactAngles) {

	var segmentsHeap = this.segmentsHeap,
		mPLine = this.mPLine;

	// 1. gather events with exactly same angle
	var endI;
	for (let i = startI; ; i++) {
		if (angle != eventsExactAngles[i + 1]) {
			endI = i;
			break;
		}
	}

//console.log(`id=${this.id} ExactSameAngle length=${events.length} startI=${startI} endI=${endI}`);

	// 2. find related events, form event chains
	var eventChains = this._eventChains;
	var numEventChains = 0;

	traverseEvents((event, type, mPLineIndex) => {

		if (type == AngularData.INSERT) {
			beginEventChain(event);

		} else if (type == AngularData.STATIC_POINT) {
			console.error(`id=${this.id} static pt. in event chain`);

		} else {
			var i = searchEventChains(mPLineIndex - 3);
			if (i >= 0)
				eventChains[i].push(event);
			else
				beginEventChain(event);
		}
	});
//console.log(`id=${this.id} exactly same angle ${endI-startI+1}el.; event chains:`, eventChains);

	var iBefore = segmentsHeap[0];

	// 3. inspect chains, assign categories
	var category = this._eventChainCategory;

	traverseEventChains((i, chain) => {

		var type0 = AngularData.type(chain[0]);
		if (type0 == AngularData.INSERT) {
			category[i] = 1;

		} else {
			let typeEnd = AngularData.type(chain[chain.length - 1]);
			if (typeEnd == AngularData.REMOVE) {
				category[i] = 2;

			} else {
				console.assert(type0 == AngularData.REPLACE && typeEnd == AngularData.REPLACE);
				category[i] = 3;
			}
		}
	});

//catStr = ""; category.forEach(c => catStr += `${c} `);
//console.log(`id=${this.id} categories=${catStr}`);

	// 4. apply chains
	this.sweepLine.updateWithAngle(angle);

	// 4a. apply chains which end with REMOVE
	traverseEventChains((i, chain) => category[i] == 2 && applyEventChain(chain));

	var dBeforeReplaces = this.sweepLine.distanceToMPLine(segmentsHeap[0]);

	// 4b. apply chains consisting exclusively of REPLACE's
	traverseEventChains((i, chain) => category[i] == 3 && applyEventChain(chain));

	var dAfterReplaces = this.sweepLine.distanceToMPLine(segmentsHeap[0]);
	var dMax = Math.max(dBeforeReplaces, dAfterReplaces);

	// 4c. chains which start with INSERT
	traverseEventChains((i, chain) => category[i] == 1 && applyEventChain(chain));


	// segment nearest to viewpoint changed?
	if (iBefore != segmentsHeap[0])
		this.saveFlatSegment(segmentsHeap[0], angle);

	// 5. save relevant VG points.
	traverseEvents((event, type, mPLineIndex) => {

		if (mPLine[mPLineIndex + 2] === undefined)
			return;

		console.assert(type != AngularData.REPLACE);

		if (Util.hypot(mPLine[mPLineIndex], mPLine[mPLineIndex + 1]) <= dMax)
			this.saveFlatPoint(mPLineIndex, angle);
	});

	return endI;


	function traverseEvents(callbackFn) {
		for (let i = startI; i <= endI; i++) {
			let event = events[i],
				type = AngularData.type(event),
				mPLineIndex = AngularData.data(event);

			callbackFn(event, type, mPLineIndex);
		}
	}

	function beginEventChain(event) {
		var chain = eventChains[numEventChains];
		if (chain) {
			chain[0] = event;
			chain.length = 1;

		} else {
			eventChains[numEventChains] = [ event ];
		}
		numEventChains ++;
	}

	// mb. TODO Object/Map? currently no probs. w/ 100-500 collinear pts.
	function searchEventChains(lastMPLineIndex) {
		for (let i = 0; i < numEventChains; i++) {
			let chain = eventChains[i],
				event = chain[chain.length - 1];

			if (AngularData.data(event) == lastMPLineIndex)
				return i;
		}
	}

	function traverseEventChains(callbackFn) {
		for (let i = 0; i < numEventChains; i++)
			callbackFn(i, eventChains[i]);
	}

	function applyEventChain(chain) {
		chain.forEach(event => {
			var type = AngularData.type(event),
				mPLineIndex = AngularData.data(event);

			if (type == AngularData.REPLACE)
				segmentsHeap.replace(mPLineIndex - 3, mPLineIndex);

			else if (type == AngularData.REMOVE)
				segmentsHeap.remove(mPLineIndex - 3);

			else
				segmentsHeap.insert(mPLineIndex);
		});
	}
}


AngularSweep.prototype.processEvent = function(angle, type, mPLineIndex) {

	var segmentsHeap = this.segmentsHeap;

	//this.sweepLine.update(angle);

	if (type != AngularData.REPLACE)
		this.sweepLine.updateFromMPLine(mPLineIndex);

	switch (type) {
	case AngularData.INSERT:
		if (segmentsHeap.insert(mPLineIndex, 1.00) === 0) {
			this.saveFlatPoint(mPLineIndex, angle);
			this.saveFlatSegment(mPLineIndex, angle);
		}
		break;

	case AngularData.REMOVE:
		if (segmentsHeap.remove(mPLineIndex - 3) === 0) {
			this.saveFlatPoint(mPLineIndex, angle);
			this.saveFlatSegment(segmentsHeap[0], angle);
		}
		break;

	case AngularData.REPLACE:
		if (segmentsHeap.replace(mPLineIndex - 3, mPLineIndex) === 0) {
			this.saveFlatSegment(mPLineIndex, angle);
		}
		break;

	case AngularData.STATIC_POINT:
		if (segmentsHeap.length === 0 || this.sweepLine.distanceToMPLine(segmentsHeap[0])
				> Util.hypot(this.mPLine[mPLineIndex], this.mPLine[mPLineIndex + 1]) ) {
			this.saveFlatPoint(mPLineIndex, angle);
		}
		break;
	}
}


AngularSweep.prototype.saveFlatPoint = function(mPLineIndex, angle) {

	var ptId = this.mPLine[mPLineIndex + 2];
	if (ptId === undefined) {
		console.error(`id=${this.id} flatPoint w/o ptId`);
		return;
	}

	var x = this.mPLine[mPLineIndex],
		y = this.mPLine[mPLineIndex + 1];

	if (!this.area.spatialIndex.areaContains(x + this.x, y + this.y, this.radiusClass))
		return;
/*
	if (Main.DEBUG) {
		let aR = AngularData.roundAngle(this.sector.right),
			aL = AngularData.roundAngle(this.sector.left);

		if (angle < aR || angle > aL)
			console.error(`id=${this.id} a=${angle} aR=${aR} aL=${aL} aRounded=${AngularData.roundAngle(angle)}`);
	}
*/
	// TODO (v2): consider distance check when creating mPLine incl. skipping segments
	if (Util.hypot(x, y) < this.sector.radius)
		this.flatPoints.push(AngularData.encode(angle, AngularData.STATIC_POINT, mPLineIndex));
//console.log(`id=${this.id} savePoint ptId=${ptId} mPLineIndex=${mPLineIndex}`);
}


AngularSweep.prototype.saveFlatSegment = function(mPLineIndex, angle) {

	angle = AngularData.roundAngle(angle);
	if (angle >= this.leftRounded)
		return;

	// TODO make it epsilon hard.

	var index = this.flatSegments.length;
	if (this.prevAngle === angle)
		index --;
	else
		this.prevAngle = angle;

	this.flatSegments[index] = AngularData.encode(angle, 0, mPLineIndex);
//console.log(`saveSegment mPLineIndex=${mPLineIndex}`);
}


