import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';

import { Orbi } from '../../libs/orbixr.js';
import { collidable, groundList, makePuzzle, makeVShelf, physicBox } from './puzzles.js'

let camera, scene, light, renderer, controller, cameraHolder, clock;
let orbi;

let cube;

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

    sh1 = { x: -0.4, y: 0.6 }
    sh2 = { x: 0.4, y: 0.05 }
    sh3 = { x: 0, y: -0.55 }

    let puzzle3 = makePuzzle(sh1, sh2, sh3);
    puzzle3.position.set(2, 1, 0);
    puzzle3.rotateY(Math.PI * -0.5);
    scene.add(puzzle3)

    let wall3 = makeVShelf("nome2");
    wall3.position.set(0.2, -0.2, 0.25)
    puzzle3.add(wall3);

    let wall4 = makeVShelf("nome2");
    wall4.position.set(0, -0.8, 0.25)
    puzzle3.add(wall4);

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

let delta;
function render() {
    orbi.update();

    delta = clock.getDelta();
    time += delta;

    cube.update(delta);

    renderer.render(scene, camera);
}