# Counselor Core — Technical Reference

As-built reference for the feature built on `oryn/counselor-core-v1` (off `main` @ `2b9796c`,
2026-08-19). For the reasoning/decision history, see `docs/counselor-core-plan.md` (written
first, before implementation) — this document describes what actually shipped, which refines a
few details from the plan as implementation surfaced them.

## Architecture

```
CounselorState (lib/counselor/state.ts, the only DB-touching file — RLS-scoped client only)
  |
  v
rankDimensionGaps        (lib/counselor/gaps.ts)        -> ProfileGap[]
generateCandidateActions (lib/counselor/candidates.ts)  -> CandidateAction[]
  |
  v
rankCandidates (lib/counselor/scoring.ts)
  - evaluateCandidateEligibility (lib/counselor/eligibility.ts) per candidate
  - centralized weights/thresholds (lib/counselor/config.ts)
  -> RankedCandidate[]
  |
  v
buildRecommendation (lib/counselor/evidence.ts) -> CounselorRecommendation[]
  |
  v
runCounselorPipeline (lib/counselor/pipeline.ts) -> CounselorResult   [pure, no DB, no LLM]
  |
  v (optional, additive)
explainCounselorRecommendations (lib/ai/counselor-explain.ts) -> narrated summary | null
```

`lib/counselor/index.ts`'s `getCounselorRecommendations(userId)` is the one public entry point
most callers should use — it wires `state.ts` to `pipeline.ts`. Everything from `gaps.ts` through
`pipeline.ts` is pure and network-free; the LLM is optional and additive, never a dependency.

## Student-state inputs (`lib/counselor/state.ts` -> `CounselorState`)

Extends `lib/ai/student-context.ts`'s `buildStudentAdvisorContext` (added `student.birthYear`,
top-level `interests[]`, and `id`/`universityId`/`programId` on each `targetUniversities` entry —
additive, existing Advisor/weekly-plan consumers unaffected) rather than adding a fourth
student-data aggregator. Also assembles: `dimensionScores` (from `profile_scores`, via
`toDimensionScoreRows`), `completenessChecklist` (`lib/scoring/completeness.ts`, reused),
`eligibleOpportunityMatches` (from `opportunity_matches` joined to `opportunities`, pre-filtered to
`eligible = true` and `verification_state = 'verified_current'`), `requirementCandidateInputs`
(evaluated via `lib/requirements/evaluate.ts` for every active target university's requirements,
reusing `assembleRequirementFacts` directly — does not write to `student_requirement_evaluations`,
that table backs a different UI).

**Known, deliberate inefficiency**: `assembleScoringFacts` is called twice per Counselor page load
(once inside `buildStudentAdvisorContext`, once directly here for the completeness checklist) — a
bounded, non-pathological duplicate query set, not restructured in this pass to keep the change to
`student-context.ts` additive. Documented in `state.ts`'s own doc comment.

## Profile-dimension taxonomy

Reused directly — `ProfileDimension` (`types/database.ts`), `lib/scoring/index.ts`'s
`DIMENSION_SCORERS` order, `lib/scoring/labels.ts`'s `DIMENSION_LABELS`. No second taxonomy.

## Gap model (`lib/counselor/gaps.ts`)

`rankDimensionGaps(scores: DimensionScoreRow[]): ProfileGap[]` — weakest first, deterministic
(stable sort, ties keep input order). Severity is a fixed threshold rule, never LLM-judged:

- `confidence === "low"` -> `insufficient_data` (never phrased as a weakness).
- `spreadFromStrongest >= 30` and `rank <= 2` -> `critical`.
- `spreadFromStrongest >= 15` -> `moderate`.
- else -> `minor`.

Replaces three previously-duplicated "weakest dimension" one-liners (`app/(app)/dashboard/page.tsx`,
`app/(app)/advisor/page.tsx`, `lib/opportunities/persist-matches.ts`) — now one function, one
source of truth. `toDimensionScoreRows` adapts a raw `profile_scores` row into the shape this
function needs.

## Candidate rules (`lib/counselor/candidates.ts`)

Three sources only, no others:

- **opportunity** — from `state.eligibleOpportunityMatches` (already `verified_current` +
  matching-eligible). `addressesDimensions` reused from `lib/opportunities/matching.ts`'s exported
  `CATEGORY_DIMENSIONS`.
- **requirement_action** — a `not_met` or evaluable `unknown` `university_requirements` row for an
  active (`exploring`/`target`/`applying`) target university. `needs_manual_review` and
  informational (`application_deadline`) rows never become candidates.
- **profile_task** — any incomplete item from `getCompletenessChecklist`.

Explicitly out of scope: "deepen an existing project" candidates (would require judging free-text
project state — left to the optional LLM layer's commentary, never a deterministic candidate).

## Eligibility policy (`lib/counselor/eligibility.ts`)

Three-state verdict: `known_eligible` / `known_ineligible` / `unknown`.

`known_ineligible` (hard exclusion, never ranked) when:
- `opportunity.verification_state !== "verified_current"` (defense-in-depth — `state.ts`'s query
  already filters this; this makes the invariant hold independent of the caller too).
- `opportunity.cycle_status` is `closed` / `historical` / `discontinued`.

`unknown` (included, flagged with a warning, confidence-penalized — never hard-excluded) when: an
age/country restriction exists but the student's corresponding fact isn't on file, or
`citizenship_restrictions` / `residency_restrictions` / `eligible_grades` is populated (free text /
un-computed grade level — Oryn doesn't parse or infer these).

**Why `unknown` isn't excluded** (Assumption A2, `docs/counselor-core-plan.md` §7): `eligible_countries`
is populated on 0/290 live opportunities today. A hard-exclude-on-unknown policy would zero out
every opportunity candidate for a reason unrelated to the student, not "a smaller honest set."

`requirement_action` and `profile_task` are always `known_eligible` — both are generated only from
the student's own already-active targets/profile.

## Ranking model (`lib/counselor/scoring.ts` + `config.ts`)

Opportunity score = weighted sum of `gapRelevance` (0.4, max matched-gap severity),
`fieldAlignment` (0.25, **reused** from `opportunity_matches.relevance_score` — matching.ts's
existing interest-overlap computation, never recomputed), `urgency` (0.15, deadline-proximity,
0 with no deadline), `dataQuality` (0.2, source confidence, penalized when eligibility is
`unknown`). `requirement_action`/`profile_task` use their own simpler formulas (see
`scoring.ts` doc comments) — a `not_met` requirement scores high regardless of profile-dimension
alignment; a `profile_task`'s score is `100 - completenessPercent`.

Redundancy decay (`REDUNDANCY_DECAY = 0.75`, reusing `lib/scoring/math.ts`'s diminishing-returns
shape): the 2nd+ candidate touching an already-seen dimension is discounted.

`recommendationClass` (productionizes the two previously-unused values of the existing
`recommendation_class` enum, per `docs/known-issues.md`'s documented gap):
- `do`: top 3 by score among candidates not already deprioritized (already capped by
  construction; `consider` is additionally capped at `MAX_CONSIDER_RECOMMENDATIONS = 5` in
  `pipeline.ts`).
- `deprioritize`: matched dimensions are *all* already strong (score >= 75), or score falls at/below
  `considerFloor = 25`.
- `avoid_for_now`: a `deprioritize`-eligible candidate whose matched dimensions are *exclusively*
  the single strongest dimension — capped at one across the whole result (matches the dashboard's
  existing single-slot UI).
- `consider`: everything else.

Bounded `impact`/`effort`/`urgency`/`confidence` (`low`/`medium`/`high`) are what reach the
student; `score`/`scoreBreakdown` are internal-only (debug/test).

## Evidence model (`lib/counselor/evidence.ts`)

`buildRecommendation` builds `why[]` from fixed templates parameterized by real data (matched gap
dimension + severity, or the requirement evaluator's own sourced `reasoning` string verbatim) —
never free LLM text. `warnings[]` comes from eligibility `unknown` notes. `evidence[]` carries only
structured provenance (source type/id/url/verification state), never raw description text.
`nextAction` routes to `/opportunities/[id]`, `/universities/[id]`, or `/profile`.

## LLM boundary (`lib/ai/counselor-explain.ts`)

The only file in Counselor Core that calls `getAIProvider()`. `buildCounselorExplanationPrompt` is
pure/synchronous — wraps every untrusted string (recommendation titles/why/warnings) in an explicit
`<data>...</data>` boundary; the system prompt states plainly that text inside those boundaries is
never an instruction. `explainCounselorRecommendations` always returns `null` on any failure (not
configured, provider error, malformed output after the provider's own built-in retry) rather than
throwing — never called by `pipeline.ts` itself, an explicit opt-in for a caller that wants
narration on top of the already-complete deterministic output.

## Failure behavior

- **Anthropic down**: `runCounselorPipeline` still returns full gaps + ranked recommendations +
  template `why` text — zero provider dependency (verified: `__tests__/counselor/contract.test.ts`'s
  "provider outage" contract test).
- **Advisor chat P0 fix** (migration `0046_advisor_message_failure_state.sql`): a failed AI reply
  now persists as an `advisor_messages` row with `status = 'failed'` + a safe `error_message`
  instead of writing nothing. `retryAdvisorMessage` re-runs generation against the exact prior
  history and updates that row in place. See `app/(app)/advisor/actions.ts`,
  `features/advisor/advisor-chat.tsx`.
- **Zero eligible recommendations**: an honest empty state (`features/advisor/counselor-priorities.tsx`),
  never fabricated filler.
- **`CounselorPriorities` itself**: wrapped in its own try/catch in `app/(app)/advisor/page.tsx` so
  an unexpected failure there can't take down the chat.

## Data-quality limitations (real, as of 2026-08-19 — re-measure before trusting)

- 290 opportunities total; **64 (22.1%) `verified_current`** — only these are ever recommended.
- **0/290** have `eligible_countries` populated (drove Assumption A2 above).
- Only **13/290** have a `deadline`.
- `university_requirements` coverage exists only for the 49 universities with program data (198
  `university_programs` rows) — most target universities will have zero `requirement_action`
  candidates today, not a bug.
- Consequence: for most students today, Counselor Core will surface **profile_task** candidates
  most reliably, a handful of opportunity candidates, and requirement_action candidates only for
  students targeting one of the 49 covered universities. This is correct, honest behavior given
  current data coverage — not something to work around by loosening verification/eligibility
  rules. Expanding opportunity/requirement data coverage is explicitly the next workstream (out of
  scope for this one, per the founder prompt's own §55/§56).

## Testing

`__tests__/counselor/{gaps,candidates,eligibility,scoring,evidence,pipeline,contract}.test.ts` +
`__tests__/ai/{counselor-explain,advisor-failure}.test.ts` — 100+ new tests, TDD'd (RED verified
before every GREEN). `__tests__/counselor/contract.test.ts` runs the three founder-specified
contract tests (spec §57-59) against the real, unmocked pipeline. `__tests__/stubs/mock-ai-provider.ts`
is the first mock `AIProvider` fixture in the repo. `__tests__/ai/digital-twin-boundaries.test.ts`
extended to cover `lib/counselor/state.ts`'s privacy boundary.

`state.ts`/`index.ts` (DB-touching orchestration) have no direct unit test — matches this repo's
existing convention (no Server Action or DB-boundary function anywhere else has one either);
covered by typecheck + (pending) live Browser QA.

## Known limitations (genuine, not hedging)

1. **Not live/browser QA'd.** This environment had a concurrent session already holding the only
   `next dev` lock the entire time; killing another session's dev server was judged too risky to
   do unilaterally. Everything above is verified by typecheck + full test suite + production build
   only. See the completion report for exact status.
2. **Anthropic is billing-blocked in this environment** (confirmed fresh via
   `npm run check:integrations` at doc time: `400, insufficient credit balance`) — the LLM
   narration layer (`counselor-explain.ts`) has never been exercised against a real model call,
   only against the mock provider. The deterministic pipeline does not depend on it.
3. **Migration `0046` is not applied to any live database** — same no-DDL-access constraint already
   documented for migration `0043`. Syntactically reviewed, pattern-consistent with `0043`/`0044`/
   `0045`'s own additive `ALTER TABLE`s, not live-tested.
4. **`assembleScoringFacts` is called twice per Counselor page load** (see Student-state inputs
   above) — bounded, documented, not fixed in this pass.
5. **No grade-level computation.** `eligible_grades` restrictions are always treated as `unknown`
   rather than resolved — Oryn doesn't derive a student's current grade from `graduation_year`
   anywhere in the codebase today.
6. **`recommendationClass` thresholds (`RANKING_THRESHOLDS`, `EFFORT_BY_CATEGORY`, etc., all in
   `lib/counselor/config.ts`) are product heuristics, not a validated model** — exactly as intended
   per spec §14, but worth remembering before treating any specific number as authoritative.

## Future work

- Wire `consider`/`deprioritize`/`avoid_for_now` persistence into `ai_recommendations` if a "don't
  re-show this specific rejection" history ever proves necessary (not needed today — candidates are
  recomputed fresh from live status on every read, so an acted-on item simply stops qualifying).
- Once migration `0043` is applied, `eligibility.ts`'s `verification_state` check and `state.ts`'s
  queries can key off `universities.duplicate_status` directly rather than depending on
  `canonicalUniversityId()` alone (already reused correctly, no change needed for correctness now).
- Expand opportunity/requirement verified-data coverage (separate workstream, out of scope here) —
  Counselor Core's output quality is bounded by it, not by anything in this codebase.
