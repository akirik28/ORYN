import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Wraps a background job body with an external_sync_jobs row (Phase 30) so the admin panel
 * can see run history without digging through platform logs.
 *
 * `errorsEncountered` is required, not optional-with-a-default: a job with no per-item
 * external call that can fail short of the whole run throwing (deadline_reminders,
 * notify_university_changes, detect_stale_data) reports 0 correctly and explicitly; a job
 * that does catch per-item failures internally (discover_opportunities,
 * discover_requirements, generate_weekly_plans, sync_us_universities) has no way to forget
 * to wire the real count through. Before this field existed, `items_processed: 0` meant
 * both "quiet run, nothing new tonight" and "every candidate this run tried threw" —
 * identical numbers for two facts the admin panel's empty-streak detector exists
 * specifically to tell apart, and couldn't.
 */
export async function runWithTracking<T>(
  jobName: string,
  fn: () => Promise<{ itemsProcessed: number; errorsEncountered: number; result: T }>
): Promise<T> {
  const supabase = createAdminClient();
  const { data: job } = await supabase
    .from("external_sync_jobs")
    .insert({ job_name: jobName, status: "running" })
    .select()
    .single();

  try {
    const { itemsProcessed, errorsEncountered, result } = await fn();
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

      const errorsColumnMissing = updateError?.code === "42703" && updateError.message?.includes("errors_encountered");
      if (errorsColumnMissing) {
        console.warn("[jobs] errors_encountered column not yet live (migration 0083 unapplied) — recording status/items_processed only", {
          jobName,
          errorsEncountered,
        });
        await supabase
          .from("external_sync_jobs")
          .update({ status: "succeeded", finished_at: finishedAt, items_processed: itemsProcessed })
          .eq("id", job.id);
      } else if (updateError) {
        console.error("[jobs] failed to record job success", { jobName, error: updateError.message });
      }
    }
    return result;
  } catch (error) {
    if (job) {
      await supabase
        .from("external_sync_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", job.id);
    }
    throw error;
  }
}
