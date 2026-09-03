import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

export type ConfidenceLevel = "high" | "medium" | "low";

const LABEL_EN: Record<ConfidenceLevel, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };
const LABEL_TR: Record<ConfidenceLevel, string> = { high: "Yüksek güven", medium: "Orta güven", low: "Düşük güven" };
const BARS_LIT: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };

// Phase 68's "Oryn should know when it does not know enough" made visible: a lit/unlit
// three-bar meter rather than a color-coded word, so low confidence reads as "less
// signal" instead of "something's wrong" (that's what StatusBadge tone="error" is for).
//
// `locale` is a plain, defaulted prop — this component's only caller (source-badge.tsx)
// already has one in scope; found still English ("High confidence" next to a fully
// translated Turkish SourceBadge) while live-verifying the opportunities detail page.
export function ConfidenceIndicator({
  level,
  showLabel = true,
  className,
  locale = DEFAULT_LOCALE,
}: {
  level: ConfidenceLevel;
  showLabel?: boolean;
  className?: string;
  locale?: Locale;
}) {
  const lit = BARS_LIT[level];
  const label = locale === "tr" ? LABEL_TR[level] : LABEL_EN[level];
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
      {showLabel ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </span>
  );
}
