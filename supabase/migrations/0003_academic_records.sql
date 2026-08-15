-- Education history, coursework and standardized test scores.
--
-- Assumption: the spec's separate "coursework" and "grades" concepts are merged into a
-- single `courses` table (one row per course, carrying its own grade). A distinct
-- per-course `grades` table would just duplicate the same row 1:1 with no independent
-- lifecycle, which the architecture explicitly warns against. Overall GPA lives on
-- `education_records` since it's a property of an enrollment period, not a course.

create type education_stage as enum ('middle_school', 'high_school', 'pre_university', 'undergraduate', 'other');

create table public.education_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_name text not null,
  country text,
  stage education_stage not null default 'high_school',
  curriculum curriculum_type,
  start_date date,
  end_date date,
  is_current boolean not null default true,
  overall_gpa numeric(5,2),
  gpa_scale numeric(4,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index education_records_user_id_idx on public.education_records(user_id);
create trigger education_records_set_updated_at before update on public.education_records for each row execute function public.set_updated_at();

create type course_level as enum ('regular', 'honors', 'ap', 'ib_hl', 'ib_sl', 'a_level', 'dual_enrollment', 'other');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  education_record_id uuid references public.education_records(id) on delete set null,
  course_name text not null,
  subject text,
  level course_level not null default 'regular',
  academic_year text,
  grade_value text,
  grade_scale text,
  credit_hours numeric(4,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_user_id_idx on public.courses(user_id);
create trigger courses_set_updated_at before update on public.courses for each row execute function public.set_updated_at();

create table public.test_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  test_name text not null,
  score text not null,
  max_score text,
  subscores jsonb not null default '{}'::jsonb,
  test_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index test_scores_user_id_idx on public.test_scores(user_id);
create trigger test_scores_set_updated_at before update on public.test_scores for each row execute function public.set_updated_at();
