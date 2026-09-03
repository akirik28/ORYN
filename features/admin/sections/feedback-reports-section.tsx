import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeedbackReports, isFeedbackReportsTableLive } from "@/lib/admin/queries";

/**
 * Migration 0113, proposed and not yet applied. Added to the Moderation screen rather than
 * a new top-level `/kumanda/*` route — "keep top-level navigation small" (spec Phase 42)
 * and the founder's own prior complaint about stacking everything on top of each other.
 * ReportsSection above this one is a different concept (flagged user-generated content);
 * this is students reporting problems or leaving feedback about Oryn itself.
 *
 * The proactive-disable warning below (matching ScheduledJobsSection's own
 * `jobControlsNotSetUp` pattern) is deliberately the ADMIN-facing posture — visible and
 * actionable ("migration N needs to be applied") — not the student-facing one, where the
 * same not-yet-live check makes a feature simply not render at all. Same
 * isFeedbackReportsTableLive check, two different UI responses, on purpose.
 */
export async function FeedbackReportsSection() {
  const [t, locale] = await Promise.all([getTranslations("admin.feedbackReports"), resolveLocale()]);
  const admin = createAdminClient();
  const [reports, live] = await Promise.all([getFeedbackReports(admin), isFeedbackReportsTableLive(admin)]);
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        {reports && reports.length > 0 ? (
          <span className="text-xs text-muted-foreground">{t("totalCount", { count: reports.length })}</span>
        ) : null}
      </div>
      {!live ? (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{t("notSetUp")}</p>
      ) : reports && reports.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {reports.map((report) => (
            <li key={report.id} className="space-y-1.5 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{report.displayName ?? t("unnamedStudent")}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{report.path}</span>
                  <span>{t(report.planTier === "ultra" ? "tierUltra" : "tierStandard")}</span>
                  <span>{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, ...dateFnsLocale })}</span>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">{report.message}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noReports")}</p>
      )}
    </section>
  );
}
