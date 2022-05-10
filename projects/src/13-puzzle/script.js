import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { Orbi } from '../../libs/orbixr.js';

let camera, scene, raycaster, renderer, controller, cameraHolder;
let orbi;

let tile, puzzle;

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

    const floorGeo = new THREE.PlaneBufferGeometry(10, 10);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x878787 })
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotateX(Math.PI * -0.5);
    scene.add(floor);

    // Orbi Config
    const config = {
        display: new THREE.Vector2(2, 2),
        orbits: [1, 2, 3],
        rotation: {
            theta: Math.PI / 12,
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

    orbi.addButton('1', 'img/up.png', () => {
        move('up')
    });
    orbi.addButton('2', 'img/down.png', () => {
        move('down')
    });
    orbi.addButton('3', 'img/left.png', () => {
        move('left')
    });
    orbi.addButton('4', 'img/right.png', () => {
        move('right')
    });

    const tileGeo = new THREE.PlaneBufferGeometry(0.1, .1);
    const tileMat = new THREE.MeshBasicMaterial({ color: 0x770000 });
    tile = new THREE.Mesh(tileGeo, tileMat);
    tile.position.set(0.115, 1.425, -1);
    scene.add(tile);

    const puzzTex = new THREE.TextureLoader().load("img/puzzle1.png");
    const puzzleGeo = new THREE.PlaneBufferGeometry(0.5, 0.5);
    const puzzleMat = new THREE.MeshBasicMaterial({ map: puzzTex });
    puzzle = new THREE.Mesh(puzzleGeo, puzzleMat);
    puzzle.position.set(0.3, 1.6, -1.1);
    scene.add(puzzle);

    document.body.appendChild(VRButton.createButton(renderer));
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    orbi.update();
    renderer.render(scene, camera);
}

function move(dir) {
    let step = STATES[state][dir] || 0;

    if (step != 0) {
        state += step;

        switch (dir) {
            case 'up':
                tile.position.y += 0.2;
                break;
            case 'right':
                tile.position.x += 0.31;
                break;
            case 'down':
                tile.position.y -= 0.2;
                break;
            case 'left':
                tile.position.x -= 0.31;
                break;
        }

        if(state === 3 ) {
            orbi.showMessage('Terminou!')
        }
    }
}