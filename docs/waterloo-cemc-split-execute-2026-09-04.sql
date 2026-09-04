-- Waterloo/CEMC split -- EXECUTION of the plan in docs/waterloo-cemc-split-plan-2026-09-04.md.
-- CEO's own instruction, in sequence: (1) create correctly-scoped new rows, (2) retire (not
-- delete) the bundled row, (3) migrate any matches/saves tied to the old identity. Prepared,
-- NOT applied -- same discipline as every other data-changing file in this pass.
--
-- Re-measured immediately before writing this file (2026-09-04, same session that wrote the
-- plan), because the plan's own numbers are hours old and this arc's own standing rule is to
-- never trust a stale measurement: saved_opportunities is still 0 rows for the bundled id
-- (51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8). The real top-5-per-student ranking (mirroring
-- home-strip.ts's own selection exactly) now shows ZERO students, not the plan's "1 student" --
-- the visible set has shifted since the plan was written, same "the set isn't static" finding
-- D2's own visible-priority work already documented. There are 8 raw opportunity_matches rows
-- referencing the bundled id (cached relevance/eligibility scores, computed regardless of
-- whether a row ranks into anyone's real top-5) -- see the closing note for why these need no
-- explicit migration.
--
-- THE SPLIT, researched fresh this pass (not reused from the plan's own summary, which named
-- grade bands but not exact sourced eligible_grades values or official subpage URLs) --
-- direct fetches of each contest's own official CEMC page, 2026-09-04:
--   * Pascal, Cayley and Fermat Contests (cemc.uwaterloo.ca/contests/pcf) -- "Students in
--     Grade 9 are eligible to write the Pascal Contest" / Grade 10 Cayley / Grade 11 Fermat.
--   * Fryer, Galois and Hypatia Contests (cemc.uwaterloo.ca/contests/fgh) -- same per-contest
--     grade pattern as PCF, full-solution format instead of multiple choice.
--   * Euclid Contest (cemc.uwaterloo.ca/contests/euclid) -- "Students in their final year of
--     secondary school or CEGEP students. Motivated students in lower grades are welcome" --
--     the one contest in this set genuinely narrower than 9-12, which is exactly why it gets
--     its own row rather than folding into PCF/FGH.
--   * Canadian Senior and Intermediate Mathematics Contests (cemc.uwaterloo.ca/contests/csimc)
--     -- CIMC "Students in Grades 9 and 10", CSMC "Students in Grades 11 and 12 and CEGEP
--     students". Kept as ONE row spanning grades 9-12, not split into CIMC/CSMC separately --
--     same treatment as PCF/FGH, where one official page bundles several single/narrow-grade
--     contests under one family and the row answers "is this student eligible for ONE of
--     this family's contests," not "for every contest on this page equally."
--   * Canadian Team Mathematics Contest (cemc.uwaterloo.ca/contests/ctmc) -- "Teams of six
--     secondary school students in any combination of Grades 9-12."
--
-- Deliberately excluded from this split, not silently dropped -- named here as a real gap:
--   * Canadian Computing Competition (cemc.uwaterloo.ca/contests/ccc) -- fetched, and its own
--     page explicitly states NO grade restriction ("each participant can choose the best
--     level for them, regardless of their grade"), gated instead by a birth-date cutoff for
--     "official" award-eligible status. A genuinely different eligibility SHAPE (age-cutoff,
--     not grade-based) that deserves its own researched row rather than being forced into
--     this grade-focused split -- left for a future pass rather than guessed at here.
--   * Beaver Computing Challenge (grades 5-10), Gauss (7-8), Team Up Challenge (6-8) -- the
--     original bundled row's own description says "9 different contests (grades 5-12)"; these
--     three are outside Proxola's stated 14-18 / grades-9-12 target audience (AGENTS.md Â§0),
--     so creating rows for them is out of scope for this platform, not merely undone here.
--
-- Fields NOT reused blindly from the bundled row: `fields` corrected from
-- ["mathematics","computer_science"] to ["mathematics"] -- none of the 5 contests below touch
-- computer science (that's CCC, excluded above). `deadline` is NOT copied onto every new row --
-- the bundled row's own description says its stored Oct-22 date belongs specifically to "the
-- Senior/Intermediate contest," so only the CSIMC row below carries it forward; the other four
-- are left null (unresearched) rather than given a deadline that would be wrong for them, per
-- this app's own "leave blank if not found, never fabricate" rule -- a future pass should fetch
-- each contest's own registration deadline specifically.
--
-- Fields carried forward from the bundled row as still-accurate, general CEMC facts, not
-- re-researched this pass: country ('Canada'), eligible_countries/country_eligibility_
-- confirmed_open (CEMC contests are written in 80+ countries; this predates and is independent
-- of the grade split), location_mode ('hybrid'), cost/funding_available/financial_aid_available
-- (null -- fees are not publicly published, per the bundled row's own note, and that fact is
-- about CEMC's registration process generally, not any one contest), selectivity_tier
-- ('unknown'), verification_state ('verified_current').
--
-- SEQUENCING: the five INSERTs run first. The retirement UPDATE runs last, after they exist --
-- CEO's own explicit requirement (a window with both old and new rows is safe; a window with
-- neither is not).

-- 1. Pascal, Cayley and Fermat Contests
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'CEMC Pascal, Cayley and Fermat Contests',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'Multiple-choice contests: Pascal (Grade 9), Cayley (Grade 10), Fermat (Grade 11) -- each student writes the one contest matching their own grade. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record, which bundled nine distinct CEMC contests spanning grades 5-12 under one incompatible eligible_grades value.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/pcf',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  null,
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/pcf, 2026-09-04, confirming per-contest grade eligibility.',
  'https://cemc.uwaterloo.ca/contests/pcf',
  'high',
  now(),
  'active',
  'cemc pascal, cayley and fermat contests',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['9','10','11'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
);

-- 2. Fryer, Galois and Hypatia Contests
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'CEMC Fryer, Galois and Hypatia Contests',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'Full-solution (written-response) contests: Fryer (Grade 9), Galois (Grade 10), Hypatia (Grade 11) -- companion contests to Pascal/Cayley/Fermat, each student writes the one matching their own grade. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/fgh',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  null,
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/fgh, 2026-09-04, confirming per-contest grade eligibility.',
  'https://cemc.uwaterloo.ca/contests/fgh',
  'high',
  now(),
  'active',
  'cemc fryer, galois and hypatia contests',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['9','10','11'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
);

-- 3. Euclid Contest -- the one contest in this split genuinely narrower than 9-12.
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'CEMC Euclid Contest',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'University-level mathematics contest for students in their final year of secondary school (CEGEP students also eligible); motivated students in lower grades are welcome. Widely used for Waterloo Faculty of Mathematics scholarship consideration. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/euclid',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  null,
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/euclid, 2026-09-04: "Students in their final year of secondary school or CEGEP students."',
  'https://cemc.uwaterloo.ca/contests/euclid',
  'high',
  now(),
  'active',
  'cemc euclid contest',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['12'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
);

-- 4. Canadian Senior and Intermediate Mathematics Contests (CIMC + CSMC) -- kept as one row,
-- same treatment as PCF/FGH above: CIMC (grades 9-10) and CSMC (grades 11-12) share one
-- official page, and the row answers "eligible for one of this family's two contests."
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'Canadian Senior and Intermediate Mathematics Contests (CSMC/CIMC)',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'Two full-solution contests on one registration: the Canadian Intermediate Mathematics Contest (Grades 9-10) and the Canadian Senior Mathematics Contest (Grades 11-12, CEGEP students also eligible) -- each student writes the one matching their own grade. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record; this contest carries that record''s own Nov-cycle registration deadline (the earliest of CEMC''s 2026/27 contest year), the others in this split do not.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/csimc',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  '2026-10-22',
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/csimc, 2026-09-04, confirming per-contest grade eligibility; deadline carried forward from the original umbrella record (its own description named this as the "Senior/Intermediate" contest''s deadline specifically).',
  'https://cemc.uwaterloo.ca/contests/csimc',
  'high',
  now(),
  'active',
  'canadian senior and intermediate mathematics contests (csmc/cimc)',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['9','10','11','12'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
);

-- 5. Canadian Team Mathematics Contest (CTMC)
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'Canadian Team Mathematics Contest (CTMC)',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'Team-based contest (teams of six) with individual and team event portions, hosted at the student''s own school or, for selected teams, at the University of Waterloo. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/ctmc',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  null,
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/ctmc, 2026-09-04: "Teams of six secondary school students in any combination of Grades 9-12."',
  'https://cemc.uwaterloo.ca/contests/ctmc',
  'high',
  now(),
  'active',
  'canadian team mathematics contest (ctmc)',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['9','10','11','12'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
);

-- 6. Retire the bundled row -- run only after the five INSERTs above have been applied and
-- confirmed present (CEO's own sequencing requirement). status = 'disabled', not deleted --
-- the same status this codebase already uses for exactly this kind of intentional moderation
-- removal (27 other live rows share it, e.g. Diamond Challenge, Stockholm Water Prize), which
-- isOpportunityActionable (lib/opportunities/lifecycle.ts) already excludes from every
-- recommendation surface. No foreign-key gap: opportunity_matches/saved_opportunities rows
-- that still reference this id remain valid rows pointing at a real (if disabled) opportunity.
update public.opportunities
set status = 'disabled',
    updated_at = now()
where id = '51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8'
  and status = 'active';

-- CLOSING NOTE -- matches/saves tied to the old identity, per CEO's explicit request to
-- migrate them:
--   * saved_opportunities: 0 rows reference the bundled id (confirmed twice now, hours apart)
--     -- nothing to migrate.
--   * opportunity_matches: 8 rows reference the bundled id, but 0 students currently have it
--     in their real top-5 (re-measured this pass; the plan's earlier "1 student" has since
--     resolved to 0 on its own). No explicit data migration is written here, following the
--     plan's own point 3: `refreshOpportunityMatches` recomputes these rows from live
--     opportunities on its own schedule, and once this UPDATE takes the bundled row out of
--     `status = 'active'`, isOpportunityActionable excludes it from every recommendation
--     surface regardless of what its stale match rows say -- the same mechanism this
--     codebase already relies on for every other disabled row. The 8 stale rows are left in
--     place deliberately, not overlooked: deleting them isn't necessary for correctness (they
--     stop being shown the moment the row is disabled) and the five new rows above will pick
--     up their own fresh matches on the next recompute for any student whose profile fits.
--     Worth a live spot-check after this file is applied, per the plan's own closing point --
--     not assumed silently.
