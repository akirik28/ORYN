# Counselor Core — Architecture Plan

Status: pre-implementation plan, written 2026-08-19 after a full repo/data audit (four parallel
research passes: docs/blockers, Advisor+AI provider code, scoring/plan/gap logic, opportunity+
university schema). Supersedes nothing — this is new. Executed against branch
`oryn/counselor-core-v1` off `main` @ `2b9796c`.

## 0. Verified current state (do not re-trust old numbers without re-checking)

Re-measured via docs (themselves dated 2026-08-19, "measured live") rather than assumed from the
prompt that requested this build — several assumed numbers were stale or need correction:

| Fact | Verified value |
|---|---|
| Universities | 1,019 raw rows / 1,010 canonical (9 duplicate pairs pending migration 0043) |
| `university_programs` | 198 rows, 100% `verification_state='verified_current'`, covering 49/1,010 universities |
| Opportunities | 290 total. **64 (22.1%) `verification_state='verified_current'`**, 1 verified_historical, 225 unverified |
| Opportunity `eligible_countries` populated | **0/290 (0%)** |
| Opportunity `deadline` populated | 13/290 |
| Migration 0043 (university duplicate supersession) | File exists, additive, **not applied live** (no DDL access this environment) — app-layer workaround (`lib/universities/canonical.ts`) is the real mechanism today |
| Anthropic | Blocked — HTTP 400, insufficient credit balance (billing, not missing key) |
| Tavily | Blocked — HTTP 432, plan usage limit |
| Highest migration | `0045_opportunity_online_program_category.sql` → next unambiguous number is **0046** |
| `npm run lint/typecheck/test/build` | All green at last integration (884/884 tests, 79 files) |
| CI | `.github/workflows/ci.yml` runs lint→typecheck→test→build on push/PR, no external secrets |

**Product/data-quality implication:** with 0% of opportunities carrying `eligible_countries` and
only 22% verified, an honest recommendation engine will surface a *small* set for most students.
That is correct behavior per the founder spec ("a smaller recommendation set backed by real
evidence is better than a large one filled with assumptions"), not a bug to work around by loosening
the verification/eligibility bar.

## 1. What already exists (reuse, do not rebuild)

Discovered via code, not docs — this materially changes scope from a from-scratch build to an
orchestration-and-consolidation job:

- **Deterministic 9-dimension scoring** — `lib/scoring/`, `career_profile_v1`, fully tested,
  reason-coded, versioned (`profile_scores`, `profile_score_snapshots`). No AI in the math.
- **Profile completeness** — `lib/scoring/completeness.ts`, already correctly separated from
  profile strength (Phase 67), 15-item checklist.
- **Student context aggregator** — `lib/ai/student-context.ts`'s `buildStudentAdvisorContext()`.
  Reuses `assembleScoringFacts` + `computeCareerProfile`; already assembles scores, activities,
  projects, research, awards, sports, goals, target universities, upcoming deadlines, recent
  recommendation titles, recent action outcomes, pending application requirements.
- **Deterministic opportunity matching** — `lib/opportunities/matching.ts` /
  `persist-matches.ts`. Already computes `eligible` (hard age/country gate, unknown never
  disqualifies), `relevanceScore`, `profileNeedScore`, `matchScore` as **separate inspectable
  numbers**, writes to `opportunity_matches`. This is the existing precedent for "not one opaque
  score" and V1's eligibility policy (unknown ≠ ineligible) — Counselor Core's eligibility model
  extends this pattern rather than inventing a new one.
- **Deterministic requirement evaluation** — `lib/requirements/evaluate.ts`, five-status model
  (`met/likely_met/not_met/unknown/needs_manual_review`), AI never asserts eligibility, only
  structures admin-sourced text before this function compares it.
- **Admission outlook** — `lib/admissions/outlook.ts`/`explain.ts`, `admission_model_v1`,
  transparent heuristic, always a wide range, confidence capped at medium — precedent for how
  this codebase presents uncertainty honestly.
- **Recommendation taxonomy already in schema** — `recommendation_class` enum
  (`do/consider/deprioritize/avoid_for_now`) and `ai_recommendations` table
  (`0010_planning.sql`) already exist. **Only `do` (implicit, top of weekly plan) and
  `avoid_for_now` are ever produced today** (`docs/known-issues.md`, confirmed in code —
  `lib/plan/persist.ts:95-104`). Counselor Core should populate `consider`/`deprioritize`
  properly rather than add a second taxonomy.
- **Weekly plan / `ai_recommendations` / `saved_opportunities` / `target_universities` /
  `applications`** — all schema and RLS already correct and owner-scoped.

## 2. What's broken or missing (the actual Counselor Core work)

1. **Gap detection is duplicated three ways, none shared, none severity-aware:**
   `app/(app)/dashboard/page.tsx:57`, `app/(app)/advisor/page.tsx:35` (`biggestGap`, bottom-1 of
   `profile_scores`), and `lib/opportunities/persist-matches.ts:28-31` (`weakestDimensions`,
   bottom-3). Same computation, three copies, no severity/confidence/context.
2. **Weekly plan generation has zero deterministic fallback.** `lib/ai/weekly-plan.ts` sends the
   full prompt-formatted context to Claude and lets it freely invent 1-3 actions. If Anthropic is
   down (it currently is), the student gets nothing — not even the gap/candidate data that's
   already computable without any AI call. Violates the explicit requirement that Counselor
   intelligence must survive an LLM outage.
3. **Opportunity matching never checks `saved_opportunities`.** A `not_interested` or `applied`
   opportunity can resurface at the top of ranked matches indefinitely
   (`lib/opportunities/persist-matches.ts`, confirmed no join). Concrete, live instance of exactly
   the "don't re-recommend acted-on items" failure this build must prevent everywhere else.
4. **Advisor P0: failed AI reply loses all trace.** `app/(app)/advisor/actions.ts:64-85` — the
   user's message insert and the assistant-reply generation are two independent, un-transactioned
   steps. On failure: no row is written for the assistant turn, `advisor_messages.role` has no
   `'failed'` state (enum is `user|assistant` only), the only error signal is transient React
   state that vanishes on reload. Confirmed both in code and via a prior live QA session
   (`docs/handoffs/claude-a-to-claude-b.md`, flagged 2026-08-18, never fixed).
5. **`effort_estimate` on `opportunity_matches` is schema-present but hardcoded `null`**
   everywhere it's written. **`opportunity_matches` has no urgency/confidence dimension** despite
   the founder spec calling for both.
6. **No test scaffolding exists for the AI-call path.** `__tests__/ai/` has exactly one file, an
   architectural (source-string) test. No mock `AIProvider` fixture exists anywhere in the repo.

## 3. Reusable-vs-new decision (per module)

| Concern | Decision |
|---|---|
| Student state | **Extend** `buildStudentAdvisorContext`, do not add a 4th aggregator. Add the two fields it's missing that Counselor needs: `student.birthYear` (age-based eligibility) and `interests: string[]` (from `student_interests`, currently only read ad hoc by `persist-matches.ts`). Add `id`/`universityId`/`programId` to each `targetUniversities` entry so requirement-driven candidates can cross-reference. Additive only — existing consumers (advisor prompt, weekly-plan prompt) unaffected. |
| Profile dimensions | **Reuse as-is.** `ProfileDimension` type, `DIMENSION_SCORERS` order, `lib/scoring/labels.ts`. No new taxonomy. |
| Gap detection | **New, consolidating.** `lib/counselor/gaps.ts` replaces the three duplicated one-liners. |
| Opportunity candidates | **Fix and reuse** `lib/opportunities/matching.ts` / `persist-matches.ts` (saved-opportunity filter, verification-state awareness) rather than reimplementing opportunity ranking inside `lib/counselor/`. Counselor's candidate layer *reads* `opportunity_matches`, it doesn't recompute opportunity scoring itself. |
| University/requirement candidates | **New, reusing** `lib/requirements/evaluate.ts` + `lib/requirements/facts.ts` against each active `target_universities` row. |
| Profile-completion candidates | **New, reusing** `lib/scoring/completeness.ts`'s `getCompletenessChecklist`. |
| Eligibility | **New, generalizing** the KNOWN_INELIGIBLE / KNOWN_ELIGIBLE / UNKNOWN pattern already proven in `matching.ts`'s `computeEligibility`. |
| Scoring/ranking | **New**, `lib/counselor/scoring.ts` + `lib/counselor/config.ts` (centralized weights), reusing `lib/scoring/math.ts`'s diminishing-returns style for redundancy penalties. |
| Recommendation persistence | **Reuse `ai_recommendations`/`recommendation_class`.** No new table. Recommendations are computed on read (same "recompute on read" convention as `lib/admissions` and `lib/requirements/facts.ts`), not persisted as a new domain object — an acted-on item simply stops being a candidate next time because its source status (`saved_opportunities`, `weekly_actions`, `target_universities`) changed, not because of a "shown history" table. |
| LLM explanation | **New**, `lib/ai/counselor-explain.ts`, additive/optional layer behind the existing `AIProvider` interface. Core recommendations render fully without it. |
| Advisor failure state | **New migration required** (see §11) — no existing column can represent "this turn failed," and encoding it into `content` would be exactly the kind of fake-data shortcut the spec forbids. |

## 4. Student-state model (Phase B)

`lib/counselor/state.ts`:

```ts
export interface CounselorState {
  advisor: StudentAdvisorContext;   // from buildStudentAdvisorContext, extended per §3
  dimensionScores: DimensionScoreRow[]; // profile_scores rows: dimension, score, confidence, reason_codes.
                                         // Authoritative for gap ranking (matches dashboard/advisor-page/
                                         // persist-matches.ts convention of reading the persisted table).
                                         // advisor.profileScores (live-recomputed by buildStudentAdvisorContext)
                                         // is used only for prompt-text formatting continuity — never for
                                         // ranking, so the two can never disagree about *decisions*, only
                                         // (rarely, momentarily) about displayed prompt text vs. persisted score.
  targetUniversityDetails: TargetUniversityDetail[]; // id, universityId, programId, status, outlook
  requirementEvaluations: Map<string /*target_university_id*/, RequirementEvaluationSummary[]>;
  completenessChecklist: CompletenessChecklistItem[];
  savedOpportunityStatusByOpportunityId: Map<string, SavedOpportunityStatus>;
}

export async function getCounselorState(userId: string): Promise<CounselorState>
```

Single DB-fetching boundary function; everything downstream (`gaps.ts`, `candidates.ts`,
`eligibility.ts`, `scoring.ts`) takes plain `CounselorState`/sub-slices as input and is pure —
testable with fixtures, zero network, mirrors the existing `ScoringFacts` → `computeCareerProfile`
split.

**Fact / inference / unknown**, applied concretely (not just prose): every `DimensionScoreRow`
already carries `confidence` (`high|medium|low`, from the scoring engine itself, never invented
here). A dimension score is treated as:
- **FACT-grounded** when `confidence = "high"` — gap language may state it plainly.
- **INFERENCE** when `confidence = "medium"` — gap language must hedge ("appears to be a gap
  based on limited data").
- **UNKNOWN-bounded** when `confidence = "low"` — never phrased as a weakness; phrased as "Oryn
  doesn't have enough information about {dimension} yet," with a profile-completion candidate
  ranked above any judgment-based one.

## 5. Gap model (Phase D)

`lib/counselor/gaps.ts`:

```ts
export type GapSeverity = "critical" | "moderate" | "minor" | "insufficient_data";

export interface ProfileGap {
  dimension: ProfileDimension;
  score: number;
  confidence: DataConfidence;
  severity: GapSeverity;
  rank: number;              // 1 = weakest
  spreadFromStrongest: number; // strongest dimension's score minus this one
  reasonCodes: ReasonCode[]; // straight from profile_scores.reason_codes, never re-derived
}

export function rankDimensionGaps(scores: DimensionScoreRow[]): ProfileGap[]
```

Severity rule (documented, not LLM-judged):
- `confidence = "low"` → `insufficient_data`, regardless of score.
- Else `spreadFromStrongest >= 30` and `rank <= 2` → `critical`.
- Else `spreadFromStrongest >= 15` → `moderate`.
- Else → `minor`.

This single function replaces:
- `app/(app)/dashboard/page.tsx:57` (`biggestGap` = `rankDimensionGaps(scores)[0]`)
- `app/(app)/advisor/page.tsx:35` (same)
- `lib/opportunities/persist-matches.ts:28-31` (`weakestDimensions` = first 3 `.dimension`s)

**Contextual severity** (spec §11 — grade 9 vs. grade 12 with the same raw gap): rather than
inventing a second "adjusted severity" number (which would be exactly the kind of ungrounded
precision the spec warns against), context is surfaced *alongside* severity, not baked into it —
`CounselorRecommendation.why` (§7) references graduation year / time-to-application explicitly
when relevant ("with N years before graduation, this is worth addressing early" /
"with limited time before applications, prioritize breadth over starting something new") rather
than silently changing a score.

**Requirement/admissions boundary (spec §10):** `ProfileGap` never claims a university
"requires" anything. A gap is always phrased as a Counselor profile-development observation.
Only `lib/requirements/evaluate.ts` output (sourced, per-university) is allowed to say
"met/not_met" against an actual requirement — kept in a separate `RequirementEvaluationSummary`
type, never merged into `ProfileGap`.

## 6. Candidate model (Phase E)

`lib/counselor/candidates.ts`, three sources, one union type:

```ts
export type CandidateSource =
  | { kind: "opportunity"; opportunityId: string }
  | { kind: "requirement_action"; universityId: string; requirementId: string; status: RequirementEvaluationStatus }
  | { kind: "profile_task"; checklistLabel: string };

export interface CandidateAction {
  source: CandidateSource;
  title: string;
  category: string;
  addressesDimensions: ProfileDimension[];
  verification: { state: string | null; sourceUrl: string | null } | null; // null for profile_task (n/a)
  deadline: { date: string; sourceLabel: string } | null;
  costKnown: boolean;
  raw: OpportunityRow | RequirementRow | null; // for eligibility/scoring, never surfaced directly to the LLM as free text
}

export function generateCandidateActions(state: CounselorState): CandidateAction[]
```

- **Opportunities**: read from `opportunity_matches` joined to `opportunities`, filtered to
  `eligible = true` and `opportunities.verification_state = 'verified_current'`. Unverified/
  historical opportunities are **excluded from Counselor Core entirely in V1** (not surfaced even
  as "needs verification") — see Assumption A1 below.
- **Requirement actions**: for each active (`exploring/target/applying`) target university, run
  `evaluateRequirement` (already-evaluated `student_requirement_evaluations` rows if fresh, else
  compute) over that university's `university_requirements`; any `not_met` becomes a candidate
  ("Address: {requirement.title}"), `unknown` with an evaluable rule kind becomes a lower-priority
  candidate ("Add {missing fact} so Oryn can check this requirement"). `needs_manual_review` and
  informational (`application_deadline`) rows are never turned into candidates — they're not
  actionable by Oryn.
- **Profile tasks**: every `done: false` item from `getCompletenessChecklist` becomes a candidate,
  `category = "profile_completion"`.

**Explicitly out of scope for V1** (documented, not silently dropped): "deepen an existing
project/activity" candidates (e.g. "write your research conclusion"). Generating those requires
judging free-text project state in a way that risks inventing next steps not grounded in stored
data. Left to the optional LLM narrative layer (§9) as commentary, never as a deterministic
candidate with its own ranking.

## 7. Eligibility policy (Phase F)

`lib/counselor/eligibility.ts`, generalizing `matching.ts`'s existing pattern:

```ts
export type EligibilityVerdict = "known_eligible" | "known_ineligible" | "unknown";
export interface EligibilityResult { verdict: EligibilityVerdict; notes: string[] }
export function evaluateCandidateEligibility(candidate: CandidateAction, state: CounselorState): EligibilityResult
```

Per-field, not all-or-nothing: each hard constraint (age, country, already-acted-on) is checked
independently; a candidate is `known_ineligible` if **any** constraint is explicitly violated by
known data, `known_eligible` only if **every applicable** constraint is explicitly satisfied,
else `unknown`.

Already-acted-on is a **hard** `known_ineligible`, not merely deprioritized:
- opportunity: `saved_opportunities.status IN ('applied','not_interested')` for that id.
- requirement_action: the underlying `application_requirements` row (if any) already `completed`.
- profile_task: checklist item already `done` (can't happen — task wasn't generated — kept as a
  defensive check, not a real path).

`known_ineligible` → hard-excluded, never ranked, never shown (spec §13/§37 invariant).
`known_eligible` → ranked normally.
`unknown` → **included, not excluded** (Assumption A2 below), shown with an explicit
`"Eligibility not fully verified"` warning and a confidence penalty in ranking — never labeled
or counted as eligible.

### Assumption A1 — unverified opportunities are fully excluded, not surfaced as "needs verification"

Spec §12 allows either. With only 64/290 opportunities `verified_current`, showing the other 226
as a separate "needs verification" bucket would make Counselor Core's most-visible surface mostly
unverified content, undermining trust in exactly the feature meant to build it. V1 excludes them
outright. Revisit once opportunity verification coverage is materially higher (tracked as
follow-up, not blocking).

### Assumption A2 — unknown country/age eligibility is shown-with-warning, not hard-excluded

Spec §13 requires picking one and documenting it. With `eligible_countries` populated on **0%**
of opportunities, a hard-exclude-on-unknown policy would zero out every opportunity candidate
unconditionally, regardless of how well-matched or well-verified it is — not "a smaller honest
set," but an empty, useless one, for a reason (missing metadata) that has nothing to do with the
student. Per-candidate hard exclusion still applies wherever data explicitly rules a student out;
only the *absence* of eligibility data results in a flagged inclusion rather than a silent removal.

## 8. Ranking / scoring model (Phase G)

`lib/counselor/config.ts` — centralized, documented weights (no magic numbers elsewhere):

```ts
export const COUNSELOR_SCORE_VERSION = "counselor_ranking_v1";
export const WEIGHTS = {
  gapRelevance: 0.40,   // does this address a critical/moderate gap dimension
  fieldAlignment: 0.25, // interest/goal overlap (reuses matching.ts's overlap logic, generalized)
  urgency: 0.15,        // deadline proximity, 0 if no deadline
  dataQuality: 0.20,    // verification_state + eligibility knownness + source data_confidence
} as const;

export const EFFORT_BY_CATEGORY: Record<string, "low" | "medium" | "high"> = { /* profile_completion: low; competition/scholarship: medium; summer_program/fellowship/research: high; ... documented table, not inline literals */ };
```

`lib/counselor/scoring.ts`:

```ts
export interface RankedCandidate {
  candidate: CandidateAction;
  eligibility: EligibilityResult;
  matchedGaps: ProfileGap[];
  score: number;               // internal only
  scoreBreakdown: Record<keyof typeof WEIGHTS, number>; // internal only, never shown raw to student
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  recommendationClass: RecommendationClass; // do | consider | deprioritize | avoid_for_now
}

export function rankCandidates(candidates: CandidateAction[], gaps: ProfileGap[], state: CounselorState): RankedCandidate[]
```

- Redundancy penalty: reuses `lib/scoring/math.ts`'s diminishing-returns shape — the 2nd+
  candidate addressing the same single dimension is discounted, so three near-identical
  competitions don't crowd out a research or profile-completion candidate (spec §45 diversity).
- `recommendationClass` assignment (deterministic, documented — no LLM judgment call here):
  - `known_ineligible` never reaches this function (already filtered in §7).
  - Top 3 by score, where `gapRelevance` targets a `critical`/`moderate` gap → `do`.
  - Score above a floor but not top-3, or targets only a `minor` gap → `consider`.
  - Targets a dimension where the *student's own score is already ≥ 75* and the candidate's
    `profileNeed`-equivalent contribution is low → `deprioritize`.
  - A `deprioritize` candidate whose category the student has ≥2 existing strong entries in for
    that same dimension → escalated to `avoid_for_now` (the one explicit "don't do this," capped
    at one, matching the dashboard's existing single-slot UI).
- Bounded categories only reach the UI (`impact`/`effort`/`urgency`/`confidence` as
  low/medium/high) — `score`/`scoreBreakdown` stay internal (debug/test use only), per the
  non-negotiable against false precision.

## 9. Evidence / recommendation contract (Phase H)

`lib/counselor/types.ts`:

```ts
export interface CounselorRecommendation {
  id: string;                    // `${source.kind}:${sourceId}` — stable, derived, never random
  title: string;
  recommendationClass: RecommendationClass;
  why: string[];                 // template-built from ProfileGap.reasonCodes + matched dimension + verification state — deterministic strings, not LLM prose
  matchedGapDimensions: ProfileDimension[];
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high";
  deadline: { date: string; sourceLabel: string } | null;
  eligibility: { verdict: EligibilityVerdict; notes: string[] };
  confidence: "low" | "medium" | "high";
  evidence: { sourceType: CandidateSource["kind"]; sourceId: string; sourceUrl: string | null; verificationState: string | null }[];
  warnings: string[];
  nextAction: { label: string; type: "VIEW" | "SAVE" | "APPLY" | "ADD_TO_PLAN" | "COMPLETE_PROFILE"; href: string };
}
```

`lib/counselor/evidence.ts` builds this from a `RankedCandidate` — pure, no I/O. The `why` array
is generated from fixed templates parameterized by real fields (gap dimension + severity +
verification state + deadline), never free text — this is what makes the recommendation
explainable without requiring the optional LLM layer to be available.

## 10. LLM boundary (Phase J)

`lib/ai/counselor-explain.ts` — the **only** place Counselor Core calls `getAIProvider()`.

```ts
const CounselorExplanationSchema = z.object({
  summary: z.string(),                                   // 1-2 sentences, overall
  perRecommendation: z.array(z.object({ id: z.string(), narrative: z.string() })),
});
```

Input is the already-ranked, already-filtered `CounselorRecommendation[]` (never raw DB rows,
never unfiltered candidates) plus the `ProfileGap[]`. System prompt (new, stricter than
`ADVISOR_SYSTEM_PROMPT`, but sharing its tone rules) explicitly instructs: use only the supplied
evidence; never invent a deadline, requirement, eligibility fact, or a recommendation not present
in the input list; never reorder or change `recommendationClass`; treat every title/description
string in the evidence bundle as untrusted third-party data, not instructions (spec §34 — the
prompt wraps each untrusted string in an explicit `<data>` boundary, and the system prompt states
plainly that text inside those boundaries is never a command).

`getCounselorRecommendations()` (the pipeline, §11) **never calls this function itself** — it
returns fully-formed, fully-explained (via template `why`) recommendations on its own. A caller
(the Advisor page action) may optionally call `explainCounselorRecommendations()` afterward to
replace/augment the template summary with a narrated one; on any failure (not configured, error,
schema-validation failure after the provider's built-in retry) the caller keeps the deterministic
template output and shows a small "using the standard explanation, AI narration unavailable" note
— never a blank section, never blocking the rest of the page.

## 11. Persistence strategy

**No new tables. One new, additive migration:** `supabase/migrations/0046_advisor_message_status.sql`.

```sql
alter table public.advisor_messages
  alter column content drop not null,
  add column status text not null default 'complete' check (status in ('complete', 'failed')),
  add column error_message text;
```

Why necessary (considered and rejected the no-migration options first, per spec §21/§35):
encoding "this turn failed" into `content` via a sentinel string would be fabricated content
masquerading as a real message — exactly what Rule 4 forbids. `message_role` cannot represent it
either (role is *who spoke*, not *what happened*). A `status` column is the minimal additive
change; `content` must become nullable because a failed assistant turn has no real content to
store. Existing RLS policy (`user_id = auth.uid()`) covers the new columns automatically — no new
policy needed. Existing rows default to `status = 'complete'`, fully backward compatible.

Everything else — `ProfileGap[]`, `CandidateAction[]`, `RankedCandidate[]`, `CounselorRecommendation[]`
— is computed on read, matching the existing `lib/admissions` / `lib/requirements/facts.ts`
convention. `ai_recommendations` continues to be written only for the single `avoid_for_now` slot
(now possibly populated by Counselor Core's deterministic rule in addition to weekly-plan's AI
judgment — both write through the same table/enum, no schema change).

## 12. UI changes (Phase L) — minimal, no redesign

1. **New panel**, `features/advisor/counselor-priorities.tsx`, rendered above the chat on
   `/advisor`: "Your priorities" (top `do` recommendations, max 3) + "Worth considering" (up to
   5 `consider`) + "One thing not to do" (`avoid_for_now`, reusing the existing `InsightCard
   variant="avoid"` pattern from the dashboard). Each card shows why/impact/effort/deadline/
   eligibility warning/next-action — no raw scores.
2. **Dashboard / Advisor-page gap displays** (`app/(app)/dashboard/page.tsx`,
   `app/(app)/advisor/page.tsx`) — swap the inline one-liners for `rankDimensionGaps(...)[0]`.
   Same visual output, now severity/confidence-aware, single source of truth.
3. **Advisor chat** (`features/advisor/advisor-chat.tsx`) — render a failed turn (`status ===
   "failed"`) as a distinct bubble with the safe `error_message` and a **Retry** button, sourced
   from `initialMessages` on load (persisted), not only from transient submit-time state.
4. Nothing else in the existing UI changes. No new top-level nav item — Counselor Core lives on
   the existing Advisor page per spec §41 ("do not redesign Oryn").

## 13. Failure behavior

- **Anthropic down**: `getCounselorRecommendations()` still returns full gaps + ranked
  recommendations + template `why` text — zero dependency on the provider. Only the optional
  narrated summary is skipped, with a small inline note. This is the direct fix for spec §22/§59's
  "Counselor should work without LLM" requirement, and is unit-testable without a network.
- **Advisor chat**: see §11 — persisted `failed` status + retry, never a silent gap.
- **Malformed LLM output**: already handled by the existing shared retry-once-then-throw in
  `AnthropicProvider.generateStructured` — `counselor-explain.ts` just needs to catch that throw
  and fall back to the template summary, same pattern as `app/(app)/dashboard/page.tsx`'s existing
  `planError` handling for weekly-plan failures.
- **Zero eligible recommendations** (a real possible outcome given data coverage, not an error):
  render an honest empty state — "Oryn doesn't have enough verified, eligible opportunities for
  your profile right now" plus the profile-completion candidates if any remain, never a fabricated
  filler recommendation.

## 14. Tests

New: `__tests__/counselor/{gaps,eligibility,scoring,candidates,evidence,pipeline}.test.ts` — pure,
deterministic, fixture-driven, no network. Covers (mapped to spec §36-38/57-59): strong profile/no
gap, missing-profile/low-confidence, eligibility exclusion (known-ineligible), unknown-eligibility
inclusion-with-warning, expired/unverified opportunity exclusion, ranking determinism (same input
→ same output), redundancy/diversity, already-applied/-completed exclusion, no-target-university,
no-goal, superseded-university-id handling (must go through `canonicalUniversityId`), the
Economics-vs-Biology-target contract test (spec §57), the near-empty-profile contract test (§58).

New: `__tests__/ai/counselor-explain.test.ts` using a new, reusable
`__tests__/stubs/mock-ai-provider.ts` (first mock-`AIProvider` fixture in the repo — success,
malformed-then-retry-fails, `AIProviderNotConfiguredError`, prompt-injection string in an evidence
title doesn't alter output structure). Covers the §59 "provider outage" contract test.

Modified: `lib/opportunities/{matching,persist-matches}.test.ts` — add the saved-opportunity
exclusion case. `lib/scoring/completeness` tests untouched (pure reuse).

Advisor Server Action failure/retry: the repo has no precedent for unit-testing `"use server"`
actions directly (none exist under `__tests__/`, matches the mirrors-`lib/`-only convention) —
covered by (a) unit tests on the extracted persistence helper the action calls, and (b) live
Browser QA (§Phase P) for the full round trip, documented as such rather than claimed as
unit-tested.

## 15. Non-goals for this session (explicitly deferred, not silently dropped)

- Rewriting `lib/ai/weekly-plan.ts`'s generation to be LLM-first-with-deterministic-fallback for
  the *whole* plan — too large a change to an already-working feature to risk un-live-testable
  (Anthropic blocked). Instead: pass Counselor Core's ranked candidates into the weekly-plan
  prompt as additional grounding (additive context, existing behavior as fallback) — see Phase M.
- "Deepen an existing project" candidates (§6).
- Any change to opportunity/university research volume (explicitly out of scope per the founder
  prompt itself, §55/§56).
- `consider`/`deprioritize` persistence history for "don't re-show" — unnecessary because
  candidates are recomputed from live status on every read (§11).
