# Fix the ten stale "not applied" migration headers — 2026-09-02

CEO's direct follow-through on the migration audit: correct all ten stale headers, comment-only,
matching 0062/0063's own established "STATUS, corrected ... APPLIED" format. No SQL statement
touched — verified via `git diff` containing zero non-comment lines across all ten files.

## What changed

Ten migrations — 0057, 0059, 0060, 0061, 0064, 0065, 0076, 0077, 0083, 0084 — each got a
"STATUS, corrected 2026-09-02" note inserted immediately after their own stale claim, dated,
citing `docs/migration-audit-applied-vs-written-2026-09-02.md`, and naming the specific
`information_schema`/`pg_catalog` check that confirmed it (not a generic "it's applied now").

**A real distinction surfaced while writing these, not assumed uniform across all ten:**
checking the *code* side, not just the schema side, for each of the four "degrade column"
migrations (0076/0077/0083/0084) found they don't all match:

- **0077, 0083 — schema and code both confirmed working.** `lib/plan/persist.ts` and
  `lib/jobs/run-with-tracking.ts` both already attempt the real write, with their
  `isUndefinedColumnError` catch as a fallback for the unapplied case, not the normal path. Once
  the column landed, real values started writing with zero code change needed.
- **0084 — same outcome, different mechanism.** `lib/profile/cv-import.ts` writes
  `source: "cv_import"` unconditionally, no defensive catch at all. Works now that the column
  exists; would have failed the whole insert outright, not degraded, had it run before the
  migration applied.
- **0076 — a real, separate gap, not just a stale comment.** `lib/ai/usage.ts`'s `logAIUsage`
  still omits `degraded`/`degrade_reason` from its insert payload entirely — the comment
  explaining the omission is still there, but nobody removed it or added the fields once the
  migration landed. The schema gap this migration closed is closed; the code gap it was written
  to enable is not. Documented precisely in 0076's own corrected note rather than folded into
  the same "APPLIED" claim the other three get — this one needs a real code follow-up,
  correctly flagged, not fixed here (comment-only scope).

## `lib/supabase/errors.ts` — the corrected rule, made permanent

Added a new doc comment on `isUndefinedColumnError` stating the rule precisely: it's wildcard
vs. named `.select()`, not read vs. write. A wildcard select silently omits a missing column
(needs `?? default`); a select that explicitly names the column triggers the same PostgREST
schema-cache error a write does (this function is correct there). Cites both the correct example
(`lib/tier/plan-tier.ts`, wildcard, `?? default`) and the correct-but-easy-to-doubt example
(`lib/notifications/create.ts`, named select, this function) so the distinction is checkable
against real code, not just asserted.

## 0090's write path — hardened against a well-intentioned "fix"

Added a note directly in 0090's own migration file explaining why
`updateNotificationPreferences` fails loudly (a real error to the student) rather than
degrading silently, and why that's correct rather than inconsistent with the read paths around
it: it's the one write in this package a student directly and knowingly triggers, and a
swallowed failure would let them believe a preference saved when it didn't. Placed in the
migration file itself, not only in the audit doc, so it survives independently of anyone reading
that doc first.

## Gates

`npm run typecheck` / `npm run lint` / `npm run test` — [see commit]. No `next build` per current
policy. Never ran `npm ci`/`npm install` in this worktree — symlinked the existing
`node_modules` from the main checkout, per the new environment rule.
