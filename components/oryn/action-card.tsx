import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ImpactTier = "very_high" | "high" | "medium" | "low";

const IMPACT_LABEL: Record<ImpactTier, string> = {
  very_high: "Very high impact",
  high: "High impact",
  medium: "Medium impact",
  low: "Low impact",
};

// Filled-dot tiering instead of four different badge colors: impact isn't a status (like
// success/warning are), it's a magnitude, so it gets its own visual language — one that
// still reads correctly if a screen reader only announces the label.
const IMPACT_DOTS: Record<ImpactTier, number> = { very_high: 4, high: 3, medium: 2, low: 1 };

function ImpactMeter({ tier }: { tier: ImpactTier }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={IMPACT_LABEL[tier]}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4].map((dot) => (
          <span key={dot} className={cn("size-1.5 rounded-full bg-muted-foreground/25", dot <= IMPACT_DOTS[tier] && "bg-brand-primary")} />
        ))}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{IMPACT_LABEL[tier]}</span>
    </span>
  );
}

// The shared shell for "here is one specific thing worth doing" — the weekly plan today,
// and anywhere else a recommended next step needs the same impact/time/reason anatomy.
// `leading` is a slot (checkbox, numeral, icon); `meta` appends extra badges (a
// DeadlineBadge, a source) after the time estimate.
export function ActionCard({
  leading,
  title,
  reason,
  impact,
  estimatedMinutes,
  meta,
  done = false,
  children,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  reason?: ReactNode;
  impact?: ImpactTier;
  estimatedMinutes?: number | null;
  meta?: ReactNode;
  done?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const timeLabel =
    estimatedMinutes && estimatedMinutes > 0
      ? estimatedMinutes < 60
        ? `${estimatedMinutes}m`
        : estimatedMinutes % 60 === 0
          ? `${Math.floor(estimatedMinutes / 60)}h`
          : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
      : null;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors duration-(--duration-fast)",
        done ? "border-border bg-muted/30" : "border-border bg-card hover:border-brand-primary-border",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className={cn("font-medium leading-snug", done && "text-muted-foreground line-through")}>{title}</p>
          {reason ? <p className="text-sm text-muted-foreground">{reason}</p> : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
            {impact ? <ImpactMeter tier={impact} /> : null}
            {timeLabel ? <span className="text-xs text-muted-foreground">{timeLabel}</span> : null}
            {meta}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
