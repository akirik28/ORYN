-- Professional Profile & Networking Pack (founder-approved scope, 2026-08-16), Batch A+B
-- schema. Reuses existing architecture wherever it already covers a need: education
-- content lives in education_records/courses/test_scores (already built — this migration
-- only adds an opt-in GPA-visibility flag, not new tables); skills already exist
-- (extended in 0034); "Experience & Leadership" is a presentation layer over existing
-- activities/work_experiences/volunteering_experiences/projects/research_experiences
-- (no schema change at all — see lib/portfolio/experience-timeline.ts).

-- ---------- profiles: new professional-identity fields ----------
alter table public.profiles
  add column headline text,
  add column about text,
  add column open_to text[] not null default '{}',
  add column show_gpa boolean not null default false;

alter table public.profiles add constraint profiles_headline_length check (headline is null or char_length(headline) <= 220);
alter table public.profiles add constraint profiles_about_length check (about is null or char_length(about) <= 2600);

comment on column public.profiles.headline is
  'Optional short professional identity line (e.g. "Aspiring Economist · Grade 11 @ UAA"). Plain text only — rendered as text, never parsed as markdown/HTML, so there is no injection surface.';
comment on column public.profiles.about is
  'Optional free-text bio/summary. Same plain-text-only rendering rule as headline.';
comment on column public.profiles.open_to is
  'Structured multi-select from a fixed vocabulary (lib/social/open-to.ts), distinct from the existing free-text profiles.looking_for. Visibility controlled by contact_info.open_to_visibility (this table, not profiles, so it shares one visibility model with the rest of the optionally-shareable contact surface).';
comment on column public.profiles.show_gpa is
  'Opt-in: education_records.overall_gpa/gpa_scale and courses.grade_value are only ever shown on the public profile when this is true. Default false — GPA is never shown by default.';

-- ---------- Contact info: one row per user, every field independently optional and
-- independently visible. RLS below is intentionally owner-only for ALL access (not
-- "select for authenticated") — per-field visibility can't be expressed as a row-level
-- RLS predicate (RLS grants or denies a whole row, not individual columns), so every
-- cross-user read goes through a server-only function that fetches via the admin client
-- and filters field-by-field against the viewer's actual relationship to the owner —
-- same pattern already established for portfolio/skills visibility
-- (lib/social/public-profile.ts's isCurrentlyPublic + admin-client reads). The owner-only
-- RLS here is the real, final gate against any OTHER unauthorized read path; the
-- server-only filter function is what makes any of this actually visible to anyone else. ----------
create type contact_visibility as enum ('private', 'connections', 'public');

create table public.contact_info (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  phone_visibility contact_visibility not null default 'private',
  email text,
  email_visibility contact_visibility not null default 'connections',
  linkedin_url text,
  linkedin_visibility contact_visibility not null default 'private',
  instagram_handle text,
  instagram_visibility contact_visibility not null default 'private',
  github_url text,
  github_visibility contact_visibility not null default 'private',
  website_url text,
  website_visibility contact_visibility not null default 'private',
  twitter_handle text,
  twitter_visibility contact_visibility not null default 'private',
  discord_handle text,
  discord_visibility contact_visibility not null default 'private',
  open_to_visibility contact_visibility not null default 'private',
  updated_at timestamptz not null default now()
);
create trigger contact_info_set_updated_at before update on public.contact_info for each row execute function public.set_updated_at();

comment on table public.contact_info is
  'One row per user (PK = user_id), created on first save (upsert), not at signup — a row not existing means "nothing set yet", identical in effect to every field being null/private.';
comment on column public.contact_info.phone_visibility is
  'Minor-safe default: private. A student under 18 (computed server-side from profiles.birth_year, never trusted from the client) can only choose private/connections — enforced in app/(app)/profile/contact-actions.ts, not just the UI. Adults may choose public explicitly.';

alter table public.contact_info enable row level security;
create policy "owner full access to own contact info" on public.contact_info
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Featured: pins 3-5 existing achievements (or an external link) to the top
-- of the profile. Polymorphic by necessity (a project, an award, a sports achievement,
-- ... are 7 different tables) — item_id is a plain uuid with no single FK, so ownership
-- and continued existence are re-verified server-side on every write and read (same
-- trade-off this schema already accepts for e.g. evidence_files' loosely-typed
-- references), not enforced by a foreign key. Featured items carry no privacy state of
-- their own: this product's portfolio visibility is whole-profile, not per-item (see
-- docs/known-issues.md), so a featured item is visible exactly when the rest of the
-- portfolio would be (public profile or self) — re-verified at read time against the
-- CURRENT state of the referenced row, not assumed from the mere existence of this row,
-- so a since-deleted or since-privated item never leaks. ----------
create type featured_item_type as enum (
  'project', 'research_experience', 'award', 'activity', 'work_experience',
  'volunteering_experience', 'sports_experience', 'external_link'
);

create table public.featured_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type featured_item_type not null,
  item_id uuid,
  external_title text,
  external_url text,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint featured_items_reference_shape check (
    (item_type = 'external_link' and item_id is null and external_url is not null and char_length(external_url) <= 2048)
    or (item_type <> 'external_link' and item_id is not null and external_url is null)
  )
);
create unique index featured_items_user_item_idx on public.featured_items (user_id, item_type, item_id) where item_id is not null;
create index featured_items_user_order_idx on public.featured_items(user_id, display_order);

alter table public.featured_items enable row level security;
create policy "owner full access to own featured items" on public.featured_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
