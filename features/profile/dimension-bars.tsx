import { DIMENSION_LABELS, DIMENSION_ORDER } from "@/lib/scoring/labels";
import type { DataConfidence, ProfileDimension } from "@/types/database";

interface DimensionScore {
  score: number;
  confidence: DataConfidence;
}

export function DimensionBars({ scores }: { scores: Partial<Record<ProfileDimension, DimensionScore>> }) {
  return (
    <div className="space-y-3">
      {DIMENSION_ORDER.map((dimension) => {
        const entry = scores[dimension];
        const score = entry?.score ?? 0;
        return (
          <div key={dimension}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{DIMENSION_LABELS[dimension]}</span>
              <span className="text-muted-foreground">
                {entry ? score : "—"}
                {entry?.confidence === "low" ? <span className="ml-1.5 text-xs">(low confidence)</span> : null}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
