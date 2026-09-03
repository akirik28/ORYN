"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/proxola/eyebrow";
import { dimensionLabel } from "@/lib/scoring/labels";
import { evidenceStateLabel, type DimensionSignal } from "@/lib/scoring/signal";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import type { TimeBudget } from "@/types/database";

/** Same TS2589-adjacent workaround as every other file in this i18n effort that passes a
 * next-intl translator across a function boundary (see app/(app)/universities/[id]/page.tsx's
 * own `Translator` alias). */
type Translator = (key: string, values?: Record<string, string | number>) => string;

function daysAway(date: string, t: Translator): string {
  const days = differenceInCalendarDays(new Date(date), new Date());
  if (days < 0) return t("pastDue");
  if (days === 0) return t("today");
  if (days === 1) return t("tomorrow");
  return t("inDays", { days: formatNumber(days) });
}

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
  const t = useTranslations("advisor.strategyPanel") as Translator;
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);

  const TIME_BUDGET_LABEL: Record<TimeBudget, string> = {
    under_2h: t("timeBudget.under2h"),
    "2_5h": t("timeBudget.2to5h"),
    "5_10h": t("timeBudget.5to10h"),
    "10h_plus": t("timeBudget.10hPlus"),
  };

  const facts: { term: string; value: string }[] = [
    focusLabel ? { term: t("currentFocus"), value: focusLabel } : null,
    // Relative, never the absolute date: deadline titles are frequently self-describing
    // ("Yale University — Early Action: November 1, 2026") and appending a formatted date
    // produced "November 1, 2026 · Nov 1". Days-remaining adds information instead of
    // repeating it, and it's the framing that actually drives a decision.
    nextDecision ? { term: t("nextDecision"), value: `${nextDecision.title} — ${daysAway(nextDecision.date, t)}` } : null,
    timeBudget ? { term: t("timeAvailable"), value: TIME_BUDGET_LABEL[timeBudget] } : null,
  ].filter((f): f is { term: string; value: string } => f !== null);

  if (facts.length === 0 && signal.length === 0) return null;

  return (
    // Figma-source glass-card chrome (2026-08-30, same treatment as Dashboard/Connections/
    // Applications) — replaces the flat `bg-surface-tint` panel so this reads as one of the
    // Counselor's boxed blocks rather than the one ungrouped surface on the page.
    <section
      aria-label={t("ariaLabel")}
      className="glass-card rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7"
    >
      <Eyebrow locale={locale}>{t("whereYouStand")}</Eyebrow>

      {facts.length > 0 ? (
        <dl className="mt-5 flex flex-wrap gap-x-12 gap-y-5">
          {facts.map((fact) => (
            <div key={fact.term}>
              <dt className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase" lang={locale}>
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
            {t("basedOnSignals", { count: signal.length, formatted: formatNumber(signal.length) })}
            <ChevronDown
              aria-hidden="true"
              className={cn("size-4 text-ink-4 transition-transform", open && "rotate-180")}
            />
          </button>

          {open ? (
            <ul className="mt-4 grid gap-x-10 gap-y-2 sm:grid-cols-2">
              {signal.map((row) => (
                <li key={row.dimension} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate text-ink-2">{dimensionLabel(row.dimension, locale)}</span>
                  <span className="shrink-0 text-xs text-ink-3">{evidenceStateLabel(row.state, locale)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
