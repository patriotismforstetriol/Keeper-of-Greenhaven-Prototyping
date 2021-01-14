"use strict";

/* RUNNER GAME
three lanes, no corners, player must dodge or jump over obstacles.
The lanes run in the z-direction.
The player's x-coord moves to change lane.
The player's y-coord moves to jump.

*/


//FUNC: set up environment
let paused = true;
let scene = new THREE.Scene();
let container = document.getElementById('gamescreen');
let w = container.offsetWidth;
let h = container.offsetHeight;
let aspect = w/h;
let renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w,h);
container.appendChild(renderer.domElement);

//FUNC: set up camera
let camera = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
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

const leftlanebound = -1;
const rightlanebound = 1;
const gravity = -1;

// Jumping functionality : https://gamedev.stackexchange.com/questions/29617/how-to-make-a-character-jump
class Player {
	constructor(scene) {
		let geometry = new THREE.BoxBufferGeometry(0.5, 1.5, 0.5);
		let material = new THREE.MeshPhongMaterial( {color: 0x00aa33} );
		this.visual = new THREE.Mesh( geometry, material );
		scene.add( this.visual );
		this.jumping = false;
		this.lane = 0; // lanes -1, 0, 1 are valid.
		this.moveLane();
		this.yvelocity = 0;
		this.willjump = false;
	}
	
	moveLane() {
		this.visual.position.x = 0.7*this.lane;
	}
	
	startJumping() {
		if (!this.jumping) {
			this.yvelocity = 1.3;
			this.jumping = true;
		} else if (this.visual.position.y < 0.5) {
			this.willjump = true;
		}
	}
	
	update(deltaT) {
		//deltaT = deltaT / 100;
		if (this.jumping) {
			this.visual.position.y += this.yvelocity * (deltaT / 20);
			this.yvelocity += gravity * (deltaT / 20);
			
			if (this.visual.position.y <= 0) {
				this.visual.position.y = 0;
				this.jumping = false;
				this.yvelocity = 0;
				if (this.willjump) {
					this.willjump = false;
					this.startJumping();
				}
			} 
			
		}
		
	}
	
}

let p = new Player(scene);

const DISAPPEAR_POS = 3;
const PLATFORM_LEN = 3;


class PlatformTile {
	constructor(x, y, z) {
		let geometry = new THREE.BoxBufferGeometry(0.5, 0.5, PLATFORM_LEN);
		let material = new THREE.MeshPhongMaterial( {color: 0x777777} );
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.position.set(x, y, z);
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

class PlatformManager {
	constructor(rows) {
		this.rows = rows;
		this.lanes = 3;
		this.platforms = new Array(this.rows);
		for (var i = 0; i < this.rows; i++) {
			this.platforms[i] = new Array(this.lanes);
		}
		for (var i = 0; i < this.rows; i++) {
			for (var j = 0; j < this.lanes; j++) {
				this.platforms[i][j] = new PlatformTile(0.7*(j-1), -1, -i*PLATFORM_LEN + 2);
				//console.log(this.platforms[i][j].visual.position);
				
				//coloring for testing purposes
				if ((i+j)%2 == 0) {
					this.platforms[i][j].convertType(1);	
				}
			}
		}
		this.accel = 1;
		this.leadrow = 0;
	}
	
	update(deltaT) {
		// this works, but might be a bit more risky and a bit faster
		/*if (this.platforms[this.leadrow][0].visual.position.z > DISAPPEAR_POS) {
			for (var j = 0; j < this.lanes; j++) {
				this.platforms[this.leadrow][j].visual.position.z = -PLATFORM_LEN*(this.rows-1);
			}
			this.leadrow += 1;
			if (this.leadrow >= this.rows) {
				this.leadrow = 0;
			}
		}*/
		let moveby = 0.05 * deltaT * this.accel;
		for (var i = 0; i < this.rows; i++) {
			
			// check here if need to rotate the row
			let swap = false;
			if (this.platforms[i][0].visual.position.z > DISAPPEAR_POS) {
				swap = true;
			}
			for (var j = 0; j < this.lanes; j++) {
				this.platforms[i][j].visual.position.z += moveby;
				if (swap) {
					// move to just behind previous tile. previous tile must have been moved already.
					if (i == 0) {
						this.platforms[0][j].visual.position.z = 
							this.platforms[this.rows - 1][j].visual.position.z - PLATFORM_LEN + moveby; 
							// have to add moveby here because it hasn't been added to pos of last tile yet
					} else {
						// push them to the end
						this.platforms[i][j].visual.position.z = 
							this.platforms[i-1][j].visual.position.z - PLATFORM_LEN;
						//this.platforms[i][j].visual.position.z = -PLATFORM_LEN * (this.rows - 1);
					}
					
				}
				// make them move forwards
			}
		}
		this.accel += deltaT * 0.001;
	}
}

//let plat = new PlatformTile();
let plat = new PlatformManager(6);


function addMouseHandler(canvas) {
	//canvas.addEventListener('mousemove', function (e) {onMouseMove(e);}, false);
	//canvas.addEventListener('mousedown', function (e) {onMouseDown(e) }, false);
	//canvas.addEventListener('mouseup', function (e) {onMouseUp(e) }, false);
	//canvas.addEventListener('keyup', function (e) {onKeyUp(e) }, false);
	canvas.addEventListener('keydown', function (e) {onKeyDown(e) }, false);
}
addMouseHandler(window);


/*function onKeyUp(evt) {
	if (evt.code === 'Space' || evt.which === 32) {
		console.log("Space");
		player.move(0.001);
	}
	
}*/

function onKeyDown(evt) {
	/*if (p.jumping) {
		return;
	}*/ // if you want to ban moving while jumping
	if (evt.keyCode == 67) { // c, for testing purposes of PlatformTile
		console.log('Toggled pause');
		//plat.type = 1 - plat.type;
		//plat.convertType();
		//plat.update(10);
		paused = !paused;
	} else if (!paused) {
		if (evt.keyCode === 39) { // right arrow
			console.log('right');
			if (p.lane + 1 <= rightlanebound) {
				p.lane += 1;
				p.moveLane();
			}
		} else if (evt.keyCode === 37) { // left arrow
			console.log('left');
			if (p.lane - 1 >= leftlanebound) {
				p.lane -= 1;
				p.moveLane();
			}
		} else if (evt.keyCode === 38) { // up arrow
			console.log('up');
			p.startJumping();
		} 
	}
}


const perfectFrameTime = 1000/60; //https://stackoverflow.com/questions/13996267/loop-forever-and-provide-delta-time
let lastTimestamp = 0;
let deltaTime = 0;

function update(timestamp) {
	deltaTime = (timestamp - lastTimestamp) / perfectFrameTime;
	lastTimestamp = timestamp;
}

function animate() {
	update(Date.now());
	
	if (!paused) {
		p.update(deltaTime);
		//console.log(deltaTime);
		plat.update(deltaTime);
	}
	
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}

animate();
            

			