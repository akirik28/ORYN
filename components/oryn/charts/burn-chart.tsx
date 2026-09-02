import { ChartA11y } from "./chart-a11y";
import { linearScale, buildLineSegments, buildAreaSegments, niceTicks } from "./scale";
import type { ChartA11yProps, ChartSizeProps, SeriesPoint } from "./types";

const VB_WIDTH = 480;
const VB_HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 24, left: 44 };

/**
 * Actual spend against a fixed ceiling over time — the chart CEO named as mattering most,
 * since several lanes need exactly this shape (AI spend vs monthly budget, a feature's
 * token allowance, any "how much of a fixed thing have we used, and are we on pace").
 *
 * Not a generic two-series LineAreaChart: the budget ceiling is a single reference value,
 * not a data series someone measured, and the whole point of this chart is answering one
 * question at a glance — are we currently over. The actual line/area switches to the
 * destructive token (never the admin accent — this is a status, same rule as RatioRing)
 * the moment the latest known point crosses the ceiling, and the ceiling itself renders as
 * a dashed reference line, not a second colored series competing for the same attention.
 *
 * `actual`'s own gap-honesty rule still applies in full: a day with no recorded spend is
 * `{ y: null }`, not `{ y: 0 }`, and renders as a break in the line, same as every other
 * chart here.
 */
export function BurnChart({
  actual,
  budget,
  a11y,
  ...size
}: {
  actual: SeriesPoint[];
  budget: number;
  a11y: ChartA11yProps;
} & ChartSizeProps) {
  const innerWidth = VB_WIDTH - PAD.left - PAD.right;
  const innerHeight = VB_HEIGHT - PAD.top - PAD.bottom;

  const known = actual.filter((p) => p.y !== null).map((p) => p.y as number);
  const latest = known[known.length - 1];
  const overBudget = latest !== undefined && latest > budget;
  const color = overBudget ? "var(--destructive)" : "var(--admin-accent-bright)";

  const dataMax = known.length > 0 ? Math.max(...known) : 0;
  const yMax = Math.max(budget, dataMax) * 1.08 || 1;
  const xScale = linearScale([0, Math.max(1, actual.length - 1)], [PAD.left, PAD.left + innerWidth]);
  const yScale = linearScale([0, yMax], [PAD.top + innerHeight, PAD.top]);
  const ticks = niceTicks([0, yMax]);
  const baseline = yScale(0);
  const xForIndex = (i: number) => i;

  const labels = actual.map((p) => String(p.x));
  const labelStep = Math.max(1, Math.ceil(labels.length / 6));

  const description =
    a11y.description ??
    (latest !== undefined
      ? `${a11y.title}: ${latest} of ${budget} budget${overBudget ? ", over budget" : ""}`
      : `${a11y.title}: no spend recorded yet, budget ${budget}`);

  return (
    <ChartA11y title={a11y.title} description={description} className={size.className} style={size.height ? { height: size.height } : undefined}>
      <svg
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
        style={{ aspectRatio: size.height ? undefined : (size.aspectRatio ?? VB_WIDTH / VB_HEIGHT), width: "100%", height: size.height ? "100%" : "auto" }}
        aria-hidden="true"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={VB_WIDTH - PAD.right} y1={yScale(t)} y2={yScale(t)} stroke="var(--admin-grid)" strokeWidth={1} />
            <text x={PAD.left - 8} y={yScale(t)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--admin-ink-3)">
              {t}
            </text>
          </g>
        ))}

        {/* The ceiling — a reference, not a series. Dashed and neutral so it never competes
            visually with the actual line for "which one is the data." */}
        <line x1={PAD.left} x2={VB_WIDTH - PAD.right} y1={yScale(budget)} y2={yScale(budget)} stroke="var(--admin-ink-3)" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={VB_WIDTH - PAD.right} y={yScale(budget) - 4} textAnchor="end" fontSize={9} fill="var(--admin-ink-3)">
          budget {budget}
        </text>

        {buildAreaSegments(actual, xScale, yScale, xForIndex, baseline).map((d, i) => (
          <path key={i} d={d} fill={color} fillOpacity={0.14} stroke="none" />
        ))}
        {buildLineSegments(actual, xScale, yScale, xForIndex).map((d, i) => (
          <path key={i} className="admin-chart-line" d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {labels.map((label, i) =>
          i % labelStep === 0 || i === labels.length - 1 ? (
            <text key={i} x={xScale(i)} y={VB_HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--admin-ink-3)">
              {label}
            </text>
          ) : null,
        )}
      </svg>
    </ChartA11y>
  );
}
