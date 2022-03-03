let cv;
let video, canvas, context;
let width, height;
let calibration, main;

let classification = -1;
let classificationHelper = -1;
let hCenter = { x: 0, y: 0 };

const MAX_DIS = 10;
const MIN_CONTS = 4;

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

        init(opt, parent);
    }

    calibrate() {
        if (calibration) {
            calibration.calibrate();
        }
    }

    start() {
        calibration.stop();

        let low = calibration.caliLow;
        let high = calibration.caliHigh;

        calibration = null;

        main = new Main({
            low,
            high
        })
    }

    getCenter(point) {
        point.x = hCenter.x;
        point.y = hCenter.y
    }

    getContext() {
        return context;
    }

    getClassification() {
        return classification;
    }

    pause() {
        isReturn = true;
    }

    resume() {
        isReturn = false;
        setTimeout(main.processVideo, 0);
    }
}

async function init(opt, parent) {
    await startVideo(video, opt);

    if (window.outerWidth < window.outerHeight) {
        console.log('oi')

        let warn = document.createElement('p');
        warn.innerText = 'Turn your cellphone into landscape';
        warn.style.cssText = 'font-family: sans; background-color: #f90; color: white; padding: 5px;'

        parent.appendChild(warn)
        await landScape();

        parent.removeChild(warn);
    }

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'margin: auto; width: auto%; height: 100%; display: block'
    canvas.style.cssText += 'border: 1px solid red;'
    canvas.id = "canvasFrame";
    parent.appendChild(canvas);

    context = canvas.getContext("2d");

    width = video.videoWidth;
    height = video.videoHeight;

    // calibration();
    calibration = new Calibration(parent);

}

class Calibration {
    constructor(parent) {
        this.FPS = 20;
        this.BLACK = new cv.Scalar(0, 0, 0, 255); // helper scalar for black color

        // Thesholds for pixel color classification
        this.LOW = new cv.Mat(height, width, cv.CV_8UC3, [0, 133, 77, 0]);
        this.HIGH = new cv.Mat(height, width, cv.CV_8UC3, [255, 173, 127, 255]);

        // Calibrated thresholds
        this.caliLow = { cr: 133, cb: 77 };
        this.caliHigh = { cr: 173, cb: 127 };

        this.src = new cv.Mat(height, width, cv.CV_8UC4); // storages image source
        this.aux = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
        this.dst = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
        this.mask = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
        this.roi = null;
        this.needsNewThresholds = false;

        let rectSize = 100;
        this.point1 = new cv.Point(0.5 * (width - rectSize), 0.5 * (height - rectSize));
        this.point2 = new cv.Point(0.5 * (width + rectSize), 0.5 * (height + rectSize));
        this.rect = new cv.Rect(this.point1.x, this.point1.y, rectSize, rectSize);

        this.begin = 0;
        this.delay = 0; // fps helpers

        this.roiCanvas = document.createElement('canvas');
        this.roiCanvas.style.cssText = 'border: 1px solid red;'
        this.roiCanvas.style.display = 'none';
        this.roiCanvas.id = "roi";
        parent.appendChild(this.roiCanvas);

        this.isStop = false;

        this.processVideo = this.processVideo.bind(this);
        this.stop = this.stop.bind(this);
        this.calibrate = this.calibrate.bind(this);

        setTimeout(this.processVideo, 0);
    }

    processVideo() {
        if (this.isStop) return;

        this.begin = Date.now();

        context.drawImage(video, 0, 0, width, height);
        this.src.data.set(context.getImageData(0, 0, width, height).data);

        this.src.copyTo(this.dst);

        cv.rectangle(this.src, this.point1, this.point2, this.BLACK, 2);

        if (this.needsNewThresholds) {
            // classifyPixesl(this.dst, this.mask, this.LOW, this.HIGH);
            cv.cvtColor(this.dst, this.dst, cv.COLOR_RGB2YCrCb);

            this.dst.copyTo(this.mask);
            cv.inRange(this.mask, this.LOW, this.HIGH, this.mask);

            this.aux.setTo(this.BLACK);
            cv.bitwise_and(this.dst, this.dst, this.aux, this.mask);
            this.roi = this.aux.roi(this.rect);

            this.calculateNewThresholds(this.roi)

            cv.imshow("roi", this.roi);
            this.roiCanvas.style.display = 'inline';

            this.roi.delete();
            this.needsNewThresholds = false;
        }
        cv.imshow("canvasFrame", this.src);
        this.delay = 1000 / this.FPS - (Date.now() - this.begin);
        setTimeout(this.processVideo, this.delay);

    }

    calculateNewThresholds(roi) {
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

        this.caliLow.cr = Cr.low;
        this.caliLow.cb = Cb.low;
        this.caliHigh.cr = Cr.high;
        this.caliHigh.cb = Cb.high;
    }

    calibrate() {
        this.needsNewThresholds = true;
    }

    stop() {
        this.isStop = true;
        this.src.delete(); this.aux.delete(); this.dst.delete();
        this.mask.delete(); this.LOW.delete(); this.HIGH.delete();
        this.roiCanvas.remove();
    }
}

let isReturn = false;

let ratio = 0, orient = 0, circularity = 0;

class Main {
    constructor(config) {
        this.FPS = config.fps || 24;

        this.BLACK = new cv.Scalar(0, 0, 0, 255); // helper scalar for black color
        this.WHITE = new cv.Scalar(255, 255, 255, 255); // helper scalar for red color
        this.RED = new cv.Scalar(255, 0, 0, 255);
        this.GREEN = new cv.Scalar(0, 255, 0, 255);

        // Thesholds for pixel color classification
        this.LOW = new cv.Mat(height, width, cv.CV_8UC3, [0, config.low.cr, config.low.cb, 0]);
        this.HIGH = new cv.Mat(height, width, cv.CV_8UC3, [255, config.high.cr, config.high.cb, 255]);

        // Minimum occupied area threshold
        this.MIN_AREA = height * width * 0.05;

        // Minimum number of feature points
        this.MIN_FEATURES = 20;

        // --------------- //

        // Video manipulation variables
        this.src = new cv.Mat(height, width, cv.CV_8UC4); // storages image source
        this.dst = new cv.Mat(height, width, cv.CV_8UC4); // storages final result
        this.binaryMask = new cv.Mat(height, width, 0);
        this.rectMask = new cv.Mat(height, width, 0);
        this.transform = new cv.Mat(height, width, cv.CV_32F);
        this.aux = new cv.Mat(height, width, cv.CV_8UC4); // helper mat - rename it
        this.grayFrame = new cv.Mat(height, width, cv.CV_8UC4);
        this.oldFrame = new cv.Mat(height, width, cv.CV_8UC4); // helper mat - rename it
        this.mask = new cv.Mat(height, width, cv.CV_8UC4, this.BLACK); // helper mat

        // Contourns variables - https://docs.opencv.org/3.4.15/d5/daa/tutorial_js_contours_begin.html
        this.contours = new cv.MatVector(); //storages contours
        this.hierarchy = new cv.Mat(); // stores hierarchy
        this.contourArea = { id: -1, value: 0 } // stores the larger contourn and its id

        // features variables - https://docs.opencv.org/3.4/dd/d1a/group__imgproc__feature.html#ga1d6bb77486c8f92d79c8793ad995d541
        this.maxCorners = 50;
        this.qualityLevel = 0.2;
        this.minDistance = 15;
        this.blockSize = 10;
        this.features = new cv.Mat();
        this.hasFeatures = false;

        // optical flow variables - https://docs.opencv.org/3.4/dc/d6b/group__video__track.html#ga473e4b886d0bcc6b65831eb88ed93323
        this.features2 = new cv.Mat(); // -rename it
        this.winSize = new cv.Size(15, 15);
        this.maxLevel = 2;
        this.criteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.03);
        this.stats = new cv.Mat();
        this.err = new cv.Mat()
        this.goodNew = [];
        this.goodOld = [];

        // foreground extracting variables
        // this.center;
        this.p1 = new cv.Point(0, 0);
        this.p2 = new cv.Point(0, 0);
        this.info = document.querySelector('#info');
        this.mt = new cv.matFromArray(1, 4, 12, [0, 0, 0, 0, 0, 0, 0, 0]);

        this.open1 = [3.0912769784486693, 7.7366600271469705, 11.305973553808753, 10.968399128352408, 13.164938156199067, 14.907906585875475, 15.353374087584879, 0.9681062034395111, 0.2637487229, 0.8326351262]
        this.open2 = [3.12765614387537, 7.890141913277302, 11.166666775476504, 11.270622197906857, 20.36886535309352, 9.19620982349387, 20.450965321154378, 1.1455177693993803, 0.2637487229, 0.8326351262]

        this.closed1 = [3.1844407881299097, 7.9225593297972186, 11.132406073467994, 12.942107787759145, 25.27895813880837, 15.434180121732487, 22.59077766487394, 0.7816794694575135, 0.7125208160, 0.6453160090]
        this.closed2 = [3.1958532622091687, 8.498186203425494, 11.882128816659606, 13.87883275690292, 10.589385970285894, 0.0972378372045581, 2.469608358003279, 1.1300554542255923, 0.7125208160, 0.6453160090]

        // colors for drawing points
        this.colors = [];
        for (let i = 0; i < this.maxCorners; i++) {
            this.colors.push(new cv.Scalar(parseInt(Math.random() * 255), parseInt(Math.random() * 255), parseInt(Math.random() * 255), 255));
        }

        // Variables for morphologics
        this.M = cv.Mat.ones(5, 5, cv.CV_8U);
        this.anchor = new cv.Point(-1, -1);

        // center 
        this.center = { x: 0, y: 0 }

        this.begin;
        this.delay; // fps helpers

        this.processVideo = this.processVideo.bind(this);
        this.bounding = this.bounding.bind(this);
        this.detachForeground = this.detachForeground.bind(this);
        this.moments = this.moments.bind(this);

        setTimeout(this.processVideo, 0);

        setInterval(() => {
            classification = classificationHelper;
        }, 500)
    }

    processVideo() {
        this.begin = Date.now();

        context.drawImage(video, 0, 0, width, height);
        this.src.data.set(context.getImageData(0, 0, width, height).data);

        classifyPixesl(this.src, this.aux, this.LOW, this.HIGH);

        this.findBiggestArea(this.aux, this.contours, this.contourArea)

        if (this.contourArea.value < this.MIN_AREA) {
            this.hasFeatures = false;
            this.center.x = 0;
            this.center.y = 0;
            this.dst.setTo(this.BLACK);
            classification = -1;
            classificationHelper = -1;
        }
        else {
            this.dst.setTo(this.BLACK)
            this.detachForeground(this.src, this.dst, this.contours, this.contourArea.id);

            cv.cvtColor(this.dst, this.grayFrame, cv.COLOR_RGB2GRAY);

            if (!this.hasFeatures) {
                cv.goodFeaturesToTrack(this.grayFrame, this.features, this.maxCorners, this.qualityLevel, this.minDistance, this.binaryMask);

                this.center.x = 0;
                this.center.y = 0;

                if (this.features.rows >= this.MIN_FEATURES) {
                    this.hasFeatures = true;
                    this.mask.setTo(this.BLACK);
                    this.grayFrame.copyTo(this.oldFrame);
                }
            }
            else {
                cv.calcOpticalFlowPyrLK(this.oldFrame, this.grayFrame, this.features, this.features2, this.stats, this.err, this.winSize, this.maxLevel, this.criteria);

                this.goodNew.length = 0;
                this.goodOld.length = 0;
                let avx = 0, avy = 0, size = 0;

                for (let i = 0; i < this.stats.rows; i++) {
                    if (this.stats.data[i] === 1) {
                        this.goodNew.push(new cv.Point(this.features2.data32F[i * 2], this.features2.data32F[i * 2 + 1]));
                        this.goodOld.push(new cv.Point(this.features.data32F[i * 2], this.features.data32F[i * 2 + 1]));

                        if (this.goodNew[i] && this.goodOld[i]) {
                            avx += this.goodNew[i].x - this.goodOld[i].x;
                            avy += this.goodNew[i].y - this.goodOld[i].y
                            size++;
                        }
                    }
                }

                if (size > 0) {
                    avx /= size;
                    avy /= size;

                    this.center.x += avx;
                    this.center.y += avy;
                }

                cv.circle(this.dst, this.center, 7, this.colors[0], -1)

                for (let i = 0; i < this.goodNew.length; i++) {
                    cv.circle(this.dst, this.goodNew[i], 5, this.colors[i], 1);
                }

                // mask.setTo(this.BLACK);
                cv.add(this.dst, this.mask, this.dst);

                this.grayFrame.copyTo(this.oldFrame);
                for (let i = 0; i < this.goodNew.length; i++) {
                    this.features.data32F[i * 2] = this.goodNew[i].x;
                    this.features.data32F[i * 2 + 1] = this.goodNew[i].y;
                }
            }
        }

        hCenter.x = this.center.x / width;
        hCenter.y = -this.center.y / height;

        cv.imshow("canvasFrame", this.dst);


        if (isReturn) {
            return;
        }
        this.delay = 1000 / this.FPS - (Date.now() - this.begin);
        setTimeout(this.processVideo, this.delay);
    }

    findBiggestArea(source, contours, contourArea) {
        cv.findContours(source, contours, this.hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

        let areaIdx = -1, contour, area, biggerArea = 0;
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

    bounding(source, cnt) {
        let rotatedRect = cv.minAreaRect(cnt);
        let vertices = cv.RotatedRect.points(rotatedRect);

        cv.circle(this.dst, rotatedRect.center, 1, this.colors[3], 5);

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

        let closest2nd = (closest + 2) % 4;

        cv.circle(this.dst, vertices[highest], 15, this.RED, 4);
        cv.circle(this.dst, vertices[closest], 15, this.GREEN, 4);
        cv.circle(this.dst, vertices[closest2nd], 15, this.WHITE, 4);

        for (let i = 0; i < 4; i++) {
            cv.line(this.dst, vertices[i], vertices[(i + 1) % 4], this.colors[3], 2, cv.LINE_AA, 0);
        }

        d *= 1.05;
        let slope;

        if (Math.abs(vertices[highest].x - vertices[closest2nd].x) < 0.0001) slope = 0;
        else slope = (vertices[highest].y - vertices[closest2nd].y) / (vertices[highest].x - vertices[closest2nd].x);
        if (isNaN(slope) || slope > 2147483647 || slope < -2147483647) slope = 0;

        let sign = Math.sign(slope);

        let ang = Math.atan(slope);

        this.p1.x = vertices[highest].x + d * Math.cos(ang) * sign;
        this.p1.y = vertices[highest].y + d * Math.sin(ang) * sign;

        cv.circle(this.dst, this.p1, 5, this.RED, 4);

        this.p2.x = vertices[closest].x + d * Math.cos(ang) * sign;
        this.p2.y = vertices[closest].y + d * Math.sin(ang) * sign;

        cv.circle(this.dst, this.p2, 5, this.colors[0], 4);
        cv.line(this.dst, this.p1, this.p2, this.colors[0], 2, cv.LINE_AA, 0);

        this.mt.data32S[0] = vertices[highest].x;
        this.mt.data32S[1] = vertices[highest].y;
        this.mt.data32S[2] = vertices[closest].x;
        this.mt.data32S[3] = vertices[closest].y;
        this.mt.data32S[4] = this.p2.x;
        this.mt.data32S[5] = this.p2.y;
        this.mt.data32S[6] = this.p1.x;
        this.mt.data32S[7] = this.p1.y;

        // ainda preciso descobrir como fazer para nao ficar alocando e desalocando isso aqui
        let v = new cv.MatVector();
        v.push_back(this.mt);

        source.setTo(this.BLACK);
        cv.drawContours(source, v, 0, this.WHITE, -1, cv.LINE_8);

        v.delete();
    }

    detachForeground(source, destination, contours, areaIdx) {
        this.binaryMask.setTo(this.BLACK);

        cv.drawContours(this.binaryMask, contours, areaIdx, this.WHITE, -1, cv.LINE_8, this.hierarchy, 1);

        cv.morphologyEx(this.binaryMask, this.binaryMask, cv.MORPH_OPEN, this.M, this.anchor, 1,
            cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());


        cv.morphologyEx(this.binaryMask, this.binaryMask, cv.MORPH_CLOSE, this.M, this.anchor, 1,
            cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

        cv.bitwise_and(source, source, destination, this.binaryMask);

        this.rectMask.setTo(this.BLACK)
        this.bounding(this.rectMask, contours.get(areaIdx));
        cv.bitwise_and(this.rectMask, this.rectMask, this.binaryMask, this.binaryMask);

        cv.distanceTransform(this.binaryMask, this.transform, cv.DIST_L2, cv.DIST_MASK_3);

        this.rectMask.setTo(this.BLACK);
        let max = cv.minMaxLoc(this.transform);

        this.p1.x = max.maxLoc.x - max.maxVal * 3;
        this.p1.y = max.maxLoc.y - max.maxVal * 3;
        this.p2.x = max.maxLoc.x + max.maxVal * 3;
        this.p2.y = max.maxLoc.y + max.maxVal;
        cv.rectangle(this.rectMask, this.p1, this.p2, this.WHITE, -1);

        cv.bitwise_and(this.binaryMask, this.binaryMask, this.rectMask, this.rectMask);

        cv.bitwise_and(source, source, destination, this.binaryMask);

        let cnt = new cv.MatVector(); //storages contours
        let hie = new cv.Mat();

        cv.findContours(this.binaryMask, cnt, hie, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

        this.rectMask.setTo(this.BLACK);
        if (cnt.get(0)) {
            let area = cv.contourArea(cnt.get(0), false);

            if (area > 100) {
                cv.drawContours(this.rectMask, cnt, 0, this.RED, 1, cv.LINE_8, hie, 1);

                // definitions of circularity, roundness , etc:
                // https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4706773/

                let perimeter = cv.arcLength(cnt.get(0), true);
                circularity = 4 * Math.PI * area / Math.pow(perimeter, 2);

                // fit elipse and get semi-major axis
                let rotatedRect = cv.fitEllipse(cnt.get(0));

                orient = rotatedRect.angle;
                ratio = rotatedRect.size.width / rotatedRect.size.height;

                cv.ellipse1(this.dst, rotatedRect, this.RED, 1, cv.LINE_8);
            }
        }

        // atual
        // cv.imshow("canvasFrame", this.binaryMask);
        this.moments(this.binaryMask, contours);

        cv.circle(this.dst, max.maxLoc, 7, this.colors[0], -1)

        cv.circle(this.dst, max.maxLoc, max.maxVal * 1.1, this.colors[1], 2)

        cnt.delete();
        hie.delete();
    }

    moments(source) {
        // https://learnopencv.com/shape-matching-using-hu-moments-c-python/

        let moments = cv.moments(source);
        let features = [];
        // let rect;

        // cv.HuMoments(moments, huMoments);
        this.hu(moments, features)

        // log transform - h[i] = -sign(h[i]) * log10|h[i]|
        for (let i = 0; i < features.length; i++) {
            features[i] = -1 * Math.sign(features[i]) * Math.log10(Math.abs(features[i]))
        }
        features[7] = circularity;
        features[8] = ratio;

        for (let i = 0; i < features.length; i++) {
            features[i] = Math.abs(features[i]);
        }

        let contOpen1 = 0, contOpen2 = 0;
        let contClose1 = 0, contClose2 = 0;
        let absOpen1, absOpen2, absClose1, absClose2;

        for (let i = 0; i < features.length; i++) {
            absOpen1 = Math.abs(features[i] - this.open1[i]);
            absClose1 = Math.abs(features[i] - this.closed1[i]);
            absOpen2 = Math.abs(features[i] - this.open2[i]);
            absClose2 = Math.abs(features[i] - this.closed2[i]);


            if (absOpen1 < absClose1) {
                if (absOpen1 < MAX_DIS)
                    contOpen1++;
            }
            else if (absClose1 < MAX_DIS) {
                contClose1++;
            }

            if (absOpen2 < absClose1) {
                if (absOpen2 < MAX_DIS)
                    contOpen2++;
            }
            else if (absClose2 < MAX_DIS) {
                contClose2++;
            }
        }

        contOpen1 = contOpen1 > contOpen2 ? contOpen1 : contOpen2;
        contClose1 = contClose1 > contClose2 ? contClose1 : contClose2;

        if (contOpen1 < MIN_CONTS && contClose1 < MIN_CONTS)
            classificationHelper = - 1;
        else
            classificationHelper = contOpen1 > contClose1 ? 1 : 0
    }

    hu(m, hu) {
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
}

function classifyPixesl(source, destination, low, high) {
    cv.cvtColor(source, destination, cv.COLOR_RGB2YCrCb);
    cv.inRange(destination, low, high, destination);
}

function dist(p1, p2) {
    return Math.sqrt(Math.pow(p1.y - p2.y, 2) + Math.pow(p1.x - p2.x, 2));
}

async function landScape() {
    return new Promise((resolve, reject) => {
        window.addEventListener('resize', onResize)

        function onResize() {
            if (window.outerWidth >= window.innerHeight) {
                window.removeEventListener('resize', onResize);
                resolve();
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
                resolve();
            }, { once: true });
        });
    }
    catch (err) {
        console.error('Error accesing camera:', err);
        alert('Error accessing camera');
    }
}