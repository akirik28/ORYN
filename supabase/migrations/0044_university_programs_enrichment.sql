-- university_programs was created (migration 0006) as a bare skeleton — university_id,
-- name, degree_level, duration, tuition, language, data_confidence — with no provenance
-- and no verification state, so it could never actually be released as "trusted" data per
-- this product's own evidence rules. This adds the same source/verification shape already
-- proven on university_profile_metrics and opportunities (migrations 0038, 0041): a
-- required source_url, a verification_state vocabulary, and verified_at. Purely additive —
-- the table has 0 live rows, but existing columns are kept rather than dropped, since
-- duration/tuition/language remain useful and nothing depends on removing them.
--
-- Text + CHECK, not enum, matching the 0041 rationale (ALTER TYPE ADD VALUE's transaction
-- restrictions make enums awkward to extend, and this taxonomy will grow).

alter table public.university_programs
  -- Identity / classification
  add column degree_type text,
  add column faculty_or_school text,
  add column subject_taxonomy text
    check (subject_taxonomy is null or subject_taxonomy = any (array[
      'economics', 'business', 'finance', 'computer_science', 'artificial_intelligence',
      'engineering', 'medicine', 'law', 'psychology', 'political_science',
      'international_relations', 'mathematics', 'physics', 'architecture', 'design',
      'entrepreneurship', 'other'
    ])),
  add column secondary_subject_tags text[] not null default '{}',
  -- Location / delivery
  add column campus text,
  add column delivery_mode text
    check (delivery_mode is null or delivery_mode = any (array['online', 'in_person', 'hybrid'])),
  add column full_time_part_time text
    check (full_time_part_time is null or full_time_part_time = any (array['full_time', 'part_time', 'both'])),
  add column international_eligible boolean,
  -- Links — official_program_url is the canonical page a student would click;
  -- source_url is the evidence-of-record for verification (usually the same URL, not
  -- always: a catalogue or admissions page can be the actual evidence for a program page
  -- that itself is thin).
  add column official_program_url text,
  add column admissions_url text,
  add column source_url text,
  add column source_type text not null default 'official_primary'
    check (source_type = any (array['official_primary', 'official_secondary', 'third_party_structured', 'unverified_secondary'])),
  -- Verification
  add column verification_state text not null default 'unverified'
    check (verification_state = any (array['verified_current', 'verified_historical', 'discontinued', 'unverified', 'conflicting'])),
  add column verified_at timestamptz not null default now(),
  add column normalized_name text,
  add column notes text;

-- Backfill normalized_name for the (currently zero) existing rows so the NOT NULL below
-- is safe, then enforce it going forward — every future insert goes through the ingestion
-- pipeline, which always computes this.
update public.university_programs set normalized_name = lower(regexp_replace(trim(name), '\s+', ' ', 'g')) where normalized_name is null;
alter table public.university_programs alter column normalized_name set not null;

-- Idempotency: re-running an ingestion batch must not create duplicate rows for the same
-- university + program identity + degree level.
create unique index university_programs_dedup_idx
  on public.university_programs (university_id, normalized_name, coalesce(degree_level, ''));

create index university_programs_subject_idx on public.university_programs (subject_taxonomy);
create index university_programs_verification_state_idx on public.university_programs (verification_state);

comment on column public.university_programs.verification_state is
  'verified_current/verified_historical require source_url + verified_at + confirmed university_id + degree_level, per the product''s VERIFIED_CURRENT gate. A row failing university-identity resolution is never inserted here at all — see program_research_queue for the audit trail of what was proposed but not promoted.';

-- ---------------------------------------------------------------------------------------
-- program_research_queue — staging/audit table for every ingestion attempt, mirroring the
-- global_university_discovery_queue pattern (migration, 2026-08-16): candidates land here
-- with their outcome regardless of whether they were promoted, so a rejected/duplicate/
-- unresolved row is auditable rather than silently dropped. This is also the landing zone
-- for the research handoff contract (see docs — data/research/university-programs/*.jsonl)
-- so a parallel research process's output and this ingestion pipeline's own decisions live
-- in one place.
create table public.program_research_queue (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null,
  research_program_id text,
  university_id uuid references public.universities(id),
  university_name_input text not null,
  university_country_input text,
  program_name_input text not null,
  degree_level_input text,
  official_program_url_input text,
  source_url_input text,
  source_type_input text,
  verification_status_input text,
  raw_payload jsonb not null default '{}',
  outcome text not null
    check (outcome = any (array['accepted', 'duplicate', 'unresolved_university', 'insufficient_evidence', 'malformed_source', 'conflicting', 'rejected'])),
  outcome_detail text,
  promoted_program_id uuid references public.university_programs(id),
  created_at timestamptz not null default now()
);

create index program_research_queue_batch_idx on public.program_research_queue (batch_id);
create index program_research_queue_outcome_idx on public.program_research_queue (outcome);

alter table public.program_research_queue enable row level security;
-- No policies: internal ingestion/admin tooling only, same posture as
-- global_university_discovery_queue (service-role/MCP access, not exposed to the app's
-- authenticated-user client).

comment on table public.program_research_queue is
  'Audit trail for every university_programs ingestion attempt (this batch or future ones): what was proposed, what happened to it, and why. Not read by the product UI.';
