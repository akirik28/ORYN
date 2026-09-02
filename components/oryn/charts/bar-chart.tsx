import { ChartA11y } from "./chart-a11y";
import { linearScale, yDomain, niceTicks, seriesColor } from "./scale";
import type { ChartA11yProps, ChartSeries, ChartSizeProps } from "./types";

const VB_WIDTH = 480;
const VB_HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 24, left: 40 };

/**
 * Categorical bar chart — one series of independent categories (opportunity categories,
 * countries, provider names), not a time series. A `null` value renders as no bar at all
 * for that category, not a zero-height one, same gap-honesty rule as the line chart —
 * "0 applications this week" and "we don't have this figure" are different bars.
 */
export function BarChart({ series, a11y, ...size }: { series: ChartSeries; a11y: ChartA11yProps } & ChartSizeProps) {
  const innerWidth = VB_WIDTH - PAD.left - PAD.right;
  const innerHeight = VB_HEIGHT - PAD.top - PAD.bottom;
  const [yMin, yMax] = yDomain([series]);
  const yScale = linearScale([yMin, yMax], [PAD.top + innerHeight, PAD.top]);
  const ticks = niceTicks([yMin, yMax]);
  const baseline = yScale(Math.max(yMin, Math.min(yMax, 0)));

  const n = series.data.length;
  const slot = innerWidth / Math.max(1, n);
  const barWidth = Math.min(36, slot * 0.6);
  const color = seriesColor(series.color, 0);

  return (
    <ChartA11y title={a11y.title} description={a11y.description ?? describeBars(series)} className={size.className} style={size.height ? { height: size.height } : undefined}>
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

        {series.data.map((point, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          if (point.y === null) {
            // No bar drawn — a small dash on the baseline marks "known absent," visually
            // distinct from a category that simply has a 0-height bar sitting on the axis.
            return <line key={i} x1={cx - barWidth / 2} x2={cx + barWidth / 2} y1={baseline} y2={baseline} stroke="var(--admin-ink-3)" strokeWidth={2} strokeDasharray="2 2" />;
          }
          const y = yScale(point.y);
          const top = Math.min(y, baseline);
          const h = Math.abs(baseline - y);
          return <rect key={i} x={cx - barWidth / 2} y={top} width={barWidth} height={Math.max(h, 0.5)} fill={color} rx={2} />;
        })}

        {series.data.map((point, i) => (
          <text key={i} x={PAD.left + slot * i + slot / 2} y={VB_HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--admin-ink-3)">
            {String(point.x)}
          </text>
        ))}
      </svg>
    </ChartA11y>
  );
}

function describeBars(series: ChartSeries): string {
  return series.data.map((p) => `${p.x}: ${p.y === null ? "no data" : p.y}`).join(", ");
}
