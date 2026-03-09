import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BlockingProvider } from "@/contexts/BlockingContext";
import MainPage from "./pages/MainPage";
import ChoreographyPage from "./pages/ChoreographyPage";
import ScenePage from "./pages/ScenePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BlockingProvider>
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
      </BlockingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
