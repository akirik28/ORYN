import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/i18n/format";
import { getWeeklyPlanBudgetStatus } from "@/lib/admin/queries";
import { WeeklyPlanBudgetForm } from "@/features/admin/weekly-plan-budget-form";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/**
 * The aggregate spend ceiling that must exist and be visible before generate-weekly-plans
 * can be armed on a schedule (migration 0102, lib/ai/limits/weekly-plan-budget.ts) —
 * "surfaced to the admin panel alongside the existing spend cards, not silently" was the
 * proposal's own explicit requirement. Read-only status plus the one editable number, same
 * split as every other section+form pair in this directory.
 */
export async function WeeklyPlanBudgetSection() {
  const t = await getTranslations("admin.weeklyPlanBudget");
  const status = await getWeeklyPlanBudgetStatus();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>
      <p className="text-sm">
        {status.monthToDateSpendUsd !== null ? t("status", { spend: money(status.monthToDateSpendUsd), ceiling: money(status.ceilingUsd) }) : t("spendUnavailable")}
      </p>
      {status.currentlyDegrading ? <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t("degradingNow")}</p> : null}
      <WeeklyPlanBudgetForm currentCeilingUsd={status.ceilingUsd} />
    </section>
  );
}
