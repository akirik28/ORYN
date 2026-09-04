-- Dismissal state for the dashboard "add your parent's email" prompt (founder, verbatim,
-- docs/veli-hesabi-spec-2026-09-04.md §1: "loginlerde çocukların veli maillerini almamız
-- değer kazanıyor ... pop outlar burda da olsun" -- collecting a parent's email at login is
-- valuable, there should be pop-ups for this too). The collection mechanism itself (the
-- optional signup field, the Settings section) already shipped in P4 -- this is the missing
-- half: prompting a student who skipped it.
--
-- Four columns, not a reuse of upgrade_prompt_* (migration 0093) -- same shape, deliberately
-- separate storage. Reusing those columns would mean a student dismissing the advisor's
-- "upgrade to Ultra" prompt mid-chat silently suppresses this completely unrelated
-- "add your parent's email" prompt on the dashboard, and vice versa: two independent asks,
-- same person, same row, sharing one dismissal clock. CEO's own framing, 2026-09-04: "that's
-- a real bug, not untidiness" -- a dismissal of one prompt would quietly cost the product
-- the other, with no error anywhere to notice by. lib/parent/email-prompt.ts re-exports the
-- shared pure dismissal functions from lib/advisor/upgrade-prompt.ts (matching
-- lib/parent/upgrade-prompt.ts's own established re-export pattern for the P7 prompt) --
-- only the STORAGE is new here, not the policy mechanics.
--
-- Same three-tier policy as upgrade_prompt_* (soft/not-now/forever), same 7-day soft window,
-- same escalate-to-permanent-on-a-second-later-month-decline rule -- see that migration's
-- own header for the full policy reasoning, unchanged here.
--
-- Absence (unapplied) reads as "not yet dismissed," matching upgrade_prompt_*'s own choice
-- for the same reason: this prompt has an independent cap regardless of database state (a
-- client-side sessionStorage "shown once per browser session" guard, matching
-- features/advisor/advisor-chat.tsx's own UPGRADE_PROMPT_SESSION_KEY pattern), so
-- "absence -> can show" costs at most one bounded appearance per session while unapplied,
-- never an unbounded repeat.
alter table public.profiles
  add column if not exists parent_email_prompt_soft_dismissed_until timestamptz,
  add column if not exists parent_email_prompt_not_now_at timestamptz,
  add column if not exists parent_email_prompt_not_now_count integer not null default 0,
  add column if not exists parent_email_prompt_dismissed_forever boolean not null default false;

comment on column public.profiles.parent_email_prompt_soft_dismissed_until is
  'Parent-email dashboard prompt (2026-09-04). Set on a passive dismiss (the small close, no explicit choice) to now() + 7 days; suppressed until this time. NULL means no active soft suppression. Independent of upgrade_prompt_soft_dismissed_until (migration 0093) -- see this migration''s own header for why the two must not share storage.';
comment on column public.profiles.parent_email_prompt_not_now_at is
  'Timestamp of the most recent explicit "Not now" click on the parent-email prompt. NULL means never explicitly declined. Suppresses through the end of the calendar month this falls in.';
comment on column public.profiles.parent_email_prompt_not_now_count is
  'How many times "Not now" has been explicitly clicked on the parent-email prompt, ever. A second click in a genuinely later calendar month escalates to permanent (parent_email_prompt_dismissed_forever).';
comment on column public.profiles.parent_email_prompt_dismissed_forever is
  'Permanent opt-out of the parent-email dashboard prompt. Once true, nothing shows it again -- the way back is the existing Settings "Parent account" section, reachable regardless of this flag, not a toggle this column gates.';
