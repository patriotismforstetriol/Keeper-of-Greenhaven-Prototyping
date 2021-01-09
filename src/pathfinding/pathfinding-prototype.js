"use strict";

class PlayerInput {
	paused = false;
	mouseclick = false;
	player = null;
	helper = null;
	
	/*set player(p) {
		this.player = p;
	}*/
					
	/*set pause(bool) {
		this.paused = bool;
	}*/
	
	newClick(evt) {
		if (!this.paused) {
			const worldpos = PlayerInput.mousetoworld(evt.x, evt.y);
			this.player.dealWithClick(worldpos);
			
			if (this.helper != null) {
				this.helper.onClick(worldpos);
			}
		}
	}
	
	static mousetoworld (mx, my) {
		let mxnorm = (mx / container.offsetWidth) * 2 - 1;
		let mynorm = -(my / container.offsetHeight) * 2 + 1;

		let groundpos = new THREE.Vector3(mxnorm, mynorm, 1);
		camera.updateMatrixWorld(); // global perspective camera
		groundpos.unproject(camera).normalize();
		//find scale that will make sum of camera pos vect and this angled vect flat to ground
		groundpos.multiplyScalar(camera.position.y / groundpos.y);
		let pos = new THREE.Vector3();
		groundpos.sub(camera.getWorldPosition(pos));
		
		pos.set(-groundpos.x, 0, -groundpos.z);
		return pos;
	}
	
	onMouseDown(evt) {
		if (evt.target==renderer.domElement) {
			this.mouseclick = true;
			this.newClick(evt);
		}
	}

	onMouseUp(evt) {
		this.mouseclick = false;
	}

	onMouseMove(evt) {
		evt.preventDefault();
		if (this.mouseclick && evt.target==renderer.domElement) {
			this.newClick(evt);
		}
	}
};

const NodeStateEnum = Object.freeze({nOpen:0, nFull:2, nBlocked:1});
class PathTerrain {
	constructor(xlimits, zlimits, divisions) {
		this.xlimits = xlimits;
		this.zlimits = zlimits;
		this.cellxlen = (this.xlimits[1] - this.xlimits[0])/divisions; 
		this.cellzlen = (this.zlimits[1] - this.zlimits[0])/divisions;
		this.divisions = divisions;

		this.nodes = new PF.Grid(divisions, divisions);
		this.finder = new PF.AStarFinder({
							allowDiagonal: true,
							dontCrossCorners: true,
							heuristic: PF.Heuristic.manhattan
						});
						
		this.helper = null;

	};
	
	_findAxisOverlap(minmax, limits, celllen) {
		var dmin = Math.floor( (minmax[0] - limits[0])/celllen );
		var dmax = Math.ceil( (minmax[1] - limits[0])/celllen );
		return [dmin, dmax];

	};
	
	switchOverlapCells(xlims, zlims, tostate) {
		var xindices = this._findAxisOverlap(xlims, this.xlimits, this.cellxlen );
		var zindices = this._findAxisOverlap(zlims, this.zlimits, this.cellzlen );
		
		if (xindices.length === 0 || zindices.length === 0) {
			console.log("empty");
			return null;
		}
		
		let walkable = (tostate == NodeStateEnum.nOpen) ? true : false;
		
		for (var i = xindices[0]; i < xindices[1]; i++) {
			for (var j = zindices[0]; j < zindices[1]; j++) {
				this.nodes.setWalkableAt(i, j, walkable);
			}
		}

	};
	
	getPath(frompos, topos) {
		// get the path
		let startcell = this._convertVectortoCell(frompos);
		let endcell = this._convertVectortoCell(topos);

		try {
			let gridbackup = this.nodes.clone();
			let p1 = this.finder.findPath(startcell[0], startcell[1], endcell[0], endcell[1], gridbackup);
			let pathcells = PF.Util.smoothenPath(gridbackup, p1);
			
			let pathpos = [];
			if (pathcells.length > 0) {
				for (let i = 1; i < pathcells.length - 1; i++) {
					frompos = this._convertCelltoVector( pathcells[i] );
					pathpos.push(frompos);
				}
				pathpos.push(topos);
			}
			
			if (this.helper != null) {
				this.helper.display(pathpos);
			}
			
			return pathpos;
		} catch (TypeError) {
			return []; // A TypeError usually means the click is outside our bounds.
		}
	}
	
	_convertVectortoCell(vect) {
		var x = Math.round(( vect.x - this.xlimits[0] ) / this.cellxlen);
		var z = Math.round(( vect.z - this.zlimits[0] ) / this.cellzlen);
		return [x,z];
	}
	
	_convertCelltoVector(cell) {
		let vec = new THREE.Vector3();
		vec.x = this.xlimits[0] + cell[0]*this.cellxlen + 0.5*this.cellxlen;
		vec.z = this.zlimits[0] + cell[1]*this.cellzlen + 0.5*this.cellzlen;
		return vec;
	}
	
	static gridify(floor, walls, divisions) {
		// FUNC: constructs the pathfinding grid from 3D model objects
		floor.geometry.computeBoundingBox();
		let bound_box = floor.geometry.boundingBox;
		const terrain = new PathTerrain([bound_box.min.x, bound_box.max.x], 
				[bound_box.min.z, bound_box.max.z], divisions);
		
		// make obstacles impassable
		for (let i = 0; i < walls.length; i++) {
			walls[i].geometry.computeBoundingBox();
			bound_box = walls[i].geometry.boundingBox;
			terrain.switchOverlapCells([bound_box.min.x, bound_box.max.x], 
					[bound_box.min.z, bound_box.max.z], NodeStateEnum.nBlocked);
		}
		return terrain;	
	}
	
};

class PlayerCombatant {
	constructor(appearance, floor=null) {
		// character is a 3D model located on an invisible axis object
		this.axis = new THREE.Object3D();
		this.appearance = appearance;
		this.axis.add(this.appearance);
		scene.add(this.axis);
		this.axis.position.set(0,0,0);
		this.axis.add(camera);
		
		// what grid are we currently travelling on/using?
		this.floor = floor;
		
		this.path = null; // array of vectors that make up the path
		this.arrivalDist = 1; //the close-enough distance for reaching each node on the path
		this.maxSpeed = 10;
		this.velocity = new THREE.Vector3(0,0,0);
	}
	
	dealWithClick(clicked_pos) {
		const my_pos = new THREE.Vector3();
		this.axis.getWorldPosition(my_pos);
		
		const p = this.floor.getPath(my_pos, clicked_pos);
		if (p.length != 0) {
			this.path = p;
		}
	}
	
	updateAppearance(newmesh) {
		this.axis.remove(this.appearance);
		this.appearance = newmesh;
		this.axis.add(this.appearance);
	}
	
	updateFloor(f) {
		this.floor = f;
		this.arrivalDist = f.cellxlen / 2;
	}
	
	do_pathfollowing(deltaT) {
		if (this.path != null && this.path.length > 0) {
			let position = new THREE.Vector3();
			this.axis.getWorldPosition(position);
			
			let steer = new THREE.Vector3();
			steer.copy(this.path[0]); // currently contains the target pos
			
			let dist = steer.distanceToSquared( position );
			
			// Are we close enough to the next node to start looking at the one after it?
			if ( dist < this.arrivalDist) {
				if (this.path.length > 1) {
					this.path.shift();
				} else {
					if (dist < this.arrivalDist * deltaT) {
						this.axis.position.set(steer.x, steer.y, steer.z);
						this.path.shift();
						return;
					}
				}
			}
			
			// get the steered direction
			steer.sub(position);
			// cut it to length to match the desired velocity
			steer.normalize();
			steer.multiplyScalar(deltaT * this.maxSpeed);
			// add the effect of current velocity/inertia
			steer.sub(this.velocity);
			
			// update our overall current velocity
			this.velocity.add(steer);
			this.velocity.clampLength(0, deltaT * this.maxSpeed);
			
			// get our final position. Set our position and angling to match
			let newpos = position;
			newpos.add(this.velocity);
			
			this.axis.position.set(newpos.x, newpos.y, newpos.z);
			this.appearance.lookAt(position.add(this.velocity));
		}
	}
};

// Click in-world location helper.
class InputHelper {
	constructor() {
		this.mousegeo = new THREE.SphereGeometry(0.1,8,6);
		this.mousemat = new THREE.MeshPhongMaterial( {color: 0xffaaff});
		this.mousesph = new THREE.Mesh( this.mousegeo, this.mousemat );
		scene.add( this.mousesph);
	}
	
	onClick(worldpos) {
		this.mousesph.position.set(worldpos.x, 0, worldpos.z);
	}
};

/**
 *
 */
class PathTerrainHelper {
	constructor(xsize = 10, zsize = 10, divisions = 10, cells_walkable=null) {
		
		// Create the grid
		const xstep = xsize / divisions;
		const zstep = zsize / divisions;
		const halfX = xsize / 2; // midpoint in x-direction
		const halfZ = zsize / 2; // midpoint in z-direction
		const yh = 0.1; // height of the helper. 
		const vertices = [];
		for (let i = 0, j = 0, currentx = -halfX, currentz = -halfZ; 
				i <= divisions; i++, currentx+= xstep, currentz += zstep) {
			// push, as sets of three numbers:
			// two z-parallel points, to make a line segment in the z-direction
			vertices.push(- halfX, yh, currentz, halfX, yh, currentz);
			// two x-parallel points, to make a line segment in the x-direction
			vertices.push(currentx, yh, -halfZ, currentx, yh, halfZ);
		}
		
		const grid = new THREE.BufferGeometry();
		grid.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		const grid_material = new THREE.LineBasicMaterial( { color: 0x444444 });
		scene.add(new THREE.LineSegments( grid, grid_material ));

		// Create red lines to highlight impassable cells
		if (cells_walkable != null) { // if the array is not empty
			if (cells_walkable.length != divisions) {
				console.log("Wrong length cells_walkable array\n");
				return;
			}
			const crossvertices = [];
			for (let i = 0; i < divisions; i++) {
				if (cells_walkable[i].length != divisions) {
					console.log("Wrong length cells_walkable array\n");
					return;
				}
				for (let j = 0; j < divisions; j++) {
					if (!cells_walkable[j][i]) {
						crossvertices.push(- halfX + i*xstep, yh, - halfZ + (j+1)*zstep, - halfX + (i+1)*xstep, yh, - halfZ + j*zstep);
					}
				}
			}
			const cross_geom = new THREE.BufferGeometry();
			cross_geom.setAttribute( 'position', new THREE.Float32BufferAttribute( crossvertices , 3 ) );
			const cross_mat = new THREE.LineBasicMaterial( { color: 0xff0033 });
			const crosses = new THREE.LineSegments(cross_geom, cross_mat);
			scene.add(crosses); // uses global var `scene`
		}
		
		this.type = 'PathingHelper';
		
		// Create the array that will hold our path display helper
		this.flags = [];	
		
	}
	
	static constructFromTerrain(terrain) {
		let passables = Array.from(Array(terrain.divisions), () => new Array(terrain.divisions));
		for (let i = 0; i < terrain.divisions; i++) {
			for (let j = 0; j < terrain.divisions; j++) {
				passables[i][j] = terrain.nodes.nodes[i][j].walkable;
			}
		}
		
		const helper = new PathTerrainHelper(
				terrain.xlimits[1] - terrain.xlimits[0], 
				terrain.zlimits[1] - terrain.zlimits[0],
				terrain.divisions, passables);
		return helper;
	}
	
	addPoint(x, z) {
		let geom = new THREE.SphereBufferGeometry(0.1,8,6);
		let mater = new THREE.MeshPhongMaterial({color: 0x44ffff});
		this.flags.push(new THREE.Mesh(geom, mater));
		scene.add(this.flags[this.flags.length - 1]);
		this.flags[this.flags.length - 1].position.set(x, 0, z);
	}
	
	removePoint(index) {
		let removed = this.flags.splice(index, 1);
		scene.remove(removed[0]);
	}
	
	clear_flags() {
		let n_pts = this.flags.length;
		for (let i = 0; i < n_pts; i++) {
			this.removePoint(0);
		}
	}
	
	display(path) {
		// path should be an array of Vector3s
		this.clear_flags();
		
		for (let i = 0; i < path.length; i++) {
			this.addPoint(path[i].x, path[i].z);
		}
		
	}
};


let camera, scene, renderer, container;
const playerInputController = new PlayerInput();

function setup() {
	/*FUNC: set up environment*/
	scene = new THREE.Scene();

	container = document.getElementById('gamescreen');
	const w = container.offsetWidth;
	const h = container.offsetHeight;

	/*FUNC: set up camera*/
	camera = new THREE.PerspectiveCamera(60, w/h, 1, 1000);
	const d = 4;
	camera.position.set(d, d, d); // real camera
	camera.lookAt(scene.position);
	camera.updateProjectionMatrix();

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(w,h);
	container.appendChild(renderer.domElement);
					
	// FUNC: set up lights
	const AmbiLight = new THREE.AmbientLight( 0x404040 , 3); // soft white light
	scene.add( AmbiLight );
	const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.2);
	directionalLight.position.set(0,2*d,0);
	scene.add( directionalLight );
	
	// FUNC: set up player
	const sph = new THREE.SphereGeometry(0.5, 8, 6);
	const mat = new THREE.MeshPhongMaterial( {color: 0x006400});
	const player = new PlayerCombatant(new THREE.Mesh( sph, mat ));	
	
	// FUNC: set up input handling
	playerInputController.player = player;
	const addMouseHandler = function (canvas) {
		canvas.addEventListener('mousemove', function (e) {playerInputController.onMouseMove(e);}, false);
		canvas.addEventListener('mousedown', function (e) {playerInputController.onMouseDown(e) }, false);
		canvas.addEventListener('mouseup', function (e) {playerInputController.onMouseUp(e) }, false);
		canvas.addEventListener('keyup', function (e) {playerInputController.onKeyUp(e) }, false);
	}
	addMouseHandler(window);
	// ADDS A HELPER
	playerInputController.helper = new InputHelper();
	
	// FUNC: Load environment from file	
	const loader = new THREE.GLTFLoader();
	loader.load( 'trial-bg-parts.glb', function ( gltf ) {				
		// Add in the scene.
		scene.add(gltf.scene);
		const env = gltf.scene.children.filter(obj => obj.name === 'floor')[0];
		const blocks = gltf.scene.children.filter(obj => obj.name.includes('wall'));
		player.updateAppearance(gltf.scene.children[0]);
		
		// Get the pathfinding grid
		const floor = PathTerrain.gridify(env, blocks, 30);
		player.updateFloor(floor);
		
		// ADDS A HELPER
		floor.helper = PathTerrainHelper.constructFromTerrain(floor);
	});
}

function animate() {
	update(Date.now());
	playerInputController.player.do_pathfollowing(deltaTime / 200 );
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}


const perfectFrameTime = 1000/60; //https://stackoverflow.com/questions/13996267/loop-forever-and-provide-delta-time
let lastTimestamp = 0;
let deltaTime = 0;

function update(timestamp) {
	deltaTime = (timestamp - lastTimestamp) / perfectFrameTime;
	lastTimestamp = timestamp;
}

setup();
animate();