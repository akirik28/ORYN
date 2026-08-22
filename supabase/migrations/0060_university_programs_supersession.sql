-- Programme-catalogue supersession: mirrors migration 0043's universities.duplicate_status /
-- superseded_by_id shape, adapted for a many-to-one relationship instead of 0043's one-to-one.
-- UNAPPLIED -- proposal only, see docs/handoffs/superseded-university-programs-2026-08-22.md.
--
-- Why this is needed: three US universities (Michigan, CMU, UCLA) each had every stored
-- `university_programs` row pointing at one shared institution-wide index/listing page --
-- 160 rows total (Michigan 72, CMU 52, UCLA 36). A 2026-08-22 re-research pass produced real
-- per-programme rows for all three (405 total: Michigan 154, CMU 106, UCLA 145) that the
-- ingestion pipeline already inserted alongside the old ones, since insertion has no concept
-- of supersession. Both sets are live today; a student browsing any of these three universities
-- sees the thin index-pointing rows mixed in with the real ones.
--
-- Why not migration 0043's exact shape: 0043's `superseded_by_id` is a single FK because it
-- resolves a ONE-TO-ONE identity duplicate -- two `universities` rows are the same institution,
-- so one FK to "the other row" is the whole relationship. This is a different shape: one coarse
-- stale row here is replaced by MANY granular real rows at once (e.g. Michigan's single index
-- row has no single successor -- it's superseded by 154 different programme rows together), so
-- a single `superseded_by_id` FK would force picking one arbitrary "winner" among many unrelated
-- rows, misrepresenting the relationship. The real one-to-one entity in this relationship is the
-- *replacement batch*, not any individual new row -- so the pointer here targets the batch that
-- did the replacing (program_research_queue.batch_id, already a free-text field there and not
-- itself a FK'd primary key anywhere in the schema -- stored the same way here, for
-- traceability, not referential enforcement).
--
-- Why not hard delete: `program_research_queue.promoted_program_id` references
-- `university_programs(id)` with `on delete no action` -- a hard delete of any of the 160 rows
-- is BLOCKED outright by that FK unless the queue's own audit rows are mutated first, which
-- would erase the historical record that these rows were once genuinely accepted and promoted.
-- Superseding is additive and reversible (clear the columns to undo); hard delete is neither,
-- and live-checked has zero student-facing references anyway (target_universities,
-- university_requirements, university_deadlines, university_program_placement_cycles all
-- zero) -- so this is a product-quality call, not a data-safety one.
--
-- Column naming deliberately diverges from 0043's `duplicate_status`: these rows are not
-- duplicates of each other (a duplicate is the same fact stored twice; an index-page row and a
-- per-programme row are different facts at different granularity, one thin and one real), so
-- `program_status` names the actual relationship instead of borrowing a name that would be
-- technically wrong here.

alter table public.university_programs
  add column if not exists program_status text not null default 'active'
    check (program_status in ('active', 'superseded')),
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by_batch_id text,
  add column if not exists superseded_reason text;

alter table public.university_programs
  add constraint university_programs_superseded_consistency
    check (
      (program_status = 'active' and superseded_at is null and superseded_by_batch_id is null)
      or (program_status = 'superseded' and superseded_at is not null and superseded_by_batch_id is not null)
    );

comment on column public.university_programs.program_status is
  'active (default) or superseded. A superseded row is a confirmed-stale record (e.g. an institution-wide index page inserted as a stand-in for real per-programme rows) that a later, more granular research pass replaced -- kept, never deleted, so program_research_queue''s own audit trail (promoted_program_id) and any other FK referencing it stays intact, but excluded from listing/browse surfaces.';
comment on column public.university_programs.superseded_by_batch_id is
  'program_research_queue.batch_id of the replacement research batch. Not a FK (batch_id carries no unique constraint), since a superseded row''s actual successor is a whole batch of new rows, not any single one of them -- see migration comment for why a single-row pointer (0043''s shape) does not fit this relationship.';
comment on column public.university_programs.superseded_reason is
  'Human-readable note on why this row was retired, e.g. "shared an institution-wide index URL with 71 other rows; replaced by 154 real per-programme rows in batch us_programs_michigan_2026-08-22.jsonl_2026-08-21".';

-- Listing/browse queries filter on program_status, not the other way around, matching 0043's
-- own reasoning: superseded rows are the rare case (160 today, out of ~12,000+ live programme
-- rows), so this keeps the common-case query plan a plain index lookup.
create index if not exists university_programs_status_idx on public.university_programs (program_status);
