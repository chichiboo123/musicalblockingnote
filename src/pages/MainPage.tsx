import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Music, Film } from "lucide-react";

const MainPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            🎭 뮤지컬 동선 노트
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Musical Blocking Note
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            무대 동선을 설계하세요
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            드래그 앤 드롭으로 배우의 움직임을 시각적으로 기획하고 문서화합니다.
          </p>
        </motion.div>

        {/* Mode selection */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mode-card group"
            onClick={() => navigate("/choreography")}
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Music className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">뮤지컬 안무 동선</h3>
            <p className="text-muted-foreground text-sm">
              가사에 맞춘 안무 동선을 절별로 계획합니다. 권장 경로 패턴과 사용자 정의 동선을 활용하세요.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="mode-card group"
            onClick={() => navigate("/scene")}
          >
            <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
              <Film className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">장면별 동선</h3>
            <p className="text-muted-foreground text-sm">
              장면 스크립트에 맞춰 배우 배치와 움직임을 기획합니다. 30가지 색상 캐릭터를 활용하세요.
            </p>
          </motion.div>
        </div>

        {/* Stage direction reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-md mx-auto"
        >
          <h3 className="text-center text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            무대 구분 명칭
          </h3>
          <div className="stage-grid aspect-[3/2] grid grid-cols-3 grid-rows-3 text-center text-xs">
            {[
              "Up Left (UL)", "Up Center (UC)", "Up Right (UR)",
              "Stage Left (SL)", "Center Stage (CS)", "Stage Right (SR)",
              "Down Left (DL)", "Down Center (DC)", "Down Right (DR)",
            ].map((label) => (
              <div key={label} className="stage-grid-line border flex items-center justify-center p-2">
                <span className="stage-label">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground px-2">
            <span>← 객석에서 보았을 때</span>
            <span>관객 쪽 →</span>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        교육뮤지컬 꿈꾸는 치수쌤 제작
      </footer>
    </div>
  );
};

export default MainPage;
