import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * The "disable future runs" half of the admin panel's job controls (migration 0095) — read
 * side. Used by two genuinely different callers: the admin panel's manual trigger actions
 * (app/(app)/admin/actions.ts) and the real /api/jobs/* cron routes, both of which must
 * check this before starting real work. Lives in lib/jobs/, not lib/admin/queries.ts,
 * because the cron routes are not an admin-panel read even though the panel is what writes
 * this table.
 *
 * Fail-open by design: a missing row — including "this table doesn't exist yet on this
 * database," the standing unapplied-migration state every new table in this project passes
 * through before the founder applies it — means NOT disabled, so this new safety feature
 * can only ever ADD a guard, never silently stop every job the moment this code merges
 * ahead of its own migration. Matches the `?? default` convention
 * lib/deadlines/scan.ts's filterAlreadyNotified already uses for its own new-table
 * migrations (0075/0078): a select against a table PostgREST doesn't know about returns no
 * data and no thrown error here, so `data?.disabled ?? false` degrades correctly with no
 * bespoke table-missing detector needed — unlike `isUndefinedColumnError`, which exists
 * specifically for a column missing on a table that does exist.
 */
export async function isJobDisabled(admin: SupabaseClient<Database>, jobName: string): Promise<boolean> {
  const { data } = await admin.from("job_controls").select("disabled").eq("job_name", jobName).maybeSingle();
  return data?.disabled ?? false;
}

/** Every known job's current disabled state, for the admin panel's toggle row — a job with
 *  no row at all is not disabled, same fail-open reasoning as `isJobDisabled`. */
export async function getJobControls(admin: SupabaseClient<Database>): Promise<Map<string, boolean>> {
  const { data } = await admin.from("job_controls").select("job_name, disabled");
  return new Map((data ?? []).map((row) => [row.job_name, row.disabled]));
}

/**
 * The write side — deliberately NOT fail-open the way the read side is. oryn-a7's own
 * constraint on this whole package: "every action reports its real outcome." A toggle that
 * silently no-ops when the table doesn't exist yet, while the UI still shows success, would
 * be exactly the "says done without proving it" trap this feature exists to avoid elsewhere
 * — the caller must see a real error if the write didn't actually land.
 *
 * Clears `disabled_at`/`disabled_by` on re-enable rather than leaving the last-disabled
 * record behind — once a job is active again, "disabled by X at Y" is a stale fact, not a
 * current one, and showing it would misrepresent the row's present state.
 */
export async function setJobDisabled(
  admin: SupabaseClient<Database>,
  jobName: string,
  disabled: boolean,
  actingAdminId: string
): Promise<{ error?: string }> {
  const { error } = await admin
    .from("job_controls")
    .upsert(
      { job_name: jobName, disabled, disabled_at: disabled ? new Date().toISOString() : null, disabled_by: disabled ? actingAdminId : null },
      { onConflict: "job_name" }
    );
  if (error) {
    console.error("[job-controls] failed to update", { jobName, disabled, error: error.message });
    return { error: "Couldn't save that. Please try again." };
  }
  return {};
}
