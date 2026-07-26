import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableCardProps {
  id: string | number;
  className?: string;
  /** Extra ref the page keeps for exporting this card to JPG/PDF. */
  exportRef?: React.RefObject<HTMLDivElement>;
  /** Rendered with the drag handle so the header row can host it. */
  children: (handle: React.ReactNode) => React.ReactNode;
  isActive?: boolean;
  onFocusCapture?: () => void;
}

/**
 * Reordering used to be impossible — the only way to move verse 5 above verse 2
 * was to delete and retype it. dnd-kit gives pointer *and* keyboard reordering
 * from an explicit grip so it never fights the stage's own pointer handling.
 */
const SortableCard: React.FC<SortableCardProps> = ({
  id,
  className = "",
  exportRef,
  children,
  isActive,
  onFocusCapture,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (exportRef) (exportRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  const handle = (
    <button
      type="button"
      className="cursor-grab active:cursor-grabbing rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary touch-none"
      aria-label="순서 바꾸기 — 끌거나 스페이스바를 누른 뒤 방향키"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );

  return (
    <div
      ref={setRefs}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onFocusCapture={onFocusCapture}
      className={`${className} ${isDragging ? "z-30 opacity-80 shadow-elevated" : ""} ${
        isActive ? "ring-2 ring-primary/40" : ""
      }`}
    >
      {children(handle)}
    </div>
  );
};

export default SortableCard;
