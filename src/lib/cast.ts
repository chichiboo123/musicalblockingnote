import { CHARACTER_COLORS, type Character } from "@/types/blocking";

let seq = 0;
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const newId = uid;

/** Pick the first palette color not already taken, falling back to round-robin. */
export function nextCastColor(cast: Character[]): string {
  const used = new Set(cast.map((c) => c.color.toLowerCase()));
  const free = CHARACTER_COLORS.find((c) => !used.has(c.toLowerCase()));
  return free ?? CHARACTER_COLORS[cast.length % CHARACTER_COLORS.length];
}

export function makeCharacter(name: string, cast: Character[]): Character {
  return { id: uid("cast"), name: name.trim(), color: nextCastColor(cast) };
}

/** Build a cast list from the legacy comma-separated `characters` string. */
export function castFromLegacyString(value: string | undefined): Character[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name, i) => ({ id: uid("cast"), name, color: CHARACTER_COLORS[i % CHARACTER_COLORS.length] }));
}

/** Accept either the new `cast` array or the legacy `characters` string. */
export function castFromData(data: { cast?: unknown; characters?: unknown }): Character[] {
  if (Array.isArray(data.cast)) {
    return data.cast
      .filter((c): c is Character => !!c && typeof c === "object" && "name" in c)
      .map((c, i) => ({
        id: typeof c.id === "string" ? c.id : uid("cast"),
        name: String(c.name ?? "").trim(),
        color: typeof c.color === "string" ? c.color : CHARACTER_COLORS[i % CHARACTER_COLORS.length],
      }))
      .filter((c) => c.name.length > 0);
  }
  if (typeof data.characters === "string") return castFromLegacyString(data.characters);
  return [];
}

/** Legacy mirror kept in exports so older builds can still read a file. */
export function castToLegacyString(cast: Character[]): string {
  return cast.map((c) => c.name).join(", ");
}
