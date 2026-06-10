import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Darkens overly light colors (e.g. pale yellow) so text stays readable on light backgrounds.
export function readableTextColor(hex?: string): string | undefined {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum <= 0.62) return hex;
  const k = 0.45 / lum;
  const to = (v: number) =>
    Math.round(v * 255 * k)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}
