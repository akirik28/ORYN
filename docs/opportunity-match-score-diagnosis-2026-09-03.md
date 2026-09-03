# Opportunity match-score diagnosis — why the ranker gives Persona D a 91

Scope: **diagnose only — no scoring code touched.** Assigned after
[`docs/homepage-strip-top5-quality-2026-09-03.md`](homepage-strip-top5-quality-2026-09-03.md)
(a4) found Persona D (14yo, near-empty profile) getting the identical "Exceptional match", 91,
that a genuinely strong profile gets, on a record (Davidson Fellows) whose own description asks
for independent, exceptional work the student has no evidence of. This doc answers *why*, from
the real function's own numbers, not from reading the formula and guessing.

## Method

- **Personas A, B, D**: copied verbatim from [`scripts/qa-counselor-loop.ts`](../scripts/qa-counselor-loop.ts)
  (not exported there, so copied rather than imported — identical fixture data and helper
  functions). Each persona's `weakestDimensions` is derived from a real `computeCareerProfile()`
  run, exactly as that script and a4's own measurement do — not hand-picked.
- **Opportunities**: the real live catalogue (`oryn-qa-scratch`, `status = 'active'`, pulled
  read-only 2026-09-03, same day as a4's pull, a few hours later — small drift between the two
  pulls is possible and noted below where it matters).
- **Every number in this doc comes from calling the real, unmodified `computeCareerProfile`,
  `computeOpportunityMatch`, `computeEligibility`, `filterActionableOpportunities`,
  `isOpportunityRecommendable`, `competesInCoreRecommendations`** (all from `lib/opportunities/matching.ts`,
  `lib/opportunities/lifecycle.ts`, `lib/opportunities/commercial.ts`) in a scratch script,
  deleted before this push, same convention a4's own measurement used.
- **One honest gap**: my pull of the catalogue didn't include `selectivity_tier`, so
  `competesInCoreRecommendations` ran with that field null for every row. My gated total is
  256 of 366, against a4's 273 of 366 — a real discrepancy, most likely from this gap (a
  missing `selectivity_tier` can misclassify a couple dozen rows as pay-to-enroll that
  aren't). The findings below don't depend on the exact total lining up; every comparison
  is persona-vs-persona on the *same* gated set, computed in the same run.

## Finding 1 — the 91 is `relevance=100, need=85`, and `need` is a binary category flag, not a readiness check

Ran Persona D against the real Davidson Fellows record directly:

```
computeCareerProfile(Persona D):
  academics                score=  0
  leadership               score=  0
  research                 score=  0
  ...(6 more dimensions, all 0 except intellectual_curiosity=6, career_exploration=9)
weakest3 = [academics, leadership, research]

Davidson Fellows: category=scholarship, fields=[science,technology,engineering,mathematics,music,literature,philosophy]

computeOpportunityMatch result:
  eligible: true
  eligibilityNotes: "Restricted by country — add your country to check. Citizenship restriction
    on file (not automatically verified): U.S. citizens... Grade eligibility not verified yet..."
  relevanceScore: 100
  profileNeedScore: 85
  matchScore: 91
  matchedInterests: ["Engineering"]
  matchedGapDimensions: ["academics"]
```

`matchScore = clampScore(100 * 0.4 + 85 * 0.6) = 40 + 51 = 91`. Exact reproduction of a4's number,
from the real function.

**Where each half comes from:**

- **`relevanceScore = 100`** — Persona D's one stated interest, "Engineering", exact-matches one
  entry in Davidson's seven-field list. One-for-one overlap is a perfect relevance score by
  construction (`computeRelevance`'s formula is `matchedInterests / totalInterests * 100`) —
  correct on its own terms, and not the surprising half of this number.
- **`profileNeedScore = 85`** — this is the surprising half, and it comes from exactly two lines
  in `computeProfileNeed` (`lib/opportunities/matching.ts`):

  ```ts
  const relevantDimensions = CATEGORY_DIMENSIONS[opportunity.category] ?? [];
  const matchedDimensions = relevantDimensions.filter((d) => student.weakestDimensions.includes(d));
  return { score: matchedDimensions.length > 0 ? 85 : 45, matchedDimensions };
  ```

  `CATEGORY_DIMENSIONS.scholarship = ["academics"]`. Persona D's `academics` score is **0** — not
  low, the literal floor, meaning zero recorded evidence — and it's one of her three weakest
  dimensions by construction (nearly everything is 0). So `matchedDimensions = ["academics"]`,
  and the function returns its **maximum** possible value, 85, exactly as it would for a student
  whose academics score was 40 and merely happened to rank third-weakest.

**The mechanism, stated plainly: `profileNeedScore` is a two-valued flag — does this opportunity's
category broadly relate to one of your three weakest dimensions, yes or no — with no concept of
*how* weak, *how* prestigious/selective the opportunity is, or whether the specific opportunity's
own stated bar (Davidson: "largely independent work," `selectivity_tier: highly_selective`) has
any relationship to what the student has actually shown.** A profile with genuinely zero evidence
in a dimension scores the identical 85 as a profile with real-but-thin evidence there, on the
identical opportunity, provided both happen to rank it in their bottom three. Emptiness and
weakness are not distinguished, and nothing about the *opportunity's* own difficulty enters the
number at all — `selectivity_tier`, `description`, and any notion of "is this even remotely
reachable" are read by exactly zero lines of `computeOpportunityMatch`.

## Finding 2 — Persona A's `matchedGapDimensions` is empty because the category never maps there, not because nothing overlaps

Ran Persona A against four of her real top-5 (the fifth, MIT Battlecode, wasn't in the current
active catalogue — possibly deactivated or retitled since a4's pull; not chased further, out of
scope for a diagnosis):

```
weakest3 = [leadership, research, entrepreneurship]

CMIMC          category=competition  -> relevance=100 need=45 match=67  matchedGapDimensions=[]
IOI            category=competition  -> relevance=100 need=45 match=67  matchedGapDimensions=[]
IOAI           category=competition  -> relevance=100 need=45 match=67  matchedGapDimensions=[]
Conrad (Space  category=competition  -> relevance=100 need=45 match=67  matchedGapDimensions=[]
  Center Houston)
```

All four: `CATEGORY_DIMENSIONS.competition = ["awards_distinction", "academics"]`. Neither of
those two is in Persona A's weakest3. `matchedDimensions` is empty for every single one — not
because the *matching* is weak, but because **the category "competition" structurally can never
address leadership, research, or entrepreneurship**, regardless of which specific competition it
is or what skills it actually requires. `profileNeedScore` falls to the flat default (45) every
time, and the 67 shown is entirely `relevance * 0.4 = 40` plus that flat default `* 0.6 = 27` —
the "this addresses your gap" story a reason sentence might tell is never available for this
persona against this whole category, by construction of the category table, not by anything
particular to these five opportunities.

This is the same root shape as Finding 1 from the other side: `CATEGORY_DIMENSIONS` is a fixed,
coarse category→dimension lookup with 13 entries total, each category mapped to at most two
dimensions. It cannot express "this specific competition is actually strong on leadership" any
more than it can express "this specific scholarship requires more independence than a 14-year-old
has shown."

## Finding 3 — the eligibility funnel structurally rewards providing less identifying data, measured directly

Isolated the 29 (of 256 gated) rows carrying a real `eligible_countries` restriction, and ran
`computeEligibility` for all three personas against exactly that same 29-row set:

```
Persona A (country="Turkey"): excluded=26/29  unknown=1  passed-cleanly=2
Persona B (country="USA"):    excluded=29/29  unknown=0  passed-cleanly=0
Persona D (country=null):     excluded=0/29   unknown=24 passed-cleanly=5
```

A student who supplies a real country gets hard-excluded (`eligible: false`) from the large
majority of country-gated rows — every one of these 29 rows happens to name countries other than
Turkey or the USA, so both real-country personas fail almost everywhere a restriction exists at
all. A student with **no country on file gets excluded from none of them** — `computeEligibility`
can only exclude on a *known* mismatch; a null `student.country` can never produce
`countryNotEligible`, only the softer `countryUnknown` note, and `eligible` stays `true`.

Full-catalogue effect (same 256-row gated set, all filters combined):

```
Persona A: eligible = 229/256 (89.5%) -- 26 country exclusions + 1 age exclusion
Persona B: eligible = 226/256 (88.3%) -- 29 country exclusions + 1 age exclusion
Persona D: eligible = 237/256 (92.6%) -- 0 country exclusions + 19 age exclusions
```

**This is not a blanket "thin profiles are advantaged" — age cuts the other way, correctly.**
Persona D is genuinely 14, and she is hard-excluded by a real `minimum_age` far more often than
A or B (19 times vs. 1 each) — the age check is working as intended, penalizing her for a fact
that's actually on file. The advantage is specific to the *country* (and, by the same mechanism,
citizenship) axis: **the eligibility gate can only ever exclude on a fact it has; a student who
provides fewer facts is mathematically harder to exclude, on exactly the axes where she provided
nothing.** Her net eligible-fraction still ends up highest of the three because the country
advantage (26-29 rows saved) outweighs the age disadvantage (18-19 rows lost) on this catalogue —
a numerical coincidence of *this* catalogue's country-vs-age restriction mix, not a general law.

This is the same shape [[reference_grade_axis_no_confirmed_open_equivalent]] already named for
the grade axis specifically (no eligibility axis in this codebase has a way to say "confirmed
open" except country's own `country_eligibility_confirmed_open` flag) — Finding 3 shows it has a
second, sharper consequence beyond just "more caveats show": it changes which records a thin
profile is even allowed to compete for in the first place, before the score ever gets computed.

## What a fix would cost — not built, per instruction

Four candidate directions, roughly ordered by how contained the change is. None of these are
implemented; all are sketches of scope and risk, since `computeOpportunityMatch` feeds the
dashboard, Browse, the weekly plan, and the counselor, and a same-night change with the founder
away isn't being merged regardless of how it's scoped.

1. **Cap the tier/label, don't change the score.** Add a display-layer readiness gate — e.g.
   never render a confident tier label when `opportunity.selectivity_tier` is `highly_selective`
   or `elite` and the student's `matchedGapDimensions` dimension score is below some floor (0, or
   near it). Cheapest and lowest-risk: touches only rendering, not `matchScore` itself, so
   nothing that reads the stored number (weekly plan, counselor ranking) changes behavior. Does
   nothing for Finding 2 or 3, and doesn't fix the underlying number Browse still shows.
2. **Add a readiness factor to the score itself.** A third multiplicand alongside relevance/need
   — something like "does the student's evidence in the matched gap dimension clear a floor
   appropriate to the opportunity's own selectivity_tier." Directly addresses Finding 1's
   mechanism (stops rewarding zero evidence identically to thin evidence) but touches the stored
   `match_score` every downstream consumer reads — needs a version bump
   (`calculation_version`-equivalent) and re-validation against every persona/surface this
   already feeds, not a same-night change.
3. **Widen `CATEGORY_DIMENSIONS` or replace it with something opportunity-specific.** Addresses
   Finding 2 (a competition CAN plausibly connect to leadership/entrepreneurship depending on the
   actual competition) but has no cheap source of truth — would mean either hand-curating
   per-opportunity dimension tags at ingestion time (a real, ongoing data-entry cost, not a code
   change) or inferring them from `description`/`fields` text (a new, unvalidated heuristic with
   its own failure modes). Larger scope than either of the above.
4. **Give every eligibility axis a real tri-state (unknown / confirmed-open / confirmed-restricted)
   instead of relying on absence.** Addresses Finding 3 directly — a null `student.country`
   stops being indistinguishable from "we checked and it doesn't matter." Already half-built:
   country has `country_eligibility_confirmed_open`; citizenship, grade, and age don't have an
   equivalent. Schema change (new columns) plus a backfill/research pass, same shape as the
   163-record eligibility-signal gap already tracked in
   [`docs/opportunity-eligibility-signal-gap-2026-09-03.md`](opportunity-eligibility-signal-gap-2026-09-03.md)
   — likely the same underlying data-debt effort could close both.

None of these fix all three findings alone. (1) is display-only and available tonight if wanted;
(2)-(4) are scoring/schema changes that need daylight review.
