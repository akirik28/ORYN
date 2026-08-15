-- Global opportunity catalog (competitions, research, internships, ...), per-user match
-- scores, and save/apply/dismiss state.

create type opportunity_category as enum ('competition', 'research', 'internship', 'summer_program', 'fellowship', 'scholarship', 'volunteering', 'entrepreneurship', 'hackathon', 'academic_program', 'conference', 'student_program');
create type opportunity_status as enum ('active', 'expired', 'under_review', 'disabled');

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text,
  description text,
  category opportunity_category not null,
  official_url text,
  application_url text,
  country text,
  remote_allowed boolean not null default false,
  minimum_age integer,
  maximum_age integer,
  eligible_countries text[] not null default '{}',
  fields text[] not null default '{}',
  cost numeric(10,2),
  funding_available boolean not null default false,
  deadline date,
  start_date date,
  end_date date,
  source text,
  source_url text,
  source_confidence data_confidence not null default 'medium',
  last_verified_at timestamptz,
  status opportunity_status not null default 'active',
  normalized_title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index opportunities_category_idx on public.opportunities(category);
create index opportunities_deadline_idx on public.opportunities(deadline);
create unique index opportunities_dedup_idx on public.opportunities (normalized_title, coalesce(organization, ''));
create trigger opportunities_set_updated_at before update on public.opportunities for each row execute function public.set_updated_at();

-- Full provenance trail — an opportunity can be corroborated by more than one fetch.
-- opportunities.source_url/source_confidence stay denormalized for fast list rendering.
create table public.opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  source_url text not null,
  source_domain text,
  retrieved_at timestamptz not null default now(),
  source_type text,
  confidence data_confidence not null default 'medium',
  raw_excerpt text,
  created_at timestamptz not null default now()
);
create index opportunity_sources_opportunity_id_idx on public.opportunity_sources(opportunity_id);

create table public.opportunity_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  eligible boolean not null default true,
  eligibility_notes text,
  relevance_score integer not null,
  profile_need_score integer not null,
  effort_estimate text,
  match_score integer not null,
  reason_codes jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);
create index opportunity_matches_user_id_idx on public.opportunity_matches(user_id);
create index opportunity_matches_match_score_idx on public.opportunity_matches(match_score desc);

create type saved_opportunity_status as enum ('saved', 'applied', 'not_interested');

create table public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status saved_opportunity_status not null default 'saved',
  not_interested_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);
create index saved_opportunities_user_id_idx on public.saved_opportunities(user_id);
create trigger saved_opportunities_set_updated_at before update on public.saved_opportunities for each row execute function public.set_updated_at();
