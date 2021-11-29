/**
 * Get ASCII table code of a given character
 * Use character in uppercase
 *
 * @param {char} ch
 * @returns ASCII code of the caracter
 */

function getCode(ch)
{
  var code = ch.charCodeAt(0);
  return code;
}

/**
 * Convert degrees to radians
 */
function degreesToRadians(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}

/**
 * Format output to show 'num' number with 'decimalPlaces' decimal places
 */
function formatOutput(num, decimalPlaces)
{
  return (Math.round(num * 100) / 100).toFixed(decimalPlaces);
}


/**
 Compute the max size acording to XYZ axes
 Return the maxSzie
*/
function getMaxSize(obj)
{
  var maxSize;
  var box = new THREE.Box3().setFromObject( obj );
  var min = box.min;
  var max = box.max;

  var size = new THREE.Box3();
  size.x = max.x - min.x;
  size.y = max.y - min.y;
  size.z = max.z - min.z;

  if(size.x >= size.y && size.x >= size.z)
    maxSize = size.x;
  else {
    if(size.y >= size.z )
      maxSize = size.y;
    else {
      maxSize = size.z;
    }
  }
  return maxSize;
}

/**
  * ...
  *
  */
class SecondaryBox
{
  constructor(defaultText) {
    this.box = document.createElement('div');
    this.box.id = "box";
    this.box.style.padding = "6px 14px";
    this.box.style.bottom = "0";
    this.box.style.left= "0";
    this.box.style.position = "fixed";
    this.box.style.backgroundColor = "rgba(100,100,255,0.3)";
    this.box.style.color = "white";
    this.box.style.fontFamily = "sans-serif";
    this.box.style.fontSize = "26px";

    this.textnode = document.createTextNode(defaultText);
    this.box.appendChild(this.textnode);
    document.body.appendChild(this.box);
  }
  changeMessage(newText) {
    this.textnode.nodeValue = newText;
  }
}


/**
  * Class box - show information onscreen
  *
  */
class InfoBox {
  constructor() {
    this.infoBox = document.createElement('div');
    this.infoBox.id = "InfoxBox";
    this.infoBox.style.padding = "6px 14px";
    this.infoBox.style.position = "fixed";
    this.infoBox.style.bottom = "0";
    this.infoBox.style.right = "0";
    this.infoBox.style.backgroundColor = "rgba(255,255,255,0.2)";
    this.infoBox.style.color = "white";
    this.infoBox.style.fontFamily = "sans-serif";
    this.infoBox.style.userSelect = "none";
    this.infoBox.style.textAlign = "left";
  }

  addParagraph() {
    const paragraph = document.createElement("br")
    this.infoBox.appendChild(paragraph);              ;
  }

  add(text) {
    var textnode = document.createTextNode(text);
    this.infoBox.appendChild(textnode);
    this.addParagraph();
  }

  show() {
    document.body.appendChild(this.infoBox);
  }
}

/**
 * Makes a definite light follows the camera
 */
function lightFollowingCamera(light, camera)
{
  light.position.copy( camera.position );
}


/**
 * Fix camera and renderer when window size changes
 */
function onWindowResize(camera, renderer){

    if (camera instanceof THREE.PerspectiveCamera)
    {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize( window.innerWidth, window.innerHeight );
    }
    else {
      // TODO for other cameras
    }
}

/**
 * Initialize the statistics domelement
 * 
 * @param {Number} type 0: fps, 1: ms, 2: mb, 3+: custom
 * @returns stats javascript object
 */
function initStats(type) {

    var panelType = (typeof type !== 'undefined' && type) && (!isNaN(type)) ? parseInt(type) : 0;
    var stats = new Stats();

    stats.showPanel(panelType); // 0: fps, 1: ms, 2: mb, 3+: custom
    //document.getElementById("status-output").appendChild(stats.dom);
    document.body.appendChild(stats.dom);

    return stats;
}

/**
 * Initialize a simple default renderer and binds it to the "webgl-output" dom
* element.
 * 
 * @param additionalProperties Additional properties to pass into the renderer
 */
function initRenderer(additionalProperties) {

    var renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    //var renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.setClearColor(new THREE.Color(0x000000));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById("webgl-output").appendChild(renderer.domElement);

    return renderer;
}

/**
 * Initialize a simple default canvas renderer.
 * 
 */
function initCanvasRenderer() {

    var canvasRenderer = new THREE.CanvasRenderer();
    canvasRenderer.setClearColor(new THREE.Color(0x000000));
    canvasRenderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("webgl-output").appendChild(canvasRenderer.domElement);

    return canvasRenderer;
}

/**
 * Initialize a simple camera and point it at the center of a scene
 * 
 * @param {THREE.Vector3} [initialPosition]
 */
function initCamera(initialPosition) {
    var position = (initialPosition !== undefined) ? initialPosition : new THREE.Vector3(-30, 40, 30);

    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(position);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    return camera;
}

function initDefaultLighting(scene, initialPosition) {
    var position = (initialPosition !== undefined) ? initialPosition : new THREE.Vector3(-10, 30, 40);
    
    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.copy(position);
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    spotLight.shadow.camera.fov = 15;
    spotLight.castShadow = true;
    spotLight.decay = 2;
    spotLight.penumbra = 0.05;
    spotLight.name = "spotLight"

    scene.add(spotLight);

    var ambientLight = new THREE.AmbientLight(0x343434);
    ambientLight.name = "ambientLight";
    scene.add(ambientLight);
    
}

function initDefaultDirectionalLighting(scene, initialPosition) {
    var position = (initialPosition !== undefined) ? initialPosition : new THREE.Vector3(100, 200, 200);
    
    var dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.copy(position);
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.castShadow = true;

    dirLight.shadow.camera.left = -200;
    dirLight.shadow.camera.right = 200;
    dirLight.shadow.camera.top = 200;
    dirLight.shadow.camera.bottom = -200;

    scene.add(dirLight);

    var ambientLight = new THREE.AmbientLight(0x343434);
    ambientLight.name = "ambientLight";
    scene.add(ambientLight);
    
}

/**
 * Initialize trackball controls to control the scene
 * 
 * @param {THREE.Camera} camera 
 * @param {THREE.Renderer} renderer 
 */
function initTrackballControls(camera, renderer) {
    var trackballControls = new THREE.TrackballControls(camera, renderer.domElement);
    trackballControls.rotateSpeed = 1.0;
    trackballControls.zoomSpeed = 1.2;
    trackballControls.panSpeed = 0.8;
    trackballControls.noZoom = false;
    trackballControls.noPan = false;
    trackballControls.staticMoving = true;
    trackballControls.dynamicDampingFactor = 0.3;
    trackballControls.keys = [65, 83, 68];

    return trackballControls;
}

/**
 * Apply a simple standard material to the passed in geometry and return the mesh
 * 
 * @param {*} geometry 
 * @param {*} material if provided use this meshnormal material instead of creating a new material 
 *                     this material will only be used if it is a meshnormal material.
 */
var applyMeshStandardMaterial = function(geometry, material) {
    if (!material || material.type !== "MeshStandardMaterial")  {
        var material = new THREE.MeshStandardMaterial({color: 0xff0000})
        material.side = THREE.DoubleSide;
    } 

    return new THREE.Mesh(geometry, material)
}

/**
 * Apply meshnormal material to the geometry, optionally specifying whether
 * we want to see a wireframe as well.
 * 
 * @param {*} geometry 
 * @param {*} material if provided use this meshnormal material instead of creating a new material 
 *                     this material will only be used if it is a meshnormal material.
 */
var applyMeshNormalMaterial = function(geometry, material) {
    if (!material || material.type !== "MeshNormalMaterial")  {
        material = new THREE.MeshNormalMaterial();
        material.side = THREE.DoubleSide;
    } 
    
    return new THREE.Mesh(geometry, material)
}

function addGeometry(scene, geom, name, texture, gui, controls) {
  var mat = new THREE.MeshStandardMaterial(
    {
      map: texture,
      metalness: 0.2,
      roughness: 0.07
  });
  var mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  
  scene.add(mesh);
  addBasicMaterialSettings(gui, controls, mat, name + '-THREE.Material');
  addSpecificMaterialSettings(gui, controls, mat, name + '-THREE.MeshStandardMaterial');

  return mesh;
};

function addGeometryWithMaterial(scene, geom, name, gui, controls, material) {
  var mesh = new THREE.Mesh(geom, material);
  mesh.castShadow = true;
  
  scene.add(mesh);
  //addBasicMaterialSettings(gui, controls, material, name + '-THREE.Material');
  //addSpecificMaterialSettings(gui, controls, material, name + '-Material');

  return mesh;
};

/**
 * Add a simple cube and sphere to the provided scene
 * 
 * @param {THREE.Scene} scene 
 */
function addDefaultCubeAndSphere(scene) {

    // create a cube
    var cubeGeometry = new THREE.BoxGeometry(4, 4, 4);
    var cubeMaterial = new THREE.MeshLambertMaterial({
        color: 0xff0000
    });
    var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.castShadow = true;

    // position the cube
    cube.position.x = -4;
    cube.position.y = 3;
    cube.position.z = 0;

    // add the cube to the scene
    scene.add(cube);

    var sphereGeometry = new THREE.SphereGeometry(4, 20, 20);
    var sphereMaterial = new THREE.MeshLambertMaterial({
        color: 0x7777ff
    });
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    // position the sphere
    sphere.position.x = 20;
    sphere.position.y = 0;
    sphere.position.z = 2;
    sphere.castShadow = true;

    // add the sphere to the scene
    scene.add(sphere);

    return {
        cube: cube,
        sphere: sphere
    };
}

/**
 * Add a simple ground plance to the provided scene
 * 
 * @param {THREE.Scene} scene 
 */
function addGroundPlane(scene) {
    // create the ground plane
    var planeGeometry = new THREE.PlaneGeometry(60, 20, 120, 120);
    var planeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff
    });
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;

    // rotate and position the plane
    plane.rotation.x = -0.5 * Math.PI;
    plane.position.x = 15;
    plane.position.y = 0;
    plane.position.z = 0;

    scene.add(plane);

    return plane;
}

/**
 * Add a small and simple ground plane
 */
function createGroundPlane(width, height) {
    // create the ground plane
    var planeGeometry = new THREE.PlaneGeometry(width, height, 10, 10);
    var planeMaterial = new THREE.MeshPhongMaterial({color:"rgb(200,200,200)", side:THREE.DoubleSide});
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;

    return plane;
}


/**
 * Add a simple ground plance to the provided scene
 * 
 * @param {THREE.Scene} scene 
 */
function addLargeGroundPlane(scene, useTexture) {

    var withTexture = (useTexture !== undefined) ? useTexture : false;

    // create the ground plane
    var planeGeometry = new THREE.PlaneGeometry(10000, 10000);
    var planeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff
    });
    if (withTexture) {
        var textureLoader = new THREE.TextureLoader();
        planeMaterial.map = textureLoader.load("../../assets/textures/general/floor-wood.jpg");
        planeMaterial.map.wrapS = THREE.RepeatWrapping; 
        planeMaterial.map.wrapT = THREE.RepeatWrapping; 
        planeMaterial.map.repeat.set(80,80)
    }
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;

    // rotate and position the plane
    plane.rotation.x = -0.5 * Math.PI;
    plane.position.x = 0;
    plane.position.y = 0;
    plane.position.z = 0;

    scene.add(plane);

    return plane;
}

function createGroundPlane(scene) {
    // create the ground plane
    var planeGeometry = new THREE.PlaneGeometry(70, 50);
    var planeMaterial = new THREE.MeshPhongMaterial({
        color: 0x9acd32
    });
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;

    // rotate and position the plane
    plane.rotation.x = -0.5 * Math.PI;
    plane.position.x = 15;
    plane.position.y = 0;
    plane.position.z = 0;

    scene.add(plane)
}

/**
 * Add a small and simple ground plane
 */
function createGroundPlane(width, height) {
    // create the ground plane
    var planeGeometry = new THREE.PlaneGeometry(width, height, 10, 10);
    var planeMaterial = new THREE.MeshPhongMaterial({color:"rgb(200,200,200)", side:THREE.DoubleSide});
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;

    return plane;
}


/**
 * Add a folder to the gui containing the basic material properties.
 * 
 * @param gui the gui to add to
 * @param controls the current controls object
 * @param material the material to control
 * @param geometry the geometry we're working with
 * @param name optionally the name to assign to the folder
 */
function addBasicMaterialSettings(gui, controls, material, name) {

    var folderName = (name !== undefined) ? name : 'THREE.Material';

    controls.material = material;

    var folder = gui.addFolder(folderName);
    folder.add(controls.material, 'id');
    folder.add(controls.material, 'uuid');
    folder.add(controls.material, 'name');
    folder.add(controls.material, 'opacity', 0, 1, 0.01);
    folder.add(controls.material, 'transparent');
    folder.add(controls.material, 'overdraw', 0, 1, 0.01);
    folder.add(controls.material, 'visible');
    folder.add(controls.material, 'side', {FrontSide: 0, BackSide: 1, BothSides: 2}).onChange(function (side) {
        controls.material.side = parseInt(side)
    });

    folder.add(controls.material, 'colorWrite');
    folder.add(controls.material, 'flatShading').onChange(function(shading) {
        controls.material.flatShading = shading;
        controls.material.needsUpdate = true;
    });
    folder.add(controls.material, 'premultipliedAlpha');
    folder.add(controls.material, 'dithering');
    folder.add(controls.material, 'shadowSide', {FrontSide: 0, BackSide: 1, BothSides: 2});
    folder.add(controls.material, 'vertexColors', {NoColors: THREE.NoColors, FaceColors: THREE.FaceColors, VertexColors: THREE.VertexColors}).onChange(function (vertexColors) {
        material.vertexColors = parseInt(vertexColors);
    });
    folder.add(controls.material, 'fog');

    return folder;
}

function addSpecificMaterialSettings(gui, controls, material, name) {
    controls.material = material;
    
    var folderName = (name !== undefined) ? name : 'THREE.' + material.type;
    var folder = gui.addFolder(folderName);
    switch (material.type) {
        case "MeshNormalMaterial":
            folder.add(controls.material,'wireframe');
            return folder;

        case "MeshPhongMaterial":
            controls.specular = material.specular.getStyle();
            folder.addColor(controls, 'specular').onChange(function (e) {
                material.specular.setStyle(e)
            });
            folder.add(material, 'shininess', 0, 100, 0.01);
            return folder;            
            
        case "MeshStandardMaterial":
            controls.color = material.color.getStyle();
            folder.addColor(controls, 'color').onChange(function (e) {
                material.color.setStyle(e)
            });
            controls.emissive = material.emissive.getStyle();
            folder.addColor(controls, 'emissive').onChange(function (e) {
                material.emissive.setStyle(e)                
            });
            folder.add(material, 'metalness', 0, 1, 0.01);
            folder.add(material, 'roughness', 0, 1, 0.01);
            folder.add(material, 'wireframe');

            return folder;
    }
}

function redrawGeometryAndUpdateUI(gui, scene, controls, geomFunction) {
    guiRemoveFolder(gui, controls.specificMaterialFolder);
    guiRemoveFolder(gui, controls.currentMaterialFolder);
    if (controls.mesh) scene.remove(controls.mesh);
    var changeMat = eval("(" + controls.appliedMaterial + ")");
    if (controls.mesh) {
        controls.mesh = changeMat(geomFunction(), controls.mesh.material);
    } else {
        controls.mesh = changeMat(geomFunction());
    }
    
    controls.mesh.castShadow = controls.castShadow;
    scene.add(controls.mesh)
    controls.currentMaterialFolder = addBasicMaterialSettings(gui, controls, controls.mesh.material);
    controls.specificMaterialFolder = addSpecificMaterialSettings(gui, controls, controls.mesh.material);
  }

/**
 * Remove a folder from the dat.gui
 * 
 * @param {*} gui 
 * @param {*} folder 
 */
function guiRemoveFolder(gui, folder) {
    if (folder && folder.name && gui.__folders[folder.name]) {
        gui.__folders[folder.name].close();
        gui.__folders[folder.name].domElement.parentNode.parentNode.removeChild(gui.__folders[folder.name].domElement.parentNode);
        delete gui.__folders[folder.name];
        gui.onResize();
    }
}

function setMaterialGroup(material, group) {
    if (group instanceof THREE.Mesh) {
        group.material = material;        
    } else if (group instanceof THREE.Group) {
        group.children.forEach(function(child) {setMaterialGroup(material, child)});
    }
}

function computeNormalsGroup(group) {
    if (group instanceof THREE.Mesh) {
        var tempGeom = new THREE.Geometry();
        tempGeom.fromBufferGeometry(group.geometry)
        tempGeom.computeFaceNormals();
        tempGeom.mergeVertices();
        tempGeom.computeVertexNormals();

        tempGeom.normalsNeedUpdate = true;
        
        // group = new THREE.BufferGeometry();
        // group.fromGeometry(tempGeom);
        group.geometry = tempGeom;

    } else if (group instanceof THREE.Group) {
        group.children.forEach(function(child) {computeNormalsGroup(child)});
    }
}
