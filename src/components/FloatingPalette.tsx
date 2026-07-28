import React, { useEffect, useRef, useState } from "react";
import { Plus, X, Users, Route, PenLine, MousePointerClick, Type, Spline, ChevronDown, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DraggableElement from "@/components/DraggableElement";
import PersonIcon from "@/components/PersonIcon";
import { readableTextColor } from "@/lib/utils";
import type { RecommendedPath } from "@/components/RecommendedPaths";
import type { AddElementPayload, Character } from "@/types/blocking";

interface FloatingPaletteProps {
  cast: Character[];
  paths?: RecommendedPath[];
  customPatterns?: { id: string; svg: string }[];
  onDeletePattern?: (id: string) => void;
  onOpenDrawing?: () => void;
  /** Insert an element at the center of the active stage. */
  onAddElement: (payload: AddElementPayload) => void;
  /** Start capturing a movement path for the given cast member. */
  onStartMovePath?: (character: Character | null) => void;
  /** Human-readable name of the stage that additions land on ("#2", "1장 · 장면 3"). */
  targetLabel?: string;
  /** In choreography, shapes are the primary tool, so open that tab first. */
  shapesFirst?: boolean;
}

type TabKey = "character" | "path" | "note";

const OPEN_KEY = "blocking:palette-open";
const DESKTOP_QUERY = "(min-width: 640px)";

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
};

/**
 * A docked toolbar so elements can be dragged (or clicked) onto the active
 * stage. On desktop it docks to the left edge (vertical panel) so it never
 * covers the stage being edited; on narrow/mobile screens it stays a bottom
 * sheet since there isn't enough horizontal room for a side panel. It
 * publishes its own size as `--palette-h` / `--palette-w` so the page can
 * reserve space instead of hiding the stage behind it.
 */
const FloatingPalette: React.FC<FloatingPaletteProps> = ({
  cast,
  paths,
  customPatterns,
  onDeletePattern,
  onOpenDrawing,
  onAddElement,
  onStartMovePath,
  targetLabel,
  shapesFirst = false,
}) => {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(OPEN_KEY);
      if (stored != null) return stored !== "false";
    } catch {
      // ignore
    }
    // On a phone an open palette would swallow the stage, so start collapsed.
    return typeof window === "undefined" || window.innerWidth >= 640;
  });
  const hasPaths = !!paths?.length || !!customPatterns || !!onOpenDrawing;
  const [tab, setTab] = useState<TabKey>(shapesFirst && hasPaths ? "path" : "character");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, String(open));
    } catch {
      // ignore
    }
  }, [open]);

  // Publish the palette size so <main> can pad itself and never be covered.
  useEffect(() => {
    const node = rootRef.current;
    const root = document.documentElement.style;
    const setVars = (h: number, w: number) => {
      root.setProperty("--palette-h", `${Math.round(h)}px`);
      root.setProperty("--palette-w", `${Math.round(w)}px`);
    };
    if (!node) {
      setVars(76, 0);
      return;
    }
    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (isDesktop) {
        setVars(0, rect.width + 24);
      } else {
        setVars(rect.height + 24, 0);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => {
      ro.disconnect();
      setVars(0, 0);
    };
  }, [open, tab, cast.length, customPatterns?.length, isDesktop]);

  if (!open) {
    return (
      <div
        ref={rootRef}
        className="fixed z-40 bottom-4 left-1/2 -translate-x-1/2 sm:bottom-auto sm:left-4 sm:top-1/2 sm:-translate-x-0 sm:-translate-y-1/2"
        data-export-hidden
      >
        <Button onClick={() => setOpen(true)} className="rounded-full shadow-elevated h-12 px-5 gap-2" aria-label="요소 팔레트 열기">
          <Plus className="w-5 h-5" />
          요소 추가
        </Button>
      </div>
    );
  }

  const tabButton = (key: TabKey, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      aria-pressed={tab === key}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {icon} {label}
    </button>
  );

  const characterTab = tabButton("character", <Users className="w-4 h-4" />, "인물");
  const pathTab = hasPaths ? tabButton("path", <Route className="w-4 h-4" />, "도형·경로") : null;
  const noteTab = tabButton("note", <Type className="w-4 h-4" />, "메모");

  return (
    <div
      ref={rootRef}
      className="fixed z-40 bottom-3 left-1/2 -translate-x-1/2 w-[min(96vw,720px)] sm:bottom-auto sm:left-4 sm:top-1/2 sm:-translate-x-0 sm:-translate-y-1/2 sm:w-80"
      data-export-hidden
    >
      <div className="bg-card border border-border rounded-2xl shadow-elevated overflow-hidden flex flex-col sm:max-h-[calc(100vh-2rem)]">
        {/* Header row: tabs + target + close */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto">
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
            {noteTab}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {targetLabel && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2 py-1">
                <MousePointerClick className="w-3 h-3" />
                {targetLabel}에 추가
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="팔레트 접기">
              <ChevronDown className="w-4 h-4 sm:hidden" />
              <ChevronLeft className="w-4 h-4 hidden sm:block" />
            </Button>
          </div>
        </div>

        {targetLabel && (
          <p className="sm:hidden px-3 pt-1.5 text-[11px] text-primary font-semibold">{targetLabel}에 추가됩니다</p>
        )}

        {/* Body */}
        <div className="p-3 pt-2 max-h-[34vh] sm:max-h-none overflow-y-auto">
          {tab === "character" && (
            cast.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                위 <strong className="text-foreground">등장인물</strong>에 이름을 추가하면 여기에 표시됩니다.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {cast.map((c) => (
                    <DraggableElement
                      key={c.id}
                      id={c.id}
                      type="character"
                      color={c.color}
                      label={c.name}
                      onClickAdd={() => onAddElement({ type: "character", color: c.color, label: c.name })}
                    >
                      <PersonIcon color={c.color} size={20} />
                      <span className="text-xs font-medium" style={{ color: readableTextColor(c.color) }}>
                        {c.name}
                      </span>
                    </DraggableElement>
                  ))}
                </div>
                {onStartMovePath && (
                  <div className="mt-3 pt-2.5 border-t border-border">
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      이동 경로 — 인물을 고르고 무대를 클릭해 지나갈 지점을 이어 주세요.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cast.map((c) => (
                        <Button
                          key={`move-${c.id}`}
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => onStartMovePath(c)}
                        >
                          <Spline className="w-3.5 h-3.5" style={{ color: c.color }} />
                          {c.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          )}

          {tab === "path" && (
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
                        label={path.name}
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
                      <Button variant="outline" size="sm" className="h-7" onClick={onOpenDrawing}>
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
                              type="button"
                              onClick={() => onDeletePattern(p.id)}
                              aria-label="패턴 삭제"
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center shadow"
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

          {tab === "note" && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-2">
                소품·조명·대형 같은 메모를 무대에 붙일 수 있어요. 추가한 뒤 더블클릭하면 내용을 고칩니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {["소품", "조명", "암전", "대형 변경", "빈 메모"].map((preset) => (
                  <DraggableElement
                    key={preset}
                    id={`note-${preset}`}
                    type="text"
                    label={preset}
                    text={preset === "빈 메모" ? "" : preset}
                    onClickAdd={() => onAddElement({ type: "text", text: preset === "빈 메모" ? "메모" : preset })}
                  >
                    <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium">
                      <Type className="w-3.5 h-3.5 text-muted-foreground" />
                      {preset}
                    </span>
                  </DraggableElement>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="px-3 pb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
          <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
          끌어다 놓거나 <strong className="text-foreground mx-0.5">클릭</strong>하면 무대 중앙에 추가돼요.
        </p>
      </div>
    </div>
  );
};

export default FloatingPalette;
