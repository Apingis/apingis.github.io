
export * from '../Display/Display.js';
export * from '../Display/Raycaster.js';
export * from '../Display/MiniMap.js';
export * from '../Display/Shader.js';
export * from '../Display/Wind.js';

export * from '../Display/ItemDisplay2D.js';

export * from '../Display/Chains/ChainsCollection.js';
export * from '../Display/Chains/Chain-Geometry.js';
export * from '../Display/Chains/Chain-Shader.js';

export * from '../Display/CameraMove.js';
export * from '../Display/CameraView.js';

export * from '../Display/AreaDisplay.js';
export * from '../Display/AreaPartDisplay.js';
export * from '../Display/ItemDataTexture.js';
export * from '../Display/MaterialQuadIndex.js';
export * from '../Display/MaterialQuad.js';


export * from '../ItemDisplay/ItemDisplay.js';
export * from '../ItemDisplay/CharDisplay.js';


export * from '../UI/UI.js';
export * from '../UI/UIPrefs.js';
export * from '../UI/Buttons.js';
export * from '../UI/Tooltip.js';
export * from '../UI/Cursor.js';
export * from '../UI/Label2D.js';
export * from '../UI/Hover.js';

export * from '../UI/ElementHelper.js';

export * from '../UI/ScreenCharInfo.js';
export * from '../UI/ScreenEquip.js';

export * from '../UI/ProgressWindow.js';
export * from '../UI/ScreenGears.js';
export * from '../UI/ScreenHelp.js';



function doImport() {

	var isNode = typeof window == "undefined";
	var haveExport5 = !isNode && typeof window.export5 == "function";

	for (let [ name, exported ] of Object.entries(this)) {

		if (name == "doImport")
			continue;

		if (isNode)
			global[name] = exported;
		else
			window[name] = exported;

		if (haveExport5)
			export5(name, exported);

	}
}


export { doImport };

