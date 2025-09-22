
document.addEventListener('DOMContentLoaded', () => {

	Loader_noServer.start();

}, false);



var Loader_noServer = {


	start() {

		Loader.addHTMLLoaderDialog();

		if ( !LoadingScreen.detectWebGL() ) {

			Loader.displayHaltMsg("No WebGL", "", "Application requires WebGL.");
			return;
		}

		LoadingScreen.start();

		setTimeout( () => this.loadCodebase2(), 20);
	},



	loadCodebase2() { // ES5

		var list = [

			[ "js/UI/MainPage.html", "html", (el) => Loader._mainPageElem = el ],
			[ "js/UI/UIElem.html", "html", (el) => Loader._uIElem = el ],

			[ "style.css", "text", (text) => Loader.addCSSText(text) ],
			[ "images.css", "text", (text) => Loader.addCSSText(text) ],

			[ "js/Server/Accounting.js" ], // TODO AppConfig.noServer
			[ "js/Server/LoadUser.js" ],
			[ "js/Display/Messages.js" ],
			[ "js/Engine.js" ],

			[ "../lib/stats.min.js" ],
			[ "../lib/kdTree-min.js" ],
		];

		if (AppConfig.isTest())
			list.push(
				[ "js/Test-Visibility.js" ],
				[ "js/Test-AreaDisplay.js" ],
				[ "js/Test-Common.js" ],
				[ "js/Test-Fn.js" ],
			);

		if (AppConfig.localStatic) {
			list.push(
				[ "../lib/rbush.min.js" ],
				[ "../lib/rbush-knn.min.js" ],
				[ "../lib/earcut.min.js" ],
			);

		} else {
			list.push(
				[ "https://unpkg.com/rbush@3.0.1/rbush.min.js" ],
				[ "https://unpkg.com/rbush-knn@3.0.1/rbush-knn.min.js" ],
				[ "https://unpkg.com/earcut@2.2.4/dist/earcut.min.js" ],
			);
		}

		if (AppConfig.isDemo2())
			list.push( [ "js/Demo2.js?1" ] );


		Loader.loadResources(AppConfig.urlStatic, list, () => {

			if (RBush)
				window.rbush = RBush;

			Array.from( Loader._mainPageElem.querySelectorAll('#application-main-page > *') )
				.forEach(el => document.querySelector('body').appendChild(el) );

			this.loadCodebase3();
		});
	},



	loadCodebase3() { // ES6 - external libs (incl. THREE)

		var moduleText = '';	

		if (AppConfig.localStatic)
			moduleText += `import * as LibImportIndex from '${AppConfig.urlStatic}js/Loading/LibImportIndexLocal.js'\n`;
		else
			moduleText += `import * as LibImportIndex from '${AppConfig.urlStatic}js/Loading/LibImportIndexNetwork.js'\n`;

		moduleText += `LibImportIndex.doImport();\n`;
		moduleText += `Loader_noServer.loadCodebase4();\n`;

		Loader.runScriptModuleFromText(moduleText);
	},



	loadCodebase4() { // ES6 - application codebase

		this.loadCodebase4_splitFiles();
	},



	loadCodebase4_splitFiles() {

		var displayIndex = AppConfig.isDemo1() ? 'DisplayImportIndex-demo1'
			: AppConfig.isDemo2() ? 'DisplayImportIndex-demo2'
			: 'DisplayImportIndex';

		var index = AppConfig.isDemo1() ? 'ImportIndex-demo1'
			: AppConfig.isDemo2() ? 'ImportIndex-demo2'
			: 'ImportIndex';

		var moduleText = `
			import * as MathImportIndex from '${AppConfig.urlStatic}js/Math/MathImportIndex.js';
			import * as DisplayImportIndex from '${AppConfig.urlStatic}js/Loading/${displayIndex}.js';
			import * as ImportIndex from '${AppConfig.urlStatic}js/Loading/${index}.js?1';

			ImportIndex.doImport();
			MathImportIndex.doImport();
			DisplayImportIndex.doImport();
		`;

		if (AppConfig.isTest())
			moduleText += `export * from './js/Math/Math-Test.js'\n`;

		moduleText += `
			Loader.loadScriptFromURL('${AppConfig.urlStatic}' + 'js/Application.js', { module: true }); // ES6 app. starts
		`;

		Loader.runScriptModuleFromText(moduleText);
	},

}



