-- D2 visible-27 fill (2026-09-05) — REQUIRES MIGRATIONS 0126, 0129, AND 0133 APPLIED FIRST.
--
-- Every statement below writes age_eligibility_basis / age_eligibility_confirmed_open /
-- grade_eligibility_basis / grade_eligibility_confirmed_open / country_eligibility_basis —
-- none of these columns exist on the live database as of 2026-09-05 (confirmed directly via
-- list_migrations against qtcvcflzxbuagvvwahhu: the applied set stops at 0066; 0126/0127/
-- 0129/0130/0132/0133 are all merged to git but never run against this database). Packaging
-- order per CEO: migrations first, this file second. This is the exact mistake CEO named
-- from yesterday — "a package assumed the comment was already applied" — so it's stated
-- here plainly, not just implied by the filename.
--
-- Same evidentiary rule as the sibling file: checked_not_stated means the row's own
-- official_url was actually fetched (no 403/timeout/blocked-domain), real content came
-- back, and that content affirmatively contains no eligibility statement for this specific
-- dimension — not a deferral to a different, unfetched page, and not a mere absence.
--
-- Every WHERE clause guards on the exact current value (basis columns don't exist yet, so
-- these guard on the live columns that gate whether computeEligibility even reads basis —
-- confirmed_open = false / grades or countries empty), matching the sibling migration's own
-- discipline: any row that changes again before this runs degrades to a safe no-op.

-- ============================================================================
-- Genuine fetch failures — recorded here as WHY NO SQL EXISTS, not silently omitted
-- ============================================================================
-- Girl Up Project Awards (31f4ecf4-902c-4636-bcc8-77e300d42ae5): girlup.org returned HTTP
-- 403. Not fetched, not silent — genuinely incomplete research. No SQL, any dimension.
-- New York Times Audio Stories Podcast Contest (031502eb-7a60-43cd-a8c1-8d1c44cac6da):
-- nytimes.com is blocked outright for this tool. No SQL, any dimension.
-- STEM Fellowship Journal (b51bf24f-42c2-419f-a456-ca86dff0ad8e): journal.stemfellowship.org
-- returned HTTP 403. No SQL, any dimension.
-- InvestIN (8a7c89e4-e63a-4f64-a76d-4bae1b31e889): country genuinely incomplete (page
-- defers to an unfetched "For international students" link, same finding as the prior
-- session's own note on this row); grade genuinely ambiguous (the page bundles multiple
-- programs with different age bands — "Work experience... ages 15-18" vs "Career
-- Discovery... ages 12-14" — under one collections page, and it's not clear which program
-- this DB row represents without deeper investigation this pass didn't do). No SQL for
-- either — flagged, not guessed.
-- University of Applied Sciences Western Switzerland (0f7a1ef0-004a-4ce8-88a1-7161dbb6bc48):
-- country mentions "visa costs for international participants" — real process information
-- (a visa detail), not a restriction claim either way, same category as Ross
-- Mathematics/IE University in the prior session's own classification (bucket 2: leave
-- untouched, no basis change). No SQL for country.

-- ============================================================================
-- age_eligibility_basis / age_eligibility_confirmed_open
-- ============================================================================

-- Wharton Global HS Investment Competition — official page states an explicit grade
-- requirement (9-12, already on file) but no age number anywhere.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '2e2f995a-2ac3-4138-a3df-ca4e4033aa36'
  and minimum_age is null and maximum_age is null and not coalesce(age_eligibility_confirmed_open, false);

-- Harvard Pre-Collegiate Economics Challenge (HPEC) — official page affirmatively states
-- "the full 2026-27 rules... will be posted when registration opens" — confirms nothing is
-- posted yet, for every criterion including age.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = 'a4a24425-2a6f-4902-99a4-4fb43dc110dd'
  and minimum_age is null and maximum_age is null and not coalesce(age_eligibility_confirmed_open, false);

-- Interlochen Review — "(grades 9-12 or high school postgraduate year)" is a grade
-- statement, not an age number. No age criterion stated anywhere on the page.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44'
  and minimum_age is null and maximum_age is null and not coalesce(age_eligibility_confirmed_open, false);

-- DECA Competitive Events Program — page says "high school" throughout, no age number.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0804bd36-b882-46fa-a76c-e1aee944a685'
  and minimum_age is null and maximum_age is null and not coalesce(age_eligibility_confirmed_open, false);

-- Dive Into Engineering! (USC) — page says "high schoolers," no age number.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec'
  and minimum_age is null and maximum_age is null and not coalesce(age_eligibility_confirmed_open, false);

-- UCSB Research Mentorship Programs — "high-achieving high school students," no age number.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90'
  and minimum_age is null and maximum_age is null and not coalesce(age_eligibility_confirmed_open, false);

-- Istanbul Bilgi University High School Summer School — official Turkish-language page,
-- fetched directly: addresses grade level only ("9-10-11-12. sınıf öğrencileri," already on
-- file), no age number stated anywhere.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = 'd780bc55-41e0-444b-8bcc-3f927b28c4b7'
  and minimum_age is null and maximum_age is null and not coalesce(age_eligibility_confirmed_open, false);

-- Wall Street 101 — "rising high school juniors and seniors" is a grade statement, no age
-- number anywhere on the page.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '12d06ccb-6b51-4ea2-8a9e-7c326fa97514'
  and minimum_age is null and maximum_age is null and not coalesce(age_eligibility_confirmed_open, false);

-- Purdue University — page states a minimum ("age 15 and older," filled in the sibling
-- file) but no maximum; the age dimension here is fully addressed by the fill, not a
-- checked_not_stated case. (Listed for completeness — no statement needed once the sibling
-- file's addition lands; omitted intentionally.)

-- Young Guru Academy (YGA) — page fetched successfully; no age, grade, or country
-- criterion of any kind anywhere in the content, a genuine, confirmed silence across all
-- three (distinct from the prior session's own note that this page previously returned a
-- fetch failure — reachable and silent this time, not unreachable).
update public.opportunities
set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '5d2aca22-26d5-4592-a5fb-a554c7a51f50'
  and minimum_age is null and maximum_age is null and not coalesce(age_eligibility_confirmed_open, false);

-- ============================================================================
-- grade_eligibility_basis / grade_eligibility_confirmed_open
-- ============================================================================

-- Breakthrough Junior Challenge — "an annual, global science video competition for
-- high-school students," no grade level specified.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0412d94f-8b28-4f37-933c-cf6198914c12'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- Harvard Pre-Collegiate Economics Challenge (HPEC) — same "rules not yet posted"
-- affirmative-silence reasoning as its own age entry above.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = 'a4a24425-2a6f-4902-99a4-4fb43dc110dd'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- DECA Competitive Events Program — page says "high school" throughout, no grade level.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0804bd36-b882-46fa-a76c-e1aee944a685'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- TechGirls — official page gives a complete, specific age-based criterion (already on
-- file: 15-17, precise birth-date window) and names no grade requirement anywhere —
-- genuinely age-gated, not silent on an unstated grade rule. Re-verified live 2026-09-05:
-- citizenship_restrictions is now a real, detailed, structured restriction (not the
-- boilerplate it may once have been), unrelated to and not affected by this grade finding.
update public.opportunities
set grade_eligibility_confirmed_open = true, last_verified_at = now()
where id = '7081b03a-3e04-4843-8bc5-0078cfd040f2'
  and (eligible_grades is null or eligible_grades = '{}');

-- Schoolhouse.world Tutor Certification — page states an age floor ("at least 13 years
-- old," already on file) and nothing about grade level at all.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '95b3b7dc-5306-40b5-b2e7-8c769fc68128'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- The Duke of Edinburgh's International Award — Türkiye — page describes the program by
-- how youth can reach it ("through schools and youth centers, or individually"), no grade
-- level stated.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = 'cdb9da8a-3c8d-47ea-bcee-6cf749738246'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- Purdue University — no grade level stated anywhere on the page (age is addressed by the
-- sibling file's addition).
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '16d56c3b-376b-4cf6-b8b1-12daaecf0068'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- Young Guru Academy (YGA) — genuine, confirmed silence (see age entry above for the same
-- reachable-and-silent finding).
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '5d2aca22-26d5-4592-a5fb-a554c7a51f50'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- UCSB Research Mentorship Programs — "high-achieving high school students," no grade
-- level (distinct from age, both genuinely silent on this page).
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- University of Applied Sciences Western Switzerland — the only participant descriptor
-- found ("15, 16 or 17 years old") is age, already on file; no separate grade-level
-- statement anywhere on the page.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0f7a1ef0-004a-4ce8-88a1-7161dbb6bc48'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- JA Company Programme (Europe) — age is on file (15-18); page never separately states a
-- grade-level requirement.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '55a5efea-e280-4176-bf65-49a028b097af'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- International Economics Olympiad (IEO) — page addresses only a maximum age ("under 20";
-- filled in the sibling file) and the national-organizer logistics structure; no grade-level
-- statement anywhere.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '9193db16-7a9e-42b1-95b6-74eda83a0ac9'
  and (eligible_grades is null or eligible_grades = '{}') and not coalesce(grade_eligibility_confirmed_open, false);

-- ============================================================================
-- country_eligibility_basis
-- ============================================================================

-- Wharton Global HS Investment Competition — "teams competing from around the world" is
-- descriptive attendee makeup, not an affirmative open-to-all statement — the same bar
-- Immerse/Oxford Scholastica/UCSB already failed on in the prior session's own
-- classification pass.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '2e2f995a-2ac3-4138-a3df-ca4e4033aa36'
  and (eligible_countries is null or eligible_countries = '{}')
  and (eligible_citizenships is null or eligible_citizenships = '{}')
  and (citizenship_restrictions is null or citizenship_restrictions = '')
  and (residency_restrictions is null or residency_restrictions = '')
  and not coalesce(country_eligibility_confirmed_open, false);

-- LaunchX — page fetched, no statement about country/nationality eligibility anywhere.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '50392e5e-a7ab-4de4-9ad7-fc7b51a742dc'
  and (eligible_countries is null or eligible_countries = '{}')
  and (eligible_citizenships is null or eligible_citizenships = '{}')
  and (citizenship_restrictions is null or citizenship_restrictions = '')
  and (residency_restrictions is null or residency_restrictions = '')
  and not coalesce(country_eligibility_confirmed_open, false);

-- BRI Student Fellowship — page fetched, no country/nationality statement anywhere.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1d28dd20-3433-407a-a83e-7b71e59c207e'
  and (eligible_countries is null or eligible_countries = '{}')
  and (eligible_citizenships is null or eligible_citizenships = '{}')
  and (citizenship_restrictions is null or citizenship_restrictions = '')
  and (residency_restrictions is null or residency_restrictions = '')
  and not coalesce(country_eligibility_confirmed_open, false);

-- Istanbul Bilgi University High School Summer School — official Turkish-language page,
-- fetched directly: addresses only grade level (already on file), no nationality/residency
-- statement of any kind.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = 'd780bc55-41e0-444b-8bcc-3f927b28c4b7'
  and (eligible_countries is null or eligible_countries = '{}')
  and (eligible_citizenships is null or eligible_citizenships = '{}')
  and (citizenship_restrictions is null or citizenship_restrictions = '')
  and (residency_restrictions is null or residency_restrictions = '')
  and not coalesce(country_eligibility_confirmed_open, false);

-- ODTÜ (METU) Engineering Summer School — page describes the program for "lise öğrencileri"
-- (high school students), no nationality/residency statement either way.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0c8e00c1-b2b7-4039-8021-10a310de62e4'
  and (eligible_countries is null or eligible_countries = '{}')
  and (eligible_citizenships is null or eligible_citizenships = '{}')
  and (citizenship_restrictions is null or citizenship_restrictions = '')
  and (residency_restrictions is null or residency_restrictions = '')
  and not coalesce(country_eligibility_confirmed_open, false);

-- Purdue University — no nationality/residency statement anywhere on the page.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '16d56c3b-376b-4cf6-b8b1-12daaecf0068'
  and (eligible_countries is null or eligible_countries = '{}')
  and (eligible_citizenships is null or eligible_citizenships = '{}')
  and (citizenship_restrictions is null or citizenship_restrictions = '')
  and (residency_restrictions is null or residency_restrictions = '')
  and not coalesce(country_eligibility_confirmed_open, false);

-- Wall Street 101 — not addressed at all on the page.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '12d06ccb-6b51-4ea2-8a9e-7c326fa97514'
  and (eligible_countries is null or eligible_countries = '{}')
  and (eligible_citizenships is null or eligible_citizenships = '{}')
  and (citizenship_restrictions is null or citizenship_restrictions = '')
  and (residency_restrictions is null or residency_restrictions = '')
  and not coalesce(country_eligibility_confirmed_open, false);

-- Young Guru Academy (YGA) — genuine, confirmed silence (see age/grade entries above).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '5d2aca22-26d5-4592-a5fb-a554c7a51f50'
  and (eligible_countries is null or eligible_countries = '{}')
  and (eligible_citizenships is null or eligible_citizenships = '{}')
  and (citizenship_restrictions is null or citizenship_restrictions = '')
  and (residency_restrictions is null or residency_restrictions = '')
  and not coalesce(country_eligibility_confirmed_open, false);

-- JA Company Programme (Europe) — describes operations "across Europe" and EU funding,
-- descriptive/operational, not a stated eligibility policy.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '55a5efea-e280-4176-bf65-49a028b097af'
  and (eligible_countries is null or eligible_countries = '{}')
  and (eligible_citizenships is null or eligible_citizenships = '{}')
  and (citizenship_restrictions is null or citizenship_restrictions = '')
  and (residency_restrictions is null or residency_restrictions = '')
  and not coalesce(country_eligibility_confirmed_open, false);

-- Harvard Pre-Collegiate Economics Challenge (HPEC) — REUSED from the prior session's own
-- 0133 file, re-verified live 2026-09-05, unchanged: same "rules not posted yet" reasoning.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = 'a4a24425-2a6f-4902-99a4-4fb43dc110dd'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- International Economics Olympiad (IEO) — REUSED, re-verified live 2026-09-05, unchanged:
-- participation mediated through "official national organizers" across 74 countries is a
-- logistics structure, not a stated open/restricted policy.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '9193db16-7a9e-42b1-95b6-74eda83a0ac9'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- UCSB Research Mentorship Programs — country dimension already resolved by the prior
-- session's own citizenship-restrictions classification work (confirmed_open=false,
-- citizenship_restrictions cleared of its boilerplate research-note leak). Re-verifying
-- that specific fix is still needed is out of THIS file's scope (it's a citizenship-leak
-- cleanup, not a visible-set fill) — flagged here only so nobody assumes it was missed.
