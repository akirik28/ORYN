# Phase 64/65 audit: weekly time budget and busy mode

CEO-assigned, 2026-09-02. Question: do the two spec-named capacity controls (Phase 64's
weekly time budget, Phase 65's exam-week busy mode) actually change anything, or are the
columns decorative? Four sub-questions, answered in order, live data first.

## Live data (oryn-qa-scratch, read-only)

8 onboarded students. `weekly_time_budget`: 6 of 8 set (`5_10h` ×4, `10h_plus` ×2), 2 null
(never touched Settings' capacity form — an optional field, not evidence of a bug).
`busy_mode`: **0 of 8 have ever set it to true.** `busy_mode_until`: null for all 8.

## 1. Can a student actually set these?

**Yes, both.** `features/settings/capacity-form.tsx` (`CapacityForm`, rendered from
`features/settings/settings-view.tsx`'s "study capacity" section) is a real, complete
control: a time-budget `Select` with the exact four spec buckets (`under_2h`/`2_5h`/
`5_10h`/`10h_plus`), a busy-mode checkbox that reveals a date picker for `busy_mode_until`
when checked, both wired to `updateTimeBudget`/`updateBusyMode`
(`app/(app)/settings/actions.ts`) — both actions check their own `error`, both buttons
disable correctly until the value actually differs from what's saved. Not decorative. The
6-of-8 live time-budget adoption is itself evidence the control works; busy mode's 0-of-8
is explained by §3/§4 below, not by a missing or broken control.

## 2. Does the weekly plan honour the time budget?

**Yes — confirmed against real historical output, not just the prompt text.**
`lib/ai/advisor-prompt.ts`'s system prompt contains an explicit instruction ("Consider the
student's stated weekly time budget. Do not recommend 10 hours of new commitments to a
student who has 2 hours free"), and `lib/ai/student-context.ts`'s `formatContextForPrompt`
renders the actual value into every prompt that uses this context
(`lib/ai/weekly-plan.ts`, `lib/ai/advisor-chat.ts`, and others — `buildStudentAdvisorContext`
is the one place this is assembled, so a fix there reaches every consumer, which is why §4's
fix lives there).

That the instruction exists doesn't prove it's obeyed, so this was checked against real
`weekly_actions` rows, not assumed:

| Student | Budget | Plan week | Actions kept | Total minutes | Within budget band? |
|---|---|---|---|---|---|
| Ada Sarp KIRIK | 10h_plus (600+) | 08-24 | 3 | 65 | yes (under) |
| Ada Sarp KIRIK | 10h_plus (600+) | 08-31 | 3 | 270 | yes (under) |
| Daniel Okafor | 5_10h (300–600) | 08-17 | 2 | 420 | **yes, inside the band** |
| Daniel Okafor | 5_10h (300–600) | 08-24 | 2 | 330 | **yes, inside the band** |
| Elif Demir | 10h_plus (600+) | 08-17 | 3 | 600 | at the boundary |
| oryn.qa.b | 5_10h (300–600) | 08-17 | 3 | 390 | **yes, inside the band** |

Zero violations across 6 real plans. The three `5_10h` plans landing inside that specific
300–600-minute band — not scattered above or below it — is meaningfully stronger evidence
of active compliance than "the model happened to be conservative": an unconstrained
generation has no reason to cluster inside one specific stated bucket.

**Named gap in the evidence, not filled in by assumption**: no live student has ever set
`under_2h` or `2_5h` — the sharpest case the spec's own example describes ("do not
recommend 15 hours... to a student with 3 free hours") has never actually been exercised
in production. The mechanism is real and reaches every relevant prompt, but this specific
low-budget scenario is unverified, not confirmed-working.

**Also unbuilt, worth naming**: there is no deterministic guardrail behind this — no code
sums `estimatedMinutes` across a generated plan's actions and rejects/retries a generation
that exceeds the stated budget. The only enforcement is the prompt instruction. Given the
live evidence above, that's working today; it is not structurally guaranteed the way
Phase 6.1's "hybrid architecture" principle (deterministic layer under AI judgment)
suggests it ideally would be.

## 3. Does the weekly plan honour busy mode?

**Wired end-to-end; never once exercised in production.** All 8 live profiles have
`busy_mode: false`. `formatContextForPrompt` does carry a real, explicit instruction when
`busyMode` is true (`"Currently in a busy period (e.g. exams)... — reduce recommendations"`),
reaching the same prompts as §2. But because no student has ever generated a plan while
`busy_mode` was true, there is no historical data to check the way §2's table checks time
budget — only that the plumbing exists, not that a real generation has ever visibly reduced
its output because of it. Distinguishing "wired" from "verified working" per CEO's own
standard: this one is wired, not yet verified, and verifying it live would mean either
waiting for a real student to use it or spending a real Anthropic call to force the case —
not done here without that being asked for separately.

## 4. Does `busy_mode_until` expire?

**No — confirmed, not suspected.** Grepped every job under `lib/jobs/`/`app/api/jobs/` and
found nothing referencing `busy_mode` or `busy_mode_until`; `student-context.ts` read the
two columns as plain stored values with no comparison against today's date anywhere. The
only way `busy_mode` ever becomes `false` again is the student manually unchecking it in
Settings. A student who marks exam week in November and forgets to revisit Settings stays
in reduced-recommendation mode indefinitely, and the prompt would keep citing an
increasingly stale "until [date]" — CEO's exact named scenario, confirmed true.

**Fixed** (`lib/ai/student-context.ts`, `buildStudentAdvisorContext`): `busyMode` in the
returned context is now computed at read time — `true` only if the stored flag is set AND
(`busy_mode_until` is null, meaning no end date was given, OR that date hasn't passed yet)
— rather than trusting the raw column. Same "don't trust a persisted flag past its date"
discipline already established elsewhere in this codebase
(`lib/deadlines/lifecycle.ts`'s `isDatedDeadlineUpcoming`). Fixed in the one shared
context-building function, so every consumer (weekly plan, advisor chat, research
generator) inherits the fix at once, and no scheduled job or migration was needed —
`busy_mode_until` was already a plain `date` column, comparable to today as a string the
same way `universities/[id]/page.tsx` already compares deadline dates. Settings itself
still shows the raw stored value unchanged, since it's the student's own toggle to notice
and clear; only what the AI prompt is told changes.

## Summary

| Question | Answer |
|---|---|
| Can a student set weekly time budget? | Yes — real, working control |
| Can a student set busy mode? | Yes — real, working control |
| Does the plan honour time budget? | Yes — confirmed against real historical plans |
| Does the plan honour busy mode? | Wired, never yet exercised live |
| Does busy_mode_until expire? | No — confirmed, and fixed this pass |
