-- APPLIED 2026-08-22 against the live qtcvcflzxbuagvvwahhu project, exactly as written below
-- (dry run with ROLLBACK first, confirmed exactly 13 rows matched, then re-run with COMMIT
-- in place of ROLLBACK). Verified immediately before writing: opportunities.eligible_countries
-- null-or-empty was 366/391 immediately prior. Verified immediately after: 353/391 (-13),
-- populated 25 -> 38 (+13), matching this file's 13 VALUES rows exactly, zero unintended rows
-- touched (every UPDATE was id-guarded AND predicate-guarded). This file is kept as the exact
-- record of what ran; the file body below still literally ends in ROLLBACK as originally
-- written and tested -- the real run substituted COMMIT for that final line, nothing else.
--
-- Step 1: deterministic eligible_countries backfill from data already on the row.
--
-- Scope: opportunities.eligible_countries is null/empty on 366/391 live rows (93.6%).
-- This batch touches ONLY rows where a prior research pass already wrote an explicit,
-- unambiguous citizenship_restrictions or residency_restrictions sentence naming one
-- specific country (or, for a small number of cases, a named sub-national US region that
-- mechanically implies the country) -- zero new research, pure structural promotion of a
-- fact already recorded in prose on the same row into the structured array field the
-- matching/counselor code actually reads.
--
-- Methodology and full per-row justification: see the companion report
-- eligible_countries_step1_2026-08-22_report.md in this same directory. In short: all 366
-- null rows were bucketed by signal type. Bucket 1 (51 rows with citizenship_restrictions
-- or residency_restrictions already non-null) was manually read in full; only rows with an
-- EXPLICIT, unambiguous single-country (or named-US-state-list) statement were applied here.
-- Bucket 2 (description free-text keyword hits) and Bucket 3 (title/organization containing
-- a country-name token) produced ZERO safe applies -- every hit was either already
-- explicitly open (must NOT be given a fabricated country list -- empty already means "not
-- restricted by country" per lib/opportunities/matching.ts's computeEligibility and
-- lib/counselor/eligibility.ts's evaluateOpportunityEligibility, both confirmed by direct
-- code read before writing this file), a garbled/multi-program scrape, or needed a fresh
-- official-source fetch to safely enumerate (e.g. Erasmus+'s ~40-country Programme Guide
-- list, TechGirls' 37 participating countries) -- those are queued for Step 2, not guessed
-- here.
--
-- Explicitly and deliberately NOT touched in this batch (see report for the full reasoning
-- per row): any row whose restriction text says "global", "open to citizens of all
-- countries", "worldwide", "open to international students", or names a nomination/national-
-- committee/nation-quota mechanism (RULE-ELIGIBILITY-009, docs/research/opportunity-
-- eligibility/README.md) -- including the "Türkiye Scholarships - Bachelor's Degree
-- Programme" row, which is explicitly "Open to citizens of all countries" (the opposite of
-- what a naive title-pattern match on "Türkiye" would suggest -- verified from the row's own
-- description/citizenship_restrictions text, not inferred from the title).
--
-- Convention matched to the 25 already-populated eligible_countries rows (e.g. Davidson
-- Fellows, Scholastic Art & Writing, Cold Spring Harbor "Partners for the Future"): country
-- name spelling matches public.opportunities' own existing usage ("United States", "United
-- Kingdom" -- verified via a live SELECT DISTINCT before writing this file), array holds the
-- citizenship/residency-gating country even where the underlying restriction is narrower
-- (e.g. a single US school district) -- the narrower fact stays intact, unedited, in the
-- existing residency_restrictions free-text column.
--
-- Every statement is guarded by id AND the same "still genuinely empty" predicate the
-- night2_2026-08-21_dq-dry-run-update.sql precedent used, as a second layer of protection
-- against a race with another concurrent session. This file is the ROLLBACK/dry-run version;
-- run once to confirm the row count matches exactly 13, then re-run with COMMIT.

BEGIN;

WITH fixes(id, countries, reason) AS (
  VALUES
    ('4fe18f68-5aac-46a1-b8a0-65a82ca4248d'::uuid, ARRAY['United States'], 'Anson L. Clark Scholars Program -- citizenship_restrictions: "U.S. citizen or permanent resident."'),
    ('9b6aefb3-a33e-45a1-af06-5a770a92c45a'::uuid, ARRAY['United States'], 'Caltech Summer Research Connection -- residency_restrictions names a specific US school district (Pasadena Unified), which mechanically implies United States (same pattern as the already-live Cold Spring Harbor "Partners for the Future" row).'),
    ('b32fd331-055e-4a12-968e-0e369d1234af'::uuid, ARRAY['United States'], 'Carnegie Mellon SAMS -- citizenship_restrictions: "U.S. citizen or permanent resident required."'),
    ('995daf25-80ab-4e9a-bcd7-2cd2b2d9d18a'::uuid, ARRAY['United States'], 'CU Boulder Precollegiate Development Program -- residency_restrictions names specific Colorado counties/districts, mechanically implies United States.'),
    ('f2e23349-5a79-4cb2-9bbd-ccefe334dbd7'::uuid, ARRAY['United States'], 'MIT Beaver Works Summer Institute -- residency_restrictions: "Must live in or physically attend high school in the United States; BWSI states it cannot accept students residing outside the US."'),
    ('b87aba0b-755d-4802-a294-369db2acccd0'::uuid, ARRAY['United States'], 'MIT PRIMES -- citizenship_restrictions: "PRIMES is available only to students who reside in the United States."'),
    ('b80369c3-76bd-47c4-9f9a-25f6503a3ff4'::uuid, ARRAY['United States'], 'MITES Summer -- citizenship_restrictions: "U.S. citizens or permanent residents."'),
    ('fd6c9cf1-b112-478a-8b4f-57989368abaa'::uuid, ARRAY['United States'], 'Simons Summer Research Program -- citizenship_restrictions: "U.S. citizens and/or permanent residents."'),
    ('27213610-1b19-4e85-b52a-50e165607159'::uuid, ARRAY['United Kingdom'], 'Sutton Trust UK Summer Schools -- residency_restrictions requires enrollment at a UK state-funded school in a specifically UK year-group system (Year 12 England/Wales, Year 13 NI, S5 Scotland), mechanically implies United Kingdom.'),
    ('d38255f3-6ce2-440c-b302-c39ee6b17cde'::uuid, ARRAY['United States'], 'Washington University in St. Louis College Prep Program -- residency_restrictions names the St. Louis, Missouri area, mechanically implies United States.'),
    ('22fb607f-3aab-4320-a737-3531d0b96702'::uuid, ARRAY['United States'], 'WYSE Young Scholars Summer STEMM Research Program -- residency_restrictions names 7 specific US states (this row''s source_url and description both specifically identify the Young Scholars track, not the broader/open EYO camp).'),
    ('690eba7f-0de9-4298-b746-c3456391b9b5'::uuid, ARRAY['United States'], 'Coca-Cola Scholars Program -- citizenship_restrictions: "U.S. Citizens, U.S. Nationals, U.S. Permanent Residents, Refugees, Asylees, Cuban-Haitian Entrants, or Humanitarian Parolees only." (all listed categories are US immigration/residency statuses).'),
    ('a2c63505-1481-4a1f-94cc-6ab86dc35405'::uuid, ARRAY['United States'], 'QuestBridge National College Match -- citizenship_restrictions: "U.S. citizens and permanent residents (including those living abroad); international students living outside the U.S. are not eligible." Same shape as the already-live Davidson Fellows row.')
)
UPDATE public.opportunities o
SET eligible_countries = fixes.countries,
    updated_at = now()
FROM fixes
WHERE o.id = fixes.id
  AND (o.eligible_countries IS NULL OR o.eligible_countries = '{}');

-- Expect exactly 13.
SELECT count(*) AS rows_updated_this_statement FROM public.opportunities
WHERE id IN (
  '4fe18f68-5aac-46a1-b8a0-65a82ca4248d','9b6aefb3-a33e-45a1-af06-5a770a92c45a',
  'b32fd331-055e-4a12-968e-0e369d1234af','995daf25-80ab-4e9a-bcd7-2cd2b2d9d18a',
  'f2e23349-5a79-4cb2-9bbd-ccefe334dbd7','b87aba0b-755d-4802-a294-369db2acccd0',
  'b80369c3-76bd-47c4-9f9a-25f6503a3ff4','fd6c9cf1-b112-478a-8b4f-57989368abaa',
  '27213610-1b19-4e85-b52a-50e165607159','d38255f3-6ce2-440c-b302-c39ee6b17cde',
  '22fb607f-3aab-4320-a737-3531d0b96702','690eba7f-0de9-4298-b746-c3456391b9b5',
  'a2c63505-1481-4a1f-94cc-6ab86dc35405'
) AND eligible_countries != '{}';

ROLLBACK;
