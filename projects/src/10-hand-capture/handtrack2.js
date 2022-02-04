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

let isReturn = false;

function start(info) {
    cvHasLoaded = cvHasLoaded || info.cv;
    cameraHasLoaded = cameraHasLoaded || info.camera;

    if (cvHasLoaded && cameraHasLoaded) {
        document.getElementById('info').innerHTML = "pronto";
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
    // let centerRect = new cv.Rect(0.5 * (width - rectSize), 0.5 * (height - rectSize), 0.5 * (width + rectSize), 0.5 * (height + rectSize));

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

                // if (cr > 0 || cb > 0) {
                //     meanCr += cr;
                //     meanCb += cb;
                //     size += 1;
                // }
            }
        }
        // meanCr /= size;
        // meanCb /= size;

        // console.log('Means: ', meanCr, meanCb);

        // for (let row = 0; row < roi.rows; row++) {
        //     for (let col = 0; col < roi.cols; col++) {
        //         cr = roi.data[row * roi.cols * roi.channels() + col * roi.channels() + 1];
        //         cb = roi.data[row * roi.cols * roi.channels() + col * roi.channels() + 2];

        //         if (cr > 0 || cb > 0) {
        //             sdCr += (cr - meanCr) * (cr - meanCr);
        //             sdCb += (cb - meanCb) * (cb - meanCb);
        //         }
        //     }
        // }
        // sdCr = Math.sqrt(sdCr / size);
        // sdCb = Math.sqrt(sdCb / size);

        // console.log('SD: ', sdCr, sdCb);

        // sdCb *= 2;
        // sdCr *= 2;

        // caliLow.cr = meanCr - sdCr;
        // caliLow.cb = meanCb - sdCb;
        // caliHigh.cr = meanCr + sdCr;
        // caliHigh.cb = meanCb + sdCb;

        // console.log('low:', caliLow);
        // console.log('high:', caliHigh);
        console.log('Cr: ', Cr);
        console.log('Cb: ', Cb);

        caliLow.cr = Cr.low;
        caliLow.cb = Cb.low;
        caliHigh.cr = Cr.high;
        caliHigh.cb = Cb.high;

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
        // processVideo();
        needsNewThresholds = true;
    });
    document.getElementById('btn2').addEventListener('click', () => {
        src.delete(); aux.delete(); dst.delete(); mask.delete();
        setTimeout(() => {
            main(caliLow, caliHigh);
        }, 0);
    });

    setTimeout(processVideo, 0);
    // processVideo();

}

function main(low, high) {
    // -- Constants -- //
    const FPS = 24;
    const BLACK = new cv.Scalar(0, 0, 0, 255); // helper scalar for black color
    const WHITE = new cv.Scalar(255, 255, 255, 255); // helper scalar for red color
    const RED = new cv.Scalar(255, 0, 0, 255);
    const GREEN = new cv.Scalar(0, 255, 0, 255);

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
    const transform = new cv.Mat(height, width, cv.CV_32F);
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

    // foreground extracting variables
    let center;
    let p1 = new cv.Point(0, 0);
    let p2 = new cv.Point(0, 0);
    const info = document.querySelector('#info');
    const mt = new cv.matFromArray(1, 4, 12, [0, 0, 0, 0, 0, 0, 0, 0]);

    const open1 = [3.0912769784486693, 7.7366600271469705, 11.305973553808753, 10.968399128352408, -13.164938156199067, 14.907906585875475, 15.353374087584879, 0.9681062034395111, 0.2637487229, 0.8326351262]

    const open2 = [3.12765614387537, 7.890141913277302, 11.166666775476504, 11.270622197906857, -20.36886535309352, 9.19620982349387, 20.450965321154378, 1.1455177693993803, 0.2637487229, 0.8326351262]

    const closed1 = [3.1844407881299097, 7.9225593297972186, 11.132406073467994, 12.942107787759145, 25.27895813880837, 15.434180121732487, -22.59077766487394, 0.7816794694575135, 0.7125208160, 0.6453160090]

    const closed2 = [3.1958532622091687, 8.498186203425494, 11.882128816659606, 13.87883275690292, 10.589385970285894, -0.0972378372045581, 2.469608358003279, 1.1300554542255923, 0.7125208160, 0.6453160090]


    let click = false;
    let count = 0;
    let accumulator = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let allData = [];
    const phu = document.getElementById('hu');

    document.getElementById('btn3').addEventListener('click', () => {
        click = true;
    });

    document.getElementById('btn4').addEventListener('click', () =>{
        let data = "";

        console.log(allData.length)
        allData.forEach(vector => {
            for(let numb of vector) {
                data += numb.toFixed(10) + "\t"
            }
            data += "\n"
        });

        phu.innerHTML = data;
    });

    // colors for drawing points
    const colors = [];
    for (let i = 0; i < maxCorners; i++) {
        colors.push(new cv.Scalar(parseInt(Math.random() * 255), parseInt(Math.random() * 255), parseInt(Math.random() * 255), 255));
    }

    // testing mophorlogic
    let M = cv.Mat.ones(5, 5, cv.CV_8U);
    let anchor = new cv.Point(-1, -1);

    let begin, delay; // fps helpers
    function processVideo() {
        begin = Date.now();

        // if (isReturn) return;

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
                // cv.imshow("roi", binaryMask);

                cv.goodFeaturesToTrack(grayFrame, features, maxCorners, qualityLevel, minDistance, binaryMask);

                // center = cv.minEnclosingCircle(contours.get(contourArea.id)).center;
                center = { x: 0, y: 0 } // temp

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

                // cv.circle(dst, center, 7, colors[0], -1)

                // for (let i = 0; i < 1; i++) {
                // let flag = false;
                // let py = contours.get(contourArea.id).row(0).data32S[1];
                // // console.log(py); 
                // for (let i = 0; i < goodNew.length; i++) {
                //     cv.circle(dst, goodNew[i], 5, colors[i], 1);

                //     if (!flag && (center.y - py) > 50) {
                //         info.innerHTML = 'Raised finger'
                //         flag = true;
                //     }
                //     // cv.line(mask, goodNew[i], goodOld[i], colors[i], 2);
                // }
                // if (!flag) {
                //     info.innerHTML = 'No raised finger'
                // }

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

        if (isReturn) return;
        delay = 1000 / FPS - (Date.now() - begin);
        setTimeout(processVideo, delay);
    }

    setTimeout(processVideo, 0);

    let event = new CustomEvent("handtrack-started");
    window.dispatchEvent(event);

    function classifyPixesl(source, destination) {
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

    function dist(p1, p2) {
        return Math.sqrt(Math.pow(p1.y - p2.y, 2) + Math.pow(p1.x - p2.x, 2));
    }

    function bounding(source, cnt) {
        let rotatedRect = cv.minAreaRect(cnt);
        let vertices = cv.RotatedRect.points(rotatedRect);

        cv.circle(dst, rotatedRect.center, 1, colors[3], 5);

        let highest = 0;
        for (let i = 0; i < 4; i++) {
            if (vertices[i].y < vertices[highest].y) {
                highest = i;
            }
        }

        let closest = highest == 0 ? 1 : 0;
        let d = dist(vertices[highest], vertices[closest]);
        for (let i = 0; i < 4; i++) {
            if (i != highest && i != closest) {
                let k = dist(vertices[highest], vertices[i]);
                if (k < d) {
                    d = k;
                    closest = i;
                }
            }
        }

        closest2nd = (closest + 2) % 4;

        cv.circle(dst, vertices[highest], 15, RED, 4);
        cv.circle(dst, vertices[closest], 15, GREEN, 4);
        cv.circle(dst, vertices[closest2nd], 15, WHITE, 4);

        for (let i = 0; i < 4; i++) {
            cv.line(dst, vertices[i], vertices[(i + 1) % 4], colors[3], 2, cv.LINE_AA, 0);
        }

        d *= 1.05;
        let slope;

        if (Math.abs(vertices[highest].x - vertices[closest2nd].x) < 0.0001) slope = 0;
        else slope = (vertices[highest].y - vertices[closest2nd].y) / (vertices[highest].x - vertices[closest2nd].x);
        if (isNaN(slope) || slope > 2147483647 || slope < -2147483647) slope = 0;

        let sign = Math.sign(slope);

        let ang = Math.atan(slope);
        // info.innerHTML = slope.toFixed(2);
        // info.innerHTML = `${ang.toFixed(2)}`

        p1.x = vertices[highest].x + d * Math.cos(ang) * sign;
        p1.y = vertices[highest].y + d * Math.sin(ang) * sign;

        cv.circle(dst, p1, 5, RED, 4);

        p2.x = vertices[closest].x + d * Math.cos(ang) * sign;
        p2.y = vertices[closest].y + d * Math.sin(ang) * sign;

        cv.circle(dst, p2, 5, colors[0], 4);
        cv.line(dst, p1, p2, colors[0], 2, cv.LINE_AA, 0);

        mt.data32S[0] = vertices[highest].x;
        mt.data32S[1] = vertices[highest].y;
        mt.data32S[2] = vertices[closest].x;
        mt.data32S[3] = vertices[closest].y;
        mt.data32S[4] = p2.x;
        mt.data32S[5] = p2.y;
        mt.data32S[6] = p1.x;
        mt.data32S[7] = p1.y;

        // ainda preciso descobrir como fazer para nao ficar alocando e desalocando isso aqui
        let v = new cv.MatVector();
        v.push_back(mt);

        source.setTo(BLACK);
        cv.drawContours(source, v, 0, WHITE, -1, cv.LINE_8);

        v.delete();
    }

    let ratio = 0, orientation = 0, circularity = 0;
    function detachForeground(source, destination, contours, areaIdx) {
        binaryMask.setTo(BLACK);
        // rectMask.setTo(BLACK);

        cv.drawContours(binaryMask, contours, areaIdx, WHITE, -1, cv.LINE_8, hierarchy, 1);

        // cv.imshow("roi", binaryMask);

        cv.morphologyEx(binaryMask, binaryMask, cv.MORPH_OPEN, M, anchor, 1,
            cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());


        cv.morphologyEx(binaryMask, binaryMask, cv.MORPH_CLOSE, M, anchor, 1,
            cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

        // cv.imshow("bin", binaryMask)

        cv.bitwise_and(source, source, destination, binaryMask);

        rectMask.setTo(BLACK)
        bounding(rectMask, contours.get(areaIdx));
        cv.bitwise_and(rectMask, rectMask, binaryMask, binaryMask);

        cv.distanceTransform(binaryMask, transform, cv.DIST_L2, cv.DIST_MASK_3);

        rectMask.setTo(BLACK);
        let max = cv.minMaxLoc(transform);

        p1.x = max.maxLoc.x - max.maxVal * 3;
        p1.y = max.maxLoc.y - max.maxVal * 3;
        p2.x = max.maxLoc.x + max.maxVal * 3;
        p2.y = max.maxLoc.y + max.maxVal;
        cv.rectangle(rectMask, p1, p2, WHITE, -1);

        cv.bitwise_and(binaryMask, binaryMask, rectMask, rectMask);

        // cv.imshow('roi', rectMask);
        cv.imshow('bin', binaryMask);
        cv.bitwise_and(source, source, destination, binaryMask);

        let cnt = new cv.MatVector(); //storages contours
        let hie = new cv.Mat();

        cv.findContours(binaryMask, cnt, hie, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

        // console.log(cnt.get(0), cv.contourArea(contour, false));
        rectMask.setTo(BLACK);
        if (cnt.get(0)) {
            let area = cv.contourArea(cnt.get(0), false);

            if (area > 100) {
                cv.drawContours(rectMask, cnt, 0, RED, 1, cv.LINE_8, hie, 1);

                let perimeter = cv.arcLength(cnt.get(0), true);
                circularity = 4 * Math.PI * area / Math.pow(perimeter, 2);

                // fit elipse and get semi-major axis
                let rotatedRect = cv.fitEllipse(cnt.get(0));

                orientation = rotatedRect.angle;
                ratio = rotatedRect.size.width / rotatedRect.size.height;

                // acc[7] = rotatedRect.angle;
                // acc[8] = rotatedRect.size.width / rotatedRect.size.height;

                // if (rotatedRect.size.width > rotatedRect.size.height) {
                //     major = rotatedRect.size.width;
                //     minor = rotatedRect.size.height;
                // }
                // else {
                //     major = rotatedRect.size.height;
                //     minor = rotatedRect.size.width;
                // }

                cv.ellipse1(dst, rotatedRect, RED, 1, cv.LINE_8);
            }
        }
        cv.imshow("roi", rectMask);

        moments(binaryMask, contours);

        // definitions of circularity, roundness , etc:
        // https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4706773/



        cv.circle(dst, max.maxLoc, 7, colors[0], -1)

        cv.circle(dst, max.maxLoc, max.maxVal * 1.1, colors[1], 2)

        cnt.delete();
        hie.delete();
    }

    function moments(source) {
        // https://learnopencv.com/shape-matching-using-hu-moments-c-python/

        let moments = cv.moments(source);
        let features = [];
        // let rect;

        // cv.HuMoments(moments, huMoments);
        hu(moments, features)

        // log transform - h[i] = -sign(h[i]) * log10|h[i]|
        for (let i = 0; i < features.length; i++) {
            features[i] = -1 * Math.sign(features[i]) * Math.log10(Math.abs(features[i]))
        }
        features[7] = circularity;
        features[8] = ratio;
        

        if (click) {
            click = false;
            count++;

            allData.push(features);

            for (let i = 0; i < features.length; i++) {
                accumulator[i] += features[i];
            }

            phu.innerHTML = `Mean ${count}:<hr><br>[`
            for (let i = 0; i < features.length; i++) {
                phu.innerHTML += `${accumulator[i] / count}`;
                if (i < 8) phu.innerHTML += ", ";
            }
            phu.innerHTML += ']';
        }

        let euclideanOpen1 = 0, euclideanOpen2 = 0;
        let euclideanClose1 = 0, euclideanClose2 = 0;
        let manhatanOpen1 = 0, manhatanOpen2 = 0;
        let manhatanClose1 = 0, manhatanClose2 = 0;
        let contOpen1 = 0, contOpen2 = 0;
        let contClose1 = 0, contClose2 = 0;
        let absOpen1, absOpen2, absClose1, absClose2;

        for (let i = 0; i < features.length; i++) {
            absOpen1 = Math.abs(features[i] - open1[i]);
            absClose1 = Math.abs(features[i] - closed1[i]);
            absOpen2 = Math.abs(features[i] - open2[i]);
            absClose2 = Math.abs(features[i] - closed2[i]);

            euclideanOpen1 += (absOpen1 * absOpen1);
            euclideanClose1 += (absClose1 * absClose1);
            euclideanOpen2 += (absOpen2 * absOpen2);
            euclideanClose2 += (absClose2 * absClose2);

            manhatanOpen1 += absOpen1;
            manhatanClose1 += absClose1;
            manhatanOpen2 += absOpen2;
            manhatanClose2 += absClose2;

            if (absOpen1 < absClose1) {
                contOpen1++;
            }
            else {
                contClose1++;
            }

            if (absOpen2 < absClose2) {
                contOpen2++;
            }
            else {
                contClose2++;
            }
        }
        if (euclideanOpen2 < euclideanOpen1) euclideanOpen1 = euclideanOpen2;
        if (euclideanClose2 < euclideanClose1) euclideanClose1 = euclideanClose2;
        if (manhatanOpen2 < manhatanOpen1) manhatanOpen1 = manhatanOpen2;
        if (manhatanClose2 < manhatanClose1) manhatanClose1 = manhatanClose2;
        if (contOpen2 > contOpen1) contOpen1 = contOpen2;
        if (contClose2 > contClose1) contClose1 = contClose2;

        // console.log(huMoments);

        info.innerHTML = `classification:<br\>
        euclidean: ${euclideanOpen1 < euclideanClose1 ? 'open' : 'close'}<br\>
        manhatan: ${manhatanOpen1 < manhatanClose1 ? 'open' : 'close'}<br\>
        cont: ${contOpen1 > contClose1 ? 'open' : 'close'}`;
    }

    // hu moments
    function hu(m, hu) {
        let t0 = m.nu30 + m.nu12;
        let t1 = m.nu21 + m.nu03;

        let q0 = t0 * t0, q1 = t1 * t1;

        let n4 = 4 * m.nu11;
        let s = m.nu20 + m.nu02;
        let d = m.nu20 - m.nu02;

        hu[0] = s;
        hu[1] = d * d + n4 * m.nu11;
        hu[3] = q0 + q1;
        hu[5] = d * (q0 - q1) + n4 * t0 * t1;

        t0 *= q0 - 3 * q1;
        t1 *= 3 * q0 - q1;

        q0 = m.nu30 - 3 * m.nu12;
        q1 = 3 * m.nu21 - m.nu03;

        hu[2] = q0 * q0 + q1 * q1;
        hu[4] = q0 * t0 + q1 * t1;
        hu[6] = q1 * t0 - q0 * t1;
    }

    window.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'm':
                moments(rectMask);
            default:
                isReturn = true
        }
    });
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

// let open = [
        //     3.062038994000932,
        //     7.197910988639913,
        //     10.541061884353944,
        //     10.780738946955417,
        //     -22.42706340963343,
        //     14.923474994972896,
        //     -21.443974104478865
        // ]

        // let close = [
        //     3.1872975810443918,
        //     7.822597220182995,
        //     12.03476386792147,
        //     13.17626716473,
        //     25.936605008565586,
        //     17.139584355269808,
        //     25.928074130157842
        // ]

        // let open = [
        //     3.0703741947068424,
        //     7.023749736591466,
        //     10.678424708639218,
        //     11.070285031329849,
        //     11.775164436194975,
        //     7.107823179828246,
        //     22.02303654000887,
        // ]


        // let close = [
        //     3.132797977070457,
        //     7.14225850278341,
        //     10.919895309889244,
        //     12.206212676724647,
        //     -24.001257937551113,
        //     -7.579335131995962,
        //     -11.948504318082689,
        // ]

        // let open = [
        //     3.097256283103742,
        //     7.735830930530247,
        //     11.237027646736887,
        //     10.985767570535057,
        //     6.632480667864994,
        //     10.601943721838142,
        //     8.86233799029899,
        //     0.9218495870545018,
        // ]

        // let close = [
        //     3.1793829376573024,
        //     8.029686307267838,
        //     11.319173948850136,
        //     13.4498118250593,
        //     -0.16808897890120847,
        //     -2.1141215920751724,
        //     7.5892095169036065,
        //     1.1352700262952273,
        // ];