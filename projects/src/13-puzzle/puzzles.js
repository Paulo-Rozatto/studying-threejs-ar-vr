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

export const groundList = [];
export const collidable = [];

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

export function makePuzzle(sh1, sh2, sh3) {
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

    let leftWall = makeWall("lwall");
    leftWall.position.x = -0.9;
    leftWall.position.z = 0.25;
    puzzle.add(leftWall);

    let rightWall = makeWall("rwall");
    rightWall.position.x = 0.9;
    rightWall.position.z = 0.25;
    puzzle.add(rightWall);

    const shelf1 = makeShelf();
    shelf1.name = "shelf1";
    shelf1.position.set(sh1.x, sh1.y, 0.2);
    puzzle.add(shelf1)

    const shelf2 = makeShelf();
    shelf2.name = "shelf2";
    shelf2.position.set(sh2.x, sh2.y, 0.2);
    puzzle.add(shelf2)

    const shelf3 = makeShelf();
    shelf3.name = "shelf3";
    shelf3.position.set(sh3.x, sh3.y, 0.2);
    puzzle.add(shelf3)

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

    let ray = new Raycaster(new Vector3(), new Vector3());
    let intersection = [];
    let displacement, distance, friction = 0.1;

    cube.update = (delta) => {
        ray.set(cube.position, down);

        ray.intersectObjects(groundList, false, intersection);

        // console.log(cube.speed.y)
        cube.speed.y += (2 * delta);
        displacement = cube.speed.y * delta;

        if (intersection.length != 0) {
            distance = intersection[0].distance;

            // console.log(intersection[0].distance)
            if (displacement < distance - half) {
                cube.position.y -= displacement;
                friction = 0.5;
            }
            else {
                cube.speed.y = 0;
                if (distance > half) {
                    cube.position.y -= distance - half;
                    cube.speed.y = 0;
                    friction = 0.5;
                }
            }

            intersection.length = 0;
        }

        if (cube.speed.x != 0) {
            cube.speed.x -= friction * delta * Math.sign(cube.speed.x);
            displacement = cube.speed.x * delta;


            let dir = cube.speed.x > 0 ? right : left;

            ray.set(cube.position, dir);
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