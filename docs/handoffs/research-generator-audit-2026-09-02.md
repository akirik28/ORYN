# Research project generator (Phase 13) — never used, well-built, two real gaps fixed

**Status:** audit + 3 fixes, gates green (typecheck/lint/3453 tests/build). **Author lane:**
oryn-31, at oryn-a7's request. **Base:** local `main` (`e19a3d2a`), merged forward to pick up
oryn-b9's concurrent `lib/ai/usage.ts` fix (see §4). **Branch:**
`oryn/research-generator-audit-2026-09-02`.

---

## Which kind of absence this is: genuinely never used, confirmed two independent ways

`research_generator` has zero rows in `ai_usage` — and, before this pass, the function was
still on the raw `logAIUsage` pattern (not yet migrated to `withUsageLogging`), which logs
*unconditionally* on any success. Zero rows there is doubly conclusive: there's no
"used but silently didn't log" ambiguity the way a `withUsageLogging`-migrated feature could
in principle have.

Second, independent signal: `research_experiences.source` (the table a saved idea would land
in) has exactly three real values across its 6 rows — `manual`, `self_reported`, `cv_import`
— nothing else. Both signals agree: this has never run to completion for a real student.

**Reachable, not broken.** Real server action (`generateResearchIdeas` in
`app/(app)/profile/actions.ts`), correctly gated (`requireUser`, rate-limited via
`assertWithinAIRateLimit`), correctly error-handled (rate limit / AI-not-configured / generic
failure all return distinct messages). Two real frontend callers, both intentional —
`ResearchIdeaGenerator` (a compact dialog embedded on the main profile page) and
`ResearchIdeaStudio` (the full-page experience at `/profile/research-ideas`, its own comment
calling itself "the full-page counterpart to ResearchIdeaGenerator's dialog") — checked this
specifically since two similarly-named components is exactly the shape a stray dead
leftover would take; it isn't one. All 11 accounts are QA/founder, same reason every other
feature this session found unused turned out unused.

**Saying it plainly, as asked**: this feature has never run for a real student. That's a real
fact for a founder about to launch, not a gap in the audit.

## Spec compliance, checked structurally where the spec is structurally checkable

- **Three ideas maximum**: `ResearchProjectListSchema = z.object({ projects: z.array(...).min(1).max(3) })`
  — Zod-enforced, not a prompt instruction the model could ignore. Same shape as the
  dashboard's own three-action cap.
- **Nine fields per idea** (research question, why it fits, difficulty, duration, required
  skills, data sources, method, expected output, first steps): all nine present in
  `ResearchProjectSchema`, all required (non-optional), matching the spec's own list field for
  field. `firstSteps` additionally bounded `.min(1).max(3)`.
- **Phase 13.1, achievability**: the honest answer is neither "enforced" nor "hope" — it's a
  well-built, specific prompt that **cannot** be structurally enforced the way a count or a
  required field can, because "is this achievable for a 16-year-old" isn't something a JSON
  schema can validate. What exists: the system prompt quotes Phase 13.1's own bad/good
  examples **verbatim** ("Develop a new macroeconomic model predicting all European inflation"
  vs. the OECD/Eurostat comparison), explicitly instructs "never fabricate a dataset, API, or
  source that doesn't actually exist publicly," and grounds every generation in **real** current
  literature via `openAlexProvider.searchWorks` (actual paper titles/topics, not invented
  ones) rather than the model's own unverified sense of what's current. That's real,
  specific, evidence-grounded prompt engineering — not a vague aspiration — but there is no
  code-level check on the output confirming achievability, and there structurally can't be
  one without a second judgment call (a review gate, or a second AI call scoring the first).
  Naming this precisely rather than rounding it to either extreme.
- **Difficulty scaling to age/experience — real gap, fixed.** `weeklyTimeBudget` and the
  student's research score were already in the prompt. The student's actual age/grade
  wasn't: `graduationYear`/`birthYear` are already fetched into `StudentAdvisorContext`
  (Counselor Core's eligibility checks need them), with an explicit existing comment on both
  admitting "not used in prompt text today" — true here specifically, since this function
  builds its own prompt by hand rather than calling the shared `formatContextForPrompt`.
  Before this fix, "scale to age" was only ever true in the generic "pitched at roughly
  14-18" sense the system prompt states once — never adjusted for whether a specific student
  is 14 or 18, a real difference in what's actually achievable in a given timeframe.

## What was fixed

1. **`lib/ai/research-generator.ts` now includes the student's graduation year in the
   prompt** — both the raw year and a computed "N years from now," so the model doesn't have
   to infer today's date to know how much runway a student has. Degrades to an explicit
   "Graduation year not on file," never a silent omission.
2. **Migrated to `withUsageLogging`** — same reasoning as tonight's other three migrations: a
   retry-exhausted `generateStructured` failure now recovers its real usage instead of losing
   it, and `degraded`/`degradeReason` tracking now covers that path too, which the original
   unmigrated code never had.
3. **`saveResearchIdea` now writes `source: "research_generator"`** instead of falling
   through to `research_experiences.source`'s own column default (`'manual'`) — found because
   `ResearchExperienceSchema` (shared with the plain manual-entry form) has no `source` field
   at all, so a saved AI-generated idea was completely indistinguishable from one typed by
   hand. Same reason `lib/profile/cv-import.ts` writes `source: "cv_import"` instead of
   accepting the default. Implemented via a new optional `extraFields` parameter on the
   shared `crudCreate` helper (spread in *after* the Zod-validated data, never reachable
   through the form schema itself) rather than adding `source` to the shared schema, which
   would have let a plain manual submission claim any provenance it liked — every one of
   `crudCreate`'s other ~10 existing callers is unaffected, the parameter is optional.

## §4 — a concurrent, unrelated find worth naming

Mid-task, oryn-b9 (auditing the essay/story-bank generator for the identical "never in
ai_usage" question) found and fixed a real bug in the *shared* `lib/ai/usage.ts`:
`logAIUsage`'s own `ai_usage` insert had no `{error}` destructure, so its try/catch — which
exists specifically to swallow-and-warn on a failed write — never actually caught a
PostgREST-level rejection, only a client/network-level throw. Foundational: every feature
routing through `logAIUsage`/`withUsageLogging` tonight inherited it. Didn't touch it myself
(no need to — my own change only calls `withUsageLogging`, doesn't edit it — and duplicating
their fix would just risk a conflict); merged their fix in via `main` before finishing this
pass, confirmed present (`5e49d885`) before the final gate run and push.

## What this does NOT do

- No review-gate or second-pass achievability check added — flagged as structurally
  unenforceable without one, not built here; that's a real product-scope decision, not a bug.
- No change to `ResearchIdeaGenerator`/`ResearchIdeaStudio` — both already correctly wired,
  confirmed deliberate rather than duplicate.
- No live test of a real generation against the Anthropic API — all new tests mock the
  provider, matching this session's established "no live model call, ever" test convention.
