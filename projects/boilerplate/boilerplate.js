import * as THREE from '../libs/three.module.js';
import Stats from '../libs/stats.module.js';
import { GUI } from '../libs/dat.gui.module.js';

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

    const controls = new function () {
        this.rotation = 0.02;
    };

    const gui = new GUI();
    gui.add(controls, 'rotation', 0.0, 0.1);

    function render() {
        stats.update();

        cube.rotation.x += controls.rotation;
        cube.rotation.y += controls.rotation;

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
