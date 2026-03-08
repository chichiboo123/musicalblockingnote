import React, { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface DrawingCanvasProps {
  onSavePattern: (svg: string) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSavePattern }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<{ x: number; y: number }[][]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 300,
      y: ((e.clientY - rect.top) / rect.height) * 300,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    setCurrentPath([getPos(e)]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    setCurrentPath((prev) => [...prev, pos]);
    drawAll([...paths, [...currentPath, pos]]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setPaths((prev) => [...prev, currentPath]);
    }
    setCurrentPath([]);
  };

  const drawAll = useCallback((allPaths: { x: number; y: number }[][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 300, 300);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    allPaths.forEach((path) => {
      if (path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      path.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });
  }, []);

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 300, 300);
    }
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

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full aspect-square border border-border rounded-lg cursor-crosshair bg-card"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleClear} className="flex-1">
          지우기
        </Button>
        <Button size="sm" onClick={handleSave} className="flex-1">
          패턴 저장
        </Button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
