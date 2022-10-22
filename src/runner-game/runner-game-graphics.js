//"use strict";

/* RUNNER GAME GRAPHICS TEST
Test loading of gltf files and instancing of obstacles.
*/
import * as THREE from '../../build/three.module.js';
import { GLTFLoader } from "../../build/GLTFLoader.module.js";
import { OrbitControls } from "../../lib/OrbitControls.js";

const scene = new THREE.Scene();

const container = document.getElementById('gamescreen');
const w = container.offsetWidth;
const h = container.offsetHeight;
const aspect = w/h;
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w,h);
container.appendChild(renderer.domElement);

//FUNC: set up camera
const camera = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
const d = 0;
//camera.zoom = 1;
camera.position.set(-2, d, d);
camera.lookAt(scene.position);
camera.position.z = d-2; // so that player is lower on screen.
camera.updateProjectionMatrix();

// FUNC: set up orbit controls for debugging purposes
const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2;
controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI / 2;
//camera.position.set( 0, 20, 100 );
controls.update();

// FUNC: set up lights
//let AmbiLight = new THREE.AmbientLight( 0x404040 , 3); // soft white light
//scene.add( AmbiLight );
let directionalLight = new THREE.DirectionalLight( 0xffffff, 0.2);
directionalLight.position.set(0,20,3);
scene.add( directionalLight );
let hemiLight = new THREE.HemisphereLight();
scene.add( hemiLight );

// test screen works
const bgeo = new THREE.BoxGeometry(1, 1, 1);
const bmat = new THREE.MeshBasicMaterial({color: 0x44aa88});
const bcube = new THREE.Mesh(bgeo, bmat);
bcube.position.set(1,2,0);
scene.add(bcube);

function animate() {
	requestAnimationFrame( animate );
	
	controls.update();
	
	renderer.render(scene, camera);

}

document.addEventListener('keydown', (e) => {
    if (e.code === "Space") {
		console.log("Space");
		if (assetkit.state === "add") {
			//scene.add( assetkit.children[asseti].clone() );
			//console.log("Add", assetkit.children[asseti].name);
			
			//console.log(assetkit);
			
			scene.add( assetkit.bgPrefabs.scene.children[0].clone() ); 
			scene.add( assetkit.bgPrefabs.scene.children[3].clone() ); 
			scene.add( assetkit.fgPrefabs.scene.children[1].clone() ); 
			scene.add( assetkit.fgPrefabs.scene.children[2].clone() ); 
			scene.add( assetkit.trackPrefabs.roadPrefabs.scene.children[0].clone() ); 
			scene.add( assetkit.obstPrefabs.scene.children[3].clone() );
			assetkit.state = "shift";
		} else if (assetkit.state === "shift") {
			const n = scene.getObjectByName(assetkit.children[asseti].name);
			n.position.set(2,0,0);
			assetkit.state = "remove";
		} else {
			const n = scene.getObjectByName(assetkit.children[asseti].name);
			scene.remove( n );
			console.log("Removed", asseti, scene.children, n, assetkit.children[asseti]);
			assetkit.state = "add";
			asseti += 1;
		}
    }
});


const loader = new GLTFLoader();
/*function myGltfLoad( gltf ) {
	scene.add( gltf.scene );
	//return(gltf.scene);

	}, function ( xhr ) {
		
		if (abs(xhr.loaded - xhr.total) < 0.1) {
			console.log( gltf, "loaded." );
		}

	}, function ( error ) {

		console.error( error );

	} 	
}*/

let assetkit;
async function init() {
	assetkit = {
		state: "add",
		bgPrefabs:   await loader.loadAsync("runner-game-models--bg.glb"),
		fgPrefabs:   await loader.loadAsync("runner-game-models--fg.glb"),
		bonusPrefabs: await loader.loadAsync("runner-game-models--bonus.glb"),
		obstPrefabs: await loader.loadAsync("runner-game-models--obstacles.glb"),
		trackPrefabs: {
			roadPrefabs: await loader.loadAsync("runner-game-models--track-road.glb"),
			pitPrefabs:  await loader.loadAsync("runner-game-models--track-pit.glb"),
			bridgePrefabs: await loader.loadAsync("runner-game-models--track-bridge.glb")
		}
	};

}
init();
//let asseti = 0;
//let assetstate = "add";
/*loader.load( 'runner-game-models.glb', function ( gltf ) {
	//scene.add( gltf.scene );
	
	console.log("Here is what was loaded: ");
	console.log(gltf.animations); // Array<THREE.AnimationClip>
	console.log(gltf.scene); // THREE.Group
	console.log(gltf.scenes); // Array<THREE.Group>
	console.log(gltf.cameras); // Array<THREE.Camera>
	console.log(gltf.asset); // Object
	
	assetkit = gltf.scene;

	}, function ( xhr ) {

		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

	}, function ( error ) {

	console.error( error );

	} 
);*/

animate();
