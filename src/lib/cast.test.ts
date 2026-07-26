import { describe, it, expect } from "vitest";
import { castFromData, castFromLegacyString, castToLegacyString, makeCharacter, nextCastColor } from "@/lib/cast";
import { CHARACTER_COLORS } from "@/types/blocking";

describe("castFromLegacyString", () => {
  it("splits, trims and drops blanks", () => {
    const cast = castFromLegacyString(" 패딩턴 , 주디 ,, ");
    expect(cast.map((c) => c.name)).toEqual(["패딩턴", "주디"]);
  });

  it("returns an empty cast for empty input", () => {
    expect(castFromLegacyString("")).toEqual([]);
    expect(castFromLegacyString(undefined)).toEqual([]);
  });

  it("gives every member a distinct id", () => {
    const cast = castFromLegacyString("가, 나, 다");
    expect(new Set(cast.map((c) => c.id)).size).toBe(3);
  });
});

describe("castFromData", () => {
  it("prefers the structured cast and keeps its colours", () => {
    const cast = castFromData({ cast: [{ id: "a", name: "패딩턴", color: "#123456" }], characters: "무시됨" });
    expect(cast).toEqual([{ id: "a", name: "패딩턴", color: "#123456" }]);
  });

  it("falls back to the legacy string", () => {
    expect(castFromData({ characters: "패딩턴, 주디" }).map((c) => c.name)).toEqual(["패딩턴", "주디"]);
  });

  it("drops nameless entries and backfills missing colours", () => {
    const cast = castFromData({ cast: [{ name: "  " }, { name: "주디" }] as never });
    expect(cast).toHaveLength(1);
    expect(cast[0].color).toMatch(/^#/);
  });

  it("returns an empty cast when there is nothing to read", () => {
    expect(castFromData({})).toEqual([]);
  });
});

describe("nextCastColor", () => {
  it("hands out an unused palette colour", () => {
    const taken = CHARACTER_COLORS.slice(0, 3).map((color, i) => ({ id: String(i), name: String(i), color }));
    expect(nextCastColor(taken)).toBe(CHARACTER_COLORS[3]);
  });

  it("wraps around once the palette is exhausted", () => {
    const full = CHARACTER_COLORS.map((color, i) => ({ id: String(i), name: String(i), color }));
    expect(CHARACTER_COLORS).toContain(nextCastColor(full));
  });

  it("keeps a new member's colour distinct from the existing cast", () => {
    const cast = [makeCharacter("패딩턴", [])];
    const second = makeCharacter("주디", cast);
    expect(second.color).not.toBe(cast[0].color);
  });
});

describe("castToLegacyString", () => {
  it("round-trips through the legacy format", () => {
    const cast = castFromLegacyString("패딩턴, 주디");
    expect(castToLegacyString(cast)).toBe("패딩턴, 주디");
  });
});
