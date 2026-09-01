import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/**
 * Per-user monthly AI spend budget (founder, 2026-09-02): $0.50/month target, $1.00/month
 * absolute ceiling. Measured live before this existed — one real student spent $3.04 in a
 * single week (102 calls, repeatedly regenerating a weekly plan), 3x the ceiling, with
 * everyone else under $0.25 lifetime. The risk is the tail, and the tail already happened.
 *
 * The founder's explicit choice: **never a hard wall.** A student who hits a wall mid-
 * question doesn't come back. So there is exactly one enforcement mechanism — degrading to
 * a cheaper model once TARGET is reached — and CEILING is deliberately not a second,
 * harder-enforced threshold in this module. It's a monitoring/alerting number: the figure
 * the degrade mechanism is tuned to keep most students under, and worth surfacing to an
 * admin as "still over ceiling even on Haiku" for the rare case the soft mechanism alone
 * isn't enough — never a second code-enforced gate. If a hard stop is ever wanted, that is
 * a product decision for the founder to make explicitly, not an inference from "ceiling"
 * sounding stricter than "target".
 */
export const MONTHLY_BUDGET_TARGET_USD = 0.5;
export const MONTHLY_BUDGET_CEILING_USD = 1.0;

/**
 * The model a degraded call uses. `ANTHROPIC_MODEL` (env.anthropic.model) stays the ceiling
 * model — untouched, still what every non-degraded call uses — this is its own separate
 * variable precisely so the degrade target can be tuned (or swapped to a different model
 * generation) without touching the ceiling model's own configuration.
 *
 * Defaults to Haiku 4.5, the model the founder's own cost comparison used: an advisor
 * message on Sonnet 5 is ~$0.035; the same message on Haiku 4.5 is ~$0.0116, about 3x
 * cheaper — degrading doesn't stop the product, it slows the burn rate.
 */
const DEGRADE_MODEL = process.env.ANTHROPIC_DEGRADE_MODEL?.trim() || "claude-haiku-4-5";

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
  | "usage_unavailable";

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

function startOfNextUtcMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
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
 */
export async function selectModelForUser(userId: string | null): Promise<ModelSelection> {
  if (!userId) {
    return { model: env.anthropic.model, degraded: false, reason: "no_user", monthToDateSpendUsd: null };
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[ai-limits] SUPABASE_SECRET_KEY not configured — skipping budget check, using the ceiling model");
    return { model: env.anthropic.model, degraded: false, reason: "usage_unavailable", monthToDateSpendUsd: null };
  }

  const { data, error } = await admin.from("ai_usage").select("estimated_cost").eq("user_id", userId).gte("created_at", currentUtcMonthStartIso());

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
  const hasUnknownCostRows = data.some((row) => row.estimated_cost === null);
  const knownSpendUsd = data.reduce((sum, row) => sum + (row.estimated_cost ?? 0), 0);

  if (hasUnknownCostRows) {
    return { model: DEGRADE_MODEL, degraded: true, reason: "unknown_cost_this_month", monthToDateSpendUsd: knownSpendUsd };
  }
  if (knownSpendUsd >= MONTHLY_BUDGET_TARGET_USD) {
    return { model: DEGRADE_MODEL, degraded: true, reason: "at_or_over_target", monthToDateSpendUsd: knownSpendUsd };
  }
  return { model: env.anthropic.model, degraded: false, reason: "under_target", monthToDateSpendUsd: knownSpendUsd };
}

/**
 * The UI-facing view of this budget — 2026-09-02, closing the gap oryn-b9 found:
 * MonthlyUsageMeter (features/advisor/monthly-usage-meter.tsx) shows a 300-message/month
 * abuse backstop (lib/ai/monthly-quota.ts) that has nothing to do with this file. A student
 * can be several degraded replies deep (roughly 14 Sonnet messages at $0.035 each hits the
 * $0.50 target) while that meter still shows a nearly-full bar and "270 messages left" —
 * accurate for the number it's showing, just not the number that actually changed their
 * experience. That's not this file lying about itself: selectModelForUser's own
 * monthToDateSpendUsd has always been correct. It's that nothing exposed it to any UI at
 * all, because it didn't exist yet when the meter was built. This closes that gap without
 * touching the meter's own rendering, which stays oryn-b9's territory — see the boundary
 * note in the package this shipped with.
 *
 * Deliberately calls selectModelForUser rather than re-reading ai_usage independently: the
 * whole point is that this can never say something different from what the real enforcement
 * decision would be for the same user at the same moment. Two independently-written queries
 * against the same table is exactly the failure shape lib/ai/monthly-quota.ts's own header
 * warns about (it and lib/ai/rate-limit.ts drifting out of sync) — reusing the one real
 * decision function instead of adding a second one is how this avoids repeating that.
 */
export interface SpendQuota {
  /** Null only when the underlying check was usage_unavailable (admin client missing, or
   *  the query itself failed) — never a fabricated 0. Matches ModelSelection's own
   *  "absent is not zero" rule. */
  spentUsd: number | null;
  targetUsd: number;
  ceilingUsd: number;
  /** 0–1, clamped against targetUsd (not ceilingUsd — the target is what actually triggers
   *  degrade, so it's what "how full is the bar" should mean). 0 when spentUsd is null. */
  fraction: number;
  /** Exactly what selectModelForUser would decide for this user right now — true for
   *  at_or_over_target and unknown_cost_this_month, false otherwise (including
   *  usage_unavailable, which fails open rather than degrading). */
  degraded: boolean;
  /** False only when usage_unavailable — an unpriced row (unknown_cost_this_month) still
   *  counts as "known" here, since spentUsd itself is a real, if partial, sum; what's
   *  unknown in that case is completeness, not the number, and `degraded` already reflects
   *  the defensive response to that separately. */
  spentIsKnown: boolean;
  /** ISO date the allowance resets — the first instant of next calendar month, UTC. Same
   *  meaning and shape as MonthlyQuota.resetsAt (lib/ai/monthly-quota.ts), so a caller
   *  rendering both can treat them the same way. */
  resetsAt: string;
}

export async function getSpendQuota(userId: string): Promise<SpendQuota> {
  const selection = await selectModelForUser(userId);
  const spentIsKnown = selection.reason !== "usage_unavailable";
  const spentUsd = selection.monthToDateSpendUsd;
  return {
    spentUsd,
    targetUsd: MONTHLY_BUDGET_TARGET_USD,
    ceilingUsd: MONTHLY_BUDGET_CEILING_USD,
    fraction: spentUsd === null ? 0 : Math.min(1, Math.max(0, spentUsd / MONTHLY_BUDGET_TARGET_USD)),
    degraded: selection.degraded,
    spentIsKnown,
    resetsAt: startOfNextUtcMonthIso(),
  };
}
