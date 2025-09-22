
import { CustomItem } from './CustomItem.js';


class Container extends CustomItem {

	constructor(spec) {

		if ( !(spec.data.storages && spec.data.storages.length === 1
				&& spec.data.entity == "container") )
			Report.warn("bad container", spec);

		super(spec);
	}


	toString() {

		var idStr = ` id=${this.id}`;
		var extra = this.isRemoved() ? " REMOVED" : "";

		var cP = this.getPlacement();
		var cPStr = cP ? " noCP" : ` cP=${cP}`;

		return `[${this.spec.name}${idStr}${extra}${cPStr}]`;
	}


	isContainer() { return true }

/*
	fromJSON(data) { // called from Item.fromJSON(), w/ correct constructor

		super.fromJSON(data);

		this.charData.fromJSON(data.charData);
	}


	toJSON() {

		var data = super.toJSON();

		return data;
	}
*/

	//onAfterCreate() {}


	// ========================================================
	//
	//     Appearance
	//
	// ========================================================

	getMesh() { return this.spec.getMesh() }



	// ========================================================
	//
	//   Handle Stored Content.
	//
	// ========================================================


	isEmpty() { return this.storages[0].getItems().length === 0 }

	isAboutFull() { return this.storages[0].isAboutFull() }

	getSummary(summary) { return this.storages[0].getSummary(summary) }



	// ========================================================
	//
	//   Operations
	//
	// ========================================================

	fixInFlightStorageContent() { // or not thrown yet; this doesn't matter for server

		this.storages[0].logs.forEach( log => {

			if ( log.getDependentOn() === this )
				return;

			if ( !log.storagePosition )
				return Report.warn("!storagePosition", `${log} ${this}`);

			var char = Main.getChars().find(char => char.charData.carryId === log.id);

			if (char) {

				char.removeDependentItem(log);
				char.charData.carryId = null;
				//char.updateDisplay();
				Report.warn("fixInFlightStorageContent carried", `${this} ${char}`);

				//item.useQuaternion( this.charData.getThrowToPile_Quaternion(oP.unitFacing, type) );

				// oops.. OK
				let q = char.charData.getThrowToPile_Quaternion(

					this.storages[0].operationPoints[0].unitFacing,
					"ThrowLeft90"
				);

				log.useQuaternion( q );

			} else
				Report.warn("fixInFlightStorageContent", `${this}`);

			log.stopAllTweens();

			this.storages[0].setLogLocalCoord( log );
			this.addDependentItem( log );
		});
	}


	// ========================================================
	//
	//   Various
	//
	// ========================================================

	getPlacement() {
		return Main.area.containerPlacements.find(cP => cP.container === this);
	}


	getPlacementBaseItem() {

		var cP = this.getPlacement();

		return cP && cP.baseItem;
	}


	isAllowedLogThrow() { // not on CP = always allow

		if ( !this.isOn3D() )
			return;

		//if ( this.isDependent() ) // can be temporary (e.g. cP.isMoving)
		//	return;

		var cP = this.getPlacement();

		if ( cP && !cP.baseItem.isCPAllowLogs(cP.n) )
			return;

		return true;
	}


	robotCanLoad() {
		return this.isOn3D() && !this.isRemoved() && !this.isInStorage()
	}


	getGrabLocations(p = this.getPoint(), facing = this.facing, force) {

		console.assert(!force);

		return Container.getGrabLocations(p.x, p.y, facing);
	}


	static getGrabLocations(x, y, facing) {

		// expecting unit to be robot

		var d = 2.25;

		var	distX = d * Math.cos(facing - Math.PI / 2),
			distY = d * Math.sin(facing - Math.PI / 2);

		return [
			new ApproachPoint(x + distX, y + distY, facing, d), // unit facing while grabbing
			new ApproachPoint(x - distX, y - distY, Angle.opposite(facing), d),
		];
	}


	static getUnitFitGrabLocations(unit, x, y, facing) {

		var aPoints = this.getGrabLocations(x, y, facing);

		return Util.filterInPlace(aPoints, aP => {

			if (Main.area.spatialIndex.unitFits(unit, aP.x, aP.y))
				return true;
		});
	}


}




export { Container }

