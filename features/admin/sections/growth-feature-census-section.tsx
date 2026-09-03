import { getTranslations } from "next-intl/server";
import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { resolveLocale } from "@/lib/i18n/locale";
import { formatNumber } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureCensus, isDeadFeatureFlagsTableLive } from "@/lib/admin/queries";
import { GrowthFeatureDeadControl } from "./growth-feature-dead-control";

/**
 * Every known event name, including the ones that have never fired — not just the ones
 * with a positive count (getProductActivity's own eventCounts only lists names present in
 * the data). Splits "product" from "safety_net" categories rather than one flat unused
 * list: BELOW_MINIMUM_AGE_EVENT_NAMES existing at zero is the safety net working correctly,
 * not evidence of a dead feature — conflating the two would point someone at deleting a
 * guard (docs/admin-growth-panel-2026-09-02.md §3).
 */
export async function GrowthFeatureCensusSection() {
  const [t, locale] = await Promise.all([getTranslations("admin.growth.featureCensus"), resolveLocale()]);
  const admin = createAdminClient();
  const [census, deadFlagsLive] = await Promise.all([getFeatureCensus(admin), isDeadFeatureFlagsTableLive(admin)]);
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      {!deadFlagsLive ? <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{t("deadFlagsNotSetUp")}</p> : null}
      {census.unknownEventNames.length > 0 ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          {t("unknownWarning", { count: census.unknownEventNames.length })}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">{t("eventColumn")}</th>
              <th className="px-4 py-2 font-medium">{t("categoryColumn")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("countColumn")}</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {census.rows.map((row) => (
              <tr key={row.eventName}>
                <td className="px-4 py-2.5 font-mono text-xs">{row.eventName}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.category === "safety_net" ? t("categorySafetyNet") : t("categoryProduct")}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(row.count)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    {row.deadFlag ? (
                      <span className="rounded-full border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-[0.6875rem] font-medium text-destructive">
                        {t("deadBadge")} · {t("markedBy", { time: formatDistanceToNow(new Date(row.deadFlag.markedAt), { addSuffix: true, ...dateFnsLocale }) })}
                      </span>
                    ) : null}
                    <GrowthFeatureDeadControl eventName={row.eventName} isDead={row.deadFlag !== null} live={deadFlagsLive} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
