import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFinanceSettings, getProductSettings, isFinanceSettingsTableLive, isProductSettingsTableLive } from "@/lib/admin/queries";
import { FinanceSettingsForm } from "@/features/admin/finance-settings-form";
import { SignupsToggle } from "@/features/admin/signups-toggle";
import { MaintenanceModeToggle } from "@/features/admin/maintenance-mode-toggle";
import { TrialPeriodForm } from "@/features/admin/trial-period-form";
import { MONTHLY_BUDGET_TARGET_USD, MONTHLY_BUDGET_CEILING_USD } from "@/lib/ai/limits/budget";
import { MONTHLY_AI_TOKEN_LIMIT } from "@/lib/ai/monthly-quota";

/**
 * Settings. The build plan lists five things here: new signups, maintenance mode, trial
 * period, AI cap, price. Price (admin_finance_settings, migration 0094) and now all three
 * of signups/maintenance/trial period (admin_product_settings, migration 0105) have real
 * mechanisms behind them -- oryn-31 shipped this screen honest about that gap on
 * 2026-09-03 rather than rendering switches that did nothing, and this closes it. AI cap
 * stays read-only from the real enforced constant (accurate today, nothing to configure).
 */
export default async function SettingsPage() {
  const admin = createAdminClient();
  const [t, settings, productSettings, financeLive, productSettingsLive] = await Promise.all([
    getTranslations("admin.control.settings"),
    getFinanceSettings(admin),
    getProductSettings(admin),
    isFinanceSettingsTableLive(admin),
    isProductSettingsTableLive(admin),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="admin-panel rounded-xl p-6">
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
          {t("finance.sectionTitle")}
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--admin-ink-3)" }}>
          {t("finance.sectionDescription")}
        </p>
        {!financeLive ? (
          <p className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{t("finance.notSetUp")}</p>
        ) : null}
        <FinanceSettingsForm currentRate={settings.usdTryRate?.rateTryPerUsd ?? null} currentPriceTry={settings.ultraPriceTry} live={financeLive} />
      </div>

      <div className="admin-panel rounded-xl p-6">
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
          {t("aiCap.sectionTitle")}
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--admin-ink-3)" }}>
          {t("aiCap.sectionDescription")}
        </p>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt style={{ color: "var(--admin-ink-3)" }}>{t("aiCap.degradePoint")}</dt>
            <dd className="text-lg font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
              ${MONTHLY_BUDGET_TARGET_USD.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt style={{ color: "var(--admin-ink-3)" }}>{t("aiCap.hardCeiling")}</dt>
            <dd className="text-lg font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
              ${MONTHLY_BUDGET_CEILING_USD.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt style={{ color: "var(--admin-ink-3)" }}>{t("aiCap.tokenLimit")}</dt>
            <dd className="text-lg font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
              {MONTHLY_AI_TOKEN_LIMIT.toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <div className="admin-panel rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
              {t("signups.sectionTitle")}
            </h2>
            <p className="text-xs" style={{ color: "var(--admin-ink-3)" }}>
              {productSettings.signupsEnabled ? t("signups.statusOpen") : t("signups.statusClosed")}
            </p>
          </div>
          <SignupsToggle enabled={productSettings.signupsEnabled} live={productSettingsLive} />
        </div>
        {!productSettingsLive ? (
          <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{t("productSettingsNotSetUp")}</p>
        ) : null}
      </div>

      <div className="admin-panel rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
              {t("maintenance.sectionTitle")}
            </h2>
            <p className="text-xs" style={{ color: "var(--admin-ink-3)" }}>
              {productSettings.maintenanceMode ? t("maintenance.statusOn") : t("maintenance.statusOff")}
            </p>
          </div>
          <MaintenanceModeToggle active={productSettings.maintenanceMode} live={productSettingsLive} />
        </div>
        {!productSettingsLive ? (
          <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{t("productSettingsNotSetUp")}</p>
        ) : null}
      </div>

      <div className="admin-panel rounded-xl p-6">
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
          {t("trial.sectionTitle")}
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--admin-ink-3)" }}>
          {t("trial.sectionDescription")}
        </p>
        {!productSettingsLive ? (
          <p className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{t("productSettingsNotSetUp")}</p>
        ) : null}
        <TrialPeriodForm currentDays={productSettings.trialPeriodDays} live={productSettingsLive} />
      </div>
    </div>
  );
}
