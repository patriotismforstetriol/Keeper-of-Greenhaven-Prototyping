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
/*const bgeo = new THREE.BoxGeometry(1, 1, 1);
const bmat = new THREE.MeshBasicMaterial({color: 0x44aa88});
const bcube = new THREE.Mesh(bgeo, bmat);
bcube.position.set(1,2,0);
scene.add(bcube);*/

class Runner {
	GameStateEnum = Object.freeze({sLoading:0, sRunning:1, sPaused:2, sPlayerDead:3});
	gameState;
	timer;

	// Scoring values
	scoreMultiplier;


	// Player
	visual; // mesh

	// Player Constants
	sightDistance = 20;

	constructor() {
		// AWAKEN
		this.gameState = this.GameStateEnum.sLoading;
		// TODO: get player appearance
		this.createPlayer();
		// TODO: get player's level and exp at beginning of run

		// INITIALISE
		// TODO: make TrackGenerator

		//this.gameState = this.GameStateEnum.sRunning;
	}

	createPlayer() {
		let geometry = new THREE.BoxBufferGeometry(0.5, 1.5, 0.5);
		let material = new THREE.MeshPhongMaterial( {color: 0x00aa33} );
		this.visual = new THREE.Mesh( geometry, material );
		this.visual.position.set(1,2,0);
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

	get position() {
		return this.visual.position;
	}

	get speed() {
		return 1;
	}

	get sightLimit() {
		//return this.visual.position.z + this.sightDistance;
		return this.sightDistance;
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
	environmentObjects;
	obstacleObjects;
	coinObjects;
	powerupObjects;

	// Queues
	environmentQueue;
	specialSegmentSequenceLen;

	// Game Track Constants
	static TrackTypeEnum = Object.freeze({tRoad:0, tPit:1, tBridge:2});
	static TrackXPosEnum = Object.freeze({tLeft:0, tCentre:1, tRight:2, tDoubleLeft:3, tDoubleRight:4});
	static TrackZPosEnum = Object.freeze({tStart:0, tGoOn:1, tEnd:2});
	static #trackPosHash(XPos, ZPos) { return XPos * Object.keys(TrackGenerator.TrackZPosEnum).length + ZPos; }

	// Game Constants
	distBetweenRoads = 1.3;
	horizon = 0.5;
	trackSegmentLength = 16;
	startDifficultyLevel = 30;
	endDifficultyLevel = 8;
	timeToChangeDifficulty = 300;
	timeBetweenGoldLines = 2;

	constructor(assetkit, player) {
		this.player = player;

		this.roadSegmentPrefabs = assetkit.trackPrefabs.roadPrefabs.scene.children;
		this.roadSegmentPrefabs.forEach((pf) => { pf.userData.trackType = TrackGenerator.TrackTypeEnum.tRoad; });

		// Assumes there's only one version of each trackPosHash
		const pitSegs = assetkit.trackPrefabs.pitPrefabs.scene.children;
		this.pitSegmentPrefabs = new Array(pitSegs.length);
		this.pitSegmentPrefabs.fill(null);
		pitSegs.forEach((pf) => { pf.userData.trackType = TrackGenerator.TrackTypeEnum.tPit; });
		pitSegs.forEach((pf) => {
			let xPos;
			if (pf.name.search("_SINGLE_CENTER") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tCentre;
			} else if (pf.name.search("_SINGLE_RIGHT") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tRight;
			} else if (pf.name.search("_SINGLE_LEFT") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tLeft;
			} else if (pf.name.search("_DOUBLE_RIGHT") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tDoubleRight;
			} else if (pf.name.search("_DOUBLE_LEFT") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tDoubleLeft;
			} else {
				console.log("Failed to categorise x position of " + pf.name);
				return;
			}
			pf.userData.trackXPos = xPos;

			let zPos;
			if (pf.name.search("_START") >= 0) {
				zPos = TrackGenerator.TrackZPosEnum.tStart;
			} else if (pf.name.search("_END") >= 0) {
				zPos = TrackGenerator.TrackZPosEnum.tEnd;
			} else {
				zPos = TrackGenerator.TrackZPosEnum.tGoOn;
			}

			const myhash = TrackGenerator.#trackPosHash(xPos, zPos);
			if (this.pitSegmentPrefabs[myhash] === null) {
				this.pitSegmentPrefabs[myhash] = pf;				
			} else {
				console.log("Tried to load duplicate pit tracks with xPos " + xPos + " and zPos " + zPos);
			}
		})

		const bridgeSegs = assetkit.trackPrefabs.bridgePrefabs.scene.children;
		this.bridgeSegmentPrefabs = new Array(bridgeSegs.length);
		this.bridgeSegmentPrefabs.fill(null);
		bridgeSegs.forEach((pf) => { pf.userData.trackType = TrackGenerator.TrackTypeEnum.tBridge; });
		bridgeSegs.forEach((pf) => {
			let xPos;
			if (pf.name.search("_CENTER") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tCentre;
			} else if (pf.name.search("_RIGHT") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tRight;
			} else if (pf.name.search("_LEFT") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tLeft;
			} else if (pf.name.search("_DOUBLE_RIGHT") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tDoubleRight;
			} else if (pf.name.search("_DOUBLE_LEFT") >= 0) {
				xPos = TrackGenerator.TrackXPosEnum.tDoubleLeft;
			} else {
				console.log("Failed to categorise x position of " + pf.name);
				return;
			}
			pf.userData.trackXPos = xPos;

			let zPos;
			if (pf.name.search("_START") >= 0) {
				zPos = TrackGenerator.TrackZPosEnum.tStart;
			} else if (pf.name.search("_END") >= 0) {
				zPos = TrackGenerator.TrackZPosEnum.tEnd;
			} else if (pf.name.search("_MIDDLE") >= 0) {
				zPos = TrackGenerator.TrackZPosEnum.tGoOn;
			} else {
				console.log("Failed to categorise z position of " + pf.name);
				return;
			}

			const myhash = TrackGenerator.#trackPosHash(xPos, zPos);
			if (this.bridgeSegmentPrefabs[myhash] === null) {
				this.bridgeSegmentPrefabs[myhash] = pf;				
			} else {
				console.log("Tried to load duplicate bridge tracks with xPos " + xPos + " and zPos " + zPos);
			}
		})

		// Foreground and background prefabs should both have 6 elements
		// ordered with 3 right-hand-side variants first, then 3 left-hand-side variants second
		// this order is hardcoded!
		this.foregroundPrefabs = [assetkit.fgPrefabs.scene.children[1]
								, assetkit.fgPrefabs.scene.children[3]
								, assetkit.fgPrefabs.scene.children[5]
								, assetkit.fgPrefabs.scene.children[0]
								, assetkit.fgPrefabs.scene.children[2]
								, assetkit.fgPrefabs.scene.children[4]
								];
		this.backgroundPrefabs = assetkit.bgPrefabs.scene.children;
		this.obstaclePrefabs = assetkit.obstPrefabs.scene.children;

		this.coinPrefab = assetkit.bonusPrefabs.scene.children[0];
		this.powerupPrefabs = assetkit.bonusPrefabs.scene.children.filter(obj => obj != "Coin");
	
		this.trackObjects = [];
		this.environmentObjects = [];
		this.obstacleObjects = [];
		this.coinObjects = [];
		this.powerupObjects = [];

		this.environmentQueue = [];
		this.specialSegmentSequenceLen = -1;

		console.log(this.foregroundPrefabs);
		console.log(this.backgroundPrefabs);
	
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

			this.#scrollTrack();
			this.#destroyOffscreenTrack();
		}
	}

	 #generateTrack() {
		// NOTE: NUMBER OF XPOS VARIANTS FOR BRIDGE (3) AND PIT (5) ARE HARDCODED. 
		let randomTrack;
		
		if (this.trackObjects.length == 0) {
			randomTrack = this.roadSegmentPrefabs[Math.floor(Math.random() * this.roadSegmentPrefabs.length)].clone();
			console.log(randomTrack.name);

			this.trackObjects.push(randomTrack);
			this.environmentQueue.push(randomTrack);
			scene.add(randomTrack);
		} else {
			//const predecessor = this.trackObjects.pop();
			let predecessor = this.trackObjects[this.trackObjects.length - 1];

			while (predecessor.position.z + (this.trackSegmentLength / 2) < this.player.sightLimit) {
				if (predecessor.userData.trackType === TrackGenerator.TrackTypeEnum.tBridge) {
					// if bridge: can continue bridge, end bridge, or get the next road after the bridge
					if (this.specialSegmentSequenceLen > 0) {
						this.specialSegmentSequenceLen -= 1;
						randomTrack = this.bridgeSegmentPrefabs[TrackGenerator.#trackPosHash(predecessor.userData.trackXPos, TrackGenerator.TrackZPosEnum.tGoOn)].clone();
					} else if (this.specialSegmentSequenceLen == 0) {
						this.specialSegmentSequenceLen -= 1;
						randomTrack = this.bridgeSegmentPrefabs[TrackGenerator.#trackPosHash(predecessor.userData.trackXPos, TrackGenerator.TrackZPosEnum.tEnd)].clone();
					} else {
						// Get a regular road
						randomTrack = this.roadSegmentPrefabs[Math.floor(Math.random() * this.roadSegmentPrefabs.length)].clone();
					}
				} else if (predecessor.userData.trackType === TrackGenerator.TrackTypeEnum.tPit) {
					// if pit: can continue pit, end pit, or get next road after pit
					if (this.specialSegmentSequenceLen > 0) {
						this.specialSegmentSequenceLen -= 1;
						randomTrack = this.pitSegmentPrefabs[TrackGenerator.#trackPosHash(predecessor.userData.trackXPos, TrackGenerator.TrackZPosEnum.tGoOn)].clone();
					} else if (this.specialSegmentSequenceLen == 0) {
						this.specialSegmentSequenceLen -= 1;
						randomTrack = this.pitSegmentPrefabs[TrackGenerator.#trackPosHash(predecessor.userData.trackXPos, TrackGenerator.TrackZPosEnum.tEnd)].clone();
					} else {
						randomTrack = this.roadSegmentPrefabs[Math.floor(Math.random() * this.roadSegmentPrefabs.length)].clone();
					}
				} else { // Regular Road: can select bridge, pit, or road as the next one.
					const val = Math.random();
					if (val < 0.03) { // 30% of one tenth: Select bridge
						this.specialSegmentSequenceLen = Math.floor(Math.random() * 3);
						randomTrack = this.bridgeSegmentPrefabs[TrackGenerator.#trackPosHash(Math.floor(Math.random() * 3), TrackGenerator.TrackZPosEnum.tStart)].clone();
					} else if (val < 0.1) { // 70% of one tenth: Select pit
						this.specialSegmentSequenceLen = Math.floor(Math.random() * 5);
						randomTrack = this.pitSegmentPrefabs[TrackGenerator.#trackPosHash(Math.floor(Math.random() * 5), TrackGenerator.TrackZPosEnum.tStart)].clone();
					} else {
						randomTrack = this.roadSegmentPrefabs[Math.floor(Math.random() * this.roadSegmentPrefabs.length)].clone();
					}
				}

				console.log(randomTrack.name);
				randomTrack.position.z = predecessor.position.z + this.trackSegmentLength;

				this.trackObjects.push(randomTrack);
				this.environmentQueue.push(randomTrack);
				scene.add(randomTrack);

				predecessor = this.trackObjects[this.trackObjects.length - 1];
			}

			//scene.remove(predecessor);
			//threejsDispose(predecessor);
		}

	 }

	 #generateEnvironment() {
		while (this.environmentQueue.length > 0) {
			const correspondingTrack = this.environmentQueue.shift();
			if (correspondingTrack.userData.trackType != TrackGenerator.TrackTypeEnum.tBridge) {
				// if not a bridge, add foregrounds
				const rightfg = this.foregroundPrefabs[Math.floor(Math.random() * 3)].clone();
				rightfg.position.z = correspondingTrack.position.z;
				this.environmentObjects.push(rightfg);
				scene.add(rightfg);

				const leftfg = this.foregroundPrefabs[3 + Math.floor(Math.random() * 3)].clone();
				leftfg.position.z = correspondingTrack.position.z;
				this.environmentObjects.push(leftfg);
				scene.add(leftfg);
			}
			// In all cases, add backgrounds
			const rightbg = this.backgroundPrefabs[Math.floor(Math.random() * 3)].clone();
			rightbg.position.z = correspondingTrack.position.z;
			this.environmentObjects.push(rightbg);
			scene.add(rightbg);

			const leftbg = this.backgroundPrefabs[3 + Math.floor(Math.random() * 3)].clone();
			leftbg.position.z = correspondingTrack.position.z;
			this.environmentObjects.push(leftbg);
			scene.add(leftbg);

		}
	 }

	 #generateObstacles() {

	 }

	 #generateCoins() {

	 }

	 #generatePowerups() {

	 }

	 #scrollTrack() {
		const deltaZ = this.player.speed;// * deltaTime * 30;
		this.trackObjects.forEach((trackObject) => {
			trackObject.position.z -= deltaZ; 
		});
		this.environmentObjects.forEach((envObject) => {
			envObject.position.z -= deltaZ; 
		});
	 }

	 #destroyOffscreenTrack() {
		if (this.trackObjects.length > 0) {
			const offscreenCutoff = 0 - this.trackSegmentLength;
			while (this.trackObjects[0].position.z < offscreenCutoff) {
				const trackToDestroy = this.trackObjects.shift();
				scene.remove(trackToDestroy);
				threejsDispose(trackToDestroy);
			}
		}
		if (this.environmentObjects.length > 0) {
			const offscreenCutoff = 0 - this.trackSegmentLength;
			while (this.environmentObjects[0].position.z < offscreenCutoff) {
				const envToDestroy = this.environmentObjects.shift();
				scene.remove(envToDestroy);
				threejsDispose(envToDestroy);
			}
		}
		
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
