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
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4].map((dot) => (
          <span key={dot} className={cn("size-1.5 rounded-full bg-ink-4/40", dot <= IMPACT_DOTS[tier] && "bg-brand-primary")} />
        ))}
      </span>
      <span className="text-xs text-ink-3">{IMPACT_LABEL[tier]}</span>
    </span>
  );
}

/**
 * The "next move" unit — one concrete thing worth doing, with the reason Oryn thinks so.
 *
 * UI-V3-0b replaced the bordered card with a left priority rail and an optional
 * zero-padded index. The rail does the work the border used to: it groups a stack of moves
 * into an ordered sequence and gives the first one visible weight, without drawing four
 * identical boxes down the page. A directive should read as imperative, so the title sits
 * at full ink weight while the reasoning drops to `ink-2`.
 *
 * `leading` remains a slot (a checkbox, in the weekly plan) and is rendered beside the
 * rail, not inside it, so an interactive control keeps its own hit area.
 */
export function ActionCard({
  leading,
  index,
  title,
  reason,
  impact,
  estimatedMinutes,
  meta,
  done = false,
  emphasis = false,
  children,
  className,
}: {
  leading?: ReactNode;
  /** 1-based; rendered zero-padded as an ordinal marker. */
  index?: number;
  title: ReactNode;
  reason?: ReactNode;
  impact?: ImpactTier;
  estimatedMinutes?: number | null;
  meta?: ReactNode;
  done?: boolean;
  /** The single highest-priority move in a stack — thickens the rail. */
  emphasis?: boolean;
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
    <article
      className={cn(
        "group/action relative py-4 pl-5 transition-colors duration-(--duration-fast)",
        // The rail. Muted once done, thicker for the leading move.
        "before:absolute before:inset-y-0 before:left-0 before:rounded-full before:content-['']",
        emphasis && !done ? "before:w-[3px] before:bg-brand-primary" : "before:w-px before:bg-border",
        done && "before:bg-border",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5">
            {index !== undefined ? (
              <span aria-hidden="true" className="shrink-0 text-xs tabular-nums text-ink-4">
                {String(index).padStart(2, "0")}
              </span>
            ) : null}
            <p className={cn("leading-snug font-medium text-balance", done ? "text-ink-3 line-through" : "text-ink-1")}>
              {title}
            </p>
          </div>
          {reason ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-2">{reason}</p> : null}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {impact ? <ImpactMeter tier={impact} /> : null}
            {timeLabel ? <span className="text-xs text-ink-3 tabular-nums">{timeLabel}</span> : null}
            {meta}
          </div>
        </div>
      </div>
      {children}
    </article>
  );
}
