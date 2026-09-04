-- docs/fill-9-universities-findings-2026-09-04.md's schema-gap finding: a null
-- university_statistics.admission_rate currently means two different things with no way to
-- tell them apart -- "nobody has researched this yet" (Oxford, this pass: site friction, not
-- a structural absence) and "this institution has no single admission rate, by construction"
-- (TU Munich: unrestricted/NC/aptitude-assessment is set per PROGRAM, not university-wide; TU
-- Delft: 6 selective numerus-fixus programs, the rest open-admission with no rate to report at
-- all). Both render identically today -- absence standing in for a known value, this repo's
-- most-repeated defect (see MEMORY.md's [[feedback_hedge_inferred_vs_confirmed]] and kin),
-- this time in the university schema rather than a feature flag or a test fixture.
--
-- Edinburgh is why the column is worth adding rather than an excuse to leave both cases null:
-- 53%, real, sourced, published as one figure (study.ed.ac.uk, 2025 cycle). The distinction is
-- genuine, not manufactured -- some universities really do have one number, most in this
-- 9-university pass didn't.
--
-- Scope note: the OTHER schema-gap candidate from the findings doc -- a fee-status split for
-- cost_of_attendance (home/overseas, statutory/institutional) -- turned out not to need new
-- schema at all. lib/universities/queries.ts's getAllResolvedTuitionAmounts and
-- deriveTuitionContext already read university_profile_metrics' tuition_domestic_annual /
-- tuition_international_annual metric codes (158 / 138 rows already populated for other
-- universities) ahead of university_statistics.cost_of_attendance, built and merged before
-- 2026-09-03 for exactly this shape ("a university can have both, e.g. a domestic and an
-- international figure on the same UK-style institution" -- queries.ts's own comment). Oxford
-- / Edinburgh / KCL / TU Munich / TU Delft's split fees belong there as a fill, not here as a
-- schema change -- discovered while scoping this migration, reported back rather than building
-- a second mechanism next to one that already does the job.
--
-- Written, NOT applied -- house pattern (0076, 0086, 0088, 0089, 0090, 0091, 0111): no
-- application code reads admission_rate_basis yet, so the app is correct with or without this
-- migration applied. lib/admissions/explain.ts's admissionRateKnown (the outlook engine's own
-- "do we have a rate" check) is the natural place to start distinguishing the two null cases in
-- the explanation text -- left for a follow-up, not bundled here, since a schema change and the
-- application logic that starts depending on it are two different blast radii.
alter table public.university_statistics
  add column if not exists admission_rate_basis text default 'not_researched'
  check (admission_rate_basis is null or admission_rate_basis in ('published', 'not_researched', 'no_single_rate'));

-- Deterministic, not a guess: a row that already carries a real admission_rate was, by
-- definition, published somewhere -- this is arithmetic on what's already stored, not an
-- inference about a university this migration has no data on. Every other row keeps the
-- column default set above ('not_researched'), the honest baseline until a real research pass
-- (like this one, for two of the nine) upgrades a specific university to 'no_single_rate'. This
-- migration never sets 'no_single_rate' itself -- that distinction can only come from someone
-- actually having looked, the same discipline the findings doc applied by hand to TU Munich
-- and TU Delft.
update public.university_statistics
  set admission_rate_basis = 'published'
  where admission_rate is not null
    and admission_rate_basis is distinct from 'published';

comment on column public.university_statistics.admission_rate_basis is
  'Why admission_rate is (or is not) set. ''published'': a real, single, officially-published rate exists in admission_rate (e.g. Edinburgh''s 53% offer rate, 2025 cycle). ''not_researched'' (default): nobody has determined this university''s admission-rate situation yet -- admission_rate is null simply because research hasn''t reached it (Oxford, 2026-09-04 pass: site friction blocked the fetch, not a structural absence). ''no_single_rate'': actively researched and confirmed the institution has no single admission rate by construction -- e.g. TU Munich (unrestricted/NC/aptitude-assessment set per program, not university-wide) or TU Delft (6 selective numerus-fixus programs, the rest open-admission) -- admission_rate is null and should stay null. See docs/fill-9-universities-findings-2026-09-04.md for the finding this column answers.';

-- Re-run safe. Every statement above is guarded (add column if not exists; the UPDATE is
-- idempotent via "is distinct from"), so applying this file twice is a no-op rather than an
-- error -- same discipline 0111's own closing note documents.
