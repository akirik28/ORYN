-- Netherlands WO (research university) gaps -- follow-up to the original hogescholen
-- pass, which found DUO lists 18 WO institutions against the catalogue's 13 and flagged
-- the 5-institution gap as a separate, unresolved package (not acted on at the time).
--
-- Of the 5, 3 are excluded here on product-fit grounds, not data grounds -- see
-- docs/netherlands-wo-gaps-2026-09-03.md for the full reasoning. Only the 2 that survive
-- that judgment are staged below.
--
-- Both rows are shaped identically to the 11 (of 13) existing Dutch rows that use the
-- more current convention (institution_type='Public', data_confidence='high',
-- data_status='fresh') -- NOT the 2 older outlier rows (Radboud, Tilburg) still on
-- institution_type='university'/medium/needs_review. Because these are research
-- universities -- the same sector as the existing 13 -- institution_type is NOT the
-- schema-gated NULL used across the five applied-sciences batches; there is no schema
-- question blocking this package.
--
-- Sources: DUO (confirms both are on the official 18-institution WO list) + each
-- institution's own official site (confirms city, live website). Retrieved 2026-09-03.
--
-- ORDERING: this file references academic_tier, added by
-- supabase/migrations/0108_academic_tier.sql (written not applied). Apply 0108 first --
-- running this file before 0108 fails cleanly with 'column does not exist', which is the
-- correct failure; it does not half-apply.
--
-- academic_tier = 'research_university' for both -- unambiguous, same sector as the
-- existing 13 Dutch rows. academic_tier_local_name is left NULL here, deliberately: the
-- column exists to carry a DISTINCT local institutional form (Fachhochschule, Hogeschool,
-- Ammattikorkeakoulu) that a student needs alongside the shared tier -- for an ordinary
-- research university, the generic Dutch word ("Universiteit") adds no signal beyond what
-- academic_tier already states, unlike the applied-sciences tier where the local term is
-- the whole point. Not populated for consistency's sake alone.

insert into universities (name, country, city, website_url, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Open Universiteit',
  'Netherlands',
  'Heerlen',
  'https://www.ou.nl',
  'Public',
  'research_university',
  NULL,
  'high',
  'fresh',
  now()
);

insert into universities (name, country, city, website_url, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Universiteit voor Humanistiek',
  'Netherlands',
  'Utrecht',
  'https://www.uvh.nl',
  'Public',
  'research_university',
  NULL,
  'high',
  'fresh',
  now()
);
