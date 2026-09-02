import { ChartA11y } from "./chart-a11y";
import type { ChartA11yProps } from "./types";

const SIZE = 120;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A single ratio against a ceiling — spend vs budget, quota used vs limit, storage used vs
 * allotted. Donut and gauge are the same shape here (a partial ring plus a centered
 * number) rather than two components, since every real use in this product is "how much
 * of a fixed thing has been used," never an arbitrary multi-slice breakdown — that's what
 * StackedBarChart or a plain list is for.
 *
 * `value: null` (the figure genuinely isn't known — see docs/admin-panel-architecture's own
 * D4, an estimate that's missing its starting figure) renders a dashed, unfilled ring and
 * "—" in the center, never a 0% ring. A ratio that hasn't been measured and a ratio that
 * measured zero are different facts, same rule as every other chart in this kit.
 *
 * `overCapacity` (value > max) renders the ring in the danger token, not the admin accent
 * — a spend that has blown through its ceiling is a status, and status colors never come
 * from the admin theme family (see globals.css's own comment on why).
 */
export function RatioRing({
  value,
  max,
  label,
  formatValue,
  a11y,
  className,
}: {
  value: number | null;
  max: number;
  label: string;
  /** How to render the number in the ring's center — defaults to a bare percentage. Pass
   *  this for currency/token/count displays (e.g. `(v) => `$${v}`)`. */
  formatValue?: (value: number, max: number) => string;
  a11y: ChartA11yProps;
  className?: string;
}) {
  const known = value !== null;
  const ratio = known ? Math.max(0, value / max) : 0;
  const overCapacity = known && value > max;
  const filled = Math.min(ratio, 1) * CIRCUMFERENCE;
  const color = overCapacity ? "var(--destructive)" : "var(--admin-accent-bright)";
  const centerText = known ? (formatValue ? formatValue(value, max) : `${Math.round(ratio * 100)}%`) : "—";
  const description = a11y.description ?? (known ? `${label}: ${value} of ${max}${overCapacity ? ", over capacity" : ""}` : `${label}: not measured`);

  return (
    <ChartA11y title={a11y.title} description={description} className={className}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--admin-grid)" strokeWidth={STROKE} strokeDasharray={known ? undefined : "3 4"} />
        {known ? (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        ) : null}
        <text x={SIZE / 2} y={SIZE / 2} textAnchor="middle" dominantBaseline="middle" fontSize={18} fontWeight={600} fill="var(--admin-ink-1)">
          {centerText}
        </text>
      </svg>
      <p className="mt-1 text-center text-xs" style={{ color: "var(--admin-ink-2)" }} aria-hidden="true">
        {label}
      </p>
    </ChartA11y>
  );
}
