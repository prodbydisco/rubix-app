import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';

// DOM element references
const dropdownContent = document.querySelector('.dropdown-content');
const dropbtn = document.querySelector('.dropbtn');
const shuffleButton = document.getElementById('shuffle');
const resetButton = document.getElementById('reset');
const solveButton = document.getElementById('solve-button');
const algorithmPlaceholder = document.getElementById('algorithm');

// Global state variables
let lastAlgorithm = [];
let isResetting = false;

const scene = new THREE.Scene(); // create scene
scene.background = new THREE.Color(0x000000); // set scene background

// Add axis helper to visualize world coordinates
// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000); // create camera
camera.position.set(5, 5, 5); // set cam position

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('cube-canvas'), antialias: true }); // create renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const controls = new OrbitControls(camera, renderer.domElement); // create orbit/drag controls
controls.enableDamping = true;


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


let root;
const worldPosition = new THREE.Vector3();
const worldQuat = new THREE.Quaternion();
const cubePivot = new THREE.Object3D();
const cubelets = []; // array for each of the 27 cubes
let cube; // declare cube in global scope

const centerPieces = {
  front: null,
  back: null,
  up: null,
  down: null,
  left: null,
  right: null
};

// create pivot points for each face
const facePivots = {
  front: new THREE.Object3D(),
  back: new THREE.Object3D(),
  up: new THREE.Object3D(),
  down: new THREE.Object3D(),
  left: new THREE.Object3D(),
  right: new THREE.Object3D()
};


// load and configure the cube
const loader = new GLTFLoader();
loader.load('/models/rubiks_cube.glb', gltf => {
  root = gltf.scene;
  cube = root.getObjectByName('Cube');
  
  // set initial cube state for preferred colours
  cube.rotation.x = -Math.PI / 2;
  cube.rotation.z = -Math.PI / 2;

  scene.add(cubePivot); // parent for rotating entire cube
  cubePivot.position.set(0,0,0); // set to center
  
  // First collect all cubelets
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

  // Now add to scene
  root.scale.set(2, 2, 2);
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


// Get center pieces based on positions values
function getCenterPieces() {
  const tempWorldPos = new THREE.Vector3();
  
  cubelets.forEach(cubelet => {
    cubelet.getWorldPosition(tempWorldPos);
    // Find which face this cubelet belongs to based on its position after rotation
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

// function logCubeProperties() {
//   cubelets.forEach(cubelet => {
//     const cubeWorldPos = cubelet.getWorldPosition(worldPosition);
//     console.log({
//       name: cubelet.name,
//       position: cubeWorldPos,
//       rotation: cube.rotation,
//       quat: cube.getWorldQuaternion(worldQuat)
//   })})
// };



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



let isCubeRotating = false;
let isFaceRotating = false;

// Helper function to handle cubelet transformations
function transformCubelets(cubelets, pivot, operation = 'attach') {
  cubelets.forEach(cubelet => {
    if (operation === 'attach') {
      // Store world position and rotation
      cubelet.getWorldPosition(worldPosition);
      cubelet.getWorldQuaternion(worldQuat);
      
      // Detach from current parent
      if (cubelet.parent) {
        cubelet.parent.remove(cubelet);
      }
      pivot.add(cubelet);
      
      // Convert world position to local position relative to pivot
      cubelet.position.copy(worldPosition);
      cubelet.position.sub(pivot.getWorldPosition(new THREE.Vector3()));
      cubelet.position.applyQuaternion(pivot.getWorldQuaternion(new THREE.Quaternion()).invert());
      
      // Convert world rotation to local rotation
      cubelet.quaternion.copy(worldQuat);
      cubelet.quaternion.premultiply(pivot.getWorldQuaternion(new THREE.Quaternion()).invert());
    } else if (operation === 'detach') {
      // Store world position and rotation
      cubelet.getWorldPosition(worldPosition);
      cubelet.getWorldQuaternion(worldQuat);
      
      // Detach from pivot
      pivot.remove(cubelet);
      
      // Add back to cube and scene
      cube.add(cubelet);
      scene.add(cubelet);
      
      // Convert world position to local position relative to scene
      const cubeWorldPos = new THREE.Vector3();
      const cubeWorldQuat = new THREE.Quaternion();
      scene.getWorldPosition(cubeWorldPos);
      scene.getWorldQuaternion(cubeWorldQuat);
      
      // Set position relative to scene
      cubelet.position.copy(worldPosition);
      cubelet.position.sub(cubeWorldPos);
      cubelet.position.applyQuaternion(cubeWorldQuat.invert());
      
      // Set rotation relative to scene
      cubelet.quaternion.copy(worldQuat);
      cubelet.quaternion.premultiply(cubeWorldQuat.invert());
    }
  });
}

// Helper function to get rotation axis and angle for face rotation
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

// Helper function to execute a move
async function executeMove(notation, rotationDuration) {
  const moveMap = {
    // Face rotations
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
    
    // Cube rotations
    "x": () => rotateCube('-x', 1, rotationDuration),
    "x2": () => rotateCube('x', 2, rotationDuration),
    "x'": () => rotateCube('x', 1, rotationDuration),
    "y": () => rotateCube('-y', 1, rotationDuration),
    "y2": () => rotateCube('y', 2, rotationDuration),
    "y'": () => rotateCube('y', 1, rotationDuration),
    "z": () => rotateCube('-z', 1, rotationDuration),
    "z2": () => rotateCube('z', 2, rotationDuration),
    "z'": () => rotateCube('z', 1, rotationDuration),
    
    // Double face rotations
    "u": () => rotateCube('-y', 1, rotationDuration, 'down'),
    "u'": () => rotateCube('y', 1, rotationDuration, 'down'),
    "d": () => rotateCube('y', 1, 'up'),
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

// Helper function to check if a cubelet belongs to a face
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

function rotateCube(axis, turns, rotationDuration, excludeFace = null) {
  if (isCubeRotating) { return Promise.reject(new Error('Cube rotation in progress')) } else { isCubeRotating = true };

  return new Promise((resolve) => {
    let cubeletsToRotate = [...cubelets];
    if (excludeFace) {
      const faceCubelets = identifyFaceCubelets()[excludeFace];
      cubeletsToRotate = cubeletsToRotate.filter(cubelet => !faceCubelets.includes(cubelet));
    }

    transformCubelets(cubeletsToRotate, cubePivot, 'attach');

    let targetRotation = axis.includes('-') ? -(Math.PI / 2 * turns) : Math.PI / 2 * turns;

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
}

function rotateFace(face, direction, turns, rotationDuration) {
  if (isFaceRotating) {
    return Promise.reject(new Error('Face rotation in progress'));
  }
  isFaceRotating = true;

  const faceCubelets = identifyFaceCubelets()[face];
  if (faceCubelets.length === 0) {
    console.error(`No cubelets found for ${face} face!`);
    isFaceRotating = false;
    return Promise.reject(new Error('No cubelets found'));
  }
  
  const pivot = facePivots[face];
  const { rotationAxis, targetRotation } = getFaceRotationParams(face, direction, turns);
  
  transformCubelets(faceCubelets, pivot, 'attach');

  return new Promise((resolve) => {
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
    // Handle double moves specially
    if (move.includes("2")) {
      // Double moves are their own inverse, so just return them as is
      return move;
    }
    // For regular moves, if the move has a prime (') remove it, otherwise add it
    return move.includes("'") ? move.replace("'", "") : move + "'";
  });

  return executeAlgorithm(inverseAlgorithm.join(' '), animationDuration);
}

async function solve() {
  console.log(lastAlgorithm.length);
  if (lastAlgorithm.length === 0) return;

  await executeReverse(lastAlgorithm, 0.5);  // Now we wait for the algorithm to finish
  
  lastAlgorithm = [];  // This will only execute after the algorithm is complete
  solveButton.classList.remove('enabled');
  solveButton.classList.add('disabled');
}
solveButton.addEventListener('click', () => solve().catch(console.error));


async function resetCube() {
  // Set reset flag
  isResetting = true;

  // If a rotation is in progress, wait for it to complete
  if (isCubeRotating || isFaceRotating) {
    // Wait for current rotation to finish
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Cancel any ongoing GSAP animations
  gsap.killTweensOf(Object.values(facePivots));
  gsap.killTweensOf(cubePivot);

  // Remove existing cube from scene
  if (root) {
    // First remove all cubelets from their current parents
    cubelets.forEach(cubelet => {
      if (cubelet.parent) {
        cubelet.parent.remove(cubelet);
      }
    });
    scene.remove(root);
  }
  
  // Clear existing cubelets array
  cubelets.length = 0;
  
  // Reset center pieces
  Object.keys(centerPieces).forEach(key => {
    centerPieces[key] = null;
  });

  // Reset face pivots
  Object.values(facePivots).forEach(pivot => {
    pivot.rotation.set(0, 0, 0);
    // Remove all children from pivot
    while(pivot.children.length > 0) {
      pivot.remove(pivot.children[0]);
    }
    scene.remove(pivot);
  });
  
  // Reset cube pivot
  cubePivot.rotation.set(0, 0, 0);
  // Remove all children from cubePivot
  while(cubePivot.children.length > 0) {
    cubePivot.remove(cubePivot.children[0]);
  }
  
  // Clear last algorithm
  lastAlgorithm = [];
  
  // Reset solve button state
  solveButton.classList.remove('enabled');
  solveButton.classList.add('disabled');
  
  // Clear algorithm placeholder
  algorithmPlaceholder.textContent = '';

  // Reset rotation flag
  isCubeRotating = false;
  isFaceRotating = false;
  
  // Reload the cube model
  return new Promise((resolve) => {
    loader.load('/models/rubiks_cube.glb', gltf => {
      root = gltf.scene;
      cube = root.getObjectByName('Cube');

      // Instead of clearing the entire scene, just remove the cube-related objects
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
      
      // Re-add face pivots to scene
      Object.values(facePivots).forEach(pivot => {
        scene.add(pivot);
      });
      
      getCenterPieces();
      positionFacePivots();
      addFaceLabels();
      
      isResetting = false;  // Reset the flag
      resolve();
    });
  });
}

// Update keyboard event listener for reset
resetButton.addEventListener('click', () => resetCube().catch(console.error));


dropbtn.addEventListener('mouseenter', () => {
  dropdownContent.classList.remove('hidden');
});



window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


function animate() {
  requestAnimationFrame(animate);
  controls.update(); // required for OrbitControls
  renderer.render(scene, camera);
}
animate();

// Algorithm definitions
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
  }
};

// Initialize algorithm dropdown
Object.entries(algortihms).forEach(([category, algorithms]) => {
  const dropdownGroup = document.createElement('div');
  const groupTitle = document.createElement('p');
  
  groupTitle.classList.add('group-title');
  groupTitle.textContent = category;
  dropdownGroup.appendChild(groupTitle);
  
  dropdownGroup.classList.add('dropdown-group');
  dropdownContent.appendChild(dropdownGroup);
  
  Object.entries(algorithms).forEach(([id, data]) => {
    const dropdownPair = document.createElement('div');
    dropdownPair.classList.add('dropdown-pair');
    
    dropdownPair.addEventListener('click', () => {
      algorithmPlaceholder.textContent = data.algorithm;
      executeReverse(data.algorithm, 0.2);
      
      solveButton.classList.remove('disabled');
      solveButton.classList.add('enabled');
      
      dropdownContent.classList.add('hidden');
    });
    
    dropdownGroup.appendChild(dropdownPair);
    
    const algorithmIcon = document.createElement('img');
    algorithmIcon.classList.add('algorithm-icon');
    algorithmIcon.src = data.icon;
    dropdownPair.appendChild(algorithmIcon);
    
    const algorithmMoves = document.createElement('p');
    algorithmMoves.textContent = data.algorithm;
    dropdownPair.appendChild(algorithmMoves);
  });
});

// Event listeners
dropbtn.addEventListener('mouseenter', () => {
  dropdownContent.classList.remove('hidden');
});

resetButton.addEventListener('click', () => resetCube().catch(console.error));

// Keyboard controls
window.addEventListener('keydown', (event) => {
  console.log(`Key pressed: ${event.key}`);
  if (event.key !== 'F12') {event.preventDefault()};

  switch(event.key) {
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
    
    case 'ArrowRight': rotateCube('y', 1, 0.35); break;
    case 'ArrowLeft': rotateCube('-y', 1, 0.35); break;
    case 'ArrowUp': rotateCube('-x', 1, 0.35); break;
    case 'ArrowDown': rotateCube('x', 1, 0.35); break;
  }
});