-- Dismissal state for the founder's full-screen upgrade interstitial (2026-09-04, relayed:
-- "hani mesela ilk açtığında her zaman çıksın, arada çıksın işte" -- shows on first session,
-- then periodically after). Own columns, not the advisor prompt's (migration 0093) or the
-- parent-email prompt's (0117) -- same reasoning both of those already established: one
-- dismissal must not silently suppress an unrelated prompt. Reuses the shared decay-clock
-- MECHANISM (computeSoftDismissUntil/computeNotNowUpdate, lib/advisor/upgrade-prompt.ts) via
-- lib/upgrade-interstitial/prompt.ts, not the storage.
--
-- Same four-column shape as 0093/0117 for the same reason theirs is that shape: a passive
-- close (7-day soft suppression) and an explicit "Not now" (escalating to permanent on a
-- second decline in a later month) are genuinely different signals with different
-- suppression lengths, and "how many times has this been explicitly declined" needs its own
-- counter to know when the second decline happens.
alter table public.profiles
  add column if not exists upgrade_interstitial_soft_dismissed_until timestamptz,
  add column if not exists upgrade_interstitial_not_now_at timestamptz,
  add column if not exists upgrade_interstitial_not_now_count integer not null default 0,
  add column if not exists upgrade_interstitial_dismissed_forever boolean not null default false;

comment on column public.profiles.upgrade_interstitial_soft_dismissed_until is
  'Passive dismiss (the top-right X) of the full-screen upgrade interstitial -- suppress until this instant. Null means no active soft suppression. Mirrors upgrade_prompt_soft_dismissed_until (0093) in shape, deliberately not shared with it.';
comment on column public.profiles.upgrade_interstitial_not_now_at is
  'Timestamp of the most recent explicit "Not now" on the full-screen interstitial. Null means never explicitly declined. Suppresses through the end of that calendar month.';
comment on column public.profiles.upgrade_interstitial_not_now_count is
  'How many times "Not now" has been explicitly clicked on the full-screen interstitial, ever.';
comment on column public.profiles.upgrade_interstitial_dismissed_forever is
  'Permanent. Once true, the full-screen interstitial never shows again -- the way back is /settings/plan, not a flag this column-set clears on its own.';

-- Not added to profiles_guard_protected_columns() (0062/0063, extended 0121): these four
-- columns have exactly one legitimate writer each, and it's always the row's own owner via
-- their own session (softDismissUpgradeInterstitial/notNowUpgradeInterstitial), the same
-- shape upgrade_prompt_* and parent_email_prompt_* already have and are correctly NOT
-- guarded for. A guard here would block the actual feature, not protect it -- the exact
-- distinction 0121's own header draws between plan_tier (single writer, already
-- service-role) and these dismissal columns (single writer, always the owner's own client).
