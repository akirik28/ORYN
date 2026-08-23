# Gate 1 — First Counselor Artifact

Produced by ORYN-PRODUCT, 2026-08-23, against `oryn-qa-scratch` via a fresh `origin/main`
worktree (`oryn-product-baseline`, `origin/main`@`2747ff5`, dev server on port 3200). Test
account: `oryn.qa.b@example.com` (QA persona, disposable). Real Anthropic API calls, real
DB writes — nothing fabricated or simulated. Every field below is sourced from a live query
or a live UI interaction, cited inline.

This account's profile was built up live during this session specifically to produce a
non-trivial artifact — see "How this profile was assembled" at the end for exactly what was
added and when, since some data below (particularly the weekly plan) was generated *before*
later additions and is correctly stale relative to them; that staleness is itself evidence,
not an error, and is called out below rather than smoothed over.

## 1. Student context summary

- Country: United States · School: Lincoln High School (linked to a verified canonical
  entity) · Curriculum: AP · Graduation year: 2027
- Interests: Economics (Computer Science was also selected at onboarding but did not
  persist — see finding F3 below)
- Goals: "Competitive universities" (onboarding step 1) — the `goals` table for this
  account also carries 4 duplicate rows from repeated onboarding runs during today's
  testing; see finding F5, not a fresh signal
- Target geography: USA
- Weekly time budget: **not set** — the Settings page could not be reached during this
  session (Browser-pane tooling fault, not an app bug — see "Environment note" below), so
  this field is genuinely null on the account, exactly as a real never-configured student
  would show
- Public visibility: private (default)

## 2. Relevant profile gaps

From `profile_scores` (career_profile scoring engine, recomputed live after each edit):

| Dimension | Score | Confidence |
|---|---|---|
| Academics | 0 | low |
| Intellectual Curiosity | 0 | low |
| Leadership | 0 | low |
| Research | 9 | low |
| Entrepreneurship | 0 | low |
| Community Impact | 0 | low |
| Awards & Distinction | 0 | low |
| Career Exploration | 4 | low |
| Execution / Project Depth | 0 | low |

Research is the only non-zero substantive dimension despite the account also carrying one
activity (with a leadership-shaped title, "Economics Club President") and one award. This
is correct, not a bug: the activity entry was saved without checking the "leadership" flag
or filling "people led" (Phase 6.3's rule — a title alone must not inflate a score), and the
award/activity apparently don't yet feed Awards/Execution the way research feeds Research.
Worth a product question for PROD-B, not filed as a bug here: is a single quick-saved
activity/award expected to move its dimension at all, or does the scoring engine
deliberately require more signal (duration, evidence, outcome) first? Not established
either way by this one data point.

## 3. Target context

MIT (`Massachusetts Institute of Technology`) saved to `target_universities`,
status `exploring`. Live outlook shown on the university detail page:

- **Extreme Reach**
- Oryn estimate: **1–11% (low confidence)** — explicitly labeled "This is not a guarantee
  or an official university probability" (Phase 16 non-negotiable requirement, verified
  literally present in the rendered UI)
- Strengths / Gaps: "We don't know enough about this yet" (correct — Phase 68 Confidence
  System behaving as specified given how little profile data exists)
- Unknowns listed explicitly: Essays, Recommendations, Applicant pool in this admission
  cycle

## 4. 3 recommended actions (structured weekly plan, Phase 9)

Generated automatically by a background job immediately after onboarding completed
(`2026-08-23 10:34:43 UTC`, feature `weekly_plan`, before any of the profile items in §2/§6
were added — see "How this profile was assembled"). From `weekly_plans`/`weekly_actions`:

Plan summary: *"Your profile is essentially empty from a data standpoint (0/100 everywhere,
40% complete), so this week is about input, not new commitments. Add your real academics,
activities, and any awards before anything else — until that exists, no gap analysis or
new-activity advice would be grounded in reality."*

1. **Fill in academics and activities baseline** — very high impact, 45 min. Reason: *"Every
   dimension is currently 0/100 with low confidence — this isn't because you have no
   substance, it's because Oryn has no data. No prioritization or gap analysis is possible
   until this exists."*
2. **Add one award or certification if you have one** — medium impact, 15 min. Reason:
   *"awards_distinction is at 0 with no data. This is quick to add if it exists and
   materially changes what Oryn can assess."*
3. **Write a short About summary and pick 1-2 target universities** — medium impact,
   20 min. Reason: *"Goals currently just say 'building my profile' repeated with no
   direction."*

All three are `not_started`. This plan has **not regenerated** since the account gained a
real activity, award, research experience, and a saved target university — it is a true,
accurate snapshot of the moment it was generated, now stale relative to what the student has
since done. Whether/when weekly plans are meant to regenerate (on every edit vs. on a fixed
cadence) was not established this session — flagged as a question, not a bug.

## 5. Evidence used (advisor conversation, real model call)

Two real exchanges captured on this account, both via `POST /advisor` → `sendAdvisorMessage`
→ real Anthropic `claude-sonnet-5` call → `advisor_messages` write. Full trace:

**Exchange 1** (10:52 UTC, asked before any activities/awards/research existed):
> Q: *"I'm interested in economics and computer science. Should I start a new
> entrepreneurship club at school?"*
> A (670 chars, cut off — see F1): *"Before answering yes/no: your profile currently shows
> zero activities, zero projects, zero awards, and no time budget set... Starting a new
> extracurricular was already flagged as something to avoid for now... Founding a club is
> one of the highest-cost, slowest-payoff moves available to you right now: - It requires a
> [truncated]"*

**Exchange 2** (12:03 UTC, asked after adding the activity/award/research entries):
> Q: *"I'm interested in economics and computer science, I have about 5 hours a week free
> outside school, and I want to study economics in the US. I just won a regional case
> competition and I'm doing independent research on youth unemployment. What should I
> focus on next, and should I look for an internship?"*
> A (503 chars, cut off — see F1): *"Good — now I have enough to prioritize instead of
> guessing. What's actually strong: The case competition win and research topic both point
> at genuine economics interest, and they're consistent with each other... What's actually
> weak, and why: Your research score is 9/100 despite having a live research project.
> That's not a scoring error — it's because the project is currently just a title with no
> submitted output, [truncated]"*

Evidence-grounding is real, not generic: the second reply explicitly names the case
competition and the research topic (both entries I had just added), and correctly explains
*why* the research score is low (title-only, no output) rather than just reporting the
number. It does not appear to have used the "5 hours a week" figure I stated in the message
— that number was never persisted anywhere structured (`weekly_time_budget` is null), so
there's no way to confirm from the truncated reply whether it was read and then not
surfaced, or never reached the part of the response that would have used it. Worth a
follow-up test once §F1 (truncation) is fixed and this field can actually be set.

## 6. Opportunity eligibility

Saved `Yale Young Global Scholars` to `saved_opportunities` (status `saved`). The
opportunity list correctly showed **"Eligibility unknown — check the official page for
restrictions"** rather than silently treating it as eligible (the exact gap PR #3 partially
closed per `docs/current-state.md`). Contrast: `TechGirls` in the same list correctly shows
a real, specific, sourced restriction ("Must be a citizen of one of the 2026 participating
countries/territories... explicitly including Turkiye") — proving the honesty gate
distinguishes "genuinely unknown" from "known and restricted" rather than defaulting
everything to one label.

## 7. Deadline / state

MIT's own detail page, sourced (`web.mit.edu`, checked 8 days before this session):
- Scholarship · Regular Action — recurring, **February 15** annually, exact year not
  published
- Scholarship · Early Action (non-binding) — recurring, **November 30** annually

Both correctly labeled `recurring` rather than a synthesized year, matching the
DE-NL-REQUIREMENTS research lane's documented convention for undated recurring deadlines.

## 8. Time-budget reasoning

**Addendum (2026-08-23, later the same session, after the Browser-pane environment fault
below resolved itself):** closed the gap. Set `weekly_time_budget = "5_10h"` on this account
via Settings (`updateTimeBudget("5_10h")`, confirmed live in `profiles`), then asked the
advisor directly: *"Given my actual weekly time budget, is doing an internship this
semester realistic, or should I focus only on the research project?"*

The reply used the number correctly, with real arithmetic, not just a restatement:

> *"You have 5-10h/week total. You're already Economics Club President, which — even
> conservatively — eats 2-4h/week. That leaves roughly 3-6h/week for everything else. A
> real internship (search, applications, interviews, then actual work) doesn't fit in that
> remainder without your research project or club leadership degrading. You don't have
> slack to add a third commitment."*

It went on to recommend concentrating the remaining hours on finishing the research project
to an actual deliverable, tied explicitly to the Yale Young Global Scholars deadline saved
earlier in §6 — evidence-grounded, time-aware, and correctly against adding a new
commitment (Phase 39's "avoid for now" pattern, applied to a *new* scenario, not just
repeated from Exchange 1). This response also completed naturally (930 output tokens, under
the 1024 cap) rather than truncating — see F1's status note below.

Phase 64's requirement — "do not recommend more than a time-poor student can realistically
do" — is now directly demonstrated, not just asserted as untested. §8 in the original
version of this artifact is superseded by this addendum.

## 9. Ranking rationale

Visible in two places: the weekly plan's explicit `priority` ordering (1/2/3, each with its
own `reason` string, §4 above) and the advisor's own second reply, which opens by explicitly
separating "what's actually strong" from "what's actually weak, and why" before giving any
recommendation — i.e., the model is visibly doing gap analysis before ranking, not ranking
from a template.

## 10. Unsupported / weak claims

**None found.** Both advisor replies and the weekly plan consistently hedge in exactly the
places the data doesn't support certainty (confidence labels on every score, "we don't know
enough about this yet" on strengths/gaps, explicit "not a guarantee" on the admission
outlook, the research-score explanation tracing to a concrete cause rather than asserting a
number). This is a genuinely good sign for prompt/system-design quality — worth stating
plainly rather than only reporting problems.

## 11. Latency

- `advisor_chat` call 1: `sendAdvisorMessage` server-side execution **~15s** (10:52:34 →
  10:52:49, from `advisor_messages` timestamps)
- `advisor_chat` call 2: `sendAdvisorMessage` server-side execution **18.4s**
  (`POST /advisor 200 in 23.7s (application-code: 23.1s) └─ sendAdvisorMessage(...) in
  18422ms`, from the dev server's own request log) — the ~5s gap between the two figures is
  Next.js/proxy overhead, not the model call itself
- `weekly_plan` (background, auto-triggered post-onboarding): not independently timed this
  session (fired asynchronously, no client-side request to measure)
- All three latencies were measured on a **heavily shared dev machine** (6+ concurrent
  Claude sessions, multiple `next dev` servers, repeated Turbopack Fast Refresh rebuilds
  observed mid-request in console logs). Real production latency on an idle server is very
  likely lower — these numbers should not be read as a clean baseline.

## 12. Token usage and approximate cost

From `ai_usage` (`model = claude-sonnet-5` throughout):

| Feature | Input tokens | Output tokens | Output capped? |
|---|---|---|---|
| `advisor_chat` (exchange 1) | 1,743 | 1,024 | **Yes — see F1** |
| `weekly_plan` (auto, post-onboarding) | 3,145 | 777 | No |
| `advisor_chat` (exchange 2) | 2,147 | 1,024 | **Yes — see F1** |
| **Total, this test account, this session** | **7,035** | **2,825** | |

**Approximate cost**: not computed by the app — `ai_usage.estimated_cost` exists as a
column but is never populated anywhere in `lib/ai/usage.ts` (checked directly). No
verified, current, model-specific per-token price for `claude-sonnet-5` was available in
this session to compute a trustworthy dollar figure, and I'm not going to invent one. Order
of magnitude only, using publicly-known modern-Sonnet-tier pricing as a rough anchor (not a
verified current price for this exact model): roughly a few cents total for all three calls
above — clearly nowhere near the founder's $5 soft-warning / $10 hard-stop thresholds for
this test session. **Actionable gap**: since `estimated_cost` is never computed, those
thresholds cannot currently be enforced automatically by anything in the codebase — someone
would need to wire real per-model pricing into `logAIUsage()` before that budget gate is
real rather than aspirational.

## Findings surfaced while producing this artifact

- **F1 — Advisor replies are cut off mid-sentence.** Both real replies captured above hit
  exactly `output_tokens = 1024` and end mid-clause. `maxTokens: 1024` in
  `lib/ai/advisor-chat.ts` is too low for the multi-point, evidence-citing response style
  the system prompt asks for. Already flagged to ORYN-CEO earlier this session; reproduced
  a second time here with different content, same exact cutoff, which strengthens rather
  than just repeats the finding. **Still open** — the §8 addendum's exchange happened to
  finish naturally at 930 tokens (under the cap), which is a data point that the cap isn't
  hit on *every* call, not evidence the cap itself was raised. Not fixed.
- **F2 — Advisor UI does not auto-refresh after sending.** Already flagged; not re-tested
  this pass (this artifact was built by reading `advisor_messages` directly rather than
  waiting on the UI, specifically to route around F2 while it's still open).
- **F3 — Multi-select interests: only the last selection persists.** Selecting both
  "Economics" and "Computer Science" at onboarding resulted in only "Economics" being
  written to `student_interests`. Already flagged; this artifact is independent
  confirmation from a second account/session, not a new occurrence.
- **F4 — `weekly_plan` does not regenerate after profile edits** (or at least did not
  during this session's ~90 minutes of edits). Possibly by design (fixed cadence, not
  event-triggered) — not confirmed either way. New observation, not previously flagged.
- **F5 — Onboarding is re-runnable on an already-onboarded account and does not upsert.**
  This account's `goals`/`education_records` carry 4-5 duplicate rows from repeated test
  runs today. Already flagged as an idempotency gap.
- **F6 — `ai_usage.estimated_cost` is never computed.** New observation (§12). Blocked the
  founder's stated $5/$10 cost-gate from being automatically enforceable. **Fixed**: PR #135
  (`lib/ai/pricing.ts` + wired into `logAIUsage()`), live-verified — the §8 addendum's
  advisor call landed with `estimated_cost = 0.0209`.

F1-F5 were documented, not fixed, per the standing "analysis and reporting only, no new
scope during recovery" instruction from ORYN-CEO this session. F6 was picked up as its own
bounded package afterward and is now fixed; the §8 time-budget gap was closed the same way,
as a bounded addendum to this same artifact rather than a new one.

## Environment note (not a product finding)

Partway through this session, the Browser-pane tooling's viewport metrics collapsed to
`0×0` across every tab (confirmed via `window.innerWidth`/`innerHeight`, reproduced on a
freshly-opened tab too, so not tab-specific) — screenshots rendered blank and
layout-dependent text extraction returned near-empty strings, though `document.body
.innerHTML` still held real content throughout, and DOM mutation / React fiber inspection
kept working. Most likely resource contention from the very heavy concurrent load on this
machine during this session (6+ parallel Claude sessions, several `next dev` servers, a
fresh `npm install`, live SQL queries, git operations). Worked around by driving the
remaining interactions through direct DOM/React-fiber manipulation
(`element[__reactProps$...].onChange(...)`) instead of pixel-coordinate clicks, and by
verifying every claimed action against the database directly rather than trusting the
rendered page. The Settings page (`weekly_time_budget`) specifically could not be reached
before time ran out on this pass — see §8.

## How this profile was assembled (for anyone re-running or extending this artifact)

All on account `oryn.qa.b@example.com`, `oryn-qa-scratch`, in order:
1. Full 5-step onboarding, fresh `origin/main`: country/school/curriculum/graduation-year,
   interests (Economics + Computer Science attempted, only Economics persisted — F3),
   target geography USA, CV import skipped.
2. Saved MIT to target universities (`exploring`).
3. Saved "Yale Young Global Scholars" to opportunities.
4. Added one activity ("Economics Club President"), one award ("Regional Economics Case
   Competition — 1st Place"), one research experience ("Youth Unemployment and Educational
   Attainment in OECD Countries").
5. Sent two real advisor messages (§5).

The weekly plan in §4 was generated by the platform automatically right after step 1,
*before* steps 2-5 — it is correctly stale relative to the final profile state described in
§1-§2, and that staleness is itself part of what this artifact demonstrates (F4).
