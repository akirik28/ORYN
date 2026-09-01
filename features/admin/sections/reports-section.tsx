import { formatDistanceToNow } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReports } from "@/lib/admin/queries";
import { ReportReviewControl } from "@/features/admin/report-review-control";
import { PostRemovalControl } from "@/features/admin/post-removal-control";
import { REPORTED_POST_MISSING_LABEL } from "@/lib/social/posts-moderation";
import { StatusBadge } from "./status-badge";

export async function ReportsSection() {
  const admin = createAdminClient();
  const reports = await getReports(admin);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Reports</h2>
        <span className="text-xs text-muted-foreground">{reports.filter((r) => r.status === "open").length} open</span>
      </div>
      {reports.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {reports.map((report) => (
            <li key={report.id} className="space-y-2 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{report.reporterName ?? "A student"}</span>
                  <span className="text-muted-foreground"> reported </span>
                  <span className="font-medium">{report.reportedName ?? "a student"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}</span>
                  <StatusBadge status={report.status} />
                </div>
              </div>
              <p className="text-muted-foreground">{report.reason}</p>
              {report.messagePreview ? <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">{report.messagePreview}</p> : null}
              {report.recommendationPreview ? <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">{report.recommendationPreview}</p> : null}
              {report.postId ? (
                <div className="space-y-2">
                  <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">{report.postBody ?? REPORTED_POST_MISSING_LABEL}</p>
                  {report.postStillExists ? <PostRemovalControl postId={report.postId} isRemoved={report.postIsRemoved} /> : null}
                </div>
              ) : null}
              <ReportReviewControl reportId={report.id} initialStatus={report.status} initialNote={report.resolutionNote} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No reports filed yet.</p>
      )}
    </section>
  );
}
