// Sync Theme from localStorage
const savedTheme = localStorage.getItem("oh_my_img_theme");
if (savedTheme === "light" || (!savedTheme && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)) {
  document.body.classList.remove("dark-theme");
  document.body.classList.add("light-theme");
} else {
  document.body.classList.remove("light-theme");
  document.body.classList.add("dark-theme");
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof I18N !== "undefined") {
    await I18N.initDOM();
    await I18N.setupLanguageSelector("selectLang");
  }
});

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

const btnOpenGuide = document.getElementById("btnOpenGuide");
if (btnOpenGuide) {
  btnOpenGuide.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL("guide.html") });
    } else {
      window.open("../guide.html", "_blank");
    }
  });
}

document.getElementById("btnCaptureCurrentTab").addEventListener("click", async () => {
  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.captureVisibleTab) {
    alert(typeof I18N !== "undefined" ? I18N.t("alertOnlyChromeTab") : "크롬 브라우저 환경에서만 탭 캡처가 가능합니다.");
    return;
  }

  try {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (!dataUrl) {
        alert(typeof I18N !== "undefined" ? I18N.t("alertCannotCapture") : "화면을 캡처할 수 없습니다. 웹페이지 탭에서 시도해 주세요.");
        return;
      }

      chrome.storage.local.set({ oh_my_img_full_screen: dataUrl }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length === 0) return;
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["popup/selection-overlay.js"]
          }, () => {
            if (chrome.runtime.lastError) {
              alert(typeof I18N !== "undefined" ? I18N.t("alertCaptureNotAllowed") : "현재 페이지에는 캡처 기능을 사용할 수 없습니다. 일반 웹페이지에서 시도해주세요.");
              console.error(chrome.runtime.lastError.message);
            } else {
              window.close();
            }
          });
        });
      });
    });
  } catch (err) {
    console.error("Tab capture error:", err);
    alert(typeof I18N !== "undefined" ? I18N.t("alertCaptureError", [err.message]) : ("탭 캡처 중 오류가 발생했습니다: " + err.message));
  }
});

