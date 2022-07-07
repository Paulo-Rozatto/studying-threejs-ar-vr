import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { GLTFLoader } from '../../build2/jsm/loaders/GLTFLoader.js'
import { RectAreaLightUniformsLib } from '../../build2/jsm/lights/RectAreaLightUniformsLib.js'
import { RectAreaLightHelper } from '../../build2/jsm/helpers/RectAreaLightHelper.js'

import { Orbi } from '../../libs/orbixr.js';
import { HandTrack } from '../12-tfjs-handtracking/ht.js'

let camera, scene, light, renderer, controller, cameraHolder, clock, orbi, mixer, frame, frameMaterial, isGreen = false;

let mode;


init();

async function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0);

    cameraHolder = new THREE.Object3D();
    cameraHolder.add(camera);
    scene.add(cameraHolder);

    light = new THREE.PointLight(0xeeeeaa, 0.1);
    light.position.set(0, 2, 0);
    scene.add(light);

    RectAreaLightUniformsLib.init();

    const loader = new THREE.TextureLoader();

    const logo = loader.load('orbi.png');

    const plane = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(1.5, 1.5),
        new THREE.MeshBasicMaterial({ transparent: true, map: logo, opacity: 0.8 })
    );
    plane.position.set(0, 1.5, -4.9);
    scene.add(plane)

    const rectLight = new THREE.RectAreaLight(0x7235B8, 0.8, 8, 3);
    rectLight.position.set(0, 1.5, -5);
    rectLight.rotation.set(0, Math.PI, 0)
    scene.add(rectLight);
    scene.add(new RectAreaLightHelper(rectLight));

    const geoFloor = new THREE.BoxGeometry(10, 0.1, 10);
    const matStdFloor = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.3, metalness: 0.1 });
    const floor = new THREE.Mesh(geoFloor, matStdFloor);
    scene.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5, metalness: 0 })

    const wallLeft = new THREE.Mesh(
        new THREE.BoxBufferGeometry(10, 3, 1),
        wallMaterial
    );
    wallLeft.position.set(-4.5, 1.5, 0);
    wallLeft.rotation.set(0, Math.PI / 2, 0);
    scene.add(wallLeft)

    const wallRight = wallLeft.clone();
    wallRight.position.set(4.5, 1.5, 0);
    scene.add(wallRight);

    const wallRear = wallLeft.clone();
    wallRear.position.set(0, 1.5, 4.5)
    wallRear.rotation.set(0, 0, 0);
    scene.add(wallRear)

    const matRoof = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9, metalness: 0, transparent: false, opacity: 0.90 });
    const roof = new THREE.Mesh(geoFloor, matRoof);
    roof.position.y = 3.05;
    scene.add(roof);

    frame = new THREE.Group();
    frame.rotateY(Math.PI / 3);
    scene.add(frame);
    frame.visible = false;

    frameMaterial = new THREE.MeshStandardMaterial({ color: 0xFF3030, metalness: 0.0, roughness: 0.1 })

    const frameLeft = new THREE.Mesh(
        new THREE.BoxBufferGeometry(0.05, 0.25, 0.025),
        frameMaterial
    )
    frameLeft.position.set(-0.25, 1.6, -1.05)
    frame.add(frameLeft)

    const frameRight = frameLeft.clone();
    frameRight.position.x = 0.2;
    frame.add(frameRight);

    const frameTop = frameLeft.clone();
    frameTop.rotateZ(Math.PI / 2);
    frameTop.position.set(-0.025, 1.75, -1.05);
    frameTop.scale.y = 2;
    frame.add(frameTop)

    const frameBottom = frameTop.clone();
    frameBottom.position.y = 1.45
    frame.add(frameBottom)

    const params = (new URL(document.location)).searchParams;
    mode = params.get('mode') || 0;
    mode = parseInt(mode);

    const config = await generateOrbiConfig(mode)
    orbi = new Orbi(camera, config);
    cameraHolder.add(orbi);

    let currColor = 0;
    const colors = [
        0x7235B8,
        0xB86948,
        0xB8B623
    ]

    orbi.addButton('1', 'icon.png', () => {
        currColor += 1;
        if (currColor > 2)
            currColor = 0;
        rectLight.color.setHex(colors[currColor]);
        orbi.changeMode(currColor)
        if (currColor === 0)
            frame.visible = true;
    });

    document.body.appendChild(VRButton.createButton(renderer));

        animate();
}

function animate() {
    renderer.setAnimationLoop(render);
}

// let delta;
const lower = Math.PI / 3 - Math.PI / 36;
const upper = Math.PI / 3 + Math.PI / 36;
function render() {
    orbi.update();

    if (orbi.rotation.y > lower && orbi.rotation.y < upper) {
        frameMaterial.color.setHex(0x00ff00);
        isGreen = true;
    }
    else if (isGreen) {
        frameMaterial.color.setHex(0xff0000);
        isGreen = false;
    }

    // delta = clock.getDelta();

    renderer.render(scene, camera);
}


function generateOrbiConfig(mode) {
    return new Promise((resolve, reject) => {
        controller = renderer.xr.getController(0);
        camera.add(controller)

        // Orbi Config
        const config = {
            display: new THREE.Vector2(1, 1),
            orbits: [1, 2, 3],
            rotation: {
                theta: Math.PI / 6,
            },
            cursor: {
                color: 0x00dd00
            },
            button: {
                transparent: true,
                opacity: 0.95,
                size: new THREE.Vector2(0.2, 0.2),
            },
            gap: new THREE.Vector2(0.003, 0.003),
            border: {
                enabled: true
            },
            font: {
                path: '../../assets/fonts/Roboto_Regular.json'
            },
            joystick: {
                enabled: mode === Orbi.JOYSTICK,
                controller
            },
            hand: {
                model: null,
                mixer: null,
                action: null
            },
            tracking: {
                enabled: mode === Orbi.HAND,
                handTrack: null
            }
        }

        new GLTFLoader().load(
            '../../assets/models/hand2.glb',
            async (gltf) => {
                mixer = new THREE.AnimationMixer(gltf.scene);

                let act = mixer.clipAction(gltf.animations[0]);
                act.setLoop(THREE.LoopOnce)
                act.clampWhenFinished = true
                act.enable = true

                act.play();

                config.hand.model = gltf;
                config.hand.mixer = mixer;
                config.hand.action = act;

                await HandTrack.init();
                config.tracking.handTrack = HandTrack;

                resolve(config);
            },
            (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
            (error) => { console.log('An error happened', error); reject(error) }
        );

    });
}
