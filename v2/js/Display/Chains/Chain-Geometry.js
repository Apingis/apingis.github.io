
import { ChainsCollection } from './ChainsCollection.js';


Object.assign( ChainsCollection.Chain.prototype, {


	getObjGeometry(name) {

		var obj;

		if (this.data.scene)
			obj = this.data.scene.getObjectByName(name);

		if (!obj && this.chains.scene)
			obj = this.chains.scene.getObjectByName(name);

		if (!obj)
			return Report.warn("no obj", `name=${name} ${this}`);

		return obj.geometry;
	},


	addChainGeometries(geometries) {

		for (let elementIndex = 0; elementIndex < this.data.nElements; elementIndex++) {

			let objName = this.data.elementObjects[ elementIndex % this.data.elementObjects.length ]
			let geometry = this.getObjGeometry( objName ).clone();

			Util.addSkinToGeometry(geometry, 0, {

				fillZeroWeights: true,
				useUint8: true,
			});

			let	skinIndexAttr = geometry.attributes.skinIndex;
				//skinWeightAttr = geometry.attributes.skinWeight;

			for (let i = 0; i < skinIndexAttr.count; i++) {

				skinIndexAttr.array[ i * 4 ] = ChainsCollection.START_SKIN_INDEX + this.n;
				skinIndexAttr.array[ i * 4 + 1 ] = elementIndex & 255;
				skinIndexAttr.array[ i * 4 + 2 ] = elementIndex >>> 8;
				skinIndexAttr.array[ i * 4 + 3 ] = 0;

				//skinWeightAttr.array[ i * 4 ] = 0;
			}

			geometry.name = `${this} element ${elementIndex}`;

			geometries.push(geometry);
		}
	},


	addCylinderGeometry(geometries) {

		if ( !this.data.cylinderObject )
			return Report.warn("no cylinder object", `${this}`);

		var geometry = this.getObjGeometry( this.data.cylinderObject ).clone();

		geometry.name = `${this} cylinder`;

		this.processCylinderGeometry(geometry);

		geometries.push(geometry);
	},


	processCylinderGeometry(geometry, chainArrayIndex = this.n) {

		if ( !(geometry instanceof THREE.BufferGeometry) )
			Report.warn("bad cylinder geometry", `c=${geometry.constructor && geometry.constructor.name}`);

		//if (geometry.attributes.skinIndex)
		//	Report.warn("cylinder has skin", `i=${chainArrayIndex}`);

		if ( !geometry.attributes.skinIndex )

			Util.addSkinToGeometry(geometry, 0, {

				fillZeroWeights: true,
				useUint8: true,
			});

		let	skinIndexAttr = geometry.attributes.skinIndex;

		for (let i = 0; i < skinIndexAttr.count; i++) {

			skinIndexAttr.array[ i * 4 ] = ChainsCollection.START_SKIN_INDEX + chainArrayIndex;
			skinIndexAttr.array[ i * 4 + 3 ] = 1;
		}
	},


	_addSkinToRopeGeometry(geometry, baseChainElemIndex) {

		console.assert(geometry.index);

		var positionArray = geometry.attributes.position.array;
		var indexArray = geometry.index.array;

		var resultSkinIndexArray = new Uint8Array( positionArray.length / 3 * 4 );

		var skinIndex0 = ChainsCollection.START_SKIN_INDEX + this.n;

		var elemHeight = this.data.ropeHeight / (this.data.ropeNlements - 1);

		var getChainElemIndex = y => Math.floor( y / elemHeight + 0.5 );

		for (let i = 0, len = indexArray.length; i < len; i++) {

			let	i0 = indexArray[i];
			let ci = baseChainElemIndex + getChainElemIndex( positionArray[ i0 * 3 + 1 ] );

			resultSkinIndexArray[ i0 * 4 ] = skinIndex0;
			resultSkinIndexArray[ i0 * 4 + 1 ] = ci & 255;
			resultSkinIndexArray[ i0 * 4 + 2 ] = ci >>> 8;
			//resultSkinIndexArray[ i0 * 4 + 3 ] = 0; // zeroed on array creation
		}

		geometry.setAttribute("skinIndex",
			new THREE.BufferAttribute( resultSkinIndexArray, 4) );

		geometry.setAttribute("skinWeight", // empty attrib.
			new THREE.BufferAttribute( new Float32Array(resultSkinIndexArray.length), 4) );
	},


	addRopeGeometries(geometries) {

		console.assert(this.data.nElements > 1);

		var processAndGoGeometry = (geometry, chunkId) => {

			this._addSkinToRopeGeometry(geometry, chunkId * (this.data.ropeNlements - 1));

			var positionArray = geometry.attributes.position.array;

			for (let i = 0, len = positionArray.length; i < len; i += 3)
				positionArray[i + 1] = 0;

			geometries.push( geometry );
		}


		var geometryOrig = this.getObjGeometry( this.data.ropeObject );

		var nFullRopes = Math.floor( this.data.nElements / (this.data.ropeNlements - 1) );
		var elementsRemain = this.data.nElements - nFullRopes * (this.data.ropeNlements - 1);

		if (elementsRemain === 0) {

			nFullRopes = Math.max(0, nFullRopes - 1);
			elementsRemain = this.data.ropeNlements - 1;
		}

		var chunkId;

		for (chunkId = 0; chunkId < nFullRopes; chunkId++) {

			let geometry = geometryOrig.clone();

			geometry.name = `${this} rope #${chunkId} (total ${nFullRopes})`;

			processAndGoGeometry( geometry, chunkId );
		}

		if (elementsRemain > 1) { // Rope: 1 element wouldn't be visible

			let geometry = this._createCutRopeGeometry(geometryOrig, elementsRemain);

			geometry.name = `${this} cut rope,`
				+ ` ${elementsRemain} elems of ${this.data.ropeNlements})`;

			processAndGoGeometry( geometry, chunkId );
		}
	},


	_createCutRopeGeometry(geometryOrig, nElements) {

		var geometry = geometryOrig.toNonIndexed();

		var positionArray = geometry.attributes.position.array;

		var resultPositionArray = [];
		var resultNormalArray = [];
		var resultUVArray = [];

		var elemHeight = this.data.ropeHeight / (this.data.ropeNlements - 1);

		var getElemIndex = y => Math.floor( y / elemHeight + 0.5 );

		var isElementGoing = elemIndex => elemIndex < nElements;

		var addArrayElems = (dst, src, off, cnt) => {

			for (let i = off; i < off + cnt; i++)
				dst.push( src[i] );
		};


		for (let i = 0; i < positionArray.length / 9; i++) {

			let	i0 = getElemIndex( positionArray[i * 9 + 1] ),
				i1 = getElemIndex( positionArray[i * 9 + 4] ),
				i2 = getElemIndex( positionArray[i * 9 + 7] );

			if ( !isElementGoing(i0) || !isElementGoing(i1) || !isElementGoing(i2) )
				continue;

			addArrayElems( resultPositionArray, positionArray, i * 9, 9 );
			addArrayElems( resultNormalArray, geometry.attributes.normal.array, i * 9, 9 );
			addArrayElems( resultUVArray, geometry.attributes.uv.array, i * 6, 6 );
		}


		var resultGeometry = new THREE.BufferGeometry;

		resultGeometry.setAttribute("position",
			new THREE.BufferAttribute( Float32Array.from(resultPositionArray), 3) );

		resultGeometry.setAttribute("normal",
			new THREE.BufferAttribute( Float32Array.from(resultNormalArray), 3) );

		resultGeometry.setAttribute("uv",
			new THREE.BufferAttribute( Float32Array.from(resultUVArray), 2) );

		return Util.mergeVertices(resultGeometry);
	},


	getVertexPositions_byNeighborCount(geometry, neighborCountMin) {

		var countByIndex = new Map;

		for (let i = 0; i < geometry.index.array.length; i++) {

			let posIndex = geometry.index.array[i];
			let count = countByIndex.get(posIndex);

			countByIndex.set(posIndex, (count || 0) + 1);
		}

		var positions = [];
		var posArray = geometry.attributes.position.array;

		countByIndex.forEach((v, i) => {

			if (v >= neighborCountMin)
				positions.push( new THREE.Vector3().fromArray(posArray, 3 * i) );
		});

		return positions;
	},

});



