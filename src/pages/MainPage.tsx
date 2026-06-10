import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Music, Film, Play } from "lucide-react";
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
          <h3 className="text-center text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
            무대 구분 명칭
          </h3>
          <div className="relative">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
              무대 뒤 (Upstage)
            </div>
            <div className="stage-grid aspect-[3/2] grid grid-cols-3 grid-rows-3 text-center text-xs">
              {[
                "Up Left (UL)", "Up Center (UC)", "Up Right (UR)",
                "Stage Left (SL)", "Center Stage (CS)", "Stage Right (SR)",
                "Down Left (DL)", "Down Center (DC)", "Down Right (DR)",
              ].map((label) => (
                <div key={label} className="stage-grid-line border flex items-center justify-center p-2">
                  <span className="stage-label text-[10px]">{label}</span>
                </div>
              ))}
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
              객석 (Downstage)
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-8 leading-relaxed">
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
