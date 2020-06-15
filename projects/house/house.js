/* eslint-disable indent */
import * as THREE from '../libs/three.module.js';
import Stats from '../libs/stats.module.js';
import { PointerLockControls } from '../libs/PointerLockControls.js';
import { LoadScreen } from '../libs/LoadScreen.js';

let stats, renderer, scene, camera, light, pointLight, clock;

let house, controls, raycaster, blocker, instructions, ground = [];

const movement = {
    speed: 7,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false
};


const ASSETS = {
    textures: {
        // wood: {
        //     path: '../assets/textures/wood.jpg',
        //     fileSize: 75456
        // }
        skyBoxMap: {
            path: '../assets/textures/cloud.jpg',
            fileSize: 1065362
        },
    },
    materials: {
        skyBoxMaterial: new THREE.MeshBasicMaterial({ side: 1 }),
        groundMaterial: new THREE.MeshBasicMaterial({ color: 0xDEB887 })
    },
    geometries: {
        skyBoxGeometry: new THREE.SphereGeometry(600, 50, 50),
        groundGeometry: new THREE.PlaneGeometry(1000, 1000, 30)
    },
    objects: {
        house: {
            path: '../assets/models/round-house.glb',
            fileSize: 39242452
        },
        skyBox: {
            type: 'mesh',
            geometry: 'skyBoxGeometry',
            material: 'skyBoxMaterial',
            map: 'skyBoxMap'
        },
        ground: {
            type: 'mesh',
            geometry: 'groundGeometry',
            material: 'groundMaterial'
        }
    }
};

setRenderer();

const ls = new LoadScreen(renderer, { type: 'stepped-circular', progressColor: '#447' })
    .onComplete(init)
    .start(ASSETS);

function init() {
    stats = initStats();

    scene = new THREE.Scene();

    camera = camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 700);
    camera.position.set(13, 1.8, -2);
    scene.add(camera);

    light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(50, 80, 50);
    scene.add(light);

    pointLight = new THREE.PointLight(0xfefefe, 1, 30);
    camera.add(pointLight);

    let skyBox = ASSETS.objects.skyBox;
    scene.add(skyBox);

    let floor = ASSETS.objects.ground;
    floor.rotation.x = -0.5 * Math.PI;
    floor.position.set(0, 0, 0);
    scene.add(floor);

    house = ASSETS.objects.house;
    house.position.set(0, 0, 0);
    let isGround = (mesh) => /suc|h1|tile|stone/i.test(mesh.material.name);
    ground = house.children[0].children.filter(isGround);
    scene.add(house);

    controls = new PointerLockControls(camera, renderer.domElement);
    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0).normalize(), 0, 1.6);

    blocker = document.getElementById('blocker');
    instructions = document.getElementById('instructions');

    instructions.addEventListener('click', click);

    controls.addEventListener('lock', lock);

    controls.addEventListener('unlock', unlock);

    scene.add(controls.getObject());
    unlock();

    window.addEventListener('keydown', (event) => movementControls(event.keyCode, true));
    window.addEventListener('keyup', (event) => movementControls(event.keyCode, false));
    window.addEventListener('resize', onResize);

    clock = new THREE.Clock();
    ls.remove(animate);
}

function click() {
    controls.lock();
}

function lock() {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
}

function unlock() {
    blocker.style.display = 'block';
    instructions.style.display = 'block';
}

function animate() {
    requestAnimationFrame(animate);

    stats.update();
    move(clock.getDelta());

    renderer.render(scene, camera);
}

function move(delta) {
    if (!controls.lock) return;
    let isIntersectingGround = false;

    raycaster.ray.origin.copy(controls.getObject().position);
    if (ground.length > 0) {
        isIntersectingGround = raycaster.intersectObjects(ground).length > 0;
    }

    if (movement.moveForward) {
        controls.moveForward(movement.speed * delta);
    }
    else if (movement.moveBackward) {
        controls.moveForward(movement.speed * -1 * delta);
    }

    if (movement.moveRight) {
        controls.moveRight(movement.speed * delta);
    }
    else if (movement.moveLeft) {
        controls.moveRight(movement.speed * -1 * delta);
    }

    if (movement.moveUp) {
        camera.position.y += movement.speed * delta;
    }
    else if (movement.moveDown && !isIntersectingGround) {
        camera.position.y -= movement.speed * delta;
    }
    else if (isIntersectingGround && !movement.moveDown) {
        camera.position.y += movement.speed / 2 * delta;
    }
}

function movementControls(key, value) {
    switch (key) {
        case 87: // W
            movement.moveForward = value;
            break;
        case 83: // S
            movement.moveBackward = value;
            break;
        case 65: // A
            movement.moveLeft = value;
            break;
        case 68: // D
            movement.moveRight = value;
            break;
        case 32: // Space
            movement.moveUp = value;
            break;
        case 16: // Shift
            movement.moveDown = value;
            console.log(controls.getObject().position);
            break;
    }
}

function setRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x222);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    // renderer.toneMapping = THREE.ReinhardToneMapping;
    // renderer.toneMappingExposure = 1.5;
    document.body.appendChild(renderer.domElement);
}

function initStats() {
    const stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms

    // Align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';

    document.getElementById('stats').appendChild(stats.domElement);

    return stats;
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}