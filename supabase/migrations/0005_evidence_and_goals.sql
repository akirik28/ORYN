-- Evidence attachments, interests and goals.
--
-- evidence_files uses a polymorphic (linked_table, linked_id) reference rather than a
-- nullable FK per achievement table, since evidence can attach to any of ~8 achievement
-- types. Postgres can't enforce a polymorphic FK natively; the app layer validates
-- linked_table against an allow-list before insert (see lib/validation).

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  linked_table text not null,
  linked_id uuid not null,
  evidence_type text not null,
  file_path text,
  external_url text,
  verification_status evidence_status not null default 'self_reported',
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index evidence_files_user_id_idx on public.evidence_files(user_id);
create index evidence_files_linked_idx on public.evidence_files(linked_table, linked_id);
create trigger evidence_files_set_updated_at before update on public.evidence_files for each row execute function public.set_updated_at();

create table public.student_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, label)
);
create index student_interests_user_id_idx on public.student_interests(user_id);

create type goal_status as enum ('active', 'achieved', 'abandoned');

create table public.career_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text,
  target_date date,
  priority integer not null default 2,
  status goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index career_goals_user_id_idx on public.career_goals(user_id);
create trigger career_goals_set_updated_at before update on public.career_goals for each row execute function public.set_updated_at();
