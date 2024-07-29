
var MaterialConf = Object.seal({

	'charSkinned': {
		aggregate:	'charAggregateSkinned',
		aggregateDepth: 'charAggregateSkinnedDepth',
		//quadIndexType: "fixed",
		//quadSize: 100,
	},
	'robotSkinned': {
		aggregate:	'robotAggregateSkinned',
		aggregateDepth: 'robotAggregateSkinnedDepth',
	},
	'baseCenterSkinned': {
		aggregate:	'baseCenterAggregateSkinned',
		aggregateDepth: 'baseCenterAggregateSkinnedDepth',
	},


	'fenceSkinned': {
		aggregate:	'fence_AggregateSkinned',
		aggregateDepth: 'fence_AggregateSkinnedDepth',
	},


	'aspen_trunk': {
		aggregate:	'aspen_trunk_AggregateWind',
		aggregateDepth: 'aspen_trunk_AggregateWindDepth',
		quadIndexType: "fixed", quadSize: 100,
	},
	'aspen_leaves': {
		aggregate:	'aspen_leaves_AggregateWind',
		aggregateDepth: 'aspen_leaves_AggregateWindDepth',
		quadIndexType: "fixed", quadSize: 100,//quadSizeX: 100, quadSizeY: 100,
	},


	'ground051': {
		aggregate:	'ground051_Aggregate',
		aggregateDepth:	'ground051_AggregateDepth',
	},
	'rock_04': {
		aggregate:	'rock_04_Aggregate',
		aggregateDepth:	'rock_04_AggregateDepth',
	},
	'rock_06': {
		aggregate:	'rock_06_Aggregate',
		aggregateDepth:	'rock_06_AggregateDepth',
	},

});




class MaterialQuadIndex {

	constructor(matName, rect, areaDisplay, areaPartDisplay) {

		console.assert(typeof matName == 'string');
		console.assert(rect instanceof Rectangle);

		this.matName = matName;
		this.rect = rect;
		this.areaDisplay = areaDisplay;
		this.areaPartDisplay = areaPartDisplay;

		this.conf = MaterialConf[ this.matName ]

		if (!this.conf || !this.conf.aggregate) {

			Report.warn("MaterialQuadIndex disabled", `matName=${matName}`);
			this.type = "";

		} else
			this.type = this.conf.quadIndexType || "basic";


		this.quad = null;

		if (this.type == "basic")
			this.quad = this.createQuad();

		this.quads = null;
		this.quadByItemId = null;

		if (this.type == "fixed") {

			this.quads = Object.preventExtensions(
				new Array( this.getFixedQuadsX() * this.getFixedQuadsY() ).fill(null) );
			this.quadByItemId = new Map;
		}
	}


	createQuad() { return new MaterialQuad(this.matName, this.conf, this.areaDisplay, this.areaPartDisplay) }

	getFixedSizeX() { return this.conf.quadSizeX || this.conf.quadSize }

	getFixedSizeY() { return this.conf.quadSizeY || this.conf.quadSize }

	getFixedQuadsX() { return Math.ceil( this.rect.getWidth() / this.getFixedSizeX() ) }

	getFixedQuadsY() { return Math.ceil( this.rect.getHeight() / this.getFixedSizeY() ) }


	getFixedQuadByItemRect(item) {

		var rect = item.getDisplayRect();

		var	x = Util.clamp( rect.getCenterX(), this.rect.minX, this.rect.maxX ),
			y = Util.clamp( rect.getCenterY(), this.rect.minY, this.rect.maxY );

		var	quadX = Math.floor( (x - this.rect.minX) / this.getFixedSizeX() ),
			quadY = Math.floor( (y - this.rect.minY) / this.getFixedSizeY() ),
			i = quadX + quadY * this.getFixedQuadsX();

		return this.quads[i] || ( this.quads[i] = this.createQuad() );
	}


	remove(item) {

		if (this.type === "")
			return;

		if (this.type == "basic")
			return this.quad && this.quad.remove(item);

		var quad = this.quadByItemId.get(item.id);

		if (quad) {
			quad.remove(item);
			this.quadByItemId.delete(item.id);
		}
	}


	add(item) {

		if (this.type === "")
			return;

		if (this.type == "basic")
			return this.quad && this.quad.add(item);

		var quad = this.getFixedQuadByItemRect(item);

		quad.add(item);
		this.quadByItemId.set(item.id, quad);
	}


	updateGeometry(item) {

		if (this.type === "")
			return;

		if (this.type == "basic")
			return this.quad && this.quad.updateGeometry(item);

		var quad = this.quadByItemId.get(item.id);

		quad && quad.updateGeometry(item);
	}


	updateDisplayRect(item) {

		if (this.type === "")
			return;

		if (this.type == "basic")
			return this.quad && this.quad.updateDisplayRect(item);

		var currentQuad = this.quadByItemId.get(item.id);

		if (!currentQuad)
			return;

		var quad = this.getFixedQuadByItemRect(item);

		if (quad === currentQuad)
			return quad.updateDisplayRect(item);

		this.remove(item);
		this.add(item);
	}


	//
	//    D E B U G
	//

	getAllQuads() {

		return this.type === "" ? []
			: this.type == "basic" ? [ this.quad ]
			: this.type == "fixed" ? this.quads.filter(quad => !!quad)
			: [];
	}

}




export { MaterialQuadIndex }

