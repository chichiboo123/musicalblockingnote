import type { SceneGroup, VerseSection } from "@/types/blocking";
import { castFromData } from "@/lib/cast";

export interface SavedProject {
  mode: "choreography" | "scene";
  path: string;
  title: string;
  /** "3개 절 · 인물 4명" style summary. */
  summary: string;
  elementCount: number;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/**
 * Autosave has always worked, but the landing page never mentioned it — users
 * had to guess that picking a mode would restore their work. This surfaces it.
 */
export function readSavedProjects(): SavedProject[] {
  const out: SavedProject[] = [];

  const choreoSections = read<VerseSection[]>("choreography-project-v1:sections");
  if (choreoSections?.length) {
    const elements = choreoSections.reduce((n, s) => n + (s.blockingElements?.length ?? 0), 0);
    const hasContent = elements > 0 || choreoSections.some((s) => s.lyrics?.trim());
    if (hasContent) {
      const cast = castFromData({
        cast: read("choreography-project-v1:cast"),
        characters: read("choreography-project-v1:characters"),
      });
      out.push({
        mode: "choreography",
        path: "/choreography",
        title: read<string>("choreography-project-v1:title") || "제목 없는 안무 동선",
        summary: `${choreoSections.length}개 블록 · 인물 ${cast.length}명 · 요소 ${elements}개`,
        elementCount: elements,
      });
    }
  }

  const groups = read<SceneGroup[]>("scene-project-v1:groups");
  if (groups?.length) {
    const scenes = groups.reduce((n, g) => n + (g.scenes?.length ?? 0), 0);
    const elements = groups.reduce(
      (n, g) => n + g.scenes.reduce((m, s) => m + (s.blockingElements?.length ?? 0), 0),
      0
    );
    const hasContent = elements > 0 || groups.some((g) => g.scenes.some((s) => s.script?.trim()));
    if (hasContent) {
      const cast = castFromData({
        cast: read("scene-project-v1:cast"),
        characters: read("scene-project-v1:characters"),
      });
      out.push({
        mode: "scene",
        path: "/scene",
        title: read<string>("scene-project-v1:title") || "제목 없는 장면별 동선",
        summary: `${groups.length}개 장 · 장면 ${scenes}개 · 인물 ${cast.length}명`,
        elementCount: elements,
      });
    }
  }

  return out;
}
