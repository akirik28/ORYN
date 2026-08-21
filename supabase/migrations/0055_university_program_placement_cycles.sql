-- Per-cycle admission placement statistics for university_programs — one row per (program,
-- cycle). REVISED before first application (never applied to any live database — confirmed
-- directly against oryn-qa-scratch before editing this file in place rather than layering a
-- correction onto a table that never existed) against the live YOK Atlas API itself, not just
-- already-summarized research prose. See docs/handoffs/yok-atlas-placement-schema-decision.md
-- for the original evidence (399 records across independent_batch37-44) and the addendum
-- documenting this revision's own direct API verification.
--
-- Column names match the source's own field names verbatim (kontenjan, puanTuru, minPuan,
-- basariSirasi, kilavuzKodu, bursOraniAdi, fymkId/fymkAdi — snake_cased, not translated to
-- invented English equivalents) — confirmed directly from yokatlas.yok.gov.tr's own
-- api/tercih-kilavuz/search response (a genuinely keyless POST endpoint, verified via the
-- browser's own network log, not HTML-scraped), not inferred from research prose. Every
-- translation layer is a place for a wrong assumption to hide, and this source will be
-- re-fetched for years.
--
-- Why a new table and not columns on university_programs: a student reasoning about whether
-- a programme is in reach needs this year's cutoff against last year's trend, not just the
-- latest number overwriting the one before it. Columns on university_programs would destroy
-- exactly that history on the next cycle's re-ingestion.
--
-- Why a plain wide table and not university_profile_metrics' existing metric_code/value_*
-- EAV shape (migration 0038): that table is deliberately open-ended (arbitrary university-
-- level metrics, growing over time) and university-scoped, not program-scoped. This table's
-- fields are a small, fixed, evidenced set where the load-bearing fact — min_puan and
-- basari_sirasi are null together, exactly when a quota goes unfilled — needs a single-row
-- CHECK constraint to enforce directly. Spreading that across separate metric_code rows would
-- need a cross-row trigger to enforce the same invariant EAV can't express as a plain CHECK.
--
-- placement_status has exactly two values, not three: 'filled' | 'unfilled'. "Not yet
-- captured" is deliberately NOT a third status value — it is the absence of a row for that
-- key, the same way this schema already treats missing information elsewhere.
--
-- Evidence for the null-together invariant, checked across all 399 records with a programme
-- code in independent_batch37-44 (every Turkish research batch ingested or pending as of
-- 2026-08-21), not sampled: 368 filled (rank AND score always both present), 31 unfilled
-- (neither present, worded three different ways across different research passes — exactly
-- the kind of thing this table exists to stop happening going forward). Zero partial cases
-- (rank without score or vice versa) found. No "placed" (filled-seat-count) field exists in
-- this source — confirmed directly against the live API response, which carries only
-- kontenjan (quota) and the last-placed student's rank/score, nothing else. Not adding a
-- nullable column for something with no path to populate.
--
-- burs_orani_adi (Burslu / Ucretli / %50 Indirimli / %25 Indirimli — scholarship/fee tier) is
-- part of the UNIQUE KEY, not just a stored column. Confirmed live and directly, not from
-- prose: Istanbul Medipol's "Tip (Ingilizce)" has two fully separate admission tracks --
-- Burslu (kontenjan 3, kilavuzKodu 203110477) and Ucretli (kontenjan 7, kilavuzKodu
-- 203101291) -- same programme, same university, same cycle, genuinely distinct quotas and
-- cutoffs. This is the third time in one day the same shape has bitten this project: the
-- programme dedup key ignoring degree_type collapsed Durham's BSc and MChem into one row
-- (migration 0054); before that, a URL-based dedup rule silently rejected 53 genuine METU
-- programmes to catch one real duplicate. A column without key membership would let one
-- track's placement data silently overwrite the other's on the next cycle's ingestion --
-- Burslu vs Ucretli is a full-scholarship-vs-full-fee difference for a Turkish family, so
-- collapsing the two is not a cosmetic loss.
--
-- fymk_id / fymk_adi (faculty/school id and name) are stored as real columns and are ALSO
-- part of the unique key, for the same reason: the Istanbul University "Isletme" case (three
-- records, three faculties: Iktisat Fakultesi, Siyasal Bilgiler Fakultesi, Isletme Fakultesi)
-- is unresolvable without it. Two of those three share identical name/degree_level/language
-- (both "Ingilizce (%30)") and, per the evidence above, plausibly the same burs tier too --
-- only the faculty actually distinguishes them. Confirmed live: fymkId is a real, populated
-- numeric id in the source, not something this migration is inventing.
--
-- kilavuz_kodu (YOK's own official identifier, e.g. "203110477") is stored verbatim, never
-- parsed, for traceability -- confirmed live as a real API field, not merely mentioned in
-- research prose as previously assumed. NOT used for deduplication here and NOT added to
-- university_programs or its own dedup key in this migration -- that would be solving,
-- reactively, the exact identity-resolution gap migration 0054 explicitly declined to solve
-- for three records. It is flagged, not acted on, as the more valuable finding of this whole
-- pass: every one of Oryn's 779+ Turkish programme rows points at the same YOK Atlas portal
-- root (no per-programme URL exists in this source at all), making kilavuz_kodu the only
-- real candidate for a stable per-programme reference across this entire population -- a
-- decision for whoever next works on identity resolution generally, not this migration.
--
-- No uniqueness constraint on kilavuz_kodu alone: reliable per real-world programme, but
-- university_programs' own identity resolution is not, so a hard constraint here could reject
-- legitimate data for a programme that (incorrectly, upstream) exists as two different
-- university_programs rows.
--
-- UNRESOLVED, investigated directly and left unresolved rather than guessed at: the live API
-- response for at least one record also carries gk1/minPuan1/basariSirasi1,
-- gk2/minPuan2/basariSirasi2, gk3/minPuan3 alongside the top-level (current-cycle) fields.
-- Checked two ways before leaving this out: the raw multi-record response (values did not
-- look like a clean prior-year, prior-prior-year, prior-prior-prior-year progression against
-- the one confirmed real fact -- this is 2026's first captured cycle, so there is no
-- independent way to confirm what an authentic prior cycle's number should look like) and the
-- UI's own column-selector list (Kolonlar), which exposes no corresponding column at all --
-- if this were product-relevant historical trend data, the UI that already surfaces
-- kontenjan/basari sirasi/basari puani would very likely expose it too. Neither check
-- confirmed a meaning. NOT modeled here. If it later turns out to be prior-cycle data, that
-- is a real, valuable, separate finding for whoever confirms it -- not something to guess
-- into a column now.

create table public.university_program_placement_cycles (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.university_programs(id) on delete cascade,
  -- Normalized, sortable year (2026) alongside the source's own verbatim cycle label
  -- ("2026-YKS") — the label preserves the exam-system context (YKS specifically), which a
  -- bare year would lose.
  cycle_year integer not null,
  cycle_label text not null,
  kilavuz_kodu text,
  fymk_id text,
  fymk_adi text,
  -- YKS score type (puan turu) — SAY/EA/SOZ/DIL observed. Free text, not a CHECK-constrained
  -- enum: four values seen is not confident coverage of every score type Turkey's whole
  -- higher-ed system uses.
  puan_turu text,
  burs_orani_adi text,
  kontenjan integer,
  placement_status text not null
    check (placement_status = any (array['filled', 'unfilled'])),
  basari_sirasi integer,
  min_puan numeric,
  source_url text,
  data_confidence data_confidence not null default 'medium',
  retrieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint university_program_placement_cycles_status_pairing check (
    (placement_status = 'unfilled' and basari_sirasi is null and min_puan is null)
    or (placement_status = 'filled' and basari_sirasi is not null and min_puan is not null)
  )
);
-- A plain table-level unique(...) constraint cannot take expressions (coalesce), only column
-- names — caught by apply_migration itself on the first attempt (syntax error at "("), not
-- assumed correct by analogy with 0053/0054's own working CREATE UNIQUE INDEX statements.
-- Fixed to the same expression-index form those migrations already use.
create unique index university_program_placement_cycles_key_idx
  on public.university_program_placement_cycles (program_id, cycle_year, coalesce(burs_orani_adi, ''), coalesce(fymk_id, ''));
create trigger university_program_placement_cycles_set_updated_at before update on public.university_program_placement_cycles for each row execute function public.set_updated_at();

alter table public.university_program_placement_cycles enable row level security;
create policy "authenticated read" on public.university_program_placement_cycles for select to authenticated using (true);
-- No insert/update/delete policy: admin/ingestion tooling only, same posture as
-- university_requirements and requirement_groups.

comment on table public.university_program_placement_cycles is
  'One row per (programme, admission cycle, scholarship/fee tier, faculty) — quota and outcome, never overwritten by the next cycle so year-over-year trend stays queryable. placement_status distinguishes filled (rank+score both present) from unfilled (both null, a real quota-went-unfilled outcome) — a missing row, not a status value, means Oryn has not captured that cycle yet.';
comment on column public.university_program_placement_cycles.kilavuz_kodu is
  'YOK Atlas''s own official per-programme identifier, stored verbatim for traceability. Not used for deduplication or identity resolution by this migration — see docs/handoffs/yok-atlas-placement-schema-decision.md for why, and for the identity-resolution finding this surfaced but does not act on.';
comment on column public.university_program_placement_cycles.burs_orani_adi is
  'Scholarship/fee tier (Burslu/Ucretli/%50 Indirimli/%25 Indirimli). Part of the unique key, not just a stored fact — two tracks of the same programme have genuinely different quotas and cutoffs, confirmed live (Istanbul Medipol''s Tip (Ingilizce): Burslu kontenjan 3 vs Ucretli kontenjan 7).';
comment on column public.university_program_placement_cycles.fymk_id is
  'Faculty/school id from the source. Part of the unique key — the Istanbul University "Isletme" case (three faculties) is unresolvable without it.';
comment on column public.university_program_placement_cycles.placement_status is
  'filled | unfilled. Never a third "not_captured" value — see this migration''s own header comment for why that is represented by row absence instead.';
