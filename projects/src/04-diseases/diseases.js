let rendererStats, renderer, scene, camera, orbitControls, light, ambientLight, controls, gui, clock;

let leftHeart;

const ASSETS = {
    textures: {
        helper: {
            path: '../../assets/textures/loader-helper.jpg',
            fileSize: 37429
        }
    },
    // objects: {
    //     leftHeart: {
    //         path: '../../assets/models/heart.glb',
    //         fileSize: 37429
    //     }
    // }
};

setRenderer();

const ls = new LoadScreen(renderer, { type: 'stepped-circular', progressColor: '#447' })
    .onComplete(init)
    .start(ASSETS);

function init() {
    initStats();

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 700);
    camera.position.set(0, 0, 100);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);
    onResize();

    ambientLight = new THREE.AmbientLight(0x303030);
    scene.add(ambientLight);

    light = new THREE.PointLight(0xfefefe, 1);
    light.position.set(0, 0, 100);
    scene.add(light);

    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.minDistance = 10;
    orbitControls.maxDistance = 120;
    orbitControls.update();

    // leftHeart = ASSETS.objects.leftHeart;
    // leftHeart.scale.set(0.5, 0.5, 0.5);
    // leftHeart.position.set(0, 0, 0);
    // scene.add(leftHeart);

    window.addEventListener('resize', onResize);

    ls.remove(() => {
        animate();
    });
}

function animate() {
    requestAnimationFrame(animate);

    light.position.copy(camera.position);



    rendererStats.update();
    renderer.render(scene, camera);
}

function setRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xA1ACB3);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);

    document.body.appendChild(renderer.domElement);
}

function initStats() {
    rendererStats = new Stats();
    rendererStats.setMode(0); // 0: fps, 1: ms

    // Align top-left
    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '0px';
    rendererStats.domElement.style.top = '0px';
    document.getElementById('three-stats').appendChild(rendererStats.domElement);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}