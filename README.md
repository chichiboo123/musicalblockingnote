# 🎭 뮤지컬 동선 노트 (Musical Blocking Note)

> 뮤지컬 제작자와 안무가를 위한 무대 동선 설계 웹 도구

드래그 앤 드롭으로 배우의 움직임을 시각적으로 기획하고, JPG·PDF로 내보내거나 JSON으로 저장·불러올 수 있습니다.

---

## 주요 기능

### 🎵 안무 모드 (Choreography)
곡의 절(verse) 단위로 무대 동선을 설계합니다.

- 프로젝트 제목 및 등장인물 목록 설정
- 절마다 가사와 무대 그리드를 독립적으로 관리
- 추천 이동 패턴 8종 (직선·원형·대각선·삼각형·파형·S커브·8자·L자)
- 커스텀 패턴 직접 그리기 (캔버스 드로잉)
- 실행취소/다시실행 (Ctrl+Z / Ctrl+Y)
- 우클릭 컨텍스트 메뉴 (복사·붙여넣기·삭제)
- 절 단위 JPG 내보내기 / 전체 PDF 내보내기
- JSON 저장·불러오기 및 자동 저장 (localStorage)

### 🎬 장면 모드 (Scene)
연극·뮤지컬의 장면(scene) 단위로 동선을 기획합니다.

- 장면별 등장인물과 배치를 개별 관리
- 2열 그리드 레이아웃으로 여러 장면을 한눈에 비교
- 30색 캐릭터 팔레트로 배우 구분
- 안무 모드와 동일한 내보내기·저장 기능

### 🗺️ 무대 방향 기준
9분할 무대 방향 안내(상·중·하 × 좌·중·우)를 기본 제공하여 연출 용어를 통일합니다.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 빌드 | Vite (SWC) |
| 스타일 | Tailwind CSS |
| UI 컴포넌트 | shadcn-ui (Radix UI 기반) |
| 애니메이션 | Framer Motion |
| 내보내기 | html2canvas, jsPDF |
| 라우팅 | React Router v6 |
| 상태 관리 | React Hooks + localStorage |
| 테스트 | Vitest |

---

## 로컬 개발 환경 설정

Node.js 18 이상과 npm이 필요합니다.

```sh
# 1. 저장소 클론
git clone https://github.com/chichiboo123/musicalblockingnote.git
cd musicalblockingnote

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행 (http://localhost:5173)
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
│   ├── MainPage.tsx          # 메인 랜딩 페이지
│   ├── ChoreographyPage.tsx  # 안무 모드 (절 단위)
│   ├── ScenePage.tsx         # 장면 모드 (장면 단위)
│   └── NotFound.tsx          # 404 페이지
├── components/
│   ├── StageGrid.tsx         # 드래그 앤 드롭 무대 그리드
│   ├── DraggableElement.tsx  # 드래그 가능 요소 (터치 지원)
│   ├── DrawingCanvas.tsx     # 커스텀 패턴 드로잉 캔버스
│   ├── PersonIcon.tsx        # 캐릭터 아이콘
│   ├── RecommendedPaths.tsx  # 추천 이동 패턴 목록
│   ├── BlockingContextMenu.tsx # 우클릭 컨텍스트 메뉴
│   └── ui/                  # shadcn-ui 공통 컴포넌트
├── hooks/
│   ├── use-persistent-state.ts  # localStorage 자동 저장
│   └── use-undo-redo.ts         # 실행취소/다시실행
├── types/
│   └── blocking.ts           # TypeScript 인터페이스 및 상수
└── utils/
    └── exportUtils.ts        # JPG/PDF 내보내기 유틸
```

---

## 배포

GitHub Pages에 자동 배포됩니다. `main` 브랜치에 푸시하면 GitHub Actions를 통해 빌드 후 배포됩니다.

SPA 라우팅을 위해 `public/404.html` 리다이렉트 핸들러가 포함되어 있습니다.

---

## 제작

**교육뮤지컬 꿈꾸는 치수쌤**이 뮤지컬 교육 현장에서 직접 사용하기 위해 제작한 도구입니다.
