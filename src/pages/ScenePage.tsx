import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Image, FileText, Download, Upload,
  Undo2, Redo2, RotateCcw, Crosshair, HelpCircle, Link2,
  ChevronDown, ChevronRight, FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
import BlockingContextMenu from "@/components/BlockingContextMenu";
import { exportAsJPG, exportAsPDF } from "@/utils/exportUtils";
import { sanitizeFilename } from "@/lib/utils";
import { buildShareUrl, decodeShare, copyToClipboard } from "@/lib/share";
import type { BlockingElement, SceneSection, SceneGroup, ContextMenuState } from "@/types/blocking";
import { CHARACTER_COLORS as COLORS } from "@/types/blocking";

const STORAGE_KEY = "scene-project-v1";
const newScene = (id: number): SceneSection => ({ id, script: "", blockingElements: [] });
const DEFAULT_GROUPS: SceneGroup[] = [{ id: 1, title: "1장", collapsed: false, scenes: [newScene(1)] }];

interface SceneState {
  title: string;
  characters: string;
  sceneGroups: SceneGroup[];
}

// Walk groups → scenes in render order, returning {gi, si} for a flat index.
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

const ScenePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const history = useUndoRedo<SceneState>();
  const saveStatus = useSaveStatus();

  const [title, setTitle] = usePersistentState(`${STORAGE_KEY}:title`, "");
  const [characters, setCharacters] = usePersistentState(`${STORAGE_KEY}:characters`, "");
  const [sceneGroups, setSceneGroups] = usePersistentState<SceneGroup[]>(
    `${STORAGE_KEY}:groups`,
    DEFAULT_GROUPS,
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false, x: 0, y: 0, targetId: null, sectionIndex: 0,
  });
  const [copiedElement, setCopiedElement] = useState<BlockingElement | null>(null);
  const [showGuides, setShowGuides] = usePersistentState(`${STORAGE_KEY}:guides`, true);
  const [activeSection, setActiveSection] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const sectionRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveState = useCallback(() => {
    history.push({ title, characters, sceneGroups });
  }, [title, characters, sceneGroups, history]);

  const characterList = characters.split(",").map((c) => c.trim()).filter(Boolean);
  const totalScenes = sceneGroups.reduce((n, g) => n + g.scenes.length, 0);

  // --- Element handlers (by flat scene index) ---
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

  const handleElementDrop = useCallback(
    (element: BlockingElement, flatIndex: number) => {
      saveState();
      updateSceneElements(flatIndex, (els) => [...els, element]);
    },
    [saveState, updateSceneElements]
  );

  const handleElementMove = useCallback(
    (elementId: string, position: { x: number; y: number }, flatIndex: number) => {
      updateSceneElements(flatIndex, (els) =>
        els.map((el) => (el.id === elementId ? { ...el, position } : el))
      );
    },
    [updateSceneElements]
  );

  const handleElementRemove = useCallback(
    (elementId: string, flatIndex: number) => {
      saveState();
      updateSceneElements(flatIndex, (els) => els.filter((el) => el.id !== elementId));
    },
    [saveState, updateSceneElements]
  );

  const handleElementRotate = useCallback(
    (elementId: string, rotation: number, flatIndex: number) => {
      updateSceneElements(flatIndex, (els) =>
        els.map((el) => (el.id === elementId ? { ...el, rotation } : el))
      );
    },
    [updateSceneElements]
  );

  // --- Scene & group handlers ---
  const handleAddScene = (groupIndex: number) => {
    saveState();
    setSceneGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex
          ? { ...g, collapsed: false, scenes: [...g.scenes, newScene(g.scenes.length + 1)] }
          : g
      )
    );
  };

  const handleDeleteScene = (flatIndex: number) => {
    if (totalScenes <= 1) return;
    saveState();
    setSceneGroups((prev) => {
      const loc = locate(prev, flatIndex);
      if (!loc) return prev;
      return prev.map((g, gi) =>
        gi === loc.gi
          ? { ...g, scenes: g.scenes.filter((_, si) => si !== loc.si).map((s, i) => ({ ...s, id: i + 1 })) }
          : g
      );
    });
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
    saveState();
    setSceneGroups((prev) => {
      const nextId = (prev.reduce((m, g) => Math.max(m, g.id), 0) || 0) + 1;
      return [...prev, { id: nextId, title: `${prev.length + 1}장`, collapsed: false, scenes: [newScene(1)] }];
    });
  };

  const handleDeleteGroup = (groupIndex: number) => {
    if (sceneGroups.length <= 1) return;
    saveState();
    setSceneGroups((prev) => prev.filter((_, gi) => gi !== groupIndex));
  };

  const handleRenameGroup = (groupIndex: number, groupTitle: string) => {
    setSceneGroups((prev) => prev.map((g, gi) => (gi === groupIndex ? { ...g, title: groupTitle } : g)));
  };

  const toggleCollapse = (groupIndex: number) => {
    setSceneGroups((prev) => prev.map((g, gi) => (gi === groupIndex ? { ...g, collapsed: !g.collapsed } : g)));
  };

  // --- Export / share ---
  const expandAllThen = async (cb: () => void | Promise<void>) => {
    if (sceneGroups.some((g) => g.collapsed)) {
      setSceneGroups((prev) => prev.map((g) => ({ ...g, collapsed: false })));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    await cb();
  };

  const handleExportJPG = (flatIndex: number) => {
    const ref = sectionRefs.current[flatIndex];
    if (ref) exportAsJPG(ref, `${title || "scene"}-${flatIndex + 1}`);
  };

  const handleExportAllJPG = () =>
    expandAllThen(async () => {
      for (let i = 0; i < sectionRefs.current.length; i++) {
        const ref = sectionRefs.current[i];
        if (ref?.current) await exportAsJPG(ref, `${title || "scene"}-${i + 1}`);
      }
      toast({ title: `이미지 ${totalScenes}장을 저장했습니다` });
    });

  const handleExportPDF = () =>
    expandAllThen(() => {
      exportAsPDF(sectionRefs.current.filter(Boolean), title || "scene");
      toast({ title: "PDF로 저장했습니다" });
    });

  const handleShareLink = async () => {
    const data = { title, characters, sceneGroups, pageType: "scene", version: 2 };
    const url = buildShareUrl("scene", data);
    const ok = await copyToClipboard(url);
    toast({
      title: ok ? "공유 링크를 복사했습니다" : "링크 복사 실패",
      description: ok ? "다른 기기에 붙여넣으면 동일한 동선을 볼 수 있어요." : "브라우저 권한을 확인해 주세요.",
      variant: ok ? undefined : "destructive",
    });
  };

  const handleDownloadJSON = () => {
    const data = { title, characters, sceneGroups, pageType: "scene", version: 2 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(title) || "scene"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "JSON 다운로드 완료" });
  };

  // Accept both the new grouped format and the legacy flat sceneSections format.
  const groupsFromData = (data: {
    sceneGroups?: SceneGroup[];
    sceneSections?: SceneSection[];
  }): SceneGroup[] | null => {
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
        saveState();
        setTitle(data.title || "");
        setCharacters(data.characters || "");
        setSceneGroups(groups);
        toast({ title: "프로젝트가 로드되었습니다" });
      } catch {
        toast({ title: "로드 실패", description: "유효한 JSON 파일이 아닙니다.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // --- Clipboard (context menu) ---
  const handleCopy = () => {
    if (contextMenu.targetId) {
      const loc = locate(sceneGroups, contextMenu.sectionIndex);
      const el = loc && sceneGroups[loc.gi].scenes[loc.si]?.blockingElements.find((e) => e.id === contextMenu.targetId);
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

  // --- Undo/redo ---
  const handleUndo = useCallback(() => {
    const state = history.undo({ title, characters, sceneGroups });
    if (state) {
      setTitle(state.title);
      setCharacters(state.characters);
      setSceneGroups(state.sceneGroups);
    }
  }, [history, title, characters, sceneGroups, setTitle, setCharacters, setSceneGroups]);

  const handleRedo = useCallback(() => {
    const state = history.redo({ title, characters, sceneGroups });
    if (state) {
      setTitle(state.title);
      setCharacters(state.characters);
      setSceneGroups(state.sceneGroups);
    }
  }, [history, title, characters, sceneGroups, setTitle, setCharacters, setSceneGroups]);

  const handleReset = () => {
    setTitle("");
    setCharacters("");
    setSceneGroups(DEFAULT_GROUPS);
    history.reset();
    clearPersistentState(`${STORAGE_KEY}:title`);
    clearPersistentState(`${STORAGE_KEY}:characters`);
    clearPersistentState(`${STORAGE_KEY}:groups`);
    toast({ title: "새 프로젝트를 시작합니다" });
  };

  // Click-to-add into the active (or first visible) scene
  const handleAddElement = useCallback(
    (payload: Pick<BlockingElement, "type" | "svg" | "color" | "label">) => {
      let idx = activeSection;
      const loc = locate(sceneGroups, idx);
      if (!loc || sceneGroups[loc.gi].collapsed) {
        // fall back to the first scene of the first expanded group
        idx = -1;
        let n = 0;
        for (const g of sceneGroups) {
          if (!g.collapsed && g.scenes.length > 0) { idx = n; break; }
          n += g.scenes.length;
        }
      }
      if (idx < 0) {
        toast({ title: "먼저 장면을 펼쳐 주세요" });
        return;
      }
      window.dispatchEvent(new CustomEvent("blocking-add-center", { detail: { sectionIndex: idx, ...payload } }));
    },
    [activeSection, sceneGroups, toast]
  );

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

  // Load a shared project from the URL (?s=...) once on mount
  useEffect(() => {
    const s = searchParams.get("s");
    if (!s) return;
    const data = decodeShare<{
      title?: string; characters?: string; sceneGroups?: SceneGroup[];
      sceneSections?: SceneSection[]; pageType?: string;
    }>(s);
    const groups = data ? groupsFromData(data) : null;
    if (groups) {
      setTitle(data?.title || "");
      setCharacters(data?.characters || "");
      setSceneGroups(groups);
      toast({ title: "공유된 동선을 불러왔습니다" });
    } else {
      toast({ title: "공유 링크를 읽을 수 없습니다", variant: "destructive" });
    }
    searchParams.delete("s");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (sectionRefs.current.length !== totalScenes) {
    sectionRefs.current = Array.from(
      { length: totalScenes },
      (_, i) => sectionRefs.current[i] || React.createRef<HTMLDivElement>()
    );
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

  // Precompute each scene's global (flat) index across ALL groups so it stays
  // consistent with locate() even when some groups are collapsed (not rendered).
  let flatCursor = 0;
  const sceneFlat = sceneGroups.map((g) => g.scenes.map(() => flatCursor++));

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-header sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">장면별 동선</span>
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
                    <li>화면 아래 <strong className="text-foreground">요소 추가</strong> 버튼을 눌러 캐릭터를 무대로 끌어다 놓거나 클릭해 가운데에 넣으세요.</li>
                    <li>요소를 <strong className="text-foreground">드래그로 이동</strong>, 위쪽 손잡이로 <strong className="text-foreground">회전</strong>합니다.</li>
                    <li><strong className="text-foreground">장(章)</strong>으로 장면을 묶고, 제목 왼쪽 화살표로 접거나 펼칠 수 있어요.</li>
                    <li>완성하면 <strong className="text-foreground">내보내기</strong>로 이미지·PDF·공유 링크·파일로 저장하세요.</li>
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
            {iconBtn(<Undo2 className="w-3.5 h-3.5" />, "되돌리기 (Ctrl+Z)", handleUndo, !history.canUndo)}
            {iconBtn(<Redo2 className="w-3.5 h-3.5" />, "다시 실행 (Ctrl+Y)", handleRedo, !history.canRedo)}
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
                <TooltipContent>이미지·PDF·링크·파일로 저장</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" /> 전체 PDF로 저장
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAllJPG}>
                  <Image className="w-4 h-4 mr-2" /> 장면별 이미지(JPG) 저장
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
                    현재 입력한 제목, 캐릭터, 모든 장과 장면이 삭제됩니다. 되돌릴 수 없으니 필요하면 먼저 JSON으로 저장하세요.
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 뮤지컬 패딩턴" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              캐릭터 <span className="text-muted-foreground text-xs font-normal">(쉼표로 구분)</span>
            </label>
            <Input value={characters} onChange={(e) => setCharacters(e.target.value)} placeholder="예: 패딩턴, 미스터 브라운, 너클스" />
          </div>
        </div>

        <div className="rounded-xl bg-muted/50 border border-border px-4 py-2.5 mb-5 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <Plus className="w-4 h-4 text-primary shrink-0" />
          <span>
            장면을 <strong className="text-foreground">장(章)</strong>으로 묶어 관리하세요.
            화면 아래 <strong className="text-foreground">요소 추가</strong> 버튼으로 캐릭터를 넣고, 자세한 사용법은 상단 <strong className="text-foreground">도움말</strong>을 확인하세요.
          </span>
        </div>

        <div className="space-y-6">
          {sceneGroups.map((group, groupIndex) => (
            <section key={group.id} className="rounded-2xl border border-border bg-muted/30">
              {/* Group (act) header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
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
                  className="h-8 max-w-[180px] font-semibold"
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

              {/* Scenes */}
              {!group.collapsed && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 px-3 pb-3">
                  {group.scenes.map((scene, sceneIdx) => {
                    const flatIndex = sceneFlat[groupIndex][sceneIdx];
                    return (
                      <div key={scene.id} ref={sectionRefs.current[flatIndex]} className="section-card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-bold text-foreground">장면 {sceneIdx + 1}</h3>
                          <div className="flex gap-0.5" data-export-hidden>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleExportJPG(flatIndex)} aria-label="이미지로 저장">
                                  <Image className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>이미지(JPG)로 저장</TooltipContent>
                            </Tooltip>
                            {totalScenes > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteScene(flatIndex)} aria-label="장면 삭제">
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
                          placeholder="예: 패딩턴이 가방을 들고 무대 중앙으로 등장한다."
                          className="mb-2 min-h-[40px] text-xs resize-none"
                        />
                        <StageGrid
                          sectionIndex={flatIndex}
                          elements={scene.blockingElements}
                          onElementDrop={handleElementDrop}
                          onElementMove={handleElementMove}
                          onElementRemove={handleElementRemove}
                          onElementRotate={handleElementRotate}
                          onContextMenu={setContextMenu}
                          onMoveStart={saveState}
                          onActivate={setActiveSection}
                          showCenterGuides={showGuides}
                          compact
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}

          <Button variant="outline" onClick={handleAddGroup} className="w-full border-dashed border-2">
            <FolderPlus className="w-4 h-4 mr-1" /> 장 추가
          </Button>
        </div>
      </main>

      <FloatingPalette characters={characterList} colors={COLORS} onAddElement={handleAddElement} />

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

export default ScenePage;
