import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFinanceSettings } from "@/lib/admin/queries";
import { FinanceSettingsForm } from "@/features/admin/finance-settings-form";
import { MONTHLY_BUDGET_TARGET_USD, MONTHLY_BUDGET_CEILING_USD } from "@/lib/ai/limits/budget";
import { MONTHLY_AI_TOKEN_LIMIT } from "@/lib/ai/monthly-quota";

/**
 * Settings. The build plan lists five things here: new signups, maintenance mode, trial
 * period, AI cap, price. Only price has a real mechanism behind it today
 * (admin_finance_settings, migration 0094, app/(app)/admin/actions.ts's
 * updateFinanceSettings) -- the other four have no toggle, no column, no code path anywhere
 * in this codebase that reads a "signups enabled"/"maintenance mode"/"trial period" flag.
 *
 * Building four new admin-controllable feature flags (each one a real gate somewhere else
 * in the app, not just a UI control) is a bigger scope than this screen -- it's several
 * small features, not a page. Rather than ship a toggle that doesn't do anything, or invent
 * the gating mechanism unasked, this screen is honest about the gap: AI cap is shown
 * read-only from the real enforced constant (accurate today, nothing to configure), and
 * signups/maintenance/trial period say plainly that no control exists yet. Flagged in the
 * handoff, not silently built or silently skipped.
 */
export default async function SettingsPage() {
  const [t, admin] = await Promise.all([getTranslations("admin.control.settings"), Promise.resolve(createAdminClient())]);
  const settings = await getFinanceSettings(admin);

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
        <FinanceSettingsForm currentRate={settings.usdTryRate?.rateTryPerUsd ?? null} currentPriceTry={settings.ultraPriceTry} />
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

      <div className="admin-panel rounded-xl p-6 text-sm" style={{ color: "var(--admin-ink-2)" }}>
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
          {t("notYetWired.sectionTitle")}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("notYetWired.signups")}</li>
          <li>{t("notYetWired.maintenance")}</li>
          <li>{t("notYetWired.trialPeriod")}</li>
        </ul>
      </div>
    </div>
  );
}
