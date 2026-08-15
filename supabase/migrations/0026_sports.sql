-- Chat 4: Sports as a first-class Digital Twin section (founder scope update), not folded
-- into the generic `activities` table. `activities` has no fields for discipline/event,
-- team/position, competitive level, captaincy, or achievements/rankings — forcing sports
-- through it would either drop real structure or bloat a table every other achievement
-- type also uses. A dedicated table matches this schema's existing convention (one table
-- per achievement shape — see research_experiences/work_experiences) exactly.

-- Deliberately NOT the US-specific "varsity/JV" ladder — a globally usable competitive
-- tier instead (Phase 7 of this pass's brief: "do not assume US-specific concepts... are
-- universally applicable"). `us_specific_label` is free text for a student who wants to
-- add that context without it being the primary ontology.
create type sport_level as enum ('recreational', 'school', 'club', 'regional', 'national', 'international');

create table public.sports_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null,
  discipline text,
  team_name text,
  position text,
  level sport_level,
  us_specific_label text,
  is_captain boolean not null default false,
  achievements text,
  start_date date,
  end_date date,
  ongoing boolean not null default false,
  hours_per_week numeric(4,1),
  weeks_per_year numeric(4,1),
  location text,
  description text,
  source text not null default 'manual',
  evidence_status evidence_status not null default 'self_reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sports_experiences_user_id_idx on public.sports_experiences(user_id);
create trigger sports_experiences_set_updated_at before update on public.sports_experiences for each row execute function public.set_updated_at();

alter table public.sports_experiences enable row level security;
create policy "owner full access" on public.sports_experiences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
