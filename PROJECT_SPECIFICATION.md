# Link & QR Studio - 프로젝트 개요 및 기능 명세서

---

## 1. 프로젝트 개요 (Project Overview)

### 1.1 프로젝트 명칭
- **서비스명**: Link & QR Studio (통합 링크 관리 & QR 코드 생성 스튜디오)
- **서브 모듈**:
  - `URL2QR`: 스마트 고해상도 QR코드 생성 및 JPG 다운로드 서비스
  - `URLShort`: OpenAPI 기반 실시간 URL 단축 및 원클릭 복사 서비스
  - `LinkStudio Hub`: 두 가지 서비스를 한눈에 확인하고 자유롭게 전환하는 통합 대시보드

### 1.2 개발 목적 및 배경
웹 링크를 활용한 마케팅, 문서 공유, 모바일 접근성 향상이 중요해짐에 따라 다음 두 가지 핵심 기능에 대한 수요가 급증하고 있습니다:
1. 복잡하고 긴 URL을 짧고 기억하기 쉬운 형태로 줄여주는 **URL 단축** 기능
2. 모바일 기기로 즉시 스캔하여 페이지에 접속할 수 있는 **QR코드 생성** 기능

본 프로젝트는 이 두 핵심 도구를 개별적인 도구로 파편화하지 않고, **단일 통합 포털 및 상호 연계 네비게이션 구조**로 구축하여 사용자가 어떤 화면에 있든 손쉽게 전환하고, **"긴 URL 단축 → 단축된 링크를 즉시 QR코드로 변환"**하는 유기적인 작업 흐름(Workflow)을 경험할 수 있도록 설계되었습니다.

### 1.3 핵심 기술 스택
- **프론트엔드 코어**: HTML5 Semantic Markup, Vanilla CSS (Modern CSS3 Custom Properties), Vanilla JavaScript (ES6+ Native Async/Await)
- **디자인 시스템**: Glassmorphism (Backdrop-filter blur), 마우스 커서 반응형 동적 그래디언트(Lerp Interpolation), 웜 앰버/골드 & 에메랄드 그린 조화 테마
- **외부 연동 OpenAPI**: `is.gd` Shortener OpenAPI (Primary) / `v.gd` Shortener OpenAPI (Fallback)
- **로컬 웹 서버**: Node.js 내장 `http` 모듈 기반 초경량 정적 서버 (`server.js`, Port 5500)

---

## 2. 시스템 아키텍처 및 디렉토리 구조

```
프로젝트04/
├── index.html                   # [통합 허브] 메인 포털 대시보드 (QR/단축 네비게이션 및 카드 소개)
├── style.css                    # [통합 허브] 메인 글래스모피즘 & 앰비언트 테마 스타일
├── server.js                    # [통합 서버] 포트 5500에서 모든 모듈을 호스팅하는 정적 웹 서버
├── test_endpoints.js            # [자동 검증] 요구사항 엘리먼트 및 엔드포인트 무결성 테스트 스크립트
├── PROJECT_SPECIFICATION.md     # [프로젝트 문서] 전체 개요 및 기능 명세서
│
├── url2qr/                      # [모듈 1: QR코드 생성기]
│   ├── index.html               # QR코드 생성기 뷰 (상단 'QR코드'/'URL단축' 네비게이션 버튼 포함)
│   ├── style.css                # QR코드 전용 스타일시트 및 반응형 레이아웃
│   ├── script.js                # QR 생성, 다운로드, 클립보드 복사, URL 파라미터 자동 연동 스크립트
│   ├── qrcode.min.js            # 경량 순수 JS QR 코드 렌더링 라이브러리
│   ├── server.js                # 단독 모듈 실행용 로컬 서버
│   └── img/
│       └── logo.png             # 서비스 브랜드 로고 이미지
│
└── urlShort/                    # [모듈 2: URL 단축기] (신규 추가)
    ├── index.html               # URL 단축기 뷰 (상단 네비게이션, 입력창, 버튼, 읽기 전용 상자, 토스트)
    ├── style.css                # URL 단축 전용 스타일시트 (비활성화 상태, 성공 인디케이터, 토스트)
    └── script.js                # OpenAPI 통신, 버튼 상태 실시간 제어, 클립보드 복사, 최근 기록 관리
```

---

## 3. 상세 기능 명세서 (Functional Specification)

### [기능 1] 글로벌 네비게이션 및 화면 전환
- **위치**: `index.html`, `url2qr/index.html`, `urlShort/index.html` 공통 상단 헤더
- **컴포넌트**:
  - `'QR코드'` 버튼 (`<a id="nav-btn-qr">`):
    - 클릭 시 `url2qr/index.html`로 즉시 연결
    - 현재 QR코드 화면인 경우 활성(Active) 스타일 적용
  - `'URL단축'` 버튼 (`<a id="nav-btn-short">`):
    - 클릭 시 `urlShort/index.html`로 즉시 연결
    - 현재 URL단축 화면인 경우 활성(Active) 스타일 적용
- **브랜드 로고**:
  - 클릭 시 메인 허브(`../index.html`)로 이동하거나 서비스 상태 초기화

---

### [기능 2] 실시간 URL 단축 모듈 (`urlShort`)

#### 2.1 URL 입력 및 컨트롤 (요구사항 3-1 & 3-2)
| 항목 | 사양 및 동작 정의 |
| :--- | :--- |
| **URL 입력창** (`#url-input`) | - 사용자가 긴 웹 주소를 입력하는 텍스트 필드 (`type="text"`)<br>- placeholder: "https:// 줄이고 싶은 긴 URL을 입력하세요"<br>- 프로토콜 생략(`naver.com` 등) 시 단축 시점에 자동으로 `https://` 보정 |
| **단축하기 버튼** (`#btn-shorten`) | - **초기 상태**: 비활성화 (`disabled = true`)<br>- **동적 감지**: 입력창이 비어있거나 공백만 있는 경우 비활성화 유지 (`opacity: 0.75`, `cursor: not-allowed`)<br>- 입력창에 1자 이상의 유효 문자가 입력되면 실시간 활성화 (`disabled = false`)<br>- 사용자가 입력을 모두 지우거나 '지우기' 버튼을 누르면 즉시 다시 비활성화 |
| **지우기 / 붙여넣기 툴** | - 지우기 버튼: 입력 내용 즉시 삭제 및 포커스 유지, 단축하기 버튼 비활성화<br>- 붙여넣기 버튼: 클립보드 텍스트를 읽어 입력창에 자동 삽입 후 버튼 활성화 |

#### 2.2 OpenAPI 비동기 URL 단축 통신 (요구사항 3-3)
1. **트리거**:
   - '단축하기' 버튼 클릭 또는 입력창 내에서 `Enter` 키 입력
2. **사전 검증**:
   - 정규화된 URL이 표준 URL 포맷(URL 생성자)을 통과하는지 검사
3. **로딩 상태 피드백**:
   - 버튼 내부에 스피너 애니메이션 표시 및 텍스트 "단축 중..." 변경
   - 중복 요청 방지를 위한 임시 비활성화
4. **OpenAPI 다중 폴백(Fallback) 통신**:
   - **Primary**: `https://is.gd/create.php?format=json&url={ENCODED_URL}` (CORS 헤더 `*` 완벽 지원)
   - **Secondary (Backup)**: Primary 실패 또는 네트워크 타임아웃 시 `https://v.gd/create.php?format=json&url={ENCODED_URL}`로 자동 2차 시도
5. **응답 수신 및 결과 노출**:
   - 수신된 JSON 데이터에서 `shorturl` 필드 추출
   - 읽기 전용 결과 섹션(`#result-container`)을 부드러운 슬라이드업 애니메이션으로 화면에 노출

#### 2.3 읽기 전용 출력 상자 및 복사/연계 (요구사항 3-1 & 3-4)
| 항목 | 사양 및 동작 정의 |
| :--- | :--- |
| **읽기 전용 출력 상자** (`#output-url`) | - OpenAPI로 발급받은 단축 URL을 표시하는 전용 필드<br>- `readonly` 속성이 부여되어 사용자가 임의로 내용을 수정할 수 없음<br>- 에메랄드 그린 컬러 보더와 성공 뱃지(`단축 완료`) 제공 |
| **'복사' 버튼** (`#btn-copy`) | - 클릭 시 `navigator.clipboard.writeText()`를 통해 클립보드에 단축 URL 자동 복사<br>- 구형 브라우저 호환성을 위한 fallback(텍스트 선택 및 execCommand) 탑재 |
| **'복사하였습니다' 알림창** (`#toast`) | - 복사 완료 시 하단에 세련된 플로팅 토스트 팝업 표시<br>- 표시 텍스트: **"복사하였습니다"**<br>- 2.8초간 표시 후 부드럽게 페이드아웃 |
| **부가 연계 기능** | - `링크 열기` (`#btn-visit-short`): 새 브라우저 탭에서 단축 URL 즉시 방문<br>- `QR코드로 변환하기` (`#btn-create-qr`): 단축된 링크를 파라미터(`?url=...`)로 담아 `url2qr` 모듈로 즉시 전달 |
| **최근 단축 기록 (History)** | - 성공한 단축 링크를 브라우저 `localStorage`에 자동 저장 (최대 10개)<br>- 언제든 과거 단축 링크를 다시 확인하고 개별 '복사' 및 'QR' 변환 가능 |

---

### [기능 3] QR코드 생성 모듈 (`url2qr`)
1. **스마트 인터랙션 독 (Interactive Dock)**:
   - 초기 화면: 화면 정중앙에 편안하게 배치
   - URL 입력 및 확인 시: 화면 하단으로 부드럽게 슬라이드 다운 이동하며 중앙에 QR코드 뷰 노출
2. **고화질 QR코드 렌더링**:
   - `qrcode.min.js` 기반 정밀 캔버스 생성 (320x320 고해상도 규격, 에러 보정 레벨 H)
3. **원클릭 JPG 다운로드**:
   - QR코드 카드 클릭 또는 `JPG 저장하기` 버튼 클릭 시 흰색 패딩과 깔끔한 여백이 포함된 고화질 JPG 이미지 자동 저장
4. **URL 파라미터 자동 연동**:
   - 다른 페이지(예: `urlShort`)에서 `url2qr/index.html?url=...` 형태로 유입 시, 입력창에 주소를 자동 주입하고 즉시 QR코드를 생성

---

## 4. OpenAPI 연동 규격서

| 항목 | 주 연동 API (is.gd) | 보조 연동 API (v.gd) |
| :--- | :--- | :--- |
| **서비스 제공자** | Memset Ltd (is.gd) | Memset Ltd (v.gd) |
| **요청 엔드포인트** | `https://is.gd/create.php` | `https://v.gd/create.php` |
| **HTTP 메서드** | `GET` | `GET` |
| **요청 쿼리 파라미터** | - `format`: `json`<br>- `url`: URI 인코딩된 원본 웹 주소 | - `format`: `json`<br>- `url`: URI 인코딩된 원본 웹 주소 |
| **CORS 지원** | `Access-Control-Allow-Origin: *` | `Access-Control-Allow-Origin: *` |
| **성공 응답 포맷 (200 OK)** | `{"shorturl": "https://is.gd/xxxxxx"}` | `{"shorturl": "https://v.gd/xxxxxx"}` |
| **오류 응답 포맷** | `{"errorcode": 1, "errormessage": "..."}` | `{"errorcode": 1, "errormessage": "..."}` |

---

## 5. UI/UX 디자인 시스템

1. **컬러 팔레트**:
   - Primary: Warm Gold (`#f5b800`, `#e0a300`)
   - Accent: Fresh Emerald (`#10b981`, `#059669`)
   - Neutral & Dark: Slate Dark (`#0f172a`, `#1e293b`), Muted Slate (`#64748b`)
   - Background: Cream Ivory (`#fbf9f4`)
2. **글래스모피즘 (Glassmorphism)**:
   - 반투명 배경 (`rgba(255, 255, 255, 0.85)`), 블러 필터 (`backdrop-filter: blur(20px)`), 미세한 안쪽 테두리 하이라이트
3. **마우스 반응형 다이내믹 그라데이션**:
   - 사용자의 마우스 커서 위치를 Lerp(선형 보간) 알고리즘으로 부드럽게 추적하여 은은한 빛과 색조(Hue 20~55도)가 살아 숨쉬듯 반응

---

## 6. 서비스 실행 및 검증 가이드

### 6.1 로컬 통합 서버 실행
```bash
# 프로젝트 루트 디렉토리에서 실행
node server.js
```
- **메인 통합 허브**: [http://127.0.0.1:5500/](http://127.0.0.1:5500/)
- **QR코드 생성기**: [http://127.0.0.1:5500/url2qr/](http://127.0.0.1:5500/url2qr/)
- **URL 단축기**: [http://127.0.0.1:5500/urlShort/](http://127.0.0.1:5500/urlShort/)

### 6.2 무결성 검증 스크립트 실행
```bash
node test_endpoints.js
```
- 루트 허브, QR코드 생성기, URL 단축기의 모든 필수 UI 컴포넌트(입력창, 비활성화 버튼, 읽기 전용 출력창, 복사 버튼, 토스트 알림창, 상호 네비게이션)의 연결 상태를 즉시 진단합니다.
