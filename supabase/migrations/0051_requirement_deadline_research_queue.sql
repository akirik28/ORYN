-- Audit trail for the requirements/deadlines research handoff ingestion, mirroring
-- program_research_queue (migration 0044): every decided record lands here with its outcome
-- regardless of whether it was promoted, so an excluded record is auditable rather than
-- silently dropped. Two tables, not one combined table with a discriminator, because
-- requirements and deadlines are genuinely different record shapes (different input fields,
-- different target table) — matching university_requirements/university_deadlines already
-- being two separate tables rather than one.
--
-- `not_ingestible` covers everything the SOURCE record's own stated properties rule out today
-- (NEEDS_REVIEW / CONFLICTING_EVIDENCE / CURRENT_CYCLE_NOT_PUBLISHED / VERIFIED_HISTORICAL
-- verification states, is_exclusion=true, recurring_annual_undated / not_published_centrally
-- deadlines) — one outcome value, with the specific reason always in outcome_detail rather than
-- multiplying the outcome enum for every distinct cause. `superseded` is its own value because
-- it's a relationship between two records, not a property of the record itself.
--
-- Applied-vs-drafted note (2026-08-21): the SQL actually applied to requirement_research_queue
-- diverged from an earlier draft of this file — the applier read this table's block from a
-- different, earlier version and inferred its column names from deadline_research_queue's
-- pattern rather than the requirement-specific draft, producing `requirement_type_input` /
-- `scope_input` here instead of `category_input` / `requirement_category_db_input`. This file
-- now records what is actually live, not the earlier draft. On the merits the live shape is
-- kept deliberately, not merely accepted as a fait accompli: `requirement_type_input` and
-- `scope_input` mirror university_requirements' own `requirement_type`/`scope` columns
-- directly, and `scope_input` is required for `university_requirements_university_type_scope_idx`
-- (migration 0042) to be auditable at all. `requirement_category_db` (the DB enum value
-- actually inserted) is what's kept as `requirement_type_input`; the founder-brief's coarser
-- `category` taxonomy is dropped as its own column but remains fully recoverable from
-- `raw_payload`.

create table public.requirement_research_queue (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null,
  research_requirement_id text not null,
  university_id uuid references public.universities(id),
  university_name_input text,
  university_country_input text,
  program_name_input text,
  requirement_type_input text,
  scope_input text,
  requirement_text_input text,
  source_url_input text,
  source_type_input text,
  verification_state_input text,
  raw_payload jsonb not null default '{}',
  outcome text not null
    check (outcome = any (array['accepted', 'duplicate', 'unresolved_university', 'superseded', 'not_ingestible', 'malformed_source', 'rejected'])),
  outcome_detail text,
  promoted_requirement_id uuid references public.university_requirements(id),
  created_at timestamptz not null default now()
);
create index requirement_research_queue_batch_idx on public.requirement_research_queue (batch_id);
create index requirement_research_queue_outcome_idx on public.requirement_research_queue (outcome);

create table public.deadline_research_queue (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null,
  research_deadline_id text not null,
  university_id uuid references public.universities(id),
  university_name_input text,
  university_country_input text,
  program_name_input text,
  deadline_type_input text,
  deadline_date_input date,
  recurrence_input text,
  source_url_input text,
  source_type_input text,
  verification_state_input text,
  raw_payload jsonb not null default '{}',
  outcome text not null
    check (outcome = any (array['accepted', 'duplicate', 'unresolved_university', 'not_ingestible', 'malformed_source', 'rejected'])),
  outcome_detail text,
  promoted_deadline_id uuid references public.university_deadlines(id),
  created_at timestamptz not null default now()
);
create index deadline_research_queue_batch_idx on public.deadline_research_queue (batch_id);
create index deadline_research_queue_outcome_idx on public.deadline_research_queue (outcome);

alter table public.requirement_research_queue enable row level security;
alter table public.deadline_research_queue enable row level security;
-- No policies: internal ingestion/admin tooling only, same posture as program_research_queue
-- and global_university_discovery_queue (service-role/MCP access, not exposed to the app's
-- authenticated-user client).

comment on table public.requirement_research_queue is
  'Audit trail for every university_requirements ingestion attempt: what was proposed, what happened to it, and why. Not read by the product UI.';
comment on table public.deadline_research_queue is
  'Audit trail for every university_deadlines ingestion attempt: what was proposed, what happened to it, and why. Not read by the product UI.';
