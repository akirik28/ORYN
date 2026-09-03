import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getMonthlyGrantsUsd } from "./grants";
import type { PlanTier } from "@/types/database";

/**
 * Per-user monthly AI spend budget (founder, 2026-09-02): $0.50/month target, $1.00/month
 * absolute ceiling. Measured live before this existed — one real student spent $3.04 in a
 * single week (102 calls, repeatedly regenerating a weekly plan), 3x the ceiling, with
 * everyone else under $0.25 lifetime. The risk is the tail, and the tail already happened.
 *
 * The founder's explicit choice: **never a hard wall.** A student who hits a wall mid-
 * question doesn't come back. So there is exactly one *direct* enforcement mechanism in
 * this module — degrading to a cheaper model once TARGET is reached — and CEILING is not a
 * second threshold checked here.
 *
 * **CEILING stopped being monitoring-only on 2026-09-02.** This comment used to say CEILING
 * was "never a second code-enforced gate" and that turning it into one "is a product
 * decision for the founder to make explicitly, not an inference from 'ceiling' sounding
 * stricter than 'target'." That decision arrived that same day: the founder's token-
 * metering directive, relayed through oryn-a7 ("meter by tokens, not messages"), asked for
 * exactly this. `lib/ai/monthly-quota.ts`'s shared allowance (236,150 tokens, shared across
 * seven student-facing features) is now a hard stop derived from CEILING with margin — see that
 * file's `usesConsumed` for the two-phase pre/post-degrade accounting, and its own comment
 * for why 50 lands around $0.83 of real spend, genuinely under this $1.00, not at its edge.
 * CEILING itself is still not read as a second live check anywhere in this file — the
 * enforcement lives in monthly-quota.ts, calibrated against this number rather than
 * duplicating it — but it is no longer true to say nothing in this codebase enforces past
 * TARGET. A future reader should trust that sentence, not the one above it.
 *
 * **Tier-keyed, 2026-09-03 (founder: "hem kota artsın hem cevap uzunluğu" — quota and reply
 * length both go up; the Max tier idea is dead, two tiers only).** Ultra's two figures are
 * exactly 2x Standard's, not independently chosen — the same is true of
 * `lib/ai/monthly-quota.ts`'s `HISTORICAL_USE_LIMIT`/`MONTHLY_AI_TOKEN_LIMIT`, which are
 * *derived from* these two per tier, not a separate pair of magic numbers. Uniform 2x
 * scaling of all four together is what makes this one multiplier to justify rather than
 * four: `usesConsumed`'s own piecewise formula preserves the safety margin at exactly
 * 16.67% under either tier's own ceiling — Standard reaches its 50-use limit at $0.8333 of
 * real spend ($0.1667 under its $1.00 ceiling); Ultra reaches its 100-use limit at $1.6667
 * ($0.3333 under its $2.00 ceiling) — algebraically identical proportions, confirmed by
 * running the formula both ways, not assumed from the multiplier alone. Margin checked
 * against the founder's own ~800 TL/month Ultra price at his own illustrative 40 TL/USD
 * rate: $20.00 revenue against a $2.00 worst case is a 10x margin, comfortably above the 5x
 * bar `docs/maliyet-ve-fiyatlandirma-2026-09-02.md` uses as its own healthy line.
 */
export const MONTHLY_BUDGET_TARGET_USD: Record<PlanTier, number> = { standard: 0.5, ultra: 1.0 };
export const MONTHLY_BUDGET_CEILING_USD: Record<PlanTier, number> = { standard: 1.0, ultra: 2.0 };

/**
 * The model a degraded call uses. `ANTHROPIC_MODEL` (env.anthropic.model) stays the ceiling
 * model — untouched, still what every non-degraded call uses — this is its own separate
 * variable precisely so the degrade target can be tuned (or swapped to a different model
 * generation) without touching the ceiling model's own configuration.
 *
 * Defaults to Haiku 4.5, the model the founder's own cost comparison used: an advisor
 * message on Sonnet 5 is ~$0.035; the same message on Haiku 4.5 is ~$0.0116, about 3x
 * cheaper — degrading doesn't stop the product, it slows the burn rate.
 *
 * Exported (2026-09-02, response-mode slider): "Fast" is a student *choosing* this same
 * model voluntarily, not spend forcing it — lib/ai/advisor-chat.ts reads this directly
 * rather than duplicating the env/default logic a second time. `selectModelForUser` itself
 * is untouched by that feature; a chat-specific UI preference has no business inside a
 * function every one of the seven student-facing features shares.
 */
export const DEGRADE_MODEL = process.env.ANTHROPIC_DEGRADE_MODEL?.trim() || "claude-haiku-4-5";

export type ModelSelectionReason =
  /** Under target this month — full ceiling model, the normal case. */
  | "under_target"
  /** At or over MONTHLY_BUDGET_TARGET_USD in known, priced spend this month. */
  | "at_or_over_target"
  /** At least one row this month has a NULL estimated_cost (see the comment on
   * `hasUnknownCostRows` below) — true spend is unknown, not necessarily zero, so this
   * degrades defensively rather than silently treating the unpriced usage as free. */
  | "unknown_cost_this_month"
  /** No user to check a budget for (background/admin job — see
   * docs/handoffs/ai-usage-attribution-audit-2026-09-02.md) — always the ceiling model,
   * there is no student to protect from an unattributed system job. */
  | "no_user"
  /** The admin client isn't configured, or the query itself failed — fails OPEN (ceiling
   * model), not degraded, matching this codebase's established "an unavailable check must
   * never punish the student for the check's own unavailability" convention (see
   * lib/opportunities/persist-matches.ts's own tryCreateAdminClient() handling). A silent
   * cap that fails toward blocking would itself be the hard wall the founder rejected. */
  | "usage_unavailable"
  /** NOT produced by this file — added here only so `ModelSelection.reason` has a value
   * for it, since `logAIUsage`'s `degradeReason` is typed against this union. Set by
   * lib/ai/limits/weekly-plan-budget.ts's `selectModelForWeeklyPlan`, a genuinely separate
   * mechanism from everything else in this file (2026-09-03): this one is feature-wide,
   * summed across every student this month, degrade-not-stop like the rest of this file
   * but answering "how much may this feature spend across everyone," a question this
   * file's own per-student check structurally cannot ask. See that file's own header for
   * why it isn't built as a branch inside this one. */
  | "aggregate_feature_budget";

export interface ModelSelection {
  /** The model this call should actually use — pass straight into AIRequest.model. */
  model: string;
  /** True exactly when `model !== env.anthropic.model` — i.e. this call was degraded. */
  degraded: boolean;
  reason: ModelSelectionReason;
  /** Null when spend couldn't be determined (usage_unavailable) — never a fabricated 0,
   * matching this codebase's "absent is not zero" rule elsewhere. */
  monthToDateSpendUsd: number | null;
}

function currentUtcMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Decides which model a call for `userId` should use, checked fresh against `ai_usage`
 * before every call rather than cached — per-user monthly volume is small (even the $3.04
 * tail case was 102 rows in a week), so a single indexed `user_id` + `created_at` query
 * (both already indexed, migration 0013) is cheap enough to run on every request. If this
 * ever proves too slow in practice, that is a reason to revisit with a measured number, not
 * a reason to cache something that can silently go stale — an unnoticed stale "under
 * budget" read is exactly how the $3.04 week happened undetected in the first place.
 *
 * Scoped to the **calendar month in UTC**, not a rolling 30 days — the founder's own
 * framing ("$0.50/month") reads as calendar-month, and it's simpler to reason about and to
 * show a student/admin ("this month" is unambiguous; "your last 30 days" is not).
 *
 * `tier` defaults to `"standard"` deliberately, not required — the three background-job
 * callers (`opportunity_extraction`/`requirement_extraction`/`requirement_interpretation`)
 * pass `userId: null` and return in the branch immediately below before `tier` is ever
 * read, so a tier-less call from one of them stays exactly as correct as it always was.
 * Real per-student callers (`advisor-chat.ts`, `weekly-plan-budget.ts`) pass their
 * resolved `PlanTier` explicitly — see each one's own comment on where that tier comes from.
 */
export async function selectModelForUser(userId: string | null, tier: PlanTier = "standard"): Promise<ModelSelection> {
  if (!userId) {
    return { model: env.anthropic.model, degraded: false, reason: "no_user", monthToDateSpendUsd: null };
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[ai-limits] SUPABASE_SECRET_KEY not configured — skipping budget check, using the ceiling model");
    return { model: env.anthropic.model, degraded: false, reason: "usage_unavailable", monthToDateSpendUsd: null };
  }

  const monthStartIso = currentUtcMonthStartIso();
  const [{ data, error }, grantsUsd] = await Promise.all([
    admin.from("ai_usage").select("estimated_cost").eq("user_id", userId).gte("created_at", monthStartIso),
    getMonthlyGrantsUsd(admin, userId, monthStartIso),
  ]);

  if (error || !data) {
    console.error("[ai-limits] failed to read ai_usage for budget check — using the ceiling model", { userId, error });
    return { model: env.anthropic.model, degraded: false, reason: "usage_unavailable", monthToDateSpendUsd: null };
  }

  // A row's estimated_cost is NULL when it was priced against a model absent from
  // lib/ai/pricing.ts's table (estimateCostUsd's own documented behavior) — e.g.
  // ANTHROPIC_MODEL gets bumped to a new model string before pricing.ts is updated to
  // match. SUM() silently ignores NULLs, so summing alone would under-count exactly the
  // rows this cap most needs to see, the same shape of gap as the null-user_id concern
  // this package's precondition investigated (see the audit doc — that one turned out to
  // be test data, not a live hole; this one is a real, narrower gap worth guarding
  // directly since it's this module's own arithmetic, not a different write path's).
  //
  // This check is deliberately UNAFFECTED by grants (2026-09-02/03, quota_grants): an
  // unpriced row means true spend is unknown, and a dollar grant doesn't resolve an unknown
  // — it only offsets a known amount. A student could have a $100 grant and still have real
  // spend of genuinely uncertain size sitting underneath it.
  const hasUnknownCostRows = data.some((row) => row.estimated_cost === null);
  const knownSpendUsd = data.reduce((sum, row) => sum + (row.estimated_cost ?? 0), 0);
  // Never negative — a grant larger than this month's real spend doesn't carry a "credit"
  // into next month or below $0 this one; see getMonthlyGrantsUsd's own comment on why both
  // gates that read this table share this same effective-spend shape.
  const effectiveSpendUsd = Math.max(0, knownSpendUsd - grantsUsd);

  if (hasUnknownCostRows) {
    return { model: DEGRADE_MODEL, degraded: true, reason: "unknown_cost_this_month", monthToDateSpendUsd: knownSpendUsd };
  }
  if (effectiveSpendUsd >= MONTHLY_BUDGET_TARGET_USD[tier]) {
    return { model: DEGRADE_MODEL, degraded: true, reason: "at_or_over_target", monthToDateSpendUsd: effectiveSpendUsd };
  }
  return { model: env.anthropic.model, degraded: false, reason: "under_target", monthToDateSpendUsd: effectiveSpendUsd };
}
