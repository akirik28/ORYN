# Payment provider seam (2026-09-04)

Branch `oryn/payment-provider-seam-2026-09-04`, migration 0123, written by 11/cb
(same session, renamed mid-task by a fleet restart — see "A note on this session"
at the bottom). Report only in the sense that this doc exists in place of a
SendMessage report: the messaging tool disconnected partway through this task and
never came back, so this is the handoff that would otherwise have gone to CEO
directly. Everything below is real, committed, pushed, and green — **not
merged**, per standing discipline.

## What this is

CEO's brief: the founder is adding payment, provider not chosen yet (iyzico /
PayTR / Stripe all on the table). Build the whole flow for real, behind an
interface, so nothing gets torn out once he picks one. Today the only live
mechanism remains `registerUltraInterestAction` (an analytics event, no real
payment) — this branch does not turn that off or replace it; it builds the seam
alongside it.

## What's built

- **`lib/payments/provider.ts`** — the `PaymentProvider` interface, same shape and
  reason as `AIProvider`: `createCheckoutSession` (every candidate is a redirect-
  to-hosted-page flow, so this never sees a card number), `parseWebhookEvent`
  (returns the provider's own event id separately from the normalized event —
  the id is the actual idempotency key), `getSubscriptionStatus` (reconciliation
  only, never the entitlement source of truth).
- **Migration 0123** — `profiles.paid_ultra_expires_at` (the actual entitlement,
  read-time-checked, see below), `checkout_sessions` (bridges a checkout attempt
  to its user, since a webhook never carries this app's user id directly),
  `subscriptions` (the human-readable lifecycle record, `unique(user_id)`),
  `payment_events` (append-only, `unique(provider, provider_event_id)` is the
  actual idempotency guard). `profiles_guard_protected_columns` redefined a third
  time (0062→0063→0121→here) to fold in the new column in the same migration
  that creates it.
- **`lib/payments/checkout.ts`** — `startUltraCheckout`, called by both the plan
  page and the upgrade modal (one source, not three, per CEO). Price comes from
  `getFinanceSettings` — the same row 05's kumanda price work reads — never a
  parameter, never hardcoded.
- **`lib/payments/webhook-handler.ts`** — insert into `payment_events` first; a
  unique-violation on that insert IS the duplicate signal, checked before the
  entitlement path is ever reached. An unverifiable payload logs and returns 200
  (doesn't teach a prober which shapes get rejected); not-configured/user-
  unresolved return 5xx so the provider's own retry logic gets another chance.
- **`lib/payments/entitlement.ts`** — applies one already-deduped event.
  `checkout_completed`/`subscription_renewed` extend `paid_ultra_expires_at` with
  the **provider's own returned period end**, never computed locally.
  `subscription_canceled`/`payment_failed` touch `subscriptions.status` only.
  `refunded` is the actionable revocation lever (added after review, see below) —
  expires entitlement immediately rather than waiting for period end.
- **`app/(app)/settings/actions.ts`**'s `startUltraCheckoutAction` — the one
  Server Action both call sites use. Returns a result object, not a
  `redirect()` — the checkout URL is an external domain, and both call sites
  need their own transition UI.
- **`app/api/webhooks/payment/route.ts`** — reads the raw body text (never
  `.json()` — signature verification needs the exact signed bytes).
- **Tests**: `__tests__/payments/webhook-handler.test.ts` (11 tests) and
  `checkout.test.ts` (4 tests), against `FakePaymentProvider` (a real in-memory
  implementation, not a spy — the only way to exercise checkout → webhook →
  idempotent insert → grant without credentials, kept in `__tests__/` so it's
  structurally unreachable from production code).

## The design review, and why the shape isn't the first draft

Three rounds of review happened before and during the build (all from CEO, before
the messaging tool disconnected):

1. **Cancellation/revocation.** The obvious move — have the webhook write
   `plan_tier` directly — is wrong: `resolvePlanTier`'s `if (plan_tier ===
   "ultra") return "ultra"` has no expiry check, correctly, for an admin's
   permanent grant. Writing `plan_tier` from the payment path would make a
   canceled subscription exactly as un-revocable, through the same line. Fixed
   with a separate `paid_ultra_expires_at` column — same read-time-expiry
   mechanism as the existing `ultra_gift_expires_at`, deliberately not sharing
   that column (the gift column's permanently-non-null state after first use IS
   its own "once per person" record). No cron: access lapses on its own once
   nobody renews it further.
2. **The provider's own period end, not local arithmetic.** Proration, a
   retried renewal, a provider-specific grace window — all things only the
   provider knows. `PaymentWebhookEvent`'s grant-shaped variants carry `periodEnd`
   as a required field precisely so no adapter is tempted to compute it.
3. **A refund lever.** Cancellation alone has no way to claw back access before
   period end, which is right for a cancellation but wrong for a refund/
   chargeback. `refunded` is a distinct event kind that expires
   `paid_ultra_expires_at` to `now()` immediately.
4. **Per-user uniqueness + guard-from-day-one.** `subscriptions` gets
   `unique(user_id)` (one row per user's whole lifecycle, not a new row per
   resubscription — the `university_profile_metrics` duplicate-row gap was the
   cautionary precedent) and a defense-in-depth guard trigger alongside RLS's
   already-total denial of client writes, so a later, more permissive RLS policy
   (e.g. a future self-service cancel button) can't accidentally let a user
   smuggle a `status` change through the same statement.

## Bugs caught before they shipped

- **`git grep`'s treeish-prefix field shift** — unrelated tooling from earlier
  the same night, not this task, but the same session.
- **`.insert(...).select("id")` silently clobbering write-mode in the shared
  `__tests__/stubs/mock-supabase-table.ts` harness** — `select()` unconditionally
  reset `mode` back to `"select"`, which would have thrown away every insert this
  branch's own tests (and any future test using that exact chain) depended on.
  Fixed with a `hasWriteOp` flag; verified against this branch's own tests
  post-fix, and against the harness's two pre-existing consumers
  (`__tests__/parent/links.test.ts`, `__tests__/advisor/instructions-round-trip.test.ts`)
  to confirm the fix didn't change their behavior.
- **Idempotency proven both directions, not just asserted**: one test drops the
  mock's unique constraint and shows the exact same event granting twice; a
  separate check (`false &&` in front of the real `isUniqueViolation` call,
  reverted immediately after) confirmed the *actual* duplicate-detection test
  fails without the real guard — not just the dedicated drop-the-constraint
  proof test.
- **Two new `user_id` tables silently missing from the GDPR export-coverage
  tripwire** (`__tests__/export/tables.test.ts`) — `subscriptions` documented as
  real student data, excluded only until 0123 is applied (move it into
  `EXPORT_TABLES` then); `checkout_sessions` documented as permanently excluded
  (operational bridge, no content, same posture as `advisor_generation_locks`).

## What's NOT done (genuine gaps, not omissions)

- **No real provider adapter.** `getPaymentProvider()` returns `null` for every
  value of `PAYMENT_PROVIDER` today — the switch has no cases yet, by design
  (see that function's own comment). The founder hasn't chosen iyzico/PayTR/
  Stripe; building one of those adapters is real, provider-specific work this
  branch deliberately doesn't guess at.
- **48's modal and 05's plan-page CTA are not wired to `startUltraCheckoutAction`
  yet** — that coordination was in progress when messaging disconnected. The
  contract is stable (returns `{status: "ready", checkoutUrl} | {status:
  "not_configured"} | {status: "error", message}`; caller does
  `window.location.href` on "ready"), so either lane can wire against it without
  waiting on me, but nobody has confirmed they saw this.
- **No disposable-branch SQL proof of the migration itself** — the code-level
  idempotency proof (mock constraint dropped, double-grant observed, restored)
  is real and done; a live-Postgres proof of the actual `unique(provider,
  provider_event_id)` constraint and the `subscriptions_guard_protected_columns`
  trigger (both directions: a smuggled client write frozen, a service-role write
  still landing) was requested by CEO and not yet done — same "no live writes on
  my own authority" standing rule as every other unapplied migration this fleet
  has shipped tonight, and the Supabase MCP tools needed to spin up a disposable
  branch were not used this session.
- **`payment_events.payload`'s JSON shape** is the normalized `PaymentWebhookEvent`,
  not the provider's raw signed body — a deliberate choice (stated in
  `types/database.ts`'s own comment), flagged here in case CEO's intent was the
  raw payload for audit/replay purposes instead.

## A note on this session

This branch was built across a fleet restart. Before it: CEO was "oryn-45",
reachable via SendMessage, and every design decision above was reviewed and
approved by that session in real time. Partway through implementation the fleet
restarted — this session's own name changed (oryn-11 → oryn-cb), the peer roster
is entirely different names, and SendMessage itself stopped resolving (`ToolSearch`
finds no match) while `ListAgents` still works. Whoever picks this branch up:
the design was reviewed and approved before the restart; nothing below the
"design review" section above was decided unilaterally after messaging broke.
Rebased cleanly onto `origin/main` after the restart (one real conflict, in
`app/(app)/settings/plan/page.tsx`, from a concurrent finance-settings read
added by another lane — resolved by keeping both changes); full suite green
(6220 passed, 2 expected fail) at rebase time.
