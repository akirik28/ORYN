-- 0133: opportunities.country_eligibility_basis -- the same third state 0129 gave age/grade,
-- for country. Mirrors 0129's own shape exactly, which itself mirrors
-- university_statistics.admission_rate_basis (0119/0127) -- per explicit instruction not to
-- invent a new pattern a third time.
--
-- D2's own re-measurement of the visible-34 set is the reason this exists, not a guess: after
-- 0129 applied 'checked_not_stated' to 13 rows' age/grade, the row-level "still shows some
-- warning" count did NOT move (29/34, unchanged) -- because country_eligibility_confirmed_open
-- (0060) only covers "confirmed no gate," and every row that gained the new age/grade state
-- still had an unresolved COUNTRY dimension keeping the whole row flagged. Several of those
-- rows were ALSO genuinely checked for country and found silent (Boston University Tanglewood,
-- WWF Youth Art Contest, Duke of Edinburgh Türkiye, METU, Lumiere Education, UM Academies,
-- UCSB Research Mentorship, HPEC, EYE, Wharton Data Science Competition, UAL, IEO) -- research
-- already done, with nowhere to record it until this column existed.
--
-- Kept alongside 0060's boolean, not replacing it -- same relationship 0129 has with 0126.
-- Backfilled deterministically from country_eligibility_confirmed_open, same discipline as
-- 0129's own backfill from age/grade_eligibility_confirmed_open.
--
-- Naming, deliberately NOT unified with university_statistics.admission_rate_basis's
-- 'not_published' value even though both are a "checked but the source is silent" case:
-- 'not_published' means the institution has a real rate and chooses to withhold it (NUS,
-- Tsinghua, Peking -- 0127's own finding). 'checked_not_stated' here means the official page
-- simply never raises the topic -- the far more common case for eligibility criteria, and one
-- where "probably no restriction" is the honest read, not "definitely exists, deliberately
-- hidden." Same distinction 0129's own migration comment already draws for age/grade; CEO's
-- own ruling on this exact question: keep the names apart because the claims are not the same,
-- and note the distinction in writing so a later pass doesn't "fix" it into false consistency.
--
-- *** NOT YET APPLIED *** -- prepared on oryn/0133-country-eligibility-basis-2026-09-04. 0060,
-- which this migration reads to backfill from, is applied live (confirmed directly against
-- information_schema, not assumed) -- the backfill UPDATE below will have real rows to match
-- once this migration itself is applied.
--
-- Renumbered from 0131 to 0133 on rebase: 0131 was assigned for this work, but by the time
-- this branch caught up with origin/main, 0131 had already been reserved and released for
-- unrelated work and permanently retired as a gap (see __tests__/social/posts-schema.test.ts's
-- "migration numbering" narrative) -- reusing it here would have made "0131" mean two
-- different things, which that narrative explicitly rules out.

alter table public.opportunities
  add column if not exists country_eligibility_basis text default 'not_researched'
  check (country_eligibility_basis is null or country_eligibility_basis in ('not_researched', 'checked_not_stated', 'confirmed_no_restriction'));

-- Deterministic, not a guess -- same reasoning as 0129's own backfill: a row already marked
-- country_eligibility_confirmed_open true was, by definition, research-confirmed open, so its
-- basis is arithmetic on what 0060 already recorded, not a new inference.
update public.opportunities
  set country_eligibility_basis = 'confirmed_no_restriction'
  where country_eligibility_confirmed_open = true
    and country_eligibility_basis is distinct from 'confirmed_no_restriction';

comment on column public.opportunities.country_eligibility_basis is
  'Why eligible_countries is (or is not) set. ''not_researched'' (default): nobody has checked this row''s country eligibility yet. ''checked_not_stated'': a research pass read the official page (source_url, as of last_verified_at) and it does not state a country/nationality restriction either way -- distinct from ''not_published'' (university_statistics.admission_rate_basis, 0127), which means a real value exists and is deliberately withheld; here the topic is simply never raised, which reads as "probably open," not "confirmed hidden." ''confirmed_no_restriction'': the official page explicitly states there is no country/nationality gate -- kept in sync with country_eligibility_confirmed_open (0060), which remains the fast boolean check application code already uses. See docs/opportunity-eligibility-d2-not-found-2026-09-04.md for the D2 research this column answers.';

-- Re-run safe. `add column if not exists` and the UPDATE (guarded by `is distinct from`) are
-- idempotent, same discipline 0119/0126/0129 all document -- applying this file twice is a
-- no-op, not an error.
