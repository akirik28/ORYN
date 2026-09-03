import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFinanceSettings, getAdminUserList } from "@/lib/admin/queries";
import { KarZararCalculator } from "@/features/admin/kar-zarar-calculator";
import {
  RECURRING_INFRA_USD,
  SYSTEM_JOB_COSTS_USD,
  WORST_CASE_AI_COST_PER_ACTIVE_USER_USD,
  computeUnitEconomics,
  computeBreakEven,
  COST_DOC_SCALE_SCENARIOS,
} from "@/lib/admin/finance";

/**
 * Profit & loss. The live calculator (features/admin/kar-zarar-calculator.tsx) is a client
 * component mirroring lib/admin/finance.ts's own formulas, fed by the real constants read
 * here. Below it, the published cost doc's own scale table (docs/maliyet-ve-fiyatlandirma-
 * 2026-09-02.md §4/§6) rendered from the same computeUnitEconomics/computeBreakEven this
 * codebase already uses everywhere else that number matters -- reproduced as data, not
 * retyped, so it can never drift from the formula it illustrates.
 */
export default async function ProfitLossPage() {
  const t = await getTranslations("admin.control.profitLoss");
  const admin = createAdminClient();
  const [settings, users] = await Promise.all([getFinanceSettings(admin), getAdminUserList(admin)]);
  const rate = settings.usdTryRate?.rateTryPerUsd ?? null;

  const scaleRows = COST_DOC_SCALE_SCENARIOS.map((scenario) => {
    const economics = computeUnitEconomics(scenario);
    const breakEven = computeBreakEven(scenario, rate, settings.ultraPriceTry);
    return {
      totalUsers: scenario.totalUsers,
      activeRatio: scenario.activeRatio,
      costPerUserUsd: economics.totalCostPerUserUsd,
      requiredPayingUsers: breakEven.available ? breakEven.value.requiredPayingUsers : null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <KarZararCalculator
        worstCaseAiCostPerActiveUserUsd={WORST_CASE_AI_COST_PER_ACTIVE_USER_USD}
        recurringInfraUsd={RECURRING_INFRA_USD}
        systemJobCostsUsd={SYSTEM_JOB_COSTS_USD}
        realUserCount={users.length}
        currentRateTryPerUsd={rate}
        currentPriceTry={settings.ultraPriceTry}
      />

      <div className="admin-panel overflow-x-auto rounded-xl">
        <div className="border-b p-4" style={{ borderColor: "var(--admin-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
            {t("scaleTableTitle")}
          </h2>
          <p className="mt-1 text-xs" style={{ color: "var(--admin-ink-3)" }}>
            {t("scaleTableDescription")}
          </p>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
              <th className="px-4 py-2 font-medium" style={{ color: "var(--admin-ink-3)" }}>
                {t("scaleTableUsers")}
              </th>
              <th className="px-4 py-2 font-medium" style={{ color: "var(--admin-ink-3)" }}>
                {t("scaleTableActiveRatio")}
              </th>
              <th className="px-4 py-2 font-medium" style={{ color: "var(--admin-ink-3)" }}>
                {t("scaleTableCostPerUser")}
              </th>
              <th className="px-4 py-2 font-medium" style={{ color: "var(--admin-ink-3)" }}>
                {t("scaleTableBreakEven")}
              </th>
            </tr>
          </thead>
          <tbody>
            {scaleRows.map((row) => (
              <tr key={`${row.totalUsers}-${row.activeRatio}`} style={{ borderTop: "1px solid var(--admin-border)" }}>
                <td className="px-4 py-2 tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
                  {row.totalUsers.toLocaleString()}
                </td>
                <td className="px-4 py-2 tabular-nums" style={{ color: "var(--admin-ink-2)" }}>
                  {Math.round(row.activeRatio * 100)}%
                </td>
                <td className="px-4 py-2 tabular-nums" style={{ color: "var(--admin-ink-2)" }}>
                  ${row.costPerUserUsd.toFixed(2)}
                </td>
                <td className="px-4 py-2 tabular-nums" style={{ color: "var(--admin-ink-2)" }}>
                  {row.requiredPayingUsers !== null ? row.requiredPayingUsers.toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
