//-- Imports -------------------------------------------------------------------------------------
import * as THREE from '../../build/three.module.js';
import { VRButton } from '../../build/jsm/webxr/VRButton.js';
import { GLTFLoader } from '../../build/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from '../../build/jsm/controls/PointerLockControls.js'
import Stats from '../../libs/stats.module.js';
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
renderer.gammaFactor = 2.2;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

//-- Stats settings ---------------------------------------------------------------------------

const stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms

// Align top-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';

document.getElementById('stats').appendChild(stats.domElement);

//-- Setting scene and camera -------------------------------------------------------------------
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, .1, 1000);
let moveCamera; // Move when a button is pressed 

camera.position.set(0, 0, 0);

//-- 'Camera Holder' to help moving the camera
const cameraHolder = new THREE.Object3D();
cameraHolder.position.set(0, 2, 0)
cameraHolder.add(camera);
scene.add(cameraHolder);
//-- Create VR button and settings ---------------------------------------------------------------
document.body.appendChild(VRButton.createButton(renderer));

// controllers
const controller1 = renderer.xr.getController(0);
controller1.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);
window.addEventListener('keydown', onSelectStart);
window.addEventListener('keyup', onSelectEnd);
camera.add(controller1);

//-- Global objects ----------------------------------------------------
const clock = new THREE.Clock();
const rocks = [], ground = [];
const vecOrigin2d = new THREE.Vector2(0, 0); // origin for raycaster
const quaternion = new THREE.Quaternion(); // aux quaternion to movement
let aimLine, delta, raycaster, rayTime = 0, intersection, lastRock = null, groundIntersection;

//-- Creating Scene and calling the main loop ----------------------------------------------------
createScene();
animate();

//------------------------------------------------------------------------------------------------
//-- FUNCTIONS -----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------

function move() {
	raycaster.setFromCamera(vecOrigin2d, camera);
	if (moveCamera) {

		groundIntersection = raycaster.intersectObjects(ground)[0];

		if (!groundIntersection || groundIntersection.distance > 2) {
			// Get Camera Rotation
			quaternion.copy(camera.quaternion);

			// Get direction to translate from quaternion
			var moveTo = new THREE.Vector3(0, 0, -0.1);
			moveTo.applyQuaternion(quaternion);

			// Move the camera Holder to the computed direction
			cameraHolder.translateX(moveTo.x);
			cameraHolder.translateY(moveTo.y);
			cameraHolder.translateZ(moveTo.z);
		}
	}
}

function detectRocks(delta) {
	rayTime += delta;

	if (rayTime > 3) { // raycast for rocks every 3 seconds
		rayTime = 0;
		intersection = raycaster.intersectObjects(rocks)[0];

		if (intersection && intersection.object != lastRock) {
			console.log(intersection);
			lastRock = intersection.object;
			aimLine.scale.y = intersection.distance;
			aimLine.visible = true;
		}
		else {
			if (lastRock != null) {
				lastRock.material.emissive.setRGB(1, 1, 0);
				lastRock.material.emissiveIntensity = 0.1
				aimLine.material.color.setRGB(255, 0, 0);
				aimLine.visible = false;
			}
		}
	}
}

function rayAnimation(delta) {
	if (aimLine.visible) {
		aimLine.material.color.r -= delta * 2;
		aimLine.material.color.g += delta / 2;
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
	delta = clock.getDelta();
	move();
	stats.update();
	detectRocks(delta);
	rayAnimation(delta);
	renderer.render(scene, camera);
}

//------------------------------------------------------------------------------------------------
//-- Scene and auxiliary functions ---------------------------------------------------------------
//------------------------------------------------------------------------------------------------

//-- Create Scene --------------------------------------------------------------------------------
function createScene() {
	let fogColor = new THREE.Color(0xB77700);
	scene.background = fogColor;
	scene.fog = new THREE.Fog(fogColor, 0.025, 100);

	const light = new THREE.SpotLight(0xaaaaaa);
	light.position.set(20, 100, 200);
	light.castShadow = true;
	light.distance = 0;
	light.shadow.mapSize.width = 1024; // default
	light.shadow.mapSize.height = 1024; // default
	light.shadow.camera.near = 1; // default
	light.shadow.camera.far = 500; // default
	light.shadow.focus = 1; // default

	scene.add(light);

	const hemisphereLight = new THREE.HemisphereLight(0x605500, 0x080820, 1);
	hemisphereLight.position.y = 100;
	scene.add(hemisphereLight);

	const barGeo = new THREE.PlaneBufferGeometry(0.03, 0.0075);
	const barMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

	const horiBar = new THREE.Mesh(barGeo, barMat);
	horiBar.position.set(0, 0, -1);
	camera.add(horiBar);

	const vertiBar = horiBar.clone();
	vertiBar.rotation.z = Math.PI / 2;
	camera.add(vertiBar);

	const aimGeo = new THREE.CylinderBufferGeometry(0.01, 0.01, 1);
	const aimMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
	aimLine = new THREE.Mesh(aimGeo, aimMat);
	aimLine.position.y = -0.1;
	aimLine.rotation.x = Math.PI / 2;
	aimLine.visible = false;
	camera.add(aimLine);

	const loader = new GLTFLoader();
	//-------- loading terrain and rocks --------
	loader.load(
		'../../assets/models/mars3.glb',
		function (gltf) {

			scene.add(gltf.scene);
			gltf.scene.traverse(e => {
				e.matrixAutoUpdate = false;
				e.updateMatrix();

				if (/ground*/.test(e.name)) {
					console.log(e.material);
					e.receiveShadow = true;
					ground.push(e);
				}
				else {
					e.castShadow = true;
					rocks.push(e);
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

	const controls = new PointerLockControls(camera, document.body);

	window.addEventListener('click', () => { controls.lock() });

	//-------- loading rover --------
	loader.load(
		'../../assets/models/perseverance.glb',
		function (gltf) {
			const rover = gltf.scene;

			rover.rotation.y = Math.PI;
			rover.position.z = -5;
			rover.castShadow = true;
			rover.matrixAutoUpdate = false

			rover.updateMatrix();
			scene.add(rover);
		},
		function (xhr) {
			console.log('rover: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
		},
		function (error) {
			console.log('An error happened', error)
		}
	);

	//-------- Creating aim line --------
	const points = [
		new THREE.Vector3(0, -0.1, -5),
		new THREE.Vector3(0, -0.1, 0),
	];

	raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 0, 5);
	raycaster.ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1));
}
