# 스토어 등록 정보 (Store Listing Information)

이 문서는 Chrome 웹 스토어, Edge 추가 기능, 웨일 스토어 등 확장 프로그램 스토어 등록 시 바로 복사하여 사용할 수 있는 텍스트 모음입니다.

---

## 1. 기본 메타데이터

| 항목 | 내용 |
| :--- | :--- |
| **패키지 제목** | Oh My Image Manager - 스마트 이미지 크롭, 배경 제거(누끼) & 문서 스캐너 스튜디오 |
| **영문 제목 (선택)** | Oh My Image Manager - Smart Batch Crop, AI BG Remover & Book Scanner |
| **패키지 요약 (Short Description)** | 대용량 이미지 일괄 크롭 & ZIP 압축, 온디바이스 AI 누끼 따기, 굴곡 평탄화 도서·문서 스캔 스튜디오를 지원하는 올인원 이미지 매니저입니다. |
| **카테고리** | **생산성 (Productivity)** *(권장)* 또는 **사진 (Photos)** |
| **기본 언어** | **한국어 (Korean)** |
| **지원 언어** | **한국어 (Korean), 영어 (English)** (브라우저 언어 자동 감지) |

---

## 2. 전용 목적 (Single Purpose Description - 개인정보 보호 탭)

> **전용 목적 설명\*** (0/1,000자) 입력란에 아래 내용을 붙여넣으세요.

```text
이 확장 프로그램의 전용 목적은 사용자가 외부 서버 전송 없이 브라우저 로컬 환경에서 대량의 이미지를 손쉽게 일괄 크롭 및 압축 다운로드하고, 온디바이스 AI를 통한 배경 제거(누끼 따기) 및 스마트폰으로 촬영한 책/문서 사진의 굴곡 평탄화와 고화질 스캔본(PDF/ZIP) 변환을 제공하는 올인원 이미지 편집 유틸리티입니다.
```

*(영문 입력 시)*
```text
The single purpose of this extension is to provide a local, privacy-focused image editing utility that allows users to batch crop and compress images, remove backgrounds using on-device AI, and transform smartphone-captured book and document photos into flat, high-definition digital scans (PDF/ZIP) without uploading any data to external servers.
```

---

## 3. 권한 요청 이유 (Permission Justifications)

### ① `activeTab` 사용 근거
```text
사용자가 확장 프로그램 팝업에서 [현재 웹 탭 캡처 & 자동 크롭] 기능을 직접 실행했을 때, 현재 열려 있는 활성 탭의 화면을 캡처하기 위해 사용합니다.
```

### ② `downloads` 사용 근거
```text
일괄 크롭된 이미지들이 담긴 ZIP 압축 파일, AI 배경 제거(누끼)가 완료된 투명 PNG, JPEG, WebP, GIF 이미지 파일 및 도서·문서 스캔 스튜디오에서 생성된 고화질 A4 규격 통합 PDF 문서를 사용자의 로컬 컴퓨터에 안전하게 다운로드하여 저장하기 위해 사용합니다.
```

### ③ `storage` 사용 근거
```text
사용자가 설정한 크롭 비율(상/하/좌/우 마진), 기본 출력 포맷(PNG/JPG/WebP), 압축 품질, 다국어 언어 설정(한국어/영어/자동) 및 다크/라이트 테마 설정을 브라우저 로컬에 저장하여 유지하기 위해 사용합니다.
```

### ④ `clipboardWrite` 사용 근거
```text
배경 제거 스튜디오에서 누끼 작업이 완료된 투명 이미지를 클립보드로 즉시 복사하여, 사용자가 피그마(Figma), 포토샵, PPT 등의 프로그램에 Ctrl+V로 바로 붙여넣을 수 있도록 지원하기 위해 사용합니다.
```

### ⑤ `scripting` 사용 근거
```text
현재 활성 탭 캡처 및 탭 환경과의 안전한 스크립트 상호작용 처리를 위해 사용합니다.
```

---

## 4. 원격 코드 사용 여부 (Remote Code)

> ⚠️ **선택 가이드**: **`아니요, 원격 코드 권한을 사용하고 있지 않습니다.`** 선택 권장  
> (확장 프로그램 내의 모든 JS 라이브러리 및 Transformers.js/WASM 바이너리가 패키지 내 `lib/` 폴더에 100% 로컬 포함되어 있으므로 원격 코드를 사용하지 않습니다.)

*(만약 '예'를 선택하고 근거 작성을 요구받을 경우)*
```text
확장 프로그램 패키지 내 로컬 번들로 포함된 WebAssembly 및 Transformers.js 추론 엔진 구동을 위한 로컬 스크립트 실행 외에 외부 서버의 원격 코드를 동적으로 다운로드하거나 실행하지 않습니다.
```

---

## 5. 개인정보처리방침 URL (Privacy Policy URL)

> **개인정보처리방침 URL\*** 입력란에 아래 GitHub 문서 URL을 입력하세요.

```text
https://github.com/postforty/oh-my-img-manager/blob/main/PRIVACY.md
```

---

## 6. 상세 설명 (Description - 한국어)

> 스토어의 **설명(Description)** 입력창에 아래 내용을 그대로 복사하여 붙여넣으세요.

```text
🚀 Oh My Image Manager - 스마트 이미지 일괄 크롭, 온디바이스 AI 누끼 & 문서 스캐너 스튜디오

반복되는 이미지 편집과 서류 정리 작업에 지치셨나요? 
Oh My Image Manager는 대량 이미지 일괄 크롭/압축, 최신 온디바이스 AI 원클릭 배경 제거(누끼 따기), 그리고 스마트폰 촬영 도서·문서 사진을 반듯한 평판 스캔본으로 변환해 주는 올인원 스마트 이미지 에디터 확장 프로그램입니다.

서버 전송 없이 브라우저 로컬에서 100% 안전하고 빠르게 작동합니다!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 핵심 주요 기능 (Key Features)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ 스마트 배경 제거 (AI 누끼 따기) & 그래픽 주석 스튜디오
- 🤖 온디바이스 AI 누끼: 고성능 AI 모델(RMBG-1.4, MODNet)을 통해 인물, 상품, 사물 등의 배경을 원클릭으로 정밀 분리합니다.
- ✂️ 잘라내기 & 투명 여백 트리밍: 피사체 주변의 불필요한 투명 여백을 원클릭으로 자동 자르거나, W/H 픽셀 직접 입력, 종횡비 고정 프리셋(1:1, 4:3, 16:9), 8방향 핸들 드래그로 원하는 영역을 정밀하게 수동 크롭합니다.
- 📐 고품질 이미지 리사이즈: 픽셀 단위 직접 입력, 가로세로 비율 유지 고정(🔒), 100%/75%/50%/25% 프리셋 칩 및 부드러운 단계적 다운스케일링을 제공합니다.
- 🎨 정밀 스포이드 & 단색 지우개: 클래식 포토샵 피펫 커서로 특정 배경색을 콕 찍어 허용 오차/페더링과 함께 즉시 투명화합니다.
- 🖌️ 수동 리터칭 브러시: 지우개(Erase) 및 복원 펜(Restore) 브러시로 미세한 경계면을 정밀하게 다듬을 수 있습니다.
- ✏️ 벡터 도형 및 날렵한 쉐브론 화살표: 직사각형, 원/타원, 직선, 예리한 정밀 화살표 개체를 자유롭게 추가하고 회전/크기를 제어합니다.
- 📝 프로페셔널 3단 텍스트 인스펙터: 글(채우기), 글자 안쪽을 파먹지 않는 아우터 스트로크 외곽선, 입체 드롭 섀도우 제어 및 내 PC 설치 폰트 불러오기를 지원합니다.
- ↩️ 손실 없는 실행 취소: 크기 변경 및 크롭 후에도 Ctrl+Z로 해상도와 원본 캔버스 데이터를 손실 없이 온전히 되돌립니다.
- 📋 원클릭 클립보드 연동: Ctrl+V로 이미지를 바로 불러오고, 결과물을 Ctrl+C(복사)하여 외부 문서나 디자인 도구에 즉시 붙여넣을 수 있습니다.
- 🔀 Split 비교 뷰: 원본과 누끼 결과물을 슬라이더로 좌우 비교하며 검토할 수 있습니다.
- 🎨 배경 채우기: 투명 배경 외에도 화이트, 블랙, 커스텀 단색 배경을 손쉽게 채워 넣을 수 있습니다.

2️⃣ 스마트 도서 & 문서 스캔 스튜디오 (New!)
- 📖 자가 적응형 굴곡 평탄화 (Dewarping): 두꺼운 책을 펼쳤을 때 생기는 언덕형·처짐형 곡면과 책등 말림을 24구간 다중 샘플링 및 Catmull-Rom 스플라인 곡선으로 자동 분석하여 반듯하게 펴줍니다.
- 🖨️ 스캔 룩 3대 필터 모드: 선명한 흑백(B&W), 그레이스케일, 컬러 스캔 모드를 지원하며, 3×3 미디언 필터로 미세 점 노이즈를 제거합니다.
- 💡 책등 그림자 자동 제거: 책 안쪽 접힘부에 생기는 짙은 검은색 음영 띠를 감지하여 자연스러운 흰색 바탕으로 자동 롤오프합니다.
- ✂️ 스마트 자동 영역 감지 & 60fps 무지연 가이드: 본문 컨텐츠 영역을 원클릭으로 자동 인식하며, 렉 없는 실시간 60fps 가이드 박스로 사변 영역을 매끄럽게 조절합니다.
- 📖 펼친 양면 자동 2장 분할 (Auto Split Spread): 가로형 2페이지 책 사진을 좌/우 1장씩 자동 2장으로 분할하여 일괄 등록합니다.
- 📑 A4 규격 다중 페이지 PDF & 고화질 ZIP 내보내기: 스캔된 전체 페이지를 하나의 깔끔한 A4 PDF 파일로 묶거나 고화질 이미지 ZIP으로 일괄 다운로드합니다.

3️⃣ 대용량 이미지 일괄 크롭 & ZIP 일괄 다운로드
- 📁 수십~수백 장의 이미지를 드래그 앤 드롭 또는 폴더 선택으로 한 번에 불러옵니다.
- ⚡ 지정한 비율(상/하/좌/우 정밀 조정 및 프리셋)로 모든 이미지를 일괄 크롭합니다.
- 📦 처리된 모든 결과물을 단 몇 초 만에 ZIP 압축 파일로 즉시 다운로드합니다.
- 👁️ 실시간 듀얼 프리뷰: 자를 영역 가이드와 실제 잘려나간 결과물을 탭으로 즉시 확인 가능합니다.

4️⃣ 원클릭 현재 웹 탭 캡처 & 크롭
- 브라우징 중 팝업 메뉴에서 클릭 한 번으로 현재 탭 화면을 캡처하고, 설정한 비율로 자동 크롭하여 저장합니다.

5️⃣ 다양한 포맷 & 무손실 품질 설정
- PNG (투명 알파 채널 지원), WebP (초경량 투명 포맷), JPG (품질 조절 가능), GIF (256색 팔레트), PDF (A4 표준 다중 페이지 스캔 문서) 지원

6️⃣ 다국어(한국어/영어) & 다크/라이트 모드 지원
- 한국어 및 영어를 기본 지원하며, 사용자 취향에 맞춘 다크/라이트 테마를 제공합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 100% 로컬 처리 & 개인정보 보호
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 모든 이미지 처리와 AI 모델 연산은 외부 서버로 전송되지 않고 사용자의 로컬 브라우저 내부에서만 동작합니다.
- 이미지가 외부 서버로 절대 전송되지 않으므로, 보안 및 개인정보 유출 걱정 없이 안심하고 사용하실 수 있습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 간단 사용 방법 (How to Use)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 브라우저 우측 상단 툴바에서 확장 프로그램 아이콘을 클릭합니다.
2. [배경 제거 스튜디오], [도서·문서 스캔 스튜디오], [일괄 크롭 워크스페이스] 중 필요한 도구를 선택합니다.
3. 이미지를 붙여넣거나(Ctrl+V) 파일/폴더를 드래그 앤 드롭합니다.
4. 원하는 편집(AI 누끼, 굴곡 평탄화 스캔, 크롭, 리사이즈)을 진행한 후 PDF/ZIP/이미지로 다운로드하거나 클립보드에 복사합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 문의 및 지원 (Support)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 버그 제보 및 기능 제안: https://github.com/postforty/oh-my-img-manager/issues
```

---

## 7. 영문 설명 (Global / English Description)

```text
🚀 Oh My Image Manager - Smart Batch Image Cropper, AI Background Remover & Book Scanner

Streamline your image workflow with Oh My Image Manager!
A powerful, privacy-first Chrome Extension that lets you batch crop hundreds of images into a ZIP file in seconds, remove backgrounds using on-device AI, and turn smartphone-captured book and document photos into flat, high-definition digital scans.

100% Local processing inside your browser — No server uploads required!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Key Features
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ Smart AI Background Remover & Graphic Annotation Studio
- 🤖 On-Device AI: Remove backgrounds from portraits, products, and objects with a single click using fast on-device AI models.
- ✂️ Dedicated Crop & Transparent Margin Trim: Automatically crop excess transparent margins around subjects, or manually crop custom regions with direct W/H pixel inputs, strict aspect ratio presets (1:1, 4:3, 16:9), and 8-direction interactive resize handles.
- 📐 High-Quality Image Resizing: Direct pixel inputs (W/H), Aspect Ratio Lock (🔒), one-click preset scale chips (100%, 75%, 50%, 25%), and anti-aliasing step-down scaling.
- 🎨 Color Key & Pipette: Pick and erase specific background colors with an authentic Photoshop-style pipette cursor and adjustable tolerance/feathering.
- 🖌️ Retouching Brush: Fine-tune edges with precision Erase and Restore brushes.
- ✏️ Vector Shapes & Sharp Chevron Arrows: Add rectangles (rounded corners), circles/ellipses, straight lines, and sharp graphic arrows with interactive rotation and handles.
- 📝 Professional 3-Tier Text Inspector: Text (Fill), outer-stroke outlines without shrinking glyphs, drop shadow controls, and local PC font scanner (`queryLocalFonts`).
- ↩️ Lossless Canvas History: Full Ctrl+Z/Ctrl+Y undo/redo support keeping original restore data and split views in sync.
- 📋 Seamless Clipboard Workflow: Paste images with Ctrl+V and copy results with Ctrl+C directly into other documents and design tools.
- 🔀 Split View: Compare original and cutout images side-by-side with an interactive slider.
- 🎨 Background Fill: Easily replace transparent backgrounds with solid white, black, or custom colors.

2️⃣ Smart Document & Book Scan Studio (New!)
- 📖 Self-Adaptive Curve Dewarping: Intelligently estimates and flattens thick book curvature, curled pages, and spine distortions using 24-section midline sampling and Catmull-Rom spline curves.
- 🖨️ 3 Professional Scan Look Filters: Clear Black & White (B&W) with 3×3 median filter speckle cleanup, Grayscale for pencil/technical diagrams, and Color Scan for illustrations.
- 💡 Spine Shadow Whitening: Detects deep spine binding shadow bands and blends them seamlessly into paper white.
- ✂️ Smart Auto Content Crop & Zero-Lag 60fps Guide: Snips margins automatically, with instant 60fps live guide boxes for manual fine-tuning without debounce lag.
- 📖 Auto Split Spread: Automatically splits landscape 2-page book spread photos into individual left and right pages upon upload.
- 📑 A4 Multi-Page PDF & High-Res ZIP Export: Compile all scanned pages into a single multi-page A4 PDF or download high-resolution individual images packaged in a ZIP archive.

3️⃣ High-Volume Batch Crop & ZIP Export
- 📁 Drag and drop dozens or hundreds of images at once, or load an entire folder.
- ⚡ Crop all images consistently using precise presets and margin controls.
- 📦 Export all cropped images into a single ZIP archive in seconds.
- 👁️ Real-time Dual Preview: Visual bounds overlay and final output rendering.

4️⃣ One-Click Web Tab Capture & Crop
- Instantly capture your current browser tab, apply preset crop bounds, and download.

5️⃣ Multi-Format Support & Custom Quality
- Export to PNG (transparent), WebP (efficient transparency), JPG (custom quality), GIF (256-color palette), and PDF (standard A4 multi-page document).

6️⃣ Multi-Language (Korean/English) & Dark/Light Mode
- Built-in multi-language support (Auto / Korean / English) with sleek Dark & Light themes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 100% Privacy & Local Computation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All image processing and AI computations run entirely in your local browser. Your images are never uploaded to any external server.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 How to Use
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Click the extension icon in your browser toolbar.
2. Select your tool: [Background Remover Studio], [Document & Book Scanner], or [Batch Crop Workspace].
3. Paste an image (Ctrl+V) or drag and drop files/folders.
4. Apply your edits (AI background removal, curve-flattening scan, crop, resize) and export to PDF, ZIP, image, or clipboard.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 Support & Feedback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Bug reports and feature requests: https://github.com/postforty/oh-my-img-manager/issues
```

