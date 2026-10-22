/**
 * Oh My Image Manager - Smart Auto Book Scanner Studio
 * Fully automated book spread detection, auto-split, curve dewarping, and illumination correction.
 */

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
const state = {
  pages: [],
  activeIndex: -1,
  zoom: 1.0,
  isPanning: false,
  panStart: { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 },
  isProcessing: false,
  workerReady: false,
  isComparing: false,
  isCropGuideActive: false,
  isCropDragging: false,
  cropDragStart: { x: 0, y: 0 },
  options: {
    mode: "bw", // 'bw' | 'grayscale' | 'color'
    autoSplitSpread: true,
    dewarpCurves: true,
    dewarpStrength: 1.0,
    cropRatios: { top: 0, bottom: 1.0, left: 0, right: 1.0 },
    shadowKernelSize: 31,
    contrast: 1.25,
    sharpen: 1.2
  }
};

// -------------------------------------------------------------
// DOM Elements
// -------------------------------------------------------------
const dropzoneEmpty = document.getElementById("dropzoneEmpty");
const dropzoneBox = document.getElementById("dropzoneBox");
const fileInput = document.getElementById("fileInput");
const btnSelectFiles = document.getElementById("btnSelectFiles");
const btnAddMoreFiles = document.getElementById("btnAddMoreFiles");
const btnClearAll = document.getElementById("btnClearAll");

const canvasStage = document.getElementById("canvasStage");
const canvasContainer = document.getElementById("canvasContainer");
const canvasWrapper = document.getElementById("canvasWrapper");
const resultCanvas = document.getElementById("resultCanvas");

const btnHoldCompare = document.getElementById("btnHoldCompare");
const btnToggleCropGuide = document.getElementById("btnToggleCropGuide");
const viewportHintText = document.getElementById("viewportHintText");

const processingOverlay = document.getElementById("processingOverlay");
const processingStatusText = document.getElementById("processingStatusText");

const btnModeBw = document.getElementById("btnModeBw");
const btnModeGray = document.getElementById("btnModeGray");
const btnModeColor = document.getElementById("btnModeColor");

const chkAutoSplit = document.getElementById("chkAutoSplit");
const chkDewarpCurves = document.getElementById("chkDewarpCurves");

// Crop Area Controls (Workspace Style)
const btnCropFull = document.getElementById("btnCropFull");
const btnCropAuto = document.getElementById("btnCropAuto");
const btnCropMargin = document.getElementById("btnCropMargin");
const btnCropText = document.getElementById("btnCropText");

const rangeCropTop = document.getElementById("rangeCropTop");
const rangeCropBottom = document.getElementById("rangeCropBottom");
const rangeCropLeft = document.getElementById("rangeCropLeft");
const rangeCropRight = document.getElementById("rangeCropRight");

const valCropTop = document.getElementById("valCropTop");
const valCropBottom = document.getElementById("valCropBottom");
const valCropLeft = document.getElementById("valCropLeft");
const valCropRight = document.getElementById("valCropRight");

const btnApplyCropAll = document.getElementById("btnApplyCropAll");

const btnRotateLeft = document.getElementById("btnRotateLeft");
const btnRotateRight = document.getElementById("btnRotateRight");
const btnSplitSpread = document.getElementById("btnSplitSpread");

const btnApplyAll = document.getElementById("btnApplyAll");
const btnExportPdf = document.getElementById("btnExportPdf");
const btnExportZip = document.getElementById("btnExportZip");
const btnCopyClipboard = document.getElementById("btnCopyClipboard");

const btnZoomIn = document.getElementById("btnZoomIn");
const btnZoomOut = document.getElementById("btnZoomOut");
const btnZoomFit = document.getElementById("btnZoomFit");
const zoomPercent = document.getElementById("zoomPercent");

const headerSummary = document.getElementById("headerSummary");
const footerDimensions = document.getElementById("footerDimensions");
const pageCountText = document.getElementById("pageCountText");
const filmstripList = document.getElementById("filmstripList");
const toastMessage = document.getElementById("toastMessage");

const helpModal = document.getElementById("helpModal");
const btnHelp = document.getElementById("btnHelp");
const btnCloseHelp = document.getElementById("btnCloseHelp");
const btnThemeToggle = document.getElementById("btnThemeToggle");

const btnOpenRemover = document.getElementById("btnOpenRemover");
const btnOpenCropper = document.getElementById("btnOpenCropper");

// -------------------------------------------------------------
// Web Worker Setup
// -------------------------------------------------------------
let scannerWorker = null;
let workerMsgId = 0;
const pendingWorkerRequests = new Map();

function initWorker() {
  scannerWorker = new Worker("scanner-worker.js?v=" + Date.now());

  scannerWorker.onmessage = (e) => {
    const { id, status, result, error } = e.data;
    if (pendingWorkerRequests.has(id)) {
      const { resolve, reject } = pendingWorkerRequests.get(id);
      pendingWorkerRequests.delete(id);
      if (status === "SUCCESS") {
        resolve(result);
      } else {
        reject(new Error(error));
      }
    }
  };

  scannerWorker.onerror = (err) => {
    console.error("Scanner Worker error:", err);
    showToast("OpenCV 엔진 오류: " + (err.message || ""));
  };

  sendWorkerRequest("INIT", {}).then(() => {
    state.workerReady = true;
    console.log("[Scanner] OpenCV WASM Engine ready (Auto-book scanner pipeline)");
  }).catch((err) => {
    console.error("Worker init failed:", err);
    showToast("엔진 초기화 실패: " + err.message);
  });
}

function sendWorkerRequest(action, payload, transferables = []) {
  return new Promise((resolve, reject) => {
    const id = ++workerMsgId;
    pendingWorkerRequests.set(id, { resolve, reject });
    scannerWorker.postMessage({ id, action, payload }, transferables);
  });
}

// -------------------------------------------------------------
// Theme Synchronization
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem("oh_my_img_theme");
  if (savedTheme === "light" || (!savedTheme && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)) {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
  }

  btnThemeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-theme");
    if (isDark) {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      localStorage.setItem("oh_my_img_theme", "light");
    } else {
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
      localStorage.setItem("oh_my_img_theme", "dark");
    }
  });
}

// -------------------------------------------------------------
// Toast & Modal
// -------------------------------------------------------------
let toastTimer = null;
function showToast(msg) {
  toastMessage.textContent = msg;
  toastMessage.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.classList.add("hidden");
  }, 2800);
}

btnHelp.addEventListener("click", () => helpModal.classList.remove("hidden"));
btnCloseHelp.addEventListener("click", () => helpModal.classList.add("hidden"));
helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal) helpModal.classList.add("hidden");
});

// Cross navigation
btnOpenRemover.addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL("remover/remover.html") });
  } else {
    window.open("../remover/remover.html", "_blank");
  }
});

btnOpenCropper.addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL("workspace/workspace.html") });
  } else {
    window.open("../workspace/workspace.html", "_blank");
  }
});

// -------------------------------------------------------------
// Automated Upload & Book Processing Pipeline
// -------------------------------------------------------------
btnSelectFiles.addEventListener("click", () => fileInput.click());
btnAddMoreFiles.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFiles(Array.from(e.target.files));
    fileInput.value = "";
  }
});

// Drag and drop
["dragenter", "dragover"].forEach((eventName) => {
  window.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzoneBox.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  window.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzoneBox.classList.remove("drag-over");
  });
});

window.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFiles(Array.from(e.dataTransfer.files));
  }
});

async function handleFiles(files) {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  if (imageFiles.length === 0) {
    showToast("이미지 파일만 업로드할 수 있습니다.");
    return;
  }

  showProcessing("책 페이지를 분석하고 고화질 스캔본으로 변환 중입니다...");

  const initialCount = state.pages.length;
  let splitCount = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    processingStatusText.textContent = `페이지 스캔 처리 중 (${i + 1}/${imageFiles.length})...`;

    try {
      const rawImg = await loadImageFromFile(file);
      const isSpread = state.options.autoSplitSpread && (rawImg.naturalWidth > rawImg.naturalHeight * 1.15);

      if (isSpread) {
        // Automatically split into Left / Right pages
        splitCount++;
        const { leftPage, rightPage } = await splitAndProcessSpread(rawImg, file.name);
        state.pages.push(leftPage, rightPage);
      } else {
        // Process single page
        const singlePage = await processSinglePage(rawImg, file.name);
        state.pages.push(singlePage);
      }
    } catch (err) {
      console.error("Failed to process file:", file.name, err);
    }
  }

  hideProcessing();
  updateUIState();

  if (initialCount === 0 && state.pages.length > 0) {
    selectPage(0);
  } else if (state.activeIndex >= 0) {
    renderFilmstrip();
  }

  if (splitCount > 0) {
    showToast(`총 ${state.pages.length}장의 고화질 스캔본이 생성되었습니다. (양면 ${splitCount}장 자동 분할)`);
  } else {
    showToast(`총 ${state.pages.length}장의 고화질 스캔본이 생성되었습니다.`);
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Splits an open book spread into 2 independent pages and auto-enhances them.
 */
async function splitAndProcessSpread(rawImg, originalName) {
  const offCanvas = document.createElement("canvas");
  offCanvas.width = rawImg.naturalWidth;
  offCanvas.height = rawImg.naturalHeight;
  const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(rawImg, 0, 0);
  const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);

  // 1. Worker splits spread into leftData & rightData
  const splitRes = await sendWorkerRequest("SPLIT_SPREAD", { imageData: imgData }, [imgData.data.buffer]);
  const { leftData, rightData } = splitRes;

  const baseName = originalName.replace(/\.[^/.]+$/, "");

  // 2. Process Left Page
  const leftOptions = { ...state.options, spineSide: "right" };
  const leftRes = await sendWorkerRequest("PROCESS_AUTO_PAGE", {
    imageData: leftData,
    options: leftOptions
  }, [leftData.data.buffer]);

  const leftCanvas = document.createElement("canvas");
  leftCanvas.width = leftRes.imageData.width;
  leftCanvas.height = leftRes.imageData.height;
  leftCanvas.getContext("2d").putImageData(leftRes.imageData, 0, 0);

  // Create clean raw image for Left page (preserving original crop dimensions)
  const leftRawCanvas = document.createElement("canvas");
  leftRawCanvas.width = splitRes.splitX;
  leftRawCanvas.height = offCanvas.height;
  leftRawCanvas.getContext("2d").drawImage(offCanvas, 0, 0, splitRes.splitX, offCanvas.height, 0, 0, leftRawCanvas.width, leftRawCanvas.height);

  const leftPage = {
    id: "page_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    name: `${baseName} (좌)`,
    rawImage: leftRawCanvas,
    scanCanvas: leftCanvas,
    width: leftCanvas.width,
    height: leftCanvas.height,
    options: leftOptions,
    thumbUrl: createThumbnail(leftCanvas)
  };

  // 3. Process Right Page
  const rightOptions = { ...state.options, spineSide: "left" };
  const rightRes = await sendWorkerRequest("PROCESS_AUTO_PAGE", {
    imageData: rightData,
    options: rightOptions
  }, [rightData.data.buffer]);

  const rightCanvas = document.createElement("canvas");
  rightCanvas.width = rightRes.imageData.width;
  rightCanvas.height = rightRes.imageData.height;
  rightCanvas.getContext("2d").putImageData(rightRes.imageData, 0, 0);

  const rightRawCanvas = document.createElement("canvas");
  rightRawCanvas.width = offCanvas.width - splitRes.splitX;
  rightRawCanvas.height = offCanvas.height;
  rightRawCanvas.getContext("2d").drawImage(offCanvas, splitRes.splitX, 0, offCanvas.width - splitRes.splitX, offCanvas.height, 0, 0, rightRawCanvas.width, rightRawCanvas.height);

  const rightPage = {
    id: "page_" + (Date.now() + 1) + "_" + Math.random().toString(36).substr(2, 5),
    name: `${baseName} (우)`,
    rawImage: rightRawCanvas,
    scanCanvas: rightCanvas,
    width: rightCanvas.width,
    height: rightCanvas.height,
    options: rightOptions,
    thumbUrl: createThumbnail(rightCanvas)
  };

  return { leftPage, rightPage };
}

/**
 * Processes a single portrait document or book page.
 */
async function processSinglePage(rawImg, name) {
  const offCanvas = document.createElement("canvas");
  offCanvas.width = rawImg.naturalWidth;
  offCanvas.height = rawImg.naturalHeight;
  const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(rawImg, 0, 0);
  const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);

  const res = await sendWorkerRequest("PROCESS_AUTO_PAGE", {
    imageData: imgData,
    options: state.options
  }, [imgData.data.buffer]);

  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = res.imageData.width;
  scanCanvas.height = res.imageData.height;
  scanCanvas.getContext("2d").putImageData(res.imageData, 0, 0);

  return {
    id: "page_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    name,
    rawImage: rawImg,
    scanCanvas,
    width: scanCanvas.width,
    height: scanCanvas.height,
    options: { ...state.options },
    thumbUrl: createThumbnail(scanCanvas)
  };
}

function createThumbnail(sourceCanvas) {
  const thumbW = 120;
  const scale = thumbW / sourceCanvas.width;
  const thumbH = Math.max(80, Math.round(sourceCanvas.height * scale));

  const tCanvas = document.createElement("canvas");
  tCanvas.width = thumbW;
  tCanvas.height = thumbH;
  const tCtx = tCanvas.getContext("2d");
  tCtx.drawImage(sourceCanvas, 0, 0, thumbW, thumbH);
  return tCanvas.toDataURL("image/jpeg", 0.7);
}

// -------------------------------------------------------------
// UI State & Page Selection
// -------------------------------------------------------------
function updateUIState() {
  const hasPages = state.pages.length > 0;
  dropzoneEmpty.classList.toggle("hidden", hasPages);
  canvasStage.classList.toggle("hidden", !hasPages);

  btnExportPdf.disabled = !hasPages;
  btnExportZip.disabled = !hasPages;
  btnCopyClipboard.disabled = !hasPages;

  headerSummary.textContent = `로드된 페이지: ${state.pages.length}장`;
  pageCountText.textContent = state.pages.length;

  renderFilmstrip();
}

function selectPage(index) {
  if (index < 0 || index >= state.pages.length) return;
  state.activeIndex = index;
  const page = state.pages[index];

  // Sync mode buttons
  [btnModeBw, btnModeGray, btnModeColor].forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === page.options.mode);
  });

  // Sync crop sliders
  updateCropSlidersUI(page.options.cropRatios);

  renderCurrentPage(true);
  renderFilmstrip();
}

function updateCropSlidersUI(ratios, presetName = null) {
  if (!ratios) ratios = { top: 0, bottom: 1.0, left: 0, right: 1.0 };
  if (rangeCropTop) rangeCropTop.value = (ratios.top * 100).toFixed(1);
  if (rangeCropBottom) rangeCropBottom.value = (ratios.bottom * 100).toFixed(1);
  if (rangeCropLeft) rangeCropLeft.value = (ratios.left * 100).toFixed(1);
  if (rangeCropRight) rangeCropRight.value = (ratios.right * 100).toFixed(1);

  if (valCropTop) valCropTop.textContent = `${(ratios.top * 100).toFixed(1)}%`;
  if (valCropBottom) valCropBottom.textContent = `${(ratios.bottom * 100).toFixed(1)}%`;
  if (valCropLeft) valCropLeft.textContent = `${(ratios.left * 100).toFixed(1)}%`;
  if (valCropRight) valCropRight.textContent = `${(ratios.right * 100).toFixed(1)}%`;

  [btnCropFull, btnCropAuto, btnCropMargin, btnCropText].forEach((btn) => {
    if (btn) btn.classList.toggle("active", btn.dataset.preset === presetName);
  });
}

function calculateCropCoordinates(imgWidth, imgHeight, ratios) {
  const left = Math.max(0, Math.min(Math.round(imgWidth * (ratios?.left ?? 0)), imgWidth - 1));
  const top = Math.max(0, Math.min(Math.round(imgHeight * (ratios?.top ?? 0)), imgHeight - 1));
  const right = Math.max(left + 1, Math.min(Math.round(imgWidth * (ratios?.right ?? 1)), imgWidth));
  const bottom = Math.max(top + 1, Math.min(Math.round(imgHeight * (ratios?.bottom ?? 1)), imgHeight));

  return {
    sx: left,
    sy: top,
    sWidth: right - left,
    sHeight: bottom - top,
    left,
    top,
    right,
    bottom
  };
}

function drawCropGuideOverlay(ctx, imgWidth, imgHeight, ratios) {
  const coords = calculateCropCoordinates(imgWidth, imgHeight, ratios);

  // 1. Semi-transparent dimming outside crop box
  ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
  ctx.fillRect(0, 0, imgWidth, coords.top);
  ctx.fillRect(0, coords.bottom, imgWidth, imgHeight - coords.bottom);
  ctx.fillRect(0, coords.top, coords.left, coords.sHeight);
  ctx.fillRect(coords.right, coords.top, imgWidth - coords.right, coords.sHeight);

  // 2. Stroke bounding box
  ctx.strokeStyle = "#efd430";
  ctx.lineWidth = Math.max(3, Math.round(imgWidth / 250));
  ctx.strokeRect(coords.left, coords.top, coords.sWidth, coords.sHeight);

  // 3. Corner Accent Handles
  const handleSize = Math.max(14, Math.round(imgWidth / 70));
  ctx.fillStyle = "#efd430";
  // TL
  ctx.fillRect(coords.left - 2, coords.top - 2, handleSize, ctx.lineWidth);
  ctx.fillRect(coords.left - 2, coords.top - 2, ctx.lineWidth, handleSize);
  // TR
  ctx.fillRect(coords.right - handleSize + 2, coords.top - 2, handleSize, ctx.lineWidth);
  ctx.fillRect(coords.right - ctx.lineWidth + 2, coords.top - 2, ctx.lineWidth, handleSize);
  // BL
  ctx.fillRect(coords.left - 2, coords.bottom - ctx.lineWidth + 2, handleSize, ctx.lineWidth);
  ctx.fillRect(coords.left - 2, coords.bottom - handleSize + 2, ctx.lineWidth, handleSize);
  // BR
  ctx.fillRect(coords.right - handleSize + 2, coords.bottom - ctx.lineWidth + 2, handleSize, ctx.lineWidth);
  ctx.fillRect(coords.right - ctx.lineWidth + 2, coords.bottom - handleSize + 2, ctx.lineWidth, handleSize);

  // 4. Dimension Badge
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  const badgeText = `${coords.sWidth} × ${coords.sHeight} px`;
  ctx.font = `bold ${Math.max(12, Math.round(imgWidth / 55))}px sans-serif`;
  const textWidth = ctx.measureText(badgeText).width;
  const badgePadding = 8;
  const badgeX = coords.left + 8;
  const badgeY = coords.top + 8;
  ctx.fillRect(badgeX, badgeY, textWidth + badgePadding * 2, 26);
  ctx.fillStyle = "#efd430";
  ctx.fillText(badgeText, badgeX + badgePadding, badgeY + 18);
}

// -------------------------------------------------------------
// High-Definition Canvas Rendering
// -------------------------------------------------------------
function renderCurrentPage(resetZoom = false) {
  if (state.activeIndex < 0 || state.activeIndex >= state.pages.length) return;
  const page = state.pages[state.activeIndex];
  const ctx = resultCanvas.getContext("2d");

  if (state.isCropGuideActive) {
    // Show raw image with crop guide overlay
    const source = page.rawImage;
    if (!source) return;

    resultCanvas.width = source.width;
    resultCanvas.height = source.height;
    ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    ctx.drawImage(source, 0, 0);

    drawCropGuideOverlay(ctx, source.width, source.height, page.options.cropRatios);

    if (btnToggleCropGuide) btnToggleCropGuide.classList.add("active");
    footerDimensions.textContent = `영역 조절 가이드: ${source.width} × ${source.height} px (슬라이더 또는 드래그로 조절)`;
  } else {
    // Clean processed scan (or raw comparison)
    if (btnToggleCropGuide) btnToggleCropGuide.classList.remove("active");
    const source = state.isComparing ? page.rawImage : page.scanCanvas;
    if (!source) return;

    resultCanvas.width = source.width;
    resultCanvas.height = source.height;
    ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    ctx.drawImage(source, 0, 0);

    if (state.isComparing) {
      footerDimensions.textContent = `원본 사진: ${page.width} × ${page.height} px (원본 비교 중)`;
    } else {
      footerDimensions.textContent = `고화질 스캔본: ${page.width} × ${page.height} px (A4 규격)`;
    }
  }

  if (resetZoom) {
    fitZoomToContainer();
  }
}

function showProcessing(text) {
  processingStatusText.textContent = text;
  processingOverlay.classList.remove("hidden");
  state.isProcessing = true;
}

function hideProcessing() {
  processingOverlay.classList.add("hidden");
  state.isProcessing = false;
}

// -------------------------------------------------------------
// Zoom & Pan Canvas Controls
// -------------------------------------------------------------
function fitZoomToContainer() {
  if (state.activeIndex < 0) return;
  const containerW = canvasContainer.clientWidth - 50;
  const containerH = canvasContainer.clientHeight - 50;
  const page = state.pages[state.activeIndex];

  const scale = Math.min(1.0, containerW / page.width, containerH / page.height);
  setZoom(Math.max(0.12, scale));
}

function setZoom(val, pivotX = null, pivotY = null) {
  const oldZoom = state.zoom;
  const newZoom = Math.max(0.12, Math.min(3.5, val));
  state.zoom = newZoom;
  zoomPercent.textContent = `${Math.round(state.zoom * 100)}%`;

  if (state.activeIndex >= 0) {
    const page = state.pages[state.activeIndex];
    const dw = Math.round(page.width * state.zoom);
    const dh = Math.round(page.height * state.zoom);

    canvasWrapper.style.width = `${dw}px`;
    canvasWrapper.style.height = `${dh}px`;
    resultCanvas.style.width = `${dw}px`;
    resultCanvas.style.height = `${dh}px`;

    // Anchor scroll to pivot position
    if (pivotX !== null && pivotY !== null && oldZoom > 0) {
      const scaleRatio = newZoom / oldZoom;
      canvasContainer.scrollLeft = Math.round((canvasContainer.scrollLeft + pivotX) * scaleRatio - pivotX);
      canvasContainer.scrollTop = Math.round((canvasContainer.scrollTop + pivotY) * scaleRatio - pivotY);
    }
  }
}

btnZoomIn.addEventListener("click", () => setZoom(state.zoom * 1.2));
btnZoomOut.addEventListener("click", () => setZoom(state.zoom / 1.2));
btnZoomFit.addEventListener("click", () => fitZoomToContainer());

canvasContainer.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = canvasContainer.getBoundingClientRect();
  const pivotX = e.clientX - rect.left;
  const pivotY = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  setZoom(state.zoom * factor, pivotX, pivotY);
}, { passive: false });

// Pan via Middle-click, Right-click, or Space+Drag
let isSpacePressed = false;

canvasContainer.addEventListener("mousedown", (e) => {
  const isPanTrigger = e.button === 1 || e.button === 2 || (e.button === 0 && isSpacePressed);
  if (isPanTrigger) {
    state.isPanning = true;
    state.panStart = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: canvasContainer.scrollLeft,
      scrollTop: canvasContainer.scrollTop
    };
    canvasContainer.style.cursor = "grabbing";
    e.preventDefault();
    return;
  }

  // Left click when Crop Guide is active -> Start drag-box selection
  if (e.button === 0 && state.isCropGuideActive && state.activeIndex >= 0) {
    const rect = resultCanvas.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
      state.isCropDragging = true;
      const scaleX = resultCanvas.width / rect.width;
      const scaleY = resultCanvas.height / rect.height;
      state.cropDragStart = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
      e.preventDefault();
    }
  }
});

canvasContainer.addEventListener("contextmenu", (e) => {
  if (state.isPanning || isSpacePressed) {
    e.preventDefault();
  }
});

window.addEventListener("mousemove", (e) => {
  if (state.isPanning) {
    const dx = e.clientX - state.panStart.x;
    const dy = e.clientY - state.panStart.y;
    canvasContainer.scrollLeft = state.panStart.scrollLeft - dx;
    canvasContainer.scrollTop = state.panStart.scrollTop - dy;
    return;
  }

  if (state.isCropDragging && state.activeIndex >= 0) {
    const page = state.pages[state.activeIndex];
    const rect = resultCanvas.getBoundingClientRect();
    const scaleX = resultCanvas.width / rect.width;
    const scaleY = resultCanvas.height / rect.height;

    const curX = Math.max(0, Math.min(resultCanvas.width, (e.clientX - rect.left) * scaleX));
    const curY = Math.max(0, Math.min(resultCanvas.height, (e.clientY - rect.top) * scaleY));

    const minX = Math.min(state.cropDragStart.x, curX);
    const maxX = Math.max(state.cropDragStart.x, curX);
    const minY = Math.min(state.cropDragStart.y, curY);
    const maxY = Math.max(state.cropDragStart.y, curY);

    if (maxX - minX > 20 && maxY - minY > 20) {
      page.options.cropRatios = {
        left: minX / resultCanvas.width,
        right: maxX / resultCanvas.width,
        top: minY / resultCanvas.height,
        bottom: maxY / resultCanvas.height
      };
      updateCropSlidersUI(page.options.cropRatios);
      renderCurrentPage(false);
    }
  }
});

window.addEventListener("mouseup", async () => {
  if (state.isPanning) {
    state.isPanning = false;
    canvasContainer.style.cursor = isSpacePressed ? "grab" : "";
  }

  if (state.isCropDragging && state.activeIndex >= 0) {
    state.isCropDragging = false;
    const page = state.pages[state.activeIndex];
    showProcessing("스캔 영역 재적용 중...");
    await reprocessPageFilter(page);
    hideProcessing();
    renderCurrentPage(false);
    renderFilmstrip();
  }
});

// Compare Listeners
if (btnHoldCompare) {
  const startCompare = (e) => {
    e.preventDefault();
    if (state.activeIndex < 0) return;
    state.isComparing = true;
    btnHoldCompare.classList.add("active");
    renderCurrentPage(false);
  };
  const stopCompare = (e) => {
    e.preventDefault();
    if (!state.isComparing) return;
    state.isComparing = false;
    btnHoldCompare.classList.remove("active");
    renderCurrentPage(false);
  };

  btnHoldCompare.addEventListener("mousedown", startCompare);
  btnHoldCompare.addEventListener("mouseup", stopCompare);
  btnHoldCompare.addEventListener("mouseleave", stopCompare);
  btnHoldCompare.addEventListener("touchstart", startCompare, { passive: false });
  btnHoldCompare.addEventListener("touchend", stopCompare);
}

window.addEventListener("keydown", (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName : "";
  if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;

  if (e.code === "Space" && !e.repeat && state.activeIndex >= 0) {
    e.preventDefault();
    isSpacePressed = true;
    if (canvasContainer) canvasContainer.style.cursor = "grab";
    state.isComparing = true;
    if (btnHoldCompare) btnHoldCompare.classList.add("active");
    renderCurrentPage(false);
  }

  if (e.code === "KeyC" && !e.repeat && state.activeIndex >= 0) {
    state.isComparing = true;
    if (btnHoldCompare) btnHoldCompare.classList.add("active");
    renderCurrentPage(false);
  }
});

window.addEventListener("keyup", (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName : "";
  if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;

  if (e.code === "Space") {
    isSpacePressed = false;
    if (!state.isPanning && canvasContainer) canvasContainer.style.cursor = "";
    if (state.isComparing) {
      state.isComparing = false;
      if (btnHoldCompare) btnHoldCompare.classList.remove("active");
      renderCurrentPage(false);
    }
  }

  if (e.code === "KeyC") {
    state.isComparing = false;
    if (btnHoldCompare) btnHoldCompare.classList.remove("active");
    renderCurrentPage(false);
  }
});

// -------------------------------------------------------------
// Sidebar Parameter Listeners & Batch Apply
// -------------------------------------------------------------
[btnModeBw, btnModeGray, btnModeColor].forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (state.activeIndex < 0) return;
    const mode = btn.dataset.mode;
    state.options.mode = mode;
    state.pages[state.activeIndex].options.mode = mode;

    [btnModeBw, btnModeGray, btnModeColor].forEach((b) => b.classList.toggle("active", b === btn));

    // Re-enhance active page
    showProcessing("스캔 필터 적용 중...");
    await reprocessPageFilter(state.pages[state.activeIndex]);
    hideProcessing();
    renderCurrentPage(false);
    renderFilmstrip();
  });
});

async function reprocessPageFilter(page) {
  const offCanvas = document.createElement("canvas");
  offCanvas.width = page.rawImage.width || page.rawImage.naturalWidth;
  offCanvas.height = page.rawImage.height || page.rawImage.naturalHeight;
  const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(page.rawImage, 0, 0);
  const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);

  const res = await sendWorkerRequest("PROCESS_AUTO_PAGE", {
    imageData: imgData,
    options: page.options
  }, [imgData.data.buffer]);

  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = res.imageData.width;
  scanCanvas.height = res.imageData.height;
  scanCanvas.getContext("2d").putImageData(res.imageData, 0, 0);

  page.scanCanvas = scanCanvas;
  page.width = scanCanvas.width;
  page.height = scanCanvas.height;
  page.thumbUrl = createThumbnail(scanCanvas);
}

// -------------------------------------------------------------
// Crop Area Controls & Presets (Workspace Style)
// -------------------------------------------------------------
const CROP_PRESETS = {
  full: { top: 0, bottom: 1.0, left: 0, right: 1.0 },
  margin: { top: 0.02, bottom: 0.98, left: 0.02, right: 0.98 },
  text: { top: 0.10, bottom: 0.90, left: 0.05, right: 0.95 }
};

if (btnToggleCropGuide) {
  btnToggleCropGuide.addEventListener("click", () => {
    state.isCropGuideActive = !state.isCropGuideActive;
    renderCurrentPage(false);
  });
}

[btnCropFull, btnCropMargin, btnCropText].forEach((btn) => {
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (state.activeIndex < 0) return;
    const presetKey = btn.dataset.preset;
    const ratios = CROP_PRESETS[presetKey];
    if (!ratios) return;

    const page = state.pages[state.activeIndex];
    page.options.cropRatios = { ...ratios };
    state.options.cropRatios = { ...ratios };

    updateCropSlidersUI(ratios, presetKey);

    showProcessing("스캔 영역 재적용 중...");
    await reprocessPageFilter(page);
    hideProcessing();
    renderCurrentPage(false);
    renderFilmstrip();
  });
});

if (btnCropAuto) {
  btnCropAuto.addEventListener("click", async () => {
    if (state.activeIndex < 0) return;
    const page = state.pages[state.activeIndex];
    showProcessing("스마트 자동 영역 분석 중...");

    try {
      const offCanvas = document.createElement("canvas");
      offCanvas.width = page.rawImage.width || page.rawImage.naturalWidth;
      offCanvas.height = page.rawImage.height || page.rawImage.naturalHeight;
      const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(page.rawImage, 0, 0);
      const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);

      const res = await sendWorkerRequest("DETECT_SMART_CROP", {
        imageData: imgData
      }, [imgData.data.buffer]);

      if (res && res.ratios) {
        page.options.cropRatios = { ...res.ratios };
        state.options.cropRatios = { ...res.ratios };
        updateCropSlidersUI(res.ratios, "auto");

        showProcessing("스캔 영역 재적용 중...");
        await reprocessPageFilter(page);
        renderCurrentPage(false);
        renderFilmstrip();
      }
    } catch (err) {
      console.error("Smart Auto Crop error:", err);
    } finally {
      hideProcessing();
    }
  });
}

function handleCropSliderInput() {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];

  const top = parseFloat(rangeCropTop.value) / 100;
  const bottom = parseFloat(rangeCropBottom.value) / 100;
  const left = parseFloat(rangeCropLeft.value) / 100;
  const right = parseFloat(rangeCropRight.value) / 100;

  const ratios = { top, bottom, left, right };
  page.options.cropRatios = ratios;
  state.options.cropRatios = ratios;

  valCropTop.textContent = `${(top * 100).toFixed(1)}%`;
  valCropBottom.textContent = `${(bottom * 100).toFixed(1)}%`;
  valCropLeft.textContent = `${(left * 100).toFixed(1)}%`;
  valCropRight.textContent = `${(right * 100).toFixed(1)}%`;

  [btnCropFull, btnCropAuto, btnCropMargin, btnCropText].forEach((b) => b && b.classList.remove("active"));

  // Show crop guide live so user sees boundaries clearly
  state.isCropGuideActive = true;
  renderCurrentPage(false);
}

let cropDebounceTimer = null;
function handleCropSliderChange() {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];

  clearTimeout(cropDebounceTimer);
  cropDebounceTimer = setTimeout(async () => {
    showProcessing("스캔 영역 재적용 중...");
    await reprocessPageFilter(page);
    hideProcessing();
    renderCurrentPage(false);
    renderFilmstrip();
  }, 200);
}

[rangeCropTop, rangeCropBottom, rangeCropLeft, rangeCropRight].forEach((slider) => {
  if (!slider) return;
  slider.addEventListener("input", handleCropSliderInput);
  slider.addEventListener("change", handleCropSliderChange);
});

if (btnApplyCropAll) {
  btnApplyCropAll.addEventListener("click", async () => {
    if (state.pages.length === 0 || state.activeIndex < 0) return;
    const currentRatios = state.pages[state.activeIndex].options.cropRatios;

    showProcessing(`전체 ${state.pages.length}개 페이지에 영역 일괄 적용 중...`);
    for (const page of state.pages) {
      page.options.cropRatios = { ...currentRatios };
      await reprocessPageFilter(page);
    }
    hideProcessing();
    renderCurrentPage(false);
    renderFilmstrip();
  });
}

chkAutoSplit.addEventListener("change", (e) => {
  state.options.autoSplitSpread = e.target.checked;
});

chkDewarpCurves.addEventListener("change", async (e) => {
  state.options.dewarpCurves = e.target.checked;
  if (state.activeIndex >= 0) {
    state.pages[state.activeIndex].options.dewarpCurves = e.target.checked;
    showProcessing("굴곡 평탄화 재적용 중...");
    await reprocessPageFilter(state.pages[state.activeIndex]);
    hideProcessing();
    renderCurrentPage(false);
    renderFilmstrip();
  }
});

btnRotateLeft.addEventListener("click", () => rotateActivePage(-90));
btnRotateRight.addEventListener("click", () => rotateActivePage(90));

async function rotateActivePage(deg) {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];
  showProcessing("페이지 회전 중...");

  const canvas = document.createElement("canvas");
  const is90or270 = Math.abs(deg) === 90 || Math.abs(deg) === 270;
  canvas.width = is90or270 ? page.scanCanvas.height : page.scanCanvas.width;
  canvas.height = is90or270 ? page.scanCanvas.width : page.scanCanvas.height;

  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(page.scanCanvas, -page.scanCanvas.width / 2, -page.scanCanvas.height / 2);

  page.scanCanvas = canvas;
  page.width = canvas.width;
  page.height = canvas.height;
  page.thumbUrl = createThumbnail(canvas);

  hideProcessing();
  renderCurrentPage(true);
  renderFilmstrip();
}

btnSplitSpread.addEventListener("click", async () => {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];
  showProcessing("페이지를 좌/우 2장으로 분할 중...");

  try {
    const rawImg = page.rawImage;
    const { leftPage, rightPage } = await splitAndProcessSpread(rawImg, page.name);

    const idx = state.activeIndex;
    state.pages.splice(idx, 1, leftPage, rightPage);

    updateUIState();
    selectPage(idx);
    showToast("페이지가 좌/우 2장으로 분할되었습니다.");
  } catch (err) {
    console.error("Split error:", err);
    showToast("분할 오류: " + err.message);
  } finally {
    hideProcessing();
  }
});

btnApplyAll.addEventListener("click", async () => {
  if (state.pages.length === 0) return;
  const currentMode = state.options.mode;

  showProcessing("전체 페이지 필터 일괄 적용 중...");
  for (let i = 0; i < state.pages.length; i++) {
    processingStatusText.textContent = `전체 적용 중 (${i + 1}/${state.pages.length})...`;
    state.pages[i].options.mode = currentMode;
    await reprocessPageFilter(state.pages[i]);
  }

  hideProcessing();
  renderCurrentPage(false);
  renderFilmstrip();
  showToast(`모든 페이지에 [${currentMode === "bw" ? "선명한 흑백" : currentMode === "grayscale" ? "그레이스케일" : "컬러"}] 필터가 일괄 적용되었습니다.`);
});

// -------------------------------------------------------------
// Filmstrip Rendering
// -------------------------------------------------------------
function renderFilmstrip() {
  filmstripList.innerHTML = "";

  state.pages.forEach((page, i) => {
    const item = document.createElement("div");
    item.className = "filmstrip-item" + (i === state.activeIndex ? " active" : "");
    item.innerHTML = `
      <img src="${page.thumbUrl}" alt="페이지 ${i + 1}" class="filmstrip-thumb" />
      <span class="filmstrip-badge">${i + 1}</span>
      <button class="filmstrip-delete" title="페이지 삭제">&times;</button>
    `;

    item.addEventListener("click", () => selectPage(i));

    const delBtn = item.querySelector(".filmstrip-delete");
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deletePage(i);
    });

    filmstripList.appendChild(item);
  });
}

function deletePage(index) {
  state.pages.splice(index, 1);
  if (state.pages.length === 0) {
    state.activeIndex = -1;
  } else if (state.activeIndex >= state.pages.length) {
    state.activeIndex = state.pages.length - 1;
  }
  updateUIState();
  if (state.activeIndex >= 0) {
    selectPage(state.activeIndex);
  }
}

btnClearAll.addEventListener("click", () => {
  if (confirm("모든 스캔 페이지를 삭제하시겠습니까?")) {
    state.pages = [];
    state.activeIndex = -1;
    updateUIState();
  }
});

// -------------------------------------------------------------
// Export: PDF & ZIP & Clipboard
// -------------------------------------------------------------
btnExportPdf.addEventListener("click", async () => {
  if (state.pages.length === 0) return;
  showProcessing("고화질 A4 PDF 문서 생성 중...");

  try {
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    for (let i = 0; i < state.pages.length; i++) {
      processingStatusText.textContent = `PDF 페이지 생성 중 (${i + 1}/${state.pages.length})...`;
      const page = state.pages[i];

      const blob = await new Promise((res) => page.scanCanvas.toBlob(res, "image/jpeg", 0.92));
      const arrayBuffer = await blob.arrayBuffer();
      const embeddedJpg = await pdfDoc.embedJpg(arrayBuffer);

      const pdfPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      const margin = 20;
      const fitW = A4_WIDTH - margin * 2;
      const fitH = A4_HEIGHT - margin * 2;
      const imgScale = Math.min(fitW / embeddedJpg.width, fitH / embeddedJpg.height);

      const drawW = embeddedJpg.width * imgScale;
      const drawH = embeddedJpg.height * imgScale;
      const drawX = (A4_WIDTH - drawW) / 2;
      const drawY = (A4_HEIGHT - drawH) / 2;

      pdfPage.drawImage(embeddedJpg, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH
      });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    const downloadUrl = URL.createObjectURL(pdfBlob);

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `oh_my_book_scan_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    showToast("PDF 문서 저장이 완료되었습니다.");
  } catch (err) {
    console.error("PDF export error:", err);
    showToast("PDF 생성 오류: " + err.message);
  } finally {
    hideProcessing();
  }
});

btnExportZip.addEventListener("click", async () => {
  if (state.pages.length === 0) return;
  showProcessing("ZIP 이미지 압축 파일 생성 중...");

  try {
    const zip = new JSZip();

    for (let i = 0; i < state.pages.length; i++) {
      processingStatusText.textContent = `이미지 압축 중 (${i + 1}/${state.pages.length})...`;
      const page = state.pages[i];

      const blob = await new Promise((res) => page.scanCanvas.toBlob(res, "image/png"));
      const fileName = `scan_page_${String(i + 1).padStart(3, "0")}.png`;
      zip.file(fileName, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const downloadUrl = URL.createObjectURL(zipBlob);

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `oh_my_book_scans_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    showToast("ZIP 압축 다운로드가 완료되었습니다.");
  } catch (err) {
    console.error("ZIP export error:", err);
    showToast("ZIP 생성 오류: " + err.message);
  } finally {
    hideProcessing();
  }
});

btnCopyClipboard.addEventListener("click", async () => {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];
  if (!page.scanCanvas) return;

  try {
    const blob = await new Promise((res) => page.scanCanvas.toBlob(res, "image/png"));
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
    showToast("현재 페이지가 클립보드에 복사되었습니다!");
  } catch (err) {
    console.error("Clipboard copy error:", err);
    showToast("클립보드 복사 실패: " + err.message);
  }
});

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initWorker();
  updateUIState();
});

window.addEventListener("resize", () => {
  if (state.activeIndex >= 0) {
    fitZoomToContainer();
  }
});
