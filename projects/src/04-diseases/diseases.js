let rendererStats, renderer, scene, camera, orbitControls, light, ambientLight, controls, gui, clock;

let heart, stroke, aneurysm, stenosis, thrombus, highlight;

const decoder = new THREE.DRACOLoader().setDecoderPath('../../libs/draco/gltf/');

const ASSETS = {
    textures: {
        helper: {
            path: '../../assets/textures/loader-helper.jpg',
            fileSize: 461 + 304 + 539 + 4282 + 3289,
        }
    },
    geometries: {
        sphereGeometry: new THREE.SphereGeometry(1, 20, 20),
    },
    materials: {
        sphereMaterial: new THREE.MeshPhongMaterial({ color: 0x0D8CFF, transparent: true, opacity: 0.5, wireframe: false })
    },
    objects: {
        heart: {
            path: '../../assets/models/diseases/heart.glb',
            fileSize: 461,
            draco: decoder // the first model needs to set the draco decoder
        },
        stroke: {
            path: '../../assets/models/diseases/stroke.glb',
            fileSize: 304,
        },
        aneurysm: {
            path: '../../assets/models/diseases/an.glb',
            fileSize: 539,
        },
        stenosis: {
            path: '../../assets/models/diseases/stenosis.glb',
            fileSize: 4282,
        },
        thrombus: {
            path: '../../assets/models/diseases/th.glb',
            fileSize: 3289,
        },
        highlight: {
            geometry: 'sphereGeometry',
            material: 'sphereMaterial',
        }
    }
};

setRenderer();

const ls = new LoadScreen(renderer, { type: 'stepped-circular', progressColor: '#447' })
    .onComplete(init)
    .start(ASSETS);

function init() {
    initStats();

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 700);
    camera.position.set(0, 0, 100);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);
    onResize();

    ambientLight = new THREE.AmbientLight(0x323232, 1);
    scene.add(ambientLight);

    light = new THREE.PointLight(0xffffff, 1.5);
    light.position.set(0, 0, 100);
    scene.add(light);

    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.minDistance = 10;
    orbitControls.maxDistance = 120;
    orbitControls.update();
    orbitControls.saveState();

    heart = ASSETS.objects.heart;
    heart.scale.set(0.5, 0.5, 0.5);
    heart.position.set(0, 0, 0);
    heart.visible = true;
    content.cardio.model = heart;
    scene.add(heart);

    stroke = ASSETS.objects.stroke;
    stroke.scale.set(0.45, 0.45, 0.45);
    stroke.position.set(0, 15, 0);
    stroke.rotation.set(0, -Math.PI / 12, 0)
    stroke.visible = false;
    content.stroke.model = stroke;
    scene.add(stroke);

    aneurysm = ASSETS.objects.aneurysm;
    aneurysm.scale.set(30, 30, 30);
    aneurysm.position.set(-30, -50, 0);
    aneurysm.visible = false;
    content.aneurysm.model = aneurysm;
    scene.add(aneurysm)

    stenosis = ASSETS.objects.stenosis;
    stenosis.scale.set(0.6, 0.6, 0.6);
    stenosis.position.set(0, -10, 0);
    stenosis.visible = false;
    content.stenosis.model = stenosis;
    scene.add(stenosis)

    thrombus = ASSETS.objects.thrombus;
    thrombus.scale.set(600, 600, 600);
    thrombus.position.set(0, -20, 0);
    thrombus.rotation.set(0, -Math.PI / 6, 0);
    thrombus.visible = false;
    content.thrombus.model = thrombus;
    scene.add(thrombus)

    highlight = ASSETS.objects.highlight;
    highlight.position.set(-3.5, -2, 7.5);
    highlight.scale.set(4.2, 4.2, 4.3);
    scene.add(highlight);

    window.addEventListener('resize', onResize);

    ls.remove(() => {
        animate();
    });
}

function animate() {
    requestAnimationFrame(animate);

    light.position.copy(camera.position);

    rendererStats.update();
    renderer.render(scene, camera);
}

function setRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xA1ACB3);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);

    document.body.appendChild(renderer.domElement);
}

function initStats() {
    rendererStats = new Stats();
    rendererStats.setMode(0); // 0: fps, 1: ms

    // Align top-left
    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '0px';
    rendererStats.domElement.style.top = '0px';
    document.getElementById('three-stats').appendChild(rendererStats.domElement);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

const content = {
    //  <a href="" target="_blank" rel="noopener external"></a> 
    cardio: {
        whatis: 'Cardiovascular diseases (CVDs) are a group of disorders of the heart and vessels, such as coronary heart disease (disease of the vessels supplying the heart) and cerebrovascular disease (disease of the vessels supplying the brain). The CVDs are the number one cause of death worldwide.',
        risk: 'The main risk factors are unhealthy diet, physical inactivity, tobacco use and harmful use of alcohol.',
        symptoms: 'Often, the first symptoms are a heart attack or a stroke. Symptoms of a heart attack include pain or discomfort in the center of the chest, arms, left shoulder, elbows, jaws, or back. The most common stroke symptom is sudden weakness of the face, arm, or leg, most often on one side of the body.',
        source: `<a href="https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)" target="_blank" rel="noopener external">WHO</a>`,
        credits: `<a href="https://3dprint.nih.gov/discover/3DPX-001549" target="_blank" rel="noopener external">3D Print
        for Health</a>`,
        highlight: {
            position: new THREE.Vector3(-3.5, -5, 7.5),
            scale: new THREE.Vector3(4.2, 4.2, 4.3),
        }
    },
    stroke: {
        whatis: 'A stroke occurs when the blood supply to part of your brain is interrupted or reduced, preventing brain tissue from getting oxygen and nutrients. Brain cells begin to die in minutes. A stroke is a medical emergency, and prompt treatment is crucial. Early action can reduce brain damage and other complications.',
        risk: 'The main risk factors are high blood pressure, or hypertension, nicotine and carbon monoxide in cigarette smoke, physical inactivity and a unhealthy diet that results in diabetes or high blood cholesterol.',
        symptoms: 'Trouble speaking and understanding what others are saying, paralysis or numbness of the face, arm or leg, problems seeing in one or both eyes, headache and trouble walking are the most common symptoms.',
        source: `<a href="https://www.nhlbi.nih.gov/health-topics/stroke" target="_blank" rel="noopener external">NHLBI</a><br/>
        <a href="https://www.stroke.org/en/about-stroke/stroke-risk-factors/stroke-risk-factors-you-can-control-treat-and-improve" target="_blank" rel="noopener external">Stroke.org</a><br/>
        <a href="https://www.mayoclinic.org/diseases-conditions/stroke/symptoms-causes/syc-20350113" target="_blank" rel="noopener external">Mayo Clinic</a>`,
        credits: `<a href="https://3dprint.nih.gov/discover/3DPX-001549" target="_blank" rel="noopener external">3D Print
        for Health</a>`,
        highlight: {
            position: new THREE.Vector3(-3.5, -2, 7.5),
            scale: new THREE.Vector3(4.2, 4.2, 4.3),
        }
    },
    aneurysm: {
        whatis: 'An aneurysm occurs when part of an artery wall weakens, allowing it to balloon out or widen abnormally.Aneurysms can occur anywhere, but the most common are: Aortic aneurysm occurs in the major artery from the heart; Cerebral aneurysm occurs in the brain; Popliteal artery aneurysm occurs in the leg behind the knee; Mesenteric artery aneurysm occurs in the intestine; Splenic artery aneurysm occurs in an artery in the spleen;',
        risk: 'SmokingHigh blood pressure (hypertension), strong family history of brain aneurysms (familial aneurysms), age (over 40), presence of an arteriovenous malformation (AVM), congenital abnormality in the artery wall, drug use, particularly cocaine ,excessive alcohol use and severe head trauma are some of the main rik factors.',
        symptoms: 'If an aneurysm expands quickly or ruptures, symptoms may develop suddenly and include: pain, clammy skin, dizziness, nausea and vomiting, rapid heart rate, shock, low blood pressure.',
        source: `<a href="https://bafound.org/about-brain-aneurysms/brain-aneurysm-basics/risk-factors/" target="_blank" rel="noopener external">Brain Aneurysm Foundantion</a><br/>
        <a href="https://www.heart.org/en/health-topics/aortic-aneurysm/what-is-an-aneurysm" target="_blank" rel="noopener external">Heart.org</a>`,
        credits: '<a href="https://sketchfab.com/3d-models/abdominal-aortic-aneurysm-e951550381ad49739a38f9ffb2370899" target="_blank" rel="noopener external">laurenwahl</a> (adapted)',
        highlight: {
            position: new THREE.Vector3(2, -12, -6),
            scale: new THREE.Vector3(10, 10, 10),
        }
    },
    stenosis: {
        whatis: 'Stenosis is an abnormal narrowing of blood vessels, arterys, or other type of opening in the body. The 3D model represents a renal artery stenosis, which may damage the kidney tissues due the lack of the correct amount of oxygen-rich blood.',
        risk: 'Risk factors of narrowed arteries from the kidneys and from other parts of the body includes:  aging, high blood pressure, diabetes, obesity, tobacco usage, family history of early heart disease, and lack of exercise.',
        symptoms: 'Often there are no symptoms of renal artery stenosis until it’s advanced, but once the disease progresses there could be high blood pressure that is hard to control, elevated levels of protein in the urine, worsening of kidneys function during treatment for high blood pressure, fluid overload and swelling in your body’s tissues, and treatment-resistant heart failure.',
        source: `<a href="https://www.mayoclinic.org/diseases-conditions/renal-artery-stenosis/symptoms-causes/syc-20352777#" target="_blank" rel="noopener external">Mayo Clinic</a><br>
        <a href="https://www.health.harvard.edu/medical-dictionary-of-health-terms/q-through-z#S-terms" target="_blank" rel="noopener external">Harvad Health</a> `,
        credits: `<a href="https://sketchfab.com/3d-models/transplant-renal-artery-stenosis-d296be9d273d452db34ef651befd4e6d" target="_blank" rel="noopener external">tl0615</a> (adapted)`,
        highlight: {
            position: new THREE.Vector3(1, -5, 3),
            scale: new THREE.Vector3(2, 2, 2),
        }
    },
    thrombus: {
        whatis: 'Deep vein thrombosis (DVT) occurs when a blood clot (thrombus) forms in one or more of the deep veins in your body, usually in your legs. Deep vein thrombosis can cause leg pain or swelling, but also can occur with no symptoms.',
        risk: 'Deep vein thrombosis can develop if you have certain medical conditions that affect how your blood clots. It can also happen if you don\'t move for a long time, such as after surgery or an accident, or when you\'re confined to bed.',
        symptoms: 'Deep vein thrombosis signs and symptoms can include:Swelling in the affected leg. Rarely, there\'s swelling in both legs, pain in the leg( the pain often starts in your calf and can feel like cramping or soreness), red or discolored skin on the leg, a feeling of warmth in the affected leg.Deep vein thrombosis can occur without noticeable symptoms.',
        source: `<a href="https://www.mayoclinic.org/diseases-conditions/deep-vein-thrombosis/symptoms-causes/syc-20352557#:~:text=Blood%20clot%20in%20leg%20vein,-A%20blood%20clot&text=Deep%20vein%20thrombosis%20(DVT)%20occurs,can%20occur%20with%20no%20symptoms" target="_blank" rel="noopener external">Mayo Clinic</a><br>
        <a href="https://natfonline.org/patients/what-is-thrombosis/" target="_blank" rel="noopener external">NAFT</a>`,
        credits: '<a href="https://sketchfab.com/3d-models/thrombus-left-atrial-appendage-d552d0f38eb74e46837c718fede257f0" target="_blank" rel="noopener external">tl0615</a> (adapted)',
        highlight: {
            position: new THREE.Vector3(5, -8, 18.5),
            scale: new THREE.Vector3(11, 11, 11),
        }
    },
}

function changeContent() {
    let value = document.querySelector('#selector').value;
    let object = content[value];

    document.querySelector('#whatis').innerHTML = object.whatis;
    document.querySelector('#risk').innerHTML = object.risk;
    document.querySelector('#symptoms').innerHTML = object.symptoms;
    document.querySelector('#source').innerHTML = object.source;
    document.querySelector('#credits').innerHTML = object.credits;

    heart.visible = false;
    stroke.visible = false;
    aneurysm.visible = false;
    stenosis.visible = false;
    thrombus.visible = false;

    orbitControls.reset();

    highlight.position.copy(object.highlight.position);
    highlight.scale.copy(object.highlight.scale);

    object.model.visible = true;
}

function toggleHighlight() {
    highlight.visible = !highlight.visible;
}