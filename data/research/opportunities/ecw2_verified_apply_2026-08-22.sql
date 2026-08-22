-- ECW2 wave-2: the two verified DB-changing records.
-- Verified 2026-08-22 by the RES-V-R3W2 lane: PASS 22/22, zero blocking defects
-- (verdict: docs/research/verification/v_ecw2_verdict.md on oryn/res-v-ecw2-verification).
-- Idempotent by construction — every UPDATE guarded by id AND a still-in-expected-state
-- predicate, so re-running is a no-op. Safe to run twice.
--
-- Written out rather than applied in-session because the coordinating session's DB-write
-- path was blocked by the environment's safety classifier. Apply from the Supabase SQL
-- editor, or from a session with DB-write permission.

begin;

-- (1) URGENT — ECW2-020, Türkiye Scholarships. A live trust defect for ORYN's core
-- Turkish audience: the official turkiyeburslari.gov.tr page explicitly excludes Turkish
-- citizens, but the live row's prose says only "Open to citizens of all countries."
-- Independently re-fetched and confirmed verbatim by the verification lane.
-- eligible_countries deliberately STAYS EMPTY — the field is inclusion-only at country
-- granularity, and an enumerated all-but-one list would be fabrication.
update opportunities
set citizenship_restrictions = 'Open to citizens of all countries; Turkish citizens and individuals who have lost Turkish citizenship are not eligible (nor are students already enrolled at a Turkish university at the level they are applying for).',
    last_verified_at = now()
where id = '34033f8a-51e1-4c73-9b7e-2e3819a348dc'
  and citizenship_restrictions = 'Open to citizens of all countries.';

-- (2) ECW2-017, TechGirls. 37/37 countries verified name-by-name against the official
-- 2026 eligibility page via a mechanical sorted diff (not an eyeball check); spellings
-- confirmed against the live table's own vocabulary.
update opportunities
set eligible_countries = array['Cameroon','Kenya','Nigeria','Rwanda','South Africa','Zambia','Cambodia','Fiji','Indonesia','Mongolia','Taiwan','Vietnam','Albania','Cyprus','Greece','Kosovo','Montenegro','Türkiye','Algeria','Egypt','Jordan','Lebanon','Morocco','Palestinian Territories','Tunisia','Kazakhstan','Kyrgyzstan','Pakistan','Tajikistan','Turkmenistan','Uzbekistan','Costa Rica','Ecuador','Panama','Peru','Suriname','United States'],
    citizenship_restrictions = 'Must be a citizen of one of the 2026 participating countries/territories AND living in that country/territory at the time of exchange. Cycle-specific list, refreshed annually. Additional exclusions: prior ECA exchange-program travel, dual US citizens/residents living abroad, immediate family of program staff. Open to girls only.',
    last_verified_at = now()
where id = '7081b03a-3e04-4843-8bc5-0078cfd040f2'
  and (eligible_countries is null or eligible_countries = '{}');

-- Expected after: Türkiye Scholarships country_count 0 (unchanged, correct),
-- prose now carries the exclusion; TechGirls country_count 37.
select id, title, cardinality(eligible_countries) as country_count,
       left(citizenship_restrictions, 90) as prose_start, last_verified_at
from opportunities
where id in ('34033f8a-51e1-4c73-9b7e-2e3819a348dc','7081b03a-3e04-4843-8bc5-0078cfd040f2');

commit;
