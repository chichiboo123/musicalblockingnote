import React, { useRef, useState } from "react";

interface DraggableElementProps {
  id: string;
  type: "character" | "path" | "custom";
  svg?: string;
  color?: string;
  label?: string;
  children: React.ReactNode;
}

const TOUCH_THRESHOLD = 6;

const DraggableElement = ({ id, type, svg, color, label, children }: DraggableElementProps) => {
  const data = { id, type, svg, color, label };
  const elRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const [touchDragging, setTouchDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify(data));
    e.dataTransfer.effectAllowed = "copy";
  };

  const cleanupGhost = () => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
  };

  const dispatchSyntheticDrop = (clientX: number, clientY: number) => {
    cleanupGhost();
    const target = document.elementFromPoint(clientX, clientY);
    if (!target) return;
    const stage = target.closest(".stage-grid") as HTMLElement | null;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData("application/json", JSON.stringify(data));
    const dropEvent = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      dataTransfer: dt,
    });
    // React's onDrop reads dataTransfer via the synthetic event; fall back to a custom property if needed.
    try {
      Object.defineProperty(dropEvent, "dataTransfer", { value: dt });
    } catch {
      // ignore
    }
    stage.dispatchEvent(dropEvent);
    // Some browsers ignore programmatic DragEvent.dataTransfer — emit a custom event as a safety net.
    stage.dispatchEvent(
      new CustomEvent("blocking-touch-drop", {
        bubbles: true,
        detail: { ...data, clientX, clientY, rectLeft: rect.left, rectTop: rect.top },
      })
    );
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    startRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const ensureGhost = (clientX: number, clientY: number) => {
    if (ghostRef.current || !elRef.current) return;
    const rect = elRef.current.getBoundingClientRect();
    const ghost = elRef.current.cloneNode(true) as HTMLDivElement;
    ghost.style.position = "fixed";
    ghost.style.left = `${clientX - rect.width / 2}px`;
    ghost.style.top = `${clientY - rect.height / 2}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.pointerEvents = "none";
    ghost.style.opacity = "0.85";
    ghost.style.zIndex = "9999";
    ghost.style.transform = "scale(1.05)";
    ghost.style.transition = "transform 0.1s";
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!draggingRef.current && Math.hypot(dx, dy) > TOUCH_THRESHOLD) {
      draggingRef.current = true;
      setTouchDragging(true);
    }
    if (draggingRef.current) {
      e.preventDefault();
      ensureGhost(e.clientX, e.clientY);
      if (ghostRef.current && elRef.current) {
        const rect = elRef.current.getBoundingClientRect();
        ghostRef.current.style.left = `${e.clientX - rect.width / 2}px`;
        ghostRef.current.style.top = `${e.clientY - rect.height / 2}px`;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") {
      startRef.current = null;
      return;
    }
    if (draggingRef.current) {
      dispatchSyntheticDrop(e.clientX, e.clientY);
    }
    cleanupGhost();
    startRef.current = null;
    draggingRef.current = false;
    setTouchDragging(false);
  };

  const onPointerCancel = () => {
    cleanupGhost();
    startRef.current = null;
    draggingRef.current = false;
    setTouchDragging(false);
  };

  return (
    <div
      ref={elRef}
      draggable
      onDragStart={handleDragStart}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`draggable-element inline-flex items-center gap-1 p-1 rounded cursor-grab touch-none ${
        touchDragging ? "opacity-40" : ""
      }`}
      title={label || id}
    >
      {children}
    </div>
  );
};

export default DraggableElement;
