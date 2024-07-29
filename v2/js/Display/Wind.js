//
// Complete per-vertex data
//
class Wind {

	constructor(type, branchPosition, branchPhase, branchBendFactor,
			branchBend1Frac, branchBend2Frac,
			leafPosition, leafQuaternion, leafPhase, leafBendFactor) {

		this.type = type || "None"; // None: unaffected by wind (color still applies)

		// Vector from branch origin to vertex position (branchPosition)
		this.branchPosition = branchPosition || new THREE.Vector3;
		this.branchPhase = branchPhase || 0;

		this.branchBendFactor = branchBendFactor || 0.7;
		this.branchBend1Frac = branchBend1Frac || 1;
		this.branchBend2Frac = branchBend2Frac || 0;

		// Vector from leaf origin to vertex position (leafPosition)
		this.leafPosition = leafPosition || new THREE.Vector3;
		this.leafQuaternion = leafQuaternion || new THREE.Quaternion;
		this.leafPhase = leafPhase || 0;
		this.leafBendFactor = leafBendFactor || 0.7;

		//this.color = 0;
	}


	toString() {
		var type = this.type == "Branch" ? "B" : this.type == "Leaf" ? "L" : "N";
		return `[Wind ${type} ${Util.toStr(this.branchBend1Frac)} ${Util.toStr(this.branchBend2Frac)}]`;
	}


	clone() {
		return new Wind(
			this.type,
			this.branchPosition.clone(), this.branchPhase, this.branchBendFactor,
			this.branchBend1Frac, this.branchBend2Frac,
			this.leafPosition.clone(), this.leafQuaternion.clone(),
			this.leafPhase, this.leafBendFactor
		);
	}


	static createInterpolated(w1, w2, t) { // looks wrong (mb. TODO)

		return new Wind(
			w1.type,
			w1.branchPosition.clone(), w1.branchPhase, w1.branchBendFactor, 
			(w1.branchBend1Frac + w2.branchBend1Frac) / 2,
			(w1.branchBend2Frac + w2.branchBend2Frac) / 2,

			w1.leafPosition.clone(), w1.leafQuaternion.clone(),
			w1.leafPhase, w1.leafBendFactor
		);
	}


	getUintData() {

		var data = (this.type == "Branch" ? 1 : 3)

			+ (this.branchPhase * (7 << 2) & (7 << 2))
			+ (this.leafPhase * (7 << 5) & (7 << 5))
			+ (this.leafBendFactor * (31 << 8) & (31 << 8))
			+ (this.branchBend1Frac * (63 << 13) & (63 << 13))
			+ (this.branchBend2Frac * (63 << 19) & (63 << 19))
			+ (this.branchBendFactor * (31 << 25) & (31 << 25))
			//+2bits

		return data >>> 0;
	}


	static applyObjPhaseColorToUint(u, objPhaseNorm, color = 0) {

		u ^= ((objPhaseNorm * 63 & 63) << 2);

		u = u & ~(3 << 30) | ((color & 3) << 30);

		return u >>> 0;
	}


	getFloatData() { // TODO check

		var data = (this.type == "Leaf" ? 1 : 0)
// orig.
/*
			+ (this.branchPhase * (3 << 1) & (3 << 1))
			+ (this.leafPhase * (7 << 3) & (7 << 3))
			+ (this.leafBendFactor * (15 << 6) & (15 << 6))
			+ (this.branchBend1Frac * (31 << 10) & (31 << 10))
			+ (this.branchBend2Frac * (31 << 15) & (31 << 15))
			+ (this.branchBendFactor * (7 << 20) & (7 << 20))
*/
			+ (this.branchPhase * (3 << 1) & (3 << 1))
			+ (this.leafPhase * (7 << 3) & (7 << 3))
			+ (this.leafBendFactor * (7 << 6) & (7 << 6))
			+ (this.branchBend1Frac * (31 << 9) & (31 << 9))
			+ (this.branchBend2Frac * (31 << 14) & (31 << 14))
			+ (this.branchBendFactor * (7 << 19) & (7 << 19))
			//+2bits

		return data;
	}

// TODO debug
	static applyObjPhaseColorToFloat(u, objPhaseNorm, color = 0) {

		u ^= ((objPhaseNorm * 31 & 31) << 1);

		// Float has 23 bit mantissa; 24th appears because of variable exponent

		var s = u < 0 ? -1 : 1;

		u = Math.abs(u) & ~(3 << 22) | ((color & 2) << 22);

		return u * s;
	}


	// TODO (v2) (+save mem) separate attributes for leaves and branches

	toGeometry(geometry, i) {

		var attr = geometry.attributes;
		if (!attr.wind)
			Wind.addAttributes(geometry);

		var array = attr.wind.array;

		if (Wind.isWebGL2()) {

			if (this.type != "Branch" && this.type != "Leaf") {
				array[i * 4] = 0;
				return;
			}

			array[i * 4] = this.getUintData();
			array[i * 4 + 1] = this.branchPosition.getUint32();
			array[i * 4 + 2] = this.leafPosition.getUint32();
			array[i * 4 + 3] = this.leafQuaternion.getForwardV().getUint32();

		} else {

			if (this.type != "Branch" && this.type != "Leaf") {
				array[i * 4] = -1;
				return;
			}

			array[i * 4] = this.getFloatData();
			array[i * 4 + 1] = this.branchPosition.getFloat();
			array[i * 4 + 2] = this.leafPosition.getFloat();
			array[i * 4 + 3] = this.leafQuaternion.getForwardV().getFloat();
		}
	}


	// ============================================================
	//
	//   Wind Attributes.
	//
	// - Geometry can be transformed w/ wind properties adjusted
	// if it's stick to wind-unaffected position ("wind origin",
	// relative to it is wind affection). [all 3D assets conform]
	//
	// - Per-object phase setup on per-geometry basis.
	//
	// ============================================================

	static addAttributes(geometry) {

		var count = geometry.attributes.position.count;

		var array = Wind.isWebGL2() ? new Uint32Array( count * 4 ) : new Float32Array( count * 4 );

		geometry.setAttribute("wind", new THREE.BufferAttribute( array, 4 ) );
	}


	static removeAttributes(geometry) {

		var attr = geometry.attributes;
		delete attr.wind;
	}


	static applyObjPhaseColorToGeometry(geometry, objPhase = 0, itemColor = 0) {

		var silent = true;

		if (!geometry && silent)
			return;

		console.assert(Item.checkColor(itemColor));

		var windAttr = geometry.attributes.wind;
		if (!windAttr) {
			if (silent)
				return;
			else
				Report.throw("no windAttr", `name=${geometry.name}`);
		}

		var isUint = Wind.isWebGL2();

		for (let i = 0; i < windAttr.count; i++) {

			let data0 = windAttr.array[i * 4];

			let isUnaffected = isUint ? data0 === 0 : data0 < 0;
			let isLeaf = !isUnaffected && (isUint ? (data0 & 2) !== 0 : (data0 & 1) !== 0);

			let color = (isLeaf ? itemColor >> 2 : itemColor) & 3;

			windAttr.array[i * 4] = isUint
				? Wind.applyObjPhaseColorToUint(data0, objPhase, color)
				: Wind.applyObjPhaseColorToFloat(data0, objPhase, color);
		}
	}


	static applyMatrix4ToAttributes(geometry, mat4) {

		var attr = geometry.attributes;
		if (!attr.wind)
			return;

		// Attributes are relative to positions on the tree itself,
		// thus only rotational component applies.

		var isUint = Wind.isWebGL2();
		var v = Wind._v;
		var mat3 = this._mat3.setFromMatrix4(mat4);

		for (let i = 0; i < attr.wind.count; i++) {

			let data0 = attr.wind.array[i * 4];
			if (data0 === 0 && isUint || data0 < 0 && !isUint) // None
				continue;

			applyMatrix3ToPackedArrayVector(attr.wind.array, i * 4 + 1, mat3);

			let isLeaf = isUint ? (data0 & 2) !== 0 : (data0 & 1) !== 0;

			if (isLeaf) {
				applyMatrix3ToPackedArrayVector(attr.wind.array, i * 4 + 2, mat3);
				applyMatrix3ToPackedArrayVector(attr.wind.array, i * 4 + 3, mat3);
			}
		}


		function applyMatrix3ToPackedArrayVector(arr, i, mat3) {

			if (isUint) {

				v.setFromUint32(arr[i]);
				v.applyMatrix3(mat3);
				arr[i] = v.getUint32();

			} else {
				v.setFromFloat(arr[i]);
				v.applyMatrix3(mat3);
				arr[i] = v.getFloat();
			}
		}
	}


	static isWebGL2() { return Display.isWebGL2; }
}


Object.assign(Wind, {

	_v: new THREE.Vector3,
	_mat3: new THREE.Matrix3,
});



//
// Contains everything to generate per-vertex data for given branch.
//
//      not bending        bendLength[0]      bendLength[1]
//  O--------->--------O-------->----------O--------->-------O---->
// origin          bendOrigin
//          This is what it bends around
//             (Wind:branchPosition)
//
// zero bendLength: bend stage skipped, proceeded to the next one
//
//
Wind.Branch = function(origin, bendOrigin, bendLengths, bendFactor = 0.7, margin = 0.1) {

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	this.origin = origin;
	this.bendOrigin = bendOrigin;
	this.dOriginToBendOrigin = origin.distanceTo(bendOrigin);
	this.bendLengths = bendLengths;
	this.bendFactor = bendFactor;
	this.margin = margin;
}


Object.assign(Wind.Branch.prototype, {

	setupWind(wind, position, isLeaf, ) { // Setup per-vertex wind data.

		console.assert((wind instanceof Wind) && (position instanceof THREE.Vector3));

		if (position.distanceTo(this.origin) < this.dOriginToBendOrigin + this.margin) {
			// Branch is unaffected (bend #0).
// TODO? leaf connected to unaffected branch position
console.assert(!isLeaf);
			wind.type = "None";
			return;
		}

		var lengthRemain = position.distanceTo(this.bendOrigin);
		if (lengthRemain < this.margin) {
			// Branch is unaffected (bend #0).
console.assert(!isLeaf);
			wind.type = "None";
			return;
		}

		//wind.branchPosition.copy(this.bendOrigin);
		wind.branchPosition.copy(position).sub(this.bendOrigin);

		wind.branchBendFactor = this.bendFactor;

		if (lengthRemain < this.bendLengths[0] + this.margin) {
			wind.branchBend1Frac = 1;

		} else {
			wind.branchBend1Frac = this.bendLengths[0] / lengthRemain;
			lengthRemain -= this.bendLengths[0];

			if (lengthRemain < this.bendLengths[1] + this.margin) {
				wind.branchBend2Frac = 1;

			} else {
				wind.branchBend2Frac = this.bendLengths[1] / lengthRemain;
			}
		}

		// 63/64=0.984..
		if (wind.branchBend1Frac > 0.99)
			wind.branchBend1Frac = 1;

		if (wind.branchBend2Frac > 0.99)
			wind.branchBend2Frac = 1;

		if (isLeaf)
			this.setupWindLeaf(wind, position);
		else
			wind.type = "Branch";
	},


	setupWindLeaf(wind, position) {
	},

});




Wind.Area = function() { // per-(render|area) wind +utility fn.

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	this.u_windParams = {
		value: {
			time: 0,
			direction: new THREE.Vector3(1, 0, 0),
			strength: 0.05,
			gustDutyCycle: 0, // set w/ .setGustParams()
			gustStrength: 0.2,
			gustSpeed: 8,
			gustWavelength: 0, // set w/ .setGustParams()
		}
	};

	this.mixer = new THREE.AnimationMixer(this.u_windParams.value);

	if (Assets.animations.wind)
		this.clipAction = this.mixer.clipAction( Assets.animations.wind ).play();

	this.lastUpdateTime = 0;

	this.setGustParams(60, 0.2);
	//this.setGustParams(15, 0.4);
}


Wind.Area.prototype.update = function(time) {

	this.u_windParams.value.time = time % Wind.Area.TIME_MAX;

	this.mixer.update(time - this.lastUpdateTime);
	this.lastUpdateTime = time;
}


Wind.Area.prototype.setGustParams = function(interval, gustDutyCycle) {

	var n = Math.max(1, Math.floor(Wind.Area.TIME_MAX / interval));

	var params = this.u_windParams.value;

	params.gustWavelength = (params.gustSpeed * Wind.Area.TIME_MAX) / n;
	params.gustDutyCycle = gustDutyCycle;
}


Wind.Area.prototype.stop = function() {

	this.mixer.stopAllAction();
	this.u_windParams.value.strength = 0;
	this.u_windParams.value.gustDutyCycle = 0;
}


Wind.Area.setupWindMaterial = function(material, isDepth = false) {

	// THREE.ShaderChunk not modified.

	if (!material.defines)
		material.defines = {};

	material.defines.USE_WIND = true;

	if (Wind.isWebGL2())
		material.defines.WIND_WEBGL2 = true;

	if (isDepth)
		material.defines.WIND_DEPTH = true;

	// ================================================
	//
	// Vertex colors: for debug (either phase or bend)
	//
	// ================================================

	//this.setupVertexColors(material, false, isDepth);


	material.onBeforeCompile = function setupWind(shader) {

		shader.vertexShader = shader.vertexShader.replace(
			/(#include <uv_pars_vertex>)/, a =>
				a + THREE.ShaderChunk["wind_pars_vertex"]
		);

		if (!isDepth) {

			shader.fragmentShader = shader.fragmentShader.replace(
				/(#include <color_pars_fragment>)/, a =>
					a + THREE.ShaderChunk["wind_pars_fragment"]
			);
		}


		// Original begin_vertex: vec3 transformed = vec3( position );
		// Assignment moved up

		shader.vertexShader = shader.vertexShader.replace(
			/(#include <begin_vertex>)/, a =>
				"\n#ifndef USE_WIND\n" + a + "\n#endif\n"
		);

		shader.vertexShader = shader.vertexShader.replace(
			/(#include <uv_vertex>)/, a => a +
				"\n#ifdef USE_WIND\n" + "vec3 transformed = vec3( position );" + "\n#endif\n"
		);


		// wind_vertex should be before normals

		shader.vertexShader = shader.vertexShader.replace(
			/(#include <skinbase_vertex>)/, a =>
				THREE.ShaderChunk["wind_vertex"] + a
		);

		if (!isDepth) {

			shader.fragmentShader = shader.fragmentShader.replace(
				/(#include <fog_fragment>)/, a =>
					THREE.ShaderChunk["wind_fragment"] + a
			);
		}


		shader.uniforms.u_windParams = Main.area.wind.u_windParams;
	};


	material.customProgramCacheKey = function windKey() {
		return `WIND:isDepth=${!!isDepth}`;
	};

}



Wind.Area.setupVertexColors = function(material, noLeaves, isDepth) {

	if (isDepth)
		return;

	material.defines.WIND_COLOR = true;

	if (noLeaves)
		material.defines.WIND_NO_LEAVES = true;

	Object.assign(material, {

		vertexColors: true,
		map: undefined,
		transparent: true,
		depthWrite: false,
		opacity: 0.4

	});

	//material.defines.WIND_COLOR_PHASE = true;
	material.defines.WIND_COLOR_BRANCH_BEND = true;
}


Object.assign(Wind.Area, {

	_mat3: new THREE.Matrix3(),

	TIME_MAX: 512, // compile-time setting, in seconds
});




THREE.ShaderChunk.wind_pars_vertex = `

#if defined( USE_WIND )

#if defined( WIND_WEBGL2 )
	attribute uvec4 wind;
#else
	attribute vec4 wind;
#endif

#ifndef WIND_DEPTH
	#if defined( WIND_WEBGL2 )
		flat varying float v_windColor;
		flat varying float v_windIsLeaf;
	#else
		varying float v_windColor;
		varying float v_windIsLeaf;
	#endif
#endif

	struct WindParams {
		float time;
		vec3 direction;
		float strength;
		float gustDutyCycle;
		float gustStrength;
		float gustSpeed;
		float gustWavelength;
	};

	uniform WindParams u_windParams;

	#define TIME_MAX ${Wind.Area.TIME_MAX.toFixed(6)}

	#define BRANCH_FREQ1_IN 0.36
	#define BRANCH_FREQ2_IN 0.19
	#define LEAF_FREQ1_IN 0.75
	#define LEAF_FREQ2_IN 0.31

	#define BRANCH_FREQ1 ( floor(TIME_MAX * BRANCH_FREQ1_IN + 0.5) / TIME_MAX )
	#define BRANCH_FREQ2 ( floor(TIME_MAX * BRANCH_FREQ2_IN + 0.5) / TIME_MAX )
	#define LEAF_FREQ1 ( floor(TIME_MAX * LEAF_FREQ1_IN + 0.5) / TIME_MAX )
	#define LEAF_FREQ2 ( floor(TIME_MAX * LEAF_FREQ2_IN + 0.5) / TIME_MAX )

	#define WIND_HEIGHT_MAX 5.0

	struct WindData {
		float branchPhase;
		float leafPhase;
		float branchBend1Frac;
		float branchBend2Frac;
		float branchBendFactor;
		float leafBendFactor;
	} windData;

	vec3 windDirectionLocal;


#if defined( USE_COLOR ) && defined( WIND_COLOR )
	vec3 fColors[16];
	void setColorNorm(float v) { vColor = fColors[ int( floor(v * 16.0 + 0.5) ) ]; }
	void setColor(int i) { vColor = fColors[ i ]; }
#endif


#if defined( WIND_WEBGL2 )

	void unpackWindData() {

		uint x = wind.x;

		windData.branchPhase = float(x & (7U << 2)) * (1.0 / (7.0 * 4.0));
		windData.leafPhase = float(x & (7U << 5)) * (1.0 / (7.0 * 32.0));

		windData.leafBendFactor = float(x & (31U << 8)) * (1.0 / (31.0 * 256.0));
		windData.branchBend1Frac = float(x & (63U << 13)) * (1.0 / (63.0 * 8192.0));
		windData.branchBend2Frac = float(x & (63U << 19)) * (1.0 / (63.0 * 524288.0));
		windData.branchBendFactor = float(x & (31U << 25)) * (1.0 / (31.0 * 33554432.0));
	}


	float unpackWindColor() { return float( uint(wind.x) >> 30 ); }


	vec3 unpackVec3( uint u ) {

		uint pow = u >> 27;
		float mult = float(1U << pow) * (1.0 / 1024.0 / 256.0);

		uvec3 ucomponents = uvec3(u, u >> 9, u >> 18);
		vec3 signs = 1.0 - vec3( (ucomponents & 256U) >> 7 );

		return vec3(ucomponents & 255U) * signs * mult;
	}

#else // WebGL 1
/*
	mat3 inverse(mat3 m) {

		float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];
		float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];
		float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];

		float b01 = a22 * a11 - a12 * a21;
		float b11 = -a22 * a10 + a12 * a20;
		float b21 = a21 * a10 - a11 * a20;

		float det = a00 * b01 + a01 * b11 + a02 * b21; // detInv?

		return mat3(
			b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),
			b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),
			b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)
		) / det;
	}
*/

	void unpackWindData() {

		float x = wind.x;
// orig.
/*
		windData.isLeaf = fract(x * 0.5) != 0.0;
		windData.branchPhase = fract( floor(x * 0.5) * (1.0/4.0) );
		windData.leafPhase = fract( floor(x * (1.0/8.0)) * (1.0/8.0) );

		windData.leafBendFactor = fract( floor(x * (1.0/64.0)) * (1.0/16.0) );
		windData.branchBend1Frac = fract( floor(x * (1.0/1024.0)) * (1.0/32.0) ) * (32.0/31.0);
		windData.branchBend2Frac = fract( floor(x * (1.0/1024.0/32.0)) * (1.0/32.0) ) * (32.0/31.0);
		windData.branchBendFactor = fract( floor(x * (1.0/1024.0/1024.0)) * (1.0/8.0) );
*/
		windData.branchPhase = fract( floor(x * (1.0/2.0)) * (1.0/4.0) );
		windData.leafPhase = fract( floor(x * (1.0/8.0)) * (1.0/8.0) );

		windData.leafBendFactor = fract( floor(x * (1.0/64.0)) * (1.0/8.0) ) * (8.0/7.0);
		windData.branchBend1Frac = fract( floor(x * (1.0/512.0)) * (1.0/32.0) ) * (32.0/31.0);
		windData.branchBend2Frac = fract( floor(x * (1.0/1024.0/16.0)) * (1.0/32.0) ) * (32.0/31.0);
		windData.branchBendFactor = fract( floor(x * (1.0/1024.0/512.0)) * (1.0/8.0) ) * (8.0/7.0);
	}


	float unpackWindColor() { return float( floor(abs(wind.x) * (1.0/1024.0/1024.0/4.0)) ); }


	vec3 unpackVec3( float f ) {

		float exp = floor( f * (1.0 / pow(2.0, 18.0)) ) - 10.0;
		vec3 components = floor( vec3( f, f / 64.0, f / 2048.0 ) );

		return fract( floor(components) / 64.0 ) * pow(2.0, exp);
	}
#endif


	float smoothCurve( float x ) { return x * x * ( 3.0 - 2.0 * x ); }
	float triangleWave( float x ) { return abs( fract( x + 0.5 ) * 2.0 - 1.0 ); }
	float smoothTriangleWave( float x ) { return smoothCurve( triangleWave( x ) ); }

	vec2 triangleWave( vec2 x ) { return abs( fract( x + 0.5 ) * 2.0 - 1.0 ); }
	vec2 smoothCurve( vec2 x ) { return x * x * ( 3.0 - 2.0 * x ); }
	vec2 smoothTriangleWave( vec2 x ) { return smoothCurve( triangleWave( x ) ); }


	float getWave(float phase, vec2 frequency) {

		vec2 wavesIn = fract( u_windParams.time * frequency + phase );
		vec2 waves = smoothTriangleWave( wavesIn );
		return waves.x + waves.y;
	}


	float getGustWave( vec3 position ) {

		float positionOffset = dot( position, u_windParams.direction );

		// wave period: "x" E [0.0..1.0]. Gust starts at x=0.

		float x = fract( (u_windParams.time * u_windParams.gustSpeed - positionOffset)
			/ u_windParams.gustWavelength );

		float gustEnd = u_windParams.gustDutyCycle;

		if (x > gustEnd)
			return 0.0;

		// Changes in wind strength due to the gust should look natural
		// (take no less time than half branch oscillation).
		// Introducing start slope and 2x end slope.

		float gustFrequency = u_windParams.gustSpeed / u_windParams.gustWavelength;

		float startSlopeEnd = min(gustEnd * 0.333, (0.5 / BRANCH_FREQ2) * gustFrequency);
		float waveWalue;

		if (x < startSlopeEnd) {

			waveWalue = x / startSlopeEnd;

		} else {

			float endSlopeStart = max(startSlopeEnd, gustEnd - 2.0 * startSlopeEnd);

			if (x < endSlopeStart)
				return 1.0;

			waveWalue = (gustEnd - x) / (gustEnd - endSlopeStart);
		}

		return smoothCurve( waveWalue );
	}


	//
	// This version does not preserve exact length.
	//
	vec3 transformBranch(vec3 branchPosition, vec3 position, float strength) {

#if defined( WIND_COLOR ) && ( defined WIND_COLOR_BRANCH_BEND )
		setColor(windData.branchBend1Frac == 1.0 ? 8 : windData.branchBend2Frac == 1.0 ? 10 : 13);
#endif

		float bendLength = length(branchPosition);

		if (bendLength == 0.0) // This must be a leaf at non-bending branch
			return position;

		float totalStrength = strength * (
			windData.branchBend1Frac * 0.5
			+ (1.0 - windData.branchBend1Frac) * windData.branchBend2Frac * 1.1
			+ (1.0 - windData.branchBend1Frac) * (1.0 - windData.branchBend2Frac) * 2.2
		);

		// Prevent artefacts in case of extreme wind strength (> 0.2)
		// (esp. in the direction opposite to branchPosition)
		totalStrength = min(0.7, totalStrength);

		vec3 newDirection = normalize(branchPosition + bendLength * totalStrength * windDirectionLocal);

		return position - branchPosition + newDirection * bendLength;
	}


	mat3 makeRotationAxis(vec3 axis, float c, float s) {

		float t = 1.0 - c;
		float x = axis.x, y = axis.y, z = axis.z;
		float tx = t * x, ty = t * y;

		return mat3(
			tx * x + c, tx * y + s * z, tx * z - s * y,
			tx * y - s * z, ty * y + c, ty * z + s * x,
			tx * z + s * y, ty * z - s * x, t * z * z + c
		);
	}


	vec3 transformLeaf(
#ifndef WIND_DEPTH
			inout vec3 normal,
#endif
			vec3 leafPosition, vec3 fwdV, float strength) {

		vec3 axis = cross(fwdV, windDirectionLocal);
		float axisLen = length(axis); // =sine

		if (axisLen > 0.0) { // non-smooth possible?

			axis /= axisLen;

			float c = 1.0 - 0.1 * strength;
			float s = sqrt(1.0 - c * c);

			mat3 rotation = makeRotationAxis(axis, c, s);
			leafPosition = rotation * leafPosition;

#ifndef WIND_DEPTH
			normal = rotation * normal;
#endif
		}

		return leafPosition;
	}

#endif
`;





THREE.ShaderChunk.wind_vertex = `

#if defined( USE_WIND )

	//vec3 transformed // must be already init'd


#if defined( WIND_COLOR )
	fColors[0] = vec3(0.0, 0.0, 0.0); fColors[1] = vec3(0.3, 0.0, 0.0);
	fColors[2] = vec3(0.3, 0.2, 0.12); fColors[3] = vec3(0.3, 0.3, 0.0);
	fColors[4] = vec3(0.0, 0.3, 0.0); fColors[5] = vec3(0.0, 0.3, 0.3);
	fColors[6] = vec3(0.0, 0.0, 0.3); fColors[7] = vec3(0.3, 0.0, 0.3);
	fColors[8] = vec3(1.0, 0.0, 0.0); fColors[9] = vec3(1.0, 0.64, 0.4);
	fColors[10] = vec3(1.0, 1.0, 0.0); fColors[11] = vec3(0.0, 1.0, 0.0);
	fColors[12] = vec3(0.0, 1.0, 1.0); fColors[13] = vec3(0.0, 0.0, 1.0);
	fColors[14] = vec3(1.0, 0.0, 1.0); fColors[15] = vec3(1.0, 1.0, 1.0);
#endif


#if defined( WIND_WEBGL2 )
	bool isAffectedByWind = (wind.x & 1U) != 0U;
	bool isLeaf = (wind.x & 2U) != 0U;
#else
	bool isAffectedByWind = wind.x >= 0.0;
	bool isLeaf = fract(wind.x * 0.5) != 0.0;
#endif


#ifdef AGGREGATE_MATERIAL
	vec4 itemData = getItemData(0.0);
#endif


#ifndef WIND_DEPTH
	#ifdef AGGREGATE_MATERIAL
		v_windColor = isLeaf ? floor(itemData.z * 0.25) : fract(itemData.z * 0.25) * 4.0;
	#else
		v_windColor = unpackWindColor();
	#endif
	v_windIsLeaf = float(isLeaf);
#endif


	if (isAffectedByWind) {

		unpackWindData();

#ifdef AGGREGATE_MATERIAL

	windDirectionLocal = u_windParams.direction * mat3(itemMatrix); // orthonormal mat.3
	vec3 vertexWorldPosition = (itemMatrix * vec4( transformed, 1.0)).xyz;
	float gustWave = getGustWave( vertexWorldPosition );
	float height = vertexWorldPosition.y;

#else
	#ifdef STATIC_MATERIAL
			windDirectionLocal = u_windParams.direction;
			float gustWave = getGustWave( transformed );
			float height = transformed.y;
	#else
	//		windDirectionLocal = inverse( mat3(modelMatrix) ) * u_windParams.direction;
			windDirectionLocal = u_windParams.direction * mat3(modelMatrix); // orthonormal mat.3
			vec3 vertexWorldPosition = (modelMatrix * vec4( transformed, 1.0)).xyz;
			float gustWave = getGustWave( vertexWorldPosition );
			float height = vertexWorldPosition.y;
	#endif
#endif

		float gustStrength = gustWave * u_windParams.gustStrength;
		float heightFactor = clamp(height, 0.0, WIND_HEIGHT_MAX) * (1.0 / WIND_HEIGHT_MAX);

		#ifdef AGGREGATE_MATERIAL
			windData.branchPhase += itemData.y;
		#endif

		float branchWave = getWave( windData.branchPhase, vec2(BRANCH_FREQ1, BRANCH_FREQ2) );

		float branchStrength = branchWave * u_windParams.strength
			+ (0.5 + branchWave) * gustStrength;

		vec3 targetPosition = transformed;
		vec3 leafPosition; // relative to leaf origin (where it connects to the branch)

		if (isLeaf) {
			leafPosition = unpackVec3( wind.z );
			targetPosition -= leafPosition;
		}

		transformed = transformBranch(unpackVec3( wind.y ), targetPosition,
			branchStrength * windData.branchBendFactor * heightFactor);

		//transformed = targetPosition; // don't move branch

		if (isLeaf) {

			vec3 leafFwdV = unpackVec3( wind.w );

			#ifdef AGGREGATE_MATERIAL
				windData.leafPhase += itemData.y;
			#endif

			float leafWave = getWave( windData.leafPhase, vec2(LEAF_FREQ1, LEAF_FREQ2) );

			//float leafStrength = (leafWave + 0.67 * branchWave) * u_windParams.strength
			float leafStrength = (2.0 * leafWave + 0.4 * branchWave) * u_windParams.strength
				+ 2.0 * (0.25 + leafWave) * gustStrength;

#ifdef WIND_NO_LEAVES
			transformed /= 0.0;
#endif
			//transformed += leafPosition; // don't move leaf w/ respect to the branch

			transformed += transformLeaf(
#ifndef WIND_DEPTH
				objectNormal,
#endif
				leafPosition, leafFwdV, leafStrength * windData.leafBendFactor * heightFactor
			);

#if defined( WIND_COLOR ) && ( defined WIND_COLOR_PHASE )
			setColorNorm( windData.leafPhase );
#endif

		} else { // branch-only vertex

#if defined( WIND_COLOR ) && ( defined WIND_COLOR_PHASE )
			setColorNorm( windData.branchPhase );
#endif
		}


	} // isAffectedByWind
#endif
`;




THREE.ShaderChunk["wind_pars_fragment"] = `

#ifndef WIND_DEPTH
	#if defined( WIND_WEBGL2 )
		flat varying float v_windColor; // values: 0, 1, 2, or 3
		flat varying float v_windIsLeaf; // values: 0, 1; TODO v2 consider separate attrib. set for leaf and branch
	#else
		varying float v_windColor;
		varying float v_windIsLeaf;
	#endif
#endif

`;


THREE.ShaderChunk["wind_fragment"] = `

	if (v_windIsLeaf != 0.0) { // Next versions: separate shaders.

		if (vUv.y <= 0.375) { // Dried Leaves

			if (v_windColor == 1.0)
				gl_FragColor.rg *= vec2( 1.07, 0.96 );

			if (v_windColor == 2.0)
				gl_FragColor.rgb *= vec3( 0.95, 1.05, 1.07 );

		} else { // Green Leaves

			if (v_windColor <= 1.0) {

				if (v_windColor == 1.0)
					gl_FragColor.rg *= vec2( 1.13, 0.94 );

			} else {

				if (v_windColor == 2.0)
					gl_FragColor.rg *= vec2( 0.92, 1.1 );
				else // 3.0
					gl_FragColor.rgb *= vec3( 0.8, 1.13, 1.13 );
			}
		}


	} else { // Branch color

		if (v_windColor <= 1.0) {

			if (v_windColor == 1.0)
				gl_FragColor.rg *= vec2( 0.94, 1.05 );

		} else {

			if (v_windColor == 2.0)
				gl_FragColor.gb *= vec2( 1.1, 1.3 );
			else // 3.0
				gl_FragColor.rb *= vec2( 0.95, 1.11 );
		}
	}
`;





export { Wind }

