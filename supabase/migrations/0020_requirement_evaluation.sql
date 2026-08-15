-- Phase 69: per-program university requirement checklist. Extends the existing
-- university_requirements table (Phase 35's canonical entity, see DATABASE.md) with
-- machine-evaluable structure rather than introducing a parallel table, and adds one new
-- table to hold each student's evaluation against those requirements. The table has never
-- been populated by any job or seed (see README.md "Known limitations"), so retyping its
-- free-text requirement_type column to an enum is safe — there is no data to migrate.

create type requirement_category as enum (
  'curriculum', 'required_subject', 'minimum_grade', 'standardized_test',
  'english_proficiency', 'language_proficiency', 'essay', 'recommendation',
  'interview', 'portfolio', 'entrance_exam', 'prerequisite_coursework',
  'application_deadline', 'supplemental_requirement', 'international_requirement'
);

create type requirement_evaluation_status as enum ('met', 'likely_met', 'not_met', 'unknown', 'needs_manual_review');

alter table public.university_requirements
  add column title text,
  add column structured_rule jsonb,
  add column data_status data_status not null default 'fresh',
  add column last_checked_at timestamptz;

-- Safe with zero existing rows (see note above) — a populated table with values outside
-- the new enum would fail this cast, which is the correct behavior, not a risk to guard.
alter table public.university_requirements
  alter column requirement_type type requirement_category using requirement_type::requirement_category;

comment on column public.university_requirements.structured_rule is
  'Machine-evaluable rule shape, keyed by requirement_type — see lib/requirements/types.ts StructuredRule. '
  'Null for categories that cannot be evaluated against stored profile facts (essay, recommendation, interview, '
  'portfolio, supplemental_requirement, international_requirement) or informational rows (application_deadline). '
  'Populated by an admin reviewing lib/ai/interpret-requirement.ts''s suggestion, never by unreviewed AI output '
  '— see the non-negotiable "AI must not silently invent official requirements" rule.';

-- One current evaluation per student per requirement; lib/requirements/persist.ts recomputes
-- and upserts in place (no history table — an evaluation is a live read of current facts
-- against a current requirement, not something whose trend over time matters the way
-- profile_score_snapshots' does).
create table public.student_requirement_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requirement_id uuid not null references public.university_requirements(id) on delete cascade,
  status requirement_evaluation_status not null default 'unknown',
  reasoning text not null default '',
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, requirement_id)
);
create index student_requirement_evaluations_user_id_idx on public.student_requirement_evaluations(user_id);
create index student_requirement_evaluations_requirement_id_idx on public.student_requirement_evaluations(requirement_id);
create trigger student_requirement_evaluations_set_updated_at before update on public.student_requirement_evaluations for each row execute function public.set_updated_at();

alter table public.student_requirement_evaluations enable row level security;
create policy "owner full access" on public.student_requirement_evaluations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
