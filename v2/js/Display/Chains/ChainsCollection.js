
class ChainsCollection {

	constructor(arg) {

		this.name = arg.name;

		if (!this.name)
			Report.warn("Chains: require name for geometry cache");

		this.mesh = arg.mesh;
		this.scene = arg.scene;
		this.nChains = arg.chainData.length;

		if (this.nChains > ChainsCollection.CHAINS_MAX)
			Report.warn("nChains > CHAINS_MAX", `${this} ${this.nChains}`);

		this._uMatrixArray = new Float32Array( 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.nChains );

		if (arg.chains)
			Report.warn("use .chainData");

		this.chains = [];
		this.chainsNonCircular = [];

		arg.chainData.forEach( (data, i) => {

			var chain = new ChainsCollection.Chain(this, data, i);

			this.chains.push(chain);

			if ( chain.isNonCircular() ) {

				chain.nonCircularId = this.chainsNonCircular.length;
				this.chainsNonCircular.push(chain);
			}
		});

		//this.u_chainNonCircularData = this.getNonCircularDataArray();
	}


	toString() { return `[Chains "${this.name}" n=${this.nChains}]` }


	updateDataBlockIId(name, iId) {

		var cntUpdated = 0;

		this.chainsNonCircular.forEach(chain => {

			if (chain.data.nonCircular.cHE.getCurveLengthData_GPU() + '' === name) {
				chain.setIId(iId);
				cntUpdated ++;
			}
		});

		if (cntUpdated === 0)
			Report.warn("no data block users", `${this} ${name}`);
	}


	updateUniforms(gl, program) {

		var getLocation = (name) => {

			var location = gl.getUniformLocation(program, name);
			if (!location)
				return Report.warn("no location", `name=${name}`);

			return location;
		}

		this.updateChainData();

		gl.uniformMatrix4fv(
			getLocation("u_chainMatrix"),
			false,
			this._uMatrixArray
		);

		if ( this.chainsNonCircular.length > 0 ) {

Report.once(`TODO chain data via uniforms`);
			gl.uniform4fv(
				getLocation("u_chainNonCircularData"),
				this.u_chainNonCircularData
			);
		}
	}


	getNonCircularDataArray() {

		var totalSize = 0;

		this.chainsNonCircular.forEach( chain => {

			var block = chain.getApproximationDataBlock();

			totalSize += block.length;
		});

		if (!totalSize)
			return;

		var array = new Float32Array( totalSize );
		var offset = 0;

		this.chainsNonCircular.forEach( chain => {

			var block = chain.getApproximationDataBlock();

			array.set(block, offset);
			offset += block.length;
		});

		return array;
	}


	updateChainData() {

		this.chains.forEach( chain => {

			chain.updateUniformData();
			chain.updateCylinderUniformData();
		});
	}


	getGeometries() { // Geometries shouldn't be modified: cache

		var geometries;

		if (!this.name)
			return this._createGeometries();

		geometries = ChainsCollection.geometryCache[ this.name ];

		if (geometries)
			return geometries;

		ChainsCollection.geometryCache[ this.name ] = this._createGeometries();

		return this.getGeometries();
	}


	_createGeometries() {

		var geometries = [];

		for (let i = 0; i < this.nChains; i++) {

			if (this.chains[i].data.type == 'rope')
				this.chains[i].addRopeGeometries(geometries);
			else
				this.chains[i].addChainGeometries(geometries);

			this.chains[i].addCylinderGeometry(geometries);
		}

		return geometries;
	}

}



ChainsCollection.Chain = function(chainsCollection, data, n) {

	if ( !( !data.type || data.type == 'rope') )
		Report.warn("unknown type", `type=${data.type}`);

	if (typeof data.dL != 'number') // runtime variable param.
		Report.warn("no dL", `${this}`);

	if (!data.isCW_sgn)
		data.isCW_sgn = 1;

	if (!data.P2Angle)
		data.P2Angle = 0;

	if (!data.turnSpacing)
		data.turnSpacing = 0;

	this.chains = chainsCollection;
	this.data = data;
	this.n = n;
	this.nonCircularId = null;

	// Precomputed

	this._P0 = null;
	this._P2 = null;
	this._P0BoneIndex = null;
	this._P2BoneIndex = null;

	this._rollThickness = null;
	this._elemLength = null;
	this._rRoll = null;
	this._cosGamma = null;
	this._turnWidth = null;
	this._theta = null;
	this._elemWidth = null;
	this._dTotal = null;
	this._k = null;

	this._axisPoints = null;
	this._axisSegment = null;
	this._axisV = null;
	this._Uc = null;
	this._localToWorld_Base = null;
	this._rotateOffset = null;
	this._rolledTilt = null;

	// Per-frame computed

	this.errorId = '';
	this.numHanging = null;
	this.dHanging = null;
	this.cylinderRotationAngle = null;
	this.psi = null;

	this.P0BoneMatrix = new THREE.Matrix4;
	this.P2BoneMatrix = new THREE.Matrix4;

	this.localToWorld = new THREE.Matrix4;
	this.worldToLocal = new THREE.Matrix4;

	this.P0 = new THREE.Vector3;
	this.P1 = new THREE.Vector3;
	this.P2 = new THREE.Vector3;
	this.Paxis = new THREE.Vector3;
	this.Psurface = new THREE.Vector3;

	this.cylinderTransform = new THREE.Matrix4;
	this.hangingTransform = new THREE.Matrix4;

	this.Pshow = new THREE.Vector3;
	this.line3Show = new THREE.Line3;

	// Per-frame computed, free hanging

	this.phi = null;
	this.phi1 = null;
	this.P = new THREE.Vector3;
	this.catenaryToWorld = new THREE.Matrix4;

	// Non-circular

	this._L = null;
	this.derivatives = new Point;
	this.p1 = new Point;
	this.pTmp = new Point;

	this.initChain();
}



Object.assign( ChainsCollection.Chain.prototype, {

	toString() { return `[Chain ${this.n}/${this.chains && this.chains.nChains}]` },

	_v: new THREE.Vector3,
	_Ptmp: new THREE.Vector3,
	_mat4: new THREE.Matrix4,

	isNonCircular() { return !!this.data.nonCircular },


	getApproximationDataBlock() {
		return this.data.nonCircular.cHE.getApprox().getDataBlock();
	},


	setIId(iId) {

		var offset = 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.n;

		//#define CHAIN_HYPER_IID				chainData2[2].x
		this.chains._uMatrixArray[ offset + 80 + 8 + 0 ] = iId;
	},


	initChain() {

		var data = this.data; // input data (unmodified)

		console.assert(data.P2Marker && data.P0Marker);

		this._P2 = data.P2Marker instanceof THREE.Vector3
			? data.P2Marker.clone()
			: Util.getBoundingSphere( this.getObjGeometry(data.P2Marker) ).center;

		this._P0 = data.P0Marker instanceof THREE.Vector3
			? data.P0Marker.clone()
			: Util.getBoundingSphere( this.getObjGeometry(data.P0Marker) ).center;

		this._P0BoneIndex = this.chains.mesh.skeleton.bones.findIndex(b => b.name == data.upperBone);
		this._P2BoneIndex = this.chains.mesh.skeleton.bones.findIndex(b => b.name == data.lowerBone);

		if (this._P0BoneIndex === -1 || this._P2BoneIndex === -1)
			Report.warn("bones not found", `${this} ${this._P0BoneIndex} ${this._P2BoneIndex}`);


		if (data.type == 'rope') {

			console.assert(data.ropeRadius);
			console.assert(data.ropeHeight);
			console.assert(data.ropeNlements >= 2);

			this._rollThickness = data.ropeRadius;
			this._elemLength = ( data.ropeHeight / (data.ropeNlements - 1) );

		} else {

			console.assert(data.rMajMax && data.rMajMin && data.rMin);

			this._rollThickness = data.rMajMin * Math.SQRT1_2 + data.rMin;
			this._elemLength = 2 * (data.rMajMax - data.rMin);
		}


		if ( this.isNonCircular() ) {

			//if (this.data.rRollInner)
			//	Report.warn("nonCircular: rRollInner is unused", `${this}`);

			this._L = this.data.nonCircular.cHE.getCurveLength();

			this._cosGamma = Math.sqrt( 1 - Math.pow(this._rollThickness / this._L, 2) );

			this._turnWidth = 2 * this._rollThickness / this._cosGamma + data.turnSpacing;

			// unused in nonCircular
			//this._theta = 2 * Math.atan2(0.5 * this._elemLength * this._cosGamma, this._rRoll);

			// account cosGamma?
			this._elemWidth = this._turnWidth * this._elemLength / this._L;

			this._dTotal = data.nElements * this._elemLength;

			this._k = this._L / this._turnWidth;

		} else {

			this._rRoll = data.rRollInner + this._rollThickness;

			this._cosGamma = Math.sqrt( 1 - Math.pow(this._rollThickness / (Math.PI * this._rRoll), 2) );

			this._turnWidth = 2 * this._rollThickness / this._cosGamma + data.turnSpacing;

			this._theta = 2 * Math.atan2(0.5 * this._elemLength * this._cosGamma, this._rRoll);


			this._elemWidth = this._turnWidth * this._theta / (2 * Math.PI);

			this._dTotal = data.nElements * this._elemLength;

			this._k = this._elemLength / this._elemWidth;
		}

		console.assert(this._dTotal > 0 && this._k > 0);


		this.initCylinder();

		this.updateInvariableUniformData();
	},



	initCylinder() {

		var geometry = this.getObjGeometry(this.data.cylinderMarker);

		var axisPoints = this._axisPoints = this.getVertexPositions_byNeighborCount(geometry, 8);

		if (axisPoints.length !== 2)
			Report.warn("axisPoints.length", `${this} l=${axisPoints.length}`);

		// ._axisPoints: order depends on authoring tool (TODO)

		this._axisSegment = new THREE.Line3( axisPoints[0], axisPoints[1] );

		var t = this._axisSegment.closestPointToPointParameter(this._P0, false);

		if (t < 0 || t > 1) {
			Report.warn("P0 not aligned w/ axisSegment", `${this}`);
			t = Util.clamp(t, 0, 1);
		}

		// P0 -> more distant end
		if (t > 0.5) {
			axisPoints = [ axisPoints[1], axisPoints[0] ];
			this._axisSegment = new THREE.Line3( axisPoints[0], axisPoints[1] );
		}

		this._axisV = this._axisSegment.delta( new THREE.Vector3 ).normalize();
		this._Uc = this._axisSegment.closestPointToPoint( this._P0, false, new THREE.Vector3 );


		this._localToWorld_Base = new THREE.Matrix4().makeBasis(

			Item.axisY.clone().cross( this._axisV ), // (Y) X (Z) = (X)
			Item.axisY,
			this._axisV

		).setPosition( this._Uc );


		//
		// Project given vector 'v' onto the plane containing origin,
		// to which 'axis' is plane normal. Normalize the result.
		//
		var projectNormalizeVector = (v, axis) => v.addScaledVector( axis, -axis.dot(v) ).normalize();

		var localX = Item.axisY.clone().cross( this._axisV );

		var baseRotationAngle = localX.angleSignedTo(
			this._axisV,
			projectNormalizeVector( this._v.subVectors(this._P0, this._Uc), this._axisV )
		);


		if ( this.isNonCircular() ) {

			this._rotateOffset = this.data.nonCircular.cHE.getLengthByCentralAngle(
				baseRotationAngle, -this.data.isCW_sgn ); // fn.accepts CW in LH basis

			this._rolledTilt = new THREE.Matrix4().makeRotationX(
				this.data.isCW_sgn * Math.atan2(this._elemWidth, this._elemLength)
			);

			if (this.data.isCW_sgn > 0)
				this._rolledTilt.multiply( new THREE.Matrix4().makeRotationZ(Math.PI) );

			return;
		}

		//  *** CIRCULAR ***

		this._rotateOffset = baseRotationAngle;

		// 2PI/theta: elems.per turn
		var elemRotXAngle = Math.atan2(this._turnWidth, this._elemLength * (2 * Math.PI / this._theta) );

		this._rolledTilt = new THREE.Matrix4().makeRotationX( this.data.isCW_sgn * elemRotXAngle );

		if (this.data.isCW_sgn > 0)
			this._rolledTilt.multiply( new THREE.Matrix4().makeRotationZ(Math.PI) );

		this._rolledTilt.setPosition(this._rRoll, 0, 0);
	},



	updateInvariableUniformData() {

		var offset = 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.n;
		var array = this.chains._uMatrixArray;

		if ( this.isNonCircular() ) {

			// #define CHAIN_IS_HYPER			chainData1[2].y
			array[ offset + 64 + 8 + 1 ] = 1;

			// #define CHAIN_L					chainData2[1].z
			array[ offset + 80 + 4 + 2 ] = this._L;

			// #define CHAIN_NON_CIRCULAR_ID	chainData2[2].y
			array[ offset + 80 + 8 + 1 ] = this.nonCircularId;
		}


		this._rolledTilt.toArray( array, offset + 32 ); // CHAIN_ROLLED_TILT

		// #define CHAIN_P2_ANGLE				u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][0].z
		array[ offset + 64 + 0 + 2 ] = this.data.P2Angle;

		// #define CHAIN_NUM_ELEMS				u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][1].y
		array[ offset + 64 + 4 + 1 ] = this.data.nElements;

		// #define CHAIN_ELEM_ROLLED_WIDTH		u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][1].z
		array[ offset + 64 + 4 + 2 ] = this._elemWidth;

		// #define CHAIN_ROLLED_ANGLE_PER_ELEM	u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][2].x
		array[ offset + 64 + 8 + 0 ] = this._theta * this.data.isCW_sgn;

		//#define CHAIN_ROTATE_OFFSET			chainData1[2].z
		array[ offset + 64 + 8 + 2 ] = this._rotateOffset;

		// #define CHAIN_ELEM_LENGTH		chainData2[1].y
		array[ offset + 80 + 4 + 1 ] = this._elemLength;

		//#define CHAIN_IS_CW_SGN		chainData2[3].y
		array[ offset + 80 + 12 + 1 ] = this.data.isCW_sgn;
	},


	updateUniformData_unrolledError() {

		var offset = 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.n;

		// #define CHAIN_NUM_HANGING			u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][0].x
		this.chains._uMatrixArray[ offset + 64 + 0 + 0 ] = this.numHanging;

		// dL < 0 would mean error for the shader.

		//#define CHAIN_DL		u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][1].x
		this.chains._uMatrixArray[ offset + 64 + 4 + 0 ] = -1;
	},


	updateUniformData_freeHanging() {

		var offset = 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.n;

		// P1, P2 are in local coords.

		var	x2 = this.P2.x,
			y2 = this.P2.y,
			z2 = this.P2.z;

		var r = this._rRoll;
		var phi1 = this.phi1;
		var phi0;
		var caseId;

		//if (x2 * x2 + y2 * y2 <= r * r) // already handled

		if (this.data.isCW_sgn > 0) {

			if (x2 > -r && y2 <= 0) { // TODO? use phi1

				caseId = 1; phi0 = -Math.PI;

			} else if (x2 >= r) {

				caseId = 2; phi0 = -Math.PI;

			} else {
				caseId = 3; phi0 = x2 <= -r ? Math.PI : Math.acos(x2 / r);
			}

		} else { // .isCW_sgn < 0

			if (x2 < r && y2 <= 0) {

				caseId = 1; phi0 = 0;

			} else if (x2 <= -r) {

				caseId = 2; phi0 = 0;

			} else {
				caseId = 3; phi0 = x2 >= r ? 0 : Math.acos(x2 / r);
			}
		}


		if ( caseId === 3 && phi0 !== (this.data.isCW_sgn > 0 ? Math.PI : 0) ) {

			// Wrong in case +-Z

			let maxRolledLen = r * Math.abs( Angle.diffInDirection(phi1, this.data.isCW_sgn, phi0) );

			console.assert( Math.abs(maxRolledLen - this.data.isCW_sgn * r * (phi0 - phi1)) < 1e-6 );

			let maxHangingLen = y2 - r * Math.abs( Math.sin(phi0) );

			console.assert(maxHangingLen >= 0);

			if (maxRolledLen + maxHangingLen <= this.dHanging + this.data.dL) {

				this.errorId = 'excessDL';

				var dHide = this.dHanging + this.data.dL - maxRolledLen;

				if (this.data.type != 'rope')
					dHide += 0.5 * this._elemLength;

				return this.updateUniformData_unrolledError();
			}
		}


		var dCurveP1_P2 = this.dHanging + this.data.dL;

		var x, y, z;
		var u, a, dFh;

		var functionOfPhi = (phi) => {

			if (phi === 0) // x/tan(0): OK; later a=0, 0*Infinity NOT OK
				phi = Number.EPSILON;

			// plain subtraction is sufficient (not crossing -PI/PI)
			dFh = dCurveP1_P2 - this.data.isCW_sgn * r * (phi - phi1);

			x = r * Math.cos(phi);
			y = r * Math.sin(phi);
			z = (this.data.nElements - dFh / this._elemLength) * this._elemWidth;

			var dy = y - y2;

			// height is greater or equal than hanging length (equal is OK: 1/Infinity = 0)
			if (Math.abs(dy / dFh) > 1) {
				return -Infinity;
			}

			// u2=0; thus u - u2 === u
			u = Util.hypot(x - x2, z - z2);

			var cosPsi = (x - x2) / u;

			a = u * -0.5 / ( Math.asinh(cosPsi / Math.tan(phi)) + Math.atanh(dy / dFh) );

			var result = dFh * dFh - dy * dy - 4 * Math.pow( a * Math.sinh(u * 0.5 / a), 2 );

			return result === result ? result : -Infinity;
		}

		// experimentally found (dL=30, r=3.9)
		var dXToRadius = Math.abs( (x - x2) / r );
		var tolerance = dXToRadius > 0.05 ? 1e-8 : dXToRadius > 1e-3 ? 1e-10 : 1e-13;

		var phi = NumericMethod.bisection(

			phi1 < phi0 ? phi1 : phi0,
			phi1 < phi0 ? phi0 : phi1,
			functionOfPhi,
			'Chain-FreeHanging-functionOfPhi',
			{
				epsilonX: tolerance,
			},
		);

		this.phi = phi;

		this.P.set(x, y, z);

		this.dHanging = dFh;
		this.numHanging = dFh / this._elemLength;

		//#define	CHAIN_NUM_HANGING			chainData1[0].x
		this.chains._uMatrixArray[ offset + 64 + 0 + 0 ] = this.numHanging;

		// Catenary params.

		var u0 = u * 0.5 - a * Math.atanh( Util.clamp( (y - y2) / dFh, -1, 1 ) );
		var y0 = y2 - a * Math.cosh(u0 / a);

		//#define CHAIN_U0				chainData2[0].x
		//#define CHAIN_Y0				chainData2[0].y
		//#define CHAIN_A				chainData2[0].z
		//#define CHAIN_INTEGRAL_AT_U2	chainData2[1].x

		this.chains._uMatrixArray[ offset + 80 + 0 + 0 ] = u0;
		this.chains._uMatrixArray[ offset + 80 + 0 + 1 ] = y0;
		this.chains._uMatrixArray[ offset + 80 + 0 + 2 ] = a;
		this.chains._uMatrixArray[ offset + 80 + 4 + 0 ] = -a * Math.sinh(u0 / a);

		// Catenary coordinates (u,y,n).

		this.psi = Math.atan2( z - z2, x - x2 );

		//#define CHAIN_HANGING_TRANSFORM		getItemDataMatrix( chainBaseOffset )
		this.catenaryToWorld
			.makeRotationY( -this.psi )
			.setPosition( x2, 0, z2 )
			.premultiply( this.localToWorld )
			.toArray( this.chains._uMatrixArray, offset );

		//#define CHAIN_PSI				chainData2[2].z
		this.chains._uMatrixArray[ offset + 80 + 8 + 2 ] = this.psi;


		if (caseId === 2) { // TODO
			this.errorId = 'case2';
		}


		var turnAngle = ( this.data.nElements - this.numHanging ) * this._theta;

		var baseCylinderRotationAngle = Item.axisX.angleSignedTo(
			Item.axisZ,
			this._v.copy( this.P ).setZ(0).normalize()
		);

		this.cylinderRotationAngle = baseCylinderRotationAngle - this._rotateOffset - this.data.isCW_sgn * turnAngle;

//console.log(this.numHanging, baseCylinderRotationAngle, this.cylinderRotationAngle);

//this.Pshow.copy( this.P ).applyMatrix4(this.localToWorld); this.Pshow.showOn(null, 0.03);
	},



	updateUniformData() {

		this.errorId = '';

		var offset = 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.n;

		this.P2BoneMatrix.fromArray( this.chains.mesh.skeleton.boneMatrices, this._P2BoneIndex * 16 );
		this.P0BoneMatrix.fromArray( this.chains.mesh.skeleton.boneMatrices, this._P0BoneIndex * 16 );

		this.localToWorld.copy( this._localToWorld_Base ).premultiply( this.P0BoneMatrix );
		this.worldToLocal.copy( this.localToWorld ).invert();

		this.localToWorld
			.toArray( this.chains._uMatrixArray, offset + 16 ); // CHAIN_ROLLED_TRANSFORM

		this.P2.copy( this._P2 ).applyMatrix4( this.P2BoneMatrix ) // world coord.
			.applyMatrix4( this.worldToLocal );

		if (Main.DEBUG >= 5) {

			console.assert( this._v.copy( this._Uc ).applyMatrix4( this.P0BoneMatrix )
				.applyMatrix4( this.worldToLocal ).length() < 1e-7 );
		}


		if ( this.isNonCircular() )
			return this.updateUniformDataNonCircular();


		//var d0 = this.P2.dot( this.axisV );
		//var d0 = this.P2.dot( Item.axisZ );
		var d0 = this.P2.z;

		//this.Paxis.copy( this.axisV ).multiplyScalar(d0);
		this.Paxis.set(0, 0, d0);

		var P2_to_Paxis = this._v.subVectors( this.Paxis, this.P2 );
		var d2x = P2_to_Paxis.length();

		var P2_isInsideCylinder = d2x <= this._rRoll;

		var alpha = Math.asin( Math.min(1, this._rRoll / d2x) );
		var d2 = d2x * Math.cos(alpha);

		// * "connection plane" is where hanging part connects w/ rolled part.
		// * connection point: 'falloff'.
		// * this.Psurface: on the plabe, closest to lBP point on surface.

		this.Psurface.copy( P2_to_Paxis )
			//.applyAxisAngle( this.axisV, this.data.isCW_sgn * alpha )
			.applyAxisAngle( Item.axisZ, this.data.isCW_sgn * alpha )
			.multiplyScalar( Math.cos(alpha) ).add( this.P2 );


		var k = this._k;
		var dTotal = this._dTotal;

		var roots = Polynomial.solveQuadraticEqn(

			k * k - 1,
			2 * k * (k * d0 - dTotal),
			Math.pow(k * d0 - dTotal, 2) - d2 * d2
		);

		// !roots: equation always has roots, incl.case where "total length is not enough"
		var d1 = roots.x1; // roots.x2 (>.x1) corresponds to d2<0

		this.dHanging = dTotal - k * (d0 + d1); // = Util.hypot(d1, d2)
		this.numHanging = this.dHanging / this._elemLength;

		//this.P1.copy( this.Psurface ).addScaledVector( this.axisV, d1 );
		//this.P1.copy( this.Psurface ).addScaledVector( Item.axisZ, d1 );
		this.P1.copy( this.Psurface );
		this.P1.z += d1;

		this.phi1 = Math.atan2( this.P1.y, this.P1.x );

		if (P2_isInsideCylinder) {

			this.errorId = 'isInside';
			return this.updateUniformData_unrolledError();
		}


		// =====================================================
		//
		// *** Free hanging

		var dL = this.data.dL;

		//#define CHAIN_DL		u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][1].x
		this.chains._uMatrixArray[ offset + 64 + 4 + 0 ] = dL;

		if (dL > 0)
			return this.updateUniformData_freeHanging();


		var turnAngle = ( this.data.nElements - this.numHanging ) * this._theta;

		var baseCylinderRotationAngle = Item.axisX.angleSignedTo(
			Item.axisZ,
			this._v.copy( this.P1 ).setZ(0).normalize()
		);

		this.cylinderRotationAngle = baseCylinderRotationAngle - this._rotateOffset - this.data.isCW_sgn * turnAngle;

		this.updateHangingTransform(); // requires P1, P2.

//this.Pshow.copy( this.P ).applyMatrix4(this.localToWorld); this.Pshow.showOn(null, 0.03);
	},



	updateCylinderUniformData() {

		var offset = 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.n;

		// #define CHAIN_CYLINDER_ROTATE_ANGLE	u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][0].y
		this.chains._uMatrixArray[ offset + 64 + 0 + 1 ] = this.cylinderRotationAngle;

		this.cylinderTransform.makeTranslation( -this._Uc.x, -this._Uc.y, -this._Uc.z );

		this.cylinderTransform.premultiply(
			this._mat4.makeRotationAxis( this._axisV, this.cylinderRotationAngle )
		);

		this.cylinderTransform.elements[12] += this._Uc.x;
		this.cylinderTransform.elements[13] += this._Uc.y;
		this.cylinderTransform.elements[14] += this._Uc.z;

		this.cylinderTransform.premultiply( this.P0BoneMatrix );

		this.cylinderTransform.toArray( this.chains._uMatrixArray, offset + 48 ); // CHAIN_CYLINDER_TRANSFORM
	},



	updateUniformDataNonCircular() {

		var offset = 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.n;

		var cHE = this.data.nonCircular.cHE;
		var cHELength = this._L;

		var tPBase = cHE.getTangentPoint( this.data.isCW_sgn, this.P2.x, this.P2.y );

		if (!tPBase)
			return Report.once(`tangent point (init): P2 is inside ${this}`);

		var L0 = cHE.getLengthByPointOnCurve( tPBase, -this.data.isCW_sgn ); // fn.takes CW in LH basis

		var zL0 = (L0 - this._rotateOffset) / cHELength * this._turnWidth;

		var P2rotated = this._Ptmp;


		var fnOfTurns = turns => {

			var fullTurns = Math.floor(turns);
			var LFullTurns = fullTurns * cHELength;
			var zFullTurns = fullTurns * this._turnWidth;

			var turnFract = turns - fullTurns;
			var rotateAngle = 2 * Math.PI * turnFract;

			// angle increases CW in right-handed basis
			P2rotated.copy( this.P2 ).rotateXY( rotateAngle * this.data.isCW_sgn );

			var tP = cHE.getTangentPoint( this.data.isCW_sgn, P2rotated.x, P2rotated.y );

			if (!tP) {
				Report.once(`tangent point (fn): P2 is inside ${this}`);
				return -1;
			}

			var L1 = cHE.getLengthByPointOnCurve( tP, -this.data.isCW_sgn );

			// Turn starts at tPBase. TODO? epsilon near L1=L0
			if (L1 >= L0)
				L1 -= L0;
			else
				L1 += (cHELength - L0);

			var zPartial = L1 / cHELength * this._turnWidth;

			this.P1.set(tP.x, tP.y, zFullTurns + zPartial + zL0);

			this.dHanging = P2rotated.distanceTo( this.P1 );

			var result = this._dTotal - this.dHanging - (L0 - this._rotateOffset + LFullTurns + L1);

			if (!Number.isFinite(result))
				Report.once(`> Infinite result`);

			return result;
		}


		var distP2Axis = Util.hypot(this.P2.x, this.P2.y);
		var minDHanging = distP2Axis - cHE.maxRadius();
		var maxTurns = (this._dTotal - (L0 - this._rotateOffset) - minDHanging) / cHELength;

		//var maxDHanging = Util.hypot3(distP2Axis + cHE.maxRadius(), cHE.maxRadius(), this.P2.z);
		//var minTurns = (this._dTotal - (L0 - this._rotateOffset) - maxDHanging) / cHELength;
		// ^correct; results are worse
		if (!Number.isFinite(maxTurns))
			Report.once(`>>> Inf. maxTurns`);

		var minTurns = 0;
		var maxTurns = Math.max(maxTurns, minTurns);
		var haveBadInterval;

		//var turns = NumericMethod.regulaFalsi(minTurns, maxTurns, fnOfTurns, 'Chain-NonCircular-fnOfTurns', {
		var turns = NumericMethod.bisection(minTurns, maxTurns, fnOfTurns, 'Chain-NonCircular-fnOfTurns', {

			//epsilonX: 1e-14, epsilonY: 1e-14,
			epsilonX: 1e-8, epsilonY: 1e-8,
			fnBadInterval: () => { haveBadInterval = true },
			debug: 1,
		});

		if (haveBadInterval)
			return Report.warn("chain endpoint is out of range", `${this}`);

		this.numHanging = this.dHanging / this._elemLength;

		var a = 2 * Math.PI * Util.fract(turns);

		this.cylinderRotationAngle = a * -this.data.isCW_sgn;

		this.P1.rotateXY( this.cylinderRotationAngle );

		var dL = this.data.dL;

		if (0 &&  dL > 0) {
			Report.once(`TODO dL > 0 currently is off`);
			dL = 0;
		}

		//#define CHAIN_DL		u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][1].x
		this.chains._uMatrixArray[ offset + 64 + 4 + 0 ] = dL;

		if (dL > 0)
			return this.updateUniformData_NonCircular_freeHanging(turns);


		this.updateHangingTransform();
	},



	updateUniformData_NonCircular_freeHanging(turns) {

		var offset = 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.n;
		var isCW_sgn = this.data.isCW_sgn;

		var baseCylinderRotationAngle = this.cylinderRotationAngle;
		var extraRotationAngle = isCW_sgn * this.data.dL; // let dL be extra rotation angle

		this.cylinderRotationAngle += extraRotationAngle;

		var cHE = this.data.nonCircular.cHE;
		var cHELength = this._L;

		// compute new P1 after extra rotation (+ adjust Z)

		var newTP = cHE.getTangentPoint_Rotated( this.cylinderRotationAngle, isCW_sgn, this.P2.x, this.P2.y );

		if (!newTP)
			return Report.once("P2 is inside after extra rotation", `${this}`);

		var LDiff = cHE.distanceAlongCurveInDirection(

			this.p1.set( this.P1.x, this.P1.y ).rotate( -baseCylinderRotationAngle ),
			this.pTmp.copy(newTP).rotate( -this.cylinderRotationAngle ),
			isCW_sgn
		);

		if (LDiff < 0) { // must not happen
			Report.warn("LDiff < 0", `${LDiff} ${this}`);
			LDiff = 0;
		}
//console.log(`this.dHanging=${this.dHanging} LDiff=${LDiff}`, this.P1.x, this.P1.y, newTP.x, newTP.y, newTP_nonRotated.x, newTP_nonRotated.y);

		// GOOD
		//console.log( this.P1.z - (this.data.nElements - this.P1.distanceTo(this.P2) / this._elemLength) * this._elemWidth);

		var zDiff = LDiff / cHELength * this._turnWidth;

		this.P1.set( newTP.x, newTP.y, this.P1.z - zDiff); // <-- P1 is on rotated
		this.p1.set( newTP.x, newTP.y );

		var L12 = this.dHanging + LDiff; // P1 - P2 after rotation

		var rollDirection = Math.sign(this.P2.x - newTP.x); // -1: forward (increase rolled length)
//console.log(LDiff, L12);


		var L = this.dHanging + LDiff + 0.5 * cHELength;
		var LcFullTurns = Math.floor(extraRotationAngle / (2 * Math.PI)) * cHELength;


		var x, y, z;
		var u, a, Lc;
		var atanh_y_Lc;
		var data;

		var functionOfLr = (Lr) => {

			if (rollDirection === 1) {

				Lc = L - Lr + LcFullTurns; //TODO

				data = cHE.getPointDataByDistanceOnCurveFromPoint_Rotated(
					this.cylinderRotationAngle, this.p1, 0.5 * cHELength - Lr, isCW_sgn);
			// TODO ^simplification: loop invariable length to p1

			} else {

				Lc = L12 - Lr + LcFullTurns;

				data = cHE.getPointDataByDistanceOnCurveFromPoint_Rotated(
					this.cylinderRotationAngle, this.p1, Lr, -isCW_sgn);
			}

			x = data.p.x;
			y = data.p.y;
			z = (this.data.nElements - Lc / this._elemLength) * this._elemWidth;

			u = Util.hypot(x - this.P2.x, z - this.P2.z); // u2=0; thus u - u2 === u

			var cosPsi = (x - this.P2.x) / u;

			if (data.derivatives.x * rollDirection < 0)
				return -Infinity;

			atanh_y_Lc = Math.atanh((y - this.P2.y) / Lc);

			if (!Number.isFinite(atanh_y_Lc)) {
console.log(`atanh_y_Lc`);
				return -Infinity;
			}

			var slope = data.derivatives.y / data.derivatives.x;
			//var var1 = Math.asinh(slope * cosPsi * rollDirection) - atanh_y_Lc;
			var var1 = Math.asinh(slope * cosPsi) - atanh_y_Lc;

			a = u * 0.5 / var1;

			if (a <= 0) {
//console.log(`a=${a}`);
				//return -Infinity;
			}

			// TODO? maybe replace sinh^2 w/ sqrt & ~15 ops.
			var result = Lc * Lc - Math.pow(y - this.P2.y, 2) - 4 * Math.pow( a * Math.sinh(var1), 2 );

//console.log(result, Lc, a, u);

//console.log(data.p, `slope=${slope} u=${u} cosPsi=${cosPsi} a=${a} result=${result}`);
			return result;// === result ? result : -Infinity;
		}


		var Lr = NumericMethod.bisection(
			0, // far end
			0.5 * cHELength,
			functionOfLr,
			'Chain-NonCircular-functionOfLr',
			{ epsilonX: 1e-15 }
			//{ fa: -Infinity, epsilonX: 1e-15 }
		);

//functionOfLr();

		this.derivatives.copy(data.derivatives);
		this.P.set(x, y, z);

//console.log(Lr);

//		if (a <= 0) {
//	}

		this.dHanging = Lc;
		this.numHanging = Lc / this._elemLength;
//console.log(`NOW dHanging=${this.dHanging}`);

		this.chains._uMatrixArray[ offset + 64 + 0 + 0 ] = this.numHanging;

		// Catenary params.

		var u0 = u * 0.5 - a * atanh_y_Lc;
		var y0 = this.P2.y - a * Math.cosh(u0 / a);

		// GOOD
		//console.log(a * Math.cosh((u - u0) / a) + y0 - y, a * Math.cosh((u0) / a) + y0 - this.P2.y);

		this.chains._uMatrixArray[ offset + 80 + 0 + 0 ] = u0;
		this.chains._uMatrixArray[ offset + 80 + 0 + 1 ] = y0;
		this.chains._uMatrixArray[ offset + 80 + 0 + 2 ] = a;
		this.chains._uMatrixArray[ offset + 80 + 4 + 0 ] = -a * Math.sinh(u0 / a);

		// Catenary coordinates (u,y,n).

		this.psi = Math.atan2( z - this.P2.z, x - this.P2.x );

		this.catenaryToWorld
			.makeRotationY( -this.psi )
			.setPosition( this.P2.x, 0, this.P2.z )
			.premultiply( this.localToWorld )
			.toArray( this.chains._uMatrixArray, offset );

		//#define CHAIN_PSI				chainData2[2].z
		this.chains._uMatrixArray[ offset + 80 + 8 + 2 ] = this.psi;

	},


	updateHangingTransform() {

		var offset = 16 * ChainsCollection.DATA_MATRIX_ELEMS * this.n;

		// #define CHAIN_NUM_HANGING			u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum + 4 ][0].x
		this.chains._uMatrixArray[ offset + 64 + 0 + 0 ] = this.numHanging;

		this.psi = Math.atan2(this.P1.z - this.P2.z, this.P1.x - this.P2.x);

		//#define CHAIN_PSI				chainData2[2].z
		this.chains._uMatrixArray[ offset + 80 + 8 + 2 ] = this.psi;

		//#define CHAIN_HANGING_TRANSFORM		u_chainMatrix[ ${Chains.DATA_MATRIX_ELEMS} * chainNum ]
		this.hangingTransform

			.makeRotationZ(
				Math.atan2(
					this.P1.y - this.P2.y,
					-Util.hypot(this.P1.z - this.P2.z, this.P1.x - this.P2.x)
				) - Math.PI / 2
			).invert()

			//.premultiply( this._mat4.makeRotationY(this.psi).invert() )
			.premultiply( this._mat4.makeRotationY( -this.psi ) )

			.setPosition( this.P2 )

			.premultiply( this.localToWorld )
			.toArray( this.chains._uMatrixArray, offset );
	},


});



Object.assign( ChainsCollection, {

	CHAINS_MAX: 5,

	DATA_MATRIX_ELEMS: 6,

	START_SKIN_INDEX: 16,

	geometryCache: {},
});





export { ChainsCollection }

