/**
 * First-party SVG chart kit for the admin panel (docs/admin-panel-architecture-2026-09-02.md
 * and the 2026-09-02 admin-theme-and-charts package). No charting library dependency — the
 * same choice this codebase already made for the university world map (first-party SVG +
 * d3-geo), applied here without even d3: these are plain SVG + a handful of scale
 * functions, since none of these shapes need geographic projection.
 *
 * Every chart:
 * - is responsive (`viewBox`, no fixed pixel width — scales with its container)
 * - has a real accessible text alternative (ChartA11y — a screen reader cannot read an
 *   SVG path)
 * - honours prefers-reduced-motion (a CSS media query on the entry animation, not a JS
 *   check — see globals.css's own .admin-chart-line comment for why)
 * - is honest about missing data: `y: null` in a SeriesPoint renders as a visible gap,
 *   never a fabricated zero — see scale.ts's own comment, this is the one rule every chart
 *   here shares and the one most worth not re-deriving per call site
 * - never uses a status color (destructive/warning/success) for decoration, and never uses
 *   the admin theme accent for a status — see globals.css's [data-surface="admin"] comment
 *
 * Reach for RatioRing/BurnChart first for anything spend-shaped ("how much of a ceiling
 * have we used, over time or right now") — that's most of what finance/AI-spend/growth
 * will need. BarChart/StackedBarChart for categorical breakdowns. Sparkline for an inline
 * trend next to a number, not a standalone chart.
 */
export { LineAreaChart } from "./line-area-chart";
export { BarChart } from "./bar-chart";
export { StackedBarChart } from "./stacked-bar-chart";
export { Sparkline } from "./sparkline";
export { RatioRing } from "./ratio-ring";
export { BurnChart } from "./burn-chart";
export { ChartA11y } from "./chart-a11y";
export { seriesColor, linearScale, yDomain, niceTicks, buildLineSegments, buildAreaSegments } from "./scale";
export type { SeriesPoint, ChartSeries, ChartA11yProps, ChartSizeProps } from "./types";
