import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2, Image, CopyPlus, Music } from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditorHeader from "@/components/EditorHeader";
import FloatingPalette from "@/components/FloatingPalette";
import CastEditor from "@/components/CastEditor";
import SelectionToolbar from "@/components/SelectionToolbar";
import SectionNav from "@/components/SectionNav";
import SortableCard from "@/components/SortableCard";
import ExportHeader from "@/components/ExportHeader";
import StageGrid from "@/components/StageGrid";
import DrawingCanvas from "@/components/DrawingCanvas";
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
  AddElementPayload, BlockingElement, BlockingState, Character, ContextMenuState,
  CustomPattern, StageOrientation, StagePoint, VerseSection,
} from "@/types/blocking";

const STORAGE_KEY = "choreography-project-v1";
const DEFAULT_SECTIONS: VerseSection[] = [{ id: 1, lyrics: "", blockingElements: [] }];

const helpSteps = (
  <ol className="space-y-2 list-decimal list-inside marker:text-primary marker:font-semibold">
    <li>맨 위에 <strong className="text-foreground">제목과 등장인물</strong>을 입력하세요. 인물 칩을 누르면 색을 바꿀 수 있어요.</li>
    <li>아래 <strong className="text-foreground">요소 팔레트</strong>에서 인물·도형·메모를 무대로 끌어다 놓거나 클릭해 가운데에 넣으세요.</li>
    <li><strong className="text-foreground">이동 경로</strong>는 인물 탭에서 이름을 고른 뒤, 무대를 클릭해 지나갈 지점을 이어 그리고 <kbd>Enter</kbd>로 마칩니다.</li>
    <li>요소를 클릭하면 위쪽에 <strong className="text-foreground">편집 막대</strong>가 떠서 복제·앞뒤·색상·삭제를 할 수 있어요.</li>
    <li>절 카드의 <strong className="text-foreground">복제</strong> 버튼을 쓰면 앞 절의 배치를 그대로 이어받아 다음 절을 빠르게 만들 수 있습니다.</li>
    <li>절 왼쪽 손잡이를 끌어 <strong className="text-foreground">순서를 바꾸고</strong>, 완성하면 <strong className="text-foreground">내보내기</strong>로 저장하세요. 작업은 자동 저장됩니다.</li>
  </ol>
);

const ChoreographyPage: React.FC = () => {
  const { toast } = useToast();
  const history = useUndoRedo<BlockingState>();
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
  const [verseSections, setVerseSections] = usePersistentState<VerseSection[]>(`${STORAGE_KEY}:sections`, DEFAULT_SECTIONS);
  const [customPatterns, setCustomPatterns] = usePersistentState<CustomPattern[]>(`${STORAGE_KEY}:patterns`, []);
  const [showGuides, setShowGuides] = usePersistentState(`${STORAGE_KEY}:guides`, true);
  const [orientation, setOrientation] = usePersistentState<StageOrientation>(`${STORAGE_KEY}:orientation`, "performer");

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
  const [showDrawing, setShowDrawing] = useState(false);
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
    history.push({ title, cast, verseSections, customPatterns });
  }, [title, cast, verseSections, customPatterns, history]);

  const updateSectionElements = useCallback(
    (sectionIndex: number, fn: (els: BlockingElement[]) => BlockingElement[]) => {
      setVerseSections((prev) => {
        if (!prev[sectionIndex]) return prev;
        const updated = [...prev];
        updated[sectionIndex] = { ...updated[sectionIndex], blockingElements: fn(updated[sectionIndex].blockingElements) };
        return updated;
      });
    },
    [setVerseSections]
  );

  const el = useElementActions(updateSectionElements, snapshot);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Sections ---------------------------------------------------------------
  const nextSectionId = () => verseSections.reduce((m, s) => Math.max(m, s.id), 0) + 1;

  const handleAddSection = () => {
    snapshot();
    const id = nextSectionId();
    setVerseSections((prev) => [...prev, { id, lyrics: "", blockingElements: [] }]);
    setActiveSection(verseSections.length);
  };

  /** Carry the previous verse's staging forward — the most common real workflow. */
  const handleDuplicateSection = (index: number) => {
    snapshot();
    const id = nextSectionId();
    setVerseSections((prev) => {
      const source = prev[index];
      const copy: VerseSection = {
        id,
        lyrics: source.lyrics,
        blockingElements: source.blockingElements.map((e, i) => ({
          ...e,
          id: `${e.type}-${Date.now()}-${i}`,
          points: e.points?.map((p) => ({ ...p })),
        })),
      };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
    setActiveSection(index + 1);
    toast({ title: `${index + 1}번 블록의 배치를 이어받았습니다` });
  };

  const handleDeleteSection = (index: number) => {
    if (verseSections.length <= 1) return;
    snapshot();
    setVerseSections((prev) => prev.filter((_, i) => i !== index));
    setActiveSection((prev) => Math.max(0, Math.min(prev, verseSections.length - 2)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    snapshot();
    setVerseSections((prev) => {
      const from = prev.findIndex((s) => s.id === active.id);
      const to = prev.findIndex((s) => s.id === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  };

  const handleLyricsChange = (index: number, lyrics: string) => {
    setVerseSections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], lyrics };
      return updated;
    });
  };

  const focusSection = useCallback((index: number) => {
    setActiveSection(index);
    sectionRefs.current[index]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // --- Patterns ---------------------------------------------------------------
  const handleCreatePattern = (svg: string) => {
    setCustomPatterns((prev) => [...prev, { id: `custom-${Date.now()}`, svg, type: "custom" }]);
    setShowDrawing(false);
    toast({ title: "패턴이 저장되었습니다" });
  };

  const handleDeletePattern = (id: string) => {
    setCustomPatterns((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "패턴을 삭제했습니다" });
  };

  // --- Files / sharing --------------------------------------------------------
  const projectData = () => ({
    title,
    cast,
    characters: castToLegacyString(cast),
    verseSections,
    customPatterns,
    pageType: "choreography",
    version: 3,
  });

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(projectData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(title) || "choreography"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "JSON 다운로드 완료" });
  };

  const handleUploadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.pageType === "scene" || !Array.isArray(data.verseSections)) {
          toast({
            title: "로드 실패",
            description: "안무 동선 파일이 아닙니다. 장면별 동선 파일은 장면별 동선 화면에서 불러오세요.",
            variant: "destructive",
          });
          return;
        }
        snapshot();
        setTitle(data.title || "");
        setCast(castFromData(data));
        setVerseSections(data.verseSections.length > 0 ? data.verseSections : DEFAULT_SECTIONS);
        setCustomPatterns(Array.isArray(data.customPatterns) ? data.customPatterns : []);
        toast({ title: "프로젝트가 로드되었습니다" });
      } catch {
        toast({ title: "로드 실패", description: "유효한 JSON 파일이 아닙니다.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportJPG = async (index: number) => {
    const ref = sectionRefs.current[index];
    if (!ref?.current) return;
    await exportAsJPG(ref, `${title || "verse"}-${index + 1}`);
    toast({ title: `${index + 1}번 블록 이미지를 저장했습니다` });
  };

  const handleExportAllJPG = async () => {
    for (let i = 0; i < sectionRefs.current.length; i++) {
      if (sectionRefs.current[i]?.current) await exportAsJPG(sectionRefs.current[i], `${title || "verse"}-${i + 1}`);
    }
    toast({ title: `이미지 ${verseSections.length}장을 저장했습니다` });
  };

  const handleExportPDF = async () => {
    await exportAsPDF(sectionRefs.current.filter(Boolean), title || "choreography");
    toast({ title: "PDF로 저장했습니다" });
  };

  const handleShareLink = async () => {
    const url = buildShareUrl("choreography", projectData());
    const ok = await copyToClipboard(url);
    toast({
      title: ok ? "공유 링크를 복사했습니다" : "링크 복사 실패",
      description: ok
        ? `다른 기기에 붙여넣으면 동일한 동선을 볼 수 있어요. (${(url.length / 1024).toFixed(1)}KB)`
        : "브라우저 권한을 확인해 주세요.",
      variant: ok ? undefined : "destructive",
    });
  };

  // --- Palette / drawing ------------------------------------------------------
  const safeActive = Math.max(0, Math.min(activeSection, verseSections.length - 1));

  const handleAddElement = useCallback(
    (payload: AddElementPayload) => {
      const idx = Math.max(0, Math.min(activeSection, verseSections.length - 1));
      sectionRefs.current[idx]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.dispatchEvent(new CustomEvent("blocking-add-center", { detail: { sectionIndex: idx, ...payload } }));
    },
    [activeSection, verseSections.length]
  );

  const handleStartMovePath = (character: Character | null) => {
    if (!character) return;
    const idx = Math.max(0, Math.min(activeSection, verseSections.length - 1));
    sectionRefs.current[idx]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setDrawing({ sectionIndex: idx, color: character.color, label: character.name });
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

  // --- Undo / redo ------------------------------------------------------------
  const applyState = useCallback(
    (state: BlockingState) => {
      setTitle(state.title);
      setCast(state.cast ?? []);
      setVerseSections(state.verseSections);
      setCustomPatterns(state.customPatterns);
    },
    [setTitle, setCast, setVerseSections, setCustomPatterns]
  );

  const handleUndo = useCallback(() => {
    const state = history.undo({ title, cast, verseSections, customPatterns });
    if (state) applyState(state);
  }, [history, title, cast, verseSections, customPatterns, applyState]);

  const handleRedo = useCallback(() => {
    const state = history.redo({ title, cast, verseSections, customPatterns });
    if (state) applyState(state);
  }, [history, title, cast, verseSections, customPatterns, applyState]);

  // --- Clipboard --------------------------------------------------------------
  const handleCopy = useCallback(() => {
    const source = verseSections[contextMenu.sectionIndex]?.blockingElements.find((e) => e.id === contextMenu.targetId);
    if (source) {
      setCopiedElement(source);
      toast({ title: "복사되었습니다" });
    }
  }, [contextMenu, verseSections, toast]);

  const handlePaste = useCallback(() => {
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
  }, [copiedElement, contextMenu, el]);

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
      verseSections?: VerseSection[]; customPatterns?: CustomPattern[];
    }>(s);
    if (data && Array.isArray(data.verseSections)) {
      setTitle(data.title || "");
      setCast(castFromData(data));
      setVerseSections(data.verseSections.length > 0 ? data.verseSections : DEFAULT_SECTIONS);
      setCustomPatterns(Array.isArray(data.customPatterns) ? data.customPatterns : []);
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
    setVerseSections(DEFAULT_SECTIONS);
    setCustomPatterns([]);
    history.reset();
    ["title", "cast", "characters", "sections", "patterns"].forEach((k) => clearPersistentState(`${STORAGE_KEY}:${k}`));
    toast({ title: "새 프로젝트를 시작합니다" });
  };

  if (sectionRefs.current.length !== verseSections.length) {
    sectionRefs.current = verseSections.map((_, i) => sectionRefs.current[i] || React.createRef<HTMLDivElement>());
  }

  const navItems = verseSections.map((s, i) => ({ key: String(s.id), label: `#${i + 1}`, index: i }));

  return (
    <div className="min-h-screen bg-background">
      <EditorHeader
        mode="choreography"
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

      <main id="main" className="container mx-auto px-3 sm:px-4 py-5" style={{ paddingBottom: "calc(var(--palette-h, 96px) + 24px)" }}>
        <div className="max-w-3xl mx-auto">
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
                placeholder="예: 뮤지컬 패딩턴 1막"
              />
            </div>
            <CastEditor cast={cast} onChange={setCast} onBeforeChange={snapshot} />
          </div>

          <SectionNav items={navItems} activeIndex={safeActive} onSelect={focusSection} />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={verseSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-5 mt-4">
                {verseSections.map((section, index) => (
                  <SortableCard
                    key={section.id}
                    id={section.id}
                    className="section-card"
                    exportRef={sectionRefs.current[index]}
                    isActive={index === safeActive}
                    onFocusCapture={() => setActiveSection(index)}
                  >
                    {(handle) => (
                      <>
                        <ExportHeader title={title} sectionLabel={`#${index + 1}`} cast={cast} />
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            <span data-export-hidden>{handle}</span>
                            <h3 className="text-sm font-bold text-foreground">#{index + 1}</h3>
                            {index === safeActive && (
                              <span
                                className="ml-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5"
                                data-export-hidden
                              >
                                작업 중
                              </span>
                            )}
                          </div>
                          <div className="flex gap-0.5" data-export-hidden>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleDuplicateSection(index)} aria-label="이 블록 복제">
                                  <CopyPlus className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>배치를 이어받아 복제</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleExportJPG(index)} aria-label="이미지로 저장">
                                  <Image className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>이미지(JPG)로 저장</TooltipContent>
                            </Tooltip>
                            {verseSections.length > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteSection(index)} aria-label="블록 삭제">
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>이 블록 삭제</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>

                        <Textarea
                          value={section.lyrics}
                          onChange={(e) => handleLyricsChange(index, e.target.value)}
                          onFocus={() => {
                            setActiveSection(index);
                            snapshot();
                          }}
                          placeholder="예: 런던 거리 위, 패딩턴이 처음 도착했네"
                          aria-label={`${index + 1}번 블록 가사`}
                          className="mb-3 min-h-[60px] text-sm"
                        />

                        <StageGrid
                          sectionIndex={index}
                          elements={section.blockingElements}
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
                          drawing={drawing?.sectionIndex === index ? { color: drawing.color, label: drawing.label } : null}
                          onDrawFinish={handleDrawFinish}
                          onDrawCancel={() => setDrawing(null)}
                          showCenterGuides={showGuides}
                          orientation={orientation}
                          isActive={index === safeActive}
                        />
                      </>
                    )}
                  </SortableCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button variant="outline" onClick={handleAddSection} className="w-full mt-5 border-dashed border-2">
            <Plus className="w-4 h-4 mr-1" /> 블록 추가
          </Button>

          {verseSections.length === 1 && verseSections[0].blockingElements.length === 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Music className="inline w-3.5 h-3.5 mr-1 align-text-bottom" />
              절이 바뀌어도 배치가 비슷하다면 <strong className="text-foreground">복제</strong> 버튼으로 이어서 만드세요.
            </p>
          )}
        </div>
      </main>

      <FloatingPalette
        cast={cast}
        paths={recommendedPaths}
        customPatterns={customPatterns}
        onDeletePattern={handleDeletePattern}
        onOpenDrawing={() => setShowDrawing(true)}
        onAddElement={handleAddElement}
        onStartMovePath={handleStartMovePath}
        targetLabel={`#${safeActive + 1}`}
        shapesFirst
      />

      <Dialog open={showDrawing} onOpenChange={setShowDrawing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>패턴 그리기</DialogTitle>
          </DialogHeader>
          <DrawingCanvas onSavePattern={handleCreatePattern} />
        </DialogContent>
      </Dialog>

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

export default ChoreographyPage;
