
import { ItemDataTexture } from './ItemDataTexture.js';


var Shader = {
/*
	replaceChunk(name, from, to = "") {
		THREE.ShaderChunk[name] = THREE.ShaderChunk[name].replace(from, to);
	},


	replaceAllVisibleMaterialsVertex(from, to = "") {

		[ "meshbasic_vert", "meshlambert_vert", "meshphong_vert", "meshphysical_vert" ]
			.forEach(name => this.replaceChunk(name, from, to));
	},


	replaceAllVisibleMaterialsFragment(from, to = "") {

		[ "meshbasic_frag", "meshlambert_frag", "meshphong_frag", "meshphysical_frag" ]
			.forEach(name => this.replaceChunk(name, from, to));
	},
*/
};



// ==========================================================
//
//   Application-wide modifications to THREE.ShaderChunk
//
// 1. Fog
//
// ==========================================================

THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
	varying float vDistanceToCamera;
#endif
`;


//
// - interpolation for fragment shader would not be exact; OK
// - mvPosition is required only for lighting
//
// varying float vHeight = worldPosition.y;
THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
	//vDistanceToCamera = distance(cameraPosition.xz, worldPosition.xz);
	vDistanceToCamera = length( mvPosition.xz );
#endif
`;


THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vDistanceToCamera;

	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif
`;


// for usage before fog_fragment
THREE.ShaderChunk.logdepthbuf_fragment += `
float fogFactor = 0.0;

#ifdef USE_FOG
	//if (vDistanceToCamera > fogFar) // flickering 
	//	discard;

	#ifdef FOG_EXP2
	#else
		fogFactor = smoothstep( fogNear, fogFar, vDistanceToCamera );
	#endif
#endif
`;


THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
	if (fogFactor >= 1.0)
		discard;

	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`;



// ======================
//
//   2. Misc
//
// ======================

//
// Found it to be in the range 0.97 ... 1.03, removed normalization
// Would it work w/ scaled items?
// Normalized in normal_fragment_begin
//
/*
Shader.replaceAllVisibleMaterialsVertex(/vNormal =[^;]+;/, `
//	transformedNormal = normalize( transformedNormal );
	vNormal = transformedNormal;
`);
*/


// ========================================
//
//   shadowmap
//
// Remove computation of normals (for unused shadowNormalBias)
//
// ========================================

THREE.ShaderChunk.shadowmap_vertex = `
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SPOT_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0
//		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
//		vec4 shadowWorldPosition;
		vec4 shadowWorldPosition = worldPosition;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
//		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
		vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
//		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias, 0 );
		vSpotShadowCoord[ i ] = spotShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
//		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
		vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
#endif`;



// ========================================
//
//     AGGREGATE_MATERIAL
//
// ========================================


THREE.ShaderChunk.aggregate_pars_vertex = `

#ifdef AGGREGATE_MATERIAL

attribute float iId;

uniform highp sampler2D u_itemDataTexture;
uniform vec2 u_itemDataTextureSize;

vec2 aggregateTexCoord;


void initAggregate(const in float iId) {

	float pxOff = iId * 4.0;

	float rowsY = floor( pxOff * ${ 1 / ItemDataTexture.WIDTH_PX } );
	float colsX = pxOff - rowsY * ${ ItemDataTexture.WIDTH_PX.toFixed(1) };

	aggregateTexCoord = vec2(
		colsX * ${ 1 / ItemDataTexture.WIDTH_PX } + ${ 0.5 / ItemDataTexture.WIDTH_PX },
		( rowsY + 0.5 ) / u_itemDataTextureSize.y
	);
}


vec4 getItemData(const in float offset) {

	return texture2D( u_itemDataTexture, vec2(
		offset * ${ 1 / ItemDataTexture.WIDTH_PX } + aggregateTexCoord.x,
		aggregateTexCoord.y ) );
}


mat4 getItemDataMatrix(float offset) { // offset is in px.

	float x = offset * ${ 1 / ItemDataTexture.WIDTH_PX } + aggregateTexCoord.x;

	vec4 v1 = texture2D( u_itemDataTexture, vec2(
		x,
		aggregateTexCoord.y ) );

	vec4 v2 = texture2D( u_itemDataTexture, vec2(
		x + ${ 1 / ItemDataTexture.WIDTH_PX },
		aggregateTexCoord.y ) );

	vec4 v3 = texture2D( u_itemDataTexture, vec2(
		x + ${ 2 / ItemDataTexture.WIDTH_PX },
		aggregateTexCoord.y ) );

	return mat4(
		vec4( v1.xyz, 0.0 ),
		vec4( v1.w, v2.xy, 0.0 ),
		vec4( v2.zw, v3.x, 0.0 ),
		vec4( v3.yzw, 1.0 )
	);
}


mat4 getDataBlockMatrix(const in float iId, const in float matrixOffset) {

	float pxOff = iId * 4.0 + matrixOffset * 3.0;

	float rowsY = floor( pxOff * ${ 1 / ItemDataTexture.WIDTH_PX } );
	float colsX = pxOff - rowsY * ${ ItemDataTexture.WIDTH_PX.toFixed(1) };

	float x = colsX * ${ 1 / ItemDataTexture.WIDTH_PX } + ${ 0.5 / ItemDataTexture.WIDTH_PX };
	float y = ( rowsY + 0.5 ) / u_itemDataTextureSize.y;

	vec4 v1 = texture2D( u_itemDataTexture, vec2(x, y) );
	vec4 v2 = texture2D( u_itemDataTexture, vec2(x + ${ 1 / ItemDataTexture.WIDTH_PX }, y) );
	vec4 v3 = texture2D( u_itemDataTexture, vec2(x + ${ 2 / ItemDataTexture.WIDTH_PX }, y) );

	return mat4(
		vec4( v1.xyz, 0.0 ),
		vec4( v1.w, v2.xy, 0.0 ),
		vec4( v2.zw, v3.x, 0.0 ),
		vec4( v3.yzw, 1.0 )
	);
}
#endif
`;



THREE.ShaderChunk.aggregate_skin_pars_vertex = `

#ifdef AGGREGATE_SKINNED
	attribute vec4 skinIndex;
	attribute vec4 skinWeight;
#endif
`;



THREE.ShaderChunk.aggregate_skin_vertex = `

#ifdef AGGREGATE_SKINNED

	mat4 boneMatX = getItemDataMatrix( 1.0 + 3.0 * float(skinIndex.x) );
	mat4 boneMatY = getItemDataMatrix( 1.0 + 3.0 * float(skinIndex.y) );
	mat4 boneMatZ = getItemDataMatrix( 1.0 + 3.0 * float(skinIndex.z) );
	mat4 boneMatW = getItemDataMatrix( 1.0 + 3.0 * float(skinIndex.w) );

	#ifndef AGGREGATE_DEPTH
		mat3 skinMatrix = mat3( 0.0 );
		skinMatrix += skinWeight.x * mat3(boneMatX);
		skinMatrix += skinWeight.y * mat3(boneMatY);
		skinMatrix += skinWeight.z * mat3(boneMatX);
		skinMatrix += skinWeight.w * mat3(boneMatY);
		objectNormal = skinMatrix * objectNormal;
	#endif

	vec4 skinVertex = vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;

	vec4 worldPosition = skinned;

#endif
`;


/*
THREE.ShaderChunk.uv_vertex = `

vec3 transformed = position;

#ifdef AGGREGATE_SKINNED

mat4 itemMatrix = getItemDataMatrix();

if (0.0 != 0.0) {
//if (itemMatrix[3].w > 0.0) {

	gl_Position = vec4(2.0, 0.0, -2.0, 0.0);

} else {

#endif
` + THREE.ShaderChunk.uv_vertex;

/*
THREE.ShaderChunk.fog_vertex =
		THREE.ShaderChunk.fog_vertex + `

#ifdef AGGREGATE_SKINNED
}
#endif
`;
*/



Shader.aggregate = function AGGREGATE(shader) { // Display.renderer.info.programs

	shader.defines || (shader.defines = {});

	shader.defines.AGGREGATE_MATERIAL = true;

	Object.assign( shader.uniforms, Shader.aggregate.uniforms );

	shader.vertexShader = THREE.ShaderChunk.aggregate_vert;
//PreLoader.setupTextOutput(shader.vertexShader);
//console.log(shader.vertexShader);
}



Shader.aggregateWind = function AGGREGATE_WIND(shader) { // renderer.info.programs

	shader.defines || (shader.defines = {});

	shader.defines.AGGREGATE_MATERIAL = true;
	shader.defines.USE_WIND = true;
	shader.defines.AGGREGATE_WIND = true;

	if (Wind.isWebGL2())
		shader.defines.WIND_WEBGL2 = true;


	Object.assign( shader.uniforms, Shader.aggregate.uniforms );

	shader.uniforms.u_windParams = Main.area.wind.u_windParams;


	shader.vertexShader = THREE.ShaderChunk.aggregate_vert;


	shader.fragmentShader = shader.fragmentShader.replace(
		/(#include <color_pars_fragment>)/, a =>
			a + THREE.ShaderChunk["wind_pars_fragment"]
	);

	shader.fragmentShader = shader.fragmentShader.replace(
		/(#include <fog_fragment>)/, a =>
			THREE.ShaderChunk["wind_fragment"] + a
	);

}



Shader.aggregateSkinned = function AGGREGATE_SKINNED(shader) { // different reading from data texture!

	shader.defines || (shader.defines = {});

	shader.defines.AGGREGATE_MATERIAL = true;
	shader.defines.AGGREGATE_SKINNED = true;

	Object.assign( shader.uniforms, Shader.aggregate.uniforms );

	shader.vertexShader = THREE.ShaderChunk.aggregate_vert;
}



Shader.aggregateSkinnedChains = function AGGREGATE_SKINNED_CHAINS(shader) { // different reading from data texture!

	shader.defines || (shader.defines = {});

	shader.defines.AGGREGATE_MATERIAL = true;
	shader.defines.AGGREGATE_SKINNED = true;
	shader.defines.AGGREGATE_CHAINS = true;

	Object.assign( shader.uniforms, Shader.aggregate.uniforms );

	shader.vertexShader = THREE.ShaderChunk.aggregate_vert;

//var s = shader.vertexShader;
//setTimeout( () => PreLoader.setupTextOutput(s), 500 );

}



THREE.ShaderChunk.aggregate_vert = `

#define STANDARD
varying vec3 vViewPosition;
varying vec3 vNormal;

#include <common>
#include <aggregate_pars_vertex>
#include <aggregate_skin_pars_vertex>
#ifdef AGGREGATE_CHAINS
	#include <chains_pars_vertex>
#endif
#include <uv_pars_vertex>
#include <wind_pars_vertex>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>

void main() {

	initAggregate(iId);

	vec3 transformed = position; // <begin_vertex>
	vec3 objectNormal = normal; // <beginnormal_vertex>

	#include <uv_vertex>

	//#include <skinbase_vertex>
	//#include <skinnormal_vertex>
	//#include <defaultnormal_vertex>

	#ifdef AGGREGATE_CHAINS
		#include <chains_vertex>
	#else
		#include <aggregate_skin_vertex>
	#endif

	#if !defined( AGGREGATE_SKINNED ) && !defined( AGGREGATE_CHAINS )

		mat4 itemMatrix = getItemDataMatrix(1.0);

		#include <wind_vertex> // wouldn't work w/ skinning

		vec4 worldPosition = itemMatrix * vec4( transformed, 1.0 );

		objectNormal = mat3(itemMatrix) * objectNormal;
	#endif

	vNormal = normalize( normalMatrix * objectNormal ); // transformedNormal

	//#include <project_vertex>

	vec4 mvPosition = modelViewMatrix * worldPosition;

	gl_Position = projectionMatrix * mvPosition;

	vViewPosition = - mvPosition.xyz;

	//#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}
`;




// ========================================
//
//     AGGREGATE_MATERIAL
//
//     D E P T H
//
// ========================================


Shader.aggregateDepth = function AGGREGATE_DEPTH(shader) {

	shader.defines || (shader.defines = {});

	shader.defines.AGGREGATE_MATERIAL = true;
	shader.defines.AGGREGATE_DEPTH = true;

	Object.assign( shader.uniforms, Shader.aggregate.uniforms );

	shader.vertexShader = THREE.ShaderChunk.aggregate_depth_vert;
}



Shader.aggregateWindDepth = function AGGREGATE_WIND_DEPTH(shader) {

	shader.defines || (shader.defines = {});

	shader.defines.AGGREGATE_MATERIAL = true;
	shader.defines.AGGREGATE_DEPTH = true;
	shader.defines.USE_WIND = true;
	shader.defines.AGGREGATE_WIND = true;
	shader.defines.WIND_DEPTH = true;

	if (Wind.isWebGL2())
		shader.defines.WIND_WEBGL2 = true;


	Object.assign( shader.uniforms, Shader.aggregate.uniforms );

	shader.uniforms.u_windParams = Main.area.wind.u_windParams;

	shader.vertexShader = THREE.ShaderChunk.aggregate_depth_vert;
}


Shader.aggregateSkinnedDepth = function AGGREGATE_SKINNED_DEPTH(shader) {

	shader.defines || (shader.defines = {});

	shader.defines.AGGREGATE_MATERIAL = true;
	shader.defines.AGGREGATE_SKINNED = true;
	shader.defines.AGGREGATE_DEPTH = true;

	Object.assign( shader.uniforms, Shader.aggregate.uniforms );

	shader.vertexShader = THREE.ShaderChunk.aggregate_depth_vert;
}


Shader.aggregateSkinnedChainsDepth = function AGGREGATE_SKINNED_CHAINS_DEPTH(shader) {

	shader.defines || (shader.defines = {});

	shader.defines.AGGREGATE_MATERIAL = true;
	shader.defines.AGGREGATE_SKINNED = true;
	shader.defines.AGGREGATE_CHAINS = true;
	shader.defines.AGGREGATE_DEPTH = true;

	Object.assign( shader.uniforms, Shader.aggregate.uniforms );

	shader.vertexShader = THREE.ShaderChunk.aggregate_depth_vert;
}


THREE.ShaderChunk.aggregate_depth_vert = `

#include <common>
#include <aggregate_pars_vertex>
#include <aggregate_skin_pars_vertex>
#ifdef AGGREGATE_CHAINS
	#include <chains_pars_vertex>
#endif
#include <uv_pars_vertex>
#include <wind_pars_vertex>

varying vec2 vHighPrecisionZW;

void main() {

	initAggregate(iId);

	vec3 transformed = position; // <begin_vertex>

	#include <uv_vertex>

	#ifdef AGGREGATE_CHAINS
		#include <chains_vertex>
	#else
		#include <aggregate_skin_vertex>
	#endif

	#if !defined( AGGREGATE_SKINNED ) && !defined( AGGREGATE_CHAINS )

		mat4 itemMatrix = getItemDataMatrix(1.0);

		#include <wind_vertex> // wouldn't work w/ skinning

		vec4 worldPosition = itemMatrix * vec4( transformed, 1.0 );
	#endif

	vec4 mvPosition = modelViewMatrix * worldPosition;

	gl_Position = projectionMatrix * mvPosition;

	vHighPrecisionZW = gl_Position.zw;
}
`;



Shader.aggregate.uniforms = {

	u_itemDataTexture: { value: new THREE.DataTexture },
	u_itemDataTextureSize: { value: new THREE.Vector2 },
}




// ========================================
//
//  3. Static
//
// - identity normalMatrix
// - identity modelMatrix
//
//
// ========================================


// ========================================
//
//   Common per-material functions.
//
// ========================================

Shader.staticMaterial = function staticMaterial(shader) {

	if (!shader.defines)
		shader.defines = {};

	shader.defines.STATIC_MATERIAL = true;
}

/* Not used
Shader.cameraPosition = function cameraPosition(shader) {

	shader.uniforms.cameraPosition = { value: Display.cameraView.position };
}
*/

Shader.alphaMapTest = function alphaMapTest(shader) {

	var doReplace = (from, to = "") =>
		shader.fragmentShader = shader.fragmentShader.replace(from, to);

	doReplace(/#include <alphamap_fragment>/);
	doReplace(/#include <alphatest_fragment>/);

	doReplace(/#include <map_fragment>/, `
#include <alphamap_fragment>
#include <alphatest_fragment>
#include <map_fragment>
	`);
}

//
// alphaTest + normalMap or bumpMap: flickering. (got it)
// TODO (+fog) introduce conditional.
//
Shader.alphaTestNormalMap = function alphaTestNormalMap(shader) {

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <alphatest_fragment>/, `
	`);

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <fog_fragment>/, `
#include <alphatest_fragment>
#include <fog_fragment>
	`);
}


Shader.doubleSideNormalMap = function doubleSideNormalMap(shader) {

// vUv is r/o.
// TODO patch UVs for all lookups
/*
	var mapFragment = THREE.ShaderChunk.map_fragment;

	mapFragment = mapFragment.replace(
		/vec4 texelColor = texture2D( map, vUv );/,
		"vec4 texelColor = texture2D( map, vec2( gl_FrontFacing ? vUv.x : -vUv.x, vUv.y );"
	);

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <map_fragment>/,
		mapFragment
	);
*/
}


// ========================================
//
//   Custom per-material functions.
//
// ========================================

Shader.custom_AspenBranches = function custom_AspenBranches(shader, factor) {

	if (typeof factor != 'number')
		factor = 1.26;

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <alphatest_fragment>/, a => `

	if (vUv.y <= 0.375)
		diffuseColor.a *= ${factor.toFixed(4)};

	` + a);
}


// Removes #include!
Shader.custom_AspenLeaves = function custom_AspenLeaves(shader) {

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <alphatest_fragment>/, `
#ifdef ALPHATEST
	float targetAlpha = ALPHATEST;

	if (vUv.y <= 0.375) {

		// This should depend on screen resolution (pass in uniform?)

		if (vDistanceToCamera < 75.0)
			targetAlpha = mix(0.32, 0.15, max(0.0, vDistanceToCamera - 25.0) / 50.0);
		else
			targetAlpha = mix(0.15, 0.10, min(150.0, vDistanceToCamera - 75.0) / 150.0);
	}

	if ( diffuseColor.a < targetAlpha )
		discard;
#endif
	`);
}



Shader.combinedMap = function combinedMap(shader) {

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <map_fragment>/, `

	vec4 texelColor = texture2D( map, vUv );

	// Black edges fix
	// premultiplyAlpha on texture is off (it controls output?)

	if (texelColor.a >= 0.03)
		texelColor.rgb *= 1.0 / texelColor.a;
	else
		discard;

	diffuseColor *= texelColor;
	`);
}



// Removes #include!
Shader.distanceAlphaTest = function distanceAlphaTest(shader, farAmount, halfDistanceAmount) {

	var coefficients = Polynomial.getQuadraticCoefficientsLagrange(
		0, shader.alphaTest,
		1, farAmount,
		0.5, halfDistanceAmount
	);

	if (!coefficients)
		Report.throw("bad args");

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <alphatest_fragment>/, `
#ifdef ALPHATEST

	float dNorm = vDistanceToCamera / fogFar;
	float targetAlpha = (${coefficients.a} * dNorm + ${coefficients.b}) * dNorm + ${coefficients.c};

	if ( diffuseColor.a < targetAlpha )
		discard;
#endif
	`);

}


// Removes #include!
Shader.distanceAlphaTest_TP = function distanceAlphaTest_TP(shader, farAmount, halfDistanceAmount) {

	var coefficients = Polynomial.getQuadraticCoefficientsLagrange(
		0, shader.alphaTest,
		1, farAmount,
		0.5, halfDistanceAmount
	);

	if (!coefficients)
		Report.throw("bad args");

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <alphatest_fragment>/, `
#ifdef ALPHATEST
	if ( diffuseColor.a < 0.03 )
		discard;

	float dNorm = vDistanceToCamera / fogFar;
	float targetAlpha = (${coefficients.a} * dNorm + ${coefficients.b}) * dNorm + ${coefficients.c};

	if ( diffuseColor.a >= targetAlpha )
		discard;
#endif
	`);

/*
	var start = 0.2, end = 0.7;

	var	a = (start - 1) / (start * start - end * end),
		b = 1 - a * end * end;

	shader.fragmentShader = shader.fragmentShader.replace(
		/gl_FragColor[^;]+;/, a => `
//if (diffuseColor.a > ${start})
//	diffuseColor.a = ${a} * diffuseColor.a * diffuseColor.a + ${b};
diffuseColor.a *= dAlpha;
gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	`);
*/
}



Shader.customUniforms = {

	baseCenter_indicatorColor: new THREE.Uniform( new THREE.Vector3 ),
	//charColor: new THREE.Uniform( new THREE.Vector3 ),
}



Shader.customChar = function customChar(shader) {

	// unused; uniform is set on every call from .onBeforeRender() (see CharDisplay)
	//shader.uniforms.charColor = new THREE.Uniform( new THREE.Vector3 );//Shader.customUniforms.charColor;

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <map_pars_fragment>/, a => a + `

		uniform vec3 charColor;
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <tonemapping_fragment>/, a => a + `

		gl_FragColor.rgb = mix( gl_FragColor.rgb, charColor, 0.5 );
	`);

}



Shader.customBaseCenter = function customBaseCenter(shader) {

	shader.uniforms.baseCenter_indicatorColor = Shader.customUniforms.baseCenter_indicatorColor;

/*
	shader.vertexShader = shader.vertexShader.replace(
		/#include <alphatest_fragment>/, `
	`);
*/

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <map_pars_fragment>/, a => a + `

	uniform vec3 baseCenter_indicatorColor;
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <map_fragment>/, a => a + `

		//if ( all(bvec3(vUv.x < 0.031, vUv.y > 0.3906, vUv.y < 0.405)) ) {
		if ( all(bvec3(vUv.x < 0.031, vUv.y > 1.0 - 0.3906, vUv.y < 1.0 - 0.405)) ) {

			gl_FragColor = vec4( baseCenter_indicatorColor, 1.0 );

		//} else if ( all(bvec3(vUv.x < 0.031, vUv.y > 0.376, vUv.y < 0.3906)) ) {
		} else if ( all(bvec3(vUv.x < 0.031, vUv.y > 1.0 - 0.376, vUv.y < 1.0 - 0.3906)) ) {

			gl_FragColor = vec4( 0.05, 0.05, 0.08, 1.0 );

		} else {
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <metalnessmap_fragment>/, a => `

float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	if (vUv.y < 0.5) {
		metalnessFactor = 0.0;

	} else {
		vec4 texelMetalness = texture2D( metalnessMap, vec2(vUv.x, vUv.y) );
		metalnessFactor *= texelMetalness.b;
	}
#endif
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <tonemapping_fragment>/, a => a + `
		}
	`);
}



Shader.customFence = function customFence(shader) {

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <alphatest_fragment>/, `

	float missingFraction = 1.0 - abs( dot(vViewPosition, geometryNormal) ) / length(vViewPosition);

	diffuseColor.a *= (1.0 + missingFraction);
	if ( diffuseColor.a < ALPHATEST )
		discard;
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <fog_fragment>/, a => `

	gl_FragColor.a *= (1.0 + missingFraction);
	` + a);

}


Shader.customFence_I = function customFence(shader) {

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <alphatest_fragment>/, `
	if ( diffuseColor.a < 0.1 )
		discard;
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <fog_fragment>/, a => `

	float missingFraction = 1.0 - abs( dot(vViewPosition, geometryNormal) ) / length(vViewPosition);

	gl_FragColor.a *= (1.0 + missingFraction);
	if ( gl_FragColor.a < ALPHATEST )
		discard;
	` + a);

}



Shader.customFence_TP = function customFence_TP(shader) {

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <alphatest_fragment>/, `
	if ( diffuseColor.a < 0.1 )
		discard;
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <fog_fragment>/, a => `

	float missingFraction = 1.0 - abs( dot(vViewPosition, geometryNormal) ) / length(vViewPosition);

	gl_FragColor.a *= (1.0 + missingFraction);
	if ( gl_FragColor.a >= ALPHATEST )
		discard;
	` + a);

}


// **********************************************************
//
//     C S M
//
// **********************************************************

Shader["csmBiasFactor"] = function csmBiasFactor(shader, factor) {

	var fragment = THREE.ShaderChunk.lights_fragment_begin.replace(
		/ directionalLightShadow.shadowBias,/g, a =>
		` ${factor.toFixed(5)} * directionalLightShadow.shadowBias,`
	);

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <lights_fragment_begin>/, a => `
		${fragment}
	`);
}


Shader["csmBiasFactorPerCascade"] = function csmBiasFactorPerCascade(shader, factors) {

	var cascades = UIPrefs.csm.adapter.csm.cascades;

	if (factors.length !== cascades)
		Report.warn("csmBiasPerCascade", `cascades=${cascades} factors=${factors.length}`);

	var total = 0;

	var fragment = THREE.ShaderChunk.lights_fragment_begin.replace(
		/ directionalLightShadow.shadowBias,/g, source => {

		total ++;

		if (total !== 2)
			return source;

		var replacement = ' (';

		for (let i = 0; i < factors.length - 1; i++) {

			replacement += `UNROLLED_LOOP_INDEX == ${i} ? ${factors[i].toFixed(5)} : `;
		}

		replacement += `${factors[factors.length-1].toFixed(5)}) * directionalLightShadow.shadowBias,`;

		return replacement;
	});

	if (total !== 3 && total !== 1) // 1: non-csm
		Report.warn("csmBiasPerCascade replacements", `total=${total}`);

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <lights_fragment_begin>/, a => `
		${fragment}
	`);
}



// **********************************************************

Shader["charAppearEffect"] = function charAppearEffect(shader) {

	shader.vertexShader = shader.vertexShader.replace( // before normal pars.
		/(#include <uv_pars_vertex>)/, a => a + `

uniform float u_effectScale;

flat varying float v_effectScale;

//varying vec3 v_localPosition;
varying vec3 v_worldPosition;
flat varying vec3 v_itemCenterWorld;
	`);

	shader.vertexShader = shader.vertexShader.replace( // before normals
		/(#include <worldpos_vertex>)/, a => a + `

v_effectScale = max(0.01, u_effectScale);

//v_localPosition = transformed.xyz;
v_worldPosition = worldPosition.xyz;
v_itemCenterWorld = modelMatrix[3].xyz;
	`);



	shader.fragmentShader = shader.fragmentShader.replace(
		/(#include <uv_pars_fragment>)/, a => a + `

flat varying float v_effectScale;

//varying vec3 v_localPosition;
varying vec3 v_worldPosition;
flat varying vec3 v_itemCenterWorld;
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/(#include <logdepthbuf_fragment>)/, a => a + `

vec2 v = normalize( v_worldPosition.xz - cameraPosition.xz );
vec2 p0 = v_worldPosition.xz - v_itemCenterWorld.xz; // must be "Mobile3D"

float distAlongV = abs( dot(p0, v) );
vec2 closestP = p0 + v * distAlongV;
float d = length( closestP );
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <tonemapping_fragment>/, a => a + `

d /= v_effectScale;

float colorComponent = max(0.0, 0.25 * (0.8 - d * 1.2) ) * v_effectScale;

gl_FragColor = vec4( 1.0, colorComponent, colorComponent, max(0.0, 1.0 - d) * v_effectScale );
	`);

}




// **********************************************************

Shader.baseCenterCS = function baseCenterCS(shader) {

	shader.fragmentShader = shader.fragmentShader.replace(
		/(#include <uv_pars_fragment>)/, a => a + `

uniform vec2 constructionSite2_data;
		`);



	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <metalnessmap_fragment>/, a => `

float metalnessFactor = metalness;
bool constructionSite2_data_isApplicable = metalness == 1.0;

#ifdef USE_METALNESSMAP
	if (vUv.y < 0.5) {
		metalnessFactor = 0.0;

	} else if (constructionSite2_data_isApplicable) {
		metalnessFactor = 0.3;

	} else {
		vec4 texelMetalness = texture2D( metalnessMap, vec2(vUv.x, vUv.y) );
		metalnessFactor *= texelMetalness.b;
	}
#endif
	`);



	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <tonemapping_fragment>/, a => `

if (constructionSite2_data_isApplicable) {

	float stage = constructionSite2_data.x;
	float t = constructionSite2_data.y;

	float avg = 0.4 * ( gl_FragColor.r + gl_FragColor.g + gl_FragColor.b );

	avg = mix( diffuse.r * 0.7, avg, t);

	vec3 avgLightness = vec3(avg);

	if (stage == 1.0) {
		avgLightness.rg += (1.0 - t) * 0.35;

	} else if (stage == 2.0) {
		avgLightness.b += (1.0 - t) * 0.2;

	} else
		avgLightness.r += (1.0 - t) * 0.25;

	gl_FragColor.rgb = mix( avgLightness, gl_FragColor.rgb, t );
}
	`);
}



// **********************************************************

Shader.constructionSite = function constructionSite(shader) {

	shader.uniforms.u_time = Engine.u_time;


	shader.vertexShader = shader.vertexShader.replace( // before normal pars.
		/(#include <uv_pars_vertex>)/, a => a + `

uniform float u_time;

varying vec3 v_worldPosition;
	`);


	shader.vertexShader = shader.vertexShader.replace(
		/(#include <worldpos_vertex>)/, a => `
v_worldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
	`);


	shader.fragmentShader = shader.fragmentShader.replace( // pars.
		/(#include <uv_pars_fragment>)/, a => a + `

uniform float u_time;

varying vec3 v_worldPosition;

float cubicInOut(float x) {
	if (x < 0.5)
		return x * x * x * 4.0;
	x = 1.0 - x;
	return 1.0 - (x * x * x * 4.0);
}
	`);


	// 3 different wave colors encoded in metalness

	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <metalnessmap_fragment>/, a => `

float metalnessFactor = 0.5;
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <fog_fragment>/, a => `

if (!gl_FrontFacing)
	gl_FragColor.a *= 0.6;

float stage = metalness <= 1.0 ? 1.0 :
	metalness <= 2.0 ? 2.0 :
	metalness <= 3.0 ? 3.0 : 4.0;

vec3 waveDirection = stage <= 3.0
	? normalize( vec3( 50.0, -20.0, 20.0 ) )
	: normalize( vec3( 1.5, 50.0, 2.0 ) );

float linearDistance = dot( v_worldPosition, waveDirection );
float t = fract( (1.25 * u_time - linearDistance) / 8.75 ); // (s * t - d) / waveLen (period=7s)

if (stage == 1.0)
	t = fract(t + 0.3);

float factor = 0.15;

if (t <= factor) {

	t = t * (2.0 / factor); // 0..2
	t = 1.0 - abs(t - 1.0); // 0..1

	t = t * t * t;
	//t = cubicInOut(t);

	if (!gl_FrontFacing)
		t *= 0.5;

	vec4 waveColor = stage == 1.0 ? vec4( 0.7, 0.7, 0.1, 0.5 ) :
		stage == 2.0 ? vec4( 0.2, 0.2, 0.7, 0.5 ) :
		stage == 3.0 ? vec4( 0.7, 0.2, 0.2, 0.5 ) :
		vec4( 0.8, 0.8, 0.8, 0.4 );

	gl_FragColor.rgba += t * waveColor;
}
	`);

}






// **********************************************************

/*
Shader["charAppearEffect-old"] = function charAppearEffect(shader) {

	shader.vertexShader = shader.vertexShader.replace( // before normal pars.
		/(#include <uv_pars_vertex>)/, a => a + `
flat varying mat4 v_modelViewMatrixInverse;
varying vec3 v_localPosition;
	`);


	shader.vertexShader = shader.vertexShader.replace( // before normals
		/(#include <project_vertex>)/, a => a + `
v_modelViewMatrixInverse = inverse( modelViewMatrix );
	`);


	shader.vertexShader = shader.vertexShader.replace( // before normals
		/(#include <worldpos_vertex>)/, a => a + `
//*v_worldPosition = worldPosition.xyz;
v_localPosition = transformed.xyz;
	`);



	shader.fragmentShader = shader.fragmentShader.replace(
		/(#include <uv_pars_fragment>)/, a => a + `
flat varying mat4 v_modelViewMatrixInverse;
varying vec3 v_localPosition;
	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/(#include <logdepthbuf_fragment>)/, a => a + `

vec3 p0 = vViewPosition; // camera from the view from the fragment (TODO)
p0 = ( v_modelViewMatrixInverse * vec4(p0, 1.0) ).xyz; // world

// fragment is the origin
vec3 p1 = ( v_modelViewMatrixInverse * vec4(0.0, 0.0, 0.0, 1.0) ).xyz;

	`);


	shader.fragmentShader = shader.fragmentShader.replace(
		/#include <tonemapping_fragment>/, a => a + `



//gl_FragColor = vec4( max(0.0, 1.0 - d), 0.0, 0.0, 1.0 );
gl_FragColor = vec4( 1.0, 0.0, 0.0, max(0.3, 1.0 - d) );
	`);
}
*/

/* cmp.
	vec3 p0 = vViewPosition; // camera from the view from the fragment
	p0 = ( inverse(v_modelViewMatrix) * vec4(p0, 1.0) ).xyz;
	//* p0 = ( inverse(v_surfaceMatrix) * vec4(p0, 1.0) ).xyz;

	// fragment is the origin
	vec3 p1 = ( inverse(v_modelViewMatrix) * vec4(0.0, 0.0, 0.0, 1.0) ).xyz;
	//* p1 = ( inverse(v_surfaceMatrix) * vec4(p1, 1.0) ).xyz;
// TODO transform only vector
	vec3 v = p1 - p0; // camera(p0) --> fragment(p1)

	// fragment(P) --> away from camera norm'd(V)

	//* vec3 P = ( inverse(v_surfaceMatrix) * vec4(v_localPosition, 1.0) ).xyz;
	vec3 P = v_localPosition;
*/





export { Shader };

