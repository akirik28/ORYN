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
/**
 * TWO codes, not one, and this is the whole point of the function.
 *
 * Every degrade path in this codebase was written against `42703` — Postgres's own SQLSTATE
 * for undefined_column — and every test for those paths mocks `42703`, so all of them pass.
 * **They were all inert for writes.**
 *
 * `42703` is what *Postgres* raises when SQL executes with an unknown column, which is what
 * a SELECT produces: PostgREST passes the column list through and the database rejects it.
 * A write is different. PostgREST validates an INSERT/UPDATE/UPSERT payload against its own
 * **schema cache before any SQL runs**, and returns its own error instead:
 *
 *     { code: "PGRST204",
 *       message: "Could not find the 'match_confidence' column of 'opportunity_matches' in the schema cache" }
 *
 * So a check keyed on `42703` alone never fires on the exact path it exists to protect.
 *
 * **Found 2026-09-02 from live evidence, not from reading.** Migration `0086` added
 * `match_confidence`; the column is not applied; `refreshOpportunityMatches` ran against the
 * dev server and the log shows it taking the *non*-degrade branch —
 * `[opportunity-matches] upsert failed` — proving `isUndefinedColumnError` returned false
 * while the column was genuinely absent. Four separate mechanisms shared the assumption:
 * this one, `lib/plan/persist.ts` (0077), `lib/profile/cv-import.ts` (0084) and
 * `lib/jobs/run-with-tracking.ts` (0083). All four now route through here.
 *
 * The message check is what keeps this narrow: a *different* missing column still fails
 * loudly, under either code. Widening the code set cannot introduce a false positive the
 * single-code version didn't already have.
 *
 * `PGRST204`'s exact spelling is inferred from PostgREST's documented schema-cache error and
 * from the observed non-match — it has not been captured verbatim from this database. That is
 * why both codes are accepted rather than one being swapped for the other: under either
 * spelling the guard now fires, and if `42703` was right all along nothing regresses.
 */
const MISSING_COLUMN_CODES = new Set(["42703", "PGRST204"]);

export function isUndefinedColumnError(error: { code?: string; message?: string } | null, columnName: string): boolean {
  return !!error?.code && MISSING_COLUMN_CODES.has(error.code) && !!error.message?.includes(columnName);
}
