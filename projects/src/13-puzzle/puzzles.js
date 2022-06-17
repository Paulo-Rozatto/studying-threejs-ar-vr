import {
    Group,
    RepeatWrapping,
    MeshPhongMaterial,
    PlaneBufferGeometry,
    Mesh,
    BoxBufferGeometry,
    TextureLoader,
    Vector3,
    Raycaster,
} from '../../build2/three.module.js';

const groundList = [];
const collidable = [];
let floor;

let onHitFloor;

export function setFloor(flr, callback) {
    floor = flr;

    groundList.push(floor);

    if (typeof callback === 'function')
        onHitFloor = callback;
    else
        onHitFloor = () => { console.log('hit floor') };
}

export function makeWall(name) {
    const textureLoader = new TextureLoader();
    const wallGeo = new BoxBufferGeometry(0.2, 2, 0.5);
    const wallTex = textureLoader.load('../../assets/textures/wood4.jpg');

    wallTex.wrapS = RepeatWrapping;
    wallTex.wrapT = RepeatWrapping;
    wallTex.repeat.set(0.25, 1);

    const wallMat = new MeshPhongMaterial({ map: wallTex });

    let wall = new Mesh(wallGeo, wallMat);
    wall.name = name;

    collidable.push(wall);

    return wall;
}

export function makeVShelf(name) {
    const textureLoader = new TextureLoader();
    const wallGeo = new BoxBufferGeometry(0.2, 0.4, 0.3);
    const wallTex = textureLoader.load('../../assets/textures/wood.jpg');

    wallTex.wrapS = RepeatWrapping;
    wallTex.wrapT = RepeatWrapping;
    wallTex.repeat.set(0.25, 1);

    const wallMat = new MeshPhongMaterial({ map: wallTex });

    let wall = new Mesh(wallGeo, wallMat);
    wall.name = name;

    collidable.push(wall);

    return wall;
}

export function makeShelf() {
    const textureLoader = new TextureLoader();

    const shelfTex = textureLoader.load('../../assets/textures/wood3.jpg');
    shelfTex.wrapS = RepeatWrapping;
    shelfTex.wrapT = RepeatWrapping;
    shelfTex.repeat.set(1, 0.25);
    const shelfMat = new MeshPhongMaterial({ map: shelfTex });

    const shelfGeo = new BoxBufferGeometry(0.8, 0.1, 0.4);
    const shelf = new Mesh(shelfGeo, shelfMat);

    groundList.push(shelf)
    collidable.push(shelf);

    return shelf;
}

export function makePuzzle(shelfs, vshelfs = []) {
    const textureLoader = new TextureLoader();
    let puzzle = new Group();

    const rearText = textureLoader.load('../../assets/textures/wood4.jpg');
    rearText.wrapS = RepeatWrapping;
    rearText.wrapT = RepeatWrapping;
    rearText.repeat.set(2, 4);
    const rearMat = new MeshPhongMaterial({ map: rearText });

    const rearGeo = new PlaneBufferGeometry(2, 2)
    const rear = new Mesh(rearGeo, rearMat);
    puzzle.add(rear);

    const floorText = textureLoader.load('../../assets/textures/checkered.png');
    floorText.wrapS = RepeatWrapping;
    floorText.repeat.set(2.5, 1);
    const floorGeo = new PlaneBufferGeometry(2, 0.5);
    const floorMat = new MeshLambertMaterial({ map: floorText })
    const floor = new Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.99, 0.25)
    floor.rotateX(Math.PI * -0.5);
    puzzle.add(floor)

    let leftWall = makeWall("lwall");
    leftWall.position.x = -0.9;
    leftWall.position.z = 0.25;
    puzzle.add(leftWall);

    let rightWall = makeWall("rwall");
    rightWall.position.x = 0.9;
    rightWall.position.z = 0.25;
    puzzle.add(rightWall);

    let cont = 1;
    let shelf
    for (const sh of shelfs) {
        shelf = makeShelf();
        shelf.name = "shelf" + cont;
        shelf.position.set(sh.x, sh.y, 0.2);
        puzzle.add(shelf)
        cont += 1;
    }

    cont = 1;
    for (const sh of vshelfs) {
        shelf = makeVShelf();
        shelf.name = "vshelf" + cont;
        shelf.position.set(sh.x, sh.y, sh.z);
        puzzle.add(shelf)
        cont += 1;
    }

    return puzzle;
}

let down = new Vector3(0, -1, 0),
    right = new Vector3(1, 0, 0),
    left = new Vector3(-1, 0, 0);

export function physicBox() {
    const textureLoader = new TextureLoader();
    const boxSize = 0.15;
    const half = 0.15 * 0.5;

    const cubeTex = textureLoader.load('../../assets/textures/crate.jpg')
    const cubeGeo = new BoxBufferGeometry(boxSize, boxSize, boxSize);
    const cubeMat = new MeshPhongMaterial({ map: cubeTex });
    const cube = new Mesh(cubeGeo, cubeMat);
    cube.speed = { x: 0, y: 0 };

    cube.isOnFloor = false;

    let intersection = [];
    let displacement, distance, friction = 0.65;
    const ray = new Raycaster(new Vector3(), new Vector3());
    const worldPos = new Vector3();
    const dir = new Vector3(1, 0, 0);

    cube.update = (delta) => {
        cube.getWorldPosition(worldPos);
        ray.set(worldPos, down);

        ray.intersectObjects(groundList, false, intersection);

        cube.speed.y += (2 * delta);
        displacement = cube.speed.y * delta;

        if (intersection.length != 0) {
            distance = intersection[0].distance;

            if (displacement < distance - half) {
                cube.position.y -= displacement;
            }
            else {
                cube.speed.y = 0;
                if (distance > half) {
                    cube.position.y -= distance - half;
                    cube.speed.y = 0;
                }

                if (intersection[0].object == floor && !cube.isOnFloor) {
                    cube.isOnFloor = true;
                    onHitFloor();
                }
            }

            intersection.length = 0;
        }

        if (cube.speed.x != 0) {
            cube.speed.x -= friction * delta * Math.sign(cube.speed.x);
            displacement = cube.speed.x * delta;

            if (cube.speed.x > 0)
                dir.copy(right);
            else
                dir.copy(left);

            dir.applyQuaternion(cube.parent.quaternion);

            ray.set(worldPos, dir);
            ray.intersectObjects(collidable, false, intersection);

            if (intersection.length > 0) {
                distance = intersection[0].distance;

                if (Math.abs(displacement) < distance - half) {
                    cube.position.x += displacement;
                }
                else if (distance > half) {
                    cube.position.x += (distance - half) * Math.sign(cube.speed.x);
                    cube.speed.x = 0;
                }

            }

            if (Math.abs(cube.speed.x) < 0.1) cube.speed.x = 0;
        }
    }

    return cube;
}