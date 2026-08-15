-- Career profile scoring: current scores per dimension, plus an append-only history of
-- full-profile snapshots for the monthly review (Phase 40/41).

create type profile_dimension as enum ('academics', 'intellectual_curiosity', 'leadership', 'research', 'entrepreneurship', 'community_impact', 'awards_distinction', 'career_exploration', 'execution_project_depth');

create table public.profile_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dimension profile_dimension not null,
  score integer not null check (score between 0 and 100),
  confidence data_confidence not null default 'medium',
  calculation_version text not null default 'career_profile_v1',
  reason_codes jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (user_id, dimension, calculation_version)
);
create index profile_scores_user_id_idx on public.profile_scores(user_id);

create table public.profile_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_version text not null default 'career_profile_v1',
  overall_score integer not null,
  dimension_scores jsonb not null,
  snapshot_reason text not null,
  created_at timestamptz not null default now()
);
create index profile_score_snapshots_user_id_idx on public.profile_score_snapshots(user_id, created_at desc);
