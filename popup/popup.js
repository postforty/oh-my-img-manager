// Sync Theme from localStorage
const savedTheme = localStorage.getItem("oh_my_img_theme");
if (savedTheme === "light" || (!savedTheme && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)) {
  document.body.classList.remove("dark-theme");
  document.body.classList.add("light-theme");
} else {
  document.body.classList.remove("light-theme");
  document.body.classList.add("dark-theme");
}

document.getElementById("btnOpenRemover").addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL("remover/remover.html") });
  } else {
    window.open("../remover/remover.html", "_blank");
  }
});

document.getElementById("btnOpenWorkspace").addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL("workspace/workspace.html") });
  } else {
    window.open("../workspace/workspace.html", "_blank");
  }
});

document.getElementById("btnCaptureCurrentTab").addEventListener("click", async () => {
  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.captureVisibleTab) {
    alert("크롬 브라우저 환경에서만 탭 캡처가 가능합니다.");
    return;
  }

  try {
    // 1. Capture current visible tab
    chrome.tabs.captureVisibleTab(null, { format: "png" }, async (dataUrl) => {
      if (!dataUrl) {
        alert("화면을 캡처할 수 없습니다. 웹페이지 탭에서 시도해 주세요.");
        return;
      }

      // 2. Load into image & crop using eBook ratio (Top: 17.1%, Bottom: 86.2%)
      const img = new Image();
      img.onload = async () => {
        const ratios = { left: 0.0, top: 0.171, right: 1.0, bottom: 0.862 };
        const { blob } = await CropperEngine.cropToBlob(img, ratios, "image/jpeg", 0.95);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const filename = `ebook_capture_${timestamp}.jpg`;
        const blobUrl = URL.createObjectURL(blob);

        if (chrome.downloads && chrome.downloads.download) {
          chrome.downloads.download({ url: blobUrl, filename, saveAs: false });
        } else {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          a.click();
        }
      };
      img.src = dataUrl;
    });
  } catch (err) {
    console.error("Tab capture error:", err);
    alert("탭 캡처 중 오류가 발생했습니다: " + err.message);
  }
});
