import { getTranslations } from "next-intl/server";
import { formatCurrency, formatNumber } from "@/lib/i18n/format";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPerUserSpend, PER_STUDENT_MONTHLY_TARGET_USD, PER_STUDENT_MONTHLY_CEILING_USD, isQuotaGrantsTableLive } from "@/lib/admin/queries";
import { GrantQuotaEditor } from "@/features/admin/grant-quota-editor";
import { grantQuota, resetQuotaThisMonth } from "@/app/(app)/admin/actions";
import type { PlanTier } from "@/types/database";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const TIERS: PlanTier[] = ["standard", "ultra"];

/**
 * This is the screen version of the query that found a real student at $3.04 in one week
 * against a $1.00/month ceiling — sorted highest-first so an overage is the first thing
 * seen, not something found by scrolling.
 *
 * GrantQuotaEditor (2026-09-02/03) is "the single most likely real support action" oryn-a7's
 * control-panel course correction named: a student who legitimately exhausted their month
 * had no recourse before this. monthToDateSpendUsd (calendar month) is shown alongside the
 * existing last30dUsd/lifetimeUsd figures — deliberately not replacing them — since it's the
 * one number that answers "what would Reset actually zero out right now," which neither of
 * the rolling/lifetime figures does.
 */
export async function SpendPerUserSection() {
  const t = await getTranslations("admin.perUser");
  const admin = createAdminClient();
  const [users, quotaGrantsLive] = await Promise.all([getPerUserSpend(admin), isQuotaGrantsTableLive(admin)]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {TIERS.map((tier) => (
            <span key={tier}>
              {t("subtitle", {
                tier: t(tier === "ultra" ? "tierUltra" : "tierStandard"),
                target: money(PER_STUDENT_MONTHLY_TARGET_USD[tier]),
                ceiling: money(PER_STUDENT_MONTHLY_CEILING_USD[tier]),
              })}
            </span>
          ))}
        </span>
      </div>
      {!quotaGrantsLive ? <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{t("quotaGrantsNotSetUp")}</p> : null}

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {users.map((user) => (
            <li key={user.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="font-medium">{user.displayName ?? t("unnamed")}</span>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                {/* Which ceiling applied to overCeiling/overWarningThreshold below — without
                    this, an Ultra row's badge (checked against the real $2.00 ceiling) reads
                    identically to a Standard row's (checked against $1.00), 2026-09-03. */}
                <span className="text-xs">{t(user.tier === "ultra" ? "tierUltra" : "tierStandard")}</span>
                <span className="text-xs">{t("thisMonth")}: {money(user.monthToDateSpendUsd)}</span>
                <span className="text-xs">{t("last30d")}: {money(user.last30dUsd)}</span>
                <span className="text-xs">{t("lifetime")}: {money(user.lifetimeUsd)}</span>
                <span className="text-xs">{t("calls", { count: formatNumber(user.callCount) })}</span>
                {user.overCeiling ? (
                  <Badge variant="outline" className="border-red-500/30 text-red-700 dark:text-red-400">
                    {t("overCeiling")}
                  </Badge>
                ) : user.overWarningThreshold ? (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
                    {t("nearCeiling")}
                  </Badge>
                ) : null}
              </div>
              <GrantQuotaEditor
                userId={user.userId}
                monthToDateGrantsUsd={user.monthToDateGrantsUsd}
                grantAction={grantQuota}
                resetAction={resetQuotaThisMonth}
                grantLabel={t("grant")}
                resetLabel={t("resetThisMonth")}
                amountPlaceholder={t("amountPlaceholder")}
                grantedNote={t("alreadyGranted", { amount: money(user.monthToDateGrantsUsd) })}
                live={quotaGrantsLive}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
