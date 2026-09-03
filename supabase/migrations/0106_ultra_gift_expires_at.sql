-- Redefines migration 0104's ultra_gift_granted_at into ultra_gift_expires_at -- safe as a
-- plain rename because 0104 has never been applied to a live database (this project's own
-- write-then-leave-unapplied discipline), so there is no existing row's value whose meaning
-- would silently change underneath it.
--
-- Why the meaning has to change, not just the name: 0104 computed a gift's expiry as
-- granted_at + a hardcoded ULTRA_GIFT_DURATION_DAYS constant. Migration 0105
-- (admin_product_settings.trial_period_days) makes that duration admin-configurable --
-- and resolvePlanTier (lib/tier/plan-tier.ts) is a synchronous function with roughly thirty
-- call sites across this app, none of which have a settings read threaded through them, so
-- it cannot become "async, fetch trial_period_days, then compare" without a much larger and
-- unasked-for change. Storing the already-computed expiry instead keeps resolvePlanTier
-- exactly as simple and synchronous as it already was -- it only ever needs today's date and
-- this one column, never today's configured trial length. The settings table is read
-- exactly once per grant, inside grantUltraGift, at the one moment a duration actually needs
-- deciding -- not on every tier check across the app.
--
-- This also fixes the product behavior, not just the architecture: a trial-length change now
-- only affects gifts granted after it, never retroactively shortens or lengthens a gift
-- already promised to a student mid-week. Storing granted_at + a mutable global constant
-- would have gotten that wrong by construction.
--
-- "Once per person" is unaffected by the rename -- still enforced by this column never being
-- cleared once set, forever, independent of whether the stored moment is in the past
-- (expired) or the future (active).
alter table public.profiles rename column ultra_gift_granted_at to ultra_gift_expires_at;

comment on column public.profiles.ultra_gift_expires_at is
  'Migration 0106 (renamed+redefined from 0104''s ultra_gift_granted_at), written not applied — when this student''s one-time 7-day-by-default Ultra gift stops being active, or null if never granted. Never cleared once set: this is the "once per person" record (lib/tier/plan-tier.ts''s resolvePlanTier reads it directly, comparing against now()), not a flag that resets when the gift lapses. An absent/unreadable value reads as "never granted," same convention as plan_tier/response_mode elsewhere on this table.';
