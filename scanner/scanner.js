/**
 * Oh My Image Manager - Document & Book Scanner Studio
 * UI Controller and Web Worker Client
 */

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
const state = {
  pages: [],
  activeIndex: -1,
  zoom: 1.0,
  isDraggingPin: null, // 0..3 or null
  isProcessing: false,
  workerReady: false,
  viewMode: "crop", // "crop" (8-Point Warp Area) | "preview" (Dewarped Result)
  defaultOptions: {
    mode: "bw",
    shadowKernelSize: 31,
    contrast: 1.2,
    sharpen: 1.2,
    dewarpCurves: true,
    dewarpStrength: 1.0,
    isDoublePage: false,
    removeFingers: false
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

const cropScrimPath = document.getElementById("cropScrimPath");
const cornerSvgOverlay = document.getElementById("cornerSvgOverlay");
const cornerPinsWrap = document.getElementById("cornerPinsWrap");
const edgeTop = document.getElementById("edgeTop");
const edgeRight = document.getElementById("edgeRight");
const edgeBottom = document.getElementById("edgeBottom");
const edgeLeft = document.getElementById("edgeLeft");
const cornerPins = {
  tl: document.getElementById("pinTL"),
  tr: document.getElementById("pinTR"),
  br: document.getElementById("pinBR"),
  bl: document.getElementById("pinBL")
};
const curvePins = {
  tc: document.getElementById("pinTC"),
  rc: document.getElementById("pinRC"),
  bc: document.getElementById("pinBC"),
  lc: document.getElementById("pinLC")
};
const allPins = { ...cornerPins, ...curvePins };

const tabModeCrop = document.getElementById("tabModeCrop");
const tabModePreview = document.getElementById("tabModePreview");
const viewportHintText = document.getElementById("viewportHintText");

const loupeWrap = document.getElementById("loupeWrap");
const loupeCanvas = document.getElementById("loupeCanvas");
const loupeCtx = loupeCanvas.getContext("2d");

const processingOverlay = document.getElementById("processingOverlay");
const processingStatusText = document.getElementById("processingStatusText");

const btnModeBw = document.getElementById("btnModeBw");
const btnModeGray = document.getElementById("btnModeGray");
const btnModeColor = document.getElementById("btnModeColor");

const sliderShadow = document.getElementById("sliderShadow");
const valShadow = document.getElementById("valShadow");
const sliderContrast = document.getElementById("sliderContrast");
const valContrast = document.getElementById("valContrast");
const sliderSharpen = document.getElementById("sliderSharpen");
const valSharpen = document.getElementById("valSharpen");
const sliderDewarp = document.getElementById("sliderDewarp");
const valDewarp = document.getElementById("valDewarp");

const btnRotateLeft = document.getElementById("btnRotateLeft");
const btnRotateRight = document.getElementById("btnRotateRight");
const btnAutoCorners = document.getElementById("btnAutoCorners");
const btnSplitSpread = document.getElementById("btnSplitSpread");
const chkDewarpCurves = document.getElementById("chkDewarpCurves");
const chkRemoveFingers = document.getElementById("chkRemoveFingers");

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
    showToast("OpenCV 백그라운드 엔진 오류가 발생했습니다: " + (err.message || ""));
  };

  sendWorkerRequest("INIT", {}).then(() => {
    state.workerReady = true;
    console.log("[Scanner] OpenCV WASM Engine initialized successfully (Strict CSP / Zero-eval mode)");
  }).catch((err) => {
    console.error("Worker initialization failed:", err);
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
  }, 2600);
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
// File Upload & Queue Processing
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

  showProcessing("이미지를 불러오는 중입니다...");

  const firstNewIndex = state.pages.length;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    try {
      const page = await createPageFromFile(file);
      state.pages.push(page);
    } catch (err) {
      console.error("Failed to load file:", file.name, err);
    }
  }

  hideProcessing();
  updateUIState();

  if (state.activeIndex === -1 && state.pages.length > 0) {
    selectPage(0);
  } else if (state.activeIndex >= 0) {
    renderFilmstrip();
  }

  showToast(`${imageFiles.length}장의 사진이 추가되었습니다.`);
}

function createPageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const id = "page_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
        const page = {
          id,
          file,
          name: file.name,
          rawImage: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          rotation: 0,
          corners: null,
          enhancedCanvas: null,
          croppedCanvas: null,
          thumbUrl: reader.result,
          options: { ...state.defaultOptions },
          status: "idle"
        };

        // Detect corners in worker
        try {
          const offCanvas = document.createElement("canvas");
          offCanvas.width = page.width;
          offCanvas.height = page.height;
          const ctx = offCanvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, page.width, page.height);

          const res = await sendWorkerRequest("DETECT_CORNERS", { imageData: imgData }, [imgData.data.buffer]);
          page.corners = res.corners;
        } catch (err) {
          console.warn("Corner detection error, using default frame", err);
          page.corners = getDefaultCorners(page.width, page.height);
        }

        page.curveHandles = getDefaultCurveHandles(page.corners);
        resolve(page);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getDefaultCorners(w, h) {
  return [
    { x: Math.round(w * 0.04), y: Math.round(h * 0.04) },
    { x: Math.round(w * 0.96), y: Math.round(h * 0.04) },
    { x: Math.round(w * 0.96), y: Math.round(h * 0.96) },
    { x: Math.round(w * 0.04), y: Math.round(h * 0.96) }
  ];
}

function getDefaultCurveHandles(corners) {
  const [tl, tr, br, bl] = corners;
  return {
    tc: { x: Math.round((tl.x + tr.x) / 2), y: Math.round((tl.y + tr.y) / 2) },
    rc: { x: Math.round((tr.x + br.x) / 2), y: Math.round((tr.y + br.y) / 2) },
    bc: { x: Math.round((bl.x + br.x) / 2), y: Math.round((bl.y + br.y) / 2) },
    lc: { x: Math.round((tl.x + bl.x) / 2), y: Math.round((tl.y + bl.y) / 2) }
  };
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

  // Sync sidebar controls with current page options
  syncControlsWithOptions(page.options);

  // Render view
  renderCurrentPage();
  renderFilmstrip();
}

function syncControlsWithOptions(options) {
  // Mode buttons
  [btnModeBw, btnModeGray, btnModeColor].forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === options.mode);
  });

  // Sliders
  sliderShadow.value = options.shadowKernelSize;
  valShadow.textContent = options.shadowKernelSize;

  sliderContrast.value = options.contrast;
  valContrast.textContent = options.contrast;

  sliderSharpen.value = options.sharpen;
  valSharpen.textContent = options.sharpen;

  const strengthPct = Math.round((options.dewarpStrength !== undefined ? options.dewarpStrength : 1.0) * 100);
  sliderDewarp.value = strengthPct;
  valDewarp.textContent = `${strengthPct}%`;

  chkDewarpCurves.checked = !!options.dewarpCurves && strengthPct > 0;
  chkRemoveFingers.checked = !!options.removeFingers;
}



// -------------------------------------------------------------
// Canvas Rendering & In-Canvas Real-time Filter Pipeline
// -------------------------------------------------------------
async function renderCurrentPage() {
  if (state.activeIndex < 0 || state.activeIndex >= state.pages.length) return;
  const page = state.pages[state.activeIndex];

  if (state.viewMode === "preview") {
    // Show straightened and cropped A4 scan result
    if (!page.croppedCanvas) {
      await processCropPage(page, true);
    }
    if (page.croppedCanvas) {
      footerDimensions.textContent = `스캔 결과 해상도: ${page.croppedCanvas.width} × ${page.croppedCanvas.height} px (A4 규격)`;
      drawEditorCanvas(page, page.croppedCanvas);
    }
    if (cornerSvgOverlay) cornerSvgOverlay.classList.add("hidden");
    if (cornerPinsWrap) cornerPinsWrap.classList.add("hidden");
  } else {
    // Show 8-point warp interactive editor
    footerDimensions.textContent = `원본 해상도: ${page.width} × ${page.height} px`;
    if (!page.enhancedCanvas) {
      await enhanceActivePage();
    } else {
      drawEditorCanvas(page, page.enhancedCanvas);
    }
    if (cornerSvgOverlay) cornerSvgOverlay.classList.remove("hidden");
    if (cornerPinsWrap) cornerPinsWrap.classList.remove("hidden");
    updateCornerPinsUI();
  }

  fitZoomToContainer();
}

function drawEditorCanvas(page, targetCanvas) {
  const source = targetCanvas || page.enhancedCanvas;
  if (!source) return;
  resultCanvas.width = source.width;
  resultCanvas.height = source.height;
  const resCtx = resultCanvas.getContext("2d");
  resCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  resCtx.drawImage(source, 0, 0);
}

async function switchViewMode(mode) {
  state.viewMode = mode;
  if (tabModeCrop) tabModeCrop.classList.toggle("active", mode === "crop");
  if (tabModePreview) tabModePreview.classList.toggle("active", mode === "preview");

  if (mode === "crop") {
    if (viewportHintText) viewportHintText.innerHTML = `💡 핸들로 휜 테두리를 맞춘 후 <strong>[📄 펴진 결과 보기]</strong>로 확인하세요`;
  } else {
    if (viewportHintText) viewportHintText.innerHTML = `✨ 뒤틀기(Warp)가 적용되어 <strong>A4 평면으로 반듯하게 펴진 스캔본</strong>입니다`;
  }

  if (state.activeIndex >= 0) {
    await renderCurrentPage();
  }
}

if (tabModeCrop) tabModeCrop.addEventListener("click", () => switchViewMode("crop"));
if (tabModePreview) tabModePreview.addEventListener("click", () => switchViewMode("preview"));

let enhanceDebounceTimer = null;
function debounceEnhance() {
  clearTimeout(enhanceDebounceTimer);
  enhanceDebounceTimer = setTimeout(() => {
    enhanceActivePage();
  }, 60);
}

async function enhanceActivePage() {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];

  try {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = page.width;
    offCanvas.height = page.height;
    const ctx = offCanvas.getContext("2d");
    ctx.drawImage(page.rawImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, page.width, page.height);

    const res = await sendWorkerRequest("ENHANCE_FULL_IMAGE", {
      imageData: imgData,
      options: page.options
    }, [imgData.data.buffer]);

    const outData = res.imageData;
    const pCanvas = document.createElement("canvas");
    pCanvas.width = outData.width;
    pCanvas.height = outData.height;
    pCanvas.getContext("2d").putImageData(outData, 0, 0);

    page.enhancedCanvas = pCanvas;
    page.croppedCanvas = null; // Invalidate crop cache
    page.status = "done";

    if (state.viewMode === "preview") {
      await processCropPage(page, false);
    }
    renderCurrentPage();
  } catch (err) {
    console.error("Enhance error:", err);
    showToast("필터 보정 오류: " + err.message);
  }
}

async function processCropPage(page, showSpinner = true) {
  if (page.croppedCanvas) return;
  if (showSpinner) showProcessing("자른 스캔본 생성 중...");

  try {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = page.width;
    offCanvas.height = page.height;
    const ctx = offCanvas.getContext("2d");
    ctx.drawImage(page.rawImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, page.width, page.height);

    const res = await sendWorkerRequest("PROCESS_IMAGE", {
      imageData: imgData,
      corners: page.corners,
      curveHandles: page.curveHandles,
      options: page.options
    }, [imgData.data.buffer]);

    if (res.isSplit) {
      const p1Data = res.pages[0];
      const pCanvas = document.createElement("canvas");
      pCanvas.width = p1Data.width;
      pCanvas.height = p1Data.height;
      pCanvas.getContext("2d").putImageData(p1Data, 0, 0);
      page.croppedCanvas = pCanvas;
    } else {
      const outData = res.imageData;
      const pCanvas = document.createElement("canvas");
      pCanvas.width = outData.width;
      pCanvas.height = outData.height;
      pCanvas.getContext("2d").putImageData(outData, 0, 0);
      page.croppedCanvas = pCanvas;
    }
  } catch (err) {
    console.error("Crop error:", err);
    if (showSpinner) showToast("크롭 처리 오류: " + err.message);
  } finally {
    if (showSpinner) hideProcessing();
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
// Interactive 8-Point Photoshop-Style Curved Warp UI & Visual Crop Scrim (DIM Mask)
// -------------------------------------------------------------
function updateCornerPinsUI() {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];
  const corners = page.corners;
  if (!corners || corners.length < 4) return;
  const [tl, tr, br, bl] = corners;

  if (!page.curveHandles) {
    page.curveHandles = getDefaultCurveHandles(corners);
  }
  const { tc, rc, bc, lc } = page.curveHandles;

  // Set SVG coordinate system to match original image resolution
  cornerSvgOverlay.setAttribute("viewBox", `0 0 ${page.width} ${page.height}`);

  // Quadratic Bezier control points calculation
  // P_ctrl = 2 * P_handle - 0.5 * (P0 + P1) so curve exactly passes through handle at t=0.5
  const ctrlTop = {
    x: 2 * tc.x - 0.5 * (tl.x + tr.x),
    y: 2 * tc.y - 0.5 * (tl.y + tr.y)
  };
  const ctrlRight = {
    x: 2 * rc.x - 0.5 * (tr.x + br.x),
    y: 2 * rc.y - 0.5 * (tr.y + br.y)
  };
  const ctrlBottom = {
    x: 2 * bc.x - 0.5 * (bl.x + br.x),
    y: 2 * bc.y - 0.5 * (bl.y + br.y)
  };
  const ctrlLeft = {
    x: 2 * lc.x - 0.5 * (tl.x + bl.x),
    y: 2 * lc.y - 0.5 * (tl.y + bl.y)
  };

  // 4 Curved Edge Lines
  if (edgeTop) edgeTop.setAttribute("d", `M ${tl.x} ${tl.y} Q ${ctrlTop.x} ${ctrlTop.y} ${tr.x} ${tr.y}`);
  if (edgeRight) edgeRight.setAttribute("d", `M ${tr.x} ${tr.y} Q ${ctrlRight.x} ${ctrlRight.y} ${br.x} ${br.y}`);
  if (edgeBottom) edgeBottom.setAttribute("d", `M ${br.x} ${br.y} Q ${ctrlBottom.x} ${ctrlBottom.y} ${bl.x} ${bl.y}`);
  if (edgeLeft) edgeLeft.setAttribute("d", `M ${bl.x} ${bl.y} Q ${ctrlLeft.x} ${ctrlLeft.y} ${tl.x} ${tl.y}`);

  // Outer dark scrim: Full image boundary + inner curved quad hole (evenodd)
  if (cropScrimPath) {
    const scrimD = `M 0 0 L ${page.width} 0 L ${page.width} ${page.height} L 0 ${page.height} Z ` +
      `M ${tl.x} ${tl.y} ` +
      `Q ${ctrlTop.x} ${ctrlTop.y} ${tr.x} ${tr.y} ` +
      `Q ${ctrlRight.x} ${ctrlRight.y} ${br.x} ${br.y} ` +
      `Q ${ctrlBottom.x} ${ctrlBottom.y} ${bl.x} ${bl.y} ` +
      `Q ${ctrlLeft.x} ${ctrlLeft.y} ${tl.x} ${tl.y} Z`;
    cropScrimPath.setAttribute("d", scrimD);
  }

  // Position 4 corner pins via CSS percentage
  cornerPins.tl.style.left = `${(tl.x / page.width) * 100}%`;
  cornerPins.tl.style.top = `${(tl.y / page.height) * 100}%`;
  cornerPins.tr.style.left = `${(tr.x / page.width) * 100}%`;
  cornerPins.tr.style.top = `${(tr.y / page.height) * 100}%`;
  cornerPins.br.style.left = `${(br.x / page.width) * 100}%`;
  cornerPins.br.style.top = `${(br.y / page.height) * 100}%`;
  cornerPins.bl.style.left = `${(bl.x / page.width) * 100}%`;
  cornerPins.bl.style.top = `${(bl.y / page.height) * 100}%`;

  // Position 4 curve handles via CSS percentage
  curvePins.tc.style.left = `${(tc.x / page.width) * 100}%`;
  curvePins.tc.style.top = `${(tc.y / page.height) * 100}%`;
  curvePins.rc.style.left = `${(rc.x / page.width) * 100}%`;
  curvePins.rc.style.top = `${(rc.y / page.height) * 100}%`;
  curvePins.bc.style.left = `${(bc.x / page.width) * 100}%`;
  curvePins.bc.style.top = `${(bc.y / page.height) * 100}%`;
  curvePins.lc.style.left = `${(lc.x / page.width) * 100}%`;
  curvePins.lc.style.top = `${(lc.y / page.height) * 100}%`;
}

// 8 Pins Dragging Event Listeners
Object.keys(allPins).forEach((pinKey) => {
  const pinEl = allPins[pinKey];
  if (!pinEl) return;
  pinEl.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    state.isDraggingPin = pinKey;
    loupeWrap.classList.remove("hidden");
    const pt = getPinCoord(pinKey);
    if (pt) updateLoupe(pt, pinKey);
  });
});

function getPinCoord(pinKey) {
  if (state.activeIndex < 0) return null;
  const page = state.pages[state.activeIndex];
  if (["tl", "tr", "br", "bl"].includes(pinKey)) {
    const idx = { tl: 0, tr: 1, br: 2, bl: 3 }[pinKey];
    return page.corners[idx];
  } else if (page.curveHandles && page.curveHandles[pinKey]) {
    return page.curveHandles[pinKey];
  }
  return null;
}

window.addEventListener("mousemove", (e) => {
  if (state.isDraggingPin !== null && state.activeIndex >= 0) {
    const page = state.pages[state.activeIndex];
    const rect = canvasWrapper.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = page.width / rect.width;
    const scaleY = page.height / rect.height;

    const rawX = Math.round(Math.max(0, Math.min(page.width, (e.clientX - rect.left) * scaleX)));
    const rawY = Math.round(Math.max(0, Math.min(page.height, (e.clientY - rect.top) * scaleY)));

    const pinKey = state.isDraggingPin;

    if (["tl", "tr", "br", "bl"].includes(pinKey)) {
      const idx = { tl: 0, tr: 1, br: 2, bl: 3 }[pinKey];
      const oldPt = page.corners[idx];
      const dx = rawX - oldPt.x;
      const dy = rawY - oldPt.y;

      page.corners[idx] = { x: rawX, y: rawY };

      // Propagate proportional shift to adjacent curve handles so curvature is preserved
      if (!page.curveHandles) page.curveHandles = getDefaultCurveHandles(page.corners);
      if (pinKey === "tl") {
        page.curveHandles.tc.x += Math.round(dx / 2);
        page.curveHandles.tc.y += Math.round(dy / 2);
        page.curveHandles.lc.x += Math.round(dx / 2);
        page.curveHandles.lc.y += Math.round(dy / 2);
      } else if (pinKey === "tr") {
        page.curveHandles.tc.x += Math.round(dx / 2);
        page.curveHandles.tc.y += Math.round(dy / 2);
        page.curveHandles.rc.x += Math.round(dx / 2);
        page.curveHandles.rc.y += Math.round(dy / 2);
      } else if (pinKey === "br") {
        page.curveHandles.bc.x += Math.round(dx / 2);
        page.curveHandles.bc.y += Math.round(dy / 2);
        page.curveHandles.rc.x += Math.round(dx / 2);
        page.curveHandles.rc.y += Math.round(dy / 2);
      } else if (pinKey === "bl") {
        page.curveHandles.bc.x += Math.round(dx / 2);
        page.curveHandles.bc.y += Math.round(dy / 2);
        page.curveHandles.lc.x += Math.round(dx / 2);
        page.curveHandles.lc.y += Math.round(dy / 2);
      }
    } else if (page.curveHandles && page.curveHandles[pinKey]) {
      page.curveHandles[pinKey] = { x: rawX, y: rawY };
    }

    updateCornerPinsUI();
    const currentPt = getPinCoord(pinKey);
    if (currentPt) updateLoupe(currentPt, pinKey);
  }
});

window.addEventListener("mouseup", () => {
  if (state.isDraggingPin !== null) {
    state.isDraggingPin = null;
    loupeWrap.classList.add("hidden");

    if (state.activeIndex >= 0) {
      const page = state.pages[state.activeIndex];
      page.croppedCanvas = null; // Invalidate crop cache

      // Pre-compute straightened canvas in background
      processCropPage(page, false).then(() => {
        if (state.viewMode === "preview") {
          renderCurrentPage();
        }
      });
    }
  }
});

function updateLoupe(point, pinKey) {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];
  const pinEl = allPins[pinKey];
  if (!pinEl) return;

  loupeWrap.style.left = pinEl.style.left;
  loupeWrap.style.top = pinEl.style.top;

  const sSize = 60;
  loupeCtx.clearRect(0, 0, 140, 140);
  const sourceImg = page.enhancedCanvas || page.rawImage;
  loupeCtx.drawImage(
    sourceImg,
    point.x - sSize / 2,
    point.y - sSize / 2,
    sSize,
    sSize,
    0,
    0,
    140,
    140
  );
}

// -------------------------------------------------------------
// Zoom & Fit Controls
// -------------------------------------------------------------
function fitZoomToContainer() {
  if (state.activeIndex < 0) return;
  const containerW = canvasContainer.clientWidth - 40;
  const containerH = canvasContainer.clientHeight - 40;
  const page = state.pages[state.activeIndex];

  const scale = Math.min(1.0, containerW / page.width, containerH / page.height);
  setZoom(Math.max(0.1, scale));
}

function setZoom(val) {
  state.zoom = Math.max(0.15, Math.min(3.0, val));
  zoomPercent.textContent = `${Math.round(state.zoom * 100)}%`;

  if (state.activeIndex >= 0) {
    const page = state.pages[state.activeIndex];
    const dw = Math.round(page.width * state.zoom);
    const dh = Math.round(page.height * state.zoom);

    canvasWrapper.style.width = `${dw}px`;
    canvasWrapper.style.height = `${dh}px`;
    resultCanvas.style.width = `${dw}px`;
    resultCanvas.style.height = `${dh}px`;
  }
}

btnZoomIn.addEventListener("click", () => setZoom(state.zoom * 1.2));
btnZoomOut.addEventListener("click", () => setZoom(state.zoom / 1.2));
btnZoomFit.addEventListener("click", () => fitZoomToContainer());

canvasContainer.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.deltaY < 0) {
    setZoom(state.zoom * 1.1);
  } else {
    setZoom(state.zoom / 1.1);
  }
});

// -------------------------------------------------------------
// Sidebar Parameter Listeners
// -------------------------------------------------------------
[btnModeBw, btnModeGray, btnModeColor].forEach((btn) => {
  btn.addEventListener("click", () => {
    if (state.activeIndex < 0) return;
    const mode = btn.dataset.mode;
    state.pages[state.activeIndex].options.mode = mode;
    state.defaultOptions.mode = mode;

    [btnModeBw, btnModeGray, btnModeColor].forEach((b) => b.classList.toggle("active", b === btn));
    enhanceActivePage();
  });
});

sliderShadow.addEventListener("input", (e) => {
  valShadow.textContent = e.target.value;
  if (state.activeIndex >= 0) {
    state.pages[state.activeIndex].options.shadowKernelSize = parseInt(e.target.value, 10);
    state.defaultOptions.shadowKernelSize = parseInt(e.target.value, 10);
    debounceEnhance();
  }
});

sliderContrast.addEventListener("input", (e) => {
  valContrast.textContent = e.target.value;
  if (state.activeIndex >= 0) {
    state.pages[state.activeIndex].options.contrast = parseFloat(e.target.value);
    state.defaultOptions.contrast = parseFloat(e.target.value);
    debounceEnhance();
  }
});

sliderSharpen.addEventListener("input", (e) => {
  valSharpen.textContent = e.target.value;
  if (state.activeIndex >= 0) {
    state.pages[state.activeIndex].options.sharpen = parseFloat(e.target.value);
    state.defaultOptions.sharpen = parseFloat(e.target.value);
    debounceEnhance();
  }
});

sliderDewarp.addEventListener("input", (e) => {
  const pct = parseInt(e.target.value, 10);
  valDewarp.textContent = `${pct}%`;
  if (state.activeIndex >= 0) {
    const page = state.pages[state.activeIndex];
    page.options.dewarpStrength = pct / 100;
    page.options.dewarpCurves = pct > 0;
    state.defaultOptions.dewarpStrength = pct / 100;
    state.defaultOptions.dewarpCurves = pct > 0;
    chkDewarpCurves.checked = pct > 0;
    page.enhancedCanvas = null;
    page.croppedCanvas = null;
    debounceEnhance();
  }
});

chkDewarpCurves.addEventListener("change", (e) => {
  if (state.activeIndex >= 0) {
    const page = state.pages[state.activeIndex];
    page.options.dewarpCurves = e.target.checked;
    const strength = e.target.checked ? 1.0 : 0.0;
    page.options.dewarpStrength = strength;
    state.defaultOptions.dewarpCurves = e.target.checked;
    state.defaultOptions.dewarpStrength = strength;

    sliderDewarp.value = Math.round(strength * 100);
    valDewarp.textContent = `${sliderDewarp.value}%`;

    page.enhancedCanvas = null;
    page.croppedCanvas = null;
    debounceEnhance();
  }
});

chkRemoveFingers.addEventListener("change", (e) => {
  if (state.activeIndex >= 0) {
    const page = state.pages[state.activeIndex];
    page.options.removeFingers = e.target.checked;
    state.defaultOptions.removeFingers = e.target.checked;
    page.croppedCanvas = null;
  }
});


btnRotateLeft.addEventListener("click", () => rotateActivePage(-90));
btnRotateRight.addEventListener("click", () => rotateActivePage(90));

function rotateActivePage(deg) {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];

  // Rotate rawImage onto an offscreen canvas
  const canvas = document.createElement("canvas");
  const is90or270 = Math.abs(deg) === 90 || Math.abs(deg) === 270;
  canvas.width = is90or270 ? page.height : page.width;
  canvas.height = is90or270 ? page.width : page.height;

  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(page.rawImage, -page.width / 2, -page.height / 2);

  const newImg = new Image();
  newImg.onload = async () => {
    page.rawImage = newImg;
    page.width = newImg.width;
    page.height = newImg.height;
    page.corners = getDefaultCorners(page.width, page.height);
    page.curveHandles = getDefaultCurveHandles(page.corners);
    page.enhancedCanvas = null;
    page.croppedCanvas = null;
    await renderActivePage();
  };
  newImg.src = canvas.toDataURL("image/png");
}

btnAutoCorners.addEventListener("click", async () => {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];
  showProcessing("모서리 자동 재감지 중...");

  try {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = page.width;
    offCanvas.height = page.height;
    const ctx = offCanvas.getContext("2d");
    ctx.drawImage(page.rawImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, page.width, page.height);

    const res = await sendWorkerRequest("DETECT_CORNERS", { imageData: imgData }, [imgData.data.buffer]);
    page.corners = res.corners;
    page.curveHandles = getDefaultCurveHandles(page.corners);
    page.croppedCanvas = null;
    updateCornerPinsUI();
    showToast("모서리가 자동으로 감지되었습니다.");
  } catch (err) {
    showToast("모서리 감지 오류: " + err.message);
  } finally {
    hideProcessing();
  }
});

btnSplitSpread.addEventListener("click", () => splitCurrentSpreadPage());

async function splitCurrentSpreadPage() {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];
  showProcessing("펼친 양면 책을 왼쪽/오른쪽 2장으로 분할 중...");

  try {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = page.width;
    offCanvas.height = page.height;
    const ctx = offCanvas.getContext("2d");
    ctx.drawImage(page.rawImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, page.width, page.height);

    const res = await sendWorkerRequest("SPLIT_SPREAD", { imageData: imgData }, [imgData.data.buffer]);
    const { leftData, rightData } = res;

    // Convert leftData to Image
    const leftCanvas = document.createElement("canvas");
    leftCanvas.width = leftData.width;
    leftCanvas.height = leftData.height;
    leftCanvas.getContext("2d").putImageData(leftData, 0, 0);

    const leftImg = new Image();
    const leftLoadPromise = new Promise((resolve, reject) => {
      leftImg.onload = resolve;
      leftImg.onerror = reject;
    });
    leftImg.src = leftCanvas.toDataURL("image/png");
    await leftLoadPromise;

    // Convert rightData to Image
    const rightCanvas = document.createElement("canvas");
    rightCanvas.width = rightData.width;
    rightCanvas.height = rightData.height;
    rightCanvas.getContext("2d").putImageData(rightData, 0, 0);

    const rightImg = new Image();
    const rightLoadPromise = new Promise((resolve, reject) => {
      rightImg.onload = resolve;
      rightImg.onerror = reject;
    });
    rightImg.src = rightCanvas.toDataURL("image/png");
    await rightLoadPromise;

    // Auto detect corners for both separated pages
    let leftCorners = getDefaultCorners(leftImg.width, leftImg.height);
    let rightCorners = getDefaultCorners(rightImg.width, rightImg.height);

    try {
      const lData = leftCanvas.getContext("2d").getImageData(0, 0, leftData.width, leftData.height);
      const lRes = await sendWorkerRequest("DETECT_CORNERS", { imageData: lData }, [lData.data.buffer]);
      if (lRes && lRes.corners) leftCorners = lRes.corners;
    } catch (e) {
      console.warn("Left corner detection fallback:", e);
    }

    try {
      const rData = rightCanvas.getContext("2d").getImageData(0, 0, rightData.width, rightData.height);
      const rRes = await sendWorkerRequest("DETECT_CORNERS", { imageData: rData }, [rData.data.buffer]);
      if (rRes && rRes.corners) rightCorners = rRes.corners;
    } catch (e) {
      console.warn("Right corner detection fallback:", e);
    }

    const baseName = page.name.replace(/\s*\([0-9]+\/[0-9]+\s*(좌|우)\)$/, "");

    const leftPage = {
      name: `${baseName} (좌)`,
      rawImage: leftImg,
      width: leftImg.width,
      height: leftImg.height,
      corners: leftCorners,
      curveHandles: getDefaultCurveHandles(leftCorners),
      options: { ...page.options, isDoublePage: false, dewarpCurves: true },
      enhancedCanvas: null,
      croppedCanvas: null,
      thumbUrl: leftCanvas.toDataURL("image/jpeg", 0.75),
      status: "ready"
    };

    const rightPage = {
      name: `${baseName} (우)`,
      rawImage: rightImg,
      width: rightImg.width,
      height: rightImg.height,
      corners: rightCorners,
      curveHandles: getDefaultCurveHandles(rightCorners),
      options: { ...page.options, isDoublePage: false, dewarpCurves: true },
      enhancedCanvas: null,
      croppedCanvas: null,
      thumbUrl: rightCanvas.toDataURL("image/jpeg", 0.75),
      status: "ready"
    };

    const currentIndex = state.activeIndex;
    state.pages.splice(currentIndex, 1, leftPage, rightPage);

    updateUIState();
    selectPage(currentIndex);
    showToast("양면 페이지를 왼쪽/오른쪽 2장으로 분할했습니다!");
  } catch (err) {
    console.error("Split page error:", err);
    showToast("양면 분할 중 오류가 발생했습니다: " + err.message);
  } finally {
    hideProcessing();
  }
}

btnApplyAll.addEventListener("click", async () => {
  if (state.pages.length === 0) return;
  const currentOptions = state.pages[state.activeIndex].options;

  state.pages.forEach((p) => {
    p.options = { ...currentOptions };
    p.enhancedCanvas = null;
    p.croppedCanvas = null;
  });

  showToast("모든 페이지에 설정을 일괄 적용합니다.");
  showProcessing("전체 페이지 일괄 보정 중...");

  for (let i = 0; i < state.pages.length; i++) {
    processingStatusText.textContent = `전체 처리 중 (${i + 1}/${state.pages.length})...`;
    state.activeIndex = i;
    await enhanceActivePage();
  }

  hideProcessing();
  showToast("전체 페이지 보정이 완료되었습니다!");
  renderFilmstrip();
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
// Export: PDF & ZIP & Clipboard (Applies Crop on Export)
// -------------------------------------------------------------
btnExportPdf.addEventListener("click", async () => {
  if (state.pages.length === 0) return;
  showProcessing("고화질 PDF 문서 생성 중...");

  try {
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    for (let i = 0; i < state.pages.length; i++) {
      processingStatusText.textContent = `PDF 페이지 생성 중 (${i + 1}/${state.pages.length})...`;
      const page = state.pages[i];

      if (!page.croppedCanvas) {
        await processCropPage(page);
      }

      const blob = await new Promise((res) => page.croppedCanvas.toBlob(res, "image/jpeg", 0.92));
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

    showToast("PDF 문서가 다운로드되었습니다.");
  } catch (err) {
    console.error("PDF export error:", err);
    showToast("PDF 생성 중 오류가 발생했습니다: " + err.message);
  } finally {
    hideProcessing();
  }
});

btnExportZip.addEventListener("click", async () => {
  if (state.pages.length === 0) return;
  showProcessing("ZIP 압축 생성 중...");

  try {
    const zip = new JSZip();

    for (let i = 0; i < state.pages.length; i++) {
      processingStatusText.textContent = `이미지 압축 중 (${i + 1}/${state.pages.length})...`;
      const page = state.pages[i];

      if (!page.croppedCanvas) {
        await processCropPage(page);
      }

      const blob = await new Promise((res) => page.croppedCanvas.toBlob(res, "image/png"));
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

    showToast("ZIP 압축 파일이 다운로드되었습니다.");
  } catch (err) {
    console.error("ZIP export error:", err);
    showToast("ZIP 생성 중 오류: " + err.message);
  } finally {
    hideProcessing();
  }
});

btnCopyClipboard.addEventListener("click", async () => {
  if (state.activeIndex < 0) return;
  const page = state.pages[state.activeIndex];
  if (!page.croppedCanvas) {
    await processCropPage(page);
  }
  if (!page.croppedCanvas) return;

  try {
    const blob = await new Promise((res) => page.croppedCanvas.toBlob(res, "image/png"));
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
    showToast("자른 스캔 이미지가 클립보드에 복사되었습니다!");
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
