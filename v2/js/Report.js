
var Report = {

	throwAbstract() { Report.throw("abstract constructor"); },

	throwStatic() { Report.throw("static constructor"); },

	throwVirtual() { Report.throw("virtual call"); },


	throw(message, arg, arg2) {

		console.error(message, arg, arg2);

		throw {
			isReport: true,
			message,
			arg,
			arg2,
			stack: (new Error).stack,

			get data() { console.error(`get data`); },
		};
	},


	warn(message, arg, arg2) { // returns UNDEF

		console.error(message, arg, arg2);
	},


	_reported: new Set,

	once(message, arg, arg2) { // returns UNDEF

		if (this._reported.has(message))
			return;

		this._reported.add(message);

		console.error(message, arg, arg2);
	},


	clear(message) { this._reported.delete(message) },

};



export { Report };

