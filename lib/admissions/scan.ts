import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAdmissionOutlook } from "./persist";

const DEFAULT_PAGE_SIZE = 500;

/**
 * Weekly backstop for the same staleness `lib/universities/queries.ts`'s
 * `getTargetUniversitiesWithDetails` already closes at read time (see
 * docs/handoffs/admission-outlook-refresh-2026-09-01.md for why both exist rather than one
 * or the other). That fix only reaches a student who visits the dashboard or the Saved
 * list; a student who saved universities early and never comes back to either surface would
 * otherwise carry a stale outlook indefinitely. This job is that backstop, not the primary
 * mechanism — most rows it touches on a given run will already have been refreshed by a
 * page load in the interim, and finding zero stale rows on a run is success, not a sign the
 * job did nothing.
 *
 * Uses the admin client throughout — a scheduled job has no user session/cookies for RLS,
 * the same reason every other job in lib/jobs/ does the same (see lib/deadlines/scan.ts).
 * `refreshAdmissionOutlook`'s own honesty gate still applies unchanged: a profile the gate
 * would refuse stays refused here too, this job does not (and structurally cannot, short of
 * reimplementing the gate) grant itself a bypass.
 *
 * `pageSize` defaults to 500 and exists so a test can prove real pagination without
 * constructing hundreds of rows to reach the production default.
 */
export async function scanStaleOutlooks(pageSize = DEFAULT_PAGE_SIZE): Promise<{ checked: number; refreshed: number; refused: number; failed: number }> {
  const supabase = createAdminClient();

  let checked = 0;
  let refreshed = 0;
  let refused = 0;
  let failed = 0;
  let offset = 0;

  for (;;) {
    const { data: targets, error } = await supabase
      .from("target_universities")
      .select("id, user_id, outlook_calculated_at")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`scanStaleOutlooks: failed to page target_universities: ${error.message}`);
    if (!targets || targets.length === 0) break;

    const userIds = [...new Set(targets.map((t) => t.user_id))];
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, updated_at").in("id", userIds);
    if (profilesError) throw new Error(`scanStaleOutlooks: failed to load profiles for staleness check: ${profilesError.message}`);
    const profileUpdatedAtById = new Map((profiles ?? []).map((p) => [p.id, new Date(p.updated_at).getTime()]));

    const stale = targets.filter((t) => {
      const profileUpdatedAt = profileUpdatedAtById.get(t.user_id);
      if (profileUpdatedAt === undefined) return false; // Orphaned row, nothing to compare against — skip rather than guess.
      return !t.outlook_calculated_at || new Date(t.outlook_calculated_at).getTime() < profileUpdatedAt;
    });

    checked += targets.length;

    for (const target of stale) {
      try {
        const result = await refreshAdmissionOutlook(target.id, target.user_id, undefined, supabase);
        if (result) refreshed++;
        else refused++;
      } catch (err) {
        // One row's failure must not sink the run for every other student's row behind it
        // in this page — logged individually so `failed > 0` in the job's own tracked
        // result is visible without needing to grep server logs for it.
        failed++;
        console.error(`[admission-outlook-scan] refresh failed for target_universities.id=${target.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (targets.length < pageSize) break;
    offset += pageSize;
  }

  return { checked, refreshed, refused, failed };
}
