import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { GLTFLoader } from '../../build2/jsm/loaders/GLTFLoader.js'

import { Orbi } from '../../libs/orbixr.js';
import { makePuzzle, physicBox, setFloor } from './puzzle-creation-library.js'
import { HandTrack } from '../12-tfjs-handtracking/ht.js'

let camera, scene, light, renderer, controller, cameraHolder, clock, orbi;

let cube, onGoing = true;

let moves, mode, usedMoves = 0;
let timerHasStarted = false, start, times = [];

let mixer;

init();

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

    const params = (new URL(document.location)).searchParams;

    moves = params.get('moves') || 3;
    moves = parseInt(moves);

    let { puzzle1, puzzle2, puzzle3 } = choosePuzzlesByMoves(moves);
    scene.add(puzzle1);
    scene.add(puzzle2);
    scene.add(puzzle3);

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
    cube.setPosition(1, 5);

    const puzzleList = [puzzle1, puzzle2, puzzle3]
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

                if (nextPuzzle.initialPos) {
                    cube.setPosition(nextPuzzle.initialPos.x, nextPuzzle.initialPos.y)
                }
                else {
                    cube.setPosition(1, 5);
                }


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

            download();
        }
    }
    setFloor(floor, onHitFloor);

    mode = params.get('mode') || 0;
    mode = parseInt(mode);

    const config = await generateOrbiConfig(mode)
    orbi = new Orbi(camera, config);
    cameraHolder.add(orbi);

    orbi.addButton('3', 'img/left.png', () => {
        // cube.speed.x = -1;
        cube.setSpeed(-1);

        if (!timerHasStarted) {
            start = performance.now()
            timerHasStarted = true;
        }
    });

    orbi.addButton('4', 'img/right.png', () => {
        cube.setSpeed(1);
        if (!timerHasStarted) {
            start = performance.now()
            timerHasStarted = true;
        }
    });

    config.rotation.theta = Math.PI + Math.PI / 4;


    clock = new THREE.Clock();

    document.body.appendChild(VRButton.createButton(renderer));

    animate();
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

function choosePuzzlesByMoves(moves) {
    let puzzle1, puzzle2, puzzle3;

    switch (moves) {
        case 3: {
            puzzle1 = makePuzzle(
                [{ x: 1, y: 4 }, { x: 2, y: 3 }, { x: 3, y: 2 }],
                [{ x: 1, y: 4 }],
            );

            puzzle2 = makePuzzle(
                [{ x: 1, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 3 }, { x: 1, y: 2 }],
                [{ x: 2, y: 4, side: 'r' }]
            );

            puzzle3 = makePuzzle(
                [{ x: 2, y: 4 }, { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 2, y: 2 }],
            );
            puzzle3.initialPos = { x: 2, y: 5 }
            break;
        }

        case 4: {
            puzzle1 = makePuzzle(
                [{ x: 1, y: 4 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 1 }],
                [{ x: 1, y: 4 }, { x: 2, y: 2, side: 'r' }]
            );

            puzzle2 = makePuzzle(
                [{ x: 2, y: 4 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 3 }],
                [{ x: 2, y: 5, side: 'r' }, { x: 1, y: 3 }, { x: 2, y: 1, side: 'r' }, { x: 2, y: 4, side: 'r' }]
            );
            puzzle2.initialPos = { x: 2, y: 5 };

            puzzle3 = makePuzzle(
                [{ x: 3, y: 4 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 1, y: 4 }],
                [{ x: 1, y: 4 }, { x: 2, y: 2, side: 'r' }]
            );
            puzzle3.initialPos = { x: 3, y: 5 };
            break;
        }

        case 5: {
            puzzle1 = makePuzzle(
                [{ x: 1, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 4 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 1 }],
                [{ x: 2, y: 5, side: 'r' }, { x: 1, y: 3 }, { x: 2, y: 1, side: 'r' }]
            );

            puzzle2 = makePuzzle(
                [{ x: 3, y: 5 }, { x: 2, y: 4 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 1, y: 1 }, { x: 3, y: 1 }],
                [{ x: 2, y: 5, side: 'r' }, { x: 2, y: 4, side: 'r' }, { x: 2, y: 3, side: 'r' }, { x: 2, y: 1, side: 'r' }, { x: 1, y: 1, }]
            );
            puzzle2.initialPos = { x: 3, y: 5 }

            puzzle3 = makePuzzle(
                [{ x: 2, y: 5 }, { x: 3, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 1 }],
                [{ x: 1, y: 4 }, { x: 2, y: 2, side: 'r' }, { x: 1, y: 1, side: 'r' }, { x: 2, y: 1, side: 'r' }]
            );
            puzzle3.initialPos = { x: 2, y: 5 }

            break;
        }

        default:
            throw new Error('Movent should be 3 or 4. Passaed value ' + moves)
    }

    puzzle1.position.set(0, 1, -2);
    puzzle2.position.set(2, 1, 0);
    puzzle2.rotateY(Math.PI * -0.5);
    puzzle3.position.set(0, 1, 2);
    puzzle3.rotateY(Math.PI);

    puzzle1.name = '1';
    puzzle2.name = '2';
    puzzle3.name = '3';

    return { puzzle1, puzzle2, puzzle3 }

}

function generateOrbiConfig(mode) {
    return new Promise((resolve, reject) => {
        const countUsedMove = () => { usedMoves++; }

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
            callbacks: {
                horizontal: countUsedMove,
                vertical: countUsedMove
            }
        }
        switch (mode) {
            case Orbi.DWELLING: {
                resolve(config);
                break;
            }
            case Orbi.HAND: {
                config.hand = { model: null, mixer: null, action: null };
                config.tracking = { enabled: true, handTrack: null };

                new GLTFLoader().load(
                    '../../assets/models/hand2.glb',
                    async (gltf) => {
                        mixer = new THREE.AnimationMixer(gltf.scene);

                        let act = mixer.clipAction(gltf.animations[0]);
                        act.setLoop(THREE.LoopOnce)
                        act.clampWhenFinished = true
                        act.enable = true

                        act.play();

                        config.hand.model = gltf;
                        config.hand.mixer = mixer;
                        config.hand.action = act;

                        await HandTrack.init();
                        config.tracking.handTrack = HandTrack;

                        resolve(config);
                    },
                    (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
                    (error) => { console.log('An error happened', error); reject(error) }
                );
                break;
            }
            case Orbi.JOYSTICK: {
                controller = renderer.xr.getController(0);
                camera.add(controller)

                config.joystick = {
                    enabled: true,
                    controller
                }

                resolve(config);
                break;
            }

            default:
                console.log('Invalid mode');
                reject('Invalid mode')
        }

    });
}

function download() {
    const fileName = (new Date()).toString();
    const fileContent = `\
date: ${fileName}
moves: ${moves}
mode: ${mode}
time 1: ${times[0] - start}
time 2: ${times[1] - times[0]}
time 3: ${times[2] - times[1]}
moved interface: ${usedMoves}
`;
    const myFile = new Blob([fileContent], { type: 'text/plain' });

    window.URL = window.URL || window.webkitURL;
    const dlBtn = document.getElementById("download");

    dlBtn.setAttribute("href", window.URL.createObjectURL(myFile));
    dlBtn.setAttribute("download", fileName);
    dlBtn.click();
}