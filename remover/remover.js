/**
 * Oh My Image Manager - Studio Controller
 * AI On-Device background removal, color keying, and brush retouching.
 */

// Application State
const state = {
  originalImage: null,
  fileName: "image.png",
  viewMode: "result", // 'result' | 'original' | 'split'
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  isPanning: false,
  isSpacePressed: false,
  panStart: { x: 0, y: 0 },

  // Split View
  splitPos: 0.5, // 0.0 - 1.0
  isSplitDragging: false,

  // Tool Modes
  activeTool: "brush", // 'brush' | 'eyedropper'
  brush: {
    mode: "erase", // 'erase' | 'restore'
    size: 30,
    hardness: 0.5,
    isDrawing: false,
  },

  colorKey: {
    targetColor: [255, 255, 255],
    hex: "#FFFFFF",
    tolerance: 30,
    feather: 2,
    eyedropperActive: false,
  },

  bgFill: "transparent", // 'transparent' | '#ffffff' | '#000000' | custom hex

  ai: {
    modelId: "briaai/RMBG-1.4",
    isProcessing: false,
  },

  crop: {
    isActive: false,
    isDragging: false,
    isMoving: false,
    isResizing: false,
    resizeHandle: null,
    moveStartPos: { x: 0, y: 0 },
    initialRect: null,
    startX: 0,
    startY: 0,
    currentRect: null,
    lockAspectRatio: false,
    aspectRatio: 1.0,
    presetRatio: "free",
  },

  resize: {
    lockAspectRatio: true,
    aspectRatio: 1.0,
  },

  object: {
    active: false,
    tool: "select", // 'select' | 'rect' | 'circle' | 'arrow' | 'line' | 'text'
    isDrawing: false,
    isMoving: false,
    isResizing: false,
    isRotating: false,
    hasModified: false,
    resizeHandle: null,
    moveStartPos: { x: 0, y: 0 },
    initialItem: null,
  },
};

// History Manager
const historyManager = new HistoryManager(25);

// Web Worker for AI Segmentation
let aiWorker = null;

// DOM Elements
const dropZone = document.getElementById("dropZone");
const editorWorkspace = document.getElementById("editorWorkspace");
const fileInput = document.getElementById("fileInput");
const imageDimensions = document.getElementById("imageDimensions");
const btnOpenCropper = document.getElementById("btnOpenCropper");
const btnThemeToggle = document.getElementById("btnThemeToggle");
const btnHelp = document.getElementById("btnHelp");

// Canvas Stage & Transform Layer
const canvasStage = document.getElementById("canvasStage");
const canvasTransformLayer = document.getElementById("canvasTransformLayer");
const mainCanvas = document.getElementById("mainCanvas");
const objectCanvas = document.getElementById("objectCanvas");
const originalCanvas = document.getElementById("originalCanvas");
const bgCanvas = document.getElementById("bgCanvas");
const splitOverlayCanvas = document.getElementById("splitOverlayCanvas");
const splitDivider = document.getElementById("splitDivider");
const brushCursor = document.getElementById("brushCursor");
const objectOverlayLayer = document.getElementById("objectOverlayLayer");
const objectSelectionBox = document.getElementById("objectSelectionBox");
const inlineTextEditor = document.getElementById("inlineTextEditor");
let objectEngine = null;
const cropOverlayLayer = document.getElementById("cropOverlayLayer");
const cropSelectionBox = document.getElementById("cropSelectionBox");
const cropInfoBadge = document.getElementById("cropInfoBadge");
const aiScanOverlay = document.getElementById("aiScanOverlay");
const scanBadgeText = document.getElementById("scanBadgeText");

// AI Section Elements
const selectAiModel = document.getElementById("selectAiModel");
const btnRunAi = document.getElementById("btnRunAi");
const aiProgressWrap = document.getElementById("aiProgressWrap");
const aiProgressBarFill = document.getElementById("aiProgressBarFill");
const aiStatusText = document.getElementById("aiStatusText");
const aiBackendBadge = document.getElementById("aiBackendBadge");

// Color Key Elements
const btnEyedropper = document.getElementById("btnEyedropper");
const colorPreviewBox = document.getElementById("colorPreviewBox");
const colorHexText = document.getElementById("colorHexText");
const rangeTolerance = document.getElementById("rangeTolerance");
const valTolerance = document.getElementById("valTolerance");
const rangeFeather = document.getElementById("rangeFeather");
const valFeather = document.getElementById("valFeather");
const btnApplyColorKey = document.getElementById("btnApplyColorKey");

// Brush Elements
const btnBrushErase = document.getElementById("btnBrushErase");
const btnBrushRestore = document.getElementById("btnBrushRestore");
const rangeBrushSize = document.getElementById("rangeBrushSize");
const valBrushSize = document.getElementById("valBrushSize");
const rangeBrushHardness = document.getElementById("rangeBrushHardness");
const valBrushHardness = document.getElementById("valBrushHardness");

// Crop & Trim Elements
const btnAutoTrim = document.getElementById("btnAutoTrim");
const btnManualCrop = document.getElementById("btnManualCrop");
const cropSettingsPanel = document.getElementById("cropSettingsPanel");
const inputCropWidth = document.getElementById("inputCropWidth");
const inputCropHeight = document.getElementById("inputCropHeight");
const checkCropLockRatio = document.getElementById("checkCropLockRatio");
const labelCropLockRatio = document.getElementById("labelCropLockRatio");
const iconCropLock = document.getElementById("iconCropLock");
const iconCropUnlock = document.getElementById("iconCropUnlock");
const cropPresetChips = document.querySelectorAll(".crop-presets .btn-preset-chip");
const cropActionGroup = document.getElementById("cropActionGroup");
const btnApplyCrop = document.getElementById("btnApplyCrop");
const btnCancelCrop = document.getElementById("btnCancelCrop");

// Resize Elements
const currentResolutionText = document.getElementById("currentResolutionText");
const inputResizeWidth = document.getElementById("inputResizeWidth");
const inputResizeHeight = document.getElementById("inputResizeHeight");
const checkLockRatio = document.getElementById("checkLockRatio");
const labelLockRatio = document.getElementById("labelLockRatio");
const iconLock = document.getElementById("iconLock");
const iconUnlock = document.getElementById("iconUnlock");
const btnApplyResize = document.getElementById("btnApplyResize");
const resizePresetChips = document.querySelectorAll(".resize-presets .btn-preset-chip");

// Object Studio Elements
const objectToolSection = document.getElementById("objectToolSection");
const btnToggleObjectPanel = document.getElementById("btnToggleObjectPanel");
const textToggleObject = document.getElementById("textToggleObject");
const objectControlsPanel = document.getElementById("objectControlsPanel");
const objToolButtons = document.querySelectorAll(".btn-obj-tool");
const objInspector = document.getElementById("objInspector");
const objShapeControls = document.getElementById("objShapeControls");
const colObjStroke = document.getElementById("colObjStroke");
const labelStrokeText = document.getElementById("labelStrokeText");
const wrapObjStrokeChip = document.getElementById("wrapObjStrokeChip");
const inputObjStrokeColor = document.getElementById("inputObjStrokeColor");
const chipObjStrokeColor = document.getElementById("chipObjStrokeColor");
const iconStrokeNone = document.getElementById("iconStrokeNone");
const btnObjStrokeClear = document.getElementById("btnObjStrokeClear");
const colObjFill = document.getElementById("colObjFill");
const wrapObjFillChip = document.getElementById("wrapObjFillChip");
const inputObjFillColor = document.getElementById("inputObjFillColor");
const chipObjFillColor = document.getElementById("chipObjFillColor");
const iconFillNone = document.getElementById("iconFillNone");
const btnObjFillClear = document.getElementById("btnObjFillClear");
const groupStrokeWidth = document.getElementById("groupStrokeWidth");
const rangeObjStrokeWidth = document.getElementById("rangeObjStrokeWidth");
const valObjStrokeWidth = document.getElementById("valObjStrokeWidth");
const groupOpacity = document.getElementById("groupOpacity");
const rangeObjOpacity = document.getElementById("rangeObjOpacity");
const valObjOpacity = document.getElementById("valObjOpacity");
const groupBorderRadius = document.getElementById("groupBorderRadius");
const rangeObjRadius = document.getElementById("rangeObjRadius");
const valObjRadius = document.getElementById("valObjRadius");

// 3-Tier Text Inspector Elements
const objTextInspector = document.getElementById("objTextInspector");
const chkTextFill = document.getElementById("chkTextFill");
const selectTextFontFamily = document.getElementById("selectTextFontFamily");
const btnScanLocalFonts = document.getElementById("btnScanLocalFonts");
const inputObjFontSize = document.getElementById("inputObjFontSize");
const wrapTextFillChip = document.getElementById("wrapTextFillChip");
const inputTextFillColor = document.getElementById("inputTextFillColor");
const chipTextFillColor = document.getElementById("chipTextFillColor");
const btnObjBold = document.getElementById("btnObjBold");
const btnTextItalic = document.getElementById("btnTextItalic");
const btnTextAlignLeft = document.getElementById("btnTextAlignLeft");
const btnTextAlignCenter = document.getElementById("btnTextAlignCenter");
const btnTextAlignRight = document.getElementById("btnTextAlignRight");
const rangeTextOpacity = document.getElementById("rangeTextOpacity");
const valTextOpacity = document.getElementById("valTextOpacity");

const chkTextStroke = document.getElementById("chkTextStroke");
const wrapTextStrokeChip = document.getElementById("wrapTextStrokeChip");
const inputTextStrokeColor = document.getElementById("inputTextStrokeColor");
const chipTextStrokeColor = document.getElementById("chipTextStrokeColor");
const bodyTextStroke = document.getElementById("bodyTextStroke");
const rangeTextStrokeWidth = document.getElementById("rangeTextStrokeWidth");
const valTextStrokeWidth = document.getElementById("valTextStrokeWidth");

const chkTextShadow = document.getElementById("chkTextShadow");
const wrapTextShadowChip = document.getElementById("wrapTextShadowChip");
const inputTextShadowColor = document.getElementById("inputTextShadowColor");
const chipTextShadowColor = document.getElementById("chipTextShadowColor");
const bodyTextShadow = document.getElementById("bodyTextShadow");
const rangeTextShadowBlur = document.getElementById("rangeTextShadowBlur");
const valTextShadowBlur = document.getElementById("valTextShadowBlur");
const rangeTextShadowOffset = document.getElementById("rangeTextShadowOffset");
const valTextShadowOffset = document.getElementById("valTextShadowOffset");

const btnObjDuplicate = document.getElementById("btnObjDuplicate");
const btnObjBringForward = document.getElementById("btnObjBringForward");
const btnObjSendBackward = document.getElementById("btnObjSendBackward");
const btnObjDelete = document.getElementById("btnObjDelete");

// Action Elements
const btnUndo = document.getElementById("btnUndo");
const btnRedo = document.getElementById("btnRedo");
const selectSaveFormat = document.getElementById("selectSaveFormat");
const warnNoTransparency = document.getElementById("warnNoTransparency");
const warnNoticeText = document.getElementById("warnNoticeText");
const btnDownloadImage = document.getElementById("btnDownloadImage") || document.getElementById("btnDownloadPng");
const btnDownloadPng = btnDownloadImage;
const btnCopyClipboard = document.getElementById("btnCopyClipboard");
const btnResetImage = document.getElementById("btnResetImage");

// View Toolbar Elements
const tabResultView = document.getElementById("tabResultView");
const tabOriginalView = document.getElementById("tabOriginalView");
const tabSplitView = document.getElementById("tabSplitView");
const btnZoomIn = document.getElementById("btnZoomIn");
const btnZoomOut = document.getElementById("btnZoomOut");
const btnZoomReset = document.getElementById("btnZoomReset");
const btnZoomFit = document.getElementById("btnZoomFit");
const zoomLevelText = document.getElementById("zoomLevelText");
const cursorPosText = document.getElementById("cursorPosText");
const toastMessage = document.getElementById("toastMessage");

// Initialize App
async function init() {
  if (typeof I18N !== "undefined") {
    await I18N.initDOM();
    await I18N.setupLanguageSelector("uiLanguageSelect", () => {
      if (state.originalImage) {
        imageDimensions.textContent = `${state.fileName} (${state.originalImage.width} x ${state.originalImage.height} px)`;
      } else {
        imageDimensions.textContent = I18N.t("imageDimensionsEmpty");
      }
    });
  }
  setupTheme();
  setupAIWorker();
  setupDragAndDrop();
  setupClipboardPaste();
  setupFileInput();
  setupViewModes();
  setupZoomAndPan();
  setupCanvasInteractions();
  setupAIControls();
  setupColorKeyControls();
  setupBrushControls();
  setupBgFillControls();
  setupCropControls();
  setupResizeControls();
  setupObjectTools();
  setupActionButtons();
  setupShortcuts();
  checkPendingCapture();
}

// -------------------------------------------------------------
// Pending Capture Check
// -------------------------------------------------------------
function checkPendingCapture() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["oh_my_img_capture"], async (result) => {
      if (result.oh_my_img_capture) {
        const dataUrl = result.oh_my_img_capture;
        chrome.storage.local.remove("oh_my_img_capture");

        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], "captured_area.png", { type: "image/png" });
          loadImageFile(file);
        } catch (err) {
          console.error("Failed to load captured image", err);
        }
      }
    });
  }
}

// -------------------------------------------------------------
// Theme Management
// -------------------------------------------------------------
function setupTheme() {
  const savedTheme = localStorage.getItem("oh_my_img_theme");
  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    applyTheme("light");
  } else {
    applyTheme("dark");
  }

  btnThemeToggle.addEventListener("click", () => {
    const currentTheme = document.body.classList.contains("light-theme") ? "light" : "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem("oh_my_img_theme", nextTheme);
  });
}

function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
  }
}

// -------------------------------------------------------------
// AI Worker Setup
// -------------------------------------------------------------
function setupAIWorker() {
  try {
    aiWorker = new Worker("bg-worker.js", { type: "module" });
    aiWorker.onmessage = handleWorkerMessage;
    aiWorker.onerror = (err) => {
      console.error("Worker error:", err);
      showToast(typeof I18N !== "undefined" ? I18N.t("toastWorkerError") : "AI 백그라운드 워커 오류가 발생했습니다.");
    };
  } catch (err) {
    console.warn("Web Worker creation failed. AI features may run fallback.", err);
  }
}

// -------------------------------------------------------------
// AI Progress Management & Smooth Simulation
// -------------------------------------------------------------
let aiProgressTimer = null;
let currentAiProgress = 0;

function resetAiProgress() {
  if (aiProgressTimer) {
    clearInterval(aiProgressTimer);
    aiProgressTimer = null;
  }
  currentAiProgress = 0;
  if (aiProgressBarFill) {
    aiProgressBarFill.style.transition = "none";
    aiProgressBarFill.style.width = "0%";
    void aiProgressBarFill.offsetWidth; // Force reflow
    aiProgressBarFill.style.transition = "";
  }
  if (aiProgressWrap) {
    aiProgressWrap.classList.add("hidden");
  }
}

function setAiProgress(percent, statusMsg) {
  currentAiProgress = percent;
  if (aiProgressBarFill) {
    aiProgressBarFill.style.width = `${percent}%`;
  }
  if (statusMsg) {
    if (aiStatusText) aiStatusText.textContent = statusMsg;
    if (scanBadgeText) scanBadgeText.textContent = statusMsg;
  }
}

function startInferenceProgressSimulation() {
  if (aiProgressTimer) {
    clearInterval(aiProgressTimer);
    aiProgressTimer = null;
  }
  if (currentAiProgress < 20) {
    currentAiProgress = 15;
  } else if (currentAiProgress > 85) {
    currentAiProgress = 85;
  }
  if (aiProgressBarFill) {
    aiProgressBarFill.style.width = `${currentAiProgress}%`;
  }

  aiProgressTimer = setInterval(() => {
    if (currentAiProgress < 90) {
      const remaining = 90 - currentAiProgress;
      const step = Math.max(0.4, remaining * 0.08);
      currentAiProgress = Math.min(90, currentAiProgress + step);
      if (aiProgressBarFill) {
        aiProgressBarFill.style.width = `${Math.round(currentAiProgress)}%`;
      }
    }
  }, 120);
}

function handleWorkerMessage(e) {
  const { type, progress, file, maskBuffer, width, height, error, backend } = e.data;

  if (type === "BACKEND_INFO") {
    aiBackendBadge.classList.remove("hidden", "badge-webgpu", "badge-wasm");
    if (backend === "webgpu") {
      aiBackendBadge.classList.add("badge-webgpu");
      aiBackendBadge.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span>WebGPU 가속</span>
      `;
    } else {
      aiBackendBadge.classList.add("badge-wasm");
      aiBackendBadge.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <span>WASM 모드</span>
      `;
    }
  } else if (type === "INITIATE") {
    aiProgressWrap.classList.remove("hidden");
    const statusMsg = typeof I18N !== "undefined" ? I18N.t("modelLoadingStatus") : "준비 중...";
    setAiProgress(5, statusMsg);
  } else if (type === "PROGRESS") {
    aiProgressWrap.classList.remove("hidden");
    const dlMsg = typeof I18N !== "undefined" ? I18N.t("modelDownloading", [progress]) : `다운로드 중... (${progress}%)`;
    setAiProgress(progress, dlMsg);
  } else if (type === "INFERENCE_START") {
    const infMsg = typeof I18N !== "undefined" ? I18N.t("modelInferencing") : "배경 제거 중...";
    if (aiStatusText) aiStatusText.textContent = infMsg;
    if (scanBadgeText) scanBadgeText.textContent = infMsg;
    startInferenceProgressSimulation();
  } else if (type === "SUCCESS") {
    if (aiProgressTimer) {
      clearInterval(aiProgressTimer);
      aiProgressTimer = null;
    }
    const doneMsg = typeof I18N !== "undefined" ? I18N.t("toastAiDone") : "완료!";
    setAiProgress(100, doneMsg);

    const maskData = new Uint8ClampedArray(maskBuffer);
    RemoverEngine.applyAlphaMask(mainCanvas, maskData, width, height, originalCanvas);

    historyManager.pushState(mainCanvas, originalCanvas);
    updateCanvasDisplay();

    setTimeout(() => {
      resetAiProgress();
      setAIProcessingState(false);
      showToast(typeof I18N !== "undefined" ? I18N.t("toastAiDone") : "AI 배경 제거가 완료되었습니다!", "success");
    }, 400);
  } else if (type === "ERROR") {
    resetAiProgress();
    setAIProcessingState(false);
    alert(typeof I18N !== "undefined" ? I18N.t("alertAiFailed", [error]) : `AI 배경 제거 실패: ${error}`);
  }
}

// -------------------------------------------------------------
// AI Processing State & Visual Feedback Controller
// -------------------------------------------------------------
function setAIProcessingState(isProcessing, statusText = "") {
  state.ai.isProcessing = isProcessing;

  if (isProcessing) {
    canvasStage.classList.add("ai-processing");
    if (aiScanOverlay) aiScanOverlay.classList.remove("hidden");
    if (brushCursor) brushCursor.classList.add("hidden");
    if (statusText && scanBadgeText) {
      scanBadgeText.textContent = statusText;
    }
    enableControls(false);
    if (btnUndo) btnUndo.disabled = true;
    if (btnRedo) btnRedo.disabled = true;
  } else {
    canvasStage.classList.remove("ai-processing");
    if (aiScanOverlay) aiScanOverlay.classList.add("hidden");
    enableControls(true);
    updateUndoRedoButtons();
  }
}

// -------------------------------------------------------------
// Image Input Handling (Drop / File / Paste)
// -------------------------------------------------------------
function setupDragAndDrop() {
  ["dragenter", "dragover"].forEach((name) => {
    document.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((name) => {
    document.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("dragover");
    });
  });

  document.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      loadImageFile(dt.files[0]);
    }
  });
}

function setupClipboardPaste() {
  document.addEventListener("paste", (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          loadImageFile(file, "clipboard_image.png");
          showToast(typeof I18N !== "undefined" ? I18N.t("toastClipboardLoaded") : "클립보드 이미지를 불러왔습니다!", "info");
          break;
        }
      }
    }
  });
}

function setupFileInput() {
  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      loadImageFile(e.target.files[0]);
      e.target.value = "";
    }
  });
}

async function loadImageFile(file, customName) {
  if (!file || !file.type.startsWith("image/")) {
    alert(typeof I18N !== "undefined" ? I18N.t("alertSelectValidImage") : "올바른 이미지 파일을 선택해 주세요.");
    return;
  }

  state.fileName = customName || file.name || "image.png";

  try {
    const image = await RemoverEngine.loadImage(file);
    state.originalImage = image;

    const width = image.width;
    const height = image.height;

    // Initialize Canvases
    [mainCanvas, originalCanvas, bgCanvas, splitOverlayCanvas, objectCanvas].forEach((c) => {
      if (c) {
        c.width = width;
        c.height = height;
      }
    });

    if (objectEngine) {
      objectEngine.clearAll();
      objectEngine.clearHistory();
      objectEngine.resize(width, height);
    }

    canvasTransformLayer.style.width = `${width}px`;
    canvasTransformLayer.style.height = `${height}px`;

    const origCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
    origCtx.drawImage(image, 0, 0);

    const mainCtx = mainCanvas.getContext("2d", { willReadFrequently: true });
    mainCtx.drawImage(image, 0, 0);

    // Reset History & Crop State
    setCropMode(false);
    setObjectStudioMode(true);
    resetAiProgress();
    historyManager.clear();
    historyManager.pushState(mainCanvas, originalCanvas);
    updateUndoRedoButtons();

    // UI Updates
    imageDimensions.textContent = `${state.fileName} (${width} x ${height} px)`;
    dropZone.classList.add("hidden");
    editorWorkspace.classList.remove("hidden");

    // Initialize Resize State & Inputs
    state.resize.aspectRatio = width / height;
    state.resize.lockAspectRatio = true;
    if (inputResizeWidth) inputResizeWidth.value = width;
    if (inputResizeHeight) inputResizeHeight.value = height;
    if (currentResolutionText) currentResolutionText.textContent = `${width} x ${height}`;
    if (checkLockRatio) checkLockRatio.checked = true;
    if (labelLockRatio) labelLockRatio.classList.add("active");
    if (iconLock && iconUnlock) {
      iconLock.classList.remove("hidden");
      iconUnlock.classList.add("hidden");
    }

    // Initialize Crop State & Inputs
    state.crop.lockAspectRatio = false;
    state.crop.aspectRatio = 1.0;
    state.crop.presetRatio = "free";
    if (checkCropLockRatio) checkCropLockRatio.checked = false;
    if (labelCropLockRatio) labelCropLockRatio.classList.remove("active");
    if (iconCropLock && iconCropUnlock) {
      iconCropLock.classList.add("hidden");
      iconCropUnlock.classList.remove("hidden");
    }
    if (cropPresetChips) {
      cropPresetChips.forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.ratio === "free");
      });
    }
    if (inputCropWidth) inputCropWidth.value = "";
    if (inputCropHeight) inputCropHeight.value = "";

    enableControls(true);
    resetZoomAndFit();
    updateCanvasDisplay();
  } catch (err) {
    console.error("Image load failed:", err);
    alert(typeof I18N !== "undefined" ? I18N.t("alertLoadImageFailed") : "이미지를 불러오는 중 오류가 발생했습니다.");
  }
}

function enableControls(enabled) {
  [
    btnRunAi,
    btnEyedropper,
    btnApplyColorKey,
    selectSaveFormat,
    btnDownloadImage,
    btnCopyClipboard,
    btnResetImage,
    btnAutoTrim,
    btnManualCrop,
    inputCropWidth,
    inputCropHeight,
    checkCropLockRatio,
    btnApplyResize,
    checkLockRatio,
    inputResizeWidth,
    inputResizeHeight,
    btnToggleObjectPanel,
  ].forEach((btn) => {
    if (btn) btn.disabled = !enabled;
  });

  if (objToolButtons) {
    objToolButtons.forEach((btn) => {
      btn.disabled = !enabled;
    });
  }

  if (!enabled) {
    if (warnNoTransparency) warnNoTransparency.classList.add("hidden");
  } else {
    updateFormatNotice();
  }

  if (cropPresetChips) {
    cropPresetChips.forEach((chip) => {
      chip.disabled = !enabled;
    });
  }

  if (resizePresetChips) {
    resizePresetChips.forEach((chip) => {
      chip.disabled = !enabled;
    });
  }
}

// -------------------------------------------------------------
// Canvas Rendering & View Modes
// -------------------------------------------------------------
function updateCanvasDisplay() {
  if (!state.originalImage) return;

  const width = mainCanvas.width;
  const height = mainCanvas.height;

  if (state.viewMode === "result") {
    mainCanvas.classList.remove("hidden");
    originalCanvas.classList.add("hidden");
    splitOverlayCanvas.classList.add("hidden");
    splitDivider.classList.add("hidden");
  } else if (state.viewMode === "original") {
    mainCanvas.classList.add("hidden");
    originalCanvas.classList.remove("hidden");
    splitOverlayCanvas.classList.add("hidden");
    splitDivider.classList.add("hidden");
  } else if (state.viewMode === "split") {
    mainCanvas.classList.remove("hidden");
    originalCanvas.classList.add("hidden");
    splitOverlayCanvas.classList.remove("hidden");
    splitDivider.classList.remove("hidden");

    // Render Split Overlay (Original Image on Left side up to splitPos)
    const splitX = Math.round(width * state.splitPos);
    const splitCtx = splitOverlayCanvas.getContext("2d");
    splitCtx.clearRect(0, 0, width, height);

    if (splitX > 0) {
      splitCtx.drawImage(originalCanvas, 0, 0, splitX, height, 0, 0, splitX, height);
    }

    splitDivider.style.left = `${state.splitPos * 100}%`;
  }

  // Update Background fill
  if (state.bgFill !== "transparent") {
    bgCanvas.classList.remove("hidden");
    const bgCtx = bgCanvas.getContext("2d");
    bgCtx.fillStyle = state.bgFill;
    bgCtx.fillRect(0, 0, width, height);
  } else {
    bgCanvas.classList.add("hidden");
  }
}

function setupViewModes() {
  const setMode = (mode) => {
    state.viewMode = mode;
    tabResultView.classList.toggle("active", mode === "result");
    tabOriginalView.classList.toggle("active", mode === "original");
    tabSplitView.classList.toggle("active", mode === "split");
    updateCanvasDisplay();
  };

  tabResultView.addEventListener("click", () => setMode("result"));
  tabOriginalView.addEventListener("click", () => setMode("original"));
  tabSplitView.addEventListener("click", () => setMode("split"));
}

// -------------------------------------------------------------
// Zoom & Pan Mechanics
// -------------------------------------------------------------
function setupZoomAndPan() {
  const updateTransform = () => {
    canvasTransformLayer.style.transform = `translate(calc(-50% + ${state.pan.x}px), calc(-50% + ${state.pan.y}px)) scale(${state.zoom})`;
    zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
  };

  btnZoomIn.addEventListener("click", () => {
    state.zoom = Math.min(5.0, state.zoom * 1.25);
    updateTransform();
  });

  btnZoomOut.addEventListener("click", () => {
    state.zoom = Math.max(0.1, state.zoom / 1.25);
    updateTransform();
  });

  btnZoomReset.addEventListener("click", () => {
    state.zoom = 1.0;
    state.pan = { x: 0, y: 0 };
    updateTransform();
  });

  btnZoomFit.addEventListener("click", resetZoomAndFit);

  // Mouse Wheel Zoom
  canvasStage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const nextZoom = Math.max(0.1, Math.min(5.0, state.zoom * zoomFactor));
    state.zoom = nextZoom;
    updateTransform();
  });

  // Spacebar + Pan Drag
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !state.isSpacePressed && e.target.tagName !== "INPUT") {
      state.isSpacePressed = true;
      canvasStage.classList.add("panning");
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      state.isSpacePressed = false;
      if (!state.isPanning) {
        canvasStage.classList.remove("panning");
      }
    }
  });

  canvasStage.addEventListener("mousedown", (e) => {
    if (e.button === 1 || state.isSpacePressed) {
      // Middle click or Space+Click to pan
      state.isPanning = true;
      state.panStart = { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y };
      canvasStage.classList.add("panning");
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (state.isPanning) {
      state.pan.x = e.clientX - state.panStart.x;
      state.pan.y = e.clientY - state.panStart.y;
      updateTransform();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (state.isPanning) {
      state.isPanning = false;
      if (!state.isSpacePressed) {
        canvasStage.classList.remove("panning");
      }
    }
  });
}

function resetZoomAndFit() {
  if (!state.originalImage) return;
  const stageRect = canvasStage.getBoundingClientRect();
  const scaleX = (stageRect.width - 60) / state.originalImage.width;
  const scaleY = (stageRect.height - 60) / state.originalImage.height;
  state.zoom = Math.min(1.0, Math.max(0.1, Math.min(scaleX, scaleY)));
  state.pan = { x: 0, y: 0 };
  canvasTransformLayer.style.transform = `translate(-50%, -50%) scale(${state.zoom})`;
  zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
}

// -------------------------------------------------------------
// Canvas Tool Interactions (Brush, Eyedropper, Split Drag)
// -------------------------------------------------------------
function setupCanvasInteractions() {
  // Convert stage screen coordinate to canvas pixel coordinate
  const getCanvasCoords = (e) => {
    const rect = mainCanvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * mainCanvas.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * mainCanvas.height);
    return { x, y };
  };

    // Cursor move handler
    canvasStage.addEventListener("mousemove", (e) => {
      if (!state.originalImage) return;
      const { x, y } = getCanvasCoords(e);
      cursorPosText.textContent = `좌표: ${x}, ${y} px`;

      // Hide brush cursor and ignore brush if AI is processing
      if (state.ai.isProcessing) {
        brushCursor.classList.add("hidden");
        return;
      }

      // Handle Object Studio Tool Dragging / Moving / Resizing
      if (state.object.active) {
        brushCursor.classList.add("hidden");
        handleObjectMouseMove(x, y, e);
        return;
      }

      // Handle Manual Crop Dragging, Moving or Resizing
      if (state.crop.isActive) {
        brushCursor.classList.add("hidden");

        // Handle Resizing via 8-direction handles
        if (state.crop.isResizing && state.crop.initialRect && state.crop.resizeHandle) {
          const dx = x - state.crop.moveStartPos.x;
          const dy = y - state.crop.moveStartPos.y;
          const init = state.crop.initialRect;
          const handle = state.crop.resizeHandle;
          const ratio = state.crop.lockAspectRatio && state.crop.aspectRatio > 0 ? state.crop.aspectRatio : null;

          let newX = init.x;
          let newY = init.y;
          let newW = init.width;
          let newH = init.height;

          if (ratio) {
            // === RATIO LOCKED RESIZE (All 8 Handles strictly maintain ratio) ===
            if (handle === "br") {
              if (Math.abs(dx) / ratio >= Math.abs(dy)) {
                newW = Math.max(5, init.width + dx);
                newH = Math.max(5, Math.round(newW / ratio));
              } else {
                newH = Math.max(5, init.height + dy);
                newW = Math.max(5, Math.round(newH * ratio));
              }
            } else if (handle === "tl") {
              if (Math.abs(dx) / ratio >= Math.abs(dy)) {
                newW = Math.max(5, init.width - dx);
                newH = Math.max(5, Math.round(newW / ratio));
              } else {
                newH = Math.max(5, init.height - dy);
                newW = Math.max(5, Math.round(newH * ratio));
              }
              newX = init.x + init.width - newW;
              newY = init.y + init.height - newH;
            } else if (handle === "tr") {
              if (Math.abs(dx) / ratio >= Math.abs(dy)) {
                newW = Math.max(5, init.width + dx);
                newH = Math.max(5, Math.round(newW / ratio));
              } else {
                newH = Math.max(5, init.height - dy);
                newW = Math.max(5, Math.round(newH * ratio));
              }
              newY = init.y + init.height - newH;
            } else if (handle === "bl") {
              if (Math.abs(dx) / ratio >= Math.abs(dy)) {
                newW = Math.max(5, init.width - dx);
                newH = Math.max(5, Math.round(newW / ratio));
              } else {
                newH = Math.max(5, init.height + dy);
                newW = Math.max(5, Math.round(newH * ratio));
              }
              newX = init.x + init.width - newW;
            } else if (handle === "mr") {
              newW = Math.max(5, init.width + dx);
              newH = Math.max(5, Math.round(newW / ratio));
              newY = init.y + Math.round((init.height - newH) / 2);
            } else if (handle === "ml") {
              newW = Math.max(5, init.width - dx);
              newH = Math.max(5, Math.round(newW / ratio));
              newX = init.x + init.width - newW;
              newY = init.y + Math.round((init.height - newH) / 2);
            } else if (handle === "bc") {
              newH = Math.max(5, init.height + dy);
              newW = Math.max(5, Math.round(newH * ratio));
              newX = init.x + Math.round((init.width - newW) / 2);
            } else if (handle === "tc") {
              newH = Math.max(5, init.height - dy);
              newW = Math.max(5, Math.round(newH * ratio));
              newX = init.x + Math.round((init.width - newW) / 2);
              newY = init.y + init.height - newH;
            }

            // Clamping that strictly preserves aspect ratio
            if (newW > mainCanvas.width) {
              newW = mainCanvas.width;
              newH = Math.round(newW / ratio);
            }
            if (newH > mainCanvas.height) {
              newH = mainCanvas.height;
              newW = Math.round(newH * ratio);
            }
            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX + newW > mainCanvas.width) newX = mainCanvas.width - newW;
            if (newY + newH > mainCanvas.height) newY = mainCanvas.height - newH;
          } else {
            // === FREE ASPECT RATIO ===
            if (handle.includes("l")) {
              newW = init.width - dx;
              newX = init.x + dx;
            } else if (handle.includes("r")) {
              newW = init.width + dx;
            }

            if (handle.includes("t")) {
              newH = init.height - dy;
              newY = init.y + dy;
            } else if (handle.includes("b")) {
              newH = init.height + dy;
            }

            if (newW < 5) {
              if (handle.includes("l")) newX = init.x + init.width - 5;
              newW = 5;
            }
            if (newH < 5) {
              if (handle.includes("t")) newY = init.y + init.height - 5;
              newH = 5;
            }
          }

          setCropBoxRect(newX, newY, newW, newH, true);
          return;
        }

        if (state.crop.isMoving && state.crop.initialRect) {
          const dx = x - state.crop.moveStartPos.x;
          const dy = y - state.crop.moveStartPos.y;
          const newX = state.crop.initialRect.x + dx;
          const newY = state.crop.initialRect.y + dy;
          setCropBoxRect(newX, newY, state.crop.initialRect.width, state.crop.initialRect.height, false);
          return;
        }

        if (state.crop.isDragging) {
          const clampedX = Math.max(0, Math.min(mainCanvas.width, x));
          const clampedY = Math.max(0, Math.min(mainCanvas.height, y));
          updateCropSelectionBox(state.crop.startX, state.crop.startY, clampedX, clampedY);
          return;
        }
        return;
      }

      // Update Floating Brush Cursor position & size
      if (state.activeTool === "brush" && !state.colorKey.eyedropperActive && !state.isSpacePressed) {
        brushCursor.classList.remove("hidden");
        const rect = mainCanvas.getBoundingClientRect();
        const localX = (x / mainCanvas.width) * mainCanvas.width;
        const localY = (y / mainCanvas.height) * mainCanvas.height;
        brushCursor.style.left = `${localX}px`;
        brushCursor.style.top = `${localY}px`;
        brushCursor.style.width = `${state.brush.size}px`;
        brushCursor.style.height = `${state.brush.size}px`;
      } else {
        brushCursor.classList.add("hidden");
      }

      // Handle Split View Divider Drag
      if (state.isSplitDragging) {
        const rect = mainCanvas.getBoundingClientRect();
        const pos = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width));
        state.splitPos = pos;
        updateCanvasDisplay();
        return;
      }

      // Handle Brush Drawing
      if (state.brush.isDrawing && state.activeTool === "brush" && !state.isPanning) {
        RemoverEngine.applyBrushStroke(mainCanvas, originalCanvas, x, y, {
          size: state.brush.size,
          hardness: state.brush.hardness,
          mode: state.brush.mode,
        });
        updateCanvasDisplay();
      }
    });

    canvasStage.addEventListener("mouseleave", () => {
      brushCursor.classList.add("hidden");
      cursorPosText.textContent = "좌표: -";
    });

    // Mouse Down
    canvasStage.addEventListener("mousedown", (e) => {
      if (!state.originalImage || e.button !== 0 || state.isSpacePressed || state.ai.isProcessing) return;

      const { x, y } = getCanvasCoords(e);

      // Handle Object Studio Tool Selection, Creation or Transformation
      if (state.object.active) {
        handleObjectMouseDown(x, y, e);
        return;
      }

      // Handle Manual Crop Box Start, Move, or Resize
      if (state.crop.isActive) {
        // 1. Check if clicked a resize handle
        if (e.target && e.target.classList.contains("crop-handle")) {
          state.crop.isResizing = true;
          state.crop.resizeHandle = e.target.dataset.handle;
          state.crop.moveStartPos = { x, y };
          state.crop.initialRect = { ...state.crop.currentRect };
          return;
        }

        // 2. Check if clicked inside existing crop box
        const cur = state.crop.currentRect;
        const isClickInside =
          cur &&
          x >= cur.x &&
          x <= cur.x + cur.width &&
          y >= cur.y &&
          y <= cur.y + cur.height;

        if (isClickInside) {
          state.crop.isMoving = true;
          state.crop.moveStartPos = { x, y };
          state.crop.initialRect = { ...cur };
          cropSelectionBox.classList.add("moving");
          return;
        }

        // 3. Otherwise start drawing a new crop box
        state.crop.isDragging = true;
        const clampedX = Math.max(0, Math.min(mainCanvas.width, x));
        const clampedY = Math.max(0, Math.min(mainCanvas.height, y));
        state.crop.startX = clampedX;
        state.crop.startY = clampedY;
        cropSelectionBox.classList.remove("hidden");
        updateCropSelectionBox(clampedX, clampedY, clampedX, clampedY);
        return;
      }

      // Check if clicked near Split Divider
      if (state.viewMode === "split") {
        const rect = mainCanvas.getBoundingClientRect();
        const dividerX = rect.left + rect.width * state.splitPos;
        if (Math.abs(e.clientX - dividerX) < 16) {
          state.isSplitDragging = true;
          return;
        }
      }

      // Eyedropper Pickup
      if (state.colorKey.eyedropperActive) {
        pickColorAt(x, y);
        return;
      }

      // Start Brush Drawing
      if (state.activeTool === "brush") {
        state.brush.isDrawing = true;
        RemoverEngine.applyBrushStroke(mainCanvas, originalCanvas, x, y, {
          size: state.brush.size,
          hardness: state.brush.hardness,
          mode: state.brush.mode,
        });
        updateCanvasDisplay();
      }
    });

    // Mouse Up
    window.addEventListener("mouseup", (e) => {
      if (state.object.active) {
        handleObjectMouseUp(e);
      }

      if (state.crop.isResizing) {
        state.crop.isResizing = false;
        state.crop.resizeHandle = null;
        if (state.crop.currentRect && state.crop.currentRect.width >= 5 && state.crop.currentRect.height >= 5) {
          btnApplyCrop.disabled = false;
        }
      }
      if (state.crop.isMoving) {
        state.crop.isMoving = false;
        if (cropSelectionBox) cropSelectionBox.classList.remove("moving");
      }
      if (state.crop.isDragging) {
        state.crop.isDragging = false;
        if (state.crop.currentRect && state.crop.currentRect.width >= 5 && state.crop.currentRect.height >= 5) {
          btnApplyCrop.disabled = false;
        } else {
          btnApplyCrop.disabled = true;
        }
      }
      if (state.isSplitDragging) {
        state.isSplitDragging = false;
      }
      if (state.brush.isDrawing) {
        state.brush.isDrawing = false;
        historyManager.pushState(mainCanvas, originalCanvas);
        updateUndoRedoButtons();
      }
    });
}

// -------------------------------------------------------------
// Eyedropper & Color Key Controls
// -------------------------------------------------------------
function pickColorAt(x, y) {
  if (x < 0 || x >= originalCanvas.width || y < 0 || y >= originalCanvas.height) return;
  const ctx = originalCanvas.getContext("2d", { willReadFrequently: true });
  const pixel = ctx.getImageData(x, y, 1, 1).data;

  state.colorKey.targetColor = [pixel[0], pixel[1], pixel[2]];
  const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
  state.colorKey.hex = hex;

  colorPreviewBox.style.backgroundColor = hex;
  colorHexText.textContent = hex;

  // Deactivate Eyedropper Mode
  state.colorKey.eyedropperActive = false;
  btnEyedropper.classList.remove("active");
  canvasStage.classList.remove("eyedropper-active");
  showToast(typeof I18N !== "undefined" ? I18N.t("toastBgSelected", [hex]) : `배경색이 지정되었습니다: ${hex}`, "info");
}

function setupColorKeyControls() {
  btnEyedropper.addEventListener("click", () => {
    state.colorKey.eyedropperActive = !state.colorKey.eyedropperActive;
    btnEyedropper.classList.toggle("active", state.colorKey.eyedropperActive);
    canvasStage.classList.toggle("eyedropper-active", state.colorKey.eyedropperActive);
    if (state.colorKey.eyedropperActive) {
      if (state.crop && state.crop.isActive) {
        setCropMode(false);
      }
      if (brushCursor) brushCursor.classList.add("hidden");
      showToast(typeof I18N !== "undefined" ? I18N.t("toastPickGuide") : "캔버스에서 제거할 배경색을 클릭하세요");
    }
  });

  // Escape key cancels eyedropper mode
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.colorKey.eyedropperActive) {
      state.colorKey.eyedropperActive = false;
      btnEyedropper.classList.remove("active");
      canvasStage.classList.remove("eyedropper-active");
    }
  });

  rangeTolerance.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    state.colorKey.tolerance = val;
    valTolerance.textContent = val;
  });

  rangeFeather.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    state.colorKey.feather = val;
    valFeather.textContent = `${val}px`;
  });

  btnApplyColorKey.addEventListener("click", () => {
    if (!state.originalImage) return;

    RemoverEngine.removeSolidColor(mainCanvas, {
      targetColor: state.colorKey.targetColor,
      tolerance: state.colorKey.tolerance,
      feather: state.colorKey.feather,
      contiguous: false,
    });

    historyManager.pushState(mainCanvas, originalCanvas);
    updateUndoRedoButtons();
    updateCanvasDisplay();
    showToast(typeof I18N !== "undefined" ? I18N.t("toastColorKeyApplied") : "선택 색상 투명화가 적용되었습니다!", "success");
  });
}

// -------------------------------------------------------------
// AI Model Controls
// -------------------------------------------------------------
function setupAIControls() {
  selectAiModel.addEventListener("change", (e) => {
    state.ai.modelId = e.target.value;
  });

  btnRunAi.addEventListener("click", () => {
    if (!state.originalImage || state.ai.isProcessing) return;

    if (!aiWorker) {
      alert(typeof I18N !== "undefined" ? I18N.t("alertAiWorkerNotReady") : "AI 워커가 초기화되지 않았습니다.");
      return;
    }

    const prepText = typeof I18N !== "undefined" ? I18N.t("aiStatusReady") : "준비 중...";
    resetAiProgress();
    setAIProcessingState(true, prepText);
    aiProgressWrap.classList.remove("hidden");
    setAiProgress(5, prepText);

    // Send original image data to worker
    const ctx = originalCanvas.getContext("2d", { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

    aiWorker.postMessage(
      {
        type: "REMOVE_BG",
        modelId: state.ai.modelId,
        imageData: imgData.data.buffer,
        width: originalCanvas.width,
        height: originalCanvas.height,
      },
      [imgData.data.buffer]
    );
  });
}

// -------------------------------------------------------------
// Brush Controls
// -------------------------------------------------------------
function setupBrushControls() {
  btnBrushErase.addEventListener("click", () => {
    state.brush.mode = "erase";
    btnBrushErase.classList.add("active");
    btnBrushRestore.classList.remove("active");
  });

  btnBrushRestore.addEventListener("click", () => {
    state.brush.mode = "restore";
    btnBrushRestore.classList.add("active");
    btnBrushErase.classList.remove("active");
  });

  rangeBrushSize.addEventListener("input", (e) => {
    const size = parseInt(e.target.value, 10);
    state.brush.size = size;
    valBrushSize.textContent = `${size}px`;
    brushCursor.style.width = `${size}px`;
    brushCursor.style.height = `${size}px`;
  });

  rangeBrushHardness.addEventListener("input", (e) => {
    const hardness = parseInt(e.target.value, 10);
    state.brush.hardness = hardness / 100;
    valBrushHardness.textContent = `${hardness}%`;
  });
}

// -------------------------------------------------------------
// Background Fill Controls
// -------------------------------------------------------------
function setupBgFillControls() {
  document.querySelectorAll(".bg-fill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".bg-fill-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.bgFill = btn.dataset.bg || "transparent";
      updateCanvasDisplay();
      updateFormatNotice();
    });
  });

  const inputCustomBg = document.getElementById("inputCustomBg");
  inputCustomBg.addEventListener("input", (e) => {
    document.querySelectorAll(".bg-fill-btn").forEach((b) => b.classList.remove("active"));
    inputCustomBg.closest(".bg-fill-btn").classList.add("active");
    state.bgFill = e.target.value;
    updateCanvasDisplay();
    updateFormatNotice();
  });
}

function updateFormatNotice() {
  if (!warnNoTransparency) return;
  const format = selectSaveFormat ? selectSaveFormat.value : "image/png";
  const isJpeg = format === "image/jpeg";
  const isGif = format === "image/gif";
  const isTransparent = !state.bgFill || state.bgFill === "transparent";

  if (state.originalImage && isJpeg && isTransparent) {
    if (warnNoticeText) {
      warnNoticeText.textContent = typeof I18N !== "undefined"
        ? I18N.t("warnJpegNoTransparency")
        : "JPEG는 투명 배경을 지원하지 않아 투명 영역이 흰색으로 저장됩니다.";
    }
    warnNoTransparency.classList.remove("hidden");
  } else if (state.originalImage && isGif) {
    if (warnNoticeText) {
      warnNoticeText.textContent = typeof I18N !== "undefined"
        ? I18N.t("warnGifQuality")
        : "GIF는 256색 및 1비트 투명도를 사용하여 외곽선 경계에 계단 현상이 발생할 수 있습니다.";
    }
    warnNoTransparency.classList.remove("hidden");
  } else {
    warnNoTransparency.classList.add("hidden");
  }
}

// -------------------------------------------------------------
// Image Resize Controls
// -------------------------------------------------------------
function setupResizeControls() {
  if (!inputResizeWidth || !inputResizeHeight || !btnApplyResize) return;

  // Width Input Change
  inputResizeWidth.addEventListener("input", () => {
    if (!state.resize.lockAspectRatio) return;
    const w = parseInt(inputResizeWidth.value, 10);
    if (w > 0 && state.resize.aspectRatio > 0) {
      inputResizeHeight.value = Math.max(1, Math.round(w / state.resize.aspectRatio));
    }
  });

  // Height Input Change
  inputResizeHeight.addEventListener("input", () => {
    if (!state.resize.lockAspectRatio) return;
    const h = parseInt(inputResizeHeight.value, 10);
    if (h > 0 && state.resize.aspectRatio > 0) {
      inputResizeWidth.value = Math.max(1, Math.round(h * state.resize.aspectRatio));
    }
  });

  // Aspect Ratio Lock Checkbox Change
  if (checkLockRatio) {
    checkLockRatio.addEventListener("change", () => {
      state.resize.lockAspectRatio = checkLockRatio.checked;
      if (labelLockRatio) labelLockRatio.classList.toggle("active", state.resize.lockAspectRatio);
      if (iconLock && iconUnlock) {
        iconLock.classList.toggle("hidden", !state.resize.lockAspectRatio);
        iconUnlock.classList.toggle("hidden", state.resize.lockAspectRatio);
      }
      const w = parseInt(inputResizeWidth.value, 10);
      const h = parseInt(inputResizeHeight.value, 10);
      if (w > 0 && h > 0) {
        state.resize.aspectRatio = w / h;
      }
    });
  }

  // Preset Chips (Scale: 100%, 75%, 50%, 25%)
  if (resizePresetChips) {
    resizePresetChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        if (!state.originalImage) return;
        const origW = state.originalImage.width;
        const origH = state.originalImage.height;

        if (chip.dataset.scale) {
          const scale = parseFloat(chip.dataset.scale);
          const nextW = Math.max(1, Math.round(origW * scale));
          const nextH = Math.max(1, Math.round(origH * scale));
          inputResizeWidth.value = nextW;
          inputResizeHeight.value = nextH;
        }
      });
    });
  }

  // Apply Resize
  btnApplyResize.addEventListener("click", applyResize);
}

// -------------------------------------------------------------
// Object Studio Controls & Vector Object Engine Integration
// -------------------------------------------------------------
function setupObjectTools() {
  if (!objectCanvas) return;
  objectEngine = new ObjectEngine(objectCanvas);

  // Toggle Object Studio Panel
  if (btnToggleObjectPanel) {
    btnToggleObjectPanel.addEventListener("click", () => {
      if (!state.originalImage) return;
      const willOpen = objectControlsPanel.classList.contains("hidden");
      setObjectStudioMode(willOpen);
    });
  }

  // Tool Selection Buttons
  if (objToolButtons) {
    objToolButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tool = btn.dataset.tool;
        setObjectActiveTool(tool);
      });
    });
  }

  // Smart Stroke Chip & Color (Figma Style)
  function updateStrokeChipUI(isStroked, color) {
    if (!wrapObjStrokeChip) return;
    wrapObjStrokeChip.classList.toggle("is-none", !isStroked);
    if (chipObjStrokeColor) {
      chipObjStrokeColor.style.backgroundColor = isStroked ? (color || objectEngine.defaultStyle.strokeColor) : "transparent";
    }
    if (iconStrokeNone) {
      iconStrokeNone.classList.toggle("hidden", isStroked);
    }
    if (btnObjStrokeClear) {
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      const isLineOrArrow = cur ? (cur.type === "line" || cur.type === "arrow") : (state.object.tool === "line" || state.object.tool === "arrow");
      btnObjStrokeClear.classList.toggle("hidden", !isStroked || isLineOrArrow);
    }
    if (groupStrokeWidth) {
      groupStrokeWidth.style.opacity = isStroked ? "1" : "0.45";
      if (rangeObjStrokeWidth) rangeObjStrokeWidth.disabled = !isStroked;
    }
  }

  if (wrapObjStrokeChip) {
    wrapObjStrokeChip.addEventListener("click", () => {
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      const wasStroked = cur ? (cur.isStroked !== false) : (objectEngine.defaultStyle.isStroked !== false);
      if (!wasStroked) {
        const nextColor = (cur && cur.strokeColor) || objectEngine.defaultStyle.strokeColor || "#38bdf8";
        if (cur) {
          objectEngine.updateItem(cur.id, { isStroked: true, strokeColor: nextColor });
        } else if (objectEngine) {
          objectEngine.defaultStyle.isStroked = true;
        }
        updateStrokeChipUI(true, nextColor);
      }
    });
  }

  if (btnObjStrokeClear) {
    btnObjStrokeClear.addEventListener("click", (e) => {
      e.stopPropagation();
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      // 외곽선 끄기 시: 만약 채우기가 꺼져 있다면 도형이 투명해지지 않도록 채우기를 자동으로 켬
      const currentFill = cur ? cur.isFilled : objectEngine.defaultStyle.isFilled;
      if (!currentFill) {
        const fillColor = (cur && cur.fillColor) || objectEngine.defaultStyle.fillColor || "#38bdf8";
        if (cur) {
          objectEngine.updateItem(cur.id, { isStroked: false, isFilled: true, fillColor });
        } else if (objectEngine) {
          objectEngine.defaultStyle.isStroked = false;
          objectEngine.defaultStyle.isFilled = true;
          objectEngine.defaultStyle.fillColor = fillColor;
        }
        updateFillChipUI(true, fillColor);
      } else {
        if (cur) {
          objectEngine.updateItem(cur.id, { isStroked: false });
        } else if (objectEngine) {
          objectEngine.defaultStyle.isStroked = false;
        }
      }
      updateStrokeChipUI(false);
    });
  }

  if (inputObjStrokeColor) {
    inputObjStrokeColor.addEventListener("input", (e) => {
      const color = e.target.value;
      objectEngine.defaultStyle.strokeColor = color;
      objectEngine.defaultStyle.isStroked = true;
      updateStrokeChipUI(true, color);
      const cur = objectEngine.getSelectedItem();
      if (cur) {
        objectEngine.updateItem(cur.id, { strokeColor: color, isStroked: true });
      }
    });
  }

  // Smart Fill Chip & Color (Figma Style)
  function updateFillChipUI(isFilled, color) {
    if (!wrapObjFillChip) return;
    wrapObjFillChip.classList.toggle("is-none", !isFilled);
    if (chipObjFillColor) {
      chipObjFillColor.style.backgroundColor = isFilled ? (color || objectEngine.defaultStyle.fillColor) : "transparent";
    }
    if (iconFillNone) {
      iconFillNone.classList.toggle("hidden", isFilled);
    }
    if (btnObjFillClear) {
      btnObjFillClear.classList.toggle("hidden", !isFilled);
    }
  }

  if (wrapObjFillChip) {
    wrapObjFillChip.addEventListener("click", () => {
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      const wasFilled = cur ? cur.isFilled : objectEngine.defaultStyle.isFilled;
      if (!wasFilled) {
        const nextColor = (cur && cur.fillColor) || objectEngine.defaultStyle.fillColor || "#ffffff";
        if (cur) {
          objectEngine.updateItem(cur.id, { isFilled: true, fillColor: nextColor });
        } else if (objectEngine) {
          objectEngine.defaultStyle.isFilled = true;
        }
        updateFillChipUI(true, nextColor);
      }
    });
  }

  if (btnObjFillClear) {
    btnObjFillClear.addEventListener("click", (e) => {
      e.stopPropagation();
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      // 채우기 끄기 시: 만약 외곽선이 꺼져 있다면 도형이 투명해지지 않도록 외곽선을 자동으로 켬
      const currentStroke = cur ? (cur.isStroked !== false) : (objectEngine.defaultStyle.isStroked !== false);
      if (!currentStroke) {
        const strokeColor = (cur && cur.strokeColor) || objectEngine.defaultStyle.strokeColor || "#38bdf8";
        if (cur) {
          objectEngine.updateItem(cur.id, { isFilled: false, isStroked: true, strokeColor });
        } else if (objectEngine) {
          objectEngine.defaultStyle.isFilled = false;
          objectEngine.defaultStyle.isStroked = true;
          objectEngine.defaultStyle.strokeColor = strokeColor;
        }
        updateStrokeChipUI(true, strokeColor);
      } else {
        if (cur) {
          objectEngine.updateItem(cur.id, { isFilled: false });
        } else if (objectEngine) {
          objectEngine.defaultStyle.isFilled = false;
        }
      }
      updateFillChipUI(false);
    });
  }

  if (inputObjFillColor) {
    inputObjFillColor.addEventListener("input", (e) => {
      const color = e.target.value;
      objectEngine.defaultStyle.fillColor = color;
      objectEngine.defaultStyle.isFilled = true;
      updateFillChipUI(true, color);
      const cur = objectEngine.getSelectedItem();
      if (cur) {
        objectEngine.updateItem(cur.id, { isFilled: true, fillColor: color });
      }
    });
  }

  // Stroke Width Slider
  if (rangeObjStrokeWidth) {
    rangeObjStrokeWidth.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      if (valObjStrokeWidth) valObjStrokeWidth.textContent = `${val}px`;
      objectEngine.defaultStyle.strokeWidth = val;
      objectEngine.defaultStyle.isStroked = true;
      updateStrokeChipUI(true, objectEngine.defaultStyle.strokeColor);
      const cur = objectEngine.getSelectedItem();
      if (cur) {
        objectEngine.updateItem(cur.id, { strokeWidth: val, isStroked: true });
        updateObjectSelectionUI();
      }
    });
  }

  // Opacity Slider
  if (rangeObjOpacity) {
    rangeObjOpacity.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      if (valObjOpacity) valObjOpacity.textContent = `${val}%`;
      const opacity = val / 100;
      objectEngine.defaultStyle.opacity = opacity;
      const cur = objectEngine.getSelectedItem();
      if (cur) {
        objectEngine.updateItem(cur.id, { opacity });
      }
    });
  }

  // Border Radius Slider (Rect)
  if (rangeObjRadius) {
    rangeObjRadius.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      if (valObjRadius) valObjRadius.textContent = `${val}px`;
      objectEngine.defaultStyle.borderRadius = val;
      const cur = objectEngine.getSelectedItem();
      if (cur && cur.type === "rect") {
        objectEngine.updateItem(cur.id, { borderRadius: val });
      }
    });
  }

  // 1. Text Font Family & Local Font Access
  const addCustomFontToSelect = (fontFamilyName) => {
    if (!selectTextFontFamily || !fontFamilyName) return;
    const cleanName = fontFamilyName.replace(/['"]/g, "").trim();
    if (!cleanName) return;
    const fontValue = `'${cleanName}', sans-serif`;

    let foundIndex = -1;
    for (let i = 0; i < selectTextFontFamily.options.length; i++) {
      if (selectTextFontFamily.options[i].value === fontValue || selectTextFontFamily.options[i].textContent === cleanName) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex >= 0) {
      selectTextFontFamily.selectedIndex = foundIndex;
    } else {
      let customGroup = document.getElementById("optgroupCustomFonts");
      if (!customGroup) {
        customGroup = document.createElement("optgroup");
        customGroup.id = "optgroupCustomFonts";
        customGroup.label = typeof I18N !== "undefined" ? "사용자 지정 폰트" : "사용자 지정 폰트";
        selectTextFontFamily.appendChild(customGroup);
      }
      const opt = document.createElement("option");
      opt.value = fontValue;
      opt.textContent = cleanName;
      opt.selected = true;
      customGroup.appendChild(opt);
    }

    if (objectEngine) objectEngine.defaultStyle.fontFamily = fontValue;
    const cur = objectEngine ? objectEngine.getSelectedItem() : null;
    if (cur && cur.type === "text") {
      const m = objectEngine.measureText(cur.text, cur.fontSize, cur.isBold, fontValue, cur.isItalic);
      objectEngine.updateItem(cur.id, { fontFamily: fontValue, width: m.width, height: m.height });
      updateObjectSelectionUI();
    }
  };

  const scanAndPopulateLocalFonts = async () => {
    if (!("queryLocalFonts" in window)) {
      const input = prompt(
        "이 브라우저는 로컬 폰트 자동 스캔을 지원하지 않습니다.\n\n사용하고 싶은 윈도우 폰트 이름(예: 맑은 고딕, 나눔손글씨, Gmarket Sans, Arial)을 직접 입력해 주세요:"
      );
      if (input && input.trim()) {
        addCustomFontToSelect(input.trim());
      }
      return;
    }

    try {
      const fonts = await window.queryLocalFonts();
      if (fonts && fonts.length > 0) {
        const uniqueFamilies = Array.from(new Set(fonts.map((f) => f.family))).sort((a, b) =>
          a.localeCompare(b, "ko")
        );

        let localGroup = document.getElementById("optgroupLocalFonts");
        if (!localGroup) {
          localGroup = document.createElement("optgroup");
          localGroup.id = "optgroupLocalFonts";
          // Insert after the action options (at index 2)
          selectTextFontFamily.insertBefore(localGroup, selectTextFontFamily.children[2] || null);
        }
        localGroup.label = `내 PC 설치 폰트 (${uniqueFamilies.length}개)`;
        localGroup.innerHTML = "";

        uniqueFamilies.forEach((family) => {
          const opt = document.createElement("option");
          opt.value = `'${family}', sans-serif`;
          opt.textContent = family;
          localGroup.appendChild(opt);
        });

        alert(`내 PC(Windows)에 설치된 ${uniqueFamilies.length}개의 폰트를 모두 불러왔습니다!\n목록에서 원하는 폰트를 선택해 보세요.`);
      }
    } catch (err) {
      console.warn("로컬 폰트 권한 거부 또는 취소:", err);
      const input = prompt(
        "폰트 스캔이 취소되었습니다.\n사용하고 싶은 윈도우 폰트 이름을 직접 입력해 주세요:"
      );
      if (input && input.trim()) {
        addCustomFontToSelect(input.trim());
      }
    }
  };

  if (selectTextFontFamily) {
    selectTextFontFamily.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "__SCAN_LOCAL__") {
        selectTextFontFamily.value = objectEngine?.defaultStyle.fontFamily || "'Malgun Gothic', '맑은 고딕', sans-serif";
        scanAndPopulateLocalFonts();
        return;
      }
      if (val === "__CUSTOM_INPUT__") {
        selectTextFontFamily.value = objectEngine?.defaultStyle.fontFamily || "'Malgun Gothic', '맑은 고딕', sans-serif";
        const input = prompt("사용할 폰트 이름을 입력해 주세요 (예: 맑은 고딕, 바탕, 나눔스퀘어, 배달의민족 도현):");
        if (input && input.trim()) {
          addCustomFontToSelect(input.trim());
        }
        return;
      }

      if (objectEngine) objectEngine.defaultStyle.fontFamily = val;
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        const m = objectEngine.measureText(cur.text, cur.fontSize, cur.isBold, val, cur.isItalic);
        objectEngine.updateItem(cur.id, { fontFamily: val, width: m.width, height: m.height });
        updateObjectSelectionUI();
      }
    });
  }

  if (btnScanLocalFonts) {
    btnScanLocalFonts.addEventListener("click", scanAndPopulateLocalFonts);
  }

  // 2. Text Font Size
  if (inputObjFontSize) {
    inputObjFontSize.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 10) return;
      if (objectEngine) objectEngine.defaultStyle.fontSize = val;
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        const m = objectEngine.measureText(cur.text, val, cur.isBold, cur.fontFamily, cur.isItalic);
        objectEngine.updateItem(cur.id, { fontSize: val, width: m.width, height: m.height });
        updateObjectSelectionUI();
      }
    });
  }

  // 2-B. Text Fill Toggle (Checkbox)
  if (chkTextFill) {
    chkTextFill.addEventListener("change", (e) => {
      const isFilled = e.target.checked;
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;

      // Prevent completely transparent text
      if (!isFilled) {
        const isStroked = chkTextStroke ? chkTextStroke.checked : false;
        if (!isStroked) {
          if (chkTextStroke) chkTextStroke.checked = true;
          if (bodyTextStroke) bodyTextStroke.classList.remove("is-disabled");
          if (wrapTextStrokeChip) wrapTextStrokeChip.classList.remove("is-none");
          if (objectEngine) objectEngine.defaultStyle.isStroked = true;
          if (cur && cur.type === "text") cur.isStroked = true;
        }
      }

      if (wrapTextFillChip) wrapTextFillChip.classList.toggle("is-none", !isFilled);
      if (objectEngine) objectEngine.defaultStyle.isFilled = isFilled;
      const curItem = objectEngine ? objectEngine.getSelectedItem() : null;
      if (curItem && curItem.type === "text") {
        objectEngine.updateItem(curItem.id, { isFilled });
        objectEngine.pushState();
        updateUndoRedoButtons();
      }
    });
  }

  // 3. Text Fill Color
  if (inputTextFillColor) {
    inputTextFillColor.addEventListener("input", (e) => {
      const color = e.target.value;
      if (chipTextFillColor) chipTextFillColor.style.backgroundColor = color;
      if (objectEngine) {
        objectEngine.defaultStyle.fillColor = color;
        objectEngine.defaultStyle.isFilled = true;
      }
      if (chkTextFill && !chkTextFill.checked) {
        chkTextFill.checked = true;
        if (wrapTextFillChip) wrapTextFillChip.classList.remove("is-none");
      }
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        objectEngine.updateItem(cur.id, { fillColor: color, isFilled: true });
      }
    });
  }

  // 4. Text Bold & Italic
  if (btnObjBold) {
    btnObjBold.addEventListener("click", () => {
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      const nextBold = cur && cur.type === "text" ? !cur.isBold : !objectEngine.defaultStyle.isBold;
      if (objectEngine) objectEngine.defaultStyle.isBold = nextBold;
      btnObjBold.classList.toggle("active", nextBold);
      if (cur && cur.type === "text") {
        const m = objectEngine.measureText(cur.text, cur.fontSize, nextBold, cur.fontFamily, cur.isItalic);
        objectEngine.updateItem(cur.id, { isBold: nextBold, width: m.width, height: m.height });
        updateObjectSelectionUI();
      }
    });
  }

  if (btnTextItalic) {
    btnTextItalic.addEventListener("click", () => {
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      const nextItalic = cur && cur.type === "text" ? !cur.isItalic : !objectEngine.defaultStyle.isItalic;
      if (objectEngine) objectEngine.defaultStyle.isItalic = nextItalic;
      btnTextItalic.classList.toggle("active", nextItalic);
      if (cur && cur.type === "text") {
        const m = objectEngine.measureText(cur.text, cur.fontSize, cur.isBold, cur.fontFamily, nextItalic);
        objectEngine.updateItem(cur.id, { isItalic: nextItalic, width: m.width, height: m.height });
        updateObjectSelectionUI();
      }
    });
  }

  // 5. Text Align (Left, Center, Right)
  const textAlignButtons = [
    { btn: btnTextAlignLeft, align: "left" },
    { btn: btnTextAlignCenter, align: "center" },
    { btn: btnTextAlignRight, align: "right" },
  ];
  textAlignButtons.forEach(({ btn, align }) => {
    if (btn) {
      btn.addEventListener("click", () => {
        if (objectEngine) objectEngine.defaultStyle.textAlign = align;
        textAlignButtons.forEach((b) => {
          if (b.btn) b.btn.classList.toggle("active", b.align === align);
        });
        const cur = objectEngine ? objectEngine.getSelectedItem() : null;
        if (cur && cur.type === "text") {
          objectEngine.updateItem(cur.id, { textAlign: align });
        }
      });
    }
  });

  // 6. Text Opacity
  if (rangeTextOpacity) {
    rangeTextOpacity.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      if (valTextOpacity) valTextOpacity.textContent = `${val}%`;
      const opacity = val / 100;
      if (objectEngine) objectEngine.defaultStyle.opacity = opacity;
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        objectEngine.updateItem(cur.id, { opacity });
      }
    });
  }

  // 7. Text Stroke (Toggle, Color, Width)
  if (chkTextStroke) {
    chkTextStroke.addEventListener("change", (e) => {
      const isStroked = e.target.checked;
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;

      // Prevent completely transparent text
      if (!isStroked) {
        const isFilled = chkTextFill ? chkTextFill.checked : true;
        if (!isFilled) {
          if (chkTextFill) chkTextFill.checked = true;
          if (wrapTextFillChip) wrapTextFillChip.classList.remove("is-none");
          if (objectEngine) objectEngine.defaultStyle.isFilled = true;
          if (cur && cur.type === "text") cur.isFilled = true;
        }
      }

      if (bodyTextStroke) bodyTextStroke.classList.toggle("is-disabled", !isStroked);
      if (wrapTextStrokeChip) wrapTextStrokeChip.classList.toggle("is-none", !isStroked);
      if (objectEngine) objectEngine.defaultStyle.isStroked = isStroked;
      if (cur && cur.type === "text") {
        objectEngine.updateItem(cur.id, { isStroked });
        objectEngine.pushState();
        updateUndoRedoButtons();
      }
    });
  }

  if (inputTextStrokeColor) {
    inputTextStrokeColor.addEventListener("input", (e) => {
      const color = e.target.value;
      if (chipTextStrokeColor) chipTextStrokeColor.style.backgroundColor = color;
      if (objectEngine) {
        objectEngine.defaultStyle.strokeColor = color;
        objectEngine.defaultStyle.isStroked = true;
      }
      if (chkTextStroke && !chkTextStroke.checked) {
        chkTextStroke.checked = true;
        if (bodyTextStroke) bodyTextStroke.classList.remove("is-disabled");
        if (wrapTextStrokeChip) wrapTextStrokeChip.classList.remove("is-none");
      }
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        objectEngine.updateItem(cur.id, { strokeColor: color, isStroked: true });
      }
    });
  }

  if (rangeTextStrokeWidth) {
    rangeTextStrokeWidth.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      if (valTextStrokeWidth) valTextStrokeWidth.textContent = `${val}px`;
      if (objectEngine) {
        objectEngine.defaultStyle.strokeWidth = val;
        objectEngine.defaultStyle.isStroked = true;
      }
      if (chkTextStroke && !chkTextStroke.checked) {
        chkTextStroke.checked = true;
        if (bodyTextStroke) bodyTextStroke.classList.remove("is-disabled");
        if (wrapTextStrokeChip) wrapTextStrokeChip.classList.remove("is-none");
      }
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        objectEngine.updateItem(cur.id, { strokeWidth: val, isStroked: true });
      }
    });
  }

  // 8. Text Shadow (Toggle, Color, Blur, Offset)
  if (chkTextShadow) {
    chkTextShadow.addEventListener("change", (e) => {
      const hasTextShadow = e.target.checked;
      if (bodyTextShadow) bodyTextShadow.classList.toggle("is-disabled", !hasTextShadow);
      if (objectEngine) objectEngine.defaultStyle.hasTextShadow = hasTextShadow;
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        objectEngine.updateItem(cur.id, { hasTextShadow });
      }
    });
  }

  if (inputTextShadowColor) {
    inputTextShadowColor.addEventListener("input", (e) => {
      const color = e.target.value;
      if (chipTextShadowColor) chipTextShadowColor.style.backgroundColor = color;
      if (objectEngine) {
        objectEngine.defaultStyle.shadowColor = color;
        objectEngine.defaultStyle.hasTextShadow = true;
      }
      if (chkTextShadow && !chkTextShadow.checked) {
        chkTextShadow.checked = true;
        if (bodyTextShadow) bodyTextShadow.classList.remove("is-disabled");
      }
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        objectEngine.updateItem(cur.id, { shadowColor: color, hasTextShadow: true });
      }
    });
  }

  if (rangeTextShadowBlur) {
    rangeTextShadowBlur.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      if (valTextShadowBlur) valTextShadowBlur.textContent = `${val}px`;
      if (objectEngine) {
        objectEngine.defaultStyle.shadowBlur = val;
        objectEngine.defaultStyle.hasTextShadow = true;
      }
      if (chkTextShadow && !chkTextShadow.checked) {
        chkTextShadow.checked = true;
        if (bodyTextShadow) bodyTextShadow.classList.remove("is-disabled");
      }
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        objectEngine.updateItem(cur.id, { shadowBlur: val, hasTextShadow: true });
      }
    });
  }

  if (rangeTextShadowOffset) {
    rangeTextShadowOffset.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      if (valTextShadowOffset) valTextShadowOffset.textContent = `${val}px`;
      if (objectEngine) {
        objectEngine.defaultStyle.shadowOffset = val;
        objectEngine.defaultStyle.hasTextShadow = true;
      }
      if (chkTextShadow && !chkTextShadow.checked) {
        chkTextShadow.checked = true;
        if (bodyTextShadow) bodyTextShadow.classList.remove("is-disabled");
      }
      const cur = objectEngine ? objectEngine.getSelectedItem() : null;
      if (cur && cur.type === "text") {
        objectEngine.updateItem(cur.id, { shadowOffset: val, hasTextShadow: true });
      }
    });
  }

  // Layer & Manage Actions
  if (btnObjDuplicate) {
    btnObjDuplicate.addEventListener("click", () => {
      if (objectEngine && objectEngine.selectedId) {
        objectEngine.duplicateItem(objectEngine.selectedId);
        updateObjectSelectionUI();
        updateUndoRedoButtons();
      }
    });
  }

  if (btnObjBringForward) {
    btnObjBringForward.addEventListener("click", () => {
      if (objectEngine && objectEngine.selectedId) {
        objectEngine.bringForward(objectEngine.selectedId);
        updateUndoRedoButtons();
      }
    });
  }

  if (btnObjSendBackward) {
    btnObjSendBackward.addEventListener("click", () => {
      if (objectEngine && objectEngine.selectedId) {
        objectEngine.sendBackward(objectEngine.selectedId);
        updateUndoRedoButtons();
      }
    });
  }

  if (btnObjDelete) {
    btnObjDelete.addEventListener("click", deleteSelectedObject);
  }

  setupInlineTextEditor();

  // Open Object Studio panel by default for intuitive UX
  setObjectStudioMode(true);
}

function setObjectStudioMode(active) {
  state.object.active = active;
  if (objectControlsPanel) {
    objectControlsPanel.classList.toggle("hidden", !active);
  }
  if (textToggleObject) {
    textToggleObject.textContent = active
      ? (typeof I18N !== "undefined" ? I18N.t("btnCloseObject") : "접기")
      : (typeof I18N !== "undefined" ? I18N.t("btnOpenObject") : "펼치기");
  }
  if (btnToggleObjectPanel) {
    btnToggleObjectPanel.classList.toggle("active", active);
  }

  if (active) {
    if (state.crop && state.crop.isActive) setCropMode(false);
    if (state.colorKey && state.colorKey.eyedropperActive) {
      state.colorKey.eyedropperActive = false;
      if (btnEyedropper) btnEyedropper.classList.remove("active");
      canvasStage.classList.remove("eyedropper-active");
    }
    if (brushCursor) brushCursor.classList.add("hidden");
    if (objectOverlayLayer) objectOverlayLayer.classList.remove("hidden");
    setObjectActiveTool(state.object.tool || "select");
  } else {
    if (objectOverlayLayer) objectOverlayLayer.classList.add("hidden");
    if (inlineTextEditor) inlineTextEditor.classList.add("hidden");
    if (objectEngine) objectEngine.clearSelection();
    updateObjectSelectionUI();
  }
}

function syncTextInspectorUI(data) {
  if (!data) return;
  if (selectTextFontFamily && data.fontFamily) {
    let matched = false;
    for (let i = 0; i < selectTextFontFamily.options.length; i++) {
      if (selectTextFontFamily.options[i].value === data.fontFamily) {
        selectTextFontFamily.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const cleanName = data.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
      const opt = document.createElement("option");
      opt.value = data.fontFamily;
      opt.textContent = cleanName;
      opt.selected = true;
      selectTextFontFamily.appendChild(opt);
    }
  }
  if (inputObjFontSize && typeof data.fontSize === "number") {
    inputObjFontSize.value = data.fontSize;
  }
  const isFilled = data.isFilled !== false;
  if (chkTextFill) chkTextFill.checked = isFilled;
  if (wrapTextFillChip) wrapTextFillChip.classList.toggle("is-none", !isFilled);
  const fillColor = data.fillColor || "#ffffff";
  if (inputTextFillColor) inputTextFillColor.value = fillColor;
  if (chipTextFillColor) chipTextFillColor.style.backgroundColor = fillColor;

  if (btnObjBold) btnObjBold.classList.toggle("active", !!data.isBold);
  if (btnTextItalic) btnTextItalic.classList.toggle("active", !!data.isItalic);

  const align = data.textAlign || "center";
  if (btnTextAlignLeft) btnTextAlignLeft.classList.toggle("active", align === "left");
  if (btnTextAlignCenter) btnTextAlignCenter.classList.toggle("active", align === "center");
  if (btnTextAlignRight) btnTextAlignRight.classList.toggle("active", align === "right");

  const opacity = typeof data.opacity === "number" ? data.opacity : 1;
  const pct = Math.round(opacity * 100);
  if (rangeTextOpacity) rangeTextOpacity.value = pct;
  if (valTextOpacity) valTextOpacity.textContent = `${pct}%`;

  const isStroked = data.isStroked === true;
  if (chkTextStroke) chkTextStroke.checked = isStroked;
  if (bodyTextStroke) bodyTextStroke.classList.toggle("is-disabled", !isStroked);
  if (wrapTextStrokeChip) wrapTextStrokeChip.classList.toggle("is-none", !isStroked);
  const strokeColor = data.strokeColor || "#38bdf8";
  if (inputTextStrokeColor) inputTextStrokeColor.value = strokeColor;
  if (chipTextStrokeColor) chipTextStrokeColor.style.backgroundColor = strokeColor;
  const strokeWidth = typeof data.strokeWidth === "number" ? data.strokeWidth : 3;
  if (rangeTextStrokeWidth) rangeTextStrokeWidth.value = strokeWidth;
  if (valTextStrokeWidth) valTextStrokeWidth.textContent = `${strokeWidth}px`;

  const hasShadow = !!data.hasTextShadow;
  if (chkTextShadow) chkTextShadow.checked = hasShadow;
  if (bodyTextShadow) bodyTextShadow.classList.toggle("is-disabled", !hasShadow);
  const shadowColor = data.shadowColor || "#000000";
  if (inputTextShadowColor) inputTextShadowColor.value = shadowColor;
  if (chipTextShadowColor) chipTextShadowColor.style.backgroundColor = shadowColor;
  const shadowBlur = typeof data.shadowBlur === "number" ? data.shadowBlur : 4;
  if (rangeTextShadowBlur) rangeTextShadowBlur.value = shadowBlur;
  if (valTextShadowBlur) valTextShadowBlur.textContent = `${shadowBlur}px`;
  const shadowOffset = typeof data.shadowOffset === "number" ? data.shadowOffset : 2;
  if (rangeTextShadowOffset) rangeTextShadowOffset.value = shadowOffset;
  if (valTextShadowOffset) valTextShadowOffset.textContent = `${shadowOffset}px`;
}

function setObjectActiveTool(toolName) {
  state.object.tool = toolName;
  if (objToolButtons) {
    objToolButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tool === toolName);
    });
  }

  const curItem = objectEngine ? objectEngine.getSelectedItem() : null;
  const isText = toolName === "text" || (toolName === "select" && curItem && curItem.type === "text");
  const isLineOrArrow = toolName === "line" || toolName === "arrow" || (toolName === "select" && curItem && (curItem.type === "line" || curItem.type === "arrow"));
  const isRect = toolName === "rect" || (toolName === "select" && curItem && curItem.type === "rect");

  // Toggle between Shape Controls and 3-Tier Text Inspector
  if (objShapeControls) {
    objShapeControls.classList.toggle("hidden", isText);
  }
  if (objTextInspector) {
    objTextInspector.classList.toggle("hidden", !isText);
  }

  if (labelStrokeText) {
    labelStrokeText.textContent = typeof I18N !== "undefined" ? I18N.t("labelStrokeColor") : "외곽선";
  }

  if (colObjFill) {
    colObjFill.classList.toggle("hidden", isLineOrArrow);
  }
  if (btnObjStrokeClear) {
    btnObjStrokeClear.classList.toggle("hidden", isLineOrArrow || objectEngine?.defaultStyle.isStroked === false);
  }
  if (groupBorderRadius) {
    groupBorderRadius.classList.toggle("hidden", !isRect);
  }

  if (isText && objectEngine) {
    syncTextInspectorUI(curItem && curItem.type === "text" ? curItem : objectEngine.defaultStyle);
  } else if (objectEngine && typeof updateStrokeChipUI === "function") {
    const isStroked = curItem ? (curItem.isStroked !== false) : (objectEngine.defaultStyle.isStroked !== false);
    const strokeColor = curItem ? curItem.strokeColor : objectEngine.defaultStyle.strokeColor;
    updateStrokeChipUI(isStroked, strokeColor);
    if (typeof updateFillChipUI === "function") {
      const isFilled = curItem ? curItem.isFilled : objectEngine.defaultStyle.isFilled;
      const fillColor = curItem ? curItem.fillColor : objectEngine.defaultStyle.fillColor;
      updateFillChipUI(isFilled, fillColor);
    }
  }
}

function updateObjectSelectionUI() {
  if (!objectEngine) return;
  const item = objectEngine.getSelectedItem();

  const hasSelection = !!item;
  if (btnObjDuplicate) btnObjDuplicate.disabled = !hasSelection;
  if (btnObjBringForward) btnObjBringForward.disabled = !hasSelection;
  if (btnObjSendBackward) btnObjSendBackward.disabled = !hasSelection;
  if (btnObjDelete) btnObjDelete.disabled = !hasSelection;

  const isEditingCurrentText = item && item.type === "text" && (state.object.isEditingText || !item.text);
  if (!item || !objectSelectionBox || isEditingCurrentText) {
    if (objectSelectionBox) objectSelectionBox.classList.add("hidden");

    const isTextTool = state.object.tool === "text";
    if (objShapeControls) objShapeControls.classList.toggle("hidden", isTextTool);
    if (objTextInspector) objTextInspector.classList.toggle("hidden", !isTextTool);

    if (isTextTool) {
      syncTextInspectorUI(objectEngine.defaultStyle);
    } else {
      if (typeof updateStrokeChipUI === "function") {
        updateStrokeChipUI(objectEngine.defaultStyle.isStroked !== false, objectEngine.defaultStyle.strokeColor);
      }
      if (typeof updateFillChipUI === "function") {
        updateFillChipUI(objectEngine.defaultStyle.isFilled, objectEngine.defaultStyle.fillColor);
      }
    }
    return;
  }

  // Compute selection box coordinates
  let left = item.x;
  let top = item.y;
  let width = item.width;
  let height = item.height;

  if (item.type === "line" || item.type === "arrow") {
    left = Math.min(item.startX, item.endX);
    top = Math.min(item.startY, item.endY);
    width = Math.max(12, Math.abs(item.endX - item.startX));
    height = Math.max(12, Math.abs(item.endY - item.startY));
  }

  objectSelectionBox.style.left = `${left}px`;
  objectSelectionBox.style.top = `${top}px`;
  objectSelectionBox.style.width = `${width}px`;
  objectSelectionBox.style.height = `${height}px`;
  objectSelectionBox.style.transform = item.rotation ? `rotate(${item.rotation}deg)` : "none";
  objectSelectionBox.classList.remove("hidden");

  // Contextual visibility based on selected item type
  const isText = item.type === "text";
  const isLineOrArrow = item.type === "line" || item.type === "arrow";
  const isRect = item.type === "rect";

  if (isText) {
    if (objShapeControls) objShapeControls.classList.add("hidden");
    if (objTextInspector) objTextInspector.classList.remove("hidden");
    syncTextInspectorUI(item);
  } else {
    if (objShapeControls) objShapeControls.classList.remove("hidden");
    if (objTextInspector) objTextInspector.classList.add("hidden");

    if (labelStrokeText) {
      labelStrokeText.textContent = typeof I18N !== "undefined" ? I18N.t("labelStrokeColor") : "외곽선";
    }

    if (colObjFill) {
      colObjFill.classList.toggle("hidden", isLineOrArrow);
    }

    // Sync shape inspector values
    const isStroked = typeof item.isStroked === "boolean" ? item.isStroked : true;
    const strokeColor = item.strokeColor || objectEngine.defaultStyle.strokeColor;
    if (inputObjStrokeColor && strokeColor) {
      inputObjStrokeColor.value = strokeColor;
    }
    if (typeof updateStrokeChipUI === "function") {
      updateStrokeChipUI(isStroked, strokeColor);
    }
    const isFilled = item.isFilled === true;
    const fillColor = item.fillColor || objectEngine.defaultStyle.fillColor;
    if (inputObjFillColor && fillColor) {
      inputObjFillColor.value = fillColor;
    }
    if (typeof updateFillChipUI === "function") {
      updateFillChipUI(isFilled, fillColor);
    }
    if (rangeObjStrokeWidth && typeof item.strokeWidth === "number") {
      rangeObjStrokeWidth.value = item.strokeWidth;
      if (valObjStrokeWidth) valObjStrokeWidth.textContent = `${item.strokeWidth}px`;
    }
    if (rangeObjOpacity && typeof item.opacity === "number") {
      const pct = Math.round(item.opacity * 100);
      rangeObjOpacity.value = pct;
      if (valObjOpacity) valObjOpacity.textContent = `${pct}%`;
    }
    if (rangeObjRadius && typeof item.borderRadius === "number" && groupBorderRadius) {
      groupBorderRadius.classList.toggle("hidden", !isRect);
      rangeObjRadius.value = item.borderRadius;
      if (valObjRadius) valObjRadius.textContent = `${item.borderRadius}px`;
    } else if (groupBorderRadius) {
      groupBorderRadius.classList.add("hidden");
    }
  }
}

function deleteSelectedObject() {
  if (objectEngine && objectEngine.selectedId) {
    objectEngine.removeItem(objectEngine.selectedId);
    updateObjectSelectionUI();
    updateUndoRedoButtons();
  }
}

function setupInlineTextEditor() {
  if (!inlineTextEditor) return;

  const commitText = () => {
    if (inlineTextEditor.classList.contains("hidden")) return;
    const currentId = inlineTextEditor.dataset.itemId;
    const item = objectEngine ? objectEngine.getItemById(currentId) : null;
    const textVal = inlineTextEditor.value.trim();

    if (item && textVal) {
      const m = objectEngine.measureText(textVal, item.fontSize, item.isBold, item.fontFamily, item.isItalic);
      objectEngine.updateItem(item.id, {
        text: textVal,
        width: m.width,
        height: m.height,
        isEditing: false
      });
      objectEngine.pushState();
      updateUndoRedoButtons();
    } else if (item && !textVal) {
      objectEngine.removeItem(item.id);
      updateUndoRedoButtons();
    }

    inlineTextEditor.classList.add("hidden");
    inlineTextEditor.value = "";
    inlineTextEditor.dataset.itemId = "";
    state.object.isEditingText = false;
    if (objectEngine) objectEngine.renderAll();
    updateObjectSelectionUI();
  };

  inlineTextEditor.addEventListener("blur", commitText);

  inlineTextEditor.addEventListener("input", () => {
    const currentId = inlineTextEditor.dataset.itemId;
    const item = objectEngine ? objectEngine.getItemById(currentId) : null;
    if (!item) return;

    applyInlineEditorStyle(item);

    const placeholderText = typeof I18N !== "undefined" ? I18N.t("placeholderTextInput") : "텍스트 입력";
    const val = inlineTextEditor.value || placeholderText;
    const m = objectEngine ? objectEngine.measureText(val, item.fontSize, item.isBold, item.fontFamily, item.isItalic) : { width: 140, height: 40 };
    inlineTextEditor.style.width = `${Math.max(160, m.width + 30)}px`;
    inlineTextEditor.style.height = `${Math.max(Math.round(item.fontSize * 1.35), m.height + 10)}px`;
  });

  inlineTextEditor.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitText();
    } else if (e.key === "Escape") {
      e.preventDefault();
      const currentId = inlineTextEditor.dataset.itemId;
      const item = objectEngine ? objectEngine.getItemById(currentId) : null;
      if (item) {
        if (!item.text) {
          objectEngine.removeItem(item.id);
        } else {
          item.isEditing = false;
        }
      }
      inlineTextEditor.classList.add("hidden");
      inlineTextEditor.value = "";
      inlineTextEditor.dataset.itemId = "";
      state.object.isEditingText = false;
      if (objectEngine) objectEngine.renderAll();
      updateObjectSelectionUI();
    }
  });
}

function applyInlineEditorStyle(item) {
  if (!inlineTextEditor || !item) return;
  const hasText = !!inlineTextEditor.value;

  let fontStyle = "";
  if (item.isBold && hasText) fontStyle += "bold ";
  if (item.isItalic && hasText) fontStyle += "italic ";
  if (!fontStyle) fontStyle = "normal ";
  inlineTextEditor.style.font = `${fontStyle}${item.fontSize}px ${item.fontFamily || "Inter, system-ui, sans-serif"}`;

  if (hasText) {
    const isStrokeOnly = item.strokeMode === "strokeOnly" || item.isFilled === false;
    const fillColor = isStrokeOnly ? "transparent" : (item.fillColor || "#ffffff");
    inlineTextEditor.style.color = fillColor;

    const effectiveStrokeWidth = isStrokeOnly
      ? Math.min(item.strokeWidth || 2, Math.max(1, Math.round(item.fontSize / 15)))
      : (item.strokeWidth || 2);

    if (item.isStroked !== false && effectiveStrokeWidth > 0) {
      inlineTextEditor.style.webkitTextStroke = `${Math.min(effectiveStrokeWidth, 3)}px ${item.strokeColor || "#38bdf8"}`;
    } else {
      inlineTextEditor.style.webkitTextStroke = "none";
    }
  } else {
    // 텍스트 설명(Placeholder): 흐릿하고 은은한 회색, 외곽선 및 그림자 없음
    inlineTextEditor.style.color = "rgba(255, 255, 255, 0.42)";
    inlineTextEditor.style.webkitTextStroke = "none";
  }
}

function openInlineTextEditor(item) {
  if (!inlineTextEditor || !item) return;
  state.object.isEditingText = true;
  item.isEditing = true;
  if (objectEngine) objectEngine.renderAll();

  const placeholderText = typeof I18N !== "undefined" ? I18N.t("placeholderTextInput") : "텍스트 입력";
  inlineTextEditor.dataset.itemId = item.id;
  inlineTextEditor.value = item.text || "";
  inlineTextEditor.placeholder = placeholderText;

  applyInlineEditorStyle(item);

  inlineTextEditor.style.left = `${item.x}px`;
  inlineTextEditor.style.top = `${item.y}px`;

  const textToMeasure = item.text || placeholderText;
  const m = objectEngine ? objectEngine.measureText(textToMeasure, item.fontSize, item.isBold, item.fontFamily, item.isItalic) : { width: 140, height: 40 };
  const initW = Math.max(160, m.width + 30);
  const initH = Math.max(Math.round(item.fontSize * 1.35), m.height + 10);
  inlineTextEditor.style.width = `${initW}px`;
  inlineTextEditor.style.height = `${initH}px`;
  inlineTextEditor.style.textAlign = item.textAlign || "center";

  inlineTextEditor.classList.remove("hidden");
  setTimeout(() => {
    inlineTextEditor.focus();
    if (inlineTextEditor.value) {
      inlineTextEditor.select();
    }
  }, 30);
  updateObjectSelectionUI();
}

function handleObjectMouseDown(x, y, e) {
  if (!objectEngine) return;

  // 1. Check Handle Click
  if (e.target && e.target.classList.contains("obj-handle")) {
    const handle = e.target.dataset.handle;
    state.object.isResizing = true;
    state.object.resizeHandle = handle;
    state.object.moveStartPos = { x, y };
    state.object.initialItem = JSON.parse(JSON.stringify(objectEngine.getSelectedItem()));
    return;
  }

  // 2. Check Rotate Handle Click
  if (e.target && e.target.classList.contains("obj-rotate-handle")) {
    state.object.isRotating = true;
    state.object.moveStartPos = { x, y };
    state.object.initialItem = JSON.parse(JSON.stringify(objectEngine.getSelectedItem()));
    return;
  }

  // 3. Check Interaction with Existing / Currently Selected Item
  const tool = state.object.tool;
  const hit = objectEngine.hitTest(x, y);
  const selectedItem = objectEngine.getSelectedItem();

  // (A) Clicked inside the currently selected object: allow moving / double-click editing
  if (selectedItem && hit && hit.id === selectedItem.id) {
    state.object.isMoving = true;
    state.object.moveStartPos = { x, y };
    state.object.initialItem = JSON.parse(JSON.stringify(hit));
    if (objectSelectionBox) objectSelectionBox.classList.add("moving");
    if (hit.type === "text" && e.detail >= 2) {
      openInlineTextEditor(hit);
    }
    return;
  }

  // (B) When text tool is active, clicking an existing text selects and edits it rather than stacking a new one
  if (tool === "text" && hit && hit.type === "text") {
    objectEngine.selectItem(hit.id);
    state.object.isMoving = true;
    state.object.moveStartPos = { x, y };
    state.object.initialItem = JSON.parse(JSON.stringify(hit));
    if (objectSelectionBox) objectSelectionBox.classList.add("moving");
    updateObjectSelectionUI();
    if (e.detail >= 2) {
      openInlineTextEditor(hit);
    }
    return;
  }

  // 4. New Object Creation Tool (Canvas empty space click / drag)
  if (tool && tool !== "select") {
    // If clicking outside the selected object, clear previous selection and start creating new one
    objectEngine.clearSelection();
    updateObjectSelectionUI();

    state.object.isDrawing = true;
    state.object.drawStartPos = { x, y };

    const def = objectEngine.defaultStyle;
    let newItem = {
      type: tool,
      x,
      y,
      width: 1,
      height: 1,
      strokeColor: def.strokeColor,
      strokeWidth: def.strokeWidth,
      isStroked: (tool === "line" || tool === "arrow") ? true : (def.isStroked !== false),
      fillColor: def.fillColor,
      isFilled: def.isFilled,
      opacity: def.opacity,
      rotation: 0
    };

    // Safety fallback: ensure at least one of fill or stroke is enabled for shapes
    if (!newItem.isStroked && !newItem.isFilled) {
      newItem.isFilled = true;
    }

    if (tool === "rect") {
      newItem.borderRadius = def.borderRadius;
    } else if (tool === "line" || tool === "arrow") {
      newItem.startX = x;
      newItem.startY = y;
      newItem.endX = x + 1;
      newItem.endY = y + 1;
    } else if (tool === "text") {
      newItem.text = "";
      newItem.fontSize = def.fontSize;
      newItem.fontFamily = def.fontFamily;
      newItem.isBold = !!def.isBold;
      newItem.isItalic = !!def.isItalic;
      newItem.textAlign = def.textAlign || "center";
      newItem.hasTextShadow = def.hasTextShadow !== false;
      newItem.shadowColor = def.shadowColor || "#000000";
      newItem.shadowBlur = typeof def.shadowBlur === "number" ? def.shadowBlur : 4;
      newItem.shadowOffset = typeof def.shadowOffset === "number" ? def.shadowOffset : 2;
      newItem.isFilled = chkTextFill ? chkTextFill.checked : (def.isFilled !== false);
      newItem.fillColor = def.fillColor || "#ffffff";
      newItem.isStroked = chkTextStroke ? chkTextStroke.checked : !!def.isStroked;
      newItem.strokeColor = def.strokeColor || "#38bdf8";
      newItem.strokeWidth = typeof def.strokeWidth === "number" ? def.strokeWidth : 3;

      if (!newItem.isFilled && !newItem.isStroked) {
        newItem.isFilled = true;
      }
      const placeholderText = typeof I18N !== "undefined" ? I18N.t("placeholderTextInput") : "텍스트 입력";
      const m = objectEngine ? objectEngine.measureText(placeholderText, def.fontSize, def.isBold, def.fontFamily, def.isItalic) : { width: 140, height: 40 };
      newItem.width = Math.max(160, m.width + 30);
      newItem.height = Math.max(Math.round(def.fontSize * 1.35), m.height + 10);
    }

    objectEngine.addItem(newItem);
    updateObjectSelectionUI();
    return;
  }

  // 5. Select Tool Hit Testing
  if (hit) {
    objectEngine.selectItem(hit.id);
    state.object.isMoving = true;
    state.object.moveStartPos = { x, y };
    state.object.initialItem = JSON.parse(JSON.stringify(hit));
    if (objectSelectionBox) objectSelectionBox.classList.add("moving");
    updateObjectSelectionUI();

    // Double Click to open text editor
    if (hit.type === "text" && e.detail >= 2) {
      openInlineTextEditor(hit);
    }
  } else {
    objectEngine.clearSelection();
    updateObjectSelectionUI();
  }
}

function handleObjectMouseMove(x, y, e) {
  if (!objectEngine) return;

  // 1. Rotating
  if (state.object.isRotating && state.object.initialItem) {
    const item = state.object.initialItem;
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const rad = Math.atan2(y - cy, x - cx);
    const deg = Math.round(rad * (180 / Math.PI)) - 90;
    objectEngine.updateItem(item.id, { rotation: (deg + 360) % 360 });
    state.object.hasModified = true;
    updateObjectSelectionUI();
    return;
  }

  // 2. Resizing
  if (state.object.isResizing && state.object.initialItem && state.object.resizeHandle) {
    const init = state.object.initialItem;
    const handle = state.object.resizeHandle;
    const dx = x - state.object.moveStartPos.x;
    const dy = y - state.object.moveStartPos.y;

    if (init.type === "line" || init.type === "arrow") {
      if (handle === "tl") {
        objectEngine.updateItem(init.id, { startX: init.startX + dx, startY: init.startY + dy });
      } else {
        objectEngine.updateItem(init.id, { endX: init.endX + dx, endY: init.endY + dy });
      }
    } else {
      let newX = init.x;
      let newY = init.y;
      let newW = init.width;
      let newH = init.height;

      if (handle.includes("r")) newW = Math.max(15, init.width + dx);
      if (handle.includes("l")) {
        newW = Math.max(15, init.width - dx);
        newX = init.x + init.width - newW;
      }
      if (handle.includes("b")) newH = Math.max(15, init.height + dy);
      if (handle.includes("t")) {
        newH = Math.max(15, init.height - dy);
        newY = init.y + init.height - newH;
      }

      objectEngine.updateItem(init.id, { x: newX, y: newY, width: newW, height: newH });
    }
    state.object.hasModified = true;
    updateObjectSelectionUI();
    return;
  }

  // 3. Moving
  if (state.object.isMoving && state.object.initialItem) {
    const init = state.object.initialItem;
    const dx = x - state.object.moveStartPos.x;
    const dy = y - state.object.moveStartPos.y;

    if (init.type === "line" || init.type === "arrow") {
      objectEngine.updateItem(init.id, {
        startX: init.startX + dx,
        startY: init.startY + dy,
        endX: init.endX + dx,
        endY: init.endY + dy,
        x: init.x + dx,
        y: init.y + dy
      });
    } else {
      objectEngine.updateItem(init.id, { x: init.x + dx, y: init.y + dy });
    }
    state.object.hasModified = true;
    updateObjectSelectionUI();
    return;
  }

  // 4. Drawing New Item
  if (state.object.isDrawing && objectEngine.selectedId) {
    const start = state.object.drawStartPos;
    const curId = objectEngine.selectedId;
    const item = objectEngine.getItemById(curId);
    if (!item) return;

    if (item.type === "line" || item.type === "arrow") {
      objectEngine.updateItem(curId, {
        startX: start.x,
        startY: start.y,
        endX: x,
        endY: y,
        x: Math.min(start.x, x),
        y: Math.min(start.y, y),
        width: Math.abs(x - start.x),
        height: Math.abs(y - start.y)
      });
    } else {
      const left = Math.min(start.x, x);
      const top = Math.min(start.y, y);
      const w = Math.max(5, Math.abs(x - start.x));
      const h = Math.max(5, Math.abs(y - start.y));

      objectEngine.updateItem(curId, { x: left, y: top, width: w, height: h });
    }
    state.object.hasModified = true;
    updateObjectSelectionUI();
  }
}

function handleObjectMouseUp() {
  if (!state.object.active || !objectEngine) return;

  let shouldPushHistory = false;

  if (state.object.isDrawing) {
    const cur = objectEngine.getSelectedItem();
    if (cur) {
      if (cur.type === "text") {
        openInlineTextEditor(cur);
      } else {
        if (cur.width < 8 && cur.height < 8) {
          // Correct tiny accidental clicks to standard default size
          objectEngine.updateItem(cur.id, { width: 120, height: 90 });
        }
        shouldPushHistory = true;
      }
    }
    state.object.isDrawing = false;
  } else if (state.object.hasModified) {
    shouldPushHistory = true;
  }

  state.object.isMoving = false;
  state.object.isResizing = false;
  state.object.isRotating = false;
  state.object.hasModified = false;
  state.object.resizeHandle = null;
  state.object.initialItem = null;

  if (objectSelectionBox) {
    objectSelectionBox.classList.remove("moving");
  }
  updateObjectSelectionUI();

  if (shouldPushHistory) {
    objectEngine.pushState();
    updateUndoRedoButtons();
  }
}

function glueObjectsToMainCanvas() {
  if (!objectEngine || !objectEngine.hasItems()) return;

  const ctx = mainCanvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(objectCanvas, 0, 0);

  objectEngine.clearAll();
  updateObjectSelectionUI();
}

function getCompositeExportCanvas(customBgFill) {
  const bg = typeof customBgFill !== "undefined" ? customBgFill : state.bgFill;
  const exportCanvas = RemoverEngine.renderWithBackground(mainCanvas, bg);
  if (objectEngine && objectEngine.hasItems()) {
    const ctx = exportCanvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(objectCanvas, 0, 0);
  }
  return exportCanvas;
}

// -------------------------------------------------------------
// Crop & Trim Controls
// -------------------------------------------------------------
function setupCropControls() {
  // Auto Trim
  if (btnAutoTrim) {
    btnAutoTrim.addEventListener("click", applyAutoTrim);
  }

  // Manual Crop Toggle
  if (btnManualCrop) {
    btnManualCrop.addEventListener("click", () => {
      if (!state.originalImage) return;
      setCropMode(!state.crop.isActive);
    });
  }

  // Width Input Change
  if (inputCropWidth) {
    inputCropWidth.addEventListener("input", () => {
      if (!state.originalImage) return;
      const w = parseInt(inputCropWidth.value, 10);
      if (isNaN(w) || w <= 0) return;

      let h = parseInt(inputCropHeight.value, 10);
      if (state.crop.lockAspectRatio && state.crop.aspectRatio > 0) {
        h = Math.max(1, Math.round(w / state.crop.aspectRatio));
        if (inputCropHeight) inputCropHeight.value = h;
      } else if (!h || isNaN(h)) {
        h = w;
        if (inputCropHeight) inputCropHeight.value = h;
      }

      const cur = state.crop.currentRect;
      const cx = cur ? cur.x + cur.width / 2 : mainCanvas.width / 2;
      const cy = cur ? cur.y + cur.height / 2 : mainCanvas.height / 2;

      const newX = Math.round(cx - w / 2);
      const newY = Math.round(cy - h / 2);
      setCropBoxRect(newX, newY, w, h, false);
    });
  }

  // Height Input Change
  if (inputCropHeight) {
    inputCropHeight.addEventListener("input", () => {
      if (!state.originalImage) return;
      const h = parseInt(inputCropHeight.value, 10);
      if (isNaN(h) || h <= 0) return;

      let w = parseInt(inputCropWidth.value, 10);
      if (state.crop.lockAspectRatio && state.crop.aspectRatio > 0) {
        w = Math.max(1, Math.round(h * state.crop.aspectRatio));
        if (inputCropWidth) inputCropWidth.value = w;
      } else if (!w || isNaN(w)) {
        w = h;
        if (inputCropWidth) inputCropWidth.value = w;
      }

      const cur = state.crop.currentRect;
      const cx = cur ? cur.x + cur.width / 2 : mainCanvas.width / 2;
      const cy = cur ? cur.y + cur.height / 2 : mainCanvas.height / 2;

      const newX = Math.round(cx - w / 2);
      const newY = Math.round(cy - h / 2);
      setCropBoxRect(newX, newY, w, h, false);
    });
  }

  // Aspect Ratio Lock Checkbox Change
  if (checkCropLockRatio) {
    checkCropLockRatio.addEventListener("change", () => {
      state.crop.lockAspectRatio = checkCropLockRatio.checked;
      if (labelCropLockRatio) labelCropLockRatio.classList.toggle("active", state.crop.lockAspectRatio);
      if (iconCropLock && iconCropUnlock) {
        iconCropLock.classList.toggle("hidden", !state.crop.lockAspectRatio);
        iconCropUnlock.classList.toggle("hidden", state.crop.lockAspectRatio);
      }

      if (state.crop.lockAspectRatio) {
        let targetRatio = null;
        if (state.crop.presetRatio === "1:1") targetRatio = 1.0;
        else if (state.crop.presetRatio === "4:3") targetRatio = 4 / 3;
        else if (state.crop.presetRatio === "16:9") targetRatio = 16 / 9;

        if (targetRatio) {
          state.crop.aspectRatio = targetRatio;
        } else {
          const cur = state.crop.currentRect;
          if (cur && cur.width > 0 && cur.height > 0) {
            state.crop.aspectRatio = cur.width / cur.height;
          } else {
            const w = parseInt(inputCropWidth.value, 10) || mainCanvas.width;
            const h = parseInt(inputCropHeight.value, 10) || mainCanvas.height;
            state.crop.aspectRatio = w / h;
          }
        }
      } else {
        if (cropPresetChips) {
          cropPresetChips.forEach((chip) => {
            chip.classList.toggle("active", chip.dataset.ratio === "free");
          });
        }
      }
    });
  }

  // Preset Ratio Chips (free, 1:1, 4:3, 16:9)
  if (cropPresetChips) {
    cropPresetChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        if (!state.originalImage) return;

        cropPresetChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");

        const ratioKey = chip.dataset.ratio;
        state.crop.presetRatio = ratioKey;

        if (ratioKey === "free") {
          state.crop.lockAspectRatio = false;
          if (checkCropLockRatio) checkCropLockRatio.checked = false;
          if (labelCropLockRatio) labelCropLockRatio.classList.remove("active");
          if (iconCropLock && iconCropUnlock) {
            iconCropLock.classList.add("hidden");
            iconCropUnlock.classList.remove("hidden");
          }
        } else {
          let targetRatio = 1.0;
          if (ratioKey === "1:1") targetRatio = 1.0;
          else if (ratioKey === "4:3") targetRatio = 4 / 3;
          else if (ratioKey === "16:9") targetRatio = 16 / 9;

          state.crop.lockAspectRatio = true;
          state.crop.aspectRatio = targetRatio;
          if (checkCropLockRatio) checkCropLockRatio.checked = true;
          if (labelCropLockRatio) labelCropLockRatio.classList.add("active");
          if (iconCropLock && iconCropUnlock) {
            iconCropLock.classList.remove("hidden");
            iconCropUnlock.classList.add("hidden");
          }

          // Adjust current crop box to match new ratio
          const cur = state.crop.currentRect;
          let curW = cur ? cur.width : Math.round(mainCanvas.width * 0.8);
          let curH = Math.round(curW / targetRatio);

          if (curH > mainCanvas.height) {
            curH = mainCanvas.height;
            curW = Math.round(curH * targetRatio);
          }
          if (curW > mainCanvas.width) {
            curW = mainCanvas.width;
            curH = Math.round(curW / targetRatio);
          }

          const cx = cur ? cur.x + cur.width / 2 : mainCanvas.width / 2;
          const cy = cur ? cur.y + cur.height / 2 : mainCanvas.height / 2;
          const newX = Math.round(cx - curW / 2);
          const newY = Math.round(cy - curH / 2);
          setCropBoxRect(newX, newY, curW, curH, true);
        }
      });
    });
  }

  // Apply Crop Button
  if (btnApplyCrop) {
    btnApplyCrop.addEventListener("click", applyManualCrop);
  }

  // Cancel Crop Button
  if (btnCancelCrop) {
    btnCancelCrop.addEventListener("click", () => {
      setCropMode(false);
    });
  }

  // Escape key cancels crop mode
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.crop.isActive) {
      setCropMode(false);
    }
  });
}

function setCropMode(active) {
  state.crop.isActive = active;
  state.crop.isDragging = false;
  state.crop.isMoving = false;
  state.crop.isResizing = false;
  state.crop.resizeHandle = null;

  if (cropSelectionBox) {
    cropSelectionBox.classList.remove("moving");
  }

  if (btnManualCrop) {
    btnManualCrop.classList.toggle("active", active);
  }
  if (cropSettingsPanel) {
    cropSettingsPanel.classList.toggle("hidden", !active);
  }
  if (cropOverlayLayer) {
    cropOverlayLayer.classList.toggle("hidden", !active);
  }

  if (active) {
    if (state.object && state.object.active) {
      setObjectStudioMode(false);
    }
    if (state.colorKey && state.colorKey.eyedropperActive) {
      state.colorKey.eyedropperActive = false;
      if (btnEyedropper) btnEyedropper.classList.remove("active");
      canvasStage.classList.remove("eyedropper-active");
    }
    canvasStage.classList.add("crop-mode");
    if (brushCursor) brushCursor.classList.add("hidden");

    // Initialize or restore crop box
    if (state.originalImage) {
      if (!state.crop.currentRect) {
        let w = Math.round(mainCanvas.width * 0.8);
        let h = Math.round(mainCanvas.height * 0.8);
        if (state.crop.lockAspectRatio && state.crop.aspectRatio > 0) {
          h = Math.round(w / state.crop.aspectRatio);
          if (h > mainCanvas.height) {
            h = mainCanvas.height;
            w = Math.round(h * state.crop.aspectRatio);
          }
        }
        const x = Math.round((mainCanvas.width - w) / 2);
        const y = Math.round((mainCanvas.height - h) / 2);
        setCropBoxRect(x, y, w, h, true);
      } else {
        setCropBoxRect(
          state.crop.currentRect.x,
          state.crop.currentRect.y,
          state.crop.currentRect.width,
          state.crop.currentRect.height,
          true
        );
      }
    }

    showToast(
      typeof I18N !== "undefined"
        ? I18N.t("toastCropModeHint")
        : "캔버스에서 자르고자 하는 영역을 마우스로 드래그하거나 수치를 입력하세요.",
      "info"
    );
  } else {
    canvasStage.classList.remove("crop-mode");
    if (cropSelectionBox) {
      cropSelectionBox.classList.add("hidden");
    }
    state.crop.currentRect = null;
    if (btnApplyCrop) {
      btnApplyCrop.disabled = true;
    }
  }
}

function setCropBoxRect(x, y, width, height, updateInputs = true) {
  if (!state.originalImage) return;

  const maxW = mainCanvas.width;
  const maxH = mainCanvas.height;

  // Strict aspect ratio preservation
  if (state.crop.lockAspectRatio && state.crop.aspectRatio > 0) {
    const ratio = state.crop.aspectRatio;

    // Check bounds and scale width/height proportionally
    if (width > maxW) {
      width = maxW;
      height = Math.round(width / ratio);
    }
    if (height > maxH) {
      height = maxH;
      width = Math.round(height * ratio);
    }
    if (width > maxW) {
      width = maxW;
      height = Math.round(width / ratio);
    }

    width = Math.max(5, Math.min(maxW, width));
    height = Math.max(1, Math.min(maxH, height));

    x = Math.max(0, Math.min(maxW - width, x));
    y = Math.max(0, Math.min(maxH - height, y));
  } else {
    width = Math.max(1, Math.min(maxW, width));
    height = Math.max(1, Math.min(maxH, height));
    x = Math.max(0, Math.min(maxW - width, x));
    y = Math.max(0, Math.min(maxH - height, y));
  }

  state.crop.currentRect = { x, y, width, height };

  if (cropSelectionBox) {
    cropSelectionBox.style.left = `${x}px`;
    cropSelectionBox.style.top = `${y}px`;
    cropSelectionBox.style.width = `${width}px`;
    cropSelectionBox.style.height = `${height}px`;
    cropSelectionBox.classList.remove("hidden");
  }

  if (cropInfoBadge) {
    cropInfoBadge.textContent = `${width} × ${height}`;
  }

  if (updateInputs) {
    if (inputCropWidth) inputCropWidth.value = width;
    if (inputCropHeight) inputCropHeight.value = height;
  }

  if (btnApplyCrop) {
    btnApplyCrop.disabled = width < 5 || height < 5;
  }
}

function updateCropSelectionBox(x1, y1, x2, y2) {
  let left = Math.min(x1, x2);
  let top = Math.min(y1, y2);
  let width = Math.abs(x2 - x1);
  let height = Math.abs(y2 - y1);

  if (state.crop.lockAspectRatio && state.crop.aspectRatio > 0 && width > 0 && height > 0) {
    const ratio = state.crop.aspectRatio;
    if (width / height > ratio) {
      width = Math.round(height * ratio);
    } else {
      height = Math.round(width / ratio);
    }

    if (x2 < x1) {
      left = x1 - width;
    }
    if (y2 < y1) {
      top = y1 - height;
    }

    // Keep aspect ratio within canvas bounds
    if (left < 0) {
      left = 0;
      width = Math.min(mainCanvas.width, x1);
      height = Math.round(width / ratio);
    }
    if (left + width > mainCanvas.width) {
      width = mainCanvas.width - left;
      height = Math.round(width / ratio);
    }
    if (top < 0) {
      top = 0;
      height = Math.min(mainCanvas.height, y1);
      width = Math.round(height * ratio);
    }
    if (top + height > mainCanvas.height) {
      height = mainCanvas.height - top;
      width = Math.round(height * ratio);
    }
  }

  setCropBoxRect(left, top, width, height, true);
}

function applyManualCrop() {
  if (!state.originalImage || !state.crop.currentRect) return;

  const rect = state.crop.currentRect;
  if (rect.width < 5 || rect.height < 5) return;

  if (objectEngine && objectEngine.hasItems()) {
    glueObjectsToMainCanvas();
  }

  // Crop mainCanvas and originalCanvas synchronously
  const croppedMain = RemoverEngine.cropCanvas(mainCanvas, rect);
  const croppedOriginal = RemoverEngine.cropCanvas(originalCanvas, rect);

  syncCanvasDimensions(rect.width, rect.height, croppedMain, croppedOriginal);

  historyManager.pushState(mainCanvas, originalCanvas);
  updateUndoRedoButtons();
  updateCanvasDisplay();
  resetZoomAndFit();

  setCropMode(false);

  showToast(
    typeof I18N !== "undefined"
      ? I18N.t("toastCropSuccess", [rect.width, rect.height])
      : `선택 영역으로 이미지가 잘라졌습니다! (${rect.width} x ${rect.height} px)`,
    "success"
  );
}

function applyAutoTrim() {
  if (!state.originalImage) return;

  if (objectEngine && objectEngine.hasItems()) {
    glueObjectsToMainCanvas();
  }

  const result = RemoverEngine.trimCanvas(mainCanvas, { padding: 0 });

  if (result.isEmpty) {
    alert(typeof I18N !== "undefined" ? I18N.t("alertTrimAllTransparent") : "이미지에 피사체가 없거나 전체가 투명합니다.");
    return;
  }

  if (result.isAlreadyTrimmed) {
    showToast(typeof I18N !== "undefined" ? I18N.t("toastNoTrimNeeded") : "자르고 남은 투명 여백이 없습니다.", "info");
    return;
  }

  const { trimmedCanvas, bounds } = result;

  // Crop originalCanvas to match the exact same bounding box for restore brush and split view
  const croppedOriginal = document.createElement("canvas");
  croppedOriginal.width = bounds.width;
  croppedOriginal.height = bounds.height;
  const origCtx = croppedOriginal.getContext("2d", { willReadFrequently: true });
  origCtx.drawImage(
    originalCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );

  syncCanvasDimensions(bounds.width, bounds.height, trimmedCanvas, croppedOriginal);

  historyManager.pushState(mainCanvas, originalCanvas);
  updateUndoRedoButtons();
  updateCanvasDisplay();
  resetZoomAndFit();

  showToast(
    typeof I18N !== "undefined"
      ? I18N.t("toastTrimSuccess", [bounds.width, bounds.height])
      : `투명 여백이 제거되었습니다! (${bounds.width} x ${bounds.height} px)`,
    "success"
  );
}

function applyResize() {
  if (!state.originalImage) return;

  const targetW = parseInt(inputResizeWidth.value, 10);
  const targetH = parseInt(inputResizeHeight.value, 10);

  if (isNaN(targetW) || isNaN(targetH) || targetW <= 0 || targetH <= 0) {
    alert(typeof I18N !== "undefined" ? I18N.t("alertInvalidDimensions") : "유효한 너비와 높이를 입력해 주세요.");
    return;
  }

  if (targetW === mainCanvas.width && targetH === mainCanvas.height) {
    return;
  }

  if (objectEngine && objectEngine.hasItems()) {
    glueObjectsToMainCanvas();
  }

  // High quality step-down resize on both main active canvas and pristine original canvas
  const resizedMain = RemoverEngine.resizeCanvas(mainCanvas, targetW, targetH);
  const resizedOriginal = RemoverEngine.resizeCanvas(originalCanvas, targetW, targetH);

  syncCanvasDimensions(targetW, targetH, resizedMain, resizedOriginal);

  historyManager.pushState(mainCanvas, originalCanvas);
  updateUndoRedoButtons();
  updateCanvasDisplay();
  resetZoomAndFit();

  showToast(typeof I18N !== "undefined" ? I18N.t("toastResizeSuccess", [targetW, targetH]) : `이미지 크기가 ${targetW} x ${targetH} px로 조절되었습니다!`, "success");
}

function syncCanvasDimensions(width, height, newMainCanvas = null, newOriginalCanvas = null) {
  // Update mainCanvas
  mainCanvas.width = width;
  mainCanvas.height = height;
  if (newMainCanvas) {
    const mainCtx = mainCanvas.getContext("2d", { willReadFrequently: true });
    mainCtx.drawImage(newMainCanvas, 0, 0);
  }

  // Update originalCanvas
  originalCanvas.width = width;
  originalCanvas.height = height;
  if (newOriginalCanvas) {
    const origCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
    origCtx.drawImage(newOriginalCanvas, 0, 0);
  }

  // Update sub-canvases
  bgCanvas.width = width;
  bgCanvas.height = height;
  splitOverlayCanvas.width = width;
  splitOverlayCanvas.height = height;
  if (objectCanvas) {
    objectCanvas.width = width;
    objectCanvas.height = height;
  }
  if (objectEngine) {
    objectEngine.resize(width, height);
  }

  // Update DOM transform layer size
  canvasTransformLayer.style.width = `${width}px`;
  canvasTransformLayer.style.height = `${height}px`;

  // Update inputs & info tags
  if (inputResizeWidth) inputResizeWidth.value = width;
  if (inputResizeHeight) inputResizeHeight.value = height;
  state.resize.aspectRatio = width / height;
  if (currentResolutionText) currentResolutionText.textContent = `${width} x ${height}`;
  imageDimensions.textContent = `${state.fileName} (${width} x ${height} px)`;
}

// -------------------------------------------------------------
// Action Buttons & Shortcuts
// -------------------------------------------------------------
function setupActionButtons() {
  btnUndo.addEventListener("click", () => {
    // 1. Prioritize Object Studio Undo if there are object history states
    if (objectEngine && objectEngine.canUndo() && (state.object.active || objectEngine.hasItems())) {
      objectEngine.undo();
      updateObjectSelectionUI();
      updateUndoRedoButtons();
      return;
    }

    // 2. Fall back to Bitmap canvas history
    const snapshot = historyManager.undo(mainCanvas);
    if (snapshot) {
      const prev = snapshot.main || snapshot;
      const prevOrig = snapshot.original;
      if (prev.width !== mainCanvas.width || prev.height !== mainCanvas.height) {
        const restoredOriginal = prevOrig || RemoverEngine.resizeCanvas(originalCanvas, prev.width, prev.height);
        syncCanvasDimensions(prev.width, prev.height, prev, restoredOriginal);
        resetZoomAndFit();
      } else {
        const ctx = mainCanvas.getContext("2d", { willReadFrequently: true });
        ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        ctx.drawImage(prev, 0, 0);
        if (prevOrig) {
          const origCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
          origCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
          origCtx.drawImage(prevOrig, 0, 0);
        }
      }
      updateUndoRedoButtons();
      updateCanvasDisplay();
    }
  });

  btnRedo.addEventListener("click", () => {
    // 1. Prioritize Object Studio Redo if there are object history states
    if (objectEngine && objectEngine.canRedo() && (state.object.active || objectEngine.hasItems() || (objectEngine.redoStack && objectEngine.redoStack.length > 0))) {
      objectEngine.redo();
      updateObjectSelectionUI();
      updateUndoRedoButtons();
      return;
    }

    // 2. Fall back to Bitmap canvas history
    const snapshot = historyManager.redo(mainCanvas);
    if (snapshot) {
      const next = snapshot.main || snapshot;
      const nextOrig = snapshot.original;
      if (next.width !== mainCanvas.width || next.height !== mainCanvas.height) {
        const restoredOriginal = nextOrig || RemoverEngine.resizeCanvas(originalCanvas, next.width, next.height);
        syncCanvasDimensions(next.width, next.height, next, restoredOriginal);
        resetZoomAndFit();
      } else {
        const ctx = mainCanvas.getContext("2d", { willReadFrequently: true });
        ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        ctx.drawImage(next, 0, 0);
        if (nextOrig) {
          const origCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
          origCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
          origCtx.drawImage(nextOrig, 0, 0);
        }
      }
      updateUndoRedoButtons();
      updateCanvasDisplay();
    }
  });

  if (selectSaveFormat) {
    selectSaveFormat.addEventListener("change", () => {
      updateFormatNotice();
    });
  }

  btnDownloadImage.addEventListener("click", async () => {
    if (!state.originalImage) return;

    try {
      const format = selectSaveFormat ? selectSaveFormat.value : "image/png";
      const isJpeg = format === "image/jpeg";
      const isTransparent = !state.bgFill || state.bgFill === "transparent";

      // If exporting to JPEG with transparent background, composite onto white (#FFFFFF)
      // to prevent browser canvas from rendering transparent pixels as black
      let exportBgFill = state.bgFill;
      if (isJpeg && isTransparent) {
        exportBgFill = "#ffffff";
      }

      const exportCanvas = getCompositeExportCanvas(exportBgFill);
      const blob = await RemoverEngine.toBlob(exportCanvas, format, 0.95, {
        transparent: isTransparent
      });
      const baseName = state.fileName.replace(/\.[^/.]+$/, "");

      let ext = ".png";
      if (format === "image/jpeg") ext = ".jpg";
      else if (format === "image/webp") ext = ".webp";
      else if (format === "image/gif") ext = ".gif";

      const suffix = isTransparent && format !== "image/jpeg" ? "_transparent" : "_edited";
      const outputFilename = `${baseName}${suffix}${ext}`;

      downloadBlob(blob, outputFilename);
      showToast(typeof I18N !== "undefined" ? I18N.t("toastImageDownloaded") : "이미지 다운로드가 완료되었습니다!", "success");
    } catch (err) {
      console.error("Export failed:", err);
      alert(typeof I18N !== "undefined" ? I18N.t("alertDownloadFailed") : "다운로드 중 오류가 발생했습니다.");
    }
  });

  btnCopyClipboard.addEventListener("click", async () => {
    if (!state.originalImage) return;

    try {
      const exportCanvas = getCompositeExportCanvas(state.bgFill);
      await RemoverEngine.copyToClipboard(exportCanvas);
      showToast(typeof I18N !== "undefined" ? I18N.t("toastCopied") : "투명 이미지가 클립보드에 복사되었습니다!", "success");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      showToast((typeof I18N !== "undefined" ? I18N.t("toastCopyFailed", [err.message]) : ("클립보드 복사 실패: " + err.message)), "info");
    }
  });

  btnResetImage.addEventListener("click", () => {
    if (confirm(typeof I18N !== "undefined" ? I18N.t("confirmResetImage") : "현재 편집 중인 이미지를 닫고 새 이미지를 여시겠습니까?")) {
      setCropMode(false);
      setObjectStudioMode(false);
      if (objectEngine) objectEngine.clearAll();
      state.originalImage = null;
      editorWorkspace.classList.add("hidden");
      dropZone.classList.remove("hidden");
      imageDimensions.textContent = typeof I18N !== "undefined" ? I18N.t("imageDimensionsEmpty") : "이미지를 불러와 주세요";
      enableControls(false);
    }
  });

  btnOpenCropper.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL("workspace/workspace.html") });
    } else {
      window.open("../workspace/workspace.html", "_blank");
    }
  });

  btnHelp.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL("guide.html#remover") });
    } else {
      window.open("../guide.html#remover", "_blank");
    }
  });
}

function updateUndoRedoButtons() {
  const canUndoObj = !!(objectEngine && objectEngine.canUndo() && (state.object.active || objectEngine.hasItems()));
  const canRedoObj = !!(objectEngine && objectEngine.canRedo() && (state.object.active || objectEngine.hasItems() || (objectEngine.redoStack && objectEngine.redoStack.length > 0)));

  btnUndo.disabled = !(canUndoObj || historyManager.canUndo());
  btnRedo.disabled = !(canRedoObj || historyManager.canRedo());
}

function setupShortcuts() {
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;

    // Delete / Backspace: Delete selected object
    if ((e.key === "Delete" || e.key === "Backspace") && state.object.active && objectEngine && objectEngine.selectedId) {
      e.preventDefault();
      deleteSelectedObject();
      return;
    }

    // Ctrl / Cmd + D: Duplicate selected object
    if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D") && state.object.active && objectEngine && objectEngine.selectedId) {
      e.preventDefault();
      objectEngine.duplicateItem(objectEngine.selectedId);
      updateObjectSelectionUI();
      updateUndoRedoButtons();
      return;
    }

    // Escape: Clear object selection
    if (e.key === "Escape" && state.object.active && objectEngine && objectEngine.selectedId) {
      objectEngine.clearSelection();
      updateObjectSelectionUI();
      return;
    }

    // Ctrl / Cmd + Z: Undo
    if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
      e.preventDefault();
      btnUndo.click();
    }
    // Ctrl / Cmd + Y or Ctrl / Cmd + Shift + Z: Redo
    if (((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "z" || e.key === "Z"))) {
      e.preventDefault();
      btnRedo.click();
    }
    // Ctrl / Cmd + C: Copy to Clipboard
    if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C") && state.originalImage) {
      e.preventDefault();
      btnCopyClipboard.click();
    }
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  if (typeof chrome !== "undefined" && chrome.downloads && chrome.downloads.download) {
    chrome.downloads.download({ url, filename, saveAs: true });
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function showToast(message, type = "info") {
  const iconSvg =
    type === "success"
      ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
           <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
           <polyline points="22 4 12 14.01 9 11.01"></polyline>
         </svg>`
      : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <circle cx="12" cy="12" r="10"></circle>
           <line x1="12" y1="16" x2="12" y2="12"></line>
           <line x1="12" y1="8" x2="12.01" y2="8"></line>
         </svg>`;

  toastMessage.innerHTML = `${iconSvg}<span>${message}</span>`;
  toastMessage.classList.remove("hidden");
  setTimeout(() => {
    toastMessage.classList.add("hidden");
  }, 2500);
}

// Start App
document.addEventListener("DOMContentLoaded", init);
