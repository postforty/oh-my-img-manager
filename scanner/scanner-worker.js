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

// Formats OpenCV C++ error pointers into human-readable exception messages
function formatCvError(err) {
  if (typeof cv !== "undefined" && typeof cv.exceptionFromPtr === "function" && typeof err === "number") {
    try {
      const info = cv.exceptionFromPtr(err);
      return `OpenCV Exception [code ${info.code}]: ${info.msg}`;
    } catch (_) {}
  }
  return (err && err.message) || String(err);
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
 * Fast multi-scale illumination estimation.
 * Downscales to estimate smooth paper background surface without text halos, then upscales.
 */
function estimateIllumination(grayMat, kernelSize = 31) {
  const w = grayMat.cols;
  const h = grayMat.rows;
  const maxDim = 800;
  const scale = Math.min(1.0, maxDim / Math.max(w, h));
  const sw = Math.max(50, Math.round(w * scale));
  const sh = Math.max(50, Math.round(h * scale));

  let small = new cv.Mat();
  let smallBg = new cv.Mat();
  let bgMap = new cv.Mat();
  let morphKernel = null;

  try {
    cv.resize(grayMat, small, new cv.Size(sw, sh), 0, 0, cv.INTER_AREA);

    // Dynamic kernel scaled to low-res dimension for instant processing
    const k = Math.max(15, Math.min(51, Math.round((Math.max(sw, sh) / 600) * kernelSize) | 1));
    morphKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(k, k));

    // Morphological closing to fill out text and line drawings
    cv.morphologyEx(small, smallBg, cv.MORPH_CLOSE, morphKernel);

    // Large blur to eliminate any boundary halos around titles/figures
    const blurK = Math.max(15, Math.round(k * 1.2) | 1);
    cv.GaussianBlur(smallBg, smallBg, new cv.Size(blurK, blurK), 0);

    // Upscale smooth background map back to native resolution
    cv.resize(smallBg, bgMap, new cv.Size(w, h), 0, 0, cv.INTER_CUBIC);

    return bgMap;
  } finally {
    small.delete();
    smallBg.delete();
    if (morphKernel) morphKernel.delete();
  }
}

/**
 * Detects persistent spine/gutter shadow bands and scanner border artifacts in outer margins.
 * Leaves text completely untouched while rolling outer shadows smoothly to paper white (255).
 */
function suppressMarginGutterShadows(grayMat) {
  const w = grayMat.cols;
  const h = grayMat.rows;
  const data = grayMat.data;

  // Outer 12% on left and right
  const maxMarginW = Math.round(w * 0.12);
  const sampleStepY = 4;
  const numSampleRows = Math.floor((h * 0.8) / sampleStepY);

  // Left Gutter: check if edge columns are dominated by dark pixels (>40% vertical darkness)
  let gutterEndLeft = 0;
  for (let x = 0; x < maxMarginW; x++) {
    let darkCount = 0;
    for (let y = Math.round(h * 0.1); y < Math.round(h * 0.9); y += sampleStepY) {
      if (data[y * w + x] < 145) darkCount++;
    }
    if (darkCount >= numSampleRows * 0.35) {
      gutterEndLeft = x + 3;
    } else if (gutterEndLeft > 0 && x > gutterEndLeft + 5) {
      break;
    }
  }

  // Right Gutter: check rightmost columns
  let gutterStartRight = w;
  for (let x = w - 1; x >= w - maxMarginW; x--) {
    let darkCount = 0;
    for (let y = Math.round(h * 0.1); y < Math.round(h * 0.9); y += sampleStepY) {
      if (data[y * w + x] < 145) darkCount++;
    }
    if (darkCount >= numSampleRows * 0.35) {
      gutterStartRight = x - 3;
    } else if (gutterStartRight < w && x < gutterStartRight - 5) {
      break;
    }
  }

  // Smoothly blend left gutter band to pure paper white (255)
  if (gutterEndLeft > 0) {
    const fadeW = Math.min(gutterEndLeft + 10, maxMarginW);
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x <= fadeW; x++) {
        const val = data[rowOffset + x];
        if (val < 248) {
          const t = Math.min(1.0, x / Math.max(1, fadeW));
          const wgt = t * t; // Ease-in: 0 at edge (100% white), 1 at inner boundary
          data[rowOffset + x] = Math.round(val * wgt + 255 * (1 - wgt));
        }
      }
    }
  }

  // Smoothly blend right gutter band to pure paper white (255)
  if (gutterStartRight < w) {
    const fadeW = Math.max(gutterStartRight - 10, w - maxMarginW);
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = fadeW; x < w; x++) {
        const val = data[rowOffset + x];
        if (val < 248) {
          const t = Math.min(1.0, (w - 1 - x) / Math.max(1, w - 1 - fadeW));
          const wgt = t * t;
          data[rowOffset + x] = Math.round(val * wgt + 255 * (1 - wgt));
        }
      }
    }
  }
}

/**
 * Illumination Correction & Clean Document Scanner Pipeline.
 * Eliminates shadows, purges salt-and-pepper background noise, and creates crisp text scans.
 */
function enhanceDocument(warpedMat, options = {}) {
  const mode = options.mode || "bw"; // 'bw' | 'grayscale' | 'color'
  const shadowKernelSize = options.shadowKernelSize || 31; // 15..51
  const contrast = options.contrast !== undefined ? options.contrast : 1.2; // 0.8..2.0
  const sharpen = options.sharpen !== undefined ? options.sharpen : 1.2; // 0..2.5

  const w = warpedMat.cols;
  const h = warpedMat.rows;

  let result = null;

  try {
    if (mode === "color") {
      // Color Mode: Process Luminance (L) channel in LAB color space
      let rgb = new cv.Mat();
      let lab = new cv.Mat();
      let channels = new cv.MatVector();
      let L = null;
      let bgMap = null;
      let normL = new cv.Mat();

      try {
        cv.cvtColor(warpedMat, rgb, cv.COLOR_RGBA2RGB);
        cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
        cv.split(lab, channels);
        L = channels.get(0);

        // Fast multi-scale illumination estimation on L channel
        bgMap = estimateIllumination(L, shadowKernelSize);
        cv.divide(L, bgMap, normL, 255);

        // Suppress gutter/spine shadows in outer margins
        suppressMarginGutterShadows(normL);

        // Sharpen L channel if requested
        if (sharpen > 0) {
          let blur = new cv.Mat();
          cv.GaussianBlur(normL, blur, new cv.Size(0, 0), 1.5);
          cv.addWeighted(normL, 1 + sharpen * 0.7, blur, -sharpen * 0.7, 0, normL);
          blur.delete();
        }

        // Contrast stretch with gentle paper white cutoff
        normL.convertTo(normL, -1, contrast, (1 - contrast) * 128);

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
        if (bgMap) bgMap.delete();
        normL.delete();
        channels.delete();
      }
    } else {
      // Grayscale or B&W Crisp Scanner Mode
      let gray = new cv.Mat();
      let bgMap = null;
      let normalized = new cv.Mat();

      try {
        cv.cvtColor(warpedMat, gray, cv.COLOR_RGBA2GRAY);

        // Fast multi-scale illumination estimation on grayscale
        bgMap = estimateIllumination(gray, shadowKernelSize);
        cv.divide(gray, bgMap, normalized, 255);

        // Suppress gutter/spine shadows in outer margins
        suppressMarginGutterShadows(normalized);

        if (mode === "bw") {
          // B&W Crisp Document Mode (vFlat/CamScanner style clean paper):
          // 1. Sharpening
          if (sharpen > 0) {
            let blur = new cv.Mat();
            cv.GaussianBlur(normalized, blur, new cv.Size(0, 0), 1.5);
            cv.addWeighted(normalized, 1 + sharpen * 0.7, blur, -sharpen * 0.7, 0, normalized);
            blur.delete();
          }

          // 2. Contrast stretching
          let stretched = new cv.Mat();
          normalized.convertTo(stretched, -1, contrast, (1 - contrast) * 128);

          // 3. Adaptive thresholding for crisp letter contours
          let adaptiveBw = new cv.Mat();
          const blockSize = Math.max(19, Math.min(81, Math.round((Math.max(w, h) / 1000) * 35) | 1));
          cv.adaptiveThreshold(
            stretched,
            adaptiveBw,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY,
            blockSize,
            7
          );

          // 4. Pure white background floor mask:
          // Removes all salt-and-pepper background speckles in empty margins
          let bgMask = new cv.Mat();
          cv.threshold(normalized, bgMask, 185, 255, cv.THRESH_BINARY);

          let rawBw = new cv.Mat();
          cv.bitwise_or(adaptiveBw, bgMask, rawBw);

          // 5. Stroke Smoothing & Salt-and-Pepper Denoise:
          // Median blur (size 3) purges 1-2px speckle noise and smooths jagged font outlines
          let finalBw = new cv.Mat();
          cv.medianBlur(rawBw, finalBw, 3);

          result = new cv.Mat();
          cv.cvtColor(finalBw, result, cv.COLOR_GRAY2RGBA);

          stretched.delete();
          adaptiveBw.delete();
          bgMask.delete();
          rawBw.delete();
          finalBw.delete();
          return result;
        } else {
          // Grayscale Scan Mode
          if (sharpen > 0) {
            let blur = new cv.Mat();
            cv.GaussianBlur(normalized, blur, new cv.Size(0, 0), 1.5);
            cv.addWeighted(normalized, 1 + sharpen * 0.7, blur, -sharpen * 0.7, 0, normalized);
            blur.delete();
          }

          // Contrast stretch
          normalized.convertTo(normalized, -1, contrast, (1 - contrast) * 128);

          result = new cv.Mat();
          cv.cvtColor(normalized, result, cv.COLOR_GRAY2RGBA);
          return result;
        }
      } finally {
        gray.delete();
        if (bgMap) bgMap.delete();
        normalized.delete();
      }
    }
  } catch (err) {
    console.error("enhanceDocument error:", formatCvError(err));
    try {
      if (warpedMat && typeof warpedMat.clone === "function") {
        return warpedMat.clone();
      }
    } catch (_) {}
    return null;
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
 * Automatically detects the skew angle (in degrees) of horizontal text lines.
 * Returns the median angle in degrees (positive = CCW, negative = CW).
 */
function detectTextSkewAngle(srcMat) {
  const w = srcMat.cols;
  const h = srcMat.rows;
  if (w < 150 || h < 150) return 0;

  let small = null;
  let gray = null;
  let thresh = null;
  let borderMask = null;
  let kernel = null;
  let connected = null;
  let contours = null;
  let hierarchy = null;

  try {
    const sw = 600;
    const sh = Math.max(100, Math.round((h * sw) / w));

    small = new cv.Mat();
    cv.resize(srcMat, small, new cv.Size(sw, sh), 0, 0, cv.INTER_AREA);

    gray = new cv.Mat();
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);

    thresh = new cv.Mat();
    cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 21, 7);

    // Clear outer 3% margin to remove frame artifacts
    const mx = Math.round(sw * 0.03);
    const my = Math.round(sh * 0.03);
    borderMask = cv.Mat.zeros(sh, sw, cv.CV_8U);
    const roi = borderMask.roi(new cv.Rect(mx, my, sw - 2 * mx, sh - 2 * my));
    roi.setTo(new cv.Scalar(255));
    roi.delete();
    cv.bitwise_and(thresh, borderMask, thresh);

    // Horizontally merge adjacent characters into full text lines
    const kWidth = Math.max(25, Math.round(sw * 0.06));
    kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kWidth, 3));
    connected = new cv.Mat();
    cv.morphologyEx(thresh, connected, cv.MORPH_CLOSE, kernel);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(connected, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const minLineWidth = Math.round(sw * 0.12);
    const maxLineHeight = Math.round(sh * 0.08);
    const candidates = [];

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const rect = cv.boundingRect(cnt);
      cnt.delete();

      if (rect.width >= minLineWidth && rect.height <= maxLineHeight && (rect.width / Math.max(1, rect.height)) >= 2.5) {
        const xCutLeft = rect.x + Math.round(rect.width * 0.20);
        const xCutRight = rect.x + Math.round(rect.width * 0.80);

        let sumY1 = 0, count1 = 0, sumX1 = 0;
        let sumY2 = 0, count2 = 0, sumX2 = 0;

        const connData = connected.data;
        for (let y = rect.y; y < rect.y + rect.height; y++) {
          const rowOffset = y * sw;
          for (let x = rect.x; x <= xCutLeft; x += 2) {
            if (connData[rowOffset + x] > 0) {
              sumX1 += x; sumY1 += y; count1++;
            }
          }
          for (let x = xCutRight; x <= rect.x + rect.width; x += 2) {
            if (connData[rowOffset + x] > 0) {
              sumX2 += x; sumY2 += y; count2++;
            }
          }
        }

        if (count1 >= 5 && count2 >= 5) {
          const x1 = sumX1 / count1;
          const y1 = sumY1 / count1;
          const x2 = sumX2 / count2;
          const y2 = sumY2 / count2;
          const dx = x2 - x1;
          const dy = y2 - y1;
          if (dx > 30) {
            const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
            if (Math.abs(angleDeg) <= 12.0) {
              candidates.push({ angle: angleDeg, width: rect.width });
            }
          }
        }
      }
    }

    if (candidates.length === 0) return 0;

    // Prioritize long paragraph lines (width >= 28% page) over short bubble texts
    const longThreshold = sw * 0.28;
    const longLines = candidates.filter(c => c.width >= longThreshold);
    const activeList = longLines.length >= 2 ? longLines : candidates;

    activeList.sort((a, b) => a.angle - b.angle);
    const medianAngle = activeList[Math.floor(activeList.length / 2)].angle;
    return medianAngle;
  } catch (err) {
    console.warn("[Deskew] Angle estimation error:", err);
    return 0;
  } finally {
    if (small) small.delete();
    if (gray) gray.delete();
    if (thresh) thresh.delete();
    if (borderMask) borderMask.delete();
    if (kernel) kernel.delete();
    if (connected) connected.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }
}

/**
 * Estimates whether book spine gutter is on "right" or "left"
 */
function estimateSpineSide(mat) {
  const w = mat.cols;
  const h = mat.rows;
  let small = null;
  let gray = null;

  try {
    const sw = 400;
    const sh = Math.max(100, Math.round((h * sw) / w));

    small = new cv.Mat();
    cv.resize(mat, small, new cv.Size(sw, sh), 0, 0, cv.INTER_AREA);

    gray = new cv.Mat();
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);

    // Measure outer text margins
    let leftMarginSum = 0, rightMarginSum = 0, validRows = 0;
    const yStart = Math.round(sh * 0.20);
    const yEnd = Math.round(sh * 0.80);

    const grayData = gray.data;
    for (let y = yStart; y < yEnd; y += 4) {
      const rowOffset = y * sw;
      let firstTextX = -1;
      let lastTextX = -1;
      for (let x = 0; x < sw; x += 2) {
        if (grayData[rowOffset + x] < 150) {
          if (firstTextX === -1) firstTextX = x;
          lastTextX = x;
        }
      }
      if (firstTextX !== -1 && lastTextX > firstTextX + 40) {
        leftMarginSum += firstTextX;
        rightMarginSum += (sw - 1 - lastTextX);
        validRows++;
      }
    }

    if (validRows >= 5) {
      const avgLeftMargin = leftMarginSum / validRows;
      const avgRightMargin = rightMarginSum / validRows;
      // In a book page, the outer margin is typically much wider than the gutter margin.
      // If left margin is wider, text is pushed toward right spine -> spine is on the right!
      if (avgLeftMargin > avgRightMargin * 1.35) return "right";
      if (avgRightMargin > avgLeftMargin * 1.35) return "left";
    }

    // Secondary check: spine edge is darker due to binding curvature shadow
    let leftDarkSum = 0, rightDarkSum = 0;
    const sampleW = Math.round(sw * 0.12);
    for (let y = 0; y < sh; y += 4) {
      const rowOffset = y * sw;
      for (let x = 0; x < sampleW; x += 2) {
        leftDarkSum += (255 - grayData[rowOffset + x]);
      }
      for (let x = sw - sampleW; x < sw; x += 2) {
        rightDarkSum += (255 - grayData[rowOffset + x]);
      }
    }

    return rightDarkSum >= leftDarkSum ? "right" : "left";
  } catch (err) {
    return "right";
  } finally {
    if (small) small.delete();
    if (gray) gray.delete();
  }
}

/**
 * Catmull-Rom Cubic Spline interpolation
 * Smoothly interpolates an array of control points into a continuous C1/C2 curve.
 */
function interpolateSpline(points, t) {
  const p0 = points[0];
  const p1 = points[1];
  const p2 = points[2];
  const p3 = points[3];

  const t2 = t * t;
  const t3 = t2 * t;

  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

/**
 * Self-Adaptive Data-Driven Dewarping.
 * Profiles actual text line trajectories across N columns.
 * Automatically levels any curvature: convex arch (∩), sagging (U), spine curl, or keeps flat pages untouched.
 */
function calculateAdaptiveDewarpShifts(mat, strength = 1.0) {
  const w = mat.cols;
  const h = mat.rows;
  const sw = 600;
  const sh = Math.max(100, Math.round((h * sw) / w));
  const scale = sw / w;
  const invScale = 1.0 / scale;

  let small = null;
  let gray = null;
  let thresh = null;
  let borderMask = null;
  let kernel = null;
  let connected = null;
  let contours = null;
  let hierarchy = null;

  const NUM_BUCKETS = 24; // 24 sampling stations across page width
  const bucketOffsets = Array.from({ length: NUM_BUCKETS }, () => []);
  let validLinesCount = 0;

  try {
    small = new cv.Mat();
    cv.resize(mat, small, new cv.Size(sw, sh), 0, 0, cv.INTER_AREA);

    gray = new cv.Mat();
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);

    thresh = new cv.Mat();
    cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 21, 7);

    // Mask out 3% margin to remove frame artifacts
    borderMask = cv.Mat.zeros(sh, sw, cv.CV_8U);
    const mx = Math.round(sw * 0.03);
    const my = Math.round(sh * 0.03);
    const roi = borderMask.roi(new cv.Rect(mx, my, sw - 2 * mx, sh - 2 * my));
    roi.setTo(new cv.Scalar(255));
    roi.delete();
    cv.bitwise_and(thresh, borderMask, thresh);

    // Merge characters into solid text line bands
    const kWidth = Math.max(25, Math.round(sw * 0.07));
    kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kWidth, 3));
    connected = new cv.Mat();
    cv.morphologyEx(thresh, connected, cv.MORPH_CLOSE, kernel);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(connected, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const connData = connected.data;

    // Filter substantial text lines in main body
    const minLineWidth = Math.round(sw * 0.22);
    const maxLineHeight = Math.round(sh * 0.09);
    const bodyTop = Math.round(sh * 0.04);
    const bodyBottom = Math.round(sh * 0.96);

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const rect = cv.boundingRect(cnt);
      cnt.delete();

      if (
        rect.y >= bodyTop &&
        (rect.y + rect.height) <= bodyBottom &&
        rect.width >= minLineWidth &&
        rect.height <= maxLineHeight &&
        (rect.width / Math.max(1, rect.height)) >= 2.0
      ) {
        // Collect Y-center coordinates at each bucket station that intersects this line
        const lineBucketY = new Map();
        let sumY = 0;
        let countY = 0;

        for (let b = 0; b < NUM_BUCKETS; b++) {
          const bx = Math.round((b / (NUM_BUCKETS - 1)) * (sw - 1));
          if (bx >= rect.x + 4 && bx <= rect.x + rect.width - 4) {
            let colSumY = 0;
            let colCount = 0;
            const xMin = Math.max(rect.x, bx - 2);
            const xMax = Math.min(rect.x + rect.width - 1, bx + 2);
            for (let tx = xMin; tx <= xMax; tx++) {
              for (let y = rect.y; y < rect.y + rect.height; y++) {
                if (connData[y * sw + tx] > 0) {
                  colSumY += y;
                  colCount++;
                }
              }
            }
            if (colCount >= 4) {
              const cy = colSumY / colCount;
              lineBucketY.set(b, cy);
              sumY += cy;
              countY++;
            }
          }
        }

        // Only accept lines that span across at least 4 buckets
        if (countY >= 4) {
          validLinesCount++;
          const meanY = sumY / countY;
          for (const [b, cy] of lineBucketY.entries()) {
            bucketOffsets[b].push(cy - meanY);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[AdaptiveDewarp] Curvature extraction error:", formatCvError(err));
  } finally {
    if (small) small.delete();
    if (gray) gray.delete();
    if (thresh) thresh.delete();
    if (borderMask) borderMask.delete();
    if (kernel) kernel.delete();
    if (connected) connected.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }

  const shifts = new Float32Array(w);

  // If insufficient lines, keep straight
  if (validLinesCount < 2) {
    console.log(`[AdaptiveDewarp] Insufficient text lines (${validLinesCount}) for curvature modeling.`);
    return shifts;
  }

  // Aggregate bucket deviations using median to get raw profile F[b]
  const rawProfile = new Float32Array(NUM_BUCKETS);
  const validBuckets = [];

  for (let b = 0; b < NUM_BUCKETS; b++) {
    const list = bucketOffsets[b];
    if (list.length > 0) {
      list.sort((a, b) => a - b);
      rawProfile[b] = list[Math.floor(list.length / 2)];
      validBuckets.push(b);
    } else {
      rawProfile[b] = 0;
    }
  }

  // Need at least 6 valid buckets across the page
  if (validBuckets.length < 6) {
    console.log(`[AdaptiveDewarp] Text coverage too sparse (${validBuckets.length} buckets).`);
    return shifts;
  }

  // Fill in any missing buckets by linear interpolation from nearest valid neighbors
  for (let b = 0; b < NUM_BUCKETS; b++) {
    if (bucketOffsets[b].length === 0) {
      let prev = b - 1;
      while (prev >= 0 && bucketOffsets[prev].length === 0) prev--;
      let next = b + 1;
      while (next < NUM_BUCKETS && bucketOffsets[next].length === 0) next++;

      if (prev >= 0 && next < NUM_BUCKETS) {
        const t = (b - prev) / (next - prev);
        rawProfile[b] = (1 - t) * rawProfile[prev] + t * rawProfile[next];
      } else if (prev >= 0) {
        rawProfile[b] = rawProfile[prev];
      } else if (next < NUM_BUCKETS) {
        rawProfile[b] = rawProfile[next];
      }
    }
  }

  // Smooth the raw profile with a 3-tap low-pass filter (0.25, 0.5, 0.25)
  const smoothed = new Float32Array(NUM_BUCKETS);
  for (let b = 0; b < NUM_BUCKETS; b++) {
    const p0 = (b > 0) ? rawProfile[b - 1] : rawProfile[b];
    const p1 = rawProfile[b];
    const p2 = (b < NUM_BUCKETS - 1) ? rawProfile[b + 1] : rawProfile[b];
    smoothed[b] = 0.25 * p0 + 0.5 * p1 + 0.25 * p2;
  }

  // Baseline reference: strictly horizontal target level to eliminate both arching and residual tilt
  const refStart = (smoothed[0] + smoothed[1]) / 2;
  const refEnd = (smoothed[NUM_BUCKETS - 2] + smoothed[NUM_BUCKETS - 1]) / 2;
  const targetLevel = (refStart + refEnd) / 2;

  // Compute curvature & tilt deviation relative to perfect horizontal baseline
  const deviations = new Float32Array(NUM_BUCKETS);
  let minDev = Infinity;
  let maxDev = -Infinity;

  for (let b = 0; b < NUM_BUCKETS; b++) {
    deviations[b] = smoothed[b] - targetLevel;
    if (deviations[b] < minDev) minDev = deviations[b];
    if (deviations[b] > maxDev) maxDev = deviations[b];
  }

  const peakToPeak = maxDev - minDev;
  const minCurlThreshold = 1.0; // in 600px width scale

  if (peakToPeak < minCurlThreshold) {
    console.log(`[AdaptiveDewarp] Page text is already straight (measured curvature: ${peakToPeak.toFixed(2)}px < ${minCurlThreshold}px). No warp needed.`);
    return shifts;
  }

  // Characterize detected shape
  const midIndex = Math.floor(NUM_BUCKETS / 2);
  const midDev = (deviations[midIndex - 1] + deviations[midIndex] + deviations[midIndex + 1]) / 3;
  let shapeDesc = "Complex Wave";
  if (midDev < -0.6) shapeDesc = "Convex Arch / Hill (∩)";
  else if (midDev > 0.6) shapeDesc = "Concave Sagging (U)";
  else if (Math.abs(deviations[2] - deviations[NUM_BUCKETS - 3]) > 1.5) shapeDesc = "Asymmetric Spine Curl";

  console.log(`[AdaptiveDewarp] Detected text curvature: ${shapeDesc} (peak-to-peak=${peakToPeak.toFixed(2)}px, mid=${midDev.toFixed(2)}px). Applying adaptive leveling with 1.25x boost, strength=${strength}.`);

  // Compute control point shifts at 24 stations with 1.25x boost factor
  // Compensates for morphological text band smoothing attenuation
  const BOOST_FACTOR = 1.25;
  const maxAllowed = h * 0.08;
  const stationShifts = new Float32Array(NUM_BUCKETS);
  for (let b = 0; b < NUM_BUCKETS; b++) {
    const target = deviations[b] * BOOST_FACTOR * invScale * strength;
    stationShifts[b] = Math.max(-maxAllowed, Math.min(maxAllowed, target));
  }

  // Spline interpolation across all x columns for C1/C2 smooth continuity
  for (let x = 0; x < w; x++) {
    const normX = (x / (w - 1)) * (NUM_BUCKETS - 1);
    const i1 = Math.floor(normX);
    const i2 = Math.min(NUM_BUCKETS - 1, i1 + 1);
    const i0 = Math.max(0, i1 - 1);
    const i3 = Math.min(NUM_BUCKETS - 1, i2 + 1);

    const t = normX - i1;
    const pts = [stationShifts[i0], stationShifts[i1], stationShifts[i2], stationShifts[i3]];
    shifts[x] = interpolateSpline(pts, t);
  }

  return shifts;
}

/**
 * Applies vertical column displacement shifts[x] to Mat.
 * High-speed linear interpolation typed-array implementation: 100% stable, zero WASM OOM.
 */
function applyVerticalColumnShifts(srcMat, shifts) {
  const w = srcMat.cols;
  const h = srcMat.rows;
  let dstMat = null;

  try {
    dstMat = new cv.Mat(h, w, cv.CV_8UC4);

    const srcData = srcMat.data;
    const dstData = dstMat.data;

    for (let x = 0; x < w; x++) {
      const shift = shifts[x] || 0;
      const sFloor = Math.floor(shift);
      const frac = shift - sFloor;
      const invFrac = 1.0 - frac;

      for (let y = 0; y < h; y++) {
        const dstIdx = (y * w + x) * 4;
        const y0 = y + sFloor;
        const y1 = y0 + 1;

        if (y0 >= 0 && y1 < h) {
          const idx0 = (y0 * w + x) * 4;
          const idx1 = (y1 * w + x) * 4;
          dstData[dstIdx]     = (srcData[idx0]     * invFrac + srcData[idx1]     * frac) | 0;
          dstData[dstIdx + 1] = (srcData[idx0 + 1] * invFrac + srcData[idx1 + 1] * frac) | 0;
          dstData[dstIdx + 2] = (srcData[idx0 + 2] * invFrac + srcData[idx1 + 2] * frac) | 0;
          dstData[dstIdx + 3] = (srcData[idx0 + 3] * invFrac + srcData[idx1 + 3] * frac) | 0;
        } else {
          const clampY = Math.max(0, Math.min(h - 1, y0));
          const idx = (clampY * w + x) * 4;
          dstData[dstIdx]     = srcData[idx];
          dstData[dstIdx + 1] = srcData[idx + 1];
          dstData[dstIdx + 2] = srcData[idx + 2];
          dstData[dstIdx + 3] = srcData[idx + 3];
        }
      }
    }

    return dstMat;
  } catch (err) {
    if (dstMat) {
      try { dstMat.delete(); } catch (_) {}
    }
    throw err;
  }
}

/**
 * 3D Geometric Curve Dewarping using Deskew, Spine Detection & Column Unwarp.
 * Straightens page tilt and curved text near the book spine.
 */
function dewarpTextCurves(srcMat, options = {}) {
  const strength = typeof options === "number" ? options : (options.dewarpStrength ?? 1.0);
  if (strength <= 0) return null;

  const w = srcMat.cols;
  const h = srcMat.rows;
  if (w < 150 || h < 150) return null;

  let currentMat = null;
  let rotM = null;
  let deskewedMat = null;
  let dewarpedMat = null;

  try {
    // Step 1: Auto-Deskew
    const skewAngle = detectTextSkewAngle(srcMat);
    console.log(`[Dewarp] Detected skew angle: ${skewAngle.toFixed(2)} deg`);

    if (Math.abs(skewAngle) >= 0.15 && Math.abs(skewAngle) <= 12.0) {
      const center = new cv.Point(w / 2, h / 2);
      // Passing skewAngle applies leveling rotation
      rotM = cv.getRotationMatrix2D(center, skewAngle, 1.0);
      deskewedMat = new cv.Mat();
      cv.warpAffine(srcMat, deskewedMat, rotM, new cv.Size(w, h), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
      currentMat = deskewedMat;
      console.log(`[Dewarp] Auto-Deskew applied with angle ${skewAngle.toFixed(2)} deg`);
    } else {
      currentMat = srcMat.clone();
    }

    // Step 2: Self-Adaptive Data-Driven Dewarp Shifts (Convex, Concave, Spine Curl, Flat)
    const shifts = calculateAdaptiveDewarpShifts(currentMat, strength);

    // Step 3: Apply Column Remap
    dewarpedMat = applyVerticalColumnShifts(currentMat, shifts);
    console.log(`[Dewarp] Dewarp completed successfully with strength=${strength}`);

    return dewarpedMat;
  } catch (err) {
    console.warn("[Dewarp] Dewarping error, falling back to original:", formatCvError(err));
    if (dewarpedMat) {
      try { dewarpedMat.delete(); } catch (_) {}
      dewarpedMat = null;
    }
    return null;
  } finally {
    if (rotM) rotM.delete();
    if (deskewedMat && deskewedMat !== dewarpedMat) deskewedMat.delete();
    if (currentMat && currentMat !== srcMat && currentMat !== deskewedMat && currentMat !== dewarpedMat) currentMat.delete();
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

    const center = w * 0.5;
    const grayData = gray.data;
    for (let x = minX; x <= maxX; x++) {
      let colSum = 0;
      for (let y = 0; y < h; y += 4) {
        colSum += grayData[y * w + x];
      }
      // Gentle penalty for distance from center to prevent latching onto inner text margins
      const distRatio = Math.abs(x - center) / (w * 0.15);
      const score = colSum * (1.0 + 0.35 * distRatio);
      if (score < minSum) {
        minSum = score;
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

/**
 * Detects optimal crop bounding box around active document content.
 * Discards outer scanner bed margins while preserving headers, body, diagrams, and page numbers.
 */
function detectSmartCropBounds(mat) {
  const w = mat.cols;
  const h = mat.rows;
  const sw = 600;
  const sh = Math.max(100, Math.round((h * sw) / w));

  let small = new cv.Mat();
  let gray = new cv.Mat();
  let thresh = new cv.Mat();
  let mask = null;

  try {
    cv.resize(mat, small, new cv.Size(sw, sh), 0, 0, cv.INTER_AREA);
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);

    // Otsu threshold to separate dark text/ink from white paper
    cv.threshold(gray, thresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

    // Clear outer 2.5% to disregard any extreme scanner frame/bed borders
    const borderMx = Math.round(sw * 0.025);
    const borderMy = Math.round(sh * 0.025);
    mask = cv.Mat.zeros(sh, sw, cv.CV_8U);
    const roi = mask.roi(new cv.Rect(borderMx, borderMy, sw - 2 * borderMx, sh - 2 * borderMy));
    roi.setTo(new cv.Scalar(255));
    roi.delete();
    cv.bitwise_and(thresh, mask, thresh);

    const threshData = thresh.data;

    // Horizontal & vertical projections
    const rowCounts = new Int32Array(sh);
    const colCounts = new Int32Array(sw);

    for (let y = borderMy; y < sh - borderMy; y++) {
      const rowOffset = y * sw;
      for (let x = borderMx; x < sw - borderMx; x++) {
        if (threshData[rowOffset + x] > 0) {
          rowCounts[y]++;
          colCounts[x]++;
        }
      }
    }

    // Threshold for content presence
    const contentThreshRow = Math.max(3, Math.round(sw * 0.005));
    const contentThreshCol = Math.max(3, Math.round(sh * 0.005));

    let top = borderMy;
    while (top < sh - borderMy && rowCounts[top] < contentThreshRow) top++;

    let bottom = sh - 1 - borderMy;
    while (bottom > top && rowCounts[bottom] < contentThreshRow) bottom--;

    let left = borderMx;
    while (left < sw - borderMx && colCounts[left] < contentThreshCol) left++;

    let right = sw - 1 - borderMx;
    while (right > left && colCounts[right] < contentThreshCol) right--;

    // If detection failed or area is too small, fallback to safe 2% margin
    if (right <= left + sw * 0.3 || bottom <= top + sh * 0.3) {
      return { top: 0.02, bottom: 0.98, left: 0.02, right: 0.98 };
    }

    // Add generous 2.5% safety padding around content
    const padX = Math.round(sw * 0.025);
    const padY = Math.round(sh * 0.025);

    const safeTop = Math.max(0, top - padY) / sh;
    const safeBottom = Math.min(sh, bottom + padY) / sh;
    const safeLeft = Math.max(0, left - padX) / sw;
    const safeRight = Math.min(sw, right + padX) / sw;

    return {
      top: parseFloat(safeTop.toFixed(3)),
      bottom: parseFloat(safeBottom.toFixed(3)),
      left: parseFloat(safeLeft.toFixed(3)),
      right: parseFloat(safeRight.toFixed(3))
    };
  } catch (err) {
    console.warn("[SmartCrop] Detection failed, fallback to 96% margin:", formatCvError(err));
    return { top: 0.02, bottom: 0.98, left: 0.02, right: 0.98 };
  } finally {
    small.delete();
    gray.delete();
    thresh.delete();
    if (mask) mask.delete();
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

    if (action === "PROCESS_AUTO_PAGE") {
      const { imageData, options } = payload;
      const srcMat = imageDataToMat(imageData);
      let croppedMat = null;
      let dewarpedMat = null;
      let postWarpMat = null;
      let enhancedMat = null;

      try {
        const w = srcMat.cols;
        const h = srcMat.rows;
        const ratios = options ? options.cropRatios : null;

        // Step 1: Crop region specified by user (default: full page 100%)
        if (ratios && (ratios.top > 0 || ratios.bottom < 1 || ratios.left > 0 || ratios.right < 1)) {
          const sx = Math.max(0, Math.min(w - 10, Math.round(w * Math.max(0, Math.min(1, ratios.left)))));
          const sy = Math.max(0, Math.min(h - 10, Math.round(h * Math.max(0, Math.min(1, ratios.top)))));
          const ex = Math.max(sx + 10, Math.min(w, Math.round(w * Math.max(0, Math.min(1, ratios.right)))));
          const ey = Math.max(sy + 10, Math.min(h, Math.round(h * Math.max(0, Math.min(1, ratios.bottom)))));
          const rect = new cv.Rect(sx, sy, ex - sx, ey - sy);
          croppedMat = srcMat.roi(rect).clone();
        } else {
          croppedMat = srcMat.clone();
        }

        // Step 2: Auto-Deskew & Curvature Dewarp
        postWarpMat = croppedMat;
        if (options && options.dewarpCurves) {
          dewarpedMat = dewarpTextCurves(croppedMat, options);
          if (dewarpedMat) {
            postWarpMat = dewarpedMat;
          }
        }

        // Step 3: Shadow removal and crisp scan enhancement
        enhancedMat = enhanceDocument(postWarpMat, options || {});
        const outMat = enhancedMat || postWarpMat;
        const outData = matToImageData(outMat);

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
        if (croppedMat) croppedMat.delete();
        if (dewarpedMat && dewarpedMat !== croppedMat) dewarpedMat.delete();
        if (enhancedMat && enhancedMat !== postWarpMat && enhancedMat !== croppedMat) enhancedMat.delete();
      }
      return;
    }

    if (action === "ENHANCE_EXISTING_SCAN") {
      const { imageData, options } = payload;
      const srcMat = imageDataToMat(imageData);
      let enhancedMat = null;
      try {
        enhancedMat = enhanceDocument(srcMat, options || {});
        const outData = matToImageData(enhancedMat);
        self.postMessage(
          { id, status: "SUCCESS", result: { imageData: outData } },
          [outData.data.buffer]
        );
      } finally {
        srcMat.delete();
        if (enhancedMat) enhancedMat.delete();
      }
      return;
    }

    if (action === "DETECT_CORNERS") {
      const { imageData } = payload;
      const corners = detectDocumentCorners(imageData);
      self.postMessage({ id, status: "SUCCESS", result: { corners } });
      return;
    }

    if (action === "WARP_PREVIEW_FAST") {
      const { imageData, corners, curveHandles } = payload;
      const srcMat = imageDataToMat(imageData);
      let warpedMat = null;

      try {
        if (curveHandles) {
          warpedMat = warpCurvedQuad(srcMat, corners, curveHandles);
        } else {
          warpedMat = warpPerspective(srcMat, corners);
        }

        const outData = matToImageData(warpedMat);
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
        if (warpedMat) warpedMat.delete();
      }
      return;
    }

    if (action === "PROCESS_IMAGE") {
      const { imageData, corners, curveHandles, options } = payload;
      const srcMat = imageDataToMat(imageData);
      let warpedMat = null;
      let dewarpedMat = null;
      let fingerMat = null;
      let enhancedMat = null;

      try {
        // Step 1: 8-Point Curved Quad Warp (Photoshop style)
        if (curveHandles) {
          warpedMat = warpCurvedQuad(srcMat, corners, curveHandles);
        } else {
          warpedMat = warpPerspective(srcMat, corners);
        }

        // Step 2: Text Curve Dewarping (Straightens curled book text lines along spine)
        const dewarpStrength = (options && options.dewarpStrength !== undefined) ? options.dewarpStrength : 1.0;
        if (options && options.dewarpCurves && dewarpStrength > 0) {
          dewarpedMat = dewarpTextCurves(warpedMat, dewarpStrength);
        }
        const postWarpMat = dewarpedMat || warpedMat;

        // Step 3: Finger Inpainting (Optional)
        if (options && options.removeFingers) {
          fingerMat = inpaintMarginFingers(postWarpMat);
        }
        const postFingerMat = fingerMat || postWarpMat;

        // Step 4: Double Page Split (Optional)
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

        // Step 5: Shadow Removal & Enhancement
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
        if (dewarpedMat) dewarpedMat.delete();
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

    if (action === "DETECT_SMART_CROP") {
      const { imageData } = payload;
      const srcMat = imageDataToMat(imageData);
      try {
        const ratios = detectSmartCropBounds(srcMat);
        self.postMessage({ id, status: "SUCCESS", result: { ratios } });
      } finally {
        srcMat.delete();
      }
      return;
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    const errMsg = formatCvError(err);
    console.error("Worker processing error:", errMsg);
    self.postMessage({ id, status: "ERROR", error: errMsg });
  }
};
