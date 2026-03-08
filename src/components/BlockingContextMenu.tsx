import React from "react";

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
  canPaste,
  canUndo,
  canRedo,
}) => {
  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
        style={{ left: x, top: y }}
      >
        <button onClick={() => { onCopy(); onClose(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          복사
        </button>
        <button onClick={() => { onPaste(); onClose(); }} disabled={!canPaste} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-40">
          붙여넣기
        </button>
        <div className="border-t border-border my-1" />
        <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-destructive/10 text-destructive transition-colors">
          삭제
        </button>
        <div className="border-t border-border my-1" />
        <button onClick={() => { onUndo(); onClose(); }} disabled={!canUndo} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-40">
          되돌리기
        </button>
        <button onClick={() => { onRedo(); onClose(); }} disabled={!canRedo} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-40">
          다시 실행
        </button>
      </div>
    </>
  );
};

export default BlockingContextMenu;
