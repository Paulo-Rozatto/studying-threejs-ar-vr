/*
  Usage:
  - Import vr-interface to your code:
    <script type="text/javascript" charset="UTF-8" src="path/to/vr-interface.js"></script>

  - Call it in an aframe entity and pass the options to config like the example below:
      <a-entity vr-interface="dimension: 3 2; theta: 90; rho: 0; transparency: true; gap: 0.01 0.01; border: 1.2 #6d7584;"</a-entity>

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
          vrInterface.updatePostion({theta: 180, rho: 15})
        });
      },
    });

  Properties:
  - visible: visibilty of the interface;
  - orbits: distances from the camera;
  - theta: horizontal rotation in degrees;
  - rho: vertical rotation in degrees;
  - movementBar: whether to display move bar or not;
  - updatePos: whether it is move vr interface with the camera or not;
  - rotation: button rotation in Y-Axis in degrees;
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
  - updatePosition({radius, theta, rho}) - should be called if the camera position changes or if you want to change one parameter. All parameters are optional.
  - hide() - hide the interface
  - show() - make interface visible
  
  Observations:
  - Setting the dimension property correctly is important for displaying the vr interface elements correctly;
*/

AFRAME.registerComponent('vr-interface', {
  schema: {
    dimension: { type: 'vec2', default: { x: 1, y: 1 } },
    radius: { type: 'number', default: 1 },
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
    theta: { type: 'number', default: 90 },
    rho: { type: 'number', default: 0 },
    movementBar: { type: 'bool', default: true },
    updatePos: { type: 'bool', default: false },
    centralize: { type: 'bool', default: true },
    buttonSize: { type: 'vec2', default: { x: 0.30, y: 0.20 } },
    transparency: { type: 'bool', default: false },
    visible: { type: 'bool', default: true },
    gap: { type: 'vec2', default: { x: 0.00, y: 0.00 } },
    messagePos: {
      default: 'top',
      oneof: ['top', 'bottom', 'left', 'right'],
    },
    messageColor: { type: 'color', default: 'white' },
    messageBG: { type: 'color', default: '#232323' },
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

    this.buttons = [];
    this.buttonGeometry = new THREE.PlaneGeometry(1, 1);
    this.rig = document.querySelector('#rig');
    this.camera = document.querySelector('[camera]');
    this.oldCameraPos = new THREE.Vector3().copy(this.camera.object3D.position);
    this.toleratedDifference = 0.01;
    this.referencePoint = new THREE.Vector3();

    this.orbitIndex = 0;
    this.radius = data.orbits[this.orbitIndex];

    if (typeof data.raycaster.far === 'null') {
      data.raycaster.far = this.radius;
      data.raycaster.far = this.radius / 2;
    }

    this.buttonGroup = document.createElement('a-entity');
    this.el.appendChild(this.buttonGroup);

    this.cursor = document.createElement('a-entity');
    this.cursor.setAttribute('cursor', { fuse: true, fuseTimeout: 1000, });
    this.cursor.setAttribute('raycaster', { near: data.raycaster.near, far: data.raycaster.far, objects: '.vrInterface-button' });
    this.cursor.setAttribute('position', { x: data.cursorPosition.x, y: data.cursorPosition.y, z: data.cursorPosition.z });
    this.cursor.setAttribute('geometry', { primitive: 'ring', radiusInner: 0.007, radiusOuter: 0.015 });
    this.cursor.setAttribute('material', { color: data.cursorColor, shader: 'flat' });
    this.cursor.setAttribute('animation__click', 'property: scale; startEvents: click; easing: easeInCubic; dur: 150; from: 0.1 0.1 0.1; to: 1 1 1');
    this.cursor.setAttribute('animation__fusing', 'property: scale; startEvents: fusing; easing: easeInCubic; dur: 1000; from: 1 1 1; to: 0.1 0.1 0.1');
    this.cursor.setAttribute('animation__fusing2', 'property: scale; startEvents: mouseleave; easing: easeInCubic; dur: 150; to: 1 1 1');

    this.camera.appendChild(this.cursor);

    this.message = document.createElement('a-entity');
    this.message.setAttribute('text', { align: 'center', width: 1, height: 1, color: new THREE.Color(data.messageColor) });
    this.message.setAttribute('geometry', { primitive: 'plane', height: 0.1, width: 1 });
    this.message.setAttribute('material', { color: new THREE.Color(data.messageBG), transparent: data.transparency, opacity: data.transparency ? 0.75 : 1 });
    this.message.object3D.visible = false;
    this.buttonGroup.appendChild(this.message);

    this.sideText = document.createElement('a-entity');
    this.sideText.setAttribute('text', { align: 'center', width: 1, height: 1, color: new THREE.Color(data.messageColor) });
    this.sideText.setAttribute('geometry', { primitive: 'plane', height: 1, width: 1 });
    this.sideText.setAttribute('material', { color: new THREE.Color(data.messageBG), transparent: data.transparency, opacity: data.transparency ? 0.75 : 1 });
    this.sideText.object3D.visible = false;
    this.buttonGroup.appendChild(this.sideText);

    if (data.border.color) {
      this.borderMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(data.border.color),
        linewidth: data.border.thickness
      })
    }

    // converts deg to rad
    data.theta = data.theta * Math.PI / 180;
    data.rho = data.rho * Math.PI / 180;

    this.el.object3D.rotation.y = data.theta;
    this.buttonGroup.object3D.rotation.x = data.rho;

    //--------------------Creating movement bar--------------------------------------------
    this.isToChangeTheta = false;
    this.isToChangeRho = false;

    this.moveBar = document.createElement('a-entity');

    if (data.movementBar) {
      this.buttonGroup.appendChild(this.moveBar);
    }

    const moveBarButtonGeometry = new THREE.PlaneGeometry(0.1, 0.1);

    // --- Orbits button
    const oImage = new Image();
    oImage.src = orbitImage();
    const oTexture = new THREE.Texture();
    oTexture.image = oImage;
    oImage.onload = () => oTexture.needsUpdate = true;


    this.orbitButton = document.createElement('a-entity');
    this.orbitButton.setObject3D('orbitButton', new THREE.Mesh(
      moveBarButtonGeometry,
      new THREE.MeshBasicMaterial({ map: oTexture })
    ));
    this.orbitButton.object3D.position.y = 0.05;
    this.orbitButton.object3D.children[0].name = 'orbitButton';
    this.orbitButton.onClick = () => {
      self.orbitIndex++;
      if (self.orbitIndex >= data.orbits.length) {
        self.orbitIndex = 0;
      }
      self.radius = data.orbits[self.orbitIndex];
      self.updatePostion();
    }
    this.orbitButton.classList.add('vrInterface-button')
    this.moveBar.appendChild(this.orbitButton);

    // --- Horizontal movement button
    const hImage = new Image();
    hImage.src = horizontalImage();
    const hTexture = new THREE.Texture();
    hTexture.image = hImage;
    hImage.onload = () => hTexture.needsUpdate = true;

    this.horizMovButton = document.createElement('a-entity');
    this.horizMovButton.setObject3D('horizMovButton', new THREE.Mesh(
      moveBarButtonGeometry,
      new THREE.MeshBasicMaterial({ map: hTexture, transparent: true })
    ));
    this.horizMovButton.object3D.position.y = -0.05;
    this.horizMovButton.object3D.children[0].name = 'horizMovButton';
    this.horizMovButton.onClick = () => {
      self.isToChangeTheta = true;

      self.stopButton.object3D.visible = true;
      self.stopButton.object3D.position.set((data.dimension.y / 2 * data.buttonSize.x + 0.06), 0, 0.01);
      self.stopButton.object3D.rotation.z = Math.PI / 2;
      self.stopButton.classList.add('vrInterface-button');
    }
    this.horizMovButton.classList.add('vrInterface-button')
    this.moveBar.appendChild(this.horizMovButton);

    // --- Vertical movement button
    const vImage = new Image();
    vImage.src = verticalImage();
    const vTexture = new THREE.Texture();
    vTexture.image = vImage;
    vImage.onload = () => vTexture.needsUpdate = true;

    this.vertiMovButton = document.createElement('a-entity');
    this.vertiMovButton.setObject3D('vertiMovButton', new THREE.Mesh(
      moveBarButtonGeometry,
      new THREE.MeshBasicMaterial({ map: vTexture, transparent: true })
    ));
    this.vertiMovButton.object3D.position.y = -0.15;
    this.vertiMovButton.object3D.children[0].name = 'vertiMovButton';
    this.vertiMovButton.onClick = () => {
      self.isToChangeRho = true;

      self.stopButton.object3D.visible = true;
      self.stopButton.object3D.position.set((data.dimension.y / 2 * data.buttonSize.x + 0.06), (-data.dimension.x * data.buttonSize.y) / 4 - 0.05, 0.01);
      self.stopButton.object3D.rotation.z = 0;
      self.stopButton.classList.add('vrInterface-button');
    }
    this.vertiMovButton.classList.add('vrInterface-button')
    this.moveBar.appendChild(this.vertiMovButton);

    // -
    const sTexture = new THREE.TextureLoader().load('../src/assets/icons/stop.png');

    this.stopButton = document.createElement('a-entity');
    this.stopButton.setObject3D('stopButton', new THREE.Mesh(
      moveBarButtonGeometry,
      new THREE.MeshBasicMaterial({ map: sTexture, transparent: true })
    ));
    this.stopButton.object3D.children[0].name = 'stopButton';
    this.stopButton.object3D.visible = false;
    this.stopButton.onClick = () => {
      self.isToChangeTheta = false;
      self.isToChangeRho = false;

      self.stopButton.object3D.visible = false;
      self.stopButton.classList.remove('vrInterface-button');
    }
    this.moveBar.appendChild(this.stopButton);

    //--------------------------------------------------------------------
    this.isLoaded = false;
    this.el.sceneEl.addEventListener('loaded', () => {
      self.isLoaded = true;
      self.updatePostion();
    }, { once: true });

    this.el.addEventListener('click', (evt) => self.clickHandle(evt)); // click == fuse click
  },
  tick: function () {
    if (this.data.updatePos) {
      this.camera.object3D.getWorldPosition(this.referencePoint);

      if (Math.abs(this.oldCameraPos.x - this.referencePoint.x) > this.toleratedDifference
        || Math.abs(this.oldCameraPos.y - this.referencePoint.y) > this.toleratedDifference
        || Math.abs(this.oldCameraPos.z - this.referencePoint.z) > this.toleratedDifference
      ) {
        this.updatePostion();
      }
    }

    if (this.isToChangeTheta) {
      this.data.theta = this.camera.object3D.rotation.y + this.rig.object3D.rotation.y;
      this.el.object3D.rotation.y = this.data.theta;
    }

    if (this.isToChangeRho) {
      this.data.rho = this.camera.object3D.rotation.x;
      this.buttonGroup.object3D.rotation.x = this.data.rho;
    }
  },
  update: function (oldData) {
    //TODO - refactor this function

    // const el = this.el;
    // const data = this.data;

    // // If `oldData` is empty, then this means we're in the initialization process. No need to update.
    // if (Object.keys(oldData).length === 0) { return; }

    // if (oldData.visible !== data.visible) {
    //   if (data.visible) this.show();
    //   else this.hide();
    // }

    // if (oldData.rotation !== data.rotation) {
    //   this.data.rotation = data.rotation * Math.PI / 180; // converts deg to rad
    // }

    // // if position, dimension, button size, gap, or rotation changes it's the same processes to change the buttons
    // if (
    //   oldData.position.x !== data.position.x || oldData.position.y !== data.position.y || oldData.position.z !== data.position.z ||
    //   oldData.dimension.x !== data.dimension.x || oldData.dimension.y !== data.dimension.y ||
    //   oldData.buttonSize.x !== data.buttonSize.x || oldData.buttonSize.y !== data.buttonSize.y ||
    //   oldData.gap.x !== data.gap.x || oldData.gap.y !== data.gap.y ||
    //   oldData.rotation !== data.rotation
    // ) {
    //   for (let k = 0; k < this.buttons.length; k++) {
    //     this.buttons[k].rotation.y = data.rotation;

    //     this.positionate(this.buttons[k], k);
    //     if (oldData.buttonSize.x !== data.buttonSize.x || oldData.buttonSize.y !== data.buttonSize.y) {
    //       this.buttons[k].scale.set(data.buttonSize.x, data.buttonSize.y, 1);
    //     }

    //     if (data.centralize) {
    //       this.centralize(this.buttons[k]);
    //     }

    //     if (this.borderMaterial) {
    //       this.positionateBorder(this.buttons[k])
    //     }
    //   }
    // }
    // else if (oldData.centralize !== data.centralize) { // the previous option updates the centralization already
    //   for (let k = 0; k < this.buttons.length; k++) {
    //     if (data.centralize) {
    //       this.centralize(this.buttons[k]);
    //     }
    //     else {
    //       this.decentralize(this.buttons[k]);
    //     }
    //     if (this.borderMaterial) {
    //       this.positionateBorder(this.buttons[k])
    //     }
    //   }
    // }

    // if (oldData.cursorColor !== data.cursorColor) {
    //   this.cursor.setAttribute('material', { color: data.cursorColor, shader: 'flat' });
    // }

    // if (oldData.cursorPosition !== data.cursorPosition) {
    //   this.cursor.setAttribute('position', { x: data.cursorPosition.x, y: data.cursorPosition.y, z: data.cursorPosition.z });
    // }

    // if (oldData.raycaster.near !== data.raycaster.near || oldData.raycaster.far !== data.raycaster.far) {
    //   this.cursor.setAttribute('raycaster', { near: data.raycaster.near, far: data.raycaster.far });
    // }

    // if (oldData.border.thickness !== data.border.thickness || oldData.border.color !== data.border.color) {
    //   this.borderMaterial.linewidth = data.border.thickness;
    //   this.borderMaterial.color = new THREE.Color(data.border.color);
    //   this.borderMaterial.needsUpdate = true;
    // }

  },
  clickHandle: function (evt) {
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
    else if (!this.isToChangeTheta && !this.isToChangeRho) {
      for (let button of this.buttons) {
        if (button.name === name && typeof button.onClick === 'function') {
          button.onClick();
        }
      }
    }
  },
  addButton: function (name, img, callback) {
    const data = this.data;

    if (data.dimension.x * data.dimension.y <= this.buttons.length) {
      console.warn('VRInterface: Number of buttons doesn\'t match dimensions limits.')
    }

    let image = document.querySelector(img);
    let texture = new THREE.Texture();

    if (image) {
      texture.image = image;
      texture.needsUpdate = true;
    }

    let button = new THREE.Mesh(
      this.buttonGeometry,
      new THREE.MeshBasicMaterial({ map: texture, transparent: data.transparency })
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
  showMessage: function (text, pos) {
    const msg = this.message.object3D;

    if (!pos && pos !== 'top' && pos !== 'bottom') {
      this.pos = this.data.messagePos;
    }
    else {
      this.pos = pos;
    }

    msg.el.setAttribute('text', { value: text });
    msg.children[1].scale.x = text.length * 0.025;

    this.positionateMessage(this.pos);

    msg.visible = true;
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => msg.visible = false, 3000);
  },
  showSideText: function (text) {
    const sideText = this.sideText.object3D;

    if (!this.sideText.object3D.visible) {
      this.sideText.object3D.visible = true;
    }

    text = text.split('\n');

    sideText.el.setAttribute('text', { value: text.join('\n') });
    sideText.children[1].scale.x = text.reduce((prev, curr) => curr.length > prev.length ? curr : prev).length * 0.0275;
    sideText.children[1].scale.y = text.length * 0.05;

    this.positionateSideText();
  },
  hideSideText: function () {
    this.sideText.object3D.visible = false;
  },
  positionate: function (button, length) {
    /*
      The buttons are placed in negative z-axis, where the camere is looking by default.
      To determine the button position, it's used the following formulas
      x = x0 + rcos(rho)cos(theta)
      y = y0 + rsin(rho)
      z = z0 + rcos(rho)sin(theta)
   
      As the camera is looking to negative z-axis, theta = 90 deg, and z0 = 0
      x = x0
      y = y0 + rsin(rho)
      z = -rcos(rho)
   
      As the buttons are inclined at the angle of rho, it's need alignment correction in y-axis and z-axis
      y = y0 + rsin(rho) - lineIndex * buttonHeight * cos(rho)
      z = -rcos(rho) - lineIndex * buttonHeight * sin(rho)
     */
    const data = this.data;

    let n = typeof length === 'number' ? length : this.buttons.length; // index of the n-th button, checks if length was passed as parameter
    let i = Math.trunc(n / data.dimension.y); // index of the line
    let j = n - data.dimension.y * i; // index of the column

    // button.rotation.x = data.rho;

    button.position.set(
      j * (data.buttonSize.x + data.gap.x),
      - (i * (data.buttonSize.y + data.gap.y)), //* Math.cos(data.rho)),
      -this.radius  //- (i * (data.buttonSize.y + data.gap.y) * Math.sin(data.rho))
    );
  },
  positionateMessage: function (pos) {
    const msg = this.message.object3D;

    msg.position.copy(this.buttons[0].position);

    if (pos === 'top') {
      msg.position.x += this.data.buttonSize.x * 0.5 * (this.data.dimension.y - 1);
      msg.position.y += this.data.buttonSize.y / 2 + 0.06;
    }
    else if (pos === 'bottom') {
      let offset = (this.data.dimension.x - 1) * (this.data.buttonSize.y + this.data.gap.y);

      msg.position.x += this.data.buttonSize.x * 0.5 * (this.data.dimension.y - 1);
      msg.position.y -= this.data.buttonSize.y / 2 + 0.06 + offset;
    }
  },
  positionateSideText: function () {
    const sideText = this.sideText.object3D;

    let offset = (this.data.dimension.y - 1) * (this.data.buttonSize.x + this.data.gap.x) + 0.01;
    sideText.position.x = sideText.children[1].scale.x * 0.5 + offset
    sideText.position.z = this.buttons[0].position.z;
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
  updatePostion: function (args) {
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
    }

    if (this.rig) {
      this.rig.object3D.getWorldPosition(this.referencePoint);
      this.referencePoint.y += this.camera.object3D.position.y;
    }
    else {
      this.camera.object3D.getWorldPosition(this.referencePoint);
    }
    this.oldCameraPos.copy(this.referencePoint);

    this.el.object3D.position.x = this.referencePoint.x;
    this.el.object3D.position.y = this.referencePoint.y;
    this.el.object3D.position.z = this.referencePoint.z;

    for (let k = 0; k < this.buttons.length; k++) {
      this.positionate(this.buttons[k], k);
      if (this.data.centralize) this.centralize(this.buttons[k]);
      this.positionateBorder(this.buttons[k]);
    }

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

function orbitImage() {
  return `data:image/png;base64,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
    cuZ2ltcC5vcmcveG1wLyIKICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICB4bXBNTTpEb2N1bWVudElEPSJnaW1wOmRvY2lkOmdpbXA6NjM0M2I5NDYtZGQ3Ni00MTdlLThjMDItMjg3NThlOWMxZTU5IgogICB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjdmMTQyMjM4LTA5OTgtNGQ0Mi05OWEyLTQxYzMyZDVhNjEyZiIKICAgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmFiYmMzMDM1LThkOWEtNDIyZi1hZWVhLTMzN2YwMDEzNjU0ZSIKICAgR0lNUDpBUEk9IjIuMCIKICAgR0lNUDpQbGF0Zm9ybT0iTGludXgiCiAgIEdJTVA6VGltZVN0YW1wPSIxNjA3OTY5Nzk1NDExMDEzIgogICBHSU1QOlZlcnNpb249IjIuMTAuMjIiCiAgIGRjOkZvcm1hdD0iaW1hZ2UvcG5nIgogICB0aWZmOk9yaWVudGF0aW9uPSIxIgogICB4bXA6Q3JlYXRvclRvb2w9IkdJTVAgMi4xMCI+CiAgIDxpcHRjRXh0OkxvY2F0aW9uQ3JlYXRlZD4KICAgIDxyZGY6QmFnLz4KICAgPC9pcHRjRXh0OkxvY2F0aW9uQ3JlYXRlZD4KICAgPGlwdGNFeHQ6TG9jYXRpb25TaG93bj4KICAgIDxyZGY6QmFnLz4KICAgPC9pcHRjRXh0OkxvY2F0aW9uU2hvd24+CiAgIDxpcHRjRXh0OkFydHdvcmtPck9iamVjdD4KICAgIDxyZGY6QmFnLz4KIC
    AgPC9pcHRjRXh0OkFydHdvcmtPck9iamVjdD4KICAgPGlwdGNFeHQ6UmVnaXN0cnlJZD4KICAgIDxyZGY6QmFnLz4KICAgPC9pcHRjRXh0OlJlZ2lzdHJ5SWQ+CiAgIDx4bXBNTTpIaXN0b3J5PgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaQogICAgICBzdEV2dDphY3Rpb249InNhdmVkIgogICAgICBzdEV2dDpjaGFuZ2VkPSIvIgogICAgICBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjQxNDNlMGFlLTMxMWYtNDVkZi05MGMyLTBlZWRjNjdiMDkwYyIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iR2ltcCAyLjEwIChMaW51eCkiCiAgICAgIHN0RXZ0OndoZW49Ii0wMzowMCIvPgogICAgPC9yZGY6U2VxPgogICA8L3htcE1NOkhpc3Rvcnk+CiAgIDxwbHVzOkltYWdlU3VwcGxpZXI+CiAgICA8cmRmOlNlcS8+CiAgIDwvcGx1czpJbWFnZVN1cHBsaWVyPgogICA8cGx1czpJbWFnZUNyZWF0b3I+CiAgICA8cmRmOlNlcS8+CiAgIDwvcGx1czpJbWFnZUNyZWF0b3I+CiAgIDxwbHVzOkNvcHlyaWdodE93bmVyPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6Q29weXJpZ2h0T3duZXI+CiAgIDxwbHVzOkxpY2Vuc29yPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6TGljZW5zb3I+CiAgPC9yZGY6RGVzY3JpcHRpb24+CiA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC
    AgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC
    AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC
    AgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgCjw/eHBhY2tldCBlbmQ9InciPz53qd6yAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9bpSLVgnYQEclQnSyIijhqFYpQIdQKrTqYXPoFTRqSFBdHwbXg4Mdi1cHFWVcHV0EQ/ABxcnRSdJES/5cUWsR4cNyPd/ced+8Af73MVLNjHFA1y0gl4kImuyoEXxFCL/oQxrDETH1OFJPwHF/38PH1LsazvM/9OXqUnMkAn0A8y3TDIt4gnt60dM77xBFWlBTic+Ixgy5I/Mh12eU3zgWH/TwzYqRT88QRYqHQxnIbs6KhEk8RRxVVo3x/xmWF8xZntVxlzXvyF4Zy2soy12kOIYFFLEGEABlVlFCGhRitGikmUrQf9/APOn6RXD
    K5SmDkWEAFKiTHD/4Hv7s185MTblIoDnS+2PbHCBDcBRo12/4+tu3GCRB4Bq60lr9SB2Y+Sa+1tOgREN4GLq5bmrwHXO4AA0+6ZEiOFKDpz+eB9zP6pizQfwt0r7m9Nfdx+gCkqavkDXBwCIwWKHvd491d7b39e6bZ3w9IrnKWtce/CgAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAd0SU1FB+QMDhIQI5MpfTsAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAOjUlEQVR42u1bbWgTWfc/M5MXk2n6TxNDS3FNWrZCXygV7drsUraVuLro7oZu+8GWYNcF2dgUqpDWL1vcSlmHfFBoS8AFaQnqQrsSlwpV6la2hSgqBKkVUmyMxb7YpnmZTNO8zNz/h8dZ1EcnSevL//n7HMiXMHfuOb85957fOfceDCGE4CMWEQDAH3/8Eaqvr1/9mAynKErS3t6uxuEjl48eANH7mgjDMMjLy4Pi4mKssLAQV6vVmFQqxQAAYrEY8vv9aGZmhnv48CFaWFiA97U1vVMAysrKoKGhQVxVVSUpKCiQaDQaEUmSBEEQGI6/7HwcxwHLsohhGHZpaSnp9Xrjt27dig8ODiYmJyf/cwDIzs4Gs9ksMhqNspKSEplCoSAwDAMAAJZlUTQa5WiaZhmG4WKxGAIAkEqlGEmSuEKhIBQKBaFUKkVFRUWb9uzZA21tbezU1FTU6XRG7XZ7MhwO/98EQKVSQUdHh6S+vj5Lp9NJcRwHjuNgeXk54fF4Ym63O+5yuRIul4vz+XzAsuxL4wmCAK1WC3q9Htfr9eKKigrJtm3bpGq1WlxVVZX12WefZR05ciQ2NDQUoSgqvrKy8nYURwihoaGhIADMreeHYdjcsWPHnnk8nijHcQghhCKRSHJiYoK2Wq3P8vLy5tb77ry8vDmr1fpsYmKCjkQiSYQQ4jgOeT
    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`
}

function horizontalImage() {
  return `data:image/png;base64,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
  z+s8G5SfPDnw1e/TXr75s0P+vKnm/S/P23vH/p16ynE/229eTIB3L+/wEwIvhismESkwAAD4tpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOmlwdGNFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpwbHVzPSJodHRwOi8vbnMudXNlcGx1cy5vcmcvbGRmL3htcC8xLjAvIgogICAgeG1sbnM6R0lNUD0iaHR0cDovL3d3dy5naW1wLm9yZy94bXAvIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgIHhtcE1NOkRvY3VtZW50SUQ9ImdpbXA6ZG9jaWQ6Z2
  ltcDo4ODI1OThkNi1jZjMyLTQ4YTAtYTg4YS02NDhmNmY4ZGMxNTMiCiAgIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ODY4ZTBjNGMtZmY4Mi00NmIyLThmNWEtOTA4NTQ5MDUxOWU1IgogICB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6MjZkZTZkZmUtNmQ5NS00Y2UxLWI0YjgtMzg5MTg0MTI0MmZhIgogICBHSU1QOkFQST0iMi4wIgogICBHSU1QOlBsYXRmb3JtPSJMaW51eCIKICAgR0lNUDpUaW1lU3RhbXA9IjE2MDc5NzEzMzA2MDkwMTkiCiAgIEdJTVA6VmVyc2lvbj0iMi4xMC4yMiIKICAgZGM6Rm9ybWF0PSJpbWFnZS9wbmciCiAgIHRpZmY6T3JpZW50YXRpb249IjEiCiAgIHhtcDpDcmVhdG9yVG9vbD0iR0lNUCAyLjEwIj4KICAgPGlwdGNFeHQ6TG9jYXRpb25DcmVhdGVkPgogICAgPHJkZjpCYWcvPgogICA8L2lwdGNFeHQ6TG9jYXRpb25DcmVhdGVkPgogICA8aXB0Y0V4dDpMb2NhdGlvblNob3duPgogICAgPHJkZjpCYWcvPgogICA8L2lwdGNFeHQ6TG9jYXRpb25TaG93bj4KICAgPGlwdGNFeHQ6QXJ0d29ya09yT2JqZWN0PgogICAgPHJkZjpCYWcvPgogICA8L2lwdGNFeHQ6QXJ0d29ya09yT2JqZWN0PgogICA8aXB0Y0V4dDpSZWdpc3RyeUlkPgogICAgPHJkZjpCYWcvPgogICA8L2lwdGNFeHQ6UmVnaXN0cnlJZD4KICAgPHhtcE1NOkhpc3Rvcnk+CiAgICA8cmRmOlNlcT4KICAgICA8cmRmOmxpCiAgICAgIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiCiAgICAgIHN0RXZ0OmNoYW5nZWQ9Ii8iCi
  AgICAgIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6YmVjODFhYjUtMDI1Ny00MjY0LWFjZTItNWFhNzM3MTZhNTU4IgogICAgICBzdEV2dDpzb2Z0d2FyZUFnZW50PSJHaW1wIDIuMTAgKExpbnV4KSIKICAgICAgc3RFdnQ6d2hlbj0iLTAzOjAwIi8+CiAgICA8L3JkZjpTZXE+CiAgIDwveG1wTU06SGlzdG9yeT4KICAgPHBsdXM6SW1hZ2VTdXBwbGllcj4KICAgIDxyZGY6U2VxLz4KICAgPC9wbHVzOkltYWdlU3VwcGxpZXI+CiAgIDxwbHVzOkltYWdlQ3JlYXRvcj4KICAgIDxyZGY6U2VxLz4KICAgPC9wbHVzOkltYWdlQ3JlYXRvcj4KICAgPHBsdXM6Q29weXJpZ2h0T3duZXI+CiAgICA8cmRmOlNlcS8+CiAgIDwvcGx1czpDb3B5cmlnaHRPd25lcj4KICAgPHBsdXM6TGljZW5zb3I+CiAgICA8cmRmOlNlcS8+CiAgIDwvcGx1czpMaWNlbnNvcj4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC
  AgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgIC
  AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC
  AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/PoKbIqYAAAGEaUNDUElDQyBwcm9maWxlAAAokX2RPUjDQBzFX1ulItWCdhARyVCdLIiKOGoVilAh1AqtOphc+gVNGpIUF0fBteDgx2LVwcVZVwdXQRD8AHFydFJ0kRL/lxRaxHhw3I939x537wB/vcxUs2McUDXLSCXiQia7KgRfEUIv+hDGsMRMfU4Uk/AcX/fw8fUuxrO8z/05epScyQCfQDzLdMMi3iCe3rR0zvvEEVaUFOJz4jGDLkj8yHXZ5TfOBYf9PDNipFPzxBFiodDGchuzoqESTxFHFVWjfH/GZYXzFme1XGXNe/IXhnLayjLXaQ4hgUUsQYQAGVWUUIaFGK0aKSZStB/38A86fpFcMrlKYORYQAUqJMcP/ge/uzXzkxNuUigOdL7Y9scIENwFGjXb/j627cYJEHgGrrSWv1IHZj5Jr7W06BEQ3gYurluavAdc7gADT7pkSI4UoOnP54H3M/qmLNB/C3Svub0193H6AKSpq+QNcHAIjBYoe93j3V3tvf17ptnfD0iucpa1x78KAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH5AwOEioK9DI7Lg
  AAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAOUSURBVHja7do/aOpcFADwa7Rp0hctuLk52YCTq4uzEAjSDopQ3RMcdIiLg1wUu7i5OBTa5XawSqCzi2uggxTM5iCf8BZftbUv/sn9pre99ol/kkjvASchyfnl5p6TQ1wYY/z4+Ph6dXU1B98oWq3W2eXl5TkFvnkQAAJAAAgAASAABIAAEAACQAAIwNaRSCSoZDJpGWYymaQSiQTlGAAIoS8SiXisAohEIh4Ioc8RALVajQ6Hw6zVSzccDrO1Wo22HeD6+tpr1/O7j3PvBIAQYgOBAG0XQCAQoBFCrC0AsVjMJYqiD9gcoij6YrGYy3IACCHHsqztZZRlWQpCyFkKkMvlPNFo9IdTank0Gv2Ry+U8lgFIkuR1u90upwC43W6XJEleSwDq9TodCoUYp3V0oVCIqdfr9EEBeJ4HmUzm3KltbSaTOed5/nAA1Wr1zO/3e5wK4Pf7PdVq9ewgAIIgUPF43AscHvF43CsIwsZ5bXw3S6USxzAM9UVTQsmy7LaoAfr0OhiGoUqlEvf09DTd6GAYY9xqtX4BAP777FcoFH6u12t8LLFer3GhUPj5VU6tVusXxhhvtFRkWfZR1PGMDiiKArIs+/ayBzQajdNgMHh6bIOOYDB42mg0TncC4HkepNNpHzjSSKfTvn+VxS8BOI5z0TR9tGMzmqYpjuNcWwNomoZVVZ0eK4CqqlNN0/BOe0AqlfoYj8eLY0t+PB4vUqnUx14aofv7+9mxAWx6zRs1QsVicSEIwsdXsz9VVV91XV9ZkdzFxYVHFMVP30leXl4+isXiYm8AAABQqVSmd3d3zMnJyV83FV3XV4qiWPKo3NzcfPrfcrnElUpl431r4x0eIWT2er03py/9Xq/3hhAyD/I2qCjK+2w2Wzs1+dlstlYU5f1gr8OapuF2u+3Ysthut/9Z9naeCGWz2d+j0chxZXE0Gi
  2y2ezvg06E/kSz2ZyapumY5E3TBM1mc6uVuRUAhHDZ7/cd82ltv9+fQwiXlgEAAEC5XJ4ZhmH7MjAMwyyXy1s3alsDdDods9vt2l4Wu93uW6fTMS0HAACAfD7/PplMVnYlP5lMVvl8/n2XY+wEMBgMAELItrKIEJoOBgNgGwAAAEiSZAyHQ8Pq5IfDoSFJ0s7n3cuMH0L4Op/PsVXJPz8/r3Rdf93HsfYCcHt7a2l7/PDwsLfqQ74SIwAEgAAQAAJAAAgAASAABIAAfMv4HzhD9+AZ/7INAAAAAElFTkSuQmCC`
}

function verticalImage() {
  return `data:image/png;base64,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
  G39ifPa5p1P20a/AApCU7vX1nV/V1SfGee+7uk+LOE/boi94gje+1/wr6j66kJfOvYvVmcEb0uzbM9YjeCAWvrRMhSELIcpveRPisMv+ZHH2Vn75Iz9w4cRozECYHwDWwIehbIqxqbsaMZhiabXpfTdEmDClJMp/8R0WwU+Jk+li1VEE89wnITryt37QImVccgt2Po2KlNtrLAgR2mM1bSky9dj8FBNUu0Q36TYWdrMut56j2vj8KvWrDcLim8q42tgp4npxLWQz72ubpVeNEA5k/7MVNBeXJT4gGBnwFwnyHwMwDuMwR+BsB9hsDPALjPEPgZAPcZAj8D4D5D4GcA3GcI/AyA+9wJfg2A+wCBb6Pio03dy5aQyIaBvMTr/3mQkyKCe5xweq5gwaiq6R5h7v8BkvTV1MDbfwUAAA+LaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/Pgo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA0LjQuMC1FeGl2MiI+CiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICB4bWxuczppcHRjRXh0PSJodHRwOi8vaXB0Yy5vcmcvc3RkL0lwdGM0eG1wRXh0LzIwMDgtMDItMjkvIgogICAgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iCiAgICB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIgogIC
  AgeG1sbnM6cGx1cz0iaHR0cDovL25zLnVzZXBsdXMub3JnL2xkZi94bXAvMS4wLyIKICAgIHhtbG5zOkdJTVA9Imh0dHA6Ly93d3cuZ2ltcC5vcmcveG1wLyIKICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICB4bXBNTTpEb2N1bWVudElEPSJnaW1wOmRvY2lkOmdpbXA6MmMzZGUxMGQtZGRlZi00NmU3LTg2N2YtMmY0M2E3ZDUwOGEyIgogICB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjg1MzA3YjY0LTVmMDQtNDIwNy1hYTRkLWUyN2FiMTU2MmQ0YiIKICAgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmNlYmJkMWM2LTk3N2UtNGUzNC04M2Q1LWRkZDNlMzA0OGI3ZSIKICAgR0lNUDpBUEk9IjIuMCIKICAgR0lNUDpQbGF0Zm9ybT0iTGludXgiCiAgIEdJTVA6VGltZVN0YW1wPSIxNjA3OTcyMDUwNDk4OTUzIgogICBHSU1QOlZlcnNpb249IjIuMTAuMjIiCiAgIGRjOkZvcm1hdD0iaW1hZ2UvcG5nIgogICB0aWZmOk9yaWVudGF0aW9uPSIxIgogICB4bXA6Q3JlYXRvclRvb2w9IkdJTVAgMi4xMCI+CiAgIDxpcHRjRXh0OkxvY2F0aW9uQ3JlYXRlZD4KICAgIDxyZGY6QmFnLz4KICAgPC9pcHRjRXh0OkxvY2F0aW9uQ3JlYXRlZD4KICAgPGlwdGNFeHQ6TG9jYXRpb25TaG93bj4KICAgIDxyZGY6QmFnLz
  4KICAgPC9pcHRjRXh0OkxvY2F0aW9uU2hvd24+CiAgIDxpcHRjRXh0OkFydHdvcmtPck9iamVjdD4KICAgIDxyZGY6QmFnLz4KICAgPC9pcHRjRXh0OkFydHdvcmtPck9iamVjdD4KICAgPGlwdGNFeHQ6UmVnaXN0cnlJZD4KICAgIDxyZGY6QmFnLz4KICAgPC9pcHRjRXh0OlJlZ2lzdHJ5SWQ+CiAgIDx4bXBNTTpIaXN0b3J5PgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaQogICAgICBzdEV2dDphY3Rpb249InNhdmVkIgogICAgICBzdEV2dDpjaGFuZ2VkPSIvIgogICAgICBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmZkOTBkYWVhLTNiMDMtNDEwOS05OTlkLTZiMDljYTkwMjRjMCIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iR2ltcCAyLjEwIChMaW51eCkiCiAgICAgIHN0RXZ0OndoZW49Ii0wMzowMCIvPgogICAgPC9yZGY6U2VxPgogICA8L3htcE1NOkhpc3Rvcnk+CiAgIDxwbHVzOkltYWdlU3VwcGxpZXI+CiAgICA8cmRmOlNlcS8+CiAgIDwvcGx1czpJbWFnZVN1cHBsaWVyPgogICA8cGx1czpJbWFnZUNyZWF0b3I+CiAgICA8cmRmOlNlcS8+CiAgIDwvcGx1czpJbWFnZUNyZWF0b3I+CiAgIDxwbHVzOkNvcHlyaWdodE93bmVyPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6Q29weXJpZ2h0T3duZXI+CiAgIDxwbHVzOkxpY2Vuc29yPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6TGljZW5zb3I+CiAgPC9yZGY6RGVzY3JpcHRpb24+CiA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgIC
  AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC
  AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA
  ogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgCjw/eHBhY2tldCBlbmQ9InciPz4pIaUCAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9bpSLVgnYQEclQnSyIijhqFYpQIdQKrTqYXPoFTRqSFBdHwbXg4Mdi1cHFWVcHV0EQ/ABxcnRSdJES/5cUWsR4cNyPd/ced+8Af73MVLNjHFA1y0gl4kImuyoEXxFCL/oQxrDETH1OFJPwHF/38PH1LsazvM/9OXqUnMkAn0A8y3TDIt4gnt60dM77xBFWlBTic+Ixgy5I/Mh12eU3zgWH/T
  wzYqRT88QRYqHQxnIbs6KhEk8RRxVVo3x/xmWF8xZntVxlzXvyF4Zy2soy12kOIYFFLEGEABlVlFCGhRitGikmUrQf9/APOn6RXDK5SmDkWEAFKiTHD/4Hv7s185MTblIoDnS+2PbHCBDcBRo12/4+tu3GCRB4Bq60lr9SB2Y+Sa+1tOgREN4GLq5bmrwHXO4AA0+6ZEiOFKDpz+eB9zP6pizQfwt0r7m9Nfdx+gCkqavkDXBwCIwWKHvd491d7b39e6bZ3w9IrnKWtce/CgAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAd0SU1FB+QMDhI2ChJFZnMAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAEIklEQVR42u3aTUhqSxwA8PHkR3qzNK+BEOTKA+YiN50WJVSLKCrILJSKPna2iKJAV0WtNIoiSHd9UHGkzBZF0SIDK9A2tlDhuGoRGNdrmnbV1HvOW73Ne9Ctnlov5791Zpj5zZz/zPEMjaIoan9//1GlUsVBAYXVauV0d3eXIaDAAwJAAAgAASDARwWGYTSpVFp4AFwuF+A4zrbb7RVXV1dCk8nEYjAYhQFgMBiYBEEI1Go1j8PhIDwej67Vasv9fn/51NQU/csC9PX1IR6Ph6fT6QQikYj5z9/FYjHLaDR+d7lcpR0dHciXAairq6OdnZ2VrK+vV1RXV7Nf7AyC0Gpra7/t7u4KbTYbJx/5IWcAHA4HbGxsFJ+engqbmpq4DAaD9tq6xcXFSFdXV5nD4RAuLS0x/3cA09PTDIIgBIODg/zS0tKi97YjEAjo4+PjAoIg+GNjY0WfHkClUiFut7tsZmbme2VlZdZmTiKRFC8uLgodDge3sbGR9ukApFIpOD4+/ra9vS2sqanhIEj2FxadTqc1NDSUHB0dVeA4zuZyuR8PwGAwgMlkYl1eXgpbW1tLWSxWzpMqh8NB1G
  o1jyAIgcFgYH4YwMjISJHf7y/XarXlfD4/7/u3SCRi6nQ6gcfj4SmVyneP490dTyQS1N7e3hMA4Om1dVAUpXd2dpa9VGZrayt8f39PvqUvLBYL5B0Ax3ESx/HUW+rMz8//sYzL5Uqvrq7+hm+DEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAWY53fxnSaDSIXC5/U30URf9YHsMwRlVV1ZvuArjd7gyO42ReAdhsNq2np6dELBazsjkjAwMD/LeU93q9CafTGc37I7C2tvZbIpE8mM3mh3A4nMn30g0EAimj0RiSyWQRm81GfkgOSKfTYHR09Lm+vj54cnISfX5+JnM98Hg8TloslgiKoiG9Xp/6r+1lJQn6fD7Q1tb2q7+/P3hzcxMnyew7ZDIZ6uLi4qm9vf2HRqNJxGKxz7cLWK1WUi6XP87Ozv68u7tLZatdv9+fnJycDCoUitj5+Tn16bfBubm5NIqioc3NzXA0Gn33t/5QKJRZXl4OoSgaXllZycmdASSHzyoYGhpKtrS0BO12eyydTr965pLJJHlwcPCoUCiCExMTqVzmlJwfhJxOJ9Xc3Pw0PDz8w+v1Jl4qS5IkdX19/au3tzeoVCrjPp/v65wEd3Z2SJlMFjEajaFAIPCvWb29vX3W6XQ/MQyLHh4ekvnqV96Pwnq9PoWiaMhisUTi8TgZiUQyZrP5QSKRPCwsLOT9PJH3620AABCLxYBGo0lgGJaMxWJUPpb6pwL4O1wuFwU+OODrMASAAPAPEYCiKNNqtRbUwFEUZQIAAI2iKKqQV8Bf0MWL/D8ZqTYAAAAASUVORK5CYII=`
}