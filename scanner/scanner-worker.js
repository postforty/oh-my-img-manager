/**
 * Web Worker for Document and Book Scanning with OpenCV.js WASM
 * Handles corner detection, perspective warp, shadow removal, and contrast enhancement.
 */

// Load OpenCV.js WebAssembly bundle
let cvReady = false;
let cvInitPromise = null;

function initOpenCV() {
  if (cvReady) return Promise.resolve();
  if (cvInitPromise) return cvInitPromise;

  cvInitPromise = new Promise((resolve, reject) => {
    try {
      importScripts("../lib/opencv.js?v=" + Date.now());

      if (typeof cv !== "undefined" && cv.Mat) {
        cvReady = true;
        resolve();
      } else {
        self.cv = self.cv || {};
        self.cv["onRuntimeInitialized"] = () => {
          cvReady = true;
          resolve();
        };
      }
    } catch (err) {
      reject(err);
    }
  });

  return cvInitPromise;
}

// Convert ImageData to cv.Mat
function imageDataToMat(imageData) {
  const mat = new cv.Mat(imageData.height, imageData.width, cv.CV_8UC4);
  mat.data.set(imageData.data);
  return mat;
}

// Convert cv.Mat (RGBA) to ImageData
function matToImageData(mat) {
  const imgData = new ImageData(
    new Uint8ClampedArray(mat.data),
    mat.cols,
    mat.rows
  );
  return imgData;
}

/**
 * Automatically detects the 4 corners of a document in the image.
 * Uses downscaled processing for high speed and returns coordinates in original image scale.
 */
function detectDocumentCorners(imageData) {
  const src = imageDataToMat(imageData);
  const w = src.cols;
  const h = src.rows;

  // Fallback corners: 5% inset
  const fallback = [
    { x: Math.round(w * 0.04), y: Math.round(h * 0.04) },
    { x: Math.round(w * 0.96), y: Math.round(h * 0.04) },
    { x: Math.round(w * 0.96), y: Math.round(h * 0.96) },
    { x: Math.round(w * 0.04), y: Math.round(h * 0.96) }
  ];

  let small = null;
  let gray = null;
  let blurred = null;
  let edges = null;
  let dilated = null;
  let kernel = null;
  let contours = null;
  let hierarchy = null;
  let approx = null;

  try {
    const maxDim = 800;
    const scale = Math.min(1.0, maxDim / Math.max(w, h));
    const sw = Math.round(w * scale);
    const sh = Math.round(h * scale);

    small = new cv.Mat();
    cv.resize(src, small, new cv.Size(sw, sh), 0, 0, cv.INTER_AREA);

    gray = new cv.Mat();
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);

    blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 150);

    kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    dilated = new cv.Mat();
    cv.dilate(edges, dilated, kernel);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let bestQuad = null;
    let maxArea = 0;
    const minArea = sw * sh * 0.12; // Minimum 12% of total area

    approx = new cv.Mat();
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < minArea) {
        cnt.delete();
        continue;
      }

      const perimeter = cv.arcLength(cnt, true);
      cv.approxPolyDP(cnt, approx, 0.025 * perimeter, true);

      if (approx.rows === 4 && cv.isContourConvex(approx) && area > maxArea) {
        maxArea = area;
        const pts = [];
        for (let j = 0; j < 4; j++) {
          pts.push({
            x: approx.data32S[j * 2] / scale,
            y: approx.data32S[j * 2 + 1] / scale
          });
        }
        bestQuad = pts;
      }
      cnt.delete();
    }

    if (bestQuad) {
      // Order points: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
      return orderCornerPoints(bestQuad);
    }

    return fallback;
  } catch (err) {
    console.warn("Corner detection error, using fallback:", err);
    return fallback;
  } finally {
    if (src) src.delete();
    if (small) small.delete();
    if (gray) gray.delete();
    if (blurred) blurred.delete();
    if (edges) edges.delete();
    if (dilated) dilated.delete();
    if (kernel) kernel.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
    if (approx) approx.delete();
  }
}

/**
 * Orders 4 points into [TL, TR, BR, BL]
 */
function orderCornerPoints(pts) {
  // Sort by sum of (x + y): TL has min sum, BR has max sum
  const sum = pts.map((p) => p.x + p.y);
  // Sort by diff (y - x): TR has min diff, BL has max diff
  const diff = pts.map((p) => p.y - p.x);

  let tlIdx = 0, brIdx = 0, trIdx = 0, blIdx = 0;
  let minSum = Infinity, maxSum = -Infinity;
  let minDiff = Infinity, maxDiff = -Infinity;

  for (let i = 0; i < 4; i++) {
    if (sum[i] < minSum) { minSum = sum[i]; tlIdx = i; }
    if (sum[i] > maxSum) { maxSum = sum[i]; brIdx = i; }
    if (diff[i] < minDiff) { minDiff = diff[i]; trIdx = i; }
    if (diff[i] > maxDiff) { maxDiff = diff[i]; blIdx = i; }
  }

  return [pts[tlIdx], pts[trIdx], pts[brIdx], pts[blIdx]];
}

/**
 * Applies perspective transform using 4 corner points.
 */
function warpPerspective(srcMat, corners) {
  const [tl, tr, br, bl] = corners;

  // Calculate destination width and height
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
  const maxWidth = Math.max(100, Math.round(Math.max(widthTop, widthBottom)));

  const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);
  const maxHeight = Math.max(100, Math.round(Math.max(heightLeft, heightRight)));

  const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y,
    tr.x, tr.y,
    br.x, br.y,
    bl.x, bl.y
  ]);

  const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    maxWidth - 1, 0,
    maxWidth - 1, maxHeight - 1,
    0, maxHeight - 1
  ]);

  let M = null;
  let warped = null;

  try {
    M = cv.getPerspectiveTransform(srcCoords, dstCoords);
    warped = new cv.Mat();
    cv.warpPerspective(srcMat, warped, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
    return warped;
  } finally {
    srcCoords.delete();
    dstCoords.delete();
    if (M) M.delete();
  }
}

/**
 * Applies Photoshop-style 8-Point Curved Quad Warp (Coons Patch Transfinite Interpolation)
 * Straightens distorted books using 4 corners + 4 edge curve control handles.
 */
function warpCurvedQuad(srcMat, corners, curveHandles) {
  const [tl, tr, br, bl] = corners;

  // Midpoints / Handles
  const tc = curveHandles && curveHandles.tc ? curveHandles.tc : { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 };
  const rc = curveHandles && curveHandles.rc ? curveHandles.rc : { x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2 };
  const bc = curveHandles && curveHandles.bc ? curveHandles.bc : { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 };
  const lc = curveHandles && curveHandles.lc ? curveHandles.lc : { x: (tl.x + bl.x) / 2, y: (tl.y + bl.y) / 2 };

  // Calculate destination dimensions
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
  const maxWidth = Math.max(100, Math.round(Math.max(widthTop, widthBottom)));

  const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);
  const maxHeight = Math.max(100, Math.round(Math.max(heightLeft, heightRight)));

  // Quadratic Bezier control points such that curve passes through handles at t=0.5
  const ctrlTop = {
    x: 2 * tc.x - 0.5 * (tl.x + tr.x),
    y: 2 * tc.y - 0.5 * (tl.y + tr.y)
  };
  const ctrlBottom = {
    x: 2 * bc.x - 0.5 * (bl.x + br.x),
    y: 2 * bc.y - 0.5 * (bl.y + br.y)
  };
  const ctrlLeft = {
    x: 2 * lc.x - 0.5 * (tl.x + bl.x),
    y: 2 * lc.y - 0.5 * (tl.y + bl.y)
  };
  const ctrlRight = {
    x: 2 * rc.x - 0.5 * (tr.x + br.x),
    y: 2 * rc.y - 0.5 * (tr.y + br.y)
  };

  const mapX = new cv.Mat(maxHeight, maxWidth, cv.CV_32FC1);
  const mapY = new cv.Mat(maxHeight, maxWidth, cv.CV_32FC1);
  const mXData = mapX.data32F;
  const mYData = mapY.data32F;

  // Precompute top and bottom curve points for each column x
  const topX = new Float32Array(maxWidth);
  const topY = new Float32Array(maxWidth);
  const botX = new Float32Array(maxWidth);
  const botY = new Float32Array(maxWidth);

  for (let x = 0; x < maxWidth; x++) {
    const u = x / (maxWidth - 1);
    const u1 = 1 - u;
    const b0 = u1 * u1;
    const b1 = 2 * u1 * u;
    const b2 = u * u;

    topX[x] = b0 * tl.x + b1 * ctrlTop.x + b2 * tr.x;
    topY[x] = b0 * tl.y + b1 * ctrlTop.y + b2 * tr.y;

    botX[x] = b0 * bl.x + b1 * ctrlBottom.x + b2 * br.x;
    botY[x] = b0 * bl.y + b1 * ctrlBottom.y + b2 * br.y;
  }

  // Precompute left and right curve points for each row y
  const leftX = new Float32Array(maxHeight);
  const leftY = new Float32Array(maxHeight);
  const rightX = new Float32Array(maxHeight);
  const rightY = new Float32Array(maxHeight);

  for (let y = 0; y < maxHeight; y++) {
    const v = y / (maxHeight - 1);
    const v1 = 1 - v;
    const b0 = v1 * v1;
    const b1 = 2 * v1 * v;
    const b2 = v * v;

    leftX[y] = b0 * tl.x + b1 * ctrlLeft.x + b2 * bl.x;
    leftY[y] = b0 * tl.y + b1 * ctrlLeft.y + b2 * bl.y;

    rightX[y] = b0 * tr.x + b1 * ctrlRight.x + b2 * br.x;
    rightY[y] = b0 * tr.y + b1 * ctrlRight.y + b2 * br.y;
  }

  // Coons Patch Evaluation for all pixels (x, y)
  for (let y = 0; y < maxHeight; y++) {
    const v = y / (maxHeight - 1);
    const v1 = 1 - v;
    const rowOffset = y * maxWidth;

    const lx = leftX[y];
    const ly = leftY[y];
    const rx = rightX[y];
    const ry = rightY[y];

    for (let x = 0; x < maxWidth; x++) {
      const u = x / (maxWidth - 1);
      const u1 = 1 - u;

      const tx = topX[x];
      const ty = topY[x];
      const bx = botX[x];
      const by = botY[x];

      const cx = u1 * v1 * tl.x + u * v1 * tr.x + u * v * br.x + u1 * v * bl.x;
      const cy = u1 * v1 * tl.y + u * v1 * tr.y + u * v * br.y + u1 * v * bl.y;

      const px = v1 * tx + v * bx + u1 * lx + u * rx - cx;
      const py = v1 * ty + v * by + u1 * ly + u * ry - cy;

      const idx = rowOffset + x;
      mXData[idx] = px;
      mYData[idx] = py;
    }
  }

  let warped = new cv.Mat();
  try {
    cv.remap(srcMat, warped, mapX, mapY, cv.INTER_LINEAR, cv.BORDER_REPLICATE);
    return warped;
  } finally {
    mapX.delete();
    mapY.delete();
  }
}

/**
 * Illumination Correction & Shadow Removal via Morphological Background Division
 * and contrast enhancement / sharpening.
 */
function enhanceDocument(warpedMat, options = {}) {
  const mode = options.mode || "bw"; // 'bw' | 'grayscale' | 'color'
  const shadowKernelSize = options.shadowKernelSize || 31; // Odd number ~21..51
  const contrast = options.contrast !== undefined ? options.contrast : 1.2; // 0.8..2.0
  const sharpen = options.sharpen !== undefined ? options.sharpen : 1.2; // 0..2.5

  const w = warpedMat.cols;
  const h = warpedMat.rows;

  let kernel = null;
  let result = null;

  try {
    // Dynamic kernel size scaled to image resolution
    const ksize = Math.max(15, Math.min(65, Math.round((Math.max(w, h) / 1000) * shadowKernelSize) | 1));
    kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(ksize, ksize));

    if (mode === "color") {
      // Color Mode: Process Luminance (L) channel in LAB color space
      let rgb = new cv.Mat();
      let lab = new cv.Mat();
      let channels = new cv.MatVector();
      let L = null;
      let bgMap = new cv.Mat();
      let normL = new cv.Mat();
      let sharpL = new cv.Mat();

      try {
        cv.cvtColor(warpedMat, rgb, cv.COLOR_RGBA2RGB);
        cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
        cv.split(lab, channels);
        L = channels.get(0);

        // Morphological closing to remove text and estimate pure illumination
        cv.morphologyEx(L, bgMap, cv.MORPH_CLOSE, kernel);
        cv.divide(L, bgMap, normL, 255);

        // Sharpen L channel if requested
        if (sharpen > 0) {
          let blur = new cv.Mat();
          cv.GaussianBlur(normL, blur, new cv.Size(0, 0), 2.0);
          cv.addWeighted(normL, 1 + sharpen, blur, -sharpen, 0, normL);
          blur.delete();
        }

        // Contrast stretch
        normL.convertTo(normL, -1, contrast, (1 - contrast) * 128);

        // Replace L channel
        channels.set(0, normL);
        cv.merge(channels, lab);

        let outRgb = new cv.Mat();
        cv.cvtColor(lab, outRgb, cv.COLOR_Lab2RGB);
        result = new cv.Mat();
        cv.cvtColor(outRgb, result, cv.COLOR_RGB2RGBA);
        outRgb.delete();

        return result;
      } finally {
        rgb.delete();
        lab.delete();
        if (L) L.delete();
        bgMap.delete();
        normL.delete();
        channels.delete();
      }
    } else {
      // Grayscale or B&W Mode
      let gray = new cv.Mat();
      let bgMap = new cv.Mat();
      let normalized = new cv.Mat();

      try {
        cv.cvtColor(warpedMat, gray, cv.COLOR_RGBA2GRAY);

        // Morphological Closing for pure paper background map
        cv.morphologyEx(gray, bgMap, cv.MORPH_CLOSE, kernel);
        cv.divide(gray, bgMap, normalized, 255);

        if (mode === "bw") {
          // B&W Crisp Document Mode: Adaptive Thresholding
          let finalBw = new cv.Mat();
          const blockSize = Math.max(15, Math.round(ksize * 0.75) | 1);
          cv.adaptiveThreshold(
            normalized,
            finalBw,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY,
            blockSize,
            12
          );

          result = new cv.Mat();
          cv.cvtColor(finalBw, result, cv.COLOR_GRAY2RGBA);
          finalBw.delete();
          return result;
        } else {
          // Grayscale Scan Mode
          if (sharpen > 0) {
            let blur = new cv.Mat();
            cv.GaussianBlur(normalized, blur, new cv.Size(0, 0), 2.0);
            cv.addWeighted(normalized, 1 + sharpen, blur, -sharpen, 0, normalized);
            blur.delete();
          }

          normalized.convertTo(normalized, -1, contrast, (1 - contrast) * 128);

          result = new cv.Mat();
          cv.cvtColor(normalized, result, cv.COLOR_GRAY2RGBA);
          return result;
        }
      } finally {
        gray.delete();
        bgMap.delete();
        normalized.delete();
      }
    }
  } finally {
    if (kernel) kernel.delete();
  }
}

/**
 * Optional: Detects skin-tone protrusions in margins and inpaints them
 */
function inpaintMarginFingers(mat) {
  const w = mat.cols;
  const h = mat.rows;
  const marginX = Math.round(w * 0.12);
  const marginY = Math.round(h * 0.12);

  let rgb = new cv.Mat();
  let hsv = new cv.Mat();
  let mask = new cv.Mat();
  let marginMask = null;
  let kernel = null;
  let dst = null;

  try {
    cv.cvtColor(mat, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);

    // Skin tone range in HSV
    let low = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 25, 60, 0]);
    let high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [22, 175, 255, 0]);
    cv.inRange(hsv, low, high, mask);
    low.delete();
    high.delete();

    // Restrict mask to outer margins only
    marginMask = cv.Mat.zeros(h, w, cv.CV_8U);
    // Draw inner white rectangle (invert later)
    let innerRoi = new cv.Rect(marginX, marginY, w - 2 * marginX, h - 2 * marginY);
    let innerSub = marginMask.roi(innerRoi);
    innerSub.setTo(new cv.Scalar(255));
    innerSub.delete();
    cv.bitwise_not(marginMask, marginMask); // Now outer border is 255, inner is 0

    cv.bitwise_and(mask, marginMask, mask);

    // Check if any finger area was detected
    const fingerPixels = cv.countNonZero(mask);
    if (fingerPixels > 200 && fingerPixels < (w * h * 0.08)) {
      kernel = cv.Mat.ones(5, 5, cv.CV_8U);
      cv.dilate(mask, mask, kernel);

      dst = new cv.Mat();
      cv.inpaint(rgb, mask, dst, 3, cv.INPAINT_TELEA);

      let outRgba = new cv.Mat();
      cv.cvtColor(dst, outRgba, cv.COLOR_RGB2RGBA);
      return outRgba;
    }

    return null;
  } catch (err) {
    console.warn("Finger inpainting bypassed:", err);
    return null;
  } finally {
    rgb.delete();
    hsv.delete();
    mask.delete();
    if (marginMask) marginMask.delete();
    if (kernel) kernel.delete();
    if (dst) dst.delete();
  }
}

/**
 * 3D Geometric Curve Dewarping using Text Baseline Detection & Remap
 * Straightens lines curved by book binding / page curl.
 */
function dewarpTextCurves(srcMat, strength = 1.0) {
  const w = srcMat.cols;
  const h = srcMat.rows;
  if (w < 150 || h < 150 || strength <= 0) return null;

  let small = null;
  let gray = null;
  let thresh = null;
  let kernel = null;
  let connected = null;
  let borderMask = null;
  let contours = null;
  let hierarchy = null;
  let mapX = null;
  let mapY = null;
  let dst = null;

  try {
    const targetW = 600;
    const scale = targetW / w;
    const sw = targetW;
    const sh = Math.max(100, Math.round(h * scale));

    small = new cv.Mat();
    cv.resize(srcMat, small, new cv.Size(sw, sh), 0, 0, cv.INTER_AREA);

    gray = new cv.Mat();
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);

    // Detect spine gutter side (darker edge has the book spine)
    let leftDarkSum = 0, rightDarkSum = 0;
    const sampleW = Math.round(sw * 0.12);
    for (let y = 0; y < sh; y += 4) {
      for (let x = 0; x < sampleW; x += 2) {
        leftDarkSum += gray.ucharPtr(y, x)[0];
      }
      for (let x = sw - sampleW; x < sw; x += 2) {
        rightDarkSum += gray.ucharPtr(y, x)[0];
      }
    }
    const isSpineOnRight = rightDarkSum <= leftDarkSum; // Usually true for Page 1 (Left page)

    thresh = new cv.Mat();
    cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 8);

    // Clear 4% outer margins to remove dark frame/shadows that ruin contour detection
    const marginX = Math.round(sw * 0.04);
    const marginY = Math.round(sh * 0.03);
    borderMask = cv.Mat.zeros(sh, sw, cv.CV_8U);
    let innerRect = new cv.Rect(marginX, marginY, sw - 2 * marginX, sh - 2 * marginY);
    let innerRoi = borderMask.roi(innerRect);
    innerRoi.setTo(new cv.Scalar(255));
    innerRoi.delete();
    cv.bitwise_and(thresh, borderMask, thresh);

    // Merge adjacent text characters into horizontal text line bands (48px wide kernel)
    const kWidth = Math.max(28, Math.round(sw * 0.08));
    kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kWidth, 3));
    connected = new cv.Mat();
    cv.morphologyEx(thresh, connected, cv.MORPH_CLOSE, kernel);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(connected, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const minLineWidth = Math.round(sw * 0.12); // At least 12% page width (72px)
    const maxLineHeight = Math.round(sh * 0.10); // At most 10% height
    const numBins = 40;
    const binDeviations = Array.from({ length: numBins }, () => []);

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const rect = cv.boundingRect(cnt);
      cnt.delete();

      if (rect.width >= minLineWidth && rect.height <= maxLineHeight && (rect.width / rect.height) >= 2.0) {
        const pts = [];
        const stepX = Math.max(3, Math.round(rect.width / 25));

        for (let targetX = rect.x + 3; targetX <= rect.x + rect.width - 3; targetX += stepX) {
          let sumY = 0, countY = 0;
          for (let y = rect.y; y < rect.y + rect.height; y++) {
            if (connected.ucharPtr(y, targetX)[0] > 0) {
              sumY += y;
              countY++;
            }
          }
          if (countY > 0) {
            pts.push({ x: targetX, y: sumY / countY });
          }
        }

        if (pts.length >= 4) {
          const pStart = pts[0];
          const pEnd = pts[pts.length - 1];
          const dx = pEnd.x - pStart.x;
          if (dx > 15) {
            // Reference baseline is the flat side of the page (NOT a slanted diagonal line!)
            // Left page: flat side is left (pStart.y). Right page: flat side is right (pEnd.y).
            const refY = isSpineOnRight ? pStart.y : pEnd.y;
            for (const p of pts) {
              const dev = p.y - refY; // < 0 when text curls upwards near spine
              const binIdx = Math.max(0, Math.min(numBins - 1, Math.floor((p.x / sw) * numBins)));
              binDeviations[binIdx].push(dev);
            }
          }
        }
      }
    }

    // Compute median deviation for each horizontal bin
    const smoothed = new Float32Array(numBins);
    let validBins = 0;
    for (let b = 0; b < numBins; b++) {
      const devs = binDeviations[b];
      if (devs.length > 0) {
        devs.sort((a, b) => a - b);
        smoothed[b] = devs[Math.floor(devs.length / 2)]; // Median
        validBins++;
      } else {
        smoothed[b] = NaN;
      }
    }

    // Parametric book spine curl model (Flat body + single monotonic upward curl toward spine)
    const baseSpineAmp = (sh * 0.04);
    const parametricCurve = new Float32Array(numBins);
    for (let b = 0; b < numBins; b++) {
      const uNorm = b / (numBins - 1);
      if (isSpineOnRight) {
        // Flat on left (0 .. 0.5), curls upward (negative shift) near right spine
        const t = Math.max(0, (uNorm - 0.48) / 0.52);
        parametricCurve[b] = -baseSpineAmp * Math.pow(t, 2.0);
      } else {
        // Curls upward (negative shift) near left spine, flat on right (0.5 .. 1.0)
        const t = Math.max(0, ((1 - uNorm) - 0.48) / 0.52);
        parametricCurve[b] = -baseSpineAmp * Math.pow(t, 2.0);
      }
    }

    if (validBins >= 6) {
      // Fill missing bins
      let lastValidIdx = -1;
      for (let b = 0; b < numBins; b++) {
        if (!isNaN(smoothed[b])) {
          if (lastValidIdx === -1) {
            for (let k = 0; k < b; k++) smoothed[k] = smoothed[b];
          } else if (b - lastValidIdx > 1) {
            const v0 = smoothed[lastValidIdx];
            const v1 = smoothed[b];
            for (let k = lastValidIdx + 1; k < b; k++) {
              const t = (k - lastValidIdx) / (b - lastValidIdx);
              smoothed[k] = v0 + (v1 - v0) * t;
            }
          }
          lastValidIdx = b;
        }
      }
      if (lastValidIdx !== -1 && lastValidIdx < numBins - 1) {
        for (let k = lastValidIdx + 1; k < numBins; k++) {
          smoothed[k] = smoothed[lastValidIdx];
        }
      }

      // Smooth with moving average [0.25, 0.5, 0.25]
      for (let b = 0; b < numBins; b++) {
        const prev = b > 0 ? smoothed[b - 1] : smoothed[b];
        const curr = smoothed[b];
        const next = b < numBins - 1 ? smoothed[b + 1] : smoothed[b];
        smoothed[b] = 0.25 * prev + 0.5 * curr + 0.25 * next;
      }

      // Enforce physical monotonicity:
      // Flat side MUST stay flat (dev <= 0 only; positive values mean downward dip noise and must be zeroed!)
      if (isSpineOnRight) {
        const flatLimit = Math.round(numBins * 0.45);
        for (let b = 0; b <= flatLimit; b++) {
          smoothed[b] = 0;
        }
        let runningMin = 0;
        for (let b = flatLimit + 1; b < numBins; b++) {
          if (smoothed[b] < runningMin) runningMin = smoothed[b];
          smoothed[b] = runningMin; // Monotonically curl upwards toward spine
        }
      } else {
        const flatStart = Math.round(numBins * 0.55);
        for (let b = flatStart; b < numBins; b++) {
          smoothed[b] = 0;
        }
        let runningMin = 0;
        for (let b = flatStart - 1; b >= 0; b--) {
          if (smoothed[b] < runningMin) runningMin = smoothed[b];
          smoothed[b] = runningMin;
        }
      }
    } else {
      // Use parametric model if text lines are sparse
      for (let b = 0; b < numBins; b++) {
        smoothed[b] = parametricCurve[b];
      }
    }

    // Build shifts array for full resolution width w
    const shifts = new Float32Array(w);
    const maxShiftAllowed = h * 0.15; // Allow up to 15% height adjustment
    const invScale = 1.0 / scale;

    for (let x = 0; x < w; x++) {
      const u = (x / w) * (numBins - 1);
      const b0 = Math.floor(u);
      const b1 = Math.min(numBins - 1, b0 + 1);
      const t = u - b0;
      const dSmall = smoothed[b0] * (1 - t) + smoothed[b1] * t;
      let shiftY = dSmall * invScale * strength;

      if (shiftY > maxShiftAllowed) shiftY = maxShiftAllowed;
      else if (shiftY < -maxShiftAllowed) shiftY = -maxShiftAllowed;

      shifts[x] = shiftY;
    }

    mapX = new cv.Mat(h, w, cv.CV_32FC1);
    mapY = new cv.Mat(h, w, cv.CV_32FC1);

    const mXData = mapX.data32F;
    const mYData = mapY.data32F;

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x;
        mXData[idx] = x;
        mYData[idx] = y + shifts[x];
      }
    }

    dst = new cv.Mat();
    cv.remap(srcMat, dst, mapX, mapY, cv.INTER_LINEAR, cv.BORDER_REPLICATE);
    console.log(`[Dewarp] Dewarp applied successfully with strength=${strength}`);
    return dst;
  } catch (err) {
    console.warn("Dewarping bypassed due to error:", err);
    return null;
  } finally {
    if (small) small.delete();
    if (gray) gray.delete();
    if (thresh) thresh.delete();
    if (borderMask) borderMask.delete();
    if (kernel) kernel.delete();
    if (connected) connected.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
    if (mapX) mapX.delete();
    if (mapY) mapY.delete();
  }
}

/**
 * Detects central vertical gutter in double page spreads and splits image
 */
function splitDoublePageSpread(mat) {
  const w = mat.cols;
  const h = mat.rows;

  let gray = new cv.Mat();
  try {
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

    // Scan central 35% ~ 65% for the vertical binding gutter shadow
    const minX = Math.round(w * 0.35);
    const maxX = Math.round(w * 0.65);

    let minSum = Infinity;
    let splitX = Math.round(w * 0.5);

    // Sample every 4th row to find darkest column
    for (let x = minX; x <= maxX; x++) {
      let colSum = 0;
      for (let y = 0; y < h; y += 4) {
        colSum += gray.ucharPtr(y, x)[0];
      }
      if (colSum < minSum) {
        minSum = colSum;
        splitX = x;
      }
    }

    const rectLeft = new cv.Rect(0, 0, splitX, h);
    const rectRight = new cv.Rect(splitX, 0, w - splitX, h);

    const leftMat = mat.roi(rectLeft).clone();
    const rightMat = mat.roi(rectRight).clone();

    return { leftMat, rightMat, splitX };
  } finally {
    gray.delete();
  }
}

// -------------------------------------------------------------
// Message Dispatcher
// -------------------------------------------------------------
self.onmessage = async (e) => {
  const { id, action, payload } = e.data;

  try {
    if (action === "INIT") {
      await initOpenCV();
      self.postMessage({ id, status: "SUCCESS", result: { ready: true } });
      return;
    }

    await initOpenCV();

    if (action === "DETECT_CORNERS") {
      const { imageData } = payload;
      const corners = detectDocumentCorners(imageData);
      self.postMessage({ id, status: "SUCCESS", result: { corners } });
      return;
    }

    if (action === "PROCESS_IMAGE") {
      const { imageData, corners, curveHandles, options } = payload;
      const srcMat = imageDataToMat(imageData);
      let warpedMat = null;
      let fingerMat = null;
      let enhancedMat = null;

      try {
        // Step 1: 8-Point Curved Quad Warp (Photoshop style)
        if (curveHandles) {
          warpedMat = warpCurvedQuad(srcMat, corners, curveHandles);
        } else {
          warpedMat = warpPerspective(srcMat, corners);
        }

        // Step 2: Finger Inpainting (Optional)
        if (options && options.removeFingers) {
          fingerMat = inpaintMarginFingers(warpedMat);
        }
        const postFingerMat = fingerMat || warpedMat;

        // Step 3: Double Page Split (Optional)
        if (options && options.isDoublePage) {
          const split = splitDoublePageSpread(postFingerMat);
          if (split) {
            const enhLeft = enhanceDocument(split.leftMat, options);
            const enhRight = enhanceDocument(split.rightMat, options);

            const outLeft = matToImageData(enhLeft);
            const outRight = matToImageData(enhRight);

            split.leftMat.delete();
            split.rightMat.delete();
            enhLeft.delete();
            enhRight.delete();

            self.postMessage(
              {
                id,
                status: "SUCCESS",
                result: {
                  isSplit: true,
                  pages: [outLeft, outRight]
                }
              },
              [outLeft.data.buffer, outRight.data.buffer]
            );
            return;
          }
        }

        // Step 4: Shadow Removal & Enhancement
        enhancedMat = enhanceDocument(postFingerMat, options);
        const outData = matToImageData(enhancedMat);

        self.postMessage(
          {
            id,
            status: "SUCCESS",
            result: {
              isSplit: false,
              imageData: outData
            }
          },
          [outData.data.buffer]
        );
      } finally {
        srcMat.delete();
        if (warpedMat) warpedMat.delete();
        if (fingerMat) fingerMat.delete();
        if (enhancedMat) enhancedMat.delete();
      }
      return;
    }

    if (action === "ENHANCE_FULL_IMAGE") {
      const { imageData, options } = payload;
      const srcMat = imageDataToMat(imageData);
      let currentMat = srcMat;
      let dewarpedMat = null;
      let enhancedMat = null;

      try {
        const dewarpStrength = (options && options.dewarpStrength !== undefined) ? options.dewarpStrength : 1.0;
        if (options && options.dewarpCurves && dewarpStrength > 0) {
          dewarpedMat = dewarpTextCurves(srcMat, dewarpStrength);
          if (dewarpedMat) currentMat = dewarpedMat;
        }

        enhancedMat = enhanceDocument(currentMat, options);
        const outData = matToImageData(enhancedMat);

        self.postMessage(
          {
            id,
            status: "SUCCESS",
            result: {
              imageData: outData
            }
          },
          [outData.data.buffer]
        );
      } finally {
        srcMat.delete();
        if (dewarpedMat) dewarpedMat.delete();
        if (enhancedMat) enhancedMat.delete();
      }
      return;
    }

    if (action === "SPLIT_SPREAD") {
      const { imageData } = payload;
      const srcMat = imageDataToMat(imageData);
      let splitResult = null;

      try {
        splitResult = splitDoublePageSpread(srcMat);
        if (!splitResult) {
          const w = srcMat.cols;
          const h = srcMat.rows;
          const splitX = Math.round(w / 2);
          const rectLeft = new cv.Rect(0, 0, splitX, h);
          const rectRight = new cv.Rect(splitX, 0, w - splitX, h);
          const leftMat = srcMat.roi(rectLeft).clone();
          const rightMat = srcMat.roi(rectRight).clone();
          splitResult = { leftMat, rightMat, splitX };
        }

        const leftData = matToImageData(splitResult.leftMat);
        const rightData = matToImageData(splitResult.rightMat);

        self.postMessage(
          {
            id,
            status: "SUCCESS",
            result: {
              leftData,
              rightData,
              splitX: splitResult.splitX
            }
          },
          [leftData.data.buffer, rightData.data.buffer]
        );
      } finally {
        srcMat.delete();
        if (splitResult) {
          splitResult.leftMat.delete();
          splitResult.rightMat.delete();
        }
      }
      return;
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    console.error("Worker processing error:", err);
    self.postMessage({ id, status: "ERROR", error: err.message || String(err) });
  }
};
