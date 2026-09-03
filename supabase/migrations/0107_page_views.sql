-- Anonymous page-view counting (2026-09-03) -- the founder's own ask when he approved the
-- control centre design: "uygulamayı kaç kişi izlemiş falan her şey orda olmalı" (how many
-- people have looked at the app, all of it should be there). Scoped to logged-out visitors:
-- authenticated usage is already counted via profiles/product_events, so this table only
-- ever receives writes from the public landing page (lib/analytics/page-views.ts).
--
-- Minor-safe by construction, not by policy: visitor_hash is a one-way SHA-256 of a
-- server-only secret + the UTC calendar date + the request's IP + its user agent, computed
-- and discarded in the same request that reads it -- no IP, no user agent, and no cookie or
-- other client-side identifier is ever stored. Including the date in the hash input means
-- the same visitor produces a different hash every day: this table can answer "how many
-- distinct hashes were seen today" but cannot link one visitor's activity across two
-- different days, and there is nothing on the client to expire or clear because nothing is
-- ever set there. See PAGE_VIEW_HASH_SECRET in .env.example/API_SETUP.md for the secret
-- itself, and lib/admin/queries.ts's getPageViewStats for how this is read.
--
-- No RLS policy at all, matching admin_action_log/provider_health/external_sync_jobs --
-- "ops tables get no policy at all -- service-role access only" (migration 0014's own
-- framing, migration 0097's citation of it). Every write goes through the admin client from
-- lib/analytics/page-views.ts; there is no path by which a normal client should ever read or
-- write this table.
--
-- Proposed, not yet applied to the live database as of 2026-09-03 -- see
-- docs/founder-morning-runbook-2026-09-02.md for why schema changes wait on explicit
-- founder sign-off rather than landing silently alongside the code that uses them. The
-- application code that writes to and reads from this table (lib/analytics/page-views.ts,
-- lib/admin/queries.ts's getPageViewStats) already degrades to an honest "not measured"
-- state when this table is absent, so nothing breaks before this migration is applied.

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null,
  visitor_hash text not null
);

comment on table public.page_views is
  'Anonymous logged-out page views (2026-09-03) -- no IP, user agent, or cookie is ever stored. See this migration''s own header for the visitor_hash construction and why it cannot identify a visitor or link their activity across days.';
comment on column public.page_views.path is
  'Pathname only, e.g. ''/'' -- never the full URL, so an accidental query-string value (a referral token, an email in a link) can never end up stored here.';
comment on column public.page_views.visitor_hash is
  'sha256(secret + UTC date + IP + user agent), computed server-side and discarded immediately -- not reversible to an IP or user agent, and changes daily for the same visitor by design. Distinct count within a single day is an accurate distinct-visitor count; summed across multiple days it over-counts (a returning visitor gets a new hash each day), so multi-day totals in the UI are labeled as page views, not visitors.';

create index page_views_created_at_idx on public.page_views (created_at desc);

alter table public.page_views enable row level security;
