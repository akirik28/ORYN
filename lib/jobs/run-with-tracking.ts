import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isUndefinedColumnError } from "@/lib/supabase/errors";

/**
 * Wraps a background job body with an external_sync_jobs row (Phase 30) so the admin panel
 * can see run history without digging through platform logs.
 *
 * `errorsEncountered` is required, not optional-with-a-default: a job with no per-item
 * call that can fail short of the whole run throwing (detect_stale_data) reports 0 correctly
 * and explicitly; a job that does catch per-item failures internally (discover_opportunities,
 * discover_requirements, generate_weekly_plans, sync_us_universities) has no way to forget
 * to wire the real count through. Before this field existed, `items_processed: 0` meant
 * both "quiet run, nothing new tonight" and "every candidate this run tried threw" —
 * identical numbers for two facts the admin panel's empty-streak detector exists
 * specifically to tell apart, and couldn't.
 *
 * `deadline_reminders` and `notify_university_changes` used to be listed here too, on the
 * reasoning that neither has a per-item call that can fail short of the whole run throwing.
 * That was wrong (2026-09-05 fix): both write a notification per student via
 * createNotification, which DOES have a per-item failure mode (a genuine insert error) that
 * neither job counted — it collapsed into the same hardcoded `errorsEncountered: 0` as a
 * student's own muted-category preference, meaning a real write failure silently reported as
 * zero errors. See lib/notifications/create.ts's NotificationSendOutcome and each job's own
 * scan function for the fix; both now correctly wire a real `failed` count through here.
 *
 * `fn` now receives the tracking row's own id (or null when the insert above failed) —
 * 2026-09-03, for lib/opportunities/reverification/'s run-level linkage
 * (opportunity_verification_runs.run_id, design doc §8.2). Additive and backward
 * compatible: every existing caller's `fn` is declared with zero parameters
 * (`async () => {...}`), and TypeScript does not require a callback to accept every
 * parameter its declared type offers — the extra argument is simply never bound. No other
 * caller needed to change for this.
 */
export async function runWithTracking<T>(
  jobName: string,
  fn: (jobId: string | null) => Promise<{ itemsProcessed: number; errorsEncountered: number; result: T }>
): Promise<T> {
  const supabase = createAdminClient();
  const { data: job, error: insertError } = await supabase
    .from("external_sync_jobs")
    .insert({ job_name: jobName, status: "running" })
    .select()
    .single();
  if (insertError) {
    // Not thrown — same "a tracking write failing must never fail the job it's tracking"
    // rule the rest of this function already follows. `job` stays null, and every branch
    // below already guards on it, so the run proceeds untracked rather than blocked.
    console.error("[jobs] failed to create tracking row — run proceeds untracked", { jobName, error: insertError.message });
  }

  try {
    const { itemsProcessed, errorsEncountered, result } = await fn(job?.id ?? null);
    if (job) {
      const finishedAt = new Date().toISOString();
      // errors_encountered (migration 0083) is written but not applied — standing
      // discipline in this repo is "write migrations, leave them unapplied," which makes
      // unapplied the normal state here, not a temporary gap to code around once.
      // Postgres validates an UPDATE's SET clause before it ever looks at WHERE, so naming
      // a column that doesn't exist yet throws on every call regardless of what would have
      // matched — the exact shape lib/plan/persist.ts already carries at its own call site
      // for weekly_actions.carried_forward (migration 0077), the same day a version of
      // this mistake without the guard took weekly-plan generation down for hours. Attempt
      // the real write first; only fall back to the reduced one on the specific
      // column-missing error, and only log (never throw) either way — a tracking write
      // failing must never fail the job it's tracking.
      const { error: updateError } = await supabase
        .from("external_sync_jobs")
        .update({ status: "succeeded", finished_at: finishedAt, items_processed: itemsProcessed, errors_encountered: errorsEncountered })
        .eq("id", job.id);

      // Shared check — a write's missing-column error is not plain 42703; see lib/supabase/errors.ts.
      const errorsColumnMissing = isUndefinedColumnError(updateError, "errors_encountered");
      if (errorsColumnMissing) {
        console.warn("[jobs] errors_encountered column not yet live (migration 0083 unapplied) — recording status/items_processed only", {
          jobName,
          errorsEncountered,
        });
        const { error: retryError } = await supabase
          .from("external_sync_jobs")
          .update({ status: "succeeded", finished_at: finishedAt, items_processed: itemsProcessed })
          .eq("id", job.id);
        if (retryError) console.error("[jobs] failed to record job success on retry", { jobName, error: retryError.message });
      } else if (updateError) {
        console.error("[jobs] failed to record job success", { jobName, error: updateError.message });
      }
    }
    return result;
  } catch (error) {
    if (job) {
      // Logged, never thrown from here -- the original `error` below is what this
      // function must surface either way, and a failure recording that failure must not
      // replace or swallow it.
      const { error: failureRecordError } = await supabase
        .from("external_sync_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", job.id);
      if (failureRecordError) console.error("[jobs] failed to record job failure", { jobName, error: failureRecordError.message });
    }
    throw error;
  }
}
