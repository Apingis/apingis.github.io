
THREE.Material.prototype.setupOnBeforeCompile = function() {

	//if (this.userData.onBeforeCompile)
	//	Report.warn("onBeforeCompile is already set up", `name=${this.name}`);


	Object.defineProperties(this, {

		onBeforeCompile: {

			enumerable: true,

			get() {
				var f = function CHAINED_onBeforeCompile(...args) {
					this.userData.onBeforeCompile.forEach(fn => fn(...args));
				};

				f.toString = () => {
					Report.warn("onBeforeCompile.toString()");
					return f.prototype.toString();
				};

				return f;
			},

			set(fn) {
				//Report.warn("set onBeforeCompile", `name=${this.name} fn.name="${fn.name}"`);
				this._setOnBeforeCompile(fn);
			}
		},

		customProgramCacheKey: {

			enumerable: true,

			get() {
				return function CHAINED_customProgramCacheKey() {
					return this.userData.chained_customProgramCacheKey;
				}
			},

			set(fn) {
				this._setCustomProgramCacheKey(fn);
			}
		}
	});


	Object.defineProperties(this.userData, {

		onBeforeCompile: {
			enumerable: true,
			value: []
		},

		customProgramCacheKey: {
			enumerable: true,
			value: []
		}
	});

}


Object.assign(THREE.Material.prototype, {


	_getInsecureHashUint52(str) {

		var hash1 = 0, hash2 = 0;

		for (var i = 0; i < str.length; i += 2) {

		    hash1 = ( ((hash1 << 5) - hash1) + str.charCodeAt(i) ) >>> 0;
		    hash2 = ( ((hash2 << 5) - hash2) + (str.charCodeAt(i + 1) || 0) ) >>> 0;
		}

		return ( hash1 & ((1 << 20) - 1) ) * 2 **32 + hash2;
	},


	_getCustomCacheKeyStr(fn) {

		return "HU52-" + (fn.name ? fn.name + "-" : "") + this._getInsecureHashUint52( fn.toString() );
	},


	_getChainedCacheKey() {

		return this.userData.customProgramCacheKey.map(fn => fn()).join("|");
	},


	_updateChainedCacheKey() {

		this.userData.chained_customProgramCacheKey = this._getChainedCacheKey();
	},


	_setOnBeforeCompile(fn) {

		if (typeof fn != "function")
			Report.warn("not a function", fn);

		var callbacks = this.userData.onBeforeCompile;
		var cacheKeys = this.userData.customProgramCacheKey;

		var fnSource = fn.toString();
		var matchingFn = callbacks.find(callbackFn => callbackFn.toString() == fnSource);

		if (!matchingFn) {

			callbacks.push(fn);

			let str = this._getCustomCacheKeyStr(fn);
			cacheKeys.push( function keyFn() { return str; } );

			this._updateChainedCacheKey();

		} else {
			Report.warn("already has this onBeforeCompile: [",
				fnSource.toString().substring(0, 127) + " ...]");
		}
	},


	_setCustomProgramCacheKey(fn) {

		if (typeof fn != "function") {
			Report.warn("not a function", fn);
			return;
		}

		var callbacks = this.userData.onBeforeCompile;
		var cacheKeys = this.userData.customProgramCacheKey;
		var len = callbacks.length;
/*
		if (len === 0) {

			Report.warn("no callbacks");

		} else if (len !== cacheKeys.length) {

			Report.warn("inequal number of callbacks and cacheKeys");

		} else if (cacheKeys[len - 1]() != this._getCustomCacheKeyStr(callbacks[len - 1])) {

			Report.warn("attempt to overwrite non-default cache key");

		} else {
			cacheKeys[len - 1] = fn;
			this._updateChainedCacheKey();
		}
*/
		cacheKeys.push( fn );
		this._updateChainedCacheKey();
	},

});


/* not tested
THREE.Material.prototype.cloneWithCallbacks = function() {

	var material = this.clone();
	if (!this.userData.onBeforeCompile)
		return material;

	material.setupOnBeforeCompile();

	this.userData.onBeforeCompile.forEach((fn, i) =>
		material.userData.onBeforeCompile[i] = fn);

	this.userData.customProgramCacheKey.forEach((fn, i) =>
		material.userData.customProgramCacheKey[i] = fn);

	return material;
}
*/



