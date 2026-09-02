# `not_interested_reason` audit — 2026-09-02

Section 12.1 of the founder spec collects a reason when a student dismisses an opportunity
("not interested in topic," "too expensive," "no time," "location," "too competitive,"
"already applied," "other") and says plainly: **"Use this signal in recommendations."**
Re-derived independently rather than taken on report — oryn-a7's own "nothing reads this"
claims have been wrong twice tonight from mis-scoped greps.

**Verdict: it wasn't a false claim, it was true and unactioned — a real gap, now partly
closed.** The collection UI is real, complete, and correctly built. Nothing ever read the
reason. Three of the seven reasons are now wired into future matching, conservatively; the
other four are deliberately left alone, with the reasoning for each written down rather than
just skipped.

## What's actually in the data — established first, per the brief

`saved_opportunities.status` (enum: `saved` / `applied` / `not_interested`) — **live count: 4
rows total, all `status = 'saved'`. Zero rows have ever been `not_interested`.** Not a
sampling gap — every row in the table, checked directly. This is a genuinely different
finding from "collected but not read": nobody, real or QA, across all 11 pre-launch accounts,
has ever dismissed an opportunity at all. `not_interested_reason` has never held a real value
because the status that would prompt collecting one has never been set.

## Then every consumer, traced not assumed

Grepped for the literal column name (`not_interested_reason`, not just the broader
`not_interested` status) across the whole codebase: **three hits total** — the type
definition, the write path (`app/(app)/opportunities/actions.ts`, correctly `{ error }`-checked,
no silent-write risk), and one comment mentioning the column name. **No read, anywhere, before
this pass.** `lib/opportunities/matching.ts`'s `computeEligibility` reads the coarser `status`
(a `not_interested` opportunity is hard-excluded from resurfacing), but never the *reason* —
every one of the seven reasons was treated identically as "don't show this again," nothing
more.

**Confirmed there's exactly one computation site, not several to independently fix**: only
`lib/opportunities/persist-matches.ts` builds `StudentMatchProfile`/`OpportunityForMatching`
for real product use (a `scripts/qa-counselor-loop.ts` QA script is the only other
constructor). Every downstream reader — the Opportunities browse page, the detail page, the
dashboard preview, and Counselor Core (`lib/counselor/state.ts` reads `opportunity_matches`
directly, feeding the Advisor and weekly-plan generation from there) — reads the
already-computed `match_score`/`reason_codes` this one function writes. Fixing the
computation here reaches every consumer without separate wiring anywhere else.

## The collection UI — real, complete, correctly built

`features/opportunities/opportunity-card.tsx`'s `useNotInterestedReasons()` offers exactly
the spec's seven reasons (`not_interested_topic`, `too_expensive`, `no_time`, `location`,
`too_competitive`, `already_applied`, `other`), wired through a real dropdown
(`opportunity-actions.tsx`) into a checked write. This half of section 12.1 was never the
gap.

## Which of the seven should feed anything — decided per-reason, not as a block

**Built — three, each requiring 2+ separate dismissals sharing the same signal before doing
anything (see `AVOID_SIGNAL_MIN_OCCURRENCES` in matching.ts — the same "don't fabricate a
pattern from one data point" bar this codebase already applies to peer benchmarking, section
19's n≥100):**

- **`not_interested_topic`** — 2+ dismissals sharing a normalized field (the same
  normalization `computeRelevance` already uses for interest matching, so "computer_science"
  and "Computer Science" count as the same field) reduce relevance for future opportunities
  in that field.
- **`too_expensive`** — oryn-a7's own example. 2+ dismissals with a cost on file set a floor
  at the *cheapest* one still called too expensive; a future opportunity at or above that
  floor is penalized, below it isn't. The minimum, not an average — the most conservative
  honest read of a handful of data points.
- **`location`** — oryn-a7's other example. 2+ dismissals that were both reason=location and
  for an in-person opportunity not near the student flag future distant in-person
  opportunities (reusing `isNearStudent`, which already computes the opposite signal — a
  proximity *boost* — so this is the same notion of "far," not a second one). Online/hybrid
  opportunities are never touched by this signal, regardless of distance.

**All three are penalties, never exclusions, and always visible.** They reduce
`relevanceScore` by a fixed amount (never below the eligibility question — an opportunity
still shows, just ranks lower, the same relationship a plain `saved` bookmark already has to
a stronger match) and are named explicitly in `reason_codes` as `similar_to_dismissed`,
rendered as a real sentence on both the opportunity card and detail page. Section 62's
recommendation-explainability requirement applies to a penalty exactly as much as a boost —
nothing here moves a score invisibly.

**Deliberately not built, with the reasoning written into the code, not just this doc:**

- **`too_competitive`** — the one oryn-a7 flagged explicitly, and the reasoning holds up: this
  is a judgment about the *student*, not a property of the opportunity. Quietly serving
  easier opportunities to someone who dismisses hard ones is the opposite of what this
  product is for. Feeds nothing.
- **`no_time`** — checked the `opportunities` schema directly: there is no effort/hours/time-
  commitment column to filter against. The product's real answer to "no time" is already the
  separate weekly-time-budget system (sections 64/65), not a dismissal-reason inference that
  would have to guess effort from category or duration.
- **`already_applied`** — not a preference at all. Worth flagging precisely: `saved_opportunities.status`
  already has a dedicated `applied` value, so a student picking "not interested → already
  applied" is really trying to correct their status, not express a preference the matcher
  should learn from. Whether that dropdown option should instead just set `status: 'applied'`
  directly is a real, separate UX question — noted here, not decided or built.
- **`other`** — free text with no structured signal to act on.

## Gate

`npm run typecheck`, `npm run lint`, `npm test -- --run` (3545/3545, 252 files) all pass. 17
new tests on `computeAvoidSignals` and the avoid-penalty path in `computeOpportunityMatch`
(pure-function, synthetic fixtures — there is no live dismissal data to validate against yet,
named explicitly rather than glossed over), plus 2 on the new `similar_to_dismissed` reason
code.
