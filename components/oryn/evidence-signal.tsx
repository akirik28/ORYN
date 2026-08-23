import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A single supporting fact, shown citation-style: micro-label, a large tabular value, and
 * a quiet source line. This is how the "EVIDENCE" half of a Next Move is built — the part
 * that shows the student *what Oryn actually looked at* before recommending something.
 *
 * Deliberately distinct from `InsightCard`: this displays a fact, that one interprets it.
 * If the content is a sentence, it belongs in an insight, not here.
 *
 * Renders as `<figure>`/`<figcaption>` so the source stays semantically attached to the
 * value rather than being a loose line of grey text underneath it. Values are
 * `tabular-nums` so a stacked list aligns on the digit.
 */
export function EvidenceSignal({
  label,
  value,
  unit,
  source,
  timestamp,
  tone = "neutral",
  bordered = false,
  className,
}: {
  label: string;
  value: ReactNode;
  /** Qualifier after the value, e.g. "/ 800", "hrs". Never part of `value`, so the
   *  number keeps `tabular-nums` alignment on its own. */
  unit?: string;
  source?: string;
  timestamp?: string;
  /** `missing` is the important one: an absent piece of evidence is a real signal in this
   *  product ("0 verified research projects") and should read as neutral-but-noted, not
   *  as an error. */
  tone?: "neutral" | "positive" | "missing";
  /** Left hairline, for stacked evidence lists. */
  bordered?: boolean;
  className?: string;
}) {
  const valueTone = {
    neutral: "text-ink-1",
    positive: "text-success",
    missing: "text-ink-4",
  }[tone];

  return (
    <figure className={cn(bordered && "border-l border-border pl-4", className)}>
      <figcaption className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase">
        {label}
      </figcaption>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className={cn("font-display text-2xl leading-none tabular-nums", valueTone)}>{value}</span>
        {unit ? <span className="text-sm text-ink-3">{unit}</span> : null}
      </p>
      {source ? (
        <p className="mt-1.5 text-xs text-ink-3">
          {source}
          {timestamp ? <span className="text-ink-4"> · {timestamp}</span> : null}
        </p>
      ) : null}
    </figure>
  );
}
