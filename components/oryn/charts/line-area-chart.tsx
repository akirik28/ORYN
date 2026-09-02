import type { CSSProperties } from "react";
import { ChartA11y } from "./chart-a11y";
import { linearScale, yDomain, buildLineSegments, buildAreaSegments, niceTicks, seriesColor } from "./scale";
import type { ChartA11yProps, ChartSeries, ChartSizeProps } from "./types";

const VB_WIDTH = 480;
const VB_HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 24, left: 40 };

/**
 * Time-series line/area chart — one or more series, each independently gap-aware (see
 * scale.ts's buildLineSegments/buildAreaSegments). `area` fills under the line; with more
 * than one series, area fill is usually wrong (overlapping fills read as a stacked chart
 * that isn't actually stacked) — pass `area` only for single-series usage, nothing here
 * stops a caller from doing otherwise but it isn't the intended shape.
 *
 * X-axis shows at most 6 labels (first, last, and evenly spaced between) regardless of
 * how many points the series has — a chart with 90 days of data does not get 90 crowded
 * labels, matching how any real chart library thins its own axis.
 */
export function LineAreaChart({
  series,
  area = false,
  includeZero = true,
  a11y,
  ...size
}: {
  series: ChartSeries[];
  area?: boolean;
  includeZero?: boolean;
  a11y: ChartA11yProps;
} & ChartSizeProps) {
  const innerWidth = VB_WIDTH - PAD.left - PAD.right;
  const innerHeight = VB_HEIGHT - PAD.top - PAD.bottom;
  const maxLen = Math.max(1, ...series.map((s) => s.data.length));
  const xScale = linearScale([0, Math.max(1, maxLen - 1)], [PAD.left, PAD.left + innerWidth]);
  const [yMin, yMax] = yDomain(series, { includeZero });
  const yScale = linearScale([yMin, yMax], [PAD.top + innerHeight, PAD.top]);
  const ticks = niceTicks([yMin, yMax]);
  const baseline = yScale(Math.max(yMin, Math.min(yMax, 0)));

  const labels = series[0]?.data.map((p) => String(p.x)) ?? [];
  const labelStep = Math.max(1, Math.ceil(labels.length / 6));

  return (
    <ChartA11y
      title={a11y.title}
      description={a11y.description ?? describeSeries(series)}
      className={size.className}
      style={size.height ? { height: size.height } : undefined}
    >
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

        {labels.map((label, i) =>
          i % labelStep === 0 || i === labels.length - 1 ? (
            <text key={i} x={xScale(i)} y={VB_HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--admin-ink-3)">
              {label}
            </text>
          ) : null,
        )}

        {series.map((s, si) => {
          const color = seriesColor(s.color, si);
          const xForIndex = (i: number) => i;
          return (
            <g key={s.id}>
              {area
                ? buildAreaSegments(s.data, xScale, yScale, xForIndex, baseline).map((d, i) => (
                    <path key={i} d={d} fill={color} fillOpacity={0.16} stroke="none" />
                  ))
                : null}
              {buildLineSegments(s.data, xScale, yScale, xForIndex).map((d, i) => (
                <path
                  key={i}
                  className="admin-chart-line"
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ "--admin-chart-path-length": 2000 } as CSSProperties}
                />
              ))}
              {/* Gap markers: a null point renders as an actual visible break (no line/dot
                  drawn through it) — nothing to render here by design. The absence itself
                  is the signal; see scale.ts's own comment on why. */}
            </g>
          );
        })}
      </svg>
    </ChartA11y>
  );
}

function describeSeries(series: ChartSeries[]): string {
  return series
    .map((s) => {
      const known = s.data.filter((p) => p.y !== null);
      const missing = s.data.length - known.length;
      if (known.length === 0) return `${s.label}: no data`;
      const last = known[known.length - 1].y;
      const gapNote = missing > 0 ? `, ${missing} point${missing === 1 ? "" : "s"} missing` : "";
      return `${s.label}: latest value ${last}${gapNote}`;
    })
    .join(". ");
}
