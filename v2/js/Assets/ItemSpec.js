

class ItemSpec {

	constructor(data) {

		this.name = data.name;
		this.id = data.id;
		this.flags = data.flags |0;
		this.y0 = data.y0 || 0;
		this.type = data.type || ""; // "log", "stump" etc (ItemSpecData or auto-generated)

		this.data = data;

		this._displayContainer = undefined;
		this._cBody = undefined;

		this.tree = null;

		this._mesh = null;
		this._polyhedron = undefined;
	}


	toString() { return `[ItemSpec id=${this.id} name="${this.name}"]`; }

	get geometry() { console.error(`geometry`); }

	get inv() { console.error(`inv`); }


	static create(data, arg) {

		if ( !(data.id > 0 ) ) {

			if (arg.allowWithoutId)
				data.id = ItemSpec._nextId ++;
			else
				return Report.warn("no id", `name="${data.name}" flags=${data.flags}`, data);
		}

		if ( !(data.name && Number.isInteger(data.flags || 0)) )
			return Report.warn("bad data", `name="${data.name}" flags=${data.flags}`, data);

		if (data.name.length > 32)
			return Report.warn("name is too long", `name="${data.name}"`);

		if (ItemSpec.byId[data.id] || ItemSpec.byName[data.name])
			return Report.warn("already exists", `id=${data.id} name="${data.name}"`);


		var itemSpec = new ItemSpec(data);

		if (data.tree && typeof TreeSpec != "undefined")
			itemSpec.tree = TreeSpec.create(itemSpec);

		ItemSpec.byId[itemSpec.id] = itemSpec;
		ItemSpec.byName[itemSpec.name] = itemSpec;

		return itemSpec;
	}


	static createAll( dataArray = ItemSpecData.getAll(), arg = {} ) {

		dataArray.forEach(data => {

			try {
				ItemSpec.create(data, arg);

			} catch (e) {
				Report.warn(`ItemSpec not created, data.name=${data && data.name}`, e);
			}
		});
	}


	static get(id) {

		var spec =
			typeof id == "number" ? ItemSpec.byId[id] :
			(id instanceof ItemSpec) ? id :
			ItemSpec.byName[id];

		if (!spec)
			Report.warn("itemSpec not found", `specId="${id}"`);

		return spec;
	}

/*
	isCustomItem() { return this.data.entity == "customItem" || this.data.entity == "baseCenter" }


	static isCustomItem(specId) {

		var spec = this.get(specId);

		return spec && spec.isCustomItem();
	}
*/

	static getAll() { return Object.values(ItemSpec.byName) }


	getDisplayContainer() { // If no displayContainer: don't display it.

		if (!this._displayContainer)
			this._displayContainer = this._createDisplayContainer() || false;

		return this._displayContainer;
	}


	_createDisplayContainer() {

		var getWeight = g => {
			return g.index ? g.index.array.length / 3
				: g.attributes.position.array.length / 3;
		}

		if ((this.flags & ItemSpec.flags.UNIT) !== 0)
			return;


		var geometry = this.data.geometry;

		var rect = new Rectangle;
		var box = new THREE.Box3;

		var matNames = [],
			weights = [];

		if (this.data.displayBox) {

			console.assert(Array.isArray(this.data.displayBox));

			let [ size, matNamesIn, weightsIn ] = this.data.displayBox;

			if (!Array.isArray(size))
				size = [ size, size, size ];

			console.assert(Array.isArray(matNamesIn) && Array.isArray(weightsIn));

			rect.set(-size[0], -size[0], size[2], size[2]);
			box.min.set(-size[0], 0, -size[2]); // If there's Z then Y is up
			box.max.set(size[0], size[1], size[2]);

			matNames.push(...matNamesIn);
			weights.push(...weightsIn);


		} else if (this.data.displayRectGeometry || geometry || this.data.cBody2D) {

			geometry = this.data.displayRectGeometry || geometry || this.data.cBody2D.geometry;

			if ( !(geometry instanceof THREE.BufferGeometry) )
				Report.warn("bad geometry", `${geometry}`);


			if (!geometry.boundingBox)
				geometry.computeBoundingBox();

			//rect.expandByBox3(geometry.boundingBox);
			box.union(geometry.boundingBox);

			let posArray = geometry.attributes.position.array;
			let maxDistSq = 0;

			for (let i = 0, len = posArray.length; i < len; i += 3)
				maxDistSq = Math.max( maxDistSq, Util.hypotSq(posArray[i], posArray[i + 2]) );

			let d = Math.sqrt(maxDistSq);

			rect.expand(-d, -d, d, d);


			matNames[0] = this.data.matName;
			weights[0] = getWeight(geometry); // matWeights is avail.


		} else if (this.data.mesh) {
/*
			this.data.mesh.traverse(m => {
				if (!m.geometry)
					return;

				rect.expandByBox3(m.geometry.boundingBox);
				box.union(m.geometry.boundingBox);

				if (!m.material.name) {
					//console.error(`specData.name="${specData.name}": material w/o name`);

				} else {
					let i = matNames.indexOf(m.material.name);
					if (i != -1) {
						weights[i] += getWeight(m.geometry);

					} else {
						matNames.push(m.material.name);
						weights.push(getWeight(m.geometry));
					}
				}
			});
*/
			return Report.warn("mesh n/a", `${this}`);


		//} else if (this.data.hasNonMergeableGeometry) {
/*
			rect.set(0, 0, 0, 0);
			box.min.set(0, 0, 0);
			box.max.set(0, 0, 0);
*/
		} else
			return Report.warn("displayContainer: no displayBoxSize, geometry or cBody2D", `${this}`);


		if (rect.isEmpty() || box.isEmpty())
			return Report.warn("empty rect", `${this}`);

		if (!matNames.length)
			return Report.warn("no materials", `${this}`);


		if (matNames.length !== weights.length || weights.some(w => w <= 0)) {
			Report.warn("bad weights", `${this}`);
			weights = matNames.map(mat => 100);
		}


		if (!this.data.displayBox) {

			box.expandByRotationY();
			//already rect.expandByRotation();
		}


		return { rect, box, matNames, weights };
	}


	displayWeightByMatName(matName) {

		var displayContainer = this.getDisplayContainer();
		var weights = displayContainer && displayContainer.weights;

		if (weights)
			return matName
				? weights[ displayContainer.matNames.indexOf(matName) ]
				: weights.reduce((accum, w) => accum += w, 0);
	}


	getCBody() {

		if (this._cBody === undefined)
			this._cBody = this._createCBody();

		return this._cBody;
	}


	_createCBody() {

		var data = this.data;
		var basePolygon, radius, height;

		if ('polygon' in data) {

			if ( !(data.polygon instanceof Polygon) )
				return Report.warn("bad polygon", `${data.polygon}`);

			console.assert( !('radius' in data) );
			console.assert( !('height' in data) );

			basePolygon = data.polygon.clone();

			basePolygon.forceCCW(true);

			radius = basePolygon.getBoundingCircle().radius;
			height = basePolygon.height;

		//
		// cBody is defined as circular one.
		// Create basePolygon inscribed into the circle.
		//
		} else if ('radius' in data) {

			//bad! this.flags |= ItemSpec.flags.CIRCULAR;

			radius = data.radius;
			height = data.height;

			if ( !(height > 0) )
				return Report.warn("bad height", `${this}`);

			basePolygon = Polygon.createRegularConvex(radius, true, height);


		} else if ( ('cBody2D' in data) ) {//&& (data.cBody2D instanceof THREE.LineSegments) ) {
/*
			// cBody2D instanceof BufferGeometry - below

			if (!data.height)
				return Report.warn("cBody2D / LineSegments: provide height", `${this}`);

			basePolygon = Polygon.createFromLineSegments(data.cBody2D, data.height);
			if (!basePolygon)
				return Report.warn("no basePolygon from LineSegments", `${this}`);

			basePolygon.forceCCW(true);

			radius = basePolygon.getBoundingCircle().radius;
			height = basePolygon.height;
*/
			return ItemSpec.createCBodyFromLineSegments( data.cBody2D, data.height, `${this}` );

		//
		// create basePolygon from 3D geometry.
		//
		} else {
/*
			var geometry;

			if ('cBody2D' in data) { // Regular 3D geometry: create convex polygon

				if ( !(data.cBody2D instanceof THREE.BufferGeometry))
					return Report.warn("bad cBody2D", `${this}`);

				geometry = data.cBody2D;

			} else
				geometry = data.geometry;// || (specData.mesh && specData.mesh.geometry);
*/

			var geometry = data.geometry;

			if (!geometry)
				return Report.warn("no geometry", `${this}`);

			basePolygon = ItemSpec.createPolygonFrom3DGeometry(geometry, undefined, data.name);
			if (!basePolygon)
				return Report.warn("no basePolygon", `${this}`);

			if ('cBody2D' in data)
				basePolygon.height = data.height;

			radius = basePolygon.getBoundingCircle().radius;
			height = basePolygon.height;
		}


		if ('height' in data)
			basePolygon.height = data.height;

		if (this.type == 'log') {

			height *= 2;
			basePolygon.height *= 2;
		}

		return ItemSpec.createCBody( radius, height, basePolygon );
	}



	static createCBody( radius, height, basePolygon ) {

		var polygonByRC = Array.from(Unit.ItemPolygonByRC).map((el, i) => {

			var polygon = basePolygon.getEnlarged(Unit.distanceByRC(i));
			return polygon;
		});

		return { radius, height, polygonByRC };
	}


	static createCBodyFrom3DGeometry(geometry) {

		var basePolygon = ItemSpec.createPolygonFrom3DGeometry(geometry);

		return this.createCBody(
			basePolygon.getBoundingCircle().radius,
			basePolygon.height,
			basePolygon
		);
	}


	static createCBodyFromLineSegments( lineSegmentsGeometry, height, name ) {

		// it's THREE.BufferGeometry
		//if ( !(lineSegmentsGeometry instanceof THREE.LineSegments) )
		//	return Report.warn("not LineSegments", lineSegmentsGeometry);

		if (typeof height != 'number')
			return Report.warn("createCBodyFromLineSegments: bad height", `h=${height} ${name}`);

		var basePolygon = Polygon.createFromLineSegments(lineSegmentsGeometry, height);

		if (!basePolygon)
			return Report.warn("no basePolygon from LineSegments", `${name}`);

		basePolygon.forceCCW(true);

		return this.createCBody(
			basePolygon.getBoundingCircle().radius,
			basePolygon.height,
			basePolygon
		);
	}


	static createPolygonFrom3DGeometry(geometry, radiusClass, name) {

		if (!geometry)
			return;

		var polygon = Polygon.createPointSetFrom3DGeometry(geometry).getConvexHull();

		if (!polygon
				|| !polygon.fixShortEdges(0.01)//, name)
				|| !polygon.fixAcuteAngles(undefined, name))
			return;

		return polygon.enlarge(Unit.distanceByRC(radiusClass));
	}


	createPolygon(x, y, facing = 0, radiusClass = Unit.RadiusClassBase) {

		var cBody = this.getCBody();

		return cBody && cBody.polygonByRC[radiusClass].clone().rotate(facing).translate(x, y);
	}


	static createPolygonFromCBody(cBody, x, y, facing = 0, radiusClass = Unit.RadiusClassBase) {

		return cBody.polygonByRC[radiusClass].clone().rotate(facing).translate(x, y);
	}


	setupMMCtxPolygonDraw(ctx) {

		var textureName = this.getMMTextureName();

/*
TODO? (v2+) pattern x4
var w = size;cc.width = w*2; cc.height = w; tCtx.drawImage(img, 0, 0, w, w);
tCtx.setTransform(-1,0,0,1,w*2,0); tCtx.drawImage(img, w* 2, 0, w, w);
var pat = tCtx.createPattern(cc,"repeat") to use ctx.fillStyle = pat
*/

// TODO? cache patterns

		if (textureName) {

			let pattern = ctx.createPattern(Assets.textures[ textureName ].image, "repeat");
			ctx.fillStyle = pattern;
			return;
		}

		if (this.data.isHole) {

			ctx.fillStyle = "#342400";
			return;
		}

/*
		if (this.data.entity == "baseCenter") {

			ctx.fillStyle = "#d0b705";
			return;
		}

		ctx.fillStyle = "#b5b5f3";
*/
		ctx.fillStyle = "#d0b705";
	}


	getMMTextureName() {

		switch ( this.getMatName() ) {

			case "rock_04": return "rock_04_mm";
			case "rock_06": return "rock_06_mm";
		};

		//if (this.data.isHole)
		//	return "ground051_128"; -brightness
	}


	getMatName() {
		return this.data.matName || this.name;
	}


	addSkinToGeometryIfRequired(geometry, matName) {

		if (geometry.attributes.skinIndex)
			return;

		if ( !(0
			|| matName == 'baseCenterSkinned'
			|| matName == 'fenceSkinned'
		) )
			return;

		Util.addSkinToGeometry(geometry);
	}


	getMesh() {

		if (!this._mesh) {
			console.assert(!this.tree);
			
			//if (this.data.features)
			//	Report.warn("ItemSpec.getMesh w/ features", `${this}`);

			this.addSkinToGeometryIfRequired(this.data.geometry, this.getMatName());

			this._mesh = ItemSpec.createDummyMesh(this.name, this.data.geometry, this.getMatName());

			if (this.data.customOnBeforeRender) {
				this._mesh.userData.customOnBeforeRender = this.data.customOnBeforeRender;
			}
		}

		return this._mesh;
	}

/*
	getGeometryEquip() {

		var g = this.data.geometry.userData.equipGeometry;
		if (g)
			return g;

		var slotName = this.getEquipSlotName();
		if (!slotName)
			Report.warn("no equip slot", `${this}`);

		console.assert(slotName == "weapon");

		g = this.data.geometry.clone();
		g.name += ` equip ${slotName}`;
		g.applyMatrix4(ItemSpec.equipWeaponMatrix);

		Util.addSkinToGeometry(g, 13); // Right Hand

		this.data.geometry.userData.equipGeometry = g;
		return g;
	}
*/

	getPolyhedronBase() {

		var p = this._polyhedronBase;

		if (p !== undefined)
			return p;

		p = null;

		if ('polyhedron' in this.data) {

			if ( !(this.data.polyhedron instanceof Polyhedron) ) {

				Report.warn("bad polyhedron", `${this}`);
				return (this._polyhedronBase = null);
			}

			p = this.data.polyhedron;


		} else if ('cBody3D' in this.data) {

			let mesh = this.data.cBody3D;

			if ( ! (mesh instanceof THREE.Mesh) ) {

				Report.warn("bad cBody3D", `${this} | ${mesh && mesh.prototype.constructor.name}`);
				return (this._polyhedronBase = null);
			}

			// shared w/ display geometry during development
			//delete geometry.attributes.normal;
			//delete geometry.attributes.uv;

			p = Polyhedron.fromGeometry(mesh.geometry, `${this.name} cBody3D`);
			p.mergeFaces();
		}


		if (!p && this.tree)
			p = this.tree.getCollisionPolyhedron();


		return (this._polyhedronBase = p);
	}


	getFreeSpacePolygonBase() {

		var polygon = ItemSpec._freeSpacePolygonBase_bySpecName[ this.name ];

		if (polygon !== undefined)
			return polygon;

		polygon = null;

		if ('freeSpace' in this.data) {

			polygon = Polygon.createFromLineSegments(this.data.freeSpace, 0, `freeSpace-${this.name}`);

			if (!polygon) {
				Report.warn("no freeSpacePolygonBase", `${this}`);
				polygon = null;
			}
		}
		
		return ( ItemSpec._freeSpacePolygonBase_bySpecName[ this.name ] = polygon );
	}

/*
	getCSPolygonBase() {

		var polygon = ItemSpec._cSPolygonBase_bySpecName[ this.name ];

		if (polygon !== undefined)
			return polygon;

		polygon = null;

		if ('cSGeometry' in this.data) {

			polygon = Polygon.createFromLineSegments(this.data.cSGeometry, 0, `cSGeometry-${this.name}`);

			if (!polygon) {
				Report.warn("no cSPolygonBase", `${this}`);
				polygon = null;
			}
		}
		
		return ( ItemSpec._cSPolygonBase_bySpecName[ this.name ] = polygon );
	}
*/

	// *******************************
	//
	//     CustomItem
	//
	// *******************************

	getFeatureConfByName(fName) { return this.data.features.find(f => f.name === fName) }


	addToIncompat(fName, value1Name, incompat) {

		var conf = this.getFeatureConfByName(fName);
		if (!conf)
			return Report.warn("no conf", `${this} ${fName} ${value1Name}`);

		var value1Conf = conf.value1Conf.find(v1Conf.name === value1Name);
		if (!value1Conf)
			return Report.warn("no value1Conf", `${this} ${fName} ${value1Name}`);

		if (v1Conf.incompat)
			v1Conf.incompat.forEach(elem => incompat.push(elem));
	}


	getFeatureValue1Objects(fName, opt = "", incompat) {

		var conf = this.getFeatureConfByName(fName);
		if (!conf)
			return Report.warn("no conf", `${this} ${fName} ${value1Name}`);

		var result = [];

		conf.value1Conf.forEach(v1Conf => {

			if (opt == "noCostCrystals" && v1Conf.affects
					&& v1Conf.affects.find(obj => obj.affects == "costCrystals") )
				return;

			if (incompat && v1Conf.incompat && incompat.some(el => v1Conf.incompat.indexOf(el) !== -1))
				return;

			result.push(v1Conf);
		});

		return result;
	}


	getFeatureValue1ObjectsWithWeights(fName, opt = "", incompat, weights) {

		var conf = this.getFeatureConfByName(fName);
		if (!conf)
			return Report.warn("no conf", `${this} ${fName} ${value1Name}`);

		var result = [];

		conf.value1Conf.forEach(v1Conf => {

			if (opt == "noCostCategoryHigh" && v1Conf.costCategory == "high")
				return;

			if (v1Conf.affects && v1Conf.affects.find(obj => obj.affects == "costCrystals") )
				return;

			if (incompat && v1Conf.incompat && incompat.some(el => v1Conf.incompat.indexOf(el) !== -1))
				return;

			if (weights)
				weights.push(v1Conf.appearWeight || 1);

			result.push(v1Conf);
		});

		return result;
	}


	generateFeatureData(typeName, value1Name, prng, option) {

		//if (!this.isCustomItem())
		//	return Report.warn("!customItem", `${this}`);

		var featureConf = this.data.features.find(f => f.name === typeName);
		var value1Conf = featureConf && featureConf.value1Conf.find(v1 => v1.name === value1Name);

		if (!value1Conf)
			return Report.warn("no value1Conf", `${this} ${typeName} ${value1Name}`);

		var fData = {
			typeId: featureConf.typeId,
			value1: value1Conf.value1,
		};

		if (value1Conf.value2)
			fData.value2 = this.generateFeatureValue2(value1Name, value1Conf.value2, prng, option);

		return fData;
	}


	generateFeatureValue2(value1Name, value2Conf, prng = new Util.SeedablePRNG, option) {

		var	start = value2Conf.range[0],
			end = value2Conf.range[1];

		if (option == "minValue")
			return start;


		var isInteger = Number.isInteger(start) && Number.isInteger(end);

		if (!isInteger && value2Conf.expIncreaseAfter)
			Report.warn("not supported", `${this} ${value1Name}`);


		if (option == "mediumDefinite") {

			if (value2Conf.expIncreaseAfter)
				return Math.max(start, value2Conf.expIncreaseAfter - 2);

			return isInteger ? Math.ceil((start + end) / 2) : (start + end) / 2;
		}


		if (option == "goodDefinite") {

			if (value2Conf.expIncreaseAfter)
				return Math.floor( (2 * value2Conf.expIncreaseAfter + end) / 3 );

			return isInteger ? Math.ceil((start + 2 * end) / 3) : (start + 2 * end) / 3;
		}


		// Now w/ probability
		var min = start, max = end;

		if (option == "good") {

			if (!isInteger)
				return prng.randIntervalClosed( (start + end) / 2, (start + 3 * end) / 4 );

			if (value2Conf.expIncreaseAfter)
				min = Math.ceil( 0.3 * start + 0.7 * value2Conf.expIncreaseAfter );
			else
				min = Math.ceil( 0.5 * start + 0.5 * end );
		}

		if (option == "veryGood") {

			if (!isInteger)
				return prng.randIntervalClosed( 0.7 * start + 0.3 * end, end );

			if (value2Conf.expIncreaseAfter)
				min = Math.min( value2Conf.expIncreaseAfter + 1, end );
			else
				min = Math.ceil( 0.7 * start + 0.3 * end );
		}


		if (!isInteger)
			return prng.randIntervalClosed(start, end);

		return this.generateFeatureValue2_prob(prng, value2Conf, min, max);
	}



	generateFeatureValue2_prob(prng, value2Conf, min, max) {

		if (!value2Conf.expIncreaseAfter)
			return prng.randIntegerIntervalClosed(min, max);

		var	expBase = value2Conf.expBase || 1,
			expFactor = value2Conf.expFactor || 0.5;

		var v;

		if (value2Conf.expIncreaseAfter < min) {

			v = min;

		} else {

			v = prng.randIntegerIntervalClosed(min, value2Conf.expIncreaseAfter + expBase);

			if (v <= value2Conf.expIncreaseAfter)
				return v;

			v = value2Conf.expIncreaseAfter + 1;
		}

		for (let i = v; i <= max; i++)

			if (prng.random() < expFactor)
				return i;

		return v;
	}


	// ItemSpec.get("axeCustom1b").testFeatureValue2("handleShape", "handle1h")
	// ItemSpec.get("axeCustom1b").testFeatureValue2("handleMat", "paintedRed")

	testFeatureValue2(typeName, value1Name, prng = new Util.SeedablePRNG) {

		//if (!this.isCustomItem())
		//	return Report.warn("!customItem", `${this}`);

		var featureConf = this.data.features.find(f => f.name === typeName);
		var value1Conf = featureConf && featureConf.value1Conf.find(v1 => v1.name === value1Name);

		if (!value1Conf)
			return Report.warn("no value1Conf", `${this} ${typeName} ${value1Name}`);


		var value2Conf = value1Conf.value2;

		var byV2 = {};

		for (let i = 0; i < 1e6; i++) {

			var v2 = this.generateFeatureValue2(value1Name, value2Conf, prng);

			byV2[v2] = (byV2[v2] || 0) + 1;
		}

		return byV2;
	}



	// =============================================
	//
	//   Item Is In Inventory or maybe char equip.
	//
	// =============================================

	getInv() { return this.data.inv; }


	getDisplay2DSize() {

		var inv = this.getInv();
		if (!inv)
			return [ 256, 256 ];

		switch(inv.size) {
			case 42: return [ 256, 512 ];
			case 22: return [ 256, 256 ];
			case 11:
			default: return [ 128, 128 ];
		};
	}


	getEquipSlotName() {
		var inv = this.getInv();
		return inv && inv.slot;
	}

	getInventorySize() {
		var inv = this.getInv();
		return inv && inv.size || 11;
	}

	getInvCellsX() { return this.getInventorySize() % 10; }

	getInvCellsY() { return Math.floor(this.getInventorySize() / 10); }

	getInvCellsXY() { return [ this.getInvCellsX(), this.getInvCellsY() ]; }



	static createDummyMesh(name, geometry, matName, isUnique) { // for intermediate containers.

		console.assert(!geometry || (geometry instanceof THREE.BufferGeometry) );

		var mesh = new THREE.Mesh(geometry, ItemSpec.dummyMaterial);

		mesh.userData.dummy = true;
		mesh.name = name;
		mesh.userData.matName = matName;
		mesh.userData.isUnique = !!isUnique;

		return mesh;
	}
}


Object.assign(ItemSpec, {

	byId: Object.create(null),
	byName: Object.create(null),

	_freeSpacePolygonBase_bySpecName: Object.create(null),
	//_cSPolygonBase_bySpecName: Object.create(null),

	_nextId: 1e8+1,
});


ItemSpec.flags = (() => {

	var f = {

		NONE:			0,

		//NOSELECT:		1, // use data.canSelect
		RAYTRANSPARENT:	2,
		INVENTORY:		4,
		COLLIDING:		8,

		INVISIBLE:		16,
		NOHIGHLIGHT:	32,

		CIRCULAR:		1 * (1 << 8),
		POLYGONAL:		2 * (1 << 8),
	};

	f.INV = f.INVENTORY | f.POLYGONAL;
	f.STATIC = f.COLLIDING;
	f.TREE = f.COLLIDING | f.CIRCULAR;

	return Object.freeze(f);
})();


ItemSpec.equipWeaponMatrix = (() => {

	var obj = new THREE.Object3D;
	obj.position.set(-0.887, 1.36, 0.25);
	obj.updateMatrixWorld();
	return obj.matrixWorld;
})();


ItemSpec.dummyMaterial = new THREE.MeshBasicMaterial({ color: 0x90d0f0 });



export { ItemSpec };

