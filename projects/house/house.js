/* eslint-disable indent */
import * as THREE from '../libs/three.module.js';
import Stats from '../libs/stats.module.js';
import { PointerLockControls } from '../libs/PointerLockControls.js';

function main() {
    const stats = initStats();
    const canvas = document.querySelector('#output');

    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setClearColor(new THREE.Color(0x2f2f2f));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
    camera.position.set(10, 10, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);

    const light = new THREE.SpotLight(0xfefefe);
    light.position.set(10, 10, 10);
    scene.add(light);

    const geo = new THREE.BoxGeometry(3, 3, 3);
    const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geo, mat);
    scene.add(cube);


    const clock = new THREE.Clock();
    function render() {
        stats.update();

        move(clock.getDelta());

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


    // CAMERA CONTROL CODE
    const controls = new PointerLockControls(camera, renderer.domElement);

    const raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0).normalize(), 0, 2);

    const ground = [];
    const ramp = [];

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

    let speed = 20;
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
            case 32: // Space
                moveUp = value;
                break;
            case 16: // Shift
                moveDown = value;
                break;
        }
    }

    function move(delta) {

        if (!controls.lock) return;
        let isIntersectingGround = false, isIntersectingRamp = false;

        raycaster.ray.origin.copy(controls.getObject().position);
        if (ground.length > 0) {
            isIntersectingGround = raycaster.intersectObjects(ground).length > 0;
        }
        if (ramp.length > 0) {
            isIntersectingRamp = raycaster.intersectObject(ramp).length > 0;
        }

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
        else if (moveDown && !isIntersectingGround && !isIntersectingRamp) {
            camera.position.y -= speed * delta;
        }
        else if (isIntersectingRamp) {
            camera.position.y += speed / 2 * delta;
        }
    }
    // END OF CAMERA CONTROL CODE
}

main();
