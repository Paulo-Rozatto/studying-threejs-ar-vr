import * as THREE from '../../build2/three.module.js';
import { VRButton } from '../../build2/jsm/webxr/VRButton.js';
import { GLTFLoader } from '../../build2/jsm/loaders/GLTFLoader.js'
import { RectAreaLightUniformsLib } from '../../build2/jsm/lights/RectAreaLightUniformsLib.js'
import { RectAreaLightHelper } from '../../build2/jsm/helpers/RectAreaLightHelper.js'

import { Orbi } from '../../libs/orbixr.js';
import { HandTrack } from '../12-tfjs-handtracking/ht.js'

let camera, scene, light, renderer, controller, cameraHolder, clock, orbi, mixer;

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

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 1.6, 0);

    cameraHolder = new THREE.Object3D();
    cameraHolder.add(camera);
    scene.add(cameraHolder);

    // light = new THREE.SpotLight(0xeeeeaa, 0.2);
    // light.position.set(30, 30, 0);
    // scene.add(light);

    let ambient = new THREE.AmbientLight(0x090909, 0.15)
    // scene.add(ambient);

    RectAreaLightUniformsLib.init();

    const rectLight1 = new THREE.RectAreaLight(0xff0000, 5, 2, 3);
    rectLight1.position.set(-5, 1.5, 0);
    rectLight1.rotation.set(0, -Math.PI / 2, 0)
    scene.add(rectLight1);

    const rectLight2 = new THREE.RectAreaLight(0x00ff00, 5, 2, 3);
    rectLight2.position.set(0, 1.5, 5);
    // rectLight2.rotation.set(Math.PI / 2, Math.PI, 0)
    scene.add(rectLight2);

    const rectLight3 = new THREE.RectAreaLight(0x0000ff, 5, 2, 3);
    rectLight3.position.set(5, 1.5, 0);
    rectLight3.rotation.set(0, Math.PI / 2, 0)
    scene.add(rectLight3);

    scene.add(new RectAreaLightHelper(rectLight1));
    scene.add(new RectAreaLightHelper(rectLight2));
    scene.add(new RectAreaLightHelper(rectLight3));


    const geoFloor = new THREE.BoxGeometry(10, 0.1, 10);
    const matStdFloor = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.3, metalness: 0.1 });
    const floor = new THREE.Mesh(geoFloor, matStdFloor);
    scene.add(floor);

    const params = (new URL(document.location)).searchParams;
    mode = params.get('mode') || 0;
    mode = parseInt(mode);

    const config = await generateOrbiConfig(mode)
    orbi = new Orbi(camera, config);
    cameraHolder.add(orbi);

    orbi.addButton('1', '', () => { });

    // window.addEventListener('keydown', e => {
    //     switch (e.key) {
    //         case "1":
    //             orbi.changeMode(Orbi.DWELLING);
    //             break;
    //         case "2":
    //             orbi.changeMode(Orbi.HAND);
    //             break;
    //         case "3":
    //             orbi.changeMode(Orbi.JOYSTICK);
    //             break;
    //     }
    // })

    // clock = new THREE.Clock();

    document.body.appendChild(VRButton.createButton(renderer));

    animate();
}

function animate() {
    renderer.setAnimationLoop(render);
}

// let delta;
function render() {
    orbi.update();

    // delta = clock.getDelta();

    renderer.render(scene, camera);
}


function generateOrbiConfig(mode) {
    return new Promise((resolve, reject) => {
        // Orbi Config
        const config = {
            display: new THREE.Vector2(1, 2),
            orbits: [1, 2, 3],
            // cursor: {
            //     color: 0x0ff00
            // },
            rotation: {
                theta: Math.PI / 4,
            },
            button: {
                transparent: true,
                opacity: 0.95
            },
            gap: new THREE.Vector2(0.003, 0.003),
            border: {
                enabled: true
            },
            font: {
                path: '../../assets/fonts/Roboto_Regular.json'
            },
        }

        switch (mode) {
            case Orbi.DWELLING: {
                resolve(config);
                break;
            }
            case Orbi.HAND: {
                config.hand = { model: null, mixer: null, action: null };
                config.tracking = { enabled: true, handTrack: null };

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
                break;
            }
            case Orbi.JOYSTICK: {
                controller = renderer.xr.getController(0);
                camera.add(controller)

                config.joystick = {
                    enabled: true,
                    controller
                }

                resolve(config);
                break;
            }

            default:
                console.log('Invalid mode');
                reject('Invalid mode')
        }

    });
}
