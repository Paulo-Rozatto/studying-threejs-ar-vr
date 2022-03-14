const model = handPoseDetection.SupportedModels.MediaPipeHands;
const detectorConfig = {
    runtime: 'mediapipe', // or 'tfjs'
    modelType: 'lite',
    maxHands: 1,
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
};
const detector = await handPoseDetection.createDetector(model, detectorConfig);

const video = document.getElementById('video');
await startVideo(video);
video.width = video.videoWidth;
video.height = video.videoHeight;

const canvas = document.getElementById('output');
canvas.width = video.width;
canvas.height = video.height;

const ctx = canvas.getContext("2d");
ctx.lineWidth = 3;
ctx.fillStyle = 'White';
ctx.strokeStyle = 'Red';

const radius = 3;

const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20]
];

let stopVideo = false;
let stats;

let hands;

initStats();

const FPS = 10;
let begin = 0;

export async function render() {
    // if (Date.now() - begin < 1000 / FPS){
    //     console.log('nope')
    //     return;}

    // begin = Date.now();

    // let begin = Date.now();
    ctx.drawImage(video, 0, 0)

    stats.update();

    const hands = (await detector.estimateHands(video, { flipHorizontal: false }))[0];

    if (hands) {
        for (const conn of connections) {
            const kp1 = hands.keypoints[conn[0]]
            const kp2 = hands.keypoints[conn[1]]

            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.stroke();
        }

        for (const kp of hands.keypoints) {
            const circle = new Path2D();
            circle.arc(kp.x, kp.y, radius, 0, 2 * Math.PI);
            ctx.fill(circle);
            // ctx.stroke(circle);
        }
    }

    if (stopVideo) {
        console.log(hands)
    }
    else {
        // let delay = 1000 / FPS - (Date.now() - begin);
        // setTimeout(render, delay);
        // setTimeout(() => { requestAnimationFrame(render) }, delay)
        // requestAnimationFrame(render);
    }
}
// render();
// estimate();

window.addEventListener('keydown', (e) => {
    if (e.key === 'e') {
        stopVideo = true;
    }

    else if (e.key == 'g') {
        if (stopVideo) {
            stopVideo = false;
            render();
            // estimate();
        }
    }
})


async function startVideo(video) {
    let stream; // video stream

    const constraints = {
        video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 }
        },
        audio: false
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.play();

        return new Promise(function (resolve, reject) {
            video.addEventListener('loadedmetadata', function (e) {
                resolve();
            });
        });
    }
    catch (err) {
        console.error('Error accesing camera:', err);
        alert('Error accessing camera')
    }
}

function initStats() {
    stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms

    // Align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

}