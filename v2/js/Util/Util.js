
var Util = {

	mat4RotationX90: new THREE.Matrix4().makeRotationX(Math.PI / 2),
	mat4RotationY90: new THREE.Matrix4().makeRotationY(Math.PI / 2),

	_mat4: new THREE.Matrix4,
	_mat3: new THREE.Matrix3,
	_v: new THREE.Vector3,
	_v1: new THREE.Vector3,
	_v2: new THREE.Vector3,
	_v3: new THREE.Vector3,
	_v4: new THREE.Vector3,

	_sphere: new THREE.Sphere,
	_line3: new THREE.Line3,
};


Util.fract = function(a) { return a - Math.floor(a); } // always return positive

// return min on NaN/undef/etc, null converts to 0
Util.clamp = (t, min = 0, max = 1) => t >= max ? max : t > min ? t : min;

Util.lerp = function(start, end, t) { return (1 - t) * start + t * end; }

Util.hypotSq = function(a, b) { return a * a + b * b; }

Util.hypot = function(a, b) { return Math.sqrt(a * a + b * b); }

Util.hypotSq3 = function(a, b, c) { return a * a + b * b + c * c; }

Util.hypot3 = function(a, b, c) { return Math.sqrt(a * a + b * b + c * c); }


Util.modulo = (x, n) => x - n * Math.floor(x / n);

Util.Semicubic = x => x < 0.5 ? 2.828427125 * x * x * Math.sqrt(x)
	: 1 - 2.828427125 * (x = 1 - x) * x * Math.sqrt(x);


Util.gamma = (z) => { // z! = Gamma(z+1)

	if (Number.isInteger(z)) {

		if (z <= 0) {
			Report.warn("gamma", `arg=${z}`);
			return z % 2 ? -Infinity : Infinity;
		}

		var result = Polynomial.factorial(z - 1);

		if ( !(result > 0) ) {
			Report.warn("gamma", `arg=${z}`);
			return Infinity;
		}

		return result;
	}

	if (z < 0.5) // Reflection formula
		return Math.PI / ( Math.sin(Math.PI * z) * Util.gamma(1 - z) );

	z -= 1;

	var g = 8;
	var p = Util.gamma.p;

	var x = p[0];

	for (let i = 1, len = p.length; i < len; i++)
		x += p[i] / (z + i);

	var t = z + g + 0.5;

	return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}


Util.gamma.p = [
    0.9999999999999999298,
    1975.3739023578852322,
    -4397.3823927922428918,
    3462.6328459862717019,
    -1156.9851431631167820,
    154.53815050252775060,
    -6.2536716123689161798,
    0.034642762454736807441,
    -7.4776171974442977377e-7,
    6.3041253821852264261e-8,
    -2.7405717035683877489e-8,
    4.0486948817567609101e-9
];



Util.addConstants = (obj, props) => {

	var arg = { value: null, enumerable: true };

	Object.keys(props).forEach(key => {

		if (!props.hasOwnProperty(key))
			return;

		if (obj.hasOwnProperty(key)) {
			console.error(`${obj.constructor.name}[ ${key} ] exists`);
			return;
		}

		arg.value = props[key];
		Object.defineProperty(obj, key, arg);
	});
}


Util.deepFreeze = (obj, levelMax = 5, level = 0) => {

	Object.seal(Object.freeze(obj));

	if (level === levelMax)
		return;

	for (let key in obj) {

		if (!obj.hasOwnProperty(key))
			continue;

		if ('get' in Object.getOwnPropertyDescriptor(obj, key))
			continue;

		let elem = obj[key];

		if (Array.isArray(elem) || Util.isObject(elem))
			Util.deepFreeze(elem, levelMax, level + 1);
	}

	return obj;
}


Util.deepSearch = (obj, argObj, levelMax = 5, level = 0, data = { found: false, stack: [] }) => {

	if (obj === argObj) {
		data.found = true;
		return;
	}

	if (level === levelMax)
		return;

	for (let key in obj) {

		if (!obj.hasOwnProperty(key))
			continue;

		let elem = obj[key];

		if (Array.isArray(elem) || Util.isObject(elem))
			Util.deepSearch(elem, argObj, levelMax, level + 1, data);

		if (data.found) {
			data.stack.push(key);
			break;
		}
	}

	if (level === 0)
		console.warn(`deepSearch:`, data.stack);
}


Util.forEachKey = function(obj, fn) {
	for (let key in obj)
		fn(obj[key], key);
}


Util.isObject = function(obj) {
	return obj && Object.prototype.toString.call(obj) === '[object Object]';
}

Util.isString = function(x) {
	return Object.prototype.toString.call(x) === "[object String]";
}


Util.toNBitsAfterPoint = function(number, nBits) {
	return Math.floor(number * (1 << nBits)) / (1 << nBits);
}

Util.toNBitsAfterPointCeil = function(number, nBits) {
	return Math.ceil(number * (1 << nBits)) / (1 << nBits);
}

Util.toNBitsAfterPointUnsigned = function(number, nBits) {
	return Math.floor(Math.abs(number) * (1 << nBits)) / (1 << nBits);
}


Util._matrix4ArrayToArrayTight = (te, srcOffset, array, offset) => {

	array[ offset ] = te[ srcOffset ];
	array[ offset + 1 ] = te[ srcOffset + 1 ];
	array[ offset + 2 ] = te[ srcOffset + 2 ];

	array[ offset + 3 ] = te[ srcOffset + 4 ];
	array[ offset + 4 ] = te[ srcOffset + 5 ];
	array[ offset + 5 ] = te[ srcOffset + 6 ];

	array[ offset + 6 ] = te[ srcOffset + 8 ];
	array[ offset + 7 ] = te[ srcOffset + 9 ];
	array[ offset + 8 ] = te[ srcOffset + 10 ];

	array[ offset + 9 ] = te[ srcOffset + 12 ];
	array[ offset + 10 ] = te[ srcOffset + 13 ];
	array[ offset + 11 ] = te[ srcOffset + 14 ];
}


Util.mat4ToArrayTight = (matrix4, array, offset = 0) => {

	Util._matrix4ArrayToArrayTight( matrix4.elements, 0, array, offset );
}


Util.arrayMatrix4ToArrayTight = (srcArray, srcOffset, array, offset = 0, cntMatrices) => {

	var cntMatricesCopied = 0;

	for (let i = srcOffset, length = srcArray.length; i < length; i += 16) {

		Util._matrix4ArrayToArrayTight( srcArray, i, array, offset );

		if (cntMatrices !== undefined) {

			if (++ cntMatricesCopied >= cntMatrices)
				break;
		}

		offset += 12;
	}
}


// =================== App. Specific ============================

Util.fround = (n, factor = 1e6) => {

	if (factor < 10)
		factor = 10 **factor;

	return Math.floor(n * factor + 0.5) / factor;
}


Util.froundCoins = n => Util.fround(n, 1e2);

Util.froundVolume = n => Util.fround(n, 1e3);

Util.froundMass = n => Util.fround(n, 1e1);

Util.froundT = n => Util.fround(n, 1e3);

Util.froundPos = n => Util.fround(n, 1e4);


Util.froundQuaternion = q => {
	return q.set( Util.fround(q.x), Util.fround(q.y), Util.fround(q.z), Util.fround(q.w) );
}

Util.froundCircle = c => {
	return c.set( Util.froundPos(c.x), Util.froundPos(c.y), Util.froundPos(c.radius) );
}

Util.froundPoint = p => {
	return p.set( Util.froundPos(p.x), Util.froundPos(p.y) );
}

Util.froundVector3 = v => {
	return v.set( Util.froundPos(v.x), Util.froundPos(v.y), Util.froundPos(v.z) );
}


Util.addFroundQuaternion = (obj, q) => {

	if (q) {
		obj.qx = Util.fround(q.x);
		obj.qy = Util.fround(q.y);
		obj.qz = Util.fround(q.z);
		obj.qw = Util.fround(q.w);
	}
};


Util.toStr = (num, afterPt) => {

	if (num === undefined)
		return "undef";

	if (num === null)
		return "null";

	var str;

	if (afterPt === undefined)
		str = !isFinite(num) ? `${num}`
			: Math.abs(num) > 1 ? num.toFixed(2)
			: Math.abs(num) > 0.1 ? num.toFixed(3)
			: Math.abs(num) > 0.01 ? num.toFixed(4)
			: num.toFixed(5);

	else
		str = !isFinite(num) ? `${num}`
			: num.toFixed(afterPt);

	str = str.replace(/0+$/, "");
	str = str.replace(/\.$/, "");

	return str;
}


Util.getByteLength = (str) => { // returns the byte length of an utf8 string

	var s = str.length;

	for (var i = str.length - 1; i >= 0; i--) {

		var code = str.charCodeAt(i);

		if (code > 0x7f && code <= 0x7ff) s++;
		else if (code > 0x7ff && code <= 0xffff) s += 2;

		if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
	}

	return s;
}


Util.checkCoins = n => {

	if (Number.isFinite(n) && n >= 0)
		return true;

	Report.warn("bad amount of coins", `n=${n}`);
}


Util.checkCrystals = n => {

	if (Number.isInteger(n) && n >= 0)
		return true;

	Report.warn("bad amount of crystals", `n=${n}`);
}


Util.formatInt2 = n => {

	n = Math.floor(n);

	return n >= 10 ? n.toString() : "0" + n;
}


Util.formatTime = (t, withSeconds = t < 86400) => {

	if (typeof t != "number" || t !== t)
		return '[...]';

	if (t == Infinity)
		return 'Infinity';

	var res = '';

	if (t >= 86400) {
		res += Util.formatInt2(t / 86400) + "d ";
		t %= 86400;
	}

	if (t >= 3600) {
		res += Util.formatInt2(t / 3600) + ":";
		t %= 3600;

	} else if (!withSeconds)
		res += "0:";

	res += Util.formatInt2(t / 60);

	if (withSeconds)
		res += ":" + Util.formatInt2(t % 60);

	return res;
}


Util.formatPointLocation = p => {

	console.assert(p instanceof Point);

	return `(${p.x.toFixed(0)}, ${p.y.toFixed(0)})`;
}


Util.formatThousands = str => {

	if (typeof str == "string") {

	} else if (typeof str == "number") {
		str = str + "";

	} else {
		Report.warn("bad arg", `${typeof str}`);
		return "";
	}
	
	for (let i = 0; i < 3; i++)
		str = str.replace(/^(\d+)(\d\d\d)(,|.|$)/, "$1,$2$3");

	return str;
}


Util.format = (num = 0, afterPoint = 2, allFixed = true) => {

	if (typeof num != "number") {

		Report.warn("not a number", num);
		return "";
	}

	var str = Util.formatThousands( num.toFixed(afterPoint) );

	if (allFixed !== true)
		str = str.replace(/\.?0+$/, "");

	return str;
}


Util.formatVolume = n => Util.format(n, 3, false);

Util.formatMass = n => Util.format(n, 1, false);

Util.formatHeight = n => Util.format(n, n >= 100 ? 0 : 1, false);


Util.formatCoins = n => {

	if (!Util.checkCoins(n))
		n = 0;

	if (n >= 100 && n === Math.floor(n))
		return Util.formatThousands(n);

	return n === 0 ? "0" :
		Util.format(n, 2, true);
}


Util.formatCrystals = n => {

	if (!Util.checkCrystals(n))
		n = 0;

	return Util.formatThousands(n);
}


// ======================================================


Util.STR64 = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";


Util.encodeIntIntoChar = (int) => {

	int = Math.floor(int);
	console.assert(int >= 0 && int <= 63);

	return Util.STR64[ Util.clamp(int, 0, 63) ];
}


Util.encodeIntIntoStr = (int, n) => {

	var str = "";

	while (n > 0) {

		str += Util.STR64[ int & 63 ];
		int >>>= 6;
		n --;
	}

	return str;
}


Util.isValidChar_Str64 = (str, i) => {

	var int = str.charCodeAt(i);

	if (int >= 65) {

		if (int <= 90 || int >= 97 && int <= 122)
			return true;

	} else if (int >= 46 && int <= 57)
		return true;
}


// Return defaultValue on out-of-string or bad char
Util.intFromChar = (str, i, defaultValue) => {

	var int = str.charCodeAt(i);
	var v;

	if (int >= 65) {

		if (int <= 90)
			v = int - 63;
		else if (int >= 97 && int <= 122)
			v = int - 69;

	} else if (int >= 46) {

		if (int <= 47)
			v = int - 46;
		else if (int <= 57)
			v = int + 6;
	}

	if (v === undefined) {
		Report.warn("bad char", `i=${i} int=${int}`);
		v = defaultValue;
	}

	return v;
}


Util.intFromStr = (str, i, n) => {

	var	int = 0,
		shift = 0;

	while (1) {

		int += Util.intFromChar(str, i++) << shift;

		if (--n === 0)
			return int;

		shift += 6;
	}
}


// ======================================================
/*
Util.isValidIP = ip => { // Number.parseInt("0255")? Number.parseInt("02bbb55")

	if (typeof ip != "string" || ip.length > 15 || ip.length < 7)
		return;

	var numbers = ip.split(".");

	for (let i = 0; i < 4; i++) {

		let n = Number.parseInt(numbers[i]);
		if ( !(n >= 0 && n <= 255) )
			return;
	}

	return true;
}
*/

Util.strIPtoNumber = ip => { // return undef. on error

	if (typeof ip != "string" || ip.length > 15 || ip.length < 7)
		return;

	var tripletCnt = 0;
	var curDigitCnt = 0;
	var curNumber = 0;
	var resultNumber = 0;

	for (let i = 0; ; i++) {

		let d = ip.charCodeAt(i);

		if (d >= 48 && d <= 57) {

			if (++ curDigitCnt > 1) {

				if (curDigitCnt > 4 || curNumber === 0) // 00.0.0.0
					return;
			}

			curNumber = curNumber * 10 + d - 48;

		} else if (d === 46 || d !== d) {

			if (curDigitCnt === 0 || curNumber > 255 || ++ tripletCnt >= 5)
				return;

			resultNumber = resultNumber * 256 + curNumber;

			if (d !== d) {

				if (tripletCnt !== 4)
					return;

				return resultNumber;
			}

			curDigitCnt = 0;
			curNumber = 0;	
		}
	}
}


Util.numberToIPStr = n => {

	var str = "";
	var divisor = 256 * 256 * 256;

	for (let i = 0; ; i++) {

		// mb. "octet"?
		let triplet = Math.floor(n / divisor);

		str += triplet;

		if (i < 3)
			str += ".";
		else
			return str;

		n -= triplet * divisor;
		divisor /= 256;
	}
}


// ======================================================

Util.setLength = (array, len = 0) => {

	if (array.length > len)
		array.length = len;

	return array;
}


Util.nextIndex = (array, i) => ++ i >= array.length ? 0 : i;

Util.nextElement = (array, i) => array[ Util.nextIndex(array, i) ];

Util.prevIndex = (array, i) => (i <= 0 ? array.length : i) - 1;

Util.prevElement = (array, i) => array[ Util.prevIndex(array, i) ];


Util.cut = function(array, i, count = 1) {

	if (typeof i != "number" || i < 0)
		return;

	if (count === 0)
		return;

	var length = array.length;

	if (i < length - count)
		array.copyWithin(i, i + count);

	array.length = length - count;
}


Util.findAndRemoveElement = (array, fn) => {

	var i = array.findIndex(fn);

	Util.cut(array, i);
}


Util.removeElement = (array, elem) => {

	if (!array)
		return;

	var i = array.indexOf(elem);

	Util.cut(array, i);
	return i;
}


Util.removeElements = (array, elems) => {

	if (!elems)
		return;

	for (let i = 0; i < elems.length; i++)
		Util.removeElement(array, elems[i]);
}


Util.cutAndProcess = (array, startI, endI, fn) => { // array[endI] is included

	if (startI > endI) {
		Util.cutAndProcess(array, startI, array.length - 1, fn);
		Util.cutAndProcess(array, 0, endI, fn);
		return 0;
	}

	for (let i = startI; i <= endI; i++)
		fn(array[i]);

	Util.cut(array, startI, endI - startI + 1);
	return startI;
}


Util.cutAndInsert = (array, i, cntRemove, cntInsert, value1, value2) => { // "mySplice"

	console.assert(i >= 0);
	console.assert(cntInsert === 1 || cntInsert === 2);

	var	length = array.length;

	if (i > length) { // a = ['b', 'c']; a.splice(3, 0, 'd') -> Array(3) [ "b", "c", "d" ]

		//Report.warn("cutAndInsert", `i=${i} len=${length} cntRemove=${cntRemove} cntInsert=${cntInsert}`);
		i = length; 
	}

	var	diff = cntRemove - cntInsert;

	if (diff > 0) {
		Util.cut(array, i, diff);

	} else if (diff < 0 && i < length - cntRemove) {

		array[length] = 0;
		if (cntInsert === 2)
			array[length + 1] = 0;

		array.copyWithin(i + cntInsert, i);
	}

	array[i] = value1;
	if (cntInsert === 2)
		array[i + 1] = value2;
}


Util.cmpArrays = (arr1, arr2) => {

	if (arr1.length !== arr2.length)
		return;

	for (let i = 0; i < arr1.length; i++)
		if (arr1[i] !== arr2[i])
			return;

	return true;
}


Util.findMinElem = function(array, fn = el => el) {

	var	resultElem,
		min = Infinity,
		length = array.length;

	for (let i = 0; i < length; i++) {

		let elem = array[i],
			val = fn(elem);

		if (val < min) {
			min = val;
			resultElem = elem;
		}
	}

	return resultElem;
}


Util._sortedIndices = [];

Util.getSortedIndices = function(array, nElemsPerItem, fn = (a, b) => a - b) {

	var n = Math.floor(array.length / nElemsPerItem);
	var indices = Util.setLength( Util._sortedIndices, n);

	for (let i = 0; i < n; i++)
		indices[i] = i * nElemsPerItem;

	indices.sort( (ia, ib) => fn(array[ia], array[ib], ia, ib, array) );

	return indices;
}


Util._mapStatic = [];

Util.mapStatic = function(array, fn) {

	var	length = array.length;
	var	result = Util._mapStatic;

//!
	if (result.length > length)
		result.length = length;

	for (let i = 0; i < length; i++)
		result[i] = fn(array[i], i);

	return result;
}


Util.mapInPlace = (array, fn) => {

	var length = array.length;

	for (let i = 0; i < length; i++)
		array[i] = fn(array[i]);

	return array;
}


Util.filterInPlace = (array, fn) => {

	var cnt = 0;
	var i;

	for (i = 0; i < array.length; i++) { // array.length is variable

		let res = fn(array[i]);

		if (!res) {
			cnt ++;

		} else if (cnt !== 0) {
			Util.cut(array, i - cnt, cnt);
			i = i - cnt - 1;
			cnt = 0;
		}
	}

	if (cnt !== 0)
		Util.cut(array, i - cnt, cnt);

	return array;
}


// ==========================================================================

Util.bsearchEq = function(array, value) {

	if (!array)
		return false;

	return value === array[ Util.bsearchGTE(array, value) ];
}

// Assuming array is sorted in ascending order; return index of the 1st element
// which is greater than or equals to the supplied value,
// or array.length if all elements are less than the value.
Util.bsearchGTE = function(array, value) {

	var endIndex = array.length - 1;
	if (endIndex == -1)
		return 0;

	var startIndex = 0,
		resultIndex = endIndex + 1;

	while (startIndex <= endIndex) {
		let curIndex = (startIndex + endIndex) >> 1;

		if (value > array[curIndex]) {
			startIndex = curIndex + 1;

		} else {
			resultIndex = curIndex;
			endIndex = curIndex - 1;
		}
	}
	return resultIndex;
}

// Assuming array is sorted in ascending order; return index of the 1st element
// which is greater than the supplied value,
// or array.length if all elements are less than the value.
// Returns 0 (==array.length) on zero-length array.
// Returns 0 if all elements are greater than or equal to the value.
//
Util.bsearchGT = function(array, value) {

	var endIndex = array.length - 1;
	if (endIndex == -1)
		return 0;

	var startIndex = 0,
		resultIndex = endIndex + 1;

	while (startIndex <= endIndex) {
		let curIndex = (startIndex + endIndex) >> 1;

		if (value >= array[curIndex]) {
			startIndex = curIndex + 1;

		} else {
			resultIndex = curIndex;
			endIndex = curIndex - 1;
		}
	}
	return resultIndex;
}


Util.bsearch = function(array, fn, startIndex = 0, endIndex = array.length - 1) {

	if (endIndex === -1)
		return -1;

	var resultIndex = -1;

	var curIndex, elem, value;
	var resultElem;

	while (startIndex <= endIndex) {

		curIndex = (startIndex + endIndex) >> 1;
		elem = array[curIndex];
		value = fn(elem);
//console.log(`bsearch i=${curIndex} v=${value}`);

		if (value > 0) {
			startIndex = curIndex + 1;

		} else if (value < 0) {
			resultIndex = curIndex;
			endIndex = curIndex - 1;

		} else
			return curIndex;
	}

	return resultIndex;
}


Util.pushUnique = (arr1, arr2) => {

	for (let i = 0; i < arr2.length; i++)
		if (arr1.indexOf(arr2[i]) === -1)
			arr1.push(arr2[i]);
}


Util.arrayDiff = (arr1, arr2, result = []) => { // what's in arr1 and not in arr2

	if (result.length !== 0)
		result.length = 0;

	for (let i = 0; i < arr1.length; i++)
		if (arr2.indexOf(arr1[i]) === -1)
			result.push(arr1[i]);

	return result;
}


Util._indexRange = { start: 0, end: 0 };

// Return 1st range [start,end] of indexes where valueFn converts to true
Util.getIndexRange = (array, valueFn) => {

	var lastIndex = array.length - 1;
	if (lastIndex === -1)
		return;

	var value = valueFn(array[lastIndex]);

	if (lastIndex === 0) {
		if (value)
			return getRange(0, 0);
		else
			return;
	}

	var startI, endI;

	for (let i = 0; i <= lastIndex; i++) {

		let nextValue = valueFn(array[i]);

		if (!value) {
			if (nextValue) {
				startI = i;
				if (endI !== undefined)
					break;
			}

		} else if (!nextValue) {
			endI = i !== 0 ? i - 1 : lastIndex;
			if (startI !== undefined)
				break;
		}

		value = nextValue;
	}

	if (startI === undefined)
		return;

	return getRange(startI, endI);


	function getRange(startI, endI) {
		var range = Util._indexRange;
		range.start = startI;
		range.end = endI;
		return range;
	}
}



Util._processFalseRangesTmpArray = [];

// processFn is called on each range.
// Returns true if at least 1 range processed.
Util.processFalseRanges = (array, fn, processFn, callbackOnFullRange) => {

	if (fn) {

		let tmpArray = Util._processFalseRangesTmpArray;

		for (let i = 0; i < array.length; i++)
			tmpArray[i] = fn( array[i] );

		tmpArray.length = array.length;

		return Util.processFalseRanges(tmpArray, null, processFn, callbackOnFullRange);
	}


	var range1_startI;

	var prevValue = array[array.length - 1];

	for (let i = 0; i < array.length; i++) {

		if (prevValue && !array[i]) { // false range start
			range1_startI = i;
			break;
		}

		prevValue = array[i];
	}

	if (range1_startI === undefined) {

		if (array[0])
			return;

		if (callbackOnFullRange)
			callbackOnFullRange();
		else
			processFn(0, array.length - 1);

		return true;
	}


	var rangeStartI = range1_startI;
	//var cntRanges = 0;
	var i = range1_startI + 1;

	while (1) {

		for ( ; i !== range1_startI; i = Util.nextIndex(array, i) )

			if (array[i]) { // false range ends on previous array element
				//cntRanges ++;
				processFn(rangeStartI, Util.prevIndex(array, i));
				break;
			}

		if (i === range1_startI)
			break;

		for ( ; i !== range1_startI; i = Util.nextIndex(array, i) )

			if (!array[i]) {
				rangeStartI = i;
				break;
			}

		if (i === range1_startI)
			break;
	}

	return true;
}



Util.processArray = (array, startI, count, fn) => {

	var lastIndex = array.length - 1;

	if (startI > lastIndex || startI < 0 || count > lastIndex + 1 || count < 0) {
		console.error(`bad args startI=${startI}, count=${count}, lastIndex=${lastIndex}`);
		return;
	}

	for (let i = startI; count > 0; count--) {
		fn(array[i], i);
		i = i === lastIndex ? 0 : i + 1;
	}
}


Util.filterAndMap = (array, fn) => {

	var length = array.length;
	var result = [];

	for (let i = 0; i < length; i++) {

		let res = fn(array[i]);
		res && result.push(res);
	}

	return result;
}


// ======================================================

// ======================================================

Util.strToUint32 = function(str) {

	var result = 0;

	for (let i = 0; i < str.length; i++)
		result += str.charCodeAt(i) << ((i & 3) * 8);

	return result >>> 0;
}


// step 1e7
// 3950473877, 2093660654, 2838647141, 440893753
// 2351044629, 1312581286, 1998882045, 430877740
// 4015766933, 3295300345, 2121544479, 270407358
// 455369493, 3922520228, 1260608993, 198730496
// 360450197, 2433522693, 1136435704, 57741341
// 3831672341, 21366644, 1922564040, 691617317
//
Util.SeedablePRNG = function(x, y, z, c) {
	this.set(x, y, z, c);
}


Object.assign( Util.SeedablePRNG.prototype, {

	set(x, y, z, c) {

		this.x = (x || 0) ^ 123456789;
		this.y = (y || 0) ^ 362436000;
		this.z = (z || 0) ^ 521288629;
		this.c = (c || 0) ^ 7654321;

		return this;
	},


	toString() { return `[SPRNG ${this.x>>>0} ${this.y>>>0} ${this.z>>>0} ${this.c>>>0}]` },


	clone(sprng) {
		return new Util.SeedablePRNG(sprng.x, sprng.y, sprng.z, sprng.c);
	},


	copy(sprng) {

		this.x = sprng.x;
		this.y = sprng.y;
		this.z = sprng.z;
		this.c = sprng.c;

		return this;
	},


	roll(n = 3) {

		for (let i = 0; i < n - 1; i++)
			this.getUint32();

		return this;
	},


	getUint32() {

		this.x = (69069 * this.x + 12345) >>> 0;

		this.y ^= this.y << 13;
		this.y ^= this.y >>> 17;
		this.y ^= this.y << 5;
		this.y >>>= 0;

		//let t = 698769069 * this.z + this.c; // (10662<<16)+24237
		//this.c = t >> 32;
		//this.z = t;
		let zHi = (this.z >>> 16) & 0xffff;
		let zLo = this.z & 0xffff;

		let tmp = 24237 * zLo + (10662 * zLo + 24237 * zHi) * 65536 + this.c;
		this.z = tmp >>> 0;
		this.c = 10662 * zHi + Math.floor(tmp / 4294967296);

		//console.log(`x: ${this.x} y: ${this.y} z: ${this.z} c: ${this.c}`);
		return (this.x + this.y + this.z) >>> 0;
	},


	random(maxVal = 1) { // [0..maxVal)
		return (this.getUint32() / 4294967296) * maxVal;
	},

	randomClosed(maxVal = 1) { // [0..maxVal]
		return (this.getUint32() / 4294967295) * maxVal;
	},

	randInt(maxVal = 4294967296) { // [0..maxVal-1]
		return Math.floor((this.getUint32() / 4294967296) * maxVal);
	},

	randAngle() { // [-PI..PI)
		return this.random(2 * Math.PI) - Math.PI;
	},


	randInterval(val1, val2) { // [val1..val2)
		return this.random(val2 - val1) + val1
	},

	randIntervalClosed(val1, val2) { return this.randomClosed(val2 - val1) + val1 },

	randIntegerIntervalClosed(start, end) { return this.randInt(end - start + 1) + start },


	randWithWeights(values, weights) {

		var equalWeights = !Array.isArray(weights);
		var totalWeight = equalWeights ? values.length : weights.reduce((sum, w) => sum + w);

		var random = this.random( totalWeight );
		var curr = 0;

		for (let i = 0; i < values.length; i++) {

			curr += equalWeights ? 1 : weights[i];

			if (random <= curr)
				return values[i];
		}

		Report.warn("inexpected", `${curr} ${random} ${weights[weights.length-1]}`);

		return values[values.length - 1];
	},


	_p: null,

	_getPoint() { return this._p || (this._p = new Point) },

	randVNorm(a1 = -Math.PI, a2 = Math.PI) { // Uniformly distributed by angle.

		var p = this._getPoint();

		var a = this.randInterval(a1, a2);

		return p.set( Math.cos(a), Math.sin(a) );
	},


	randPointInCircle(circle) { // Uniformly distributed in the area.

		var p = this._getPoint();

		for(let i = 0; ; i++) {

			p.set(
				this.randIntervalClosed(circle.x - circle.radius, circle.x + circle.radius),
				this.randIntervalClosed(circle.y - circle.radius, circle.y + circle.radius),
			);

			if (circle.containsPoint(p))
				return p;

			if (i >= 100)
				return Report.warn("randPointInCircle", `${circle}`);
		}
	},

});



Util.SpreadPRNG = function(minDiff = 0.2, x, y, z, c) {

	this.minDiff = Util.clamp(minDiff, 0, 0.35);
	this.sprng = new Util.SeedablePRNG(x, y, z, c);
	this.lastValue = -1;
}


Util.SpreadPRNG.prototype = Object.assign( Object.create( Util.SeedablePRNG.prototype ), {

	getUint32() {

		while (1) {

			let value = this.sprng.getUint32();

			if (Math.abs(value - this.lastValue) >= this.minDiff)
				return (this.lastValue = value);
		}
	},
});



// ====================================================================

Util.getObjectByNameStartsWith = (object, nameStartsWith) => {

	if ( !(object instanceof THREE.Object3D) )
		return Report.warn("not THREE.Object3D", `c=${object && object.constructor.name}`);

	if ( object.name.startsWith(nameStartsWith) )
		return object;

	for ( let i = 0, len = object.children.length; i < len; i ++ ) {

		let obj2 = Util.getObjectByNameStartsWith( object.children[i], nameStartsWith );

		if (obj2)
			return obj2;
	}
}



// ====================================================================

Util.mergeVertices = function(geometry) {

	return BufferGeometryUtils.mergeVertices(geometry);
}


Util.mergeGeometriesIfExist = function(geometries) {

	if (!Array.isArray(geometries))
		return;

	var filtered = Util.filterInPlace(geometries, g => g);

	if (filtered.length === 0)
		return;

	return Util.mergeGeometries(filtered);
}


Util.mergeGeometries = function(geometries) {

// TODO handle len=0, display ivalid arg.
	if ( !(Array.isArray(geometries) && geometries.length > 0) ) {
		console.log(geometries);
		Report.throw("bad geometries for merge");
	}

	for (let i = 0; i < geometries.length; i++) {

		let a = geometries[i].attributes;

		if (!a) {
			console.error(`i=${i} no attributes; geometries:`, geometries);
			return;
		}
// TODO
		delete a.morphTarget0;
		delete a.morphTarget1;
		delete a.morphTarget2;
		delete a.morphTarget3;
	}

	//var result = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
	var result = BufferGeometryUtils.mergeBufferGeometries(geometries);
	if (!result) {
		console.error(`geometries:`, geometries);
		return;
	}

	result.morphTargetsRelative = geometries[0].morphTargetsRelative;
	delete result.userData.mergedUserData;
	//esult.userData.merged = true;
	return result;
}


Util.applyMatrix4ToGeometry = function(geometry, matrix4) {

	geometry.applyMatrix4(matrix4);


	var morphPositionAttrib = geometry.morphAttributes.position;
	if (morphPositionAttrib) {

		var mat4 = !geometry.morphTargetsRelative ? matrix4
			: Util._mat4.extractRotation(matrix4); // TODO use mat3?

		morphPositionAttrib.forEach(attrib => attrib.applyMatrix4(mat4));
	}

	// mb.TODO morphNormal


	Wind.applyMatrix4ToAttributes(geometry, matrix4);


	LogSpec.applyMatrix4ToAttributes(geometry, matrix4);


	return geometry;
}


Util.cloneGeometry = function(geometry) {

	var g = geometry.clone();
	g.userData = {}; // Got it!

	return g;
}


Util.cloneTransformGeometry = function(mesh) {

	mesh.geometry = Util.cloneGeometry(mesh.geometry);

	Util.applyMatrix4ToGeometry(mesh.geometry, mesh.matrixWorld);

	mesh.userData.isUnique = true;
}

/*
Util.DisposeGeometry = function(geometry) { // TODO naming conv.

	if (!geometry.userData.isUnique) {
//onsole.error(`NOT disposed ${geometry.uuid}`);
		return;
	}
//console.error(`DISPOSE ${geometry.uuid}`, geometry);

	geometry.dispose();
}
*/
/*
Util.ClearGeometry = function(geometry) {

	if (!geometry.userData.isUnique) {
//console.error(`NOT cleared ${geometry.uuid}`);
		return;
	}
//console.error(`CLEAR ${geometry.uuid}`, geometry);

	geometry.dispose();

	for (let key in geometry.attributes) {
		geometry.attributes[key].array.length = 0;
		geometry.attributes[key].array = null;
	}

	if (geometry.index) {
		geometry.index.array.length = 0;
		geometry.index.array = null;
	}
}
*/

Util.convertSkinToUint8 = function(geometry, boneIndex = 0, arg) {

	if (!geometry.attributes.skinIndex)
		return Report.warn("no skin");

	var skinIndexArray = geometry.attributes.skinIndex.array;

	if (skinIndexArray instanceof Uint8Array) {
		Report.warn("already skinIndexArray instanceof Uint8Array");
		return geometry;
	}

	geometry = geometry.clone();
	delete geometry.attributes.skinIndex;

	var array = new Uint8Array(skinIndexArray.length);

	array.set(skinIndexArray);

	geometry.setAttribute("skinIndex", new THREE.BufferAttribute(array, 4, false));

	return geometry;
}


Util.addSkinToGeometry = function(geometry, boneIndex = 0, arg) {

	if (!geometry)
		return;

	if (geometry.attributes.skinIndex)
		return Report.warn("Util.addSkinToGeometry: skinIndex already exists");

	var nVertices = geometry.attributes.position.array.length / 3;

	if (nVertices <= 0)
		return Report.warn("Util.addSkinToGeometry: no vertices");

	var array = !arg || !arg.useUint16 ? new Uint8Array(4 * nVertices) : new Uint16Array(4 * nVertices);

	for (let i = 0; i < 4 * nVertices; i += 4)
		array[i] = boneIndex;

	geometry.setAttribute("skinIndex", new THREE.BufferAttribute(array, 4, false));

	array = new Float32Array(4 * nVertices);

	if (!arg || !arg.fillZeroWeights)
		for (let i = 0; i < 4 * nVertices; i += 4)
			array[i] = 1.00;

	geometry.setAttribute("skinWeight", new THREE.BufferAttribute(array, 4));

	return geometry;
}


Util.removeLowWeightSkins = function(skinnedMesh, minWeight = 5e-4) {

	var skinWeights = skinnedMesh.geometry.attributes.skinWeight.array;
	var countTotal = 0,
		countZeroed = 0;

	for (let i = 0; i < skinWeights.length; i ++) {

		if (skinWeights[i] > 0) {

			countTotal ++;
			if (skinWeights[i] < minWeight) {

				skinWeights[i] = 0;
				skinnedMesh.geometry.attributes.skinIndex.array[i] = 0;
				countZeroed ++;
			}
		}
	}

	//console.log(`Zeroed ${countZeroed} weights of ${countTotal}`);
}


Util.multiplyAttribute = function(attr, mult) {

	console.assert(attr.array);
	for (let i = 0; i < attr.array.length; i++)
		attr.array[i] *= mult;
}


Util.adjustUV = function(geometry, multiplyU, addU = 0, multiplyV = 1, addV = 0) {

	var uv = geometry.attributes.uv;

	if (!uv)
		return geometry;

	for (let i = 0; i < uv.array.length; i += 2) {

		uv.array[i] = uv.array[i] * multiplyU + addU;
		uv.array[i + 1] = uv.array[i + 1] * multiplyV + addV;
	}

	return geometry;
}


Util.createGeometry = function(n) {

	var geometry = new THREE.BufferGeometry;

	geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
	geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
	geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));

	return geometry;
}


Util.addMorphPositionAttributesToGeometry = function(geometry, shapeKeyCount) {

	if (shapeKeyCount <= 0)
		return;

	var arrayLen = geometry.attributes.position.array.length;

	geometry.morphAttributes.position = [];

	for (let i = 0; i < shapeKeyCount; i++)
		geometry.morphAttributes.position[i] = new THREE.BufferAttribute(new Float32Array(arrayLen), 3);
}


//
// Create morph position attributes.
// Given is array of objects - 1 per morph attribute, w/ .origin, .matrix4
// 
Util.addMorphPositionToGeometry = function(geometry, data) {

	if (geometry.morphAttributes.position)
		Report.throw("already have morphAttributes.position", `name=${geometry.name}`);

	if (!data.origin || !Array.isArray(data.morph))
		Report.throw("bad data", JSON.stringify(data));

	var shapeKeyCount = data.morph.length;
	if (shapeKeyCount <= 0)
		return;

	Util.addMorphPositionAttributesToGeometry(geometry, shapeKeyCount);
	geometry.morphTargetsRelative = true;

	var	posArray = geometry.attributes.position.array;

	var	origin = data.origin,
		pos = Util._v1,
		targetPos = Util._v2;

	data.morph.forEach( (morphDataElem, i) => {

		var morphPosArray = geometry.morphAttributes.position[i].array;

		for (let j = 0; j < posArray.length; j += 3) {

			// vertex position relative to origin
			pos.fromArray(posArray, j).sub(origin);

			targetPos.copy(pos).applyMatrix4(morphDataElem.matrix)
				.sub(pos).toArray(morphPosArray, j);
		}
	});
}


//
// Traverses attributes.position
// Returns: indices of vertices satisfying consition (3*vI is offset in position.array)
//
Util.filterVerticesByPosition = function(geometry, filterFn) {

	var positionArray = geometry.attributes.position.array,
		position = new THREE.Vector3,
		vertices = [];

	for (let i = 0; i < positionArray.length; i += 3) {

		position.fromArray(positionArray, i);

		if (filterFn(position))
			vertices.push(i / 3);
	}

	return vertices;
}


Util.getBoundingSphere = function(geometry) {

	if (!geometry.boundingSphere)
		geometry.computeBoundingSphere();

	return geometry.boundingSphere;	
}


Util.getBoundingBox = function(geometry) {

	if (!geometry.boundingBox)
		geometry.computeBoundingBox();

	return geometry.boundingBox;	
}


Util.getSphereFromIndices = function(geometry, vertices) {

	return new THREE.Sphere().setFromPoints(
		vertices.map(vI => new THREE.Vector3().fromArray(geometry.attributes.position.array, vI * 3))
	);
}


//
// Create new geometry from given vertices contained in provided geometry.
//
/*
Util.extractGeometry = function(geomFrom, vertices) {

	console.assert(geomFrom.index && geomFrom.index.array);

	var geomTo = Util.createGeometry(vertices.length);

	var newIndices = [];

	// 1. Copy given vertices 1:1, fill in newPosition
	for (let i = 0; i < vertices.length; i++) {

		var vI = vertices[i]; // vertex #.

		newIndices[vI] = i;

		copyArrayElems(geomTo.attributes.position.array, i * 3,
			geomFrom.attributes.position.array, vI * 3, 3);

		copyArrayElems(geomTo.attributes.normal.array, i * 3,
			geomFrom.attributes.normal.array, vI * 3, 3);

		copyArrayElems(geomTo.attributes.uv.array, i * 2,
			geomFrom.attributes.uv.array, vI * 2, 2);
	}

	// 2. Index.
	var indexFrom = geomFrom.index.array,
		indexTo = [];

	for (let i = 0; i < indexFrom.length; i += 3) {

		let a = indexFrom[i],
			b = indexFrom[i + 1],
			c = indexFrom[i + 2];

		if (vertices.indexOf(a) === -1 || vertices.indexOf(b) === -1
				|| vertices.indexOf(c) === -1)
			continue;

		indexTo.push(newIndices[a], newIndices[b], newIndices[c]);
	}


	geomTo.setIndex(new THREE.Uint16BufferAttribute(new Uint16Array(indexTo), 1));

	return geomTo;


	function copyArrayElems(to, toI, from, fromI, n) {
		for (let i = 0; i < n; i++)
			to[toI + i] = from[fromI + i];
	}
}
*/
/*
Util.minDistancePlaneToGeometry = function(plane, geometry) {

	var pos = geometry.attributes.position.array;
	var v = this._v;

	var d = Infinity;

	for (let i = 0; i < pos.length; i += 3) {

		v.fromArray(pos, i);

		d = Math.min(d, plane.distanceToPoint(v));
	}

	return d;
}


Util.nearestPointToPlaneOnGeometry = function(plane, geometry) {

	var pos = geometry.attributes.position.array;
	var v = this._v;

	var minDistance = Infinity;
	var p = this._v2;

	for (let i = 0; i < pos.length; i += 3) {

		v.fromArray(pos, i);

		let d = plane.distanceToPoint(v);

		if (d < minDistance) {
			minDistance = d;
			p.copy(v);
		}
	}

	if (minDistance < Infinity)
		return p.clone();
}


Util.minDihedralAngleToGeometry = function(plane, p, axis, geometry) {

	console.assert( Math.abs(axis.dot(plane.normal)) < 1e-9 );

	var refPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(axis, p);
	//var refV = this._v3.crossVectors(plane.normal, axis);
	var refV = this._v3.crossVectors(axis, plane.normal);

	var pos = geometry.attributes.position.array;
	var v = this._v;
	var v2 = this._v2;

	var accumDot = -Infinity;

	for (let i = 0; i < pos.length; i += 3) {

		v.fromArray(pos, i);

		if (v.equals(p))
			continue;

		refPlane.projectPoint(v, v2);

		v2.sub(p).normalize();
		//v2.normalize();

		let dot = refV.dot(v2);
//console.log(dot, v2.clone(), v.clone());
		accumDot = Math.max(accumDot, dot);
	}

	return Math.acos( Util.clamp(accumDot, -1, 1) );
}
*/

Util.closestPointToPlane = function(points, plane) {

	var minDistance = Infinity;
	var closestPoint = this._v2;

	for (let i = 0; i < points.length; i++) {

		let d = plane.distanceToPoint(points[i]);

		if (d < minDistance) {
			minDistance = d;
			closestPoint.copy(points[i]);
		}
	}

	if (minDistance < Infinity)
		return closestPoint.clone();
}


Util.minDihedralAngleToPoints = function(plane, p, axis, points) {

	console.assert( Math.abs(axis.dot(plane.normal)) < 1e-9 );

	var refPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(axis, p);
	var refV = this._v3.crossVectors(axis, plane.normal);

	var v = this._v;

	var accumDot = -Infinity;

	for (let i = 0; i < points.length; i++) {

		if (points[i].equals(p))
			continue;

		refPlane.projectPoint(points[i], v);

		v.sub(p).normalize();

		let dot = refV.dot(v);

		accumDot = Math.max(accumDot, dot);
	}

	return Math.acos( Util.clamp(accumDot, -1, 1) );
}



// ======================================================

Util.WindowMonitor = function() {

	this.keys = Object.keys(window);
	this.added = [];
	this.removed = [];
}


Util.WindowMonitor.prototype.check = function(arg = "") {

	var newKeys = Object.keys(window);
	var added = Util.arrayDiff(newKeys, this.keys);
	var removed = Util.arrayDiff(this.keys, newKeys);

	if (added.length > 0 || removed.length > 0) {

		var headerStr = `WindowMonitor.check(${arg})`;

		if (added.length > 0)
			console.log(`${headerStr} +${added.length} keys`, added);

		if (removed.length > 0)
			console.log(`${headerStr} -${removed.length} keys`, removed);
	}

	this.keys = newKeys;
}



// ======================================================

Util.MixamoRig = {

	bones: [ // 22 total
		"mixamorigHips", "mixamorigSpine", "mixamorigSpine1", "mixamorigSpine2",
		"mixamorigNeck", "mixamorigHead", "mixamorigLeftShoulder", "mixamorigLeftArm",
		"mixamorigLeftForeArm", "mixamorigLeftHand", "mixamorigRightShoulder",
		"mixamorigRightArm", "mixamorigRightForeArm", "mixamorigRightHand",
		"mixamorigLeftUpLeg", "mixamorigLeftLeg", "mixamorigLeftFoot",
		"mixamorigLeftToeBase", "mixamorigRightUpLeg", "mixamorigRightLeg",
		"mixamorigRightFoot", "mixamorigRightToeBase"
	],

	bonesB: [ // 9 bottom bones
		"mixamorigHips",
		"mixamorigLeftUpLeg", "mixamorigLeftLeg", "mixamorigLeftFoot", "mixamorigLeftToeBase",
		"mixamorigRightUpLeg", "mixamorigRightLeg", "mixamorigRightFoot", "mixamorigRightToeBase"
	],

	bonesU: [ // 15 upper bones
		"mixamorigSpine", "mixamorigSpine1", "mixamorigSpine2",
		"mixamorigNeck", "mixamorigHead",
		"mixamorigLeftShoulder", "mixamorigLeftArm", "mixamorigLeftForeArm", "mixamorigLeftHand",
		"mixamorigRightShoulder", "mixamorigRightArm", "mixamorigRightForeArm", "mixamorigRightHand",
	],

};


Util.MixamoRig.restoreBones = (source, target) => {

	Util.MixamoRig.bones.forEach( name => {

		var sourceBone = source.getObjectByName(name);
		var targetBone = target.getObjectByName(name);

		if (!sourceBone || !targetBone)
			return Report.warn('bone not found', `name=${name}`);

		targetBone.position.copy( sourceBone.position );
		targetBone.quaternion.copy( sourceBone.quaternion );
	});
}


Util.MixamoRig.filterTracks = function(animation, boneNames = Util.MixamoRig.bones, inPlace = true) {

	if (!("tracks" in animation) || !Array.isArray(animation.tracks) || !animation.duration)
		return Report.warn("bad animation", animation);

	if (!Array.isArray(boneNames))
		return Report.warn(`bad boneNames`, boneNames);

	var tracks = animation.tracks;
	var newTracks = [];
	var trackCount = 0;

	for (let i = 0; i < tracks.length; i++) {

		let track = tracks[i];

		let boneName = boneNames.find(boneName => track.name.startsWith(boneName + ".") );

		if (boneName && (track.name.endsWith(".quaternion")
				|| track.name == "mixamorigHips.position") ) {

			newTracks.push(tracks[i]);
			trackCount ++;
		}
	}

	//console.warn(`"${animation.name}": filtered ${trackCount} tracks`);

	if (!inPlace)
		return newTracks;

	animation.tracks = newTracks;
}


Util.MixamoRig.scaleQuaternions = function(animation, factor, trackNames) {

	var	qStart = new THREE.Quaternion,
		qEnd = new THREE.Quaternion,
		qTarget = new THREE.Quaternion;

	trackNames.forEach(name => {

		var track = animation.tracks.find(track => track.name === name + ".quaternion");

		if (!track)
			return Report.warn("no track", `name=${name}`);

		qStart.fromArray(track.values, 0);

		for (let i = 4; i < track.values.length; i += 4) {

			qEnd.fromArray(track.values, i);
			qTarget.slerpQuaternions( qStart, qEnd, factor );
			qTarget.toArray(track.values, i);
		}
	});
}




// =================== HTTP related ========================

Util.getQueryGETParams = (str = window.location.search) => {

	var a = str.substr(1).split('&');
	if (!a)
		return {};

	var b = {};

	for (var i = 0; i < a.length; ++i) {

		let p = a[i].split('=', 2);

		if (p.length == 1)
			b[p[0]] = "";
		else
			b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
	}

	return b;
}





export { Util };

