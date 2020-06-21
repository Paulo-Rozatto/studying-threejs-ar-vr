import * as THREE from '../libs/three.module.js';
import Stats from '../libs/stats.module.js';
import { GUI } from '../libs/dat.gui.module.js';
import { LoadScreen } from '../libs/LoadScreen.module.js';

let stats, renderer, scene, camera, light, controls, gui;

let cube;


const ASSETS = {
    textures: {
        wood: {
            path: '../assets/textures/wood.jpg',
            fileSize: 75456
        }
    },
    materials: {
        cubeMaterial: new THREE.MeshPhongMaterial()
    },
    geometries: {
        cubeGeometry: new THREE.BoxGeometry(3, 3, 3)
    },
    objects: {
        cube: {
            type: 'mesh',
            geometry: 'cubeGeometry',
            material: 'cubeMaterial',
            map: 'wood'
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

    camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .2, 200);
    camera.position.set(10, 10, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);

    light = new THREE.SpotLight(0xfefefe);
    light.position.set(10, 10, 10);
    scene.add(light);

    cube = ASSETS.objects.cube;
    scene.add(cube);

    controls = new function () {
        this.rotation = 0.02;
    };

    gui = new GUI();
    gui.add(controls, 'rotation', 0.0, 0.1);

    window.addEventListener('resize', onResize);

    ls.remove(animate);
}

function animate() {
    requestAnimationFrame(animate);

    stats.update();

    cube.rotation.x += controls.rotation;
    cube.rotation.y += controls.rotation;

    renderer.render(scene, camera);
}

function setRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;
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
