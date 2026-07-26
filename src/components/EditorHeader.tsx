import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, Upload, Image, FileText, Undo2, Redo2, RotateCcw,
  Crosshair, HelpCircle, Link2, Music, Film, Compass, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ThemeToggle from "@/components/ThemeToggle";
import type { StageOrientation } from "@/types/blocking";

export type SaveStatus = "idle" | "saving" | "saved";

interface EditorHeaderProps {
  mode: "choreography" | "scene";
  saveStatus: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showGuides: boolean;
  onToggleGuides: (value: boolean) => void;
  orientation: StageOrientation;
  onToggleOrientation: (value: StageOrientation) => void;
  onExportPDF: () => void;
  onExportAllJPG: () => void;
  onShareLink: () => void;
  onDownloadJSON: () => void;
  onUploadJSON: () => void;
  onReset: () => void;
  /** Mode-specific steps rendered inside the help dialog. */
  helpSteps: React.ReactNode;
}

const MODES = {
  choreography: { path: "/choreography", label: "안무 동선", icon: Music, unit: "절별" },
  scene: { path: "/scene", label: "장면별 동선", icon: Film, unit: "장면별" },
} as const;

const EditorHeader: React.FC<EditorHeaderProps> = ({
  mode,
  saveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showGuides,
  onToggleGuides,
  orientation,
  onToggleOrientation,
  onExportPDF,
  onExportAllJPG,
  onShareLink,
  onDownloadJSON,
  onUploadJSON,
  onReset,
  helpSteps,
}) => {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);

  // Sticky-header height drives the offset of the floating selection toolbar.
  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const measure = () =>
      document.documentElement.style.setProperty("--header-h", `${Math.round(node.getBoundingClientRect().height)}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

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
    <header ref={headerRef} className="glass-header sticky top-0 z-30" data-export-hidden>
      <div className="container mx-auto px-3 sm:px-4 py-2 flex flex-nowrap items-center gap-1.5 sm:gap-3 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} aria-label="홈으로">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">홈</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>홈으로</TooltipContent>
        </Tooltip>

        {/* Mode switch — swapping modes no longer means a round trip through the home page */}
        <div
          className="flex shrink-0 items-center rounded-lg border border-border bg-muted/60 p-0.5"
          role="tablist"
          aria-label="작업 모드"
        >
          {(Object.keys(MODES) as (keyof typeof MODES)[]).map((key) => {
            const m = MODES[key];
            const Icon = m.icon;
            const active = key === mode;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => !active && navigate(m.path)}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-medium transition-colors ${
                  active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className={active ? "" : "hidden sm:inline"}>{m.label}</span>
              </button>
            );
          })}
        </div>

        <span
          className={`hidden sm:inline text-[11px] transition-opacity shrink-0 ${
            saveStatus === "idle" ? "opacity-0" : saveStatus === "saving" ? "text-muted-foreground" : "text-primary"
          }`}
          aria-live="polite"
        >
          {saveStatus === "saving" ? "저장 중…" : "✓ 저장됨"}
        </span>

        <div className="flex-1" />

        <div className="flex gap-1 sm:gap-1.5 items-center">
          {iconBtn(<Undo2 className="w-3.5 h-3.5" />, "되돌리기 (Ctrl+Z)", onUndo, !canUndo)}
          {iconBtn(<Redo2 className="w-3.5 h-3.5" />, "다시 실행 (Ctrl+Y)", onRedo, !canRedo)}

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={showGuides}
                onPressedChange={onToggleGuides}
                aria-label="중앙 안내선 표시"
                className="h-9 px-2 hidden sm:inline-flex"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>중앙 안내선 {showGuides ? "끄기" : "켜기"}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm">
                    <Download className="w-3.5 h-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">내보내기</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>이미지·PDF·링크·파일로 저장</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-xs text-muted-foreground">공유·인쇄</DropdownMenuLabel>
              <DropdownMenuItem onClick={onExportPDF}>
                <FileText className="w-4 h-4 mr-2" /> 전체 PDF로 저장
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportAllJPG}>
                <Image className="w-4 h-4 mr-2" /> {MODES[mode].unit} 이미지(JPG) 저장
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShareLink}>
                <Link2 className="w-4 h-4 mr-2" /> 공유 링크 복사
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">작업 파일</DropdownMenuLabel>
              <DropdownMenuItem onClick={onDownloadJSON}>
                <Download className="w-4 h-4 mr-2" /> 작업 파일(JSON) 저장
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onUploadJSON}>
                <Upload className="w-4 h-4 mr-2" /> 작업 파일 불러오기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Secondary controls collapse into one menu so the bar never wraps on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="더보기">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">보기</DropdownMenuLabel>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                <span className="inline-flex items-center">
                  <Crosshair className="w-4 h-4 mr-2" /> 중앙 안내선
                </span>
                <Toggle size="sm" pressed={showGuides} onPressedChange={onToggleGuides} aria-label="중앙 안내선" className="h-7 px-2">
                  {showGuides ? "켬" : "끔"}
                </Toggle>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onToggleOrientation(orientation === "performer" ? "audience" : "performer");
                }}
              >
                <Compass className="w-4 h-4 mr-2" />
                <span className="flex-1">좌·우 기준</span>
                <span className="text-xs text-muted-foreground">
                  {orientation === "performer" ? "배우 기준" : "객석 기준"}
                </span>
              </DropdownMenuItem>
              <ThemeToggle asMenuItem />
              <DropdownMenuSeparator />
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <HelpCircle className="w-4 h-4 mr-2" /> 사용법과 단축키
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>사용법 안내</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    {helpSteps}
                    <div>
                      <p className="font-semibold text-foreground mb-2">단축키</p>
                      <ul className="space-y-1.5">
                        <li>되돌리기 <kbd>Ctrl+Z</kbd> · 다시 실행 <kbd>Ctrl+Y</kbd></li>
                        <li>요소 복제 <kbd>Ctrl+D</kbd> · 삭제 <kbd>Del</kbd></li>
                        <li>요소 이동 <kbd>방향키</kbd> (<kbd>Shift</kbd> 크게)</li>
                        <li>요소 회전 <kbd>[</kbd> <kbd>]</kbd> (<kbd>Shift</kbd> 미세)</li>
                        <li>이동 경로 마치기 <kbd>Enter</kbd> · 취소 <kbd>Esc</kbd></li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <RotateCcw className="w-4 h-4 mr-2" /> 새로 시작
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>새 프로젝트를 시작할까요?</AlertDialogTitle>
                    <AlertDialogDescription>
                      현재 입력한 제목, 등장인물과 모든 {mode === "scene" ? "장·장면" : "절"}이 삭제됩니다.
                      되돌릴 수 없으니 필요하면 먼저 작업 파일(JSON)로 저장하세요.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={onReset}>새로 시작</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;
