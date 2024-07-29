
class CameraLocation {

	constructor(x = 234, y = 140, h = 4.5, a = 1.58) {

		this.x = x;
		this.y = y;
		this.h = h;
		this.a = a;
	}

	get facing() { console.error(`use .a`); }
	set facing(v) { console.error(`use .a`); }


	set(x, y, h, a) {

		this.x = x;
		this.y = y;
		this.h = h;
		this.a = a;

		return this;
	}


	copy(cameraLocation) {

		return this.set(

			cameraLocation.x,
			cameraLocation.y,
			cameraLocation.h,
			cameraLocation.a
		);
	}


	fromJSON(obj) {

		if (obj) {

			('x' in obj) && ( this.x = obj.x );
			('y' in obj) && ( this.y = obj.y );
			('h' in obj) && ( this.h = obj.h );
			('a' in obj) && ( this.a = obj.a );

		} else
			Report.warn("CameraLocation: no JSON");

		return this;
	}


	toJSON() {

		return {
			x: Util.froundPos(this.x),
			y: Util.froundPos(this.y),
			h: Util.froundPos(this.h),
			a: Util.froundPos(this.a),
		};
	}

}




export { CameraLocation };

