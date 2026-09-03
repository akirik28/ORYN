import { getTranslations } from "next-intl/server";
import { formatCurrency, formatNumber } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSpendSummary, isModelPricingTableLive, type AiFeatureCategory } from "@/lib/admin/queries";
import { BarChart } from "@/components/oryn/charts/bar-chart";
import { ModelPricingEditor } from "@/features/admin/model-pricing-editor";
import { setModelPricing } from "@/app/(app)/admin/actions";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const CATEGORY_ORDER: AiFeatureCategory[] = ["student_pool", "job_budgeted", "admin_only", "uncategorized"];

/**
 * "Where is the money actually going" (oryn-a7, 2026-09-02) — the shape story getSpendSummary
 * itself couldn't tell before this pass, because byFeature only ever showed features with
 * real rows. Ten known features render here always, six of them typically at $0.00 today —
 * that gap is the actual finding, not a rendering choice to hide.
 */
export async function AiFeatureShapeSection() {
  const t = await getTranslations("admin.aiBudget.featureShape");
  const admin = createAdminClient();
  const [summary, modelPricingLive] = await Promise.all([getSpendSummary(admin), isModelPricingTableLive(admin)]);

  const byCategory = CATEGORY_ORDER.map((category) => ({
    x: t(`category.${category}`),
    y: summary.byFeature.filter((f) => f.category === category).reduce((sum, f) => sum + f.costUsd, 0),
  })).filter((row, i) => row.y > 0 || CATEGORY_ORDER[i] !== "uncategorized"); // an empty uncategorized bucket is expected, not worth a bar; the other three always render even at $0

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>

      <BarChart
        series={{ id: "byCategory", label: t("byCategory"), data: byCategory }}
        a11y={{ title: t("byCategory") }}
        aspectRatio={480 / 220}
      />

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{t("allFeatures")}</p>
        <ul className="divide-y rounded-lg border">
          {summary.byFeature.map((row) => (
            <li key={row.key} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{row.key}</span>{" "}
                <span className="text-xs text-muted-foreground">· {t(`category.${row.category}`)}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {row.calls === 0 ? t("neverCalled") : `${money(row.costUsd)} · ${t("callsCount", { count: formatNumber(row.calls) })}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Never rendered conditionally away at zero (D5) — a rising count here means every
          dollar figure on this page is a floor, not an exact total, so its absence needs to
          be just as visible as its presence. */}
      <div className={`rounded-lg border px-4 py-2.5 text-sm ${summary.unpricedCalls > 0 ? "border-amber-500/30" : ""}`}>
        <p className={`font-medium ${summary.unpricedCalls > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>{t("unpricedTitle")}</p>
        {summary.unpricedCalls > 0 ? (
          <>
            <p className="text-xs text-amber-700 dark:text-amber-400">{t("unpricedAlert", { count: formatNumber(summary.unpricedCalls) })}</p>
            {!modelPricingLive ? <p className="mt-1 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">{t("modelPricingNotSetUp")}</p> : null}
            <ul className="mt-1 space-y-1.5">
              {summary.unpricedByModel.map((row) => (
                <li key={row.model} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{t("unpricedByModel", { model: row.model, count: formatNumber(row.calls) })}</span>
                  <ModelPricingEditor
                    model={row.model}
                    saveAction={setModelPricing}
                    saveLabel={t("savePricing")}
                    inputPlaceholder={t("inputRatePlaceholder")}
                    outputPlaceholder={t("outputRatePlaceholder")}
                    live={modelPricingLive}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t("unpricedNone")}</p>
        )}
      </div>
    </section>
  );
}
