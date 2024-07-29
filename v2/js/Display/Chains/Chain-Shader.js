
import { ChainsCollection } from './ChainsCollection.js';


Object.defineProperty( THREE.ShaderChunk, 'chains_pars_vertex', {
	enumerable: true,
	get: () =>
`

#ifdef AGGREGATE_DEPTH
	vec3 objectNormal = vec3( 0.0 );
#endif


int chainNum;
float chainElementNum;
bool chainIsCylinder;
float chainBaseOffset;

void chainInitGlobals() {

	chainNum = int(skinIndex.x) - ${ChainsCollection.START_SKIN_INDEX};
	chainElementNum = skinIndex.z * 256.0 + skinIndex.y;
	chainIsCylinder = skinIndex.w != 0.0;
	#ifdef AGGREGATE_CHAINS
		chainBaseOffset = ${ (1 + 3 * ChainsCollection.START_SKIN_INDEX).toFixed(1) }
			+ float(${3 * ChainsCollection.DATA_MATRIX_ELEMS} * chainNum);
	#endif
}


#ifdef AGGREGATE_CHAINS

mat4 chainData1, chainData2;

#define CHAIN_HANGING_TRANSFORM		getItemDataMatrix( chainBaseOffset )
#define CHAIN_ROLLED_TRANSFORM		getItemDataMatrix( chainBaseOffset + 3.0 )
#define CHAIN_ROLLED_TILT			getItemDataMatrix( chainBaseOffset + 6.0 )
#define CHAIN_CYLINDER_TRANSFORM	getItemDataMatrix( chainBaseOffset + 9.0 )

void chainInitData1() { chainData1 = getItemDataMatrix( chainBaseOffset + 12.0 ); }
void chainInitData2() { chainData2 = getItemDataMatrix( chainBaseOffset + 15.0 ); }

#define	CHAIN_NUM_HANGING			chainData1[0].x
#define CHAIN_CYLINDER_ROTATE_ANGLE	chainData1[0].y
#define CHAIN_P2_ANGLE				chainData1[0].z
#define CHAIN_DL					chainData1[1].x
#define CHAIN_NUM_ELEMS				chainData1[1].y
#define CHAIN_ELEM_ROLLED_WIDTH		chainData1[1].z
#define CHAIN_ROLLED_ANGLE_PER_ELEM	chainData1[2].x
#define CHAIN_IS_HYPER				chainData1[2].y
#define CHAIN_ROTATE_OFFSET			chainData1[2].z

#define CHAIN_U0				chainData2[0].x
#define CHAIN_Y0				chainData2[0].y
#define CHAIN_A					chainData2[0].z
#define CHAIN_INTEGRAL_AT_U2	chainData2[1].x
#define CHAIN_ELEM_LENGTH		chainData2[1].y
#define CHAIN_L					chainData2[1].z
#define CHAIN_HYPER_IID			chainData2[2].x
#define CHAIN_NON_CIRCULAR_ID	chainData2[2].y
#define CHAIN_PSI				chainData2[2].z
//#define CHAIN_				chainData2[3].x
#define CHAIN_IS_CW_SGN			chainData2[3].y


#else

uniform mat4 u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS * ChainsCollection.CHAINS_MAX} ];
//TODO uniform mat4 u_chainNonCircularData[ int(CHAIN_HYPER_ENTRIES) * ${ChainsCollection.CHAINS_MAX} ]; // repeated blocks(OK)

#define CHAIN_HANGING_TRANSFORM		u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum ]
#define CHAIN_ROLLED_TRANSFORM		u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 1 ]
#define CHAIN_ROLLED_TILT			u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 2 ]
#define CHAIN_CYLINDER_TRANSFORM	u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 3 ]

#define CHAIN_NUM_HANGING			u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][0].x
#define CHAIN_CYLINDER_ROTATE_ANGLE	u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][0].y
#define CHAIN_P2_ANGLE				u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][0].z
#define CHAIN_DL					u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][1].x
#define CHAIN_NUM_ELEMS				u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][1].y
#define CHAIN_ELEM_ROLLED_WIDTH		u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][1].z
#define CHAIN_ROLLED_ANGLE_PER_ELEM	u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][2].x
#define CHAIN_IS_HYPER				u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][2].y
#define CHAIN_FALLOFF_ROTATE_ANGLE	u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][2].z
#define CHAIN_FALLOFF_ELEM_V		u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 4 ][3].xyz

#define CHAIN_U0				u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 5 ][0].x
#define CHAIN_Y0				u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 5 ][0].y
#define CHAIN_A					u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 5 ][0].z
#define CHAIN_INTEGRAL_AT_U2	u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 5 ][1].x
#define CHAIN_ELEM_LENGTH		u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 5 ][1].y
#define CHAIN_L					u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 5 ][1].z
#define CHAIN_HYPER_IID			u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 5 ][2].x
#define CHAIN_NON_CIRCULAR_ID	u_chainMatrix[ ${ChainsCollection.DATA_MATRIX_ELEMS} * chainNum + 5 ][2].y

#endif


mat3 makeRotationAxis(const in vec3 axis, const in float angle) {

	float c = cos(angle), s = sin(angle);
	float t = 1.0 - c;
	float x = axis.x, y = axis.y, z = axis.z;
	float tx = t * x, ty = t * y;

	return mat3(
		tx * x + c, tx * y + s * z, tx * z - s * y,
		tx * y - s * z, ty * y + c, ty * z + s * x,
		tx * z + s * y, ty * z - s * x, t * z * z + c
	);
}


mat3 makeRotationZ(const in float c, const in float s) { return mat3( c, s, 0,  -s, c, 0,  0, 0, 1 ); }


mat4 getBoneMatrix( const in float i ); // fwd.decl. from skinning_pars_vertex


vec4 chainTransformVertex_Cylinder( vec3 position, inout vec3 objectNormal ) {

	mat4 chainCylinderTransform = CHAIN_CYLINDER_TRANSFORM;

	vec4 result = chainCylinderTransform * vec4( position, 1.0 );

	#ifndef AGGREGATE_DEPTH
		objectNormal = mat3(chainCylinderTransform) * objectNormal;
	#endif

	return result;
}


vec4 chainTransformVertex_Rolled( vec3 position, inout vec3 objectNormal ) {

	vec3 result = position;

	mat4 chainRolledTilt = CHAIN_ROLLED_TILT;
	mat4 chainRolledTransform = CHAIN_ROLLED_TRANSFORM;

	result = ( chainRolledTilt * vec4(result, 1.0) ).xyz;

	float rolledElementNum = CHAIN_NUM_ELEMS - chainElementNum - 0.5;

	float angle = (rolledElementNum) * CHAIN_ROLLED_ANGLE_PER_ELEM
		+ CHAIN_CYLINDER_ROTATE_ANGLE + CHAIN_ROTATE_OFFSET;

	mat3 rotAroundZ = makeRotationZ( cos(angle), sin(angle) );

	result = rotAroundZ * result;

	result.z += (rolledElementNum) * CHAIN_ELEM_ROLLED_WIDTH;
	result = ( chainRolledTransform * vec4(result, 1.0) ).xyz;

	#ifndef AGGREGATE_DEPTH
		objectNormal = mat3(chainRolledTilt) * objectNormal;
		objectNormal = rotAroundZ * objectNormal;
		objectNormal = mat3(chainRolledTransform) * objectNormal;
	#endif

	return vec4( result, 1.0 );
}


#ifdef AGGREGATE_CHAINS

struct {
	vec2 texCoord;
	float indexSizeVec4;
	int indexSizeVec4i;
	vec4 index[ ${DifferentiableCurve.DATA_BLOCK_ENTRIES_MAX / 4} ];
	vec4 entry[ ${DifferentiableCurve.DATA_BLOCK_ENTRY_SIZE / 4} ];
} chainDataBlock;


void initChainDataBlockIndex(const in float iId) {

	float pxOff = iId * 4.0;
	float rowsY = floor( pxOff * ${ 1 / ItemDataTexture.WIDTH_PX } );
	float colsX = pxOff - rowsY * ${ ItemDataTexture.WIDTH_PX.toFixed(1) };

	chainDataBlock.texCoord = vec2(
		colsX * ${ 1 / ItemDataTexture.WIDTH_PX } + ${ 0.5 / ItemDataTexture.WIDTH_PX },
		( rowsY + 0.5 ) / u_itemDataTextureSize.y
	);

	vec4 header = texture2D( u_itemDataTexture, chainDataBlock.texCoord );

	chainDataBlock.indexSizeVec4 = header.y;
	chainDataBlock.indexSizeVec4i = int(header.y);
}

void readChainDataBlockIndex() {

	float x = chainDataBlock.texCoord.x;

	for (int i = 0; i < chainDataBlock.indexSizeVec4i; i++) {

		x += ${ 1 / ItemDataTexture.WIDTH_PX };
		chainDataBlock.index[i] = texture2D( u_itemDataTexture, vec2(x, chainDataBlock.texCoord.y) );
	}
}

void readChainDataBlockEntry(float entryNum) {

	float x = chainDataBlock.texCoord.x
		+ chainDataBlock.indexSizeVec4 * ${ 1 / ItemDataTexture.WIDTH_PX }
		+ entryNum * ${DifferentiableCurve.DATA_BLOCK_ENTRY_SIZE / (4 * ItemDataTexture.WIDTH_PX)};

	#pragma unroll_loop_start
	for (int i = 0; i < ${DifferentiableCurve.DATA_BLOCK_ENTRY_SIZE / 4}; i++) {

		x += ${ 1 / ItemDataTexture.WIDTH_PX };
		chainDataBlock.entry[i] = texture2D( u_itemDataTexture, vec2(x, chainDataBlock.texCoord.y) );
	}
	#pragma unroll_loop_end
}

#endif


vec4 chainTransformVertex_Rolled_Hyper( vec3 position, inout vec3 objectNormal ) {

	vec3 result = position;

	float rolledElementNum = CHAIN_NUM_ELEMS - chainElementNum - 0.5; // appears +-1 elem. mb.TODO
	
	float curLength = rolledElementNum * CHAIN_ELEM_LENGTH + CHAIN_ROTATE_OFFSET;

	if (CHAIN_IS_CW_SGN < 0.0)
		curLength = CHAIN_L - curLength;

	float turnFract4X = 4.0 * fract(curLength / CHAIN_L); // [0..4) fraction of full turn
	float quadNum = floor(turnFract4X);
	float curveLen = fract(turnFract4X) * (CHAIN_L * 0.25);

	bvec3 bQuad = equal( vec3(quadNum), vec3(1.0, 2.0, 3.0) );

	//if (quadNum == 1.0 || quadNum == 3.0)
	if ( any(bQuad.xz) )
		curveLen = CHAIN_L * 0.25 - curveLen;

	#ifdef AGGREGATE_CHAINS
		initChainDataBlockIndex( CHAIN_HYPER_IID );
		readChainDataBlockIndex();
	#else
	#endif


	int i;
	bvec4 cmpResult;

	for (i = 0; i < chainDataBlock.indexSizeVec4i; i++) {

		cmpResult = lessThan( vec4(curveLen), chainDataBlock.index[i] );
		if ( any(cmpResult) )
			break;
	}

	int entryIndex = i * 4;

	if ( any(cmpResult.xy) ) {
		if (!cmpResult.x)
			entryIndex += 1;
	} else
		entryIndex += cmpResult.z ? 2 : 3;

	#ifdef AGGREGATE_CHAINS
		readChainDataBlockEntry( float(entryIndex) );
	#else
	#endif


	float ld = curveLen - chainDataBlock.entry[6].x;
	float ld2 = ld * ld;
	vec4 ld_0_3 = vec4( 1.0, ld, ld2, ld2 * ld );
	vec4 ld_4_7 = ld_0_3 * (ld2 * ld2);

	vec4 x4 = chainDataBlock.entry[0] * ld_0_3 + chainDataBlock.entry[1] * ld_4_7;
	vec4 y4 = chainDataBlock.entry[2] * ld_0_3 + chainDataBlock.entry[3] * ld_4_7;

	x4.xy += x4.zw;	y4.xy += y4.zw;

	vec2 coord = vec2( x4.x + x4.y, y4.x + y4.y );

	vec4 c4 = chainDataBlock.entry[4] * ld_0_3;
	vec4 s4 = chainDataBlock.entry[5] * ld_0_3;

	c4.xy += c4.zw;	s4.xy += s4.zw;

	vec2 norm = vec2( c4.x + c4.y, s4.x + s4.y );

	//if (quadNum == 1.0 || quadNum == 2.0) { coord.x = -coord.x; norm.x = -norm.x; }
	//if (quadNum >= 2.0) { coord.y = -coord.y; norm.y = -norm.y; }
	if ( any(bQuad.xy) ) { coord.x = -coord.x; norm.x = -norm.x; }
	if ( any(bQuad.yz) ) { coord.y = -coord.y; norm.y = -norm.y; }

	mat3 chainRolledTilt = mat3(CHAIN_ROLLED_TILT);

	result = chainRolledTilt * result;

	mat3 rotAroundZ = makeRotationZ( norm.x, norm.y );

	result = rotAroundZ * result;

	result += vec3( coord, rolledElementNum * CHAIN_ELEM_ROLLED_WIDTH );


	mat3 rotAroundZ_0 = makeRotationZ( cos(CHAIN_CYLINDER_ROTATE_ANGLE), sin(CHAIN_CYLINDER_ROTATE_ANGLE) );

	result = rotAroundZ_0 * result;

	//NO! mat3 cylinderRotation = mat3( CHAIN_CYLINDER_TRANSFORM );


	mat4 chainRolledTransform = CHAIN_ROLLED_TRANSFORM;

	result = ( chainRolledTransform * vec4(result, 1.0) ).xyz;

	#ifndef AGGREGATE_DEPTH
		objectNormal = chainRolledTilt * objectNormal;
		objectNormal = rotAroundZ * objectNormal;
		objectNormal = rotAroundZ_0 * objectNormal;
		objectNormal = mat3(chainRolledTransform) * objectNormal;
	#endif

	return vec4( result, 1.0 );
}

//vec4 chainTransformVertex_Hanging( vec3 position, inout vec3 objectNormal ) {
//
//	maybe TODO rotation wrt chain endpoint
//
//	float rotationFract = (chainElementNum + 1.0) / (CHAIN_NUM_HANGING + 1.0);
//	float angle = CHAIN_FALLOFF_ROTATE_ANGLE * rotationFract + CHAIN_P2_ANGLE;
//
//	mat3 rotAroundFalloffV = makeRotationAxis( vec3(0.0, 1.0, 0.0), angle );


vec4 chainTransformVertex_Hanging_1( vec3 position, inout vec3 objectNormal ) {

	vec3 result = position;

	mat3 rotationY = makeRotationAxis(
		vec3(0.0, 1.0, 0.0),
		CHAIN_PSI * (chainElementNum) / CHAIN_NUM_HANGING
	);

	result = rotationY * result;

	result.y += (0.5 + chainElementNum) * CHAIN_ELEM_LENGTH;

	mat4 chainHangingTransform = CHAIN_HANGING_TRANSFORM;

	result = ( chainHangingTransform * vec4(result, 1.0) ).xyz;

	#ifndef AGGREGATE_DEPTH
		objectNormal = rotationY * objectNormal;
		objectNormal = mat3(chainHangingTransform) * objectNormal;
	#endif

	return vec4( result, 1.0 );
}


vec4 chainTransformVertex_freeHanging( vec3 position, inout vec3 objectNormal ) {

	vec3 result = position;

	float L = CHAIN_ELEM_LENGTH * (0.5 + chainElementNum);

	float a = CHAIN_A;
	float u0 = CHAIN_U0;
	float int0 = CHAIN_INTEGRAL_AT_U2;

	float sinhVal = (int0 + L) / a;
	float u1 = a * asinh( sinhVal ) + u0;
	float coshVal = sqrt( sinhVal * sinhVal + 1.0 );
	float y1 = a * coshVal + CHAIN_Y0;

	result.xy = vec2( result.y, -result.x ); // incl. into matrix?

	mat3 rotationX = makeRotationAxis(
		vec3(1.0, 0.0, 0.0),
		CHAIN_PSI * (chainElementNum) / CHAIN_NUM_HANGING
	);

	result = rotationX * result;

	mat3 rotationZ = makeRotationZ( 1.0 / coshVal, sinhVal / coshVal );

	result = rotationZ * result;

	result.xy += vec2( u1, y1 );

	mat4 chainFreeHangingTransform = CHAIN_HANGING_TRANSFORM;

	result = ( chainFreeHangingTransform * vec4(result, 1.0) ).xyz;

	#ifndef AGGREGATE_DEPTH
		objectNormal.xy = vec2( objectNormal.y, -objectNormal.x );
		objectNormal = rotationX * objectNormal;
		objectNormal = rotationZ * objectNormal;
		objectNormal = mat3(chainFreeHangingTransform) * objectNormal;
	#endif

	return vec4( result, 1.0 );
}

`});


// in place of skinning_vertex

//THREE.ShaderChunk.chains_vertex = 

Object.defineProperty( THREE.ShaderChunk, 'chains_vertex', {
	enumerable: true,
	get: () =>
`
	bool isChain = skinIndex.x >= ${ChainsCollection.START_SKIN_INDEX.toFixed(1)};

	mat4 boneMatX, boneMatY;
	vec4 skinned = vec4( 0.0 );	// going to be worldPosition

	if (!isChain) {

		#ifdef AGGREGATE_SKINNED
			boneMatX = getItemDataMatrix( 1.0 + 3.0 * float(skinIndex.x) );
			boneMatY = getItemDataMatrix( 1.0 + 3.0 * float(skinIndex.y) );
		#else
			boneMatX = getBoneMatrix( skinIndex.x );
			boneMatY = getBoneMatrix( skinIndex.y );
		#endif

		vec4 skinVertex = vec4( transformed, 1.0 );
		skinned += boneMatX * skinVertex * skinWeight.x;
		skinned += boneMatY * skinVertex * skinWeight.y;

		#ifndef AGGREGATE_DEPTH
			mat3 skinMatrix = skinWeight.x * mat3(boneMatX);
			skinMatrix += skinWeight.y * mat3(boneMatY);
			objectNormal = skinMatrix * objectNormal;
		#endif

	} else {

		chainInitGlobals();

		if (chainIsCylinder) {
			skinned = chainTransformVertex_Cylinder( transformed, objectNormal );

		} else {

			#ifdef AGGREGATE_SKINNED
				chainInitData1();
				chainInitData2();
			#endif

			if (chainElementNum >= ceil(CHAIN_NUM_HANGING)) {

				if (CHAIN_IS_HYPER != 0.0)
					skinned = chainTransformVertex_Rolled_Hyper( transformed, objectNormal );
				else
					skinned = chainTransformVertex_Rolled( transformed, objectNormal );

			} else {

				vec3 objectNormal_1 = objectNormal;

				if ( CHAIN_DL == 0.0 )
					skinned = chainTransformVertex_Hanging_1( transformed, objectNormal );
				else if ( CHAIN_DL > 0.0 )
					skinned = chainTransformVertex_freeHanging( transformed, objectNormal );
				else
					skinned.x /= 0.0;

				if (chainElementNum == floor(CHAIN_NUM_HANGING)) { // Intermediate elem. (!best approach, looks OK)

					vec4 skinned_1;
					float f = fract(CHAIN_NUM_HANGING);

					if (CHAIN_IS_HYPER != 0.0)
						skinned_1 = chainTransformVertex_Rolled_Hyper( transformed, objectNormal_1 );
					else
						skinned_1 = chainTransformVertex_Rolled( transformed, objectNormal_1 );

					skinned = mix( skinned_1, skinned, f );

					#ifndef AGGREGATE_DEPTH
						objectNormal = normalize( mix( objectNormal_1, objectNormal, f ) );
					#endif
				}
			}

		} // !cylinder
	}

	#ifdef AGGREGATE_SKINNED
		vec4 worldPosition = skinned;

	#else
		// OK, it appears in skinnedMesh local coord. (under upper group)
		transformed = ( bindMatrixInverse * skinned ).xyz;
		objectNormal = mat3(bindMatrixInverse) * objectNormal;
		vNormal = normalMatrix * objectNormal;
	#endif

`});




ChainsCollection.shader = function chain(shader) {

	shader.vertexShader = shader.vertexShader.replace(
		/(#include <uv_pars_vertex>)/, a => a
			+ `
#include <chains_pars_vertex>
	`);
/*
    attribute vec4 skinIndex; // must be material.skinning + SkinnedMesh
    attribute vec4 skinWeight;

	shader.vertexShader = shader.vertexShader.replace(
		/(#include <skinning_pars_vertex>)/, a => a
			+ `
#include <chains_pars_vertex>
	`);
*/

	shader.vertexShader = shader.vertexShader.replace(
		/(#include <skinbase_vertex>)/, a => "");

	shader.vertexShader = shader.vertexShader.replace(
		/#include <skinnormal_vertex>[\s\S]+#endif/, "");


	shader.vertexShader = shader.vertexShader.replace(
		/(#include <skinning_vertex>)/, a => `
#include <chains_vertex>
	`);
//console.log(shader.vertexShader);
}



