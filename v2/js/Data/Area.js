
class Area {

	constructor(id, rect, homeCameraLocation) {

		if (id instanceof Rectangle) {
			rect = id;
			id = 1;
		}

		console.assert(rect instanceof Rectangle);

		this.id = id;
		this.rect = rect;
		this.homeCameraLocation = homeCameraLocation || new CameraLocation;

		if (!Main.isServer) {

			this.display = new AreaDisplay(this);

			//this.displayIndex = new DisplayIndex(this);
			this.spatialIndex = new SpatialIndex(rect);
		}

		this.baseCenter = null;
		this.logStorages = [];
		this.itemsWithShop = [];
		this.crowdedAreas = [];
		this.containerPlacements = new Area.ContainerPlacements;
		this.tower = null;

		this.events = (typeof ItemEventQueue != "undefined") ? new ItemEventQueue : null;

		this.wind = (typeof Wind != "undefined") ? new Wind.Area() : null;

		this.activity = new Area.Activity;


		this.pathLevelMax = 1;

		this.miniMapFillStyle = "#3c501d";

		this.surface = new Area.Surface(this);


		this.areaItems = new Area.Items(this);
	}


	static fromJSON(data) {

		var area = new Area(

			data.id,
			Rectangle.fromJSON(data.rect),
			new CameraLocation().fromJSON(data.homeCameraLocation)
		);

		return area;
	}


	// =====================================
	//
	//     I T E M S
	//
	// =====================================

	addItem(item) {

		this.areaItems.addItem(item);

		if( !item.isOn3D() )
			Report.warn("!isOn3D", `${item}`);

		if ( !item.isUnit() )
			this.spatialIndex.insert(item);

		this.display.add(item);
	}


	removeItem(item) {

		this.areaItems.removeItem(item);

		//if ( item.isOn3D() ) {

			if ( !item.isUnit() )
				this.spatialIndex.remove(item);

			this.display.remove(item);
		//}
	}


	getItemCount(specName) { // incl. under construction

		console.assert(typeof specName == 'string');

		var cnt = this.areaItems.getItemsBySpecName(specName).reduce( (cnt, item) => {

			if ( item.spec.name === specName )
				cnt ++;

			return cnt;
		}, 0);

		cnt += this.areaItems.getItemsBySpecName('constructionSite').reduce( (cnt, item) => {

			if ( item.isConstructionSite()
					&& item.getSpec().name === specName
					&& item.getStage() !== 'disassembly' )
				cnt ++;

			return cnt;
		}, 0);

		return cnt;
	}


	// =====================================

	getLogStorageSummary() {

		var summary;

		this.logStorages.forEach(storage =>
			storage.type == "LogStorage" && (summary = storage.getSummary(summary))
		);

		return summary;
	}

}




Area.Items = function(area) {

	this.area = area;
	this.bySpecName = {};
}


Object.assign( Area.Items.prototype, {

	getItemsBySpecName(specName) {

		var items = this.bySpecName[ specName ];

		if (!items)
			items = this.bySpecName[ specName ] = [];

		return items;
	},


	addItem(item) {

		var items = this.getItemsBySpecName(item.spec.name);

		items.push(item);
	},


	removeItem(item) {

		var items = this.getItemsBySpecName(item.spec.name);

		if (!items)
			return;

		Util.removeElement(items, item);
	},

});




Area.ContainerPlacements = function(area) {

	this.area = area;
	this.array = [];
	this.eventSource = new EventSource;
}


Object.assign(Area.ContainerPlacements.prototype, {

	find(fn) { return this.array.find(fn) },

	forEach(fn) { return this.array.forEach(fn) },


	push(cP) {

		console.assert( cP instanceof ContainerPlacement );

		this.array.push(cP);

		cP.addListener( "Area_CP", () => this.eventSource.runEvent("addPlacement") );
	},


	remove(cP) {

		Util.removeElement( this.array, cP );
		cP.removeListener( "Area_CP" );
		this.eventSource.runEvent("removePlacement");
	},


	minDistanceTo(v) {

		return this.array.reduce( (min, cP) => Math.min(min, cP.position.distanceTo(v)), Infinity );
	},

});





Area.Surface = function(area) {

	this.area = area;

	this.horizontalMatName = "ground_grass_05";
	//this.horizontalMatName = "ground051";
	this.verticalMatName = "rock_04";

	this._areaBorderBlockingMesh = null;

	this._horizontalTiles = [];
}


Object.assign(Area.Surface.prototype, {

	update() {
		this.createSurfaceMeshes();
	},


	createSurfaceMeshes() {

		this.removeSceneMeshes();

		var meshV = this.createSurfaceMeshVertical("surfaceVertical");
		scene.add(meshV);

		var meshH = this.createSurfaceMeshHorizontal("surfaceHorizontal");
		scene.add(meshH);
	},


	removeSceneMeshes() {

		var obj;

		if ( (obj = scene.getObjectByName("surfaceVertical")) )
			scene.remove(obj);

		if ( (obj = scene.getObjectByName("surfaceHorizontal")) )
			scene.remove(obj);
	},


	createSurfaceGeometry(rect, stepX, stepY, h0 = 0, h1 = 0, h2 = 0, h3 = 0, backsidePts) {

		if ( !(!rect.isEmpty() && stepX > 0 && stepY > 0) )
			return Report.warn("bad args", `rect=${rect} stepX=${stepX} stepY=${stepY}`);

		var position = [],
			uv = [];

		var xOdd = false, yOdd = false;

		for (let x0 = rect.minX; x0 < rect.maxX; x0 += stepX) {
			let x1 = x0 + stepX;

			for (let y0 = rect.minY; y0 < rect.maxY; y0 += stepY) {
				let y1 = y0 + stepY;

				position.push(
					x0, h0, y0,  x0, h1, y1,  x1, h2, y1,
					x0, h0, y0,  x1, h2, y1,  x1, h3, y0
				);

				uv.push(0, 0, 0, 1, 1, 1,  0, 0, 1, 1, 1, 0);

				yOdd = !yOdd;
			}
			xOdd = !xOdd;
		}


		if (backsidePts) {
			console.assert(Array.isArray(backsidePts) && backsidePts.length === 3 * 6);
			position.push(...backsidePts);
			// fog is computed wrong on long tris; 1e-4 pixelated
			uv.push(0, 0, 1e-3, 0, 1e-3, 1e-3,  0, 0, 1e-3, 0, 1e-3, 1e-3);
			//uv.push(...new Array(12).fill(0)); // +some 0-uv glitches
		}

		var geometry = new THREE.BufferGeometry;
		geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(position), 3));
		geometry.setAttribute("uv", new THREE.BufferAttribute(Float32Array.from(uv), 2));

		//geometry.setAttribute("uv2", new THREE.BufferAttribute(Float32Array.from(uv), 2));

		geometry = Util.mergeVertices(geometry);
		geometry.computeVertexNormals();

		geometry.computeBoundingBox();
		return geometry;
	},


	createSurfaceMeshVertical(meshName) {

		var rect = this.area.rect;
		var step = 50,
			angle = 55,
			borderHeight = step * Math.sin(Math.PI / 180 * angle),
			borderWidth = step * Math.cos(Math.PI / 180 * angle);

		var geomE = this.createSurfaceGeometry(new Rectangle(rect.minX - borderWidth, rect.minY - borderWidth,
					rect.minX, rect.maxY + borderWidth),
				borderWidth, step,
				borderHeight, borderHeight, 0, 0,
				(() => {
					var x = rect.minX - borderWidth,
						y1 = rect.minY - borderWidth - 1,
						y0 = rect.maxY + borderWidth + 1,
						h = borderHeight;
					return [ x, 0, y0, x, h, y0, x, h, y1,  x, 0, y0, x, h, y1, x, 0, y1 ];
				})()
			);

		var geomS = this.createSurfaceGeometry(new Rectangle(rect.minX - borderWidth, rect.minY - borderWidth,
					rect.maxX + borderWidth, rect.minY),
				step, borderWidth,
				borderHeight, 0, 0, borderHeight,
				(() => {
					var x0 = rect.minX - borderWidth - 1,
						x1 = rect.maxX + borderWidth + 1,
						y = rect.minY - borderWidth,
						h = borderHeight;
					return [ x0, 0, y, x0, h, y, x1, h, y,  x0, 0, y, x1, h, y, x1, 0, y ];
				})()
			);

		var geomW = this.createSurfaceGeometry(new Rectangle(rect.maxX, rect.minY - borderWidth,
					rect.maxX + borderWidth, rect.maxY + borderWidth),
				borderWidth, step,
				0, 0, borderHeight, borderHeight,
				(() => {
					var x = rect.maxX + borderWidth,
						y0 = rect.minY - borderWidth - 1,
						y1 = rect.maxY + borderWidth + 1,
						h = borderHeight;
					return [ x, 0, y0, x, h, y0, x, h, y1,  x, 0, y0, x, h, y1, x, 0, y1 ];
				})()
			);

		var geomN = this.createSurfaceGeometry(new Rectangle(rect.minX - borderWidth, rect.maxY,
					rect.maxX + borderWidth, rect.maxY + borderWidth),
				step, borderWidth,
				0, borderHeight, borderHeight, 0,
				(() => {
					var x1 = rect.minX - borderWidth - 1,
						x0 = rect.maxX + borderWidth + 1,
						y = rect.maxY + borderWidth,
						h = borderHeight;
					return [ x0, 0, y, x0, h, y, x1, h, y,  x0, 0, y, x1, h, y, x1, 0, y ];
				})()
			);


//			Util.mergeGeometries([ geomN ]), "aerial_rocks_02", true); // <- destroys bbox
//			geomN, "aerial_rocks_02", true); // <- no frustum-bbox check


		var meshV = ItemDisplay.createMeshForDisplay(meshName,
			Util.mergeGeometries([ geomS, geomE, geomW, geomN ]),
			this.verticalMatName, true, true);

		meshV.renderOrder = 1e5 + 1;
		meshV.matrixAutoUpdate = false;
		meshV.frustumCulled = false;
		meshV.castShadow = true;
		meshV.receiveShadow = true;

		return meshV;
	},


	createHorizontalTiles() {

		this._horizontalTiles.length = 0;

		var rect = this.area.rect.clone().enlarge(0.1); // MSAA artefacts (seen w/ .01)
		var size = 50;
		var countX = Math.ceil(rect.getWidth() / size);
		var countY = Math.ceil(rect.getHeight() / size);

		for (let addrY = 0; addrY < countY; addrY++)

			for (let addrX = 0; addrX < countX; addrX++) {

				let tile = new Area.Surface.HorizontalTile(

					this.area,
					new Rectangle(
						rect.minX + addrX * size, rect.minY + addrY * size,
						rect.minX + addrX * size + size, rect.minY + addrY * size + size
					),
					!!(addrX & 1),
					!!(addrY & 1),
				);

				this._horizontalTiles[ addrY * countX + addrX ] = tile;
			}
	},


	createSurfaceMeshHorizontal(meshName) {

		this.createHorizontalTiles();

		var geometry = Util.mergeGeometries(
			this._horizontalTiles.map(tile => tile.get3DGeometry())
		);

		geometry = Util.mergeVertices(geometry);

		geometry.computeVertexNormals();

		var meshH = ItemDisplay.createMeshForDisplay(meshName,
			geometry, this.horizontalMatName, true, true);

		meshH.renderOrder = 1e5 + 100; // after cameraDrag marker
		meshH.matrixAutoUpdate = false;
		meshH.frustumCulled = false;
		meshH.castShadow = false;
		meshH.receiveShadow = true;

		return meshH;
	},


	getAreaBorderBlockingMesh(radiusClass) {

		return this._areaBorderBlockingMesh
			|| (this._areaBorderBlockingMesh = this._getAreaBorderBlockingMesh(radiusClass));
	},


	_getAreaBorderBlockingMesh(radiusClass) {

		var r = Unit.RadiusClass[radiusClass];
		console.assert(r > 0);

		var rect = this.area.rect;

		var polygons = [
			Polygon.from2Points(rect.minX, rect.minY, rect.maxX, rect.minY, r), // b.
			Polygon.from2Points(rect.minX, rect.maxY, rect.maxX, rect.maxY, r), // t.
			Polygon.from2Points(rect.minX, rect.minY, rect.minX, rect.maxY, r),
			Polygon.from2Points(rect.maxX, rect.minY, rect.maxX, rect.maxY, r),
		];

		var mesh = new THREE.Mesh(
			Util.mergeGeometries(polygons.map(p => HelperGeometry.getFlatPolygon(p))),
			Assets.materials.flatPolygon
		);

		mesh.matrixAutoUpdate = false;
		mesh.name = "Blocking AreaBorder";
		mesh.renderOrder = -100;

		return mesh;
	},

}); // Area.Surface.prototype




Area.Surface.HorizontalTile = function(area, rect, uvFlipX, uvFlipY) {

	this.area = area;
	this.rect = rect;
	this.uvFlipX = uvFlipX;
	this.uvFlipY = uvFlipY;

	this.basePolygon = Polygon.fromRectangle(rect);
}


Object.assign(Area.Surface.HorizontalTile.prototype, {

	get3DGeometry() {

		var polygons = this.area.spatialIndex.getCollidingItemsUsingShape(0, this.rect, 0,
			item => item.isHole()
		).map( item => item.getPolygon() );
/*
		var mP = Polygon.getDifferenceMultiPolygon(this.basePolygon, polygons);

		var position = [];

		mP.forEach(geoJSONPolygon => {

			geoJSONPolygon.forEach(ring => Polygon.handleSelfClosingRing(ring));

			let data = earcut.flatten(geoJSONPolygon);

			let trianglePoints = earcut(data.vertices, data.holes, data.dimensions);

			HelperGeometry.addToPositionArrayFromEarcutResult(trianglePoints, data.vertices, 0, position);
		});
*/

		var geometry = this.basePolygon.getGeometryFromDifference(polygons);

		var positionArray = geometry.attributes.position.array;
		var nVertices = positionArray.length / 3;
		var uv = new Float32Array(nVertices * 2);

		for (let i = 0; i < nVertices; i++) {

			let	u = (positionArray[i * 3] - this.rect.minX) / this.rect.getWidth(),
				v = (positionArray[i * 3 + 2] - this.rect.minY) / this.rect.getHeight();

			uv[i * 2] = this.uvFlipX ? 1 - u : u;
			uv[i * 2 + 1] = this.uvFlipY ? 1 - v : v;
		}

/*
		var geometry = new THREE.BufferGeometry;

		geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(position), 3));
*/
		geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

		return geometry;
	},

});




Area.Activity = function() {

	this.attemptTimeout = 20;

	this.targets = {};
	this.attempts = {};

	[ "log", "tree" ]

		.forEach(type => {
			this.targets[type] = Object.create(null);
			this.attempts[type] = Object.create(null);
		});

	this.sprng = new Util.SeedablePRNG;
}


Object.assign(Area.Activity.prototype, {
/*
	registerTarget(type, item, unitId) {
		console.assert(unitId);
		this.targets[type][item.id] = unitId;
	},

	clearTarget(type, item) {
		if (item)
			delete this.targets[type][item.id];
	},


	getTargetedBy(type, item, unitId) {

		if (!item)
			return;

		var hasUnitId = this.targets[type][item.id];

		if (hasUnitId && hasUnitId !== unitId)
			return Item.byId(hasUnitId);
	},
*/

	registerAttempt(type, item) {

		this.attempts[type][item.id] = Engine.time
			+ this.attemptTimeout * (0.75 + this.sprng.random(0.5));
	},


	clearAttempt(type, item) {

		if (item)
			delete this.attempts[type][item.id];
	},


	checkAvailable(type, item, unitId) {

		var t = this.attempts[type][item.id];
		if (t > Engine.time - this.attemptTimeout)
			return false;

		var hasUnitId = this.targets[type][item.id];
		if (!hasUnitId || hasUnitId === unitId)
			return true;
	},

});



export { Area };

