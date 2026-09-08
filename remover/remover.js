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
    startX: 0,
    startY: 0,
    currentRect: null,
  },

  resize: {
    lockAspectRatio: true,
    aspectRatio: 1.0,
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
const originalCanvas = document.getElementById("originalCanvas");
const bgCanvas = document.getElementById("bgCanvas");
const splitOverlayCanvas = document.getElementById("splitOverlayCanvas");
const splitDivider = document.getElementById("splitDivider");
const brushCursor = document.getElementById("brushCursor");
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
const resizePresetChips = document.querySelectorAll(".btn-preset-chip");

// Action Elements
const btnUndo = document.getElementById("btnUndo");
const btnRedo = document.getElementById("btnRedo");
const btnDownloadPng = document.getElementById("btnDownloadPng");
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
    aiStatusText.textContent = statusMsg;
    if (scanBadgeText) scanBadgeText.textContent = statusMsg;
  } else if (type === "PROGRESS") {
    aiProgressWrap.classList.remove("hidden");
    aiProgressBarFill.style.width = `${progress}%`;
    const dlMsg = typeof I18N !== "undefined" ? I18N.t("modelDownloading", [progress]) : `다운로드 중... (${progress}%)`;
    aiStatusText.textContent = dlMsg;
    if (scanBadgeText) scanBadgeText.textContent = dlMsg;
  } else if (type === "INFERENCE_START") {
    aiProgressBarFill.style.width = `95%`;
    const infMsg = typeof I18N !== "undefined" ? I18N.t("modelInferencing") : "배경 제거 중...";
    aiStatusText.textContent = infMsg;
    if (scanBadgeText) scanBadgeText.textContent = infMsg;
  } else if (type === "SUCCESS") {
    aiProgressBarFill.style.width = `100%`;
    const doneMsg = typeof I18N !== "undefined" ? I18N.t("toastAiDone") : "완료!";
    aiStatusText.textContent = doneMsg;
    if (scanBadgeText) scanBadgeText.textContent = doneMsg;

    const maskData = new Uint8ClampedArray(maskBuffer);
    RemoverEngine.applyAlphaMask(mainCanvas, maskData, width, height, originalCanvas);

    historyManager.pushState(mainCanvas, originalCanvas);
    updateCanvasDisplay();

    setTimeout(() => {
      aiProgressWrap.classList.add("hidden");
      setAIProcessingState(false);
      showToast(typeof I18N !== "undefined" ? I18N.t("toastAiDone") : "AI 배경 제거가 완료되었습니다!", "success");
    }, 400);
  } else if (type === "ERROR") {
    aiProgressWrap.classList.add("hidden");
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
    [mainCanvas, originalCanvas, bgCanvas, splitOverlayCanvas].forEach((c) => {
      c.width = width;
      c.height = height;
    });

    canvasTransformLayer.style.width = `${width}px`;
    canvasTransformLayer.style.height = `${height}px`;

    const origCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
    origCtx.drawImage(image, 0, 0);

    const mainCtx = mainCanvas.getContext("2d", { willReadFrequently: true });
    mainCtx.drawImage(image, 0, 0);

    // Reset History & Crop State
    setCropMode(false);
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
    btnDownloadPng,
    btnCopyClipboard,
    btnResetImage,
    btnAutoTrim,
    btnManualCrop,
    btnApplyResize,
    checkLockRatio,
    inputResizeWidth,
    inputResizeHeight,
  ].forEach((btn) => {
    if (btn) btn.disabled = !enabled;
  });

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

      // Handle Manual Crop Dragging
      if (state.crop.isActive) {
        brushCursor.classList.add("hidden");
        if (state.crop.isDragging) {
          const clampedX = Math.max(0, Math.min(mainCanvas.width, x));
          const clampedY = Math.max(0, Math.min(mainCanvas.height, y));
          updateCropSelectionBox(state.crop.startX, state.crop.startY, clampedX, clampedY);
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

      // Handle Manual Crop Box Start
      if (state.crop.isActive) {
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
    window.addEventListener("mouseup", () => {
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
    setAIProcessingState(true, prepText);
    aiProgressWrap.classList.remove("hidden");
    aiProgressBarFill.style.width = "5%";
    aiStatusText.textContent = prepText;

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
    });
  });

  const inputCustomBg = document.getElementById("inputCustomBg");
  inputCustomBg.addEventListener("input", (e) => {
    document.querySelectorAll(".bg-fill-btn").forEach((b) => b.classList.remove("active"));
    inputCustomBg.closest(".bg-fill-btn").classList.add("active");
    state.bgFill = e.target.value;
    updateCanvasDisplay();
  });
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
  state.crop.currentRect = null;

  if (btnManualCrop) {
    btnManualCrop.classList.toggle("active", active);
  }
  if (cropActionGroup) {
    cropActionGroup.classList.toggle("hidden", !active);
  }
  if (cropOverlayLayer) {
    cropOverlayLayer.classList.toggle("hidden", !active);
  }
  if (cropSelectionBox) {
    cropSelectionBox.classList.add("hidden");
  }
  if (btnApplyCrop) {
    btnApplyCrop.disabled = true;
  }

  if (active) {
    if (state.colorKey && state.colorKey.eyedropperActive) {
      state.colorKey.eyedropperActive = false;
      if (btnEyedropper) btnEyedropper.classList.remove("active");
      canvasStage.classList.remove("eyedropper-active");
    }
    canvasStage.classList.add("crop-mode");
    if (brushCursor) brushCursor.classList.add("hidden");
    showToast(
      typeof I18N !== "undefined"
        ? I18N.t("toastCropModeHint")
        : "캔버스에서 자르고자 하는 영역을 마우스로 드래그하세요.",
      "info"
    );
  } else {
    canvasStage.classList.remove("crop-mode");
  }
}

function updateCropSelectionBox(x1, y1, x2, y2) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  state.crop.currentRect = { x: left, y: top, width, height };

  if (cropSelectionBox) {
    cropSelectionBox.style.left = `${left}px`;
    cropSelectionBox.style.top = `${top}px`;
    cropSelectionBox.style.width = `${width}px`;
    cropSelectionBox.style.height = `${height}px`;
  }

  if (cropInfoBadge) {
    cropInfoBadge.textContent = `${width} × ${height}`;
  }

  if (btnApplyCrop) {
    btnApplyCrop.disabled = width < 5 || height < 5;
  }
}

function applyManualCrop() {
  if (!state.originalImage || !state.crop.currentRect) return;

  const rect = state.crop.currentRect;
  if (rect.width < 5 || rect.height < 5) return;

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

  btnDownloadPng.addEventListener("click", async () => {
    if (!state.originalImage) return;

    try {
      const exportCanvas = RemoverEngine.renderWithBackground(mainCanvas, state.bgFill);
      const blob = await RemoverEngine.toBlob(exportCanvas, "image/png");
      const baseName = state.fileName.replace(/\.[^/.]+$/, "");
      const outputFilename = `${baseName}_transparent.png`;

      downloadBlob(blob, outputFilename);
      showToast(typeof I18N !== "undefined" ? I18N.t("toastPngDownloaded") : "투명 PNG 다운로드가 완료되었습니다!", "success");
    } catch (err) {
      console.error("Export failed:", err);
      alert(typeof I18N !== "undefined" ? I18N.t("alertDownloadFailed") : "다운로드 중 오류가 발생했습니다.");
    }
  });

  btnCopyClipboard.addEventListener("click", async () => {
    if (!state.originalImage) return;

    try {
      const exportCanvas = RemoverEngine.renderWithBackground(mainCanvas, state.bgFill);
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
  btnUndo.disabled = !historyManager.canUndo();
  btnRedo.disabled = !historyManager.canRedo();
}

function setupShortcuts() {
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

    // Ctrl + Z: Undo
    if (e.ctrlKey && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
      e.preventDefault();
      btnUndo.click();
    }
    // Ctrl + Y or Ctrl + Shift + Z: Redo
    if ((e.ctrlKey && (e.key === "y" || e.key === "Y")) || (e.ctrlKey && e.shiftKey && (e.key === "z" || e.key === "Z"))) {
      e.preventDefault();
      btnRedo.click();
    }
    // Ctrl + C: Copy to Clipboard
    if (e.ctrlKey && (e.key === "c" || e.key === "C") && state.originalImage) {
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
