//-- Imports -------------------------------------------------------------------------------------
import * as THREE from '../../build/three.module.js';
import { VRButton } from '../../build/jsm/webxr/VRButton.js';
import { GLTFLoader } from '../../build/jsm/loaders/GLTFLoader.js';
import {
	onWindowResize,
} from "../../libs/util/util.js";

//-----------------------------------------------------------------------------------------------
//-- MAIN SCRIPT --------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------

//--  General globals ---------------------------------------------------------------------------
window.addEventListener('resize', onWindowResize);

//-- Renderer settings ---------------------------------------------------------------------------
let renderer = new THREE.WebGLRenderer();
renderer.setClearColor(new THREE.Color("#9C7747"));
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

//-- Setting scene and camera -------------------------------------------------------------------
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, .1, 1000);
let moveCamera; // Move when a button is pressed 

//-- 'Camera Holder' to help moving the camera
const cameraHolder = new THREE.Object3D();
cameraHolder.position.set(0, 5, 0)
cameraHolder.add(camera);
scene.add(cameraHolder);
//-- Create VR button and settings ---------------------------------------------------------------
document.body.appendChild(VRButton.createButton(renderer));

// controllers
var controller1 = renderer.xr.getController(0);
controller1.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);
window.addEventListener('keydown', onSelectStart);
window.addEventListener('keyup', onSelectEnd);
camera.add(controller1);

//-- Creating Scene and calling the main loop ----------------------------------------------------
createScene();
animate();

//------------------------------------------------------------------------------------------------
//-- FUNCTIONS -----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------

function move() {
	if (moveCamera) {
		// Get Camera Rotation
		let quaternion = new THREE.Quaternion();
		quaternion = camera.quaternion;

		// Get direction to translate from quaternion
		var moveTo = new THREE.Vector3(0, 0, -0.1);
		moveTo.applyQuaternion(quaternion);

		// Move the camera Holder to the computed direction
		cameraHolder.translateX(moveTo.x);
		cameraHolder.translateY(moveTo.y);
		cameraHolder.translateZ(moveTo.z);
	}
}

function onSelectStart() {
	moveCamera = true;
}

function onSelectEnd() {
	moveCamera = false;
}

//-- Main loop -----------------------------------------------------------------------------------
function animate() {
	renderer.setAnimationLoop(render);
}

function render() {
	move();
	renderer.render(scene, camera);
}

//------------------------------------------------------------------------------------------------
//-- Scene and auxiliary functions ---------------------------------------------------------------
//------------------------------------------------------------------------------------------------

//-- Create Scene --------------------------------------------------------------------------------
function createScene() {
	const light = new THREE.DirectionalLight(0xaaaaaa);
	light.position.set(20, 300, 100);
	light.castShadow = true;
	light.distance = 0;
	light.shadow.mapSize.width = 1024;
	light.shadow.mapSize.height = 1024;
	scene.add(light);

	var ambientLight = new THREE.AmbientLight(0x323232);
	scene.add(ambientLight);

	const loader = new GLTFLoader();

	// loading terrain and rocks
	loader.load(
		'../../assets/models/mars2.glb',
		function (gltf) {

			scene.add(gltf.scene);
			gltf.scene.traverse(e => {
				if (/ground/.test(e.name)) {
					e.receiveShadow = true;
				}
				else {
					e.castShadow = true;
				}

				if (/special*/.test(e.name)) {
					e.material.emissive.setRGB(8, 2, 2)
					e.material.emissiveIntensity = 0.01;
				}
			});
		},
		function (xhr) {
			console.log('terrain: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
		},
		function (error) {

			console.log('An error happened', error);

		}
	);

	// loading rover
	loader.load(
		'../../assets/models/perseverance.glb',
		function (gltf) {
			const rover = gltf.scene;

			rover.rotation.y = Math.PI;
			rover.position.z = -5;
			scene.add(rover);
		},
		function (xhr) {
			console.log('rover: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
		},
		function (error) {
			console.log('An error happened', error)
		}
	);
}
