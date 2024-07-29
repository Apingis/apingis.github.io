
//==========================================================================
//
//   Encodes 3 fields into IEEE 754 double.
//
// The encoded number is non-negative integer.
//  +-----------+-------+---------+
//  | Angle     | Type  | Data    |
//  +-----------+-------+---------+
//
// Angle field allows floating-point values in the range [-PI..3*PI].
//
// Effective when used in sort().
//
//==========================================================================

class AngularData {

	constructor(number) {
		this.angle = AngularData.angle(number);
		this.type = AngularData.type(number);
		this.data = AngularData.data(number);
	}

	decode(number) {
		this.angle = AngularData.angle(number);
		this.type = AngularData.type(number);
		this.data = AngularData.data(number);
		return this;
	}


	static roundAngle(angle) {
		return Math.ceil((angle + 4) * AngularData.AngleIntFactor)
			/ AngularData.AngleIntFactor - 4;
	}

	static encodeAngle(angle) {
		return Math.ceil((angle + 4) * AngularData.AngleIntFactor)
			* AngularData.AngleBaseFactor;
	}

	static encode(angle, type = 0, data) {
		return AngularData.encodeAngle(angle)
			+ type * AngularData.TypeBaseFactor
			+ ( !(data >= 0) || data > AngularData.DataValueMax
				? AngularData.DataValueMax : Math.floor(data)
			);
	}


	static angle(data) {
		//return Math.floor(data * (1 / 2** (52 - AngularData.NBitsAngle))) // slow
		//	* (1 / 2** (AngularData.NBitsAngle - 4)) - 4;
		return Math.floor(data / AngularData.AngleBaseFactor)
			/ AngularData.AngleIntFactor - 4;
	}

	static type(data) {
		return (data / AngularData.TypeBaseFactor) & ((1 << AngularData.NBitsType) - 1);
	}

	static data(data) {
		//var result = data % AngularData.TypeBaseFactor; // slow
		var result = data - Math.floor(data / AngularData.TypeBaseFactor)
			* AngularData.TypeBaseFactor;
		return result == AngularData.DataValueMax ? undefined : result;
	}

}


AngularData.NBitsAngle = 25; // 4 of them before pt.
AngularData.NBitsType = 3;

AngularData.NBitsData = 52 - AngularData.NBitsAngle - AngularData.NBitsType;
AngularData.Epsilon = 1 / 2** (AngularData.NBitsAngle - 4);
AngularData.DataValueMax = 2** AngularData.NBitsData - 1;

AngularData.AngleIntFactor = 2** (AngularData.NBitsAngle - 4);
AngularData.AngleBaseFactor = 2** (52 - AngularData.NBitsAngle);
AngularData.TypeBaseFactor = 2** AngularData.NBitsData;


Object.assign(AngularData, {

	INSERT: 1,
	REPLACE: 2,
	STATIC_POINT: 4,
	EXTRA_POINT: 5,
	DYNAMIC_POINT: 6,
	REMOVE: 7,
});


AngularData.typeStr = {

	1:	"insert",
	2:	"replace",
	4:	"static_point",
	5:	"extra_point",
	6:	"dynamic_point",
	7:	"remove",
};



export { AngularData };

