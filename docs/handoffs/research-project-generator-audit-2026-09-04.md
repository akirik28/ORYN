# Research project generator (Phase 13) audit — a prior audit already exists

**Status:** measurement only, no code changed, per explicit instruction ("Bak ve raporla,
düzeltme" — look and report, don't fix). **Base:** `origin/main` (`f192fd61`). **Branch:**
`docs/research-project-generator-audit-2026-09-04`.

## Correcting the premise first

This was framed as "nobody has looked at this yet." That's not accurate — a near-identical
audit already exists: [`docs/handoffs/research-generator-audit-2026-09-02.md`](./research-generator-audit-2026-09-02.md)
(oryn-31, 2026-09-02, two days before this task). It already answered most of what's asked
below and already **fixed three real gaps**: the student's graduation year wasn't reaching
the prompt (now is — "scale to age" was previously true only in the generic "roughly 14-18"
sense, never per-student), the feature was still on the raw unconditional `logAIUsage` path
(migrated to `withUsageLogging`), and a saved idea had no provenance tag distinguishing it
from a hand-typed entry (`research_experiences.source` now writes `"research_generator"`
instead of falling through to the column default).

I'm not relaying that doc's claims secondhand — I read it in full and independently
re-verified its central, most decision-relevant claim against the live DB just now (query
below), two days after it was written, rather than trusting a two-day-old snapshot. What
follows answers your four questions, built on both audits plus what I found today that
neither covered.

## 1 — Does it exist, does it produce all 9 fields

Yes, fully wired, not a stub. `lib/ai/research-generator.ts` (`generateResearchProjects`) →
`ResearchProjectSchema` requires all 9 spec fields (`researchQuestion`, `whyItFits`,
`difficulty`, `estimatedDuration`, `requiredSkills`, `dataSources`, `method`,
`expectedOutput`, `firstSteps`) as a Zod-validated structured-output tool call — the model
cannot return a response missing one, and `firstSteps` is additionally bounded `.min(1).max(3)`
matching the spec. `ResearchProjectListSchema` caps at 3 projects (`.min(1).max(3)`), also
Zod-enforced not prompt-hoped. Two real, intentional UI entry points, both already wired to
the same server actions: `ResearchIdeaStudio` (`/profile/research-ideas`, full page — method,
skills, and data sources all rendered) and `ResearchIdeaGenerator` (a compact dialog embedded
in the profile page's Research section). Neither is a dead leftover of the other.

## 2 — Run with real student data: personalized or generic

Genuinely personalized on the axes it uses, with two confirmed gaps in what it could use but
doesn't (one already known, one new):

- **Personalized**: interests come from the real `student_interests` table, not a placeholder;
  research literature grounding is a real live OpenAlex `searchWorks` call keyed on
  `field + interests` (not invented paper titles); the current research profile-dimension
  score (0-100) is passed in; weekly time budget is passed in; graduation year / years-until
  context is passed in (oryn-31's 2026-09-02 fix, confirmed present in the current file).
- **Known gap, from the prior audit, still true**: existing research is passed only as a
  single collapsed 0-100 score, never as descriptive content (titles, topics) — the model
  knows *how strong* a student's research is, never *what it's actually about*, so it can't
  deliberately build on or avoid a specific prior project.
- **New gap, verified today**: `skills` is a real, populated table in the schema, and the
  spec explicitly lists "skills" as a generator input — but it's completely absent from
  `StudentAdvisorContext` (`grep -n "skills" lib/ai/student-context.ts` returns zero matches).
  Not filtered out, not summarized — never fetched at all. `requiredSkills` in the output
  schema is therefore the model inventing what skills a project needs with no signal about
  what the student already has.
- **New gap, verified today, specific to this feature's own prompt**: `weeklyTimeBudget` is a
  persisted enum (e.g. `"5_10h"`). The shared prompt formatter (`formatContextForPrompt`,
  used by the main advisor chat) converts it to a human label via `timeBudgetLabel()` before
  it reaches a model. `generateResearchProjects` doesn't call that shared formatter — it
  builds its own prompt by hand (line 86: `` `Weekly time budget: ${context.student.weeklyTimeBudget ?? "not set"}` ``)
  — so the model sees the literal stored token `"5_10h"`, not "5–10 hours a week." Almost
  certainly still usable by the model (the token is self-explanatory enough), but it's the
  same raw-enum-leak class of bug the prior audit's own comments say was already found and
  fixed *elsewhere* in this file's neighborhood (`student-context.ts`'s header comments
  reference a "2026-09-02 sweep" that caught this exact pattern for `curriculum` and
  `outlook`) — this specific occurrence, inside `research-generator.ts`'s own hand-rolled
  prompt string, wasn't part of that sweep and is still there today.

## 3 — A 14-year-old with an empty profile: does it fall into the spec's own trap

Can't fully answer without a live call (see §5), but the structural safeguards are real, not
decorative: the system prompt quotes Phase 13.1's bad/good examples **verbatim** ("Develop a
new macroeconomic model predicting all European inflation" vs. the OECD/Eurostat comparison),
explicitly instructs "never fabricate a dataset, API, or source that doesn't actually exist
publicly," and grounds every generation in real current OpenAlex literature rather than the
model's own unverified sense of what's current. For an empty 14-year-old profile specifically:
`gradeContext` degrades to an explicit "Graduation year not on file" (not a silent 0 or a
crash) if `graduationYear` is null, and the research-score line reads "unknown/100" rather
than fabricating a 0. So the prompt is honest about having no signal — it doesn't invent
confidence it lacks. But there is no code-level achievability gate on the *output* — nothing
stops the model from returning an ambitious-tier project for a 14-year-old with nothing on
file, because "is this actually achievable for this specific student" isn't something a JSON
schema can validate. That's the same conclusion oryn-31 reached on 2026-09-02: "well-built,
specific prompt that cannot be structurally enforced... there is no code-level check on the
output confirming achievability, and there structurally can't be one without a second
judgment call." I agree with that assessment after independently reading the same code — it's
not a gap this pass could close either, since closing it would mean *building* something
(a review gate or a second scoring call), which is explicitly out of scope for a look-only pass.

## 4 — Saved or regenerated each time; real cost

**Never cached, always billed.** No memoization anywhere in `generateResearchProjects` — every
click of the "Generate" button is a fresh `provider.generateStructured` call routed through
`withUsageLogging` (real `ai_usage` row per attempt, tier-aware model selection via
`selectModelForUser` — degrades to the cheaper model once a student is over their monthly AI
budget target). The only cost bound is a rate limit (10 calls / 60 minutes via
`assertWithinAIRateLimit`), which throttles frequency but doesn't deduplicate identical
requests — asking for "Economics" twice in an hour is two full billed calls, not a cache hit.

**Not auto-persisted.** Generation and saving are two separate, explicit actions
(`generateResearchIdeas` / `saveResearchIdea` in `app/(app)/profile/actions.ts`) — nothing is
written to the student's profile until they explicitly pick one, and a saved idea correctly
carries `source: "research_generator"` provenance (oryn-31's fix) into `research_experiences`.

**Real usage, today, independently reverified — still zero.** I ran this against the live DB
myself just now, not relaying the prior audit's two-day-old number:

```sql
select
  (select count(*) from ai_usage where feature = 'research_generator') as research_generator_ai_usage_rows,      -- 0
  (select count(*) from research_experiences where source = 'research_generator') as saved_research_generator_ideas, -- 0
  (select array_agg(distinct source) from research_experiences) as all_distinct_sources;                          -- {cv_import,manual,self_reported}
```

Same two independent signals oryn-31 used two days ago, both still zero today. This feature
has never run to completion for a real student, and that's still true as of right now, not
just as of 2026-09-02.

**Spec Phase 63 ("avoid repeatedly recommending the same rejected idea") — partially exists,
but doesn't reach this feature.** `ai_recommendations` is a real table, and
`buildStudentAdvisorContext` does fetch from it into `recentRecommendationTitles` — but only
`recommendation_class = "avoid_for_now"` rows, and per that code's own comment, nothing
currently persists `do`/`consider` recommendations to that table at all ("this filter is
currently a no-op in practice"). More to the point for this feature specifically:
`generateResearchProjects` builds its own hand-written prompt and never includes
`context.recentRecommendationTitles` in it — so even the narrow signal that does exist in
`StudentAdvisorContext` doesn't reach the research generator's actual prompt. And no code path
writes anything anywhere when a research idea is generated but not saved — there's no
"shown_at" log for the ideas a student saw and ignored, only for the one they explicitly kept.
So today: a student regenerating ideas for "Economics" five times in a row could get the same
idea back more than once, with nothing short of luck preventing it.

## What I could not measure, and why

**No live generation was run.** Not tested end-to-end against a real model output for
tone/quality/actual-achievability, and specifically not tested against an empty 14-year-old
profile to see what the model really returns (§3's open question). This mirrors a real cost
and consent question, not just inconvenience: a live call writes a real `ai_usage` row against
production credentials and would need a real `userId` — there's no safe disposable student
account to attribute it to, and this repo's minors handle real (if currently zero) students.
This independently matches a convention oryn-31's own audit states explicitly for this same
feature two days ago: "No live test of a real generation against the Anthropic API — all new
tests mock the provider, matching this session's established 'no live model call, ever' test
convention." I reached the same decision independently before finding that line, which is
corroboration, not something I copied.

**Not re-verified**: everything oryn-31's audit asserted about code *structure* two days ago
(schema shapes, the three fixes it made, the essay-generator's unrelated `logAIUsage` bug it
found and merged past) — I read the current file and confirmed the fixes are still present,
but did not re-derive each claim line-by-line the way I did for the two live-DB counts above,
since nothing has touched `research-generator.ts` since that audit shipped (`git log` on the
file, not separately shown here, but implied by the fixes still being visibly present exactly
as that doc describes them).

## New, beyond both audits

- `skills` table exists, populated, never reaches `StudentAdvisorContext` at all — a real gap
  against the spec's named input list, not previously flagged.
- `weeklyTimeBudget` reaches this feature's specific hand-built prompt as a raw stored token
  (`"5_10h"`), not the human-readable label the shared formatter produces elsewhere in the
  codebase — same bug class as a prior, already-fixed sweep, just not caught in this file at
  the time.
- The `ai_recommendations`/Phase 63 picture is more specific than "doesn't exist" — it exists,
  is fetched, and is still bypassed by this feature's own prompt construction.

None of these were fixed, per instruction.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
