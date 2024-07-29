
import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
export { THREE };


import { GLTFLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/GLTFLoader.js';
import { MD2Loader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/MD2Loader.js';

import { LineMaterial } from 'https://unpkg.com/three@0.127.0/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'https://unpkg.com/three@0.127.0/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'https://unpkg.com/three@0.127.0/examples/jsm/lines/LineSegmentsGeometry.js';

import { SkeletonUtils } from 'https://unpkg.com/three@0.127.0/examples/jsm/utils/SkeletonUtils.js';
import { BufferGeometryUtils } from 'https://unpkg.com/three@0.127.0/examples/jsm/utils/BufferGeometryUtils.js';

import { EffectComposer } from 'https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/ShaderPass.js';
import { CopyShader } from 'https://unpkg.com/three@0.127.0/examples/jsm/shaders/CopyShader.js';
import { FXAAShader } from 'https://unpkg.com/three@0.127.0/examples/jsm/shaders/FXAAShader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/DRACOLoader.js';

import { CSM } from 'https://unpkg.com/three@0.127.0/examples/jsm/csm/CSM.js';


export {
	GLTFLoader, MD2Loader,
	LineMaterial, LineSegments2, LineSegmentsGeometry,
	SkeletonUtils, BufferGeometryUtils,
	EffectComposer, RenderPass, ShaderPass, CopyShader, FXAAShader,
	DRACOLoader,
	CSM,
};

// https://unpkg.com/polygon-clipping@0.15.3/dist/polygon-clipping.esm.js
// requires importmap (+shims)
import polygonClipping from '../../../lib/polygon-clipping.esm.js'; // +edit
export { polygonClipping };


import { TWEEN } from '../Util/Tweenb.js';
export { TWEEN };



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



export { doImport }

