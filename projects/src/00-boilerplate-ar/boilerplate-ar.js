/* eslint-disable no-undef */
let stats, renderer, scene, camera, light, controls, gui;

let arToolkitSource, arToolkitContext, markerControls;

let cube;


const ASSETS = {
    textures: {
        wood: {
            path: '../../assets/textures/wood.jpg',
            fileSize: 75.456
        }
    },
    materials: {
        cubeMaterial: new THREE.MeshPhongMaterial()
    },
    geometries: {
        cubeGeometry: new THREE.BoxGeometry(1, 1, 1)
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
    camera.lookAt(0, 0, 0);
    camera.position.set(50, 50, 50);
    camera.up.set(0, 1, 0);
    scene.add(camera);

    light = new THREE.AmbientLight(0xfefefe);
    light.position.set(10, 10, 10);
    scene.add(light);

    cube = ASSETS.objects.cube;
    scene.add(cube);

    controls = new function () {
        this.rotation = 0.02;
    };

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

    gui = new dat.GUI();
    gui.add(controls, 'rotation', 0.0, 0.1);

    ls.remove(animate); // screen loader removal and animation started
}

function animate() {
    requestAnimationFrame(animate);

    updateAR();

    stats.update();

    cube.rotation.x += controls.rotation;
    cube.rotation.y += controls.rotation;

    renderer.render(scene, camera);
}

function updateAR() {
    if (arToolkitSource.ready === false) return;

    arToolkitContext.update(arToolkitSource.domElement);

    // update scene.visible if the marker is seen
    console.log(camera.visible);
    scene.visible = camera.visible;
}

function setRenderer() {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
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
