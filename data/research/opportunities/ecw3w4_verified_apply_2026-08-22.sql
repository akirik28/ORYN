-- ECW3+ECW4 dry-run-prepared apply SQL: eligible_countries Wave 3 (55 records, competition
-- category, 0 populates) + Wave 4 (132 records, summer_program category, 3 populates/prose).
-- Sources: data/research/opportunities/ecw3_batch{1,2,3}.jsonl,
--          data/research/opportunities/ecw4_batch{1..6}.jsonl (RES-R3 lane).
--
-- Prepared 2026-08-22 by ORYN-DATA per ORYN-CEO's request, WHILE STILL BLOCKED — do not run
-- Part B (or the whole file) until both conditions below are true. This file's own guard
-- predicates make every statement a no-op if run too early or twice; they do not make it
-- safe to run before its dependencies land, because the columns/constraint it targets
-- don't exist yet.
--
-- ============================================================================
-- BLOCKED ON TWO MIGRATIONS, NOT ONE:
--
-- 1. Migration 0060 (supabase/migrations/0060_opportunity_country_eligibility_confirmed_open.sql)
--    -- adds `country_eligibility_confirmed_open boolean not null default false` plus a CHECK
--    constraint that it can't coexist with a non-empty eligible_countries/eligible_citizenships.
--    Confirmed NOT in live `list_migrations` (2026-08-22).
--
-- 2. Migration 0047 (supabase/migrations/0047_structured_eligibility_facts.sql) -- adds the
--    `eligible_citizenships` column that 0060's own CHECK constraint references. THIS IS A
--    SEPARATE, PRE-EXISTING GAP found as a byproduct of preparing this script: 0047 is
--    already committed on `main` (lower number than the currently-applied 0056), but
--    confirmed NOT in live `list_migrations` either -- it was skipped somewhere in the
--    apply history, unrelated to Wave 3/4. 0060 will fail at apply time (undefined column
--    in the CHECK constraint) if 0047 hasn't landed first. Flagging this to the founder
--    queue is CEO's call, not applied here.
--
-- Verify both are live before running Part B:
--   select column_name from information_schema.columns where table_name='opportunities'
--     and column_name in ('country_eligibility_confirmed_open','eligible_citizenships');
--   -- must return both rows.
-- ============================================================================
--
-- Idempotent by construction, same convention as ecw2_verified_apply_2026-08-22.sql: every
-- UPDATE is guarded by id AND a still-in-expected-state predicate, so re-running is a no-op.
--
-- Live cross-check performed before writing this file (2026-08-22, read-only): all 50
-- target rows' current `status`, `eligible_countries` (all empty, not null), and
-- `citizenship_restrictions`/`residency_restrictions` presence re-verified directly against
-- `oryn-qa-scratch` -- zero drift from the research files' own recorded state.
--
-- Scope note -- 8 rows deliberately EXCLUDED from Part B, not a coverage gap: these are
-- `confirmed_open_worldwide` findings against opportunities whose live `status` is
-- `under_review`, not `active` -- consistent with the research lane's own stated policy
-- ("Wave 4's ... contingent confirmed-open findings against under_review rows are excluded").
-- Re-included automatically by Part B's own `and o.status = 'active'` guard once/if a row
-- clears the quality gate and this file is re-run -- no manual edit needed here.
-- Excluded IDs: 793f6cf1-5af8-413a-b15f-89e5f1f9e44f (Bennington College Young Writers),
-- 496ef7db-b8d4-4a72-8bcc-b7cb13208e40 (Horizon Academic Essay Prize),
-- ce680bf5-d52a-444e-a7de-ed1789cfc6aa (Immerse Education Essay Competition),
-- f52db280-638a-49ec-a972-d1658b046234 (ISSOS),
-- c996443d-7360-4197-850a-339ef959d585 (Singularity AI Essay Contest),
-- b399d24d-3606-4d3d-bb59-2b94623c58b2 (The Diana Award),
-- 55dd21cd-859e-498a-a69d-56f45d777d8e (UniHive Research Proposal Competition),
-- 9f611eed-7787-4d26-b1a5-7c9cda0439aa (XLAB International Science Camp, Germany).

begin;

-- ============================================================================
-- PART A -- no migration dependency. Safe to run today, independently of Part B/0060/0047,
-- against already-live columns (eligible_countries, citizenship_restrictions).
-- 3 rows: 2 populate proposals + 1 prose-only proposal.
-- ============================================================================

-- ECW3-016 -- Breakthrough Junior Challenge. OFAC comprehensive-sanctions exclusion is real
-- and sourced but keyed to a legal designation, not an enumerable country list -- inverting
-- it into "every country except X" would be fabrication (project standing rule). Prose only;
-- eligible_countries stays empty by design.
update opportunities
set citizenship_restrictions = 'Not eligible if you reside in a country or region subject to comprehensive U.S. economic sanctions, or are otherwise an individual with whom U.S. persons cannot transact under U.S. law (per U.S. Treasury OFAC sanctions programs).',
    last_verified_at = now()
where id = '0412d94f-8b28-4f37-933c-cf6198914c12'
  and citizenship_restrictions is null
  and status = 'active';

-- ECW4-074 -- AI Scholars (CMU pre-college). Explicit "U.S. citizen or permanent resident
-- with a current U.S. green card" gate on the official page. Country-spelling convention
-- ('United States', matching Coca-Cola Scholars/MIT PRIMES/We the People) re-verified live
-- by the researcher before proposing.
update opportunities
set eligible_countries = array['United States'],
    citizenship_restrictions = 'U.S. citizens or permanent residents with a current U.S. green card only.',
    last_verified_at = now()
where id = '3f7170ba-9486-40b0-b450-42462471e88d'
  and (eligible_countries is null or eligible_countries = '{}')
  and status = 'active';

-- ECW4-100 -- Harvard CURE Initiative to Eliminate Cancer Disparities. Both tracks (CURE =
-- Massachusetts residency/school; CURE-RAI = other US states) are explicitly US-domestic --
-- reduces cleanly to one country, unlike wave 3's national-delegation compound cases.
-- Confidence medium (source doesn't specify which track a given row represents).
update opportunities
set eligible_countries = array['United States'],
    residency_restrictions = 'CURE track: Massachusetts residents/students. CURE-RAI track: other U.S. states (out-of-state relative to Massachusetts). Both explicitly U.S.-domestic.',
    last_verified_at = now()
where id = '9b93f1ce-9114-4a2e-96b7-2823f6145d21'
  and (eligible_countries is null or eligible_countries = '{}')
  and status = 'active';

-- ============================================================================
-- PART B -- REQUIRES migrations 0047 AND 0060 applied live first (see header). Running this
-- before then will fail with "column country_eligibility_confirmed_open does not exist."
-- 39 rows: confirmed_open_worldwide findings against currently-`active` opportunities only.
-- ============================================================================

update opportunities as o
set country_eligibility_confirmed_open = true,
    last_verified_at = now()
where o.status = 'active'
  and (o.eligible_countries is null or o.eligible_countries = '{}')
  and not o.country_eligibility_confirmed_open
  and o.id in (
    '345f64dd-f6f4-4f29-9341-75743c39a7d1', -- 120 Hours
    'c7223aea-7bb9-4b29-b59d-a054d7bfa02c', -- LIYSF
    'cfe42a66-3688-43aa-8e7e-61ffca68adb8', -- AwesomeMath Summer Program
    '7d573141-bca6-459d-a206-43aebae178c4', -- Baltic Sea Philosophy Essay Event (BSPEE)
    'd9b30fb9-aa85-48ca-ae1b-6c04c5ece736', -- Barcelona International Youth Science Challenge (BIYSC)
    '7997f38c-0d5d-47fb-9288-839621268ec6', -- Battle Code MIT
    'cb4a1030-d035-4c1f-8579-37c458a88b0e', -- Blue Ocean Competition
    '6f0daac1-7f07-45da-a330-dc900be73ab9', -- BrUMO (Brown University Math Olympiad)
    'a0571b4a-8d05-4fe1-bb6b-790b1fed786f', -- Canada/USA Mathcamp
    '45770aad-075c-4411-8ee7-c86d21236276', -- Carnegie Mellon Informatics and Mathematics Competition (CMIMC)
    '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec', -- Dive Into Engineering!
    'd3dc512f-ed1e-43f6-a85b-294a599df0da', -- DNA Day Essay Contest
    '5a2f76ab-36ad-49ac-92a9-73ba1a09fb8d', -- Duke Pre-College Program
    'a22bb8af-8c3d-49a3-948b-714a68aed263', -- Freie Universität Berlin SommerUNI
    '437963fb-9002-4481-bd67-f40e9fc953f1', -- Interlochen Arts Camp
    'bc303473-ba94-41e4-9b3d-038804858a8c', -- International Public Policy Forum (IPPF)
    '104c940f-f3fa-46c9-9e52-2abf69e360d4', -- JLI Global Essay Competition
    '19a535a4-7c1e-44bb-9a3b-2faeaa6e4c9e', -- KU Leuven Summer of Science
    'b5d022aa-302a-4712-b960-a5f70386af17', -- Leangap
    'bc678344-c213-4ae8-a4f8-48af2856338f', -- Lumiere Education
    '692aaffc-b50c-4b9d-a91d-8769a7a46e5c', -- Parsons Summer Intensive Studies
    'f70c6987-d11c-4f0c-87f2-1c11e5dee491', -- Penn Pre-College Program (Residential)
    '0f182854-87b1-449b-b76e-292acbc2a482', -- Princeton University Ten-Minute Play Contest
    '418217ec-65af-494a-bf4f-370c0b6f070c', -- Secondary Student Training Program (SSTP)
    'c94e9b5e-41ad-4af6-844b-d780d9f2f9f4', -- Sorbonne Université Summer University
    '142a6597-6083-45ba-b9ea-6b92e4a2ab55', -- Student Science Training Program
    '69b63aaa-2a5d-40d8-940c-b2dcbd2fbf1c', -- Telluride Association Summer Seminar (TASS)
    '93d45f34-4078-4d15-be6f-d6e157a21943', -- The Concord Review - Emerson Prize
    '00aaf965-016f-42ef-a4a1-3a825f104a6d', -- The Earth Prize Competition
    'c582f1d9-ec28-4335-acd0-4140893dd23f', -- The Harvard Crimson Global Essay Competition
    'c581e99a-c65f-4de2-bece-bbb34819c9a4', -- The Pioneer Academics Research Program
    'eaabbbee-17f6-4142-b9b4-a49bfa87fa7b', -- UCL The Bartlett Summer Schools 2025
    '647eb8da-9cb8-46d4-8ded-b4c516f7ac90', -- UCSB Research Mentorship Programs
    '445f2003-1b9c-4cc9-bc63-22e65e7d8f85', -- University of Notre Dame Pre-College: Summer Scholars
    '0a316853-6d11-4270-826a-1f8fbf896114', -- University of St Andrews Summer Academic Experience
    'cfb32772-6259-4e3a-9ead-bc289b463d08', -- Wharton Data Science Competition
    'fad2bef3-80e8-4b7e-a4a5-f7021f34767f', -- Wharton Global Youth Program
    '99acaf0b-1b1f-4fc1-bb34-69a729a01d0f', -- Wharton Global Youth Program: Future of the Business World (FBW)
    'd9b1f04e-5be4-44c1-9d34-c5979ad57689'  -- YIS Stock Pitch Competition
  );

-- Expected after: Part A's 3 rows carry updated prose/eligible_countries; Part B's 39 rows
-- carry country_eligibility_confirmed_open = true. 8 under_review rows untouched (by design).
select
  count(*) filter (where country_eligibility_confirmed_open) as confirmed_open_count,
  count(*) filter (where cardinality(eligible_countries) > 0) as populated_count
from opportunities
where id in (
  '345f64dd-f6f4-4f29-9341-75743c39a7d1','c7223aea-7bb9-4b29-b59d-a054d7bfa02c',
  'cfe42a66-3688-43aa-8e7e-61ffca68adb8','7d573141-bca6-459d-a206-43aebae178c4',
  'd9b30fb9-aa85-48ca-ae1b-6c04c5ece736','7997f38c-0d5d-47fb-9288-839621268ec6',
  'cb4a1030-d035-4c1f-8579-37c458a88b0e','6f0daac1-7f07-45da-a330-dc900be73ab9',
  'a0571b4a-8d05-4fe1-bb6b-790b1fed786f','45770aad-075c-4411-8ee7-c86d21236276',
  '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec','d3dc512f-ed1e-43f6-a85b-294a599df0da',
  '5a2f76ab-36ad-49ac-92a9-73ba1a09fb8d','a22bb8af-8c3d-49a3-948b-714a68aed263',
  '437963fb-9002-4481-bd67-f40e9fc953f1','bc303473-ba94-41e4-9b3d-038804858a8c',
  '104c940f-f3fa-46c9-9e52-2abf69e360d4','19a535a4-7c1e-44bb-9a3b-2faeaa6e4c9e',
  'b5d022aa-302a-4712-b960-a5f70386af17','bc678344-c213-4ae8-a4f8-48af2856338f',
  '692aaffc-b50c-4b9d-a91d-8769a7a46e5c','f70c6987-d11c-4f0c-87f2-1c11e5dee491',
  '0f182854-87b1-449b-b76e-292acbc2a482','418217ec-65af-494a-bf4f-370c0b6f070c',
  'c94e9b5e-41ad-4af6-844b-d780d9f2f9f4','142a6597-6083-45ba-b9ea-6b92e4a2ab55',
  '69b63aaa-2a5d-40d8-940c-b2dcbd2fbf1c','93d45f34-4078-4d15-be6f-d6e157a21943',
  '00aaf965-016f-42ef-a4a1-3a825f104a6d','c582f1d9-ec28-4335-acd0-4140893dd23f',
  'c581e99a-c65f-4de2-bece-bbb34819c9a4','eaabbbee-17f6-4142-b9b4-a49bfa87fa7b',
  '647eb8da-9cb8-46d4-8ded-b4c516f7ac90','445f2003-1b9c-4cc9-bc63-22e65e7d8f85',
  '0a316853-6d11-4270-826a-1f8fbf896114','cfb32772-6259-4e3a-9ead-bc289b463d08',
  'fad2bef3-80e8-4b7e-a4a5-f7021f34767f','99acaf0b-1b1f-4fc1-bb34-69a729a01d0f',
  'd9b1f04e-5be4-44c1-9d34-c5979ad57689',
  '0412d94f-8b28-4f37-933c-cf6198914c12','3f7170ba-9486-40b0-b450-42462471e88d',
  '9b93f1ce-9114-4a2e-96b7-2823f6145d21'
);
-- Expect: confirmed_open_count = 39, populated_count = 2 (AI Scholars + Harvard CURE).

commit;
