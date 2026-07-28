import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Trash2, Image, CopyPlus, ChevronDown, ChevronRight, FolderPlus, Columns2, Columns3, Square,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditorHeader from "@/components/EditorHeader";
import FloatingPalette from "@/components/FloatingPalette";
import CastEditor from "@/components/CastEditor";
import SelectionToolbar from "@/components/SelectionToolbar";
import SectionNav from "@/components/SectionNav";
import SortableCard from "@/components/SortableCard";
import ExportHeader from "@/components/ExportHeader";
import StageGrid from "@/components/StageGrid";
import BlockingContextMenu from "@/components/BlockingContextMenu";
import { recommendedPaths } from "@/components/RecommendedPaths";
import { useToast } from "@/hooks/use-toast";
import { usePersistentState, clearPersistentState, useSaveStatus } from "@/hooks/use-persistent-state";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useElementActions } from "@/hooks/use-element-actions";
import { exportAsJPG, exportAsPDF } from "@/utils/exportUtils";
import { sanitizeFilename } from "@/lib/utils";
import { buildShareUrl, decodeShare, copyToClipboard } from "@/lib/share";
import { castFromData, castFromLegacyString, castToLegacyString } from "@/lib/cast";
import type {
  AddElementPayload, BlockingElement, Character, ContextMenuState, SceneGroup,
  SceneSection, StageOrientation, StagePoint,
} from "@/types/blocking";

const STORAGE_KEY = "scene-project-v1";
const newScene = (id: number): SceneSection => ({ id, script: "", blockingElements: [] });
const DEFAULT_GROUPS: SceneGroup[] = [{ id: 1, title: "1장", collapsed: false, scenes: [newScene(1)] }];

interface SceneState {
  title: string;
  cast: Character[];
  sceneGroups: SceneGroup[];
}

/** Walk groups → scenes in render order, returning {gi, si} for a flat index. */
function locate(groups: SceneGroup[], flatIndex: number): { gi: number; si: number } | null {
  let n = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    for (let si = 0; si < groups[gi].scenes.length; si++) {
      if (n === flatIndex) return { gi, si };
      n++;
    }
  }
  return null;
}

const DENSITY = [
  { cols: 1, icon: Square, label: "1열 (크게)" },
  { cols: 2, icon: Columns2, label: "2열" },
  { cols: 3, icon: Columns3, label: "3열" },
] as const;

const helpSteps = (
  <ol className="space-y-2 list-decimal list-inside marker:text-primary marker:font-semibold">
    <li>맨 위에 <strong className="text-foreground">제목과 등장인물</strong>을 입력하세요. 인물 칩을 누르면 색을 바꿀 수 있어요.</li>
    <li>장면을 <strong className="text-foreground">장(章)</strong>으로 묶고, 제목 왼쪽 화살표로 접거나 펼칩니다.</li>
    <li>아래 <strong className="text-foreground">요소 팔레트</strong>에서 인물·도형·메모를 무대로 끌어다 놓거나 클릭해 가운데에 넣으세요.</li>
    <li><strong className="text-foreground">이동 경로</strong>는 인물 탭에서 이름을 고른 뒤, 무대를 클릭해 지나갈 지점을 이어 그리고 <kbd>Enter</kbd>로 마칩니다.</li>
    <li>장면 카드의 <strong className="text-foreground">복제</strong>로 앞 장면 배치를 이어받고, 손잡이를 끌어 순서를 바꿉니다.</li>
    <li>무대가 작아 보이면 오른쪽 위 <strong className="text-foreground">열 수</strong>를 1열로 바꿔 크게 편집하세요.</li>
  </ol>
);

const ScenePage: React.FC = () => {
  const { toast } = useToast();
  const history = useUndoRedo<SceneState>();
  const saveStatus = useSaveStatus();

  const legacyCast = useMemo(() => {
    try {
      if (localStorage.getItem(`${STORAGE_KEY}:cast`)) return [];
      const raw = localStorage.getItem(`${STORAGE_KEY}:characters`);
      return raw ? castFromLegacyString(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  }, []);

  const [title, setTitle] = usePersistentState(`${STORAGE_KEY}:title`, "");
  const [cast, setCast] = usePersistentState<Character[]>(`${STORAGE_KEY}:cast`, legacyCast);
  const [sceneGroups, setSceneGroups] = usePersistentState<SceneGroup[]>(`${STORAGE_KEY}:groups`, DEFAULT_GROUPS);
  const [showGuides, setShowGuides] = usePersistentState(`${STORAGE_KEY}:guides`, true);
  const [orientation, setOrientation] = usePersistentState<StageOrientation>(`${STORAGE_KEY}:orientation`, "performer");
  const [columns, setColumns] = usePersistentState<number>(`${STORAGE_KEY}:columns`, 2);

  // One-time upgrade: fold the old comma-separated `characters` string into the
  // structured cast so colours stop reshuffling, then drop the legacy key.
  useEffect(() => {
    if (legacyCast.length === 0) return;
    setCast([...legacyCast]);
    clearPersistentState(`${STORAGE_KEY}:characters`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false, x: 0, y: 0, targetId: null, sectionIndex: 0,
  });
  const [copiedElement, setCopiedElement] = useState<BlockingElement | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [selection, setSelection] = useState<{ element: BlockingElement | null; sectionIndex: number }>({
    element: null, sectionIndex: 0,
  });
  const [drawing, setDrawing] = useState<{ sectionIndex: number; color: string; label?: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ id: string; sectionIndex: number; value: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const sectionRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const snapshot = useCallback(() => {
    history.push({ title, cast, sceneGroups });
  }, [title, cast, sceneGroups, history]);

  const totalScenes = sceneGroups.reduce((n, g) => n + g.scenes.length, 0);

  const updateSceneElements = useCallback(
    (flatIndex: number, fn: (els: BlockingElement[]) => BlockingElement[]) => {
      setSceneGroups((prev) => {
        const loc = locate(prev, flatIndex);
        if (!loc) return prev;
        const groups = prev.map((g) => ({ ...g, scenes: [...g.scenes] }));
        const scene = groups[loc.gi].scenes[loc.si];
        groups[loc.gi].scenes[loc.si] = { ...scene, blockingElements: fn(scene.blockingElements) };
        return groups;
      });
    },
    [setSceneGroups]
  );

  const el = useElementActions(updateSceneElements, snapshot);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Scenes & groups --------------------------------------------------------
  const handleAddScene = (groupIndex: number) => {
    snapshot();
    setSceneGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex
          ? { ...g, collapsed: false, scenes: [...g.scenes, newScene(g.scenes.reduce((m, s) => Math.max(m, s.id), 0) + 1)] }
          : g
      )
    );
  };

  /** Carry a scene's staging into the next one, the way rehearsal notes actually grow. */
  const handleDuplicateScene = (flatIndex: number) => {
    snapshot();
    setSceneGroups((prev) => {
      const loc = locate(prev, flatIndex);
      if (!loc) return prev;
      return prev.map((g, gi) => {
        if (gi !== loc.gi) return g;
        const source = g.scenes[loc.si];
        const copy: SceneSection = {
          id: g.scenes.reduce((m, s) => Math.max(m, s.id), 0) + 1,
          script: source.script,
          blockingElements: source.blockingElements.map((e, i) => ({
            ...e,
            id: `${e.type}-${Date.now()}-${i}`,
            points: e.points?.map((p) => ({ ...p })),
          })),
        };
        return { ...g, scenes: [...g.scenes.slice(0, loc.si + 1), copy, ...g.scenes.slice(loc.si + 1)] };
      });
    });
    setActiveSection(flatIndex + 1);
    toast({ title: "장면 배치를 이어받았습니다" });
  };

  const handleDeleteScene = (flatIndex: number) => {
    if (totalScenes <= 1) return;
    snapshot();
    setSceneGroups((prev) => {
      const loc = locate(prev, flatIndex);
      if (!loc) return prev;
      return prev.map((g, gi) => (gi === loc.gi ? { ...g, scenes: g.scenes.filter((_, si) => si !== loc.si) } : g));
    });
    setActiveSection((prev) => Math.max(0, Math.min(prev, totalScenes - 2)));
  };

  const handleScriptChange = (flatIndex: number, script: string) => {
    setSceneGroups((prev) => {
      const loc = locate(prev, flatIndex);
      if (!loc) return prev;
      const groups = prev.map((g) => ({ ...g, scenes: [...g.scenes] }));
      groups[loc.gi].scenes[loc.si] = { ...groups[loc.gi].scenes[loc.si], script };
      return groups;
    });
  };

  const handleAddGroup = () => {
    snapshot();
    setSceneGroups((prev) => {
      const nextId = prev.reduce((m, g) => Math.max(m, g.id), 0) + 1;
      return [...prev, { id: nextId, title: `${prev.length + 1}장`, collapsed: false, scenes: [newScene(1)] }];
    });
  };

  const handleDeleteGroup = (groupIndex: number) => {
    if (sceneGroups.length <= 1) return;
    snapshot();
    setSceneGroups((prev) => prev.filter((_, gi) => gi !== groupIndex));
  };

  const handleRenameGroup = (groupIndex: number, groupTitle: string) =>
    setSceneGroups((prev) => prev.map((g, gi) => (gi === groupIndex ? { ...g, title: groupTitle } : g)));

  const toggleCollapse = (groupIndex: number) =>
    setSceneGroups((prev) => prev.map((g, gi) => (gi === groupIndex ? { ...g, collapsed: !g.collapsed } : g)));

  const handleDragEnd = (groupIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    snapshot();
    setSceneGroups((prev) =>
      prev.map((g, gi) => {
        if (gi !== groupIndex) return g;
        const from = g.scenes.findIndex((s) => `s-${g.id}-${s.id}` === active.id);
        const to = g.scenes.findIndex((s) => `s-${g.id}-${s.id}` === over.id);
        return from < 0 || to < 0 ? g : { ...g, scenes: arrayMove(g.scenes, from, to) };
      })
    );
  };

  const focusSection = useCallback(
    (index: number) => {
      const loc = locate(sceneGroups, index);
      if (loc && sceneGroups[loc.gi].collapsed) {
        setSceneGroups((prev) => prev.map((g, gi) => (gi === loc.gi ? { ...g, collapsed: false } : g)));
      }
      setActiveSection(index);
      requestAnimationFrame(() =>
        sectionRefs.current[index]?.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
    },
    [sceneGroups, setSceneGroups]
  );

  // --- Export / share ---------------------------------------------------------
  const expandAllThen = async (cb: () => void | Promise<void>) => {
    if (sceneGroups.some((g) => g.collapsed)) {
      setSceneGroups((prev) => prev.map((g) => ({ ...g, collapsed: false })));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    await cb();
  };

  const handleExportJPG = async (flatIndex: number) => {
    const ref = sectionRefs.current[flatIndex];
    if (!ref?.current) return;
    await exportAsJPG(ref, `${title || "scene"}-${flatIndex + 1}`);
    toast({ title: "장면 이미지를 저장했습니다" });
  };

  const handleExportAllJPG = () =>
    expandAllThen(async () => {
      for (let i = 0; i < sectionRefs.current.length; i++) {
        if (sectionRefs.current[i]?.current) await exportAsJPG(sectionRefs.current[i], `${title || "scene"}-${i + 1}`);
      }
      toast({ title: `이미지 ${totalScenes}장을 저장했습니다` });
    });

  const handleExportPDF = () =>
    expandAllThen(async () => {
      await exportAsPDF(sectionRefs.current.filter(Boolean), title || "scene");
      toast({ title: "PDF로 저장했습니다" });
    });

  const projectData = () => ({
    title,
    cast,
    characters: castToLegacyString(cast),
    sceneGroups,
    pageType: "scene",
    version: 3,
  });

  const handleShareLink = async () => {
    const url = buildShareUrl("scene", projectData());
    const ok = await copyToClipboard(url);
    toast({
      title: ok ? "공유 링크를 복사했습니다" : "링크 복사 실패",
      description: ok
        ? `다른 기기에 붙여넣으면 동일한 동선을 볼 수 있어요. (${(url.length / 1024).toFixed(1)}KB)`
        : "브라우저 권한을 확인해 주세요.",
      variant: ok ? undefined : "destructive",
    });
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(projectData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(title) || "scene"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "JSON 다운로드 완료" });
  };

  /** Accept the grouped format and the legacy flat sceneSections format. */
  const groupsFromData = (data: { sceneGroups?: SceneGroup[]; sceneSections?: SceneSection[] }): SceneGroup[] | null => {
    if (Array.isArray(data.sceneGroups) && data.sceneGroups.length > 0) return data.sceneGroups;
    if (Array.isArray(data.sceneSections) && data.sceneSections.length > 0) {
      return [{ id: 1, title: "1장", collapsed: false, scenes: data.sceneSections }];
    }
    return null;
  };

  const handleUploadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const groups = groupsFromData(data);
        if ((data.pageType && data.pageType !== "scene") || !groups) {
          toast({
            title: "로드 실패",
            description: "장면별 동선 파일이 아닙니다. 안무 동선 파일은 안무 동선 화면에서 불러오세요.",
            variant: "destructive",
          });
          return;
        }
        snapshot();
        setTitle(data.title || "");
        setCast(castFromData(data));
        setSceneGroups(groups);
        toast({ title: "프로젝트가 로드되었습니다" });
      } catch {
        toast({ title: "로드 실패", description: "유효한 JSON 파일이 아닙니다.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // --- Clipboard --------------------------------------------------------------
  const handleCopy = () => {
    const loc = locate(sceneGroups, contextMenu.sectionIndex);
    const source = loc && sceneGroups[loc.gi].scenes[loc.si]?.blockingElements.find((e) => e.id === contextMenu.targetId);
    if (source) {
      setCopiedElement(source);
      toast({ title: "복사되었습니다" });
    }
  };

  const handlePaste = () => {
    if (!copiedElement) return;
    el.add(
      {
        ...copiedElement,
        id: `${copiedElement.type}-${Date.now()}`,
        position: { x: copiedElement.position.x + 4, y: copiedElement.position.y + 4 },
        points: copiedElement.points?.map((p) => ({ x: p.x + 4, y: p.y + 4 })),
      },
      contextMenu.sectionIndex
    );
  };

  // --- Undo / redo ------------------------------------------------------------
  const applyState = useCallback(
    (state: SceneState) => {
      setTitle(state.title);
      setCast(state.cast ?? []);
      setSceneGroups(state.sceneGroups);
    },
    [setTitle, setCast, setSceneGroups]
  );

  const handleUndo = useCallback(() => {
    const state = history.undo({ title, cast, sceneGroups });
    if (state) applyState(state);
  }, [history, title, cast, sceneGroups, applyState]);

  const handleRedo = useCallback(() => {
    const state = history.redo({ title, cast, sceneGroups });
    if (state) applyState(state);
  }, [history, title, cast, sceneGroups, applyState]);

  // --- Palette / drawing ------------------------------------------------------
  const resolveTarget = useCallback((): number => {
    const loc = locate(sceneGroups, activeSection);
    if (loc && !sceneGroups[loc.gi].collapsed) return activeSection;
    let n = 0;
    for (const g of sceneGroups) {
      if (!g.collapsed && g.scenes.length > 0) return n;
      n += g.scenes.length;
    }
    return -1;
  }, [activeSection, sceneGroups]);

  const targetIndex = resolveTarget();

  const targetLabel = useMemo(() => {
    if (targetIndex < 0) return undefined;
    const loc = locate(sceneGroups, targetIndex);
    if (!loc) return undefined;
    return `${sceneGroups[loc.gi].title || `${loc.gi + 1}장`} · 장면 ${loc.si + 1}`;
  }, [targetIndex, sceneGroups]);

  const handleAddElement = useCallback(
    (payload: AddElementPayload) => {
      if (targetIndex < 0) {
        toast({ title: "먼저 장면을 펼쳐 주세요" });
        return;
      }
      sectionRefs.current[targetIndex]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.dispatchEvent(new CustomEvent("blocking-add-center", { detail: { sectionIndex: targetIndex, ...payload } }));
    },
    [targetIndex, toast]
  );

  const handleStartMovePath = (character: Character | null) => {
    if (!character) return;
    if (targetIndex < 0) {
      toast({ title: "먼저 장면을 펼쳐 주세요" });
      return;
    }
    sectionRefs.current[targetIndex]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setDrawing({ sectionIndex: targetIndex, color: character.color, label: character.name });
    toast({
      title: `${character.name}의 이동 경로`,
      description: "무대를 클릭해 지나갈 지점을 이어 주세요. Enter로 마치고 Esc로 취소합니다.",
    });
  };

  const handleDrawFinish = (points: StagePoint[]) => {
    if (!drawing) return;
    el.addMovePath(points, drawing.color, drawing.label, drawing.sectionIndex);
    setDrawing(null);
  };

  // --- Shared shortcuts -------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      } else if (key === "d" && selection.element) {
        e.preventDefault();
        el.duplicate(selection.element.id, selection.sectionIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo, selection, el]);

  // Load a shared project from the URL (?s=...) once on mount
  useEffect(() => {
    const s = searchParams.get("s");
    if (!s) return;
    const data = decodeShare<{
      title?: string; characters?: string; cast?: Character[];
      sceneGroups?: SceneGroup[]; sceneSections?: SceneSection[];
    }>(s);
    const groups = data ? groupsFromData(data) : null;
    if (groups) {
      setTitle(data?.title || "");
      setCast(castFromData(data ?? {}));
      setSceneGroups(groups);
      toast({ title: "공유된 동선을 불러왔습니다" });
    } else {
      toast({ title: "공유 링크를 읽을 수 없습니다", variant: "destructive" });
    }
    searchParams.delete("s");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setTitle("");
    setCast([]);
    setSceneGroups(DEFAULT_GROUPS);
    history.reset();
    ["title", "cast", "characters", "groups"].forEach((k) => clearPersistentState(`${STORAGE_KEY}:${k}`));
    toast({ title: "새 프로젝트를 시작합니다" });
  };

  if (sectionRefs.current.length !== totalScenes) {
    sectionRefs.current = Array.from(
      { length: totalScenes },
      (_, i) => sectionRefs.current[i] || React.createRef<HTMLDivElement>()
    );
  }

  // Global flat index per scene, stable even when a group is collapsed.
  let flatCursor = 0;
  const sceneFlat = sceneGroups.map((g) => g.scenes.map(() => flatCursor++));

  const navItems = sceneGroups.map((g, gi) => ({
    key: `g-${g.id}`,
    label: g.title || `${gi + 1}장`,
    index: sceneFlat[gi][0] ?? 0,
    count: g.scenes.length,
  }));

  const gridCols = columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="min-h-screen bg-background">
      <EditorHeader
        mode="scene"
        saveStatus={saveStatus}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        showGuides={showGuides}
        onToggleGuides={setShowGuides}
        orientation={orientation}
        onToggleOrientation={setOrientation}
        onExportPDF={handleExportPDF}
        onExportAllJPG={handleExportAllJPG}
        onShareLink={handleShareLink}
        onDownloadJSON={handleDownloadJSON}
        onUploadJSON={() => fileInputRef.current?.click()}
        onReset={handleReset}
        helpSteps={helpSteps}
      />

      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleUploadJSON} />

      <SelectionToolbar
        element={selection.element}
        onDuplicate={() => selection.element && el.duplicate(selection.element.id, selection.sectionIndex)}
        onDelete={() => selection.element && el.remove(selection.element.id, selection.sectionIndex)}
        onBringToFront={() => selection.element && el.reorder(selection.element.id, "front", selection.sectionIndex)}
        onSendToBack={() => selection.element && el.reorder(selection.element.id, "back", selection.sectionIndex)}
        onResetRotation={() => selection.element && el.rotate(selection.element.id, 0, selection.sectionIndex)}
        onRecolor={(color) => selection.element && el.recolor(selection.element.id, color, selection.sectionIndex)}
      />

      <main
        id="main"
        className="container mx-auto px-3 sm:px-4 py-5"
        style={{
          paddingBottom: "calc(var(--palette-h, 96px) + 24px)",
          paddingLeft: "calc(var(--palette-w, 0px) + 0.75rem)",
        }}
      >
        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div>
            <label htmlFor="project-title" className="text-sm font-medium text-foreground mb-1.5 block">
              프로젝트 제목
            </label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={snapshot}
              placeholder="예: 뮤지컬 패딩턴"
            />
          </div>
          <CastEditor cast={cast} onChange={setCast} onBeforeChange={snapshot} />
        </div>

        <SectionNav items={navItems} activeIndex={Math.max(0, targetIndex)} onSelect={focusSection} />

        <div className="flex items-center justify-end gap-1 mt-3" data-export-hidden>
          <span className="text-xs text-muted-foreground mr-1">한 줄에</span>
          {DENSITY.map(({ cols, icon: Icon, label }) => (
            <Tooltip key={cols}>
              <TooltipTrigger asChild>
                <Button
                  variant={columns === cols ? "default" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setColumns(cols)}
                  aria-label={label}
                  aria-pressed={columns === cols}
                >
                  <Icon className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="space-y-5 mt-3">
          {sceneGroups.map((group, groupIndex) => (
            <section key={group.id} className="rounded-2xl border border-border bg-muted/30">
              <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => toggleCollapse(groupIndex)}
                  aria-label={group.collapsed ? "펼치기" : "접기"}
                  aria-expanded={!group.collapsed}
                >
                  {group.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <Input
                  value={group.title}
                  onChange={(e) => handleRenameGroup(groupIndex, e.target.value)}
                  onFocus={snapshot}
                  className="h-8 max-w-[160px] font-semibold"
                  aria-label="장 제목"
                  placeholder="예: 1장"
                />
                <span className="text-xs text-muted-foreground shrink-0">장면 {group.scenes.length}개</span>
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-8" onClick={() => handleAddScene(groupIndex)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> 장면 추가
                </Button>
                {sceneGroups.length > 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeleteGroup(groupIndex)}
                        aria-label="장 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>이 장 삭제</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {!group.collapsed && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(groupIndex)}>
                  <SortableContext
                    items={group.scenes.map((s) => `s-${group.id}-${s.id}`)}
                    strategy={rectSortingStrategy}
                  >
                    <div className={`grid ${gridCols} gap-4 px-3 pb-3`}>
                      {group.scenes.map((scene, sceneIdx) => {
                        const flatIndex = sceneFlat[groupIndex][sceneIdx];
                        const isActive = flatIndex === targetIndex;
                        return (
                          <SortableCard
                            key={scene.id}
                            id={`s-${group.id}-${scene.id}`}
                            className="section-card p-3"
                            exportRef={sectionRefs.current[flatIndex]}
                            isActive={isActive}
                            onFocusCapture={() => setActiveSection(flatIndex)}
                          >
                            {(handle) => (
                              <>
                                <ExportHeader
                                  title={title}
                                  sectionLabel={`${group.title || `${groupIndex + 1}장`} · 장면 ${sceneIdx + 1}`}
                                  cast={cast}
                                />
                                <div className="flex items-center justify-between mb-2 gap-1">
                                  <div className="flex items-center gap-0.5 min-w-0">
                                    <span data-export-hidden>{handle}</span>
                                    <h3 className="text-xs font-bold text-foreground">장면 {sceneIdx + 1}</h3>
                                    {isActive && (
                                      <span
                                        className="ml-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5"
                                        data-export-hidden
                                      >
                                        작업 중
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-0.5" data-export-hidden>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleDuplicateScene(flatIndex)}
                                          aria-label="이 장면 복제"
                                        >
                                          <CopyPlus className="w-3 h-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>배치를 이어받아 복제</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleExportJPG(flatIndex)}
                                          aria-label="이미지로 저장"
                                        >
                                          <Image className="w-3 h-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>이미지(JPG)로 저장</TooltipContent>
                                    </Tooltip>
                                    {totalScenes > 1 && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleDeleteScene(flatIndex)}
                                            aria-label="장면 삭제"
                                          >
                                            <Trash2 className="w-3 h-3 text-destructive" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>이 장면 삭제</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>

                                <Textarea
                                  value={scene.script}
                                  onChange={(e) => handleScriptChange(flatIndex, e.target.value)}
                                  onFocus={() => {
                                    setActiveSection(flatIndex);
                                    snapshot();
                                  }}
                                  placeholder="예: 패딩턴이 가방을 들고 무대 중앙으로 등장한다."
                                  aria-label={`장면 ${sceneIdx + 1} 지문`}
                                  className="mb-2 min-h-[44px] text-xs"
                                />

                                <StageGrid
                                  sectionIndex={flatIndex}
                                  elements={scene.blockingElements}
                                  onElementDrop={el.add}
                                  onElementMove={el.move}
                                  onElementRemove={el.remove}
                                  onElementResize={el.resize}
                                  onElementRotate={el.rotate}
                                  onContextMenu={setContextMenu}
                                  onMoveStart={snapshot}
                                  onActivate={setActiveSection}
                                  onSelectionChange={(element, sectionIndex) =>
                                    setSelection((prev) =>
                                      prev.element?.id === element?.id &&
                                      prev.element?.color === element?.color &&
                                      prev.sectionIndex === sectionIndex
                                        ? prev
                                        : { element, sectionIndex }
                                    )
                                  }
                                  onElementActivate={(element, sectionIndex) => {
                                    if (element.type === "text") {
                                      setNoteDraft({ id: element.id, sectionIndex, value: element.text ?? "" });
                                    }
                                  }}
                                  onMigrate={el.replaceAll}
                                  drawing={
                                    drawing?.sectionIndex === flatIndex
                                      ? { color: drawing.color, label: drawing.label }
                                      : null
                                  }
                                  onDrawFinish={handleDrawFinish}
                                  onDrawCancel={() => setDrawing(null)}
                                  showCenterGuides={showGuides}
                                  orientation={orientation}
                                  isActive={isActive}
                                  compact={columns > 1}
                                />
                              </>
                            )}
                          </SortableCard>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </section>
          ))}

          <Button variant="outline" onClick={handleAddGroup} className="w-full border-dashed border-2">
            <FolderPlus className="w-4 h-4 mr-1" /> 장 추가
          </Button>
        </div>
      </main>

      <FloatingPalette
        cast={cast}
        paths={recommendedPaths}
        onAddElement={handleAddElement}
        onStartMovePath={handleStartMovePath}
        targetLabel={targetLabel}
      />

      <Dialog open={!!noteDraft} onOpenChange={(open) => !open && setNoteDraft(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>메모 수정</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteDraft?.value ?? ""}
            onChange={(e) => setNoteDraft((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
            placeholder="예: 조명 페이드 아웃"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDraft(null)}>취소</Button>
            <Button
              onClick={() => {
                if (noteDraft) el.setText(noteDraft.id, noteDraft.value, noteDraft.sectionIndex);
                setNoteDraft(null);
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BlockingContextMenu
        show={contextMenu.show}
        x={contextMenu.x}
        y={contextMenu.y}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDelete={() => contextMenu.targetId && el.remove(contextMenu.targetId, contextMenu.sectionIndex)}
        onDuplicate={() => contextMenu.targetId && el.duplicate(contextMenu.targetId, contextMenu.sectionIndex)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
        canCopy={!!contextMenu.targetId}
        canDelete={!!contextMenu.targetId}
        canPaste={!!copiedElement}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />
    </div>
  );
};

export default ScenePage;
