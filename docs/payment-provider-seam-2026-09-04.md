# Payment provider seam (2026-09-04)

Branch `oryn/payment-provider-seam-2026-09-04`, migration 0123, written by 11/cb
(same session, renamed mid-task by a fleet restart — see "A note on this session"
at the bottom). Report only in the sense that this doc exists in place of a
SendMessage report: the messaging tool disconnected partway through this task and
never came back, so this is the handoff that would otherwise have gone to CEO
directly. Everything below is real, committed, pushed, and green — **not
merged**, per standing discipline (except the part CEO already merged as
`f192fd61` before assigning the next item below).

## Update: "connect B2's checkout button to B1" — already done, verified again

CEO's next assignment (received after `f192fd61` merged) asked for exactly the
integration already completed and confirmed included in that merge. Checked the
actual current `main` before doing anything, rather than assuming either way:
`app/(app)/upgrade-interstitial-actions.ts`'s `startUltraCheckoutAction` is the
real implementation on `main` right now, calling `lib/payments/checkout.ts`'s
`startUltraCheckout` — not the pre-fix stub. Its `not_configured` result is the
correct, honest state (no provider chosen yet, item A3), not a leftover
placeholder.

What genuinely was missing, and got added: no existing test called the real,
unmocked `startUltraCheckoutAction` — both UI surfaces' own tests mock that
function away entirely, proving how the UI reacts to a result, never that the
Server Action actually reaches the payments library with a real session and a
real request origin. Added `__tests__/upgrade-interstitial/checkout-action-wiring.test.ts`
(5 tests) and proved it red: reverted the function to the literal pre-fix stub,
watched all 5 fail with the exact expected shape, restored it, confirmed `git
diff` empty and all 5 green again. Also independently confirmed the "TR + EN"
half of the request: `checkoutNotConfigured` exists in both `messages/en.json`
and `messages/tr.json` at the same key, already true before this commit.

Full suite green: 6396 passed, 2 expected fail. Pushed.

**Status as of the second post-restart CEO check-in (oryn-5b, ~220 min after my
last push): still 0123, still unclaimed by anyone else** (confirmed —
`origin/main`'s migration files stop before 0123 and resume at 0124, gap
matches exactly). Rebased a third time onto `origin/main` (102 commits ahead at
that point; one real conflict, a doc-comment-only collision in the shared
`__tests__/stubs/mock-supabase-table.ts` with another lane's unrelated `.in()`
addition — both descriptions kept, both operations already coexisted in the
merged code). Full suite green after: **6366 passed, 2 expected fail.** Pushed.
`types/database.ts` conflict-free this time despite the heavy traffic CEO
warned about — no new call site needed a fix this round.

**Merged as `f192fd61`.** CEO's follow-up asked for one-line status plus three
specific claims verified precisely, since they determine the sentence told to
the founder. Re-checked all three against the actual merged code on `main`
(not memory, not this branch):

1. **Card details are never stored anywhere in this app** — confirmed. Grepped
   `origin/main`'s `lib/payments/` and `app/api/webhooks/` for every card-field
   name (`card_number`, `cvv`, `cvc`, `pan_number`, etc.): zero matches.
   `CreateCheckoutInput` (the only structure this app builds before redirecting
   to a provider) has exactly four fields — `userId`, `amountTry`,
   `idempotencyKey`, `returnUrl`/`cancelUrl` — no card field exists to check for
   in the first place, by construction, not by a filter that could be wrong.

2. **The same webhook twice does not open two subscriptions — but say precisely
   how this was proven, because it matters which layer.** Proven at the
   application/mock level: `payment_events.provider_event_id` is unique
   (`provider`, `provider_event_id`), the webhook handler inserts into that
   table *before* granting anything, and a real Postgres unique-violation on
   that insert is what returns "duplicate" rather than reaching the grant path.
   Two things were actually verified, not asserted: (a) a dedicated test drops
   the *mock's* unique constraint and shows the identical event granting
   twice — proving the guard is load-bearing, not decorative; (b) a separate
   check disabled the real `isUniqueViolation` branch in the actual handler
   code and confirmed the normal duplicate-detection test goes red with that
   removed, then restored it (`git diff` empty after). **What was NOT done:**
   the same proof against a real Postgres constraint, not a mock of one — that
   is exactly the disposable-branch verification CEO asked for and I asked the
   founder to cost-confirm ($0.01344/hr) before creating. Say "proven at the
   code/mock level, not yet against live Postgres" if precision matters here —
   it's very likely to hold (the mock enforces `unique(provider,
   provider_event_id)` identically to how migration 0123 declares the real
   one), but "very likely" and "proven on real Postgres" are different claims.

3. **Cancellation does not write to `plan_tier` directly — confirmed on the
   merged code.** `entitlement.ts`'s `subscription_canceled` case does exactly
   one write: `admin.from("subscriptions").update({ status: "canceled" })`.
   Neither `plan_tier` nor `paid_ultra_expires_at` is touched. The separate
   expiry column (`profiles.paid_ultra_expires_at`) is what actually carries
   entitlement, extended only on `checkout_completed`/`subscription_renewed`
   with the provider's own returned period end — cancellation lets that
   already-set date run out on its own rather than writing anything itself.
   This was the specific design fix from the review round before the restart
   (see "design review" section below): a payment-path write to `plan_tier`
   would have been silently absorbed by 0121's guard trigger exactly the way
   CEO described, which is why the entitlement path was built around a
   separate column instead of that guarded one.

**One-line status: functionally complete except for two things, both already
named, neither a surprise.** (a) The actual provider adapter — A3, the
founder's choice, nothing to build until it's made. (b) The live-Postgres
proof of migration 0123's own guards (item 2 above) — a disposable-branch
question asked of the founder directly, awaiting a yes/no on the ~$0.01344/hr
cost, not a technical blocker.

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

## Update, same session: the real integration point, found and fixed

**48's modal was never actually unwired — I had built the checkout logic in the
wrong file.** 48's already-merged upgrade-interstitial work (migration 0124)
had built BOTH real call sites (the full-screen modal,
`features/settings/plan-tier-view.tsx`) against a same-named
`startUltraCheckoutAction` stub in `app/(app)/upgrade-interstitial-actions.ts`,
with its own comment explicitly anticipating this exact swap: *"the only change
needed once 11's real action lands is this function's own body, not either
caller."* I had instead added a second, same-named export in
`app/(app)/settings/actions.ts` — never called by anything, not a conflicting
implementation, just dead code sharing a name with the real integration point.

Found this by checking, not assuming, after CEO (post-restart, now "oryn-5b")
asked directly whether B2's checkout-interface assumption matched mine. Fixed:
deleted the unused `settings/actions.ts` version, wired
`upgrade-interstitial-actions.ts`'s real body to call
`lib/payments/checkout.ts`'s `startUltraCheckout`, and collapsed the two
independently-declared-but-identical `StartCheckoutResult` types into one
canonical declaration. Neither real caller (`upgrade-interstitial-mount.tsx`,
`plan-tier-view.tsx`) needed a single line changed — confirmed by
`__tests__/settings/plan-tier-view.test.tsx` (which mocks this exact function
expecting exactly this contract) passing unmodified. Full suite green after:
6269 passed, 2 expected fail.

**Both real UI surfaces are now genuinely wired to the real checkout logic** —
this was the one gap flagged below as "not wired yet" in the original version
of this doc; it's closed.

## What's NOT done (genuine gaps, not omissions)

- **No real provider adapter.** `getPaymentProvider()` returns `null` for every
  value of `PAYMENT_PROVIDER` today — the switch has no cases yet, by design
  (see that function's own comment). The founder hasn't chosen iyzico/PayTR/
  Stripe; building one of those adapters is real, provider-specific work this
  branch deliberately doesn't guess at.
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
is entirely different names, and SendMessage itself stopped resolving
(`ToolSearch` finds no match) while `ListAgents` still works and inbound
cross-session messages still arrive. Whoever picks this branch up: the design
in the "design review" section above was reviewed and approved before the
restart; nothing there was decided unilaterally after messaging broke.

Post-restart CEO is "oryn-5b." They independently re-confirmed this branch and
migration 0123 are correctly assigned here — an earlier message misattributed
an unrelated legal-research task to this session based on a stale sidebar
title, caught and corrected by oryn-5b's own transcript search rather than by
me contradicting it — and separately asked whether B2 (the modal, migration
0124) had coordinated with me on the checkout interface shape. That question is
what surfaced the dead-code/wrong-file issue described above. I have not been
able to reply and confirm any of this landed, since SendMessage is still
unavailable to me specifically; this doc is the report in its place.

Rebased twice onto `origin/main` as it moved during this task (one real
conflict both times: first in `app/(app)/settings/plan/page.tsx` against a
concurrent finance-settings read, second time clean). Full suite green
throughout — 6269 passed, 2 expected fail, as of the integration fix above.
