import { DIMENSION_LABELS_SHORT, DIMENSION_ORDER } from "@/lib/scoring/labels";
import type { ProfileDimension } from "@/types/database";

const SIZE = 360;
const CENTER = SIZE / 2;
const MAX_RADIUS = 118;
const RINGS = [0.33, 0.66, 1];
// Labels sit at MAX_RADIUS + 26 = 144px from center — at the leftmost/rightmost points
// (~CENTER ± 144 = 36 / 324) a longer label like "Leadership" or "Exploration" (~60-70px
// wide at this font size) extends past the 0..360 viewBox. The outermost <svg> element's
// UA-stylesheet default is `overflow: hidden`, so without this margin those two labels
// were silently clipped to "ploration"/"Leadershi" — found live-testing the real profile
// page, not visible from the coordinate math alone.
const LABEL_MARGIN = 40;

function pointFor(index: number, total: number, radius: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

export function ScoreRadar({ scores }: { scores: Partial<Record<ProfileDimension, number>> }) {
  const total = DIMENSION_ORDER.length;

  const dataPoints = DIMENSION_ORDER.map((dimension, i) => pointFor(i, total, (MAX_RADIUS * (scores[dimension] ?? 0)) / 100));
  const dataPath = `${dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}`;

  return (
    <svg
      viewBox={`${-LABEL_MARGIN} ${-LABEL_MARGIN} ${SIZE + 2 * LABEL_MARGIN} ${SIZE + 2 * LABEL_MARGIN}`}
      className="mx-auto w-full max-w-sm"
    >
      {RINGS.map((ring) => {
        const ringPoints = DIMENSION_ORDER.map((_, i) => pointFor(i, total, MAX_RADIUS * ring));
        return (
          <polygon
            key={ring}
            points={ringPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        );
      })}

      {DIMENSION_ORDER.map((dimension, i) => {
        const edge = pointFor(i, total, MAX_RADIUS);
        return <line key={dimension} x1={CENTER} y1={CENTER} x2={edge.x} y2={edge.y} stroke="var(--color-border)" strokeWidth={1} />;
      })}

      <polygon points={dataPath} fill="var(--color-brand-primary)" fillOpacity={0.18} stroke="var(--color-brand-primary)" strokeWidth={2} strokeLinejoin="round" />
      {dataPoints.map((p, i) => (
        <circle key={DIMENSION_ORDER[i]} cx={p.x} cy={p.y} r={3} fill="var(--color-brand-primary)" />
      ))}

      {DIMENSION_ORDER.map((dimension, i) => {
        const label = pointFor(i, total, MAX_RADIUS + 26);
        const anchor = label.x > CENTER + 4 ? "start" : label.x < CENTER - 4 ? "end" : "middle";
        return (
          <text
            key={dimension}
            x={label.x}
            y={label.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-muted-foreground text-[10px] font-medium"
          >
            {DIMENSION_LABELS_SHORT[dimension]}
          </text>
        );
      })}
    </svg>
  );
}
