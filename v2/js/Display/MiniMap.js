
import { Point } from '../Math/Point.js';


var MiniMap = (function() {

	var elem = {

		container: document.getElementById('minimap-container'),
		canvas1a: document.getElementById('minimap-canvas1a'),
		canvas1b: document.getElementById('minimap-canvas1b'),
		canvas2: document.getElementById('minimap-canvas2'),
		canvas3: document.getElementById('minimap-canvas3'),
		//errMsg: document.getElementById('minimap-err-msg')
	};

	var ctx1a = elem.canvas1a.getContext('2d', { alpha: false }); // static env.
	var ctx1b = elem.canvas1b.getContext('2d', { alpha: false });
	var ctx2 = elem.canvas2.getContext('2d', { alpha: true }); // dynamic/chars
	var ctx3 = elem.canvas3.getContext('2d', { alpha: true }); // camera view

	var FRAMES_REDRAW_INTERVAL = 300;
	var FRAMES_WAIT_BEFORE_REDRAW = 10;
	var DRAW_ITEMS_PER_FRAME = 100;


	var canvasWidth, canvasHeight;

	var initialized = false,
		miniMapActive = false; // initialized + enough space for show

	var area;
	var areaWidth, areaHeight;


	function init(...args) {

		[ area ] = args;
		if (!area)
			Report.throw("bad args");

		areaWidth = area.rect.width;
		areaHeight = area.rect.height;

		initialized = true;
	}



	var displayedCtx1;

	function setDisplayedCtx1(ctx) {

		elem.canvas1a.style.display = ctx === ctx1a ? "block" : "none";
		elem.canvas1b.style.display = ctx === ctx1b ? "block" : "none";

		displayedCtx1 = ctx;
	}

	setDisplayedCtx1(ctx1a);

	function getDrawCtx1() { return displayedCtx1 === ctx1a ? ctx1b : ctx1a; }

	function toggleDisplayedCtx1() { setDisplayedCtx1( getDrawCtx1() ); }


	var canvasWHRequiresUpdate = new Set;

	function setCanvasWH(ctx) {

		console.assert(ctx instanceof CanvasRenderingContext2D);

		if (!canvasWHRequiresUpdate.delete(ctx))
			return;

		ctx.canvas.width = canvasWidth;
		ctx.canvas.height = canvasHeight;
	}


	function setCanvasStyleWH(ctx) {

		ctx.canvas.style.width = canvasWidth + "px";
		ctx.canvas.style.height = canvasHeight + "px";
	}


	//function resize(width, height) {
	//	console.assert(width && height);

	function resize() { // dimensions determined by CSS

		if (!initialized)
			return Report.warn("!initialized");

		elem.container.style.display = "block";

		var width = elem.container.clientWidth;
		var height = elem.container.clientHeight;
/*
		if (Math.min(width, height) < 100) {

			elem.canvas1a.style.display = "none";
			elem.canvas1b.style.display = "none";
			elem.canvas2.style.display = "none";
			elem.canvas3.style.display = "none";
			//elem.errMsg.style.display = "block";

			miniMapActive = false;
			return;
		}
*/
		setDisplayedCtx1(displayedCtx1);
		elem.canvas2.style.display = "block";
		elem.canvas3.style.display = "block";
		//elem.errMsg.style.display = "none";

		miniMapActive = true;

		var areaAspectRatio = areaWidth / areaHeight;

		if (width / height > areaAspectRatio) {
			canvasHeight = height;
			canvasWidth = Math.ceil(height * areaAspectRatio);

		} else {
			canvasWidth = width;
			canvasHeight = Math.ceil(width / areaAspectRatio);
		}

		[ ctx1a, ctx1b, ctx2, ctx3 ].forEach(ctx => {

			canvasWHRequiresUpdate.add(ctx);
			setCanvasStyleWH(ctx);
		});


		// resize static -> start update (while on screen it remains resized canvas)
		staticLastFrame = -Infinity;
		updateStaticReset();

		update(true);
	}


	var clickData = { p: new Point, clicked: false };

	function onClick(e) {

		var p = clickData.p,
			parentEl = this.parentElement;

		var relWidth = 1 - e.layerX / canvasWidth,
			relHeight = 1 - e.layerY / canvasHeight;

		p.x = areaWidth * relWidth + area.rect.minX;
		p.y = areaHeight * relHeight + area.rect.minY;
//console.log(`click x=${p.x} y=${p.y} relWidth=${relWidth} relHeight=${relHeight}`);

		if (!area.rect.containsPoint(p))
			return Report.warn("clicked outside area.rect", `${p}`);

		clickData.clicked = true;
	}

	elem.canvas3.addEventListener('click', onClick);


	// Convert X, Y from 3D area into minimap canvas coords.
	function getX(x) {
		x -= area.rect.minX;
		return Math.floor((1 - x / areaWidth) * canvasWidth);
	}

	function getY(y) {
		y -= area.rect.minY;
		return Math.floor((1 - y / areaHeight) * canvasHeight);
	}

	
	function getWidth(x) { return Math.floor(x / areaWidth * canvasWidth); }

	function getWidthCeil(x) { return Math.ceil(x / areaWidth * canvasWidth); }

	function getHeight(y) {
		return Math.floor(y / areaHeight * canvasHeight);
	}


	// =============================================
	//
	//   Draw / Updates
	//
	// =============================================

	function update(force) {

		if (!miniMapActive)
			return;

		updateStatic();

		drawCameraView();

		if (force !== true && (Engine.frameNum & 7) !== 3)
			return;

		drawChars();
		drawPath();
	}



	var updateStaticPartNum = 0;
	var staticItems;
	var staticItemsDrawnCnt = 0;
	var staticLastFrame = 0;


	function updateStatic(force) {

		if (!miniMapActive)
			return;

		if (force) { // force: everything at once

			updateStaticReset();

			while ( !updateStaticPart() );

			staticLastFrame = Engine.frameNum;


		} else if (staticLastFrame + FRAMES_REDRAW_INTERVAL < Engine.frameNum) {

			if (updateStaticPart() === true)
				staticLastFrame = Engine.frameNum;
		}
	}


	function updateStaticReset() {

		updateStaticPartNum = 0;
		staticItems = null;
	}


	function isDisplayItem(item) {

		return !item.isRemoved() && (0
			|| item.isTree() && !item.isSmallTree() && !item.isChoppedTree()
			|| item.isBaseCenter()
			|| item.getRadius() > 5
		);
	}


	function updateStaticPart() {

		var partN = updateStaticPartNum ++;

		partN -= FRAMES_WAIT_BEFORE_REDRAW;
		if (partN < 0) // draw-when-resizing
			return;

		var ctx = getDrawCtx1();

		if (partN === 0) {

			setCanvasWH(ctx);
/*
			var pattern = ctx.createPattern(Assets.textures["ground_grass_05_"].image, "repeat");
			ctx.fillStyle = pattern;
			ctx.filter = 'brightness(70%)';
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);
			ctx.filter = '';
*/
			ctx.fillStyle = area.miniMapFillStyle;
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);


		} else if (partN === 1) {

			staticItems = area.spatialIndex.getAllCollidingItems(item => isDisplayItem(item));


		} else if (partN === 2) {

			staticItems.sort((a, b) => {

				if (a.isHole()) // holes 1st
					return -1;
				if (b.isHole())
					return 1;

				if (a.isTree()) // trees 2nd
					return -1;
				if (b.isTree())
					return 1;

				return 0;
			});

			staticItemsDrawnCnt = 0;


		} else if (staticItemsDrawnCnt >= staticItems.length) { // The last update part

			updateStaticReset();
			toggleDisplayedCtx1();

			return true;


		} else { // Regular update part (a number of items)

			updateStaticRegularPart(ctx);
		}
	}


	function updateStaticRegularPart(ctx) {

		for (let i = 0; i < DRAW_ITEMS_PER_FRAME && staticItemsDrawnCnt < staticItems.length; i++) {

			let item = staticItems[ staticItemsDrawnCnt ++ ];

			drawItem(ctx, item);
		}
	}



	function drawItem(ctx, item) {

		if (!item || !isDisplayItem(item)) // display status can change when parts run
			return;


		if (item.isTree()) {

			let	x = getX(item.position.x),
				y = getY(item.position.z),
				r = getWidthCeil(7.5);

			ctx.fillStyle = "#083600";
			ctx.beginPath();
			ctx.arc(x, y, r, 0, 2 * Math.PI);
		    ctx.fill();
			return;
		}


		item.spec.setupMMCtxPolygonDraw(ctx);

		var points;

		if ( item.isBaseCenter() ) {

			let cGroup = item.getCGroup(0);
			let polygon = cGroup && cGroup.getPolygon() || item.getPolygon(0);

			points = polygon.getEnlarged(2).points;

		} else
			points = item.getPolygon().points;


		ctx.beginPath();
		ctx.moveTo(getX(points[0]), getY(points[1]));

		for (let i = 2; i < points.length; i += 2)
			ctx.lineTo(getX(points[i]), getY(points[i + 1]));

		ctx.closePath();
		ctx.fill();
	}



	function drawChars() {

		setCanvasWH(ctx2);
		ctx2.clearRect(0, 0, canvasWidth, canvasHeight);

		ctx2.strokeStyle = "#000";

		var units = Main.getUnits();

		for (let i = 0; i < units.length; i++) {

			if ( units[i].isRobot() ) {

				drawRobotTransportFlag( units[i] );
				ctx2.fillStyle = "#ef0";

			} else
				ctx2.fillStyle = "lime";

			let x = getX( units[i].position.x );
			let y = getY( units[i].position.z );

			ctx2.beginPath();
			ctx2.arc(x, y, 2, 0, 6.28);
			ctx2.stroke(); // black
		    ctx2.fill();
		}

		//Main.getRobots().forEach(robot => drawRobotTransportFlag(robot)); // after units

		var robot = Main.selectedItem;

		if (robot && robot.isRobot())
			drawRobotTransportFlag(robot);
	}


	function drawRobotTransportFlag(robot) {

		var p = robot.getTaskTransportFlagPoint();
		if (!p)
			return;

		ctx2.strokeStyle = "#de0";
		//.lineWidth

		var len = 3;

		ctx2.beginPath();
		ctx2.moveTo( getX(p.x) - len, getY(p.y) - len );
		ctx2.lineTo( getX(p.x) + len, getY(p.y) + len );

		ctx2.moveTo( getX(p.x) + len, getY(p.y) - len );
		ctx2.lineTo( getX(p.x) - len, getY(p.y) + len );

		ctx2.stroke();
	}


	var path; // array of waypoints
	var pathColor;

	function setPath(arg, colorString = "#a03d12") {

		//if ( !(Array.isArray(arg) && arg.length >= 2 && 'x' in arg[0]) )
		//	return Report.warn("bad arg", arg);

		path = arg;
		pathColor = colorString;
	}


	function drawPath() {

		if (!path)
			return;

		ctx2.strokeStyle = pathColor;
		ctx2.lineJoin = "round";
		ctx2.beginPath();
		ctx2.moveTo(getX(path[0].x), getY(path[0].y));

		for (let i = 1; i < path.length; i++)
			ctx2.lineTo(getX(path[i].x), getY(path[i].y));

		ctx2.stroke();
	}



	function drawCameraView() {

		var ctx = ctx3;

		setCanvasWH(ctx);
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		if (!Display)
			return;

		// sector x,y is some behind camera position

		var	sector = Display.cameraView.sector,
			x = getX(Display.cameraView.position.x),
			y = getY(Display.cameraView.position.z);

		ctx.strokeStyle = "#fff";
		ctx.beginPath();

		ctx.arc(x, y, 0.75, 0, 2 * Math.PI);
		ctx.moveTo(x, y);
		ctx.arc(x, y, getWidth(sector.radius * 0.925),
			Angle.opposite(sector.right), Angle.opposite(sector.left) );

		ctx.lineTo(x, y);

		ctx.closePath();
		ctx.stroke();
	}



	return {
		get displayOption() { return "normal" },

		init, resize, updateStatic, update, clickData,
		path, setPath
	};

})();



export { MiniMap };

