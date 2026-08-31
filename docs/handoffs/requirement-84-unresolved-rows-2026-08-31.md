# The 84 unresolvable university_requirements rows — 2026-08-31

CEO-assigned first step of the requirement `verification_state` backfill
([[project_oryn_university_depth_lane]]): before touching the 1,241 rows that DO match a
research record still in the repo, decide what the 84 that don't are — a deleted corpus
file, a different ingestion pathway, or hand-entered — since that answer changes whether
leaving them `unverified` is honest or just convenient.

## The answer, with the evidence that makes it exact rather than inferred

**All 84 rows have `research_record_id IS NULL`.** None of them have a value that used to
match a file and no longer does — that count is exactly zero. So this was never a
"deleted file" question; it's a "was the field ever populated at all" question, and the
answer is precise:

```sql
select
  (select count(*) from university_requirements where created_at < '2026-08-21 18:49:03+00') as rows_before_0056,
  (select count(*) from university_requirements where created_at < '2026-08-21 18:49:03+00' and research_record_id is null) as null_before_0056,
  (select count(*) from university_requirements where created_at >= '2026-08-21 18:49:03+00' and research_record_id is null) as null_after_0056;
-- 84 | 84 | 0
```

`2026-08-21 18:49:03 UTC` is migration `0056_requirement_shape_representability`'s own
applied timestamp — the migration that added the `research_record_id` column in the first
place. Every row created before that instant is null; every row created at or after it is
not, with zero exceptions in either direction. This is the schema boundary itself, not an
inference from timing that happens to line up — the counts match exactly.

## Ruling out the other two explanations named in the brief

- **Not a deleted corpus file.** A deleted-file scenario would produce rows with a real
  `research_record_id` value that simply doesn't resolve against anything currently on
  disk. Zero such rows exist. Every unresolved row has no id to look up at all.
- **Not hand-entered or dubious.** The 84 rows' `source_url` domains are all real,
  official sources: `ucl.ac.uk` (10), `imperial.ac.uk` (8), `international.ku.edu.tr` (8),
  `lse.ac.uk` (7), `undergraduate.study.cam.ac.uk` (6), `study.ed.ac.uk` (5),
  `apply.kfupm.edu.sa` (4), `admissions.duke.edu` (4), `admissions.utexas.edu` (4),
  `tcd.ie` (4), `gla.ac.uk` (4), `bogazici.edu.tr` (3), plus `birmingham.ac.uk`,
  `kcl.ac.uk`, `ethz.ch`, `tum.de`, `ox.ac.uk`, `sabanciuniv.edu`, `bilkent.edu.tr`,
  `ets.org`, `metu.edu.tr`, `kfupm.edu.sa` — 22 distinct official university/testing
  domains, no junk, no placeholders. The requirement text itself reads as genuine research
  ("Test of Mathematics for University Admission (TMUA)", "A minimum diploma score of 28
  out of 45. Minimum one HL subject related...", exact grade strings like "A*AA with an A*
  in Mathematics"). This is real, correctly-sourced early-project research — it simply
  predates the column that would let it be traced back to its original record.
- **Timing corroborates it further**: `created_at` for all 84 clusters into three tight
  batches — 2026-08-16 11:27 (one transaction, identical millisecond timestamp, 5 rows,
  all KFUPM), 2026-08-18 14:54:46 (one transaction, identical millisecond timestamp, ~40
  rows across UCL/Imperial/LSE/Cambridge/Edinburgh/TUM etc.), and 2026-08-21 11:03–11:07
  (individual timestamps a few seconds apart — a script processing records one at a time,
  not a batch insert — the same afternoon migration 0056 was applied at 18:49). All three
  read as genuine ingestion sessions from before the current corpus-JSONL-tracking
  convention existed, not one-off manual entries.

## Decision

**Leave all 84 rows at `verification_state = 'unverified'`** — their current, live value,
unchanged. This matches the CEO's own stated prior, and the evidence above is why it's
the honest answer rather than the convenient one: a row whose provenance genuinely cannot
be reconstructed should read as exactly that — unknown — not be inferred into
`verified_current` on the strength of "the domains look fine so it's probably current".
Fuzzy-matching these 84 against nearby research records by title/source-url similarity
was considered and rejected: a false match would produce a confident, wrong classification
for a row that is currently, correctly, uncertain — trading a visible unknown for an
invisible wrong one.

No `university_requirements` row was modified by this branch. The only change is a
`comment on column` migration (`0069_research_record_id_predates_column.sql`) recording
this finding directly on the schema, so a future reader asking "why do some rows have no
research_record_id" finds the answer at the column, not by re-running this investigation.

## Next

The 1,241 resolvable rows (backfilling their real `verification_state` from the research
record each one already matches) is a separate branch, per the CEO's explicit instruction
not to fold the two together.

## Verification

Read-only investigation; no application code touched. `npm run lint`, `npm run
typecheck`, `npm run test`, `npm run build` all green (no source changes to break) on
branch `oryn/req-84-unresolved-2026-08-31`, branched from `origin/main` post-merge
(`7dcf43d8`). The one live change (the column comment) was applied directly via the
Supabase migration tool and is captured in the migration file committed on this branch.
