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

class Runner {
	GameStateEnum = Object.freeze({sLoading:0, sRunning:1, sPaused:2, sPlayerDead:3});
	gameState;
	timer;

	// Scoring values
	scoreMultiplier;


	// Player
	visual; // mesh

	constructor() {
		// AWAKEN
		this.gameState = this.GameStateEnum.sLoading;
		// TODO: get player appearance
		//this.createPlayer();
		// TODO: get player's level and exp at beginning of run

		// INITIALISE
		// TODO: make TrackGenerator

		//this.gameState = this.GameStateEnum.sRunning;
	}

	createPlayer() {
		let geometry = new THREE.BoxBufferGeometry(0.5, 1.5, 0.5);
		let material = new THREE.MeshPhongMaterial( {color: 0x00aa33} );
		this.visual = new THREE.Mesh( geometry, material );
		scene.add( this.visual );
	}

	update( deltaTime ) {
		if ( gameState != this.GameStateEnum.sRunning ) {
			return;
		}
		move( deltaTime ); // TODO
		stayOnTheGround(); //TODO
		getInput(); //TODO
		this.timer += deltaTime;
		checkMultiplier();
	}

	move() {
		// TODO: see game prototype
	}

	checkMultiplier() {
		// TODO: see update method in PlayerController.cs
	}

	// TODO: show multiplier labels
	// TODO: show powerup labels

	isPaused() {
		return (this.gameState != this.GameStateEnum.sRunning);
	}

	unPause() {
		this.gameState = this.GameStateEnum.sRunning;
	}

}

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
	player;

	// Prefab Arrays
	roadSegmentPrefabs;
	pitSegmentPrefabs;
	bridgeSegmentPrefabs;
	foregroundPrefabs;
	backgroundPrefabs;
	obstaclePrefabs;
	coinPrefab;
	powerupPrefabs;

	// Current existing gameobjects
	trackObjects;
	foregroundObjects;
	obstacleObjects;
	coinObjects;
	powerupObjects;

	// Queues
	foregroundQueue;
	backgroundQueue;

	// Game Track Constants


	constructor(assetkit, player) {
		this.player = player;

		this.roadSegmentPrefabs = assetkit.trackPrefabs.roadPrefabs.scene.children;
		this.pitSegmentPrefabs = assetkit.trackPrefabs.pitPrefabs.scene.children;
		this.bridgeSegmentPrefabs = assetkit.trackPrefabs.bridgePrefabs.scene.children;
		this.foregroundPrefabs = assetkit.fgPrefabs.scene.children;
		this.backgroundPrefabs = assetkit.bgPrefabs.scene.children;
		this.obstaclePrefabs = assetkit.obstPrefabs.scene.children;

		this.coinPrefab = assetkit.bonusPrefabs.scene.children[0];
		this.powerupPrefabs = assetkit.bonusPrefabs.scene.children.filter(obj => obj != "Coin");
	
		this.trackObjects = [];
		this.foregroundObjects = [];
		this.obstacleObjects = [];
		this.coinObjects = [];
		this.powerupObjects = [];

		this.foregroundQueue = [];
		this.backgroundQueue = [];
	
		// can we just immediately GenerateObstacles?
		// or just wait for update method?

		this.player.unPause();
	}

	update() {
		if (!this.player.isPaused()) {
			this.#generateTrack();
			this.#generateObstacles();
			this.#generateCoins();
			this.#generatePowerups();
			this.#generateEnvironment();
			//then do cleanup?
		}
	}

	 #generateTrack() {
		const randomPrefab = this.roadSegmentPrefabs[Math.floor(Math.random() * this.roadSegmentPrefabs.length)].clone();
		
		if (this.trackObjects.length != 0) {
			const toDelete = this.trackObjects.pop();
			scene.remove(toDelete);
			threejsDispose(toDelete);
		} 

		this.trackObjects.push(randomPrefab);
		scene.add(randomPrefab);
	 }

	 #generateEnvironment() {

	 }

	 #generateObstacles() {

	 }

	 #generateCoins() {

	 }

	 #generatePowerups() {

	 }
}

let myTrackGenerator = undefined;

function animate() {
	requestAnimationFrame( animate );
	
	/*if (myTrackGenerator != undefined) {
		myTrackGenerator.update();
	}*/
	controls.update();
	
	renderer.render(scene, camera);

}



document.addEventListener('keydown', (e) => {
    if (e.code === "Space") {
		console.log("Space");
		if (myTrackGenerator != undefined) {
			myTrackGenerator.update();
		}
    }
});





const loader = new GLTFLoader();

async function init() {
	let assetkit = {
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

	let myRunner = new Runner();
	myTrackGenerator = new TrackGenerator(assetkit, myRunner);
	console.log("Loaded!");
}
init();

animate();
