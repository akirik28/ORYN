import { differenceInCalendarDays } from "date-fns";
import { Clock } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/proxola/status-badge";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * AGENTS.md Phase 23 names four urgency bands (3/7/14/30 days); until 2026-09-04 this only
 * had three dynamic tiers plus one flat catch-all past 14 days, so a deadline 20 days out and
 * one 120 days out rendered identically. Checked against real production data before adding
 * this: the closest real deadline anywhere in the database was 6 days out, and every other
 * real upcoming deadline (sampled 20-124+ days) fell in that single flat bucket — the missing
 * 30-day tier is the one that would actually have mattered.
 *
 * "info" for the new 15-30 day band, not "success" (nothing succeeded) or a repeat of
 * "brand"/"neutral" (would silently collapse back into an existing tier) — the one previously
 * unused StatusTone that reads as calm/informational rather than urgent or empty.
 */
export function urgencyTone(daysUntil: number): StatusTone {
  if (daysUntil <= 3) return "error";
  if (daysUntil <= 7) return "warning";
  if (daysUntil <= 14) return "brand";
  if (daysUntil <= 30) return "info";
  return "neutral";
}

/** Exported 2026-09-02 (Phase 12's "deadline urgency" dimension): the opportunity detail
 * page (app/(app)/opportunities/[id]/page.tsx) used to recompute this same string inline
 * as its "urgency" fact, missing the 1-day-left singular case this function already
 * handles correctly ("1 days left" vs "1 day left") -- reused now instead of drifting
 * further from this file's own single-source-of-truth comment below. */
export function urgencyLabel(daysUntil: number, locale: Locale): string {
  const tr = locale === "tr";
  if (daysUntil < 0) return tr ? "süresi geçti" : "Past due";
  if (daysUntil === 0) return tr ? "son gün bugün" : "Due today";
  if (daysUntil === 1) return tr ? "1 gün kaldı" : "1 day left";
  return tr ? `${daysUntil} gün kaldı` : `${daysUntil} days left`;
}

// Single source of truth for "how urgent is this deadline" — was previously duplicated
// (with slightly different thresholds) across the dashboard, opportunity cards, and
// applications. date-fns `differenceInCalendarDays` (already a dependency elsewhere)
// so "due today" means the calendar date, not a 24h countdown.
//
// Plain function taking `locale`, not a next-intl hook — this component's 7 call sites
// span both Server and Client Components, and a hook would force one or the other.
// `locale` is optional/defaulted rather than required, matching source-badge.tsx and
// confidence-indicator.tsx's own precedent, so a caller this pass didn't reach still
// compiles; confirmed live in Turkish on /advisor ("30 days left") before this fix.
export function DeadlineBadge({ date, className, locale = DEFAULT_LOCALE }: { date: string | Date; className?: string; locale?: Locale }) {
  const daysUntil = differenceInCalendarDays(new Date(date), new Date());
  return <StatusBadge label={urgencyLabel(daysUntil, locale)} tone={urgencyTone(daysUntil)} icon={Clock} className={className} />;
}
