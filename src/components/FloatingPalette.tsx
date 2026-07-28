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
/**
 * Below this width a side panel would leave the stage too narrow to work on, so
 * the palette becomes a bottom sheet instead.
 */
const DOCK_QUERY = "(min-width: 768px)";

const useIsDocked = () => {
  const [docked, setDocked] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DOCK_QUERY).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(DOCK_QUERY);
    const onChange = () => setDocked(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return docked;
};

/**
 * The element palette. On a wide screen it docks as a full-height column on the
 * left, so the tab strip, the tiles and the scrolling body each get a row of
 * their own instead of fighting for one cramped line. On a phone it is a bottom
 * sheet. Either way it publishes its own footprint as `--palette-w` /
 * `--palette-h` so the page can reserve space instead of being covered.
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
  const docked = useIsDocked();
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(OPEN_KEY);
      if (stored != null) return stored !== "false";
    } catch {
      // ignore
    }
    // On a phone an open palette would swallow the stage, so start collapsed.
    return typeof window === "undefined" || window.innerWidth >= 768;
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

  // Publish the palette footprint so <main> can pad itself and never be covered.
  useEffect(() => {
    const root = document.documentElement.style;
    const setVars = (h: number, w: number) => {
      root.setProperty("--palette-h", `${Math.round(h)}px`);
      root.setProperty("--palette-w", `${Math.round(w)}px`);
    };

    // Collapsed: the desktop handle floats over the gutter and needs no room;
    // the phone button sits above the page bottom.
    if (!open) {
      setVars(docked ? 0 : 88, 0);
      return () => setVars(0, 0);
    }

    const node = rootRef.current;
    if (!node) {
      setVars(docked ? 0 : 96, docked ? 312 : 0);
      return () => setVars(0, 0);
    }
    const measure = () => {
      const r = node.getBoundingClientRect();
      if (docked) setVars(0, r.width + 24);
      else setVars(r.height + 16, 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => {
      ro.disconnect();
      setVars(0, 0);
    };
  }, [open, tab, cast.length, customPatterns?.length, docked]);

  // ---- Collapsed ------------------------------------------------------------
  if (!open) {
    return docked ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="요소 팔레트 열기"
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 rounded-r-xl bg-primary text-primary-foreground py-5 px-2 shadow-elevated hover:px-2.5 transition-all"
        data-export-hidden
      >
        <Plus className="w-5 h-5" />
        <span className="text-xs font-semibold [writing-mode:vertical-rl] tracking-wide">요소 추가</span>
      </button>
    ) : (
      <div ref={rootRef} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40" data-export-hidden>
        <Button onClick={() => setOpen(true)} className="rounded-full shadow-elevated h-12 px-5 gap-2" aria-label="요소 팔레트 열기">
          <Plus className="w-5 h-5" />
          요소 추가
        </Button>
      </div>
    );
  }

  // ---- Tab strip ------------------------------------------------------------
  const tabButton = (key: TabKey, icon: React.ReactNode, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setTab(key)}
      aria-pressed={tab === key}
      className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
        tab === key
          ? "bg-card text-primary shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const characterTab = tabButton("character", <Users className="w-3.5 h-3.5 shrink-0" />, "인물");
  const pathTab = hasPaths ? tabButton("path", <Route className="w-3.5 h-3.5 shrink-0" />, "도형·경로") : null;
  const noteTab = tabButton("note", <Type className="w-3.5 h-3.5 shrink-0" />, "메모");
  const tabs = shapesFirst ? [pathTab, characterTab, noteTab] : [characterTab, pathTab, noteTab];

  /** Section heading inside the scrolling body. */
  const heading = (text: string, action?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{text}</p>
      {action}
    </div>
  );

  /** Tiles lay out as a roomy grid in the side panel, and wrap inline on a phone. */
  const tileWrap = docked ? "grid grid-cols-3 gap-2" : "flex flex-wrap gap-2";
  // In the grid the tile stretches to its cell; wrapping inline it has no parent
  // width to resolve against, so it needs a fixed box or it collapses to the SVG.
  const tileBox = docked ? "w-full aspect-square max-w-[64px]" : "w-14 h-14";

  const body = (
    <>
      {tab === "character" &&
        (cast.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center leading-relaxed">
            위 <strong className="text-foreground">등장인물</strong>에 이름을 추가하면
            <br />
            여기에 표시됩니다.
          </p>
        ) : (
          <>
            <div>
              {heading("등장인물")}
              <div className="flex flex-wrap gap-1.5">
                {cast.map((c) => (
                  <DraggableElement
                    key={c.id}
                    id={c.id}
                    type="character"
                    color={c.color}
                    label={c.name}
                    onClickAdd={() => onAddElement({ type: "character", color: c.color, label: c.name })}
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5">
                      <PersonIcon color={c.color} size={18} />
                      <span className="text-xs font-medium" style={{ color: readableTextColor(c.color) }}>
                        {c.name}
                      </span>
                    </span>
                  </DraggableElement>
                ))}
              </div>
            </div>
            {onStartMovePath && (
              <div className="mt-5 pt-4 border-t border-border">
                {heading("이동 경로")}
                <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                  인물을 고르고 무대를 클릭해 지나갈 지점을 이어 주세요.
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
        ))}

      {tab === "path" && (
        <div className="space-y-5">
          {!!paths?.length && (
            <div>
              {heading("권장 도형·경로")}
              <div className={tileWrap}>
                {paths.map((path) => (
                  <DraggableElement
                    key={`fp-${path.id}`}
                    id={path.id}
                    type="path"
                    svg={path.svg}
                    label={path.name}
                    onClickAdd={() => onAddElement({ type: "path", svg: path.svg })}
                    className={docked ? "!flex w-full flex-col" : ""}
                  >
                    <span className="flex w-full flex-col items-center gap-1">
                      <span className={`${tileBox} border border-border rounded-lg bg-card p-1`}>
                        <span dangerouslySetInnerHTML={{ __html: path.svg }} className="block w-full h-full" />
                      </span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{path.name}</span>
                    </span>
                  </DraggableElement>
                ))}
              </div>
            </div>
          )}
          {(!!customPatterns?.length || onOpenDrawing) && (
            <div>
              {heading(
                "내 패턴",
                onOpenDrawing && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onOpenDrawing}>
                    <PenLine className="w-3.5 h-3.5 mr-1" /> 그리기
                  </Button>
                )
              )}
              {customPatterns?.length ? (
                <div className={tileWrap}>
                  {customPatterns.map((p) => (
                    <div key={`fp-${p.id}`} className="relative group">
                      <DraggableElement
                        id={p.id}
                        type="custom"
                        svg={p.svg}
                        onClickAdd={() => onAddElement({ type: "custom", svg: p.svg })}
                        className={docked ? "!flex w-full" : ""}
                      >
                        <span className={`block ${tileBox} border border-border rounded-lg bg-card p-1`}>
                          <span dangerouslySetInnerHTML={{ __html: p.svg }} className="block w-full h-full" />
                        </span>
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
          {heading("메모")}
          <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">
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
    </>
  );

  const hint = (
    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border px-3 py-2 shrink-0">
      <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
      끌어다 놓거나 <strong className="text-foreground mx-0.5">클릭</strong>하면 무대 중앙에 추가돼요.
    </p>
  );

  // ---- Docked side panel (md and up) ---------------------------------------
  if (docked) {
    return (
      <div
        ref={rootRef}
        className="fixed left-3 top-[calc(var(--header-h,56px)+12px)] bottom-3 z-40 w-[288px] lg:w-[312px]"
        data-export-hidden
      >
        <aside
          className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-elevated overflow-hidden"
          aria-label="요소 팔레트"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 shrink-0">
            <h2 className="text-sm font-bold">요소 추가</h2>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpen(false)} aria-label="팔레트 접기">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          <div className="px-3 pb-2 shrink-0">
            <div className="flex items-center gap-1 rounded-xl bg-muted/70 p-1">{tabs}</div>
          </div>

          {targetLabel && (
            <div className="px-3 pb-2 shrink-0">
              <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1.5">
                <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{targetLabel}에 추가됩니다</span>
              </span>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">{body}</div>
          {hint}
        </aside>
      </div>
    );
  }

  // ---- Bottom sheet (phones) ------------------------------------------------
  return (
    <div ref={rootRef} className="fixed inset-x-0 bottom-0 z-40" data-export-hidden>
      <div className="bg-card border-t border-border rounded-t-2xl shadow-elevated overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="팔레트 접기"
          className="w-full flex flex-col items-center gap-1 pt-2 pb-1"
        >
          <span className="h-1 w-9 rounded-full bg-border" />
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-1 rounded-xl bg-muted/70 p-1">{tabs}</div>
        </div>

        {targetLabel && (
          <p className="px-3 pb-1.5 text-[11px] text-primary font-semibold">{targetLabel}에 추가됩니다</p>
        )}

        <div className="px-3 pb-3 max-h-[32vh] overflow-y-auto">{body}</div>
        {hint}
      </div>
    </div>
  );
};

export default FloatingPalette;
