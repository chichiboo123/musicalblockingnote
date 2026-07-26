# 🎭 뮤지컬 동선 노트 (Musical Blocking Note)

> 뮤지컬 제작자와 안무가를 위한 무대 동선 설계 웹 도구

배우가 **어디에 서고**, **어디로 움직이는지**를 무대 위에 그대로 그리고, JPG·PDF·공유 링크·JSON으로 내보냅니다.
설치할 것도, 로그인할 것도 없습니다. 브라우저만 있으면 됩니다.

🔗 **[바로 사용하기](https://chichiboo123.github.io/musicalblockingnote/)**

---

## 3단계 사용법

| 단계 | 하는 일 |
|------|---------|
| **1. 등장인물 만들기** | 이름을 입력하면 색이 붙은 인물 칩이 생깁니다. 색은 칩을 눌러 언제든 바꿀 수 있고, 이름을 지우거나 순서를 바꿔도 이미 무대에 놓인 인물의 색은 그대로입니다. |
| **2. 무대에 놓고 이어 그리기** | 인물·도형·메모를 무대로 끌어다 놓거나 클릭해서 넣습니다. 인물을 고르고 무대를 클릭하면 **이동 경로**가 화살표로 그려집니다. |
| **3. 저장·공유하기** | 작업은 자동 저장됩니다. 이미지(JPG)·PDF·공유 링크·작업 파일(JSON)로 언제든 내보낼 수 있습니다. |

---

## 주요 기능

### 🧭 동선 설계

- **이동 경로 그리기** — 인물을 고르고 무대를 클릭해 지나갈 지점을 이어 그리면, 인물 색에 맞춘 화살표 곡선이 그려집니다. <kbd>Enter</kbd>로 마치고 <kbd>Esc</kbd>로 취소, <kbd>Backspace</kbd>로 마지막 점을 되돌립니다.
- **인물 배치** — 끌어다 놓기 또는 클릭 한 번. 새로 넣는 요소는 서로 겹치지 않게 조금씩 어긋나 놓입니다.
- **도형·경로 패턴 8종** — 직선·원형·대각선·삼각형·물결·S커브·8자·ㄴ자. 두 모드에서 모두 사용합니다.
- **패턴 직접 그리기** — 원하는 대형을 손으로 그려 내 패턴으로 저장합니다.
- **무대 메모** — 소품·조명·암전·대형 변경 같은 지시를 무대 위에 붙입니다. 더블클릭으로 내용을 고칩니다.
- **중앙 안내선 + 자동 스냅** — 가로·세로 중앙선에 가까워지면 캔바처럼 가운데로 정렬됩니다.

### 🎛️ 편집 흐름

- **선택 요소 편집 막대** — 요소를 클릭하면 복제·맨 앞으로·맨 뒤로·색상·회전 초기화·삭제가 한 줄로 뜹니다.
- **구간 복제** — 절/장면 카드의 복제 버튼으로 **앞 구간의 배치를 그대로 이어받아** 다음 구간을 만듭니다.
- **순서 바꾸기** — 카드 왼쪽 손잡이를 끌어 절·장면 순서를 바꿉니다. 손잡이에 포커스를 두고 <kbd>Space</kbd> → <kbd>방향키</kbd>로 키보드만으로도 가능합니다.
- **구간 바로가기** — 상단 칩으로 원하는 절·장으로 즉시 이동하고, 지금 작업 중인 무대가 항상 표시됩니다.
- **모드 전환** — 헤더에서 안무 ↔ 장면 모드를 바로 오갑니다.
- **실행취소/다시실행** (<kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd>), **복제** (<kbd>Ctrl</kbd>+<kbd>D</kbd>), **삭제** (<kbd>Del</kbd>), **이동** (<kbd>방향키</kbd>), **회전** (<kbd>[</kbd> <kbd>]</kbd>)
- **우클릭 메뉴** — 복제·복사·붙여넣기·삭제·되돌리기
- **자동 저장** — localStorage에 저장되고, 홈 화면에서 **이어서 작업하기**로 곧장 돌아갑니다.

### 🎵 안무 모드 (Choreography)

곡의 절 단위(#1, #2 …)로 무대 동선을 설계합니다. 블록마다 가사와 무대를 따로 관리하고, 도형·경로 팔레트가 먼저 열립니다.

### 🎬 장면 모드 (Scene)

장(章) 단위로 장면을 묶어 극 전체를 기획합니다. 장 그룹을 접고 펼치며, **한 줄에 1·2·3개** 중 골라 무대를 크게 보거나 여러 장면을 나란히 비교합니다.

### 📤 내보내기

- **PDF** — 가로 A4, 비율을 유지해 페이지에 맞추고 쪽 번호를 넣습니다. 각 장에 **제목과 인물 색 범례**가 함께 인쇄됩니다.
- **이미지(JPG)** — 절·장면 단위 또는 한꺼번에. 긴 가사도 잘리지 않게 펼쳐서 캡처합니다.
- **공유 링크** — 동선 전체를 압축해 URL에 담아(서버 없이) 복사합니다. 다른 기기에서 열어도 그대로 보입니다.
- **작업 파일(JSON)** — 저장·불러오기. 예전 버전 파일도 그대로 열립니다.
- **인쇄** — 브라우저 인쇄 시 편집 UI는 빠지고 내용만 나옵니다.

### 🗺️ 무대 방향 기준

9분할 무대 방향 안내를 제공하며, **배우 기준(연극 표준)** 과 **객석 기준** 을 전환할 수 있습니다.
`Stage Right`는 배우가 객석을 바라볼 때의 오른쪽이라 객석에서는 왼쪽에 보입니다 — 이 혼동을 없애기 위해 기본값은 배우 기준이며, 편집 화면과 홈에서 모두 바꿀 수 있습니다.

### ♿ 접근성 & 반응형

- 무대 위 요소를 <kbd>Tab</kbd>으로 선택하고 <kbd>방향키</kbd>로 옮길 수 있습니다.
- 본문 바로가기 링크, 명확한 포커스 표시, 무대 구역 라벨 대비 개선.
- OS의 *동작 줄이기* 설정을 존중합니다.
- **밝게 / 어둡게 / 시스템 설정** 테마를 지원합니다.
- 요소 좌표를 무대 크기 대비 **비율**로 저장하므로 휴대폰·데스크톱·내보내기에서 배치가 동일합니다.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 빌드 | Vite (SWC) |
| 스타일 | Tailwind CSS |
| UI 컴포넌트 | [shadcn-ui](https://ui.shadcn.com/) (Radix UI 기반) |
| 드래그 정렬 | [dnd-kit](https://github.com/clauderic/dnd-kit) — 포인터·키보드 모두 지원 |
| 테마 | [next-themes](https://github.com/pacocoursey/next-themes) |
| 애니메이션 | [Framer Motion](https://github.com/motiondivision/motion) |
| 내보내기 | [html2canvas](https://github.com/niklasvh/html2canvas), [jsPDF](https://github.com/parallax/jsPDF) (필요할 때만 동적 로드) |
| 링크 공유 | [lz-string](https://github.com/pieroxy/lz-string) (URL 압축) |
| 라우팅 | React Router v6 |
| 상태 관리 | React Hooks + localStorage |
| 테스트 | [Vitest](https://vitest.dev/) + Testing Library |

---

## 로컬 개발 환경 설정

Node.js 18 이상과 npm이 필요합니다.

```sh
# 1. 저장소 클론
git clone https://github.com/chichiboo123/musicalblockingnote.git
cd musicalblockingnote

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행 (http://localhost:8080/musicalblockingnote/)
npm run dev
```

### 주요 스크립트

```sh
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint 검사
npm test         # Vitest 단위 테스트
```

---

## 프로젝트 구조

```
src/
├── pages/
│   ├── MainPage.tsx            # 랜딩 (모드 선택 · 이어서 작업하기 · 무대 방향 안내)
│   ├── ChoreographyPage.tsx    # 안무 모드 (절 단위)
│   ├── ScenePage.tsx           # 장면 모드 (장 → 장면)
│   └── NotFound.tsx            # 404 페이지
├── components/
│   ├── StageGrid.tsx           # 무대 (배치·이동·크기·회전·스냅·이동 경로 그리기)
│   ├── FloatingPalette.tsx     # 하단 요소 팔레트 (인물 · 도형·경로 · 메모)
│   ├── CastEditor.tsx          # 등장인물 칩 관리 + 색상 지정
│   ├── SelectionToolbar.tsx    # 선택한 요소 편집 막대
│   ├── EditorHeader.tsx        # 두 모드가 함께 쓰는 상단 바
│   ├── SectionNav.tsx          # 구간 바로가기 칩
│   ├── SortableCard.tsx        # dnd-kit 정렬 카드 (절·장면)
│   ├── ExportHeader.tsx        # 내보내기 전용 제목·인물 범례
│   ├── ThemeToggle.tsx         # 밝게/어둡게/시스템
│   ├── DraggableElement.tsx    # 끌어다 놓기·클릭 추가 (터치 지원)
│   ├── DrawingCanvas.tsx       # 커스텀 패턴 드로잉
│   ├── RecommendedPaths.tsx    # 권장 도형·경로 목록
│   ├── BlockingContextMenu.tsx # 우클릭 메뉴
│   └── ui/                     # shadcn-ui 공통 컴포넌트
├── hooks/
│   ├── use-persistent-state.ts # localStorage 자동 저장 + 저장 상태
│   ├── use-undo-redo.ts        # 실행취소/다시실행
│   └── use-element-actions.ts  # 두 모드가 공유하는 요소 조작
├── lib/
│   ├── geometry.ts             # 비율 좌표 변환 · 경로 곡선 · 레거시 마이그레이션
│   ├── cast.ts                 # 등장인물 생성·색상·구버전 호환
│   ├── recent.ts               # 홈 "이어서 작업하기" 요약
│   ├── share.ts                # 링크 공유 인코딩/복사 (lz-string)
│   └── utils.ts                # 색상 대비, 파일명 등
├── types/
│   └── blocking.ts             # TypeScript 인터페이스 및 상수
└── utils/
    └── exportUtils.ts          # JPG/PDF 내보내기
```

---

## 데이터 호환성

이전 버전에서 만든 자동 저장·JSON 파일·공유 링크는 그대로 열립니다.

- 쉼표로 구분하던 `characters` 문자열은 색이 고정된 등장인물 목록으로 자동 변환됩니다.
- 픽셀로 저장되던 요소 좌표는 무대 대비 비율로 한 번만 다시 계산됩니다.
- 장 그룹이 없던 옛 장면 파일은 `1장` 하나로 묶여 열립니다.

---

## 배포

GitHub Pages에 자동 배포됩니다. `main` 브랜치에 푸시하면 GitHub Actions를 통해 빌드 후 배포됩니다.

SPA 라우팅을 위해 `public/404.html` 리다이렉트 핸들러가 포함되어 있습니다.

---

## 제작

**교육뮤지컬 꿈꾸는 치수쌤**이 뮤지컬 교육 현장에서 직접 사용하기 위해 제작한 도구입니다.
