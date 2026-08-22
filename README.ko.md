# Oh My Image Manager - 스마트 이미지 크롭 & 배경 제거(누끼) 스튜디오

> **대용량 이미지 일괄 크롭 & ZIP 다운로드부터, 온디바이스 AI 기반 원클릭 배경 제거(누끼 따기)까지 지원하는 강력한 Manifest V3 크롬 확장 프로그램**

[English Documentation](README.md)

![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?logo=googlechrome&logoColor=white)
![AI On-Device](https://img.shields.io/badge/AI-Transformers.js%20%28Apache%202.0%29-8b5cf6?logo=huggingface&logoColor=white)
![Canvas API](https://img.shields.io/badge/HTML5-Canvas%20Engine-E34F26?logo=html5&logoColor=white)
![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-green)
![Design System](https://img.shields.io/badge/UI-Sky%20Blue%20%26%20Grass%20Green-1089C7)
![i18n](https://img.shields.io/badge/i18n-Korean%20%7C%20English-brightgreen)

---

## 🚀 주요 기능 (Key Features)

### 1. 스마트 배경 제거 (누끼) 스튜디오
- **온디바이스 AI 스마트 누끼**: 최신 SOTA 세그멘테이션 모델(RMBG-1.4 / MODNet)을 탑재하여 사람, 사물, 동물의 배경을 원클릭으로 100% 로컬 환경에서 분리합니다. (WebGPU 고속 가속 및 WASM 자동 지원)
- **단색 / 스포이드 지우개**: 스포이드로 배경색을 클릭하고 허용 오차(Tolerance)와 경계 페더링(Feather)을 조절하여 단색 배경을 즉시 투명화합니다.
- **수동 리터칭 브러시**: 지우개(Erase) 및 복원 펜(Restore)을 제공하여 미세한 경계면을 정밀하게 다듬을 수 있습니다.
- **클립보드 완벽 연동**: 웹 서핑 중 복사한 이미지를 즉시 붙여넣고(`Ctrl+V`), 결과물을 즉시 복사(`Ctrl+C`)하여 피그마, 포토샵, PPT 등에 바로 활용할 수 있습니다.
- **좌우 분할(Split) 비교 뷰**: 원본과 투명 결과물을 드래그 슬라이더로 실시간 비교 검토할 수 있습니다.
- **배경 채우기**: 투명 배경 외에도 화이트, 블랙, 커스텀 컬러 배경을 손쉽게 채울 수 있습니다.

### 2. 대용량 이미지 일괄 크롭 & ZIP 내보내기
- 수십 ~ 수백 장의 이미지 파일을 화면에 **드래그 앤 드롭**하거나 폴더 단위로 한 번에 불러올 수 있습니다.
- 모든 이미지를 동일한 비율 또는 사용자 정의 영역(상/하/좌/우 정밀 조정 및 프리셋)으로 일괄 처리하고, **ZIP 압축 파일**로 수 초 만에 다운로드합니다.
- 대용량 처리 시 직관적인 실시간 프로그레스 바(진행률)가 제공됩니다.

### 3. 실시간 듀얼 프리뷰 (Dual Preview Engine)
- **영역 표시 가이드**: 자를 영역을 빨간색 박스와 음영 오버레이로 직관적으로 확인합니다.
- **크롭 결과물 탭**: 실제 잘려나간 결과물 이미지를 즉각적으로 렌더링하여 사전 검토할 수 있습니다.

### 4. 현재 웹 탭 실시간 캡처 & 자동 크롭
- 브라우징 중 팝업 메뉴에서 **[현재 웹 탭 캡처 & 자동 크롭]** 버튼을 클릭하면, 활성화된 탭 화면을 캡처하여 지정 비율로 자동 크롭 후 즉시 저장합니다.

### 5. 다국어(i18n) & 다크/라이트 테마 지원
- 한국어 및 영어(English) UI 및 설명서를 기본 지원하며, 시스템 언어 자동 감지 및 실시간 언어 전환 드롭다운을 제공합니다.
- 눈이 편안한 모던 다크/라이트 테마를 지원합니다.

### 6. 100% 로컬 처리 & 완벽한 프라이버시 보호
- AI 추론(Transformers.js / WebAssembly / WebGPU)과 Canvas 연산이 모두 사용자의 로컬 브라우저에서 클라이언트 사이드로만 처리됩니다.
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
- **Internationalization (i18n)**: Zero-Dependency 2-Tier i18n Engine (Chrome Storage Sync & Declarative DOM Binding)
- **Styling**: Pure Modern CSS3 (CSS Variables, Flexbox/Grid, Dark/Light Themes)
- **Library**: [JSZip](https://stuk.github.io/jszip/) (클라이언트 사이드 ZIP 패키징)

---

## 📂 프로젝트 구조 (Project Structure)

```text
oh-my-img-manager/
├── manifest.json            # Chrome Manifest V3 설정 파일
├── _locales/                # 크롬 웹스토어 및 브라우저 확장 메타데이터 다국어 사전 (ko, en)
├── i18n.js                  # 무의존성 경량 2-Tier 다국어(i18n) 엔진
├── icons/                   # 확장 프로그램 아이콘
├── lib/                     # 클라이언트 사이드 라이브러리 및 AI 모델 번들
├── popup/                   # 툴바 팝업 UI 및 탭 캡처 라우팅
├── workspace/               # 대용량 일괄 크롭 워크스페이스 및 Canvas 엔진
├── remover/                 # AI 기반 스마트 배경 제거(누끼) 스튜디오 및 Web Worker
├── guide.html               # 올인원 사용 설명서 (한/영 지원)
├── DESIGN.md                # 디자인 시스템 문서
├── I18N_GUIDE.md            # 다국어 처리 표준 규격 가이드
├── STORE_LISTING.md         # 스토어 배포용 메타데이터 및 설명 문서
├── PRIVACY.md               # 개인정보처리방침
├── README.md                # 영문 매뉴얼
└── README.ko.md             # 국문 매뉴얼
```

---

## 📦 설치 방법 (Installation)

크롬, 엣지, 웨일 등 Chromium 기반 브라우저에 1분 만에 설치할 수 있습니다:

1. 브라우저를 열고 주소창에 확장 프로그램 관리 페이지로 이동합니다:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Whale**: `whale://extensions`
2. 우측 상단의 [개발자 모드 (Developer mode)] 스위치를 켭니다.
3. 좌측 상단의 [압축해제된 확장 프로그램을 로드합니다 (Load unpacked)] 버튼을 클릭합니다.
4. 이 프로젝트의 폴더(루트 디렉터리)를 선택합니다.
5. 확장 프로그램 목록에 **Oh My Image Manager**가 정상 등록됩니다!

---

## 💡 사용 방법 (Usage)

### 스마트 배경 제거 (누끼) 스튜디오
1. 확장 프로그램 아이콘을 클릭하고 [스마트 배경 제거 스튜디오]를 엽니다.
2. 이미지를 드래그 앤 드롭하거나 [Ctrl + V]로 클립보드 이미지를 붙여넣습니다.
3. 좌측 패널에서 [원클릭 AI 배경 제거]를 클릭하여 피사체를 자동 분리합니다.
4. 필요 시 [스포이드 선택] 또는 [수동 리터칭 브러시(지우개/복원 펜)]로 세부 영역을 다듬습니다.
5. [투명 PNG 다운로드] 또는 [클립보드로 복사 (Ctrl+C)]를 눌러 결과물을 활용합니다.

### 대량 이미지 일괄 크롭 (워크스페이스)
1. 팝업 메뉴에서 [대량 일괄 크롭 워크스페이스]를 엽니다.
2. 편집할 이미지 파일들을 드롭존에 드래그 앤 드롭합니다.
3. 좌측 프리셋 또는 마진 슬라이더로 크롭 비율을 정밀하게 설정합니다.
4. [일괄 크롭 & ZIP 다운로드]를 눌러 수초 만에 압축 파일로 다운로드합니다.

---

## 📜 버전 히스토리 (Version History)

### 🚀 v1.1 (`2026-08-22`)
**다국어(i18n) 지원 및 AI 엔진·UX 고도화**
- **Zero-Dependency 2-Tier 다국어(i18n) 시스템 전면 도입**:
  - 한국어(`ko`), 영어(`en`) 완벽 지원 및 브라우저 환경 자동 감지(`Auto`) 기능 탑재
  - 팝업, 일괄 크롭 워크스페이스, AI 누끼 스튜디오, 사용 설명서 전 영역 실시간 언어 전환 지원 및 사용자 설정 영속화(`chrome.storage.sync`)
  - Chrome 확장 프로그램 웹스토어 메타데이터(`_locales/`) 다국어화
- **AI 배경 제거 시각 피드백 & 작업 제어 강화**:
  - 누끼 작업 진행 중 시각적 스캔 효과를 제공하여 처리 상태를 직관적으로 확인 가능
  - AI 연산 처리 중 중복 클릭 및 오작동을 방지하는 안전 인터랙션 제어 적용
- **AI 모델 로딩 안정성 개선**:
  - 모델 초기 로딩 시 발생할 수 있는 무한 대기 현상 해결 및 상태/오류 안내 피드백 강화
- **UI/UX 세부 정렬 및 반응형 레이아웃 개선**:
  - 배경 채우기(Background Fill) 버튼들의 아이콘 및 텍스트 높이/정렬 표준화
  - 사용 설명서(가이드) 헤더의 언어 셀렉터 및 긴 텍스트 오버플로우 방지, 버튼 호버 대비 개선
  - 100% 로컬 프라이버시 처리 안내 문구 및 팝업 UI 시각 요소 개선

---

### 🎉 v1.0 (`2026-08-20`)
**Oh My Image Manager 공식 첫 릴리즈**
- **스마트 배경 제거 (누끼 따기) 스튜디오**:
  - 온디바이스 AI(WebGPU/WASM) 기반 원클릭 로컬 피사체·배경 자동 분리
  - 단색 배경 스포이드 지우개 및 정밀 수동 리터칭 브러시(지우개/복원 펜) 제공
  - 원본과 투명 결과물을 실시간으로 비교하는 좌우 분할(Split) 뷰 지원
  - 단색 배경 채우기 및 클립보드(`Ctrl+C` / `Ctrl+V`) 다이렉트 복사·붙여넣기 지원
- **대용량 이미지 일괄 크롭 워크스페이스**:
  - 다중 이미지 드래그 앤 드롭 일괄 등록 및 비율/마진 설정 기반 일괄 크롭
  - 수십~수백 장의 결과물을 ZIP 압축 파일로 일괄 고속 다운로드
- **웹 화면 캡처 연동**:
  - 브라우저 활성 탭을 캡처하여 즉시 크롭 및 누끼 스튜디오로 자동 연동
- **모던 UI 시스템 & 도움말**:
  - 다크/라이트 모드 지원 모던 UI 및 단계별 사용 설명서(가이드) 페이지 제공

---

## 📝 라이선스 (License)

[MIT License](https://github.com/postforty/oh-my-img-manager/blob/main/LICENSE) © [postforty](https://github.com/postforty)
