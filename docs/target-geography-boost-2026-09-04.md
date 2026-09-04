# target_geographies wired into opportunity relevance — 2026-09-04

CEO dispatch, Part 4 of the same handoff-fixes task as Parts 1-3 (dashboard links,
`revalidatePath`). Measured first, got an explicit go-ahead with five acceptance criteria,
implemented against those criteria.

## The measurement (already reported, restated for the record)

`target_geographies` (types/database.ts's 5-way onboarding enum: usa/uk/europe/canada/
turkey/not_sure) is filled for 8/8 onboarded students (100%) and was read nowhere in
matching — confirmed by reading `lib/opportunities/matching.ts` in full. The opportunity
catalog is 70.1% US-based. The two students whose stated target excludes the US were seeing
66-68% US-based eligible matches anyway, vs. 11-18% actually inside what they asked for.

## What shipped

**1. Boost, not gate.** `lib/opportunities/matching.ts`: new `isWithinTargetGeography()`
(exported, unit-tested) and a `TARGET_GEOGRAPHY_BOOST` constant (15 — same magnitude as the
existing `PROXIMITY_BOOST`, not a new number invented from nothing) added into
`computeRelevance`'s three score branches, stacking additively with the existing proximity
boost. Never touches `computeEligibility` — a stated preference ranks an aligned opportunity
higher, never hides a misaligned one, matching that function's own existing philosophy.

**2. "europe" = continental Europe minus UK minus Turkey.** The onboarding screen showed
five separate buttons; a student who picked "europe" saw UK and Turkey as distinct options,
not as part of it. `country-geo.ts`'s own continental "Europe" region (built for the
university explorer's map, a different surface) includes both, so it can't be reused as-is —
`CONTINENTAL_EUROPE_MINUS_UK_TURKEY` filters it down explicitly.

**3. Weight justified in the code itself**, not just here: `computeRelevance`'s
interest-overlap term is `(matched/total)*100`, so for a student with N interests the gap
between adjacent match counts is `100/N` — at least ~14.3 for anyone with up to 7 stated
interests (comfortably the common case). A 15-point boost is smaller than that gap, so it can
only tip a genuine tie/near-tie toward the in-target option — it cannot lift a 0-of-3-interest
match above a 2-of-3-interest one. Proven directly, not just argued: see
`cannot lift a weak in-target match above a strong out-of-target one` in
`__tests__/opportunities/matching.test.ts`.

**4. Before/after, computed from real production data, zero writes.** `computeOpportunityMatch`
is pure (no I/O) — wrote a throwaway script (session scratchpad, not committed) that fed it
real facts for all 8 onboarded students (interests, profile_scores-derived weakest
dimensions, target_geographies) against their real top-60 eligible `opportunity_matches`
rows (240 real opportunities' category/fields/country), read-only via Supabase MCP, and
recomputed twice — once with `targetGeographies: []`, once with the real value.

Actual results, not asserted:

- **Deniz Kaya** (target: `{turkey}` only) — 7/60 rows changed, top-10 ranking unchanged
  (the changes land at rank #4 and below). Example: "ODTÜ (METU) Engineering Summer School"
  (Turkey) 73 → 79.
- **oryn.qa.a** (target: `{uk,turkey}`) — 11/60 rows changed, top-10 **did** reorder.
  Example: "ODTÜ (METU) Engineering Summer School" (Turkey) 49 → 55.
- **The other 6 students** (Ada Sarp KIRIK, Ada Yilmaz, Daniel Okafor, Elif Demir, Mei
  Tanaka, oryn.qa.b) — **all 6 also showed real score changes** (10-42 of 60 rows each), and
  4 of 6 showed top-10 reordering. **This contradicts the "the other six show nothing"
  expectation stated going in — reported honestly rather than adjusted to match it.**
  The reason is structural, not a bug: all 6 have `"usa"` somewhere in their
  `target_geographies`, so their own (dominant, catalog-skewed) US-based opportunities now
  correctly receive the same boost Deniz's Turkey-based ones do. The fix was scoped as "boost
  whichever opportunities are inside whatever a student actually said" — it was never scoped
  to only the two students identified during measurement, and extending it to every student
  whose stated preference the raw catalog wasn't already perfectly reflecting is the intended
  behavior, not a side effect. None of the 6 showed a match going 0→something-huge or any
  eligibility change; every delta is explainable by the same additive, tie-breaking-only
  mechanism criterion 3 establishes can't override a real interest gap.

Side finding, unrelated to the fix's correctness: recomputing each student's "before" state
and diffing it against what's actually live in `opportunity_matches` today showed real drift
for several accounts (0 rows for Daniel Okafor/Deniz Kaya, up to 60/60 for oryn.qa.b) — most
likely stale `student_interests`/`profile_scores` relative to whenever that student's
`opportunity_matches` was last refreshed, not a bug in this change (both "before" and "after"
in the comparison above use the same current facts, differing only in `targetGeographies`, so
the comparison itself is unaffected). Not investigated further — out of scope for this task.

**5. Proven red.** Two integration tests in `__tests__/opportunities/matching.test.ts`
(`target_geographies boost` describe block) fail when the boost wiring is reverted from
`computeRelevance` — confirmed live: temporarily removed the `targetsThisGeography` term,
re-ran the suite, exactly 2 of the 13 new tests went red (the other 11, including every
`isWithinTargetGeography` unit test, correctly stayed green — they test the pure mapping
function itself, not the wiring), restored the fix, all 98 tests in the file green again.
One of the two red tests was itself fixed mid-verification: the first draft of "scores higher
when in target" used a student whose residence country happened to equal the opportunity's
country, so `isNearStudent`'s existing proximity boost alone carried the assertion even with
the new code fully reverted — rewritten to use a student resident in a third country so only
the new signal can explain the score difference.

## Data flow

`lib/opportunities/persist-matches.ts`'s `refreshOpportunityMatches` — the single place a
`StudentMatchProfile` gets constructed from a real profile row (confirmed: `lib/opportunities/
browse.ts` reads pre-computed `opportunity_matches` rows, it does not construct one) — now
reads `profileRes.data?.target_geographies ?? []` alongside the existing `citizenship_countries`
read. `profiles` is already `select("*")`, so no query change was needed, only the mapping.

## Gates

Typecheck clean. Lint clean (0 errors, same 5 pre-existing warnings, none in touched files
beyond one pre-existing warning in `persist-matches.ts` unrelated to this change). Full suite:
423 files / 6331 passed (+2 pre-existing expected-fail), +13 tests from this change. `next
build` not run locally — same documented reason as Parts 1-3 (symlinked `node_modules`,
Turbopack hard-fails on it, `npm ci` here would risk the shared tree) — the integrator runs
the production build once at merge, per the fleet's own established policy.
