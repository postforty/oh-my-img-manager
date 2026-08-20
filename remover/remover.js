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
function init() {
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
  setupActionButtons();
  setupShortcuts();
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
      showToast("AI 백그라운드 워커 오류가 발생했습니다.");
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
    aiStatusText.textContent = `AI 모델 다운로드 준비 중... (${file || "model"})`;
  } else if (type === "PROGRESS") {
    aiProgressWrap.classList.remove("hidden");
    aiProgressBarFill.style.width = `${progress}%`;
    aiStatusText.textContent = `모델 다운로드 중... ${progress}% (${file || ""})`;
  } else if (type === "INFERENCE_START") {
    aiProgressBarFill.style.width = `95%`;
    aiStatusText.textContent = "AI 피사체 분리 연산 중...";
  } else if (type === "SUCCESS") {
    aiProgressBarFill.style.width = `100%`;
    aiStatusText.textContent = "완료!";

    const maskData = new Uint8ClampedArray(maskBuffer);
    RemoverEngine.applyAlphaMask(mainCanvas, maskData, width, height, originalCanvas);

    historyManager.pushState(mainCanvas);
    updateUndoRedoButtons();
    updateCanvasDisplay();

    setTimeout(() => {
      aiProgressWrap.classList.add("hidden");
      state.ai.isProcessing = false;
      btnRunAi.disabled = false;
      showToast("AI 배경 제거가 완료되었습니다!", "success");
    }, 400);
  } else if (type === "ERROR") {
    aiProgressWrap.classList.add("hidden");
    state.ai.isProcessing = false;
    btnRunAi.disabled = false;
    alert(`AI 배경 제거 실패: ${error}`);
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
          showToast("클립보드 이미지를 불러왔습니다!", "info");
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
    alert("올바른 이미지 파일을 선택해 주세요.");
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

    // Reset History
    historyManager.clear();
    historyManager.pushState(mainCanvas);
    updateUndoRedoButtons();

    // UI Updates
    imageDimensions.textContent = `${state.fileName} (${width} x ${height} px)`;
    dropZone.classList.add("hidden");
    editorWorkspace.classList.remove("hidden");

    enableControls(true);
    resetZoomAndFit();
    updateCanvasDisplay();
  } catch (err) {
    console.error("Image load failed:", err);
    alert("이미지를 불러오는 중 오류가 발생했습니다.");
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
  ].forEach((btn) => {
    if (btn) btn.disabled = !enabled;
  });
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
    if (!state.originalImage || e.button !== 0 || state.isSpacePressed) return;

    // Check if clicked near Split Divider
    if (state.viewMode === "split") {
      const rect = mainCanvas.getBoundingClientRect();
      const dividerX = rect.left + rect.width * state.splitPos;
      if (Math.abs(e.clientX - dividerX) < 16) {
        state.isSplitDragging = true;
        return;
      }
    }

    const { x, y } = getCanvasCoords(e);

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
    if (state.isSplitDragging) {
      state.isSplitDragging = false;
    }
    if (state.brush.isDrawing) {
      state.brush.isDrawing = false;
      historyManager.pushState(mainCanvas);
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
  showToast(`배경색이 지정되었습니다: ${hex}`, "info");
}

function setupColorKeyControls() {
  btnEyedropper.addEventListener("click", () => {
    state.colorKey.eyedropperActive = !state.colorKey.eyedropperActive;
    btnEyedropper.classList.toggle("active", state.colorKey.eyedropperActive);
    canvasStage.classList.toggle("eyedropper-active", state.colorKey.eyedropperActive);
    if (state.colorKey.eyedropperActive) {
      showToast("캔버스에서 제거할 배경색을 클릭하세요");
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

    historyManager.pushState(mainCanvas);
    updateUndoRedoButtons();
    updateCanvasDisplay();
    showToast("선택 색상 투명화가 적용되었습니다!", "success");
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
      alert("AI 워커가 초기화되지 않았습니다.");
      return;
    }

    state.ai.isProcessing = true;
    btnRunAi.disabled = true;
    aiProgressWrap.classList.remove("hidden");
    aiProgressBarFill.style.width = "5%";
    aiStatusText.textContent = "AI 모델 로딩 중...";

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
// Action Buttons & Shortcuts
// -------------------------------------------------------------
function setupActionButtons() {
  btnUndo.addEventListener("click", () => {
    const prev = historyManager.undo(mainCanvas);
    if (prev) {
      const ctx = mainCanvas.getContext("2d");
      ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      ctx.drawImage(prev, 0, 0);
      updateUndoRedoButtons();
      updateCanvasDisplay();
    }
  });

  btnRedo.addEventListener("click", () => {
    const next = historyManager.redo(mainCanvas);
    if (next) {
      const ctx = mainCanvas.getContext("2d");
      ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      ctx.drawImage(next, 0, 0);
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
      showToast("투명 PNG 다운로드가 완료되었습니다!", "success");
    } catch (err) {
      console.error("Export failed:", err);
      alert("다운로드 중 오류가 발생했습니다.");
    }
  });

  btnCopyClipboard.addEventListener("click", async () => {
    if (!state.originalImage) return;

    try {
      const exportCanvas = RemoverEngine.renderWithBackground(mainCanvas, state.bgFill);
      await RemoverEngine.copyToClipboard(exportCanvas);
      showToast("투명 이미지가 클립보드에 복사되었습니다!", "success");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      showToast("클립보드 복사 실패: " + err.message, "info");
    }
  });

  btnResetImage.addEventListener("click", () => {
    if (confirm("현재 편집 중인 이미지를 닫고 새 이미지를 여시겠습니까?")) {
      state.originalImage = null;
      editorWorkspace.classList.add("hidden");
      dropZone.classList.remove("hidden");
      imageDimensions.textContent = "이미지를 불러와 주세요";
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
