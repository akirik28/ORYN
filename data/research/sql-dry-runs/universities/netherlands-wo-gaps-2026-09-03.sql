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

insert into universities (name, country, city, website_url, institution_type, data_confidence, data_status, last_checked_at) values (
  'Open Universiteit',
  'Netherlands',
  'Heerlen',
  'https://www.ou.nl',
  'Public',
  'high',
  'fresh',
  now()
);

insert into universities (name, country, city, website_url, institution_type, data_confidence, data_status, last_checked_at) values (
  'Universiteit voor Humanistiek',
  'Netherlands',
  'Utrecht',
  'https://www.uvh.nl',
  'Public',
  'high',
  'fresh',
  now()
);
