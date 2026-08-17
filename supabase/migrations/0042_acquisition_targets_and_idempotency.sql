-- Phase 2 of the Cialfo data-gap work (docs/cialfo-public-intelligence-audit.md): the
-- columns and constraints the verified-acquisition pipeline needs.
--
-- Note what is NOT here. The identity pilot (supabase/fixtures/university-identity-pilot.json)
-- required no schema change at all: official website goes to universities.website_url, the
-- research-topic and other dated metrics go to the deliberately schema-flexible
-- university_profile_metrics (migration 0038), cross-registry ids go to entity_external_ids
-- and name forms to entity_aliases. That is the canonical-entity registry doing its job —
-- new external sources attach to the existing identity system instead of growing a parallel
-- one. This migration is for the *next* layer (admissions policy and cost), plus two real
-- idempotency gaps that exist today.
--
-- Text + CHECK rather than new Postgres enums, matching the migration 0038/0041 convention:
-- ALTER TYPE ADD VALUE has transaction restrictions that make enums awkward to extend, and
-- these vocabularies will grow.

-- ---------------------------------------------------------------------------
-- 1. Admissions entry points on the university itself
--
-- These are institution attributes, not requirements: "which system do I apply through"
-- and "where is the authoritative admissions page". They were previously unrepresentable,
-- so the audit's `admissions URLs` and `application system` gaps had nowhere to land even
-- once the data existed. Nullable with no default — an unknown application system must read
-- as unknown, never as a guessed value.
-- ---------------------------------------------------------------------------
alter table public.universities
  add column if not exists admissions_url text,
  -- e.g. 'UCAS', 'Common App', 'Studielink', 'Parcoursup', 'ÖSYM/YKS', 'uni-assist',
  -- 'direct'. Free text rather than a CHECK list: the set is large, country-specific, and
  -- genuinely open-ended, and a wrong constraint here would block a correct value.
  add column if not exists application_system text;

comment on column public.universities.admissions_url is
  'Official admissions page for this institution, used as the authoritative starting point for requirement/deadline acquisition. Must be on the institution''s own domain.';
comment on column public.universities.application_system is
  'The application route students actually use (UCAS, Common App, Studielink, Parcoursup, ÖSYM/YKS, uni-assist, direct). Null means unknown, never "direct".';

-- ---------------------------------------------------------------------------
-- 2. Bring university_requirements onto the same verification taxonomy as opportunities
--
-- migration 0041 gave `opportunities` a verification_state, but requirements — which are
-- exactly the kind of per-cycle fact that goes stale silently — still only had
-- data_confidence/data_status. Without a verification_state a requirement acquired from an
-- official page this cycle is indistinguishable from one carried over from two cycles ago.
-- Same value list as 0041 so one vocabulary covers both.
-- ---------------------------------------------------------------------------
alter table public.university_requirements
  add column if not exists verification_state text not null default 'unverified'
    check (verification_state = any (array['verified_current', 'verified_historical', 'verified_derived', 'unverified', 'conflicting'])),
  add column if not exists verified_at timestamptz,
  -- What the requirement applies to, e.g. 'international_undergraduate',
  -- 'eu_undergraduate'. A requirement that differs by applicant group is a different
  -- requirement, and flattening the distinction is how a student reads a domestic rule as
  -- theirs.
  add column if not exists scope text;

comment on column public.university_requirements.scope is
  'Applicant group this requirement applies to (international_undergraduate, eu_undergraduate, ...). Null means it applies to all applicants.';

create index if not exists university_requirements_verification_state_idx
  on public.university_requirements(verification_state);

-- ---------------------------------------------------------------------------
-- 3. Idempotency gaps that exist right now
--
-- 3a. migration 0028 added a unique index on (program_id, requirement_type) but scoped it
--     `where program_id is not null`. University-wide requirements — every requirement whose
--     program_id is null, which is most of what a first import produces — therefore have no
--     uniqueness at all, and re-running an import duplicates every one of them. Adding the
--     complementary partial index closes it. Both tables are still empty live, so there is
--     no existing duplicate to violate the constraint at creation time (same reasoning 0028
--     and 0032 already used).
--
--     `scope` is part of the key: an English requirement for international applicants and
--     one for EU applicants are genuinely two rows, not a conflict. coalesce() keeps a null
--     scope from defeating the uniqueness the way a plain column list would.
create unique index if not exists university_requirements_university_type_scope_idx
  on public.university_requirements (university_id, requirement_type, coalesce(scope, ''))
  where program_id is null;

-- 3b. university_profile_metrics has only non-unique indexes (migration 0038), so importing
--     the same metric twice inserts a second row rather than updating the first. The natural
--     key is (university_id, metric_code, scope, stats_as_of): several rows per metric_code
--     over time is intended and useful — one row per metric per scope per period — but two
--     rows for the same metric, scope AND period is always a duplicate.
--
--     stats_as_of is nullable free text, so it is coalesced for the same reason as above.
create unique index if not exists university_profile_metrics_natural_key_idx
  on public.university_profile_metrics (university_id, metric_code, scope, coalesce(stats_as_of, ''));

comment on index public.university_profile_metrics_natural_key_idx is
  'Natural key for idempotent metric import. Multiple rows per metric_code are intended (different scopes/periods); the same metric for the same scope and period is a duplicate.';
