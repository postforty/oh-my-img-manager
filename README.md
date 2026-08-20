# Oh My Image Manager - 스마트 이미지 크롭 & 배경 제거(누끼) 스튜디오

> **대용량 이미지 일괄 크롭 & ZIP 다운로드부터, 온디바이스 AI 기반 원클릭 배경 제거(누끼 따기)까지 지원하는 강력한 Manifest V3 크롬 확장 프로그램**

![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?logo=googlechrome&logoColor=white)
![AI On-Device](https://img.shields.io/badge/AI-Transformers.js%20%28Apache%202.0%29-8b5cf6?logo=huggingface&logoColor=white)
![Canvas API](https://img.shields.io/badge/HTML5-Canvas%20Engine-E34F26?logo=html5&logoColor=white)
![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-green)
![Design System](https://img.shields.io/badge/UI-Sky%20Blue%20%26%20Grass%20Green-1089C7)

---

## 🚀 주요 기능 (Key Features)

### 1. 스마트 배경 제거 (누끼) 스튜디오
- **온디바이스 AI 스마트 누끼**: 최신 SOTA 세그멘테이션 모델(RMBG-1.4 / MODNet)을 탑재하여 사람, 사물, 동물의 배경을 원클릭으로 100% 로컬 환경에서 분리합니다.
- **단색 / 스포이드 지우개**: 스포이드로 배경색을 클릭하고 허용 오차(Tolerance)와 경계 페더링(Feather)을 조절하여 단색 배경을 즉시 투명화합니다.
- **수동 리터칭 브러시**: 지우개(Erase) 및 복원 펜(Restore)을 제공하여 미세한 경계면을 정밀하게 다듬을 수 있습니다.
- **클립보드 완벽 연동**: 웹 서핑 중 복사한 이미지를 즉시 붙여넣고(`Ctrl+V`), 결과물을 즉시 복사(`Ctrl+C`)하여 피그마, 포토샵, PPT 등에 바로 활용할 수 있습니다.
- **좌우 분할(Split) 비교 뷰**: 원본과 투명 결과물을 드래그 슬라이더로 실시간 비교 검토할 수 있습니다.

### 2. 대용량 이미지 일괄 크롭 & ZIP 내보내기
- 수십 ~ 수백 장의 이미지 파일을 화면에 **드래그 앤 드롭**하거나 폴더 단위로 한 번에 불러올 수 있습니다.
- 모든 이미지를 동일한 비율 또는 사용자 정의 영역(상/하/좌/우 정밀 조정)으로 일괄 처리하고, **ZIP 압축 파일**로 수 초 만에 다운로드합니다.
- 대용량 처리 시 직관적인 실시간 프로그레스 바(진행률)가 제공됩니다.

### 3. 실시간 듀얼 프리뷰 (Dual Preview Engine)
- **영역 표시 가이드**: 자를 영역을 빨간색 박스와 음영 오버레이로 직관적으로 확인합니다.
- **크롭 결과물 탭**: 실제 잘려나간 결과물 이미지를 즉각적으로 렌더링하여 사전 검토할 수 있습니다.

### 4. 현재 웹 탭 실시간 캡처 & 자동 크롭
- 브라우징 중 팝업 메뉴에서 **[현재 웹 탭 캡처 & 자동 크롭]** 버튼을 클릭하면, 활성화된 탭 화면을 캡처하여 지정 비율로 자동 크롭 후 즉시 저장합니다.

### 5. 100% 로컬 처리 & 완벽한 프라이버시 보호
- AI 추론(Transformers.js / WebAssembly)과 Canvas 연산이 모두 사용자의 로컬 브라우저에서 클라이언트 사이드로만 처리됩니다.
- 외부 서버 전송이 전혀 없으며, 오프라인 환경에서도 안심하고 사용할 수 있습니다.

---

## 🎨 디자인 시스템 & UI/UX (Design System)

본 프로젝트는 사용자에게 친근하고 활기찬 느낌을 주며, 이미지 관리를 쉽게 할 수 있도록 돕는 세심한 디자인 시스템을 기반으로 제작되었습니다.
- **Color Palette**: `Sky Blue (#1089C7)`를 주요 액션 컬러로, `Grass Green (#78A95A)`을 성공 상태 및 보조 액션 컬러로 사용하여 자연스럽고 안정감 있는 분위기를 연출합니다.
- **Typography**: 가독성 높은 `Inter` 폰트를 메인으로 사용합니다.
- **Depth & Elevation**: 이미지 썸네일을 돋보이게 하기 위해 카드와 모달 등에 적절한 그림자(Box-Shadow) 효과를 주어 시각적 계층을 명확히 합니다.
- *디자인 가이드라인에 대한 자세한 내용은 [DESIGN.md](DESIGN.md)를 참고하세요.*

---

## ⚙️ 기술 스택 (Tech Stack)

- **Platform**: Chrome Extension (Manifest V3)
- **AI Engine**: [Transformers.js](https://huggingface.co/docs/transformers.js) (ONNX Runtime Web, WebAssembly SIMD, WebGPU)
- **Graphics Engine**: HTML5 Canvas 2D API, ImageData Pixel Manipulation, OffscreenCanvas
- **Styling**: Pure Modern CSS3 (CSS Variables, Flexbox/Grid, Dark/Light Themes)
- **Library**: [JSZip](https://stuk.github.io/jszip/) (클라이언트 사이드 ZIP 패키징)

---

## 📂 프로젝트 구조 (Project Structure)

```text
oh-my-img-manager/
├── manifest.json            # Chrome Manifest V3 설정 파일
├── icons/                   # 확장 프로그램 아이콘
├── lib/                     # 클라이언트 사이드 라이브러리 및 AI 모델 번들
├── popup/                   # 툴바 팝업 UI 및 탭 캡처 라우팅
├── workspace/               # 대용량 일괄 크롭 워크스페이스 및 Canvas 엔진
├── remover/                 # AI 기반 스마트 배경 제거(누끼) 스튜디오 및 Web Worker
├── DESIGN.md                # 디자인 시스템 문서
├── STORE_LISTING.md         # 스토어 배포용 메타데이터 및 설명 문서
├── PRIVACY.md               # 개인정보처리방침
└── README.md
```

---

## 📦 설치 방법 (Installation)

크롬, 엣지, 웨일 등 Chromium 기반 브라우저에 1분 만에 설치할 수 있습니다:

1. 브라우저를 열고 주소창에 확장 프로그램 관리 페이지로 이동합니다:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Whale**: `whale://extensions`
2. 우측 상단의 **[개발자 모드 (Developer mode)]** 스위치를 켭니다.
3. 좌측 상단의 **[압축해제된 확장 프로그램을 로드합니다 (Load unpacked)]** 버튼을 클릭합니다.
4. 이 프로젝트의 폴더(루트 디렉터리)를 선택합니다.
5. 확장 프로그램 목록에 **Oh My Image Manager**가 정상 등록됩니다!

---

## 💡 사용 방법 (Usage)

### 스마트 배경 제거 (누끼) 스튜디오
1. 확장 프로그램 아이콘을 클릭하고 **[스마트 배경 제거 스튜디오]**를 엽니다.
2. 이미지를 드래그 앤 드롭하거나 **[Ctrl + V]**로 클립보드 이미지를 붙여넣습니다.
3. 좌측 패널에서 **[원클릭 AI 배경 제거]**를 클릭하여 피사체를 자동 분리합니다.
4. 필요 시 **[스포이드 선택]** 또는 **[수동 리터칭 브러시(지우개/복원 펜)]**로 세부 영역을 다듬습니다.
5. **[투명 PNG 다운로드]** 또는 **[클립보드로 복사 (Ctrl+C)]**를 눌러 결과물을 활용합니다.

### 대량 이미지 일괄 크롭 (워크스페이스)
1. 팝업 메뉴에서 **[대량 일괄 크롭 워크스페이스]**를 엽니다.
2. 편집할 이미지 파일들을 드롭존에 드래그 앤 드롭합니다.
3. 좌측 프리셋 또는 마진 슬라이더로 크롭 비율을 정밀하게 설정합니다.
4. **[일괄 크롭 & ZIP 다운로드]**를 눌러 수초 만에 압축 파일로 다운로드합니다.

---

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 사용 및 수정할 수 있습니다.
