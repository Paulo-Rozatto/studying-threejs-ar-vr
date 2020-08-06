let rendererStats, physicsStats, renderer, scene, camera, light, controls, gui, clock;

let box, airplane, airplaneRange, trajectory, TrajectoryPath, lookDirection, x, y, t, time, totalTime;

let frustum, cameraViewProjectionMatrix;

Physijs.scripts.worker = '../../libs/physijs_worker.js';
Physijs.scripts.ammo = '../libs/ammo.js';

const ASSETS = {
    textures: {
        crate: {
            path: '../../assets/textures/crate.png',
            fileSize: 119.437 + 4200
        },
        skyBoxMap: {
            path: '../../assets/textures/cloud.jpg',
            fileSize: 1065.362
        },
        grass: {
            path: '../../assets/textures/grass.png',
            fileSize: 836.528
        }
    },
    materials: {
        cubeMaterial: new THREE.MeshPhongMaterial(),
        lineMaterial: new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 4 }),
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
    scene.setGravity(new THREE.Vector3(0, -9.8, 0));
    scene.addEventListener('update', simulate)

    camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 700);
    camera.position.set(0, 1.6, 80);
    camera.lookAt(new THREE.Vector3(0, 30, 0));
    cameraViewProjectionMatrix = new THREE.Matrix4();
    scene.add(camera);

    frustum = new THREE.Frustum();

    light = new THREE.DirectionalLight(0xfefefe);
    light.position.set(0, 200, 200);
    scene.add(light);

    controls = new function () {
        this.velocity_module = 30;
        this.velocity = 30;
        this.height = 100;
        this.switch_camera = false;
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
    gui.add(controls, 'switch_camera').onChange(() => {
        if (!controls.switch_camera) {
            camera.position.set(0, 1.6, 80);
            camera.lookAt(new THREE.Vector3(0, 30, 0));
        }
        else {
            camera.position.copy(airplane.position);
            camera.lookAt(new THREE.Vector3(0, -1, 0))
        }
    });

    let planeMaterial = new Physijs.createMaterial(
        ASSETS.materials.groundMaterial,
        0.8,
        0.1
    );

    let grass = ASSETS.textures.grass;
    grass.wrapS = THREE.RepeatWrapping;
    grass.wrapT = THREE.RepeatWrapping;
    grass.repeat.set(15, 15);

    const ground = new Physijs.PlaneMesh(new THREE.PlaneGeometry(800, 800), planeMaterial);
    ground.material.map = grass;
    ground.rotation.x = Math.PI * -0.5;
    scene.add(ground);

    let skyBox = ASSETS.objects.skyBox;
    scene.add(skyBox);

    lookDirection = new THREE.Vector3(0, -1, 0);
    airplaneRange = 150;
    airplane = ASSETS.objects.airplane;
    airplane.position.set(-150, controls.height, 0);
    airplane.rotation.y = Math.PI;
    airplane.scale.set(0.25, 0.25, 0.25)
    scene.add(airplane);

    let cubeMaterial = new Physijs.createMaterial(ASSETS.materials.cubeMaterial, 0.8, 0.1);
    box = new Physijs.BoxMesh(
        ASSETS.geometries.cubeGeometry,
        cubeMaterial
    );
    box.isReleased = false;
    box.material.map = ASSETS.textures.crate;
    box.position.set(0, 1.5, 85); // is not visible to the camera
    box.addEventListener('collision', () => { box.isReleased = false }, false);
    scene.add(box);

    TrajectoryPath = ProjectileCurve();

    let path = new TrajectoryPath(new THREE.Vector3(0, -1, 0), 0, 0, 0, 0);

    trajectory = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(path.getPoints(1)),
        ASSETS.materials.lineMaterial,
    );
    scene.add(trajectory);

    x = document.getElementById('x');
    y = document.getElementById('y');
    t = document.getElementById('t');

    console.log(t);

    clock = new THREE.Clock();

    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);

    ls.remove(() => {
        animate();
        simulate();
    });
}

let simuClock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    airplane.position.x += controls.velocity * clock.getDelta();

    if (controls.switch_camera) {
        camera.position.copy(airplane.position);
        camera.lookAt(airplane.position.x, 0, 0);

        if (airplane.position.x > airplaneRange || airplane.position.x < -airplaneRange) {
            airplane.rotation.y += controls.velocity > 0 ? Math.PI : - Math.PI;
            controls.velocity *= -1;
        }
    }
    else {
        camera.updateMatrixWorld();
        camera.matrixWorldInverse.getInverse(camera.matrixWorld);
        cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

        if (!frustum.intersectsObject(airplane.children[0].children[0])) {
            if ((airplane.position.x > 0 && controls.velocity > 0) || (airplane.position.x < 0 && controls.velocity < 0)) {
                airplane.rotation.y += controls.velocity > 0 ? Math.PI : -1 * Math.PI;
                controls.velocity *= -1;
            }
        }
    }
    rendererStats.update();
    renderer.render(scene, camera);
}

let xPos, xTotalDis, xDis, yDis; //position and displacement
function simulate() {
    physicsStats.update();
    scene.simulate();
    let delta = simuClock.getDelta()
    if (time !== totalTime) {
        xDis = Math.abs((box.position.x - xPos));
        if (xDis > xTotalDis - 1.6) xDis = xTotalDis;

        yDis = controls.height - box.position.y + 1.5;
        if (yDis > controls.height - 0.5) yDis = controls.height;

        time += delta;
        if (time > totalTime) time = totalTime;
        t.innerHTML = 'T: ' + time.toFixed(2) + 's';
        x.innerHTML = 'X: ' + xDis.toFixed(2) + 'm';
        y.innerHTML = 'Y: ' + yDis.toFixed(2) + 'm';
    }
}

function releaseBox() {
    box.position.copy(airplane.position);
    xPos = box.position.x;
    box.__dirtyPosition = true
    box.setAngularVelocity(new THREE.Vector3(0, 0, 0));
    box.setLinearVelocity(new THREE.Vector3(controls.velocity, 0, 0));
    box.isReleased = true;
    drawTrajectory();

    totalTime = quadraticTime(-4.9, 0, controls.height)
    let aux = totalTime
    time = 0;
    xTotalDis = controls.velocity_module * parseFloat(aux.toFixed(2));
    console.log(xTotalDis);

}

function drawTrajectory() {
    let path = new TrajectoryPath(
        airplane.position,
        controls.velocity,
        airplane.rotation.y,
        0,
        9.8,
        10
    );
    path = path.getPoints(30)
    trajectory.geometry = new THREE.BufferGeometry().setFromPoints(path);
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
