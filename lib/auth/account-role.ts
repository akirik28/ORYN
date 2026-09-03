import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Parent-account routing (P2, docs/veli-hesabi-spec-2026-09-04.md §5/§6). Built ahead of
 * P1's own migration (0116, staged by CEO 2026-09-04, not applied) -- `profiles.account_role`
 * and `parent_links` do not exist on the live database yet. Every query below is cast past
 * the generated `Database` type on purpose (the type doesn't know about them either) and
 * every failure path -- missing column, missing table, missing row, a real query error --
 * degrades to the safe default rather than to "parent" or a crash. Per CEO's own
 * instruction: absence must read as the existing (student) behavior, never as a known
 * value and never as an error page. Delete the casts and the "not applied yet" framing
 * once 0116 is confirmed live and `npm run db:types` has regenerated `types/database.ts`
 * to include both.
 *
 * IMPORTANT: this module answers "what does the currently-authenticated user see," nothing
 * more. It is not, and must not become, the access-control boundary -- see the header
 * comment on app/parent/(dashboard)/layout.tsx. A parent role read here only ever gates
 * ROUTING; a parent's actual ability to read a linked child's rows is 44's RLS policies on
 * `parent_links`/`profiles`, enforced at the database regardless of what this file returns.
 */

export type AccountRole = "student" | "parent";

/**
 * Self-read only -- the currently-authenticated user's own `account_role`, via the
 * ordinary session-scoped client. A user reading their own profile row is the standard
 * single-owner RLS case (same shape as every other self-read in lib/security/dal.ts),
 * distinct from a parent reading a *linked child's* row, which 44 is routing through a
 * SECURITY DEFINER function with an explicit column whitelist specifically because
 * `advisor_instructions` and other sensitive fields also live on `profiles`. Flagged to 44
 * for confirmation (2026-09-04); if a self-read of one's own `account_role` turns out to
 * need the same function, this is the one call site to change.
 */
export const getAccountRole = cache(async (userId: string): Promise<AccountRole> => {
  const supabase = await createClient();
  const untyped = supabase as unknown as SupabaseClient;

  const { data, error } = await untyped.from("profiles").select("account_role").eq("id", userId).single();

  if (error || !data) return "student";
  const role = (data as { account_role?: string | null }).account_role;
  return role === "parent" ? "parent" : "student";
});

/**
 * "none" covers both "no row at all" and "the table doesn't exist yet" (0116 unapplied) --
 * indistinguishable today, and both honestly mean the same thing: nothing to show. "pending"
 * and "revoked" ARE distinguishable from "none" once the table is real, even before P4
 * (the invite flow) ships a UI to create rows -- a manually-inserted test row would already
 * resolve correctly. Kept as three states rather than collapsing pending/revoked/none into
 * one "inactive" bucket because app/parent/pending/page.tsx has two genuinely different
 * things to say ("no student has linked you yet" vs "your child hasn't confirmed") and a
 * two-state type would throw that distinction away at the source.
 */
export type ParentLinkStatus = "active" | "pending" | "revoked" | "none";

export const getParentLinkStatus = cache(async (parentUserId: string): Promise<ParentLinkStatus> => {
  const supabase = await createClient();
  const untyped = supabase as unknown as SupabaseClient;

  // Not filtered to a single status server-side -- reads whichever row exists (there can
  // only be one per (parent_user_id, student_user_id) pair, and P4 sends one invite at a
  // time) so this function can report which of pending/revoked/none it actually is, not
  // just "not active". `.order` + `.limit(1)` rather than `.single()`: a parent linked to
  // more than one student is a real, spec-supported shape (G7 doesn't cap it), and this
  // function only answers "is at least one link active", so the most-recently-touched row
  // is the right one to prefer if none are active yet.
  const { data, error } = await untyped
    .from("parent_links")
    .select("status")
    .eq("parent_user_id", parentUserId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return "none";
  const status = (data as { status?: string | null }).status;
  if (status === "active") return "active";
  if (status === "revoked") return "revoked";
  return "pending";
});

/** True for any status that should show the dashboard rather than the pending screen. */
export function hasActiveParentLink(status: ParentLinkStatus): boolean {
  return status === "active";
}
