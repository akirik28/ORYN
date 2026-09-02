import "server-only";

import { createClient } from "@/lib/supabase/server";
import { MONTHLY_BUDGET_TARGET_USD } from "./limits/budget";

/**
 * Calendar-month AI allowance, enforced server-side and surfaced in the UI as a real
 * remaining balance — denominated in cost (USD), displayed as a whole number of tokens.
 *
 * Distinct from lib/ai/rate-limit.ts, which is a short sliding-window abuse guard (bursts
 * over ten minutes). This one is the monthly allowance a student is actually budgeting
 * against, so it is the number worth showing them. Both read the same `ai_usage` log —
 * every AI call already writes a row there (lib/ai/usage.ts) — so no second counter can
 * drift out of sync with reality.
 *
 * **2026-09-02, founder directive relayed through oryn-a7, verbatim: "sadece senden
 * isteğim mesajla değil tokenla ölç ai şeyini" — meter by tokens, not messages** — then,
 * once shipped as a display of "AI uses," said again, more pointedly: "hala 50 üstünden
 * mesaj hesaplıyor token ver" (it's still counting messages out of 50, give tokens). Right
 * both times: 50 was still 50 under a relabelled unit. This is the second pass, changing
 * only what gets displayed — see `TOKENS_PER_USE_REFERENCE` below. Three decisions made in
 * answering the original directive, all worth recording plainly rather than letting them
 * read as arbitrary:
 *
 * **Cost, not raw tokens.** A raw token ceiling would reintroduce the same denominator
 * problem one level down: `selectModelForUser` (lib/ai/limits/budget.ts) switches a
 * degraded student from Sonnet to Haiku mid-month, and a Haiku output token costs 1/5 what
 * a Sonnet output token costs (lib/ai/pricing.ts) — so a raw-token budget would drain at a
 * rate disconnected from the student's real consumption, exactly like a message count did.
 * `estimated_cost` (already computed per row by lib/ai/pricing.ts's `estimateCostUsd`,
 * already what lib/ai/limits/budget.ts's degrade check sums) is the only unit that means
 * the same thing on both sides of a degrade. This file now shares that exact accounting
 * with the degrade mechanism instead of running a second, message-counted system beside it.
 *
 * **Seven features share one pool, not ten.** `ai_usage.feature` has ten distinct values
 * (grepped `feature: "` across lib/), but verified from each one's actual call site — not
 * from the names, which mislead here — only seven ever carry a real student's `userId`:
 * the ones in `PER_STUDENT_AI_FEATURES` below. `opportunity_extraction` and
 * `requirement_extraction` always pass `userId: null` (one call site says so in its own
 * comment) — global catalog ingest, no student to charge, correctly outside any per-
 * student pool. `requirement_interpretation` passes an admin's id, not a student's — an
 * admin action, not student spend; left out of this pool as a separate, smaller concern
 * for another day, not folded in here.
 */
export const PER_STUDENT_AI_FEATURES = [
  "advisor_chat",
  "research_generator",
  "weekly_plan",
  "cv_extraction",
  "achievement_refinement",
  "counselor_explanation",
  "essay_story_bank",
] as const;

/**
 * The shared monthly allowance, still 50 of an internal unit derived from real spend (see
 * `usesConsumed` below) — kept private now, because nothing outside this file should
 * reason in it any more. This is a re-derivation against the same $1.00 ceiling and the
 * same margin logic that produced the original message-count 50 (see git history), not a
 * coincidence — the real dollar economics never moved, only the unit and the scope (one
 * feature to seven) did.
 *
 * This is also the founder-level decision lib/ai/limits/budget.ts's own comment on
 * `MONTHLY_BUDGET_CEILING_USD` said would be needed before that number stopped being
 * monitoring-only — see that file's updated comment for what changed and when.
 */
const HISTORICAL_USE_LIMIT = 50;

/**
 * Tokens per unit of `HISTORICAL_USE_LIMIT` — 3,628 input + 1,095 output, the exact real
 * advisor_chat average this whole session has anchored on (queried 2026-09-02; see the
 * $0.03 reference below for the fuller real-data picture). Reused here rather than
 * re-derived from a volume-weighted blend across features, for the same reason $0.03 was:
 * traceable to the one figure both the founder and the fleet have already reasoned about,
 * not marginally more accurate and unexplainable.
 *
 * `MONTHLY_AI_TOKEN_LIMIT` below (236,150) lands within 0.06% of the founder-approved
 * response-mode prototype's own ceiling figure (236,000, `oryn-bar-motion.html`'s `TOK`
 * array) — arrived at independently, from real per-message token averages, not read off
 * the prototype. The number the founder already looked at and approved is, to within
 * rounding, the same one this produces.
 */
export const TOKENS_PER_USE_REFERENCE = 4_723;

/**
 * The shared monthly allowance, in tokens — what actually reaches the screen. `used`,
 * `limit` and `remaining` on `MonthlyQuota` are now denominated in this unit throughout,
 * not just at the final display step: scaling every field by the same positive constant
 * preserves every sign and ratio comparison exactly (`remaining <= 0`, `remaining <=
 * limit * 0.1` in lib/ai/usage-state.ts), so there is no separate "uses" representation to
 * keep in sync with this one — one computed value, one unit, used everywhere. See
 * `usesConsumed` below for the piecewise dollar-to-token conversion this constant is built
 * from.
 */
export const MONTHLY_AI_TOKEN_LIMIT = HISTORICAL_USE_LIMIT * TOKENS_PER_USE_REFERENCE;

/**
 * Reference cost of one "AI use" pre-degrade, and the basis for `usesConsumed` below.
 * $0.03, from real `ai_usage` rows queried 2026-09-02 (calendar month to date):
 *
 *   advisor_chat            n=11  avg $0.0287/call
 *   weekly_plan              n=115 avg $0.0292/call   <- by far the largest real sample
 *   cv_extraction            n=3   avg $0.0471/call   (thin; structurally pricier — a full
 *                                                       résumé as input, expected)
 *   achievement_refinement  n=1   avg $0.0055/call   (unreliable; short focused prompt)
 *   research_generator, counselor_explanation, essay_story_bank:  n=0 — never called in
 *   production. No real data exists for 3 of these 7 features yet.
 *
 * $0.03 is anchored on the two well-sampled, convergent features (advisor_chat and
 * weekly_plan land within 2% of each other despite very different call shapes — a real
 * signal, not a coincidence trusted from n=11 alone) — not on all seven. **Re-run the
 * query below once the three zero-data features have accumulated real usage, and revisit
 * this constant if their averages pull the picture meaningfully off $0.03** — the same
 * discipline that turned the original, undated 300 into a measured 50 should apply here
 * again, not stop applying just because a number is already in the file:
 *
 *   select feature, count(*) n, round(avg(estimated_cost)::numeric,5) avg_cost_usd
 *   from ai_usage where user_id is not null group by feature order by n desc;
 */
export const REFERENCE_COST_PER_USE_USD = 0.03;

/**
 * Reference cost of one "AI use" post-degrade — lib/ai/limits/budget.ts's own comment on
 * `DEGRADE_MODEL` puts Haiku at "about 3x cheaper" than Sonnet for the same advisor
 * message, so the reference cost drops by the same ratio here rather than a second,
 * independently-chosen number.
 */
const DEGRADED_REFERENCE_COST_PER_USE_USD = REFERENCE_COST_PER_USE_USD / 3;

/**
 * Converts real month-to-date spend into `HISTORICAL_USE_LIMIT`-scale units, piecewise
 * across the pre/post-degrade boundary — deliberately not a flat
 * `spend / REFERENCE_COST_PER_USE_USD` division.
 *
 * A flat division would make the 50-unit ceiling mean the wrong thing: 50 units at a flat
 * $0.03 each is $1.50, above the real $1.00 ceiling this number is supposed to protect — a
 * flat rate ignores that spend past the $0.50 target is already running on the cheaper
 * degraded model, so it silently weakens the ceiling by 50%. This function is the same
 * two-phase accounting that derived 50 in the first place, made live instead of one-time:
 * units accumulate at `REFERENCE_COST_PER_USE_USD` up to the $0.50 target, then at the
 * cheaper `DEGRADED_REFERENCE_COST_PER_USE_USD` beyond it. Reaching all 50 this way costs a
 * student roughly $0.83 in real spend — genuinely below the $1.00 ceiling, real margin,
 * not an accident of this formula.
 *
 * The point of tying display and enforcement to this one function, rather than deriving
 * `used` from cost for display and checking raw spend against the ceiling separately for
 * enforcement: those two would not reach zero/blocked at the same moment (a heavy
 * cv_extraction-only student would be blocked by a raw-dollar check while the display
 * still showed a positive balance, or vice versa for a heavy achievement_refinement-only
 * student) — a real, confidently-wrong-number risk, not a rounding nicety. `getMonthlyQuota`
 * scales this function's output by `TOKENS_PER_USE_REFERENCE` for every field on
 * `MonthlyQuota` uniformly, so `used`, `limit` and `remaining` all stay one shared number
 * expressed in one unit — not this function's raw output for enforcement and a second,
 * separately-scaled number for display.
 */
function usesConsumed(spendUsd: number): number {
  const preDegradeCapacityUses = MONTHLY_BUDGET_TARGET_USD / REFERENCE_COST_PER_USE_USD;
  if (spendUsd <= MONTHLY_BUDGET_TARGET_USD) {
    return spendUsd / REFERENCE_COST_PER_USE_USD;
  }
  const postDegradeSpendUsd = spendUsd - MONTHLY_BUDGET_TARGET_USD;
  return preDegradeCapacityUses + postDegradeSpendUsd / DEGRADED_REFERENCE_COST_PER_USE_USD;
}

export interface MonthlyQuota {
  used: number;
  limit: number;
  remaining: number;
  /** 0–1. Clamped, so a legacy over-quota account renders a full bar rather than overflow. */
  fraction: number;
  /** ISO date the allowance resets — the first instant of next calendar month, UTC. */
  resetsAt: string;
  /**
   * False when the usage count could not be read at all. `used` is then 0 and `remaining`
   * is the full limit — not because nothing has been spent, but because we do not know.
   * Callers that display the allowance must say so rather than showing a confident full
   * bar; callers that enforce it must decide deliberately what an unknown means.
   */
  usedIsKnown: boolean;
}

/** First instant of the current UTC calendar month. */
function startOfMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Reads this calendar month's shared allowance across all seven `PER_STUDENT_AI_FEATURES`.
 * Never throws: a counting failure must not take down the surface that displays it.
 *
 * An earlier version of this comment justified the fail-open by saying "the separate
 * sliding-window limiter still guards the actual call." That is not true for the failure
 * mode that matters. `assertWithinAIRateLimit` (lib/ai/rate-limit.ts) reads the *same*
 * `ai_usage` table through the *same* Supabase client and also treats an unreadable count
 * as zero, so anything that makes this read fail — an RLS change, a connection problem, the
 * table itself — opens both guards at once. They are two layers over one dependency, not
 * defence in depth.
 *
 * So the unknown is now representable (`usedIsKnown`) instead of being silently identical
 * to "nothing spent." Behaviour is unchanged: an unreadable count still permits the call.
 * That is a deliberate availability choice — failing closed would block every AI feature on
 * a transient database error — and it is one the founder should be able to revisit, which
 * requires it being visible rather than accidental.
 *
 * A row with a NULL `estimated_cost` (a model absent from lib/ai/pricing.ts, same gap
 * `selectModelForUser` guards — see that function's own `hasUnknownCostRows` comment) is
 * treated as unknown too, for the same reason: `SUM` silently ignores NULLs, so summing
 * through it would under-count exactly the spend this check most needs to see. Reusing
 * `usedIsKnown` for this — rather than quietly summing only the priced rows — keeps this
 * module's one failure signal meaning one thing: "the number below is not trustworthy,"
 * not "trustworthy, but possibly missing something."
 */
export async function getMonthlyQuota(userId: string): Promise<MonthlyQuota> {
  const limit = MONTHLY_AI_TOKEN_LIMIT;
  const resetsAt = startOfNextMonthUTC().toISOString();

  let used = 0;
  let usedIsKnown = true;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_usage")
      .select("estimated_cost")
      .eq("user_id", userId)
      .in("feature", PER_STUDENT_AI_FEATURES)
      .gte("created_at", startOfMonthUTC().toISOString());
    if (error) throw error;

    const rows = data ?? [];
    if (rows.some((row) => row.estimated_cost === null)) {
      usedIsKnown = false;
    } else {
      const spendUsd = rows.reduce((sum, row) => sum + (row.estimated_cost ?? 0), 0);
      // Floored, not rounded: this is the same value the exhausted check below reads, so
      // rounding up could block a student whose real usage hasn't actually reached the
      // limit yet — a rounding technicality producing the exact hard-wall-by-accident the
      // founder has repeatedly rejected elsewhere in this system. Floor means "used >=
      // limit" only fires once spend has genuinely earned it. Scaled to tokens before the
      // floor, not after — flooring the small "uses" value first and multiplying up would
      // throw away real fractional spend the token scale has room to represent.
      used = Math.floor(usesConsumed(spendUsd) * TOKENS_PER_USE_REFERENCE);
    }
  } catch (error) {
    usedIsKnown = false;
    console.error("[monthly-quota] failed to read usage", error instanceof Error ? error.stack : error);
  }

  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    fraction: Math.min(1, Math.max(0, used / limit)),
    resetsAt,
    usedIsKnown,
  };
}

/**
 * True when the caller has already spent this month's shared allowance.
 *
 * An unreadable count returns false — the call is permitted. Written as an explicit branch
 * rather than falling out of `used = 0` so that the choice is visible at the point it is
 * made: this permits spend we cannot account for, and the reason is availability, not
 * confidence. See getMonthlyQuota's note on why the burst limiter is not a second guard here.
 *
 * Reads `remaining` from the same `getMonthlyQuota` call a caller's UI already uses to
 * display the balance — deliberately not a separate raw-dollar check against
 * `MONTHLY_BUDGET_CEILING_USD`. See `usesConsumed`'s own comment for why: a second,
 * independently-computed enforcement path is exactly what could show a student a positive
 * token balance while already blocked, or the reverse.
 */
export async function isMonthlyQuotaExhausted(userId: string): Promise<boolean> {
  const quota = await getMonthlyQuota(userId);
  if (!quota.usedIsKnown) return false;
  return quota.remaining <= 0;
}
