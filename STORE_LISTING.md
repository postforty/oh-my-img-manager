# 스토어 등록 정보 (Store Listing Information)

이 문서는 Chrome 웹 스토어, Edge 추가 기능, 웨일 스토어 등 확장 프로그램 스토어 등록 시 바로 복사하여 사용할 수 있는 텍스트 모음입니다.

---

## 1. 기본 메타데이터

| 항목 | 내용 |
| :--- | :--- |
| **패키지 제목** | Oh My Image Manager - 스마트 이미지 크롭 & 배경 제거(누끼) 스튜디오 |
| **영문 제목 (선택)** | Oh My Image Manager - Smart Batch Crop & AI Background Remover |
| **패키지 요약 (Short Description)** | 대용량 이미지 일괄 크롭 & ZIP 압축 및 온디바이스 AI 기반 실시간 배경 제거(누끼 따기)를 지원하는 스마트 이미지 매니저입니다. |
| **카테고리** | **생산성 (Productivity)** *(권장)* 또는 **사진 (Photos)** |
| **기본 언어** | **한국어 (Korean)** |
| **지원 언어** | **한국어 (Korean), 영어 (English)** (브라우저 언어 자동 감지) |

---

## 2. 전용 목적 (Single Purpose Description - 개인정보 보호 탭)

> **전용 목적 설명\*** (0/1,000자) 입력란에 아래 내용을 붙여넣으세요.

```text
이 확장 프로그램의 전용 목적은 사용자가 외부 서버 전송 없이 브라우저 로컬 환경에서 대량의 이미지를 손쉽게 일괄 크롭 및 압축 다운로드하고, 온디바이스 AI 및 캔버스 엔진을 통해 빠르고 안전하게 이미지 배경을 제거(누끼 따기)할 수 있는 이미지 편집 유틸리티를 제공하는 것입니다.
```

*(영문 입력 시)*
```text
The single purpose of this extension is to provide a local, privacy-focused image editing utility that allows users to batch crop and compress images, as well as remove image backgrounds using on-device AI and canvas tools without uploading any data to external servers.
```

---

## 3. 권한 요청 이유 (Permission Justifications)

### ① `activeTab` 사용 근거
```text
사용자가 확장 프로그램 팝업에서 [현재 웹 탭 캡처 & 자동 크롭] 기능을 직접 실행했을 때, 현재 열려 있는 활성 탭의 화면을 캡처하기 위해 사용합니다.
```

### ② `downloads` 사용 근거
```text
일괄 크롭된 이미지들이 담긴 ZIP 압축 파일 및 AI 배경 제거(누끼)가 완료된 투명 PNG, JPEG, WebP 이미지 파일을 사용자의 로컬 컴퓨터에 안전하게 다운로드하여 저장하기 위해 사용합니다.
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
🚀 Oh My Image Manager - 스마트 이미지 일괄 크롭 & 온디바이스 AI 누끼 따기 스튜디오

반복되는 이미지 편집 작업에 지치셨나요? 
Oh My Image Manager는 대량의 이미지를 초고속으로 일괄 크롭/압축하고, 최신 온디바이스 AI로 원클릭 배경 제거(누끼 따기)를 지원하는 올인원 스마트 이미지 에디터 확장 프로그램입니다.

서버 전송 없이 브라우저 로컬에서 100% 안전하고 빠르게 작동합니다!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 핵심 주요 기능 (Key Features)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ 스마트 배경 제거 (AI 누끼 따기) 스튜디오
- 🤖 온디바이스 SOTA AI 누끼: 최신 AI 모델(RMBG-1.4, MODNet)을 통해 인물, 상품, 사물 등의 배경을 원클릭으로 정밀 분리합니다. (WebGPU 고속 가속 및 WASM 자동 지원)
- 🎨 스포이드/단색 지우개: 단색 배경이나 스포이드로 지정한 색상을 허용 오차(Tolerance) 및 경계 페더링(Feather)과 함께 즉시 투명화합니다.
- 🖌️ 수동 리터칭 브러시: 지우개(Erase) 및 복원 펜(Restore) 브러시로 미세한 경계면을 정밀하게 다듬을 수 있습니다.
- 📋 원클릭 클립보드 연동: Ctrl+V로 이미지를 바로 불러오고, 결과물을 Ctrl+C(복사)하여 PPT, 포토샵, 피그마에 즉시 붙여넣으세요.
- 🔀 Split 비교 뷰: 원본과 누끼 결과물을 슬라이더로 좌우 비교하며 검토할 수 있습니다.
- 🎨 배경 채우기: 투명 배경 외에도 화이트, 블랙, 커스텀 단색 배경을 손쉽게 채워 넣을 수 있습니다.

2️⃣ 대용량 이미지 일괄 크롭 & ZIP 일괄 다운로드
- 📁 수십~수백 장의 이미지를 드래그 앤 드롭으로 한 번에 불러옵니다.
- ⚡ 지정한 비율(상/하/좌/우 정밀 조정 및 프리셋)로 모든 이미지를 일괄 크롭합니다.
- 📦 처리된 모든 결과물을 단 몇 초 만에 ZIP 압축 파일로 즉시 다운로드합니다.
- 👁️ 실시간 듀얼 프리뷰: 자를 영역 가이드와 실제 잘려나간 결과물을 탭으로 즉시 확인 가능합니다.

3️⃣ 원클릭 현재 웹 탭 캡처 & 크롭
- 브라우징 중 팝업 메뉴에서 클릭 한 번으로 현재 탭 화면을 캡처하고, 설정한 비율로 자동 크롭하여 저장합니다.

4️⃣ 다양한 포맷 & 무손실 품질 설정
- PNG (투명 알파 채널 지원), JPG (품질 조절 가능), WebP(초경량 최신 포맷) 지원

5️⃣ 다국어(한국어/영어) & 다크/라이트 모드 지원
- 한국어 및 영어를 기본 지원하며, 사용자 취향에 맞춘 다크/라이트 테마를 제공합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 100% 로컬 처리 & 완벽한 프라이버시 보호
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 업로드한 이미지와 AI 연산(Transformers.js / WebAssembly / WebGPU)은 사용자의 PC(브라우저) 내부에서만 동작합니다.
- 이미지가 외부 서버로 절대 전송되지 않으므로, 보안 및 개인정보 유출 걱정 없이 안심하고 사용하실 수 있습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 이런 분들께 강력 추천합니다!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 이커머스/스마트스토어 셀러 (상품 썸네일/상세페이지 대량 편집)
- 디자이너 & 마케터 (빠른 누끼 따기 및 클립보드 복사 활용)
- 블로거 & 콘텐츠 크리에이터 (스크린샷 일괄 크롭 및 정리)
- 업무용 보고서 및 PPT 제작자
```

---

## 7. 영문 설명 (Global / English Description)

```text
🚀 Oh My Image Manager - Smart Batch Image Cropper & AI Background Remover Studio

Streamline your image workflow with Oh My Image Manager!
A powerful, privacy-first Chrome Extension that lets you batch crop hundreds of images into a ZIP file in seconds, and remove backgrounds using on-device AI.

100% Local processing inside your browser — No server uploads required!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Key Features
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ Smart AI Background Remover Studio
- 🤖 On-Device SOTA AI: Remove backgrounds from portraits, products, and animals with a single click using RMBG-1.4 & MODNet models (WebGPU accelerated with WASM fallback).
- 🎨 Color Picker / Tolerance: Cleanly remove solid background colors with adjustable feathering.
- 🖌️ Retouching Brush: Fine-tune edges with precision Erase and Restore brushes.
- 📋 Seamless Clipboard Workflow: Paste images with Ctrl+V and copy results with Ctrl+C directly into Figma, Photoshop, or PPT.
- 🔀 Split View: Compare original and cutout images side-by-side with an interactive slider.
- 🎨 Background Fill: Easily replace transparent backgrounds with solid white, black, or custom colors.

2️⃣ High-Volume Batch Crop & ZIP Export
- 📁 Drag and drop dozens or hundreds of images at once.
- ⚡ Crop all images consistently using precise presets and margin controls.
- 📦 Export all cropped images into a single ZIP archive in seconds.
- 👁️ Real-time Dual Preview: Visual bounds overlay and final output rendering.

3️⃣ One-Click Web Tab Capture & Crop
- Instantly capture your current browser tab, apply preset crop bounds, and download.

4️⃣ Multi-Format Support & Custom Quality
- Export to PNG (transparent), JPG (custom quality), and modern WebP.

5️⃣ Multi-Language (Korean/English) & Dark/Light Mode
- Built-in multi-language support (Auto / Korean / English) with sleek Dark & Light themes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 100% Privacy & Local Computation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All AI models (Transformers.js / WebAssembly / WebGPU) and Canvas computations run entirely in your local browser. Your images never leave your machine.
```

