let rendererStats, physicsStats, renderer, scene, camera, light, controls, gui, clock;

let box, airplane, trajectory, TrajectoryPath;

let frustum, cameraViewProjectionMatrix;

Physijs.scripts.worker = '../../libs/physijs_worker.js';
Physijs.scripts.ammo = '../libs/ammo.js';

const ASSETS = {
    textures: {
        wood: {
            path: '../../assets/textures/wood.jpg',
            fileSize: 7545.6 + 4200
        },
        skyBoxMap: {
            path: '../../assets/textures/cloud.jpg',
            fileSize: 1065.362
        },
        grass: {
            path: '../../assets/textures/grass.png',
            fileSize: 1065.362
        }
    },
    materials: {
        cubeMaterial: new THREE.MeshPhongMaterial(),
        lineMaterial: new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 }),
        groundMaterial: new THREE.MeshStandardMaterial({ color: 0x77FF99, }),
        skyBoxMaterial: new THREE.MeshBasicMaterial({ side: 1 })
    },
    geometries: {
        cubeGeometry: new THREE.BoxGeometry(3, 3, 3),
        skyBoxGeometry: new THREE.SphereGeometry(600, 50, 50),
    },
    objects: {
        airplane: {
            path: '../../assets/models/airplane.glb',
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

    let planeMaterial = new Physijs.createMaterial(
        ASSETS.materials.groundMaterial,
        0.8,
        0.1
    );

    const plane = new Physijs.PlaneMesh(
        new THREE.PlaneGeometry(300, 300),
        planeMaterial
    );
    let grass = ASSETS.textures.grass;
    grass.wrapS = THREE.RepeatWrapping;
    grass.wrapT = THREE.RepeatWrapping;
    grass.repeat.set(15, 15);
    plane.material.map = grass;
    plane.rotation.x = Math.PI * -0.5;
    scene.add(plane);

    let skyBox = ASSETS.objects.skyBox;
    scene.add(skyBox);

    airplane = ASSETS.objects.airplane;
    airplane.position.set(0, controls.height, -150);
    airplane.rotation.y = Math.PI * 0.5
    airplane.scale.set(0.25, 0.25, 0.25)
    scene.add(airplane);

    let cubeMaterial = new Physijs.createMaterial(
        ASSETS.materials.cubeMaterial,
        0.8,
        0.1
    );

    box = new Physijs.BoxMesh(
        ASSETS.geometries.cubeGeometry,
        cubeMaterial
    );
    box.material.map = ASSETS.textures.wood;

    TrajectoryPath = ProjectileCurve();

    let path = new TrajectoryPath(new THREE.Vector3(0, -1, 0), 0, 0, 0, 0);

    trajectory = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(path.getPoints(1)),
        ASSETS.materials.lineMaterial,
    );
    scene.add(trajectory);
    // trajectory.visible = false;

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
            airplane.rotation.y += controls.velocity > 0 ? Math.PI : -1 * Math.PI;
            controls.velocity *= -1;
        }
    }
    rendererStats.update();
    renderer.render(scene, camera);
}

function simulate() {
    physicsStats.update();
    scene.simulate();
}

function releaseBox() {
    box.position.copy(airplane.position);
    scene.add(box);
    box.setLinearVelocity(new THREE.Vector3(0, 0, controls.velocity));
    drawTrajectory();
}

function drawTrajectory() {
    let path = new TrajectoryPath(
        airplane.position,
        controls.velocity_module,
        0,
        -airplane.rotation.y,
        9.8,
        10
    );
    path = path.getPoints(30)
    trajectory.geometry = new THREE.BufferGeometry().setFromPoints(path);
    // trajectory.geometry.setDrawRange(0, 30);
    trajectory.geometry.needsupdate = true;
}

function ProjectileCurve() {
    function ProjectileCurve(p0, velocity, verticalAngle, horizontalAngle, gravity, scale) {
        THREE.Curve.call(this);

        if (p0 === undefined || velocity === undefined || verticalAngle === undefined || horizontalAngle === undefined) {
            return null;
        }

        let vhorizontal = velocity * Math.cos(verticalAngle);

        this.p0 = p0;
        this.vy = velocity * Math.sin(verticalAngle);
        this.vx = velocity * Math.cos(horizontalAngle);
        this.vz = velocity * Math.sin(horizontalAngle);
        this.g = (gravity === undefined) ? -9.8 : gravity;
        this.scale = (scale === undefined) ? 1 : scale;

        if (this.g > 0) this.g *= -1;
    }
    ProjectileCurve.prototype = Object.create(THREE.Curve.prototype);
    ProjectileCurve.prototype.constructor = ProjectileCurve;

    ProjectileCurve.prototype.getPoint = function (t) {
        t *= this.scale;
        let x = this.p0.x + this.vx * t;
        let y = this.p0.y + ((this.vy * t) + (this.g * 0.5 * (t * t)));
        let z = this.p0.z - this.vz * t;
        return new THREE.Vector3(x, y, z);

    };

    return ProjectileCurve
}

function quadraticTime(a, b, c) {
    // This uses the quadratic formula to solve for time in a linear motion with constant aceleration
    // It returns null when the result is negative once negative time doesn't make sense
    // ax^2 + bx + c = 0

    let delta = (b * b) - 4 * a * c;

    if (delta < 0) return null;

    let x;

    if (delta === 0) {
        x = -b / 2 * a;
        return x >= 0 ? x : null;
    }

    x = (-b - Math.sqrt(delta)) / (2 * a);
    if (x > 0) return x;

    x = (-b + Math.sqrt(delta)) / (2 * a);
    if (x > 0) return x;

    return null;
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
