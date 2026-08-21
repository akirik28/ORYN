-- Per-cycle admission placement statistics for university_programs — quota, minimum
-- score/rank, and outcome, one row per (program, cycle). Read the actual research text
-- before designing this (39 records with quota/score/rank data, 399 with a YOK programme
-- code, across independent_batch37-44_2026-08-21.jsonl), not designed from the brief's
-- description alone. See docs/handoffs/yok-atlas-placement-schema-decision.md for the full
-- evidence and what this deliberately does not represent.
--
-- Why a new table and not columns on university_programs: a student reasoning about whether
-- a programme is in reach needs this year's cutoff against last year's trend, not just the
-- latest number overwriting the one before it. Columns on university_programs would destroy
-- exactly that history on the next cycle's re-ingestion. Keyed (program_id, cycle_year) so
-- every cycle survives independently.
--
-- Why a plain wide table and not university_profile_metrics' existing metric_code/value_*
-- EAV shape (migration 0038): that table is deliberately open-ended (arbitrary university-
-- level metrics, growing over time) and university-scoped, not program-scoped. This table's
-- fields are a small, fixed, evidenced set (quota, score_type, status, rank, score,
-- programme_code) where the load-bearing fact — minPuan and basariSirasi are null together,
-- exactly when a quota goes unfilled — needs a single-row CHECK constraint to enforce
-- directly. Spreading that across separate metric_code rows would need a cross-row trigger to
-- enforce the same invariant EAV can't express as a plain CHECK. Different shape for a
-- genuinely different kind of fact, not an inconsistency.
--
-- placement_status has exactly two values, not three: 'filled' | 'unfilled'. "Not yet
-- captured" is deliberately NOT a third status value — it is the absence of a row for that
-- (program_id, cycle_year), the same way this schema already treats missing information
-- elsewhere. Inserting a placeholder row to mark "we don't know yet" would mean writing a row
-- for every program × every cycle Oryn hasn't researched, which nothing here does and this
-- migration does not start doing.
--
-- Evidence for the null-together invariant, checked across all 399 records with a programme
-- code in independent_batch37-44 (every Turkish research batch ingested or pending as of
-- 2026-08-21), not sampled: 368 filled (rank AND score always both present), 31 unfilled
-- (neither present, worded three different ways across different research passes —
-- "UNFILLED", "no 2026 placement recorded (unfilled quota) / n/a" — same underlying fact,
-- inconsistent free-text phrasing, exactly the kind of thing this table exists to stop
-- happening going forward). Zero partial cases (rank without score or vice versa) found.
--
-- yok_programme_code is stored here, verbatim, never parsed — YOK's own official per-
-- programme identifier (e.g. "108410354"), confirmed stable and genuinely distinct across
-- real programmes that university_programs' own dedup key cannot currently separate (the
-- three Istanbul University "Isletme" listings each carry a different code). NOT added to
-- university_programs itself and NOT used to widen university_programs_dedup_idx or change
-- decideIngestion() in this migration — that would be solving the specific collision the Org
-- Leader explicitly declined to solve for three records in migration 0054's own decision.
-- Recorded here as a per-cycle fact, and flagged as a real, evidenced, NOT-yet-acted-on
-- finding for identity resolution generally in the design doc.
--
-- No uniqueness constraint on yok_programme_code: it is evidenced as reliable per real-world
-- programme, but university_programs' own identity resolution is not, so a hard uniqueness
-- constraint here could reject legitimate second-cycle data for a programme that
-- (incorrectly, upstream) exists as two different university_programs rows. Not silently
-- papering over that possibility with an enforced invariant this table cannot actually
-- verify.

create table public.university_program_placement_cycles (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.university_programs(id) on delete cascade,
  -- Normalized, sortable year (2026) alongside the source's own verbatim cycle label
  -- ("2026-YKS") — the label preserves the exam-system context (YKS specifically), which a
  -- bare year would lose and which may matter if that ever changes.
  cycle_year integer not null,
  cycle_label text not null,
  yok_programme_code text,
  -- YKS score type (puan turu) — SAY/EA/SOZ/DIL observed in the evidence above. Left as free
  -- text rather than a CHECK-constrained enum: four values seen in four batches is not
  -- confident coverage of every score type Turkey's whole higher-ed system uses, and an
  -- overly narrow CHECK would reject genuine future data rather than merely fail to validate
  -- it.
  score_type text,
  quota integer,
  placement_status text not null
    check (placement_status = any (array['filled', 'unfilled'])),
  success_rank integer,
  success_score numeric,
  source_url text,
  data_confidence data_confidence not null default 'medium',
  retrieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint university_program_placement_cycles_status_pairing check (
    (placement_status = 'unfilled' and success_rank is null and success_score is null)
    or (placement_status = 'filled' and success_rank is not null and success_score is not null)
  ),
  unique (program_id, cycle_year)
);
create trigger university_program_placement_cycles_set_updated_at before update on public.university_program_placement_cycles for each row execute function public.set_updated_at();

alter table public.university_program_placement_cycles enable row level security;
create policy "authenticated read" on public.university_program_placement_cycles for select to authenticated using (true);
-- No insert/update/delete policy: admin/ingestion tooling only, same posture as
-- university_requirements and requirement_groups.

comment on table public.university_program_placement_cycles is
  'One row per (programme, admission cycle) — quota and outcome, never overwritten by the next cycle so year-over-year trend stays queryable. placement_status distinguishes filled (rank+score both present) from unfilled (both null, a real quota-went-unfilled outcome) — a missing row, not a status value, means Oryn has not captured that cycle yet.';
comment on column public.university_program_placement_cycles.yok_programme_code is
  'YOK Atlas''s own official per-programme identifier, stored verbatim for traceability. Not used for deduplication or identity resolution by this migration — see docs/handoffs/yok-atlas-placement-schema-decision.md for why, and for the identity-resolution finding this surfaced but does not act on.';
comment on column public.university_program_placement_cycles.placement_status is
  'filled | unfilled. Never a third "not_captured" value — see this migration''s own header comment for why that is represented by row absence instead.';
