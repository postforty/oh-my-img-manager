# 🖼️ Oh My Img - 스마트 이미지 크롭 & 배경 제거(누끼) 스튜디오

> **대용량 이미지 일괄 크롭 & ZIP 다운로드부터, 온디바이스 AI 기반 원클릭 배경 제거(누끼 따기)까지 지원하는 강력한 Manifest V3 크롬 확장 프로그램**

![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?logo=googlechrome&logoColor=white)
![AI On-Device](https://img.shields.io/badge/AI-Transformers.js%20%28Apache%202.0%29-8b5cf6?logo=huggingface&logoColor=white)
![Canvas API](https://img.shields.io/badge/HTML5-Canvas%20Engine-E34F26?logo=html5&logoColor=white)
![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-green)
![Dark Mode](https://img.shields.io/badge/UI-Dark%20%2F%20Light%20Theme-purple)

---

## 🌟 주요 기능 (Key Features)

### 1. ✨ 스마트 배경 제거 (누끼) 스튜디오 (신규)
- **🤖 온디바이스 AI 스마트 누끼**: 최신 SOTA 세그멘테이션 모델(RMBG-1.4 / MODNet)을 탑재하여 사람, 사물, 동물의 배경을 원클릭으로 100% 로컬 분리합니다.
- **⚡ 단색 / 스포이드 지우개**: 스포이드로 배경색을 클릭하고 허용 오차(Tolerance)와 경계 페더링(Feather)을 조절하여 흰색/단색 배경을 즉시 투명화합니다.
- **🖌️ 수동 리터칭 브러시**: 지우개(Erase) 및 복원 펜(Restore)을 제공하여 덜 지워진 부분을 섬세하게 다듬고 실수한 영역을 완벽하게 되살릴 수 있습니다.
- **📋 Ctrl + V 클립보드 붙여넣기 & 원클릭 복사**: 웹 서핑 중 복사한 이미지를 즉시 붙여넣어 누끼를 따고, 결과물을 클립보드(`Ctrl+C`)로 즉시 복사하여 PPT/포토샵/피그마에 바로 붙여넣을 수 있습니다.
- **🔍 좌우 분할(Split) 비교 뷰**: 원본과 투명 결과물을 드래그 슬라이더로 실시간 비교 검토할 수 있습니다.

### 2. ⚡ 대용량 이미지 일괄 크롭 & ZIP 내보내기
- 수십 ~ 수백 장의 이미지 파일을 화면에 **드래그 앤 드롭**하거나 폴더 단위로 한 번에 불러올 수 있습니다.
- 모든 이미지를 동일한 비율 또는 사용자 정의 영역으로 일괄 처리하고, **ZIP 압축 파일**로 수 초 만에 다운로드합니다.
- 대용량 처리 시 실시간 프로그레스 바(진행률)가 제공됩니다.

### 3. 🎯 실시간 듀얼 프리뷰 (Dual Preview Engine)
- **영역 표시 가이드**: 자를 영역을 빨간색 박스와 음영(Dimmed) 오버레이로 직관적으로 확인
- **크롭 결과물 탭**: 실제 잘려나간 결과물 이미지를 즉각적으로 렌더링하여 사전 검토

### 4. 🎛️ 스마트 프리셋 & 정밀 비율 조절 (%)
- **프리셋**: 기본(여백 제거), 슬림, 원본 유지(100%) 등 원클릭 설정
- **슬라이더**: 상단 / 하단 / 좌측 / 우측 비율(0.1% 단위)을 마우스로 부드럽게 미세 조정

### 5. 📸 현재 웹 탭 실시간 캡처 & 자동 크롭
- 브라우징 중 팝업 메뉴에서 **[현재 웹 탭 캡처 & 자동 크롭]** 버튼을 클릭하면, 현재 열려 있는 화면을 캡처하여 지정 비율로 자동 크롭 후 즉시 저장합니다.

### 6. 💾 다양한 포맷 & 품질 설정
- **PNG (.png)**: 무손실 원본 및 투명 알파 채널 지원
- **JPEG (.jpg)**: 압축 품질(60% ~ 100%) 커스텀 지정 가능
- **WEBP (.webp)**: 초경량 고화질 모던 포맷 지원

### 7. 🔒 100% 로컬 처리 & 프라이버시 보호
- AI 추론(Transformers.js / WebGPU / WASM)과 Canvas 연산이 모두 사용자의 로컬 브라우저에서 클라이언트 사이드로만 처리됩니다.
- 외부 서버 전송이 전혀 없으며, 오프라인 환경에서도 안전하게 동작합니다.

---

## 🚀 설치 방법 (Installation)

크롬, 엣지, 웨일 등 Chromium 기반 브라우저에 1분 만에 설치할 수 있습니다:

1. 브라우저를 열고 주소창에 확장 프로그램 관리 페이지로 이동합니다:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Whale**: `whale://extensions`
2. 우측 상단의 **[개발자 모드 (Developer mode)]** 스위치를 켭니다.
3. 좌측 상단의 **[압축해제된 확장 프로그램을 로드합니다 (Load unpacked)]** 버튼을 클릭합니다.
4. 이 프로젝트의 폴더(루트 디렉터리)를 선택합니다.
5. 확장 프로그램 목록에 **Oh My Img**가 정상 등록됩니다! 🎉

---

## 🛠️ 사용 방법 (Usage)

### ✨ 스마트 배경 제거 (누끼) 스튜디오 사용하기
1. 확장 프로그램 아이콘을 클릭하고 **[✨ 스마트 배경 제거 (누끼) 스튜디오]**를 클릭합니다.
2. 이미지를 드래그 앤 드롭하거나 **[Ctrl + V]**로 클립보드 이미지를 붙여넣습니다.
3. 좌측 패널에서 **[원클릭 AI 배경 제거]**를 클릭하여 피사체를 자동 분리합니다.
4. 필요 시 **[스포이드 지우개]** 또는 **[리터칭 브러시(지우개/복원)]**로 세부 영역을 다듬습니다.
5. **[투명 PNG 다운로드]** 또는 **[클립보드로 복사 (Ctrl+C)]**를 눌러 결과물을 활용합니다.

### 🖥️ 워크스페이스에서 대량 이미지 일괄 크롭하기
1. 확장 프로그램 팝업에서 **[🖼️ 대량 일괄 크롭 워크스페이스]**를 엽니다.
2. 편집할 이미지 파일들을 드롭존에 드래그 앤 드롭합니다.
3. 좌측 프리셋 또는 슬라이더로 크롭 비율을 설정합니다.
4. **[⚡ 일괄 크롭 & ZIP 다운로드]**를 눌러 수초 만에 압축 파일로 다운로드합니다.

---

## 🏗️ 프로젝트 구조 (Project Structure)

```text
oh-my-img-manager/
├── manifest.json            # Chrome Manifest V3 설정 파일
├── icons/                   # 확장 프로그램 아이콘 (16, 48, 128px)
├── lib/
│   ├── jszip.min.js         # 클라이언트 사이드 ZIP 압축 라이브러리
│   └── transformers/        # Transformers.js & ONNX WebAssembly 번들
├── popup/                   # 툴바 팝업 UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js             # 기능 라우팅 및 탭 캡처
├── workspace/               # 대용량 일괄 크롭 워크스페이스
│   ├── workspace.html
│   ├── workspace.css
│   ├── workspace.js
│   └── cropper-engine.js    # Canvas 크롭 연산 엔진
├── remover/                 # ✨ 신규 스마트 배경 제거(누끼) 스튜디오
│   ├── remover.html         # 단일 이미지 전용 에디터 UI
│   ├── remover.css          # 체커보드 & 듀얼 비교 뷰어 스타일
│   ├── remover.js           # 스튜디오 상태 관리 & 브러시/클립보드 인터랙션
│   ├── remover-engine.js    # Canvas 픽셀 컬러키, 페더링, 마스크 블렌딩 엔진
│   └── bg-worker.js         # Transformers.js AI 연산 Web Worker
└── README.md
```

---

## ⚙️ 기술 스택 (Tech Stack)

- **Platform**: Chrome Extension (Manifest V3)
- **AI Engine**: [Transformers.js](https://huggingface.co/docs/transformers.js) (ONNX Runtime Web, WebAssembly SIMD, WebGPU)
- **Graphics Engine**: HTML5 Canvas 2D API, ImageData Pixel Manipulation, OffscreenCanvas
- **Styling**: Pure Modern CSS3 (CSS Variables, Flexbox/Grid, Dark/Light Themes)
- **Library**: [JSZip](https://stuk.github.io/jszip/) (클라이언트 사이드 ZIP 패키징)

---

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 사용 및 수정할 수 있습니다.
