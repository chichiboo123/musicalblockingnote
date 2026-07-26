import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { RotateCw, Check, X } from "lucide-react";
import { readableTextColor } from "@/lib/utils";
import {
  DEFAULT_SIZE_PCT, MIN_SIZE_PCT, distanceToPolyline, migrateElements,
  pointToPx, pxToPct, smoothPath, toPxRect, type Rect,
} from "@/lib/geometry";
import type { BlockingElement, ContextMenuState, StageOrientation, StagePoint } from "@/types/blocking";

export interface DrawingRequest {
  color: string;
  label?: string;
  /** Optional start point (percent) — e.g. the selected actor's current spot. */
  start?: StagePoint;
}

interface StageGridProps {
  sectionIndex: number;
  elements: BlockingElement[];
  onElementDrop: (element: BlockingElement, sectionIndex: number) => void;
  onElementMove: (elementId: string, position: { x: number; y: number }, sectionIndex: number) => void;
  onElementRemove: (elementId: string, sectionIndex: number) => void;
  onElementResize?: (elementId: string, size: { width: number; height: number }, sectionIndex: number) => void;
  onElementRotate?: (elementId: string, rotation: number, sectionIndex: number) => void;
  onContextMenu?: (state: ContextMenuState) => void;
  onMoveStart?: () => void;
  onActivate?: (sectionIndex: number) => void;
  onSelectionChange?: (element: BlockingElement | null, sectionIndex: number) => void;
  /** Double-click on a staged element — used to edit note text in place. */
  onElementActivate?: (element: BlockingElement, sectionIndex: number) => void;
  /** Emitted once when legacy pixel coordinates are rescaled to percentages. */
  onMigrate?: (sectionIndex: number, elements: BlockingElement[]) => void;
  /** Non-null only for the stage that is currently capturing a movement path. */
  drawing?: DrawingRequest | null;
  onDrawFinish?: (points: StagePoint[]) => void;
  onDrawCancel?: () => void;
  compact?: boolean;
  showCenterGuides?: boolean;
  orientation?: StageOrientation;
  /** Highlights the stage that palette clicks and shortcuts will act on. */
  isActive?: boolean;
}

const SNAP_THRESHOLD = 1.4; // percent of the stage box

/** Column labels left→right. Theatre convention is the performer's own left/right. */
const LABELS: Record<StageOrientation, { short: string[][]; full: string[][] }> = {
  performer: {
    short: [
      ["UR", "UC", "UL"],
      ["SR", "CS", "SL"],
      ["DR", "DC", "DL"],
    ],
    full: [
      ["Up Right", "Up Center", "Up Left"],
      ["Stage Right", "Center Stage", "Stage Left"],
      ["Down Right", "Down Center", "Down Left"],
    ],
  },
  audience: {
    short: [
      ["UL", "UC", "UR"],
      ["SL", "CS", "SR"],
      ["DL", "DC", "DR"],
    ],
    full: [
      ["Up Left", "Up Center", "Up Right"],
      ["Stage Left", "Center Stage", "Stage Right"],
      ["Down Left", "Down Center", "Down Right"],
    ],
  },
};

const StageGrid: React.FC<StageGridProps> = ({
  sectionIndex,
  elements,
  onElementDrop,
  onElementMove,
  onElementRemove,
  onElementResize,
  onElementRotate,
  onContextMenu,
  onMoveStart,
  onActivate,
  onSelectionChange,
  onElementActivate,
  onMigrate,
  drawing = null,
  onDrawFinish,
  onDrawCancel,
  compact = false,
  showCenterGuides = false,
  orientation = "performer",
  isActive = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect>({ width: 0, height: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [snap, setSnap] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const [draft, setDraft] = useState<StagePoint[]>([]);
  const [hoverPoint, setHoverPoint] = useState<StagePoint | null>(null);
  const movedRef = useRef(false);

  const labels = LABELS[orientation];

  // Track the stage box so percentage geometry can be projected to pixels.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const measure = () => {
      const r = node.getBoundingClientRect();
      setRect((prev) => (prev.width === r.width && prev.height === r.height ? prev : { width: r.width, height: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Rescale legacy pixel coordinates exactly once per section.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current || !onMigrate) return;
    if (elements.length === 0 || elements.every((el) => el.u === "%")) return;
    migratedRef.current = true;
    onMigrate(sectionIndex, migrateElements(elements));
  }, [elements, onMigrate, sectionIndex]);

  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedId) ?? null,
    [elements, selectedId]
  );

  const setSelectedId = useCallback(
    (id: string | null) => {
      setSelectedIdState(id);
      if (id) {
        window.dispatchEvent(new CustomEvent("blocking-selection", { detail: { sectionIndex } }));
      }
    },
    [sectionIndex]
  );

  useEffect(() => {
    onSelectionChange?.(selectedElement, sectionIndex);
    // Only announce real selection changes, not every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement?.id, selectedElement?.rotation, selectedElement?.color, sectionIndex]);

  useEffect(() => {
    const onOtherSelection = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.sectionIndex !== sectionIndex) setSelectedIdState(null);
    };
    window.addEventListener("blocking-selection", onOtherSelection);
    return () => window.removeEventListener("blocking-selection", onOtherSelection);
  }, [sectionIndex]);

  /** Keep at least 20% of an element inside the stage (percent space). */
  const clampPosition = useCallback((x: number, y: number, w: number, h: number) => ({
    x: Math.min(Math.max(x, -w * 0.8), 100 - w * 0.2),
    y: Math.min(Math.max(y, -h * 0.8), 100 - h * 0.2),
  }), []);

  const localPct = useCallback(
    (clientX: number, clientY: number): StagePoint | null => {
      const r = containerRef.current?.getBoundingClientRect();
      if (!r || !r.width) return null;
      return {
        x: ((clientX - r.left) / r.width) * 100,
        y: ((clientY - r.top) / r.height) * 100,
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
    (
      data: { type: BlockingElement["type"]; svg?: string; color?: string; label?: string; text?: string },
      clientX: number,
      clientY: number
    ) => {
      const at = localPct(clientX, clientY);
      if (!at) return;
      const size = DEFAULT_SIZE_PCT[data.type] ?? DEFAULT_SIZE_PCT.character;
      const position = clampPosition(at.x - size.width / 2, at.y - size.height / 2, size.width, size.height);

      const newElement: BlockingElement = {
        id: `${data.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: data.type,
        svg: data.svg,
        color: data.color,
        label: data.label,
        text: data.text,
        position,
        size,
        rotation: 0,
        u: "%",
      };

      onElementDrop(newElement, sectionIndex);
      setSelectedId(newElement.id);
      onActivate?.(sectionIndex);
    },
    [sectionIndex, onElementDrop, clampPosition, setSelectedId, onActivate, localPct]
  );

  // Touch drops dispatched from DraggableElement
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onTouchDrop = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      performDrop(detail, detail.clientX, detail.clientY);
    };
    node.addEventListener("blocking-touch-drop", onTouchDrop);
    return () => node.removeEventListener("blocking-touch-drop", onTouchDrop);
  }, [performDrop]);

  // Click-to-add: insert near the stage center on request. Successive additions
  // cascade a little so they never land exactly on top of each other.
  const elementCountRef = useRef(elements.length);
  elementCountRef.current = elements.length;

  useEffect(() => {
    const onAddCenter = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.sectionIndex !== sectionIndex) return;
      const r = containerRef.current?.getBoundingClientRect();
      if (!r) return;
      const n = elementCountRef.current;
      const dx = ((n % 5) - 2) * 0.085 * r.width;
      const dy = ((Math.floor(n / 5) % 3) - 1) * 0.12 * r.height;
      performDrop(detail, r.left + r.width / 2 + dx, r.top + r.height / 2 + dy);
    };
    window.addEventListener("blocking-add-center", onAddCenter);
    return () => window.removeEventListener("blocking-add-center", onAddCenter);
  }, [performDrop, sectionIndex]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const jsonData = e.dataTransfer.getData("application/json");
      if (!jsonData) return;
      try {
        performDrop(JSON.parse(jsonData), e.clientX, e.clientY);
      } catch {
        // malformed payload — ignore
      }
    },
    [performDrop]
  );

  // ---- Movement path drawing -------------------------------------------------
  const startedDraft = useRef(false);
  useEffect(() => {
    if (drawing) {
      if (!startedDraft.current) {
        startedDraft.current = true;
        setDraft(drawing.start ? [drawing.start] : []);
      }
    } else {
      startedDraft.current = false;
      setDraft([]);
      setHoverPoint(null);
    }
  }, [drawing]);

  const finishDraft = useCallback(() => {
    if (draft.length >= 2) onDrawFinish?.(draft);
    else onDrawCancel?.();
    setDraft([]);
    setHoverPoint(null);
  }, [draft, onDrawFinish, onDrawCancel]);

  useEffect(() => {
    if (!drawing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishDraft();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setDraft([]);
        onDrawCancel?.();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setDraft((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, finishDraft, onDrawCancel]);

  // ---- Pointer interactions --------------------------------------------------
  const longPressTimerRef = useRef<number | null>(null);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const beginPointerDrag = (e: React.PointerEvent, elementId: string) => {
    if (drawing) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.stopPropagation();
    if (!elements.some((el) => el.id === elementId)) return;

    setDraggingId(elementId);
    setSelectedId(elementId);
    onActivate?.(sectionIndex);
    movedRef.current = false;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - box.left, y: e.clientY - box.top });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      const { clientX, clientY } = e;
      cancelLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        if (!movedRef.current) {
          onContextMenu?.({ show: true, x: clientX, y: clientY, targetId: elementId, sectionIndex });
        }
      }, 500);
    }
  };

  const beginResize = (e: React.PointerEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find((el) => el.id === elementId);
    if (!el) return;
    const size = el.size ?? DEFAULT_SIZE_PCT[el.type];
    setResizingId(elementId);
    movedRef.current = false;
    setResizeStart({ x: e.clientX, y: e.clientY, w: size.width, h: size.height });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const beginRotate = (e: React.PointerEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!elements.some((el) => el.id === elementId)) return;
    setRotatingId(elementId);
    setSelectedId(elementId);
    movedRef.current = false;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const r = containerRef.current?.getBoundingClientRect();
      if (!r || !r.width) return;

      if (drawing) {
        const at = localPct(e.clientX, e.clientY);
        if (at) setHoverPoint(at);
        return;
      }

      if (rotatingId && onElementRotate) {
        const el = elements.find((el) => el.id === rotatingId);
        if (!el) return;
        const box = toPxRect(el, r);
        const cx = r.left + box.left + box.width / 2;
        const cy = r.top + box.top + box.height / 2;
        let deg = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        } else {
          const nearest = Math.round(deg / 90) * 90;
          if (Math.abs(deg - nearest) < 6) deg = nearest;
        }
        deg = ((deg % 360) + 360) % 360;
        if (!movedRef.current) onMoveStart?.();
        movedRef.current = true;
        onElementRotate(rotatingId, Math.round(deg), sectionIndex);
        return;
      }

      if (resizingId && onElementResize) {
        const dx = ((e.clientX - resizeStart.x) / r.width) * 100;
        const dy = ((e.clientY - resizeStart.y) / r.height) * 100;
        const newW = Math.max(MIN_SIZE_PCT.width, Math.min(100, resizeStart.w + dx));
        const newH = Math.max(MIN_SIZE_PCT.height, Math.min(100, resizeStart.h + dy));
        if (!movedRef.current) onMoveStart?.();
        movedRef.current = true;
        onElementResize(resizingId, { width: newW, height: newH }, sectionIndex);
        return;
      }

      if (!draggingId) return;
      const el = elements.find((item) => item.id === draggingId);
      if (!el) return;
      const size = el.size ?? DEFAULT_SIZE_PCT[el.type];
      const raw = pxToPct(e.clientX - r.left - dragOffset.x, e.clientY - r.top - dragOffset.y, r);
      const pos = clampPosition(raw.x, raw.y, size.width, size.height);

      // Canva-style snapping: align the element's center to the stage center
      const snappedX = Math.abs(pos.x + size.width / 2 - 50) <= SNAP_THRESHOLD;
      const snappedY = Math.abs(pos.y + size.height / 2 - 50) <= SNAP_THRESHOLD;
      if (snappedX) pos.x = 50 - size.width / 2;
      if (snappedY) pos.y = 50 - size.height / 2;
      setSnap((prev) => (prev.x === snappedX && prev.y === snappedY ? prev : { x: snappedX, y: snappedY }));
      if (!movedRef.current) onMoveStart?.();
      movedRef.current = true;
      cancelLongPress();
      onElementMove(draggingId, pos, sectionIndex);
    },
    [drawing, localPct, draggingId, dragOffset, onElementMove, sectionIndex, resizingId, resizeStart,
     onElementResize, rotatingId, onElementRotate, elements, clampPosition, cancelLongPress, onMoveStart]
  );

  const handlePointerUp = () => {
    cancelLongPress();
    setDraggingId(null);
    setResizingId(null);
    setRotatingId(null);
    setSnap({ x: false, y: false });
    movedRef.current = false;
  };

  const handleContextMenu = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(elementId);
    onContextMenu?.({ show: true, x: e.clientX, y: e.clientY, targetId: elementId, sectionIndex });
  };

  const handleStageClick = (e: React.MouseEvent) => {
    onActivate?.(sectionIndex);
    if (drawing) {
      const at = localPct(e.clientX, e.clientY);
      if (at) setDraft((prev) => [...prev, at]);
      return;
    }
    if (e.target === e.currentTarget) setSelectedId(null);
  };

  const handleStageDoubleClick = () => {
    if (drawing && draft.length >= 2) finishDraft();
  };

  const handleStageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (drawing) {
      finishDraft();
      return;
    }
    onContextMenu?.({ show: true, x: e.clientX, y: e.clientY, targetId: null, sectionIndex });
  };

  // Group consecutive arrow-key moves into one undo step
  const arrowBurstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedId || drawing) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      const el = elements.find((item) => item.id === selectedId);
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onElementRemove(selectedId, sectionIndex);
        setSelectedId(null);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if ((e.key === "[" || e.key === "]") && onElementRotate && el && el.type !== "move") {
        e.preventDefault();
        onMoveStart?.();
        const step = e.shiftKey ? 1 : 15;
        const current = el.rotation || 0;
        const next = (((current + (e.key === "]" ? step : -step)) % 360) + 360) % 360;
        onElementRotate(selectedId, next, sectionIndex);
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && el && el.type !== "move") {
        e.preventDefault();
        if (arrowBurstTimerRef.current == null) onMoveStart?.();
        else window.clearTimeout(arrowBurstTimerRef.current);
        arrowBurstTimerRef.current = window.setTimeout(() => {
          arrowBurstTimerRef.current = null;
        }, 800);
        const step = e.shiftKey ? 4 : 0.6;
        const size = el.size ?? DEFAULT_SIZE_PCT[el.type];
        let { x, y } = el.position;
        if (e.key === "ArrowLeft") x -= step;
        if (e.key === "ArrowRight") x += step;
        if (e.key === "ArrowUp") y -= step;
        if (e.key === "ArrowDown") y += step;
        onElementMove(selectedId, clampPosition(x, y, size.width, size.height), sectionIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, elements, onElementRemove, onElementMove, onElementRotate, sectionIndex, clampPosition, onMoveStart, drawing]);

  const moveElements = elements.filter((el) => el.type === "move" && el.points && el.points.length > 1);
  const boxElements = elements.filter((el) => el.type !== "move");

  /** Hit-test movement paths so they can be selected without blocking the stage. */
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (drawing || !rect.width) return;
    const at = localPct(e.clientX, e.clientY);
    if (!at) return;
    const px = { x: (at.x / 100) * rect.width, y: (at.y / 100) * rect.height };
    let hit: string | null = null;
    for (const el of moveElements) {
      const pts = el.points!.map((p) => pointToPx(p, rect));
      if (distanceToPolyline(px.x, px.y, pts) <= 10) hit = el.id;
    }
    if (hit) {
      e.stopPropagation();
      setSelectedId(hit);
      onActivate?.(sectionIndex);
    }
  };

  const draftPx = draft.map((p) => pointToPx(p, rect));
  const previewPx = hoverPoint ? [...draftPx, pointToPx(hoverPoint, rect)] : draftPx;

  return (
    <div className={`mx-auto my-3 flex w-full flex-col items-center gap-1 ${compact ? "max-w-[340px]" : "max-w-[520px]"}`}>
      <span className="stage-label text-[10px] select-none">무대 뒤 (Upstage)</span>

      <div
        ref={containerRef}
        className={`stage-grid relative w-full select-none overflow-hidden touch-none aspect-[3/2] transition-shadow ${
          isDragOver ? "ring-2 ring-primary/60 bg-primary/5" : ""
        } ${isActive && !isDragOver ? "ring-2 ring-primary/35" : ""} ${drawing ? "cursor-crosshair" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleStageClick}
        onDoubleClick={handleStageDoubleClick}
        onContextMenu={handleStageContextMenu}
        role="application"
        aria-label={`${sectionIndex + 1}번 무대`}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
          {labels.short.flat().map((label, i) => (
            <div key={label} className="stage-grid-line border flex items-start justify-start p-1">
              <span className="stage-zone-label" title={labels.full[Math.floor(i / 3)][i % 3]}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Center guide lines (hidden from exports) */}
        {showCenterGuides && (
          <div className="absolute inset-0 pointer-events-none z-[5]" data-export-hidden>
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 border-l border-dashed border-primary/40" />
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 border-t border-dashed border-primary/40" />
          </div>
        )}

        {snap.x && (
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-secondary z-[15] pointer-events-none" data-export-hidden />
        )}
        {snap.y && (
          <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-secondary z-[15] pointer-events-none" data-export-hidden />
        )}

        {/* Movement paths */}
        <svg
          className="absolute inset-0 w-full h-full z-[8]"
          style={{ pointerEvents: drawing ? "none" : "auto" }}
          viewBox={`0 0 ${rect.width || 1} ${rect.height || 1}`}
          onClick={handleOverlayClick}
          aria-hidden="true"
        >
          <defs>
            {moveElements.map((el) => (
              <marker
                key={`m-${el.id}`}
                id={`arrow-${el.id}`}
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill={el.color || "#5b3fd6"} />
              </marker>
            ))}
          </defs>
          {moveElements.map((el) => {
            const pts = el.points!.map((p) => pointToPx(p, rect));
            const isSelected = selectedId === el.id;
            return (
              <g key={el.id}>
                {/* Invisible fat stroke widens the click target */}
                <path d={smoothPath(pts)} stroke="transparent" strokeWidth={14} fill="none" style={{ cursor: "pointer" }} />
                <path
                  d={smoothPath(pts)}
                  stroke={el.color || "#5b3fd6"}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                  strokeLinecap="round"
                  strokeDasharray="7 5"
                  fill="none"
                  markerEnd={`url(#arrow-${el.id})`}
                  opacity={isSelected ? 1 : 0.9}
                />
                <circle cx={pts[0].x} cy={pts[0].y} r={3.5} fill={el.color || "#5b3fd6"} />
                {el.label && (
                  <text
                    x={pts[0].x + 6}
                    y={pts[0].y - 6}
                    fontSize={11}
                    fontWeight={700}
                    fill={readableTextColor(el.color) || "#333"}
                    paintOrder="stroke"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={3}
                  >
                    {el.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Live draft while capturing a path */}
          {drawing && previewPx.length > 0 && (
            <g data-export-hidden>
              <path
                d={smoothPath(previewPx)}
                stroke={drawing.color}
                strokeWidth={2.5}
                strokeDasharray="7 5"
                strokeLinecap="round"
                fill="none"
              />
              {draftPx.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4} fill={drawing.color} stroke="#fff" strokeWidth={1.5} />
              ))}
            </g>
          )}
        </svg>

        {/* Elements */}
        {boxElements.map((el) => {
          const isSelected = selectedId === el.id;
          const box = toPxRect(el, rect);
          const rotateBelow = box.top < 30;
          return (
            <div
              key={el.id}
              data-draggable
              data-selected={isSelected ? "true" : undefined}
              tabIndex={0}
              role="button"
              aria-label={el.label || el.text || (el.type === "character" ? "캐릭터" : "요소")}
              aria-pressed={isSelected}
              // While a path is being drawn the stage must receive every click,
              // including ones that land on top of an actor already placed there.
              className={`absolute cursor-move group focus-visible:ring-2 focus-visible:ring-primary rounded-sm ${
                draggingId === el.id ? "z-20 opacity-80" : isSelected ? "z-20" : "z-10"
              } ${isSelected && !drawing ? "ring-2 ring-primary/70 ring-offset-1" : ""} ${
                drawing ? "pointer-events-none" : ""
              }`}
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                touchAction: "none",
              }}
              onPointerDown={(e) => beginPointerDrag(e, el.id)}
              onContextMenu={(e) => handleContextMenu(e, el.id)}
              onFocus={() => setSelectedId(el.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(el.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onElementActivate?.(el, sectionIndex);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onElementActivate?.(el, sectionIndex);
                }
              }}
            >
              {el.type === "character" ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" title={el.label}>
                  <svg width="100%" height="100%" viewBox="0 0 24 24" fill={el.color || "#333"} preserveAspectRatio="xMidYMid meet">
                    <circle cx="12" cy="6" r="4" />
                    <path d="M12 12c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
                  </svg>
                  {el.label && (
                    <span
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[10px] font-bold leading-tight whitespace-nowrap max-w-[90px] truncate text-center px-1 rounded bg-background/85"
                      style={{ color: readableTextColor(el.color) }}
                    >
                      {el.label}
                    </span>
                  )}
                </div>
              ) : el.type === "text" ? (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none text-center leading-tight font-semibold px-1 rounded-md bg-background/80 border border-dashed border-border overflow-hidden"
                  style={{ color: el.color || undefined, fontSize: Math.max(9, box.height * 0.42) }}
                >
                  {el.text || "메모"}
                </div>
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                  dangerouslySetInnerHTML={{ __html: el.svg || "" }}
                />
              )}

              {onElementRotate && (
                <div
                  data-resize-handle
                  aria-label="회전"
                  title="드래그하여 회전 (Shift: 15° 단위)"
                  className={`absolute left-1/2 -translate-x-1/2 w-5 h-5 bg-secondary rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[selected=true]:opacity-100 transition-opacity shadow ring-2 ring-background touch-none flex items-center justify-center ${
                    rotateBelow ? "-bottom-7" : "-top-7"
                  }`}
                  data-selected={isSelected ? "true" : undefined}
                  onPointerDown={(e) => beginRotate(e, el.id)}
                >
                  <RotateCw className="w-3 h-3 text-secondary-foreground" />
                </div>
              )}
              {onElementResize && (
                <div
                  data-resize-handle
                  aria-label="크기 조절"
                  title="드래그하여 크기 조절"
                  className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[selected=true]:opacity-100 transition-opacity shadow ring-2 ring-background touch-none"
                  data-selected={isSelected ? "true" : undefined}
                  onPointerDown={(e) => beginResize(e, el.id)}
                />
              )}
            </div>
          );
        })}

        {/* Drawing mode overlay hint */}
        {drawing && (
          <div
            className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 bg-foreground/85 text-background px-2.5 py-1.5 text-[11px]"
            data-export-hidden
          >
            <span className="truncate">
              무대를 클릭해 경로를 이어가세요 · {draft.length}점
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  finishDraft();
                }}
                disabled={draft.length < 2}
                className="inline-flex items-center gap-1 rounded-md bg-background text-foreground px-1.5 py-0.5 disabled:opacity-40"
              >
                <Check className="w-3 h-3" /> 완료
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDraft([]);
                  onDrawCancel?.();
                }}
                className="inline-flex items-center gap-1 rounded-md bg-background/25 px-1.5 py-0.5"
              >
                <X className="w-3 h-3" /> 취소
              </button>
            </span>
          </div>
        )}
      </div>
      <span className="stage-label text-[10px] select-none">객석 (Downstage)</span>
    </div>
  );
};

export default StageGrid;
