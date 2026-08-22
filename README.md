# Oh My Image Manager - Smart Image Cropper & AI Background Remover Studio

> **A powerful, privacy-first Manifest V3 Chrome Extension for high-volume batch image cropping, ZIP archiving, and on-device AI background removal.**

[한국어 설명서 (Korean Documentation)](README.ko.md)

![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?logo=googlechrome&logoColor=white)
![AI On-Device](https://img.shields.io/badge/AI-Transformers.js%20%28Apache%202.0%29-8b5cf6?logo=huggingface&logoColor=white)
![Canvas API](https://img.shields.io/badge/HTML5-Canvas%20Engine-E34F26?logo=html5&logoColor=white)
![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-green)
![Design System](https://img.shields.io/badge/UI-Sky%20Blue%20%26%20Grass%20Green-1089C7)
![i18n](https://img.shields.io/badge/i18n-Korean%20%7C%20English-brightgreen)

---

## 🚀 Key Features

### 1. Smart Background Remover Studio
- **On-Device SOTA AI Cutout**: Powered by state-of-the-art AI segmentation models (RMBG-1.4 / MODNet), cleanly separating subjects (people, products, animals) from backgrounds with one click — 100% locally in your browser. (WebGPU hardware-accelerated with automatic WASM fallback).
- **Color Key / Eyedropper Tool**: Pick any solid background color and adjust Tolerance and Edge Feathering to make it transparent instantly.
- **Manual Retouching Brushes**: Fine-tune delicate details using precision Eraser and Restore brushes.
- **Seamless Clipboard Integration**: Paste images directly with `Ctrl+V` and copy cutouts with `Ctrl+C` for immediate use in Figma, Photoshop, PowerPoint, or messaging apps.
- **Side-by-Side Split View**: Compare original and cutout results side-by-side with an interactive drag slider.
- **Background Fill**: Replace transparent cutouts with solid White, Black, or custom colors easily.

### 2. High-Volume Batch Image Cropper & ZIP Export
- **Drag & Drop** dozens or hundreds of images at once, or load an entire folder.
- Batch crop all images uniformly with preset ratios (eBook margins, 1:1, 4:3, 16:9) or custom margins (Top/Bottom/Left/Right).
- Package and download all processed images into a **ZIP archive** in seconds with an intuitive real-time progress bar.

### 3. Real-Time Dual Preview Engine
- **Crop Guide Box**: Visually inspect the crop region with an overlay box and darkened margins.
- **Cropped Output Tab**: Instant rendering of the final cropped image for fast pre-validation.

### 4. One-Click Web Tab Capture & Auto-Crop
- Capture your active browser tab from the popup menu, apply preset crop bounds automatically, and download instantly.

### 5. Multi-Language (i18n) & Modern Dark/Light Themes
- Full internationalization support for **English** and **Korean** across all screens (Popup, Workspace, Remover, Guide).
- Automatic browser language detection with a real-time language selector dropdown.
- Sleek Dark and Light themes with persistent settings.

### 6. 100% Local & Privacy-Focused
- All AI inferences (Transformers.js / WebAssembly / WebGPU) and HTML5 Canvas operations execute strictly client-side.
- Zero server uploads — complete confidentiality for personal and business images, even offline.

---

## 🎨 Design System & UI/UX

Oh My Image Manager is crafted with a thoughtful, user-friendly design system:
- **Color Palette**: `Sky Blue (#1089C7)` as the primary action color, paired with `Grass Green (#78A95A)` for success states and secondary actions.
- **Typography**: Clean, highly legible `Inter` font family.
- **Depth & Elevation**: Polished box shadows and elevation tokens to highlight image previews and interactive workspaces.
- *For detailed design guidelines, please refer to [DESIGN.md](DESIGN.md).*

---

## ⚙️ Tech Stack

- **Platform**: Chrome Extension (Manifest V3)
- **AI Engine**: [Transformers.js](https://huggingface.co/docs/transformers.js) (ONNX Runtime Web, WebAssembly SIMD, WebGPU)
- **Graphics Engine**: HTML5 Canvas 2D API, ImageData Pixel Manipulation, OffscreenCanvas
- **Internationalization (i18n)**: Zero-Dependency 2-Tier i18n Engine (Chrome Storage Sync & Declarative DOM Binding)
- **Styling**: Pure Modern CSS3 (CSS Variables, Flexbox/Grid, Dark/Light Themes)
- **Library**: [JSZip](https://stuk.github.io/jszip/) (Client-side ZIP packaging)

---

## 📂 Project Structure

```text
oh-my-img-manager/
├── manifest.json            # Chrome Manifest V3 configuration
├── _locales/                # Chrome Web Store & extension metadata dictionaries (ko, en)
├── i18n.js                  # Zero-dependency 2-Tier i18n engine
├── icons/                   # Extension icons
├── lib/                     # Client-side libraries & AI model bundles
├── popup/                   # Toolbar popup UI & tab capture routing
├── workspace/               # Batch crop workspace & Canvas engine
├── remover/                 # AI Background Remover studio & Web Worker
├── guide.html               # All-in-one user guide (EN/KO supported)
├── DESIGN.md                # Design system specification
├── I18N_GUIDE.md            # Internationalization (i18n) standard guide
├── STORE_LISTING.md         # Store listing metadata & descriptions
├── PRIVACY.md               # Privacy policy
├── README.md                # English Documentation
└── README.ko.md             # Korean Documentation
```

---

## 📦 Installation

Install in any Chromium-based browser (Chrome, Edge, Brave, Whale) in under a minute:

1. Open your browser and navigate to the Extensions management page:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Whale**: `whale://extensions`
2. Enable **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `oh-my-img-manager` project folder.
5. **Oh My Image Manager** is now installed and ready to use!

---

## 💡 How to Use

### AI Background Remover Studio
1. Click the extension toolbar icon and open the **AI Remover Studio**.
2. Drag and drop an image or paste with `Ctrl + V`.
3. Click **One-Click AI BG Removal** to automatically isolate the subject.
4. Optionally use the **Color Picker** or **Manual Retouch Brushes (Erase / Restore)** to refine edges.
5. Click **Download Transparent PNG** or **Copy to Clipboard (Ctrl+C)** to use your result.

### High-Volume Batch Image Cropper
1. Click the extension toolbar icon and open the **Batch Crop Workspace**.
2. Drag and drop multiple image files or a folder into the drop zone.
3. Choose a crop preset or fine-tune margin sliders on the left panel.
4. Click **Batch Crop & Download ZIP** to export all cropped images in a compressed archive.

---

## 📜 Version History

### 🚀 v1.1 (`2026-08-22`)
**Multi-Language (i18n) Support & Enhanced AI/UX**
- **Zero-Dependency 2-Tier i18n Architecture**:
  - Full support for English (`en`) and Korean (`ko`) with automatic language detection (`Auto`).
  - Real-time language switching across Popup, Workspace, Remover, and Guide with `chrome.storage.sync` persistence.
  - Localized Chrome Web Store metadata (`_locales/`).
- **Visual AI Processing Feedback & Safety Controls**:
  - Real-time scanline effects during AI inference to visualize processing state.
  - Interaction lock to prevent duplicate clicks and race conditions.
- **Enhanced AI Model Loading Stability**:
  - Resolved potential infinite loading stalls and improved status/error feedback.
- **UI/UX Refinements & Responsive Layout Improvements**:
  - Standardized icon and text alignment across Background Fill buttons.
  - Prevented text overflow and improved button hover contrast in the User Guide header.
  - Enhanced 100% local privacy notices and visual elements.

---

### 🎉 v1.0 (`2026-08-20`)
**Official Initial Release of Oh My Image Manager**
- **Smart Background Remover Studio**:
  - On-device AI (WebGPU/WASM) single-click subject/background separation.
  - Solid color eyedropper tool and manual retouching brush (Erase/Restore).
  - Split comparison view, solid background fill, and clipboard shortcut integration.
- **High-Volume Batch Cropper Workspace**:
  - Multi-image drag-and-drop batch registration with customizable ratios and margins.
  - High-speed ZIP packaging and download for dozens to hundreds of files.
- **Web Tab Capture**:
  - Instant active tab screen capture with automated preset crop and export.
- **Modern UI & Guide**:
  - Dark/Light theme support and comprehensive step-by-step user documentation.

---

## 📝 License

[MIT License](https://github.com/postforty/oh-my-img-manager/blob/main/LICENSE) © [postforty](https://github.com/postforty)
