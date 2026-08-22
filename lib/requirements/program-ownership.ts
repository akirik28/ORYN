/**
 * A `university_requirements` row can optionally scope to one specific program via
 * `program_id` (`null` means university-wide, per admin-requirement-form.tsx's own
 * "University-wide (all programs)" option). That program must actually belong to the
 * requirement's own `university_id` — otherwise a requirement meant for one university's
 * program silently attaches to (and is shown against) a *different* university's program
 * page, corrupting exactly the kind of traceable, sourced fact AGENTS.md Phase 69's
 * "Requirement Check" shows a student.
 *
 * Known gap this closes (docs/known-issues.md, "Open — deliberately scoped out"):
 * `addUniversityRequirement` (app/(app)/universities/[id]/requirement-actions.ts) never
 * checked this — low severity in practice today (admin-only, gated by `requireAdmin()`,
 * and the real UI only ever offers that university's own programs in its dropdown), but a
 * real gap: the Server Action itself trusted client-submitted IDs with no cross-check, so
 * a direct call (devtools, a future admin surface reusing this action, a caller bug) could
 * silently write a mismatched row.
 *
 * Pure decision function, no I/O, mirrors this codebase's existing pattern
 * (lib/opportunities/ingest.ts's decideIngestion) — the caller fetches the program's
 * actual `university_id` and passes it in; this function only decides.
 */
export type ProgramOwnershipResult = { ok: true } | { ok: false; error: string };

export function validateProgramOwnership(
  programId: string | null,
  universityId: string,
  /** The program's actual `university_id` as read live from `university_programs`, or
   * `null` if no row with that id exists at all (already deleted, or a bad id). */
  programUniversityId: string | null
): ProgramOwnershipResult {
  // University-wide requirement — nothing to check, this is the common, valid case.
  if (programId === null) return { ok: true };

  if (programUniversityId === null) {
    return { ok: false, error: "That program could not be found. It may have been removed." };
  }

  if (programUniversityId !== universityId) {
    return { ok: false, error: "That program belongs to a different university than the one this requirement is being added to." };
  }

  return { ok: true };
}
