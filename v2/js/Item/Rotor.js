
import { CustomItem } from './CustomItem.js';


class Rotor extends CustomItem {

	constructor(spec) {

		super(spec);

		var rotorData = this.spec.data.rotor;

		if ( !rotorData ) {
			Report.once("no rotor data", `${this.spec}`);
			rotorData = {};
		}

		this.data.rotor = {

			speed: rotorData.speed || 0, // turns/s
			offset: rotorData.offset || 0,
			startT: rotorData.startT || 0,

			//point: rotorData.point, // rotates around origin
			axis: rotorData.axis || new THREE.Vector3(0, 1, 0),

			//_matrix: new THREE.Matrix4,
		};
	}


	getMesh() { return this.spec.getMesh() }

	getOptionUpdateIfVisible() { return true }


	setInitialRotationParams(offset = 0, speed = 0, t = Engine.time) { // w/ resetting current state

		this.data.rotor.speed = speed;
		this.data.rotor.offset = offset;
		this.data.rotor.startT = t;

		return this;
	}


	setRotationParams(speed = 0, t = Engine.time) {

		var offset = this._getRotationAngle(t);

		return this.setInitialRotationParams(offset, speed, t);
	}


	_getRotationAngle(t = Engine.time) {

		return (t - this.data.rotor.startT) * this.data.rotor.speed
			+ this.data.rotor.offset;
	}


	//
	// Item-AreaDisplay definitely requires refactoring.
	//
	getMatrixWorld() {
		return this.matrixWorld.copy( this.display.mesh.matrixWorld );
	}


	updateDisplayData(array, offset) {

		var mesh = this.display.mesh;

		mesh.matrix.makeRotationAxis( this.data.rotor.axis, this._getRotationAngle() );

		//var p = this.data.rotor.point;

		//if (p)
		//	mesh.matrix.setPosition( -p.x, -p.y, -p.z );

		this.dependencyMatrix
			&& mesh.matrix.premultiply(this.dependencyMatrix);

		mesh.matrixAutoUpdate = false; // Or updateMatrixWorld() trashes it


		if ( !this.isDependent() ) // mb. compose matrixWorld from position, quaternon
			Report.once(`Rotor: !isDependent "${this.spec.name}"`, `${this}`);


		super.updateDisplayData(array, offset);
	}

}




export { Rotor }

