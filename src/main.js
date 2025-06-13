import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';

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

function rotateCube(pivot, axis, multiplier, excludeFace = null) {
  if (isCubeRotating) { return Promise.reject(new Error('Cube rotation in progress')) } else { isCubeRotating = true };

  return new Promise((resolve) => {
    // Get cubelets to rotate (excluding the specified face if any)
    let cubeletsToRotate = [...cubelets];
    if (excludeFace) {
      const faceCubelets = identifyFaceCubelets()[excludeFace];
      cubeletsToRotate = cubeletsToRotate.filter(cubelet => !faceCubelets.includes(cubelet));
    }

    cubeletsToRotate.forEach(cubelet => {
      // get world positions & rotations of each cube
      cubelet.getWorldPosition(worldPosition);
      cubelet.getWorldQuaternion(worldQuat);
      
      // detach from current parent
      if (cubelet.parent) {
        cubelet.parent.remove(cubelet);
      }
      pivot.add(cubelet); // attach all cubelets to the pivot
      
      // convert world position to local position relative to pivot
      cubelet.position.copy(worldPosition);
      cubelet.position.sub(pivot.getWorldPosition(new THREE.Vector3()));
      cubelet.position.applyQuaternion(pivot.getWorldQuaternion(new THREE.Quaternion()).invert());
      
      // convert world rotation to local rotation
      cubelet.quaternion.copy(worldQuat);
      cubelet.quaternion.premultiply(pivot.getWorldQuaternion(new THREE.Quaternion()).invert());
    });

    // Set target rotation based on axis
    let targetRotation = axis.includes('-') ? -(Math.PI / 2 * multiplier) : Math.PI / 2 * multiplier;
    

    // Animate with GSAP
    gsap.to(pivot.rotation, {
      [axis.includes('x') ? 'x' : axis.includes('y') ? 'y' : 'z']: targetRotation,
      duration: rotationDuration,
      ease: "power2.inOut",
      onComplete: () => {
        // detach cubelets after animation
        cubeletsToRotate.forEach(cubelet => {
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
          
          // Set position relative to scene
          cubelet.position.copy(worldPosition);
          cubelet.position.sub(cubeWorldPos);
          cubelet.position.applyQuaternion(cubeWorldQuat.invert());
          
          // Set rotation relative to scene
          cubelet.quaternion.copy(worldQuat);
          cubelet.quaternion.premultiply(cubeWorldQuat.invert());
        });

        // reset rotation of parent axis
        pivot.rotation.set(0,0,0);
        
        isCubeRotating = false; // release rotation lock
        
        getCenterPieces();
        positionFacePivots();
        resolve();
      }
    });
  });
}

function rotateFace(face, direction, multiplier) {
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
  const baseAngle = Math.PI / 2; // 90 degrees
  const angle = direction === 'clockwise' ? -baseAngle * multiplier : baseAngle * multiplier;
  
  // attach all cubelets to the pivot
  faceCubelets.forEach(cubelet => {
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
  });
  
  // rotate face with GSAP animation
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

  // Return a promise that resolves when the GSAP animation is complete
  return new Promise((resolve) => {
    gsap.to(pivot.rotation, {
      [rotationAxis]: targetRotation,
      duration: rotationDuration,
      ease: "power2.inOut",
      onComplete: () => {
        // detach cubelets after animation
        faceCubelets.forEach(cubelet => {
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
          
          // Set position relative to scene
          cubelet.position.copy(worldPosition);
          cubelet.position.sub(cubeWorldPos);
          cubelet.position.applyQuaternion(cubeWorldQuat.invert());
          
          // Set rotation relative to scene
          cubelet.quaternion.copy(worldQuat);
          cubelet.quaternion.premultiply(cubeWorldQuat.invert());
        });
        
        // reset pivot rotation
        pivot.rotation.set(0, 0, 0);
        isFaceRotating = false; // release rotation lock
        resolve();
      }
    });
  });
}


let rotationDuration = 0.75; // seconds

// keyboard controls
window.addEventListener('keydown', (event) => {
  console.log(`Key pressed: ${event.key}`);
  if (event.key !== 'F12') {event.preventDefault()};

  switch(event.key) {
    case 'f': rotateFace('front', 'clockwise', 1); break;
    case 'F': rotateFace('front', 'counterclockwise', 1); break;
    case 'b': rotateFace('back', 'clockwise', 1); break;
    case 'B': rotateFace('back', 'counterclockwise', 1); break;
    case 'u': rotateFace('up', 'clockwise', 1); break;
    case 'U': rotateFace('up', 'counterclockwise', 1); break;
    case 'd': rotateFace('down', 'clockwise', 1); break;
    case 'D': rotateFace('down', 'counterclockwise', 1); break;
    case 'l': rotateFace('left', 'clockwise', 1); break;
    case 'L': rotateFace('left', 'counterclockwise', 1); break;
    case 'r': rotateFace('right', 'clockwise', 1); break;
    case 'R': rotateFace('right', 'counterclockwise', 1); break;
    
    case 'ArrowRight': rotateCube(cubePivot, 'y'); break;
    case 'ArrowLeft': rotateCube(cubePivot, '-y'); break;
    case 'ArrowUp': rotateCube(cubePivot, '-x'); break;
    case 'ArrowDown': rotateCube(cubePivot, 'x'); break;
  }
});


function addAxesHelper(object, size) {
    const axes = new THREE.AxesHelper(size);
    object.add(axes);
};

function identifyFaceCubelets() {
  const faceCubelets = {
    front: [],
    back: [],
    up: [],
    down: [],
    left: [],
    right: []
  };

  // for each face, find all cubelets that share the same x, y, or z coordinate as its center piece
  Object.entries(centerPieces).forEach(([face, center]) => {
    if (!center) {
      console.error(`Center piece not found for ${face} face`);
      return;
    }

    // get world position of center piece
    center.updateMatrixWorld(true);
    const centerWorldPos = center.getWorldPosition(worldPosition);
    
    // find all cubelets that share the same coordinate as the center piece
    cubelets.forEach(cubelet => {
      const cubletPos = new THREE.Vector3();
      cubelet.getWorldPosition(cubletPos);

      if (face === 'front' && Math.abs(cubletPos.z - centerWorldPos.z) < 0.1) {
        faceCubelets.front.push(cubelet);
      }
      else if (face === 'back' && Math.abs(cubletPos.z - centerWorldPos.z) < 0.1) {
        faceCubelets.back.push(cubelet);
      }
      else if (face === 'up' && Math.abs(cubletPos.y - centerWorldPos.y) < 0.1) {
        faceCubelets.up.push(cubelet);
      }
      else if (face === 'down' && Math.abs(cubletPos.y - centerWorldPos.y) < 0.1) {
        faceCubelets.down.push(cubelet);
      }
      else if (face === 'left' && Math.abs(cubletPos.x - centerWorldPos.x) < 0.1) {
        faceCubelets.left.push(cubelet);
      } else if (face === 'right' && Math.abs(cubletPos.x - centerWorldPos.x) < 0.1) {
        faceCubelets.right.push(cubelet);
      } 
    });
  });

  return faceCubelets;
}



const dropdownContent = document.querySelector('.dropdown-content');
const dropbtn = document.querySelector('.dropbtn');
const shuffleButton = document.getElementById('shuffle');
const resetButton = document.getElementById('reset');

const solveButton = document.getElementById('solve-button');
const algorithmPlaceholder = document.getElementById('algorithm');


let lastAlgorithm = [];
let isResetting = false;

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
}


// Iterate over each algorithm category (F2L, OLL, PLL)
Object.entries(algortihms).forEach(([category, algorithms]) => {
  const dropdownGroup = document.createElement('div');
  const groupTitle = document.createElement('p');
  
  groupTitle.classList.add('group-title');
  groupTitle.textContent = category;
  dropdownGroup.appendChild(groupTitle);
  
  dropdownGroup.classList.add('dropdown-group');
  dropdownContent.appendChild(dropdownGroup);
  
  // Iterate over each algorithm in the category
  Object.entries(algorithms).forEach(([id, data]) => {
    // create container
    const dropdownPair = document.createElement('div');
    dropdownPair.classList.add('dropdown-pair');
    
    dropdownPair.addEventListener('click', () => {
      algorithmPlaceholder.textContent = data.algorithm;
      executeReverse(data.algorithm, 0.2);
      
      solveButton.classList.remove('disabled');
      solveButton.classList.add('enabled');
      
      // Hide the dropdown content
      dropdownContent.classList.add('hidden');
    });
    
    dropdownGroup.appendChild(dropdownPair);
    
    // add icon
    const algorithmIcon = document.createElement('img');
    algorithmIcon.classList.add('algorithm-icon');
    algorithmIcon.src = data.icon;
    dropdownPair.appendChild(algorithmIcon);
    
    // add moves
    const algorithmMoves = document.createElement('p');
    algorithmMoves.textContent = data.algorithm;
    dropdownPair.appendChild(algorithmMoves);
  });
});


async function executeAlgorithm(algorithm, animationDuration) {
  console.log(`Executing algorithm: ${algorithm}`);
  const algorithmArray = algorithm.split(' ');
  
  const tempDuration = rotationDuration;
  rotationDuration = animationDuration;
  
  // Execute moves sequentially
  async function executeMoves() {
    for (const notation of algorithmArray) {
      // Check if reset was requested
      if (isResetting) {
        console.log('Reset requested, stopping algorithm execution');
        return;
      }

      console.log('executing: ', notation);

      try {
        switch(notation) {
          case "U": await rotateFace('up', 'clockwise', 1); break;
          case "U2": await rotateFace('up', 'clockwise', 2); break;
          case "U'": await rotateFace('up', 'counterclockwise', 1); break;

          case "D": await rotateFace('down', 'clockwise', 1); break;
          case "D2": await rotateFace('down', 'clockwise', 2); break;
          case "D'": await rotateFace('down', 'counterclockwise', 1); break;

          case "F": await rotateFace('front', 'clockwise', 1); break;
          case "F2": await rotateFace('front', 'clockwise', 2); break;
          case "F'": await rotateFace('front', 'counterclockwise', 1); break;

          case "B": await rotateFace('back', 'clockwise', 1); break;
          case "B2": await rotateFace('back', 'clockwise', 2); break;
          case "B'": await rotateFace('back', 'counterclockwise', 1); break;

          case "L": await rotateFace('left', 'clockwise', 1); break;
          case "L2": await rotateFace('left', 'clockwise', 2); break;
          case "L'": await rotateFace('left', 'counterclockwise', 1); break;

          case "R": await rotateFace('right', 'clockwise', 1); break;
          case "R2": await rotateFace('right', 'clockwise', 2); break;
          case "R'": await rotateFace('right', 'counterclockwise', 1); break;

          case "x": await rotateCube(cubePivot, '-x'); break;
          case "x'": await rotateCube(cubePivot, 'x'); break;

          case "y": await rotateCube(cubePivot, '-y'); break;
          case "y'": await rotateCube(cubePivot, 'y'); break;

          // rotate entire cube
          case "z": {
            await rotateCube(cubePivot, '-z');
          } break;

          case "z'": {
            await rotateCube(cubePivot, 'z');
          } break;
          
          // rotate 2 faces at once
          case "u": await rotateCube(cubePivot, '-y', 1, 'down'); break;
          case "u'": await rotateCube(cubePivot, 'y', 1, 'down'); break;

          case "d": await rotateCube(cubePivot, 'y', 1, 'up'); break;
          case "d'": await rotateCube(cubePivot, '-y', 1, 'up'); break;

          case "l": await rotateCube(cubePivot, 'x', 1, 'right'); break;
          case "l'": await rotateCube(cubePivot, '-x', 1, 'right'); break;

          case "r": await rotateCube(cubePivot, '-x', 1, 'left'); break;
          case "r'": await rotateCube(cubePivot, 'x', 1, 'left'); break;

          case "f": await rotateCube(cubePivot, '-z', 1, 'back'); break;
          case "f'": await rotateCube(cubePivot, 'z', 1, 'back'); break;

          case "b": await rotateCube(cubePivot, 'z', 1, 'front'); break;
          case "b'": await rotateCube(cubePivot, '-z', 1, 'front'); break;

        }
      } catch (error) {
        console.error(`Error executing move ${notation}:`, error);
        // Wait a bit before trying the next move if there was an error
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  await executeMoves();
  if (!isResetting) {  // Only update lastAlgorithm if we're not resetting
    lastAlgorithm = algorithm;
  }
  rotationDuration = tempDuration;
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

  await executeReverse(lastAlgorithm, 0.35);  // Now we wait for the algorithm to finish
  
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
    await new Promise(resolve => setTimeout(resolve, rotationDuration * 1000));
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