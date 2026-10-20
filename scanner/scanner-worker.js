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
function dewarpTextCurves(srcMat) {
  const w = srcMat.cols;
  const h = srcMat.rows;
  if (w < 120 || h < 120) return null;

  let small = null;
  let gray = null;
  let thresh = null;
  let kernel = null;
  let connected = null;
  let contours = null;
  let hierarchy = null;
  let mapX = null;
  let mapY = null;
  let dst = null;

  try {
    const maxDim = 800;
    const scale = Math.min(1.0, maxDim / Math.max(w, h));
    const sw = Math.round(w * scale);
    const sh = Math.round(h * scale);

    small = new cv.Mat();
    cv.resize(srcMat, small, new cv.Size(sw, sh), 0, 0, cv.INTER_AREA);

    gray = new cv.Mat();
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);

    thresh = new cv.Mat();
    cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 8);

    const kWidth = Math.max(15, Math.round(sw * 0.04));
    kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kWidth, 3));
    connected = new cv.Mat();
    cv.morphologyEx(thresh, connected, cv.MORPH_CLOSE, kernel);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(connected, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const minLineWidth = sw * 0.18;
    const maxLineHeight = sh * 0.12;
    const lineDeviations = [];

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const rect = cv.boundingRect(cnt);

      if (rect.width >= minLineWidth && rect.height <= maxLineHeight && (rect.width / rect.height) >= 3) {
        const xStart = rect.x;
        const xEnd = rect.x + rect.width;
        const pts = [];
        const count = cnt.rows;
        const step = Math.max(4, Math.round(rect.width / 40));

        for (let targetX = xStart + 5; targetX <= xEnd - 5; targetX += step) {
          let minY = Infinity, maxY = -Infinity;
          for (let j = 0; j < count; j++) {
            const px = cnt.data32S[j * 2];
            const py = cnt.data32S[j * 2 + 1];
            if (Math.abs(px - targetX) <= 2) {
              if (py < minY) minY = py;
              if (py > maxY) maxY = py;
            }
          }
          if (minY !== Infinity) {
            pts.push({ x: targetX, y: (minY + maxY) / 2 });
          }
        }

        if (pts.length >= 6) {
          const pStart = pts[0];
          const pEnd = pts[pts.length - 1];
          const dx = pEnd.x - pStart.x;
          if (dx > 0) {
            for (const p of pts) {
              const expectedY = pStart.y + ((pEnd.y - pStart.y) / dx) * (p.x - pStart.x);
              lineDeviations.push({ x: p.x, d: p.y - expectedY });
            }
          }
        }
      }
      cnt.delete();
    }

    if (lineDeviations.length < 20) {
      return null;
    }

    let s4 = 0, s3 = 0, s2 = 0, s1 = 0, s0 = 0;
    let t2 = 0, t1 = 0, t0 = 0;

    for (const pt of lineDeviations) {
      const u = pt.x / sw;
      const d = pt.d;
      const u2 = u * u;
      s4 += u2 * u2;
      s3 += u2 * u;
      s2 += u2;
      s1 += u;
      s0 += 1;

      t2 += u2 * d;
      t1 += u * d;
      t0 += d;
    }

    const det3 = (m) => (
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    );

    const M = [[s4, s3, s2], [s3, s2, s1], [s2, s1, s0]];
    const D = det3(M);
    if (Math.abs(D) < 1e-7) return null;

    const Ma = [[t2, s3, s2], [t1, s2, s1], [t0, s1, s0]];
    const Mb = [[s4, t2, s2], [s3, t1, s1], [s2, t0, s0]];
    const Mc = [[s4, s3, t2], [s3, s2, t1], [s2, s1, t0]];

    const polyA = det3(Ma) / D;
    const polyB = det3(Mb) / D;
    const polyC = det3(Mc) / D;

    if (Math.abs(polyA) < 1.0) {
      return null;
    }

    const maxShiftAllowed = h * 0.08;
    const shifts = new Float32Array(w);

    const curveAt0 = polyC / scale;
    const curveAt1 = (polyA + polyB + polyC) / scale;

    for (let x = 0; x < w; x++) {
      const u = x / w;
      const dSmall = polyA * u * u + polyB * u + polyC;
      const dFull = dSmall / scale;
      const baseline = curveAt0 + (curveAt1 - curveAt0) * u;
      let shiftY = dFull - baseline;

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
    return dst;
  } catch (err) {
    console.warn("Dewarping bypassed due to error:", err);
    return null;
  } finally {
    if (small) small.delete();
    if (gray) gray.delete();
    if (thresh) thresh.delete();
    if (kernel) kernel.delete();
    if (connected) connected.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
    if (mapX) mapX.delete();
    if (mapY) mapY.delete();
  }
}

/**
 * Optional: Detects central vertical gutter in double page spreads and splits image
 */
function splitDoublePageSpread(mat) {
  const w = mat.cols;
  const h = mat.rows;
  if (w < h * 1.1) return null; // Not a wide landscape spread

  let gray = new cv.Mat();
  try {
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

    const minX = Math.round(w * 0.42);
    const maxX = Math.round(w * 0.58);

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
      const { imageData, corners, options } = payload;
      const srcMat = imageDataToMat(imageData);
      let warpedMat = null;
      let fingerMat = null;
      let dewarpedMat = null;
      let enhancedMat = null;

      try {
        // Step 1: Perspective Warp
        warpedMat = warpPerspective(srcMat, corners);

        // Step 2: Finger Inpainting (Optional)
        if (options && options.removeFingers) {
          fingerMat = inpaintMarginFingers(warpedMat);
        }
        const postFingerMat = fingerMat || warpedMat;

        // Step 2.5: Text Curve Dewarping (Optional)
        if (options && options.dewarpCurves) {
          dewarpedMat = dewarpTextCurves(postFingerMat);
        }
        const activeMat = dewarpedMat || postFingerMat;

        // Step 3: Double Page Split (Optional)
        if (options && options.isDoublePage) {
          const split = splitDoublePageSpread(activeMat);
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
        enhancedMat = enhanceDocument(activeMat, options);
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
        if (dewarpedMat) dewarpedMat.delete();
        if (enhancedMat) enhancedMat.delete();
      }
      return;
    }

    if (action === "ENHANCE_FULL_IMAGE") {
      const { imageData, options } = payload;
      const srcMat = imageDataToMat(imageData);
      let enhancedMat = null;

      try {
        enhancedMat = enhanceDocument(srcMat, options);
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
        if (enhancedMat) enhancedMat.delete();
      }
      return;
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    console.error("Worker processing error:", err);
    self.postMessage({ id, status: "ERROR", error: err.message || String(err) });
  }
};
