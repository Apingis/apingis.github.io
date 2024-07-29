
class AggregateGeometry {

	constructor() {

		this.id = AggregateGeometry.nextId ++;
		this.geometry = new THREE.BufferGeometry;
		this.geometry.boundingSphere = new THREE.Sphere;
		this.geometry.boundingBox = new THREE.Box3;

		this.attributeNames = null;
		this.attributeTypes = null;
		this.attributeItemSizes = null;

		this.size = new AggregateGeometry.Size;
		// actually used by chunks (not total occupied; reduced on remove chunk)
		this.usedSize = new AggregateGeometry.Size;
		this.head = null;
		this.tail = null;
		this.chunkByMesh = Object.create(null);

		this.requiresUpdate = false;
		this.updateOffset = new AggregateGeometry.Size; // from this to .usedSize
		this.addedMeshes = new Set;
		this.meshIIds = new Map;
		this.freeChunks = [];

		this.boundingVolumesRequireUpdate = false;

		this._tmp = new AggregateGeometry.Size;
		this._addedSize = new AggregateGeometry.Size;
		this._dstOffset = new AggregateGeometry.Size;
		this._relocateSize = new AggregateGeometry.Size;
		this._relocateOffset = new AggregateGeometry.Size;
	}


	addMesh(mesh, iId) {

		if (!mesh.geometry || !mesh.geometry.index)
			return Report.warn("indexed geometry only", `mesh.name=${mesh.name}`);

		if (typeof iId != 'number')
			return Report.warn('must have iId', `mesh.name=${mesh.name}`);

		if (this.addedMeshes.has(mesh))
			return Report.warn("already enqueued for addition", `mesh.name=${mesh.name}`);

		if (this.chunkByMesh[mesh.uuid])
			return Report.warn("already in merged geometry", `mesh.name=${mesh.name}`);


		//morphTargetsRelative
		console.assert(Object.values(mesh.geometry.morphAttributes).length === 0);

		var attributes = mesh.geometry.attributes;

		if (!this.attributeNames) {

			this.attributeNames = Object.keys(attributes);
			this.attributeTypes = Object.values(attributes).map(a => a.array.constructor);
			this.attributeItemSizes = Object.values(attributes).map(a => a.itemSize);

			this.attributeNames.push('iId');
			this.attributeTypes.push(Float32Array);
			this.attributeItemSizes.push(1);

		} else {

			for (let i = 0; i < this.attributeNames.length; i++) {

				let	name = this.attributeNames[i];

				if (name == 'iId')
					continue;

				if (!attributes[name])
					return Report.warn(`missing attribute ${name}`, `mesh.name=${mesh.name}`);

				if (attributes[name].array.constructor !== this.attributeTypes[i])
					return Report.warn(`mismatching type for attribute ${name}`, `mesh.name=${mesh.name}`);
			}
		}

		this.addedMeshes.add(mesh);

		this.meshIIds.set(mesh, iId);

		this.requiresUpdate = true;
	}


	removeMesh(mesh) {

		if ( this.addedMeshes.delete(mesh) )
			return;

		this.meshIIds.delete(mesh);

		var chunk = this.chunkByMesh[mesh.uuid];

		if (!chunk)
			return Report.warn("remove: no mesh", `n=${mesh.name}`);

		delete this.chunkByMesh[mesh.uuid];

		this._freeChunk(chunk);

		this.requiresUpdate = true;
	}

/* "*InPlace"
	updateMeshGeometry(mesh) {

		var chunk = this.chunkByMesh[mesh.uuid];

		if (!chunk)
			return;

		console.assert(mesh === chunk.mesh);

		var geometry = mesh.geometry;

		if (chunk.size.v !== geometry.attributes.position.count
				|| chunk.size.t !== geometry.index.count)
			return Report.warn("mismatching attribute count", `${mesh.name}`);
	}
*/

	update(rect) {

		if (this.requiresUpdate !== true)
			return this;

		if (rect)
			this.updateBoundingVolumes(rect);

//console.warn(`UPDATE id=${this.id} this.usedSize=${this.usedSize}`);
		this._processRemovedChunks();

		// Expand or shrink BufferGeometry, copy existing data.
		this._updateAttributesSize();

		this._processAddedMeshes();

		this._setUpdateRanges(this.updateOffset);

		this.geometry.setDrawRange(0, this.usedSize.t * 3);

		this.requiresUpdate = false;
		return this;
	}


	updateBoundingVolumes(rect) {

		var HEIGHT = 20;

		var box = this.geometry.boundingBox;

		box.min.set(rect.minX, 0, rect.minY);
		box.max.set(rect.maxX, HEIGHT, rect.maxY);

		var sphere = this.geometry.boundingSphere;

		sphere.center.set(rect.centerX(), HEIGHT / 2, rect.centerY());
		sphere.radius = 0.5 * Util.hypot3(rect.maxX - rect.minX, HEIGHT, rect.maxY - rect.minY);

		this.boundingVolumesRequireUpdate = false;
	}


	setBoundingVolumesRequireUpdate() { this.boundingVolumesRequireUpdate = true }


	_updateAttributesSize() {

		var requiredSize = this._getAddedSize().add(this.usedSize);

		if (requiredSize.v > this.size.v
				|| this.size.v > 3000 && requiredSize.v < this.size.v * 0.4)
//		if (requiredSize.v !== this.size.v)

			this._createAttributes(Math.max(3000, Math.floor(requiredSize.v * 1.2)) );


		if (requiredSize.t > this.size.t
				|| this.size.t > 5000 && requiredSize.t < this.size.t * 0.3)
//		if (requiredSize.t !== this.size.t)

			this._createIndex(Math.max(5000, Math.floor(requiredSize.t * 1.25)) );
	}


	dispose() {
		this.geometry.dispose();
	}


	_getAddedSize() {

		this._addedSize.clear();

		this.addedMeshes.forEach(mesh => this._addedSize.addFromMesh(mesh));

		return this._addedSize;
	}


	_createAppendChunk(mesh) {

		var chunk = new AggregateGeometry.Chunk;
		chunk.mesh = mesh;
		chunk.size.addFromMesh(mesh);

		this.chunkByMesh[mesh.uuid] = chunk;
		this._appendChunk(chunk);

		return chunk;
	}


	_appendChunk(chunk) {

		if (!this.tail) {
			chunk.start.clear();

			this.tail = chunk;
			this.head = chunk;

		} else {
			chunk.start.copy(this.tail.start).add(this.tail.size);

			this.tail.next = chunk;
			chunk.prev = this.tail;
			this.tail = chunk;
		}

		this.usedSize.add(chunk.size);

		if ( !this.usedSize.fits(this.size) )
			Report.warn("overflow", `used=${this.usedSize} allocated=${this.size}`);
	}


	_processAddedMeshes() {

		this.addedMeshes.forEach(mesh => {

			var chunk = this._createAppendChunk(mesh);

			this._copyChunkFromGeometry( chunk, mesh.geometry, this.meshIIds.get(mesh) );
		});

		this.addedMeshes.clear();
	}


	_createAttributes(sizeV) {

//console.warn(`_createAttributes(${sizeV}) id=${this.id} f=${Engine.frameNum} this.size=${this.size} this.usedSize=${this.usedSize}`);
		this.attributeNames.forEach((name, i) => {

			var	sourceAttribute = this.geometry.attributes[name];
			var	itemSize = this.attributeItemSizes[i];
			var	TypedArray = this.attributeTypes[i];

			var attribute = new THREE.BufferAttribute(new TypedArray(sizeV * itemSize), itemSize);

			//attribute.setUsage(THREE.DynamicDrawUsage);

			if (sourceAttribute)
				this._copySubArray(attribute.array, sourceAttribute.array, this.usedSize.v * itemSize);

			this.geometry.setAttribute(name, attribute);
		});

		this.size.v = sizeV;
	}


	_createIndex(sizeT) {

//console.warn(`_createIndex(${sizeT}) id=${this.id} f=${Engine.frameNum}`);
		//var index = new THREE.Uint32BufferAttribute(new Uint32Array(sizeT * 3), 1); // calls THREE.BufferAttribute, creates new array

		var index = new THREE.BufferAttribute(new Uint32Array(sizeT * 3), 1);

		//index.setUsage(THREE.DynamicDrawUsage);

		if (this.geometry.index) // already created?
			this._copySubArray(index.array, this.geometry.index.array, this.usedSize.t * 3);

		this.geometry.setIndex(index);

		this.size.t = sizeT;
	}


	_copySubArray(dstArray, srcArray, count) {

		dstArray.set( srcArray.subarray(0, count + 1) );
	}


	_copyIndex(dst, dstI, src, srcI, triangleCount, vertexOffset) {

		dstI *= 3;
		srcI *= 3;

		for (let i = 0; i < triangleCount * 3; i++)
			dst.array[dstI ++] = src.array[srcI ++] + vertexOffset;
	}


	_copyIndexWithinArray(array, dstI, srcI, triangleCount, vertexOffset) {

		dstI *= 3;
		srcI *= 3;

		for (let i = 0; i < triangleCount * 3; i++)
			array[dstI ++] = array[srcI ++] + vertexOffset;
	}


	_copyChunkFromGeometry(chunk, geometry, iId) { // Copy from provided mesh geometry into allocated chunk.

		this.attributeNames.forEach((name, i) => {

			var dstArray = this.geometry.attributes[name].array;

			if (name == 'iId') {

				dstArray.fill(iId, chunk.start.v, chunk.start.v + chunk.size.v);
				return;
			}

			var sourceAttribute = geometry.attributes[name];

			dstArray.set(sourceAttribute.array, chunk.start.v * sourceAttribute.itemSize);
		});

		this._copyIndex(this.geometry.index, chunk.start.t, geometry.index, 0,
			chunk.size.t, chunk.start.v);
	}


	_relocateGeometry(dstOffset, srcOffset, size) {

		this.attributeNames.forEach((name, i) => {

			var	attribute = this.geometry.attributes[name],
				itemSize = attribute.itemSize;

			attribute.array.copyWithin(dstOffset.v * itemSize, srcOffset.v * itemSize,
				(srcOffset.v + size.v) * itemSize);
		});

		this._copyIndexWithinArray(this.geometry.index.array, dstOffset.t, srcOffset.t,
			size.t, dstOffset.v - srcOffset.v);
	}


	//
	// freeChunk followed by a number of used chunks - move to dstOffset.
	// Advance dstOffset.
	// Return next free chunk or null.
	//
	_relocateChunks(dstOffset, freeChunk) {

		console.assert(freeChunk.next);
		console.assert( this._relocateOffset.copy(freeChunk.start).add(freeChunk.size).equals(freeChunk.next.start) );

		var occupiedChunkStart = this._tmp.copy(freeChunk.next.start);
		var relocateOffset = this._relocateOffset.copy(occupiedChunkStart).sub(dstOffset);

		var endChunk;
		var relocateSize = this._relocateSize;

		for (let chunk = freeChunk.next; ; chunk = chunk.next) {

			if (!chunk.next || !chunk.next.mesh) {
				endChunk = chunk;
				relocateSize.copy(chunk.start).add(chunk.size).sub(occupiedChunkStart);
			}

			chunk.start.sub(relocateOffset);

			if (endChunk)
				break;
		}

		this._relocateGeometry(dstOffset, occupiedChunkStart, relocateSize);
		dstOffset.add(relocateSize);

		this._unlinkFreeChunk(freeChunk);

		return endChunk.next;
	}


	_solidifyChunks(freeChunk) {

		var dstOffset = this._dstOffset.copy(freeChunk.start);

		while (freeChunk)
			freeChunk = this._relocateChunks(dstOffset, freeChunk);

		if (!dstOffset.equals(this.usedSize))
			Report.warn(`dstOffset: ${dstOffset} --- usedSize: ${this.usedSize}`);
	}


	_unlinkFreeChunk(chunk, notInFreeList) {

		console.assert(!chunk.mesh);

		if (chunk.prev) {
			chunk.prev.next = chunk.next;

		} else {
			console.assert(chunk === this.head);
			this.head = chunk.next;
		}

		if (chunk.next) {
			chunk.next.prev = chunk.prev;

		} else {
			console.assert(chunk === this.tail);
			this.tail = chunk.prev;
		}

		if (notInFreeList !== true)
			this._removeFreeChunkFromList(chunk);
	}


	_addFreeChunkToList(chunk) {
		console.assert(this.freeChunks.indexOf(chunk) === -1);
		this.freeChunks.push(chunk);
	}


	_removeFreeChunkFromList(chunk) {

		var i = this.freeChunks.indexOf(chunk);
		if (i === -1)
			Report.throw(`bad thing: ${chunk}`,this.freeChunks);

		this.freeChunks.copyWithin(i, i + 1);
		this.freeChunks.length --;
	}


	_freeChunk(chunk) {

		chunk.mesh = null;

		this.usedSize.sub(chunk.size);

		//
		// * merge sequential free chunks.
		// * remove last free chunk.
		//
		if (chunk.next && !chunk.next.mesh)
			this._mergeWithNextChunk(chunk);

		if (chunk.prev && !chunk.prev.mesh) {

			let prevChunk = chunk.prev;
			this._mergeWithNextChunk(prevChunk, true);

			if (!prevChunk.next)
				this._unlinkFreeChunk(prevChunk);

			return;
		}

		if (!chunk.next) {
			this._unlinkFreeChunk(chunk, true);
			return;
		}

		this._addFreeChunkToList(chunk);
	}


	_mergeWithNextChunk(chunk, notInFreeList) {

		console.assert(!chunk.mesh && chunk.next && !chunk.next.mesh);

		chunk.size.add(chunk.next.size);
		this._unlinkFreeChunk(chunk.next, notInFreeList);
	}


	_processRemovedChunks() {

		if (this.freeChunks.length === 0) {
			this.updateOffset.copy(this.usedSize);
			return;
		}

		//this.freeChunks.sort((a, b) => a.start.v - b.start.v);

		var freeChunk1 = Util.findMinElem(this.freeChunks, chunk => chunk.start.v);

		this.updateOffset.copy(freeChunk1.start);

		this._solidifyChunks(freeChunk1);

		this.freeChunks.length = 0;
	}


	_setUpdateRanges(updateOffset) {

		if (updateOffset.equals(this.usedSize))
			return;

		if (!updateOffset.fits(this.usedSize))
			Report.warn("bad updateOffset", `${updateOffset} usedSize=${this.usedSize}`);


		var setUpdateRange = (attribute, offset, end) => {

			//   (undocumented)
			//
			// * For the 1st time it's on the screen, it's fully uploaded
			//   w/o consulting or setting updateRange. Memorized is .version
			// * It's unknown when it's upload (can be known using callback).
			// * Internally it memorized attribute. If .array is replaced
			//   then it won't update (TODO check)
			//
			// * THREE takes offset, count in array elements.
			// * After an update, updateRange.count is set to -1.
			//
			offset *= attribute.itemSize;
			end *= attribute.itemSize;

			if (attribute.updateRange.count !== -1)
				offset = Math.min(offset, attribute.updateRange.offset);

			attribute.updateRange.offset = offset;
			attribute.updateRange.count = end - offset;
			attribute.needsUpdate = true; // increases .version
		}


		this.attributeNames.forEach((name, i) => {

			setUpdateRange(this.geometry.attributes[name], updateOffset.v, this.usedSize.v);
		});

		setUpdateRange(this.geometry.index, updateOffset.t * 3, this.usedSize.t * 3);
	}

}


AggregateGeometry.nextId = 1;




AggregateGeometry.Chunk = function() {

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	this.prev = null;
	this.next = null;
	this.mesh = null;
	this.start = new AggregateGeometry.Size;
	this.size = new AggregateGeometry.Size;
}



Object.assign(AggregateGeometry.Chunk.prototype, {


	toString() {

		var flags = "";
		this.prev && (flags += "<");
		this.mesh && (flags += "*");
		this.next && (flags += ">");
		(!flags.length) && (flags = ".");

		return `[Chunk ${flags} start=${this.start} size=${this.size} ]`;
	},


	clear() {
		this.prev = null;
		this.next = null;
		this.mesh = null;
		this.start.clear();
		this.size.clear();
	},

});




AggregateGeometry.Size = function(v, t) {

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	this.v = v || 0;
	this.t = t || 0;
}


Object.assign(AggregateGeometry.Size.prototype, {

	toString() { return `[Size verts=${this.v} tris=${this.t}]`; },

	set(v, t) {
		this.v = v || 0;
		this.t = t || 0;
		return this;
	},

	clear() { return this.set(); },

	copy(size) {
		this.v = size.v;
		this.t = size.t;
		return this;
	},

	add(size) {
		this.v += size.v;
		this.t += size.t;
		return this;
	},

	sub(size) {
		this.v -= size.v;
		this.t -= size.t;
		return this;
	},

	fits(size) { return this.v <= size.v && this.t <= size.t; },

	equals(size) { return this.v === size.v && this.t === size.t; },


	addFromMesh(mesh) {
		this.v += mesh.geometry.attributes.position.count;
		this.t += mesh.geometry.index.array.length / 3;
		return this;
	},

});




export { AggregateGeometry };

