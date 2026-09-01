import { formatDistanceToNow } from "date-fns";
import { formatNumber, formatDuration } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJobHealth } from "@/lib/admin/queries";
import { EMPTY_STREAK_THRESHOLD } from "@/lib/jobs/job-health";
import { JobTriggerButton } from "@/features/admin/job-trigger-button";
import { StatusBadge } from "./status-badge";
import { triggerOpportunityDiscovery, triggerUniversitySync, triggerDeadlineScan, triggerRequirementDiscovery } from "@/app/(app)/admin/actions";

export async function ScheduledJobsSection() {
  const admin = createAdminClient();
  const jobHealth = await getJobHealth(admin);

  return (
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
                <StatusBadge status={job.status} />
              </div>
            </div>
            {job.error ? <p className="text-xs text-muted-foreground">{job.error}</p> : null}
            {/* A row existing isn't evidence the job did anything — several jobs degrade to a
                no-op "success" when a provider credential is missing (see
                docs/environment-variables.md). This is what turns "found nothing new
                tonight" (normal — expected, even, for a slow-changing source) apart from
                "hasn't accomplished anything in a week" (worth a human's attention), without
                either being folded silently into a green "succeeded" badge. */}
            {job.emptyStreak >= EMPTY_STREAK_THRESHOLD ? (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                0 items processed on the last {job.emptyStreak} consecutive runs — succeeding, but not doing anything. Worth checking whether a required credential is missing.
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
