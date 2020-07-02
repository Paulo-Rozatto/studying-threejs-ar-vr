/* eslint-disable no-undef */
// import { LoadScreen } from '../libs/LoadScreen.module.js';

let stats, renderer, scene, camera, light, ambientLight;

let arToolkitSource, arToolkitContext, markerControls;

let house;


const ASSETS = {
    textures: {
        helper: {
            path: '../assets/textures/loader-helper.jpg', // the loader only shows the size of textures, this helper make it show the model size
            fileSize: 9936.936
        }
    },
    objects: {
        house: {
            path: '../assets/models/modern-house-noground.glb',
            fileSize: 9889.984,
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

    camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 1, 500);
    // camera.lookAt(0, 0, 0);
    // // camera.position.set(10, 10, 10);
    // camera.up.set(0, 1, 0);
    // scene.add(camera);

    // camera = camera = new THREE.Camera();
    scene.add(camera);

    light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(-65, 110, 52);
    scene.add(light);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    house = ASSETS.objects.house;

    // console.log(house);
    house.scale.set(0.1, 0.1, 0.1);
    // house.scale.set(3, 3, 3);

    // house.children.forEach((object) => {
    //     //setting transparency for the windows
    //     if (/window/i.test(object.name)) {
    //         object.children.forEach(mesh => {
    //             mesh.material.transparency = true;
    //             mesh.material.opacity = 0.5;
    //         });
    //     }

    //     //setting transparency for the water
    //     if (/water/i.test(object.name)) {
    //         object.material.transparency = true;
    //         object.material.opacity = 0.8;
    //     }
    // });

    scene.add(house);

    window.addEventListener('resize', onResize);

    /*
        Handling Augmented reality
    */

    arToolkitSource = new THREEx.ArToolkitSource({
        sourceType: 'webcam',
    });

    arToolkitSource.init(() => {
        setTimeout(onResize, 1000); // force AR interface to resize
    });

    arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: THREEx.ArToolkitContext.baseURL + 'data/camera_para.dat',
        detectionMode: 'mono',
    });

    arToolkitContext.init(() => {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix()); // copy projection matrix to camera
    });

    markerControls = new THREEx.ArMarkerControls(arToolkitContext, camera, {
        type: 'pattern',
        patternUrl: THREEx.ArToolkitContext.baseURL + 'data/patt.hiro',
        changeMatrixMode: 'cameraTransformMatrix'  // as we control the camera, set changeMatrixMode: 'cameraTransformMatrix'
    });

    scene.visible = false;

    /*
        End of handling Augmented reality
    */

    ls.remove(animate); // screen loader removal and animation started
}

function animate() {
    requestAnimationFrame(animate);

    updateAR();

    stats.update();

    renderer.render(scene, camera);
}

function updateAR() {
    if (arToolkitSource.ready === false) return;

    arToolkitContext.update(arToolkitSource.domElement);

    // update scene.visible if the marker is seen
    scene.visible = camera.visible;
}

function setRenderer() {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        logarithmicDepthBuffer: true
    });
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);
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
    arToolkitSource.onResizeElement();
    arToolkitSource.copyElementSizeTo(renderer.domElement);
    if (arToolkitContext.arController !== null) {
        arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
    }
}
