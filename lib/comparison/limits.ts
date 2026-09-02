import { COMPARE_MAX } from "@/lib/universities/compare-constants";
import type { PlanTier } from "@/types/database";

/**
 * Standard/Ultra comparison gating (founder, 2026-09-02, verbatim: "üni ve opportunity
 * karşılaştırma premium olsun — 2 tane opportunity veya üniyi ayda 5 kere karşılaştırabil,
 * ama sadece 2 opp veya uni, ve 5 kere sonrası için premium gereksin. Premiumda istediğin
 * kadar ve sayıda karşılaştır") — two independent limits, a width cap and a frequency cap.
 * Deliberately pure, no `server-only`, no Supabase — same isolation reason
 * lib/date/month-boundary.ts's own header documents: this feeds both a server page
 * (compare/page.tsx) and, eventually, the client-side picker (useCompare/
 * useOpportunityCompare), and a file that starts async/Supabase-backed poisons every
 * importer's bundle the moment a Client Component reaches for it too — that exact bug
 * already happened once tonight (lib/advisor/upgrade-prompt.ts's own header). See
 * ./usage.ts for the async half (reading/writing product_events).
 *
 * `lib/tier/comparison.ts` was NOT reused for this despite the name — that file is the
 * Standard/Ultra feature-comparison TABLE on the plan settings page (an unrelated
 * "comparison": marketing copy rows, not item comparison). Naming this module
 * lib/comparison/ rather than colliding with or overloading that one.
 */

/** Ultra's width ceiling is simply today's unchanged COMPARE_MAX (4) — the founder's
 *  "istediğin kadar ve sayıda" (compare as much and as many as you want) reads as "no NEW
 *  restriction," not "remove the pre-existing UI/layout ceiling that already shapes every
 *  compare table." Standard's is new and narrower, per the founder's own "2 tane." */
export const STANDARD_COMPARE_MAX = 2;

/** One shared monthly allowance across universities AND opportunities combined, not two
 *  pools of 5 — the founder's phrasing ("2 tane opportunity VEYA üniyi... ayda 5 kere") reads
 *  as one number, and it matches this codebase's own "50 shared AI uses across seven
 *  features, not 50 each" precedent (lib/ai/monthly-quota.ts). Flagged to oryn-a7 as the one
 *  real assumption in this design; confirmed before building. */
export const MONTHLY_COMPARISON_LIMIT = 5;

export type ComparisonItemType = "university" | "opportunity";

/** The interactive AND server-side width ceiling — one function, so the picker's `atLimit`
 *  and the compare page's `.slice()` can never quietly disagree about how many items a
 *  given tier may select. */
export function resolveComparisonWidthCeiling(planTier: PlanTier): number {
  return planTier === "ultra" ? COMPARE_MAX : STANDARD_COMPARE_MAX;
}

/**
 * Canonical, order-independent key for "this exact set of items" — sorted so {A,B} and
 * {B,A} collapse to one comparison, prefixed with itemType so a university set and an
 * opportunity set can never collide even in the pathological case of equal id strings
 * across the two tables. This is the whole mechanism behind "5 comparisons" meaning "5
 * distinct decisions opened," not "5 page loads" — a refresh, a back-button, or revisiting
 * a bookmarked comparison link produces the same key and costs nothing extra. See
 * ./usage.ts's getMonthlyComparisonUsage for where this key gets deduplicated against.
 */
export function canonicalComparisonKey(itemType: ComparisonItemType, ids: string[]): string {
  return `${itemType}:${[...ids].sort().join(",")}`;
}

/**
 * The single enforcement decision, given already-fetched usage — pure, so both compare
 * pages (and a test) can call it directly rather than only exercising it through a full
 * render, same shape as resolvePlanTier/resolveResponseMode. Takes the minimal shape it
 * needs inline rather than importing ComparisonUsage from ./usage.ts, keeping this file's
 * zero-dependency guarantee real rather than one import away from being broken.
 *
 * `usedIsKnown: false` (a read failure) permits the comparison — fail-open, same posture as
 * isMonthlyQuotaExhausted, but an easier call here: that one fails open for availability
 * despite guarding real spend; this one guards no cost or abuse risk at all, only an
 * upgrade nudge, so there is no tension to weigh.
 */
export function isComparisonQuotaExhausted(planTier: PlanTier, usage: { remaining: number; usedIsKnown: boolean }): boolean {
  if (planTier === "ultra") return false;
  if (!usage.usedIsKnown) return false;
  return usage.remaining <= 0;
}
