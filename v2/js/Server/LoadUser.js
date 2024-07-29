
var LoadUser = {


	initializeFromServerUserData(data) {

		if (!data || !data.user || !data.area || !data.slots || !data.items)
			return;

		Main.area = Area.fromJSON(data.area);


		// User.

		Main.user = new UserBase();
		Main.user.fromJSON(data.user);

		Display.cameraView.setLocation(Main.user.cameraLocation);

		if (Main.user.lang) // if not saved on server: remains from AppConfig
			Lang.doSwitch(Main.user.lang);

		if (AppConfig.isVK)
			VKUtil.checkDisplayAddToFavorites();


		// I. Set Engine.time, initialize

		var maxItemT = data.items.reduce( (max, itemData) => Math.max(max, itemData.updateT || 0), 0 );
		if (maxItemT > Main.user.endT)
			Report.warn("maxItemT > Main.user.endT", `${maxItemT} ${Main.user.endT}`);

		Engine.time = Main.user.endT;

		Accounting.start(); // requires Engine.time

		AI.start();


		TWEEN.now = () => Engine.time * 1e3;
		TWEEN.update(1e-4);


		// Ia. SLOTS (Require Engine.time)

		this.initSlotsFromJSON(data.slots);


		// II. Non-char items (+chars OK)
		//
		// What's missing:
		// - placement into storage

		this.initItemsFromJSON(data.items);

		if (data.shopItems)
			this.initItemsFromJSON(data.shopItems);

		Main.area.itemsWithShop.forEach(item => item.getShop().updateVisitedT() );

		if (Array.isArray(data.shopPositions))
			data.shopPositions.forEach(data => ShopPosition.fromJSON(data).addToShop() );
/*
		Main.area.containerPlacements.array.forEach(cP => {

			cP.addPlacedContainer();
		});
*/

		Main.area.surface.createSurfaceMeshes(); // after all slots & items (holes)


		console.log(`initializeFromServerUserData OK, Engine.time=${Engine.time}`);

		return true;
	},



	initSlotsFromJSON(slots) {

		if (!Array.isArray(slots))
			Report.throw("bad slots data", slots);

		Local.get().slots.fromJSON(slots);
// TODO slot item conflicting?
// must check conflicts before saving.
//		Local.get().slots.updateItems(Engine.time, undefined, "initialPlacement");

		CGroup.updateAll();
	},


	initItemsFromJSON(items) {

		if (!Array.isArray(items))
			Report.throw("bad items data", items);

		var createdItems = [];
		var containerPlacements = [];

		items.forEach(itemData => {

			var item = Item.fromServerData(itemData);

			if (!item)
				return Report.warn("no item", itemData);

			createdItems.push(item);

			item.forEachContainerPlacement( cP => containerPlacements.push(cP) );
		});

		CGroup.updateAll();


		createdItems.forEach(item => {

			var storage = item.getStorage();
			if (!storage)
				return;

			storage.placeItem(item);
		});

		containerPlacements.forEach( cP => cP.addPlacedContainer() );


		Main.area.logStorages.forEach(logStorage => {
if (0) {
			var oS1 = logStorage.circlePacking.openSlots.all();

			logStorage.circlePacking.recomputeOpenSlots();

			var oS2 = logStorage.circlePacking.openSlots.all();

			if ( !oS1.every((s,i) => s.circle.equalsEpsilon(oS2[i].circle, 0)) )
				Report.warn("After recomputeOpenSlots, found inequality");
			else
				console.log(`recomputeOpenSlots OK ${logStorage.getSize()}`);
}
			logStorage.circlePacking.recomputeOpenSlots();
		});

	},



/*
Main.auth.sessionKey = ""; LoadUser.loadUsingSessionKey()


	loadUsingSessionKey() {

		Engine.stop();

		Server.sendRequestLoadUserUsingSessionKey(data => {

			Main.reset();

			LoadUser.initializeFromUserData(data.loadUser);

			Messages.add(`Loaded.`);

			MiniMap.init(Main.area);

			Engine.stopped = false;


		}, () => { // onAuthReject

console.error(`onAuthReject`);
		});

	},
*/
}




