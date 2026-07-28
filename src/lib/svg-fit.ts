import { DEFAULT_SIZE_PCT, MIN_SIZE_PCT } from "@/lib/geometry";
import type { ElementType } from "@/types/blocking";

/**
 * A shape's selection box comes from its element size, but what the eye sees is
 * the ink inside the SVG's viewBox. When the viewBox carries empty margin — a
 * flat arrow authored in a 100×100 square, a small scribble saved on the full
 * 300×300 drawing canvas — the box ends up several times larger than the
 * artwork, and grabbing or resizing it means aiming at empty space.
 *
 * These helpers keep the two in step: crop the viewBox to the ink, then size
 * the dropped element to that viewBox's proportions.
 */

/** Nothing may grow past this share of the stage on drop. */
const MAX_SIZE_PCT = { width: 80, height: 80 };

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** Width ÷ height of the SVG's viewBox, or null when it is missing or degenerate. */
export function svgAspect(svg: string): number | null {
  const match = svg.match(/viewBox\s*=\s*"([^"]+)"/);
  if (!match) return null;
  const parts = match[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [, , w, h] = parts;
  if (w <= 0 || h <= 0) return null;
  return w / h;
}

/**
 * The size a shape should be placed at. The default is treated as the square
 * case and reshaped to the artwork's proportions at constant area, so a wide
 * flat arrow gets a wide flat box instead of a tall one wrapped around it.
 */
export function sizeForSvg(svg: string, type: ElementType): { width: number; height: number } {
  const base = DEFAULT_SIZE_PCT[type] ?? DEFAULT_SIZE_PCT.character;
  const aspect = svgAspect(svg);
  if (!aspect) return base;
  // The stage is 3:2, and the default is ~square in pixels, so scaling width by
  // √aspect and height by 1/√aspect lands the box on the artwork's proportions.
  const k = Math.sqrt(aspect);
  return {
    width: clamp(base.width * k, MIN_SIZE_PCT.width, MAX_SIZE_PCT.width),
    height: clamp(base.height / k, MIN_SIZE_PCT.height, MAX_SIZE_PCT.height),
  };
}

/**
 * A viewBox around the given ink, padded for stroke width and kept from
 * collapsing — a perfectly straight stroke has zero height, which would
 * otherwise ask for an unusably thin box.
 */
export function viewBoxFromBounds(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  pad = 4
): string {
  const span = Math.max(maxX - minX, maxY - minY);
  const minSpan = Math.max(pad * 2, span * 0.12);
  let w = Math.max(maxX - minX, minSpan);
  let h = Math.max(maxY - minY, minSpan);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  w += pad * 2;
  h += pad * 2;
  const round = (n: number) => Math.round(n * 100) / 100;
  return `${round(cx - w / 2)} ${round(cy - h / 2)} ${round(w)} ${round(h)}`;
}

/**
 * Re-crop a pattern drawn on the canvas. Only the canvas's own straight-segment
 * output is understood; anything with curves or arcs is handed back untouched
 * rather than guessed at.
 */
export function cropDrawnSvg(svg: string): string {
  const ds = [...svg.matchAll(/\sd="([^"]*)"/g)].map((m) => m[1]);
  if (!ds.length) return svg;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const d of ds) {
    if (/[^MLml\d\s.,+-]/.test(d)) return svg; // not a plain polyline
    const nums = d.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 4) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = Number(nums[i]);
      const y = Number(nums[i + 1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return svg;
  return svg.replace(/viewBox\s*=\s*"[^"]*"/, `viewBox="${viewBoxFromBounds(minX, minY, maxX, maxY)}"`);
}
