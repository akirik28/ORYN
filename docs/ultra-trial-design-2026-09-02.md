# Ultra trial — design, not built — 2026-09-02

Founder's own words, relayed by CEO: *"premium şeyinde ilk hafta bedava diycez, kartını
verene — sonra çıkabilir tabii, bi kere olacak şekilde"* — first week free for anyone who
provides a card, they can cancel, once per person.

**Hard boundary, stated first because it shapes everything below**: there is no payments
integration in this codebase, and building one — card capture, charge processing, webhooks —
is explicitly out of scope for this pass. That needs a real payment provider; a fake version
of it would be worse than none (AGENTS.md's own Rule 4). This document designs the trial
**state machine** — the part that is genuinely buildable today, where the card is one input
to it and everything else is ours. **Report only. Nothing below is built.**

Branch: `oryn/ultra-trial-design-2026-09-02`, off `f98f4743`. Read-only on live —
`plan_tier`/`notify_*`/`response_mode` were confirmed live via read-only `SELECT` during this
pass (the founder applied 0089/0090/0091 by hand while this was being written), nothing was
written.

## 1. States and transitions — `plan_tier` stays two values; trial is a separate, orthogonal fact

**Recommendation: do not add a third `plan_tier` value. Add two new nullable columns to
`profiles` and a small `resolveEffectiveTier()` function that wraps today's `resolvePlanTier`.**

The case for a third value (`'trial'`) is real — it would make "who's mid-trial right now"
a one-column, directly-indexable fact. But it loses on cost: `PlanTier` is read in ~20 files
today (`app/(app)/layout.tsx`'s `data-tier` stamp, `PlanTierView`'s comparison table,
`TIER_COMPARISON_ROWS`'s discriminated union, every `[data-tier="ultra"]` CSS selector,
`UltraAmbient`'s tier prop) — every one of them would need to learn a third state, and the
whole point of a trial is that it should **look and behave exactly like real Ultra**, not a
third visual tier. Widening the type multiplies decision surface for no product benefit.

Instead: `plan_tier`'s existing check constraint (`'standard'`, `'ultra'`) stays exactly as
is. Two new columns on `profiles`:

```sql
alter table public.profiles
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz;
```

Both nullable, both **written once and never cleared** — not on expiry, not on cancellation,
not ever, for the life of the row. That permanence is load-bearing for point 2 below, not an
oversight to "clean up" later.

A new function, `lib/tier/plan-tier.ts`, sits beside (not instead of) `resolvePlanTier`:

```ts
export function resolveEffectiveTier(
  profile: Pick<Profile, "plan_tier" | "trial_started_at" | "trial_ends_at">,
  referenceDate: Date = new Date()
): PlanTier {
  if (profile.plan_tier === "ultra") return "ultra";
  if (profile.trial_ends_at && referenceDate < new Date(profile.trial_ends_at)) return "ultra";
  return "standard";
}
```

Return type is still plain `PlanTier` — `'standard' | 'ultra'`, unchanged. Every one of the
~20 existing call sites needs exactly one change: call `resolveEffectiveTier` instead of
`resolvePlanTier`. Nothing about `data-tier`, the comparison table, or any CSS selector needs
to know a trial exists at all. `resolvePlanTier` itself stays as it is today — "what tier is
this account fundamentally on, ignoring time-bounded state" is still the right question for
anything that cares about the underlying subscription (billing, conversion reporting) rather
than the currently-rendered experience.

**Transitions**: `standard` (no trial fields set) → trial starts (`trial_started_at`/
`trial_ends_at` set, `plan_tier` stays `'standard'`, `resolveEffectiveTier` now returns
`'ultra'`) → one of two ends: expiry (`referenceDate` passes `trial_ends_at`,
`resolveEffectiveTier` reverts to `'standard'` on its own — see point 3, nothing writes
anything) or conversion (a payment-provider webhook, not built here, flips `plan_tier` to
`'ultra'` for real; trial columns are left untouched as permanent history).

## 2. "Once per person" — the account-level check is the easy 90%; the hard 10% needs the payment provider, and that boundary should be stated plainly, not implied

**A `trial_started_at IS NOT NULL` precondition on the same account is airtight, and cheap:**
the "start trial" write path (wherever it lands — a Server Action, not designed here since it
depends on the card-capture flow) refuses to set `trial_started_at` if it's already non-null.
Since both columns are permanent once set (point 1), there is no code path — cancel, expire,
anything — that clears them and reopens eligibility. This alone stops the simplest abuse: the
same signed-in account clicking "start trial" twice.

**It does not stop a second account.** Checked precisely rather than assumed: a student can
delete their account today (`deleteMyAccount`, `app/(app)/settings/actions.ts:321`), which
calls `admin.auth.admin.deleteUser()` — a genuine hard delete of the `auth.users` row, which
cascades to `profiles`. If the trial marker lived only on `profiles`, deleting the account
after a trial destroys the only record it ever happened, and Supabase Auth frees the email for
reuse the moment the row is gone — **"delete account, sign up again with the same email" would
get a second free trial**, today, with no new capability required. This is the concrete,
already-buildable version of the identity question, and it needs a fix regardless of whether
the harder "genuinely different email" version is ever solved.

**Recommendation: a second, small, append-only table that survives account deletion by
construction:**

```sql
create table public.ultra_trial_redemptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  email_normalized text not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index ultra_trial_redemptions_email_key on public.ultra_trial_redemptions (email_normalized);
```

**`on delete set null`, not `cascade` — the one detail that would silently defeat the entire
table if it were backwards.** The whole point of this table is to outlive the account it was
created for; a cascading FK would make it disappear exactly when it's needed, which is the
same class of mistake as the migration-header and stale-comment bugs found earlier tonight —
a mechanism that reads as protective but was never actually wired to survive the case it
exists for.

Two checks, two different costs, used at two different moments: `profiles.trial_started_at`
is the fast, single-row, read-every-render check `resolveEffectiveTier` uses (point 1);
`ultra_trial_redemptions`'s unique index on `email_normalized` is the slower, rare,
write-time-only check the "start trial" action makes before it's willing to set
`trial_started_at` at all — insert-and-catch-unique-violation, or a pre-check `select`, either
is fine, this is a low-frequency path.

**Where this still stops working, stated as plainly as point 5 asks**: a different email
defeats both checks completely. `email_normalized` prevents the free, zero-effort "delete and
resignup" loop; it does not prevent a student willing to use a second real email address. The
only signal that actually closes that gap in the real world is the payment instrument itself
— checking whether *this card* (via the payment provider's own customer/card-fingerprint
mechanism, not something this codebase can construct on its own) has already redeemed a trial,
independent of which account or email is attached to it. That check has no home in this
schema today and needs the payment provider to exist first. Worth naming, not silently
assumed away: this product is built for 14-18-year-olds, and device/IP fingerprinting — the
other common way products close this gap without a payment provider — sits uncomfortably
against AGENTS.md §12's "minimize data collection" for a case this narrow; better to accept
the honest gap than build a tracking mechanism disproportionate to the problem.

## 3. Expiry without a scheduled job — confirmed, using a stronger precedent already live in this codebase

**Read-time evaluation is right, and `resolveEffectiveTier` above already is one** — no
column anywhere gets flipped by a job at expiry; every read just compares `now()` to a stored
timestamp, so there is no "stale" state a late or unarmed cron could leave behind.

Confirmed against the closest real analogue in this codebase rather than asserted:
`lib/opportunities/lifecycle.ts`'s `isOpportunityActionable(opportunity, referenceDate =
new Date())` is a genuine access gate — not a display label — computed fresh from `(status,
cycle_status, deadline)` against a passed-in reference date on every single call, with no
stored "is this open" boolean anywhere for a job to maintain. It's the same shape proposed
above: an accessor function, a default `referenceDate = new Date()` parameter (which also
makes both functions trivially unit-testable against a fixed clock, the same pattern
`isOpportunityActionable`'s own tests already use), zero write path for the gate itself. The
reasoning holds because it's the same mechanism, not just a similar-sounding one.

One thing a job *would* still be useful for, and which this section deliberately does not
design: a day-6 reminder notification (point 4) has to be triggered by something that runs on
a schedule, because sending a message is an action, not a read — that's an ordinary job like
`lib/deadlines/scan.ts`'s existing reminder scan, not a gate, and being late by an hour costs
a slightly-late notification, not silently over-serving or under-serving access the way a
job-driven *expiry* would.

## 4. Day 6 and day 8 — no hard walls, using the precedent this codebase already ships

**Day 6 (one day before `trial_ends_at`)**: a heads-up, not a demand. `lib/tier/comparison.ts`
is the actual, honest source for what's ending — two `differs` rows today: `visualTheme` (the
flame skin, ambient effects) and `advisorAllowance` (a larger monthly AI token allowance;
`weeklyPlanFocus` is deliberately `sameByDesign` and doesn't need mentioning). A trial-ending
notice should name exactly those two, nothing invented. Mechanically this is a new
notification category through the existing pipeline (`lib/notifications/create.ts`), which
means — stated honestly rather than glossed over — its own small migration (an eighth
`notify_*`-style column or reuse of an existing category) and is not designed further here,
since CEO's ask was the trial mechanism, not the notification system.

**Day 8 (after `trial_ends_at`)**: `resolveEffectiveTier` returns `'standard'` on the very
next request — no explicit "revoke" step anywhere, nothing to schedule, nothing that can run
late. What that means concretely, surface by surface:

- **Visual skin**: reverts on next page load. `UltraAmbient` (`features/app-shell/
  ultra-ambient.tsx`) already only ever *sets* `data-tier="ultra"` for a real `'ultra'` value
  and deletes the attribute otherwise (its own comment: "absence is the cleaner signal") — a
  student who lets the trial lapse simply gets Standard's calm indigo back next time they load
  a page. No interstitial needed here; the product's own existing tone (this whole feature was
  built to *add* flourish, not to gate baseline usability) makes silence correct.
- **The plan page itself should not stay silent, though**: `PlanTierView` reads a plain `tier`
  prop today with no notion of trial state. The honest version says plainly "your trial ended
  on [date]" rather than just quietly reverting with no explanation anywhere — the same
  instinct that makes this codebase avoid every other silent-degrade shape found tonight.
  Not designing the exact copy here; flagging that the page needs to *know* trial state
  (pass `trial_ends_at` down, or a small derived `trialStatus` prop) to say anything honest
  about it at all, which today's `PlanTierView(tier)` signature can't.
- **Mid-conversation with the advisor, the case CEO named specifically**: nothing server-side
  needs to abort an in-flight generation — a request already accepted completes normally
  regardless of what tier resolves a moment later. The *next* message is a new request, and
  by then `resolveEffectiveTier` already answers `'standard'` — the advisor simply continues
  under Standard's own allowance from that message on. This composes with, rather than
  duplicates, a mechanism this codebase already has for a *different* reason:
  `lib/ai/monthly-quota.ts` already degrades a student from Sonnet to Haiku mid-month on
  quota exceedance rather than hard-blocking — confirmed by reading the file's own comments,
  not assumed from the name. Trial expiry reverting a student to Standard's smaller monthly
  allowance is the same shape of "the ceiling got lower" the quota system already handles
  gracefully; it does not need a second, trial-specific hard-stop invented alongside it.

## 5. The honest boundary — what's real today and what's a placeholder for a payment provider

Stated plainly, as its own section, so this document can't later be read as a finished spec:

**Buildable today, fully designed above**: the two `profiles` columns and their permanence
rule; `resolveEffectiveTier` and its read-time, job-free expiry; the `ultra_trial_redemptions`
table and its deletion-survival property; every UI surface's behavior at trial start, during,
and after expiry, including the specific mid-conversation case.

**Not buildable today, and nothing above should be mistaken for it**:
- **Card capture itself.** Nothing in this design specifies a form, a field, or a request to
  any payment API. "A card was provided" is treated throughout as an external signal that
  arrives from elsewhere — the trigger that calls the (not-designed) "start trial" action —
  never as something this schema captures or stores.
- **Charge processing and the actual conversion trigger.** `plan_tier` flipping to `'ultra'`
  for real is described above as a write a payment-provider webhook makes; no such webhook,
  or anything that calls it, exists.
- **Cancellation as its own event.** Deliberately not designed: this document's default is
  that canceling stops a future charge but does not need to shorten the trial below the
  promised seven days — access is purely `trial_ends_at`-driven either way, so "canceled"
  and "let it lapse naturally" look identical to this schema, and a `trial_canceled_at` column
  would have no writer today, which is exactly the "column exists, reads correct, is never
  written" shape this session has spent tonight finding and fixing elsewhere. Stated as a
  deliberate product assumption, not hidden: if the founder wants cancellation to cut access
  immediately rather than let the week run out, that changes this specific point and is a
  decision for them, not inferred here.
- **The real "once per person" guarantee.** Section 2's account/email-level checks close the
  free, zero-effort abuse path; they are explicitly not a substitute for a payment-instrument-
  level check, which is the only mechanism robust against a genuinely different email each
  time, and which needs the payment provider to exist before it can be designed, let alone
  built.

## What this pass did not do

Did not write a migration, a Server Action, or any UI code — report only, per the assignment.
Did not design the notification-category plumbing for the day-6 reminder (flagged in point 4
as its own small, separate piece). Did not decide trial length as anything other than the
founder's own stated "first week" (seven days) — `trial_ends_at = trial_started_at + interval
'7 days'` is assumed, not re-derived from anywhere else. Did not investigate whether Supabase
Auth's email-reuse-after-deletion behavior described in point 2 could itself be changed
(e.g., a cooldown before a deleted email becomes reusable) — noted as a possible alternative
or complementary mitigation, not evaluated, since `ultra_trial_redemptions` closes the same
gap without needing an auth-layer change.
