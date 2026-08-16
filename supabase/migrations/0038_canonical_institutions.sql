-- Canonical Entity Autocomplete System. See docs/entity-canonicalization-audit.md for
-- the full field-by-field audit this migration implements — summary: `universities` and
-- `opportunities` already exist as canonical registries and are reused (only
-- `aliases text[]` added to each); `institutions` is the one new table, covering every
-- other named real-world entity (schools, employers, NGOs, research labs, clubs, program
-- providers) as a single registry distinguished by `category`, since they share an
-- identical shape (a named place with a location, a website, aliases, and a verification
-- status) — two near-duplicate tables would add migration/RLS/component surface for no
-- semantic benefit.

create extension if not exists pg_trgm;

create type institution_category as enum ('school', 'organization');
create type institution_status as enum ('verified', 'unverified');

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  category institution_category not null,
  canonical_name text not null,
  -- Deliberately free text, not an enum — same open-ended-vocabulary convention as
  -- universities.institution_type. Expected values: high_school, middle_school,
  -- employer, ngo, research_lab, club, government, program_provider, other.
  institution_type text,
  country text,
  city text,
  website_url text,
  domain text,
  local_language_name text,
  english_name text,
  -- Search-only alternate names/abbreviations (e.g. "UAA" for "Üsküdar American
  -- Academy") — never the display name (spec: "Aliases kullanıcıların gördüğü canonical
  -- ismin yerine geçmemeli").
  aliases text[] not null default '{}',
  status institution_status not null default 'unverified',
  -- Who submitted it, if custom/unverified — null for a verified/seeded row.
  created_by uuid references public.profiles(id) on delete set null,
  source text,
  data_confidence data_confidence,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_canonical_name_length check (char_length(canonical_name) <= 300)
);
create trigger institutions_set_updated_at before update on public.institutions for each row execute function public.set_updated_at();

comment on table public.institutions is
  'Canonical registry for schools and organizations (spec: Canonical Entity Autocomplete System). Verified rows are curated (admin-client only, no RLS policy grants a normal client status=''verified''); unverified rows are the "custom fallback" a student creates when search finds no match.';

create index institutions_name_trgm_idx on public.institutions using gin (canonical_name gin_trgm_ops);
create index institutions_category_idx on public.institutions(category, country);

-- Prevents a trivial exact duplicate within the same category+country+city — case-
-- insensitive. Deliberately city-scoped, not just country-scoped: two genuinely
-- different real institutions can share a name within one country ("Saint Joseph" —
-- spec's own ambiguous-entity example) as long as they're in different cities: a
-- country-only constraint would have wrongly blocked the second one from ever being
-- added. This is *not* a substitute for alias-aware duplicate detection at the same
-- city+country (see lib/entities/rank.ts's fuzzy matching, used for the "did you mean"
-- flow) — it only catches the exact-normalized-string case a constraint can reliably
-- decide on its own; a constraint can never safely decide whether two similarly-named
-- entities are the same real place (spec: "do not auto-merge ambiguous entities").
create unique index institutions_dedup_idx on public.institutions (category, lower(canonical_name), coalesce(country, ''), coalesce(city, ''));

alter table public.institutions enable row level security;

-- Every signed-in student needs to search the full registry, verified AND unverified —
-- an unverified custom entity someone else already added must still be findable, or a
-- second student searching the same real place creates ANOTHER duplicate custom entity.
-- Presentation-safe: an unverified row only ever contains what a student typed as their
-- own school/employer's name/location, nothing sensitive.
create policy "any signed-in user can search institutions" on public.institutions for select using (auth.uid() is not null);

-- Any signed-in user can add a custom (unverified) entity — the actual "custom fallback"
-- mechanism (spec section 6). Canonical/verified entities are curated separately (admin
-- client only); this policy can never itself create a verified row.
create policy "signed-in user can add a custom institution" on public.institutions for insert with check (
  auth.uid() is not null and status = 'unverified' and created_by = auth.uid()
);

alter table public.universities add column aliases text[] not null default '{}';
comment on column public.universities.aliases is
  'Alternate names/abbreviations (e.g. "MIT" for Massachusetts Institute of Technology) — search-only, never the display name (Canonical Entity Autocomplete System).';

alter table public.opportunities add column aliases text[] not null default '{}';
comment on column public.opportunities.aliases is
  'Alternate names/abbreviations (e.g. "YYGS" for Yale Young Global Scholars) — search-only, never the display name.';

-- ---------- Canonical linkage columns (nullable, additive, backward-compatible) ----------
-- Every one of these keeps its existing free-text column exactly as-is — legacy rows
-- keep rendering completely unchanged (spec section 19: "This upgrade must be backward
-- compatible"). The new *_id column is the preferred source of truth going forward; the
-- app layer (lib/entities/resolve.ts) keeps the legacy text column in sync with the
-- linked institution's current canonical_name at selection time, so every existing read
-- path (portfolio, CV builder, exports, ...) keeps working with zero changes while still
-- always showing the canonical name at the moment it was chosen.
alter table public.profiles add column school_id uuid references public.institutions(id) on delete set null;
alter table public.education_records add column school_id uuid references public.institutions(id) on delete set null;
alter table public.work_experiences add column organization_id uuid references public.institutions(id) on delete set null;
alter table public.volunteering_experiences add column organization_id uuid references public.institutions(id) on delete set null;
alter table public.activities add column organization_id uuid references public.institutions(id) on delete set null;
alter table public.research_experiences add column organization_id uuid references public.institutions(id) on delete set null;
alter table public.awards add column organization_id uuid references public.institutions(id) on delete set null;
alter table public.certifications add column organization_id uuid references public.institutions(id) on delete set null;
alter table public.projects add column organization_id uuid references public.institutions(id) on delete set null;
alter table public.sports_experiences add column team_organization_id uuid references public.institutions(id) on delete set null;

-- New linkage, not a replacement for anything — no achievement type previously recorded
-- which catalog opportunity/program a participation entry corresponded to.
alter table public.activities add column opportunity_id uuid references public.opportunities(id) on delete set null;

create index profiles_school_id_idx on public.profiles(school_id);
create index education_records_school_id_idx on public.education_records(school_id);
create index work_experiences_organization_id_idx on public.work_experiences(organization_id);
create index volunteering_experiences_organization_id_idx on public.volunteering_experiences(organization_id);
create index activities_organization_id_idx on public.activities(organization_id);
create index activities_opportunity_id_idx on public.activities(opportunity_id);
create index research_experiences_organization_id_idx on public.research_experiences(organization_id);
create index awards_organization_id_idx on public.awards(organization_id);
create index certifications_organization_id_idx on public.certifications(organization_id);
create index projects_organization_id_idx on public.projects(organization_id);
create index sports_experiences_team_organization_id_idx on public.sports_experiences(team_organization_id);
