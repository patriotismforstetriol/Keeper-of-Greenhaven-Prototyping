"use strict";

/* RUNNER GAME
three lanes, no corners, player must dodge or jump over obstacles.
The lanes run in the z-direction.
The player's x-coord moves to change lane.
The player's y-coord moves to jump.

*/
// constants required for the game.
const LEFT_BOUND = -1;
const RIGHT_BOUND = 1;
const GRAVITY = -1;
const DISAPPEAR_POS = 3;
const PLATFORM_LEN = 3;

// Jumping functionality : https://gamedev.stackexchange.com/questions/29617/how-to-make-a-character-jump
/** Class that represents the player's character in the runner game.*/
const RunnerStateEnum = Object.freeze({sRun:0, sJump:1, sSlide:2});
class Runner {
	constructor() {
		let geometry = new THREE.BoxBufferGeometry(0.5, 1.5, 0.5);
		let material = new THREE.MeshPhongMaterial( {color: 0x00aa33} );
		this.visual = new THREE.Mesh( geometry, material );
		//this.visual.onBeforeRender = this.extrapolate;
		//this.visual.onAfterRender = this.deextrapolate;
		scene.add( this.visual );
		this.state = RunnerStateEnum.sRun;
		this.lane = 0; // lanes -1, 0, 1 are valid.
		this.yvelocity = 0;
		this.slidetime = 0;
		this.nextState = RunnerStateEnum.sRun;
	}
	
	moveLane() {
		this.visual.position.x = 0.7*this.lane;
	}
	
	startJumping() {
		if (this.state == RunnerStateEnum.sRun) {
			this.yvelocity = 1.3;
			this.state = RunnerStateEnum.sJump;
			this.nextState = RunnerStateEnum.sRun;
		} else if ((this.visual.position.y < 0.5 && this.visual.position.y > 0) || this.slidetime > 500) {
			this.nextState = RunnerStateEnum.sJump;
		}
	}
	
	startSliding() {
		if (this.state == RunnerStateEnum.sRun) {
			this.visual.position.y = -0.5;
			this.state = RunnerStateEnum.sSlide;
			this.nextState = RunnerStateEnum.sRun;
		} else if ((this.visual.position.y < 0.5 && this.visual.position.y > 0) || this.slidetime > 500) {
			this.nextState = RunnerStateEnum.sSlide;
		}
	}
	
	update() {
		if (this.state == RunnerStateEnum.sJump) {
			this.visual.position.y += this.yvelocity * 0.004 * MS_PER_UPDATE; //0.004 is just a tested factor
			this.yvelocity += GRAVITY * 0.003 * MS_PER_UPDATE;
			
			if (this.visual.position.y <= 0) {
				this.visual.position.y = 0;
				this.yvelocity = 0;
				this.update_state();
			} 
			
		} else if (this.state == RunnerStateEnum.sSlide) {
			this.slidetime += MS_PER_UPDATE;
			if (this.slidetime > 600) {
				this.visual.position.y = 0;
				this.slidetime = 0;
				this.update_state();
			}
		}
	}
	
	update_state() {
		this.state = RunnerStateEnum.sRun;
		if (this.nextState == RunnerStateEnum.sJump) {
			this.startJumping();
		} else if (this.nextState == RunnerStateEnum.sSlide) {
			this.startSliding();
		}
	}
	
	extrapolate(lag) {
		if (this.jumping) {
			this.visual.position.y += this.yvelocity * 0.004 * lag; //0.004 is just a tested factor
		}
	}
	
	deextrapolate(lag) {
		if (this.jumping) {
			this.visual.position.y -= this.yvelocity * 0.004 * lag; //0.004 is just a tested factor
		}
	}
	
}

/** Class that represents one tile on one lane. Is continually rotated through and obstacle status swapped out. */
class PlatformTile {
	constructor(x, y, z, mesh) {
		let geometry = new THREE.BoxBufferGeometry(0.5, 0.5, PLATFORM_LEN);
		let material = new THREE.MeshPhongMaterial( {color: 0x777777} );
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.position.set(x, y, z);
		//this.visual = mesh;
		//this.visual.position.set(x, y, z);
		scene.add(this.visual);
		
		
		this.type = 0;
		this.convertType(0);
	}
	
	convertType(toType) {
		this.type = toType;
		switch (this.type) {
			case 0:
				this.visual.material.color.setHex(0xff0000);
				break;
			case 1:
				this.visual.material.color.setHex(0x0000ff);
				break;
			default:
				this.visual.material.color.setHex(0x777777);
		}
	}
}

class Obstacle {
	constructor(x, y, z) {
		let geometry = new THREE.BoxBufferGeometry(0.5, 0.5, 0.5); // cube
		let material = new THREE.MeshPhongMaterial( {color: 0xffff00} ); // yellow
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.position.set(x, y, z);
		scene.add(this.visual);
	}
}

/** Class to control the ground and obstacles of the course. */
class PlatformManager {
	constructor(rows, baseTiles, obstacleTiles) {
		this.baseTiles = baseTiles;
		this.obstacleTiles = obstacleTiles;
		this.rows = rows;
		this.lanes = 3;
		this.platforms = new Array(this.rows);
		for (var i = 0; i < this.rows; i++) {
			this.platforms[i] = new Array(this.lanes);
		}
		for (var i = 0; i < this.rows; i++) {
			for (var j = 0; j < this.lanes; j++) {
				//this.platforms[i][j] = new PlatformTile(0.7*(j-1), -1, -i*PLATFORM_LEN + 2, this.baseTiles.clone());
				this.platforms[i][j] = new PlatformTile(0.7*(j-1), -1, -i*PLATFORM_LEN + 2);
				
				//coloring for testing purposes
				if ((i+j)%2 == 0) {
					this.platforms[i][j].convertType(1);	
				}
			}
		}
		this.accel = 0.05;
		this.leadrow = 0;
		
		this.obstacles = [];
	}
	
	update() {
		let moveby = 0.04 * MS_PER_UPDATE * this.accel;
		for (var i = 0; i < this.rows; i++) {
			
			// check here if need to rotate the row
			let swap = false;
			if (this.platforms[i][0].visual.position.z > DISAPPEAR_POS) {
				swap = true;
				console.log(this.obstacles);
				this.addObstacle();
			}
			for (var j = 0; j < this.lanes; j++) {
				this.platforms[i][j].visual.position.z += moveby;
				if (swap) {
					// move to just behind previous tile. previous tile must have been moved already.
					if (i == 0) {
						this.platforms[0][j].visual.position.z = 
							this.platforms[this.rows - 1][j].visual.position.z - PLATFORM_LEN + moveby; 
							// have to add movement here because it hasn't been added to pos of last tile yet
					} else {
						// push them to the end
						this.platforms[i][j].visual.position.z = 
							this.platforms[i-1][j].visual.position.z - PLATFORM_LEN;
					}
					
				}
			}
		}
		this.accel += 0.0001; // this is obviously too fast to accelerate but
		
		// update obstacle positions
		let ntoclear = 0;
		for (let i = 0; i < this.obstacles.length; ++i) {
			if (this.obstacles[i].visual.position.z > DISAPPEAR_POS) {
				ntoclear ++;
			} else {
				this.obstacles[i].visual.position.z += moveby;
			}
		}
		for (let i = 0; i < ntoclear; ++i) {
			this.obstacles.shift();
		}
		
	}
	
	addObstacle() {
		if (Math.random() > 0.5) { //50% chance of generating one this row
			const lane = Math.floor((Math.random() * this.lanes)); // choose a lane at random
			this.obstacles.push(new Obstacle(0.7*(lane-1),
								-0.5,-this.rows * PLATFORM_LEN + 2)); //put it at the current end
		}
	}
	
	extrapolate(lag) {
		for (var i = 0; i < this.rows; i++) {
			for (var j = 0; j < this.lanes; j++) {
				this.platforms[i][j].visual.position.z += 0.04 * this.accel * lag;
			}
		}
	}
	
	deextrapolate(lag) {
		for (var i = 0; i < this.rows; i++) {
			for (var j = 0; j < this.lanes; j++) {
				this.platforms[i][j].visual.position.z -= 0.04 * this.accel * lag;
			}
		}
	}
}

/** Class to handle clicks that relate to the Player */
class RunnerInput {
	constructor(runner) {
		this.runner = runner; // the player that this instance passes its click events to
	}
	
	/**Event handler for certain key presses. */
	onKeyDown(evt) {
		if (evt.keyCode == 67) { // c, for testing purposes of PlatformTile
			console.log('Toggled pause');
			paused = !paused;
		} else if (!paused) {
			if (evt.keyCode === 39) { // right arrow
				console.log('right');
				if (this.runner.lane + 1 <= RIGHT_BOUND) {
					this.runner.lane += 1;
					this.runner.moveLane();
				}
			} else if (evt.keyCode === 37) { // left arrow
				console.log('left');
				if (this.runner.lane - 1 >= LEFT_BOUND) {
					this.runner.lane -= 1;
					this.runner.moveLane();
				}
			} else if (evt.keyCode === 38) { // up arrow
				console.log('up');
				this.runner.startJumping();
			} else if (evt.keyCode === 40) { // down arrow
				console.log('down');
				this.runner.startSliding();
			}
		}
	}
};


/* Global vars needed because the animate() function wants to use them.*/
let camera, scene, renderer, container;
let runner, platform, paused;

function setup() {
	//FUNC: set up environment
	scene = new THREE.Scene();
	container = document.getElementById('gamescreen');
	let w = container.offsetWidth;
	let h = container.offsetHeight;
	let aspect = w/h;
	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(w,h);
	container.appendChild(renderer.domElement);

	//FUNC: set up camera
	camera = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
	let d = 4;
	//camera.zoom = 1;
	camera.position.set(0, d, d);
	camera.lookAt(scene.position);
	camera.position.z = d-2; // so that player is lower on screen.
	camera.updateProjectionMatrix();

	// FUNC: set up lights
	let AmbiLight = new THREE.AmbientLight( 0x404040 , 3); // soft white light
	scene.add( AmbiLight );
	let directionalLight = new THREE.DirectionalLight( 0xffffff, 0.2);
	directionalLight.position.set(0,2*d,d);
	scene.add( directionalLight );

	paused = true;
	
	runner = new Runner();
	platform = new PlatformManager(6);
	
	const inputHandler = new RunnerInput(runner);
	const addMouseHandler = function(canvas) {
		canvas.addEventListener('keydown', function (e) {inputHandler.onKeyDown(e) }, false);
	}
	addMouseHandler(window);
	
	
	/*const loader = new THREE.GLTFLoader();
	loader.load( 'obstacles.glb', function ( gltf ) {				
		// Add in the scene.
		const base = gltf.scene.children.filter(obj => obj.name === 'Tile')[0];
		const blocks = gltf.scene.children.splice(gltf.scene.children.indexOf(base), 1);
		
		
	});*/
	
	
	
}


/* Global vars used by game loop.
Reference: Fixed update, variable render pattern from: http://gameprogrammingpatterns.com/game-loop.html */
const MS_PER_UPDATE = 1000/60; // 60 updates per sec
let lastTimestamp = 0;
let lag = 0; // lag saves the amount of time we haven't run update() on.

/** Function that runs continually and contains game loop.*/
function animate() {
	// Find how much time has passed
	const currentTime = Date.now();
	lag += (currentTime - lastTimestamp);
	lastTimestamp = currentTime;
	
	// Do the updates in fixed time steops of MS_PER_UPDATE
	while (lag >= MS_PER_UPDATE) {
		update();
		lag -= MS_PER_UPDATE;
	}
	
	extrapolate(lag);
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
	deextrapolate(lag);
}

/** Function that updates in-world events every MS_PER_UPDATE. To make this OO, give this to
a game manager that has a list of all players/things to update*/
function update() {
	if (!paused) {
		runner.update();
		platform.update();
	}
}

function extrapolate(lag) {
	if (!paused) {
		runner.extrapolate(lag);
		platform.extrapolate(lag);
	}
}

function deextrapolate(lag) {
	if (!paused) {
		runner.deextrapolate(lag);
		platform.deextrapolate(lag);
	}
}

setup();
lastTimestamp = Date.now();
animate();		