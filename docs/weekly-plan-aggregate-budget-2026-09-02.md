# The weekly_plan aggregate budget gap — 2026-09-02

CEO's framing, from oryn-d0's own measurement (`docs/ai-cost-at-scale-2026-09-02.md`):
`job-budget.ts`'s `JobBudgetFeature` type doesn't cover `weekly_plan` — Job D, the one job
we're not arming, and the only one whose cost scales linearly with student count, has no
ceiling of its own. Today that's academic (8 students, ~$0.94/month); at 1,000 it's
~$125.7/month with nothing to stop it. Assignment: establish whether the exclusion is
deliberate or a gap, and if it's a gap, propose a ceiling — without arming anything, and
without treating a per-run cap as a free win given the fairness problem a partial run creates.

## 1. Why `weekly_plan` isn't in `JobBudgetFeature` — read before assumed

`lib/ai/limits/job-budget.ts`'s own header states its scope precisely: it exists for
**`opportunity_extraction` and `requirement_extraction` specifically because those two call
`selectModelForUser(null)`** — there is no student to attribute the spend to, so
`lib/ai/limits/budget.ts`'s per-student mechanism structurally cannot see that spend at all.
`job-budget.ts` is what closes *that* hole, and only that hole.

`weekly_plan` doesn't have that hole. Confirmed two ways, not assumed from the file
excluding it:

- **Code**: `generateWeeklyPlan` (`lib/ai/weekly-plan.ts:375`) resolves
  `selectModelForUser(userId)` via `withUsageLogging` — a real, threaded student id, never
  `null`.
- **Live data**: `ai_usage` for `feature='weekly_plan'` (excluding the `test-model` fixture
  rows) — **0 rows with `user_id IS NULL`, all 115 attributed.**

**The exclusion is deliberate, not an oversight.** `job-budget.ts` was built to cover
exactly the case `weekly_plan` doesn't have. Extending its `JobBudgetFeature` union to
include `weekly_plan` "for completeness" would be adding a feature to a file whose entire
premise is "no per-student mechanism sees this" — which is false for `weekly_plan`.

## 2. But that's the narrower question. The one CEO actually asked is real.

Deliberately-correct-as-scoped is not the same claim as fully-protected. Checked the
broader question directly rather than stopping at "the file's own reasoning holds":

- **`budget.ts`'s per-student mechanism is real, but it is per-student and soft.** Its own
  header: *"never a hard wall... exactly one enforcement mechanism — degrading to a cheaper
  model."* `MONTHLY_BUDGET_CEILING_USD` ($1.00) is explicitly *"a monitoring/alerting
  number... never a second code-enforced gate."* So even the protection that does exist for
  `weekly_plan` never stops a call — it only makes an individual over-target student's own
  calls cheaper. Nothing in this file is scoped above the individual student.
- **The job orchestrator has no safety valve of its own.**
  `lib/plan/generate-for-active-students.ts`'s `generateWeeklyPlansForActiveStudents` reads
  every `onboarding_completed = true` profile and loops, unconditionally, calling
  `generateForStudent` for each — no total-spend check, no max-calls-per-run, no early exit.
  One student's failure doesn't abort the rest (correctly, matching every other Phase 30
  job's convention) — but nothing aborts the rest for *cost* either.

**So: no file anywhere in the codebase looks at aggregate `weekly_plan` spend across
students.** `job-budget.ts` was never meant to (different hole). `budget.ts` was deliberately
built not to (founder's own per-student, soft-only choice). The orchestrator was never asked
to. Three components, each individually correct for what it was built to do, and the space
between them is exactly where CEO's concern lives. **This is a real gap** — not in
`job-budget.ts`, in the system.

One existing, incidental mitigation worth naming precisely so the numbers aren't overstated:
oryn-d0's own table already shows that a student who is *already* over their own $0.50
target from interactive use gets Job D's call at the degraded (Haiku) rate automatically,
for free, via the existing per-student mechanism — their worst-case-to-degraded-case range
at 1,000 students is $125.7/mo down to as low as ~$42/mo depending how many students are
already near target when the job runs. **That's a real, existing effect, not a proposed
fix** — it's incidental to Job D having an aggregate ceiling of its own, and it provides no
guarantee: a cohort of fresh, light-usage students (exactly the healthy case) gets zero
benefit from it and sits at the full linear number.

## 3. Why a per-run cap (job-budget.ts's own shape) is the wrong instrument here

CEO already named the failure mode; confirming why it's disqualifying rather than just a
caveat. `job-budget.ts`'s STOP-don't-degrade policy is justified, in its own words, because
its two current features have no one harmed by a pause — *"a candidate URL just waits for
the next scheduled run instead of being processed tonight."* Importing that same policy for
`weekly_plan` doesn't import that justification with it:

- **The harm is felt by a specific person, not a queue.** A candidate opportunity URL
  doesn't know it's waiting. A student who doesn't get a weekly plan this week does — the
  exact "a real, felt harm" language `budget.ts`'s own header uses to justify *never* hard-
  stopping student-facing spend, for the identical reason, applied to a different code path
  that happens to share this feature's name.
- **It's not evenly distributed — it's a function of iteration order.**
  `generateWeeklyPlansForActiveStudents` processes `profiles` in whatever order the query
  returns (implicitly, insertion order — no `.order()` clause). A cap that stops a run
  partway means the students inserted first *always* get a plan and the ones inserted last
  *always* don't, every week, until headcount stops growing — a standing unfairness baked
  into signup order, not a random or self-correcting one.
- **A monthly (not per-run) version of the same cap is worse, not better.** Scoping the cap
  to the calendar month, matching `job-budget.ts`'s existing shape, means the *first* run
  that crosses it blocks *every remaining run that month* — most students getting no
  proactive plan for weeks, not just the tail of one run.

None of this means Job D can never have a ceiling. It means the ceiling can't be
job-budget.ts's own STOP semantics transplanted unchanged — that shape was correct for a
queue and isn't for a roster of students.

## 4. Proposed direction: extend the *degrade*, not the *stop*

The mechanism `weekly_plan` already has — per-student degrade-to-Haiku, never a block — is
the one this codebase and the founder have already accepted for exactly this feature's harm
profile. The natural fix is the same mechanism at the aggregate level, not a different one:

**Once this month's total `weekly_plan` spend (all students, summed — the query
`job-budget.ts` already knows how to run, scoped to one feature instead of one user) crosses
a threshold, every `weekly_plan` call for the rest of the month uses the degraded model,
regardless of that individual student's own status — the same `DEGRADE_MODEL` `budget.ts`
already defines, not a second one.**

This avoids the fairness problem in §3 entirely: **every student still gets a plan.** Nobody
is skipped by processing order. The blast radius of crossing the threshold is "plans get
cheaper," not "plans stop existing for whoever's turn it was."

**Where the number should come from, not what it should be** — the actual figure is a
founder tier/budget decision, same posture `budget.ts`'s own header takes ("a product
decision for the founder to make explicitly"), so this proposes the mechanism and the
inputs, not a number to adopt unreviewed:

- oryn-d0's own measured, real per-call cost: $0.029/call (Sonnet), ~$0.0097/call (Haiku,
  ÷3). At today's 8 onboarded students, a full month of weekly cadence is 8 × 4.33 × $0.029
  ≈ **$1.00/month** all-Sonnet — comfortably low, which is exactly why this is "academic
  today" the way CEO framed it.
- The threshold that matters is the one that starts biting *before* the linear-scaling
  number gets uncomfortable, not after — pegged to headcount the founder actually expects
  soon, not today's 8. A threshold expressed as a formula (e.g., *N × $0.15/student/month*,
  covering weekly_plan alone with headroom over the measured $0.117/student/month rate)
  scales with the founder's own growth assumption instead of needing a manual bump every
  time headcount moves, the same reasoning `job-budget.ts`'s own estimates give for staying
  configurable via env var rather than hardcoded.
- Surfaced to the admin panel alongside the existing spend cards (`lib/admin/queries.ts`),
  not silently — matching `budget.ts`'s own CEILING philosophy: the founder should see this
  number approaching before it bites, not discover it after.

**Not proposing exact code for this file yet** — the threshold-setting and the
alert-vs-degrade balance are the founder decision CEO's own framing reserves; this section
proposes the shape (aggregate-scoped, degrade-not-stop, configurable, surfaced) for review,
not a merge-ready diff, matching how §5's own precedent (`job-budget.ts`'s estimates) was
adopted only after being written down and reviewed first.

## 5. What this doesn't change

No code changes in this pass. `job-budget.ts` is correct as scoped and untouched.
`budget.ts` is correct as scoped and untouched. Job D stays unarmed — this doesn't relitigate
[[project_oryn_job_scheduling_decision]]'s own recommendation, it answers a question that
sits underneath it regardless of when Job D is armed. Same gate as that package: staged
analysis and a proposed direction, not an implementation.

## Summary

- `job-budget.ts` correctly excludes `weekly_plan` — it exists for `selectModelForUser(null)`
  features specifically, and `weekly_plan` always has real per-student attribution (confirmed
  in code and in live `ai_usage`, 0 null-user rows). Not an oversight.
- The broader gap CEO named is real: nothing anywhere — not `job-budget.ts`, not `budget.ts`,
  not the job orchestrator — looks at aggregate `weekly_plan` spend across students. Three
  individually-correct components, with the aggregate case falling in the space between them.
- A per-run or per-month hard stop (job-budget.ts's own shape) is the wrong instrument: the
  harm lands on specific students, unevenly, by signup-order accident — confirmed by reading
  `generateWeeklyPlansForActiveStudents`'s own unordered loop, not assumed.
- Proposed direction: an aggregate version of the degrade-not-stop mechanism this feature
  already has at the per-student level — same `DEGRADE_MODEL`, summed across students instead
  of scoped to one, so a threshold crossing makes plans cheaper for everyone rather than
  missing for whoever's last in line. The actual threshold is a founder decision; this names
  the inputs and the mechanism, not a number to adopt unreviewed.
