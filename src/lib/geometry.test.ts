import { describe, it, expect } from "vitest";
import {
  DEFAULT_SIZE_PCT, distanceToPolyline, migrateElement, migrateElements,
  pxToPct, smoothPath, toPxRect,
} from "@/lib/geometry";
import type { BlockingElement } from "@/types/blocking";

const legacy = (over: Partial<BlockingElement> = {}): BlockingElement => ({
  id: "character-1",
  type: "character",
  position: { x: 230, y: 153.333 },
  size: { width: 30, height: 30 },
  ...over,
});

describe("migrateElement", () => {
  it("rescales legacy pixel coordinates onto the percentage grid", () => {
    const migrated = migrateElement(legacy());
    expect(migrated.u).toBe("%");
    // 230px on a 460px stage is the horizontal centre.
    expect(migrated.position.x).toBeCloseTo(50, 4);
    expect(migrated.position.y).toBeCloseTo(50, 2);
  });

  it("leaves already-migrated elements untouched", () => {
    const current: BlockingElement = { ...legacy(), u: "%", position: { x: 10, y: 20 } };
    expect(migrateElement(current)).toBe(current);
  });

  it("only marks move paths, whose points are already percentages", () => {
    const move: BlockingElement = {
      id: "move-1",
      type: "move",
      position: { x: 10, y: 10 },
      points: [{ x: 10, y: 10 }, { x: 90, y: 40 }],
    };
    expect(migrateElement(move).points).toEqual(move.points);
  });

  it("skips the whole list when nothing needs migrating", () => {
    const els = [{ ...legacy(), u: "%" as const }];
    expect(migrateElements(els)).toBe(els);
  });
});

describe("toPxRect", () => {
  it("projects percentages onto the measured stage box", () => {
    const box = toPxRect(
      { ...legacy(), u: "%", position: { x: 50, y: 25 }, size: { width: 10, height: 20 } },
      { width: 400, height: 200 }
    );
    expect(box).toEqual({ left: 200, top: 50, width: 40, height: 40 });
  });

  it("falls back to the default size for its type", () => {
    const box = toPxRect(
      { id: "t", type: "text", position: { x: 0, y: 0 }, u: "%" },
      { width: 100, height: 100 }
    );
    expect(box.width).toBeCloseTo(DEFAULT_SIZE_PCT.text.width, 5);
  });
});

describe("pxToPct", () => {
  it("is the inverse of toPxRect for positions", () => {
    expect(pxToPct(200, 50, { width: 400, height: 200 })).toEqual({ x: 50, y: 25 });
  });

  it("does not divide by zero before the stage is measured", () => {
    expect(pxToPct(10, 10, { width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("smoothPath", () => {
  it("draws a straight segment for two points", () => {
    expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe("M 0 0 L 10 10");
  });

  it("uses curves once there is a waypoint", () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 5, y: 10 }, { x: 10, y: 0 }]);
    expect(d.startsWith("M 0 0")).toBe(true);
    expect(d).toContain("C");
  });

  it("returns an empty path with no points", () => {
    expect(smoothPath([])).toBe("");
  });
});

describe("distanceToPolyline", () => {
  const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];

  it("is zero on the line", () => {
    expect(distanceToPolyline(50, 0, line)).toBe(0);
  });

  it("measures perpendicular distance", () => {
    expect(distanceToPolyline(50, 8, line)).toBeCloseTo(8, 5);
  });

  it("clamps to the segment ends", () => {
    expect(distanceToPolyline(-10, 0, line)).toBeCloseTo(10, 5);
  });
});
