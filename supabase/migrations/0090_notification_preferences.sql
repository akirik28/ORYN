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
