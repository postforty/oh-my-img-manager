# 스마트 누끼 스튜디오: 개체(Object) 도구 및 접착 기능 구현 계획서

> **문서 버전**: v1.1.0 (시니어 아키텍처 리뷰 및 실무 엣지 케이스 보완 완료)  
> **대상 모듈**: `remover` ([스마트 배경 제거 스튜디오](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.html))  
> **접근 방식**: [방안 A] 순수 HTML5 Canvas 2D 기반 경량 벡터 개체 엔진 구축 (Zero-Dependency)

---

## 1. 개요 및 목적 (Overview)

포토스케이프(PhotoScape)의 **개체(Object) 툴바**와 유사하게, 배경이 제거된 투명 피사체 또는 편집 중인 캔버스 위에 **도형(사각형, 원, 선, 화살표), 텍스트, 강조 스티커/배지**를 자유롭게 배치·조작·편집한 뒤, 캔버스에 영구 병합(**'개체 접착'**)하거나 곧바로 고품질로 내보낼 수 있는 초경량 벡터 그래픽 레이어 시스템을 구축합니다.

### 🎯 5대 핵심 설계 원칙
1. **Zero-Dependency (초경량 무의존성)**: Fabric.js 등 무거운 외부 라이브러리(수백 KB)를 배제하고, 순수 Canvas 2D API와 경량 DOM 레이어만으로 구현하여 Manifest V3 환경 최적화 및 빠른 구동 속도를 유지합니다.
2. **원스톱 워크플로우 완결**: `배경 제거 ➔ 자동 트리밍/크롭 ➔ 개체(텍스트/도형) 삽입 및 꾸미기 ➔ (선택적) 접착 ➔ 4대 포맷(PNG/WEBP/JPEG/GIF) 저장`의 전 과정을 단일 화면에서 완결합니다.
3. **무손실 안전 내보내기 (Safe Export)**: 사용자가 실수로 '개체 접착' 버튼을 누르지 않고 곧바로 [저장]이나 [클립보드 복사]를 실행하더라도, 렌더링 파이프라인에서 벡터 레이어를 비파괴 합성하여 원하는 결과물을 온전히 출력합니다.
4. **도구 모드 상호 배타성 (Tool Exclusivity)**: 개체 도구 모드 활성화 시 기존 리터치 브러시, 스포이트, 수동 크롭 등과의 이벤트 간섭을 원천 차단하여 오동작을 방지합니다.
5. **무손실 히스토리 보존**: 개체를 비트맵에 병합(접착)한 후에도 기존 [HistoryManager](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover-engine.js#L506)와 연동되어 `Ctrl + Z`로 언제든 접착 전 상태로 100% 안전하게 되돌립니다.

---

## 2. 시스템 아키텍처 및 계층 구조

### 2.1 캔버스 및 인터랙션 계층 다이어그램

```mermaid
graph TD
    subgraph TransformLayer ["#canvasTransformLayer (확대/축소 scale & 이동 pan)"]
        AiScan["#aiScanOverlay (z: 30, AI 프로세싱 스캔 효과)"]
        CropLayer["#cropOverlayLayer (z: 25, 수동 크롭 오버레이)"]
        BrushCursor["#brushCursor (z: 20, 리터치 원형 브러시 커서)"]
        ObjOverlay["#objectOverlayLayer (z: 18, 개체 선택 박스, 회전/8방향 리사이즈 핸들, 인라인 에디터)"]
        SplitLayer["#splitDivider & #splitOverlayCanvas (z: 15, 좌우 비교 뷰)"]
        ObjCanvas["#objectCanvas (z: 10, 벡터 개체 실시간 렌더링 투명 캔버스)"]
        MainCanvas["#mainCanvas (z: 5, 누끼/비트맵 메인 캔버스)"]
        OriginalCanvas["#originalCanvas (z: 2, 무손실 원본 보존용)"]
        BgCanvas["#bgCanvas (z: 1, 단색/체커보드 배경)"]
    end

    ObjOverlay -->|선택/변형/입력 이벤트| ObjectEngine
    ObjCanvas -->|60fps Canvas 2D 렌더링| ObjectEngine
    ObjectEngine -->|개체 접착 (Flatten Action)| MainCanvas
    ObjectEngine -.->|임시 합성 스트림| ExportPipeline["toBlob / copyToClipboard"]
    MainCanvas -->|스냅샷 저장| HistoryManager
```

### 2.2 레이어 역할 정의 및 적층(Z-Index) 정책
- **`#objectCanvas`** (z-index: 10):
  - `mainCanvas`와 1:1로 동일한 해상도(`width`, `height`)를 유지하는 투명 캔버스.
  - 마우스 조작에 따라 모든 도형, 선, 화살표, 텍스트를 고주파수로 다시 그립니다.
  - `pointer-events: none`으로 설정하여 상위 오버레이나 하위 인터랙션을 방해하지 않습니다.
- **`#objectOverlayLayer`** (z-index: 18):
  - 현재 선택된 개체의 테두리(바운딩 박스), 8방향 리사이즈 핸들, 회전 핸들, 텍스트 인라인 편집용 `<textarea>`를 포함하는 DOM 레이어.
  - `canvasTransformLayer` 내부에 위치하여 캔버스가 줌/팬되더라도 좌표 변환 수식 없이 CSS 트랜스폼으로 완벽히 동기화됩니다.

---

## 3. 데이터 모델 및 상태 설계 (State Management)

### 3.1 개체 모델 (`ObjectItem`)
선/화살표의 방향 벡터 표현 및 텍스트 가독성을 완벽히 지원하는 정밀 데이터 구조입니다:

```typescript
export type ObjectType = 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'image';

export interface BaseObjectItem {
  id: string;                 // 개체 고유 식별자 (obj_timestamp_random)
  type: ObjectType;
  x: number;                  // 캔버스 픽셀 절대 좌표 X (바운딩 박스 기준)
  y: number;                  // 캔버스 픽셀 절대 좌표 Y (바운딩 박스 기준)
  width: number;              // 너비 (최소 5px)
  height: number;             // 높이 (최소 5px)
  rotation: number;           // 회전 각도 (단위: degree, 0 ~ 360)
  strokeColor: string;        // 외곽선 색상 (Hex, 예: '#FF3366')
  strokeWidth: number;        // 선 굵기 (1 ~ 50px)
  fillColor: string;          // 채우기 색상
  isFilled: boolean;          // 채우기 활성화 여부
  opacity: number;            // 불투명도 (0.0 ~ 1.0)
  borderRadius?: number;      // 사각형 모서리 둥글기 (0 ~ 100px)
}

// 선 및 화살표 전용 (시작점과 끝점을 명시하여 4분면 방향 벡터 보장)
export interface LineObjectItem extends BaseObjectItem {
  type: 'line' | 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  arrowHeadSize?: number;     // 화살표 머리 크기 (기본값: strokeWidth * 3.5)
}

// 텍스트 개체 전용
export interface TextObjectItem extends BaseObjectItem {
  type: 'text';
  text: string;               // 줄바꿈(\n) 포함 텍스트
  fontSize: number;           // 폰트 크기 (12 ~ 200px)
  fontFamily: string;         // 기본 'Inter, system-ui, sans-serif'
  isBold: boolean;
  textAlign: 'left' | 'center' | 'right';
  hasTextShadow: boolean;     // 명도 대비를 위한 부드러운 외곽선/그림자 효과
}

export type ObjectItem = BaseObjectItem | LineObjectItem | TextObjectItem;
```

### 3.2 개체 관리자 전역 상태 (`ObjectState`)
```javascript
const objectState = {
  activeTool: 'select',       // 'select' | 'rect' | 'circle' | 'line' | 'arrow' | 'text'
  selectedId: null,           // 현재 선택된 개체 ID (없으면 null)
  items: [],                  // 렌더링 순서대로 정렬된 개체 배열 (0: 맨 뒤, N-1: 맨 앞)
  
  // 마우스 상호작용 상태
  isDrawing: false,           // 신규 개체 드래그 생성 중 여부
  isTransforming: false,      // 이동/리사이즈/회전 중 여부
  transformAction: null,      // 'move' | 'rotate' | 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br'
  dragStartPos: { x: 0, y: 0 },
  initialItemSnapshot: null,  // 변형 시작 전 원본 개체 복사본 (정밀 델타 계산용)
  
  // 텍스트 인라인 편집 상태
  isEditingText: false,
  
  // 기본 스타일 프리셋 (신규 개체 생성 시 적용)
  defaultStyle: {
    strokeColor: '#38bdf8',
    strokeWidth: 4,
    fillColor: '#ffffff',
    isFilled: false,
    opacity: 1.0,
    borderRadius: 8,
    fontSize: 28,
    fontFamily: 'Inter, system-ui, sans-serif',
    isBold: true,
    textAlign: 'center',
    hasTextShadow: true
  }
};
```

---

## 4. UI/UX 디자인 및 패널 인터페이스

### 4.1 사이드바 개체 도구 패널 마크업 레이아웃 (`remover.html`)
기존 [잘라내기](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.html#L380) 섹션과 [리사이즈](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.html#L470) 섹션 사이에 위치하며, 공간 절약을 위해 접기/펼치기 아코디언 및 동적 인스펙터(Contextual Inspector)를 지원합니다:

```text
┌────────────────────────────────────────────────────────┐
│ 🎨 6. 개체 및 텍스트 추가 (Object Studio)       [접기/펼치기]│
├────────────────────────────────────────────────────────┤
│ [도구 모음]                                            │
│ [ ↖ 선택 ] [ ▢ 사각 ] [ ◯ 원형 ]                       │
│ [ ↗ 화살표 ] [ ─ 직선 ] [ T 텍스트 ]                    │
├────────────────────────────────────────────────────────┤
│ [선택 개체 속성 조절기 (Contextual Inspector)]          │
│  외곽선: [■ #38BDF8] [4px ──●──]                      │
│  채우기: [☑ 사용] [■ #FFFFFF]                          │
│  투명도: [100% ────●]     모서리: [8px ──●──]          │
│  (텍스트 선택 시: 폰트크기 / B / 정렬 / 텍스트 그림자 토글)│
├────────────────────────────────────────────────────────┤
│ [레이어 관리 및 조작]                                  │
│  [🗑 삭제] [📋 복제] [🔼 앞으로] [🔽 뒤로]              │
├────────────────────────────────────────────────────────┤
│ 📌 [ 개체 접착 (캔버스 병합) ]                         │
│  💡 안내: 접착하지 않아도 저장 시 자동 합성됩니다.      │
└────────────────────────────────────────────────────────┘
```

### 4.2 인라인 텍스트 편집 UX (한글 IME 완벽 대응)
- 캔버스에서 텍스트 도구로 클릭하거나 기존 텍스트 개체를 더블 클릭하면 `#objectOverlayLayer` 내부에 개체 위치와 동일한 위치에 투명 배경의 `<textarea class="inline-text-editor">`를 즉시 마운트합니다.
- 브라우저 기본 IME 입력 시스템을 직접 활용하므로 한글 조합 문자 깨짐, 초성/중성 분리 현상이 100% 방지됩니다.
- 포커스를 잃거나(`blur`), `Esc`를 누르면 텍스트가 `ObjectItem`에 저장되고 에디터 DOM이 언마운트되며 다시 캔버스에 렌더링됩니다.

---

## 5. 핵심 알고리즘 및 렌더링 파이프라인

### 5.1 픽셀 단위 정밀 좌표 변환 (Coordinate Mapping)
기존 [remover.js의 getCanvasCoords](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.js#L754-L759)와 완벽히 일치하는 공식을 사용하여 줌(25%~500%) 및 패닝 상태에서도 1px의 오차 없이 마우스 위치를 추적합니다:

```javascript
function getStageCanvasCoords(e) {
  const rect = mainCanvas.getBoundingClientRect();
  const x = Math.round(((e.clientX - rect.left) / rect.width) * mainCanvas.width);
  const y = Math.round(((e.clientY - rect.top) / rect.height) * mainCanvas.height);
  return {
    x: Math.max(0, Math.min(mainCanvas.width, x)),
    y: Math.max(0, Math.min(mainCanvas.height, y))
  };
}
```

### 5.2 렌더링 파이프라인 ([remover/object-engine.js](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/object-engine.js))
- **`renderAll()`**:
  1. `objectCanvas`의 컨텍스트를 `clearRect(0, 0, width, height)`로 초기화.
  2. `items` 배열을 인덱스 0(최하단 레이어)부터 N-1(최상단 레이어) 순서로 순회하며 그리기.
  3. 각 개체 렌더링 시 `ctx.save()` ➔ 투명도/회전/스타일 적용 ➔ 패스 생성 및 그리기 ➔ `ctx.restore()` 보장.
- **도형별 정밀 렌더러**:
  - **사각형**: `ctx.roundRect(x, y, w, h, radius)`를 활용하여 고품질 둥근 모서리 지원.
  - **원형**: 타원/원형 패스(`ctx.ellipse`) 지원.
  - **선 & 화살표**: `startX, startY`에서 `endX, endY`로 선을 긋고, 화살표 머리는 `Math.atan2(dy, dx)` 각도를 계산하여 끝점에 이등변 삼각형 패스 합성.
  - **텍스트**: 줄바꿈(`\n`) 분할 렌더링, `hasTextShadow` 활성화 시 `strokeText` 또는 `shadowBlur`로 어두운/밝은 배경 어디서나 높은 가독성 확보.

### 5.3 도구 모드 간 상호 배타성 관리 (Conflict Resolution)
개체 도구가 활성화되면 다른 도구와의 충돌을 원천 차단합니다:
```javascript
function activateObjectTool(toolName) {
  objectState.activeTool = toolName;
  
  // 1. 기존 도구 모드 강제 해제
  if (state.crop && state.crop.isActive) setCropMode(false);
  if (state.colorKey && state.colorKey.eyedropperActive) {
    state.colorKey.eyedropperActive = false;
    btnEyedropper.classList.remove("active");
    canvasStage.classList.remove("eyedropper-active");
  }
  
  // 2. 브러시 커서 숨김 및 브러시 입력 잠금
  brushCursor.classList.add("hidden");
  
  // 3. UI 툴바 버튼 활성화 상태 동기화
  updateObjectToolUI();
}
```

### 5.4 안전한 내보내기 파이프라인 (Safe Export Pipeline)
사용자가 수동으로 개체 접착을 누르지 않아도 다운로드/클립보드 복사 시 온전히 합성됩니다:
```javascript
function getCompositeExportCanvas() {
  // 1. 배경색이 적용된 베이스 캔버스 생성
  const exportCanvas = RemoverEngine.renderWithBackground(mainCanvas, state.bgFill);
  
  // 2. 배치된 개체가 남아있는 경우 최상단에 무손실 합성
  if (objectEngine && objectEngine.hasItems()) {
    const ctx = exportCanvas.getContext("2d");
    ctx.drawImage(objectCanvas, 0, 0);
  }
  
  return exportCanvas;
}
```
[remover.js의 btnDownloadImage](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.js#L1877) 및 [btnCopyClipboard](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.js#L1914)의 `RemoverEngine.renderWithBackground` 호출부를 `getCompositeExportCanvas()`로 교체하여 적용합니다.

### 5.5 개체 접착 (Flatten & Merge) 및 무손실 히스토리 커밋
```javascript
function glueObjectsToMainCanvas() {
  if (!objectEngine || !objectEngine.hasItems()) return;

  const ctx = mainCanvas.getContext("2d");
  // 개체 캔버스를 메인 비트맵에 합성
  ctx.drawImage(objectCanvas, 0, 0);

  // 개체 데이터 및 캔버스 초기화
  objectEngine.clearAll();

  // HistoryManager에 스냅샷 푸시 (Ctrl+Z 지원)
  historyManager.pushState(mainCanvas, originalCanvas);
  updateUndoRedoButtons();
  updateCanvasDisplay();
  
  showToast(
    typeof I18N !== "undefined"
      ? I18N.t("toastObjectsGlued")
      : "모든 개체가 캔버스에 영구 접착되었습니다! (Ctrl+Z로 되돌리기 가능)",
    "success"
  );
}
```

### 5.6 이미지 크기 변경 및 자르기(Trim/Crop) 라이프사이클 연동
사용자가 개체를 배치한 상태에서 [자동 여백 자르기(Trim)](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.js#L1320), [수동 크롭](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.js#L1324), [리사이즈](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.js#L1311)를 실행할 경우:
- 개체 유실을 방지하기 위해 **"크기 변경 전 개체를 자동으로 캔버스에 접착"**한 후 크롭/리사이즈를 수행하거나 안내 모달을 표시합니다.

---

## 6. 단계별 개발 로드맵 (Roadmap)

| 단계 | 주요 작업 내용 | 검증 기준 |
| :--- | :--- | :--- |
| **Phase 1: 독립 엔진 구축** | - `remover/object-engine.js` 클래스 개발<br>- 데이터 모델 및 사각/원/선/화살표/텍스트 Canvas 2D 렌더러 구현 | 단위 테스트를 통한 개체별 무결점 렌더링 확인 |
| **Phase 2: 레이어 마크업 & UI** | - [remover.html](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.html)에 `#objectCanvas`, `#objectOverlayLayer` 추가<br>- 좌측 사이드바 개체 도구 패널 UI 및 [remover.css](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/remover/remover.css) 스타일링 | 다크/라이트 테마 적응 및 z-index 계층 검증 |
| **Phase 3: 마우스 인터랙션** | - 마우스 드래그 도형 생성 로직 구현<br>- 선택/이동 및 8방향 리사이즈 핸들 드래그 연동<br>- 인라인 `<textarea>` 텍스트 편집 및 한글 조합 처리 | 줌/패닝 상태에서 좌표 오차 0px 검증 |
| **Phase 4: 인스펙터 및 레이어 관리** | - 색상, 선 굵기, 투명도, 둥글기, 폰트 실시간 조작<br>- 레이어 순서 변경 (앞으로/뒤로), 복제(Ctrl+D), 삭제(Delete)<br>- 입력창 활성 시 단축키 충돌 방지 필터링 | 개체 속성 변경 즉시 캔버스에 60fps 반영 |
| **Phase 5: 파이프라인 통합 & i18n** | - '개체 접착' 및 `HistoryManager` 무손실 되돌리기(Ctrl+Z) 연동<br>- 저장/클립보드 복사 시 비접착 개체 자동 합성 연동<br>- [i18n.js](file:///c:/Users/dandycode/Documents/GitHub/oh-my-img-manager/i18n.js) 및 `_locales` 한국어/영어 다국어 키 등록 | 다운로드 및 복원 품질 100% 무결성 확인 |

---

## 7. 검증 체크리스트 (Verification Checklist)

- [ ] **좌표 정밀도**: 확대/축소(Zoom 25% ~ 500%) 및 패닝 상태에서 마우스 드래그 생성 위치 정확도
- [ ] **도구 모드 배타성**: 개체 도구 활성화 시 브러시 지우기/복원이 동작하지 않는지 확인
- [ ] **방향 벡터**: 선 및 화살표를 4방향(우하, 우상, 좌하, 좌상)으로 그렸을 때 시작점과 끝점, 화살표 머리 각도가 올바른지 확인
- [ ] **텍스트 IME**: 인라인 텍스트 입력 시 한글 받침 및 조합 문자가 깨지지 않고 부드럽게 입력되는지 확인
- [ ] **단축키 충돌 방지**: 텍스트 입력창에서 스페이스바(패닝 방지), 백스페이스(개체 삭제 방지) 키가 정상 동작하는지 확인
- [ ] **안전 내보내기**: 개체를 접착하지 않은 상태에서 PNG/WEBP/JPEG/GIF 다운로드 및 클립보드 복사 시 개체가 정상 포함되어 저장되는지 확인
- [ ] **무손실 복원**: 개체 접착 ➔ `Ctrl + Z`(되돌리기) ➔ `Ctrl + Y`(다시 실행) 시 비트맵 해상도 및 투명도 유지 여부
- [ ] **다국어 무결성**: 한국어 및 영어 환경에서 모든 도구 툴팁 및 라벨이 번역되어 출력되는지 확인
