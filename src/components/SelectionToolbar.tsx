import React from "react";
import { Copy, Trash2, RotateCcw, ArrowUpToLine, ArrowDownToLine, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHARACTER_COLORS, type BlockingElement } from "@/types/blocking";

interface SelectionToolbarProps {
  element: BlockingElement | null;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onResetRotation: () => void;
  onRecolor: (color: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  character: "인물",
  path: "도형",
  custom: "내 패턴",
  text: "메모",
  move: "이동 경로",
};

/**
 * What you can do with the selected element used to be hidden behind a
 * right-click menu and two keyboard shortcuts. This surfaces it.
 */
const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  element,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
  onResetRotation,
  onRecolor,
}) => {
  if (!element) return null;

  const canRecolor = element.type === "character" || element.type === "text" || element.type === "move";
  const canRotate = element.type !== "move";

  const action = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    destructive = false
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${destructive ? "text-destructive hover:text-destructive" : ""}`}
          onClick={onClick}
          aria-label={label}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className="fixed top-[calc(var(--header-h,56px)+8px)] left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 rounded-xl border border-border bg-card/95 backdrop-blur px-1.5 py-1 shadow-elevated animate-in fade-in slide-in-from-top-2"
      role="toolbar"
      aria-label="선택한 요소 편집"
      data-export-hidden
    >
      <span className="px-2 text-[11px] font-semibold text-muted-foreground max-w-[110px] truncate">
        {element.label || element.text || TYPE_LABEL[element.type] || "요소"}
      </span>
      <span className="h-5 w-px bg-border mx-0.5" />

      {canRecolor && (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="색상 변경">
                  <Palette className="w-4 h-4" style={{ color: element.color }} />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>색상 변경</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-[232px] p-2" align="center">
            <div className="grid grid-cols-8 gap-1">
              {CHARACTER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onRecolor(color)}
                  aria-label={color}
                  className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
                    element.color === color ? "ring-2 ring-primary ring-offset-1" : "border-border"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {action(<Copy className="w-4 h-4" />, "복제 (Ctrl+D)", onDuplicate)}
      {action(<ArrowUpToLine className="w-4 h-4" />, "맨 앞으로", onBringToFront)}
      {action(<ArrowDownToLine className="w-4 h-4" />, "맨 뒤로", onSendToBack)}
      {canRotate && action(<RotateCcw className="w-4 h-4" />, "회전 초기화", onResetRotation)}
      <span className="h-5 w-px bg-border mx-0.5" />
      {action(<Trash2 className="w-4 h-4" />, "삭제 (Del)", onDelete, true)}
    </div>
  );
};

export default SelectionToolbar;
