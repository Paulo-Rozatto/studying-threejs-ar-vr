/* eslint-disable no-undef */
let stats, renderer, scene, camera, light, controls, gui, clock;

let box, plane, airplane, trajectory;

let frustum, cameraViewProjectionMatrix;

Physijs.scripts.worker = '../../libs/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

const ASSETS = {
    textures: {
        wood: {
            path: '../../assets/textures/wood.jpg',
            fileSize: 7545.6 + 4200
        }
    },
    materials: {
        cubeMaterial: new THREE.MeshPhongMaterial(),
        lineMaterial: new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 }),
        groundMaterial: new THREE.MeshBasicMaterial({ color: 0x77FF99 })
    },
    geometries: {
        cubeGeometry: new THREE.BoxGeometry(0.3, 0.3, 0.3),
    },
    objects: {
        airplane: {
            path: '../../assets/models/airplane.glb',
            fileSize: 4200
        }
    }
};

setRenderer();

const ls = new LoadScreen(renderer, { type: 'stepped-circular', progressColor: '#447' })
    .onComplete(init)
    .start(ASSETS);

function init() {
    stats = initStats();

    // scene = new THREE.Scene();
    scene = new Physijs.Scene();
    scene.setGravity(new THREE.Vector3(0, -1, 0));
    scene.addEventListener('update', simulate)

    camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .2, 200);
    camera.lookAt(0, 0, 0);
    camera.position.set(50, 50, 50);
    camera.up.set(0, 1, 0);
    scene.add(camera);

    frustum = new THREE.Frustum();
    cameraViewProjectionMatrix = new THREE.Matrix4();

    light = new THREE.AmbientLight(0xfefefe);
    // light.position.set(10, 10, 10);
    scene.add(light);

    let ligh = new THREE.DirectionalLight({ color: 0xfefefe });
    ligh.position.set(0, 10, 0);
    scene.add(ligh);

    // cube = ASSETS.objects.cube;
    // scene.add(cube);

    controls = new function () {
        this.velocity_module = 0;
        this.velocity = 0;
        this.height = 0;
    };

    gui = new dat.GUI();
    gui.add(controls, 'velocity_module', 0, 50).onChange(() => {
        if (controls.velocity < 0) {
            controls.velocity = controls.velocity_module * -1;
        }
        else {
            controls.velocity = controls.velocity_module
        }
    });
    gui.add(controls, 'height', 0, 10).onChange(() => {
        airplane.position.y = controls.height;
    })

    plane = new Physijs.PlaneMesh(new THREE.PlaneGeometry(1, 1), ASSETS.materials.groundMaterial);
    plane.rotation.x = Math.PI * -0.5;
    scene.add(plane);

    airplane = ASSETS.objects.airplane;
    airplane.position.set(0, controls.height, 0);
    airplane.rotation.y = Math.PI * 0.5
    airplane.scale.set(0.01, 0.01, 0.01)
    scene.add(airplane);

    box = new Physijs.BoxMesh(
        ASSETS.geometries.cubeGeometry,
        ASSETS.materials.cubeMaterial
    );
    box.material.map = ASSETS.textures.wood;
    box.prevPosition = new THREE.Vector3()
    box.canBeReleased = true;
    box.isReleased = false
    console.log(box);
    box.addEventListener('collision', () => {
        box.canBeReleased = true;
        box.isReleased = false;
        scene.remove(box);
    })

    trajectory = new THREE.Group();
    trajectory.name = "line";
    scene.add(trajectory)

    clock = new THREE.Clock();

    window.addEventListener('resize', onResize);
    window.addEventListener('touchstart', () => {
        releaseBox();
    })
    window.addEventListener('keydown', releaseBox);

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

    markerControls = [
        new THREEx.ArMarkerControls(arToolkitContext, camera, {
            type: 'pattern',
            patternUrl: THREEx.ArToolkitContext.baseURL + 'data/patt.hiro',
            changeMatrixMode: 'cameraTransformMatrix'  // as we control the camera, set changeMatrixMode: 'cameraTransformMatrix'
        })
    ];

    scene.visible = false;

    /*
        End of handling Augmented reality
    */

    ls.remove(() => {
        animate();
        simulate();
    });
}

function animate() {
    requestAnimationFrame(animate);

    updateAR();

    stats.update();

    airplane.position.z += controls.velocity * clock.getDelta() * 0.1;

    if (box.isReleased) drawTrajectory();

    camera.updateMatrixWorld();
    camera.matrixWorldInverse.getInverse(camera.matrixWorld);
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    if (!frustum.intersectsObject(airplane.children[0])) {
        if ((airplane.position.z > 0 && controls.velocity > 0) || (airplane.position.z < 0 && controls.velocity < 0)) {
            airplane.rotation.y += controls.velocity > 0 ? Math.PI : -Math.PI;
            controls.velocity *= -1;
        }
    }

    renderer.render(scene, camera);
}

function simulate() {
    // physicsStats.update();
    scene.simulate();
}

function releaseBox() {
    if (box.canBeReleased) {
        box.prevPosition.copy(airplane.position);
        box.position.copy(airplane.position);
        trajectory.children = [];
        box.canBeReleased = false
        box.isReleased = true
        scene.add(box);
        box.setLinearVelocity(new THREE.Vector3(0, 0, controls.velocity * 0.1));
    }
}

function drawTrajectory() {
    let line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([box.prevPosition, box.position]),
        ASSETS.materials.lineMaterial
    )
    trajectory.add(line);
    box.prevPosition.copy(box.position);
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
        alpha: true,
        logarithmicDepthBuffer: true
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
