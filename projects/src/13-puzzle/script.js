import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { GLTFLoader } from '../../build2/jsm/loaders/GLTFLoader.js';

import { Orbi } from '../../libs/orbixr.js';
import { collidable, groundList, makePuzzle, makeVShelf, makeWall, physicBox } from './puzzles.js'

let camera, scene, light, renderer, controller, cameraHolder, clock;
let raycaster, up, down, right, left, intersection;
let orbi;

let cube, copter, puzzle1, puzzle2;
// let rightWall, leftWall;

const FRICTION = 1; //-- m/s --//

let state = 0;
const STATES = [
    { left: 0, down: 0, right: 0, up: 1 },
    { left: 0, down: -1, right: 1, up: 0 },
    { left: -1, down: 1, right: 0, up: 0 },
    { left: 0, down: 0, right: 0, up: -1 },
]

await init();
animate();

async function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 1.6, 0);

    controller = renderer.xr.getController(0);
    camera.add(controller);

    cameraHolder = new THREE.Object3D();
    // cameraHolder.rotateY(Math.PI)
    cameraHolder.add(camera);
    scene.add(cameraHolder);

    light = new THREE.SpotLight(0xeeeeaa);
    light.position.set(30, 30, 0);
    scene.add(light);

    let ambient = new THREE.AmbientLight(0x323232, 0.5)
    scene.add(ambient);

    const textureLoader = new THREE.TextureLoader();

    const floorTex = textureLoader.load('../../assets/textures/wood.jpg');
    floorTex.wrapS = THREE.MirroredRepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);
    const floorGeo = new THREE.PlaneBufferGeometry(10, 10);
    const floorMat = new THREE.MeshPhongMaterial({ map: floorTex })
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotateX(Math.PI * -0.5);
    scene.add(floor);

    cube = physicBox();
    cube.position.set(-0.3, 2, -1.7);
    scene.add(cube);

    let sh1 = { x: -0.4, y: 0.6 }
    let sh2 = { x: 0.4, y: 0 }
    let sh3 = { x: -0.4, y: -0.6 }

    let puzzle1 = makePuzzle(sh1, sh2, sh3);
    puzzle1.position.set(0, 1, -2);
    scene.add(puzzle1)

    sh1 = { x: -0.4, y: 0.6 }
    sh2 = { x: 0.1, y: 0.1 }
    sh3 = { x: 0.45, y: -0.55 }

    let puzzle2 = makePuzzle(sh1, sh2, sh3);
    puzzle2.position.set(0, 1, 2);
    puzzle2.rotateY(Math.PI);
    scene.add(puzzle2)

    let wall1 = makeVShelf("nome");
    wall1.position.set(-0.15, 0.35, 0.25)
    puzzle2.add(wall1);

    let wall2 = makeVShelf("nome2");
    wall2.position.set(0.2, -0.8, 0.25)
    puzzle2.add(wall2);

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 0.1);
    up = new THREE.Vector3(0, 1, 0);
    down = new THREE.Vector3(0, -1, 0);
    right = new THREE.Vector3(1, 0, 0);
    left = new THREE.Vector3(-1, 0, 0);
    intersection = [];


    // Orbi Config
    const config = {
        display: new THREE.Vector2(2, 2),
        orbits: [1, 2, 3],
        rotation: {
            theta: Math.PI / 4,
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
        tracking: {
            enabled: false
        }
    }

    orbi = new Orbi(camera, config);
    cameraHolder.add(orbi);

    orbi.addButton('3', 'img/left.png', () => {
        cube.speed.x = -1;
    });
    orbi.addButton('4', 'img/right.png', () => {
        cube.speed.x = 1;
    });

    collidable.push(floor);
    groundList.push(floor)

    config.rotation.theta = Math.PI + Math.PI / 4;


    clock = new THREE.Clock();

    document.body.appendChild(VRButton.createButton(renderer));
}

function animate() {
    renderer.setAnimationLoop(render);
}

let delta, time = 0;
function render() {
    orbi.update();

    delta = clock.getDelta();
    time += delta;

    cube.update(delta);

    renderer.render(scene, camera);
}



function movementAndCollision(object, axis = 'x') {
    let minDist = 0.08;

    if (object.speed[axis] > 0.1) {
        let dir = right;
        if (axis === 'y') {
            dir = up;
            minDist = 0.15
        }
        raycaster.set(object.position, dir);
        raycaster.intersectObjects(collidable, false, intersection)

        if (intersection.length == 0 && axis === 'x') {
            object.position[axis] += object.speed[axis] * delta;
            object.speed[axis] -= FRICTION * delta
        }
        else if (axis == 'x') {
            object.speed[axis] = 0;
            if (intersection[0].distance < minDist) {
                object.position[axis] -= minDist - 0.01 - intersection[0].distance;
            }
            intersection.length = 0;
        }
    }
    else if (object.speed[axis] < -0.1) {
        let dir = axis === 'x' ? left : down;
        console.log(axis === 'x' ? 'left' : 'down')
        raycaster.set(object.position, dir);
        raycaster.intersectObjects(collidable, false, intersection)

        if (intersection.length == 0) {
            object.position[axis] += object.speed[axis] * delta;
            object.speed[axis] += FRICTION * delta
        }
        else {
            object.speed[axis] = 0;
            if (intersection[0].distance < minDist) {
                object.position[axis] += minDist - 0.01 - intersection[0].distance;
            }
            intersection.length = 0;
        }
    }
}

function asyncLoader(url, onLoad, onProgress, onError) {
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
        loader.load(
            url,
            // on load function
            (gltf) => {
                // onLoad(gltf);
                resolve(gltf.scene);
            },
            // on progress function
            onProgress,
            // on error function
            (error) => {
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject;
            }
        );
    });
};