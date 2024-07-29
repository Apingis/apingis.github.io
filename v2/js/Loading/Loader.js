
// =====================================
//
// *** ES5 global vars. ***
//
// =====================================

var mouseRaycaster;
var wMon;

window.ondragstart = () => { return false }

function export5(key, obj) { window[key] = obj }

function getUIElem(id) { return Loader._uIElem.querySelector('#' + id) }





var Loader = {

	_uIElem: null,
	_mainPageElem: null,


	loadScriptFromURL(url, arg, callBack) {

		var script = document.createElement('script');

		script.src = url;
		arg && arg.module && (script.type = "module");
		script.onload = callBack;

		document.head.appendChild(script);
	},


	loadResources(urlPrefix, resources, onLoadAllCallBack) {

		var urls = new Set;

		var onLoadComplete = (url) => {

			if (!urls.has(url))
				return console.error(`no url=${url}`);

			urls.delete(url);

			if (urls.size === 0)
				onLoadAllCallBack();
		};

		resources.forEach(resource => {

			var [ url, type, onLoadFn ] = resource;

			var fullURL = url.startsWith("http") ? url : urlPrefix + url;

			if (!type)
				this.loadScriptFromURL(fullURL, {}, () => onLoadComplete(url) );

			else if (type == "module")
				this.loadScriptFromURL(fullURL, { module: true }, () => onLoadComplete(url) );

			else if (type == "text")

				this.loadTextFile(fullURL, (text) => {
					onLoadFn(text);
					onLoadComplete(url);
				});

			else if (type == "html")

				this.loadTextFile(fullURL, (text) => {

					var el = document.createElement('div');

					el.innerHTML = text;
					console.assert(el.children[0].textContent == "Loaded Successfully");

					onLoadFn(el);
					onLoadComplete(url);
				});

			else if (type == "css")
				this.loadCSS(fullURL, () => onLoadComplete(url) );

			else
				return console.error(`bad type=${type}`);

			urls.add(url);
		});
	},


	loadTextFile(url, callBack) {

		//await (await fetch(url)).text();
		//fetch(url)
		//	.then((response) => response.text())
		//	.catch((error) => console.error("fetch", error))
		//	.then((text) => callBack(text))
		//	.catch((error) => console.error("fetch - text", error))

		var req = new XMLHttpRequest;

		req.addEventListener("load", () => callBack(req.responseText) );
		req.open("GET", url);
		req.send();
	},


	addCSSText(text) {

		text = text.replace(/(:url\(')(data:)?/g, (str, sub1, ifData) =>
			ifData ? sub1 + ifData : sub1 + AppConfig.urlStatic);

		var style = document.createElement('style');

		style.type = 'text/css';
		style.innerHTML = text;

		document.head.appendChild(style);
	},


	runScriptModuleFromText(text) {

		var script = document.createElement('script');

		script.textContent = text;
		script.type = "module";
		//script.onload = callBack; <-- doesn't work

		document.head.appendChild(script);
	},



	addHTMLLoaderDialog() {

		var style = document.createElement('style');

		style.type = 'text/css';
		style.innerHTML = `

body {
	margin:0;
	width:100vw;height:100vh;
	overflow:hidden;
	background-color:#999;
}
#loader-bg {
	position:absolute;top:0;left:0;bottom:0;right:0;
	z-index:10000;
	display:flex;align-items:center;justify-content:center;
	background-color:#080808;
}
#loader-dialog {
	width:30%;
	max-width:300px;min-width:250px;
	padding:1.5%;
	border:2px ridge sienna;
	background:url('${AppConfig.urlStatic}img/bg/wood1a-small.jpg') center/cover #b88c4b;
}
.loader-progress-bar {
	width:95%;
	height:1.5vh;min-height:7px;
	background:#1b1811;
	margin:0;
	border:1px solid #000;
}
.loader-progress-bar-content {
	background:#129b22;
	top:0;left:0;
	height:100%;width:0;
	transition:width 0.03s;
}
.loader-hdr-text {
	font-size:22px;line-height:28px;
	font-family:Helvetica,Arial,sans-serif;
	font-weight:bold;
	text-align:center;
}
.loader-subhdr-text {
	font-size:19px;line-height:25px;
	font-family:Helvetica,Arial,sans-serif;
	font-weight:bold;
}
.loader-text {
	margin-top:11px;
	font-size:16px;line-height:21px;
	font-family:Helvetica,Arial,sans-serif;
}

#halt-bg {
	position:absolute;top:0;left:0;bottom:0;right:0;
	z-index:15000;
	opacity:0.5;
	background:#111;
	transition:opacity 0.06s;
}
#halt-msg {
	position:absolute;top:50%;left:50%;
	z-index:15001;
	transform:translate(-50%, -50%);
	min-width:15%;max-width:650px;
	min-height:90px;max-height:90%;
	padding:1%;
	border:2px ridge sienna;
}
#halt-msg-bg {
	position:absolute;top:0;left:0;bottom:0;right:0;
	z-index:-1;
	background:url('${AppConfig.urlStatic}img/bg/paper-recycled.jpg') no-repeat center/cover #baa47f;
	filter:hue-rotate(-20deg) grayscale(40%) brightness(80%);
}
		`;

		document.head.appendChild(style);


		var div = document.createElement('div');

		div.id = 'loader-bg';

		div.innerHTML = `

			<div id="loader-dialog">

				<div id="loader-hdr" class="loader-hdr-text">Loading</div>

				<div id="loader-bar-hdr-0" class="loader-text">Codebase</div>
				<div class="loader-progress-bar">
					<div id="loader-progress-bar-stage0" class="loader-progress-bar-content"></div>
				</div>

				<div id="loader-bar-hdr-1" class="loader-text">3D Assets</div>
				<div class="loader-progress-bar">
					<div id="loader-progress-bar-stage1" class="loader-progress-bar-content"></div>
				</div>

				<div id="loader-bar-hdr-2" class="loader-text">Initialization</div>
				<div class="loader-progress-bar" style="margin-bottom:1vh">
					<div id="loader-progress-bar-stage2" class="loader-progress-bar-content"></div>
				</div>

			</div>
		`;

		document.querySelector('body').appendChild(div);
	},



	displayHaltMsg(hdrText, subhdrText, text = "") {

		var MAX_LEN = 1024;

		text = text.replace(/^[\s\n\r]+/, "").replace(/[\s\n\r]+$/, "");

		if (text.length > MAX_LEN)
			text = text.substring(0, MAX_LEN) + '[...]';

		if (window.Main) {
			let uId = Main.getUserMsgId();
			if (uId)
				text = text + '\n' + uId + '     ';
		}


		if (document.querySelector('#halt-bg')) {

			console.error(`Repeated Loader.displayHaltMsg > ${hdrText} | ${subhdrText} | ${text}`);
			return;
		}


		console.error(`Loader.displayHaltMsg > ${hdrText} | ${subhdrText} | ${text}`);


		var el = document.querySelector('#loader-dialog');
		el && (el.style.display = "none");

		var body = document.querySelector('body');
		var div;

		div = document.createElement('div');
		div.id = 'halt-bg';
		body.appendChild(div);

		div = document.createElement('div');
		div.id = 'halt-msg';

		div.innerHTML = `
			<div>
				<div id="halt-msg-bg"></div>

				<div id="halt-msg-1" class="loader-hdr-text text-user-select" style="margin:2px 20px 10px 20px">${hdrText || 'Error'}</div>
				<div id="halt-msg-2" class="loader-subhdr-text text-user-select" style="margin:10px 0 10px 0">${subhdrText}</div>

				<pre id="halt-msg-3" style="font-size:12px;line-height:16px;display:inline;white-space:pre-wrap;overflow-wrap:break-word" class="loader-text text-user-select">${text || 'unspecified'}</pre>
			</div>
		`;

		body.appendChild(div);
	},

}





