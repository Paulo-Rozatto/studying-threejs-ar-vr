let rendererStats, physicsStats, renderer, scene, camera, light, controls, gui, clock;

let box, airplane, trajectory, test;

Physijs.scripts.worker = '../libs/physijs_worker.js';
Physijs.scripts.ammo = '../libs/ammo.js';

const ASSETS = {
    textures: {
        wood: {
            path: '../assets/textures/wood.jpg',
            fileSize: 7545.6 + 4200
        }
    },
    materials: {
        cubeMaterial: new THREE.MeshPhongMaterial(),
        lineMaterial: new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 }),
        groundMaterial: new THREE.MeshBasicMaterial({ color: 0x77FF99 })
    },
    geometries: {
        cubeGeometry: new THREE.BoxGeometry(3, 3, 3),
        test: new THREE.BufferGeometry()
    },
    objects: {
        airplane: {
            path: '../assets/models/airplane.glb',
            fileSize: 4200
        }
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

    camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 200);
    camera.position.set(-80, 1, 0);
    camera.lookAt(new THREE.Vector3(0, 30, 0));
    scene.add(camera);

    light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(-100, 100, 10);
    scene.add(light);

    controls = new function () {
        this.velocity = 20;
    };

    gui = new dat.GUI();
    gui.add(controls, 'velocity', 10, 30);

    const plane = new Physijs.PlaneMesh(new THREE.PlaneGeometry(300, 300), ASSETS.materials.groundMaterial);
    plane.rotation.x = Math.PI * -0.5;
    scene.add(plane);

    airplane = ASSETS.objects.airplane;
    airplane.position.set(-10, 100, -130);
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
