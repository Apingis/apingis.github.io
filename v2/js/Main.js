

var Main = {

	isServer: (typeof window === "undefined"),

	noServer: false,

	user: null,

	createdNewUser: 0,
	staticDBVersion: 0,


	getUserMsgId() {

		if (AppConfig.noServer)
			return "User: none (no server)";

		if (!this.user)
			return "User: none";

		return `${this.user.login}  "${this.user.origin}"  ${Math.floor(Date.now()/1000)}`;
	},


	// ===============================================================
	//
	//   DEBUG: integer value.
	//
	// 0: none
	// 1..4: "OK for regular operation" (3: mediocre overhead)
	// >= 5: "development" (incl.intentional memory leaks)
	//
	// ===============================================================

	//DEBUG: 0,
	//DEBUG: 1,
	DEBUG: 5,

	area: null,

	units: [],
	chars: [],
	robots: [],

	updateIfVisible: [],

	// TODO? Item.Mobile3D

	highlightItem: null,
	selectedItem: null,
	lastSelectedUnit: null,

};


	// ===============================================================
	//
	//     I T E M S: Lists, display
	//
	// ===============================================================


Main.addItem = function(item) {

	if (this.isServer)
		return;

	this.area.addItem(item);

/*
	this.area.display.add(item);

	this.area.spatialIndex.insert(item);
*/
	if (item.isBaseCenter()) {

		if (this.area.baseCenter)
			Report.warn("already have area baseCenter");

		this.area.baseCenter = item;
	}

	if (item.isTower()) {

		if (this.area.tower)
			Report.warn("already have tower in the area");

		this.area.tower = item;
	}

	item.forEachLogStorage(storage => {

		storage.updatePosition();
		this.area.logStorages.push(storage);
	});


	if (item.hasShop()) {
		this.area.itemsWithShop.push(item);
	}


	let crowdedAreas = item.getCrowdedAreas();
	if (crowdedAreas)
		Main.area.crowdedAreas.push(...crowdedAreas);


	item.forEachContainerPlacement( cP => {

		cP.update();
		Main.area.containerPlacements.push(cP);
	});


	if ( item.isUnit() ) {

		this.units.push(item);

		if (item.isChar())
			this.chars.push(item);
		else if (item.isRobot())
			this.robots.push(item);

	} else if ( item.getOptionUpdateIfVisible() ) {

		this.updateIfVisible.push(item);
	}

}



Main.removeItem = function(item) {

	if (this.isServer)
		return;


	this.area.removeItem(item);
/*
	this.area.display.remove(item);

	this.area.spatialIndex.remove(item);
*/
	if (item.isBaseCenter())
		this.area.baseCenter = null;

	if (item.isTower())
		this.area.tower = null;

	item.forEachLogStorage(s => Util.removeElement(this.area.logStorages, s));

	if (item.hasShop())
		Util.removeElement(this.area.itemsWithShop, item);

	Util.removeElements( Main.area.crowdedAreas, item.getCrowdedAreas() );

	item.forEachContainerPlacement( cP => Main.area.containerPlacements.remove(cP) );

	if ( item.isUnit() ) {

		Util.removeElement( this.units, item );

		if (item.isChar())
			Util.removeElement( this.chars, item );
		else if (item.isRobot())
			Util.removeElement( this.robots, item );

	} else if ( item.getOptionUpdateIfVisible() ) {

		Util.removeElement( this.updateIfVisible, item );
	}

}



	// ===============================================================
	//
	//     Initialize.
	//
	// ===============================================================

/*	reset() {

		Util.filterInPlace(scene.children, mesh => mesh instanceof THREE.Light);

		UI.setScreen(); // remove any screen (if any)

		UIPrefs.materialConf.clearAll();

		this.area.displayIndex.clearAll();

		CGroup.clearAll();

		Episode.Targets.init();

		Local.get().getItems().forEach(item => item.removeDisplay());
		Local.create(undefined, true); // re-create


		this.user = new UserBase;

		this.area = null;

		this.chars = [];

		this.highlightItem = null;
		this.selectedItem = null;
		this.lastSelectedUnit = null;

	},

};
*/

Object.assign(Main, {

	getUnits() { return this.units },

	getChars() { return this.chars },

	getRobots() { return this.robots },

	getUpdateIfVisible() { return this.updateIfVisible },


	getNextUnit(ifPrev) {

		var units = this.getUnits();
		var unit;

		if ( Main.selectedItem && Main.selectedItem.isUnit() ) {
			unit = Main.selectedItem;

		} else {

			unit = this.lastSelectedUnit;

			if (unit && !ifPrev)
				return unit; // unit not selected: last unit that was selected before
		}

		var i = units.indexOf(unit);

		if (ifPrev)
			i = i > 0 ? i - 1 : units.length - 1;
		else
			i = i < units.length - 1 ? i + 1 : 0;

		return units[i];
	},


	clickNextUnit(ifPrev) {

		if (this.freeMoveStoppedUntilT > Engine.time)
			return;

		var unit = this.getNextUnit(ifPrev);

		this.select(unit); // (-)updates position facing, activates display
		// selected item can be off-screen and w/o display


		//Display.cameraView.startFollowing(unit); <-- from ScreenCharInfo

		if ( window['ScreenCharInfo'] && !ScreenCharInfo.cameraFollow )
			unit && Display.cameraView.startMoveToItem(unit);
	},


	isCharSelected() { return this.selectedItem && this.selectedItem.isChar() },


	select(item) { this.selectedItemSet(item); },


	selectedItemSet(item = null) {

		if (typeof item == "number")
			item = Item.getById(item);

		if (item) {

			if (!item.canBeSelected()) {
				console.error(`item can't be selected ${item}`);
				return;
			}

			if (item.isRemoved()) {
				console.error(`item is removed ${item}`);
				return;
			}

			if (item.isChar())
				Main.user.progress.onSelectChar(item);
		}

		var prevItem = this.selectedItem;


		this.selectedItem = item;

		if (prevItem && prevItem.isChar())
			this.lastSelectedUnit = prevItem;


		if (prevItem)
			prevItem.removeSelection();

		if (item)
			item.addSelection();

		if (UI.hasOpen('BaseCenter')) {
			if ( !Main.area.baseCenter || !Main.area.baseCenter.isAtApproachPoint(item) )
				UI.setScreen();
		}

		UI.selectItem(item);
	},

});


/*
Main.VKPhotoUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAMAAACfWMssAAAASFBMVEUNCA0iByA+BzlYBlYyKjGyBrSSFYjRB93kAPNWQ1OLTnt0XXPwMc/+LeGZeZjkXs3wY/LVf8DAmcD8n+nis+D/yv78zv306PQugBy7AAACoklEQVRIx+2WyZbjIAxFxYxjjAew8v9/2mKywUkvupZ9ilUwXD1JCBQ4fzjgF/z/QfwhiBF/BKKXM/47iDgDgMfhE+IHiPgMb4JpFT2JcYLbhQb6+RjAKOEVVivg6DBg4EcQPbkl5yPGkkk8Enc6a7iM2Z9Ijr/2RUBLWAUlU0pwgMkfxY7cQ3hv1iomI+IxAXvt52osGcIbxAiv1VqjtAB54DnDtAfE9xk2q2AiNfkKISDtoWkPzhCCsWloNp8ROOmF9ztJpq15TobClgyVfBVQTuG92mWxxmoZI2i37uGN72xLQZ6fZCgsZBoOrCAesCf7J3EUlI+wOudCDGEzyhjDQC2Lox0hGyphQvX0rJy1Qh5AnFudVlveydhCA0nUpKGyJKTUyPkkv/YSpWJzBmnYMoATt7lFbXmHborJ031dW3oMncoDFEseqkzFVGOkU9OOvq91QT9AAzpzrhoudVdc5cMKZ4VTDVS9oOqy6sH1Szpn9QLVuCrkdY5UOKMk48vfQTZjXzkPyVGxt1o9vWq1Jq7FL5Yb1DB4Cid2t+MhKaBT1Kxf4n2R/0WyWelB096E+gJckq5tvhUF70LUEAfwfEgqqokGctFZ5BIfr9zMXJc8I7irGhWsnjL/BI+xsJJkBZm+QQXx412duOvTw0UDs8U6EfLjQcaHpGbrJ2j49bDeinGQvBVLjStT7urx2QKo1NUtmc6jge4KQF8h9mC7XSkP+TjMXeMtxOkL2EsaoNPIm5WAFGMNkflv3eq6XUvazVfiNYM0ypkaeq4P/NbmqO601kIIBjN1GC5SQ5n86YHRZ7IhPX7tjxQlLUo5TZ7axUw/qIVR/0uNin772PdCGHv3QQ2r9E9qULE1UjITh6760ZGxX+43Iv7+s/oFh/EHrTHFktbuYW0AAAAASUVORK5CYII=';
*/

Main.VKPhotoUrl = AppConfig.urlStatic + 'img/crystals.jpg';  // IT CACHES


Main.VKPayment = {

	paymentItems: [

		{ crystals: 10, votes: 10, item: "crystals10",
			itemId: 1,
			title: '10 кристаллов',
			photoUrl: Main.VKPhotoUrl,
		},

		{ crystals: 50, votes: 50, item: "crystals50",
			itemId: 3,
			title: '50 кристаллов',
			photoUrl: Main.VKPhotoUrl,
		},

		{ crystals: 100, votes: 100, item: "crystals100",
			itemId: 4,
			title: '100 кристаллов',
			photoUrl: Main.VKPhotoUrl,
		},

		{ crystals: 200, votes: 200, item: "crystals200",
			itemId: 5,
			title: '200 кристаллов',
			photoUrl: Main.VKPhotoUrl,
		},
	],
}




export { Main };

