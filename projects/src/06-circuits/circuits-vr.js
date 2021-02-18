class Component {
    constructor(model) {
        this.schema = {
            model: { type: 'string', default: model || 'wire' },
            pos: { type: 'vec2', default: { x: -1, y: -1 } }
        }
    }

    init() {
        this.el.setAttribute('gltf-model', '#' + this.data.model + 'Model');

        if (this.data.pos.x === -1 || this.data.pos.y === -1) {
            console.error('No position was defined for ' + this.data.model);
        }

        this.el.addEventListener('load', () => console.log('hey'))

        this.el.object3D.next = this.next;
        this.el.object3D.canConnect = this.canConnect;
    }

    next(prevPos) {
        const rotation = this.el.object3D.rotation.y;
        const pos = this.data.pos;

        if (rotation === 0 || rotation === -Math.PI) {
            // if the prev comes from the left, the next is by the right and vice-versa
            if (pos.x - 1 === prevPos.x) return { x: pos.x + 1, y: pos.y };
            else if (pos.x + 1 === prevPos.x) return { x: pos.x - 1, y: pos.y };
            else {
                console.error('Invalid previous position');
                return { x: -1, y: -1 };
            }
        }

        // if the prev comes from the bottom, the next is up and vice-versa
        if (pos.y - 1 === prevPos.y) return { x: pos.x, y: pos.y + 1 };
        else if (pos.y + 1 === prevPos.y) return { x: pos.x - 1, y: pos.y - 1 };
        else {
            console.error('Invalid previous position');
            return { x: -1, y: -1 };
        }
    }

    canConnect(prevPos) {
        const rotation = this.el.object3D.rotation.y;
        const pos = this.data.pos;

        if (rotation === 0 || rotation === -Math.PI) {
            if (pos.x - 1 === prevPos.x && pos.y === prevPos.y) return true;
            if (pos.x + 1 === prevPos.x && pos.y === prevPos.y) return true;
            return false;
        }

        if (pos.x === prevPos.x && pos.y - 1 === prevPos.y) return true;
        if (pos.x === prevPos.x && pos.y + 1 === prevPos.y) return true;
        return false;
    }
}

const wireComponent = new Component();
AFRAME.registerComponent('wire', {
    schema: wireComponent.schema,
    init: wireComponent.init,
    next: wireComponent.next,
    canConnect: wireComponent.canConnect
});


// extending wire component
const batteryComp = { ...wireComponent };
// batteryComp.schema.model.default = '#batteryModel';
batteryComp.init = function () {
    this.el.setAttribute('gltf-model', this.data.model);

    if (this.data.pos.x === -1 || this.data.pos.y === -1) {
        console.error('No position defined for battery');
    }

    this.el.object3D.next = this.next;
    this.el.object3D.next = this.canConnect;
}
AFRAME.registerComponent('battery', batteryComp);


function newBlock(model, position) {
    let block = document.createElement('a-entity');
    block.setAttribute(model, { pos: position })
    return block;

}