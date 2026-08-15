-- Global, publicly-readable university data. No user_id — these rows are shared across
-- all students and written only by background jobs / admin tooling using the service role
-- (see lib/supabase/admin.ts), never by a user request. Split into narrow tables instead
-- of one wide `universities` row so each fact type can be refreshed and sourced independently.

create type data_confidence as enum ('high', 'medium', 'low');
create type data_status as enum ('fresh', 'stale', 'needs_review', 'unavailable');

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  city text,
  institution_type text,
  website_url text,
  logo_url text,
  description text,
  selectivity text,
  student_size integer,
  external_ids jsonb not null default '{}'::jsonb,
  data_confidence data_confidence not null default 'medium',
  data_status data_status not null default 'fresh',
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index universities_country_idx on public.universities(country);
create unique index universities_name_country_idx on public.universities (lower(name), country);
create trigger universities_set_updated_at before update on public.universities for each row execute function public.set_updated_at();

create table public.university_programs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  degree_level text,
  field text,
  duration_years numeric(3,1),
  tuition_amount numeric(12,2),
  tuition_currency text,
  language_of_instruction text,
  data_confidence data_confidence not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index university_programs_university_id_idx on public.university_programs(university_id);
create trigger university_programs_set_updated_at before update on public.university_programs for each row execute function public.set_updated_at();

create table public.university_requirements (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  program_id uuid references public.university_programs(id) on delete cascade,
  requirement_type text not null,
  requirement_detail text,
  is_required boolean not null default true,
  data_confidence data_confidence not null default 'medium',
  source_url text,
  retrieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index university_requirements_university_id_idx on public.university_requirements(university_id);
create trigger university_requirements_set_updated_at before update on public.university_requirements for each row execute function public.set_updated_at();

create table public.university_statistics (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  stat_year integer,
  admission_rate numeric(5,4),
  sat_range_low integer,
  sat_range_high integer,
  act_range_low integer,
  act_range_high integer,
  graduation_rate numeric(5,4),
  cost_of_attendance numeric(12,2),
  cost_currency text,
  source text,
  data_confidence data_confidence not null default 'medium',
  retrieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index university_statistics_university_id_idx on public.university_statistics(university_id);
create trigger university_statistics_set_updated_at before update on public.university_statistics for each row execute function public.set_updated_at();

create table public.university_deadlines (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  program_id uuid references public.university_programs(id) on delete cascade,
  deadline_type text not null,
  deadline_date date,
  application_cycle text,
  source_url text,
  retrieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index university_deadlines_university_id_idx on public.university_deadlines(university_id);
create trigger university_deadlines_set_updated_at before update on public.university_deadlines for each row execute function public.set_updated_at();

create table public.university_sources (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  source_url text not null,
  source_domain text,
  source_type text,
  retrieved_at timestamptz not null default now(),
  confidence data_confidence not null default 'medium',
  raw_excerpt text,
  created_at timestamptz not null default now()
);
create index university_sources_university_id_idx on public.university_sources(university_id);
