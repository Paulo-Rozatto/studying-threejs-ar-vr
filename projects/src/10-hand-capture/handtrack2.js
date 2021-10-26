// variables to know when both opencv and camera loaded
let cvHasLoaded = false,
    cameraHasLoaded = false;

// canvas context and video
const context = document.getElementById("canvasFrame").getContext("2d");
const video = document.getElementById("videoInput");

// start video and get its properties
let width, height;

startVideo(video)
    .then((value) => {
        width = value.width;
        height = value.height;
        start({ camera: true })
    });

// let isReturn = false;
// window.addEventListener('keydown', () => { isReturn = true })

function start(info) {
    cvHasLoaded = cvHasLoaded || info.cv;
    cameraHasLoaded = cameraHasLoaded || info.camera;

    if (cvHasLoaded && cameraHasLoaded) {
        calibration();
    }
}

function calibration() {
    const FPS = 20;
    const BLACK = new cv.Scalar(0, 0, 0, 255); // helper scalar for black color

    // Thesholds for pixel color classification
    const LOW = new cv.Mat(height, width, cv.CV_8UC3, [0, 133, 77, 0]);
    const HIGH = new cv.Mat(height, width, cv.CV_8UC3, [255, 173, 127, 255]);

    // Calibrated thresholds
    let caliLow = { cr: 0, cb: 0 }, caliHigh = { cr: 0, cb: 0 };

    const src = new cv.Mat(height, width, cv.CV_8UC4); // storages image source
    const aux = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
    const dst = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
    const mask = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
    let roi;

    let rectSize = 100;
    let point1 = new cv.Point(0.5 * (width - rectSize), 0.5 * (height - rectSize));
    let point2 = new cv.Point(0.5 * (width + rectSize), 0.5 * (height + rectSize));
    let rect = new cv.Rect(point1.x, point1.y, rectSize, rectSize);
    // let centerRect = new cv.Rect(0.5 * (width - rectSize), 0.5 * (height - rectSize), 0.5 * (width + rectSize), 0.5 * (height + rectSize));

    let begin, delay; // fps helpers
    function processVideo() {
        begin = Date.now();

        context.drawImage(video, 0, 0, width, height);
        src.data.set(context.getImageData(0, 0, width, height).data);

        src.copyTo(dst);

        cv.rectangle(src, point1, point2, BLACK, 2);

        // classifyPixesl(dst, mask, LOW, HIGH);
        cv.cvtColor(dst, dst, cv.COLOR_RGB2YCrCb);

        dst.copyTo(mask);
        cv.inRange(mask, LOW, HIGH, mask);

        aux.setTo(BLACK);
        cv.bitwise_and(dst, dst, aux, mask);
        roi = aux.roi(rect);

        calculateNewThresholds(roi)

        // src.copyTo(dst);
        // cv.inRange(roi,LOW, HIGH, roi);
        // cv.cvtColor(roi, roi, cv.COLOR_RGB2GRAY);

        // dst.copyTo(src.rowRange(0, 100).colRange(0, 100));
        // cv.addWeighted(roi, 1, roi, 0, 0.0, dst, -1)

        // dst = dst.rowRange(1, rectSize).colRange(1, rectSize)

        // for (let row = point1.x + 1; row < point2.x; row++) {
        //     for (let col = point1.y; col < point2.y - 1; col++) {
        //         dst.data[(row - 60) * src.cols * src.channels() + (col + 60) * src.channels()] = roiMask.data[(row - point1.x) * roiMask.cols * roiMask.channels() + (col - point2.y) * roiMask.channels()];
        //         dst.data[(row - 60) * src.cols * src.channels() + (col + 60) * src.channels() + 1] = roiMask.data[(row - point1.x) * roiMask.cols * roiMask.channels() + (col - point2.y) * roiMask.channels() + 1];
        //         dst.data[(row - 60) * src.cols * src.channels() + (col + 60) * src.channels() + 2] = roiMask.data[(row - point1.x) * roiMask.cols * roiMask.channels() + (col - point2.y) * roiMask.channels() + 2];
        //         // src.data[row * src.cols * src.channels() + col * src.channels() + 3] = roi.data[(row - point1.x) * roi.cols * roi.channels() + (col - point2.y) * roi.channels() + 3];
        //     }
        // }

        cv.imshow("canvasFrame", src);
        cv.imshow("roi", roi);

        roi.delete();
        // delay = 1000 / FPS - (Date.now() - begin);
        // setTimeout(processVideo, delay);

    }

    function calculateNewThresholds(roi) {
        console.log(roi.type())
        let cr, cb, meanCr = 0, meanCb = 0, sdCr = 0, sdCb = 0, size = 0;


        for (let row = 0; row < roi.rows; row++) {
            for (let col = 0; col < roi.cols; col++) {
                cr = roi.data[row * roi.cols * roi.channels() + col * roi.channels() + 1];
                cb = roi.data[row * roi.cols * roi.channels() + col * roi.channels() + 2];

                if (cr > 0 || cb > 0) {
                    meanCr += cr;
                    meanCb += cb;
                    size += 1;
                }
            }
        }
        meanCr /= size;
        meanCb /= size;

        console.log('Means: ', meanCr, meanCb);

        for (let row = 0; row < roi.rows; row++) {
            for (let col = 0; col < roi.cols; col++) {
                cr = roi.data[row * roi.cols * roi.channels() + col * roi.channels() + 1];
                cb = roi.data[row * roi.cols * roi.channels() + col * roi.channels() + 2];

                if (cr > 0 || cb > 0) {
                    sdCr += (cr - meanCr) * (cr - meanCr);
                    sdCb += (cb - meanCb) * (cb - meanCb);
                }
            }
        }
        sdCr = Math.sqrt(sdCr / size);
        sdCb = Math.sqrt(sdCb / size);

        console.log('SD: ', sdCr, sdCb);

        sdCb *= 1.5;
        sdCr *= 1.5;

        caliLow.cr = meanCr - sdCr;
        caliLow.cb = meanCb - sdCb;
        caliHigh.cr = meanCr + sdCr;
        caliHigh.cb = meanCb + sdCb;

        // let low = [0, meanCr - sdCr, meanCb - sdCb, 0];
        // let high = [255, meanCr + sdCr, meanCb + sdCb, 255];
        // console.log('T: ', low, high);

    }
    window.addEventListener('keydown', (e) => {
        if (e.key === '1') {
            src.delete(); aux.delete(); dst.delete(); mask.delete();
            setTimeout(() => {
                main(caliLow, caliHigh);
            }, 0);
        }
        else
            processVideo();
    })

    document.getElementById('btn1').addEventListener('click', () => {
        processVideo();
    });
    document.getElementById('btn2').addEventListener('click', () => {
        src.delete(); aux.delete(); dst.delete(); mask.delete();
        setTimeout(() => {
            main(caliLow, caliHigh);
        }, 0);
    });

    // setTimeout(processVideo, 0);
    processVideo();

}

function main(low, high) {
    // -- Constants -- //
    const FPS = 24;
    const BLACK = new cv.Scalar(0, 0, 0, 255); // helper scalar for black color
    const RED = new cv.Scalar(255, 0, 0); // helper scalar for red color

    // Thesholds for pixel color classification
    const LOW = new cv.Mat(height, width, cv.CV_8UC3, [0, low.cr, low.cb, 0]);
    const HIGH = new cv.Mat(height, width, cv.CV_8UC3, [255, high.cr, high.cb, 255]);

    // Minimum occupied area threshold
    const MIN_AREA = height * width * 0.05;

    // Minimum number of feature points
    const MIN_FEATURES = 20;

    // --------------- //

    // Video manipulation variables
    const src = new cv.Mat(height, width, cv.CV_8UC4); // storages image source
    const dst = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
    const binaryMask = new cv.Mat(height, width, 0);
    const rectMask = new cv.Mat(height, width, 0);
    const aux = new cv.Mat(height, width, cv.CV_8UC4); // helper mat - rename it
    const grayFrame = new cv.Mat(height, width, cv.CV_8UC4);
    const oldFrame = new cv.Mat(height, width, cv.CV_8UC4); // helper mat - rename it
    const mask = new cv.Mat(height, width, cv.CV_8UC4, BLACK); // helper mat

    // Contourns variables - https://docs.opencv.org/3.4.15/d5/daa/tutorial_js_contours_begin.html
    const contours = new cv.MatVector(); //storages contours
    const hierarchy = new cv.Mat(); // stores hierarchy
    const contourArea = { id: -1, value: 0 } // stores the larger contourn and its id

    // features variables - https://docs.opencv.org/3.4/dd/d1a/group__imgproc__feature.html#ga1d6bb77486c8f92d79c8793ad995d541
    let [maxCorners, qualityLevel, minDistance, blockSize] = [50, 0.2, 15, 10];
    let features = new cv.Mat();
    let hasFeatures = false;

    // optical flow variables - https://docs.opencv.org/3.4/dc/d6b/group__video__track.html#ga473e4b886d0bcc6b65831eb88ed93323
    let features2 = new cv.Mat(); // -rename it
    let winSize = new cv.Size(15, 15);
    let maxLevel = 2;
    let criteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.03);
    let stats = new cv.Mat();
    let err = new cv.Mat()
    let goodNew = [];
    let goodOld = [];

    // hull variables -
    const fingerTips = [];
    let numbFingers = 0;

    let center;
    let p1 = new cv.Point(0, 0);
    let p2 = new cv.Point(0, 0);
    let info = document.querySelector('#info');

    // colors for drawing points
    const colors = [];
    for (let i = 0; i < maxCorners; i++) {
        colors.push(new cv.Scalar(parseInt(Math.random() * 255), parseInt(Math.random() * 255), parseInt(Math.random() * 255), 255));
    }

    let begin, delay; // fps helpers
    function processVideo() {
        begin = Date.now();

        context.drawImage(video, 0, 0, width, height);
        src.data.set(context.getImageData(0, 0, width, height).data);

        classifyPixesl(src, aux, LOW, HIGH);

        findBiggestArea(aux, contours, contourArea)

        if (contourArea.value < MIN_AREA) {
            hasFeatures = false;
            dst.setTo(BLACK);
        }
        else {
            dst.setTo(BLACK)
            detachForeground(src, dst, contours, contourArea.id);

            // let po = contours.get(contourArea.id).row(0).data32S;

            cv.cvtColor(dst, grayFrame, cv.COLOR_RGB2GRAY);

            if (!hasFeatures) {
                cv.imshow("roi", binaryMask);

                cv.goodFeaturesToTrack(grayFrame, features, maxCorners, qualityLevel, minDistance, binaryMask);

                center = cv.minEnclosingCircle(contours.get(contourArea.id)).center;

                if (features.rows >= MIN_FEATURES) {
                    hasFeatures = true;
                    mask.setTo(BLACK);
                    grayFrame.copyTo(oldFrame);
                }
            }
            else {
                cv.calcOpticalFlowPyrLK(oldFrame, grayFrame, features, features2, stats, err, winSize, maxLevel, criteria);

                goodNew.length = 0;
                goodOld.length = 0;
                let avx = 0, avy = 0, size = 0;

                for (let i = 0; i < stats.rows; i++) {
                    if (stats.data[i] === 1) {
                        goodNew.push(new cv.Point(features2.data32F[i * 2], features2.data32F[i * 2 + 1]));
                        goodOld.push(new cv.Point(features.data32F[i * 2], features.data32F[i * 2 + 1]));

                        // console.log(goodNew[i], goodOld[i])
                        if (goodNew[i] && goodOld[i]) {
                            avx += goodNew[i].x //- goodOld[i].x;
                            avy += goodNew[i].y //- goodOld[i].y
                            size++;
                        }
                    }
                }

                avx /= size;
                avy /= size;

                if (avx > 0)
                    center.x = avx;
                if (avy > 0)
                    center.y = avy;

                // info.innerHTML = goodNew[0].y.toFixed(2) + ' - ' + center.y.toFixed(2);

                // if(center.x < 0) center.x = 0;
                // if(center.y < 0) center.y = 0;

                // if(center.x > height) center.x = height;
                // if(center.y > width) center.y = width;

                cv.circle(dst, center, 7, colors[0], -1)

                // for (let i = 0; i < 1; i++) {
                let flag = false;
                for (let i = 0; i < goodNew.length; i++) {
                    cv.circle(dst, goodNew[i], 5, colors[i], 1);

                    if (!flag && (center.y - goodNew[i].y) > 50) {
                        info.innerHTML = 'Raised finger'
                        flag = true;
                    }
                    // cv.line(mask, goodNew[i], goodOld[i], colors[i], 2);
                }
                if(!flag) {
                    info.innerHTML = 'No raised finger'
                }

                // obtainFingers(contours.get(contourArea.id), fingerTips);

                // for (let i = 0; i < fingerTips.length; i++) {
                //     cv.circle(dst, fingerTips[i], 5, colors[i], 3);
                // }


                // mask.setTo(BLACK);
                cv.add(dst, mask, dst);

                grayFrame.copyTo(oldFrame);
                for (let i = 0; i < goodNew.length; i++) {
                    features.data32F[i * 2] = goodNew[i].x;
                    features.data32F[i * 2 + 1] = goodNew[i].y;
                }
            }
        }

        cv.imshow("canvasFrame", dst);


        delay = 1000 / FPS - (Date.now() - begin);
        setTimeout(processVideo, delay);
    }

    setTimeout(processVideo, 0);

    function classifyPixesl(source, destination,) {
        cv.cvtColor(source, destination, cv.COLOR_RGB2YCrCb);
        cv.inRange(destination, LOW, HIGH, destination);
    }

    function findBiggestArea(source, contours, contourArea) {
        cv.findContours(source, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

        let areaIdx = -1, area, biggerArea = 0;
        let i;
        for (i = 0; i < contours.size(); i++) {
            contour = contours.get(i);
            area = cv.contourArea(contour, false);

            if (area > biggerArea) {
                areaIdx = i;
                biggerArea = area;
            }
        }

        contourArea.id = areaIdx;
        contourArea.value = biggerArea;
    }

    function obtainFingers(contour, fingerTips) {
        let hull = new cv.Mat();

        let fingerIndexes = [];

        cv.convexHull(contour, hull, false, false);

        hull.data32S.sort((a, b) => a - b);

        // define cluster as being a group of hull indexes that are less than 100 units apart
        let firstMember = hull.data32S[0]; // indicates the first member of a cluster
        let firstIndex = 0; // member index in the array data32S
        let counter = 0;

        fingerTips.length = 0;
        for (let i = 0; i < hull.rows; i++) {
            let member = hull.data32S[i];

            if (Math.abs(firstMember - member) > 100) {
                let middleIndex = firstIndex + Math.trunc(counter / 2);
                let middleMember = hull.data32S[middleIndex];

                fingerTips.push(new cv.Point(
                    contour.data32S[middleMember * 2],
                    contour.data32S[middleMember * 2 + 1]
                ));

                firstIndex = i;
                firstMember = member;
                counter = 0;

                fingerIndexes.push(member);
            }
            counter++;
        }

        let rh = new cv.Mat(fingerIndexes.length, 1, 4);
        let rhIdx = 0;
        let defect = new cv.Mat();

        fingerIndexes.map((e, i) => { rh.data32S[i] = e });

        cv.convexityDefects(contour, rh, defect);

        numbFingers = 0;
        for (let i = 0; i < defect.rows; ++i) {
            let start = new cv.Point(contour.data32S[defect.data32S[i * 4] * 2],
                contour.data32S[defect.data32S[i * 4] * 2 + 1]);
            let end = new cv.Point(contour.data32S[defect.data32S[i * 4 + 1] * 2],
                contour.data32S[defect.data32S[i * 4 + 1] * 2 + 1]);
            let far = new cv.Point(contour.data32S[defect.data32S[i * 4 + 2] * 2],
                contour.data32S[defect.data32S[i * 4 + 2] * 2 + 1]);

            let nextI = i + 1 === defect.rows ? 0 : i + 1;
            let nextStart = new cv.Point(contour.data32S[defect.data32S[nextI * 4] * 2],
                contour.data32S[defect.data32S[nextI * 4] * 2 + 1]);
            let nextFar = new cv.Point(contour.data32S[defect.data32S[nextI * 4 + 2] * 2],
                contour.data32S[defect.data32S[nextI * 4 + 2] * 2 + 1]);

            let vec1 = new cv.Point(end.x - far.x, end.y - far.y);
            let vec2 = new cv.Point(nextStart.x - nextFar.x, nextStart.y - nextFar.y);
            // console.log('vec1', vec1);
            // console.log('vec2', vec2);
            // console.log('prod',  (vec1.x * vec2.x),  (vec1.y * vec2.y) )
            // console.log('dot: ',  (vec1.x * vec2.x + vec1.y * vec2.y) )
            // console.log('\n-------\n')

            let angle = Math.acos(
                (vec1.x * vec2.x + vec1.y * vec2.y) / (Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y) * Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y))
            );
            angle = angle * 180 / Math.PI;
            // console.log(angle)
            if (angle < 60) numbFingers++;

            cv.line(dst, start, far, colors[i + 5], 2, cv.LINE_AA, 0);
            cv.line(dst, far, end, colors[i + 5], 2, cv.LINE_AA, 0);
            cv.circle(dst, far, 5, colors[i + 5], 2);
            cv.circle(dst, end, 5, colors[i + 5], -1);
        }


        hull.delete(); rh.delete(); defect.delete();
    }

    function detachForeground(source, destination, contours, areaIdx) {
        binaryMask.setTo(BLACK);

        cv.drawContours(binaryMask, contours, areaIdx, RED, -1, cv.LINE_8, hierarchy, 1);

        if (!center)
            return;
        // center = cv.minEnclosingCircle(contours.get(contourArea.id)).center;

        rectMask.setTo(BLACK);

        let quarter = 50;
        p1.x = center.x - 2 * quarter;
        p1.y = 0 //center.y - 2 * quarter;
        p2.x = center.x + 2 * quarter;
        p2.y = center.y + quarter;
        // console.log(p1, p2);
        cv.rectangle(rectMask, p1, p2, RED, -1);

        cv.bitwise_and(binaryMask, binaryMask, rectMask, rectMask);

        cv.bitwise_and(source, source, destination, rectMask);

        cv.imshow('roi', rectMask);

    }

    // setInterval(() => {
    //     const p = document.getElementById("info");
    //     p.innerHTML = 'Fingers:  ' + numbFingers;
    // }, 1000);
}


function classifyPixesl(source, destination, low, high) {
    cv.cvtColor(source, destination, cv.COLOR_RGB2YCrCb);
    cv.inRange(destination, low, high, destination);
}


async function startVideo(video) {
    let stream = null; // video stream
    let width, height; // video size

    const constraints = {
        video: {
            facingMode: "environment",
            width: 360,
            height: 240
        },
        audio: false
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.play();

        width = stream.getVideoTracks()[0].getSettings().width
        height = stream.getVideoTracks()[0].getSettings().height

        return { width, height }
    }
    catch (err) {
        console.error('Error accesing camera:', err);
        const p = document.getElementById("info");
        p.innerHTML = 'Error accesing camera - ' + err;
    }
}