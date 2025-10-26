
import { Unit } from './Unit.js';

//
// - Mixamo animations (in CharDisplay)
// - Circular cBody
//
class Char extends Unit {

	constructor(spec) {

		console.assert(spec.data.radius > 0 && spec.data.height > 0);

		super(spec);

		this.charData = new CharData(this);

		this.radiusClass = 0;
		this._speed = Char.speed;

		console.assert(this.storages.length === 3);
	}



	setSpeed(s = Char.speed) {
		this._speed = s;
		return this;
	}

	static setSpeedAll(s) {
		Main.getChars().forEach(char => char.setSpeed(s));
	}


	get speed() { return this.getSpeed() }

	getSpeed() { return this._speed }


/* same as in Item
	getRadius() { return this.spec.data.radius; }

	getHeight() { return this.spec.data.height; }

	polygon(radiusClass) {
		Report.warn("polygon() on char");
		return super.polygon(radiusClass);
	}
*/


	fromJSON(data) { // called from Item.fromJSON(), w/ correct constructor

		super.fromJSON(data);

		this.charData.fromJSON(data.charData);
	}


	toJSON() {

		var data = super.toJSON();

		data.charData = this.charData.toJSON();

		return data;
	}


	//onAfterCreate() {}


	// ========================================================
	//
	//     Appearance
	//
	// ========================================================

	get display() {

		if (!this._display) {

			this._display = new CharDisplay(this)
			this._display.update();
		}

		return this._display;
	}


	//updateDisplay() {
	//	this._display && this._display.enqueueUpdate();
	//}


	getDisplayDataSize() { return 'size_skinned' }

/*
	updateDisplayData(array, offset) {

		this.updateAnimation(); // from trackList

		super.updateDisplayData_Skinned(array, offset);
	}
*/


	raycast(line3, raycaster) {

		var d = this._circle.set(this.position.x, this.position.z, this.getRadius())
				.distanceLine3P1ToIntersection(line3, this.getHeight());
		if (d === false)
			return false;

		if (d + raycaster.dBehind > 40)
			return d;

		return raycaster.raycaster.intersectObject(this.display.mesh, true);
	}


	getHeadGeometry() {
		//return Assets.models[ this.charData.getHeadGeometryName() ].obj;
		return this.charData.getHeadGeometry();
	}


	getLangName() { return this.charData.getLangName() }



	// =============================================================
	//
	//   Accounting
	//
	// =============================================================

	increaseCntChopped() { this.charData.cntChopped ++ }


	accountLog(log) {

		this.charData.cntLogs ++;

		this.charData.totalLogMass += log.getLogMass();
	}



	// =============================================================
	//
	//   Operations on Items
	//
	// =============================================================

	// w/ 2 hands
	liftItemFromGround(item, t) { // Executed at time (from ItemEventQueue)

		if (!item.isLog)
			return Report.warn("!isLog", `${item}`);

		this.charData.liftItemFromGround(item, t);

		var matrix = () => {

			var position = Char.liftItemPosition.copy( Char.LiftItemPositionBase )
				.addScaledVector( Char.LiftItemPositionVNorm, item.getLogRadius() );

			var q = Char.liftItemQuaternion.copy( Char.LiftItemQuaternionBase );

			if (this.charData.carryingReverted)
				q.multiply( Char.QuaternionRotate180Y );

			q.rotateXLocal(this.charData.carryingRotationXLocal);

			return new THREE.Matrix4().compose( position, q, Char.LiftItemScale );
		}

		this.addDependentItem(item, 'mixamorigLeftHand', matrix);


		var data = {
			id: item.id,
			carryRotXL: this.charData.carryingRotationXLocal,
		};

		if (this.charData.carryingReverted)
			data.carryRev = 1;

		Accounting.addEntry(this, "lift", data);
	}


	dropCarryingOnGround(item, t) {

		var itemId = item.id;

		// Item position, quaternion depend on char position, facing.
		this.updatePositionFacing();

		var charFacing = Util.froundPos(this._facing); // TODO (round facing in setter?)

		this.charData.dropCarryingOnGround(item, charFacing, t);

		this.removeDependentItem(item);


		var data = {
			id: itemId,
			charFacing,
		};

		Accounting.addEntry(this, "dropCarrying", data);
	}


	releaseItemAxe_Throw(type, item, target) { // item==eventItem2

		console.assert(target.throwPosition instanceof THREE.Vector3);
		console.assert(target.throwFacing !== undefined);

		var fwd, left, y;

		if (type.startsWith("GetThrowAxe") || type.startsWith("PickUpAxeThrow")) {

			fwd = 0.564; left = 0.168; y = 0.84;

		} else if (type == "StandingAxeThrow") {

			fwd = 0.45; left = 0.23; y = 0.86;

		} else
			Report.throw("bad type", `"${type}"`);

		item.position.copy(target.throwPosition)
			.addScaledVector(this.getDirection(), fwd)
			.addScaledVector(this.getDirectionLeft(), left)
			.setY(y);

		// So far limiting item_throw w/ item horizontally positioned, w/o rotation (TODO)
		// ! Axes w/ facing=0 are towards +Z (+PI/2) <-- computation not affected

		item.facing = target.throwFacing - 2.356;

		this.removeDependentItem(item);
	}


	releaseItem_ThrowToPile(type, oP) {

		var item = this.charData.getCarrying();

		console.assert(oP.name == "ThrowToPileOP");

		if (!item) { // maybe just sold
			return;
		}

		console.assert( item.isOn3D() );
		console.assert(item.id === this.charData.carryId);

		if (!item.isLog())
			Report.throw("unsupported", `${this}`);

		//this.debugReleaseItemThrow(type, item);


		var fwd, left, y;

		// actually depends on log radius
		// (considered insignificant for display quality, took avg.)

		if (type == "ThrowLeft90") {

			fwd = 0.33; left = -0.274; y = 1.239;

		} else if (type == "ThrowLeft45") {

			fwd = 0.668; left = -0.18; y = 1.29;

		} else if (type == "ThrowRight90") {

			fwd = 0.35; left = -0.46; y = 1.367;

		} else if (type == "ThrowRight45") {

			fwd = 0.673; left = -0.28; y = 1.346;

		} else
			Report.throw("bad type", `t=${type}`);

		// unit position, facing are predefined, contained in the OP

		item.position.copy(oP.position)
			.addScaledVector(oP.frontV, fwd)
			.addScaledVector(oP.depthV, -left)
			.setY( y + item.getLogRadius() );

		item.useQuaternion( this.charData.getThrowToPile_Quaternion(oP.unitFacing, type) );

		this.removeDependentItem(item);

		this.charData.carryId = null;
	}


	debugReleaseItemThrow(type, item) {

		this.display.mesh.updateMatrixWorld(true);

		var lhb = this.display.leftHandBone;
		var m = lhb.children[0] && lhb.children[0].clone();

		if (!m) {
			console.log(`debugReleaseItemThrow: no mesh`);
			return;
		}

		lhb.add(m);
		scene.attach(m);
		scene.remove(m);

		var pos = m.position.clone().sub(this.position);
		var q = m.quaternion;

		console.log(`type=${type} fwd=${(pos.dot( this.getDirection() )).toFixed(3)}`
			+ ` left=${(pos.dot( this.getDirectionLeft() )).toFixed(3)}`
			+ ` y=${pos.y.toFixed(3)} y-r=${(pos.y-item.getLogRadius()).toFixed(3)}`
		);

		var actualRotXLocal = item.getRotationXLocal(q);

		var rotXDiff =
			(this.charData.carryingReverted ? 1 : -1)
			* (actualRotXLocal - this.charData.carryingRotationXLocal);

		console.log(""
			+ `charData.rotXloc=${this.charData.carryingRotationXLocal.toFixed(3)}`
			+ ` charData.rotXrev=${this.charData.carryingReverted}`
			+ "\n"
			+ `ACTUAL: rotXloc=${actualRotXLocal.toFixed(3)}`
			+ ` facing=${item.getRotationYFromQuaternion(q).toFixed(3)}`
			+ ` elev=${item.getElevationFactor(q).toFixed(3)}`
			+ "\n"
			+ `rotXDiff=${Angle.normalize(rotXDiff).toFixed(3)}`
		);

		
	}


	// =============================================================
	//
	//   Equipment, Inventory
	//
	// =============================================================

	// Char: 1st attempt to place into inventory, then into eq.
	findStoragePositionFor(item) { // 'this': baseItem

		for (let i = 0; i < this.storages.length; i++) {

			if (!this.storages[i].isInventory())
				continue;

			let sP = this.storages[i].findStoragePositionFor(item);
			if (sP)
				return sP;
		}

		for (let i = 0; i < this.storages.length; i++) {

			if (!this.storages[i].isEquipment())
				continue;

			let sP = this.storages[i].findStoragePositionFor(item);
			if (sP)
				return sP;
		}
	}


	getEquipment() { return this.storages[0]; }


	itemFitsIntoEquipmentSlot(item, slot) {
		return this.getEquipment().itemFitsIntoSlot(item, slot);
	}


	addToEquipmentSlot(item, slot) {

		var equip = this.getEquipment();
		if (!equip.itemFitsIntoSlot(item, slot))
			return;

		var sP = new StoragePosition(this.id, 0, Equipment.getSlotX(slot));
		if (!item.addStoragePosition(sP))
			return;

		if (equip.placeItem(item))
			return true;
	}


	getEquipAxe() {

		var axe = this.getEquipment().itemBySlotName("weapon") || this.getInventoryAxe();
		return axe;
	}


	getInventoryAxe() {

		if (Main.isServer)
			Report.throw("bad usage");

		var axe;

		if ( (axe = this.getInventoryAxe_1(0)) )
			return axe;

		if ( (axe = this.getInventoryAxe_1(1)) )
			return axe;
	}


	getInventoryAxe_1(n) {

		var inv = this.storages[n + 1];
		if (!inv)
			return Report.warn("!inv", `n=${n}`);

		return inv.items.find(item => item.isAxe());
	}


	// Cases where equipped axe is different from axe in weapon slot:
	// - getThrowInventoryItem
	// - etc.
	doEquipAxe(axe) {

		if (this.isCarrying())
			Report.warn("doEquipAxe: isCarrying", `${this}`);

		if (!axe)
			axe = this.getEquipAxe();

		if ( !axe.isOn3D() )
			axe.setOn3D(Engine.time);

		var matrix = new THREE.Matrix4().fromArray([ // mixamo: scale 100x
			100.00000223517, 0, 0, 0,
			0, 99.99999475975, 0.0000168587373, 0,
			0, -0.000016858736255, 99.999988799288, 0,
			-14.920072215, -7.44570043616, 30.92439948417, 1
		]);

		this.addDependentItem(axe, 'mixamorigRightHand', matrix);

		this.charData.equipRightHand = axe;
	}


	doDisarm() {

		var axe = this.charData.equipRightHand;

		if (!axe)
			return Report.warn('not armed', `${this}`);

		this.removeDependentItem(axe);

		this.charData.equipRightHand = null;
	}


	getRequiresReEquipAt(t) {

		var equipRH = this.getEquipRightHandAt(t);
		if (!equipRH)
			return;

		var weaponSlotItem = this.getEquipment().itemBySlotName("weapon");
		if (!weaponSlotItem || equipRH === weaponSlotItem)
			return;

		// have item in weapon slot; equipRH is non-empty, different

		return equipRH;
	}


	getEquipRightHand() { return this.charData.equipRightHand; }

	getEquipRightHandAt(t) {
		var res = Main.area.events.getEquipRightHandAt(this, t);
		return res !== undefined ? res : this.getEquipRightHand();
	}


	isCarrying() { return this.charData.isCarrying(); }

	getCarrying() { return this.charData.getCarrying(); }

	getCarryingAt(t) {
		var res = Main.area.events.getCarryingAt(this, t);
		return res !== undefined ? res : this.getCarrying();
	}

	isPlanningCarrying(item) {
		return Main.area.events.isPlanningCarrying(this, item);
	}

/*
	getInInventoryAt(item2, t) {
		return Main.area.events.getInInventoryAt(this, item2, t);
	}
*/
	isPlanningAxeHit() {
		return Main.area.events.isPlanningAxeHit(this);
	}


	// ========================================================
	//
	//   Various Properties / Queries
	//
	// ========================================================
/*
	getColor() {

		switch (Display.color.setting) {

			case 1: return "#a78050";
			case 2: return "#70c0b0";
			case 3: return "#d0c76a";
			case 4: return "#9280b0";
			case 5: return "#f4a460";
//bd80a0 pink?

			default:
				Report.warn("color not set");
				return "#a78050";
		};
	}
*/

	getActionTimeScale(type, refItem) {

		switch (type) {

		case "Walking":
			return this.speed / Char.speed;

		//case "GetAxeFromBase":
		//case "PutAxeBase":

		case "StandingEquipAxe":
		case "AxeDisarm":
			console.assert(refItem && refItem.isAxe());
			return 1 + refItem.getProps().equipSpeed / 100;

		case "AxeDownward":
		case "AxeHorizontal":
		case "AxeHorizontalStump":
			console.assert(refItem && refItem.isAxe());
			return 1 + refItem.getProps().hitRate / 100;

		};

		return 1;
	}


	updateUIInfo() {
		UI.setRequiresUpdateFor(this);
	}


	// ============================
	//
	//   New Char
	//
	// ============================

	static addNewChar_begin(headId, t = Engine.time) {

		if (CharData.CharAddHeadIds.indexOf(headId) === -1)
			return Report.warn("no such headId", `${headId}`);

		if ( Main.getChars().find(char => char.charData.headId === headId) )
			return Report.warn("char adready added", `${headId}`);

		var position = this.findPositionForPlaceholder(t);
		if (!position)
			return Report.warn("findPositionForPlaceholder");


		if ( !Main.user.spendForAddChar(headId) )
			return Report.warn("!spendForAddChar");

		var plhItem = Item.createTmp("charAppearEffectPlaceholder");
		plhItem.position.copy(position);
		plhItem.setStatic3D(t);

		var effectItem = Item.createTmp("charAppearEffect");
		effectItem.position.copy(position);
		effectItem.setCreateT(t); // <-- for effect changing with time
		effectItem.setMobile3D(t);

		var event = new ItemEvent(plhItem, "CharAppearStage", t + Char.CharAddStage1_T, effectItem, {
			headId,
			position
		});

		Main.area.events.add( event );

		var event2 = new ItemEvent(effectItem, "ItemCrumble", t + Char.CharAddStage1_T + Char.CharAddStage2_T);

		Main.area.events.add( event2 );

		return {
			position,
			plhItem
		};
	}


	static findPositionForPlaceholder(t) {

		var spec = ItemSpec.get("charAppearEffectPlaceholder");
		var prng = new Util.SeedablePRNG;

		var p = Char.CharAddCircle.getPoint();

		if ( !Main.area.spatialIndex.intersectsStaticOrTracks(spec, p) )
			return new THREE.Vector3(p.x, 0, p.y)

		for (let i = 0; ; i++) {

			p = prng.randPointInCircle(Char.CharAddCircle);

			if ( !Main.area.spatialIndex.intersectsStaticOrTracks(spec, p) )
				return new THREE.Vector3(p.x, 0, p.y)

			if (i >= 1000)
				return;
		}
	}


	static charAppearStage(plhItem, effectItem, target) {

		plhItem.removeItem();
		CGroup.updateAll();

		var char = this.doAddChar(target.headId, target.position, Engine.time);
		if (!char)
			return Report.warn("!doAddChar");

		Accounting.addEntry(null, "addNewChar", {

			headId: target.headId,
			position: target.position,
			charId: char.id
		});
	}


	static doAddChar(headId, position, t, localKey) {

		if (!CharData.isValidAddHeadId(headId))
			return Report.warn("bad headId", `${headId}`);

		var sameChar = Local.get(localKey).getAllChars().find(char => char.charData.headId === headId);
		if (sameChar)
			return Report.warn("have same char", `headId=${headId}`);

		var char = Item.fromJSON({

			specId: "char",
			id: Local.getNextItemId(localKey),
			x: position.x,
			z: position.z,
			positionType: Item.None,
			charData: { headId },
			facing: -1.57,
			createT: t,

		}, localKey);

		char.setPositionType(Item.Unit3D, t);

		return char;
	}

}


Object.assign(Char, {

	speed: 1.4970193,

	CharAddCircle: new Circle(246.5, 142, 4),

	CharAddStage1_T: 3,
	CharAddStage2_T: 5,

	QuaternionRotate180Y: new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 1, 0), Math.PI ),

	LiftItemPositionBase: new THREE.Vector3(25.036393, -14.42833, -14.2066),
	LiftItemPositionVNorm: new THREE.Vector3(28.259128, -64.82049, 70.708713), // mixamo: scale 100x
	LiftItemQuaternionBase: new THREE.Quaternion(0.2803981, -0.26464384, 0.838744243, 0.38451091),
	LiftItemScale: new THREE.Vector3(100, 100, 100),

	liftItemPosition: new THREE.Vector3,
	liftItemQuaternion: new THREE.Quaternion,
});


/*
Char.heads = [ // separate textures not used
	{ id: 1, gender: 1,
		texture: "head01",
		geometry: "head01a", geometryGlasses: "head01b",
	},
	{ id: 2, gender: 1,
		texture: "head02",
		geometry: "head02a", geometryGlasses: "head02b",
	},
	{ id: 3, gender: 1,
		texture: "head03a",
		geometry: "head03a",
	},
	{ id: 4, gender: 1,
		texture: "head03b",
		geometry: "head03b",
	},
	{ id: 5, gender: 1,
		texture: "head04a", textureGlasses: "head04c",
		geometry: "head04a", geometryGlasses: "head04c",
	},
	{ id: 6, gender: 1,
		texture: "head05a", textureGlasses: "head05b",
		geometry: "head05a", geometryGlasses: "head05c",
	},
	{ id: 7, gender: 1,
		texture: "head06",
		geometry: "head06",
	},
];
*/


export { Char };

