import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import ChoreographyPage from "./pages/ChoreographyPage";
import ScenePage from "./pages/ScenePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/musicalblockingnote">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/choreography" element={<ChoreographyPage />} />
            <Route path="/scene" element={<ScenePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
