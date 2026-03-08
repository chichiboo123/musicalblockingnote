import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Download, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import StageGrid from "@/components/StageGrid";
import DraggableElement from "@/components/DraggableElement";
import PersonIcon from "@/components/PersonIcon";
import BlockingContextMenu from "@/components/BlockingContextMenu";
import { useBlockingContext } from "@/contexts/BlockingContext";
import { exportAsJPG } from "@/utils/exportUtils";
import type { BlockingElement, SceneSection, ContextMenuState } from "@/types/blocking";
import { CHARACTER_COLORS as COLORS } from "@/types/blocking";

const ScenePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToHistory, undo, redo, undoHistory, redoHistory } = useBlockingContext();

  const [title, setTitle] = useState("");
  const [characters, setCharacters] = useState("");
  const [sceneSections, setSceneSections] = useState<SceneSection[]>([
    { id: 1, script: "", blockingElements: [] },
  ]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false, x: 0, y: 0, targetId: null, sectionIndex: 0,
  });
  const [copiedElement, setCopiedElement] = useState<BlockingElement | null>(null);

  const sectionRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);

  const characterList = characters.split(",").map((c) => c.trim()).filter(Boolean);

  const handleElementDrop = useCallback(
    (element: BlockingElement, sectionIndex: number) => {
      setSceneSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          blockingElements: [...updated[sectionIndex].blockingElements, element],
        };
        return updated;
      });
    },
    []
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
    []
  );

  const handleElementRemove = useCallback(
    (elementId: string, sectionIndex: number) => {
      setSceneSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          blockingElements: updated[sectionIndex].blockingElements.filter((el) => el.id !== elementId),
        };
        return updated;
      });
    },
    []
  );

  const handleAddSection = () => {
    setSceneSections((prev) => [
      ...prev,
      { id: prev.length + 1, script: "", blockingElements: [] },
    ]);
  };

  const handleDeleteSection = (index: number) => {
    if (sceneSections.length <= 1) return;
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
        setSceneSections(data.sceneSections || [{ id: 1, script: "", blockingElements: [] }]);
        toast({ title: "프로젝트가 로드되었습니다" });
      } catch {
        toast({ title: "로드 실패", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportJPG = (index: number) => {
    const ref = sectionRefs.current[index];
    if (ref) exportAsJPG(ref, `${title || "scene"}-${index + 1}`, title);
  };

  const handleCopy = () => {
    if (contextMenu.targetId) {
      const section = sceneSections[contextMenu.sectionIndex];
      const el = section?.blockingElements.find((e) => e.id === contextMenu.targetId);
      if (el) setCopiedElement(el);
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

  const handleUndo = () => {
    const state = undo();
    if (state) {
      setTitle(state.title);
      setCharacters(state.characters);
    }
  };

  const handleRedo = () => {
    const state = redo();
    if (state) {
      setTitle(state.title);
      setCharacters(state.characters);
    }
  };

  while (sectionRefs.current.length < sceneSections.length) {
    sectionRefs.current.push(React.createRef<HTMLDivElement>());
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
          </Button>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm font-semibold text-foreground">🎬 장면별 동선</span>
          <div className="flex-1" />
          <div className="flex gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleDownloadJSON}>
              <Download className="w-3.5 h-3.5 mr-1" /> JSON
            </Button>
            <label>
              <input type="file" accept=".json" className="hidden" onChange={handleUploadJSON} />
              <Button variant="outline" size="sm" asChild>
                <span><Upload className="w-3.5 h-3.5 mr-1" /> 불러오기</span>
              </Button>
            </label>
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
            <label className="text-sm font-medium text-foreground mb-1 block">캐릭터 (쉼표로 구분)</label>
            <Input value={characters} onChange={(e) => setCharacters(e.target.value)} placeholder="예: 장발장, 자베르" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          {/* Character palette */}
          <aside>
            <div className="section-card">
              <h3 className="text-sm font-semibold text-foreground mb-2">캐릭터</h3>
              {characterList.length === 0 && (
                <p className="text-xs text-muted-foreground">캐릭터 이름을 입력하세요</p>
              )}
              <div className="flex flex-wrap gap-2">
                {characterList.map((name, i) => (
                  <DraggableElement key={name} id={`char-${i}`} type="character" color={COLORS[i % COLORS.length]} label={name}>
                    <PersonIcon color={COLORS[i % COLORS.length]} size={20} />
                    <span className="text-xs" style={{ color: COLORS[i % COLORS.length] }}>{name}</span>
                  </DraggableElement>
                ))}
              </div>
            </div>
          </aside>

          {/* Scenes */}
          <div className="space-y-6">
            {sceneSections.map((section, index) => (
              <div key={section.id} ref={sectionRefs.current[index]} className="section-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">장면 {section.id}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleExportJPG(index)}>
                      <Image className="w-3.5 h-3.5" />
                    </Button>
                    {sceneSections.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSection(index)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <Textarea
                  value={section.script}
                  onChange={(e) => handleScriptChange(index, e.target.value)}
                  placeholder="장면 스크립트를 입력하세요..."
                  className="mb-3 min-h-[60px] text-sm"
                />
                <StageGrid
                  sectionIndex={index}
                  elements={section.blockingElements}
                  onElementDrop={handleElementDrop}
                  onElementMove={handleElementMove}
                  onElementRemove={handleElementRemove}
                  onContextMenu={setContextMenu}
                />
              </div>
            ))}

            <Button variant="outline" onClick={handleAddSection} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> 장면 추가
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
        canUndo={undoHistory.length > 0}
        canRedo={redoHistory.length > 0}
      />
    </div>
  );
};

export default ScenePage;
