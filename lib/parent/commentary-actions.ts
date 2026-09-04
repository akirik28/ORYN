"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/security/dal";
import { getActiveParentLink } from "@/lib/auth/account-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveParentMonthlyCommentary } from "@/lib/digest/parent-commentary";
import { isDueForMonthlyCommentary } from "@/lib/digest/parent-commentary-run";
import { toLocale } from "@/lib/i18n/config";

/**
 * The on-demand half of B3b's monthly commentary (CEO, 2026-09-04): "veli sayfayı açtığında,
 * süresi dolmuşsa üretilir, saklanır, gösterilir" -- no cron is armed anywhere in this
 * codebase, so a parent's own visit to /parent/progress is what triggers generation, not a
 * scheduled job. Reuses lib/digest/parent-commentary.ts's resolveParentMonthlyCommentary and
 * parent-commentary-run.ts's isDueForMonthlyCommentary UNCHANGED -- this file adds no new
 * generation logic of its own, only the storage write the batch runner never had (migration
 * 0130) and the trigger path a page visit needs that a cron job wouldn't.
 *
 * NEVER called during a page render (CEO's own instruction, backed by a real measurement:
 * first token 20-58s away) -- app/parent/(dashboard)/progress/page.tsx renders the stored
 * entry (or its absence) synchronously and fast; a Client Component calls this action
 * separately, only when the server-rendered page already told it generation is due, and shows
 * an explicit "preparing" state while it runs.
 *
 * Authorization is derived entirely server-side, never trusts a client-supplied id: the only
 * input is the caller's own session. `getActiveParentLink` (RLS-scoped, the caller's own
 * client) is what proves this specific parent has a specific, active link before the admin
 * client -- needed because resolveParentMonthlyCommentary's own `profiles` read has no
 * parent-facing RLS policy, only the whitelisted get_parent_child_* functions do -- ever
 * touches that student's data. A caller with no active link reaches nothing past the second
 * line.
 */
export async function generateParentCommentaryIfDue(): Promise<{ generated: boolean; reason?: "no_link" | "not_due" | "not_premium" }> {
  const session = await verifySession();
  if (!session.isAuth || !session.userId) return { generated: false, reason: "no_link" };

  const link = await getActiveParentLink(session.userId);
  if (!link) return { generated: false, reason: "no_link" };

  if (!isDueForMonthlyCommentary(link.last_commentary_sent_at)) {
    return { generated: false, reason: "not_due" };
  }

  const admin = createAdminClient();

  // Same read resolveParentMonthlyCommentary performs internally for the narrative's own
  // language -- duplicated here (not threaded through as a new parameter, to keep that
  // function's own signature untouched per CEO's "don't rewrite the generation logic")
  // specifically so THIS row records the language the narrative was actually written in,
  // not whatever the parent's own browser happens to be viewing in right now.
  const { data: studentProfile } = await admin.from("profiles").select("preferred_language").eq("id", link.student_user_id).single();
  const narrativeLocale = toLocale(studentProfile?.preferred_language);

  const outcome = await resolveParentMonthlyCommentary(admin, link.student_user_id, link.last_commentary_sent_at);
  if (outcome.kind === "not_premium") return { generated: false, reason: "not_premium" };

  // upsert + ignoreDuplicates, not a plain insert (CEO, 2026-09-04, off a real same-night
  // incident: a package silently doubled rows on a re-run because its own dedup constraint
  // depended on a column that was never set). Migration 0130's unique(parent_link_id,
  // period_start) is what this targets: two concurrent visits to this page (two tabs, a
  // retry) can both read isDueForMonthlyCommentary as true and both reach this line before
  // either write lands. With a plain insert that produces two entries for the same period;
  // with ignoreDuplicates, the second attempt silently no-ops instead.
  const { error: insertError } = await admin
    .from("parent_commentary_entries")
    .upsert(
      {
        parent_link_id: link.id,
        locale: narrativeLocale,
        period_start: outcome.content.periodStart,
        period_end: outcome.content.periodEnd,
        narrative: outcome.content.narrative,
        narrative_source: outcome.content.narrativeSource,
      },
      { onConflict: "parent_link_id,period_start", ignoreDuplicates: true }
    );
  if (insertError) {
    console.error("[parent/commentary-actions] failed to store generated commentary", { linkId: link.id, error: insertError.message });
    return { generated: false };
  }

  // Same write processOneLink makes on a real (non-dry) batch pass -- kept identical rather
  // than reusing that function directly, since this path additionally needs to store content
  // it never did, and runs on-demand for one link instead of iterating every active one.
  const { error: updateError } = await admin.from("parent_links").update({ last_commentary_sent_at: new Date().toISOString() }).eq("id", link.id);
  if (updateError) {
    console.error("[parent/commentary-actions] stored commentary but failed to record last_commentary_sent_at", { linkId: link.id, error: updateError.message });
  }

  revalidatePath("/parent/progress");
  return { generated: true };
}
