import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isUndefinedColumnError, isUndefinedTableError } from "@/lib/supabase/errors";
import type { AccountRole, ParentLink } from "@/types/database";

export type { AccountRole };

/**
 * Parent-account routing (P2, docs/veli-hesabi-spec-2026-09-04.md §5/§6). `account_role`
 * and `parent_links` are both real, typed columns/tables as of P1's merge (`18c4f6ea`), but
 * migration 0116 is staged, not applied -- the live database may still lack either one
 * depending on environment. Every degrade path returns "student" / "no active link" --
 * never "parent", never a thrown error. Matches `types/database.ts`'s own comment on
 * `Profile.account_role` exactly: "every read that gates behavior must treat an
 * absent/unreadable value as 'student' ... not as a permission error."
 *
 * IMPORTANT: this module answers "what does the currently-authenticated user see," nothing
 * more. It is not, and must not become, the access-control boundary -- see the header
 * comment on app/parent/(dashboard)/layout.tsx. A parent role read here only ever gates
 * ROUTING; a parent's actual ability to read a linked child's rows is 44's RLS policies,
 * enforced at the database regardless of what this file returns.
 */

/**
 * Self-read only -- the currently-authenticated user's own `account_role`, via the
 * ordinary session-scoped client. Confirmed with 44 (2026-09-04): a user reading their own
 * profiles row goes through the pre-existing baseline "select own profile" RLS policy
 * (migration 0014), unrelated to the SECURITY DEFINER functions 44 built for a parent
 * reading a *linked child's* row. No elevated client or function needed for this.
 *
 * `.select("account_role")` names the column explicitly, which PostgREST validates against
 * its own schema cache before running (lib/supabase/errors.ts's own header: this is the
 * write-shaped read case, not the `select('*')`-omits-silently case) -- so a pre-migration
 * database returns a real, classifiable error here rather than silently omitting the field,
 * caught with the same isUndefinedColumnError helper every other pre-migration read in this
 * codebase uses, not a generic catch-all, so a genuinely different failure still logs
 * instead of being read as "column doesn't exist yet" by coincidence.
 */
export const getAccountRole = cache(async (userId: string): Promise<AccountRole> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("account_role").eq("id", userId).single();

  if (error) {
    if (!isUndefinedColumnError(error, "account_role")) {
      console.error("[account-role] failed to read account_role", { userId, error: error.message });
    }
    return "student";
  }
  return data?.account_role === "parent" ? "parent" : "student";
});

/**
 * The one real query, `cache()`-wrapped so every caller in the same request tree (the
 * dashboard layout's own gate, the pending screen, lane 11's panel reading
 * student_user_id) shares one round trip rather than each re-fetching -- same pattern as
 * lib/security/dal.ts's getProfileScores/getCurrentProfile. `select("*")` deliberately,
 * not a named list: a wildcard select silently omits a column PostgREST doesn't recognize
 * rather than erroring (lib/supabase/errors.ts's own rule), which is fine here -- a
 * genuinely missing `status`/`updated_at` on an existing row isn't a case this function
 * needs to distinguish from "the row lacks that field", only isUndefinedTableError (the
 * table itself not existing yet) is checked below.
 *
 * Not filtered to a single status server-side -- reads whichever row is most current (a
 * parent linked to more than one student is a real, spec-supported shape, G7 doesn't cap
 * it; every caller below only asks "is there an active one", so the most-recently-touched
 * row is the right one to prefer when none are active yet).
 */
export const getMostRecentParentLink = cache(async (parentUserId: string): Promise<ParentLink | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_links")
    .select("*")
    .eq("parent_user_id", parentUserId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!isUndefinedTableError(error, "parent_links")) {
      console.error("[account-role] failed to read parent_links", { parentUserId, error: error.message });
    }
    return null;
  }
  return data;
});

/**
 * "none" covers both "no row at all" and "the table doesn't exist yet" (0116 unapplied) --
 * indistinguishable today, and both honestly mean the same thing: nothing to show. "pending"
 * and "revoked" ARE distinguishable from "none" once the table is live, even before P4's
 * invite-flow UI produces a row through normal use. Kept as separate states rather than
 * collapsing pending/revoked/none into one "inactive" bucket because
 * app/parent/pending/page.tsx has two genuinely different things to say ("no student has
 * linked you yet" vs "your child hasn't confirmed") and a two-state type would throw that
 * distinction away at the source.
 */
export type ParentLinkStatus = "active" | "pending" | "revoked" | "none";

export async function getParentLinkStatus(parentUserId: string): Promise<ParentLinkStatus> {
  const link = await getMostRecentParentLink(parentUserId);
  return link?.status ?? "none";
}

/** True for any status that should show the dashboard rather than the pending screen. */
export function hasActiveParentLink(status: ParentLinkStatus): boolean {
  return status === "active";
}

/**
 * For app/parent/(dashboard)/'s own children (lane 11's panel) to call directly once the
 * layout above has already confirmed an active link exists -- `cache()`-deduped against
 * the identical call the layout itself makes via getParentLinkStatus, so calling this too
 * costs no extra query in the same request. Returns null if the most recent link isn't
 * active, which shouldn't happen for anything rendering inside app/parent/(dashboard)/ --
 * that layout already redirects to /parent/pending otherwise -- but this stays honest
 * rather than asserting a precondition it can't itself enforce.
 */
export async function getActiveParentLink(parentUserId: string): Promise<ParentLink | null> {
  const link = await getMostRecentParentLink(parentUserId);
  return link?.status === "active" ? link : null;
}
