import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="mb-3 text-6xl font-extrabold bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
          404
        </h1>
        <p className="mb-2 text-xl font-semibold text-foreground">페이지를 찾을 수 없습니다</p>
        <p className="mb-6 text-sm text-muted-foreground">
          요청하신 주소가 잘못되었거나, 페이지가 이동되었을 수 있어요.
        </p>
        <Button onClick={() => navigate("/")} size="lg">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> 홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
