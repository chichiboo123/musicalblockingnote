import { describe, it, expect } from "vitest";
import { svgAspect, sizeForSvg, viewBoxFromBounds, cropDrawnSvg } from "@/lib/svg-fit";
import { DEFAULT_SIZE_PCT, MIN_SIZE_PCT } from "@/lib/geometry";

const svgWith = (viewBox: string, body = "") =>
  `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

describe("svgAspect", () => {
  it("reads width over height from the viewBox", () => {
    expect(svgAspect(svgWith("0 0 100 50"))).toBe(2);
    expect(svgWith("8 41 84 18") && svgAspect(svgWith("8 41 84 18"))).toBeCloseTo(84 / 18);
  });

  it("returns null when the viewBox is missing or unusable", () => {
    expect(svgAspect("<svg></svg>")).toBeNull();
    expect(svgAspect(svgWith("0 0 0 10"))).toBeNull();
    expect(svgAspect(svgWith("0 0 nope 10"))).toBeNull();
  });
});

describe("sizeForSvg", () => {
  it("leaves a square shape at the default size", () => {
    const size = sizeForSvg(svgWith("0 0 100 100"), "path");
    expect(size.width).toBeCloseTo(DEFAULT_SIZE_PCT.path.width);
    expect(size.height).toBeCloseTo(DEFAULT_SIZE_PCT.path.height);
  });

  it("gives a wide shape a wide box instead of a square one", () => {
    const wide = sizeForSvg(svgWith("0 0 84 18"), "path");
    expect(wide.width).toBeGreaterThan(DEFAULT_SIZE_PCT.path.width);
    expect(wide.height).toBeLessThan(DEFAULT_SIZE_PCT.path.height);
  });

  it("matches the artwork's proportions once projected onto the 3:2 stage", () => {
    // width% is of stage width, height% is of stage height (= 2/3 of width),
    // so the rendered pixel ratio is (w/h) * (3/2) * ... — check it tracks aspect.
    const aspect = 84 / 18;
    const s = sizeForSvg(svgWith("0 0 84 18"), "path");
    const pxRatio = (s.width / 100) / ((s.height / 100) * (2 / 3));
    expect(pxRatio).toBeCloseTo(aspect, 1);
  });

  it("never shrinks below the minimum or overruns the stage", () => {
    const sliver = sizeForSvg(svgWith("0 0 1000 1"), "path");
    expect(sliver.width).toBeLessThanOrEqual(80);
    expect(sliver.height).toBeGreaterThanOrEqual(MIN_SIZE_PCT.height);
  });

  it("falls back to the default when there is no viewBox", () => {
    expect(sizeForSvg("<svg/>", "custom")).toEqual(DEFAULT_SIZE_PCT.custom);
  });
});

describe("viewBoxFromBounds", () => {
  it("wraps the ink with padding", () => {
    const [x, y, w, h] = viewBoxFromBounds(100, 100, 200, 180, 4).split(" ").map(Number);
    expect(w).toBeCloseTo(108);
    expect(h).toBeCloseTo(88);
    expect(x).toBeCloseTo(96);
    expect(y).toBeCloseTo(96);
  });

  it("keeps a perfectly straight stroke from collapsing to zero height", () => {
    const [, , w, h] = viewBoxFromBounds(0, 50, 300, 50, 4).split(" ").map(Number);
    expect(w).toBeCloseTo(308);
    expect(h).toBeGreaterThan(8);
    expect(w / h).toBeLessThan(10);
  });
});

describe("cropDrawnSvg", () => {
  it("crops a full-canvas viewBox down to the strokes", () => {
    const svg = svgWith("0 0 300 300", '<path d="M100 120 L140 160 L120 180" stroke="#333"/>');
    const [x, y, w, h] = cropDrawnSvg(svg).match(/viewBox="([^"]+)"/)![1].split(" ").map(Number);
    // ink spans x 100–140, y 120–180, plus 4 units of padding each side
    expect(w).toBeCloseTo(48);
    expect(h).toBeCloseTo(68);
    expect(x).toBeCloseTo(96);
    expect(y).toBeCloseTo(116);
  });

  it("is idempotent — re-cropping an already tight pattern does not drift", () => {
    const svg = svgWith("0 0 300 300", '<path d="M100 120 L140 160 L120 180"/>');
    const once = cropDrawnSvg(svg);
    expect(cropDrawnSvg(once)).toBe(once);
  });

  it("leaves curved artwork alone rather than guessing its bounds", () => {
    const svg = svgWith("0 0 100 100", '<path d="M10 50 Q30 20 50 50"/>');
    expect(cropDrawnSvg(svg)).toBe(svg);
  });

  it("passes through anything without a path", () => {
    const svg = svgWith("0 0 100 100", '<circle cx="50" cy="50" r="35"/>');
    expect(cropDrawnSvg(svg)).toBe(svg);
  });
});
