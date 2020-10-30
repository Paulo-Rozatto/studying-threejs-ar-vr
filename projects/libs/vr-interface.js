/*
  Usage:
  - Import vr-interface to your code
    <script type="text/javascript" charset="UTF-8" src="path/to/vr-interface.js"></script>

  - Call it in an aframe entity and pass the options to config
     <a-entity vr-interface="position: -1 0 0; dimension: 5 1;" config></a-entity>

  - To add buttons create a component in your code
    AFRAME.registerComponent('my-component', {
      init: function () {
        const vrInterface = document.querySelector('[vr-interface]').components['vr-interface'];

        vrInterface.addButton('myButton', '#myTexture', callbackButtonAction);
      },
    });

  Properties:
  - position: position relative to the camera;
  - rotation: button rotation in Y-Axis;
  - dimension: number of lines and columns of the imaginary matrix in which the buttons will be placed;
  - centralize: it makes the center of the imaginary matrix correspond to the position property, if false the position property corresponds to the top-left; 
  - buttonSize: individual button size;
  - cursorColor: defines the color of the aim cursor.

  Observations:
  - if the scene's camera is not initialized before calling vr-interface or the number of buttons overflow the dimension property, the buttons may be misplaced. 
*/

AFRAME.registerComponent('vr-interface', {
  schema: {
    position: { type: 'vec3', default: { x: -1, y: 0, z: 0 } },
    rotation: { type: 'number', default: Math.PI / 2 },
    dimension: { type: 'vec2', default: { x: 1, y: 1 } },
    centralize: { type: 'bool', default: true },
    buttonSize: { type: 'vec2', default: { x: 0.30, y: 0.20 } },
    cursorColor: { type: 'color', default: 'white' },
  },

  init: function () {
    const self = this;

    this.buttons = [];
    this.camera = document.querySelector('[camera]')

    this.cursor = document.createElement('a-entity')

    this.cursor.setAttribute('cursor', { fuse: true, fuseTimeout: 1000, });
    this.cursor.setAttribute('raycaster', { far: 1, objects: '.vrInterface-button' })
    this.cursor.setAttribute('position', { x: 0, y: 0, z: -0.9 });
    this.cursor.setAttribute('geometry', { primitive: 'ring', radiusInner: 0.007, radiusOuter: 0.015 });
    this.cursor.setAttribute('material', { color: this.data.cursorColor, shader: 'flat' });
    this.cursor.setAttribute('animation__click', 'property: scale; startEvents: click; easing: easeInCubic; dur: 150; from: 0.1 0.1 0.1; to: 1 1 1');
    this.cursor.setAttribute('animation__fusing', 'property: scale; startEvents: fusing; easing: easeInCubic; dur: 1000; from: 1 1 1; to: 0.1 0.1 0.1')
    this.cursor.setAttribute('animation__fusing2', 'property: scale; startEvents: mouseleave; easing: easeInCubic; dur: 150; to: 1 1 1')

    this.camera.appendChild(this.cursor);

    this.el.addEventListener('click', (evt) => self.clickHandle(evt)); // click == fuse click
  },
  // TODO: implement update function
  // update: function (oldData) {
  //   const el = this.el;
  //   const data = this.data;


  //   // If `oldData` is empty, then this means we're in the initialization process.
  //   // No need to update.
  //   if (Object.keys(oldData).length === 0) { return; }
  // },
  clickHandle: function (evt) {
    let name = evt.detail.intersection.object.name;

    for (let button of this.buttons) {
      if (button.name === name && typeof button.onClick === 'function') {
        button.onClick();
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
    texture.image = image;
    texture.needsUpdate = true;

    let button = new THREE.Mesh(
      new THREE.PlaneGeometry(data.buttonSize.x, data.buttonSize.y),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    );
    button.name = name;
    button.rotation.y = data.rotation;

    let i, j; // indexes of imaginary matrix where buttons are placed
    if (this.buttons.length === 0) {
      i = 0;
    }
    else {
      i = Math.trunc((this.buttons.length) / data.dimension.y);
    }
    j = this.buttons.length - data.dimension.y * i;

    button.position.set(
      this.camera.object3D.position.x + data.position.x,
      (this.camera.object3D.position.y + data.position.y) - i * data.buttonSize.y,
      (this.camera.object3D.position.z + data.position.z) - j * data.buttonSize.x,
    );
    if (data.centralize) {
      button.position.y += data.buttonSize.y * 0.5 * (data.dimension.x - 1);
      button.position.z += data.buttonSize.x * 0.5 * (data.dimension.y - 1);
    }
    button.onClick = callback;

    this.buttons.push(button);

    const entity = document.createElement('a-entity');
    entity.setObject3D(button.name, button)
    entity.classList.add('vrInterface-button');

    this.el.appendChild(entity);
  }
});
