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

    const light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(50, 50, 50);
    scene.add(light);

    const axes = new THREE.AxesHelper(50);
    scene.add(axes);

    const loader = new THREE.TextureLoader();
    const texture = loader.load('../assets/textures/wood.jpg');
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);

    const planeGeometry = new THREE.PlaneGeometry(100, 100, 5);
    const planeMaterial = new THREE.MeshLambertMaterial({
        map: texture
    });
    const ground = new THREE.Mesh(planeGeometry, planeMaterial);
    ground.position.set(0, 0, 0);
    ground.rotation.x = -0.5 * Math.PI;
    scene.add(ground);

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

    const speed = 0.5;
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

    function render() {
        stats.update();

        if (moveForward) {
            controls.moveForward(speed);
        }
        else if (moveBackward) {
            controls.moveForward(speed * -1);
        }

        if (moveRight) {
            controls.moveRight(speed);
        }
        else if (moveLeft) {
            controls.moveRight(speed * -1);
        }

        if (moveUp && camera.position.y <= 100) {
            camera.position.y += speed;
        }
        else if (moveDown && camera.position.y >= 2) {
            camera.position.y -= speed;
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
