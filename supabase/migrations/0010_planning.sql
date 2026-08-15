-- Weekly AI-generated plans/actions, and the recommendation history that lets the
-- advisor avoid re-suggesting something the student already rejected (Phase 63).

create type plan_status as enum ('active', 'completed', 'superseded');

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start_date date not null,
  summary text,
  status plan_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);
create index weekly_plans_user_id_idx on public.weekly_plans(user_id);
create trigger weekly_plans_set_updated_at before update on public.weekly_plans for each row execute function public.set_updated_at();

create type action_status as enum ('not_started', 'in_progress', 'completed', 'skipped', 'expired');
create type impact_level as enum ('low', 'medium', 'high', 'very_high');
create type reflection_outcome as enum ('completed_successfully', 'partially_completed', 'did_not_work', 'opportunity_no_longer_available');

create table public.weekly_actions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  reason text,
  category text,
  priority integer not null default 2,
  estimated_minutes integer,
  impact_level impact_level not null default 'medium',
  deadline date,
  status action_status not null default 'not_started',
  source_type text,
  source_id uuid,
  reflection_outcome reflection_outcome,
  reflection_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index weekly_actions_plan_id_idx on public.weekly_actions(plan_id);
create index weekly_actions_user_id_idx on public.weekly_actions(user_id);
create trigger weekly_actions_set_updated_at before update on public.weekly_actions for each row execute function public.set_updated_at();

create type recommendation_class as enum ('do', 'consider', 'deprioritize', 'avoid_for_now');

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  reason text not null,
  recommendation_class recommendation_class not null,
  category text,
  related_dimension profile_dimension,
  shown_at timestamptz not null default now(),
  user_response text,
  completed_at timestamptz,
  feedback text,
  created_at timestamptz not null default now()
);
create index ai_recommendations_user_id_idx on public.ai_recommendations(user_id);
