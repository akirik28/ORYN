-- Student's target list, applications, and application requirement checklists.

create type target_status as enum ('exploring', 'target', 'applying', 'applied', 'accepted', 'waitlisted', 'rejected', 'withdrawn');
create type outlook_label as enum ('extreme_reach', 'reach', 'competitive', 'strong', 'likely');

create table public.target_universities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  program_id uuid references public.university_programs(id) on delete set null,
  status target_status not null default 'exploring',
  notes text,
  -- Cached admission_model_v1 output (Phase 16/17) so the dashboard doesn't recompute on
  -- every read. Source of truth is the deterministic calculation in lib/scoring; these
  -- columns are a cache, never hand-edited.
  academic_fit_score integer,
  profile_fit_score integer,
  outlook outlook_label,
  estimate_range_low numeric(5,4),
  estimate_range_high numeric(5,4),
  outlook_confidence data_confidence,
  outlook_model_version text,
  outlook_calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, university_id, program_id)
);
create index target_universities_user_id_idx on public.target_universities(user_id);
create trigger target_universities_set_updated_at before update on public.target_universities for each row execute function public.set_updated_at();

create type application_type as enum ('early_decision', 'early_action', 'regular_decision', 'rolling', 'other');
create type application_status as enum ('not_started', 'in_progress', 'submitted', 'under_review', 'accepted', 'waitlisted', 'rejected', 'withdrawn');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_university_id uuid not null references public.target_universities(id) on delete cascade,
  application_type application_type not null default 'regular_decision',
  deadline date,
  status application_status not null default 'not_started',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_user_id_idx on public.applications(user_id);
create trigger applications_set_updated_at before update on public.applications for each row execute function public.set_updated_at();

create type requirement_status as enum ('not_started', 'in_progress', 'completed', 'not_applicable');

create table public.application_requirements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requirement_type text not null,
  title text,
  status requirement_status not null default 'not_started',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index application_requirements_application_id_idx on public.application_requirements(application_id);
create index application_requirements_user_id_idx on public.application_requirements(user_id);
create trigger application_requirements_set_updated_at before update on public.application_requirements for each row execute function public.set_updated_at();
