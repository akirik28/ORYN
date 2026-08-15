import { cn } from "@/lib/utils";

export type ConfidenceLevel = "high" | "medium" | "low";

const LABEL: Record<ConfidenceLevel, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };
const BARS_LIT: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };

// Phase 68's "Oryn should know when it does not know enough" made visible: a lit/unlit
// three-bar meter rather than a color-coded word, so low confidence reads as "less
// signal" instead of "something's wrong" (that's what StatusBadge tone="error" is for).
export function ConfidenceIndicator({
  level,
  showLabel = true,
  className,
}: {
  level: ConfidenceLevel;
  showLabel?: boolean;
  className?: string;
}) {
  const lit = BARS_LIT[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn("w-1 rounded-full bg-muted-foreground/25", bar <= lit && "bg-brand-primary")}
            style={{ height: `${4 + bar * 3}px` }}
          />
        ))}
      </span>
      {showLabel ? <span className="text-xs text-muted-foreground">{LABEL[level]}</span> : null}
    </span>
  );
}
