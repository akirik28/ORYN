-- Payment provider seam — 2026-09-04. NOT YET APPLIED, per this repo's own standing
-- discipline: the founder runs this by hand. Zero live writes were made producing this file.
--
-- CEO's brief: the founder is adding payment, provider not yet chosen (iyzico/PayTR/Stripe
-- all on the table) — build the whole flow for real behind an interface, so nothing gets
-- torn out once he picks one. This migration is the durable half of that: a payment_events
-- log that makes a webhook arriving twice safe, and a subscriptions table that is the
-- human-readable lifecycle record support/settings reads, distinct from the fast entitlement
-- check every Ultra-aware surface already makes (see profiles.paid_ultra_expires_at below).
--
-- Migration number 0123 assigned by CEO (0122 went to 48's modal work).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. profiles.paid_ultra_expires_at — the actual entitlement, checked at read time
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Deliberately NOT plan_tier itself. lib/tier/plan-tier.ts's resolvePlanTier has a hard,
-- correct rule for the admin path: `if (profile.plan_tier === "ultra") return "ultra"` —
-- no expiry check, because an admin's permanent grant must not silently lapse. If a payment
-- webhook also wrote plan_tier='ultra', a canceled or lapsed subscription would be exactly
-- as un-revocable as an admin grant, for the identical reason — that is the specific bug
-- CEO named ("plan_tier stays ultra forever") and the reason this is a new column, not a
-- write to the existing one.
--
-- Same mechanism as the already-shipped ultra_gift_expires_at (migration 0106), not a reuse
-- of it: the gift column has its own "once per person, forever" invariant (it goes
-- permanently non-null the moment a gift is used, and stays that way even after it expires,
-- per that column's own migration comment) — conflating a recurring paid subscription's
-- expiry with that invariant would corrupt it. A separate column keeps the two grants (one
-- irreversible one-time gift, one renewable recurring payment) independently readable and
-- independently expiring.
--
-- No cron needed, by design (CEO's own stated lean, "a job that fails silently grants free
-- Ultra indefinitely and nobody notices"): the webhook writes this forward by one billing
-- period on every successful charge (checkout_completed / subscription_renewed) and never
-- touches it on cancellation or a failed payment — access simply lapses on its own the
-- moment `now() > paid_ultra_expires_at`, the same self-expiring read lib/tier/plan-tier.ts
-- already does for the gift column, extended by one more line rather than redesigned.
alter table public.profiles
  add column if not exists paid_ultra_expires_at timestamptz;

comment on column public.profiles.paid_ultra_expires_at is
  'Read-time expiry for a PAID Ultra subscription, mirroring ultra_gift_expires_at''s
  mechanism but not its column (see this migration''s own header for why they must stay
  separate). Written only by the payment webhook handler (service-role, guarded below the
  same way plan_tier/ultra_gift_expires_at already are) on a successful charge. Cancellation
  and payment failure deliberately do NOT clear or rewind this column — the already-paid-for
  period runs out on its own; see subscriptions.status for the human-readable reason why a
  lapse happened.';

-- Redefines profiles_guard_protected_columns() a third time (0062 -> 0063 -> 0121 -> here),
-- same convention each time: fold the newly-added entitlement-bearing column into the
-- existing list rather than write a second guard function. Every column already listed is
-- carried forward unchanged.
create or replace function public.profiles_guard_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.is_admin := old.is_admin;
    new.profile_strength_score := old.profile_strength_score;
    new.completeness_percent := old.completeness_percent;
    new.plan_tier := old.plan_tier;
    new.ultra_gift_expires_at := old.ultra_gift_expires_at;
    new.account_role := old.account_role;
    new.paid_ultra_expires_at := old.paid_ultra_expires_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_00_guard_protected_columns on public.profiles;
create trigger profiles_00_guard_protected_columns
  before update of is_admin, profile_strength_score, completeness_percent, plan_tier, ultra_gift_expires_at, account_role, paid_ultra_expires_at on public.profiles
  for each row execute function public.profiles_guard_protected_columns();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. subscriptions — the human-readable lifecycle record, one row per user for its whole
--    lifetime
-- ═══════════════════════════════════════════════════════════════════════════
--
-- unique(user_id): a user holds at most one subscription, ever — the same "one caller, one
-- row, for the row's whole lifetime" shape parent_links already established (migration
-- 0116), not the shape university_profile_metrics has (no unique on (university_id,
-- metric_code), so the resolver picks arbitrarily between duplicate rows — the exact gap
-- named while this migration was being designed). Resubscribing after a cancellation UPDATEs
-- this same row (new provider_subscription_id if the provider issued a genuinely new one,
-- status back to 'active') rather than inserting a second one, so "which subscription is
-- current for this user" is never an ambiguous question.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_subscription_id text not null,
  status text not null check (status in ('active', 'past_due', 'canceled')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

comment on table public.subscriptions is
  'The lifecycle record a human reads (support, the settings/plan page: "renews March 5" /
  "payment failed, update your card") — NOT what lib/tier/plan-tier.ts''s resolvePlanTier
  reads on the hot entitlement path (that is profiles.paid_ultra_expires_at, kept in sync by
  the same webhook write that updates this row). One row per user for their whole lifecycle;
  see this table''s own unique(user_id) and the header comment above it for why a second row
  is never the right way to represent a resubscription.';
comment on column public.subscriptions.provider is
  'Which payment provider this subscription lives on (''stripe'' | ''iyzico'' | ''paytr'') —
  a plain text column, not an enum, because the actual provider is not chosen yet and an enum
  member cannot be added without its own migration; a check constraint would have the same
  problem. Validated in application code (lib/payments/provider.ts) instead.';
comment on column public.subscriptions.status is
  'active: paid and current. past_due: at least one charge failed but the already-paid-for
  period has not run out yet — read the SAME as active by anything gating a feature (nothing
  should special-case this), it exists purely so support/the settings page can tell the user
  their card needs attention before access actually lapses. canceled: the user (or the
  provider, after exhausting retries) ended it — access still continues until
  current_period_end, per profiles.paid_ultra_expires_at''s own comment; this column never
  gates entitlement by itself.';

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_provider_subscription_id_idx on public.subscriptions (provider, provider_subscription_id);

alter table public.subscriptions enable row level security;

-- A user may see their own subscription's state (needed to render "renews March 5" honestly)
-- — this is the only client access this table grants. No insert/update/delete policy for
-- `authenticated` at all, on either table in this migration: the entire write surface is
-- service-role, through the webhook handler, never the client — CEO's own words, and the
-- reason migration 0121 exists at all (a student self-granting plan_tier through a
-- column-unrestricted RLS policy). Getting this table's default posture right from its first
-- migration is cheaper than a second guard migration later.
create policy "user can view their own subscription"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid());

-- Defense in depth, not the primary boundary (RLS above already denies every authenticated
-- write on this table outright — there is no insert/update/delete policy to smuggle a change
-- through). This exists for the same reason 0121 redefines profiles_guard_protected_columns
-- instead of trusting the RLS policy shape to stay correct forever: if a future, legitimate-
-- looking policy change ever allows a user to touch their own row (e.g. a self-service
-- "cancel my subscription" button), this trigger is what stops that same UPDATE from also
-- smuggling status='active' or a pushed-out current_period_end in the same statement — the
-- exact "a user must never write their own subscription status" CEO asked for, enforced
-- somewhere that survives a future RLS policy mistake, not just today's absence of one.
create or replace function public.subscriptions_guard_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'service_role' then
    new.user_id := old.user_id;
    new.provider := old.provider;
    new.provider_subscription_id := old.provider_subscription_id;
    new.status := old.status;
    new.current_period_end := old.current_period_end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger subscriptions_00_guard_protected_columns
  before update on public.subscriptions
  for each row execute function public.subscriptions_guard_protected_columns();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. payment_events — append-only webhook log, and the actual idempotency guard
-- ═══════════════════════════════════════════════════════════════════════════
--
-- unique(provider, provider_event_id) is the real mechanism: the webhook handler inserts a
-- row here BEFORE doing anything else, and a unique-violation on that insert (Postgres
-- 23505) means this exact event was already processed — the handler returns 200 immediately
-- without ever reaching the entitlement-grant code, regardless of what the payload contains.
-- This is what makes "the same confirmation arriving twice" safe: the guard is a database
-- constraint the webhook handler cannot accidentally bypass by getting its own application
-- logic wrong, not an in-memory check or a re-derived condition.
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  kind text not null,
  payload jsonb not null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  processed_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

comment on table public.payment_events is
  'Append-only. Every webhook payload this app ever received from a payment provider,
  independent of whether it turned out to matter — the unique(provider, provider_event_id)
  constraint is the actual idempotency guard (see header above), and the full raw payload is
  kept so a support question ("why does this user show past_due") can be answered by reading
  what the provider actually sent, not by trusting a summary. subscription_id is nullable
  and ON DELETE SET NULL rather than cascade: this log must outlive the subscription row it
  was about, the same append-over-delete posture admin_action_log (migration 0097) already
  established for a different actor pair.';
comment on column public.payment_events.provider_event_id is
  'The provider''s own event/notification id (Stripe''s evt_... / iyzico''s / PayTR''s
  equivalent) — NOT this table''s own id column, and not derived from the payload''s content,
  because the guarantee this exists for is "the provider itself considers this one delivery
  attempt," which only the provider''s own id actually encodes.';

create index payment_events_subscription_id_idx on public.payment_events (subscription_id);

alter table public.payment_events enable row level security;

-- No policy at all, for any operation, for `authenticated` — this is an internal audit/
-- idempotency log a client never has a legitimate reason to read or write, the same posture
-- admin_action_log already has. RLS defaults to deny; service-role (the webhook handler,
-- and any future admin read for support purposes) bypasses RLS entirely, which is the
-- correct and sufficient access path here rather than a policy naming a role that never
-- needs one.

-- NOT YET RUN against any live database by this migration's author, per this repo's standing
-- "no writes to shared live state on your own authority" rule. See
-- supabase/tests/payment_provider_seam_manual.sql for the staged proof (idempotency actually
-- rejects a duplicate event id, the guard trigger actually restores a smuggled status change,
-- resolvePlanTier's new branch actually expires) — ready to run against a disposable branch,
-- not run here.
