
class ItemProps {

	constructor() {

		this.cost = 0; // to buy in the shop.
		this.costCrystals = 0;

		this.hitStrength = 0;
		this.hitRate = 0; // in +%
		this.equipSpeed = 0; // in +%
		this.addHitStrengthVsTree = 0;
	}


	getCostCrystals() { return Math.floor(this.costCrystals) }

	hasCostCrystals() { return this.getCostCrystals() > 0 }


	canSell() {
		return !this.hasCostCrystals();
	}


	getSellCost() { return Util.froundCoins(this.cost * ItemProps.SELL_COST_MULT) }

	getTextSellCost() { return Util.formatCoins( this.getSellCost() ) }


	getBuyCost() {

		if ( this.hasCostCrystals() ) {
			Report.warn("has costCrystals");
			return Infinity;
		}

		return Util.froundCoins(this.cost);
	}


	getTextBuyCostAny() {

		return this.hasCostCrystals()
			? Util.formatCrystals( this.getCostCrystals() )
			: Util.formatCoins( this.getBuyCost() )
	}


	getHitStrengthVsTree() { return this.hitStrength + this.addHitStrengthVsTree }


	static createPropCompData() {

		var propCompData = {

			props: ( () => {

				var props = {};

				ItemProps.List.forEach(propName => props[propName] = {
					add: 0,
					mult: 1,
					postAdd: 0,
					ceilMultipleOf: 0,
					postAddIfNonZero: 0,
				});

				return props;
			})(),

			traverseProps(fn) {
				ItemProps.List.forEach(propName => fn(this.props[propName], propName));
			},
		};

		return Object.freeze(propCompData);
	}


	static clearPropCompData(propCompData) {

		propCompData.traverseProps( (data, propName) => {

			data.add = 0;
			data.mult = 1;
			data.postAdd = 0;
			data.ceilMultipleOf = 0;
			data.postAddIfNonZero = 0;
		});

		return propCompData;
	}

}


Object.assign(ItemProps, {

	List: [
		"cost", "costCrystals",
		"hitStrength", "hitRate", "equipSpeed", "addHitStrengthVsTree",
	],


	isInteger: (propName) => {

		switch (propName) {

			case "costCrystals":
			case "hitStrength":
			case "hitRate":
			case "equipSpeed":
			case "addHitStrengthVsTree":
				return true;
		};
	},

	isIntegerAfter100: propName => propName == "cost",

	SELL_COST_MULT: 0.4,

});




export { ItemProps }

