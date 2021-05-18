/*
  Usage:
  - Import vr-interface to your code:
    <script type="text/javascript" charset="UTF-8" src="path/to/vr-interface.js"></script>
  - Call it in an aframe entity and pass the options to config like the example below:
      <a-entity vr-interface="dimension: 3 2; orbits: 1 1.5 2 ; theta: 90; rho: 0; transparency: true; gap: 0.01 0.01; border: 1.2 #6d7584; movementBar: true"</a-entity>
  - To add buttons and use functions create a component in your code
    AFRAME.registerComponent('my-component', {
      init: function () {
        const vrInterface = document.querySelector('[vr-interface]').components['vr-interface'];
        vrInterface.addButton('myButton', '#myTexture', function() {
          vrInterface.showMessage('Button pressed');
        });
        vrInterface.addButton('myButton2', '#myTexture2', function() {
          vrInterface.showMessage('Button 2 pressed', 'bottom');
        });
        vrInterface.addButton('myButtonRotate', '#myTexture3', function(){
          vrInterface.updatePosition({theta: 180, rho: 15})
        });
      },
    });
    - There are two ways to define the position to the vr-interface: relative to the camera and relative to the world.
      Positioning relative to the camera works similar to polar coordinates, where the camera is the pole and you define some orbits (distances to the camera), theta (horizontal angle), and rho (vertical angle)
        <a-entity vr-interface="orbits: 1; theta: 45; rho: 45;"></a-entity>
      Positioning relative to the world works like positioning regular a-frame object, you define position and rotation in each axis
        <a-entity vr-interface="worldPosition: -1 1.6 -1; rotation: 0 45 0">
      The advantage of positioning relative to the camera is being able to move the vr-interface if movementBar is set to true;
  Properties:
  - visible: visibilty of the interface;
  - orbits: distances from the camera;
  - theta: horizontal rotation in degrees;
  - rho: vertical rotation in degrees;
  - worldPosition: a second way for positioning the interface, it overrides the orbital way;
  - rotation: Defines the rotation in x, y and z;
  - movementBar: whether to display move bar or not, doesn't work with world position;
  - dimension: number of lines and columns of the imaginary matrix in which the buttons will be placed;
  - centralize: whether to align buttons to the center, if false they are aligned to the top-left; 
  - buttonSize: individual button size;
  - transparency: whether the textures have transparency;
  - gap: distance beteween the buttons in the x and y axis;
  - messagePos: default position of the message box when it's called;
  - messageColor: text color of the message box;
  - messageBG: background color of the message box;
  - cursorColor: defines the color of the aim cursor;
  - cursorPosition: defines the positon of the aim cursor, usually it doesn't need to change;
  - raycaster: defines near and far properties of the raycaster;
  - border: thickness and color of button border, if nothing is set, no border is added.
  Functions:
  - addButton(buttonName, idOfTexture, callback) - adds a button to the interface
  - showMessage(message, position) - shows message, position parameter is optional
  - showSideText() - shows a permanent multiline message to the right of the interface
  - hideSideText() - hides side text
  - updatePosition({radius, theta, rho, worldPosition}) - should be called if the camera position changes or if you want to change one parameter. All parameters are optional.
  - hide() - hide the interface
  - show() - make interface visible
  
  Observations:
  - Setting the dimension property correctly is important for displaying the vr interface elements correctly;
*/

AFRAME.registerComponent('vr-interface', {
  schema: {
    dimension: { type: 'vec2', default: { x: 1, y: 1 } },
    orbits: {
      default: [1.1],
      parse: function (value) {
        let orbits;
        if (typeof value === 'string') {
          orbits = value.split(' ').map(v => parseFloat(v)).filter(v => typeof v === 'number')
        }
        else if (Array.isArray(value)) {
          orbits = value.map(v => parseFloat(v)).filter(v => typeof v === 'number')
        }
        else {
          orbits = [1];
        }
        return orbits;
      },
      stringify: function (value) {
        return value.join(' ');
      }
    },
    theta: { type: 'number', default: 90, parse: (value) => value * Math.PI / 180 },
    rho: { type: 'number', default: 0, parse: (value) => value * Math.PI / 180, },
    movementBar: { type: 'bool', default: true },
    worldPosition: { type: 'vec3', default: null },
    rotation: {
      type: 'vec3', default: { x: 0, y: 0, z: 0 }, parse: (obj) => {
        let result = { x: 0, y: 0, z: 0 };

        if (typeof obj !== 'string') {
          return result;
        }

        obj = obj.split(' ');

        if (obj.length != 3) {
          console.warn('VR-Interface - Wrong number of parameters for rotation. Using default value');
          return result;
        }

        result.x = parseFloat(obj[0]) * Math.PI / 180 || 0;
        result.y = parseFloat(obj[1]) * Math.PI / 180 || 0;
        result.z = parseFloat(obj[2]) * Math.PI / 180 || 0;

        console.log(result);
        return result;
      }
    },
    centralize: { type: 'bool', default: true },
    buttonSize: { type: 'vec2', default: { x: 0.30, y: 0.20 } },
    transparency: { type: 'bool', default: false },
    visible: { type: 'bool', default: true },
    gap: { type: 'vec2', default: { x: 0.00, y: 0.00 } },
    font: { type: 'string' },
    negate: { type: 'bool', default: true },
    messagePos: {
      default: 'top',
      oneof: ['top', 'bottom', 'left', 'right'],
    },
    sideTextSize: { type: 'vec2', default: { x: 0.75, y: 1 } },
    sideTextRotation: { type: 'number', default: 0 },
    messageColor: { type: 'color', default: 'white' },
    messageBG: { type: 'color', default: '#232323' },
    bgTransparency: { type: 'bool', default: true },
    messageSize: { type: 'number', default: 1 },
    cursorColor: { type: 'color', default: 'white' },
    cursorPosition: { type: 'vec3', default: { x: 0, y: 0, z: -0.9 } },
    raycaster: {
      default: { near: 0, far: null },
      parse: function (value) {
        if (typeof value === 'string') {
          let props = value.split(' ');
          return { near: props[0], far: props[1] }
        }
        return value;
      },
      stringify: function (value) {
        return `${value.near} ${value.far}`
      }
    },
    border: {
      default: { thickness: 1, color: null },
      parse: function (value) {
        if (typeof value === 'string') {
          let props = value.split(' ');
          return { thickness: props[0], color: props[1] }
        }
        return value;
      },
      stringify: function (value) {
        return `${value.thickness} ${value.color}`
      }
    },
  },
  init: function () {
    const self = this;
    const data = this.data;

    this.rig = document.querySelector('#rig');
    this.camera = document.querySelector('[camera]');
    this.referencePoint = new THREE.Vector3();
    this.hasSceneLoaded = false;

    this.buttons = [];
    this.buttonGeometry = new THREE.PlaneGeometry(1, 1);
    this.buttonGroup = document.createElement('a-entity');
    this.el.appendChild(this.buttonGroup);

    if (document.querySelector('#vrInterface-cursor') === null) {
      this.cursor = document.createElement('a-entity');
      this.cursor.id = 'vrInterface-cursor';
      this.cursor.setAttribute('cursor', { fuse: true, fuseTimeout: 1000, });
      this.cursor.setAttribute('geometry', { primitive: 'ring', radiusInner: 0.005, radiusOuter: 0.01 });
      this.cursor.setAttribute('animation__click', 'property: scale; startEvents: click; easing: easeInCubic; dur: 150; from: 0.1 0.1 0.1; to: 1 1 1');
      this.cursor.setAttribute('animation__fusing', 'property: scale; startEvents: fusing; easing: easeInCubic; dur: 1000; from: 1 1 1; to: 0.1 0.1 0.1');
      this.cursor.setAttribute('animation__fusing2', 'property: scale; startEvents: mouseleave; easing: easeInCubic; dur: 150; to: 1 1 1');
      this.camera.appendChild(this.cursor);
    }

    this.message = document.createElement('a-entity');
    this.message.object3D.visible = false;
    this.buttonGroup.appendChild(this.message);

    this.pivot = document.createElement('a-entity');
    this.sideText = document.createElement('a-entity');
    this.sideText.object3D.visible = false;
    this.pivot.appendChild(this.sideText);
    this.buttonGroup.appendChild(this.pivot);

    this.el.addEventListener('click', (evt) => self.handleClick(evt)); // click == fuse click
  },
  update: function (oldData) {
    const self = this;
    const data = this.data;

    // console.log(data);
    if (typeof data.worldPosition.x === 'number') {
      this.positioning = 'world';

      data.movementBar = false;
      console.log(data.rotation);
      this.buttonGroup.object3D.position.copy(data.worldPosition);
      this.buttonGroup.object3D.rotation.x = data.rotation.x;
      this.buttonGroup.object3D.rotation.y = data.rotation.y;
      this.buttonGroup.object3D.rotation.z = data.rotation.z;

      if (typeof data.raycaster.far === 'null') {
        data.raycaster.far = this.buttonGroup.position.distanceTo(this.camera.position);
      }
    }
    else {
      this.positioning = 'orbit';
      this.orbitIndex = 0;
      this.radius = data.orbits[this.orbitIndex];

      this.el.object3D.rotation.y = data.theta;
      this.buttonGroup.object3D.rotation.x = data.rho;

      if (typeof data.raycaster.far === 'null') {
        data.raycaster.far = this.radius;
      }
    }

    if (this.cursor) {
      this.cursor.setAttribute('raycaster', { near: data.raycaster.near, far: data.raycaster.far, objects: '.vrInterface-button' });
      this.cursor.setAttribute('position', { x: data.cursorPosition.x, y: data.cursorPosition.y, z: data.cursorPosition.z });
      this.cursor.setAttribute('material', { color: data.cursorColor, shader: 'flat' });
    }

    this.message.setAttribute('text', { align: 'center', font: data.font, negate: data.negate, width: data.messageSize, height: data.messageSize, color: new THREE.Color(data.messageColor) });
    this.message.setAttribute('geometry', { primitive: 'plane', height: data.messageSize * 0.1, width: data.messageSize });
    this.message.setAttribute('material', { color: new THREE.Color(data.messageBG), shader: 'flat', transparent: data.bgTransparency, opacity: data.bgTransparency ? 0.75 : 1 });

    this.sideText.setAttribute('text', { align: 'center', font: data.font, negate: data.negate, width: data.messageSize, height: data.messageSize, transparent: true, color: new THREE.Color(data.messageColor) });
    this.sideText.setAttribute('geometry', { primitive: 'plane', height: data.sideTextSize.y, width: data.sideTextSize.x });
    this.sideText.setAttribute('material', { color: new THREE.Color(data.messageBG), shader: 'flat', transparent: data.bgTransparency, opacity: data.bgTransparency ? 0.75 : 1 });

    if (data.border.color) {
      this.borderMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(data.border.color),
        linewidth: data.border.thickness
      })
    }

    if (!oldData.movementBar && data.movementBar) {
      this.createMovementBar();
      this.buttonGroup.appendChild(this.moveBar);
    }

    if (this.hasSceneLoaded) {
      this.updatePosition();
    }
    else {
      this.el.sceneEl.addEventListener('loaded', () => {
        self.hasSceneLoaded = true;
        self.updatePosition();
      }, { once: true });
    }
  },
  tick: function () {
    if (this.isToChangeTheta) {
      this.data.theta = this.camera.object3D.rotation.y + this.rig.object3D.rotation.y;
      this.el.object3D.rotation.y = this.data.theta;
    }

    if (this.isToChangeRho) {
      this.data.rho = this.camera.object3D.rotation.x;
      this.buttonGroup.object3D.rotation.x = this.data.rho;
    }
  },
  handleClick: function (evt) {
    let name = evt.detail.intersection.object.name;

    if (name === 'orbitButton') {
      this.orbitButton.onClick();
    }
    else if (name === 'horizMovButton') {
      this.horizMovButton.onClick();
    }
    else if (name === 'vertiMovButton') {
      this.vertiMovButton.onClick();
    }
    else if (name === 'stopButton') {
      this.stopButton.onClick();
    }
    // else if (!this.isToChangeTheta && !this.isToChangeRho) {
    for (let button of this.buttons) {
      if (button.name === name && typeof button.onClick === 'function') {
        button.onClick(evt.detail.intersection.object);
      }
    }
    // }
  },
  addButton: function (name, img, callback) {
    const data = this.data;

    if (data.dimension.x * data.dimension.y <= this.buttons.length) {
      console.warn('VRInterface: Number of buttons doesn\'t match dimensions limits.')
    }

    let image;
    if (!img || (typeof img === 'string' && img.length === 0)) {
      image = null
    }
    else {
      image = document.querySelector(img);
    }
    let texture = new THREE.Texture();
    let material;

    if (image) {
      texture.image = image;
      texture.needsUpdate = true;
      material = new THREE.MeshBasicMaterial({ map: texture, transparent: data.transparency });
    }
    else {
      material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    }

    let button = new THREE.Mesh(
      this.buttonGeometry,
      material
    );
    button.name = name;
    button.onClick = callback;
    button.scale.set(data.buttonSize.x, data.buttonSize.y, 1);

    this.positionate(button);

    if (data.centralize) {
      this.centralize(button);
    }

    const entity = document.createElement('a-entity');
    entity.setObject3D(button.name, button);

    if (this.borderMaterial) { // if there's a material, the user wants a border
      let border = new THREE.LineSegments(
        new THREE.EdgesGeometry(button.geometry),
        this.borderMaterial
      )
      button.border = border;
      this.positionateBorder(button);
      this.buttonGroup.setObject3D(button.name + '-border', border);
    }

    entity.classList.add('vrInterface-button');
    this.buttons.push(button);
    this.buttonGroup.appendChild(entity);
  },
  createMovementBar: function () {
    const self = this;
    const data = this.data;
    const moveBarButtonGeometry = new THREE.PlaneGeometry(0.1, 0.1);

    // this.movementBar = document.createElement('a-entity');
    this.moveBar = document.createElement('a-entity');

    this.isToChangeTheta = false;
    this.isToChangeRho = false;

    this.orbitButton = makeMoveButton(
      'orbitButton',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAADJ0lEQVRYw92Xv4sTQRTHFzzLxUIIot0JKVKeXCWB/APHFZJgcYHDxisChq3cM4VguHZD0gUbtQhBIYhbSK64YBAiKSRBmEC2yQ8xhdmw2UVudXe+FmZ/JGaT6FwhbjW/8sm8N9/35g0Hxo9DiWP4sv84IBQ7FERROIyF/gIQychkbNoAYJtjImcifwLghfqEAtZ02Gm1OsOpBdBJXeA3BPDZrg17VJMS278GthNSbWTD7mb5TQApQqHX0gt2h9I1HZSk1gLCsgmjEltmb6xiwJTDqwFxBXZjP8jn+w0bSnwVQFChSXzwsfOSBlUIBhwb6B+sVs5BH8ZxEEAwQKLrtBclMITlgLgKsrtevbsEanwZIKygP/f/fLJYbbbbzWoxOeeWaB9KeAlAhua3P1oaWE7MW4OSH32gQf4dkDJtyRcKZQ3QW5WcKOYqLR3Qyr5gkGwztQjgCRreRo96oEphx+nuFBSK3pFnXAOEXwBkqeHp58SAmp/TciivwjjxFGXQ7DyA76Li/f4cZG/R+XsE5x6hgi4/BxBs3dX/kYHmkuiPNGG4VsR0W5gD1FFzF/ZAlmaPCEHPnaih7gdEJnbamSpDdfa/dfrikt8KFWWnnbYnER8gQ0eOz6IazTurXgNn132EPNUcPYRGNOMDyJ4FJSgO6zkFQG77zkLxhF+D7AMQOCLiByg4ax5NAeDLPY9QwMARiwTiAUJjKzEbT1q6qx/u7mcAMJ64Azu6lZw1E9Y45AJi5nSWP7kiWj6jb30CgB/P3IEWirPW9tSMuYBDe+isqPoExXHc1SoFQM+uuQKqOlND+9AFCOg4w03k5k//6XcAeD/r5dB0JjoQXIDo7bsNcUE/EgUwnXVEtD1rxI0Ad0YA0FgNWGFC8isAfLy52oRgJ96fAMCHG9xqJwYe44MpALy7su4Yg4T00ACA0621QgqQ8uNvAPBma72UA4LpLQD6ktskmJaH82WZ0hfcRuEckFC4V0Vus4TCnNLYkypzWme+WNivNubLlf16Zy8wmEsc9iKLvcxjLzTZS132Ypu93L+ABwf7k+cCHl0X8ez7T56+GwF+Am1c2iRVXhf/AAAAAElFTkSuQmCC',
      0.05,
      () => {
        self.orbitIndex++;
        if (self.orbitIndex >= data.orbits.length) self.orbitIndex = 0;
        self.radius = data.orbits[self.orbitIndex];
        self.updatePosition();
      }
    );

    this.horizMovButton = makeMoveButton(
      'horizMovButton',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAABO0lEQVRYw+3WrQ7CQAwH8D3NPcAsT4CYnMSDQeM3g5snqAlCcDgMDoeZwS1BzBEIZpBAlj+CqXH9uBASxNVe90u29doGWARfxAKBBzzggV8BUUznx5ECKFIaSAsZSMABSESg4oFKAnLwAHIe6NUSUPdYYAsJwJYDRk8ZeI4Y4AAZwIEGptAAmFKAOemAkyGAJXQAlnagf9MCt74V2L1PMR+SMW9TdjZg3EAdzdgClHCI8hPI4BRZFzAXN+BiOkBYuwF12H2F3A3IPz9i5fJ8ZfkLiQuQ2AqpaA9XKRmrNqWwVmL80JbyI7Zfpo0W2BC3MbzqgGtINZSZDpjRLe2oAY5MT5w0MtBMuLa+l4E9OxeiuwTcI360rSVgLcxGc+aBs5Gmc8YDmbxglBxQKjaUAbfiDPye6AEP/C3wAjQlXixnoVFmAAAAAElFTkSuQmCC',
      -0.05,
      () => {
        self.isToChangeTheta = true;

        self.stopButton.visible = true;
        self.stopButton.position.set(
          (data.dimension.y / 2 * data.buttonSize.x + 0.06),
          0,
          0.01);
        self.stopButton.rotation.z = Math.PI / 2;
        self.stopButton.el.classList.add('vrInterface-button');
      }
    );

    this.vertiMovButton = makeMoveButton(
      'vertiMovButton',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAA2klEQVRYw2P4v5yBArD8P8OoAUPAAFM1igzgXfzl3UQKDGh+8h8I7hSQaUDYxf8Q8PeoJxkGmO789R8Ovq1SI9EA3tkf/qOA110kGVD54D8GuJZFtAH+p//+xwJ+77MlygC1jd//4wBfFvMSNmDim/94wJNmAgbE3/lPAFz0x2tAaCsSWAvTNA9ZNJT4lNgKMyCNzKQ8asCoAaMGjBowasCoAZQaQHHVRnHlSnH1ToUGBuVNHCo0sqjQzKO8oUmFpi4VGttUaO5T3uEY7bURacD55RSA80ADKAQAlbbCnlvwDscAAAAASUVORK5CYII=',
      -0.15,
      () => {
        self.isToChangeRho = true;

        self.stopButton.visible = true;
        self.stopButton.position.set(
          (data.dimension.y / 2 * data.buttonSize.x + 0.06),
          (-data.dimension.x + 1) * data.buttonSize.y / 2,
          0.01
        );
        self.stopButton.rotation.z = 0;
        self.stopButton.el.classList.add('vrInterface-button');
      }
    );

    this.stopButton = makeMoveButton(
      'stopButton',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAS1BMVEX/AAD/Li7/RUX/R0f/S0v/T0//XV3/bW3/c3P/dXX/lJT/l5f/p6f/wcH/zMz/z8//1tb/19f/4+P/5eX/7e3/9PT/9fX//f3///9m19XwAAAAx0lEQVRYw+3XyRKCMBAE0IgbQhDELf//pR5Ey5DpmUr10ZkjVf1OzJKQyAppjESNKaQYiIoOOKABx/OU19BUAad78c/P2wpAyANBBsS8LIjAO3/pfqq/AUEClvwm+3gAggCIeSiUAMgjoQBgHghrQMnLwgpQ86KQA62e/woNAq5G/iMMCHhY+UWYFOC5N/q3t4CdAXQOOPAnANtMXDvTA4UeafRQ5cc6v1j41cYvV3698wcGf+LwRxZ/5vGHpl/rDlQD9OObrBdJNVKVGSgnwAAAAABJRU5ErkJggg==',
      -0.25,
      () => {
        self.isToChangeTheta = false;
        self.isToChangeRho = false;

        self.stopButton.visible = false;
        self.stopButton.el.classList.remove('vrInterface-button');
      }
    );
    this.stopButton.visible = false;
    this.stopButton.el.classList.remove('vrInterface-button');

    function makeMoveButton(name, img64, yPos, callback) {
      const image = new Image();
      const texture = new THREE.Texture();

      image.src = img64;
      texture.image = image;
      image.onload = () => { texture.needsUpdate = true };

      const button = document.createElement('a-entity');
      button.setObject3D(name, new THREE.Mesh(
        // self.buttonGeometry,
        moveBarButtonGeometry,
        new THREE.MeshBasicMaterial({ map: texture })
      ));
      button.object3D.position.y = yPos;
      button.object3D.children[0].name = name;
      button.object3D.onClick = callback;
      button.classList.add('vrInterface-button');
      self.moveBar.appendChild(button);

      return button.object3D;
    }
  },
  showMessage: function (text, pos) {
    const msg = this.message.object3D;

    if (!pos && pos !== 'top' && pos !== 'bottom') {
      this.pos = this.data.messagePos;
    }
    else {
      this.pos = pos;
    }

    msg.el.setAttribute('text', { value: text });
    msg.children[1].scale.x = text.length * 0.0275;

    this.positionateMessage(this.pos);

    msg.visible = true;
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => msg.visible = false, 3000);
  },
  showSideText: function (text) {
    const sideText = this.sideText.object3D;

    if (!sideText.visible) {
      sideText.visible = true;

      sideText.el.addEventListener('loaded', () => {
        updateSideText(this);
        sideText.hasLoaded = true;
      }, { once: true })
    }

    text = text.split('\n');

    sideText.el.setAttribute('text', { value: text.join('\n') });

    if (sideText.hasLoaded) {
      updateSideText(this);
    }

    function updateSideText(parent) {
      sideText.children[1].scale.x = text.reduce((prev, curr) => curr.length > prev.length ? curr : prev).length * 0.0275;
      sideText.children[1].scale.y = text.length * 0.05;
      parent.positionateSideText();
    }
  },
  hideSideText: function () {
    this.sideText.object3D.visible = false;
  },
  positionate: function (button, length) {
    const data = this.data;

    let n = typeof length === 'number' ? length : this.buttons.length; // index of the n-th button, checks if length was passed as parameter
    let i = Math.trunc(n / data.dimension.y); // index of the line
    let j = n - data.dimension.y * i; // index of the column

    if (this.positioning === 'world') {
      button.position.set(
        j * (data.buttonSize.x + data.gap.x),
        - (i * (data.buttonSize.y + data.gap.y)),
        0
      );
    }
    else {
      button.position.set(
        j * (data.buttonSize.x + data.gap.x),
        - (i * (data.buttonSize.y + data.gap.y)), //* Math.cos(data.rho)),
        -this.radius  //- (i * (data.buttonSize.y + data.gap.y) * Math.sin(data.rho))
      );
    }
  },
  positionateMessage: function (pos) {
    const msg = this.message.object3D;

    if (pos === 'top') {
      msg.position.copy(this.buttons[0].position);
      msg.position.x += this.data.buttonSize.x * 0.5 * (this.data.dimension.y - 1);
      msg.position.y += this.data.buttonSize.y + (this.data.messageSize * 0.1 - this.data.buttonSize.y) * 0.5 + 0.02;
    }
    else if (pos === 'bottom') {
      msg.position.copy(this.buttons[(this.data.dimension.x - 1) * this.data.dimension.y].position);

      msg.position.x += this.data.buttonSize.x * 0.5 * (this.data.dimension.y - 1);
      msg.position.y -= this.data.buttonSize.y + (this.data.messageSize * 0.1 - this.data.buttonSize.y) * 0.5 + 0.02;
    }
  },
  positionateSideText: function () {
    const sideText = this.sideText.object3D;
    const pivot = this.pivot.object3D;

    pivot.position.z = this.buttons[0].position.z;
    pivot.position.x = this.buttons[this.data.dimension.y - 1].position.x + this.data.buttonSize.x * 0.5 + 0.02;
    pivot.rotation.y = this.data.sideTextRotation * Math.PI / 180;
    sideText.position.x = + sideText.children[1].scale.x * this.data.sideTextSize.x * 0.5;
    //sideText.position.x = + sideText.children[1].scale.x * this.data.messageSize * 0.5;
  },
  rotateSideText: function (theta) {
    if (!isNaN(theta)) {
      this.data.sideTextRotation = theta;
      this.pivot.object3D.rotation.y = this.data.sideTextRotation * Math.PI / 180;
    }
  },
  positionateBorder: function (button) {
    button.border.scale.copy(button.scale);
    button.border.position.copy(button.position);
    button.border.rotation.copy(button.rotation);
  },
  centralize: function (button) {
    button.position.y += this.data.buttonSize.y * 0.5 * (this.data.dimension.x - 1) * Math.cos(this.data.rho); // data.dimension.x == lines
    button.position.x -= this.data.buttonSize.x * 0.5 * (this.data.dimension.y - 1); // data.dimension.y == columns
  },
  decentralize: function (button) {
    button.position.y -= this.data.buttonSize.y * 0.5 * (this.data.dimension.x - 1); // data.dimension.x == lines
    button.position.x += this.data.buttonSize.x * 0.5 * (this.data.dimension.y - 1); // data.dimension.y == columns
  },
  updatePosition: function (args) {
    if (args) {
      if (typeof args.radius === 'number') {
        this.radius = args.radius;
        this.data.raycaster.far = args.radius;
        this.cursor.setAttribute('raycaster', { far: this.data.raycaster.far, near: this.data.raycaster.far / 2 });
      }
      if (typeof args.theta === 'number') {
        this.data.theta = args.theta * Math.PI / 180;
        this.el.object3D.rotation.y = this.data.theta;
      }
      if (typeof args.rho === 'number') {
        this.data.rho = args.rho * Math.PI / 180;
      }

      if (this.positioning === 'world') {
        if (args.worldPosition && typeof args.worldPosition.x === 'number' && typeof args.worldPosition.z === 'number' && typeof args.worldPosition.z === 'number') {
          this.data.worldPosition.x = args.worldPosition.x;
          this.data.worldPosition.y = args.worldPosition.y;
          this.data.worldPosition.z = args.worldPosition.z;
          this.buttonGroup.object3D.position.copy(this.data.worldPosition);
        }

        if (args.rotation && typeof args.rotation.x === 'number' && typeof args.rotation.z === 'number' && typeof args.rotation.z === 'number') {
          args.rotation.x = args.rotation.x * Math.PI / 180;
          args.rotation.y = args.rotation.y * Math.PI / 180;
          args.rotation.z = args.rotation.z * Math.PI / 180;

          this.data.rotation = args.rotation;

          this.buttonGroup.object3D.rotation.x = args.rotation.x;
          this.buttonGroup.object3D.rotation.y = args.rotation.y;
          this.buttonGroup.object3D.rotation.z = args.rotation.z;
        }
      }
    }

    if (this.positioning !== 'world') {
      if (this.rig) {
        this.rig.object3D.getWorldPosition(this.referencePoint);
        this.referencePoint.y += this.camera.object3D.position.y;
      }
      else {
        this.camera.object3D.getWorldPosition(this.referencePoint);
      }
    }

    this.el.object3D.position.x = this.referencePoint.x;
    this.el.object3D.position.y = this.referencePoint.y;
    this.el.object3D.position.z = this.referencePoint.z;

    for (let k = 0; k < this.buttons.length; k++) {
      this.positionate(this.buttons[k], k);
      if (this.data.centralize) this.centralize(this.buttons[k]);
    }

    if (this.borderMaterial) {
      for (let k = 0; k < this.buttons.length; k++) {
        this.positionateBorder(this.buttons[k])
      }
    };

    if (this.message.object3D.visible) {
      this.positionateMessage(this.pos);
    }

    if (this.sideText.object3D.visible) {
      this.positionateSideText();
    }

    if (this.data.movementBar) {
      this.moveBar.object3D.position.x = this.buttons[0].position.x - this.data.buttonSize.x / 2 - 0.06;
      this.moveBar.object3D.position.y = this.buttons[0].position.y;
      this.moveBar.object3D.position.z = this.buttons[0].position.z;
      this.moveBar.object3D.rotation.x = this.buttons[0].rotation.x;
    }

  },
  show: function () {
    this.data.visible = true;
    this.el.object3D.visible = true;
    this.cursor.setAttribute('raycaster', { near: this.data.raycaster.near, far: this.data.raycaster.far });
  },
  hide: function () {
    this.data.visible = false;
    this.el.object3D.visible = false;
    this.cursor.setAttribute('raycaster', { near: 0, far: 0 });
  }
});