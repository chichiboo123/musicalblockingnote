import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

/**
 * Encode an arbitrary project payload into a compact, URL-safe string so an
 * entire blocking note can travel inside a shareable link (no server needed).
 */
export function encodeShare(data: unknown): string {
  return compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeShare<T = unknown>(value: string): T | null {
  try {
    const json = decompressFromEncodedURIComponent(value);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Build a full share URL for the current origin + route. */
export function buildShareUrl(route: string, data: unknown): string {
  const encoded = encodeShare(data);
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/+$/, "");
  return `${base}/${route.replace(/^\//, "")}?s=${encoded}`;
}

/** Copy text to the clipboard with a legacy fallback. Returns success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
