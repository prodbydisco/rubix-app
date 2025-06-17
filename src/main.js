import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';

// DOM elements
const dropdownContent = document.querySelector('.dropdown-content');
const dropbtn = document.querySelector('.dropbtn');
const shuffleButton = document.getElementById('shuffle');
const resetButton = document.getElementById('reset');
const solveButton = document.getElementById('solve-button');
const algorithmPlaceholder = document.getElementById('algorithm');
const helpButton = document.getElementById('help');
const helpContainer = document.querySelector('.help-container');

const worldPosition = new THREE.Vector3();
const worldQuat = new THREE.Quaternion();
const cubePivot = new THREE.Object3D(); // pivot axis for entire cube

let root;
let cube;
const cubelets = []; // array for each of the 27 cubes
let lastAlgorithm = [];
let rotationQueue = [];

let isResetting = false;
let isProcessingQueue = false;
let isCubeRotating = false;
let isFaceRotating = false;

const centerPieces = {
  front: null,
  back: null,
  up: null,
  down: null,
  left: null,
  right: null
};

// pivot points for each face
const facePivots = {
  front: new THREE.Object3D(),
  back: new THREE.Object3D(),
  up: new THREE.Object3D(),
  down: new THREE.Object3D(),
  left: new THREE.Object3D(),
  right: new THREE.Object3D()
};

const algortihms = {
  OLL: {
    'Dot': {
      icon: '/images/oll/dot.png',
      algorithm: "F R U R' U' F' f R U R' U' f'"
    },
    'Horizontal': {
      icon: '/images/oll/horizontal.png',
      algorithm: "F R U R' U' F'"
    },
    'L-shape': {
      icon: '/images/oll/l-shape.png',
      algorithm: "f R U R' U' f'"
    },
    'Antisune': {
      icon: '/images/oll/antisune.png',
      algorithm: "R U2 R' U' R U' R'"
    },
    'Cross-opposite': {
      icon: '/images/oll/cross-opposite.png',
      algorithm: "R U R' U R U' R' U R U2 R'"
    },
    'L-corners': {
      icon: '/images/oll/l-corners.png',
      algorithm: "F R' F' r U R U' r'"
    },
    'Cross-adjacent': {
      icon: '/images/oll/cross-adjacent.png',
      algorithm: "R U2 R2 U' R2 U' R2 U2 R"
    },
    'Sune': {
      icon: '/images/oll/sune.png',
      algorithm: "R U R' U R U2 R'"
    },
    'T-side': {
      icon: '/images/oll/t-side.png',
      algorithm: "r U R' U' r' F R F'"
    },
    'T-front': {
      icon: '/images/oll/t-front.png',
      algorithm: "R2 D R' U2 R D' R' U2 R'"
    },
  },
  PLL: {
    'Diagonal': {
      icon: '/images/pll/diagonal.png',
      algorithm: "F R U' R' U' R U R' F' R U R' U' R' F R F'"
    },
    'Headlights': {
      icon: '/images/pll/headlights.png',
      algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'"
    },
    'PLL-H': {
      icon: '/images/pll/pll-h.png',
      algorithm: "M2 U M2 U2 M2 U M2"
    },
    'PLL-Ua': {
      icon: '/images/pll/pll-ua.png',
      algorithm: "R U' R U R U R U' R' U' R2"
    },
    'PLL-Ub': {
      icon: '/images/pll/pll-ub.png',
      algorithm: "R2 U R U R' U' R' U' R' U R'"
    },
    'PLL-Z': {
      icon: '/images/pll/pll-z.png',
      algorithm: "M' U M2 U M2 U M' U2 M2"
    },
  },


  'TEST //': { // delete me once all moves added
    // 'Cube Rotation': {
    //   icon: '/images/test/.png',
    //   algorithm: "x y z"
    // },
  }
};

const scene = new THREE.Scene(); // create scene
scene.background = new THREE.Color(0x000000); // set scene background

// // Add axis helper to visualize world coordinates
// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000); // create camera
camera.position.set(5, 5, 5); // set cam position

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('cube-canvas'), antialias: true }); // create renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const controls = new OrbitControls(camera, renderer.domElement); // create orbit/drag controls
controls.enableDamping = true; // enables smooth cam movements


// add ambient light for base illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 3);
scene.add(ambientLight);

// add key light (main light)
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(5, 5, 5);
keyLight.castShadow = true;
scene.add(keyLight);

// add fill light (softer light from opposite side)
const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
fillLight.position.set(-5, 0, -5);
scene.add(fillLight);

// add rim light (back light for edge definition)
const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
rimLight.position.set(0, -5, -5);
scene.add(rimLight);

// enable shadow mapping
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// configure shadow properties
keyLight.shadow.mapSize.width = 512;
keyLight.shadow.mapSize.height = 512;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 500;


// load and configure the cube
const loader = new GLTFLoader();
loader.load('/models/rubiks_cube.glb', gltf => {
  root = gltf.scene;
  cube = root.getObjectByName('Cube');

  root.scale.set(2, 2, 2);
  
  // set initial cube state for preferred colours
  cube.rotation.x = -Math.PI / 2;
  cube.rotation.z = -Math.PI / 2;

  scene.add(cubePivot); // add cube axis
  cubePivot.position.set(0,0,0); // set to center
  
  // collect all cubelets
  const addCubes = (object) => {
    object.children.forEach(collection => {
      collection.children.forEach(child => {
        if (child.name !== 'square') {
          cubelets.push(child);
        }
      });
    });
    cubelets.sort();
  };
  addCubes(cube);

  // add cube to scene
  scene.add(root);
  
  getCenterPieces();
  positionFacePivots();
  addFaceLabels();
},
function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
},
function (error) {
    console.error('An error happened:', error);
});


// get center pieces based on positions values
function getCenterPieces() {
  const tempWorldPos = new THREE.Vector3();
  
  cubelets.forEach(cubelet => {
    cubelet.getWorldPosition(tempWorldPos);
    // find which face each cubelet belongs to based on its position
    if (Math.abs(tempWorldPos.x) < 0.1 && Math.abs(tempWorldPos.y) < 0.1 && tempWorldPos.z > 0) {
      centerPieces.front = cubelet;
    } else if (Math.abs(tempWorldPos.x) < 0.1 && Math.abs(tempWorldPos.y) < 0.1 && tempWorldPos.z < 0) {
      centerPieces.back = cubelet;
    } else if (Math.abs(tempWorldPos.x) < 0.1 && tempWorldPos.y > 0 && Math.abs(tempWorldPos.z) < 0.1) {
      centerPieces.up = cubelet;
    } else if (Math.abs(tempWorldPos.x) < 0.1 && tempWorldPos.y < 0 && Math.abs(tempWorldPos.z) < 0.1) {
      centerPieces.down = cubelet;
    } else if (tempWorldPos.x < 0 && Math.abs(tempWorldPos.y) < 0.1 && Math.abs(tempWorldPos.z) < 0.1) {
      centerPieces.left = cubelet;
    } else if (tempWorldPos.x > 0 && Math.abs(tempWorldPos.y) < 0.1 && Math.abs(tempWorldPos.z) < 0.1) {
      centerPieces.right = cubelet;
    }
  });
};


// initialize face pivots
Object.values(facePivots).forEach(pivot => {
  scene.add(pivot);
});

// position face pivots at the center of each face
function positionFacePivots() {
  // front face (z = 1)
  facePivots.front.position.set(0, 0, 1);
  facePivots.front.rotation.set(0, 0, 0);
  
  // back face (z = -1)
  facePivots.back.position.set(0, 0, -1);
  facePivots.back.rotation.set(0, 0, 0);
  
  // up face (y = 1)
  facePivots.up.position.set(0, 1, 0);
  facePivots.up.rotation.set(0, 0, 0);
  
  // down face (y = -1)
  facePivots.down.position.set(0, -1, 0);
  facePivots.down.rotation.set(0, 0, 0);
  
  // left face (x = -1)
  facePivots.left.position.set(-1, 0, 0);
  facePivots.left.rotation.set(0, 0, 0);
  
  // right face (x = 1)
  facePivots.right.position.set(1, 0, 0);
  facePivots.right.rotation.set(0, 0, 0);
}

// store face label meshes
const faceLabels = [];

function addCubeLabel(face, text) {
  // create canvas for text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;
  
  // set up text style
  context.fillStyle = 'white';
  context.font = 'bold 64px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // draw text
  context.fillText(text, canvas.width/2, canvas.height/2);
  
  // create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // create material with texture
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide
  });
  
  // create plane for text
  const plane = new THREE.PlaneGeometry(0.5, 0.25);
  const textMesh = new THREE.Mesh(plane, material);
  
  // get face position for initial placement
  const facePosition = face.position.clone();
  const offset = 1.8;
  
  // position the text mesh based on face
  if (Math.abs(facePosition.x) === 1) {
    textMesh.position.set(
      facePosition.x * offset,
      0,
      0
    );
  } else if (Math.abs(facePosition.y) === 1) {
    textMesh.position.set(
      0,
      facePosition.y * offset,
      0
    );
  } else if (Math.abs(facePosition.z) === 1) {
    textMesh.position.set(
      0,
      0,
      facePosition.z * offset
    );
  }

  scene.add(textMesh);
  faceLabels.push(textMesh); // store reference to label mesh
  
  // store reference to camera for billboarding
  const billboardCamera = camera;
  
  // update function to make text face camera
  function updateBillboard() {
    textMesh.lookAt(billboardCamera.position);
  }
  
  // add to animation loop
  const originalAnimate = animate;
  animate = function() {
    updateBillboard();
    originalAnimate();
  };
}

function addFaceLabels() {
  addCubeLabel(facePivots.front, "FRONT");
  addCubeLabel(facePivots.back, "BACK");
  addCubeLabel(facePivots.up, "UP");
  addCubeLabel(facePivots.down, "DOWN");
  addCubeLabel(facePivots.left, "LEFT");
  addCubeLabel(facePivots.right, "RIGHT");
};


// handle cubelet transformations
function transformCubelets(cubelets, pivot, operation = 'attach') {
  cubelets.forEach(cubelet => {
    if (operation === 'attach') {
      // store world position and rotation
      cubelet.getWorldPosition(worldPosition);
      cubelet.getWorldQuaternion(worldQuat);
      
      // detach from current parent
      if (cubelet.parent) {
        cubelet.parent.remove(cubelet);
      }
      pivot.add(cubelet);
      
      // convert world position to local position relative to pivot
      cubelet.position.copy(worldPosition);
      cubelet.position.sub(pivot.getWorldPosition(new THREE.Vector3()));
      cubelet.position.applyQuaternion(pivot.getWorldQuaternion(new THREE.Quaternion()).invert());
      
      // convert world rotation to local rotation
      cubelet.quaternion.copy(worldQuat);
      cubelet.quaternion.premultiply(pivot.getWorldQuaternion(new THREE.Quaternion()).invert());
    } else if (operation === 'detach') {
      // store world position and rotation
      cubelet.getWorldPosition(worldPosition);
      cubelet.getWorldQuaternion(worldQuat);
      
      // detach from pivot
      pivot.remove(cubelet);
      
      // add back to cube and scene
      cube.add(cubelet);
      scene.add(cubelet);
      
      // convert world position to local position relative to scene
      const cubeWorldPos = new THREE.Vector3();
      const cubeWorldQuat = new THREE.Quaternion();
      scene.getWorldPosition(cubeWorldPos);
      scene.getWorldQuaternion(cubeWorldQuat);
      
      // set position relative to scene
      cubelet.position.copy(worldPosition);
      cubelet.position.sub(cubeWorldPos);
      cubelet.position.applyQuaternion(cubeWorldQuat.invert());
      
      // set rotation relative to scene
      cubelet.quaternion.copy(worldQuat);
      cubelet.quaternion.premultiply(cubeWorldQuat.invert());
    }
  });
}


// get rotation axis and angle for face rotation
function getFaceRotationParams(face, direction, turns) {
  const baseAngle = Math.PI / 2;
  const angle = direction === 'clockwise' ? -baseAngle * turns : baseAngle * turns;
  
  let rotationAxis;
  let targetRotation;
  
  switch(face) {
    case 'front':
      rotationAxis = 'z';
      targetRotation = angle;
      break;
    case 'back':
      rotationAxis = 'z';
      targetRotation = -angle;
      break;
    case 'up':
      rotationAxis = 'y';
      targetRotation = angle;
      break;
    case 'down':
      rotationAxis = 'y';
      targetRotation = -angle;
      break;
    case 'left':
      rotationAxis = 'x';
      targetRotation = -angle;
      break;
    case 'right':
      rotationAxis = 'x';
      targetRotation = angle;
      break;
  }
  
  return { rotationAxis, targetRotation };
}


function rotateCube(axis, turns, rotationDuration, excludeFace = null) {
  return new Promise((resolve, reject) => {
    // add rotation to queue
    rotationQueue.push({
      type: 'cube',
      params: { axis, turns, rotationDuration, excludeFace },
      resolve,
      reject
    });

    // start processing queue if not already
    if (!isProcessingQueue) {
      processRotationQueue();
    }
  });
}

function rotateFace(face, direction, turns, rotationDuration) {
  return new Promise((resolve, reject) => {
    // add rotation to queue
    rotationQueue.push({
      type: 'face',
      params: { face, direction, turns, rotationDuration },
      resolve,
      reject
    });

    // Start processing queue if not already
    if (!isProcessingQueue) {
      processRotationQueue();
    }
  });
}

async function processRotationQueue() {
  if (isProcessingQueue || rotationQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (rotationQueue.length > 0) {
    const rotation = rotationQueue[0];
    
    try {
      if (rotation.type === 'cube') {
        const { axis, turns, rotationDuration, excludeFace } = rotation.params;
        if (isCubeRotating) {
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }
        isCubeRotating = true;
        
        let cubeletsToRotate = [...cubelets];
        if (excludeFace) {
          const faceCubelets = identifyFaceCubelets();
          const excludedCubelets = Array.isArray(excludeFace) 
            ? excludeFace.flatMap(face => faceCubelets[face])
            : faceCubelets[excludeFace];
          cubeletsToRotate = cubeletsToRotate.filter(cubelet => !excludedCubelets.includes(cubelet));
        }

        transformCubelets(cubeletsToRotate, cubePivot, 'attach');

        let targetRotation = axis.includes('-') ? -(Math.PI / 2 * turns) : Math.PI / 2 * turns;

        await new Promise(resolve => {
          gsap.to(cubePivot.rotation, {
            [axis.includes('x') ? 'x' : axis.includes('y') ? 'y' : 'z']: targetRotation,
            duration: rotationDuration,
            ease: "power2.inOut",
            onComplete: () => {
              transformCubelets(cubeletsToRotate, cubePivot, 'detach');
              cubePivot.rotation.set(0,0,0);
              isCubeRotating = false;
              getCenterPieces();
              positionFacePivots();
              resolve();
            }
          });
        });
      } else if (rotation.type === 'face') {
        const { face, direction, turns, rotationDuration } = rotation.params;
        if (isFaceRotating) {
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }
        isFaceRotating = true;

        const faceCubelets = identifyFaceCubelets()[face];
        if (faceCubelets.length === 0) {
          console.error(`No cubelets found for ${face} face!`);
          isFaceRotating = false;
          throw new Error('No cubelets found');
        }
        
        const pivot = facePivots[face];
        const { rotationAxis, targetRotation } = getFaceRotationParams(face, direction, turns);
        
        transformCubelets(faceCubelets, pivot, 'attach');

        await new Promise(resolve => {
          gsap.to(pivot.rotation, {
            [rotationAxis]: targetRotation,
            duration: rotationDuration,
            ease: "power2.inOut",
            onComplete: () => {
              transformCubelets(faceCubelets, pivot, 'detach');
              pivot.rotation.set(0, 0, 0);
              isFaceRotating = false;
              resolve();
            }
          });
        });
      }
      
      // remove completed rotation from queue and resolve its promise
      rotationQueue.shift();
      rotation.resolve();
    } catch (error) {
      // remove failed rotation from queue and reject its promise
      rotationQueue.shift();
      rotation.reject(error);
    }
  }
  
  isProcessingQueue = false;
}

// check if a cubelet belongs to a face
function isCubeletInFace(cubelet, face, centerWorldPos) {
  const cubletPos = new THREE.Vector3();
  cubelet.getWorldPosition(cubletPos);
  
  switch(face) {
    case 'front':
    case 'back':
      return Math.abs(cubletPos.z - centerWorldPos.z) < 0.1;
    case 'up':
    case 'down':
      return Math.abs(cubletPos.y - centerWorldPos.y) < 0.1;
    case 'left':
    case 'right':
      return Math.abs(cubletPos.x - centerWorldPos.x) < 0.1;
    default:
      return false;
  }
}

function identifyFaceCubelets() {
  const faceCubelets = {
    front: [],
    back: [],
    up: [],
    down: [],
    left: [],
    right: []
  };

  Object.entries(centerPieces).forEach(([face, center]) => {
    if (!center) {
      console.error(`Center piece not found for ${face} face`);
      return;
    }

    center.updateMatrixWorld(true);
    const centerWorldPos = center.getWorldPosition(worldPosition);
    
    cubelets.forEach(cubelet => {
      if (isCubeletInFace(cubelet, face, centerWorldPos)) {
        faceCubelets[face].push(cubelet);
      }
    });
  });

  return faceCubelets;
}

async function executeAlgorithm(algorithm, rotationDuration) {
  console.log(`Executing algorithm: ${algorithm}`);
  const algorithmArray = algorithm.split(' ');
  
  
  async function executeMoves() {
    for (const notation of algorithmArray) {
      if (isResetting) {
        console.log('Reset requested, stopping algorithm execution');
        return;
      }

      console.log('executing: ', notation);

      try {
        await executeMove(notation, rotationDuration);
      } catch (error) {
        console.error(`Error executing move ${notation}:`, error);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  await executeMoves();
  if (!isResetting) {
    lastAlgorithm = algorithm;
  }
}

async function executeReverse(algorithm, animationDuration) {
  const inverseAlgorithm = algorithm.split(' ').reverse().map(move => {
    // handle double moves specially
    if (move.includes("2")) {
      return move; // double moves are their own inverse, so just return them as is
    }
    // for regular moves, if the move has a prime (') remove it, otherwise add it
    return move.includes("'") ? move.replace("'", "") : move + "'";
  });

  return executeAlgorithm(inverseAlgorithm.join(' '), animationDuration);
}

async function solve() {
  console.log(lastAlgorithm.length);
  if (lastAlgorithm.length === 0) return;

  solveButton.classList.remove('enabled');
  solveButton.classList.add('disabled');

  await executeReverse(lastAlgorithm, 0.5);  // wait for the algorithm to finish
  
  lastAlgorithm = [];  // this will only execute after the algorithm is complete
}
solveButton.addEventListener('click', () => {
  if (solveButton.classList.contains('disabled')) return;
  
  solve().catch(console.error);
});


async function resetCube() {
  isResetting = true; // set reset flag

  if (isCubeRotating || isFaceRotating) {
    // wait for current rotation to finish
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // cancel any ongoing GSAP animations
  gsap.killTweensOf(Object.values(facePivots));
  gsap.killTweensOf(cubePivot);

  // remove existing cube from scene
  if (root) {
    // remove all cubelets from their current parents
    cubelets.forEach(cubelet => {
      if (cubelet.parent) {
        cubelet.parent.remove(cubelet);
      }
    });
    scene.remove(root);
  }
  
  cubelets.length = 0; // clear existing cubelets array
  
  // reset center pieces
  Object.keys(centerPieces).forEach(key => {
    centerPieces[key] = null;
  });

  // reset face pivots
  Object.values(facePivots).forEach(pivot => {
    pivot.rotation.set(0, 0, 0);
    // remove all children from pivot
    while(pivot.children.length > 0) {
      pivot.remove(pivot.children[0]);
    }
    scene.remove(pivot);
  });
  
  // reset cube pivot
  cubePivot.rotation.set(0, 0, 0);
  // remove all children from cubePivot
  while(cubePivot.children.length > 0) {
    cubePivot.remove(cubePivot.children[0]);
  }
  
  // clear last algorithm
  lastAlgorithm = [];
  
  // reset solve button state
  solveButton.classList.remove('enabled');
  solveButton.classList.add('disabled');
  
  // clear algorithm placeholder
  algorithmPlaceholder.textContent = '';

  // reset rotation flag
  isCubeRotating = false;
  isFaceRotating = false;
  
  // reload the cube model
  return new Promise((resolve) => {
    loader.load('/models/rubiks_cube.glb', gltf => {
      root = gltf.scene;
      cube = root.getObjectByName('Cube');

      // instead of clearing the entire scene, just remove the cube-related objects
      scene.children.forEach(child => {
        if (child !== camera && 
            child !== ambientLight && 
            child !== keyLight && 
            child !== fillLight && 
            child !== rimLight) {
          scene.remove(child);
        }
      });

      // set initial cube state for preferred colours
      cube.rotation.x = -Math.PI / 2;
      cube.rotation.z = -Math.PI / 2;

      scene.add(cubePivot);
      cubePivot.position.set(0, 0, 0);
      
      const addCubes = (object) => {
        object.children.forEach(collection => {
          collection.children.forEach(child => {
            if (child.name !== 'square') {
              cubelets.push(child);
            }
          });
        });
        cubelets.sort();
      };
      addCubes(cube);

      root.scale.set(2, 2, 2);
      scene.add(root);
      
      // re-add face pivots to scene
      Object.values(facePivots).forEach(pivot => {
        scene.add(pivot);
      });
      
      getCenterPieces();
      positionFacePivots();
      addFaceLabels();
      
      isResetting = false;  // reset the flag
      resolve();
    });
  });
}

// update keyboard event listener for reset
resetButton.addEventListener('click', () => resetCube().catch(console.error));


dropbtn.addEventListener('mouseenter', () => {
  dropdownContent.classList.remove('hidden');
});


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});



// initialize algorithm dropdown menu
Object.entries(algortihms).forEach(([category, algorithms]) => {
  const dropdownBlock = document.createElement('div');
  const blockTitle = document.createElement('p');
  
  blockTitle.classList.add('block-title');
  blockTitle.textContent = category;
  dropdownBlock.appendChild(blockTitle);
  
  dropdownBlock.classList.add('dropdown-block');
  dropdownContent.appendChild(dropdownBlock);
  
  // populate dropdown with 'algorithms' object
  Object.entries(algorithms).forEach(([id, data]) => {
    const algorithmPair = document.createElement('div');
    algorithmPair.classList.add('algorithm-pair');
    
    // setup cube using the reverse of the solving algorithm (ready for user to solve)
    algorithmPair.addEventListener('click', () => {
      algorithmPlaceholder.textContent = data.algorithm;
      executeAlgorithm(data.algorithm, 0.5);
      
      dropdownContent.classList.add('hidden'); // close menu
    });

    // add hover effects for the solve button
    algorithmPair.addEventListener('mouseenter', () => {
      solvePairButton.classList.add('hover-underline');
    });
    
    algorithmPair.addEventListener('mouseleave', () => {
      solvePairButton.classList.remove('hover-underline');
    });

    dropdownBlock.appendChild(algorithmPair);
    
    const algorithmIcon = document.createElement('img');
    algorithmIcon.classList.add('algorithm-icon');
    algorithmIcon.src = data.icon;
    algorithmPair.appendChild(algorithmIcon);
    
    const algorithmMoves = document.createElement('p');
    algorithmMoves.textContent = data.algorithm;
    algorithmPair.appendChild(algorithmMoves);

    // setup/solve buttons
    const blockButtons = document.createElement('div');
    blockButtons.classList.add('block-buttons');
    algorithmPair.appendChild(blockButtons);

    const setupButton = document.createElement('p');
    setupButton.classList.add('block-button');
    setupButton.textContent = 'Setup';
    
    const solvePairButton = document.createElement('p');
    solvePairButton.classList.add('block-button');
    solvePairButton.textContent = 'Solve'; 
    
    // add hover effects for the solve button
    algorithmPair.addEventListener('mouseenter', () => {
      solvePairButton.classList.add('hover-underline');
    });
    
    algorithmPair.addEventListener('mouseleave', () => {
      solvePairButton.classList.remove('hover-underline');
    });

    // remove underline when hovering over setup button
    setupButton.addEventListener('mouseenter', () => {
      solvePairButton.classList.remove('hover-underline');
    });

    setupButton.addEventListener('mouseleave', () => {
      if (algorithmPair.matches(':hover')) {
        solvePairButton.classList.add('hover-underline');
      }
    });
    
    setupButton.addEventListener('click', async (event) => {
      event.stopPropagation(); // stop event from bubbling up to parent
      
      dropdownContent.classList.add('hidden');
      algorithmPlaceholder.textContent = data.algorithm;
      
      await executeReverse(data.algorithm, 0.2);
      
      solveButton.classList.remove('disabled');
      solveButton.classList.add('enabled');
      
    });
    
    solvePairButton.addEventListener('click', (event) => {
      event.stopPropagation(); // stop event from bubbling up to parent
      algorithmPlaceholder.textContent = data.algorithm;
      executeAlgorithm(data.algorithm, 0.5);
      
      dropdownContent.classList.add('hidden');
    });

    blockButtons.appendChild(setupButton);
    blockButtons.appendChild(solvePairButton);
  });
});

// event listeners
dropbtn.addEventListener('mouseenter', () => {
  dropdownContent.classList.remove('hidden');
});

resetButton.addEventListener('click', () => resetCube().catch(console.error));

// keyboard controls
window.addEventListener('keydown', (event) => {
  console.log(`Key pressed: ${event.key}`);
  if (event.key !== 'F12') {event.preventDefault()};

  switch(event.key) {
    // face rotations
    case 'f': rotateFace('front', 'clockwise', 1, 0.3); break;
    case 'F': rotateFace('front', 'counterclockwise', 1, 0.3); break;
    case 'b': rotateFace('back', 'clockwise', 1, 0.3); break;
    case 'B': rotateFace('back', 'counterclockwise', 1, 0.3); break;
    case 'u': rotateFace('up', 'clockwise', 1, 0.3); break;
    case 'U': rotateFace('up', 'counterclockwise', 1, 0.3); break;
    case 'd': rotateFace('down', 'clockwise', 1, 0.3); break;
    case 'D': rotateFace('down', 'counterclockwise', 1, 0.3); break;
    case 'l': rotateFace('left', 'clockwise', 1, 0.3); break;
    case 'L': rotateFace('left', 'counterclockwise', 1, 0.3); break;
    case 'r': rotateFace('right', 'clockwise', 1, 0.3); break;
    case 'R': rotateFace('right', 'counterclockwise', 1, 0.3); break;
    
    // double face rotations (number keys)
    case '1': executeMove('u', 0.3); break;  // up double layer
    case '!': executeMove("u'", 0.3); break;
    case '2': executeMove('d', 0.3); break;  // down double layer
    case '@': executeMove("d'", 0.3); break;
    case '3': executeMove('l', 0.3); break;  // left double layer
    case '#': executeMove("l'", 0.3); break;
    case '4': executeMove('r', 0.3); break;  // right double layer
    case '$': executeMove("r'", 0.3); break;
    case '5': executeMove('f', 0.3); break;  // front double layer
    case '%': executeMove("f'", 0.3); break;
    case '6': executeMove('b', 0.3); break;  // back double layer
    case '^': executeMove("b'", 0.3); break;
    
    // middle layer rotations
    case 'm': executeMove('M', 0.3); break;
    case 'M': executeMove("M'", 0.3); break;
    case 'e': executeMove('E', 0.3); break;
    case 'E': executeMove("E'", 0.3); break;
    case 's': executeMove('S', 0.3); break;
    case 'S': executeMove("S'", 0.3); break;
    
    // entire cube rotations
    case 'ArrowRight': rotateCube('y', 1, 0.35); break;
    case 'ArrowLeft': rotateCube('-y', 1, 0.35); break;
    case 'ArrowUp': rotateCube('-x', 1, 0.35); break;
    case 'ArrowDown': rotateCube('x', 1, 0.35); break;
    
    case 'h': toggleFaceLabels(); break; // toggle face labels
  }
});

async function shuffleCube() {
  const min = Math.ceil(25);
  const max = Math.floor(35);
  const randomRange = Math.floor(Math.random() * (max - min + 1)) + min;
  const faceKeys = Object.keys(facePivots);

  const randomIndex = () => Math.floor(Math.random() * faceKeys.length); // 0 to 5
  const randomDirection = () => (Math.floor(Math.random() * 2)) + 1 === 1 ? 'clockwise' : 'counterclockwise';
  const randomTurns = () => (Math.floor(Math.random() * 2)) + 1; // will return 1 or 2

  let lastFace = null; // store last face turned to prevent turning again

  for (let i = 0; i < randomRange; i++) {
    let currentFace;
    do {
      currentFace = faceKeys[randomIndex()];
    } while (currentFace === lastFace); // keep picking until we get a different face

    await rotateFace(currentFace, randomDirection(), randomTurns(), 0.1);
    lastFace = currentFace;
  }
}
shuffleButton.addEventListener('click', () => shuffleCube().catch(console.error));


function animate() {
  requestAnimationFrame(animate);
  controls.update(); // required for OrbitControls
  renderer.render(scene, camera);
}
animate();

async function executeMove(notation, rotationDuration) {
  const moveMap = {
    // face rotations
    "U": () => rotateFace('up', 'clockwise', 1, rotationDuration),
    "U2": () => rotateFace('up', 'clockwise', 2, rotationDuration),
    "U'": () => rotateFace('up', 'counterclockwise', 1, rotationDuration),
    "D": () => rotateFace('down', 'clockwise', 1, rotationDuration),
    "D2": () => rotateFace('down', 'clockwise', 2, rotationDuration),
    "D'": () => rotateFace('down', 'counterclockwise', 1, rotationDuration),
    "F": () => rotateFace('front', 'clockwise', 1, rotationDuration),
    "F2": () => rotateFace('front', 'clockwise', 2, rotationDuration),
    "F'": () => rotateFace('front', 'counterclockwise', 1, rotationDuration),
    "B": () => rotateFace('back', 'clockwise', 1, rotationDuration),
    "B2": () => rotateFace('back', 'clockwise', 2, rotationDuration),
    "B'": () => rotateFace('back', 'counterclockwise', 1, rotationDuration),
    "L": () => rotateFace('left', 'clockwise', 1, rotationDuration),
    "L2": () => rotateFace('left', 'clockwise', 2, rotationDuration),
    "L'": () => rotateFace('left', 'counterclockwise', 1, rotationDuration),
    "R": () => rotateFace('right', 'clockwise', 1, rotationDuration),
    "R2": () => rotateFace('right', 'clockwise', 2, rotationDuration),
    "R'": () => rotateFace('right', 'counterclockwise', 1, rotationDuration),
    
    // middle layer rotations
    "M": () => rotateCube('x', 1, rotationDuration, ['left', 'right']),
    "M2": () => rotateCube('x', 2, rotationDuration, ['left', 'right']),
    "M'": () => rotateCube('-x', 1, rotationDuration, ['left', 'right']),
    "E": () => rotateCube('y', 1, rotationDuration, ['up', 'down']),
    "E2": () => rotateCube('y', 2, rotationDuration, ['up', 'down']),
    "E'": () => rotateCube('-y', 1, rotationDuration, ['up', 'down']),
    "S": () => rotateCube('-z', 1, rotationDuration, ['front', 'back']),
    "S2": () => rotateCube('z', 2, rotationDuration, ['front', 'back']),
    "S'": () => rotateCube('z', 1, rotationDuration, ['front', 'back']),
    
    // entire cube rotations
    "x": () => rotateCube('-x', 1, rotationDuration),
    "x2": () => rotateCube('x', 2, rotationDuration),
    "x'": () => rotateCube('x', 1, rotationDuration),
    "y": () => rotateCube('-y', 1, rotationDuration),
    "y2": () => rotateCube('y', 2, rotationDuration),
    "y'": () => rotateCube('y', 1, rotationDuration),
    "z": () => rotateCube('-z', 1, rotationDuration),
    "z2": () => rotateCube('z', 2, rotationDuration),
    "z'": () => rotateCube('z', 1, rotationDuration),
    
    // double face rotations
    "u": () => rotateCube('-y', 1, rotationDuration, 'down'),
    "u'": () => rotateCube('y', 1, rotationDuration, 'down'),
    "d": () => rotateCube('y', 1, rotationDuration, 'up'),
    "d'": () => rotateCube('-y', 1, rotationDuration, 'up'),
    "l": () => rotateCube('x', 1, rotationDuration, 'right'),
    "l'": () => rotateCube('-x', 1, rotationDuration, 'right'),
    "r": () => rotateCube('-x', 1, rotationDuration, 'left'),
    "r'": () => rotateCube('x', 1, rotationDuration, 'left'),
    "f": () => rotateCube('-z', 1, rotationDuration, 'back'),
    "f'": () => rotateCube('z', 1, rotationDuration, 'back'),
    "b": () => rotateCube('z', 1, rotationDuration, 'front'),
    "b'": () => rotateCube('-z', 1, rotationDuration, 'front')
  };

  const move = moveMap[notation];
  if (move) {
    await move();
  } else {
    console.error(`Unknown move notation: ${notation}`);
  }
}

// click help button to toggle menu, click outside of container to close
helpButton.addEventListener('click', (event) => {
  event.stopPropagation(); // prevent click from bubbling up
  helpContainer.style.display = helpContainer.style.display === 'none' ? 'flex' : 'none';
});

// close help container when clicking outside
document.addEventListener('click', (event) => {
  if (!helpContainer.contains(event.target) && event.target !== helpButton) {
    helpContainer.style.display = 'none';
  }
});

// toggle face labels visibility
function toggleFaceLabels() {
  const isVisible = faceLabels[0]?.visible;
  const targetOpacity = isVisible ? 0 : 1;
  
  faceLabels.forEach(label => {
    // Set initial state
    if (!isVisible) {
      label.visible = true;
      label.material.opacity = 0;
    }
    
    // Animate opacity
    gsap.to(label.material, {
      opacity: targetOpacity,
      duration: 0.3,
      ease: "power2.inOut",
      onComplete: () => {
        if (targetOpacity === 0) {
          label.visible = false;
        }
      }
    });
  });
}