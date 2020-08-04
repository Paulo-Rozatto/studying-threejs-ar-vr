/* global AFRAME */

if (typeof AFRAME === 'undefined') {
    throw new Error('Component attempted to register before AFRAME was available.');
}

/**
 * Teleporter component for A-Frame.
 * 
 * Usage:
 * - Import this file with an script tag after importing A-Frame
 * - You might add the teleporter to your entity like below, but it is way better to provide the meshes the teleporter will collide with
 * 
 *       <a-entity camera position="-3 1.6 18" teleporter></a-entity>
 * 
 * - Obs: In order to use it in a desktop, add also look-controls;
 * 
 * - If you don't suply an array with meshes to account in collision, the teleporter will check all elements in the scene, what may cause bad performace.
 * - In order to provide the array with the meshes, you need to use an auxiliar component on your code like it is shown below:
 *   
    AFRAME.registerComponent('setteleporter', {
            init: function () {
                let myEntity = document.getElementById('myEntity');
                myEntity.setAttribute('teleporter', {
                    collisionObjects: myMeshesArray
                });
            }
        });
 */
AFRAME.registerComponent('teleporter', {
    schema: {
        curveType: { default: 'parabolic', oneOf: ['parabolic', 'line'] },
        curveWidth: { default: 0.01 },
        curveSegments: { type: 'number', default: 30 },
        teleporterColor: { type: 'color', default: 'rgb(120,65,132)' },
        collisionObjects: { type: 'array', default: ['default'] },
        shootSpeed: { type: 'number', default: 15 },
        shootAngle: { type: 'number', default: Math.PI * 0.028 }, // approximately 5 degrees
        fireTeleporterOnSpacebar: { type: 'boolean', default: false },
        fireTeleporterOnTouch: { type: 'boolean', default: false }
    },

    init: function () {
        this.gamepad = null;
        this.obj = this.el.object3D;
        this.objHeight = this.obj.position.y;
        this.pathOrigin = new THREE.Vector3();
        this.path;
        this.Curve;
        this.collisionObjects;
        this.raycaster = new THREE.Raycaster();
        this.raycastRecursively = false;
        this.direction = new THREE.Vector3();
        this.rayDirection = new THREE.Vector3();
        this.intersection;
        this.time = 0;
        this.p1;
        this.p2;

        let material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(this.data.teleporterColor),
            side: THREE.DoubleSide,
        });

        this.pathOrigin.copy(this.obj.position);
        this.pathOrigin.y -= 0.2;

        this.Curve = this.ProjectileCurve();

        if (this.data.curveType === 'parabolic') {
            this.path = new this.Curve(
                this.pathOrigin,
                this.data.shootSpeed + camera.object3D.rotation.x * 5,
                this.data.shootAngle,
                Math.PI / 2 + camera.object3D.rotation.y
            );
        } else if (this.data.curveType === 'line') {
            this.path = new THREE.LineCurve3(this.pathOrigin, this.obj.position)
        }

        this.telepRay = new THREE.Mesh(
            new THREE.TubeBufferGeometry(this.path, this.data.curveSegments, this.data.curveWidth, 4, false),
            material
        );
        this.telepRay.name = 'teleporter-ray';

        this.telepTarget = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.2, 20, 1, true),
            material
        );
        this.telepTarget.name = 'teleporter-target';

        this.el.parentEl.setObject3D('telepMark', this.telepTarget);
        this.el.sceneEl.setObject3D('telepRay', this.telepRay);

        this.toggleTeleport(false);
    },

    update: function (oldData) {
        const data = this.data;

        if (data.fireTeleporterOnSpacebar && !oldData.fireTeleporterOnSpacebar) {
            window.addEventListener('keydown', this.events.handleKeyDown, false);
            window.addEventListener('keyup', this.events.handleKeyUp, false);
        }
        else if (!data.fireTeleporterOnSpacebar && oldData.fireTeleporterOnSpacebar) {
            window.removeEventListener('keydown', this.events.handleKeyDown, false);
            window.removeEventListener('keyup', this.events.handleKeyUp, false);
        }

        if (data.fireTeleporterOnTouch && !oldData.fireTeleporterOnTouch) {
            window.addEventListener('touchstart', this.events.handleTouchStart, false);
            window.addEventListener('touchend', this.events.handleTouchEnd, false);
        }
        else if (!data.fireTeleporterOnTouch && oldData.fireTeleporterOnTouch) {
            window.removeEventListener('touchstart', this.events.handleTouchStart, false);
            window.removeEventListener('touchend', this.events.handleTouchEnd, false);
        }

        if (data.teleporterColor !== oldData.teleporterColor) {
            this.telepRay.material.color = new THREE.Color(data.teleporterColor);
            this.telepTarget.material.color = new THREE.Color(data.teleporterColor);
        }

        if (data.collisionObjects && data.collisionObjects[0] !== 'default') {
            this.collisionObjects = data.collisionObjects;
            this.raycastRecursively = false;
            console.log('hi')
        }
        else {
            this.collisionObjects = this.el.sceneEl.object3D.children.filter(child => !/teleporter/.test(child.name));
            this.raycastRecursively = true;
        }
    },

    remove: function () {
        window.removeEventListener('keydown', this.events.handleKeyDown, false);
        window.removeEventListener('keyup', this.events.handleKeyUp, false);
        window.removeEventListener('touchstart', this.events.handleTouchStart, false);
        window.removeEventListener('touchend', this.events.handleTouchEnd, false);
    },

    tick: function () {
        if (this.telepRay.visible) {
            this.pathOrigin.copy(this.obj.position);
            this.pathOrigin.y -= 0.2;

            if (this.data.curveType === 'parabolic') {
                this.path = new this.Curve(
                    this.pathOrigin,
                    this.data.shootSpeed + camera.object3D.rotation.x * 10,
                    this.data.shootAngle,
                    Math.PI / 2 + camera.object3D.rotation.y
                );

                this.time = this.quadraticTime(this.path.g / 2, this.path.vy, this.path.p0.y) / this.data.curveSegments;

                for (let i = 0; i < this.data.curveSegments * 2; i++) {
                    this.p1 = i === 0 ? this.path.getPoint(this.time * i++) : this.p2;
                    this.p2 = this.path.getPoint(this.time * i);

                    this.raycaster.far = this.p1.distanceTo(this.p2);
                    this.raycaster.set(this.p1, this.direction.subVectors(this.p2, this.p1).normalize());
                    this.intersection = this.raycaster.intersectObjects(this.collisionObjects, this.raycastRecursively);

                    if (this.intersection[0] && this.intersection[0].face.normal.y > 0.9) {
                        this.telepTarget.position.copy(this.intersection[0].point);
                        this.telepTarget.position.y += 0.15;
                        break;
                    }
                }

            } else if (this.data.curveType === 'line') {
                this.path = new THREE.LineCurve3(this.pathOrigin, this.telepTarget.position)

                camera.object3D.getWorldDirection(this.direction);
                this.direction.multiplyScalar(-1);
                if (this.direction.y > -0.2) {
                    this.direction.y = -0.2;
                }

                this.raycaster.far = 9
                this.raycaster.set(this.pathOrigin, this.direction);

                this.intersection = this.raycaster.intersectObjects(this.collisionObjects);

                if (this.intersection[0]) {
                    this.telepTarget.position.copy(this.intersection[0].point);
                    this.telepTarget.position.y += 0.15;
                }
            }

            this.telepRay.geometry = new THREE.TubeBufferGeometry(this.path, this.data.curveSegments, this.data.curveWidth, 4, false);
            this.telepRay.geometry.needsupdate = true;
        }

        this.gamepad = navigator.getGamepads()[0];

        if (!this.gamepad) return;

        if (this.gamepad.buttons.some(btn => btn.pressed)) {
            this.toggleTeleport(true);
        }
        else if (this.telepRay.visible) {
            this.teleport();
        }
    },
    toggleTeleport: function (option) {
        this.telepRay.visible = option;
        this.telepTarget.visible = option;
    },
    teleport: function () {
        this.obj.position.x = this.telepTarget.position.x;
        this.obj.position.y = this.telepTarget.position.y + this.objHeight;
        this.obj.position.z = this.telepTarget.position.z;
        this.toggleTeleport(false);
    },
    ProjectileCurve: function () {
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
            p0.x += 0.05;
            p0.z += 0.05;

        }
        ProjectileCurve.prototype = Object.create(THREE.Curve.prototype);
        ProjectileCurve.prototype.constructor = ProjectileCurve;

        ProjectileCurve.prototype.getPoint = function (t) {
            let x = this.p0.x + this.vx * t * this.scale;
            let y = this.p0.y + ((this.vy * t) + (this.g * 0.5 * (t * t))) * this.scale;
            let z = this.p0.z - this.vz * t * this.scale;
            return new THREE.Vector3(x, y, z);

        };

        return ProjectileCurve
    },
    quadraticTime: function (a, b, c) {
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
    },
    events: {
        handleKeyDown: function (e) {
            if (e.keyCode === 32) { // spacebar
                this.toggleTeleport(true);
            }
        },
        handleKeyUp: function (e) {
            if (e.keyCode === 32) { // spacebar
                this.teleport();
            }
        },
        handleTouchStart: function () {
            this.toggleTeleport(true);
        },
        handleTouchEnd: function () {
            this.teleport();
        }
    }
});