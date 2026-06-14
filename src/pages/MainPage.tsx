import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Music, Film, Play, MousePointerClick, Download } from "lucide-react";
import dancingIcon from "@/assets/dancing-icon.png";

const MainPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass-header sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <img src={dancingIcon} alt="Dancing icon" className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">
              뮤지컬 동선 노트
            </h1>
            <p className="text-xs text-muted-foreground">
              Musical Blocking Note
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-14"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
          >
            <img src={dancingIcon} alt="" className="w-4 h-4" />
            드래그 앤 드롭으로 쉽게
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-primary)' }}>
              뮤지컬 동선 노트
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            무대 위 배우들의 움직임을 시각적으로 계획하고, 이미지·PDF로 내보내세요.
          </p>
        </motion.div>

        {/* Mode selection */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mode-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            role="button"
            tabIndex={0}
            aria-label="뮤지컬 안무 동선 모드로 이동"
            onClick={() => navigate("/choreography")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/choreography");
              }
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
              <Music className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">뮤지컬 안무 동선</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              가사에 맞춘 안무 동선을 절별로 계획합니다. 권장 경로 패턴과 사용자 정의 동선을 활용하세요.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mode-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            role="button"
            tabIndex={0}
            aria-label="장면별 동선 모드로 이동"
            onClick={() => navigate("/scene")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/scene");
              }
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-5 group-hover:bg-secondary/20 transition-colors">
              <Film className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">장면별 동선</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              장면 스크립트에 맞춰 배우 배치와 움직임을 기획합니다. 30가지 색상 캐릭터를 활용하세요.
            </p>
          </motion.div>
        </div>

        {/* How to use */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <h3 className="text-center text-lg font-bold text-foreground mb-6">사용법 3단계</h3>
          <ol className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: <MousePointerClick className="w-6 h-6 text-primary" />,
                step: "1",
                title: "캐릭터 만들기",
                desc: "제목과 캐릭터 이름을 입력하면 색깔 아이콘이 자동으로 만들어집니다.",
              },
              {
                icon: <Music className="w-6 h-6 text-primary" />,
                step: "2",
                title: "무대에 배치하기",
                desc: "아이콘과 경로를 무대로 끌어다 놓고 위치·크기를 자유롭게 조절하세요.",
              },
              {
                icon: <Download className="w-6 h-6 text-primary" />,
                step: "3",
                title: "저장·내보내기",
                desc: "작업은 자동 저장되며, 이미지(JPG)·PDF·파일(JSON)로 내보낼 수 있습니다.",
              },
            ].map((item) => (
              <li key={item.step} className="section-card flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-primary mb-1">STEP {item.step}</span>
                <h4 className="text-base font-bold text-foreground mb-1.5">{item.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </li>
            ))}
          </ol>
        </motion.div>

        {/* YouTube Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Play className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">사용법 가이드 영상</h3>
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
        </motion.div>

        {/* Stage direction reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="max-w-sm mx-auto"
        >
          <h3 className="text-center text-sm font-bold text-foreground mb-4">
            무대 구분 명칭
          </h3>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              무대 뒤 (Upstage)
            </span>
            <div className="stage-grid w-full aspect-[3/2] grid grid-cols-3 grid-rows-3 text-center">
              {[
                "Up Left (UL)", "Up Center (UC)", "Up Right (UR)",
                "Stage Left (SL)", "Center Stage (CS)", "Stage Right (SR)",
                "Down Left (DL)", "Down Center (DC)", "Down Right (DR)",
              ].map((label) => (
                <div key={label} className="stage-grid-line border flex items-center justify-center p-1.5">
                  <span className="stage-label text-[11px] leading-tight">{label}</span>
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              객석 (Downstage)
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-5 leading-relaxed">
            ※ 좌·우 방향은 <strong className="text-foreground">객석에서 무대를 본 시점</strong>을 기준으로 합니다.
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        교육뮤지컬 꿈꾸는 치수쌤 제작
      </footer>
    </div>
  );
};

export default MainPage;
