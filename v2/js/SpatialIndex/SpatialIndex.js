
import { Line2 } from '../Math/Line2.js';
import { Point } from '../Math/Point.js';
import { Rectangle } from '../Math/Rectangle.js';



class SpatialIndex {

	constructor(rect) {

		this.rect = rect;

		this.tracks = new rbush;
		this.containerByTrack = new Map;

		if (Main.DEBUG >= 5)
			this.removedTracks = new Set;

		this.aSDynamic = new rbush;

		// w/ RadiusClassBase
		this.allItems = new rbush;

		// RadiusClassBase doesn't participate in CGroup's, collisionByRC/activeCollisionByRC
		this.collisionByRC = Unit.ItemCGroupIds.map(el => new rbush);

		this.activeCollisionByLevelRC
			= new Array(PathPlanner.ItemRadiusByLevel.length * Unit.ItemCGroupIds.length)
				.fill(null).map(el => new rbush);

		this._container = new SpatialContainer;

		// CW polygon
		this._polygonByRC = Array.from(Unit.ItemPolygonByRC).map((el, i) =>
			Polygon.fromRectangleCW(this.rect, Infinity).enlarge(Unit.RadiusClass[i]) );
	}


	// ================================
	//
	//   Border
	//
	// ================================

	areaContains(x, y, radiusClass = Unit.RadiusClassBase) {

		return this.rect.containsDelta(x, y, -Unit.RadiusClass[radiusClass]);
	}


	getPolygon(radiusClass = Unit.RadiusClassBase) { // CW!

		return this._polygonByRC[radiusClass];
	}

	
	// =======================
	//
	//   Tracks, Expansions
	//
	// =======================

	insertTrack(track) {

		if (this.containerByTrack.has(track))
			return Report.warn("duplicate insert", `${track}`);

		if (Main.DEBUG >= 5)
			if ( this.removedTracks.has(track) )
				Report.warn("re-inserting track", `${track}`);

		var container = new SpatialContainer().setFromShape(track);

		this.tracks.insert(container);
		this.containerByTrack.set(track, container);
	}


	insertTracks(tracks) {
		tracks.forEach(track => this.insertTrack(track));
	}


	removeTrack(track) {

		var container = this.containerByTrack.get(track);
		if (!container)
			return Report.warn("no track", `${track}`);

		this.tracks.remove(container);
		this.containerByTrack.delete(track);

		if (Main.DEBUG >= 5)
			this.removedTracks.add(track);
	}


	removeTracks(tracks) {
//if (tracks.length>0)
//console.log(`removeOutdated ${tracks.map(t=>t.id).join(" ")}`);
		tracks.forEach(track => this.removeTrack(track));
	}


	updateTracks(addTracks, removeTracks = []) {

		//var t = Engine.time - EpisodeCollection.T_OUTDATE_DELTA;

		addTracks.forEach(track => {

			if (track.t2 < Engine.time)
				Report.warn("outdated track", `${track} t=${Engine.time}`);

			else if (!track.isCut() && track.t1 < Engine.time)
				Report.warn("started track", `${track} t=${Engine.time}`);
		});

		//NO! console.assert(removeTracks.every(track => track.t2 < Engine.time));
		//console.assert(removeTracks.every(track => track.t2 < t)); // <-- correct strict ineq.

//console.log(`add ${addTracks.map(t=>t.id).join(" ")} remove ${removeTracks.map(t=>t.id).join(" ")}`);

		addTracks.forEach(track => this.updateTrack(track, true));
		removeTracks.forEach(track => this.updateTrack(track, false));
	}


	updateTrack(track, ifAdd) {

		if (ifAdd)
			this.insertTrack(track);
		else
			this.removeTrack(track);

		var queryContainer = this._container.setFromRect(track.getRect());

AI.statInc('updateTrack-tracks');

		this.aSDynamic.search(queryContainer).forEach(container => {

			var aSDynamic = container.obj;

			console.assert(aSDynamic instanceof ASDynamic);

			if (track.unit === aSDynamic.unit)
				return;

			if (aSDynamic.t0 > track.t2) {
AI.statInc('updateTrack-checks');
				return;
			}

			aSDynamic.updateTrack(track, ifAdd);
AI.statInc('updateTrack-containers');
		});
	}



	// =======================
	//
	//   Static Items
	//
	// =======================

	radiusLevel(radius) {
		console.assert(radius > 0);

		var i;
		for (i = 1; i < PathPlanner.ItemRadiusByLevel.length; i++)
			if (radius < PathPlanner.ItemRadiusByLevel[i])
				break;

		return i - 1;
	}


	activeCollision(radiusLevel, radiusClass) {
		return this.activeCollisionByLevelRC[radiusLevel * Unit.ItemCGroupIds.length + radiusClass];
	}


	insert(item) {

		if ( item.inSpatialIndex )
			return;

		if ( item.isDependent() )
			return Report.warn("dependent", `${item}`);;

		if ( item.isUnit() )
			return;// Report.warn("skip", `${item}`);

		var container = item.spatialContainer();
		if (!container)
			return Report.warn("no container", `${item}`);

		item.inSpatialIndex = true;

		this.allItems.insert(container);

		if (!item.isColliding()) // Item is not colliding (e.g. small)
			return;

		//
		// collisionByRC hold all collision bodies for given radius class.
		// activeCollisionByRC hold active disjoint collision bodies: cGroups and disjoint items.
		//
		Unit.CreateCGroups.forEach(radiusClass => {

			this.collisionByRC[radiusClass].insert(item.spatialContainer(radiusClass));
			this.updateActiveCollisionByRC(item, radiusClass);
		});
	}


	//
	// TODO v2+: different polygonal data representation
	// TODO (mb.) insert on every applicable level
	//
	insertItemIntoActiveCollision(item, radiusClass) {

		//var container = item.spatialContainer(radiusClass); // same container for all levels!
		//for (let i = this.radiusLevel(item.radius); i < PathPlanner.ItemRadiusByLevel.length; i++)
		//	this.activeCollision(i, radiusClass).insert(container);

		var index = this.activeCollision(this.radiusLevel(item.getRadius()), radiusClass);
		index.insert(item.spatialContainer(radiusClass));
	}


	removeItemFromActiveCollision(item, radiusClass) {

		var index = this.activeCollision(this.radiusLevel(item.getRadius()), radiusClass);
		index.remove(item.spatialContainer(radiusClass));
	}


	insertCGroup(cGroup) {
//console.error(`insertCGroup ${cGroup.id} f=${Engine.frameNum}`, cGroup.items.map(i=>i.id) );
		var index = this.activeCollision(this.radiusLevel(cGroup.getRadius()), cGroup.radiusClass);
		index.insert(cGroup.getSpatialContainer());
	}


	removeCGroup(cGroup) {
//console.error(`removeCGroup ${cGroup.id} f=${Engine.frameNum}`, cGroup.items.map(i=>i.id) );
		var index = this.activeCollision(this.radiusLevel(cGroup.getRadius()), cGroup.radiusClass);
		index.remove(cGroup.getSpatialContainer());
	}


	updateActiveCollisionByRC(item, radiusClass) {

		var intersectingItems = this.getIntersectingItems(item, radiusClass);
		if (intersectingItems.length === 0) {
			this.insertItemIntoActiveCollision(item, radiusClass);
			return;
		}

		var intersectGroupIds = [];
		var grouplessItems = [];

		intersectingItems.forEach( item => {
			var cGroupId = item.getCGroupId(radiusClass);
			if (!cGroupId)
				grouplessItems.push(item);

			else if (intersectGroupIds.indexOf(cGroupId) == -1)
				intersectGroupIds.push(cGroupId);
		});

		var cGroupId = intersectGroupIds[0];
		var group = cGroupId > 0 ? CGroup.getById(cGroupId) : new CGroup(radiusClass);
		group.addItem(item);

		grouplessItems.forEach(item => {
			group.addItem(item);
			this.removeItemFromActiveCollision(item, radiusClass);
		});

		for (let i = 1; i < intersectGroupIds.length; i++) {
			group.mergeCGroup(intersectGroupIds[i]);
		}
	}


	remove(item) {

		if ( !item.inSpatialIndex )
			return;

		if ( item.isDependent() )
			return;

		if ( item.isUnit() )
			return;

		item.inSpatialIndex = false;

		this.allItems.remove(item.spatialContainer());

		Unit.CreateCGroups.forEach(radiusClass => {

			var collision = this.collisionByRC[radiusClass],
				container = item.spatialContainer(radiusClass);

			collision.remove(container);

			var cGroupId = item.getCGroupId(radiusClass);
			if (!cGroupId) {
				this.removeItemFromActiveCollision(item, radiusClass);
				return;
			}

			var group = CGroup.getById(cGroupId);
			group.removeItem(item);

			// delete cGroup, reinsert group.items (TODO)
			var items = group.removeAllItems();

			items.forEach(item => collision.remove(item.spatialContainer(radiusClass)));

			items.forEach(item => {
				collision.insert(item.spatialContainer(radiusClass));
				this.updateActiveCollisionByRC(item, radiusClass);
			});
		});
	}


	getIntersectingItems(item, radiusClass) {

		console.assert(Unit.CreateCGroups[radiusClass] !== undefined);

		var container = item.spatialContainer(radiusClass);
		var itemPolygon = item.getPolygon(radiusClass);
		var intersectingItems = [];

		this.collisionByRC[radiusClass].search(container).forEach(el => {
			var checkItem = el.obj;
			if (checkItem != item && itemPolygon.overlapsPolygon(checkItem.getPolygon(radiusClass)))
				intersectingItems.push(checkItem);
		});

		return intersectingItems;
	}


	// ===============================
	//
	//   Track Queries
	//
	// ===============================

	// !fn: return true if some track intersects
	checkTracksIntersectingUnitStandingAt(unit, p, fn, t = Engine.time) {

		console.assert(p instanceof Point);

		var container = this._container.setFromShape( p ).enlarge( unit.getRadius() );

		return this.tracks.search(container).some(el => {

			var track = el.obj;
			if (track.unit === unit || track.t1 > t || track.t2 < t)
				return;

			if (track.p1.distanceToPoint(p) <= track.unit.getRadius() + unit.getRadius()) {

				if (!fn)
					return true;

				fn(track);
			}
		});
	}


	processSomeTracksUsingShape(shape, processFn) {//, excludeUnit, minTime) {

		var container = this._container.setFromShape(shape);

		return this.tracks.search(container).some(el => processFn(el.obj));
	}


	checkTrackIntersection(track) {

		var intersectingTrack;

		this.processSomeTracksUsingShape(track, track2 => {

			if (track2.unit === track.unit)
				return;

			if (track.getCollisionTime(track2)) {
				intersectingTrack = track2;
				return true;
			}
		});

		return intersectingTrack;
	}


	getCollidingTracks(track) {

		var result;

		this.processSomeTracksUsingShape(track, track2 => {

			if (track2.unit !== track.unit && track.getCollisionTime(track2)) {

				(result || (result = [])).push(track2);
			}
		});

		return result;
	}


	getTracksInSector(sector, unit, minTime) {

		var container = this._container.setFromRect(sector.getRect())
			.enlarge(unit.getRadius() + 1e-3); // <-- why? sector!

		var tracks = [];

		this.tracks.search(container).forEach(el => {

			let track = el.obj;

			if (track.t2 >= minTime && track.unit !== unit) // no radius check (collisions)-> && sector.overlapsTrack(track))
				tracks.push(track);
		});

		return tracks;
	}


	processTracksUsingShape(shape, processFn) {

		var container = this._container.setFromShape(shape);

		this.tracks.search(container).forEach(el => processFn(el.obj));
	}


	processUnitsInSector(sector, processFn) {

		// Have radius check. for scene list sector is enlarged.
		var curTime = Engine.time;

		this.processTracksUsingShape(sector, track => {

			if ( track.t1 > curTime || track.t2 < curTime
					|| !sector.overlapsTrack(track, curTime) )
				return;

			processFn(track.unit);
		});
	}


	getUnitsIntersectingPolygon(polygon, tMin = Engine.time, tMax = tMin + 3) {

		var rect = polygon.getRect(this._rect).enlarge( Unit.RadiusClassMax );
		var units = [];

		this.processSomeTracksUsingShape(rect, track => {

			if ( track.t2 < tMin || track.t1 > tMax || units.indexOf(track.unit) !== -1 )
				return;

			if ( polygon.overlapsTrack(track, tMin, tMax) )
				units.push( track.unit );
		});

		return units;
	}


	// itemSpec must be w/ constant polygon (i.e. not constructionSite)

	intersectsStaticOrTracks(itemSpec, p, facing = 0, t) {

		console.assert(itemSpec instanceof ItemSpec);
		console.assert(p instanceof Point);

		var polygon = itemSpec.createPolygon(p.x, p.y, facing);

		if (this.polygonCollides(polygon))
			return true;

		// t === undefined: OK
		return this.getUnitsIntersectingPolygon(polygon, t).length > 0;
	}

/*
	processUnitsInPolygon(polygon, processFn) {

		// no radius check. for scene list polygon is enlarged. (? TODO)
		var container = this._container.setFromShape(polygon),//.enlarge(Unit.RadiusMax),
			curTime = Engine.time;

		this.tracks.search(container).forEach(el => {

			var track = el.obj;
			if (track.t1 > curTime || track.t2 < curTime)
				return;

			if (!polygon.containsPoint(track.p1)) {
				if (track.isInPlace())
					return;

				if (!polygon.intersectSegment(track.p1.x, track.p1.y, track.p2.x, track.p2.y))
					return;
			}

			processFn(track.unit);
		});
	}
*/

	processUnitsAlongLine2(line2, processFn) { // w/ unit radius.

		var container = this._container.setFromShape(line2).enlarge(Unit.RadiusMax),
			curTime = Engine.time;

		this.tracks.search(container).forEach(el => {

			var track = el.obj;
			if (track.t1 > curTime || track.t2 < curTime)
				return;

			var p = track.pointAtTime(curTime);
			if (line2.distanceSegmentToPoint(p) <= track.unit.getRadius())
				processFn(track.unit);
		});
	}


	// Given track, check if it collides.

	checkIfTrackCollides(track) {

		var result = this.processSomeDisjointPolygonsUsingShape(track, 0, track.unit.radiusClass, polygon => {

			if ( polygon.overlapsTrack_noRadiusCheck(track) )
				return true;

		}, true);

		if (result)
			return true;

		if (this.getCollidingTracks(track))
			return true;
	}


	// ===========================================
	//
	//   Collision / Disjoint Polygon Queries
	//
	// - organized in levels by size
	//
	// ===========================================

	processDisjointPolygonsInSector(sector, level, radiusClass, processFn) {

		var container = this._container.setFromShape(sector),
// TODO why Unit.RadiusClass[radiusClass] added?
			addToRadius = Unit.RadiusClass[radiusClass] * Math.SQRT2 + 1e-3;

		for (let i = level; i < PathPlanner.ItemRadiusByLevel.length; i++) {

			this.activeCollision(i, radiusClass).search(container).forEach(container => {

				let polygon = container.getPolygon(radiusClass);

				if (sector.overlapsCircle(polygon.getBoundingCircle(), addToRadius))
					processFn(polygon);
			});
		}
	}


	// AreaBorder may be not disjoint
	processSomeDisjointPolygonsUsingShape(shape, level, radiusClass, processFn, checkAreaBorder) {

		//var container = this._container.setFromShape(shape);

		var rect = shape.getRect();
		var container = this._container.setFromRect(rect, shape);

		for (let i = level; i < PathPlanner.ItemRadiusByLevel.length; i++) {

			let result = this.activeCollision(i, radiusClass).search(container).some(container => {

				let polygon = container.getPolygon(radiusClass);
				return processFn(polygon);
			});

			if (result === true)
				return true;
		}

		if (checkAreaBorder) {
			if (!this.rect.isRectWhollyInside(rect, -Unit.RadiusClass[radiusClass]))
				return processFn( this.getPolygon(radiusClass) );
		}
	}


	addDisjointPolygonsToCircumferenceIntervals(cI, height = 0, radiusClass = 0, level = 0) {

		this.processSomeDisjointPolygonsUsingShape(cI, level, radiusClass, polygon => {

			// TODO (v2) known issue: max. height of entire group matters

			if (height > polygon.height)
				return true;

			cI.addIntervalsOnCircumferenceInsidePolygon(polygon, 1e-3);
			return true;

		}, true);
	}


	// =============================================================
	//
	//   Item Queries
	//
	// - this.collisionByRC[0] sometimes can be used
	//
	// =============================================================

	containersToItems(containers) {

		for (let i = 0, length = containers.length; i < length; i++)
			containers[i] = containers[i].obj;

		return containers;
	}


	getAllItemsUsingShape(shape) {

		return this.containersToItems(
			this.allItems.search( this._container.setFromShape(shape) )
		);
	}


	getAllItemsDependencyUsingShape(shape) {

		return Item.flattenDependentItems( this.getAllItemsUsingShape(shape) );
	}


	//
	//	knn(tree, x, y, [k, filterFn, maxDistance])
	//		tree: an RBush tree
	//		x, y: query coordinates
	//		k: number of neighbors to search for (Infinity by default)
	//		filterFn: optional filter function; k nearest items where filterFn(item) === true will be returned.
	//		maxDistance (optional): maximum distance between neighbors and the query coordinates (Infinity by default)
	//
	getKNNItems(p, k, filterFn, d) {

		console.assert(p instanceof Point);

		return this.containersToItems(
			knn(this.allItems, p.x, p.y, k, filterFn, d * d) // <-- squared! (rbush-knn 4540b)
		);
	}


	processKNNItems(p, k, filterFn, processFn, d) {

		this.getKNNItems(p, k, filterFn, d).forEach(item => processFn(item));
	}


	getCollidingItemsUsingShape(radiusClass = 0, shape, enlargeDistance = 0, filterFn) {

		var container = this._container.setFromShape(shape).enlarge(enlargeDistance);

		var items = this.containersToItems( this.collisionByRC[radiusClass].search(container) );

		if (filterFn !== undefined)
			Util.filterInPlace(items, filterFn);

		return items;
	}

/*
	processCollidingItemsUsingShape(radiusClass, shape, processFn) {

		this.getCollidingItemsUsingShape(radiusClass, shape).forEach(item => processFn(item));
	}
*/

	addItemsToApproachBlockingIntervals(items, cI, excludeItem, radiusClass, halfWidth, itemFilterFn) {

		for (let i = 0; i < items.length; i++) {

			var item = items[i];

			if (item === excludeItem)
				continue;

			if (itemFilterFn !== undefined && !itemFilterFn(item))
				continue;

			var polygon = item.getPolygon(radiusClass);

			if (polygon.contains(cI.circle.x, cI.circle.y)) {

				cI.fillIntervals();
				return;
			}

			cI.addPolygonToApproachBlockingIntervals(polygon, halfWidth);
		}

	}


	//
	//   Why query items, not disjoint polygons:
	//
	// - excludeItem from intervals (tree to be chopped, determining falling intervals)
	//
	addCollidingIntervals(cI, excludeItem, radiusClass, halfWidth, itemFilterFn, enlargeDistance) {

		// If radiusClass not specified:
		// collision data for rC=0 queried, used base polygon.
		var items = this.getCollidingItemsUsingShape(radiusClass, cI, enlargeDistance);

		this.addItemsToApproachBlockingIntervals(items, cI, excludeItem, radiusClass, halfWidth, itemFilterFn);

		cI.addPolygonToApproachBlockingIntervals( this.getPolygon(radiusClass), halfWidth );
	}


	unitFits(unit, x, y) {

		if (x instanceof THREE.Vector3) {
			y = x.z;
			x = x.x;
		}

		// check vs. static (colliding disjoint polygons)
		if (this.processSomeDisjointPolygonsUsingShape(this._pt.set(x, y), 0,
				unit.radiusClass, polygon => polygon.contains(x, y)) )
			return;

		if (!this.areaContains(x, y, unit.radiusClass))
			return;

		//if (this.checkIntersectingUnitStandingInfinitely(unit, x, y))
		//	return;

		return true;
	}


	unitFitGetBlockingEntities(unit, position) {

		var p = this._pt.copyFromVector3(position);

		var entities = [];
		entities.isBlocked = false;

		this.processSomeDisjointPolygonsUsingShape(p, 0, unit.radiusClass, polygon => {

			if (polygon.containsPoint(p)) {

				entities.push(polygon);
				entities.isBlocked = true;
			}
		});

		if (!this.areaContains(p.x, p.y, unit.radiusClass)) {

			entities.push("areaBorder");
			entities.isBlocked = true;
		}

		this.checkTracksIntersectingUnitStandingAt(unit, p, track => entities.push(track) );

		return entities;
	}


	polygonCollides(polygon, radiusClass, filterFn) {

		var items = this.getCollidingItemsUsingShape(0, polygon, 0, filterFn); // RC0 queried

		return items.some(item => {

			if (!item.isColliding())
				return Report.warn("non-colliding in SI", `${item}`);

			return polygon.overlapsPolygon(item.getPolygon(radiusClass));
		});
	}


	//itemFits() { return this.polygonCollides( item.getPolygon() ) }


	getAllCollidingItems(filterFn) {

		return Util.filterAndMap( this.collisionByRC[0].all(), container => {

			var item = container.obj;

			if (filterFn(item))
				return item;
		});
	}

}


Object.assign(SpatialIndex.prototype, {

	_pt: new Point,
	_line2: new Line2,
	_rect: new Rectangle,
});




export { SpatialIndex };

