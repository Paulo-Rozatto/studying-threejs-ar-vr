import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { GLTFLoader } from '../../build2/jsm/loaders/GLTFLoader.js';

import { Orbi } from '../../libs/orbixr.js';
import { collidable, groundList, makePuzzle, physicBox } from './puzzles.js'

let camera, scene, light, renderer, controller, cameraHolder, clock;
let raycaster, up, down, right, left, intersection;
let orbi, orbi2;

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

    // const cubeTex = textureLoader.load('../../assets/textures/crate.jpg')
    // const cubeGeo = new THREE.BoxBufferGeometry(0.15, 0.15, 0.15);
    // const cubeMat = new THREE.MeshPhongMaterial({ map: cubeTex });
    // cube = new THREE.Mesh(cubeGeo, cubeMat);
    // cube.position.set(-0.2, 2, -1.7);
    // cube.speed = { x: 0, y: 0 };
    cube = physicBox();
    cube.position.set(-0.2, 2, -1.7);
    scene.add(cube);

    let sh1 = { x: -0.4, y: 0.6 }
    let sh2 = { x: 0.4, y: 0 }
    let sh3 = { x: -0.4, y: -0.6 }


    let puzzle1 = makePuzzle(sh1, sh2, sh3);
    puzzle1.position.set(0, 1, -2);
    scene.add(puzzle1)

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

    // orbi.addButton('1', 'img/up.png', () => {
    //     // move('up')
    // });
    // orbi.addButton('2', 'img/down.png', () => {
    //     // move('down')
    // });
    orbi.addButton('3', 'img/left.png', () => {
        // move('left')
        cube.speed.x = -1;
    });
    orbi.addButton('4', 'img/right.png', () => {
        // move('right')
        cube.speed.x = 1;
    });

    puzzle2 = makePuzzle(sh1, sh2, sh3);
    puzzle2.rotation.y = Math.PI;
    puzzle2.position.y = 1;
    puzzle2.position.z = 2;
    scene.add(puzzle2)

    copter = await asyncLoader('../../assets/models/circuits/fan-block.glb')
    console.log(copter.getObjectByName('fan'))
    copter.position.set(0.3, 1.6, 1.7);
    copter.speed = { x: 0, y: 0 }
    scene.add(copter)

    collidable.push(floor);
    groundList.push(floor)

    config.rotation.theta = Math.PI + Math.PI / 4;
    orbi2 = new Orbi(camera, config);
    cameraHolder.add(orbi2);

    orbi2.addButton('21', 'img/up.png', () => {
        copter.speed.y = 1;
    });
    orbi2.addButton('22', 'img/down.png', () => {
        copter.speed.y = -1;
    });
    orbi2.addButton('23', 'img/left.png', () => {
        copter.speed.x = 1;
    });
    orbi2.addButton('24', 'img/right.png', () => {
        copter.speed.x = -1;
    });

    clock = new THREE.Clock();

    document.body.appendChild(VRButton.createButton(renderer));
}

function animate() {
    renderer.setAnimationLoop(render);
}

let delta, time = 0;
function render() {
    orbi.update();
    orbi2.update()

    delta = clock.getDelta();
    time += delta;
    // copter.getObjectByName('fan').rotation.y -= 7 * delta;
    copter.children[3].rotation.y -= 7 * delta;

    cube.update(delta);

    movementAndCollision(copter, 'y')
    intersection.length = 0;

    movementAndCollision(copter)
    intersection.length = 0;

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