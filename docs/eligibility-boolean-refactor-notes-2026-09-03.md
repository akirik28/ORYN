# The `eligible` boolean can't represent "nobody looked" — a design note, not a change

Written down per CEO's explicit instruction while building the age/grade-unverified note
fix: "that is the real defect underneath... it deserves daylight and the founder's attention
rather than a 2am change to what students get shown." Nothing here is implemented.

## The actual shape of the problem

`computeEligibility`/`evaluateOpportunityEligibility` both return a two-state `eligible:
boolean` (or `known_eligible`/`known_ineligible`/`unknown` in the counselor's richer
version) plus a separate `notes`/`warnings` side-channel for caveats. The boolean itself can
only ever be `true` unless a *known* mismatch fires an early return — every unresolved case,
however incomplete the underlying data, collapses into the same `true` the fully-verified
case gets. `notes` is genuinely rendered (confirmed live in this same package:
`opportunity-card.tsx`, `counselor-priorities.tsx`), so a student *can* see the caveat — but
only if whatever renders `eligible` also faithfully checks `notes` every single time. Nothing
enforces that pairing; it is a convention two components currently honor, not a type-level
guarantee.

## Where a three-state value would actually change behavior, not just naming

- `opportunity_matches.eligible` (a real, persisted boolean column) — `previouslyEligibleIds`
  and "eligible = true" filtering in `persist-matches.ts` treat verified and unverified rows
  identically today. A caller filtering `WHERE eligible = true` for a batch job, a
  notification, or a future surface that doesn't happen to also read `eligibility_notes`
  would silently inherit the same gap this package just fixed for the two surfaces that
  currently *do* check notes.
- The advisor's ranked top-3 (`rankCandidates`) and the dashboard's `thisWeekActions` — both
  currently rank an `unknown`-verdict opportunity alongside genuinely `known_eligible` ones
  at the SAME tier, distinguished only by whether the caller also surfaces `notes`/`warnings`.
  A three-state value would let ranking itself treat "verified" and "unverified" as
  different confidence tiers, not just different badge text on an otherwise-identical rank.
- The "previously eligible" resurfacing logic (`persist-matches.ts:356-358`) — currently a
  row that flips from `unverified-but-true` to `verified-true` (someone finally researches
  the age bound) looks *identical* to a row that was already confidently eligible, so a
  student gets no "this just got confirmed for you" signal a three-state transition could
  support later.

## What I would build, if asked

1. Replace `eligible: boolean` with a closed three-value type (`"eligible" |
   "ineligible" | "unverified"`) in `EligibilityResult`/`OpportunityMatchResult`, at both
   call sites (`lib/opportunities/matching.ts`, `lib/counselor/eligibility.ts`) — one
   PR, both move together, exactly like this package's two-file note fix did.
2. Migrate `opportunity_matches.eligible` from `boolean` to the same three-value enum (a
   real schema migration — written and left unapplied per this project's own migration
   discipline, with a data backfill note: every existing `true` row with a non-null
   `eligibility_notes` was actually `unverified`, not `eligible`, and that backfill needs
   its own audit before running, not an assumption baked into the migration).
3. Update every reader: `persist-matches.ts`'s filters, `rankCandidates`/`thisWeekActions`'s
   tie-breaking, `opportunity-card.tsx`/`counselor-priorities.tsx`'s render conditions, and
   any admin/analytics query that currently does `WHERE eligible = true` or `.filter(m =>
   m.eligible)` — a grep-and-verify pass per call site, not a global find-replace, since a
   few of these (e.g. `savedStatus === "applied"`/`"not_interested"`) are genuinely binary
   and should stay that way.
4. Decide, explicitly, what "unverified" means for each of those call sites — the README
   answer is not "always block" or "always show": a batch email digest might reasonably
   exclude `unverified` rows (never alarm a family about an opportunity nobody's confirmed
   is age-appropriate), while Browse might reasonably keep showing them with the caveat it
   already does today (a 14-year-old browsing casually is a different risk profile from one
   being pushed a notification).

## What I would NOT do without explicit sign-off

Ship the schema migration applied, or change any UI's *default* filtering behavior — both are
exactly the kind of "changes what students get shown" decision this note exists to route to
the founder rather than make unilaterally at 2am.
