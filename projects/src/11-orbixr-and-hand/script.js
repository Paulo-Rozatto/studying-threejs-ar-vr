//-- Imports -------------------------------------------------------------------------------------
import * as THREE from '../../build2/three.module.js';
import { GLTFLoader } from '../../build2/jsm/loaders/GLTFLoader.js'
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { Orbi } from '../../libs/orbixr_handtracking.js';
// import {
//   onWindowResize,
// } from "../../libs/util/util.js";

//-----------------------------------------------------------------------------------------------
//-- MAIN SCRIPT --------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------

//-- Renderer settings ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(new THREE.Color("#232323"));
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.cameraAutoUpdate = false;
renderer.gammaFactor = 2.2;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap


//-- Setting scene and camera -------------------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, .1, 1000);

// camera.position.set(0, 1.6, 0);

// let xrCamera = renderer.xr.getCamera();
// console.log(xrCamera);
console.log(renderer.xr.getSession());

//-- 'Camera Holder' to help moving the camera
const cameraHolder = new THREE.Object3D();
// cameraHolder.position.set(0, 1.6, 0)
cameraHolder.add(camera);
scene.add(cameraHolder);

// controllers
const controller1 = renderer.xr.getController(0);
camera.add(controller1);
const config = {
  display: new THREE.Vector2(2, 2),
  orbits: [1, 2, 3],
  rotation: {
    theta: 0,
  },
  button: {
    transparent: true,
    opacity: 0.95
  },
  gap: new THREE.Vector2(0.003, 0.003),
  border: {
    enabled: true
  },
  font: {
    path: '../../assets/fonts/Roboto_Regular.json'
  },
  hand: {
    model: null,
    mixer: null,
    action: null,
  }
}

let orbi;
let mixer;


new GLTFLoader().load(
  // '/projects/assets/models/hand1.glb',
  '../../assets/models/hand1.glb',
  (gltf) => {
    mixer = new THREE.AnimationMixer(gltf.scene);

    // gltf.animations.forEach( function ( clip ) {
    //   console.log(clip);
    //   let act = mixer.clipAction( clip );
    //   // console.log(act);
    //   // act.setLoop(THREE.LoopRepeat);
    //   // act.startAt(2000)
    //   act.play();
    // } );
    let act = mixer.clipAction(gltf.animations[0]);
    act.setLoop( THREE.LoopOnce )
    act.clampWhenFinished = true
    act.enable = true

    // act.play();

    config.hand.model = gltf;
    config.hand.mixer = mixer;
    config.hand.action = act;

    // gltf.scene.position.set(0, 1.6, -1);
    // gltf.scene.scale.set(0.05, 0.05, 0.05);
    // scene.add(gltf.scene);


    orbi = new Orbi(camera, config);
    cameraHolder.add(orbi);

    orbi.addButton('1', '../07-testing-room/img/action1.png', () => { orbi.showMessage('button 1') });
    orbi.addButton('2', '../07-testing-room/img/action2.png', () => { orbi.showMessage('button 2') });
    orbi.addButton('3', '../07-testing-room/img/action3.png', () => { orbi.showMessage('button 3') });
    orbi.addButton('4', '../07-testing-room/img/action4.png', () => { orbi.showMessage('button 4') })

    orbi.showText('Olá')

    createScene();
    animate();
  },
  (xhr) => {

    console.log((xhr.loaded / xhr.total * 100) + '% loaded');

  },
  // called when loading has errors
  (error) => {

    console.log('An error happened', error);

  }
);

// Listen for the event.
// window.addEventListener('changed', function (e) {
//   orbi.showMessage('F: ' + e.detail.fingers)
// }, false);



//--  General globals ---------------------------------------------------------------------------
// window.addEventListener('resize', onWindowResize);


//-- Creating Scene and calling the main loop ----------------------------------------------------
// createScene();
// animate();

//------------------------------------------------------------------------------------------------
//-- FUNCTIONS -----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------

//-- Main loop -----------------------------------------------------------------------------------
function animate() {
  renderer.setAnimationLoop(render);
}

let clock = new THREE.Clock();

function render() {
  let delta = clock.getDelta();
  renderer.xr.updateCamera(camera);
  orbi.update();
  mixer.update(delta);
  renderer.render(scene, camera);
}


//------------------------------------------------------------------------------------------------
//-- Scene and auxiliary functions ---------------------------------------------------------------
//------------------------------------------------------------------------------------------------

//-- Create Scene --------------------------------------------------------------------------------
function createScene() {
  var axesHelper = new THREE.AxesHelper(12);
  scene.add(axesHelper);

  var planeGeometry = new THREE.PlaneGeometry(20, 20);
  var planeMaterial = new THREE.MeshBasicMaterial({
    color: "rgba(150, 150, 150)",
    side: THREE.DoubleSide,
  });
  var plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = Math.PI / 2;
  plane.position.y = -0.01;
  scene.add(plane);

  var cubeGeometry = new THREE.BoxGeometry(4, 4, 4);
  var cubeMaterial = new THREE.MeshNormalMaterial();
  var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  camera.add(cube);

  document.body.appendChild(VRButton.createButton(renderer));
}

