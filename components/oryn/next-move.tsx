import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";
import { EvidenceSignal } from "./evidence-signal";

export interface NextMoveEvidence {
  label: string;
  value: ReactNode;
  unit?: string;
  /** `missing` for evidence Oryn looked for and did not find — that absence is the point. */
  tone?: "neutral" | "positive" | "missing";
}

/**
 * NEXT MOVE — Oryn's signature pattern (UI-V3 § 9).
 *
 * The anatomy is fixed because the argument is the product: what to do, why now, **what
 * evidence Oryn used**, and what it's worth. The evidence row is the part that makes this
 * different from a recommendation widget — it shows the student the actual basis for the
 * claim, including the things Oryn looked for and didn't find, so the advice can be argued
 * with rather than just accepted.
 *
 * Appears on Home, Profile Analysis, Counselor, university positioning and opportunity fit.
 * It adapts rather than repeating identically: `size="hero"` for the one statement that
 * opens a page, and `evidence`/`impact`/`horizon` are all optional so a surface with less
 * to say renders less rather than padding the shape out with empty labels.
 */
export function NextMove({
  eyebrow = "Next move",
  headline,
  why,
  evidence,
  facts,
  action,
  footnote,
  surface = false,
  size = "default",
  as: Heading = "h2",
  className,
}: {
  eyebrow?: ReactNode;
  headline: ReactNode;
  /** The "why now" argument. One short paragraph — this is reasoning, not an article. */
  why?: ReactNode;
  evidence?: NextMoveEvidence[];
  /** Short labelled values under the argument — "Impact / High", "Urgency / 12 days". */
  facts?: { term: string; value: ReactNode }[];
  action?: ReactNode;
  /** A qualification that must travel with the claim rather than sit loose beneath it. */
  footnote?: ReactNode;
  /** Lift onto the warm recommendation ground. At most one per screen. */
  surface?: boolean;
  size?: "default" | "hero";
  /** Heading level, so the page outline stays correct. When this is the statement that
   *  opens a page — Home's hero — it is the page's `h1`, not an `h2` under nothing. */
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const hero = size === "hero";

  return (
    <section className={cn(surface && "rounded-2xl bg-module-recommendation p-6 md:p-8", className)}>
      <Eyebrow tone="brand">{eyebrow}</Eyebrow>

      {/* The hero step starts at 1.75rem, not 2.25rem. A phone's usable measure inside this
          block is ~240px once the shell, the card and the inner panel have each taken their
          padding; at text-4xl a one-sentence headline ran six lines and filled the screen
          before anything else appeared (founder report, 2026-08-31). Same three-step ramp
          for the argument text underneath — `text-lg` only once there's room for it. */}
      <Heading
        className={cn(
          "mt-4 font-display tracking-[-0.02em] text-balance",
          hero
            ? "max-w-3xl text-[1.75rem] leading-[1.1] sm:text-4xl sm:leading-[1.05] md:text-5xl"
            : "max-w-2xl text-2xl leading-[1.15] md:text-3xl",
        )}
      >
        {headline}
      </Heading>

      {why ? (
        <div className={cn("mt-4 max-w-2xl leading-relaxed text-ink-2", hero && "sm:text-lg")}>{why}</div>
      ) : null}

      {evidence && evidence.length > 0 ? (
        <div className="mt-8">
          <Eyebrow rule={false}>What Oryn is reading</Eyebrow>
          {/* gap-x-6 below `sm`: at gap-x-10 three signals could not sit two-up on a phone
              and stacked into one tall column. */}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-5 sm:gap-x-10">
            {evidence.map((item) => (
              <EvidenceSignal
                key={item.label}
                label={item.label}
                value={item.value}
                unit={item.unit}
                tone={item.tone}
              />
            ))}
          </div>
        </div>
      ) : null}

      {facts && facts.length > 0 ? (
        // A description list, not loose spans: "High" is meaningless without "Impact"
        // attached to it, and a screen reader reading the row out of order would get
        // exactly that. Terms are visible here because they're short enough to earn it.
        <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-3">
          {facts.map((fact) => (
            <div key={fact.term}>
              <dt className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase">{fact.term}</dt>
              <dd className="mt-1 text-sm text-ink-1">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {action ? <div className="mt-7 flex flex-wrap items-center gap-3">{action}</div> : null}

      {/* Inside the block, never below it: a qualification a reader can take the verdict
          without reaching is the false-certainty shape this product must not produce. */}
      {footnote ? (
        <div className="mt-6 border-t border-brand-primary-border/50 pt-4 text-sm leading-relaxed text-ink-2">
          {footnote}
        </div>
      ) : null}
    </section>
  );
}
