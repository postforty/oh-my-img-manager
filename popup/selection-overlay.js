(function () {
  if (document.getElementById("oh-my-img-overlay")) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "oh-my-img-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    cursor: "crosshair",
    zIndex: "2147483647",
    userSelect: "none",
  });

  const selectionBox = document.createElement("div");
  Object.assign(selectionBox.style, {
    position: "absolute",
    border: "2px solid #3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    display: "none",
    pointerEvents: "none",
    boxSizing: "border-box",
  });

  overlay.appendChild(selectionBox);
  document.body.appendChild(overlay);

  let startX = 0, startY = 0;
  let isDragging = false;

  const onMouseDown = (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
    selectionBox.style.display = "block";
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    selectionBox.style.left = `${x}px`;
    selectionBox.style.top = `${y}px`;
    selectionBox.style.width = `${w}px`;
    selectionBox.style.height = `${h}px`;
  };

  const onMouseUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    overlay.removeEventListener("mousedown", onMouseDown);
    overlay.removeEventListener("mousemove", onMouseMove);
    overlay.removeEventListener("mouseup", onMouseUp);
    
    // Slight delay to ensure visual feedback before freezing
    setTimeout(() => {
      overlay.remove();
      processSelection(
        Math.min(startX, e.clientX),
        Math.min(startY, e.clientY),
        Math.max(10, Math.abs(e.clientX - startX)),
        Math.max(10, Math.abs(e.clientY - startY))
      );
    }, 50);
  };

  overlay.addEventListener("mousedown", onMouseDown);
  overlay.addEventListener("mousemove", onMouseMove);
  overlay.addEventListener("mouseup", onMouseUp);

  function processSelection(x, y, w, h) {
    chrome.storage.local.get(["oh_my_img_full_screen"], (result) => {
      const dataUrl = result.oh_my_img_full_screen;
      if (!dataUrl) {
        alert(typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getMessage ? (chrome.i18n.getMessage("alertFullScreenNotFound") || "캡처된 전체 화면 데이터를 찾을 수 없습니다.") : "캡처된 전체 화면 데이터를 찾을 수 없습니다.");
        return;
      }

      const img = new Image();
      img.onload = () => {
        const scaleX = img.width / window.innerWidth;
        const scaleY = img.height / window.innerHeight;

        const cropX = x * scaleX;
        const cropY = y * scaleY;
        const cropW = w * scaleX;
        const cropH = h * scaleY;

        const canvas = document.createElement("canvas");
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d");
        
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        const croppedDataUrl = canvas.toDataURL("image/png");

        chrome.storage.local.set({ oh_my_img_capture: croppedDataUrl }, () => {
          chrome.runtime.sendMessage({ action: "open_remover" });
          chrome.storage.local.remove("oh_my_img_full_screen");
        });
      };
      img.src = dataUrl;
    });
  }
})();
