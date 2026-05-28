import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Download, Upload, Image, FileText,
  Undo2, Redo2, RotateCcw, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePersistentState, clearPersistentState, useSaveStatus } from "@/hooks/use-persistent-state";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import StageGrid from "@/components/StageGrid";
import DraggableElement from "@/components/DraggableElement";
import PersonIcon from "@/components/PersonIcon";
import DrawingCanvas from "@/components/DrawingCanvas";
import BlockingContextMenu from "@/components/BlockingContextMenu";
import { recommendedPaths } from "@/components/RecommendedPaths";
import { exportAsJPG, exportAsPDF } from "@/utils/exportUtils";
import dancingIcon from "@/assets/dancing-icon.png";
import type { BlockingElement, VerseSection, CustomPattern, ContextMenuState, BlockingState } from "@/types/blocking";
import { CHARACTER_COLORS as COLORS } from "@/types/blocking";

const STORAGE_KEY = "choreography-project-v1";
const DEFAULT_SECTIONS: VerseSection[] = [{ id: 1, lyrics: "", blockingElements: [] }];

const ChoreographyPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const history = useUndoRedo<BlockingState>();
  const saveStatus = useSaveStatus();

  const [title, setTitle] = usePersistentState(`${STORAGE_KEY}:title`, "");
  const [characters, setCharacters] = usePersistentState(`${STORAGE_KEY}:characters`, "");
  const [verseSections, setVerseSections] = usePersistentState<VerseSection[]>(
    `${STORAGE_KEY}:sections`,
    DEFAULT_SECTIONS,
  );
  const [customPatterns, setCustomPatterns] = usePersistentState<CustomPattern[]>(
    `${STORAGE_KEY}:patterns`,
    [],
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false, x: 0, y: 0, targetId: null, sectionIndex: 0,
  });
  const [copiedElement, setCopiedElement] = useState<BlockingElement | null>(null);
  const [showDrawing, setShowDrawing] = useState(false);

  const sectionRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);

  const saveState = useCallback(() => {
    history.push({ title, characters, verseSections, customPatterns });
  }, [title, characters, verseSections, customPatterns, history]);

  const characterList = characters.split(",").map((c) => c.trim()).filter(Boolean);

  const handleElementDrop = useCallback(
    (element: BlockingElement, sectionIndex: number) => {
      saveState();
      setVerseSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          blockingElements: [...updated[sectionIndex].blockingElements, element],
        };
        return updated;
      });
    },
    [saveState, setVerseSections]
  );

  const handleElementMove = useCallback(
    (elementId: string, position: { x: number; y: number }, sectionIndex: number) => {
      setVerseSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          blockingElements: updated[sectionIndex].blockingElements.map((el) =>
            el.id === elementId ? { ...el, position } : el
          ),
        };
        return updated;
      });
    },
    [setVerseSections]
  );

  const handleElementRemove = useCallback(
    (elementId: string, sectionIndex: number) => {
      saveState();
      setVerseSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          blockingElements: updated[sectionIndex].blockingElements.filter((el) => el.id !== elementId),
        };
        return updated;
      });
    },
    [saveState, setVerseSections]
  );

  const handleElementResize = useCallback(
    (elementId: string, size: { width: number; height: number }, sectionIndex: number) => {
      setVerseSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          blockingElements: updated[sectionIndex].blockingElements.map((el) =>
            el.id === elementId ? { ...el, size } : el
          ),
        };
        return updated;
      });
    },
    [setVerseSections]
  );

  const handleAddSection = () => {
    saveState();
    setVerseSections((prev) => [
      ...prev,
      { id: prev.length + 1, lyrics: "", blockingElements: [] },
    ]);
  };

  const handleDeleteSection = (index: number) => {
    if (verseSections.length <= 1) return;
    saveState();
    setVerseSections((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, id: i + 1 })));
  };

  const handleLyricsChange = (index: number, lyrics: string) => {
    setVerseSections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], lyrics };
      return updated;
    });
  };

  const handleCreatePattern = (svg: string) => {
    const pattern: CustomPattern = {
      id: `custom-${Date.now()}`,
      svg,
      type: "custom",
    };
    setCustomPatterns((prev) => [...prev, pattern]);
    setShowDrawing(false);
    toast({ title: "패턴이 저장되었습니다" });
  };

  const handleDeletePattern = (id: string) => {
    setCustomPatterns((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "패턴을 삭제했습니다" });
  };

  const handleDownloadJSON = () => {
    const data = { title, characters, verseSections, customPatterns };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "choreography"}.json`;
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
        setTitle(data.title || "");
        setCharacters(data.characters || "");
        setVerseSections(data.verseSections || DEFAULT_SECTIONS);
        setCustomPatterns(data.customPatterns || []);
        toast({ title: "프로젝트가 로드되었습니다" });
      } catch {
        toast({ title: "로드 실패", description: "유효한 JSON 파일이 아닙니다.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportJPG = (index: number) => {
    const ref = sectionRefs.current[index];
    if (ref) exportAsJPG(ref, `${title || "verse"}-${index + 1}`, title);
  };

  const handleExportPDF = () => {
    exportAsPDF(sectionRefs.current.filter(Boolean), title || "choreography");
  };

  const handleUndo = useCallback(() => {
    const state = history.undo({ title, characters, verseSections, customPatterns });
    if (state) {
      setTitle(state.title);
      setCharacters(state.characters);
      setVerseSections(state.verseSections);
      setCustomPatterns(state.customPatterns);
    }
  }, [history, title, characters, verseSections, customPatterns, setTitle, setCharacters, setVerseSections, setCustomPatterns]);

  const handleRedo = useCallback(() => {
    const state = history.redo({ title, characters, verseSections, customPatterns });
    if (state) {
      setTitle(state.title);
      setCharacters(state.characters);
      setVerseSections(state.verseSections);
      setCustomPatterns(state.customPatterns);
    }
  }, [history, title, characters, verseSections, customPatterns, setTitle, setCharacters, setVerseSections, setCustomPatterns]);

  const handleCopy = useCallback(() => {
    if (contextMenu.targetId) {
      const section = verseSections[contextMenu.sectionIndex];
      const el = section?.blockingElements.find((e) => e.id === contextMenu.targetId);
      if (el) {
        setCopiedElement(el);
        toast({ title: "복사되었습니다" });
      }
    }
  }, [contextMenu, verseSections, toast]);

  const handlePaste = useCallback(() => {
    if (copiedElement) {
      const newEl = {
        ...copiedElement,
        id: `${copiedElement.type}-${Date.now()}`,
        position: { x: copiedElement.position.x + 20, y: copiedElement.position.y + 20 },
      };
      handleElementDrop(newEl, contextMenu.sectionIndex);
    }
  }, [copiedElement, contextMenu, handleElementDrop]);

  const handleDelete = () => {
    if (contextMenu.targetId) {
      handleElementRemove(contextMenu.targetId, contextMenu.sectionIndex);
    }
  };

  const handleReset = () => {
    setTitle("");
    setCharacters("");
    setVerseSections(DEFAULT_SECTIONS);
    setCustomPatterns([]);
    history.reset();
    clearPersistentState(`${STORAGE_KEY}:title`);
    clearPersistentState(`${STORAGE_KEY}:characters`);
    clearPersistentState(`${STORAGE_KEY}:sections`);
    clearPersistentState(`${STORAGE_KEY}:patterns`);
    toast({ title: "새 프로젝트를 시작합니다" });
  };

  // Keyboard shortcuts: Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((key === "y") || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      } else if (key === "c" && copiedElement === null) {
        // allow native copy if nothing in app
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo, copiedElement]);

  // Warn on tab close if there is unsaved content
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasContent =
        title.trim() !== "" ||
        characters.trim() !== "" ||
        verseSections.some((s) => s.lyrics.trim() !== "" || s.blockingElements.length > 0) ||
        customPatterns.length > 0;
      if (hasContent) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [title, characters, verseSections, customPatterns]);

  // Keep sectionRefs aligned with current sections (without mutating during render)
  if (sectionRefs.current.length !== verseSections.length) {
    sectionRefs.current = verseSections.map(
      (_, i) => sectionRefs.current[i] || React.createRef<HTMLDivElement>()
    );
  }

  const iconBtn = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    opts?: { disabled?: boolean; variant?: "ghost" | "outline" }
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={opts?.variant || "outline"}
          size="sm"
          onClick={onClick}
          disabled={opts?.disabled}
          aria-label={label}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-header sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 min-w-0">
            <img src={dancingIcon} alt="" className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">뮤지컬 안무 동선</span>
          </div>
          {saveStatus !== "idle" && (
            <span
              className={`text-[11px] ml-1 transition-opacity ${
                saveStatus === "saving" ? "text-muted-foreground" : "text-primary"
              }`}
              aria-live="polite"
            >
              {saveStatus === "saving" ? "저장 중…" : "✓ 자동 저장됨"}
            </span>
          )}
          <div className="flex-1" />
          <div className="flex gap-1.5 flex-wrap items-center">
            {iconBtn(<Undo2 className="w-3.5 h-3.5" />, "되돌리기 (Ctrl+Z)", handleUndo, { disabled: !history.canUndo })}
            {iconBtn(<Redo2 className="w-3.5 h-3.5" />, "다시 실행 (Ctrl+Y)", handleRedo, { disabled: !history.canRedo })}
            <div className="h-5 w-px bg-border mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleDownloadJSON}>
                  <Download className="w-3.5 h-3.5 mr-1" /> JSON
                </Button>
              </TooltipTrigger>
              <TooltipContent>현재 작업을 JSON 파일로 저장</TooltipContent>
            </Tooltip>
            <label>
              <input type="file" accept=".json" className="hidden" onChange={handleUploadJSON} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" asChild>
                    <span><Upload className="w-3.5 h-3.5 mr-1" /> 불러오기</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>저장한 JSON 파일을 불러옵니다</TooltipContent>
              </Tooltip>
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>전체 절을 PDF로 내보내기</TooltipContent>
            </Tooltip>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="새로 시작">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>새로 시작 (현재 작업 삭제)</TooltipContent>
                </Tooltip>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>새 프로젝트를 시작할까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    현재 입력한 제목, 캐릭터, 모든 절과 사용자 패턴이 삭제됩니다. 되돌릴 수 없으니 필요하면 먼저 JSON으로 저장하세요.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>새로 시작</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">프로젝트 제목</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 뮤지컬 패딩턴 1막" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              캐릭터 <span className="text-muted-foreground text-xs font-normal">(쉼표로 구분)</span>
            </label>
            <Input value={characters} onChange={(e) => setCharacters(e.target.value)} placeholder="예: 패딩턴, 브라운 부인, 주디" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <aside className="space-y-4">
            <div className="section-card">
              <h3 className="text-sm font-semibold text-foreground mb-2">캐릭터</h3>
              {characterList.length === 0 ? (
                <p className="text-xs text-muted-foreground">위에서 캐릭터 이름을 입력하세요</p>
              ) : (
                <p className="text-[11px] text-muted-foreground mb-2">아이콘을 무대로 끌어다 놓으세요</p>
              )}
              <div className="flex flex-wrap gap-2">
                {characterList.map((name, i) => (
                  <DraggableElement key={`char-${i}`} id={`char-${i}`} type="character" color={COLORS[i % COLORS.length]} label={name}>
                    <PersonIcon color={COLORS[i % COLORS.length]} size={20} />
                    <span className="text-xs font-medium" style={{ color: COLORS[i % COLORS.length] }}>{name}</span>
                  </DraggableElement>
                ))}
              </div>
            </div>

            <div className="section-card">
              <h3 className="text-sm font-semibold text-foreground mb-2">권장 경로</h3>
              <p className="text-[11px] text-muted-foreground mb-2">패턴을 무대로 끌어다 놓으세요</p>
              <div className="grid grid-cols-2 gap-2">
                {recommendedPaths.map((path) => (
                  <DraggableElement key={path.id} id={path.id} type="path" svg={path.svg}>
                    <div className="w-10 h-10 border border-border rounded-lg bg-card p-0.5">
                      <div dangerouslySetInnerHTML={{ __html: path.svg }} className="w-full h-full" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{path.name}</span>
                  </DraggableElement>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">사용자 패턴</h3>
                <Button variant="outline" size="sm" onClick={() => setShowDrawing(!showDrawing)}>
                  {showDrawing ? "닫기" : "그리기"}
                </Button>
              </div>
              {showDrawing && <DrawingCanvas onSavePattern={handleCreatePattern} />}
              {customPatterns.length === 0 && !showDrawing && (
                <p className="text-[11px] text-muted-foreground">아직 저장된 패턴이 없습니다</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {customPatterns.map((p) => (
                  <div key={p.id} className="relative group">
                    <DraggableElement id={p.id} type="custom" svg={p.svg}>
                      <div className="w-10 h-10 border border-border rounded-lg bg-card p-0.5">
                        <div dangerouslySetInnerHTML={{ __html: p.svg }} className="w-full h-full" />
                      </div>
                    </DraggableElement>
                    <button
                      onClick={() => handleDeletePattern(p.id)}
                      aria-label="패턴 삭제"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] shadow"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card text-[11px] text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">단축키</p>
              <ul className="space-y-0.5">
                <li>· 되돌리기 <kbd className="font-mono">Ctrl+Z</kbd></li>
                <li>· 다시 실행 <kbd className="font-mono">Ctrl+Y</kbd></li>
                <li>· 요소 삭제 <kbd className="font-mono">Del</kbd></li>
                <li>· 1픽셀 이동 <kbd className="font-mono">방향키</kbd></li>
              </ul>
            </div>
          </aside>

          <div className="space-y-6">
            {verseSections.map((section, index) => (
              <div key={section.id} ref={sectionRefs.current[index]} className="section-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">절 {section.id}</h3>
                  <div className="flex gap-1" data-export-hidden>
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
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSection(index)} aria-label="절 삭제">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>이 절 삭제</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <Textarea
                  value={section.lyrics}
                  onChange={(e) => handleLyricsChange(index, e.target.value)}
                  placeholder="예: 런던 거리 위, 패딩턴이 처음 도착했네"
                  className="mb-3 min-h-[60px] text-sm"
                />
                <StageGrid
                  sectionIndex={index}
                  elements={section.blockingElements}
                  onElementDrop={handleElementDrop}
                  onElementMove={handleElementMove}
                  onElementRemove={handleElementRemove}
                  onElementResize={handleElementResize}
                  onContextMenu={setContextMenu}
                  onMoveCommit={saveState}
                  isChoreography
                />
              </div>
            ))}

            <Button variant="outline" onClick={handleAddSection} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> 절 추가
            </Button>
          </div>
        </div>
      </main>

      <BlockingContextMenu
        show={contextMenu.show}
        x={contextMenu.x}
        y={contextMenu.y}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDelete={handleDelete}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
        canPaste={!!copiedElement}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />
    </div>
  );
};

export default ChoreographyPage;
