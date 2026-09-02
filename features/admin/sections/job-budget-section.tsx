import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJobBudgetStatus } from "@/lib/admin/queries";
import { BurnChart } from "@/components/oryn/charts/burn-chart";
import { JobBudgetEditor } from "@/features/admin/job-budget-editor";
import { setJobBudgetOverride, clearJobBudgetOverride } from "@/app/(app)/admin/actions";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/**
 * "The chart that tells you a job is about to stop" (oryn-a7, 2026-09-02) — this calendar
 * month's real cumulative spend for each catalog job against its own budget (JOB_BUDGET_USD's
 * default, or a live job_budget_overrides row — see getJobBudgetStatus.isOverridden), plus
 * the live allowed/reason decision checkJobBudget itself would make right now. Both jobs read
 * zero real usage as of this write (ORYN has never been deployed) — an honest empty chart,
 * not a hidden or synthesized one; see getJobBudgetStatus's own doc comment.
 *
 * JobBudgetEditor (2026-09-02/03) is the live-adjust lever oryn-a7's control-panel course
 * correction asked for — raises or lowers the effective budget without a deploy, via
 * setJobBudgetOverride/clearJobBudgetOverride. Pre-filled with today's real effective value
 * (the override if one exists, JOB_BUDGET_USD's own default otherwise) so an admin edits from
 * what's actually in force, not from a stale shipped constant.
 */
export async function JobBudgetSection() {
  const t = await getTranslations("admin.aiBudget.jobBudget");
  const admin = createAdminClient();
  const statuses = await getJobBudgetStatus(admin);

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {statuses.map((status) => (
          <div key={status.feature} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t(status.feature)}</p>
              <span
                className={`text-xs ${status.reason === "over_budget" || status.reason === "unknown_cost_this_month" ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}
              >
                {t(`reason.${status.reason}`)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {status.monthToDateSpendUsd === null ? t("unknown") : t("status", { spent: money(status.monthToDateSpendUsd), budget: money(status.budgetUsd) })}
              {status.isOverridden ? <span className="ml-1">· {t("overridden")}</span> : null}
            </p>
            {status.dailyCumulativeUsd.length > 0 ? (
              <BurnChart actual={status.dailyCumulativeUsd} budget={status.budgetUsd} a11y={{ title: t(status.feature) }} aspectRatio={480 / 220} />
            ) : (
              <p className="text-xs text-muted-foreground">{t("neverRun")}</p>
            )}
            <JobBudgetEditor
              feature={status.feature}
              budgetUsd={status.budgetUsd}
              isOverridden={status.isOverridden}
              saveAction={setJobBudgetOverride}
              resetAction={clearJobBudgetOverride}
              saveLabel={t("save")}
              resetLabel={t("resetToDefault")}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
