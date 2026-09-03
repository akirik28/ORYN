import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUndefinedFunctionError } from "@/lib/supabase/errors";
import { getParentLinksForStudent } from "@/lib/parent/links";
import type { ParentChildApplicationRow, ParentChildProfileRow, ParentChildTargetUniversityRow } from "@/types/database";

/**
 * The seam CEO asked for by name, 2026-09-04: "a revoked parent and an active parent whose
 * child genuinely has nothing must not produce the same screen." Every get_parent_child_*
 * function (migration 0116) returns an empty array in both cases — deliberate on the SQL side,
 * where zero rows is indistinguishable from not-found by design (that function's own comment
 * says so). So the caller needs a second signal that never comes from those functions at all:
 * whether an active link exists in the first place, read directly off `parent_links` (the
 * `parties can view their own link` policy grants a parent that read regardless of status —
 * not a new leak, since a parent already knows their own link exists by definition).
 *
 * This type is what makes that second signal impossible to skip. A caller cannot reach
 * `targetUniversities`/`applications` without first narrowing through `state === "active"` —
 * there is no path from "I have data" to "I have no data" that doesn't pass through a real
 * `parent_links` read, so "revoked" and "active-but-empty" cannot collapse into the same shape
 * the way two empty arrays could.
 */
export type ParentChildPanelState =
  | { state: "no_link" }
  | { state: "pending" }
  | { state: "revoked" }
  | {
      state: "active";
      profile: ParentChildProfileRow | null;
      targetUniversities: ParentChildTargetUniversityRow[];
      applications: ParentChildApplicationRow[];
    };

/**
 * Reuses getParentLinksForStudent (lib/parent/links.ts) rather than a second parent_links
 * query. That function's own RLS scoping (`parent_user_id = auth.uid() or student_user_id =
 * auth.uid()`) already reduces to at most one row when the caller is a parent, not the named
 * student — and `unique(parent_user_id, student_user_id)` (migration 0116) means that's true
 * for the row's entire lifetime, not just right now: createParentLink treats a second insert
 * for an already-linked pair as an idempotent "already linked" rather than a new row, so a
 * revoked pair never gets a fresh pending row sitting alongside it. One caller, one row, always.
 *
 * Degrades exactly the way every other reader in this domain does when its migration isn't
 * live yet: getParentLinksForStudent already returns [] if `parent_links` doesn't exist,
 * which this function correctly reads as "no_link" — the honest answer to "cannot know of any
 * link" — and each get_parent_child_* call below is individually guarded against
 * isUndefinedFunctionError for the same reason.
 */
export async function getParentChildPanelState(studentUserId: string): Promise<ParentChildPanelState> {
  const links = await getParentLinksForStudent(studentUserId);
  const ownLink = links[0];

  if (!ownLink) return { state: "no_link" };
  if (ownLink.status === "pending") return { state: "pending" };
  if (ownLink.status === "revoked") return { state: "revoked" };

  const supabase = await createClient();
  const [profileResult, universitiesResult, applicationsResult] = await Promise.all([
    supabase.rpc("get_parent_child_profile", { p_student: studentUserId }),
    supabase.rpc("get_parent_child_target_universities", { p_student: studentUserId }),
    supabase.rpc("get_parent_child_applications", { p_student: studentUserId }),
  ]);

  if (profileResult.error && !isUndefinedFunctionError(profileResult.error, "get_parent_child_profile")) {
    console.error("[parent/child-panel] get_parent_child_profile failed", { studentUserId, error: profileResult.error });
  }
  if (
    universitiesResult.error &&
    !isUndefinedFunctionError(universitiesResult.error, "get_parent_child_target_universities")
  ) {
    console.error("[parent/child-panel] get_parent_child_target_universities failed", {
      studentUserId,
      error: universitiesResult.error,
    });
  }
  if (applicationsResult.error && !isUndefinedFunctionError(applicationsResult.error, "get_parent_child_applications")) {
    console.error("[parent/child-panel] get_parent_child_applications failed", { studentUserId, error: applicationsResult.error });
  }

  return {
    state: "active",
    profile: profileResult.data?.[0] ?? null,
    targetUniversities: universitiesResult.data ?? [],
    applications: applicationsResult.data ?? [],
  };
}
