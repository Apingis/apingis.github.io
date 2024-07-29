
//import { ChainsCollection } from './ChainsCollection.js';


class ItemDataTexture {

	constructor(options = {}) {

		this.options = options;

		this.dataArray = null;
		this.textureSize = new THREE.Vector2( ItemDataTexture.WIDTH_PX, 0 ); // in px. (=vec4's)
		this.texture = null;
		//this.proxyTexture = null;

		this.iIdPool = new ItemDataTexture.IIdPool('', () => this.updateTextureSize() );
	}


	allocateIId(item) { return this.iIdPool.allocateIId(item) }

	allocateBlockIId(sizeFloats) { return this.iIdPool.allocateBlockIId(sizeFloats) }

	freeIId(iId, item) { this.iIdPool.freeIId(iId, item) }


	updateTextureSize() {

		var dataArray = new Float32Array( 4 * ItemDataTexture.WIDTH_PX * this.iIdPool.nRows );

		if (this.dataArray)
			dataArray.set(this.dataArray);

		this.dataArray = dataArray;

		if (this.texture)
			this.texture.dispose();

		this.textureSize.y = this.iIdPool.nRows;

		if ( !(this.textureSize.y > 0) || this.textureSize.y >= 4096 )
			Report.warn("texture height", `rows=${this.textureSize.y}`);

		// .magFilter = THREE.NearestFilter; .wrapT, .wrapS = THREE.ClampToEdgeWrapping (no mips)

		// Error: WebGL warning: drawElements: This operation requires zeroing texture data. This is slow.
		// (OK, NP)

		this.texture = new THREE.DataTexture(

			dataArray,
			ItemDataTexture.WIDTH_PX, this.textureSize.y,
			THREE.RGBAFormat, THREE.FloatType
		);

		this.texture.needsUpdate = true;
	}



	updateTexture() {

		if (!this.texture)
			return Report.warn("no item data texture");

		if (this.texture.needsUpdate === true)
			return;

		var props = Display.renderer.properties.get( this.texture );

		if (!props || !props.__webglTexture) {

			// Cases:
			// - texture was not passed into uniforms yet

			this.texture.needsUpdate = true;
			return;// Report.warn("no texture props");
		}

		var gl = Display.renderer.getContext();

		gl.bindTexture(gl.TEXTURE_2D, props.__webglTexture);

		gl.pixelStorei( 37440, this.texture.flipY );
		gl.pixelStorei( 37441, this.texture.premultiplyAlpha );
		gl.pixelStorei( 3317, this.texture.unpackAlignment );

		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.textureSize.x, this.textureSize.y, gl.RGBA, gl.FLOAT, this.dataArray);

		//gl.texSubImage2D(gl.TEXTURE_2D, 0, 4, 4, 4, 4, gl.RGBA, gl.FLOAT, this.dataArray, 64);

		//return;

		if (0) {

			// THREE: No easy access to .texSubImage2D() w/ ability to specify Float32Array w/ source offset
			// no access to renderer.setTexture2D()

			Display.renderer.copyTextureToTexture(

				{ x: 0, y: 0 },
				this.proxyTexture,
				//{ image: { width: this.textureSize.x, height: this.textureSize.y, data: this.dataArray } }, // won't go
				this.texture
			);
		}
	}


}



ItemDataTexture.WIDTH_PX = 1024; // px is vec4
ItemDataTexture.ELEM_WIDTH_PX = 4; // 4 px = 16 floats. Each elem. has unique IID

ItemDataTexture.WIDTH_ELEMS = ItemDataTexture.WIDTH_PX / ItemDataTexture.ELEM_WIDTH_PX;


ItemDataTexture.DataSizes = { // in chunks of size ELEM_WIDTH_PX

	_sizeByKey: null,
	_keysAsc: null,

	getByKey(key) {

		if (!this._sizeByKey)
			this._create();

		return this._sizeByKey[key];
	},


	getKeys() {

		if (!this._keysAsc)
			this._create();

		return this._keysAsc;
	},


	getMaxKeySizeFloats() {

		var keys = this.getKeys();

		return this._sizeByKey[ keys[ keys.length - 1 ] ] * 4 * ItemDataTexture.ELEM_WIDTH_PX;
	},


	_create() {

		this._sizeByKey = {

			'size_static':	Math.ceil( (

				1 + 1 * 3 // in vec4's or px.

			) / ItemDataTexture.ELEM_WIDTH_PX),


			'size_skinned':	Math.ceil( (

				1 + 22 * 3

			) / ItemDataTexture.ELEM_WIDTH_PX),


			'size_skinned_chains':	Math.ceil( (

				1 + ChainsCollection.START_SKIN_INDEX * 3
				+ ChainsCollection.CHAINS_MAX * ChainsCollection.DATA_MATRIX_ELEMS * 3

			) / ItemDataTexture.ELEM_WIDTH_PX),


			'size_half_row': ItemDataTexture.WIDTH_ELEMS / 2,
		};


		this._keysAsc = Object.keys(this._sizeByKey).sort( (a, b) =>
			this._sizeByKey[a] - this._sizeByKey[b] );
	},
};



ItemDataTexture.IIdPool = function(name = '', onSizeChangeFn) {

	this.name = name;
	this.onSizeChangeFn = onSizeChangeFn;
	this.nRows = 0;

	this.rowSizeById = {};
	this.rowsBySize = {};

	ItemDataTexture.DataSizes.getKeys().forEach( sizeKey => {

		this.rowsBySize[ sizeKey ] = {

			free: new Heap,
			rowFreeIIdsById: new Map,
		};
	});

	// Reserve iId #0 (no need; probs. w/ skipFnUpdate if 1 static obj.)
	//this._allocateIId( ItemDataTexture.DataSizes.getKeys()[0], true );
}


Object.assign( ItemDataTexture.IIdPool.prototype, {

	toString() { return `[IIdPool "${name}" nRows=${this.nRows}]` },

	getSize(sizeKey) { return ItemDataTexture.DataSizes.getByKey(sizeKey) },

	getKeyBySize(sizeElems) {
		return ItemDataTexture.DataSizes.getKeys().find(key => this.getSize(key) >= sizeElems);
	},
/*
	getMaxKeySize() {
		var keys = ItemDataTexture.DataSizes.getKeys();
		return keys[ keys.length - 1 ];
	},
*/

	addRow(sizeKey, skipFnUpdate) {

		var rowsBySize = this.rowsBySize[ sizeKey ];
		var rowId = this.nRows;

		this.rowSizeById[ rowId ] = sizeKey;

		rowsBySize.free.insert(rowId);

		var size = this.getSize(sizeKey);
		var rowFreeIIds = new Heap;

		for (let i = 0; i < ItemDataTexture.WIDTH_ELEMS - size + 1; i += size)

			rowFreeIIds.push(i + rowId * ItemDataTexture.WIDTH_ELEMS);

		rowsBySize.rowFreeIIdsById.set(rowId, rowFreeIIds);

		this.nRows ++;

		if (!skipFnUpdate)
			this.onSizeChangeFn && this.onSizeChangeFn( this.nRows );
	},


	allocateBlockIId(sizeFloats) {

		var sizeElems = Math.ceil( sizeFloats / (4 * ItemDataTexture.ELEM_WIDTH_PX) );
		var key = this.getKeyBySize(sizeElems);

		if (!key) {
			return Report.warn("allocateBlockIId: size too big (TODO)",
//				`sizeFloats=${sizeFloats}, max=${this.getMaxKeySize()}`);
				`sizeFloats=${sizeFloats}, max=${ItemDataTexture.DataSizes.getMaxKeySizeFloats()}`);
		}

		var iId = this._allocateIId(key);

		return [ iId ];
	},


	allocateIId(item) { return this._allocateIId( item.getDisplayDataSize() ) },


	_allocateIId(sizeKey, skipFnUpdate) {

		//var sizeKey = item.getDisplayDataSize();
		var rowsBySize = this.rowsBySize[ sizeKey ];

		if (!rowsBySize)
			return Report.warn("incorrect sizeKey", `${this} ${sizeKey}`);

		var rowId = rowsBySize.free[0];

		if (rowId === undefined) {

			this.addRow(sizeKey, skipFnUpdate);
			rowId = rowsBySize.free[0];
		}

		var rowFreeIIds = rowsBySize.rowFreeIIdsById.get(rowId);
		var iId = rowFreeIIds.fetch();

		if (iId === undefined)
			return Report.warn("no iId in a free row", `${this} ${sizeKey} rowId=${rowId}`);

		if (rowFreeIIds[0] === undefined) {

			rowsBySize.free.fetch();
		}

		//console.log(`allocated ${sizeKey} ${iId}`);

		return iId;
	},


	freeIId(iId, item) { this._freeIId( iId, item && item.getDisplayDataSize() ) },


	_freeIId(iId, sizeKeyForCheck) {

		var rowId = Math.floor(iId / ItemDataTexture.WIDTH_ELEMS);

		if (rowId >= this.nRows)
			return Report.warn("freeIId 1", `${this} ${iId} ${rowId} ${sizeKey}`);

		var sizeKey = this.rowSizeById[ rowId ];

		if ( sizeKeyForCheck && sizeKey !== sizeKeyForCheck )
			return Report.warn("freeIId 2", `${this} ${iId} ${rowId} ${sizeKey} ${sizeKeyForCheck}`);

		var size = this.getSize(sizeKey);

		if (size > 1) {

			let numInRow = (iId - rowId * ItemDataTexture.WIDTH_ELEMS) / size;

			if (numInRow !== Math.floor(numInRow))
				return Report.warn("freeIId 3", `${this} ${iId} ${rowId} ${sizeKey}`);
		}

		var rowsBySize = this.rowsBySize[ sizeKey ];
		var rowFreeIIds = rowsBySize.rowFreeIIdsById.get(rowId);

		rowFreeIIds.insert(iId);

		if ( rowsBySize.free.indexOf(rowId) === -1 ) // OK for the app.
			rowsBySize.free.insert(rowId);

		//console.log(`freed ${sizeKey} ${iId}`);
	},

});




export { ItemDataTexture }

