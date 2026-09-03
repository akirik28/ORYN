import { getTranslations } from "next-intl/server";
import { formatNumber } from "@/lib/i18n/format";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import { resolveLocale } from "@/lib/i18n/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignupTimeline } from "@/lib/admin/queries";
import { BarChart } from "@/components/proxola/charts";

/**
 * Bar chart, not a line — deliberately. Real data checked live 2026-09-02: 11 signups, all
 * inside a single 5-day window, none since. A line chart's implied trend would read as
 * decelerating growth; a bar-per-day count makes no claim beyond what happened that day.
 * The seed-cohort caption uses `daysSinceLastSignup` (computed in the query layer, not
 * here — a .tsx component's render body calling `Date.now()` directly trips this
 * codebase's react-hooks/purity lint rule) and stops rendering the moment real growth
 * resumes, since it's a live >=7-day check, not a hardcoded diagnosis.
 */
export async function GrowthSignupsSection() {
  const [t, locale] = await Promise.all([getTranslations("admin.growth.signups"), resolveLocale()]);
  const admin = createAdminClient();
  const timeline = await getSignupTimeline(admin);

  const daysSinceLast = timeline.daysSinceLastSignup;
  const looksLikeSeedCohort = daysSinceLast !== null && daysSinceLast >= 7;

  const series = {
    id: "signups",
    label: t("chartTitle"),
    data: timeline.byDay.map((d) => ({ x: d.date, y: d.count })),
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <span className="text-xs text-muted-foreground">{t("totalLabel", { count: formatNumber(timeline.total) })}</span>
      </div>
      {timeline.byDay.length > 0 ? (
        <BarChart series={series} a11y={{ title: t("chartTitle"), description: t("chartDescription") }} aspectRatio={480 / 220} />
      ) : null}
      {looksLikeSeedCohort && timeline.firstSignupAt && timeline.lastSignupAt ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
          {t("seedCohortNotice", {
            firstDate: formatAbsoluteDate(new Date(timeline.firstSignupAt), locale),
            lastDate: formatAbsoluteDate(new Date(timeline.lastSignupAt), locale),
            daysSinceLast,
          })}
        </p>
      ) : null}
    </section>
  );
}
