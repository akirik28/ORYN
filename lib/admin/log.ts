import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/types/database";

/**
 * The one write path for migration 0097's admin_action_log — every operational admin
 * action (set_plan_tier first, trial/allowance/opportunity/job actions to follow) calls
 * this after its own mutation succeeds, rather than inserting the row itself. One place
 * means the row shape can't drift between actions, and a future action gets logging for
 * free instead of re-deriving admin_label/target_label snapshotting each time.
 *
 * Called AFTER the real mutation, never before or wrapped around it: a log entry for an
 * action that didn't actually happen would be worse than no entry at all. A failure here
 * is logged loudly but never thrown — the mutation it describes already committed, so
 * surfacing this as a user-facing error would misreport a real success as a failure.
 *
 * FAILS OPEN, DELIBERATELY — do not "fix" this to match applyContaminationCleanup's
 * (app/(app)/admin/actions.ts) opposite choice; they are both correct for what each
 * protects. This table's own actions are label/state changes (set_plan_tier and similar) —
 * losing one log entry means an admin can't see it in the timeline later, which is a real
 * but recoverable cost. `admin_actions`' cleanup action is an irreversible rewrite of
 * student-facing text with no other record of the old value anywhere; failing open there
 * would let a real, unrecorded content change through with nothing pointing back to it.
 * Same "audit trail matters" instinct, two different stakes, two different correct answers
 * — see that function's own comment for the mirror of this one.
 */
export async function logAdminAction(
  admin: SupabaseClient<Database>,
  params: {
    adminProfile: Profile;
    action: string;
    targetUserId?: string;
    /** Snapshot at time of action — survives the target profile later being deleted. Pass
     * explicitly rather than re-deriving inside this function, since the caller usually
     * already has the row loaded from its own read. */
    targetLabel?: string | null;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await admin.from("admin_action_log").insert({
    admin_id: params.adminProfile.id,
    admin_label: params.adminProfile.display_name ?? params.adminProfile.id,
    action: params.action,
    target_user_id: params.targetUserId ?? null,
    target_label: params.targetLabel ?? null,
    detail: params.detail ?? {},
  });
  if (error) {
    console.error("[admin] failed to write admin_action_log entry — the action itself still succeeded", {
      action: params.action,
      targetUserId: params.targetUserId,
      error,
    });
  }
}
