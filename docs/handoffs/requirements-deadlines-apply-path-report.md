# Requirements & deadlines — apply path, report

**Blocked on migration 0051 being applied — nothing written to any database yet.** Branch
`oryn/requirements-deadlines`, HEAD (this commit). Full gate clean: lint 0, typecheck 0, test
1192/1192 (0 new failures), build succeeds (all 37 routes).

## New prerequisite found: no audit table existed

"Full audit trail for every record including the excluded ones" was the requirement, and no
`requirement_research_queue`/`deadline_research_queue` existed — only `program_research_queue`
does (migration 0044), scoped to programmes. Wrote `supabase/migrations/0051_requirement_
deadline_research_queue.sql`, mirroring `program_research_queue`'s shape exactly (one table per
target table, matching `university_requirements`/`university_deadlines` already being separate
tables rather than one combined table). **Written and committed, not applied**, same discipline
as migrations 0049/0050 today — I don't apply my own migrations. This blocks the actual `--apply`
run until it lands.

## A real bug, caught by comparing two independent implementations against each other

Built `lib/requirements/ingest.ts` and `lib/deadlines/ingest.ts` (decide/apply functions,
mirroring `lib/programs/ingest.ts`'s shape) plus `scripts/ingest-requirements-deadlines.ts` (dry-
run + `--apply`, mirroring `scripts/ingest-university-programs.ts`'s shape). First dry-run against
the new code gave **87 safe requirements, not 77** — silently different from the number already
reported and approved.

Root cause: `university_programs` has two real unique indexes, so when a batch decision pass
computes decisions from one static snapshot (missing same-batch duplicates), the *database itself*
catches the collision at insert time and `applyDecision` downgrades it to `rejected` — a real,
audited, non-silent safety net. **Neither `university_requirements` nor `university_deadlines` has
any DB-level unique index** (confirmed directly against both migrations — `university_requirements`
duplicates are similarity-based, which can't be expressed as a btree constraint anyway). Computing
decisions with `.map()` over a static snapshot — what my first draft did — has no backstop here:
two same-batch duplicates would both decide `accepted`, both actually insert, and the database
would not object. That's real duplicate data, not an audit-trail curiosity.

Fixed by making decision computation itself sequential: each record's decision now updates the
same `existingTitlesByKey`/`existingDeadlineKeys` structures the *next* record in the batch is
checked against, before `--apply` is even considered — so the dry-run count and what actually
lands can no longer disagree. Re-ran: 77/10 duplicate for requirements, 19/0 for deadlines,
matching the already-approved numbers exactly. Removed the now-redundant
`scripts/analyze-requirements-deadlines.ts` (the original classifier) rather than leaving two
tools that could independently drift again — kept `scripts/verify-safe-subset.ts` per your
instruction that it stay as a re-runnable check.

## What's ready to run the moment 0051 is applied

`npx tsx scripts/ingest-requirements-deadlines.ts --apply` — will:
- Re-query live `universities`/`entity_aliases`/`entity_external_ids`/`university_requirements`/
  `university_deadlines` fresh at run time (same "re-query immediately before writing" the
  programme ingestion already does).
- Insert every `accepted` decision (predicted: 77 requirements, 19 deadlines) with
  `structured_rule: null` always, per migration 0020's own documented intent.
- Write an audit row to `requirement_research_queue`/`deadline_research_queue` for **every** one
  of the 180 decided records, accepted or not, with the specific exclusion reason in
  `outcome_detail` — mirroring `program_research_queue`'s "nothing decided vanishes without a
  trace" invariant, including the DB-insert-failure-downgrades-to-`rejected` behavior and
  retry/orphan handling `lib/programs/ingest.ts`'s `applyDecision` already established.

## Files

- `supabase/migrations/0051_requirement_deadline_research_queue.sql` (new, not applied).
- `lib/requirements/ingest.ts`, `lib/deadlines/ingest.ts` (new).
- `scripts/ingest-requirements-deadlines.ts` (new — dry-run + `--apply`).
- `scripts/analyze-requirements-deadlines.ts` removed (superseded).
- This file.
