/* eslint-disable indent */
import * as THREE from '../libs/three.module.js';
import Stats from '../libs/stats.module.js';
import { PointerLockControls } from '../libs/PointerLockControls.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';

function main() {
    const stats = initStats();
    const canvas = document.querySelector('#output');

    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setClearColor(new THREE.Color(0xefefef));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
    camera.position.set(13, 1.8, -2);
    scene.add(camera);

    const light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(50, 80, 50);
    scene.add(light);

    const pointLight = new THREE.PointLight(0xfefefe, 1, 30);
    scene.add(pointLight);

    const glbLoader = new GLTFLoader();
    glbLoader.load('../assets/models/round-house.glb',
        (glb) => {
            /* indentify meshes wich are part of the ground by looking material name */
            const isGround = (mesh) => /suc|h1|tile|stone/i.test(mesh.material.name);
            ground = glb.scene.children[0].children.filter(isGround);

            scene.add(glb.scene);

            document.getElementById('loader').style.display = 'none';
            document.getElementById('instructions').style.display = 'block';
        },
        (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),
        (error) => console.log(error)
    );

    const clock = new THREE.Clock();
    function render() {
        stats.update();

        move(clock.getDelta());
        pointLight.position.x = controls.getObject().position.x;
        pointLight.position.z = controls.getObject().position.z;
        pointLight.position.y = controls.getObject().position.y;

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

    const raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0).normalize(), 0, 1.6);

    let ground = [];

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

    let speed = 7;
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
        let isIntersectingGround = false;

        raycaster.ray.origin.copy(controls.getObject().position);
        if (ground.length > 0) {
            isIntersectingGround = raycaster.intersectObjects(ground).length > 0;
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

        if (moveUp) {
            camera.position.y += speed * delta;
        }
        else if (moveDown && !isIntersectingGround) {
            camera.position.y -= speed * delta;
        }
        else if (isIntersectingGround && !moveDown) {
            camera.position.y += speed / 2 * delta;
        }
    }
    // END OF CAMERA CONTROL CODE
}

main();
