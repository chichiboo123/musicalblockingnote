import React, { useRef, useState, useCallback, useEffect } from "react";
import { Undo2, Eraser, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DrawingCanvasProps {
  onSavePattern: (svg: string) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSavePattern }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<{ x: number; y: number }[][]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 300,
      y: ((e.clientY - rect.top) / rect.height) * 300,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setCurrentPath([getPos(e)]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    setCurrentPath((prev) => [...prev, pos]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setPaths((prev) => [...prev, currentPath]);
    }
    setCurrentPath([]);
  };

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 300, 300);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const all = [...paths, ...(currentPath.length > 1 ? [currentPath] : [])];
    all.forEach((path) => {
      if (path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      path.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    if (all.length === 0) {
      ctx.fillStyle = "rgba(120,120,140,0.45)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("여기에 원하는 동선 패턴을 그려보세요", 150, 150);
    }
  }, [paths, currentPath]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const handleUndoStroke = () => {
    setPaths((prev) => prev.slice(0, -1));
  };

  const handleSave = () => {
    if (paths.length === 0) return;
    const svgPaths = paths
      .map((path) => {
        const d = path.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
        return `<path d="${d}" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      })
      .join("");
    const svg = `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">${svgPaths}</svg>`;
    onSavePattern(svg);
    handleClear();
  };

  const hasContent = paths.length > 0;

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full aspect-square border border-border rounded-lg cursor-crosshair bg-card touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={handleUndoStroke}
          disabled={paths.length === 0}
          title="한 획 되돌리기"
          aria-label="한 획 되돌리기"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={!hasContent}
          className="flex-1"
        >
          <Eraser className="w-3.5 h-3.5 mr-1" /> 전체 지우기
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!hasContent} className="flex-1">
          <Save className="w-3.5 h-3.5 mr-1" /> 저장
        </Button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
