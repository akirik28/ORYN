import { formatDistanceToNow } from "date-fns";
import { formatNumber, formatDuration } from "@/lib/i18n/format";
import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { JobTriggerButton } from "@/features/admin/job-trigger-button";
import { ReportReviewControl } from "@/features/admin/report-review-control";
import { PostRemovalControl } from "@/features/admin/post-removal-control";
import { PageHeader } from "@/components/oryn/page-header";
import { resolveReportedContentPreview } from "@/lib/moderation/content-preview";
import { REPORTED_POST_MISSING_LABEL } from "@/lib/social/posts-moderation";
import { JOB_DEFINITIONS } from "@/lib/jobs/schedule";
import { summarizeJobHealth, EMPTY_STREAK_THRESHOLD } from "@/lib/jobs/job-health";
import type { ExternalSyncJob } from "@/types/database";
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
  // Synthetic states from lib/jobs/job-health.ts — not stored on any row, derived by
  // comparing a job's last recorded run against its own expected cadence. Styled with the
  // same visual weight as `down`/`failed`: a job gone silent is not a lesser problem than
  // one that errored loudly, it's the harder-to-notice version of the same problem.
  never_run: "border-red-500/30 text-red-700 dark:text-red-400",
  stale: "border-red-500/30 text-red-700 dark:text-red-400",
  stuck: "border-amber-500/30 text-amber-700 dark:text-amber-400",
};

/** "never_run" -> "never run". Every other status here has no underscore, so this is a
 * no-op for them — one rule instead of a label per status. */
function displayStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();

  // Recent runs are fetched PER known job (not one shared `limit(N)` across every job
  // name) so an infrequently-run job can never be crowded out of view by another job's
  // activity — the exact silent-failure shape this section exists to catch. Uses
  // `external_sync_jobs_job_name_idx on (job_name, started_at desc)` (migration 0013),
  // so this is four cheap indexed lookups, not a table scan. `EMPTY_STREAK_THRESHOLD`
  // rows per job is enough for summarizeJobHealth to detect a run of quietly-empty
  // "successes" — see lib/jobs/job-health.ts.
  const [providersRes, jobRunsByDefinition, usageRes, reportsRes] = await Promise.all([
    admin.from("provider_health").select("*").order("provider"),
    Promise.all(
      JOB_DEFINITIONS.map((def) => admin.from("external_sync_jobs").select("*").eq("job_name", def.jobName).order("started_at", { ascending: false }).limit(EMPTY_STREAK_THRESHOLD))
    ),
    admin.from("ai_usage").select("feature, input_tokens, output_tokens").order("created_at", { ascending: false }).limit(500),
    admin.from("message_reports").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  const jobHealth = JOB_DEFINITIONS.map((def, i) => summarizeJobHealth(def, (jobRunsByDefinition[i].data as ExternalSyncJob[] | null) ?? []));

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
  // `typeof id === "string"` rather than `!== null`: a report row fetched before its
  // migration is applied has the column *missing*, which reads as `undefined`, and
  // `undefined !== null` is true — that would put an undefined into the `.in()` list and
  // produce a malformed query. Cheap guard, and this page now reads three optional
  // reference columns added by three different migrations.
  const messageIds = Array.from(new Set(reports.map((r) => r.message_id).filter((id): id is string => typeof id === "string")));
  const recommendationIds = Array.from(
    new Set(reports.map((r) => r.recommendation_id).filter((id): id is string => typeof id === "string"))
  );
  // Social layer (migration 0058). The feature is switched off and unreachable by
  // students, so this list is always empty today — it is wired now so the report ->
  // queue -> removal loop is a real path rather than a report landing in a table nobody
  // acts on, which is the exact failure migration 0030's header was written about.
  const postIds = Array.from(new Set(reports.map((r) => r.post_id).filter((id): id is string => typeof id === "string")));

  const [profilesRes, messagesRes, recommendationsRes, postsRes] = await Promise.all([
    profileIds.length > 0 ? admin.from("profiles").select("id, display_name").in("id", profileIds) : Promise.resolve({ data: [] }),
    messageIds.length > 0 ? admin.from("messages").select("id, body").in("id", messageIds) : Promise.resolve({ data: [] }),
    recommendationIds.length > 0 ? admin.from("recommendations").select("id, body").in("id", recommendationIds) : Promise.resolve({ data: [] }),
    postIds.length > 0 ? admin.from("posts").select("id, body, removed_at").in("id", postIds) : Promise.resolve({ data: [] }),
  ]);
  const nameById = new Map((profilesRes.data ?? []).map((p) => [p.id, p.display_name]));
  const messageById = new Map((messagesRes.data ?? []).map((m) => [m.id, m.body]));
  const recommendationById = new Map((recommendationsRes.data ?? []).map((r) => [r.id, r.body]));
  // A repost with no commentary has a null body — it is still reportable content (it
  // rebroadcasts the original), so it needs a preview label rather than falling through
  // to the "no longer available" placeholder, which would be a lie.
  const postById = new Map((postsRes.data ?? []).map((p) => [p.id, p.body ?? "(repost with no added comment)"]));
  const removedPostIds = new Set((postsRes.data ?? []).filter((p) => p.removed_at !== null).map((p) => p.id));

  return (
    <div className="space-y-10">
      <PageHeader title="Admin" description="Provider health, scheduled jobs, and AI usage. Not linked from navigation." />

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
                    {resolveReportedContentPreview(report.message_id, messageById, "(reported message no longer available)")}
                  </p>
                ) : null}
                {report.recommendation_id ? (
                  <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">
                    {resolveReportedContentPreview(report.recommendation_id, recommendationById, "(reported recommendation no longer available)")}
                  </p>
                ) : null}
                {report.post_id ? (
                  <div className="space-y-2">
                    <p className="rounded-md bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">
                      {resolveReportedContentPreview(report.post_id, postById, REPORTED_POST_MISSING_LABEL)}
                    </p>
                    {postById.has(report.post_id) ? (
                      <PostRemovalControl postId={report.post_id} isRemoved={removedPostIds.has(report.post_id)} />
                    ) : null}
                  </div>
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
                  {/* last_failure_at was always a real column here — it just wasn't shown.
                      A provider can be `healthy` today while having failed recently (one
                      good call after a run of bad ones resets `status`, not the failure
                      timestamp), so showing only "last OK" hides exactly the recovery-vs-
                      never-had-a-problem distinction someone checking this page wants. */}
                  <span className="text-xs">
                    {provider.last_failure_at ? `Last failure ${formatDistanceToNow(new Date(provider.last_failure_at), { addSuffix: true })}` : "Never failed"}
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
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Scheduled jobs</h2>
          <span className="text-xs text-muted-foreground">One row per job — a job that hasn&apos;t run recently can&apos;t hide behind another job&apos;s activity</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <JobTriggerButton label="Run opportunity discovery" action={triggerOpportunityDiscovery} />
          <JobTriggerButton label="Run university sync" action={triggerUniversitySync} />
          <JobTriggerButton label="Run deadline scan" action={triggerDeadlineScan} />
          <JobTriggerButton label="Run requirement discovery" action={triggerRequirementDiscovery} />
        </div>
        <ul className="divide-y rounded-lg border">
          {jobHealth.map((job) => (
            <li key={job.jobName} className="flex flex-col gap-1.5 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{job.label}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-xs">{job.itemsProcessed !== null ? `${formatNumber(job.itemsProcessed)} processed` : "—"}</span>
                  <span className="text-xs">{job.durationMs !== null ? `ran ${formatDuration(job.durationMs)}` : job.status === "running" || job.status === "stuck" ? "still running" : "—"}</span>
                  <span className="text-xs">{job.lastStartedAt ? formatDistanceToNow(new Date(job.lastStartedAt), { addSuffix: true }) : "never"}</span>
                  <Badge variant="outline" className={STATUS_CLASS[job.status]}>
                    {displayStatus(job.status)}
                  </Badge>
                </div>
              </div>
              {job.error ? <p className="text-xs text-muted-foreground">{job.error}</p> : null}
              {/* A row existing isn't evidence the job did anything — several jobs degrade
                  to a no-op "success" when a provider credential is missing (see
                  docs/environment-variables.md). This is what turns "found nothing new
                  tonight" (normal — expected, even, for a slow-changing source) apart from
                  "hasn't accomplished anything in a week" (worth a human's attention),
                  without either being folded silently into a green "succeeded" badge. */}
              {job.emptyStreak >= EMPTY_STREAK_THRESHOLD ? (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  0 items processed on the last {job.emptyStreak} consecutive runs — succeeding, but not doing anything. Worth checking whether a required credential is missing.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">AI usage (last 500 calls)</h2>
        {usageByFeature.size > 0 ? (
          <ul className="divide-y rounded-lg border">
            {[...usageByFeature.entries()].map(([feature, stats]) => (
              <li key={feature} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-medium">{feature}</span>
                <span className="text-xs text-muted-foreground">
                  {stats.calls} calls · {formatNumber(stats.inputTokens)} in / {formatNumber(stats.outputTokens)} out tokens
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
