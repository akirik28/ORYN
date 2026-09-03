/**
 * Shared shapes for every chart in this kit (line/area, bar, stacked bar, sparkline,
 * ratio ring, burn). One module so the five lanes queuing behind this package code
 * against a single, stable contract rather than each chart inventing its own point shape.
 *
 * `y: number | null` is not incidental — it is the whole "honest about missing data" rule
 * from the founder's own build spec applied to charts. `null` means "no reading for this
 * point," and every renderer in this kit breaks its line/bar at a `null` rather than
 * treating it as zero or silently skipping it in a way that closes the gap. A missing AI
 * spend day and a zero-spend day are different facts; only one of them is zero.
 */
export interface SeriesPoint {
  /** X-axis position — a category label (bar charts) or an ISO date / timestamp (time
   *  series). Charts that need a Date do their own parsing; kept as string|number here so
   *  a caller building a `ChartSeries` from a DB row never has to reach for a Date object
   *  just to satisfy this type. */
  x: string | number;
  /** `null` = no data for this x, rendered as a visible gap. Never coerce a missing value
   *  to 0 before handing it to a chart — that is exactly the dishonesty this type exists
   *  to rule out. */
  y: number | null;
}

export interface ChartSeries {
  /** Stable key, not shown — used for React keys and for picking a deterministic color
   *  when `color` is omitted. */
  id: string;
  /** Shown in the legend and in the accessible text alternative. */
  label: string;
  data: SeriesPoint[];
  /** Defaults to `--admin-accent` (single-series charts) or a deterministic rotation
   *  through the admin accent family (multi-series) when omitted — see `scale.ts`'s
   *  `seriesColor`. Pass an explicit value to break out of the family, e.g. a status color
   *  for a series that IS a status (that's the one legitimate reason to reach outside
   *  --admin-accent from inside a chart). */
  color?: string;
}

/**
 * Every chart takes this shape for its text alternative — a screen reader cannot read an
 * SVG path, so this is not optional decoration. `title` is short (an accessible name,
 * comparable to alt text); `description`, when given, is the longer summary a sighted
 * reader gets for free by looking at the shape of the line and a screen reader otherwise
 * never would. See `chart-a11y.tsx` for how these render.
 */
export interface ChartA11yProps {
  title: string;
  description?: string;
}

/** Common sizing contract — every chart is responsive (`viewBox`, no fixed pixel width)
 *  and takes an aspect ratio rather than a pixel height, so it scales with its container
 *  instead of assuming one. `height` is a CSS length (e.g. "240px", "16rem") for the rare
 *  case a caller needs a fixed height regardless of width (a dashboard grid cell, say). */
export interface ChartSizeProps {
  aspectRatio?: number;
  height?: string;
  className?: string;
}
