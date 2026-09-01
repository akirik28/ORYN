# Minimum-age gate — design and reasoning

**Not legal advice.** The number and the design choices below are engineering's own
argument from `docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md` (the earlier
legal-framework research this session produced), not a lawyer's conclusion. Treat the
threshold as a provisional product default, reversible in one place
(`lib/legal/age-policy.ts`), pending review.

## What prompted this

Two things, found the same night:
1. There is no minimum-age gate anywhere at signup. Nothing checks age at registration.
2. `birth_year` is `NULL` on 7 of 11 live profiles. `isLikelyAdult()` (contact-info
   visibility) and opportunity-eligibility matching already treat a null value as a real,
   silent "unknown" — so this isn't a cosmetic gap, it's already changing what students see.

Given the research had already established that GDPR/UK GDPR Art. 8(2) impose a real
*"reasonable efforts to verify"* duty while COPPA's "actual knowledge" is a materially
weaker standard and Turkish KVKK has no age provision at all, the founder asked for the
gap closed rather than just documented further — with the actual threshold argued from
that research, not picked arbitrarily.

## Decision 1 — the number: 14

| Regime | What it sets |
|---|---|
| COPPA (US) | Flat line at 13 (`Child` = under 13, 16 CFR §312.2) |
| UK GDPR Art. 8(1) | Currently 13, movable to 13-16 by the Secretary of State without a new Act |
| EU GDPR Art. 8(1) | Each member state picks 13-16 — which one applies where Oryn actually contracts was not resolved by the research (lawyer question #4) |
| Turkish KVKK | No age set anywhere — statute text and two real Kurul kararları both checked directly |

No single number is provably safe against every EU member state's specific choice —
that would need the per-country research question #4 asks for, not something available
tonight. Two candidates were weighed instead of picking blind:

- **13** — the one number every regime *that has a number* agrees is at least the floor.
  Clears COPPA and the UK cleanly.
- **14** — one year above that floor, and matches what `AGENTS.md` already states as the
  product's target audience ("Students aged approximately 14–18"). Still clears COPPA and
  the UK, with a year of margin instead of sitting exactly on the line, and is the more
  conservative choice while the EU member-state question stays open.

Chose 14. It doesn't invent a new position for the product — it enforces the one already
stated — and errs conservative on the one point (EU) the research left unresolved,
consistent with this session's rule for the earlier legal doc: an accepted uncertainty
handled cautiously beats an invented certainty either way.

## Decision 2 — where the gate lives: onboarding, not the signup form

Considered adding a birth-year field to `SignUpSchema` itself, gating account creation
before any personal data is stored at all. Didn't do it, for a stated reason rather than
by default:

- `completeOnboarding()` already requires `birthYear` (a prior fix — see
  `__tests__/onboarding/birth-year-collection.test.ts`), and `app/(app)/layout.tsx`
  already refuses every route under it until `onboarding_completed`. Nothing downstream
  of onboarding is reachable without a birth year already being on file. Moving the
  question earlier closes no *additional* surface — it only moves which single request
  captures it.
- The founder explicitly named friction as a real cost, not a rounding error, for a
  signup funnel aimed at teenagers. Adding a field to the account-creation form is
  friction at the single highest-drop-off point in the flow; adding the same check to
  the very next mandatory step (which a visitor cannot avoid or skip past, per the
  layout gate above) is not measurably safer but is one more field on the harder page.

The policy check itself is deliberately **not** folded into `CompleteOnboardingSchema`'s
own `birthYear` bounds. That schema's existing bounds (`currentYear-100`..`currentYear-10`)
are a plausibility check with its own test coverage asserting the schema stays
permissive down to age 10 — a real, previously-deliberate separation between "is this a
plausible year" and "does the product's policy allow this age," which this change
preserves rather than collapses. The minimum-age check is a second, explicit step in
`completeOnboarding()` itself (`app/(onboarding)/onboarding/actions.ts`), using
`lib/legal/age-policy.ts`'s `meetsMinimumSignupAge()`, with its own message. Same shared
function backs a client-side pre-check in the wizard, for instant feedback — but the
server check is what actually enforces it; the client one is UX only.

## Decision 3 — the backfill: flag existing accounts, never auto-block them

Four accounts (of 11 total) completed onboarding before the birth-year requirement
existed and carry `birth_year = NULL` today. `app/(app)/layout.tsx` now redirects any
such account to `/confirm-age` — a single-field, non-skippable interstitial
(`app/(confirm-age)/`) that requires a value before anything else in the product is
reachable, mirroring exactly how the existing onboarding gate already works.

What that flow does **not** do: if the backfilled year reveals an age below
`MINIMUM_SIGNUP_AGE_YEARS`, it does not lock, delete, or otherwise restrict the account.
It records the fact (`logEvent(userId, "birth_year_backfill_below_minimum_age", { birthYear })`,
queryable in `product_events`) and lets the person continue. Reasoning:

- This is a materially different decision than refusing a brand-new signup.
  `completeOnboarding()`'s own check (Decision 2) can safely refuse a fresh account that
  hasn't been created yet. Retroactively locking or removing an *existing* account that
  has already been using the product, on the strength of a just-collected self-report, is
  a higher-stakes, harder-to-reverse action — exactly the kind of thing this session's own
  operating instructions say to pause on rather than decide unilaterally.
- Nothing in the codebase has a guardian-consent mechanism to act on this responsibly yet
  (the founder's own instruction for this task: don't build the parent-account concept).
  Blocking without an alternative path forward for a real, already-onboarded user would
  not be "capturing age safely" — it would be improvising an account-structure decision
  the lawyer hasn't reached yet.
- The same non-blocking flag was added to `updateBirthYear` (Settings) for consistency —
  it's the other place this field can be written, and a student correcting their own
  on-file value is the same kind of "existing account" case as the backfill, not a new
  signup.

This is a founder/legal decision waiting on data, not a decision made here. If any
`product_events` row with this event name ever appears, that's the trigger to have it.

## What was deliberately not touched

- **Full birth date.** The research found no source in any of the four jurisdictions
  requiring precision finer than year — see
  `docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md`'s lawyer question #9, which
  is exactly this question and remains open. Year-only stays the product's collection
  shape; this gate is built on top of that constraint, not around it.
- **A parent/guardian account type.** Out of scope by direct instruction. The research
  doc's own synthesis (question #10, and the "parent pays ≠ data consent" finding) is
  that this is a data-model decision, not a settled legal requirement — building it
  without that answer risks building the wrong shape.
- **The three accounts still stuck at `onboarding_completed = false`.** They are already
  fully blocked from every part of the product by the existing layout gate and will go
  through the (already-required) birth-year question if and when they complete
  onboarding. Nothing new was needed for them.

## What remains genuinely open

Everything already listed in `docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md`'s
question list still applies unchanged — this work implements a product default informed
by that research, it doesn't resolve any of its open legal questions. Two are most
directly relevant to what was actually built tonight:

- Question #4 (which EU member states, and which of their 13-16 choices, actually
  govern Oryn's users) directly determines whether 14 is high enough once Oryn has real
  EU users, or needs to move.
- Question #9 (is year-only precision sufficient everywhere, or does any regime need
  exact date-of-birth) directly determines whether this whole design survives contact
  with counsel unchanged, or needs a follow-up once birth date is collected instead of
  year.
