-- Fourth state for admission_rate_basis (migration 0119), CEO's own correction of a real gap
-- found doing the D1 QS-top-100 fill (2026-09-04): NUS, Tsinghua, and Peking each have a
-- real, conceptually-single admission rate the university simply does not publish -- neither
-- of 0119's two states describes this. 'not_researched' means nobody has looked yet, which is
-- false (a research pass looked, specifically, and confirmed nothing official exists to cite).
-- 'no_single_rate' means the institution's own structure has no single rate to state (TU
-- Munich, TU Delft) -- also false; these institutions plausibly compute one internally, they
-- just don't release it. Leaving the column at its default ('not_researched') after a real
-- research pass would read as "unresearched" to the next session, who would spend the same
-- effort re-confirming what this pass already confirmed.
--
-- No application code reads admission_rate_basis yet (0119's own migration note: it writes
-- the column, nothing downstream consumes it) -- adding a fourth value is cheap and safe on
-- that basis; the UI-facing distinction between "not researched" and "researched, not
-- published" is a separate, later piece of work.
alter table public.university_statistics
  drop constraint university_statistics_admission_rate_basis_check;

alter table public.university_statistics
  add constraint university_statistics_admission_rate_basis_check
  check (admission_rate_basis is null or admission_rate_basis = any (array['published', 'not_researched', 'no_single_rate', 'not_published']));

comment on column public.university_statistics.admission_rate_basis is
  'Why admission_rate is (or is not) set. ''published'': a real, single, officially-published rate exists in admission_rate (e.g. Edinburgh''s 53% offer rate, 2025 cycle). ''not_researched'' (default): nobody has determined this university''s admission-rate situation yet -- admission_rate is null simply because research hasn''t reached it. ''no_single_rate'': actively researched and confirmed the institution has no single admission rate by construction -- e.g. TU Munich (unrestricted/NC/aptitude-assessment set per program, not university-wide) or TU Delft (6 selective numerus-fixus programs, the rest open-admission) -- admission_rate is null and should stay null. ''not_published'' (added 0127): actively researched, a single rate plausibly exists, but the university does not release one officially -- e.g. NUS, Tsinghua, Peking (2026-09-04 QS-top-100 pass) -- admission_rate stays null, distinct from ''not_researched'' so a later pass does not re-spend the same research effort re-confirming the same absence. See docs/fill-9-universities-findings-2026-09-04.md for the original finding this column answers, and docs/d1-qs-top100-fill-2026-09-04.md for the ''not_published'' case.';
