import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPerUserSpend, PER_STUDENT_MONTHLY_CEILING_USD } from "@/lib/admin/queries";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/**
 * Every student whose last-30-days spend has crossed 80% of the monthly ceiling
 * (BUDGET_WARNING_FRACTION in lib/admin/queries.ts) — the ceiling, not the lower target,
 * since the target is aspirational and the ceiling is where real overage risk starts.
 */
export async function BudgetWarningsSection() {
  const t = await getTranslations("admin.warnings");
  const admin = createAdminClient();
  const users = await getPerUserSpend(admin);
  const flagged = users.filter((u) => u.overWarningThreshold).sort((a, b) => b.last30dUsd - a.last30dUsd);

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      {flagged.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="space-y-2">
          {flagged.map((user) => {
            const percent = Math.round((user.last30dUsd / PER_STUDENT_MONTHLY_CEILING_USD) * 100);
            return (
              <li key={user.userId} className={`rounded-lg border px-4 py-2.5 text-sm ${user.overCeiling ? "border-red-500/30" : "border-amber-500/30"}`}>
                <span className={user.overCeiling ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}>
                  {t("message", { name: user.displayName ?? user.userId, amount: money(user.last30dUsd), percent, ceiling: money(PER_STUDENT_MONTHLY_CEILING_USD) })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
