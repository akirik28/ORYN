-- University Intelligence Spine, Phase 2 (docs/handoffs/claude-a-university-spine.md):
-- non-destructive resolution for `universities` rows that are the SAME real-world
-- institution inserted twice.
--
-- Why not just delete the loser row: `university_programs` and `university_requirements`
-- (owned by the parallel programs/opportunities workstream) both reference
-- universities(id) `on delete cascade`. A duplicate pair is not guaranteed to be empty on
-- both sides forever (four of the eight pairs resolved this pass already carry real,
-- non-trivial program data on one side), so any automated process that deletes a
-- `universities` row risks silently cascading away another workstream's data the moment a
-- row it assumed was empty stops being empty. Superseding is additive, reversible (clear
-- the two columns to undo), and needs no coordination with what else references the row.
--
-- Why not just merge_canonical_entities() and stop there: that function (migration 0038)
-- merges the IDENTITY layer only — aliases, external ids, evidence — and repoints
-- universities.canonical_entity_id, but by design never touches the `universities` rows
-- themselves. Two duplicate universities rows both end up pointing at the same
-- (merged) canonical_entity_id, which is exactly the state this migration's columns are
-- for: one of them is the product-facing canonical row, the other is marked superseded so
-- listing/search surfaces stop showing both as separate cards.

alter table public.universities
  add column if not exists duplicate_status text not null default 'canonical'
    check (duplicate_status in ('canonical', 'superseded')),
  add column if not exists superseded_by_id uuid references public.universities(id) on delete set null;

alter table public.universities
  add constraint universities_superseded_consistency
    check (
      (duplicate_status = 'canonical' and superseded_by_id is null)
      or (duplicate_status = 'superseded' and superseded_by_id is not null and superseded_by_id <> id)
    );

comment on column public.universities.duplicate_status is
  'canonical (default) or superseded. A superseded row is a confirmed duplicate of superseded_by_id — same real-world institution, kept (never deleted) so nothing that references it silently loses data, but excluded from listing/search surfaces.';
comment on column public.universities.superseded_by_id is
  'Set only when duplicate_status=''superseded''. Points at the surviving canonical row for the same institution.';

-- Listing/search queries filter on duplicate_status, not the other way around, because
-- superseded rows are rare (single digits) and this keeps the common-case query plan a
-- plain index lookup rather than a partial-index dependency.
create index if not exists universities_duplicate_status_idx on public.universities (duplicate_status);
