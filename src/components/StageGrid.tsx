import React, { useState, useCallback } from "react";
import type { BlockingElement, ContextMenuState } from "@/types/blocking";

interface StageGridProps {
  sectionIndex: number;
  elements: BlockingElement[];
  onElementDrop: (element: BlockingElement, sectionIndex: number) => void;
  onElementMove: (elementId: string, position: { x: number; y: number }, sectionIndex: number) => void;
  onElementRemove: (elementId: string, sectionIndex: number) => void;
  onContextMenu?: (state: ContextMenuState) => void;
  isChoreography?: boolean;
}

const STAGE_LABELS = [
  ["UL", "UC", "UR"],
  ["SL", "CS", "SR"],
  ["DL", "DC", "DR"],
];

const LABEL_FULL = [
  ["Up Left", "Up Center", "Up Right"],
  ["Stage Left", "Center Stage", "Stage Right"],
  ["Down Left", "Down Center", "Down Right"],
];

const StageGrid: React.FC<StageGridProps> = ({
  sectionIndex,
  elements,
  onElementDrop,
  onElementMove,
  onElementRemove,
  onContextMenu,
  isChoreography = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const jsonData = e.dataTransfer.getData("application/json");
      if (!jsonData) return;

      try {
        const data = JSON.parse(jsonData);
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const isPathOrCustom = data.type === "path" || data.type === "custom";
        const centerX = rect.width / 2 - 40;
        const centerY = rect.height / 2 - 40;

        const newElement: BlockingElement = {
          id: `${data.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: data.type,
          svg: data.svg,
          color: data.color,
          label: data.label,
          position: isChoreography && isPathOrCustom
            ? { x: centerX, y: centerY }
            : { x: x - 15, y: y - 15 },
          size: isPathOrCustom ? { width: 80, height: 80 } : { width: 30, height: 30 },
          rotation: 0,
        };

        onElementDrop(newElement, sectionIndex);
      } catch (err) {
        console.error("Drop error:", err);
      }
    },
    [sectionIndex, onElementDrop, isChoreography]
  );

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = elements.find((el) => el.id === elementId);
    if (!el) return;

    setDraggingId(elementId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      onElementMove(draggingId, { x, y }, sectionIndex);
    },
    [draggingId, dragOffset, onElementMove, sectionIndex]
  );

  const handleMouseUp = () => setDraggingId(null);

  const handleContextMenu = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    onContextMenu?.({
      show: true,
      x: e.clientX,
      y: e.clientY,
      targetId: elementId,
      sectionIndex,
    });
  };

  return (
    <div
      className={`stage-grid relative w-full aspect-[3/2] select-none overflow-hidden ${
        isDragOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid lines */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
        {STAGE_LABELS.flat().map((label, i) => (
          <div
            key={i}
            className="stage-grid-line border flex items-center justify-center"
          >
            <span className="stage-label text-[10px] opacity-60" title={LABEL_FULL[Math.floor(i / 3)][i % 3]}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Stage direction labels */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 stage-label text-[10px]">무대 뒤 (Upstage)</div>
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 stage-label text-[10px]">객석 (Downstage)</div>

      {/* Elements */}
      {elements.map((el) => (
        <div
          key={el.id}
          data-draggable
          className="absolute cursor-move"
          style={{
            left: el.position.x,
            top: el.position.y,
            width: el.size?.width || 30,
            height: el.size?.height || 30,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          }}
          onMouseDown={(e) => handleElementMouseDown(e, el.id)}
          onContextMenu={(e) => handleContextMenu(e, el.id)}
        >
          {el.type === "character" ? (
            <div className="flex flex-col items-center" title={el.label}>
              <svg width={el.size?.width || 30} height={el.size?.height || 30} viewBox="0 0 24 24" fill={el.color || "#333"}>
                <circle cx="12" cy="6" r="4" />
                <path d="M12 12c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
              </svg>
              {el.label && (
                <span className="text-[8px] font-medium leading-none mt-0.5 whitespace-nowrap max-w-[50px] truncate text-center" style={{ color: el.color }}>
                  {el.label}
                </span>
              )}
            </div>
          ) : (
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: el.svg || "" }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default StageGrid;
