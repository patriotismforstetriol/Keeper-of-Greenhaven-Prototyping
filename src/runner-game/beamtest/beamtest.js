//"use strict";

/* RUNNER GAME GRAPHICS TEST
Test loading of gltf files and instancing of obstacles.
*/
import * as THREE from '../../../build/three.module.js';
import { GLTFLoader } from "../../../build/GLTFLoader.module.js";
import { OrbitControls } from "../../../lib/OrbitControls.js";
import { Water } from "../../../lib/Water.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x9BBABC ); // From old game. Alternate camera has 0x314D79

const container = document.getElementById('gamescreen');
const w = container.offsetWidth;
const h = container.offsetHeight;
const aspect = w/h;
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w,h);
container.appendChild(renderer.domElement);
renderer.outputEncoding = THREE.sRGBEncoding; // recpmmended when using gltf

//FUNC: set up camera
const camera = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
const d = 0;
//camera.zoom = 1;
camera.position.set(-2, d, d);
camera.lookAt(scene.position);
camera.position.z = d-2; // so that player is lower on screen.
camera.updateProjectionMatrix();

// FUNC: Set up player's camera and fog
const playerCamera = new THREE.PerspectiveCamera(60, aspect, 0.3, 1000); // from old game
playerCamera.position.set(0, 1.85, -2.45); // from old game
playerCamera.rotateX(Math.PI/2);
const pCHelper = new THREE.CameraHelper( playerCamera );
//scene.add( pCHelper );

scene.fog = new THREE.Fog( 0x9BBABC, 120, 300 );

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
let directionalLight = new THREE.DirectionalLight( 0xF2F087, 0.6 ); // colour from old game
directionalLight.position.set(8,1,13);
scene.add( directionalLight );
const dLHelper = new THREE.DirectionalLightHelper( directionalLight, 3 );
scene.add( dLHelper );
//let hemiLight = new THREE.HemisphereLight( );
//scene.add( hemiLight );

// FUNC: water plane
const geoPlane = new THREE.PlaneGeometry( 300, 300 ); // Old game was 320 x 320
//geoPlane.rotateX(Math.PI/2);
/*const matPlane = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
const plane = new THREE.Mesh( geoPlane, matPlane );
plane.position.y = -10;
scene.add( plane );*/
const water = new Water(
    geoPlane,
    {
        waterNormals: new THREE.TextureLoader().load( 'Waterbump.png', function ( texture ) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        } ),
        distortionScale: 2,
        sunColor: 0xF2F087,
        fog: scene.fog !== undefined
    }
);
water.rotation.x = - Math.PI/2;
water.position.y = -10;
water.position.z = -100;
//water.material.uniforms.distortionScale = 2;
//water.material.uniforms.size = 10;
// This does not include fresnel.
scene.add(water);

function threejsDispose(obj) {
	//https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects

	if ( typeof(obj) == "Mesh" ) {
		obj.material.map.dispose(); // texture
		obj.material.dispose();
		obj.geometry.dispose();
	}

	obj.children.forEach((child) => {
		threejsDispose(child);
	});
}


class TrackGenerator {

	// Prefab Arrays
	foregroundPrefabs;

	constructor(assetkit) {
		this.foregroundPrefabs = [assetkit.fgPrefabs.scene.children[0]
								, assetkit.fgPrefabs.scene.children[1]
								, assetkit.fgPrefabs.scene.children[2]
								];

        /*gltf.parser.getDependency( 'bufferView', mesh.userData.gltfExtensions.bufferView )
		    .then( function ( rayTexture ) {
                console.log(rayTexture);
                this.foregroundPrefabs[2].children[0].material.alphaMap = rayTexture;
                this.foregroundPrefabs[2].children[0].material.needsUpdate = true;
             } );*/

        //let godRays3 = this.foregroundPrefabs[2].children[0];
        //godRays3.material.alphaMap = this.foregroundPrefabs[0].children[2].material.map;
        //godRays3.material.needsUpdate = true;
		console.log(this.foregroundPrefabs);
        scene.add(this.foregroundPrefabs[0]);
        scene.add(this.foregroundPrefabs[1]);
        scene.add(this.foregroundPrefabs[2]);
	}
}


let myTrackGenerator = undefined;

function animate() {
	requestAnimationFrame( animate );

	controls.update();

	renderer.render(scene, camera);

}

const loader = new GLTFLoader();

async function init() {
    const fgs = await loader.loadAsync("runner-game-models--fg-beamtest.glb").then((gltf) => {
        //console.log(gltf.parser.json.textures);
        return gltf.parser.getDependency( 'texture', 2 /* textureIndex */ ).then((tex) => {
            console.log(tex);
            console.log(gltf.scene.children[2]);
            //gltf.scene.children[2].children[0].material.alphaMap = tex; // does nothing if you don't have .map
            gltf.scene.children[2].children[0].material.map = tex;
            //gltf.scene.children[2].children[0].material.blending = THREE.AdditiveBlending;
            gltf.scene.children[2].children[0].material.needsUpdate = true;
            return gltf;
        });
    });

	let assetkit = {
		fgPrefabs: fgs
	};

	myTrackGenerator = new TrackGenerator(assetkit);
	console.log("Loaded!");
}
init();

animate();
