import type { SeriesPoint } from "./types";

/** Deterministic color rotation for multi-series charts that don't specify a color per
 *  series — all three stay inside the admin accent family (never a status color; see
 *  globals.css's own comment on why admin theme and status meaning never share a token),
 *  ordered brightest-to-deepest so the first series (usually the most important) reads as
 *  the most prominent line. */
const SERIES_COLORS = ["var(--admin-accent-bright)", "var(--admin-accent)", "var(--admin-accent-strong)"] as const;

export function seriesColor(explicit: string | undefined, index: number): string {
  return explicit ?? SERIES_COLORS[index % SERIES_COLORS.length];
}

/** A linear scale from a numeric domain to a pixel range — the one piece of math every
 *  chart in this kit needs, written once. Clamps the domain to at least a span of 1 so a
 *  flat/constant series (every value identical) doesn't divide by zero into NaN
 *  coordinates. */
export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

/** The numeric domain across every series passed in, ignoring `null` gaps entirely —
 *  a missing point must not pull the y-axis down toward zero the way treating it as 0
 *  would. `includeZero` extends the domain to include 0 (the honest default for a spend/
 *  count chart, where an empty y-axis floating above real data misrepresents scale) but is
 *  a caller choice, not baked in, since a ratio or index chart may legitimately not want
 *  a zero baseline. */
export function yDomain(seriesList: { data: SeriesPoint[] }[], { includeZero = true }: { includeZero?: boolean } = {}): [number, number] {
  const values = seriesList.flatMap((s) => s.data.map((p) => p.y)).filter((y): y is number => y !== null);
  if (values.length === 0) return [0, 1];
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (min === max) {
    // A flat series still needs a nonzero span to plot as a visible flat line, not a
    // divide-by-zero collapse — pad symmetrically rather than arbitrarily favoring one side.
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  return [min, max];
}

/**
 * Builds one or more SVG path `d` strings from a series, breaking into a new subpath at
 * every `null` — this is the literal mechanism behind "a gap must look like a gap." A
 * naive single-path builder would either skip the null (silently closing the gap, drawing
 * a line straight across missing data as if it were smooth) or coerce it to a coordinate
 * (drawing a fabricated zero). Returns an array because a series with two separate gaps
 * needs three disconnected line segments, not one path with holes — SVG's own `M`
 * (moveto) command is what creates a break, so each segment gets its own.
 */
export function buildLineSegments(data: SeriesPoint[], xScale: (x: number) => number, yScale: (y: number) => number, xForIndex: (i: number) => number): string[] {
  const segments: string[] = [];
  let current: string | null = null;
  data.forEach((point, i) => {
    if (point.y === null) {
      if (current) segments.push(current);
      current = null;
      return;
    }
    const px = xScale(xForIndex(i));
    const py = yScale(point.y);
    current = current ? `${current} L ${px} ${py}` : `M ${px} ${py}`;
  });
  if (current) segments.push(current);
  return segments;
}

/** Matching area-fill segments for `buildLineSegments` — each line segment becomes its own
 *  closed shape dropping to `baseline` (normally the y=0 pixel position), so a gap breaks
 *  the fill exactly where it breaks the line, not just the stroke. */
export function buildAreaSegments(data: SeriesPoint[], xScale: (x: number) => number, yScale: (y: number) => number, xForIndex: (i: number) => number, baseline: number): string[] {
  const segments: string[] = [];
  let points: { x: number; y: number }[] = [];
  const flush = () => {
    if (points.length < 2) {
      points = [];
      return;
    }
    const first = points[0];
    const last = points[points.length - 1];
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    segments.push(`${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`);
    points = [];
  };
  data.forEach((point, i) => {
    if (point.y === null) {
      flush();
      return;
    }
    points.push({ x: xScale(xForIndex(i)), y: yScale(point.y) });
  });
  flush();
  return segments;
}

/**
 * Rounds a raw value to 2 decimal places before it reaches text — every default a11y
 * description fallback in this kit interpolates a raw series value (`${value}`), and a
 * float that was never meant to be displayed (a summed cost, a cumulative spend) prints as
 * `0.13630000000000003` instead of `0.14` if nothing rounds it first. Found live during
 * 2026-09-03's Turkish pass (burn-chart.tsx, then swept to every other chart in this kit
 * after oryn-a7's own /kumanda re-verification caught more instances of the same class).
 * 2 decimals, not currency-formatted or locale-aware — the caller-supplied
 * `a11y.description` is where real formatting and translation belong (see e.g.
 * job-budget-section.tsx, ai-feature-shape-section.tsx); this only keeps the untouched
 * fallback from being actively broken for a caller that hasn't supplied one.
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "Nice" tick values for an axis — plain multiples of a power-of-ten-ish step, not a
 *  library. Good enough for admin dashboards (spend, counts, percentages), not meant to
 *  handle every edge case a general-purpose charting library would. */
export function niceTicks(domain: [number, number], count = 4): number[] {
  const [min, max] = domain;
  const span = max - min;
  if (span <= 0) return [min];
  const rawStep = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = (residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1) * magnitude;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return ticks.length > 0 ? ticks : [min, max];
}
