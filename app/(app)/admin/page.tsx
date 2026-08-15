import { formatDistanceToNow } from "date-fns";
import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { JobTriggerButton } from "@/features/admin/job-trigger-button";
import { triggerOpportunityDiscovery, triggerUniversitySync, triggerDeadlineScan } from "./actions";

export const metadata = { title: "Admin" };

const STATUS_CLASS: Record<string, string> = {
  healthy: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  succeeded: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  degraded: "border-amber-500/30 text-amber-700 dark:text-amber-400",
  down: "border-red-500/30 text-red-700 dark:text-red-400",
  failed: "border-red-500/30 text-red-700 dark:text-red-400",
  running: "border-primary/30 text-primary",
  unknown: "text-muted-foreground",
};

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [providersRes, jobsRes, usageRes] = await Promise.all([
    admin.from("provider_health").select("*").order("provider"),
    admin.from("external_sync_jobs").select("*").order("started_at", { ascending: false }).limit(15),
    admin.from("ai_usage").select("feature, input_tokens, output_tokens").order("created_at", { ascending: false }).limit(500),
  ]);

  const usageByFeature = new Map<string, { calls: number; inputTokens: number; outputTokens: number }>();
  for (const row of usageRes.data ?? []) {
    const entry = usageByFeature.get(row.feature) ?? { calls: 0, inputTokens: 0, outputTokens: 0 };
    entry.calls += 1;
    entry.inputTokens += row.input_tokens;
    entry.outputTokens += row.output_tokens;
    usageByFeature.set(row.feature, entry);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Admin</h1>
        <p className="mt-1 text-muted-foreground">Provider health, background jobs, and AI usage. Not linked from navigation.</p>
      </div>

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
