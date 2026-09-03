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
-- Each institution's merger history (which Institutes of Technology combined,
-- and when) was verified live, not assumed from general knowledge -- see
-- docs/ireland-tu-sector-2026-09-03.md. HEA's own naming for the fifth
-- institution ('Technological University Shannon: Midlands Midwest') is used
-- as authoritative in preference to the 'Technological University OF THE
-- Shannon' variant seen elsewhere.
--
-- All 4 website_urls live-verified by direct navigation. institution_type left
-- NULL, same interim as the Netherlands/Germany/Finland/Austria batches --
-- Ireland is the FIFTH and, per this corridor-gap line's brief, final country on
-- this list for now.

insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Atlantic Technological University',
  'Ireland',
  'Galway',
  'https://www.atu.ie',
  'Irish Technological University (TU sector, converted by statute from Institutes of Technology). multi-campus: Donegal, Sligo, Mayo, Galway (formed 2022 from a merger of Galway-Mayo Institute of Technology, Institute of Technology Sligo, and Letterkenny Institute of Technology); Galway used as primary, not a single confirmed HQ page. Source: HEA, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Munster Technological University',
  'Ireland',
  'Cork',
  'https://www.mtu.ie',
  'Irish Technological University (TU sector, converted by statute from Institutes of Technology). operates as "MTU, Cork & Kerry" per its own site; multi-campus across Cork and Kerry (formed 2021 from a merger of Cork Institute of Technology and Institute of Technology Tralee). Source: HEA, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'South East Technological University',
  'Ireland',
  'Waterford',
  'https://www.setu.ie',
  'Irish Technological University (TU sector, converted by statute from Institutes of Technology). multi-campus: Carlow, Waterford, Wexford (formed 2022 from a merger of Waterford Institute of Technology and Institute of Technology Carlow); Waterford used as primary, not a single confirmed HQ page. Source: HEA, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technological University Shannon: Midlands Midwest',
  'Ireland',
  'Limerick',
  'https://www.tus.ie',
  'Irish Technological University (TU sector, converted by statute from Institutes of Technology). official HEA name; multi-campus, 7 campuses with principal sites at Limerick and Athlone (formed 2021 from a merger of Limerick Institute of Technology and Athlone Institute of Technology). Source: HEA, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
