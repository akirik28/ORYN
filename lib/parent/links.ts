import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUndefinedColumnError, isUndefinedTableError, isUniqueViolation } from "@/lib/supabase/errors";
import { isPendingLinkExpired } from "@/lib/parent/invite-token";
import type { AccountRole, Database, ParentLink } from "@/types/database";

/**
 * P4 (docs/veli-hesabi-spec-2026-09-04.md §5) — the data layer for `parent_links` and
 * `profiles.account_role`. Every function here degrades gracefully if P1's migration hasn't
 * landed yet in the environment this runs in (lib/supabase/errors.ts's own standing rule) —
 * a missing table/column must never crash a page or a signup, it must just mean "this part
 * of the feature isn't live here yet."
 *
 * Client choice is deliberate and split, not uniform, matching this file's two different
 * callers:
 *   - setAccountRole / createParentLink run as a direct, system-triggered consequence of
 *     a signup that may not have an active session yet (Supabase Auth's email-confirmation
 *     path grants no session until the parent clicks their confirm link — see
 *     app/(auth)/actions.ts's own signUp() for the identical branch). An RLS-scoped insert
 *     with no session would simply fail, for a reason that has nothing to do with whether
 *     the write is legitimate. Same reasoning lib/analytics/log.ts already uses for
 *     product_events and app/(app)/settings/actions.ts's deleteMyAccount already uses for
 *     storage cleanup: a privileged, system-initiated write uses the admin client rather than
 *     depending on a session that may not exist yet.
 *   - confirmParentLink / revokeParentLink / getParentLinksForStudent are a logged-in user
 *     acting on their own data, matching every other function in
 *     app/(app)/settings/actions.ts: createClient() (RLS-respecting), requireUser() by the
 *     caller, and this file's own explicit .eq() ownership check as defense in depth on top
 *     of whatever RLS policy P1 ends up writing — not a substitute for it.
 */

export type ParentLinkWithComputedStatus = ParentLink & { isExpired: boolean };

/** Written immediately after a parent's own supabase.auth.signUp() succeeds — mirrors
 * app/(auth)/actions.ts's consentMetadata write pattern, except account_role is a real column
 * (§5), not auth metadata, since RLS policies need to filter on it directly. */
export async function setAccountRole(userId: string, role: AccountRole): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ account_role: role }).eq("id", userId);
  if (error) {
    if (isUndefinedColumnError(error, "account_role")) return {};
    console.error("[parent/links] failed to set account_role", { userId, role, error });
    return { error: "Couldn't finish setting up the parent account." };
  }
  return {};
}

/** Takes its client rather than constructing one, matching the DAL's own precedent
 * (lib/security/dal.ts's comment on refreshAdmissionOutlook/getCounselorState) for a
 * function called from more than one context: app/(auth)/actions.ts's signUp() calls this
 * with the admin client (same session-may-not-exist-yet reasoning as setAccountRole above),
 * while app/(app)/settings/parent-actions.ts calls it with the regular RLS-respecting
 * client, since a student editing their own Settings always has a real session. `email: null`
 * clears a previously-set address — a legitimate "I changed my mind" action, not an error. */
export async function setParentInviteEmail(
  client: SupabaseClient<Database>,
  userId: string,
  email: string | null
): Promise<{ error?: string }> {
  const { error } = await client.from("profiles").update({ parent_invite_email: email }).eq("id", userId);
  if (error) {
    /**
     * CEO's own flag, 2026-09-04, decided rather than left as-found: while migration 0116 is
     * unapplied, this degrade is a silent SUCCESS — a student can type an address, see no
     * error, and have it discarded. That's this repo's usual "absence reads as a known value"
     * shape pointed the wrong way: normally the known value is a safe default; here it's a
     * false confirmation, and the student's model of the world (I did this, it worked) is
     * now wrong.
     *
     * Decision: leave it. The alternative — hiding the Settings field entirely while the
     * column is missing, matching curriculum_other_text's own columnExistsLive gate — is the
     * more honest shape in general, but 0116 is staged and expected to apply within hours
     * (data/morning/09-migrations-2026-09-04.sql), not indefinitely the way
     * curriculum_other_text sat unapplied for a much longer stretch. Building a second
     * live-column probe and threading it through the Settings render path for a gap this
     * short isn't worth the surface it adds. If 0116 is still unapplied a day from now, this
     * call should be revisited — the trade-off that makes sense for hours stops making sense
     * for days.
     */
    if (isUndefinedColumnError(error, "parent_invite_email")) return {};
    console.error("[parent/links] failed to set parent_invite_email", { userId, error });
    return { error: "Couldn't save the parent email." };
  }

  await revokeStalePendingLinks(client, userId, email);
  return {};
}

/**
 * CEO/44's own question, 2026-09-04: what happens to an already-out invitation when the
 * student changes the address afterward?
 *
 * Decision: revoke every still-`pending` link whose `invited_email` no longer matches the
 * address the student just saved. An unconfirmed invitation to an address the student has
 * since replaced is exactly the "live door to an address that may be wrong" CEO named —
 * §K3's whole reason to exist is protecting against a *wrong* address, not just a wrong
 * click, and `unique(parent_user_id, student_user_id)` constrains the pair, not the email,
 * so nothing in the schema itself stops two simultaneous invitations to two different
 * addresses for the same student without this.
 *
 * `active` links are never touched here, deliberately. An active link is a real, already-
 * approved relationship — the student already completed §K3's confirmation once, on
 * purpose. Ending that is what the explicit "Remove access" button
 * (features/settings/parent-invite-section.tsx's revokeButton, backed by this file's own
 * revokeParentLink) is for; it must not happen as a side effect of editing an unrelated
 * field, which would be a surprising and destructive way to lose a working relationship.
 *
 * Scoped to `invited_email != savedEmail`, not "every pending link" — re-saving the same
 * address (or regenerating a link after the old one simply expired) must not revoke a
 * still-good, still-correct invitation just because the student touched the form. `null`
 * (the student cleared the field) revokes every pending link unconditionally: "I don't want
 * to invite anyone right now" reasonably includes not leaving a dangling pending invite
 * behind either, and SQL's own `<> NULL` is never true, so this needs its own branch rather
 * than falling through to `.neq()`.
 *
 * Best-effort — logged, never thrown. The address was already saved by the time this runs;
 * failing to clean up a stale invitation is a real gap worth knowing about, not a reason to
 * make the student's save fail.
 */
async function revokeStalePendingLinks(
  client: SupabaseClient<Database>,
  studentUserId: string,
  savedEmail: string | null
): Promise<void> {
  let query = client.from("parent_links").update({ status: "revoked" }).eq("student_user_id", studentUserId).eq("status", "pending");
  if (savedEmail !== null) {
    query = query.neq("invited_email", savedEmail);
  }
  const { error } = await query;
  if (error && !isUndefinedTableError(error, "parent_links")) {
    console.error("[parent/links] failed to revoke stale pending links", { studentUserId, error });
  }
}

export type CreateParentLinkResult = { error?: string; alreadyLinked?: boolean };

/** The first real database write in the whole invite flow — see lib/parent/invite.ts's
 * header for why nothing is written before this point. Always created `pending` (§K3); there
 * is no path in this file that creates a link already `active`. */
export async function createParentLink(params: {
  parentUserId: string;
  studentUserId: string;
  invitedEmail: string;
}): Promise<CreateParentLinkResult> {
  const admin = createAdminClient();
  const { error } = await admin.from("parent_links").insert({
    parent_user_id: params.parentUserId,
    student_user_id: params.studentUserId,
    status: "pending",
    invited_email: params.invitedEmail,
    invited_at: new Date().toISOString(),
  });

  if (error) {
    if (isUndefinedTableError(error, "parent_links")) return {};
    // §5's own unique(parent_user_id, student_user_id) — this exact parent already has a
    // link (of any status) to this exact student. Treated as an idempotent success, same
    // shape as lib/notifications/create.ts's own isUniqueViolation handling: clicking an
    // invite link a second time must not be a hard error.
    if (isUniqueViolation(error, "parent_links_parent_user_id_student_user_id_key")) {
      return { alreadyLinked: true };
    }
    console.error("[parent/links] failed to create parent_links row", { params, error });
    return { error: "Couldn't finish linking this account." };
  }
  return {};
}

/** All non-revoked-and-forgotten rows for a student, newest invite first, each with its own
 * computed expiry — computed here rather than stored (see invite-token.ts's own reasoning for
 * not adding a fourth status value) so every caller sees the same answer without re-deriving
 * the window logic. Degrades to an empty list, not an error, if parent_links doesn't exist
 * yet — a student's Settings page has nothing actionable to do differently either way. */
export async function getParentLinksForStudent(studentUserId: string): Promise<ParentLinkWithComputedStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_links")
    .select("*")
    .eq("student_user_id", studentUserId)
    .order("invited_at", { ascending: false });

  if (error) {
    if (isUndefinedTableError(error, "parent_links")) return [];
    console.error("[parent/links] failed to load parent_links for student", { studentUserId, error });
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    isExpired: row.status === "pending" && row.invited_at !== null && isPendingLinkExpired(row.invited_at),
  }));
}

/** Student-only — the second half of §K3's double confirmation. Scoped to status='pending'
 * so a stale double-click can't reset an already-active link's confirmed_at. */
export async function confirmParentLink(linkId: string, studentUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("parent_links")
    .update({ status: "active", confirmed_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", linkId)
    .eq("student_user_id", studentUserId)
    .eq("status", "pending");

  if (error) {
    if (isUndefinedTableError(error, "parent_links")) {
      return { error: "This isn't available on your account yet. Try again later." };
    }
    console.error("[parent/links] failed to confirm parent_links row", { linkId, studentUserId, error });
    return { error: "Couldn't confirm the link." };
  }
  if (!count) return { error: "This invite is no longer waiting on you — it may have already been confirmed or removed." };
  return {};
}

/** Either side of the link can end it — used today only from the student's own Settings
 * ("Decline" on a pending row, "Remove access" on an active one), see
 * features/settings/parent-invite-section.tsx. Written to check ownership from either
 * direction so a future parent-side control (P3, not built here) can call the same function
 * rather than duplicating this check. */
export async function revokeParentLink(linkId: string, actorUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: row, error: fetchError } = await supabase
    .from("parent_links")
    .select("id, parent_user_id, student_user_id")
    .eq("id", linkId)
    .maybeSingle();

  if (fetchError) {
    if (isUndefinedTableError(fetchError, "parent_links")) {
      return { error: "This isn't available on your account yet. Try again later." };
    }
    console.error("[parent/links] failed to load parent_links row before revoke", { linkId, error: fetchError });
    return { error: "Couldn't remove this link." };
  }
  if (!row) return { error: "This link no longer exists." };
  if (row.parent_user_id !== actorUserId && row.student_user_id !== actorUserId) {
    return { error: "Couldn't remove this link." };
  }

  const { error } = await supabase.from("parent_links").update({ status: "revoked" }).eq("id", linkId);
  if (error) {
    console.error("[parent/links] failed to revoke parent_links row", { linkId, error });
    return { error: "Couldn't remove this link." };
  }
  return {};
}
