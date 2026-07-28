import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { RotateCw, Check, X, Trash2 } from "lucide-react";
import { readableTextColor } from "@/lib/utils";
import {
  DEFAULT_SIZE_PCT, MIN_SIZE_PCT, distanceToPolyline, migrateElements,
  pointToPx, smoothPath, toPxRect, type Rect,
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
  /** Bulk delete for a multi-selection. Falls back to repeated onElementRemove calls if omitted. */
  onElementsRemove?: (elementIds: string[], sectionIndex: number) => void;
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

/** Percent-space axis-aligned overlap test used for marquee (rubber-band) selection. */
const rectsOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

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
  onElementsRemove,
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
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snap, setSnap] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const [draft, setDraft] = useState<StagePoint[]>([]);
  const [hoverPoint, setHoverPoint] = useState<StagePoint | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const movedRef = useRef(false);
  const marqueeStartRef = useRef<{ xPct: number; yPct: number; ctrl: boolean } | null>(null);
  const dragGroupRef = useRef<{
    anchorId: string;
    startClientX: number;
    startClientY: number;
    positions: Map<string, { x: number; y: number }>;
  } | null>(null);

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

  // A single selected element is exposed to the parent (for the selection
  // toolbar); a multi-selection surfaces no single element there.
  const selectedElement = useMemo(
    () => (selectedIds.size === 1 ? elements.find((el) => selectedIds.has(el.id)) ?? null : null),
    [elements, selectedIds]
  );

  const applySelection = useCallback(
    (next: Set<string>) => {
      setSelectedIds(next);
      if (next.size > 0) {
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
      if (detail?.sectionIndex !== sectionIndex) setSelectedIds(new Set());
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
      applySelection(new Set([newElement.id]));
      onActivate?.(sectionIndex);
    },
    [sectionIndex, onElementDrop, clampPosition, applySelection, onActivate, localPct]
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

    const isCtrl = e.ctrlKey || e.metaKey;
    let nextIds: Set<string>;
    if (isCtrl) {
      nextIds = new Set(selectedIds);
      if (nextIds.has(elementId)) nextIds.delete(elementId);
      else nextIds.add(elementId);
      applySelection(nextIds);
      if (!nextIds.has(elementId)) return; // ctrl-click just deselected it — nothing to drag
    } else if (selectedIds.has(elementId) && selectedIds.size > 1) {
      nextIds = selectedIds; // dragging a member of an existing multi-selection moves the whole group
    } else {
      nextIds = new Set([elementId]);
      applySelection(nextIds);
    }

    setDraggingId(elementId);
    onActivate?.(sectionIndex);
    movedRef.current = false;

    const positions = new Map<string, { x: number; y: number }>();
    elements.forEach((el) => {
      if (nextIds.has(el.id)) positions.set(el.id, { ...el.position });
    });
    dragGroupRef.current = { anchorId: elementId, startClientX: e.clientX, startClientY: e.clientY, positions };

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
    applySelection(new Set([elementId]));
    movedRef.current = false;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  /** Starts marquee (rubber-band) selection when the pointer goes down on empty stage. */
  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (drawing || draggingId || resizingId || rotatingId) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const at = localPct(e.clientX, e.clientY);
    if (!at) return;
    marqueeStartRef.current = { xPct: at.x, yPct: at.y, ctrl: e.ctrlKey || e.metaKey };
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

      if (marqueeStartRef.current) {
        const at = localPct(e.clientX, e.clientY);
        if (at) {
          const start = marqueeStartRef.current;
          const dx = at.x - start.xPct;
          const dy = at.y - start.yPct;
          if (!movedRef.current && Math.hypot(dx, dy) > 0.6) movedRef.current = true;
          if (movedRef.current) {
            setMarqueeBox({
              x: Math.min(start.xPct, at.x),
              y: Math.min(start.yPct, at.y),
              w: Math.abs(dx),
              h: Math.abs(dy),
            });
          }
        }
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

      if (!draggingId || !dragGroupRef.current) return;
      const group = dragGroupRef.current;
      const anchorEl = elements.find((item) => item.id === group.anchorId);
      const anchorStart = group.positions.get(group.anchorId);
      if (!anchorEl || !anchorStart) return;
      const anchorSize = anchorEl.size ?? DEFAULT_SIZE_PCT[anchorEl.type];

      let dx = ((e.clientX - group.startClientX) / r.width) * 100;
      let dy = ((e.clientY - group.startClientY) / r.height) * 100;

      // Canva-style snapping: align the anchor element's center to the stage center
      const anchorX = anchorStart.x + dx;
      const anchorY = anchorStart.y + dy;
      const snappedX = Math.abs(anchorX + anchorSize.width / 2 - 50) <= SNAP_THRESHOLD;
      const snappedY = Math.abs(anchorY + anchorSize.height / 2 - 50) <= SNAP_THRESHOLD;
      if (snappedX) dx = 50 - anchorSize.width / 2 - anchorStart.x;
      if (snappedY) dy = 50 - anchorSize.height / 2 - anchorStart.y;
      setSnap((prev) => (prev.x === snappedX && prev.y === snappedY ? prev : { x: snappedX, y: snappedY }));
      if (!movedRef.current) onMoveStart?.();
      movedRef.current = true;
      cancelLongPress();

      group.positions.forEach((startPos, id) => {
        const el = elements.find((item) => item.id === id);
        if (!el) return;
        const size = el.size ?? DEFAULT_SIZE_PCT[el.type];
        const pos = clampPosition(startPos.x + dx, startPos.y + dy, size.width, size.height);
        onElementMove(id, pos, sectionIndex);
      });
    },
    [drawing, localPct, draggingId, onElementMove, sectionIndex, resizingId, resizeStart,
     onElementResize, rotatingId, onElementRotate, elements, clampPosition, cancelLongPress, onMoveStart]
  );

  const handlePointerUp = () => {
    cancelLongPress();
    if (marqueeStartRef.current) {
      const start = marqueeStartRef.current;
      if (movedRef.current && marqueeBox) {
        const hitIds = elements
          .filter((el) => el.type !== "move")
          .filter((el) => {
            const size = el.size ?? DEFAULT_SIZE_PCT[el.type];
            return rectsOverlap(marqueeBox, { x: el.position.x, y: el.position.y, w: size.width, h: size.height });
          })
          .map((el) => el.id);
        if (hitIds.length) {
          applySelection(start.ctrl ? new Set([...selectedIds, ...hitIds]) : new Set(hitIds));
        } else if (!start.ctrl) {
          applySelection(new Set());
        }
      } else {
        applySelection(new Set());
      }
      marqueeStartRef.current = null;
      setMarqueeBox(null);
    }
    setDraggingId(null);
    setResizingId(null);
    setRotatingId(null);
    setSnap({ x: false, y: false });
    movedRef.current = false;
    dragGroupRef.current = null;
  };

  const handleContextMenu = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.has(elementId)) applySelection(new Set([elementId]));
    onContextMenu?.({ show: true, x: e.clientX, y: e.clientY, targetId: elementId, sectionIndex });
  };

  const handleStageClick = (e: React.MouseEvent) => {
    onActivate?.(sectionIndex);
    if (drawing) {
      const at = localPct(e.clientX, e.clientY);
      if (at) setDraft((prev) => [...prev, at]);
    }
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
    if (selectedIds.size === 0 || drawing) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const ids = Array.from(selectedIds);
        if (onElementsRemove) onElementsRemove(ids, sectionIndex);
        else ids.forEach((id) => onElementRemove(id, sectionIndex));
        applySelection(new Set());
        return;
      }
      if (e.key === "Escape") {
        applySelection(new Set());
        return;
      }

      if (selectedIds.size > 1) {
        // Group nudge: every selected element moves by the same step.
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
          e.preventDefault();
          if (arrowBurstTimerRef.current == null) onMoveStart?.();
          else window.clearTimeout(arrowBurstTimerRef.current);
          arrowBurstTimerRef.current = window.setTimeout(() => {
            arrowBurstTimerRef.current = null;
          }, 800);
          const step = e.shiftKey ? 4 : 0.6;
          let dx = 0;
          let dy = 0;
          if (e.key === "ArrowLeft") dx = -step;
          if (e.key === "ArrowRight") dx = step;
          if (e.key === "ArrowUp") dy = -step;
          if (e.key === "ArrowDown") dy = step;
          selectedIds.forEach((id) => {
            const el = elements.find((item) => item.id === id);
            if (!el || el.type === "move") return;
            const size = el.size ?? DEFAULT_SIZE_PCT[el.type];
            onElementMove(id, clampPosition(el.position.x + dx, el.position.y + dy, size.width, size.height), sectionIndex);
          });
        }
        return;
      }

      const selectedId = Array.from(selectedIds)[0];
      const el = elements.find((item) => item.id === selectedId);
      if ((e.key === "[" || e.key === "]") && onElementRotate && el && el.type !== "move") {
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
  }, [selectedIds, elements, onElementRemove, onElementsRemove, onElementMove, onElementRotate, sectionIndex, clampPosition, onMoveStart, drawing, applySelection]);

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
      if (e.ctrlKey || e.metaKey) {
        const next = new Set(selectedIds);
        if (next.has(hit)) next.delete(hit);
        else next.add(hit);
        applySelection(next);
      } else {
        applySelection(new Set([hit]));
      }
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
        onPointerDown={handleStagePointerDown}
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

        {marqueeBox && (
          <div
            className="absolute border border-primary/70 bg-primary/10 pointer-events-none z-30"
            style={{
              left: (marqueeBox.x / 100) * rect.width,
              top: (marqueeBox.y / 100) * rect.height,
              width: (marqueeBox.w / 100) * rect.width,
              height: (marqueeBox.h / 100) * rect.height,
            }}
            data-export-hidden
          />
        )}

        {selectedIds.size > 1 && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-foreground/90 text-background pl-3 pr-1.5 py-1 text-[11px] font-medium shadow"
            data-export-hidden
          >
            <span>{selectedIds.size}개 선택됨</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const ids = Array.from(selectedIds);
                if (onElementsRemove) onElementsRemove(ids, sectionIndex);
                else ids.forEach((id) => onElementRemove(id, sectionIndex));
                applySelection(new Set());
              }}
              className="inline-flex items-center gap-1 rounded-full bg-background/20 hover:bg-background/30 px-2 py-1 transition-colors"
              aria-label="선택한 요소 모두 삭제"
            >
              <Trash2 className="w-3 h-3" /> 삭제
            </button>
          </div>
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
            const isSelected = selectedIds.has(el.id);
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
          const isSelected = selectedIds.has(el.id);
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
              onFocus={() => applySelection(new Set([el.id]))}
              onClick={(e) => {
                e.stopPropagation();
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

              {onElementRotate && selectedIds.size <= 1 && (
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
              {onElementResize && selectedIds.size <= 1 && (
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
