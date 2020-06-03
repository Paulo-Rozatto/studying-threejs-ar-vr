/* eslint-disable indent */
import * as THREE from '../libs/three.module.js';
import Stats from '../libs/stats.module.js';
// import { GUI } from '../libs/dat.gui.module.js';
import { PointerLockControls } from '../libs/PointerLockControls.js';

function main() {
    const stats = initStats();
    const canvas = document.querySelector('#output');

    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setClearColor(new THREE.Color(0xeeeeee));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
    camera.position.set(-5, 2, -5);
    camera.lookAt(new THREE.Vector3(0, 2, 0));
    scene.add(camera);

    const raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0).normalize(), 0, 2);

    const light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(50, 50, 50);
    scene.add(light);

    // const axes = new THREE.AxesHelper(25);
    // scene.add(axes);

    const loader = new THREE.TextureLoader();

    const groundTexture = loader.load('../assets/textures/wood.jpg');
    groundTexture.wrapS = THREE.MirroredRepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(20, 20);

    const rampTexture = loader.load('../assets/textures/wood2.jpg');
    rampTexture.wrapS = THREE.MirroredRepeatWrapping;

    const whiteWall = loader.load('../assets/textures/white-wall.jpg');
    whiteWall.wrapS = THREE.MirroredRepeatWrapping;
    rampTexture.repeat.set(3, 1);
    whiteWall.repeat.set(10, 1);

    const planeGeometry = new THREE.PlaneGeometry(50, 50, 5);
    const planeMaterial = new THREE.MeshLambertMaterial({
        map: groundTexture
    });
    const ground = new THREE.Mesh(planeGeometry, planeMaterial);
    ground.position.set(0, 0, 0);
    ground.rotation.x = -0.5 * Math.PI;
    scene.add(ground);

    const rampGeometry = new THREE.PlaneGeometry(10, 10);
    const rampMaterial = new THREE.MeshBasicMaterial({
        map: rampTexture
    });
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    ramp.rotation.x = 1.5 * Math.PI;
    ramp.rotation.y = -Math.PI / 6;
    ramp.position.set(28.5, 2, 0);
    scene.add(ramp);

    const WallGeometry = new THREE.PlaneGeometry(50, 5);
    const smallWallGeometry = new THREE.PlaneGeometry(20, 5);
    const wallMaterial = new THREE.MeshBasicMaterial({
        map: whiteWall
    });
    const walls = [];
    for (let i = 0; i < 3; i++) {
        walls.push(new THREE.Mesh(WallGeometry, wallMaterial));
    }
    walls.push(new THREE.Mesh(smallWallGeometry, wallMaterial));
    walls.push(new THREE.Mesh(smallWallGeometry, wallMaterial));

    walls[0].position.set(0, 2.5, -25);

    walls[1].position.set(0, 2.5, 25);
    walls[1].rotation.y = Math.PI;

    walls[2].position.set(-25, 2.5, 0);
    walls[2].rotation.y = Math.PI / 2;

    walls[3].position.set(25, 2.5, 15);
    walls[3].rotation.y = Math.PI / -2;

    walls[4].position.set(25, 2.5, -15);
    walls[4].rotation.y = Math.PI / -2;

    walls.forEach(wall => scene.add(wall));

    const paintingGeometry = new THREE.PlaneGeometry(4, 3);
    const paintings = [
        new THREE.Mesh(paintingGeometry, new THREE.MeshBasicMaterial({ map: loader.load('../assets/paintings/autoretrato.jpg') })),
        new THREE.Mesh(paintingGeometry, new THREE.MeshBasicMaterial({ map: loader.load('../assets/paintings/starynight.jpg') })),
        new THREE.Mesh(paintingGeometry, new THREE.MeshBasicMaterial({ map: loader.load('../assets/paintings/indios.jpg') })),
        new THREE.Mesh(paintingGeometry, new THREE.MeshBasicMaterial({ map: loader.load('../assets/paintings/mantiqueira.jpg') })),
        new THREE.Mesh(paintingGeometry, new THREE.MeshBasicMaterial({ map: loader.load('../assets/paintings/madona.jpg') })),
        new THREE.Mesh(paintingGeometry, new THREE.MeshBasicMaterial({ map: loader.load('../assets/paintings/venus.jpg') })),
        new THREE.Mesh(paintingGeometry, new THREE.MeshBasicMaterial({ map: loader.load('../assets/paintings/barcopapel.jpg') })),
        new THREE.Mesh(paintingGeometry, new THREE.MeshBasicMaterial({ map: loader.load('../assets/paintings/dragao.jpg') })),
    ];

    paintings[0].position.set(-12.5, 2.5, -24.9);
    paintings[1].position.set(12.5, 2.5, -24.9);

    paintings[2].position.set(-12.5, 2.5, 24.9);
    paintings[3].position.set(12.5, 2.5, 24.9);
    paintings[2].rotation.y = Math.PI;
    paintings[3].rotation.y = Math.PI;

    paintings[4].position.set(-24.9, 2.5, -12.5);
    paintings[5].position.set(-24.9, 2.5, 12.5);
    paintings[4].rotation.y = Math.PI / 2;
    paintings[5].rotation.y = Math.PI / 2;

    paintings[6].position.set(24.9, 2.5, -12.5);
    paintings[7].position.set(24.9, 2.5, 12.5);
    paintings[6].rotation.y = Math.PI / -2;
    paintings[7].rotation.y = Math.PI / -2;

    paintings.forEach(p => scene.add(p));

    const controls = new PointerLockControls(camera, document.body);

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', function () {

        controls.lock();

    }, false);

    controls.addEventListener('lock', function () {

        instructions.style.display = 'none';
        blocker.style.display = 'none';

    });

    controls.addEventListener('unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';

    });

    scene.add(controls.getObject());

    const speed = 20;
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let moveUp = false;
    let moveDown = false;

    window.addEventListener('keydown', (event) => movementControls(event.keyCode, true));
    window.addEventListener('keyup', (event) => movementControls(event.keyCode, false));

    function movementControls(key, value) {
        switch (key) {
            case 87: // W
                moveForward = value;
                break;
            case 83: // S
                moveBackward = value;
                break;
            case 65: // A
                moveLeft = value;
                break;
            case 68: // D
                moveRight = value;
                break;
            case 32:
                moveUp = value;
                break;
            case 16:
                moveDown = value;
                break;
        }
    }

    function moveAnimate(delta) {
        raycaster.ray.origin.copy(controls.getObject().position);
        const isIntersectingGround = raycaster.intersectObject(ground).length > 0;
        const isIntersectingRamp = raycaster.intersectObject(ramp).length > 0;

        if (moveForward) {
            controls.moveForward(speed * delta);
        }
        else if (moveBackward) {
            controls.moveForward(speed * -1 * delta);
        }

        if (moveRight) {
            controls.moveRight(speed * delta);
        }
        else if (moveLeft) {
            controls.moveRight(speed * -1 * delta);
        }

        if (moveUp && camera.position.y <= 100) {
            camera.position.y += speed * delta;
        }
        else if (moveDown && !isIntersectingGround) {
            camera.position.y -= speed * delta;
        }

        if (isIntersectingRamp) {
            camera.position.y += speed / 2 * delta;
        }
    }

    const clock = new THREE.Clock();
    function render() {
        stats.update();

        if (controls.isLocked) {
            moveAnimate(clock.getDelta());
        }

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

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

    resize();
    function resize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    window.onresize = resize;
}

main();
