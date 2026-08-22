// i18n.js - 경량 무의존성 다국어 통합 엔진 (Zero-Dependency i18n Engine)
(function (global) {
  if (global.I18N) return;

  const I18N = {
    // ==========================================
    // 1. 언어별 딕셔너리 정의 (Dictionaries)
    // ==========================================
    dictionaries: {
      ko: {
        // [확장 프로그램 메타데이터]
        extName: "Oh My Image Manager - 스마트 이미지 크롭 & 배경 제거(누끼) 스튜디오",
        extDescription: "대용량 이미지 일괄 크롭 & ZIP 압축 및 온디바이스 AI 기반 실시간 배경 제거(누끼 따기)를 지원합니다.",
        extShortName: "Oh My Image Manager",
        badgeMv3: "Manifest V3",
        badgeAi: "AI On-Device",

        // [공통 버튼 및 액션]
        saveBtn: "저장하기",
        resetBtn: "기본값 초기화",
        closeBtn: "닫기",
        copyBtn: "복사",
        copiedBtn: "복사됨!",
        downloadBtn: "다운로드",
        loading: "처리 중...",
        cancel: "취소",
        help: "도움말",
        themeToggle: "테마 변경 (다크/라이트 모드)",
        userGuide: "사용 설명서",

        // [언어 설정 셀렉터]
        uiLanguage: "언어",
        langAuto: "자동 감지 (Auto)",
        langKo: "한국어",
        langEn: "English",

        // [Popup UI]
        popupSubTitle: "스마트 이미지 매니저 & 일괄 크롭기",
        popupBtnRemoverTitle: "스마트 배경 제거 (누끼) 스튜디오",
        popupBtnRemoverDesc: "AI 원클릭 투명 배경 & 리터치 브러시 (단일 편집)",
        popupBtnWorkspaceTitle: "대량 일괄 크롭 워크스페이스",
        popupBtnWorkspaceDesc: "드래그 앤 드롭으로 수십 장 일괄 크롭 & ZIP 압축",
        popupDividerOr: "또는",
        popupBtnCaptureTitle: "웹 화면 영역 지정 캡처",
        popupBtnCaptureDesc: "원하는 영역을 캡처 후 누끼 스튜디오에서 편집",
        popupFooterPrivacy: "모든 이미지는 서버 전송 없이 안전하게 처리됩니다",
        alertOnlyChromeTab: "크롬 브라우저 환경에서만 탭 캡처가 가능합니다.",
        alertCannotCapture: "화면을 캡처할 수 없습니다. 웹페이지 탭에서 시도해 주세요.",
        alertCaptureNotAllowed: "현재 페이지에는 캡처 기능을 사용할 수 없습니다. 일반 웹페이지에서 시도해주세요.",
        alertCaptureError: "탭 캡처 중 오류가 발생했습니다: $1",
        alertFullScreenNotFound: "캡처된 전체 화면 데이터를 찾을 수 없습니다.",

        // [Workspace / Crop Studio]
        workspacePageTitle: "Oh My Image Manager - 일괄 이미지 크롭 워크스페이스",
        navRemoverStudio: "누끼 스튜디오",
        navRemoverStudioTitle: "배경 제거(누끼) 스튜디오로 이동",
        headerFileSummary: "로드된 파일: $1개",
        sectionPresets: "크롭 프리셋",
        presetDefaultName: "기본",
        presetDefaultDesc: "상하 여백 제거 (17.1% ~ 86.2%)",
        presetSlimName: "슬림",
        presetSlimDesc: "상하 + 좌우 여백 3% 제거",
        presetFullName: "전체 (100%)",
        presetFullDesc: "크롭 없음 (원본 유지)",
        sectionCustomRatio: "비율 직접 조절 (%)",
        labelTop: "상단 (Top)",
        labelBottom: "하단 (Bottom)",
        labelLeft: "좌측 (Left)",
        labelRight: "우측 (Right)",
        sectionSaveSettings: "저장 설정",
        labelFormat: "포맷:",
        formatJpeg: "JPEG (.jpg)",
        formatPng: "PNG (.png)",
        formatWebp: "WEBP (.webp)",
        labelQuality: "품질:",
        btnBatchZip: "일괄 크롭 & ZIP 다운로드",
        btnClearAll: "목록 비우기",
        dropZoneTitle: "이미지 파일을 이곳으로 드래그 앤 드롭하세요",
        dropZoneDesc: "전자책 스크린샷, JPG, PNG, WEBP 등 다중 파일 지원",
        btnSelectFiles: "파일 선택",
        btnSelectFolder: "폴더 선택",
        tabBoxPreview: "영역 표시 가이드",
        tabCroppedPreview: "크롭 결과물",
        previewInfoText: "원본: $1 x $2 px | 결과: $3 x $4 px (상하 $5px ~ $6px)",
        previewInfoEmpty: "원본: - px | 결과: - px",
        queueHeaderTitle: "파일 목록 ($1개)",
        btnAddFiles: "파일 추가",
        queueRemoveBtnTitle: "목록에서 제거 (삭제)",
        progressModalTitle: "일괄 크롭 처리 중...",
        progressProcessing: "$1 / $2 처리 중 ($3%)",
        progressCurrentFile: "현재 파일: $1",
        progressZipGenerating: "ZIP 압축 파일 생성 중...",
        progressSubText: "잠시만 기다려 주세요. 완료 후 ZIP 파일이 자동 다운로드됩니다.",
        confirmClearAll: "모든 이미지를 목록에서 제거하시겠습니까?",
        alertJsZipMissing: "JSZip 라이브러리가 로드되지 않았습니다.",
        alertBatchZipSuccess: "총 $1개의 이미지가 성공적으로 크롭되어 ZIP 파일로 다운로드되었습니다!",

        // [Remover Studio]
        removerPageTitle: "Oh My Image Manager - 스마트 배경 제거(누끼) 스튜디오",
        removerSubTitle: "누끼 스튜디오",
        navCropStudio: "일괄 크롭기",
        navCropStudioTitle: "대량 일괄 크롭 워크스페이스로 이동",
        imageDimensionsEmpty: "이미지를 불러와 주세요",
        imageDimensionsLoaded: "$1 x $2 px",
        sectionAiRemoval: "AI 스마트 누끼",
        badgeRecommended: "추천",
        labelAiModel: "AI 모델:",
        modelRmbg: "RMBG-1.4 (초고화질 SOTA)",
        modelModnet: "MODNet (경량 인물 특화)",
        btnRunAi: "원클릭 AI 배경 제거",
        aiStatusReady: "AI 모델 준비 중...",
        sectionSolidColor: "단색 / 스포이드 지우개",
        btnEyedropper: "스포이드 선택",
        btnEyedropperTitle: "이미지에서 제거할 배경색을 클릭하세요",
        labelTolerance: "허용 오차 (Tolerance)",
        labelFeather: "가장자리 부드럽게 (Feather)",
        btnApplyColorKey: "선택 색상 투명화 적용",
        sectionManualBrush: "수동 리터칭 브러시",
        brushErase: "지우개",
        brushRestore: "복원 펜",
        labelBrushSize: "브러시 크기",
        labelBrushHardness: "경계 부드러움",
        sectionBgFill: "배경 채우기",
        bgTransparent: "투명",
        bgTransparentTitle: "투명 배경",
        bgWhite: "화이트",
        bgWhiteTitle: "흰색 배경",
        bgBlack: "블랙",
        bgBlackTitle: "검은색 배경",
        bgCustomColor: "컬러",
        bgCustomColorTitle: "커스텀 색상 선택",
        btnUndo: "되돌리기",
        btnRedo: "다시하기",
        btnUndoTitle: "실행 취소 (Ctrl+Z)",
        btnRedoTitle: "다시 실행 (Ctrl+Y)",
        btnDownloadPng: "투명 PNG 다운로드",
        btnCopyClipboard: "클립보드로 복사 (Ctrl+C)",
        btnResetImage: "새 이미지 열기",
        dropZoneRemoverTitle: "편집할 이미지를 이곳으로 드래그 앤 드롭하세요",
        dropZoneRemoverDesc: "또는 언제든 Ctrl + V를 눌러 클립보드 이미지를 즉시 붙여넣을 수 있습니다",
        btnSelectFile: "파일 선택하기",
        hintPaste: "Ctrl + V 클립보드 붙여넣기",
        hintPrivacy: "100% 로컬 프라이버시",
        hintSotaAi: "SOTA AI 누끼",
        tabResultView: "투명 결과물",
        tabOriginalView: "원본 보기",
        tabSplitView: "좌우 비교 분할",
        btnZoomOutTitle: "축소 (마우스 휠)",
        btnZoomInTitle: "확대 (마우스 휠)",
        btnZoomFit: "Fit",
        btnZoomFitTitle: "화면에 맞추기",
        btnZoomReset: "1:1",
        btnZoomResetTitle: "100% 원본 크기",
        scanBadgeText: "배경 제거 중...",
        cursorPosLabel: "좌표: $1",
        cursorPosEmpty: "좌표: -",
        shortcutTipText: "단축키: <b>Space+드래그</b> 화면이동 | <b>Ctrl+Z</b> 되돌리기 | <b>Ctrl+C</b> 복사",
        toastWorkerError: "AI 백그라운드 워커 오류가 발생했습니다.",
        toastAiDone: "AI 배경 제거가 완료되었습니다!",
        toastClipboardLoaded: "클립보드 이미지를 불러왔습니다!",
        toastBgSelected: "배경색이 지정되었습니다: $1",
        toastPickGuide: "캔버스에서 제거할 배경색을 클릭하세요",
        toastColorKeyApplied: "선택 색상 투명화가 적용되었습니다!",
        toastPngDownloaded: "투명 PNG 다운로드가 완료되었습니다!",
        toastCopied: "투명 이미지가 클립보드에 복사되었습니다!",
        toastCopyFailed: "클립보드 복사 실패: $1",
        alertAiFailed: "AI 배경 제거 실패: $1",
        alertSelectValidImage: "올바른 이미지 파일을 선택해 주세요.",
        alertLoadImageFailed: "이미지를 불러오는 중 오류가 발생했습니다.",
        alertAiWorkerNotReady: "AI 워커가 초기화되지 않았습니다.",
        alertDownloadFailed: "다운로드 중 오류가 발생했습니다.",
        confirmResetImage: "현재 편집 중인 이미지를 닫고 새 이미지를 여시겠습니까?",
        modelDownloading: "AI 모델 다운로드 중 ($1%)...",
        modelLoadingStatus: "AI 모델 로딩 중...",
        modelInferencing: "AI 추론 및 마스크 생성 중...",

        // [Guide]
        guidePageTitle: "Oh My Image Manager 사용 설명서 - 스마트 이미지 크롭 & 누끼 스튜디오",
        guideMainTitle: "Oh My Image Manager 사용 설명서",
        guideMainDesc: "스마트 이미지 일괄 크롭 & AI 온디바이스 배경 제거(누끼) 스튜디오",
        navOverview: "주요 기능",
        navRemover: "AI 누끼 스튜디오",
        navCropper: "일괄 크롭 워크스페이스",
        navCapture: "웹 탭 캡처",
        navShortcuts: "단축키 안내",
        navPrivacy: "프라이버시 & 보안"
      },
      en: {
        // [Extension Metadata]
        extName: "Oh My Image Manager - Smart Image Crop & Background Remover Studio",
        extDescription: "Batch image crop, compression and on-device AI real-time background remover studio.",
        extShortName: "Oh My Image Manager",
        badgeMv3: "Manifest V3",
        badgeAi: "AI On-Device",

        // [Common Buttons & Actions]
        saveBtn: "Save",
        resetBtn: "Reset Defaults",
        closeBtn: "Close",
        copyBtn: "Copy",
        copiedBtn: "Copied!",
        downloadBtn: "Download",
        loading: "Processing...",
        cancel: "Cancel",
        help: "Help",
        themeToggle: "Toggle Theme (Dark/Light Mode)",
        userGuide: "User Guide",

        // [Language Selector]
        uiLanguage: "Language",
        langAuto: "Auto Detect",
        langKo: "한국어 (Korean)",
        langEn: "English",

        // [Popup UI]
        popupSubTitle: "Smart Image Manager & Batch Cropper",
        popupBtnRemoverTitle: "Smart AI Background Remover",
        popupBtnRemoverDesc: "AI One-Click Transparent BG & Retouch Brush (Single Edit)",
        popupBtnWorkspaceTitle: "Batch Image Crop Workspace",
        popupBtnWorkspaceDesc: "Drag & Drop Bulk Cropping & ZIP Compression",
        popupDividerOr: "OR",
        popupBtnCaptureTitle: "Capture Selected Area on Web Tab",
        popupBtnCaptureDesc: "Capture Area & Open Directly in Remover Studio",
        popupFooterPrivacy: "100% On-Device Privacy - No Server Uploads",
        alertOnlyChromeTab: "Tab capture is only supported in Chrome browser.",
        alertCannotCapture: "Cannot capture screen. Please try on a regular web tab.",
        alertCaptureNotAllowed: "Capture is not available on this page. Please try on a standard web page.",
        alertCaptureError: "Error during tab capture: $1",
        alertFullScreenNotFound: "Captured full screen data not found.",

        // [Workspace / Crop Studio]
        workspacePageTitle: "Oh My Image Manager - Batch Image Crop Workspace",
        navRemoverStudio: "Remover Studio",
        navRemoverStudioTitle: "Go to AI Background Remover Studio",
        headerFileSummary: "Loaded Files: $1",
        sectionPresets: "Crop Presets",
        presetDefaultName: "Default",
        presetDefaultDesc: "Top/Bottom Margin (17.1% ~ 86.2%)",
        presetSlimName: "Slim",
        presetSlimDesc: "Top/Bottom + 3% Side Margin",
        presetFullName: "Full (100%)",
        presetFullDesc: "No Crop (Keep Original)",
        sectionCustomRatio: "Custom Ratio Adjust (%)",
        labelTop: "Top",
        labelBottom: "Bottom",
        labelLeft: "Left",
        labelRight: "Right",
        sectionSaveSettings: "Export Settings",
        labelFormat: "Format:",
        formatJpeg: "JPEG (.jpg)",
        formatPng: "PNG (.png)",
        formatWebp: "WEBP (.webp)",
        labelQuality: "Quality:",
        btnBatchZip: "Batch Crop & Download ZIP",
        btnClearAll: "Clear All",
        dropZoneTitle: "Drag & Drop Image Files Here",
        dropZoneDesc: "Supports Multi-file JPG, PNG, WEBP & E-Book Screenshots",
        btnSelectFiles: "Select Files",
        btnSelectFolder: "Select Folder",
        tabBoxPreview: "Crop Guide Box",
        tabCroppedPreview: "Cropped Output",
        previewInfoText: "Original: $1 x $2 px | Output: $3 x $4 px (Y: $5px ~ $6px)",
        previewInfoEmpty: "Original: - px | Output: - px",
        queueHeaderTitle: "File Queue ($1)",
        btnAddFiles: "Add Files",
        queueRemoveBtnTitle: "Remove from queue",
        progressModalTitle: "Processing Batch Crop...",
        progressProcessing: "Processing $1 / $2 ($3%)",
        progressCurrentFile: "Current file: $1",
        progressZipGenerating: "Generating ZIP archive...",
        progressSubText: "Please wait. The ZIP file will download automatically upon completion.",
        confirmClearAll: "Are you sure you want to remove all images from the list?",
        alertJsZipMissing: "JSZip library is not loaded.",
        alertBatchZipSuccess: "Successfully cropped $1 images and downloaded as ZIP!",

        // [Remover Studio]
        removerPageTitle: "Oh My Image Manager - Smart Background Remover Studio",
        removerSubTitle: "Remover Studio",
        navCropStudio: "Batch Cropper",
        navCropStudioTitle: "Go to Batch Crop Workspace",
        imageDimensionsEmpty: "Please load an image",
        imageDimensionsLoaded: "$1 x $2 px",
        sectionAiRemoval: "AI Smart Removal",
        badgeRecommended: "Best",
        labelAiModel: "AI Model:",
        modelRmbg: "RMBG-1.4 (Ultra HD SOTA)",
        modelModnet: "MODNet (Lightweight Portrait)",
        btnRunAi: "One-Click AI BG Removal",
        aiStatusReady: "Preparing AI Model...",
        sectionSolidColor: "Solid Color / Magic Wand",
        btnEyedropper: "Pick Color",
        btnEyedropperTitle: "Click background color on canvas to remove",
        labelTolerance: "Tolerance",
        labelFeather: "Edge Feather",
        btnApplyColorKey: "Apply Transparency to Selected Color",
        sectionManualBrush: "Manual Retouch Brush",
        brushErase: "Eraser",
        brushRestore: "Restore Pen",
        labelBrushSize: "Brush Size",
        labelBrushHardness: "Edge Softness",
        sectionBgFill: "Background Fill",
        bgTransparent: "Transparent",
        bgTransparentTitle: "Transparent Background",
        bgWhite: "White",
        bgWhiteTitle: "White Background",
        bgBlack: "Black",
        bgBlackTitle: "Black Background",
        bgCustomColor: "Color",
        bgCustomColorTitle: "Pick Custom Color",
        btnUndo: "Undo",
        btnRedo: "Redo",
        btnUndoTitle: "Undo (Ctrl+Z)",
        btnRedoTitle: "Redo (Ctrl+Y)",
        btnDownloadPng: "Download Transparent PNG",
        btnCopyClipboard: "Copy to Clipboard (Ctrl+C)",
        btnResetImage: "Open New Image",
        dropZoneRemoverTitle: "Drag & drop an image here to edit",
        dropZoneRemoverDesc: "Or press Ctrl + V anytime to paste an image from clipboard",
        btnSelectFile: "Select File",
        hintPaste: "Ctrl + V Clipboard Paste",
        hintPrivacy: "100% Local Privacy",
        hintSotaAi: "SOTA AI Removal",
        tabResultView: "Transparent Result",
        tabOriginalView: "Original View",
        tabSplitView: "Split Comparison",
        btnZoomOutTitle: "Zoom Out (Mouse Wheel)",
        btnZoomInTitle: "Zoom In (Mouse Wheel)",
        btnZoomFit: "Fit",
        btnZoomFitTitle: "Fit to Screen",
        btnZoomReset: "1:1",
        btnZoomResetTitle: "100% Original Size",
        scanBadgeText: "Removing background...",
        cursorPosLabel: "Coords: $1",
        cursorPosEmpty: "Coords: -",
        shortcutTipText: "Shortcuts: <b>Space+Drag</b> Pan | <b>Ctrl+Z</b> Undo | <b>Ctrl+C</b> Copy",
        toastWorkerError: "AI Background worker error occurred.",
        toastAiDone: "AI background removal completed!",
        toastClipboardLoaded: "Clipboard image loaded!",
        toastBgSelected: "Background color picked: $1",
        toastPickGuide: "Click background color on canvas to remove",
        toastColorKeyApplied: "Color key transparency applied!",
        toastPngDownloaded: "Transparent PNG downloaded!",
        toastCopied: "Transparent image copied to clipboard!",
        toastCopyFailed: "Failed to copy to clipboard: $1",
        alertAiFailed: "AI background removal failed: $1",
        alertSelectValidImage: "Please select a valid image file.",
        alertLoadImageFailed: "An error occurred while loading the image.",
        alertAiWorkerNotReady: "AI worker is not initialized.",
        alertDownloadFailed: "An error occurred during download.",
        confirmResetImage: "Do you want to close current image and open a new image?",
        modelDownloading: "Downloading AI model ($1%)...",
        modelLoadingStatus: "Loading AI model...",
        modelInferencing: "Running AI inference & generating mask...",

        // [Guide]
        guidePageTitle: "Oh My Image Manager User Guide - Smart Crop & Remover Studio",
        guideMainTitle: "Oh My Image Manager User Guide",
        guideMainDesc: "Smart Batch Image Crop & AI On-Device Background Remover Studio",
        navOverview: "Features",
        navRemover: "AI Remover Studio",
        navCropper: "Batch Cropper",
        navCapture: "Web Tab Capture",
        navShortcuts: "Shortcuts",
        navPrivacy: "Privacy & Security"
      }
    },

    // ==========================================
    // 2. 유효 언어 비동기 조회
    // ==========================================
    async getEffectiveLanguage() {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
          const result = await chrome.storage.sync.get(["uiLanguage"]);
          if (result.uiLanguage && result.uiLanguage !== "auto" && this.dictionaries[result.uiLanguage]) {
            return result.uiLanguage;
          }
        } else if (typeof localStorage !== "undefined") {
          const stored = localStorage.getItem("oh_my_img_lang");
          if (stored && stored !== "auto" && this.dictionaries[stored]) {
            return stored;
          }
        }
      } catch (e) {
        console.warn("[i18n] Storage access failed, using navigator fallback:", e);
      }

      const navLang = (typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage) || "ko").toLowerCase();
      return navLang.startsWith("ko") ? "ko" : "en";
    },

    // ==========================================
    // 3. 문자열 조회 및 파라미터 치환
    // ==========================================
    t(key, params = [], lang = null) {
      const activeLang = lang || (document.documentElement ? document.documentElement.lang : "ko") || "ko";
      const dict = this.dictionaries[activeLang] || this.dictionaries.ko;
      let text = dict[key] || (this.dictionaries.ko && this.dictionaries.ko[key]) || key;

      if (params && params.length > 0) {
        params.forEach((param, index) => {
          text = text.replace(new RegExp(`\\$${index + 1}`, "g"), param);
        });
      }
      return text;
    },

    // ==========================================
    // 4. 선언적 DOM 일괄 적용
    // ==========================================
    applyI18nToDOM(root = document, lang = "ko") {
      if (!root || !root.querySelectorAll) return;

      // 1) 텍스트 내용: data-i18n
      root.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const text = this.t(key, [], lang);
        if (text) {
          if (el.tagName === "TITLE") {
            document.title = text;
          } else {
            el.textContent = text;
          }
        }
      });

      // 2) HTML 내용 (서식이 포함된 경우): data-i18n-html
      root.querySelectorAll("[data-i18n-html]").forEach((el) => {
        const key = el.getAttribute("data-i18n-html");
        const text = this.t(key, [], lang);
        if (text) el.innerHTML = text;
      });

      // 3) 툴팁/제목 속성: data-i18n-title
      root.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        const text = this.t(key, [], lang);
        if (text) el.setAttribute("title", text);
      });

      // 4) 인풋 플레이스홀더: data-i18n-placeholder
      root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        const text = this.t(key, [], lang);
        if (text) el.setAttribute("placeholder", text);
      });

      // 5) 접근성 레이블: data-i18n-aria-label
      root.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
        const key = el.getAttribute("data-i18n-aria-label");
        const text = this.t(key, [], lang);
        if (text) el.setAttribute("aria-label", text);
      });

      // 6) html lang 속성 갱신
      if (document.documentElement) {
        document.documentElement.lang = lang;
      }
    },

    // ==========================================
    // 5. DOM 초기화 진입점
    // ==========================================
    async initDOM(root = document) {
      const lang = await this.getEffectiveLanguage();
      this.applyI18nToDOM(root, lang);
      return lang;
    },

    // ==========================================
    // 6. 언어 셀렉터 초기화 도우미
    // ==========================================
    async setupLanguageSelector(selectElId, onChangeCallback) {
      const selectEl = document.getElementById(selectElId);
      if (!selectEl) return;

      let savedSetting = "auto";
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
          const result = await chrome.storage.sync.get(["uiLanguage"]);
          if (result.uiLanguage) savedSetting = result.uiLanguage;
        } else if (typeof localStorage !== "undefined") {
          savedSetting = localStorage.getItem("oh_my_img_lang") || "auto";
        }
      } catch (e) {
        console.warn("[i18n] Failed to read saved language setting:", e);
      }

      selectEl.value = savedSetting;

      selectEl.addEventListener("change", async (e) => {
        const selected = e.target.value;
        let targetLang = selected;

        if (selected === "auto") {
          const navLang = (navigator.language || "ko").toLowerCase();
          targetLang = navLang.startsWith("ko") ? "ko" : "en";
        }

        this.applyI18nToDOM(document, targetLang);

        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
            await chrome.storage.sync.set({ uiLanguage: selected });
          }
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("oh_my_img_lang", selected);
          }
        } catch (err) {
          console.warn("[i18n] Failed to persist language:", err);
        }

        if (typeof onChangeCallback === "function") {
          onChangeCallback(targetLang, selected);
        }
      });
    }
  };

  // 전역 할당
  global.I18N = I18N;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
