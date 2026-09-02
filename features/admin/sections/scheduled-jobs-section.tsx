import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { formatNumber, formatDuration } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJobHealth } from "@/lib/admin/queries";
import { EMPTY_STREAK_THRESHOLD } from "@/lib/jobs/job-health";
import { JobTriggerButton } from "@/features/admin/job-trigger-button";
import { StatusBadge } from "./status-badge";
import { triggerOpportunityDiscovery, triggerUniversitySync, triggerDeadlineScan, triggerRequirementDiscovery } from "@/app/(app)/admin/actions";
import type { Locale } from "@/lib/i18n/config";

/** Keyed by the stable `jobName` identifier (never the display label) — the same
 *  key-vs-label split used throughout this codebase's i18n work, so translating a label can
 *  never accidentally repoint which job a row means. */
const JOB_LABELS_TR: Record<string, string> = {
  discover_opportunities: "Fırsat taraması",
  discover_requirements: "Gereksinim taraması",
  sync_us_universities: "Üniversite senkronizasyonu",
  deadline_reminders: "Son tarih hatırlatmaları",
};

function jobLabel(jobName: string, fallback: string, locale: Locale): string {
  return locale === "tr" ? (JOB_LABELS_TR[jobName] ?? fallback) : fallback;
}

export async function ScheduledJobsSection() {
  const [t, locale] = await Promise.all([getTranslations("admin.jobs"), resolveLocale()]);
  const admin = createAdminClient();
  const jobHealth = await getJobHealth(admin);
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;
  // Every job here is either never_run or stale today — ORYN has never been deployed, and
  // Vercel Cron only fires against a live deployment (docs/nothing-scheduled-has-ever-run-
  // 2026-09-02.md), not because anything failed. Surfaced as its own note rather than left
  // for four individually-alarming-looking badges to somehow convey on their own — this is
  // the sentence oryn-a7 specifically asked to get right.
  const allNeverRunOrStale = jobHealth.length > 0 && jobHealth.every((j) => j.status === "never_run" || j.status === "stale");

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <span className="text-xs text-muted-foreground">{t("subtitle")}</span>
      </div>
      {allNeverRunOrStale ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">{t("notDeployedNote")}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <JobTriggerButton label={t("triggerOpportunityDiscovery")} action={triggerOpportunityDiscovery} />
        <JobTriggerButton label={t("triggerUniversitySync")} action={triggerUniversitySync} />
        <JobTriggerButton label={t("triggerDeadlineScan")} action={triggerDeadlineScan} />
        <JobTriggerButton label={t("triggerRequirementDiscovery")} action={triggerRequirementDiscovery} />
      </div>
      <ul className="divide-y rounded-lg border">
        {jobHealth.map((job) => (
          <li key={job.jobName} className="flex flex-col gap-1.5 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{jobLabel(job.jobName, job.label, locale)}</span>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="text-xs">{job.itemsProcessed !== null ? t("itemsProcessed", { count: formatNumber(job.itemsProcessed) }) : "—"}</span>
                <span className="text-xs">{job.durationMs !== null ? t("ranDuration", { duration: formatDuration(job.durationMs) }) : job.status === "running" || job.status === "stuck" ? t("stillRunning") : "—"}</span>
                <span className="text-xs">{job.lastStartedAt ? formatDistanceToNow(new Date(job.lastStartedAt), { addSuffix: true, ...dateFnsLocale }) : t("never")}</span>
                <StatusBadge status={job.status} locale={locale} />
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
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{t("emptyStreakWarning", { count: job.emptyStreak })}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
