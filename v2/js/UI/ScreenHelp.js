
var ScreenHelp = {

	aspectRatio: Infinity,
	widthFractionMax: 0.4,
	hasFullHeight() { return true },
	//bgName: "screen-paper-wrinkled",
	bgName: "screen-metal011",

	checkItem(item) { return true },

	mainElem: document.querySelector("#help-main"),


	close() {
	},

	open() {
	},


	update() {
	},


	pressEsc() { UI.setScreen() },


	init() {

		this.mainElem.innerHTML = getUIElem("help-main").innerHTML;
	}

}


ScreenHelp.init();




export { ScreenHelp }

