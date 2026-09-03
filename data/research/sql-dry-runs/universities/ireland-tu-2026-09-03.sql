-- Ireland Technological University (TU) sector -- the remaining 4 of 5
-- Technological University Dublin already exists in the live DB
-- (id confirmed via direct query before writing this file) -- NOT re-inserted
-- here, avoiding the exact duplicate-under-old-or-new-name risk this batch was
-- specifically briefed to watch for.
--
-- Source: HEA (Higher Education Authority), Ireland's statutory higher-education
-- authority -- its own 'Higher Education Institutions' list names exactly these
-- 5 TUs (plus TU Dublin) among Ireland's full HEI list. Dundalk Institute of
-- Technology also appears on HEA's list as a separate, still-unconverted
-- institute -- confirmed NOT a stale name for any of the 5 TUs, genuinely a
-- different, still-independent institution; correctly excluded from this batch.
-- Retrieved: 2026-09-03.
--
-- ORDERING: this file references academic_tier / academic_tier_local_name, added by
-- supabase/migrations/0108_academic_tier.sql (written not applied). Apply 0108 first --
-- running this file before 0108 fails cleanly with 'column does not exist', which is
-- the correct failure; it does not half-apply.
--
-- Each institution's merger history (which Institutes of Technology combined,
-- and when) was verified live, not assumed from general knowledge -- see
-- docs/ireland-tu-sector-2026-09-03.md. HEA's own naming for the fifth
-- institution ('Technological University Shannon: Midlands Midwest') is used
-- as authoritative in preference to the 'Technological University OF THE
-- Shannon' variant seen elsewhere.
--
-- All 4 website_urls live-verified by direct navigation. Ireland is the FIFTH
-- and, per this corridor-gap line's brief, final country on this list for now.
--
-- academic_tier = 'applied_sciences' FOR ALL 4 -- FLAGGED, NOT SETTLED.
-- Unlike NL/DE/FI/AT, Ireland's TUs are legally full universities today,
-- converted from Institutes of Technology by statute -- no different in law from
-- Trinity or UCD. This value leans on lineage and on why this data was sourced
-- (Ireland's TUs are the corridor scan's own control case for why some
-- applied-sciences-lineage institutions already read as ordinary universities in
-- this catalogue -- Technological University Dublin, untouched by any of this --
-- and others didn't: they got the word "University"), NOT on current legal
-- status, which would argue for 'research_university' instead, consistent with
-- every other Irish row already in the catalogue. Whether Irish TU admissions are
-- PRACTICALLY different from Dublin/UCC/Galway's today has not been checked --
-- that's a separate factual question from the institutional-history one this file
-- answers. Same open question as supabase/migrations/0108_academic_tier.sql's own
-- comment -- see it and docs/academic-tier-migration-proposal-2026-09-03.md before
-- applying this file, in case the founder decided the other way in the meantime.
-- academic_tier_local_name = 'Technological University', HEA's own term for the form.

insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Atlantic Technological University',
  'Ireland',
  'Galway',
  'https://www.atu.ie',
  'Irish Technological University (TU sector, converted by statute from Institutes of Technology). multi-campus: Donegal, Sligo, Mayo, Galway (formed 2022 from a merger of Galway-Mayo Institute of Technology, Institute of Technology Sligo, and Letterkenny Institute of Technology); Galway used as primary, not a single confirmed HQ page. Source: HEA, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',  -- FLAGGED: see header -- lineage-based, not settled by current legal status
  'Technological University',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Munster Technological University',
  'Ireland',
  'Cork',
  'https://www.mtu.ie',
  'Irish Technological University (TU sector, converted by statute from Institutes of Technology). operates as "MTU, Cork & Kerry" per its own site; multi-campus across Cork and Kerry (formed 2021 from a merger of Cork Institute of Technology and Institute of Technology Tralee). Source: HEA, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',  -- FLAGGED: see header -- lineage-based, not settled by current legal status
  'Technological University',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'South East Technological University',
  'Ireland',
  'Waterford',
  'https://www.setu.ie',
  'Irish Technological University (TU sector, converted by statute from Institutes of Technology). multi-campus: Carlow, Waterford, Wexford (formed 2022 from a merger of Waterford Institute of Technology and Institute of Technology Carlow); Waterford used as primary, not a single confirmed HQ page. Source: HEA, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',  -- FLAGGED: see header -- lineage-based, not settled by current legal status
  'Technological University',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Technological University Shannon: Midlands Midwest',
  'Ireland',
  'Limerick',
  'https://www.tus.ie',
  'Irish Technological University (TU sector, converted by statute from Institutes of Technology). official HEA name; multi-campus, 7 campuses with principal sites at Limerick and Athlone (formed 2021 from a merger of Limerick Institute of Technology and Athlone Institute of Technology). Source: HEA, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',  -- FLAGGED: see header -- lineage-based, not settled by current legal status
  'Technological University',
  'high',
  'fresh',
  now()
);
