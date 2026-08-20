/**
 * Oh My Img Cropper - Workspace Controller
 */

// Application State
const state = {
  files: [],
  selectedIndex: 0,
  ratios: {
    left: 0.0,
    top: 0.171,
    right: 1.0,
    bottom: 0.862,
  },
  activeTab: "box", // 'box' | 'cropped'
  format: "image/jpeg",
  quality: 0.95,
};

const PRESETS = {
  default: { left: 0.0, top: 0.171, right: 1.0, bottom: 0.862 },
  slim: { left: 0.03, top: 0.171, right: 0.97, bottom: 0.862 },
  full: { left: 0.0, top: 0.0, right: 1.0, bottom: 1.0 },
  // Backward-compatible aliases
  ebook: { left: 0.0, top: 0.171, right: 1.0, bottom: 0.862 },
  "ebook-tight": { left: 0.03, top: 0.171, right: 0.97, bottom: 0.862 },
};

// DOM Elements
const dropZone = document.getElementById("dropZone");
const workspaceView = document.getElementById("workspaceView");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const addMoreInput = document.getElementById("addMoreInput");
const previewCanvas = document.getElementById("previewCanvas");
const croppedCanvas = document.getElementById("croppedCanvas");
const queueList = document.getElementById("queueList");
const queueCount = document.getElementById("queueCount");
const previewInfo = document.getElementById("previewInfo");
const headerFileSummary = document.getElementById("headerFileSummary");
const btnThemeToggle = document.getElementById("btnThemeToggle");

const btnBatchZip = document.getElementById("btnBatchZip");
const btnClearAll = document.getElementById("btnClearAll");
const tabBoxPreview = document.getElementById("tabBoxPreview");
const tabCroppedPreview = document.getElementById("tabCroppedPreview");

// Sliders
const rangeTop = document.getElementById("rangeTop");
const rangeBottom = document.getElementById("rangeBottom");
const rangeLeft = document.getElementById("rangeLeft");
const rangeRight = document.getElementById("rangeRight");
const valTop = document.getElementById("valTop");
const valBottom = document.getElementById("valBottom");
const valLeft = document.getElementById("valLeft");
const valRight = document.getElementById("valRight");

const selectFormat = document.getElementById("selectFormat");
const rangeQuality = document.getElementById("rangeQuality");
const valQuality = document.getElementById("valQuality");
const qualityRow = document.getElementById("qualityRow");

// Modal
const progressModal = document.getElementById("progressModal");
const progressBarFill = document.getElementById("progressBarFill");
const progressText = document.getElementById("progressText");
const progressSub = document.getElementById("progressSub");

// Initialize Event Listeners
function init() {
  setupTheme();
  setupDragAndDrop();
  setupFileInputs();
  setupSliders();
  setupPresets();
  setupTabs();
  setupSaveSettings();
  setupActionButtons();
}

// Theme Management (Dark / Light mode)
function setupTheme() {
  const savedTheme = localStorage.getItem("oh_my_img_theme");
  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    applyTheme("light");
  } else {
    applyTheme("dark");
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", () => {
      const currentTheme = document.body.classList.contains("light-theme") ? "light" : "dark";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      localStorage.setItem("oh_my_img_theme", nextTheme);
    });
  }
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


// Drag & Drop
function setupDragAndDrop() {
  ["dragenter", "dragover"].forEach((eventName) => {
    document.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    document.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("dragover");
    });
  });

  document.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      addFiles(Array.from(dt.files));
    }
  });
}

function setupFileInputs() {
  const handleFiles = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = ""; // Reset
    }
  };

  fileInput.addEventListener("change", handleFiles);
  folderInput.addEventListener("change", handleFiles);
  addMoreInput.addEventListener("change", handleFiles);
}

// Add files to state
async function addFiles(newFiles) {
  const imageFiles = newFiles.filter((f) =>
    /\.(jpe?g|png|webp|bmp|gif|tiff)$/i.test(f.name) || f.type.startsWith("image/")
  );

  if (imageFiles.length === 0) return;

  for (const file of imageFiles) {
    const item = {
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      thumbUrl: URL.createObjectURL(file),
      bitmap: null,
    };
    state.files.push(item);
  }

  updateUIState();
  if (state.files.length > 0) {
    await loadActivePreview();
  }
}

// Update UI view states
function updateUIState() {
  const count = state.files.length;
  headerFileSummary.textContent = `로드된 파일: ${count}개`;
  queueCount.textContent = count;

  if (count === 0) {
    dropZone.classList.remove("hidden");
    workspaceView.classList.add("hidden");
    btnBatchZip.disabled = true;
    btnClearAll.disabled = true;
  } else {
    dropZone.classList.add("hidden");
    workspaceView.classList.remove("hidden");
    btnBatchZip.disabled = false;
    btnClearAll.disabled = false;
  }

  renderQueue();
}

// Render queue thumbnail strip
function renderQueue() {
  queueList.innerHTML = "";
  state.files.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = `queue-item ${idx === state.selectedIndex ? "active" : ""}`;
    div.title = `${item.name} (${(item.size / 1024).toFixed(1)} KB)`;
    div.innerHTML = `
      <img src="${item.thumbUrl}" alt="thumb" />
      <span class="queue-badge">${idx + 1}</span>
      <button class="queue-remove-btn" title="목록에서 제거 (삭제)">✕</button>
    `;

    // Click thumbnail to select
    div.addEventListener("click", () => {
      state.selectedIndex = idx;
      renderQueue();
      loadActivePreview();
    });

    // Click X to remove from list
    const removeBtn = div.querySelector(".queue-remove-btn");
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFile(idx);
    });

    queueList.appendChild(div);
  });
}

// Remove single file from queue
function removeFile(indexToRemove) {
  if (indexToRemove < 0 || indexToRemove >= state.files.length) return;

  const [removed] = state.files.splice(indexToRemove, 1);
  if (removed && removed.thumbUrl) {
    URL.revokeObjectURL(removed.thumbUrl);
  }

  // Adjust selected index
  if (state.files.length === 0) {
    state.selectedIndex = 0;
  } else if (state.selectedIndex >= state.files.length) {
    state.selectedIndex = state.files.length - 1;
  } else if (indexToRemove < state.selectedIndex) {
    state.selectedIndex--;
  }

  updateUIState();
  if (state.files.length > 0) {
    loadActivePreview();
  }
}


// Load and render active preview image
async function loadActivePreview() {
  if (state.files.length === 0) return;

  const currentItem = state.files[state.selectedIndex];
  if (!currentItem.bitmap) {
    currentItem.bitmap = await CropperEngine.loadImage(currentItem.file);
  }

  const bitmap = currentItem.bitmap;
  const coords = CropperEngine.calculateCoordinates(bitmap.width, bitmap.height, state.ratios);

  // Update info bar
  previewInfo.textContent = `원본: ${bitmap.width} x ${bitmap.height} px | 결과: ${coords.sWidth} x ${coords.sHeight} px (상하 ${coords.top}px ~ ${coords.bottom}px)`;

  if (state.activeTab === "box") {
    previewCanvas.classList.remove("hidden");
    croppedCanvas.classList.add("hidden");
    CropperEngine.drawPreview(previewCanvas, bitmap, state.ratios);
  } else {
    previewCanvas.classList.add("hidden");
    croppedCanvas.classList.remove("hidden");
    renderCroppedCanvas(bitmap, coords);
  }
}

function renderCroppedCanvas(bitmap, coords) {
  croppedCanvas.width = coords.sWidth;
  croppedCanvas.height = coords.sHeight;
  const ctx = croppedCanvas.getContext("2d");
  ctx.drawImage(
    bitmap,
    coords.sx,
    coords.sy,
    coords.sWidth,
    coords.sHeight,
    0,
    0,
    coords.sWidth,
    coords.sHeight
  );
}

// Sliders and Presets
function setupSliders() {
  const updateFromSliders = () => {
    const top = parseFloat(rangeTop.value) / 100;
    const bottom = parseFloat(rangeBottom.value) / 100;
    const left = parseFloat(rangeLeft.value) / 100;
    const right = parseFloat(rangeRight.value) / 100;

    state.ratios = { top, bottom, left, right };

    valTop.textContent = `${(top * 100).toFixed(1)}%`;
    valBottom.textContent = `${(bottom * 100).toFixed(1)}%`;
    valLeft.textContent = `${(left * 100).toFixed(1)}%`;
    valRight.textContent = `${(right * 100).toFixed(1)}%`;

    // Clear active state from preset buttons
    document.querySelectorAll(".preset-btn").forEach((btn) => btn.classList.remove("active"));

    loadActivePreview();
  };

  [rangeTop, rangeBottom, rangeLeft, rangeRight].forEach((slider) => {
    slider.addEventListener("input", updateFromSliders);
  });
}

function setRatios(ratios, presetName = null) {
  state.ratios = { ...ratios };

  rangeTop.value = (ratios.top * 100).toFixed(1);
  rangeBottom.value = (ratios.bottom * 100).toFixed(1);
  rangeLeft.value = (ratios.left * 100).toFixed(1);
  rangeRight.value = (ratios.right * 100).toFixed(1);

  valTop.textContent = `${(ratios.top * 100).toFixed(1)}%`;
  valBottom.textContent = `${(ratios.bottom * 100).toFixed(1)}%`;
  valLeft.textContent = `${(ratios.left * 100).toFixed(1)}%`;
  valRight.textContent = `${(ratios.right * 100).toFixed(1)}%`;

  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === presetName);
  });

  loadActivePreview();
}

function setupPresets() {
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetKey = btn.dataset.preset;
      if (PRESETS[presetKey]) {
        setRatios(PRESETS[presetKey], presetKey);
      }
    });
  });
}

function setupTabs() {
  tabBoxPreview.addEventListener("click", () => {
    state.activeTab = "box";
    tabBoxPreview.classList.add("active");
    tabCroppedPreview.classList.remove("active");
    loadActivePreview();
  });

  tabCroppedPreview.addEventListener("click", () => {
    state.activeTab = "cropped";
    tabCroppedPreview.classList.add("active");
    tabBoxPreview.classList.remove("active");
    loadActivePreview();
  });
}

function setupSaveSettings() {
  selectFormat.addEventListener("change", (e) => {
    state.format = e.target.value;
    qualityRow.style.display = state.format === "image/png" ? "none" : "flex";
  });

  rangeQuality.addEventListener("input", (e) => {
    const q = parseInt(e.target.value, 10);
    state.quality = q / 100;
    valQuality.textContent = `${q}%`;
  });
}

function setupActionButtons() {
  btnClearAll.addEventListener("click", () => {
    if (confirm("모든 이미지를 목록에서 제거하시겠습니까?")) {
      state.files.forEach((f) => URL.revokeObjectURL(f.thumbUrl));
      state.files = [];
      state.selectedIndex = 0;
      updateUIState();
    }
  });

  btnBatchZip.addEventListener("click", runBatchExport);

  document.getElementById("btnHeaderHelp").addEventListener("click", () => {
    alert(
      "【Oh My Img Cropper 워크스페이스 사용법】\n\n" +
      "1. 이미지를 화면에 드래그 앤 드롭하세요.\n" +
      "2. 좌측 프리셋 또는 슬라이더로 상/하/좌/우 크롭 영역을 조절하세요.\n" +
      "3. '영역 표시 가이드'와 '크롭 결과물' 탭으로 자를 영역을 확인하세요.\n" +
      "4. [일괄 크롭 & ZIP 다운로드]를 누르면 모든 이미지가 압축 파일로 일괄 저장됩니다."
    );
  });
}

// Batch Processing & ZIP Export
async function runBatchExport() {
  if (state.files.length === 0) return;
  if (typeof JSZip === "undefined") {
    alert("JSZip 라이브러리가 로드되지 않았습니다.");
    return;
  }

  const zip = new JSZip();
  const total = state.files.length;
  progressModal.classList.remove("hidden");

  let successCount = 0;
  const ext = state.format === "image/png" ? ".png" : state.format === "image/webp" ? ".webp" : ".jpg";

  for (let i = 0; i < total; i++) {
    const item = state.files[i];
    const pct = Math.round(((i + 1) / total) * 100);
    progressBarFill.style.width = `${pct}%`;
    progressText.textContent = `${i + 1} / ${total} 처리 중 (${pct}%)`;
    progressSub.textContent = `현재 파일: ${item.name}`;

    try {
      const { blob } = await CropperEngine.cropToBlob(
        item.file,
        state.ratios,
        state.format,
        state.quality
      );

      // Preserve base filename without original extension
      const baseName = item.name.replace(/\.[^/.]+$/, "");
      const outputFilename = `${baseName}_cropped${ext}`;
      zip.file(outputFilename, blob);
      successCount++;
    } catch (err) {
      console.error(`Failed to crop ${item.name}:`, err);
    }

    // Small yield to allow UI update
    await new Promise((r) => setTimeout(r, 10));
  }

  progressText.textContent = `ZIP 압축 파일 생성 중...`;
  const zipBlob = await zip.generateAsync({ type: "blob" });

  downloadBlob(zipBlob, `cropped_images_${new Date().toISOString().slice(0, 10)}.zip`);

  setTimeout(() => {
    progressModal.classList.add("hidden");
    alert(`총 ${successCount}개의 이미지가 성공적으로 크롭되어 ZIP 파일로 다운로드되었습니다!`);
  }, 500);
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

// Start
document.addEventListener("DOMContentLoaded", init);
