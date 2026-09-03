import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ParentLinkStatus, PlanTier, Profile } from "@/types/database";
import { isUndefinedTableError } from "@/lib/supabase/errors";
import { resolvePlanTier } from "./plan-tier";

export type { ParentLinkStatus };

/**
 * A parent's effective tier is a lookup through an active link, never a value stored on the
 * parent's own row (§K4 — "velinin kendi plan_tier sütunu yazılmaz"). This is the one place
 * that lookup happens; a parent-facing surface should call this rather than reading
 * `plan_tier` off a parent profile directly (there is nothing meaningful there to read).
 *
 * `pending` and `revoked` both resolve to "standard" — not just "revoked leaks nothing," but
 * "an unconfirmed link leaks nothing either." G1's "asla ama asla" (never, ever) is about
 * authority, not about timing: a `pending` row exists because the student hasn't confirmed
 * it yet (§K3), and a tier leak through an unconfirmed link would make the confirmation step
 * meaningless — the access it's supposed to gate would already have happened.
 *
 * Deliberately thin: doesn't touch Supabase itself, doesn't know anything about a
 * `parent_links` row beyond its status. `resolvePlanTier` (lib/tier/plan-tier.ts) already owns
 * "what tier is this profile on, permanent-vs-gift" — reusing it here rather than re-deriving
 * it is the same discipline that function's own header asks of every other Ultra-aware
 * surface. `fetchParentEffectiveTier` below is the DB-facing wrapper that calls this.
 */
export function resolveParentEffectiveTier(
  linkStatus: ParentLinkStatus,
  studentProfile: Pick<Profile, "plan_tier" | "ultra_gift_expires_at">
): PlanTier {
  if (linkStatus !== "active") return "standard";
  return resolvePlanTier(studentProfile);
}

/**
 * The DB-facing half, wired up now that P1's schema is known (migration 0116, staged, not yet
 * applied — see docs/p6-shared-premium-2026-09-04.md, written before this landed, for the
 * exact spec this follows). `createAdminClient()`, not a request-scoped client: this runs
 * server-side with its own explicit authorization logic (the two queries below), not as a
 * client subject to whatever RLS policy P1 ends up writing on `parent_links` — matching every
 * other privileged app-level check in this codebase (lib/opportunities/persist-matches.ts is
 * the established pattern), and confirmed independently by 44's own P1 work landing on the
 * identical shape ("auth path is createAdminClient against the function rather than RLS")
 * before either lane had seen the other's.
 *
 * Doesn't call 44's `get_parent_child_profile` (the curated, RLS-facing read for a parent
 * dashboard) — that function's 9-column allowlist is designed for exposing a safe *profile*
 * to a client that observes RLS; this is a narrower, purely server-side need (two already-
 * non-sensitive columns, for a trusted tier computation) with no client ever seeing the
 * result directly, so depending on that function's exact column list would be an unnecessary
 * coupling to a surface built for a different purpose.
 *
 * Degrades to "standard" if `parent_links` doesn't exist yet (isUndefinedTableError) — the
 * whole-table case, not `isUndefinedColumnError`: migration 0116 adds a new table, not a
 * column on one that already exists, so this is the "missing table" member of
 * lib/supabase/errors.ts's schema-cache-miss family, not the "missing column" one.
 * `plan_tier`/`ultra_gift_expires_at` themselves need no degrade guard here — both are already
 * live columns, unrelated to 0116.
 */
export async function fetchParentEffectiveTier(
  admin: SupabaseClient<Database>,
  parentUserId: string,
  studentUserId: string
): Promise<PlanTier> {
  const { data: link, error: linkError } = await admin
    .from("parent_links")
    .select("status")
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .maybeSingle();

  if (linkError) {
    if (isUndefinedTableError(linkError, "parent_links")) return "standard";
    console.error("[parent-tier] failed to read parent_links", { error: linkError.message });
    return "standard";
  }
  if (!link) return "standard"; // no relationship at all -- same as "not active"

  const { data: student, error: studentError } = await admin
    .from("profiles")
    .select("plan_tier, ultra_gift_expires_at")
    .eq("id", studentUserId)
    .maybeSingle();

  if (studentError || !student) {
    if (studentError) console.error("[parent-tier] failed to read student profile", { error: studentError.message });
    return "standard";
  }

  return resolveParentEffectiveTier(link.status, student);
}
