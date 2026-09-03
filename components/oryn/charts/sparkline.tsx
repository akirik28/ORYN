import { ChartA11y } from "./chart-a11y";
import { linearScale, yDomain, buildLineSegments, round2 } from "./scale";
import type { ChartA11yProps, SeriesPoint } from "./types";

const VB_WIDTH = 120;
const VB_HEIGHT = 32;
const PAD = 2;

/**
 * Inline trend, no axes/labels/gridlines — sits next to a number (a stat card, a table
 * cell), not as its own chart. Deliberately the smallest, plainest renderer in the kit:
 * a sparkline's whole job is "up, down, or flat at a glance," not a readable data source
 * (that's what LineAreaChart is for). Still gap-honest — a null point still breaks the
 * line rather than interpolating through it, just without a visible marker at that scale.
 */
export function Sparkline({ data, color = "var(--admin-accent-bright)", a11y }: { data: SeriesPoint[]; color?: string; a11y: ChartA11yProps }) {
  const innerWidth = VB_WIDTH - PAD * 2;
  const innerHeight = VB_HEIGHT - PAD * 2;
  const xScale = linearScale([0, Math.max(1, data.length - 1)], [PAD, PAD + innerWidth]);
  const [yMin, yMax] = yDomain([{ data }], { includeZero: false });
  const yScale = linearScale([yMin, yMax], [PAD + innerHeight, PAD]);
  const segments = buildLineSegments(data, xScale, yScale, (i) => i);

  const known = data.map((p) => p.y).filter((y): y is number => y !== null);
  const last = known[known.length - 1];
  const first = known[0];
  const trend = last !== undefined && first !== undefined ? (last >= first ? "up" : "down") : "flat";
  const description = a11y.description ?? (last !== undefined ? `Trending ${trend}, latest value ${round2(last)}` : "No data");

  return (
    <ChartA11y title={a11y.title} description={description} className="inline-block">
      <svg viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`} width={VB_WIDTH} height={VB_HEIGHT} aria-hidden="true">
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {last !== undefined ? <circle cx={xScale(data.length - 1)} cy={yScale(last)} r={1.75} fill={color} /> : null}
      </svg>
    </ChartA11y>
  );
}
