
var Tooltip = {

	_el: document.getElementById('tooltip-main'),
	_textEl: document.getElementById('tooltip-text'),

	VERSION: 1, // 2: as in FF60

	APPEAR_DELAY: 400, // in ms; min. 1 frame
	SENSITIVITY_SQ: 36, // in px.^2

	target: null,
	visible: false,
	blocked: false,
	ptrX: 0,
	ptrY: 0,

	_moveStoppedTime: 0,
	_rect: null,


	update() { // for appearance delay

		if (this.target === null || this.visible === true || this.blocked === true)
			return;

		if (this._moveStoppedTime + this.APPEAR_DELAY < Date.now() ) {

			this.visible = true;
			this.setupContent();
			this.setupPosition();
		}
	},


	_mouseMove(e, target) {

		if (this.visible === false) {

			this.ptrX = e.clientX;
			this.ptrY = e.clientY;
			this._moveStoppedTime = Date.now();

			if (this.target === null || this.target !== target) {

				this.target = target;
			}

		} else if ( this.isMouseAway(e) ) {

			this._el.style.display = '';
			this.visible = false;

			if (this.VERSION === 1) {

				this.ptrX = e.clientX;
				this.ptrY = e.clientY;
				this._moveStoppedTime = Date.now();

			} else
				this.blocked = true;
		}
	},


	isMouseAway(e) {
		return (this.ptrX - e.clientX) **2 + (this.ptrY - e.clientY) **2 > this.SENSITIVITY_SQ;
	},


	_mouseLeave() {

		this._el.style.display = '';
		this.visible = false;
		this.blocked = false;
		this.target = null;
	},


	setupContent() {

		var key = this.target.getAttribute('tooltip') ||  this.target.id;

		if (!key) {
			console.log("tooltip: no key", this._el);
			return;
		}

		this._el.style.display = 'block';
		this._textEl.textContent = Lang.get(`tooltip-${key}`);

		this._rect = this._el.getBoundingClientRect();
	},


	setupPosition() {

		if (!this._rect)
			return;

		var	x = this.ptrX + 1;
		var y = this.ptrY - this._rect.height - 9;

		if (y < 0) {
			y = this.ptrY + 12;
			x += 10;
		}

		if (x + this._rect.width > window.innerWidth)
			x = window.innerWidth - this._rect.width;

		this._el.style.left = x + "px";
		this._el.style.top = y + "px";
	},


	setup(rootElem = document) {

		var list = Array.from( rootElem.querySelectorAll('*[tooltip]') );

		list.forEach(el => {

			el.onmousemove = (e) => Tooltip._mouseMove(e, el);
			el.onmouseleave = () => Tooltip._mouseLeave();
		});
	},


	remove(rootElem = document) {

		var list = Array.from( rootElem.querySelectorAll('*[tooltip]') );

		list.forEach(el => {

			el.onmousemove = null;
			el.onmouseleave = null;
		});
	},

}




export { Tooltip }

