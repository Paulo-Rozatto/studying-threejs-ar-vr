import {
    Group,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PlaneBufferGeometry,
    RingBufferGeometry,
    Vector2,
    Vector3,
    Euler,
    EdgesGeometry,
    LineBasicMaterial,
    LineSegments,
    Raycaster,
    Clock,
    FontLoader,
    TextBufferGeometry,
    Texture,
    TextureLoader,
    CanvasTexture,
} from '../build2/three.module.js';

// propertys
let currentOrbit, isFusing, config;

// objects
let camera, cursor, raycaster, rayClock, fusingClock, messageBg, message, textBg, text;

// groups
let uiGroup, movementBar, messageGroup, textGroup;

// helpers
let buttonsArray, buttonCount, origin2d, direction, direction2, euler, intersection, intersected, oldIntersected;
let pos;

let fingers, canvasTexture, center, hand;

class Orbi extends Object3D {
    constructor(cam, props) {
        super();

        if (!cam || cam.type != "PerspectiveCamera") {
            throw new Error("OrBI: Type of camera argument have to be PerspectiveCamera")
        }

        window.addEventListener('changed', function (e) {
            if (!hand) return;
            fingers = e.detail.fingers;

            if (fingers > 0) {
                config.hand.action.reset();
                config.hand.action.play()
            }
            else {
                config.hand.action.reset();
                config.hand.action.time = -1;
                config.hand.loop = true;
            }
        }, false);

        config = {
            display: new Vector2(4, 1),
            orbits: [1],
            rotation: {
                theta: Math.PI / 4,
                phi: 0
            },
            button: {
                size: new Vector2(0.3, 0.3),
                transparent: false,
                opacity: 1
            },
            gap: new Vector2(0, 0),
            border: {
                enabled: false,
                thickness: 1,
                color: 0xffffff
            },
            cursor: {
                innerRadius: 0.005,
                outerRadius: 0.01,
                color: 0xffffff,
                position: new Vector3(0, 0, -1),
                fusingTime: 1
            },
            font: {
                path: '',
                negate: false,
            },
            message: {
                color: 0xffffff,
                bgColor: 0x00000,
                transparent: true,
                opacity: 0.5,
            },
            text: {
                size: new Vector2(1, 0.6),
                yRotation: Math.PI / -4,
                color: 0xffffff,
                bgColor: 0x000000,
                transparent: true,
                opacity: 0.5
            },
            raycaster: {
                near: 0.0,
                far: 1.5,
            },
            hand: {
                model: null,
                mixer: null,
                action: null
            },
        }
        assingProps(config, props);

        camera = cam;
        buttonsArray = [];
        currentOrbit = 0;

        this.position.copy(camera.position);
        this.position.y = 1.6;
        this.rotation.y = config.rotation.theta;

        cursor = camera.getObjectByName("orbi-cursor");
        if (!cursor) {
            if (config.hand.model) {
                hand = config.hand.model;

                hand.scene.traverse(child => {
                    if (child.isMesh) {
                        let color = child.material.color;
                        child.material = new MeshBasicMaterial({ color });
                    }
                });

                hand.scene.scale.set(0.025, 0.025, 0.025);
                hand.scene.position.set(0, 0, -0.6);
                cursor = hand.scene;
            }
            else {
                cursor = new Mesh(
                    new RingBufferGeometry(config.cursor.innerRadius, config.cursor.outerRadius, 24),
                    new MeshBasicMaterial({ color: config.cursor.color, depthWrite: false, depthTest: false, transparent: true })
                );
                cursor.name = "orbi-cursor";
                cursor.position.copy(config.cursor.position);
                cursor.position.z = -config.orbits[currentOrbit] + 0.1;
                cursor.renderOrder = 5000;
            }
            camera.add(cursor);
        }

        uiGroup = new Group();
        uiGroup.name = "ui-Wrapper"
        uiGroup.rotation.x = config.rotation.phi;
        this.add(uiGroup);

        movementBar = createMovementBar(this);
        movementBar.position.z = -config.orbits[0];
        uiGroup.add(movementBar);

        messageGroup = new Group();
        messageGroup.name = "message-wrapper"
        messageGroup.position.y = (config.button.size.y + config.gap.y) * config.display.x * 0.5 + 0.05;
        messageGroup.position.z = -config.orbits[currentOrbit];
        messageGroup.visible = false;
        uiGroup.add(messageGroup);


        // canvasTexture = new CanvasTexture(context.canvas)

        const messageBgGeo = new PlaneBufferGeometry(1, 0.08);
        const messageBgMat = new MeshBasicMaterial({
            color: config.message.bgColor,
            transparent: config.message.transparent,
            opacity: config.message.opacity,
        });
        messageBg = new Mesh(messageBgGeo, messageBgMat);
        messageBg.name = "background";
        messageGroup.add(messageBg);

        textGroup = new Group();
        textGroup.name = "text-wrapper";
        textGroup.position.x = (config.button.size.x + config.gap.x) * (config.display.y - 1);
        textGroup.position.z = -config.orbits[currentOrbit];
        textGroup.rotation.y = config.text.yRotation;
        textGroup.visible = false;
        uiGroup.add(textGroup)

        const textBgGeo = new PlaneBufferGeometry(config.text.size.x, config.text.size.y);
        const textBgMat = new MeshBasicMaterial({
            color: config.text.bgColor,
            transparent: config.text.transparent,
            opacity: config.text.opacity,
        });
        textBg = new Mesh(textBgGeo, textBgMat);
        textBg.position.x = config.text.size.x * 0.5 + 0.01;
        textGroup.add(textBg);

        // load font
        if (config.font.path) {
            const fontLoader = new FontLoader();
            const self = this;

            fontLoader.load(
                config.font.path,
                (font) => {
                    self.font = font

                    const msgGeo = new TextBufferGeometry('', { font });
                    const messageMat = new MeshBasicMaterial({ color: config.message.color });
                    message = new Mesh(msgGeo, messageMat);
                    messageGroup.add(message);
                    message.position.z = 0.001;

                    const textGeo = new TextBufferGeometry('', { font });
                    const textMat = new MeshBasicMaterial({ color: config.text.color });
                    text = new Mesh(textGeo, messageMat);
                    text.position.x = config.text.size.x * -0.5 + 0.05;
                    text.position.y = config.text.size.y * 0.5 - 0.1;
                    text.position.z = 0.001;
                    textBg.add(text);
                },
                null,
                function (e) { console.error(e) }
            )
        }

        raycaster = new Raycaster(new Vector3(), new Vector3(0, 0, -1));
        raycaster.near = config.raycaster.near;
        // raycaster.far = config.raycaster.far;
        raycaster.far = config.orbits[currentOrbit] + 0.5;
        

        rayClock = new Clock(true);
        fusingClock = new Clock(false);
        isFusing = false;

        // helpers
        origin2d = new Vector2();
        direction = new Vector3(0, 0, -1);
        direction2 = new Vector3(1, 0, -1);
        pos = new Vector3();
        buttonCount = 0;
        euler = new Euler(0, 0, 0, 'YXZ');
        intersection = [];
    }

    addButton(name, textureSrc, callback) {
        let texture;

        if (textureSrc) {
            let loader = new TextureLoader();
            texture = loader.load(textureSrc);
        }

        let buttonGeo = new PlaneBufferGeometry(config.button.size.x, config.button.size.y);
        let buttonMat = new MeshBasicMaterial({ map: texture ? texture : null, transparent: config.button.transparent, opacity: config.button.opacity });
        let button = new Mesh(buttonGeo, buttonMat);

        button.name = name;
        button.renderOrder = 0;
        button.onClick = callback;

        let length = buttonCount;
        let linNumber = Math.trunc(length / config.display.y);
        let colNumber = length - config.display.y * linNumber;

        button.position.x = (config.button.size.x + config.gap.x) * ((config.display.y - 1) * 0.5 - colNumber) * -1;
        button.position.y = (config.button.size.y + config.gap.y) * ((config.display.x - 1) * 0.5 - linNumber);
        button.position.z = -config.orbits[currentOrbit];

        if (config.border.enabled) {
            let borderGeo = new EdgesGeometry(buttonGeo);
            let borderMat = new LineBasicMaterial({ color: config.border.color, linewidth: config.border.thickness })
            let border = new LineSegments(borderGeo, borderMat);

            button.add(border);
        }

        buttonsArray.push(button);
        uiGroup.add(button);
        buttonCount++;
    }

    showMessage(msg) {
        if (!this.font) {
            console.error('OrBI: No font specified.');
            return;
        }

        const msgGeo = new TextBufferGeometry(msg, {
            font: this.font,
            size: 0.04,
            height: 0,
        });
        msgGeo.computeBoundingBox()

        const centerOffset = - 0.5 * (msgGeo.boundingBox.max.x - msgGeo.boundingBox.min.x);

        message.geometry.dispose();
        message.geometry = msgGeo;
        message.geometry.needsUpdate = true;

        message.position.x = centerOffset;
        message.position.y = -0.04 / 2;

        messageBg.scale.x = centerOffset * 2.5;

        messageGroup.visible = true;
        setTimeout(() => {
            messageGroup.visible = false;
        }, 3000);
    }

    showText(txt) {
        if (!this.font) {
            console.error('OrBI: No font specified.');
            return;
        }

        const textGeo = new TextBufferGeometry(txt, {
            font: this.font,
            size: 0.04,
            height: 0,
        });
        // textGeo.computeBoundingBox()

        text.geometry = textGeo;
        text.geometry.needsUpdate = true;

        textGroup.visible = true;
    }

    hideText() {
        textGroup.visible = false;
    }

    update(time) {
        if (this.moveHorizontally) {
            euler.setFromQuaternion(camera.quaternion);
            this.rotation.y = euler.y;
        }
        else if (this.moveVertically) {
            euler.setFromQuaternion(camera.quaternion);
            uiGroup.rotation.x = euler.x;
        }

        if (fingers < 1) {
            isFusing = false;
            fusingClock.stop();
            cursor.children[0].children[1].material.color.g = 0.5;
            cursor.children[0].children[1].material.needsUpdate = true;
        }
        else if (rayClock.getElapsedTime() > 0.2) {
            rayClock.start();

            cursor.getWorldPosition(pos)

            direction.x = pos.x;
            direction.y = pos.y - 1.6;
            direction.z = pos.z;
            direction.normalize();

            raycaster.set(pos, direction);

            intersection.length = 0;

            if (this.moveVertically || this.moveHorizontally) {
                raycaster.intersectObject(this.stopButton, false, intersection);
            }
            else {
                raycaster.intersectObjects(buttonsArray, false, intersection);
            }

            if (intersection.length > 0) {
                intersected = intersection[0].object;
            }
            else {
                intersected = null;
                oldIntersected = null;
            }

            if (intersected) {
                if (intersected !== oldIntersected) {
                    isFusing = true;
                    fusingClock.start();
                    oldIntersected = intersected;
                }
            }
            else if (isFusing) {
                isFusing = false;
                fusingClock.stop();
                cursor.scale.set(1, 1, 1);
                // cursor.children[0].children[1].material.color.g = 0.5;
                // cursor.children[0].children[1].material.needsUpdate = true;
            }
        }

        if (isFusing) {
            this.fusingTime = fusingClock.elapsedTime;

            if (this.fusingTime < config.cursor.fusingTime) {
                cursor.scale.addScalar(-fusingClock.getDelta());
                // cursor.children[0].children[1].material.color.g += fusingClock.getDelta();
                // cursor.children[0].children[1].material.needsUpdate = true;
            }
            else {
                handleClick(intersected);
                cursor.scale.set(1, 1, 1);
                // cursor.children[0].children[1].material.color.g = 0.5;
                // cursor.children[0].children[1].material.needsUpdate = true;
                isFusing = false;
                fusingClock.stop();
            }
        }

        // canvasTexture.needsUpdate = true;
    }

    click() {
        // dont remember why rayscater were being set here
        // raycaster.setFromCamera(origin2d, camera);

        // intersection.length = 0;

        // if (this.moveVertically || this.moveHorizontally) {
        //     raycaster.intersectObject(this.stopButton, false, intersection);
        // }
        // else {
        //     raycaster.intersectObjects(buttonsArray, true, intersection);
        // }

        if (intersection.length > 0) {
            intersected = intersection[0].object;
        }
        else {
            intersected = null;
            oldIntersected = null;
        }

        if (intersected) {
            if (intersected !== oldIntersected) {
                isFusing = true;
                fusingClock.start();
                oldIntersected = intersected;
            }
        }
        else if (isFusing) {
            isFusing = false;
            fusingClock.stop();
            // cursor.scale.set(1, 1, 1);
        }
    }
}

function assingProps(config, props) {
    Object.keys(props).forEach(key1 => {
        if (typeof config[key1] === 'undefined') {
            console.warn(`OrBI: property "${key1}" does not exist.`);
        }
        else {
            Object.keys(props[key1]).forEach(key2 => {
                config[key1][key2] = props[key1][key2];
            });
        }
    });
}

function handleClick(button) {
    if (button && typeof button.onClick === 'function') {
        button.onClick();
    }
}

function createMovementBar(orbi) {
    const movementGroup = new Group();
    movementGroup.name = "movement-bar";

    let size = config.button.size.x > config.button.size.y ?
        config.button.size.x :
        config.button.size.y;
    size /= 3;

    const btnGeo = new PlaneBufferGeometry(size, size);

    const gap = 0.01
    const xPos = (config.button.size.x + config.gap.x) * (config.display.y * -0.5) - size * 0.5 - gap
    const yPos = (config.button.size.y + config.gap.y) * ((config.display.x - 0) * 0.5) - size * 0.5;

    const orbitsButton = createMoveButton(
        'orbits-button',
        btnGeo,
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAADJ0lEQVRYw92Xv4sTQRTHFzzLxUIIot0JKVKeXCWB/APHFZJgcYHDxisChq3cM4VguHZD0gUbtQhBIYhbSK64YBAiKSRBmEC2yQ8xhdmw2UVudXe+FmZ/JGaT6FwhbjW/8sm8N9/35g0Hxo9DiWP4sv84IBQ7FERROIyF/gIQychkbNoAYJtjImcifwLghfqEAtZ02Gm1OsOpBdBJXeA3BPDZrg17VJMS278GthNSbWTD7mb5TQApQqHX0gt2h9I1HZSk1gLCsgmjEltmb6xiwJTDqwFxBXZjP8jn+w0bSnwVQFChSXzwsfOSBlUIBhwb6B+sVs5BH8ZxEEAwQKLrtBclMITlgLgKsrtevbsEanwZIKygP/f/fLJYbbbbzWoxOeeWaB9KeAlAhua3P1oaWE7MW4OSH32gQf4dkDJtyRcKZQ3QW5WcKOYqLR3Qyr5gkGwztQjgCRreRo96oEphx+nuFBSK3pFnXAOEXwBkqeHp58SAmp/TciivwjjxFGXQ7DyA76Li/f4cZG/R+XsE5x6hgi4/BxBs3dX/kYHmkuiPNGG4VsR0W5gD1FFzF/ZAlmaPCEHPnaih7gdEJnbamSpDdfa/dfrikt8KFWWnnbYnER8gQ0eOz6IazTurXgNn132EPNUcPYRGNOMDyJ4FJSgO6zkFQG77zkLxhF+D7AMQOCLiByg4ax5NAeDLPY9QwMARiwTiAUJjKzEbT1q6qx/u7mcAMJ64Azu6lZw1E9Y45AJi5nSWP7kiWj6jb30CgB/P3IEWirPW9tSMuYBDe+isqPoExXHc1SoFQM+uuQKqOlND+9AFCOg4w03k5k//6XcAeD/r5dB0JjoQXIDo7bsNcUE/EgUwnXVEtD1rxI0Ad0YA0FgNWGFC8isAfLy52oRgJ96fAMCHG9xqJwYe44MpALy7su4Yg4T00ACA0621QgqQ8uNvAPBma72UA4LpLQD6ktskmJaH82WZ0hfcRuEckFC4V0Vus4TCnNLYkypzWme+WNivNubLlf16Zy8wmEsc9iKLvcxjLzTZS132Ypu93L+ABwf7k+cCHl0X8ez7T56+GwF+Am1c2iRVXhf/AAAAAElFTkSuQmCC',
    );
    orbitsButton.position.set(xPos, yPos, 0);
    buttonsArray.push(orbitsButton);
    movementGroup.add(orbitsButton)

    orbitsButton.onClick = () => {
        if (currentOrbit === config.orbits.length - 1) {
            currentOrbit = 0;
        }
        else {
            currentOrbit++;
        }

        raycaster.far = config.orbits[currentOrbit] + 0.5;
        uiGroup.children.forEach(child => {
            // if (child.isMesh ) {
            child.position.z = -config.orbits[currentOrbit];
            // }
        });
    };

    const horMoveButton = createMoveButton(
        'horizontal-movement-button',
        btnGeo,
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAABO0lEQVRYw+3WrQ7CQAwH8D3NPcAsT4CYnMSDQeM3g5snqAlCcDgMDoeZwS1BzBEIZpBAlj+CqXH9uBASxNVe90u29doGWARfxAKBBzzggV8BUUznx5ECKFIaSAsZSMABSESg4oFKAnLwAHIe6NUSUPdYYAsJwJYDRk8ZeI4Y4AAZwIEGptAAmFKAOemAkyGAJXQAlnagf9MCt74V2L1PMR+SMW9TdjZg3EAdzdgClHCI8hPI4BRZFzAXN+BiOkBYuwF12H2F3A3IPz9i5fJ8ZfkLiQuQ2AqpaA9XKRmrNqWwVmL80JbyI7Zfpo0W2BC3MbzqgGtINZSZDpjRLe2oAY5MT5w0MtBMuLa+l4E9OxeiuwTcI360rSVgLcxGc+aBs5Gmc8YDmbxglBxQKjaUAbfiDPye6AEP/C3wAjQlXixnoVFmAAAAAElFTkSuQmCC',
    );
    horMoveButton.position.set(xPos, yPos - size, 0);
    buttonsArray.push(horMoveButton);
    movementGroup.add(horMoveButton);

    horMoveButton.onClick = () => {
        orbi.moveHorizontally = true;
        stopButton.show('top');
    }

    const verMoveButton = createMoveButton(
        'vertical-movement-button',
        btnGeo,
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAA2klEQVRYw2P4v5yBArD8P8OoAUPAAFM1igzgXfzl3UQKDGh+8h8I7hSQaUDYxf8Q8PeoJxkGmO789R8Ovq1SI9EA3tkf/qOA110kGVD54D8GuJZFtAH+p//+xwJ+77MlygC1jd//4wBfFvMSNmDim/94wJNmAgbE3/lPAFz0x2tAaCsSWAvTNA9ZNJT4lNgKMyCNzKQ8asCoAaMGjBowasCoAZQaQHHVRnHlSnH1ToUGBuVNHCo0sqjQzKO8oUmFpi4VGttUaO5T3uEY7bURacD55RSA80ADKAQAlbbCnlvwDscAAAAASUVORK5CYII=',
    );
    verMoveButton.position.set(xPos, yPos - 2 * size, 0);
    buttonsArray.push(verMoveButton);
    movementGroup.add(verMoveButton);

    verMoveButton.onClick = () => {
        orbi.moveVertically = true;
        stopButton.show('right');
    }

    const stopButton = createMoveButton(
        'stop-button',
        btnGeo,
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAS1BMVEX/AAD/Li7/RUX/R0f/S0v/T0//XV3/bW3/c3P/dXX/lJT/l5f/p6f/wcH/zMz/z8//1tb/19f/4+P/5eX/7e3/9PT/9fX//f3///9m19XwAAAAx0lEQVRYw+3XyRKCMBAE0IgbQhDELf//pR5Ey5DpmUr10ZkjVf1OzJKQyAppjESNKaQYiIoOOKABx/OU19BUAad78c/P2wpAyANBBsS8LIjAO3/pfqq/AUEClvwm+3gAggCIeSiUAMgjoQBgHghrQMnLwgpQ86KQA62e/woNAq5G/iMMCHhY+UWYFOC5N/q3t4CdAXQOOPAnANtMXDvTA4UeafRQ5cc6v1j41cYvV3698wcGf+LwRxZ/5vGHpl/rDlQD9OObrBdJNVKVGSgnwAAAAABJRU5ErkJggg==',
    );
    stopButton.position.z = -config.orbits[currentOrbit];
    stopButton.visible = false;
    orbi.stopButton = stopButton;
    movementGroup.add(stopButton);

    stopButton.onClick = () => {
        orbi.moveHorizontally = false;
        orbi.moveVertically = false;

        stopButton.visible = false;

        if (textGroup.visible) {
            text.material.transparent = false;
            text.material.opacity = 1;
            textBg.material.transparent = config.text.transparent;
            textBg.material.opacity = config.text.opacity;
        }
    }

    stopButton.show = (position) => {
        stopButton.visible = true;

        if (position === 'top') {
            stopButton.position.set(
                0,
                yPos + size + gap,
                gap
            );
        }
        else if (position === 'right') {
            stopButton.position.set(-xPos, 0, 0);

            if (textGroup.visible) {
                text.material.transparent = true;
                text.material.opacity = 0.1;
                textBg.material.transparent = true;
                textBg.material.opacity = 0.1;
            }
        }
    }

    return movementGroup;
}

function createMoveButton(name, geometry, img64) {
    const image = new Image();
    const texture = new Texture();

    image.src = img64;
    texture.image = image;
    image.onload = () => { texture.needsUpdate = true };

    const mat = new MeshBasicMaterial({ map: texture });

    const button = new Mesh(geometry, mat);
    button.name = name;

    return button;
}

export { Orbi };