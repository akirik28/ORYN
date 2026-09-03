import { describe, test, expect } from "vitest";
import { linearScale, yDomain, buildLineSegments, buildAreaSegments, niceTicks, seriesColor, round2 } from "@/components/proxola/charts/scale";

/**
 * Coverage for the one rule every chart in the kit shares: a `null` point is a gap, never
 * a zero. buildLineSegments/buildAreaSegments are the literal mechanism (see their own
 * doc comments) — these tests pin that a null point actually breaks the path into a new
 * subpath rather than being skipped (closing the gap) or coerced to a coordinate
 * (fabricating a value). yDomain is covered for the adjacent guarantee: a gap must not
 * pull the computed axis range toward zero either.
 */

describe("linearScale", () => {
  test("maps domain to range linearly", () => {
    const scale = linearScale([0, 10], [0, 100]);
    expect(scale(0)).toBe(0);
    expect(scale(5)).toBe(50);
    expect(scale(10)).toBe(100);
  });

  test("a flat domain (min === max) does not divide by zero into NaN", () => {
    const scale = linearScale([5, 5], [0, 100]);
    expect(Number.isFinite(scale(5))).toBe(true);
  });
});

describe("yDomain", () => {
  test("ignores null points entirely rather than treating them as 0", () => {
    const domain = yDomain([{ data: [{ x: 1, y: 100 }, { x: 2, y: null }, { x: 3, y: 90 }] }], { includeZero: false });
    // If the null were treated as 0, the domain would extend down to 0; it must not.
    expect(domain[0]).toBe(90);
    expect(domain[1]).toBe(100);
  });

  test("includeZero extends the domain to include 0 when requested", () => {
    const domain = yDomain([{ data: [{ x: 1, y: 50 }, { x: 2, y: 80 }] }], { includeZero: true });
    expect(domain[0]).toBeLessThanOrEqual(0);
  });

  test("a series that is entirely null falls back to a safe default domain, not NaN", () => {
    const domain = yDomain([{ data: [{ x: 1, y: null }, { x: 2, y: null }] }]);
    expect(domain.every(Number.isFinite)).toBe(true);
  });

  test("a perfectly flat series still yields a nonzero span", () => {
    const domain = yDomain([{ data: [{ x: 1, y: 10 }, { x: 2, y: 10 }] }], { includeZero: false });
    expect(domain[1] - domain[0]).toBeGreaterThan(0);
  });
});

describe("buildLineSegments — the gap-honesty guarantee", () => {
  const xScale = (x: number) => x * 10;
  const yScale = (y: number) => 100 - y;

  test("a series with no gaps produces exactly one continuous path", () => {
    const segments = buildLineSegments([{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }], xScale, yScale, (i) => i);
    expect(segments).toHaveLength(1);
  });

  test("one null point in the middle breaks the line into two disconnected segments", () => {
    const segments = buildLineSegments([{ x: 0, y: 1 }, { x: 1, y: null }, { x: 2, y: 3 }], xScale, yScale, (i) => i);
    expect(segments).toHaveLength(2);
  });

  test("two separate gaps produce three segments, not one path with holes patched over", () => {
    const segments = buildLineSegments(
      [{ x: 0, y: 1 }, { x: 1, y: null }, { x: 2, y: 3 }, { x: 3, y: null }, { x: 4, y: 5 }],
      xScale,
      yScale,
      (i) => i,
    );
    expect(segments).toHaveLength(3);
  });

  test("a leading or trailing null does not produce an empty/degenerate segment", () => {
    const segments = buildLineSegments([{ x: 0, y: null }, { x: 1, y: 1 }, { x: 2, y: 2 }], xScale, yScale, (i) => i);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toContain("M");
  });

  test("an all-null series produces zero segments rather than a fabricated flat line", () => {
    const segments = buildLineSegments([{ x: 0, y: null }, { x: 1, y: null }], xScale, yScale, (i) => i);
    expect(segments).toHaveLength(0);
  });
});

describe("buildAreaSegments — the same guarantee applied to fill", () => {
  const xScale = (x: number) => x * 10;
  const yScale = (y: number) => 100 - y;

  test("a gap breaks the area fill into separate closed shapes, matching the line break", () => {
    const segments = buildAreaSegments([{ x: 0, y: 1 }, { x: 1, y: null }, { x: 2, y: 3 }], xScale, yScale, (i) => i, 100);
    expect(segments).toHaveLength(0); // each side of the gap has only 1 point, too few to fill
  });

  test("two known points on one side of a gap do form a fillable shape", () => {
    const segments = buildAreaSegments(
      [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: null }, { x: 3, y: 3 }, { x: 4, y: 4 }],
      xScale,
      yScale,
      (i) => i,
      100,
    );
    expect(segments).toHaveLength(2);
    segments.forEach((s) => expect(s.trim().endsWith("Z")).toBe(true));
  });
});

describe("niceTicks", () => {
  test("returns ticks within or bounding the domain", () => {
    const ticks = niceTicks([0, 97]);
    expect(ticks.length).toBeGreaterThan(0);
    ticks.forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(100); // allows a little rounding headroom above 97
    });
  });

  test("a zero-span domain does not throw and returns something finite", () => {
    const ticks = niceTicks([5, 5]);
    expect(ticks.every(Number.isFinite)).toBe(true);
  });
});

describe("seriesColor", () => {
  test("an explicit color always wins", () => {
    expect(seriesColor("#ff0000", 0)).toBe("#ff0000");
  });

  test("without an explicit color, rotates through the admin accent family deterministically", () => {
    const a = seriesColor(undefined, 0);
    const b = seriesColor(undefined, 1);
    expect(a).not.toBe(b);
    expect(seriesColor(undefined, 0)).toBe(a); // same index, same color, every time
  });
});

describe("round2", () => {
  // Regression: every default a11y-description fallback in this kit interpolates a raw
  // series value with round2() now, after oryn-a7's live /kumanda re-verification (2026-09-03)
  // found float-precision noise in job-budget-section's chart before this existed there, then
  // swept to bar-chart/line-area-chart/stacked-bar-chart/sparkline sharing the same pattern.
  test("kills float-precision noise from a repeating-decimal division", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1 / 3)).toBe(0.33);
    expect(round2(0.13630000000000003)).toBe(0.14);
  });

  test("leaves a clean 2-decimal value unchanged", () => {
    expect(round2(25)).toBe(25);
    expect(round2(4.5)).toBe(4.5);
    expect(round2(0)).toBe(0);
  });

  test("rounds a large accumulated sum the same way", () => {
    expect(round2(147.01953894479044)).toBe(147.02);
  });
});
