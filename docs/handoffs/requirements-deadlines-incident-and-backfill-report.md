# Requirements/deadlines apply — incident, backfill, final reconciliation

Branch `oryn/requirements-deadlines`. Full gate clean: lint 0, typecheck 0, test 1192/1192,
build succeeds.

## What happened

The real `--apply` run hit a schema mismatch: `requirement_research_queue`'s live columns
(`requirement_type_input`, `scope_input`) didn't match what this session's code sent
(`category_input`, `requirement_category_db_input`) or what migration 0051 originally specified.
Root cause (confirmed by the Org Leader): the applied SQL for that one table was composed from
the `deadline_research_queue` pattern rather than read from the drafted requirements-specific
block — `deadline_research_queue` matches the drafted file exactly, `requirement_research_queue`
doesn't. Every one of the 131 requirement audit-row writes failed as a result; 43 had already
landed in `university_requirements` before their audit write failed (orphaned); a second,
independent problem — `university_requirements_university_type_scope_idx` (migration 0042) is
narrower than the data (see the companion collision analysis) — meant 36 of the 79 "accepted"
decisions never landed at all, correctly rejected by the database but, same as the 43, with no
audit trail due to the column mismatch. Deadlines were entirely unaffected: 49/49 audited, 19/19
landed, exactly as predicted, table now at 26.

## Recovery, in order

1. **Verified before touching anything further** — `pg_indexes`/`information_schema.columns`
   queried directly, not assumed, confirming both the collision-index shape and the actual live
   `requirement_research_queue` columns.
2. **Stopped and reported** rather than guessing at reconciliation on a table someone else had
   just (unknowingly) redesigned — see the earlier message; this is exactly the "stop on
   divergence" case the whole procedure exists for.
3. **Updated migration 0051's file** to match what's actually live, with a header note
   recording the divergence and why, so the committed migration and reality agree again and the
   next reader isn't misled the way this session was.
4. **Fixed `lib/requirements/ingest.ts`** to use the real column names
   (`requirement_type_input`/`scope_input`), consolidating `category`/`requirement_category_db`
   into one column (`requirement_category_db`'s value — the actual DB enum — kept;
   `category`, the founder-brief's coarser taxonomy, remains fully recoverable from
   `raw_payload`, just not its own column).
5. **Built `scripts/backfill-requirement-audit.ts`** — re-derives the exact same 131 decisions
   the real run made (byte-identical inputs: same universities, same pre-existing 41 requirements
   isolated by timestamp — the incident's 43 new rows are cleanly separable, `created_at` before
   vs. from 2026-08-21 11:03 onward), matches the 79 "accepted" ones against what's actually live
   by `(university_id, requirement_type, title)` to tell landed from constraint-rejected, and
   writes the correct audit row for all 131. **Self-verifying**: refuses to write anything unless
   the re-derived counts match the known-good reconciliation exactly (79 accepted / 43 landed /
   36 rejected / 0 unclaimed) — checked before any write is attempted.
6. **A second, smaller divergence surfaced mid-backfill**: the live `outcome` CHECK constraint
   also doesn't include `'superseded'` (present in the drafted migration, not in what's live —
   same applied-vs-drafted class of gap, confirmed directly against `pg_constraint`). Mapped the
   7 affected rows to `not_ingestible` for the backfill — `outcome_detail` still states exactly
   why ("a newer record in this same corpus explicitly supersedes this one"), so nothing is lost.
   Not fixing the constraint itself right now; flagging it rather than adding another migration
   unilaterally mid-recovery.
7. **Backfill script made idempotent** after its first run partially failed on exactly those 7
   rows — re-running it skips anything already written for the batch_id rather than risking
   duplicate audit rows.

## Final state, independently verified against the live DB

- `university_requirements`: **84** (41 + 43).
- `requirement_research_queue`: **131 rows**, all for `batch_id = 'requirements-deadlines_2026-08-21'` —
  accepted 43, rejected 36, unresolved_university 23, not_ingestible 17 (10 original +
  7 superseded, mapped), duplicate 8, malformed_source 4. Sums to 131.
- **Zero orphans**: every `university_requirements` row created during the incident has a
  matching `requirement_research_queue` row with `promoted_requirement_id` pointing at it,
  confirmed by direct anti-join query, not assumed.
- `university_deadlines`: **26** (7 + 19), `deadline_research_queue`: **49/49**, unaffected
  throughout.

## Files

- `supabase/migrations/0051_requirement_deadline_research_queue.sql` — updated to match the
  live schema, divergence documented in the header.
- `lib/requirements/ingest.ts` — column names fixed to match live; `scope` now threaded through
  end to end (`requirementDedupKey` includes it, matching the real DB constraint's own shape).
- `scripts/backfill-requirement-audit.ts` — new, one-time reconciliation tool, kept for the
  record rather than deleted, in case its self-verification pattern is useful precedent.
- `docs/handoffs/requirement-scope-constraint-collision-analysis.md` — the requested breakdown
  of what the 36 collisions actually are.
- This file.
