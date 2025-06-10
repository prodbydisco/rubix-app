import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from '/node_modules/dat.gui/build/dat.gui.module.js';

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
      console.log('Front face cubelet:', cubelet.name);
    } else if (Math.abs(tempWorldPos.x) < 0.1 && Math.abs(tempWorldPos.y) < 0.1 && tempWorldPos.z < 0) {
      centerPieces.back = cubelet;
      console.log('Back face cubelet:', cubelet.name);
    } else if (Math.abs(tempWorldPos.x) < 0.1 && tempWorldPos.y > 0 && Math.abs(tempWorldPos.z) < 0.1) {
      centerPieces.up = cubelet;
      console.log('Up face cubelet:', cubelet.name);
    } else if (Math.abs(tempWorldPos.x) < 0.1 && tempWorldPos.y < 0 && Math.abs(tempWorldPos.z) < 0.1) {
      centerPieces.down = cubelet;
      console.log('Down face cubelet:', cubelet.name);
    } else if (tempWorldPos.x < 0 && Math.abs(tempWorldPos.y) < 0.1 && Math.abs(tempWorldPos.z) < 0.1) {
      centerPieces.left = cubelet;
      console.log('Left face cubelet:', cubelet.name);
    } else if (tempWorldPos.x > 0 && Math.abs(tempWorldPos.y) < 0.1 && Math.abs(tempWorldPos.z) < 0.1) {
      centerPieces.right = cubelet;
      console.log('Right face cubelet:', cubelet.name);
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



function rotateCube(pivot, axis) {
  if (isRotating) { return } else { isRotating = true };

  cubelets.forEach(cubelet => {
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

  // rotate the axis
  switch(axis) {
    case 'x': pivot.rotation.x = Math.PI / 2; break;
    case 'y': pivot.rotation.y = Math.PI / 2; break;
    case '-x': pivot.rotation.x = -Math.PI / 2; break;
    case '-y': pivot.rotation.y = -Math.PI / 2; break;
  }

  // detach cubelets after animation
  cubelets.forEach(cubelet => {
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
  })

  // reset rotation of parent axis
  pivot.rotation.set(0,0,0);
  
  isRotating = false; // release rotation lock
};



const ROTATION_DURATION = 0.2; // duration in seconds for rotation
let isRotating = false; // flag to prevent multiple rotations

function rotateFace(face, direction) {
  getCenterPieces();
  // prevent new rotation if one is in progress
  if (isRotating) {
    return;
  }

  console.log(`Attempting to rotate ${face} face ${direction}`);
  
  const faceCubelets = identifyFaceCubelets()[face];
  console.log(`Found ${faceCubelets.length} cubelets for ${face} face`);
  
  if (faceCubelets.length === 0) {
    console.error(`No cubelets found for ${face} face!`);
    return;
  }
  
  isRotating = true; // set rotation lock
  
  const pivot = facePivots[face];
  const angle = direction === 'clockwise' ? -Math.PI / 2 : Math.PI / 2;
  
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

  // animate the rotation using GSAP
  gsap.to(pivot.rotation, {
    [rotationAxis]: targetRotation,
    duration: ROTATION_DURATION,
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
      isRotating = false; // release rotation lock
    }
  });
}

// keyboard controls
window.addEventListener('keydown', (event) => {
  console.log(`Key pressed: ${event.key}`);
  if (event.key !== 'F12') {event.preventDefault()};

  switch(event.key) {
    case 'f': rotateFace('front', 'clockwise'); break;
    case 'F': rotateFace('front', 'counterclockwise'); break;
    case 'b': rotateFace('back', 'clockwise'); break;
    case 'B': rotateFace('back', 'counterclockwise'); break;
    case 'u': rotateFace('up', 'clockwise'); break;
    case 'U': rotateFace('up', 'counterclockwise'); break;
    case 'd': rotateFace('down', 'clockwise'); break;
    case 'D': rotateFace('down', 'counterclockwise'); break;
    case 'l': rotateFace('left', 'clockwise'); break;
    case 'L': rotateFace('left', 'counterclockwise'); break;
    case 'r': rotateFace('right', 'clockwise'); break;
    case 'R': rotateFace('right', 'counterclockwise'); break;
    
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



// GUI controls
const gui = new GUI();

const baseFaceRotation = {
  white: [],
  yellow: 0,
  orange: [],
  red: [],
  blue: ['y', -Math.PI / 2],
  green: ['y', Math.PI / 2],
};

// gui.add(baseFaceRotation);


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
