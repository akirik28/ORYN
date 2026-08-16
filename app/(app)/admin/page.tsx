import { formatDistanceToNow } from "date-fns";
import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { JobTriggerButton } from "@/features/admin/job-trigger-button";
import { ReportReviewControl } from "@/features/admin/report-review-control";
import { triggerOpportunityDiscovery, triggerUniversitySync, triggerDeadlineScan, triggerRequirementDiscovery } from "./actions";

export const metadata = { title: "Admin" };

const STATUS_CLASS: Record<string, string> = {
  healthy: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  succeeded: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  resolved: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  degraded: "border-amber-500/30 text-amber-700 dark:text-amber-400",
  reviewing: "border-amber-500/30 text-amber-700 dark:text-amber-400",
  down: "border-red-500/30 text-red-700 dark:text-red-400",
  failed: "border-red-500/30 text-red-700 dark:text-red-400",
  open: "border-red-500/30 text-red-700 dark:text-red-400",
  running: "border-primary/30 text-primary",
  dismissed: "text-muted-foreground",
  unknown: "text-muted-foreground",
};

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [providersRes, jobsRes, usageRes, reportsRes] = await Promise.all([
    admin.from("provider_health").select("*").order("provider"),
    admin.from("external_sync_jobs").select("*").order("started_at", { ascending: false }).limit(15),
    admin.from("ai_usage").select("feature, input_tokens, output_tokens").order("created_at", { ascending: false }).limit(500),
    admin.from("message_reports").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  const usageByFeature = new Map<string, { calls: number; inputTokens: number; outputTokens: number }>();
  for (const row of usageRes.data ?? []) {
    const entry = usageByFeature.get(row.feature) ?? { calls: 0, inputTokens: 0, outputTokens: 0 };
    entry.calls += 1;
    entry.inputTokens += row.input_tokens;
    entry.outputTokens += row.output_tokens;
    usageByFeature.set(row.feature, entry);
  }

  // Batch-fetch-and-zip (no nested PostgREST embed — message_reports has two FKs to
  // profiles, so an embed would need constraint-name disambiguation; this matches the
  // existing convention in lib/social/connections.ts). Service-role client sees every
  // row regardless of RLS, so this is the one place display names and message bodies for
  // *other people's* content are resolved outside their own request context — scoped
  // tightly to exactly the ids referenced by a report, for the admin moderation queue only.
  const reports = reportsRes.data ?? [];
  const profileIds = Array.from(new Set(reports.flatMap((r) => [r.reporter_id, r.reported_user_id])));
  const messageIds = Array.from(new Set(reports.map((r) => r.message_id).filter((id): id is string => id !== null)));
  const recommendationIds = Array.from(new Set(reports.map((r) => r.recommendation_id).filter((id): id is string => id !== null)));

  const [profilesRes, messagesRes, recommendationsRes] = await Promise.all([
    profileIds.length > 0 ? admin.from("profiles").select("id, display_name").in("id", profileIds) : Promise.resolve({ data: [] }),
    messageIds.length > 0 ? admin.from("messages").select("id, body").in("id", messageIds) : Promise.resolve({ data: [] }),
    recommendationIds.length > 0 ? admin.from("recommendations").select("id, body").in("id", recommendationIds) : Promise.resolve({ data: [] }),
  ]);
  const nameById = new Map((profilesRes.data ?? []).map((p) => [p.id, p.display_name]));
  const messageById = new Map((messagesRes.data ?? []).map((m) => [m.id, m.body]));
  const recommendationById = new Map((recommendationsRes.data ?? []).map((r) => [r.id, r.body]));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Admin</h1>
        <p className="mt-1 text-muted-foreground">Provider health, background jobs, and AI usage. Not linked from navigation.</p>
      </div>

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
                    <span className="font-medium">{nameById.get(report.reporter_id) ?? "A student"}</span>
                    <span className="text-muted-foreground"> reported </span>
                    <span className="font-medium">{nameById.get(report.reported_user_id) ?? "a student"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                    <Badge variant="outline" className={STATUS_CLASS[report.status]}>
                      {report.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-muted-foreground">{report.reason}</p>
                {report.message_id ? (
                  <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">
                    {messageById.get(report.message_id) ?? "(reported message no longer available)"}
                  </p>
                ) : null}
                {report.recommendation_id ? (
                  <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">
                    {recommendationById.get(report.recommendation_id) ?? "(reported recommendation no longer available)"}
                  </p>
                ) : null}
                <ReportReviewControl reportId={report.id} initialStatus={report.status} initialNote={report.resolution_note} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No reports filed yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Provider health</h2>
        </div>
        {providersRes.data && providersRes.data.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {providersRes.data.map((provider) => (
              <li key={provider.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-medium">{provider.provider}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {provider.last_error ? <span className="max-w-xs truncate text-xs">{provider.last_error}</span> : null}
                  <span className="text-xs">
                    {provider.last_success_at ? `Last OK ${formatDistanceToNow(new Date(provider.last_success_at), { addSuffix: true })}` : "Never succeeded"}
                  </span>
                  <Badge variant="outline" className={STATUS_CLASS[provider.status]}>
                    {provider.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No provider calls recorded yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Background jobs</h2>
        <div className="flex flex-wrap gap-2">
          <JobTriggerButton label="Run opportunity discovery" action={triggerOpportunityDiscovery} />
          <JobTriggerButton label="Run university sync" action={triggerUniversitySync} />
          <JobTriggerButton label="Run deadline scan" action={triggerDeadlineScan} />
          <JobTriggerButton label="Run requirement discovery" action={triggerRequirementDiscovery} />
        </div>
        {jobsRes.data && jobsRes.data.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {jobsRes.data.map((job) => (
              <li key={job.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-medium">{job.job_name}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-xs">{job.items_processed} processed</span>
                  <span className="text-xs">{formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}</span>
                  <Badge variant="outline" className={STATUS_CLASS[job.status]}>
                    {job.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No job runs recorded yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">AI usage (last 500 calls)</h2>
        {usageByFeature.size > 0 ? (
          <ul className="divide-y rounded-lg border">
            {[...usageByFeature.entries()].map(([feature, stats]) => (
              <li key={feature} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-medium">{feature}</span>
                <span className="text-xs text-muted-foreground">
                  {stats.calls} calls · {stats.inputTokens.toLocaleString()} in / {stats.outputTokens.toLocaleString()} out tokens
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
        )}
      </section>
    </div>
  );
}
