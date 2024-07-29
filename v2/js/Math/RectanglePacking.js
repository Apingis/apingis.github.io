
class RectanglePackingResult {

	constructor(width, height) { // in target units (typically pixels)
		this.width = width;
		this.height = height;
		this.pointByRect = new Map;
		this.utilization = undefined;
	}

	setResult(width, height, utilization) {
		this.width = width;
		this.height = height;
		this.utilization = utilization;
	}

	add(rect, x, y) {
		this.pointByRect.set(rect, new Point(x, y));
	}

	get(rect) {
		return this.pointByRect.get(rect);
	}
}



var RectanglePacking = {};

//
// POT: Resulting rectangle must have width and height each equals to power of 2.
// These are in target units (typically pixels).
//
// Input rect.{width|height} is typically specified in other units,
// resolution multiplier (e.g. px/m) applies.
//
// Spacing is in target units.
//
RectanglePacking.packFFDH_POT = function(rects, resolution = 1.00, spacing = 2) {

	var ceilPowerOf2 = x => Math.pow(2, Math.ceil(Math.log2(x)));

	if (rects.length === 0)
		return;

	var area = this.area(rects);
	if ( !(area > 0) )
		return;

	this.sortByHeightDesc(rects);

	// Determine width of resulting rectangle.
	var totalWidth = ceilPowerOf2(resolution * Math.max(this.maxWidth(rects), Math.sqrt(area)));

	var result = new RectanglePackingResult(totalWidth);

	var levelMax = -1,
		levelY = [],
		heightAtLevelMax,
		levelWidth = []; // Width occupied on each level.

	NEXT_RECT: 
	for (let i = 0; i < rects.length; i++) {
		let rect = rects[i],
			rectWidth = resolution * rect.width;

		for (let j = 0; j <= levelMax; j++) {

			if (levelWidth[j] + spacing + rectWidth > totalWidth)
				continue;

			result.add(rect, levelWidth[j] + spacing, levelY[j]); // Rect fits on level j.

			levelWidth[j] += spacing + rectWidth;

			continue NEXT_RECT;
		}

		levelMax ++; // Create new level & place the item to the left.
		levelY[levelMax] = levelMax === 0 ? 0
			: levelY[levelMax - 1] + heightAtLevelMax + spacing;

		heightAtLevelMax = resolution * rect.height;
		levelWidth[levelMax] = rectWidth;

		result.add(rect, 0, levelY[levelMax]);
	}

	var totalHeight = ceilPowerOf2(levelY[levelMax] + heightAtLevelMax);

	if (levelMax === 0) { // Few things on 1 level.
		while (levelWidth[0] <= totalWidth / 2)
			totalWidth /= 2;
	}

	result.setResult(totalWidth, totalHeight, resolution **2 * area / (totalWidth * totalHeight));
	return result;
}


RectanglePacking.sortByHeightDesc = function(rects) {
	rects.sort((a, b) => b.height - a.height);
}


RectanglePacking.area = function(rects) {

	var area = 0;

	for (let i = 0; i < rects.length; i++) {
		let width = rects[i].width,
			height = rects[i].height;

		if ( !(width > 0 && height > 0) ) {
			console.error(`rect[${i}] width=${width} height=${height}`);
			return -Infinity;
		}

		area += rects[i].width * rects[i].height;
	}

	return area;
}


RectanglePacking.maxWidth = function(rects) {

	var width = -Infinity;

	for (let i = 0; i < rects.length; i++)
		width = Math.max(width, rects[i].width);

	return width;
}



export { RectanglePacking };

