-- Canonical registry delta — Drive corpus reconciliation.
--
-- REPLACES supabase/seed_entities_drive_batch1.sql, which targeted the superseded
-- `institutions` architecture and a `universities.aliases` column that does not exist.
--
-- This is a DELTA, not a replay. The live registry was compared row by row against
-- "ORYN Canonical App Data Pack — Verified 2026-08-15" before any of this was written:
--
--   schools (TRSCH, 54 rows)  -> already present. All 58 live school entities carry
--                                metadata.drive_seed_id from that same pack. Nothing to do.
--   universities (GUNI, 77)   -> already present. 63 match by exact name; the other 14
--                                match under the QS-style name with the abbreviation in
--                                parentheses ("California Institute of Technology" is
--                                live as "California Institute of Technology (Caltech)").
--                                Inserting them would create 14 real duplicates.
--   organizations (PROV, 19)  -> 17 genuinely missing (section 1 below). The other 2,
--                                Yale and Carnegie Mellon, already exist as `university`
--                                entities. They are the same real institutions, and every
--                                organization-ish field accepts entity_type='university',
--                                so a second row would be a duplicate identity for no gain.
--   opportunity aliases (5)   -> not applicable: `opportunities` is empty live, so there
--                                is nothing to attach them to.
--
-- Idempotent: safe to re-run. Nothing here updates or deletes an existing row, and no
-- live id changes.

-- ---------------------------------------------------------------------------
-- 1. Program providers from the Drive pack that the registry does not have
--
-- Entity types are mapped from the pack's own `institution_type` rather than filed
-- wholesale as 'organization', because the type is what each profile field's trigger
-- checks: a journal filed as 'organization' would be linkable from a work_experiences
-- row, an 'opportunity_provider' is what a summer-program field actually wants.
--
-- verification_state='source_verified', not 'official_verified': the pack states an
-- official URL for each, and that is a sourced claim, but no one has re-checked those
-- pages here. Evidence rows below record exactly what the claim rests on.
-- ---------------------------------------------------------------------------

insert into public.canonical_entities
  (entity_type, canonical_name, display_name, normalized_name, country_code, city, official_url, verification_state, data_status, source_priority, metadata)
values
  ('opportunity_provider', 'London International Youth Science Forum', 'London International Youth Science Forum', lower(unaccent('London International Youth Science Forum')), 'GB', null, 'https://liysf.org.uk', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0001","drive_institution_type":"nonprofit_program_provider"}'),
  ('organization', 'Breakthrough Prize Foundation', 'Breakthrough Prize Foundation', lower(unaccent('Breakthrough Prize Foundation')), 'US', null, 'https://breakthroughjuniorchallenge.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0003","drive_institution_type":"foundation"}'),
  ('organization', 'Conrad Foundation', 'Conrad Foundation', lower(unaccent('Conrad Foundation')), 'US', null, 'https://conrad.spacecenter.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0004","drive_institution_type":"foundation"}'),
  ('organization', 'University of Delaware Horn Entrepreneurship', 'University of Delaware Horn Entrepreneurship', lower(unaccent('University of Delaware Horn Entrepreneurship')), 'US', null, 'https://diamondchallenge.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0005","drive_institution_type":"university_center"}'),
  ('competition', 'Blue Ocean Competition', 'Blue Ocean Competition', lower(unaccent('Blue Ocean Competition')), 'US', null, 'https://blueoceancompetition.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0006","drive_institution_type":"competition_provider"}'),
  ('opportunity_provider', 'Immerse Education', 'Immerse Education', lower(unaccent('Immerse Education')), 'GB', null, 'https://immerse.education', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0007","drive_institution_type":"education_provider"}'),
  ('opportunity_provider', 'Summer Science Program', 'Summer Science Program', lower(unaccent('Summer Science Program')), 'US', null, 'https://ssp.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0008","drive_institution_type":"nonprofit_program_provider"}'),
  ('program', 'PROMYS', 'PROMYS', lower(unaccent('PROMYS')), 'US', null, 'https://promys.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0009","drive_institution_type":"academic_program"}'),
  ('organization', 'Journal of Emerging Investigators', 'Journal of Emerging Investigators', lower(unaccent('Journal of Emerging Investigators')), 'US', null, 'https://emerginginvestigators.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0010","drive_institution_type":"journal"}'),
  ('organization', 'The Concord Review', 'The Concord Review', lower(unaccent('The Concord Review')), 'US', null, 'https://tcr.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0011","drive_institution_type":"journal"}'),
  ('school', 'Phillips Academy', 'Phillips Academy', lower(unaccent('Phillips Academy')), 'US', 'Andover', 'https://andover.edu', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0012","drive_institution_type":"school","note":"Andover Summer provider"}'),
  ('university', 'Acıbadem University', 'Acıbadem University', lower(unaccent('Acıbadem University')), 'TR', 'İstanbul', 'https://acibadem.edu.tr', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0013","drive_institution_type":"university"}'),
  ('opportunity_provider', 'AwesomeMath', 'AwesomeMath', lower(unaccent('AwesomeMath')), 'US', null, 'https://awesomemath.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0015","drive_institution_type":"education_provider"}'),
  ('competition', 'Harvard-MIT Mathematics Tournament', 'Harvard-MIT Mathematics Tournament', lower(unaccent('Harvard-MIT Mathematics Tournament')), 'US', null, 'https://hmmt.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0016","drive_institution_type":"student_run_competition"}'),
  ('organization', 'The Earth Foundation', 'The Earth Foundation', lower(unaccent('The Earth Foundation')), 'CH', 'Geneva', 'https://theearthprize.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0017","drive_institution_type":"foundation"}'),
  ('program', 'Wharton Global Youth Program', 'Wharton Global Youth Program', lower(unaccent('Wharton Global Youth Program')), 'US', null, 'https://globalyouth.wharton.upenn.edu', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0018","drive_institution_type":"university_program"}'),
  ('organization', 'Mathematical Association of America', 'Mathematical Association of America', lower(unaccent('Mathematical Association of America')), 'US', null, 'https://maa.org', 'source_verified', 'fresh', 20, '{"drive_seed_id":"PROV-0019","drive_institution_type":"professional_association"}')
on conflict do nothing;

-- The pack states these two abbreviations explicitly; nothing is inferred.
insert into public.entity_aliases (entity_id, alias, normalized_alias, alias_type, source_url, verified)
select e.id, v.alias, lower(unaccent(v.alias)), 'abbreviation', e.official_url, true
from (values ('Harvard-MIT Mathematics Tournament', 'HMMT'), ('Mathematical Association of America', 'MAA')) as v(entity_name, alias)
join public.canonical_entities e on e.display_name = v.entity_name
on conflict (entity_id, normalized_alias) do nothing;

insert into public.entity_evidence (entity_id, field_group, source_url, source_owner, source_type, evidence_summary, primary_source)
select e.id, 'identity', e.official_url, e.display_name, 'official_primary',
       'Official site stated as the entity''s own URL by "ORYN Canonical App Data Pack — Verified 2026-08-15" (' || (e.metadata->>'drive_seed_id') || ').', true
from public.canonical_entities e
where e.metadata->>'drive_seed_id' like 'PROV-%' and e.official_url is not null
on conflict (entity_id, field_group, source_url) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Free the abbreviations trapped inside university display names
--
-- The QS 2027 ingest wrote names in the form "University of California, Los Angeles
-- (UCLA)". The parenthetical is the institution's own abbreviation, but because it lives
-- inside the display name rather than in entity_aliases, alias search could not use it:
-- before this ran, searching "UCLA", "Caltech", "NUS", "LSE", "MIT" or "UNSW" returned
-- NOTHING (and "UCLA" actually returned University College London, a different
-- university). That is the headline feature of the entity autocomplete not working on
-- the data the product actually ships.
--
-- Extraction is deterministic and restates data already in the row: it takes only a
-- TRAILING parenthetical, only when the content is short and contains no comma or
-- sentence punctuation, and it never touches display_name — the sourced QS name stays
-- exactly as ingested. alias_type='abbreviation', verified=false: this is a restatement
-- of the stored name, not an independently checked fact.
-- ---------------------------------------------------------------------------

insert into public.entity_aliases (entity_id, alias, normalized_alias, alias_type, verified)
select
  e.id,
  m.abbreviation,
  lower(unaccent(m.abbreviation)),
  'abbreviation',
  false
from public.canonical_entities e
cross join lateral (
  select trim((regexp_match(e.display_name, '\(([^()]{1,40})\)\s*$'))[1]) as abbreviation
) m
where e.verification_state <> 'merged'
  and m.abbreviation is not null
  and m.abbreviation <> ''
  and m.abbreviation !~ '[,;.]'
  -- An abbreviation identical to the name it came from adds nothing and inflates
  -- alias-tier ranking (lib/entities/audit.ts flags exactly this as INVALID).
  and lower(unaccent(m.abbreviation)) <> lower(unaccent(regexp_replace(e.display_name, '\s*\([^()]*\)\s*$', '')))
on conflict (entity_id, normalized_alias) do nothing;

-- The name without its parenthetical is also worth having as an alias: a student types
-- "California Institute of Technology", not "California Institute of Technology
-- (Caltech)". Prefix matching already handles that, but an exact alias ranks it above a
-- prefix hit on a longer, less relevant name.
insert into public.entity_aliases (entity_id, alias, normalized_alias, alias_type, verified)
select e.id, m.base_name, lower(unaccent(m.base_name)), 'common', false
from public.canonical_entities e
cross join lateral (
  select trim(regexp_replace(e.display_name, '\s*\([^()]{1,40}\)\s*$', '')) as base_name
) m
where e.verification_state <> 'merged'
  and m.base_name <> ''
  and lower(unaccent(m.base_name)) <> lower(unaccent(e.display_name))
on conflict (entity_id, normalized_alias) do nothing;
