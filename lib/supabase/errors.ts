/**
 * A written migration isn't guaranteed applied everywhere this code runs -- this project's
 * standing discipline (lib/plan/persist.ts's own note on carried_forward/migration 0077 is
 * the canonical statement of the rule) is that "unapplied" is a normal, expected state, not
 * a temporary gap to code around once. A write naming a column that hasn't landed yet must
 * degrade rather than fail outright: Postgres validates a statement's target columns before
 * touching any row, so retrying the identical write with the column omitted is safe --
 * nothing partial can have landed from the first attempt.
 *
 * Moved here 2026-09-02 (originally lib/universities/sync-us-universities.ts, written for
 * migration 0080's university_statistics.last_changed_at) once a second, unrelated domain
 * (lib/opportunities/persist-matches.ts, migration 0086's match_confidence) needed the exact
 * same check -- a cross-domain import of a university-specific file for a generic Postgres
 * error check would have been a stranger dependency than a small, genuinely shared home.
 */
export function isUndefinedColumnError(error: { code?: string; message?: string } | null, columnName: string): boolean {
  return error?.code === "42703" && !!error.message?.includes(columnName);
}
