-- Canonical Entity Registry.
--
-- REPLACES the previous 0038_canonical_institutions.sql, which introduced a second,
-- competing identity architecture (`institutions` + `aliases text[]` on universities/
-- opportunities). That file was never applied to any database. The oryn-qa-scratch
-- project already carried a richer canonical registry -- built directly against the
-- project between 2026-08-16 and 2026-08-17 and never committed here (see
-- docs/live-db-reconciliation.md for the drift trace) -- so the repo converges onto the
-- live design rather than the other way round. Nothing is dropped and no live data moves.
--
-- Why this design wins over `institutions`:
--   * one registry for every named real-world entity (school, university, employer, NGO,
--     lab, club, sports team, program provider, country, city) instead of two;
--   * aliases are rows, not an array column, so each carries its own language, type,
--     source URL and verified flag, and can be indexed and searched on its own;
--   * evidence, external IDs, locations, relationships, a verification queue and an
--     auditable merge workflow all exist as first-class tables -- the `institutions`
--     design had none of them, and every one is a stated ORYN requirement;
--   * per-field allowed entity types are enforced by database triggers, not only by
--     application code.
--
-- This file is written to be idempotent: it is a no-op against oryn-qa-scratch (which
-- already has every object below) and a full build on a fresh database, so both
-- converge to the same schema.

create extension if not exists pg_trgm with schema public;
create extension if not exists unaccent with schema public;

-- ---------------------------------------------------------------------------
-- Core registry
-- ---------------------------------------------------------------------------

create table if not exists public.canonical_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
    'school','university','employer','organization','research_institution','lab','ngo',
    'club','opportunity_provider','program','competition','scholarship','sports_team',
    'country','city'
  )),
  -- canonical_name is the legal/registry name; display_name is what the UI shows. They
  -- differ when an institution's legal name is unwieldy. normalized_name is the identity
  -- key (never displayed); search_key is the trigram-indexed search form, maintained by
  -- a trigger so it can never drift from display_name.
  canonical_name text not null,
  display_name text not null,
  normalized_name text not null,
  country_code text,
  city text,
  official_url text,
  parent_entity_id uuid references public.canonical_entities(id) on delete set null,
  canonicality_rule text not null default 'preferred_custom_fallback'
    check (canonicality_rule in ('required','preferred_custom_fallback','free_text_not_entity')),
  verification_state text not null default 'unverified'
    check (verification_state in ('unverified','user_submitted','source_verified','official_verified','conflict','merged','inactive')),
  data_status text not null default 'needs_review'
    check (data_status in ('fresh','stale','needs_review','unavailable')),
  source_priority integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_key text
);

comment on table public.canonical_entities is
  'One registry for every named real-world entity a student profile can reference. Distinguished by entity_type, not by separate tables -- see docs/live-db-reconciliation.md.';

-- Merged rows are excluded so a merge can never be blocked by the tombstone it leaves
-- behind. Coalescing country/city means a row with unknown geography does NOT collide
-- with a located one of the same name -- deliberate (two real institutions can share a
-- name in different cities) but it is also why near-duplicates need the alias-aware
-- check in lib/entities/resolve.ts on top of this constraint.
create unique index if not exists canonical_entities_identity_uq
  on public.canonical_entities (entity_type, normalized_name, coalesce(country_code, ''), coalesce(city, ''))
  where verification_state <> 'merged';
create index if not exists canonical_entities_lookup_idx on public.canonical_entities (entity_type, normalized_name);
create index if not exists canonical_entities_search_key_trgm_idx on public.canonical_entities using gin (search_key gin_trgm_ops);

create table if not exists public.entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  language_code text,
  alias_type text not null default 'common'
    check (alias_type in ('official','common','abbreviation','legacy','translation','user_submitted')),
  source_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  alias_search_key text,
  unique (entity_id, normalized_alias)
);
comment on table public.entity_aliases is
  'Search-only alternate names ("MIT", "UAA", local-language forms). Never replaces the display name.';
create index if not exists entity_aliases_lookup_idx on public.entity_aliases (normalized_alias);
create index if not exists entity_aliases_search_key_trgm_idx on public.entity_aliases using gin (alias_search_key gin_trgm_ops);

create table if not exists public.entity_external_ids (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  id_system text not null,
  external_id text not null,
  source_url text,
  verification_state text not null default 'source_verified'
    check (verification_state in ('unverified','source_verified','official_verified','conflict','inactive')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id_system, external_id)
);

create table if not exists public.entity_evidence (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  field_group text not null,
  source_url text not null,
  source_owner text,
  source_type text not null default 'official_primary',
  captured_at timestamptz not null default now(),
  evidence_summary text,
  primary_source boolean not null default true,
  release_decision text not null default 'approved',
  data_quality_flag text not null default 'current',
  created_at timestamptz not null default now(),
  unique (entity_id, field_group, source_url)
);
comment on table public.entity_evidence is
  'Source traceability per field group. A verification_state of official_verified is only defensible when a matching primary-source row exists here.';

-- Polymorphic back-pointer from a canonical entity to a domain row. record_id carries no
-- FK (it can address any of a dozen tables), so callers must re-verify existence.
create table if not exists public.entity_record_links (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  record_table text not null,
  record_id uuid not null,
  link_type text not null default 'canonical_identity',
  created_at timestamptz not null default now(),
  unique (record_table, record_id, link_type)
);

create table if not exists public.entity_verification_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  proposed_name text not null,
  country_code text,
  city text,
  source_hint text,
  priority text not null default 'P2',
  queue_state text not null default 'queued',
  required_actions jsonb not null default '[]'::jsonb,
  blocker text,
  canonical_entity_id uuid references public.canonical_entities(id) on delete set null,
  last_checked_at timestamptz,
  next_check_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists entity_verification_queue_state_idx on public.entity_verification_queue (queue_state, priority);
create index if not exists entity_verification_queue_type_idx on public.entity_verification_queue (entity_type, country_code);

-- Machine-readable version of the field-by-field canonicalization audit: for each
-- (table, text column), which entity types may be linked and whether a student may
-- create a custom fallback. Kept in sync by hand with the triggers further down; the
-- triggers are the enforcement, this table is the documentation the app reads.
create table if not exists public.canonical_field_policies (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  text_column text not null,
  canonical_id_column text,
  policy text not null check (policy in ('canonical_required','canonical_preferred_custom_fallback','free_text_remains')),
  allowed_entity_types text[] not null default '{}'::text[],
  custom_fallback_allowed boolean not null default false,
  release_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (table_name, text_column)
);

create table if not exists public.entity_relationships (
  id uuid primary key default gen_random_uuid(),
  subject_entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  relationship_type text not null check (relationship_type in (
    'part_of','operated_by','campus_of','school_of','provider_for','member_of',
    'successor_of','predecessor_of','related_brand'
  )),
  object_entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  source_url text,
  verification_state text not null default 'unverified'
    check (verification_state in ('unverified','source_verified','official_verified','conflict')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (subject_entity_id <> object_entity_id),
  unique (subject_entity_id, relationship_type, object_entity_id)
);
create index if not exists idx_entity_relationships_subject on public.entity_relationships (subject_entity_id, relationship_type);
create index if not exists idx_entity_relationships_object on public.entity_relationships (object_entity_id, relationship_type);

create table if not exists public.entity_locations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  location_type text not null default 'campus'
    check (location_type in ('campus','school_site','office','headquarters','research_site','event_site','other')),
  location_name text,
  country_code text,
  city text,
  district text,
  address text,
  latitude numeric,
  longitude numeric,
  source_url text,
  verification_state text not null default 'unverified'
    check (verification_state in ('unverified','source_verified','official_verified','conflict')),
  is_primary boolean not null default false,
  valid_from date,
  valid_to date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_entity_locations_entity on public.entity_locations (entity_id);
create index if not exists idx_entity_locations_city on public.entity_locations (country_code, city);

-- Merge audit trail. No delete rule: a merge record must outlive nothing -- both sides
-- are kept, the source is tombstoned as verification_state='merged' rather than removed.
create table if not exists public.canonical_entity_merges (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references public.canonical_entities(id),
  target_entity_id uuid not null references public.canonical_entities(id),
  reason text not null,
  merged_by uuid,
  merged_at timestamptz not null default now(),
  notes text,
  check (source_entity_id <> target_entity_id)
);
create index if not exists idx_canonical_entity_merges_source on public.canonical_entity_merges (source_entity_id);
create index if not exists idx_canonical_entity_merges_target on public.canonical_entity_merges (target_entity_id);

-- ---------------------------------------------------------------------------
-- School reference data (entity-keyed)
-- ---------------------------------------------------------------------------

create table if not exists public.school_profiles (
  entity_id uuid primary key references public.canonical_entities(id) on delete cascade,
  meb_institution_code text unique,
  official_name_tr text,
  official_name_en text,
  school_level text not null default 'high_school',
  ownership_type text check (ownership_type in ('public','private','international','unknown')),
  district text,
  address text,
  boarding_available boolean,
  instruction_languages text[] not null default '{}'::text[],
  overseas_counseling boolean,
  counseling_platform text,
  international_orientation_state text not null default 'unknown'
    check (international_orientation_state in ('unknown','evidence_present','strong','conflict')),
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_credentials (
  id uuid primary key default gen_random_uuid(),
  school_entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  credential_type text not null,
  credential_provider text not null,
  status text not null default 'active',
  valid_from date,
  valid_to date,
  source_url text not null,
  verified_at timestamptz not null default now(),
  notes text,
  unique (school_entity_id, credential_type, credential_provider, source_url)
);

create table if not exists public.school_outcome_metrics (
  id uuid primary key default gen_random_uuid(),
  school_entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  graduation_year integer,
  metric_code text not null check (metric_code in (
    'graduating_class_size','students_applying_abroad','students_accepted_abroad',
    'students_matriculating_abroad','share_applying_abroad','share_matriculating_abroad',
    'scholarship_total','university_acceptances_total','university_matriculations_total',
    'international_university_visits'
  )),
  metric_value numeric not null,
  metric_unit text not null,
  denominator numeric,
  currency text,
  source_url text not null,
  source_date date,
  evidence_quality text not null default 'official_current'
    check (evidence_quality in ('official_current','official_historical','secondary','conflict','unknown')),
  notes text,
  verified_at timestamptz not null default now(),
  unique (school_entity_id, graduation_year, metric_code, source_url)
);

create table if not exists public.school_university_outcomes (
  id uuid primary key default gen_random_uuid(),
  school_entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  graduation_year integer not null,
  university_entity_id uuid references public.canonical_entities(id) on delete set null,
  university_name_raw text not null,
  outcome_type text not null check (outcome_type in ('acceptance','matriculation')),
  student_count integer,
  country text,
  source_url text not null,
  verified_at timestamptz not null default now(),
  unique (school_entity_id, graduation_year, university_name_raw, outcome_type, source_url)
);

-- ---------------------------------------------------------------------------
-- University reference data
-- ---------------------------------------------------------------------------

create table if not exists public.university_rankings (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  ranking_provider text not null,
  ranking_edition text not null,
  rank_display text not null,
  rank_numeric integer,
  list_position integer,
  overall_score numeric,
  source_url text not null,
  source_published_at date,
  verified_at timestamptz not null default now(),
  correction_checked_at timestamptz,
  data_quality_flag text not null default 'current_official',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, ranking_provider, ranking_edition)
);
comment on column public.university_rankings.rank_display is
  'The published rank string exactly as the source states it ("=12", "601-610"). rank_numeric is a derived sort key and is null when the source gives a band, so a band is never silently presented as a precise position.';
create index if not exists idx_university_rankings_provider_edition_position on public.university_rankings (ranking_provider, ranking_edition, list_position);
create index if not exists idx_university_rankings_numeric on public.university_rankings (ranking_provider, ranking_edition, rank_numeric);

create table if not exists public.university_profile_metrics (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  metric_code text not null,
  value_numeric numeric,
  value_text text,
  unit text not null default 'count',
  stats_as_of text,
  scope text not null default 'institution',
  precision_state text not null default 'exact'
    check (precision_state in ('exact','approximate','lower_bound','upper_bound','range','category_only','unknown')),
  source_url text not null,
  source_type text not null default 'official_primary',
  verified_at timestamptz not null default now(),
  data_quality_flag text not null default 'current',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (value_numeric is not null or value_text is not null)
);
comment on table public.university_profile_metrics is
  'Source-grounded dated institution metrics. total_students is mandatory coverage target for ORYN Top1000; never invent exact totals from percentages or overlapping categories.';
create index if not exists idx_university_profile_metrics_university_metric on public.university_profile_metrics (university_id, metric_code);
create index if not exists idx_university_profile_metrics_metric on public.university_profile_metrics (metric_code);

create table if not exists public.university_profile_verification_queue (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  oryn_global_id text,
  institution_name text not null,
  priority text not null default 'P1' check (priority in ('P0','P1','P2','P3')),
  required_metric text not null default 'total_students',
  queue_state text not null default 'queued'
    check (queue_state in ('queued','in_progress','verified','blocked','not_applicable')),
  source_hint text,
  blocker text,
  notes text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (oryn_global_id, required_metric)
);

create table if not exists public.global_university_discovery_queue (
  id uuid primary key default gen_random_uuid(),
  ranking_provider text not null default 'QS',
  ranking_edition text not null default '2027',
  discovery_order integer,
  rank_display text,
  rank_numeric integer,
  institution_name text not null,
  country_name text,
  city text,
  discovery_source_url text not null,
  discovery_source_type text not null default 'secondary_mirror'
    check (discovery_source_type in ('secondary_mirror','official_qs_page','official_qs_excel')),
  official_qs_url text,
  verification_state text not null default 'discovered_secondary'
    check (verification_state in ('discovered_secondary','official_verified','conflict','merged_existing','blocked')),
  queue_state text not null default 'queued' check (queue_state in ('queued','in_progress','verified','blocked')),
  matched_university_id uuid references public.universities(id) on delete set null,
  notes text,
  discovered_at timestamptz not null default now(),
  last_checked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (ranking_provider, ranking_edition, institution_name)
);
comment on table public.global_university_discovery_queue is
  'Non-release discovery staging for QS Top1000 expansion. Secondary mirrors are discovery-only; records must be independently verified against official QS before promotion to universities/university_rankings.';

create table if not exists public.qs2027_import_staging (
  list_position integer primary key,
  rank_display text not null,
  rank_numeric integer,
  institution_name text not null,
  country_name text,
  region text,
  size_code text,
  institution_status text,
  overall_score numeric,
  city text,
  source_url text not null,
  source_kind text not null default 'secondary_copy_of_official_qs_dataset',
  imported_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Canonical linkage columns on existing domain tables
--
-- Every one of these is additive and nullable. The pre-existing free-text column stays
-- exactly as-is, so legacy rows keep rendering unchanged; the *_entity_id column is the
-- source of truth going forward, and the app keeps the text column in sync with the
-- linked entity's current display name at selection time.
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists school_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.profiles add column if not exists country_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.profiles add column if not exists city_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.education_records add column if not exists school_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.education_records add column if not exists country_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.activities add column if not exists organization_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.work_experiences add column if not exists organization_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.volunteering_experiences add column if not exists organization_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.research_experiences add column if not exists organization_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.projects add column if not exists organization_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.awards add column if not exists organization_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.certifications add column if not exists organization_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.sports_experiences add column if not exists team_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.opportunities add column if not exists organization_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.opportunities add column if not exists country_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.universities add column if not exists canonical_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.universities add column if not exists country_entity_id uuid references public.canonical_entities(id) on delete set null;
alter table public.universities add column if not exists city_entity_id uuid references public.canonical_entities(id) on delete set null;

create index if not exists idx_profiles_school_entity on public.profiles (school_entity_id);
create index if not exists idx_profiles_country_entity on public.profiles (country_entity_id);
create index if not exists idx_profiles_city_entity on public.profiles (city_entity_id);
create index if not exists idx_education_school_entity on public.education_records (school_entity_id);
create index if not exists idx_activities_org_entity on public.activities (organization_entity_id);
create index if not exists idx_work_org_entity on public.work_experiences (organization_entity_id);
create index if not exists idx_volunteering_org_entity on public.volunteering_experiences (organization_entity_id);
create index if not exists idx_research_org_entity on public.research_experiences (organization_entity_id);
create index if not exists idx_projects_org_entity on public.projects (organization_entity_id);
create index if not exists idx_awards_org_entity on public.awards (organization_entity_id);
create index if not exists idx_certifications_org_entity on public.certifications (organization_entity_id);
create index if not exists idx_sports_team_entity on public.sports_experiences (team_entity_id);
create index if not exists idx_opportunities_org_entity on public.opportunities (organization_entity_id);
create index if not exists idx_opportunities_country_entity on public.opportunities (country_entity_id);
create index if not exists idx_universities_canonical_entity on public.universities (canonical_entity_id);

-- ---------------------------------------------------------------------------
-- Search-key maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_canonical_entity_search_key()
returns trigger
language plpgsql
set search_path to 'public', 'extensions'
as $$
begin
  new.search_key := lower(regexp_replace(unaccent(coalesce(new.display_name,new.canonical_name,'')), '[^[:alnum:]]+', ' ', 'g'));
  new.search_key := trim(regexp_replace(new.search_key, '\s+', ' ', 'g'));
  return new;
end;
$$;

create or replace function public.set_entity_alias_search_key()
returns trigger
language plpgsql
set search_path to 'public', 'extensions'
as $$
begin
  new.alias_search_key := lower(regexp_replace(unaccent(coalesce(new.alias,'')), '[^[:alnum:]]+', ' ', 'g'));
  new.alias_search_key := trim(regexp_replace(new.alias_search_key, '\s+', ' ', 'g'));
  return new;
end;
$$;

drop trigger if exists trg_canonical_entity_search_key on public.canonical_entities;
create trigger trg_canonical_entity_search_key
  before insert or update of canonical_name, display_name on public.canonical_entities
  for each row execute function public.set_canonical_entity_search_key();

drop trigger if exists trg_entity_alias_search_key on public.entity_aliases;
create trigger trg_entity_alias_search_key
  before insert or update of alias on public.entity_aliases
  for each row execute function public.set_entity_alias_search_key();

-- ---------------------------------------------------------------------------
-- Per-field entity-type enforcement
--
-- The database, not only the application, refuses to link (say) a `city` entity into a
-- work_experiences.organization_entity_id. tg_argv[0] is the column to check, tg_argv[1]
-- a comma-separated list of allowed entity types.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_canonical_entity_type()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  entity_id uuid;
  entity_kind text;
  allowed text[];
begin
  entity_id := (to_jsonb(new)->>tg_argv[0])::uuid;
  if entity_id is null then
    return new;
  end if;
  allowed := string_to_array(tg_argv[1], ',');
  select entity_type into entity_kind from public.canonical_entities where id = entity_id;
  if entity_kind is null then
    raise exception 'Unknown canonical entity id %', entity_id;
  end if;
  if not (entity_kind = any(allowed)) then
    raise exception 'Canonical entity % has type %, expected one of %', entity_id, entity_kind, allowed;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_school_entity_type on public.profiles;
create trigger trg_profiles_school_entity_type before insert or update of school_entity_id on public.profiles
  for each row execute function public.enforce_canonical_entity_type('school_entity_id', 'school');
drop trigger if exists trg_profiles_country_entity_type on public.profiles;
create trigger trg_profiles_country_entity_type before insert or update of country_entity_id on public.profiles
  for each row execute function public.enforce_canonical_entity_type('country_entity_id', 'country');
drop trigger if exists trg_profiles_city_entity_type on public.profiles;
create trigger trg_profiles_city_entity_type before insert or update of city_entity_id on public.profiles
  for each row execute function public.enforce_canonical_entity_type('city_entity_id', 'city');

drop trigger if exists trg_education_school_entity_type on public.education_records;
create trigger trg_education_school_entity_type before insert or update of school_entity_id on public.education_records
  for each row execute function public.enforce_canonical_entity_type('school_entity_id', 'school');
drop trigger if exists trg_education_country_entity_type on public.education_records;
create trigger trg_education_country_entity_type before insert or update of country_entity_id on public.education_records
  for each row execute function public.enforce_canonical_entity_type('country_entity_id', 'country');

drop trigger if exists trg_activities_org_entity_type on public.activities;
create trigger trg_activities_org_entity_type before insert or update of organization_entity_id on public.activities
  for each row execute function public.enforce_canonical_entity_type('organization_entity_id', 'school,university,employer,organization,research_institution,lab,ngo,club,opportunity_provider');

drop trigger if exists trg_work_org_entity_type on public.work_experiences;
create trigger trg_work_org_entity_type before insert or update of organization_entity_id on public.work_experiences
  for each row execute function public.enforce_canonical_entity_type('organization_entity_id', 'employer,organization,research_institution,lab,ngo,school,university,opportunity_provider');

drop trigger if exists trg_volunteering_org_entity_type on public.volunteering_experiences;
create trigger trg_volunteering_org_entity_type before insert or update of organization_entity_id on public.volunteering_experiences
  for each row execute function public.enforce_canonical_entity_type('organization_entity_id', 'organization,ngo,school,university,club,research_institution,opportunity_provider');

drop trigger if exists trg_research_org_entity_type on public.research_experiences;
create trigger trg_research_org_entity_type before insert or update of organization_entity_id on public.research_experiences
  for each row execute function public.enforce_canonical_entity_type('organization_entity_id', 'research_institution,lab,university,school,organization,employer');

drop trigger if exists trg_projects_org_entity_type on public.projects;
create trigger trg_projects_org_entity_type before insert or update of organization_entity_id on public.projects
  for each row execute function public.enforce_canonical_entity_type('organization_entity_id', 'organization,school,university,employer,research_institution,lab,ngo,club,opportunity_provider');

drop trigger if exists trg_awards_org_entity_type on public.awards;
create trigger trg_awards_org_entity_type before insert or update of organization_entity_id on public.awards
  for each row execute function public.enforce_canonical_entity_type('organization_entity_id', 'organization,school,university,employer,research_institution,ngo,club,opportunity_provider');

drop trigger if exists trg_certifications_org_entity_type on public.certifications;
create trigger trg_certifications_org_entity_type before insert or update of organization_entity_id on public.certifications
  for each row execute function public.enforce_canonical_entity_type('organization_entity_id', 'organization,school,university,employer,research_institution,ngo,opportunity_provider');

drop trigger if exists trg_sports_team_entity_type on public.sports_experiences;
create trigger trg_sports_team_entity_type before insert or update of team_entity_id on public.sports_experiences
  for each row execute function public.enforce_canonical_entity_type('team_entity_id', 'sports_team,club,school,university');

drop trigger if exists trg_opportunities_org_entity_type on public.opportunities;
create trigger trg_opportunities_org_entity_type before insert or update of organization_entity_id on public.opportunities
  for each row execute function public.enforce_canonical_entity_type('organization_entity_id', 'opportunity_provider,organization,university,school,employer,research_institution,lab,ngo,club');
drop trigger if exists trg_opportunities_country_entity_type on public.opportunities;
create trigger trg_opportunities_country_entity_type before insert or update of country_entity_id on public.opportunities
  for each row execute function public.enforce_canonical_entity_type('country_entity_id', 'country');

drop trigger if exists trg_universities_canonical_entity_type on public.universities;
create trigger trg_universities_canonical_entity_type before insert or update of canonical_entity_id on public.universities
  for each row execute function public.enforce_canonical_entity_type('canonical_entity_id', 'university');
drop trigger if exists trg_universities_country_entity_type on public.universities;
create trigger trg_universities_country_entity_type before insert or update of country_entity_id on public.universities
  for each row execute function public.enforce_canonical_entity_type('country_entity_id', 'country');
drop trigger if exists trg_universities_city_entity_type on public.universities;
create trigger trg_universities_city_entity_type before insert or update of city_entity_id on public.universities
  for each row execute function public.enforce_canonical_entity_type('city_entity_id', 'city');

-- ---------------------------------------------------------------------------
-- Search
--
-- Ranking order the product requires: exact canonical > exact alias > prefix > trigram
-- fuzzy. Scores are chosen so those tiers can never cross (1.0 / 0.995 / 0.98-0.97 /
-- similarity()). unaccent() + alnum folding is what makes Turkish input work -- a student
-- typing "uskudar" finds "Üsküdar", and "bogazici" finds "Boğaziçi".
-- ---------------------------------------------------------------------------

create or replace function public.search_canonical_entities(q text, p_entity_types text[] default null, p_limit integer default 12)
returns table(
  entity_id uuid, entity_type text, canonical_name text, display_name text,
  country_code text, city text, verification_state text,
  matched_text text, matched_via text, score real
)
language sql
stable
set search_path to 'public', 'extensions'
as $$
  with params as (
    select trim(regexp_replace(lower(regexp_replace(unaccent(coalesce(q,'')), '[^[:alnum:]]+', ' ', 'g')), '\s+', ' ', 'g')) as nq
  ), candidates as (
    select
      e.id as entity_id, e.entity_type, e.canonical_name, e.display_name, e.country_code, e.city,
      e.verification_state, e.display_name as matched_text, 'canonical'::text as matched_via,
      greatest(
        similarity(e.search_key, p.nq),
        case when e.search_key like p.nq || '%' then 0.98 else 0 end,
        case when e.search_key = p.nq then 1.0 else 0 end
      )::real as score
    from public.canonical_entities e
    cross join params p
    where e.verification_state not in ('merged','inactive')
      and (p_entity_types is null or e.entity_type = any(p_entity_types))
      and (e.search_key % p.nq or e.search_key like p.nq || '%')

    union all

    select
      e.id, e.entity_type, e.canonical_name, e.display_name, e.country_code, e.city,
      e.verification_state, a.alias, 'alias'::text,
      greatest(
        similarity(a.alias_search_key, p.nq),
        case when a.alias_search_key like p.nq || '%' then 0.97 else 0 end,
        case when a.alias_search_key = p.nq then 0.995 else 0 end
      )::real
    from public.entity_aliases a
    join public.canonical_entities e on e.id = a.entity_id
    cross join params p
    where e.verification_state not in ('merged','inactive')
      and (p_entity_types is null or e.entity_type = any(p_entity_types))
      and (a.alias_search_key % p.nq or a.alias_search_key like p.nq || '%')
  ), ranked as (
    select *, row_number() over (partition by entity_id order by score desc, matched_via) as rn
    from candidates
  )
  select entity_id, entity_type, canonical_name, display_name, country_code, city,
         verification_state, matched_text, matched_via, score
  from ranked
  where rn = 1
  order by score desc, display_name
  limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;

-- ---------------------------------------------------------------------------
-- Custom fallback
--
-- The only write path a student has into the registry. It cannot create a verified
-- entity: verification_state is hard-coded to 'user_submitted'. The advisory lock closes
-- the race where two students submit the same new school at the same moment and both
-- pass the existence check. Resolution is alias-aware, so re-typing an existing entity's
-- abbreviation returns that entity instead of creating a near-duplicate.
-- ---------------------------------------------------------------------------

create or replace function public.create_or_resolve_user_submitted_entity(
  p_entity_type text, p_display_name text, p_country_code text default null, p_city text default null
)
returns table(entity_id uuid, created_new boolean, verification_state text)
language plpgsql
set search_path to 'public'
as $$
declare
  v_name text := trim(p_display_name);
  v_norm text;
  v_id uuid;
  v_state text;
begin
  if v_name is null or v_name = '' then
    raise exception 'display name is required';
  end if;
  if p_entity_type not in ('employer','organization','research_institution','lab','ngo','club','opportunity_provider','sports_team','school','university','program','competition','scholarship') then
    raise exception 'entity type % does not allow user-submitted fallback', p_entity_type;
  end if;
  v_norm := lower(unaccent(v_name));

  perform pg_advisory_xact_lock(hashtext(p_entity_type || '|' || coalesce(p_country_code,'') || '|' || coalesce(p_city,'') || '|' || v_norm));

  select ce.id, ce.verification_state into v_id, v_state
  from public.canonical_entities ce
  where ce.entity_type = p_entity_type
    and ce.verification_state <> 'merged'
    and (
      lower(unaccent(ce.canonical_name)) = v_norm
      or lower(unaccent(ce.display_name)) = v_norm
      or exists(select 1 from public.entity_aliases ea where ea.entity_id = ce.id and lower(unaccent(ea.alias)) = v_norm)
    )
    and (p_country_code is null or ce.country_code is null or ce.country_code = p_country_code)
    and (p_city is null or ce.city is null or lower(unaccent(ce.city)) = lower(unaccent(p_city)))
  order by case ce.verification_state when 'official_verified' then 1 when 'source_verified' then 2 when 'user_submitted' then 3 else 4 end,
           ce.last_verified_at desc nulls last
  limit 1;

  if v_id is not null then
    return query select v_id, false, v_state;
    return;
  end if;

  insert into public.canonical_entities(
    entity_type, canonical_name, display_name, normalized_name, country_code, city,
    canonicality_rule, verification_state, data_status, source_priority, metadata
  ) values (
    p_entity_type, v_name, v_name, v_norm, p_country_code, p_city,
    'preferred_custom_fallback', 'user_submitted', 'needs_review', 100,
    jsonb_build_object('created_via','custom_fallback','requires_verification',true)
  ) returning id, canonical_entities.verification_state into v_id, v_state;

  insert into public.entity_aliases(entity_id, alias, normalized_alias, alias_type, verified)
  values (v_id, v_name, v_norm, 'user_submitted', false)
  on conflict do nothing;

  return query select v_id, true, v_state;
end;
$$;

-- ---------------------------------------------------------------------------
-- Merge
--
-- Never automatic. A caller must supply a reason, and both entities are kept: every
-- reference is rewired to the target, the source is tombstoned as 'merged', and the
-- decision is recorded in canonical_entity_merges. Merging across entity types is
-- refused outright.
-- ---------------------------------------------------------------------------

create or replace function public.merge_canonical_entities(
  p_source_entity_id uuid, p_target_entity_id uuid, p_reason text, p_notes text default null
)
returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_source_type text;
  v_target_type text;
  v_merge_id uuid;
begin
  if p_source_entity_id = p_target_entity_id then
    raise exception 'source and target must differ';
  end if;

  select entity_type into v_source_type from public.canonical_entities where id = p_source_entity_id for update;
  select entity_type into v_target_type from public.canonical_entities where id = p_target_entity_id for update;
  if v_source_type is null or v_target_type is null then raise exception 'source or target entity not found'; end if;
  if v_source_type <> v_target_type then raise exception 'cannot merge entity type % into %', v_source_type, v_target_type; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'merge reason required'; end if;

  update public.profiles set school_entity_id = p_target_entity_id where school_entity_id = p_source_entity_id;
  update public.profiles set country_entity_id = p_target_entity_id where country_entity_id = p_source_entity_id;
  update public.profiles set city_entity_id = p_target_entity_id where city_entity_id = p_source_entity_id;
  update public.education_records set school_entity_id = p_target_entity_id where school_entity_id = p_source_entity_id;
  update public.education_records set country_entity_id = p_target_entity_id where country_entity_id = p_source_entity_id;
  update public.activities set organization_entity_id = p_target_entity_id where organization_entity_id = p_source_entity_id;
  update public.work_experiences set organization_entity_id = p_target_entity_id where organization_entity_id = p_source_entity_id;
  update public.volunteering_experiences set organization_entity_id = p_target_entity_id where organization_entity_id = p_source_entity_id;
  update public.research_experiences set organization_entity_id = p_target_entity_id where organization_entity_id = p_source_entity_id;
  update public.projects set organization_entity_id = p_target_entity_id where organization_entity_id = p_source_entity_id;
  update public.awards set organization_entity_id = p_target_entity_id where organization_entity_id = p_source_entity_id;
  update public.certifications set organization_entity_id = p_target_entity_id where organization_entity_id = p_source_entity_id;
  update public.sports_experiences set team_entity_id = p_target_entity_id where team_entity_id = p_source_entity_id;
  update public.opportunities set organization_entity_id = p_target_entity_id where organization_entity_id = p_source_entity_id;
  update public.opportunities set country_entity_id = p_target_entity_id where country_entity_id = p_source_entity_id;
  update public.universities set canonical_entity_id = p_target_entity_id where canonical_entity_id = p_source_entity_id;
  update public.universities set country_entity_id = p_target_entity_id where country_entity_id = p_source_entity_id;
  update public.universities set city_entity_id = p_target_entity_id where city_entity_id = p_source_entity_id;

  delete from public.entity_aliases s
  using public.entity_aliases t
  where s.entity_id = p_source_entity_id and t.entity_id = p_target_entity_id
    and lower(unaccent(s.alias)) = lower(unaccent(t.alias));
  update public.entity_aliases set entity_id = p_target_entity_id where entity_id = p_source_entity_id;

  delete from public.entity_external_ids s
  using public.entity_external_ids t
  where s.entity_id = p_source_entity_id and t.entity_id = p_target_entity_id
    and s.id_system = t.id_system and s.external_id = t.external_id;
  update public.entity_external_ids set entity_id = p_target_entity_id where entity_id = p_source_entity_id;
  update public.entity_evidence set entity_id = p_target_entity_id where entity_id = p_source_entity_id;
  update public.entity_locations set entity_id = p_target_entity_id where entity_id = p_source_entity_id;

  delete from public.entity_relationships s
  using public.entity_relationships t
  where s.subject_entity_id = p_source_entity_id and t.subject_entity_id = p_target_entity_id
    and s.relationship_type = t.relationship_type and s.object_entity_id = t.object_entity_id;
  update public.entity_relationships set subject_entity_id = p_target_entity_id where subject_entity_id = p_source_entity_id;

  delete from public.entity_relationships s
  using public.entity_relationships t
  where s.object_entity_id = p_source_entity_id and t.object_entity_id = p_target_entity_id
    and s.relationship_type = t.relationship_type and s.subject_entity_id = t.subject_entity_id;
  update public.entity_relationships set object_entity_id = p_target_entity_id where object_entity_id = p_source_entity_id;
  delete from public.entity_relationships where subject_entity_id = object_entity_id;

  -- Source-specific school rows cannot be blindly overwritten: keep the source's own
  -- sourced history rather than clobbering the target's.
  if v_source_type = 'school' then
    if not exists(select 1 from public.school_profiles where entity_id = p_target_entity_id) then
      update public.school_profiles set entity_id = p_target_entity_id where entity_id = p_source_entity_id;
    end if;
    update public.school_credentials set school_entity_id = p_target_entity_id where school_entity_id = p_source_entity_id
      and not exists(select 1 from public.school_credentials t where t.school_entity_id = p_target_entity_id and t.credential_type = school_credentials.credential_type and coalesce(t.source_url,'') = coalesce(school_credentials.source_url,''));
    update public.school_outcome_metrics set school_entity_id = p_target_entity_id where school_entity_id = p_source_entity_id;
    update public.school_university_outcomes set school_entity_id = p_target_entity_id where school_entity_id = p_source_entity_id;
  end if;

  insert into public.canonical_entity_merges(source_entity_id, target_entity_id, reason, merged_by, notes)
  values (p_source_entity_id, p_target_entity_id, p_reason, auth.uid(), p_notes)
  returning id into v_merge_id;

  update public.canonical_entities
  set verification_state = 'merged',
      data_status = 'stale',
      metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('merged_into', p_target_entity_id, 'merged_at', now(), 'merge_reason', p_reason),
      updated_at = now()
  where id = p_source_entity_id;

  return v_merge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Derived view
-- ---------------------------------------------------------------------------

create or replace view public.current_university_student_counts as
  select distinct on (u.id)
    u.id as university_id,
    u.canonical_entity_id,
    (u.external_ids ->> 'oryn_global_id') as oryn_global_id,
    u.name as university_name,
    u.country,
    u.city,
    m.value_numeric as student_count,
    m.value_text as student_count_display,
    m.stats_as_of,
    m.scope,
    m.precision_state,
    m.source_url,
    m.source_type,
    m.verified_at,
    m.data_quality_flag,
    m.notes
  from public.universities u
  join public.university_profile_metrics m on m.university_id = u.id
  where m.metric_code = 'total_students'
    and m.data_quality_flag <> all (array['blocked','unknown','needs_primary_revalidation'])
  order by u.id, case when m.source_type = 'official_primary' then 0 else 1 end, m.verified_at desc;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Registry content is global reference data, readable by any signed-in student. The
-- operational tables (verification queue, merges, field policies, relationships,
-- locations, ingestion staging) enable RLS with NO policy at all: that is deny-all for
-- anon and authenticated, and the service-role admin client -- which bypasses RLS -- is
-- the only reader. Writes to the registry are never granted directly; the only student
-- write path is create_or_resolve_user_submitted_entity (see migration 0039).
-- ---------------------------------------------------------------------------

alter table public.canonical_entities enable row level security;
alter table public.entity_aliases enable row level security;
alter table public.entity_external_ids enable row level security;
alter table public.entity_evidence enable row level security;
alter table public.entity_record_links enable row level security;
alter table public.entity_verification_queue enable row level security;
alter table public.canonical_field_policies enable row level security;
alter table public.entity_relationships enable row level security;
alter table public.entity_locations enable row level security;
alter table public.canonical_entity_merges enable row level security;
alter table public.school_profiles enable row level security;
alter table public.school_credentials enable row level security;
alter table public.school_outcome_metrics enable row level security;
alter table public.school_university_outcomes enable row level security;
alter table public.university_rankings enable row level security;
alter table public.university_profile_metrics enable row level security;
alter table public.university_profile_verification_queue enable row level security;
alter table public.global_university_discovery_queue enable row level security;
alter table public.qs2027_import_staging enable row level security;

drop policy if exists public_read_canonical_entities on public.canonical_entities;
create policy public_read_canonical_entities on public.canonical_entities for select using (true);
drop policy if exists public_read_entity_aliases on public.entity_aliases;
create policy public_read_entity_aliases on public.entity_aliases for select using (true);
drop policy if exists public_read_entity_external_ids on public.entity_external_ids;
create policy public_read_entity_external_ids on public.entity_external_ids for select using (true);
drop policy if exists public_read_entity_evidence on public.entity_evidence;
create policy public_read_entity_evidence on public.entity_evidence for select using (true);
drop policy if exists public_read_entity_record_links on public.entity_record_links;
create policy public_read_entity_record_links on public.entity_record_links for select using (true);
drop policy if exists public_read_school_profiles on public.school_profiles;
create policy public_read_school_profiles on public.school_profiles for select using (true);
drop policy if exists public_read_school_credentials on public.school_credentials;
create policy public_read_school_credentials on public.school_credentials for select using (true);
drop policy if exists public_read_school_outcome_metrics on public.school_outcome_metrics;
create policy public_read_school_outcome_metrics on public.school_outcome_metrics for select using (true);
drop policy if exists public_read_school_university_outcomes on public.school_university_outcomes;
create policy public_read_school_university_outcomes on public.school_university_outcomes for select using (true);

-- ---------------------------------------------------------------------------
-- Field policy catalogue
-- ---------------------------------------------------------------------------

insert into public.canonical_field_policies (table_name, text_column, canonical_id_column, policy, allowed_entity_types, custom_fallback_allowed, release_notes) values
  ('profiles','school_name','school_entity_id','canonical_required','{school}',false,'User must select/create a canonical school identity; raw text remains only as legacy/display fallback.'),
  ('profiles','country','country_entity_id','canonical_required','{country}',false,'Country uses canonical ISO-backed identity.'),
  ('profiles','city','city_entity_id','canonical_required','{city}',false,'City uses canonical geography identity.'),
  ('education_records','school_name','school_entity_id','canonical_required','{school}',false,'Education institution must resolve to canonical school.'),
  ('education_records','country','country_entity_id','canonical_required','{country}',false,'Country uses canonical identity.'),
  ('activities','organization','organization_entity_id','canonical_preferred_custom_fallback','{school,university,employer,organization,research_institution,lab,ngo,club,opportunity_provider}',true,'If no match, create USER_SUBMITTED canonical entity rather than storing an unlinked raw organization string.'),
  ('activities','title',null,'free_text_remains','{}',false,'Activity title is narrative/user-specific, not a reusable real-world entity.'),
  ('work_experiences','organization','organization_entity_id','canonical_preferred_custom_fallback','{employer,organization,research_institution,lab,ngo,school,university,opportunity_provider}',true,'Employer/company is canonical preferred with provisional entity fallback.'),
  ('work_experiences','title',null,'free_text_remains','{}',false,'Job title remains free text.'),
  ('volunteering_experiences','organization','organization_entity_id','canonical_preferred_custom_fallback','{organization,ngo,school,university,club,research_institution,opportunity_provider}',true,'NGO/volunteering organization canonical preferred.'),
  ('research_experiences','organization','organization_entity_id','canonical_preferred_custom_fallback','{research_institution,lab,university,school,organization,employer}',true,'Research institution/lab canonical preferred.'),
  ('research_experiences','title',null,'free_text_remains','{}',false,'Research title remains free text.'),
  ('projects','organization','organization_entity_id','canonical_preferred_custom_fallback','{organization,school,university,employer,research_institution,lab,ngo,club,opportunity_provider}',true,'Project title remains free text; affiliated organization is canonical preferred.'),
  ('projects','title',null,'free_text_remains','{}',false,'Project title remains free text.'),
  ('awards','organization','organization_entity_id','canonical_preferred_custom_fallback','{organization,school,university,employer,research_institution,ngo,club,opportunity_provider}',true,'Award title remains free text; issuing organization is canonical preferred.'),
  ('certifications','organization','organization_entity_id','canonical_preferred_custom_fallback','{organization,school,university,employer,research_institution,ngo,opportunity_provider}',true,'Certification title remains free text; issuer is canonical preferred.'),
  ('sports_experiences','team_name','team_entity_id','canonical_preferred_custom_fallback','{sports_team,club,school,university}',true,'Team/club canonical preferred; position/discipline remain free text.'),
  ('opportunities','organization','organization_entity_id','canonical_preferred_custom_fallback','{opportunity_provider,organization,university,school,employer,research_institution,lab,ngo,club}',true,'Organizer/provider canonical preferred.'),
  ('opportunities','country','country_entity_id','canonical_required','{country}',false,'Country canonical required when geography is country-scoped.'),
  ('universities','name','canonical_entity_id','canonical_required','{university}',false,'Existing university row links to one canonical university identity.'),
  ('universities','country','country_entity_id','canonical_required','{country}',false,'Country canonical required.'),
  ('universities','city','city_entity_id','canonical_required','{city}',false,'City canonical required.')
on conflict (table_name, text_column) do nothing;
