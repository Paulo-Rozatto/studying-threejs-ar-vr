import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { GLTFLoader } from '../../build2/jsm/loaders/GLTFLoader.js'

import { Orbi } from '../../libs/orbixr.js';
import { makePuzzle, physicBox, setFloor } from './puzzles.js'
import { HandTrack } from '../12-tfjs-handtracking/ht.js'

let camera, scene, light, renderer, controller, cameraHolder, clock;
let orbi;

let cube;
let onGoing = true;

let timerHasStarted = false, start, times = [];

let mixer;

init();

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
    // controller.addEventListener('selectstart', (e) => { console.log(e) })
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
    // scene.add(puzzle1)

    // let puzzle4 = makePuzzle([
    //     { x: -0.4, y: 0.7 },
    //     { x: 0.4, y: 0.3 },
    //     { x: -0.4, y: -0.1 },
    //     { x: 0.4, y: -0.55 },

    // ],
    //     [{ x: 0.2, y: -0.8, z: 0.25 }]
    // )
    // puzzle4.position.set(0, 1, -2);
    // scene.add(puzzle4);

    // let puzzle5 = makePuzzle([
    //     { x: -0.4, y: 0.7 },
    //     { x: 0.1, y: 0.2 },
    //     { x: 0.4, y: -0.2 },
    //     { x: -0.4, y: -0.55 },
    
    // ],
    //     [{ x: -0.2, y: 0.45, z: 0.25 }, { x: -0.2, y: -0.8, z: 0.25 }]
    // )
    // puzzle5.position.set(0, 1, -2);
    // scene.add(puzzle5);

    let puzzle6 = makePuzzle([
        { x: -0.4, y: 0.7 },
        { x: 0.4, y: 0.35 },
        { x: 0, y: -0.15 },
        { x: -0.4, y: -0.65 },
    
    ],
        [{ x: 0.3, y: 0.1, z: 0.25 }, { x: -0.3, y: -0.9, z: 0.25 }]
    )
    puzzle6.position.set(0, 1, -2);
    scene.add(puzzle6);

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
    // puzzle1.add(cube);
    puzzle6.add(cube);
    cube.position.set(-0.3, 1, 0.25);

    const puzzleList = [puzzle1, puzzle3, puzzle2]
    let puzzleIndex = 0;
    let onHitFloor = () => {
        let currentPuzzle = puzzleList[puzzleIndex];
        currentPuzzle.add(winSound);
        winSound.play();
        cube.isOnFloor = true;

        if (puzzleIndex < 2) {
            times[puzzleIndex] = performance.now();

            setTimeout(() => {
                puzzleIndex += 1;
                let nextPuzzle = puzzleList[puzzleIndex];
                nextPuzzle.add(cube);
                cube.position.set(-0.3, 1, 0.25);

                cube.isOnFloor = false;
            }, 500);
        }
        else {
            times[puzzleIndex] = performance.now();

            onGoing = false;
            console.log('Start: ', start);
            console.log('Times: ', times);
            console.log(times[0] - start);
            console.log(times[1] - times[0]);
            console.log(times[2] - times[1]);
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
        hand: {
            model: null,
            mixer: null,
            action: null,
        },
        tracking: {
            enabled: false,
            handTrack: null,
        },
        joystick: {
            enabled: false,
            controller
        }
    }

    new GLTFLoader().load(
        '../../assets/models/hand2.glb',
        (gltf) => {
            mixer = new THREE.AnimationMixer(gltf.scene);

            let act = mixer.clipAction(gltf.animations[0]);
            act.setLoop(THREE.LoopOnce)
            act.clampWhenFinished = true
            act.enable = true

            act.play();

            config.hand.model = gltf;
            config.hand.mixer = mixer;
            config.hand.action = act;

            config.tracking.handTrack = HandTrack;


            orbi = new Orbi(camera, config);
            cameraHolder.add(orbi);

            orbi.addButton('3', 'img/left.png', () => {
                cube.speed.x = -1;

                if (!timerHasStarted) {
                    start = performance.now()
                    timerHasStarted = true;
                }
            });

            orbi.addButton('4', 'img/right.png', () => {
                cube.speed.x = 1;
                if (!timerHasStarted) {
                    start = performance.now()
                    timerHasStarted = true;
                }
            });

            window.addEventListener('keydown', e => {
                switch (e.key) {
                    case "1":
                        orbi.changeMode(Orbi.DWELLING);
                        break;
                    case "2":
                        orbi.changeMode(Orbi.HAND);
                        break;
                    case "3":
                        orbi.changeMode(Orbi.JOYSTICK);
                        break;
                }
            })

            config.rotation.theta = Math.PI + Math.PI / 4;


            clock = new THREE.Clock();

            document.body.appendChild(VRButton.createButton(renderer));

            animate();
        },
        (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
        (error) => { console.log('An error happened', error); }
    );
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