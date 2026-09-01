import { Badge } from "@/components/ui/badge";

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
};

/** "never_run" -> "never run". Every other status here has no underscore, so this is a
 *  no-op for them — one rule instead of a label per status. */
function displayStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {displayStatus(status)}
    </Badge>
  );
}
