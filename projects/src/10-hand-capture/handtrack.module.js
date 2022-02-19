let cv;
let video, context;
let cvHasLoaded, cameraHasLoaded;
let width, height;

export default class HandTrack {
    constructor(cvObj, elId, opt) {
        if (!cvObj) {
            console.error('No openCV instance passed!')
            return;
        }

        cv = cvObj;

        let parent = document.getElementById(elId);

        if (!parent) {
            console.warn('Invalid parent id: ', elId);
            parent = document.getElementsByTagName('body')[0];
        }

        video = document.createElement('video')
        video.style.display = 'none';
        parent.appendChild(video);

        if (window.outerWidth >= window.outerHeight) {
            startVideo(video, opt)
                .then(() => {
                    width = video.videoWidth;
                    height = video.videoHeight;
                    this.start()
                });
        }
        else {
            alert('change to landscape')
            landScape().
                then(() => { startVideo(video, opt) }).
                then(() => {
                    width = video.videoWidth;
                    height = video.videoHeight;
                    // this.start()
                    calibration();
                });
        }


        let canvas = document.createElement('canvas');
        canvas.style.cssText = 'width: 100%, height: auto;'
        canvas.style.cssText += 'border: 1px solid red;'
        canvas.id = "canvasFrame";
        parent.appendChild(canvas);

        context = canvas.getContext("2d");
    }

    start(cvLoaded) {
        cvHasLoaded = cvLoaded || cvHasLoaded;

        if (cvHasLoaded && cameraHasLoaded) {
            calibration();
        }
    }


}

function calibration() {
    const FPS = 20;
    const BLACK = new cv.Scalar(0, 0, 0, 255); // helper scalar for black color
    document.getElementById('test').innerText = 'cablib'

    // Thesholds for pixel color classification
    const LOW = new cv.Mat(height, width, cv.CV_8UC3, [0, 133, 77, 0]);
    const HIGH = new cv.Mat(height, width, cv.CV_8UC3, [255, 173, 127, 255]);

    // Calibrated thresholds
    let caliLow = { cr: 133, cb: 77 }, caliHigh = { cr: 173, cb: 127 };

    const src = new cv.Mat(height, width, cv.CV_8UC4); // storages image source
    const aux = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
    const dst = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
    const mask = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
    let roi, needsNewThresholds = false;

    let rectSize = 100;
    let point1 = new cv.Point(0.5 * (width - rectSize), 0.5 * (height - rectSize));
    let point2 = new cv.Point(0.5 * (width + rectSize), 0.5 * (height + rectSize));
    let rect = new cv.Rect(point1.x, point1.y, rectSize, rectSize);

    let begin, delay; // fps helpers
    function processVideo() {
        begin = Date.now();

        context.drawImage(video, 0, 0, width, height);
        src.data.set(context.getImageData(0, 0, width, height).data);

        src.copyTo(dst);

        cv.rectangle(src, point1, point2, BLACK, 2);

        if (needsNewThresholds) {
            // classifyPixesl(dst, mask, LOW, HIGH);
            cv.cvtColor(dst, dst, cv.COLOR_RGB2YCrCb);

            dst.copyTo(mask);
            cv.inRange(mask, LOW, HIGH, mask);

            aux.setTo(BLACK);
            cv.bitwise_and(dst, dst, aux, mask);
            roi = aux.roi(rect);

            calculateNewThresholds(roi)

            cv.imshow("roi", roi);

            roi.delete();
            needsNewThresholds = false;
        }
        cv.imshow("canvasFrame", src);
        delay = 1000 / FPS - (Date.now() - begin);
        setTimeout(processVideo, delay);

    }

    function calculateNewThresholds(roi) {
        console.log(roi.type())
        let cr, cb, meanCr = 0, meanCb = 0, sdCr = 0, sdCb = 0, size = 0;
        let Cr = { low: 1000, high: 0 }, Cb = { low: 1000, high: 0 }

        for (let row = 0; row < roi.rows; row++) {
            for (let col = 0; col < roi.cols; col++) {
                cr = roi.data[row * roi.cols * roi.channels() + col * roi.channels() + 1];
                cb = roi.data[row * roi.cols * roi.channels() + col * roi.channels() + 2];

                if (cr > 0) {
                    if (cr < Cr.low) {
                        Cr.low = cr;
                    }
                    else if (cr > Cr.high) {
                        Cr.high = cr;
                    }
                }

                if (cb > 0) {
                    if (cb < Cb.low) {
                        Cb.low = cb;
                    }
                    else if (cb > Cb.high) {
                        Cb.high = cb;
                    }
                }
            }
        }

        caliLow.cr = Cr.low;
        caliLow.cb = Cb.low;
        caliHigh.cr = Cr.high;
        caliHigh.cb = Cb.high;
    }

    setTimeout(processVideo, 0);
}


async function landScape() {
    return new Promise((resolve, reject) => {
        window.addEventListener('resize', onResize)

        function onResize() {
            document.getElementById('test').innerText = "Entered";

            if (window.outerWidth >= window.innerHeight) {
                window.removeEventListener('resize', onResize);
                resolve();
                document.getElementById('test').innerText += "Changed";
                console.log('changed')
            }
        }
    })
}

async function startVideo(video, opt) {
    let stream = null; // video stream

    let askWidth = opt?.width || 360;
    let askHeight = opt?.height || 240;

    const constraints = {
        video: {
            facingMode: "environment",
            width: askWidth,
            height: askHeight
        },
        audio: false
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.play();

        return new Promise(function (resolve, reject) {
            video.addEventListener('loadeddata', function () {
                cameraHasLoaded = true;
                resolve();
            }, { once: true });
        });
    }
    catch (err) {
        console.error('Error accesing camera:', err);
        alert('Error accessing camera');
    }
}