# Program-linking, exact match or null — the pipeline fix and the count

Branch `oryn/program-linking-2026-09-01`. The root cause found while building the UK
October-deadline rows: `lib/deadlines/ingest.ts` and `lib/requirements/ingest.ts` both
hard-coded `program_id: null` on every accepted row — `program_name` was accepted into the
JSONL contract and silently dropped at write time, for every record either pipeline has
ever ingested. That's why 0/465 deadlines were program-linked, structurally, not from a
research gap. CEO's instruction: fix it, exact match or null, never a best guess, don't
backfill, and separately report (don't act on) how many of the existing rows would link if
replayed.

## The rule, and where the line actually is

`lib/acquisition/program-identity.ts` (new, shared by both pipelines so they can't quietly
disagree): `resolveExactProgram(universityId, programName, programs)`. The one normalization
allowed is trimming surrounding whitespace — nothing else. No case-folding, no substring
matching, no stripped degree-type suffix ("Medicine" vs "Medicine MBBS" do not match), no
similarity scoring, no threshold of any kind. Three outcomes:

- Exactly one program at that university has that exact name after trimming → linked.
- Zero → null, with a stated reason ("no exact-match program at this university").
- Two or more → null, with a stated reason ("ambiguous, refusing to guess") — found this is
  not hypothetical: 10 real cases exist in the live `university_programs` data today (see
  the count below), where two rows at the same university share one exact name.

Both `decideRequirementIngestion` and `decideDeadlineIngestion` gained a `programs`
parameter carrying the exact-match pool, and a `programLinkNote` field on their decision
result carrying the reason string when an accepted row's `program_id` came back null despite
a non-empty `program_name` — the thing to log, per the instruction. The parameter defaults
to an empty array, so it's genuinely optional, not just optional-looking: an empty pool can
never produce a match, so every pre-existing caller — the ~8 old one-off batch scripts,
both test files' existing suites — compiles and behaves exactly as it did before this
feature existed, without being touched. Only `scripts/ingest-requirements-deadlines.ts` now
fetches the real `university_programs` table (id, university_id, name — the whole table,
17,046 rows, matching scoped to `universityId` at resolution time) and passes it through.
It also now logs a one-line warning per accepted row whose `program_name` didn't resolve,
and a summary count at the end of a run.

## The count — read-only, nothing replayed, nothing written

`scripts/report-program-link-potential.ts`. Method: for every live row with a
`research_record_id`, find that id's own record in the research corpus (same
file-classification and shape-routing the real ingestion script uses, so this can't
silently disagree with what an actual replay would see), read its `program_name`, run it
through the same `resolveExactProgram` the pipeline now calls. No DB writes at all.

```
Requirements (1325 live rows):
  would link (exact match):                          97
  named a program, no exact match:                   308
  named a program, ambiguous:                          5
  program_name absent/empty:                          831
  research_record_id set, no corpus record found:       0
  no research_record_id at all:                        84

Deadlines (470 live rows — 465 + the 5 UK rows from the previous branch, already merged):
  would link (exact match):                            35
  named a program, no exact match:                     80
  named a program, ambiguous:                            5
  program_name absent/empty:                           324
  research_record_id set, no corpus record found:        0
  no research_record_id at all:                         26

TOTAL: 132 of 1,795 would link.
```

**What this actually says.** 132 is not nothing, but it is not most of it either — about
7.4%. The dominant reason isn't ambiguity or a near-miss, it's that 1,155 of 1,795 rows
(64%) never captured a `program_name` in the first place — most requirement/deadline
research in this corpus was written at the university level, not the course level, which
is a reasonable default for most facts (a language requirement or a general deadline
usually IS university-wide) but means exact program-linking has a low ceiling against
today's corpus regardless of matching strategy. The next-largest bucket — 388 records (22%)
that DID name a program but don't exact-match anything in `university_programs` — is the
more actionable one: either the program genuinely isn't in `university_programs` yet, or
it's there under a differently-formatted name (a real, separate program-catalog-completeness
question, not a matching-logic one). **This does not, on its own, unlock most of the 47
exception-shaped rows from the UK-deadlines report** — those were found by reading text for
a named-but-uncaptured exception, which is a different problem than "was a program_name
captured and does it match."

The 84-requirements/26-deadlines "no research_record_id at all" buckets are the same rows
this lane already investigated and left `unverified` in an earlier task (they predate the
column that carries the id) — expected, not new.

## What deliberately did NOT happen

- **No backfill.** Every number above is a projection from the corpus, not a write. All
  1,795 existing rows keep whatever `program_id` they already had (null, for all of them,
  since this fix only reaches new ingests).
- **No fuzzy matching, no threshold, no `ilike`.** Checked this against my own first
  instinct once, on purpose: whether to case-fold or strip common suffixes before comparing.
  Both are real normalizations with real judgment calls behind them (which suffixes count?
  does folding case ever cross two genuinely different programs?) — exactly the kind of
  thing the instruction says to stop and make exact instead of justifying. Trimming
  whitespace is the one exception, and it's documented as exactly that in the resolver's
  own comment, not left for a future reader to wonder whether it was deliberate.
- **The shared pipeline's other behavior is unchanged.** Every other decision path
  (university resolution, dedup, source-authority, verification-state handling) is
  untouched; the diff is additive — a new parameter, a new field on the decision result, one
  resolution call before the row literal is built.

## Verification

- `npm run lint` — clean. `npm run typecheck` — clean (across the whole repo, including
  every old caller of these two functions). `npm test` — 189 files / 2864 tests passed
  (20 new: 10 for the resolver in isolation, 5 integration tests per pipeline covering
  linked / no-match / ambiguous / absent-program_name / no-programs-pool-passed). `npm run
  build` — succeeded.
- Ran the existing 68 requirements/deadlines ingest tests unchanged first, before writing
  anything new, to establish a clean baseline — all 68 passed both before and after.
- Ran the count report live against the real database (not a fixture) — 401 on the first
  attempt (transient — retried once, succeeded identically both times after, so not a
  symptom of anything wrong with the query itself).
- No `opportunities` table touched. No existing `university_requirements` or
  `university_deadlines` row was written to.

## Scope boundaries (for whoever picks this up next)

- The 10 ambiguous-name cases in live `university_programs` (5 pairs, one per table's tally)
  are a real, small data-quality finding in the programs catalog itself — worth a look, not
  done here (out of scope for a linking-logic fix).
- The 388 named-but-unmatched program_name values are the more useful lead if anyone wants
  to raise the 132 number later — either the program needs adding to `university_programs`,
  or an existing one needs its name reconciled to what research recorded. Neither was
  attempted here.
- Whether to deliberately backfill any of the 132 that WOULD link is explicitly the
  founder's or CEO's call to make later, not something this branch decided.
