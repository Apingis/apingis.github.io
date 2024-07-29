
var Messages = (function() {

	const type = Object.freeze({
		default: 0,
		debug:	1,
		camera: 2,
		unit:	3,
	});

	const ttlDefault = 10;

	var parentDomElem;
	var msgs = [];
	var timer;

	function init(...args) {
		[parentDomElem] = args;
		timer = window.setInterval( () => {
			let currTime = Date.now() / 1000;
			for (let i = 0; i < msgs.length; i++)
				if (msgs[i].ttl < currTime)
					purge(i--);
		}, 1000);
	}

	function purge(i) {
		parentDomElem.removeChild(msgs[i].domElem);
		msgs.splice(i, 1);
	}

	function purgeByFn(fn) {
		for (let i = 0; i < msgs.length; i++)
			if (fn(msgs[i])) {
				purge(i);
				i--;
			}
	}

	function add(msg, msgType = type.default) {
		var span = document.createElement("span");

		if (msgType == type.debug)
			span.className = "canvas-msg-debug";
		if (msgType == type.camera)
			span.className = "canvas-msg-camera";
		if (msgType == type.unit)
			span.className = "canvas-msg-unit";

		span.appendChild(document.createTextNode(msg));

		var domElem = document.createElement('p');
		domElem.appendChild(span);

		parentDomElem.appendChild(domElem);
		//console.log(parentDomElem.parentNode.clientHeight, parentDomElem.scrollHeight);

		var maxHeight = parentDomElem.parentNode.clientHeight;
		while (maxHeight < parentDomElem.scrollHeight && msgs.length)
			purge(0);

		var ttl = ttlDefault;

		if (msgType == type.debug) {
			ttl = 60;
			purgeByFn( (msg) => msg.type == type.debug );
		}
		if (msgType == type.camera) {
			ttl = 3;
			purgeByFn( (msg) => msg.type == type.camera );
		}

		msgs.push({domElem, type: msgType, ttl: Date.now() / 1000 + ttl});
	};

	return {
		init, add,
		type,
	};

})();

