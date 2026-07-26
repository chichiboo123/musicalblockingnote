import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Music, Film, Play, MousePointerClick, Download, ArrowRight, History,
  Spline, ChevronDown, Compass,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { readSavedProjects } from "@/lib/recent";
import type { StageOrientation } from "@/types/blocking";
import dancingIcon from "@/assets/dancing-icon.png";

const MODES = [
  {
    key: "choreography" as const,
    path: "/choreography",
    icon: Music,
    tone: "primary",
    title: "뮤지컬 안무 동선",
    desc: "가사 한 절마다 무대를 하나씩. 도형·경로 패턴과 직접 그린 패턴으로 군무 대형을 잡습니다.",
    bullets: ["절 단위 블록", "권장 경로 8종", "패턴 직접 그리기"],
  },
  {
    key: "scene" as const,
    path: "/scene",
    icon: Film,
    tone: "secondary",
    title: "장면별 동선",
    desc: "장(章)으로 장면을 묶어 극 전체를 한눈에. 여러 장면을 나란히 놓고 비교하며 기획합니다.",
    bullets: ["장 그룹으로 묶기", "여러 장면 나란히", "열 수 조절"],
  },
];

const STEPS = [
  {
    icon: MousePointerClick,
    title: "등장인물 만들기",
    desc: "이름을 입력하면 색이 붙은 인물 칩이 생깁니다. 색은 언제든 바꿀 수 있어요.",
  },
  {
    icon: Spline,
    title: "무대에 놓고 이어 그리기",
    desc: "인물을 무대로 끌어다 놓고, 이동 경로를 클릭으로 이어 그려 동선을 표시합니다.",
  },
  {
    icon: Download,
    title: "저장·공유하기",
    desc: "자동 저장되며 이미지·PDF·공유 링크·작업 파일로 언제든 내보낼 수 있습니다.",
  },
];

const MainPage = () => {
  const navigate = useNavigate();
  const saved = useMemo(() => readSavedProjects(), []);
  const [orientation, setOrientation] = useState<StageOrientation>("performer");
  const [guideOpen, setGuideOpen] = useState(false);

  const zones =
    orientation === "performer"
      ? [
          "Up Right (UR)", "Up Center (UC)", "Up Left (UL)",
          "Stage Right (SR)", "Center Stage (CS)", "Stage Left (SL)",
          "Down Right (DR)", "Down Center (DC)", "Down Left (DL)",
        ]
      : [
          "Up Left (UL)", "Up Center (UC)", "Up Right (UR)",
          "Stage Left (SL)", "Center Stage (CS)", "Stage Right (SR)",
          "Down Left (DL)", "Down Center (DC)", "Down Right (DR)",
        ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass-header sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <img src={dancingIcon} alt="" className="w-8 h-8" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">뮤지컬 동선 노트</h1>
            <p className="text-[11px] text-muted-foreground">Musical Blocking Note</p>
          </div>
          <div className="flex-1" />
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="flex-1 container mx-auto px-4 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">
            <img src={dancingIcon} alt="" className="w-4 h-4" />
            끌어다 놓고, 이어 그리면 끝
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 tracking-tight">
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
              뮤지컬 동선 노트
            </span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            배우의 자리와 <strong className="text-foreground">이동 경로</strong>를 무대 위에 그리고,
            이미지·PDF·링크로 공유하세요.
          </p>
        </motion.div>

        {/* Resume — autosaved work used to be invisible from here */}
        {saved.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="max-w-3xl mx-auto mb-8"
            aria-labelledby="resume-heading"
          >
            <h3 id="resume-heading" className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-2.5">
              <History className="w-4 h-4 text-primary" />
              이어서 작업하기
            </h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {saved.map((p) => (
                <li key={p.mode}>
                  <button
                    type="button"
                    onClick={() => navigate(p.path)}
                    className="w-full text-left section-card !p-4 flex items-center gap-3 hover:border-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      {p.mode === "choreography" ? (
                        <Music className="w-5 h-5 text-primary" />
                      ) : (
                        <Film className="w-5 h-5 text-primary" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-sm text-foreground truncate">{p.title}</span>
                      <span className="block text-xs text-muted-foreground">{p.summary}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {/* Mode selection */}
        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto mb-12">
          {MODES.map((mode, i) => {
            const Icon = mode.icon;
            return (
              <motion.button
                key={mode.key}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                className="mode-card group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => navigate(mode.path)}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                    mode.tone === "primary" ? "bg-primary/10 group-hover:bg-primary/20" : "bg-secondary/10 group-hover:bg-secondary/20"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${mode.tone === "primary" ? "text-primary" : "text-secondary"}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1.5">{mode.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">{mode.desc}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {mode.bullets.map((b) => (
                    <li key={b} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {b}
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  시작하기 <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* How to use */}
        <section className="max-w-3xl mx-auto mb-12" aria-labelledby="howto-heading">
          <h3 id="howto-heading" className="text-center text-base font-bold text-foreground mb-5">
            3단계면 충분해요
          </h3>
          <ol className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="section-card flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary mb-1">STEP {i + 1}</span>
                  <h4 className="text-sm font-bold text-foreground mb-1.5">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Reference material, collapsed by default so it never buries the CTA */}
        <section className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            aria-expanded={guideOpen}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              무대 방향 용어와 사용법 영상
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${guideOpen ? "rotate-180" : ""}`} />
          </button>

          {guideOpen && (
            <div className="mt-4 space-y-8">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-bold text-foreground">무대 구분 명칭</h4>
                  <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
                    {(["performer", "audience"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setOrientation(key)}
                        aria-pressed={orientation === key}
                        className={`rounded-md px-2 py-1 font-medium transition-colors ${
                          orientation === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        {key === "performer" ? "배우 기준" : "객석 기준"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                  <span className="text-xs font-medium text-muted-foreground">무대 뒤 (Upstage)</span>
                  <div className="stage-grid w-full aspect-[3/2] grid grid-cols-3 grid-rows-3 text-center">
                    {zones.map((label) => (
                      <div key={label} className="stage-grid-line border flex items-center justify-center p-1.5">
                        <span className="stage-label text-[11px] leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">객석 (Downstage)</span>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed">
                  {orientation === "performer" ? (
                    <>
                      ※ 연극의 표준은 <strong className="text-foreground">배우가 객석을 바라본 시점</strong>입니다.
                      객석에서 보면 좌·우가 반대로 보입니다.
                    </>
                  ) : (
                    <>
                      ※ <strong className="text-foreground">객석에서 무대를 본 시점</strong>입니다.
                      배우에게 안내할 때는 좌·우가 반대라는 점에 주의하세요.
                    </>
                  )}
                  {" "}이 설정은 편집 화면에서도 바꿀 수 있습니다.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-bold text-foreground">사용법 가이드 영상</h4>
                </div>
                <div className="section-card p-0 overflow-hidden">
                  <div className="aspect-video">
                    <iframe
                      src="https://www.youtube.com/embed/-8XIclLTR4c"
                      title="뮤지컬 동선 노트 사용법 가이드"
                      className="w-full h-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        교육뮤지컬 꿈꾸는 치수쌤 제작
      </footer>
    </div>
  );
};

export default MainPage;
