import { getTranslations } from "next-intl/server";
import { formatCurrency, formatNumber } from "@/lib/i18n/format";
import type { SpendSummary as SpendSummaryData } from "./spend-data";

/** Cost figures use `maximumFractionDigits: 4`, not the app-wide currency default of 0 — a
 *  single achievement_refinement call can cost $0.006, and rounding that to $0 would hide the
 *  exact thing this card exists to show. `estimated_cost` is stored numeric(10,4), so 4 is the
 *  real precision on file, not an arbitrary choice. */
const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export async function SpendSummaryCard({ summary }: { summary: SpendSummaryData }) {
  const t = await getTranslations("admin.spend");

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("last24h"), value: summary.last24hUsd },
          { label: t("last7d"), value: summary.last7dUsd },
          { label: t("last30d"), value: summary.last30dUsd },
        ].map((period) => (
          <div key={period.label} className="rounded-lg border px-4 py-3">
            <p className="text-xs text-muted-foreground">{period.label}</p>
            <p className="text-lg font-semibold">{money(period.value)}</p>
          </div>
        ))}
      </div>

      {summary.totalCalls === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noUsage")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("byFeature")}</p>
            <ul className="divide-y rounded-lg border">
              {summary.byFeature.map((row) => (
                <li key={row.key} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{row.key}</span>
                  <span className="text-xs text-muted-foreground">
                    {money(row.costUsd)} · {t("callsCount", { count: formatNumber(row.calls) })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("byModel")}</p>
            <ul className="divide-y rounded-lg border">
              {summary.byModel.map((row) => (
                <li key={row.key} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{row.key}</span>
                  <span className="text-xs text-muted-foreground">
                    {money(row.costUsd)} · {t("callsCount", { count: formatNumber(row.calls) })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {summary.unattributedCalls > 0 ? (
        <div className="rounded-lg border border-amber-500/30 px-4 py-2.5 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">{t("unattributed")}</p>
          <p className="text-xs text-muted-foreground">{t("unattributedNote", { count: formatNumber(summary.unattributedCalls), amount: money(summary.unattributedUsd) })}</p>
        </div>
      ) : null}
    </section>
  );
}
