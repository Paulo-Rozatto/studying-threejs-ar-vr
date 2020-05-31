import * as THREE from '../libs/three.module.js';
import Stats from '../libs/stats.module.js';
import { GUI } from '../libs/dat.gui.module.js';
import { FirstPersonControls } from '../libs/FirstPersonControls.js';

function main() {
    const stats = initStats();
    const canvas = document.querySelector('#output');

    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setClearColor(new THREE.Color(0xeeeeee));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
    const lookAtVec = new THREE.Vector3(0, 2, 0);
    camera.position.set(-5, 2, -5);
    camera.lookAt(lookAtVec);
    // scene.add(camera);
    // const camControls = new FirstPersonControls(camera, renderer.domElement);
    // scene.add(camControl);

    const light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(50, 50, 50);
    scene.add(light);

    const axes = new THREE.AxesHelper(50);
    scene.add(axes);

    const planeGeometry = new THREE.PlaneGeometry(100, 100, 5);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xdfef88 });
    const ground = new THREE.Mesh(planeGeometry, planeMaterial);
    ground.position.set(0, 0, 0);
    ground.rotation.x = -0.5 * Math.PI;
    scene.add(ground);

    // const controls = new function () {
    //     this.rotation = 0.02;
    // };

    // const gui = new GUI();

    // gui.add(camControls, 'lookSpeed', 0.001, 0.01);

    // camControls.lookSpeed = 0.005;
    // camControls.movementSpeed = 20;
    // camControls.noFly = true;
    // camControls.lookVertical = true;
    // camControls.constrainVertical = true;
    // camControls.verticalMin = 1.0;
    // camControls.verticalMax = 2.0;
    // camControls.lon = -150;
    // camControls.lat = 120;

    // const clock = new THREE.Clock();
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
        console.log(key, value);
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
        }
    }

    function movementAnimation() {
        if(moveForward) {
            camera.position.x -= Math.sin(camera.rotation.y) * speed;
            camera.position.z -= -Math.cos(camera.rotation.y) * speed;
        } 
        else if(moveBackward) {
            camera.position.x += Math.sin(camera.rotation.y) * speed;
            camera.position.z += -Math.cos(camera.rotation.y) * speed;
        }

        if(moveLeft) {
            camera.position.x += Math.sin(camera.rotation.y + Math.PI/2) * speed;
            camera.position.z += -Math.cos(camera.rotation.y + Math.PI/2) * speed;
        }
        else if(moveRight) {
            camera.position.x += Math.sin(camera.rotation.y - Math.PI/2) * speed;
            camera.position.z += -Math.cos(camera.rotation.y - Math.PI/2) * speed;
        }

        if(moveUp & camera.position.y <= 20) {
            camera.position.y += speed;
        }
        else if(moveDown && camera.position.y >= 2.0) {
            camera.position.y -= speed;
        }
    }

    function render() {
        stats.update();

        movementAnimation();

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
