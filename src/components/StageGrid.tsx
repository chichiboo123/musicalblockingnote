import React, { useState, useCallback, useRef, useEffect } from "react";
import { readableTextColor } from "@/lib/utils";
import type { BlockingElement, ContextMenuState } from "@/types/blocking";

interface StageGridProps {
  sectionIndex: number;
  elements: BlockingElement[];
  onElementDrop: (element: BlockingElement, sectionIndex: number) => void;
  onElementMove: (elementId: string, position: { x: number; y: number }, sectionIndex: number) => void;
  onElementRemove: (elementId: string, sectionIndex: number) => void;
  onElementResize?: (elementId: string, size: { width: number; height: number }, sectionIndex: number) => void;
  onContextMenu?: (state: ContextMenuState) => void;
  onMoveStart?: () => void;
  compact?: boolean;
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
  onElementResize,
  onContextMenu,
  onMoveStart,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const movedRef = useRef(false);

  const setSelectedId = useCallback(
    (id: string | null) => {
      setSelectedIdState(id);
      if (id) {
        window.dispatchEvent(
          new CustomEvent("blocking-selection", { detail: { sectionIndex } })
        );
      }
    },
    [sectionIndex]
  );

  useEffect(() => {
    const onOtherSelection = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.sectionIndex !== sectionIndex) {
        setSelectedIdState(null);
      }
    };
    window.addEventListener("blocking-selection", onOtherSelection);
    return () => window.removeEventListener("blocking-selection", onOtherSelection);
  }, [sectionIndex]);

  const clampPosition = useCallback(
    (x: number, y: number, w: number, h: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x, y };
      // Keep at least 20% of element visible inside the stage
      const minX = -w * 0.8;
      const minY = -h * 0.8;
      const maxX = rect.width - w * 0.2;
      const maxY = rect.height - h * 0.2;
      return {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY),
      };
    },
    []
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const performDrop = useCallback(
    (data: { type: BlockingElement["type"]; svg?: string; color?: string; label?: string }, clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const isPathOrCustom = data.type === "path" || data.type === "custom";
      const size = isPathOrCustom ? { width: 80, height: 80 } : { width: 30, height: 30 };
      const position = clampPosition(x - size.width / 2, y - size.height / 2, size.width, size.height);

      const newElement: BlockingElement = {
        id: `${data.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: data.type,
        svg: data.svg,
        color: data.color,
        label: data.label,
        position,
        size,
        rotation: 0,
      };

      onElementDrop(newElement, sectionIndex);
      setSelectedId(newElement.id);
    },
    [sectionIndex, onElementDrop, clampPosition, setSelectedId]
  );

  // Listen for touch-based drops dispatched from DraggableElement
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onTouchDrop = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      performDrop(
        { type: detail.type, svg: detail.svg, color: detail.color, label: detail.label },
        detail.clientX,
        detail.clientY
      );
    };
    node.addEventListener("blocking-touch-drop", onTouchDrop);
    return () => node.removeEventListener("blocking-touch-drop", onTouchDrop);
  }, [performDrop]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const jsonData = e.dataTransfer.getData("application/json");
      if (!jsonData) return;

      try {
        const data = JSON.parse(jsonData);
        performDrop(data, e.clientX, e.clientY);
      } catch (err) {
        console.error("Drop error:", err);
      }
    },
    [performDrop]
  );

  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const beginPointerDrag = (e: React.PointerEvent, elementId: string) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.stopPropagation();
    const el = elements.find((el) => el.id === elementId);
    if (!el) return;

    setDraggingId(elementId);
    setSelectedId(elementId);
    movedRef.current = false;
    longPressFiredRef.current = false;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    // Long-press to open context menu on touch
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      const clientX = e.clientX;
      const clientY = e.clientY;
      cancelLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        if (!movedRef.current) {
          longPressFiredRef.current = true;
          onContextMenu?.({
            show: true,
            x: clientX,
            y: clientY,
            targetId: elementId,
            sectionIndex,
          });
        }
      }, 500);
    }
  };

  const beginResize = (e: React.PointerEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find((el) => el.id === elementId);
    if (!el) return;
    setResizingId(elementId);
    movedRef.current = false;
    setResizeStart({ x: e.clientX, y: e.clientY, w: el.size?.width || 80, h: el.size?.height || 80 });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (resizingId && onElementResize) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        const newW = Math.max(30, Math.min(rect.width, resizeStart.w + dx));
        const newH = Math.max(30, Math.min(rect.height, resizeStart.h + dy));
        // Snapshot pre-resize state on the first movement so a single undo reverts it
        if (!movedRef.current) onMoveStart?.();
        movedRef.current = true;
        onElementResize(resizingId, { width: newW, height: newH }, sectionIndex);
        return;
      }
      if (!draggingId) return;
      const el = elements.find((e) => e.id === draggingId);
      const w = el?.size?.width || 30;
      const h = el?.size?.height || 30;
      const rawX = e.clientX - rect.left - dragOffset.x;
      const rawY = e.clientY - rect.top - dragOffset.y;
      const pos = clampPosition(rawX, rawY, w, h);
      if (!movedRef.current) onMoveStart?.();
      movedRef.current = true;
      cancelLongPress();
      onElementMove(draggingId, pos, sectionIndex);
    },
    [draggingId, dragOffset, onElementMove, sectionIndex, resizingId, resizeStart, onElementResize, elements, clampPosition, cancelLongPress, onMoveStart]
  );

  const handlePointerUp = () => {
    cancelLongPress();
    setDraggingId(null);
    setResizingId(null);
    movedRef.current = false;
  };

  const handleContextMenu = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(elementId);
    onContextMenu?.({
      show: true,
      x: e.clientX,
      y: e.clientY,
      targetId: elementId,
      sectionIndex,
    });
  };

  const handleStageClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  };

  // Right-click on empty stage area: open menu for paste/undo/redo
  const handleStageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.({
      show: true,
      x: e.clientX,
      y: e.clientY,
      targetId: null,
      sectionIndex,
    });
  };

  // Group consecutive arrow-key moves into one undo step
  const arrowBurstTimerRef = useRef<number | null>(null);

  // Keyboard delete for selected element
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onElementRemove(selectedId, sectionIndex);
        setSelectedId(null);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        const el = elements.find((el) => el.id === selectedId);
        if (!el) return;
        e.preventDefault();
        if (arrowBurstTimerRef.current == null) {
          onMoveStart?.();
        } else {
          window.clearTimeout(arrowBurstTimerRef.current);
        }
        arrowBurstTimerRef.current = window.setTimeout(() => {
          arrowBurstTimerRef.current = null;
        }, 800);
        const step = e.shiftKey ? 10 : 2;
        const w = el.size?.width || 30;
        const h = el.size?.height || 30;
        let { x, y } = el.position;
        if (e.key === "ArrowLeft") x -= step;
        if (e.key === "ArrowRight") x += step;
        if (e.key === "ArrowUp") y -= step;
        if (e.key === "ArrowDown") y += step;
        const pos = clampPosition(x, y, w, h);
        onElementMove(selectedId, pos, sectionIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // setSelectedId is stable enough (depends only on sectionIndex which is in deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, elements, onElementRemove, onElementMove, sectionIndex, clampPosition, onMoveStart]);

  return (
    <div className={`relative my-5 w-full ${compact ? "max-w-[360px]" : ""}`}>
      {/* Stage direction labels (outside the clipped stage box so they stay visible) */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 stage-label text-[9px] pointer-events-none whitespace-nowrap">무대 뒤 (Upstage)</div>
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 stage-label text-[9px] pointer-events-none whitespace-nowrap">객석 (Downstage)</div>

    <div
      ref={containerRef}
      className={`stage-grid relative w-full select-none overflow-hidden touch-none aspect-[3/2] ${
        isDragOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleStageClick}
      onContextMenu={handleStageContextMenu}
    >
      {/* Grid lines */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
        {STAGE_LABELS.flat().map((label, i) => (
          <div
            key={i}
            className="stage-grid-line border flex items-start justify-start p-1"
          >
            <span className="stage-label text-[10px] opacity-40" title={LABEL_FULL[Math.floor(i / 3)][i % 3]}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Elements */}
      {elements.map((el) => {
        const isPathOrCustom = el.type === "path" || el.type === "custom";
        const isSelected = selectedId === el.id;
        return (
          <div
            key={el.id}
            data-draggable
            data-selected={isSelected ? "true" : undefined}
            className={`absolute cursor-move group ${draggingId === el.id ? "z-20 opacity-80" : isSelected ? "z-20" : "z-10"} ${
              isSelected ? "ring-2 ring-primary/70 ring-offset-1 rounded-sm" : ""
            }`}
            style={{
              left: el.position.x,
              top: el.position.y,
              width: el.size?.width || 30,
              height: el.size?.height || 30,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              touchAction: "none",
            }}
            onPointerDown={(e) => beginPointerDrag(e, el.id)}
            onContextMenu={(e) => handleContextMenu(e, el.id)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(el.id);
            }}
          >
            {el.type === "character" ? (
              <div className="flex flex-col items-center pointer-events-none" title={el.label}>
                <svg width={el.size?.width || 30} height={el.size?.height || 30} viewBox="0 0 24 24" fill={el.color || "#333"}>
                  <circle cx="12" cy="6" r="4" />
                  <path d="M12 12c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
                </svg>
                {el.label && (
                  <span
                    className="text-[10px] font-bold leading-tight mt-0.5 whitespace-nowrap max-w-[64px] truncate text-center px-1 rounded bg-white/85"
                    style={{ color: readableTextColor(el.color) }}
                  >
                    {el.label}
                  </span>
                )}
              </div>
            ) : (
              <div
                className="w-full h-full pointer-events-none"
                dangerouslySetInnerHTML={{ __html: el.svg || "" }}
              />
            )}
            {/* Resize handle for path/custom in choreography */}
            {isPathOrCustom && onElementResize && (
              <div
                data-resize-handle
                aria-label="크기 조절"
                className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity shadow ring-2 ring-background touch-none"
                data-selected={isSelected ? "true" : undefined}
                onPointerDown={(e) => beginResize(e, el.id)}
              />
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
};

export default StageGrid;
