# ingest-fixes — defects 6 & 7, report

Branch `oryn/ingest-fixes`, forked from `main@3828bd3` (before the geography-migration and
FR/IT/ES/CH-catalogue merges landed on `main` — see "Full gate" below for why this branch's raw
test count isn't directly comparable to other branches' reported floors).

**Full gate clean**: lint 0, typecheck 0, **test 1162/1162** (0 failures; 7 new tests added by
this session — see "Tests" below), build succeeds (`next build`, all 37 routes generated).

## Defect 6 — silent data loss, root cause and fix

**Root cause**: `scripts/ingest-university-programs.ts`'s dedup key was
`${university_id}|${normalized_name}|${degree_level ?? ""}` — three parts, no language. A
legitimate same-subject, different-language-of-instruction pair (a normal, common shape at
Dutch/German universities — e.g. a Dutch-taught and an English-taught track of the same
programme) collided on this key. The second record silently read as a `duplicate` and was never
inserted, with zero trace in either `university_programs` or `program_research_queue`.

**Fix**: `programDedupKey()` (`lib/programs/ingest.ts:128`) is now a 4-part key, adding
`language_of_instruction`. `language_of_instruction` is a real, structural fact distinguishing
two separately-enrollable programmes, not cosmetic metadata — confirmed the column already
exists (`supabase/migrations/0006_universities.sql:41`), so this needed no schema change, only
widening the key that reads/writes it.

**Second, related failure mode also closed**: independent of the dedup-key root cause, a record
`decideIngestion` decided `accepted` from a pre-computed `existingKeys` snapshot could still fail
the database's own unique index at insert time (the snapshot can't see a collision another
in-flight batch member or a concurrent process creates). The old script `continue`d past the
`program_research_queue` insert entirely in that case — the record vanished from *both* tables,
not just `university_programs`. Fixed as part of the same invariant below: every decided record
now always gets a queue audit row, regardless of what happens to the program insert.

## Defect 7 — orphaned audit trail, fix

The queue insert (`program_research_queue`) is the *only* audit trail for a decision. Losing it
after the program row already landed is worse than losing the program row itself: a batch
re-run reads the landed program row back as `duplicate` (its key now satisfies `existingKeys`)
and never retries the missing queue row — a permanent, non-self-healing orphan.

**Fix**: the queue insert now retries up to 3 times (linear backoff, 500ms × attempt) before
giving up. If it still fails after a *successful* program insert, that's reported distinctly as
`orphaned: true` (not just a generic queue-insert failure) so the caller can log it loudly and a
human can reconcile it manually — it will not fix itself on a re-run.

## Refactor: `applyDecision()` extracted for testability

Previously this logic (insert program → always insert queue row, downgrading outcome on
failure → retry the queue insert → detect orphan) lived inline in the apply loop of
`scripts/ingest-university-programs.ts`, un-unit-testable without a real Supabase connection.

Extracted to `lib/programs/ingest.ts`:
- `ProgramWriteClient` — narrow interface (`insertProgram`, `insertQueueRow`) the apply step
  needs from a DB client, mockable in tests. The same "inject the dependency, test the pure
  logic" shape `decideIngestion` already used for `universities`/`existingKeys`.
- `applyDecision(record, decision, batchId, client, queueRetryAttempts = 3)` — the extracted,
  now fully unit-tested logic itself. Returns `{ accepted, orphaned, programInsertError,
  queueInsertError }`.

`scripts/ingest-university-programs.ts`'s apply loop is now a thin real-`admin`-client
`ProgramWriteClient` implementation plus a call to `applyDecision` per record, accumulating
`accepted`/`orphaned` counts from the result for the same console summary it printed before.

## Tests

Fixed two pre-existing tests that hardcoded the old 3-part key string format (they'd have failed
against the widened key): the `duplicate`-detection test and the idempotency test now build their
keys via `programDedupKey()` itself rather than a hand-rolled string, so they can't drift from the
function they're testing again.

Seven new tests:
- `decideIngestion`: a same-name/same-degree-level/different-language pair both accept
  independently (the actual defect-6 reproduction, using EPFL's `.ch` domain + `websiteUrl` hint
  rather than MIT, so `official_program_url` can point at two real distinct paths without
  tripping `malformed_source`); a same-name/same-degree-level/**same**-language repeat is still
  correctly flagged `duplicate` (confirms the widened key didn't stop deduplicating the case it
  always caught).
- `applyDecision`: a normal accepted decision writes both rows with `outcome: "accepted"`; a
  program-insert failure still writes a queue row with `outcome` downgraded to `"rejected"` and
  the real DB error in `outcome_detail` (defect 6's core invariant); a transient queue-insert
  failure recovers on retry without being marked orphaned; a queue insert that fails on *every*
  retry after a successful program insert is reported as `orphaned: true` (defect 7's core
  invariant); a non-accepted decision (`unresolved_university`) never calls `insertProgram` but
  still gets its own queue audit row.

## Files changed

- `lib/programs/ingest.ts` — `programDedupKey()` widened to 4 parts; `ProgramWriteClient`,
  `ProgramQueueRowInput`, `ApplyDecisionResult`, `applyDecision()` added.
- `scripts/ingest-university-programs.ts` — header docstring updated; `ExistingProgramRow` gains
  `language_of_instruction`; SELECT and `existingKeys` construction updated to match; apply loop
  replaced with a `ProgramWriteClient` + `applyDecision()` call.
- `__tests__/programs/ingest.test.ts` — 2 tests fixed, 7 tests added (details above).
- This file.
