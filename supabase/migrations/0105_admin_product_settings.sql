-- The three Ayarlar controls the plan doc named that had no mechanism anywhere
-- (docs/kumanda-merkezi-yapi-plani-2026-09-03.md; oryn-31 shipped that screen honest about
-- the gap rather than rendering switches that do nothing). Singleton, not a generic
-- key-value settings table -- same reasoning as admin_finance_settings (0094), whose own
-- header comment this one matches deliberately: exactly three known settings, all typed,
-- named columns, no generic settings table exists anywhere in this schema to extend
-- instead. A distinct table from admin_finance_settings rather than three more columns on
-- it -- this is product/access configuration, not money, and finance's own header comment
-- already reasons that a new settings category gets its own table, not a shared one.
--
-- All three columns are `not null default <current behavior>`, unlike admin_finance_settings'
-- usd_try_rate (which has no safe default and is deliberately nullable) -- every one of
-- these three already has a real, known-correct value today: signups are open, there is no
-- maintenance mode, and the trial period has been a hardcoded 7 everywhere it's checked
-- (ULTRA_GIFT_DURATION_DAYS, lib/tier/plan-tier.ts, before this migration). That means the
-- unapplied-migration default and the pre-migration behavior are identical by construction
-- -- reading this table before it exists changes nothing about how the product behaves.
--
-- One shared updated_at/updated_by for the whole row, not per-field like admin_finance_settings'
-- two independent timestamps -- that file needed per-field staleness because the rate and
-- price are independently meaningful facts an admin might set at different times for
-- different reasons. These three are toggles/a single number on one "how open is the
-- product right now" screen; nothing downstream needs to know which of the three changed
-- most recently.
create table public.admin_product_settings (
  id uuid primary key,
  signups_enabled boolean not null default true,
  maintenance_mode boolean not null default false,
  trial_period_days integer not null default 7 check (trial_period_days > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.admin_product_settings is
  'Singleton settings row for the control centre''s Ayarlar screen (2026-09-03). Application code always reads/writes the one row at id = 00000000-0000-0000-0000-000000000002 (ADMIN_PRODUCT_SETTINGS_ID in lib/admin/queries.ts) -- no code path inserts a second row. Distinct id from admin_finance_settings'' 00000000-0000-0000-0000-000000000001 so the two singletons can never collide.';
comment on column public.admin_product_settings.signups_enabled is
  'Gates app/(auth)/actions.ts''s signUp() itself, not just the signup page''s UI -- a student mid-onboarding or an existing account signing back in is unaffected either way, this only blocks a brand-new supabase.auth.signUp() call from happening at all.';
comment on column public.admin_product_settings.maintenance_mode is
  'Gates app/(app)/layout.tsx, the authenticated student shell -- deliberately NOT app/(admin)/layout.tsx, which is its own route group with its own layout and is never touched by this flag by construction. No admin exemption inside the check itself either: a check that treats the checker specially stops being a check, and the panel is already reachable regardless (oryn-a7, 2026-09-03).';
comment on column public.admin_product_settings.trial_period_days is
  'Read by grantUltraGift (app/(app)/admin/actions.ts) at the moment a gift is granted, and stored as that student''s own ultra_gift_expires_at (migration 0106) -- changing this number going forward only affects gifts granted after the change, never one already in progress.';

-- Admin-only, same posture as admin_finance_settings and every other operational-config
-- table this project has (0013_ops.sql''s provider_health/external_sync_jobs/ai_usage) --
-- NOT `alter table ... enable row level security`, matching admin_finance_settings' own
-- explicit choice: no RLS, no policies, unreachable from anon/authenticated roles because
-- no GRANT exists for those roles, the same outcome an enabled-but-policy-less table would
-- produce, without inventing an is_admin(uuid) SQL function this schema doesn't have.
-- Read from two request paths with no admin session (app/(app)/layout.tsx for any
-- authenticated student, app/(auth)/actions.ts's signUp() before any session exists at
-- all) via the service-role client precisely because this data is operational
-- configuration, not a privileged secret, and every other settings singleton in this
-- schema already reads that way rather than through a per-consumer RLS policy invented
-- just for this table.
