# Rerun-safety audit — every prepared SQL file, not just Package 14

Package 14 found three real rerun bugs by actually running it twice, not by reading it.
This is the same test applied to everything else already sitting in the repo, per
instruction — `data/morning/`, `docs/*.sql`, `data/research/sql-dry-runs/`. Fixed at the
source in every case, matching how migration 0126 was fixed, not patched in a copy.

## What was found and fixed

**`data/morning/01-migrations-2026-09-03.sql`** — 6 `create table` and 1 `create type`
with no guard (`job_controls`, `quota_grants`, `job_budget_overrides`, `ai_model_pricing`,
`admin_dead_feature_flags`, `admin_product_settings`, `academic_tier` the enum type), 1
`create index` (`quota_grants_user_id_idx`), 2 `create policy` with no preceding `drop
policy if exists` (`select own quota grants`, `admins can read admin_actions`), and 1
`add column` (`profiles.ultra_gift_granted_at`). All ten fixed in place.

**`data/morning/07-migrations-bekleyen-2026-09-03.sql`** — 3 `create table`
(`page_views`, `advisor_generation_locks`, `feedback_reports`), 4 `add column`
(`universities.academic_tier`, `universities.academic_tier_local_name`,
`profiles.curriculum_other_text`, `education_records.curriculum_other_text`), 2 `create
index` (`page_views_created_at_idx`, `feedback_reports_created_at_idx`), 3 `create
policy` with no preceding drop (`owner full access`, and both `feedback_reports`
policies). All twelve fixed in place.

**`data/research/sql-dry-runs/universities/d5-caltech-deadlines-2026-09-04.sql`** — the
plain, unguarded `INSERT` Package 14 found doubling `university_deadlines` on a second
run. Fixed at the source this time, not just inside the package: wrapped in the same
`if not exists (...)` guard the file's own header already asked a human to check by
hand.

**`docs/d8-target-universities-stats-completeness-2026-09-04.md`** — the five
`university_statistics` inserts (LSE/Erasmus/Amsterdam/Boğaziçi/Bocconi) that silently
doubled on a second run because none of them set `stat_year`, and that column is half of
the table's own unique index — `NULL` never conflicts with `NULL`, so the constraint
never fired and the failure produced no error at all. Fixed at the source, matching the
package's own guards exactly.

One incidental find while fixing the two `data/morning` files: `profiles.ultra_gift_
granted_at` is the only column in `01-migrations-2026-09-03.sql` that has NOT actually
been applied live, even though the rest of that same file has — checked directly against
the live database, not assumed. Everything else this pass touched in both files is
already live. Worth the founder knowing this one specific column is still pending,
separate from this audit's own purpose.

## The severity split this pass surfaced

Not every unguarded `INSERT` is the same danger. Checked the two tables carrying the
largest remaining insert volume in this repo (`universities`: 6 country-fill files,
~280 rows; `university_requirements`: 4 files including D1's own, ~460 rows) against
their real live unique indexes:

- `universities_name_country_idx` — `(lower(name), country)`. Both columns are
  structurally always set (every insert in these files supplies them positionally) —
  confirmed by reading, not assumed. A second run of these files would fail loudly
  (`unique_violation`) on the first duplicate row, not silently double anything.
- `university_requirements_university_type_scope_title_idx` /
  `..._program_type_title_idx` — both wrap `scope`/`title` in `coalesce(...)`
  specifically so a null doesn't dodge the constraint, unlike `university_statistics`'
  bare `stat_year`. Same conclusion: loud failure, not silent duplication, on a second
  run.

None of the six `universities`-inserting files or the three additional
`university_requirements`-inserting files (`archive-first-batch-caltech`,
`caltech-reconciled`, `requirements_depth`) got the same explicit `if not exists`
treatment as the four fixes above — they're all already-applied historical record (the
founder's own status doc marks the migrations/data steps that cover them ✅), and a loud
`unique_violation` on an accidental re-paste is a real but far cheaper failure mode than
what D5 and D8 actually did: report success while quietly corrupting data. Flagged here
rather than silently left unchecked, and rather than spending the remaining time hardening
~750 already-applied historical statements against a failure mode that can't happen
silently. Worth a guard pass later if any of these files are ever expected to run again
for a fresh environment (a second Supabase project, a disaster-recovery replay) rather than
as one-time historical record.

## Checked clean, no changes needed

- **`data/morning/02-veri-doldurma-2026-09-03.sql`**, **`08-isim-degisikligi-veri-2026-09-03.sql`**
  — UPDATE-only (opportunities / ai_recommendations / notifications / opportunities /
  student_requirement_evaluations / weekly_actions / weekly_plans respectively). An
  UPDATE re-applying the same value is naturally idempotent by construction.
- **`data/morning/03-firsat-kayit-duzeltmeleri-2026-09-03.sql`** — its one `INSERT`
  targets `admin_action_log`, an append-only audit table by design (same posture as
  `payment_events`/`admin_action_log` elsewhere in this schema) — a fresh row on every
  run is the correct behavior, not a bug.
- **`data/morning/05-universite-bildirim-arka-doldurma-2026-09-03.sql`** — its one
  `INSERT` into `university_notification_log` already carries a `not exists` guard.
- **`data/morning/06-oneri-tekrar-temizligi-2026-09-03.sql`** — DELETE-only. Deleting an
  already-deleted row affects zero rows, not an error.
- **`data/research/sql-dry-runs/university-requirements/retrieved_at_backfill_2026-08-23.sql`**
  — a single UPDATE.
- **`data/morning/09-migrations-2026-09-04.sql`, `11-migrations-ek-2026-09-04.sql`,
  `12-universite-verisi-2026-09-04.sql`, `13-ACIL-ultra-acigi-2026-09-04.sql`,
  `14-toplu-paket-2026-09-04.sql`** — already fully guarded (09/11/12/13 use `if not
  exists` throughout, confirmed by grep across all four; 14 is Package 14 itself,
  already proved twice-runnable directly).
- **`docs/d2-batch2-*.sql`, `docs/d2-visible-priority-*.sql`** — UPDATE-only, already
  proved twice-runnable as part of Package 14's own two-run test.
- **`data/research/sql-dry-runs/universities/top50-qs-fill-2026-09-04.sql`** — already
  proved twice-runnable as part of Package 14's own two-run test.

## Named, not checked — out of scope for this pass

- **`docs/handoffs/ingestion-staging-2026-08-21.sql`** — machine-generated by
  `scripts/stage-programs-ingestion-dryrun.ts`, and its own header says so explicitly:
  "NOT EXECUTED. Review before running... the recommended apply path" is a different
  mechanism entirely (`npm run ingest:university-programs -- <batch>.jsonl --apply`,
  which also writes an audit trail this raw SQL doesn't). This file was never meant to
  be pasted directly — flagging that fact is the useful output here, not adding a guard
  to a deprecated artifact.
- **D1's second QS-top-100 batch** (`docs/d1-qs-top100-fill-2026-09-04.md`) — still
  actively growing (14/19 as of Package 14, more since). Per instruction, checked once
  it's finished, not mid-flight.

## Method, same as Package 14

Static `grep` across every file for the three named patterns first — narrows which files
need it, isn't the verification itself. Every fix above was confirmed against the real
live schema (`pg_indexes`/`information_schema.columns`, read-only) before deciding
whether a gap was real, and the severity split (loud vs. silent) was decided the same
way — by reading the actual index definitions on `universities` and
`university_requirements`, not by assuming they'd behave like `university_statistics`
did. No live write anywhere in this pass.
