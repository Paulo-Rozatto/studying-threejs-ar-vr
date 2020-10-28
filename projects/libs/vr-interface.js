AFRAME.registerComponent('vr-interface', {
  schema: {
    position: { type: 'vec3', default: { x: -1, y: 0, z: 0 } },
    dimension: { type: 'vec2', default: { x: 5, y: 1 } },
    centralize: { type: 'bool', default: true },
    buttonSize: { type: 'vec2', default: { x: 0.25, y: 0.25 } },
    textures: { type: 'selectorAll' },
  },

  init: function () {
    const self = this;
    const el = this.el;
    const data = this.data;

    this.buttons = [];
    this.camera = document.querySelector('[camera]')

    this.cursor = document.createElement('a-entity')

    this.cursor.setAttribute('cursor', { fuse: true, fuseTimeout: 1000, });
    this.cursor.setAttribute('raycaster', { far: 2, objects: '.clickable' })
    this.cursor.setAttribute('position', { x: 0, y: 0, z: -1 });
    this.cursor.setAttribute('geometry', { primitive: 'ring', radiusInner: 0.007, radiusOuter: 0.015 });
    this.cursor.setAttribute('material', { color: 'white', shader: 'flat' });
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
    button.rotation.y = Math.PI / 2

    let i, j; // indexes of imaginary matrix where buttons are placed
    if (this.buttons.length === 0) {
      i = 0;
    }
    else {
      i = Math.trunc((this.buttons.length) / data.dimension.y);
    }
    j = this.buttons.length - data.dimension.y * i;

    // 
    let camera = document.getElementById('camera').getAttribute('position');
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
    entity.classList.add('clickable');

    this.el.appendChild(entity);
  }
});
