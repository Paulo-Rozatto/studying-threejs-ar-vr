/* eslint-disable indent */
import * as THREE from '../../libs/three.module.js';
import Stats from '../../libs/stats.module.js';
import { PointerLockControls } from '../../libs/PointerLockControls.js';
import { LoadScreen } from '../../libs/LoadScreen.module.js';

let stats, renderer, scene, camera, light, ambientLight, clock;

let house, controls, raycaster, blocker, instructions, floor = [];

const movement = {
    speed: 7,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
    flyMode: false
};


const ASSETS = {
    textures: {
        skyBoxMap: {
            path: '../../assets/textures/cloud.jpg',
            fileSize: 1065.362 + 9889.984 // for some reason the house file size is not count in the loader, so it's added here to be shown on the loader
        }
    },
    materials: {
        skyBoxMaterial: new THREE.MeshBasicMaterial({ side: 1 }),
        groundMaterial: new THREE.MeshLambertMaterial({ color: 0xDEB887 })
    },
    geometries: {
        skyBoxGeometry: new THREE.SphereGeometry(600, 50, 50),
        groundGeometry: new THREE.PlaneGeometry(1000, 1000, 30)
    },
    objects: {
        house: {
            path: '../../assets/models/modern-house.glb',
            fileSize: 9889.984,
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
            material: 'groundMaterial',
            map: 'groundTexture'
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

    camera = camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 700);
    camera.position.set(-3, 1, 18);
    scene.add(camera);

    light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(-65, 110, 52);
    scene.add(light);

    // let helper = new THREE.DirectionalLightHelper(light);
    // scene.add(helper);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    let skyBox = ASSETS.objects.skyBox;
    scene.add(skyBox);

    house = ASSETS.objects.house;
    // console.log(house);

    house.scale.set(1.3, 1.3, 1.3);

    house.children.forEach((object) => {
        //setting transparency for the windows
        if (/window/i.test(object.name)) {
            object.children.forEach(mesh => {
                mesh.material.transparency = true;
                mesh.material.opacity = 0.5;
            });
        }

        // setting ground to collision
        if (/ground|stairs|floor/i.test(object.name)) {
            floor.push(object);
        }
        else if (/balcony|patio/i.test(object.name)) {
            floor.push(object.children[1]);
        }
    });

    // setting transparency for the water
    house.children[21].material.transparency = true;
    house.children[21].material.opacity = 0.8;

    house.children[70].children[1].material.transparency = true;
    house.children[70].children[1].material.opacity = 0.5;

    scene.add(house);


    controls = new PointerLockControls(camera, renderer.domElement);
    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0).normalize(), 0, 1.5);

    blocker = document.getElementById('blocker');
    instructions = document.getElementById('instructions');

    instructions.addEventListener('click', click);

    controls.addEventListener('lock', lock);

    controls.addEventListener('unlock', unlock);

    scene.add(controls.getObject());
    unlock();

    window.addEventListener('keydown', (event) => movementControls(event, true), true);
    window.addEventListener('keyup', (event) => movementControls(event, false));
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
    let groundIntersection = false;

    raycaster.ray.origin.copy(controls.getObject().position);
    if (floor.length > 0) {
        groundIntersection = typeof raycaster.intersectObjects(floor)[0] === 'undefined' ? false : raycaster.intersectObjects(floor)[0];
    }

    if (movement.flyMode && groundIntersection) {
        movement.flyMode = false;
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

    if (movement.moveUp && movement.flyMode) {
        camera.position.y += movement.speed * delta;
    }
    else if (groundIntersection) {
        if (groundIntersection.distance < 1.4) {
            camera.position.y += movement.speed / 2 * delta;
        }
    }
    else if (movement.moveDown || !movement.flyMode) {
        camera.position.y -= movement.speed * delta;
    }
}

function movementControls(event, value) {
    switch (event.keyCode) {
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
        case 70: // F
            if (value) {
                movement.flyMode = !movement.flyMode;
                camera.position.y += 0.1;
            }
            break;
        case 32: // Space
            movement.moveUp = value;
            event.preventDefault();
            break;
        case 16: // Shift
            movement.moveDown = value;
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