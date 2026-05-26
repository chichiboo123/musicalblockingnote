import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Download, Upload, Image, FileText,
  Undo2, Redo2, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePersistentState, clearPersistentState } from "@/hooks/use-persistent-state";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import StageGrid from "@/components/StageGrid";
import DraggableElement from "@/components/DraggableElement";
import PersonIcon from "@/components/PersonIcon";
import BlockingContextMenu from "@/components/BlockingContextMenu";
import { exportAsJPG, exportAsPDF } from "@/utils/exportUtils";
import dancingIcon from "@/assets/dancing-icon.png";
import type { BlockingElement, SceneSection, ContextMenuState } from "@/types/blocking";
import { CHARACTER_COLORS as COLORS } from "@/types/blocking";

const STORAGE_KEY = "scene-project-v1";
const DEFAULT_SECTIONS: SceneSection[] = [{ id: 1, script: "", blockingElements: [] }];

interface SceneState {
  title: string;
  characters: string;
  sceneSections: SceneSection[];
}

const ScenePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const history = useUndoRedo<SceneState>();

  const [title, setTitle] = usePersistentState(`${STORAGE_KEY}:title`, "");
  const [characters, setCharacters] = usePersistentState(`${STORAGE_KEY}:characters`, "");
  const [sceneSections, setSceneSections] = usePersistentState<SceneSection[]>(
    `${STORAGE_KEY}:sections`,
    DEFAULT_SECTIONS,
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false, x: 0, y: 0, targetId: null, sectionIndex: 0,
  });
  const [copiedElement, setCopiedElement] = useState<BlockingElement | null>(null);

  const sectionRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);

  const saveState = useCallback(() => {
    history.push({ title, characters, sceneSections });
  }, [title, characters, sceneSections, history]);

  const characterList = characters.split(",").map((c) => c.trim()).filter(Boolean);

  const handleElementDrop = useCallback(
    (element: BlockingElement, sectionIndex: number) => {
      saveState();
      setSceneSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          blockingElements: [...updated[sectionIndex].blockingElements, element],
        };
        return updated;
      });
    },
    [saveState, setSceneSections]
  );

  const handleElementMove = useCallback(
    (elementId: string, position: { x: number; y: number }, sectionIndex: number) => {
      setSceneSections((prev) => {
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
    [setSceneSections]
  );

  const handleElementRemove = useCallback(
    (elementId: string, sectionIndex: number) => {
      saveState();
      setSceneSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          blockingElements: updated[sectionIndex].blockingElements.filter((el) => el.id !== elementId),
        };
        return updated;
      });
    },
    [saveState, setSceneSections]
  );

  const handleAddSection = () => {
    saveState();
    setSceneSections((prev) => [
      ...prev,
      { id: prev.length + 1, script: "", blockingElements: [] },
    ]);
  };

  const handleDeleteSection = (index: number) => {
    if (sceneSections.length <= 1) return;
    saveState();
    setSceneSections((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, id: i + 1 })));
  };

  const handleScriptChange = (index: number, script: string) => {
    setSceneSections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], script };
      return updated;
    });
  };

  const handleDownloadJSON = () => {
    const data = { title, characters, sceneSections, pageType: "scene" };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "scene"}.json`;
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
        setSceneSections(data.sceneSections || DEFAULT_SECTIONS);
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
    if (ref) exportAsJPG(ref, `${title || "scene"}-${index + 1}`, title);
  };

  const handleExportPDF = () => {
    exportAsPDF(sectionRefs.current.filter(Boolean), title || "scene");
  };

  const handleCopy = () => {
    if (contextMenu.targetId) {
      const section = sceneSections[contextMenu.sectionIndex];
      const el = section?.blockingElements.find((e) => e.id === contextMenu.targetId);
      if (el) {
        setCopiedElement(el);
        toast({ title: "복사되었습니다" });
      }
    }
  };

  const handlePaste = () => {
    if (copiedElement) {
      const newEl = {
        ...copiedElement,
        id: `${copiedElement.type}-${Date.now()}`,
        position: { x: copiedElement.position.x + 20, y: copiedElement.position.y + 20 },
      };
      handleElementDrop(newEl, contextMenu.sectionIndex);
    }
  };

  const handleDelete = () => {
    if (contextMenu.targetId) handleElementRemove(contextMenu.targetId, contextMenu.sectionIndex);
  };

  const handleUndo = useCallback(() => {
    const state = history.undo({ title, characters, sceneSections });
    if (state) {
      setTitle(state.title);
      setCharacters(state.characters);
      setSceneSections(state.sceneSections);
    }
  }, [history, title, characters, sceneSections, setTitle, setCharacters, setSceneSections]);

  const handleRedo = useCallback(() => {
    const state = history.redo({ title, characters, sceneSections });
    if (state) {
      setTitle(state.title);
      setCharacters(state.characters);
      setSceneSections(state.sceneSections);
    }
  }, [history, title, characters, sceneSections, setTitle, setCharacters, setSceneSections]);

  const handleReset = () => {
    setTitle("");
    setCharacters("");
    setSceneSections(DEFAULT_SECTIONS);
    history.reset();
    clearPersistentState(`${STORAGE_KEY}:title`);
    clearPersistentState(`${STORAGE_KEY}:characters`);
    clearPersistentState(`${STORAGE_KEY}:sections`);
    toast({ title: "새 프로젝트를 시작합니다" });
  };

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
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasContent =
        title.trim() !== "" ||
        characters.trim() !== "" ||
        sceneSections.some((s) => s.script.trim() !== "" || s.blockingElements.length > 0);
      if (hasContent) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [title, characters, sceneSections]);

  while (sectionRefs.current.length < sceneSections.length) {
    sectionRefs.current.push(React.createRef<HTMLDivElement>());
  }

  const iconBtn = (icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" onClick={onClick} disabled={disabled} aria-label={label}>
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
            <span className="text-sm font-semibold text-foreground truncate">장면별 동선</span>
          </div>
          <div className="flex-1" />
          <div className="flex gap-1.5 flex-wrap items-center">
            {iconBtn(<Undo2 className="w-3.5 h-3.5" />, "되돌리기 (Ctrl+Z)", handleUndo, !history.canUndo)}
            {iconBtn(<Redo2 className="w-3.5 h-3.5" />, "다시 실행 (Ctrl+Y)", handleRedo, !history.canRedo)}
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
              <TooltipContent>전체 장면을 PDF로 내보내기</TooltipContent>
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
                    현재 입력한 제목, 캐릭터, 모든 장면이 삭제됩니다. 되돌릴 수 없으니 필요하면 먼저 JSON으로 저장하세요.
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 레미제라블 2막" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              캐릭터 <span className="text-muted-foreground text-xs font-normal">(쉼표로 구분)</span>
            </label>
            <Input value={characters} onChange={(e) => setCharacters(e.target.value)} placeholder="예: 장발장, 자베르" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          <aside className="space-y-4">
            <div className="section-card">
              <h3 className="text-sm font-semibold text-foreground mb-2">캐릭터</h3>
              {characterList.length === 0 ? (
                <p className="text-xs text-muted-foreground">캐릭터 이름을 입력하세요</p>
              ) : (
                <p className="text-[11px] text-muted-foreground mb-2">아이콘을 무대로 끌어다 놓으세요</p>
              )}
              <div className="flex flex-wrap gap-2">
                {characterList.map((name, i) => (
                  <DraggableElement key={name} id={`char-${i}`} type="character" color={COLORS[i % COLORS.length]} label={name}>
                    <PersonIcon color={COLORS[i % COLORS.length]} size={20} />
                    <span className="text-xs font-medium" style={{ color: COLORS[i % COLORS.length] }}>{name}</span>
                  </DraggableElement>
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

          <div className="grid sm:grid-cols-2 gap-4">
            {sceneSections.map((section, index) => (
              <div key={section.id} ref={sectionRefs.current[index]} className="section-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-foreground">장면 {section.id}</h3>
                  <div className="flex gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleExportJPG(index)} aria-label="이미지로 저장">
                          <Image className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>이미지(JPG)로 저장</TooltipContent>
                    </Tooltip>
                    {sceneSections.length > 1 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteSection(index)} aria-label="장면 삭제">
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>이 장면 삭제</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <Textarea
                  value={section.script}
                  onChange={(e) => handleScriptChange(index, e.target.value)}
                  placeholder="스크립트..."
                  className="mb-2 min-h-[40px] text-xs resize-none"
                />
                <StageGrid
                  sectionIndex={index}
                  elements={section.blockingElements}
                  onElementDrop={handleElementDrop}
                  onElementMove={handleElementMove}
                  onElementRemove={handleElementRemove}
                  onContextMenu={setContextMenu}
                  onMoveCommit={saveState}
                  compact
                />
              </div>
            ))}

            <Button variant="outline" onClick={handleAddSection} className="h-full min-h-[200px] border-dashed border-2">
              <Plus className="w-5 h-5 mr-1" /> 장면 추가
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

export default ScenePage;
