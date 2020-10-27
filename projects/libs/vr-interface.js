AFRAME.registerComponent('vr-interface', {
  schema: {
    position: { type: 'vec3', default: { x: -1, y: 1.6, z: 0 } },
    dimension: { type: 'vec2', default: { x: 5, y: 1 } },
    centralize: { type: 'bool', default: true },
    buttonSize: { type: 'vec2', default: { x: 0.25, y: 0.25 } },
    textures: { type: 'selectorAll' }
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
    // console.log(this.cursor, this.cursor.getAttribute('position'));

    this.el.addEventListener('click', (evt) => self.clickHandle(evt)); // click == fuse click


    // if (data.dimension.x * data.dimension.y !== data.textures.length) {
    //   console.warn(' Dimension doesn\'t match the number of textures.\n',
    //     `Dimension has been resized from (${data.dimension.x}x${data.dimension.y}) to (1x${data.textures.length}).`)
    //   data.dimension.x = 1;
    //   data.dimension.y = data.textures.length;
    // }
    // all buttons got the same geometry
    // let buttonGeometry = new THREE.PlaneGeometry(data.buttonSize.x, data.buttonSize.y);

    // for (let i = 0; i < data.dimension.x; i++) {
    //   for (let j = 0; j < data.dimension.y; j++) {
    //     let texture = new THREE.Texture();
    //     texture.image = data.textures[i * data.dimension.y + j];
    //     texture.needsUpdate = true;

    //     // console.log(data.textures[i * data.dimension.y + j])

    //     let button = new THREE.Mesh(
    //       buttonGeometry,
    //       new THREE.MeshBasicMaterial({ map: texture })
    //     );
    //     button.name = data.textures[i * data.dimension.y + j].name;
    //     button.rotation.y = Math.PI / 2;
    //     button.position.set(
    //       data.position.x,
    //       data.position.y - i * data.buttonSize.y,
    //       data.position.z + j * data.buttonSize.x - data.buttonSize.x * 0.5 * (data.dimension.y - 1)
    //     );
    //     this.buttons[button.name] = button;
    //     el.sceneEl.setObject3D(button.name, this.buttons[button.name]);
    //     // console.log(button.name, this.buttons[button.name].position);
    //   }
    // }

  },

  update: function (oldData) {
    const el = this.el;
    const data = this.data;


    // If `oldData` is empty, then this means we're in the initialization process.
    // No need to update.
    if (Object.keys(oldData).length === 0) { return; }

    // if (oldData.position !== data.position) {
    //   this.box.position.set(data.position.x, data.position.y, data.position.z)
    // }
  },
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

    let image = document.querySelector(img)//.getAttribute('src');


    let texture = new THREE.Texture();
    texture.image = image;
    texture.needsUpdate = true;

    let button = new THREE.Mesh(
      new THREE.PlaneGeometry(data.buttonSize.x, data.buttonSize.y),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    );
    button.name = name;
    button.rotation.y = Math.PI / 2

    let i, j;
    if (this.buttons.length === 0) {
      i = 0;
    }
    else {
      i = Math.trunc((this.buttons.length) / data.dimension.y);
    }
    j = this.buttons.length - data.dimension.y * i;

    button.position.set(
      data.position.x,
      data.position.y - i * data.buttonSize.y,
      data.position.z - j * data.buttonSize.x,
    );
    if (data.centralize) {
      button.position.y += data.buttonSize.y * 0.5 * (data.dimension.x - 1);
      button.position.z += data.buttonSize.x * 0.5 * (data.dimension.y - 1);
    }
    button.onClick = callback;

    this.buttons.push(button);
    // console.log(this.buttons)

    const entity = document.createElement('a-entity');
    entity.setObject3D(button.name, button)
    entity.classList.add('clickable');

    this.el.appendChild(entity);
  }
});
