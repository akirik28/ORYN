import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReports } from "@/lib/admin/queries";
import { ReportReviewControl } from "@/features/admin/report-review-control";
import { PostRemovalControl } from "@/features/admin/post-removal-control";
import { StatusBadge } from "./status-badge";

export async function ReportsSection() {
  const [t, locale] = await Promise.all([getTranslations("admin.reports"), resolveLocale()]);
  const admin = createAdminClient();
  const reports = await getReports(admin, locale);
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <span className="text-xs text-muted-foreground">{t("openCount", { count: reports.filter((r) => r.status === "open").length })}</span>
      </div>
      {reports.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {reports.map((report) => (
            <li key={report.id} className="space-y-2 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  {t.rich("reportedBy", {
                    reporter: report.reporterName ?? t("unnamedReporter"),
                    reported: report.reportedName ?? t("unnamedReported"),
                    bold: (chunks) => <span className="font-medium">{chunks}</span>,
                  })}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, ...dateFnsLocale })}</span>
                  <StatusBadge status={report.status} locale={locale} />
                </div>
              </div>
              <p className="text-muted-foreground">{report.reason}</p>
              {report.messagePreview ? <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">{report.messagePreview}</p> : null}
              {report.recommendationPreview ? <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">{report.recommendationPreview}</p> : null}
              {report.postId ? (
                <div className="space-y-2">
                  <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">{report.postBody ?? t("postMissing")}</p>
                  {report.postStillExists ? <PostRemovalControl postId={report.postId} isRemoved={report.postIsRemoved} /> : null}
                </div>
              ) : null}
              <ReportReviewControl reportId={report.id} initialStatus={report.status} initialNote={report.resolutionNote} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noReports")}</p>
      )}
    </section>
  );
}
