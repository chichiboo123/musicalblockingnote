import React, { useState } from "react";
import { Plus, X, Users, Route, PenLine, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import DraggableElement from "@/components/DraggableElement";
import PersonIcon from "@/components/PersonIcon";
import { readableTextColor } from "@/lib/utils";
import type { RecommendedPath } from "@/components/RecommendedPaths";
import type { BlockingElement } from "@/types/blocking";

type AddPayload = Pick<BlockingElement, "type" | "svg" | "color" | "label">;

interface FloatingPaletteProps {
  characters: string[];
  colors: string[];
  paths?: RecommendedPath[];
  customPatterns?: { id: string; svg: string }[];
  onDeletePattern?: (id: string) => void;
  onOpenDrawing?: () => void;
  /** Insert an element at the center of the active stage. */
  onAddElement: (payload: AddPayload) => void;
  /** In choreography, shapes are the primary tool, so open that tab first. */
  shapesFirst?: boolean;
}

type TabKey = "character" | "path";

/**
 * A fixed, collapsible toolbar so elements can be dragged (or clicked) onto the
 * active stage — no scrolling back up to a sidebar required.
 */
const FloatingPalette: React.FC<FloatingPaletteProps> = ({
  characters,
  colors,
  paths,
  customPatterns,
  onDeletePattern,
  onOpenDrawing,
  onAddElement,
  shapesFirst = false,
}) => {
  const [open, setOpen] = useState(true);
  const hasPaths = !!paths?.length || !!customPatterns || !!onOpenDrawing;
  const [tab, setTab] = useState<TabKey>(shapesFirst && hasPaths ? "path" : "character");

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 rounded-full shadow-lg h-12 px-5 gap-2"
        aria-label="요소 팔레트 열기"
      >
        <Plus className="w-5 h-5" />
        요소 추가
      </Button>
    );
  }

  const characterTab = (
    <button
      onClick={() => setTab("character")}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        tab === "character" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Users className="w-4 h-4" /> 캐릭터
    </button>
  );

  const pathTab = hasPaths ? (
    <button
      onClick={() => setTab("path")}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        tab === "path" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Route className="w-4 h-4" /> 도형·경로
    </button>
  ) : null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,680px)]">
      <div className="bg-card border border-border rounded-2xl shadow-elevated overflow-hidden">
        {/* Header row: tabs + close */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
          <div className="flex items-center gap-1">
            {shapesFirst ? (
              <>
                {pathTab}
                {characterTab}
              </>
            ) : (
              <>
                {characterTab}
                {pathTab}
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="팔레트 닫기">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Hint */}
        <div className="px-3 pt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
          끌어다 놓거나 <strong className="text-foreground mx-0.5">클릭</strong>하면 무대 중앙에 추가돼요.
        </div>

        {/* Body */}
        <div className="p-3 pt-2 max-h-[42vh] overflow-y-auto">
          {tab === "character" ? (
            characters.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                위에서 캐릭터 이름을 입력하면 여기에 표시됩니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {characters.map((name, i) => (
                  <DraggableElement
                    key={`fp-char-${i}`}
                    id={`char-${i}`}
                    type="character"
                    color={colors[i % colors.length]}
                    label={name}
                    onClickAdd={() => onAddElement({ type: "character", color: colors[i % colors.length], label: name })}
                  >
                    <PersonIcon color={colors[i % colors.length]} size={20} />
                    <span className="text-xs font-medium" style={{ color: readableTextColor(colors[i % colors.length]) }}>
                      {name}
                    </span>
                  </DraggableElement>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {!!paths?.length && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">권장 도형·경로</p>
                  <div className="flex flex-wrap gap-2">
                    {paths.map((path) => (
                      <DraggableElement
                        key={`fp-${path.id}`}
                        id={path.id}
                        type="path"
                        svg={path.svg}
                        onClickAdd={() => onAddElement({ type: "path", svg: path.svg })}
                      >
                        <div className="w-11 h-11 border border-border rounded-lg bg-card p-0.5">
                          <div dangerouslySetInnerHTML={{ __html: path.svg }} className="w-full h-full" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{path.name}</span>
                      </DraggableElement>
                    ))}
                  </div>
                </div>
              )}
              {(!!customPatterns?.length || onOpenDrawing) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-muted-foreground">내 패턴</p>
                    {onOpenDrawing && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7"
                        onClick={() => {
                          setOpen(false);
                          onOpenDrawing();
                        }}
                      >
                        <PenLine className="w-3.5 h-3.5 mr-1" /> 그리기
                      </Button>
                    )}
                  </div>
                  {customPatterns?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {customPatterns.map((p) => (
                        <div key={`fp-${p.id}`} className="relative group">
                          <DraggableElement
                            id={p.id}
                            type="custom"
                            svg={p.svg}
                            onClickAdd={() => onAddElement({ type: "custom", svg: p.svg })}
                          >
                            <div className="w-11 h-11 border border-border rounded-lg bg-card p-0.5">
                              <div dangerouslySetInnerHTML={{ __html: p.svg }} className="w-full h-full" />
                            </div>
                          </DraggableElement>
                          {onDeletePattern && (
                            <button
                              onClick={() => onDeletePattern(p.id)}
                              aria-label="패턴 삭제"
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">아직 저장된 패턴이 없습니다</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloatingPalette;
