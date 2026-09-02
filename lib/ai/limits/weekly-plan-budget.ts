import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isUndefinedTableError } from "@/lib/supabase/errors";
import { selectModelForUser, DEGRADE_MODEL, type ModelSelection } from "./budget";

/**
 * The aggregate monthly spend ceiling for `weekly_plan` (Phase 30 Job D / Phase 9) —
 * migration 0102, the prerequisite oryn-a7 and oryn-f5 agreed must exist before
 * generate-weekly-plans can be armed on a schedule (docs/job-scheduling-decision-2026-09-02.md
 * §4, docs/weekly-plan-aggregate-budget-2026-09-02.md).
 *
 * A GENUINELY THIRD MECHANISM, not an extension of either existing budget file — f5's own
 * framing. `job-budget.ts` answers "how much may this ONE FEATURE spend," built specifically
 * for `selectModelForUser(null)` callers with no student to attribute spend to, and its
 * policy is STOP (nothing is "hit" by a background job waiting until tomorrow). `budget.ts`
 * answers "how much may ONE STUDENT spend," every month, and its policy is DEGRADE (a real,
 * felt harm if a student hits a wall mid-use). `weekly_plan` calls carry a real `userId` (so
 * job-budget.ts's no-harm justification for STOP doesn't transfer) but the question that
 * matters here is neither feature's own: "how much may this feature spend SUMMED ACROSS
 * EVERY STUDENT this month" — the one job whose cost scales with signups rather than with
 * any single person's own usage. Kept in its own file rather than a branch inside either
 * existing one, so those two stay exactly what their own headers say they are.
 *
 * DEGRADE, never stop — same policy as budget.ts, for the same reason: every student still
 * gets a plan this way. A hard stop (job-budget.ts's own shape) would create a real fairness
 * problem `generateWeeklyPlansForActiveStudents` doesn't protect against on its own — it has
 * no `.order()` clause, so a per-run cap would always skip whichever students happen to be
 * last in query order, every week, until headcount growth stops.
 */

/** Fixed, known id for the one row `weekly_plan_budget_settings` (migration 0102) ever
 *  holds — same singleton convention as `ADMIN_FINANCE_SETTINGS_ID`
 *  (lib/admin/queries.ts), a *different* fixed id since these are two separate singleton
 *  tables, not two rows in one. */
export const WEEKLY_PLAN_BUDGET_SETTINGS_ID = "00000000-0000-0000-0000-000000000002";

/** A documented placeholder pending the founder's own review, not a measured or specified
 *  figure the way budget.ts's $0.50/$1.00 are — see migration 0102's own header for the
 *  real measured cost this leaves headroom above. Used both as the settings row's own
 *  column default and as this module's in-code fallback when the row (or the table itself)
 *  doesn't exist yet — the two must actually match, so it's defined once, here, and the
 *  migration's `default` is a literal copy of this value, not a second source of truth. */
export const DEFAULT_WEEKLY_PLAN_MONTHLY_CEILING_USD = 10.0;

function currentUtcMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Admin client passed in rather than created here — both `getWeeklyPlanBudgetCeiling` and
 *  `checkWeeklyPlanAggregateBudget` need one, and the hot path (every weekly_plan call)
 *  should create exactly one client, not two. */
async function getWeeklyPlanBudgetCeiling(admin: NonNullable<ReturnType<typeof tryCreateAdminClient>>): Promise<number> {
  const { data, error } = await admin.from("weekly_plan_budget_settings").select("monthly_ceiling_usd").eq("id", WEEKLY_PLAN_BUDGET_SETTINGS_ID).maybeSingle();
  if (error) {
    if (!isUndefinedTableError(error, "weekly_plan_budget_settings")) {
      console.error("[weekly-plan-budget] failed to read settings — using the default ceiling", error);
    }
    return DEFAULT_WEEKLY_PLAN_MONTHLY_CEILING_USD;
  }
  return data?.monthly_ceiling_usd ?? DEFAULT_WEEKLY_PLAN_MONTHLY_CEILING_USD;
}

export interface WeeklyPlanAggregateBudgetCheck {
  shouldDegrade: boolean;
  /** Null only when spend couldn't be determined — never a fabricated 0, matching
   *  budget.ts's/job-budget.ts's identical "absent is not zero" rule. */
  monthToDateSpendUsd: number | null;
  ceilingUsd: number;
}

/**
 * Reads this calendar month's total `weekly_plan` spend across every student and decides
 * whether the aggregate ceiling has been crossed. Checked fresh on every call, same
 * reasoning as budget.ts's own selectModelForUser: caching risks the exact silent-staleness
 * failure mode that already produced one real incident this codebase has on record (the
 * $3.04/week per-student case) — an unnoticed stale "under ceiling" read here would be the
 * fleet-wide version of the same mistake.
 */
export async function checkWeeklyPlanAggregateBudget(): Promise<WeeklyPlanAggregateBudgetCheck> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[weekly-plan-budget] SUPABASE_SECRET_KEY not configured — skipping the aggregate check, not degrading");
    return { shouldDegrade: false, monthToDateSpendUsd: null, ceilingUsd: DEFAULT_WEEKLY_PLAN_MONTHLY_CEILING_USD };
  }

  const ceilingUsd = await getWeeklyPlanBudgetCeiling(admin);

  const { data, error } = await admin.from("ai_usage").select("estimated_cost").eq("feature", "weekly_plan").gte("created_at", currentUtcMonthStartIso());
  if (error || !data) {
    console.error("[weekly-plan-budget] failed to read ai_usage for the aggregate check — not degrading", error);
    return { shouldDegrade: false, monthToDateSpendUsd: null, ceilingUsd };
  }

  // Same "an unpriced row means true spend is unknown, not zero" reasoning as budget.ts's
  // and job-budget.ts's identical checks — degrade defensively rather than under-count.
  const hasUnknownCostRows = data.some((row) => row.estimated_cost === null);
  const knownSpendUsd = data.reduce((sum, row) => sum + (row.estimated_cost ?? 0), 0);

  if (hasUnknownCostRows) {
    return { shouldDegrade: true, monthToDateSpendUsd: knownSpendUsd, ceilingUsd };
  }
  return { shouldDegrade: knownSpendUsd >= ceilingUsd, monthToDateSpendUsd: knownSpendUsd, ceilingUsd };
}

/**
 * The `withUsageLogging` `selectModel` override for `weekly_plan` specifically
 * (lib/ai/weekly-plan.ts's own call site) — layers the aggregate check ON TOP of the
 * existing per-student check, never in place of it. If the student is already degraded for
 * their own reason (`selectModelForUser`'s own `at_or_over_target`/`unknown_cost_this_month`),
 * that stands unchanged — already the cheaper model, and there is no reason to also pay for
 * the aggregate check's own DB read when it cannot change the outcome.
 */
export async function selectModelForWeeklyPlan(userId: string | null): Promise<ModelSelection> {
  const perStudent = await selectModelForUser(userId);
  if (perStudent.degraded) return perStudent;

  const aggregate = await checkWeeklyPlanAggregateBudget();
  if (aggregate.shouldDegrade) {
    return { model: DEGRADE_MODEL, degraded: true, reason: "aggregate_feature_budget", monthToDateSpendUsd: perStudent.monthToDateSpendUsd };
  }
  return perStudent;
}
