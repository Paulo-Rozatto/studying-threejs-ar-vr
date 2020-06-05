import { Raycaster, Vector3 } from './three.module.js';
import { PointerLockControls } from './PointerLockControls.js';

let FirstPersonLockerControls = function (scene, camera, domElement, ground, ramp) {
    const controls = new PointerLockControls(camera, domElement);

    const raycaster = new Raycaster(new Vector3(), new Vector3(0, -1, 0).normalize(), 0, 2);

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', function () {

        controls.lock();

    }, false);

    controls.addEventListener('lock', function () {

        instructions.style.display = 'none';
        blocker.style.display = 'none';

    });

    controls.addEventListener('unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';

    });

    scene.add(controls.getObject());

    this.speed = 20;
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let moveUp = false;
    let moveDown = false;

    window.addEventListener('keydown', (event) => movementControls(event.keyCode, true));
    window.addEventListener('keyup', (event) => movementControls(event.keyCode, false));

    function movementControls(key, value) {
        switch (key) {
            case 87: // W
                moveForward = value;
                break;
            case 83: // S
                moveBackward = value;
                break;
            case 65: // A
                moveLeft = value;
                break;
            case 68: // D
                moveRight = value;
                break;
            case 32: // Space
                moveUp = value;
                break;
            case 16: // Shift
                moveDown = value;
                break;
        }
    }

    this.move = function (delta) {
        let speed = this.speed;

        if (!controls.lock) return;
        let isIntersectingGround = false, isIntersectingRamp = false;

        if (ground || ramp) {
            raycaster.ray.origin.copy(controls.getObject().position);
            isIntersectingGround = raycaster.intersectObjects(ground).length > 0;
            isIntersectingRamp = raycaster.intersectObject(ramp).length > 0;
        }

        if (moveForward) {
            controls.moveForward(speed * delta);
        }
        else if (moveBackward) {
            controls.moveForward(speed * -1 * delta);
        }

        if (moveRight) {
            controls.moveRight(speed * delta);
        }
        else if (moveLeft) {
            controls.moveRight(speed * -1 * delta);
        }

        if (moveUp && camera.position.y <= 100) {
            camera.position.y += speed * delta;
        }
        else if (moveDown && !isIntersectingGround && !isIntersectingRamp) {
            camera.position.y -= speed * delta;
        }
        else if (isIntersectingRamp) {
            camera.position.y += speed / 2 * delta;
        }
    }
}

export { FirstPersonLockerControls };