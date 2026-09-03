import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/i18n/config";

/** Shared across every admin section that renders a status pill (Reports, Provider health,
 *  Scheduled jobs) — one map instead of the same colors re-declared per file. */
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
  // Synthetic states from lib/admin/provider-health.ts, added 2026-09-03 for the same
  // reason as the pair above: derived from stored data (no row at all, or a specific
  // last_error marker), not read directly off `provider_status`. Two different colors on
  // purpose, not the muted `unknown` treatment for both: `never_attempted` is calm (nothing
  // has happened yet, no action implied); `not_configured` is its own blue, distinct from
  // both that calm gray and from `degraded`'s amber — actionable (a credential is missing)
  // but not an active failure, which amber would wrongly imply.
  never_attempted: "text-muted-foreground",
  not_configured: "border-blue-500/30 text-blue-700 dark:text-blue-400",
};

/**
 * Every status label this component can render, across all three domains that share it
 * (message report status, provider health, job health). One flat map, matching
 * STATUS_CLASS's own flat shape — a handful of these mean roughly the same thing in
 * different domains ("healthy"/"succeeded"/"resolved" are all "the good state" for their
 * own row), and giving each domain its own map would just be the same six-or-so concepts
 * duplicated three times.
 */
const STATUS_LABELS: Record<string, string> = {
  healthy: "Healthy",
  succeeded: "Succeeded",
  resolved: "Resolved",
  degraded: "Degraded",
  reviewing: "Reviewing",
  down: "Down",
  failed: "Failed",
  open: "Open",
  running: "Running",
  dismissed: "Dismissed",
  unknown: "Unknown",
  never_run: "Never run",
  stale: "Stale",
  stuck: "Stuck",
  never_attempted: "Never attempted",
  not_configured: "Not configured",
};

/**
 * `never_run` and `stale` specifically need care in Turkish: every scheduled job on this
 * panel will show one of these two on first view, because ORYN has never been deployed and
 * Vercel Cron only fires against a production deployment (docs/nothing-scheduled-has-ever-
 * run-2026-09-02.md) — not because anything is broken. "Hiç çalıştırılmadı" (was never
 * triggered, passive) reads as an infrastructure fact rather than "başarısız" (failed)
 * would; "Güncel değil" (not current) for `stale` avoids "bozuk"/"bayat"-style wording that
 * would read as a defect. See scheduled-jobs-section.tsx for the additional explanatory
 * note shown when every job is in one of these two states.
 */
const STATUS_LABELS_TR: Record<string, string> = {
  healthy: "Sağlıklı",
  succeeded: "Başarılı",
  resolved: "Çözüldü",
  degraded: "Sorunlu",
  reviewing: "İnceleniyor",
  down: "Çalışmıyor",
  failed: "Başarısız",
  open: "Açık",
  running: "Çalışıyor",
  dismissed: "Reddedildi",
  unknown: "Bilinmiyor",
  never_run: "Hiç çalıştırılmadı",
  stale: "Güncel değil",
  stuck: "Takıldı",
  never_attempted: "Hiç denenmedi",
  not_configured: "Yapılandırılmadı",
};

export function statusLabel(status: string, locale: Locale): string {
  const map = locale === "tr" ? STATUS_LABELS_TR : STATUS_LABELS;
  return map[status] ?? status;
}

export function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {statusLabel(status, locale)}
    </Badge>
  );
}
