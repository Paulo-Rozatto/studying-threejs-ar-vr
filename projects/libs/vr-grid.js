AFRAME.registerComponent('vr-interface', {
  schema: {
    dimension: {
      type: 'vec2',
      default: { x: 1, y: 1 }
    },
    orbits: {
      default: [1],
      parse: function (value) {
        if (typeof value === 'string') {
          value = value.split(' ');
        }
        if (Array.isArray(value)) {
          value = value.map(v => parseFloat(v)).filter(v => !isNaN(v));

          if (value.length > 0) return value;
        }
        console.warn('Invalid arguments passed to orbits. Using default value of 1.')
        return [1];
      },
      stringify: function (value) {
        return value.join(' ');
      }
    },
    theta: {
      type: 'number',
      default: 90,
      parse: function (value) {
        return value * Math.PI / 180 // deg to rad
      }
    },
    rho: {
      type: 'number',
      default: 90,
      parse: function (value) {
        return value * Math.PI / 180 // deg to rad
      }
    },
    movementBar: {
      type: 'bool',
      default: true,
    },
    inWorldPosition: {
      type: 'vec3',
      default: null,
    },
    inWorldRotation: {
      type: 'vec3',
      default: { x: 0, y: 0, z: 0 },
      parse: function (value) {
        value.x = value.x * Math.PI / 180;
        value.y = value.y * Math.PI / 180;
        value.z = value.z * Math.PI / 180;
      }
    },
    buttonConf: {
      default: { x: 0.3, y: 0.2, transparent: true },
      parse: function (value) {
        if (!value) return this.default;

        if (typeof value === 'string') {
          value = value.split(' ');

          value[0] = parseFloat(value[0]);
          if (isNaN(value[1])) {
            console.warn('Invalid argument: expected a number for button width.')
            value[0] = this.default.x;
          }

          value[1] = parseFloat(value[1]);
          if (isNaN(value[1])) {
            console.warn('Invalid argument: expected a number for button height.')
            value[0] = this.default.x;
          }

          if (value[2]) {
            if (value[2] === 'true') { value[2] = true; }
            else if (value[2] === 'false') { value[2] = false; }
            else {
              console.warn('Invalid argument: expected boolean for button transparency.');
              value[2] = this.default.transparent;
            }
          }
          else { value[2] = this.default.transparent; }

          return { x: value[0], y: value[1], transparent: value[3] };

        }

        if (!value.x || isNaN(value.x)) {
          console.warn('Invalid argument: expected a number for button width.')
          value.x = this.default.x;
        }
        if (!value.y || isNaN(value.y)) {
          console.warn('Invalid argument: expected a number for button height.')
          value.x = this.default.x;
        }
        if (value.transparent && typeof value.transparent !== 'boolean') {
          console.warn('Invalid argument: expected boolean for button transparency.');
          value.transparent = this.default.transparent;
        }
        return { x: value.x, y: value.y, transparent: value.transparent }
      },
      stringify: function (value) {
        return `${value.x} ${value.y} ${value.transparent}`
      }
    },
    gap: {
      type: 'vec2',
      default: { x: 0.00, y: 0.00 }
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
    message: {
      default: { width: 1, height: 1, color: 'white', backgroundColor: '#232323' },
      parse: function (value) {
        if (typeof value === 'string') {
          value.split(' ');

          value[0] = parseFloat(value[0]);
          if (isNaN(value[0])) {
            console.warn('Invalid argument: expected a number for message width.');
            value[0] = this.default.width;
          }

          value[1] = parseFloat(value[1]);
          if (isNaN(value[1])) {
            console.warn('Invalid argument: expected a number for message height.');
            value[1] = this.default.height;
          }

          value[2] = value[2] || this.default.color;
          value[3] = value[3] || this.default.backgroundColor;

          return { width: value[0], height: value[1], color: value[2], backgroundColor: value[3] };
        }

        if (value.width) {
          value.width = parseFloat(value.width);
          if (isNaN(value.width)) {
            console.warn('Invalid argument: expected a number for message width.');
            value.width = this.default.width;
          }
        }
        else {
          value.width = this.default.width;
        }

        if (value.height) {
          value.height = parseFloat(value.height);
          if (isNaN(value.height)) {
            console.warn('Invalid argument: expected a number for message height.');
            value.width = this.default.height;
          }
        }
        else {
          value.height = this.default.height;
        }

        value.color = value.color || this.default.color;
        value.backgroundColor = value.backgroundColor || this.default.backgroundColor;

        return { width: value.width, height: value.height, color: value.color, backgroundColor: value.backgroundColor };
      },
      stringify: function (value) {
        return `${value.width} ${value.height} ${value.color} ${value.backgroundColor}`
      }
    },
    sideText: {
      default: { width: 1, height: 1, color: 'white', backgroundColor: '#232323' },
      parse: function (value) {
        if (typeof value === 'string') {
          value.split(' ');

          value[0] = parseFloat(value[0]);
          if (isNaN(value[0])) {
            console.warn('Invalid argument: expected a number for message width.');
            value[0] = this.default.width;
          }

          value[1] = parseFloat(value[1]);
          if (isNaN(value[1])) {
            console.warn('Invalid argument: expected a number for message height.');
            value[1] = this.default.height;
          }

          value[2] = value[2] || this.default.color;
          value[3] = value[3] || this.default.backgroundColor;

          return { width: value[0], height: value[1], color: value[2], backgroundColor: value[3] };
        }

        if (value.width) {
          value.width = parseFloat(value.width);
          if (isNaN(value.width)) {
            console.warn('Invalid argument: expected a number for message width.');
            value.width = this.default.width;
          }
        }
        else {
          value.width = this.default.width;
        }

        if (value.height) {
          value.height = parseFloat(value.height);
          if (isNaN(value.height)) {
            console.warn('Invalid argument: expected a number for message height.');
            value.width = this.default.height;
          }
        }
        else {
          value.height = this.default.height;
        }

        value.color = value.color || this.default.color;
        value.backgroundColor = value.backgroundColor || this.default.backgroundColor;

        return { width: value.width, height: value.height, color: value.color, backgroundColor: value.backgroundColor };
      },
      stringify: function (value) {
        return `${value.width} ${value.height} ${value.color} ${value.backgroundColor}`
      }
    },
    cursor: {
      default: { color: 'white', position: { x: 0, y: 0, z: -1 } },
      parse: function (value) {
        if (typeof value === 'string') {
          value.split(' ');

          value[0] = value[0] || this.default.color;

          if (isNaN(value[1])) {
            console.warn('Invalid argument: expected a number for cursor x-position');
          }
          value[1] = value[1] || this.default.x;

          if (value[2] && isNaN(value[2])) {
            console.warn('Invalid argument: expected a number for cursor y-position');
          }
          value[2] = value[2] || this.default.x;

          if (value[3] && isNaN(value[3])) {
            console.warn('Invalid argument: expected a number for cursor z-position');
          }
          value[3] = value[3] || this.default.x;

          return { color: value[0], position: { x: value[1], y: value[2], z: value[3] } }
        }

        value.color = value.color || this.default.color;

        if (value.position) {
          value.position.x = parseFloat(value.position.x);
          if (isNaN(value.position.x)) {
            console.warn('Invalid argument: expected a number for cursor x-position');
            value.position.x = this.default.x;
          }

          value.position.y = parseFloat(value.position.y);
          if (isNaN(value.position.y)) {
            console.warn('Invalid argument: expected a number for cursor y-position');
            value.position.y = this.default.y;
          }

          value.position.z = parseFloat(value.position.z);
          if (isNaN(value.position.z)) {
            console.warn('Invalid argument: expected a number for cursor z-position');
            value.position.x = this.default.z;
          }
        }
        else {
          value.position = this.default.position;
        }

        return { color: value.color, position: { x: value.position.x, y: value.position.y, z: value.position.z } }
      }
    },
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
    }
  },
  init: function () {
    const self = this;
    const data = this.data;

    this.rig = document.querySelector('#rig');
    this.camera = document.querySelector('[camera]');
    this.referencePoint = new THREE.Vector3();

    this.buttons = [];
    this.btnGeo = new THREE.PlaneGeometry(1, 1);

    // inner is used for group for vertical rotation
    this.innerGroup = document.createElement('a-entity');

    // outer group is used for horizontal rotation
    this.outerGroup = document.createElement('a-entity');
    this.outerGroup.appendChild(this.innerGroup);
    this.el.appendChild(this.outerGroup);

    // if inWorld position is not defined, use orbit mode, otherwise use world mode
    this.positioning = isNaN(data.inWorldPosition.x) ? 'orbit' : 'world';

    if (this.positioning === 'orbit') {
      this.orbitIndex = 0;
      this.radius = data.orbits[this.orbitIndex];

      this.innerGroup.object3D.rotation.x = data.rho;
      this.outerGroup.object3D.rotation.y = data.theta;

      if (typeof data.raycaster.far === 'null') {
        data.raycaster.far = this.radius;
      }
    }
    else {
      // movement bar supports only orbit mode
      data.movementBar = false;

      this.innerGroup.object3D.position.copy(data.inWorldPosition);
      this.innerGroup.object3D.rotation.copy(data.inWorldRotation);

      if (typeof data.raycaster.far === 'null') {
        data.raycaster.far = this.innerGroup.object3D.position.distanceTo(this.camera.position);
      }
    }

    if (document.querySelector('#vrInterface-cursor') === null) {
      this.cursor = document.createElement('a-entity');
      this.cursor.id = 'vrInterface-cursor';
      this.camera.appendChild(this.cursor);
    }

    this.message = document.createElement('a-entity');
    this.message.object3D.visible = false;
    this.innerGroup.appendChild(this.message);

    this.sideText = document.createElement('a-entity');
    this.sideText.object3D.visible = false;
    this.innerGroup.appendChild(this.sideText);

    if (data.border.color) {
      this.borderMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(data.border.color),
        linewidth: data.border.thickness,
      });
    }

    if (data.movementBar) {
      this.movementBar = document.createElement('a-entity');
      this.innerGroup.appendChild(this.movementBar);

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

      this.horizontalButton = makeMoveButton(
        'horizontalButton',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAABO0lEQVRYw+3WrQ7CQAwH8D3NPcAsT4CYnMSDQeM3g5snqAlCcDgMDoeZwS1BzBEIZpBAlj+CqXH9uBASxNVe90u29doGWARfxAKBBzzggV8BUUznx5ECKFIaSAsZSMABSESg4oFKAnLwAHIe6NUSUPdYYAsJwJYDRk8ZeI4Y4AAZwIEGptAAmFKAOemAkyGAJXQAlnagf9MCt74V2L1PMR+SMW9TdjZg3EAdzdgClHCI8hPI4BRZFzAXN+BiOkBYuwF12H2F3A3IPz9i5fJ8ZfkLiQuQ2AqpaA9XKRmrNqWwVmL80JbyI7Zfpo0W2BC3MbzqgGtINZSZDpjRLe2oAY5MT5w0MtBMuLa+l4E9OxeiuwTcI360rSVgLcxGc+aBs5Gmc8YDmbxglBxQKjaUAbfiDPye6AEP/C3wAjQlXixnoVFmAAAAAElFTkSuQmCC',
        -0.05,
        () => {
          self.isToChangeTheta = true;

          self.stopButton.object3D.visible = true;
          self.stopButton.object3D.position.set(
            (data.dimension.y / 2 * data.buttonSize.x + 0.06),
            0,
            0.01);
          self.stopButton.object3D.rotation.z = Math.PI / 2;
          self.stopButton.classList.add('vrInterface-button');
        }
      );

      this.verticalButton = makeMoveButton(
        'verticalButton',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAA2klEQVRYw2P4v5yBArD8P8OoAUPAAFM1igzgXfzl3UQKDGh+8h8I7hSQaUDYxf8Q8PeoJxkGmO789R8Ovq1SI9EA3tkf/qOA110kGVD54D8GuJZFtAH+p//+xwJ+77MlygC1jd//4wBfFvMSNmDim/94wJNmAgbE3/lPAFz0x2tAaCsSWAvTNA9ZNJT4lNgKMyCNzKQ8asCoAaMGjBowasCoAZQaQHHVRnHlSnH1ToUGBuVNHCo0sqjQzKO8oUmFpi4VGttUaO5T3uEY7bURacD55RSA80ADKAQAlbbCnlvwDscAAAAASUVORK5CYII=',
        -0.15,
        () => {
          self.isToChangeRho = true;

          self.stopButton.object3D.visible = true;
          self.stopButton.object3D.position.set(
            (data.dimension.y / 2 * data.buttonSize.x + 0.06),
            (-data.dimension.x + 1) * data.buttonSize.y / 2,
            0.01
          );
          self.stopButton.object3D.rotation.z = 0;
          self.stopButton.classList.add('vrInterface-button');
        }
      );

      this.stopButton = makeMoveButton(
        'stopButton',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAS1BMVEX/AAD/Li7/RUX/R0f/S0v/T0//XV3/bW3/c3P/dXX/lJT/l5f/p6f/wcH/zMz/z8//1tb/19f/4+P/5eX/7e3/9PT/9fX//f3///9m19XwAAAAx0lEQVRYw+3XyRKCMBAE0IgbQhDELf//pR5Ey5DpmUr10ZkjVf1OzJKQyAppjESNKaQYiIoOOKABx/OU19BUAad78c/P2wpAyANBBsS8LIjAO3/pfqq/AUEClvwm+3gAggCIeSiUAMgjoQBgHghrQMnLwgpQ86KQA62e/woNAq5G/iMMCHhY+UWYFOC5N/q3t4CdAXQOOPAnANtMXDvTA4UeafRQ5cc6v1j41cYvV3698wcGf+LwRxZ/5vGHpl/rDlQD9OObrBdJNVKVGSgnwAAAAABJRU5ErkJggg==',
        -0.25,
        () => {

        }
      );

      function makeMoveButton(name, img64, yPos, callback) {
        const image = new Image();
        const texture = new THREE.Texture();

        image.src = img64;
        texture.image = image;
        image.onload = () => texture.needsUpdate = true;

        const button = document.createElement('a-entity');
        button.setObject3D(name, new THREE.Mesh(
          self.btnGeo,
          new THREE.MeshBasicMaterial({ map: texture })
        ));
        button.object3D.position.y = yPos;
        button.object3D.scale.set(data.button.width * 0.1, data.button.height * 0.1);
        button.object3D.children[0].name = name;
        button.object3D.onClick = callback;
        button.classList.add('vrInterface-button');
        self.movementBar.appendChild(button);

        return button;
      }
    }
  },
  update: function () { },
  tick: function () { },
});