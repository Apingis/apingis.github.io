
import * as MathImportIndex from '../Math/MathImportIndex.js';
MathImportIndex.doImport();

import { EventSource } from '../ItemData/EventSource.js';
import { Util } from '../Util/Util.js';


class Item extends EventSource {

	constructor(spec) {

		super();

		if ( !(spec instanceof ItemSpec) )
			Report.throw("bad itemSpec", `${spec}`);

		this.id = 0;
		this.slotId = null;
		this.spec = spec;

		this.position = new THREE.Vector3;
		this._facing = 0;
		this.quaternion = null;
		//this.matrix = new THREE.Matrix4;
		this.matrixWorld = new THREE.Matrix4;
		this.matrixWorldInverse = new THREE.Matrix4;

		this.createT = 0;
		this.updateT = 0;
		this.positionType = Item.None;

		this.charData = null;
		this.tree = null;
		this.storagePosition = null;
		this.customData = null;

		this.storages = spec.data.storages
			&& spec.data.storages.map( (data, i) => Storage.create(data, this, i) );

		this.containerPlacements = spec.data.containerPlacements
			&& spec.data.containerPlacements.map( (data, i) => new ContainerPlacement(data, this, i) );

		this.inSpatialIndex = false;

		this.dependentOn = null;
		this.dependencyName = '';
		this.dependencyObj = null;
		this.dependencyMatrix = null;
		this.dependentItems = [];

		this.associatedItems = null;

		this.flags = 0 |0; // 16 lower flags saved on server

		this.data = {
		};

		this._itemProps = null;


		if (Main.isServer) {

			this.gId = null;

		} else {

			this.cGroupIds = null;
			this._polygonByRC = Array.from(Unit.ItemPolygonByRC);
			this._spatialContainerByRC = Array.from(Unit.ItemPolygonByRC);

			this._displayRect = new Rectangle;
			this._displayBox = null;
			this._display = null;
		}
//flags
// - inStorage
// - 
//Object.seal(this); <-- Unit etc.
	}


	get char() { console.error(`get char`); }


	toString() {

		//var idStr = "" + (this.id ? ` id=${this.id}` : "");
		var idStr = ` id=${this.id}`;
		var extra = this.isRemoved() ? " REMOVED" : "";
		var slotStr = this.slotId ? ` slot=${this.slotId}` : "";

		return `[${this.spec.name}${idStr}${extra}${slotStr}]`;
	}


	static isTmpId(id) { return id >= 1e8 }

	hasTmpId() { return this.id >= 1e8 }

	static isShopId(id) { return id >= 1e15 }

	hasShopId() { return this.id >= 1e15 }

	getSlot(localKey) { return Local.get(localKey).slots.getById(this.slotId) }


	isChar() { return this.spec.name === "char" }

	isRobot() {}

	isConstructionSite() {}

	isContainer() {}

	isTower() {}

	isRobocenter() {}

	isWoodIntake() {}

	isChainTest() {}

	isUnit() {}

	isAxe() { return this.spec.getEquipSlotName() === "weapon"; }


	hasLogStorage() { return this.storages && this.storages.find(s => s.isLogStorage()) }

	hasShop() { return !!this.getShop() }

	getShop() { return this.storages && this.storages.find(s => s.isShop()) }

	forEachLogStorage(fn) { this.storages && this.storages.forEach(s => s.isLogStorage() && fn(s)) }

	hasContainerPlacements() { return !!this.containerPlacements }

	getContainerPlacements() { return this.containerPlacements }

	forEachContainerPlacement(fn) { this.containerPlacements && this.containerPlacements.forEach(cP => fn(cP)) }


	getAssociatedItems() { return this.associatedItems || Item._emptyArray }

	addAssociatedItem(item) { (this.associatedItems || (this.associatedItems = [])).push(item) }


	//canBeSelected() { return UI.canSelectItem(this) }
	canBeSelected() { return this.spec.data.canSelect }

	canBeHighlight() { return (this.spec.flags & ItemSpec.flags.NOHIGHLIGHT) === 0 }

	canShowLabel2D() { return this.canBeHighlight() }


	isTree() { return false }

	isUnmodifiedTree() { return false }

	isChoppedTree() { return false }

	isFallingTree() { return false }

	isFallenTree() { return false }

	isAxeTarget() { return false }

	isSmallTree() { return false }


	isStump() { return this.spec.type == "stump" }

	isLog() { return this.spec.type == "log" }

	isLogOnTheGround() {
		return this.isLog() && !this.isRemoved()
			&& this.isOn3D() && !this.isInStorage()
			&& Math.abs(this.position.y - this.spec.y0) < 1e-4;
	}

	isBaseCenter() { return this.spec.name == "baseCenter" }

	isCustomItem() { return !!this.customData }

	isHole() { return this.spec.data.isHole }


	isOn3D() { return this.positionType === Item.On3D }


	isCircular() { 
		return !this.isChoppedTree()
			&& (this.spec.flags & ItemSpec.flags.CIRCULAR) !== 0;
	}

	isColliding() {
		return this.isChoppedTree() ? false :
			(this.spec.flags & ItemSpec.flags.COLLIDING) !== 0;
	}

	isRayTransparent() { return (this.spec.flags & ItemSpec.flags.RAYTRANSPARENT) !== 0 }

	isInvisible() { return (this.spec.flags & ItemSpec.flags.INVISIBLE) !== 0 }

	isSelectable() { console.error(`obsolete`);return (this.spec.flags & ItemSpec.flags.NOSELECT) === 0 }

	isPolygonal() { return (this.spec.flags & ItemSpec.flags.POLYGONAL) !== 0 }

	isInStorage() { return !!this.storagePosition }

	isInventoryItem() { return !!this.spec.data.inv } // fits into inventory and maybe char equip.

	isEquipmentItem() { return this.isInventoryItem() && this.spec.data.inv.slot }

	getBaseItem(localKey) {
		var storage = this.getStorage(localKey);
		return storage && storage.baseItem;
	}

	isInShop(localKey) { return window['Shop'] && this.getStorage(localKey) instanceof Shop; }


	isRemoved() { return (this.flags & Item.FLAG_REMOVED) !== 0 }

	setFlagUpdated() { this.flags |= Item.FLAG_UPDATED }

	hasFlagUpdated() { return (this.flags & Item.FLAG_UPDATED) !== 0 }


	isCrumbling() { return this.isStump() || this.isLog() }


	getCrumbleT() {

		var t;

		if (this.isStump()) {
			t = Tree.crumbleTFractionMin * Tree.crumbleT;

		} else if (this.isLog()) {

			const rMin = 0.04, rMax = 0.1;

			let rNorm = (Util.clamp( this.getLogRadius(), rMin, rMax ) - rMin) / (rMax - rMin);

			t = LogSpec.crumbleT * (0.6 + rNorm * 0.4);

		} else {
			Report.warn("getCrumbleT() on non-crumbling", `${this}`);
			t = Infinity;
		}

		return Math.ceil(this.updateT + t);
	}


	// Item color (0..15)

	static checkColor(n) { return n >= 0 && n <= 15 && Number.isInteger(n) }

	checkColor(n) { return n >= 0 && n <= 15 && Number.isInteger(n) }

	getColor() { return this.flags & 15 }

	setColorNorm(n) { this.setColor((n * 16) & 15) }

	setColor(n) {
		console.assert( this.checkColor(n) );
		this.flags &= ~15;
		this.flags |= n & 15;
	}


	getFeatureValue2() { Report.warn("getFeatureValue2 on non-custom"), `${this}` }

	setFeatureValue2() { Report.warn("setFeatureValue2 on non-custom"), `${this}` }


	getLangName() {
		return Lang( this.spec.data.nameKey || this.spec.name );
	}


	getLangDescr() {
		if (this.spec.data.descrKey)
			return Lang(this.spec.data.descrKey);
	}


	getProps() {

		if (this._itemProps)
			return this._itemProps;

		var props = new ItemProps;

		ItemProps.List.forEach(propName => props[ propName ] = this.spec.data[ propName ] || 0);

		return (this._itemProps = props);
	}


	getLogRadius() {

		var r = this.spec.data.logRadius;

		if (!this.isLog() || !(r > 0) ) {
			Report.warn("bad log", `${this} r=${r}`);
			r = 0;
		}

		return r;
	}


	getLogLength() {

		var len = this.spec.data.logLength;

		if ( !(len > 0) ) {
			Report.warn("bad log", `${this} len=${len}`);
			len = 0;
		}

		return len;
	}


	getLogVolume() { return Util.froundVolume(this.getLogLength() * Math.PI * this.getLogRadius() **2) }

	getLogMass() { return Util.froundMass(600 * this.getLogVolume()) }

	getLogCost() { return Util.froundCoins(this.getLogVolume() * LogStorage.PRICE_1M3) }


	getSlotReplacedWith() {
		return this.slotId && this.isRemoved() && this.data.createdPersistent || this;
	}

	static getSlotReplacedWith(item) {
		return item && item.getSlotReplacedWith();
	}



	getCrowdedAreas() {

		if (this.hasLogStorage()) {

			let oPs = [];

			this.forEachLogStorage(storage => oPs.push(...storage.operationPoints) );

			if (oPs.length === 0)
				return Report.warn("logStorage w/ zero oPs", `${this}`);

			let p = new Point(

				oPs.reduce( (x, oP) => x += oP.aP.x, 0 ),
				oPs.reduce( (y, oP) => y += oP.aP.y, 0 )

			).divideScalar(oPs.length);

			let dSqMax = oPs.reduce( (max, oP) => Math.max(max, p.distanceSqTo(oP.aP.x, oP.aP.y)), 0 );

			return [ new Circle(p.x, p.y, Math.sqrt(dSqMax) + 3.25) ];
		}
	}


	selectionType() { 
		return (
			this.isChar() ? 'friend' :
			0 ? 'enemy' : 'neutral'
		);
	}


	setY(y) {

		console.assert(!Main.isServer);

		this.position.y = y;
		this.updateDisplay();

		return this;
	}


	static _createNew(specId) {

		var spec = ItemSpec.get(specId);
		if (!spec)
			return;

		//var name = spec.data.entity;
		//name[0] = name[0].toUpperCase(); // node!

		switch (spec.data.entity) {

			case "axeCustom": return new AxeCustom(spec);
			case "baseCenter": return new BaseCenter(spec);
			case "char": return new Char(spec);
			case "constructionSite": return new ConstructionSite(spec);
			case "container": return new Container(spec);
			case "customItem": return new CustomItem(spec);
			case "robocenter": return new Robocenter(spec);
			case "robot": return new Robot(spec);
			case "tower": return new Tower(spec);
			case "woodIntake": return new WoodIntake(spec);
			case "chainTest": return new ChainTest(spec);
			case "rotor": return new Rotor(spec);
			case "miscItem": return new MiscItem(spec);

			case "":
			case undefined:
				if (spec.data.tree)
					return new Tree(spec);
				else
					return new Item(spec);

			default: Report.warn("unknown entity", `specId=${specId} entity=${spec.data.entity}`);
		};
	}


	setCreateT(t) {

		if (typeof t != "number")
			return Report.warn("createT", `${this} t=${t}`);

		this.createT = t;

		this.setUpdateT(t);
		return this;
	}


	setUpdateT(t) {

		//if (this.hasTmpId() || this.isUnit())

		// many items don't require updateT.

		if (this.slotId)
			return;

		if (this.isUnit()) // used differently.
			return;

		if (typeof t != "number" || t < 0)
			return Report.warn("setUpdateT", `${this} t=${t}`);

		this.updateT = t;

		if (!Main.isServer && this.isCrumbling()) {

			Main.area.events.removeByType(this, "ItemCrumble");

			if (!this.isOn3D() || this.isInStorage())
				return;

			var crumbleT = this.getCrumbleT();

			if (crumbleT <= Engine.time) {
				this.removeItem();
				return this;
			}

			var event = new ItemEvent(this, "ItemCrumble", crumbleT);

			Main.area.events.add(event);
		}

		return this;
	}


	static create(specId, localKey, id) {

		var item = Item._createNew(specId);

		item.id = id;
		Local.get(localKey).enlistItem(item);

		return item;
	}


	static createPersistent(specId, localKey, id) {

		if (id)
			console.error("obsolete");

		var item = Item._createNew(specId);

		item.id = Local.getNextItemId(localKey);
		Local.get(localKey).enlistItem(item);

		return item;
	}


	static createTmp(specId, localKey, id) { // w/o positionData

		if (id)
			console.error("obsolete");

		var item = Item._createNew(specId);

		item.id = Local.get().getNextTmpId();
		Local.get(localKey).enlistItem(item);

		return item;
	}


	// client-only; temporary ID
	static createOn3D(specId, x, y, facing) {

		if (Main.isServer)
			Report.throw("bad call");

		var item = Item.createTmp(specId);

		item.position.set(x || 0, item.spec.y0, y || 0);
		item.facing = facing || 0;

		item.setOn3D(Engine.time);

		item.setCreateT(Engine.time);

		Item.last = item;

		return item;
	}


	createNewFromShopItem(localKey) {

		if (!this.hasShopId())
			return Report.warn("not shopId", `${this}`);

		var itemData = this.toJSON();

		itemData.id = Local.getNextItemId(localKey);
		itemData.storagePosition = null;

		var item = Item.fromJSON(itemData, localKey);

		item.setFlagUpdated();
		item.customData && item.customData.setUpdated();

		return item;
	}


	// Item w/ temporary ID
	static fromSlot(slot, specName, itemCreateT, localKey) {

		if (slot.isModified() || slot.itemId)
			return Report.warn("bad slot op", `${slot}`);

		var item = Item.createTmp(specName, localKey);

		item.position.copy(slot.position);
		item.position.y += item.spec.y0;

		if (slot.quaternion)
			item.useQuaternion(slot.quaternion);
		else
			item.facing = slot.facing;

		// fromSlot, tmpId: createT/updateT unnecessary, not used
		//item.setCreateT(itemCreateT);

		item.slotId = slot.id;
		item.setOn3D(itemCreateT);

		return item;
	}


	static fromSlotPersistent(slotId, specName, t, localKey) {//, id) {

		var slot = Local.get(localKey).slots.getById(slotId);
		if (!slot)
			Report.throw("no slot", `id=${slotId}`);

		if (slot.isModified() || slot.isImmune())
			Report.throw("bad slot op", `${slot}`);

		// Slot events processed before item events; specName is up-to-date

		var currentSpecName = slot.getSpecNameAt(t);

		if (!specName) {
			specName = currentSpecName;

		} else if (specName !== currentSpecName)
			Report.throw("incorrect specName", `${slot} ${specName} ${currentSpecName}`);

		var tmpItem; // remove temporary item if in the slot

		if (slot.itemId) {

			if (!Item.isTmpId(slot.itemId))
				Report.throw("non-tmp item in slot", `${slot} ${item}`);

			tmpItem = Item.getById(slot.itemId, localKey);
			tmpItem.removeItem(localKey);

			slot.itemId = null;
		}

		slot.modify(t);

		if (!specName) // Case where slot currently has no item.
			return;

		// Create item w/ persistent ID

		var item = Item.createPersistent(specName, localKey);

		if (tmpItem)
			tmpItem.data.createdPersistent = item;

		item.position.copy(slot.position);
		item.position.y += item.spec.y0;

		if (slot.quaternion)
			item.useQuaternion(slot.quaternion);
		else
			item.facing = slot.facing;

		item.setColor( slot.getColor(t) );

		item.setOn3D(t);
		//item.setFlagUpdated(); ^

		item.setCreateT(t);

		return item;
	}


	static fromServerData(data) {

		if (Main.isServer)
			Report.throw("bad call");

		var item = Item.fromJSON(data);

		if (item.hasShopId()) {

			if (!item.storagePosition)
				return Report.warn("shopId, no storagePosition", `${item}`);

		} else if (!item.id || item.hasTmpId())
			return Report.warn("bad id", `${item}`);


		if (item.updateT !== 0) {

			item.setUpdateT(item.updateT);

			if (item.isRemoved()) {
				Report.warn("crumbled from server", `${item}`);
				Accounting.addEntry(item, "crumble");
				return;
			}
		}

/*
		var positionType = item.positionType;

		item.positionType = Item.None;

		if (positionType !== Item.None)
			item.setPositionType(positionType, item.updateT); // pos.type: apply (insert into indexes)

		console.assert(!item.isOn3D() || item.position.lengthSq() > 0);
*/
		if ( item.isOn3D() )
			item.setOn3D(item.updateT);

		item.onAfterCreate(); // Task.fromItemCharData TODO!! all items must be avail.

		return item;
	}


	onAfterCreate() {}


	static fromJSON_noEnlist(data) { // don't enlist in Local

		var item = Item._createNew(data.specId);

		item.fromJSON(data);

		return item;
	}


	static fromJSON(data, localKey) {

		var item = Item._createNew(data.specId);

		item.fromJSON(data);

		Local.get(localKey).enlistItem(item);

		// *** Associated items ***/

// TODO

		// placement into storage: storage might not be available yet.
		// don't enlist SP in Local (enlist only updates / removals)
/*
		var sP = item.storagePosition;
		item.storagePosition = null;
		if (sP)
			item.addStoragePosition(sP, localKey)
*/

		return item;
	}


	fromJSON(obj) {

		this.id = obj.id || null;

		this.position.set(obj.x || 0, obj.y || 0, obj.z || 0);
		this.facing = obj.facing || 0;

		if (typeof obj.qx == "number")
			this.quaternion = new THREE.Quaternion(obj.qx, obj.qy, obj.qz, obj.qw);

		this.createT = obj.createT || 0;
		this.updateT = obj.updateT || 0;
		this.flags = obj.flags || 0;

		this.positionType = obj.positionType || Item.On3D;

		if (obj.storagePosition && obj.storagePosition.baseId)
			this.storagePosition = StoragePosition.fromJSON(obj.storagePosition);

		if (this.hasShopId()) {

			if (obj.shopQtyInStock)
				this.data.shopQtyInStock = obj.shopQtyInStock;
		}
	}


	toJSON() {

		var obj = this.bareToJSON(); // simplify TODO

		if (this.storagePosition)
			obj.storagePosition = this.storagePosition; // has own toJSON()

		return obj;
	}


	bareToJSON() {

		var obj = {
			id: this.id,
			specId: this.spec.id,
		};

		this.position.x !== 0 && ( obj.x = Util.froundPos(this.position.x) );
		this.position.z !== 0 && ( obj.z = Util.froundPos(this.position.z) );
		this.position.y !== 0 && ( obj.y = Util.froundPos(this.position.y) );
		this._facing !== 0 && ( obj.facing = Util.froundPos(this._facing) );

		Util.addFroundQuaternion(obj, this.quaternion);

		this.createT !== 0 && ( obj.createT = Util.froundT(this.createT) );
		this.updateT !== 0 && ( obj.updateT = Util.froundT(this.updateT) );
		(this.flags & 65535) !== 0 && (obj.flags = this.flags & 65535);

		this.positionType !== Item.On3D && ( obj.positionType = this.positionType );

		return obj;
	}


	distanceToItem(item) {

		var	p = item.getPoint(),
			x = p.x,
			y = p.y;

		return this.getPoint().distanceTo(x, y);
	}


	getMatrix3() {

		var mat3 = this._mat3;

		if (this.quaternion)
			mat3.makeRotationFromQuaternion(this.quaternion);
		else
			mat3.makeRotationY(-this.facing);

		return mat3;
	}


	getMatrix4() {

		var mat4 = this._mat4;

		if (this.quaternion)
			mat4.makeRotationFromQuaternion(this.quaternion);
		else
			mat4.makeRotationY(-this.facing);

		return mat4.setPosition(this.position);
	}


	getMatrixWorld() { return this.matrixWorld.copy( this.getMatrix4() ) }


	getMatrixWorldInverse() {
		return this.matrixWorldInverse.copy( this.getMatrixWorld() ).invert();
	}


	getQuaternion() {
		return this.quaternion
			|| this._quaternion.setFromAxisAngle(Item.axisY, -this.facing);
	}


	useQuaternion(q) {

		if (this.isChar())
			Report.warn("not supported", `${this}`);

		if (!this.quaternion) {

			this.quaternion = ( q || this.getQuaternion() ).clone();
			this._display && this._display.useQuaternion();

		} else if (q)
			this.quaternion.copy(q);

		return this.quaternion;
	}


	set facing(value) {

		if (!Number.isFinite(value))
			return Report.warn("bad facing", `value=${value}`);

		value = Angle.normalize(value);

		this._facing = value;
		this._display && this._display.setFacing(value);
	}


	get facing() { return this.getFacing(); }

	getFacing() {

		if (this.isLog())
			return this.quaternion ? this.getFacingFromQuaternion() : this._facing;

		if (this.quaternion)
			Report.warn("get facing: have quaternion", `${this}`);

		return this._facing;
	}

/*
	updateFacingFromQuaternion() {

		if (this.quaternion)
			this.facing = this.getFacingFromQuaternion(); // result is 0 if item rotated +X up
	}
*/
	// While this is technically correct for the fallen tree it's not usable.
	// Use cases: 1) logs; ..
	getFacingFromQuaternion(q = this.quaternion) { // Extract rotation Y.

		return Math.atan2( // Vector3(1,0,0).applyQuaternion(q).zx
			2 * (q.x * q.z - q.w * q.y),
			1 - 2 * (q.y * q.y + q.z * q.z)
		);
	}


	getElevationFactor(q = this.quaternion) {
		return !q ? 0 : 2 * (q.x * q.y + q.w * q.z);
	}


	removeElevation(q = this.quaternion) {

		if (!q)
			return;

		var fwdV = q.getForwardV(),
			fwdV1 = this._vector.copy(fwdV).setY(0).normalize();

		q.premultiply(this._quaternion.setFromUnitVectors(fwdV, fwdV1));
	}


	rotateY(angle) {

		var q = this.quaternion;
		if (q)
			q.premultiply(this._quaternion.setFromAxisAngle(Item.axisY, -angle));
		else
			this.facing += angle;
	}


	getRotationYFromQuaternion(q = this.quaternion) {

		return Math.atan2( // Vector3(1,0,0).applyQuaternion(q).zx
			2 * (q.x * q.z - q.w * q.y),
			1 - 2 * (q.y * q.y + q.z * q.z)
		);
	}

/*
	getRotationY() {
		return this.quaternion ? this.getRotationYFromQuaternion() : this.facing;
	}

	_quaternionRotateXLocal(q, angle) {

		var fwdV = q.getForwardV();

		q.premultiply( this._quaternion.setFromAxisAngle(fwdV, angle) );
	}
*/

	rotateXLocal(angle) {

		this.useQuaternion().rotateXLocal(angle);
	}

/*
	rotateXLocal(angle) {

		var q = this.useQuaternion();
		var fwdV = q.getForwardV();

		q.premultiply(this._quaternion.setFromAxisAngle(fwdV, angle));
	}
*/

	getRotationXLocal(q = this.quaternion) { // [-PI..PI], wouldn't work if local +X points up

		if (!q)
			return 0;

		var fwdV = q.getForwardV(),
			upV = q.getUpV();

		// simplification possible (unit vectors)
		var upV0 = this._vector.set(0, 1, 0).projectOnPlane(fwdV);

		var absAngle = Math.acos(Util.clamp(upV0.dot(upV) / upV0.length(), -1, 1));

		// Plane contains origin, fwdV, upV0, not normalized.
		var leftNormal = this._normalVector.crossVectors(fwdV, upV0);

		return leftNormal.dot(upV) < 0 ? -absAngle : absAngle;
	}


	getDirection(v = this._direction) {

		var facing = this.getFacing();
		return v.set( Math.cos(facing), 0, Math.sin(facing) );
	}


	getDirectionLeft(v = this._directionLeft) { // -perp

		var facing = this.getFacing();
		return v.set( -Math.sin(facing), 0, Math.cos(facing) );
	}


	worldToLocal(v) {

		v.sub(this.position);

		if (this.quaternion)
			v.applyQuaternion(this._quaternion.copy(this.quaternion).conjugate());
		else
			v.applyAxisAngle(Item.axisY, this.facing);

		return v;
	}


	localToWorld(v, rotationOnly) {

		if (this.quaternion)
			v.applyQuaternion(this.quaternion);
		else
			v.applyAxisAngle(Item.axisY, -this.facing); // TODO simplify

		return rotationOnly ? v : v.add(this.position);
	}



	setOn3D(t) {

		this.positionType = Item.On3D;
		this.setUpdateT(t);
		this.setFlagUpdated();

		if (Main.isServer)
			return;

		Main.addItem(this);
	}


	setPositionNone(t) {

		if (!Main.isServer) {

			Main.removeItem(this);

			this.removeStaticPositionData();
		}

		this.positionType = Item.None;
		this.setUpdateT(t);
		this.setFlagUpdated();
	}


	setPositionType(positionType, t) {
console.error(`setPositionType: obsolete ${this}`);

// [...]
//		super.runEvent("positionType");

		return this;
	}



	getStorage(localKey) {
		return this.storagePosition && this.storagePosition.getStorage(localKey);
	}

	
	assignStoragePosition(sP, localKey) { // add sP & place into storage.

		this.addStoragePosition(sP, localKey);

		var storage = sP.getStorage(localKey);

		if ( storage && storage.placeItem(this) )
			return this;

		Report.warn("assignStoragePosition fails", `${this} ${sP.getStorage(localKey)}`);
		this.storagePosition = null;
	}


	registerUpdateSP(localKey) { localKey && Local.get(localKey).updateItemSP(this); }

	registerRemoveSP(localKey) { localKey && Local.get(localKey).removeItemSP(this); }

	// All assignments / removals of storagePosition goes via following 2 fns.

	addStoragePosition(sP, localKey) {

		if (Main.isServer && !localKey)
			Report.throw("addStoragePosition: no localKey");

		if (!sP || !(sP instanceof StoragePosition) || !sP.baseId)
			Report.throw("bad or no storagePosition");

		if (this.storagePosition)
			Report.throw("already have storagePosition", `${this}`);

		this.storagePosition = sP;

		this.registerUpdateSP(localKey);

		return this;
	}


	removeFromStorage(localKey) { // does not set positionType

		var storage = this.getStorage(localKey);
		if (!storage)
			return Report.warn("!storage", `${this}`);

		storage.removeItem(this);

		this.storagePosition = null;

		this.registerRemoveSP(localKey);

		return this;
	}


	canPlaceInPosition(sP, localKey) {

		var storage = sP.getStorage(localKey);
		return storage && storage.canPlaceInPosition(this, sP);
	}


	canSwapInventoryItems(item1, item2, localKey) { // within same 'this' baseItem

		if ( !item1 || !item2 || item1 === item2
				|| !item1.isInInventoryOrEquipmentOf(this, localKey)
				|| !item2.isInInventoryOrEquipmentOf(this, localKey) )
			return;

		if (item1.spec.getInventorySize() !== item2.spec.getInventorySize())
			return;

		if (item1.isEquipped(localKey) || item2.isEquipped(localKey)) {

			let slot = item1.spec.getEquipSlotName();
			return slot && slot === item2.spec.getEquipSlotName();
		}

		return true;
	}


	swapInventoryItems(item1, item2, localKey) {

		if ( !this.canSwapInventoryItems(item1, item2, localKey) )
			return;

		var	sP1 = item1.storagePosition,
			sP2 = item2.storagePosition;

		if ( item1.removeFromStorage(localKey)
			&& item2.removeFromStorage(localKey)
			&& item1.assignStoragePosition(sP2, localKey)
			&& item2.assignStoragePosition(sP1, localKey)
		)
			return true;
	}


	isEquipped(localKey) {

		var sP = this.storagePosition;
		var inv = sP && sP.getStorage(localKey);

		return inv && inv.isEquipment();
	}


	isStoredAt(baseItem) {
		return this.storagePosition && this.storagePosition.baseId === baseItem.id;
	}

	isInInventoryOrEquipment(localKey) {
		var storage = this.getStorage(localKey);
		return storage && storage.isInventoryOrEquipment();
	}

	isInInventory(localKey) {
		var storage = this.getStorage(localKey);
		return storage && storage.isInventory();
	}

	isInInventoryOrEquipmentOf(baseItem, localKey) { // more clean? w/o localKey (have baseItem)
		return this.isStoredAt(baseItem) && this.isInInventoryOrEquipment(localKey);
	}

	isInInventoryOf(baseItem, localKey) {
		return this.isStoredAt(baseItem) && this.isInInventory(localKey);
	}

/*
	fitsIntoInventoryOf(item) {
		return item.storages && item.storages.some(storage =>
			storage.isInventoryOrEquipment() && storage.itemFits(this) );
	}
*/

	findStoragePositionFor(item) { // 'this': baseItem

		if (!this.storages)
			return;

		for (let i = 0; i < this.storages.length; i++) {

			if (!this.storages[i].isInventoryOrEquipment())
				continue;

			let sP = this.storages[i].findStoragePositionFor(item);
			if (sP)
				return sP;
		}
	}


	findAndReserveStoragePositionFor(item) {

		var sP = this.findStoragePositionFor(item);

		if (sP)
			Storage.reservePosition(item, sP);

		return sP;
	}


	addToInventoryOf(item) { // Tests only

		if (Main.isServer)
			Report.throw("bad usage");

		return item.storages && item.storages.some(storage => storage.addItem(this));
	}


	sell(baseItem, localKey) { // currently item must be in baseCenter, inventory part.

		if ( this.isInShop(localKey) || this.isRemoved() )
			return Report.warn("wrongly positioned", `${item}`);

		if ( !this.isStoredAt(baseItem) )
			return Report.warn("not stored in baseItem", `${baseItem} ${this}`);

		if ( !this.getProps().canSell() )
			return Report.warn("can't sell", `${item}`);

		//this.removeFromStorage(localKey); // <-- on removeItem it doesn't remove from storage
		this.removeItem(localKey);

		Local.getUser(localKey).addCoins( this.getProps().getSellCost() );

		return true;
	}


	// - currently item must be in baseItem shop. purchase into inventory part.
	// - must supply sP
	buy(baseItem, sP, localKey, t) {

		if ( !this.isStoredAt(baseItem) || !this.isInShop(localKey) )
			return Report.warn("buy: wrong storagePosition", `${item} baseItem=${baseItem}`);

		if (this.isRemoved()) // <- removed: no SP
			return Report.warn("buy: removed item", `${this}`);

		if ( !sP.belongsTo(baseItem.storages[0]) ) // <-- baseCenter inventory
			return Report.warn("buy: bad sP", `${this} sP=${sP}`);

		if ( !this.canPlaceInPosition(sP, localKey) )
			return Report.warn("buy: !canPlaceInPosition", `${this} sP=${sP}`);

		var shop = baseItem.getShop();
		if (!shop)
			return Report.warn("buy: no shop", `${this} baseItem=${baseItem}`);

		if ( !shop.accountBuy(this, localKey) )
			return;


		if ( !Local.getUser(localKey).subtractAmountForItem(this) )
			return Report.warn("buy: !subtractAmountForItem", `${this}`);

		var item;

		if (this.hasShopId()) {

			item = this.createNewFromShopItem(localKey);

		} else {
			item = this;
			item.removeFromStorage(localKey);
		}

		item.assignStoragePosition(sP, localKey);

		item.setUpdateT(t);

		return item;
	}


	// =========================================================================

	// Use cases:
	// - changes in position,orientation of static item
	// - changed mesh of static item (modified tree)
	updateDisplay(removeStaticData = true) {

		if (Main.isServer)
			return;

		Main.removeItem(this);

		//this.removeDisplay(false); // don't remove selection, highlight (TODO why?)
		this.removeDisplay();

		if (removeStaticData === true && this.positionType === Item.On3D)
			this.removeStaticPositionData();

		this.updateSelection();
		this.updateHighlight();

		Main.addItem(this);
	}


	removeStaticPositionData() {

		this._polygonByRC.fill(null);
		this._spatialContainerByRC.fill(null);
		// cGroups: updated on spatialIndex operations
		//this._displayRect = null;
		this._displayBox = null;
	}



	stopAllTweens() {

		if (this.data.tweenThrowTo) {

			this.data.tweenThrowTo.stop();
			this.data.tweenThrowTo = null;
		}
	}


	remove(localKey, allowInStorage) { console.error(`obsolete`); this.removeItem(localKey, allowInStorage); }


	removeItem(localKey, allowInStorage) {

		this.getAssociatedItems().forEach( item => removeItem(localKey) );
/*
		if (allowInStorage !== true && this.storagePosition) { // ++ CASCADE? (TODO)

			Report.warn("must have been removed from storage before", `${this}`);
			this.storagePosition = null; // MUST CORRECT WHERE THIS HAPPENS
		}
*/
		// allowInStorage: if item is in storage, the caller will deal with the fact.

		if (!allowInStorage && this.storagePosition) {

			this.removeFromStorage(localKey);
		}

		if (this.getDependentItems().length > 0)
			Report.warn("have dependentItems", this.dependentItems);

		if (this.dependentOn)
			Util.removeElement( this.dependentOn.dependentItems, this );

		Main.removeItem(this);

		if (!Main.isServer) {

			this.removeDisplay();

			this.stopAllTweens();

			Main.area.events && Main.area.events.removeItem(this);

			if (Main.selectedItem === this)
				Main.select();
		}

		Local.get(localKey).removeItem(this);

		this.flags |= Item.FLAG_REMOVED;

		super.runEvent("remove");
	}


	getPoint(p = this._pt) {
		return p.set(this.position.x, this.position.z);
	}

	getCircle(r = this.getRadius(), c = this._circle) {
		return c.set(this.position.x, this.position.z, r);
	}

	getBoundingCircle() {
		return this.getPolygon().getBoundingCircle();
	}

	getBoundingCircleCenter() {
		var c = this.getBoundingCircle();
		return this._pt.set(c.x, c.y);
	}

	// TODO Overally this is messy.

get radius() { Report.warn(".radius");return this.getRadius(); }
get height() { Report.warn(".height");return this.getHeight(); }

	// Non-unit items are represented as polygons. Radius is from the circumscribed circle.
	// Radius can be specified in spec.cBody, in such case it creates inscribed polygon.
	getRadius() { return this.getCBody().radius; }

	getHeight() { return this.getCBody().height; }


	polygon(radiusClass) { console.error(`getPolygon`);return this.getPolygon(radiusClass); }


	// Polygon of static item is its 2D collision body. All non-unit items must have it.
	getPolygon(radiusClass = Unit.RadiusClassBase) {

		return this._polygonByRC[radiusClass] || (
			this._polygonByRC[radiusClass] = this.createPolygon(radiusClass)
		);
	}


	getFreeSpacePolygon() {

		var polygonBase = this.spec.getFreeSpacePolygonBase();

		if (polygonBase)
			return Item._freeSpacePolygon.copy( polygonBase )
				.rotate(this.facing)
				.translate(this.position.x, this.position.z);

		return this.getPolygon();
	}


	createPolygon(radiusClass) {

		var polygon = this.spec.createPolygon(this.position.x, this.position.z,
			this.facing, radiusClass);

		if (!polygon)
			return Report.warn("no spec polygon", `${this}`);

		if (typeof polygon.height != 'number') {
			Report.warn("bad polygon.height", `h=${polygon.height} ${this}`);
			polygon.height = 0.01;
		}

		polygon.height += this.position.y;

		polygon.id = this.id;

		return polygon;
	}


	spatialContainer(radiusClass = Unit.RadiusClassBase) {

		var container = this._spatialContainerByRC[radiusClass];
		if (container)
			return container;

		return ( this._spatialContainerByRC[radiusClass]
			= new SpatialContainer().setFromItem(this, radiusClass) );
	}


	getCGroupId(radiusClass) {
		return this.cGroupIds && this.cGroupIds[radiusClass] || 0;
	}

	getCGroup(radiusClass) {
		return CGroup.getById( this.getCGroupId(radiusClass) );
	}

	addCGroupId(radiusClass, id) { // call from CGroup!
		if (!this.cGroupIds)
			this.cGroupIds = Array.from(Unit.ItemCGroupIds);
		this.cGroupIds[radiusClass] = id;
	}

	removeCGroupId(radiusClass) { // call from CGroup!
		this.cGroupIds[radiusClass] = 0;
	}

	getGroupHeight(radiusClass) {
		var id = this.getCGroupId(radiusClass);
		return id === 0 ? this.getHeight() : CGroup.getById(id).getHeight();
	}


	raycast(line3, raycaster) {

		if (this.isRayTransparent())
			return false;

		var maxHeight = this.position.y + this.getHeight();

		if (this.isCircular()) {
			return this._circle.set(this.position.x, this.position.z, this.getRadius())
				.distanceLine3P1ToIntersection(line3, maxHeight);
		}


		if (this.isPolygonal()) { // polygonal cBody: don't check vs geometry

			var polygon = this.getPolygon();

			var d = polygon.getBoundingCircle().distanceLine3P1ToIntersection(line3, maxHeight);
			if (d === false)
				return false;

			d = polygon.distanceLine3P1ToIntersection(line3, maxHeight);
			//if (d === false)
			//	return false;

			return d;
		}


		var intersects = this._intersects;
		intersects.length = 0;


		var cBodyMesh = this.display.cBodyMesh;

		if (cBodyMesh) {
			raycaster.raycaster.intersectObject(cBodyMesh, true, intersects);

		} else {
			raycaster.raycaster.intersectObject(this.display.mesh, true, intersects);
		}

//console.log(`raycast ${item}`);

		return intersects;
	}


	get display() {

		if (this._display)
			return this._display;

		return (this._display = new ItemDisplay(this));
	}


	removeDisplay(alsoRemoveSelection = true) {

		this.removeDisplay2D();

		if (alsoRemoveSelection) {
			this.removeHighlight();
			this.removeSelection();
		}

		if (!this._display)
			return;

		this._display.remove();
		this._display = null;
	}


	getCBody() {
		return this.spec.getCBody();
	}


	getUpgradeLevel() { return 0 }


	getCBody3DGeometry() {

		console.assert( this.getUpgradeLevel() === 0 ); // non-upgradeable

		if ( !('cBody3D' in this.spec.data) )
			return;

		return this.spec.data.cBody3D.geometry;
	}


	getCSGeometry() {

		console.assert( this.getUpgradeLevel() === 0 );

		if ( !('cSGeometry' in this.spec.data) ) {
			Report.warn("no cSGeometry", `${this}`);
		}

		return this.spec.data.cSGeometry;
	}


	getCSInternalGeometry() {

		console.assert( this.getUpgradeLevel() === 0 );

		if ('cSInternalGeometry' in this.spec.data)
			return this.spec.data.cSInternalGeometry;

		return this.spec.data.geometry;
	}


	getDisassemblyTime() { return this.spec.data.disassemblyTime } // in mins.

	canDisassemble() { return this.getDisassemblyTime() > 0 }

	getDisassemblyReward() {
		return this.spec.data.disassemblyReward || { type: 'coins', amount: 0 };
	}

	onAfterConstructionComplete() { console.error(`onAfterConstructionComplete ${this}`) }

	getAreaBuildLimit() { return this.spec.data.limitPerArea || Infinity }


	isAreaBuildLimitReached() {

		var limit = this.getAreaBuildLimit();

		if (limit < Infinity && Main.area.getItemCount(this.spec.name) >= limit)
			return true;
	}


	getMesh() { // "dummy" mesh

		if (this.isTree()) {
			console.log(`TODO? must have derived fn.`);
			return this.tree.getMesh();
		}

		return this.spec.getMesh();
	}


	getMesh2D() { return ItemDisplay.createMeshForDisplay2( this.getMesh(), true, true) }

	getGeometryEquip() { return this.spec.getGeometryEquip() }


	get display2D() {

		if (this.data._display2D)
			return this.data._display2D;

		// 1. 1 canvas/imagedata - 1 html image
		// TODO (v2): avoid re-creation / cache mgmt.
		return (this.data._display2D = new ItemDisplay2D(this));
	}


	removeDisplay2D() {

		if (this.data._display2D) {

			this.data._display2D.remove();
			this.data._display2D = null;
		}
	}


	addHighlight() {

		if ( !this.canBeHighlight() )
			return;

		// Circular or basePolygon; STATIC; quaternion not used

		var padding = this.isChar() ? 0 : this.isLog() ? 0.005 : Item.SelectionPadding;
		var charHeightPadding = this.isChar() ? 0.06 : 0;
		//var y = this.isChoppedTree() ? 0 : this.position.y - this.spec.y0;
		var y = this.isChoppedTree() ? 0 : this.position.y;//this.spec.y0; // TODO y0 is used only for logs
		//console.log(`y=${y}`);

		if ( this.isLog() )
			y -= this.spec.y0;

		var geometry = this.isCircular()
			? HelperGeometry.getCylinder(this.getRadius() + padding, this.getHeight() + padding + charHeightPadding)
			: HelperGeometry.getPolygon3D( this.getPolygon(), null, padding, y, this.getHeight() );

		var mesh = new THREE.Mesh(
			geometry,
			Assets.materials.highlight[this.selectionType()]
		);

		if (this.isCircular()) {
			Object.defineProperties(mesh, ItemDisplay.object3DPropsWritable);
			mesh.position = this.position;
		}

		this.addHighlightMesh(mesh);
	}


	addHighlightMesh(mesh) {

		mesh.name = `Highlight id=${this.id} name=${this.spec.name}`;
		this.data.highlightMesh = mesh;
		scene.add(mesh);

		Main.highlightItem = this;
	}


	removeHighlight() {

		var mesh = this.data.highlightMesh;
		if (!mesh)
			return;

		console.assert(this == Main.highlightItem);

		scene.remove(mesh);

		if (!mesh.geometry.userData._savedInStorage)
			mesh.geometry.dispose();

		delete this.data.highlightMesh;

		Main.highlightItem = false;
	}


	updateHighlight() {

		if (this === Main.highlightItem) {

			this.removeHighlight(true);
			this.addHighlight();
		}
	}


	getSelectionGeometry() {

		if ( this.isCircular() )
			return HelperGeometry.getCircle( this.getRadius() );

		var padding = Item.SelectionPadding;
		var y = this.isChoppedTree() ? 0 : this.position.y - this.spec.y0;

		return HelperGeometry.getPolygon2D( this.getPolygon(), null, padding, y);
	}


	addSelection() {

		var mesh = new LineSegments2(

			this.getSelectionGeometry(),
			Assets.materials.line[this.selectionType()]
		);

		if (this.isCircular()) {
			Object.defineProperties(mesh, ItemDisplay.object3DPropsWritable);
			mesh.position = this.position;
		}

		this.addSelectionMesh(mesh);
	}


	addSelectionMesh(mesh) {

		mesh.name = `Selection id=${this.id} name=${this.spec.name}`;
		this.data.selectionMesh = mesh;
		scene.add(mesh);
	}


	removeSelection() {

		var mesh = this.data.selectionMesh;
		if (!mesh)
			return;

		scene.remove(mesh);

		if (!mesh.geometry.userData._savedInStorage)
			mesh.geometry.dispose();

		delete this.data.selectionMesh;
	}


	updateSelection() {

		if (this === Main.selectedItem) {

			this.removeSelection(true);
			this.addSelection();
		}
	}


	// =============================================================
	//
	//   Special Items w/o dedicated object class
	//
	// =============================================================

	getShopTimer() { return this.getShopTimerAt(Engine.time) }


	getShopTimerAt(t) {

		if (!this.hasShop())
			return Report.warn("!hasShop", `${this}`) || Infinity;

		var interval = this.spec.data.shopUpdateInterval;

		if (!interval)
			return Report.warn("no shopUpdateInterval", `${this}`) || Infinity;

		var lastT = this.getFeatureValue2("shopUpdateLastT");

		//if (lastT > t)
		//	return Report.warn("lastT > t", `${this} lastT=${lastT} t=${t}`) || Infinity;

		return Math.max(0, interval - (t - lastT) );
	}


	getShopTimerText() { return Util.formatTime( this.getShopTimer() ) }



	// =============================================================
	//
	//   Operations on Items
	//
	// =============================================================

	canGrab() {
		return this.isOn3D() && !this.isRemoved() && !this.isInStorage()
			&& ( this.isLog() || this.isAxe() );
	}

	robotCanLoad() {}


	getGrabLocations(p = this.getPoint(), facing = this.facing, force) {

		if (force !== true)
			if (!this.canGrab() || this.isInStorage())
				return [];

		var locations;

		if (this.isLog()) {

			// "facing": extracted rot.Y from q.
			let angle = Angle.normalize(facing + Math.PI / 2);

			const d = 0.29;

			locations = [
				new ApproachPoint().setFromPointAngleDistance(p, angle, d),
				new ApproachPoint().setFromPointAngleDistance(p, Angle.opposite(angle), d)
			];


		} else if (this.isAxe()) {

			let angle = Angle.normalize(facing + 2.356);
			let v = new Point(-0.5326, -0.106).rotate(angle).add(p);

			locations = [ new ApproachPoint(v.x, v.y, angle, 0.543) ];


		} else
			Report.throw("N/A", `${this}`);

		return locations;
	}


	isUnitAtGrabLocation(unit) { // use .getIfCurrentlyAtGrabLocation

		var	p = unit.getPoint(),
			x = p.x,
			y = p.y;

		return this.getGrabLocations().some(loc => Util.hypotSq(x - loc.x, y - loc.y) < 0.01);
	}


	getIfCurrentlyAtGrabLocation(unit) {

		unit.updatePositionFacing();

		return this.getGrabLocations().find(aP =>

			aP.distanceToVector3(unit.position) < 1e-3
			&& Angle.absDiff(aP.facing, unit.facing) < 1e-3
		);
	}


	getUnitFitGrabLocations(unit, p, facing, force) {

		var aPoints = this.getGrabLocations(p, facing, force);

		return Util.filterInPlace(aPoints, aP => {

			if (Main.area.spatialIndex.unitFits(unit, aP.x, aP.y))
				return true;
		});
	}


	// What would be item pt. to grab from given unit position, facing.
	getGrabTargetPoint(unitPoint, unitFacing) {

		if (this.isAxe()) {

			var p = new Point(0.5326, 0.106).rotate(unitFacing).add(unitPoint);

			return new ApproachPoint(p.x, p.y, unitFacing - 2.356, 0.543); // "DirectedPoint" ?

		} else
			Report.warn("not supported", `${this}`);
	}


	// *** Operations on items w/o having an item ***

	static fitsVsStatic(specName, p, facing) {

		var polygon = ItemSpec.get(specName).createPolygon( p.x, p.y, facing );

		return ! Main.area.spatialIndex.polygonCollides(polygon);
	}


	setThrownTo(targetPosition, onLandedFn) {

		if (this.isRemoved())
			return;

		if (!targetPosition || !(targetPosition instanceof THREE.Vector3) )
			return Report.warn("bad targetPosition", `${targetPosition}`);

		var position = this.position.clone();
		var timeScale = 1;
		var g = 9.8 / (timeScale * timeScale);

		// distance: Vertical, Horizontal
		var dV = position.y - targetPosition.y,
			dH = Util.hypot(targetPosition.z - position.z, targetPosition.x - position.x);

		// velocity, Horizontal
		var vH = 1.5 / timeScale;

		// What would be initial velocity, Vertical given the above.
		var initialVV = (g / 2) * (dH / vH) - dV / (dH / vH);

		if (initialVV <= 0) {

			initialVV = 0;
			vH = Math.sqrt(g / 2 * dH * dH / dV);
//console.warn(`* vH=${vH} initialVV = 0`);

		} else {
			let targetMaxY = Math.max(position.y, targetPosition.y) + 0.2;
			let maxInitialVV = Math.sqrt(2 * g * (targetMaxY - position.y));

			if (initialVV > maxInitialVV) {

				let a = dV,
					b = maxInitialVV * dH,
					c = -(g / 2) * dH * dH,
					d = Math.sqrt(b * b - 4 * a * c);

				if (d !== d) {
					Report.warn("can't happen", `a=${a} b=${b} c=${c}`);
					d = 0;
				}

				vH = Math.max( (-b - d) / (2 * a), (-b + d) / (2 * a) );

				initialVV = (g / 2) * (dH / vH) - dV / (dH / vH);
//console.warn(`* vH=${vH} initialVV=${initialVV} dV=${dV}`);

			} else {
//console.warn(`vH=${vH} initialVV=${initialVV}`);
			}
		}

		var time = Math.min(dH / vH, timeScale * Item.THROW_TO_PILE_TIME_MAX);

		var velocity = new THREE.Vector3().subVectors(targetPosition, position)
			.divideScalar(time);

		var tweenData = { t: 0 };

		this.data.tweenThrowTo = new TWEEN.Tween(tweenData)

			.to({ t: time }, time * 1000) // time is in ms.
			.onUpdate( () => {

				var t = tweenData.t;
				// horizontal
				this.position.x = position.x + velocity.x * t;
				this.position.z = position.z + velocity.z * t;
				// vertical
				this.position.y = position.y + initialVV * t - (g / 2) * t * t;

				this.updateItemPosition();
			})
			.start()
			.onComplete( () => {

				var diff = this.position.scalarAbsDiff(targetPosition);
				if (diff > 1e-3) {
					console.error(`diff=${diff} ${this}`);
					UI.Debug.setTMult(0);
				}

				this.position.copy(targetPosition);

				this.removeElevation(); // TODO? tween .quaternion
				//targetFacing TODO?

				// It would be incorrect updateT (different from server). Doesn't matter for use cases
				this.data.tweenThrowTo = null;
//console.log(`landed item=${this} pos=${this.position} data.inStorage=${this.data.inStorage}`);

				if (onLandedFn)
					onLandedFn();

				this.updateItemPosition();
			});
	}

// TODO interface
	getPolyhedron() { // CLONED!
		return this.getPolyhedronBase().clone().applyMatrix4( this.getMatrixWorld() );
	}


	getPolyhedronBase() {
		return this.spec.getPolyhedronBase();
	}


	showPolyhedron() {

		if (this.data.showPolyhedron) {

			this.data.showPolyhedron.show();
			this.data.showPolyhedron = null;

		} else
			this.data.showPolyhedron = this.getPolyhedron().show();

		return this;
	}


	showFace(id, matName) {

		if (!this.data.showPolyhedron)
			this.showPolyhedron();

		var p = this.data.showPolyhedron;
		var f = p.getFaceById(id);

		if (!f)
			return console.log(`no face id=${id}`);

		f.show(matName);

		return this;
	}


	clone(localKey, newId) {

		var item = Item.create(this.spec.id, localKey, newId);

		item.position.copy(this.position);
		item.facing = this.facing;

		if (this.quaternion)
			item.quaternion = this.quaternion.clone();

		item.createT = this.createT;
		item.updateT = this.updateT;

		item.setPositionType(this.positionType);

		if (this.char || this.tree || this.storagePosition)
			Report.warn(".clone(): not supported");

		return item;
	}


	static getAllAxes() {
		return Item.getAll().filter(item => item.isAxe() && !item.isInShop() && !item.isRemoved());
	}


	static getAll(localKey) {
		return Object.values(Local.get(localKey).itemById);
	}


	static byId(id, localKey) { // If not exists - returns undef.
		return Local.get(localKey).itemById[ id ];
	}


	static getById(id, localKey, throwOnMissing = true) {

		var item = Local.get(localKey).itemById[ id ];

		if (throwOnMissing === true && !item)
			Report.throw("no item", `id=${id}`);

		return item;
	}

}


Object.assign(Item, {

	None: -1,
	On3D: 0,

	SelectionPadding: 0.03,
	THROW_TO_PILE_TIME_MAX: 2,

	// 16 lowest flags saved on server
	// bits 0..3 color
	FLAG_ROBOT_FLYING: (1 << 4),

	FLAG_UPDATED: (1 << 29),
	FLAG_REMOVED: (1 << 30),

	axisX: new THREE.Vector3(1, 0, 0),
	axisY: new THREE.Vector3(0, 1, 0),
	axisZ: new THREE.Vector3(0, 0, 1),

	last: null,

	_emptyArray: Object.freeze([]),
	_itemDisplayData: new THREE.Vector4,
	_freeSpacePolygon: new Polygon,
});


Item.positionTypes = [ Item.None, Item.On3D ];


Object.assign(Item.prototype, {

	_vector: new THREE.Vector3,
	_normalVector: new THREE.Vector3,
	_quaternion: new THREE.Quaternion,
	_mat3: new THREE.Matrix4,
	_mat4: new THREE.Matrix4,
	_circle: new Circle,
	_pt: new Point,
	_direction: new THREE.Vector3,
	_directionLeft: new THREE.Vector3,
	_intersects: [],
	//_sprng: new Util.SeedablePRNG,
});




export { Item };

