-- Core user profile. profiles.id mirrors auth.users.id (1:1) so deleting the auth user
-- cascades through every table below and satisfies the account-deletion requirement.

create type curriculum_type as enum ('ap', 'ib', 'a_level', 'turkish_curriculum', 'national_curriculum', 'other');
create type time_budget as enum ('under_2h', '2_5h', '5_10h', '10h_plus');
create type target_geography as enum ('usa', 'uk', 'europe', 'canada', 'turkey', 'not_sure');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  display_name text,
  birth_year integer,
  country text,
  city text,
  school_name text,
  graduation_year integer,
  curriculum curriculum_type,
  preferred_language text not null default 'en',
  timezone text not null default 'UTC',
  target_geographies target_geography[] not null default '{}',
  weekly_time_budget time_budget,
  busy_mode boolean not null default false,
  busy_mode_until date,
  onboarding_completed boolean not null default false,
  onboarding_step text,
  completeness_percent integer not null default 0,
  profile_strength_score integer,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
