import { ChartA11y } from "./chart-a11y";
import { linearScale, niceTicks, seriesColor } from "./scale";
import type { ChartA11yProps, ChartSeries, ChartSizeProps } from "./types";

const VB_WIDTH = 480;
const VB_HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 24, left: 40 };

/**
 * Composition over categories — each series is one layer of the stack, sharing the same
 * x categories (matched by index, not by re-sorting on `x`: callers are expected to pass
 * every series already aligned to the same category order). A `null` in one layer omits
 * only that layer's segment for that category; the rest of the stack still renders,
 * because one missing figure inside a composition is not the same fact as the whole
 * category being unmeasured.
 */
export function StackedBarChart({ series, categories, a11y, ...size }: { series: ChartSeries[]; categories: (string | number)[]; a11y: ChartA11yProps } & ChartSizeProps) {
  const innerWidth = VB_WIDTH - PAD.left - PAD.right;
  const innerHeight = VB_HEIGHT - PAD.top - PAD.bottom;

  const totals = categories.map((_, i) => series.reduce((sum, s) => sum + (s.data[i]?.y ?? 0), 0));
  const yMax = Math.max(1, ...totals);
  const yScale = linearScale([0, yMax], [PAD.top + innerHeight, PAD.top]);
  const ticks = niceTicks([0, yMax]);
  const baseline = yScale(0);

  const n = categories.length;
  const slot = innerWidth / Math.max(1, n);
  const barWidth = Math.min(40, slot * 0.65);

  return (
    <ChartA11y title={a11y.title} description={a11y.description ?? describeStack(series, categories)} className={size.className} style={size.height ? { height: size.height } : undefined}>
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

        {categories.map((_, ci) => {
          const cx = PAD.left + slot * ci + slot / 2;
          let cumulative = 0;
          return (
            <g key={ci}>
              {series.map((s, si) => {
                const point = s.data[ci];
                if (!point || point.y === null) return null;
                const yTop = yScale(cumulative + point.y);
                const yBottom = yScale(cumulative);
                cumulative += point.y;
                return <rect key={s.id} x={cx - barWidth / 2} y={yTop} width={barWidth} height={Math.max(yBottom - yTop, 0.5)} fill={seriesColor(s.color, si)} />;
              })}
            </g>
          );
        })}

        {categories.map((label, i) => (
          <text key={i} x={PAD.left + slot * i + slot / 2} y={VB_HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--admin-ink-3)">
            {String(label)}
          </text>
        ))}

        <line x1={PAD.left} x2={VB_WIDTH - PAD.right} y1={baseline} y2={baseline} stroke="var(--admin-grid-strong)" strokeWidth={1} />
      </svg>
    </ChartA11y>
  );
}

function describeStack(series: ChartSeries[], categories: (string | number)[]): string {
  return categories
    .map((cat, i) => {
      const parts = series.map((s) => `${s.label} ${s.data[i]?.y ?? "no data"}`).join(", ");
      return `${cat}: ${parts}`;
    })
    .join(". ");
}
