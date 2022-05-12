import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { Orbi } from '../../libs/orbixr.js';

let camera, scene, light, renderer, controller, cameraHolder, clock;
let raycaster, down, right, left, groundList, intersection;
let orbi;

let cube, puzzle, cubeSpeed;
let rightWall, leftWall;

const SPEED = 1; //-- m/s --//

let state = 0;
const STATES = [
    { left: 0, down: 0, right: 0, up: 1 },
    { left: 0, down: -1, right: 1, up: 0 },
    { left: -1, down: 1, right: 0, up: 0 },
    { left: 0, down: 0, right: 0, up: -1 },
]

init();
animate();

function init() {
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
    cameraHolder.add(camera);
    scene.add(cameraHolder);

    light = new THREE.SpotLight(0xeeeeaa);
    light.position.set(0, 30, 50);
    scene.add(light);

    const floorGeo = new THREE.PlaneBufferGeometry(10, 10);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x878787 })
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotateX(Math.PI * -0.5);
    scene.add(floor);

    const cubeGeo = new THREE.BoxBufferGeometry(0.15, 0.15, 0.15);
    const cubeMat = new THREE.MeshPhongMaterial({ color: 0x770000 });
    cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(-0.2, 2, -1.7);
    scene.add(cube);

    puzzle = new THREE.Group();
    const puzMat = new THREE.MeshPhongMaterial({ color: 0x440077 });

    const rearGeo = new THREE.PlaneBufferGeometry(2, 2)
    const rear = new THREE.Mesh(rearGeo, puzMat);
    puzzle.add(rear);

    const wallGeo = new THREE.BoxBufferGeometry(0.2, 2, 0.5);

    leftWall = new THREE.Mesh(wallGeo, cubeMat);
    leftWall.position.x = -0.9;
    leftWall.position.z = 0.25;
    puzzle.add(leftWall);

    rightWall = leftWall.clone();
    rightWall.position.x = 0.9;
    puzzle.add(rightWall);

    const tempMat = new THREE.MeshPhongMaterial({ color: 0x555511 })
    const shelfGeo = new THREE.BoxBufferGeometry(0.8, 0.1, 0.4);
    const shelf1 = new THREE.Mesh(shelfGeo, tempMat);
    shelf1.position.set(-0.4, 0.4, 0.2);
    const shelf2 = shelf1.clone();
    shelf2.position.set(0.4, -0.4, 0.2);
    puzzle.add(shelf1);
    puzzle.add(shelf2);

    puzzle.position.set(0, 1, -2)
    scene.add(puzzle);

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 0.08);
    down = new THREE.Vector3(0, -1, 0);
    right = new THREE.Vector3(1, 0, 0);
    left = new THREE.Vector3(-1, 0, 0);
    groundList = [floor, shelf1, shelf2];
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
        cubeSpeed = -1;
    });
    orbi.addButton('4', 'img/right.png', () => {
        // move('right')
        cubeSpeed = 1;
    });
    // orbi.visible = false

    clock = new THREE.Clock();

    document.body.appendChild(VRButton.createButton(renderer));
}

function animate() {
    renderer.setAnimationLoop(render);
}

let delta;
function render() {
    orbi.update();

    delta = clock.getDelta();
    raycaster.set(cube.position, down);
    raycaster.intersectObjects(groundList, false, intersection);

    if (intersection.length == 0) {
        cube.position.y -= SPEED * delta;
    }
    else if (intersection[0].distance < 0.08) {
        cube.position.y += 0.07 - intersection[0].distance;
    }

    intersection.length = 0;

    if (cubeSpeed > 0.1) {
        raycaster.set(cube.position, right);
        raycaster.intersectObject(rightWall, false, intersection)

        if (intersection.length == 0) {
            cube.position.x += cubeSpeed * delta;
            cubeSpeed -= SPEED * delta
        }
        else {
            cubeSpeed = 0;
            if (intersection[0].distance < 0.08) {
                cube.position.x -= 0.07 - intersection[0].distance;
            }
            intersection.length = 0;
        }
    }
    else if (cubeSpeed < -0.1) {
        raycaster.set(cube.position, left);
        raycaster.intersectObject(leftWall, false, intersection)

        if (intersection.length == 0) {
            cube.position.x += cubeSpeed * delta;
            cubeSpeed += SPEED * delta
        }
        else {
            cubeSpeed = 0;
            if (intersection[0].distance < 0.08) {
                cube.position.x += 0.07 - intersection[0].distance;
            }
            intersection.length = 0;
        }
    }

    renderer.render(scene, camera);
}