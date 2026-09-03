"use server";

import { requireUser } from "@/lib/security/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/analytics/log";
import { isUndefinedTableError } from "@/lib/supabase/errors";

/**
 * The G9 "either can pay" surface, parent side — mirrors registerUltraInterestAction
 * (app/(app)/settings/actions.ts) exactly: same honest "interest, not a checkout" pattern (no
 * payments integration exists), same event name, so "how many total interest signals exist"
 * stays one queryable taxonomy rather than forking into a parent-only fork of it. The only
 * differences are the authorization check (an active link, checked here, not assumed) and the
 * metadata naming which student this is about.
 *
 * Kept in lib/, not under app/(parent)/ — no `/parent` route exists yet (P2/P3 haven't landed
 * as of this file's writing), and this action doesn't need one to be correct: whichever page
 * eventually mounts a parent plan surface imports this directly. `"use server"` at the file's
 * top makes every export here a Server Action regardless of where it's called from.
 *
 * Authorization degrades to REJECT, not to "standard" the way tier lookup does — deliberately
 * the opposite default from fetchParentEffectiveTier. A tier lookup with no safe answer should
 * fall back to the least-privileged tier; an authorization check with no safe answer must
 * refuse the action outright. Treating "parent_links doesn't exist yet" as "let it through"
 * would mean this action does nothing useful before migration 0116 lands anyway (there is no
 * real link to be active), and treating it as "deny" costs nothing since there's no page that
 * can reach this yet to be broken by the refusal.
 */
export async function registerUltraInterestAsParentAction(studentUserId: string): Promise<void> {
  const session = await requireUser();
  const admin = createAdminClient();

  const { data: link, error } = await admin
    .from("parent_links")
    .select("status")
    .eq("parent_user_id", session.userId!)
    .eq("student_user_id", studentUserId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    if (isUndefinedTableError(error, "parent_links")) {
      throw new Error("Parent accounts are not available yet.");
    }
    console.error("[parent-interest-action] failed to verify link", { error: error.message });
    throw new Error("Could not verify parent access right now.");
  }
  if (!link) {
    // Not a UI a parent without an active link should ever reach, but never trust that alone
    // (§K2 — enforced here, not assumed from what the caller's own page happened to show).
    throw new Error("No active link to this student.");
  }

  await logEvent(session.userId!, "ultra_interest_registered", { registered_by: "parent", student_user_id: studentUserId });
}
