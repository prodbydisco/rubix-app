import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from '/node_modules/three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from '/node_modules/three/examples/jsm/geometries/TextGeometry.js';

const scene = new THREE.Scene(); // create scene
scene.background = new THREE.Color(0x000000); // set scene background

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
  
  root.scale.set(2, 2, 2);
  scene.add(root);

  centerPieces.front = root.getObjectByName('center_y');
  centerPieces.back = root.getObjectByName('center_w');
  centerPieces.up = root.getObjectByName('center_r');
  centerPieces.down = root.getObjectByName('center_o');
  centerPieces.left = root.getObjectByName('center_g');
  centerPieces.right = root.getObjectByName('center_b');

  
  // add individual cubes to cubelets array
  const addCubes = (object) => {

    object.children.forEach(collection => {
      collection.children.forEach(child => {
        if (child.name !== 'square') {
          cubelets.push(child);
        }});
      }
    );

    cubelets.sort();
  };
  addCubes(cube);
  
  positionFacePivots();
  addFaceLabels();
},
function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
},
function (error) {
    console.error('An error happened:', error);
});



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
  facePivots.back.rotation.set(0, Math.PI, 0);
  
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


// add labels to each cube face
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



function rotateFace(face, direction) {
  console.log(`Attempting to rotate ${face} face ${direction}`);
  
  const faceCubelets = identifyFaceCubelets()[face];
  console.log(`Found ${faceCubelets.length} cubelets for ${face} face`);
  
  if (faceCubelets.length === 0) {
    console.error(`No cubelets found for ${face} face!`);
    return;
  }
  
  const pivot = facePivots[face];
  const angle = direction === 'clockwise' ? -Math.PI / 2 : Math.PI / 2;
  
  // attach all cubelets to the pivot
  faceCubelets.forEach(cubelet => {
    // store world position and rotation
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    cubelet.getWorldPosition(worldPos);
    cubelet.getWorldQuaternion(worldQuat);
    
    // detach from current parent
    if (cubelet.parent) {
      cubelet.parent.remove(cubelet);
    }
    pivot.add(cubelet);
    
    // convert world position to local position relative to pivot
    cubelet.position.copy(worldPos);
    cubelet.position.sub(pivot.getWorldPosition(new THREE.Vector3()));
    cubelet.position.applyQuaternion(pivot.getWorldQuaternion(new THREE.Quaternion()).invert());
    
    // convert world rotation to local rotation
    cubelet.quaternion.copy(worldQuat);
    cubelet.quaternion.premultiply(pivot.getWorldQuaternion(new THREE.Quaternion()).invert());
  });
  
  // set rotation based on face
  switch(face) {
    case 'front':
      pivot.rotation.z = angle;
      break;
    case 'back':
      pivot.rotation.z = angle;
      break;
    case 'up':
      pivot.rotation.y = angle;
      break;
    case 'down':
      pivot.rotation.y = -angle;
      break;
    case 'left':
      pivot.rotation.x = -angle;
      break;
    case 'right':
      pivot.rotation.x = angle;
      break;
  }

  // detach cubelets after animation
  setTimeout(() => {
    faceCubelets.forEach(cubelet => {
      // store world position and rotation
      const worldQuat = new THREE.Quaternion();
      cubelet.getWorldPosition(worldPosition);
      cubelet.getWorldQuaternion(worldQuat);
      
      // detach from pivot
      pivot.remove(cubelet);
      
      // add back to scene
      cube.add(cubelet);
      scene.add(cubelet);
      
      // convert world position to local position relative to root
      const localPosition = worldPosition.clone();
      localPosition.sub(cube.getWorldPosition(new THREE.Vector3()));
      localPosition.applyQuaternion(cube.getWorldQuaternion(new THREE.Quaternion()).invert());
      
      // set final local position and rotation
      cubelet.position.copy(localPosition);
      cubelet.quaternion.copy(worldQuat);
    });
    
    // reset pivot rotation
    pivot.rotation.set(0, 0, 0);
  }, 500);
}

// keyboard controls
window.addEventListener('keydown', (event) => {
  console.log(`Key pressed: ${event.key}`);
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
