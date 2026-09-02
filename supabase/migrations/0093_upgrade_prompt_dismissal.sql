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
