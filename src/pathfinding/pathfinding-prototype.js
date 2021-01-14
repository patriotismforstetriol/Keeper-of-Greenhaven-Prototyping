"use strict";

/** Class to handle clicks that relate to the Player */
class PlayerInput {
	paused = false; // if paused is true, then clicks are ignored.
	mouseclick = false; // true if the mouse button is being held down
	player = null; // the player that this instance passes its click events to
	helper = null; // optional: helper to display in-world click position.
	
	/** Handler for a click event that the player should deal with.*/
	newClick(evt) {
		if (!this.paused) {
			const worldpos = PlayerInput.mousetoworld(evt.x, evt.y);
			this.player.dealWithClick(worldpos);
			
			if (this.helper != null) {
				this.helper.onClick(worldpos);
			}
		}
	}
	
	/** Function to convert screen x,y to world x,z*/
	static mousetoworld (mx, my) {
		// get the % across the screen where the click falls
		const mxnorm = (mx / container.offsetWidth) * 2 - 1;
		const mynorm = -(my / container.offsetHeight) * 2 + 1;

		const groundpos = new THREE.Vector3(mxnorm, mynorm, 1);
		camera.updateMatrixWorld(); // uses global var
		groundpos.unproject(camera).normalize();
		//find scale that will make sum of camera pos vect and this angled vect flat to ground
		groundpos.multiplyScalar(camera.position.y / groundpos.y);
		const pos = new THREE.Vector3();
		groundpos.sub(camera.getWorldPosition(pos));
		
		pos.set(-groundpos.x, 0, -groundpos.z);
		return pos;
	}
	
	/** Mouse event handler for when mouse is clicked. */
	onMouseDown(evt) {
		if (evt.target==renderer.domElement) {
			this.mouseclick = true;
			this.newClick(evt);
		}
	}

	/** Mouse event handler for when mouse is unclicked.*/
	onMouseUp(evt) {
		this.mouseclick = false;
	}

	/** Mouse event handler for the event where the mouse is being dragged.*/
	onMouseMove(evt) {
		//evt.preventDefault();
		if (this.mouseclick && evt.target==renderer.domElement) {
			this.newClick(evt);
		}
	}
};

const NodeStateEnum = Object.freeze({nOpen:0, nFull:2, nBlocked:1});
/** Class to handle the non-visible features of terrain on which Combatants can move.*/
class PathTerrain {
	/** Constructor for a fully-walkable terrain of a given size.
	 * @see constructFromTerrain() for a different option
	 *
	 * @param xlimits an array of the in-world x max and in-world x min values of the
	 * terrain.
	 * @param zlimits an array of the in-world z max and in-world z min values of the
	 * terrain.
	 * @param divisions the number of slices/cells. Same in both the x and z directions.
	 */
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
	
	/** Find the minimum and maximum cell number that overlap with the parameter.
	*
	* Returns the range of cell numbers that the range minmax would at least partly cover. 
	*
	* Can be used for either x or z axis.
	*
	* @param minmax array of 2 in-world coordinates (min, then max).
	* @param limits this.xlimits or this.zlimits
	* @param celllen this.cellxlen or this.cellzlen
	*/
	_findAxisOverlap(minmax, limits, celllen) {
		var dmin = Math.floor( (minmax[0] - limits[0])/celllen );
		var dmax = Math.ceil( (minmax[1] - limits[0])/celllen );
		return [dmin, dmax];

	};
	
	/** Set the walkability of each cell that is at least partly covered by the 
	* square made by xlims[0], xlims[1], zlims[0] and zlims[1] to tostate.
	*
	* @param xlims array of 2 in-world coordinates (min, then max).
	* @param zlims array of 2 in-world coordinates (min, then max).
	* @param tostate a NodeStateEnum saying what to switch the cells to.
	*/
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
	
	/** Do pathfinding from frompos to topos. Return it as an array of in-world
	 * vectors. 
	 *
	 * frompos and topos should be Vector3s
	 */
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
	
	/** Converts a Vector3 to an [x,z] array representing a cell in the pathfinding grid.*/
	_convertVectortoCell(vect) {
		var x = Math.round(( vect.x - this.xlimits[0] ) / this.cellxlen);
		var z = Math.round(( vect.z - this.zlimits[0] ) / this.cellzlen);
		return [x,z];
	}
	
	/** Converts an [x,z] array representing a cell in the pathfinding grid to a Vector3.*/
	_convertCelltoVector(cell) {
		let vec = new THREE.Vector3();
		vec.x = this.xlimits[0] + cell[0]*this.cellxlen + 0.5*this.cellxlen;
		vec.z = this.zlimits[0] + cell[1]*this.cellzlen + 0.5*this.cellzlen;
		return vec;
	}
	
	/** Constructor for a terrain based on a set of loaded 3D models.
	 *
	 * @param floor the singular model spanning all walkable areas. Its bounding box
	 * will be used as the size of the grid.
	 * @param walls an array of models containing items that players should not be able
	 * to walk through. Cells overlapping their bounding boxes will be made impassable.
	 * @param divisions the number of slices/cells. Same in both the x and z directions.
	 * @returns a new PathTerrain instance created from these models
	 */
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

/** Class representing the player. */
class PlayerCombatant {
	/** Construct a player. 
	 *
	 * @param appearance the starting Object3D representing the player.
	 * @param floor the PathTerrain the player can travel on. If not set here,
	 * need to @see updateFloor() before being able to deal with clicks.
	 */
	constructor(appearance, floor=null) {
		// character is a 3D model located on an invisible axis object
		// this is so that character can rotate without camera rotating too
		this.axis = new THREE.Object3D();
		//this.axis.onBeforeRender = this.extrapolate; // doesn't work
		this.appearance = appearance;
		this.position = new THREE.Vector3();
		this.axis.add(this.appearance);
		scene.add(this.axis);
		this.axis.position.set(0,0,0);
		this.axis.add(camera); // make camera stay still relative to axis.
		
		// what grid are we currently travelling on/using?:
		this.floor = floor;
		
		this.path = null; // array of vectors that make up the path
		this.maxSpeed = 0.005 * MS_PER_UPDATE;
		this.arrivalDist = this.maxSpeed * this.maxSpeed; //the close-enough distance for reaching each node on the path
		this.velocity = new THREE.Vector3(0,0,0);
	}
	
	/** Get a new path based on a new clicked position on the map. 
	* Needs to have this.floor set. */
	dealWithClick(clicked_pos) {
		const my_pos = new THREE.Vector3();
		this.axis.getWorldPosition(my_pos);
		
		const p = this.floor.getPath(my_pos, clicked_pos);
		if (p.length != 0) {
			this.path = p;
		}
	}
	
	/** Swap out the player's 3D model for a new one.*/
	updateAppearance(newmesh) {
		this.axis.remove(this.appearance);
		this.appearance = newmesh;
		this.axis.add(this.appearance);
	}
	
	/** Swap out the players PathTerrain for a new one.*/
	updateFloor(f) {
		this.floor = f;
		this.arrivalDist = Math.min(f.cellxlen / 2, this.maxSpeed * this.maxSpeed);
	}
	
	/** At timesteps of MS_PER_UPDATE, move along the path using path following behaviour.
	* https://gamedevelopment.tutsplus.com/tutorials/understanding-steering-behaviors-path-following--gamedev-8769 */
	do_pathfollowing() {
		if (this.path != null && this.path.length > 0) {
			let position = this.position.clone();
			
			let steer = new THREE.Vector3();
			steer.copy(this.path[0]); // currently contains the target pos
			
			let dist = steer.distanceToSquared( position );
			
			// Are we close enough to the next node to start looking at the one after it?
			if ( dist < this.arrivalDist) {
				if (this.path.length > 1) {
					this.path.shift();
				} else {
					if (dist < this.velocity.length()) {
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
			steer.multiplyScalar(this.maxSpeed);
			// add the effect of current velocity/inertia
			steer.sub(this.velocity);
			
			// update our overall current velocity
			this.velocity.add(steer);
			this.velocity.clampLength(0, this.maxSpeed);
			
			// get our final position. Set our position and angling to match
			let newpos = position;
			newpos.add(this.velocity);
			
			this.position.set(newpos.x, newpos.y, newpos.z);
			this.axis.position.set(newpos.x, newpos.y, newpos.z);
			this.appearance.lookAt(position.add(this.velocity));
		} else {
			this.velocity.set(0,0,0);
		}
	}
	
	/** Move the player a little further along their velocity vector, when we need 
	* to extrapolate because the current render time is a bit beyond the current
	* update status. */
	/*extrapolate(lagfraction) {
		if (this.velocity.length() > 0) {
			const movement = this.velocity.clone();
			movement.multiplyScalar(lagfraction);
			this.axis.position.add(movement); 	
		}
	}*/
};

/** Class representing the position of the last click in-world as a small sphere.
 Set the .helper of PlayerInput to this to have it show up.*/
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

/** Class visualising a PathTerrain instance. Set .helper of a PathTerrain to one
 * of these to have it show up.
 *
 * Displays:
 * 1. A grey grid showing the cells in the PathTerrain's pathfinding grid.
 * 2. Red crosses across non-walkable cells in the PathTerrain's pathfinding grid.
 * 3. Blue spheres representing the nodes of the lates path the PathTerrain generated.
 */
class PathTerrainHelper {
	/** Basic constructor for this helper. @see constructFromTerrain() for 
	* an alternative.
	* 
	* @param xsize the length in the x-direction of the PathTerrain.
	* @param zsize the length in the z-direction of the PathTerrain.
	* @param divisions number of cells in each direction
	* @param cells_walkable a divisions by divisions array contain 
	* true/false entries for each cell's walkability. 
	*/
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
	
	/** Constructor to make the helper belonging to a specific PathTerrain.
	*
	* @returns the new PathTerrainHelper
	*/
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
	
	/** Add an in-world coordinate to the list of blue spheres that display a path.*/
	_addPoint(x, z) {
		let geom = new THREE.SphereBufferGeometry(0.1,8,6);
		let mater = new THREE.MeshPhongMaterial({color: 0x44ffff});
		this.flags.push(new THREE.Mesh(geom, mater));
		scene.add(this.flags[this.flags.length - 1]);
		this.flags[this.flags.length - 1].position.set(x, 0, z);
	}
	
	/** Remove the entry at index from the list of blue spheres that display a path.*/
	_removePoint(index) {
		let removed = this.flags.splice(index, 1);
		scene.remove(removed[0]);
	}
	
	/** Clear the list of blue spheres that display a path.*/
	clear_flags() {
		let n_pts = this.flags.length;
		for (let i = 0; i < n_pts; i++) {
			this._removePoint(0);
		}
	}
	
	/** Takes an array of [x,z] in-world coordinates representing a new path to 
	* display as a set of blue spheres. */
	display(path) {
		// path should be an array of Vector3s
		this.clear_flags();
		
		for (let i = 0; i < path.length; i++) {
			this._addPoint(path[i].x, path[i].z);
		}
		
	}
};

/* Global vars needed because the animate() function wants to use them.*/
let camera, scene, renderer, container;
const playerInputController = new PlayerInput();

/** Function to set-up the prototype.*/
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

/* Global vars used by game loop.
Reference: Fixed update, variable render pattern from: http://gameprogrammingpatterns.com/game-loop.html
*/
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
	
	extrapolate();
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}

/** Function that updates in-world events every MS_PER_UPDATE.*/
function update() {
	playerInputController.player.do_pathfollowing();
}

function extrapolate() {
	// Only causes camera jitters
	//playerInputController.player.extrapolate(lag / MS_PER_UPDATE);
}

setup();
lastTimestamp = Date.now();
animate();