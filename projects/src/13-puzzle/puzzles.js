import {
    Group,
    RepeatWrapping,
    MeshPhongMaterial,
    PlaneBufferGeometry,
    Mesh,
    BoxBufferGeometry,
    TextureLoader,
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

export function makePuzzle() {
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
    shelf1.position.set(-0.4, 0.4, 0.2);
    puzzle.add(shelf1)

    const shelf2 = makeShelf();
    shelf2.name = "shelf2";
    shelf2.position.set(0.4, -0.4, 0.2);
    puzzle.add(shelf2)

    return puzzle;
}