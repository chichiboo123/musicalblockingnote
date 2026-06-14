import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Download, Upload, Image, FileText,
  Undo2, Redo2, RotateCcw, Crosshair, HelpCircle, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import FloatingPalette from "@/components/FloatingPalette";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePersistentState, clearPersistentState, useSaveStatus } from "@/hooks/use-persistent-state";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import StageGrid from "@/components/StageGrid";
import DrawingCanvas from "@/components/DrawingCanvas";
import BlockingContextMenu from "@/components/BlockingContextMenu";
import { recommendedPaths } from "@/components/RecommendedPaths";
import { exportAsJPG, exportAsPDF } from "@/utils/exportUtils";
import { sanitizeFilename } from "@/lib/utils";
import { buildShareUrl, decodeShare, copyToClipboard } from "@/lib/share";
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
  const [showGuides, setShowGuides] = usePersistentState(`${STORAGE_KEY}:guides`, true);
  const [activeSection, setActiveSection] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const sectionRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleElementRotate = useCallback(
    (elementId: string, rotation: number, sectionIndex: number) => {
      setVerseSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          blockingElements: updated[sectionIndex].blockingElements.map((el) =>
            el.id === elementId ? { ...el, rotation } : el
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
    const data = { title, characters, verseSections, customPatterns, pageType: "choreography" };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
        saveState();
        setTitle(data.title || "");
        setCharacters(data.characters || "");
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

  const handleExportJPG = (index: number) => {
    const ref = sectionRefs.current[index];
    if (ref) exportAsJPG(ref, `${title || "verse"}-${index + 1}`);
  };

  const handleExportAllJPG = async () => {
    for (let i = 0; i < sectionRefs.current.length; i++) {
      const ref = sectionRefs.current[i];
      if (ref?.current) await exportAsJPG(ref, `${title || "verse"}-${i + 1}`);
    }
    toast({ title: `이미지 ${verseSections.length}장을 저장했습니다` });
  };

  const handleExportPDF = () => {
    exportAsPDF(sectionRefs.current.filter(Boolean), title || "choreography");
    toast({ title: "PDF로 저장했습니다" });
  };

  const handleShareLink = async () => {
    const data = { title, characters, verseSections, customPatterns, pageType: "choreography" };
    const url = buildShareUrl("choreography", data);
    const ok = await copyToClipboard(url);
    toast({
      title: ok ? "공유 링크를 복사했습니다" : "링크 복사 실패",
      description: ok ? "다른 기기에 붙여넣으면 동일한 동선을 볼 수 있어요." : "브라우저 권한을 확인해 주세요.",
      variant: ok ? undefined : "destructive",
    });
  };

  const handleAddElement = useCallback(
    (payload: Pick<BlockingElement, "type" | "svg" | "color" | "label">) => {
      const idx = Math.min(activeSection, verseSections.length - 1);
      window.dispatchEvent(
        new CustomEvent("blocking-add-center", { detail: { sectionIndex: Math.max(0, idx), ...payload } })
      );
    },
    [activeSection, verseSections.length]
  );

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

  // Load a shared project from the URL (?s=...) once on mount
  useEffect(() => {
    const s = searchParams.get("s");
    if (!s) return;
    const data = decodeShare<{
      title?: string; characters?: string; verseSections?: VerseSection[];
      customPatterns?: CustomPattern[]; pageType?: string;
    }>(s);
    if (data && Array.isArray(data.verseSections)) {
      setTitle(data.title || "");
      setCharacters(data.characters || "");
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo]);

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
            <Dialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="도움말">
                      <HelpCircle className="w-4 h-4 mr-1" /> 도움말
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>사용법과 단축키 보기</TooltipContent>
              </Tooltip>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>사용법 안내</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                  <ol className="space-y-2 list-decimal list-inside marker:text-primary marker:font-semibold">
                    <li>위에 <strong className="text-foreground">제목과 캐릭터 이름</strong>을 입력하세요.</li>
                    <li>화면 아래 <strong className="text-foreground">요소 추가</strong> 버튼을 눌러 캐릭터·경로·패턴을 무대로 끌어다 놓으세요.</li>
                    <li>요소를 <strong className="text-foreground">드래그로 이동</strong>, 모서리로 <strong className="text-foreground">크기 조절</strong>, 위쪽 손잡이로 <strong className="text-foreground">회전</strong>합니다.</li>
                    <li>중앙 안내선(<Crosshair className="inline w-3.5 h-3.5" />)에 가까이 가면 <strong className="text-foreground">자동으로 가운데에 정렬</strong>됩니다.</li>
                    <li>완성하면 <strong className="text-foreground">내보내기</strong>로 이미지·PDF·파일로 저장하세요. 작업은 자동 저장됩니다.</li>
                  </ol>
                  <div>
                    <p className="font-semibold text-foreground mb-2">단축키</p>
                    <ul className="space-y-1.5">
                      <li>되돌리기 <kbd>Ctrl+Z</kbd> · 다시 실행 <kbd>Ctrl+Y</kbd></li>
                      <li>요소 삭제 <kbd>Del</kbd></li>
                      <li>요소 이동 <kbd>방향키</kbd> (<kbd>Shift</kbd> 크게)</li>
                      <li>요소 회전 <kbd>[</kbd> <kbd>]</kbd> (<kbd>Shift</kbd> 미세)</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {iconBtn(<Undo2 className="w-3.5 h-3.5" />, "되돌리기 (Ctrl+Z)", handleUndo, { disabled: !history.canUndo })}
            {iconBtn(<Redo2 className="w-3.5 h-3.5" />, "다시 실행 (Ctrl+Y)", handleRedo, { disabled: !history.canRedo })}
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={showGuides}
                  onPressedChange={setShowGuides}
                  aria-label="중앙 안내선 표시"
                  className="h-9 px-2"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>중앙 안내선 {showGuides ? "끄기" : "켜기"}</TooltipContent>
            </Tooltip>
            <div className="h-5 w-px bg-border mx-0.5" />
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm">
                      <Download className="w-3.5 h-3.5 mr-1" /> 내보내기
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>이미지·PDF·파일로 저장</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" /> 전체 PDF로 저장
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAllJPG}>
                  <Image className="w-4 h-4 mr-2" /> 절별 이미지(JPG) 저장
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareLink}>
                  <Link2 className="w-4 h-4 mr-2" /> 공유 링크 복사
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadJSON}>
                  <Download className="w-4 h-4 mr-2" /> 작업 파일(JSON) 저장
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> 작업 파일 불러오기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleUploadJSON} />

      <main className="container mx-auto px-4 py-6 pb-28">
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

        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl bg-muted/50 border border-border px-4 py-2.5 mb-5 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <Plus className="w-4 h-4 text-primary shrink-0" />
            <span>
              화면 아래 <strong className="text-foreground">요소 추가</strong> 버튼으로 캐릭터·경로를 꺼내 무대로 끌어다 놓으세요.
              자세한 사용법은 상단 <strong className="text-foreground">도움말</strong>을 확인하세요.
            </span>
          </div>

          <div className="space-y-6">
            {verseSections.map((section, index) => (
              <div key={section.id} ref={sectionRefs.current[index]} className="section-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">#{section.id}</h3>
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
                  onElementRotate={handleElementRotate}
                  onContextMenu={setContextMenu}
                  onMoveStart={saveState}
                  onActivate={setActiveSection}
                  showCenterGuides={showGuides}
                />
              </div>
            ))}

            <Button variant="outline" onClick={handleAddSection} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> 블록 추가
            </Button>
          </div>
        </div>
      </main>

      <FloatingPalette
        characters={characterList}
        colors={COLORS}
        paths={recommendedPaths}
        customPatterns={customPatterns}
        onDeletePattern={handleDeletePattern}
        onOpenDrawing={() => setShowDrawing(true)}
        onAddElement={handleAddElement}
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
