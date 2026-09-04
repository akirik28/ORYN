"use server";

import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { computeSoftDismissUntil, computeNotNowUpdate } from "@/lib/parent/email-prompt";

/**
 * Dismissal Server Actions for the dashboard's "add your parent's email" prompt — same shape
 * as app/(app)/advisor/actions.ts's softDismissUpgradePrompt/notNowUpgradePrompt, against the
 * independent parent_email_prompt_* columns (migration 0117) instead of upgrade_prompt_*.
 * Never surface an error to the caller, for the identical reason those two don't: closing a
 * dismissible prompt is not an action a student should see fail. Real failures are still
 * logged server-side; the undefined-column branch (0117 unapplied) isn't logged at all, since
 * that's the expected, unremarkable steady state tonight.
 */
export async function softDismissParentEmailPrompt(): Promise<void> {
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ parent_email_prompt_soft_dismissed_until: computeSoftDismissUntil() })
    .eq("id", session.userId!);

  if (error && !isUndefinedColumnError(error, "parent_email_prompt_")) {
    console.warn("[dashboard] failed to record parent-email-prompt soft dismiss", { userId: session.userId, error });
  }
}

export async function notNowParentEmailPrompt(): Promise<void> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("parent_email_prompt_not_now_at, parent_email_prompt_not_now_count")
    .eq("id", session.userId!)
    .maybeSingle();

  if (readError && !isUndefinedColumnError(readError, "parent_email_prompt_")) {
    console.warn("[dashboard] failed to read prior parent-email-prompt not-now state", { userId: session.userId, error: readError });
  }

  const row = current as { parent_email_prompt_not_now_at: string | null; parent_email_prompt_not_now_count: number | null } | null;
  const update = computeNotNowUpdate(row?.parent_email_prompt_not_now_at ?? null, row?.parent_email_prompt_not_now_count ?? 0);

  const { error: writeError } = await supabase
    .from("profiles")
    .update({
      parent_email_prompt_not_now_at: update.notNowAt,
      parent_email_prompt_not_now_count: update.notNowCount,
      parent_email_prompt_dismissed_forever: update.dismissedForever,
    })
    .eq("id", session.userId!);

  if (writeError && !isUndefinedColumnError(writeError, "parent_email_prompt_")) {
    console.warn("[dashboard] failed to record parent-email-prompt not-now", { userId: session.userId, error: writeError });
  }
}
