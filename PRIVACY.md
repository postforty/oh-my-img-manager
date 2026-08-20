# 개인정보처리방침 (Privacy Policy)

**Oh My Image Manager** (이하 "확장 프로그램")는 사용자의 개인정보와 데이터를 소중하게 생각하며, 관련 법령 및 Chrome 웹 스토어 개발자 정책을 준수합니다.

최종 수정일: 2026년 8월 20일

---

## 1. 개인정보 및 사용자 데이터 수집 여부

본 확장 프로그램은 **어떠한 개인 식별 정보(PII)나 사용자 데이터도 수집, 저장, 전송하지 않습니다.**

- **이미지 데이터**: 사용자가 업로드하거나 편집하는 모든 이미지는 사용자의 로컬 브라우저 메모리 및 HTML5 Canvas 내에서만 처리됩니다. 어떠한 외부 서버나 제3자에게도 전송되지 않습니다.
- **AI 연산**: 스마트 배경 제거(누끼 따기)를 위한 AI 모델 추론은 브라우저 내 온디바이스(Transformers.js / WebAssembly) 환경에서 100% 로컬로 동작합니다.
- **설정 데이터**: 크롭 비율, 파일 포맷 및 테마 설정은 사용자의 브라우저 로컬 저장소(`chrome.storage.local`)에만 저장되며 외부로 유출되지 않습니다.

---

## 2. 권한 사용 목적 (Permissions)

본 확장 프로그램은 오직 기능 제공을 위해서만 최소한의 브라우저 권한을 요청합니다:

- `activeTab`: 사용자가 '현재 탭 캡처 & 크롭' 버튼을 직접 클릭했을 때 현재 열려 있는 탭의 화면을 캡처하기 위해서만 사용됩니다.
- `downloads`: 일괄 크롭된 ZIP 파일 및 누끼 작업된 이미지를 사용자의 PC에 다운로드하기 위해 사용됩니다.
- `storage`: 사용자의 크롭 옵션, 기본 포맷, 테마 설정을 로컬에 보관하기 위해 사용됩니다.
- `clipboardWrite`: 누끼 작업이 완료된 결과 이미지를 클립보드에 복사하여 다른 프로그램에 바로 붙여넣을 수 있도록 돕기 위해 사용됩니다.
- `scripting`: 탭 캡처 시 안전한 화면 처리를 위해 사용됩니다.

---

## 3. 제3자 제공 및 데이터 판매 금지

- 본 확장 프로그램은 사용자 데이터를 제3자에게 판매하거나 마케팅/광고 목적으로 활용하지 않습니다.
- 어떠한 추적기(Tracker), 애널리틱스 스크립트, 광고 SDK도 포함하고 있지 않습니다.

---

## 4. 문의처 (Contact)

개인정보처리방침 또는 확장 프로그램 사용과 관련하여 궁금한 점이 있으시면 GitHub 저장소 Issue 또는 아래 연락처를 통해 문의해 주시기 바랍니다.

- GitHub Repository: [https://github.com/postforty/oh-my-img-manager](https://github.com/postforty/oh-my-img-manager)

---

# Privacy Policy (English)

**Oh My Image Manager** respects your privacy. This extension is designed with a **100% Privacy-First & Local-Only** architecture.

Last Updated: August 20, 2026

## 1. Data Collection & Processing
We do **NOT** collect, store, transmit, or share any personal information or user data.
- All image editing, cropping, and on-device AI background removal processes execute strictly within your local browser.
- No image or data is ever transmitted to external servers.

## 2. Permissions Usage
- `activeTab`: Used solely to capture the active tab when triggered by the user.
- `downloads`: Used solely to save processed images or ZIP files to the user's local disk.
- `storage`: Used solely to persist user preferences locally.
- `clipboardWrite`: Used solely to copy edited images to your system clipboard.
- `scripting`: Used to facilitate screenshot capture on the active tab.

## 3. Third-Party Sharing
We do not sell, rent, or transfer user data to third parties. No analytics or tracking scripts are bundled.
