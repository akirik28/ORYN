# Migration 0050 — report

**Written and committed, NOT applied to any database by this session.** Per the Org Leader's own
division of labor ("I'll apply it, then you run the ingestion"), the actual apply step is theirs.
Branch `oryn/priority-country-ingest`, forked from `main@926074e`.

## Independent verification, not taken on trust

Before writing anything, I re-ran the Org Leader's own claims against the live `oryn-qa-scratch`
project myself (confirmed this is the right project — its ref, `qtcvcflzxbuagvvwahhu`, matches
`NEXT_PUBLIC_SUPABASE_URL` in `.env.local` exactly):

- **`pg_indexes` query, verbatim match**: `university_programs_dedup_idx` is `UNIQUE
  (university_id, normalized_name, COALESCE(degree_level, ''))`; `university_programs_university_name_idx`
  is `UNIQUE (university_id, lower(name))`. Neither mentions `language_of_instruction`. Confirmed
  exactly as reported.
- **NULL `language_of_instruction` count**: 726 of 4540 live rows. Confirmed exactly (726/4540).
- **New finding, not in the original report**: zero live `(university_id, normalized_name)` groups
  currently have more than one row (`GROUP BY ... HAVING count(*) > 1` returns empty). This
  directly answers "query for rows that would violate the new constraints" for both changes in
  this migration — there is nothing live for either the widened `dedup_idx` or the dropped
  `university_name_idx` to newly admit, because no such grouping exists at all today.
- **Audit-trail check**: `program_research_queue` has exactly one `rejected` row total (an
  unrelated HTTP-404 case), zero mentioning a unique-constraint/duplicate-key violation. The
  DB-layer collision problem hasn't manifested in practice yet — consistent with your own read
  ("it hasn't bitten because most catalogues name programmes distinctly") — the priority-country
  batch is expected to be the first real trigger.
- **Checked the "supersedes" claim itself, not just accepted it**: read `lib/programs/normalize.ts`
  directly. `normalizeProgramName()` only ever strips punctuation and collapses whitespace on top
  of lowercasing — it never adds distinguishing information. So any two rows sharing
  Postgres `lower(name)` are structurally guaranteed to also share `normalized_name` (same
  deterministic transform applied to identical strings). That makes `dedup_idx`'s
  `normalized_name + degree_level [+ language]` check a strict refinement of `university_name_idx`'s
  protection, not a different, disjoint one — nothing it catches today is lost by dropping it.
  This holds independent of the empirical zero-collision check above; both point the same way.

## What I did NOT test

I did not execute the migration anywhere — not against live, not against a throwaway branch.
`create_branch` exists and would have let me test in isolation, but it requires `confirm_cost`
first (a real spend), and per this session's own standing rule that only the founder can approve
spending a payment method on file — and they're not reachable right now — I didn't call it. The
migration is reviewed carefully (the exact `COALESCE(...)` pattern already runs successfully in
the live `dedup_idx` today, so this isn't new syntax) and grounded in the read-only checks above,
but "I read it carefully" is not the same claim as "I ran it." Flagging the distinction rather
than letting it blend into the rest of the verification.

## The migration

`supabase/migrations/0050_program_dedup_index_language.sql`:
- Drops `university_programs_university_name_idx` (superseded, per the reasoning above).
- Drops and recreates `university_programs_dedup_idx` adding `COALESCE(language_of_instruction, '')`
  as a fourth key column.

Full reasoning, including why a disambiguating name suffix was rejected as a workaround, is in
the migration file's own header comment — written to be the durable record, not duplicated here.

## Collateral fix: a seed file's `ON CONFLICT` would have silently broken

`supabase/seed_programs_batch1_programs.sql` (130 already-live rows from the Drive-corpus batch)
has `on conflict (university_id, normalized_name, coalesce(degree_level, '')) do nothing;` —
targeting the *old* 3-column index verbatim. Postgres requires an `ON CONFLICT` target to match a
live unique index exactly, so this file would error outright if ever re-run (e.g., rebuilding a
database from scratch by replaying every seed file in order) after migration 0050 lands. Updated
its `ON CONFLICT` clause to the new 4-column signature. Verified this is a genuine no-op for the
actual insert: all 130 rows in the file have `language_of_instruction = NULL` (checked directly —
zero exceptions across all 130 rows), so the widened clause doesn't change what gets inserted,
only what it matches against. Grepped the rest of `supabase/` for the same pattern; no other file
has it.

## Files changed

- `supabase/migrations/0050_program_dedup_index_language.sql` (new, not applied).
- `supabase/seed_programs_batch1_programs.sql` (`ON CONFLICT` column list updated).
- This file.
