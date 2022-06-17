import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { PositionalAudioHelper } from '../../build2/jsm/helpers/PositionalAudioHelper.js';

import { Orbi } from '../../libs/orbixr.js';
import { makePuzzle, physicBox, setFloor } from './puzzles.js'

let camera, scene, light, renderer, controller, cameraHolder, clock;
let orbi;

let cube;
let onGoing = true;

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

    let puzzle1 = makePuzzle(
        [{ x: -0.4, y: 0.6 }, { x: 0.4, y: 0 }, { x: -0.4, y: -0.6 }]
    );
    puzzle1.position.set(0, 1, -2);
    scene.add(puzzle1)

    let puzzle2 = makePuzzle(
        [{ x: -0.4, y: 0.6 }, { x: 0.1, y: 0.1 }, { x: 0.45, y: -0.55 }],
        [{ x: -0.15, y: 0.35, z: 0.25 }, { x: 0.2, y: -0.8, z: 0.25 }]
    );
    puzzle2.position.set(0, 1, 2);
    puzzle2.rotateY(Math.PI);
    scene.add(puzzle2)

    let puzzle3 = makePuzzle(
        [{ x: -0.4, y: 0.6 }, { x: 0.4, y: -0.05 }, { x: 0, y: -0.55 }],
        [{ x: 0.2, y: -0.3, z: 0.25 }, { x: 0, y: -0.8, z: 0.25 }]
    );
    puzzle3.position.set(2, 1, 0);
    puzzle3.rotateY(Math.PI * -0.5);
    scene.add(puzzle3)

    const listener = new THREE.AudioListener();
    camera.add(listener);

    // create the PositionalAudio object (passing in the listener)
    const hitSound = new THREE.PositionalAudio(listener);
    const winSound = new THREE.PositionalAudio(listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('../../assets/sounds/copy.wav', function (buffer) {
        hitSound.setBuffer(buffer);
        hitSound.setRefDistance(1);
    });

    audioLoader.load('../../assets/sounds/win.wav', function (buffer) {
        winSound.setBuffer(buffer);
        winSound.setRefDistance(1);
    })

    cube = physicBox(hitSound);
    cube.add(hitSound);
    puzzle1.add(cube);
    cube.position.set(-0.3, 1, 0.25);

    let listIndex = 0;
    const puzzleList = [puzzle1, puzzle3, puzzle2]
    let onHitFloor = () => {
        let currentPuzzle = puzzleList[listIndex];
        currentPuzzle.add(winSound);
        winSound.play();
        cube.isOnFloor = true;


        if (listIndex < 2) {
            setTimeout(() => {
                listIndex += 1;
                let nextPuzzle = puzzleList[listIndex];
                nextPuzzle.add(cube);
                cube.position.set(-0.3, 1, 0.25);

                cube.isOnFloor = false;
            }, 500);
        }
        else {
            onGoing = false;
        }
    }
    setFloor(floor, onHitFloor);

    // Orbi Config
    const config = {
        display: new THREE.Vector2(1, 2),
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

    config.rotation.theta = Math.PI + Math.PI / 4;


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

    if (onGoing)
        cube.update(delta);

    renderer.render(scene, camera);
}