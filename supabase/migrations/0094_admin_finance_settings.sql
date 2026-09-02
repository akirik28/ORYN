-- Admin finance dashboard's editable settings (CEO's course correction, 2026-09-02: the
-- founder wants a control panel, not a report -- "sen bana rapor tarzı bir şey yapıyorsun,
-- ben ... çok yardımcı olacak bir sayfa istiyorum". See docs/maliyet-ve-fiyatlandirma-
-- 2026-09-02.md for why these two figures specifically need to live somewhere the admin can
-- change without a deploy, and lib/admin/finance.ts for the calculations that read them.
--
-- Singleton, not a generic key-value settings table -- there are exactly two known settings
-- today (rate, price) and both are typed, named columns, matching this codebase's general
-- preference for structured tables over a KV blob (no generic settings table exists
-- anywhere else in this schema to extend instead). A fixed, known id rather than a Postgres
-- CHECK-constraint singleton trick -- simpler to read and write against explicitly, and
-- this project's own style leans toward the explicit mechanism over the clever one.
--
-- Two independently-nullable/defaulted columns, not one shared "updated_at" -- the founder
-- can set the price without knowing the rate, or the rate without touching the price, and
-- each needs its own staleness signal (mirrors ADMIN_STARTING_CREDIT_USD/_ENTERED_AT's
-- existing pairing, migration-free until now because that one manages via env vars — this
-- is the first admin-config value that needs to be editable at runtime, not at deploy time).
--
-- usd_try_rate is nullable with NO default: the whole point (docs/maliyet-ve-fiyatlandirma-
-- 2026-09-02.md §5 refused to invent this number) is that "unset" must be a real, distinct
-- state from any numeric value, including a placeholder like 0 or 1. ultra_price_try DOES
-- get a real default (399.99, the founder's own already-set price, already live as copy in
-- messages/en.json and messages/tr.json and as the ULTRA_PRICE_TRY constant in
-- lib/admin/finance.ts) -- unlike the rate, there is a known-correct value here even before
-- anyone opens the settings UI, so defaulting to it (rather than nullable-and-unconfigured)
-- means the price displayed is never wrong by omission, only stale if changed elsewhere and
-- not yet reflected here.
--
-- Per this project's standing discipline (lib/supabase/errors.ts's own comment is the
-- canonical statement, extended to a missing TABLE not just a missing column by this
-- migration's own lib/admin/queries.ts read path via isUndefinedTableError): written and
-- left unapplied. Absence must read as "not configured" for the rate (matches the existing
-- ADMIN_USD_TRY_RATE env-var behavior it replaces) and as "the known default price" for the
-- price -- never as an error, never as a blocked render.
create table if not exists public.admin_finance_settings (
  id uuid primary key,
  usd_try_rate numeric,
  usd_try_rate_updated_at timestamptz,
  ultra_price_try numeric not null default 399.99,
  ultra_price_try_updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.admin_finance_settings is
  'Singleton settings row for the admin finance dashboard (2026-09-02). Application code always reads/writes the one row at id = 00000000-0000-0000-0000-000000000001 (ADMIN_FINANCE_SETTINGS_ID in lib/admin/queries.ts) -- no code path inserts a second row. See this migration''s own header comment for why this is a typed table rather than a generic key-value store.';
comment on column public.admin_finance_settings.usd_try_rate is
  'TL per 1 USD. NULL means genuinely unconfigured -- docs/maliyet-ve-fiyatlandirma-2026-09-02.md refused to guess this number, and every downstream calculation (margin multiple, break-even revenue) must render "not configured" rather than compute against a placeholder.';
comment on column public.admin_finance_settings.ultra_price_try is
  'The Ultra plan price the founder set 2026-09-02 (399.99 TL/month at time of writing). Duplicated as display copy in messages/en.json and messages/tr.json (settings.plan.interestDescription, nav.upgradePlanPrice) -- editing here does not update that copy automatically; a real drift risk this migration does not resolve, flagged rather than silently accepted.';
comment on column public.admin_finance_settings.updated_by is
  'Which admin last changed either value -- ON DELETE SET NULL rather than CASCADE, so a deleted admin account does not silently delete the founder''s own configured rate/price along with it.';

-- Admin-only; read/written via the service-role client, never user-facing RLS -- matching
-- 0013_ops.sql's own provider_health/external_sync_jobs/ai_usage exactly, not a new
-- pattern. This schema has no reusable is_admin(uuid) SQL function to write an RLS policy
-- against (checked before assuming one existed, per app/(app)/admin/actions.ts's own header
-- comment: admin status is an application-layer check, requireAdmin(), and every export
-- there switches to createAdminClient() -- the service-role client -- which bypasses RLS
-- entirely once past that gate). No RLS enabled, no policies: the table is unreachable from
-- the anon/authenticated roles by construction (no policy = no access once RLS would be
-- enabled, and simply never enabling it here means the same "nothing but service_role can
-- touch this" outcome without inventing a function this schema doesn't have). If this table
-- ever needs a non-admin reader, RLS and a real policy are the first things to add then --
-- not assumed safe by omission the way profiles.is_admin was before migration 0062 found it
-- wasn't.
