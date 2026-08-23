"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import { EVIDENCE_STATE_LABELS, type DimensionSignal } from "@/lib/scoring/signal";
import type { TimeBudget } from "@/types/database";

function daysAway(date: string): string {
  const days = differenceInCalendarDays(new Date(date), new Date());
  if (days < 0) return "past due";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

const TIME_BUDGET_LABEL: Record<TimeBudget, string> = {
  under_2h: "Under 2h a week",
  "2_5h": "2–5h a week",
  "5_10h": "5–10h a week",
  "10h_plus": "10h+ a week",
};

/**
 * The standing brief at the top of the Counselor (UI-V3 § 14/15) — what Oryn is holding in
 * mind before the student says anything.
 *
 * Replaces a row of pill-shaped chips. Chips read as filter tags; this reads as the top of
 * a case file, which is the intended frame: the student walks into a room where someone
 * already knows their situation.
 *
 * The disclosure underneath is the trust mechanism. "Based on N signals" is only worth
 * saying if the student can open it and see the actual N — otherwise it's a claim of rigour
 * with nothing behind it, which is worse than saying nothing. Every row shown is real
 * recorded state, including the dimensions Oryn has no read on: those are the honest reason
 * its advice is hedged, and hiding them would make the confident-sounding parts look
 * better than they are.
 */
export function StrategyPanel({
  focusLabel,
  nextDecision,
  timeBudget,
  signal,
}: {
  /** The dimension Oryn is currently steering toward, when it can claim one. */
  focusLabel: string | null;
  /** The nearest dated commitment, already filtered for actionability upstream. */
  nextDecision: { title: string; date: string } | null;
  timeBudget: TimeBudget | null;
  signal: DimensionSignal[];
}) {
  const [open, setOpen] = useState(false);

  const facts: { term: string; value: string }[] = [
    focusLabel ? { term: "Current focus", value: focusLabel } : null,
    // Relative, never the absolute date: deadline titles are frequently self-describing
    // ("Yale University — Early Action: November 1, 2026") and appending a formatted date
    // produced "November 1, 2026 · Nov 1". Days-remaining adds information instead of
    // repeating it, and it's the framing that actually drives a decision.
    nextDecision ? { term: "Next decision", value: `${nextDecision.title} — ${daysAway(nextDecision.date)}` } : null,
    timeBudget ? { term: "Time available", value: TIME_BUDGET_LABEL[timeBudget] } : null,
  ].filter((f): f is { term: string; value: string } => f !== null);

  if (facts.length === 0 && signal.length === 0) return null;

  return (
    <section aria-label="What Oryn is working from" className="rounded-2xl bg-surface-tint p-6 md:p-7">
      <Eyebrow>Where you stand</Eyebrow>

      {facts.length > 0 ? (
        <dl className="mt-5 flex flex-wrap gap-x-12 gap-y-5">
          {facts.map((fact) => (
            <div key={fact.term}>
              <dt className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase">
                {fact.term}
              </dt>
              <dd className="mt-1.5 text-sm text-ink-1">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {signal.length > 0 ? (
        <div className={cn(facts.length > 0 && "mt-6 border-t border-border/70 pt-5")}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="group inline-flex items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Based on {signal.length} profile signal{signal.length === 1 ? "" : "s"}
            <ChevronDown
              aria-hidden="true"
              className={cn("size-4 text-ink-4 transition-transform", open && "rotate-180")}
            />
          </button>

          {open ? (
            <ul className="mt-4 grid gap-x-10 gap-y-2 sm:grid-cols-2">
              {signal.map((row) => (
                <li key={row.dimension} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate text-ink-2">{DIMENSION_LABELS[row.dimension]}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      row.state === "limited_evidence" ? "text-ink-4" : "text-ink-3",
                    )}
                  >
                    {EVIDENCE_STATE_LABELS[row.state]}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
