# FEAT-1 territory audit — false-confidence defect class, 2026-08-22

STATUS: **Audit only, per explicit CEO instruction. No code changed, no fix applied.**
Scope: `lib/counselor/**`, `lib/ai/**`, opportunity-matching-adjacent logic
(`lib/opportunities/matching.ts`, `persist-matches.ts`). Fresh worktree off current
`origin/main`@`4afb4ca`, clean `npm ci` (rule 18) — not reused/hardlinked from elsewhere.
Read/grep-based; one prior verified chain re-traced myself, no new live probe run this
pass (see "What I did NOT check").

Target defect class, as assigned: **the product asserting something its own data cannot
support** — false confidence, "we don't know" rendered as something else, hardcoded
stand-ins for things that vary, or the advisor stating a fact it wasn't given
(`AGENTS.md` Phase 28).

## Ranked findings

### 1. `verification_rejected` and `evidence_added` achievements are indistinguishable from verified ones in everything the Advisor reads — Tier 1

**File**: `lib/ai/student-context.ts:212,218,225,227` (`selfReported: x.evidence_status ===
"self_reported"`), consumed by `formatContextForPrompt`'s `tag()` helper (`:263-269`) and
the advisor's own system prompt, `lib/ai/advisor-prompt.ts:33-35`.

**What's asserted**: the prompt text an activity/project/research item renders with is
either `[self-reported]` or nothing at all. The system prompt instructs the model:
*"Treat an activity, project, or achievement marked [self-reported] as a real but
unverified claim... don't describe it with the same certainty as something with evidence
attached."*

**What the data supports**: `types/database.ts:32` defines
`EvidenceStatus = "self_reported" | "evidence_added" | "verified" |
"verification_rejected"` — four states, not two. The boolean collapse means
`evidence_added` (uploaded, not yet reviewed) and `verification_rejected` (reviewed and
**failed**) both render identically to `verified` (reviewed and confirmed) — no tag at
all, i.e. the prompt's own "something with evidence attached" bucket, its higher-certainty
category. Confirmed this isn't merely theoretical: `lib/scoring/assemble-facts.ts:36-40`
pulls every activity/project/research/award row via `select("*").eq("user_id", userId)`
with **no filter on `verification_status`** — a rejected row reaches
`StudentAdvisorContext` exactly like a verified one. Both live consumers were checked
directly: `lib/ai/advisor-chat.ts` (the chat surface) and `lib/ai/weekly-plan.ts`, which
explicitly tells the model it may propose actions "grounded in the student's own existing
projects/activities/goals" — i.e., could build a recommendation around a rejected claim
with zero caveat anywhere in its context.

**User impact**: the advisor can praise, reason about, or build a weekly action around an
achievement a human reviewer explicitly rejected, with the same textual certainty as one
that was confirmed — and nothing in the context distinguishes the two for the model to
even have a chance at hedging. This is `AGENTS.md` §11 ("Do NOT label something as
independently verified merely because a file was uploaded") violated one layer removed:
not by a UI label, but by the reasoning substrate the advisor is given.

**Cost tier**: cheap. No schema/migration needed — the data already exists. Thread the
actual `evidence_status` value (or a 3-4-way tag) through `StudentAdvisorContext` instead
of the boolean, extend `tag()` accordingly, add one sentence to
`ADVISOR_SYSTEM_PROMPT` about a rejected item. Estimate: one file's type change + one
prompt sentence + tests.

### 2. Inconsistent "missing input" confidence defaults in `lib/counselor/scoring.ts` — Tier 2

**File**: `lib/counselor/scoring.ts:59` vs. `:86`.

**What's asserted**: two structurally identical "the referenced backing data wasn't found
in state" branches pick **opposite** honesty defaults.
`scoreOpportunityCandidate` (`:59`): `entry ? DATA_CONFIDENCE_SCORE[...] :
DATA_CONFIDENCE_SCORE.low` (20/100 when missing).
`scoreRequirementCandidate` (`:86`): `input ? DATA_CONFIDENCE_SCORE[...] :
DATA_CONFIDENCE_SCORE.medium` (60/100 when missing) — `toLevel(60)` resolves to
`"medium"`, a real, displayed confidence label
(`lib/counselor/evidence.ts` surfaces `confidence` directly on every recommendation).

**What the data supports**: zero data in both cases — the lookup failed. The file's own
sibling convention (line 59, and `config.ts`'s `DATA_CONFIDENCE_SCORE` comment framing —
low is the honest floor for "we don't have this") says this should read `low`, not
`medium`.

**User impact**: low today — `lib/counselor/state.ts:59-67`'s construction means
`requirementCandidateInputs` should normally contain every requirement a candidate could
reference, so this is a defensive "shouldn't happen" branch, not a confirmed-live path. If
it ever fires (a future refactor, a race, a filtering change), a requirement-action
recommendation built on literally no backing data would display "medium" confidence
instead of the honest "low" the codebase's own established convention uses one function
above it.

**Cost tier**: trivial. One-constant fix (`.medium` → `.low` at `scoring.ts:86`) plus a
regression test for the "input not found" branch, which currently has no test coverage
(checked: `__tests__/counselor/scoring.test.ts` — not verified exhaustively for this
specific branch, flagged below under what I didn't fully check).

### 3. `computeProfileNeedScore`'s hardcoded binary and missing Gate-1 awareness — Tier 3, already known, not new

**File**: `lib/opportunities/matching.ts:222-226`.

Hardcoded `addressesWeakness ? 85 : 45` rather than a graduated score, and doesn't
condition on the student's target admissions system's Gate-1 shape (a leadership-building
opportunity scores as high-need for a YKS-track student even though leadership has no
channel into that placement decision). This is **Gap 5** from
`docs/research/admissions-systems/implementation-gap/README.md`, which I read in full
during Package 2 — that analysis already assessed it explicitly as "not urgent... a
missing nuance in an already-reasonable heuristic, not a wrong answer." Not re-flagging as
new; noting it here only because it is squarely in this audit's target class and I want
the record to show it was checked, not missed.

### 4. Checked, not a defect: `lib/ai/opportunity-extraction.ts`'s `eligibleCountries: []` has no "confirmed open" signal

`OpportunityCandidateSchema.eligibleCountries` is documented "Empty array if open to any
country," with no companion field for "the source explicitly confirmed worldwide
eligibility" vs. "the source simply didn't discuss geography." Checked this against
Package 1's fix (`opportunities.country_eligibility_confirmed_open`, migration 0060,
unapplied): **not a live defect** — every empty-and-unconfirmed row is already treated
honestly downstream regardless of how it became empty (both `matching.ts` and
`lib/counselor/eligibility.ts` read `countryEligibilityConfirmedOpen ?? false`), and this
exact gap (the extractor has no way to set the marker) was already named as explicit
future work in `docs/handoffs/feat1-eligibility-honesty-2026-08-22.md`
("Intake-time capture... worth a future package, not started here"). Recorded for
completeness; no action needed from this audit.

## Confirmed positives — verified myself, not re-derived from the CEO's claim

- **The CEO's cited chain is real.** Traced end-to-end personally:
  `student-context.ts:212` (`evidence_status === "self_reported"`) →
  `formatContextForPrompt:263-269` (the `[self-reported]` tag) →
  `advisor-prompt.ts:33-35` (the instruction to treat it as unverified). Confirmed, not
  assumed. Finding 1 above is a gap **inside** this same mechanism, not a contradiction of
  it — the chain is genuinely correct for the one state it covers.
- **`lib/counselor/gaps.ts:31`** — `severityFor` checks `confidence === "low"` *before*
  computing severity, so an unevidenced dimension is labeled `insufficient_data` rather
  than a fabricated "critical gap." Exactly the discipline this audit is checking for,
  done right.
- **`MIN_COMPLETENESS_FOR_JUDGMENT` / `sufficientForJudgment` is genuinely wired, not
  computed-and-dropped** — confirmed at its one real consumer,
  `features/advisor/counselor-priorities.tsx:54`, which renders "Oryn needs a bit more
  information before it can make confident recommendations" below 40% completeness
  instead of proceeding with judgment-based recommendations anyway.
- **`lib/ai/counselor-explain.ts`** (the optional LLM narration layer over Counselor Core)
  has real, working defenses: raw scores/breakdowns are deliberately withheld from the
  model ("the model never sees numbers it could misquote back with false precision"),
  every untrusted string (opportunity/requirement titles) is wrapped in explicit
  `<data>...</data>` tags with an instruction never to treat embedded text as a command,
  and the system prompt forbids reordering, inventing, or reclassifying recommendations.
- **`cv-extraction.ts`, `requirement-extraction.ts`, `opportunity-extraction.ts`,
  `refine-achievement.ts`, `interpret-requirement.ts`** all instruct "null over guessing,"
  carry per-item confidence where it matters, and `interpret-requirement.ts` explicitly
  refuses AI-authoring for certain requirement categories (e.g. a binding Early Decision
  commitment) **before any AI call is made** — a deliberate guardrail, not an oversight.
- **`lib/ai/research-generator.ts`** renders "No live research database results
  available — rely on general knowledge... stay conservative" when OpenAlex has nothing,
  rather than silently proceeding as if it did, and renders a missing research score as
  literally `"unknown/100"` in the prompt rather than defaulting to 0.

## What I did NOT check (rule 20)

- **Not read this pass**: `lib/ai/essay-outlines.ts`, `lib/ai/advisor-failure.ts`,
  `lib/ai/provider.ts`, `lib/ai/anthropic-provider.ts`, `lib/ai/index.ts`,
  `lib/ai/usage.ts`, `lib/ai/rate-limit.ts`, `lib/counselor/strengths.ts` (partial only —
  saw its `confidence === "low"` guard via grep, not the full file), `lib/counselor/
  pipeline.ts` (partial), `lib/counselor/eligibility.ts` (not re-read — audited in
  Package 1, relied on that prior knowledge rather than re-deriving).
- **No live probe run this pass** — unlike Package 2, every finding above is from static
  reading and grep, not from executing the actual functions against real inputs. The code
  path for Finding 1 is unambiguous from reading (the `select("*")` with no filter, the
  boolean collapse, the prompt text are all directly quoted above), but I have not
  confirmed it against a live Supabase-backed profile with an actual
  `verification_rejected` row. Recommend a probe before treating it as fully
  production-confirmed, though I'd assign this low risk of surprising given how direct the
  code read is.
- **UI surfaces not swept** beyond `counselor-priorities.tsx` and the Package 2
  `OutlookBadge`-family code (already covered in that package's own handoff) — this audit
  was scoped to `lib/counselor/**`/`lib/ai/**`/opportunity-matching per the assignment,
  not every `features/`/`app/` component that renders their output.
- **`lib/scoring/**` beyond `assemble-facts.ts`** not re-audited — the dimension scorers
  themselves (`academics.ts` etc.) were covered by the implementation-gap analysis I read
  during Package 2; I relied on that prior finding rather than re-deriving it here.
- **Test coverage for scoring.ts's two "missing input" branches** (Finding 2) not
  exhaustively verified — I did not confirm whether `__tests__/counselor/scoring.test.ts`
  already exercises the `!input`/`!entry` paths or would need a new test added alongside
  the fix.

## Files touched this package

None (audit only). This document only.
