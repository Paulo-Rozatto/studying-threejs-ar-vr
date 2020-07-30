let rendererStats, physicsStats, renderer, scene, camera, light, controls, gui, clock;

let box, airplane, trajectory, test;

let frustum, cameraViewProjectionMatrix;

Physijs.scripts.worker = '../libs/physijs_worker.js';
Physijs.scripts.ammo = '../libs/ammo.js';

const ASSETS = {
    textures: {
        wood: {
            path: '../assets/textures/wood.jpg',
            fileSize: 7545.6 + 4200
        },
        skyBoxMap: {
            path: '../assets/textures/cloud.jpg',
            fileSize: 1065.362
        },
        grass: {
            path: '../assets/textures/grass.jpg',
            fileSize: 1065.362
        }
    },
    materials: {
        cubeMaterial: new THREE.MeshPhongMaterial(),
        lineMaterial: new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 }),
        groundMaterial: new THREE.MeshBasicMaterial({ color: 0x77FF99 }),
        skyBoxMaterial: new THREE.MeshBasicMaterial({ side: 1 })
    },
    geometries: {
        cubeGeometry: new THREE.BoxGeometry(3, 3, 3),
        test: new THREE.BufferGeometry(),
        skyBoxGeometry: new THREE.SphereGeometry(600, 50, 50),
    },
    objects: {
        airplane: {
            path: '../assets/models/airplane.glb',
            fileSize: 4200
        },
        skyBox: {
            type: 'mesh',
            geometry: 'skyBoxGeometry',
            material: 'skyBoxMaterial',
            map: 'skyBoxMap'
        },
    }
};

setRenderer();

const ls = new LoadScreen(renderer, { type: 'stepped-circular', progressColor: '#447' })
    .onComplete(init)
    .start(ASSETS);

function init() {
    initStats();

    scene = new Physijs.Scene();
    scene.setGravity(new THREE.Vector3(0, -10, 0));
    scene.addEventListener('update', simulate)

    camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 700);
    camera.position.set(-80, 1, 0);
    camera.lookAt(new THREE.Vector3(0, 30, 0));
    scene.add(camera);

    frustum = new THREE.Frustum();
    cameraViewProjectionMatrix = new THREE.Matrix4();

    light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(-100, 100, 10);
    scene.add(light);

    controls = new function () {
        this.velocity_module = 30;
        this.velocity = 30;
        this.height = 100;
    };

    gui = new dat.GUI();
    gui.add(controls, 'velocity_module', 20, 50).onChange(() => {
        if (controls.velocity < 0) {
            controls.velocity = controls.velocity_module * -1;
        }
        else {
            controls.velocity = controls.velocity_module
        }
    });
    gui.add(controls, 'height', 50, 100).onChange(() => {
        airplane.position.y = controls.height;
    })

    const plane = new Physijs.PlaneMesh(new THREE.PlaneGeometry(300, 300), ASSETS.materials.groundMaterial);
    // plane.material.map = ASSETS.textures.grass;
    plane.rotation.x = Math.PI * -0.5;
    scene.add(plane);

    let skyBox = ASSETS.objects.skyBox;
    scene.add(skyBox);

    airplane = ASSETS.objects.airplane;
    airplane.position.set(0, controls.height, -150);
    airplane.rotation.y = Math.PI * 0.5
    airplane.scale.set(0.25, 0.25, 0.25)
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

    test = new THREE.BufferGeometry();

    clock = new THREE.Clock();

    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);

    ls.remove(() => {
        animate();
        simulate();
    });
}

function animate() {
    requestAnimationFrame(animate);

    airplane.position.z += controls.velocity * clock.getDelta();

    camera.updateMatrixWorld();
    camera.matrixWorldInverse.getInverse(camera.matrixWorld);
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    if (!frustum.intersectsObject(airplane.children[0].children[0])) {
        if ((airplane.position.z > 0 && controls.velocity > 0) || (airplane.position.z < 0 && controls.velocity < 0)) {
            airplane.rotation.y += controls.velocity > 0 ? Math.PI : -Math.PI;
            controls.velocity *= -1;
        }
    }
    if (box.isReleased) drawTrajectory();

    rendererStats.update();
    renderer.render(scene, camera);
}

function simulate() {
    physicsStats.update();
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
        box.setLinearVelocity(new THREE.Vector3(0, 0, controls.velocity));
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

function setRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x7799FF);
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


    physicsStats = new Stats();
    physicsStats.domElement.style.position = 'absolute';
    physicsStats.domElement.style.top = '50px';
    document.getElementById('physijs-stats').appendChild(physicsStats.domElement);
}

function onKeyDown(event) {
    switch (event.keyCode) {
        case 32:
            releaseBox();
            break;
    }
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
