-- Achievement entities. Each shares the common shape from the spec (title, organization,
-- description, dates, hours, location, source) plus fields specific to that category.
--
-- Assumption: "leadership" and "summer programs" (called out as separate concepts in the
-- product spec) are modeled as attributes/categories on `activities` rather than their own
-- tables, and "internships" are a category on `work_experiences`, to avoid fragmenting one
-- underlying concept (an extracurricular commitment, or a period of employment) across
-- near-duplicate tables.

create type evidence_status as enum ('self_reported', 'evidence_added', 'verified', 'verification_rejected');

create type activity_category as enum ('club', 'sports', 'student_government', 'community_org', 'summer_program', 'academic_program', 'competition_team', 'other');

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization text,
  category activity_category not null default 'other',
  description text,
  is_leadership_role boolean not null default false,
  people_led integer,
  organization_scope text,
  start_date date,
  end_date date,
  ongoing boolean not null default false,
  hours_per_week numeric(4,1),
  weeks_per_year numeric(4,1),
  location text,
  source text not null default 'manual',
  evidence_status evidence_status not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activities_user_id_idx on public.activities(user_id);
create trigger activities_set_updated_at before update on public.activities for each row execute function public.set_updated_at();

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization text,
  level text,
  description text,
  award_date date,
  location text,
  source text not null default 'manual',
  evidence_status evidence_status not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index awards_user_id_idx on public.awards(user_id);
create trigger awards_set_updated_at before update on public.awards for each row execute function public.set_updated_at();

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization text,
  description text,
  issue_date date,
  expiry_date date,
  credential_url text,
  source text not null default 'manual',
  evidence_status evidence_status not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index certifications_user_id_idx on public.certifications(user_id);
create trigger certifications_set_updated_at before update on public.certifications for each row execute function public.set_updated_at();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization text,
  description text,
  role text,
  start_date date,
  end_date date,
  ongoing boolean not null default false,
  hours_per_week numeric(4,1),
  outcome_summary text,
  users_reached integer,
  revenue_amount numeric(12,2),
  repo_url text,
  live_url text,
  location text,
  source text not null default 'manual',
  evidence_status evidence_status not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_id_idx on public.projects(user_id);
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();

create type research_output_type as enum ('none', 'presentation', 'poster', 'school_journal', 'preprint', 'peer_reviewed_publication', 'other');

create table public.research_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization text,
  mentor_name text,
  field text,
  description text,
  methodology text,
  independence_level text,
  output_type research_output_type not null default 'none',
  output_url text,
  start_date date,
  end_date date,
  ongoing boolean not null default false,
  hours_per_week numeric(4,1),
  location text,
  source text not null default 'manual',
  evidence_status evidence_status not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index research_experiences_user_id_idx on public.research_experiences(user_id);
create trigger research_experiences_set_updated_at before update on public.research_experiences for each row execute function public.set_updated_at();

create table public.volunteering_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization text,
  description text,
  cause_area text,
  start_date date,
  end_date date,
  ongoing boolean not null default false,
  hours_per_week numeric(4,1),
  weeks_per_year numeric(4,1),
  location text,
  source text not null default 'manual',
  evidence_status evidence_status not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index volunteering_experiences_user_id_idx on public.volunteering_experiences(user_id);
create trigger volunteering_experiences_set_updated_at before update on public.volunteering_experiences for each row execute function public.set_updated_at();

create type employment_type as enum ('internship', 'part_time_job', 'full_time_job', 'apprenticeship', 'freelance', 'other');

create table public.work_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization text not null,
  employment_type employment_type not null default 'internship',
  description text,
  start_date date,
  end_date date,
  ongoing boolean not null default false,
  hours_per_week numeric(4,1),
  paid boolean,
  location text,
  source text not null default 'manual',
  evidence_status evidence_status not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index work_experiences_user_id_idx on public.work_experiences(user_id);
create trigger work_experiences_set_updated_at before update on public.work_experiences for each row execute function public.set_updated_at();

create type skill_category as enum ('technical', 'creative', 'analytical', 'communication', 'leadership', 'other');

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category skill_category not null default 'other',
  proficiency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index skills_user_id_idx on public.skills(user_id);
create trigger skills_set_updated_at before update on public.skills for each row execute function public.set_updated_at();

create table public.languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  proficiency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index languages_user_id_idx on public.languages(user_id);
create trigger languages_set_updated_at before update on public.languages for each row execute function public.set_updated_at();
