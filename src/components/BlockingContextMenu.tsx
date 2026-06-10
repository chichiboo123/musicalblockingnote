import React, { useLayoutEffect, useRef, useState } from "react";

interface BlockingContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClose: () => void;
  canCopy?: boolean;
  canDelete?: boolean;
  canPaste: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const BlockingContextMenu: React.FC<BlockingContextMenuProps> = ({
  show,
  x,
  y,
  onCopy,
  onPaste,
  onDelete,
  onUndo,
  onRedo,
  onClose,
  canCopy = true,
  canDelete = true,
  canPaste,
  canUndo,
  canRedo,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useLayoutEffect(() => {
    if (!show) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const margin = 8;
    const maxX = window.innerWidth - rect.width - margin;
    const maxY = window.innerHeight - rect.height - margin;
    setPos({
      x: Math.max(margin, Math.min(x, maxX)),
      y: Math.max(margin, Math.min(y, maxY)),
    });
  }, [show, x, y]);

  if (!show) return null;

  const item = (label: string, shortcut: string, onClick: () => void, opts?: { disabled?: boolean; destructive?: boolean }) => (
    <button
      onClick={() => {
        if (opts?.disabled) return;
        onClick();
        onClose();
      }}
      disabled={opts?.disabled}
      className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between gap-4 disabled:opacity-40 disabled:cursor-not-allowed ${
        opts?.destructive ? "text-destructive hover:bg-destructive/10" : "hover:bg-muted"
      }`}
    >
      <span>{label}</span>
      {shortcut && <span className="text-[10px] text-muted-foreground font-mono">{shortcut}</span>}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={ref}
        role="menu"
        className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
        style={{ left: pos.x, top: pos.y }}
      >
        {item("복사", "", onCopy, { disabled: !canCopy })}
        {item("붙여넣기", "", onPaste, { disabled: !canPaste })}
        <div className="border-t border-border my-1" />
        {item("삭제", "Del", onDelete, { destructive: true, disabled: !canDelete })}
        <div className="border-t border-border my-1" />
        {item("되돌리기", "Ctrl+Z", onUndo, { disabled: !canUndo })}
        {item("다시 실행", "Ctrl+Y", onRedo, { disabled: !canRedo })}
      </div>
    </>
  );
};

export default BlockingContextMenu;
