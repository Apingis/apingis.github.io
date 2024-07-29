
class Hover {

	constructor(elem, options = {}, contentUpdateFn) {

		this.elem = elem;

		if (!elem)
			Report.warn("hover: no element");

		this.options = options;
		this.contentUpdateFn = contentUpdateFn;

		this.lastArg = null;
		this.domRect = null;
	}


	turnOff() { this.elem.style.display = 'none' }


	mouseMove(e, arg) {

		if (!this.elem)
			return;

		if (this.lastArg !== arg) {

			this.lastArg = arg;
			this.contentUpdateFn(arg);

			this.elem.style.display = '';

			this.domRect = this.elem.getBoundingClientRect(); // same content for same thing
		}


		var	x = e.clientX,
			y = e.clientY;

		if (this.options.position != 'toLeft')
			return Report.warn("unrecognized opts.");

		x = x - this.domRect.width - 9;

		var offY = Math.floor(this.domRect.height / 2);

		if (y - offY < 0) {
			y = 0;

		} else if (y - offY + this.domRect.height >= window.innerHeight) {
			y = window.innerHeight - this.domRect.height;

		} else
			y = y - offY;

		this.elem.style.left = x + "px";
		this.elem.style.top = y + "px";
	}


	mouseLeave(e, arg) {

		if (!this.elem)
			return;

		this.lastArg = null;

		this.elem.style.display = 'none';
	}

}




export { Hover }

