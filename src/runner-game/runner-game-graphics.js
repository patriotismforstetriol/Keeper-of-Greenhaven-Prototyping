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
let AmbiLight = new THREE.AmbientLight( 0x404040 , 3); // soft white light
scene.add( AmbiLight );
let directionalLight = new THREE.DirectionalLight( 0xffffff, 0.2);
directionalLight.position.set(0,20,3);
scene.add( directionalLight );

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
		if (assetstate === "add") {
			scene.add( assetkit.children[asseti].clone() );
			console.log("Add", assetkit.children[asseti].name);
			assetstate = "shift";
		} else if (assetstate === "shift") {
			const n = scene.getObjectByName(assetkit.children[asseti].name);
			n.position.set(2,0,0);
			assetstate = "remove";
		} else {
			const n = scene.getObjectByName(assetkit.children[asseti].name);
			scene.remove( n );
			console.log("Removed", asseti, scene.children, n, assetkit.children[asseti]);
			assetstate = "add";
			asseti += 1;
		}
    }
});


const loader = new GLTFLoader();
let assetkit;
let asseti = 0;
let assetstate = "add";
loader.load( 'runner-game-models.glb', function ( gltf ) {
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
);

animate();
