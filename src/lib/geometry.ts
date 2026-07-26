import type { BlockingElement, ElementType, StagePoint } from "@/types/blocking";

/**
 * Element geometry is stored as a percentage of the stage box (which always has
 * a 3:2 aspect ratio). Percentages keep a blocking note identical on a phone, a
 * laptop, a 3-column scene grid and inside an export — pixel coordinates did
 * not, which is why projects opened on another device used to look scrambled.
 */

export interface Rect {
  width: number;
  height: number;
}

/** Nominal stage width the legacy pixel coordinates were authored against. */
const LEGACY_STAGE_WIDTH = 460;
const LEGACY_STAGE_HEIGHT = (LEGACY_STAGE_WIDTH * 2) / 3;

export const DEFAULT_SIZE_PCT: Record<ElementType, { width: number; height: number }> = {
  character: { width: 7, height: 10.5 },
  path: { width: 17.5, height: 26 },
  custom: { width: 17.5, height: 26 },
  text: { width: 28, height: 11 },
  move: { width: 0, height: 0 },
};

export const MIN_SIZE_PCT = { width: 4, height: 6 };

export function toPxRect(el: BlockingElement, rect: Rect) {
  const size = el.size ?? DEFAULT_SIZE_PCT[el.type] ?? DEFAULT_SIZE_PCT.character;
  return {
    left: (el.position.x / 100) * rect.width,
    top: (el.position.y / 100) * rect.height,
    width: (size.width / 100) * rect.width,
    height: (size.height / 100) * rect.height,
  };
}

export const pxToPct = (x: number, y: number, rect: Rect) => ({
  x: rect.width ? (x / rect.width) * 100 : 0,
  y: rect.height ? (y / rect.height) * 100 : 0,
});

export const pointToPx = (p: StagePoint, rect: Rect) => ({
  x: (p.x / 100) * rect.width,
  y: (p.y / 100) * rect.height,
});

/**
 * Older projects stored raw pixels against a ~460px stage. Rescale them once so
 * existing autosaves, JSON files and share links keep working.
 */
export function migrateElement(el: BlockingElement): BlockingElement {
  if (el.u === "%") return el;
  if (el.type === "move") return { ...el, u: "%" };
  const size = el.size ?? { width: 30, height: 30 };
  return {
    ...el,
    u: "%",
    position: {
      x: (el.position.x / LEGACY_STAGE_WIDTH) * 100,
      y: (el.position.y / LEGACY_STAGE_HEIGHT) * 100,
    },
    size: {
      width: (size.width / LEGACY_STAGE_WIDTH) * 100,
      height: (size.height / LEGACY_STAGE_HEIGHT) * 100,
    },
  };
}

export const migrateElements = (els: BlockingElement[]): BlockingElement[] =>
  els.some((el) => el.u !== "%") ? els.map(migrateElement) : els;

/** Build a smooth SVG path through the given points using a Catmull-Rom style curve. */
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Squared distance from a point to a segment — used for hit-testing move paths. */
export function distanceToPolyline(px: number, py: number, pts: { x: number; y: number }[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const { x: x1, y: y1 } = pts[i];
    const { x: x2, y: y2 } = pts[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    best = Math.min(best, Math.hypot(px - cx, py - cy));
  }
  return best;
}
