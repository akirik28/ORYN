-- ORYN — sabah paketi 1/2: uygulanmamış migration'lar
-- Oluşturulma: 2026-09-03, canlı veritabanına (qtcvcflzxbuagvvwahhu) okuma yaparak.
--
-- HANGİLERİ VE NEDEN: 0083-0089, 0091, 0092 canlıda UYGULANMIŞ durumda (information_schema
-- ile tek tek doğrulandı, migration listesine güvenilmedi). Aşağıdakiler uygulanmamış.
-- 0090 ve 0093 bu geceden değil — gözden kaçmışlar, o yüzden buraya dahil.
--
-- TEK İŞLEM: hepsi BEGIN/COMMIT arasında. Bir tanesi bile hata verirse HİÇBİRİ uygulanmaz
-- ve dosyayı tekrar çalıştırmak güvenlidir. Bu bilerek böyle: 0095, 0096, 0099 ve 0100
-- "IF NOT EXISTS" kullanmıyor, yani yarısı uygulanmış bir durumda ikinci deneme patlardı.
-- Postgres'te DDL işlem içinde geri alınabilir; bu dosyadaki hiçbir migration kendi
-- BEGIN/COMMIT'ini içermiyor ve hiçbirinde CONCURRENTLY yok — ikisi de kontrol edildi.
--
-- NASIL: Supabase SQL Editor'e tamamını yapıştır, Run. Sonunda doğrulama sorgusu var;
-- 9 satırın hepsinde "uygulanmis = true" görmelisin.

BEGIN;


-- ══════════════════════════════════════════════════════════════════
-- 0090_notification_preferences.sql
-- ══════════════════════════════════════════════════════════════════

-- Phase 24 gap, found live: nothing anywhere let a student turn a notification category off.
-- Founder asked directly ("bildirim ayarı") and it went unanswered until this session audited
-- every surface (Settings page, schema, the single shared write path, delivery channel) and
-- confirmed none of them had it -- see docs/notification-settings-gap-2026-09-02.md for the
-- full trail, including live counts (one real account already carrying 100 unread weekly_plan
-- rows it has no way to stop).
--
-- Numbered 0090, not 0089 -- 0089_profiles_plan_tier.sql exists uncommitted in another
-- session's worktree as of this writing. It isn't pushed, so neither this branch nor git can
-- see it; skipping straight to 0090 avoids that collision by construction rather than by luck.
--
-- Seven flat columns on profiles, not a separate notification_preferences table -- matches
-- this table's own existing convention for a small, fixed set of per-student behavior flags
-- (busy_mode, is_public, weekly_time_budget already live here) rather than adding a join for
-- exactly seven enum values that don't change shape often.
--
-- default true on every column, deliberately: this migration must not change any existing
-- account's actual behavior on the day it applies. Every category keeps notifying exactly as
-- it does today, for every student, until they explicitly turn one off themselves.
--
-- Per this project's standing discipline (lib/supabase/errors.ts's own comment is the
-- canonical statement of the rule): written and left unapplied. lib/notifications/create.ts's
-- createNotification() degrades to "every category enabled" via isUndefinedColumnError when
-- these columns are absent -- never throws, never silently drops a notification because this
-- lookup failed.
--
-- GOING-FORWARD ONLY -- read this before assuming a report of "the toggle didn't work" means
-- the gate is broken. Turning a category off stops future notifications of that category; it
-- does not touch rows already written. The live count that motivated this migration
-- (docs/notification-settings-gap-2026-09-02.md) was 106 unread rows, 100 of them
-- weekly_plan on one real account -- a student muting weekly_plan today still sees those 100
-- until they're read or the rows are otherwise cleared. That is expected, not a bug in this
-- migration or in createNotification()'s gate.
--
-- THE WRITE SIDE FAILS LOUDLY, ON PURPOSE -- do not "fix" this into a silent degrade.
-- Verified 2026-09-02 (docs/migration-audit-applied-vs-written-2026-09-02.md):
-- `app/(app)/settings/actions.ts`'s `updateNotificationPreferences` has no
-- `isUndefinedColumnError` fallback around its update -- a failed write (including one caused
-- by this migration not being applied yet) returns a real, visible error to the student
-- ("Couldn't update your notification settings"), not a swallowed success. That is a
-- *different* shape from the read-side degrades this file and lib/notifications/create.ts
-- both use elsewhere, and it is deliberate, not an inconsistency to clean up: this is the one
-- write in this whole package a student directly and knowingly triggers (a Settings toggle),
-- and silently reporting success while the preference never actually saved would let a
-- student believe they had muted a category when they hadn't -- exactly the fake-success
-- shape AGENTS.md's Rule 4 ("no fake production behavior") forbids. The read paths degrade
-- because a missed notification-preference check should fail toward "still notify" rather
-- than break the notification pipeline for everyone; this one write does not get the same
-- treatment because failing toward "silently didn't save" is the wrong direction for an
-- action the student is watching happen.
alter table public.profiles
  add column if not exists notify_deadline boolean not null default true,
  add column if not exists notify_new_opportunity boolean not null default true,
  add column if not exists notify_weekly_plan boolean not null default true,
  add column if not exists notify_profile_update boolean not null default true,
  add column if not exists notify_university_data_changed boolean not null default true,
  add column if not exists notify_connection boolean not null default true,
  add column if not exists notify_message boolean not null default true;

comment on column public.profiles.notify_deadline is
  'Per-category notification preference (2026-09-02). true (the default) matches every account''s behavior before this column existed -- nobody''s notifications change on migration day. Read by lib/notifications/create.ts before writing a deadline-category row; false suppresses future notifications only, never retroactively clears rows already written.';
comment on column public.profiles.notify_new_opportunity is
  'See notify_deadline''s comment -- same mechanism, new_opportunity category.';
comment on column public.profiles.notify_weekly_plan is
  'See notify_deadline''s comment -- same mechanism, weekly_plan category.';
comment on column public.profiles.notify_profile_update is
  'See notify_deadline''s comment -- same mechanism, profile_update category.';
comment on column public.profiles.notify_university_data_changed is
  'See notify_deadline''s comment -- same mechanism, university_data_changed category.';
comment on column public.profiles.notify_connection is
  'See notify_deadline''s comment -- same mechanism, connection category.';
comment on column public.profiles.notify_message is
  'See notify_deadline''s comment -- same mechanism, message category.';


-- ══════════════════════════════════════════════════════════════════
-- 0093_upgrade_prompt_dismissal.sql
-- ══════════════════════════════════════════════════════════════════

-- Upgrade-prompt dismissal state (Phase 24-adjacent, but this is a prompt a student
-- triggers by dismissing, not a notification) -- see docs/upgrade-prompt-design-spec-
-- 2026-09-02.md and docs/research/upgrade-prompt-frequency-precedent-2026-09-02.md for the
-- full policy this schema exists to express. Founder approved pop-up upgrade prompts with a
-- frequency cap; oryn-60's research supplies the actual numbers below.
--
-- Numbered 0093, not 0092 -- this branch was cut before oryn-31's 0092_ultra_welcome_seen.sql
-- merged; two lanes reached for "the next number" against different snapshots of main the
-- same way 0079/0080 and others did earlier tonight. Renumbered on rebase, not a collision
-- left for someone else to catch.
--
-- Durable, cross-device -- not localStorage. The one asymmetry that decided this: a student
-- who explicitly declined on their laptop and gets asked again on their phone reasonably
-- feels ignored, and re-showing after an explicit no is the thing that turns a prompt into
-- an ad (oryn-a7's framing). The softer "shown once this session" cap is deliberately NOT
-- here -- that's genuinely session-scoped (a new tab/day should be eligible again, subject
-- to everything below), so it lives in sessionStorage on the client, not this table.
--
-- Four columns, not a boolean, because the policy has three distinct tiers of "no":
--   1. soft_dismissed_until -- closed/clicked away without an explicit choice: 7 days.
--   2. not_now_at / not_now_count -- explicit "Not now" (equal visual weight to the CTA):
--      suppressed for the rest of the calendar month containing not_now_at. A SECOND
--      explicit "Not now" in a genuinely later month escalates to permanent (below).
--   3. dismissed_forever -- set once, on that second later-month "Not now". This tier has
--      to actually mean never (oryn-60's research names Instagram's "Not Now" that only
--      ever deferred as the exact pattern to not reproduce) -- the discoverable way back is
--      the sidebar's existing "Upgrade your plan" link to /settings/plan
--      (features/app-shell/sidebar.tsx), not a new settings toggle: that page is reachable
--      regardless of this flag, so "indefinitely" here never blocks a student who changes
--      their mind from finding it themselves.
--
-- Per this project's standing discipline (lib/supabase/errors.ts's own comment is the
-- canonical statement): written and left unapplied. A missing row or missing column must
-- never surface as an error, never block rendering the rest of the advisor page.
-- lib/advisor/upgrade-prompt.ts's read path degrades via isUndefinedColumnError, matching
-- lib/notifications/create.ts's own read-side pattern.
--
-- DELIBERATELY chosen, not the reflex -- absence reads as "not yet dismissed," meaning the
-- prompt CAN show while unapplied, not as "can't durably record this yet, so stay silent"
-- the way oryn-31's 0092 (ultra_welcome_seen) reads it for their own feature. Argued, not
-- copied: their welcome moment has no independent cap of its own, so "absence -> show"
-- there means firing on literally every page load forever, which is a worse failure than
-- never firing at all. This feature has a real, independent cap regardless of database
-- state -- sessionStorage's "once per session" plus the actual trigger event (a genuinely
-- new degraded reply) -- so "absence -> can show" here means, worst case, one bounded
-- appearance per session while unapplied, not an unbounded repeat. And unlike a one-time
-- welcome, "absence -> never show" would make the whole mechanism this migration exists
-- for silently inert for as long as it stays unapplied, which this project's own history
-- (0089-0091 sat unapplied for hours) says is not a short window. Same underlying
-- principle both migrations follow -- pick the failure direction that costs less given
-- THIS feature's actual shape -- applied to two features with opposite right answers.
alter table public.profiles
  add column if not exists upgrade_prompt_soft_dismissed_until timestamptz,
  add column if not exists upgrade_prompt_not_now_at timestamptz,
  add column if not exists upgrade_prompt_not_now_count integer not null default 0,
  add column if not exists upgrade_prompt_dismissed_forever boolean not null default false;

comment on column public.profiles.upgrade_prompt_soft_dismissed_until is
  'Upgrade-prompt dismissal state (2026-09-02). Set on a passive dismiss (click away/close, no explicit choice) to now() + 7 days; the prompt is suppressed until this time. NULL means no active soft suppression. See notify_deadline''s comment (migration 0090) for the general unapplied-migration convention this follows.';
comment on column public.profiles.upgrade_prompt_not_now_at is
  'Timestamp of the most recent explicit "Not now" click (equal visual weight to the upgrade CTA, never the smaller/quieter control). Suppresses the prompt through the end of the calendar month this falls in. NULL means never explicitly declined.';
comment on column public.profiles.upgrade_prompt_not_now_count is
  'How many times "Not now" has been explicitly clicked, ever. The second click in a calendar month later than upgrade_prompt_not_now_at''s original month sets dismissed_forever below.';
comment on column public.profiles.upgrade_prompt_dismissed_forever is
  'Permanent suppression, set once a student has explicitly declined twice across two different calendar months. This tier must actually mean never -- the way back is the existing /settings/plan page (always reachable via the sidebar), not a code path that quietly re-arms this flag.';


-- ══════════════════════════════════════════════════════════════════
-- 0094_admin_finance_settings.sql
-- ══════════════════════════════════════════════════════════════════

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


-- ══════════════════════════════════════════════════════════════════
-- 0095_job_controls.sql
-- ══════════════════════════════════════════════════════════════════

-- Per-job "disable future runs" flag for the admin panel's operational-health section
-- (2026-09-02, founder ops-panel pivot — oryn-a7's brief: "a job burning budget and
-- producing nothing needs an off switch that isn't a deploy"). 0094 is oryn-3f's finance
-- settings table.
--
-- Deliberately does NOT attempt to stop a run already in progress -- there is no API to
-- terminate an in-flight Vercel serverless invocation from application code, and faking it
-- (marking a row "failed" while the real process keeps running to completion regardless)
-- would be exactly the "says done without proving it" trap oryn-a7's own brief warned
-- against for this feature. This table only gates the NEXT attempt: both the admin panel's
-- manual "run now" trigger and the /api/jobs/* cron routes must check `disabled` before
-- calling runWithTracking, not after.
--
-- One row per known job, upserted on toggle -- not a boolean column bolted onto
-- external_sync_jobs, which is a run-history LOG (one row per execution), not job
-- configuration. Mixing the two would make "is this job disabled" a query over the log's
-- most recent row instead of a direct, O(1) lookup, and would make a disabled job with zero
-- run history unrepresentable.
--
-- Same admin-only shape as provider_health/external_sync_jobs (migration 0013 + 0014's RLS
-- pass): RLS enabled, zero policies -- service-role access only, no student-facing read
-- path exists or should exist. `disabled_by` is a real profiles FK (not just a string) so
-- the admin panel can show who flipped a job off, matching message_reports' own
-- reviewed_by convention.
create table public.job_controls (
  job_name text primary key,
  disabled boolean not null default false,
  disabled_at timestamptz,
  disabled_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger job_controls_set_updated_at before update on public.job_controls for each row execute function public.set_updated_at();

alter table public.job_controls enable row level security;
-- No policies -- service-role access only, matching provider_health/external_sync_jobs.

comment on table public.job_controls is
  'Per-job "disable future runs" flag (2026-09-02). Checked by both the admin panel''s manual trigger actions and the /api/jobs/* cron routes before starting a run. Absence of a row (including "this table does not exist yet on this database") means not disabled -- see lib/jobs/job-controls.ts''s own comment for why fail-open is the correct direction here, the same convention every other written-and-possibly-unapplied migration in this project follows.';


-- ══════════════════════════════════════════════════════════════════
-- 0096_quota_grants.sql
-- ══════════════════════════════════════════════════════════════════

-- Append-only admin top-up/reset ledger for a student's shared monthly AI allowance
-- (lib/ai/monthly-quota.ts's getMonthlyQuota, lib/ai/limits/budget.ts's selectModelForUser).
-- "A student who legitimately exhausted their month has no recourse today" (oryn-a7,
-- 2026-09-02) -- this is that recourse, without ever editing an ai_usage row. Editing usage
-- rows to "reset" someone would destroy the only honest record of what was actually spent,
-- and this project has spent tonight discovering places where the record and the reality
-- had drifted; a ledger keeps both facts instead. "Reset" and "grant" are the same
-- primitive at the application layer -- a reset is a grant equal to the student's current
-- month-to-date spend -- so there is exactly one table and one write path for both.
--
-- Read by BOTH selectModelForUser (the degrade decision) and getMonthlyQuota (the hard
-- monthly stop), never just one -- a grant relieves both, because a "reset" that still
-- leaves a student stuck on the degraded model would only be half a reset. See
-- lib/ai/limits/grants.ts's own comment.
--
-- Students can read their own grants -- same "select own X" shape as ai_usage
-- (0014_row_level_security.sql, "select own ai usage") -- there is no reason to hide from a
-- student that their allowance was topped up, and getMonthlyQuota itself reads this table
-- through the student's own request-scoped client (not an admin client), so the policy is
-- load-bearing for the feature working at all, not just a courtesy. Writes are service-role
-- only: the admin action goes through createAdminClient(), the same trust boundary as every
-- other admin-only write in this app -- no insert/update/delete policy exists for
-- authenticated users.

create table public.quota_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_usd numeric(10,4) not null check (amount_usd > 0),
  reason text,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index quota_grants_user_id_idx on public.quota_grants(user_id, created_at desc);

alter table public.quota_grants enable row level security;
create policy "select own quota grants" on public.quota_grants for select using (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════════
-- 0097_admin_action_log.sql
-- ══════════════════════════════════════════════════════════════════

-- Admin action log (2026-09-02): the shared "log it" infrastructure oryn-a7 asked to hold
-- every operational admin action to, starting with plan-tier changes and built to be reused
-- by every later action in the same package (trial grant/end, allowance reset, opportunity
-- disable, job trigger) rather than rebuilt per action.
--
-- The founder's own stated pain this exists to fix: they had to ask oryn-a7 to run raw SQL
-- twice to set their own plan_tier to 'ultra', and once it silently affected zero rows with
-- neither of them knowing why. A log entry that always gets written on success (never
-- inferred from "the row must have changed, probably") is the direct answer to that: an
-- admin can always see whether their own action actually did something, and later, who
-- changed what.
--
-- Generic on purpose -- one `action` text column plus a jsonb `detail`, not a table per
-- action type. The five actions on the roadmap (set_plan_tier, grant_trial, end_trial,
-- reset_ai_allowance, disable_opportunity, trigger_job) share nothing structurally beyond
-- "an admin did something, to something, with this detail" -- a table per action would mean
-- a migration for every future admin action just to gain an audit trail it should have had
-- from the first one.
--
-- admin_id/target_user_id both `on delete set null`, deliberately not `on delete restrict`:
-- spec Phase 12 requires real account deletion, and an audit log must never become the
-- reason a deletion request can't complete (the same principle migration 0058's own header
-- states for global data -- "do not create cascading deletion capable of unexpectedly
-- destroying data" applies here in the opposite direction: an unrelated table must not block
-- deletion either). admin_label/target_label are point-in-time snapshots (display name,
-- taken when the row is written) so the log stays human-readable after either account is
-- gone -- an audit trail that goes blank the moment the person it describes is deleted has
-- failed at the one job it exists for.
--
-- No RLS policy at all, matching provider_health/external_sync_jobs (migration 0014's own
-- comment: "ops tables get no policy at all -- service-role access only"). Every write goes
-- through createAdminClient() from inside a requireAdmin()-gated Server Action, same trust
-- boundary as every other admin write in app/(app)/admin/actions.ts; there is no path by
-- which a normal authenticated client should ever read or write this table.
create table if not exists public.admin_action_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  admin_label text not null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_label text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_action_log is
  'Append-only record of operational admin actions (2026-09-02) -- who did what, to whom, with what result. Written on every successful mutating admin action; never edited or deleted by the app. See this migration''s own header for why admin_id/target_user_id are nullable with a denormalized label alongside each.';
comment on column public.admin_action_log.action is
  'A short machine key, e.g. ''set_plan_tier'' -- not a free-text description. The UI/report layer is responsible for turning this plus `detail` into a readable sentence.';
comment on column public.admin_action_log.detail is
  'Action-specific structured detail, e.g. {"from":"standard","to":"ultra"} for set_plan_tier. Never a place for content that shouldn''t outlive the row it describes -- see spec Phase 76''s "avoid logging sensitive student document content."';

create index if not exists admin_action_log_created_at_idx on public.admin_action_log (created_at desc);
create index if not exists admin_action_log_target_user_id_idx on public.admin_action_log (target_user_id) where target_user_id is not null;

alter table public.admin_action_log enable row level security;


-- ══════════════════════════════════════════════════════════════════
-- 0098_admin_actions.sql
-- ══════════════════════════════════════════════════════════════════

-- The admin panel's course correction, 2026-09-02: founder wants a control panel, not a report
-- ("ben bana yönetmede çok çok yardımcı olacak bir sayfa istiyorum"). The first two write-capable
-- actions this unblocks (disabling `3f7170ba` "AI Scholars", CEO's own decision) already landed
-- via manual SQL tonight, with zero record of who made the change or why -- the exact,
-- concretely-demonstrated gap this table exists to close. Not a general-purpose audit system:
-- scoped to the four catalog-health actions docs/catalog-health-actions-design-2026-09-02.md
-- designed (apply-cleanup, disable/flag an opportunity, queue-reverification), extensible to more
-- by adding a new `action` value, not a new table.
--
-- Written, NOT applied -- house pattern. Every one of the four actions this table exists to
-- record is itself unbuilt until this migration is live, so there is no code path anywhere that
-- can write to this table today; nothing degrades because nothing yet depends on it existing.
--
-- `admin_user_id` has no `on delete cascade`/`set null` decision made here on purpose -- an
-- admin's own account being deleted should not silently orphan or destroy the record of what
-- they did; `restrict` (the default) is the correct default until a real admin-offboarding
-- flow exists to make that call deliberately.
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id),
  action text not null,
  target_table text not null,
  target_id uuid not null,
  reason text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_actions is
  'Field-level audit trail for admin-panel write actions (2026-09-02 course correction). Written by the same request that performs the mutation it records -- never a separate best-effort call after. See docs/catalog-health-actions-design-2026-09-02.md.';

create index if not exists admin_actions_target_idx on public.admin_actions (target_table, target_id);
create index if not exists admin_actions_admin_user_idx on public.admin_actions (admin_user_id);

alter table public.admin_actions enable row level security;

-- Admins can read the full log (accountability has to be visible to the people it's about);
-- nothing here grants a normal student row access, since RLS with no policy for a role denies
-- by default -- the same posture every other admin-only table in this schema already takes.
create policy "admins can read admin_actions" on public.admin_actions
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Insert only via the service-role client (every admin Server Action already uses
-- createAdminClient(), same as removeReportedPost/restoreReportedPost) -- no authenticated-role
-- INSERT policy at all, matching this schema's own established convention for system-written
-- tables (notifications, ai_usage) rather than trusting a client-side admin_user_id.


-- ══════════════════════════════════════════════════════════════════
-- 0099_job_budget_overrides.sql
-- ══════════════════════════════════════════════════════════════════

-- Live-adjustable per-feature job budgets (lib/ai/limits/job-budget.ts), admin-only.
-- checkJobBudget currently reads JOB_BUDGET_USD, a constant computed once at import time
-- from AI_JOB_BUDGET_<FEATURE>_USD env vars (or a hardcoded estimate) -- changing it today
-- needs a deploy. This table lets an admin raise or lower a job's monthly budget without
-- one. A missing row means "use that existing default," never "no budget" or "$0 budget" --
-- see resolveJobBudgetUsd's own comment in job-budget.ts; a DB read failure falls back the
-- same way, since this gates a real spend control and failing toward "unbudgeted" would be
-- exactly the silent hole this whole night has spent closing elsewhere.
--
-- One row per feature (not a singleton like admin_finance_settings, 0094 -- job budgets are
-- a growing set keyed by feature name, not a handful of scalar settings). `feature` is plain
-- text, not a foreign key or a DB enum, matching ai_usage.feature's own convention -- the
-- two known values live in code (JobBudgetFeature, lib/ai/limits/job-budget.ts), and the
-- Server Action that writes here validates against that union before insert.
--
-- Service-role access only, same convention as provider_health/external_sync_jobs
-- (0014_row_level_security.sql) -- no student has any reason to read or write this.

create table public.job_budget_overrides (
  feature text primary key,
  budget_usd numeric(10,2) not null check (budget_usd >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger job_budget_overrides_set_updated_at before update on public.job_budget_overrides for each row execute function public.set_updated_at();

alter table public.job_budget_overrides enable row level security;
-- No policy -- service-role access only, same as provider_health/external_sync_jobs.


-- ══════════════════════════════════════════════════════════════════
-- 0100_ai_model_pricing.sql
-- ══════════════════════════════════════════════════════════════════

-- Live-adjustable per-token model pricing (lib/ai/pricing.ts), admin-only.
-- PRICE_PER_MILLION_TOKENS_USD is a hardcoded table -- when a model isn't in it,
-- estimateCostUsd returns null and estimated_cost is stored NULL (lib/ai/pricing.ts's own
-- documented behavior), which is exactly the gap this table exists to close without a
-- deploy: an admin can add or correct a model's rate here directly.
--
-- Checked BEFORE the hardcoded table falls back, not instead of it (see
-- resolveModelCostUsd's own comment in lib/ai/pricing.ts) -- an admin only ever needs to
-- enter the models that are new or wrong, never re-enter every model already correct in
-- code. One row per model, a growing list, same shape reasoning as 0099's
-- job_budget_overrides (a list keyed by name, not a handful of scalar settings like 0094's
-- singleton admin_finance_settings).
--
-- Service-role access only, same convention as job_budget_overrides/provider_health
-- (0014_row_level_security.sql) -- no student has any reason to read or write this.

create table public.ai_model_pricing (
  model text primary key,
  input_rate_per_million numeric(10,4) not null check (input_rate_per_million >= 0),
  output_rate_per_million numeric(10,4) not null check (output_rate_per_million >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger ai_model_pricing_set_updated_at before update on public.ai_model_pricing for each row execute function public.set_updated_at();

alter table public.ai_model_pricing enable row level security;
-- No policy -- service-role access only, same as job_budget_overrides/provider_health.


COMMIT;

-- ── DOĞRULAMA — bunu ayrıca çalıştır, 9 satır da true olmalı ──────────
select t.beklenen, (
  select count(*) from information_schema.tables it
  where it.table_schema = 'public' and it.table_name = t.beklenen
) > 0 as uygulanmis
from (values
  ('notification_preferences'), ('upgrade_prompt_dismissals'), ('admin_finance_settings'),
  ('job_controls'), ('quota_grants'), ('admin_action_log'), ('admin_actions'),
  ('job_budget_overrides'), ('ai_model_pricing')
) as t(beklenen)
order by uygulanmis, beklenen;
