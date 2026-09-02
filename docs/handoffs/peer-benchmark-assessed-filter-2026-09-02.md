# Peer benchmarking: the assessed-evidence gap — 2026-09-02

Phase 19's floor (n≥100, never a tiny-sample percentile) is correctly enforced where CEO
asked to check — but a second, related gap existed alongside it: neither side of the
comparison filtered for whether a dimension was genuinely assessed at all. Confirmed and
fixed. No migration; entirely read-side, reusing existing evidence-state machinery.

## What was checked, and what was already correct

**The floor is enforced at the right granularity, not just defined.**
`evaluateBenchmarkDimension` (`lib/benchmarking/compute.ts`) gates on `peerScores.length <
MIN_COHORT_SIZE` — `peerScores` is the array for **one specific dimension**, not the
cohort's total headcount (`BenchmarkDimensionResult.cohortSize`'s own type comment already
documents this: "can be smaller than the cohort's total headcount"). A cohort of 3 total
peers, or a dimension only 3 of them have a score for, both correctly return
`percentile: null` — the naive "check the total, not the per-dimension pool" bug CEO named
as the usual failure shape does not exist here.

**A cohort of 0 is handled the same way, confirmed directly**: `getCohortDimensionScores`
returns an empty `Map` when the peer query finds nothing, `??  []` at the call site turns
that into an empty `peerScores` array, `0 < 100` is `percentile: null` — no special-casing
needed, the general rule already covers it.

**The `calculation_version` filter (this session's own prior fix) is present on both reads
this pipeline uses**: `getCohortDimensionScores`'s peer-score query and `getPeerBenchmarks`'
own-score query both still carry `.eq("calculation_version", CAREER_PROFILE_SCORE_VERSION)`
— re-confirmed by reading the current file, not assumed still there.

**The empty state is reachable and Phase-43-shaped, but its description read as a
fragment.** Confirmed live (`oryn.qa.b`, real account, real page) via `find` locating the
Turkish title in the actual rendered DOM — the message is genuinely reachable today, not
theoretical. But `notEnoughDescription`'s prior text — *"To show peer comparison
({cohort}, minimum {min})."* — doesn't parse as a complete sentence on its own; same issue
in the Turkish string, so it's a copy-design gap, not a translation one. Fixed in both
catalogs to a complete sentence that also states *why* (Phase 43's "explain, not just
decline"): *"Needs at least {min} comparable students ({cohort}) — showing a percentile
with fewer would be a guess, not a real comparison."*

## What was wrong: neither side filtered for evidence state

`profile_scores` gets a row for **every** dimension on every recompute, regardless of
whether there's any evidence (`lib/scoring/persist.ts`'s `recomputeCareerProfile` always
upserts all 9) — an unassessed dimension is `score: 0, confidence: 'low', reason_codes: []`
by construction, the exact "absence reported as a measurement" Phase 68 exists to forbid.
Neither query in the benchmarking path fetched `confidence`/`reason_codes` at all, so
neither side of the comparison could tell a genuine near-zero apart from "nothing
recorded":

- **My own side** (`lib/benchmarking/index.ts`): a student whose own `research` is
  `not_assessed` would still get a `research` entry in `results` (with `percentile: null`
  today, since no cohort reaches 100) — offering a benchmark for a signal Oryn doesn't
  have. Currently invisible in the UI (see below), but the underlying claim was wrong
  regardless of whether it's currently rendered.
- **The peer pool** (`lib/benchmarking/cohort.ts`): a peer's `not_assessed` row would be
  pooled into that dimension's peer-score array as a literal `0` — padding/skewing the
  distribution with a phantom near-zero that isn't a real signal about that peer's actual
  performance.

**Not currently visible in the UI, and it's worth being precise about why, rather than
calling this purely academic.** `features/profile/peer-benchmark.tsx` filters
`summary.results` to `percentile !== null` before rendering anything — with n=8 today,
every dimension (assessed or not) has `percentile: null`, so the component always falls
through to the single "not enough students" empty state regardless of this gap. The gap
becomes live and visibly wrong the day a cohort dimension's peer pool crosses 100 for the
**first** time — which, per this session's own prior finding on `calculation_version`, is
exactly the kind of threshold that's cheap to fix now and easy to forget once real growth
starts. Fixed now rather than deferred, same reasoning as the version-tracking gap.

**"overall" is deliberately exempt from this fix, on both sides.** `profile_strength_score`
is the one product-wide average across all 9 dimensions (`lib/scoring/index.ts`'s
`computeCareerProfile`) — the same number the dashboard's own headline shows, unchanged.
Filtering it specially for benchmarking would make "your overall" mean something different
here than everywhere else it's shown, a new inconsistency in exchange for closing this one.
Left alone.

## The fix

`lib/scoring/signal.ts`'s `isAssessed`/`evidenceStateFor` — the exact machinery already
used everywhere else this exact question is asked (the dashboard's gap cards, the MVP-16
profile-analysis count derived by hand earlier tonight) — reused directly, not
reimplemented, on both sides:

- `lib/benchmarking/cohort.ts`: peer `profile_scores` select widened to also fetch
  `confidence, reason_codes`; a peer's row is only pooled into a dimension's array when
  `isAssessed(evidenceStateFor(score, confidence, hasEvidence))` is true.
- `lib/benchmarking/index.ts`: own `profile_scores` select widened the same way;
  `myScoreByDimension` only includes a dimension when it clears the same check — a
  not_assessed/limited_evidence dimension is now **absent from `results` entirely**, not
  present with a null percentile. That distinction matters: "Oryn has no signal for you
  here" and "there aren't enough comparable peers yet" are different sentences, and before
  this fix they were indistinguishable in the data the UI receives.

12 new tests across two new test files (`__tests__/benchmarking/cohort.test.ts`,
`__tests__/benchmarking/index.test.ts`) — neither function had any test coverage before
this pass. Covers: assessed included, not_assessed excluded, limited_evidence excluded
(the more subtle case — has reason codes, still low confidence), mixed peers/dimensions,
and "overall" confirmed unaffected on both sides. 10 pre-existing tests in
`__tests__/benchmarking/compute.test.ts` untouched and still passing — this fix is
upstream of what that file tests, not a change to it.

## Verification

All 4 gates green: typecheck clean, lint clean, `check:i18n` 1325/1325 keys in sync on
both catalogs (edited existing values, added none), test 3992/3992 passed (271 files, up
from 3970/269 before this branch — 22 new tests), build succeeded.

Live-verified: logged in as `oryn.qa.b` (real account, not the founder's), confirmed the
"not enough comparable students" title is reachable in the live DOM via `find`. Did not
get a clean full-card screenshot (the Browser pane had some responsiveness friction
mid-session — scroll/zoom calls returning stale refs and timeouts) — treated the
reachability confirmation plus the exact message-catalog text as sufficient rather than
continuing to fight the pane, since the catalog text is authoritative regardless of exact
scroll position and the code-level verification (per-dimension threshold, cohort-0
handling, version filter) is independently conclusive either way.
